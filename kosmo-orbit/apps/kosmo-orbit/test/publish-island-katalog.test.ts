import { describe, expect, it } from 'vitest';
import { PUBLISH_INSELN, PUBLISH_ISLAND_REIHENFOLGE, PUBLISH_WERKZEUG_KATALOG } from '../src/modules/publish/island/publish-island-katalog';

/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3, C-19/E1) — der Publish-Island-Katalog,
 * gebaut GEGEN die generische `InselKonfig`/`IslandWerkzeug`-Schnittstelle
 * aus `design/island/island-katalog.ts` (E1, W1). Eigene, additive Testdatei
 * — Muster `test/vis-island-katalog.test.ts` (PC1).
 */

describe('publish-island-katalog — Aufbau', () => {
  it('vier Inseln, Bühnenordnung links·oben·rechts·unten (wie design/vis)', () => {
    expect(PUBLISH_ISLAND_REIHENFOLGE).toEqual(['blatt', 'darstellung', 'projekt', 'austausch']);
    expect(PUBLISH_INSELN.map((k) => k.id)).toEqual(['blatt', 'darstellung', 'projekt', 'austausch']);
  });

  it('Orientierung + Randklasse folgen demselben Muster wie design/vis (links/rechts vertikal, oben/unten horizontal)', () => {
    const blatt = PUBLISH_INSELN.find((k) => k.id === 'blatt')!;
    const darstellung = PUBLISH_INSELN.find((k) => k.id === 'darstellung')!;
    const projekt = PUBLISH_INSELN.find((k) => k.id === 'projekt')!;
    const austausch = PUBLISH_INSELN.find((k) => k.id === 'austausch')!;
    expect(blatt.orientierung).toBe('vertikal');
    expect(blatt.randKlasse).toBe('isl-rand-links');
    expect(darstellung.orientierung).toBe('horizontal');
    expect(darstellung.randKlasse).toBe('isl-rand-oben');
    expect(projekt.orientierung).toBe('vertikal');
    expect(projekt.randKlasse).toBe('isl-rand-rechts');
    expect(austausch.orientierung).toBe('horizontal');
    expect(austausch.randKlasse).toBe('isl-rand-unten');
  });

  it('12 Werkzeuge total, jedes genau einer Insel zugeordnet', () => {
    expect(PUBLISH_WERKZEUG_KATALOG).toHaveLength(12);
    const summe = PUBLISH_INSELN.reduce((n, k) => n + k.werkzeuge.length, 0);
    expect(summe).toBe(12);
  });

  it('BLATT: Blatt anlegen/wechseln, Ansicht platzieren, Auto-Pack (Bauauftrag)', () => {
    const ids = PUBLISH_INSELN.find((k) => k.id === 'blatt')!.werkzeuge.map((w) => w.id);
    expect(ids).toEqual(['blatt', 'platzieren', 'auto-pack']);
  });

  it('DARSTELLUNG: Zoom, Massstab, Plankopf-Presets (Bauauftrag, C-19 Zoom NEU)', () => {
    const ids = PUBLISH_INSELN.find((k) => k.id === 'darstellung')!.werkzeuge.map((w) => w.id);
    expect(ids).toEqual(['zoom', 'massstab', 'plankopf-presets']);
  });

  it('PROJEKT: Dossier, Plankopf (Plancode/Phase, Bauauftrag)', () => {
    const ids = PUBLISH_INSELN.find((k) => k.id === 'projekt')!.werkzeuge.map((w) => w.id);
    expect(ids).toEqual(['dossier', 'plankopf']);
  });

  it('AUSTAUSCH: PDF-Export, SVG/DXF-Export, Export-Hub, Manuell (Bauauftrag + Rückweg-Muster)', () => {
    const ids = PUBLISH_INSELN.find((k) => k.id === 'austausch')!.werkzeuge.map((w) => w.id);
    expect(ids).toEqual(['export-pdf', 'export-svg-dxf', 'export-hub', 'manuell']);
  });

  it('nur Manuell ist hatPopup:false (Sofort-Rückweg, Muster design achsen/manuell)', () => {
    const manuell = PUBLISH_WERKZEUG_KATALOG.find((w) => w.id === 'manuell')!;
    expect(manuell.hatPopup).toBe(false);
    for (const w of PUBLISH_WERKZEUG_KATALOG.filter((x) => x.id !== 'manuell')) {
      expect(w.hatPopup, `Werkzeug "${w.id}" sollte hatPopup:true tragen`).toBe(true);
    }
  });

  it('kein Werkzeug trägt eine design-toolId (Publish hat keine Entsprechung)', () => {
    for (const w of PUBLISH_WERKZEUG_KATALOG) {
      expect(w.toolId).toBeUndefined();
    }
  });

  it('jede Werkzeug-Id ist eindeutig (keine Doppelregistrierung möglich)', () => {
    const ids = PUBLISH_WERKZEUG_KATALOG.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
