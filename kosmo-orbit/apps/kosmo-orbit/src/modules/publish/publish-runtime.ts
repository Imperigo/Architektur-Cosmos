import { create } from 'zustand';

/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — Laufzeit-Zustand für den
 * Publish-Island-Modus, Muster 1:1 aus `modules/vis/vis-runtime.ts`s
 * PC1-Abschnitt («Island-UI») übernommen: die vier Publish-Inseln
 * (`island/inhalte/*.tsx`) dürfen NUR globale Stores lesen, keine
 * `PublishWorkspace.tsx`-lokalen Closures (Registry-Komponenten haben
 * keinen Prop-Pfad, s. `island/inhalte/registry.ts`-Kopfkommentar).
 *
 * Additiv, reine Laufzeit (kein Doc-/Undo-/Yjs-Feld — «Laufzeit ≠ Modell»,
 * `CLAUDE.md`): welches Blatt/welche Platzierung gerade im Island-Modus
 * aktiv ist, ist reiner UI-Zustand, kein Modell-Zustand.
 *
 * `canvasBefehl`/`sendeCanvasBefehl` ist der PC1-Fernauslöser
 * (`vis-runtime.ts`s Kopfkommentar zu `VisCanvasBefehlTyp`) — die eigentliche
 * Zoom-/Pan-Rechnung bleibt dort, wo die gemessene Bühnengrösse lebt
 * (`island/BlattZoomBuehne.tsx`, Muster `NodeCanvas.tsx:520-576`); das Feld
 * trägt nur den AUSLÖSER aus einem Island-Popup (`island/inhalte/
 * darstellung.tsx`) herein. `nonce` erzwingt IMMER einen neuen Effekt-Lauf,
 * auch bei zweimal demselben Typ hintereinander.
 */
export type PublishCanvasBefehlTyp = 'zoom-in' | 'zoom-out' | 'zoom-fit';

interface PublishRuntime {
  /** BLATT-Insel: welches Blatt die Island-Blattfläche zeigt — Fallback ist
   *  bei `null`/verwaistem Wert IMMER das erste Blatt (Muster `VisWorkspace.
   *  tsx`s `islandGraphId`-Fallback-Kette). */
  aktiverSheetId: string | null;
  setAktiverSheetId: (id: string | null) => void;
  /** DARSTELLUNG-Insel «Massstab»/PROJEKT-Insel «Plankopf»: die aktuell im
   *  Island-Blatt ausgewählte Platzierung (gespiegeltes Gegenstück zum
   *  Manuell-Modus-lokalen `selectedPlacement`-`useState`). */
  selectedPlacementId: string | null;
  setSelectedPlacementId: (id: string | null) => void;
  canvasBefehl: { typ: PublishCanvasBefehlTyp; nonce: number } | null;
  sendeCanvasBefehl: (typ: PublishCanvasBefehlTyp) => void;
}

export const usePublishRuntime = create<PublishRuntime>((set) => ({
  aktiverSheetId: null,
  setAktiverSheetId: (id) => set({ aktiverSheetId: id }),
  selectedPlacementId: null,
  setSelectedPlacementId: (id) => set({ selectedPlacementId: id }),
  canvasBefehl: null,
  sendeCanvasBefehl: (typ) => set((s) => ({ canvasBefehl: { typ, nonce: (s.canvasBefehl?.nonce ?? 0) + 1 } })),
}));
