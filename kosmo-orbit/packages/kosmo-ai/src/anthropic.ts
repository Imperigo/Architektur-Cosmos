/**
 * Anthropic-Provider — Kosmo über die Messages-API (Claude), SSE-Streaming.
 * Plain fetch wie beim Ollama-Provider: kein SDK, voller Abbruch über Signal.
 * Läuft direkt im Browser (anthropic-dangerous-direct-browser-access); der
 * Schlüssel bleibt in localStorage auf dem Gerät des Architekten.
 */
import type { ChatProvider, ChatRequest, StreamEvent, ChatMessage, StreamTimeoutConfig } from './provider';
import { verknuepfeToolIds, verbindeMitRetry, liesMitIdleTimeout, STANDARD_IDLE_TIMEOUT_MS } from './provider';
import { bildBudget } from './bild-budget';

export interface AnthropicConfig extends StreamTimeoutConfig {
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
  /**
   * v0.8.1 KI2 (Kandidat 8, `docs/V081-SPEZ.md` §3): Extended Thinking —
   * OPTIONAL. Gesetzt, sendet der Request `thinking: {type:'enabled',
   * budget_tokens: N}` (Anthropic-API-Vertrag). Ungesetzt bleibt der Request
   * byte-identisch zu vorher (Neutralität) — kein bestehender Aufrufer ändert
   * Verhalten, bis er das Feld explizit setzt.
   */
  thinkingBudgetTokens?: number;
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
    const verbindung = await verbindeMitRetry(
      (signal) =>
        fetch(
        `${(this.cfg.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '')}/v1/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...anthropicAuthHeader(this.cfg),
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          signal,
          body: JSON.stringify({
            model: this.cfg.model,
            max_tokens: this.cfg.maxTokens ?? 4096,
            stream: true,
            // v0.8.1 KI2 (Kandidat 8, `docs/V081-SPEZ.md` §3): Extended Thinking
            // — nur gesendet, wenn `thinkingBudgetTokens` konfiguriert ist.
            // Ohne Konfiguration bleibt der Request byte-identisch zu vorher
            // (Neutralität, s. `test/anthropic-thinking.test.ts`).
            ...(this.cfg.thinkingBudgetTokens !== undefined
              ? { thinking: { type: 'enabled', budget_tokens: this.cfg.thinkingBudgetTokens } }
              : {}),
            // v0.8.1 KI2 (Kandidat 8, `docs/V081-SPEZ.md` §3): Prompt-Caching
            // — `cache_control: {type:'ephemeral'}` auf dem letzten (hier
            // einzigen) System-Textblock UND auf dem letzten Tool-Eintrag.
            // Render-Reihenfolge der API ist tools → system → messages; ein
            // Breakpoint auf dem letzten System-Block cacht Tools+System
            // zusammen (`shared/prompt-caching.md`). System muss dafür als
            // Block-Array statt als reiner String gehen — harmlos, wenn der
            // Prefix unter dem Modell-Minimum bleibt (dann greift die Cache
            // schlicht nicht, kein Fehler, s. `usage.cache_creation_input_tokens`).
            ...(system
              ? { system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] }
              : {}),
            messages,
            ...(req.tools && req.tools.length > 0
              ? {
                  tools: req.tools.map((t, i, arr) => ({
                    name: t.name,
                    description: t.description,
                    input_schema: t.parameters,
                    ...(i === arr.length - 1 ? { cache_control: { type: 'ephemeral' } } : {}),
                  })),
                }
              : {}),
          }),
        },
      ),
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
        error: `Kosmo erreicht Anthropic nicht: ${verbindung.nachricht}`,
      };
      return;
    }
    const response = verbindung.response;
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
          error: `Kosmo bekommt seit ${sekunden}s keine Antwort mehr von Anthropic — Verbindung abgebrochen.`,
        };
        return;
      }
      if (gelesen.art === 'fehler') {
        yield {
          type: 'done',
          stopReason: 'error',
          error: `Verbindung zu Anthropic mitten im Stream abgebrochen: ${gelesen.nachricht}`,
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
          // `thinking_delta`/`signature_delta` (Extended-Thinking-Blöcke, nur
          // wenn `thinkingBudgetTokens` gesetzt ist) landen bewusst in KEINEM
          // Zweig: `StreamEvent` (`provider.ts`) kennt nur `text`/`tool_call`/
          // `done` — ein neuer Event-Typ wäre eine Vertragsänderung, die hier
          // nicht sanktioniert ist (Owner-Auftrag beschränkt sich auf den
          // `thinking`-Request-Parameter). Thinking-Text als `text`-Delta
          // auszugeben wäre falsch (Kosmo-Antworttext und Denkprozess sind
          // verschiedene Dinge) — also wird still verworfen, bis ein
          // eigener Vertrag dafür entschieden ist. `content_block_start` mit
          // `content_block.type === 'thinking'` braucht keinen eigenen Zweig:
          // `offenerCall` bleibt unberührt (nur für `tool_use` gesetzt), und
          // der zugehörige `content_block_stop` ruft `schliesseCall()` auf,
          // das ohne offenen Tool-Call sicher `null` liefert (keine Seiteneffekte).
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
