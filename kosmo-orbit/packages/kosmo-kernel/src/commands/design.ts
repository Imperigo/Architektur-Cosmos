import { z } from 'zod';
import { newId } from '../model/ids';
import type { Assembly, Opening, Slab, Storey, Wall, MassBody, Zone, Roof } from '../model/entities';
import type { AnyPatch, KosmoDoc } from '../model/doc';
import { formatLength, type Pt } from '../model/units';
import { CommandError, registerCommand } from './core';
import { isConvex } from '../geometry/skeleton';

/**
 * Design-Commands — die täglichen Werkzeuge (ArchiCAD-Essenz).
 * Jedes zod-Schema ist zugleich das LLM-Tool-Schema: flach, deutsch
 * beschrieben, ohne verschachtelte Unions (lokale Modelle!).
 */

const PtSchema = z.object({
  x: z.number().int().describe('X in Millimetern'),
  y: z.number().int().describe('Y in Millimetern'),
});

function added(e: import('../model/entities').Entity): AnyPatch {
  return { id: e.id, before: null, after: e };
}

function require<T extends import('../model/entities').Entity>(
  doc: KosmoDoc,
  id: string,
  kind: T['kind'],
): T {
  const e = doc.get(id);
  if (!e || e.kind !== kind) {
    throw new CommandError(`${kind} «${id}» existiert nicht`);
  }
  return e as T;
}

export const createStorey = registerCommand({
  id: 'design.geschossErstellen',
  title: 'Geschoss erstellen',
  description:
    'Erstellt ein neues Geschoss. index: 0 = EG, 1 = 1.OG, -1 = 1.UG. elevation = OK fertig Boden über Projektnull in mm, height = Geschosshöhe OK–OK in mm.',
  params: z.object({
    name: z.string().describe('Name, z.B. «EG» oder «1.OG»'),
    index: z.number().int(),
    elevation: z.number().int().describe('OK Boden über Projektnull, mm'),
    height: z.number().int().positive().default(2800).describe('Geschosshöhe OK–OK, mm'),
  }),
  summarize: (p) => `Geschoss ${p.name} auf ${formatLength(p.elevation)}`,
  run: (doc, p) => {
    const storey: Storey = {
      id: newId('geschoss'),
      kind: 'storey',
      name: p.name,
      index: p.index,
      elevation: p.elevation,
      height: p.height,
      cutHeight: 1100,
    };
    return [added(storey)];
  },
});

export const createAssembly = registerCommand({
  id: 'design.aufbauErstellen',
  title: 'Aufbau erstellen',
  description:
    'Erstellt einen mehrschichtigen Bauteilaufbau (Wand/Decke/Dach) für den Typenkatalog. Schichten von aussen/oben nach innen/unten, Dicken in mm.',
  params: z.object({
    name: z.string().describe('z.B. «AW Beton 36» oder «Flachdach warm»'),
    target: z.enum(['wall', 'slab', 'roof']),
    layers: z
      .array(
        z.object({
          material: z.string().describe('Materialschlüssel, z.B. «beton», «daemmung-mw»'),
          thickness: z.number().int().positive().describe('mm'),
          function: z.enum(['tragend', 'daemmung', 'bekleidung', 'dichtung', 'hohlraum']),
        }),
      )
      .min(1),
  }),
  summarize: (p) =>
    `Aufbau «${p.name}» (${p.layers.reduce((s, l) => s + l.thickness, 0)} mm, ${p.layers.length} Schichten)`,
  run: (doc, p) => {
    const assembly: Assembly = {
      id: newId('aufbau'),
      kind: 'assembly',
      name: p.name,
      target: p.target,
      layers: p.layers,
    };
    return [added(assembly)];
  },
});

export const createWall = registerCommand({
  id: 'design.wandZeichnen',
  title: 'Wand zeichnen',
  description:
    'Zeichnet eine Wand von Punkt a nach Punkt b im angegebenen Geschoss mit einem Aufbau aus dem Typenkatalog. Höhe standardmässig bis OK des Geschosses.',
  params: z.object({
    storeyId: z.string(),
    a: PtSchema,
    b: PtSchema,
    assemblyId: z.string(),
    alignment: z.enum(['zentrum', 'kern-aussen', 'kern-innen']).default('zentrum'),
  }),
  summarize: (p) => {
    const len = Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y);
    return `Wand ${formatLength(Math.round(len))}`;
  },
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const assembly = require<Assembly>(doc, p.assemblyId, 'assembly');
    if (assembly.target !== 'wall') {
      throw new CommandError(`Aufbau «${assembly.name}» ist kein Wandaufbau`);
    }
    if (p.a.x === p.b.x && p.a.y === p.b.y) {
      throw new CommandError('Wand hat Länge 0');
    }
    const wall: Wall = {
      id: newId('wand'),
      kind: 'wall',
      storeyId: p.storeyId,
      a: p.a as Pt,
      b: p.b as Pt,
      assemblyId: p.assemblyId,
      alignment: p.alignment,
      heightMode: 'geschoss',
      baseOffset: 0,
    };
    return [added(wall)];
  },
});

export const createSlab = registerCommand({
  id: 'design.deckeZeichnen',
  title: 'Decke zeichnen',
  description:
    'Erstellt eine Decke/Bodenplatte mit Polygon-Umriss im Geschoss. Die Oberkante liegt auf OK Boden des Geschosses (topOffset 0), Dicke nach unten.',
  params: z.object({
    storeyId: z.string(),
    outline: z.array(PtSchema).min(3),
    thickness: z.number().int().positive().default(250).describe('mm'),
  }),
  summarize: (p) => `Decke mit ${p.outline.length} Eckpunkten, d = ${p.thickness} mm`,
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const slab: Slab = {
      id: newId('decke'),
      kind: 'slab',
      storeyId: p.storeyId,
      outline: p.outline as Pt[],
      thickness: p.thickness,
      topOffset: 0,
    };
    return [added(slab)];
  },
});

export const addOpening = registerCommand({
  id: 'design.oeffnungSetzen',
  title: 'Fenster/Tür setzen',
  description:
    'Setzt ein Fenster oder eine Tür in eine Wand. center = Abstand vom Wandanfang (Punkt a) zur Öffnungsmitte entlang der Achse in mm. sill = Brüstungshöhe (bei Türen 0).',
  params: z.object({
    wallId: z.string(),
    openingType: z.enum(['fenster', 'tuer']),
    center: z.number().int().nonnegative().describe('mm ab Wandanfang'),
    width: z.number().int().positive().default(1200),
    height: z.number().int().positive().default(1500),
    sill: z.number().int().nonnegative().default(900).describe('Brüstung mm; Türen: 0'),
    swing: z.enum(['links', 'rechts']).optional(),
  }),
  summarize: (p) =>
    `${p.openingType === 'tuer' ? 'Tür' : 'Fenster'} ${p.width}×${p.height} bei ${formatLength(p.center)}`,
  run: (doc, p) => {
    const wall = require<Wall>(doc, p.wallId, 'wall');
    const len = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y);
    if (p.center - p.width / 2 < 0 || p.center + p.width / 2 > len) {
      throw new CommandError(
        `Öffnung ragt über die Wand hinaus (Wandlänge ${formatLength(Math.round(len))})`,
      );
    }
    const sill = p.openingType === 'tuer' ? 0 : p.sill;
    const opening: Opening = {
      id: newId('oeffnung'),
      kind: 'opening',
      wallId: p.wallId,
      openingType: p.openingType,
      center: p.center,
      width: p.width,
      height: p.height,
      sill,
      ...(p.swing ? { swing: p.swing } : {}),
    };
    return [added(opening)];
  },
});

export const createMass = registerCommand({
  id: 'design.volumenErstellen',
  title: 'Volumenkörper erstellen',
  description:
    'Erstellt einen Volumenkörper für Volumenstudien (Vorform-Stil): Polygon-Grundfläche + Höhe. Für schnelle Massenstudien in der Wettbewerbsphase.',
  params: z.object({
    storeyId: z.string(),
    outline: z.array(PtSchema).min(3),
    height: z.number().int().positive().describe('mm'),
    program: z.string().optional().describe('Nutzung, z.B. «wohnen», «gewerbe»'),
  }),
  summarize: (p) => `Volumen ${formatLength(p.height)} hoch (${p.program ?? 'ohne Nutzung'})`,
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const mass: MassBody = {
      id: newId('volumen'),
      kind: 'mass',
      storeyId: p.storeyId,
      outline: p.outline as Pt[],
      height: p.height,
      baseOffset: 0,
      ...(p.program ? { program: p.program } : {}),
    };
    return [added(mass)];
  },
});

export const moveEntity = registerCommand({
  id: 'design.verschieben',
  title: 'Element verschieben',
  description: 'Verschiebt ein Element um dx/dy in mm (Wände, Decken, Volumen, Zonen).',
  params: z.object({
    entityId: z.string(),
    dx: z.number().int(),
    dy: z.number().int(),
  }),
  summarize: (p) => `Verschieben um ${p.dx}/${p.dy} mm`,
  run: (doc, p) => {
    const e = doc.get(p.entityId);
    if (!e) throw new CommandError(`Element «${p.entityId}» existiert nicht`);
    const shift = (pts: readonly Pt[]) => pts.map((q) => ({ x: q.x + p.dx, y: q.y + p.dy }));
    let after: import('../model/entities').Entity;
    switch (e.kind) {
      case 'wall':
        after = { ...e, a: { x: e.a.x + p.dx, y: e.a.y + p.dy }, b: { x: e.b.x + p.dx, y: e.b.y + p.dy } };
        break;
      case 'slab':
        after = e.holes
          ? { ...e, outline: shift(e.outline), holes: e.holes.map(shift) }
          : { ...e, outline: shift(e.outline) };
        break;
      case 'mass':
      case 'zone':
        after = { ...e, outline: shift(e.outline) };
        break;
      default:
        throw new CommandError(`«${e.kind}» kann nicht verschoben werden`);
    }
    return [{ id: e.id, before: e, after }];
  },
});

export const deleteEntity = registerCommand({
  id: 'design.loeschen',
  title: 'Element löschen',
  description:
    'Löscht ein Element. Abhängige Elemente (z.B. Öffnungen einer Wand) werden mitgelöscht.',
  params: z.object({ entityId: z.string() }),
  summarize: () => 'Element löschen',
  run: (doc, p) => {
    const e = doc.get(p.entityId);
    if (!e) throw new CommandError(`Element «${p.entityId}» existiert nicht`);
    const patches: AnyPatch[] = [];
    if (e.kind === 'wall') {
      for (const o of doc.openingsOf(e.id)) patches.push({ id: o.id, before: o, after: null });
    }
    patches.push({ id: e.id, before: e, after: null });
    return patches;
  },
});

export const createZone = registerCommand({
  id: 'design.zoneErstellen',
  title: 'Zone/Raum erstellen',
  description:
    'Erstellt eine Zone (Raum) mit Polygon-Umriss und SIA-416-Klasse: HNF (Hauptnutzfläche), NNF (Nebennutzfläche), VF (Verkehrsfläche), FF (Funktionsfläche), KF (Konstruktionsfläche). Flächen fliessen live in die Kennzahlen.',
  params: z.object({
    storeyId: z.string(),
    outline: z.array(PtSchema).min(3),
    name: z.string().describe('Raumname, z.B. «Wohnen» oder «Treppenhaus»'),
    sia: z.enum(['HNF', 'NNF', 'VF', 'FF', 'KF']).default('HNF'),
    program: z.string().optional().describe('Raumprogramm-Kategorie, z.B. «marktgerecht»'),
  }),
  summarize: (p) => `Zone «${p.name}» (${p.sia})`,
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const zone: Zone = {
      id: newId('zone'),
      kind: 'zone',
      storeyId: p.storeyId,
      outline: p.outline as Pt[],
      name: p.name,
      sia: p.sia,
      ...(p.program ? { program: p.program } : {}),
    };
    return [added(zone)];
  },
});

export const createRoof = registerCommand({
  id: 'design.dachErstellen',
  title: 'Walmdach erstellen',
  description:
    'Erstellt ein Walmdach über einem konvexen Polygon-Grundriss. pitch = Dachneigung in Grad (Standard 35), overhang = Dachüberstand in mm (Standard 500). Die Traufe liegt auf OK des Geschosses.',
  params: z.object({
    storeyId: z.string(),
    outline: z.array(PtSchema).min(3),
    pitch: z.number().min(5).max(75).default(35),
    overhang: z.number().int().nonnegative().default(500),
  }),
  summarize: (p) => `Walmdach ${p.pitch}° über ${p.outline.length} Eckpunkten`,
  run: (doc, p) => {
    const storey = require<Storey>(doc, p.storeyId, 'storey');
    if (!isConvex(p.outline as Pt[])) {
      throw new CommandError('Walmdach V1 braucht einen konvexen Grundriss (keine einspringenden Ecken)');
    }
    const roof: Roof = {
      id: newId('dach'),
      kind: 'roof',
      storeyId: p.storeyId,
      outline: p.outline as Pt[],
      pitch: p.pitch,
      overhang: p.overhang,
      baseOffset: storey.height,
    };
    return [added(roof)];
  },
});

const editableFields = [
  'name',
  'sia',
  'program',
  'pitch',
  'overhang',
  'height',
  'thickness',
  'assemblyId',
  'alignment',
  'center',
  'width',
  'sill',
  'swing',
  'openingType',
] as const;

export const setProperty = registerCommand({
  id: 'design.eigenschaftSetzen',
  title: 'Eigenschaft ändern',
  description:
    'Ändert eine Eigenschaft eines Elements. Felder je nach Typ: Zone(name, sia, program) · Dach(pitch, overhang) · Volumen(height, program) · Decke(thickness) · Wand(assemblyId, alignment) · Öffnung(center, width, height, sill, swing, openingType). Zahlen in mm (pitch in Grad).',
  params: z.object({
    entityId: z.string(),
    feld: z.enum(editableFields),
    wert: z.union([z.string(), z.number()]),
  }),
  summarize: (p) => `${p.feld} → ${p.wert}`,
  run: (doc, p) => {
    const e = doc.get(p.entityId);
    if (!e) throw new CommandError(`Element «${p.entityId}» existiert nicht`);
    const allowed: Record<string, readonly string[]> = {
      zone: ['name', 'sia', 'program'],
      roof: ['pitch', 'overhang'],
      mass: ['height', 'program'],
      slab: ['thickness'],
      wall: ['assemblyId', 'alignment', 'height'],
      opening: ['center', 'width', 'height', 'sill', 'swing', 'openingType'],
      storey: ['name', 'height'],
      assembly: ['name'],
    };
    const fields = allowed[e.kind] ?? [];
    if (!fields.includes(p.feld)) {
      throw new CommandError(
        `«${p.feld}» ist bei ${e.kind} nicht änderbar (möglich: ${fields.join(', ') || 'nichts'})`,
      );
    }
    const numeric = ['pitch', 'overhang', 'height', 'thickness', 'center', 'width', 'sill'];
    let wert: string | number = p.wert;
    if (numeric.includes(p.feld)) {
      wert = typeof p.wert === 'number' ? p.wert : Number(p.wert);
      if (!Number.isFinite(wert) || wert < 0) throw new CommandError(`«${p.wert}» ist keine gültige Zahl`);
      if (p.feld !== 'pitch') wert = Math.round(wert);
    }
    if (p.feld === 'sia' && !['HNF', 'NNF', 'VF', 'FF', 'KF'].includes(String(wert))) {
      throw new CommandError('sia muss HNF, NNF, VF, FF oder KF sein');
    }
    if (p.feld === 'assemblyId') require<Assembly>(doc, String(wert), 'assembly');
    const after = { ...e, [p.feld === 'name' && e.kind !== 'storey' && e.kind !== 'assembly' && e.kind !== 'zone' ? 'meta' : p.feld]:
      p.feld === 'name' && e.kind !== 'storey' && e.kind !== 'assembly' && e.kind !== 'zone'
        ? { ...e.meta, name: String(wert) }
        : wert } as typeof e;
    return [{ id: e.id, before: e, after }];
  },
});
