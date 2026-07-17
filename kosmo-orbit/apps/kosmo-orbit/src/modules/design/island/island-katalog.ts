/**
 * Island-Werkzeug-Katalog (PD1 Fundament, `docs/ISLAND-UI-SPEZ.md` §2/§3).
 *
 * Statischer, reiner Datensatz — die vollständige 29-Werkzeug-Zuordnung auf
 * die vier Islands (ZEICHNEN 11 / ANSICHT 6 / PROJEKT 6 / AUSTAUSCH 6),
 * Reihenfolge und Zählung 1:1 aus der Mapping-Tabelle §3.1–§3.4 übernommen.
 *
 * **PD1-Grenze (bewusst):** `toolId` ist bereits als Feld angelegt, aber in
 * PD1 bei KEINEM Eintrag gesetzt — die echte `ToolId`-/Command-Verdrahtung
 * (§3-Fundstellen, z. B. `ui-zustand.ts`s `ToolId 'wand'`) ist PD2-Scope
 * (`docs/ISLAND-UI-SPEZ.md` §7, PD2-Zeile). `glyphe` ist ein reiner
 * Text-Platzhalter (zweistellige Mono-Kürzel) — echte Symbole/Inline-SVG
 * sind ein späterer Politur-Schritt (PD3/PD4), keine Blockade fürs
 * Fundament.
 *
 * `hatPopup` bildet den Prototyp-Datensatz `t.pop` nach (§4.2: «Werkzeuge
 * ohne Popup quittieren die Aktivierung mit einem Toast») — `false` NUR dort,
 * wo §4.4 wörtlich «kein Popup nötig» vermerkt (Achsen: reiner Toggle;
 * Manuell: Sofort-Umschaltung ohne Popup). Alle übrigen 27 Werkzeuge bekommen
 * `true`, auch wenn ihr Stufe-2-Inhalt laut §4.4 schlicht ist (z. B. Graph
 * «An/Aus») — die Spec markiert dort kein «kein Popup nötig», anders als bei
 * Achsen.
 */

export type IslandId = 'zeichnen' | 'ansicht' | 'projekt' | 'austausch';

/** Reihenfolge der vier Islands (Bühnenordnung §1/§2: links·oben·rechts·unten). */
export const ISLAND_REIHENFOLGE: readonly IslandId[] = ['zeichnen', 'ansicht', 'projekt', 'austausch'];

export const ISLAND_LABEL: Readonly<Record<IslandId, string>> = {
  zeichnen: 'ZEICHNEN',
  ansicht: 'ANSICHT',
  projekt: 'PROJEKT',
  austausch: 'AUSTAUSCH',
};

/** Pill-Orientierung je Island (§2-Tabelle: 34×104 vertikal / 104×34 horizontal). */
export type IslandOrientierung = 'vertikal' | 'horizontal';

export const ISLAND_ORIENTIERUNG: Readonly<Record<IslandId, IslandOrientierung>> = {
  zeichnen: 'vertikal',
  ansicht: 'horizontal',
  projekt: 'vertikal',
  austausch: 'horizontal',
};

export type IslandWerkzeugStatus = 'vorhanden' | 'teilweise' | 'neu';

export interface IslandWerkzeug {
  /** Kebab-Case-Id, wo möglich 1:1 aus bestehenden `ToolId`s/Command-Namen (§3-Fundstellen). */
  readonly id: string;
  /** Deutscher Anzeigename (Leiste/Popup/Fenster-Titel, Toast-Text). */
  readonly name: string;
  readonly island: IslandId;
  /** Text-Platzhalter-Glyphe (zweistelliges Mono-Kürzel) — Icon-Politur folgt PD3/PD4. */
  readonly glyphe: string;
  readonly status: IslandWerkzeugStatus;
  /** `false` nur bei den zwei §4.4-Ausnahmen (Achsen, Manuell) — s. Kopfkommentar. */
  readonly hatPopup: boolean;
  /** PD2-Feld, in PD1 bei keinem Eintrag gesetzt (noch keine Command-/ToolId-Verdrahtung). */
  readonly toolId?: string;
}

function werkzeug(
  id: string,
  name: string,
  island: IslandId,
  glyphe: string,
  status: IslandWerkzeugStatus,
  hatPopup: boolean,
): IslandWerkzeug {
  return { id, name, island, glyphe, status, hatPopup };
}

/** ZEICHNEN (11) — §3.1. */
const ZEICHNEN: readonly IslandWerkzeug[] = [
  werkzeug('auswahl', 'Auswahl', 'zeichnen', 'AU', 'vorhanden', true),
  werkzeug('wand', 'Wand', 'zeichnen', 'WA', 'vorhanden', true),
  werkzeug('oeffnung', 'Öffnung', 'zeichnen', 'OE', 'teilweise', true),
  werkzeug('volumen', 'Volumen', 'zeichnen', 'VO', 'vorhanden', true),
  werkzeug('zone', 'Zone', 'zeichnen', 'ZO', 'vorhanden', true),
  werkzeug('dach', 'Dach', 'zeichnen', 'DA', 'vorhanden', true),
  werkzeug('treppe', 'Treppe', 'zeichnen', 'TR', 'vorhanden', true),
  werkzeug('stuetze', 'Stütze', 'zeichnen', 'ST', 'vorhanden', true),
  werkzeug('skizze', 'Skizze', 'zeichnen', 'SK', 'vorhanden', true),
  werkzeug('mesh', 'Mesh', 'zeichnen', 'ME', 'vorhanden', true),
  werkzeug('messen', 'Messen', 'zeichnen', 'MS', 'neu', true),
];

/** ANSICHT (6) — §3.2. */
const ANSICHT: readonly IslandWerkzeug[] = [
  werkzeug('darstellung', 'Darstellung', 'ansicht', 'DS', 'vorhanden', true),
  werkzeug('sonne', 'Sonne', 'ansicht', 'SO', 'vorhanden', true),
  werkzeug('ebenen', 'Ebenen', 'ansicht', 'EB', 'teilweise', true),
  werkzeug('achsen', 'Achsen', 'ansicht', 'AC', 'vorhanden', false),
  werkzeug('trace', 'Trace', 'ansicht', 'TC', 'vorhanden', true),
  werkzeug('graph', 'Graph', 'ansicht', 'GR', 'vorhanden', true),
];

/** PROJEKT (6) — §3.3. */
const PROJEKT: readonly IslandWerkzeug[] = [
  werkzeug('kennzahlen', 'Kennzahlen', 'projekt', 'KZ', 'vorhanden', true),
  werkzeug('checks', 'Checks', 'projekt', 'CH', 'vorhanden', true),
  werkzeug('varianten', 'Varianten', 'projekt', 'VA', 'vorhanden', true),
  werkzeug('phase', 'Phase', 'projekt', 'PH', 'vorhanden', true),
  werkzeug('liste', 'Liste', 'projekt', 'LI', 'vorhanden', true),
  werkzeug('kommentare', 'Kommentare', 'projekt', 'KO', 'neu', true),
];

/** AUSTAUSCH (6) — §3.4. */
const AUSTAUSCH: readonly IslandWerkzeug[] = [
  werkzeug('export', 'Export', 'austausch', 'EX', 'vorhanden', true),
  werkzeug('import', 'Import', 'austausch', 'IM', 'vorhanden', true),
  werkzeug('rendern', 'Rendern', 'austausch', 'RE', 'teilweise', true),
  werkzeug('blaetter', 'Blätter', 'austausch', 'BL', 'teilweise', true),
  werkzeug('sync', 'Sync', 'austausch', 'SY', 'teilweise', true),
  werkzeug('manuell', 'Manuell', 'austausch', 'MN', 'neu', false),
];

/** Gesamtkatalog, 29/29, Reihenfolge exakt §3.1→§3.4. */
export const WERKZEUG_KATALOG: readonly IslandWerkzeug[] = [...ZEICHNEN, ...ANSICHT, ...PROJEKT, ...AUSTAUSCH];

export function werkzeugeFuerIsland(island: IslandId): readonly IslandWerkzeug[] {
  return WERKZEUG_KATALOG.filter((w) => w.island === island);
}
