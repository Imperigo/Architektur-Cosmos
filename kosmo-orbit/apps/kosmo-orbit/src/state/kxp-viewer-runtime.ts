import { create } from 'zustand';
import type { KosmoDoc, JournalEntry } from '@kosmo/kernel';
import { kxpUebergangAnwenden, type KxpFreigabeStatus, type KxpManifest } from './kxp-format';
import { downloadKxpStand, openKxpFile, type KxpPlan } from './kxp-io';

/**
 * Laufzeit-Zustand des `.kxp`-Viewers (v0.8.1 / P11) — BEWUSST ausserhalb
 * des Doc/Yjs («Laufzeit ≠ Modell», Muster `modules/vis/vis-runtime.ts`):
 * ein geöffnetes `.kxp`-Paket ist ein read-only BETRACHTETER fremder Stand,
 * niemals das laufende Projekt (`state/project-store.ts`). Ein Freigabe-
 * Übergang ändert nur diesen Laufzeit-Stand; «gespeichert» wird er erst,
 * wenn der Nutzer das aktualisierte Paket erneut herunterlädt (es gibt
 * keinen Server, der einen Zwischenstand hält — das Paket selbst trägt
 * seinen Verlauf).
 */

export interface KxpGeladenesPaket {
  manifest: KxpManifest;
  doc: KosmoDoc;
  journal: JournalEntry[];
  plaene: KxpPlan[];
  /** true, sobald ein Freigabe-Übergang lief, aber der neue Stand noch nicht
   *  erneut heruntergeladen wurde — ehrlicher Hinweis «ungesichert». */
  unheruntergeladeneAenderung: boolean;
}

interface KxpViewerState {
  paket: KxpGeladenesPaket | null;
  ladeFehler: string | null;
  ladeLaeuft: boolean;
  ladeDatei: (file: File) => Promise<void>;
  schliessen: () => void;
  wechsleStatus: (nach: KxpFreigabeStatus, akteur: string, notiz?: string) => { ok: true } | { ok: false; fehler: string };
  ladeAktuellenStandHerunter: () => void;
}

export const useKxpViewer = create<KxpViewerState>((set, get) => ({
  paket: null,
  ladeFehler: null,
  ladeLaeuft: false,

  ladeDatei: async (file: File) => {
    set({ ladeLaeuft: true, ladeFehler: null });
    const result = await openKxpFile(file);
    if (!result.ok) {
      set({ ladeLaeuft: false, ladeFehler: result.fehler, paket: null });
      return;
    }
    set({
      ladeLaeuft: false,
      ladeFehler: null,
      paket: {
        manifest: result.manifest,
        doc: result.doc,
        journal: result.journal,
        plaene: result.plaene,
        unheruntergeladeneAenderung: false,
      },
    });
  },

  schliessen: () => set({ paket: null, ladeFehler: null }),

  wechsleStatus: (nach, akteur, notiz) => {
    const paket = get().paket;
    if (!paket) return { ok: false, fehler: 'kein Paket geladen' };
    const ergebnis = kxpUebergangAnwenden(paket.manifest.trust, nach, akteur, notiz);
    if (!ergebnis.ok) return ergebnis;
    set({
      paket: {
        ...paket,
        manifest: { ...paket.manifest, trust: ergebnis.trust },
        unheruntergeladeneAenderung: true,
      },
    });
    return { ok: true };
  },

  ladeAktuellenStandHerunter: () => {
    const paket = get().paket;
    if (!paket) return;
    downloadKxpStand(paket.manifest, paket.doc, paket.journal, paket.plaene);
    set({ paket: { ...paket, unheruntergeladeneAenderung: false } });
  },
}));
