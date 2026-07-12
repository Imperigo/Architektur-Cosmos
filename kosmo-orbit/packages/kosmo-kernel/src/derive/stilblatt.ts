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
// Achse 2 · GRAU = Bildtiefe
// Zielsystem laut Matrix (Soll 2b): #111 geschnitten · #3A3A3A gesehen ·
// #666 projiziert · #8A8A8A Kontext. Stand HEUTE (vor dem D1-Sammelwechsel):
// geschnitten zeichnet mit reinem `black`, gesehene Kanten (reine Ansicht,
// Axo) mit #111, Schnitt-Projektionen mit #444, Kontext bereits #8a8a8a.
// ───────────────────────────────────────────────────────────────────────────

export const GRAU = {
  /** Geschnittene Bauteile, Symbole in der Schnittebene, Masse, Koten. */
  geschnitten: 'black',
  /** Gesehene Kanten: reine Ansicht (Fassade), Axonometrie. */
  gesehen: '#111',
  /** Projektionen hinter der Schnittebene (Hidden-Line-Kanal), Rohboden. */
  projiziert: '#444',
  /** Kontext-Geometrie (Nachbar-Footprints im Situationsplan). */
  kontext: '#8a8a8a',
} as const;

/** Nebentöne ausserhalb der Vier-Ton-Achse (heutiger Bestand). Der
 * D1-Sammelwechsel legt sie auf die Achse — bis dahin tragen sie ihre
 * gewachsenen Werte, damit dieses Modul ein reiner Refactor bleibt. */
export const GRAU_SONDER = {
  /** Flügelsymbolik (Dreieck/Pfeil) in Ansicht/Schnitt. */
  symbolik: '#333',
  /** SIA-Material-Schraffurlinien im Schnitt. */
  schraffur: '#333',
  /** Terrainprofil «neu» (ausgezogen, 0.35er-Klasse). */
  terrainNeu: '#333',
  /** Terrainprofil «gewachsen» + flache Bodenlinie (gestrichelt). */
  terrainGewachsen: '#777',
  /** Ideelle Zeichen: Rasterachsen (strichpunktiert), Tür-/Fensterbögen. */
  ideell: '#555',
} as const;

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
  /** Massstabs-Nenner, mit dem SectionView die Schraffur-Kadenz rechnet. */
  schraffurMassstab: 50,
  terrainDash: '200 120',
} as const;
