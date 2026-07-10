import { describe, expect, it } from 'vitest';
import { refHash, tuschePfade } from '../src/modules/data/data-runtime';

/**
 * H-39 (v0.6.9 Stream F) — `tuschePfade` bekam je Typologie 2–3 zusätzliche
 * Hash-Varianten, damit benachbarte Karten derselben Typologie sich im
 * Signet unterscheiden (`object`/unbekannte Typologie zeichneten vorher
 * IMMER dasselbe Motiv, unabhängig von der Id). Diese Tests sichern genau
 * den Vertrag, den `e2e/kosmodata-sichtbar.spec.ts` K1 auch e2e prüft:
 * reine Funktion von `(id, entryType)`, dieselbe Id → immer dasselbe
 * Signet — und NEU: verschiedene Ids derselben Typologie streuen jetzt
 * tatsächlich über mehrere Motiv-Varianten.
 */

const TYPOLOGIEN = [
  'building',
  'urban_plan',
  'landscape_project',
  'infrastructure',
  'text',
  'theory',
  'map',
  'object',
  'event',
] as const;

describe('refHash', () => {
  it('ist deterministisch — dieselbe Id ergibt immer denselben Hash', () => {
    expect(refHash('pantheon-rom')).toBe(refHash('pantheon-rom'));
  });

  it('unterscheidet verschiedene Ids (kein Kollisions-Trivialfall)', () => {
    expect(refHash('a')).not.toBe(refHash('b'));
  });
});

describe('tuschePfade — Determinismus (K1-Vertrag)', () => {
  it('liefert für dieselbe Id + Typologie über mehrere Aufrufe exakt dieselben Pfade', () => {
    for (const typ of TYPOLOGIEN) {
      const erst = tuschePfade('pantheon-rom', typ);
      const zweit = tuschePfade('pantheon-rom', typ);
      expect(zweit).toEqual(erst);
    }
  });

  it('bleibt deterministisch auch ohne bekannte Typologie (default-Fall)', () => {
    expect(tuschePfade('irgendwas', 'unbekannter-typ')).toEqual(tuschePfade('irgendwas', 'unbekannter-typ'));
    expect(tuschePfade('irgendwas', undefined)).toEqual(tuschePfade('irgendwas', undefined));
  });

  it('liefert für jede Typologie ein nicht-leeres Pfad-Array', () => {
    for (const typ of [...TYPOLOGIEN, undefined]) {
      const pfade = tuschePfade('beliebige-referenz-id', typ);
      expect(pfade.length).toBeGreaterThan(0);
      for (const d of pfade) expect(typeof d).toBe('string');
    }
  });
});

describe('tuschePfade — H-39: Motiv-Varianten streuen je Typologie', () => {
  it('object: verschiedene Ids erzeugen mehr als eine Grundform (vorher IMMER identisch)', () => {
    // Vor H-39 gab `object` für JEDE Id exakt dasselbe Signet zurück — das
    // widerspricht dem Zweck (benachbarte Karten unterscheidbar machen).
    const ids = Array.from({ length: 30 }, (_, i) => `objekt-${i}`);
    const varianten = new Set(ids.map((id) => JSON.stringify(tuschePfade(id, 'object'))));
    expect(varianten.size).toBeGreaterThan(1);
  });

  it('default (unbekannte Typologie): verschiedene Ids erzeugen mehr als eine Variante', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `misc-${i}`);
    const varianten = new Set(ids.map((id) => JSON.stringify(tuschePfade(id, 'irgendwas'))));
    expect(varianten.size).toBeGreaterThan(1);
  });

  it.each(TYPOLOGIEN)('%s: mindestens 3 unterscheidbare Signets über eine kleine Stichprobe', (typ) => {
    const ids = Array.from({ length: 24 }, (_, i) => `ref-${typ}-${i}`);
    const varianten = new Set(ids.map((id) => JSON.stringify(tuschePfade(id, typ))));
    expect(varianten.size).toBeGreaterThanOrEqual(3);
  });
});
