import { create } from 'zustand';
import type { ViewportModusId } from '../modules/design/viewport-modi';

/**
 * Viewport-Chrome-Laufzeit (v0.7.8 Welle 2 / Paket P5 — «HUDs als echte
 * Dock-Floats», erweitert v0.7.9 A1 — «Säulen ins Dock») — ein schlanker
 * externer Store (Muster 1:1 wie `modules/vis/vis-runtime.ts`/`state/
 * leistung.ts`: Laufzeit-Werte, die NICHT durchs Doc/Undo/Yjs laufen), der
 * Viewport3D.tsx (Schreiber) von DesignWorkspace.tsx (Leser, baut die
 * `DockPanelEintrag[]` für `DockFlaeche`) entkoppelt, OHNE die Kamera-Poll-
 * Werte (400ms-Takt, `azimutRad`) durch die ganze DesignWorkspace-
 * Baumstruktur re-rendern zu lassen: die gefloateten HUD-Mini-Komponenten
 * (`ViewportChromeHuds.tsx`) abonnieren HIER direkt per Selektor,
 * DesignWorkspace selbst braucht nur `bereit` (ändert sich nur bei Mount/
 * Unmount des 3D-Viewports, nicht bei jedem Kamera-Tick).
 *
 * WARUM ein neuer Store statt Props/Ref-Drilling: `Viewport3D.tsx` besitzt
 * die echten `camera-controls`/`THREE.PerspectiveCamera`-Referenzen (die
 * gefloateten HUDs brauchen nur PRIMITIVE Ableitungen daraus, s.
 * `ViewportChrome.tsx`), `DesignWorkspace.tsx` rendert aber die Dock-Floats
 * (`designDockPanels`, `DockFlaeche`). Eine Prop-Lift-Aktion beider
 * ~2000-Zeilen-Dateien wäre riskanter und würde die bestehende
 * `chromeSnapshot`-Poll-Schleife in Viewport3D unnötig anfassen — dieser
 * Store spiegelt nur die Werte, die die HUD-Floats tatsächlich brauchen,
 * additiv NEBEN dem unveränderten internen State von Viewport3D.
 *
 * **v0.7.9 A1**: die HUD-Statuskarte + das Eigenschaften-Panel («die letzte
 * verbliebene Überlappungs-Klasse», ROADMAP 357/358) sind jetzt ebenfalls
 * Dock-Floats (`viewportHudStatuskarte`/`viewportEigenschaften`,
 * `dock-stationen.ts`, Anker `top-right` — die additive Solver-Erweiterung
 * in `dock-kern.ts`) statt fixer `position:absolute`-Chrome — sie lesen die
 * ZUSÄTZLICHEN Felder unten (Kamera/Szene/Render/Darstellung-Werte + die vier
 * Aktions-Callbacks), rein additiv NEBEN den P5-Feldern. `ViewportChrome.tsx`
 * behält NUR noch die Bottom-Leiste (Zoom/Vollbild/Chips) als eigenen
 * State/Props-Weg — die Bottom-Chips lesen weiterhin ihre eigenen Props
 * (kein Duplikat hier nötig, s. `ViewportChrome.tsx`-Kopfkommentar).
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

  // -- v0.7.9 A1 — HUD-Statuskarte + Eigenschaften-Panel ---------------------
  /** camera-controls `polarAngle` in Grad — nur Eigenschaften/Kamera-Sektion. */
  polarGrad: number;
  distanzM: number;
  brennweiteMm: number;
  aspektBreite: number;
  aspektHoehe: number;
  geschossLabel: string | null;
  kontextAnzahl: number;
  splatAktiv: boolean;
  texturenAn: boolean;
  sonnenDatum: Date | null;
  standortLabel: string;
  leistungsStufeLabel: string;
  schattenAn: boolean;
  darstellungsModus: 'material' | 'weiss' | 'schwarz';
  renderStatusLabel: string;
  renderCloudLeer: boolean;
  onEinpassen: () => void;
  onRendern: () => void;
  onFuerVisAufnehmen: () => void;
  onTexturToggle: () => void;

  // -- v0.8.8 PB1 (E6, docs/V088-SPEZ.md §3 E6, D6) — Esc-Zustands-Kanal ----
  /** Brücken-Feld: true, solange in Viewport3D eine Shift-Marquee-Geste
   *  läuft (Start in `onCaptureDown`, Ende bei JEDEM Ausgang — Commit, Esc,
   *  pointercancel, Stale-Discard, Unmount-Cleanup). Existiert, weil Esc
   *  während einer laufenden 3D-Marquee-Geste HEUTE über
   *  `ev.stopImmediatePropagation()` im Viewport3D-`onKey`-Escape-Zweig vor
   *  dem unabhängigen `DesignWorkspace.tsx`-window-Escape-Listener abgefangen
   *  wird (D6-Befund) — das bleibt in DIESEM Paket unverändert (kein
   *  Guard-Bau in DesignWorkspace.tsx, TABU für PB1). Der Store-Kanal ist
   *  der VORBEREITETE Lese-Anker für den Fable-Nachzug: sobald
   *  DesignWorkspace.tsx seinen eigenen Escape-Handler auf
   *  `useViewportChromeRuntime.getState().marqueeAktiv` prüft (statt die
   *  Auswahl blind zu leeren), kann `stopImmediatePropagation()` dort
   *  ATOMAR mit dem neuen Guard entfernt werden — Übergabe-Punkt, s.
   *  Viewport3D.tsx `onKey`-Kommentar. */
  marqueeAktiv: boolean;
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
  polarGrad: 90,
  distanzM: 1,
  brennweiteMm: 35,
  aspektBreite: 16,
  aspektHoehe: 9,
  geschossLabel: null,
  kontextAnzahl: 0,
  splatAktiv: false,
  texturenAn: true,
  sonnenDatum: null,
  standortLabel: '',
  leistungsStufeLabel: '',
  schattenAn: false,
  darstellungsModus: 'material',
  renderStatusLabel: '',
  renderCloudLeer: true,
  onEinpassen: nichts,
  onRendern: nichts,
  onFuerVisAufnehmen: nichts,
  onTexturToggle: nichts,
  marqueeAktiv: false,
}));
