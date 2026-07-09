import { describe, expect, it } from 'vitest';
import {
  ARBEITSMODI,
  AMTIERENDER_BONUS,
  HYSTERESE_MS,
  begruendeModus,
  bewerteModi,
  entscheideModus,
  sichtbaresSet,
  type Arbeitsmodus,
  type ModusSignale,
} from '../src/state/arbeitsmodi-kern';

/**
 * v0.6.6 BEWEGUNGSKONZEPT §2/§3 — Arbeitsmodi-Kern. Reine Funktionen, keine
 * localStorage-/DOM-Abhängigkeit (anders als `oberflaeche-adaption-kern.test.ts`
 * braucht diese Suite darum kein `localStorage.clear()`).
 */

function hoechsterModus(scores: Record<Arbeitsmodus, number>): Arbeitsmodus {
  return ARBEITSMODI.reduce((best, m) => (scores[m] > scores[best] ? m : best), ARBEITSMODI[0]!);
}

describe('bewerteModi — Matrix-Fälle je Modus (Konzept §2-Tabelle)', () => {
  it('2D-Plan + Wandwerkzeug + Werkplan-Phase → Zeichnen gewinnt', () => {
    const signale: ModusSignale = { tool: 'wand', viewMode: '2d', siaPhase: 'ausfuehrung' };
    const scores = bewerteModi(signale);
    expect(hoechsterModus(scores)).toBe('zeichnen');
    expect(begruendeModus('zeichnen', signale)).toEqual(
      expect.arrayContaining(['2D-Plan aktiv', 'Zeichenwerkzeug aktiv (Wand/Treppe/Stütze/Bemassung)', 'Werkplan-Phase (SIA 51/52)']),
    );
  });

  it('Stift-Pointer → iPad-Skizzieren gewinnt, auch ohne Skizzier-Werkzeug', () => {
    const scores = bewerteModi({ pointerType: 'pen', viewMode: '2d' });
    expect(hoechsterModus(scores)).toBe('skizzieren');
  });

  it('Skizzier-Werkzeug allein reicht ebenfalls für Skizzieren', () => {
    const scores = bewerteModi({ tool: 'skizze' });
    expect(hoechsterModus(scores)).toBe('skizzieren');
  });

  it('Volumen-/Zonen-Werkzeug + 3D + frühe SIA-Phase → Entwerfen gewinnt', () => {
    const scores = bewerteModi({ tool: 'zone', viewMode: '3d', siaPhase: 'vorprojekt' });
    expect(hoechsterModus(scores)).toBe('entwerfen');
  });

  it('Mesh-Werkzeug → 3D modellieren gewinnt', () => {
    const scores = bewerteModi({ tool: 'mesh', viewMode: '3d' });
    expect(hoechsterModus(scores)).toBe('modellieren');
  });

  it('Volumenstudien-/Varianten-Panel offen → Varianten vergleichen gewinnt', () => {
    const scores = bewerteModi({ offenePanels: ['studieOffen'] });
    expect(hoechsterModus(scores)).toBe('vergleichen');
  });

  it('Publish-Station + Export-Menü offen → PDF exportieren gewinnt', () => {
    const scores = bewerteModi({ station: 'publish', offenePanels: ['exportMenuOffen'] });
    expect(hoechsterModus(scores)).toBe('exportieren');
  });

  it('KosmoVis-Station → Ideen entwickeln gewinnt (0.6.7-Feinrollout vertagt, grobe Stationszuordnung reicht heute)', () => {
    const scores = bewerteModi({ station: 'vis' });
    expect(hoechsterModus(scores)).toBe('ideen');
  });

  it('KosmoData-Station + Such-Command → Recherchieren gewinnt', () => {
    const scores = bewerteModi({ station: 'data', letzteCommands: ['suche'] });
    expect(hoechsterModus(scores)).toBe('recherchieren');
  });

  it('KosmoData-Station + Formular-Command → Daten erfassen gewinnt', () => {
    const scores = bewerteModi({ station: 'data', letzteCommands: ['formular'] });
    expect(hoechsterModus(scores)).toBe('erfassen');
  });

  it('keine Signale → alle Scores 0 (kein Modus gewinnt automatisch)', () => {
    const scores = bewerteModi({});
    for (const m of ARBEITSMODI) expect(scores[m]).toBe(0);
  });
});

describe('entscheideModus — Hysterese (kein Flackern)', () => {
  it('Neutral-Start: ohne amtierenden Modus und ohne Signal bleibt es Neutral (undefined)', () => {
    const scores = bewerteModi({});
    expect(entscheideModus(undefined, scores, 999_999)).toBeUndefined();
  });

  it('Neutral-Start: starkes Signal, aber noch nicht stabil (< 5000ms) → bleibt Neutral', () => {
    const scores = bewerteModi({ tool: 'mesh', viewMode: '3d' });
    expect(entscheideModus(undefined, scores, HYSTERESE_MS - 1)).toBeUndefined();
  });

  it('Neutral-Start: starkes Signal UND stabil ≥5000ms → wechselt', () => {
    const scores = bewerteModi({ tool: 'mesh', viewMode: '3d' });
    expect(entscheideModus(undefined, scores, HYSTERESE_MS)).toBe('modellieren');
  });

  it('amtierender Modus bekommt +2 Bonus: ein GLEICHAUF-Signal flackert nicht zum anderen Modus', () => {
    // Gleichstand ohne Bonus: 'wand' gibt 'zeichnen' 5 Punkte; '3d' + frühe
    // Phase geben 'entwerfen' ebenfalls 5 Punkte (2+3). Amtiert 'zeichnen',
    // gewinnt es dank Bonus (5+2=7 > 5) statt zu 'entwerfen' zu flackern.
    const signale: ModusSignale = { tool: 'wand', viewMode: '3d', siaPhase: 'vorprojekt' };
    const scores = bewerteModi(signale);
    expect(scores.zeichnen).toBe(5);
    expect(scores.entwerfen).toBe(5);
    expect(entscheideModus('zeichnen', scores, HYSTERESE_MS)).toBe('zeichnen');
    expect(AMTIERENDER_BONUS).toBe(2);
  });

  it('stärkeres Signal überstimmt den Bonus, sobald stabil', () => {
    // 'entwerfen' amtiert (Bonus 2 → 2). 'modellieren' liefert 6 Punkte — klar mehr.
    const scores = bewerteModi({ tool: 'mesh', viewMode: '3d' });
    expect(entscheideModus('entwerfen', scores, HYSTERESE_MS)).toBe('modellieren');
  });

  it('kein Signal stark genug (alle 0) → amtierender Modus bleibt, auch nach Ablauf der Hysterese', () => {
    const scores = bewerteModi({});
    expect(entscheideModus('zeichnen', scores, HYSTERESE_MS)).toBe('zeichnen');
  });
});

describe('entscheideModus — Festhalten', () => {
  it('festhalten=true friert den amtierenden Modus ein, auch bei starkem neuem Signal + stabil', () => {
    const scores = bewerteModi({ tool: 'mesh', viewMode: '3d' });
    expect(entscheideModus('zeichnen', scores, HYSTERESE_MS, true)).toBe('zeichnen');
  });

  it('festhalten=true hält auch den Neutral-Zustand fest', () => {
    const scores = bewerteModi({ tool: 'mesh', viewMode: '3d' });
    expect(entscheideModus(undefined, scores, HYSTERESE_MS, true)).toBeUndefined();
  });
});

describe('sichtbaresSet — Neutral = Voll-UI, sonst Daten je Modus', () => {
  it('Neutral-Zustand (undefined) liefert undefined = Voll-UI', () => {
    expect(sichtbaresSet(undefined)).toBeUndefined();
  });

  it('jeder Modus liefert ein nicht-leeres Set aus Werkzeug-Gruppen', () => {
    for (const modus of ARBEITSMODI) {
      const set = sichtbaresSet(modus);
      expect(set).toBeDefined();
      expect(set!.werkzeugGruppen.length).toBeGreaterThan(0);
    }
  });

  it('Zeichnen zeigt Zeichenwerkzeuge, keine reinen Publish-Panels', () => {
    const set = sichtbaresSet('zeichnen')!;
    expect(set.werkzeugGruppen).toContain('zeichenwerkzeuge');
    expect(set.panels).not.toContain('exportMenuOffen');
  });
});
