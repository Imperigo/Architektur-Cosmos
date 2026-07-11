/**
 * Anthropic-Provider — Kosmo über die Messages-API (Claude), SSE-Streaming.
 * Plain fetch wie beim Ollama-Provider: kein SDK, voller Abbruch über Signal.
 * Läuft direkt im Browser (anthropic-dangerous-direct-browser-access); der
 * Schlüssel bleibt in localStorage auf dem Gerät des Architekten.
 */
import type { ChatProvider, ChatRequest, StreamEvent, ChatMessage } from './provider';
import { verknuepfeToolIds } from './provider';
import { bildBudget } from './bild-budget';

export interface AnthropicConfig {
  /** Klassischer Weg: eingetippter API-Schlüssel → `x-api-key`. */
  apiKey?: string;
  /**
   * Cloud-Login mit Abo («Mit Claude anmelden», Desktop-OAuth): kurzlebiges
   * Access-Token aus der lokalen Anthropic-Anmeldung → `Authorization: Bearer`
   * + `anthropic-beta: oauth-2025-04-20`. Ist `oauthToken` gesetzt, hat er
   * Vorrang vor `apiKey` — die API akzeptiert nicht beide Header gleichzeitig.
   */
  oauthToken?: string;
  model: string;
  /** Überschreibbar für Tests oder ein eigenes Gateway. */
  baseUrl?: string;
  maxTokens?: number;
}

/**
 * Auth-Header für die Anthropic-Messages-API — rein und testbar.
 * `oauthToken` (Claude-Abo per Browser-Login) hat Vorrang: dann Bearer +
 * das Beta-Merkmal, ohne `x-api-key`. Sonst der klassische `x-api-key`.
 */
export function anthropicAuthHeader(cfg: Pick<AnthropicConfig, 'apiKey' | 'oauthToken'>): Record<string, string> {
  if (cfg.oauthToken) {
    return {
      Authorization: `Bearer ${cfg.oauthToken}`,
      'anthropic-beta': 'oauth-2025-04-20',
    };
  }
  return { 'x-api-key': cfg.apiKey ?? '' };
}

type InhaltsBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

/** Verlauf → Messages-API: system separat, tool-Nachrichten als tool_result-User-Blöcke. */
export function zuAnthropicNachrichten(messages: ChatMessage[]): {
  system: string | undefined;
  messages: { role: 'user' | 'assistant'; content: InhaltsBlock[] }[];
} {
  const ids = verknuepfeToolIds(messages);
  let system: string | undefined;
  const raus: { role: 'user' | 'assistant'; content: InhaltsBlock[] }[] = [];
  const anhaengen = (role: 'user' | 'assistant', block: InhaltsBlock) => {
    const letzte = raus[raus.length - 1];
    if (letzte && letzte.role === role) letzte.content.push(block);
    else raus.push({ role, content: [block] });
  };
  messages.forEach((m, i) => {
    if (m.role === 'system') {
      system = m.content;
      return;
    }
    if (m.role === 'user') {
      // v0.6.8: Bildblöcke VOR dem Textblock (Anthropic-Konvention/Beispiele —
      // das Modell liest ein Bild zuverlässiger, wenn die Beschreibung danach
      // kommt). Additiv: ohne `images` unverändert ein einzelner Textblock.
      for (const img of m.images ?? []) {
        anhaengen('user', {
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.dataBase64 },
        });
      }
      anhaengen('user', { type: 'text', text: m.content });
      return;
    }
    if (m.role === 'assistant') {
      if (m.content) anhaengen('assistant', { type: 'text', text: m.content });
      for (const c of m.toolCalls ?? []) {
        anhaengen('assistant', { type: 'tool_use', id: c.id, name: c.name, input: c.arguments ?? {} });
      }
      return;
    }
    // tool → tool_result im nächsten User-Zug
    const id = ids.get(i);
    if (id) anhaengen('user', { type: 'tool_result', tool_use_id: id, content: m.content });
  });
  return { system, messages: raus };
}

export class AnthropicProvider implements ChatProvider {
  readonly id = 'anthropic';
  constructor(private cfg: AnthropicConfig) {}

  async *chat(req: ChatRequest): AsyncIterable<StreamEvent> {
    // Vorabprüfung OHNE Netzcall (H-Härtung v0.7.1): ein zu grosses Bild
    // scheitert sonst erst nach dem Roundtrip mit derselben Botschaft —
    // ehrlicher, den Fehler schon hier zu melden.
    const budget = bildBudget(req.messages);
    if (!budget.ok) {
      yield { type: 'done', stopReason: 'error', error: budget.grund };
      return;
    }
    const { system, messages } = zuAnthropicNachrichten(req.messages);
    let response: Response;
    try {
      response = await fetch(
        `${(this.cfg.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '')}/v1/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...anthropicAuthHeader(this.cfg),
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          signal: req.signal ?? null,
          body: JSON.stringify({
            model: this.cfg.model,
            max_tokens: this.cfg.maxTokens ?? 4096,
            stream: true,
            ...(system ? { system } : {}),
            messages,
            ...(req.tools && req.tools.length > 0
              ? {
                  tools: req.tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    input_schema: t.parameters,
                  })),
                }
              : {}),
          }),
        },
      );
    } catch (err) {
      yield {
        type: 'done',
        stopReason: 'error',
        error: `Kosmo erreicht Anthropic nicht: ${err instanceof Error ? err.message : String(err)}`,
      };
      return;
    }
    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '');
      const hatBilder = req.messages.some((m) => (m.images?.length ?? 0) > 0);
      // Bildspezifischer Fehlerpfad: 413 (Payload zu gross) bei einem
      // Bild-Request ist praktisch immer die Bildgrösse; ein Anthropic-400
      // mit einer Grössen-Meldung im Body (`exceeds`/`maximum`/`too large`
      // zusammen mit `image`) ebenso — statt des generischen Statuscode-
      // Texts bekommt der Architekt hier die ehrliche, konkrete Ursache.
      const bildGrosseFehler =
        hatBilder &&
        (response.status === 413 ||
          (response.status === 400 && /image/i.test(detail) && /(exceeds|maximum|too large)/i.test(detail)));
      const hinweis = bildGrosseFehler
        ? 'Bild zu gross — Kosmo verkleinert Blicke automatisch; dieses Bild überschreitet trotzdem das Limit.'
        : response.status === 401
          ? 'API-Schlüssel prüfen (Einstellungen ⚙).'
          : response.status === 429
            ? 'Rate-Limit erreicht — kurz warten.'
            : detail.slice(0, 200);
      yield { type: 'done', stopReason: 'error', error: `Anthropic antwortet mit ${response.status}. ${hinweis}` };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sawToolCall = false;
    // Offener tool_use-Block: input kommt als JSON-Fragmente (input_json_delta)
    let offenerCall: { id: string; name: string; json: string } | null = null;

    const schliesseCall = (): StreamEvent | null => {
      if (!offenerCall) return null;
      let args: unknown = {};
      try {
        args = offenerCall.json ? JSON.parse(offenerCall.json) : {};
      } catch {
        args = offenerCall.json; // Reparatur übernimmt validateToolCall
      }
      const ev: StreamEvent = {
        type: 'tool_call',
        call: { id: offenerCall.id, name: offenerCall.name, arguments: args },
      };
      offenerCall = null;
      sawToolCall = true;
      return ev;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        let ev: {
          type?: string;
          content_block?: { type?: string; id?: string; name?: string };
          delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string };
          error?: { message?: string };
        };
        try {
          ev = JSON.parse(line.slice(5).trim());
        } catch {
          continue;
        }
        if (ev.type === 'content_block_start' && ev.content_block?.type === 'tool_use') {
          offenerCall = { id: ev.content_block.id ?? `call_${Date.now()}`, name: ev.content_block.name ?? '', json: '' };
        } else if (ev.type === 'content_block_delta') {
          if (ev.delta?.type === 'text_delta' && ev.delta.text) {
            yield { type: 'text', delta: ev.delta.text };
          } else if (ev.delta?.type === 'input_json_delta' && offenerCall) {
            offenerCall.json += ev.delta.partial_json ?? '';
          }
        } else if (ev.type === 'content_block_stop') {
          const call = schliesseCall();
          if (call) yield call;
        } else if (ev.type === 'error') {
          yield { type: 'done', stopReason: 'error', error: ev.error?.message ?? 'Anthropic-Streamfehler' };
          return;
        } else if (ev.type === 'message_stop') {
          yield { type: 'done', stopReason: sawToolCall ? 'tool_calls' : 'stop' };
          return;
        }
      }
    }
    const rest = schliesseCall();
    if (rest) yield rest;
    yield { type: 'done', stopReason: sawToolCall ? 'tool_calls' : 'stop' };
  }
}
