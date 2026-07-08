import { describe, expect, it } from 'vitest';
import { materialkatalog, pbrPalette, type MaterialArt } from '../src/materialkatalog';

/**
 * Materialkatalog — K21-Erweiterung (v0.6.3 / B4, Owner-Befund «Materialbibliothek
 * ausbauen» Stufe 1). Additive Felder (`quelle`, `materialArt`, `region`,
 * `dimensionen`) dürfen die bestehenden PBR-/SIA-/Lambda-Verträge nicht
 * antasten — Kernel/`bauteilkatalog` referenzieren weiterhin nur `key`/`pbr`.
 */
describe('Materialkatalog — K21 Stufe 1 (Quelle/Dimensionen/Materialart)', () => {
  it('jeder Eintrag trägt eine nicht-leere Quelle', () => {
    for (const m of materialkatalog) {
      expect(m.quelle, `Eintrag «${m.key}» ohne Quelle`).toBeTruthy();
      expect(m.quelle.trim().length).toBeGreaterThan(0);
    }
  });

  it('Altbestand ist ehrlich als unbelegt markiert, nicht erfunden', () => {
    for (const m of materialkatalog) {
      expect(m.quelle).toBe('Quelle unbelegt (Altbestand)');
    }
  });

  it('jeder Eintrag trägt eine gültige materialArt', () => {
    const gueltig: MaterialArt[] = ['rohmaterial', 'baumaterial', 'unbekannt'];
    for (const m of materialkatalog) {
      expect(gueltig).toContain(m.materialArt);
    }
  });

  it('rohmaterial-Einträge sind plausibel naturbelassen (Holz, Lattung, Kies)', () => {
    const roh = materialkatalog.filter((m) => m.materialArt === 'rohmaterial').map((m) => m.key);
    expect(roh).toEqual(expect.arrayContaining(['holz', 'lattung', 'kies']));
  });

  it('Backstein trägt die lieferbare Normalformat-Grösse 250×120×65 mm (Beispiel aus dem Owner-Befund)', () => {
    const backstein = materialkatalog.find((m) => m.key === 'backstein');
    expect(backstein?.dimensionen?.lieferbar[0]).toMatchObject({
      laenge_mm: 250,
      breite_mm: 120,
      dicke_mm: 65,
    });
  });

  it('dimensionen sind optional — nicht jedes Material erfindet Masse', () => {
    const ohneMasse = materialkatalog.filter((m) => m.dimensionen === undefined);
    expect(ohneMasse.length).toBeGreaterThan(0);
  });

  it('region ist gesetzt, wo der ganze Katalog SIA/CH-Kontext ist', () => {
    for (const m of materialkatalog) {
      expect(m.region).toBe('Schweiz (SIA-Kontext)');
    }
  });

  it('pbrPalette bleibt unverändert additiv ableitbar (Kernel-/Viewport-Vertrag)', () => {
    for (const m of materialkatalog) {
      expect(pbrPalette[m.key]).toEqual(m.pbr);
    }
  });

  it('bestehende Materialschlüssel-Anzahl bleibt bei 21 (additiv, kein Verlust)', () => {
    expect(materialkatalog.length).toBe(21);
  });
});
