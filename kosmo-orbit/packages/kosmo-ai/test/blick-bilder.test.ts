import { afterEach, describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import { ChatSession, ScriptedProvider, type ChatMessage, type ChatProvider, type ChatRequest, type StreamEvent, type SzenarioSkript } from '../src';
import { AnthropicProvider, zuAnthropicNachrichten } from '../src/anthropic';
import { bildBudget, BILD_BUDGET_MAX_BASE64_ZEICHEN } from '../src/bild-budget';
import { zuOpenAiInhalt, zuOpenAiNachrichten } from '../src/openai-kompatibel';
import { zuOllamaNachrichten } from '../src/provider';

/**
 * v0.6.8 («Kosmo sieht mit») — Commit 1: `ChatMessage.images` ist additiv
 * (KEINE content-Union, `content` bleibt immer string). Diese Suite prüft
 * zwei Dinge getrennt:
 *  1. Durchreichung: `ChatSession.send(text, images)` hängt `images` exakt
 *     ans user-Message-Objekt — ein Spion-Provider bezeugt das, ohne echtes
 *     Netz (kein Anthropic-/Ollama-/LM-Studio-Server im Container).
 *  2. Payload-Bau je Provider: die PUR-FUNKTIONEN, die `chat()` intern nutzt
 *     (`zuAnthropicNachrichten`, `zuOpenAiNachrichten`/`zuOpenAiInhalt`,
 *     `zuOllamaNachrichten`) — reine Objektbau-Tests, kein `fetch`/SSE nötig.
 * Was NICHT getestet wird (ehrlich): ein echter Bildcall gegen die Anthropic-
 * API — dafür bräuchte es einen Schlüssel + Netzzugriff, die im Container
 * nicht verfügbar sind.
 */

function demoDoc() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  return { doc, storeyId: (eg.patches[0] as { id: string }).id };
}

/** Spion-Provider: zeichnet die zuletzt empfangene Nachrichtenliste auf, statt zu antworten. */
class SpionProvider implements ChatProvider {
  readonly id = 'spion';
  letzteMessages: ChatMessage[] = [];

  async *chat(req: ChatRequest): AsyncIterable<StreamEvent> {
    this.letzteMessages = req.messages;
    yield { type: 'text', delta: 'ok' };
    yield { type: 'done', stopReason: 'stop' };
  }
}

describe('ChatSession.send — images-Durchreichung', () => {
  it('hängt images ans user-Message-Objekt, wenn übergeben', async () => {
    const { doc } = demoDoc();
    const provider = new SpionProvider();
    const session = new ChatSession(provider, doc, {
      onText: () => {},
      onProposal: () => {},
      onBusy: () => {},
      onError: () => {},
    });

    const bild = [{ mediaType: 'image/png', dataBase64: 'QQ==' }];
    await session.send('Was siehst du?', bild);

    const userMsg = provider.letzteMessages.find((m) => m.role === 'user');
    expect(userMsg?.content).toBe('Was siehst du?');
    expect(userMsg?.images).toEqual(bild);
  });

  it('lässt images weg, wenn nicht übergeben — bestehender Vertrag bleibt exakt stabil', async () => {
    const { doc } = demoDoc();
    const provider = new SpionProvider();
    const session = new ChatSession(provider, doc, {
      onText: () => {},
      onProposal: () => {},
      onBusy: () => {},
      onError: () => {},
    });

    await session.send('Zeichne eine Wand');

    const userMsg = provider.letzteMessages.find((m) => m.role === 'user');
    expect(userMsg?.images).toBeUndefined();
    expect('images' in (userMsg ?? {})).toBe(false);
  });

  it('leeres images-Array hängt kein Feld an (exactOptionalPropertyTypes-Härtung)', async () => {
    const { doc } = demoDoc();
    const provider = new SpionProvider();
    const session = new ChatSession(provider, doc, {
      onText: () => {},
      onProposal: () => {},
      onBusy: () => {},
      onError: () => {},
    });

    await session.send('Nichts zu sehen', []);

    const userMsg = provider.letzteMessages.find((m) => m.role === 'user');
    expect(userMsg?.images).toBeUndefined();
  });
});

describe('zuAnthropicNachrichten — Bildblöcke', () => {
  it('setzt Bildblöcke VOR den Textblock einer user-Nachricht mit images', () => {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: 'Was siehst du hier?',
        images: [{ mediaType: 'image/png', dataBase64: 'QQ==' }],
      },
    ];
    const { messages: raus } = zuAnthropicNachrichten(messages);
    expect(raus).toHaveLength(1);
    expect(raus[0]!.role).toBe('user');
    expect(raus[0]!.content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'QQ==' } },
      { type: 'text', text: 'Was siehst du hier?' },
    ]);
  });

  it('ohne images bleibt der bestehende Ein-Text-Block-Vertrag exakt stabil', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'Zeichne eine Wand' }];
    const { messages: raus } = zuAnthropicNachrichten(messages);
    expect(raus[0]!.content).toEqual([{ type: 'text', text: 'Zeichne eine Wand' }]);
  });

  it('mehrere Bilder werden alle vor dem Text eingefügt, in Reihenfolge', () => {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: 'Vergleich',
        images: [
          { mediaType: 'image/png', dataBase64: 'AAA' },
          { mediaType: 'image/jpeg', dataBase64: 'BBB' },
        ],
      },
    ];
    const { messages: raus } = zuAnthropicNachrichten(messages);
    expect(raus[0]!.content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAA' } },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'BBB' } },
      { type: 'text', text: 'Vergleich' },
    ]);
  });
});

describe('zuOpenAiInhalt / zuOpenAiNachrichten — image_url-Array nur mit Bildern', () => {
  it('ohne images bleibt content ein reiner String', () => {
    expect(zuOpenAiInhalt('Zeichne eine Wand')).toBe('Zeichne eine Wand');
  });

  it('mit images wird content ein Teile-Array, Bilder zuerst, Text zuletzt', () => {
    const inhalt = zuOpenAiInhalt('Was ist das?', [{ mediaType: 'image/png', dataBase64: 'QQ==' }]);
    expect(inhalt).toEqual([
      { type: 'image_url', image_url: { url: 'data:image/png;base64,QQ==' } },
      { type: 'text', text: 'Was ist das?' },
    ]);
  });

  it('zuOpenAiNachrichten wendet das nur auf user-Nachrichten an, tool/assistant bleiben unverändert', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Blick', images: [{ mediaType: 'image/png', dataBase64: 'QQ==' }] },
      { role: 'assistant', content: 'Antwort' },
    ];
    const raus = zuOpenAiNachrichten(messages);
    expect(raus[0]).toEqual({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: 'data:image/png;base64,QQ==' } },
        { type: 'text', text: 'Blick' },
      ],
    });
    expect(raus[1]).toEqual({ role: 'assistant', content: 'Antwort' });
  });
});

describe('zuOllamaNachrichten — images-Feld neben content', () => {
  it('ohne images kein images-Feld', () => {
    const raus = zuOllamaNachrichten([{ role: 'user', content: 'Zeichne eine Wand' }]);
    expect(raus[0]).toEqual({ role: 'user', content: 'Zeichne eine Wand' });
    expect('images' in raus[0]!).toBe(false);
  });

  it('mit images: rohe base64-Strings ohne data:-Prefix, content bleibt Text', () => {
    const raus = zuOllamaNachrichten([
      {
        role: 'user',
        content: 'Was siehst du?',
        images: [
          { mediaType: 'image/png', dataBase64: 'AAA' },
          { mediaType: 'image/png', dataBase64: 'BBB' },
        ],
      },
    ]);
    expect(raus[0]!.content).toBe('Was siehst du?');
    expect(raus[0]!.images).toEqual(['AAA', 'BBB']);
  });
});

/**
 * v0.7.1 Stream 1A «Blick-Cloud-Kern» — HÄRTUNG des seit 0.6.8 bestehenden
 * Bild-Wegs: (a) Blockreihenfolge über mehrere Turns mit Tool-Use bleibt
 * korrekt (Bild nur an der Message, an der es hängt — kein Leck in spätere
 * Turns); (b) `bildBudget()`-Grenzfälle; (c) bildspezifischer Fehlerpfad im
 * AnthropicProvider (gemockter fetch, kein echtes Netz); (d) ScriptedProvider-
 * Bildecho für Stream-2A-E2E-Beweise.
 */
describe('zuAnthropicNachrichten — Bild + Tool-Use über mehrere Turns', () => {
  it('Bild bleibt an der User-Message, an der es hängt — kein Leck in spätere Turns', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'Du bist Kosmo.' },
      {
        role: 'user',
        content: 'Was siehst du im Blick?',
        images: [{ mediaType: 'image/png', dataBase64: 'QQ==' }],
      },
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'c1', name: 'design_wandZeichnen', arguments: { a: 1 } }],
      },
      { role: 'tool', toolName: 'design_wandZeichnen', content: 'AUSGEFÜHRT: Wand 1' },
      { role: 'user', content: 'Und jetzt — sieht das gut aus?' },
      { role: 'assistant', content: 'Ja, das passt.' },
    ];

    const { system, messages: raus } = zuAnthropicNachrichten(messages);
    expect(system).toBe('Du bist Kosmo.');
    expect(raus.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);

    // Erster Turn: Bild VOR Text — wie im Single-Turn-Fall (0.6.8).
    expect(raus[0]!.content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'QQ==' } },
      { type: 'text', text: 'Was siehst du im Blick?' },
    ]);

    // Tool-Use-Block des Assistenten unverändert.
    expect(raus[1]!.content).toEqual([{ type: 'tool_use', id: 'c1', name: 'design_wandZeichnen', input: { a: 1 } }]);

    // Zweiter User-Turn (tool_result + Folgefrage): KEIN Bildblock — das Bild
    // aus dem ersten Turn darf nicht in spätere Turns durchsickern.
    expect(raus[2]!.content).toEqual([
      { type: 'tool_result', tool_use_id: 'c1', content: 'AUSGEFÜHRT: Wand 1' },
      { type: 'text', text: 'Und jetzt — sieht das gut aus?' },
    ]);
    expect(raus[2]!.content.some((b) => b.type === 'image')).toBe(false);

    expect(raus[3]!.content).toEqual([{ type: 'text', text: 'Ja, das passt.' }]);
  });
});

describe('bildBudget — Vorabprüfung ohne Netzcall', () => {
  it('ok ohne images', () => {
    expect(bildBudget([{ role: 'user', content: 'Zeichne eine Wand' }])).toEqual({ ok: true });
  });

  it('ok mit leerem images-Array', () => {
    expect(bildBudget([{ role: 'user', content: 'Nichts', images: [] }])).toEqual({ ok: true });
  });

  it('ok genau am Limit (4 MB base64-Länge)', () => {
    const dataBase64 = 'A'.repeat(BILD_BUDGET_MAX_BASE64_ZEICHEN);
    const result = bildBudget([{ role: 'user', content: 'Blick', images: [{ mediaType: 'image/png', dataBase64 }] }]);
    expect(result).toEqual({ ok: true });
  });

  it('scheitert ein Zeichen über dem Limit — deutsche, konkrete Meldung', () => {
    const dataBase64 = 'A'.repeat(BILD_BUDGET_MAX_BASE64_ZEICHEN + 1);
    const result = bildBudget([{ role: 'user', content: 'Blick', images: [{ mediaType: 'image/png', dataBase64 }] }]);
    expect(result.ok).toBe(false);
    expect((result as { grund: string }).grund).toContain('Bild zu gross');
    expect((result as { grund: string }).grund).toContain('4 MB');
  });

  it('mehrere Bilder: das zweite überschreitet — schlägt trotzdem fehl', () => {
    const klein = 'A'.repeat(100);
    const zuGross = 'B'.repeat(BILD_BUDGET_MAX_BASE64_ZEICHEN + 500);
    const result = bildBudget([
      {
        role: 'user',
        content: 'Vergleich',
        images: [
          { mediaType: 'image/png', dataBase64: klein },
          { mediaType: 'image/png', dataBase64: zuGross },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
  });

  it('prüft ALLE Nachrichten der Historie, nicht nur die letzte', () => {
    const zuGross = 'C'.repeat(BILD_BUDGET_MAX_BASE64_ZEICHEN + 1);
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Erster Blick', images: [{ mediaType: 'image/png', dataBase64: zuGross }] },
      { role: 'assistant', content: 'Ich sehe ein grosses Bild.' },
      { role: 'user', content: 'Und jetzt?' },
    ];
    expect(bildBudget(messages).ok).toBe(false);
  });
});

describe('AnthropicProvider — bildspezifischer Fehlerpfad (v0.7.1-Härtung)', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('bildBudget-Verstoss meldet den Fehler OHNE Netzcall', async () => {
    let fetchAufgerufen = false;
    globalThis.fetch = (async () => {
      fetchAufgerufen = true;
      throw new Error('darf nicht aufgerufen werden');
    }) as typeof fetch;
    const zuGross = 'A'.repeat(BILD_BUDGET_MAX_BASE64_ZEICHEN + 1);
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5' });
    const events: StreamEvent[] = [];
    for await (const ev of p.chat({
      messages: [{ role: 'user', content: 'Blick', images: [{ mediaType: 'image/png', dataBase64: zuGross }] }],
    })) {
      events.push(ev);
    }
    expect(fetchAufgerufen).toBe(false);
    expect(events).toHaveLength(1);
    const done = events[0] as { stopReason: string; error?: string };
    expect(done.stopReason).toBe('error');
    expect(done.error).toContain('Bild zu gross');
  });

  it('400 mit Anthropic-Bildgrössen-Fehlerbody → deutsche, konkrete Meldung statt generischem Statuscode-Text', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message:
              'messages.0.content.0.image.source.base64.data: image exceeds 5 MB maximum: 6291456 bytes > 5242880 bytes',
          },
        }),
        { status: 400 },
      )) as typeof fetch;
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5' });
    const events: StreamEvent[] = [];
    for await (const ev of p.chat({
      messages: [{ role: 'user', content: 'Blick', images: [{ mediaType: 'image/png', dataBase64: 'QQ==' }] }],
    })) {
      events.push(ev);
    }
    const done = events[events.length - 1] as { stopReason: string; error?: string };
    expect(done.stopReason).toBe('error');
    expect(done.error).toContain('Bild zu gross');
    expect(done.error).not.toContain('exceeds 5 MB maximum');
  });

  it('413 Payload Too Large bei einem Bild-Request → deutsche Bild-Meldung', async () => {
    globalThis.fetch = (async () => new Response('Payload Too Large', { status: 413 })) as typeof fetch;
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5' });
    const events: StreamEvent[] = [];
    for await (const ev of p.chat({
      messages: [{ role: 'user', content: 'Blick', images: [{ mediaType: 'image/png', dataBase64: 'QQ==' }] }],
    })) {
      events.push(ev);
    }
    const done = events[events.length - 1] as { stopReason: string; error?: string };
    expect(done.error).toContain('Bild zu gross');
  });

  it('400 ohne Bilder im Request bleibt beim bisherigen generischen Pfad', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'invalid_request_error: irgendwas anderes' } }), {
        status: 400,
      })) as typeof fetch;
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5' });
    const events: StreamEvent[] = [];
    for await (const ev of p.chat({ messages: [{ role: 'user', content: 'Hallo' }] })) events.push(ev);
    const done = events[events.length - 1] as { stopReason: string; error?: string };
    expect(done.error).not.toContain('Bild zu gross');
  });
});

describe('ScriptedProvider — Bildecho für E2E-Beweise (v0.7.1-Härtung)', () => {
  it('stellt den Marker voran, wenn die letzte User-Message images trägt', async () => {
    const skript: SzenarioSkript = {
      id: 'blick-echo',
      zuege: [{ antwortText: 'Ich sehe den Blick.', toolCalls: [] }],
    };
    const provider = new ScriptedProvider('blick-echo', { 'blick-echo': skript });
    const events: StreamEvent[] = [];
    for await (const ev of provider.chat({
      messages: [
        {
          role: 'user',
          content: 'Was siehst du?',
          images: [
            { mediaType: 'image/png', dataBase64: 'AAA' },
            { mediaType: 'image/png', dataBase64: 'BBB' },
          ],
        },
      ],
    })) {
      events.push(ev);
    }
    const text = events.find((e) => e.type === 'text') as { delta: string };
    expect(text.delta).toBe('[Blick empfangen: 2 Bild(er)] Ich sehe den Blick.');
  });

  it('ohne images bleibt die Antwort byte-identisch zum bestehenden Vertrag (kein Marker)', async () => {
    const skript: SzenarioSkript = {
      id: 'ohne-blick',
      zuege: [{ antwortText: 'Gerne — ich zeichne die Wand.', toolCalls: [] }],
    };
    const provider = new ScriptedProvider('ohne-blick', { 'ohne-blick': skript });
    const events: StreamEvent[] = [];
    for await (const ev of provider.chat({ messages: [{ role: 'user', content: 'Zeichne eine Wand' }] })) {
      events.push(ev);
    }
    const text = events.find((e) => e.type === 'text') as { delta: string };
    expect(text.delta).toBe('Gerne — ich zeichne die Wand.');
  });
});
