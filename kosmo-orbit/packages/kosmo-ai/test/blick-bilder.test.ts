import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import { ChatSession, type ChatMessage, type ChatProvider, type ChatRequest, type StreamEvent } from '../src';
import { zuAnthropicNachrichten } from '../src/anthropic';
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
