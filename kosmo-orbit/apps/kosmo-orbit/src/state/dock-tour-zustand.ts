import { create } from 'zustand';

/**
 * Dock-Tour-Zustand (v0.7.8 Welle 3 / Paket P8 — «Geführte Tour») — winziger
 * Laufzeit-Store, der NUR festhält, ob die geführte Tour durchs Dock-System
 * (`shell/dock/DockTour.tsx`) gerade offen ist. Kein Doc, kein Undo, kein
 * `localStorage` — reiner Session-Schalter, analog zu `dock-aktive-station.ts`/
 * `dock-orb-runtime.ts`: jeder Start beginnt frisch bei Schritt 1, ein Reload
 * schliesst die Tour automatisch (kein Wert, den man "wiederfinden" müsste).
 *
 * Getrennt von `dock-zustand.ts` (das PERSISTIERTE Layout) und von
 * `App.tsx`s lokalem `useState`, weil sowohl `Einstellungen.tsx` (Einstieg
 * «Werkzeug-Dock kennenlernen») als auch `DesignWorkspace.tsx` (dezenter
 * Einstieg neben «Layout zurücksetzen») die Tour auslösen können sollen,
 * ohne dass beide Aufrufer eine Prop-Kette durch `App.tsx` bräuchten —
 * `DockTour.tsx` selbst ist unconditionally in `App.tsx` gemountet und liest
 * nur `offen`.
 */
interface DockTourZustand {
  offen: boolean;
  /** Startet die Tour (Schritt 1) — `DockTour.tsx` snapshotet beim Übergang
   *  false→true den Ist-Zustand selbst, dieser Store weiss nichts davon. */
  starten: () => void;
  /** Beendet die Tour (Anzeige-Flag) — die eigentliche Wiederherstellung des
   *  Vor-Tour-Zustands macht `DockTour.tsx` selbst, bevor sie das hier ruft. */
  beenden: () => void;
}

export const useDockTourZustand = create<DockTourZustand>((set) => ({
  offen: false,
  starten: () => set({ offen: true }),
  beenden: () => set({ offen: false }),
}));
