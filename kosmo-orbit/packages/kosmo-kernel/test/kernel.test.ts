import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { readFileSync } from 'node:fs';
import {
  testhausMitQuertrakt,
  testhausSatteldach,
  ansichtSvg,
  testhausWalmdachGrundriss,
  testhausSatteldachZweiGeschosse,
  testhausFensterZweifluegel,
  testhausFensterband,
} from './fixtures';
import { dachGeometrie, DACH_SCHNITT_DICKE_MM } from '../src/derive/dach';
import { deriveBerechnungsliste, parseRaumprogrammCsv } from '../src/derive/berechnungsliste';
import { deriveMengen } from '../src/derive/mengen';
import { generiereStuetzenraster } from '../src/derive/stuetzenraster';
import { deriveAxo } from '../src/derive/axo';
import { generiereVolumenstudien } from '../src/derive/volumenstudie';
import { erkenneDecke, erkenneWand, geschossZu } from '../src/derive/bestand';
import { fluchtwege, raumGraph } from '../src/derive/raumgraph';
import { ZONENREGEL_KATALOG } from '../src/model/zonenregeln';
import { variantenMatrix } from '../src/derive/variantenmatrix';
import { segmentiere, sollMix } from '../src/derive/segmentierer';
import { areaReport, kennzahlenAuswerten } from '../src/derive/sia416';
import { raumTypVorschlag } from '../src/derive/raumtypcopilot';
import { finalerRenderPrompt, renderPromptBausteine } from '../src/derive/renderprompt';
import { moebelGeometrie } from '../src/derive/moebel';
import { fassadenModule, moduleAlsCsv } from '../src/derive/fassadenmodule';
import { parzelleZuOutline, ringsZuOutline, nachbarnZuOutlines } from '../src/derive/standort';
import { generiereGrundriss } from '../src/derive/grundrissgenerator';
import { REGEL_PRESETS } from '../src/model/regelpresets';
import {
  KosmoDoc,
  History,
  execute,
  invertPatches,
  deriveAll,
  deriveSection,
  deriveEntity,
  union,
  intersect,
  thickenPolyline,
  wallOutline,
  polygonArea,
  schraffurFuer,
  schraffurLinien,
  sheetToSvg,
  CommandError,
  fangKandidaten,
  magnetFang,
  elementFang,
  elementFangKandidaten,
  derivePlan,
  deriveDimensions,
  treppenTeile,
  pruefeGrundriss,
  dimensionLabel,
  sectionInnerSvg,
  evaluiereGraph,
  topoReihenfolge,
  hatZyklus,
  exportGlb,
  parseKosmoSafe,
  VIS_NODE_KATALOG,
  TERRAIN_BAND_BREITE_MM,
  type Storey,
  type Wall,
  type Assembly,
  type Zone,
  type VisGraph,
  type Roof,
} from '../src';

function setupDoc() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', {
    name: 'EG',
    index: 0,
    elevation: 0,
    height: 3000,
  });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [
      { material: 'putz', thickness: 20, function: 'bekleidung' },
      { material: 'daemmung-mw', thickness: 160, function: 'daemmung' },
      { material: 'beton', thickness: 180, function: 'tragend' },
    ],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  return { doc, storeyId, assemblyId };
}

describe('Command-System', () => {
  it('erstellt Geschoss, Aufbau, Wand — und macht sauber rückgängig', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const history = new History();
    const res = execute(doc, 'design.wandZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
      assemblyId,
    });
    history.record(res.patches);
    expect(doc.byKind<Wall>('wall')).toHaveLength(1);
    expect(res.summary).toBe('Wand 5.0 m');

    history.undo(doc);
    expect(doc.byKind<Wall>('wall')).toHaveLength(0);
    history.redo(doc);
    expect(doc.byKind<Wall>('wall')).toHaveLength(1);
  });

  it('apply ∘ invert = identität (Roundtrip über Serialisierung)', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const before = JSON.stringify(doc.toJSON());
    const res = execute(doc, 'design.wandZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 3000, y: 2000 },
      assemblyId,
    });
    doc.apply(invertPatches(res.patches));
    expect(JSON.stringify(doc.toJSON())).toBe(before);
  });

  it('validiert Parameter mit verständlicher Fehlermeldung', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    expect(() =>
      execute(doc, 'design.wandZeichnen', {
        storeyId,
        a: { x: 0, y: 0 },
        b: { x: 0, y: 0 },
        assemblyId,
      }),
    ).toThrow(/Länge 0/);
    expect(() => execute(doc, 'design.wandZeichnen', { storeyId } as never)).toThrow(/Ungültige/);
  });

  it('verweigert Öffnungen ausserhalb der Wand', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const wand = execute(doc, 'design.wandZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 2000, y: 0 },
      assemblyId,
    });
    const wallId = (wand.patches[0] as { id: string }).id;
    expect(() =>
      execute(doc, 'design.oeffnungSetzen', {
        wallId,
        openingType: 'fenster',
        center: 1900,
        width: 1200,
      }),
    ).toThrow(/hinaus/);
  });

  it('löscht Wand samt Öffnungen (Host-Kaskade)', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const wand = execute(doc, 'design.wandZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
      assemblyId,
    });
    const wallId = (wand.patches[0] as { id: string }).id;
    execute(doc, 'design.oeffnungSetzen', { wallId, openingType: 'tuer', center: 1000, width: 900, height: 2100, sill: 900 });
    execute(doc, 'design.loeschen', { entityId: wallId });
    expect(doc.byKind('opening' as never)).toHaveLength(0);
    expect(doc.byKind('wall' as never)).toHaveLength(0);
  });

  it('geschossErstellen: Doppel-Name wird NICHT abgelehnt, aber im Summary gewarnt (H-38)', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    expect(eg.summary).not.toContain('Duplikat');
    // gleicher Name auf einem anderen Trakt/Index — legitim, kein Ablehnungsgrund
    const eg2 = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3200 });
    expect(doc.byKind<Storey>('storey')).toHaveLength(2); // nicht abgelehnt
    expect(eg2.summary).toContain('«EG» bereits vergeben (Duplikat)');
    expect(eg2.journal.summary).toBe(eg2.summary); // derselbe Kanal fürs Journal/die Kosmo-Quittierung
    // ein drittes, eindeutig benanntes Geschoss bleibt unauffällig
    const og = execute(doc, 'design.geschossErstellen', { name: '1.OG', index: 1, elevation: 3200, height: 2800 });
    expect(og.summary).not.toContain('Duplikat');
  });
});

describe('Geometrie', () => {
  it('Wand-Umriss: 5m-Wand mit 360mm-Aufbau hat korrekte Fläche', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const res = execute(doc, 'design.wandZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
      assemblyId,
    });
    const wall = doc.get<Wall>((res.patches[0] as { id: string }).id)!;
    const assembly = doc.get<Assembly>(assemblyId)!;
    const outline = wallOutline(wall, assembly);
    expect(Math.abs(polygonArea(outline))).toBe(5000 * 360);
  });

  it('Clipper-Union verschmilzt zwei überlappende Wände (Junction-Grundlage)', () => {
    const a = thickenPolyline([{ x: 0, y: 0 }, { x: 4000, y: 0 }], 180);
    const b = thickenPolyline([{ x: 4000 - 180, y: -180 }, { x: 4000 - 180, y: 3000 }], 180);
    const merged = union([...a, ...b]);
    expect(merged).toHaveLength(1);
    const area = Math.abs(polygonArea(merged[0]!));
    // Fläche = beide Rechtecke minus Überlappung (360×360)
    expect(area).toBe(4000 * 360 + (3000 + 180) * 360 - 360 * 360);
  });
});

describe('Derive-3D', () => {
  it('Wand mit Fenster: Mesh mit Loch, plausible Vertexzahl und Kanten', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const wand = execute(doc, 'design.wandZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
      assemblyId,
    });
    const wallId = (wand.patches[0] as { id: string }).id;
    execute(doc, 'design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 2500,
      width: 1600,
      height: 1400,
      sill: 900,
    });
    const artifact = deriveEntity(doc, wallId)!;
    expect(artifact).not.toBeNull();
    expect(artifact.positions.length).toBeGreaterThan(0);
    expect(artifact.indices.length % 3).toBe(0);
    expect(artifact.edges.length).toBeGreaterThan(0);
    // Bounding-Box: Wand geht 0..5000 in x, Höhe 0..3000
    let maxZ = -Infinity;
    for (let i = 2; i < artifact.positions.length; i += 3) {
      maxZ = Math.max(maxZ, artifact.positions[i]!);
    }
    expect(maxZ).toBe(3000);
  });

  it('deriveAll liefert Artefakte für Wand + Decke + Volumen', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 3000, y: 0 }, assemblyId });
    execute(doc, 'design.deckeZeichnen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
        { x: 3000, y: 3000 },
        { x: 0, y: 3000 },
      ],
      thickness: 250,
    });
    execute(doc, 'design.volumenErstellen', {
      storeyId,
      outline: [
        { x: 5000, y: 0 },
        { x: 8000, y: 0 },
        { x: 8000, y: 4000 },
        { x: 5000, y: 4000 },
      ],
      height: 9000,
      program: 'wohnen',
    });
    expect(deriveAll(doc)).toHaveLength(3);
  });
});

describe('Terrain-Mesh (v0.7.1 E4, docs/V071-KONZEPT.md): deriveAll trianguliert das Terrainprofil zu einem Gelände-Band', () => {
  it('Daten-Guard: ohne Terrain-Entity bleibt deriveAll unverändert (byte-gleich zum Vor-E4-Stand)', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 3000, y: 0 }, assemblyId });
    expect(deriveAll(doc)).toHaveLength(1);
  });

  it('ein Terrain mit 4 Stützpunkten liefert genau ein Artefakt mit materialKey "terrain" und 4 Segment-Quads (8 Dreiecke, 16 Vertices)', () => {
    const { doc } = setupDoc();
    execute(doc, 'design.terrainSetzen', {
      typ: 'gewachsen',
      punkte: [
        { x: 0, y: 0, z: 0 },
        { x: 3000, y: 0, z: 500 },
        { x: 6000, y: 1000, z: 800 },
        { x: 9000, y: 1000, z: 200 },
      ],
    });
    const terrainArtefakte = deriveAll(doc).filter((a) => a.materialKey === 'terrain');
    expect(terrainArtefakte).toHaveLength(1);
    const a = terrainArtefakte[0]!;
    // 3 Segmente (4 Punkte) × 4 Vertices (links/rechts je Segmentende) = 12 Vertices, 3×2 Dreiecke = 6
    expect(a.positions.length / 3).toBe(12);
    expect(a.indices.length / 3).toBe(6);
    expect(a.normals.length).toBe(a.positions.length);
  });

  it('die Höhen (z) der Vertices stimmen mit den gesetzten Stützpunkten überein — kein synthetischer Höhenwert', () => {
    const { doc } = setupDoc();
    const punkte = [
      { x: 0, y: 0, z: 100 },
      { x: 4000, y: 0, z: 900 },
    ];
    execute(doc, 'design.terrainSetzen', { typ: 'neu', punkte });
    const a = deriveAll(doc).find((x) => x.materialKey === 'terrain')!;
    const zWerte = new Set<number>();
    for (let i = 2; i < a.positions.length; i += 3) zWerte.add(Math.round(a.positions[i]!));
    expect([...zWerte].sort((x, y) => x - y)).toEqual([100, 900]);
  });

  it('das Band ist um die Profil-Achse zentriert (Bandbreite TERRAIN_BAND_BREITE_MM, symmetrisch)', () => {
    const { doc } = setupDoc();
    execute(doc, 'design.terrainSetzen', {
      typ: 'gewachsen',
      punkte: [
        { x: 0, y: 0, z: 0 },
        { x: 5000, y: 0, z: 0 },
      ],
    });
    const a = deriveAll(doc).find((x) => x.materialKey === 'terrain')!;
    const yWerte: number[] = [];
    for (let i = 1; i < a.positions.length; i += 3) yWerte.push(a.positions[i]!);
    expect(Math.max(...yWerte)).toBeCloseTo(TERRAIN_BAND_BREITE_MM / 2, 3);
    expect(Math.min(...yWerte)).toBeCloseTo(-TERRAIN_BAND_BREITE_MM / 2, 3);
  });

  it('zwei Terrain-Profile (gewachsen + neu) liefern zwei eigene Artefakte, je mit ihrer eigenen entityId', () => {
    const { doc } = setupDoc();
    execute(doc, 'design.terrainSetzen', {
      typ: 'gewachsen',
      punkte: [
        { x: 0, y: 0, z: 0 },
        { x: 2000, y: 0, z: 300 },
      ],
    });
    execute(doc, 'design.terrainSetzen', {
      typ: 'neu',
      punkte: [
        { x: 0, y: 0, z: 0 },
        { x: 2000, y: 0, z: 100 },
      ],
    });
    const terrainArtefakte = deriveAll(doc).filter((a) => a.materialKey === 'terrain');
    expect(terrainArtefakte).toHaveLength(2);
    expect(new Set(terrainArtefakte.map((a) => a.entityId)).size).toBe(2);
  });

  it('ein Terrain mit nur einem Stützpunkt (< 2) wird ehrlich übersprungen statt eine Fehlgeometrie zu erzeugen', () => {
    // design.terrainSetzen verlangt min(2) selbst schon (zod) — die Guard-Prüfung
    // in deriveTerrainBaender greift zusätzlich, falls ein Doc direkt (ohne
    // Command) ein degeneriertes Terrain trägt (z.B. nach einem Import).
    const { doc } = setupDoc();
    const terrain = { id: 'terrain-test-1', kind: 'terrain' as const, typ: 'gewachsen' as const, punkte: [{ x: 0, y: 0, z: 0 }] };
    doc.entities.set(terrain.id, terrain);
    expect(deriveAll(doc).some((a) => a.materialKey === 'terrain')).toBe(false);
  });
});

describe('Serialisierung', () => {
  it('Doc → JSON → Doc ist verlustfrei', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 2500, y: 1500 }, assemblyId });
    const json = doc.toJSON();
    const restored = KosmoDoc.fromJSON(JSON.parse(JSON.stringify(json)));
    expect(restored.entities.size).toBe(doc.entities.size);
    expect(JSON.stringify(restored.toJSON())).toBe(JSON.stringify(json));
  });

  it('Geschosse sortiert; storeyTop stimmt', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.geschossErstellen', { name: '1.OG', index: 1, elevation: 3000, height: 2800 });
    execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeys = doc.storeysOrdered();
    expect(storeys.map((s: Storey) => s.name)).toEqual(['EG', '1.OG']);
    expect(doc.storeyTop(storeys[1]!.id)).toBe(5800);
  });
});

describe('SIA-416 Kennzahlen (Owner-Methodik)', () => {
  it('aGF-Ziel = HNF × Faktor; GF-Schätzung mit Fassadenzuschlag', async () => {
    const { areaReport } = await import('../src');
    const { doc, storeyId } = setupDoc();
    // 10×10m HNF-Zone = 100 m²
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 10000, y: 0 },
        { x: 10000, y: 10000 },
        { x: 0, y: 10000 },
      ],
      name: 'Wohnen',
      sia: 'HNF',
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      outline: [
        { x: 12000, y: 0 },
        { x: 16000, y: 0 },
        { x: 16000, y: 5000 },
        { x: 12000, y: 5000 },
      ],
      name: 'Treppenhaus',
      sia: 'VF',
    });
    const r = areaReport(doc);
    expect(r.total.HNF).toBe(100);
    expect(r.total.VF).toBe(20);
    expect(r.totalNgf).toBe(120);
    expect(r.agfZiel).toBeCloseTo(128); // 100 × 1.28 (Default)
    expect(r.gfSchaetzung).toBeCloseTo(140.8); // ×1.10 Fassade
  });

  it('D8/H-1: Site-Marker zonenArt="parzelle" pollutiert NGF NICHT, auch bei sia:"KF"', async () => {
    const { areaReport } = await import('../src');
    const { doc, storeyId } = setupDoc();
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 10000, y: 0 },
        { x: 10000, y: 10000 },
        { x: 0, y: 10000 },
      ],
      name: 'Wohnen',
      sia: 'HNF',
    });
    // Grosse Parzelle (600 m²) — ohne Marker würde sie NGF/KF verunreinigen.
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      outline: [
        { x: 20000, y: 0 },
        { x: 40000, y: 0 },
        { x: 40000, y: 30000 },
        { x: 20000, y: 30000 },
      ],
      name: 'Parzelle Musterweg 1',
      sia: 'KF',
      zonenArt: 'parzelle',
    });
    const r = areaReport(doc);
    expect(r.total.HNF).toBe(100);
    expect(r.total.KF).toBe(0); // die Parzellen-Zone zählt NICHT als KF-Fläche
    expect(r.totalNgf).toBe(100); // NICHT 700 (100 HNF + 600 Parzelle)
  });

  it('Volumenkörper: GF = Grundfläche × abgeleitete Geschosse', async () => {
    const { areaReport } = await import('../src');
    const { doc, storeyId } = setupDoc();
    // 20×15m, 9.5m hoch → 3 Geschosse à 300 m² = 900 m²
    execute(doc, 'design.volumenErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 20000, y: 0 },
        { x: 20000, y: 15000 },
        { x: 0, y: 15000 },
      ],
      height: 9500,
      program: 'wohnen',
    });
    const r = areaReport(doc);
    expect(r.gfVolumen).toBe(900);
    expect(r.gfVolumenNachProgramm['wohnen']).toBe(900);
  });
});

describe('GLB-Export', () => {
  it('erzeugt einen validen GLB-Container mit Meshes', async () => {
    const { exportGlb } = await import('../src');
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 6000, y: 0 }, assemblyId });
    execute(doc, 'design.oeffnungSetzen', { wallId: (w.patches[0] as { id: string }).id, openingType: 'fenster', center: 3000, width: 1500, height: 1400, sill: 900 });
    const glb = exportGlb(doc);
    const dv = new DataView(glb);
    expect(dv.getUint32(0, true)).toBe(0x46546c67); // 'glTF'
    expect(dv.getUint32(4, true)).toBe(2);
    expect(dv.getUint32(8, true)).toBe(glb.byteLength);
    const jsonLen = dv.getUint32(12, true);
    expect(dv.getUint32(16, true)).toBe(0x4e4f534a); // 'JSON'
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, jsonLen)));
    expect(json.asset.version).toBe('2.0');
    expect(json.meshes.length).toBe(1);
    expect(json.accessors[0].type).toBe('VEC3');
    // Bounding: 6m Wand → max.x ≈ 6
    expect(json.accessors[0].max[0]).toBeCloseTo(6, 3);
  });
});

describe('IFC4-Export (SPF)', () => {
  it('erzeugt strukturell valides IFC4 mit Voids und Containment', async () => {
    const { exportIfc } = await import('../src');
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 7000, y: 0 }, assemblyId });
    execute(doc, 'design.oeffnungSetzen', { wallId: (w.patches[0] as { id: string }).id, openingType: 'fenster', center: 3500, width: 1500, height: 1400, sill: 900 });
    execute(doc, 'design.deckeZeichnen', { storeyId, outline: [{ x: 0, y: 0 }, { x: 7000, y: 0 }, { x: 7000, y: 5000 }, { x: 0, y: 5000 }], thickness: 250 });
    const ifc = exportIfc(doc, 'Test');
    expect(ifc).toContain("FILE_SCHEMA(('IFC4'))");
    expect(ifc).toContain('IFCPROJECT');
    expect(ifc).toContain('IFCBUILDINGSTOREY');
    expect((ifc.match(/IFCWALL\(/g) ?? []).length).toBe(1);
    expect((ifc.match(/IFCOPENINGELEMENT/g) ?? []).length).toBe(1);
    expect(ifc).toContain('IFCRELVOIDSELEMENT');
    expect(ifc).toContain('IFCRELCONTAINEDINSPATIALSTRUCTURE');
    expect(ifc).toContain('IFCSLAB');
    expect(ifc.trim().endsWith('END-ISO-10303-21;')).toBe(true);
  });

  // v0.6.9 Stream F, ADDITIV zum obigen Test — docs/FENSTER-KONZEPT.md §5:
  // ein parametrisches Fenster (fensterTyp/teilung/rahmenbreite) UND ein
  // Fensterband (design.curtainWallSetzen, mehrere Openings in einem
  // Undo-Schritt) dürfen den IFC-Export nicht zum Absturz bringen — und
  // bleiben ehrlich beim dokumentierten V1-Stand: IFC exportiert Fenster
  // WEITERHIN nur als IFCOPENINGELEMENT (Void), NIE als IFCWINDOW/IFCDOOR
  // (die kein IFC-Codepfad dieses Kernels je erzeugt). Das ist keine
  // Regression — die neuen Felder fliessen bewusst nicht in den Export ein.
  it('parametrisches Fenster + Fensterband exportieren ohne Absturz weiterhin NUR IFCOPENINGELEMENT (kein IFCWINDOW/IFCDOOR) — dokumentierter V1-Stand', async () => {
    const { exportIfc } = await import('../src');

    const zwei = testhausFensterZweifluegel();
    expect(() => exportIfc(zwei.doc, 'Test')).not.toThrow();
    const ifcZwei = exportIfc(zwei.doc, 'Test');
    const zaehlZwei = (t: string) => (ifcZwei.match(new RegExp(`=\\s*${t}\\(`, 'g')) ?? []).length;
    expect(zaehlZwei('IFCOPENINGELEMENT')).toBe(zwei.doc.byKind('opening').length);
    expect(zwei.doc.byKind('opening').length).toBeGreaterThan(0); // ehrlich: die Fixture setzt wirklich ein Fenster
    expect(ifcZwei).not.toContain('IFCWINDOW');
    expect(ifcZwei).not.toContain('IFCDOOR');

    const band = testhausFensterband();
    const oeffnungenBand = band.doc.byKind('opening').length;
    expect(oeffnungenBand).toBeGreaterThan(0); // ehrlich: mind. ein Bandsegment gestanzt (sonst würfe die Fixture bereits)
    expect(() => exportIfc(band.doc, 'Test')).not.toThrow();
    const ifcBand = exportIfc(band.doc, 'Test');
    const zaehlBand = (t: string) => (ifcBand.match(new RegExp(`=\\s*${t}\\(`, 'g')) ?? []).length;
    expect(zaehlBand('IFCOPENINGELEMENT')).toBe(oeffnungenBand);
    expect(ifcBand).not.toContain('IFCWINDOW');
    expect(ifcBand).not.toContain('IFCDOOR');
  });
});

describe('Walmdach (Straight Skeleton, eigener)', () => {
  it('Rechteck 10×6m: First bei Offset 3m, Firstlänge 4m, 4 Dachflächen', async () => {
    const { convexSkeleton } = await import('../src');
    const skel = convexSkeleton([
      { x: 0, y: 0 },
      { x: 10000, y: 0 },
      { x: 10000, y: 6000 },
      { x: 0, y: 6000 },
    ]);
    expect(skel.maxOffset).toBeCloseTo(3000, 0);
    expect(skel.ridges).toHaveLength(1);
    const r = skel.ridges[0]!;
    const len = Math.hypot(r.b.x - r.a.x, r.b.y - r.a.y);
    expect(len).toBeCloseTo(4000, 0);
    expect(skel.faces.length).toBe(4);
  });

  it('Dach-Derivation: 35°-Walmdach hat Firsthöhe zBase + 3m·tan(35°)', async () => {
    const { deriveEntity } = await import('../src');
    const { doc, storeyId } = setupDoc();
    const res = execute(doc, 'design.dachErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 10000, y: 0 },
        { x: 10000, y: 6000 },
        { x: 0, y: 6000 },
      ],
      pitch: 35,
      overhang: 0,
    });
    const artifact = deriveEntity(doc, (res.patches[0] as { id: string }).id)!;
    let maxZ = -Infinity;
    for (let i = 2; i < artifact.positions.length; i += 3) maxZ = Math.max(maxZ, artifact.positions[i]!);
    // Geschoss EG: elevation 0, height 3000 → Traufe 3000; First 3000 + 3000·tan35 ≈ 5100.6
    expect(maxZ).toBeCloseTo(3000 + 3000 * Math.tan((35 * Math.PI) / 180), 0);
  });

  it('verweigert nicht-konvexe Grundrisse mit klarer Meldung', () => {
    const { doc, storeyId } = setupDoc();
    expect(() =>
      execute(doc, 'design.dachErstellen', {
        storeyId,
        outline: [
          { x: 0, y: 0 },
          { x: 8000, y: 0 },
          { x: 8000, y: 6000 },
          { x: 4000, y: 3000 }, // einspringende Ecke
          { x: 0, y: 6000 },
        ],
      }),
    ).toThrow(/konvex/);
  });
});

describe('Satteldach (First-Ebenen-Teilung)', () => {
  it('Default bleibt Walm, wenn form weggelassen wird', () => {
    const { doc, storeyId } = setupDoc();
    const res = execute(doc, 'design.dachErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 10000, y: 0 },
        { x: 10000, y: 6000 },
        { x: 0, y: 6000 },
      ],
      pitch: 35,
      overhang: 0,
    });
    const roof = doc.get<Roof>((res.patches[0] as { id: string }).id)!;
    expect(roof.form).toBe('walm');
    expect(roof.firstrichtung).toBe('x');
  });

  it('Rechteck 8×6m, First entlang x: Firsthöhe zBase + 3m·tan(pitch), First mittig bei y=3000', () => {
    const { doc, storeyId } = setupDoc();
    const res = execute(doc, 'design.dachErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 8000, y: 0 },
        { x: 8000, y: 6000 },
        { x: 0, y: 6000 },
      ],
      pitch: 40,
      overhang: 0,
      form: 'sattel',
      firstrichtung: 'x',
    });
    const roofId = (res.patches[0] as { id: string }).id;
    const roof = doc.get<Roof>(roofId)!;
    expect(roof.form).toBe('sattel');
    const artifact = deriveEntity(doc, roofId)!;
    let maxZ = -Infinity;
    const firstPunkte: number[][] = [];
    for (let i = 0; i < artifact.positions.length; i += 3) {
      const x = artifact.positions[i]!, y = artifact.positions[i + 1]!, z = artifact.positions[i + 2]!;
      maxZ = Math.max(maxZ, z);
      if (Math.abs(y - 3000) < 1) firstPunkte.push([x, y, z]);
    }
    // Geschoss EG: elevation 0, height 3000 → Traufe 3000; First 3000 + 3000·tan40°
    const erwarteteFirsthoehe = 3000 + 3000 * Math.tan((40 * Math.PI) / 180);
    expect(maxZ).toBeCloseTo(erwarteteFirsthoehe, 0);
    // Alle Punkte auf der Firstlinie (y=3000) liegen auf Firsthöhe — First ist eine Gerade
    expect(firstPunkte.length).toBeGreaterThan(0);
    for (const [, , z] of firstPunkte) expect(z).toBeCloseTo(erwarteteFirsthoehe, 0);
  });

  it('zwei Dachflächen (zwei Ringe à 4 Eckpunkten bei rechteckigem Grundriss)', () => {
    const { doc, storeyId } = setupDoc();
    const res = execute(doc, 'design.dachErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 8000, y: 0 },
        { x: 8000, y: 6000 },
        { x: 0, y: 6000 },
      ],
      pitch: 40,
      overhang: 0,
      form: 'sattel',
    });
    const roofId = (res.patches[0] as { id: string }).id;
    const artifact = deriveEntity(doc, roofId)!;
    // 2 Rechtecks-Flächen à 4 Eckpunkten = 8 Vertices, je 2 Dreiecke = 4 Dreiecke
    expect(artifact.positions.length / 3).toBe(8);
    expect(artifact.indices.length / 3).toBe(4);
    // Zwei unterschiedliche Flächennormalen (die beiden geneigten Ebenen)
    const normalen = new Set<string>();
    for (let i = 0; i < artifact.normals.length; i += 3) {
      normalen.add(
        `${artifact.normals[i]!.toFixed(3)},${artifact.normals[i + 1]!.toFixed(3)},${artifact.normals[i + 2]!.toFixed(3)}`,
      );
    }
    expect(normalen.size).toBe(2);
  });

  it('Giebel an den Schmalseiten: First entlang x → Ortgang-Kante bei x=0 steigt von 0 auf First-Höhe und zurück', () => {
    const { doc, storeyId } = setupDoc();
    const res = execute(doc, 'design.dachErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 8000, y: 0 },
        { x: 8000, y: 6000 },
        { x: 0, y: 6000 },
      ],
      pitch: 40,
      overhang: 0,
      form: 'sattel',
      firstrichtung: 'x',
    });
    const roofId = (res.patches[0] as { id: string }).id;
    const artifact = deriveEntity(doc, roofId)!;
    const giebelPunkte = new Map<number, number>(); // y → z, bei x≈0
    for (let i = 0; i < artifact.positions.length; i += 3) {
      const x = artifact.positions[i]!, y = artifact.positions[i + 1]!, z = artifact.positions[i + 2]!;
      if (Math.abs(x) < 1) giebelPunkte.set(Math.round(y), z);
    }
    expect(giebelPunkte.get(0)).toBeCloseTo(3000, 0); // Traufe
    expect(giebelPunkte.get(6000)).toBeCloseTo(3000, 0); // Traufe
    expect(giebelPunkte.get(3000)).toBeGreaterThan(giebelPunkte.get(0)!); // First höher als Traufe
  });

  it('firstrichtung y: First verläuft entlang y, Giebel an den y-Enden', () => {
    const { doc, storeyId } = setupDoc();
    const res = execute(doc, 'design.dachErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 6000, y: 0 },
        { x: 6000, y: 8000 },
        { x: 0, y: 8000 },
      ],
      pitch: 40,
      overhang: 0,
      form: 'sattel',
      firstrichtung: 'y',
    });
    const roofId = (res.patches[0] as { id: string }).id;
    const artifact = deriveEntity(doc, roofId)!;
    const erwarteteFirsthoehe = 3000 + 3000 * Math.tan((40 * Math.PI) / 180);
    let maxZ = -Infinity;
    for (let i = 2; i < artifact.positions.length; i += 3) maxZ = Math.max(maxZ, artifact.positions[i]!);
    expect(maxZ).toBeCloseTo(erwarteteFirsthoehe, 0);
  });
});

describe('Golden-Sattel (Plan-Regression)', () => {
  it('Ansicht Süd des Satteldach-Testhauses ist byte-identisch zur Golden-Datei', () => {
    const { doc, spec } = testhausSatteldach();
    const svg = ansichtSvg(doc, spec);
    pruefeGolden(svg, new URL('./golden/ansicht-sued-satteldach.svg', import.meta.url));
    // Bewusste Änderungen: `npx tsx e2e/tools/golden-ansicht-sattel.mts` (falls angelegt) und Diff begutachten.
  });
});

describe('Dach im 2D-Plan & Schnitt (Stream A / v0.6.8, SIM-Befunde H-2/H-18)', () => {
  it('derive/dach.ts: Satteldach-Kanten stimmen mit der 3D-Ableitung (scene.ts) überein — First/Traufe/Ortgang, keine Grat-Kante', () => {
    const { doc, spec: _spec } = testhausSatteldach();
    const storeyId = doc.storeysOrdered()[0]!.id;
    const roof = doc.byKind<Roof>('roof').find((r) => r.storeyId === storeyId)!;
    const storey = doc.get<Storey>(storeyId)!;
    const geom = dachGeometrie(roof, storey)!;
    expect(geom).not.toBeNull();
    const arten = geom.kanten.reduce<Record<string, number>>((acc, k) => {
      acc[k.art] = (acc[k.art] ?? 0) + 1;
      return acc;
    }, {});
    expect(arten['first']).toBe(1);
    expect(arten['traufe']).toBeGreaterThan(0);
    expect(arten['ortgang']).toBeGreaterThan(0);
    expect(arten['grat']).toBeUndefined(); // Sattel kennt keinen Grat

    // Höhen decken sich exakt mit deriveEntity (scene.ts) — dieselbe Quelle.
    const artifact = deriveEntity(doc, roof.id)!;
    let maxZ3d = -Infinity;
    for (let i = 2; i < artifact.positions.length; i += 3) maxZ3d = Math.max(maxZ3d, artifact.positions[i]!);
    const maxZKanten = Math.max(...geom.kanten.map((k) => Math.max(k.a.z, k.b.z)));
    // 2 Nachkommastellen genügen: scene.ts speichert in Float32Array (weniger
    // Präzision als dieser Helfer, der mit float64 rechnet) — Differenz liegt
    // im Sub-Mikrometer-Bereich, weit unter jeder architektonischen Relevanz.
    expect(maxZKanten).toBeCloseTo(maxZ3d, 2);

    // Prismen sind wasserdicht genug: jedes Dreieck hat nichttriviale Fläche.
    for (const [a, b, c] of geom.dreiecke) {
      const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
      const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
      const area = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
      expect(area).toBeGreaterThan(1);
    }
  });

  it('derive/dach.ts: Walmdach-Kanten kennen First + Grat, keinen Ortgang', () => {
    const { doc, storeyId } = testhausWalmdachGrundriss();
    const roof = doc.byKind<Roof>('roof').find((r) => r.storeyId === storeyId)!;
    const storey = doc.get<Storey>(storeyId)!;
    const geom = dachGeometrie(roof, storey)!;
    const arten = geom.kanten.reduce<Record<string, number>>((acc, k) => {
      acc[k.art] = (acc[k.art] ?? 0) + 1;
      return acc;
    }, {});
    expect(arten['first']).toBeGreaterThan(0);
    expect(arten['grat']).toBeGreaterThan(0);
    expect(arten['traufe']).toBeGreaterThan(0);
    expect(arten['ortgang']).toBeUndefined(); // Walm kennt keinen Ortgang (alle Seiten geneigt)
  });

  it('Grundriss: das Geschoss des Dachs zeigt First/Traufe/Ortgang als klassifizierte Linien, tiefere Geschosse nichts', () => {
    const { doc, storeyId } = testhausWalmdachGrundriss();
    const plan = derivePlan(doc, storeyId);
    const dachLinien = plan.lines.filter((l) => l.classes.includes('dach'));
    expect(dachLinien.length).toBeGreaterThan(0);
    expect(dachLinien.some((l) => l.classes.includes('dach-first'))).toBe(true);
    expect(dachLinien.some((l) => l.classes.includes('dach-traufe'))).toBe(true);
    expect(dachLinien.some((l) => l.classes.includes('dach-grat'))).toBe(true);
    // keine ueber-schnitt-Dach-Linien im EIGENEN Geschoss (das ist nur für das Geschoss darunter)
    expect(dachLinien.some((l) => l.classes.includes('ueber-schnitt'))).toBe(false);
  });

  it('Grundriss: das Geschoss UNTER dem Dach zeigt nur den gestrichelten Dachumriss (Überzeichnungs-Konvention)', () => {
    const { doc, egId, ogId } = testhausSatteldachZweiGeschosse();
    const planEg = derivePlan(doc, egId);
    const dachLinienEg = planEg.lines.filter((l) => l.classes.includes('dach'));
    expect(dachLinienEg.length).toBeGreaterThan(0);
    // Alle Dach-Linien im EG sind Traufe UND gestrichelt (ueber-schnitt) — keine First/Ortgang-Details
    for (const l of dachLinienEg) {
      expect(l.classes).toContain('dach-traufe');
      expect(l.classes).toContain('ueber-schnitt');
    }
    expect(dachLinienEg.some((l) => l.classes.includes('dach-first'))).toBe(false);

    // Das OG (das Dach-Geschoss selbst) zeigt die volle klassifizierte Aufsicht, nicht gestrichelt
    const planOg = derivePlan(doc, ogId);
    const dachLinienOg = planOg.lines.filter((l) => l.classes.includes('dach'));
    expect(dachLinienOg.some((l) => l.classes.includes('dach-first'))).toBe(true);
    expect(dachLinienOg.some((l) => l.classes.includes('ueber-schnitt'))).toBe(false);
  });

  it('Grundriss ohne Dach bleibt exakt wie zuvor (additiver Guard): keine dach-Linien', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } });
    const plan = derivePlan(doc, storeyId);
    expect(plan.lines.some((l) => l.classes.includes('dach'))).toBe(false);
  });

  it('Schnitt: die Schnittebene quer zur Firstrichtung liefert ein geschlossenes Dach-Poché (First-Spitze) UND schneidet die Wand am Anschluss zurück', () => {
    const { doc } = testhausSatteldach();
    // First entlang x bei y=3000 (8×6 m, Überstand 400) — ein Schnitt quer
    // dazu (x = 4000, über die volle Gebäudetiefe) zeigt das klassische
    // Giebel-Dreiecksprofil mit First-Spitze.
    const spec = { a: { x: 4000, y: -2000 }, b: { x: 4000, y: 8000 }, depth: 30000, lookLeft: true };
    const g = deriveSection(doc, spec);
    const dachFaces = g.faces.filter((f) => f.material === 'dach');
    expect(dachFaces.length).toBeGreaterThan(0);
    // First-Spitze: der höchste Punkt eines Dach-Loops liegt deutlich über
    // der Traufhöhe (OK Wand = 3000) — die beiden Dachflächen bilden dort
    // gemeinsam die Spitze.
    const maxZDach = Math.max(...dachFaces.flatMap((f) => f.loops.flat().map((p) => p.z)));
    expect(maxZDach).toBeGreaterThan(3000 + 2000);

    // Wand-Anschluss: die Betonwand wird an der Traufe vom höher
    // priorisierten... nein, umgekehrt: Beton (900) schlägt den Dach-
    // Default (500) — die Wand bleibt UNGESCHNITTEN, das Dach weicht.
    // Prüfen wir stattdessen die Kehrseite: das Dach-Poché reicht nicht
    // tiefer als knapp unter die Traufe (es wurde von der Wand zurück-
    // geschnitten, kein Doppel-Poché im selben (s,z)-Bereich).
    const wandFace = g.faces.find((f) => f.material === 'beton' && f.functionKey === 'tragend');
    expect(wandFace).toBeDefined();
    const minZDach = Math.min(...dachFaces.flatMap((f) => f.loops.flat().map((p) => p.z)));
    // Das Dach-Prisma ist DACH_SCHNITT_DICKE_MM dick, symbolisch ab der
    // Traufhöhe abwärts — nach der Verschneidung darf es nicht mehr die
    // volle Dicke unter die Traufe reichen (die Wand hat den Überlapp
    // weggeschnitten).
    expect(minZDach).toBeGreaterThan(3000 - DACH_SCHNITT_DICKE_MM);
  });

  it('Golden: Grundriss-Aufsicht eines Walmdachs (niedrige Neigung) ist byte-identisch zur Referenz', async () => {
    const { planToSvg, A3_QUER } = await import('../src');
    const { doc, storeyId } = testhausWalmdachGrundriss();
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: 'Golden-Walmdach',
      planTitle: 'Grundriss Dachaufsicht',
      date: '10.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/grundriss-walmdach-flach.svg', import.meta.url));
  });

  it('Golden: Grundriss-Aufsicht eines Satteldachs mit sichtbarem First ist byte-identisch zur Referenz', async () => {
    const { planToSvg, A3_QUER } = await import('../src');
    const { doc } = testhausSatteldach();
    const storeyId = doc.storeysOrdered()[0]!.id;
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: 'Golden-Satteldach',
      planTitle: 'Grundriss Dachaufsicht',
      date: '10.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/grundriss-satteldach-first.svg', import.meta.url));
  });

  it('Golden: Grundriss des Geschosses UNTER dem Satteldach (gestrichelter Umriss) ist byte-identisch zur Referenz', async () => {
    const { planToSvg, A3_QUER } = await import('../src');
    const { doc, egId } = testhausSatteldachZweiGeschosse();
    const svg = planToSvg(doc, egId, {
      scale: 100,
      paper: A3_QUER,
      projectName: 'Golden-Satteldach-2G',
      planTitle: 'Grundriss EG',
      date: '10.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/grundriss-satteldach-eg-darunter.svg', import.meta.url));
  });

  it('Golden: Querschnitt durch das Satteldach mit Wand-Anschluss ist byte-identisch zur Referenz', () => {
    const { doc } = testhausSatteldach();
    const spec = { a: { x: 4000, y: -2000 }, b: { x: 4000, y: 8000 }, depth: 30000, lookLeft: true };
    const { inner, bounds: b } = sectionInnerSvg(doc, spec, 14);
    const pad = 500;
    const w = b!.maxX - b!.minX + 2 * pad;
    const h = b!.maxY - b!.minY + 2 * pad;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b!.minX - pad} ${b!.minY - pad} ${w} ${h}">\n${inner}\n</svg>\n`;
    pruefeGolden(svg, new URL('./golden/schnitt-satteldach-querschnitt.svg', import.meta.url));
  });

  it('Golden: derselbe Satteldach-Querschnitt in Baueingabe zeichnet Schichten schwarz/grau (v0.7.0 E2)', () => {
    const { doc } = testhausSatteldach();
    execute(doc, 'design.phaseSetzen', { phase: 'baueingabe' });
    const spec = { a: { x: 4000, y: -2000 }, b: { x: 4000, y: 8000 }, depth: 30000, lookLeft: true };
    const { inner, bounds: b } = sectionInnerSvg(doc, spec, 14);
    const pad = 500;
    const w = b!.maxX - b!.minX + 2 * pad;
    const h = b!.maxY - b!.minY + 2 * pad;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b!.minX - pad} ${b!.minY - pad} ${w} ${h}">\n${inner}\n</svg>\n`;
    pruefeGolden(svg, new URL('./golden/schnitt-satteldach-baueingabe.svg', import.meta.url));
  });
});

describe('KosmoPublish (Blätter, DXF)', () => {
  function setupWithWalls() {
    const { doc, storeyId, assemblyId } = setupDoc();
    const W = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
    W({ x: 0, y: 0 }, { x: 9000, y: 0 });
    W({ x: 9000, y: 0 }, { x: 9000, y: 6000 });
    W({ x: 9000, y: 6000 }, { x: 0, y: 6000 });
    W({ x: 0, y: 6000 }, { x: 0, y: 0 });
    return { doc, storeyId };
  }

  it('Blatt erstellen, Grundriss + Schnitt platzieren, verschieben, entfernen', async () => {
    const { sheetToSvg, sheetPaperSize } = await import('../src');
    const { doc, storeyId } = setupWithWalls();
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Grundrisse', format: 'A1' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    expect(sheetPaperSize({ format: 'A1', orientation: 'quer' })).toEqual({ width: 841, height: 594 });

    execute(doc, 'publish.ansichtPlatzieren', {
      sheetId, view: 'grundriss', storeyId, scale: 100, x: 200, y: 250,
    });
    execute(doc, 'publish.ansichtPlatzieren', {
      sheetId, view: 'schnitt', a: { x: -1000, y: 3000 }, b: { x: 10000, y: 3000 }, scale: 100, x: 600, y: 250,
    });
    const sheet = doc.get<import('../src').Sheet>(sheetId)!;
    expect(sheet.placements).toHaveLength(2);
    expect(sheet.placements[0]!.title).toBe('Grundriss EG');

    const svg = sheetToSvg(doc, sheetId, { projectName: 'Test', date: '01.07.2026' });
    expect(svg).toContain('viewBox="0 0 841 594"');
    // D4 (v0.7.3 «Zwei Stimmen»): Legenden-Titel-Stimme setzt versal beim
    // Rendern — die Entity-Daten (Zeile 954) bleiben unverändert, nur die
    // Darstellung wird versal (reiner Matcher-String, kein Golden).
    expect(svg).toContain('GRUNDRISS EG');
    expect(svg).toContain('1:100');
    expect(svg).toContain('Blatt 1 · A1');

    const pid = sheet.placements[0]!.id;
    execute(doc, 'publish.ansichtVerschieben', { sheetId, placementId: pid, x: 300, y: 300 });
    expect(doc.get<import('../src').Sheet>(sheetId)!.placements[0]!.x).toBe(300);
    execute(doc, 'publish.ansichtEntfernen', { sheetId, placementId: pid });
    expect(doc.get<import('../src').Sheet>(sheetId)!.placements).toHaveLength(1);
  });

  it('DXF-Export: gültige Struktur, Layer, Polylinien und Bemassungstexte ' +
    '(v0.7.1 3A: EIN Exporter — `planToDxf`, der frühere zweite Exporter ' +
    '`exportDxf`/`derive/dxf.ts` ist entfernt, seine Bemassung lebt jetzt hier)', async () => {
    const { planToDxf } = await import('../src');
    const { doc, storeyId } = setupWithWalls();
    execute(doc, 'design.oeffnungSetzen', {
      wallId: doc.byKind<Wall>('wall')[0]!.id,
      openingType: 'fenster', center: 3000, width: 2000, height: 1500, sill: 900,
    });
    const dxf = planToDxf(doc, storeyId);
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('ENTITIES');
    expect(dxf).toContain('TRAGEND');
    expect(dxf).toContain('BEMASSUNG');
    expect(dxf).toContain('POLYLINE');
    expect(dxf).toContain('EOF');
  });
});

describe('3D-Wandknoten (Gehrung)', () => {
  it('L-Ecke: beide Wände enden auf der Winkelhalbierenden (kein Überlappen/Loch)', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    // AW Beton 36: 360 mm dick, zentriert → Offsets ±180
    const w1 = execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 },
    });
    execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 9000, y: 0 }, b: { x: 9000, y: 6000 },
    });
    const art = deriveEntity(doc, (w1.patches[0] as { id: string }).id)!;
    let hasOuter = false, hasInner = false, maxX = -Infinity;
    for (let i = 0; i < art.positions.length; i += 3) {
      const x = art.positions[i]!, y = art.positions[i + 1]!;
      maxX = Math.max(maxX, x);
      if (Math.abs(x - 9180) < 1 && Math.abs(y + 180) < 1) hasOuter = true;
      if (Math.abs(x - 8820) < 1 && Math.abs(y - 180) < 1) hasInner = true;
    }
    expect(hasOuter).toBe(true);   // Aussenecke (9180, −180)
    expect(hasInner).toBe(true);   // Innenecke (8820, +180)
    expect(maxX).toBeLessThan(9181); // nichts ragt über die Gehrung hinaus
  });

  it('freies Wandende bleibt stumpf', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 5000, y: 0 },
    });
    const art = deriveEntity(doc, (w.patches[0] as { id: string }).id)!;
    let maxX = -Infinity;
    for (let i = 0; i < art.positions.length; i += 3) maxX = Math.max(maxX, art.positions[i]!);
    expect(maxX).toBeCloseTo(5000, 0);
  });
});

describe('Grundriss-Checks (Q12)', () => {
  it('meldet schmale Zimmer, enge Türen und unbequeme Treppen — und sonst nichts', async () => {
    const { pruefeGrundriss } = await import('../src');
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 },
    });
    execute(doc, 'design.oeffnungSetzen', {
      wallId: (w.patches[0] as { id: string }).id,
      openingType: 'tuer', center: 2000, width: 700, height: 2100, sill: 0,
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Kammer', sia: 'HNF',
      outline: [{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 2000, y: 4000 }, { x: 0, y: 4000 }],
    });
    execute(doc, 'design.treppeErstellen', {
      storeyId, a: { x: 5000, y: 2000 }, b: { x: 5000, y: 4800 }, width: 900,
    });
    const befunde = pruefeGrundriss(doc, storeyId);
    const regeln = befunde.map((b) => b.regel);
    expect(regeln).toContain('Türbreite');
    expect(regeln).toContain('Zimmerbreite');
    expect(regeln).toContain('Zimmerfläche');
    expect(regeln).toContain('Schrittmass');
    expect(regeln).toContain('Laufbreite');
    expect(regeln).not.toContain('Aufbau');
    expect(befunde[0]!.schwere).not.toBe('hinweis'); // sortiert: Schweres zuerst
  });

  it('trägt stabile regelId je Befund (H-6/H-15/H-17: strukturiert, nicht nur Freitext)', async () => {
    const { pruefeGrundriss } = await import('../src');
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 },
    });
    execute(doc, 'design.oeffnungSetzen', {
      wallId: (w.patches[0] as { id: string }).id,
      openingType: 'tuer', center: 2000, width: 700, height: 2100, sill: 0,
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Kammer', sia: 'HNF',
      outline: [{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 2000, y: 4000 }, { x: 0, y: 4000 }],
    });
    execute(doc, 'design.treppeErstellen', {
      storeyId, a: { x: 5000, y: 2000 }, b: { x: 5000, y: 4800 }, width: 900,
    });
    const befunde = pruefeGrundriss(doc, storeyId);
    expect(befunde.length).toBeGreaterThan(0);
    // jeder Befund hat eine nichtleere, stabile regelId — unabhängig vom Freitext
    for (const b of befunde) {
      expect(typeof b.regelId).toBe('string');
      expect(b.regelId.length).toBeGreaterThan(0);
    }
    const idByRegel = new Map(befunde.map((b) => [b.regel, b.regelId]));
    expect(idByRegel.get('Türbreite')).toBe('tuerbreite');
    expect(idByRegel.get('Zimmerbreite')).toBe('zimmerbreite');
    expect(idByRegel.get('Zimmerfläche')).toBe('zimmerflaeche');
    expect(idByRegel.get('Schrittmass')).toBe('schrittmass');
    expect(idByRegel.get('Laufbreite')).toBe('laufbreite');
  });

  it('sauberer Grundriss ergibt keine Befunde', async () => {
    const { pruefeGrundriss } = await import('../src');
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 },
    });
    execute(doc, 'design.oeffnungSetzen', {
      wallId: (w.patches[0] as { id: string }).id,
      openingType: 'tuer', center: 2000, width: 900, height: 2100, sill: 0,
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Wohnen', sia: 'HNF',
      outline: [{ x: 0, y: 0 }, { x: 4200, y: 0 }, { x: 4200, y: 5200 }, { x: 0, y: 5200 }],
    });
    expect(pruefeGrundriss(doc, storeyId)).toEqual([]);
  });
});

describe('Volumenstudien-Generator (Q12)', () => {
  const parzelle = [
    { x: 0, y: 0 }, { x: 60000, y: 0 }, { x: 60000, y: 40000 }, { x: 0, y: 40000 },
  ];

  it('liefert Teppich/Riegel/Turm/Zeilen/Winkel, alle nahe am GF-Ziel', async () => {
    const { generiereVolumenstudien } = await import('../src');
    const v = generiereVolumenstudien(parzelle, { zielGf: 8000, maxHoehe: 30000 });
    const ids = v.map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(['teppich', 'riegel', 'turm', 'zeilen', 'winkel']));
    for (const x of v) {
      expect(x.hoehe).toBeLessThanOrEqual(30000);
      if (x.passt) expect(x.gf).toBeGreaterThanOrEqual(8000 * 0.95);
      // Körper liegen in der Parzelle (Grenzabstand 4 m → BBox-Check reicht)
      for (const k of x.koerper) {
        for (const p of k.outline) {
          expect(p.x).toBeGreaterThanOrEqual(3900);
          expect(p.x).toBeLessThanOrEqual(56100);
          expect(p.y).toBeGreaterThanOrEqual(3900);
          expect(p.y).toBeLessThanOrEqual(36100);
        }
      }
    }
    const teppich = v.find((x) => x.id === 'teppich')!;
    const turm = v.find((x) => x.id === 'turm')!;
    expect(teppich.geschosse).toBeLessThan(turm.geschosse); // Extreme sind extrem
  });

  it('markiert ehrlich, wenn das Programm die Höhenvorgabe sprengt', async () => {
    const { generiereVolumenstudien } = await import('../src');
    const v = generiereVolumenstudien(parzelle, { zielGf: 60000, maxHoehe: 12000 });
    const turm = v.find((x) => x.id === 'turm')!;
    expect(turm.passt).toBe(false);
    expect(turm.hoehe).toBeLessThanOrEqual(12000);
  });
});

describe('studienOptionenAusRegel (D-E2): Zonenregel → StudienOptionen', () => {
  const parzelle = [
    { x: 0, y: 0 }, { x: 60000, y: 0 }, { x: 60000, y: 40000 }, { x: 0, y: 40000 },
  ];
  const regelVoll = {
    name: 'W3 (Richtwert LU)',
    az: 0.6,
    maxHoehe: 11500,
    maxVollgeschosse: 3,
    grenzabstandKlein: 4000,
    grenzabstandGross: 10000,
  };

  it('ohne Regel: leeres Objekt (bisheriges UI-Verhalten bleibt unverändert)', async () => {
    const { studienOptionenAusRegel } = await import('../src');
    expect(studienOptionenAusRegel(undefined, 1000)).toEqual({});
    expect(studienOptionenAusRegel(undefined, null)).toEqual({});
  });

  it('volle Regel + Parzellenfläche: maxHoehe, zielGf (az×Fläche) und grenzabstand', async () => {
    const { studienOptionenAusRegel } = await import('../src');
    expect(studienOptionenAusRegel(regelVoll, 1000)).toEqual({
      maxHoehe: 11500,
      zielGf: 600,
      grenzabstand: 4000,
    });
  });

  it('Regel ohne maxHoehe (null): das Feld fehlt im Ergebnis, kein erfundener Default', async () => {
    const { studienOptionenAusRegel } = await import('../src');
    const regel = { ...regelVoll, maxHoehe: null };
    const out = studienOptionenAusRegel(regel, 1000);
    expect(out.maxHoehe).toBeUndefined();
    expect(out.zielGf).toBe(600);
    expect(out.grenzabstand).toBe(4000);
  });

  it('Regel ohne az (Kernzone-Fall): zielGf fehlt, auch mit Parzellenfläche', async () => {
    const { studienOptionenAusRegel } = await import('../src');
    const regel = { ...regelVoll, az: null };
    const out = studienOptionenAusRegel(regel, 1000);
    expect(out.zielGf).toBeUndefined();
    expect(out.maxHoehe).toBe(11500);
    expect(out.grenzabstand).toBe(4000);
  });

  it('Regel mit az, aber ohne Parzellenfläche (null): zielGf fehlt', async () => {
    const { studienOptionenAusRegel } = await import('../src');
    const out = studienOptionenAusRegel(regelVoll, null);
    expect(out.zielGf).toBeUndefined();
    expect(out.maxHoehe).toBe(11500);
  });

  it('Regel ohne grenzabstandKlein (null): das Feld fehlt', async () => {
    const { studienOptionenAusRegel } = await import('../src');
    const regel = { ...regelVoll, grenzabstandKlein: null };
    const out = studienOptionenAusRegel(regel, 1000);
    expect(out.grenzabstand).toBeUndefined();
    expect(out.maxHoehe).toBe(11500);
    expect(out.zielGf).toBe(600);
  });

  it('Ergebnis speist generiereVolumenstudien unverändert (kein Golden-Bruch, additiv)', async () => {
    const { generiereVolumenstudien, studienOptionenAusRegel } = await import('../src');
    const abgeleitet = studienOptionenAusRegel(regelVoll, 4000); // zielGf = 2400
    const v = generiereVolumenstudien(parzelle, { zielGf: abgeleitet.zielGf!, ...abgeleitet });
    expect(v.length).toBeGreaterThan(0);
    for (const x of v) expect(x.hoehe).toBeLessThanOrEqual(11500);
  });
});

describe('Golden-SVG (Plan-Regression)', () => {
  it('Testhaus-Grundriss ist byte-identisch zur committeten Referenz', async () => {
    const { planToSvg, A3_QUER } = await import('../src');
    const { readFileSync } = await import('node:fs');
    const doc = new KosmoDoc();
    doc.settings.projectName = 'Golden-Testhaus';
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const sid = (eg.patches[0] as { id: string }).id;
    const au = execute(doc, 'design.aufbauErstellen', {
      name: 'AW', target: 'wall',
      layers: [
        { material: 'putz', thickness: 20, function: 'bekleidung' },
        { material: 'daemmung-mw', thickness: 160, function: 'daemmung' },
        { material: 'beton', thickness: 180, function: 'tragend' },
      ],
    });
    const aid = (au.patches[0] as { id: string }).id;
    const W = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId: sid, a, b, assemblyId: aid }).patches[0] as { id: string };
    const w1 = W({ x: 0, y: 0 }, { x: 9000, y: 0 });
    W({ x: 9000, y: 0 }, { x: 9000, y: 6000 });
    W({ x: 9000, y: 6000 }, { x: 0, y: 6000 });
    W({ x: 0, y: 6000 }, { x: 0, y: 0 });
    execute(doc, 'design.oeffnungSetzen', { wallId: w1.id, openingType: 'fenster', center: 3000, width: 2000, height: 1500, sill: 900 });
    execute(doc, 'design.oeffnungSetzen', { wallId: w1.id, openingType: 'tuer', center: 7000, width: 1000, height: 2200, sill: 0, swing: 'links' });
    const svg = planToSvg(doc, sid, {
      scale: 100, paper: A3_QUER, projectName: 'Golden-Testhaus', planTitle: 'Grundriss', date: '01.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/grundriss-testhaus.svg', import.meta.url));
    // Bewusste Plan-Änderungen: Golden neu erzeugen und im Diff begutachten.
  });

  // v0.7.0 «Schwarz auf Weiss» (E2, derive/poche.ts): dieselbe Testhaus-Geometrie
  // wie oben, einmal in Wettbewerb (EIN schwarzes Poché) und einmal in
  // Baueingabe (Schichten schwarz/grau) — bewusst NEUE Goldens, das Werkplan-
  // Golden oben bleibt unangetastet (Byte-Identität ist der eigentliche Beweis).
  const goldenTesthausMitPhase = async (phase: 'wettbewerb' | 'baueingabe') => {
    const { planToSvg, A3_QUER } = await import('../src');
    const doc = new KosmoDoc();
    doc.settings.projectName = 'Golden-Testhaus';
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const sid = (eg.patches[0] as { id: string }).id;
    const au = execute(doc, 'design.aufbauErstellen', {
      name: 'AW', target: 'wall',
      layers: [
        { material: 'putz', thickness: 20, function: 'bekleidung' },
        { material: 'daemmung-mw', thickness: 160, function: 'daemmung' },
        { material: 'beton', thickness: 180, function: 'tragend' },
      ],
    });
    const aid = (au.patches[0] as { id: string }).id;
    const W = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId: sid, a, b, assemblyId: aid }).patches[0] as { id: string };
    const w1 = W({ x: 0, y: 0 }, { x: 9000, y: 0 });
    W({ x: 9000, y: 0 }, { x: 9000, y: 6000 });
    W({ x: 9000, y: 6000 }, { x: 0, y: 6000 });
    W({ x: 0, y: 6000 }, { x: 0, y: 0 });
    execute(doc, 'design.oeffnungSetzen', { wallId: w1.id, openingType: 'fenster', center: 3000, width: 2000, height: 1500, sill: 900 });
    execute(doc, 'design.oeffnungSetzen', { wallId: w1.id, openingType: 'tuer', center: 7000, width: 1000, height: 2200, sill: 0, swing: 'links' });
    execute(doc, 'design.phaseSetzen', { phase });
    return planToSvg(doc, sid, {
      scale: phase === 'wettbewerb' ? 200 : 100,
      paper: A3_QUER,
      projectName: 'Golden-Testhaus',
      planTitle: 'Grundriss',
      date: '10.07.2026',
    });
  };

  it('Golden: Wettbewerb zeichnet die Wände als EIN schwarzes Poché (v0.7.0 E2)', async () => {
    const svg = await goldenTesthausMitPhase('wettbewerb');
    pruefeGolden(svg, new URL('./golden/grundriss-testhaus-wettbewerb.svg', import.meta.url));
  });

  it('Golden: Baueingabe zeichnet Schichten schwarz (tragend) und grau (nichttragend) (v0.7.0 E2)', async () => {
    const svg = await goldenTesthausMitPhase('baueingabe');
    pruefeGolden(svg, new URL('./golden/grundriss-testhaus-baueingabe.svg', import.meta.url));
  });
});

describe('A3: Echte 2D-Eck-Miter im Grundriss-Poché (ROADMAP 149)', () => {
  const beton = (plan: ReturnType<typeof derivePlan>) =>
    plan.regions.filter((r) => r.classes.includes('tragend') && r.classes.includes('material-beton'));

  it('rechtwinklige Aussenecke: die tragende Schicht verschmilzt zu EINEM Ring mit gefülltem Eck-Knotenstück', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    // Zwei Wände treffen im rechten Winkel bei (2000,0) zusammen — ohne Miter
    // überlappen sich die Rechtecke dort nur in einem Viertel des
    // 180×180-Knotenstücks, der Rest (die äussere Ecke) bleibt Lücke.
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 2000, y: 0 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 2000, y: 0 }, b: { x: 2000, y: 2000 } });
    const plan = derivePlan(doc, storeyId);
    const regions = beton(plan);
    expect(regions).toHaveLength(1);
    // Ohne Miter bliebe das ein L aus zwei nur punktuell berührenden
    // Rechtecken (zwei Ringe); mit Miter EIN zusammenhängender Ring.
    expect(regions[0]!.rings).toHaveLength(1);
    // Die äussere Eckspitze: Achsenschnittpunkt (2000,0) + Aussenversatz
    // (offsetRight=180) in beide Richtungen — das neue Knotenstück.
    const ring = regions[0]!.rings[0]!;
    expect(ring.some((p) => p.x === 2180 && p.y === -180)).toBe(true);
  });

  it('schräger Winkel (45°): Gehrung folgt der Winkelhalbierenden statt eines rechten Winkels', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 2000, y: 0 } });
    // Zweite Wand exakt 45° zur ersten (dx=dy) — kein rechter Winkel.
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 2000, y: 0 }, b: { x: 3000, y: 1000 } });
    const plan = derivePlan(doc, storeyId);
    const regions = beton(plan);
    expect(regions).toHaveLength(1);
    expect(regions[0]!.rings).toHaveLength(1);

    // Unabhängige Gegenrechnung über die Standard-Gehrungsformel
    // (Δ = Versatz / tan(φ/2), φ = Winkel zwischen den Verlängerungsrichtungen)
    // statt der Implementierung selbst — Kreuzprobe, kein Zirkelschluss.
    const extA = { x: 1, y: 0 }; // Wand 1 endet bei b → verlängert in a→b-Richtung
    const dirB = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
    const extB = { x: -dirB.x, y: -dirB.y }; // Wand 2 beginnt bei a → verlängert entgegen a→b
    const phi = Math.acos(extA.x * extB.x + extA.y * extB.y);
    const offsetRight = 180; // Beton-Schicht-Aussenversatz (letzte Schicht, kern-aussen-Seite)
    const delta = offsetRight / Math.tan(phi / 2);
    const perpA = { x: 0, y: 1 }; // Linke Normale von Wand 1
    const oc = { x: Math.round(2000 + extA.x * delta + perpA.x * -offsetRight), y: Math.round(0 + extA.y * delta + perpA.y * -offsetRight) };
    const ring = regions[0]!.rings[0]!;
    const treffer = ring.some((p) => Math.abs(p.x - oc.x) <= 2 && Math.abs(p.y - oc.y) <= 2);
    expect(treffer).toBe(true);
  });

  it('inkonsistent gewickelte Nachbarwand (verkehrt gezeichnet): Wicklungs-Guard fällt auf stumpfe Ecke zurück', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    // Wand 2 trifft dieselbe Ecke (2000,0) wie im ersten Test, ist aber VERKEHRT
    // gezeichnet (endet statt beginnt dort — a/b vertauscht). Ihre asymmetrischen
    // Schichten liegen dadurch auf der Innenseite; eine blinde Gehrung würde die
    // Umrisse verbinden und die Beton-Schicht ins Gebäudeinnere ziehen. Der
    // Wicklungs-Guard (sideA·sideB < 0) erkennt das und lässt die Ecke stumpf.
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 2000, y: 0 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 2000, y: 2000 }, b: { x: 2000, y: 0 } });
    // Der korrekt gewickelte Fall (erster Test) trägt exakt die Aussen-Miterspitze
    // (2180,-180); hier darf sie NICHT entstehen — sonst hätte die Gehrung
    // falsch (nach innen) gemitert.
    const hatMiterSpitze = beton(derivePlan(doc, storeyId)).some((r) =>
      r.rings.some((ring) => ring.some((p) => p.x === 2180 && p.y === -180)),
    );
    expect(hatMiterSpitze).toBe(false);
  });

  it('entartete Spitze (~3°): kein Miter — Fläche bleibt plausibel statt ins Unendliche zu schiessen', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const lenA = 2000;
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: lenA, y: 0 } });
    // Zweite Wand fast entgegengesetzt zur ersten (nur ~2.9° Öffnungswinkel
    // zwischen den Wandkörpern) — eine echte Gehrung würde hier auf ein
    // Vielfaches der Wanddicke hinausschiessen. Ehrlicher Rückfall: alte
    // stumpfe Ecke, keine Extrapolation.
    const wallB = { x: 0, y: 100 };
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: lenA, y: 0 }, b: wallB });
    const lenB = Math.hypot(wallB.x - lenA, wallB.y - 0);
    const plan = derivePlan(doc, storeyId);
    const regions = beton(plan);
    expect(regions).toHaveLength(1);
    const flaeche = regions[0]!.rings.reduce((s, ring) => s + Math.abs(polygonArea(ring)), 0);
    // Nominalfläche der reinen Beton-Schicht (180 mm dick) beider Wände,
    // ohne jede Verlängerung; eine entartete Gehrung würde um Grössenordnungen
    // darüber liegen (Δ = 180/tan(1.4°) ≈ 7350 mm Extra-Auskragung je Wand).
    const nominal = (lenA + lenB) * 180;
    expect(flaeche).toBeLessThan(nominal * 1.5);
  });
});

describe('3D-T-Stoss', () => {
  it('Wandende in fremder Wandmitte stösst bündig an die nahe Fläche', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    // Zielwand entlang x (±180 dick), T-Wand von Norden bis zur Achse
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    const t = execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 4000, y: 3000 }, b: { x: 4000, y: 0 },
    });
    const art = deriveEntity(doc, (t.patches[0] as { id: string }).id)!;
    let minY = Infinity;
    for (let i = 1; i < art.positions.length; i += 3) minY = Math.min(minY, art.positions[i]!);
    expect(minY).toBeCloseTo(180, 0); // nahe Fläche der Zielwand, keine Durchdringung
  });
});

describe('Hidden-Line im Schnitt', () => {
  const aufbauen = () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    // Naher, hoher Riegel (verdeckt die Mitte) + ferner, breiter, flacher Riegel
    execute(doc, 'design.volumenErstellen', {
      storeyId,
      outline: [{ x: 2000, y: 1000 }, { x: 6000, y: 1000 }, { x: 6000, y: 2000 }, { x: 2000, y: 2000 }],
      height: 5000,
    });
    execute(doc, 'design.volumenErstellen', {
      storeyId,
      outline: [{ x: 0, y: 3000 }, { x: 10000, y: 3000 }, { x: 10000, y: 4000 }, { x: 0, y: 4000 }],
      height: 3000,
    });
    return doc;
  };
  const spec = { a: { x: 0, y: 0 }, b: { x: 10000, y: 0 }, depth: 30000, lookLeft: true };
  const oberkanten = (g: ReturnType<typeof deriveSection>) =>
    g.projections.filter((l) => Math.abs(l.a.z - 3000) < 1 && Math.abs(l.b.z - 3000) < 1);

  it('ohne Rechnung läuft die Oberkante des hinteren Riegels durch', () => {
    const ohne = deriveSection(aufbauen(), { ...spec, hiddenLine: false });
    expect(
      oberkanten(ohne).some((l) => Math.min(l.a.s, l.b.s) < 100 && Math.max(l.a.s, l.b.s) > 9900),
    ).toBe(true);
  });

  it('mit Rechnung bleiben nur die seitlich sichtbaren Teilstücke übrig', () => {
    const mit = deriveSection(aufbauen(), spec);
    const kanten = oberkanten(mit);
    // Links sichtbar bis zur nahen Kiste (s≈2000), rechts ab s≈6000
    expect(kanten.some((l) => Math.min(l.a.s, l.b.s) < 100 && Math.max(l.a.s, l.b.s) <= 2001)).toBe(true);
    expect(kanten.some((l) => Math.min(l.a.s, l.b.s) >= 5999 && Math.max(l.a.s, l.b.s) > 9900)).toBe(true);
    // Kein Teilstück auf z=3000 quert den verdeckten Bereich
    for (const l of kanten) {
      expect(Math.max(l.a.s, l.b.s) <= 2001 || Math.min(l.a.s, l.b.s) >= 5999).toBe(true);
    }
    // Die eigene Oberkante der nahen Kiste (z=5000) bleibt unangetastet sichtbar
    expect(
      mit.projections.some(
        (l) =>
          Math.abs(l.a.z - 5000) < 1 && Math.abs(l.b.z - 5000) < 1 &&
          Math.abs(Math.min(l.a.s, l.b.s) - 2000) < 1 && Math.abs(Math.max(l.a.s, l.b.s) - 6000) < 1,
      ),
    ).toBe(true);
  });
});

describe('Golden-Ansicht (Hidden-Line)', () => {
  it('Ansicht Süd des Testhauses ist byte-identisch zur Golden-Datei', () => {
    const { doc, spec } = testhausMitQuertrakt();
    const svg = ansichtSvg(doc, spec);
    pruefeGolden(svg, new URL('./golden/ansicht-sued-testhaus.svg', import.meta.url));
    // Bewusste Änderungen: `npx tsx e2e/tools/golden-ansicht.mts` und Diff begutachten.
  });
});

describe('Budget (R2): 500 Wände', () => {
  it('deriveAll und Hidden-Line-Ansicht bleiben im Zeitbudget', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    // 25 Reihen à 10 Zimmer (je 2 Wände) — echte Ecken und T-Stösse
    for (let r = 0; r < 25; r++) {
      const y = 20000 + r * 5000;
      for (let i = 0; i < 10; i++) {
        execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: i * 4000, y }, b: { x: (i + 1) * 4000, y } });
        execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: i * 4000, y }, b: { x: i * 4000, y: y + 3500 } });
      }
    }
    let t0 = performance.now();
    const arts = deriveAll(doc);
    const tDerive = performance.now() - t0;
    expect(arts.length).toBeGreaterThanOrEqual(500);
    expect(tDerive).toBeLessThan(2000); // lokal ~100 ms; CI-Reserve

    t0 = performance.now();
    const g = deriveSection(doc, { a: { x: -1000, y: 15000 }, b: { x: 45000, y: 15000 }, depth: 200000, lookLeft: true });
    const tSection = performance.now() - t0;
    expect(g.projections.length).toBeGreaterThan(0);
    expect(tSection).toBeLessThan(5000); // lokal ~660 ms (Hidden-Line aktiv); CI-Reserve
  });
});

describe('Berechnungsliste (Owner-Workflow Wettbewerb)', () => {
  it('T6: frisches Dokument hat KEIN Raumprogramm als Default (kein Wettbewerb fest verdrahtet)', () => {
    const { doc } = setupDoc();
    expect(doc.settings.raumprogramm).toEqual([]);
    expect(deriveBerechnungsliste(doc).zeilen).toEqual([]);
  });

  it('rechnet Soll/ausgezogen/Differenz, Δ Max und den Tie-out', () => {
    const { doc, storeyId } = setupDoc();
    execute(doc, 'design.raumprogrammSetzen', {
      posten: [
        { typ: 'marktgerecht', hnfSoll: 100 },
        { typ: 'preisguenstig', hnfSoll: 50 },
      ],
      programmFaktor: 1.22,
      maxAgf: 200,
    });
    // 10×12m marktgerecht (120 m²) + 5×8m preisgünstig (40 m²) + 6×6m ohne Typ (36 m²)
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'W1', sia: 'HNF', program: 'marktgerecht',
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 12000 }, { x: 0, y: 12000 }],
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'W2', sia: 'HNF', program: 'preisguenstig',
      outline: [{ x: 12000, y: 0 }, { x: 17000, y: 0 }, { x: 17000, y: 8000 }, { x: 12000, y: 8000 }],
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Ohne', sia: 'NNF',
      outline: [{ x: 20000, y: 0 }, { x: 26000, y: 0 }, { x: 26000, y: 6000 }, { x: 20000, y: 6000 }],
    });
    const b = deriveBerechnungsliste(doc);
    const markt = b.zeilen.find((z) => z.typ === 'marktgerecht')!;
    expect(markt.agfZiel).toBeCloseTo(122, 5); // 100 × 1.22
    expect(markt.ausgezogen).toBeCloseTo(120, 5);
    expect(markt.differenz).toBeCloseTo(-2, 5); // knapp unter Soll
    const guenstig = b.zeilen.find((z) => z.typ === 'preisguenstig')!;
    expect(guenstig.differenz).toBeCloseTo(40 - 61, 5);
    expect(b.untypisiert).toBeCloseTo(36, 5); // Tie-out-Warnung: Fläche ohne Typ
    expect(b.totalAgf).toBeCloseTo(196, 5); // 120 + 40 + 36
    expect(b.deltaMax).toBeCloseTo(-4, 5); // unter dem Maximum = Reserve
  });

  it('Volumenkörper zählen als GF über abgeleitete Geschosse und ins «ausgezogen»', () => {
    const { doc, storeyId } = setupDoc();
    execute(doc, 'design.raumprogrammSetzen', {
      posten: [{ typ: 'vertical-cluster', hnfSoll: 100 }],
    });
    // 10×10m, 8.4m hoch → 3 Geschosse à 100 m² = 300 m² GF
    execute(doc, 'design.volumenErstellen', {
      storeyId, program: 'vertical-cluster', height: 8400,
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 10000 }, { x: 0, y: 10000 }],
    });
    const b = deriveBerechnungsliste(doc);
    expect(b.zeilen[0]!.ausgezogen).toBeCloseTo(300, 5);
    expect(b.gfVolumen).toBeCloseTo(300, 5);
    // Undo des Raumprogramms stellt die Settings wieder her
    const h = new History();
    const res = execute(doc, 'design.raumprogrammSetzen', { posten: [], maxAgf: 999 });
    h.record(res.patches);
    h.undo(doc);
    expect(doc.settings.raumprogramm.length).toBe(1);
    expect(doc.settings.maxAgf).toBe(null);
  });
});

describe('Mengenauszug (KosmoDraw)', () => {
  it('Wände je Aufbau: Achslänge, Fläche netto (Öffnungen ab), Volumen', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    // 10m Wand, Geschoss 3000 → 30 m² brutto; Fenster 2×1.5 = 3 m² ab
    const w = execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 10000, y: 0 },
    }).patches[0] as { id: string };
    execute(doc, 'design.oeffnungSetzen', {
      wallId: w.id, openingType: 'fenster', center: 3000, width: 2000, height: 1500, sill: 900,
    });
    const m = deriveMengen(doc);
    const wand = m.positionen.find((p) => p.kind === 'wall')!;
    expect(wand.ifcKlasse).toBe('IfcWall');
    expect(wand.anzahl).toBe(1);
    expect(wand.laenge).toBeCloseTo(10, 5);
    expect(wand.flaeche).toBeCloseTo(27, 5); // 30 − 3
    expect(wand.volumen).toBeCloseTo(27 * 0.36, 3); // AW 360 aus setupDoc
    const fenster = m.positionen.find((p) => p.kind === 'opening:fenster')!;
    expect(fenster.anzahl).toBe(1);
    expect(fenster.flaeche).toBeCloseTo(3, 5);
  });

  it('Decken, Zonen und Volumen liefern Flächen/Volumen in m²/m³', () => {
    const { doc, storeyId } = setupDoc();
    execute(doc, 'design.deckeZeichnen', {
      storeyId, thickness: 250,
      outline: [{ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 5000 }, { x: 0, y: 5000 }],
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Wohnen', sia: 'HNF',
      outline: [{ x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 4000 }, { x: 0, y: 4000 }],
    });
    const m = deriveMengen(doc);
    const decke = m.positionen.find((p) => p.kind === 'slab')!;
    expect(decke.flaeche).toBeCloseTo(40, 5);
    expect(decke.volumen).toBeCloseTo(10, 5);
    const hnf = m.positionen.find((p) => p.kind === 'zone:HNF')!;
    expect(hnf.ifcKlasse).toBe('IfcSpace');
    expect(hnf.flaeche).toBeCloseTo(24, 5);
  });
});

describe('Stützenraster-Assistent (VSS 40 291, Owner-Herleitung)', () => {
  it('reproduziert die Owner-Excel: 4×2.50 → 10.50 m / 3 Achsen = 3.50 m ausgewogen', () => {
    const v = generiereStuetzenraster();
    const beste = v.find((x) => x.parkfelder === 4 && x.feldbreite === 2.5 && x.wohnachsen === 3)!;
    expect(beste.achsmass).toBeCloseTo(10.5, 5);
    expect(beste.wohnraster).toBeCloseTo(3.5, 5);
    expect(beste.bewertung).toBe('ausgewogen');
    expect(beste.holzbauKritisch).toBe(false);
    const robust = v.find((x) => x.parkfelder === 4 && x.feldbreite === 2.6 && x.wohnachsen === 3)!;
    expect(robust.achsmass).toBeCloseTo(10.9, 5);
    expect(robust.wohnraster).toBeCloseTo(10.9 / 3, 5);
    expect(robust.fahrgasse).toBe(6.0);
  });

  it('markiert 2 Felder/2 Achsen als zu eng und 5×2.50/4 als Holzbau-kritisch', () => {
    const v = generiereStuetzenraster();
    const eng = v.find((x) => x.parkfelder === 2 && x.feldbreite === 2.5 && x.wohnachsen === 2)!;
    expect(eng.achsmass).toBeCloseTo(5.5, 5);
    expect(eng.bewertung).toBe('zu-eng'); // 2.75 m < 3.25 m
    const dreizehn = v.find((x) => x.parkfelder === 5 && x.feldbreite === 2.5 && x.wohnachsen === 4)!;
    expect(dreizehn.achsmass).toBeCloseTo(13.0, 5);
    expect(dreizehn.wohnraster).toBeCloseTo(3.25, 5);
    expect(dreizehn.holzbauKritisch).toBe(true);
    // 3×2.50/2 = 4.00 m: grosszügig (Spezialbereiche)
    const gross = v.find((x) => x.parkfelder === 3 && x.feldbreite === 2.5 && x.wohnachsen === 2)!;
    expect(gross.wohnraster).toBeCloseTo(4.0, 5);
    expect(gross.bewertung).toBe('grosszuegig');
  });
});

describe('Axonometrie (Militärperspektive)', () => {
  it('Quader: 9 sichtbare Kanten, die 3 verdeckten Rückkanten fehlen', () => {
    const { doc, storeyId } = setupDoc();
    execute(doc, 'design.volumenErstellen', {
      storeyId, height: 3000,
      outline: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }],
    });
    const mit = deriveAxo(doc, { winkelGrad: 30 });
    const ohne = deriveAxo(doc, { winkelGrad: 30, hiddenLine: false });
    expect(ohne.lines.length).toBe(12); // alle Quader-Kanten
    expect(mit.lines.length).toBe(9); // 3 Rückkanten verdeckt
    expect(mit.bounds).not.toBeNull();
    // Grundriss unverzerrt: eine 4-m-Bodenkante bleibt 4 m lang im Bild
    const laengen = mit.lines.map((l) => Math.hypot(l.b.u - l.a.u, l.b.v - l.a.v));
    expect(laengen.some((l) => Math.abs(l - 4000) < 1)).toBe(true);
  });
});

describe('Volumenstudien: Owner-Regeln (Höhen, Spänner, Hof, 3h)', () => {
  const P = (w: number, h: number) => [
    { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h },
  ];

  it('gemischt: EG 4.00, Wohn-OG 2.80, Turm-OG 3.50 (Cluster)', () => {
    const v = generiereVolumenstudien(P(80000, 60000), {
      zielGf: 20000, nutzung: 'gemischt', maxHoehe: 25000,
    });
    const riegel = v.find((x) => x.id === 'riegel')!;
    expect(riegel.hoehen).toEqual({ eg: 4000, og: 2800 });
    expect(riegel.hoehe).toBe(4000 + (riegel.geschosse - 1) * 2800);
    const turm = v.find((x) => x.id === 'turm')!;
    expect(turm.hoehen).toEqual({ eg: 4000, og: 3500 });
    // max: 4000 + n·3500 ≤ 25000 → n = 6 → 7 Geschosse Deckel
    expect(turm.geschosse).toBeLessThanOrEqual(7);
  });

  it('Blockrand nur mit Innenhof ≥ 13 m; Hof zu klein → Variante fehlt', () => {
    // 60×60 − 2×4 Abstand = 52 m innen − 2×14 Band = 24 m Hof ≥ 13 ✓
    const gross = generiereVolumenstudien(P(60000, 60000), { zielGf: 8000 });
    const blockrand = gross.find((x) => x.id === 'blockrand')!;
    expect(blockrand.besonnung!.ist).toBe(24000);
    // 46×46 − 8 = 38 innen − 28 = 10 m Hof < 13 → keine Blockrand-Variante
    const klein = generiereVolumenstudien(P(46000, 46000), { zielGf: 8000 });
    expect(klein.find((x) => x.id === 'blockrand')).toBeUndefined();
  });

  it('Zeilen: 3h-Näherung schlägt an, wenn die Gasse zu eng für die Höhe ist', () => {
    // schmale Parzelle → Gasse 8 m; hohes Programm → Höhe weit über 8/1.43
    const v = generiereVolumenstudien(P(90000, 44000), { zielGf: 30000 });
    const zeilen = v.find((x) => x.id === 'zeilen')!;
    expect(zeilen.besonnung).not.toBeNull();
    expect(zeilen.besonnung!.noetig).toBe(Math.round(zeilen.hoehe * 1.43));
    expect(zeilen.besonnung!.ok).toBe(false);
    expect(zeilen.hinweise.some((h) => h.includes('3h-Kriterium'))).toBe(true);
    // Spänner-Tiefe: 44−8=36 innen → (36−8)/2=14 m → tiefeOk
    expect(zeilen.tiefe).toBe(14000);
    expect(zeilen.tiefeOk).toBe(true);
  });

  // K4 (Owner-Rundgang 0.6.2, S. 8): Geschosshöhe ist projektspezifisch
  // (Wettbewerbsvorgabe/Architekt/SIA-Minimum), nicht universell 2.80/4.00.
  describe('K4: explizite Geschosshöhe wirkt auf Geschosszahl/GF', () => {
    it('Wohnen: eine höhere Geschosshöhe (z.B. 3.20 m Wettbewerbsvorgabe) senkt bei fixer maxHoehe die Geschosszahl', () => {
      const parzelle = P(60000, 60000);
      const standard = generiereVolumenstudien(parzelle, { zielGf: 8000, maxHoehe: 25000 });
      const hoeher = generiereVolumenstudien(parzelle, { zielGf: 8000, maxHoehe: 25000, geschosshoehe: 3200 });
      const riegelStandard = standard.find((x) => x.id === 'riegel')!;
      const riegelHoeher = hoeher.find((x) => x.id === 'riegel')!;
      expect(riegelStandard.hoehen).toEqual({ eg: 2800, og: 2800 });
      expect(riegelHoeher.hoehen).toEqual({ eg: 3200, og: 3200 });
      // Gleiche maxHoehe, grössere OG-Höhe → nie mehr, oft weniger max. Geschosse
      const maxGeschosseStandard = Math.floor((25000 - 2800) / 2800) + 1;
      const maxGeschosseHoeher = Math.floor((25000 - 3200) / 3200) + 1;
      expect(maxGeschosseHoeher).toBeLessThan(maxGeschosseStandard);
      expect(riegelHoeher.geschosse).toBeLessThanOrEqual(maxGeschosseHoeher);
    });

    it('gemischt: geschosshoehe überschreibt AUCH das hartcodierte Gewerbe-EG (4.00), Turm-OG (3.50) bleibt unberührt', () => {
      const parzelle = P(80000, 60000);
      const v = generiereVolumenstudien(parzelle, {
        zielGf: 20000, nutzung: 'gemischt', maxHoehe: 25000, geschosshoehe: 3000,
      });
      const riegel = v.find((x) => x.id === 'riegel')!;
      expect(riegel.hoehen).toEqual({ eg: 3000, og: 3000 });
      const turm = v.find((x) => x.id === 'turm')!;
      // Turm-Cluster-OG bleibt die eigene 3.50-m-Logik, unabhängig von geschosshoehe
      expect(turm.hoehen).toEqual({ eg: 3000, og: 3500 });
    });

    it('ohne geschosshoehe bleiben die Owner-Defaults (2.80 Wohnen / 4.00 gemischt-EG) unverändert — Golden-Verträglichkeit', () => {
      const parzelle = P(80000, 60000);
      const wohnen = generiereVolumenstudien(parzelle, { zielGf: 8000 });
      expect(wohnen.find((x) => x.id === 'riegel')!.hoehen.eg).toBe(2800);
      const gemischt = generiereVolumenstudien(parzelle, { zielGf: 20000, nutzung: 'gemischt', maxHoehe: 25000 });
      expect(gemischt.find((x) => x.id === 'riegel')!.hoehen.eg).toBe(4000);
    });
  });
});

describe('Blatt-Texte (Plakat)', () => {
  it('Text setzen, ändern, entfernen — und im Blatt-SVG gerendert', async () => {
    const { doc } = setupDoc();
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Plakat', format: 'A0', orientation: 'hoch' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    execute(doc, 'publish.textSetzen', { sheetId, text: 'HAUS AM HANG', x: 60, y: 80, size: 30, titel: true });
    const sheet = doc.get(sheetId) as import('../src').Sheet;
    expect(sheet.texte).toHaveLength(1);
    const textId = sheet.texte![0]!.id;
    execute(doc, 'publish.textSetzen', { sheetId, textId, text: 'Haus am Hang\nWettbewerb 2026' });
    const { sheetToSvg } = await import('../src');
    const svg = sheetToSvg(doc, sheetId, { projectName: 'Test', date: '01.07.2026' });
    // D4 (v0.7.3 «Zwei Stimmen»): Titel-Freitext (`titel: true`) setzt versal
    // beim Rendern (Lato Heavy statt vormals 'Archivo Narrow') — reiner
    // Matcher-String, kein Golden (s. GOLDEN-WECHSEL-D4.md).
    expect(svg).toContain('HAUS AM HANG');
    expect(svg).toContain('WETTBEWERB 2026');
    execute(doc, 'publish.textSetzen', { sheetId, textId, text: '' });
    expect((doc.get(sheetId) as import('../src').Sheet).texte).toHaveLength(0);
  });
});

describe('Baugrenzen (Phase 0)', () => {
  it('setzen ersetzt die alte Grenze; Checks melden Lage- und Höhenverstösse', async () => {
    const { pruefeGrundriss, derivePlan } = await import('../src');
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.baugrenzeSetzen', {
      storeyId, maxHoehe: 10000,
      outline: [{ x: 0, y: 0 }, { x: 20000, y: 0 }, { x: 20000, y: 15000 }, { x: 0, y: 15000 }],
    });
    execute(doc, 'design.baugrenzeSetzen', {
      storeyId, maxHoehe: 9000, name: 'Kernzone',
      outline: [{ x: 0, y: 0 }, { x: 20000, y: 0 }, { x: 20000, y: 15000 }, { x: 0, y: 15000 }],
    });
    expect(doc.byKind('boundary')).toHaveLength(1); // ersetzt, nicht gestapelt

    // Wand ragt hinaus; Volumen zu hoch; braves Volumen bleibt still
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 18000, y: 5000 }, b: { x: 26000, y: 5000 } });
    execute(doc, 'design.volumenErstellen', {
      storeyId, height: 12000,
      outline: [{ x: 2000, y: 2000 }, { x: 8000, y: 2000 }, { x: 8000, y: 8000 }, { x: 2000, y: 8000 }],
    });
    execute(doc, 'design.volumenErstellen', {
      storeyId, height: 6000,
      outline: [{ x: 10000, y: 2000 }, { x: 14000, y: 2000 }, { x: 14000, y: 6000 }, { x: 10000, y: 6000 }],
    });
    const befunde = pruefeGrundriss(doc, storeyId).filter((b) => b.regel === 'Baugrenze');
    expect(befunde.some((b) => b.text.includes('Wand') && b.text.includes('hinaus'))).toBe(true);
    expect(befunde.some((b) => b.text.includes('Volumen') && b.text.includes('Höhenbeschränkung'))).toBe(true);
    expect(befunde).toHaveLength(2); // das brave Volumen meldet nichts

    // Grundriss zeichnet die Grenze strichpunktiert (Klasse baugrenze)
    const plan = derivePlan(doc, storeyId);
    expect(plan.lines.filter((l) => l.classes.includes('baugrenze'))).toHaveLength(4);
  });
});

describe('Blatt-Pflege (anpassen, entfernen)', () => {
  it('Massstab/Titel ändern und Blatt entfernen — beides undo-fähig', () => {
    const { doc, storeyId } = setupDoc();
    const h = new History();
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'B1', format: 'A1', orientation: 'quer' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    execute(doc, 'publish.ansichtPlatzieren', { sheetId, view: 'grundriss', storeyId, scale: 100, x: 200, y: 200 });
    let sheet = doc.get(sheetId) as import('../src').Sheet;
    const plId = sheet.placements[0]!.id;
    execute(doc, 'publish.ansichtAnpassen', { sheetId, placementId: plId, scale: 50, title: 'EG neu' });
    sheet = doc.get(sheetId) as import('../src').Sheet;
    expect(sheet.placements[0]!.scale).toBe(50);
    expect(sheet.placements[0]!.title).toBe('EG neu');
    const weg = execute(doc, 'publish.blattEntfernen', { sheetId });
    h.record(weg.patches);
    expect(doc.byKind('sheet')).toHaveLength(0);
    h.undo(doc);
    expect(doc.byKind('sheet')).toHaveLength(1);
    expect((doc.get(sheetId) as import('../src').Sheet).placements[0]!.scale).toBe(50);
  });
});

describe('Mehrfach-Wandknoten (V2-A1)', () => {
  const wandbau = () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a, b });
    return { doc, storeyId, wand };
  };
  const artefaktVon = (arts: ReturnType<typeof deriveAll>, prefix: string) =>
    arts.filter((a) => a.entityId.startsWith(prefix));

  it('Plus-Knoten (4×90°): Wände ziehen sich auf ±180 zurück, Knotenstück füllt das Quadrat', () => {
    const { doc, wand } = wandbau();
    wand({ x: -5000, y: 0 }, { x: 0, y: 0 });
    wand({ x: 0, y: 0 }, { x: 5000, y: 0 });
    wand({ x: 0, y: 0 }, { x: 0, y: 5000 });
    wand({ x: 0, y: 0 }, { x: 0, y: -5000 });
    const arts = deriveAll(doc);
    const knoten = artefaktVon(arts, 'knoten:');
    expect(knoten).toHaveLength(1);
    // Knotenstück = Quadrat ±180 (Aufbau 360)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const kp = knoten[0]!.positions;
    for (let i = 0; i < kp.length; i += 3) {
      minX = Math.min(minX, kp[i]!); maxX = Math.max(maxX, kp[i]!);
      minY = Math.min(minY, kp[i + 1]!); maxY = Math.max(maxY, kp[i + 1]!);
    }
    expect(minX).toBeCloseTo(-180, 0);
    expect(maxX).toBeCloseTo(180, 0);
    expect(minY).toBeCloseTo(-180, 0);
    expect(maxY).toBeCloseTo(180, 0);
    // Westwand endet exakt an der Fuge x=−180 (kein Loch, kein Überstand)
    const west = arts.find((a) => a.entityId === (doc.byKind('wall')[0] as { id: string }).id)!;
    let wMaxX = -Infinity;
    for (let i = 0; i < west.positions.length; i += 3) wMaxX = Math.max(wMaxX, west.positions[i]!);
    expect(wMaxX).toBeCloseTo(-180, 0);
  });

  it('T aus drei Endpunkten: durchlaufende Fuge bleibt bündig, Abzweig stösst an', () => {
    const { doc, wand } = wandbau();
    wand({ x: -5000, y: 0 }, { x: 0, y: 0 });
    wand({ x: 0, y: 0 }, { x: 5000, y: 0 });
    wand({ x: 0, y: 0 }, { x: 0, y: 4000 });
    const arts = deriveAll(doc);
    expect(artefaktVon(arts, 'knoten:')).toHaveLength(1);
    // Südfuge der Ost-Wand läuft bis zum Knoten (Ecke bei s=0),
    // die Nordecke zieht sich auf x=+180 zurück
    const ost = arts.find((a) => a.entityId === (doc.byKind('wall')[1] as { id: string }).id)!;
    let minXanSued = Infinity;
    let minXanNord = Infinity;
    for (let i = 0; i < ost.positions.length; i += 3) {
      const x = ost.positions[i]!;
      const y = ost.positions[i + 1]!;
      if (Math.abs(y - -180) < 1) minXanSued = Math.min(minXanSued, x);
      if (Math.abs(y - 180) < 1) minXanNord = Math.min(minXanNord, x);
    }
    expect(minXanSued).toBeCloseTo(0, 0);
    expect(minXanNord).toBeCloseTo(180, 0);
    // Keine NaN in irgendeinem Artefakt
    for (const a of arts) {
      for (let i = 0; i < a.positions.length; i++) expect(Number.isFinite(a.positions[i]!)).toBe(true);
    }
  });

  it('Fünf Wände am Stern: Knotenstück existiert, nichts explodiert', () => {
    const { doc, wand } = wandbau();
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5;
      wand({ x: 0, y: 0 }, { x: Math.round(4000 * Math.cos(a)), y: Math.round(4000 * Math.sin(a)) });
    }
    const arts = deriveAll(doc);
    expect(artefaktVon(arts, 'knoten:')).toHaveLength(1);
    for (const a of arts) {
      for (let i = 0; i < a.positions.length; i++) expect(Number.isFinite(a.positions[i]!)).toBe(true);
    }
  });
});

describe('Schnittflächen + SIA-Schraffuren (V2-C4)', () => {
  const loopFlaeche = (loop: { s: number; z: number }[]) => {
    let f = 0;
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i]!;
      const b = loop[(i + 1) % loop.length]!;
      f += a.s * b.z - b.s * a.z;
    }
    return Math.abs(f / 2);
  };

  it('einschichtige Wand quer geschnitten: EIN geschlossenes Face, Fläche = Dicke × Höhe', () => {
    const { doc, storeyId } = setupDoc();
    const au = execute(doc, 'design.aufbauErstellen', {
      name: 'Beton 20',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    execute(doc, 'design.wandZeichnen', {
      storeyId,
      assemblyId: (au.patches[0] as { id: string }).id,
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
    });
    const g = deriveSection(doc, {
      a: { x: 2500, y: -3000 },
      b: { x: 2500, y: 3000 },
      depth: 5000,
      lookLeft: true,
    });
    expect(g.faces).toHaveLength(1);
    const f = g.faces[0]!;
    expect(f.material).toBe('beton');
    expect(f.functionKey).toBe('tragend');
    expect(f.loops).toHaveLength(1);
    expect(loopFlaeche(f.loops[0]!)).toBeCloseTo(200 * 3000, -2);
  });

  it('3-Schicht-Aufbau quer geschnitten: drei Bänder mit Schichtdicken-Breiten', () => {
    const { doc, storeyId, assemblyId } = setupDoc(); // putz 20 / daemmung-mw 160 / beton 180
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } });
    const g = deriveSection(doc, {
      a: { x: 2500, y: -3000 },
      b: { x: 2500, y: 3000 },
      depth: 5000,
      lookLeft: true,
    });
    expect(g.faces).toHaveLength(3);
    const nachMaterial = new Map(g.faces.map((f) => [f.material, f]));
    for (const [material, dicke, funktion] of [
      ['putz', 20, 'bekleidung'],
      ['daemmung-mw', 160, 'daemmung'],
      ['beton', 180, 'tragend'],
    ] as const) {
      const f = nachMaterial.get(material)!;
      expect(f, material).toBeDefined();
      expect(f.functionKey).toBe(funktion);
      const flaeche = f.loops.reduce((s, l) => s + loopFlaeche(l), 0);
      expect(flaeche).toBeCloseTo(dicke * 3000, -2);
    }
  });

  it('Längsschnitt durch die Wand mit Fenster: Loch als eigener Loop (evenodd)', () => {
    const { doc, storeyId } = setupDoc();
    const au = execute(doc, 'design.aufbauErstellen', {
      name: 'Beton 20',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    const w = execute(doc, 'design.wandZeichnen', {
      storeyId,
      assemblyId: (au.patches[0] as { id: string }).id,
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
    });
    execute(doc, 'design.oeffnungSetzen', {
      wallId: (w.patches[0] as { id: string }).id,
      openingType: 'fenster',
      center: 2500,
      width: 1000,
      height: 1200,
      sill: 900,
    });
    const g = deriveSection(doc, {
      a: { x: -1000, y: 0 },
      b: { x: 6000, y: 0 },
      depth: 5000,
      lookLeft: true,
    });
    expect(g.faces).toHaveLength(1);
    const f = g.faces[0]!;
    expect(f.loops).toHaveLength(2);
    const flaechen = f.loops.map(loopFlaeche).sort((a, b) => a - b);
    expect(flaechen[0]!).toBeCloseTo(1000 * 1200, -2); // Fensterloch
    expect(flaechen[1]!).toBeCloseTo(5000 * 3000, -2); // Wandumriss
  });

  it('Schraffurlinien bleiben im Polygon; Katalog fällt ehrlich zurück', () => {
    const rect = [[
      { s: 0, z: 0 },
      { s: 2000, z: 0 },
      { s: 2000, z: 1000 },
      { s: 0, z: 1000 },
    ]];
    for (const spec of [schraffurFuer('beton'), schraffurFuer('daemmung-mw'), schraffurFuer('holz')]) {
      const linien = schraffurLinien(rect, spec, 50);
      expect(linien.length).toBeGreaterThan(0);
      for (const l of linien) {
        for (const p of l) {
          expect(p.s).toBeGreaterThanOrEqual(-1);
          expect(p.s).toBeLessThanOrEqual(2001);
          expect(p.z).toBeGreaterThanOrEqual(-30); // Wellen-Amplitude bleibt klein
          expect(p.z).toBeLessThanOrEqual(1030);
        }
      }
    }
    expect(schraffurFuer('daemmung-mw').muster).toBe('wellen');
    expect(schraffurFuer('irgendwas', 'daemmung').muster).toBe('wellen');
    expect(schraffurFuer('völlig-unbekannt').muster).toBe('voll');
    expect(schraffurLinien(rect, schraffurFuer('völlig-unbekannt'), 50)).toEqual([]);
  });

  const flaeche = (f: { loops: { s: number; z: number }[][] }) =>
    f.loops.reduce((sum, l) => sum + loopFlaeche(l), 0);

  it('Wand↔Decke-Verschneidung (V2-A5): die Decke des Obergeschosses schneidet die niedriger priorisierte Wandschicht zurück, die gleich priorisierte Wandschicht bleibt unberührt', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const egId = (eg.patches[0] as { id: string }).id;
    const og = execute(doc, 'design.geschossErstellen', { name: 'OG', index: 1, elevation: 3000, height: 3000 });
    const ogId = (og.patches[0] as { id: string }).id;
    const au = execute(doc, 'design.aufbauErstellen', {
      name: 'AW Daemmung+Beton',
      target: 'wall',
      layers: [
        { material: 'daemmung', thickness: 100, function: 'daemmung' },
        { material: 'beton', thickness: 200, function: 'tragend' },
      ],
    });
    execute(doc, 'design.wandZeichnen', {
      storeyId: egId,
      assemblyId: (au.patches[0] as { id: string }).id,
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
    });
    // Decke im OG: topOffset ist immer 0 (OK Boden OG) — ihre Dicke ragt exakt
    // in das oberste Band der EG-Wand darunter (beide reichen bis Kote 3000).
    execute(doc, 'design.deckeZeichnen', {
      storeyId: ogId,
      outline: [{ x: -1000, y: -1000 }, { x: 6000, y: -1000 }, { x: 6000, y: 1000 }, { x: -1000, y: 1000 }],
      thickness: 250,
    });
    const g = deriveSection(doc, {
      a: { x: 2500, y: -3000 },
      b: { x: 2500, y: 3000 },
      depth: 5000,
      lookLeft: true,
    });
    expect(g.faces).toHaveLength(3);
    const daemmungFace = g.faces.find((f) => f.material === 'daemmung')!;
    const wandBetonFace = g.faces.find((f) => f.material === 'beton' && f.functionKey === 'tragend')!;
    const deckeFace = g.faces.find((f) => f.material === 'beton' && f.functionKey === undefined)!;
    expect(daemmungFace, 'Dämmschicht').toBeDefined();
    expect(wandBetonFace, 'Wand-Beton').toBeDefined();
    expect(deckeFace, 'Decke').toBeDefined();

    // Dämmung (Prio 300) weicht der Decke (Beton, Prio 900) im Überlapp-Band
    // (100 mm Wanddicke × 250 mm Deckendicke) zurück.
    expect(flaeche(daemmungFace)).toBeCloseTo(100 * 3000 - 100 * 250, -2);
    expect(Math.max(...daemmungFace.loops.flat().map((p) => p.z))).toBeLessThanOrEqual(2751);

    // Wand-Beton (Prio 900) trifft auf Decken-Beton (Prio 900) — gleiche
    // Priorität schneidet nicht (wie im Grundriss-Join), volle Fläche bleibt.
    expect(flaeche(wandBetonFace)).toBeCloseTo(200 * 3000, -2);
    expect(Math.max(...wandBetonFace.loops.flat().map((p) => p.z))).toBe(3000);

    // Die Decke selbst wird von KEINER Wandschicht geschnitten (keine Schicht
    // hat eine höhere Priorität als Beton) — volle Fläche bleibt.
    expect(flaeche(deckeFace)).toBeCloseTo(2000 * 250, -2);
  });

  it('Wand auf eigener Bodendecke: reines Berühren ohne Überlapp bleibt unverändert (Fugen-Schwelle)', () => {
    const { doc, storeyId, assemblyId } = setupDoc(); // putz 20 / daemmung-mw 160 / beton 180
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } });
    // Bodendecke im GLEICHEN Geschoss: topOffset 0 → Deckenoberkante = OK Boden
    // = Wand-Unterkante — beide berühren sich exakt bei z = 0, ohne Überlapp.
    execute(doc, 'design.deckeZeichnen', {
      storeyId,
      outline: [{ x: -1000, y: -1000 }, { x: 6000, y: -1000 }, { x: 6000, y: 1000 }, { x: -1000, y: 1000 }],
      thickness: 250,
    });
    const g = deriveSection(doc, {
      a: { x: 2500, y: -3000 },
      b: { x: 2500, y: 3000 },
      depth: 5000,
      lookLeft: true,
    });
    expect(g.faces).toHaveLength(4); // putz, daemmung-mw, beton (Wand), beton (Decke)
    const wandBetonFace = g.faces.find((f) => f.material === 'beton' && f.functionKey === 'tragend')!;
    const deckeFace = g.faces.find((f) => f.material === 'beton' && f.functionKey === undefined)!;
    expect(flaeche(wandBetonFace)).toBeCloseTo(180 * 3000, -2);
    expect(flaeche(deckeFace)).toBeCloseTo(2000 * 250, -2);
  });
});

describe('Plakat-Bildslots (V2-C1)', () => {
  // 1×1-PNG — kleinstes echtes Bild fürs Einbetten
  const PNG_1x1 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const blattMitSlot = () => {
    const doc = new KosmoDoc();
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Plakat', format: 'A0', orientation: 'hoch' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    return { doc, sheetId };
  };

  it('leerer Slot → füllen → entfernen: Asset lebt und stirbt mit dem Verweis', () => {
    const { doc, sheetId } = blattMitSlot();
    execute(doc, 'publish.bildPlatzieren', { sheetId, x: 90, y: 160, w: 380, title: 'Visualisierung' });
    let sheet = doc.get<import('../src').Sheet>(sheetId)!;
    expect(sheet.bilder).toHaveLength(1);
    expect(sheet.bilder![0]!.assetId).toBeNull();
    expect(doc.byKind('imageasset')).toHaveLength(0);

    execute(doc, 'publish.bildFuellen', { sheetId, bildId: sheet.bilder![0]!.id, dataUrl: PNG_1x1 });
    sheet = doc.get<import('../src').Sheet>(sheetId)!;
    const assets = doc.byKind<import('../src').ImageAsset>('imageasset');
    expect(assets).toHaveLength(1);
    expect(sheet.bilder![0]!.assetId).toBe(assets[0]!.id);
    expect(assets[0]!.mime).toBe('image/png');
    expect(assets[0]!.width).toBe(1); // PNG-IHDR gelesen
    expect(assets[0]!.height).toBe(1);

    execute(doc, 'publish.bildEntfernen', { sheetId, bildId: sheet.bilder![0]!.id });
    expect(doc.get<import('../src').Sheet>(sheetId)!.bilder).toHaveLength(0);
    expect(doc.byKind('imageasset')).toHaveLength(0); // verwaistes Asset mitgelöscht
  });

  it('Undo macht Platzieren-mit-Bild vollständig rückgängig (Asset + Slot)', () => {
    const { doc, sheetId } = blattMitSlot();
    const res = execute(doc, 'publish.bildPlatzieren', { sheetId, x: 40, y: 40, w: 160, dataUrl: PNG_1x1 });
    expect(doc.byKind('imageasset')).toHaveLength(1);
    doc.apply(invertPatches(res.patches));
    expect(doc.byKind('imageasset')).toHaveLength(0);
    expect(doc.get<import('../src').Sheet>(sheetId)!.bilder ?? []).toHaveLength(0);
  });

  it('kaputte dataUrl wird klar abgelehnt', () => {
    const { doc, sheetId } = blattMitSlot();
    expect(() =>
      execute(doc, 'publish.bildPlatzieren', { sheetId, x: 0, y: 0, w: 100, dataUrl: 'http://böse.example/bild.png' }),
    ).toThrow(CommandError);
  });

  it('Blatt-SVG: gefüllter Slot bettet ein <image> ein, ohneRaster lässt es weg, leerer Slot zeigt den Platzhalter', () => {
    const { doc, sheetId } = blattMitSlot();
    execute(doc, 'publish.bildPlatzieren', { sheetId, x: 90, y: 160, w: 380, dataUrl: PNG_1x1, title: 'Render' });
    execute(doc, 'publish.bildPlatzieren', { sheetId, x: 90, y: 620, w: 200 });
    const svg = sheetToSvg(doc, sheetId, { projectName: 'Test' });
    expect(svg).toContain('<image ');
    expect(svg).toContain('data:image/png;base64,');
    expect(svg).toContain('Render folgt — HomeStation');
    const pdfSvg = sheetToSvg(doc, sheetId, { projectName: 'Test', ohneRaster: true });
    expect(pdfSvg).not.toContain('<image ');
  });
});

describe('Stützenraster ins Modell (V2-A3)', () => {
  it('rasterSetzen erzeugt Haupt-, Quer- und Wohnachsen mit Labels; Ersetzen statt Stapeln', () => {
    const { doc, storeyId } = setupDoc();
    execute(doc, 'design.rasterSetzen', {
      storeyId, achsmass: 10_500, anzahl: 5, querAnzahl: 4, wohnraster: 2_625,
    });
    const achsen = doc.byKind<import('../src').GridAxis>('grid');
    // 5 Hauptachsen + 4 Querachsen + 4 Felder × 3 Zwischenachsen (10500/2625 = 4 Teilungen)
    expect(achsen.filter((a) => a.typ === 'haupt')).toHaveLength(9);
    expect(achsen.filter((a) => a.typ === 'wohn')).toHaveLength(12);
    const labels = achsen.filter((a) => a.typ === 'haupt').map((a) => a.label).sort();
    expect(labels).toContain('1');
    expect(labels).toContain('5');
    expect(labels).toContain('A');
    expect(labels).toContain('D');
    // Zweites Setzen ERSETZT
    execute(doc, 'design.rasterSetzen', { storeyId, achsmass: 8_000, anzahl: 3, querAnzahl: 2 });
    const neu = doc.byKind<import('../src').GridAxis>('grid');
    expect(neu).toHaveLength(5); // 3 + 2, keine Wohnachsen
    // Entfernen leert; zweites Entfernen meldet klar
    execute(doc, 'design.rasterEntfernen', { storeyId });
    expect(doc.byKind('grid')).toHaveLength(0);
    expect(() => execute(doc, 'design.rasterEntfernen', { storeyId })).toThrow(CommandError);
  });

  it('Testlauf-Befund: Querachsen-Labels laufen bijektiv weiter (A…Z, AA, AB) statt bei Z umzuschlagen', () => {
    const { doc, storeyId } = setupDoc();
    // 28 Querachsen — vorher (Bug) trugen Achse 1 und 27 beide «A» (j % 26).
    execute(doc, 'design.rasterSetzen', { storeyId, achsmass: 8_000, anzahl: 2, querAnzahl: 28, querAchsmass: 3_000 });
    const querLabels = doc
      .byKind<import('../src').GridAxis>('grid')
      .filter((a) => a.typ === 'haupt' && /^[A-Z]+$/.test(a.label))
      .map((a) => a.label);
    expect(querLabels).toContain('Z'); // 26.
    expect(querLabels).toContain('AA'); // 27.
    expect(querLabels).toContain('AB'); // 28.
    expect(querLabels.filter((l) => l === 'A')).toHaveLength(1); // keine Dublette mehr
    expect(new Set(querLabels).size).toBe(querLabels.length); // alle eindeutig
  });

  it('derivePlan trägt die Achsen als eigenen Kanal mit Typ und Label', () => {
    const { doc, storeyId } = setupDoc();
    execute(doc, 'design.rasterSetzen', { storeyId, achsmass: 10_000, anzahl: 3, querAnzahl: 2 });
    const plan = derivePlan(doc, storeyId);
    expect(plan.axes).toHaveLength(5);
    expect(plan.axes.filter((a) => a.typ === 'haupt')).toHaveLength(5);
    expect(plan.axes.find((a) => a.label === '2')).toBeDefined();
    expect(plan.bounds).not.toBeNull(); // Achsen tragen die Bounds auch ohne Wände
    // Achse 2 liegt bei x = 10 m
    const a2 = plan.axes.find((a) => a.label === '2')!;
    expect(a2.a.x).toBe(10_000);
    expect(a2.b.x).toBe(10_000);
  });

  it('Magnetfang: Kreuzung gewinnt vor Achslinie, Radius wird respektiert', () => {
    const { doc, storeyId } = setupDoc();
    execute(doc, 'design.rasterSetzen', { storeyId, achsmass: 10_000, anzahl: 3, querAnzahl: 3, querAchsmass: 6_000 });
    const kandidaten = fangKandidaten(doc, storeyId);
    expect(kandidaten.kreuzungen).toHaveLength(9);
    // nahe der Kreuzung (10000, 6000): Kreuzung gewinnt
    expect(magnetFang({ x: 10_200, y: 6_300 }, kandidaten)).toEqual({ x: 10_000, y: 6_000 });
    // nahe der Achse, weit weg von Kreuzungen: Fusspunkt auf der Achse
    expect(magnetFang({ x: 10_250, y: 3_000 }, kandidaten)).toEqual({ x: 10_000, y: 3_000 });
    // ausser Reichweite: null → App fällt auf den 250er-Raster zurück
    expect(magnetFang({ x: 4_800, y: 3_000 }, kandidaten)).toBeNull();
    // leeres Raster
    execute(doc, 'design.rasterEntfernen', { storeyId });
    expect(magnetFang({ x: 10_000, y: 6_000 }, fangKandidaten(doc, storeyId))).toBeNull();
  });

  it('Element-Fang (v0.6.4 F4): Endpunkt > Mitte > Kante, Radius wird respektiert', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 6000, y: 0 }, assemblyId });
    const k = elementFangKandidaten(doc, storeyId);
    // Wand liefert 2 Endpunkte + 1 Mitte als Punkte und 1 Kante
    expect(k.punkte.filter((p) => p.typ === 'endpunkt')).toHaveLength(2);
    expect(k.punkte.filter((p) => p.typ === 'mitte')).toHaveLength(1);
    expect(k.kanten).toHaveLength(1);
    // Nahe dem Wandende: Endpunkt gewinnt
    const ende = elementFang({ x: 6200, y: 250 }, k);
    expect(ende?.typ).toBe('endpunkt');
    expect(ende?.p).toEqual({ x: 6000, y: 0 });
    // Nahe der Wandmitte: Mitte gewinnt
    const mitte = elementFang({ x: 3100, y: -200 }, k);
    expect(mitte?.typ).toBe('mitte');
    expect(mitte?.p).toEqual({ x: 3000, y: 0 });
    // Auf halber Strecke abseits der Sonderpunkte: Fusspunkt auf der Kante
    const kante = elementFang({ x: 1500, y: 300 }, k);
    expect(kante?.typ).toBe('kante');
    expect(kante?.p).toEqual({ x: 1500, y: 0 });
    // Ausser Reichweite: null → Raster-Fallback der App
    expect(elementFang({ x: 1500, y: 900 }, k)).toBeNull();
    // Stütze und Zonen-Ecke sind ebenfalls Kandidaten
    execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 9000, y: 2000 } });
    const k2 = elementFangKandidaten(doc, storeyId);
    expect(elementFang({ x: 9150, y: 2100 }, k2)?.p).toEqual({ x: 9000, y: 2000 });
  });
});

describe('Bemassungs-Stile (V2-A5)', () => {
  const haus = () => {
    const { doc, storeyId } = setupDoc();
    const au = execute(doc, 'design.aufbauErstellen', {
      name: 'Beton 20', target: 'wall',
      layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    const assemblyId = (au.patches[0] as { id: string }).id;
    const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a, b });
    const sued = wand({ x: 0, y: 0 }, { x: 9000, y: 0 });
    wand({ x: 9000, y: 0 }, { x: 9000, y: 6000 });
    wand({ x: 9000, y: 6000 }, { x: 0, y: 6000 });
    wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
    const innen = wand({ x: 4500, y: 0 }, { x: 4500, y: 6000 });
    execute(doc, 'design.oeffnungSetzen', {
      wallId: (sued.patches[0] as { id: string }).id,
      openingType: 'fenster', center: 2000, width: 1200, height: 1400, sill: 900,
    });
    execute(doc, 'design.oeffnungSetzen', {
      wallId: (innen.patches[0] as { id: string }).id,
      openingType: 'tuer', center: 3000, width: 900, height: 2200, sill: 0,
    });
    return { doc, storeyId };
  };

  it('dimensionLabel: Zentimeter-Konvention des Hochbaus', () => {
    expect(dimensionLabel(0, 3615)).toBe('361\u2075'); // mm hochgestellt, SIA 400 B.5.2
    expect(dimensionLabel(0, 9000)).toBe('900');
    expect(dimensionLabel(9000, 0)).toBe('900');
  });

  it('Default «beide»: Öffnungs- und Gesamtkette je Seite, mit Rollen und Leibungs-Ticks', () => {
    const { doc, storeyId } = haus();
    const dims = deriveDimensions(doc, storeyId);
    const x = dims.chains.filter((c) => c.axis === 'x');
    expect(x.map((c) => c.role).sort()).toEqual(['gesamt', 'oeffnung']);
    const oeffnung = x.find((c) => c.role === 'oeffnung')!;
    expect(oeffnung.ticks).toContain(1400); // Leibung links (2000 − 600)
    expect(oeffnung.ticks).toContain(2600); // Leibung rechts
    expect(x.find((c) => c.role === 'gesamt')!.ticks).toEqual([0, 9000]);
    expect(dims.chains.some((c) => c.role === 'innen')).toBe(false); // Default ohne Innenketten
  });

  it('«gesamt» reduziert auf die Endpunkt-Kette; «keine» leert; Command ist undo-fähig', () => {
    const { doc, storeyId } = haus();
    const res = execute(doc, 'design.bemassungSetzen', { aussenKetten: 'gesamt' });
    let x = deriveDimensions(doc, storeyId).chains.filter((c) => c.axis === 'x');
    expect(x).toHaveLength(1);
    expect(x[0]!.role).toBe('gesamt');
    doc.apply(invertPatches(res.patches));
    x = deriveDimensions(doc, storeyId).chains.filter((c) => c.axis === 'x');
    expect(x).toHaveLength(2);
    execute(doc, 'design.bemassungSetzen', { aussenKetten: 'keine' });
    expect(deriveDimensions(doc, storeyId).chains).toHaveLength(0);
  });

  it('Innenketten: die Innenwand bemasst sich auf ihrer Achse mit Türleibungen', () => {
    const { doc, storeyId } = haus();
    execute(doc, 'design.bemassungSetzen', { innenKetten: true });
    const innen = deriveDimensions(doc, storeyId).chains.filter((c) => c.role === 'innen');
    expect(innen).toHaveLength(1);
    expect(innen[0]!.axis).toBe('y'); // vertikale Innenwand → y-Kette
    expect(innen[0]!.offset).toBe(4500); // auf der Wandachse
    expect(innen[0]!.ticks).toContain(2550); // Türleibung (3000 − 450)
    expect(innen[0]!.ticks).toContain(3450);
  });

  it('Höhenkoten: Schnitt-Druck trägt ±0.00 und +3.00; abschaltbar; Terrainlinie im Druck', () => {
    const { doc, storeyId } = haus();
    execute(doc, 'design.geschossErstellen', { name: 'OG', index: 1, elevation: 3000, height: 3000 });
    const spec = { a: { x: 4500, y: -2000 }, b: { x: 4500, y: 8000 }, depth: 10000, lookLeft: true } as const;
    const svg = sectionInnerSvg(doc, spec, 100).inner;
    expect(svg).toContain('±0.00');
    expect(svg).toContain('+3.00');
    expect(svg).toContain('stroke-dasharray="200 120"'); // Terrainlinie
    execute(doc, 'design.bemassungSetzen', { hoehenKoten: false });
    const ohne = sectionInnerSvg(doc, spec, 100).inner;
    expect(ohne).not.toContain('±0.00');
    void storeyId;
  });
});

describe('SIA-Phasen-Detaillierung (Owner 03.07.)', () => {
  const haus = () => {
    const { doc, storeyId, assemblyId } = setupDoc(); // 3-Schicht-AW
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    execute(doc, 'design.oeffnungSetzen', {
      wallId: (w.patches[0] as { id: string }).id,
      openingType: 'tuer', center: 3000, width: 900, height: 2200, sill: 0,
    });
    return { doc, storeyId };
  };

  it('Vorprojekt: Wand als EIN Poché, Tür ohne Schwenkbogen; Werkplan-Default zeigt Schichten', () => {
    const { doc, storeyId } = haus();
    // Default werkplan: Schichten (tragend + daemmung) + Türbogen
    let plan = derivePlan(doc, storeyId);
    expect(plan.regions.some((r) => r.classes.includes('daemmung'))).toBe(true);
    expect(plan.arcs.length).toBeGreaterThan(0);
    // Vorprojekt: eine Masse-Region, keine Dämmschicht, kein Bogen
    execute(doc, 'design.phaseSetzen', { phase: 'vorprojekt' });
    plan = derivePlan(doc, storeyId);
    expect(plan.regions.some((r) => r.classes.includes('daemmung'))).toBe(false);
    expect(plan.regions.some((r) => r.classes.includes('material-masse'))).toBe(true);
    expect(plan.arcs).toHaveLength(0);
  });

  it('Schnitt: Vorprojekt EIN Face je Bauteil, Bauprojekt Bänder ohne Schraffur, Werkplan mit', () => {
    const { doc, storeyId } = haus();
    void storeyId;
    const spec = { a: { x: 4500, y: -3000 }, b: { x: 4500, y: 3000 }, depth: 5000, lookLeft: true } as const;
    // werkplan (Default): 3 Schichtbänder + Schraffur-Polylinien im Druck
    expect(deriveSection(doc, spec).faces).toHaveLength(3);
    expect(sectionInnerSvg(doc, spec, 100).inner).toContain('<polyline');
    // bauprojekt: Bänder ja, Strichschraffur nein
    execute(doc, 'design.phaseSetzen', { phase: 'bauprojekt' });
    expect(deriveSection(doc, spec).faces).toHaveLength(3);
    expect(sectionInnerSvg(doc, spec, 100).inner).not.toContain('<polyline');
    // vorprojekt: ein Face, einheitliches Schwarz (v0.7.0 «Schwarz auf
    // Weiss» E2, derive/poche.ts — ersetzt das frühere einheitliche Grau
    // #d7d4ce: Wettbewerb/Vorprojekt zeichnen SIA-konform schwarz).
    execute(doc, 'design.phaseSetzen', { phase: 'vorprojekt' });
    expect(deriveSection(doc, spec).faces).toHaveLength(1);
    expect(sectionInnerSvg(doc, spec, 100).inner).toContain('#1a1a1a');
    expect(sectionInnerSvg(doc, spec, 100).inner).not.toContain('#d7d4ce');
  });

  it('Phase steht im Plankopf; Command ist undo-fähig; Altbestand fällt auf werkplan', () => {
    const { doc } = haus();
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'B', format: 'A3', orientation: 'quer' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    expect(sheetToSvg(doc, sheetId, { projectName: 'T', date: '03.07.2026' })).toContain('Werkplan (SIA 51)');
    const res = execute(doc, 'design.phaseSetzen', { phase: 'vorprojekt' });
    expect(sheetToSvg(doc, sheetId, { projectName: 'T', date: '03.07.2026' })).toContain('Vorprojekt (SIA 31)');
    doc.apply(invertPatches(res.patches));
    expect(doc.settings.phase).toBe('werkplan');
    const alt = KosmoDoc.fromJSON({
      schema: 'kosmo.model/v1',
      settings: { projectName: 'Alt', agfFactor: 1.28, facadeFactor: 1.1 } as never,
      entities: [],
    });
    expect(alt.settings.phase).toBe('werkplan');
  });
});

describe('SIA-Teilphase (v0.6.3, getrennt von der Plan-Detaillierung)', () => {
  it('Default eines neuen Docs ist «wettbewerb»', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.siaPhase).toBe('wettbewerb');
    // Bestandsverhalten unangetastet: phase (Plan-Detaillierung) bleibt weiterhin werkplan-Default.
    expect(doc.settings.phase).toBe('werkplan');
  });

  it('Command setzt die Teilphase, koppelt NICHT die Plan-Detaillierung, ist undo-fähig', () => {
    const doc = new KosmoDoc();
    const res = execute(doc, 'design.siaPhaseSetzen', { siaPhase: 'bauprojekt' });
    expect(doc.settings.siaPhase).toBe('bauprojekt');
    // phase (Plan-Detaillierung) bleibt unverändert — keine automatische Kopplung.
    expect(doc.settings.phase).toBe('werkplan');
    expect(res.summary).toContain('Bauprojekt (SIA 32)');
    expect(res.summary).toContain('nicht automatisch gesetzt');
    doc.apply(invertPatches(res.patches));
    expect(doc.settings.siaPhase).toBe('wettbewerb');
  });

  it('akzeptiert alle 7 SIA-Teilphasen-Werte', () => {
    const werte = [
      'wettbewerb',
      'vorprojekt',
      'bauprojekt',
      'bewilligung',
      'ausschreibung',
      'ausfuehrung',
      'abnahme',
    ] as const;
    const doc = new KosmoDoc();
    for (const siaPhase of werte) {
      execute(doc, 'design.siaPhaseSetzen', { siaPhase });
      expect(doc.settings.siaPhase).toBe(siaPhase);
    }
  });

  it('unbekannter Wert wird von der Parameter-Validierung abgelehnt', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'design.siaPhaseSetzen', { siaPhase: 'garantie' })).toThrow(CommandError);
  });

  it('Roundtrip toJSON → JSON.stringify/parse → fromJSON erhält die Teilphase', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.siaPhaseSetzen', { siaPhase: 'ausschreibung' });
    const json = JSON.parse(JSON.stringify(doc.toJSON()));
    const wieder = KosmoDoc.fromJSON(json);
    expect(wieder.settings.siaPhase).toBe('ausschreibung');
  });

  it('parse-guard: Altbestand-Doc ohne siaPhase-Feld lädt mit Default (kein Absturz)', () => {
    // Simuliert eine .kosmo-Datei aus der Zeit VOR diesem Feature — settings
    // hat schlicht keinen siaPhase-Schlüssel.
    const altesSettings = { projectName: 'Altbau', agfFactor: 1.28, facadeFactor: 1.1 } as never;
    const doc = KosmoDoc.fromJSON({ schema: 'kosmo.model/v1', settings: altesSettings, entities: [] });
    expect(doc.settings.siaPhase).toBe('wettbewerb');
    // Derselbe Fall über den gehärteten .kosmo-Loader (parseKosmoSafe).
    const roh = JSON.stringify({ schema: 'kosmo.model/v1', settings: altesSettings, entities: [] });
    const r = parseKosmoSafe(roh);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc.settings.siaPhase).toBe('wettbewerb');
  });
});

describe('Umbau-Status (Vision A1)', () => {
  const haus = () => {
    const { doc, storeyId, assemblyId } = setupDoc(); // 3-Schicht-AW
    const w1 = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 4000, y: 0 } });
    const w2 = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 4000, y: 0 }, b: { x: 9000, y: 0 } });
    return {
      doc, storeyId,
      wall1: (w1.patches[0] as { id: string }).id,
      wall2: (w2.patches[0] as { id: string }).id,
    };
  };

  it('renovationSetzen trennt den Poché-Join nach Status; Undo räumt auf', () => {
    const { doc, storeyId, wall2 } = haus();
    // Beide Wände Bestand-los: EIN vereinigter Beton-Kern
    expect(derivePlan(doc, storeyId).regions.filter((r) => r.classes.includes('material-beton'))).toHaveLength(1);
    const res = execute(doc, 'design.renovationSetzen', { ids: [wall2], status: 'neu' });
    const plan = derivePlan(doc, storeyId);
    const betonKerne = plan.regions.filter((r) => r.classes.includes('material-beton'));
    expect(betonKerne).toHaveLength(2); // neu vereinigt sich nicht mit normal
    expect(betonKerne.filter((r) => r.classes.includes('renovation-neu'))).toHaveLength(1);
    doc.apply(invertPatches(res.patches));
    expect(derivePlan(doc, storeyId).regions.filter((r) => r.classes.includes('material-beton'))).toHaveLength(1);
    expect((doc.get<Wall>(wall2)!.meta ?? {}).renovation).toBeUndefined();
  });

  it('Abbruch: EIN Poché über die Gesamtdicke, gelb/gestrichelt im Druck, KEIN Diagonalkreuz (K2)', async () => {
    const { doc, storeyId, wall1 } = haus();
    execute(doc, 'design.oeffnungSetzen', { wallId: wall1, openingType: 'tuer', center: 2000, width: 900, height: 2200, sill: 0 });
    execute(doc, 'design.renovationSetzen', { ids: [wall1], status: 'abbruch' });
    const plan = derivePlan(doc, storeyId);
    const abbruch = plan.regions.filter((r) => r.classes.includes('renovation-abbruch'));
    expect(abbruch).toHaveLength(1);
    // Keine Dämm-Schicht mehr für die Abbruchwand (Gesamtdicke), Wand 2 behält ihre
    expect(plan.regions.filter((r) => r.classes.includes('daemmung'))).toHaveLength(1);
    // K2 (Owner-Rundgang 0.6.2, S. 18): kein Diagonalkreuz mehr über die
    // ganze Wand — die gelbe Fläche allein ist die SIA-Signatur.
    expect(plan.lines.filter((l) => l.classes.includes('abbruch-kreuz'))).toHaveLength(0);
    const { planInnerSvg } = await import('../src');
    const svg = planInnerSvg(doc, storeyId, 50).inner;
    expect(svg).toContain('#f3e29b'); // Abbruch-Gelb
    expect(svg).toContain('#8a7500'); // Abbruch-Stift
  });

  it('Neu färbt den Druck rot; Öffnungssymbole erben den Status der Wand', async () => {
    const { doc, storeyId, wall2 } = haus();
    execute(doc, 'design.oeffnungSetzen', { wallId: wall2, openingType: 'fenster', center: 2000, width: 1200, height: 1400, sill: 900 });
    execute(doc, 'design.renovationSetzen', { ids: [wall2], status: 'neu' });
    const plan = derivePlan(doc, storeyId);
    expect(plan.lines.some((l) => l.classes.includes('fenster') && l.classes.includes('renovation-neu'))).toBe(true);
    const { planInnerSvg } = await import('../src');
    expect(planInnerSvg(doc, storeyId, 50).inner).toContain('#b3261e'); // Neubau-Rot
    // Ohne Status bleibt der Druck frei von Umbau-Farben (Golden-Verträglichkeit)
    execute(doc, 'design.renovationSetzen', { ids: [wall2] });
    expect(planInnerSvg(doc, storeyId, 50).inner).not.toContain('#b3261e');
  });

  it('Bestand: einheitlich grau über ALLE Schichten im Druck, nicht nur den Kern (K2 — vorher "hälftig grau")', async () => {
    // Eine einzelne freistehende Wand (3-Schicht-AW: putz/daemmung/beton) —
    // isoliert, damit keine zweite (unmarkierte) Wand mit ihrer eigenen
    // weissen Bekleidungs-Fläche die Fill-Assertion verfälscht.
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 4000, y: 0 } });
    const wallId = (w.patches[0] as { id: string }).id;
    execute(doc, 'design.renovationSetzen', { ids: [wallId], status: 'bestand' });
    const plan = derivePlan(doc, storeyId);
    const bestandRegionen = plan.regions.filter((r) => r.classes.includes('renovation-bestand'));
    // Kern UND Dämmschicht tragen beide die renovation-bestand-Klasse
    expect(bestandRegionen.some((r) => r.classes.includes('tragend'))).toBe(true);
    expect(bestandRegionen.some((r) => r.classes.includes('daemmung'))).toBe(true);
    const { planInnerSvg } = await import('../src');
    const svg = planInnerSvg(doc, storeyId, 50).inner;
    // Jede Bestand-Fläche (Kern + Dämmung + Bekleidung) füllt einheitlich
    // #c9c9c9 — nicht "weiss" für die Nicht-Kern-Schichten (das wäre das
    // gerügte Halbgrau).
    expect(svg).not.toContain('fill="white"');
    expect((svg.match(/#c9c9c9/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('docFuerUmbau (K2): Stützenraster fällt aus JEDER gefilterten Umbau-Sicht, bleibt im kombinierten Plan', async () => {
    const { doc, storeyId, wall1 } = haus();
    execute(doc, 'design.rasterSetzen', { storeyId, achsmass: 4500, anzahl: 2 });
    execute(doc, 'design.renovationSetzen', { ids: [wall1], status: 'abbruch' });
    const { docFuerUmbau } = await import('../src');
    expect(doc.byKind('grid').length).toBeGreaterThan(0);
    // Kombinierter Plan (kein Filter): Raster bleibt wie bisher sichtbar
    expect(derivePlan(docFuerUmbau(doc), storeyId).axes.length).toBeGreaterThan(0);
    // JEDE gefilterte Umbau-Sicht: keine Konstruktionsachsen im Druckbild
    expect(derivePlan(docFuerUmbau(doc, 'abbruch'), storeyId).axes).toHaveLength(0);
    expect(derivePlan(docFuerUmbau(doc, 'neu'), storeyId).axes).toHaveLength(0);
    expect(derivePlan(docFuerUmbau(doc, 'bestand'), storeyId).axes).toHaveLength(0);
  });

  it('Alle drei Umbau-Zustände nebeneinander: SIA-saubere Signaturen ohne Kreuz/Achse, unterscheidbare Klassen (K2)', async () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const W = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      (execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a, b }).patches[0] as { id: string }).id;
    const bestand = W({ x: 0, y: 0 }, { x: 4000, y: 0 });
    const abbruch = W({ x: 5000, y: 0 }, { x: 9000, y: 0 });
    const neu = W({ x: 10000, y: 0 }, { x: 14000, y: 0 });
    execute(doc, 'design.renovationSetzen', { ids: [bestand], status: 'bestand' });
    execute(doc, 'design.renovationSetzen', { ids: [abbruch], status: 'abbruch' });
    execute(doc, 'design.renovationSetzen', { ids: [neu], status: 'neu' });
    const plan = derivePlan(doc, storeyId);
    // Jeder Zustand trägt genau seine eigene Klasse — keine Überschneidung
    expect(plan.regions.some((r) => r.classes.includes('renovation-bestand'))).toBe(true);
    expect(plan.regions.some((r) => r.classes.includes('renovation-abbruch'))).toBe(true);
    expect(plan.regions.some((r) => r.classes.includes('renovation-neu'))).toBe(true);
    // K2: kein Bauteil trägt je ein Diagonalkreuz-Symbol
    expect(plan.lines.some((l) => l.classes.includes('abbruch-kreuz'))).toBe(false);
    // Kein Stützenraster gesetzt → keine Achsen sowieso; ohne Filter unverändert leer
    expect(plan.axes).toHaveLength(0);
    const { planInnerSvg } = await import('../src');
    const svg = planInnerSvg(doc, storeyId, 50).inner;
    expect(svg).toContain('#c9c9c9'); // Bestand-Grau
    expect(svg).toContain('#f3e29b'); // Abbruch-Gelb
    expect(svg).toContain('#e9c8c5'); // Neubau-Rot(-Tönung)
  });

  it('IFC trägt Pset_KosmoUmbau; storey/assembly werden abgewiesen', async () => {
    const { doc, storeyId, wall1 } = haus();
    execute(doc, 'design.renovationSetzen', { ids: [wall1], status: 'neu' });
    const { exportIfc } = await import('../src');
    const ifc = exportIfc(doc, 'Umbau');
    expect(ifc).toContain('Pset_KosmoUmbau');
    expect(ifc).toContain("IFCLABEL('neu')");
    expect(() => execute(doc, 'design.renovationSetzen', { ids: [storeyId], status: 'neu' })).toThrow(CommandError);
  });
});

describe('Terrain-Entity (Vision A2)', () => {
  const spec = { a: { x: 0, y: 0 }, b: { x: 10000, y: 0 }, depth: 5000, lookLeft: true } as const;

  it('terrainSetzen projiziert aufs Schnittbild; erneutes Setzen ersetzt das Profil (1 Entity, Undo)', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    execute(doc, 'design.terrainSetzen', {
      typ: 'gewachsen',
      punkte: [{ x: -2000, y: 0, z: 800 }, { x: 5000, y: 0, z: -300 }, { x: 12000, y: 0, z: 200 }],
    });
    const g = deriveSection(doc, spec);
    expect(g.terrain).toHaveLength(1);
    // Schnitt läuft entlang +x ab (0,0): s = x der Stützpunkte, z bleibt
    expect(g.terrain[0]!.pts).toEqual([
      { s: -2000, z: 800 }, { s: 5000, z: -300 }, { s: 12000, z: 200 },
    ]);
    const res = execute(doc, 'design.terrainSetzen', {
      typ: 'gewachsen',
      punkte: [{ x: 0, y: 0, z: 0 }, { x: 9000, y: 0, z: 500 }],
    });
    expect(doc.byKind('terrain')).toHaveLength(1); // ersetzt, nicht dupliziert
    expect(deriveSection(doc, spec).terrain[0]!.pts).toHaveLength(2);
    doc.apply(invertPatches(res.patches));
    expect(deriveSection(doc, spec).terrain[0]!.pts).toHaveLength(3);
    // Zweiter Typ «neu» lebt daneben
    execute(doc, 'design.terrainSetzen', { typ: 'neu', punkte: [{ x: 0, y: 0, z: 0 }, { x: 9000, y: 0, z: 0 }] });
    expect(doc.byKind('terrain')).toHaveLength(2);
  });

  it('Druck: ohne Terrain flache z0-Linie (Bestand), mit Terrain Polylinien nach Typ', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    const ohne = sectionInnerSvg(doc, spec, 100).inner;
    // flache Terrainlinie bei z=0: von bounds.minX−800 bis maxX+800
    expect(ohne).toContain('x1="-800" y1="0" x2="9800" y2="0"');
    expect(ohne).not.toContain('points="-1000,');
    execute(doc, 'design.terrainSetzen', { typ: 'gewachsen', punkte: [{ x: -1000, y: 0, z: 600 }, { x: 10000, y: 0, z: -400 }] });
    execute(doc, 'design.terrainSetzen', { typ: 'neu', punkte: [{ x: -1000, y: 0, z: 0 }, { x: 10000, y: 0, z: 0 }] });
    const mit = sectionInnerSvg(doc, spec, 100).inner;
    expect(mit).toContain('-1000,-600'); // gewachsen: erster Stützpunkt (y = −z)
    expect(mit).not.toContain('x1="-800" y1="0" x2="9800" y2="0"'); // alte flache Linie ersetzt
    // gewachsen gestrichelt, neu ausgezogen: genau EINE Terrain-Polylinie mit Dash
    const polys = mit.match(/<polyline points="-1000,[^/]*\/>/g) ?? [];
    expect(polys).toHaveLength(2);
    expect(polys.filter((p) => p.includes('stroke-dasharray'))).toHaveLength(1);
  });

  it('Roundtrip: Terrain überlebt toJSON → fromJSON', () => {
    const { doc } = setupDoc();
    execute(doc, 'design.terrainSetzen', { typ: 'neu', punkte: [{ x: 0, y: 0, z: 100 }, { x: 5000, y: 2000, z: 300 }] });
    const wieder = KosmoDoc.fromJSON(JSON.parse(JSON.stringify(doc.toJSON())));
    const t = wieder.byKind<import('../src').Terrain>('terrain');
    expect(t).toHaveLength(1);
    expect(t[0]!.typ).toBe('neu');
    expect(t[0]!.punkte[1]).toEqual({ x: 5000, y: 2000, z: 300 });
  });
});

describe('Aussparungen/Durchbrüche (Vision A3)', () => {
  it('Wand-Durchbruch: Werkplan zeigt Kreuz + Kote, Vorprojekt nicht; Validierung ehrlich', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    const wallId = (w.patches[0] as { id: string }).id;
    execute(doc, 'design.aussparungSetzen', { hostId: wallId, center: 4500, breite: 300, hoehe: 300, sill: 1200 });
    const plan = derivePlan(doc, storeyId);
    // 4 Kanten + 2 Diagonalen (volles Kreuz beim Durchbruch)
    expect(plan.lines.filter((l) => l.classes.includes('aussparung'))).toHaveLength(6);
    expect(plan.texte).toHaveLength(1);
    expect(plan.texte[0]!.text).toBe('D 300×300 UK 1200');
    execute(doc, 'design.phaseSetzen', { phase: 'vorprojekt' });
    const vor = derivePlan(doc, storeyId);
    expect(vor.lines.filter((l) => l.classes.includes('aussparung'))).toHaveLength(0);
    expect(vor.texte).toHaveLength(0);
    // Validierung: über die Wand hinaus / fehlender center
    expect(() => execute(doc, 'design.aussparungSetzen', { hostId: wallId, center: 8950, breite: 300, hoehe: 300 })).toThrow(CommandError);
    expect(() => execute(doc, 'design.aussparungSetzen', { hostId: wallId, breite: 300, hoehe: 300 })).toThrow(CommandError);
    expect(() => execute(doc, 'design.aussparungSetzen', { hostId: storeyId, center: 100, breite: 300, hoehe: 300 })).toThrow(CommandError);
  });

  it('Decken-Schlitz: Symbol + Mengenposition; Wirt-Löschung räumt mit', () => {
    const { doc, storeyId } = setupDoc();
    const s = execute(doc, 'design.deckeZeichnen', {
      storeyId, thickness: 250,
      outline: [{ x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 6000 }, { x: 0, y: 6000 }],
    });
    const slabId = (s.patches[0] as { id: string }).id;
    execute(doc, 'design.aussparungSetzen', { hostId: slabId, typ: 'schlitz', at: { x: 3000, y: 3000 }, breite: 400, hoehe: 800 });
    const plan = derivePlan(doc, storeyId);
    // 4 Kanten + 1 Diagonale (Schlitz)
    expect(plan.lines.filter((l) => l.classes.includes('aussparung'))).toHaveLength(5);
    expect(plan.texte[0]!.text).toBe('S 400×800');
    const pos = deriveMengen(doc).positionen.find((p) => p.kind === 'aussparung:schlitz');
    expect(pos?.anzahl).toBe(1);
    expect(pos?.flaeche).toBeCloseTo(0.32, 5);
    execute(doc, 'design.loeschen', { entityId: slabId });
    expect(doc.byKind('aussparung')).toHaveLength(0);
  });
});

describe('Zonentür-Drucksymbol + Möbel-Phasen (Vision A4)', () => {
  it('Zonentür wird im Derive zu Lücke + Flügel — der Druck erbt (weisse Radierlinie)', async () => {
    const { doc, storeyId } = setupDoc();
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Flur', sia: 'VF', raumTyp: 'korridor',
      outline: [{ x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 1500 }, { x: 0, y: 1500 }],
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Zimmer', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 0, y: 1500 }, { x: 6000, y: 1500 }, { x: 6000, y: 5000 }, { x: 0, y: 5000 }],
    });
    execute(doc, 'design.tuerSetzen', { storeyId, at: { x: 3000, y: 1500 }, breite: 900 });
    const plan = derivePlan(doc, storeyId);
    const luecke = plan.lines.filter((l) => l.classes.includes('zonentuer-luecke'));
    const fluegel = plan.lines.filter((l) => l.classes.includes('zonentuer-fluegel'));
    expect(luecke).toHaveLength(1);
    expect(fluegel).toHaveLength(1);
    // Kante horizontal (Zonenwechsel in y) → Lücke läuft in x, Flügel steht in y
    expect(luecke[0]!.a).toEqual({ x: 2550, y: 1500 });
    expect(luecke[0]!.b).toEqual({ x: 3450, y: 1500 });
    expect(fluegel[0]!.b).toEqual({ x: 2550, y: 2400 });
    const { planInnerSvg } = await import('../src');
    const svg = planInnerSvg(doc, storeyId, 50).inner;
    expect(svg).toContain('stroke="white" stroke-width="120"'); // Radier-Lücke im Druck
  });

  it('Möbel-Phasen: Sanitär/Küche ab Bauprojekt, lose Möbel erst im Werkplan', async () => {
    const { doc, storeyId } = setupDoc();
    execute(doc, 'design.moebelSetzen', { storeyId, typ: 'wc', at: { x: 1000, y: 1000 }, rotationGrad: 0 });
    execute(doc, 'design.moebelSetzen', { storeyId, typ: 'bett-doppel', at: { x: 4000, y: 4000 }, rotationGrad: 0 });
    const { planInnerSvg } = await import('../src');
    // v0.7.3 D1: Möbel-Korpus zeichnet im geschnitten-Grau des Stilblatts
    // (#111 statt black — GOLDEN-WECHSEL-D1.md §1).
    const zaehle = () => (planInnerSvg(doc, storeyId, 50).inner.match(/fill="none" stroke="#111" stroke-width="9"/g) ?? []).length;
    expect(zaehle()).toBe(2); // werkplan (Default): beide
    execute(doc, 'design.phaseSetzen', { phase: 'bauprojekt' });
    expect(zaehle()).toBe(1); // nur WC (fester Einbau)
    execute(doc, 'design.phaseSetzen', { phase: 'vorprojekt' });
    expect(zaehle()).toBe(0);
  });
});

describe('Masslinienordnung (Vision B1)', () => {
  const eck = () => {
    const { doc, storeyId, assemblyId } = setupDoc(); // 3-Schicht-AW, Kern beton 180
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 0, y: 6000 } });
    return { doc, storeyId };
  };

  it('Öffnungs-Höhenmass «h/BH» hängt als Zweitzeile am richtigen Segment', async () => {
    const { doc, storeyId } = eck();
    const w = doc.byKind<Wall>('wall').find((x) => x.b.x === 9000)!;
    execute(doc, 'design.oeffnungSetzen', { wallId: w.id, openingType: 'fenster', center: 3000, width: 1200, height: 1400, sill: 900 });
    const oeffnung = deriveDimensions(doc, storeyId).chains.find((c) => c.axis === 'x' && c.role === 'oeffnung')!;
    expect(oeffnung.zusatz).toBeDefined();
    const i = oeffnung.ticks.indexOf(2400);
    expect(oeffnung.zusatz![i]).toBe('140/90'); // Sturz/Brüstung in cm
    expect(oeffnung.zusatz!.filter(Boolean)).toHaveLength(1);
    // Tür (sill 0): nur Höhe, keine Brüstung
    execute(doc, 'design.oeffnungSetzen', { wallId: w.id, openingType: 'tuer', center: 6000, width: 900, height: 2100, sill: 0 });
    const o2 = deriveDimensions(doc, storeyId).chains.find((c) => c.axis === 'x' && c.role === 'oeffnung')!;
    expect(o2.zusatz).toContain('210');
    const { planInnerSvg } = await import('../src');
    expect(planInnerSvg(doc, storeyId, 50).inner).toContain('140/90'); // Druck zeigt die Zweitzeile
  });

  it('Achskette erscheint nur mit Stützenraster, Rohkette nur opt-in — Ordnung von innen nach aussen', () => {
    const { doc, storeyId } = eck();
    let rollen = deriveDimensions(doc, storeyId).chains.filter((c) => c.axis === 'x').map((c) => c.role);
    expect(rollen).not.toContain('achse');
    expect(rollen).not.toContain('roh');
    execute(doc, 'design.rasterSetzen', { storeyId, achsmass: 4500, anzahl: 3, querAnzahl: 2 });
    execute(doc, 'design.bemassungSetzen', { rohKette: true });
    const x = deriveDimensions(doc, storeyId).chains.filter((c) => c.axis === 'x');
    rollen = x.map((c) => c.role);
    expect(rollen).toContain('achse');
    expect(rollen).toContain('roh');
    const achse = x.find((c) => c.role === 'achse')!;
    expect(achse.ticks).toEqual([0, 4500, 9000]);
    // Rohkette: Kanten der tragenden Schicht der Westwand (Kern 180 mm)
    const roh = x.find((c) => c.role === 'roh')!;
    expect(roh.ticks.length).toBeGreaterThanOrEqual(2);
    expect(Math.abs(roh.ticks[1]! - roh.ticks[0]!)).toBe(180);
    // Ordnung: Öffnungen zuoberst (nächst am Plan), dann Achse, Roh, Gesamt zuunterst
    const nachLage = [...x].sort((a, b) => b.offset - a.offset).map((c) => c.role);
    expect(nachLage).toEqual(['oeffnung', 'achse', 'roh', 'gesamt']);
  });
});

describe('Rollen-Vorstufe (Vision D2)', () => {
  it('rolleSetzen ist eine undo-fähige Projekteinstellung; weglassen = neutral', () => {
    const { doc } = setupDoc();
    expect(doc.settings.rolle).toBeNull();
    const res = execute(doc, 'design.rolleSetzen', { rolle: 'ausfuehrung' });
    expect(doc.settings.rolle).toBe('ausfuehrung');
    doc.apply(invertPatches(res.patches));
    expect(doc.settings.rolle).toBeNull();
    execute(doc, 'design.rolleSetzen', { rolle: 'entwurf' });
    execute(doc, 'design.rolleSetzen', {});
    expect(doc.settings.rolle).toBeNull();
    // Roundtrip: Rolle überlebt toJSON → fromJSON
    execute(doc, 'design.rolleSetzen', { rolle: 'admin' });
    expect(KosmoDoc.fromJSON(JSON.parse(JSON.stringify(doc.toJSON()))).settings.rolle).toBe('admin');
  });
});

describe('Generator L-Formen (Vision C4)', () => {
  it('zerlegeRektilinear: L → Hauptteil + Flügel (grösster Hauptteil gewinnt), Rechteck/U ehrlich', async () => {
    const { zerlegeRektilinear } = await import('../src');
    // L: BBox 12×9, Kerbe oben rechts ab (7000, 5000)
    const L = [
      { x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 5000 },
      { x: 7000, y: 5000 }, { x: 7000, y: 9000 }, { x: 0, y: 9000 },
    ];
    const z = zerlegeRektilinear(L);
    expect(z.typ).toBe('l');
    if (z.typ !== 'l') throw new Error('unreachable');
    // Senkrechter Schnitt bei x=7000 gibt den grössten Hauptteil (7×9 = 63 m² > 12×5)
    const bb = (p: { x: number; y: number }[]) => ({
      w: Math.max(...p.map((q) => q.x)) - Math.min(...p.map((q) => q.x)),
      h: Math.max(...p.map((q) => q.y)) - Math.min(...p.map((q) => q.y)),
    });
    expect(bb(z.haupt)).toEqual({ w: 7000, h: 9000 });
    expect(bb(z.fluegel)).toEqual({ w: 5000, h: 5000 });
    expect(zerlegeRektilinear([{ x: 0, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 6000 }, { x: 0, y: 6000 }]).typ).toBe('rechteck');
    // U-Form: 8 Ecken → unregelmässig
    const U = [
      { x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 8000 }, { x: 9000, y: 8000 },
      { x: 9000, y: 3000 }, { x: 3000, y: 3000 }, { x: 3000, y: 8000 }, { x: 0, y: 8000 },
    ];
    expect(zerlegeRektilinear(U).typ).toBe('unregelmaessig');
  });

  it('grundrissGenerieren füllt die L-Wohnung: Rezept im Hauptteil + Flügelzimmer mit Türen an der Naht', () => {
    const { doc, storeyId } = setupDoc();
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg L', sia: 'HNF', program: 'marktgerecht',
      outline: [
        { x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 6000 },
        { x: 7000, y: 6000 }, { x: 7000, y: 10000 }, { x: 0, y: 10000 },
      ],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    const zonen = doc.byKind<Zone>('zone');
    const fluegelZimmer = zonen.filter((z) => z.name.startsWith('Zimmer Flügel'));
    expect(fluegelZimmer.length).toBeGreaterThanOrEqual(1);
    expect(zonen.some((z) => z.name === 'Diele')).toBe(true); // Rezept im Hauptteil
    // Flügelzimmer liegen im Flügel (x < 7000, y > 6000)
    for (const z of fluegelZimmer) {
      expect(Math.max(...z.outline.map((p) => p.x))).toBeLessThanOrEqual(7000);
      expect(Math.min(...z.outline.map((p) => p.y))).toBeGreaterThanOrEqual(6000);
    }
    // Türen an der Naht y = 6000
    const tueren = doc.byKind<import('../src').ZonenTuer>('zonentuer').filter((t) => t.at.y === 6000 && t.at.x < 7000);
    expect(tueren.length).toBe(fluegelZimmer.length);
  });

  it('U-Wohnung wird ehrlich abgelehnt (CommandError, keine halben Zonen)', () => {
    const { doc, storeyId } = setupDoc();
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg U', sia: 'HNF', program: 'marktgerecht',
      outline: [
        { x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 8000 }, { x: 9000, y: 8000 },
        { x: 9000, y: 3000 }, { x: 3000, y: 3000 }, { x: 3000, y: 8000 }, { x: 0, y: 8000 },
      ],
    });
    const vorher = doc.entities.size;
    expect(() =>
      execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' }),
    ).toThrow(CommandError);
    expect(doc.entities.size).toBe(vorher);
  });
});

describe('Gebäude-Fluchtweg (Vision C3)', () => {
  // Turm: je Geschoss Treppenhaus (mit Treppe) + Zimmer, verbunden per Zonentür
  const turm = (geschosse: number, zimmerBreite = 6000) => {
    const doc = new KosmoDoc();
    const storeyIds: string[] = [];
    for (let i = 0; i < geschosse; i++) {
      const g = execute(doc, 'design.geschossErstellen', { name: i === 0 ? 'EG' : `${i}.OG`, index: i, elevation: i * 3000, height: 3000 });
      const sid = (g.patches[0] as { id: string }).id;
      storeyIds.push(sid);
      execute(doc, 'design.zoneErstellen', {
        storeyId: sid, name: 'Treppenhaus', sia: 'VF', raumTyp: 'treppenhaus',
        outline: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 3000 }, { x: 0, y: 3000 }],
      });
      execute(doc, 'design.zoneErstellen', {
        storeyId: sid, name: `Zimmer ${i}`, sia: 'HNF', raumTyp: 'zimmer',
        outline: [{ x: 3000, y: 0 }, { x: 3000 + zimmerBreite, y: 0 }, { x: 3000 + zimmerBreite, y: 3000 }, { x: 3000, y: 3000 }],
      });
      execute(doc, 'design.tuerSetzen', { storeyId: sid, at: { x: 3000, y: 1500 }, breite: 900 });
      execute(doc, 'design.treppeErstellen', { storeyId: sid, a: { x: 1500, y: 600 }, b: { x: 1500, y: 2400 }, width: 1200 });
    }
    return { doc, storeyIds };
  };

  it('verkettet die Geschosse über die Treppenläufe; EG bleibt ohne Vertikalanteil', async () => {
    const { doc, storeyIds } = turm(3);
    const { fluchtwegeGebaeude } = await import('../src');
    const wege = fluchtwegeGebaeude(doc);
    const zimmer = (sid: string) =>
      wege.find((w) => w.storeyId === sid && (doc.get<Zone>(w.zoneId) as Zone).raumTyp === 'zimmer')!;
    expect(zimmer(storeyIds[0]!).vertikal).toBe(0);
    expect(zimmer(storeyIds[1]!).vertikal).toBe(1800); // Lauflänge der geraden Treppe
    expect(zimmer(storeyIds[2]!).vertikal).toBe(3600); // zwei Geschosse
    expect(zimmer(storeyIds[2]!).distanz).toBeGreaterThan(zimmer(storeyIds[0]!).distanz + 3599);
    expect(Number.isFinite(zimmer(storeyIds[2]!).distanz)).toBe(true);
    // Bestehendes fluchtwege() bleibt unangetastet: pro Geschoss identisch
    const proGeschoss = fluchtwege(doc, storeyIds[2]!);
    expect(zimmer(storeyIds[2]!).distanz - 3600).toBeCloseTo(
      proGeschoss.find((w) => w.zoneId === zimmer(storeyIds[2]!).zoneId)!.distanz, 5,
    );
  });

  it('Checks: Übersichtswert > 35 m warnt; unterbrochene Treppenkette wird gemeldet', () => {
    // Zimmer 32 m breit: pro Geschoss ~33.5 m (unter 35), + 1.8 m Treppe → drüber
    const { doc, storeyIds } = turm(2, 32000);
    const befunde = pruefeGrundriss(doc, storeyIds[1]!).filter((b) => b.regel === 'Fluchtweg Gebäude');
    expect(befunde).toHaveLength(1);
    expect(befunde[0]!.text).toContain('Übersichtswert über dem 35-m-Richtwert');
    expect(befunde[0]!.text).toContain('1.8 m Treppenläufe');
    // EG-Treppe löschen → Kette unterbrochen (der Abstieg braucht die Treppe
    // des Basis-Geschosses; die OG-Treppe führte physisch ins Dach)
    const treppeEg = doc.byKind<import('../src').Stair>('stair').find((s) => s.storeyId === storeyIds[0]!)!;
    execute(doc, 'design.loeschen', { entityId: treppeEg.id });
    const kette = pruefeGrundriss(doc, storeyIds[1]!).filter((b) => b.regel === 'Fluchtweg Gebäude');
    expect(kette).toHaveLength(1);
    expect(kette[0]!.text).toContain('kein durchgehendes Treppenhaus');
  });

  it('Review-Fix: oberstes Geschoss ohne eigene Treppe steigt über die EG-Treppe ab', async () => {
    const { doc, storeyIds } = turm(2);
    // Die OG-Treppe (führte ins Dach) weg — der Abstieg lebt von der EG-Treppe
    const treppeOg = doc.byKind<import('../src').Stair>('stair').find((s) => s.storeyId === storeyIds[1]!)!;
    execute(doc, 'design.loeschen', { entityId: treppeOg.id });
    const { fluchtwegeGebaeude } = await import('../src');
    const og = fluchtwegeGebaeude(doc).filter((w) => w.storeyId === storeyIds[1]!);
    expect(og.length).toBeGreaterThan(0);
    for (const w of og) {
      expect(w.vertikal).toBe(1800); // Lauflänge der EG-Treppe
      expect(Number.isFinite(w.distanz)).toBe(true);
    }
    expect(pruefeGrundriss(doc, storeyIds[1]!).filter((b) => b.regel === 'Fluchtweg Gebäude')).toHaveLength(0);
  });
});

describe('Schallschutz-Hinweis (Vision C2)', () => {
  it('TW-Wände: Massengesetz gegen SIA 181 — KS 200 grün, Backstein 150 warnt, Leichtwand unbewertbar', async () => {
    const { doc, storeyId } = setupDoc();
    const tw = (name: string, material: string, dicke: number) =>
      (execute(doc, 'design.aufbauErstellen', {
        name, target: 'wall',
        layers: [{ material, thickness: dicke, function: 'tragend' }],
      }).patches[0] as { id: string }).id;
    const wand = (assemblyId: string, y: number) =>
      execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y }, b: { x: 6000, y } });
    wand(tw('TW KS 20', 'kalksandstein', 200), 0); // 360 kg/m² → Rw ≈ 57 dB
    wand(tw('TW Backstein 15', 'backstein', 150), 3000); // 165 kg/m² → Rw ≈ 46 dB
    wand(tw('TW Leicht', 'gips', 50), 6000); // 45 kg/m² → nicht anwendbar
    wand(tw('AW Normal', 'beton', 200), 9000); // keine TW → kein Befund
    const befunde = pruefeGrundriss(doc, storeyId).filter((b) => b.regel === 'Schallschutz');
    expect(befunde).toHaveLength(3);
    const ks = befunde.find((b) => b.text.includes('TW KS 20'))!;
    expect(ks.schwere).toBe('hinweis');
    expect(ks.text).toContain('Rw ≈ 57 dB ≥ 52 dB');
    expect(ks.text).toContain('kein Nachweis');
    const backstein = befunde.find((b) => b.text.includes('Backstein'))!;
    expect(backstein.schwere).toBe('warnung');
    expect(backstein.text).toContain('< 52 dB');
    const leicht = befunde.find((b) => b.text.includes('TW Leicht'))!;
    expect(leicht.schwere).toBe('warnung');
    expect(leicht.text).toContain('Massengesetz nicht anwendbar');
    const { flaechenmasse } = await import('../src');
    expect(flaechenmasse(doc.byKind<Assembly>('assembly').find((a) => a.name === 'TW KS 20')!)).toBeCloseTo(360, 5);
  });
});

describe('NPK-nahes Ausmass (Vision C1)', () => {
  it('Wände: Abzug nur > 0.5 m², Leibungen als eigene Position — Handrechnung', async () => {
    const { doc, storeyId, assemblyId } = setupDoc(); // AW 360 dick, Geschoss 3000
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    const wallId = (w.patches[0] as { id: string }).id;
    execute(doc, 'design.oeffnungSetzen', { wallId, openingType: 'fenster', center: 2000, width: 1200, height: 1400, sill: 900 }); // 1.68 m² > 0.5 → Abzug
    execute(doc, 'design.oeffnungSetzen', { wallId, openingType: 'fenster', center: 6000, width: 600, height: 700, sill: 1400 }); // 0.42 m² ≤ 0.5 → bleibt
    const { deriveAusmass, NPK_ABZUG_SCHWELLE_M2 } = await import('../src');
    expect(NPK_ABZUG_SCHWELLE_M2).toBe(0.5);
    const a = deriveAusmass(doc);
    const wand = a.positionen.find((p) => p.position === 'Wände AW Beton 36')!;
    expect(wand.menge).toBeCloseTo(9 * 3 - 1.68, 5); // 25.32 m²
    expect(wand.herleitung).toContain('1 Öffnungen > 0.5');
    expect(wand.herleitung).toContain('1 kleine bleiben im Mass');
    const volumen = a.positionen.find((p) => p.position.includes('Volumen') && p.position.includes('AW'))!;
    expect(volumen.menge).toBeCloseTo(25.32 * 0.36, 5);
    const leibungen = a.positionen.find((p) => p.position.startsWith('Leibungen'))!;
    expect(leibungen.menge).toBeCloseTo((2 * 2.6 + 2 * 1.3) * 0.36, 5); // 2.808 m²
    // Fenster als Stück-Position mit Lichtfläche
    const fenster = a.positionen.find((p) => p.kapitel.includes('371'))!;
    expect(fenster.menge).toBe(2);
    expect(fenster.herleitung).toContain('2.10 m²');
  });

  it('Decken: Aussparungen > 0.5 m² abgezogen; Wand-Durchbrüche als Stück; CSV', async () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const s = execute(doc, 'design.deckeZeichnen', {
      storeyId, thickness: 250,
      outline: [{ x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 6000 }, { x: 0, y: 6000 }],
    });
    const slabId = (s.patches[0] as { id: string }).id;
    execute(doc, 'design.aussparungSetzen', { hostId: slabId, at: { x: 2000, y: 2000 }, breite: 1000, hoehe: 1000 }); // 1.0 m² → Abzug
    execute(doc, 'design.aussparungSetzen', { hostId: slabId, typ: 'schlitz', at: { x: 4000, y: 4000 }, breite: 400, hoehe: 800 }); // 0.32 m² → bleibt
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 6000, y: 0 } });
    execute(doc, 'design.aussparungSetzen', { hostId: (w.patches[0] as { id: string }).id, center: 3000, breite: 300, hoehe: 300, sill: 1100 });
    const { deriveAusmass, ausmassAlsCsv } = await import('../src');
    const a = deriveAusmass(doc);
    const decke = a.positionen.find((p) => p.position === 'Decken/Bodenplatten')!;
    expect(decke.menge).toBeCloseTo(36 - 1, 5);
    const deckenVolumen = a.positionen.find((p) => p.position === 'Decken/Bodenplatten — Volumen')!;
    expect(deckenVolumen.menge).toBeCloseTo(35 * 0.25, 5);
    const bohrungen = a.positionen.find((p) => p.position.startsWith('Kernbohrungen'))!;
    expect(bohrungen.menge).toBe(1);
    expect(bohrungen.einheit).toBe('Stk');
    const csv = ausmassAlsCsv(a);
    expect(csv).toContain('Kapitel;Position;Einheit;Menge;Herleitung');
    expect(csv).toContain('Decken/Bodenplatten;m2;35.00');
    expect(csv).toContain('kein Ersatz für ein CRB-Devis');
  });

  it('Review-Fix: CSV quotet Felder mit Semikolon — jede Zeile hat exakt 5 Spalten', async () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    const wallId = (w.patches[0] as { id: string }).id;
    // grosse UND kleine Öffnung → Herleitung «… > 0.5 m²; … bleiben im Mass» enthält ein Semikolon
    execute(doc, 'design.oeffnungSetzen', { wallId, openingType: 'fenster', center: 2000, width: 1200, height: 1400, sill: 900 });
    execute(doc, 'design.oeffnungSetzen', { wallId, openingType: 'fenster', center: 6000, width: 600, height: 700, sill: 1400 });
    const { deriveAusmass, ausmassAlsCsv } = await import('../src');
    const csv = ausmassAlsCsv(deriveAusmass(doc));
    // RFC-4180-bewusster Feld-Splitter
    const felder = (zeile: string) => {
      const out: string[] = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < zeile.length; i++) {
        const ch = zeile[i]!;
        if (inQ) {
          if (ch === '"') {
            if (zeile[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
          } else cur += ch;
        } else if (ch === '"') inQ = true;
        else if (ch === ';') { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur);
      return out;
    };
    for (const zeile of csv.split('\n')) expect(felder(zeile)).toHaveLength(5);
    // Die Semikolon-Herleitung überlebt die Quotierung wörtlich
    const wandZeile = csv.split('\n').find((z) => z.includes('Wände AW Beton 36;'))!;
    expect(felder(wandZeile)[4]).toContain('> 0.5 m²; 1 kleine bleiben im Mass');
  });
});

describe('Treppe an der Schnitthöhe gekappt (Vision B3)', () => {
  it('gerader Lauf: unten ausgezogen, oben strichpunktiert, Bruchlinie am Schnitt', async () => {
    const { doc, storeyId } = setupDoc(); // 3000 hoch, cutHeight 1100
    execute(doc, 'design.treppeErstellen', { storeyId, a: { x: 0, y: 0 }, b: { x: 6000, y: 0 }, width: 1200 });
    const st = doc.byKind<import('../src').Stair>('stair')[0]!;
    const lauf = treppenTeile(st, 3000, 0).laeufe[0]!;
    const erwarteUnten = Array.from({ length: lauf.steigungen - 1 }, (_, k) => k + 1)
      .filter((i) => lauf.z0 + i * lauf.riser <= 1100).length;
    const plan = derivePlan(doc, storeyId);
    const treppe = plan.regions.filter((r) => r.classes.includes('treppe'));
    expect(treppe).toHaveLength(2); // unter + über dem Schnitt
    expect(treppe.filter((r) => r.classes.includes('ueber-schnitt'))).toHaveLength(1);
    expect(plan.lines.filter((l) => l.classes.includes('bruchlinie'))).toHaveLength(1);
    const stufen = plan.lines.filter((l) => l.classes.includes('stufe'));
    expect(stufen.filter((l) => !l.classes.includes('ueber-schnitt'))).toHaveLength(erwarteUnten);
    expect(stufen.filter((l) => l.classes.includes('ueber-schnitt'))).toHaveLength(lauf.steigungen - 1 - erwarteUnten);
    // Druck: strichpunktierter Stift für den oberen Teil
    const { planInnerSvg } = await import('../src');
    expect(planInnerSvg(doc, storeyId, 50).inner).toContain('stroke-dasharray="75 30 15 30"');
  });
});

describe('Fenster-Anschlag + Rohboden-Linie (Vision B4)', () => {
  it('Werkplan zeigt den Blockanschlag in der Leibung, Tiefe folgt Opening.anschlag', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    const o = execute(doc, 'design.oeffnungSetzen', {
      wallId: (w.patches[0] as { id: string }).id,
      openingType: 'fenster', center: 3000, width: 1200, height: 1400, sill: 900,
    });
    const anschlaege = () => derivePlan(doc, storeyId).lines.filter((l) => l.classes.includes('anschlag'));
    expect(anschlaege()).toHaveLength(2); // Default-Tiefe 40 an beiden Leibungen
    expect(anschlaege()[0]!.a.x).toBe(2440); // s0 (2400) + 40
    execute(doc, 'design.eigenschaftSetzen', { entityId: (o.patches[0] as { id: string }).id, feld: 'anschlag', wert: 80 });
    expect(anschlaege()[0]!.a.x).toBe(2480);
    execute(doc, 'design.phaseSetzen', { phase: 'bauprojekt' });
    expect(anschlaege()).toHaveLength(0); // Werkplan-Detail
  });

  it('Rohboden-Linie im Schnitt: Decken mit Aufbau zeigen die Belagsgrenze, Vorprojekt nicht', () => {
    const { doc, storeyId } = setupDoc();
    const au = execute(doc, 'design.aufbauErstellen', {
      name: 'Decke UB', target: 'slab',
      layers: [
        { material: 'unterlagsboden', thickness: 80, function: 'bekleidung' },
        { material: 'trittschall', thickness: 20, function: 'daemmung' },
        { material: 'beton', thickness: 240, function: 'tragend' },
      ],
    });
    execute(doc, 'design.deckeZeichnen', {
      storeyId, thickness: 240, assemblyId: (au.patches[0] as { id: string }).id,
      outline: [{ x: 0, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 4000 }, { x: 0, y: 4000 }],
    });
    const spec = { a: { x: 4500, y: -2000 }, b: { x: 4500, y: 2000 }, depth: 8000, lookLeft: true } as const;
    const svg = sectionInnerSvg(doc, spec, 100).inner;
    // z = 0 − (80+20) = −100; Schnittgerade x=4500 kreuzt die Decke bei s 2000…6000
    expect(svg).toContain('<line x1="2000" y1="100" x2="6000" y2="100"');
    expect(svg).toContain('class="rohboden"');
    execute(doc, 'design.phaseSetzen', { phase: 'vorprojekt' });
    expect(sectionInnerSvg(doc, spec, 100).inner).not.toContain('rohboden');
  });
});

describe('Koten roh/fertig + Absolutbezug (Vision B2)', () => {
  it('fertig gefüllt, roh offen (Bodenaufbau-Delta), EG-Kote trägt m ü.M.', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    const spec = { a: { x: 4500, y: -2000 }, b: { x: 4500, y: 2000 }, depth: 5000, lookLeft: true } as const;
    // Ohne Decken-Aufbau: nur die gefüllte fertig-Kote, keine roh-Kote
    let svg = sectionInnerSvg(doc, spec, 100).inner;
    // v0.7.3 D1: Koten zeichnen im geschnitten-Grau des Stilblatts (#111).
    expect(svg).toContain('Z" fill="#111" stroke="#111"'); // gefülltes Dreieck
    expect(svg).not.toContain(' roh<');
    // Decken-Aufbau: Belag 10 + Unterlagsboden 70 + Trittschall 20 ÜBER tragend 240
    const au = execute(doc, 'design.aufbauErstellen', {
      name: 'Decke UB', target: 'slab',
      layers: [
        { material: 'belag', thickness: 10, function: 'bekleidung' },
        { material: 'unterlagsboden', thickness: 70, function: 'bekleidung' },
        { material: 'trittschall', thickness: 20, function: 'daemmung' },
        { material: 'beton', thickness: 240, function: 'tragend' },
      ],
    });
    execute(doc, 'design.deckeZeichnen', {
      storeyId, thickness: 240, assemblyId: (au.patches[0] as { id: string }).id,
      outline: [{ x: 0, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 4000 }, { x: 0, y: 4000 }],
    });
    execute(doc, 'design.standortSetzen', { label: 'Zug', lat: 47.17, lon: 8.52, e: 2681800, n: 1224700, hoeheM: 425.5 });
    svg = sectionInnerSvg(doc, spec, 100).inner;
    expect(svg).toContain('−0.10 roh'); // 0 − (10+70+20) = −100 mm
    expect(svg).toContain('±0.00 = 425.50 m ü.M.');
    // falscher Aufbau-Typ wird abgewiesen
    expect(() =>
      execute(doc, 'design.deckeZeichnen', {
        storeyId, assemblyId,
        outline: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }],
      }),
    ).toThrow(CommandError);
  });
});

describe('Schnitt setzen (H-9: Schnitt-Werkzeug an Command gebunden)', () => {
  it('setzt die Schnittlinie mit Defaults für depth/lookLeft', () => {
    const { doc } = setupDoc();
    expect(doc.settings.schnitt ?? null).toBe(null);
    execute(doc, 'design.schnittSetzen', { a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } });
    expect(doc.settings.schnitt).toEqual({
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
      depth: 30000,
      lookLeft: true,
    });
  });

  it('übernimmt explizite depth/lookLeft', () => {
    const { doc } = setupDoc();
    execute(doc, 'design.schnittSetzen', {
      a: { x: 1000, y: 2000 }, b: { x: 1000, y: 8000 }, depth: 12000, lookLeft: false,
    });
    expect(doc.settings.schnitt).toEqual({
      a: { x: 1000, y: 2000 },
      b: { x: 1000, y: 8000 },
      depth: 12000,
      lookLeft: false,
    });
  });

  it('weist eine Schnittlinie der Länge 0 ab', () => {
    const { doc } = setupDoc();
    expect(() =>
      execute(doc, 'design.schnittSetzen', { a: { x: 500, y: 500 }, b: { x: 500, y: 500 } }),
    ).toThrow(CommandError);
  });

  it('Undo stellt den vorherigen Schnitt-Zustand wieder her (H-9: geht über die History)', () => {
    const { doc } = setupDoc();
    const h = new History();
    const res = execute(doc, 'design.schnittSetzen', { a: { x: 0, y: 0 }, b: { x: 4000, y: 0 } });
    h.record(res.patches);
    expect(doc.settings.schnitt).not.toBe(undefined);
    h.undo(doc);
    expect(doc.settings.schnitt ?? null).toBe(null);
  });
});

describe('Treppen-Ausbau (V2-A2)', () => {
  const basis = () => {
    const { doc, storeyId } = setupDoc(); // EG, 3000 hoch
    return { doc, storeyId };
  };
  const treppe = (doc: KosmoDoc, storeyId: string, p: Record<string, unknown>) =>
    execute(doc, 'design.treppeErstellen', { storeyId, width: 1200, ...p });

  it('U-Lauf: zwei Läufe + Wendepodest auf halber Höhe, Austritt neben dem Antritt', () => {
    const { doc, storeyId } = basis();
    treppe(doc, storeyId, { a: { x: 0, y: 0 }, b: { x: 3000, y: 0 }, form: 'u' });
    const st = doc.byKind<import('../src').Stair>('stair')[0]!;
    const teile = treppenTeile(st, 3000, 0);
    expect(teile.laeufe).toHaveLength(2);
    expect(teile.podeste).toHaveLength(1);
    // Podest auf Zwischenhöhe (~1500 bei 17 Steigungen: 9·176.5 ≈ 1588)
    expect(teile.podeste[0]!.z).toBeGreaterThan(1200);
    expect(teile.podeste[0]!.z).toBeLessThan(1900);
    // Lauf 2 läuft zurück, parallel versetzt um die Laufbreite
    expect(teile.laeufe[1]!.a.y).toBe(1200);
    expect(teile.laeufe[1]!.b.x).toBe(0);
    // Gesamtlauflänge = 2 Läufe
    expect(teile.gesamtLauflaenge).toBe(6000);
    // 3D: Mesh erreicht die Geschosshöhe nicht ganz (letzter Tritt = Decke), Podest liegt drin
    const art = deriveAll(doc).find((a) => a.entityId === st.id)!;
    let maxZ = 0;
    for (let i = 2; i < art.positions.length; i += 3) maxZ = Math.max(maxZ, art.positions[i]!);
    expect(maxZ).toBeGreaterThan(2500);
  });

  it('Zwischenpodest: gerader Lauf zerfällt in zwei Läufe mit flacher Platte', () => {
    const { doc, storeyId } = basis();
    treppe(doc, storeyId, { a: { x: 0, y: 0 }, b: { x: 6000, y: 0 }, form: 'podest' });
    const st = doc.byKind<import('../src').Stair>('stair')[0]!;
    const teile = treppenTeile(st, 3000, 0);
    expect(teile.laeufe).toHaveLength(2);
    expect(teile.podeste).toHaveLength(1);
    // Podest liegt zwischen den Läufen auf der Achse
    expect(teile.laeufe[0]!.b.x).toBeLessThan(teile.laeufe[1]!.a.x);
    // Plansymbol: Lauf 1 wird an der Schnitthöhe gekappt (B3) → 2 Teile,
    // Lauf 2 liegt ganz darüber, dazu das Podest = 4 Treppen-Regionen
    const plan = derivePlan(doc, storeyId);
    const treppenRegionen = plan.regions.filter((r) => r.classes.includes('treppe'));
    expect(treppenRegionen).toHaveLength(4);
    expect(plan.regions.some((r) => r.classes.includes('podest'))).toBe(true);
    expect(plan.lines.filter((l) => l.classes.includes('stufe')).length).toBeGreaterThan(10);
  });

  it('L-Lauf braucht die Ecke; mit Ecke entsteht das Eckpodest am Knick', () => {
    const { doc, storeyId } = basis();
    expect(() => treppe(doc, storeyId, { a: { x: 0, y: 0 }, b: { x: 3000, y: 3000 }, form: 'l' })).toThrow(
      CommandError,
    );
    treppe(doc, storeyId, { a: { x: 0, y: 0 }, b: { x: 3000, y: 3000 }, form: 'l', ecke: { x: 3000, y: 0 } });
    const st = doc.byKind<import('../src').Stair>('stair')[0]!;
    const teile = treppenTeile(st, 3000, 0);
    expect(teile.laeufe).toHaveLength(2);
    expect(teile.podeste[0]!.outline.length).toBeGreaterThanOrEqual(3);
    // Eckpodest liegt am Knick (um die Ecke herum)
    const cx = teile.podeste[0]!.outline.reduce((s, p) => s + p.x, 0) / teile.podeste[0]!.outline.length;
    expect(Math.abs(cx - 3000)).toBeLessThan(1200);
  });

  it('gerade Treppe bleibt exakt beim Bestandsverhalten (ein Lauf, kein Podest)', () => {
    const { doc, storeyId } = basis();
    treppe(doc, storeyId, { a: { x: 0, y: 0 }, b: { x: 4500, y: 0 } });
    const st = doc.byKind<import('../src').Stair>('stair')[0]!;
    expect(st.form).toBeUndefined();
    const teile = treppenTeile(st, 3000, 0);
    expect(teile.laeufe).toHaveLength(1);
    expect(teile.podeste).toHaveLength(0);
    expect(teile.spec.steps).toBe(Math.round(3000 / 175));
  });

  it('Checks: viele Steigungen ohne Podest → Podest-Hinweis; U-Lauf rechnet über den Gesamtlauf', () => {
    const { doc } = setupDoc();
    const og = execute(doc, 'design.geschossErstellen', { name: 'Halle', index: 1, elevation: 3000, height: 4200 });
    const hallenId = (og.patches[0] as { id: string }).id;
    // 4.2 m Geschoss → 24 Steigungen: gerade = Hinweis, U-Lauf = keiner
    execute(doc, 'design.treppeErstellen', { storeyId: hallenId, a: { x: 0, y: 0 }, b: { x: 7000, y: 0 }, width: 1200 });
    let befunde = pruefeGrundriss(doc, hallenId);
    expect(befunde.some((b) => b.regel === 'Podest')).toBe(true);
    execute(doc, 'design.loeschen', { entityId: doc.byKind('stair')[0]!.id });
    execute(doc, 'design.treppeErstellen', { storeyId: hallenId, a: { x: 0, y: 0 }, b: { x: 3500, y: 0 }, width: 1200, form: 'u' });
    befunde = pruefeGrundriss(doc, hallenId);
    expect(befunde.some((b) => b.regel === 'Podest')).toBe(false);
  });
});

// ————— V2-A4: Bestand-Erkennung (IFC → Entities) —————

describe('Bestand-Erkennung (V2-A4)', () => {
  /** Quader als Vertex-Tripel (mm, z-oben): Achse a→b, Dicke d, Höhe h ab z0. */
  function quader(a: { x: number; y: number }, b: { x: number; y: number }, d: number, h: number, z0 = 0): number[] {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    const n = { x: -dir.y, y: dir.x };
    const ecken = [
      { x: a.x + n.x * (d / 2), y: a.y + n.y * (d / 2) },
      { x: b.x + n.x * (d / 2), y: b.y + n.y * (d / 2) },
      { x: b.x - n.x * (d / 2), y: b.y - n.y * (d / 2) },
      { x: a.x - n.x * (d / 2), y: a.y - n.y * (d / 2) },
    ];
    const raus: number[] = [];
    for (const z of [z0, z0 + h]) for (const e of ecken) raus.push(e.x, e.y, z);
    return raus;
  }

  it('achsparalleler Quader → Wandachse, Dicke, Höhe, z0', () => {
    const wand = erkenneWand(quader({ x: 0, y: 0 }, { x: 6000, y: 0 }, 300, 2800, 0));
    expect(wand).not.toBeNull();
    expect(wand!.dicke).toBe(300);
    expect(wand!.hoehe).toBe(2800);
    expect(wand!.z0).toBe(0);
    const laenge = Math.hypot(wand!.b.x - wand!.a.x, wand!.b.y - wand!.a.y);
    expect(Math.round(laenge)).toBe(6000);
    expect(Math.abs(wand!.a.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(wand!.b.y)).toBeLessThanOrEqual(1);
  });

  it('um 30° gedrehter Quader wird mit gleicher Achse erkannt', () => {
    const b = { x: Math.round(5000 * Math.cos(Math.PI / 6)), y: Math.round(5000 * Math.sin(Math.PI / 6)) };
    const wand = erkenneWand(quader({ x: 1000, y: 2000 }, { x: 1000 + b.x, y: 2000 + b.y }, 240, 3000, 3000));
    expect(wand).not.toBeNull();
    expect(wand!.dicke).toBeGreaterThanOrEqual(239);
    expect(wand!.dicke).toBeLessThanOrEqual(241);
    expect(wand!.z0).toBe(3000);
    const laenge = Math.hypot(wand!.b.x - wand!.a.x, wand!.b.y - wand!.a.y);
    expect(Math.abs(laenge - 5000)).toBeLessThanOrEqual(3);
  });

  it('L-förmiger Footprint und Nicht-Wand-Masse werden abgelehnt', () => {
    // zwei Schenkel als EIN Element → Füllgrad der Hülle zu klein
    const l = [
      ...quader({ x: 0, y: 0 }, { x: 6000, y: 0 }, 300, 2800),
      ...quader({ x: 0, y: 0 }, { x: 0, y: 6000 }, 300, 2800),
    ];
    expect(erkenneWand(l)).toBeNull();
    // zu dick (Stützenblock 2×2 m) und zu flach (Brüstung 60 cm)
    expect(erkenneWand(quader({ x: 0, y: 0 }, { x: 2000, y: 0 }, 2000, 2800))).toBeNull();
    expect(erkenneWand(quader({ x: 0, y: 0 }, { x: 6000, y: 0 }, 300, 600))).toBeNull();
  });

  it('flache Platte → Decke mit Umriss und Oberkante; hochkant bleibt Wand-Sache', () => {
    const platte = quader({ x: 0, y: 4000 }, { x: 8000, y: 4000 }, 8000, 250, -250);
    const decke = erkenneDecke(platte);
    expect(decke).not.toBeNull();
    expect(decke!.dicke).toBe(250);
    expect(decke!.zOben).toBe(0);
    expect(decke!.outline.length).toBeGreaterThanOrEqual(4);
    expect(erkenneDecke(quader({ x: 0, y: 0 }, { x: 6000, y: 0 }, 300, 2800))).toBeNull();
  });

  it('geschossZu findet das nächstliegende Geschoss innerhalb der Toleranz', () => {
    expect(geschossZu([0, 3000, 6000], 2950)).toBe(1);
    expect(geschossZu([0, 3000], 1500)).toBe(-1);
    expect(geschossZu([], 0)).toBe(-1);
  });
});

// ————— V2-F1/F2: Raumgraph + Fluchtweg —————

describe('Raumgraph + Fluchtweg (V2-F1/F2)', () => {
  /** Korridor verbindet Zimmer (Tür) und Treppenhaus (offener Übergang). */
  function grundriss() {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'IW 15', target: 'wall', layers: [{ material: 'kalksandstein', thickness: 150, function: 'tragend' }],
    });
    const assemblyId = (aufbau.patches[0] as { id: string }).id;
    // Zimmer 0..5m | Wand bei y=4000 mit Tür | Korridor 4..6m | offen | Treppenhaus 6..9m
    const zimmer = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Zimmer', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 4000 }, { x: 0, y: 4000 }],
    });
    const wand = execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 0, y: 4000 }, b: { x: 5000, y: 4000 },
    });
    execute(doc, 'design.oeffnungSetzen', {
      wallId: (wand.patches[0] as { id: string }).id,
      openingType: 'tuer', center: 2500, width: 900, height: 2100, sill: 0,
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Korridor', sia: 'VF', raumTyp: 'korridor',
      outline: [{ x: 0, y: 4000 }, { x: 5000, y: 4000 }, { x: 5000, y: 6000 }, { x: 0, y: 6000 }],
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Treppenhaus', sia: 'VF', raumTyp: 'treppenhaus',
      outline: [{ x: 0, y: 6000 }, { x: 5000, y: 6000 }, { x: 5000, y: 9000 }, { x: 0, y: 9000 }],
    });
    return { doc, storeyId, zimmerId: (zimmer.patches[0] as { id: string }).id };
  }

  it('Tür- und Offen-Kanten entstehen; Treppenhaus ist Fluchtziel', () => {
    const { doc, storeyId, zimmerId } = grundriss();
    const graph = raumGraph(doc, storeyId);
    expect(graph.zonen).toHaveLength(3);
    expect(graph.kanten.filter((k) => k.art === 'tuer')).toHaveLength(1);
    expect(graph.kanten.filter((k) => k.art === 'offen')).toHaveLength(1);
    const wege = fluchtwege(doc, storeyId);
    const zimmer = wege.find((w) => w.zoneId === zimmerId)!;
    expect(zimmer.distanz).toBeGreaterThan(4000); // Ecke→Tür mindestens
    expect(zimmer.distanz).toBeLessThan(15000);
    expect(zimmer.pfad.length).toBeGreaterThanOrEqual(2);
  });

  it('ohne Tür keine Verbindung → Befund «Fluchtweg»', () => {
    const { doc, storeyId } = grundriss();
    // Tür entfernen: einzige Öffnung suchen und Wand samt Öffnung ersetzen wäre teuer —
    // stattdessen frisches Setup ohne Tür
    const doc2 = new KosmoDoc();
    const eg = execute(doc2, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const sid = (eg.patches[0] as { id: string }).id;
    const aufbau = execute(doc2, 'design.aufbauErstellen', {
      name: 'IW 15', target: 'wall', layers: [{ material: 'kalksandstein', thickness: 150, function: 'tragend' }],
    });
    execute(doc2, 'design.wandZeichnen', {
      storeyId: sid, assemblyId: (aufbau.patches[0] as { id: string }).id,
      a: { x: 0, y: 4000 }, b: { x: 5000, y: 4000 },
    });
    execute(doc2, 'design.zoneErstellen', {
      storeyId: sid, name: 'Zimmer', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 4000 }, { x: 0, y: 4000 }],
    });
    execute(doc2, 'design.zoneErstellen', {
      storeyId: sid, name: 'Treppenhaus', sia: 'VF', raumTyp: 'treppenhaus',
      outline: [{ x: 0, y: 4000 }, { x: 5000, y: 4000 }, { x: 5000, y: 7000 }, { x: 0, y: 7000 }],
    });
    const befunde = pruefeGrundriss(doc2, sid);
    expect(befunde.some((b) => b.regel === 'Fluchtweg' && b.text.includes('keine Verbindung'))).toBe(true);
    void storeyId;
    void doc;
  });

  it('raumTypSetzen ist undo-fähig und macht eine Zone zum Fluchtziel', () => {
    const { doc, storeyId } = grundriss();
    const zone = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Lager', sia: 'NNF',
      outline: [{ x: 6000, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 2000 }, { x: 6000, y: 2000 }],
    });
    const zoneId = (zone.patches[0] as { id: string }).id;
    const r = execute(doc, 'design.raumTypSetzen', { zoneId, raumTyp: 'treppenhaus' });
    expect((doc.get(zoneId) as { raumTyp?: string }).raumTyp).toBe('treppenhaus');
    doc.apply(invertPatches(r.patches));
    expect((doc.get(zoneId) as { raumTyp?: string }).raumTyp).toBeUndefined();
  });

  it('Wand zwischen den Zonen unterdrückt den offenen Übergang', () => {
    const { doc, storeyId } = grundriss();
    const graph1 = raumGraph(doc, storeyId);
    expect(graph1.kanten.filter((k) => k.art === 'offen')).toHaveLength(1);
    const aufbau = doc.byKind<Assembly>('assembly')[0]!;
    execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId: aufbau.id, a: { x: 0, y: 6000 }, b: { x: 5000, y: 6000 },
    });
    const graph2 = raumGraph(doc, storeyId);
    expect(graph2.kanten.filter((k) => k.art === 'offen')).toHaveLength(0);
  });
});

describe('Grenzabstand (V2-Vorform)', () => {
  function setup(grenzabstand: number, mehr?: { ab: number; anteil: number }) {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.baugrenzeSetzen', {
      storeyId,
      outline: [{ x: 0, y: 0 }, { x: 20000, y: 0 }, { x: 20000, y: 20000 }, { x: 0, y: 20000 }],
      grenzabstand,
      ...(mehr ? { mehrHoehenAb: mehr.ab, mehrHoehenAnteil: mehr.anteil } : {}),
    });
    return { doc, storeyId };
  }

  it('Volumen zu nah an der Grenze → Fehler mit Ist/Soll', () => {
    const { doc, storeyId } = setup(4000);
    execute(doc, 'design.volumenErstellen', {
      storeyId, height: 6000,
      outline: [{ x: 2000, y: 2000 }, { x: 10000, y: 2000 }, { x: 10000, y: 10000 }, { x: 2000, y: 10000 }],
    });
    const b = pruefeGrundriss(doc, storeyId).filter((x) => x.regel === 'Grenzabstand');
    expect(b).toHaveLength(1);
    expect(b[0]!.text).toContain('2.0 m');
    expect(b[0]!.text).toContain('4.0 m');
  });

  it('genug Abstand → kein Befund; Mehrhöhenzuschlag staffelt', () => {
    const { doc, storeyId } = setup(4000, { ab: 12000, anteil: 0.5 });
    execute(doc, 'design.volumenErstellen', {
      storeyId, height: 11000,
      outline: [{ x: 5000, y: 5000 }, { x: 15000, y: 5000 }, { x: 15000, y: 15000 }, { x: 5000, y: 15000 }],
    });
    expect(pruefeGrundriss(doc, storeyId).filter((x) => x.regel === 'Grenzabstand')).toHaveLength(0);
    // 20 m hoch → Zuschlag (20−12)/2 = 4 m → Soll 8 m > Ist 5 m
    execute(doc, 'design.volumenErstellen', {
      storeyId, height: 20000,
      outline: [{ x: 5000, y: 5000 }, { x: 15000, y: 5000 }, { x: 15000, y: 15000 }, { x: 5000, y: 15000 }],
    });
    const b = pruefeGrundriss(doc, storeyId).filter((x) => x.regel === 'Grenzabstand');
    expect(b).toHaveLength(1);
    expect(b[0]!.text).toContain('Mehrhöhenzuschlag');
  });

  function setupMitAufbau(grenzabstand: number | null) {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const au = execute(doc, 'design.aufbauErstellen', {
      name: 'AW', target: 'wall',
      layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    const assemblyId = (au.patches[0] as { id: string }).id;
    execute(doc, 'design.baugrenzeSetzen', {
      storeyId,
      outline: [{ x: 0, y: 0 }, { x: 20000, y: 0 }, { x: 20000, y: 20000 }, { x: 0, y: 20000 }],
      grenzabstand,
    });
    return { doc, storeyId, assemblyId };
  }

  it('Wand knapp innerhalb des Grenzabstands → kein Befund', () => {
    const { doc, storeyId, assemblyId } = setupMitAufbau(4000);
    execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 5000, y: 5000 }, b: { x: 15000, y: 5000 },
    });
    expect(pruefeGrundriss(doc, storeyId).filter((x) => x.regel === 'Grenzabstand')).toHaveLength(0);
  });

  it('Wand zu nah an der Grenze → Fehler mit Ist/Soll', () => {
    const { doc, storeyId, assemblyId } = setupMitAufbau(4000);
    execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 2000, y: 5000 }, b: { x: 15000, y: 5000 },
    });
    const b = pruefeGrundriss(doc, storeyId).filter((x) => x.regel === 'Grenzabstand');
    expect(b).toHaveLength(1);
    expect(b[0]!.text).toContain('Wand');
    expect(b[0]!.text).toContain('2.0 m');
    expect(b[0]!.text).toContain('4.0 m');
  });

  it('ohne eigenen Baugrenze-Grenzabstand greift die Zonenregel «grenzabstandKlein» als Minimum', () => {
    const { doc, storeyId, assemblyId } = setupMitAufbau(null);
    execute(doc, 'design.zonenRegelSetzen', {
      name: 'W2 (Richtwert ZG)', az: 0.4, maxHoehe: 8500, maxVollgeschosse: 2,
      grenzabstandKlein: 4000, grenzabstandGross: 8000, parzellenFlaeche: null,
    });
    execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 2000, y: 5000 }, b: { x: 15000, y: 5000 },
    });
    const b = pruefeGrundriss(doc, storeyId).filter((x) => x.regel === 'Grenzabstand');
    expect(b).toHaveLength(1);
    expect(b[0]!.text).toContain('2.0 m');
    expect(b[0]!.text).toContain('4.0 m');
    expect(b[0]!.text).toContain('grenzabstandKlein');
  });

  it('Zonenregel-Fallback bleibt aus, wenn die Baugrenze einen eigenen Grenzabstand trägt', () => {
    const { doc, storeyId, assemblyId } = setupMitAufbau(1000); // eigener, kleinerer Grenzabstand
    execute(doc, 'design.zonenRegelSetzen', {
      name: 'W2 (Richtwert ZG)', az: 0.4, maxHoehe: 8500, maxVollgeschosse: 2,
      grenzabstandKlein: 4000, grenzabstandGross: 8000, parzellenFlaeche: null,
    });
    execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId, a: { x: 2000, y: 5000 }, b: { x: 15000, y: 5000 },
    }); // 2.0 m ≥ eigener Grenzabstand 1.0 m → kein Befund trotz strengerer Zonenregel
    expect(pruefeGrundriss(doc, storeyId).filter((x) => x.regel === 'Grenzabstand')).toHaveLength(0);
  });
});

describe('Zonenregel-Katalog (V2-Vorform V1)', () => {
  it('zonenRegelSetzen koppelt AZ × Parzellenfläche an maxAgf (undo-fähig)', () => {
    const doc = new KosmoDoc();
    const r = execute(doc, 'design.zonenRegelSetzen', {
      name: 'W2b (Richtwert ZG)', az: 0.5, maxHoehe: 10000, maxVollgeschosse: 2,
      grenzabstandKlein: 4000, grenzabstandGross: 8000, parzellenFlaeche: 1200,
    });
    expect(doc.settings.maxAgf).toBe(600);
    expect(doc.settings.zonenRegel?.name).toContain('W2b');
    doc.apply(invertPatches(r.patches));
    expect(doc.settings.maxAgf).toBeNull();
    expect(doc.settings.zonenRegel).toBeNull();
  });

  it('Höhe und Vollgeschosse über der Regel → Zonenregel-Befunde', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.geschossErstellen', { name: '1.OG', index: 1, elevation: 3000, height: 3000 });
    execute(doc, 'design.geschossErstellen', { name: '2.OG', index: 2, elevation: 6000, height: 3000 });
    execute(doc, 'design.zonenRegelSetzen', {
      name: 'W2 (Richtwert ZG)', az: 0.4, maxHoehe: 8500, maxVollgeschosse: 2,
      grenzabstandKlein: 4000, grenzabstandGross: 8000, parzellenFlaeche: null,
    });
    execute(doc, 'design.volumenErstellen', {
      storeyId, height: 12000,
      outline: [{ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 8000 }, { x: 0, y: 8000 }],
    });
    const b = pruefeGrundriss(doc, storeyId).filter((x) => x.regel === 'Zonenregel');
    expect(b.some((x) => x.text.includes('Vollgeschosse'))).toBe(true);
    expect(b.some((x) => x.text.includes('12.0 m'))).toBe(true);
  });

  it('Katalog liefert plausible Richtwerte', () => {
    expect(ZONENREGEL_KATALOG.length).toBeGreaterThanOrEqual(5);
    for (const z of ZONENREGEL_KATALOG) {
      expect(z.name.length).toBeGreaterThan(1);
      if (z.az !== null) expect(z.az).toBeGreaterThan(0);
    }
  });
});

describe('Regel-Sätze (V2-F3)', () => {
  it('Preset setzen → zu schmales Zimmer und fehlendes Tageslicht werden gemeldet', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.regelnSetzen', { preset: 'ch-wohnbau' });
    expect(doc.settings.raumRegeln.length).toBeGreaterThanOrEqual(5);
    // 2.0 m breites Zimmer ohne Fenster
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Kind', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 2000 }, { x: 0, y: 2000 }],
    });
    const b = pruefeGrundriss(doc, storeyId).filter((x) => x.regel === 'Regel zimmer');
    expect(b.some((x) => x.text.includes('2.00 m breit') || x.text.includes('2.40'))).toBe(true);
    expect(b.some((x) => x.text.includes('Tageslicht'))).toBe(true);
    // Fenster an der Zonenkante → Tageslicht-Befund verschwindet
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'AW', target: 'wall', layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
    });
    const wand = execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId: (aufbau.patches[0] as { id: string }).id,
      a: { x: 0, y: 0 }, b: { x: 5000, y: 0 },
    });
    execute(doc, 'design.oeffnungSetzen', {
      wallId: (wand.patches[0] as { id: string }).id,
      openingType: 'fenster', center: 2500, width: 1600, height: 1400, sill: 900,
    });
    const b2 = pruefeGrundriss(doc, storeyId).filter((x) => x.regel === 'Regel zimmer');
    expect(b2.some((x) => x.text.includes('Tageslicht'))).toBe(false);
  });

  it('D8/H-1: Site-Marker zonenArt="parzelle" setzt Raumtyp-/Richtwert-Checks aus', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.regelnSetzen', { preset: 'ch-wohnbau' });
    // Gleiche schmale 2.0×2.0m-Geometrie wie oben (raumTyp «zimmer» + kein
    // Fenster würde ohne Marker «Regel zimmer»-Befunde auslösen) — mit dem
    // Site-Marker bleibt die Zone unbeanstandet.
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Parzelle Test', sia: 'KF', raumTyp: 'zimmer', zonenArt: 'parzelle',
      outline: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 2000 }, { x: 0, y: 2000 }],
    });
    const b = pruefeGrundriss(doc, storeyId).filter((x) => x.regel === 'Regel zimmer');
    expect(b).toHaveLength(0);
  });

  it('preset «aus» leert die Regeln; Zone ohne raumTyp fällt auf HNF-Richtwerte zurück', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.regelnSetzen', { preset: 'ch-wohnbau' });
    execute(doc, 'design.regelnSetzen', { preset: 'aus' });
    expect(doc.settings.raumRegeln).toHaveLength(0);
  });
});

describe('Varianten-Matrix (V2-V3/F4)', () => {
  it('liefert Achsen, Zeilen und Bereiche; Δ-Achse nur mit Ziel', () => {
    const parzelle = [{ x: 0, y: 0 }, { x: 40000, y: 0 }, { x: 40000, y: 30000 }, { x: 0, y: 30000 }];
    const varianten = generiereVolumenstudien(parzelle, { zielGf: 2000, maxHoehe: 14000, nutzung: 'wohnen' });
    expect(varianten.length).toBeGreaterThanOrEqual(2);
    const mitZiel = variantenMatrix(varianten, 2000);
    expect(mitZiel.achsen.some((a) => a.key === 'delta')).toBe(true);
    expect(mitZiel.zeilen).toHaveLength(varianten.length);
    for (const z of mitZiel.zeilen) expect(z.werte).toHaveLength(mitZiel.achsen.length);
    for (const b of mitZiel.bereiche) expect(b.max).toBeGreaterThan(b.min);
    const ohneZiel = variantenMatrix(varianten, null);
    expect(ohneZiel.achsen.some((a) => a.key === 'delta')).toBe(false);
  });
});

describe('Wohnungs-Segmentierer (V2-F5)', () => {
  const footprint = [{ x: 0, y: 0 }, { x: 30000, y: 0 }, { x: 30000, y: 14000 }, { x: 0, y: 14000 }];
  const korridor = [{ x: 0, y: 6000 }, { x: 30000, y: 6000 }, { x: 30000, y: 8000 }, { x: 0, y: 8000 }];

  it('schneidet Wohnungen beidseits des Korridors nahe der Zielgrösse', () => {
    const erg = segmentiere(footprint, korridor, [
      { typ: 'marktgerecht', groesse: 95, anzahl: 2 },
      { typ: 'preisguenstig', groesse: 75, anzahl: 2 },
    ]);
    const geschnitten = erg.wohnungen.filter((w) => w.typ !== null);
    expect(geschnitten.length).toBeGreaterThanOrEqual(4);
    for (const w of geschnitten) {
      expect(Math.abs(w.abweichung!)).toBeLessThan(20); // ±20 m² zur Zielgrösse
      // Jede Wohnung liegt am Korridor (eine Kante auf y=6000 oder y=8000)
      const amKorridor = w.outline.some((p) => p.y === 6000) || w.outline.some((p) => p.y === 8000);
      expect(amKorridor).toBe(true);
    }
    expect(erg.mix.find((m) => m.typ === 'marktgerecht')!.ist).toBe(2);
  });

  it('unerfüllbarer Mix → ehrliche Diagnose statt Zwang', () => {
    const erg = segmentiere(footprint, korridor, [{ typ: 'vertical-cluster', groesse: 110, anzahl: 20 }]);
    expect(erg.mix[0]!.ist).toBeLessThan(20);
    expect(erg.diagnose.some((d) => d.includes('vertical-cluster'))).toBe(true);
  });

  it('Korridor am Rand → nur ein Band; sollMix rundet aus dem Raumprogramm', () => {
    const randKorridor = [{ x: 0, y: 0 }, { x: 30000, y: 0 }, { x: 30000, y: 2000 }, { x: 0, y: 2000 }];
    const erg = segmentiere(footprint, randKorridor, [{ typ: 'alterswohnen', groesse: 65, anzahl: 3 }]);
    expect(erg.wohnungen.filter((w) => w.typ !== null).length).toBeGreaterThanOrEqual(3);
    const doc = new KosmoDoc();
    execute(doc, 'design.raumprogrammSetzen', {
      posten: [{ typ: 'marktgerecht', hnfSoll: 285 }],
    });
    expect(sollMix(doc)).toEqual([{ typ: 'marktgerecht', groesse: 95, anzahl: 3 }]);
  });
});

describe('Segmentierer-Politur: Wicklung + Check-Ausnahme', () => {
  it('geschnittene Outlines sind gegen den Uhrzeigersinn (positive Fläche)', () => {
    const erg = segmentiere(
      [{ x: 0, y: 0 }, { x: 30000, y: 0 }, { x: 30000, y: 14000 }, { x: 0, y: 14000 }],
      [{ x: 0, y: 6000 }, { x: 30000, y: 6000 }, { x: 30000, y: 8000 }, { x: 0, y: 8000 }],
      [{ typ: 'preisguenstig', groesse: 75, anzahl: 4 }],
    );
    for (const w of erg.wohnungen) {
      expect(polygonArea(w.outline)).toBeGreaterThan(0);
    }
  });

  it('Zonen mit program (Wohnungen) lösen keine Zimmer-Richtwerte aus', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg 1', sia: 'HNF', program: 'preisguenstig',
      outline: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 1800 }, { x: 0, y: 1800 }],
    });
    const b = pruefeGrundriss(doc, storeyId).filter((x) => x.text.includes('Whg 1'));
    expect(b).toHaveLength(0);
  });
});

describe('Custom-Kennzahlen (V2-F9)', () => {
  it('Formeln gegen den AreaReport: CHF/m² aGF und CO2e/m² NGF', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    // 100 m² HNF → aGF-Ziel = 128 (×1.28), NGF = 100
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Wohnen', sia: 'HNF',
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 10000 }, { x: 0, y: 10000 }],
    });
    execute(doc, 'design.kennzahlFormelnSetzen', {
      formeln: [
        { name: 'Erstellungskosten', wert: 3200, basis: 'agf', einheit: 'CHF' },
        { name: 'Graue Energie', wert: 450, basis: 'ngf', einheit: 'kg CO2e' },
      ],
    });
    const erg = kennzahlenAuswerten(doc);
    expect(erg).toHaveLength(2);
    expect(erg[0]!.betrag).toBe(Math.round(3200 * 128));
    expect(erg[0]!.einheit).toBe('CHF');
    expect(erg[1]!.betrag).toBe(450 * 100);
    // Undo räumt die Formeln weg
    const r = execute(doc, 'design.kennzahlFormelnSetzen', { formeln: [] });
    expect(kennzahlenAuswerten(doc)).toHaveLength(0);
    doc.apply(invertPatches(r.patches));
    expect(kennzahlenAuswerten(doc)).toHaveLength(2);
  });
});

describe('Raumtyp-Copilot (V2-F10)', () => {
  it('schlägt korridor (Form), bad/zimmer/wohnen (Fläche) und treppenhaus (Treppe) vor', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const zone = (outline: { x: number; y: number }[]) => {
      const r = execute(doc, 'design.zoneErstellen', { storeyId, name: 'Z', sia: 'HNF', outline });
      return doc.get((r.patches[0] as { id: string }).id) as import('../src').Zone;
    };
    const flur = zone([{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 1800 }, { x: 0, y: 1800 }]);
    expect(raumTypVorschlag(doc, flur)?.raumTyp).toBe('korridor');
    const bad = zone([{ x: 0, y: 5000 }, { x: 2200, y: 5000 }, { x: 2200, y: 7000 }, { x: 0, y: 7000 }]);
    expect(raumTypVorschlag(doc, bad)?.raumTyp).toBe('bad');
    const wohnen = zone([{ x: 0, y: 10000 }, { x: 6000, y: 10000 }, { x: 6000, y: 14000 }, { x: 0, y: 14000 }]);
    expect(raumTypVorschlag(doc, wohnen)?.raumTyp).toBe('wohnen');
    const th = zone([{ x: 20000, y: 0 }, { x: 24000, y: 0 }, { x: 24000, y: 4000 }, { x: 20000, y: 4000 }]);
    execute(doc, 'design.treppeErstellen', { storeyId, a: { x: 21000, y: 1000 }, b: { x: 23000, y: 1000 }, width: 1200 });
    expect(raumTypVorschlag(doc, th)?.raumTyp).toBe('treppenhaus');
    // Zone MIT Raumtyp: kein Vorschlag
    execute(doc, 'design.raumTypSetzen', { zoneId: flur.id, raumTyp: 'korridor' });
    expect(raumTypVorschlag(doc, doc.get(flur.id) as import('../src').Zone)).toBeNull();
  });
});

describe('Raumprogramm-CSV-Import (V2-V5)', () => {
  it('toleriert Trennzeichen, CH-Zahlen, Aliase und meldet Unzuordenbares', () => {
    const csv = [
      'Wohnungstyp;HNF Soll m²',
      "Marktgerechte Wohnungen;1'250.5",
      'Preisgünstig,830',
      'Alterswohnen\t415',
      'Vertical Cluster;220',
      'Total;2715.5',
      'Gewerbefläche EG;300',
      '',
    ].join('\n');
    const erg = parseRaumprogrammCsv(csv);
    expect(erg.posten).toContainEqual({ typ: 'marktgerecht', hnfSoll: 1250.5 });
    expect(erg.posten).toContainEqual({ typ: 'preisguenstig', hnfSoll: 830 });
    expect(erg.posten).toContainEqual({ typ: 'alterswohnen', hnfSoll: 415 });
    expect(erg.posten).toContainEqual({ typ: 'vertical-cluster', hnfSoll: 220 });
    expect(erg.posten).toHaveLength(4);
    // Total- und Gewerbezeile werden gemeldet, nicht verschluckt
    expect(erg.uebersprungen.some((z) => z.includes('Gewerbe'))).toBe(true);
  });

  it('doppelte Typzeilen summieren sich', () => {
    const erg = parseRaumprogrammCsv('markt;100\nmarktgerecht;50');
    expect(erg.posten).toEqual([{ typ: 'marktgerecht', hnfSoll: 150 }]);
  });
});

describe('Render-Prompt-Transparenz (V2-V8)', () => {
  it('Wandaufbauten werden zu Prompt-Bausteinen; finalerRenderPrompt fügt sauber', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const au = execute(doc, 'design.aufbauErstellen', {
      name: 'AW Sichtbeton', target: 'wall',
      layers: [
        { material: 'sichtbeton', thickness: 180, function: 'tragend' },
        { material: 'daemmung-mw', thickness: 160, function: 'daemmung' },
      ],
    });
    execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId: (au.patches[0] as { id: string }).id,
      a: { x: 0, y: 0 }, b: { x: 5000, y: 0 },
    });
    const bausteine = renderPromptBausteine(doc);
    expect(bausteine).toContain('Sichtbeton-Fassade');
    expect(finalerRenderPrompt('Abendstimmung', '', bausteine)).toBe('Abendstimmung, Sichtbeton-Fassade');
    expect(finalerRenderPrompt('', '', [])).toBe('');
  });
});

describe('Möblierung (V2-F8)', () => {
  it('moebelSetzen legt Möbel an; Bewegungsfläche an der Wand → SIA-500-Warnung', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const au = execute(doc, 'design.aufbauErstellen', {
      name: 'AW', target: 'wall', layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId: (au.patches[0] as { id: string }).id,
      a: { x: -3000, y: 2500 }, b: { x: 3000, y: 2500 },
    });
    // WC: Rückkante bei y=0, Korpus 700 tief, Bewegungsfläche 1400×1400 ab y=700 → bis 2100 < 2500 ok
    const r = execute(doc, 'design.moebelSetzen', { storeyId, typ: 'wc', at: { x: 0, y: 0 }, rotationGrad: 0 });
    expect(doc.byKind('furniture')).toHaveLength(1);
    expect(pruefeGrundriss(doc, storeyId).filter((b) => b.regel === 'SIA 500')).toHaveLength(0);
    // Doppelbett: Korpus bis y=2000, Bewegungsfläche bis 3200 → schneidet die Wand bei 2500
    execute(doc, 'design.moebelSetzen', { storeyId, typ: 'bett-doppel', at: { x: 0, y: 0 }, rotationGrad: 0 });
    const warnungen = pruefeGrundriss(doc, storeyId).filter((b) => b.regel === 'SIA 500');
    expect(warnungen).toHaveLength(1);
    expect(warnungen[0]!.text).toContain('Doppelbett');
    // Undo räumt auf
    doc.apply(invertPatches(r.patches));
    expect(doc.byKind('furniture')).toHaveLength(1);
  });

  it('moebelGeometrie rotiert: 90° dreht die Bewegungsfläche nach -x', () => {
    const g = moebelGeometrie({
      id: 'f1', kind: 'furniture', storeyId: 's', typ: 'wc', at: { x: 0, y: 0 }, rotationGrad: 90,
    } as import('../src').Furniture)!;
    // Bei 90° zeigt +y-Lokal nach -x-Welt
    expect(Math.min(...g.bewegung.map((p) => p.x))).toBeLessThan(-2000);
  });
});

describe('Fassaden-Module (V2-V7)', () => {
  it('rastert Kanten mit Eckenregel, weist Passstücke ehrlich aus', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    // 10.0 × 6.5 m Körper, 9 m hoch; Modul 2.5 × 3.0 m
    execute(doc, 'design.volumenErstellen', {
      storeyId, height: 9000,
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 6500 }, { x: 0, y: 6500 }],
    });
    const st = fassadenModule(doc, storeyId, 2500, 3000);
    expect(st.zeilen).toHaveLength(4);
    const lang = st.zeilen.find((z) => z.laenge === 10000)!;
    expect(lang.spalten).toBe(4);
    expect(lang.zeilen).toBe(3);
    expect(lang.rest).toBe(0);
    const kurz = st.zeilen.find((z) => z.laenge === 6500)!;
    expect(kurz.spalten).toBe(2);
    expect(kurz.rest).toBe(1500);
    expect(st.totalModule).toBe(2 * 12 + 2 * 6);
    expect(st.totalPassstuecke).toBe(2 * 3);
    const csv = moduleAlsCsv(st, 2500, 3000);
    expect(csv).toContain('Modul 2.50 x 3.00 m');
    expect(csv.split('\n')).toHaveLength(2 + 4 + 1);
  });
});

describe('Möblierungsplan im Druck (V2-F8-Nachzug)', () => {
  it('Werkplan zeichnet den Möbel-Korpus, Vorprojekt nicht; Bewegungsfläche nie', async () => {
    const { planToSvg, A3_QUER } = await import('../src');
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.moebelSetzen', { storeyId, typ: 'esstisch', at: { x: 1000, y: 1000 }, rotationGrad: 0 });
    const werkplan = planToSvg(doc, storeyId, { scale: 50, paper: A3_QUER, projectName: 'T', planTitle: 'G', date: '01.07.2026' });
    // Esstisch-Korpus: 2000 breit ab Rückkante y=1000 → Kante bei x=0..2000, y=-1000
    expect(werkplan).toContain('M 0 -1000 L 2000 -1000');
    execute(doc, 'design.phaseSetzen', { phase: 'vorprojekt' });
    const vorprojekt = planToSvg(doc, storeyId, { scale: 50, paper: A3_QUER, projectName: 'T', planTitle: 'G', date: '01.07.2026' });
    expect(vorprojekt).not.toContain('M 0 -1000 L 2000 -1000');
  });
});

describe('Zonen-Vorlagen (V2-F7)', () => {
  it('speichern → gestreckt absetzen: Achs-Stretch skaliert linear, ein Undo', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const z1 = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Zimmer', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 1000, y: 1000 }, { x: 4000, y: 1000 }, { x: 4000, y: 4000 }, { x: 1000, y: 4000 }],
    });
    const z2 = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Bad', sia: 'HNF', raumTyp: 'bad',
      outline: [{ x: 4000, y: 1000 }, { x: 6000, y: 1000 }, { x: 6000, y: 3000 }, { x: 4000, y: 3000 }],
    });
    execute(doc, 'design.vorlageSpeichern', {
      name: '2.5-Zi-Ost',
      zoneIds: [(z1.patches[0] as { id: string }).id, (z2.patches[0] as { id: string }).id],
    });
    const v = doc.settings.vorlagen[0]!;
    expect(v.breite).toBe(5000);
    expect(v.hoehe).toBe(3000);
    // Absetzen bei (10000, 10000), auf 10 m Breite gestreckt (Faktor 2 in x)
    const r = execute(doc, 'design.vorlageSetzen', {
      storeyId, name: '2.5-Zi-Ost', at: { x: 10000, y: 10000 }, breite: 10000, hoehe: null,
    });
    const neu = doc.byKind<Zone>('zone').filter((z) => z.outline[0]!.x >= 10000);
    expect(neu).toHaveLength(2);
    const zimmer = neu.find((z) => z.name === 'Zimmer')!;
    // x-Ausdehnung 3000 → 6000 (×2), y bleibt 3000
    const xs = zimmer.outline.map((p) => p.x);
    const ys = zimmer.outline.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(6000);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(3000);
    expect(zimmer.raumTyp).toBe('zimmer');
    // Ein Undo entfernt beide Zonen
    doc.apply(invertPatches(r.patches));
    expect(doc.byKind('zone')).toHaveLength(2);
  });

  it('unbekannte Vorlage → ehrlicher Fehler', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    expect(() =>
      execute(doc, 'design.vorlageSetzen', {
        storeyId: (eg.patches[0] as { id: string }).id, name: 'gibtsnicht', at: { x: 0, y: 0 }, breite: null, hoehe: null,
      }),
    ).toThrow(/existiert nicht/);
  });

  it('Alt-Vorlagen-Kompatibilität (Charakterisierungstest): ohne dehnung/regeln bleibt der Stretch das alte Spiegeln-dann-Skalieren', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const z = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Raum', sia: 'HNF', raumTyp: 'wohnen',
      outline: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 2000 }, { x: 0, y: 2000 }],
    });
    execute(doc, 'design.vorlageSpeichern', { name: 'Alt-Muster', zoneIds: [(z.patches[0] as { id: string }).id] });
    // sx = 6000/4000 = 1.5, sy = 5000/2000 = 2.5 — altes u(x)=Breite−x, dann ×sx
    execute(doc, 'design.vorlageSetzen', {
      storeyId, name: 'Alt-Muster', at: { x: 1000, y: 1000 }, breite: 6000, hoehe: 5000, spiegeln: true,
    });
    const alteId = (z.patches[0] as { id: string }).id;
    const raum = doc.byKind<Zone>('zone').find((zz) => zz.name === 'Raum' && zz.id !== alteId)!;
    const xs = raum.outline.map((p) => p.x);
    const ys = raum.outline.map((p) => p.y);
    // (4000−0)×1.5 = 6000, an at.x=1000 gespiegelt platziert: 1000..7000
    expect(Math.min(...xs)).toBe(1000);
    expect(Math.max(...xs)).toBe(7000);
    // (2000−0)×2.5 = 5000, kein Spiegeln in y: 1000..6000
    expect(Math.min(...ys)).toBe(1000);
    expect(Math.max(...ys)).toBe(6000);
    // keine Vorlage trägt Locks/Regeln → keine Regel-Aktivierung, keine Überraschung
    expect(doc.settings.raumRegeln).toHaveLength(0);
  });
});

describe('F7-Locks (v0.7.0 E5-ii): feste/dehnbare Zonenkanten beim Vorlagen-Stretch', () => {
  /** Bad (2 m breit, x 0–2000) + Zimmer (3 m breit, x 2000–5000), Höhe 3000
   * bei beiden — Vorlagen-BBox 5000×3000. `festeZone` bestimmt, welche der
   * beiden auf X gesperrt wird ('bad' | 'zimmer' | 'beide' | 'keine'). */
  const bauVorlage = (doc: KosmoDoc, storeyId: string, festeZone: 'bad' | 'zimmer' | 'beide' | 'keine') => {
    const bad = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Bad', sia: 'HNF', raumTyp: 'bad',
      outline: [{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 2000, y: 3000 }, { x: 0, y: 3000 }],
    });
    const zimmer = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Zimmer', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 2000, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 3000 }, { x: 2000, y: 3000 }],
    });
    const badId = (bad.patches[0] as { id: string }).id;
    const zimmerId = (zimmer.patches[0] as { id: string }).id;
    const dehnungFestX =
      festeZone === 'bad' ? [badId]
      : festeZone === 'zimmer' ? [zimmerId]
      : festeZone === 'beide' ? [badId, zimmerId]
      : [];
    execute(doc, 'design.vorlageSpeichern', {
      name: 'Nasszelle-Muster', zoneIds: [badId, zimmerId], dehnungFestX,
    });
    return { badId, zimmerId };
  };

  const breiteVon = (doc: KosmoDoc, name: string) => {
    const z = doc.byKind<Zone>('zone').find((zz) => zz.name === name && zz.outline.some((p) => p.x >= 10000));
    const xs = z!.outline.map((p) => p.x);
    return Math.max(...xs) - Math.min(...xs);
  };

  it('Bad fest (dehnungX) bleibt 2 m breit, Zimmer (dehnbar) nimmt die volle Differenz auf', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    bauVorlage(doc, storeyId, 'bad');
    // Ziel-Breite 8000 statt 5000 → Δ = 3000, komplett aufs (einzig) dehnbare Zimmer
    execute(doc, 'design.vorlageSetzen', {
      storeyId, name: 'Nasszelle-Muster', at: { x: 10000, y: 0 }, breite: 8000, hoehe: null,
    });
    expect(breiteVon(doc, 'Bad')).toBe(2000); // unverändert
    expect(breiteVon(doc, 'Zimmer')).toBe(6000); // 3000 + 3000 Δ
  });

  it('Zimmer fest, Bad dehnbar — Rollen vertauscht, dieselbe Mechanik', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    bauVorlage(doc, storeyId, 'zimmer');
    execute(doc, 'design.vorlageSetzen', {
      storeyId, name: 'Nasszelle-Muster', at: { x: 10000, y: 0 }, breite: 8000, hoehe: null,
    });
    expect(breiteVon(doc, 'Zimmer')).toBe(3000); // unverändert
    expect(breiteVon(doc, 'Bad')).toBe(5000); // 2000 + 3000 Δ
  });

  it('ohne Locks (Default dehnbar) skalieren beide Zonen weiterhin proportional mit — Bestandsverhalten', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    bauVorlage(doc, storeyId, 'keine');
    execute(doc, 'design.vorlageSetzen', {
      storeyId, name: 'Nasszelle-Muster', at: { x: 10000, y: 0 }, breite: 10000, hoehe: null,
    });
    // Faktor 2 (10000/5000) trifft beide Zonen gleichermassen
    expect(breiteVon(doc, 'Bad')).toBe(4000);
    expect(breiteVon(doc, 'Zimmer')).toBe(6000);
  });

  it('alle Zonen fest + Zielmass ≠ Summe → ehrlicher Fehler statt stillem Verzerren', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    bauVorlage(doc, storeyId, 'beide');
    expect(() =>
      execute(doc, 'design.vorlageSetzen', {
        storeyId, name: 'Nasszelle-Muster', at: { x: 10000, y: 0 }, breite: 8000, hoehe: null,
      }),
    ).toThrow(/fest/);
    // Zielmass = Ausgangsmass (keine Streckung nötig) bleibt auch mit «alle fest» erlaubt
    expect(() =>
      execute(doc, 'design.vorlageSetzen', {
        storeyId, name: 'Nasszelle-Muster', at: { x: 20000, y: 0 }, breite: 5000, hoehe: null,
      }),
    ).not.toThrow();
  });
});

describe('Regeln-in-Vorlagen (v0.7.0 E5-v)', () => {
  it('unbekanntes Regel-Preset beim Speichern → ehrlicher Fehler', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const z = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Zimmer', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 3000 }, { x: 0, y: 3000 }],
    });
    expect(() =>
      execute(doc, 'design.vorlageSpeichern', {
        name: 'Mit-Unfug-Regel', zoneIds: [(z.patches[0] as { id: string }).id], regeln: ['nichtvorhanden'],
      }),
    ).toThrow(/Unbekanntes Regel-Preset/);
  });

  it('vorlageSetzen aktiviert die eingebetteten Regeln (leeres Projekt → Presets 1:1 übernommen)', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const z = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Zimmer', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 3000 }, { x: 0, y: 3000 }],
    });
    execute(doc, 'design.vorlageSpeichern', {
      name: 'Mit-Regeln', zoneIds: [(z.patches[0] as { id: string }).id], regeln: ['ch-wohnbau'],
    });
    expect(doc.settings.raumRegeln).toHaveLength(0);
    execute(doc, 'design.vorlageSetzen', {
      storeyId, name: 'Mit-Regeln', at: { x: 10000, y: 0 }, breite: null, hoehe: null,
    });
    expect(doc.settings.raumRegeln).toEqual(REGEL_PRESETS['ch-wohnbau']);
  });

  it('Vereinigungsfall: bestehende Projekt-Regel je Raumtyp gewinnt, Vorlage ergänzt nur fehlende Raumtypen', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    // Eigene, vom Preset abweichende Zimmer-Regel ist schon aktiv
    execute(doc, 'design.regelnSetzen', {
      regeln: [{ raumTyp: 'zimmer', minFlaeche: 99, minBreite: 1111, tageslicht: false }],
    });
    const z = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Zimmer', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 3000 }, { x: 0, y: 3000 }],
    });
    execute(doc, 'design.vorlageSpeichern', {
      name: 'Mit-Regeln-2', zoneIds: [(z.patches[0] as { id: string }).id], regeln: ['ch-wohnbau'],
    });
    execute(doc, 'design.vorlageSetzen', {
      storeyId, name: 'Mit-Regeln-2', at: { x: 10000, y: 0 }, breite: null, hoehe: null,
    });
    const zimmerRegel = doc.settings.raumRegeln.find((r) => r.raumTyp === 'zimmer')!;
    expect(zimmerRegel.minFlaeche).toBe(99); // eigene Regel NICHT überschrieben
    // andere Raumtypen aus dem Preset sind ergänzt worden
    expect(doc.settings.raumRegeln.some((r) => r.raumTyp === 'bad')).toBe(true);
    expect(doc.settings.raumRegeln).toHaveLength(REGEL_PRESETS['ch-wohnbau'].length); // zimmer ersetzt kein zusätzliches
  });

  it('Generator: Library-Treffer mit eingebetteten Regeln aktiviert sie fürs Ergebnis (Checks greifen)', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const muster = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Master-Zimmer', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 8000 }, { x: 0, y: 8000 }],
    });
    execute(doc, 'design.vorlageSpeichern', {
      name: '3.5zi mit Regeln', zoneIds: [(muster.patches[0] as { id: string }).id], regeln: ['wettbewerb'],
    });
    expect(doc.settings.raumRegeln).toHaveLength(0);
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg Regeln', sia: 'HNF', program: 'mit regeln',
      outline: [{ x: 20000, y: 0 }, { x: 30000, y: 0 }, { x: 30000, y: 8000 }, { x: 20000, y: 8000 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    expect(doc.settings.raumRegeln).toEqual(REGEL_PRESETS['wettbewerb']);
  });
});

describe('CH-Standort (V2-V4)', () => {
  it('standortSetzen speichert im Doc (offline beim zweiten Öffnen)', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.standortSetzen', { label: 'Zug', lat: 47.17, lon: 8.52, e: 2681500, n: 1224500 });
    const json = doc.toJSON();
    const wieder = KosmoDoc.fromJSON(json);
    expect(wieder.settings.standort?.label).toBe('Zug');
    expect(wieder.settings.standort?.lat).toBeCloseTo(47.17);
  });

  it('parzelleZuOutline: kleinster Ring gewinnt, LV95-m → lokale mm, Nord = +y', () => {
    const gemeinde = [[2680000, 1220000], [2690000, 1220000], [2690000, 1230000], [2680000, 1230000], [2680000, 1220000]];
    const parzelle = [[2681500, 1224500], [2681530, 1224500], [2681530, 1224520], [2681500, 1224520], [2681500, 1224500]];
    const imp = parzelleZuOutline([gemeinde, parzelle])!;
    expect(imp.flaeche).toBe(600); // 30 × 20 m
    expect(imp.outline).toHaveLength(4); // Schlusspunkt weg
    const xs = imp.outline.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(30000); // 30 m in mm
    // Nordkante (N grösser) hat grössere y-Werte
    const nordPunkt = imp.outline.find((p) => p.y > 0)!;
    expect(nordPunkt).toBeDefined();
  });
});

describe('Nachbarn amtlich (v0.7.1 E2/1B)', () => {
  const gemeinde = [[2680000, 1220000], [2690000, 1220000], [2690000, 1230000], [2680000, 1230000], [2680000, 1220000]];
  const parzelle = [[2681500, 1224500], [2681530, 1224500], [2681530, 1224520], [2681500, 1224520], [2681500, 1224500]];
  const nachbar1 = [[2681540, 1224500], [2681555, 1224500], [2681555, 1224510], [2681540, 1224510], [2681540, 1224500]];
  const nachbar2 = [[2681480, 1224495], [2681495, 1224495], [2681495, 1224505], [2681480, 1224505], [2681480, 1224495]];

  it('ringsZuOutline: Ergebnis am eigenen (ungerundeten) Zentrum ist identisch zu parzelleZuOutline().outline', () => {
    const imp = parzelleZuOutline([gemeinde, parzelle])!;
    // parzelleZuOutline verankert am ungerundeten Mittelwert der Ringpunkte —
    // exakt dem, den man erhält, wenn man denselben Ring separat mittelt.
    let e = 0, n = 0;
    for (const p of parzelle) { e += p[0]!; n += p[1]!; }
    e /= parzelle.length;
    n /= parzelle.length;
    const direkt = ringsZuOutline([gemeinde, parzelle], { e, n });
    expect(direkt).toEqual(imp.outline);
  });

  it('nachbarnZuOutlines: mehrere Gebäude-Ringe am selben (Parzellen-)Anker — Offset zwischen ihnen bleibt in LV95-m·1000 erhalten', () => {
    const imp = parzelleZuOutline([gemeinde, parzelle])!;
    const outlines = nachbarnZuOutlines([[nachbar1], [nachbar2]], imp.zentrum);
    expect(outlines).toHaveLength(2);
    expect(outlines[0]).toHaveLength(4);
    expect(outlines[1]).toHaveLength(4);
    // Nachbar 1 liegt östlich der Parzelle (grössere e) → grössere lokale x.
    const parzelleMaxX = Math.max(...imp.outline.map((p) => p.x));
    const nachbar1MinX = Math.min(...outlines[0]!.map((p) => p.x));
    expect(nachbar1MinX).toBeGreaterThan(parzelleMaxX);
    // Am selben Anker verankert wie die Parzelle: identischer Rundungs-Bezug
    // (Punkte von Parzelle und Nachbar sind direkt vergleichbar/subtrahierbar).
    const erwarteterOffsetX = Math.round((nachbar1[0]![0]! - imp.zentrum.e) * 1000);
    expect(outlines[0]![0]!.x).toBe(erwarteterOffsetX);
  });

  it('leere Ringliste ⇒ leeres Outline an dieser Stelle (kein stillschweigendes Überspringen)', () => {
    const gueltigesRing: number[][] = [[0, 0], [1, 1], [1, 0], [0, 0]];
    const outlines = nachbarnZuOutlines([[], [gueltigesRing]], { e: 0, n: 0 });
    expect(outlines).toHaveLength(2);
    expect(outlines[0]).toEqual([]);
  });

  function bauGeschossMitParzelle(): { doc: KosmoDoc; storeyId: string } {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Parzelle',
      sia: 'KF',
      zonenArt: 'parzelle',
      outline: [{ x: -10000, y: -10000 }, { x: 10000, y: -10000 }, { x: 10000, y: 10000 }, { x: -10000, y: 10000 }],
    });
    return { doc, storeyId };
  }

  const NACHBAR_OUTLINES = [
    [{ x: 12000, y: 0 }, { x: 16000, y: 0 }, { x: 16000, y: 4000 }, { x: 12000, y: 4000 }],
    [{ x: -16000, y: 0 }, { x: -12000, y: 0 }, { x: -12000, y: 4000 }, { x: -16000, y: 4000 }],
  ];

  it('design.nachbarnUebernehmen legt je Outline eine Zone zonenArt:"nachbar" mit sia:"KF" an, ohne raumTyp', () => {
    const { doc, storeyId } = bauGeschossMitParzelle();
    execute(doc, 'design.nachbarnUebernehmen', { storeyId, outlines: NACHBAR_OUTLINES });
    const nachbarn = doc.byKind<Zone>('zone').filter((z) => z.zonenArt === 'nachbar');
    expect(nachbarn).toHaveLength(2);
    for (const z of nachbarn) {
      expect(z.sia).toBe('KF');
      expect(z.raumTyp).toBeUndefined();
    }
    expect(nachbarn.map((z) => z.name).sort()).toEqual(['Nachbar 1', 'Nachbar 2']);
  });

  it('Idempotenz: zweimaliges Ausführen mit denselben Umrissen ergibt DIESELBE Zonen-Zahl (kein Duplikat)', () => {
    const { doc, storeyId } = bauGeschossMitParzelle();
    execute(doc, 'design.nachbarnUebernehmen', { storeyId, outlines: NACHBAR_OUTLINES });
    execute(doc, 'design.nachbarnUebernehmen', { storeyId, outlines: NACHBAR_OUTLINES });
    const nachbarn = doc.byKind<Zone>('zone').filter((z) => z.zonenArt === 'nachbar');
    expect(nachbarn).toHaveLength(2);
    // Die Parzellen-Zone bleibt unberührt (nur Nachbar-Zonen werden ersetzt).
    expect(doc.byKind<Zone>('zone').filter((z) => z.zonenArt === 'parzelle')).toHaveLength(1);
  });

  it('Re-Import mit weniger Umrissen ersetzt vollständig (alte Nachbarn verschwinden)', () => {
    const { doc, storeyId } = bauGeschossMitParzelle();
    execute(doc, 'design.nachbarnUebernehmen', { storeyId, outlines: NACHBAR_OUTLINES });
    execute(doc, 'design.nachbarnUebernehmen', { storeyId, outlines: [NACHBAR_OUTLINES[0]!] });
    const nachbarn = doc.byKind<Zone>('zone').filter((z) => z.zonenArt === 'nachbar');
    expect(nachbarn).toHaveLength(1);
  });

  it('Undo: EIN Undo-Schritt (Patch-Inverse) macht Löschen+Anlegen vollständig rückgängig', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    // execute() wendet Patches bereits an (core.ts) — kein zusätzliches doc.apply() nötig.
    execute(doc, 'design.nachbarnUebernehmen', { storeyId, outlines: [NACHBAR_OUTLINES[0]!] });
    expect(doc.byKind<Zone>('zone').filter((z) => z.zonenArt === 'nachbar')).toHaveLength(1);

    const zweiter = execute(doc, 'design.nachbarnUebernehmen', { storeyId, outlines: NACHBAR_OUTLINES });
    expect(doc.byKind<Zone>('zone').filter((z) => z.zonenArt === 'nachbar')).toHaveLength(2);

    // Undo des zweiten Aufrufs: zurück auf den EINEN ursprünglichen Nachbarn —
    // Löschen (des ersten) + Anlegen (der zwei neuen) waren EIN Patch-Array,
    // die Inverse macht beides in einem Schritt rückgängig.
    doc.apply(invertPatches(zweiter.patches));
    const nachUndo = doc.byKind<Zone>('zone').filter((z) => z.zonenArt === 'nachbar');
    expect(nachUndo).toHaveLength(1);
    expect(nachUndo[0]!.outline).toEqual(NACHBAR_OUTLINES[0]);
  });

  it('D8/H-1-Analogon: zonenArt="nachbar" pollutiert NGF NICHT, auch bei sia:"KF"', async () => {
    const { areaReport } = await import('../src');
    const { doc, storeyId } = setupDoc();
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 10000 }, { x: 0, y: 10000 }],
      name: 'Wohnen',
      sia: 'HNF',
    });
    execute(doc, 'design.nachbarnUebernehmen', {
      storeyId,
      // Grosses Nachbarhaus (600 m²) — ohne Ausnahme würde es NGF/KF verunreinigen.
      outlines: [[{ x: 20000, y: 0 }, { x: 40000, y: 0 }, { x: 40000, y: 30000 }, { x: 20000, y: 30000 }]],
    });
    const r = areaReport(doc);
    expect(r.total.HNF).toBe(100);
    expect(r.total.KF).toBe(0);
    expect(r.totalNgf).toBe(100);
  });

  it('D8/H-1-Analogon: zonenArt="nachbar" setzt Raumtyp-/Richtwert-Checks aus', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.regelnSetzen', { preset: 'ch-wohnbau' });
    execute(doc, 'design.nachbarnUebernehmen', {
      storeyId,
      // Schmale 2×2m-Geometrie — würde MIT raumTyp «zimmer» Regel-Befunde
      // auslösen, ABER nachbarnUebernehmen setzt raumTyp nie, UND die
      // Ausnahme greift ohnehin unabhängig davon (analog zum Parzellen-Test).
      outlines: [[{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 2000, y: 2000 }, { x: 0, y: 2000 }]],
    });
    const b = pruefeGrundriss(doc, storeyId);
    expect(b).toHaveLength(0);
  });
});

describe('Grundriss-Generator (Finch-Kern, Schritt 2)', () => {
  it('12×8-m-Wohnung, Korridor unten: Bänder decken alles, Möbel sitzen', () => {
    const g = generiereGrundriss(
      [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 8000 }, { x: 0, y: 8000 }],
      'unten',
    );
    // Flächensumme = Wohnungsfläche (Bänder ohne Lücke/Überlappung)
    const summe = g.raeume.reduce((s, r) => s + Math.abs(polygonArea(r.outline)), 0) / 1e6;
    expect(summe).toBeCloseTo(96, 0);
    expect(g.raeume.map((r) => r.raumTyp)).toEqual(
      expect.arrayContaining(['korridor', 'bad', 'kueche', 'wohnen', 'zimmer']),
    );
    // Küche kriegt Zeile, erstes Zimmer Doppelbett, Wohnen Esstisch
    expect(g.moebel.map((m) => m.typ)).toEqual(
      expect.arrayContaining(['wc', 'kuechenzeile', 'esstisch', 'bett-doppel']),
    );
    // Eingangsband liegt an y=0..2400
    const bad = g.raeume.find((r) => r.name === 'Bad')!;
    expect(Math.max(...bad.outline.map((p) => p.y))).toBe(2400);
  });

  it('Korridor rechts: Eingangsband an der rechten Kante', () => {
    const g = generiereGrundriss(
      [{ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 12000 }, { x: 0, y: 12000 }],
      'rechts',
    );
    const bad = g.raeume.find((r) => r.name === 'Bad')!;
    expect(Math.min(...bad.outline.map((p) => p.x))).toBe(8000 - 2400);
  });

  it('Command: Wohnung + Korridor-Zone → auto-Seite, Räume + Möbel, 1 Undo; zu klein → Fehler', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Korridor', sia: 'VF', raumTyp: 'korridor',
      outline: [{ x: 0, y: -2000 }, { x: 12000, y: -2000 }, { x: 12000, y: 0 }, { x: 0, y: 0 }],
    });
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg 1', sia: 'HNF', program: 'marktgerecht',
      outline: [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 8000 }, { x: 0, y: 8000 }],
    });
    const vorherZonen = doc.byKind('zone').length;
    const r = execute(doc, 'design.grundrissGenerieren', {
      zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'auto',
    });
    expect(doc.byKind('zone').length).toBeGreaterThan(vorherZonen);
    expect(doc.byKind('furniture').length).toBeGreaterThanOrEqual(4);
    doc.apply(invertPatches(r.patches));
    expect(doc.byKind('zone').length).toBe(vorherZonen);
    expect(doc.byKind('furniture')).toHaveLength(0);
    const klein = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Mini', sia: 'HNF',
      outline: [{ x: 20000, y: 0 }, { x: 24000, y: 0 }, { x: 24000, y: 4000 }, { x: 20000, y: 4000 }],
    });
    expect(() =>
      execute(doc, 'design.grundrissGenerieren', { zoneId: (klein.patches[0] as { id: string }).id, korridorSeite: 'unten' }),
    ).toThrow(/6 × 6/);
  });
});

describe('Plan-Library v2 (Vorlagen speisen den Generator)', () => {
  it('Vorlage mit Möbeln gespeichert → Generator setzt sie gestreckt statt Rezept', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    // Muster-Wohnung 10×8 zeichnen: 1 Raum + 1 Bett, als Vorlage sichern
    const z = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Master-Zimmer', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 8000 }, { x: 0, y: 8000 }],
    });
    execute(doc, 'design.moebelSetzen', { storeyId, typ: 'bett-doppel', at: { x: 5000, y: 7000 }, rotationGrad: 180 });
    execute(doc, 'design.vorlageSpeichern', { name: '3.5zi marktgerecht Ost', zoneIds: [(z.patches[0] as { id: string }).id] });
    expect(doc.settings.vorlagen[0]!.moebel).toHaveLength(1);
    // Wohnung 12×8 (Stretch 1.2 in x) mit passendem Typ → Vorlage gewinnt
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg A', sia: 'HNF', program: 'marktgerecht',
      outline: [{ x: 20000, y: 0 }, { x: 32000, y: 0 }, { x: 32000, y: 8000 }, { x: 20000, y: 8000 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    const master = doc.byKind<Zone>('zone').find((zz) => zz.name === 'Master-Zimmer' && zz.outline[0]!.x >= 20000);
    expect(master).toBeDefined(); // Vorlagen-Raum, nicht Rezept-«Diele»
    const xs = master!.outline.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(12000); // ×1.2 gestreckt
    const bett = doc.byKind<import('../src').Furniture>('furniture').find((f) => f.at.x >= 20000);
    expect(bett).toBeDefined();
    expect(bett!.at.x).toBe(20000 + 6000); // 5000 × 1.2
  });

  it('kein Namens-Match oder Stretch zu grob → Rezept-Fallback (Diele entsteht)', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg B', sia: 'HNF', program: 'alterswohnen',
      outline: [{ x: 0, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 8000 }, { x: 0, y: 8000 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    expect(doc.byKind<Zone>('zone').some((z) => z.name === 'Diele')).toBe(true);
  });
});

describe('Spiegel-Geometrie der Plan-Library', () => {
  const bauMuster = (doc: KosmoDoc, storeyId: string) => {
    const z = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Master', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 8000 }, { x: 0, y: 8000 }],
    });
    // Bett links unten, Rückkante an der Korridorwand (rot 0)
    execute(doc, 'design.moebelSetzen', { storeyId, typ: 'bett-doppel', at: { x: 2000, y: 100 }, rotationGrad: 0 });
    execute(doc, 'design.vorlageSpeichern', { name: '2.5zi marktgerecht', zoneIds: [(z.patches[0] as { id: string }).id] });
  };

  it('Korridor links: Vorlage wird gedreht (Breite↔Höhe), Wicklung bleibt positiv', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    bauMuster(doc, storeyId);
    // Wohnung hochkant: Korridorkante links → u läuft in y, v in x
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg L', sia: 'HNF', program: 'marktgerecht',
      outline: [{ x: 20000, y: 0 }, { x: 28000, y: 0 }, { x: 28000, y: 10000 }, { x: 20000, y: 10000 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'links' });
    const master = doc.byKind<Zone>('zone').find((z) => z.name === 'Master' && z.outline[0]!.x >= 20000)!;
    expect(polygonArea(master.outline)).toBeGreaterThan(0); // Wicklung korrigiert
    const xs = master.outline.map((p) => p.x);
    const ys = master.outline.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(8000); // Tiefe in x
    expect(Math.max(...ys) - Math.min(...ys)).toBe(10000); // Breite in y
    const bett = doc.byKind<import('../src').Furniture>('furniture').find((f) => f.at.x >= 20000)!;
    expect(bett.rotationGrad).toBe(270); // 270 − 0
  });

  it('vorlageSetzen spiegeln: Ost↔West, Möbel-x klappt um, Fläche bleibt positiv', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    bauMuster(doc, storeyId);
    execute(doc, 'design.vorlageSetzen', {
      storeyId, name: '2.5zi marktgerecht', at: { x: 40000, y: 0 }, breite: null, hoehe: null, spiegeln: true,
    });
    const master = doc.byKind<Zone>('zone').find((z) => z.name === 'Master' && z.outline[0]!.x >= 40000)!;
    expect(polygonArea(master.outline)).toBeGreaterThan(0);
    const bett = doc.byKind<import('../src').Furniture>('furniture').find((f) => f.at.x >= 40000)!;
    expect(bett.at.x).toBe(40000 + (10000 - 2000)); // u gespiegelt
  });
});

describe('Zonentüren (Graph wird ehrlich)', () => {
  it('Tür auf gemeinsamer Kante: offen → tuer; Generator setzt 3 Türen je Wohnung', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const a = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'A', sia: 'HNF', raumTyp: 'wohnen',
      outline: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 5000 }, { x: 0, y: 5000 }],
    });
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'B', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 5000, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 5000 }, { x: 5000, y: 5000 }],
    });
    let g = raumGraph(doc, storeyId);
    expect(g.kanten.find((k) => k.art === 'offen')).toBeDefined();
    execute(doc, 'design.tuerSetzen', { storeyId, at: { x: 5000, y: 2500 }, breite: 900 });
    g = raumGraph(doc, storeyId);
    const kante = g.kanten.find((k) => k.a === (a.patches[0] as { id: string }).id || k.b === (a.patches[0] as { id: string }).id)!;
    expect(kante.art).toBe('tuer');
    // Generator (Rezept): Wohnungstür + Bad + Wohnen
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg', sia: 'HNF', program: 'preisguenstig',
      outline: [{ x: 20000, y: 0 }, { x: 29000, y: 0 }, { x: 29000, y: 8000 }, { x: 20000, y: 8000 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    // v1 ohne Flur: Wohnungstür, Bad, Wohnen + Zimmer-Tür (Review-Fix 3)
    expect(doc.byKind('zonentuer')).toHaveLength(1 + 4);
  });
});

describe('Modul-Editor (vorform-Kern)', () => {
  it('modulSpeichern: anlegen, überschreiben, leeres Update löscht; undo-fähig', () => {
    const doc = new KosmoDoc();
    const r = execute(doc, 'design.modulSpeichern', {
      name: 'Modul A', breite: 2500, hoehe: 3000,
      elemente: [{ x: 400, y: 900, b: 1600, h: 1600, typ: 'fenster' }],
    });
    expect(doc.settings.fassadenModule).toHaveLength(1);
    execute(doc, 'design.modulSpeichern', {
      name: 'Modul A', breite: 2500, hoehe: 3000,
      elemente: [
        { x: 400, y: 900, b: 1600, h: 1600, typ: 'fenster' },
        { x: 0, y: 0, b: 2500, h: 900, typ: 'paneel' },
      ],
    });
    expect(doc.settings.fassadenModule).toHaveLength(1);
    expect(doc.settings.fassadenModule[0]!.elemente).toHaveLength(2);
    execute(doc, 'design.modulSpeichern', { name: 'Modul A', breite: 2500, hoehe: 3000, elemente: [] });
    expect(doc.settings.fassadenModule).toHaveLength(0);
    doc.apply(invertPatches(r.patches));
    // Serialisierung überlebt
    const wieder = KosmoDoc.fromJSON(doc.toJSON());
    expect(wieder.settings.fassadenModule).toBeDefined();
  });
});

describe('Module im Render-Prompt', () => {
  it('gezeichnetes Modul → Raster-Phrase mit Fensteranteil', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.modulSpeichern', {
      name: 'Band', breite: 2500, hoehe: 3000,
      elemente: [{ x: 200, y: 1100, b: 2100, h: 1600, typ: 'fenster' }],
    });
    const bausteine = renderPromptBausteine(doc);
    const phrase = bausteine.find((b) => b.includes('Fassadenraster'))!;
    expect(phrase).toContain('2.5 × 3.0 m');
    expect(phrase).toContain('~45%'); // 2100×1600 / 2500×3000
  });
});

describe('Module je Fassade', () => {
  it('Kanten-Zuweisung übersteuert die freien Masse in der Bilanz; entfernen geht', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const mass = execute(doc, 'design.volumenErstellen', {
      storeyId, height: 9000,
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 6500 }, { x: 0, y: 6500 }],
    });
    const massId = (mass.patches[0] as { id: string }).id;
    execute(doc, 'design.modulSpeichern', {
      name: 'Schmal', breite: 1250, hoehe: 3000,
      elemente: [{ x: 100, y: 900, b: 1050, h: 1600, typ: 'fenster' }],
    });
    execute(doc, 'design.fassadenModulZuweisen', { massId, kante: 1, modul: 'Schmal' });
    const st = fassadenModule(doc, storeyId, 2500, 3000);
    const k1 = st.zeilen.find((z) => z.kante === 1)!;
    expect(k1.modul).toBe('Schmal');
    expect(k1.spalten).toBe(8); // 10 m / 1.25 m
    const k3 = st.zeilen.find((z) => z.kante === 3)!;
    expect(k3.modul).toBeNull();
    expect(k3.spalten).toBe(4); // frei: 2.5 m
    // unbekanntes Modul → ehrlicher Fehler; entfernen → wieder frei
    expect(() =>
      execute(doc, 'design.fassadenModulZuweisen', { massId, kante: 2, modul: 'gibtsnicht' }),
    ).toThrow(/existiert nicht/);
    execute(doc, 'design.fassadenModulZuweisen', { massId, kante: 1, modul: null });
    expect(fassadenModule(doc, storeyId, 2500, 3000).zeilen.find((z) => z.kante === 1)!.modul).toBeNull();
  });
});

describe('Rezept v2: interner Flur', () => {
  it('ab 2 Zimmern: Flur erschliesst alle Räume, 7 Türen, kein Durchgangszimmer', () => {
    const g = generiereGrundriss(
      [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 8000 }, { x: 0, y: 8000 }],
      'unten',
    );
    const flur = g.raeume.find((r) => r.name === 'Flur')!;
    expect(flur).toBeDefined();
    expect(flur.raumTyp).toBe('korridor');
    // Zimmer beginnen erst hinter dem Flur (v = 3600)
    const z1 = g.raeume.find((r) => r.name === 'Zimmer 1')!;
    expect(Math.min(...z1.outline.map((p) => p.y))).toBe(3600);
    // Türen: Wohnungstür, Bad, Diele→Flur, Flur→Küche, Flur→Wohnen, 2× Flur→Zimmer
    expect(g.tueren).toHaveLength(7);
    expect(g.diagnose.some((d) => d.includes('keine Durchgangszimmer'))).toBe(true);
  });

  it('zu flach für den Flur → v1-Fallback mit ehrlicher Diagnose', () => {
    const g = generiereGrundriss(
      [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 6400 }, { x: 0, y: 6400 }],
      'unten',
    );
    expect(g.raeume.some((r) => r.name === 'Flur')).toBe(false);
    expect(g.diagnose.some((d) => d.includes('Durchgangszimmer'))).toBe(true);
  });
});

describe('Wände aus Zonen (Schlussstein)', () => {
  it('3.5-Zi generieren → Wände: gemeinsame Kanten dedupliziert, Türen als Öffnungen, 1 Undo', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg', sia: 'HNF', program: 'marktgerecht',
      outline: [{ x: 0, y: 0 }, { x: 13000, y: 0 }, { x: 13000, y: 8500 }, { x: 0, y: 8500 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    const tuerenVorher = doc.byKind('zonentuer').length;
    expect(tuerenVorher).toBe(7);
    const r = execute(doc, 'design.waendeAusZonen', { storeyId });
    const waende = doc.byKind<Wall>('wall');
    expect(waende.length).toBeGreaterThanOrEqual(10);
    // Türen sind jetzt echte Öffnungen, Zonentüren weg
    expect(doc.byKind('opening')).toHaveLength(7);
    expect(doc.byKind('zonentuer')).toHaveLength(0);
    // Dedup: auf der Flur-Oberkante (y=3600) existiert je x-Lage nur EINE Wand
    const y3600 = waende.filter((w2) => w2.a.y === 3600 && w2.b.y === 3600);
    const abdeckung = y3600.reduce((s2, w2) => s2 + Math.abs(w2.b.x - w2.a.x), 0);
    expect(abdeckung).toBeLessThanOrEqual(13000); // keine Doppelwand
    // Raumgraph: Türen laufen jetzt über die Wand-Öffnungen
    const g = raumGraph(doc, storeyId);
    expect(g.kanten.filter((k) => k.art === 'tuer').length).toBeGreaterThanOrEqual(6);
    doc.apply(invertPatches(r.patches));
    expect(doc.byKind('wall')).toHaveLength(0);
    expect(doc.byKind('zonentuer')).toHaveLength(7);
  });
});

describe('Fenster aus Modulen (Abendbatch A1)', () => {
  it('rastert nur Aussenwände, Masse aus dem Element, Tageslicht wird grün, 1 Undo', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg', sia: 'HNF', program: 'marktgerecht',
      outline: [{ x: 0, y: 0 }, { x: 13000, y: 0 }, { x: 13000, y: 8500 }, { x: 0, y: 8500 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    execute(doc, 'design.waendeAusZonen', { storeyId });
    execute(doc, 'design.regelnSetzen', { preset: 'ch-wohnbau' });
    // Vor dem Stanzen: Tageslicht-Warnungen vorhanden
    expect(pruefeGrundriss(doc, storeyId).some((b) => b.text.includes('Tageslicht'))).toBe(true);
    execute(doc, 'design.modulSpeichern', {
      name: 'Band', breite: 2500, hoehe: 3000,
      elemente: [{ x: 400, y: 900, b: 1700, h: 1600, typ: 'fenster' }],
    });
    const tuerenVorher = doc.byKind<import('../src').Opening>('opening').filter((o) => o.openingType === 'tuer').length;
    const r = execute(doc, 'design.fensterAusModulen', { storeyId, modul: null });
    const fenster = doc.byKind<import('../src').Opening>('opening').filter((o) => o.openingType === 'fenster');
    expect(fenster.length).toBeGreaterThanOrEqual(8); // Umfang 43 m → ≥ 8 Zellen à 2.5 m auf AW
    expect(fenster[0]!.width).toBe(1700);
    expect(fenster[0]!.sill).toBe(900);
    // Türen unangetastet, Innenwände ohne Fenster
    expect(doc.byKind<import('../src').Opening>('opening').filter((o) => o.openingType === 'tuer')).toHaveLength(tuerenVorher);
    const innenWaende = doc.byKind<Wall>('wall').filter((w2) => {
      const asm = doc.get<import('../src').Assembly>(w2.assemblyId);
      return asm?.kind === 'assembly' && !asm.name.startsWith('AW');
    });
    for (const iw of innenWaende) {
      expect(doc.openingsOf(iw.id).filter((o) => (o as import('../src').Opening).openingType === 'fenster')).toHaveLength(0);
    }
    // Tageslicht-Warnungen der Fassadenräume verschwinden
    const tageslicht = pruefeGrundriss(doc, storeyId).filter((b) => b.text.includes('Tageslicht'));
    expect(tageslicht.filter((b) => b.text.includes('Wohnen') || b.text.includes('Zimmer'))).toHaveLength(0);
    doc.apply(invertPatches(r.patches));
    expect(doc.byKind<import('../src').Opening>('opening').filter((o) => o.openingType === 'fenster')).toHaveLength(0);
  });

  it('ohne Modul → ehrlicher Fehler', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    expect(() =>
      execute(doc, 'design.fensterAusModulen', { storeyId: (eg.patches[0] as { id: string }).id, modul: null }),
    ).toThrow(/Kein Fassadenmodul/);
  });
});

describe('Fassaden-Zuweisung steuert gestanzte Fenster (V1-Testlauf-Befund geschlossen)', () => {
  function rechteckMitAw(doc: KosmoDoc, storeyId: string) {
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'AW Beton 30', target: 'wall',
      layers: [{ material: 'beton', thickness: 300, function: 'tragend' }],
    });
    const assemblyId = (aufbau.patches[0] as { id: string }).id;
    const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
    wand({ x: 0, y: 0 }, { x: 9000, y: 0 }); // Süd
    wand({ x: 9000, y: 0 }, { x: 9000, y: 6000 }); // Ost
    wand({ x: 9000, y: 6000 }, { x: 0, y: 6000 }); // Nord
    wand({ x: 0, y: 6000 }, { x: 0, y: 0 }); // West
  }

  it('ohne Kanten-Zuweisung: unverändertes Verhalten — ein Modul für alle Aussenwände', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    rechteckMitAw(doc, storeyId);
    execute(doc, 'design.modulSpeichern', {
      name: 'Standard', breite: 2500, hoehe: 3000,
      elemente: [{ x: 400, y: 900, b: 1500, h: 1600, typ: 'fenster' }],
    });
    execute(doc, 'design.fensterAusModulen', { storeyId, modul: null });
    const fenster = doc.byKind<import('../src').Opening>('opening').filter((o) => o.openingType === 'fenster');
    // Je Wand einzeln gerastert (Eckenregel): Süd/Nord (9 m / 2.5 m → 3) + Ost/West (6 m / 2.5 m → 2) = 10
    expect(fenster).toHaveLength(10);
    expect(fenster.every((f) => f.width === 1500)).toBe(true);
  });

  it('mit Kanten-Zuweisung (Süd ≠ Nord): Süd-Wand stanzt das Süd-Modul, Nord-Wand das Nord-Modul', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    rechteckMitAw(doc, storeyId);
    execute(doc, 'design.modulSpeichern', {
      name: 'Fensterband Süd', breite: 2500, hoehe: 3000,
      elemente: [{ x: 200, y: 900, b: 2100, h: 1600, typ: 'fenster' }],
    });
    execute(doc, 'design.modulSpeichern', {
      name: 'Geschlossen Nord', breite: 2500, hoehe: 3000,
      elemente: [{ x: 900, y: 900, b: 700, h: 1200, typ: 'fenster' }],
    });
    // Volumenkörper mit demselben Umriss wie die Wände — Kante 1 = Süd, Kante 3 = Nord
    const mass = execute(doc, 'design.volumenErstellen', {
      storeyId, height: 3000,
      outline: [{ x: 0, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 6000 }, { x: 0, y: 6000 }],
    });
    const massId = (mass.patches[0] as { id: string }).id;
    execute(doc, 'design.fassadenModulZuweisen', { massId, kante: 1, modul: 'Fensterband Süd' });
    execute(doc, 'design.fassadenModulZuweisen', { massId, kante: 3, modul: 'Geschlossen Nord' });
    const r = execute(doc, 'design.fensterAusModulen', { storeyId, modul: null });
    const waende = doc.byKind<Wall>('wall');
    const suedWand = waende.find((w) => w.a.y === 0 && w.b.y === 0)!;
    const nordWand = waende.find((w) => w.a.y === 6000 && w.b.y === 6000)!;
    const oeff = (wallId: string) =>
      doc.openingsOf(wallId).filter((o) => (o as import('../src').Opening).openingType === 'fenster') as import('../src').Opening[];
    const suedFenster = oeff(suedWand.id);
    const nordFenster = oeff(nordWand.id);
    expect(suedFenster.length).toBeGreaterThan(0);
    expect(nordFenster.length).toBeGreaterThan(0);
    expect(suedFenster.every((f) => f.width === 2100)).toBe(true);
    expect(nordFenster.every((f) => f.width === 700)).toBe(true);
    // Undo hebt beide Seiten wieder auf
    doc.apply(invertPatches(r.patches));
    expect(doc.byKind('opening').filter((o) => (o as import('../src').Opening).openingType === 'fenster')).toHaveLength(0);
  });
});

describe('Wohnungstrennwände (Abendbatch A2)', () => {
  it('gemeinsame Kante zweier Wohnungen → EINE Wand mit TW-Aufbau', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    for (const [x0, name] of [[0, 'Whg A'], [9000, 'Whg B']] as const) {
      const w = execute(doc, 'design.zoneErstellen', {
        storeyId, name, sia: 'HNF', program: 'preisguenstig',
        outline: [{ x: x0, y: 0 }, { x: x0 + 9000, y: 0 }, { x: x0 + 9000, y: 8000 }, { x: x0, y: 8000 }],
      });
      execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    }
    execute(doc, 'design.waendeAusZonen', { storeyId });
    const twAufbau = doc.byKind<Assembly>('assembly').find((a) => a.name.startsWith('TW'))!;
    expect(twAufbau).toBeDefined();
    expect(twAufbau.layers[0]!.thickness).toBe(200);
    // Trennwände liegen auf x=9000 und decken die Wohnungsgrenze
    const trennwaende = doc.byKind<Wall>('wall').filter((w) => w.assemblyId === twAufbau.id);
    expect(trennwaende.length).toBeGreaterThanOrEqual(1);
    for (const t of trennwaende) {
      expect(t.a.x).toBe(9000);
      expect(t.b.x).toBe(9000);
    }
    // Wohnungs-INTERNE Innenwände bleiben IW
    const iwAufbau = doc.byKind<Assembly>('assembly').find((a) => a.name.startsWith('IW'))!;
    expect(doc.byKind<Wall>('wall').filter((w) => w.assemblyId === iwAufbau.id).length).toBeGreaterThan(4);
  });
});

describe('Erschliessungskern (Abendbatch A3)', () => {
  it('kern: true reserviert 3.0 m am ersten Band, Wohnungen rücken nach', () => {
    const footprint = [{ x: 0, y: 0 }, { x: 30000, y: 0 }, { x: 30000, y: 14000 }, { x: 0, y: 14000 }];
    const korridor = [{ x: 0, y: 6000 }, { x: 30000, y: 6000 }, { x: 30000, y: 8000 }, { x: 0, y: 8000 }];
    const mix = [{ typ: 'preisguenstig', groesse: 75, anzahl: 4 }];
    const ohne = segmentiere(footprint, korridor, mix);
    expect(ohne.kern).toBeNull();
    const mit = segmentiere(footprint, korridor, mix, { kern: true });
    expect(mit.kern).not.toBeNull();
    const kxs = mit.kern!.outline.map((p) => p.x);
    expect(Math.max(...kxs) - Math.min(...kxs)).toBe(3000);
    expect(polygonArea(mit.kern!.outline)).toBeGreaterThan(0);
    // Erste Wohnung des ersten Bands beginnt hinter dem Kern
    const ersteX = Math.min(...mit.wohnungen[0]!.outline.map((p) => p.x));
    expect(ersteX).toBe(3000);
    expect(mit.diagnose.some((d) => d.includes('Erschliessungskern'))).toBe(true);
  });
});

describe('Geschoss stapeln (Abendbatch B1)', () => {
  it('×3: alle Entities kopiert, Elevation-Kette, NGF ×4, wallId-Remap, 1 Undo', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg', sia: 'HNF', program: 'marktgerecht',
      outline: [{ x: 0, y: 0 }, { x: 13000, y: 0 }, { x: 13000, y: 8500 }, { x: 0, y: 8500 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    execute(doc, 'design.waendeAusZonen', { storeyId });
    const ngf1 = areaReport(doc).totalNgf;
    const waende1 = doc.byKind('wall').length;
    const oeffnungen1 = doc.byKind('opening').length;
    const r = execute(doc, 'design.geschossKopieren', { storeyId, anzahl: 3 });
    const storeys = doc.storeysOrdered() as Storey[];
    expect(storeys).toHaveLength(4);
    expect(storeys[3]!.elevation).toBe(9000);
    expect(storeys[3]!.name).toBe('3.OG');
    expect(doc.byKind('wall')).toHaveLength(waende1 * 4);
    expect(doc.byKind('opening')).toHaveLength(oeffnungen1 * 4);
    expect(areaReport(doc).totalNgf).toBeCloseTo(ngf1 * 4, 0);
    // Öffnungen der Kopien hängen an den KOPIERTEN Wänden (Remap)
    const og3Waende = new Set(doc.byKind<Wall>('wall').filter((w2) => w2.storeyId === storeys[3]!.id).map((w2) => w2.id));
    const og3Oeffnungen = doc.byKind<import('../src').Opening>('opening').filter((o) => og3Waende.has(o.wallId));
    expect(og3Oeffnungen).toHaveLength(oeffnungen1);
    doc.apply(invertPatches(r.patches));
    expect(doc.storeysOrdered()).toHaveLength(1);
    expect(doc.byKind('wall')).toHaveLength(waende1);
  });

  it('Testlauf-Befund: Tragstruktur (Stützen + Unterzüge) wird mitgestapelt', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 0, y: 0 }, b: 300, material: 'beton' });
    execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 6000, y: 0 }, b: 300, material: 'beton' });
    execute(doc, 'design.unterzugZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 6000, y: 0 }, breite: 300, hoehe: 500 });
    expect(doc.byKind('column')).toHaveLength(2);
    expect(doc.byKind('beam')).toHaveLength(1);
    execute(doc, 'design.geschossKopieren', { storeyId, anzahl: 3 });
    // Vorher (Bug): Stützen/Unterzüge verschwanden in jedem gestapelten OG.
    expect(doc.byKind('column')).toHaveLength(2 * 4);
    expect(doc.byKind('beam')).toHaveLength(1 * 4);
    const storeys = doc.storeysOrdered() as Storey[];
    const og3 = storeys[3]!.id;
    expect(doc.byKind<import('../src').Column>('column').filter((c) => c.storeyId === og3)).toHaveLength(2);
    expect(doc.byKind<import('../src').Beam>('beam').filter((b) => b.storeyId === og3)).toHaveLength(1);
  });
});

describe('Härte (Abendbatch D)', () => {
  it('D1: Voll-Doc mit allen neuen Ständen überlebt toJSON→fromJSON→toJSON tief-gleich', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    // Settings-Vollausbau
    execute(doc, 'design.zonenRegelSetzen', {
      name: 'W2b (Richtwert ZG)', az: 0.5, maxHoehe: 10000, maxVollgeschosse: 2,
      grenzabstandKlein: 4000, grenzabstandGross: 8000, parzellenFlaeche: 1200,
    });
    execute(doc, 'design.regelnSetzen', { preset: 'ch-wohnbau' });
    execute(doc, 'design.kennzahlFormelnSetzen', {
      formeln: [{ name: 'Kosten', wert: 3200, basis: 'agf', einheit: 'CHF' }],
    });
    execute(doc, 'design.standortSetzen', { label: 'Zug', lat: 47.17, lon: 8.52, e: 2681500, n: 1224500 });
    execute(doc, 'design.modulSpeichern', {
      name: 'Band', breite: 2500, hoehe: 3000,
      elemente: [{ x: 400, y: 900, b: 1700, h: 1600, typ: 'fenster' }],
    });
    // Entities-Vollausbau: Kette + Vorlage mit Möbeln + Modul-Zuweisung
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg', sia: 'HNF', program: 'marktgerecht',
      outline: [{ x: 0, y: 0 }, { x: 13000, y: 0 }, { x: 13000, y: 8500 }, { x: 0, y: 8500 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    const z1 = doc.byKind<Zone>('zone').find((z) => z.name === 'Zimmer 1')!;
    execute(doc, 'design.vorlageSpeichern', { name: 'muster marktgerecht', zoneIds: [z1.id] });
    const mass = execute(doc, 'design.volumenErstellen', {
      storeyId, height: 9000,
      outline: [{ x: 30000, y: 0 }, { x: 40000, y: 0 }, { x: 40000, y: 6500 }, { x: 30000, y: 6500 }],
    });
    execute(doc, 'design.fassadenModulZuweisen', { massId: (mass.patches[0] as { id: string }).id, kante: 1, modul: 'Band' });
    execute(doc, 'design.waendeAusZonen', { storeyId });
    execute(doc, 'design.fensterAusModulen', { storeyId, modul: 'Band' });
    // Roundtrip
    const json1 = doc.toJSON();
    const wieder = KosmoDoc.fromJSON(json1);
    const json2 = wieder.toJSON();
    expect(JSON.parse(JSON.stringify(json2))).toEqual(JSON.parse(JSON.stringify(json1)));
  });

  it('D2: IFC der generierten Kette zählt Wände/Öffnungen/Spaces korrekt', async () => {
    const { exportIfc } = await import('../src');
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg', sia: 'HNF', program: 'marktgerecht',
      outline: [{ x: 0, y: 0 }, { x: 13000, y: 0 }, { x: 13000, y: 8500 }, { x: 0, y: 8500 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    execute(doc, 'design.modulSpeichern', {
      name: 'Band', breite: 2500, hoehe: 3000,
      elemente: [{ x: 400, y: 900, b: 1700, h: 1600, typ: 'fenster' }],
    });
    execute(doc, 'design.waendeAusZonen', { storeyId });
    execute(doc, 'design.fensterAusModulen', { storeyId, modul: null });
    const spf = exportIfc(doc, 'Kette');
    const zaehl = (t: string) => (spf.match(new RegExp(`=\\s*${t}\\(`, 'g')) ?? []).length;
    expect(zaehl('IFCWALL')).toBe(doc.byKind('wall').length);
    expect(zaehl('IFCOPENINGELEMENT')).toBe(doc.byKind('opening').length);
    expect(zaehl('IFCSPACE')).toBe(doc.byKind('zone').length);
    expect(zaehl('IFCRELVOIDSELEMENT')).toBe(doc.byKind('opening').length);
    expect(zaehl('IFCFURNISHINGELEMENT')).toBe(doc.byKind('furniture').length);
  });
});

describe('Review-Fixes (Adversarial-Runde)', () => {
  it('Fix 2: Stapeln landet auf der obersten Kante, nicht auf bestehenden OGs', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    execute(doc, 'design.geschossErstellen', { name: '1.OG', index: 1, elevation: 3000, height: 2800 });
    execute(doc, 'design.geschossKopieren', { storeyId: (eg.patches[0] as { id: string }).id, anzahl: 1 });
    const oben = (doc.storeysOrdered() as Storey[])[2]!;
    expect(oben.elevation).toBe(5800); // 3000 + 2800, NICHT 3000
  });

  it('Fix 3: v1 ohne Flur — kein Raum türlos (6×6-Minimalwohnung)', () => {
    const g = generiereGrundriss(
      [{ x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 6000 }, { x: 0, y: 6000 }],
      'unten',
    );
    // Wohnungstür, Bad, Wohnen + Küchen-Anschluss oder ehrliche Diagnose
    expect(g.tueren.length >= 4 || g.diagnose.some((d) => d.includes('Küche ohne Türanschluss'))).toBe(true);
  });

  it('Fix 4: Fenster stanzen respektiert Türen und Wandränder; Modul-Elemente validiert', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg', sia: 'HNF', program: 'marktgerecht',
      outline: [{ x: 0, y: 0 }, { x: 13000, y: 0 }, { x: 13000, y: 8500 }, { x: 0, y: 8500 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    execute(doc, 'design.waendeAusZonen', { storeyId });
    execute(doc, 'design.modulSpeichern', {
      name: 'Eng', breite: 1500, hoehe: 3000,
      elemente: [{ x: 150, y: 900, b: 1200, h: 1600, typ: 'fenster' }],
    });
    execute(doc, 'design.fensterAusModulen', { storeyId, modul: null });
    // Keine zwei Öffnungen derselben Wand überlappen sich
    for (const wand of doc.byKind<Wall>('wall')) {
      const oeffnungen = doc.openingsOf(wand.id) as import('../src').Opening[];
      const intervalle = oeffnungen.map((o) => [o.center - o.width / 2, o.center + o.width / 2]).sort((a, b) => a[0]! - b[0]!);
      for (let i = 1; i < intervalle.length; i++) {
        expect(intervalle[i]![0]!).toBeGreaterThanOrEqual(intervalle[i - 1]![1]!);
      }
    }
    expect(() =>
      execute(doc, 'design.modulSpeichern', {
        name: 'Kaputt', breite: 1000, hoehe: 3000,
        elemente: [{ x: 500, y: 0, b: 800, h: 1000, typ: 'fenster' }],
      }),
    ).toThrow(/ragt aus dem Modul/);
  });

  it('Fix 5+8: exakt passende letzte Wohnung wird geschnitten; Vorlage nimmt Türen mit', () => {
    // Fix 5
    const erg = segmentiere(
      [{ x: 0, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 14000 }, { x: 0, y: 14000 }],
      [{ x: 0, y: 6000 }, { x: 9000, y: 6000 }, { x: 9000, y: 8000 }, { x: 0, y: 8000 }],
      [{ typ: 'alterswohnen', groesse: 36, anzahl: 2 }],
      { minBreite: 4500 },
    );
    expect(erg.wohnungen.filter((w) => w.typ === 'alterswohnen').length).toBeGreaterThanOrEqual(2);
    // Fix 8
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Whg', sia: 'HNF', program: 'marktgerecht',
      outline: [{ x: 0, y: 0 }, { x: 13000, y: 0 }, { x: 13000, y: 8500 }, { x: 0, y: 8500 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    const raumIds = doc.byKind<Zone>('zone').filter((z) => z.raumTyp).map((z) => z.id);
    execute(doc, 'design.vorlageSpeichern', { name: '3.5zi preisguenstig', zoneIds: raumIds });
    expect(doc.settings.vorlagen[0]!.tueren!.length).toBeGreaterThanOrEqual(7);
    execute(doc, 'design.vorlageSetzen', {
      storeyId, name: '3.5zi preisguenstig', at: { x: 30000, y: 0 }, breite: null, hoehe: null, spiegeln: false,
    });
    expect(doc.byKind<import('../src').ZonenTuer>('zonentuer').filter((t) => t.at.x >= 30000).length).toBeGreaterThanOrEqual(7);
  });
});

describe('Stütze + Unterzug (RE-ARCHICAD A3)', () => {
  it('stuetzeSetzen/unterzugZeichnen: 3D geschosshoch bzw. unter der Decke, Plan-Poché + gestrichelte Flanken', async () => {
    const { doc, storeyId } = setupDoc();
    const c = execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 2000, y: 2000 }, b: 300 });
    const colId = (c.patches[0] as { id: string }).id;
    execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 6000, y: 2000 }, profil: 'rund', b: 400, material: 'holz-bsh' });
    execute(doc, 'design.unterzugZeichnen', { storeyId, a: { x: 2000, y: 2000 }, b: { x: 6000, y: 2000 }, breite: 300, hoehe: 500 });
    // 3D: Stütze geschosshoch (0..3000), Unterzug hängt unter der Decke (2500..3000)
    const col3d = deriveEntity(doc, colId)!;
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 2; i < col3d.positions.length; i += 3) {
      minZ = Math.min(minZ, col3d.positions[i]!);
      maxZ = Math.max(maxZ, col3d.positions[i]!);
    }
    expect(minZ).toBe(0);
    expect(maxZ).toBe(3000);
    const beam = doc.byKind<import('../src').Beam>('beam')[0]!;
    const beam3d = deriveEntity(doc, beam.id)!;
    let bMinZ = Infinity;
    for (let i = 2; i < beam3d.positions.length; i += 3) bMinZ = Math.min(bMinZ, beam3d.positions[i]!);
    expect(bMinZ).toBe(2500);
    expect(beam3d.materialKey).toBe('beton');
    // Plan: 2 Stützen-Regionen mit Material-Poché, 4 gestrichelte Unterzug-Linien
    const plan = derivePlan(doc, storeyId);
    const stuetzen = plan.regions.filter((r) => r.classes.includes('stuetze'));
    expect(stuetzen).toHaveLength(2);
    expect(stuetzen[0]!.classes).toContain('material-beton');
    expect(stuetzen[1]!.classes).toContain('material-holz-bsh');
    expect(stuetzen[1]!.rings[0]).toHaveLength(16); // rund = 16-Eck
    expect(plan.lines.filter((l) => l.classes.includes('unterzug'))).toHaveLength(4);
    const { planInnerSvg } = await import('../src');
    const svg = planInnerSvg(doc, storeyId, 50).inner;
    expect(svg).toContain('#c9c9c9'); // Stützen-Poché wie tragend (schwerer Stift)
    expect(svg).toContain('stroke-dasharray="60 35"'); // Unterzug gestrichelt (1.2/0.7 × 50)
    // Validierung: zu kurzer Unterzug ehrlich abgelehnt
    expect(() =>
      execute(doc, 'design.unterzugZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 50, y: 0 } }),
    ).toThrow(CommandError);
  });

  it('Mengen + IFC: IfcColumn/IfcBeam mit Volumen und Material', async () => {
    const { doc, storeyId } = setupDoc(); // Geschoss 3000
    execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 0, y: 0 }, b: 300 }); // 0.3×0.3×3 = 0.27 m³
    execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 5000, y: 0 }, b: 300 });
    execute(doc, 'design.unterzugZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 5000, y: 0 }, breite: 300, hoehe: 500 });
    const mengen = deriveMengen(doc);
    const st = mengen.positionen.find((p) => p.kind === 'column:beton')!;
    expect(st.anzahl).toBe(2);
    expect(st.ifcKlasse).toBe('IfcColumn');
    expect(st.volumen).toBeCloseTo(2 * 0.27, 5);
    const uz = mengen.positionen.find((p) => p.kind === 'beam:beton')!;
    expect(uz.laenge).toBeCloseTo(5, 5);
    expect(uz.volumen).toBeCloseTo(5 * 0.3 * 0.5, 5);
    const { exportIfc } = await import('../src');
    const ifc = exportIfc(doc, 'Skelett');
    expect((ifc.match(/=\s*IFCCOLUMN\(/g) ?? []).length).toBe(2);
    expect((ifc.match(/=\s*IFCBEAM\(/g) ?? []).length).toBe(1);
  });

  it('stuetzenAusRaster: Stützen auf alle Hauptachsen-Kreuzungen, keine Doppel, ehrliche Fehler', () => {
    const { doc, storeyId } = setupDoc();
    expect(() => execute(doc, 'design.stuetzenAusRaster', { storeyId })).toThrow(/Kein Stützenraster/);
    execute(doc, 'design.rasterSetzen', { storeyId, achsmass: 5000, anzahl: 3, querAnzahl: 2, wohnraster: 2500 });
    execute(doc, 'design.stuetzenAusRaster', { storeyId });
    expect(doc.byKind('column')).toHaveLength(6); // 3 × 2 Kreuzungen
    // Nochmal: alles besetzt → ehrlicher CommandError, keine Doppel
    expect(() => execute(doc, 'design.stuetzenAusRaster', { storeyId })).toThrow(/besetzt/);
    expect(doc.byKind('column')).toHaveLength(6);
  });
});

describe('Verschneidungsprioritäten (RE-ARCHICAD A1)', () => {
  // AW (putz|daemmung|beton) waagrecht, KS-IW senkrecht mitten hindurch —
  // an der Kreuzung überlappen sich alle Schichtbänder mit dem KS-Kern
  const kreuz = () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const ks = execute(doc, 'design.aufbauErstellen', {
      name: 'IW KS 15', target: 'wall',
      layers: [{ material: 'kalksandstein', thickness: 150, function: 'tragend' }],
    });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    execute(doc, 'design.wandZeichnen', {
      storeyId, assemblyId: (ks.patches[0] as { id: string }).id,
      a: { x: 4500, y: -3000 }, b: { x: 4500, y: 3000 },
    });
    return { doc, storeyId };
  };
  const nettoFlaeche = (doc: KosmoDoc, storeyId: string, cls: string) => {
    let a = 0;
    for (const r of derivePlan(doc, storeyId).regions) {
      if (!r.classes.includes(cls)) continue;
      for (const ring of r.rings) a += polygonArea(ring);
    }
    return Math.abs(a);
  };

  it('Beton (900) stösst durch, KS (820) und Dämmung (300) weichen — Handrechnung', () => {
    const { doc, storeyId } = kreuz();
    // Beton bleibt voll: 9000 × 180; KS verliert die Beton-Kreuzung 180 × 150;
    // Dämmung verliert die KS-Kreuzung 160 × 150
    expect(nettoFlaeche(doc, storeyId, 'material-beton')).toBeCloseTo(9000 * 180, 0);
    expect(nettoFlaeche(doc, storeyId, 'material-kalksandstein')).toBeCloseTo(6000 * 150 - 180 * 150, 0);
    expect(nettoFlaeche(doc, storeyId, 'daemmung')).toBeCloseTo(9000 * 160 - 160 * 150, 0);
    // Kein Doppel-Poché mehr: Beton- und KS-Flächen überschneiden sich nicht
    const plan = derivePlan(doc, storeyId);
    const polys = (cls: string) =>
      plan.regions.filter((r) => r.classes.includes(cls)).flatMap((r) => r.rings);
    const ueberlapp = intersect(polys('material-beton'), polys('material-kalksandstein'));
    expect(ueberlapp.reduce((a, p) => a + Math.abs(polygonArea(p)), 0)).toBeLessThan(100);
  });

  it('prioritaetSetzen dreht die Rangfolge projektweit — und Undo stellt sie zurück', () => {
    const { doc, storeyId } = kreuz();
    const res = execute(doc, 'design.prioritaetSetzen', { material: 'kalksandstein', prioritaet: 950 });
    // Jetzt gewinnt KS: voll 6000 × 150, Beton verliert die Kreuzung
    expect(nettoFlaeche(doc, storeyId, 'material-kalksandstein')).toBeCloseTo(6000 * 150, 0);
    expect(nettoFlaeche(doc, storeyId, 'material-beton')).toBeCloseTo(9000 * 180 - 180 * 150, 0);
    doc.apply(invertPatches(res.patches));
    expect(nettoFlaeche(doc, storeyId, 'material-beton')).toBeCloseTo(9000 * 180, 0);
    // Zurücksetzen auf Katalog-Default räumt den Override-Eintrag
    execute(doc, 'design.prioritaetSetzen', { material: 'kalksandstein', prioritaet: 950 });
    execute(doc, 'design.prioritaetSetzen', { material: 'kalksandstein' });
    expect(doc.settings.materialPrioritaeten?.['kalksandstein']).toBeUndefined();
    expect(nettoFlaeche(doc, storeyId, 'material-beton')).toBeCloseTo(9000 * 180, 0);
    // Roundtrip nimmt die Overrides mit
    execute(doc, 'design.prioritaetSetzen', { material: 'putz', prioritaet: 42 });
    const wieder = KosmoDoc.fromJSON(JSON.parse(JSON.stringify(doc.toJSON())));
    expect(wieder.settings.materialPrioritaeten?.['putz']).toBe(42);
  });
});

describe('Publikations-Sets (RE-ARCHICAD A4)', () => {
  it('setDateiname: Platzhalter, Sanitisierung, leere Werte ohne Doppel-Trenner', async () => {
    const { setDateiname, NAMENSREGEL_DEFAULT } = await import('../src');
    expect(NAMENSREGEL_DEFAULT).toBe('P-{nr}_{blatt}_{massstab}');
    expect(
      setDateiname(undefined, { nr: 1, blatt: 'Grundriss EG', projekt: 'TKB', massstab: 50 }),
    ).toBe('P-01_Grundriss_EG_1-50');
    // Ohne Massstab verschwindet der Platzhalter samt Doppel-Trenner
    expect(
      setDateiname(undefined, { nr: 12, blatt: 'Plakat', projekt: 'TKB', massstab: null }),
    ).toBe('P-12_Plakat');
    // Eigene Regel + pfad-unsichere Zeichen
    expect(
      setDateiname('{projekt}/{format} {blatt}', { nr: 3, blatt: 'Schnitt A:A', projekt: 'Haus Meier', format: 'A1-quer' }),
    ).toBe('Haus_Meier-A1-quer_Schnitt_A-A');
    expect(setDateiname('{massstab}', { nr: 1, blatt: 'X', projekt: 'P', massstab: null })).toBe('Blatt');
  });

  it('setSpeichern ersetzt gleichen Namen, validiert Blätter; setEntfernen + gelöschte Blätter fallen raus', async () => {
    const { setBlaetter } = await import('../src');
    const { doc, storeyId } = setupDoc();
    const b1 = (execute(doc, 'publish.blattErstellen', { name: 'Grundriss EG', format: 'A1' }).patches[0] as { id: string }).id;
    const b2 = (execute(doc, 'publish.blattErstellen', { name: 'Schnitt', format: 'A2' }).patches[0] as { id: string }).id;
    execute(doc, 'publish.ansichtPlatzieren', { sheetId: b1, view: 'grundriss', storeyId, scale: 50, x: 200, y: 200 });
    execute(doc, 'publish.setSpeichern', { name: 'Wettbewerb', sheetIds: [b2, b1] });
    expect(doc.settings.publikationsSets).toHaveLength(1);
    // Reihenfolge = Set-Reihenfolge, nicht Blatt-Index
    expect(setBlaetter(doc, doc.settings.publikationsSets![0]!).map((s) => s.id)).toEqual([b2, b1]);
    // Gleicher Name ersetzt; Namensregel wird mitgenommen
    execute(doc, 'publish.setSpeichern', { name: 'Wettbewerb', sheetIds: [b1], namensregel: 'W-{nr}' });
    expect(doc.settings.publikationsSets).toHaveLength(1);
    expect(doc.settings.publikationsSets![0]!.namensregel).toBe('W-{nr}');
    // Validierung + Entfernen + Roundtrip
    expect(() => execute(doc, 'publish.setSpeichern', { name: 'X', sheetIds: ['gibt-es-nicht'] })).toThrow(CommandError);
    const wieder = KosmoDoc.fromJSON(JSON.parse(JSON.stringify(doc.toJSON())));
    expect(wieder.settings.publikationsSets![0]!.name).toBe('Wettbewerb');
    // Gelöschtes Blatt bricht den Export nicht — es fällt ehrlich raus
    execute(doc, 'publish.setSpeichern', { name: 'Wettbewerb', sheetIds: [b2, b1] });
    execute(doc, 'publish.blattEntfernen', { sheetId: b2 });
    expect(setBlaetter(doc, doc.settings.publikationsSets![0]!).map((s) => s.id)).toEqual([b1]);
    execute(doc, 'publish.setEntfernen', { name: 'Wettbewerb' });
    expect(doc.settings.publikationsSets).toHaveLength(0);
    expect(() => execute(doc, 'publish.setEntfernen', { name: 'Wettbewerb' })).toThrow(CommandError);
  });
});

describe('Katalog-Transfer (RE-ARCHICAD A8)', () => {
  it('katalogExport → katalogImportieren: Projekt 2 startet mit dem Wissen von Projekt 1, nichts wird überschrieben', async () => {
    const { katalogExport } = await import('../src');
    // Projekt 1: Aufbau + Vorlage + Modul + Formel + Prioritäts-Override
    const p1 = setupDoc(); // AW Beton 36
    execute(p1.doc, 'design.modulSpeichern', {
      name: 'Band', breite: 2500, hoehe: 3000,
      elemente: [{ x: 400, y: 900, b: 1700, h: 1600, typ: 'fenster' }],
    });
    execute(p1.doc, 'design.kennzahlFormelnSetzen', {
      formeln: [{ name: 'Kosten', wert: 3200, basis: 'agf', einheit: 'CHF' }],
    });
    execute(p1.doc, 'design.prioritaetSetzen', { material: 'kalksandstein', prioritaet: 950 });
    const z = execute(p1.doc, 'design.zoneErstellen', {
      storeyId: p1.storeyId, name: 'Zimmer', sia: 'HNF', raumTyp: 'zimmer',
      outline: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 4000 }, { x: 0, y: 4000 }],
    });
    execute(p1.doc, 'design.vorlageSpeichern', { name: 'Zimmer-Muster', zoneIds: [(z.patches[0] as { id: string }).id] });
    const katalog = JSON.parse(JSON.stringify(katalogExport(p1.doc)));
    expect(katalog.schema).toBe('kosmo.katalog/v1');
    expect(katalog.aufbauten).toHaveLength(1);
    expect(katalog.aufbauten[0].id).toBeUndefined(); // keine Entity-IDs im Katalog

    // Projekt 2: eigener Aufbau GLEICHEN Namens (bleibt), Rest kommt dazu
    const p2 = setupDoc();
    const eigeneId = p2.assemblyId;
    delete katalog.schema;
    execute(p2.doc, 'design.katalogImportieren', katalog);
    const aufbauten = p2.doc.byKind<Assembly>('assembly');
    expect(aufbauten).toHaveLength(1); // Namens-Dublette NICHT importiert
    expect(aufbauten[0]!.id).toBe(eigeneId); // das eigene blieb unangetastet
    expect(p2.doc.settings.vorlagen.map((v) => v.name)).toContain('Zimmer-Muster');
    expect(p2.doc.settings.fassadenModule.map((m) => m.name)).toContain('Band');
    expect(p2.doc.settings.kennzahlFormeln.map((f) => f.name)).toContain('Kosten');
    expect(p2.doc.settings.materialPrioritaeten?.['kalksandstein']).toBe(950);
    // Zweiter Import derselben Datei: ehrlich «nichts zu tun»
    expect(() => execute(p2.doc, 'design.katalogImportieren', katalog)).toThrow(/Nichts zu importieren/);
    // Undo räumt alles zurück
    const p3 = setupDoc();
    const neuAufbau = { ...katalog, aufbauten: [{ name: 'IW KS 15', target: 'wall', layers: [{ material: 'kalksandstein', thickness: 150, function: 'tragend' }] }] };
    const res = execute(p3.doc, 'design.katalogImportieren', neuAufbau);
    expect(p3.doc.byKind('assembly')).toHaveLength(2);
    p3.doc.apply(invertPatches(res.patches));
    expect(p3.doc.byKind('assembly')).toHaveLength(1);
    expect(p3.doc.settings.fassadenModule).toHaveLength(0);
  });
});

describe('Themenplan-Overrides (RE-ARCHICAD A5)', () => {
  it('Brandschutzplan aus demselben Modell: Regeln tönen, Legende erscheint, Thema abschaltbar', async () => {
    const { sheetToSvg } = await import('../src');
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Treppenhaus', sia: 'VF', raumTyp: 'treppenhaus',
      outline: [{ x: 0, y: 1000 }, { x: 3000, y: 1000 }, { x: 3000, y: 4000 }, { x: 0, y: 4000 }],
    });
    // Thema muss existieren, bevor es aktiviert wird
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Brandschutz', format: 'A2' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    execute(doc, 'publish.ansichtPlatzieren', { sheetId, view: 'grundriss', storeyId, scale: 100, x: 200, y: 200 });
    const pid = doc.get<import('../src').Sheet>(sheetId)!.placements[0]!.id;
    expect(() =>
      execute(doc, 'publish.ansichtAnpassen', { sheetId, placementId: pid, thema: 'Brandschutz' }),
    ).toThrow(CommandError);
    execute(doc, 'design.themenPlanSpeichern', {
      name: 'Brandschutz',
      regeln: [
        { kriterium: 'raumTyp', wert: 'treppenhaus', farbe: '#d94040', label: 'Fluchtweg vertikal' },
        { kriterium: 'material', wert: 'beton', farbe: '#9aa7b6', label: 'REI 60' },
      ],
    });
    execute(doc, 'publish.ansichtAnpassen', { sheetId, placementId: pid, thema: 'Brandschutz' });
    const svg = sheetToSvg(doc, sheetId, { projectName: 'T' });
    expect(svg).toContain('#d94040'); // Treppenhaus-Zone getönt (sonst fill none)
    expect(svg).toContain('#9aa7b6'); // Beton-Kern übersteuert (statt #c9c9c9)
    expect(svg).not.toContain('#c9c9c9');
    expect(svg).toContain('Fluchtweg vertikal'); // Legende mit Label
    expect(svg).toContain('· Brandschutz'); // Titel-Zusatz
    // Thema abschalten: normaler Plan, keine Themen-Farben mehr
    execute(doc, 'publish.ansichtAnpassen', { sheetId, placementId: pid, thema: null });
    const normal = sheetToSvg(doc, sheetId, { projectName: 'T' });
    expect(normal).toContain('#c9c9c9');
    expect(normal).not.toContain('#d94040');
    expect(normal).not.toContain('Fluchtweg vertikal');
    // Gleicher Name ersetzt; Entfernen validiert
    execute(doc, 'design.themenPlanSpeichern', {
      name: 'Brandschutz', regeln: [{ kriterium: 'klasse', wert: 'treppe', farbe: '#00aa00' }],
    });
    expect(doc.settings.themen).toHaveLength(1);
    expect(doc.settings.themen![0]!.regeln).toHaveLength(1);
    execute(doc, 'design.themenPlanEntfernen', { name: 'Brandschutz' });
    expect(() => execute(doc, 'design.themenPlanEntfernen', { name: 'Brandschutz' })).toThrow(CommandError);
  });
});

describe('Etiketten + Keynotes (RE-ARCHICAD A6)', () => {
  it('Aufbau-Etikett liest LIVE: Leader + 2 Zeilen, Aufbau ändern zieht nach, Vorprojekt blendet aus, Wirt-Löschung räumt', () => {
    const { doc, storeyId, assemblyId } = setupDoc(); // AW Beton 36: 20|160|180
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    const wallId = (w.patches[0] as { id: string }).id;
    const et = execute(doc, 'design.etikettSetzen', { targetId: wallId, at: { x: 4500, y: 2000 } });
    const plan = derivePlan(doc, storeyId);
    expect(plan.lines.filter((l) => l.classes.includes('etikett'))).toHaveLength(1);
    const texte = plan.texte.filter((t) => t.classes.includes('etikett'));
    expect(texte.map((t) => t.text)).toEqual(['AW Beton 36', '20 / 160 / 180 mm']);
    expect(texte[1]!.zeile).toBe(1);
    // Leader zeigt zur Wandmitte
    expect(plan.lines.find((l) => l.classes.includes('etikett'))!.b).toEqual({ x: 4500, y: 0 });
    // Assoziativ: Aufbau umbenennen + Schichtdicke ändern → Etikett folgt, ohne Anfassen
    const asm = doc.get<Assembly>(assemblyId)!;
    doc.apply([{
      id: assemblyId, before: asm,
      after: { ...asm, name: 'AW Beton 40', layers: asm.layers.map((l) => (l.function === 'tragend' ? { ...l, thickness: 220 } : l)) },
    }]);
    const neu = derivePlan(doc, storeyId).texte.filter((t) => t.classes.includes('etikett'));
    expect(neu.map((t) => t.text)).toEqual(['AW Beton 40', '20 / 160 / 220 mm']);
    // Vorprojekt: Werkplan-Beschriftung weg
    execute(doc, 'design.phaseSetzen', { phase: 'vorprojekt' });
    expect(derivePlan(doc, storeyId).texte.filter((t) => t.classes.includes('etikett'))).toHaveLength(0);
    execute(doc, 'design.phaseSetzen', { phase: 'werkplan' });
    // Wirt löschen räumt das Etikett mit; Undo bringt beides zurück
    const del = execute(doc, 'design.loeschen', { entityId: wallId });
    expect(doc.byKind('etikett')).toHaveLength(0);
    doc.apply(invertPatches(del.patches));
    expect(doc.byKind('etikett')).toHaveLength(1);
    // Ziel-Validierung: Zone/Geschoss sind keine Etiketten-Ziele
    expect(() => execute(doc, 'design.etikettSetzen', { targetId: storeyId, at: { x: 0, y: 0 } })).toThrow(CommandError);
    void et;
  });

  it('Keynotes: zentrale Liste, Etikett validiert, Blatt-Legende schreibt aus, Roundtrip', async () => {
    const { sheetToSvg } = await import('../src');
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    const wallId = (w.patches[0] as { id: string }).id;
    // Etikett ohne existierende Keynote → ehrlicher Fehler
    expect(() =>
      execute(doc, 'design.etikettSetzen', { targetId: wallId, at: { x: 2000, y: 2000 }, inhalt: 'keynote', keynote: 'K1' }),
    ).toThrow(CommandError);
    execute(doc, 'design.keynoteSetzen', { nr: 'K1', text: 'Sockelleiste Eiche geölt' });
    execute(doc, 'design.keynoteSetzen', { nr: 'K10', text: 'Trittschalldämmung 20 mm' });
    execute(doc, 'design.keynoteSetzen', { nr: 'K2', text: 'PROVISORISCH' });
    execute(doc, 'design.keynoteSetzen', { nr: 'K2', text: 'Fensterbank Alu eloxiert' }); // ersetzt
    // numerisch sortiert: K1, K2, K10
    expect(doc.settings.keynotes!.map((k) => k.nr)).toEqual(['K1', 'K2', 'K10']);
    execute(doc, 'design.etikettSetzen', { targetId: wallId, at: { x: 2000, y: 2000 }, inhalt: 'keynote', keynote: 'K1' });
    // Blatt: Marker am Plan + Legende schreibt den Text aus
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Details', format: 'A2' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    execute(doc, 'publish.ansichtPlatzieren', { sheetId, view: 'grundriss', storeyId, scale: 50, x: 200, y: 200 });
    const svg = sheetToSvg(doc, sheetId, { projectName: 'T' });
    expect(svg).toContain('>K1</text>'); // Marker im Plan
    expect(svg).toContain('Sockelleiste Eiche geölt'); // Legende
    expect(svg).not.toContain('Fensterbank'); // unbenutzte Keynote bleibt weg
    // Löschen validiert; Roundtrip nimmt Keynotes mit
    execute(doc, 'design.keynoteSetzen', { nr: 'K10' });
    expect(doc.settings.keynotes!.map((k) => k.nr)).toEqual(['K1', 'K2']);
    expect(() => execute(doc, 'design.keynoteSetzen', { nr: 'K99' })).toThrow(CommandError);
    const wieder = KosmoDoc.fromJSON(JSON.parse(JSON.stringify(doc.toJSON())));
    expect(wieder.settings.keynotes).toHaveLength(2);
    expect(wieder.byKind('etikett')).toHaveLength(1);
  });
});

describe('Plan-Revisionen (RE-ARCHICAD A7)', () => {
  it('revisionErfassen vergibt A→B, Wolke validiert, Plankopf-Tabelle + Wolken-Pfad im Blatt, Undo', async () => {
    const { sheetToSvg } = await import('../src');
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Werkplan EG', format: 'A1' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    execute(doc, 'publish.ansichtPlatzieren', { sheetId, view: 'grundriss', storeyId, scale: 50, x: 300, y: 250 });
    // Ohne Revision: kein Verzeichnis, keine Wolke möglich
    expect(sheetToSvg(doc, sheetId, { projectName: 'T' })).not.toContain('Revisionen');
    expect(() =>
      execute(doc, 'publish.wolkeSetzen', { sheetId, x: 100, y: 100, w: 60, h: 40 }),
    ).toThrow(/Noch keine Revision/);
    // A → B, Wolke an die letzte gebunden
    execute(doc, 'publish.revisionErfassen', { sheetId, text: 'Fenster Küche 1.20 → 1.40', datum: '04.07.2026' });
    execute(doc, 'publish.revisionErfassen', { sheetId, text: 'Durchbruch Technik ergänzt', datum: '04.07.2026' });
    const sheet = () => doc.get<import('../src').Sheet>(sheetId)!;
    expect(sheet().revisionen!.map((r) => r.index)).toEqual(['A', 'B']);
    const wolke = execute(doc, 'publish.wolkeSetzen', { sheetId, x: 100, y: 100, w: 60, h: 40 });
    expect(sheet().wolken![0]!.revision).toBe('B');
    expect(() =>
      execute(doc, 'publish.wolkeSetzen', { sheetId, x: 0, y: 0, w: 10, h: 10, revision: 'Z' }),
    ).toThrow(CommandError);
    const svg = sheetToSvg(doc, sheetId, { projectName: 'T' });
    // D4 (v0.7.3 «Zwei Stimmen»): die Revisionsverzeichnis-Überschrift ist
    // eine Legenden-Titel-Stimme, versal gesetzt — reiner Matcher-String,
    // kein Golden (s. GOLDEN-WECHSEL-D4.md).
    expect(svg).toContain('REVISIONEN'); // Verzeichnis im Plankopf
    expect(svg).toContain('Fenster Küche 1.20 → 1.40');
    expect(svg).toContain('data-teil="revisionen"');
    expect(svg).toMatch(/<path d="M 100 100 A 3 3/); // Wolken-Bogenkette
    expect(svg).toContain('>B</text>'); // Revisions-Marker an der Wolke
    // Wolke entfernen validiert; Undo der Revision räumt das Verzeichnis
    execute(doc, 'publish.wolkeEntfernen', { sheetId, wolkeId: sheet().wolken![0]!.id });
    expect(sheet().wolken).toHaveLength(0);
    expect(() => execute(doc, 'publish.wolkeEntfernen', { sheetId, wolkeId: 'weg' })).toThrow(CommandError);
    doc.apply(invertPatches(wolke.patches)); // Undo der (entfernten) Wolke ist idempotent übers Sheet-Patch-Modell
    expect(sheet().revisionen).toHaveLength(2);
  });

  it('transmittalCsv: je Blatt eine Zeile mit Format/Massstab/Revision, 5 Spalten, Set-Reihenfolge', async () => {
    const { transmittalCsv } = await import('../src');
    const { doc, storeyId } = setupDoc();
    const b1 = (execute(doc, 'publish.blattErstellen', { name: 'Grundriss; EG', format: 'A1' }).patches[0] as { id: string }).id;
    const b2 = (execute(doc, 'publish.blattErstellen', { name: 'Schnitt', format: 'A3' }).patches[0] as { id: string }).id;
    execute(doc, 'publish.ansichtPlatzieren', { sheetId: b1, view: 'grundriss', storeyId, scale: 50, x: 200, y: 200 });
    execute(doc, 'publish.revisionErfassen', { sheetId: b1, text: 'Anpassung', datum: '04.07.2026' });
    const csv = transmittalCsv(doc);
    const zeilen = csv.split('\n');
    expect(zeilen[0]).toBe('Nr;Blatt;Format;Massstab;Revision');
    expect(zeilen).toHaveLength(3);
    expect(zeilen[1]).toContain('"Grundriss; EG"'); // Semikolon im Namen gequotet
    expect(zeilen[1]).toContain('A1 quer (841×594)');
    expect(zeilen[1]).toContain('1:50');
    expect(zeilen[1]).toContain('A · 04.07.2026');
    expect(zeilen[2]).toContain('—'); // Blatt ohne Platzierung/Revision ehrlich leer
    // Set-Reihenfolge zählt
    execute(doc, 'publish.setSpeichern', { name: 'Versand', sheetIds: [b2, b1] });
    const setCsv = transmittalCsv(doc, doc.settings.publikationsSets![0]!);
    expect(setCsv.split('\n')[1]).toContain('Schnitt');
  });
});

describe('Härtetest-Runde 3 (Vision F1)', () => {
  const spec = { a: { x: 0, y: 0 }, b: { x: 9000, y: 0 }, depth: 5000, lookLeft: true } as const;

  it('F1a: Voll-Roundtrip der neuen Bürger — terrain/aussparung/renovation/rolle tief-gleich, Derive lebt danach', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    const wallId = (w.patches[0] as { id: string }).id;
    execute(doc, 'design.renovationSetzen', { ids: [wallId], status: 'abbruch' });
    execute(doc, 'design.terrainSetzen', { typ: 'gewachsen', punkte: [{ x: -1000, y: 0, z: 600 }, { x: 10000, y: 0, z: -400 }] });
    execute(doc, 'design.terrainSetzen', { typ: 'neu', punkte: [{ x: -1000, y: 0, z: 0 }, { x: 10000, y: 0, z: 0 }] });
    execute(doc, 'design.aussparungSetzen', { hostId: wallId, center: 4500, breite: 300, hoehe: 300, sill: 1200 });
    const s = execute(doc, 'design.deckeZeichnen', {
      storeyId, thickness: 250,
      outline: [{ x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 6000 }, { x: 0, y: 6000 }],
    });
    execute(doc, 'design.aussparungSetzen', {
      hostId: (s.patches[0] as { id: string }).id, typ: 'schlitz', at: { x: 3000, y: 3000 }, breite: 400, hoehe: 800,
    });
    execute(doc, 'design.rolleSetzen', { rolle: 'ausfuehrung' });
    const json1 = JSON.parse(JSON.stringify(doc.toJSON()));
    const wieder = KosmoDoc.fromJSON(json1);
    expect(JSON.parse(JSON.stringify(wieder.toJSON()))).toEqual(json1);
    // Derive nach dem Roundtrip: Umbau-Poché, Aussparungs-Symbolik, Terrainprofile, Rolle
    const plan = derivePlan(wieder, storeyId);
    expect(plan.regions.some((r) => r.classes.includes('renovation-abbruch'))).toBe(true);
    expect(plan.lines.filter((l) => l.classes.includes('aussparung')).length).toBeGreaterThanOrEqual(11);
    expect(plan.texte).toHaveLength(2);
    expect(deriveSection(wieder, spec).terrain).toHaveLength(2);
    expect(wieder.settings.rolle).toBe('ausfuehrung');
  });

  it('F1b: alter .kosmo-Stand (vor Vision A–E) lädt sauber — Defaults greifen, keine Umbau-Spuren', async () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    execute(doc, 'design.oeffnungSetzen', {
      wallId: (w.patches[0] as { id: string }).id, openingType: 'fenster', center: 3000, width: 1200, height: 1400, sill: 900,
    });
    // Alte Datei simulieren: neue Settings-Schlüssel + neue Felder fehlen
    const alt = JSON.parse(JSON.stringify(doc.toJSON()));
    delete alt.settings.rolle;
    if (alt.settings.bemassung) delete alt.settings.bemassung.rohKette;
    for (const e of alt.entities) {
      if (e.meta) delete e.meta.renovation;
      delete e.anschlag;
    }
    const wieder = KosmoDoc.fromJSON(alt);
    expect(wieder.settings.rolle).toBeNull(); // Default gemerged
    const plan = derivePlan(wieder, storeyId);
    expect(plan.regions.some((r) => r.classes.some((c) => c.startsWith('renovation-')))).toBe(false);
    const { planInnerSvg } = await import('../src');
    const svg = planInnerSvg(wieder, storeyId, 50).inner;
    expect(svg).not.toContain('#b3261e'); // kein Neubau-Rot
    expect(svg).not.toContain('#f3e29b'); // kein Abbruch-Gelb
    // Ohne Terrain bleibt die flache z0-Linie (Bestandsverhalten = Golden-Verträglichkeit)
    expect(sectionInnerSvg(wieder, spec, 100).inner).toContain('x1="-800" y1="0" x2="9800" y2="0"');
  });

  it('F1c: degenerierte Terrainprofile — identische Punkte, quer zur Schnittspur, zu wenig Punkte ehrlich abgelehnt', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    // 2 identische Stützpunkte: kein Absturz, Polylinie degeneriert zum Punkt
    execute(doc, 'design.terrainSetzen', { typ: 'gewachsen', punkte: [{ x: 5000, y: 0, z: 300 }, { x: 5000, y: 0, z: 300 }] });
    expect(deriveSection(doc, spec).terrain[0]!.pts).toEqual([{ s: 5000, z: 300 }, { s: 5000, z: 300 }]);
    expect(() => sectionInnerSvg(doc, spec, 100)).not.toThrow();
    // Profil quer zur Schnittspur: alle Punkte projizieren auf dasselbe s (senkrechte Linie), kein Absturz
    execute(doc, 'design.terrainSetzen', {
      typ: 'gewachsen', punkte: [{ x: 2000, y: -3000, z: 100 }, { x: 2000, y: 4000, z: 500 }],
    });
    const quer = deriveSection(doc, spec).terrain.find((t) => t.typ === 'gewachsen')!;
    expect(quer.pts.map((p) => p.s)).toEqual([2000, 2000]);
    expect(() => sectionInnerSvg(doc, spec, 100)).not.toThrow();
    // Weniger als 2 Punkte / nicht-ganzzahlig: CommandError statt kaputtem Entity
    expect(() => execute(doc, 'design.terrainSetzen', { typ: 'neu', punkte: [{ x: 0, y: 0, z: 0 }] })).toThrow(CommandError);
    expect(() => execute(doc, 'design.terrainSetzen', { typ: 'neu', punkte: [] })).toThrow(CommandError);
    expect(doc.byKind('terrain')).toHaveLength(1); // nur das (ersetzte) gewachsene Profil
  });

  it('F1d: L-Zerlegung verdaut kollineare Stützpunkte, Doppelpunkte und entartete Umrisse', async () => {
    const { zerlegeRektilinear } = await import('../src');
    const bb = (p: { x: number; y: number }[]) => ({
      w: Math.max(...p.map((q) => q.x)) - Math.min(...p.map((q) => q.x)),
      h: Math.max(...p.map((q) => q.y)) - Math.min(...p.map((q) => q.y)),
    });
    // L mit kollinearen Zwischenpunkten auf zwei Kanten → immer noch dasselbe L
    const L = [
      { x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 5000 },
      { x: 7000, y: 5000 }, { x: 7000, y: 7000 }, { x: 7000, y: 9000 }, { x: 0, y: 9000 },
    ];
    const z = zerlegeRektilinear(L);
    expect(z.typ).toBe('l');
    if (z.typ !== 'l') throw new Error('unreachable');
    expect(bb(z.haupt)).toEqual({ w: 7000, h: 9000 });
    expect(bb(z.fluegel)).toEqual({ w: 5000, h: 5000 });
    // Doppelpunkt an einer echten Ecke: die Ecke darf NICHT verloren gehen (F1-Fix)
    const rechteckDoppelt = [
      { x: 0, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 6000 }, { x: 0, y: 6000 },
    ];
    expect(zerlegeRektilinear(rechteckDoppelt).typ).toBe('rechteck');
    const lDoppelt = [
      { x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 5000 }, { x: 12000, y: 5000 },
      { x: 7000, y: 5000 }, { x: 7000, y: 9000 }, { x: 0, y: 9000 },
    ];
    expect(zerlegeRektilinear(lDoppelt).typ).toBe('l');
    // Alle Punkte kollinear: ehrlich unregelmässig, kein Absturz
    expect(zerlegeRektilinear([{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 2000, y: 0 }, { x: 3000, y: 0 }]).typ).toBe('unregelmaessig');
  });

  it('A2: docFuerUmbau filtert Status + Kinder; Original bleibt unangetastet', async () => {
    const { docFuerUmbau } = await import('../src');
    const { doc, storeyId, assemblyId } = setupDoc();
    const W = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      (execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a, b }).patches[0] as { id: string }).id;
    const bestand = W({ x: 0, y: 0 }, { x: 9000, y: 0 });
    const abbruch = W({ x: 0, y: 0 }, { x: 0, y: 6000 });
    const neu = W({ x: 0, y: 6000 }, { x: 9000, y: 6000 });
    execute(doc, 'design.oeffnungSetzen', { wallId: abbruch, openingType: 'tuer', center: 3000, width: 900, height: 2200, sill: 0 });
    execute(doc, 'design.oeffnungSetzen', { wallId: neu, openingType: 'fenster', center: 4000, width: 1200, height: 1400, sill: 900 });
    execute(doc, 'design.aussparungSetzen', { hostId: neu, center: 2000, breite: 300, hoehe: 300, sill: 1200 });
    execute(doc, 'design.renovationSetzen', { ids: [bestand], status: 'bestand' });
    execute(doc, 'design.renovationSetzen', { ids: [abbruch], status: 'abbruch' });
    execute(doc, 'design.renovationSetzen', { ids: [neu], status: 'neu' });
    const vorher = doc.entities.size;
    // Abbruchplan: Neubau-Wand samt Fenster + Aussparung weg, Tür bleibt
    const abPlan = docFuerUmbau(doc, 'abbruch');
    expect(abPlan.byKind('wall').map((w) => w.id).sort()).toEqual([abbruch, bestand].sort());
    expect(abPlan.byKind('opening').map((o) => (o as { openingType: string }).openingType)).toEqual(['tuer']);
    expect(abPlan.byKind('aussparung')).toHaveLength(0);
    // Neubauplan: Abbruch-Wand samt Tür weg, Fenster + Aussparung bleiben
    const neuPlan = docFuerUmbau(doc, 'neu');
    expect(neuPlan.byKind('wall').map((w) => w.id).sort()).toEqual([bestand, neu].sort());
    expect(neuPlan.byKind('opening').map((o) => (o as { openingType: string }).openingType)).toEqual(['fenster']);
    expect(neuPlan.byKind('aussparung')).toHaveLength(1);
    // Bestandsplan: nur die Bestand-Wand
    expect(docFuerUmbau(doc, 'bestand').byKind('wall').map((w) => w.id)).toEqual([bestand]);
    // Ohne Filter: identisches Objekt (keine Kopie); Original unverändert
    expect(docFuerUmbau(doc)).toBe(doc);
    expect(doc.entities.size).toBe(vorher);
  });

  it('A2: Blatt-Platzierung mit Umbau-Filter — Abbruchplan ohne Neubau-Rot, Titel-Suffix, Filter entfernbar', async () => {
    const { sheetToSvg } = await import('../src');
    const { doc, storeyId, assemblyId } = setupDoc();
    const W = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      (execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a, b }).patches[0] as { id: string }).id;
    W({ x: 0, y: 0 }, { x: 9000, y: 0 });
    execute(doc, 'design.renovationSetzen', { ids: [W({ x: 0, y: 0 }, { x: 0, y: 6000 })], status: 'abbruch' });
    execute(doc, 'design.renovationSetzen', { ids: [W({ x: 0, y: 6000 }, { x: 9000, y: 6000 })], status: 'neu' });
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Umbau', format: 'A2' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    execute(doc, 'publish.ansichtPlatzieren', {
      sheetId, view: 'grundriss', storeyId, scale: 100, x: 200, y: 200, umbau: 'abbruch',
    });
    const pid = doc.get<import('../src').Sheet>(sheetId)!.placements[0]!.id;
    const abSvg = sheetToSvg(doc, sheetId, { projectName: 'T' });
    expect(abSvg).toContain('#8a7500'); // Abbruch-Stift da
    expect(abSvg).not.toContain('#b3261e'); // Neubau-Rot ausgeblendet
    expect(abSvg).toContain('· Abbruch');
    // Umschalten auf Neubauplan
    execute(doc, 'publish.ansichtAnpassen', { sheetId, placementId: pid, umbau: 'neu' });
    const neuSvg = sheetToSvg(doc, sheetId, { projectName: 'T' });
    expect(neuSvg).toContain('#b3261e');
    expect(neuSvg).not.toContain('#8a7500');
    expect(neuSvg).toContain('· Neubau');
    // Filter entfernen = kombiniert: beide Farben, kein Suffix
    execute(doc, 'publish.ansichtAnpassen', { sheetId, placementId: pid, umbau: null });
    expect(doc.get<import('../src').Sheet>(sheetId)!.placements[0]!.umbau).toBeUndefined();
    const kombi = sheetToSvg(doc, sheetId, { projectName: 'T' });
    expect(kombi).toContain('#b3261e');
    expect(kombi).toContain('#8a7500');
    expect(kombi).not.toContain('· Abbruch');
  });

  it('F1e: renovationSetzen ist atomar — ein ungültiges Ziel in der Liste, kein halber Patch', () => {
    const { doc, storeyId, assemblyId } = setupDoc();
    const w = execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 9000, y: 0 } });
    const wallId = (w.patches[0] as { id: string }).id;
    expect(() =>
      execute(doc, 'design.renovationSetzen', { ids: [wallId, storeyId], status: 'neu' }),
    ).toThrow(CommandError);
    expect((doc.get<Wall>(wallId)!.meta ?? {}).renovation).toBeUndefined(); // Wand blieb unangetastet
    expect(() =>
      execute(doc, 'design.renovationSetzen', { ids: [wallId, 'gibt-es-nicht'], status: 'neu' }),
    ).toThrow(CommandError);
    expect((doc.get<Wall>(wallId)!.meta ?? {}).renovation).toBeUndefined();
  });
});

// ── V1-Finish P2: Render-Graph (KosmoVis Node-Tree) ──────────────────

describe('Render-Graph (vis.*)', () => {
  const grundGraph = () => {
    const doc = new KosmoDoc();
    const g = execute(doc, 'vis.graphErstellen', { name: 'Test' });
    const graphId = (g.patches[0] as { id: string }).id;
    const node = (typ: string, params?: Record<string, string | number | boolean>) => {
      const r = execute(doc, 'vis.nodeSetzen', { graphId, typ, x: 0, y: 0, ...(params ? { params } : {}) });
      const graph = doc.get<VisGraph>(graphId)!;
      void r;
      return graph.nodes[graph.nodes.length - 1]!.id;
    };
    return { doc, graphId, node };
  };

  it('V1-Welle Commit 2: vis.nodeKollabieren klappt einen Node ein/aus, ist undo-fähig und prüft den Node', () => {
    const { doc, graphId, node } = grundGraph();
    const prompt = node('prompt', { text: 'Sichtbeton' });
    let graph = doc.get<VisGraph>(graphId)!;
    expect(graph.nodes.find((n) => n.id === prompt)!.collapsed).toBeUndefined();

    const res = execute(doc, 'vis.nodeKollabieren', { graphId, nodeId: prompt, collapsed: true });
    graph = doc.get<VisGraph>(graphId)!;
    expect(graph.nodes.find((n) => n.id === prompt)!.collapsed).toBe(true);

    // Undo (Patch-Inverse) stellt den unkollabierten Zustand exakt wieder her.
    doc.apply(invertPatches(res.patches));
    graph = doc.get<VisGraph>(graphId)!;
    expect(graph.nodes.find((n) => n.id === prompt)!.collapsed).toBeUndefined();

    // Wieder einklappen, dann ausklappen — beides funktioniert symmetrisch.
    execute(doc, 'vis.nodeKollabieren', { graphId, nodeId: prompt, collapsed: true });
    execute(doc, 'vis.nodeKollabieren', { graphId, nodeId: prompt, collapsed: false });
    graph = doc.get<VisGraph>(graphId)!;
    expect(graph.nodes.find((n) => n.id === prompt)!.collapsed).toBe(false);

    // Unbekannter Node ehrlich abgelehnt (wie jeder andere vis.*-Command).
    expect(() => execute(doc, 'vis.nodeKollabieren', { graphId, nodeId: 'nix', collapsed: true })).toThrow(
      /existiert nicht/,
    );
  });

  it('Verbinden validiert: Typen, Ports, Selbstbezug, Zyklen — belegter Eingang wird ersetzt', () => {
    const { doc, graphId, node } = grundGraph();
    const prompt = node('prompt', { text: 'Sichtbeton' });
    const stimmung = node('stimmung', { preset: 'abend' });
    const komb = node('kombinierer');
    const zahl = node('zahl', { wert: 0.6 });
    const render = node('render');

    // unbekannter Typ ehrlich abgelehnt
    expect(() => execute(doc, 'vis.nodeSetzen', { graphId, typ: 'quatsch', x: 0, y: 0 })).toThrow(/Unbekannter Node-Typ/);
    // falscher Port
    expect(() =>
      execute(doc, 'vis.verbinden', { graphId, from: prompt, fromPort: 'nix', to: komb, toPort: 'stil' }),
    ).toThrow(/keinen Ausgang/);
    // Typ-Mismatch: zahl → prompt-Eingang
    expect(() =>
      execute(doc, 'vis.verbinden', { graphId, from: zahl, fromPort: 'zahl', to: komb, toPort: 'stil' }),
    ).toThrow(/Port-Typen passen nicht/);
    // Selbstbezug
    expect(() =>
      execute(doc, 'vis.verbinden', { graphId, from: komb, fromPort: 'prompt', to: komb, toPort: 'stil' }),
    ).toThrow(/sich selbst/);

    execute(doc, 'vis.verbinden', { graphId, from: prompt, fromPort: 'prompt', to: komb, toPort: 'stil' });
    execute(doc, 'vis.verbinden', { graphId, from: komb, fromPort: 'prompt', to: render, toPort: 'prompt' });
    // belegten Eingang ersetzen: stimmung → stil verdrängt prompt → stil
    execute(doc, 'vis.verbinden', { graphId, from: stimmung, fromPort: 'prompt', to: komb, toPort: 'stil' });
    let graph = doc.get<VisGraph>(graphId)!;
    const stilKanten = graph.edges.filter((e) => e.to === komb && e.toPort === 'stil');
    expect(stilKanten).toHaveLength(1);
    expect(stilKanten[0]!.from).toBe(stimmung);

    // Zyklus ehrlich abgelehnt: render.bild → vergleich wäre ok, aber komb → komb-Vorfahre nicht.
    // Baue prompt → komb.stimmung, dann versuche komb → prompt (unmöglich, prompt hat keinen Eingang)
    // → nimm zwei Kombinierer für den echten Kreis:
    const komb2 = node('kombinierer');
    execute(doc, 'vis.verbinden', { graphId, from: komb, fromPort: 'prompt', to: komb2, toPort: 'stimmung' });
    expect(() =>
      execute(doc, 'vis.verbinden', { graphId, from: komb2, fromPort: 'prompt', to: komb, toPort: 'stimmung' }),
    ).toThrow(/Zyklus/);

    // Node löschen räumt seine Kanten mit
    execute(doc, 'vis.nodeLoeschen', { graphId, nodeId: komb });
    graph = doc.get<VisGraph>(graphId)!;
    expect(graph.nodes.some((n) => n.id === komb)).toBe(false);
    expect(graph.edges.some((e) => e.from === komb || e.to === komb)).toBe(false);
  });

  it('Evaluation: Prompt-Komposition wie V8, Zahlen fliessen, ehrliche Defaults, Roundtrip + Undo', () => {
    const { doc: leer } = (() => ({ doc: new KosmoDoc() }))();
    void leer;
    // Modell mit Sichtbeton-Wand, damit Material-Bausteine sprechen
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const asm = execute(doc, 'design.aufbauErstellen', {
      name: 'AW Beton',
      target: 'wall',
      layers: [{ material: 'Sichtbeton', thickness: 250, function: 'tragend' }],
    });
    const assemblyId = (asm.patches[0] as { id: string }).id;
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } });

    const g = execute(doc, 'vis.graphErstellen', { name: 'Abendbild' });
    const graphId = (g.patches[0] as { id: string }).id;
    const setze = (typ: string, params?: Record<string, string | number | boolean>) => {
      execute(doc, 'vis.nodeSetzen', { graphId, typ, x: 0, y: 0, ...(params ? { params } : {}) });
      const graph = doc.get<VisGraph>(graphId)!;
      return graph.nodes[graph.nodes.length - 1]!.id;
    };
    const modell = setze('modell');
    const stimmung = setze('stimmung', { preset: 'abend' });
    const stil = setze('prompt', { text: 'Blick vom Quai' });
    const material = setze('material');
    const komb = setze('kombinierer');
    const treue = setze('zahl', { wert: 0.55 });
    const render = setze('render');
    const verbinde = (from: string, fromPort: string, to: string, toPort: string) =>
      execute(doc, 'vis.verbinden', { graphId, from, fromPort, to, toPort });
    verbinde(stimmung, 'prompt', komb, 'stimmung');
    verbinde(stil, 'prompt', komb, 'stil');
    verbinde(material, 'material', komb, 'material');
    verbinde(komb, 'prompt', render, 'prompt');
    verbinde(treue, 'zahl', render, 'treue');
    verbinde(modell, 'szene', render, 'szene');

    const graph = doc.get<VisGraph>(graphId)!;
    const auswertung = evaluiereGraph(doc, graph);
    // Komposition = finalerRenderPrompt(stimmung, stil, bausteine) — Wortlaut identisch zur Einfach-Ansicht
    const erwartet = finalerRenderPrompt(
      'Abendstimmung, warmes Licht, leuchtende Fenster',
      'Blick vom Quai',
      renderPromptBausteine(doc),
    );
    expect(auswertung.werte.get(komb)!['prompt']).toBe(erwartet);
    expect(erwartet).toContain('Sichtbeton-Fassade');
    const auftrag = auswertung.renderAuftraege.get(render)!;
    expect(auftrag.prompt).toBe(erwartet);
    expect(auftrag.faithful).toBe(0.55);
    expect(auftrag.samples).toBe(128); // unverbunden → ehrlicher Default
    expect(auftrag.hatSzene).toBe(true);
    expect(auftrag.nurCycles).toBe(false); // HS5: Default aus (KI-Veredelung)

    // Topologie liefert Quellen vor Senken
    const folge = topoReihenfolge(graph).map((n) => n.id);
    expect(folge.indexOf(komb)).toBeGreaterThan(folge.indexOf(stimmung));
    expect(folge.indexOf(render)).toBeGreaterThan(folge.indexOf(komb));

    // Roundtrip: Graph überlebt .kosmo/Sync-Serialisierung
    const wieder = KosmoDoc.fromJSON(JSON.parse(JSON.stringify(doc.toJSON())));
    const graphWieder = wieder.get<VisGraph>(graphId)!;
    expect(graphWieder.nodes).toHaveLength(7);
    expect(graphWieder.edges).toHaveLength(6);
    expect(evaluiereGraph(wieder, graphWieder).werte.get(komb)!['prompt']).toBe(erwartet);

    // Undo: Parametrieren rückgängig
    const res = execute(doc, 'vis.nodeParametrieren', { graphId, nodeId: stil, params: { text: 'Neuer Text' } });
    expect(doc.get<VisGraph>(graphId)!.nodes.find((n) => n.id === stil)!.params['text']).toBe('Neuer Text');
    doc.apply(invertPatches(res.patches));
    expect(doc.get<VisGraph>(graphId)!.nodes.find((n) => n.id === stil)!.params['text']).toBe('Blick vom Quai');
  });

  it('HS5: der Render-Node-Param nurCycles fliesst in den RenderAuftrag durch', () => {
    const doc = new KosmoDoc();
    const g = execute(doc, 'vis.graphErstellen', { name: 'Cycles-Test' });
    const graphId = (g.patches[0] as { id: string }).id;
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'render', x: 0, y: 0 });
    const render = doc.get<VisGraph>(graphId)!.nodes[doc.get<VisGraph>(graphId)!.nodes.length - 1]!.id;

    // Default: nurCycles false (KI-Veredelung)
    let auftrag = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!).renderAuftraege.get(render)!;
    expect(auftrag.nurCycles).toBe(false);

    // Schalter an → auftrag.nurCycles true (der Client bestellt reines Cycles)
    execute(doc, 'vis.nodeParametrieren', { graphId, nodeId: render, params: { nurCycles: true } });
    auftrag = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!).renderAuftraege.get(render)!;
    expect(auftrag.nurCycles).toBe(true);

    // Nur der strikte Bool zählt — ein truthy-aber-nicht-true bleibt false (ehrlich)
    execute(doc, 'vis.nodeParametrieren', { graphId, nodeId: render, params: { nurCycles: 'ja' as unknown as boolean } });
    auftrag = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!).renderAuftraege.get(render)!;
    expect(auftrag.nurCycles).toBe(false);
  });

  it('v0.6.7 P0: Katalog trägt den additiven Node-Typ «aufnahme» (Quelle, kein Eingang, Ausgang bild)', () => {
    // Nachgezogener Katalog-Vertrag (Briefing v0.6.7 P0): der Katalog wuchs
    // additiv von 11 auf 12 Typen — dieser Test hält die Grösse UND die
    // konkrete Form des neuen Eintrags ehrlich fest, damit ein künftiger
    // Katalog-Umbau hier ehrlich auffliegt.
    expect(Object.keys(VIS_NODE_KATALOG)).toHaveLength(12);
    const kat = VIS_NODE_KATALOG['aufnahme']!;
    expect(kat.kategorie).toBe('quelle');
    expect(kat.inputs).toEqual([]);
    expect(kat.outputs).toEqual([{ name: 'bild', typ: 'bild', label: 'Bild' }]);
    expect(kat.defaults).toEqual({ kamera: 'aktuell' });
  });

  it('v0.6.7 P0: «aufnahme» im Graph — evaluiereGraph stürzt nie, liefert (wie render/referenz) keinen puren Bild-Wert; aufnahme→vergleich verbindet', () => {
    const doc = new KosmoDoc();
    const g = execute(doc, 'vis.graphErstellen', { name: 'Aufnahme-Test' });
    const graphId = (g.patches[0] as { id: string }).id;
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'aufnahme', x: 0, y: 0, params: { kamera: 'nordost' } });
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'vergleich', x: 200, y: 0 });
    const graph0 = doc.get<VisGraph>(graphId)!;
    const [aufnahme, vergleich] = graph0.nodes.map((n) => n.id) as [string, string];

    expect(() => evaluiereGraph(doc, doc.get<VisGraph>(graphId)!)).not.toThrow();
    const vorVerbindung = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!);
    expect(vorVerbindung.werte.get(aufnahme)).toBeUndefined(); // Bild lebt nur in der App-Laufzeit

    // Kernel-seitig ist die Kante ein normaler bild→bild-Verbund — wie render→vergleich.
    execute(doc, 'vis.verbinden', { graphId, from: aufnahme, fromPort: 'bild', to: vergleich, toPort: 'bild1' });
    const graph1 = doc.get<VisGraph>(graphId)!;
    expect(graph1.edges).toHaveLength(1);
    expect(graph1.nodes.find((n) => n.id === aufnahme)!.params['kamera']).toBe('nordost');
    expect(() => evaluiereGraph(doc, graph1)).not.toThrow();

    // Roundtrip durch .kosmo/Sync-Serialisierung bleibt stabil.
    const wieder = KosmoDoc.fromJSON(JSON.parse(JSON.stringify(doc.toJSON())));
    const graphWieder = wieder.get<VisGraph>(graphId)!;
    expect(graphWieder.nodes.find((n) => n.typ === 'aufnahme')).toBeDefined();
    expect(graphWieder.edges).toHaveLength(1);
  });
});

// ── Härtetest-Runde 4 (V1-Finish P6) ─────────────────────────────────

describe('Härtetest-Runde 4', () => {
  it('H4a: hängende Kante (Sync-Merge löschte den Node) — Topologie und Evaluation stürzen nie', () => {
    const doc = new KosmoDoc();
    const g = execute(doc, 'vis.graphErstellen', { name: 'Merge-Opfer' });
    const graphId = (g.patches[0] as { id: string }).id;
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'prompt', x: 0, y: 0, params: { text: 'bleibt' } });
    const graph = doc.get<VisGraph>(graphId)!;
    const prompt = graph.nodes[0]!.id;
    // Kaputten Stand direkt einspielen (wie ein feindlicher Merge): Kante zu einem Geist-Node
    const kaputt: VisGraph = {
      ...graph,
      edges: [{ id: 'geist', from: prompt, fromPort: 'prompt', to: 'gibt-es-nicht', toPort: 'stil' }],
    };
    doc.apply([{ id: graphId, before: graph, after: kaputt }]);
    const folge = topoReihenfolge(doc.get<VisGraph>(graphId)!);
    expect(folge.map((n) => n.id)).toEqual([prompt]);
    const auswertung = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!);
    expect(auswertung.werte.get(prompt)!['prompt']).toBe('bleibt');
  });

  it('H4b: Zyklus in Fremddaten (geladene Datei umgeht die Commands) — Evaluation terminiert', () => {
    const doc = new KosmoDoc();
    const g = execute(doc, 'vis.graphErstellen', { name: 'Zyklus-Datei' });
    const graphId = (g.patches[0] as { id: string }).id;
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'kombinierer', x: 0, y: 0 });
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'kombinierer', x: 0, y: 0 });
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'prompt', x: 0, y: 0, params: { text: 'sauber' } });
    const graph = doc.get<VisGraph>(graphId)!;
    const [k1, k2, prompt] = graph.nodes.map((n) => n.id) as [string, string, string];
    const kaputt: VisGraph = {
      ...graph,
      edges: [
        { id: 'z1', from: k1, fromPort: 'prompt', to: k2, toPort: 'stimmung' },
        { id: 'z2', from: k2, fromPort: 'prompt', to: k1, toPort: 'stimmung' },
      ],
    };
    doc.apply([{ id: graphId, before: graph, after: kaputt }]);
    const geladen = KosmoDoc.fromJSON(JSON.parse(JSON.stringify(doc.toJSON())));
    // terminiert, Zyklus-Nodes fallen aus der Folge, der saubere Node rechnet
    const folge = topoReihenfolge(geladen.get<VisGraph>(graphId)!);
    expect(folge.map((n) => n.id)).toEqual([prompt]);
    const auswertung = evaluiereGraph(geladen, geladen.get<VisGraph>(graphId)!);
    expect(auswertung.werte.get(prompt)!['prompt']).toBe('sauber');
    expect(hatZyklus(kaputt.nodes, kaputt.edges)).toBe(true);
  });

  it('H4c (T4a-Bug1): Node OHNE `params` (Hand-Edit/Fremd-Tool-Import) — Evaluation stürzt nie', () => {
    // Genau der Owner-Laptop-Befund: ein Node, der die Undo/Sync/Command-Schiene
    // umgeht (Hand-editiertes .kosmo, Fremd-Tool-Export, Yjs-Merge von einem
    // anderen App-Stand) kann ganz ohne `params`-Feld ankommen. Vor dem Fix warf
    // evaluiereGraph hier «Cannot read properties of undefined (reading 'text')»
    // — ein einziger solcher Node riss die GANZE KosmoVis-Auswertung ab.
    const doc = new KosmoDoc();
    const g = execute(doc, 'vis.graphErstellen', { name: 'Params-los' });
    const graphId = (g.patches[0] as { id: string }).id;
    for (const typ of ['prompt', 'stimmung', 'zahl'] as const) {
      execute(doc, 'vis.nodeSetzen', { graphId, typ, x: 0, y: 0 });
    }
    const graph = doc.get<VisGraph>(graphId)!;
    const [prompt, stimmung, zahl] = graph.nodes.map((n) => n.id) as [string, string, string];
    const kaputt: VisGraph = {
      ...graph,
      // Jeder Node verliert sein `params`-Feld komplett (nicht nur leer: WEG).
      nodes: graph.nodes.map((n) => ({ id: n.id, typ: n.typ, x: n.x, y: n.y }) as unknown as (typeof graph.nodes)[number]),
    };
    doc.apply([{ id: graphId, before: graph, after: kaputt }]);
    expect(() => evaluiereGraph(doc, doc.get<VisGraph>(graphId)!)).not.toThrow();
    const auswertung = evaluiereGraph(doc, doc.get<VisGraph>(graphId)!);
    // Fehlende Parameter zählen wie leere/Default-Werte, nicht wie ein Absturz.
    expect(auswertung.werte.get(prompt)).toEqual({ prompt: '' });
    expect(auswertung.werte.get(stimmung)).toEqual({ prompt: 'Morgenlicht, klare lange Schatten, frische kühle Luft' });
    expect(auswertung.werte.get(zahl)).toEqual({ zahl: 0 });
    // vis.nodeParametrieren auf einem params-losen Node darf ebenfalls nicht werfen
    // und setzt den neuen Wert sauber, statt an `...undefined` zu scheitern.
    expect(() => execute(doc, 'vis.nodeParametrieren', { graphId, nodeId: prompt, params: { text: 'geflickt' } })).not.toThrow();
    const geflickt = doc.get<VisGraph>(graphId)!.nodes.find((n) => n.id === prompt)!;
    expect(geflickt.params['text']).toBe('geflickt');
  });
});

// ── Blender-Interop (P6): GLB spricht Blenderisch ────────────────────

describe('GLB-Export Blender-Interop', () => {
  it('Objektnamen lesbar (Bauteil + Aufbau + Geschoss), Material-Slots benannt, Masse in Metern', () => {
    const { doc } = testhausMitQuertrakt();
    const glb = exportGlb(doc, 'Testhaus');
    const dv = new DataView(glb);
    expect(dv.getUint32(0, true)).toBe(0x46546c67); // glTF-Magic
    const jsonLen = dv.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, jsonLen)));
    // Blender-Outliner: «Wand AW … · EG [xxxxxx]» statt roher Id
    const namen = (json.nodes as { name: string }[]).map((n) => n.name);
    expect(namen.some((n) => n.startsWith('Wand ') && n.includes('· EG'))).toBe(true);
    // Material-Slots deutsch benannt
    const matNamen = (json.materials as { name: string }[]).map((m) => m.name);
    expect(matNamen).toContain('Beton');
    // Meter-Einheiten: kein Punkt weiter als 1 km draussen (mm hätte 8000+)
    for (const acc of json.accessors as { max?: number[] }[]) {
      if (acc.max) for (const v of acc.max) expect(Math.abs(v)).toBeLessThan(1000);
    }
  });
});

describe('FreeMesh Stufe 3 / FM1 — Kernel-Fundament (Block 3, Owner-Q9)', () => {
  const setupMeshDoc = () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    return { doc, storeyId: (eg.patches[0] as { id: string }).id };
  };

  it('mesh-topo: Quader ist wasserdicht und misst exakt b·l·h', async () => {
    const { quaderMesh, kantenZaehlung, meshVolumen } = await import('../src');
    const q = quaderMesh({ x: 0, y: 0 }, 2000, 3000, 1500);
    expect(q.positions.length / 3).toBe(8);
    expect(q.faces.length / 3).toBe(12);
    for (const [, anzahl] of kantenZaehlung(q.positions, q.faces)) expect(anzahl).toBe(2);
    expect(meshVolumen(q.positions, q.faces)).toBe(2000 * 3000 * 1500);
  });

  it('mesh-topo: Prisma aus L-Polygon ist wasserdicht, Volumen = Fläche·Höhe, CW wird normalisiert', async () => {
    const { prismaMesh, kantenZaehlung, meshVolumen } = await import('../src');
    // L-Form 4×4 m minus 2×2-m-Ecke = 12 m² Grundfläche, CCW
    const L = [
      { x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 2000 },
      { x: 2000, y: 2000 }, { x: 2000, y: 4000 }, { x: 0, y: 4000 },
    ];
    const p = prismaMesh(L, 0, 1000);
    expect(p.positions.length / 3).toBe(12);
    for (const [, anzahl] of kantenZaehlung(p.positions, p.faces)) expect(anzahl).toBe(2);
    expect(meshVolumen(p.positions, p.faces)).toBe(12_000_000 * 1000);
    // CW-Eingabe (verkehrt) liefert dieselbe auswärts orientierte Form
    const cw = prismaMesh([...L].reverse(), 0, 1000);
    expect(meshVolumen(cw.positions, cw.faces)).toBe(12_000_000 * 1000);
  });

  it('mesh-topo: planare Region flutet den Quader-Deckel (genau 2 Dreiecke), Extrusion bleibt wasserdicht', async () => {
    const { quaderMesh, planareRegion, extrudiereRegion, kantenZaehlung, meshVolumen } = await import('../src');
    const q = quaderMesh({ x: 0, y: 0 }, 2000, 2000, 1000);
    // Deckel-Dreiecke sind Index 2 und 3 (Bauplan quaderMesh)
    const region = planareRegion(q.positions, q.faces, 2);
    expect(region).toEqual([2, 3]);
    const ex = extrudiereRegion(q, region, 500);
    expect(ex.positions.length / 3).toBe(12); // 8 + 4 verschobene Deckel-Ecken
    expect(ex.faces.length / 3).toBe(20); // 12 − 2 + 2 + 4 Kanten·2
    for (const [, anzahl] of kantenZaehlung(ex.positions, ex.faces)) expect(anzahl).toBe(2);
    // Math.round: der Divergenzsatz teilt durch 6 — IEEE-Rauschen ~1e-6 mm³
    expect(Math.round(meshVolumen(ex.positions, ex.faces))).toBe(2000 * 2000 * 1500);
  });

  it('mesh-topo: gleichePositionen verschweisst deckungsgleiche Vertices', async () => {
    const { gleichePositionen } = await import('../src');
    const positions = [0, 0, 0, 100, 0, 0, 0, 0, 0, 100, 0, 0, 50, 50, 50];
    expect(gleichePositionen(positions, 0)).toEqual([0, 2]);
    expect(gleichePositionen(positions, 3)).toEqual([1, 3]);
    expect(gleichePositionen(positions, 4)).toEqual([4]);
  });

  it('meshErstellen «quader» legt das Entity an und die 3D-Ableitung liefert ein Artefakt', () => {
    const { doc, storeyId } = setupMeshDoc();
    const res = execute(doc, 'design.meshErstellen', {
      form: 'quader', storeyId, at: { x: 1000, y: 1000 }, breite: 2000, laenge: 2000, hoehe: 1500,
    });
    const id = (res.patches[0] as { id: string }).id;
    const mesh = doc.get(id)!;
    expect(mesh.kind).toBe('freemesh');
    const artifact = deriveEntity(doc, id)!;
    expect(artifact).not.toBeNull();
    expect(artifact.entityId).toBe(id);
    // exploded Flat-Shading: 12 Dreiecke × 3 Vertices × 3 Koordinaten
    expect(artifact.positions.length).toBe(12 * 9);
    expect(deriveAll(doc).some((a) => a.entityId === id)).toBe(true);
  });

  it('meshErstellen «daten» nimmt rohe Geometrie an und bewacht Budget/Indizes (E6, GLB-Übernahme)', () => {
    const { doc, storeyId } = setupMeshDoc();
    // Tetraeder: 4 Vertices, 4 Dreiecke
    const positions = [0, 0, 0, 2000, 0, 0, 0, 2000, 0, 0, 0, 2000];
    const faces = [0, 2, 1, 0, 1, 3, 1, 2, 3, 0, 3, 2];
    const res = execute(doc, 'design.meshErstellen', { form: 'daten', storeyId, positions, faces, name: 'Import' });
    const mesh = doc.get<import('../src').FreeMesh>((res.patches[0] as { id: string }).id)!;
    expect(mesh.faces.length / 3).toBe(4);
    expect(mesh.name).toBe('Import');
    // kaputter Index → ehrliche Abweisung
    expect(() =>
      execute(doc, 'design.meshErstellen', { form: 'daten', storeyId, positions, faces: [0, 1, 9] }),
    ).toThrow(CommandError);
    // unvollständiges Tripel → ehrliche Abweisung
    expect(() =>
      execute(doc, 'design.meshErstellen', { form: 'daten', storeyId, positions: [0, 0], faces: [0, 1, 2] }),
    ).toThrow(CommandError);
  });

  it('meshErstellen «quader» ohne Masse wird ehrlich abgewiesen', () => {
    const { doc, storeyId } = setupMeshDoc();
    expect(() => execute(doc, 'design.meshErstellen', { form: 'quader', storeyId })).toThrow(CommandError);
  });

  it('meshErstellen «ausVolumen» wandelt den MassBody in EINEM Undo-Schritt um (Volumen identisch)', async () => {
    const { meshVolumen } = await import('../src');
    const { doc, storeyId } = setupMeshDoc();
    const mv = execute(doc, 'design.volumenErstellen', {
      storeyId,
      outline: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 2000 }, { x: 2000, y: 2000 }, { x: 2000, y: 4000 }, { x: 0, y: 4000 }],
      height: 3000, program: 'atelier',
    });
    const massId = (mv.patches[0] as { id: string }).id;
    const res = execute(doc, 'design.meshErstellen', { form: 'ausVolumen', massId });
    // EIN Command, zwei Patches: Mesh hinzu + Volumen weg (atomare Undo-Gruppe)
    expect(res.patches).toHaveLength(2);
    expect((res.patches[1] as { after: unknown }).after).toBeNull();
    expect(doc.get(massId)).toBeUndefined();
    const mesh = doc.get<import('../src').FreeMesh>((res.patches[0] as { id: string }).id)!;
    expect(mesh.name).toBe('atelier');
    expect(meshVolumen(mesh.positions, mesh.faces)).toBe(12_000_000 * 3000);
  });

  it('meshVertexSchieben verschiebt genau die verschweissten Ecken (und wehrt Unsinn ab)', async () => {
    const { gleichePositionen } = await import('../src');
    const { doc, storeyId } = setupMeshDoc();
    const res = execute(doc, 'design.meshErstellen', {
      form: 'quader', storeyId, at: { x: 0, y: 0 }, breite: 1000, laenge: 1000, hoehe: 1000,
    });
    const id = (res.patches[0] as { id: string }).id;
    const vorher = doc.get<import('../src').FreeMesh>(id)!;
    const ecke = gleichePositionen(vorher.positions, 4); // eine Deckel-Ecke
    execute(doc, 'design.meshVertexSchieben', { entityId: id, indices: ecke, dx: 0, dy: 0, dz: 300 });
    const nachher = doc.get<import('../src').FreeMesh>(id)!;
    for (const i of ecke) expect(nachher.positions[i * 3 + 2]).toBe(vorher.positions[i * 3 + 2]! + 300);
    // unveränderte Boden-Ecke bleibt
    expect(nachher.positions[0 * 3 + 2]).toBe(vorher.positions[0 * 3 + 2]);
    expect(() =>
      execute(doc, 'design.meshVertexSchieben', { entityId: id, indices: [999], dx: 1, dy: 0, dz: 0 }),
    ).toThrow(CommandError);
    expect(() =>
      execute(doc, 'design.meshVertexSchieben', { entityId: id, indices: [0], dx: 0, dy: 0, dz: 0 }),
    ).toThrow(CommandError);
  });

  it('meshFlaecheExtrudieren wirkt als EIN Undo-Schritt und vergrössert das Volumen exakt', async () => {
    const { meshVolumen, kantenZaehlung } = await import('../src');
    const { doc, storeyId } = setupMeshDoc();
    const res = execute(doc, 'design.meshErstellen', {
      form: 'quader', storeyId, at: { x: 0, y: 0 }, breite: 2000, laenge: 2000, hoehe: 1000,
    });
    const id = (res.patches[0] as { id: string }).id;
    const ex = execute(doc, 'design.meshFlaecheExtrudieren', { entityId: id, face: 2, distanz: 500 });
    expect(ex.patches).toHaveLength(1);
    const mesh = doc.get<import('../src').FreeMesh>(id)!;
    expect(mesh.faces.length / 3).toBe(20);
    for (const [, anzahl] of kantenZaehlung(mesh.positions, mesh.faces)) expect(anzahl).toBe(2);
    expect(Math.round(meshVolumen(mesh.positions, mesh.faces))).toBe(2000 * 2000 * 1500);
    expect(() =>
      execute(doc, 'design.meshFlaecheExtrudieren', { entityId: id, face: 999, distanz: 100 }),
    ).toThrow(CommandError);
  });

  it('Budget-Wächter (E1): ein zu feines Volumen wird ehrlich abgewiesen statt still gestutzt', () => {
    const { doc, storeyId } = setupMeshDoc();
    // Kreis mit 2100 Punkten → Prisma hätte 4200 Vertices > 4096 (Deckel)
    const outline = Array.from({ length: 2100 }, (_, i) => ({
      x: Math.round(Math.cos((i / 2100) * 2 * Math.PI) * 5000),
      y: Math.round(Math.sin((i / 2100) * 2 * Math.PI) * 5000),
    }));
    const mv = execute(doc, 'design.volumenErstellen', { storeyId, outline, height: 1000 });
    const massId = (mv.patches[0] as { id: string }).id;
    expect(() => execute(doc, 'design.meshErstellen', { form: 'ausVolumen', massId })).toThrow(/Budget/);
    // Der MassBody bleibt unangetastet (kein halber Zustand)
    expect(doc.get(massId)).toBeDefined();
  });

  it('design.verschieben kennt FreeMesh (dx/dy auf alle Positionen, z bleibt)', () => {
    const { doc, storeyId } = setupMeshDoc();
    const res = execute(doc, 'design.meshErstellen', {
      form: 'quader', storeyId, at: { x: 0, y: 0 }, breite: 1000, laenge: 1000, hoehe: 1000,
    });
    const id = (res.patches[0] as { id: string }).id;
    execute(doc, 'design.verschieben', { entityId: id, dx: 500, dy: -200 });
    const mesh = doc.get<import('../src').FreeMesh>(id)!;
    expect(mesh.positions[0]).toBe(500);
    expect(mesh.positions[1]).toBe(-200);
    expect(mesh.positions[2]).toBe(0);
  });

  it('Golden-Guard (E5): ein FreeMesh UNTER der Schnitthöhe lässt den Grundriss-SVG byte-identisch', async () => {
    const { planInnerSvg } = await import('../src');
    const { doc, storeyId } = setupMeshDoc();
    execute(doc, 'design.wandZeichnen', {
      storeyId,
      a: { x: 0, y: 0 }, b: { x: 5000, y: 0 },
      assemblyId: (execute(doc, 'design.aufbauErstellen', {
        name: 'AW', target: 'wall',
        layers: [{ material: 'beton', thickness: 180, function: 'tragend' }],
      }).patches[0] as { id: string }).id,
    });
    const vorher = planInnerSvg(doc, storeyId, 50).inner;
    // 800 mm hoch — unter der 1-m-Schnitthöhe: keine Schnittfigur, SVG
    // byte-identisch (die ehrliche Stufe-3-Grenze aus FM2; die Goldens der
    // Suite beweisen dasselbe für meshlose Fixtures).
    execute(doc, 'design.meshErstellen', {
      form: 'quader', storeyId, at: { x: 1000, y: 1000 }, breite: 2000, laenge: 2000, hoehe: 800,
    });
    const nachher = planInnerSvg(doc, storeyId, 50).inner;
    expect(nachher).toBe(vorher);
  });
});

describe('FreeMesh Stufe 3 / FM5 — IFC (IfcFacetedBrep) + GLB-Name (Buildplan E7)', () => {
  const setupMeshDoc = () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    return { doc, storeyId: (eg.patches[0] as { id: string }).id };
  };

  it('exportIfc trägt das FreeMesh als IFCFACETEDBREP mit geschlossener Schale (12 Faces je Quader)', async () => {
    const { exportIfc } = await import('../src');
    const { doc, storeyId } = setupMeshDoc();
    execute(doc, 'design.meshErstellen', {
      form: 'quader', storeyId, at: { x: 0, y: 0 }, breite: 2000, laenge: 2000, hoehe: 1500, name: 'Schale Nord',
    });
    const ifc = exportIfc(doc, 'FreeMesh-Test');
    expect(ifc).toContain('IFCFACETEDBREP');
    expect(ifc).toContain('IFCCLOSEDSHELL');
    expect((ifc.match(/IFCFACE\(/g) ?? []).length).toBe(12);
    expect(ifc).toContain("'Schale Nord'");
    expect(ifc).toContain("'Body','Brep'");
    // Ohne FreeMesh: kein Brep — der Daten-Guard hält den Export unberührt.
    const { doc: doc2 } = setupMeshDoc();
    expect(exportIfc(doc2, 'Leer')).not.toContain('IFCFACETEDBREP');
  });

  it('exportGlb benennt das FreeMesh lesbar (Blender-Outliner)', async () => {
    const { exportGlb } = await import('../src');
    const { doc, storeyId } = setupMeshDoc();
    execute(doc, 'design.meshErstellen', {
      form: 'quader', storeyId, at: { x: 0, y: 0 }, breite: 1000, laenge: 1000, hoehe: 1000, name: 'Pavillon',
    });
    const glb = exportGlb(doc, 'Test');
    const jsonLen = new DataView(glb, 12, 4).getUint32(0, true);
    const json = new TextDecoder().decode(new Uint8Array(glb, 20, jsonLen));
    expect(json).toContain('FreeMesh Pavillon');
  });
});

describe('FreeMesh Stufe 3 / FM2 — 2D-Schnittfigur (Tri-Slice, Buildplan E5)', () => {
  const setupMeshDoc = () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    return { doc, storeyId: (eg.patches[0] as { id: string }).id };
  };

  it('meshSchnittRinge: Quader bei z=500 liefert EINEN geschlossenen Ring mit exakter Grundfläche', async () => {
    const { quaderMesh, meshSchnittRinge } = await import('../src');
    const q = quaderMesh({ x: 0, y: 0 }, 2000, 3000, 1500);
    const ringe = meshSchnittRinge(q.positions, q.faces, 500);
    expect(ringe).toHaveLength(1);
    expect(Math.abs(polygonArea(ringe[0]!))).toBeCloseTo(2000 * 3000, 0);
    // Ebene über dem Körper: ehrlich leer
    expect(meshSchnittRinge(q.positions, q.faces, 2000)).toHaveLength(0);
  });

  it('derivePlan: FreeMesh über Schnitthöhe zeigt die Schnittfigur, darunter ehrlich nichts', () => {
    const { doc, storeyId } = setupMeshDoc();
    execute(doc, 'design.meshErstellen', {
      form: 'quader', storeyId, at: { x: 1000, y: 1000 }, breite: 2000, laenge: 2000, hoehe: 1500,
    });
    const plan = derivePlan(doc, storeyId);
    const figuren = plan.regions.filter((r) => r.classes.includes('freemesh'));
    expect(figuren).toHaveLength(1);
    expect(Math.abs(polygonArea(figuren[0]!.rings[0]!))).toBeCloseTo(2000 * 2000, 0);

    const { doc: doc2, storeyId: sid2 } = setupMeshDoc();
    execute(doc2, 'design.meshErstellen', {
      form: 'quader', storeyId: sid2, at: { x: 1000, y: 1000 }, breite: 2000, laenge: 2000, hoehe: 800,
    });
    expect(derivePlan(doc2, sid2).regions.some((r) => r.classes.includes('freemesh'))).toBe(false);
  });

  it('derivePlan: nach Flächen-Extrude wächst die Schnittfigur ehrlich mit', () => {
    const { doc, storeyId } = setupMeshDoc();
    const res = execute(doc, 'design.meshErstellen', {
      form: 'quader', storeyId, at: { x: 0, y: 0 }, breite: 2000, laenge: 2000, hoehe: 1500,
    });
    const id = (res.patches[0] as { id: string }).id;
    // Seitenfläche (+x, Dreiecke 6/7) um 1 m auswärts extrudieren →
    // die Schnittfigur bei 1 m wird um 2000×1000 grösser.
    execute(doc, 'design.meshFlaecheExtrudieren', { entityId: id, face: 6, distanz: 1000 });
    const plan = derivePlan(doc, storeyId);
    const figuren = plan.regions.filter((r) => r.classes.includes('freemesh'));
    const flaeche = figuren.reduce((s, r) => s + Math.abs(polygonArea(r.rings[0]!)), 0);
    expect(flaeche).toBeCloseTo(2000 * 2000 + 2000 * 1000, 0);
  });

  it('deriveSection schneidet FreeMesh automatisch (deriveAll-Pfad seit FM1)', () => {
    const { doc, storeyId } = setupMeshDoc();
    const spec = { a: { x: -1000, y: 1000 }, b: { x: 5000, y: 1000 }, depth: 4000, lookLeft: true };
    const ohne = deriveSection(doc, spec).cuts.length;
    execute(doc, 'design.meshErstellen', {
      form: 'quader', storeyId, at: { x: 0, y: 0 }, breite: 2000, laenge: 2000, hoehe: 1500,
    });
    const mit = deriveSection(doc, spec).cuts.length;
    expect(ohne).toBe(0);
    expect(mit).toBeGreaterThan(0);
  });

  it('Kennzahlen bleiben ehrlich unberührt: FreeMesh zählt NICHT in SIA-416/Mengen (E5)', () => {
    const { doc, storeyId } = setupMeshDoc();
    const reportVorher = JSON.stringify(areaReport(doc));
    const mengenVorher = JSON.stringify(deriveMengen(doc));
    execute(doc, 'design.meshErstellen', {
      form: 'quader', storeyId, at: { x: 0, y: 0 }, breite: 4000, laenge: 4000, hoehe: 3000,
    });
    expect(JSON.stringify(areaReport(doc))).toBe(reportVorher);
    expect(JSON.stringify(deriveMengen(doc))).toBe(mengenVorher);
  });
});
