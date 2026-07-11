import { empfohlenePlanPhase, type BauPhase, type SiaPhase, type UmbauFilter } from '@kosmo/kernel';

/**
 * A8 (Owner-Befund K18, wörtlich: «Bauphasen-Kopplung: Tools/Icons/Fähigkeiten
 * je Bauphase; ausdefinierte Presets je Phase … aber Kosmo-automatisiert»).
 *
 * Reine Datentabelle — kein React, kein Store, keine Kernel-Mutation. Jede
 * der 7 SIA-Teilphasen (`doc.settings.siaPhase`, `model/doc.ts`) bekommt ein
 * kuratiertes Preset: welche der sechs Fähigkeits-Icons (A7,
 * `DesignWorkspace.tsx`) in dieser Phase «im Fokus» stehen sollen. Der Rest
 * wird NICHT entfernt — er dämpft nur optisch (`opazitaetsWert`, derselbe
 * numerische Opazitäts-Mechanismus wie die bestehende Top-Nutzer-Hebung in
 * `state/oberflaeche-adaption(-kern).ts`), Understatement statt Zwang.
 *
 * **Laufzeit ≠ Modell**: ein angewendetes Preset ist reiner UI-Zustand (welche
 * Icons optisch betont sind) — es schreibt NIE ins Doc, braucht keinen
 * Kernel-Command, geht nicht durch Undo/Yjs. Die einzige Doc-Grösse, die
 * ohnehin schon existiert (`doc.settings.siaPhase`), ändert sich weiterhin
 * ausschliesslich über `design.siaPhaseSetzen` (unverändert) — dieses Modul
 * LIEST `SiaPhase` nur, um das passende Preset nachzuschlagen.
 *
 * **Kein Normersatz durch Doppelquelle**: der empfohlene Plan-Detaillierungsgrad
 * wird NICHT hier noch einmal als Tabellenwert gepflegt — `empfohlenePlanPhaseFuer`
 * ruft ausschliesslich die bestehende Kernel-Funktion `empfohlenePlanPhase`
 * durch (Owner-Auftrag: «nur Anzeige, empfohlenePlanPhase existiert»). Eine
 * zweite, von Hand gepflegte Zuordnung könnte auseinanderlaufen — diese hier
 * kann es strukturell nicht.
 *
 * **Umbau-Filter-Empfehlung**: `umbauFilterDefault` ist NUR für die drei
 * Phasen gesetzt, in denen die Bestand/Abbruch/Neu-Unterscheidung
 * (`derive/umbau.ts`, RE-ARCHICAD A2) in der Praxis bereits eine Rolle
 * spielt — Baugesuch (zeigt der Behörde meist den Neubau-Zustand),
 * Ausschreibung (Abbruch- und Neubau-Unternehmer erhalten meist getrennte
 * Planläufe, Abbruch zuerst) und Ausführung (Baustellenpläne zeigen den
 * Neubau). Wettbewerb/Vorprojekt/Bauprojekt sind zu früh für eine sinnvolle
 * Vorauswahl (die Umbau-Entscheidung ist oft noch offen), Abnahme braucht
 * sie praktisch nicht mehr (das Gebäude steht) — dort bleibt das Feld bewusst
 * leer, KEIN erfundener Wert. Rein informativ: es setzt nichts in
 * `SheetPlacement.umbau` (das bleibt Owner-Entscheid je Blatt in KosmoPublish,
 * `commands/publish.ts`), es taucht nur im Angebotstext auf.
 */

/** Die sechs Fähigkeits-Icons der neuen Werkzeugleisten-Gruppe (A7). */
export type FaehigkeitId = 'sonne' | 'volumenstudien' | 'kv' | 'bauablauf' | 'maengel' | 'submission';

export const ALLE_FAEHIGKEITEN: readonly FaehigkeitId[] = [
  'sonne',
  'volumenstudien',
  'kv',
  'bauablauf',
  'maengel',
  'submission',
];

/** Deutsches Kurzlabel je Fähigkeit — für den Angebotstext der Phasen-Presets. */
export const FAEHIGKEIT_LABEL: Record<FaehigkeitId, string> = {
  sonne: 'Sonnenstudie',
  volumenstudien: 'Volumenstudien',
  kv: 'KV',
  bauablauf: 'Bauablauf',
  maengel: 'Mängel',
  submission: 'Submissions-Check',
};

export interface PhasenPreset {
  readonly phase: SiaPhase;
  /** Fähigkeits-Icons, die in dieser Phase im Vordergrund stehen sollen. */
  readonly imFokus: readonly FaehigkeitId[];
  /** Nur Anzeige (s. Kommentar oben) — kein Schreibzugriff auf `SheetPlacement.umbau`. */
  readonly umbauFilterDefault?: UmbauFilter;
}

function preset(phase: SiaPhase, imFokus: readonly FaehigkeitId[], umbauFilterDefault?: UmbauFilter): PhasenPreset {
  return { phase, imFokus, ...(umbauFilterDefault ? { umbauFilterDefault } : {}) };
}

/**
 * Je SIA-Teilphase EIN Preset (Owner-Auftrag: «ausdefinierte Presets je
 * Phase»). Reihenfolge folgt dem SIA-102/112-Zyklus (`SiaPhase`-Definition
 * in `model/doc.ts`).
 */
export const PHASEN_PRESETS: Record<SiaPhase, PhasenPreset> = {
  // Strategische Planung (SIA 112 Ph. 1, additiv v0.7.2): laut
  // `V072-VISUELLES-UPDATE-SPEZ.md` §4 (BASE-Zeile 1) ist diese Phase
  // prepare/data/chat-lastig — reine Grundlagen-/Bedarfsklärung, noch VOR
  // dem eigentlichen Wettbewerb. Keine der sechs Fähigkeits-Icons deckt
  // "Grundlagen/Wissen sammeln" direkt ab (das ist KosmoPrepare/KosmoData/
  // Kosmo-Speak, ausserhalb dieser Design-Werkzeugleisten-Gruppe) — die
  // einzige der sechs, die schon VOR einem echten Wettbewerbsbeitrag
  // sinnvoll ist, ist eine erste, grobe Machbarkeits-Massenstudie (dieselbe
  // Fähigkeit, die auch 'wettbewerb' im Fokus hat — hier nur sie allein,
  // ohne die Besonnung, die einen konkreteren Baukörper voraussetzt).
  strategie: preset('strategie', ['volumenstudien']),
  // Wettbewerb/Studie (SIA 4.22): Massenstudien + Besonnungsnachweis sind die
  // beiden Entscheidungsgrundlagen eines Wettbewerbsbeitrags.
  wettbewerb: preset('wettbewerb', ['volumenstudien', 'sonne']),
  // Vorprojekt (SIA 31): Varianten laufen weiter, dazu eine erste
  // KV-Grobschätzung (Owner-Praxis: Kostendach früh abstecken).
  vorprojekt: preset('vorprojekt', ['volumenstudien', 'sonne', 'kv']),
  // Bauprojekt (SIA 32): Kosten verfeinern sich, der 2h-Besonnungsnachweis
  // wird verbindlicher, ein grober Bauablauf entsteht erstmals.
  bauprojekt: preset('bauprojekt', ['kv', 'sonne', 'bauablauf']),
  // Bewilligungsverfahren (SIA 33, Baugesuch): KV und Besonnung sind typische
  // Beilagen; die Behörde sieht i.d.R. den Neubau-Zustand.
  bewilligung: preset('bewilligung', ['kv', 'sonne'], 'neu'),
  // Ausschreibung (SIA 41): der Submissions-Check IST die Fähigkeit dieser
  // Phase (Lückenliste vor dem Versand), KV/Bauablauf begleiten die Vergabe;
  // Abbruch-Planläufe gehen meist zuerst raus.
  ausschreibung: preset('ausschreibung', ['submission', 'kv', 'bauablauf'], 'abbruch'),
  // Ausführungsprojekt/Ausführung (SIA 51/52): der Bauablauf ist jetzt aktiv
  // in Betrieb, KV bleibt zur Kostenkontrolle; Baustellenpläne zeigen Neubau.
  ausfuehrung: preset('ausfuehrung', ['bauablauf', 'kv'], 'neu'),
  // Gebäudeabnahme: die Mängelliste ist das einzige noch relevante Werkzeug.
  abnahme: preset('abnahme', ['maengel']),
};

export function phasenPresetFuer(phase: SiaPhase): PhasenPreset {
  return PHASEN_PRESETS[phase];
}

/** Reiner Durchreicher zur Kernel-Funktion (s. Kommentar oben) — kein
 *  zweiter, von Hand gepflegter Wert, der auseinanderlaufen könnte. */
export function empfohlenePlanPhaseFuer(phase: SiaPhase): BauPhase {
  return empfohlenePlanPhase(phase);
}
