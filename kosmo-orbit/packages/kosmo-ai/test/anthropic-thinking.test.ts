import { describe, expect, it } from 'vitest';
import { AnthropicProvider, type StreamEvent } from '../src';

/**
 * v0.8.1 KI2 (§3 Kandidat 8 / C-39, `docs/V081-SPEZ.md`) — Extended Thinking:
 * `thinking: {type:'enabled', budget_tokens: N}` nur wenn `thinkingBudgetTokens`
 * konfiguriert ist (Neutralität ohne Konfiguration), plus `thinking_delta`-SSE-
 * Blöcke brechen den Stream nicht und tauchen nicht als Text auf (kein
 * StreamEvent-Vertragsbruch — `provider.ts` bekommt keinen neuen Event-Typ).
 * Muster wie `anthropic-cache.test.ts`/`stream-robustheit.test.ts`: Fake-fetch,
 * kein echtes Netz.
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

async function sammle(provider: AnthropicProvider, res: Response): Promise<StreamEvent[]> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => res) as unknown as typeof fetch;
  try {
    const events: StreamEvent[] = [];
    for await (const ev of provider.chat({ messages: [{ role: 'user', content: 'Hallo' }] })) events.push(ev);
    return events;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

describe('AnthropicProvider — Extended Thinking (thinking-Parameter, C-39)', () => {
  it('ohne thinkingBudgetTokens: kein thinking-Feld im Request (byte-identisch zu vorher)', async () => {
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5' });
    const body = await erfasseRequestBody(p, { messages: [{ role: 'user', content: 'Hallo' }] });
    expect(body.thinking).toBeUndefined();
  });

  it('mit thinkingBudgetTokens: Request enthält thinking:{type:"enabled", budget_tokens:N}', async () => {
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5', thinkingBudgetTokens: 4096 });
    const body = await erfasseRequestBody(p, { messages: [{ role: 'user', content: 'Hallo' }] });
    expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 4096 });
  });

  it('thinking bleibt neben cache_control (system+tools) unangetastet gesetzt', async () => {
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5', thinkingBudgetTokens: 2048 });
    const body = await erfasseRequestBody(p, {
      messages: [
        { role: 'system', content: 'Du bist Kosmo.' },
        { role: 'user', content: 'Hallo' },
      ],
      tools: [{ name: 'modell_lesen', description: 'Liest', parameters: { type: 'object', properties: {} } }],
    });
    expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 2048 });
    expect((body.system as Array<Record<string, unknown>>)[0]!['cache_control']).toEqual({ type: 'ephemeral' });
    expect((body.tools as Array<Record<string, unknown>>)[0]!['cache_control']).toEqual({ type: 'ephemeral' });
  });

  it('thinking_delta-Blöcke brechen den Stream nicht und tauchen NICHT als text-Event auf', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"content_block_start","content_block":{"type":"thinking"}}\n'));
        controller.enqueue(
          encoder.encode('data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"Ich überlege…"}}\n'),
        );
        controller.enqueue(
          encoder.encode('data: {"type":"content_block_delta","delta":{"type":"signature_delta","signature":"abc"}}\n'),
        );
        controller.enqueue(encoder.encode('data: {"type":"content_block_stop"}\n'));
        controller.enqueue(
          encoder.encode('data: {"type":"content_block_start","content_block":{"type":"text"}}\n'),
        );
        controller.enqueue(
          encoder.encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Antwort"}}\n'),
        );
        controller.enqueue(encoder.encode('data: {"type":"content_block_stop"}\n'));
        controller.enqueue(encoder.encode('data: {"type":"message_stop"}\n'));
        controller.close();
      },
    });
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5', thinkingBudgetTokens: 4096 });
    const events = await sammle(p, new Response(stream, { status: 200 }));

    // Thinking-Text darf NIE als text-Event rausfallen — nur der echte Antworttext.
    const texte = events.filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta);
    expect(texte).toEqual(['Antwort']);
    // Stream läuft trotz thinking-Blöcken sauber bis zum Ende durch.
    expect(events[events.length - 1]).toEqual({ type: 'done', stopReason: 'stop' });
    // Kein tool_call, keine Fehler-Events durch die unbekannten Delta-Typen ausgelöst.
    expect(events.some((e) => e.type === 'tool_call')).toBe(false);
    expect(events.filter((e) => e.type === 'done')).toHaveLength(1);
  });
});
