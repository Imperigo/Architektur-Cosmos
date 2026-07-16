import { create } from 'zustand';
import type { DockStation } from './dock-stationen';

/**
 * Dock-Zeichenfeld-Laufzeit (v0.8.0B / P8b, Matrix-Abnahme «element-fang») —
 * reiner LAUFZEIT-Store (Laufzeit ≠ Modell, CLAUDE.md): nichts hier geht
 * durchs Doc/Undo/Yjs.
 *
 * `DockFlaeche.tsx` schreibt nach JEDEM `solve()`-Lauf das freie ZENTRUM des
 * Dock-Layouts (`ergebnis.viewport` — der Bereich, den KEINE Dock-Spalte und
 * kein ctop-/cbot-Streifen überdeckt) in VIEWPORT-/CLIENT-Koordinaten hierher.
 * `PlanView.tsx`s «Einpassen» liest ihn, um den Grundriss in den tatsächlich
 * SICHTBAREN (nicht von Panels überdeckten) Bereich zu holen, statt in die
 * volle SVG-Fläche, deren rechter Rand unter dem Rechts-Stack (z.B. dem
 * immer sichtbaren Kennzahlen-Panel) liegt.
 *
 * **Warum ein eigener Store statt `dock-orb-runtime.ts`:** dessen Vertrag ist
 * «Kosmo ordnet»-Optik (Orb-Wanderziele, Panel-KOPF-Rechtecke, Gate über
 * `abspielenAktiv()`) — das Zeichenfeld ist dagegen reine Layout-Geometrie
 * ohne Gate und mit anderem Koordinatenraum (client statt container-lokal).
 * Ein Feld dort hätte zwei Verträge in einem Store vermischt.
 *
 * **Warum client- statt container-Koordinaten:** der Konsument (`PlanView`)
 * vergleicht mit `svg.getBoundingClientRect()` — `DockFlaeche` kennt ihren
 * Container und rechnet darum EINMAL beim Schreiben um; die Leser brauchen
 * keinerlei Wissen über die Dock-DOM-Struktur.
 */

export interface ZeichenfeldRechteck {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DockZeichenfeldZustand {
  /** Station der aktuell gemounteten `DockFlaeche` (nur eine je Screen, s.
   *  `dock-aktive-station.ts`) — Leser prüfen sie, damit z.B. ein Vis-Layout
   *  nie versehentlich einen Design-Fit steuert. */
  station: DockStation | null;
  /** Das freie Zentrum in CLIENT-Koordinaten; `null` solange keine
   *  `DockFlaeche` gemessen hat (Leser fallen dann auf ihre volle Fläche
   *  zurück — exakt das Verhalten vor diesem Store). */
  rect: ZeichenfeldRechteck | null;
  setzen: (station: DockStation, rect: ZeichenfeldRechteck) => void;
  zuruecksetzen: () => void;
}

export const useDockZeichenfeld = create<DockZeichenfeldZustand>((set) => ({
  station: null,
  rect: null,
  setzen: (station, rect) => set({ station, rect }),
  zuruecksetzen: () => set({ station: null, rect: null }),
}));
