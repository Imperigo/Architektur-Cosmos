import { create } from 'zustand';
import type { ViewportModusId } from '../modules/design/viewport-modi';

/**
 * Viewport-Chrome-Laufzeit (v0.7.8 Welle 2 / Paket P5 — «HUDs als echte
 * Dock-Floats») — ein schlanker externer Store (Muster 1:1 wie
 * `modules/vis/vis-runtime.ts`/`state/leistung.ts`: Laufzeit-Werte, die
 * NICHT durchs Doc/Undo/Yjs laufen), der Viewport3D.tsx (Schreiber) von
 * DesignWorkspace.tsx (Leser, baut die `DockPanelEintrag[]` für
 * `DockFlaeche`) entkoppelt, OHNE die Kamera-Poll-Werte (400ms-Takt,
 * `azimutRad`) durch die ganze DesignWorkspace-Baumstruktur re-rendern zu
 * lassen: die vier gefloateten HUD-Mini-Komponenten (`ViewportChromeHuds.tsx`)
 * abonnieren HIER direkt per Selektor, DesignWorkspace selbst braucht nur
 * `bereit` (ändert sich nur bei Mount/Unmount des 3D-Viewports, nicht bei
 * jedem Kamera-Tick).
 *
 * WARUM ein neuer Store statt Props/Ref-Drilling: `Viewport3D.tsx` besitzt
 * die echten `camera-controls`/`THREE.PerspectiveCamera`-Referenzen (Modus-
 * Umschalter, Werkzeug-Rail und Orientierungskreuz brauchen nur PRIMITIVE
 * Ableitungen daraus, s. `ViewportChrome.tsx`), `DesignWorkspace.tsx` rendert
 * aber die Dock-Floats (`designDockPanels`, `DockFlaeche`). Eine Prop-
 * Lift-Aktion beider ~2000-Zeilen-Dateien wäre riskanter und würde die
 * bestehende `chromeSnapshot`-Poll-Schleife in Viewport3D unnötig anfassen —
 * dieser Store spiegelt nur die vier Werte, die die HUD-Floats tatsächlich
 * brauchen, additiv NEBEN dem unveränderten internen State von Viewport3D
 * (der weiterhin die NICHT gefloateten Chrome-Teile — Kennzahlen-Kachel,
 * Eigenschaften-Panel, Zoom/Vollbild-Leiste — unverändert selbst rendert).
 */
export interface ViewportChromeRuntime {
  /** Echtes Mount-/Bereit-Signal (`Viewport3D`s `viewportBereit`) — false
   *  solange kein 3D-Mount steht ODER der 3D-Viewport gerade unmountet ist
   *  (2D-Ansicht). Ersetzt NICHT die viewMode-Prüfung — Aufrufer kombinieren
   *  beides (s. `DesignWorkspace.tsx`, Quad-Ansicht-Kommentar). */
  bereit: boolean;
  modus: ViewportModusId;
  aktivesWerkzeug: string;
  /** camera-controls `azimuthAngle` (Radiant) — einzig für den
   *  Orientierungskreuz-Float, 400ms-Takt (`Viewport3D`s bestehender Poll). */
  azimutRad: number;
  onModusWechsel: (m: ViewportModusId) => void;
  onWerkzeugWechsel: (id: string) => void;
}

function nichts(): void {
  // Default-Callback vor dem ersten Viewport3D-Mount — Klicks vor dem Mount
  // sind unmöglich (die Floats sind erst sichtbar, wenn `bereit===true`,
  // s. Kopfkommentar), dieser Stub existiert nur für einen typsicheren
  // Anfangszustand ohne `| undefined`.
}

export const useViewportChromeRuntime = create<ViewportChromeRuntime>(() => ({
  bereit: false,
  modus: 'modellieren',
  aktivesWerkzeug: 'auswahl',
  azimutRad: 0,
  onModusWechsel: nichts,
  onWerkzeugWechsel: nichts,
}));
