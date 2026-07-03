import type { Mm, Pt } from './units';

/**
 * BIM-Entities — flache, JSON-serialisierbare Records. Referenzen sind nur IDs
 * (kein Objektgraph), damit der Store 1:1 auf Yjs-Maps und SQLite-Zeilen passt.
 * Z-Logik ist geschossrelativ (ArchiCAD-Semantik): Elemente wohnen in ihrem
 * Geschoss; verschiebt sich das Geschoss, wandern sie mit.
 */

export interface EntityMeta {
  name?: string;
  layer?: string;
  /** Renovationsstatus für Umbau-Projekte (ArchiCAD-Essenz #9). */
  renovation?: 'bestand' | 'abbruch' | 'neu';
  locked?: boolean;
}

interface Base {
  readonly id: string;
  meta?: EntityMeta;
}

/** Geschoss — die fundamentale Z-Ordnung. */
export interface Storey extends Base {
  kind: 'storey';
  /** OK fertig Boden über Projektnull. */
  elevation: Mm;
  /** Geschosshöhe OK–OK. */
  height: Mm;
  /** Schnittebene des Grundrisses über OK Boden (ArchiCAD-Standard 1100). */
  cutHeight: Mm;
  /** Sortierindex: 0 = EG, negativ = UG. */
  index: number;
  name: string;
}

/** Rasterachse (Stützenraster, z.B. A/B/C × 1/2/3). */
export interface GridAxis extends Base {
  kind: 'grid';
  storeyId: string;
  label: string;
  a: Pt;
  b: Pt;
  /** haupt = Tragachse mit Achskopf; wohn = feine Wohnraster-Zwischenachse. */
  typ?: 'haupt' | 'wohn';
}

export type LayerFunction = 'tragend' | 'daemmung' | 'bekleidung' | 'dichtung' | 'hohlraum';

export interface AssemblyLayer {
  material: string;
  thickness: Mm;
  function: LayerFunction;
}

/**
 * Mehrschichtiger Aufbau (ArchiCAD-Composite) — Typenkatalog-Eintrag.
 * Schichten von der Referenzseite (aussen bzw. oben) nach innen/unten.
 */
export interface Assembly extends Base {
  kind: 'assembly';
  name: string;
  target: 'wall' | 'slab' | 'roof';
  layers: AssemblyLayer[];
}

export type WallAlignment = 'zentrum' | 'kern-aussen' | 'kern-innen';

/** Wand — Achse als Segment, Dicke/Schichten aus dem Aufbau. */
export interface Wall extends Base {
  kind: 'wall';
  storeyId: string;
  a: Pt;
  b: Pt;
  assemblyId: string;
  /** Lage der Achse relativ zum Aufbau. */
  alignment: WallAlignment;
  /** Höhenmodus: bis OK nächstes Geschoss (Standard) oder fix. */
  heightMode: 'geschoss' | 'fix';
  height?: Mm;
  /** Fusspunkt-Versatz gegenüber OK Boden des Geschosses. */
  baseOffset: Mm;
}

/** Decke/Bodenplatte — Umriss auf Geschossebene, Dicke nach unten. */
export interface Slab extends Base {
  kind: 'slab';
  storeyId: string;
  outline: Pt[];
  holes?: Pt[][];
  assemblyId?: string;
  thickness: Mm;
  /** Versatz der Oberkante gegenüber OK Boden des Geschosses. */
  topOffset: Mm;
}

/** Öffnung — in einer Wand verankert (Host-Beziehung). */
export interface Opening extends Base {
  kind: 'opening';
  wallId: string;
  openingType: 'fenster' | 'tuer' | 'leibung';
  /** Abstand Wandanfang (Punkt a) → Öffnungsmitte, entlang der Achse. */
  center: Mm;
  width: Mm;
  height: Mm;
  /** Brüstungshöhe ab OK Boden (bei Türen 0). */
  sill: Mm;
  /** Anschlagrichtung für Türsymbol im Grundriss. */
  swing?: 'links' | 'rechts';
  typeId?: string;
}

/** Zone/Raum — Polygon mit SIA-416-Klassierung. */
export type Sia416Class = 'HNF' | 'NNF' | 'VF' | 'FF' | 'KF';

export interface Zone extends Base {
  kind: 'zone';
  storeyId: string;
  outline: Pt[];
  name: string;
  number?: string;
  sia: Sia416Class;
  /** Nutzungstyp fürs Raumprogramm (z.B. 'marktgerecht', 'gewerbe'). */
  program?: string;
  /** Raumtyp für Raumgraph/Checks (V2-F1), z.B. 'korridor', 'treppenhaus'. */
  raumTyp?: string;
}

/** Treppe — Achse a→b, Breite; Steigung aus Geschosshöhe. Formen: V2-A2. */
export interface Stair extends Base {
  kind: 'stair';
  storeyId: string;
  /** Antritt (unten). */
  a: Pt;
  /** Austritt (oben) — bei «u» Ende des ersten Laufs (Wendepodest dahinter). */
  b: Pt;
  width: Mm;
  /** gerade (Default) · podest (Zwischenpodest) · u (Wendepodest) · l (Eckpodest). */
  form?: 'gerade' | 'podest' | 'u' | 'l';
  /** Eckpunkt des L-Laufs (nur form 'l'). */
  ecke?: Pt;
}

/** Walmdach — Grundriss-Polygon + Neigung; Geometrie via Straight Skeleton. */
export interface Roof extends Base {
  kind: 'roof';
  storeyId: string;
  outline: Pt[];
  /** Dachneigung in Grad. */
  pitch: number;
  /** Dachüberstand über den Umriss hinaus. */
  overhang: Mm;
  /** Fusspunkt (Traufe) über OK Boden des Geschosses. */
  baseOffset: Mm;
}

/** Baugrenze (Phase 0): Polygon aus dem Baugesetz + optionale Höhenbeschränkung. */
export interface Boundary extends Base {
  kind: 'boundary';
  storeyId: string;
  outline: Pt[];
  /** Maximale Gebäudehöhe über Projektnull (mm); null = keine. */
  maxHoehe: Mm | null;
  name: string;
  /** Grenzabstand (V2-Vorform): Bauteile müssen so weit INNERHALB der Linie bleiben (mm). */
  grenzabstand?: Mm | null;
  /** Mehrhöhenzuschlag: Anteil der Fassadenhöhe über der Freigrenze (z.B. 0.5 ab 12 m). */
  mehrHoehen?: { abHoehe: Mm; anteil: number } | null;
}

/** Volumenkörper für Vorform-artige Volumenstudien. */
export interface MassBody extends Base {
  kind: 'mass';
  storeyId: string;
  outline: Pt[];
  height: Mm;
  baseOffset: Mm;
  program?: string;
  /** Fassadenmodul je Kante (1-basiert), Name aus settings.fassadenModule. */
  module?: { kante: number; modul: string }[];
}

/** Papierformate (ISO 216) für Plansätze. */
export type SheetFormat = 'A0' | 'A1' | 'A2' | 'A3' | 'A4';

/** Eine platzierte Ansicht auf einem Blatt — Position in Papier-mm. */
export interface SheetPlacement {
  id: string;
  view: 'grundriss' | 'schnitt' | 'axo';
  /** Grundriss: Quell-Geschoss. */
  storeyId?: string;
  /** Schnitt: Schnittlinie + Sichttiefe (Weltkoordinaten mm). */
  section?: { a: Pt; b: Pt; depth: Mm; lookLeft: boolean };
  /** Massstab, z.B. 100 für 1:100. */
  scale: number;
  /** Mittelpunkt der Zeichnung auf dem Blatt (Papier-mm, Ursprung links oben). */
  x: number;
  y: number;
  title?: string;
}

/** Freier Textblock auf einem Blatt (Plakat-Titel, Konzepttexte). */
export interface SheetText {
  id: string;
  /** Ankerpunkt (Papier-mm, Ursprung links oben; y = Basislinie erste Zeile). */
  x: number;
  y: number;
  /** Inhalt; \n bricht Zeilen. */
  text: string;
  /** Schrifthöhe in Papier-mm. */
  size: number;
  /** Plakat-Titel-Stil (fett, gesperrt). */
  titel?: boolean;
}

/**
 * Bild-Slot auf einem Blatt (Render aufs Plakat). assetId=null ist ein
 * LEERER Slot — er hält den Platz, bis die HomeStation echte Renders liefert.
 */
export interface SheetImage {
  id: string;
  /** Linke obere Ecke (Papier-mm). */
  x: number;
  y: number;
  /** Breite in Papier-mm; Höhe folgt dem Bild-Seitenverhältnis (leer: 3:2). */
  w: number;
  assetId: string | null;
  title?: string;
}

/** Planblatt (KosmoPublish) — Layout aus platzierten Ansichten. */
export interface Sheet extends Base {
  kind: 'sheet';
  name: string;
  format: SheetFormat;
  orientation: 'quer' | 'hoch';
  /** Sortierung im Plansatz. */
  index: number;
  placements: SheetPlacement[];
  texte?: SheetText[];
  bilder?: SheetImage[];
}

/**
 * Eingebettetes Rasterbild (KosmoVis-Render, Foto). Base64 im Modell ist ein
 * bewusster Trade-off: so erben Undo, Yjs-Sync und .kosmo das Bild gratis —
 * gedacht für einige Plakat-Renders, nicht als Foto-Archiv.
 */
export interface ImageAsset extends Base {
  kind: 'imageasset';
  name: string;
  mime: string;
  /** Base64-Rohdaten (ohne data:-Präfix). */
  data: string;
  width?: number;
  height?: number;
}

/** Möbel (V2-F8): parametrisches Symbol + SIA-500-Bewegungsfläche. */
export interface Furniture extends Base {
  kind: 'furniture';
  storeyId: string;
  /** Katalogschlüssel, z.B. 'bett-doppel', 'wc', 'kuechenzeile'. */
  typ: string;
  /** Referenzpunkt (Mitte der Rückkante). */
  at: Pt;
  /** Rotation in Grad (0 = Bewegungsfläche zeigt +y). */
  rotationGrad: number;
}

/** Tür zwischen Zonen (ohne Wand): Punkt auf der gemeinsamen Kante. */
export interface ZonenTuer extends Base {
  kind: 'zonentuer';
  storeyId: string;
  at: Pt;
  breite: Mm;
}

/**
 * Terrainprofil (Vision A2): 3D-Polylinie übers Grundstück, projektglobal
 * (kein Geschoss). Der Schnitt projiziert die Stützpunkte auf seine Ebene —
 * gewachsen gestrichelt, neu ausgezogen (SIA 400 C.2.1). Kein DGM: ein
 * handgesetztes Profil je Zustand; swisstopo-Höhen sind HomeStation-Ausbau.
 */
export interface Terrain extends Base {
  kind: 'terrain';
  typ: 'gewachsen' | 'neu';
  /** Stützpunkte in Welt-mm, z über Projektnull; linear interpoliert. */
  punkte: { x: Mm; y: Mm; z: Mm }[];
}

/**
 * Aussparung/Durchbruch (Vision A3): Symbol + Menge am Wirt (Wand oder Decke)
 * — bewusst OHNE Geometrieschnitt. Der Werkplan zeigt Kreuz + Kote
 * (Hochbauzeichner-Konvention, Lehrheft Deckenkonstruktionen); Statik und
 * Haustechnik führen die Öffnung nach.
 */
export interface Aussparung extends Base {
  kind: 'aussparung';
  storeyId: string;
  /** Wirt-Element: Wand oder Decke. */
  hostId: string;
  typ: 'durchbruch' | 'schlitz';
  /** Wand-Wirt: Mitte in mm entlang der Achse ab Punkt a. */
  center?: Mm;
  /** Decken-Wirt: Mittelpunkt in Welt-mm. */
  at?: Pt;
  /** Öffnungsmass b × h (Wand: h vertikal; Decke: h = zweite Grundriss-Richtung). */
  breite: Mm;
  hoehe: Mm;
  /** Wand: Unterkante über OK Boden — erscheint in der Kote. */
  sill?: Mm;
}

export type Entity =
  | Storey | GridAxis | Assembly | Wall | Slab | Opening | Zone | MassBody | Roof | Stair | Sheet | Boundary | ImageAsset | Furniture | ZonenTuer | Terrain | Aussparung;
export type EntityKind = Entity['kind'];

export function isHostedBy(e: Entity, hostId: string): boolean {
  return e.kind === 'opening' && e.wallId === hostId;
}

export function storeyOf(e: Entity): string | null {
  return 'storeyId' in e ? e.storeyId : null;
}
