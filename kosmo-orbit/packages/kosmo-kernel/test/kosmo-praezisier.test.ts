import { describe, expect, it } from 'vitest';
import {
  KosmoDoc,
  execute,
  CommandError,
  invertPatches,
  type Zone,
  type ZonenTuer,
  type Opening,
} from '../src';

/**
 * V2-E5-iv (`docs/V070-KONZEPT.md`, Finch-«Archie»-Äquivalent,
 * `docs/RE-FINCH.md` §1): drei deterministische Kernel-Commands statt eines
 * neuen LLM — «repetitive Präzisionsarbeit»: Türplatzierung, Compliance-
 * Checks, verkettete Wohnungstyp-Updates.
 *
 * Command-Vertrag (`core.ts`): `summarize` läuft bei einem ECHTEN,
 * anwendenden `execute()`-Aufruf NACH `doc.apply()` — bei diesen drei
 * Commands würde ein Neu-Berechnen der «Kandidaten» auf dem BEREITS
 * gefixten Doc naturgemäss «nichts mehr zu tun» finden (dasselbe bekannte
 * Verhalten wie `design.geschossErstellen`, s. dessen H-38-Kommentar in
 * `commands/design.ts`). Die «N ergänzt»-Texte, die die Diff-Karte dem
 * Menschen zeigt, entstehen in der echten App über `execute(doc, id,
 * params, { dryRun: true })` (bzw. `validateToolCall`, `kosmo-ai/src/
 * tools.ts`) auf dem UNVERÄNDERTEN Doc — genau das prüfen die Tests unten,
 * bevor sie ein zweites Mal ECHT ausführen, um die Patches/das Undo zu
 * beweisen.
 */

function neuesGeschoss(doc: KosmoDoc) {
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  return (eg.patches[0] as { id: string }).id;
}

describe('design.tuerenPlatzieren (Kosmo-Präzisier 1/3)', () => {
  function korridorPlusZimmer(doc: KosmoDoc, storeyId: string) {
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Korridor',
      sia: 'VF',
      raumTyp: 'korridor',
      outline: [
        { x: 0, y: 0 },
        { x: 2000, y: 0 },
        { x: 2000, y: 6000 },
        { x: 0, y: 6000 },
      ],
    });
    const zimmer = execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Zimmer 1',
      sia: 'HNF',
      raumTyp: 'zimmer',
      outline: [
        { x: 2000, y: 0 },
        { x: 6000, y: 0 },
        { x: 6000, y: 6000 },
        { x: 2000, y: 6000 },
      ],
    });
    return (zimmer.patches[0] as { id: string }).id;
  }

  it('Zimmer ohne Tür zum Korridor: Diff-Karten-Vorschau (dryRun, unverändertes Doc) nennt genau 1 ergänzte Tür', () => {
    const doc = new KosmoDoc();
    const storeyId = neuesGeschoss(doc);
    korridorPlusZimmer(doc, storeyId);

    const vorschau = execute(doc, 'design.tuerenPlatzieren', { storeyId }, { dryRun: true });
    expect(vorschau.summary).toBe('1 Tür ergänzt (Zimmer 1↔Korridor), 0 Räume bereits erschlossen');
    expect(vorschau.patches).toHaveLength(1);
    // dryRun: das Doc bleibt unangetastet
    expect(doc.byKind<ZonenTuer>('zonentuer')).toHaveLength(0);
  });

  it('echtes Anwenden setzt die Zonentür (Standardbreite 900, kein Bestand) mittig auf die gemeinsame Kante', () => {
    const doc = new KosmoDoc();
    const storeyId = neuesGeschoss(doc);
    korridorPlusZimmer(doc, storeyId);

    const r = execute(doc, 'design.tuerenPlatzieren', { storeyId });
    const tueren = doc.byKind<ZonenTuer>('zonentuer');
    expect(tueren).toHaveLength(1);
    expect(tueren[0]!.breite).toBe(900);
    expect(tueren[0]!.at).toEqual({ x: 2000, y: 3000 }); // Mitte der gemeinsamen Kante x=2000, y 0..6000
    expect(r.patches).toHaveLength(1);
  });

  it('zweiter Lauf auf demselben Geschoss: ehrliches No-op («bereits erschlossen»), keine zweite Tür', () => {
    const doc = new KosmoDoc();
    const storeyId = neuesGeschoss(doc);
    korridorPlusZimmer(doc, storeyId);
    execute(doc, 'design.tuerenPlatzieren', { storeyId });
    expect(doc.byKind<ZonenTuer>('zonentuer')).toHaveLength(1);

    const vorschau2 = execute(doc, 'design.tuerenPlatzieren', { storeyId }, { dryRun: true });
    expect(vorschau2.patches).toHaveLength(0);
    expect(vorschau2.summary).toBe('Keine Türen ergänzt — 1 Raum bereits erschlossen');
  });

  it('Raum ganz ohne begehbare Kante (rundum Wand, keine Lücke ≥ 60 cm): ehrlich als «ohne Kandidat» ausgewiesen, keine erfundene Tür', () => {
    const doc = new KosmoDoc();
    const storeyId = neuesGeschoss(doc);
    // Isolierte Zone, kein Nachbar in Reichweite (2 m Lücke zur Korridor-Zone)
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Korridor',
      sia: 'VF',
      raumTyp: 'korridor',
      outline: [
        { x: 0, y: 0 },
        { x: 2000, y: 0 },
        { x: 2000, y: 6000 },
        { x: 0, y: 6000 },
      ],
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Zimmer Isoliert',
      sia: 'HNF',
      raumTyp: 'zimmer',
      outline: [
        { x: 4000, y: 0 },
        { x: 8000, y: 0 },
        { x: 8000, y: 6000 },
        { x: 4000, y: 6000 },
      ],
    });
    const vorschau = execute(doc, 'design.tuerenPlatzieren', { storeyId }, { dryRun: true });
    expect(vorschau.patches).toHaveLength(0);
    expect(vorschau.summary).toContain('ohne begehbare Kante');
    expect(vorschau.summary).toContain('manuell prüfen');
  });

  it('Korridor-Nachbar gewinnt gegenüber einer längeren Kante zu einem Nicht-Korridor-Nachbarn', () => {
    const doc = new KosmoDoc();
    const storeyId = neuesGeschoss(doc);
    // Bad hat eine LANGE Kante zu Küche (8 m) und eine KURZE Kante zum Korridor (2 m) —
    // Korridor muss trotzdem gewinnen (Erschliessung vor reiner Geometrie).
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Korridor',
      sia: 'VF',
      raumTyp: 'korridor',
      outline: [
        { x: 0, y: 0 },
        { x: 2000, y: 0 },
        { x: 2000, y: 2000 },
        { x: 0, y: 2000 },
      ],
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Küche',
      sia: 'HNF',
      raumTyp: 'kueche',
      outline: [
        { x: 2000, y: 0 },
        { x: 2000, y: 8000 },
        { x: 6000, y: 8000 },
        { x: 6000, y: 0 },
      ],
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Bad',
      sia: 'HNF',
      raumTyp: 'bad',
      outline: [
        { x: 0, y: 2000 },
        { x: 2000, y: 2000 },
        { x: 2000, y: 8000 },
        { x: 0, y: 8000 },
      ],
    });
    const vorschau = execute(doc, 'design.tuerenPlatzieren', { storeyId }, { dryRun: true });
    expect(vorschau.summary).toContain('Bad↔Korridor');
    expect(vorschau.summary).not.toContain('Bad↔Küche');
  });

  it('ist ein Undo-Schritt (ein execute()-Aufruf, ein invertierbares Patch-Bündel)', () => {
    const doc = new KosmoDoc();
    const storeyId = neuesGeschoss(doc);
    korridorPlusZimmer(doc, storeyId);
    const r = execute(doc, 'design.tuerenPlatzieren', { storeyId });
    expect(doc.byKind<ZonenTuer>('zonentuer')).toHaveLength(1);
    doc.apply(invertPatches(r.patches));
    expect(doc.byKind<ZonenTuer>('zonentuer')).toHaveLength(0);
  });

  it('ist als Kosmo-Tool sichtbar', async () => {
    const { allCommands } = await import('../src');
    const cmd = allCommands().find((c) => c.id === 'design.tuerenPlatzieren');
    expect(cmd).toBeDefined();
  });
});

describe('design.komplianzFixes (Kosmo-Präzisier 2/3)', () => {
  /**
   * Bewusst ZWEI unabhängige Befunde: ein «Schmales Zimmer» (2.0 m breit,
   * < 2.40 m Richtwert → NICHT automatisierbar, Zimmerbreite verlangt einen
   * Entwurfsentscheid) und eine zu schmale Tür (700 mm < 800 mm SIA-500-
   * Minimum auf einer separaten Wand mit genug Reserve → automatisierbar,
   * Feld-Bump auf 800 mm). Kein Treppenhaus/keine Zone mit Raumtyp
   * «treppenhaus» in der Fixture — der Fluchtweg-Check prüft dann laut
   * `checks.ts` (`zielVorhanden`-Guard) gar nicht erst, was hier bewusst
   * ist: der «fluchtweg»-Befund ist ohnehin NIE automatisierbar (s. Kommentar
   * bei `KOMPLIANZ_AUTOFIX_REGELN`, `commands/design.ts`) und würde die
   * «manuell»-Zählung nur unnötig aufblähen.
   */
  function grundrissMitZweiBefunden(doc: KosmoDoc) {
    const storeyId = neuesGeschoss(doc);
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'IW 15',
      target: 'wall',
      layers: [{ material: 'kalksandstein', thickness: 150, function: 'tragend' }],
    });
    const assemblyId = (aufbau.patches[0] as { id: string }).id;
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Schmales Zimmer',
      sia: 'HNF',
      raumTyp: 'zimmer',
      outline: [
        { x: 0, y: 0 },
        { x: 2000, y: 0 }, // 2.0 m breit < 2.40 m Richtwert → «Zimmerbreite» (manuell)
        { x: 2000, y: 4000 },
        { x: 0, y: 4000 },
      ],
    });
    // Eine zu schmale Tür (< 800 mm) auf einer separaten Wand — automatisch
    // behebbar (Feld-Bump auf 800 mm), Wand hat genug Reserve für 800 mm.
    const wand = execute(doc, 'design.wandZeichnen', {
      storeyId,
      assemblyId,
      a: { x: 10000, y: 0 },
      b: { x: 13000, y: 0 },
    });
    const tuer = execute(doc, 'design.oeffnungSetzen', {
      wallId: (wand.patches[0] as { id: string }).id,
      openingType: 'tuer',
      center: 1500,
      width: 700,
      height: 2100,
      sill: 0,
    });
    return { storeyId, tuerId: (tuer.patches[0] as { id: string }).id };
  }

  it('fixt die zu schmale Tür automatisch, listet die Zimmerbreite ehrlich manuell', () => {
    const doc = new KosmoDoc();
    const { storeyId } = grundrissMitZweiBefunden(doc);

    const vorschau = execute(doc, 'design.komplianzFixes', { storeyId }, { dryRun: true });
    expect(vorschau.summary).toContain('Fix');
    expect(vorschau.summary).toContain('Türbreite');
    expect(vorschau.summary).toContain('manuell:');
    expect(vorschau.summary).toContain('Zimmerbreite');
    expect(vorschau.patches).toHaveLength(1); // NUR die Tür — Zimmerbreite bleibt unangetastet

    const r = execute(doc, 'design.komplianzFixes', { storeyId });
    expect(r.patches).toHaveLength(1);

    const opening = doc.byKind<Opening>('opening').find((o) => o.openingType === 'tuer' && o.width === 800);
    expect(opening).toBeDefined();

    // Die schmale Zimmerbreite bleibt unverändert (kein Fix ohne Entwurfsentscheid)
    const zimmer = doc.byKind<Zone>('zone').find((z) => z.name === 'Schmales Zimmer')!;
    expect(zimmer.outline.some((p) => p.x === 2000)).toBe(true);
  });

  it('nur: [\'tuerbreite\'] beschränkt die Prüfung — die Zimmerbreite taucht dann gar nicht erst als Befund auf', () => {
    const doc = new KosmoDoc();
    const { storeyId } = grundrissMitZweiBefunden(doc);
    const vorschau = execute(doc, 'design.komplianzFixes', { storeyId, nur: ['tuerbreite'] }, { dryRun: true });
    expect(vorschau.summary).not.toContain('manuell');
    const r = execute(doc, 'design.komplianzFixes', { storeyId, nur: ['tuerbreite'] });
    expect(r.patches).toHaveLength(1);
    const opening = doc.byKind<Opening>('opening').find((o) => o.openingType === 'tuer' && o.width === 800);
    expect(opening).toBeDefined();
  });

  it('0 Befunde: ehrliches No-op statt erfundener Fixes', () => {
    const doc = new KosmoDoc();
    const storeyId = neuesGeschoss(doc);
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Alles ok',
      sia: 'NNF',
      outline: [
        { x: 0, y: 0 },
        { x: 5000, y: 0 },
        { x: 5000, y: 5000 },
        { x: 0, y: 5000 },
      ],
    });
    const r = execute(doc, 'design.komplianzFixes', { storeyId }, { dryRun: true });
    expect(r.patches).toHaveLength(0);
    expect(r.summary).toBe('Keine Befunde — Grundriss-Check ist sauber.');
  });

  it('ist ein Undo-Schritt (mehrere Fixes in einem invertierbaren Bündel)', () => {
    const doc = new KosmoDoc();
    const { storeyId } = grundrissMitZweiBefunden(doc);
    const vorher = doc.entities.size;
    const r = execute(doc, 'design.komplianzFixes', { storeyId });
    expect(r.patches.length).toBeGreaterThan(0);
    doc.apply(invertPatches(r.patches));
    expect(doc.entities.size).toBe(vorher);
  });

  it('ist als Kosmo-Tool sichtbar', async () => {
    const { allCommands } = await import('../src');
    const cmd = allCommands().find((c) => c.id === 'design.komplianzFixes');
    expect(cmd).toBeDefined();
  });
});

describe('design.einheitTypAktualisieren (Kosmo-Präzisier 3/3)', () => {
  function raumprogrammMitZweiWohnungen(doc: KosmoDoc) {
    const storeyId = neuesGeschoss(doc);
    execute(doc, 'design.raumprogrammSetzen', { posten: [{ typ: 'preisguenstig', hnfSoll: 150 }] });
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Whg 1 (preisguenstig)',
      sia: 'HNF',
      program: 'preisguenstig',
      outline: [
        { x: 0, y: 0 },
        { x: 5000, y: 0 },
        { x: 5000, y: 5000 },
        { x: 0, y: 5000 },
      ],
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Whg 2 (preisguenstig)',
      sia: 'HNF',
      program: 'preisguenstig',
      outline: [
        { x: 5000, y: 0 },
        { x: 10000, y: 0 },
        { x: 10000, y: 5000 },
        { x: 5000, y: 5000 },
      ],
    });
    return storeyId;
  }

  it('neuerTyp benennt Raumprogramm-Posten UND alle verknüpften Zonen (program + Name) um — 2 Zonen, 1 Undo', () => {
    const doc = new KosmoDoc();
    raumprogrammMitZweiWohnungen(doc);
    const r = execute(doc, 'design.einheitTypAktualisieren', {
      typ: 'preisguenstig',
      aenderung: { neuerTyp: 'guenstig-2026' },
    });
    const zonen = doc.byKind<Zone>('zone').filter((z) => z.program === 'guenstig-2026');
    expect(zonen).toHaveLength(2);
    expect(zonen.map((z) => z.name).sort()).toEqual(['Whg 1 (guenstig-2026)', 'Whg 2 (guenstig-2026)']);
    expect(doc.byKind<Zone>('zone').filter((z) => z.program === 'preisguenstig')).toHaveLength(0);
    expect(doc.settings.raumprogramm).toEqual([{ typ: 'guenstig-2026', hnfSoll: 150 }]);

    doc.apply(invertPatches(r.patches));
    expect(doc.byKind<Zone>('zone').filter((z) => z.program === 'preisguenstig')).toHaveLength(2);
    expect(doc.settings.raumprogramm).toEqual([{ typ: 'preisguenstig', hnfSoll: 150 }]);
  });

  it('zielgroesseM2 passt NUR das Raumprogramm-Soll an (Zielgrösse × bestehende Einheiten) — Geometrie unangetastet', () => {
    const doc = new KosmoDoc();
    raumprogrammMitZweiWohnungen(doc);
    const vorAusserdem = doc.byKind<Zone>('zone').map((z) => ({ ...z }));

    const vorschau = execute(
      doc,
      'design.einheitTypAktualisieren',
      { typ: 'preisguenstig', aenderung: { zielgroesseM2: 80 } },
      { dryRun: true },
    );
    expect(vorschau.summary).toContain('160 m²'); // 2 Einheiten × 80 m²
    expect(vorschau.summary).toContain('Geometrie unverändert');

    execute(doc, 'design.einheitTypAktualisieren', { typ: 'preisguenstig', aenderung: { zielgroesseM2: 80 } });
    expect(doc.settings.raumprogramm).toEqual([{ typ: 'preisguenstig', hnfSoll: 160 }]);
    // Zonen-Geometrie/Name/Program unverändert — v1 segmentiert nicht neu
    const nachher = doc.byKind<Zone>('zone');
    for (const z of vorAusserdem) {
      const gleich = nachher.find((n) => n.id === z.id)!;
      expect(gleich.outline).toEqual(z.outline);
      expect(gleich.name).toBe(z.name);
    }
  });

  it('unbekannter Typ (weder Raumprogramm noch Zonen): ehrlicher CommandError', () => {
    const doc = new KosmoDoc();
    raumprogrammMitZweiWohnungen(doc);
    expect(() =>
      execute(doc, 'design.einheitTypAktualisieren', { typ: 'gibtsnicht', aenderung: { zielgroesseM2: 50 } }),
    ).toThrow(CommandError);
  });

  it('neuerTyp kollidiert mit bestehendem Raumprogramm-Posten: CommandError statt stillem Merge', () => {
    const doc = new KosmoDoc();
    const storeyId = raumprogrammMitZweiWohnungen(doc);
    execute(doc, 'design.raumprogrammSetzen', {
      posten: [
        { typ: 'preisguenstig', hnfSoll: 150 },
        { typ: 'marktgerecht', hnfSoll: 100 },
      ],
    });
    expect(() =>
      execute(doc, 'design.einheitTypAktualisieren', {
        typ: 'preisguenstig',
        aenderung: { neuerTyp: 'marktgerecht' },
      }),
    ).toThrow(CommandError);
    void storeyId;
  });

  it('weder neuerTyp noch zielgroesseM2: ehrlicher CommandError statt No-op', () => {
    const doc = new KosmoDoc();
    raumprogrammMitZweiWohnungen(doc);
    expect(() =>
      execute(doc, 'design.einheitTypAktualisieren', { typ: 'preisguenstig', aenderung: {} }),
    ).toThrow(CommandError);
  });

  it('ist als Kosmo-Tool sichtbar', async () => {
    const { allCommands } = await import('../src');
    const cmd = allCommands().find((c) => c.id === 'design.einheitTypAktualisieren');
    expect(cmd).toBeDefined();
  });
});
