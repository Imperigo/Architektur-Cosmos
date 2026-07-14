import { create } from 'zustand';
import type { JobQa } from './vis-jobs';

/**
 * Laufzeit-Zustand des Render-Graphen (P2) — BEWUSST ausserhalb des Doc:
 * Job-Status und Bilder wandern nie durch Undo oder Yjs (kein Base64 im
 * Sync). Memo-Schlüssel = Hash der Render-Parameter: ändert sich nichts,
 * bleibt das Bild gültig und der Node zeigt «aktuell».
 */

/**
 * Lebenszyklus eines Node-Laufs (V2-Technik Block 1 / HS3). Spiegelt den
 * Bridge-Job-Zustand EHRLICH:
 *  - `gesendet`        — lokal abgesendet, noch keine Bridge-Antwort
 *  - `wartetFreigabe`  — Bridge verlangt Freigabe (awaiting_approval)
 *  - `wartetGpu`       — angenommen, wartet aufs GPU-Leerlauf-Fenster (queued)
 *  - `rendert`         — Worker rechnet (running)
 *  - `fertig`          — Ergebnis da (done + result)
 *  - `fehler`          — error / Netz-/Bridge-Fehler
 *  - `abgebrochen`     — vom Nutzer abgebrochen (cancelled)
 *  - `zeitueberschreitung` — lokaler Wächter: zu lange ohne Ergebnis
 */
export type NodeLaufStatus =
  | 'gesendet'
  | 'wartetFreigabe'
  | 'wartetGpu'
  | 'rendert'
  | 'fertig'
  | 'fehler'
  | 'abgebrochen'
  | 'zeitueberschreitung';

export interface NodeLauf {
  status: NodeLaufStatus;
  jobId?: string;
  bild?: string;
  qa?: JobQa;
  fehler?: string;
  /** Freigabe-Token aus dem Create-Response — nötig für `/approve`. */
  approvalToken?: string;
  /** Wer den Job übernommen hat (z. B. "fake-worker" oder ein echter Worker). */
  worker?: string;
  /** Laufende Etappe des Workers — der Node zeigt Phase + Prozent (HS3-Auflage 5). */
  progress?: { phase: string; pct: number };
  /** Zeitpunkt des Absendens (ms, Date.now) — Basis des Timeout-Wächters. */
  gestartetUm?: number;
  /** Parameter-Hash beim Absenden — weicht der Graph ab, ist das Bild «veraltet». */
  memoKey: string;
}

/** Zustände, in denen ein Lauf noch «offen» ist (der Poll fragt sie ab). */
export const OFFENE_LAUF_STATUS: readonly NodeLaufStatus[] = [
  'gesendet',
  'wartetFreigabe',
  'wartetGpu',
  'rendert',
];

/** Default-Wächter: nach 10 min ohne Ergebnis gilt ein Lauf als überschritten. */
export const RENDER_TIMEOUT_MS_DEFAULT = 10 * 60 * 1000;

/**
 * Reine, unit-getestete Timeout-Entscheidung. Ein Lauf ist überschritten, wenn
 * er noch offen ist (kein Endzustand), einen Startzeitpunkt trägt und seit
 * `gestartetUm` mehr als `limitMs` vergangen sind. `wartetFreigabe` zählt NICHT
 * als überschritten — dort wartet die Kette bewusst auf den Menschen.
 */
export function istZeitUeberschritten(
  lauf: Pick<NodeLauf, 'status' | 'gestartetUm'>,
  jetzt: number,
  limitMs: number,
): boolean {
  if (lauf.gestartetUm === undefined) return false;
  if (lauf.status === 'wartetFreigabe') return false;
  const offen =
    lauf.status === 'gesendet' || lauf.status === 'wartetGpu' || lauf.status === 'rendert';
  if (!offen) return false;
  return jetzt - lauf.gestartetUm > limitMs;
}

/**
 * V-H5 (Welle 3, Kuratier-Fläche): Kuration eines Renderbilds am Node —
 * «markiert» (Stern) und «verworfen» (Ablage statt Löschen, VORFORM-UI-
 * KONZEPT §1.5 «Layout 02» als Ablage, nichts geht verloren). BEWUSST hier
 * in vis-runtime, nicht im Doc: die Kuration hängt am AKTUELLEN Bild eines
 * Nodes (Laufzeit), nicht an einer Modell-Eigenschaft — kein Undo, kein
 * Yjs-Sync, wie `laeufe` selbst («Laufzeit ≠ Modell»).
 */
export interface KurationEintrag {
  markiert: boolean;
  verworfen: boolean;
}

/**
 * Viewport-Aufnahme (v0.6.7 Phase 0) — ein Schnappschuss des 3D-Viewports
 * («Für Vis aufnehmen»-Knopf in Viewport3D.tsx), als dataURL. Wie `laeufe`
 * BEWUSST reine Laufzeit: entities.ts:500-505 hält fest, dass Render-Graph-
 * Bilder nie durch Undo/Yjs/.kosmo gehen — dieselbe Regel gilt für den
 * `aufnahme`-Node. Mehrere Aufnahmen können nebeneinander leben (id = eigener
 * Schlüssel), der `aufnahme`-Node zeigt per Default die jüngste.
 */
export interface Aufnahme {
  id: string;
  dataUrl: string;
  /** Date.now() beim Aufnehmen — bestimmt die «jüngste» Aufnahme. */
  zeit: number;
  /** Dokumentarisch: welcher Standpunkt gemeint war (Node-Param `kamera`). */
  kamera: string;
}

interface VisRuntime {
  laeufe: Record<string, NodeLauf>;
  kuration: Record<string, KurationEintrag>;
  aufnahmen: Record<string, Aufnahme>;
  /**
   * v0.7.8 Welle 3 (P6, Dock-Migration) — Sichtbarkeit der Node-Palette
   * (`NodeCanvas.tsx`, Knopf `vis-palette-toggle`). Lebte bisher als
   * lokaler `useState` in `NodeCanvas.tsx`; für `DockFlaeche` (das die
   * Palette jetzt als `visPalette`-Dock-Panel rendert) minimal-invasiv
   * hierher gehoben — reiner In-Memory-Zustand wie `kuration`/`laeufe`
   * oben, KEIN neues `localStorage` (bewusst KEINE Persistenz über einen
   * Neustart hinweg, wie das alte `useState` es auch nicht hatte).
   */
  paletteOffen: boolean;
  setzeLauf: (nodeId: string, lauf: NodeLauf) => void;
  patchLauf: (nodeId: string, patch: Partial<NodeLauf>) => void;
  markiereBild: (nodeId: string) => void;
  verwerfeBild: (nodeId: string) => void;
  fuegeAufnahmeHinzu: (a: Aufnahme) => void;
  paletteUmschalten: () => void;
  paletteSchliessen: () => void;
}

export const useVisRuntime = create<VisRuntime>((set) => ({
  laeufe: {},
  kuration: {},
  aufnahmen: {},
  paletteOffen: false,
  setzeLauf: (nodeId, lauf) => set((s) => ({ laeufe: { ...s.laeufe, [nodeId]: lauf } })),
  patchLauf: (nodeId, patch) =>
    set((s) => {
      const alt = s.laeufe[nodeId];
      if (!alt) return s;
      return { laeufe: { ...s.laeufe, [nodeId]: { ...alt, ...patch } } };
    }),
  markiereBild: (nodeId) =>
    set((s) => {
      const alt = s.kuration[nodeId] ?? { markiert: false, verworfen: false };
      return { kuration: { ...s.kuration, [nodeId]: { ...alt, markiert: !alt.markiert } } };
    }),
  verwerfeBild: (nodeId) =>
    set((s) => {
      const alt = s.kuration[nodeId] ?? { markiert: false, verworfen: false };
      return { kuration: { ...s.kuration, [nodeId]: { ...alt, verworfen: !alt.verworfen } } };
    }),
  fuegeAufnahmeHinzu: (a) => set((s) => ({ aufnahmen: { ...s.aufnahmen, [a.id]: a } })),
  paletteUmschalten: () => set((s) => ({ paletteOffen: !s.paletteOffen })),
  paletteSchliessen: () => set({ paletteOffen: false }),
}));

/**
 * Wählt die zu einem `aufnahme`-Node-Param passende Aufnahme: ein Treffer
 * nach `kamera` gewinnt, sonst (oder bei 'aktuell'/ohne Param) die jüngste
 * insgesamt. `null` ohne jede Aufnahme — ehrlich, kein Platzhalterbild.
 */
export function waehleAufnahme(aufnahmen: Record<string, Aufnahme>, kamera?: string): Aufnahme | null {
  const alle = Object.values(aufnahmen).sort((a, b) => b.zeit - a.zeit);
  if (alle.length === 0) return null;
  if (kamera && kamera !== 'aktuell') {
    const treffer = alle.find((a) => a.kamera === kamera);
    if (treffer) return treffer;
  }
  return alle[0]!;
}

/** Memo-Schlüssel eines Render-Auftrags — billig und deterministisch.
 * `nurCycles` MUSS mit rein (HS5): sonst zeigt der Node nach dem Umschalten
 * fälschlich «aktuell», obwohl ein anderer Job bestellt würde. `presetId`
 * (K20/A10) genauso: ein Preset-Wechsel ändert Samples/Auflösung/Sonne, ohne
 * das im Schlüssel würde der Node fälschlich «aktuell» bleiben. */
export function memoKey(a: {
  prompt: string;
  faithful: number;
  samples: number;
  nurCycles?: boolean;
  presetId?: string;
}): string {
  return `${a.faithful}|${a.samples}|${a.nurCycles ? 'cycles' : 'ki'}|${a.presetId ?? 'kein-preset'}|${a.prompt}`;
}
