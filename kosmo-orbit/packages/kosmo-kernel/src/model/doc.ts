import type { Entity } from './entities';
import type { Mm, Pt } from './units';

/**
 * KosmoDoc — der Entity-Store des Projekts.
 *
 * Mutationen laufen ausschliesslich über Patches: { id, before, after }.
 * Ein Patch ist trivial invertierbar (before/after tauschen) — das trägt
 * Undo/Redo, das Journal und später die Yjs-Bindung (Commands sind die
 * einzigen Schreiber; CRDT und Journal werden daraus abgeleitet).
 */

/** Dossier-Eintrag (Phase 0): harte Regel oder Fakt aus dem Wettbewerbsprogramm. */
export interface DossierEintrag {
  typ: 'do' | 'dont' | 'fakt';
  text: string;
}

/** Ein Posten des Wettbewerbs-Raumprogramms (HNF-Soll je Wohnungstyp, m²). */
export interface RaumprogrammPosten {
  typ: string;
  hnfSoll: number;
}

/**
 * SIA-Bauphase (Owner-Auftrag 03.07.) — steuert NUR den Detaillierungsgrad
 * der Pläne (Poché vs. Schichten vs. volle Materialschraffur, 1:200/1:100/
 * 1:50). Regelwerk: docs/PLAN-DETAILLIERUNG.md (Hochbauzeichner-Konvention,
 * Abgleich mit den Lehrheften folgt über KosmoPrepare).
 *
 * WICHTIG (v0.6.3, s. `SiaPhase` unten): `BauPhase` ist NICHT die aktuelle
 * SIA-Teilphase des Projekts — es ist rein der Plan-Zeichenstil. Ein Projekt
 * in der Wettbewerbsphase kann z.B. bereits mit `phase: 'werkplan'` gezeichnet
 * sein (voller Detailgrad für eine Studie), und ein Projekt in der
 * Ausführung kann testweise auf `'vorprojekt'`-Poché zurückgestellt werden.
 * Die beiden Zustände sind bewusst getrennt (`doc.settings.phase` vs.
 * `doc.settings.siaPhase`) und werden NICHT automatisch gekoppelt.
 */
export type BauPhase = 'wettbewerb' | 'vorprojekt' | 'bauprojekt' | 'baueingabe' | 'werkplan';

export function phaseLabel(phase: BauPhase): string {
  switch (phase) {
    case 'wettbewerb':
      return 'Wettbewerb (SIA 22)';
    case 'vorprojekt':
      return 'Vorprojekt (SIA 31)';
    case 'bauprojekt':
      return 'Bauprojekt (SIA 32)';
    case 'baueingabe':
      return 'Baueingabe (SIA 33)';
    case 'werkplan':
      return 'Werkplan (SIA 51)';
  }
}

/**
 * Aktuelle SIA-Teilphase des Projekts (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * Abschnitt 2 + Lücken-Batch 1) — der reale Projektstand im SIA-102/112-Zyklus
 * vom Wettbewerb bis zur Gebäudeabnahme. Zeichnet NICHTS, steuert NICHTS am
 * Plan-Detaillierungsgrad (das bleibt `BauPhase` oben) — reiner
 * Kosmo-sichtbarer Statuszustand, additiv zu `DocSettings`, kein Kernel-Bruch.
 *
 * `'wettbewerb'` = SIA 4.22 (Auswahlverfahren/Studie, vor der eigentlichen
 * SIA-102-Nummerierung), `'vorprojekt'` = SIA 31, `'bauprojekt'` = SIA 32,
 * `'bewilligung'` = SIA 33 (Baugesuch), `'ausschreibung'` = SIA 41,
 * `'ausfuehrung'` = SIA 51/52 (Ausführungsprojekt/Werkplanung/Bauausführung),
 * `'abnahme'` = Gebäudeabnahme nach Bauende — SIA 102 kennt dafür keine
 * eigene Teilphase-Nummer im OCR-Korpus, hier ehrlich als eigene,
 * unbelegte Arbeitsphase geführt (kein SIA-Zitat erfunden).
 */
export type SiaPhase =
  | 'wettbewerb'
  | 'vorprojekt'
  | 'bauprojekt'
  | 'bewilligung'
  | 'ausschreibung'
  | 'ausfuehrung'
  | 'abnahme';

export function siaPhaseLabel(phase: SiaPhase): string {
  switch (phase) {
    case 'wettbewerb':
      return 'Wettbewerb/Studie (SIA 4.22)';
    case 'vorprojekt':
      return 'Vorprojekt (SIA 31)';
    case 'bauprojekt':
      return 'Bauprojekt (SIA 32)';
    case 'bewilligung':
      return 'Baueingabe (SIA 33)';
    case 'ausschreibung':
      return 'Ausschreibung (SIA 41)';
    case 'ausfuehrung':
      return 'Ausführungsprojekt/Ausführung (SIA 51/52)';
    case 'abnahme':
      return 'Gebäudeabnahme (unbelegte Arbeitsphase)';
  }
}

/**
 * NUR-Vorschlag (kein Zwang, s. Kommentar bei `BauPhase`): welcher
 * Plan-Detaillierungsgrad zu einer SIA-Teilphase passt. Der Command
 * `design.siaPhaseSetzen` nennt das in seiner Zusammenfassung, koppelt es
 * aber NICHT automatisch in `doc.settings.phase` — Owner-Kontrolle, keine
 * Überraschungen.
 */
export function empfohlenePlanPhase(siaPhase: SiaPhase): BauPhase {
  switch (siaPhase) {
    case 'wettbewerb':
      return 'wettbewerb';
    case 'vorprojekt':
      return 'vorprojekt';
    case 'bauprojekt':
      return 'bauprojekt';
    case 'bewilligung':
      return 'baueingabe';
    case 'ausschreibung':
    case 'ausfuehrung':
    case 'abnahme':
      return 'werkplan';
  }
}

/**
 * KV-Kennwerte (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4,
 * Lücken-Batch 3) — Basis für die Kostenvoranschlag-**Grobschätzung**
 * (`derive/kostenschaetzung.ts`). AUSDRÜCKLICH ein Richtwert auf GF-Basis,
 * KEIN Devis: keine CRB/NPK-Positionen, keine eBKP-Feingliederung — das
 * echte Devis-Modul bleibt laut `SUBMISSION-KONZEPT.md` §5.1 Owner-Entscheid.
 * Jeder Zahlenwert unten ist eine **Annahme Owner-Guideline, kein
 * verbindlicher Wert** — Owner-typische CH-Wohnbau-Grössenordnung, kein
 * Norm-/Baukostenindex-Zitat. Additiv zu `DocSettings` (wie `siaPhase`,
 * ROADMAP 233): Altbestand-Docs laden über den Default-Spread in
 * `fromJSON`/`defaultSettings`, kein Kernel-Bruch.
 */
export interface KvKennwerte {
  /** BKP-2-Basiswert in CHF pro m² GF (Geschossfläche aus der Berechnungsliste/
   * den gezeichneten Decken). Annahme Owner-Guideline, kein verbindlicher Wert
   * — grobe CH-Wohnbau-Grössenordnung mittlerer Standard, keine Baukostenindex-
   * Quelle. */
  chfProM2Gf: number;
  /** Anteil Rohbau am BKP-2-Basiswert (0..1). Annahme Owner-Guideline, kein
   * verbindlicher Wert. */
  anteilRohbau: number;
  /** Anteil Ausbau am BKP-2-Basiswert (0..1). Annahme Owner-Guideline, kein
   * verbindlicher Wert. */
  anteilAusbau: number;
  /** Anteil Gebäudetechnik am BKP-2-Basiswert (0..1). Annahme Owner-Guideline,
   * kein verbindlicher Wert. Rohbau+Ausbau+Technik ergeben nicht zwingend
   * genau 1.0 — die Summe wird gerechnet, nicht erzwungen (Owner darf bewusst
   * über/unter 100 % der BKP-2-Basis gewichten). */
  anteilTechnik: number;
  /** Zuschlag BKP 4 (Umgebung) als Anteil der BKP-2-Summe (0..1). Annahme
   * Owner-Guideline, kein verbindlicher Wert. */
  zuschlagUmgebung: number;
  /** Zuschlag BKP 5 (Baunebenkosten) als Anteil der BKP-2-Summe (0..1).
   * Annahme Owner-Guideline, kein verbindlicher Wert. */
  zuschlagBaunebenkosten: number;
  /** Reserve/Unvorhergesehenes als Anteil der Zwischensumme (BKP 2+4+5, 0..1).
   * Annahme Owner-Guideline, kein verbindlicher Wert. */
  reserve: number;
}

/** Default-KV-Kennwerte — s. Kommentar bei `KvKennwerte`: Annahme
 * Owner-Guideline, kein verbindlicher Wert, jederzeit über
 * `design.kvKennwerteSetzen` überschreibbar. */
export const defaultKvKennwerte: KvKennwerte = {
  chfProM2Gf: 1900,
  anteilRohbau: 0.45,
  anteilAusbau: 0.4,
  anteilTechnik: 0.15,
  zuschlagUmgebung: 0.06,
  zuschlagBaunebenkosten: 0.08,
  reserve: 0.1,
};

/**
 * Bauablauf-Kennwerte (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4,
 * Lücken-Batch 4, Owner-Hauptaufgabe K22) — Leistungswerte (Menge pro Woche)
 * für den Grob-Terminplan (`derive/bauablauf.ts`). Genau wie bei
 * `KvKennwerte`: jeder Zahlenwert ist eine **Annahme Owner-Guideline, kein
 * verbindlicher Wert** — grobe CH-Baustellen-Grössenordnung (kleines MFH,
 * ein Team je Gewerk), keine SIA-/Baumeisterverband-Norm zitiert. Additiv zu
 * `DocSettings` (wie `kvKennwerte`): Altbestand-Docs laden über den
 * Default-Spread in `fromJSON`/`defaultSettings`, kein Kernel-Bruch.
 */
export interface BauablaufKennwerte {
  /** Aushub: m² Baugrube (Grundfläche der untersten Geschossdecke) pro Woche. Annahme. */
  m2AushubProWoche: number;
  /** Rohbau: m³ Wand-/Deckenvolumen (Beton/Mauerwerk) pro Woche — gilt für
   * Fundament/Bodenplatte UND für jedes Rohbau-Geschoss. Annahme. */
  m3RohbauProWoche: number;
  /** Dach: m² Dachfläche (Grundriss, ohne Abwicklung) pro Woche. Annahme. */
  m2DachProWoche: number;
  /** Fenster/Hülle dicht: m² Fenster-/Türfläche pro Woche. Annahme. */
  m2HuelleProWoche: number;
  /** Innenausbau Elektro: m² Geschossfläche (GF) pro Woche. Annahme. */
  m2ElektroProWoche: number;
  /** Innenausbau Sanitär/Heizung: m² GF pro Woche. Annahme. */
  m2SanitaerHeizungProWoche: number;
  /** Innenausbau Trockenbau/Gipser: m² GF pro Woche. Annahme. */
  m2TrockenbauProWoche: number;
  /** Innenausbau Bodenbeläge: m² GF pro Woche. Annahme. */
  m2BodenbelaegeProWoche: number;
  /** Innenausbau Maler: m² GF pro Woche. Annahme. */
  m2MalerProWoche: number;
  /** Umgebung: m² Umgebungsfläche (Parzelle minus Fussabdruck, sonst
   * Fussabdruck selbst) pro Woche. Annahme. */
  m2UmgebungProWoche: number;
  /** Abnahme: feste Dauer in Wochen — ein Termin, kein Bauvolumen, darum kein
   * Mengenbezug. Annahme. */
  abnahmeWochen: number;
  /** Mindestdauer je Phase in Wochen (nie ein 0-Wochen-Balken, auch bei sehr
   * kleiner oder fehlender Menge). Annahme. */
  minDauerWochen: number;
}

/** Default-Bauablauf-Kennwerte — s. Kommentar bei `BauablaufKennwerte`:
 * Annahme Owner-Guideline, kein verbindlicher Wert, jederzeit über
 * `design.bauablaufKennwerteSetzen` überschreibbar. */
export const defaultBauablaufKennwerte: BauablaufKennwerte = {
  m2AushubProWoche: 250,
  m3RohbauProWoche: 60,
  m2DachProWoche: 200,
  m2HuelleProWoche: 150,
  m2ElektroProWoche: 300,
  m2SanitaerHeizungProWoche: 250,
  m2TrockenbauProWoche: 200,
  m2BodenbelaegeProWoche: 350,
  m2MalerProWoche: 400,
  m2UmgebungProWoche: 300,
  abnahmeWochen: 1,
  minDauerWochen: 1,
};

/** Bemassungs-Stil (V2-A5) — projektweit, wirkt in App-Plan, Druck und DXF. */
export interface BemassungsStil {
  /** Aussenketten: beide (Öffnungen + Gesamtmass), nur Gesamtmass, oder keine. */
  aussenKetten: 'beide' | 'gesamt' | 'keine';
  /** Innenketten auf den Achsen der Innenwände (Werkplan). */
  innenKetten: boolean;
  /** Höhenkoten je Geschoss in Schnitt und Ansicht. */
  hoehenKoten: boolean;
  /** Rohkonstruktions-Kette (B1): Kanten der tragenden Schicht als 3. Kette. */
  rohKette?: boolean;
}

export interface DocSettings {
  projectName: string;
  /** Faktor Raumprogramm→anrechenbare Geschossfläche (Owner-Wissen: 1.28 bzw. 1.22 je Büro). */
  agfFactor: number;
  /** Fassadenzuschlag auf aGF für GF-Volumenstudien (Owner: 10% Skelettbau). */
  facadeFactor: number;
  /** Faktor der Berechnungsliste: aGF-Ziel = HNF-Soll × programmFaktor (Owner: 1.22). */
  programmFaktor: number;
  /** Zulässiges aGF-Maximum (m²) für Δ-Max der Berechnungsliste; null = keins gesetzt. */
  maxAgf: number | null;
  /** Wettbewerbs-Raumprogramm (Soll-Flächen je Wohnungstyp). */
  raumprogramm: RaumprogrammPosten[];
  /** Wettbewerbsdossier (Phase 0): Do's, Don'ts, Fakten — fliesst in Kosmos Systemprompt. */
  dossier: DossierEintrag[];
  bemassung: BemassungsStil;
  /** Detaillierungsgrad der Pläne nach SIA-Phase — NICHT der Projektstand, s. `BauPhase`-Kommentar. */
  phase: BauPhase;
  /** Aktuelle SIA-Teilphase des Projekts (v0.6.3) — getrennter Zustand von
   * `phase`, s. `SiaPhase`-Kommentar. Nur über `design.siaPhaseSetzen`
   * gesetzt, koppelt `phase` NICHT automatisch. */
  siaPhase: SiaPhase;
  /** KV-Grobschätzung-Kennwerte (v0.6.3) — s. `KvKennwerte`-Kommentar:
   * Richtwert, kein Devis. Nur über `design.kvKennwerteSetzen` gesetzt. */
  kvKennwerte: KvKennwerte;
  /** Bauablaufplan-Kennwerte (v0.6.3) — s. `BauablaufKennwerte`-Kommentar:
   * Richtwert, ersetzt keine Bauleitung. Nur über
   * `design.bauablaufKennwerteSetzen` gesetzt. */
  bauablaufKennwerte: BauablaufKennwerte;
  /** Aktive Zonenregel (V2-Vorform V1): speist Δ-Max, Höhen-/Geschoss-Checks. */
  zonenRegel: ZonenRegel | null;
  /** Raumtyp-Regeln (V2-F3, Finch Graph-Rules): leer = eingebaute Richtwerte. */
  raumRegeln: RaumRegel[];
  /** Custom-Kennzahlen (V2-F9): Wert × Flächenbasis, z.B. CHF/m² aGF. */
  kennzahlFormeln: KennzahlFormel[];
  /** Zonen-Vorlagen (V2-F7): Layouts, achsweise streckbar wieder absetzbar. */
  vorlagen: ZonenVorlage[];
  /** Projektstandort CH (V2-V4): einmal geholt, im Doc = offline verfügbar. */
  standort: ProjektStandort | null;
  /** Fassadenmodule (Modul-Editor): gezeichnete Module für die Rasterung. */
  fassadenModule: FassadenModul[];
  /** Parzellenfläche in m² (für AZ → zulässige aGF). */
  parzellenFlaeche: number | null;
  /** Rollen-Vorstufe (Vision D2): ordnet die Zentrale und färbt Kosmos Blick.
   * Bewusst KEINE Rechteverwaltung — Ansichts-Filter, mehr nicht. */
  rolle: 'entwurf' | 'ausfuehrung' | 'admin' | null;
  /** Verschneidungsprioritäten-Overrides je Material (RE-ARCHICAD A1,
   * 0–999); fehlend = Katalog-Default aus MATERIAL_PRIORITAET. */
  materialPrioritaeten?: Record<string, number>;
  /** Publikations-Sets (RE-ARCHICAD A4): benannte Blattauswahl + Namensregel
   * — ein Klick exportiert den ganzen Plansatz («Publisher ohne Baum»). */
  publikationsSets?: PublikationsSet[];
  /** Themenpläne (RE-ARCHICAD A5, grafische Überschreibungen): Regeln
   * Kriterium→Farbe, je Blatt-Platzierung aktivierbar — Brandschutz-,
   * Schallschutz- oder Materialplan aus demselben Modell. */
  themen?: ThemenPlan[];
  /** Keynotes (RE-ARCHICAD A6): zentrale Notizliste nr→Text — Etiketten
   * verweisen mit der Nummer, die Blatt-Legende schreibt den Text aus. */
  keynotes?: { nr: string; text: string }[];
  /** Aktive Schnittlinie (H-9, v0.6.8) — null = kein Schnitt gesetzt. Nur über
   * `design.schnittSetzen` gesetzt. */
  schnitt?: SchnittSpec | null;
  /** Fassadenmodul-Zuweisung auf Wandzügen ohne Volumenkörper (H-35, v0.6.8):
   * additive Erweiterung von `design.fassadenModulZuweisen` — statt einer
   * MassBody-Kante wird die Fassadenseite eines Geschosses direkt benannt,
   * abgeleitet aus den zusammenhängenden Aussenwänden. `derive/
   * fassadenmodule.ts`s `richtungsModule()` liest BEIDE Quellen (Volumenkörper
   * UND diese Liste); der bestehende MassBody-Weg bleibt unverändert. */
  wandFassadenModule?: WandFassadenZuweisung[];
  /** Poché-Modus (v0.7.0, `docs/V070-KONZEPT.md` E2) — steuert, wie stark die
   * SIA-Phase die Grundriss-/Schnitt-Füllung bestimmt: `'phase'` (Default bei
   * Abwesenheit) lässt `phase` entscheiden (Wettbewerb/Vorprojekt = ein
   * schwarzes Poché, Bauprojekt/Baueingabe = Schichten schwarz/grau, Werkplan
   * = heutiges Material-Verhalten); `'schwarz'` erzwingt die Schwarz-Regeln
   * phasenunabhängig; `'material'` erzwingt das heutige Tint-Verhalten
   * phasenunabhängig. Duplikat-Union statt Import aus `derive/poche.ts` —
   * `model/` importiert nicht aus `derive/` (s. `SchnittSpec`-Kommentar). Nur
   * über `design.pocheModusSetzen` gesetzt. */
  pocheModus?: 'phase' | 'schwarz' | 'material';
  /** 3D-Darstellungsmodus (v0.7.0 E3) — `'auto'` (Default bei Abwesenheit)
   * löst über `siaPhase` auf: bis und mit `'bewilligung'` weiss, ab
   * `'ausschreibung'` Material. `'material'/'weiss'/'schwarz'` erzwingen den
   * jeweiligen Modus. Reine Projektsemantik (Yjs/Undo) — der Textur-Toggle
   * bleibt separat in localStorage. Auflösung: `aufgeloesteDarstellung3d()`
   * unten. Nur über `design.darstellung3dSetzen` gesetzt. */
  darstellung3d?: 'auto' | 'material' | 'weiss' | 'schwarz';
  /** H-42: Öffnungsflügel-Bogen bei parametrischen Fenstern zeichnen —
   * Default bei Abwesenheit `true` (Bestandsverhalten). `false` blendet die
   * `fenster-bogen`-Symbolik aus (Owner-Schalter im Projekt-Menü). Nur über
   * `design.fensterBoegenSetzen` gesetzt. */
  fensterBoegen?: boolean;
}

/** Auflösung von `darstellung3d: 'auto'` (v0.7.0 E3) — pure Funktion, testbar
 * ohne Viewport3D. Bis und mit `'bewilligung'` (Wettbewerb…Baueingabe) gilt
 * das Weissmodell als Phasen-Default, ab `'ausschreibung'` Material. */
export function aufgeloesteDarstellung3d(settings: DocSettings): 'material' | 'weiss' | 'schwarz' {
  const modus = settings.darstellung3d ?? 'auto';
  if (modus !== 'auto') return modus;
  const fruehePhasen: SiaPhase[] = ['wettbewerb', 'vorprojekt', 'bauprojekt', 'bewilligung'];
  return fruehePhasen.includes(settings.siaPhase) ? 'weiss' : 'material';
}

/** Eine Fassadenseiten-Zuweisung im wand-basierten Baupfad (H-35, v0.6.8).
 * `richtung` dupliziert absichtlich `Fassadenrichtung` aus `derive/
 * fassadenmodule.ts` statt sie zu importieren — `model/` importiert nicht aus
 * `derive/` (siehe `SchnittSpec`-Kommentar). */
export interface WandFassadenZuweisung {
  storeyId: string;
  richtung: 'sued' | 'nord' | 'west' | 'ost';
  modul: string;
}

/** Eine Override-Regel: WAS wird WIE getönt (erste Treffer-Regel gewinnt). */
export interface ThemenRegel {
  /** raumTyp (Zonen), material (Schichten/Stützen) oder klasse (Plan-Klasse
   * wie «treppe», «decke», «stuetze»). */
  kriterium: 'raumTyp' | 'material' | 'klasse';
  wert: string;
  /** Füllfarbe (Hex), im Druck solid mit erhaltenem Stift. */
  farbe: string;
  /** Legenden-Text; fehlt = wert. */
  label?: string;
}

/** Benannter Themenplan (RE-ARCHICAD A5). */
export interface ThemenPlan {
  name: string;
  regeln: ThemenRegel[];
}

/** Benanntes Export-Set (RE-ARCHICAD A4). namensregel-Platzhalter:
 * {nr} (2-stellig), {blatt}, {projekt}, {massstab} (1-50), {format} (A1-quer). */
export interface PublikationsSet {
  name: string;
  sheetIds: string[];
  namensregel?: string;
}

/** Fassadenmodul (Modul-Editor, vorform-Kern): Elemente in Modul-Koordinaten. */
export interface FassadenModul {
  name: string;
  /** Modulmass b × h (mm). */
  breite: number;
  hoehe: number;
  elemente: ModulElement[];
}

export interface ModulElement {
  /** Rechteck in Modul-Koordinaten (mm, Ursprung unten links). */
  x: number;
  y: number;
  b: number;
  h: number;
  typ: 'fenster' | 'paneel';
}

/** Projektstandort (V2-V4): WGS84 für die Sonne, LV95 fürs Vermessen. */
export interface ProjektStandort {
  label: string;
  lat: number;
  lon: number;
  /** LV95 Ost/Nord (m). */
  e: number;
  n: number;
  /** Absolutbezug ±0.00 in m ü.M. (B2: erscheint an der EG-Kote). */
  hoeheM?: number;
}

/** Zonen-Vorlage (V2-F7): Zonen relativ zur BBox-Ecke, Grösse fürs Strecken. */
export interface ZonenVorlage {
  name: string;
  /** BBox der Vorlage (mm) — Referenz für den achsweisen Stretch. */
  breite: number;
  hoehe: number;
  zonen: {
    outline: { x: number; y: number }[];
    name: string;
    sia: string;
    raumTyp?: string;
  }[];
  /** Möbel relativ zur BBox-Ecke (beim Speichern in der BBox eingesammelt). */
  moebel?: { typ: string; at: { x: number; y: number }; rotationGrad: number }[];
  /** Zonentüren relativ zur BBox-Ecke (Review-Fix 8). */
  tueren?: { at: { x: number; y: number }; breite: number }[];
}

/** Custom-Kennzahl (V2-F9): name = «Erstellungskosten», wert 3200, basis 'agf', einheit 'CHF'. */
export interface KennzahlFormel {
  name: string;
  /** Multiplikator pro m² der Basis. */
  wert: number;
  basis: 'gf' | 'agf' | 'hnf' | 'ngf';
  /** Ergebnis-Einheit, z.B. «CHF» oder «kg CO2e». */
  einheit: string;
}

/** Raumtyp-Regel (V2-F3): Grenzwerte je Raumtyp, dreistufig gemeldet. */
export interface RaumRegel {
  raumTyp: string;
  /** Mindestfläche m²; null = keine. */
  minFlaeche: number | null;
  /** Mindest-Lichtbreite mm (BBox-Näherung); null = keine. */
  minBreite: number | null;
  /** Raum braucht ein Fenster (Tageslicht). */
  tageslicht: boolean;
}

/** Schnittlinie (H-9, v0.6.8): früher reiner UI-Laufzeit-State am Schnitt-
 * Werkzeug, jetzt über `design.schnittSetzen` im Doc — damit gelten Undo,
 * Yjs-Sync und Kosmo-Tool automatisch wie bei jedem anderen Command. Die
 * Geometrie deckt sich absichtlich mit `derive/section.ts`s `SectionSpec`
 * (a/b/depth/lookLeft), ist hier aber unabhängig definiert, damit `model/`
 * nicht von `derive/` importiert. */
export interface SchnittSpec {
  a: Pt;
  b: Pt;
  /** Sichttiefe in mm (wie weit hinter der Ebene projiziert wird). */
  depth: number;
  /** Blick zur linken Normalen (true) oder rechten (false). */
  lookLeft: boolean;
}

/** CH-Zonenregel — Richtwerte je Bauzone, editierbar; kein Ersatz fürs Baureglement. */
export interface ZonenRegel {
  name: string;
  /** Ausnützungsziffer aGF/Parzellenfläche; null = keine. */
  az: number | null;
  /** Max. Gebäudehöhe über Projektnull (mm). */
  maxHoehe: number | null;
  maxVollgeschosse: number | null;
  grenzabstandKlein: number | null;
  grenzabstandGross: number | null;
}

export const defaultSettings: DocSettings = {
  projectName: 'Unbenannt',
  agfFactor: 1.28,
  facadeFactor: 1.1,
  programmFaktor: 1.22,
  maxAgf: null,
  raumprogramm: [],
  dossier: [],
  // Grundriss-Default = Bestandsverhalten; Koten an (Schnitt/Ansicht gewinnen)
  bemassung: { aussenKetten: 'beide', innenKetten: false, hoehenKoten: true },
  // Default = volle Detaillierung (Bestandsverhalten); Vorprojekt reduziert
  phase: 'werkplan',
  // Default = Beginn des SIA-Zyklus (neues Projekt startet im Wettbewerb).
  siaPhase: 'wettbewerb',
  kvKennwerte: { ...defaultKvKennwerte },
  bauablaufKennwerte: { ...defaultBauablaufKennwerte },
  zonenRegel: null,
  parzellenFlaeche: null,
  raumRegeln: [],
  kennzahlFormeln: [],
  vorlagen: [],
  standort: null,
  fassadenModule: [],
  rolle: null,
};

export interface Patch {
  readonly id: string;
  readonly before: Entity | null;
  readonly after: Entity | null;
}

export interface SettingsPatch {
  readonly settings: true;
  readonly before: Partial<DocSettings>;
  readonly after: Partial<DocSettings>;
}

export type AnyPatch = Patch | SettingsPatch;

export function isSettingsPatch(p: AnyPatch): p is SettingsPatch {
  return 'settings' in p;
}

export function invertPatches(patches: readonly AnyPatch[]): AnyPatch[] {
  return [...patches]
    .reverse()
    .map((p) =>
      isSettingsPatch(p)
        ? { settings: true as const, before: p.after, after: p.before }
        : { id: p.id, before: p.after, after: p.before },
    );
}

export class KosmoDoc {
  readonly entities = new Map<string, Entity>();
  settings: DocSettings = { ...defaultSettings };
  /** Monoton steigende Revisionsnummer — Cache-Invalidierung der Derive-Stufe. */
  revision = 0;

  get<T extends Entity = Entity>(id: string): T | undefined {
    return this.entities.get(id) as T | undefined;
  }

  byKind<T extends Entity>(kind: T['kind']): T[] {
    const out: T[] = [];
    for (const e of this.entities.values()) if (e.kind === kind) out.push(e as T);
    return out;
  }

  inStorey(storeyId: string): Entity[] {
    const out: Entity[] = [];
    for (const e of this.entities.values()) {
      if ('storeyId' in e && e.storeyId === storeyId) out.push(e);
    }
    return out;
  }

  openingsOf(wallId: string) {
    const out = [];
    for (const e of this.entities.values()) {
      if (e.kind === 'opening' && e.wallId === wallId) out.push(e);
    }
    return out;
  }

  storeysOrdered() {
    return this.byKind<import('./entities').Storey>('storey').sort((a, b) => a.index - b.index);
  }

  /** Oberkante eines Geschosses = elevation + height (für Wandhöhen 'geschoss'). */
  storeyTop(storeyId: string): Mm | undefined {
    const s = this.get<import('./entities').Storey>(storeyId);
    return s ? s.elevation + s.height : undefined;
  }

  apply(patches: readonly AnyPatch[]): void {
    for (const p of patches) {
      if (isSettingsPatch(p)) {
        this.settings = { ...this.settings, ...p.after };
      } else if (p.after === null) {
        this.entities.delete(p.id);
      } else {
        this.entities.set(p.id, p.after);
      }
    }
    this.revision++;
  }

  toJSON(): DocJson {
    return {
      schema: 'kosmo.model/v1',
      settings: this.settings,
      entities: [...this.entities.values()],
    };
  }

  static fromJSON(json: DocJson): KosmoDoc {
    const doc = new KosmoDoc();
    doc.settings = { ...defaultSettings, ...json.settings };
    for (const e of json.entities) doc.entities.set(e.id, e);
    return doc;
  }
}

export interface DocJson {
  schema: 'kosmo.model/v1';
  settings: DocSettings;
  entities: Entity[];
}
