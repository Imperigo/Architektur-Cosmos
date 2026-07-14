import { create } from 'zustand';
import type { DockStation } from './dock-stationen';

/**
 * Aktive Dock-Station (v0.7.8 Welle 3 / Paket P7 — «Kosmo ordnet») — winziger
 * Laufzeit-Store, der NUR festhält, welche `DockStation` gerade tatsächlich
 * gerendert wird. Kein Doc, kein Undo, kein `localStorage` — reiner
 * In-Memory-Zeiger, analog zum "App-Zustand" (`useProject`s `activeStoreyId`),
 * an den `ui.geschossSetzen` sich in `ui-befehle.ts` bereits hält.
 *
 * **Warum hier und nicht in `App.tsx`**: `App.tsx`s `screen`-State ist lokaler
 * `useState`, nirgends exportiert (Merge-Gesetz: `App.tsx` bleibt unangetastet,
 * s. Auftrag). `DockFlaeche.tsx` bekommt ihre `station`-Prop dagegen bereits
 * fertig von genau der Werkstatt, die gerade sichtbar ist (`DesignWorkspace.
 * tsx`/`NodeCanvas.tsx`) — UND es ist zu jedem Zeitpunkt höchstens EINE
 * `DockFlaeche`-Instanz gemountet (die andere Werkstatt ist unmounted, sobald
 * der Screen wechselt). `DockFlaeche` schreibt ihre `station`-Prop deshalb bei
 * jedem Mount/Wechsel hierher (`setzeAktiveStation`, Kopfkommentar dort) —
 * das macht SIE zur einzigen Quelle, ohne `DesignWorkspace.tsx`/`NodeCanvas.
 * tsx` selbst anfassen zu müssen.
 *
 * `dock-befehle.ts` liest den aktuellen Wert über `aktiveDockStation()` (reiner
 * `getState()`-Zugriff, kein Hook — dieselbe Machart wie `ui.geschossSetzen`s
 * `useProject.getState()`), um Panel-IDs gegen die RICHTIGE Station zu
 * validieren (`dockbarePanelIds(station)`, `dock-stationen.ts`).
 */

interface AktiveDockStationZustand {
  station: DockStation | undefined;
  setzeAktiveStation: (station: DockStation) => void;
}

export const useAktiveDockStation = create<AktiveDockStationZustand>((set) => ({
  station: undefined,
  setzeAktiveStation: (station) => set((s) => (s.station === station ? s : { station })),
}));

/** Reiner Lesezugriff (kein Hook) — für `dock-befehle.ts` und Tests. */
export function aktiveDockStation(): DockStation | undefined {
  return useAktiveDockStation.getState().station;
}

/** Test-/Setup-Helfer: setzt die aktive Station direkt (Vitest ohne DOM/DockFlaeche-Mount). */
export function setzeAktiveDockStationFuerTest(station: DockStation | undefined): void {
  useAktiveDockStation.setState({ station });
}
