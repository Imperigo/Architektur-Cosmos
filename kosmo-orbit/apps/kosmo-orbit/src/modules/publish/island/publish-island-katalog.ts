import type { IslandWerkzeug, InselKonfig } from '../../design/island/island-katalog';

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
 */

export type PublishIslandId = 'blatt' | 'darstellung' | 'projekt' | 'austausch';

function werkzeug(
  id: string,
  name: string,
  island: PublishIslandId,
  glyphe: string,
  hatPopup: boolean,
): IslandWerkzeug {
  // Publish ist neu auf Islands gebaut (kein Bestandswerkzeug-Grad wie
  // design) — alle Werkzeuge sind ehrlich 'vorhanden' (echte Aktion
  // dahinter, s. `inhalte/`-Registrierungen), keine PD2-Hinweis-Platzhalter.
  return { id, name, island, glyphe, status: 'vorhanden', hatPopup };
}

const BLATT: readonly IslandWerkzeug[] = [
  werkzeug('blatt', 'Blatt anlegen/wechseln', 'blatt', 'BL', true),
  werkzeug('platzieren', 'Ansicht platzieren', 'blatt', 'PL', true),
  werkzeug('auto-pack', 'Auto-Pack', 'blatt', 'AK', true),
];

const DARSTELLUNG: readonly IslandWerkzeug[] = [
  werkzeug('zoom', 'Zoom', 'darstellung', 'ZM', true),
  werkzeug('massstab', 'Massstab', 'darstellung', 'MS', true),
  werkzeug('plankopf-presets', 'Plankopf-Presets', 'darstellung', 'PP', true),
];

const PROJEKT: readonly IslandWerkzeug[] = [
  werkzeug('dossier', 'Dossier', 'projekt', 'DO', true),
  werkzeug('plankopf', 'Plankopf', 'projekt', 'PK', true),
];

const AUSTAUSCH: readonly IslandWerkzeug[] = [
  werkzeug('export-pdf', 'PDF-Export', 'austausch', 'PD', true),
  werkzeug('export-svg-dxf', 'SVG/DXF-Export', 'austausch', 'SD', true),
  werkzeug('export-hub', 'Export-Hub', 'austausch', 'EH', true),
  // Rückweg 'island' → 'manuell' — Muster `vis-island-katalog.ts` Z.70/
  // `island-katalog.ts` Z.217 (design).
  werkzeug('manuell', 'Manuell', 'austausch', 'MN', false),
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
