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
 * - **ANSICHT** (oben, horizontal): Zoom/Fit, Raster-Snap, Ortho/Kurve,
 *   Minimap+Legende — 1:1 die bisherige `.vis-chrome-bottomright`/
 *   `-bottomleft`-Leiste + die `visLegende`/`visMinimap`-Dock-Panels.
 * - **STIMMUNG** (rechts, vertikal): die 3 Presets als prozedurale
 *   Bild-Kacheln (E5) + der bestehende «Drei Stimmungen»-Graph-Baustein.
 * - **AUSTAUSCH** (unten, horizontal): Render senden, Aufs Plakat, Kamera
 *   vorschlagen, Report, Manuell (Rückweg — Muster `design`s `manuell`-
 *   Werkzeug in AUSTAUSCH, `island-katalog.ts` Z.174).
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

export type VisIslandId = 'graph' | 'ansicht' | 'stimmung' | 'austausch';

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
  werkzeug('minimap', 'Minimap', 'ansicht', icon('minimap'), true),
];

const STIMMUNG: readonly IslandWerkzeug[] = [werkzeug('stimmung', 'Stimmung', 'stimmung', icon('stimmung'), true)];

const AUSTAUSCH: readonly IslandWerkzeug[] = [
  werkzeug('render-senden', 'Render senden', 'austausch', icon('render-senden'), true),
  werkzeug('aufs-plakat', 'Aufs Plakat', 'austausch', icon('aufs-plakat'), true),
  // Sofort-Aktion ohne Popup — Toast quittiert (wie design's `hatPopup:false`-Fälle).
  werkzeug('kamera-vorschlagen', 'Kamera vorschlagen', 'austausch', icon('kamera-vorschlagen'), false),
  werkzeug('report', 'Report', 'austausch', icon('report'), false),
  // Rückweg 'island' → 'manuell' — Muster `island-katalog.ts` Z.174 (design).
  werkzeug('manuell', 'Manuell', 'austausch', icon('manuell'), false),
];

/** Gesamtkatalog, 13 Werkzeuge über 4 Inseln. */
export const VIS_WERKZEUG_KATALOG: readonly IslandWerkzeug[] = [...GRAPH, ...ANSICHT, ...STIMMUNG, ...AUSTAUSCH];

const VIS_RAND_KLASSE: Readonly<Record<VisIslandId, string>> = {
  graph: 'isl-rand-links',
  ansicht: 'isl-rand-oben',
  stimmung: 'isl-rand-rechts',
  austausch: 'isl-rand-unten',
};

const VIS_ORIENTIERUNG: Readonly<Record<VisIslandId, 'vertikal' | 'horizontal'>> = {
  graph: 'vertikal',
  ansicht: 'horizontal',
  stimmung: 'vertikal',
  austausch: 'horizontal',
};

const VIS_LABEL: Readonly<Record<VisIslandId, string>> = {
  graph: 'GRAPH',
  ansicht: 'ANSICHT',
  stimmung: 'STIMMUNG',
  austausch: 'AUSTAUSCH',
};

/** Reihenfolge der vier Vis-Inseln (Bühnenordnung, wie design: links·oben·rechts·unten). */
export const VIS_ISLAND_REIHENFOLGE: readonly VisIslandId[] = ['graph', 'ansicht', 'stimmung', 'austausch'];

/** Die vier Vis-Inseln in Bühnenordnung — der Default der `IslandBuehne` im Vis-Island-Modus. */
export const VIS_INSELN: readonly InselKonfig[] = VIS_ISLAND_REIHENFOLGE.map((id) => ({
  id,
  label: VIS_LABEL[id],
  orientierung: VIS_ORIENTIERUNG[id],
  randKlasse: VIS_RAND_KLASSE[id],
  werkzeuge: VIS_WERKZEUG_KATALOG.filter((w) => w.island === id),
}));
