import type { ComponentType } from 'react';
import type { IslandWerkzeug, InselKonfig } from '../../design/island/island-katalog';
import { PREPARE_GLYPHEN } from './prepare-glyphen';

/**
 * Prepare-Island-Katalog (PC4, `docs/V084-SPEZ.md` §5 W3, C-20) — gebaut
 * GEGEN die generische `InselKonfig`/`IslandWerkzeug`-Schnittstelle aus
 * `design/island/island-katalog.ts` (E1, NUR importiert — dieselbe Naht wie
 * PC1s `vis-island-katalog.ts`, W1 «PC0 verhaltensneutral»: nichts dort wird
 * verändert). Vier Inseln, Bühnenordnung wie design/vis (links·oben·rechts·
 * unten), Owner-Auftrag-Schnitt («kleinste Rollout-Station», schmale
 * Funktionsmenge statt jedes Bestandsdetails):
 *
 * - **AUFNAHME** (links, vertikal): Dateien wählen/ingest (inkl. Drag&Drop-
 *   Zone + Ausbau: Ergebnis je Datei statt stummen Scheiterns, s.
 *   `inhalte/aufnahme.tsx`), OneDrive verbinden/Ordner-Browser.
 * - **WISSEN** (oben, horizontal): Suche, Basis-Import (Bauwissen-Bibliothek),
 *   Nachträglich vektorisieren.
 * - **BESTAND** (rechts, vertikal): Dokument-Liste + Entfernen, Chunk-Ansicht
 *   (Quellensprung aus einer Kosmo-Antwort).
 * - **AUSTAUSCH** (unten, horizontal): Zu KosmoData (Deep-Link-Interim, s.
 *   `inhalte/austausch.tsx`-Kopfkommentar zur ehrlichen Grenze), Manuell
 *   (Rückweg — Muster design/vis' `manuell`-Werkzeug).
 *
 * Das Wettbewerbsdossier (Phase 0) UND der klassische OneDrive-Feinschliff
 * (Pfad-Breadcrumb) sind bewusst NICHT Teil dieses schmalen Insel-Schnitts —
 * sie bleiben bei `prepareOberflaeche==='manuell'` vollständig erhalten
 * (Bestandsschutz), s. Abschlussbericht «ehrliche Grenzen».
 *
 * `toolId` bleibt bei JEDEM Werkzeug leer (design-`ToolId`-Union, Prepare hat
 * keine Entsprechung) — jede Aktion läuft über die Registry-Inhalte selbst
 * (`inhalte/*.tsx`, lesen `knowledge.ts`/`onedrive.ts`/`useQuellen` direkt).
 *
 * **PA4 (v0.8.5, `docs/V085-SPEZ.md` §3 E6 + §7 C-13):** `glyphe` trägt ab
 * hier echte Icon-Components aus `prepare-glyphen.tsx` statt der früheren
 * Zwei-Buchstaben-Text-Kürzel (`'DA'`, `'OD'`, …) — der `string`-Zweig der
 * `IslandWerkzeug.glyphe`-Signatur (design-Konvention, `island-katalog.ts`
 * E8) bleibt ein echter, aber ab jetzt ungenutzter Typ-Fallback.
 */

export type PrepareIslandId = 'aufnahme' | 'wissen' | 'bestand' | 'austausch';

/** Löst eine `prepare-glyphen.tsx`-Icon-Id auf — Muster `island-katalog.ts`s `icon()`. */
function icon(id: string): ComponentType<{ size?: number }> {
  const c = PREPARE_GLYPHEN[id];
  if (!c) throw new Error(`prepare-island-katalog: kein PREPARE_GLYPHEN-Icon für "${id}"`);
  return c;
}

function werkzeug(
  id: string,
  name: string,
  island: PrepareIslandId,
  glyphe: string | ComponentType<{ size?: number }>,
  hatPopup: boolean,
): IslandWerkzeug {
  // Prepare ist neu gebaut (kein Bestandswerkzeug-Grad wie design) — alle
  // Werkzeuge sind ehrlich 'vorhanden' (echte Aktion dahinter, s. `inhalte/`
  // -Registrierungen), keine Hinweis-Platzhalter im Katalog selbst — einzige
  // ehrliche Grenze (Deep-Link «Zu KosmoData») dokumentiert sich IM Inhalt
  // selbst, nicht über einen Katalog-`hinweis`.
  return { id, name, island, glyphe, status: 'vorhanden', hatPopup };
}

const AUFNAHME: readonly IslandWerkzeug[] = [
  werkzeug('dateien', 'Dateien', 'aufnahme', icon('dateien'), true),
  werkzeug('onedrive', 'OneDrive', 'aufnahme', icon('onedrive'), true),
];

const WISSEN: readonly IslandWerkzeug[] = [
  werkzeug('suche', 'Suche', 'wissen', icon('suche'), true),
  werkzeug('basis', 'Basis-Import', 'wissen', icon('basis'), true),
  werkzeug('vektorisieren', 'Vektorisieren', 'wissen', icon('vektorisieren'), true),
];

const BESTAND: readonly IslandWerkzeug[] = [
  werkzeug('dokumente', 'Dokumente', 'bestand', icon('dokumente'), true),
  werkzeug('chunk', 'Chunk-Ansicht', 'bestand', icon('chunk'), true),
];

const AUSTAUSCH: readonly IslandWerkzeug[] = [
  werkzeug('zu-kosmodata', 'Zu KosmoData', 'austausch', icon('zu-kosmodata'), true),
  // Rückweg 'island' → 'manuell' — Muster `island-katalog.ts` Z.174 (design)
  // bzw. `vis-island-katalog.ts` (PC1): Sofort-Umschaltung ohne Popup.
  werkzeug('manuell', 'Manuell', 'austausch', icon('manuell'), false),
];

/** Gesamtkatalog, 9 Werkzeuge über 4 Inseln. */
export const PREPARE_WERKZEUG_KATALOG: readonly IslandWerkzeug[] = [...AUFNAHME, ...WISSEN, ...BESTAND, ...AUSTAUSCH];

const PREPARE_RAND_KLASSE: Readonly<Record<PrepareIslandId, string>> = {
  aufnahme: 'isl-rand-links',
  wissen: 'isl-rand-oben',
  bestand: 'isl-rand-rechts',
  austausch: 'isl-rand-unten',
};

const PREPARE_ORIENTIERUNG: Readonly<Record<PrepareIslandId, 'vertikal' | 'horizontal'>> = {
  aufnahme: 'vertikal',
  wissen: 'horizontal',
  bestand: 'vertikal',
  austausch: 'horizontal',
};

const PREPARE_LABEL: Readonly<Record<PrepareIslandId, string>> = {
  aufnahme: 'AUFNAHME',
  wissen: 'WISSEN',
  bestand: 'BESTAND',
  austausch: 'AUSTAUSCH',
};

/** Reihenfolge der vier Prepare-Inseln (Bühnenordnung, wie design/vis: links·oben·rechts·unten). */
export const PREPARE_ISLAND_REIHENFOLGE: readonly PrepareIslandId[] = ['aufnahme', 'wissen', 'bestand', 'austausch'];

/** Die vier Prepare-Inseln in Bühnenordnung — der Default der `IslandBuehne` im Prepare-Island-Modus. */
export const PREPARE_INSELN: readonly InselKonfig[] = PREPARE_ISLAND_REIHENFOLGE.map((id) => ({
  id,
  label: PREPARE_LABEL[id],
  orientierung: PREPARE_ORIENTIERUNG[id],
  randKlasse: PREPARE_RAND_KLASSE[id],
  werkzeuge: PREPARE_WERKZEUG_KATALOG.filter((w) => w.island === id),
}));
