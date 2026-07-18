import { describe, expect, it } from 'vitest';
import { validiereRefEntry, validiereRefImportBatch } from '../src/reference';

/**
 * v0.8.3/P9 (docs/V083-SPEZ.md §6.5/E6e, §12.1 C-5) — Schema-Validierung
 * eigener Referenz-Importe gegen den `RefEntry`-Vertrag. Pflicht sind nur
 * `id`/`title` (die einzigen nicht-optionalen Felder der Schnittstelle) —
 * jedes andere Feld wird nur geprüft, wenn es im Objekt vorkommt. Jede
 * Zurückweisung trägt eine ehrliche, feldgenaue Begründung UND die
 * 1-basierte Zeilennummer des Array-Eintrags.
 */

describe('validiereRefEntry — RefEntry-Vertrag, minimale Pflichtfelder', () => {
  it('akzeptiert eine schlanke Referenz mit nur id/title', () => {
    const ergebnis = validiereRefEntry({ id: 'eigene-villa', title: 'Eigene Villa' });
    expect(ergebnis.ok).toBe(true);
    if (ergebnis.ok) expect(ergebnis.entry.id).toBe('eigene-villa');
  });

  it('akzeptiert eine reiche Referenz mit vielen optionalen Feldern', () => {
    const ergebnis = validiereRefEntry({
      id: 'eigene-villa-2',
      title: 'Eigene Villa 2',
      year_start: 1932,
      year_end: null,
      authors: ['A. Meier'],
      city: 'Zürich',
      country: 'Schweiz',
      style_sector: 'modern_architecture',
      entry_type: 'building',
      themes: ['wohnen'],
      materials: ['beton'],
      has_3d: false,
      visibility: 'private',
    });
    expect(ergebnis.ok).toBe(true);
  });

  it('lehnt ein Nicht-Objekt ab (String, Array, null)', () => {
    expect(validiereRefEntry('kein objekt')).toEqual({ ok: false, grund: 'kein JSON-Objekt' });
    expect(validiereRefEntry(['a', 'b'])).toEqual({ ok: false, grund: 'kein JSON-Objekt' });
    expect(validiereRefEntry(null)).toEqual({ ok: false, grund: 'kein JSON-Objekt' });
  });

  it('verlangt eine nicht-leere id', () => {
    expect(validiereRefEntry({ title: 'Nur Titel' }).ok).toBe(false);
    expect(validiereRefEntry({ id: '', title: 'Leere Id' }).ok).toBe(false);
    expect(validiereRefEntry({ id: '   ', title: 'Nur Whitespace' }).ok).toBe(false);
  });

  it('verlangt einen nicht-leeren title', () => {
    const ergebnis = validiereRefEntry({ id: 'x' });
    expect(ergebnis).toEqual({ ok: false, grund: 'Feld "title" fehlt oder ist kein nicht-leerer Text' });
  });

  it('lehnt falsch typisierte Array-Felder ab (authors/themes/materials)', () => {
    expect(validiereRefEntry({ id: 'x', title: 'T', authors: 'kein array' }).ok).toBe(false);
    expect(validiereRefEntry({ id: 'x', title: 'T', themes: [1, 2] }).ok).toBe(false);
    expect(validiereRefEntry({ id: 'x', title: 'T', materials: [{ a: 1 }] }).ok).toBe(false);
  });

  it('lehnt falsch typisierte Jahresfelder ab', () => {
    expect(validiereRefEntry({ id: 'x', title: 'T', year_start: '1932' }).ok).toBe(false);
    expect(validiereRefEntry({ id: 'x', title: 'T', year_end: 'offen' }).ok).toBe(false);
    // null bleibt erlaubt (reales Seed-Muster: laufendes/offenes Projekt)
    expect(validiereRefEntry({ id: 'x', title: 'T', year_end: null }).ok).toBe(true);
  });

  it('lehnt einen unbekannten entry_type/style_sector ab', () => {
    const t = validiereRefEntry({ id: 'x', title: 'T', entry_type: 'raumschiff' });
    expect(t.ok).toBe(false);
    if (!t.ok) expect(t.grund).toMatch(/entry_type/);
    const s = validiereRefEntry({ id: 'x', title: 'T', style_sector: 'weltraum_architektur' });
    expect(s.ok).toBe(false);
  });

  it('lehnt eine unbekannte visibility ab', () => {
    expect(validiereRefEntry({ id: 'x', title: 'T', visibility: 'geheim' }).ok).toBe(false);
    expect(validiereRefEntry({ id: 'x', title: 'T', visibility: 'private' }).ok).toBe(true);
  });
});

describe('validiereRefImportBatch — Datei-Format, Zeilennummern, Kollisionen', () => {
  it('akzeptiert ein bares Array', () => {
    const ergebnis = validiereRefImportBatch([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }]);
    expect(ergebnis.eintraege).toHaveLength(2);
    expect(ergebnis.fehler).toEqual([]);
  });

  it('akzeptiert die Seed-Hülle { entries: [...] }', () => {
    const ergebnis = validiereRefImportBatch({ entries: [{ id: 'a', title: 'A' }] });
    expect(ergebnis.eintraege).toHaveLength(1);
  });

  it('weist ein falsches Wurzelformat mit einer ehrlichen Fehlermeldung zurück', () => {
    const ergebnis = validiereRefImportBatch({ irgendwas: 1 });
    expect(ergebnis.eintraege).toEqual([]);
    expect(ergebnis.fehler).toHaveLength(1);
    expect(ergebnis.fehler[0]!.grund).toMatch(/JSON-Array/);
  });

  it('meldet fehlerhafte Zeilen einzeln mit 1-basierter Zeilennummer, gültige Zeilen bleiben unberührt', () => {
    const ergebnis = validiereRefImportBatch([
      { id: 'gut-1', title: 'Gut 1' },
      { id: '', title: 'Kaputt — keine id' },
      { id: 'gut-2', title: 'Gut 2' },
      { title: 'Kaputt — keine id, kein title-Fallback' },
    ]);
    expect(ergebnis.eintraege.map((e) => e.id)).toEqual(['gut-1', 'gut-2']);
    expect(ergebnis.fehler).toHaveLength(2);
    expect(ergebnis.fehler[0]).toEqual({ zeile: 2, grund: 'Feld "id" fehlt oder ist kein nicht-leerer Text' });
    expect(ergebnis.fehler[1]!.zeile).toBe(4);
  });

  it('lehnt eine id ab, die bereits im Seed (vorhandeneIds) existiert', () => {
    const ergebnis = validiereRefImportBatch([{ id: 'pantheon-rom', title: 'Duplikat' }], new Set(['pantheon-rom']));
    expect(ergebnis.eintraege).toEqual([]);
    expect(ergebnis.fehler[0]!.grund).toMatch(/existiert bereits/);
  });

  it('lehnt eine id ab, die zweimal im selben Batch vorkommt (zweites Vorkommen)', () => {
    const ergebnis = validiereRefImportBatch([
      { id: 'doppelt', title: 'Erstes' },
      { id: 'doppelt', title: 'Zweites' },
    ]);
    expect(ergebnis.eintraege).toHaveLength(1);
    expect(ergebnis.eintraege[0]!.title).toBe('Erstes');
    expect(ergebnis.fehler).toHaveLength(1);
    expect(ergebnis.fehler[0]!.zeile).toBe(2);
  });
});
