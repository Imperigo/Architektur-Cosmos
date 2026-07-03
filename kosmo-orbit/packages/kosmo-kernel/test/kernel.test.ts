import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { testhausMitQuertrakt, ansichtSvg } from './fixtures';
import { deriveBerechnungsliste } from '../src/derive/berechnungsliste';
import { deriveMengen } from '../src/derive/mengen';
import { generiereStuetzenraster } from '../src/derive/stuetzenraster';
import { deriveAxo } from '../src/derive/axo';
import { generiereVolumenstudien } from '../src/derive/volumenstudie';
import { erkenneDecke, erkenneWand, geschossZu } from '../src/derive/bestand';
import { fluchtwege, raumGraph } from '../src/derive/raumgraph';
import { ZONENREGEL_KATALOG } from '../src/model/zonenregeln';
import { variantenMatrix } from '../src/derive/variantenmatrix';
import { segmentiere, sollMix } from '../src/derive/segmentierer';
import { polygonArea } from '../src/model/units';
import { pruefeGrundriss } from '../src/derive/checks';
import {
  KosmoDoc,
  History,
  execute,
  invertPatches,
  deriveAll,
  deriveSection,
  deriveEntity,
  union,
  thickenPolyline,
  wallOutline,
  polygonArea,
  schraffurFuer,
  schraffurLinien,
  sheetToSvg,
  CommandError,
  fangKandidaten,
  magnetFang,
  derivePlan,
  deriveDimensions,
  treppenTeile,
  pruefeGrundriss,
  dimensionLabel,
  sectionInnerSvg,
  type Storey,
  type Wall,
  type Assembly,
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
    expect(svg).toContain('Grundriss EG');
    expect(svg).toContain('1:100');
    expect(svg).toContain('Blatt 1 · A1');

    const pid = sheet.placements[0]!.id;
    execute(doc, 'publish.ansichtVerschieben', { sheetId, placementId: pid, x: 300, y: 300 });
    expect(doc.get<import('../src').Sheet>(sheetId)!.placements[0]!.x).toBe(300);
    execute(doc, 'publish.ansichtEntfernen', { sheetId, placementId: pid });
    expect(doc.get<import('../src').Sheet>(sheetId)!.placements).toHaveLength(1);
  });

  it('DXF-Export: gültige Struktur, Layer, Polylinien und Bemassungstexte', async () => {
    const { exportDxf } = await import('../src');
    const { doc, storeyId } = setupWithWalls();
    execute(doc, 'design.oeffnungSetzen', {
      wallId: doc.byKind<Wall>('wall')[0]!.id,
      openingType: 'fenster', center: 3000, width: 2000, height: 1500, sill: 900,
    });
    const dxf = exportDxf(doc, storeyId);
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('ENTITIES');
    expect(dxf).toContain('KOSMO-WAND');
    expect(dxf).toContain('KOSMO-BEMASSUNG');
    expect(dxf).toContain('LWPOLYLINE');
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
    const golden = readFileSync(new URL('./golden/grundriss-testhaus.svg', import.meta.url), 'utf8');
    expect(svg).toBe(golden);
    // Bewusste Plan-Änderungen: Golden neu erzeugen und im Diff begutachten.
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
    const golden = readFileSync(new URL('./golden/ansicht-sued-testhaus.svg', import.meta.url), 'utf8');
    expect(svg).toBe(golden);
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
    expect(svg).toContain('Haus am Hang');
    expect(svg).toContain('Wettbewerb 2026');
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
    // vorprojekt: ein Face, einheitliches Grau
    execute(doc, 'design.phaseSetzen', { phase: 'vorprojekt' });
    expect(deriveSection(doc, spec).faces).toHaveLength(1);
    expect(sectionInnerSvg(doc, spec, 100).inner).toContain('#d7d4ce');
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
    // Plansymbol: zwei Lauf-Rechtecke + Podest-Region, Stufen in beiden Läufen
    const plan = derivePlan(doc, storeyId);
    const treppenRegionen = plan.regions.filter((r) => r.classes.includes('treppe'));
    expect(treppenRegionen).toHaveLength(3); // 2 Läufe + Podest
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
    const aufbau = doc.byKind<{ id: string; kind: string }>('assembly' as never)[0]!;
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
