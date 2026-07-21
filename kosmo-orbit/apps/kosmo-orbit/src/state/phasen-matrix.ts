import type { SiaPhase } from '@kosmo/kernel';
import { ALLE_TOOL_IDS, type ToolId as StationToolId } from './orbit-rang';

/**
 * V0812-SPEZ E-M «Phasen-Matrix deklarativ» (P-M) — deklaratives Register:
 * welches Werkzeug ist in welcher SIA-Teilphase überhaupt sichtbar. Owner-
 * Entscheid «Matrix zuerst» (K29/K5, `docs/KONZEPT-PHASEN-PREPARE-DATA.md`
 * TEIL 1, 27 Werkzeuge × 5 SIA-112-Gruppen). Reine Datentabelle, kein
 * React/DOM/Doc — analog `orbit-rang.ts`s BASE-Matrix und
 * `oberflaeche-adaption-data.ts` (Kopfkommentar dort).
 *
 * **Zwei-Zustands-Vereinfachung (Owner/Spec-Entscheid, NICHT das Konzept-
 * Dreier-Schema):** das Konzeptdokument kennt DREI Zellen-Zustände
 * (● aktiv / ◐ gedimmt+Tooltip / — aus). Diese Etappe (V0812-SPEZ E-M)
 * verlangt ausdrücklich BINÄRE, HARTE Ausblendung («kein Dimmen») — darum
 * bildet `PHASEN_MATRIX` nur `sichtbar: SiaPhase[]`: ● UND ◐ werden beide
 * zu `sichtbar`, NUR — wird zu «nicht sichtbar» (hart aus dem Rendering
 * entfernt). Damit fallen die 13 vom Konzept vorgeschlagenen «aus»-Zellen
 * automatisch heraus, OHNE dass die Owner-Bestätigung R7 (Konzeptdokument
 * Schluss-Abschnitt) je Werkzeug einzeln geklärt sein müsste — R7 selbst
 * bleibt offen (das sanftere «gedimmt statt aus» aus dem Konzept-Default ist
 * in dieser Etappe technisch nicht verfügbar, s. Bauagenten-Bericht).
 *
 * **Werkzeug-Ids-Domäne (`WerkzeugId`) — bewusst 19 statt 27:** die Spec
 * verlangt die Domäne aus `state/orbit-rang.ts`s `ALLE_TOOL_IDS` (die 8
 * Canvas-Stationen) PLUS «Insel-Werkzeug-Ids». Von den 27 Konzept-Zeilen
 * haben nur 11 HEUTE eine echte, code-belegte Insel-Id: die ZEICHNEN-Insel
 * (`island-katalog.ts`s `ZEICHNEN`-Array — Auswahl/Wand/Öffnung/Volumen/
 * Zone/Dach/Treppe/Stütze/Skizze/Mesh/Messen). Die übrigen 16 Konzept-
 * Zeilen (Schnitt/Ansicht, Kommentar, Decke, Träger, Fassade, Achsraster,
 * Aussparung, Möbel, Masskette, Etikett, Geschoss, Baugrenze/Parzelle/
 * Standort, Mangel, Renovation-Status, Text/Bild-Publish, Kamera-Vis) sind
 * im Konzept explizit «über Command/Panel/Kosmo-Weg» geführt (§1.2) — KEINE
 * davon hat heute eine eigene Insel-/ToolId irgendwo im Code (geprüft gegen
 * `ui-zustand.ts`s `ToolId`-Union UND alle vier design-Inseln UND
 * vis-/publish-/prepare-Insel-Kataloge). Sie hier trotzdem als erfundene
 * String-Ids ins Register aufzunehmen, wäre genau die Attrappe, die die
 * Repo-Ehrlichkeitsregel ausschliesst (kein Werkzeug-Eintrag ohne echten
 * Konsum-Ort). Sie bleiben darum ausserhalb dieser Etappe — Konzept-Etappe M
 * («Matrix auf alle vier design-Inseln») bzw. L (vis/publish/prepare) ist
 * der vorgesehene Ort, an dem sie mit ihrer künftigen echten Insel-Id
 * eingetragen werden («künftige Werkzeuge werden bei Geburt eingetragen»,
 * Konzept §1.2). Die 8 Stations-Ids selbst trägt das Konzept NICHT als
 * eigene Zeilen (es beschreibt WERKZEUGE innerhalb einer Station, nicht
 * Stationen selbst) — sie sind hier darum durchgehend `sichtbar` in allen 8
 * `SiaPhase`-Werten (eine Station wie «Data»/«Publish» wird nie ganz
 * gesperrt, nur einzelne Werkzeuge DARIN).
 *
 * **R7 (Konzept-Schluss):** die 13 Owner-noch-nicht-bestätigten «aus»-
 * Zellen betreffen 8 Werkzeuge; aus dieser 19er-Domäne sind nur zwei davon
 * betroffen — Volumen und Mesh (Kommentar je Eintrag unten). Die übrigen
 * sechs (Träger, Fassade, Aussparung, Masskette, Etikett, Mangel) liegen in
 * den 16 nicht-konsumierten Konzept-Zeilen (s.o.).
 *
 * **R12 (Konzept-Schluss, Werkzeug-TIEFE):** betrifft NICHT die Sichtbarkeit
 * dieser Matrix, sondern eine zweite, hier nicht gebaute Ebene (Detail-
 * Sektionen der Stütze erst ab Baueingabe/Realisierung, Etappe L) — s.
 * Kommentar bei `stuetze` unten.
 * **R8/R9/R10/R11** betreffen keinen Werkzeug-Sichtbarkeits-Fall dieser
 * Datei (Kopfzeilen-Chip / Transformieren-Dialog / Prepare-Bühne /
 * KosmoData-Reihenfolge) — kein `// Rn-offen`-Marker fällt hier an.
 *
 * **Konsum:** `shell/BodenDock.tsx` (die 8 Stations-Ids — s.o. praktisch ein
 * No-op, aber wörtlich verdrahtet) und `modules/design/island/IslandShell.tsx`
 * (die ZEICHNEN-Insel-Leiste — ECHTE harte Ausblendung für Volumen/Mesh ab
 * Ausschreibung). `werkzeugInPhaseSichtbar()` ist defensiv: eine unbekannte
 * Id (jede andere Insel/Station ausserhalb dieser 19) bleibt `sichtbar`,
 * damit dieselbe Konsum-Stelle (`IslandShell.tsx` ist stationsübergreifend
 * geteilte Infrastruktur, s. dortiger Kopfkommentar) keine fremde Insel
 * (ANSICHT/PROJEKT/AUSTAUSCH, vis/publish/prepare) versehentlich beschneidet.
 */

/** Die 11 ZEICHNEN-Insel-Ids (`island-katalog.ts`s `ZEICHNEN`-Array,
 *  wörtlich in derselben Reihenfolge) — einzige Insel-Quelle dieser Etappe. */
export type ZeichnenWerkzeugId =
  | 'auswahl'
  | 'wand'
  | 'oeffnung'
  | 'volumen'
  | 'zone'
  | 'dach'
  | 'treppe'
  | 'stuetze'
  | 'skizze'
  | 'mesh'
  | 'messen';

export const ZEICHNEN_WERKZEUG_IDS: readonly ZeichnenWerkzeugId[] = [
  'auswahl',
  'wand',
  'oeffnung',
  'volumen',
  'zone',
  'dach',
  'treppe',
  'stuetze',
  'skizze',
  'mesh',
  'messen',
];

/** Domäne dieses Registers: 8 Stations-Ids (`orbit-rang.ts`) + 11
 *  ZEICHNEN-Insel-Ids — s. Kopfkommentar «bewusst 19 statt 27». */
export type WerkzeugId = StationToolId | ZeichnenWerkzeugId;

export const ALLE_WERKZEUG_IDS: readonly WerkzeugId[] = [...ALLE_TOOL_IDS, ...ZEICHNEN_WERKZEUG_IDS];

// ---------------------------------------------------------------------------
// SIA-112-Gruppen → die darunterliegenden `SiaPhase`-Werte (dieselbe 5↔8-
// Abbildung wie `orbit-rang.ts`s `sia112Gruppe()`, hier als Konstanten
// ausgeschrieben statt der Funktion invers zu entfalten — die Konzept-
// Tabelle selbst ist gruppenweise (1..5) aufgebaut, das Register braucht die
// Auflösung auf die 8 realen Werte).
// ---------------------------------------------------------------------------
const GRUPPE_1_STRATEGIE: readonly SiaPhase[] = ['strategie'];
const GRUPPE_2_VORSTUDIE: readonly SiaPhase[] = ['wettbewerb'];
const GRUPPE_3_PROJEKTIERUNG: readonly SiaPhase[] = ['vorprojekt', 'bauprojekt', 'bewilligung'];
const GRUPPE_4_AUSSCHREIBUNG: readonly SiaPhase[] = ['ausschreibung'];
const GRUPPE_5_REALISIERUNG: readonly SiaPhase[] = ['ausfuehrung', 'abnahme'];

/** Alle 8 `SiaPhase`-Werte — Kurzform für «in jeder Phase sichtbar». */
const ALLE_PHASEN: readonly SiaPhase[] = [
  ...GRUPPE_1_STRATEGIE,
  ...GRUPPE_2_VORSTUDIE,
  ...GRUPPE_3_PROJEKTIERUNG,
  ...GRUPPE_4_AUSSCHREIBUNG,
  ...GRUPPE_5_REALISIERUNG,
];

/** Eine Matrix-Zeile: in welchen `SiaPhase`-Werten das Werkzeug sichtbar ist. */
export interface PhasenEintrag {
  readonly sichtbar: SiaPhase[];
}

/**
 * PHASEN_MATRIX — Zellen-Belegung wörtlich aus
 * `docs/KONZEPT-PHASEN-PREPARE-DATA.md` §1.2-Tabelle (● UND ◐ → sichtbar,
 * — → nicht sichtbar, s. Kopfkommentar «Zwei-Zustands-Vereinfachung»).
 */
export const PHASEN_MATRIX: Record<WerkzeugId, PhasenEintrag> = {
  // ---- 8 Stations-Ids (orbit-rang.ts ALLE_TOOL_IDS) — Konzept beschreibt
  // keine Stations-Zeilen, jede Station bleibt in jeder Phase erreichbar. ----
  prepare: { sichtbar: [...ALLE_PHASEN] },
  data: { sichtbar: [...ALLE_PHASEN] },
  chat: { sichtbar: [...ALLE_PHASEN] },
  publish: { sichtbar: [...ALLE_PHASEN] },
  pipeline: { sichtbar: [...ALLE_PHASEN] },
  draw: { sichtbar: [...ALLE_PHASEN] },
  connect: { sichtbar: [...ALLE_PHASEN] },
  viz: { sichtbar: [...ALLE_PHASEN] },

  // ---- 11 ZEICHNEN-Insel-Ids — Konzept §1.2-Tabelle ----------------------
  // «Selektion/Eigenschaften braucht jede Phase — nie einschränken.»
  auswahl: { sichtbar: [...ALLE_PHASEN] },
  // «In der Strategie gibt es noch keine Bauteile... ab Wettbewerb
  // Kernwerkzeug... in der Ausschreibung eingefroren (gedimmt)» — KEINE
  // «aus»-Zelle bei Wand, bleibt in allen 8 Phasen sichtbar.
  wand: { sichtbar: [...ALLE_PHASEN] },
  // «Wie Wand; Fensterteilung ab Wettbewerb Entwurfsthema.»
  oeffnung: { sichtbar: [...ALLE_PHASEN] },
  // R7 (Konzept-Schluss, DAS Owner-Beispiel aus K29): Baukörper ist ab
  // Baueingabe/Ausschreibung «konzeptionell schon definiert» → aus. Bis R7
  // beantwortet ist, gilt hier hart NICHT sichtbar (Zwei-Zustands-Regel
  // dieser Etappe, s. Kopfkommentar) — Ausschreibung + Realisierung fallen
  // heraus.
  volumen: { sichtbar: [...GRUPPE_1_STRATEGIE, ...GRUPPE_2_VORSTUDIE, ...GRUPPE_3_PROJEKTIERUNG] },
  // «Raumprogramm beginnt in der Strategie; ab Ausschreibung fix, Zonen-
  // AUSWERTUNG bleibt lesbar» — keine «aus»-Zelle, bleibt sichtbar.
  zone: { sichtbar: [...ALLE_PHASEN] },
  // «Dachform ist Wettbewerbs-/Projektierungsthema; Werkplanung detailliert
  // erneut» — keine «aus»-Zelle.
  dach: { sichtbar: [...ALLE_PHASEN] },
  // «Erschliessung/Fluchtwege ab Wettbewerb zwingend; Werkplanung braucht
  // die Treppe wieder voll» — keine «aus»-Zelle.
  treppe: { sichtbar: [...ALLE_PHASEN] },
  // «Tragraster ab Vorstudie» — keine «aus»-Zelle in DIESER (Sichtbarkeits-)
  // Ebene. R12 (Konzept-Schluss): die zweite Ebene «Werkzeug-TIEFE»
  // (Grundriss-Schnittdetail/Profil-Manager erst ab Baueingabe/Realisierung,
  // K30a/b) ist Konzept-Etappe L und wird von DIESEM binären Register nicht
  // abgebildet — bewusst kein `// R12-offen`-Marker AN einer Sichtbarkeits-
  // Zelle, weil R12 keine Zelle dieser Matrix betrifft, sondern eine hier
  // nicht existierende dritte Dimension.
  stuetze: { sichtbar: [...ALLE_PHASEN] },
  // «Skizzieren gehört den frühen Phasen... K25 bleibt unberührt» — keine
  // «aus»-Zelle (nur der Insel-Platz tritt zurück, das ist Dimmen — hier
  // nicht abgebildet).
  skizze: { sichtbar: [...ALLE_PHASEN] },
  // R7 (Konzept-Schluss): «Terrain/Standortkörper... ab Bewilligung ist das
  // Gelände festgeschrieben» → Ausschreibung «aus», Realisierung wieder
  // gedimmt (hier: sichtbar, da kein Dimmen in dieser Etappe existiert).
  mesh: {
    sichtbar: [
      ...GRUPPE_1_STRATEGIE,
      ...GRUPPE_2_VORSTUDIE,
      ...GRUPPE_3_PROJEKTIERUNG,
      ...GRUPPE_5_REALISIERUNG,
    ],
  },
  // «Nachmessen ist phasenlos.»
  messen: { sichtbar: [...ALLE_PHASEN] },
};

/**
 * Ist `werkzeugId` in `phase` sichtbar? Defensiv `true` für JEDE Id
 * ausserhalb der 19er-Domäne (s. Kopfkommentar) — Konsum-Stellen, die auch
 * fremde Inseln/Stationen rendern (`IslandShell.tsx`), dürfen dadurch nichts
 * versehentlich ausblenden, das dieses Register (noch) nicht kennt.
 */
export function werkzeugInPhaseSichtbar(werkzeugId: string, phase: SiaPhase): boolean {
  const eintrag = (PHASEN_MATRIX as Record<string, PhasenEintrag>)[werkzeugId];
  if (!eintrag) return true;
  return eintrag.sichtbar.includes(phase);
}
