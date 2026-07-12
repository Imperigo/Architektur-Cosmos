/**
 * Stilblatt (v0.7.3 D1, «Ein Stilblatt, zwei Renderer» — Grundsatz 3 der
 * Gestaltungs-Spez `docs/V073-GESTALTUNG-SPEZ.md`): das EINE Token-Modul für
 * alle Darstellungs-Konstanten der Plangrafik. Jede derive-Linie deklariert
 * ein Tripel **Stift × Grau × Linientyp**; die Renderer (`plansvg.ts`,
 * `sheet.ts`, `schwarzplan.ts`) und die Bildschirm-Ansichten (`PlanView.tsx`,
 * `SectionView.tsx`) lesen dieselbe Tabelle — Umstiften ohne Streusuche.
 *
 * Schrift-Zeilen (Font-Familien, mm-Skala der Blatt-Typografie) gehören
 * bewusst NICHT hierher — sie kommen mit D4 (Stream S3) in dieses Modul.
 * Ebenso bleiben Symbol-GEOMETRIEN (Welt-mm: Glaslinien-Abstand ±25,
 * Kipp-Doppelstrich 120/30, Bruchlinien-Länge …) in `derive/plan.ts`/
 * `section.ts` — das Stilblatt regelt die DARSTELLUNG einer Linie, nicht,
 * wo sie liegt.
 */

import type { BauPhase } from '../model/doc';

// ───────────────────────────────────────────────────────────────────────────
// Achse 1 · STIFT = konstruktive Bedeutung (Papier-mm, massstabskonstant)
// 0.50 primär geschnitten · 0.35 sekundär geschnitten/Terrain neu ·
// 0.25 Sichtkante · 0.18 fein (Projektion, Symbolik, Mass).
// ───────────────────────────────────────────────────────────────────────────

export const STIFT = {
  primaer: 0.5,
  sekundaer: 0.35,
  kante: 0.25,
  fein: 0.18,
} as const;

/** Bemassungs-Stifte: Aussenketten laufen auf der feinen 0.18er-Klasse,
 * Innenketten bewusst noch feiner (0.13, Bestand seit V2) — eine
 * dokumentierte Sonderstufe unterhalb der Vierer-Leiter. */
export const MASS_STIFT = {
  aussen: 0.18,
  innen: 0.13,
} as const;

/** Zonentür-Lücke (A4): radiert die Zonenkontur mit einem breiten
 * Papier-Stift aus — Sonderwert, kein Matrix-Stift. */
export const ZONENTUER_LUECKE_STIFT = 120;

// ───────────────────────────────────────────────────────────────────────────
// Achse 2 · GRAU = Bildtiefe (D1-Sammelwechsel, Soll 2b)
// #111 geschnitten · #3A3A3A gesehen · #666 projiziert · #8A8A8A Kontext.
// Bewusster Wechsel (GOLDEN-WECHSEL-D1.md): Projektionen wurden heller
// (#444→#666), Gesehenes liegt neu auf dem dunkleren Mittelton #3A3A3A.
// ───────────────────────────────────────────────────────────────────────────

export const GRAU = {
  /** Geschnittene Bauteile, Symbole in der Schnittebene, Masse, Koten. */
  geschnitten: '#111',
  /** Gesehene Kanten: reine Ansicht (Fassade), Axonometrie, Leibung. */
  gesehen: '#3A3A3A',
  /** Projektionen hinter der Schnittebene (Hidden-Line-Kanal), Rohboden. */
  projiziert: '#666',
  /** Kontext-Geometrie (Nachbar-Footprints im Situationsplan). Farbidentisch
   * mit dem Matrix-Ton #8A8A8A — Kleinschreibung bewusst beibehalten, damit
   * Schwarzplan/Situationsplan byte-stabil bleiben (D3: wie heute). */
  kontext: '#8a8a8a',
} as const;

/** Ehemalige Nebentöne (#333/#555/#777), im D1-Sammelwechsel auf die
 * Vier-Ton-Achse gelegt (Herleitung je Zeile: GOLDEN-WECHSEL-D1.md §1). */
export const GRAU_SONDER = {
  /** Flügelsymbolik (Dreieck/Pfeil) liegt auf der GESEHENEN Fassade. */
  symbolik: GRAU.gesehen,
  /** SIA-Material-Schraffur: Feinzeichnung, nicht Kante → Mittelton. */
  schraffur: GRAU.gesehen,
  /** Terrain «neu» = 0.35er-Klasse «sekundär geschnitten» (Matrix). */
  terrainNeu: GRAU.geschnitten,
  /** Terrain «gewachsen» + flache Bodenlinie = Kontext. */
  terrainGewachsen: GRAU.kontext,
  /** Ideelle Zeichen (Rasterachsen, Tür-/Fensterbögen) = Nicht-Körper-Ton. */
  ideell: GRAU.projiziert,
} as const;

/**
 * D2-Weiche (v0.7.3): Leibungslinie 0.25 ist Standard AB Vorprojekt für
 * alle Öffnungen in der Ansicht (löst §11.3, keine konturlosen Lochungen).
 * Bewusst EIGENE Weiche — `fruehePhase()` (model/doc.ts) umfasst das
 * Vorprojekt und meint damit das Gegenteil («reduziertes Detail»).
 */
export function abVorprojekt(phase: BauPhase): boolean {
  return phase !== 'wettbewerb';
}

/** Radierer-Weiss der Zonentür-Lücke (Papiergrund). */
export const RADIER_WEISS = 'white';

// ───────────────────────────────────────────────────────────────────────────
// Achse 3 · LINIENTYP = Existenz (Papier-mm)
// ───────────────────────────────────────────────────────────────────────────

/** Normatives Matrix-Vokabular (Soll 2b): voll = real · Strich 3–1.5 =
 * verdeckt/Abbruch · Strichpunkt 8–1.5–0.5–1.5 = ideell (Achse/Parzelle) ·
 * Punkt 0.5–2 = temporär (Raster/Bewegungsfläche). Deklariert als SOLL —
 * die gewachsenen Bestands-Kadenzen darunter (`DASH`) tragen heute noch
 * feinere Unterscheidungen (Haupt-/Wohnachse, Feinstrichpunkt für kleine
 * Überzeichnungen); ihre Normalisierung auf dieses Vokabular ist eine
 * eigene, dokumentierte Folgeentscheidung (s. GOLDEN-WECHSEL-D1.md). */
export const LINIENTYP_SOLL = {
  strich: [3, 1.5],
  strichpunkt: [8, 1.5, 0.5, 1.5],
  punkt: [0.5, 2],
} as const;

/** Bestands-Kadenzen (Papier-mm) — die Renderer skalieren sie in Welt-mm. */
export const DASH = {
  /** Baugrenze, Parzelle, Haupt-Rasterachse: Strichpunkt (ideell). */
  strichpunktBestand: [3, 0.9, 0.6, 0.9],
  /** Über der Schnittebene (Treppenteile, Dachumriss darüber): Feinstrichpunkt. */
  ueberSchnitt: [1.5, 0.6, 0.3, 0.6],
  /** Unterzug (verdeckt über der Schnittebene). */
  unterzug: [1.2, 0.7],
  /** Abbruch-Kante (SIA-Umbau). */
  abbruch: [1.5, 0.8],
  /** Volumenkörper-Kontur (Massenmodell). */
  volumen: [2, 1],
  /** Terrain «gewachsen» + flache Bodenlinie. */
  terrainGewachsen: [2, 1.2],
  /** Wohn-Rasterachse (sekundär). */
  achseWohn: [1.2, 0.9],
  /** Tür-/Fensterflügel-Bogen. */
  bogen: [1, 0.7],
  /** Leerer Bild-Slot auf dem Blatt (Messrahmen-Platzhalter). */
  platzhalter: [2.5, 1.4],
} as const;

/** Dash-Muster in Welt-mm ausgeben (Papier-mm × Massstab), Leerzeichen-
 * getrennt — exakt die Formatierung der bisherigen Template-Literale. */
export function dashWelt(muster: readonly number[], scale: number): string {
  return muster.map((d) => d * scale).join(' ');
}

// ───────────────────────────────────────────────────────────────────────────
// Umbau-Farbcode (SIA 400 B.8.11) — Bestand schwarz/grau, Neubau rot,
// Abbruch gelb. KEIN Teil der Grau-Achse (Signalfarben, theme-invariant).
// ───────────────────────────────────────────────────────────────────────────

export const UMBAU_STIFTE = {
  neu: '#b3261e',
  abbruch: '#8a7500',
} as const;

/** Bildschirm-Flächen des Umbau-Codes (PlanView): getönte Füllungen. */
export const UMBAU_FLAECHEN = {
  neu: 'rgba(179, 38, 30, 0.22)',
  abbruch: 'rgba(214, 178, 20, 0.35)',
  bestand: '#c9c9c9',
} as const;

// ───────────────────────────────────────────────────────────────────────────
// Schwarzplan/Situationsplan (D3: «Schwarzplan-Modul bleibt wie heute»)
// ───────────────────────────────────────────────────────────────────────────

export const SCHWARZPLAN_FARBEN = {
  /** Eigene Gebäude-Footprints (hervorgehoben, Situationsplan-Usanz). */
  eigen: '#1a1a1a',
  /** Nachbar-Footprints = Kontext-Grau der Bildtiefen-Achse. */
  nachbar: GRAU.kontext,
  /** Parzellengrenze (strichpunktiert) — bleibt volle Tinte. */
  parzelle: 'black',
} as const;

// ───────────────────────────────────────────────────────────────────────────
// Blatt-Chrome (Rahmen, Plankopf, Platzhalter) — Papier-mm, NICHT skaliert.
// Die Typografie-Töne gehören zur Blatt-Typografie (D4/S3), nicht zur
// Grau-Achse der Plangrafik.
// ───────────────────────────────────────────────────────────────────────────

export const BLATT = {
  tinte: 'black',
  /** Sekundär-Text im Plankopf/Titel (Massstab, Datum, Revisions-Datum). */
  textSekundaer: '#444',
  rahmenStift: 0.35,
  kastenStift: 0.25,
  trennStift: 0.18,
} as const;

export const PLATZHALTER = {
  linie: '#666',
  kreuz: '#bbb',
} as const;

// ───────────────────────────────────────────────────────────────────────────
// Blatt-Typografie «Zwei Stimmen» (v0.7.3 D4, Soll 5b) — Stream S3. Titel:
// Lato Heavy, versal, +0.04em Tracking (Plankopf-Titel, Legenden-Titel =
// Bildlegenden-Beschriftung je Ansicht/Bild). Alles Messbare (Masse, Koten,
// Etiketten, Plankopf-Meta, Achskreise): IBM Plex Mono mit Tabellenziffern
// (`font-feature-settings:'tnum'`). Generischer Sans-/Mono-Fallback dahinter,
// weil der svg-qa-Rasterizer (echtes Chromium, aber ohne Lato/IBM Plex Mono
// installiert) sonst auf Systemmetriken bricht statt sauber zurückzufallen.
// Empirischer Entscheid Lato 700 vs. 900 («Heavy» 800 existiert bei
// @fontsource/lato nicht): s. `docs/GOLDEN-WECHSEL-D4.md` — die font-family-
// KETTE hier bleibt in jedem Fall `'Lato', …`, das Gewicht steckt in der
// PDF-eingebetteten TTF-Datei (`apps/kosmo-orbit/public/fonts/pdf/`), nicht
// im Golden-String.
// ───────────────────────────────────────────────────────────────────────────

/** Titel-Stimme: Plankopf-Titel + Legenden-Titel (Bildunterschrift je Ansicht/Bild). */
export const SCHRIFT_TITEL = `'Lato', Helvetica, Arial, sans-serif`;

/** Messbar-Stimme: Masse, Koten, Etiketten, Plankopf-Meta, Achskreise. */
export const SCHRIFT_MESSBAR = `'IBM Plex Mono', ui-monospace, monospace`;

/** Tracking der Titel-Stimme (versal gesetzt, D4-Fixwert). */
export const TITEL_TRACKING_EM = 0.04;

/** mm-Skala der Blatt-Typografie (Papier-mm, D4-Fixwerte); Bemassung bleibt
 * unverändert bei ihren bestehenden Grössen (`MASS_STIFT`-Nachbarschaft). */
export const BLATT_TYPO_MM = {
  titel: 4.2,
  untertitel: 3.2,
  meta: 2.8,
  etikett: 2.5,
  /** Trennlinie unter dem Plankopf-Titel — eigener Wert, NICHT `BLATT.trennStift`
   * (0.18, D1-Blattrahmen-Feinlinie): D4 setzt hier bewusst die kräftigere
   * 0.35er-Klasse (Titel/Meta-Trennung soll sichtbarer sein als die
   * Kastenlinien). */
  trennlinie: 0.35,
} as const;

/** Versalsetzung der Titel-Stimme (Schweizer Deutsch: kein ß, `toLocaleUpperCase`
 * reicht für Umlaute; ss-statt-ß-Texte kommen bereits so aus den Optionen). */
export function versal(s: string): string {
  return s.toLocaleUpperCase('de-CH');
}

/** Titel-Stimme OHNE Grössen-Bindung — für Freitext mit selbstgewählter
 * Grösse (`sheet.texte[].size`, Plakat-/Konzepttitel), wo `font-size` separat
 * am Aufrufer hängt statt an einer der vier `BLATT_TYPO_MM`-Stufen. */
export const TITEL_STIL = `font-weight="bold" font-family="${SCHRIFT_TITEL}" letter-spacing="${TITEL_TRACKING_EM}em"`;

/** SVG-Attribute der Titel-Stimme für eine gegebene mm-Grösse. */
export function titelAttr(sizeMm: number): string {
  return `${TITEL_STIL} font-size="${sizeMm}"`;
}

/** SVG-Attribute der Messbar-Stimme (Tabellenziffern) für eine gegebene Grösse
 * (mm im Blatt-Kontext, px in den Report-Blatt-Modulen — beide Massstäbe
 * rufen dieselbe Funktion, der Zahlenwert ist die jeweilige Einheit). */
export function messbarAttr(size: number): string {
  return `font-family="${SCHRIFT_MESSBAR}" font-size="${size}" font-feature-settings="'tnum'"`;
}

// ───────────────────────────────────────────────────────────────────────────
// Bildschirm-Stiftsätze (Welt-mm bei Bildschirm-Zoom) — PlanView/SectionView
// lesen dieselbe Tabelle wie der Druckweg; die FARBEN am Bildschirm bleiben
// Theme-Variablen (var(--k-ink…)), «Papier ist Papier»: das Stilblatt liefert
// die Stufe, die Farbe entscheidet der Aufrufer (Druck hart, Live-Plan UI).
// ───────────────────────────────────────────────────────────────────────────

/** PlanView: Region-/Linien-Stifte in Welt-mm (Bestandswerte). */
export const BILDSCHIRM_PLAN = {
  regionGeschnitten: 24,
  regionSekundaer: 12,
  regionProjektion: 8,
  linieStandard: 14,
  linieBaugrenze: 12,
  linieZonentuerFluegel: 12,
  linieFein: 10,
  luecke: 120,
  bogen: 8,
  moebelKorpus: 10,
  moebelBewegung: 6,
} as const;

/** SectionView: Schnitt-/Ansicht-Stifte in Welt-mm (Bestandswerte). */
export const BILDSCHIRM_SCHNITT = {
  geschnitten: 26,
  projektion: 7,
  symbolik: 7,
  terrainNeu: 16,
  terrainGewachsen: 10,
  schraffur: 9,
  koten: 9,
  /** D2-Leibung/Rahmen (v0.7.3): 0.25er-/0.18er-Klasse am Bildschirm. */
  leibung: 13,
  rahmen: 9,
  /** Massstabs-Nenner, mit dem SectionView die Schraffur-Kadenz rechnet. */
  schraffurMassstab: 50,
  terrainDash: '200 120',
} as const;
