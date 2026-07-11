import { describe, expect, it } from 'vitest';
import { pocheEntscheid, type PocheModus } from '../src/derive/poche';
import {
  KosmoDoc,
  aufgeloesteDarstellung3d,
  empfohlenePlanPhase,
  phaseLabel,
  siaPhaseLabel,
  invertPatches,
  type BauPhase,
  type SiaPhase,
} from '../src/model/doc';
import { execute, CommandError } from '../src/commands/core';
import '../src/commands/design';
import { derivePlan } from '../src/derive/plan';

/**
 * v0.7.0 «Schwarz auf Weiss» (E1 Phasenmodell, E2 Poché-Utility, H-42) —
 * Präzedenz-Matrix + Vertrag von `derive/poche.ts` und die additiven
 * `doc.ts`-Erweiterungen. Der eigentliche Byte-Identitäts-Beweis für
 * `phase === 'werkplan'`/`modus === 'material'` läuft über die 16
 * Alt-Goldens (kernel.test.ts/fenster.test.ts) — hier geht es um die
 * ENTSCHEIDUNGSLOGIK selbst, isoliert und vollständig.
 */

const KLASSEN_LEER = { tragend: false, daemmung: false, projektion: false };
const KLASSEN_TRAGEND = { tragend: true, daemmung: false, projektion: false };
const KLASSEN_DAEMMUNG = { tragend: false, daemmung: true, projektion: false };
const KLASSEN_PROJEKTION = { tragend: false, daemmung: false, projektion: true };

describe('pocheEntscheid — Grundregeln je Phase (modus: phase, Default)', () => {
  it('wettbewerb/vorprojekt: einDeckung=true, ALLE geschnittenen Bauteile schwarz (Grundriss)', () => {
    for (const phase of ['wettbewerb', 'vorprojekt'] as const) {
      for (const klassen of [KLASSEN_TRAGEND, KLASSEN_DAEMMUNG, KLASSEN_LEER]) {
        const e = pocheEntscheid({ phase, modus: 'phase', klassen, kontext: 'grundriss' });
        expect(e.einDeckung).toBe(true);
        expect(e.art).toBe('schwarz');
        expect(e.fill).toBe('#1a1a1a');
        expect(e.schraffurLinien).toBe(false);
      }
      // Projektion (z.B. Treppe über Schnitthöhe) bleibt auch in einDeckung offen
      const proj = pocheEntscheid({ phase, modus: 'phase', klassen: KLASSEN_PROJEKTION, kontext: 'grundriss' });
      expect(proj.art).toBe('none');
      expect(proj.fill).toBeNull();
    }
  });

  it('bauprojekt/baueingabe: einDeckung=false, Schichten schwarz/weiss/grau', () => {
    for (const phase of ['bauprojekt', 'baueingabe'] as const) {
      const tragend = pocheEntscheid({ phase, modus: 'phase', klassen: KLASSEN_TRAGEND, kontext: 'grundriss' });
      expect(tragend.einDeckung).toBe(false);
      expect(tragend.art).toBe('schwarz');
      expect(tragend.fill).toBe('#1a1a1a');

      const daemmung = pocheEntscheid({ phase, modus: 'phase', klassen: KLASSEN_DAEMMUNG, kontext: 'grundriss' });
      expect(daemmung.art).toBe('daemmung');
      expect(daemmung.fill).toBe('#ffffff');

      const nichttragend = pocheEntscheid({ phase, modus: 'phase', klassen: KLASSEN_LEER, kontext: 'grundriss' });
      expect(nichttragend.art).toBe('grau');
      expect(nichttragend.fill).toBe('#c9c9c9');

      const proj = pocheEntscheid({ phase, modus: 'phase', klassen: KLASSEN_PROJEKTION, kontext: 'grundriss' });
      expect(proj.fill).toBeNull();

      // Keine Schraffur in Schwarz-Phasen
      expect(tragend.schraffurLinien).toBe(false);
      expect(daemmung.schraffurLinien).toBe(false);
    }
  });

  it('werkplan: heutiges Material-Verhalten (Grundriss) — Grau/Tint/None, Schraffur an', () => {
    const tragend = pocheEntscheid({ phase: 'werkplan', modus: 'phase', klassen: KLASSEN_TRAGEND, kontext: 'grundriss' });
    expect(tragend.fill).toBe('#c9c9c9');
    expect(tragend.einDeckung).toBe(false);
    expect(tragend.schraffurLinien).toBe(true);

    const daemmung = pocheEntscheid({ phase: 'werkplan', modus: 'phase', klassen: KLASSEN_DAEMMUNG, kontext: 'grundriss' });
    expect(daemmung.fill).toBe('#efefef');

    const proj = pocheEntscheid({ phase: 'werkplan', modus: 'phase', klassen: KLASSEN_PROJEKTION, kontext: 'grundriss' });
    expect(proj.fill).toBeNull();

    const sonst = pocheEntscheid({ phase: 'werkplan', modus: 'phase', klassen: KLASSEN_LEER, kontext: 'grundriss' });
    expect(sonst.art).toBe('tint');
    expect(sonst.fill).toBe('white');
  });
});

describe('pocheEntscheid — modus überschreibt die Phase', () => {
  it("modus 'material' erzwingt das heutige Verhalten in JEDER Phase (auch Wettbewerb)", () => {
    for (const phase of ['wettbewerb', 'vorprojekt', 'bauprojekt', 'baueingabe', 'werkplan'] as const) {
      const e = pocheEntscheid({ phase, modus: 'material', klassen: KLASSEN_TRAGEND, kontext: 'grundriss' });
      expect(e.fill).toBe('#c9c9c9');
      expect(e.einDeckung).toBe(false);
      expect(e.schraffurLinien).toBe(true);
    }
  });

  it("modus 'schwarz' erzwingt die Schwarz-Regeln in JEDER Phase (auch Werkplan)", () => {
    // werkplan + schwarz: keine einDeckung (nur wettbewerb/vorprojekt bekommen die),
    // aber Schichten-Schwarz statt Material-Tönung.
    const e = pocheEntscheid({ phase: 'werkplan', modus: 'schwarz', klassen: KLASSEN_TRAGEND, kontext: 'grundriss' });
    expect(e.einDeckung).toBe(false);
    expect(e.art).toBe('schwarz');
    expect(e.fill).toBe('#1a1a1a');
    expect(e.schraffurLinien).toBe(false);

    const wettbewerb = pocheEntscheid({ phase: 'wettbewerb', modus: 'schwarz', klassen: KLASSEN_LEER, kontext: 'grundriss' });
    expect(wettbewerb.einDeckung).toBe(true);
    expect(wettbewerb.fill).toBe('#1a1a1a');
  });
});

describe('pocheEntscheid — Präzedenz (fix): thema > umbau > Phasen-Schwarz > heutige Tints', () => {
  it('themaFarbe gewinnt IMMER, auch in Schwarz-Phase mit Umbau gesetzt', () => {
    const e = pocheEntscheid({
      phase: 'wettbewerb',
      modus: 'phase',
      klassen: KLASSEN_TRAGEND,
      umbau: 'neu',
      themaFarbe: '#00ff00',
      kontext: 'grundriss',
    });
    expect(e.art).toBe('thema');
    expect(e.fill).toBe('#00ff00');
  });

  it('Umbau gewinnt über Phasen-Schwarz (SIA 400 B.8.11 bleibt auch im Baugesuch sichtbar)', () => {
    const neu = pocheEntscheid({ phase: 'wettbewerb', modus: 'phase', klassen: KLASSEN_TRAGEND, umbau: 'neu', kontext: 'grundriss' });
    expect(neu.art).toBe('umbau');
    expect(neu.fill).toBe('#e9c8c5');

    const abbruch = pocheEntscheid({ phase: 'baueingabe', modus: 'phase', klassen: KLASSEN_TRAGEND, umbau: 'abbruch', kontext: 'grundriss' });
    expect(abbruch.fill).toBe('#f3e29b');
    // Abbruch bleibt gelb, auch bei Projektion (Bestandsverhalten unverändert)
    const abbruchProj = pocheEntscheid({ phase: 'baueingabe', modus: 'phase', klassen: KLASSEN_PROJEKTION, umbau: 'abbruch', kontext: 'grundriss' });
    expect(abbruchProj.fill).toBe('#f3e29b');

    const bestand = pocheEntscheid({ phase: 'werkplan', modus: 'phase', klassen: KLASSEN_TRAGEND, umbau: 'bestand', kontext: 'grundriss' });
    expect(bestand.fill).toBe('#c9c9c9');
  });

  it('Umbau + Projektion: Neu/Bestand respektieren "keine Füllung", Abbruch nicht (Bestandsverhalten)', () => {
    const neuProj = pocheEntscheid({ phase: 'werkplan', modus: 'phase', klassen: KLASSEN_PROJEKTION, umbau: 'neu', kontext: 'grundriss' });
    expect(neuProj.fill).toBeNull();
    const bestandProj = pocheEntscheid({ phase: 'werkplan', modus: 'phase', klassen: KLASSEN_PROJEKTION, umbau: 'bestand', kontext: 'grundriss' });
    expect(bestandProj.fill).toBeNull();
  });
});

describe('pocheEntscheid — kontext "schnitt" (Material-Tint via schraffurFuer)', () => {
  it('Werkplan/material: Tint kommt aus schraffurFuer(material) — Beton hat einen Tint', () => {
    const e = pocheEntscheid({
      phase: 'werkplan',
      modus: 'phase',
      material: 'beton',
      klassen: KLASSEN_TRAGEND,
      kontext: 'schnitt',
    });
    expect(e.art).toBe('tint');
    expect(e.fill).toBe('#dad7d1');
    expect(e.schraffurLinien).toBe(true);
  });

  it('Werkplan/material: Mauerwerk hat keinen Tint (art none, fill null)', () => {
    const e = pocheEntscheid({
      phase: 'werkplan',
      modus: 'phase',
      material: 'mauerwerk',
      klassen: KLASSEN_TRAGEND,
      kontext: 'schnitt',
    });
    expect(e.art).toBe('none');
    expect(e.fill).toBeNull();
  });

  it('Schwarz-Phase (Schnitt): einDeckung erzwingt Schwarz unabhängig vom Material', () => {
    const e = pocheEntscheid({
      phase: 'vorprojekt',
      modus: 'phase',
      material: 'irgendwas-unbekanntes',
      klassen: KLASSEN_LEER,
      kontext: 'schnitt',
    });
    expect(e.einDeckung).toBe(true);
    expect(e.art).toBe('schwarz');
    expect(e.fill).toBe('#1a1a1a');
  });

  it('Schwarz-Phase (Schnitt), Schichten: tragend schwarz, Dämmung weiss, sonst grau', () => {
    const tragend = pocheEntscheid({ phase: 'baueingabe', modus: 'phase', material: 'beton', klassen: KLASSEN_TRAGEND, kontext: 'schnitt' });
    expect(tragend.fill).toBe('#1a1a1a');
    const daemmung = pocheEntscheid({ phase: 'baueingabe', modus: 'phase', material: 'daemmung-mw', klassen: KLASSEN_DAEMMUNG, kontext: 'schnitt' });
    expect(daemmung.fill).toBe('#ffffff');
    const putz = pocheEntscheid({ phase: 'baueingabe', modus: 'phase', material: 'putz', klassen: KLASSEN_LEER, kontext: 'schnitt' });
    expect(putz.fill).toBe('#c9c9c9');
  });
});

describe('pocheEntscheid — einDeckung/schraffurLinien Wahrheitstabelle', () => {
  const phasen: BauPhase[] = ['wettbewerb', 'vorprojekt', 'bauprojekt', 'baueingabe', 'werkplan'];
  const modi: PocheModus[] = ['phase', 'schwarz', 'material'];

  it('einDeckung nur bei modus!=material UND (wettbewerb|vorprojekt) effektiv aktiv', () => {
    for (const phase of phasen) {
      for (const modus of modi) {
        const e = pocheEntscheid({ phase, modus, klassen: KLASSEN_LEER, kontext: 'grundriss' });
        const erwartet =
          modus !== 'material' && (phase === 'wettbewerb' || phase === 'vorprojekt');
        expect(e.einDeckung, `phase=${phase} modus=${modus}`).toBe(erwartet);
      }
    }
  });

  it("schraffurLinien nur bei modus 'material' ODER (modus 'phase' UND werkplan)", () => {
    for (const phase of phasen) {
      for (const modus of modi) {
        const e = pocheEntscheid({ phase, modus, klassen: KLASSEN_LEER, kontext: 'grundriss' });
        const erwartet = modus === 'material' || (modus === 'phase' && phase === 'werkplan');
        expect(e.schraffurLinien, `phase=${phase} modus=${modus}`).toBe(erwartet);
      }
    }
  });
});

describe('doc.ts — BauPhase additiv (E1)', () => {
  it('phaseLabel deckt alle 5 Werte mit den Konzept-Labels ab', () => {
    expect(phaseLabel('wettbewerb')).toBe('Wettbewerb (SIA 22)');
    expect(phaseLabel('vorprojekt')).toBe('Vorprojekt (SIA 31)');
    expect(phaseLabel('bauprojekt')).toBe('Bauprojekt (SIA 32)');
    expect(phaseLabel('baueingabe')).toBe('Baueingabe (SIA 33)');
    expect(phaseLabel('werkplan')).toBe('Werkplan (SIA 51)');
  });

  it("siaPhaseLabel('bewilligung') ist geschärft auf «Baueingabe (SIA 33)»", () => {
    expect(siaPhaseLabel('bewilligung')).toBe('Baueingabe (SIA 33)');
  });

  it('empfohlenePlanPhase folgt dem 6-Stufen-Mapping', () => {
    const erwartet: Record<SiaPhase, BauPhase> = {
      // v0.7.2: 'strategie' additiv (SIA 112 Ph. 1) — erforderliche Ergänzung
      // dieses `Record<SiaPhase, …>`-Literals, sonst TS-Fehler (kein Golden-
      // Bezug, reine Typvollständigkeit).
      strategie: 'wettbewerb',
      wettbewerb: 'wettbewerb',
      vorprojekt: 'vorprojekt',
      bauprojekt: 'bauprojekt',
      bewilligung: 'baueingabe',
      ausschreibung: 'werkplan',
      ausfuehrung: 'werkplan',
      abnahme: 'werkplan',
    };
    for (const [sia, plan] of Object.entries(erwartet) as [SiaPhase, BauPhase][]) {
      expect(empfohlenePlanPhase(sia)).toBe(plan);
    }
  });

  it('Defaults bleiben unverändert: phase=werkplan, siaPhase=wettbewerb, neue Settings abwesend', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.phase).toBe('werkplan');
    expect(doc.settings.siaPhase).toBe('wettbewerb');
    expect(doc.settings.pocheModus).toBeUndefined();
    expect(doc.settings.darstellung3d).toBeUndefined();
    expect(doc.settings.fensterBoegen).toBeUndefined();
  });
});

describe('aufgeloesteDarstellung3d (E3)', () => {
  it("'auto' (Abwesenheit) löst bis 'bewilligung' auf weiss, ab 'ausschreibung' auf material", () => {
    const doc = new KosmoDoc();
    for (const sia of ['wettbewerb', 'vorprojekt', 'bauprojekt', 'bewilligung'] as const) {
      doc.settings.siaPhase = sia;
      expect(aufgeloesteDarstellung3d(doc.settings)).toBe('weiss');
    }
    for (const sia of ['ausschreibung', 'ausfuehrung', 'abnahme'] as const) {
      doc.settings.siaPhase = sia;
      expect(aufgeloesteDarstellung3d(doc.settings)).toBe('material');
    }
  });

  it('explizite Werte (material/weiss/schwarz) übersteuern auto direkt', () => {
    const doc = new KosmoDoc();
    doc.settings.siaPhase = 'ausfuehrung'; // wäre sonst 'material'
    doc.settings.darstellung3d = 'schwarz';
    expect(aufgeloesteDarstellung3d(doc.settings)).toBe('schwarz');
    doc.settings.darstellung3d = 'weiss';
    expect(aufgeloesteDarstellung3d(doc.settings)).toBe('weiss');
  });
});

describe('Commands: design.pocheModusSetzen / design.darstellung3dSetzen / design.fensterBoegenSetzen', () => {
  // Schmal-Patch-Präzedenz (design.schnittSetzen): `before` speichert den
  // AUFGELÖSTEN Default (Abwesenheit → 'phase'/'auto'/true), nicht `undefined`
  // — anders als bei `schnitt` gibt es hier keinen `null`-Wert im Typ, der
  // echte Abwesenheit trüge. Nach dem Undo steht also explizit der
  // Default-Wert im Doc, nicht der abwesende Schlüssel — JEDE Leseseite
  // (`doc.settings.x ?? default`) behandelt beides identisch, verhaltens-
  // gleich zur echten Abwesenheit.
  it('pocheModusSetzen setzt und undoet auf den aufgelösten Default (Schmal-Patch)', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.pocheModus).toBeUndefined();
    const res = execute(doc, 'design.pocheModusSetzen', { pocheModus: 'schwarz' });
    expect(doc.settings.pocheModus).toBe('schwarz');
    expect(res.summary).toContain('schwarz');
    doc.apply(invertPatches(res.patches));
    expect(doc.settings.pocheModus).toBe('phase');
  });

  it('darstellung3dSetzen setzt und undoet auf den aufgelösten Default (Schmal-Patch)', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.darstellung3d).toBeUndefined();
    const res = execute(doc, 'design.darstellung3dSetzen', { darstellung3d: 'weiss' });
    expect(doc.settings.darstellung3d).toBe('weiss');
    doc.apply(invertPatches(res.patches));
    expect(doc.settings.darstellung3d).toBe('auto');
  });

  it('fensterBoegenSetzen setzt und undoet auf den aufgelösten Default (Schmal-Patch)', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.fensterBoegen).toBeUndefined();
    const res = execute(doc, 'design.fensterBoegenSetzen', { fensterBoegen: false });
    expect(doc.settings.fensterBoegen).toBe(false);
    expect(res.summary).toContain('aus');
    doc.apply(invertPatches(res.patches));
    expect(doc.settings.fensterBoegen).toBe(true);
  });

  it('unbekannte pocheModus/darstellung3d-Werte werden abgelehnt', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'design.pocheModusSetzen', { pocheModus: 'bunt' })).toThrow(CommandError);
    expect(() => execute(doc, 'design.darstellung3dSetzen', { darstellung3d: 'bunt' })).toThrow(CommandError);
  });

  it('design.phaseSetzen akzeptiert jetzt auch wettbewerb/baueingabe', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.phaseSetzen', { phase: 'wettbewerb' });
    expect(doc.settings.phase).toBe('wettbewerb');
    execute(doc, 'design.phaseSetzen', { phase: 'baueingabe' });
    expect(doc.settings.phase).toBe('baueingabe');
  });
});

describe('H-42: Öffnungsflügel-Bogen abschaltbar (fensterBoegen)', () => {
  function haus() {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'AW', target: 'wall',
      layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    const assemblyId = (aufbau.patches[0] as { id: string }).id;
    const w = execute(doc, 'design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 4000, y: 0 }, assemblyId });
    const wallId = (w.patches[0] as { id: string }).id;
    const oeffnung = execute(doc, 'design.oeffnungSetzen', {
      wallId, openingType: 'fenster', center: 2000, width: 1200, height: 1400, sill: 900,
    });
    const openingId = (oeffnung.patches[0] as { id: string }).id;
    execute(doc, 'design.fensterParametrieren', { openingId, fensterTyp: 'einfluegel' });
    return { doc, storeyId };
  }

  it('Default (Abwesenheit): Bogen wird gezeichnet (Bestandsverhalten)', () => {
    const { doc, storeyId } = haus();
    const plan = derivePlan(doc, storeyId);
    expect(plan.arcs.some((a) => a.classes.includes('fenster-bogen'))).toBe(true);
  });

  it('fensterBoegen=false: Bogen entfällt, Teilungslinien/Fenstersymbol bleiben', () => {
    const { doc, storeyId } = haus();
    execute(doc, 'design.fensterBoegenSetzen', { fensterBoegen: false });
    const plan = derivePlan(doc, storeyId);
    expect(plan.arcs.some((a) => a.classes.includes('fenster-bogen'))).toBe(false);
    expect(plan.lines.some((l) => l.classes.includes('fenster'))).toBe(true);
  });

  it('fensterBoegen=true explizit: identisch zum Default', () => {
    const { doc, storeyId } = haus();
    execute(doc, 'design.fensterBoegenSetzen', { fensterBoegen: true });
    const plan = derivePlan(doc, storeyId);
    expect(plan.arcs.some((a) => a.classes.includes('fenster-bogen'))).toBe(true);
  });
});
