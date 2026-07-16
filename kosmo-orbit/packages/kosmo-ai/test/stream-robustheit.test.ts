import { afterEach, describe, expect, it } from 'vitest';
import { AnthropicProvider, OllamaProvider, OpenAiKompatibelProvider, type ChatMessage, type StreamEvent } from '../src';

/**
 * v0.8.1 KI3 («Stream-Robustheit», `docs/V081-SPEZ.md` §3 Kandidat 6) —
 * Fehlerpfade der Verbindungs-/Idle-Timeouts + des Verbindungs-Retries, rein
 * mit Fake-`fetch` (kein echtes Netz). Die drei Netz-Provider teilen sich die
 * Bausteine `verbindeMitRetry`/`liesMitIdleTimeout` (`src/provider.ts`) — die
 * Suite deckt Ollama gründlich ab (alle fünf Fehlerpfade) und prüft an
 * LM Studio/Anthropic stichprobenartig, dass dieselbe Mechanik dort genauso
 * greift (unterschiedliches Wire-Format, gleiche Robustheit).
 */

async function sammle(
  provider: { chat(req: { messages: ChatMessage[]; signal?: AbortSignal }): AsyncIterable<StreamEvent> },
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const ev of provider.chat({ messages, ...(signal ? { signal } : {}) })) events.push(ev);
  return events;
}

/** Fake-fetch, das den Verbindungsaufbau NIE beantwortet (simuliert einen
 * Server, der nicht mal die Header schickt) — respektiert aber `signal` GENAU
 * wie echtes `fetch`: bricht sofort ab, sobald das Signal feuert. */
function haengenderVerbindungsAufbau() {
  let versuche = 0;
  const fetchFn = (_url: unknown, init?: { signal?: AbortSignal }) => {
    versuche++;
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  };
  return { fetchFn, anzahlVersuche: () => versuche };
}

function ndjsonZeile(text: string, done = false): string {
  return JSON.stringify({ message: { content: text }, done });
}

/** Stream, der GENAU einen NDJSON-Chunk liefert und danach verstummt (weder
 * `close()` noch weiterer `enqueue()`) — simuliert ein lokales Modell, das
 * mitten in der Antwort aufhört zu antworten. */
function ndjsonHangtNachEinemChunk(erstesJson: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(erstesJson + '\n'));
    },
  });
  return new Response(stream, { status: 200 });
}

/** Stream, der einen Chunk liefert und den zweiten Read-Versuch mit einem
 * echten Fehler quittiert (Verbindungsabbruch MITTEN im Stream — kein
 * Timeout, kein Abbruch, ein simulierter Netzfehler). */
function ndjsonBrichtNachEinemChunkAb(erstesJson: string, fehlertext: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(erstesJson + '\n'));
      setTimeout(() => controller.error(new Error(fehlertext)), 10);
    },
  });
  return new Response(stream, { status: 200 });
}

function ndjsonResponse(zeilen: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const z of zeilen) controller.enqueue(encoder.encode(z + '\n'));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe('OllamaProvider — Stream-Robustheit (KI3)', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('Verbindungs-Timeout: EIN Retry, danach ehrliche Fehlermeldung mit beiden Versuchen', async () => {
    const { fetchFn, anzahlVersuche } = haengenderVerbindungsAufbau();
    globalThis.fetch = fetchFn as typeof fetch;
    const p = new OllamaProvider({ baseUrl: 'http://homestation:11434', model: 'llama3', verbindungsTimeoutMs: 20 });
    const start = Date.now();
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }]);
    const dauer = Date.now() - start;

    expect(anzahlVersuche()).toBe(2); // genau EIN Retry, kein Retry-Sturm
    const done = events[events.length - 1] as { type: string; stopReason: string; error?: string };
    expect(done.stopReason).toBe('error');
    expect(done.error).toContain('lokale Modell');
    expect(done.error).toContain('Zeitüberschreitung nach 20 ms');
    expect(done.error).toContain('beide Verbindungsversuche');
    // zwei Timeout-Fenster (20ms) + kurzer Backoff — deutlich unter einer Sekunde
    expect(dauer).toBeLessThan(1000);
  });

  it('Idle-Timeout mitten im Stream: bereits gelieferter Text bleibt erhalten + ehrlicher Fehler-Event, KEIN Retry', async () => {
    let versuche = 0;
    globalThis.fetch = (async () => {
      versuche++;
      return ndjsonHangtNachEinemChunk(ndjsonZeile('Hallo, ich denke nach…'));
    }) as unknown as typeof fetch;
    const p = new OllamaProvider({ baseUrl: 'http://homestation:11434', model: 'llama3', idleTimeoutMs: 20 });
    const events = await sammle(p, [{ role: 'user', content: 'Erzähl mir was' }]);

    expect(versuche).toBe(1); // Verbindungsaufbau war erfolgreich — kein Verbindungs-Retry mitten im Stream
    const texte = events.filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta);
    expect(texte).toEqual(['Hallo, ich denke nach…']); // bereits gestreamter Text bleibt erhalten
    const done = events[events.length - 1] as { type: string; stopReason: string; error?: string };
    expect(done.stopReason).toBe('error');
    expect(done.error).toContain('keine Antwort mehr');
    expect(done.error).toContain('llama3');
  });

  it('Retry-Erfolg: erster Verbindungsversuch scheitert (Netzfehler), zweiter liefert normal — Ergebnis ist die volle, unverdoppelte Antwort', async () => {
    let versuche = 0;
    globalThis.fetch = (async () => {
      versuche++;
      if (versuche === 1) throw new TypeError('fetch failed');
      return ndjsonResponse([ndjsonZeile('Sali zäme'), ndjsonZeile('', true)]);
    }) as unknown as typeof fetch;
    const p = new OllamaProvider({ baseUrl: 'http://homestation:11434', model: 'llama3' });
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }]);

    expect(versuche).toBe(2);
    const text = events.filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta).join('');
    expect(text).toBe('Sali zäme');
    expect(events[events.length - 1]).toEqual({ type: 'done', stopReason: 'stop' });
  });

  it('Retry-Verzicht mitten im Stream: Verbindungsabbruch NACH dem ersten Chunk führt zu genau einem Fehler-Event, kein zweiter Verbindungsversuch', async () => {
    let versuche = 0;
    globalThis.fetch = (async () => {
      versuche++;
      return ndjsonBrichtNachEinemChunkAb(ndjsonZeile('Angefangene Antwort'), 'ECONNRESET');
    }) as unknown as typeof fetch;
    const p = new OllamaProvider({ baseUrl: 'http://homestation:11434', model: 'llama3' });
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }]);

    expect(versuche).toBe(1); // NIE ein Retry mitten im Stream — halbe Antworten werden nicht doppelt geholt
    const texte = events.filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta);
    expect(texte).toEqual(['Angefangene Antwort']);
    const done = events[events.length - 1] as { type: string; stopReason: string; error?: string };
    expect(done.stopReason).toBe('error');
    expect(done.error).toContain('mitten im Stream');
    expect(done.error).toContain('ECONNRESET');
  });

  it('Abbruch über das Nutzer-Signal gewinnt sofort — VOR jedem Verbindungsversuch', async () => {
    const { fetchFn, anzahlVersuche } = haengenderVerbindungsAufbau();
    globalThis.fetch = fetchFn as typeof fetch;
    const ctl = new AbortController();
    ctl.abort();
    const p = new OllamaProvider({ baseUrl: 'http://homestation:11434', model: 'llama3', verbindungsTimeoutMs: 5000 });
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }], ctl.signal);

    expect(anzahlVersuche()).toBe(0); // gar kein fetch — das Signal war schon vorher tot
    expect(events).toEqual([{ type: 'done', stopReason: 'error', error: 'Abgebrochen.' }]);
  });

  it('Abbruch über das Nutzer-Signal gewinnt sofort — WÄHREND des Verbindungsaufbaus (nicht erst nach dem Timeout)', async () => {
    const { fetchFn, anzahlVersuche } = haengenderVerbindungsAufbau();
    globalThis.fetch = fetchFn as typeof fetch;
    const ctl = new AbortController();
    const p = new OllamaProvider({ baseUrl: 'http://homestation:11434', model: 'llama3', verbindungsTimeoutMs: 5000 });
    const start = Date.now();
    const lauf = sammle(p, [{ role: 'user', content: 'Hallo' }], ctl.signal);
    setTimeout(() => ctl.abort(), 15);
    const events = await lauf;
    const dauer = Date.now() - start;

    expect(anzahlVersuche()).toBe(1); // KEIN Retry nach einem Nutzer-Abbruch
    expect(events).toEqual([{ type: 'done', stopReason: 'error', error: 'Abgebrochen.' }]);
    expect(dauer).toBeLessThan(500); // weit unter dem 5s-Verbindungstimeout
  });

  it('Abbruch über das Nutzer-Signal gewinnt sofort — MITTEN im Stream (nicht erst nach dem Idle-Timeout)', async () => {
    globalThis.fetch = (async () => ndjsonHangtNachEinemChunk(ndjsonZeile('Erster Teil'))) as unknown as typeof fetch;
    const ctl = new AbortController();
    const p = new OllamaProvider({ baseUrl: 'http://homestation:11434', model: 'llama3', idleTimeoutMs: 5000 });
    const start = Date.now();
    const lauf = sammle(p, [{ role: 'user', content: 'Hallo' }], ctl.signal);
    setTimeout(() => ctl.abort(), 15);
    const events = await lauf;
    const dauer = Date.now() - start;

    const texte = events.filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta);
    expect(texte).toEqual(['Erster Teil']); // bereits gelieferter Text bleibt erhalten
    const done = events[events.length - 1] as { type: string; stopReason: string; error?: string };
    expect(done.stopReason).toBe('error');
    expect(done.error).toBe('Abgebrochen.');
    expect(dauer).toBeLessThan(500); // weit unter dem 5s-Idle-Timeout
  });
});

describe('OpenAiKompatibelProvider / LM Studio — dieselbe Stream-Robustheit', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function sseHangtNachEinemChunk(text: string): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`data: {"choices":[{"delta":{"content":"${text}"}}]}\n`));
      },
    });
    return new Response(stream, { status: 200 });
  }

  it('Idle-Timeout mitten im Stream: bereits gelieferter Text bleibt, ehrlicher Fehler nennt LM Studio', async () => {
    globalThis.fetch = (async () => sseHangtNachEinemChunk('Sali ')) as unknown as typeof fetch;
    const p = new OpenAiKompatibelProvider({ baseUrl: 'http://localhost:1234/v1', model: 'test', idleTimeoutMs: 20 });
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }]);
    const texte = events.filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta);
    expect(texte).toEqual(['Sali ']);
    const done = events[events.length - 1] as { stopReason: string; error?: string };
    expect(done.stopReason).toBe('error');
    expect(done.error).toContain('LM Studio');
    expect(done.error).toContain('keine Antwort mehr');
  });

  it('Retry-Erfolg beim zweiten Verbindungsversuch nach einem 503', async () => {
    let versuche = 0;
    globalThis.fetch = (async () => {
      versuche++;
      if (versuche === 1) return new Response('Service Unavailable', { status: 503 });
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Sali zäme"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });
      return new Response(stream, { status: 200 });
    }) as unknown as typeof fetch;
    const p = new OpenAiKompatibelProvider({ baseUrl: 'http://localhost:1234/v1', model: 'test' });
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }]);

    expect(versuche).toBe(2);
    const text = events.filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta).join('');
    expect(text).toBe('Sali zäme');
    expect(events[events.length - 1]).toEqual({ type: 'done', stopReason: 'stop' });
  });

  it('4xx (z.B. Modell nicht geladen) wird NICHT retried — sofort die bestehende Fehlermeldung', async () => {
    let versuche = 0;
    globalThis.fetch = (async () => {
      versuche++;
      return new Response('{"error":"model not found"}', { status: 404 });
    }) as unknown as typeof fetch;
    const p = new OpenAiKompatibelProvider({ baseUrl: 'http://localhost:1234/v1', model: 'unbekannt' });
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }]);

    expect(versuche).toBe(1); // 4xx ist kein Verbindungsproblem — ein Retry hilft nicht
    const done = events[events.length - 1] as { stopReason: string; error?: string };
    expect(done.stopReason).toBe('error');
    expect(done.error).toContain('404');
    expect(done.error).toContain('LM Studio antwortet mit');
  });
});

describe('AnthropicProvider — dieselbe Stream-Robustheit (Prompt-Caching-Body bleibt unangetastet)', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('Verbindungs-Timeout: EIN Retry, dann ehrliche Fehlermeldung mit beiden Versuchen', async () => {
    const { fetchFn, anzahlVersuche } = haengenderVerbindungsAufbau();
    globalThis.fetch = fetchFn as typeof fetch;
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5', verbindungsTimeoutMs: 20 });
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }]);

    expect(anzahlVersuche()).toBe(2);
    const done = events[events.length - 1] as { stopReason: string; error?: string };
    expect(done.stopReason).toBe('error');
    expect(done.error).toContain('Kosmo erreicht Anthropic nicht');
    expect(done.error).toContain('beide Verbindungsversuche');
  });

  it('Idle-Timeout mitten im Stream: bereits gestreamter Text bleibt, kein Retry', async () => {
    let versuche = 0;
    globalThis.fetch = (async () => {
      versuche++;
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Grüezi"}}\n',
            ),
          );
        },
      });
      return new Response(stream, { status: 200 });
    }) as unknown as typeof fetch;
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5', idleTimeoutMs: 20 });
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }]);

    expect(versuche).toBe(1);
    const texte = events.filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta);
    expect(texte).toEqual(['Grüezi']);
    const done = events[events.length - 1] as { stopReason: string; error?: string };
    expect(done.stopReason).toBe('error');
    expect(done.error).toContain('keine Antwort mehr');
  });

  it('sendet weiterhin den cache_control-Breakpoint (KI2 unangetastet) — auch mit Timeout-Optionen konfiguriert', async () => {
    let gesendeterBody: { system?: unknown[] } = {};
    globalThis.fetch = (async (_url: unknown, init?: { body?: unknown }) => {
      gesendeterBody = JSON.parse(String((init as { body?: string })?.body ?? '{}'));
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"message_stop"}\n'));
          controller.close();
        },
      });
      return new Response(stream, { status: 200 });
    }) as unknown as typeof fetch;
    const p = new AnthropicProvider({
      apiKey: 'sk-test',
      model: 'claude-sonnet-5',
      verbindungsTimeoutMs: 5000,
      idleTimeoutMs: 30000,
    });
    await sammle(p, [
      { role: 'system', content: 'Du bist Kosmo.' },
      { role: 'user', content: 'Hallo' },
    ]);
    expect(gesendeterBody.system).toEqual([
      { type: 'text', text: 'Du bist Kosmo.', cache_control: { type: 'ephemeral' } },
    ]);
  });
});
