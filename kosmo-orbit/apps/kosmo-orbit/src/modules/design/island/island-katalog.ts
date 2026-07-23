/**
 * Island-Werkzeug-Katalog (PD1 Fundament + PD2 Verdrahtung, `docs/ISLAND-UI-
 * SPEZ.md` §2/§3).
 *
 * Statischer, reiner Datensatz — die ursprüngliche 29-Werkzeug-Zuordnung auf
 * die vier Islands (ZEICHNEN 11 / ANSICHT 6 / PROJEKT 6 / AUSTAUSCH 6),
 * Reihenfolge und Zählung 1:1 aus der Mapping-Tabelle §3.1–§3.4 übernommen.
 * v0.9.1 P-B2 (`docs/V091-SPEZ.md` §P-B2) hängt additiv zwei weitere
 * ZEICHNEN-Werkzeuge ans Ende der Insel (`gelaender`/`rampe`) — Gesamtstand
 * jetzt 31 (ZEICHNEN 13 / ANSICHT 6 / PROJEKT 6 / AUSTAUSCH 6), s. dortigen
 * Kommentar.
 *
 * **PD2 (diese Fassung): `toolId` echt gesetzt**, wo eine Insel-Id 1:1 einer
 * bestehenden `ui-zustand.ts`-`ToolId` entspricht (die neun Zeichenwerkzeuge
 * mit direktem `setTool`-Weg). Für die übrigen «Vorhanden»/«Teilweise»-
 * Werkzeuge, deren echte Aktion KEIN `ToolId`-Setzen ist (z. B. Sonne →
 * `sonneOffen`, Varianten → `variantenPanelOffen`), bleibt `toolId` leer —
 * ihre Verdrahtung lebt als benannter Fall in `DesignWorkspace.tsx`s
 * `aktiviereIslandWerkzeug()` (Integrationspunkt, dateidisjunkt von diesem
 * reinen Datensatz). `glyphe` trägt seit PB2 (v0.8.4, s. Icon-Verdrahtungs-
 * Kommentar weiter unten) echte Icon-Components statt Text-Kürzeln — seit
 * PE2 (Bauauftrag Punkt 2) auch `skizze` (21. Icon, `island-glyphen.tsx`),
 * damit sind alle 29 Katalog-Werkzeuge SVG-vollständig.
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
 *
 * **PE2 (v0.8.4, C-27 — «8 Rahmen-Werkzeuge»):** die toolId-lose 8er-Gruppe
 * aus `island-katalog-pd2.test.ts` (Achsen/Trace/Graph/Kennzahlen/Checks/
 * Rendern/Blätter/Sync) war der Ursprung der Owner-Mängelliste «8
 * Rahmen-Werkzeuge» (`docs/V084-SPEZ.md` §1.1). Geprüft gegen den Code:
 * 7 der 8 (alle ausser Achsen) tragen seit P3/PD3a/PD3b (v0.8.3) längst
 * echten Registry-Inhalt (`inhalte/{ansicht,projekt,austausch}.tsx`,
 * `registrierteWerkzeugIds()` listet alle 27 Popup-Werkzeuge, keine Lücke).
 * Nur die `hinweis`-Metadaten hier hinkten hinterher — Kennzahlen/Checks
 * trugen einen inzwischen toten Text (Stufe 3 zeigt das echte, eingebettete
 * Panel), Rendern/Blätter/Sync behaupteten «Weg offen (§8-4)», obwohl §8-4
 * seit PD3c entschieden UND real verdrahtet ist (`docs/ISLAND-UI-SPEZ.md`
 * §8 Punkt 4 Nachtrag) — derselbe «Leiche»-Fund wie beim Trace/Graph-Hinweis
 * (P10 v0.8.3). PE2 entfernt alle fünf toten `hinweis`-Felder ersatzlos
 * (dasselbe Muster). Achsen bleibt der einzige echte Rest — Owner-sauber
 * geschlossen durch die §4.4-Ausnahme (kein Popup, kein Rahmen).
 */

import type { ComponentType } from 'react';
import {
  IconAuswahl,
  IconWand,
  IconVolumen,
  IconZone,
  IconDach,
  IconTreppe,
  IconStuetze,
  IconMesh,
} from '../werkzeug-icons';
import { ISLAND_GLYPHEN } from './island-glyphen';

/**
 * PB2 (`docs/V084-SPEZ.md` §3 E8 + Bauauftrag «Werkzeug-Chrome») —
 * Icon-Verdrahtung: `glyphe` trägt ab hier ECHTE Icon-Components statt
 * Text-Kürzeln, wo eines existiert. Acht der elf ZEICHNEN-Werkzeuge
 * bekommen ihre bereits bestehenden `werkzeug-icons.tsx`-SVGs (Auswahl/
 * Wand/Volumen/Zone/Dach/Treppe/Stütze/Mesh — `schnitt`, das neunte Icon
 * dieser Datei, ist KEIN Katalog-Werkzeug, s. dortigen Kopfkommentar); die
 * übrigen 20 Werkzeuge (inkl. Öffnung/Messen aus ZEICHNEN) bekommen ihr
 * `ISLAND_GLYPHEN`-Icon. PE2 (v0.8.4, Bauauftrag Punkt 2) schliesst die
 * letzte Lücke: `skizze` bekommt jetzt ebenfalls ihr `ISLAND_GLYPHEN`-Icon
 * (das 21., dort namensgleich `skizze`) statt des früheren Text-Kürzels
 * `'SK'` — der `string`-Zweig von `glyphe` bleibt ein echter Typ-Fallback
 * (`IslandWerkzeug.glyphe: string | ComponentType<...>`, E8), aber ab jetzt
 * ohne aktiven Katalog-Konsumenten.
 */
function icon(rec: Record<string, ComponentType<{ size?: number }>>, id: string): ComponentType<{ size?: number }> {
  const c = rec[id];
  if (!c) throw new Error(`island-katalog: kein ISLAND_GLYPHEN-Icon für "${id}"`);
  return c;
}

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
  /** PC0 v0.8.4: `string` statt `IslandId` — andere Stationen bringen eigene
   *  Insel-Ids mit (`docs/V084-SPEZ.md` E1); für design bleibt es faktisch
   *  die Vierer-Union (alle Aufrufer unten übergeben `IslandId`). */
  readonly island: string;
  /** PB2 E8: echtes Icon (SVG-Component) ODER Text-Kürzel-Fallback (`skizze`,
   *  s. Datei-Kopfkommentar). String bleibt gültig — Fallback, kein totes Bein. */
  readonly glyphe: string | ComponentType<{ size?: number }>;
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
  glyphe: string | ComponentType<{ size?: number }>,
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
  werkzeug('auswahl', 'Auswahl', 'zeichnen', IconAuswahl, 'vorhanden', true, { toolId: 'auswahl' }),
  werkzeug('wand', 'Wand', 'zeichnen', IconWand, 'vorhanden', true, { toolId: 'wand' }),
  // v0.8.3 E3 (§3.3, docs/V083-SPEZ.md, §8-5 jetzt entschieden): echter
  // ToolId statt Hinweis — `aktiviereIslandWerkzeug()` (DesignWorkspace.tsx)
  // setzt `setTool('oeffnung')` automatisch (`w.toolId`-Zweig).
  werkzeug('oeffnung', 'Öffnung', 'zeichnen', icon(ISLAND_GLYPHEN, 'oeffnung'), 'vorhanden', true, { toolId: 'oeffnung' }),
  werkzeug('volumen', 'Volumen', 'zeichnen', IconVolumen, 'vorhanden', true, { toolId: 'volumen' }),
  werkzeug('zone', 'Zone', 'zeichnen', IconZone, 'vorhanden', true, { toolId: 'zone' }),
  werkzeug('dach', 'Dach', 'zeichnen', IconDach, 'vorhanden', true, { toolId: 'dach' }),
  werkzeug('treppe', 'Treppe', 'zeichnen', IconTreppe, 'vorhanden', true, { toolId: 'treppe' }),
  werkzeug('stuetze', 'Stütze', 'zeichnen', IconStuetze, 'vorhanden', true, { toolId: 'stuetze' }),
  // PE2 (v0.8.4, Bauauftrag Punkt 2): `skizze` bekommt jetzt ihr echtes
  // SVG (`island-glyphen.tsx`s 21. Icon) — der frühere Text-Fallback `'SK'`
  // ist raus, alle 29 Katalog-Werkzeuge sind damit SVG-vollständig.
  werkzeug('skizze', 'Skizze', 'zeichnen', icon(ISLAND_GLYPHEN, 'skizze'), 'vorhanden', true, { toolId: 'skizze' }),
  werkzeug('mesh', 'Mesh', 'zeichnen', IconMesh, 'vorhanden', true, { toolId: 'mesh' }),
  // v0.8.3 E2/E3 (§2/§3.3, §8-7 jetzt entschieden): echter ToolId.
  werkzeug('messen', 'Messen', 'zeichnen', icon(ISLAND_GLYPHEN, 'messen'), 'vorhanden', true, { toolId: 'messen' }),
  // v0.9.1 P-B2 (`docs/V091-SPEZ.md` §P-B2): zwei NEUE ZEICHNEN-Werkzeuge —
  // die Kernel-Seite (Entity + Command, P-A1/P-A2) ist fertig gelandet,
  // `toolId` aktiviert echt denselben generischen `setTool`-Weg wie jedes
  // andere Zeichenwerkzeug (`aktiviereIslandWerkzeug()`,
  // `DesignWorkspace.tsx`, unverändert — kein Sonderfall nötig). Status
  // bewusst `teilweise` (wie ebenen/rendern/blaetter/sync): der Modus lässt
  // sich setzen, die eigentliche Klickketten-/Zwei-Punkt-Interaktion im
  // Plan (`PlanView.tsx`s `punktSetzen()`) ist NICHT Teil dieses Pakets
  // (Cluster-B-TABU) — das liefert P-B1 (Fable). Die Mini-Popups
  // (`inhalte/zeichnen.tsx`) tragen Vorgabewerte fürs künftige Zeichnen
  // plus — sobald ein Geländer/eine Rampe existiert — die editierbaren
  // (Geländer) bzw. rein angezeigten, weil vom Kernel nicht editierbaren
  // (Rampe) Felder.
  werkzeug('gelaender', 'Geländer', 'zeichnen', icon(ISLAND_GLYPHEN, 'gelaender'), 'teilweise', true, { toolId: 'gelaender' }),
  werkzeug('rampe', 'Rampe', 'zeichnen', icon(ISLAND_GLYPHEN, 'rampe'), 'teilweise', true, { toolId: 'rampe' }),
];

/** ANSICHT (6) — §3.2. */
const ANSICHT: readonly IslandWerkzeug[] = [
  // Darstellung/Phase teilen sich die echte Aktion (Projekt-Menü öffnen,
  // `setProjektMenuOffen(true)`) — beide Selects leben im selben,
  // bestehenden Block (`DesignWorkspace.tsx:2764-2784`).
  werkzeug('darstellung', 'Darstellung', 'ansicht', icon(ISLAND_GLYPHEN, 'darstellung'), 'vorhanden', true),
  werkzeug('sonne', 'Sonne', 'ansicht', icon(ISLAND_GLYPHEN, 'sonne'), 'vorhanden', true),
  werkzeug('ebenen', 'Ebenen', 'ansicht', icon(ISLAND_GLYPHEN, 'ebenen'), 'teilweise', true),
  werkzeug('achsen', 'Achsen', 'ansicht', icon(ISLAND_GLYPHEN, 'achsen'), 'vorhanden', false),
  // P10 v0.8.3 (Matrix-Abnahme): die PD2-Zwischenstand-Hinweise «dort noch
  // nicht verdrahtet» waren seit PD3a toter Text — `inhalte/ansicht.tsx`
  // registriert Trace/Graph mit echten Stufe-2/3-Inhalten, der Fallback-
  // `hinweis` rendert dann nie (IslandShell zeigt ihn nur OHNE Registry-
  // Inhalt). Ersatzlos entfernt statt stehen gelassen: ein Hinweis, der das
  // Gegenteil der gebauten Realität behauptet, ist auch als Leiche falsch.
  werkzeug('trace', 'Trace', 'ansicht', icon(ISLAND_GLYPHEN, 'trace'), 'vorhanden', true),
  werkzeug('graph', 'Graph', 'ansicht', icon(ISLAND_GLYPHEN, 'graph'), 'vorhanden', true),
];

/** PROJEKT (6) — §3.3. */
const PROJEKT: readonly IslandWerkzeug[] = [
  // PE2 (v0.8.4, C-27): der frühere «Panel ist immer aktiv»-Hinweis ist raus —
  // toter Text seit `inhalte/projekt.tsx` das echte, eingebettete
  // `KennzahlenPanel`/`SubmissionsCheckPanel` in Stufe 3 zeigt (IslandShell
  // rendert `hinweis` nur, wenn KEIN Stufe-3-Inhalt registriert ist).
  werkzeug('kennzahlen', 'Kennzahlen', 'projekt', icon(ISLAND_GLYPHEN, 'kennzahlen'), 'vorhanden', true),
  werkzeug('checks', 'Checks', 'projekt', icon(ISLAND_GLYPHEN, 'checks'), 'vorhanden', true),
  werkzeug('varianten', 'Varianten', 'projekt', icon(ISLAND_GLYPHEN, 'varianten'), 'vorhanden', true),
  werkzeug('phase', 'Phase', 'projekt', icon(ISLAND_GLYPHEN, 'phase'), 'vorhanden', true),
  werkzeug('liste', 'Liste', 'projekt', icon(ISLAND_GLYPHEN, 'liste'), 'vorhanden', true),
  // v0.8.3 E1/E3 (§1/§3.3, §8-6 jetzt entschieden): echter ToolId — der
  // Insel-Katalog-Id bleibt `kommentare` (Plural, Bestandstext), der ToolId
  // dahinter ist `kommentar` (Singular, `ui-zustand.ts`s `ToolId`-Union) —
  // beide Namen sind unabhängig, `werkzeug()`s `extra.toolId` verknüpft sie.
  werkzeug('kommentare', 'Kommentare', 'projekt', icon(ISLAND_GLYPHEN, 'kommentare'), 'vorhanden', true, {
    toolId: 'kommentar',
  }),
];

/** AUSTAUSCH (6) — §3.4. */
// PE2 (v0.8.4, C-27): der frühere `ANDERE_STATION_HINWEIS` («Weg offen,
// §8-4») ist raus — §8-4 ist seit PD3c entschieden UND real verdrahtet
// (`docs/ISLAND-UI-SPEZ.md` §8 Punkt 4 Nachtrag: `registriereStationsWeg`,
// echte Navigation über `ZurStationKnopf`), der Hinweis behauptete das
// Gegenteil der gebauten Realität UND war zusätzlich toter Text (Stufe 3
// ist für alle drei registriert, `inhalte/austausch.tsx`) — dieselbe
// «Leiche», die P10 (v0.8.3) schon bei Trace/Graph fand und entfernte.
const AUSTAUSCH: readonly IslandWerkzeug[] = [
  werkzeug('export', 'Export', 'austausch', icon(ISLAND_GLYPHEN, 'export'), 'vorhanden', true),
  werkzeug('import', 'Import', 'austausch', icon(ISLAND_GLYPHEN, 'import'), 'vorhanden', true),
  werkzeug('rendern', 'Rendern', 'austausch', icon(ISLAND_GLYPHEN, 'rendern'), 'teilweise', true),
  werkzeug('blaetter', 'Blätter', 'austausch', icon(ISLAND_GLYPHEN, 'blaetter'), 'teilweise', true),
  werkzeug('sync', 'Sync', 'austausch', icon(ISLAND_GLYPHEN, 'sync'), 'teilweise', true),
  werkzeug('manuell', 'Manuell', 'austausch', icon(ISLAND_GLYPHEN, 'manuell'), 'neu', false),
];

/** Gesamtkatalog, 29/29, Reihenfolge exakt §3.1→§3.4. */
export const WERKZEUG_KATALOG: readonly IslandWerkzeug[] = [...ZEICHNEN, ...ANSICHT, ...PROJEKT, ...AUSTAUSCH];

export function werkzeugeFuerIsland(island: IslandId): readonly IslandWerkzeug[] {
  return WERKZEUG_KATALOG.filter((w) => w.island === island);
}

/**
 * PC0 v0.8.4 (`docs/V084-SPEZ.md` E1): Konfig-Objekt je Insel — die
 * generische Schnittstelle, über die JEDE Station die IslandShell bespielt.
 * Die fünf bisher hartkodierten design-Records (IslandId-Union,
 * ISLAND_REIHENFOLGE/-LABEL/-ORIENTIERUNG + ISLAND_RAND_KLASSE in
 * IslandShell.tsx) bleiben als design-Wahrheit bestehen und werden hier nur
 * EINMAL in die Konfig-Form gegossen — Verhalten byte-gleich, kein
 * testid/keine Klasse ändert sich (Sanktion 1 der V084-SPEZ).
 */
export interface InselKonfig {
  readonly id: string;
  readonly label: string;
  readonly orientierung: IslandOrientierung;
  /** CSS-Randklasse (`isl-rand-links|-oben|-rechts|-unten`) — Position an der Bühne. */
  readonly randKlasse: string;
  readonly werkzeuge: readonly IslandWerkzeug[];
}

/** Rand-Position je design-Island (§1/§2) — bis PC0 in `IslandShell.tsx:49-54`. */
const DESIGN_RAND_KLASSE: Readonly<Record<IslandId, string>> = {
  zeichnen: 'isl-rand-links',
  ansicht: 'isl-rand-oben',
  projekt: 'isl-rand-rechts',
  austausch: 'isl-rand-unten',
};

/** Die vier design-Inseln in Bühnenordnung — Default der `IslandBuehne`. */
export const DESIGN_INSELN: readonly InselKonfig[] = ISLAND_REIHENFOLGE.map((id) => ({
  id,
  label: ISLAND_LABEL[id],
  orientierung: ISLAND_ORIENTIERUNG[id],
  randKlasse: DESIGN_RAND_KLASSE[id],
  werkzeuge: werkzeugeFuerIsland(id),
}));

export function designInselKonfig(id: IslandId): InselKonfig {
  const konfig = DESIGN_INSELN.find((k) => k.id === id);
  if (!konfig) throw new Error(`Unbekannte design-Insel: ${id}`);
  return konfig;
}
