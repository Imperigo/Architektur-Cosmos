import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import { ChatSession, MockProvider, commandTools, validateToolCall, type StreamEvent } from '../src';

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

describe('Tool-Registry', () => {
  it('exportiert Kernel-Commands als JSON-Schema-Tools', () => {
    const tools = commandTools();
    const wand = tools.find((t) => t.name === 'design_wandZeichnen');
    expect(wand).toBeDefined();
    expect(wand!.description).toContain('Wand');
    const schema = wand!.parameters as { properties: Record<string, unknown> };
    expect(Object.keys(schema.properties)).toContain('storeyId');
    expect(Object.keys(schema.properties)).toContain('a');
  });

  it('validiert Tool-Calls und repariert kaputtes JSON', () => {
    const { storeyId, assemblyId } = demoDoc();
    const good = validateToolCall({
      id: 'c1',
      name: 'design_wandZeichnen',
      // absichtlich kaputtes JSON (fehlende Anführungszeichen) → jsonrepair
      arguments: `{storeyId: "${storeyId}", a: {x: 0, y: 0}, b: {x: 5000, y: 0}, assemblyId: "${assemblyId}"}`,
    });
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.summary).toBe('Wand 5.0 m');

    const bad = validateToolCall({
      id: 'c2',
      name: 'design_wandZeichnen',
      arguments: { a: { x: 0, y: 0 } },
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain('storeyId');
  });
});

describe('ChatSession (Mock-Provider, gated)', () => {
  it('Wand-Anweisung → Vorschlag → Freigabe → Ausführung → Kosmo bestätigt', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const proposals: { callId: string; commandId: string; params: unknown; summary: string }[] = [];
    let text = '';
    const session = new ChatSession(
      new MockProvider(),
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
      () => ({ storeyId, assemblyId }), // App-Kontext: aktives Geschoss + Aufbau
    );

    await session.send('Zeichne eine Wand von 0,0 nach 8,0');
    expect(proposals).toHaveLength(1);
    expect(doc.byKind('wall')).toHaveLength(0); // gated: noch NICHT ausgeführt

    const p = proposals[0]!;
    expect(p.summary).toBe('Wand 8.0 m');
    const result = execute(doc, p.commandId, p.params);
    expect(doc.byKind('wall')).toHaveLength(1);
    await session.resolveApplied(p.callId, result.summary);
    expect(text.length).toBeGreaterThan(0);
  });
});

describe('Härte: Tool-Call-Fuzzing (lokale LLMs liefern Müll)', () => {
  const wandArgs = { storeyId: 's1', a: { x: 0, y: 0 }, b: { x: 5000, y: 0 }, assemblyId: 'a1' };

  it('Markdown-Zäune um die Argumente werden geschält', () => {
    const r = validateToolCall({
      id: '1', name: 'design_wandZeichnen',
      arguments: '```json\n' + JSON.stringify(wandArgs) + '\n```',
    });
    expect(r.ok).toBe(true);
  });

  it('einfache Anführungszeichen + Trailing-Comma werden repariert', () => {
    const r = validateToolCall({
      id: '2', name: 'design_wandZeichnen',
      arguments: "{'storeyId': 's1', 'a': {'x': 0, 'y': 0}, 'b': {'x': 5000, 'y': 0}, 'assemblyId': 'a1',}",
    });
    expect(r.ok).toBe(true);
  });

  it('falsche Typen und fehlende Felder → präzise Meldung, kein Wurf', () => {
    const r = validateToolCall({
      id: '3', name: 'design_wandZeichnen',
      arguments: JSON.stringify({ storeyId: 's1', a: { x: 'links', y: 0 } }),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('a.x');
      expect(r.error).toContain('b');
    }
  });

  it('unbekanntes Werkzeug, kompletter Schrott, Extremwerte → saubere Fehler', () => {
    expect(validateToolCall({ id: '4', name: 'design_hausBauen', arguments: '{}' }).ok).toBe(false);
    expect(validateToolCall({ id: '5', name: 'design_wandZeichnen', arguments: '<xml>nein</xml>' }).ok).toBe(false);
    const pitch = validateToolCall({
      id: '6', name: 'design_dachErstellen',
      arguments: JSON.stringify({ storeyId: 's1', outline: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], pitch: 89 }),
    });
    expect(pitch.ok).toBe(false);
  });

  it('Fremdschlüssel (__proto__ etc.) landen nicht in den geparsten Params', () => {
    const r = validateToolCall({
      id: '7', name: 'design_wandZeichnen',
      arguments: JSON.stringify({ ...wandArgs, __proto__: { boese: true }, extra: 'weg' }),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect('extra' in (r.params as Record<string, unknown>)).toBe(false);
      expect(({} as Record<string, unknown>)['boese']).toBeUndefined();
    }
  });
});

describe('Belegte Antworten (V2-B1, Mock)', () => {
  it('Wissensfrage → quellen_suchen → Antwort zitiert die Marke [Qn]', async () => {
    const provider = new MockProvider();
    // Zug 1: Frage → Tool-Call
    const events1: StreamEvent[] = [];
    for await (const ev of provider.chat({
      messages: [{ role: 'user', content: 'Was sagt das Programm zur Nutzfläche?' }],
    })) {
      events1.push(ev);
    }
    const call = events1.find((e) => e.type === 'tool_call');
    expect(call).toBeDefined();
    expect((call as { call: { name: string; arguments: unknown } }).call.name).toBe('quellen_suchen');
    expect((call as { call: { arguments: { suchbegriff: string } } }).call.arguments.suchbegriff).toBe('nutzfläche');

    // Zug 2: Tool-Resultat mit Belegen → Antwort zitiert [Q1]
    const events2: StreamEvent[] = [];
    for await (const ev of provider.chat({
      messages: [
        { role: 'user', content: 'Was sagt das Programm zur Nutzfläche?' },
        {
          role: 'tool',
          toolName: 'quellen_suchen',
          content:
            '[Q1] (Programm.pdf · Abschnitt 2) Die Hauptnutzfläche beträgt mindestens 2814 m².\n\nZitiere die Belege mit ihrer Marke.',
        },
      ],
    })) {
      events2.push(ev);
    }
    const text = events2
      .filter((e): e is Extract<StreamEvent, { type: 'text' }> => e.type === 'text')
      .map((e) => e.delta)
      .join('');
    expect(text).toContain('[Q1]');
  });
});
