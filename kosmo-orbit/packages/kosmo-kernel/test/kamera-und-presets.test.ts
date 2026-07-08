import { describe, expect, it } from 'vitest';
import {
  KosmoDoc,
  execute,
  invertPatches,
  deriveAutoKameras,
  evaluiereGraph,
  RENDER_PRESETS,
  VIS_PRESET_IDS,
  fovFromBrennweite,
  isVisPresetId,
  visPresetById,
  type VisGraph,
} from '../src';

/**
 * Owner-Befund K20/A10 — KosmoVis-Automatik: Auto-Kamera (deterministisch aus
 * den Modell-Bounds) + Cycles-Presets (Datentabelle, angewandt über den
 * bestehenden `vis.nodeParametrieren`-Weg auf dem Render-Node).
 */

function neueStoreyId(doc: KosmoDoc, elevation = 0, height = 3000): string {
  const res = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation, height });
  return (res.patches[0] as { id: string }).id;
}

/** Quaderförmiges Volumen 10 × 6 × 3 m ab (0,0) — mitrefrei, glatte Bounds. */
function quaderDoc(): KosmoDoc {
  const doc = new KosmoDoc();
  const storeyId = neueStoreyId(doc);
  execute(doc, 'design.volumenErstellen', {
    storeyId,
    outline: [
      { x: 0, y: 0 },
      { x: 10000, y: 0 },
      { x: 10000, y: 6000 },
      { x: 0, y: 6000 },
    ],
    height: 3000,
  });
  return doc;
}

describe('Auto-Kamera (deriveAutoKameras)', () => {
  it('leeres Dokument liefert ehrlich keine Vorschläge (kein Fake-Standpunkt)', () => {
    const doc = new KosmoDoc();
    expect(deriveAutoKameras(doc)).toEqual([]);
  });

  it('Eingang: Standpunkt exakt aus den Bounds, Augenhöhe 1.6 m, Süd-Kante', () => {
    const doc = quaderDoc();
    const [eingang] = deriveAutoKameras(doc);
    expect(eingang!.name).toBe('Eingang');
    // setback = max(10000,6000)*0.8 = 8000 → y = 0 - 8000 = -8000mm = -8m (glTF: -y)
    expect(eingang!.position).toEqual([5, 1.6, 8]);
    expect(eingang!.target).toEqual([5, 1.2, -3]);
    expect(eingang!.fov).toBe(55);
    expect(eingang!.begruendung).toContain('Vorschlag aus dem Modell');
    expect(eingang!.begruendung).not.toMatch(/\bKI\b/);
  });

  it('Übersicht: 3/4-Vogelperspektive exakt über der Gebäudehöhe', () => {
    const doc = quaderDoc();
    const [, uebersicht] = deriveAutoKameras(doc);
    expect(uebersicht!.name).toBe('Übersicht');
    // diag = max(10000,6000)*1.1 = 11000 → x=10000+11000=21000mm=21m, y=0-11000=-11000mm→11m
    // z = max(3000*1.8, 3000+6000) = max(5400,9000) = 9000mm = 9m
    expect(uebersicht!.position).toEqual([21, 9, 11]);
    expect(uebersicht!.target).toEqual([5, 1.5, -3]);
    expect(uebersicht!.fov).toBe(45);
  });

  it('ohne Zonen: kein Innenraum-Vorschlag (ehrlich weggelassen statt geraten)', () => {
    const doc = quaderDoc();
    const kameras = deriveAutoKameras(doc);
    expect(kameras).toHaveLength(2);
    expect(kameras.some((k) => k.name === 'Innenraum')).toBe(false);
  });

  it('mit Zone: Innenraum-Standpunkt exakt aus dem Zonen-Polygon, Augenhöhe 1.6 m', () => {
    const doc = quaderDoc();
    const storeyId = doc.byKind('storey')[0]!.id;
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Wohnraum',
      sia: 'HNF',
      outline: [
        { x: 1000, y: 1000 },
        { x: 4000, y: 1000 },
        { x: 4000, y: 4000 },
        { x: 1000, y: 4000 },
      ],
    });
    const kameras = deriveAutoKameras(doc);
    expect(kameras).toHaveLength(3);
    const innen = kameras.find((k) => k.name === 'Innenraum')!;
    // Zentrum (2500,2500); Ecke (1000,1000); Standpunkt = Zentrum + 0.6·(Ecke-Zentrum) = (1600,1600)
    expect(innen.position).toEqual([1.6, 1.6, -1.6]);
    expect(innen.target).toEqual([2.5, 1.6, -2.5]);
    expect(innen.fov).toBe(65);
    expect(innen.begruendung).toContain('Wohnraum');
  });

  it('HNF-Zone hat Vorrang vor einer flächenmässig grösseren Nicht-HNF-Zone', () => {
    const doc = quaderDoc();
    const storeyId = doc.byKind('storey')[0]!.id;
    // Grosse Verkehrsfläche (6×6=36m²) — käme flächenmässig zuerst
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Korridor',
      sia: 'VF',
      outline: [
        { x: 0, y: 0 },
        { x: 6000, y: 0 },
        { x: 6000, y: 6000 },
        { x: 0, y: 6000 },
      ],
    });
    // Kleinerer Hauptnutzraum (3×3=9m²) — muss trotzdem gewinnen
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Stube',
      sia: 'HNF',
      outline: [
        { x: 7000, y: 0 },
        { x: 10000, y: 0 },
        { x: 10000, y: 3000 },
        { x: 7000, y: 3000 },
      ],
    });
    const innen = deriveAutoKameras(doc).find((k) => k.name === 'Innenraum')!;
    expect(innen.begruendung).toContain('Stube');
  });

  it('ist deterministisch — zweimal derselbe Doc liefert byte-identische Standpunkte', () => {
    const doc = quaderDoc();
    expect(deriveAutoKameras(doc)).toEqual(deriveAutoKameras(doc));
  });
});

describe('Cycles-Presets (RENDER_PRESETS-Datentabelle)', () => {
  it('kennt genau die drei benannten Presets', () => {
    expect(VIS_PRESET_IDS).toEqual(['entwurf-schnell', 'praesentation', 'nacht']);
    expect(RENDER_PRESETS.map((p) => p.name)).toEqual(['Entwurf schnell', 'Präsentation', 'Nacht']);
  });

  it('Nacht-Preset hat die Sonne unter dem Horizont (ehrliche Nachtszene)', () => {
    expect(visPresetById('nacht').render.sun.elevation).toBeLessThan(0);
  });

  it('isVisPresetId lehnt unbekannte Werte ab', () => {
    expect(isVisPresetId('praesentation')).toBe(true);
    expect(isVisPresetId('fantasie-preset')).toBe(false);
    expect(isVisPresetId(42)).toBe(false);
  });

  it('fovFromBrennweite: 50 mm Normalbrennweite ≈ 40°, rein rechnerisch', () => {
    expect(fovFromBrennweite(50)).toBe(40);
  });
});

describe('Render-Node: Preset über vis.nodeParametrieren (bestehender Command-Weg)', () => {
  it('ohne Preset bleibt der Render-Node byte-identisch zum bisherigen Stand (128 Samples, kein Resolution-Override)', () => {
    const doc = new KosmoDoc();
    const g = execute(doc, 'vis.graphErstellen', { name: 'Ohne Preset' });
    const graphId = (g.patches[0] as { id: string }).id;
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'render', x: 0, y: 0 });
    const render = doc.get<VisGraph>(graphId)!.nodes[0]!.id;
    const auftrag = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!).renderAuftraege.get(render)!;
    expect(auftrag.samples).toBe(128);
    expect(auftrag.presetId).toBeUndefined();
    expect(auftrag.resolution).toBeUndefined();
    expect(auftrag.komposition).toBeUndefined();
  });

  it('vis.nodeParametrieren mit params.preset setzt Samples/Auflösung/Sonne/Komposition — undo-fähig', () => {
    const doc = new KosmoDoc();
    const g = execute(doc, 'vis.graphErstellen', { name: 'Mit Preset' });
    const graphId = (g.patches[0] as { id: string }).id;
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'render', x: 0, y: 0 });
    const render = doc.get<VisGraph>(graphId)!.nodes[0]!.id;

    const res = execute(doc, 'vis.nodeParametrieren', { graphId, nodeId: render, params: { preset: 'praesentation' } });
    let auftrag = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!).renderAuftraege.get(render)!;
    expect(auftrag.presetId).toBe('praesentation');
    expect(auftrag.samples).toBe(256);
    expect(auftrag.resolution).toEqual([1920, 1200]);
    expect(auftrag.sun).toEqual({ azimuth: 200, elevation: 32 });
    expect(auftrag.komposition).toEqual({ seitenverhaeltnis: 1.6, brennweiteMm: 50, horizontlinie: 0.42 });

    doc.apply(invertPatches(res.patches));
    auftrag = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!).renderAuftraege.get(render)!;
    expect(auftrag.presetId).toBeUndefined();
    expect(auftrag.samples).toBe(128);
  });

  it('ein verbundener Zahl-Node für samples überschreibt den Preset-Default weiterhin (explizite Verbindung gewinnt)', () => {
    const doc = new KosmoDoc();
    const g = execute(doc, 'vis.graphErstellen', { name: 'Preset + Zahl' });
    const graphId = (g.patches[0] as { id: string }).id;
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'render', x: 0, y: 0, params: { preset: 'nacht' } });
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'zahl', x: 0, y: 0, params: { wert: 64 } });
    const graph = doc.get<VisGraph>(graphId)!;
    const render = graph.nodes[0]!.id;
    const zahl = graph.nodes[1]!.id;
    execute(doc, 'vis.verbinden', { graphId, from: zahl, fromPort: 'zahl', to: render, toPort: 'samples' });
    const auftrag = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!).renderAuftraege.get(render)!;
    expect(auftrag.samples).toBe(64); // Verbindung gewinnt
    expect(auftrag.presetId).toBe('nacht'); // Preset liefert trotzdem Auflösung/Sonne/Komposition
    expect(auftrag.resolution).toEqual([1920, 1200]);
  });

  it('ungültiger Preset-String wird ehrlich ignoriert statt zu werfen', () => {
    const doc = new KosmoDoc();
    const g = execute(doc, 'vis.graphErstellen', { name: 'Kaputter Preset-Wert' });
    const graphId = (g.patches[0] as { id: string }).id;
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'render', x: 0, y: 0, params: { preset: 'gibt-es-nicht' } });
    const render = doc.get<VisGraph>(graphId)!.nodes[0]!.id;
    expect(() => evaluiereGraph(doc, doc.get<VisGraph>(graphId)!)).not.toThrow();
    const auftrag = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!).renderAuftraege.get(render)!;
    expect(auftrag.presetId).toBeUndefined();
    expect(auftrag.samples).toBe(128);
  });
});

describe('Render-Node: Auto-Kamera-Node am kameras-Port', () => {
  it('ohne verbundenen Auto-Kamera-Node bleibt kameras leer (kein Fake-"auto")', () => {
    const doc = quaderDoc();
    const g = execute(doc, 'vis.graphErstellen', { name: 'Ohne Kamera-Node' });
    const graphId = (g.patches[0] as { id: string }).id;
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'render', x: 0, y: 0 });
    const render = doc.get<VisGraph>(graphId)!.nodes[0]!.id;
    const auftrag = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!).renderAuftraege.get(render)!;
    expect(auftrag.kameras).toBeUndefined();
  });

  it('verbundener Auto-Kamera-Node liefert live die aktuellen Standpunkte (reine Ableitung, kein Snapshot)', () => {
    const doc = quaderDoc();
    const g = execute(doc, 'vis.graphErstellen', { name: 'Mit Kamera-Node' });
    const graphId = (g.patches[0] as { id: string }).id;
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'render', x: 0, y: 0 });
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'kamera', x: 0, y: 0 });
    const graph = doc.get<VisGraph>(graphId)!;
    const render = graph.nodes[0]!.id;
    const kamera = graph.nodes[1]!.id;
    execute(doc, 'vis.verbinden', { graphId, from: kamera, fromPort: 'kameras', to: render, toPort: 'kameras' });
    const auftrag = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!).renderAuftraege.get(render)!;
    expect(auftrag.kameras).toHaveLength(2);
    expect(auftrag.kameras!.map((k) => k.name)).toEqual(['Eingang', 'Übersicht']);
    expect(auftrag.kameras).toEqual(deriveAutoKameras(doc));
  });
});
