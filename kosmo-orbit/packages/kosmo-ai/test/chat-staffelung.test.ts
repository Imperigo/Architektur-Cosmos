import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import { ChatSession, MockProvider, type ReadTool, type ZugRolle } from '../src';

/**
 * v0.8.2/P6 («Staffelung + Kuratier-Flow», `docs/V082-SPEZ.md` §6.7,
 * Owner-Entscheid 3 + C-3/C-11) — der additive `onRolle`-Beobachter von
 * `ChatSession.turn()`. Diese Datei beweist mit dem ECHTEN `MockProvider`
 * (kein Fake-Provider nötig, s. Kopfkommentar `chat-signale.test.ts`), dass
 * fünf der 7 Aufgabenklassen aus einem echten Chat-Zug korrekt hervorgehen
 * (die übrigen zwei — `zusammenfassung`/`journal` — sind Kontext-Flags für
 * Aufrufer AUSSERHALB eines Chat-Zugs, s. `staffelung-klassifikation.test.ts`)
 * UND dass die Ein-Modell-Sitzung ohne `staffelungKonfig` immer
 * `einModellBetrieb: true` meldet (heutiger App-Normalfall, kein Provider-
 * Wechsel). Bestehende `chat-signale.test.ts`/`ai.test.ts` bleiben
 * unverändert — diese Datei ist rein additiv.
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

function bauSession(userText: string, extraReadTools: ReadTool[] = []) {
  const { doc, storeyId, assemblyId } = demoDoc();
  const rollen: ZugRolle[] = [];
  const session = new ChatSession(
    new MockProvider(),
    doc,
    {
      onText: () => {},
      onProposal: () => {},
      onBusy: () => {},
      onError: (e) => {
        throw new Error(e);
      },
      onRolle: (info) => rollen.push(info),
    },
    'System',
    () => ({ storeyId, assemblyId }),
    extraReadTools,
  );
  return { session, rollen, userText };
}

describe('ChatSession — onRolle (v0.8.2/P6 §6.7, additiv) — 5 aus einem echten Zug hervorgehende Klassen', () => {
  it('werkzeug-schreibend: EIN Wand-Vorschlag (MockProvider-Regex) → meister', async () => {
    const { session, rollen } = bauSession('Zeichne eine Wand von 0,0 bis 6,0');
    await session.send('Zeichne eine Wand von 0,0 bis 6,0');
    expect(rollen.map((r) => r.klasse)).toContain('werkzeug-schreibend');
    const treffer = rollen.find((r) => r.klasse === 'werkzeug-schreibend')!;
    expect(treffer.rolle).toBe('meister');
    expect(treffer.einModellBetrieb).toBe(true);
  });

  it('orchestrierung: «Haus»-Paket (6 Tool-Aufrufe im selben Zug) → leiter', async () => {
    const { session, rollen } = bauSession('Baue mir ein Haus');
    await session.send('Baue mir ein Haus');
    expect(rollen).toHaveLength(1); // kein pending>0-Rekursionsfall, EIN Zug
    expect(rollen[0]!.klasse).toBe('orchestrierung');
    expect(rollen[0]!.rolle).toBe('leiter');
  });

  it('chat-standard: gewöhnliche Frage ohne Trigger/Schlüsselwort → leiter', async () => {
    const { session, rollen } = bauSession('Wie ist das Wetter heute?');
    await session.send('Wie ist das Wetter heute?');
    expect(rollen).toHaveLength(1);
    expect(rollen[0]!.klasse).toBe('chat-standard');
    expect(rollen[0]!.rolle).toBe('leiter');
  });

  it('strategie-urteil: Entwurfsfrage mit Schlüsselwort, kein Tool-Aufruf → meister', async () => {
    const { session, rollen } = bauSession(
      'Das ist ein echter Entwurfsentscheid: welche Richtung empfiehlst du für die Fassade?',
    );
    await session.send('Das ist ein echter Entwurfsentscheid: welche Richtung empfiehlst du für die Fassade?');
    expect(rollen).toHaveLength(1);
    expect(rollen[0]!.klasse).toBe('strategie-urteil');
    expect(rollen[0]!.rolle).toBe('meister');
  });

  it('werkzeug-lesend: MockProvider ruft quellen_suchen (als ReadTool registriert) auf → zeichner', async () => {
    const { session, rollen } = bauSession('Was sagen die Grundlagen zu Beton?', [
      {
        name: 'quellen_suchen',
        description: 'Test-Stub',
        parameters: { type: 'object', properties: {} },
        execute: () => 'Keine Belege im Test-Stub.',
      },
    ]);
    await session.send('Was sagen die Grundlagen zu Beton?');
    // Der erste Zug ruft NUR das Lese-Werkzeug auf (kein Vorschlag) — der
    // zweite (rekursive) Zug quittiert das Ergebnis als reinen Text, ohne
    // weiteren Tool-Aufruf. Beide onRolle-Aufrufe sind ehrlich: der erste
    // beweist die werkzeug-lesend-Klassifikation, der zweite ist ein
    // gewöhnlicher Abschluss-Zug (chat-standard).
    expect(rollen.map((r) => r.klasse)).toContain('werkzeug-lesend');
    const treffer = rollen.find((r) => r.klasse === 'werkzeug-lesend')!;
    expect(treffer.rolle).toBe('zeichner');
  });
});

describe('ChatSession — onRolle bleibt optional (bestehende Aufrufer ohne den Hook)', () => {
  it('ein Zug ohne onRolle im events-Objekt bleibt unverändert grün', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const session = new ChatSession(
      new MockProvider(),
      doc,
      { onText: () => {}, onProposal: () => {}, onBusy: () => {}, onError: () => {} },
      'System',
      () => ({ storeyId, assemblyId }),
    );
    await expect(session.send('Zeichne eine Wand von 0,0 bis 6,0')).resolves.toBeUndefined();
  });
});

describe('ChatSession — einModellBetrieb über eine konfigurierte StaffelungKonfig', () => {
  it('mit unterschiedlichen Rollen-Modellen in der Karte ist einModellBetrieb false', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const rollen: ZugRolle[] = [];
    const session = new ChatSession(
      new MockProvider(),
      doc,
      {
        onText: () => {},
        onProposal: () => {},
        onBusy: () => {},
        onError: (e) => {
          throw new Error(e);
        },
        onRolle: (info) => rollen.push(info),
      },
      'System',
      () => ({ storeyId, assemblyId }),
      [],
      '',
      undefined,
      { provider: 'ollama' }, // Standard-Karte: drei verschiedene lokale Modelle
    );
    await session.send('Zeichne eine Wand von 0,0 bis 6,0');
    expect(rollen).toHaveLength(1);
    expect(rollen[0]!.einModellBetrieb).toBe(false);
  });

  it('mit einzelModell (Ein-Modell-Fallback) bleibt einModellBetrieb true', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const rollen: ZugRolle[] = [];
    const session = new ChatSession(
      new MockProvider(),
      doc,
      {
        onText: () => {},
        onProposal: () => {},
        onBusy: () => {},
        onError: (e) => {
          throw new Error(e);
        },
        onRolle: (info) => rollen.push(info),
      },
      'System',
      () => ({ storeyId, assemblyId }),
      [],
      '',
      undefined,
      { provider: 'ollama', einzelModell: 'qwen3-coder:30b' },
    );
    await session.send('Zeichne eine Wand von 0,0 bis 6,0');
    expect(rollen).toHaveLength(1);
    expect(rollen[0]!.einModellBetrieb).toBe(true);
  });
});
