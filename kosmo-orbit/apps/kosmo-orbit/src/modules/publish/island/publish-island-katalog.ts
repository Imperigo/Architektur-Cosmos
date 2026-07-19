import type { ComponentType } from 'react';
import type { IslandWerkzeug, InselKonfig } from '../../design/island/island-katalog';
import { PUBLISH_GLYPHEN } from './publish-glyphen';

/**
 * Publish-Island-Katalog (PC3, `docs/V084-SPEZ.md` §5 W3, C-19) — dritter
 * PC0-Konsument nach PC1 (vis, C-15), gebaut GEGEN dieselbe generische
 * `InselKonfig`/`IslandWerkzeug`-Schnittstelle aus `design/island/
 * island-katalog.ts` (E1, W1 «PC0 verhaltensneutral» — NICHTS dort wird
 * verändert, nur importiert).
 *
 * Vier Inseln, Bühnenordnung wie design/vis (links·oben·rechts·unten),
 * Inhalt aus dem heutigen Publish-Chrome sinnvoll gruppiert (Bauauftrag):
 * - **BLATT** (links, vertikal): Blatt anlegen/wechseln, Ansicht platzieren
 *   (Grundriss/Axo/Schnitt/Bild-Slot/Himmelsrichtungen), Auto-Pack — 1:1 die
 *   bisherige Sidebar-Blattliste + die «Platzieren»-Werkzeuggruppe der
 *   Canvas-Werkzeugleiste + das `AutoPackPanel`.
 * - **DARSTELLUNG** (oben, horizontal): Zoom ±/Fit (NEU, C-19 — s.
 *   `BlattZoomBuehne.tsx`), Massstab (die bisherige «Auswahl»-Massstab-
 *   Auswahl), Plankopf-Presets (Massstab-Chips/Layout-Schalter aus
 *   `PlankopfPanel`).
 * - **PROJEKT** (rechts, vertikal): Dossier (`DossierPanel`), Plankopf
 *   (Plancode/Phase/Büro-Stammdaten, derselbe `PlankopfPanel` wie die
 *   DARSTELLUNG-Insel — zwei Zugänge zu EINEM Editor, kein zweiter Bau).
 * - **AUSTAUSCH** (unten, horizontal): PDF-Export (Plansatz + Einzelblatt),
 *   SVG/DXF-Export, Export-Hub (Publikations-Sets), Manuell (Rückweg —
 *   Muster `vis-island-katalog.ts`s `'manuell'`-Werkzeug in AUSTAUSCH).
 *
 * `toolId` bleibt bei JEDEM Werkzeug leer (design-`ToolId`-Union, Publish hat
 * keine Entsprechung) — jede Aktion läuft über `onWerkzeugAktion`
 * (`PublishWorkspace.tsx`) bzw. die Stufe-2/3-Registry-Inhalte selbst
 * (`inhalte/*.tsx`, lesen `publish-runtime.ts`/`useProject` direkt, wie die
 * design-/vis-Vorbilder).
 *
 * **PA4 (v0.8.5, `docs/V085-SPEZ.md` §3 E6 + §7 C-13):** `glyphe` trägt ab
 * hier echte Icon-Components aus `publish-glyphen.tsx` statt der früheren
 * Zwei-Buchstaben-Text-Kürzel (`'BL'`, `'PL'`, …) — der `string`-Zweig der
 * `IslandWerkzeug.glyphe`-Signatur (design-Konvention, `island-katalog.ts`
 * E8) bleibt ein echter, aber ab jetzt ungenutzter Typ-Fallback.
 */

export type PublishIslandId = 'blatt' | 'darstellung' | 'projekt' | 'austausch';

/** Löst eine `publish-glyphen.tsx`-Icon-Id auf — Muster `island-katalog.ts`s `icon()`. */
function icon(id: string): ComponentType<{ size?: number }> {
  const c = PUBLISH_GLYPHEN[id];
  if (!c) throw new Error(`publish-island-katalog: kein PUBLISH_GLYPHEN-Icon für "${id}"`);
  return c;
}

function werkzeug(
  id: string,
  name: string,
  island: PublishIslandId,
  glyphe: string | ComponentType<{ size?: number }>,
  hatPopup: boolean,
): IslandWerkzeug {
  // Publish ist neu auf Islands gebaut (kein Bestandswerkzeug-Grad wie
  // design) — alle Werkzeuge sind ehrlich 'vorhanden' (echte Aktion
  // dahinter, s. `inhalte/`-Registrierungen), keine PD2-Hinweis-Platzhalter.
  return { id, name, island, glyphe, status: 'vorhanden', hatPopup };
}

const BLATT: readonly IslandWerkzeug[] = [
  werkzeug('blatt', 'Blatt anlegen/wechseln', 'blatt', icon('blatt'), true),
  werkzeug('platzieren', 'Ansicht platzieren', 'blatt', icon('platzieren'), true),
  werkzeug('auto-pack', 'Auto-Pack', 'blatt', icon('auto-pack'), true),
];

const DARSTELLUNG: readonly IslandWerkzeug[] = [
  werkzeug('zoom', 'Zoom', 'darstellung', icon('zoom'), true),
  werkzeug('massstab', 'Massstab', 'darstellung', icon('massstab'), true),
  werkzeug('plankopf-presets', 'Plankopf-Presets', 'darstellung', icon('plankopf-presets'), true),
];

const PROJEKT: readonly IslandWerkzeug[] = [
  werkzeug('dossier', 'Dossier', 'projekt', icon('dossier'), true),
  werkzeug('plankopf', 'Plankopf', 'projekt', icon('plankopf'), true),
];

const AUSTAUSCH: readonly IslandWerkzeug[] = [
  werkzeug('export-pdf', 'PDF-Export', 'austausch', icon('export-pdf'), true),
  werkzeug('export-svg-dxf', 'SVG/DXF-Export', 'austausch', icon('export-svg-dxf'), true),
  werkzeug('export-hub', 'Export-Hub', 'austausch', icon('export-hub'), true),
  // Rückweg 'island' → 'manuell' — Muster `vis-island-katalog.ts` Z.70/
  // `island-katalog.ts` Z.217 (design).
  werkzeug('manuell', 'Manuell', 'austausch', icon('manuell'), false),
];

/** Gesamtkatalog, 12 Werkzeuge über 4 Inseln. */
export const PUBLISH_WERKZEUG_KATALOG: readonly IslandWerkzeug[] = [...BLATT, ...DARSTELLUNG, ...PROJEKT, ...AUSTAUSCH];

const PUBLISH_RAND_KLASSE: Readonly<Record<PublishIslandId, string>> = {
  blatt: 'isl-rand-links',
  darstellung: 'isl-rand-oben',
  projekt: 'isl-rand-rechts',
  austausch: 'isl-rand-unten',
};

const PUBLISH_ORIENTIERUNG: Readonly<Record<PublishIslandId, 'vertikal' | 'horizontal'>> = {
  blatt: 'vertikal',
  darstellung: 'horizontal',
  projekt: 'vertikal',
  austausch: 'horizontal',
};

const PUBLISH_LABEL: Readonly<Record<PublishIslandId, string>> = {
  blatt: 'BLATT',
  darstellung: 'DARSTELLUNG',
  projekt: 'PROJEKT',
  austausch: 'AUSTAUSCH',
};

/** Reihenfolge der vier Publish-Inseln (Bühnenordnung, wie design/vis: links·oben·rechts·unten). */
export const PUBLISH_ISLAND_REIHENFOLGE: readonly PublishIslandId[] = ['blatt', 'darstellung', 'projekt', 'austausch'];

/** Die vier Publish-Inseln in Bühnenordnung — der Default der `IslandBuehne` im Publish-Island-Modus. */
export const PUBLISH_INSELN: readonly InselKonfig[] = PUBLISH_ISLAND_REIHENFOLGE.map((id) => ({
  id,
  label: PUBLISH_LABEL[id],
  orientierung: PUBLISH_ORIENTIERUNG[id],
  randKlasse: PUBLISH_RAND_KLASSE[id],
  werkzeuge: PUBLISH_WERKZEUG_KATALOG.filter((w) => w.island === id),
}));
