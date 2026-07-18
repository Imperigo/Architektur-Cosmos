/**
 * Island-Werkzeug-Katalog (PD1 Fundament + PD2 Verdrahtung, `docs/ISLAND-UI-
 * SPEZ.md` §2/§3).
 *
 * Statischer, reiner Datensatz — die vollständige 29-Werkzeug-Zuordnung auf
 * die vier Islands (ZEICHNEN 11 / ANSICHT 6 / PROJEKT 6 / AUSTAUSCH 6),
 * Reihenfolge und Zählung 1:1 aus der Mapping-Tabelle §3.1–§3.4 übernommen.
 *
 * **PD2 (diese Fassung): `toolId` echt gesetzt**, wo eine Insel-Id 1:1 einer
 * bestehenden `ui-zustand.ts`-`ToolId` entspricht (die neun Zeichenwerkzeuge
 * mit direktem `setTool`-Weg). Für die übrigen «Vorhanden»/«Teilweise»-
 * Werkzeuge, deren echte Aktion KEIN `ToolId`-Setzen ist (z. B. Sonne →
 * `sonneOffen`, Varianten → `variantenPanelOffen`), bleibt `toolId` leer —
 * ihre Verdrahtung lebt als benannter Fall in `DesignWorkspace.tsx`s
 * `aktiviereIslandWerkzeug()` (Integrationspunkt, dateidisjunkt von diesem
 * reinen Datensatz). `glyphe` ist weiterhin ein reiner Text-Platzhalter
 * (echte Symbole folgen PD3/PD4).
 *
 * **`hinweis` (PD2):** ehrlicher Kurztext fürs (weiterhin leere PD1-)
 * Popup-/Fenster-Rahmen jener Werkzeuge, die PD2 NICHT verdrahtet — die
 * echte Aktion liegt aus Datei-Kreis-Gründen anderswo (PlanView.tsx/andere
 * Station, ausserhalb PD2s Dateikreis) bzw. ist mangels Toggle (Kennzahlen/
 * Checks: «immer sichtbar», kein Flag) nicht erreichbar. Nur Werkzeuge MIT
 * Popup (`hatPopup===true`) können einen Hinweis zeigen — Achsen/Manuell
 * (die zwei `hatPopup===false`-Fälle) bleiben beim PD1-Toast.
 *
 * **v0.8.3 E1/E2/E3 (`docs/V083-SPEZ.md` §1/§2/§3.3):** die drei einstigen
 * «kein heutige Entsprechung»-Fälle (Öffnung/Messen/Kommentare, §3 Status
 * NEU/teilweise) haben jetzt echte Kernel-Entitäten+Commands UND einen
 * eigenen `ToolId` (§8-5/§8-6/§8-7 Owner-entschieden) — alle drei Zeilen
 * unten tragen seither `toolId`+`status:'vorhanden'` statt `hinweis`.
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
  /** Echte `ui-zustand.ts`-`ToolId` (PD2) — nur gesetzt, wo die Aktivierung
   *  1:1 `setTool(toolId)` ist (die neun Zeichenwerkzeuge). */
  readonly toolId?: string;
  /** PD2: ehrlicher Hinweistext fürs Popup, wenn KEINE Aktion verdrahtet ist
   *  (s. Kopfkommentar) — undefined bei allen verdrahteten Werkzeugen. */
  readonly hinweis?: string;
}

function werkzeug(
  id: string,
  name: string,
  island: IslandId,
  glyphe: string,
  status: IslandWerkzeugStatus,
  hatPopup: boolean,
  extra?: { toolId?: string; hinweis?: string },
): IslandWerkzeug {
  return {
    id,
    name,
    island,
    glyphe,
    status,
    hatPopup,
    ...(extra?.toolId !== undefined ? { toolId: extra.toolId } : {}),
    ...(extra?.hinweis !== undefined ? { hinweis: extra.hinweis } : {}),
  };
}

/** ZEICHNEN (11) — §3.1. */
const ZEICHNEN: readonly IslandWerkzeug[] = [
  werkzeug('auswahl', 'Auswahl', 'zeichnen', 'AU', 'vorhanden', true, { toolId: 'auswahl' }),
  werkzeug('wand', 'Wand', 'zeichnen', 'WA', 'vorhanden', true, { toolId: 'wand' }),
  // v0.8.3 E3 (§3.3, docs/V083-SPEZ.md, §8-5 jetzt entschieden): echter
  // ToolId statt Hinweis — `aktiviereIslandWerkzeug()` (DesignWorkspace.tsx)
  // setzt `setTool('oeffnung')` automatisch (`w.toolId`-Zweig).
  werkzeug('oeffnung', 'Öffnung', 'zeichnen', 'OE', 'vorhanden', true, { toolId: 'oeffnung' }),
  werkzeug('volumen', 'Volumen', 'zeichnen', 'VO', 'vorhanden', true, { toolId: 'volumen' }),
  werkzeug('zone', 'Zone', 'zeichnen', 'ZO', 'vorhanden', true, { toolId: 'zone' }),
  werkzeug('dach', 'Dach', 'zeichnen', 'DA', 'vorhanden', true, { toolId: 'dach' }),
  werkzeug('treppe', 'Treppe', 'zeichnen', 'TR', 'vorhanden', true, { toolId: 'treppe' }),
  werkzeug('stuetze', 'Stütze', 'zeichnen', 'ST', 'vorhanden', true, { toolId: 'stuetze' }),
  werkzeug('skizze', 'Skizze', 'zeichnen', 'SK', 'vorhanden', true, { toolId: 'skizze' }),
  werkzeug('mesh', 'Mesh', 'zeichnen', 'ME', 'vorhanden', true, { toolId: 'mesh' }),
  // v0.8.3 E2/E3 (§2/§3.3, §8-7 jetzt entschieden): echter ToolId.
  werkzeug('messen', 'Messen', 'zeichnen', 'MS', 'vorhanden', true, { toolId: 'messen' }),
];

/** ANSICHT (6) — §3.2. */
const ANSICHT: readonly IslandWerkzeug[] = [
  // Darstellung/Phase teilen sich die echte Aktion (Projekt-Menü öffnen,
  // `setProjektMenuOffen(true)`) — beide Selects leben im selben,
  // bestehenden Block (`DesignWorkspace.tsx:2764-2784`).
  werkzeug('darstellung', 'Darstellung', 'ansicht', 'DS', 'vorhanden', true),
  werkzeug('sonne', 'Sonne', 'ansicht', 'SO', 'vorhanden', true),
  werkzeug('ebenen', 'Ebenen', 'ansicht', 'EB', 'teilweise', true),
  werkzeug('achsen', 'Achsen', 'ansicht', 'AC', 'vorhanden', false),
  werkzeug('trace', 'Trace', 'ansicht', 'TC', 'vorhanden', true, {
    hinweis: 'Nur im Grundriss (PlanView.tsx) — dort noch nicht verdrahtet (PD3a, ausserhalb PD2-Dateikreis)',
  }),
  werkzeug('graph', 'Graph', 'ansicht', 'GR', 'vorhanden', true, {
    hinweis: 'Nur im Grundriss (PlanView.tsx) — dort noch nicht verdrahtet (PD3a, ausserhalb PD2-Dateikreis)',
  }),
];

/** PROJEKT (6) — §3.3. */
const PROJEKT: readonly IslandWerkzeug[] = [
  werkzeug('kennzahlen', 'Kennzahlen', 'projekt', 'KZ', 'vorhanden', true, {
    hinweis: 'Panel ist immer aktiv (kein Schalter vorhanden)',
  }),
  werkzeug('checks', 'Checks', 'projekt', 'CH', 'vorhanden', true, {
    hinweis: 'Panel ist immer aktiv (kein Schalter vorhanden)',
  }),
  werkzeug('varianten', 'Varianten', 'projekt', 'VA', 'vorhanden', true),
  werkzeug('phase', 'Phase', 'projekt', 'PH', 'vorhanden', true),
  werkzeug('liste', 'Liste', 'projekt', 'LI', 'vorhanden', true),
  // v0.8.3 E1/E3 (§1/§3.3, §8-6 jetzt entschieden): echter ToolId — der
  // Insel-Katalog-Id bleibt `kommentare` (Plural, Bestandstext), der ToolId
  // dahinter ist `kommentar` (Singular, `ui-zustand.ts`s `ToolId`-Union) —
  // beide Namen sind unabhängig, `werkzeug()`s `extra.toolId` verknüpft sie.
  werkzeug('kommentare', 'Kommentare', 'projekt', 'KO', 'vorhanden', true, { toolId: 'kommentar' }),
];

const ANDERE_STATION_HINWEIS = 'Andere Station — Weg offen (PD3b/Owner-Frage §8-4)';

/** AUSTAUSCH (6) — §3.4. */
const AUSTAUSCH: readonly IslandWerkzeug[] = [
  werkzeug('export', 'Export', 'austausch', 'EX', 'vorhanden', true),
  werkzeug('import', 'Import', 'austausch', 'IM', 'vorhanden', true),
  werkzeug('rendern', 'Rendern', 'austausch', 'RE', 'teilweise', true, { hinweis: ANDERE_STATION_HINWEIS }),
  werkzeug('blaetter', 'Blätter', 'austausch', 'BL', 'teilweise', true, { hinweis: ANDERE_STATION_HINWEIS }),
  werkzeug('sync', 'Sync', 'austausch', 'SY', 'teilweise', true, { hinweis: ANDERE_STATION_HINWEIS }),
  werkzeug('manuell', 'Manuell', 'austausch', 'MN', 'neu', false),
];

/** Gesamtkatalog, 29/29, Reihenfolge exakt §3.1→§3.4. */
export const WERKZEUG_KATALOG: readonly IslandWerkzeug[] = [...ZEICHNEN, ...ANSICHT, ...PROJEKT, ...AUSTAUSCH];

export function werkzeugeFuerIsland(island: IslandId): readonly IslandWerkzeug[] {
  return WERKZEUG_KATALOG.filter((w) => w.island === island);
}
