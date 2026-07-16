/**
 * OpenAI-kompatibler Provider — für LM Studio auf der HomeStation
 * (http://localhost:1234/v1) und jedes andere Gateway mit demselben
 * /chat/completions-SSE-Format. Plain fetch, kein SDK.
 */
import type { ChatProvider, ChatRequest, StreamEvent, ChatMessage, StreamTimeoutConfig } from './provider';
import { verknuepfeToolIds, verbindeMitRetry, liesMitIdleTimeout, STANDARD_IDLE_TIMEOUT_MS } from './provider';

export interface OpenAiKompatibelConfig extends StreamTimeoutConfig {
  /** z.B. http://localhost:1234/v1 (LM Studio) */
  baseUrl: string;
  model: string;
  apiKey?: string;
  temperature?: number;
}

type OaInhaltsTeil =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type OaNachricht = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | OaInhaltsTeil[] | null;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

/**
 * v0.6.8: `content` einer user-Nachricht MIT Bildern → das OpenAI-übliche
 * Teile-Array (`image_url` je Bild als data:-URI, Text zuletzt); ohne Bilder
 * bleibt `content` unverändert ein reiner String — kein Vertragsbruch für
 * bestehende (bildlose) Aufrufe/Tests.
 */
export function zuOpenAiInhalt(content: string, images?: ChatMessage['images']): string | OaInhaltsTeil[] {
  if (!images || images.length === 0) return content;
  return [
    ...images.map((img): OaInhaltsTeil => ({
      type: 'image_url',
      image_url: { url: `data:${img.mediaType};base64,${img.dataBase64}` },
    })),
    { type: 'text', text: content },
  ];
}

/** Verlauf → chat/completions: Tool-Resultate brauchen tool_call_id. */
export function zuOpenAiNachrichten(messages: ChatMessage[]): OaNachricht[] {
  const ids = verknuepfeToolIds(messages);
  return messages.map((m, i) => {
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant' as const,
        content: m.content || null,
        tool_calls: m.toolCalls.map((c) => ({
          id: c.id,
          type: 'function' as const,
          function: {
            name: c.name,
            arguments: typeof c.arguments === 'string' ? c.arguments : JSON.stringify(c.arguments ?? {}),
          },
        })),
      };
    }
    if (m.role === 'tool') {
      const id = ids.get(i);
      return { role: 'tool' as const, content: m.content, ...(id ? { tool_call_id: id } : {}) };
    }
    if (m.role === 'user') {
      return { role: 'user' as const, content: zuOpenAiInhalt(m.content, m.images) };
    }
    return { role: m.role, content: m.content };
  });
}

export class OpenAiKompatibelProvider implements ChatProvider {
  readonly id = 'lmstudio';
  constructor(private cfg: OpenAiKompatibelConfig) {}

  async *chat(req: ChatRequest): AsyncIterable<StreamEvent> {
    const verbindung = await verbindeMitRetry(
      (signal) =>
        fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.cfg.apiKey ? { Authorization: `Bearer ${this.cfg.apiKey}` } : {}),
          },
          signal,
          body: JSON.stringify({
            model: this.cfg.model,
            stream: true,
            temperature: this.cfg.temperature ?? 0.2,
            messages: zuOpenAiNachrichten(req.messages),
            ...(req.tools && req.tools.length > 0
              ? {
                  tools: req.tools.map((t) => ({
                    type: 'function',
                    function: { name: t.name, description: t.description, parameters: t.parameters },
                  })),
                }
              : {}),
          }),
        }),
      {
        ...(req.signal ? { nutzerSignal: req.signal } : {}),
        ...(this.cfg.verbindungsTimeoutMs !== undefined ? { timeoutMs: this.cfg.verbindungsTimeoutMs } : {}),
      },
    );
    if (verbindung.art === 'abgebrochen') {
      yield { type: 'done', stopReason: 'error', error: 'Abgebrochen.' };
      return;
    }
    if (verbindung.art === 'fehler') {
      yield {
        type: 'done',
        stopReason: 'error',
        error: `Kosmo erreicht LM Studio nicht (${this.cfg.baseUrl}): ${verbindung.nachricht}`,
      };
      return;
    }
    const response = verbindung.response;
    if (!response.ok || !response.body) {
      yield {
        type: 'done',
        stopReason: 'error',
        error: `LM Studio antwortet mit ${response.status} — ist der Server gestartet und das Modell «${this.cfg.model}» geladen?`,
      };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sawToolCall = false;
    // Fragmente je tool_call-Index sammeln (arguments streamen als Teilstrings)
    const calls = new Map<number, { id: string; name: string; args: string }>();

    const abschliessen = function* (): Generator<StreamEvent> {
      for (const [, c] of [...calls.entries()].sort((a, b) => a[0] - b[0])) {
        let args: unknown = {};
        try {
          args = c.args ? JSON.parse(c.args) : {};
        } catch {
          args = c.args; // Reparatur übernimmt validateToolCall
        }
        sawToolCall = true;
        yield { type: 'tool_call', call: { id: c.id, name: c.name, arguments: args } };
      }
      calls.clear();
    };

    while (true) {
      const gelesen = await liesMitIdleTimeout(reader, {
        ...(req.signal ? { nutzerSignal: req.signal } : {}),
        ...(this.cfg.idleTimeoutMs !== undefined ? { idleTimeoutMs: this.cfg.idleTimeoutMs } : {}),
      });
      if (gelesen.art === 'ende') break;
      if (gelesen.art === 'abgebrochen') {
        yield { type: 'done', stopReason: 'error', error: 'Abgebrochen.' };
        return;
      }
      if (gelesen.art === 'idle-timeout') {
        const sekunden = Math.round((this.cfg.idleTimeoutMs ?? STANDARD_IDLE_TIMEOUT_MS) / 1000);
        yield {
          type: 'done',
          stopReason: 'error',
          error: `Kosmo bekommt seit ${sekunden}s keine Antwort mehr von LM Studio (${this.cfg.baseUrl}) — Verbindung abgebrochen.`,
        };
        return;
      }
      if (gelesen.art === 'fehler') {
        yield {
          type: 'done',
          stopReason: 'error',
          error: `Verbindung zu LM Studio (${this.cfg.baseUrl}) mitten im Stream abgebrochen: ${gelesen.nachricht}`,
        };
        return;
      }
      const value = gelesen.value;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const daten = line.slice(5).trim();
        if (daten === '[DONE]') {
          yield* abschliessen();
          yield { type: 'done', stopReason: sawToolCall ? 'tool_calls' : 'stop' };
          return;
        }
        let chunk: {
          choices?: {
            delta?: {
              content?: string | null;
              tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[];
            };
            finish_reason?: string | null;
          }[];
        };
        try {
          chunk = JSON.parse(daten);
        } catch {
          continue;
        }
        const wahl = chunk.choices?.[0];
        if (!wahl) continue;
        if (wahl.delta?.content) yield { type: 'text', delta: wahl.delta.content };
        for (const tc of wahl.delta?.tool_calls ?? []) {
          const idx = tc.index ?? 0;
          const bisher = calls.get(idx) ?? { id: tc.id ?? `call_${Date.now()}_${idx}`, name: '', args: '' };
          if (tc.id) bisher.id = tc.id;
          if (tc.function?.name) bisher.name = tc.function.name;
          if (tc.function?.arguments) bisher.args += tc.function.arguments;
          calls.set(idx, bisher);
        }
        if (wahl.finish_reason) yield* abschliessen();
      }
    }
    yield* abschliessen();
    yield { type: 'done', stopReason: sawToolCall ? 'tool_calls' : 'stop' };
  }
}
