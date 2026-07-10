import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import { ChatSession, ScriptedProvider, type SzenarioSkript } from '../src';
import type { StreamEvent } from '../src';

function demoDoc() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', {
    name: 'EG',
    index: 0,
    elevation: 0,
    height: 3000,
  });
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 360, function: 'tragend' }],
  });
  return {
    doc,
    storeyId: (eg.patches[0] as { id: string }).id,
    assemblyId: (aufbau.patches[0] as { id: string }).id,
  };
}

/** Zwei Züge: (1) EIN Paket aus zwei Wänden, (2) ein Zug ohne Tool-Calls
 * (reine Auskunft) — deckt beide Turn-Formen des Skript-Abspiels ab. */
function zweiZuegeSkript(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): SzenarioSkript {
  return {
    id: 'demo-haus',
    zuege: [
      {
        nutzerErwartung: /wand/i,
        antwortText: 'Gerne — ich zeichne zwei Wände als ein Paket.',
        toolCalls: [
          { name: 'design_wandZeichnen', args: { a, b } },
          { name: 'design_wandZeichnen', args: { a: b, b: c } },
        ],
      },
      {
        antwortText: 'Fertig — willst du noch mehr?',
        toolCalls: [],
      },
    ],
  };
}

async function sammle(provider: ScriptedProvider, messages: { role: 'user' | 'assistant' | 'tool'; content: string; toolName?: string }[]): Promise<StreamEvent[]> {
  const ev: StreamEvent[] = [];
  for await (const e of provider.chat({ messages: messages as never })) ev.push(e);
  return ev;
}

describe('ScriptedProvider — Paket-Abspiel in Reihenfolge', () => {
  it('yieldet Text VOR den Tool-Calls, dann alle Tool-Calls des Zugs in Skript-Reihenfolge', async () => {
    const skript = zweiZuegeSkript({ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 8000 });
    const provider = new ScriptedProvider('demo-haus', { 'demo-haus': skript });
    const events = await sammle(provider, [{ role: 'user', content: 'Zeichne die Wand-Kette' }]);

    expect(events[0]).toEqual({ type: 'text', delta: 'Gerne — ich zeichne zwei Wände als ein Paket.' });
    const calls = events.filter((e) => e.type === 'tool_call') as { type: 'tool_call'; call: { name: string; arguments: unknown } }[];
    expect(calls).toHaveLength(2);
    expect(calls[0]!.call.arguments).toEqual({ a: { x: 0, y: 0 }, b: { x: 8000, y: 0 } });
    expect(calls[1]!.call.arguments).toEqual({ a: { x: 8000, y: 0 }, b: { x: 8000, y: 8000 } });
    expect(events[events.length - 1]).toEqual({ type: 'done', stopReason: 'tool_calls' });
  });
});

describe('ScriptedProvider — durch den ECHTEN ChatSession-Pfad (Validierung/Defaults/Diff-Karten/Freigabe)', () => {
  it('ein Zug mit Paket wird zu ZWEI Diff-Karten-Vorschlägen; nach Freigabe beider quittiert der Provider und wartet auf den nächsten Zug', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const skript = zweiZuegeSkript({ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 8000 });
    const provider = new ScriptedProvider('demo-haus', { 'demo-haus': skript });
    const proposals: { callId: string; commandId: string; params: unknown; summary: string; paket?: { id: string; index: number; groesse: number } }[] = [];
    let text = '';
    const session = new ChatSession(
      provider,
      doc,
      {
        onText: (d) => (text += d),
        onProposal: (p) => proposals.push(p),
        onBusy: () => {},
        onError: (e) => {
          throw new Error(e);
        },
      },
      'System',
      () => ({ storeyId, assemblyId }),
    );

    await session.send('Zeichne die Wand-Kette');

    // ECHTER Pfad: Validierung/Defaults sind gelaufen (storeyId/assemblyId kamen
    // aus dem App-Kontext, nicht aus dem Skript) — beide Vorschläge sind gültig
    // Diff-Karten, NICHTS ist im Doc, solange nicht freigegeben.
    expect(proposals).toHaveLength(2);
    expect(doc.byKind('wall')).toHaveLength(0);
    expect(proposals[0]!.paket?.groesse).toBe(2);
    expect(proposals[1]!.paket?.id).toBe(proposals[0]!.paket?.id);
    expect(text).toContain('Gerne — ich zeichne zwei Wände als ein Paket.');

    // Freigabe beider Vorschläge über denselben Weg wie ein echter Handgriff.
    for (const p of proposals) {
      const result = execute(doc, p.commandId, p.params);
      await session.resolveApplied(p.callId, result.summary);
    }
    expect(doc.byKind('wall')).toHaveLength(2);
    expect(text).toContain('Erledigt — weiter mit dem nächsten Schritt.');

    // Nächster Zug (ohne Tool-Calls) — erst NACH einer neuen Nutzer-Nachricht.
    await session.send('weiter');
    expect(text).toContain('Fertig — willst du noch mehr?');
    expect(proposals).toHaveLength(2); // keine neue Karte für den letzten Zug
  });

  it('Ende-Verhalten: nach dem letzten Zug meldet der Provider ehrlich, dass das Skript durchgespielt ist', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const einZugSkript: SzenarioSkript = {
      id: 'ein-zug',
      zuege: [{ antwortText: 'Ich zeichne eine Wand.', toolCalls: [{ name: 'design_wandZeichnen', args: { a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } } }] }],
    };
    const provider = new ScriptedProvider('ein-zug', { 'ein-zug': einZugSkript });
    const proposals: { callId: string; commandId: string; params: unknown }[] = [];
    let text = '';
    const session = new ChatSession(
      provider,
      doc,
      {
        onText: (d) => (text += d),
        onProposal: (p) => proposals.push(p),
        onBusy: () => {},
        onError: (e) => {
          throw new Error(e);
        },
      },
      'System',
      () => ({ storeyId, assemblyId }),
    );

    await session.send('Zeichne eine Wand');
    expect(proposals).toHaveLength(1);
    const p = proposals[0]!;
    const result = execute(doc, p.commandId, p.params);
    await session.resolveApplied(p.callId, result.summary);
    expect(text).toContain('durchgespielt');

    // Weitere Nutzer-Nachricht nach Skriptende → ehrliche Absage, kein Crash,
    // keine neue Diff-Karte.
    text = '';
    await session.send('Noch eine Wand?');
    expect(text).toContain('bereits zu Ende');
    expect(proposals).toHaveLength(1);
  });

  it('unbekannte skriptId: ehrliche Fehlermeldung im Chat statt Crash', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const provider = new ScriptedProvider('nicht-vorhanden', {});
    let text = '';
    let error = '';
    const session = new ChatSession(
      provider,
      doc,
      {
        onText: (d) => (text += d),
        onProposal: () => {
          throw new Error('kein Vorschlag erwartet');
        },
        onBusy: () => {},
        onError: (e) => (error = e),
      },
      'System',
      () => ({ storeyId, assemblyId }),
    );

    await expect(session.send('Hallo Kosmo')).resolves.not.toThrow();
    expect(text).toContain('Unbekanntes Skript');
    expect(text).toContain('nicht-vorhanden');
    expect(error).toBe('');
  });
});

describe('ScriptedProvider — Züge-Index lebt am Objekt (kein Modul-Global)', () => {
  it('zwei unabhängige Provider-Instanzen desselben Skripts stören sich nicht gegenseitig', async () => {
    const skript = zweiZuegeSkript({ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 });
    const registry = { 'demo-haus': skript };
    const a = new ScriptedProvider('demo-haus', registry);
    const b = new ScriptedProvider('demo-haus', registry);

    const evA1 = await sammle(a, [{ role: 'user', content: 'los' }]);
    // a hat jetzt ein offenes Paket (zugIndex bleibt 0, bis die Tool-Resultate
    // zurückkommen) — b startet unabhängig bei 0 und liefert denselben ersten Zug.
    const evB1 = await sammle(b, [{ role: 'user', content: 'los' }]);
    expect(evA1[0]).toEqual(evB1[0]);

    // a bekommt seine Tool-Resultate zurück → rückt auf Zug 2 vor.
    const evA2 = await sammle(a, [
      { role: 'user', content: 'los' },
      { role: 'assistant', content: '' },
      { role: 'tool', content: 'AUSGEFÜHRT: ok', toolName: 'design_wandZeichnen' },
    ]);
    expect(evA2.find((e) => e.type === 'text')?.type === 'text' && (evA2.find((e) => e.type === 'text') as { delta: string }).delta).toContain('weiter mit dem nächsten Schritt');

    // b hat noch KEINE Tool-Resultate bekommen — ein neuer «los»-Aufruf muss
    // wieder Zug 1 spielen (eigener, unbeeinflusster Index).
    const evB1b = await sammle(b, [{ role: 'user', content: 'los' }]);
    expect(evB1b[0]).toEqual(evB1[0]);
  });
});
