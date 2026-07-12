import type { KosmoDoc } from '../model/doc';
import { columnOutline, type Assembly, type Beam, type Column, type FreeMesh, type Furniture, type MassBody, type Slab, type Storey, type Wall, type Zone } from '../model/entities';
import { moebelGeometrie, moebelTyp } from '../derive/moebel';
import { beschlagTyp } from '../derive/beschlag';
import { dist } from '../model/units';
import { axisDirection, assemblyThickness, openingRects, wallFrame } from '../geometry/wall';

/**
 * IFC4-Export — eigener SPF-Writer (Owner-Q10).
 *
 * Definiertes Subset: Projektbaum (Project→Site→Building→Storeys),
 * IfcWall (SweptSolid mit Öffnungs-Voids), IfcSlab, IfcSpace (Zonen),
 * IfcBuildingElementProxy (Volumenstudien), Material pro Wand-Kernschicht.
 * Einheiten: Millimeter. Geometrie geschossrelativ platziert.
 * Validiert gegen ifcopenshell (CI-Orakel) und die HomeStation-Bridge.
 */

class SpfWriter {
  private lines: string[] = [];
  private counter = 0;

  add(type: string, args: string): string {
    const id = `#${++this.counter}`;
    this.lines.push(`${id}=${type}(${args});`);
    return id;
  }

  get count(): number {
    return this.counter;
  }

  body(): string {
    return this.lines.join('\n');
  }
}

const num = (v: number): string => {
  if (Number.isInteger(v)) return `${v}.`;
  return String(Math.round(v * 1000) / 1000);
};
const str = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
const list = (items: string[]): string => `(${items.join(',')})`;

/** 22-Zeichen-GlobalId (Base64-Variante der IFC-Spezifikation). */
function newGuid(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
  let out = '';
  for (let i = 0; i < 22; i++) out += chars[Math.floor(Math.random() * 64)];
  return out;
}

export function exportIfc(doc: KosmoDoc, projectName?: string): string {
  const w = new SpfWriter();
  const name = projectName ?? doc.settings.projectName;

  // Kontext + Einheiten (Millimeter)
  const origin = w.add('IFCCARTESIANPOINT', list([num(0), num(0), num(0)]));
  const zAxis = w.add('IFCDIRECTION', list([num(0), num(0), num(1)]));
  const xAxis = w.add('IFCDIRECTION', list([num(1), num(0), num(0)]));
  const worldPlace3d = w.add('IFCAXIS2PLACEMENT3D', `${origin},${zAxis},${xAxis}`);
  const context = w.add(
    'IFCGEOMETRICREPRESENTATIONCONTEXT',
    `$,'Model',3,1.E-05,${worldPlace3d},$`,
  );
  const bodyContext = w.add(
    'IFCGEOMETRICREPRESENTATIONSUBCONTEXT',
    `'Body','Model',*,*,*,*,${context},$,.MODEL_VIEW.,$`,
  );
  const mm = w.add('IFCSIUNIT', `*,.LENGTHUNIT.,.MILLI.,.METRE.`);
  const m2 = w.add('IFCSIUNIT', `*,.AREAUNIT.,$,.SQUARE_METRE.`);
  const m3 = w.add('IFCSIUNIT', `*,.VOLUMEUNIT.,$,.CUBIC_METRE.`);
  const units = w.add('IFCUNITASSIGNMENT', list([mm, m2, m3]));

  const project = w.add(
    'IFCPROJECT',
    `'${newGuid()}',$,${str(name)},$,$,$,$,${list([context])},${units}`,
  );

  const sitePlace = w.add('IFCLOCALPLACEMENT', `$,${worldPlace3d}`);
  const site = w.add('IFCSITE', `'${newGuid()}',$,'Parzelle',$,$,${sitePlace},$,$,.ELEMENT.,$,$,$,$,$`);
  const buildingPlace = w.add('IFCLOCALPLACEMENT', `${sitePlace},${worldPlace3d}`);
  const building = w.add(
    'IFCBUILDING',
    `'${newGuid()}',$,${str(name)},$,$,${buildingPlace},$,$,.ELEMENT.,$,$,$`,
  );
  w.add('IFCRELAGGREGATES', `'${newGuid()}',$,$,$,${project},${list([site])}`);
  w.add('IFCRELAGGREGATES', `'${newGuid()}',$,$,$,${site},${list([building])}`);

  const placement3dAt = (z: number): string => {
    const p = w.add('IFCCARTESIANPOINT', list([num(0), num(0), num(z)]));
    return w.add('IFCAXIS2PLACEMENT3D', `${p},${zAxis},${xAxis}`);
  };

  // Geschosse
  const storeys = doc.storeysOrdered() as Storey[];
  const storeyIfc = new Map<string, { id: string; placement: string; elements: string[] }>();
  const storeyIds: string[] = [];
  for (const s of storeys) {
    const place = w.add('IFCLOCALPLACEMENT', `${buildingPlace},${placement3dAt(s.elevation)}`);
    const id = w.add(
      'IFCBUILDINGSTOREY',
      `'${newGuid()}',$,${str(s.name)},$,$,${place},$,$,.ELEMENT.,${num(s.elevation)}`,
    );
    storeyIfc.set(s.id, { id, placement: place, elements: [] });
    storeyIds.push(id);
  }
  if (storeyIds.length > 0) {
    w.add('IFCRELAGGREGATES', `'${newGuid()}',$,$,$,${building},${list(storeyIds)}`);
  }

  // Profil aus Polygon (lokale XY-Koordinaten)
  const profileOf = (outline: readonly { x: number; y: number }[]): string => {
    const pts = outline.map((p) => w.add('IFCCARTESIANPOINT', list([num(p.x), num(p.y)])));
    const poly = w.add('IFCPOLYLINE', list([...pts, pts[0]!]));
    return w.add('IFCARBITRARYCLOSEDPROFILEDEF', `.AREA.,$,${poly}`);
  };

  const extrudedSolid = (profile: string, zBase: number, height: number): string => {
    return w.add(
      'IFCEXTRUDEDAREASOLID',
      `${profile},${placement3dAt(zBase)},${zAxis},${num(height)}`,
    );
  };

  const bodyShape = (solid: string): string => {
    const rep = w.add('IFCSHAPEREPRESENTATION', `${bodyContext},'Body','SweptSolid',${list([solid])}`);
    return w.add('IFCPRODUCTDEFINITIONSHAPE', `$,$,${list([rep])}`);
  };

  const materials = new Map<string, string>();
  const materialOf = (key: string): string => {
    let m = materials.get(key);
    if (!m) {
      m = w.add('IFCMATERIAL', `${str(key)},$,$`);
      materials.set(key, m);
    }
    return m;
  };

  // Umbau-Status als PropertySet (SIA-Umbau: Bestand/Neu/Abbruch)
  const renovationPset = (elementId: string, ren?: string): void => {
    if (!ren) return;
    const prop = w.add('IFCPROPERTYSINGLEVALUE', `'Renovation',$,IFCLABEL(${str(ren)}),$`);
    const pset = w.add('IFCPROPERTYSET', `'${newGuid()}',$,'Pset_KosmoUmbau',$,${list([prop])}`);
    w.add('IFCRELDEFINESBYPROPERTIES', `'${newGuid()}',$,$,$,${list([elementId])},${pset}`);
  };

  // Wände (+ Öffnungs-Voids)
  for (const wall of doc.byKind<Wall>('wall')) {
    const storey = storeyIfc.get(wall.storeyId);
    const storeyEnt = doc.get<Storey>(wall.storeyId);
    const assembly = doc.get<Assembly>(wall.assemblyId);
    if (!storey || !storeyEnt || !assembly || assembly.kind !== 'assembly') continue;

    const t = assemblyThickness(assembly);
    const frame = wallFrame(wall, assembly);
    const d = axisDirection(wall);
    const n = { x: -d.y, y: d.x };
    const length = Math.round(dist(wall.a, wall.b));
    const height =
      wall.heightMode === 'fix' && wall.height ? wall.height : storeyEnt.height - wall.baseOffset;

    // Lokales System: Ursprung = Punkt a (geschossrelativ), x entlang Achse
    const lp = w.add(
      'IFCCARTESIANPOINT',
      list([num(wall.a.x), num(wall.a.y), num(wall.baseOffset)]),
    );
    const lx = w.add('IFCDIRECTION', list([num(d.x), num(d.y), num(0)]));
    const lplace3d = w.add('IFCAXIS2PLACEMENT3D', `${lp},${zAxis},${lx}`);
    const place = w.add('IFCLOCALPLACEMENT', `${storey.placement},${lplace3d}`);

    // Profil in lokalen Koordinaten: x 0..L, y quer (−offsetRight..offsetLeft)
    const prof = profileOf([
      { x: 0, y: frame.offsetLeft },
      { x: length, y: frame.offsetLeft },
      { x: length, y: -frame.offsetRight },
      { x: 0, y: -frame.offsetRight },
    ]);
    const solid = extrudedSolid(prof, 0, height);
    const wallId = w.add(
      'IFCWALL',
      `'${newGuid()}',$,${str(wall.meta?.name ?? 'Wand')},$,$,${place},${bodyShape(solid)},$,.SOLIDWALL.`,
    );
    storey.elements.push(wallId);
    renovationPset(wallId, wall.meta?.renovation);

    const core = assembly.layers.find((l) => l.function === 'tragend') ?? assembly.layers[0];
    if (core) {
      w.add(
        'IFCRELASSOCIATESMATERIAL',
        `'${newGuid()}',$,$,$,${list([wallId])},${materialOf(core.material)}`,
      );
    }
    void t;
    void n;

    // Öffnungen als Voids (lokal zur Wand platziert)
    for (const r of openingRects(wall, doc.openingsOf(wall.id))) {
      const oProf = profileOf([
        { x: r.s0, y: frame.offsetLeft + 10 },
        { x: r.s1, y: frame.offsetLeft + 10 },
        { x: r.s1, y: -frame.offsetRight - 10 },
        { x: r.s0, y: -frame.offsetRight - 10 },
      ]);
      const oSolid = extrudedSolid(oProf, r.z0, r.z1 - r.z0);
      const oPlace = w.add('IFCLOCALPLACEMENT', `${place},${worldPlace3d}`);
      const opening = w.add(
        'IFCOPENINGELEMENT',
        `'${newGuid()}',$,${str(r.opening.openingType === 'tuer' ? 'Tür' : 'Fenster')},$,$,${oPlace},${bodyShape(oSolid)},$,.OPENING.`,
      );
      w.add('IFCRELVOIDSELEMENT', `'${newGuid()}',$,$,$,${wallId},${opening}`);
      renovationPset(opening, r.opening.meta?.renovation);

      // Beschlag-Katalog S2 (v0.7.5 Welle 1 A1, `Opening.beschlaege`): je
      // zugewiesenem Beschlag ein IFCDISCRETEACCESSORY (Möbel-Loop oben als
      // 1:1-Vorlage), platziert an der Öffnungsmitte (Achse s, mittlere
      // Höhe des Öffnungsrechtecks) — lokal zur Wand wie der Void selbst,
      // darum dieselbe lokale x-Richtung `lx`. Kleiner Platzhalter-Würfel
      // (40×40×20mm) statt echter Beschlaggeometrie — der Katalog liefert
      // nur ein 2D-Plan-Piktogramm (`beschlagSymbol`), keine 3D-Form.
      for (const key of r.opening.beschlaege ?? []) {
        const typ = beschlagTyp(key);
        if (!typ) continue; // kann nicht vorkommen — der Command validiert bereits gegen den Katalog
        const sMitte = (r.s0 + r.s1) / 2;
        const zMitte = (r.z0 + r.z1) / 2;
        const accPoint = w.add('IFCCARTESIANPOINT', list([num(sMitte), num(0), num(zMitte)]));
        const accAxis = w.add('IFCAXIS2PLACEMENT3D', `${accPoint},${zAxis},${lx}`);
        const accPlace = w.add('IFCLOCALPLACEMENT', `${place},${accAxis}`);
        const accProfile = profileOf([
          { x: -20, y: -20 },
          { x: 20, y: -20 },
          { x: 20, y: 20 },
          { x: -20, y: 20 },
        ]);
        const accSolid = extrudedSolid(accProfile, 0, 20);
        const acc = w.add(
          typ.ifcTyp,
          `'${newGuid()}',$,${str(typ.name)},$,$,${accPlace},${bodyShape(accSolid)},$`,
        );
        storey.elements.push(acc);
      }
    }
  }

  // Decken
  for (const slab of doc.byKind<Slab>('slab')) {
    const storey = storeyIfc.get(slab.storeyId);
    if (!storey || slab.outline.length < 3) continue;
    const place = w.add('IFCLOCALPLACEMENT', `${storey.placement},${worldPlace3d}`);
    const solid = extrudedSolid(profileOf(slab.outline), slab.topOffset - slab.thickness, slab.thickness);
    const slabId = w.add(
      'IFCSLAB',
      `'${newGuid()}',$,${str(slab.meta?.name ?? 'Decke')},$,$,${place},${bodyShape(solid)},$,.FLOOR.`,
    );
    storey.elements.push(slabId);
    renovationPset(slabId, slab.meta?.renovation);
  }

  // Stützen + Unterzüge (A3): echte IFC-Klassen für den Skelettbau
  for (const c of doc.byKind<Column>('column')) {
    const storey = storeyIfc.get(c.storeyId);
    const storeyEnt = doc.get<Storey>(c.storeyId);
    if (!storey || !storeyEnt) continue;
    const place = w.add('IFCLOCALPLACEMENT', `${storey.placement},${worldPlace3d}`);
    const solid = extrudedSolid(profileOf(columnOutline(c)), 0, storeyEnt.height);
    const colId = w.add(
      'IFCCOLUMN',
      `'${newGuid()}',$,${str(c.meta?.name ?? 'Stütze')},$,$,${place},${bodyShape(solid)},$,.COLUMN.`,
    );
    storey.elements.push(colId);
    renovationPset(colId, c.meta?.renovation);
    w.add('IFCRELASSOCIATESMATERIAL', `'${newGuid()}',$,$,$,${list([colId])},${materialOf(c.material)}`);
  }
  for (const bm of doc.byKind<Beam>('beam')) {
    const storey = storeyIfc.get(bm.storeyId);
    const storeyEnt = doc.get<Storey>(bm.storeyId);
    if (!storey || !storeyEnt) continue;
    const len = dist(bm.a, bm.b);
    if (len < 1) continue;
    const d = { x: (bm.b.x - bm.a.x) / len, y: (bm.b.y - bm.a.y) / len };
    const n = { x: -d.y, y: d.x };
    const h = bm.breite / 2;
    const place = w.add('IFCLOCALPLACEMENT', `${storey.placement},${worldPlace3d}`);
    const solid = extrudedSolid(
      profileOf([
        { x: bm.a.x - n.x * h, y: bm.a.y - n.y * h },
        { x: bm.b.x - n.x * h, y: bm.b.y - n.y * h },
        { x: bm.b.x + n.x * h, y: bm.b.y + n.y * h },
        { x: bm.a.x + n.x * h, y: bm.a.y + n.y * h },
      ]),
      storeyEnt.height - bm.hoehe,
      bm.hoehe,
    );
    const beamId = w.add(
      'IFCBEAM',
      `'${newGuid()}',$,${str(bm.meta?.name ?? 'Unterzug')},$,$,${place},${bodyShape(solid)},$,.BEAM.`,
    );
    storey.elements.push(beamId);
    renovationPset(beamId, bm.meta?.renovation);
    w.add('IFCRELASSOCIATESMATERIAL', `'${newGuid()}',$,$,$,${list([beamId])},${materialOf(bm.material)}`);
  }

  // Zonen als IfcSpace
  for (const zone of doc.byKind<Zone>('zone')) {
    const storey = storeyIfc.get(zone.storeyId);
    const storeyEnt = doc.get<Storey>(zone.storeyId);
    if (!storey || !storeyEnt || zone.outline.length < 3) continue;
    const place = w.add('IFCLOCALPLACEMENT', `${storey.placement},${worldPlace3d}`);
    const solid = extrudedSolid(profileOf(zone.outline), 0, storeyEnt.height);
    const space = w.add(
      'IFCSPACE',
      `'${newGuid()}',$,${str(zone.name)},${str(`SIA ${zone.sia}`)},$,${place},${bodyShape(solid)},$,.ELEMENT.,.INTERNAL.,$`,
    );
    storey.elements.push(space);
  }

  // Volumenstudien als Proxy
  for (const mass of doc.byKind<MassBody>('mass')) {
    const storey = storeyIfc.get(mass.storeyId);
    if (!storey || mass.outline.length < 3) continue;
    const place = w.add('IFCLOCALPLACEMENT', `${storey.placement},${worldPlace3d}`);
    const solid = extrudedSolid(profileOf(mass.outline), mass.baseOffset, mass.height);
    const proxy = w.add(
      'IFCBUILDINGELEMENTPROXY',
      `'${newGuid()}',$,${str(mass.program ?? 'Volumen')},$,$,${place},${bodyShape(solid)},$,$`,
    );
    storey.elements.push(proxy);
  }

  // FreeMesh als IFCFACETEDBREP (Block 3 / FM5, Buildplan E7): die freie
  // Geometrie geht als echter B-Rep in den IFC — jedes Dreieck eine IFCFACE,
  // alle im IFCCLOSEDSHELL (die mesh-topo-Tests beweisen Wasserdichtheit).
  // Punkte in mm, z geschoss-relativ — die Platzierung hängt am Geschoss,
  // exakt wie bei den MassBody-Extrusionen oben. Live gegen ifcopenshell
  // validiert (FM5) — keine still gelassene Export-Lücke.
  for (const m of doc.byKind<FreeMesh>('freemesh')) {
    const storey = storeyIfc.get(m.storeyId);
    if (!storey || m.faces.length < 3) continue;
    const place = w.add('IFCLOCALPLACEMENT', `${storey.placement},${worldPlace3d}`);
    const punkte: string[] = [];
    for (let i = 0; i * 3 < m.positions.length; i++) {
      punkte.push(
        w.add(
          'IFCCARTESIANPOINT',
          list([num(m.positions[i * 3]!), num(m.positions[i * 3 + 1]!), num(m.positions[i * 3 + 2]!)]),
        ),
      );
    }
    const flaechen: string[] = [];
    for (let f = 0; f * 3 < m.faces.length; f++) {
      const loop = w.add(
        'IFCPOLYLOOP',
        list([punkte[m.faces[f * 3]!]!, punkte[m.faces[f * 3 + 1]!]!, punkte[m.faces[f * 3 + 2]!]!]),
      );
      const bound = w.add('IFCFACEOUTERBOUND', `${loop},.T.`);
      flaechen.push(w.add('IFCFACE', list([bound])));
    }
    const shell = w.add('IFCCLOSEDSHELL', list(flaechen));
    const brep = w.add('IFCFACETEDBREP', shell);
    const rep = w.add('IFCSHAPEREPRESENTATION', `${bodyContext},'Body','Brep',${list([brep])}`);
    const shape = w.add('IFCPRODUCTDEFINITIONSHAPE', `$,$,${list([rep])}`);
    const proxy = w.add(
      'IFCBUILDINGELEMENTPROXY',
      `'${newGuid()}',$,${str(m.name ?? 'FreeMesh')},$,$,${place},${shape},$,$`,
    );
    storey.elements.push(proxy);
  }

  // Möbel als IFCFURNISHINGELEMENT (Korpus-Extrusion 750 mm, Bonus-Block)
  for (const f of doc.byKind<Furniture>('furniture')) {
    const storey = storeyIfc.get(f.storeyId);
    const g = moebelGeometrie(f);
    if (!storey || !g) continue;
    const place = w.add('IFCLOCALPLACEMENT', `${storey.placement},${worldPlace3d}`);
    const solid = extrudedSolid(profileOf(g.korpus), 0, 750);
    const el = w.add(
      'IFCFURNISHINGELEMENT',
      `'${newGuid()}',$,${str(moebelTyp(f.typ)?.name ?? f.typ)},$,$,${place},${bodyShape(solid)},$`,
    );
    storey.elements.push(el);
  }

  // Enthaltensein pro Geschoss
  for (const { id, elements } of storeyIfc.values()) {
    if (elements.length > 0) {
      w.add(
        'IFCRELCONTAINEDINSPATIALSTRUCTURE',
        `'${newGuid()}',$,$,$,${list(elements)},${id}`,
      );
    }
  }

  const now = new Date().toISOString().slice(0, 19);
  return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION((''),'2;1');
FILE_NAME(${str(name + '.ifc')},'${now}',(''),(''),'KosmoOrbit V1','KosmoOrbit V1','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
${w.body()}
ENDSEC;
END-ISO-10303-21;
`;
}
