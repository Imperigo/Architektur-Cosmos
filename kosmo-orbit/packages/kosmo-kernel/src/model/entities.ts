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

/**
 * Stütze (RE-ARCHICAD A3): Rechteck- oder Rundprofil, geschosshoch —
 * Skelettbau wird modellierbar. b = Breite bzw. Durchmesser, t = Tiefe
 * (nur rechteck, fehlt = quadratisch), rotationGrad dreht ums Zentrum.
 */
export interface Column extends Base {
  kind: 'column';
  storeyId: string;
  at: Pt;
  profil: 'rechteck' | 'rund';
  b: Mm;
  t?: Mm;
  material: string;
  rotationGrad?: number;
}

/** Unterzug (RE-ARCHICAD A3): Balken unter der Decke, OK = OK Geschoss. */
export interface Beam extends Base {
  kind: 'beam';
  storeyId: string;
  a: Pt;
  b: Pt;
  breite: Mm;
  hoehe: Mm;
  material: string;
}

/**
 * Assoziative Etikette (RE-ARCHICAD A6): liest ihr Bauteil LIVE aus der
 * Parametrik — Aufbau umbenennen ändert alle Etiketten mit. inhalt 'aufbau'
 * beschriftet Aufbau/Querschnitt, 'keynote' verweist auf settings.keynotes
 * (die Legende aufs Blatt macht sheetToSvg).
 */
export interface Etikett extends Base {
  kind: 'etikett';
  storeyId: string;
  targetId: string;
  /** Text-Anker in Welt-mm; der Leader zeigt zum Bauteil. */
  at: Pt;
  inhalt: 'aufbau' | 'keynote';
  /** Keynote-Nummer (nur inhalt 'keynote'), z.B. «K3». */
  keynote?: string;
}

/** Grundriss-Polygon einer Stütze (rund als 16-Eck), CCW = positive Fläche. */
export function columnOutline(c: Column): Pt[] {
  if (c.profil === 'rund') {
    const r = c.b / 2;
    const pts: Pt[] = [];
    for (let i = 0; i < 16; i++) {
      const w = (i / 16) * 2 * Math.PI;
      pts.push({ x: Math.round(c.at.x + r * Math.cos(w)), y: Math.round(c.at.y + r * Math.sin(w)) });
    }
    return pts;
  }
  const hb = c.b / 2;
  const ht = (c.t ?? c.b) / 2;
  const w = ((c.rotationGrad ?? 0) * Math.PI) / 180;
  const cos = Math.cos(w);
  const sin = Math.sin(w);
  return [
    { x: -hb, y: -ht }, { x: hb, y: -ht }, { x: hb, y: ht }, { x: -hb, y: ht },
  ].map((p) => ({
    x: Math.round(c.at.x + p.x * cos - p.y * sin),
    y: Math.round(c.at.y + p.x * sin + p.y * cos),
  }));
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
  /** Anschlagrichtung für das Tür- ODER Fensterflügel-Symbol im Grundriss
   * (v0.6.9 Stream A: bei fensterTyp 'einfluegel' bestimmt swing die
   * Angelseite des Öffnungsbogens; 'fensterband'/'fest' tragen kein swing). */
  swing?: 'links' | 'rechts';
  /** Fensteranschlag-Tiefe in der Leibung (B4, Werkplan-Detail; Default 40). */
  anschlag?: Mm;
  typeId?: string;
  /** Fenstertyp (v0.6.9 Stream A, docs/FENSTER-KONZEPT.md): fehlt =
   * Alt-Fenster (heutiges Zweilinien-Symbol, keine Teilung, kein
   * Flügelbogen, keine 3D-Rahmen). Nur bei openingType 'fenster' sinnvoll. */
  fensterTyp?: 'einfluegel' | 'zweifluegel' | 'fest' | 'fensterband';
  /** Feldteilung n (horizontal) × m (vertikal) — Flügel-/Pfosten-Riegel-
   * Raster. Nur wirksam, wenn fensterTyp gesetzt ist. */
  teilung?: { n: number; m: number };
  /** Rahmen-/Pfostenbreite in mm (Blendrahmen bzw. Fensterband-Profil);
   * fehlt = Default 60 in der Ableitung (FENSTER_RAHMEN_DEFAULT_MM). */
  rahmenbreite?: Mm;
  /** Flügeltyp (v0.7.1 E5/4B, docs/V071-KONZEPT.md): steuert die SIA-
   * Öffnungssymbolik in Ansicht (Dreieck/Pfeil) und Grundriss (Doppelstrich/
   * versetzte Doppellinie). Fehlt = keine Symbolik — heutiges Bild bleibt
   * byte-identisch (Goldens-Guard, wie `fensterTyp` in v0.6.9). Nur bei
   * openingType 'fenster' sinnvoll; unabhängig von `fensterTyp` (additiv). */
  fluegelTyp?: 'dreh' | 'kipp' | 'drehkipp' | 'schiebe' | 'fest';
  /**
   * Öffnungsrichtung (v0.7.3 D2, `docs/V073-GESTALTUNG-SPEZ.md` §D2):
   * bestimmt die Strichelung der SIA-Flügelsymbolik in Ansicht/
   * Live-Schnittvorschau — **durchgezogen = öffnet zum Betrachter (innen,
   * Default)**, **gestrichelt (Kadenz 2–1 mm) = öffnet weg (aussen)**.
   * Additiv und rein darstellerisch (keine Geometrieänderung): fehlt/false
   * = heutiges durchgezogenes Bild bleibt byte-identisch (Goldens-Guard,
   * wie `fluegelTyp` selbst). Es gab bisher KEIN Feld, das die
   * Öffnungsrichtung trägt (`swing` ist die ANSCHLAGSEITE/Bandseite, nicht
   * innen/aussen) — dieses Feld schliesst die Lücke, statt `swing`
   * zweckzuentfremden. Nur bei `openingType 'fenster'` sinnvoll,
   * unabhängig von `fluegelTyp` (eine Öffnung ohne `fluegelTyp` zeigt
   * ohnehin keine Symbolik, das Feld bleibt dann wirkungslos). */
  oeffnetNachAussen?: boolean;
  /**
   * Beschlag-Katalog S0 (v0.7.3 D6, `docs/V073-GESTALTUNG-SPEZ.md` §D6):
   * additive Beschlag-Attribute, NUR im Werkplan sichtbar (Daten-Guard —
   * ohne diese Felder bleibt der Grundriss byte-identisch). Sechs Symbole
   * der Katalogstufe S0: Band, Griffseite, Brüstungshöhe (BRH — bewusst
   * KEIN eigenes Feld, die Ableitung etikettiert das bestehende `sill`),
   * Schiebe-Lauf (bewusst kein eigenes Feld — abgeleitet aus
   * `fluegelTyp === 'schiebe'`, s. `derive/plan.ts`), Motorantrieb
   * (`antrieb`) und Absturzsicherung (`absturzsicherung`). Anschläge/RWA/
   * Dichtebene und die 12er-Ausbaustufe S1 bleiben bewusst vertagt (Canvas
   * 7a) — NICHT gebaut.
   */
  /** Bandseite (Scharnierlage) am Blendrahmen — welche Kante des
   * Öffnungsrahmens die Bänder trägt. */
  band?: 'links' | 'rechts' | 'oben' | 'unten';
  /** Seite des Griffs/Drückers (Bedienseite), unabhängig von `swing`
   * (Anschlagseite) und `band`. */
  griffseite?: 'links' | 'rechts';
  /** Motorantrieb vorhanden (Katalogsymbol «M» im Werkplan). */
  antrieb?: boolean;
  /** Absturzsicherung (Geländer/Sicherheitsglas-Hinweis) vorhanden. */
  absturzsicherung?: boolean;
  /**
   * Beschlag-Katalog S2 (v0.7.5 Welle 1 A1): Liste zugewiesener Katalog-Keys
   * aus `BESCHLAG_KATALOG` (`derive/beschlag.ts`, 12 Typen: Türdrücker,
   * Scharnier, Schloss, …). Bewusst OPENING-GEHOSTET (additives Array-Feld)
   * statt einer eigenen Entity wie `Furniture` — Beschläge sind
   * bauteilgebunden (Tür/Fenster), das additive Feld bleibt golden-/undo-/
   * vault-/.kosmo-sicher ohne neue Entity-Klasse. Eine freie, unabhängig
   * platzierbare Beschlag-Instanz (die im S1-Header angedeutete «eigene
   * Entity»-Variante) bleibt bewusst ein optionaler späterer S3-Weg. Additiv
   * und nur im Werkplan sichtbar (Daten-Guard, wie die S0-Felder oben) —
   * fehlt = heutiges Bild bleibt byte-identisch.
   */
  beschlaege?: string[];
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
  /**
   * Site-/Parzellen-Marker (v0.7.0 D8/H-1): additiv, KEINE Migration nötig —
   * Zonen ohne dieses Feld verhalten sich unverändert. Kennzeichnet eine
   * Zone, die eine importierte Kataster-Parzelle repräsentiert (statt eines
   * Raums). Solche Zonen werden von Raumtyp-Checks (`derive/checks.ts`) und
   * von der SIA-416-Flächensumme (`derive/sia416.ts` `areaReport`/`totalNgf`)
   * ausgenommen — die `sia`-Klasse bleibt (meist `'KF'`, Bestandskonvention
   * für `derive/schwarzplan.ts`). Die Parzellenfläche für AZ läuft
   * unverändert separat über `doc.settings.parzellenFlaeche`. EHRLICHE
   * GRENZE: `derive/berechnungsliste.ts` (Δ Max) liegt ausserhalb dieses
   * Streams (Datei nicht in der Besitzliste) — eine Parzellen-Zone OHNE
   * `program` zählt dort weiterhin als «untypisiert» mit, wie jede andere
   * Zone ohne `program` auch (unverändertes Bestandsverhalten).
   *
   * `'nachbar'` (v0.7.1 E2/1B): additiv nach demselben Muster wie
   * `'parzelle'` — kennzeichnet eine Zone als importierten Nachbargebäude-
   * Footprint (reine Kontext-Geometrie fürs Situationsplan-Bild, kein
   * eigener Raum). Genau wie `'parzelle'` von Raumtyp-Checks und der
   * SIA-416-Flächensumme ausgenommen (`derive/checks.ts`, `derive/
   * sia416.ts`); `derive/schwarzplan.ts` zeichnet Nachbar-Zonen separat als
   * graue Footprints. Entsteht NUR über `design.nachbarnUebernehmen`
   * (`commands/design.ts`), nicht über das freie `zoneErstellen`.
   */
  zonenArt?: 'parzelle' | 'nachbar';
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

/** Walm- oder Satteldach — Grundriss-Polygon + Neigung; Geometrie via Straight Skeleton (Walm)
 * bzw. First-Ebenen-Teilung (Sattel). */
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
  /** Dachform: «walm» (Default, alle Seiten geneigt) oder «sattel» (First + 2 Flächen,
   * Giebel an den Schmalseiten quer zur Firstrichtung). Fehlt das Feld (ältere Dokumente),
   * gilt «walm». */
  form?: 'walm' | 'sattel';
  /** Nur bei form «sattel»: Achse, entlang der der First verläuft. */
  firstrichtung?: 'x' | 'y';
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

/**
 * FreeMesh (V2-Technik Block 3, Owner-Q9 Stufe 3) — frei editierbare
 * ENTWURFSGEOMETRIE (Schalen, skulpturale Dächer, Sonderformen). Bewusst im
 * Doc (selektier-/editier-/undo-/sync-fähig), aber mit HARTEM Budget: das
 * löst den Konflikt mit «Laufzeit ≠ Modell» — Scans/Bibliotheks-GLBs bleiben
 * Laufzeit-Referenz (asset-bibliothek), nie Doc-Last (Buildplan Block 3, E1).
 * Topologie (Verschweissung, planare Regionen) wird NIE gespeichert, sondern
 * zur Laufzeit abgeleitet (derive/mesh-topo.ts, E2).
 */
export interface FreeMesh extends Base {
  kind: 'freemesh';
  storeyId: string;
  /** Vertex-Positionen, flach [x0,y0,z0, x1,…] in mm (ganzzahlig);
   * z relativ zur Geschoss-OK (die Ableitung addiert storey.elevation). */
  positions: number[];
  /** Dreiecks-Indizes, flach [a0,b0,c0, a1,…] — Winding auswärts (CCW). */
  faces: number[];
  name?: string;
}

/** Hartes FreeMesh-Budget (E1) — Commands weisen Überschreitung ehrlich ab. */
export const FREEMESH_MAX_VERTICES = 4096;
export const FREEMESH_MAX_FACES = 8192;

/** Papierformate (ISO 216) für Plansätze + `Rolle` (v0.8.1/P13, Plotter-
 * Rollenformat 1600×594mm, `docs/V081-SPEZ.md` §7(d), `derive/blattlayout.ts`
 * `BLATT_FORMATE.Rolle`). */
export type SheetFormat = 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'Rolle';

/** Eine platzierte Ansicht auf einem Blatt — Position in Papier-mm. */
export interface SheetPlacement {
  id: string;
  /** 'situationsplan' additiv (v0.7.0 E4/K10, Stream 3A): Parzellengrenze +
   *  Gebäude-Footprints, s. `derive/sheet.ts` `situationsplanInnerSvg` — kein
   *  `storeyId`/`section` nötig, nur `scale`/`x`/`y` wie bei `axo`. */
  view: 'grundriss' | 'schnitt' | 'axo' | 'situationsplan';
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
  /**
   * Umbau-Filter je Platzierung (ArchiCAD-Renofilter, RE-ARCHICAD A2):
   * fehlend = kombinierter Plan (heutiges Verhalten). 'abbruch' =
   * Abbruchplan (Bestand + Abbruch, Neubau ausgeblendet), 'neu' =
   * Neubauplan (Bestand + Neu, Abbruch ausgeblendet), 'bestand' = nur
   * Bestand. So entstehen die getrennten SIA-Umbau-Planläufe aus EINEM Modell.
   */
  umbau?: 'bestand' | 'abbruch' | 'neu';
  /** Themenplan-Name (RE-ARCHICAD A5): tönt die Platzierung nach den Regeln
   * aus settings.themen + zeichnet eine Legende. Fehlend = normaler Plan. */
  thema?: string;
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

/** Revisions-Eintrag eines Blatts (RE-ARCHICAD A7): Index A, B, C … */
export interface SheetRevision {
  index: string;
  text: string;
  /** Datum als Text (de-CH), z.B. «04.07.2026». */
  datum: string;
}

/** Änderungswolke (A7): markiert den geänderten Bereich in Papier-mm,
 * gebunden an einen Revisions-Index. */
export interface SheetWolke {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  revision: string;
}

/**
 * Plankopf-Textfelder (v0.8.0 P2) — additive Angaben für den Kopfstempel
 * eines Blatts (Inhalt, Plannummer, Disziplin, Geschoss-Code, gezeichnet/
 * geprüft von, Datum). Reine Datenhaltung dieser Runde: das eigentliche
 * Zeichnen des Kopfstempels folgt in einem separaten `derive/`-Paket, hier
 * nur die Guard-Phase — fehlend (kein `plankopf` am Blatt) bleibt das Bild
 * byte-identisch (Goldens-Guard, wie z.B. `fluegelTyp` bei `Opening`). Nur
 * über `publish.plankopfSetzen` gesetzt (Merge, s. dortigen Kommentar).
 */
export interface SheetPlankopf {
  inhalt?: string;
  planNummer?: string;
  disziplin?: string;
  geschossCode?: string;
  gezeichnet?: string;
  geprueft?: string;
  datum?: string;
}

/**
 * Blatt-Layout-Schalter (v0.8.0 P2) — additive boolesche Optionen
 * (Heftrand, Faltmarken, Wasserzeichen, Massstabsbalken, Nordpfeil). Wie bei
 * `SheetPlankopf`: reine Datenhaltung, das Zeichnen folgt separat in
 * `derive/` — fehlend = heutiges Bild bleibt byte-identisch (Goldens-Guard).
 * Nur über `publish.blattLayoutSetzen` gesetzt (Merge, s. dortigen
 * Kommentar).
 */
export interface SheetLayout {
  heftrand?: boolean;
  faltmarken?: boolean;
  wasserzeichen?: boolean;
  massstabsbalken?: boolean;
  nordpfeil?: boolean;
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
  /** Plan-Revisionen (A7): Einträge fürs Revisionsverzeichnis im Plankopf. */
  revisionen?: SheetRevision[];
  /** Änderungswolken (A7), je an einen Revisions-Index gebunden. */
  wolken?: SheetWolke[];
  /** Plankopf-Textfelder (v0.8.0 P2) — s. `SheetPlankopf`-Kommentar. */
  plankopf?: SheetPlankopf;
  /** Layout-Schalter (v0.8.0 P2) — s. `SheetLayout`-Kommentar. */
  layout?: SheetLayout;
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

/**
 * Mangel (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4,
 * Lücken-Batch 5, Owner-Hauptaufgabe K22) — Mängel-Erfassung für die
 * Abschlussphase «Gebäudeabnahme». `ort` ist ein freier Lagetext (z.B. «Bad
 * 2.OG»), optional ergänzt um `storeyId` (Geschossbezug) und/oder `at`
 * (Welt-mm) — bewusst KEIN Bauteil-Host wie bei `Etikett`/`Aussparung`:
 * Mängel treffen oft mehrere Bauteile oder gar keins (z.B. «Handlauf fehlt
 * ganz»), ein starrer Bauteilbezug wäre zu eng. `gewerk` ist ein FREIES Feld
 * ohne Enum-Bindung — die App bietet die Bauablauf-Gewerke
 * (`MANGEL_GEWERK_VORSCHLAEGE`, `derive/bauablauf.ts`) nur als Vorschlagsliste
 * an, jeder Text bleibt gültig. `erfasstAm`/`behobenAm` sind vorformatierte
 * Datumsstrings (de-CH) — wie überall im Kernel NIE `Date.now()` im
 * Command-/Derive-Pfad, das Datum kommt als Parameter von der App.
 */
export interface Mangel extends Base {
  kind: 'mangel';
  ort: string;
  storeyId?: string;
  /** Optionaler Lagepunkt in Welt-mm (Plan-Marker sind bewusst NICHT gebaut,
   * s. `derive/abnahmeprotokoll.ts` Kommentar — dieses Feld liegt bereit,
   * falls ein künftiger Batch einen Overlay-Marker ergänzt). */
  at?: Pt;
  beschreibung: string;
  gewerk: string;
  status: 'offen' | 'behoben';
  /** Vorformatiertes Erfassungsdatum (de-CH), Parameter des Commands. */
  erfasstAm: string;
  /** Vorformatiertes Behebungsdatum (de-CH); nur gesetzt, wenn status 'behoben'. */
  behobenAm?: string;
  /** Optionale Frist (freier Text/Datum) zur Behebung. */
  frist?: string;
}

/** Port-Typen im Render-Graphen (V1-P2): nur gleiche Typen verbinden sich.
 * `kameras` (Owner-Befund K20/A10): Auto-Kamera-Standpunkte, s. derive/kamera.ts. */
export type VisPortTyp = 'szene' | 'bild' | 'prompt' | 'zahl' | 'material' | 'kameras';

/** Ein Node im Render-Graphen. Typ-Katalog: derive/visgraph.ts. */
export interface VisNode {
  id: string;
  typ: string;
  /** Canvas-Position (freie Einheiten, kein Weltmass). */
  x: number;
  y: number;
  params: Record<string, string | number | boolean>;
  collapsed?: boolean;
}

/** Gerichtete Kante: fromPort (Ausgang) → toPort (Eingang). */
export interface VisEdge {
  id: string;
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
}

/**
 * Render-Graph (V1-Finish P2) — der Blender-artige Node-Tree von KosmoVis.
 * NUR die Graph-Beschreibung lebt im Modell (Undo, Yjs, .kosmo); Job-Status
 * und Render-Bilder bleiben im Laufzeit-Store der App — nie Base64 durch
 * den Sync. Zyklen werden beim Verbinden abgelehnt (vis.verbinden).
 */
export interface VisGraph extends Base {
  kind: 'visgraph';
  name: string;
  nodes: VisNode[];
  edges: VisEdge[];
}

export type Entity =
  | Storey | GridAxis | Assembly | Wall | Slab | Opening | Zone | MassBody | Roof | Stair | Sheet | Boundary | ImageAsset | Furniture | ZonenTuer | Terrain | Aussparung | Column | Beam | Etikett | VisGraph | FreeMesh | Mangel;
export type EntityKind = Entity['kind'];

export function isHostedBy(e: Entity, hostId: string): boolean {
  return e.kind === 'opening' && e.wallId === hostId;
}

export function storeyOf(e: Entity): string | null {
  return 'storeyId' in e ? e.storeyId : null;
}
