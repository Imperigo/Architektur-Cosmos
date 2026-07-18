import { describe, expect, it } from 'vitest';
import { VIS_INSELN, VIS_ISLAND_REIHENFOLGE, VIS_WERKZEUG_KATALOG } from '../src/modules/vis/island/vis-island-katalog';

/**
 * PC1 (`docs/V084-SPEZ.md` §5 W2, C-15/E1) — der Vis-Island-Katalog, gebaut
 * GEGEN die generische `InselKonfig`/`IslandWerkzeug`-Schnittstelle aus
 * `design/island/island-katalog.ts` (E1, W1). Eigene, additive Testdatei.
 */

describe('vis-island-katalog — Aufbau', () => {
  it('vier Inseln, Bühnenordnung links·oben·rechts·unten (wie design)', () => {
    expect(VIS_ISLAND_REIHENFOLGE).toEqual(['graph', 'ansicht', 'stimmung', 'austausch']);
    expect(VIS_INSELN.map((k) => k.id)).toEqual(['graph', 'ansicht', 'stimmung', 'austausch']);
  });

  it('Orientierung + Randklasse folgen demselben Muster wie design (links/rechts vertikal, oben/unten horizontal)', () => {
    const graph = VIS_INSELN.find((k) => k.id === 'graph')!;
    const ansicht = VIS_INSELN.find((k) => k.id === 'ansicht')!;
    const stimmung = VIS_INSELN.find((k) => k.id === 'stimmung')!;
    const austausch = VIS_INSELN.find((k) => k.id === 'austausch')!;
    expect(graph.orientierung).toBe('vertikal');
    expect(graph.randKlasse).toBe('isl-rand-links');
    expect(ansicht.orientierung).toBe('horizontal');
    expect(ansicht.randKlasse).toBe('isl-rand-oben');
    expect(stimmung.orientierung).toBe('vertikal');
    expect(stimmung.randKlasse).toBe('isl-rand-rechts');
    expect(austausch.orientierung).toBe('horizontal');
    expect(austausch.randKlasse).toBe('isl-rand-unten');
  });

  it('13 Werkzeuge total, jedes genau einer Insel zugeordnet', () => {
    expect(VIS_WERKZEUG_KATALOG).toHaveLength(13);
    const summe = VIS_INSELN.reduce((n, k) => n + k.werkzeuge.length, 0);
    expect(summe).toBe(13);
  });

  it('GRAPH: Node-Palette, Ausrichten, Verbinden (Owner-Auftrag §1)', () => {
    const ids = VIS_INSELN.find((k) => k.id === 'graph')!.werkzeuge.map((w) => w.id);
    expect(ids).toEqual(['palette', 'ausrichten', 'verbinden']);
  });

  it('ANSICHT: Zoom/Fit, Raster-Snap, Ortho/Kurve, Minimap (Owner-Auftrag §1)', () => {
    const ids = VIS_INSELN.find((k) => k.id === 'ansicht')!.werkzeuge.map((w) => w.id);
    expect(ids).toEqual(['zoom', 'raster', 'routing', 'minimap']);
  });

  it('STIMMUNG: genau EIN Werkzeug (die 3 Presets als Bild-Kacheln, Owner-Auftrag §1)', () => {
    const werkzeuge = VIS_INSELN.find((k) => k.id === 'stimmung')!.werkzeuge;
    expect(werkzeuge.map((w) => w.id)).toEqual(['stimmung']);
  });

  it('AUSTAUSCH: Render senden, Aufs Plakat, Kamera vorschlagen, Report, Manuell (Owner-Auftrag §1 + Rückweg-Muster)', () => {
    const ids = VIS_INSELN.find((k) => k.id === 'austausch')!.werkzeuge.map((w) => w.id);
    expect(ids).toEqual(['render-senden', 'aufs-plakat', 'kamera-vorschlagen', 'report', 'manuell']);
  });

  it('Raster/Routing/Kamera vorschlagen/Report/Manuell sind hatPopup:false (Sofort-Aktion, Muster design achsen/manuell)', () => {
    for (const id of ['raster', 'routing', 'kamera-vorschlagen', 'report', 'manuell']) {
      const w = VIS_WERKZEUG_KATALOG.find((x) => x.id === id)!;
      expect(w.hatPopup).toBe(false);
    }
  });

  it('alle übrigen Werkzeuge haben hatPopup:true', () => {
    for (const id of ['palette', 'ausrichten', 'verbinden', 'zoom', 'minimap', 'stimmung', 'render-senden', 'aufs-plakat']) {
      const w = VIS_WERKZEUG_KATALOG.find((x) => x.id === id)!;
      expect(w.hatPopup).toBe(true);
    }
  });

  it('kein Werkzeug trägt eine design-toolId (Vis hat keine Entsprechung)', () => {
    for (const w of VIS_WERKZEUG_KATALOG) {
      expect(w.toolId).toBeUndefined();
    }
  });

  it('jede Werkzeug-Id ist eindeutig (keine Doppelregistrierung möglich)', () => {
    const ids = VIS_WERKZEUG_KATALOG.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
