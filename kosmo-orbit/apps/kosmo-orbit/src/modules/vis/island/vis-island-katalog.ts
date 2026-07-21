import type { ComponentType } from 'react';
import type { IslandWerkzeug, InselKonfig } from '../../design/island/island-katalog';
import { VIS_GLYPHEN } from './vis-glyphen';

/**
 * Vis-Island-Katalog (PC1, `docs/V084-SPEZ.md` §5 W2, C-15) — der erste
 * PC0-Härtetest: KosmoVis bekommt einen EIGENEN Insel-Katalog, gebaut GEGEN
 * die generische `InselKonfig`/`IslandWerkzeug`-Schnittstelle aus
 * `design/island/island-katalog.ts` (E1, W1 «PC0 verhaltensneutral» —
 * NICHTS dort wird verändert, nur importiert).
 *
 * Vier Inseln, Bühnenordnung wie design (links·oben·rechts·unten), Inhalt
 * aus dem heutigen Vis-Chrome sinnvoll gruppiert (Owner-Auftrag §1):
 * - **GRAPH** (links, vertikal): Node-Palette (bisheriges `visPalette`-Dock-
 *   Panel), Ausrichten (`visAusrichten`), Verbinden-Modus (Hinweis auf die
 *   bestehende Drag-Geste — es gibt keinen zweiten «Modus» zu bauen).
 * - **ANSICHT** (oben, horizontal): Zoom/Fit, Raster-Snap, Ortho/Kurve —
 *   1:1 die bisherige `.vis-chrome-bottomright`-Leiste. Das vierte Werkzeug
 *   «Minimap» ist mit K35 (Owner-Korrekturen 2026-07, S.14 «diese übersicht
 *   raus») mitsamt der Minimap entfallen. v0.8.11 P-B1/E4 (Owner-Wahl E-Vis,
 *   `docs/V0811-SPEZ.md` §2 E4): additiv um **Gespeicherte Ansichten**
 *   (`island/inhalte/ansichten.tsx`, importiert die bestehende
 *   `GespeicherteAnsichten`-Komponente/-Logik unverändert) und **Legende**
 *   (`island/inhalte/legende.tsx`, NEUE Datei — die Porttyp-Legende war
 *   bisher NUR im Manuell-`NodeCanvas.tsx` inline) erweitert — die letzten
 *   zwei der vier P-B1-Audit-Funde (0.8.10-Planung) bekommen damit ihr
 *   Insel-Äquivalent; VisOnboarding + die alten Dock-Panels bleiben laut
 *   Owner-Entscheid bewusst Manuell-only (fallen 0.9.0 mit dem Codepfad).
 * - **STIMMUNG** (rechts, vertikal): die 3 Presets als prozedurale
 *   Bild-Kacheln (E5) + der bestehende «Drei Stimmungen»-Graph-Baustein.
 * - **AUSTAUSCH** (unten, horizontal): Render senden, Aufs Plakat, Kamera
 *   vorschlagen, Report, Manuell (Rückweg — Muster `design`s `manuell`-
 *   Werkzeug in AUSTAUSCH, `island-katalog.ts` Z.174).
 * - **SONNE** (v0.8.9 §9 E11, `docs/V089-SPEZ.md`, PBL2) — FÜNFTE, EIGENE
 *   Insel (unten-links, vertikal): «Sonnenstunden berechnen (HomeStation)»,
 *   ein einzelnes Werkzeug (`island/inhalte/sonne.tsx`). Eigene, ehrliche
 *   Rand-Position (`isl-rand-sonne`, `vis-island.css` — additiv NEBEN den vier
 *   design-`.isl-rand-*`-Ankern aus `design/island/island.css`, die Vis nur
 *   liest/importiert, s. `IslandShell.tsx`), damit sie keine der vier
 *   Bestandsinseln überlagert. Das Icon (`vis-glyphen.tsx`) ist eine reine
 *   ALIAS-Zeile auf die bestehende `stimmung`-Zeichnung (Sonne hinter Wolke,
 *   thematisch passend) — kein neues SVG-Motiv, nur ein zusätzlicher
 *   Katalog-Schlüssel, damit `VIS_GLYPHEN` weiterhin JEDEN Katalog-Eintrag
 *   deckt (Invariante aus `test/vis-glyphen.test.tsx`).
 *
 * `toolId` bleibt bei JEDEM Werkzeug leer (das ist eine design-`ToolId`-Union,
 * s. `island-katalog.ts`-Kopfkommentar) — Vis hat keine Entsprechung, jede
 * Aktion läuft über `onWerkzeugAktion` (`VisWorkspace.tsx`) bzw. die Stufe-2/
 * 3-Registry-Inhalte selbst (`inhalte/*.tsx`, lesen `vis-runtime.ts`/
 * `useProject` direkt, wie die design-Vorbilder).
 *
 * **PA4 (v0.8.5, `docs/V085-SPEZ.md` §3 E6 + §7 C-13):** `glyphe` trägt ab
 * hier echte Icon-Components aus `vis-glyphen.tsx` statt der früheren
 * Zwei-Buchstaben-Text-Kürzel (`'NO'`, `'AR'`, …) — der `string`-Zweig der
 * `IslandWerkzeug.glyphe`-Signatur (design-Konvention, `island-katalog.ts`
 * E8) bleibt ein echter, aber ab jetzt ungenutzter Typ-Fallback.
 */

export type VisIslandId = 'graph' | 'ansicht' | 'stimmung' | 'austausch' | 'sonne';

/** Löst eine `vis-glyphen.tsx`-Icon-Id auf — Muster `island-katalog.ts`s `icon()`. */
function icon(id: string): ComponentType<{ size?: number }> {
  const c = VIS_GLYPHEN[id];
  if (!c) throw new Error(`vis-island-katalog: kein VIS_GLYPHEN-Icon für "${id}"`);
  return c;
}

function werkzeug(
  id: string,
  name: string,
  island: VisIslandId,
  glyphe: string | ComponentType<{ size?: number }>,
  hatPopup: boolean,
): IslandWerkzeug {
  // Vis ist neu gebaut (kein Bestandswerkzeug-Grad wie design) — alle
  // Werkzeuge sind ehrlich 'vorhanden' (echte Aktion dahinter, s. `inhalte/`
  // -Registrierungen), keine PD2-Hinweis-Platzhalter.
  return { id, name, island, glyphe, status: 'vorhanden', hatPopup };
}

const GRAPH: readonly IslandWerkzeug[] = [
  werkzeug('palette', 'Node-Palette', 'graph', icon('palette'), true),
  werkzeug('ausrichten', 'Ausrichten', 'graph', icon('ausrichten'), true),
  werkzeug('verbinden', 'Verbinden', 'graph', icon('verbinden'), true),
];

const ANSICHT: readonly IslandWerkzeug[] = [
  werkzeug('zoom', 'Zoom', 'ansicht', icon('zoom'), true),
  // Sofort-Toggle ohne Popup — dasselbe Muster wie design's 'achsen'
  // (`island-katalog.ts` Z.136, `hatPopup:false` = Sofort-Umschaltung).
  werkzeug('raster', 'Raster-Snap', 'ansicht', icon('raster'), false),
  werkzeug('routing', 'Kanten-Routing', 'ansicht', icon('routing'), false),
  // K35: das Werkzeug 'minimap' stand hier — mitsamt Minimap entfernt.
  // v0.8.11 P-B1/E4 (Owner-Wahl E-Vis, `docs/V0811-SPEZ.md` §2 E4) — additiv
  // ans Ende: die zwei Insel-Äquivalente für die letzten beiden Manuell-only-
  // Funde des P-B1-Audits (0.8.10-Planung). Beide `hatPopup:true` (echter
  // Inhalt, kein Sofort-Toggle, Muster 'zoom').
  werkzeug('ansichten', 'Gespeicherte Ansichten', 'ansicht', icon('ansichten'), true),
  werkzeug('legende', 'Legende', 'ansicht', icon('legende'), true),
];

const STIMMUNG: readonly IslandWerkzeug[] = [werkzeug('stimmung', 'Stimmung', 'stimmung', icon('stimmung'), true)];

const AUSTAUSCH: readonly IslandWerkzeug[] = [
  werkzeug('render-senden', 'Render senden', 'austausch', icon('render-senden'), true),
  werkzeug('aufs-plakat', 'Aufs Plakat', 'austausch', icon('aufs-plakat'), true),
  // Sofort-Aktion ohne Popup — Toast quittiert (wie design's `hatPopup:false`-Fälle).
  werkzeug('kamera-vorschlagen', 'Kamera vorschlagen', 'austausch', icon('kamera-vorschlagen'), false),
  werkzeug('report', 'Report', 'austausch', icon('report'), false),
  // v0.8.10 E3-Nachtrag (Owner-Entscheid 20.07.2026, docs/V0810-SPEZ.md §2
  // E3): der prominente Insel-Rückweg 'island' → 'manuell' ist entfallen —
  // Island bleibt Default/Standard, die manuelle Ansicht bleibt über einen
  // Schalter in den Einstellungen erreichbar (`shell/Einstellungen.tsx`,
  // testid `einstellung-vis-manuell`), nicht mehr über ein Insel-Werkzeug.
  // Der Rückweg AUS 'manuell' (`VisIslandZurueckKnopf`, VisWorkspace.tsx)
  // bleibt unverändert stehen.
];

// v0.8.9 §9 E11 — die fünfte, eigenständige Insel: EIN Werkzeug, öffnet
// `island/inhalte/sonne.tsx`s Stufe2/3-Inhalt (Datum-Input, Standort-Anzeige,
// Sonnenstunden-Berechnung). `icon('stimmung')` statt eines neuen Icons, s.
// Kopfkommentar oben.
const SONNE: readonly IslandWerkzeug[] = [
  werkzeug('sonnenstunden', 'Sonnenstunden', 'sonne', icon('sonnenstunden'), true),
];

/** Gesamtkatalog, 14 Werkzeuge über 5 Inseln (v0.8.10 E3-Nachtrag: 'manuell'
 * entfernt, 14→13; v0.8.11 P-B1/E4: +'ansichten'/+'legende', 13→15;
 * K35 Owner-Korrekturen 2026-07: −'minimap', 15→14). */
export const VIS_WERKZEUG_KATALOG: readonly IslandWerkzeug[] = [
  ...GRAPH,
  ...ANSICHT,
  ...STIMMUNG,
  ...AUSTAUSCH,
  ...SONNE,
];

const VIS_RAND_KLASSE: Readonly<Record<VisIslandId, string>> = {
  graph: 'isl-rand-links',
  ansicht: 'isl-rand-oben',
  stimmung: 'isl-rand-rechts',
  austausch: 'isl-rand-unten',
  // Additive, eigene Rand-Klasse (`vis-island.css`) — s. Kopfkommentar oben.
  sonne: 'isl-rand-sonne',
};

const VIS_ORIENTIERUNG: Readonly<Record<VisIslandId, 'vertikal' | 'horizontal'>> = {
  graph: 'vertikal',
  ansicht: 'horizontal',
  stimmung: 'vertikal',
  austausch: 'horizontal',
  sonne: 'vertikal',
};

const VIS_LABEL: Readonly<Record<VisIslandId, string>> = {
  graph: 'GRAPH',
  ansicht: 'ANSICHT',
  stimmung: 'STIMMUNG',
  austausch: 'AUSTAUSCH',
  sonne: 'SONNE',
};

/** Reihenfolge der fünf Vis-Inseln (Bühnenordnung — die vier design-Ecken,
 *  SONNE zusätzlich unten-links, s. Kopfkommentar). */
export const VIS_ISLAND_REIHENFOLGE: readonly VisIslandId[] = [
  'graph',
  'ansicht',
  'stimmung',
  'austausch',
  'sonne',
];

/** Die vier Vis-Inseln in Bühnenordnung — der Default der `IslandBuehne` im Vis-Island-Modus. */
export const VIS_INSELN: readonly InselKonfig[] = VIS_ISLAND_REIHENFOLGE.map((id) => ({
  id,
  label: VIS_LABEL[id],
  orientierung: VIS_ORIENTIERUNG[id],
  randKlasse: VIS_RAND_KLASSE[id],
  werkzeuge: VIS_WERKZEUG_KATALOG.filter((w) => w.island === id),
}));
