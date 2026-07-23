import { z } from 'zod';
import { newId } from '../model/ids';
import type { Furniture, Assembly, Beam, Boundary, Column, FreeMesh, Gelaender, GridAxis, Kommentar, Mangel, MassKette, Opening, Profil, Slab, Storey, Wall, MassBody, Zone, Roof, Stair, Rampe, ZonenTuer } from '../model/entities';
import { FREEMESH_MAX_FACES, FREEMESH_MAX_VERTICES } from '../model/entities';
import { extrudiereRegion, planareRegion, prismaMesh, quaderMesh } from '../derive/mesh-topo';
import type { AnyPatch, KosmoDoc, ProjektInfo, RaumRegel, RaumprogrammPosten, ZonenVorlage } from '../model/doc';
import { empfohlenePlanPhase, phaseLabel, siaPhaseLabel } from '../model/doc';
import { dist, formatLength, type Pt } from '../model/units';
import { CommandError, registerCommand } from './core';
import { isConvex } from '../geometry/skeleton';
import { stairSpec, treppenTeile } from '../derive/treppe';
import { rampSteigungProzent } from '../derive/rampe';
import { REGEL_PRESETS } from '../model/regelpresets';
import { generiereGrundriss, generiereGrundrissL, zerlegeRektilinear } from '../derive/grundrissgenerator';
import { zonenZuWaenden } from '../derive/zonenwaende';
import { boundingBox, kantenRichtung, richtungsModule, type Fassadenrichtung } from '../derive/fassadenmodule';
import { segmentiere, sollMix, WOHNUNGS_GROESSEN, type WohnungsTypSoll, type GeschnitteneWohnung } from '../derive/segmentierer';
import { raumGraph } from '../derive/raumgraph';
import { pruefeGrundriss, type PruefBefund } from '../derive/checks';
import { beschlagTyp } from '../derive/beschlag';

export { stairSpec } from '../derive/treppe';

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
  // H-38 (Sim-Befund): ein Doppel-Name wird NICHT abgelehnt (Geschossnamen
  // sind kein Schlüssel, ein Bestand könnte legitim gleiche Namen auf
  // verschiedenen Trakten haben) — aber ehrlich zurückgemeldet. `summarize`
  // läuft laut Command-Vertrag NACH `run()`/`doc.apply()` (s. core.ts
  // execute()), das neue Geschoss steckt hier also schon im Doc; ein
  // Duplikat-Check zählt darum absichtlich `> 1`, nicht `>= 1`. Kein eigener
  // Metadaten-Kanal existiert im Command-Ergebnis (nur `summary`/
  // `journal.summary`) — die Warnung reist im Summary-Text mit, denselben
  // Weg, den Diff-Karte und Journal ohnehin lesen.
  summarize: (p, doc) => {
    const doppelt = doc.byKind<Storey>('storey').filter((s) => s.name === p.name).length > 1;
    return `Geschoss ${p.name} auf ${formatLength(p.elevation)}${doppelt ? ' — Achtung: Name «' + p.name + '» bereits vergeben (Duplikat)' : ''}`;
  },
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

/**
 * Profil-Commands (v0.9.2 P-P1, `docs/V092-SPEZ.md` §P-P1) — Typenkatalog-
 * Eintrag für Stützen/Unterzüge, PROJEKTGLOBAL wie `design.aufbauErstellen`
 * oben (kein `storeyId`). `pruefeProfilMasse` läuft in Erstellen UND Ändern
 * (nach dem Feld-Merge) — dieselbe Prüfung an beiden Stellen, damit Ändern
 * nie ein halb-gültiges Profil zurücklässt (Muster
 * `design.wandZeichnen`/`design.eigenschaftSetzen`: Erstellen- und
 * Ändern-Pfad teilen denselben Bestands-Bereich).
 */
function pruefeProfilMasse(
  form: Profil['form'],
  m: { b?: number | undefined; h?: number | undefined; d?: number | undefined; steg?: number | undefined; flansch?: number | undefined },
): void {
  const brauch = (feld: 'b' | 'h' | 'd' | 'steg' | 'flansch', wert: number | undefined): number => {
    if (wert === undefined) throw new CommandError(`Profil «${form}» braucht «${feld}»`);
    if (!Number.isFinite(wert) || wert <= 0) throw new CommandError(`«${feld}» muss grösser als 0 sein`);
    return wert;
  };
  if (form === 'rechteck') {
    brauch('b', m.b);
    brauch('h', m.h);
    return;
  }
  if (form === 'rund') {
    brauch('d', m.d);
    return;
  }
  // stahl-i / stahl-u: Steg muss schmaler als der Flansch bleiben und die
  // Flansche dürfen sich nicht überlappen — sonst wäre `profilOutline`
  // (entities.ts) ein sich selbst schneidendes Polygon.
  const b = brauch('b', m.b);
  const h = brauch('h', m.h);
  const steg = brauch('steg', m.steg);
  const flansch = brauch('flansch', m.flansch);
  if (steg >= b) {
    throw new CommandError('steg muss kleiner als b sein');
  }
  if (flansch * 2 >= h) {
    throw new CommandError('flansch × 2 muss kleiner als h sein (sonst überlappen sich die Flansche)');
  }
}

export const createProfil = registerCommand({
  id: 'design.profilErstellen',
  title: 'Profil erstellen',
  description:
    'Erstellt ein wiederverwendbares Stützen-/Unterzugsprofil für den Typenkatalog (projektglobal, wie ein Aufbau). rechteck braucht b (Breite) + h (Höhe), rund braucht d (Durchmesser), stahl-i/stahl-u brauchen h (Gesamthöhe) + b (Flanschbreite) + steg (Stegdicke) + flansch (Flanschdicke) — alle Masse in mm, grösser 0.',
  params: z.object({
    name: z.string().min(1),
    form: z.enum(['rechteck', 'rund', 'stahl-i', 'stahl-u']),
    b: z.number().int().positive().optional().describe('Breite (rechteck) bzw. Flanschbreite (stahl-i/-u), mm'),
    h: z.number().int().positive().optional().describe('Höhe (rechteck) bzw. Gesamthöhe (stahl-i/-u), mm'),
    d: z.number().int().positive().optional().describe('Durchmesser (rund), mm'),
    steg: z.number().int().positive().optional().describe('Stegdicke (stahl-i/-u), mm'),
    flansch: z.number().int().positive().optional().describe('Flanschdicke (stahl-i/-u), mm'),
  }),
  summarize: (p) => `Profil «${p.name}» (${p.form})`,
  run: (doc, p) => {
    pruefeProfilMasse(p.form, p);
    const profil: Profil = {
      id: newId('profil'),
      kind: 'profil',
      name: p.name,
      form: p.form,
      ...(p.b !== undefined ? { b: p.b } : {}),
      ...(p.h !== undefined ? { h: p.h } : {}),
      ...(p.d !== undefined ? { d: p.d } : {}),
      ...(p.steg !== undefined ? { steg: p.steg } : {}),
      ...(p.flansch !== undefined ? { flansch: p.flansch } : {}),
    };
    return [added(profil)];
  },
});

export const profilAendern = registerCommand({
  id: 'design.profilAendern',
  title: 'Profil ändern',
  description:
    'Ändert ein bestehendes Profil — nur die übergebenen Felder wechseln, der Rest bleibt unverändert. Nach der Änderung müssen die Masse weiterhin zur (neuen oder unveränderten) Form passen, sonst wird ehrlich abgelehnt (kein Klemmen).',
  params: z.object({
    profilId: z.string(),
    name: z.string().min(1).optional(),
    form: z.enum(['rechteck', 'rund', 'stahl-i', 'stahl-u']).optional(),
    b: z.number().int().positive().optional(),
    h: z.number().int().positive().optional(),
    d: z.number().int().positive().optional(),
    steg: z.number().int().positive().optional(),
    flansch: z.number().int().positive().optional(),
  }),
  summarize: (p) => `Profil «${p.profilId}» geändert`,
  run: (doc, p) => {
    const profil = require<Profil>(doc, p.profilId, 'profil');
    const form = p.form ?? profil.form;
    // Nicht übergebene Masse bleiben, wie im Katalog gespeichert — auch über
    // einen Formwechsel hinweg (bewusst KEIN automatisches Aufräumen
    // formfremder Altfelder: `profilOutline` liest je Form ohnehin nur die
    // zutreffenden Felder, ein liegen gebliebenes `b` einer vorigen rund-Form
    // z.B. bleibt wirkungslos).
    const merged = {
      b: p.b ?? profil.b,
      h: p.h ?? profil.h,
      d: p.d ?? profil.d,
      steg: p.steg ?? profil.steg,
      flansch: p.flansch ?? profil.flansch,
    };
    pruefeProfilMasse(form, merged);
    const after: Profil = {
      ...profil,
      name: p.name ?? profil.name,
      form,
      ...(merged.b !== undefined ? { b: merged.b } : {}),
      ...(merged.h !== undefined ? { h: merged.h } : {}),
      ...(merged.d !== undefined ? { d: merged.d } : {}),
      ...(merged.steg !== undefined ? { steg: merged.steg } : {}),
      ...(merged.flansch !== undefined ? { flansch: merged.flansch } : {}),
    };
    return [{ id: profil.id, before: profil, after }];
  },
});

export const profilLoeschen = registerCommand({
  id: 'design.profilLoeschen',
  title: 'Profil löschen',
  description:
    'Löscht ein Profil aus dem Typenkatalog — lehnt ehrlich ab (mit der Referenzliste im Fehlertext), solange noch eine Stütze oder ein Unterzug per profilId darauf verweist.',
  params: z.object({ profilId: z.string() }),
  summarize: () => 'Profil gelöscht',
  run: (doc, p) => {
    const profil = require<Profil>(doc, p.profilId, 'profil');
    const referenzen = [
      ...doc.byKind<Column>('column').filter((c) => c.profilId === p.profilId).map((c) => `Stütze ${c.id}`),
      ...doc.byKind<Beam>('beam').filter((b) => b.profilId === p.profilId).map((b) => `Unterzug ${b.id}`),
    ];
    if (referenzen.length > 0) {
      throw new CommandError(
        `Profil «${profil.name}» ist noch referenziert von: ${referenzen.join(', ')} — erst dort profilId entfernen oder umstellen`,
      );
    }
    return [{ id: profil.id, before: profil, after: null }];
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

/**
 * E1 (V086-SPEZ, `docs/V086-SPEZ.md` §3): Bilanz eines
 * `design.wandGeometrieSetzen`-Laufs — welche Öffnungen unverändert bleiben,
 * geclampt oder entfernt werden. `run()` liefert daraus die Patches; die
 * Zähler wandern zusätzlich kurzzeitig in `wandGeometrieBilanz` (siehe dort),
 * weil `summarize()` laut Vertrag (core.ts `execute()`) erst NACH `doc.apply()`
 * läuft — zu diesem Zeitpunkt sind entfernte Öffnungen aus dem Doc bereits
 * gelöscht und nicht mehr zählbar.
 */
function planeOeffnungsBilanz(
  doc: KosmoDoc,
  wallId: string,
  neueLaenge: number,
): { patches: AnyPatch[]; entfernt: number; geclampt: number } {
  const patches: AnyPatch[] = [];
  let entfernt = 0;
  let geclampt = 0;
  for (const o of doc.openingsOf(wallId) as Opening[]) {
    const lo = o.center - o.width / 2;
    const hi = o.center + o.width / 2;
    if (lo >= 0 && hi <= neueLaenge) continue; // (1) passt unverändert — kein Patch
    if (o.width > neueLaenge) {
      // (3) zu breit für die neue Wand — im selben Command entfernen
      patches.push({ id: o.id, before: o, after: null });
      entfernt++;
      continue;
    }
    // (2) clampbar — Breite bleibt, center rutscht bündig an die nähere Wandkante
    const neuesCenter = lo < 0 ? Math.round(o.width / 2) : Math.round(neueLaenge - o.width / 2);
    patches.push({ id: o.id, before: o, after: { ...o, center: neuesCenter } });
    geclampt++;
  }
  return { patches, entfernt, geclampt };
}

/** Siehe `planeOeffnungsBilanz` — sicher als Modul-Zustand, weil `execute()`
 * (core.ts) synchron `run()` → `doc.apply()` → `summarize()` OHNE
 * Verschachtelung durchläuft: kein zweiter Aufruf dieses Commands kann
 * dazwischenfunken. `summarize()` konsumiert (liest UND löscht) den Wert
 * sofort, damit nichts über den eigenen Lauf hinaus stehen bleibt. */
let wandGeometrieBilanz: { entfernt: number; geclampt: number } | null = null;

export const setWallGeometry = registerCommand({
  id: 'design.wandGeometrieSetzen',
  title: 'Wand-Geometrie setzen',
  description:
    'Setzt Anfangs- und/oder Endpunkt (a/b) einer bestehenden Wand neu, OHNE sie zu ersetzen: Identität, height, Umbau-/Phasen-Felder (meta), assemblyId, alignment und alle gehosteten Öffnungen bleiben erhalten. Wird die Wand kürzer, gilt für jede Öffnung, in dieser Reihenfolge: (1) passt center±width/2 weiterhin in die neue Länge → unverändert; (2) sonst, wenn die Breite selbst noch in die neue Länge passt → center rutscht bündig an die nähere Wandkante (Breite bleibt); (3) sonst (Öffnung breiter als die neue Wand) → die Öffnung wird im selben Schritt entfernt und im Ergebnis genannt. Mindestens einer der Punkte a/b ist Pflicht. Alles EIN Command = EIN Undo-Schritt.',
  params: z.object({
    entityId: z.string(),
    a: PtSchema.optional(),
    b: PtSchema.optional(),
  }),
  summarize: (p, doc) => {
    const wall = doc.get<Wall>(p.entityId);
    const neueA = (p.a ?? wall?.a) as Pt | undefined;
    const neueB = (p.b ?? wall?.b) as Pt | undefined;
    const laenge = neueA && neueB ? Math.round(dist(neueA, neueB)) : 0;
    const bilanz = wandGeometrieBilanz;
    wandGeometrieBilanz = null;
    const teile: string[] = [];
    if (bilanz && bilanz.geclampt > 0) {
      teile.push(`${bilanz.geclampt} Öffnung${bilanz.geclampt === 1 ? '' : 'en'} angepasst`);
    }
    if (bilanz && bilanz.entfernt > 0) {
      teile.push(`${bilanz.entfernt} Öffnung${bilanz.entfernt === 1 ? '' : 'en'} entfernt`);
    }
    return `Wand-Geometrie ${formatLength(laenge)}${teile.length ? ' — ' + teile.join(', ') : ''}`;
  },
  run: (doc, p) => {
    if (!p.a && !p.b) {
      throw new CommandError('design.wandGeometrieSetzen braucht mindestens einen Punkt (a oder b)');
    }
    const wall = require<Wall>(doc, p.entityId, 'wall');
    const neueA = (p.a ?? wall.a) as Pt;
    const neueB = (p.b ?? wall.b) as Pt;
    if (neueA.x === neueB.x && neueA.y === neueB.y) {
      throw new CommandError('Wand hat Länge 0');
    }
    const neueLaenge = dist(neueA, neueB);
    const { patches: oeffnungsPatches, entfernt, geclampt } = planeOeffnungsBilanz(doc, wall.id, neueLaenge);
    wandGeometrieBilanz = { entfernt, geclampt };
    return [{ id: wall.id, before: wall, after: { ...wall, a: neueA, b: neueB } }, ...oeffnungsPatches];
  },
});

export const setSchnitt = registerCommand({
  id: 'design.schnittSetzen',
  title: 'Schnitt setzen',
  description:
    'Setzt die Schnittlinie (a→b) für Schnittansicht und -export. depth = Sichttiefe hinter der Ebene in mm, lookLeft = Blick zur linken Normalen. Läuft über den Kernel, damit Undo/Yjs-Sync/Kosmo-Tool wie bei jedem anderen Command gelten (H-9: vorher direkter UI-State am Schnitt-Werkzeug).',
  params: z.object({
    a: PtSchema,
    b: PtSchema,
    depth: z.number().int().positive().default(30000).describe('Sichttiefe hinter der Schnittebene, mm'),
    lookLeft: z.boolean().default(true),
  }),
  summarize: (p) => {
    const len = Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y);
    return `Schnitt ${formatLength(Math.round(len))}`;
  },
  run: (doc, p) => {
    if (p.a.x === p.b.x && p.a.y === p.b.y) {
      throw new CommandError('Schnittlinie hat Länge 0');
    }
    return [
      {
        settings: true as const,
        // Schmales Patch (nur `schnitt`), wie bei themen/materialPrioritaeten:
        // `schnitt` ist ein optionales Feld ohne defaultSettings-Eintrag —
        // ein volles doc.settings-Snapshot-Patch würde beim Undo die
        // Abwesenheit des Schlüssels nicht wiederherstellen (Object-Spread
        // löscht keine Keys), «vorher» braucht also einen expliziten Wert.
        before: { schnitt: doc.settings.schnitt ?? null },
        after: { schnitt: { a: p.a as Pt, b: p.b as Pt, depth: p.depth, lookLeft: p.lookLeft } },
      },
    ];
  },
});

export const createSlab = registerCommand({
  id: 'design.deckeZeichnen',
  title: 'Decke zeichnen',
  description:
    'Erstellt eine Decke/Bodenplatte mit Polygon-Umriss im Geschoss. Die Oberkante liegt auf OK Boden des Geschosses (topOffset 0), Dicke nach unten. Optional assemblyId eines Decken-Aufbaus (target slab) — die Schichten über der tragenden ergeben das roh/fertig-Delta der Höhenkoten.',
  params: z.object({
    storeyId: z.string(),
    outline: z.array(PtSchema).min(3),
    thickness: z.number().int().positive().default(250).describe('mm'),
    assemblyId: z.string().optional().describe('Decken-Aufbau (target slab)'),
  }),
  summarize: (p) => `Decke mit ${p.outline.length} Eckpunkten, d = ${p.thickness} mm`,
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    if (p.assemblyId) {
      const asm = require<Assembly>(doc, p.assemblyId, 'assembly');
      if (asm.target !== 'slab') throw new CommandError(`Aufbau «${asm.name}» ist kein Decken-Aufbau (target slab)`);
    }
    const slab: Slab = {
      id: newId('decke'),
      kind: 'slab',
      storeyId: p.storeyId,
      outline: p.outline as Pt[],
      thickness: p.thickness,
      topOffset: 0,
      ...(p.assemblyId ? { assemblyId: p.assemblyId } : {}),
    };
    return [added(slab)];
  },
});

export const setRoomType = registerCommand({
  id: 'design.raumTypSetzen',
  title: 'Raumtyp setzen',
  description:
    'Setzt den Raumtyp einer Zone (zimmer, wohnen, kueche, bad, korridor, treppenhaus, abstellraum, balkon, technik, gewerbe). Der Raumtyp steuert Raumgraph und Fluchtweg-Check: Fluchtziel ist «treppenhaus» oder eine Zone mit Treppe.',
  params: z.object({
    zoneId: z.string(),
    raumTyp: z.enum(['zimmer', 'wohnen', 'kueche', 'bad', 'korridor', 'treppenhaus', 'abstellraum', 'balkon', 'technik', 'gewerbe']),
  }),
  summarize: (p) => `Raumtyp «${p.raumTyp}»`,
  run: (doc, p) => {
    const zone = require<Zone>(doc, p.zoneId, 'zone');
    return [{ id: zone.id, before: zone, after: { ...zone, raumTyp: p.raumTyp } }];
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

/** Budget-Wächter (Block 3 / E1): Commands weisen Überschreitung ehrlich ab —
 * FreeMesh ist Entwurfsgeometrie, kein Scan-Container. */
function pruefeMeshBudget(positions: number[], faces: number[]): void {
  const vertices = positions.length / 3;
  const faceCount = faces.length / 3;
  if (vertices > FREEMESH_MAX_VERTICES || faceCount > FREEMESH_MAX_FACES) {
    throw new CommandError(
      `FreeMesh-Budget überschritten (${vertices} Vertices / ${faceCount} Flächen — ` +
        `Deckel ${FREEMESH_MAX_VERTICES}/${FREEMESH_MAX_FACES}). Grosse Meshes bleiben ` +
        `Referenz-Kontext (KosmoAsset), nicht editierbares FreeMesh.`,
    );
  }
}

export const createFreeMesh = registerCommand({
  id: 'design.meshErstellen',
  title: 'FreeMesh erstellen',
  description:
    'Erstellt ein frei editierbares Mesh (FreeMesh, dritte Werkzeugstufe): form «quader» braucht storeyId + at + breite/laenge/hoehe (mm); form «ausVolumen» braucht massId und wandelt den Volumenkörper in ein Mesh um (der Volumenkörper verschwindet — ein Undo-Schritt stellt ihn zurück). Danach: design.meshVertexSchieben / design.meshFlaecheExtrudieren.',
  params: z.object({
    form: z.enum(['quader', 'ausVolumen', 'daten']),
    storeyId: z.string().optional().describe('Geschoss (Pflicht bei quader/daten)'),
    at: PtSchema.optional().describe('Ecke des Quaders mit minimalem x/y'),
    breite: z.number().int().positive().optional().describe('mm (quader, x-Richtung)'),
    laenge: z.number().int().positive().optional().describe('mm (quader, y-Richtung)'),
    hoehe: z.number().int().positive().optional().describe('mm (quader)'),
    massId: z.string().optional().describe('Volumenkörper (Pflicht bei ausVolumen)'),
    /** form «daten» (E6, GLB-Übernahme): rohe Geometrie in ganzzahligen mm. */
    positions: z.array(z.number().int()).optional().describe('flach [x,y,z,…] in mm (daten)'),
    faces: z.array(z.number().int().min(0)).optional().describe('flache Dreiecks-Indizes (daten)'),
    name: z.string().optional(),
  }),
  summarize: (p) => (p.form === 'quader' ? 'FreeMesh-Quader erstellen' : 'Volumen in FreeMesh umwandeln'),
  run: (doc, p) => {
    if (p.form === 'quader') {
      if (!p.storeyId || !p.at || !p.breite || !p.laenge || !p.hoehe) {
        throw new CommandError('form «quader» braucht storeyId, at, breite, laenge und hoehe');
      }
      require<Storey>(doc, p.storeyId, 'storey');
      const daten = quaderMesh(p.at as Pt, p.breite, p.laenge, p.hoehe);
      pruefeMeshBudget(daten.positions, daten.faces);
      const mesh: FreeMesh = {
        id: newId('mesh'),
        kind: 'freemesh',
        storeyId: p.storeyId,
        positions: daten.positions,
        faces: daten.faces,
        ...(p.name ? { name: p.name } : {}),
      };
      return [added(mesh)];
    }
    if (p.form === 'daten') {
      // GLB-Übernahme (Buildplan E6): der Client hat die Geometrie schon in
      // Kern-Konvention gebracht (mm, z geschoss-relativ) — hier zählen nur
      // die Wächter: Budget, Index-Gültigkeit, Dreiecks-Vollständigkeit.
      if (!p.storeyId || !p.positions || !p.faces) {
        throw new CommandError('form «daten» braucht storeyId, positions und faces');
      }
      require<Storey>(doc, p.storeyId, 'storey');
      if (p.positions.length % 3 !== 0 || p.faces.length % 3 !== 0 || p.faces.length === 0) {
        throw new CommandError('positions/faces müssen vollständige Tripel sein (Dreiecke)');
      }
      const vertexCount = p.positions.length / 3;
      for (const i of p.faces) {
        if (i >= vertexCount) throw new CommandError(`Flächen-Index ${i} ausserhalb (0–${vertexCount - 1})`);
      }
      pruefeMeshBudget(p.positions, p.faces);
      const mesh: FreeMesh = {
        id: newId('mesh'),
        kind: 'freemesh',
        storeyId: p.storeyId,
        positions: [...p.positions],
        faces: [...p.faces],
        ...(p.name ? { name: p.name } : {}),
      };
      return [added(mesh)];
    }
    // ausVolumen: MassBody → identisches Prisma als Mesh, EIN Undo-Schritt.
    if (!p.massId) throw new CommandError('form «ausVolumen» braucht massId');
    const mass = require<MassBody>(doc, p.massId, 'mass');
    const daten = prismaMesh(mass.outline, mass.baseOffset, mass.baseOffset + mass.height);
    pruefeMeshBudget(daten.positions, daten.faces);
    const mesh: FreeMesh = {
      id: newId('mesh'),
      kind: 'freemesh',
      storeyId: mass.storeyId,
      positions: daten.positions,
      faces: daten.faces,
      ...(p.name ? { name: p.name } : mass.program ? { name: mass.program } : {}),
    };
    return [added(mesh), { id: mass.id, before: mass, after: null }];
  },
});

export const meshMoveVertices = registerCommand({
  id: 'design.meshVertexSchieben',
  title: 'Mesh-Vertices schieben',
  description:
    'Verschiebt Vertices eines FreeMesh um dx/dy/dz in mm. indices sind Vertex-Indizes (deckungsgleiche Ecken zusammen schieben — die Verschweissung liefert derive/mesh-topo gleichePositionen).',
  params: z.object({
    entityId: z.string(),
    indices: z.array(z.number().int().min(0)).min(1),
    dx: z.number().int(),
    dy: z.number().int(),
    dz: z.number().int(),
  }),
  summarize: (p) => `${p.indices.length} Vertex(e) um ${p.dx}/${p.dy}/${p.dz} mm`,
  run: (doc, p) => {
    const e = require<FreeMesh>(doc, p.entityId, 'freemesh');
    const vertexCount = e.positions.length / 3;
    for (const i of p.indices) {
      if (i >= vertexCount) throw new CommandError(`Vertex-Index ${i} ausserhalb (0–${vertexCount - 1})`);
    }
    if (p.dx === 0 && p.dy === 0 && p.dz === 0) throw new CommandError('Verschiebung um 0/0/0 ist keine Änderung');
    const ziel = new Set(p.indices);
    const positions = e.positions.map((wert, idx) => {
      const vertex = Math.floor(idx / 3);
      if (!ziel.has(vertex)) return wert;
      return idx % 3 === 0 ? wert + p.dx : idx % 3 === 1 ? wert + p.dy : wert + p.dz;
    });
    return [{ id: e.id, before: e, after: { ...e, positions } }];
  },
});

export const meshExtrudeFace = registerCommand({
  id: 'design.meshFlaecheExtrudieren',
  title: 'Mesh-Fläche extrudieren',
  description:
    'Extrudiert die planare Region um das Dreieck «face» eines FreeMesh entlang ihrer Normalen um distanz mm (negativ = einwärts). Die Region flutet über gleich orientierte Nachbardreiecke — das Morph-Handgefühl, ein Undo-Schritt.',
  params: z.object({
    entityId: z.string(),
    face: z.number().int().min(0).describe('Dreiecks-Index (Seed der planaren Region)'),
    distanz: z.number().int().describe('mm, negativ = einwärts'),
  }),
  summarize: (p) => `Fläche ${p.face} um ${formatLength(Math.abs(p.distanz))} ${p.distanz < 0 ? 'einwärts' : 'auswärts'}`,
  run: (doc, p) => {
    const e = require<FreeMesh>(doc, p.entityId, 'freemesh');
    const faceCount = e.faces.length / 3;
    if (p.face >= faceCount) throw new CommandError(`Flächen-Index ${p.face} ausserhalb (0–${faceCount - 1})`);
    if (p.distanz === 0) throw new CommandError('Distanz 0 ist keine Änderung');
    const region = planareRegion(e.positions, e.faces, p.face);
    const daten = extrudiereRegion({ positions: e.positions, faces: e.faces }, region, p.distanz);
    pruefeMeshBudget(daten.positions, daten.faces);
    return [{ id: e.id, before: e, after: { ...e, positions: daten.positions, faces: daten.faces } }];
  },
});

export const moveEntity = registerCommand({
  id: 'design.verschieben',
  title: 'Element verschieben',
  description:
    'Verschiebt ein Element um dx/dy in mm (Wände, Decken, Volumen, Zonen, Stützen, Treppen, Dächer, Baugrenzen, Unterzüge, Möbel, Kommentare, Etiketten, Massketten).',
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
    const shiftPt = (q: Pt) => ({ x: q.x + p.dx, y: q.y + p.dy });
    let after: import('../model/entities').Entity;
    switch (e.kind) {
      case 'wall':
        after = { ...e, a: shiftPt(e.a), b: shiftPt(e.b) };
        break;
      case 'slab':
        after = e.holes
          ? { ...e, outline: shift(e.outline), holes: e.holes.map(shift) }
          : { ...e, outline: shift(e.outline) };
        break;
      case 'mass':
      case 'zone':
      case 'roof':
      case 'boundary':
        after = { ...e, outline: shift(e.outline) };
        break;
      case 'freemesh': {
        // Flache [x,y,z]-Tripel: dx/dy auf jede Position, z bleibt (Block 3).
        const positions = e.positions.map((wert, i) =>
          i % 3 === 0 ? wert + p.dx : i % 3 === 1 ? wert + p.dy : wert,
        );
        after = { ...e, positions };
        break;
      }
      case 'column':
        after = { ...e, at: shiftPt(e.at) };
        break;
      case 'stair':
        after = {
          ...e,
          a: shiftPt(e.a),
          b: shiftPt(e.b),
          ...(e.ecke ? { ecke: shiftPt(e.ecke) } : {}),
        };
        break;
      // E1 (V088-SPEZ §3, PA1-088): additive Zweige — alle in-place per
      // Objekt-Spread der reinen Punktfelder, Identität und jedes
      // Nicht-Punkt-Feld bleiben unverändert (Sanktion 2).
      case 'beam':
        after = { ...e, a: shiftPt(e.a), b: shiftPt(e.b) };
        break;
      case 'furniture':
        // rotationGrad bleibt unberührt — nur `at` wird verschoben.
        after = { ...e, at: shiftPt(e.at) };
        break;
      case 'kommentar':
        after = { ...e, at: shiftPt(e.at) };
        break;
      case 'etikett':
        // targetId bleibt exakt erhalten (Sanktion 2) — der Spread rührt nur
        // `at` an, targetId/inhalt/keynote/storeyId bleiben unangetastet.
        after = { ...e, at: shiftPt(e.at) };
        break;
      case 'masskette':
        after = { ...e, punkte: shift(e.punkte) };
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
    if (e.kind === 'wall' || e.kind === 'slab') {
      for (const a of doc.byKind<import('../model/entities').Aussparung>('aussparung')) {
        if (a.hostId === e.id) patches.push({ id: a.id, before: a, after: null });
      }
    }
    // Etiketten des Bauteils räumen mit (A6)
    for (const et of doc.byKind<import('../model/entities').Etikett>('etikett')) {
      if (et.targetId === e.id) patches.push({ id: et.id, before: et, after: null });
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
    raumTyp: z
      .enum(['zimmer', 'wohnen', 'kueche', 'bad', 'korridor', 'treppenhaus', 'abstellraum', 'balkon', 'technik', 'gewerbe'])
      .optional()
      .describe('Raumtyp für Raumgraph und Fluchtweg-Check'),
    zonenArt: z
      .enum(['parzelle', 'nachbar'])
      .optional()
      .describe(
        'Site-Marker (D8/H-1; E2 v0.8.6): «parzelle» kennzeichnet eine importierte Kataster-Parzelle, «nachbar» einen Nachbargebäude-Footprint — beide statt eines Raums; nimmt die Zone von Raumtyp-Checks und der SIA-416-Flächensumme aus (die sia-Klasse bleibt, z.B. für die Schwarzplan-Erkennung).',
      ),
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
      ...(p.raumTyp ? { raumTyp: p.raumTyp } : {}),
      ...(p.program ? { program: p.program } : {}),
      ...(p.zonenArt ? { zonenArt: p.zonenArt } : {}),
    };
    return [added(zone)];
  },
});

export const createRoof = registerCommand({
  id: 'design.dachErstellen',
  title: 'Walmdach erstellen',
  description:
    'Erstellt ein Dach über einem konvexen Polygon-Grundriss. pitch = Dachneigung in Grad (Standard 35), overhang = Dachüberstand in mm (Standard 500). Die Traufe liegt auf OK des Geschosses. form: «walm» (Standard, alle Seiten geneigt) oder «sattel» (First + 2 geneigte Flächen, Giebel an den Schmalseiten). Bei form «sattel» gibt firstrichtung an, entlang welcher Achse (x oder y) der First verläuft.',
  params: z.object({
    storeyId: z.string(),
    outline: z.array(PtSchema).min(3),
    pitch: z.number().min(5).max(75).default(35),
    overhang: z.number().int().nonnegative().default(500),
    form: z.enum(['walm', 'sattel']).default('walm'),
    firstrichtung: z.enum(['x', 'y']).default('x').describe('Nur bei form «sattel»: Achse des Firstes'),
  }),
  summarize: (p) =>
    p.form === 'sattel'
      ? `Satteldach ${p.pitch}° über ${p.outline.length} Eckpunkten (First ${p.firstrichtung})`
      : `Walmdach ${p.pitch}° über ${p.outline.length} Eckpunkten`,
  run: (doc, p) => {
    const storey = require<Storey>(doc, p.storeyId, 'storey');
    if (!isConvex(p.outline as Pt[])) {
      throw new CommandError('Dach V1 braucht einen konvexen Grundriss (keine einspringenden Ecken)');
    }
    const roof: Roof = {
      id: newId('dach'),
      kind: 'roof',
      storeyId: p.storeyId,
      outline: p.outline as Pt[],
      pitch: p.pitch,
      overhang: p.overhang,
      baseOffset: storey.height,
      form: p.form,
      firstrichtung: p.firstrichtung,
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
  'anschlag',
  'fluegelTyp',
  // v0.8.3 E1 (§1.3, docs/V083-SPEZ.md): additive Werte für `kommentar`.
  'text',
  'status',
  'erledigtAm',
  // E2 (V088-SPEZ §3, PA1-088): additive Werte — Zone.number/raumTyp,
  // Furniture.rotationGrad, Column.material/b/t/rotationGrad,
  // Beam.breite/hoehe/material, Opening-Detailfelder (nur string|number).
  'number',
  'raumTyp',
  'rotationGrad',
  'material',
  'b',
  't',
  'breite',
  'hoehe',
  'typeId',
  'fensterTyp',
  'rahmenbreite',
  'band',
  'griffseite',
  // v0.9.1 P-A1 (V091-SPEZ §P-A1): additiv für `gelaender` — hoehe teilt sich
  // die Zeile mit Beam.hoehe (numerisch, s. Bestands-Bereichsprüfung unten),
  // art ist neu.
  'art',
  // v0.9.2 P-G (V092-SPEZ §P-G): additiv für `ramp` — width teilt sich die
  // Zeile mit Opening.width (numerisch), hoehenDelta/podestLaenge sind neu.
  'hoehenDelta',
  'podestLaenge',
  // v0.9.2 P-P1 (V092-SPEZ §P-P1): additiv für `column`/`beam` — Profil-
  // Referenz aus dem Typenkatalog (s. Sonderbehandlung weiter unten: leerer
  // String entfernt die Referenz wieder, KEIN generischer Feld-Zuweisungspfad).
  'profilId',
] as const;

const FLUEGELTYP_WERTE = ['dreh', 'kipp', 'drehkipp', 'schiebe', 'fest'] as const;
// v0.9.1 P-A1 (V091-SPEZ §P-A1): dieselben Werte wie Gelaender.art
// (entities.ts) — additiv dupliziert nach demselben Muster wie
// RAUMTYP_WERTE/FLUEGELTYP_WERTE oben (kein gemeinsamer Import, um deren
// Zeilen nicht anzufassen).
const GELAENDER_ART_WERTE = ['staketen', 'handlauf', 'voll'] as const;
// E2 (V088-SPEZ §3, PA1-088): dieselbe Werteliste wie design.zoneErstellen/
// design.raumTypSetzen — additiv dupliziert, um die bestehenden Enums dort
// byte-gleich zu lassen (kein gemeinsamer Import, um deren Zeilen nicht
// anzufassen).
const RAUMTYP_WERTE = [
  'zimmer', 'wohnen', 'kueche', 'bad', 'korridor', 'treppenhaus', 'abstellraum', 'balkon', 'technik', 'gewerbe',
] as const;
const FENSTERTYP_WERTE = ['einfluegel', 'zweifluegel', 'fest', 'fensterband'] as const;
const BAND_WERTE = ['links', 'rechts', 'oben', 'unten'] as const;

export const setProperty = registerCommand({
  id: 'design.eigenschaftSetzen',
  title: 'Eigenschaft ändern',
  description:
    'Ändert eine Eigenschaft eines Elements. Felder je nach Typ: Zone(name, sia, program, number — Raumnummer, raumTyp) · Dach(pitch, overhang) · Volumen(height, program) · Decke(thickness) · Wand(assemblyId, alignment) · Öffnung(center, width, height, sill, swing, openingType, fluegelTyp — SIA-Öffnungssymbolik in Ansicht/Grundriss, v0.7.1 E5 — sowie typeId, fensterTyp, rahmenbreite, band, griffseite) · Möbel(rotationGrad) · Stütze(material, b, t, rotationGrad) · Unterzug(breite, hoehe, material) · Geländer(hoehe — 700–1500 mm, art — staketen/handlauf/voll) · Rampe(width — min 600 mm, hoehenDelta — ganzzahlig > 0, podestLaenge — ganzzahlig ≥ 0, 0/leer entfernt das Podest wieder; JEDE Änderung prüft danach dasselbe ehrliche Steigungs-Gate wie design.rampeGeometrieSetzen: > 15 % wird abgelehnt, Tiefgaragen-Grenze, keine stille Klemmung) · Blatt(name — Blattname, KosmoPublish). Zahlen in mm (pitch/rotationGrad in Grad).',
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
      zone: ['name', 'sia', 'program', 'number', 'raumTyp'],
      roof: ['pitch', 'overhang'],
      mass: ['height', 'program'],
      slab: ['thickness'],
      wall: ['assemblyId', 'alignment', 'height'],
      opening: [
        'center', 'width', 'height', 'sill', 'swing', 'openingType', 'anschlag', 'fluegelTyp',
        // E2 (V088-SPEZ §3, PA1-088): NUR string|number-Felder — teilung
        // ({n,m}, Objekt), oeffnetNachAussen/antrieb/absturzsicherung
        // (boolean) und beschlaege (string[]) bleiben bewusst aussen vor
        // (Sanktion 3, siehe Abschlussbericht).
        'typeId', 'fensterTyp', 'rahmenbreite', 'band', 'griffseite',
      ],
      storey: ['name', 'height'],
      assembly: ['name'],
      freemesh: ['name'],
      // E4 (V0810-SPEZ §2, C-8): Blatt-Umbenennen — bislang produktweit
      // kein Setzweg für Sheet.name (0.8.9-Befund). Nur `name`, kein
      // weiteres Feld dieses Pakets.
      sheet: ['name'],
      // v0.8.3 E1 (§1.3, docs/V083-SPEZ.md): additive Zeile, kein bestehender
      // Eintrag verändert.
      kommentar: ['text', 'status', 'erledigtAm'],
      // E2 (V088-SPEZ §3, PA1-088): additive Zeilen — bisher komplett ohne
      // Setzweg (D2).
      furniture: ['rotationGrad'],
      // v0.9.2 P-P1 (V092-SPEZ §P-P1): additiv — profilId.
      column: ['material', 'b', 't', 'rotationGrad', 'profilId'],
      beam: ['breite', 'hoehe', 'material', 'profilId'],
      // v0.9.1 P-A1 (V091-SPEZ §P-A1): additive Zeile, Muster column/beam.
      gelaender: ['hoehe', 'art'],
      // v0.9.2 P-G (V092-SPEZ §P-G): additive Zeile — dieselben drei Felder
      // wie design.rampeZeichnen (width/hoehenDelta/podestLaenge), gleiches
      // ehrliches Steigungs-Gate wie design.rampeGeometrieSetzen unten.
      ramp: ['width', 'hoehenDelta', 'podestLaenge'],
    };
    const fields = allowed[e.kind] ?? [];
    if (!fields.includes(p.feld)) {
      throw new CommandError(
        `«${p.feld}» ist bei ${e.kind} nicht änderbar (möglich: ${fields.join(', ') || 'nichts'})`,
      );
    }
    const numeric = [
      'pitch', 'overhang', 'height', 'thickness', 'center', 'width', 'sill', 'anschlag',
      // E2: b/t/breite/hoehe/rahmenbreite sind wie die bestehenden mm-Felder
      // ganzzahlig und nicht-negativ — die engeren Bestands-Bereiche (aus den
      // Erstellen-Commands) prüfen die dedizierten Blöcke unten.
      'b', 't', 'breite', 'hoehe', 'rahmenbreite',
      // v0.9.2 P-G: hoehenDelta/podestLaenge sind ganzzahlige mm-Felder wie
      // die übrigen — podestLaenge darf dabei 0 werden (bedeutet «entfernen»,
      // s. Sonderbehandlung unten), das generische `wert < 0`-Wurf lässt 0
      // bewusst durch.
      'hoehenDelta', 'podestLaenge',
    ];
    let wert: string | number = p.wert;
    if (numeric.includes(p.feld)) {
      wert = typeof p.wert === 'number' ? p.wert : Number(p.wert);
      if (!Number.isFinite(wert) || wert < 0) throw new CommandError(`«${p.wert}» ist keine gültige Zahl`);
      if (p.feld !== 'pitch') wert = Math.round(wert);
    }
    if (p.feld === 'rotationGrad') {
      const n = typeof p.wert === 'number' ? p.wert : Number(p.wert);
      if (!Number.isFinite(n)) throw new CommandError(`«${p.wert}» ist keine gültige Zahl`);
      // Kein Bestands-Bereich gefunden: design.stuetzeSetzen (rotationGrad:
      // z.number().optional()) und design.moebelSetzen (z.number().default(0))
      // nehmen jeden endlichen Wert unbeschränkt an. Entscheid: normalisieren
      // statt werfen, nach dem vorhandenen Mod-360-Muster in
      // design.vorlageSetzen (`(360 - m.rotationGrad) % 360` beim Spiegeln,
      // design.ts) — Rotation ist im Kernel bereits ein Mod-360-Raum, kein
      // Falschwert-Fall wie bei `sia`/`raumTyp`.
      wert = ((n % 360) + 360) % 360;
    }
    if ((p.feld === 'b' || p.feld === 't') && e.kind === 'column' && (Number(wert) < 80 || Number(wert) > 2000)) {
      // Bestands-Bereich aus design.stuetzeSetzen (b/t: min 80, max 2000 mm) —
      // eigenschaftSetzen darf keinen Wert zulassen, den das Erstellen-Command
      // ablehnen würde.
      throw new CommandError(`«${p.feld}» muss zwischen 80 und 2000 mm liegen (Bestands-Bereich design.stuetzeSetzen)`);
    }
    if (p.feld === 'breite' && e.kind === 'beam' && (Number(wert) < 80 || Number(wert) > 2000)) {
      // Bestands-Bereich aus design.unterzugZeichnen.
      throw new CommandError('breite muss zwischen 80 und 2000 mm liegen (Bestands-Bereich design.unterzugZeichnen)');
    }
    if (p.feld === 'hoehe' && e.kind === 'beam' && (Number(wert) < 100 || Number(wert) > 3000)) {
      // Bestands-Bereich aus design.unterzugZeichnen.
      throw new CommandError('hoehe muss zwischen 100 und 3000 mm liegen (Bestands-Bereich design.unterzugZeichnen)');
    }
    if (p.feld === 'hoehe' && e.kind === 'gelaender' && (Number(wert) < 700 || Number(wert) > 1500)) {
      // Bestands-Bereich aus design.gelaenderZeichnen (SIA-Absturzsicherung) —
      // eigenschaftSetzen darf keinen Wert zulassen, den das Erstellen-Command
      // ablehnen würde (dasselbe Prinzip wie column b/t oben).
      throw new CommandError('hoehe muss zwischen 700 und 1500 mm liegen (SIA-Absturzsicherung, Bestands-Bereich design.gelaenderZeichnen)');
    }
    if (p.feld === 'art' && !GELAENDER_ART_WERTE.includes(String(wert) as (typeof GELAENDER_ART_WERTE)[number])) {
      throw new CommandError(`art muss eines von ${GELAENDER_ART_WERTE.join(', ')} sein`);
    }
    if (p.feld === 'width' && e.kind === 'ramp' && Number(wert) < 600) {
      // Bestands-Bereich aus design.rampeZeichnen (width min 600 mm) —
      // eigenschaftSetzen darf keinen Wert zulassen, den das Erstellen-
      // Command ablehnen würde (dasselbe Prinzip wie column b/t oben).
      throw new CommandError('width muss mindestens 600 mm betragen (Bestands-Bereich design.rampeZeichnen)');
    }
    if (p.feld === 'hoehenDelta' && e.kind === 'ramp' && Number(wert) <= 0) {
      throw new CommandError('hoehenDelta muss grösser als 0 sein');
    }
    if (p.feld === 'rahmenbreite' && Number(wert) <= 0) {
      throw new CommandError('rahmenbreite muss grösser als 0 sein');
    }
    if (p.feld === 'material') {
      // Column.material/Beam.material sind freie Katalogschlüssel (kein Enum
      // im Kernel, s. entities.ts) — number als String erlaubt, wie `number`
      // unten; einzige Validierung ist «nicht leer».
      wert = String(wert);
      if (wert.trim().length === 0) throw new CommandError('material darf nicht leer sein');
    }
    if (p.feld === 'number') {
      // Zone.number (Raumnummer, D2) ist freier Text — number als String
      // erlaubt (V088-SPEZ §3 E2), keine weitere Formvorgabe.
      wert = String(wert);
    }
    if (p.feld === 'typeId') {
      wert = String(wert);
      if (wert.trim().length === 0) throw new CommandError('typeId darf nicht leer sein');
    }
    if (p.feld === 'sia' && !['HNF', 'NNF', 'VF', 'FF', 'KF'].includes(String(wert))) {
      throw new CommandError('sia muss HNF, NNF, VF, FF oder KF sein');
    }
    if (p.feld === 'raumTyp' && !RAUMTYP_WERTE.includes(String(wert) as (typeof RAUMTYP_WERTE)[number])) {
      throw new CommandError(`raumTyp muss eines von ${RAUMTYP_WERTE.join(', ')} sein`);
    }
    if (p.feld === 'fluegelTyp' && !FLUEGELTYP_WERTE.includes(String(wert) as (typeof FLUEGELTYP_WERTE)[number])) {
      throw new CommandError(`fluegelTyp muss eines von ${FLUEGELTYP_WERTE.join(', ')} sein`);
    }
    if (p.feld === 'fensterTyp' && !FENSTERTYP_WERTE.includes(String(wert) as (typeof FENSTERTYP_WERTE)[number])) {
      throw new CommandError(`fensterTyp muss eines von ${FENSTERTYP_WERTE.join(', ')} sein`);
    }
    if (p.feld === 'band' && !BAND_WERTE.includes(String(wert) as (typeof BAND_WERTE)[number])) {
      throw new CommandError(`band muss eines von ${BAND_WERTE.join(', ')} sein`);
    }
    if (p.feld === 'griffseite' && !['links', 'rechts'].includes(String(wert))) {
      throw new CommandError('griffseite muss links oder rechts sein');
    }
    if (p.feld === 'status' && e.kind === 'kommentar' && !['offen', 'erledigt'].includes(String(wert))) {
      throw new CommandError('status muss offen oder erledigt sein');
    }
    if (p.feld === 'name' && e.kind === 'sheet') {
      // E4 (V0810-SPEZ §2, C-8): Blattname ist ein echtes Modellfeld
      // (Blattverzeichnis/Transmittal/Export lesen s.name direkt) — getrimmt,
      // Leer-/Nur-Whitespace-Wurf nach dem Bestandsmuster material/typeId
      // (design.ts:862-877).
      wert = String(wert).trim();
      if (wert.length === 0) throw new CommandError('Blattname darf nicht leer sein');
    }
    if (p.feld === 'assemblyId') require<Assembly>(doc, String(wert), 'assembly');
    // Merge-Hinweis v0.9.2 (Fable-Copy-back): P-G-ramp-Gate und P-P1-
    // profilId-Sonderpfad sind disjunkt (ramp trägt kein profilId, column/
    // beam keine ramp-Felder) — beide Zweige stehen nacheinander VOR dem
    // generischen Zuweisungspfad unten.
    if (e.kind === 'ramp') {
      // v0.9.2 P-G (V092-SPEZ §P-G): dasselbe ehrliche Gate wie
      // design.rampeGeometrieSetzen (Sanktion 4 — keine stille Klemmung),
      // hier auf dem NEUEN Zustand NACH der width/hoehenDelta/podestLaenge-
      // Änderung geprüft (a/b ändern sich hier nie, nur die drei Felder).
      const rampe = e as Rampe;
      // podestLaenge 0 (auch aus leerem String über die numerische
      // Normalisierung oben) entfernt das Feld ganz — exactOptionalPropertyTypes
      // verlangt den konditionalen Rest-Destructure statt `podestLaenge:
      // undefined` (Sanktion 5, keine Bestandsverhalten-Änderung ohne
      // gesetztes Feld).
      let next: Rampe;
      if (p.feld === 'podestLaenge' && Number(wert) === 0) {
        const { podestLaenge: _entfernt, ...ohnePodest } = rampe;
        next = ohnePodest;
      } else {
        next = { ...rampe, [p.feld]: wert };
      }
      const steigung = rampSteigungProzent(next.a, next.b, next.hoehenDelta, next.podestLaenge);
      if (steigung > 15) {
        throw new CommandError(
          `Rampensteigung ${steigung.toFixed(1)} % übersteigt die 15 %-Grenze (Tiefgarage)`,
        );
      }
      return [{ id: e.id, before: e, after: next }];
    }
    if (p.feld === 'profilId') {
      // v0.9.2 P-P1 (V092-SPEZ §P-P1): eigener Pfad statt des generischen
      // Zuweisungspfads unten — «leerer String entfernt das Feld» braucht
      // einen destrukturierenden Wegwurf (Muster `mangelStatusSetzen`
      // `const { behobenAm: _weg, ...ohne } = mangel`), keine simple
      // Überschreibung. Eine unbekannte Id wirft ehrlich (wie `assemblyId`
      // oben) — bei column/beam ist das schon durch `fields.includes` oben
      // sichergestellt (nur die beiden Kinds tragen `profilId`).
      if (String(p.wert).trim().length === 0) {
        const { profilId: _weg, ...ohne } = e as typeof e & { profilId?: string };
        void _weg;
        return [{ id: e.id, before: e, after: ohne as typeof e }];
      }
      require<Profil>(doc, String(p.wert), 'profil');
      const after = { ...e, profilId: String(p.wert) } as typeof e;
      return [{ id: e.id, before: e, after }];
    }
    const after = { ...e, [p.feld === 'name' && e.kind !== 'storey' && e.kind !== 'assembly' && e.kind !== 'zone' && e.kind !== 'sheet' ? 'meta' : p.feld]:
      p.feld === 'name' && e.kind !== 'storey' && e.kind !== 'assembly' && e.kind !== 'zone' && e.kind !== 'sheet'
        ? { ...e.meta, name: String(wert) }
        : wert } as typeof e;
    return [{ id: e.id, before: e, after }];
  },
});

export const setRole = registerCommand({
  id: 'design.rolleSetzen',
  title: 'Rolle setzen',
  description:
    'Setzt die Arbeitsrolle des Menschen im Büro (Vision «rollengerecht bereitstellen», Vorstufe): entwurf (Volumen, Grundrisse, Kennzahlen), ausfuehrung (Werkpläne, Mengen, Umbau) oder admin (Projektstand, Diagnose, Daten). Ordnet die Zentrale und färbt Kosmos Blick — KEINE Rechteverwaltung. Weglassen = neutral.',
  params: z.object({
    rolle: z.enum(['entwurf', 'ausfuehrung', 'admin']).optional(),
  }),
  summarize: (p) => (p.rolle ? `Rolle → ${p.rolle}` : 'Rolle neutral'),
  run: (doc, p) => [
    {
      settings: true as const,
      before: { rolle: doc.settings.rolle },
      after: { rolle: p.rolle ?? null },
    },
  ],
});

export const importKatalog = registerCommand({
  id: 'design.katalogImportieren',
  title: 'Katalog importieren',
  description:
    'Übernimmt einen exportierten Projekt-Katalog (kosmo.katalog/v1): Aufbauten, Zonen-Vorlagen, Fassadenmodule, Kennzahl-Formeln und Prioritäts-Overrides. Bestehendes gleichen Namens bleibt unangetastet (kein Überschreiben) — Projekt 2 startet mit dem Wissen von Projekt 1.',
  params: z.object({
    aufbauten: z
      .array(z.object({
        name: z.string().min(1),
        target: z.enum(['wall', 'slab', 'roof']).default('wall'),
        layers: z
          .array(z.object({
            material: z.string().min(1),
            thickness: z.number().int().positive(),
            function: z.enum(['tragend', 'daemmung', 'bekleidung', 'dichtung', 'hohlraum']),
          }))
          .min(1),
      }))
      .optional(),
    vorlagen: z.array(z.unknown()).optional(),
    fassadenModule: z.array(z.unknown()).optional(),
    kennzahlFormeln: z.array(z.unknown()).optional(),
    materialPrioritaeten: z.record(z.string(), z.number().int().min(0).max(999)).optional(),
  }),
  summarize: (p) =>
    `Katalog importieren (${p.aufbauten?.length ?? 0} Aufbauten, ${p.vorlagen?.length ?? 0} Vorlagen, ${p.fassadenModule?.length ?? 0} Module)`,
  run: (doc, p) => {
    const patches: AnyPatch[] = [];
    const habenAufbau = new Set(doc.byKind<Assembly>('assembly').map((a) => a.name));
    for (const a of p.aufbauten ?? []) {
      if (habenAufbau.has(a.name)) continue;
      habenAufbau.add(a.name);
      patches.push(
        added({ id: newId('assembly'), kind: 'assembly', name: a.name, target: a.target, layers: a.layers }),
      );
    }
    // Settings-Sammlungen: nach Name deduplizieren, nie überschreiben
    const benannt = (x: unknown): x is { name: string } =>
      typeof x === 'object' && x !== null && typeof (x as { name?: unknown }).name === 'string';
    const mische = <T extends { name: string }>(alt: T[], neu: unknown[] | undefined): T[] | null => {
      const haben = new Set(alt.map((v) => v.name));
      const dazu = (neu ?? []).filter(benannt).filter((v) => !haben.has(v.name)) as T[];
      return dazu.length > 0 ? [...alt, ...dazu] : null;
    };
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const vorlagen = mische(doc.settings.vorlagen, p.vorlagen);
    if (vorlagen) { before['vorlagen'] = doc.settings.vorlagen; after['vorlagen'] = vorlagen; }
    const module = mische(doc.settings.fassadenModule, p.fassadenModule);
    if (module) { before['fassadenModule'] = doc.settings.fassadenModule; after['fassadenModule'] = module; }
    const formeln = mische(doc.settings.kennzahlFormeln, p.kennzahlFormeln);
    if (formeln) { before['kennzahlFormeln'] = doc.settings.kennzahlFormeln; after['kennzahlFormeln'] = formeln; }
    if (p.materialPrioritaeten) {
      const alt = doc.settings.materialPrioritaeten ?? {};
      const neu = { ...p.materialPrioritaeten, ...alt }; // Bestehendes gewinnt
      if (Object.keys(neu).length > Object.keys(alt).length) {
        before['materialPrioritaeten'] = alt;
        after['materialPrioritaeten'] = neu;
      }
    }
    if (Object.keys(after).length > 0) {
      patches.push({ settings: true as const, before, after } as AnyPatch);
    }
    if (patches.length === 0) {
      throw new CommandError('Nichts zu importieren — alles ist schon im Projekt');
    }
    return patches;
  },
});

export const setEtikett = registerCommand({
  id: 'design.etikettSetzen',
  title: 'Etikett setzen',
  description:
    'Setzt eine assoziative Etikette an ein Bauteil (Wand, Decke, Stütze, Unterzug): inhalt «aufbau» beschriftet Aufbau/Querschnitt LIVE aus der Parametrik, «keynote» verweist auf eine Nummer aus design.keynoteSetzen — die Blatt-Legende schreibt den Text aus. at = Text-Anker in Welt-mm, der Leader zeigt zum Bauteil. Sichtbar ab Bauprojekt.',
  params: z.object({
    targetId: z.string(),
    at: PtSchema,
    inhalt: z.enum(['aufbau', 'keynote']).default('aufbau'),
    keynote: z.string().optional().describe('Keynote-Nummer, z.B. K3 (nur inhalt keynote)'),
  }),
  summarize: (p) => (p.inhalt === 'keynote' ? `Etikett ${p.keynote ?? '?'}` : 'Aufbau-Etikett'),
  run: (doc, p) => {
    const target = doc.get(p.targetId);
    if (!target || !['wall', 'slab', 'column', 'beam'].includes(target.kind)) {
      throw new CommandError('Etiketten gehören an Wand, Decke, Stütze oder Unterzug');
    }
    if (p.inhalt === 'keynote') {
      if (!p.keynote) throw new CommandError('inhalt «keynote» braucht eine Keynote-Nummer');
      if (!(doc.settings.keynotes ?? []).some((k) => k.nr === p.keynote)) {
        throw new CommandError(`Keynote «${p.keynote}» existiert nicht — zuerst design.keynoteSetzen`);
      }
    }
    const etikett: import('../model/entities').Etikett = {
      id: newId('etikett'),
      kind: 'etikett',
      storeyId: (target as { storeyId: string }).storeyId,
      targetId: p.targetId,
      at: p.at as Pt,
      inhalt: p.inhalt,
      ...(p.keynote ? { keynote: p.keynote } : {}),
    };
    return [added(etikett)];
  },
});

export const setKeynote = registerCommand({
  id: 'design.keynoteSetzen',
  title: 'Keynote setzen',
  description:
    'Pflegt die zentrale Notizliste (RE-ARCHICAD A6): nr + text legt an oder ersetzt, text weglassen löscht die Nummer. Etiketten verweisen mit der Nummer, die Blatt-Legende schreibt den Text aus.',
  params: z.object({
    nr: z.string().min(1).describe('Nummer, z.B. K1'),
    text: z.string().optional().describe('Notiztext; weglassen = Keynote löschen'),
  }),
  summarize: (p) => (p.text ? `Keynote ${p.nr}: ${p.text.slice(0, 40)}` : `Keynote ${p.nr} löschen`),
  run: (doc, p) => {
    const vorher = doc.settings.keynotes ?? [];
    if (p.text === undefined && !vorher.some((k) => k.nr === p.nr)) {
      throw new CommandError(`Keynote «${p.nr}» existiert nicht`);
    }
    const rest = vorher.filter((k) => k.nr !== p.nr);
    const nachher = p.text === undefined ? rest : [...rest, { nr: p.nr, text: p.text }];
    nachher.sort((a, b) => a.nr.localeCompare(b.nr, 'de-CH', { numeric: true }));
    return [{ settings: true as const, before: { keynotes: vorher }, after: { keynotes: nachher } }];
  },
});

export const saveThemenPlan = registerCommand({
  id: 'design.themenPlanSpeichern',
  title: 'Themenplan speichern',
  description:
    'Speichert einen Themenplan (RE-ARCHICAD A5, grafische Überschreibungen): Regeln Kriterium→Farbe, die eine Blatt-Platzierung tönen — z.B. Brandschutzplan (raumTyp treppenhaus → rot) oder Materialplan (material beton → grau). Gleicher Name ersetzt. Aktivieren je Blatt via publish.ansichtAnpassen (thema).',
  params: z.object({
    name: z.string().min(1),
    regeln: z
      .array(z.object({
        kriterium: z.enum(['raumTyp', 'material', 'klasse']),
        wert: z.string().min(1).describe('z.B. treppenhaus, beton, treppe'),
        farbe: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Hex-Farbe wie #cc3322'),
        label: z.string().optional().describe('Legenden-Text; fehlt = wert'),
      }))
      .min(1),
  }),
  summarize: (p) => `Themenplan «${p.name}» (${p.regeln.length} Regeln)`,
  run: (doc, p) => {
    const vorher = doc.settings.themen ?? [];
    const plan = {
      name: p.name,
      regeln: p.regeln.map((r) => ({
        kriterium: r.kriterium,
        wert: r.wert,
        farbe: r.farbe,
        ...(r.label !== undefined ? { label: r.label } : {}),
      })),
    };
    return [
      {
        settings: true as const,
        before: { themen: vorher },
        after: { themen: [...vorher.filter((t) => t.name !== p.name), plan] },
      },
    ];
  },
});

export const removeThemenPlan = registerCommand({
  id: 'design.themenPlanEntfernen',
  title: 'Themenplan entfernen',
  description: 'Entfernt einen Themenplan — Platzierungen mit diesem Thema zeigen wieder den normalen Plan.',
  params: z.object({ name: z.string().min(1) }),
  summarize: (p) => `Themenplan «${p.name}» entfernen`,
  run: (doc, p) => {
    const vorher = doc.settings.themen ?? [];
    if (!vorher.some((t) => t.name === p.name)) {
      throw new CommandError(`Themenplan «${p.name}» existiert nicht`);
    }
    return [
      {
        settings: true as const,
        before: { themen: vorher },
        after: { themen: vorher.filter((t) => t.name !== p.name) },
      },
    ];
  },
});

export const setPrioritaet = registerCommand({
  id: 'design.prioritaetSetzen',
  title: 'Verschneidungspriorität setzen',
  description:
    'Setzt die Verschneidungspriorität eines Materials (0–999, ArchiCAD-Modell): beim Poché-Join schneidet die höhere Priorität die niedrigere (Beton stösst durch, Dämmung weicht). prioritaet weglassen = zurück auf den Katalog-Default.',
  params: z.object({
    material: z.string().min(1).describe('Material-Schlüssel, z.B. beton, kalksandstein, daemmung-mw'),
    prioritaet: z.number().int().min(0).max(999).optional(),
  }),
  summarize: (p) =>
    p.prioritaet === undefined
      ? `Priorität ${p.material} → Katalog-Default`
      : `Priorität ${p.material} → ${p.prioritaet}`,
  run: (doc, p) => {
    const vorher = doc.settings.materialPrioritaeten ?? {};
    const nachher = { ...vorher };
    if (p.prioritaet === undefined) delete nachher[p.material];
    else nachher[p.material] = p.prioritaet;
    return [
      {
        settings: true as const,
        before: { materialPrioritaeten: vorher },
        after: { materialPrioritaeten: nachher },
      },
    ];
  },
});

export const setTerrain = registerCommand({
  id: 'design.terrainSetzen',
  title: 'Terrain setzen',
  description:
    'Setzt das Terrainprofil (3D-Polylinie übers Grundstück, z über Projektnull in mm). typ «gewachsen» (im Schnitt gestrichelt) oder «neu» (ausgezogen, SIA 400). Pro Typ existiert EIN Profil — erneutes Setzen ersetzt es. Löschen über design.loeschen.',
  params: z.object({
    typ: z.enum(['gewachsen', 'neu']).default('gewachsen'),
    punkte: z
      .array(z.object({
        x: z.number().int().describe('X in mm'),
        y: z.number().int().describe('Y in mm'),
        z: z.number().int().describe('Höhe über Projektnull in mm'),
      }))
      .min(2)
      .describe('Stützpunkte, linear interpoliert'),
  }),
  summarize: (p) => `Terrain ${p.typ}: ${p.punkte.length} Stützpunkte`,
  run: (doc, p) => {
    const bestehend = doc
      .byKind<import('../model/entities').Terrain>('terrain')
      .find((t) => t.typ === p.typ);
    if (bestehend) {
      return [{ id: bestehend.id, before: bestehend, after: { ...bestehend, punkte: p.punkte } }];
    }
    const terrain: import('../model/entities').Terrain = {
      id: newId('terrain'),
      kind: 'terrain',
      typ: p.typ,
      punkte: p.punkte,
    };
    return [added(terrain)];
  },
});

export const setColumn = registerCommand({
  id: 'design.stuetzeSetzen',
  title: 'Stütze setzen',
  description:
    'Setzt eine geschosshohe Stütze (Skelettbau). profil rechteck (b×t, rotationGrad) oder rund (b = Durchmesser). Material aus dem Katalog (beton, holz-bsh, stahl …).',
  params: z.object({
    storeyId: z.string(),
    at: PtSchema,
    profil: z.enum(['rechteck', 'rund']).default('rechteck'),
    b: z.number().int().min(80).max(2000).default(300).describe('Breite bzw. Durchmesser in mm'),
    t: z.number().int().min(80).max(2000).optional().describe('Tiefe in mm (rechteck; fehlt = quadratisch)'),
    material: z.string().default('beton'),
    rotationGrad: z.number().optional(),
  }),
  summarize: (p) =>
    `Stütze ${p.profil === 'rund' ? `Ø ${p.b}` : `${p.b}×${p.t ?? p.b}`} mm (${p.material})`,
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const column: import('../model/entities').Column = {
      id: newId('stuetze'),
      kind: 'column',
      storeyId: p.storeyId,
      at: p.at as Pt,
      profil: p.profil,
      b: p.b,
      material: p.material,
      ...(p.t !== undefined ? { t: p.t } : {}),
      ...(p.rotationGrad !== undefined ? { rotationGrad: p.rotationGrad } : {}),
    };
    return [added(column)];
  },
});

export const drawBeam = registerCommand({
  id: 'design.unterzugZeichnen',
  title: 'Unterzug zeichnen',
  description:
    'Zeichnet einen Unterzug von a nach b — Oberkante = OK Geschoss, der Balken hängt unter der Decke (breite × hoehe in mm).',
  params: z.object({
    storeyId: z.string(),
    a: PtSchema,
    b: PtSchema,
    breite: z.number().int().min(80).max(2000).default(300),
    hoehe: z.number().int().min(100).max(3000).default(400),
    material: z.string().default('beton'),
  }),
  summarize: (p) => {
    const len = Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y);
    return `Unterzug ${p.breite}×${p.hoehe} mm, ${formatLength(Math.round(len))}`;
  },
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    if (Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y) < 100) {
      throw new CommandError('Unterzug braucht eine Achse von mindestens 10 cm');
    }
    const beam: import('../model/entities').Beam = {
      id: newId('unterzug'),
      kind: 'beam',
      storeyId: p.storeyId,
      a: p.a as Pt,
      b: p.b as Pt,
      breite: p.breite,
      hoehe: p.hoehe,
      material: p.material,
    };
    return [added(beam)];
  },
});

export const columnsFromGrid = registerCommand({
  id: 'design.stuetzenAusRaster',
  title: 'Stützen auf Rasterkreuzungen',
  description:
    'Setzt auf jede Kreuzung der Haupt-Tragachsen (Stützenraster) eine Stütze — besetzte Kreuzungen bleiben, es entstehen keine Doppel.',
  params: z.object({
    storeyId: z.string(),
    profil: z.enum(['rechteck', 'rund']).default('rechteck'),
    b: z.number().int().min(80).max(2000).default(300),
    material: z.string().default('beton'),
  }),
  summarize: (p) => `Stützen ${p.profil === 'rund' ? `Ø ${p.b}` : `${p.b}×${p.b}`} auf alle Rasterkreuzungen`,
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const achsen = doc
      .byKind<GridAxis>('grid')
      .filter((g) => g.storeyId === p.storeyId && (g.typ ?? 'haupt') === 'haupt');
    if (achsen.length < 2) {
      throw new CommandError('Kein Stützenraster im Geschoss — zuerst design.rasterSetzen');
    }
    // Segment-Schnittpunkte aller Achsenpaare, dedupliziert auf 1 mm
    const kreuzungen = new Map<string, Pt>();
    for (let i = 0; i < achsen.length; i++) {
      for (let j = i + 1; j < achsen.length; j++) {
        const g1 = achsen[i]!;
        const g2 = achsen[j]!;
        const d1 = { x: g1.b.x - g1.a.x, y: g1.b.y - g1.a.y };
        const d2 = { x: g2.b.x - g2.a.x, y: g2.b.y - g2.a.y };
        const det = d1.x * d2.y - d1.y * d2.x;
        if (Math.abs(det) < 1e-9) continue; // parallel
        const t = ((g2.a.x - g1.a.x) * d2.y - (g2.a.y - g1.a.y) * d2.x) / det;
        const u = ((g2.a.x - g1.a.x) * d1.y - (g2.a.y - g1.a.y) * d1.x) / det;
        if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) continue;
        const s = { x: Math.round(g1.a.x + d1.x * t), y: Math.round(g1.a.y + d1.y * t) };
        kreuzungen.set(`${s.x}:${s.y}`, s);
      }
    }
    if (kreuzungen.size === 0) throw new CommandError('Die Achsen kreuzen sich nirgends');
    const bestehende = doc
      .byKind<import('../model/entities').Column>('column')
      .filter((c) => c.storeyId === p.storeyId);
    const patches: AnyPatch[] = [];
    for (const at of kreuzungen.values()) {
      if (bestehende.some((c) => Math.hypot(c.at.x - at.x, c.at.y - at.y) < 50)) continue;
      const column: import('../model/entities').Column = {
        id: newId('stuetze'),
        kind: 'column',
        storeyId: p.storeyId,
        at,
        profil: p.profil,
        b: p.b,
        material: p.material,
      };
      patches.push(added(column));
    }
    if (patches.length === 0) {
      throw new CommandError('Alle Kreuzungen sind schon besetzt — nichts zu tun');
    }
    return patches;
  },
});

export const setAussparung = registerCommand({
  id: 'design.aussparungSetzen',
  title: 'Aussparung/Durchbruch setzen',
  description:
    'Setzt eine Aussparung (Durchbruch oder Schlitz) an einer Wand oder Decke — als Werkplan-Symbol mit Kote (Kreuz + «D/S b×h»), OHNE die Geometrie zu schneiden. Wand: center = Mitte in mm entlang der Achse, sill = Unterkante über OK Boden. Decke: at = Mittelpunkt in Welt-mm. breite × hoehe = Öffnungsmass in mm.',
  params: z.object({
    hostId: z.string().describe('Wand- oder Decken-ID'),
    typ: z.enum(['durchbruch', 'schlitz']).default('durchbruch'),
    center: z.number().int().optional().describe('Wand: Mitte entlang der Achse, mm ab a'),
    at: PtSchema.optional().describe('Decke: Mittelpunkt in Welt-mm'),
    breite: z.number().int().positive(),
    hoehe: z.number().int().positive(),
    sill: z.number().int().optional().describe('Wand: Unterkante über OK Boden, mm'),
  }),
  summarize: (p) => `${p.typ === 'schlitz' ? 'Schlitz' : 'Durchbruch'} ${p.breite}×${p.hoehe}`,
  run: (doc, p) => {
    const host = doc.get(p.hostId);
    if (!host || (host.kind !== 'wall' && host.kind !== 'slab')) {
      throw new CommandError('Aussparungen brauchen eine Wand oder Decke als Wirt');
    }
    if (host.kind === 'wall') {
      if (p.center === undefined) throw new CommandError('Wand-Aussparung braucht «center» (mm entlang der Achse)');
      const len = Math.hypot(host.b.x - host.a.x, host.b.y - host.a.y);
      if (p.center - p.breite / 2 < 0 || p.center + p.breite / 2 > len) {
        throw new CommandError(`Aussparung ragt über die Wand hinaus (Achse 0–${Math.round(len)} mm)`);
      }
    } else if (!p.at) {
      throw new CommandError('Decken-Aussparung braucht «at» (Mittelpunkt in Welt-mm)');
    }
    const aussparung: import('../model/entities').Aussparung = {
      id: newId('aussparung'),
      kind: 'aussparung',
      storeyId: host.storeyId,
      hostId: p.hostId,
      typ: p.typ,
      breite: p.breite,
      hoehe: p.hoehe,
      ...(p.center !== undefined ? { center: p.center } : {}),
      ...(p.at ? { at: p.at as Pt } : {}),
      ...(p.sill !== undefined ? { sill: p.sill } : {}),
    };
    return [added(aussparung)];
  },
});

export const setRenovation = registerCommand({
  id: 'design.renovationSetzen',
  title: 'Umbau-Status setzen',
  description:
    'Setzt den Umbau-Status auf Elemente (Umbau-Pläne nach SIA 400: Bestand einheitlich grau, Neubau rot, Abbruch gelb — je EINE Fläche, kein Kreuz, keine Konstruktionsachsen im Druckbild). status weglassen = Status entfernen (Element gilt wieder als normal).',
  params: z.object({
    ids: z.array(z.string()).min(1).describe('Element-IDs'),
    status: z.enum(['bestand', 'neu', 'abbruch']).optional(),
  }),
  summarize: (p) =>
    p.status
      ? `${p.ids.length} Element(e) → ${p.status}`
      : `Umbau-Status entfernt (${p.ids.length} Element(e))`,
  run: (doc, p) => {
    const patches: AnyPatch[] = [];
    for (const id of p.ids) {
      const e = doc.get(id);
      if (!e) throw new CommandError(`Element «${id}» existiert nicht`);
      if (e.kind === 'storey' || e.kind === 'assembly' || e.kind === 'sheet') {
        throw new CommandError(`Umbau-Status gilt für Bauteile, nicht für ${e.kind}`);
      }
      const meta = { ...e.meta };
      if (p.status) meta.renovation = p.status;
      else delete meta.renovation;
      patches.push({ id: e.id, before: e, after: { ...e, meta } as typeof e });
    }
    return patches;
  },
});

export const createStair = registerCommand({
  id: 'design.treppeErstellen',
  title: 'Treppe erstellen',
  description:
    'Erstellt eine Treppe von a (Antritt) nach b im Geschoss. form: gerade (Default), podest (gerader Lauf mit Zwischenpodest), u (zwei parallele Läufe mit Wendepodest hinter b, Austritt neben a) oder l (gewendelt über Eckpodest — braucht ecke). Steigung aus der Geschosshöhe (Schrittmassregel 2s+a ≈ 630 mm). width = Laufbreite in mm (Standard 1200, CH-Minimum 1000).',
  params: z.object({
    storeyId: z.string(),
    a: PtSchema,
    b: PtSchema,
    width: z.number().int().min(800).default(1200),
    form: z.enum(['gerade', 'podest', 'u', 'l']).default('gerade'),
    ecke: PtSchema.optional().describe('Eckpunkt des L-Laufs (nur form «l»)'),
  }),
  summarize: (p) => {
    const len = Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y);
    const formName = { gerade: '', podest: ' mit Podest', u: ' U-Lauf', l: ' L-Lauf' }[p.form ?? 'gerade'];
    return `Treppe${formName} ${formatLength(Math.round(len))}, ${p.width} mm breit`;
  },
  run: (doc, p) => {
    const storey = require<Storey>(doc, p.storeyId, 'storey');
    const len = Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y);
    if (len < 1000) throw new CommandError('Treppenlauf zu kurz (< 1 m)');
    if (p.form === 'l' && !p.ecke) throw new CommandError('L-Lauf braucht den Eckpunkt «ecke»');
    const stair: Stair = {
      id: newId('treppe'),
      kind: 'stair',
      storeyId: p.storeyId,
      a: p.a as Pt,
      b: p.b as Pt,
      width: p.width,
      ...(p.form && p.form !== 'gerade' ? { form: p.form } : {}),
      ...(p.ecke ? { ecke: p.ecke as Pt } : {}),
    };
    // Steigungs-Gate über die tatsächliche Gesamtlauflänge der Form
    const teile = treppenTeile(stair, storey.height, storey.elevation);
    if (teile.spec.riser > 200) {
      throw new CommandError(
        `Lauf zu kurz für ${formatLength(storey.height)} Geschosshöhe: Steigung wäre ${Math.round(teile.spec.riser)} mm (max. 200). Mindestens ${formatLength(Math.round(teile.spec.minRun))} Gesamtlauf nötig.`,
      );
    }
    return [added(stair)];
  },
});

/**
 * v0.9.1 P-A2 (`docs/V091-SPEZ.md` §P-A2): Rampe von a (Fuss) nach b (Kopf).
 * EHRLICHES Steigungs-Gate (Sanktion 4 — nie still klemmen): >6 % läuft
 * durch, der Hinweis «nicht hindernisfrei (SIA 500: >6 %)» reist nur im
 * `summarize`-Text mit (keine Warnung im Doc/Patch nötig — der Text erklärt
 * dem Menschen die Lage, ohne die Geometrie zu verändern); >15 % wird HART
 * abgelehnt (Tiefgaragen-Grenze), die Rampe entsteht dann gar nicht erst.
 * Die Steigung selbst wird nie gespeichert — `rampSteigungProzent`
 * (`derive/rampe.ts`) rechnet sie bei jedem Aufruf frisch aus a/b/
 * hoehenDelta/podestLaenge.
 */
export const createRamp = registerCommand({
  id: 'design.rampeZeichnen',
  title: 'Rampe erstellen',
  description:
    'Erstellt eine Rampe von a (Fuss, unten) nach b (Kopf, oben) im Geschoss. hoehenDelta = zu überwindender Höhenunterschied in mm. Steigung wird IMMER aus hoehenDelta/Lauflänge abgeleitet (nie gespeichert). EHRLICHES Steigungs-Gate: >6 % läuft durch, ist aber nicht hindernisfrei (SIA 500); >15 % wird abgelehnt (Tiefgaragen-Grenze) — keine stillen Klemmungen. width = Rampenbreite in mm (Standard 1200). Optionales podestLaenge markiert ein ebenes Zwischenstück am Kopfende, das nicht zur Steigungsstrecke zählt.',
  params: z.object({
    storeyId: z.string(),
    a: PtSchema,
    b: PtSchema,
    width: z.number().int().min(600).default(1200),
    hoehenDelta: z.number().int().positive().describe('Zu überwindender Höhenunterschied a→b, mm'),
    podestLaenge: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Optionales ebenes Podest am Kopfende, mm — zählt nicht zur Steigungsstrecke'),
  }),
  summarize: (p) => {
    const laenge = dist(p.a as Pt, p.b as Pt);
    const steigung = rampSteigungProzent(p.a as Pt, p.b as Pt, p.hoehenDelta, p.podestLaenge);
    const basis = `Rampe ${formatLength(Math.round(laenge))} Lauf, ${steigung.toFixed(1)} % Steigung`;
    return steigung > 6 ? `${basis} — nicht hindernisfrei (SIA 500: >6 %)` : basis;
  },
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const laenge = dist(p.a as Pt, p.b as Pt);
    if (laenge < 500) throw new CommandError('Rampenlauf zu kurz (< 0.5 m)');
    const steigung = rampSteigungProzent(p.a as Pt, p.b as Pt, p.hoehenDelta, p.podestLaenge);
    // Harte Grenze (Tiefgarage, SIA 500 Maximalwert) — läuft NICHT durch,
    // keine stille Klemmung auf 15 % (Sanktion 4): die Rampe entsteht gar
    // nicht erst, der Grund steht im Fehlertext.
    if (steigung > 15) {
      throw new CommandError(
        `Rampensteigung ${steigung.toFixed(1)} % übersteigt die 15 %-Grenze (Tiefgarage)`,
      );
    }
    const rampe: Rampe = {
      id: newId('rampe'),
      kind: 'ramp',
      storeyId: p.storeyId,
      a: p.a as Pt,
      b: p.b as Pt,
      width: p.width,
      hoehenDelta: p.hoehenDelta,
      ...(p.podestLaenge !== undefined ? { podestLaenge: p.podestLaenge } : {}),
    };
    return [added(rampe)];
  },
});

/**
 * v0.9.1 P-B1 (`docs/V091-SPEZ.md` §P-B1): In-place-Endpunkt-Setter für die
 * Rampe — Muster `design.treppeGeometrieSetzen` (E1, V087-SPEZ). Identität,
 * width, hoehenDelta, podestLaenge und storeyId bleiben, NUR a/b ändern
 * sich. Dieselben EHRLICHEN Wurf-Regeln wie `design.rampeZeichnen` auf der
 * NEUEN Geometrie: Lauf < 0.5 m und Steigung > 15 % (Tiefgaragen-Grenze)
 * verhindern jeden Patch (KEINE stille Klemmung, Sanktion 4 V091-SPEZ);
 * 6–15 % läuft durch und trägt den SIA-500-Hinweis nur im Summary.
 */
export const setRampGeometry = registerCommand({
  id: 'design.rampeGeometrieSetzen',
  title: 'Rampen-Geometrie setzen',
  description:
    'Setzt Fusspunkt (a) und/oder Kopfpunkt (b) einer bestehenden Rampe neu, OHNE sie zu ersetzen: Identität, width, hoehenDelta, podestLaenge und storeyId bleiben erhalten. Mindestens einer der Punkte a/b ist Pflicht. Dieselben Regeln wie design.rampeZeichnen gelten auf der NEUEN Geometrie: Lauf < 0.5 m und Steigung > 15 % (Tiefgaragen-Grenze) verhindern jeden Patch — die Rampe bleibt unangetastet; 6–15 % läuft durch (nicht hindernisfrei, SIA 500). EIN Command = EIN Undo-Schritt.',
  params: z.object({
    entityId: z.string(),
    a: PtSchema.optional(),
    b: PtSchema.optional(),
  }),
  summarize: (p, doc) => {
    const r = doc.get<Rampe>(p.entityId);
    const a = (p.a ?? r?.a) as Pt | undefined;
    const b = (p.b ?? r?.b) as Pt | undefined;
    if (!r || !a || !b) return 'Rampen-Geometrie gesetzt';
    const steigung = rampSteigungProzent(a, b, r.hoehenDelta, r.podestLaenge);
    const basis = `Rampe ${formatLength(Math.round(dist(a, b)))} Lauf, ${steigung.toFixed(1)} % Steigung`;
    return steigung > 6 ? `${basis} — nicht hindernisfrei (SIA 500: >6 %)` : basis;
  },
  run: (doc, p) => {
    if (!p.a && !p.b) {
      throw new CommandError('design.rampeGeometrieSetzen braucht mindestens einen Punkt (a oder b)');
    }
    const rampe = require<Rampe>(doc, p.entityId, 'ramp');
    const neueA = (p.a ?? rampe.a) as Pt;
    const neueB = (p.b ?? rampe.b) as Pt;
    if (dist(neueA, neueB) < 500) throw new CommandError('Rampenlauf zu kurz (< 0.5 m)');
    const steigung = rampSteigungProzent(neueA, neueB, rampe.hoehenDelta, rampe.podestLaenge);
    if (steigung > 15) {
      throw new CommandError(
        `Rampensteigung ${steigung.toFixed(1)} % übersteigt die 15 %-Grenze (Tiefgarage)`,
      );
    }
    return [{ id: rampe.id, before: rampe, after: { ...rampe, a: neueA, b: neueB } }];
  },
});

/**
 * E1 (V087-SPEZ, `docs/V087-SPEZ.md` §3): In-place-Endpunkt-Setter für eine
 * bestehende Treppe, Muster `design.wandGeometrieSetzen` (E1, V086-SPEZ) —
 * Identität/width/form/storeyId bleiben, NUR a/b/ecke ändern sich. Die
 * Wurf-Regeln laufen VOR jedem Patch auf der NEUEN Geometrie und sind
 * deckungsgleich mit `design.treppeErstellen`: (1) Gesamtlauf a→b < 1 m
 * (dieselbe rohe Achsdistanz wie im Erstellen-Command, nicht die geformte
 * `gesamtLauflaenge` aus `treppenTeile`); (2) `ecke` nur bei form «l»
 * zulässig; (3) form «l» braucht eine (bestehende oder neue) `ecke`; (4)
 * degenerierte Teilstrecken um die Ecke (< 1 mm) — Punkt (1) deckt |a−b|
 * bereits ab, da 1 mm < 1000 mm; (5) Steigungs-Gate über `treppenTeile` der
 * NEUEN Stair (riser > 200 mm), dieselbe Meldung wie beim Erstellen.
 */
export const setStairGeometry = registerCommand({
  id: 'design.treppeGeometrieSetzen',
  title: 'Treppen-Geometrie setzen',
  description:
    'Setzt Antritt (a), Austritt (b) und/oder Eckpunkt (ecke) einer bestehenden Treppe neu, OHNE sie zu ersetzen: Identität, width, form und storeyId bleiben erhalten. Mindestens einer der Punkte a/b/ecke ist Pflicht. «ecke» ist nur bei form «l» zulässig. Dieselben Wurf-Regeln wie design.treppeErstellen gelten auf der NEUEN Geometrie: Gesamtlauf < 1 m, form «l» ohne ecke, degenerierte Punkte um die Ecke (< 1 mm) und das Steigungs-Gate (riser > 200 mm) verhindern jeden Patch — die Treppe bleibt unangetastet. EIN Command = EIN Undo-Schritt.',
  params: z.object({
    entityId: z.string(),
    a: PtSchema.optional(),
    b: PtSchema.optional(),
    ecke: PtSchema.optional().describe('Eckpunkt des L-Laufs (nur form «l»)'),
  }),
  summarize: (p, doc) => {
    const stair = doc.get<Stair>(p.entityId);
    const neueA = (p.a ?? stair?.a) as Pt | undefined;
    const neueB = (p.b ?? stair?.b) as Pt | undefined;
    const laenge = neueA && neueB ? Math.round(dist(neueA, neueB)) : 0;
    return `Treppen-Geometrie ${formatLength(laenge)}`;
  },
  run: (doc, p) => {
    if (!p.a && !p.b && !p.ecke) {
      throw new CommandError('design.treppeGeometrieSetzen braucht mindestens einen Punkt (a, b oder ecke)');
    }
    const stair = require<Stair>(doc, p.entityId, 'stair');
    const storey = require<Storey>(doc, stair.storeyId, 'storey');
    const neueA = (p.a ?? stair.a) as Pt;
    const neueB = (p.b ?? stair.b) as Pt;
    const neueEcke = (p.ecke ?? stair.ecke) as Pt | undefined;

    // (1) Gesamtlauf < 1 m — dieselbe rohe a→b-Distanz wie treppeErstellen
    const len = Math.hypot(neueB.x - neueA.x, neueB.y - neueA.y);
    if (len < 1000) throw new CommandError('Treppenlauf zu kurz (< 1 m)');

    // (2) ecke nur bei form «l» zulässig
    if (p.ecke && stair.form !== 'l') {
      throw new CommandError('«ecke» ist nur bei form «l» zulässig');
    }

    // (3) form «l» braucht (bestehende oder neue) ecke
    if (stair.form === 'l' && !neueEcke) {
      throw new CommandError('L-Lauf braucht den Eckpunkt «ecke»');
    }

    // (4) degeneriert (< 1 mm): die beiden Teilstrecken um die Ecke — |a−b|
    // selbst deckt bereits Punkt (1) ab (1 mm < 1000 mm).
    if (stair.form === 'l' && neueEcke) {
      if (Math.hypot(neueEcke.x - neueA.x, neueEcke.y - neueA.y) < 1) {
        throw new CommandError('Treppe degeneriert (a und ecke liegen praktisch übereinander)');
      }
      if (Math.hypot(neueB.x - neueEcke.x, neueB.y - neueEcke.y) < 1) {
        throw new CommandError('Treppe degeneriert (ecke und b liegen praktisch übereinander)');
      }
    }

    const neu: Stair = {
      ...stair,
      a: neueA,
      b: neueB,
      ...(neueEcke ? { ecke: neueEcke } : {}),
    };

    // (5) Steigungs-Gate über die tatsächliche Gesamtlauflänge der Form
    const teile = treppenTeile(neu, storey.height, storey.elevation);
    if (teile.spec.riser > 200) {
      throw new CommandError(
        `Lauf zu kurz für ${formatLength(storey.height)} Geschosshöhe: Steigung wäre ${Math.round(teile.spec.riser)} mm (max. 200). Mindestens ${formatLength(Math.round(teile.spec.minRun))} Gesamtlauf nötig.`,
      );
    }

    return [{ id: stair.id, before: stair, after: neu }];
  },
});

/**
 * Geländer (v0.9.1 P-A1, `docs/V091-SPEZ.md` K24) — echtes Werkzeug statt nur
 * des 2D-Beschlagshinweises `Opening.absturzsicherung`. Muster
 * `design.massKetteSetzen`: eine offene Polylinie (mind. zwei Punkte). Die
 * Höhe wird EHRLICH gegen den SIA-Absturzsicherungsbereich 700–1500 mm
 * geprüft (zod `.min`/`.max`) — Werte ausserhalb werden abgelehnt, NICHT
 * stillschweigend geklemmt (Sanktion 4, V091-SPEZ).
 */
export const drawGelaender = registerCommand({
  id: 'design.gelaenderZeichnen',
  title: 'Geländer zeichnen',
  description:
    'Zeichnet ein Geländer als Polylinie (mind. zwei Punkte, Welt-mm) im aktiven Geschoss. hoehe = Geländerhöhe ab OK Boden in mm (Standard 1000, zulässiger Bereich 700–1500 — SIA-Absturzsicherung, Werte ausserhalb werden abgelehnt statt geklemmt). art: staketen (Standard, senkrechte Stäbe), handlauf (nur das Band) oder voll (geschlossene Brüstung).',
  params: z.object({
    storeyId: z.string(),
    punkte: z.array(PtSchema).min(2),
    hoehe: z
      .number()
      .int()
      .min(700, 'hoehe muss mindestens 700 mm sein (SIA-Absturzsicherung)')
      .max(1500, 'hoehe darf höchstens 1500 mm sein')
      .default(1000),
    art: z.enum(['staketen', 'handlauf', 'voll']).default('staketen'),
  }),
  summarize: (p) => {
    const pts = p.punkte as Pt[];
    let gesamt = 0;
    for (let i = 1; i < pts.length; i++) gesamt += dist(pts[i - 1]!, pts[i]!);
    return `Geländer ${formatLength(Math.round(gesamt))}, ${p.hoehe} mm hoch (${p.art})`;
  },
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const gelaender: Gelaender = {
      id: newId('gelaender'),
      kind: 'gelaender',
      storeyId: p.storeyId,
      punkte: p.punkte as Pt[],
      hoehe: p.hoehe,
      art: p.art,
    };
    return [added(gelaender)];
  },
});

/**
 * v0.9.1 P-B1 (`docs/V091-SPEZ.md` §P-B1): Punkt-Zug IN PLACE — wortgleiches
 * Muster `design.massKetteGeometrieSetzen` (E8, V089-SPEZ): Identität,
 * storeyId, hoehe und art bleiben, NUR `punkte[punktIndex]` ändert sich; ein
 * Index ausserhalb wirft, das Geländer bleibt unangetastet.
 */
export const setGelaenderGeometry = registerCommand({
  id: 'design.gelaenderGeometrieSetzen',
  title: 'Geländer-Geometrie setzen',
  description:
    'Setzt EINEN Punkt eines bestehenden Geländers neu (punktIndex, 0-basiert), OHNE es zu ersetzen: Identität, storeyId, hoehe und art bleiben erhalten. Ein punktIndex ausserhalb der Polylinie wirft — das Geländer bleibt unangetastet. EIN Command = EIN Undo-Schritt.',
  params: z.object({
    entityId: z.string(),
    punktIndex: z.number().int().min(0),
    punkt: PtSchema,
  }),
  summarize: (p, doc) => {
    const g = doc.get<Gelaender>(p.entityId);
    const pts = g?.punkte;
    if (!pts) return 'Geländer-Punkt gesetzt';
    let gesamt = 0;
    for (let i = 1; i < pts.length; i++) gesamt += dist(pts[i - 1]!, pts[i]!);
    return `Geländer ${formatLength(Math.round(gesamt))}`;
  },
  run: (doc, p) => {
    const gelaender = require<Gelaender>(doc, p.entityId, 'gelaender');
    if (p.punktIndex >= gelaender.punkte.length) {
      throw new CommandError(
        `punktIndex ${p.punktIndex} ausserhalb der Polylinie (${gelaender.punkte.length} Punkte)`,
      );
    }
    const punkte = gelaender.punkte.map((q, i) => (i === p.punktIndex ? (p.punkt as Pt) : q));
    return [{ id: gelaender.id, before: gelaender, after: { ...gelaender, punkte } }];
  },
});

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
    grenzabstand: z
      .number()
      .int()
      .positive()
      .nullable()
      .default(null)
      .describe('Grenzabstand in mm: Bauteile bleiben so weit innerhalb der Linie (z.B. 4000)'),
    mehrHoehenAb: z.number().int().positive().optional().describe('Freigrenze Fassadenhöhe in mm (z.B. 12000)'),
    mehrHoehenAnteil: z.number().min(0).max(2).optional().describe('Zuschlag als Anteil der Mehrhöhe (z.B. 0.5)'),
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
      grenzabstand: p.grenzabstand,
      ...(p.mehrHoehenAb && p.mehrHoehenAnteil !== undefined
        ? { mehrHoehen: { abHoehe: p.mehrHoehenAb, anteil: p.mehrHoehenAnteil } }
        : {}),
    };
    patches.push(added(grenze));
    return patches;
  },
});

export const copyStorey = registerCommand({
  id: 'design.geschossKopieren',
  title: 'Geschoss stapeln',
  description:
    'Kopiert ein Geschoss samt Inhalt (Zonen, Möbel, Zonentüren, Wände mit Öffnungen, Decken, Treppen, Stützen, Unterzüge) anzahl-mal nach oben — Index und Höhenlage laufen fort, das Treppenhaus liegt automatisch deckungsgleich (vertical alignment). Kennzahlen und Berechnungsliste wachsen mit. Ein Undo-Schritt.',
  params: z.object({
    storeyId: z.string(),
    anzahl: z.number().int().min(1).max(20).default(1),
  }),
  summarize: (p) => `Geschoss ×${p.anzahl} stapeln`,
  run: (doc, p) => {
    const quelle = require<Storey>(doc, p.storeyId, 'storey');
    const patches: AnyPatch[] = [];
    const alleGeschosse = doc.storeysOrdered() as Storey[];
    const maxIndex = Math.max(...alleGeschosse.map((s2) => s2.index));
    // Auf der OBERSTEN Kante stapeln — nicht relativ zur Quelle (sonst
    // kollidieren Kopien mit bestehenden Obergeschossen)
    const maxTop = Math.max(...alleGeschosse.map((s2) => s2.elevation + s2.height));
    for (let n = 1; n <= p.anzahl; n++) {
      const index = maxIndex + n;
      const storey: Storey = {
        id: newId('geschoss'), kind: 'storey',
        name: `${index}.OG`, index,
        elevation: maxTop + (n - 1) * quelle.height,
        height: quelle.height, cutHeight: quelle.cutHeight,
      };
      patches.push(added(storey));
      const idMap = new Map<string, string>();
      const kopiere = <T extends { id: string; storeyId: string }>(e: T): T => {
        const neuId = newId(e.id.split('-')[0] ?? 'e');
        idMap.set(e.id, neuId);
        return { ...e, id: neuId, storeyId: storey.id };
      };
      for (const z2 of doc.byKind<Zone>('zone')) if (z2.storeyId === quelle.id) patches.push(added(kopiere(z2)));
      for (const f of doc.byKind<Furniture>('furniture')) if (f.storeyId === quelle.id) patches.push(added(kopiere(f)));
      for (const t of doc.byKind<import('../model/entities').ZonenTuer>('zonentuer')) if (t.storeyId === quelle.id) patches.push(added(kopiere(t)));
      for (const sl of doc.byKind<import('../model/entities').Slab>('slab')) if (sl.storeyId === quelle.id) patches.push(added(kopiere(sl)));
      for (const st of doc.byKind<import('../model/entities').Stair>('stair')) if (st.storeyId === quelle.id) patches.push(added(kopiere(st)));
      // Tragstruktur mitstapeln — sonst verliert ein Skelettbau in jedem
      // gestapelten Obergeschoss seine Stützen/Unterzüge (Testlauf-Befund).
      for (const c of doc.byKind<import('../model/entities').Column>('column')) if (c.storeyId === quelle.id) patches.push(added(kopiere(c)));
      for (const bm of doc.byKind<import('../model/entities').Beam>('beam')) if (bm.storeyId === quelle.id) patches.push(added(kopiere(bm)));
      for (const w of doc.byKind<Wall>('wall')) {
        if (w.storeyId !== quelle.id) continue;
        const kopie = kopiere(w);
        patches.push(added(kopie));
        for (const o of doc.openingsOf(w.id)) {
          patches.push(added({ ...(o as import('../model/entities').Opening), id: newId('oeffnung'), wallId: kopie.id }));
        }
      }
    }
    return patches;
  },
});

export const windowsFromModules = registerCommand({
  id: 'design.fensterAusModulen',
  title: 'Fenster aus Modulen stanzen',
  description:
    'Stanzt Fenster-Öffnungen in alle Aussenwände eines Geschosses nach dem Fassadenmodul: das Modul wird je Wand ab der Ecke gerastert (Eckenregel), jedes Fenster-Element wird eine echte Öffnung (Breite/Höhe/Brüstung aus dem Element). modul = Name aus dem Modul-Editor, sonst das erste gespeicherte — das gilt als Vorgabe für alle Seiten, ausser eine Fassadenseite hat über design.fassadenModulZuweisen (Kante an einem Volumenkörper desselben Geschosses) ein eigenes Modul erhalten: dann stanzt genau diese Aussenwand ihr zugewiesenes Modul. Ein Undo — danach sind die Tageslicht-Checks ehrlich prüfbar.',
  params: z.object({
    storeyId: z.string(),
    modul: z.string().nullable().default(null),
  }),
  summarize: (p) => `Fenster stanzen${p.modul ? ` («${p.modul}»)` : ''}`,
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const vorgabe = p.modul
      ? doc.settings.fassadenModule.find((m) => m.name === p.modul)
      : doc.settings.fassadenModule[0];
    if (!vorgabe) {
      throw new CommandError(
        p.modul ? `Modul «${p.modul}» existiert nicht` : 'Kein Fassadenmodul gezeichnet — zuerst der Modul-Editor',
      );
    }
    const vorgabeFenster = vorgabe.elemente.filter((e) => e.typ === 'fenster');
    if (vorgabeFenster.length === 0) throw new CommandError(`Modul «${vorgabe.name}» hat keine Fenster-Elemente`);
    // Kanten-Zuweisung (design.fassadenModulZuweisen) je Fassadenseite → Modulname,
    // über die Wandrichtung mit den echten Aussenwänden verbunden (Testlauf-Befund:
    // die zwei Fassaden-Systeme waren unverbunden, Süd/Nord wirkten sich nie auf
    // die gestanzten Fenster aus).
    const richtungModul = richtungsModule(doc, p.storeyId);
    const alleWaende = doc.byKind<Wall>('wall').filter((w) => w.storeyId === p.storeyId);
    const wandBbox = richtungModul.size > 0 ? boundingBox(alleWaende.flatMap((w) => [w.a, w.b])) : null;
    const patches: AnyPatch[] = [];
    for (const w of alleWaende) {
      const asm = doc.get<Assembly>(w.assemblyId);
      if (asm?.kind !== 'assembly' || !asm.name.toUpperCase().startsWith('AW')) continue;
      // Passendes Modul für diese Aussenwand: ihre Fassadenseite (Süd/Nord/West/
      // Ost) nachschlagen und, falls zugewiesen und mit Fenster-Elementen
      // versehen, statt der Vorgabe verwenden — sonst unverändertes Verhalten.
      const richtung = wandBbox ? kantenRichtung(w.a, w.b, wandBbox) : null;
      const zugewiesenerName = richtung ? richtungModul.get(richtung) : undefined;
      const zugewiesen = zugewiesenerName
        ? doc.settings.fassadenModule.find((m) => m.name === zugewiesenerName)
        : undefined;
      const zugewiesenFenster = zugewiesen?.elemente.filter((e) => e.typ === 'fenster') ?? [];
      const modul = zugewiesenFenster.length > 0 ? zugewiesen! : vorgabe;
      const fenster = zugewiesenFenster.length > 0 ? zugewiesenFenster : vorgabeFenster;
      const laenge = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
      const spalten = Math.floor(laenge / modul.breite);
      // Bestehende Öffnungen (z.B. Wohnungstüren) blockieren ihr Intervall
      const belegt: [number, number][] = doc
        .openingsOf(w.id)
        .map((o) => {
          const op = o as import('../model/entities').Opening;
          return [op.center - op.width / 2, op.center + op.width / 2] as [number, number];
        });
      for (let c = 0; c < spalten; c++) {
        for (const el of fenster) {
          const center = Math.round(c * modul.breite + el.x + el.b / 2);
          const von = center - el.b / 2;
          const bis = center + el.b / 2;
          if (von < 0 || bis > laenge) continue;
          if (belegt.some(([a2, b2]) => von < b2 && bis > a2)) continue; // Tür o.ä. im Weg
          belegt.push([von, bis]);
          patches.push(added({
            id: newId('oeffnung'), kind: 'opening' as const, wallId: w.id,
            openingType: 'fenster' as const,
            center, width: el.b, height: el.h, sill: el.y,
          }));
        }
      }
    }
    if (patches.length === 0) throw new CommandError('Keine Aussenwand (Aufbau «AW…») auf dem Geschoss');
    return patches;
  },
});

// ---------------------------------------------------------------------------
// Parametrische Fenster & Fensterband/Curtain-Wall v1 (v0.6.9 Stream A,
// docs/FENSTER-KONZEPT.md)

const FENSTERTYP_LABEL = {
  einfluegel: 'Einflügel',
  zweifluegel: 'Zweiflügel',
  fest: 'Festverglasung',
  fensterband: 'Fensterband',
} as const;

const RICHTUNG_LABEL: Record<Fassadenrichtung, string> = {
  sued: 'Süd',
  nord: 'Nord',
  west: 'West',
  ost: 'Ost',
};

export const parametrizeWindow = registerCommand({
  id: 'design.fensterParametrieren',
  title: 'Fenster parametrieren',
  description:
    'Macht aus einer bestehenden Fenster-Öffnung ein parametrisches Fenster: Typ (einfluegel/zweifluegel/fest/fensterband), Teilung n×m Felder, Rahmenbreite in mm, Angelseite swing (nur Ein-/Zweiflügel — der Grundriss zeigt dann den Öffnungsbogen), Flügeltyp (dreh/kipp/drehkipp/schiebe/fest — steuert die SIA-Öffnungssymbolik in Ansicht und Grundriss, v0.7.1 E5), Öffnungsrichtung oeffnetNachAussen (v0.7.3 D2 — steuert die Strichelung der Flügelsymbolik: durchgezogen = innen, gestrichelt = aussen). Türen und Leibungen werden abgelehnt. 3D und Schnitt bekommen Rahmen-/Pfostenprofile, der Grundriss Teilungslinien.',
  params: z.object({
    openingId: z.string(),
    fensterTyp: z.enum(['einfluegel', 'zweifluegel', 'fest', 'fensterband']),
    teilungN: z.number().int().min(1).max(12).optional().describe('Felder horizontal (1–12)'),
    teilungM: z.number().int().min(1).max(12).optional().describe('Felder vertikal (1–12)'),
    rahmenbreite: z.number().int().min(20).max(200).optional().describe('Rahmen-/Profilbreite mm (20–200)'),
    swing: z.enum(['links', 'rechts']).optional().describe('Angelseite (nur einfluegel/zweifluegel)'),
    fluegelTyp: z
      .enum(['dreh', 'kipp', 'drehkipp', 'schiebe', 'fest'])
      .optional()
      .describe('Flügeltyp für die SIA-Öffnungssymbolik (Ansicht/Grundriss, v0.7.1 E5)'),
    oeffnetNachAussen: z
      .boolean()
      .optional()
      .describe('Öffnungsrichtung (v0.7.3 D2): true = öffnet vom Betrachter weg (aussen, gestrichelt), fehlt/false = innen (durchgezogen, Default)'),
  }),
  summarize: (p) => {
    const teilung =
      p.teilungN !== undefined || p.teilungM !== undefined ? ` ${p.teilungN ?? 1}×${p.teilungM ?? 1}` : '';
    return `Fenster ${FENSTERTYP_LABEL[p.fensterTyp]}${teilung} parametriert`;
  },
  run: (doc, p) => {
    const o = doc.get<Opening>(p.openingId);
    if (!o || o.kind !== 'opening') throw new CommandError(`Öffnung «${p.openingId}» existiert nicht`);
    if (o.openingType !== 'fenster') {
      throw new CommandError(
        `«${p.openingId}» ist eine ${o.openingType === 'tuer' ? 'Tür' : 'Leibung'} — parametrieren geht nur für Fenster`,
      );
    }
    if (p.fensterTyp === 'fensterband' && p.swing) {
      throw new CommandError('Ein Fensterband hat keinen Öffnungsflügel — swing ist nur bei einfluegel/zweifluegel erlaubt');
    }
    // Ein Band trägt nie einen Flügel: bestehendes swing wird beim Umtypen
    // aufs Fensterband entfernt (statt still mitgeschleppt).
    const { swing: altSwing, ...ohneSwing } = o;
    const swing = p.fensterTyp === 'fensterband' ? undefined : (p.swing ?? altSwing);
    const after: Opening = {
      ...ohneSwing,
      fensterTyp: p.fensterTyp,
      ...(swing ? { swing } : {}),
      ...(p.teilungN !== undefined || p.teilungM !== undefined
        ? { teilung: { n: p.teilungN ?? 1, m: p.teilungM ?? 1 } }
        : {}),
      ...(p.rahmenbreite !== undefined ? { rahmenbreite: p.rahmenbreite } : {}),
      // Flügeltyp (v0.7.1 E5): additiv, unverändert lassen wenn weggelassen
      // (steckt schon in `ohneSwing`, sofern zuvor gesetzt).
      ...(p.fluegelTyp !== undefined ? { fluegelTyp: p.fluegelTyp } : {}),
      // Öffnungsrichtung (v0.7.3 D2): additiv, unverändert lassen wenn
      // weggelassen (steckt schon in `ohneSwing`, sofern zuvor gesetzt).
      ...(p.oeffnetNachAussen !== undefined ? { oeffnetNachAussen: p.oeffnetNachAussen } : {}),
    };
    return [{ id: o.id, before: o, after }];
  },
});

export const setBeschlag = registerCommand({
  id: 'design.beschlagSetzen',
  title: 'Beschlag setzen',
  description:
    'Setzt die Beschlag-Katalog-Attribute S0 (v0.7.3 D6, docs/V073-GESTALTUNG-SPEZ.md §D6) einer Öffnung: Bandseite (band: links/rechts/oben/unten), Griffseite (griffseite: links/rechts), Motorantrieb (antrieb) und Absturzsicherung (absturzsicherung). Additiv — weggelassene Felder bleiben unverändert. Die Brüstungshöhe (BRH) trägt bewusst KEIN eigenes Feld (die Ableitung etikettiert das bestehende sill), der Schiebe-Lauf ebenfalls nicht (abgeleitet aus fluegelTyp === schiebe). Sichtbar wird der Katalog NUR im Werkplan (derive/plan.ts, Daten-Guard).',
  params: z.object({
    openingId: z.string(),
    band: z.enum(['links', 'rechts', 'oben', 'unten']).optional().describe('Bandseite (Scharnierlage)'),
    griffseite: z.enum(['links', 'rechts']).optional().describe('Seite des Griffs/Drückers'),
    antrieb: z.boolean().optional().describe('Motorantrieb vorhanden'),
    absturzsicherung: z.boolean().optional().describe('Absturzsicherung vorhanden'),
  }),
  summarize: (p) =>
    `Beschlag → ${
      [
        p.band ? `Band ${p.band}` : null,
        p.griffseite ? `Griff ${p.griffseite}` : null,
        p.antrieb !== undefined ? (p.antrieb ? 'Antrieb' : 'kein Antrieb') : null,
        p.absturzsicherung !== undefined ? (p.absturzsicherung ? 'Absturzsicherung' : 'ohne Absturzsicherung') : null,
      ]
        .filter((s): s is string => s !== null)
        .join(', ') || 'unverändert'
    }`,
  run: (doc, p) => {
    const o = doc.get<Opening>(p.openingId);
    if (!o || o.kind !== 'opening') throw new CommandError(`Öffnung «${p.openingId}» existiert nicht`);
    if (o.openingType === 'leibung') {
      throw new CommandError('Eine Leibung trägt keinen Beschlag');
    }
    const after: Opening = {
      ...o,
      ...(p.band !== undefined ? { band: p.band } : {}),
      ...(p.griffseite !== undefined ? { griffseite: p.griffseite } : {}),
      ...(p.antrieb !== undefined ? { antrieb: p.antrieb } : {}),
      ...(p.absturzsicherung !== undefined ? { absturzsicherung: p.absturzsicherung } : {}),
    };
    return [{ id: o.id, before: o, after }];
  },
});

export const setBeschlaege = registerCommand({
  id: 'design.beschlaegeSetzen',
  title: 'Beschläge setzen',
  description:
    'Weist einer Öffnung Beschlag-Katalog-Typen zu (S2, v0.7.5 Welle 1 A1, BESCHLAG_KATALOG in derive/beschlag.ts, 12 Typen: Türdrücker, Türband/Scharnier, Einsteckschloss, Schliessblech, Bodentürschliesser, Türstopper, Profilzylinder, Panikstange, Fenstergriff, Kippbeschlag, Türspion, Bandseitensicherung). beschlaege ist eine Liste von Katalog-Keys und ERSETZT die bisherige Zuordnung vollständig (wie design.moebelSetzen ein Katalog-Feld setzt). Erscheint als Piktogramme im Werkplan, als Text auf dem DXF-Layer BESCHLAG und als IFCDISCRETEACCESSORY-Elemente im IFC-Export. Unbekannte Keys werfen einen Fehler; Leibungen tragen keinen Beschlag.',
  params: z.object({
    openingId: z.string(),
    beschlaege: z.array(z.string()).describe('Katalog-Keys aus BESCHLAG_KATALOG, z.B. "tuerdruecker-garnitur"'),
  }),
  summarize: (p) => `Beschläge → ${p.beschlaege.length ? p.beschlaege.join(', ') : 'keine'}`,
  run: (doc, p) => {
    const o = doc.get<Opening>(p.openingId);
    if (!o || o.kind !== 'opening') throw new CommandError(`Öffnung «${p.openingId}» existiert nicht`);
    if (o.openingType === 'leibung') {
      throw new CommandError('Eine Leibung trägt keinen Beschlag');
    }
    for (const key of p.beschlaege) {
      if (!beschlagTyp(key)) {
        throw new CommandError(`Unbekannter Beschlag-Katalog-Key «${key}» — siehe BESCHLAG_KATALOG (derive/beschlag.ts)`);
      }
    }
    // Wie beim Umtypen auf Fensterband (fensterParametrieren): bestehendes
    // Feld erst entfernen, dann bei Bedarf neu setzen — hält
    // exactOptionalPropertyTypes ein (kein `beschlaege: undefined`).
    const { beschlaege: alt, ...ohneBeschlaege } = o;
    void alt;
    const after: Opening = {
      ...ohneBeschlaege,
      ...(p.beschlaege.length > 0 ? { beschlaege: p.beschlaege } : {}),
    };
    return [{ id: o.id, before: o, after }];
  },
});

/** Fester Eckabstand des Fensterbands vom Wandende — der Eckrest bleibt
 * ehrlich Massivwand (bewusst KEIN Passstück/Eckdetail, V1-Schnitt). */
export const CW_ECKABSTAND_MM = 150;

interface CwSegment {
  wall: Wall;
  s0: number;
  s1: number;
  /** Fensterhöhe (Wandhöhe − Brüstung − Sturz). */
  hoehe: number;
  /** Pfostenfelder (0 = Segment zu kurz fürs Raster). */
  n: number;
  grund: 'ok' | 'zu-kurz' | 'belegt';
}

/**
 * Fensterband-Segmente einer Fassadenseite: alle Aussenwände («AW…») des
 * Geschosses, deren Fassadenseite via `kantenRichtung` (dieselbe Klassierung
 * wie `design.fensterAusModulen`) der gewünschten Richtung entspricht.
 * `fuerSummary`: `summarize` läuft laut Command-Vertrag NACH `doc.apply()`
 * (s. core.ts execute()) — die eben gestanzten Bänder stecken dann schon im
 * Doc. Für die Auslassungs-Warnung zählen darum nur Öffnungen, die KEIN
 * Fensterband sind, als «belegt»; `run()` dagegen blockt gegen ALLE
 * (ein Doppel-Lauf stanzt nicht übereinander, sondern wirft ehrlich).
 */
function cwSegmente(
  doc: KosmoDoc,
  p: { storeyId: string; richtung: Fassadenrichtung; pfostenraster: number; bruestung: number; sturz: number },
  fuerSummary: boolean,
): CwSegment[] {
  const storey = doc.get<Storey>(p.storeyId);
  if (!storey || storey.kind !== 'storey') return [];
  const alleWaende = doc.byKind<Wall>('wall').filter((w) => w.storeyId === p.storeyId);
  const bbox = boundingBox(alleWaende.flatMap((w) => [w.a, w.b]));
  if (!bbox) return [];
  const out: CwSegment[] = [];
  for (const w of alleWaende) {
    const asm = doc.get<Assembly>(w.assemblyId);
    if (asm?.kind !== 'assembly' || !asm.name.toUpperCase().startsWith('AW')) continue;
    if (kantenRichtung(w.a, w.b, bbox) !== p.richtung) continue;
    const laenge = Math.round(Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y));
    const s0 = CW_ECKABSTAND_MM;
    const s1 = laenge - CW_ECKABSTAND_MM;
    const wandTop = w.heightMode === 'fix' && w.height ? w.baseOffset + w.height : storey.height;
    const hoehe = wandTop - p.sturz - p.bruestung;
    const n = s1 > s0 ? Math.floor((s1 - s0) / p.pfostenraster) : 0;
    let grund: CwSegment['grund'] = 'ok';
    if (n < 1 || hoehe <= 0) {
      grund = 'zu-kurz';
    } else {
      const belegt = doc.openingsOf(w.id).some((o) => {
        const op = o as Opening;
        if (fuerSummary && op.fensterTyp === 'fensterband') return false;
        return op.center - op.width / 2 < s1 && op.center + op.width / 2 > s0;
      });
      if (belegt) grund = 'belegt';
    }
    out.push({ wall: w, s0, s1, hoehe, n, grund });
  }
  return out;
}

export const setCurtainWall = registerCommand({
  id: 'design.curtainWallSetzen',
  title: 'Fensterband/Curtain-Wall setzen',
  description:
    'Setzt ein durchlaufendes Fensterband (Curtain-Wall v1: Pfosten-Riegel als Teilung — bewusst OHNE Passstücke und Eckdetails) auf alle Aussenwände (Aufbau «AW…») einer Fassadenseite. Je Wandsegment entsteht EINE Fensterband-Öffnung von der Brüstung bis Wandhöhe minus Sturz, mit festem Eckabstand beidseits; das Pfostenraster wird gleichmässig aufs Segment verteilt. Mehrere Segmente werden in EINEM Undo-Schritt gestanzt; zu kurze oder belegte Segmente werden ausgelassen und ehrlich gemeldet.',
  params: z.object({
    storeyId: z.string(),
    richtung: z.enum(['sued', 'nord', 'west', 'ost']).describe('Fassadenseite'),
    pfostenraster: z.number().int().min(300).default(1200).describe('Pfostenabstand mm (≥ 300)'),
    riegelraster: z.number().int().min(300).optional().describe('Riegelabstand mm; fehlt = keine Zwischenriegel'),
    rahmenbreite: z.number().int().min(20).max(200).default(60).describe('Profilbreite mm (20–200)'),
    bruestung: z.number().int().nonnegative().default(0).describe('Brüstungshöhe mm'),
    sturz: z.number().int().nonnegative().default(200).describe('Sturzhöhe mm (OK Band bis OK Wand)'),
  }),
  summarize: (p, doc) => {
    const ausgelassen = cwSegmente(doc, p, true).filter((s) => s.grund !== 'ok').length;
    const basis = `Fensterband ${RICHTUNG_LABEL[p.richtung]} (Raster ${(p.pfostenraster / 1000).toFixed(2)} m)`;
    return ausgelassen > 0
      ? `${basis} — Achtung: ${ausgelassen} Segment(e) ausgelassen (zu kurz fürs Raster oder belegt)`
      : basis;
  },
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const segmente = cwSegmente(doc, p, false);
    if (segmente.length === 0) {
      throw new CommandError(`Keine Aussenwand (Aufbau «AW…») auf der ${RICHTUNG_LABEL[p.richtung]}-Fassade`);
    }
    const patches: AnyPatch[] = [];
    for (const s of segmente) {
      if (s.grund !== 'ok') continue;
      const m = p.riegelraster ? Math.max(1, Math.floor(s.hoehe / p.riegelraster)) : 1;
      patches.push(
        added({
          id: newId('oeffnung'),
          kind: 'opening' as const,
          wallId: s.wall.id,
          openingType: 'fenster' as const,
          center: Math.round((s.s0 + s.s1) / 2),
          width: s.s1 - s.s0,
          height: s.hoehe,
          sill: p.bruestung,
          fensterTyp: 'fensterband' as const,
          teilung: { n: s.n, m },
          rahmenbreite: p.rahmenbreite,
        }),
      );
    }
    if (patches.length === 0) {
      throw new CommandError(
        'Alle Segmente der Fassade sind zu kurz fürs Raster oder belegt — kein Fensterband gestanzt',
      );
    }
    return patches;
  },
});

export const wallsFromZones = registerCommand({
  id: 'design.waendeAusZonen',
  title: 'Wände aus Räumen bauen',
  description:
    'Baut aus den Räumen (Zonen mit Raumtyp) eines Geschosses echte Wände: gemeinsame Kanten werden EINE Innenwand (IW KS 10), Randkanten Aussenwände (bestehender AW-Aufbau oder Beton 18 + Dämmung 16). Zonentüren werden zu echten Türöffnungen und dabei ersetzt. Ein Undo-Schritt — danach ist der generierte Grundriss werkplan- und IFC-fähig.',
  params: z.object({ storeyId: z.string() }),
  summarize: () => 'Wände aus Räumen',
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const plan = zonenZuWaenden(doc, p.storeyId);
    if (plan.waende.length === 0) throw new CommandError(plan.diagnose[0] ?? 'Nichts zu bauen');
    const patches: AnyPatch[] = [];
    // Aufbauten: bestehende wiederverwenden, sonst anlegen
    const aufbauten = doc.byKind<Assembly>('assembly').filter((a2) => a2.target === 'wall');
    let aw = aufbauten.find((a2) => a2.name.toUpperCase().startsWith('AW'));
    let iw = aufbauten.find((a2) => a2.name.toUpperCase().startsWith('IW'));
    if (!aw) {
      aw = {
        id: newId('aufbau'), kind: 'assembly', name: 'AW Beton 34', target: 'wall',
        layers: [
          { material: 'daemmung-mw', thickness: 160, function: 'daemmung' },
          { material: 'beton', thickness: 180, function: 'tragend' },
        ],
      };
      patches.push(added(aw));
    }
    if (!iw) {
      iw = {
        id: newId('aufbau'), kind: 'assembly', name: 'IW KS 10', target: 'wall',
        layers: [{ material: 'kalksandstein', thickness: 100, function: 'tragend' }],
      };
      patches.push(added(iw));
    }
    let tw = aufbauten.find((a2) => a2.name.toUpperCase().startsWith('TW'));
    if (!tw && plan.waende.some((w2) => w2.typ === 'trennwand')) {
      tw = {
        id: newId('aufbau'), kind: 'assembly', name: 'TW KS 20', target: 'wall',
        layers: [{ material: 'kalksandstein', thickness: 200, function: 'tragend' }],
      };
      patches.push(added(tw));
    }
    for (const w of plan.waende) {
      const wand: Wall = {
        id: newId('wand'), kind: 'wall', storeyId: p.storeyId,
        a: w.a, b: w.b,
        assemblyId: (w.typ === 'trennwand' ? tw! : w.typ === 'innen' ? iw : aw).id,
        alignment: 'zentrum', baseOffset: 0, heightMode: 'geschoss',
      };
      patches.push(added(wand));
      for (const t of w.tueren) {
        patches.push(added({
          id: newId('oeffnung'), kind: 'opening' as const, wallId: wand.id,
          openingType: 'tuer' as const, center: t.center, width: t.breite, height: 2100, sill: 0,
        }));
        const alt2 = doc.get(t.tuerId);
        if (alt2) patches.push({ id: t.tuerId, before: alt2, after: null });
      }
    }
    return patches;
  },
});

export const assignFacadeModule = registerCommand({
  id: 'design.fassadenModulZuweisen',
  title: 'Fassadenmodul zuweisen',
  description:
    'Weist einer Fassadenkante ein gezeichnetes Modul zu (modul = Name aus dem Modul-Editor; null entfernt). ZWEI Wege: (1) massId+kante — Kante 1-basiert = Reihenfolge der Umriss-Kanten eines Volumenkörpers. (2) storeyId+richtung (sued/nord/west/ost) — H-35: für den wand-basierten Baupfad OHNE Volumenkörper, abgeleitet aus den zusammenhängenden Aussenwänden dieser Fassadenseite. Genau einer der beiden Wege pro Aufruf. Süd kriegt das Fensterband, Nord das geschlossene Modul — 3D-Raster/Elementbilanz (Weg 1) bzw. design.fensterAusModulen (Weg 2) folgen je Seite.',
  params: z.object({
    massId: z.string().optional(),
    kante: z.number().int().positive().optional(),
    storeyId: z.string().optional(),
    richtung: z.enum(['sued', 'nord', 'west', 'ost']).optional(),
    modul: z.string().nullable(),
  }),
  summarize: (p) =>
    p.massId !== undefined
      ? p.modul
        ? `Kante ${p.kante} → «${p.modul}»`
        : `Kante ${p.kante}: Modul entfernt`
      : p.modul
        ? `Fassade ${p.richtung} → «${p.modul}»`
        : `Fassade ${p.richtung}: Modul entfernt`,
  run: (doc, p) => {
    if (p.massId !== undefined || p.kante !== undefined) {
      if (p.massId === undefined || p.kante === undefined) {
        throw new CommandError('massId und kante gehören zusammen (Volumenkörper-Weg)');
      }
      // --- unverändert: bestehender MassBody-Weg (Goldens/Tests bleiben byte-identisch) ---
      const mass = require<MassBody>(doc, p.massId, 'mass');
      if (p.modul && !doc.settings.fassadenModule.some((m) => m.name === p.modul)) {
        throw new CommandError(`Modul «${p.modul}» existiert nicht — zuerst im Modul-Editor zeichnen`);
      }
      if (p.kante > mass.outline.length) {
        throw new CommandError(`Kante ${p.kante} — der Körper hat nur ${mass.outline.length}`);
      }
      const rest = (mass.module ?? []).filter((z2) => z2.kante !== p.kante);
      const module = p.modul ? [...rest, { kante: p.kante, modul: p.modul }] : rest;
      const { module: _weg, ...ohne } = mass;
      void _weg;
      const after: MassBody = module.length > 0 ? { ...ohne, module } : (ohne as MassBody);
      return [{ id: mass.id, before: mass, after }];
    }
    if (p.storeyId !== undefined && p.richtung !== undefined) {
      // --- neu (H-35): wand-basierter Weg ohne Volumenkörper ---
      require<Storey>(doc, p.storeyId, 'storey');
      if (p.modul && !doc.settings.fassadenModule.some((m) => m.name === p.modul)) {
        throw new CommandError(`Modul «${p.modul}» existiert nicht — zuerst im Modul-Editor zeichnen`);
      }
      const aussenwaende = doc
        .byKind<Wall>('wall')
        .filter((w) => w.storeyId === p.storeyId)
        .filter((w) => {
          const asm = doc.get<Assembly>(w.assemblyId);
          return asm?.kind === 'assembly' && asm.name.toUpperCase().startsWith('AW');
        });
      if (aussenwaende.length === 0) {
        throw new CommandError('Keine Aussenwand (Aufbau «AW…») auf diesem Geschoss — zuerst design.waendeAusZonen');
      }
      const bbox = boundingBox(aussenwaende.flatMap((w) => [w.a, w.b]));
      const treffer = bbox ? aussenwaende.some((w) => kantenRichtung(w.a, w.b, bbox) === p.richtung) : false;
      if (!treffer) {
        throw new CommandError(`Keine Aussenwand liegt an der Fassadenseite «${p.richtung}»`);
      }
      const richtung: Fassadenrichtung = p.richtung;
      const bisher = doc.settings.wandFassadenModule ?? [];
      const rest = bisher.filter((z2) => !(z2.storeyId === p.storeyId && z2.richtung === richtung));
      const nach = p.modul ? [...rest, { storeyId: p.storeyId, richtung, modul: p.modul }] : rest;
      return [{ settings: true as const, before: { wandFassadenModule: bisher }, after: { wandFassadenModule: nach } }];
    }
    throw new CommandError('Entweder massId+kante (Volumenkörper) oder storeyId+richtung (Wandzüge) angeben.');
  },
});

export const saveFacadeModule = registerCommand({
  id: 'design.modulSpeichern',
  title: 'Fassadenmodul speichern',
  description:
    'Speichert ein gezeichnetes Fassadenmodul: breite × hoehe (mm) und Elemente (Rechtecke mit typ fenster/paneel in Modul-Koordinaten, Ursprung unten links). Gleicher Name überschreibt; leere elemente + vorhandener Name löscht.',
  params: z.object({
    name: z.string().min(1),
    breite: z.number().int().positive(),
    hoehe: z.number().int().positive(),
    elemente: z
      .array(
        z.object({
          x: z.number(), y: z.number(),
          b: z.number().positive(), h: z.number().positive(),
          typ: z.enum(['fenster', 'paneel']),
        }),
      )
      .max(40),
  }),
  summarize: (p) => `Modul «${p.name}» (${p.elemente.length} Elemente)`,
  run: (doc, p) => {
    for (const e of p.elemente) {
      if (e.x < 0 || e.y < 0 || e.x + e.b > p.breite || e.y + e.h > p.hoehe) {
        throw new CommandError(
          `Element (${e.x}/${e.y}, ${e.b}×${e.h}) ragt aus dem Modul ${p.breite}×${p.hoehe}`,
        );
      }
    }
    const rest = doc.settings.fassadenModule.filter((m) => m.name !== p.name);
    const neu2 = p.elemente.length > 0 || !doc.settings.fassadenModule.some((m) => m.name === p.name)
      ? [...rest, { name: p.name, breite: p.breite, hoehe: p.hoehe, elemente: p.elemente }]
      : rest;
    return [{ settings: true as const, before: doc.settings, after: { ...doc.settings, fassadenModule: neu2 } }];
  },
});

export const placeZoneDoor = registerCommand({
  id: 'design.tuerSetzen',
  title: 'Zonentür setzen',
  description:
    'Setzt eine Tür zwischen zwei Zonen (ohne Wand): at = Punkt auf der gemeinsamen Kante (mm), breite Standard 900. Der Raumgraph wertet die Verbindung dann als «tuer» statt «offen» — Fluchtweg und Topologie werden ehrlich.',
  params: z.object({
    storeyId: z.string(),
    at: z.object({ x: z.number(), y: z.number() }),
    breite: z.number().int().positive().default(900),
  }),
  summarize: () => 'Zonentür',
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    return [added({ id: newId('tuer'), kind: 'zonentuer' as const, storeyId: p.storeyId, at: p.at, breite: p.breite })];
  },
});

/** Fläche eines Polygons (Shoelace, unsigniert) — identisch zur bisherigen UI-Rechnung. */
function polyFlaeche(outline: Pt[]): number {
  let s = 0;
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i]!;
    const q = outline[(i + 1) % outline.length]!;
    s += p.x * q.y - q.x * p.y;
  }
  return Math.abs(s) / 2;
}

export const segmentWohnungen = registerCommand({
  id: 'design.wohnungenSegmentieren',
  title: 'Wohnungen segmentieren',
  description:
    'Schneidet die grösste Zone eines Geschosses (Footprint) entlang der Zone mit Raumtyp «korridor» in Wohnungen — Soll-Mix aus dem Raumprogramm (design.raumprogrammSetzen) oder explizit übergeben. Beidseits des Korridors entstehen Bänder, eine dynamische Programmierung sucht Schnittstationen nahe der Zielgrösse je Typ; Restfläche wird ehrlich als «Opfer-Wohnung» ausgewiesen. kern reserviert 3.0 m Erschliessungskern (Treppenhaus-Zone, gerader Treppenlauf, Zonentür zum Korridor). Ein Undo-Schritt.',
  params: z.object({
    storeyId: z.string(),
    mix: z
      .array(
        z.object({
          typ: z.string().describe('Wohnungstyp-Schlüssel, z.B. «marktgerecht» oder «preisguenstig»'),
          anzahl: z.number().int().positive(),
          groesse: z.number().positive().optional().describe('Zielgrösse in m² — weggelassen: Standardgrösse des Typs'),
        }),
      )
      .max(20)
      .optional()
      .describe('Soll-Mix (Typ/Anzahl/Grösse) — weggelassen: aus dem Raumprogramm abgeleitet (sollMix)'),
    minBreite: z.number().int().min(3500).max(7000).default(4500).describe('Minimale Wohnungsbreite am Korridor (mm)'),
    groessenFaktor: z.number().min(0.5).max(2).default(1).describe('Skaliert alle Zielgrössen (F6-Regler-Äquivalent)'),
    kern: z.boolean().default(false).describe('Reserviert 3.0 m Erschliessungskern mit Treppenhaus, Treppe und Zonentür'),
    vorberechneteWohnungen: z
      .array(
        z.object({
          outline: z.array(PtSchema).min(3),
          flaeche: z.number(),
          typ: z.string().nullable(),
          abweichung: z.number().nullable(),
        }),
      )
      .optional()
      .describe(
        'v0.7.0 (Stream 5A): eine bereits vollständig gerechnete Wohnungsliste (z.B. eine Top-Variante aus der Anytime-Variantensuche, derive/variantensuche.ts) direkt übernehmen — überspringt den internen segmentiere()-Lauf, GEOMETRIE bytegenau. Weggelassen: es wird wie bisher aus footprint/korridor/mix neu geschnitten. Nicht kombinierbar mit kern (die Kern-Reservierung kennt die Variante nicht).',
      ),
  }),
  summarize: (p) => `Wohnungen segmentieren${p.kern ? ' (mit Erschliessungskern)' : ''}`,
  run: (doc, p) => {
    const storey = require<Storey>(doc, p.storeyId, 'storey');
    const zonen = doc.byKind<Zone>('zone').filter((z) => z.storeyId === p.storeyId);
    const korridor = zonen.find((z) => z.raumTyp === 'korridor');
    if (!korridor) {
      throw new CommandError('Eine Zone mit Raumtyp «korridor» zeichnen — daran werden die Wohnungen geschnitten.');
    }
    const rest = zonen.filter((z) => z.id !== korridor.id);
    const footprint = [...rest].sort((a, b) => polyFlaeche(b.outline) - polyFlaeche(a.outline))[0];
    if (!footprint) {
      throw new CommandError('Eine Footprint-Zone (Geschossfläche) zeichnen — sie wird geteilt.');
    }

    let wohnungen: GeschnitteneWohnung[];
    let kern: { outline: Pt[] } | null;
    if (p.vorberechneteWohnungen) {
      // v0.7.0 Stream 5A: eine fertige Variante aus derive/variantensuche.ts
      // (Ruin-&-Recreate-Hill-Climber) direkt übernehmen, statt sie hier
      // erneut zu segmentieren — die Geometrie ist bereits eine gültige,
      // vollständig ausgewertete `SegmentVariante.wohnungen`. Die Kern-
      // Reservierung kennt diese Variante NICHT (`SegmentVariante` trägt
      // keine Kern-Outline) — ehrlich ausgeschlossen statt still falsch
      // kombiniert.
      if (p.kern) {
        throw new CommandError(
          'Kern-Reservierung ist mit einer vorberechneten Variante nicht unterstützt — ohne Kern übernehmen oder «Wohnungen schneiden» direkt mit Kern neu schneiden.',
        );
      }
      if (p.vorberechneteWohnungen.length === 0) {
        throw new CommandError('Vorberechnete Variante enthält keine Wohnungen.');
      }
      wohnungen = p.vorberechneteWohnungen;
      kern = null;
    } else {
      const basis = p.mix ?? sollMix(doc);
      if (basis.length === 0) {
        throw new CommandError('Zuerst das Raumprogramm erfassen — daraus entsteht der Soll-Mix.');
      }
      const mix: WohnungsTypSoll[] = basis.map((m) => ({
        typ: m.typ,
        anzahl: m.anzahl,
        groesse: m.groesse ?? WOHNUNGS_GROESSEN[m.typ] ?? 85,
      }));
      const groessen = Object.fromEntries(mix.map((m) => [m.typ, Math.round(m.groesse * p.groessenFaktor)]));
      const ergebnis = segmentiere(footprint.outline, korridor.outline, mix, {
        minBreite: p.minBreite,
        groessen,
        kern: p.kern,
      });
      if (ergebnis.wohnungen.length === 0) {
        throw new CommandError(ergebnis.diagnose[0] ?? 'Segmentierung ergab keine Wohnungen — Korridorlage prüfen.');
      }
      wohnungen = ergebnis.wohnungen;
      kern = ergebnis.kern;
    }

    const patches: AnyPatch[] = [];
    let i = 0;
    for (const w of wohnungen) {
      i++;
      patches.push(
        added({
          id: newId('zone'),
          kind: 'zone',
          storeyId: p.storeyId,
          outline: w.outline,
          name: w.typ ? `Whg ${i} (${w.typ})` : 'Restfläche',
          sia: 'HNF',
          ...(w.typ ? { program: w.typ } : {}),
        }),
      );
    }

    if (kern) {
      patches.push(
        added({
          id: newId('zone'),
          kind: 'zone',
          storeyId: p.storeyId,
          outline: kern.outline,
          name: 'Treppenhaus',
          sia: 'VF',
          raumTyp: 'treppenhaus',
        }),
      );
      // Gerader Lauf mittig im Kern (identische Geometrie zum bisherigen
      // UI-Weg: BerechnungslistePanel.uebernehmen).
      const xs = kern.outline.map((pt) => pt.x);
      const ys = kern.outline.map((pt) => pt.y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const y0 = Math.min(...ys);
      const y1 = Math.max(...ys);
      const hoch = y1 - y0 >= Math.max(...xs) - Math.min(...xs);
      const a: Pt = hoch ? { x: cx, y: y0 + 600 } : { x: Math.min(...xs) + 600, y: (y0 + y1) / 2 };
      const b: Pt = hoch ? { x: cx, y: y1 - 600 } : { x: Math.max(...xs) - 600, y: (y0 + y1) / 2 };
      const laenge = Math.hypot(b.x - a.x, b.y - a.y);
      if (laenge < 1000) throw new CommandError('Treppenlauf zu kurz (< 1 m) — Kern zu knapp für den Lauf.');
      const stair: Stair = { id: newId('treppe'), kind: 'stair', storeyId: p.storeyId, a, b, width: 1200 };
      const teile = treppenTeile(stair, storey.height, storey.elevation);
      if (teile.spec.riser > 200) {
        throw new CommandError(
          `Lauf zu kurz für ${formatLength(storey.height)} Geschosshöhe: Steigung wäre ${Math.round(teile.spec.riser)} mm (max. 200).`,
        );
      }
      patches.push(added(stair));
      // Tür an der Kante zum Korridor (Kern grenzt bandseitig an den Korridor)
      const ky = korridor.outline.map((pt) => pt.y);
      const grenzY = Math.abs(Math.min(...ky) - y1) < Math.abs(Math.max(...ky) - y0) ? y1 : y0;
      patches.push(
        added({
          id: newId('tuer'),
          kind: 'zonentuer' as const,
          storeyId: p.storeyId,
          at: { x: Math.round(cx), y: grenzY },
          breite: 1000,
        }),
      );
    }
    return patches;
  },
});

export const generateFloorplan = registerCommand({
  id: 'design.grundrissGenerieren',
  title: 'Grundriss generieren',
  description:
    'Füllt eine rechteckige Wohnungs-Zone mit Zimmern und Möbeln. Zuerst prüft die Plan-Library: eine gespeicherte Vorlage, deren Name den Wohnungstyp enthält und die mit moderatem Stretch (0.7–1.4) passt, gewinnt — sonst CH-Rezept (Eingangsband Diele/Bad/Küche am Korridor, Wohnen + Zimmer an der Fassade). korridorSeite «auto» sucht die nächste Korridor-Zone. Ein Undo-Schritt; Anstoss, kein Entwurf.',
  params: z.object({
    zoneId: z.string(),
    korridorSeite: z.enum(['auto', 'unten', 'oben', 'links', 'rechts']).default('auto'),
  }),
  summarize: () => 'Grundriss generieren',
  run: (doc, p) => {
    const wohnung = require<Zone>(doc, p.zoneId, 'zone');
    let seite: 'unten' | 'oben' | 'links' | 'rechts';
    if (p.korridorSeite !== 'auto') {
      seite = p.korridorSeite;
    } else {
      // nächste Korridor-Zone entscheidet, sonst unten
      const bb = (o: { x: number; y: number }[]) => {
        let x = 0, y = 0;
        for (const q of o) { x += q.x; y += q.y; }
        return { x: x / o.length, y: y / o.length };
      };
      const wz = bb(wohnung.outline);
      const korridor = doc
        .byKind<Zone>('zone')
        .filter((z) => z.storeyId === wohnung.storeyId && z.raumTyp === 'korridor');
      if (korridor.length > 0) {
        const kz = bb(korridor.sort((a, b) => {
          const az = bb(a.outline); const bz = bb(b.outline);
          return Math.hypot(az.x - wz.x, az.y - wz.y) - Math.hypot(bz.x - wz.x, bz.y - wz.y);
        })[0]!.outline);
        const dx = kz.x - wz.x;
        const dy = kz.y - wz.y;
        seite = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'rechts' : 'links') : (dy > 0 ? 'oben' : 'unten');
      } else {
        seite = 'unten';
      }
    }
    // Plan-Library (Finch-Prinzip): passt eine gespeicherte Vorlage, gewinnt
    // sie gegen das Rezept — Name enthält den Wohnungstyp, Stretch moderat.
    // Vorlagen sind mit Korridor UNTEN gespeichert (u = der Kante entlang,
    // v = von ihr weg); für die anderen Seiten wird transformiert. Spiegel-
    // Seiten (oben/links) drehen die Wicklung zurück; Möbel-Rotationen
    // folgen der Abbildung (unten r, oben 180−r, links 270−r, rechts 90+r).
    if (wohnung.program) {
      let bbMinX = Infinity, bbMaxX = -Infinity, bbMinY = Infinity, bbMaxY = -Infinity;
      for (const pt of wohnung.outline) {
        bbMinX = Math.min(bbMinX, pt.x); bbMaxX = Math.max(bbMaxX, pt.x);
        bbMinY = Math.min(bbMinY, pt.y); bbMaxY = Math.max(bbMaxY, pt.y);
      }
      // Breite = der Korridorkante entlang, Tiefe = von ihr weg
      const vertikalSeite = seite === 'links' || seite === 'rechts';
      const wb = vertikalSeite ? bbMaxY - bbMinY : bbMaxX - bbMinX;
      const wt = vertikalSeite ? bbMaxX - bbMinX : bbMaxY - bbMinY;
      // Kandidaten nach Namens-/Stretch-Filter sortiert; ein F7-Lock-Konflikt
      // (alle Zonen auf einer Achse fest, Zielmass passt nicht — achsenDehnung
      // wirft) disqualifiziert NUR diesen Kandidaten, kein Command-Fehler:
      // die nächste Vorlage bzw. am Ende das CH-Rezept übernimmt ehrlich.
      const kandidaten = doc.settings.vorlagen
        .filter((v) => v.name.toLowerCase().includes(wohnung.program!.toLowerCase()))
        .map((v) => ({ v, sx: wb / v.breite, sy: wt / v.hoehe }))
        .filter(({ sx, sy }) => sx >= 0.7 && sx <= 1.4 && sy >= 0.7 && sy <= 1.4)
        .sort((a, b) => Math.abs(a.sx * a.sy - 1) - Math.abs(b.sx * b.sy - 1));
      for (const { v } of kandidaten) {
        let mapX: (n: number) => number;
        let mapY: (n: number) => number;
        try {
          mapX = achsenDehnung(v, 'x', wb);
          mapY = achsenDehnung(v, 'y', wt);
        } catch {
          continue; // F7-Lock lässt sich hier nicht erfüllen — nächste Vorlage
        }
        const tx = (u: number, w: number) => {
          const su = mapX(u);
          const sw = mapY(w);
          switch (seite) {
            case 'unten': return { x: Math.round(bbMinX + su), y: Math.round(bbMinY + sw) };
            case 'oben': return { x: Math.round(bbMinX + su), y: Math.round(bbMaxY - sw) };
            case 'links': return { x: Math.round(bbMinX + sw), y: Math.round(bbMinY + su) };
            case 'rechts': return { x: Math.round(bbMaxX - sw), y: Math.round(bbMinY + su) };
          }
        };
        // Spiegel-Seiten (Determinante −1) drehen die Wicklung um
        const gespiegelt = seite === 'oben' || seite === 'links';
        const moebelRot = (r: number) => {
          switch (seite) {
            case 'unten': return r;
            case 'oben': return ((180 - r) % 360 + 360) % 360;
            case 'links': return ((270 - r) % 360 + 360) % 360;
            case 'rechts': return (90 + r) % 360;
          }
        };
        const patches: AnyPatch[] = [];
        for (const vz of v.zonen) {
          const outline = vz.outline.map((pt) => tx(pt.x, pt.y));
          if (gespiegelt) outline.reverse();
          patches.push(added({
            id: newId('zone'), kind: 'zone' as const, storeyId: wohnung.storeyId,
            outline, name: vz.name, sia: vz.sia as Zone['sia'],
            ...(vz.raumTyp ? { raumTyp: vz.raumTyp } : {}),
          }));
        }
        for (const m of v.moebel ?? []) {
          patches.push(added({
            id: newId('moebel'), kind: 'furniture' as const, storeyId: wohnung.storeyId,
            typ: m.typ, at: tx(m.at.x, m.at.y), rotationGrad: moebelRot(m.rotationGrad),
          }));
        }
        for (const t of v.tueren ?? []) {
          patches.push(added({
            id: newId('tuer'), kind: 'zonentuer' as const, storeyId: wohnung.storeyId,
            at: tx(t.at.x, t.at.y), breite: t.breite,
          }));
        }
        // Regeln-in-Vorlagen (E5-v): Library-Treffer aktiviert eingebettete
        // Presets, damit spätere Checks (pruefeGrundriss) das Ergebnis daran
        // messen — vereinigt mit bestehenden Raumregeln, nie überschrieben.
        if (v.regeln?.length) {
          const vereint = vereinigeRaumRegeln(doc.settings.raumRegeln, v.regeln);
          if (vereint) {
            patches.push({
              settings: true as const,
              before: { raumRegeln: doc.settings.raumRegeln },
              after: { raumRegeln: vereint },
            });
          }
        }
        return patches;
      }
    }
    // C4: L-Wohnungen werden zerlegt (Hauptteil-Rezept + Flügelzimmer);
    // rektilineare U/T-Formen lehnen ehrlich ab, Schrägen fallen wie bisher
    // auf die BBox zurück (der Generator meldet das in der Diagnose).
    const zerlegung = zerlegeRektilinear(wohnung.outline);
    if (zerlegung.typ === 'unregelmaessig' && !zerlegung.grund.includes('schräge')) {
      throw new CommandError(`Grundriss-Generator: ${zerlegung.grund}`);
    }
    const g =
      zerlegung.typ === 'l'
        ? generiereGrundrissL(zerlegung.haupt, zerlegung.fluegel, seite)
        : generiereGrundriss(wohnung.outline, seite);
    if (g.raeume.length === 0) throw new CommandError(g.diagnose[0] ?? 'Wohnung zu klein');
    const patches: AnyPatch[] = [];
    for (const r of g.raeume) {
      patches.push(added({
        id: newId('zone'), kind: 'zone' as const, storeyId: wohnung.storeyId,
        outline: r.outline, name: r.name, sia: r.sia as Zone['sia'], raumTyp: r.raumTyp,
      }));
    }
    for (const m of g.moebel) {
      patches.push(added({
        id: newId('moebel'), kind: 'furniture' as const, storeyId: wohnung.storeyId,
        typ: m.typ, at: m.at, rotationGrad: m.rotationGrad,
      }));
    }
    for (const t of g.tueren) {
      patches.push(added({
        id: newId('tuer'), kind: 'zonentuer' as const, storeyId: wohnung.storeyId,
        at: t.at, breite: t.breite,
      }));
    }
    return patches;
  },
});

export const setLocation = registerCommand({
  id: 'design.standortSetzen',
  title: 'Projektstandort setzen',
  description:
    'Setzt den CH-Projektstandort (label, WGS84 lat/lon für die Schattenstudie, LV95 e/n in Metern für Parzellen-Import, hoeheM = Absolutbezug ±0.00 in m ü.M. für die EG-Kote). Wird im Projekt gespeichert — beim zweiten Öffnen auch offline da. null-Label löscht.',
  params: z.object({
    label: z.string().min(1),
    lat: z.number().min(45).max(48),
    lon: z.number().min(5).max(11),
    e: z.number(),
    n: z.number(),
    hoeheM: z.number().min(190).max(4700).optional().describe('±0.00 in m ü.M.'),
  }),
  summarize: (p) => `Standort «${p.label}»${p.hoeheM !== undefined ? ` (±0.00 = ${p.hoeheM.toFixed(2)} m ü.M.)` : ''}`,
  run: (doc, p) => [
    {
      settings: true as const,
      before: doc.settings,
      after: {
        ...doc.settings,
        standort: {
          label: p.label, lat: p.lat, lon: p.lon, e: p.e, n: p.n,
          ...(p.hoeheM !== undefined ? { hoeheM: p.hoeheM } : {}),
        },
      },
    },
  ],
});

export const setProjektName = registerCommand({
  id: 'design.projektNameSetzen',
  title: 'Projektname umbenennen',
  description:
    'Benennt das Projekt um (erscheint versal im Plankopf-Titel jedes Plans/Blatts). Bisher nur bei der Projekterstellung gesetzt — dieser Command schliesst die Lücke als reguläre, undo-fähige Mutation.',
  params: z.object({
    name: z.string().min(1),
  }),
  summarize: (p) => `Projektname: «${p.name}»`,
  run: (doc, p) => {
    return [{ settings: true, before: { projectName: doc.settings.projectName }, after: { projectName: p.name } }];
  },
});

export const setProjektInfo = registerCommand({
  id: 'design.projektInfoSetzen',
  title: 'Projekt-Stammdaten setzen',
  description:
    'Setzt/ergänzt die Projekt-Stammdaten (Bauherrschaft, Adresse, Parzellennummer, Planverfasser:in, Fristen, Projekt-/Baugesuchs-Code) — additiv, wie bei design.prioritaetSetzen (materialPrioritaeten): nur übergebene Felder werden geändert, der Rest bleibt. Bauherr/Verfasser erscheinen im Plankopf (nur wenn gesetzt, sonst keine Zeile). Getrennt von design.standortSetzen (Koordinaten) und parzellenFlaeche (AZ-Kennzahl) — unabhängige Felder derselben Parzelle.',
  params: z.object({
    bauherr: z.string().optional(),
    adresse: z.string().optional(),
    parzelleNr: z.string().optional(),
    verfasser: z.string().optional(),
    fristen: z.array(z.object({ label: z.string(), datum: z.string() })).optional(),
    projektCode: z.string().optional().describe('Projekt-/Baugesuchs-Nummer, z.B. «BG-2026-014»'),
  }),
  summarize: (p) => {
    const teile: string[] = [];
    if (p.bauherr !== undefined) teile.push(`Bauherr «${p.bauherr}»`);
    if (p.adresse !== undefined) teile.push(`Adresse «${p.adresse}»`);
    if (p.parzelleNr !== undefined) teile.push(`Parzelle Nr. ${p.parzelleNr}`);
    if (p.verfasser !== undefined) teile.push(`Verfasser «${p.verfasser}»`);
    if (p.fristen !== undefined) teile.push(`${p.fristen.length} Frist(en)`);
    if (p.projektCode !== undefined) teile.push(`Code «${p.projektCode}»`);
    return teile.length > 0 ? `Stammdaten: ${teile.join(', ')}` : 'Stammdaten: keine Änderung';
  },
  run: (doc, p) => {
    // Schmales Patch (nur `projekt`), wie bei schnitt/themen/materialPrioritaeten:
    // ein optionales Feld ohne defaultSettings-Eintrag — `vorher` braucht
    // einen expliziten Wert, sonst löscht das Object-Spread-Undo den
    // Schlüssel nicht zurück in die Abwesenheit. `{}` (statt `null`/
    // `undefined`) ist der «leere» Absenz-Wert, wie bei materialPrioritaeten
    // (`?? {}`) — bleibt unter exactOptionalPropertyTypes gültig zuweisbar.
    const vorher: ProjektInfo = doc.settings.projekt ?? {};
    const nachher: ProjektInfo = {
      ...vorher,
      ...(p.bauherr !== undefined ? { bauherr: p.bauherr } : {}),
      ...(p.adresse !== undefined ? { adresse: p.adresse } : {}),
      ...(p.parzelleNr !== undefined ? { parzelleNr: p.parzelleNr } : {}),
      ...(p.verfasser !== undefined ? { verfasser: p.verfasser } : {}),
      ...(p.fristen !== undefined ? { fristen: p.fristen } : {}),
      ...(p.projektCode !== undefined ? { projektCode: p.projektCode } : {}),
    };
    return [{ settings: true, before: { projekt: vorher }, after: { projekt: nachher } }];
  },
});

export const nachbarnUebernehmen = registerCommand({
  id: 'design.nachbarnUebernehmen',
  title: 'Nachbargebäude übernehmen',
  description:
    'Übernimmt Nachbargebäude-Umrisse (z.B. aus einem amtlichen geo.admin.ch-Footprint-Import, s. `standort.ts` `nachbarnZuOutlines`) als Kontext-Zonen (zonenArt «nachbar») für den Schwarzplan/Situationsplan. Reine Kontext-Geometrie — kein Raum, keine SIA-416-/Checks-Relevanz. Erneutes Ausführen ersetzt die vorhandenen Nachbar-Zonen desselben Geschosses (Re-Import idempotent).',
  params: z.object({
    storeyId: z.string(),
    outlines: z
      .array(z.array(PtSchema).min(3))
      .min(1)
      .describe('Gebäude-Umrisse in lokalen mm, je Umriss mindestens 3 Punkte'),
  }),
  summarize: (p) => `${p.outlines.length} Nachbargebäude übernommen`,
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const patches: AnyPatch[] = [];
    // Bestehende Nachbar-Zonen DESSELBEN Geschosses zuerst löschen — Re-Import
    // ist damit idempotent (zweimaliges Ausführen mit denselben Umrissen
    // ergibt dieselbe Zonen-Zahl, nicht doppelt so viele). Löschen + Anlegen
    // laufen in EINEM Patch-Array, also EIN Undo-Schritt.
    for (const z of doc.byKind<Zone>('zone')) {
      if (z.storeyId === p.storeyId && z.zonenArt === 'nachbar') {
        patches.push({ id: z.id, before: z, after: null });
      }
    }
    p.outlines.forEach((outline, i) => {
      const zone: Zone = {
        id: newId('zone'),
        kind: 'zone',
        storeyId: p.storeyId,
        outline: outline as Pt[],
        name: `Nachbar ${i + 1}`,
        sia: 'KF',
        zonenArt: 'nachbar',
      };
      patches.push(added(zone));
    });
    return patches;
  },
});

/**
 * F7-Locks (v0.7.0 E5-ii): baut den achsweisen Stretch-Verlauf einer Vorlage
 * für EINE Achse. `cuts` = alle distinkten Koordinaten dieser Achse aus den
 * Zonen-Umrissen (plus 0/gesamt als Rand-Garantie) — daraus entstehen
 * Elementar-Abschnitte; ein Abschnitt ist `fest`, wenn ihn eine Zone mit
 * `dehnung{X,Y}==='fest'` vollständig überdeckt. Feste Abschnitte behalten
 * ihre Originallänge, die Differenz zwischen Ziel- und Ausgangsmass verteilt
 * sich anteilig auf die dehnbaren. **Ohne Locks** (alle Zonen `dehnbar`, der
 * Default) ist genau EIN dehnbarer Abschnitt über das ganze Mass die Folge —
 * rechnerisch identisch zum alten `wert * (ziel/gesamt)`, also byte-gleiches
 * Verhalten für jede bestehende Vorlage (bewiesen in
 * «Alt-Vorlagen ohne Locks bleiben unverändert», kernel.test.ts).
 * Sind ALLE Abschnitte fest und weicht das Zielmass von der Summe ab, ist
 * stilles Verzerren unehrlich — `CommandError` statt falscher Geometrie.
 */
function achsenDehnung(
  vorlage: ZonenVorlage,
  achse: 'x' | 'y',
  ziel: number | null,
): (wert: number) => number {
  const gesamt = achse === 'x' ? vorlage.breite : vorlage.hoehe;
  if (!ziel || ziel === gesamt || gesamt <= 0) return (w) => w;
  const key = achse === 'x' ? 'dehnungX' : 'dehnungY';
  const koord = (pt: { x: number; y: number }) => (achse === 'x' ? pt.x : pt.y);
  const cuts = [...new Set([0, gesamt, ...vorlage.zonen.flatMap((z) => z.outline.map(koord))])].sort(
    (a, b) => a - b,
  );
  const baender = cuts.slice(0, -1).map((von, i) => {
    const bis = cuts[i + 1]!;
    const fest = vorlage.zonen.some((z) => {
      if (z[key] !== 'fest') return false;
      const werte = z.outline.map(koord);
      return Math.min(...werte) <= von && bis <= Math.max(...werte);
    });
    return { von, bis, laenge: bis - von, fest };
  });
  const festSumme = baender.filter((b) => b.fest).reduce((s, b) => s + b.laenge, 0);
  const dehnSumme = gesamt - festSumme;
  const delta = ziel - gesamt;
  if (dehnSumme <= 0) {
    if (Math.abs(delta) > 0.01) {
      throw new CommandError(
        `Vorlage «${vorlage.name}»: alle Zonen sind auf der ${achse === 'x' ? 'X' : 'Y'}-Achse fest (F7-Lock) — Zielmass ${ziel} mm passt nicht zur festen Summe ${gesamt} mm.`,
      );
    }
    return (w) => w;
  }
  const faktorDehnbar = (dehnSumme + delta) / dehnSumme;
  let neuVon = 0;
  const abgebildet = baender.map((b) => {
    const faktor = b.fest ? 1 : faktorDehnbar;
    const eintrag = { von: b.von, bis: b.bis, neuVon, faktor };
    neuVon += b.laenge * faktor;
    return eintrag;
  });
  return (wert: number) => {
    const b = abgebildet.find((e) => wert >= e.von && wert <= e.bis) ?? abgebildet[abgebildet.length - 1]!;
    return b.neuVon + (wert - b.von) * b.faktor;
  };
}

/**
 * Regeln-in-Vorlagen (v0.7.0 E5-v): vereinigt die Regelpreset-Ids einer
 * Vorlage mit den bestehenden Projekt-Raumregeln — bestehende Einträge je
 * Raumtyp gewinnen IMMER (kein stilles Überschreiben eigener Anpassungen),
 * die Vorlage ergänzt nur fehlende Raumtypen. `null` = nichts Neues, kein
 * Patch nötig.
 */
function vereinigeRaumRegeln(bestehende: RaumRegel[], presetIds: string[]): RaumRegel[] | null {
  const bekannt = new Set(bestehende.map((r) => r.raumTyp));
  const dazu: RaumRegel[] = [];
  for (const id of presetIds) {
    const preset = REGEL_PRESETS[id as keyof typeof REGEL_PRESETS] as RaumRegel[] | undefined;
    if (!preset) continue; // an Speicherzeit schon geprüft (vorlageSpeichern) — hier defensiv
    for (const regel of preset) {
      if (!bekannt.has(regel.raumTyp)) {
        bekannt.add(regel.raumTyp);
        dazu.push(regel);
      }
    }
  }
  return dazu.length > 0 ? [...bestehende, ...dazu] : null;
}

export const saveTemplate = registerCommand({
  id: 'design.vorlageSpeichern',
  title: 'Zonen-Vorlage speichern',
  description:
    'Speichert die angegebenen Zonen als benannte Vorlage (Wohnungs-Layout): Umrisse relativ zur linken unteren Ecke, mit Name/SIA/Raumtyp. dehnungFestX/dehnungFestY (Teilmenge von zoneIds) sperrt die betroffene Zone auf dieser Achse aufs Originalmass (F7-Lock, z.B. Nasszelle fix 2.4 m) — beim Strecken (design.vorlageSetzen/design.grundrissGenerieren) nehmen die übrigen (dehnbaren) Zonen die Differenz auf; Default leer = alles dehnbar wie bisher. regeln (Ids aus REGEL_PRESETS) werden beim Absetzen/Instanziieren dieser Vorlage im Projekt aktiviert (vereinigt mit bestehenden Raumregeln, nie überschrieben). Mit design.vorlageSetzen wieder absetzbar — auch gestreckt.',
  params: z.object({
    name: z.string().min(1),
    zoneIds: z.array(z.string()).min(1).max(40),
    dehnungFestX: z.array(z.string()).max(40).default([]),
    dehnungFestY: z.array(z.string()).max(40).default([]),
    regeln: z.array(z.string()).max(8).default([]),
  }),
  summarize: (p) =>
    `Vorlage «${p.name}» (${p.zoneIds.length} Zonen${p.regeln.length > 0 ? `, Regeln ${p.regeln.join(', ')}` : ''})`,
  run: (doc, p) => {
    for (const id of p.regeln) {
      if (!(id in REGEL_PRESETS)) {
        throw new CommandError(`Unbekanntes Regel-Preset «${id}» — bekannt: ${Object.keys(REGEL_PRESETS).join(', ')}`);
      }
    }
    const zonen = p.zoneIds.map((id) => require<Zone>(doc, id, 'zone'));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const z of zonen) {
      for (const pt of z.outline) {
        minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y);
      }
    }
    const storeyId = zonen[0]!.storeyId;
    const moebel = doc
      .byKind<Furniture>('furniture')
      .filter((f) => f.storeyId === storeyId && f.at.x >= minX && f.at.x <= maxX && f.at.y >= minY && f.at.y <= maxY)
      .map((f) => ({ typ: f.typ, at: { x: f.at.x - minX, y: f.at.y - minY }, rotationGrad: f.rotationGrad }));
    const tueren = doc
      .byKind<import('../model/entities').ZonenTuer>('zonentuer')
      .filter((t) => t.storeyId === storeyId && t.at.x >= minX && t.at.x <= maxX && t.at.y >= minY && t.at.y <= maxY)
      .map((t) => ({ at: { x: t.at.x - minX, y: t.at.y - minY }, breite: t.breite }));
    const vorlage = {
      name: p.name,
      breite: maxX - minX,
      hoehe: maxY - minY,
      zonen: zonen.map((z) => ({
        outline: z.outline.map((pt) => ({ x: pt.x - minX, y: pt.y - minY })),
        name: z.name,
        sia: z.sia,
        ...(z.raumTyp ? { raumTyp: z.raumTyp } : {}),
        ...(p.dehnungFestX.includes(z.id) ? { dehnungX: 'fest' as const } : {}),
        ...(p.dehnungFestY.includes(z.id) ? { dehnungY: 'fest' as const } : {}),
      })),
      ...(moebel.length > 0 ? { moebel } : {}),
      ...(tueren.length > 0 ? { tueren } : {}),
      ...(p.regeln.length > 0 ? { regeln: p.regeln } : {}),
    };
    const after = {
      ...doc.settings,
      vorlagen: [...doc.settings.vorlagen.filter((v) => v.name !== p.name), vorlage],
    };
    return [{ settings: true as const, before: doc.settings, after }];
  },
});

export const placeTemplate = registerCommand({
  id: 'design.vorlageSetzen',
  title: 'Zonen-Vorlage absetzen',
  description:
    'Setzt eine gespeicherte Zonen-Vorlage ab: at = linke untere Ecke (mm). Optional breite/hoehe (mm) strecken das Layout ACHSWEISE linear — feste Zonen (F7-Lock, dehnungX/dehnungY=fest) behalten ihr Originalmass, die dehnbaren nehmen die Differenz auf (ohne Locks: alle Zonen skalieren gleichmässig mit, Verhältnis bleibt je Achse, wie bisher). Trägt die Vorlage eingebettete Regeln, werden sie mit bestehenden Raumregeln vereinigt (nie überschrieben). Ein Undo-Schritt.',
  params: z.object({
    storeyId: z.string(),
    name: z.string(),
    at: z.object({ x: z.number(), y: z.number() }),
    breite: z.number().positive().nullable().default(null),
    hoehe: z.number().positive().nullable().default(null),
    /** true = an der senkrechten Mittelachse gespiegelt (Ost↔West). */
    spiegeln: z.boolean().default(false),
  }),
  summarize: (p, doc) => {
    const vorlage = doc.settings.vorlagen.find((v) => v.name === p.name);
    const regelnHinweis = vorlage?.regeln?.length ? ` + Regeln ${vorlage.regeln.join(', ')} übernommen` : '';
    return `Vorlage «${p.name}» absetzen${p.spiegeln ? ' (gespiegelt)' : ''}${regelnHinweis}`;
  },
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const vorlage = doc.settings.vorlagen.find((v) => v.name === p.name);
    if (!vorlage) throw new CommandError(`Vorlage «${p.name}» existiert nicht`);
    const mapX = achsenDehnung(vorlage, 'x', p.breite);
    const mapY = achsenDehnung(vorlage, 'y', p.hoehe);
    const zielX = p.breite ?? vorlage.breite;
    // Spiegelung an der senkrechten Mittelachse NACH der Streckung (im
    // Zielmass): zielX − mapX(x). Bei uniformer Streckung (Alt-Vorlagen ohne
    // Locks, mapX(x) = x·sx) rechnerisch identisch zur alten Reihenfolge
    // Spiegeln-dann-Skalieren — byte-gleich fürs Bestandsverhalten.
    const px = (x: number) => (p.spiegeln ? zielX - mapX(x) : mapX(x));
    const py = (y: number) => mapY(y);
    const patches: AnyPatch[] = vorlage.zonen.map((vz) => {
      const outline = vz.outline.map((pt) => ({
        x: Math.round(p.at.x + px(pt.x)),
        y: Math.round(p.at.y + py(pt.y)),
      }));
      if (p.spiegeln) outline.reverse();
      return added({
        id: newId('zone'),
        kind: 'zone' as const,
        storeyId: p.storeyId,
        name: vz.name,
        sia: vz.sia as Zone['sia'],
        ...(vz.raumTyp ? { raumTyp: vz.raumTyp } : {}),
        outline,
      });
    });
    for (const m of vorlage.moebel ?? []) {
      patches.push(added({
        id: newId('moebel'), kind: 'furniture' as const, storeyId: p.storeyId,
        typ: m.typ, at: { x: Math.round(p.at.x + px(m.at.x)), y: Math.round(p.at.y + py(m.at.y)) },
        rotationGrad: p.spiegeln ? ((360 - m.rotationGrad) % 360) : m.rotationGrad,
      }));
    }
    for (const t of vorlage.tueren ?? []) {
      patches.push(added({
        id: newId('tuer'), kind: 'zonentuer' as const, storeyId: p.storeyId,
        at: { x: Math.round(p.at.x + px(t.at.x)), y: Math.round(p.at.y + py(t.at.y)) },
        breite: t.breite,
      }));
    }
    // Regeln-in-Vorlagen (E5-v): eingebettete Presets vereinigen, NIE still
    // überschreiben — nur fehlende Raumtypen werden ergänzt.
    if (vorlage.regeln?.length) {
      const vereint = vereinigeRaumRegeln(doc.settings.raumRegeln, vorlage.regeln);
      if (vereint) {
        patches.push({
          settings: true as const,
          before: { raumRegeln: doc.settings.raumRegeln },
          after: { raumRegeln: vereint },
        });
      }
    }
    return patches;
  },
});

export const placeFurniture = registerCommand({
  id: 'design.moebelSetzen',
  title: 'Möbel setzen',
  description:
    'Setzt ein Möbel aus dem Katalog (bett-doppel, bett-einzel, kuechenzeile, wc, lavabo, dusche, esstisch, schrank) an Position at (mm, Mitte der Rückkante) mit rotationGrad. Jedes Möbel bringt seine SIA-500-Bewegungsfläche mit; Kollisionen mit Wänden meldet der Grundriss-Check.',
  params: z.object({
    storeyId: z.string(),
    typ: z.enum(['bett-doppel', 'bett-einzel', 'kuechenzeile', 'wc', 'lavabo', 'dusche', 'esstisch', 'schrank']),
    at: z.object({ x: z.number(), y: z.number() }),
    rotationGrad: z.number().default(0),
  }),
  summarize: (p) => `Möbel «${p.typ}»`,
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const moebel: Furniture = {
      id: newId('moebel'),
      kind: 'furniture',
      storeyId: p.storeyId,
      typ: p.typ,
      at: p.at,
      rotationGrad: p.rotationGrad,
    };
    return [added(moebel)];
  },
});

export const setKpiFormulas = registerCommand({
  id: 'design.kennzahlFormelnSetzen',
  title: 'Kennzahl-Formeln setzen',
  description:
    'Setzt Custom-Kennzahlen fürs Kennzahlen-Panel: je Formel name, wert (Multiplikator pro m²), basis (gf/agf/hnf/ngf) und einheit — z.B. Erstellungskosten 3200 CHF/m² aGF oder Ökobilanz-Proxy 450 kg CO2e/m² GF. Leeres Array löscht alle.',
  params: z.object({
    formeln: z
      .array(
        z.object({
          name: z.string().min(1),
          wert: z.number().nonnegative(),
          basis: z.enum(['gf', 'agf', 'hnf', 'ngf']),
          einheit: z.string().min(1),
        }),
      )
      .max(12),
  }),
  summarize: (p) => `${p.formeln.length} Kennzahl-Formel(n)`,
  run: (doc, p) => [
    { settings: true as const, before: doc.settings, after: { ...doc.settings, kennzahlFormeln: p.formeln } },
  ],
});

export const setZoneRule = registerCommand({
  id: 'design.zonenRegelSetzen',
  title: 'Zonenregel setzen',
  description:
    'Setzt die aktive CH-Zonenregel (Richtwerte, kein Ersatz fürs Baureglement): Ausnützungsziffer az, maxHoehe (mm über Projektnull), maxVollgeschosse, Grenzabstände klein/gross (mm). Mit parzellenFlaeche (m²) wird das zulässige aGF-Maximum (az × Fläche) automatisch in die Berechnungsliste übernommen. null löscht die Regel.',
  params: z.object({
    name: z.string().describe('z.B. «W2b (Richtwert ZG)»'),
    az: z.number().positive().max(3).nullable().default(null),
    maxHoehe: z.number().int().positive().nullable().default(null),
    maxVollgeschosse: z.number().int().positive().nullable().default(null),
    grenzabstandKlein: z.number().int().positive().nullable().default(null),
    grenzabstandGross: z.number().int().positive().nullable().default(null),
    parzellenFlaeche: z.number().positive().nullable().default(null).describe('m²'),
  }),
  summarize: (p) =>
    `Zonenregel «${p.name}»${p.az ? ` (AZ ${p.az})` : ''}${p.parzellenFlaeche ? ` auf ${p.parzellenFlaeche} m²` : ''}`,
  run: (doc, p) => {
    const regel = {
      name: p.name,
      az: p.az,
      maxHoehe: p.maxHoehe,
      maxVollgeschosse: p.maxVollgeschosse,
      grenzabstandKlein: p.grenzabstandKlein,
      grenzabstandGross: p.grenzabstandGross,
    };
    const parzelle = p.parzellenFlaeche ?? doc.settings.parzellenFlaeche;
    const after = {
      ...doc.settings,
      zonenRegel: regel,
      parzellenFlaeche: parzelle,
      // AZ × Parzellenfläche speist Δ-Max der Berechnungsliste
      maxAgf: p.az && parzelle ? Math.round(p.az * parzelle) : doc.settings.maxAgf,
    };
    return [{ settings: true as const, before: doc.settings, after }];
  },
});

export const setRoomRules = registerCommand({
  id: 'design.regelnSetzen',
  title: 'Raumregeln setzen',
  description:
    'Setzt die Raumtyp-Regeln der Grundriss-Checks: preset «ch-wohnbau» (Richtwerte Zimmer/Wohnen/Küche/Bad/Korridor), «wettbewerb» (lockerer) oder «aus»; alternativ eigene Regeln (raumTyp, minFlaeche m², minBreite mm, tageslicht). Verletzte Zonen erscheinen in den Checks und werden im Plan getönt.',
  params: z.object({
    preset: z.enum(['ch-wohnbau', 'wettbewerb', 'aus']).optional(),
    regeln: z
      .array(
        z.object({
          raumTyp: z.string(),
          minFlaeche: z.number().positive().nullable().default(null),
          minBreite: z.number().int().positive().nullable().default(null),
          tageslicht: z.boolean().default(false),
        }),
      )
      .optional(),
  }),
  summarize: (p) => `Raumregeln ${p.preset ?? `(${p.regeln?.length ?? 0} eigene)`}`,
  run: (doc, p) => {
    const regeln = p.regeln ?? (p.preset && p.preset !== 'aus' ? REGEL_PRESETS[p.preset] : []);
    return [{ settings: true as const, before: doc.settings, after: { ...doc.settings, raumRegeln: regeln } }];
  },
});

export const setPhase = registerCommand({
  id: 'design.phaseSetzen',
  title: 'SIA-Phase setzen',
  description:
    'Stellt den Detaillierungsgrad der Pläne nach SIA-Phase ein: wettbewerb (wie vorprojekt, 1:200), vorprojekt (Wände als einfaches Poché, Öffnungen als Aussparung, 1:200), bauprojekt (Schichten sichtbar, Symbole, ohne feine Materialschraffuren, 1:100), baueingabe (wie bauprojekt, 1:100), werkplan (volle Detaillierung mit SIA-Materialschraffuren, 1:50). Wirkt auf Grundriss, Schnitt, Druck und Plankopf; die konkrete Poché-Füllung (schwarz vs. Material) steuert zusätzlich design.pocheModusSetzen.',
  params: z.object({
    phase: z.enum(['wettbewerb', 'vorprojekt', 'bauprojekt', 'baueingabe', 'werkplan']),
  }),
  summarize: (p) => `Phase: ${p.phase}`,
  run: (doc, p) => {
    return [{ settings: true, before: { phase: doc.settings.phase }, after: { phase: p.phase } }];
  },
});

export const setSiaPhase = registerCommand({
  id: 'design.siaPhaseSetzen',
  title: 'SIA-Teilphase setzen',
  description:
    'Setzt die aktuelle SIA-Teilphase des Projekts (Wettbewerb/Vorprojekt/Bauprojekt/Bewilligung/Ausschreibung/Ausführung/Abnahme) — der reale Projektstand im SIA-102/112-Zyklus vom Wettbewerb bis zur Gebäudeabnahme nach Bauende. Getrennt von der Plan-Detaillierung (design.phaseSetzen): dieser Command koppelt den Plan-Detaillierungsgrad NICHT automatisch, nennt aber in der Zusammenfassung, welcher dazu passen würde — Owner entscheidet selbst, ob und wann er umschaltet.',
  params: z.object({
    // v0.7.2 (Stream W2-C, Spec §4/§11 «Bewusste Änderung: zod-SiaPhase»):
    // 'strategie' additiv aufgenommen (SIA 112 Ph. 1) — die einzige zod-
    // Settings-Prüfung, die den erweiterten `SiaPhase`-Typ tatsächlich
    // durchsetzt (`design.siaPhaseSetzen` ist der einzige Schreibweg).
    siaPhase: z.enum([
      'strategie',
      'wettbewerb',
      'vorprojekt',
      'bauprojekt',
      'bewilligung',
      'ausschreibung',
      'ausfuehrung',
      'abnahme',
    ]),
  }),
  summarize: (p, doc) => {
    const empfohlen = empfohlenePlanPhase(p.siaPhase);
    const hinweis =
      doc.settings.phase === empfohlen
        ? `Plan-Detaillierung passt bereits (${phaseLabel(empfohlen)})`
        : `passender Plan-Detaillierungsgrad wäre ${phaseLabel(empfohlen)} — nicht automatisch gesetzt`;
    return `SIA-Teilphase: ${siaPhaseLabel(p.siaPhase)} (${hinweis})`;
  },
  run: (doc, p) => {
    return [{ settings: true, before: { siaPhase: doc.settings.siaPhase }, after: { siaPhase: p.siaPhase } }];
  },
});

export const setPocheModus = registerCommand({
  id: 'design.pocheModusSetzen',
  title: 'Poché-Modus setzen',
  description:
    'Setzt den Poché-Modus für Grundriss und Schnitt (v0.7.0 E2): phase (Default, Abwesenheit) lässt die SIA-Phase entscheiden — Wettbewerb/Vorprojekt ein schwarzes Poché, Bauprojekt/Baueingabe Schichten schwarz/grau, Werkplan das heutige Material-Verhalten mit Schraffuren; schwarz erzwingt die Schwarz-Darstellung in jeder Phase; material erzwingt die Material-Tönung in jeder Phase (auch früh im SIA-Zyklus). Reine Darstellungsebene, ändert keine Geometrie/Mengen.',
  params: z.object({
    pocheModus: z.enum(['phase', 'schwarz', 'material']),
  }),
  summarize: (p) => `Poché-Modus: ${p.pocheModus}`,
  run: (doc, p) => {
    return [
      {
        settings: true as const,
        // Schmales Patch (nur `pocheModus`), wie bei `schnitt` (s. dortigen
        // Kommentar): ein optionales Feld ohne defaultSettings-Eintrag
        // braucht beim Undo einen expliziten «vorher»-Wert, sonst löscht das
        // Object-Spread-Undo den Schlüssel nicht zurück in die Abwesenheit.
        before: { pocheModus: doc.settings.pocheModus ?? 'phase' },
        after: { pocheModus: p.pocheModus },
      },
    ];
  },
});

export const setDarstellung3d = registerCommand({
  id: 'design.darstellung3dSetzen',
  title: '3D-Darstellungsmodus setzen',
  description:
    'Setzt den 3D-Darstellungsmodus (v0.7.0 E3): auto (Default, Abwesenheit) löst über die SIA-Teilphase auf — bis und mit Baueingabe (Bewilligung) weiss, ab Ausschreibung Material; weiss/material/schwarz erzwingen den jeweiligen Modus. Fenster bleiben in jedem Modus transparent. Reine Projektsemantik (Yjs/Undo) — der Textur-Toggle am Viewport bleibt lokal.',
  params: z.object({
    darstellung3d: z.enum(['auto', 'material', 'weiss', 'schwarz']),
  }),
  summarize: (p) => `3D-Darstellung: ${p.darstellung3d}`,
  run: (doc, p) => {
    return [
      {
        settings: true as const,
        before: { darstellung3d: doc.settings.darstellung3d ?? 'auto' },
        after: { darstellung3d: p.darstellung3d },
      },
    ];
  },
});

export const setFensterBoegen = registerCommand({
  id: 'design.fensterBoegenSetzen',
  title: 'Fenster-Öffnungsflügel-Bogen setzen',
  description:
    'Schaltet den Öffnungsflügel-Bogen (H-42) bei parametrischen Fenstern im Grundriss ein oder aus. Default (Abwesenheit) an — Bestandsverhalten. Aus blendet nur die Bogen-Symbolik aus, die Teilungslinien und das Fenstersymbol selbst bleiben.',
  params: z.object({
    fensterBoegen: z.boolean(),
  }),
  summarize: (p) => `Fenster-Öffnungsbogen: ${p.fensterBoegen ? 'an' : 'aus'}`,
  run: (doc, p) => {
    return [
      {
        settings: true as const,
        before: { fensterBoegen: doc.settings.fensterBoegen ?? true },
        after: { fensterBoegen: p.fensterBoegen },
      },
    ];
  },
});

export const setKvKennwerte = registerCommand({
  id: 'design.kvKennwerteSetzen',
  title: 'KV-Kennwerte setzen',
  description:
    'Setzt die Kennwerte der KV-Grobschätzung (BKP-2-Stellen-Niveau, Richtwert — kein Devis, keine NPK-Positionen): chfProM2Gf (BKP-2-Basiswert CHF/m² GF), anteilRohbau/anteilAusbau/anteilTechnik (Anteile am BKP-2-Basiswert, 0..1), zuschlagUmgebung (BKP 4, Anteil der BKP-2-Summe), zuschlagBaunebenkosten (BKP 5, Anteil der BKP-2-Summe), reserve (Anteil der Zwischensumme BKP 2+4+5). Nur genannte Felder werden geändert, alle Werte bleiben Owner-Annahmen ohne Norm-Bezug.',
  params: z.object({
    chfProM2Gf: z.number().positive().optional(),
    anteilRohbau: z.number().min(0).max(1).optional(),
    anteilAusbau: z.number().min(0).max(1).optional(),
    anteilTechnik: z.number().min(0).max(1).optional(),
    zuschlagUmgebung: z.number().min(0).max(1).optional(),
    zuschlagBaunebenkosten: z.number().min(0).max(1).optional(),
    reserve: z.number().min(0).max(1).optional(),
  }),
  summarize: (p) =>
    `KV-Kennwerte: ${[
      p.chfProM2Gf !== undefined ? `${p.chfProM2Gf} CHF/m² GF` : null,
      p.anteilRohbau !== undefined ? `Rohbau ${Math.round(p.anteilRohbau * 100)}%` : null,
      p.anteilAusbau !== undefined ? `Ausbau ${Math.round(p.anteilAusbau * 100)}%` : null,
      p.anteilTechnik !== undefined ? `Technik ${Math.round(p.anteilTechnik * 100)}%` : null,
      p.zuschlagUmgebung !== undefined ? `Umgebung +${Math.round(p.zuschlagUmgebung * 100)}%` : null,
      p.zuschlagBaunebenkosten !== undefined ? `Baunebenkosten +${Math.round(p.zuschlagBaunebenkosten * 100)}%` : null,
      p.reserve !== undefined ? `Reserve +${Math.round(p.reserve * 100)}%` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'unverändert'} (Richtwert, kein Devis)`,
  run: (doc, p) => {
    const alt = doc.settings.kvKennwerte;
    const neu = {
      chfProM2Gf: p.chfProM2Gf ?? alt.chfProM2Gf,
      anteilRohbau: p.anteilRohbau ?? alt.anteilRohbau,
      anteilAusbau: p.anteilAusbau ?? alt.anteilAusbau,
      anteilTechnik: p.anteilTechnik ?? alt.anteilTechnik,
      zuschlagUmgebung: p.zuschlagUmgebung ?? alt.zuschlagUmgebung,
      zuschlagBaunebenkosten: p.zuschlagBaunebenkosten ?? alt.zuschlagBaunebenkosten,
      reserve: p.reserve ?? alt.reserve,
    };
    return [{ settings: true, before: { kvKennwerte: alt }, after: { kvKennwerte: neu } }];
  },
});

export const setBauablaufKennwerte = registerCommand({
  id: 'design.bauablaufKennwerteSetzen',
  title: 'Bauablauf-Kennwerte setzen',
  description:
    'Setzt die Leistungswerte des Bauablaufplans (Grob-Terminplan, Richtwert — ersetzt keine Bauleitung): m2AushubProWoche/m3RohbauProWoche/m2DachProWoche/m2HuelleProWoche (Menge pro Woche je Gewerk), m2ElektroProWoche/m2SanitaerHeizungProWoche/m2TrockenbauProWoche/m2BodenbelaegeProWoche/m2MalerProWoche (Innenausbau-Gewerke, m² Geschossfläche pro Woche), m2UmgebungProWoche, abnahmeWochen (feste Dauer, kein Mengenbezug) und minDauerWochen (Mindestdauer je Phase). Nur genannte Felder werden geändert, alle Werte bleiben Owner-Annahmen ohne Norm-Bezug.',
  params: z.object({
    m2AushubProWoche: z.number().positive().optional(),
    m3RohbauProWoche: z.number().positive().optional(),
    m2DachProWoche: z.number().positive().optional(),
    m2HuelleProWoche: z.number().positive().optional(),
    m2ElektroProWoche: z.number().positive().optional(),
    m2SanitaerHeizungProWoche: z.number().positive().optional(),
    m2TrockenbauProWoche: z.number().positive().optional(),
    m2BodenbelaegeProWoche: z.number().positive().optional(),
    m2MalerProWoche: z.number().positive().optional(),
    m2UmgebungProWoche: z.number().positive().optional(),
    abnahmeWochen: z.number().min(0).optional(),
    minDauerWochen: z.number().min(0).optional(),
  }),
  summarize: (p) =>
    `Bauablauf-Kennwerte: ${[
      p.m2AushubProWoche !== undefined ? `Aushub ${p.m2AushubProWoche} m²/Woche` : null,
      p.m3RohbauProWoche !== undefined ? `Rohbau ${p.m3RohbauProWoche} m³/Woche` : null,
      p.m2DachProWoche !== undefined ? `Dach ${p.m2DachProWoche} m²/Woche` : null,
      p.m2HuelleProWoche !== undefined ? `Hülle ${p.m2HuelleProWoche} m²/Woche` : null,
      p.m2ElektroProWoche !== undefined ? `Elektro ${p.m2ElektroProWoche} m²/Woche` : null,
      p.m2SanitaerHeizungProWoche !== undefined ? `Sanitär/Heizung ${p.m2SanitaerHeizungProWoche} m²/Woche` : null,
      p.m2TrockenbauProWoche !== undefined ? `Trockenbau ${p.m2TrockenbauProWoche} m²/Woche` : null,
      p.m2BodenbelaegeProWoche !== undefined ? `Bodenbeläge ${p.m2BodenbelaegeProWoche} m²/Woche` : null,
      p.m2MalerProWoche !== undefined ? `Maler ${p.m2MalerProWoche} m²/Woche` : null,
      p.m2UmgebungProWoche !== undefined ? `Umgebung ${p.m2UmgebungProWoche} m²/Woche` : null,
      p.abnahmeWochen !== undefined ? `Abnahme ${p.abnahmeWochen} Wochen fix` : null,
      p.minDauerWochen !== undefined ? `Mindestdauer ${p.minDauerWochen} Wochen` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'unverändert'} (Richtwert, ersetzt keine Bauleitung)`,
  run: (doc, p) => {
    const alt = doc.settings.bauablaufKennwerte;
    const neu = {
      m2AushubProWoche: p.m2AushubProWoche ?? alt.m2AushubProWoche,
      m3RohbauProWoche: p.m3RohbauProWoche ?? alt.m3RohbauProWoche,
      m2DachProWoche: p.m2DachProWoche ?? alt.m2DachProWoche,
      m2HuelleProWoche: p.m2HuelleProWoche ?? alt.m2HuelleProWoche,
      m2ElektroProWoche: p.m2ElektroProWoche ?? alt.m2ElektroProWoche,
      m2SanitaerHeizungProWoche: p.m2SanitaerHeizungProWoche ?? alt.m2SanitaerHeizungProWoche,
      m2TrockenbauProWoche: p.m2TrockenbauProWoche ?? alt.m2TrockenbauProWoche,
      m2BodenbelaegeProWoche: p.m2BodenbelaegeProWoche ?? alt.m2BodenbelaegeProWoche,
      m2MalerProWoche: p.m2MalerProWoche ?? alt.m2MalerProWoche,
      m2UmgebungProWoche: p.m2UmgebungProWoche ?? alt.m2UmgebungProWoche,
      abnahmeWochen: p.abnahmeWochen ?? alt.abnahmeWochen,
      minDauerWochen: p.minDauerWochen ?? alt.minDauerWochen,
    };
    return [{ settings: true, before: { bauablaufKennwerte: alt }, after: { bauablaufKennwerte: neu } }];
  },
});

export const setDimensionStyle = registerCommand({
  id: 'design.bemassungSetzen',
  title: 'Bemassungs-Stil setzen',
  description:
    'Stellt den Bemassungs-Stil des Projekts ein (wirkt in Grundriss, Schnitt, Druck und DXF). aussenKetten: beide (Öffnungen + Gesamtmass), gesamt (nur Gesamtmass) oder keine. innenKetten: Ketten auf den Achsen der Innenwände (Werkplan). hoehenKoten: Geschoss-Koten in Schnitt und Ansicht. rohKette: Rohkonstruktions-Kette (Kanten der tragenden Schicht als 3. Kette, Werkplan). Nur genannte Felder werden geändert.',
  params: z.object({
    aussenKetten: z.enum(['beide', 'gesamt', 'keine']).optional(),
    innenKetten: z.boolean().optional(),
    hoehenKoten: z.boolean().optional(),
    rohKette: z.boolean().optional(),
  }),
  summarize: (p) =>
    `Bemassung: ${[
      p.aussenKetten !== undefined ? `aussen ${p.aussenKetten}` : null,
      p.innenKetten !== undefined ? `innen ${p.innenKetten ? 'an' : 'aus'}` : null,
      p.hoehenKoten !== undefined ? `Koten ${p.hoehenKoten ? 'an' : 'aus'}` : null,
      p.rohKette !== undefined ? `Rohkette ${p.rohKette ? 'an' : 'aus'}` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'unverändert'}`,
  run: (doc, p) => {
    const alt = doc.settings.bemassung;
    const neu = {
      aussenKetten: p.aussenKetten ?? alt.aussenKetten,
      innenKetten: p.innenKetten ?? alt.innenKetten,
      hoehenKoten: p.hoehenKoten ?? alt.hoehenKoten,
      rohKette: p.rohKette ?? alt.rohKette ?? false,
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
    // Querachsen A… (waagrecht). Bijektive Basis-26-Beschriftung (A…Z, AA, AB, …)
    // statt `j % 26` — sonst tragen Achse 1 und 27 beide «A» (querAnzahl bis 40).
    const querLabel = (j: number): string => {
      let s = '';
      let n = j + 1;
      while (n > 0) {
        const r = (n - 1) % 26;
        s = String.fromCharCode(65 + r) + s;
        n = Math.floor((n - 1) / 26);
      }
      return s;
    };
    for (let j = 0; j < p.querAnzahl; j++) {
      const y = p.origin.y + j * quer;
      achse(
        querLabel(j),
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

/**
 * Mängel-/Abnahme-Commands (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * Abschnitt 4, Lücken-Batch 5, Owner-Hauptaufgabe K22) — Abschlussphase
 * «Gebäudeabnahme». Kein Bauteilbezug (s. `Mangel`-Kommentar in
 * `model/entities.ts`); `erfasstAm`/`behobenAm` sind Parameter (App liefert
 * `toLocaleDateString('de-CH')`), NIE `Date.now()` im Command selbst.
 */
export const mangelErfassen = registerCommand({
  id: 'design.mangelErfassen',
  title: 'Mangel erfassen',
  description:
    'Erfasst einen Mangel für die Schlussbegehung (Abschlussphase «Gebäudeabnahme»). ort ist ein freier Lagetext (z.B. «Bad 2.OG»), optional ergänzt um storeyId (Geschossbezug) und/oder at (Welt-mm). gewerk ist ein freies Feld — Vorschläge kommen aus der Bauablauf-Gewerkeliste, jeder Text ist gültig. erfasstAm ist ein vorformatiertes Datum (de-CH) — die App liefert das Tagesdatum, der Kernel rechnet nie selbst mit der Uhrzeit. Status startet immer bei «offen».',
  params: z.object({
    ort: z.string().min(1).describe('Freier Lagetext, z.B. «Bad 2.OG»'),
    storeyId: z.string().optional().describe('Optionaler Geschossbezug'),
    at: PtSchema.optional().describe('Optionaler Lagepunkt in Welt-mm'),
    beschreibung: z.string().min(1),
    gewerk: z.string().min(1).describe('Freies Feld, z.B. «Sanitär/Heizung» — Vorschlagsliste aus dem Bauablaufplan'),
    erfasstAm: z.string().min(1).describe('Vorformatiertes Datum, z.B. 08.07.2026'),
    frist: z.string().optional().describe('Optionale Frist zur Behebung (Text oder Datum)'),
  }),
  summarize: (p) => `Mangel erfasst: ${p.ort} — ${p.beschreibung.slice(0, 40)}`,
  run: (doc, p) => {
    if (p.storeyId) require<Storey>(doc, p.storeyId, 'storey');
    const mangel: Mangel = {
      id: newId('mangel'),
      kind: 'mangel',
      ort: p.ort,
      beschreibung: p.beschreibung,
      gewerk: p.gewerk,
      status: 'offen',
      erfasstAm: p.erfasstAm,
      ...(p.storeyId !== undefined ? { storeyId: p.storeyId } : {}),
      ...(p.at !== undefined ? { at: p.at as Pt } : {}),
      ...(p.frist !== undefined ? { frist: p.frist } : {}),
    };
    return [added(mangel)];
  },
});

export const mangelStatusSetzen = registerCommand({
  id: 'design.mangelStatusSetzen',
  title: 'Mangel-Status setzen',
  description:
    'Setzt den Status eines erfassten Mangels: «behoben» braucht behobenAm (vorformatiertes Datum, de-CH — die App liefert das Tagesdatum). Zurückstufen auf «offen» löscht behobenAm wieder.',
  params: z.object({
    mangelId: z.string(),
    status: z.enum(['offen', 'behoben']),
    behobenAm: z.string().optional().describe('Pflicht bei status «behoben»'),
  }),
  summarize: (p) => (p.status === 'behoben' ? `Mangel behoben (${p.behobenAm ?? '?'})` : 'Mangel wieder offen'),
  run: (doc, p) => {
    const mangel = require<Mangel>(doc, p.mangelId, 'mangel');
    if (p.status === 'behoben' && !p.behobenAm) {
      throw new CommandError('Status «behoben» braucht ein Datum (behobenAm)');
    }
    const { behobenAm: _weg, ...ohne } = mangel;
    void _weg;
    const after: Mangel = {
      ...ohne,
      status: p.status,
      ...(p.status === 'behoben' ? { behobenAm: p.behobenAm as string } : {}),
    };
    return [{ id: mangel.id, before: mangel, after }];
  },
});

export const mangelLoeschen = registerCommand({
  id: 'design.mangelLoeschen',
  title: 'Mangel löschen',
  description: 'Löscht einen erfassten Mangel wieder (z.B. Fehleintrag).',
  params: z.object({ mangelId: z.string() }),
  summarize: () => 'Mangel gelöscht',
  run: (doc, p) => {
    const mangel = require<Mangel>(doc, p.mangelId, 'mangel');
    return [{ id: mangel.id, before: mangel, after: null }];
  },
});

/**
 * Kommentar-Commands (v0.8.3 E1, `docs/V083-SPEZ.md` §1, Island-§8-Freigabe
 * §8-6) — freie Projekt-Notizen, unabhängig vom Mängel-/Abnahme-Workflow
 * oben. Kein Bauteilbezug (s. `Kommentar`-Kommentar in `model/entities.ts`);
 * `erstelltAm`/`erledigtAm` sind Parameter (App liefert
 * `toLocaleDateString('de-CH')`), NIE `Date.now()` im Command selbst.
 */
export const kommentarSetzen = registerCommand({
  id: 'design.kommentarSetzen',
  title: 'Kommentar setzen',
  description:
    'Setzt einen freien Projekt-Kommentar. at ist ein Welt-mm-Punkt, storeyId optional für den Geschossbezug. erstelltAm ist ein vorformatiertes Datum (de-CH) — die App liefert das Tagesdatum, der Kernel rechnet nie selbst mit der Uhrzeit. Status startet immer bei «offen».',
  params: z.object({
    text: z.string().min(1),
    autor: z.string().min(1),
    at: PtSchema,
    storeyId: z.string().optional(),
    erstelltAm: z.string().min(1).describe('Vorformatiertes Datum, z.B. 17.07.2026'),
  }),
  summarize: (p) => `Kommentar: ${p.text.slice(0, 40)}`,
  run: (doc, p) => {
    if (p.storeyId) require<Storey>(doc, p.storeyId, 'storey');
    const kommentar: Kommentar = {
      id: newId('kommentar'),
      kind: 'kommentar',
      text: p.text,
      autor: p.autor,
      at: p.at as Pt,
      status: 'offen',
      erstelltAm: p.erstelltAm,
      ...(p.storeyId !== undefined ? { storeyId: p.storeyId } : {}),
    };
    return [added(kommentar)];
  },
});

export const kommentarStatusSetzen = registerCommand({
  id: 'design.kommentarStatusSetzen',
  title: 'Kommentar-Status setzen',
  description:
    'Setzt den Status eines Kommentars: «erledigt» braucht erledigtAm (vorformatiertes Datum, de-CH — die App liefert das Tagesdatum). Zurückstufen auf «offen» löscht erledigtAm wieder.',
  params: z.object({
    kommentarId: z.string(),
    status: z.enum(['offen', 'erledigt']),
    erledigtAm: z.string().optional().describe('Pflicht bei status «erledigt»'),
  }),
  summarize: (p) => (p.status === 'erledigt' ? `Kommentar erledigt (${p.erledigtAm ?? '?'})` : 'Kommentar wieder offen'),
  run: (doc, p) => {
    const kommentar = require<Kommentar>(doc, p.kommentarId, 'kommentar');
    if (p.status === 'erledigt' && !p.erledigtAm) {
      throw new CommandError('Status «erledigt» braucht ein Datum (erledigtAm)');
    }
    const { erledigtAm: _weg, ...ohne } = kommentar;
    void _weg;
    const after: Kommentar = {
      ...ohne,
      status: p.status,
      ...(p.status === 'erledigt' ? { erledigtAm: p.erledigtAm as string } : {}),
    };
    return [{ id: kommentar.id, before: kommentar, after }];
  },
});

export const kommentarLoeschen = registerCommand({
  id: 'design.kommentarLoeschen',
  title: 'Kommentar löschen',
  description: 'Löscht einen Kommentar wieder (z.B. Fehleintrag).',
  params: z.object({ kommentarId: z.string() }),
  summarize: () => 'Kommentar gelöscht',
  run: (doc, p) => {
    const kommentar = require<Kommentar>(doc, p.kommentarId, 'kommentar');
    return [{ id: kommentar.id, before: kommentar, after: null }];
  },
});

/**
 * MassKette-Command (v0.8.3 E2, `docs/V083-SPEZ.md` §2, Island-§8-Freigabe
 * §8-7) — ein echtes, benutzergesetztes Punkt-zu-Punkt-Mess-Ergebnis.
 * Eigenständiger, additiver Command-Pfad — `design.bemassungSetzen` (steuert
 * nur die automatische Anzeige der assoziativen Aussenbemassung) bleibt
 * byte-gleich, keine Erweiterung des bestehenden Commands.
 */
export const massKetteSetzen = registerCommand({
  id: 'design.massKetteSetzen',
  title: 'Masskette setzen',
  description:
    'Setzt eine Punkt-zu-Punkt-Messkette (mindestens zwei Punkte, Welt-mm) im aktiven Geschoss — ein echtes interaktives Mess-Werkzeug, unabhängig von der automatischen Bemassungsanzeige (design.bemassungSetzen).',
  params: z.object({
    storeyId: z.string(),
    punkte: z.array(PtSchema).min(2),
  }),
  summarize: (p) => {
    const pts = p.punkte as Pt[];
    let gesamt = 0;
    for (let i = 1; i < pts.length; i++) gesamt += dist(pts[i - 1]!, pts[i]!);
    return `Masskette ${formatLength(Math.round(gesamt))}`;
  },
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const masskette: MassKette = {
      id: newId('masskette'),
      kind: 'masskette',
      storeyId: p.storeyId,
      punkte: p.punkte as Pt[],
    };
    return [added(masskette)];
  },
});

export const massKetteLoeschen = registerCommand({
  id: 'design.massKetteLoeschen',
  title: 'Masskette löschen',
  description: 'Löscht eine gesetzte Messkette wieder.',
  params: z.object({ massKetteId: z.string() }),
  summarize: () => 'Masskette gelöscht',
  run: (doc, p) => {
    const masskette = require<MassKette>(doc, p.massKetteId, 'masskette');
    return [{ id: masskette.id, before: masskette, after: null }];
  },
});

/**
 * v0.8.9 E8 (`docs/V089-SPEZ.md` §3) — Punkt-Zug IN PLACE, Muster
 * `design.wandGeometrieSetzen`/`design.treppeGeometrieSetzen`: Identität und
 * storeyId bleiben, NUR `punkte[punktIndex]` ändert sich. Ersetzt den
 * bisherigen Löschen+Neusetzen-Griffweg in `DesignWorkspace.tsx` (der bei
 * jedem Eck-Zug eine NEUE Entity-Id erzeugte — Auswahl/Undo-Gruppe mussten
 * die Id-Wanderung von Hand nachführen). Der Range-Wurf läuft VOR jedem
 * Patch — ein ungültiger Index lässt die Kette unangetastet.
 */
export const massKetteGeometrieSetzen = registerCommand({
  id: 'design.massKetteGeometrieSetzen',
  title: 'Masskette-Geometrie setzen',
  description:
    'Setzt EINEN Punkt einer bestehenden Messkette neu (punktIndex, 0-basiert), OHNE sie zu ersetzen: Identität und storeyId bleiben erhalten. Ein punktIndex ausserhalb der bestehenden Punktliste wirft — die Kette bleibt unangetastet. EIN Command = EIN Undo-Schritt.',
  params: z.object({
    entityId: z.string(),
    punktIndex: z.number().int().min(0),
    punkt: PtSchema,
  }),
  summarize: (p, doc) => {
    const mk = doc.get<MassKette>(p.entityId);
    const pts = mk?.punkte;
    if (!pts) return 'Masskette-Punkt gesetzt';
    let gesamt = 0;
    for (let i = 1; i < pts.length; i++) gesamt += dist(pts[i - 1]!, pts[i]!);
    return `Masskette ${formatLength(Math.round(gesamt))}`;
  },
  run: (doc, p) => {
    const masskette = require<MassKette>(doc, p.entityId, 'masskette');
    if (p.punktIndex >= masskette.punkte.length) {
      throw new CommandError(
        `punktIndex ${p.punktIndex} ausserhalb der Kette (${masskette.punkte.length} Punkte)`,
      );
    }
    const punkte = masskette.punkte.map((q, i) => (i === p.punktIndex ? (p.punkt as Pt) : q));
    return [{ id: masskette.id, before: masskette, after: { ...masskette, punkte } }];
  },
});

/** v0.8.11 P-A3 (docs/V0811-SPEZ.md §2 E3): In-Place-Ecken-Setter für die
 * Decke — bewusst NICHT das Löschen+Neusetzen-Muster der zone/mass/roof-
 * Griffe: `design.loeschen` kaskadiert die Aussparungen einer Decke mit
 * (deleteEntity, hostId-Räumung) — ein blosser Ecken-Zug würde also stumm
 * Durchbrüche vernichten. Dieselbe 0.8.6-E1/0.8.9-E8-Linie wie
 * `wandGeometrieSetzen`/`massKetteGeometrieSetzen`: EIN Patch, Identität
 * bleibt, `holes` bleiben unangetastet. */
export const setSlabGeometry = registerCommand({
  id: 'design.deckeGeometrieSetzen',
  title: 'Decken-Geometrie setzen',
  description:
    'Setzt EINEN Umriss-Eckpunkt einer bestehenden Decke neu (punktIndex, 0-basiert), OHNE sie zu ersetzen: Identität, Dicke, Löcher (holes) und alle Aussparungen bleiben erhalten. Ein punktIndex ausserhalb des Umrisses wirft. EIN Command = EIN Undo-Schritt.',
  params: z.object({
    entityId: z.string(),
    punktIndex: z.number().int().min(0),
    punkt: PtSchema,
  }),
  summarize: () => 'Decken-Ecke gesetzt',
  run: (doc, p) => {
    const slab = require<Slab>(doc, p.entityId, 'slab');
    if (p.punktIndex >= slab.outline.length) {
      throw new CommandError(
        `punktIndex ${p.punktIndex} ausserhalb des Umrisses (${slab.outline.length} Punkte)`,
      );
    }
    const outline = slab.outline.map((q, i) => (i === p.punktIndex ? (p.punkt as Pt) : q));
    return [{ id: slab.id, before: slab, after: { ...slab, outline } }];
  },
});

/** v0.8.11 P-A3 (docs/V0811-SPEZ.md §2 E3): In-Place-a/b-Setter für den
 * Unterzug — Löschen+Neusetzen würde die assoziativen Etiketten des Balkens
 * mitlöschen (deleteEntity räumt Etiketten des Bauteils, A6). Muster
 * `wandGeometrieSetzen`: a und/oder b, mindestens eines; die
 * Mindestlängen-Regel aus `design.unterzugZeichnen` (10 cm) gilt auch hier. */
export const setBeamGeometry = registerCommand({
  id: 'design.unterzugGeometrieSetzen',
  title: 'Unterzug-Geometrie setzen',
  description:
    'Setzt die Achse (a und/oder b) eines bestehenden Unterzugs neu, OHNE ihn zu ersetzen: Identität, breite/hoehe/material und alle Etiketten bleiben erhalten. Eine Ziel-Achse unter 10 cm wirft. EIN Command = EIN Undo-Schritt.',
  params: z.object({
    entityId: z.string(),
    a: PtSchema.optional(),
    b: PtSchema.optional(),
  }),
  summarize: (p, doc) => {
    const bm = doc.get<Beam>(p.entityId);
    if (!bm) return 'Unterzug-Achse gesetzt';
    return `Unterzug ${formatLength(Math.round(Math.hypot(bm.b.x - bm.a.x, bm.b.y - bm.a.y)))}`;
  },
  run: (doc, p) => {
    if (!p.a && !p.b) {
      throw new CommandError('design.unterzugGeometrieSetzen braucht mindestens einen Punkt (a oder b)');
    }
    const beam = require<Beam>(doc, p.entityId, 'beam');
    const a = (p.a as Pt | undefined) ?? beam.a;
    const b = (p.b as Pt | undefined) ?? beam.b;
    if (Math.hypot(b.x - a.x, b.y - a.y) < 100) {
      throw new CommandError('Unterzug braucht eine Achse von mindestens 10 cm');
    }
    return [{ id: beam.id, before: beam, after: { ...beam, a, b } }];
  },
});

/**
 * Kosmo-Präzisier (V2-E5-iv, `docs/V070-KONZEPT.md`, Finch-«Archie»-
 * Äquivalent, `docs/RE-FINCH.md` §1): «repetitive Präzisionsarbeit — exakte
 * Türplatzierung, Compliance-Checks, konsistente Updates über verknüpfte
 * Einheiten». KEIN neues LLM: die drei Commands unten sind deterministische
 * Kernel-Ableitungen + Patches, wie jeder andere Command — `commandTools()`
 * macht sie automatisch zu Kosmo-Werkzeugen.
 *
 * WICHTIG für `summarize` (Command-Vertrag, s. `core.ts`): `summarize` läuft
 * bei einem ECHTEN `execute()` NACH `doc.apply(patches)` — die hier neu
 * gesetzten Zonentüren/Feldwerte stecken dann bereits im Doc, ein
 * Neu-Berechnen der «Kandidaten» fände dieselben Stellen jetzt als behoben
 * vor (dasselbe bekannte Verhalten wie `design.geschossErstellen`, s.
 * dortigen H-38-Kommentar). Die Diff-Karte selbst zeigt IMMER den korrekten
 * Vorher-Text, weil `validateToolCall` (`kosmo-ai/src/tools.ts`) und die
 * `execute(doc, id, params, { dryRun: true })`-Vorschau (`proposal-
 * vorschau.ts`) `summarize` auf dem UNVERÄNDERTEN Doc aufrufen, bevor
 * `doc.apply()` läuft.
 */

/** Kollinearer Überlapp zweier Kanten in mm — reine Längenmessung für die
 * RANGORDNUNG mehrerer Kandidaten; die Wand-Prüfung («liegt eine Wand
 * dazwischen?») übernimmt weiterhin `raumGraph()` (nur «offene» Kanten sind
 * überhaupt Kandidaten hier). */
function kantenUeberlapp(a1: Pt, a2: Pt, b1: Pt, b2: Pt): number {
  const d = { x: a2.x - a1.x, y: a2.y - a1.y };
  const len = Math.hypot(d.x, d.y);
  if (len < 1) return 0;
  const e = { x: d.x / len, y: d.y / len };
  const n = { x: -e.y, y: e.x };
  const abst1 = Math.abs((b1.x - a1.x) * n.x + (b1.y - a1.y) * n.y);
  const abst2 = Math.abs((b2.x - a1.x) * n.x + (b2.y - a1.y) * n.y);
  if (abst1 > 60 || abst2 > 60) return 0; // nicht kollinear
  const s1 = (b1.x - a1.x) * e.x + (b1.y - a1.y) * e.y;
  const s2 = (b2.x - a1.x) * e.x + (b2.y - a1.y) * e.y;
  const von = Math.max(0, Math.min(s1, s2));
  const bis = Math.min(len, Math.max(s1, s2));
  return Math.max(0, bis - von);
}

function laengsteKante(a: Pt[], b: Pt[]): number {
  let best = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      best = Math.max(best, kantenUeberlapp(a[i]!, a[(i + 1) % a.length]!, b[j]!, b[(j + 1) % b.length]!));
    }
  }
  return best;
}

/** Standardbreite einer neuen Zonentür «aus dem Bestand»: der häufigste
 * bereits gesetzte Wert im Doc, sonst der Default von `design.tuerSetzen`
 * (900 mm). */
function standardZonentuerbreite(doc: KosmoDoc): number {
  const alle = doc.byKind<ZonenTuer>('zonentuer').map((t) => t.breite);
  if (alle.length === 0) return 900;
  const zaehler = new Map<number, number>();
  for (const b of alle) zaehler.set(b, (zaehler.get(b) ?? 0) + 1);
  let best = alle[0]!;
  let bestAnzahl = 0;
  for (const [b, n] of zaehler) {
    if (n > bestAnzahl) {
      best = b;
      bestAnzahl = n;
    }
  }
  return best;
}

interface TuerVorschlag {
  zone: Zone;
  nachbar: Zone;
  punkt: Pt;
}

/**
 * Zonen MIT Raumtyp (echte Räume — Programm-Container und Parzellen-Zonen
 * zählen nicht), die im Raumgraph KEINE «tuer»-Kante zu irgendeinem Nachbarn
 * haben («unerschlossen»). Je Zone der fachlich sinnvollste Kandidat: ein
 * Korridor-Nachbar gewinnt immer, sonst die längste gemeinsame OFFENE Kante
 * (raumGraph hat den Wand-Check schon gemacht — «offen» heisst: begehbar,
 * keine Wand dazwischen). Zonen ganz ohne begehbare Kante (rundum Wand ohne
 * Lücke ≥ 60 cm) bleiben ehrlich als `ohneKandidat` ausgewiesen — dort
 * erfindet der Command keine Tür.
 */
function tuerKandidaten(
  doc: KosmoDoc,
  storeyId: string,
): { vorschlaege: TuerVorschlag[]; erschlossen: number; ohneKandidat: Zone[] } {
  const graph = raumGraph(doc, storeyId);
  const erschlossenIds = new Set<string>();
  for (const k of graph.kanten) {
    if (k.art === 'tuer') {
      erschlossenIds.add(k.a);
      erschlossenIds.add(k.b);
    }
  }
  const raeume = graph.zonen.filter(
    (z) => z.raumTyp && z.raumTyp !== 'korridor' && !z.program && z.zonenArt !== 'parzelle',
  );
  const vorschlaege: TuerVorschlag[] = [];
  const ohneKandidat: Zone[] = [];
  let erschlossen = 0;
  for (const z of raeume) {
    if (erschlossenIds.has(z.id)) {
      erschlossen++;
      continue;
    }
    const offene = graph.kanten.filter((k) => k.art === 'offen' && (k.a === z.id || k.b === z.id));
    if (offene.length === 0) {
      ohneKandidat.push(z);
      continue;
    }
    let beste = offene[0]!;
    let besteLaenge = -1;
    let bestePrio = false;
    for (const k of offene) {
      const andereId = k.a === z.id ? k.b : k.a;
      const andere = graph.zonen.find((zz) => zz.id === andereId);
      if (!andere) continue;
      const prio = andere.raumTyp === 'korridor';
      const laenge = laengsteKante(z.outline, andere.outline);
      if ((prio && !bestePrio) || (prio === bestePrio && laenge > besteLaenge)) {
        beste = k;
        besteLaenge = laenge;
        bestePrio = prio;
      }
    }
    const andereId = beste.a === z.id ? beste.b : beste.a;
    const andere = graph.zonen.find((zz) => zz.id === andereId);
    if (andere) vorschlaege.push({ zone: z, nachbar: andere, punkt: beste.punkt });
  }
  return { vorschlaege, erschlossen, ohneKandidat };
}

/** «Raum»/«Räume» — unregelmässiger Plural, NIE mit blossem «e»-Suffix bilden. */
function raumWort(n: number): string {
  return n === 1 ? 'Raum' : 'Räume';
}

function tuerenSummary(vorschlaege: TuerVorschlag[], erschlossen: number, ohneKandidat: Zone[]): string {
  const ohneHinweis =
    ohneKandidat.length > 0
      ? `${vorschlaege.length > 0 ? ', ' : ''}${ohneKandidat.length} ohne begehbare Kante (Wand ohne Lücke — manuell prüfen)`
      : '';
  if (vorschlaege.length === 0) {
    return erschlossen > 0 || ohneKandidat.length > 0
      ? `Keine Türen ergänzt — ${erschlossen} ${raumWort(erschlossen)} bereits erschlossen${ohneHinweis}`
      : 'Keine Türen ergänzt — keine Zonen mit Raumtyp auf diesem Geschoss';
  }
  const beispiele = vorschlaege
    .slice(0, 3)
    .map((v) => `${v.zone.name}↔${v.nachbar.name}`)
    .join(', ');
  const rest = vorschlaege.length > 3 ? ' u.a.' : '';
  return `${vorschlaege.length} Tür${vorschlaege.length === 1 ? '' : 'en'} ergänzt (${beispiele}${rest}), ${erschlossen} ${raumWort(erschlossen)} bereits erschlossen${ohneHinweis}`;
}

export const tuerenPlatzieren = registerCommand({
  id: 'design.tuerenPlatzieren',
  title: 'Türen platzieren (Erschliessung)',
  description:
    'Findet Zonen mit Raumtyp, die über KEINE Tür mit einem Nachbarn verbunden sind (Raumgraph zeigt sie unerschlossen — Finch-Archie «exakte Türplatzierung»), und setzt je Raum eine Zonentür an der fachlich sinnvollsten gemeinsamen Kante: ein Korridor-Nachbar wird bevorzugt, sonst die längste gemeinsame begehbare Kante; die Tür sitzt mittig, Breite = häufigster Bestandswert (sonst 900 mm). Setzt NIE eine zweite Tür, wo schon eine Verbindung besteht; Räume ohne begehbare Kante (Wand ohne Lücke) bleiben ehrlich unangetastet.',
  params: z.object({ storeyId: z.string() }),
  summarize: (p, doc) => {
    const { vorschlaege, erschlossen, ohneKandidat } = tuerKandidaten(doc, p.storeyId);
    return tuerenSummary(vorschlaege, erschlossen, ohneKandidat);
  },
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const { vorschlaege } = tuerKandidaten(doc, p.storeyId);
    const breite = standardZonentuerbreite(doc);
    return vorschlaege.map((v) =>
      added({ id: newId('tuer'), kind: 'zonentuer' as const, storeyId: p.storeyId, at: v.punkt, breite }),
    );
  },
});

/**
 * Regeln, für die es eine EINDEUTIGE, verlustfreie Korrektur gibt (geprüft
 * gegen den Befunds-Katalog `derive/checks.ts`): eine zu schmale Tür, eine
 * zu tiefe Fensterbrüstung, ein zu schmaler Treppenlauf — je ein einzelnes
 * Zahlenfeld auf den SIA/CH-Richtwert angehoben, sonst nichts. ALLE anderen
 * Befunde (Raumgrössen, Grenzabstände, Podeste, Schallschutz, Zonenregeln …)
 * verlangen einen Entwurfsentscheid (Wand verschieben, Raum neu zuschneiden,
 * Aufbau wählen) — die bleiben ABSICHTLICH manuell, auch wenn `nur` sie
 * explizit anfragt.
 *
 * EHRLICHER AUSSCHLUSS «fluchtweg»: der Befund «hat keine Verbindung zum
 * Treppenhaus (Tür fehlt?)» (`checks.ts` regelId `fluchtweg`, Distanz
 * `Infinity`) ist mit `design.tuerenPlatzieren` NICHT automatisierbar,
 * obwohl der Name es nahelegt — geprüft und verworfen: `fluchtwege()`
 * (`derive/raumgraph.ts`) behandelt eine offene (wandlose) Kante als
 * genauso gültigen Fluchtweg wie eine Zonentür; eine Zone zeigt dort NUR
 * dann `Infinity`, wenn `raumGraph()` überhaupt KEINE Kante (weder «tuer»
 * noch «offen») zu einem Nachbarn findet — meist eine echte Wand ohne
 * Öffnung. Genau dort kann `tuerKandidaten()` (die «offene Kante» als
 * Kandidat braucht) nie einen Vorschlag finden — der Fix wäre eine echte
 * Türöffnung in einer bestehenden Wand (design.oeffnungSetzen, mit
 * konkreter wallId), ein Entwurfsentscheid, kein Feld-Bump. Der Befund
 * bleibt darum immer «manuell».
 */
const KOMPLIANZ_AUTOFIX_REGELN = ['tuerbreite', 'bruestung', 'laufbreite'] as const;

interface KomplianzFix {
  befund: PruefBefund;
  patch: AnyPatch;
  beschreibung: string;
}

function komplianzAutoFixes(
  doc: KosmoDoc,
  storeyId: string,
  nur?: string[],
): { fixes: KomplianzFix[]; manuell: PruefBefund[]; alle: PruefBefund[] } {
  const alle = pruefeGrundriss(doc, storeyId).filter((b) => !nur || nur.includes(b.regelId));
  const fixes: KomplianzFix[] = [];
  const manuell: PruefBefund[] = [];

  for (const b of alle) {
    if (!(KOMPLIANZ_AUTOFIX_REGELN as readonly string[]).includes(b.regelId)) {
      manuell.push(b);
      continue;
    }
    if (b.regelId === 'tuerbreite' && b.entityId) {
      const opening = doc.get<Opening>(b.entityId);
      const wall = opening && opening.kind === 'opening' ? doc.get<Wall>(opening.wallId) : undefined;
      if (opening?.kind === 'opening' && wall?.kind === 'wall' && opening.width < 800) {
        const laenge = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y);
        if (opening.center - 400 >= 0 && opening.center + 400 <= laenge) {
          fixes.push({
            befund: b,
            patch: { id: opening.id, before: opening, after: { ...opening, width: 800 } },
            beschreibung: `Türbreite ${opening.width}→800 mm`,
          });
          continue;
        }
      }
    }
    if (b.regelId === 'bruestung' && b.entityId) {
      const opening = doc.get<Opening>(b.entityId);
      if (opening?.kind === 'opening' && opening.sill > 0 && opening.sill < 600) {
        fixes.push({
          befund: b,
          patch: { id: opening.id, before: opening, after: { ...opening, sill: 900 } },
          beschreibung: `Brüstung ${opening.sill}→900 mm`,
        });
        continue;
      }
    }
    if (b.regelId === 'laufbreite' && b.entityId) {
      const stair = doc.get<Stair>(b.entityId);
      if (stair?.kind === 'stair' && stair.width < 1000) {
        fixes.push({
          befund: b,
          patch: { id: stair.id, before: stair, after: { ...stair, width: 1000 } },
          beschreibung: `Laufbreite ${stair.width}→1000 mm`,
        });
        continue;
      }
    }
    manuell.push(b);
  }
  return { fixes, manuell, alle };
}

function manuellKurz(manuell: PruefBefund[]): string {
  const zaehler = new Map<string, number>();
  for (const b of manuell) zaehler.set(b.regel, (zaehler.get(b.regel) ?? 0) + 1);
  return [...zaehler.entries()].map(([regel, n]) => `${n}× ${regel}`).join(', ');
}

function komplianzSummary(fixes: KomplianzFix[], manuell: PruefBefund[], alle: PruefBefund[]): string {
  if (alle.length === 0) return 'Keine Befunde — Grundriss-Check ist sauber.';
  if (fixes.length === 0) {
    return `Keine automatisch behebbaren Befunde — alle ${manuell.length} bleiben manuell: ${manuellKurz(manuell)}`;
  }
  const teile = fixes
    .slice(0, 3)
    .map((f) => f.beschreibung)
    .join(', ');
  const rest = fixes.length > 3 ? ' u.a.' : '';
  const manuellText = manuell.length > 0 ? ` — manuell: ${manuellKurz(manuell)}` : '';
  return `${fixes.length} Fix${fixes.length === 1 ? '' : 'e'} automatisch (${teile}${rest})${manuellText}`;
}

export const komplianzFixes = registerCommand({
  id: 'design.komplianzFixes',
  title: 'Kompliance-Fixes',
  description:
    'Läuft die Grundriss-Checks (derive/checks.ts, Finch-Archie «Compliance-Checks») und übersetzt automatisch behebbare Befunde in Patches: zu schmale Tür (< 800 mm → 800 mm, nur wenn die Wand Platz bietet), zu tiefe Fensterbrüstung (< 600 mm → 900 mm) und zu schmaler Treppenlauf (< 1000 mm → 1000 mm). Alle anderen Befunde (Raumgrössen, Grenzabstände, Podeste, Schallschutz, Zonenregeln, fehlende Fluchtweg-Verbindung …) verlangen einen Entwurfsentscheid und bleiben ehrlich als «manuell» gelistet — nichts wird automatisch übers Knie gebrochen. Eine fehlende Fluchtweg-Tür braucht eine echte Wandöffnung (design.oeffnungSetzen) statt einer Zonentür und bleibt darum ebenfalls manuell. nur schränkt die Prüfung auf bestimmte regelId ein. Ein Undo-Schritt.',
  params: z.object({
    storeyId: z.string(),
    nur: z
      .array(z.string())
      .optional()
      .describe('Nur diese regelId-Werte prüfen, z.B. ["fluchtweg", "tuerbreite"] — weggelassen: alle Befunde'),
  }),
  summarize: (p, doc) => {
    const { fixes, manuell, alle } = komplianzAutoFixes(doc, p.storeyId, p.nur);
    return komplianzSummary(fixes, manuell, alle);
  },
  run: (doc, p) => {
    require<Storey>(doc, p.storeyId, 'storey');
    const { fixes } = komplianzAutoFixes(doc, p.storeyId, p.nur);
    return fixes.map((f) => f.patch);
  },
});

/** Zonen/Raumprogramm-Fussabdruck eines Wohnungstyps: `program`-getaggte
 * Segmentierer-Zonen (die «verknüpften Einheiten», Finch «Plan Groups»)
 * UND der Raumprogramm-Posten (`doc.settings.raumprogramm`), falls vorhanden.
 * `anzahl` ist die Instanzenzahl für die Zielgrössen-Umrechnung: die Zahl der
 * gefundenen Zonen, sonst (vor der Segmentierung) aus dem bestehenden
 * hnfSoll ÷ Standardgrösse (`sollMix`-Logik) rückgerechnet. */
function einheitTypInfo(
  doc: KosmoDoc,
  typ: string,
): { zonen: Zone[]; posten: RaumprogrammPosten | undefined; anzahl: number } {
  const zonen = doc.byKind<Zone>('zone').filter((z) => z.program === typ);
  const posten = doc.settings.raumprogramm.find((p) => p.typ === typ);
  const anzahl =
    zonen.length > 0
      ? zonen.length
      : posten
        ? Math.max(1, Math.round(posten.hnfSoll / (WOHNUNGS_GROESSEN[typ] ?? 85)))
        : 0;
  return { zonen, posten, anzahl };
}

export const einheitTypAktualisieren = registerCommand({
  id: 'design.einheitTypAktualisieren',
  title: 'Wohnungstyp aktualisieren (verkettet)',
  description:
    'Aktualisiert einen Wohnungstyp konsistent über verknüpfte Einheiten (Finch-Archie «Updates über verknüpfte Einheiten»): neuerTyp benennt den Raumprogramm-Posten UND alle Zonen mit passendem program-Schlüssel um (Zone.program, Segmentierer-Ergebnis) inkl. Namen «Whg N (typ)»; zielgroesseM2 passt das Raumprogramm-Soll (hnfSoll = Zielgrösse × Anzahl bestehender Einheiten dieses Typs) an. EHRLICH: v1 aktualisiert NUR Typ-Metadaten + Raumprogramm — eine geometrische Neu-Segmentierung macht es NICHT selbst (dafür design.wohnungenSegmentieren oder die Variantensuche erneut laufen lassen). Ein Undo-Schritt für alle betroffenen Zonen + das Raumprogramm zusammen.',
  params: z.object({
    typ: z.string().min(1).describe('Bestehender Wohnungstyp-Schlüssel (Raumprogramm-Posten bzw. Zone.program)'),
    aenderung: z.object({
      neuerTyp: z.string().min(1).optional().describe('Neuer Schlüssel — benennt Typ + alle verknüpften Zonen um'),
      zielgroesseM2: z
        .number()
        .positive()
        .optional()
        .describe('Neue Zielgrösse je Einheit in m² — passt NUR das Raumprogramm-Soll an, keine Geometrie'),
    }),
  }),
  summarize: (p, doc) => {
    const info = einheitTypInfo(doc, p.typ);
    const zielTyp = p.aenderung.neuerTyp ?? p.typ;
    const teile: string[] = [];
    if (p.aenderung.neuerTyp) {
      teile.push(`«${p.typ}» → «${p.aenderung.neuerTyp}» (${info.zonen.length} Zone${info.zonen.length === 1 ? '' : 'n'})`);
    }
    if (p.aenderung.zielgroesseM2 !== undefined) {
      const neuHnf = Math.round(p.aenderung.zielgroesseM2 * info.anzahl * 10) / 10;
      teile.push(
        `Raumprogramm-Soll ${zielTyp}: ${neuHnf} m² (${info.anzahl} × ${p.aenderung.zielgroesseM2} m²) — Geometrie unverändert, «Wohnungen segmentieren» erneut ausführen für neue Masse`,
      );
    }
    return teile.join('; ');
  },
  run: (doc, p) => {
    if (!p.aenderung.neuerTyp && p.aenderung.zielgroesseM2 === undefined) {
      throw new CommandError('aenderung braucht neuerTyp und/oder zielgroesseM2 (mindestens eines)');
    }
    const info = einheitTypInfo(doc, p.typ);
    if (info.zonen.length === 0 && !info.posten) {
      throw new CommandError(`Wohnungstyp «${p.typ}» kommt weder im Raumprogramm noch in Zonen vor.`);
    }
    const neuerTyp = p.aenderung.neuerTyp && p.aenderung.neuerTyp !== p.typ ? p.aenderung.neuerTyp : null;
    if (neuerTyp && doc.settings.raumprogramm.some((posten) => posten.typ === neuerTyp)) {
      throw new CommandError(`Wohnungstyp «${neuerTyp}» existiert im Raumprogramm bereits.`);
    }
    const zielTyp = neuerTyp ?? p.typ;
    const patches: AnyPatch[] = [];

    if (neuerTyp) {
      for (const z of info.zonen) {
        const marke = `(${p.typ})`;
        const neuerName = z.name.includes(marke) ? z.name.replace(marke, `(${neuerTyp})`) : z.name;
        patches.push({ id: z.id, before: z, after: { ...z, program: neuerTyp, name: neuerName } });
      }
    }

    if (neuerTyp || p.aenderung.zielgroesseM2 !== undefined) {
      const vorher = doc.settings.raumprogramm;
      const idx = vorher.findIndex((posten) => posten.typ === p.typ);
      const hnfSoll =
        p.aenderung.zielgroesseM2 !== undefined
          ? Math.round(p.aenderung.zielgroesseM2 * info.anzahl * 10) / 10
          : (idx >= 0 ? vorher[idx]!.hnfSoll : null);
      let nachher = vorher;
      if (idx >= 0) {
        nachher = vorher.map((posten, i) => (i === idx ? { typ: zielTyp, hnfSoll: hnfSoll ?? posten.hnfSoll } : posten));
      } else if (hnfSoll !== null) {
        nachher = [...vorher, { typ: zielTyp, hnfSoll }];
      }
      if (nachher !== vorher) {
        patches.push({ settings: true, before: { raumprogramm: vorher }, after: { raumprogramm: nachher } });
      }
    }

    return patches;
  },
});

export const setStandortAdresse = registerCommand({
  id: 'design.standortAdresseSetzen',
  title: 'Projekt-Standort (Adressbeleg) setzen',
  description:
    'Speichert den zuletzt gewählten StandortSuche-Treffer (Adresse, LV95-Koordinaten, Herkunft geo.admin.ch, Abrufzeitpunkt) als Doc-Setting `standortAdresse` — läuft wie jede DocSettings-Änderung über Undo/Yjs-Sync/`.kosmo`-Export (SettingsPatch-Weg), damit der Projektstandort einen Reload überlebt (v0.8.6 PC1, docs/V086-SPEZ.md E6/D7/C-17). Getrennt vom bestehenden design.standortSetzen (WGS84 lat/lon + LV95 fürs Sonnenstudien-/Schwarzplan-/Viewport3D-Fundament, ProjektStandort seit V2-V4) — s. Kommentar bei `StandortAdresse`, model/doc.ts: dieselbe Kommando-Kennung hätte registerCommand bei der doppelten Registrierung geworfen. Erneutes Ausführen überschreibt den vorherigen Beleg vollständig (kein Merge — es gibt immer nur EINEN aktuellen Standort).',
  params: z.object({
    adresse: z.string().min(1),
    lv95: z.object({ e: z.number(), n: z.number() }),
    quelle: z.literal('geoadmin'),
    abgerufenAm: z.string().min(1),
  }),
  summarize: (p) => `Standort «${p.adresse}»`,
  run: (doc, p) => [
    {
      settings: true as const,
      // Schmales Patch (nur `standortAdresse`), wie bei schnitt/
      // visRenderAuftrag: optionales Feld ohne defaultSettings-Eintrag — ein
      // voller doc.settings-Snapshot würde beim Undo die Abwesenheit des
      // Schlüssels nicht wiederherstellen (Object-Spread löscht keine
      // Keys), «vorher» braucht also einen expliziten Wert.
      before: { standortAdresse: doc.settings.standortAdresse ?? null },
      after: {
        standortAdresse: {
          adresse: p.adresse,
          lv95: { e: p.lv95.e, n: p.lv95.n },
          quelle: p.quelle,
          abgerufenAm: p.abgerufenAm,
        },
      },
    },
  ],
});

/**
 * v0.8.7 PB1 (`docs/V087-SPEZ.md` E6/D7/C-11/C-12) — persistiert das
 * Ergebnis der ÖREB-light-Kette (GetEGRID → Extract → Themen-Betroffenheits-
 * liste, App-seitig in `DesignWorkspace.tsx` `StandortSuche`/`oerebAbrufen`)
 * als eigenes Doc-Setting `oerebAuszug`. Reiner SettingsPatch-Command wie
 * `design.standortAdresseSetzen`/`design.schnittSetzen` — Undo/Yjs-Sync/
 * `.kosmo`-Export gelten automatisch mit. `auszug: null` löscht den
 * gespeicherten Auszug wieder (z.B. bei einer neuen Standortsuche, deren
 * ÖREB-Abruf fehlschlägt — kein veralteter Auszug soll stehen bleiben).
 * grep-Beleg 19.07.: `oerebAuszug`/`oereb` kommt im Code nirgends vor —
 * Setting-Name UND Kommando-Kennung sind frei (kein registerCommand-Konflikt).
 */
export const setOerebAuszug = registerCommand({
  id: 'design.oerebAuszugSetzen',
  title: 'ÖREB-Auszug (light) setzen',
  description:
    'Speichert das Ergebnis der ÖREB-light-Kette (GetEGRID + Extract, reduziert auf die reine Themencode-Betroffenheitsliste) als Doc-Setting `oerebAuszug` — läuft wie jede DocSettings-Änderung über Undo/Yjs-Sync/`.kosmo`-Export (SettingsPatch-Weg). `auszug: null` entfernt den gespeicherten Auszug wieder. KEIN rechtsgültiger ÖREB-Auszug — nur ein Arbeits-Abbild; der Pflicht-Hinweis dazu lebt im UI.',
  params: z.object({
    auszug: z
      .object({
        egrid: z.string().min(1),
        abgerufenAm: z.string().min(1),
        quelle: z.literal('oereb-bund'),
        themen: z.array(
          z.object({
            code: z.string().min(1),
            titel: z.string().min(1),
            betroffen: z.boolean(),
          }),
        ),
      })
      .nullable(),
  }),
  summarize: (p) => {
    if (!p.auszug) return 'ÖREB-Auszug entfernt';
    const betroffen = p.auszug.themen.filter((t) => t.betroffen).length;
    return `ÖREB-Auszug ${p.auszug.egrid} — ${betroffen} von ${p.auszug.themen.length} Themen betroffen`;
  },
  run: (doc, p) => [
    {
      settings: true as const,
      // Schmales Patch (nur `oerebAuszug`), Muster `design.standortAdresseSetzen`:
      // `?? null` macht «vorher» explizit statt den Schlüssel wegzulassen —
      // ein Objekt-Spread löscht auf Undo sonst keine fehlenden Keys.
      before: { oerebAuszug: doc.settings.oerebAuszug ?? null },
      after: { oerebAuszug: p.auszug },
    },
  ],
});

/**
 * v0.8.9 E2 (PA2, `docs/V089-SPEZ.md` §3 E2, Owner-Entscheid «CAD-Ebenen =
 * DXF-Interop + Sperren», KEIN Sichtbarkeits-Panel — Sanktion 4): zwei
 * additive Commands nach dem `design.renovationSetzen`-Muster oben (:1352) —
 * EIN Patch (before/after auf `meta`), Undo/Redo automatisch symmetrisch
 * über den generischen Patch-Mechanismus, kein Sonderfall nötig.
 *
 * `design.ebeneSetzen` patcht NUR `meta.layer` — ein reines DXF-Interop-Feld
 * (`dxf/export.ts` `layerFuer()`-Override), OHNE jede Sichtbarkeits- oder
 * Render-Wirkung im Plan/Schnitt/3D (Sanktion 4). `layer: null` entfernt die
 * Übersteuerung wieder (Element fällt im Export auf die Semantik-Regel
 * zurück); ein getrimmt LEERER String wirft (Owner-Klarheit: «null zum
 * Löschen», kein leiser Leerstring in den DXF-Layern).
 */
export const setLayerOverride = registerCommand({
  id: 'design.ebeneSetzen',
  title: 'DXF-Ebene setzen',
  description:
    'Setzt eine manuelle CAD-Ebene (meta.layer) für den DXF-Export — überschreibt dort die automatische Semantik-Regel (LAYER_REGELN), hat aber KEINE Sichtbarkeits- oder Darstellungswirkung im Plan (reines Interop-Feld für AutoCAD/Rhino/Vectorworks). layer=null entfernt die Übersteuerung wieder.',
  params: z.object({
    entityId: z.string(),
    layer: z.string().nullable().describe('CAD-Ebenenname (wird getrimmt); null entfernt die Übersteuerung'),
  }),
  summarize: (p) => (p.layer !== null ? `Ebene → ${p.layer.trim()}` : 'Ebenen-Übersteuerung entfernt'),
  run: (doc, p) => {
    const e = doc.get(p.entityId);
    if (!e) throw new CommandError(`Element «${p.entityId}» existiert nicht`);
    if (e.kind === 'storey' || e.kind === 'assembly' || e.kind === 'sheet') {
      throw new CommandError(`Ebene gilt für Bauteile, nicht für ${e.kind}`);
    }
    const meta = { ...e.meta };
    if (p.layer !== null) {
      const getrimmt = p.layer.trim();
      if (getrimmt.length === 0) {
        throw new CommandError('Ebenenname darf nicht leer sein (null zum Entfernen nutzen)');
      }
      meta.layer = getrimmt;
    } else {
      delete meta.layer;
    }
    return [{ id: e.id, before: e, after: { ...e, meta } as typeof e }];
  },
});

/**
 * `design.sperren` patcht NUR `meta.locked`. Die eigentliche Durchsetzung
 * (Verschieben/Griff-Drag/Löschen greifen nicht) lebt am Interaktions-Pfad
 * ausserhalb dieses Kernel-Commands — s. `apps/kosmo-orbit/.../plan-hit-
 * test.ts`s `istGesperrt()` und den PA2-Abschlussbericht (Cluster-B-
 * Übergabepunkte an Fable, `DesignWorkspace.tsx` bleibt PA2-tabu,
 * Betriebsregel 3/Sanktion 6). `pickEntityAt` bleibt UNVERÄNDERT — ein
 * gesperrtes Element bleibt findbar (Sanktion 3).
 */
export const setLocked = registerCommand({
  id: 'design.sperren',
  title: 'Element sperren/entsperren',
  description:
    'Sperrt oder entsperrt ein Element (meta.locked). Gesperrt: Verschieben/Griff-Ziehen/Löschen greifen am Interaktions-Pfad nicht mehr, das Element bleibt aber weiterhin klickbar/anzeigbar und im Inspector entsperrbar. Keine Sichtbarkeits-Wirkung.',
  params: z.object({
    entityId: z.string(),
    locked: z.boolean(),
  }),
  summarize: (p) => (p.locked ? 'Element gesperrt' : 'Element entsperrt'),
  run: (doc, p) => {
    const e = doc.get(p.entityId);
    if (!e) throw new CommandError(`Element «${p.entityId}» existiert nicht`);
    if (e.kind === 'storey' || e.kind === 'assembly' || e.kind === 'sheet') {
      throw new CommandError(`Sperre gilt für Bauteile, nicht für ${e.kind}`);
    }
    const meta = { ...e.meta };
    if (p.locked) meta.locked = true;
    else delete meta.locked;
    return [{ id: e.id, before: e, after: { ...e, meta } as typeof e }];
  },
});
