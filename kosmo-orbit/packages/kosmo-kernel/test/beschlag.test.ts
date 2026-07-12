import { describe, expect, it } from 'vitest';
import {
  BESCHLAG_IFC_TYPEN,
  BESCHLAG_KATALOG,
  beschlagSymbol,
  beschlagTyp,
} from '../src/derive/beschlag';

/**
 * Beschlag-Katalog Stufe 1 (v0.7.4 Welle 3, P10): reine Daten-/Geometrie-/
 * IFC-Mapping-Tests — keine Entity, kein Placement-Command, keine UI (das
 * ist erst S2). Golden-Sicherheit wird separat über `npx tsx
 * tools/svg-qa/pruefe-goldens.mts` bewiesen (dieser Katalog wird von
 * keinem bestehenden Ableitungspfad aufgerufen).
 */
describe('BESCHLAG_KATALOG', () => {
  it('hat genau 12 Einträge', () => {
    expect(BESCHLAG_KATALOG.length).toBe(12);
  });

  it('hat eindeutige keys', () => {
    const keys = BESCHLAG_KATALOG.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('jeder Typ liefert nicht-leere Symbol-Geometrie', () => {
    for (const t of BESCHLAG_KATALOG) {
      const svg = beschlagSymbol(t, 24);
      expect(svg.length, `${t.key} liefert leere Geometrie`).toBeGreaterThan(0);
      expect(svg, `${t.key} liefert kein SVG-Element`).toMatch(/^<[a-z]+/);
    }
  });

  it('Symbol-Geometrie ist deterministisch (gleicher Aufruf, gleiches Ergebnis)', () => {
    for (const t of BESCHLAG_KATALOG) {
      expect(beschlagSymbol(t, 24)).toBe(beschlagSymbol(t, 24));
    }
  });

  it('jeder ifcTyp ist aus der erlaubten Menge', () => {
    for (const t of BESCHLAG_KATALOG) {
      expect(BESCHLAG_IFC_TYPEN).toContain(t.ifcTyp);
    }
  });

  it('jeder Eintrag hat eine gültige Kategorie', () => {
    const erlaubt = new Set(['tuer', 'fenster', 'sicherheit']);
    for (const t of BESCHLAG_KATALOG) {
      expect(erlaubt.has(t.kategorie), `${t.key} hat unbekannte Kategorie ${t.kategorie}`).toBe(true);
    }
  });
});

describe('beschlagTyp()', () => {
  it('findet einen bekannten Typ per key', () => {
    const t = beschlagTyp('tuerdruecker-garnitur');
    expect(t?.name).toBe('Türdrücker (Garnitur)');
  });

  it('verwirft einen unbekannten key als undefined', () => {
    expect(beschlagTyp('nicht-vorhanden')).toBeUndefined();
  });
});
