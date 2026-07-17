import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import { ChatSession, type ChatProvider, type ChatRequest, type StreamEvent, type ValidatedCall } from '../src';

/**
 * v0.8.2/P3 («Signal-Erfassung» + B1 «Stop-Knopf», `docs/V082-SPEZ.md` §4.2/
 * §6.3) — additive Event-Callbacks von `chat.ts`. Beide Hooks sind rein
 * additiv (optional, `undefined` in den bestehenden 189+ KI-Tests) — dieser
 * Datei prüft NUR das neue Verhalten, ändert keinen bestehenden Test.
 */

function demoDoc() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
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

/** Provider mit EINEM roh-JSON-Tool-Call, dessen Argumente Single-Quotes +
 * Trailing-Comma tragen — braucht `jsonrepair` (Muster `ai.test.ts`
 * «Härte: Tool-Call-Fuzzing»), um `brauchteReparatur()` deterministisch
 * auszulösen. */
class ReparaturProvider implements ChatProvider {
  readonly id = 'reparatur-test';
  async *chat(): AsyncIterable<StreamEvent> {
    yield {
      type: 'tool_call',
      call: {
        id: 'call_1',
        name: 'design_wandZeichnen',
        arguments: "{'storeyId': '$STOREY', 'a': {'x': 0, 'y': 0}, 'b': {'x': 5000, 'y': 0}, 'assemblyId': '$ASSEMBLY',}",
      },
    };
    yield { type: 'done', stopReason: 'tool_calls' };
  }
}

/** Provider mit gültigem (nicht reparaturbedürftigem) JSON-Objekt-Aufruf. */
class SauberProvider implements ChatProvider {
  readonly id = 'sauber-test';
  async *chat(): AsyncIterable<StreamEvent> {
    yield {
      type: 'tool_call',
      call: { id: 'call_1', name: 'design_wandZeichnen', arguments: { a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } } },
    };
    yield { type: 'done', stopReason: 'tool_calls' };
  }
}

/** Steuerbarer Provider für B1: hält NACH dem ersten Text-Chunk an, bis der
 * Test `weiter()` ruft — so kann `stopStream()` deterministisch MITTEN im
 * Stream greifen, ohne auf echte Timer angewiesen zu sein. */
function steuerbarerProvider() {
  let weiterResolve: (() => void) | null = null;
  const wartepunkt = new Promise<void>((r) => {
    weiterResolve = r;
  });
  const provider: ChatProvider = {
    id: 'steuerbar-test',
    async *chat(req: ChatRequest): AsyncIterable<StreamEvent> {
      yield { type: 'text', delta: 'Hallo ' };
      await wartepunkt;
      if (req.signal?.aborted) return; // Reader-Cancel-Analogon: nichts mehr yielden
      yield { type: 'text', delta: 'Welt' };
      yield {
        type: 'tool_call',
        call: { id: 'call_x', name: 'design_wandZeichnen', arguments: { a: { x: 0, y: 0 }, b: { x: 1000, y: 0 } } },
      };
      yield { type: 'done', stopReason: 'tool_calls' };
    },
  };
  return { provider, weiter: () => weiterResolve?.() };
}

describe('ChatSession — onReparatur-Hook (v0.8.2/P3 §4.2, additiv)', () => {
  it('feuert mit vorher (roh)/nachher (validiert), wenn jsonrepair nötig war', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const reparaturen: { vorher: unknown; nachher: ValidatedCall }[] = [];
    const session = new ChatSession(
      new ReparaturProvider(),
      doc,
      {
        onText: () => {},
        onProposal: () => {},
        onBusy: () => {},
        onError: (e) => {
          throw new Error(e);
        },
        onReparatur: (vorher, nachher) => reparaturen.push({ vorher, nachher }),
      },
      'System',
      () => ({ storeyId, assemblyId }),
    );
    // `$STOREY`/`$ASSEMBLY` sind Platzhalter — applyDefaults füllt echte IDs
    // nur bei FEHLENDEN Pflichtfeldern, hier stehen bereits (falsche) Strings;
    // das ist irrelevant für den Reparatur-Hook selbst (er beobachtet nur,
    // ob die ROHEN Argumente ein String waren, der jsonrepair brauchte).
    await session.send('Zeichne eine Wand');

    expect(reparaturen).toHaveLength(1);
    expect(typeof reparaturen[0]!.vorher).toBe('string');
    expect(reparaturen[0]!.nachher.commandId).toBe('design.wandZeichnen');
    expect(reparaturen[0]!.nachher.ok).toBe(true);
  });

  it('feuert NICHT bei einem bereits sauberen (Objekt-)Aufruf', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const reparaturen: unknown[] = [];
    const session = new ChatSession(
      new SauberProvider(),
      doc,
      {
        onText: () => {},
        onProposal: () => {},
        onBusy: () => {},
        onError: (e) => {
          throw new Error(e);
        },
        onReparatur: (v, n) => reparaturen.push({ v, n }),
      },
      'System',
      () => ({ storeyId, assemblyId }),
    );
    await session.send('Zeichne eine Wand');
    expect(reparaturen).toHaveLength(0);
  });

  it('bestehende Aufrufer ohne onReparatur bleiben unverändert grün (optional, kein Pflichtfeld)', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const session = new ChatSession(
      new ReparaturProvider(),
      doc,
      { onText: () => {}, onProposal: () => {}, onBusy: () => {}, onError: () => {} },
      'System',
      () => ({ storeyId, assemblyId }),
    );
    await expect(session.send('Zeichne eine Wand')).resolves.toBeUndefined();
  });
});

describe('ChatSession — stopStream()/onAborted (v0.8.2/P3 B1, §6.3, additiv)', () => {
  it('bricht einen laufenden Zug ab: nur der Text VOR dem Abbruch bleibt, kein Vorschlag danach, onAborted feuert genau einmal', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const { provider, weiter } = steuerbarerProvider();
    let text = '';
    let abgebrochenCount = 0;
    let fehlerCount = 0;
    const proposals: unknown[] = [];
    const session = new ChatSession(
      provider,
      doc,
      {
        onText: (d) => (text += d),
        onProposal: (p) => proposals.push(p),
        onBusy: () => {},
        onError: () => {
          fehlerCount++;
        },
        onAborted: () => {
          abgebrochenCount++;
        },
      },
      'System',
      () => ({ storeyId, assemblyId }),
    );

    const gesendet = session.send('Zeichne eine Wand');
    // Erstes Chunk ('Hallo ') ist bereits geflossen, bevor der Provider am
    // Wartepunkt hält — `stopStream()` bricht GENAU hier ab.
    await Promise.resolve();
    await Promise.resolve();
    session.stopStream();
    weiter(); // Provider darf weiterlaufen — die Abfrage `req.signal?.aborted` im Test-Provider beendet ihn selbst sauber
    await gesendet;

    expect(text).toBe('Hallo ');
    expect(proposals).toHaveLength(0);
    expect(abgebrochenCount).toBe(1);
    expect(fehlerCount).toBe(0);
  });

  it('stopStream() ohne laufenden Zug ist ein folgenloses No-Op (kein Wurf)', () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const session = new ChatSession(
      new SauberProvider(),
      doc,
      { onText: () => {}, onProposal: () => {}, onBusy: () => {}, onError: () => {} },
      'System',
      () => ({ storeyId, assemblyId }),
    );
    expect(() => session.stopStream()).not.toThrow();
  });

  it('ein normaler (nicht abgebrochener) Zug ruft onAborted nie auf', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    let abgebrochenCount = 0;
    const session = new ChatSession(
      new SauberProvider(),
      doc,
      {
        onText: () => {},
        onProposal: () => {},
        onBusy: () => {},
        onError: (e) => {
          throw new Error(e);
        },
        onAborted: () => {
          abgebrochenCount++;
        },
      },
      'System',
      () => ({ storeyId, assemblyId }),
    );
    await session.send('Zeichne eine Wand');
    expect(abgebrochenCount).toBe(0);
  });
});
