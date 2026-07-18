import { describe, expect, it } from 'vitest';
import { PREPARE_INSELN, PREPARE_ISLAND_REIHENFOLGE, PREPARE_WERKZEUG_KATALOG } from '../src/modules/prepare/island/prepare-island-katalog';

/**
 * PC4 (`docs/V084-SPEZ.md` §5 W3, C-20) — der Prepare-Island-Katalog, gebaut
 * GEGEN die generische `InselKonfig`/`IslandWerkzeug`-Schnittstelle aus
 * `design/island/island-katalog.ts` (E1, W1). Eigene, additive Testdatei —
 * Muster `vis-island-katalog.test.ts` (PC1).
 */

describe('prepare-island-katalog — Aufbau', () => {
  it('vier Inseln, Bühnenordnung links·oben·rechts·unten (wie design/vis)', () => {
    expect(PREPARE_ISLAND_REIHENFOLGE).toEqual(['aufnahme', 'wissen', 'bestand', 'austausch']);
    expect(PREPARE_INSELN.map((k) => k.id)).toEqual(['aufnahme', 'wissen', 'bestand', 'austausch']);
  });

  it('Orientierung + Randklasse folgen demselben Muster wie design/vis (links/rechts vertikal, oben/unten horizontal)', () => {
    const aufnahme = PREPARE_INSELN.find((k) => k.id === 'aufnahme')!;
    const wissen = PREPARE_INSELN.find((k) => k.id === 'wissen')!;
    const bestand = PREPARE_INSELN.find((k) => k.id === 'bestand')!;
    const austausch = PREPARE_INSELN.find((k) => k.id === 'austausch')!;
    expect(aufnahme.orientierung).toBe('vertikal');
    expect(aufnahme.randKlasse).toBe('isl-rand-links');
    expect(wissen.orientierung).toBe('horizontal');
    expect(wissen.randKlasse).toBe('isl-rand-oben');
    expect(bestand.orientierung).toBe('vertikal');
    expect(bestand.randKlasse).toBe('isl-rand-rechts');
    expect(austausch.orientierung).toBe('horizontal');
    expect(austausch.randKlasse).toBe('isl-rand-unten');
  });

  it('9 Werkzeuge total, jedes genau einer Insel zugeordnet', () => {
    expect(PREPARE_WERKZEUG_KATALOG).toHaveLength(9);
    const summe = PREPARE_INSELN.reduce((n, k) => n + k.werkzeuge.length, 0);
    expect(summe).toBe(9);
  });

  it('AUFNAHME: Dateien, OneDrive (Owner-Auftrag-Schnitt)', () => {
    const ids = PREPARE_INSELN.find((k) => k.id === 'aufnahme')!.werkzeuge.map((w) => w.id);
    expect(ids).toEqual(['dateien', 'onedrive']);
  });

  it('WISSEN: Suche, Basis-Import, Vektorisieren (Owner-Auftrag-Schnitt)', () => {
    const ids = PREPARE_INSELN.find((k) => k.id === 'wissen')!.werkzeuge.map((w) => w.id);
    expect(ids).toEqual(['suche', 'basis', 'vektorisieren']);
  });

  it('BESTAND: Dokumente, Chunk-Ansicht (Owner-Auftrag-Schnitt)', () => {
    const ids = PREPARE_INSELN.find((k) => k.id === 'bestand')!.werkzeuge.map((w) => w.id);
    expect(ids).toEqual(['dokumente', 'chunk']);
  });

  it('AUSTAUSCH: Zu KosmoData, Manuell (Owner-Auftrag-Schnitt + Rückweg-Muster)', () => {
    const ids = PREPARE_INSELN.find((k) => k.id === 'austausch')!.werkzeuge.map((w) => w.id);
    expect(ids).toEqual(['zu-kosmodata', 'manuell']);
  });

  it('nur "manuell" ist hatPopup:false (Sofort-Aktion, Muster design/vis)', () => {
    for (const w of PREPARE_WERKZEUG_KATALOG) {
      expect(w.hatPopup).toBe(w.id !== 'manuell');
    }
  });

  it('kein Werkzeug trägt eine design-toolId (Prepare hat keine Entsprechung)', () => {
    for (const w of PREPARE_WERKZEUG_KATALOG) {
      expect(w.toolId).toBeUndefined();
    }
  });

  it('jede Werkzeug-Id ist eindeutig (keine Doppelregistrierung möglich)', () => {
    const ids = PREPARE_WERKZEUG_KATALOG.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('alle Werkzeuge sind status "vorhanden" (neu gebaut, keine Bestandswerkzeug-Grade)', () => {
    for (const w of PREPARE_WERKZEUG_KATALOG) {
      expect(w.status).toBe('vorhanden');
    }
  });
});
