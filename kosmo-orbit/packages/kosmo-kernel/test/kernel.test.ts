import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { testhausMitQuertrakt, ansichtSvg } from './fixtures';
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
