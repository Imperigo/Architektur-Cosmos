import { describe, expect, it } from 'vitest';
import { AnthropicProvider } from '../src/anthropic';

/**
 * v0.8.1 KI2 (§3 Kandidat 8, `docs/V081-SPEZ.md`) — Anthropic Prompt-Caching:
 * `cache_control: {type:'ephemeral'}` auf dem System-Block UND dem letzten
 * Tool-Eintrag. Request-Bau ist unit-testbar wie `zuAnthropicNachrichten` —
 * kein API-Schlüssel nötig, es geht nur um das gesendete JSON.
 */

function sseLeer(): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"message_stop"}\n'));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

async function erfasseRequestBody(
  provider: AnthropicProvider,
  args: Parameters<AnthropicProvider['chat']>[0],
): Promise<Record<string, unknown>> {
  let body: Record<string, unknown> = {};
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    body = JSON.parse(String(init?.body ?? '{}'));
    return sseLeer();
  }) as typeof fetch;
  try {
    const events = [];
    for await (const ev of provider.chat(args)) events.push(ev);
  } finally {
    globalThis.fetch = originalFetch;
  }
  return body;
}

describe('AnthropicProvider — Prompt-Caching (cache_control ephemeral)', () => {
  it('system-Block trägt cache_control ephemeral, statt eines rohen Strings', async () => {
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5' });
    const body = await erfasseRequestBody(p, {
      messages: [
        { role: 'system', content: 'Du bist Kosmo.' },
        { role: 'user', content: 'Hallo' },
      ],
    });
    expect(body.system).toEqual([{ type: 'text', text: 'Du bist Kosmo.', cache_control: { type: 'ephemeral' } }]);
  });

  it('ohne Systemprompt: kein system-Feld im Request (unverändert)', async () => {
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5' });
    const body = await erfasseRequestBody(p, { messages: [{ role: 'user', content: 'Hallo' }] });
    expect(body.system).toBeUndefined();
  });

  it('der LETZTE Tool-Eintrag trägt cache_control ephemeral, die übrigen nicht', async () => {
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5' });
    const body = await erfasseRequestBody(p, {
      messages: [{ role: 'user', content: 'Wand bitte' }],
      tools: [
        { name: 'modell_lesen', description: 'Liest den Modellzustand', parameters: { type: 'object', properties: {} } },
        { name: 'design_wandZeichnen', description: 'Zeichnet eine Wand', parameters: { type: 'object', properties: {} } },
      ],
    });
    const tools = body.tools as Array<Record<string, unknown>>;
    expect(tools).toHaveLength(2);
    expect(tools[0]!['cache_control']).toBeUndefined();
    expect(tools[1]!['cache_control']).toEqual({ type: 'ephemeral' });
    // Name/Beschreibung/Schema bleiben unverändert erhalten (kein Feld verloren).
    expect(tools[1]).toMatchObject({ name: 'design_wandZeichnen', description: 'Zeichnet eine Wand' });
  });

  it('ohne Tools: kein tools-Feld im Request (unverändert)', async () => {
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5' });
    const body = await erfasseRequestBody(p, { messages: [{ role: 'user', content: 'Hallo' }] });
    expect(body.tools).toBeUndefined();
  });

  it('System UND Tools zusammen: beide Cache-Breakpoints gleichzeitig gesetzt', async () => {
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5' });
    const body = await erfasseRequestBody(p, {
      messages: [
        { role: 'system', content: 'Du bist Kosmo.' },
        { role: 'user', content: 'Hallo' },
      ],
      tools: [{ name: 'modell_lesen', description: 'Liest', parameters: { type: 'object', properties: {} } }],
    });
    expect((body.system as Array<Record<string, unknown>>)[0]!['cache_control']).toEqual({ type: 'ephemeral' });
    expect((body.tools as Array<Record<string, unknown>>)[0]!['cache_control']).toEqual({ type: 'ephemeral' });
  });
});
