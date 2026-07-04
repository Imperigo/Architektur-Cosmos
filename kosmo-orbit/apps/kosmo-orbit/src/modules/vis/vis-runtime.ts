import { create } from 'zustand';
import type { JobQa } from './vis-jobs';

/**
 * Laufzeit-Zustand des Render-Graphen (P2) — BEWUSST ausserhalb des Doc:
 * Job-Status und Bilder wandern nie durch Undo oder Yjs (kein Base64 im
 * Sync). Memo-Schlüssel = Hash der Render-Parameter: ändert sich nichts,
 * bleibt das Bild gültig und der Node zeigt «aktuell».
 */

export interface NodeLauf {
  status: 'gesendet' | 'rendert' | 'fertig' | 'fehler';
  jobId?: string;
  bild?: string;
  qa?: JobQa;
  fehler?: string;
  /** Parameter-Hash beim Absenden — weicht der Graph ab, ist das Bild «veraltet». */
  memoKey: string;
}

interface VisRuntime {
  laeufe: Record<string, NodeLauf>;
  setzeLauf: (nodeId: string, lauf: NodeLauf) => void;
  patchLauf: (nodeId: string, patch: Partial<NodeLauf>) => void;
}

export const useVisRuntime = create<VisRuntime>((set) => ({
  laeufe: {},
  setzeLauf: (nodeId, lauf) => set((s) => ({ laeufe: { ...s.laeufe, [nodeId]: lauf } })),
  patchLauf: (nodeId, patch) =>
    set((s) => {
      const alt = s.laeufe[nodeId];
      if (!alt) return s;
      return { laeufe: { ...s.laeufe, [nodeId]: { ...alt, ...patch } } };
    }),
}));

/** Memo-Schlüssel eines Render-Auftrags — billig und deterministisch. */
export function memoKey(a: { prompt: string; faithful: number; samples: number }): string {
  return `${a.faithful}|${a.samples}|${a.prompt}`;
}
