import { z } from 'zod';
import { newId } from '../model/ids';
import type { Assembly, Boundary, GridAxis, Opening, Slab, Storey, Wall, MassBody, Zone, Roof, Stair } from '../model/entities';
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

export const createStair = registerCommand({
  id: 'design.treppeErstellen',
  title: 'Treppe erstellen',
  description:
    'Erstellt eine gerade Lauftreppe von a (Antritt) nach b (Austritt) im Geschoss. Steigung wird aus der Geschosshöhe berechnet (Schrittmassregel 2s+a ≈ 630 mm). width = Laufbreite in mm (Standard 1200, CH-Minimum 1000).',
  params: z.object({
    storeyId: z.string(),
    a: PtSchema,
    b: PtSchema,
    width: z.number().int().min(800).default(1200),
  }),
  summarize: (p) => {
    const len = Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y);
    return `Treppe ${formatLength(Math.round(len))} Lauf, ${p.width} mm breit`;
  },
  run: (doc, p) => {
    const storey = require<Storey>(doc, p.storeyId, 'storey');
    const len = Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y);
    if (len < 1000) throw new CommandError('Treppenlauf zu kurz (< 1 m)');
    const spec = stairSpec(len, storey.height);
    if (spec.riser > 200) {
      throw new CommandError(
        `Lauf zu kurz für ${formatLength(storey.height)} Geschosshöhe: Steigung wäre ${Math.round(spec.riser)} mm (max. 200). Mindestens ${formatLength(Math.round(spec.minRun))} Lauflänge nötig.`,
      );
    }
    const stair: Stair = {
      id: newId('treppe'),
      kind: 'stair',
      storeyId: p.storeyId,
      a: p.a as Pt,
      b: p.b as Pt,
      width: p.width,
    };
    return [added(stair)];
  },
});

/** Steigungsrechnung: n Steigungen à s (Ideal ~175, 2s+a≈630), Auftritte a. */
export function stairSpec(runLength: number, floorHeight: number) {
  const n = Math.max(3, Math.round(floorHeight / 175));
  const riser = floorHeight / n;
  const going = runLength / (n - 1); // Austritt liegt auf OK — letzter Tritt = Decke
  const minRun = (Math.max(3, Math.ceil(floorHeight / 200)) - 1) * 230;
  return { steps: n, riser, going, comfort: 2 * riser + going, minRun };
}

export const setRaumprogramm = registerCommand({
  id: 'design.raumprogrammSetzen',
  title: 'Raumprogramm setzen',
  description:
    'Setzt das Wettbewerbs-Raumprogramm für die Berechnungsliste: HNF-Soll je Wohnungstyp (marktgerecht, preisguenstig, alterswohnen, vertical-cluster, quartierebene), optional den aGF-Faktor (Standard 1.22) und das zulässige aGF-Maximum. Zonen/Volumen mit passendem program-Schlüssel zählen als «ausgezogen».',
  params: z.object({
    posten: z
      .array(
        z.object({
          typ: z.string().describe('Wohnungstyp-Schlüssel, z.B. «marktgerecht»'),
          hnfSoll: z.number().nonnegative().describe('HNF-Soll in m²'),
        }),
      )
      .max(20),
    programmFaktor: z.number().min(1).max(2).optional().describe('aGF-Ziel = HNF × Faktor'),
    maxAgf: z.number().positive().nullable().optional().describe('zulässiges aGF-Maximum in m²'),
  }),
  summarize: (p) => `Raumprogramm: ${p.posten.length} Posten (×${p.programmFaktor ?? 'bisher'})`,
  run: (doc, p) => {
    const s = doc.settings;
    const before = { raumprogramm: s.raumprogramm, programmFaktor: s.programmFaktor, maxAgf: s.maxAgf };
    const after = {
      raumprogramm: p.posten,
      programmFaktor: p.programmFaktor ?? s.programmFaktor,
      maxAgf: p.maxAgf === undefined ? s.maxAgf : p.maxAgf,
    };
    return [{ settings: true, before, after }];
  },
});

export const setBoundary = registerCommand({
  id: 'design.baugrenzeSetzen',
  title: 'Baugrenze setzen',
  description:
    'Setzt die Baugrenze (Baugesetz) als Polygon mit optionaler Höhenbeschränkung. Es gibt pro Geschoss genau eine Baugrenze — erneutes Setzen ersetzt die alte. Bauteile ausserhalb oder darüber melden die Grundriss-Checks als Fehler.',
  params: z.object({
    storeyId: z.string(),
    outline: z.array(PtSchema).min(3),
    maxHoehe: z.number().int().positive().nullable().default(null).describe('max. Höhe über Projektnull in mm'),
    name: z.string().default('Baugrenze'),
  }),
  summarize: (p) => `Baugrenze${p.maxHoehe ? ` (max. ${(p.maxHoehe / 1000).toFixed(1)} m)` : ''} setzen`,
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const patches: AnyPatch[] = [];
    for (const alt of doc.byKind<Boundary>('boundary')) {
      if (alt.storeyId === p.storeyId) patches.push({ id: alt.id, before: alt, after: null });
    }
    const grenze: Boundary = {
      id: newId('baugrenze'),
      kind: 'boundary',
      storeyId: p.storeyId,
      outline: p.outline as Pt[],
      maxHoehe: p.maxHoehe,
      name: p.name,
    };
    patches.push(added(grenze));
    return patches;
  },
});

export const setPhase = registerCommand({
  id: 'design.phaseSetzen',
  title: 'SIA-Phase setzen',
  description:
    'Stellt den Detaillierungsgrad der Pläne nach SIA-Phase ein: vorprojekt (Wände als einfaches Poché, Öffnungen als Aussparung, 1:200), bauprojekt (Schichten sichtbar, Symbole, ohne feine Materialschraffuren, 1:100), werkplan (volle Detaillierung mit SIA-Materialschraffuren, 1:50). Wirkt auf Grundriss, Schnitt, Druck und Plankopf.',
  params: z.object({
    phase: z.enum(['vorprojekt', 'bauprojekt', 'werkplan']),
  }),
  summarize: (p) => `Phase: ${p.phase}`,
  run: (doc, p) => {
    return [{ settings: true, before: { phase: doc.settings.phase }, after: { phase: p.phase } }];
  },
});

export const setDimensionStyle = registerCommand({
  id: 'design.bemassungSetzen',
  title: 'Bemassungs-Stil setzen',
  description:
    'Stellt den Bemassungs-Stil des Projekts ein (wirkt in Grundriss, Schnitt, Druck und DXF). aussenKetten: beide (Öffnungen + Gesamtmass), gesamt (nur Gesamtmass) oder keine. innenKetten: Ketten auf den Achsen der Innenwände (Werkplan). hoehenKoten: Geschoss-Koten in Schnitt und Ansicht. Nur genannte Felder werden geändert.',
  params: z.object({
    aussenKetten: z.enum(['beide', 'gesamt', 'keine']).optional(),
    innenKetten: z.boolean().optional(),
    hoehenKoten: z.boolean().optional(),
  }),
  summarize: (p) =>
    `Bemassung: ${[
      p.aussenKetten !== undefined ? `aussen ${p.aussenKetten}` : null,
      p.innenKetten !== undefined ? `innen ${p.innenKetten ? 'an' : 'aus'}` : null,
      p.hoehenKoten !== undefined ? `Koten ${p.hoehenKoten ? 'an' : 'aus'}` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'unverändert'}`,
  run: (doc, p) => {
    const alt = doc.settings.bemassung;
    const neu = {
      aussenKetten: p.aussenKetten ?? alt.aussenKetten,
      innenKetten: p.innenKetten ?? alt.innenKetten,
      hoehenKoten: p.hoehenKoten ?? alt.hoehenKoten,
    };
    return [{ settings: true, before: { bemassung: alt }, after: { bemassung: neu } }];
  },
});

export const setGrid = registerCommand({
  id: 'design.rasterSetzen',
  title: 'Stützenraster setzen',
  description:
    'Erzeugt das Stützenraster als Achsen im Geschoss: anzahl Hauptachsen (Labels 1…N) quer zur X-Richtung im Abstand achsmass, querAnzahl Querachsen (Labels A…) im Abstand querAchsmass (Standard achsmass). Mit wohnraster entstehen feine Wohnraster-Zwischenachsen. Ersetzt das bisherige Raster des Geschosses — ein Undo-Schritt.',
  params: z.object({
    storeyId: z.string(),
    origin: PtSchema.default({ x: 0, y: 0 }).describe('Nullpunkt Achse 1/A'),
    achsmass: z.number().int().min(1000).describe('Hauptachs-Abstand in mm (z.B. 10500)'),
    anzahl: z.number().int().min(2).max(40).describe('Anzahl Hauptachsen (1…N)'),
    querAchsmass: z.number().int().min(1000).optional().describe('Querachs-Abstand in mm (Standard: achsmass)'),
    querAnzahl: z.number().int().min(2).max(40).default(4).describe('Anzahl Querachsen (A…)'),
    wohnraster: z.number().int().min(500).optional().describe('Wohnraster in mm → feine Zwischenachsen'),
  }),
  summarize: (p) => `Raster ${p.anzahl}×${p.querAnzahl ?? 4} (Achse ${(p.achsmass / 1000).toFixed(2)} m)`,
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const patches: AnyPatch[] = [];
    for (const alt of doc.byKind<GridAxis>('grid')) {
      if (alt.storeyId === p.storeyId) patches.push({ id: alt.id, before: alt, after: null });
    }
    const quer = p.querAchsmass ?? p.achsmass;
    const UEBERSTAND = 1500;
    const breite = (p.anzahl - 1) * p.achsmass;
    const tiefe = (p.querAnzahl - 1) * quer;
    const achse = (label: string, a: Pt, b: Pt, typ: 'haupt' | 'wohn'): void => {
      patches.push(
        added({ id: newId('achse'), kind: 'grid', storeyId: p.storeyId, label, a, b, typ } satisfies GridAxis),
      );
    };
    // Hauptachsen 1…N (senkrecht, im Abstand achsmass entlang X)
    for (let i = 0; i < p.anzahl; i++) {
      const x = p.origin.x + i * p.achsmass;
      achse(String(i + 1), { x, y: p.origin.y - UEBERSTAND }, { x, y: p.origin.y + tiefe + UEBERSTAND }, 'haupt');
    }
    // Querachsen A… (waagrecht)
    for (let j = 0; j < p.querAnzahl; j++) {
      const y = p.origin.y + j * quer;
      achse(
        String.fromCharCode(65 + (j % 26)),
        { x: p.origin.x - UEBERSTAND, y },
        { x: p.origin.x + breite + UEBERSTAND, y },
        'haupt',
      );
    }
    // Wohnraster: feine Zwischenachsen innerhalb jedes Hauptfelds
    if (p.wohnraster && p.wohnraster < p.achsmass) {
      const teilungen = Math.round(p.achsmass / p.wohnraster);
      for (let i = 0; i < p.anzahl - 1; i++) {
        for (let k = 1; k < teilungen; k++) {
          const x = p.origin.x + i * p.achsmass + Math.round((k * p.achsmass) / teilungen);
          achse('', { x, y: p.origin.y }, { x, y: p.origin.y + tiefe }, 'wohn');
        }
      }
    }
    return patches;
  },
});

export const removeGrid = registerCommand({
  id: 'design.rasterEntfernen',
  title: 'Stützenraster entfernen',
  description: 'Entfernt alle Rasterachsen des Geschosses.',
  params: z.object({ storeyId: z.string() }),
  summarize: () => 'Raster entfernen',
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const patches: AnyPatch[] = doc
      .byKind<GridAxis>('grid')
      .filter((g) => g.storeyId === p.storeyId)
      .map((g) => ({ id: g.id, before: g, after: null }));
    if (patches.length === 0) throw new CommandError('Kein Raster in diesem Geschoss');
    return patches;
  },
});

export const setDossier = registerCommand({
  id: 'design.dossierSetzen',
  title: 'Wettbewerbsdossier setzen',
  description:
    'Erfasst das Wettbewerbsdossier (Phase 0): Do\u2019s (gefordert), Don\u2019ts (No-gos) und Fakten aus dem Programm. Ersetzt die bisherige Liste. Kosmo beachtet das Dossier in jeder Antwort.',
  params: z.object({
    eintraege: z
      .array(
        z.object({
          typ: z.enum(['do', 'dont', 'fakt']),
          text: z.string().min(1).max(300),
        }),
      )
      .max(40),
  }),
  summarize: (p) => `Dossier: ${p.eintraege.length} Einträge`,
  run: (doc, p) => {
    return [
      {
        settings: true,
        before: { dossier: doc.settings.dossier },
        after: { dossier: p.eintraege },
      },
    ];
  },
});
