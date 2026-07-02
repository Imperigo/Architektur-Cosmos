import { describe, expect, it } from 'vitest';
import {
  KosmoDoc,
  History,
  execute,
  invertPatches,
  deriveAll,
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
