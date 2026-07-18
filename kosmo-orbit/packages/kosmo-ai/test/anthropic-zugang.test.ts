import { afterEach, describe, expect, it } from 'vitest';
import { pruefeAnthropicZugang } from '../src/anthropic';

/**
 * v0.8.4 PA5 (E10 §3.2, `docs/V084-SPEZ.md`, C-5 «Key-Validierungs-Ping») —
 * `pruefeAnthropicZugang` macht den kleinsten echten Anthropic-Call
 * (Haiku, `max_tokens: 1`) und liefert eines von vier ehrlichen
 * Fehlerbildern statt eines generischen «hat nicht geklappt». Rein mit
 * gestubbtem `fetch` (Muster `test/stream-robustheit.test.ts`) — kein
 * echtes Netz, kein echter Schlüssel nötig.
 */
describe('pruefeAnthropicZugang', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('ok: eine 200-Antwort gilt als bestätigter Zugang', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ id: 'msg_test' }), { status: 200 })) as unknown as typeof fetch;
    const ergebnis = await pruefeAnthropicZugang({ apiKey: 'sk-ant-test' });
    expect(ergebnis).toEqual({ ok: true });
  });

  it('fehler:netz — fetch wirft (kein Netz/DNS) → art netz, kein Absturz', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const ergebnis = await pruefeAnthropicZugang({ apiKey: 'sk-ant-test' });
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) {
      expect(ergebnis.fehler).toBe('netz');
      expect(ergebnis.detail.length).toBeGreaterThan(0);
    }
  });

  it('fehler:schluessel — 401 (ungültiger/widerrufener Schlüssel)', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'invalid x-api-key' } }), { status: 401 })) as unknown as typeof fetch;
    const ergebnis = await pruefeAnthropicZugang({ apiKey: 'sk-ant-falsch' });
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) {
      expect(ergebnis.fehler).toBe('schluessel');
      expect(ergebnis.detail).toContain('invalid x-api-key');
    }
  });

  it('fehler:schluessel — 403 zählt ebenfalls als Schlüssel-Problem', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'permission denied' } }), { status: 403 })) as unknown as typeof fetch;
    const ergebnis = await pruefeAnthropicZugang({ apiKey: 'sk-ant-test' });
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) expect(ergebnis.fehler).toBe('schluessel');
  });

  it('fehler:quota — 429 Rate-Limit/Kontingent', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'rate limit exceeded' } }), { status: 429 })) as unknown as typeof fetch;
    const ergebnis = await pruefeAnthropicZugang({ apiKey: 'sk-ant-test' });
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) {
      expect(ergebnis.fehler).toBe('quota');
      expect(ergebnis.detail).toContain('rate limit');
    }
  });

  it('fehler:quota — 400 mit «credit balance» im Text (Anthropic meldet leeres Guthaben teils so)', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ error: { message: 'Your credit balance is too low to access the Claude API.' } }),
        { status: 400 },
      )) as unknown as typeof fetch;
    const ergebnis = await pruefeAnthropicZugang({ apiKey: 'sk-ant-test' });
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) expect(ergebnis.fehler).toBe('quota');
  });

  it('fehler:unbekannt — ein 400 ohne Kontingent-Hinweis fällt ehrlich in die Rest-Schublade', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'model not found' } }), { status: 400 })) as unknown as typeof fetch;
    const ergebnis = await pruefeAnthropicZugang({ apiKey: 'sk-ant-test' });
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) {
      expect(ergebnis.fehler).toBe('unbekannt');
      expect(ergebnis.detail).toContain('model not found');
    }
  });

  it('oauthToken hat Vorrang vor apiKey — geht als Bearer statt x-api-key raus', async () => {
    let gesehenerHeader: Record<string, string> | undefined;
    globalThis.fetch = (async (_url: unknown, init?: { headers?: Record<string, string> }) => {
      gesehenerHeader = init?.headers;
      return new Response(JSON.stringify({ id: 'msg_test' }), { status: 200 });
    }) as unknown as typeof fetch;
    await pruefeAnthropicZugang({ apiKey: 'sk-ant-key', oauthToken: 'sk-ant-oat-abo' });
    expect(gesehenerHeader?.Authorization).toBe('Bearer sk-ant-oat-abo');
    expect(gesehenerHeader?.['x-api-key']).toBeUndefined();
  });

  it('minimaler Call: kleinstes Modell, max_tokens 1', async () => {
    let gesehenerBody: string | undefined;
    globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
      gesehenerBody = init?.body;
      return new Response(JSON.stringify({ id: 'msg_test' }), { status: 200 });
    }) as unknown as typeof fetch;
    await pruefeAnthropicZugang({ apiKey: 'sk-ant-test' });
    const body = JSON.parse(gesehenerBody ?? '{}');
    expect(body.max_tokens).toBe(1);
    expect(typeof body.model).toBe('string');
    expect(body.model.length).toBeGreaterThan(0);
    expect(body.stream).toBeUndefined();
  });
});
