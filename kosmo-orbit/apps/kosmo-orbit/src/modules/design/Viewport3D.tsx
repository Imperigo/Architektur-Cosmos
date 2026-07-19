import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { gestenDetektor, kameraDarfSehen, mausBelegung, touchBelegung, werkzeugCursorFuer, type KameraAktion } from './eingabe-3d';
import { ViewportKontextmenue } from './ViewportKontextmenue';
import * as SunCalc from 'suncalc';
import { aufgeloesteDarstellung3d, offizielleDarstellung3d, deriveAllMitFensterdetails, finalerRenderPrompt, renderPromptBausteine, type ElementFangPunkt, type FreeMesh, type GeometryArtifact, type Pt, type Storey, type Wall } from '@kosmo/kernel';
import { Badge, KButton, KIcon, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import './viewport3d-chrome.css';
import { useProject } from '../../state/project-store';
import { useUiZustand } from '../../state/ui-zustand';
import type { ContextMesh } from './ifc-import';
import { pbrPalette } from '@kosmo/data';
import type { Fluchtlinie } from './zeichenhilfen';
import { NavLeiste } from './NavLeiste';
import { meshHandles, threeDeltaZuKernel } from './mesh-edit';
import { fitStrokes, type FittedSegment, type Stroke } from './sketch';
import type { SkizzeVarianteId } from './skizze-annaeherungen';
import {
  achsAbstand,
  groundHitToPlanPt,
  klassifiziereSketchTreffer,
  rayToPlanPt,
  wandTrefferZuOeffnung,
  type WandTrefferPunkt,
} from './sketch-3d';
// V-M1 (v0.6.6 W2 Stream D, UI-SELBSTKRITIK-065 Restliste Priorität 1):
// Render-Knopf im 3D-Viewport stösst DIESELBE KosmoVis-Render-Kette an wie
// die Vis-Station (NodeCanvas.tsx/VisWorkspace.tsx) — kein Parallelweg.
// `vis-jobs.ts`/`vis-runtime.ts` bleiben unangetastet (nur importiert); der
// Viewport bekommt einen eigenen, festen Laufzeit-Schlüssel im GEMEINSAMEN
// `useVisRuntime`-Store (Graph-Node-IDs sind UUIDs, kollidieren nie mit
// diesem Literal). Die Status-TEXTE «bereit»/«rendert» der Vis-Station
// (NodeCanvas testid `render-status`) bleiben unverändert — der Viewport
// trägt eigene `viewport-render-*`-testids.
import {
  abbrechenJob,
  bildAufsBlatt,
  bridgeBase,
  bridgeVermutlichCspGeblockt,
  freigebenJob,
  holeJob,
  istAuthFehler,
  mappeJobStatus,
  postRenderJob,
} from '../vis/vis-jobs';
import {
  istZeitUeberschritten,
  memoKey,
  OFFENE_LAUF_STATUS,
  RENDER_TIMEOUT_MS_DEFAULT,
  useVisRuntime,
  type NodeLaufStatus,
} from '../vis/vis-runtime';
// v0.6.7 Phase 0: «Für Vis aufnehmen» — ein kleiner, additiver Knopf (eigener
// testid, eigene Laufzeit-Ablage `aufnahmen`), KEINE Renderloop-/Kamera-
// Änderung. Der Viewport bleibt sonst unangetastet (s. Kommentar oben).
import { BridgeBild } from '../vis/BridgeBild';

/** Fester Laufzeit-Schlüssel des Viewport-Render-Knopfs im gemeinsamen
 *  `useVisRuntime`-Store — s. Import-Kommentar oben. */
const VIEWPORT_RENDER_NODE_ID = '__viewport3d-render__';

/** A4 (ROADMAP 155): Brüstung unter dieser Schwelle gilt als Boden-Anschlag → Tür statt Fenster. */
const SKETCH_TUER_SCHWELLE_MM = 150;

// Kontext-Layer (IFC-Bestand): sessionweit, nicht synchronisiert
let contextMeshes: ContextMesh[] = [];
let contextRevision = 0;
export function setContextMeshes(meshes: ContextMesh[]): void {
  contextMeshes = meshes;
  contextRevision++;
}

// Referenz-3D (Q14, T4c-Härtung): GLB aus KosmoData/KosmoAsset als studierbarer
// Kontext im Viewport. `revoke` markiert eine selbst erzeugte Blob-URL
// (URL.createObjectURL) — sie wird ERST nach Gebrauch (Erfolg oder Fehler in
// `syncGlb`) wieder freigegeben, nie vorher (ein laufender GLTFLoader-Fetch
// darf nicht reissen). Status-Events lassen Aufrufer (DataWorkspace) einen
// Ladezustand zeigen statt blind auf einen Erfolg zu hoffen.
export type GlbLoadStatus = 'loading' | 'loaded' | 'error';
export interface GlbStatusEvent {
  status: GlbLoadStatus;
  url: string;
  message?: string;
}
let glbRequest: { url: string; revoke: boolean } | null = null;
let glbRevision = 0;
const glbStatusListeners = new Set<(ev: GlbStatusEvent) => void>();
function emitGlbStatus(ev: GlbStatusEvent): void {
  for (const cb of glbStatusListeners) cb(ev);
}
/** Abonniert Lade-Status (loading/loaded/error) des Referenz-3D-Kontexts. */
export function subscribeGlbStatus(cb: (ev: GlbStatusEvent) => void): () => void {
  glbStatusListeners.add(cb);
  return () => {
    glbStatusListeners.delete(cb);
  };
}
export function setGlbContext(url: string | null, opts?: { revoke?: boolean }): void {
  glbRequest = url ? { url, revoke: opts?.revoke ?? false } : null;
  glbRevision++;
  if (url) emitGlbStatus({ status: 'loading', url });
}

// Sonnenstand (Q12 Schattenstudie): echtes Datum/Uhrzeit statt Studio-Sonne
let sunDate: Date | null = null;
let sunRevision = 0;
// Fallback Innerschweiz; mit gesetztem Projektstandort (V4) gewinnt das Doc
export const SONNE_STANDORT = { lat: 47.05, lng: 8.31 };
export function setSunDate(d: Date | null): void {
  sunDate = d;
  sunRevision++;
}

// Fassaden-Modulraster (V7-Ausbau): sichtbar auf den MassBody-Fassaden
let modulRaster: { b: number; h: number; elemente?: import('@kosmo/kernel').ModulElement[] } | null = null;
let modulRevision = 0;
export function setModulRaster(r: typeof modulRaster): void {
  modulRaster = r;
  modulRevision++;
}

// Splat-Kontext (Gaussian Splats der HomeStation: LingBot-Map/gsplat-Kette)
let splatCloud: import('./splat-import').SplatCloud | null = null;
let splatRevision = 0;
export function setSplatCloud(cloud: import('./splat-import').SplatCloud | null): void {
  splatCloud = cloud;
  splatRevision++;
}

CameraControls.install({ THREE });

/**
 * Viewport3D — plain three.js (kein react-three-fiber): der Kern liefert
 * transferable Arrays, wir wickeln sie kopierfrei in BufferGeometry.
 * Kern-Koordinaten (x Ost, y Nord, z Höhe, mm) → three (y-up, Meter):
 * (x, y, z)mm ↦ (x/1000, z/1000, −y/1000).
 */

const MM = 1 / 1000;

export interface GroundEvent {
  /** Weltpunkt in Kern-Koordinaten (mm, auf aktive Geschossebene projiziert). */
  p: Pt;
  shiftKey: boolean;
}

export interface ViewportHandlers {
  onGroundClick?: (e: GroundEvent) => void;
  onGroundMove?: (e: GroundEvent) => void;
  /** ArchiCAD-Geste: Doppelklick schliesst/setzt die laufende Platzierung ab. */
  onGroundDoubleClick?: (e: GroundEvent) => void;
  onEscape?: () => void;
  /** Vorschau-Polylinie in Kern-mm (Werkzeug-Gummiband). */
  previewLine?: Pt[] | null;
  /** KosmoSketch: Freihand-Overlay im Plan aktiv. */
  sketchMode?: boolean;
  /**
   * K16 A6: `meta` transportiert die im 2D-Overlay gewählte Annäherungs-
   * Variante (fürs Lernjournal) — der 3D-Weg hier ruft weiterhin ohne `meta`
   * auf (kein Annäherungs-Karten-UI im 3D-Viewport, `sketch3d-*`-Testids
   * bleiben unverändert, s. `sketch-3d-a4.spec.ts`).
   */
  onSketchAccept?: (segments: { a: Pt; b: Pt }[], meta?: { variante: SkizzeVarianteId; anzahl: number }) => void;
  /**
   * A4 (ROADMAP 155): ein im 3D-Viewport auf eine Wandfläche gezeichneter
   * Strich ergibt eine Öffnung statt eines Wand-Zugs — ein Aufruf pro Strich,
   * läuft beim Aufrufer über `design.oeffnungSetzen` (ein Undo-Schritt).
   */
  onSketchWandOeffnung?: (o: {
    wallId: string;
    openingType: 'fenster' | 'tuer';
    center: number;
    width: number;
    height: number;
    sill: number;
  }) => void;
  /** Auswahl-Werkzeug: Klick pickt Element statt zu zeichnen. */
  pickMode?: boolean;
  /** E1 (v0.8.5 PA1): `toggle` = Shift-Klick — toggelt das Element in der
   *  Mehrfach-Auswahl statt sie zu ersetzen; ohne opts bleibt das
   *  Bestandsverhalten (ersetzen) byte-gleich. */
  onPick?: (entityId: string | null, opts?: { toggle?: boolean }) => void;
  /** E1 (v0.8.5 PA1): Rubber-Band-Ergebnis — `ids` sind die vollständig im
   *  Rechteck liegenden Elemente; `additiv` = Shift gehalten (Vereinigung
   *  statt Ersetzen). */
  onMarqueeAuswahl?: (ids: string[], opts: { additiv: boolean }) => void;
  /** C-11 (PE3-Matrix v0.8.4): Kontextmenü «Eigenschaften» — wählt aus UND
   *  öffnet im Island-Modus den schwebenden Inspector (im manuell-Modus
   *  zeigt der gedockte Inspector die Auswahl ohnehin). */
  onEigenschaften?: (entityId: string) => void;
  /** 2D-Verschieben: Geste beginnt auf einem getroffenen Element (liefert false = kein Ziehen). */
  onMoveStart?: (entityId: string, p: Pt) => boolean;
  onMoveDrag?: (p: Pt) => void;
  onMoveEnd?: (p: Pt) => void;
  /** Lebende Zieh-Vorschau (Kern-mm), während `onMoveStart…onMoveEnd` läuft. */
  /** E1 (v0.8.5 PA1): `ids` gesetzt = Gruppen-Zug — ALLE gelisteten Elemente
   *  wandern live mit demselben Offset (Highlight-Vorschau in PlanView). */
  moveOffset?: { id: string; dx: number; dy: number; ids?: string[] } | null;
  /** T3-Zeichenhilfen: sichtbare Fluchtlinien (Ausrichtung an bestehenden Punkten) — nur 2D-Overlay (PlanView). */
  fluchtlinien?: Fluchtlinie[];
  /** F4 (v0.6.4): getroffener Element-Fangpunkt — PlanView malt den sichtbaren
   *  Marker (Quadrat=Endpunkt, Kreis=Mitte, Kreuz=Kante); nur 2D-Overlay. */
  fangPunkt?: ElementFangPunkt | null;
  /** V-H1 (v0.6.4): Live-Masszahl/Ziffern-Puffer am Zeichen-Gummiband —
   *  PlanView malt sie neben dem Cursor; nur 2D-Overlay. */
  massLabel?: string | null;
  /** T3: Shift hat den Winkel zum letzten Punkt auf 45°-Vielfache fixiert. */
  orthoAktiv?: boolean;
  /**
   * Block 3 / E4 (Buildplan FM3): ID des FreeMesh im Viewport-Editiermodus —
   * gesetzt zeigt der Viewport Vertex-Handles (eine Kugel je geschweisster
   * Position, `mesh-topo.ts` `gleichePositionen`) und macht die Flächen des
   * Meshs pickbar. KEIN allgemeines Gizmo-Framework, nur dieser eine Modus.
   */
  meshEditId?: string | null;
  /**
   * Ein Vertex-Handle-Drag endet (pointerup) — `indices` sind die
   * verschweissten Vertex-Indizes, `delta` das gerundete Kern-mm-Delta
   * (dx/dy/dz). Der Aufrufer committet EIN `design.meshVertexSchieben`.
   */
  onMeshVertexDrag?: (entityId: string, indices: number[], delta: { dx: number; dy: number; dz: number }) => void;
  /** Klick auf eine Mesh-Fläche im Editiermodus — `face` = Kernel-Dreiecks-
   * Index (deriveFreeMesh explodiert 1:1, `intersection.faceIndex` passt). */
  onMeshFaceClick?: (entityId: string, face: number) => void;
  /**
   * E3 (v0.8.5 PB1, docs/V085-SPEZ.md §7 C-15/C-16/C-17): Griff-Ziehen an
   * Wand-/Masskette-Endpunkten und Zonen-/Volumen-/Dach-Ecken — reines
   * 2D-Overlay (PlanView malt die Quadrate UND testet den Treffer selbst,
   * `onMeshVertexDrag`-Vorbild oben, KEIN allgemeines Gizmo-Framework,
   * Sanktion D4/E3). `griffKey` ist `'a'|'b'` bei einer Wand, sonst der
   * Punktindex (Masskette-Punkt bzw. Zonen-/Volumen-/Dach-Outline-Ecke).
   * `onGriffStart` liefert `false`, wenn das Element/der Griff (noch) nicht
   * ziehbar ist — PlanView startet dann kein Gummiband.
   */
  onGriffStart?: (entityId: string, griffKey: string | number, p: Pt) => boolean;
  onGriffDrag?: (p: Pt) => void;
  onGriffEnd?: (p: Pt) => void;
  /** Lebende Zieh-Vorschau des angefassten Griffs (Kern-mm, bereits
   *  gefangen) — PlanView malt daraus das Gummiband + den verschobenen
   *  Griff, analog zu `moveOffset` oben. */
  griffOffset?: { id: string; key: string | number; p: Pt } | null;
}

import { materialKarten, texturenAktiv } from './texturen';
import {
  effektiveLeistungsStufe,
  istRenderBeiBedarfAn,
  leistungRevisionAktuell,
  leistungsStufeLabel,
  pixelRatioFuerStufe,
  schattenAnFuerStufe,
} from '../../state/leistung';
// v0.7.6 Welle 1 Stream A: 3D-Viewport-Chrome (Header/Rail/Modi/HUD/
// Achsenkreuz/Zoom) — reine Overlay-Komponente + Daten-Modul, s.
// `ViewportChrome.tsx`-Kopfkommentar für die Layout-/Ehrlichkeits-Begründung.
import { ViewportChrome } from './ViewportChrome';
import { brennweiteAusFov, zoomProzent as chromeZoomProzent, type ViewportModusId } from './viewport-modi';
// v0.7.8 Welle 2 / Paket P5 («HUDs als echte Dock-Floats»): Modus-Leiste,
// Werkzeug-Rail und Orientierungskreuz rendern jetzt als `DockPanel`-Floats
// über `DesignWorkspace.tsx`/`DockFlaeche` — dieser Store spiegelt NUR die
// dafür nötigen primitiven Werte nach aussen (s. Kopfkommentar der Datei).
import { useViewportChromeRuntime } from '../../state/viewport-chrome-runtime';

// C2: Textur-Umschalter — Rebuild des Modells beim Wechsel
let texturRevision = 0;
export function setTexturModus(an: boolean): void {
  localStorage.setItem('kosmo.texturen', an ? '1' : '0');
  texturRevision++;
}

// PBR aus dem Materialkatalog (Q14) + Derive-Sonderschlüssel
const materialPalette: Record<string, { color: number; roughness: number; metalness?: number }> = {
  ...pbrPalette,
  masse: { color: 0xd8cfc0, roughness: 0.95 },
  dach: { color: 0x6e5f52, roughness: 0.85 },
  // E4 (docs/V071-KONZEPT.md): Terrain-Gelände-Band (derive/scene.ts,
  // materialKey 'terrain') — erdiger Ton, sehr rau/matt, KEINE Textur
  // (der Materialkatalog kennt den Schlüssel 'terrain' nicht, `materialKarten`
  // liefert dafür immer null — s. texturen.ts). Im Weiss-/Schwarzmodell
  // greift dieselbe darstellung3d-Weiche wie bei Wänden (unten), das
  // Terrain folgt also dem Modus statt einer eigenen Sonderfarbe.
  terrain: { color: 0x6b5842, roughness: 0.97 },
  // Restfix Stream 6B (docs/V071-KONZEPT.md E5/4A): Standard-Fensterrahmen
  // (materialKey 'fenster-rahmen', derive/scene.ts `deriveFensterRahmenStandard`
  // + das parametrische Profil in `deriveFensterProfile`) fehlte im
  // Materialkatalog (`packages/kosmo-data` `materialkatalog.ts` kennt den
  // Schlüssel nicht) und fiel deshalb auf 'default' zurück. Heller, leicht
  // warmer Grauton (Fensterprofil-Lack/Aluminium), moderate Rauheit — sichtbar
  // heller/wärmer als 'default', kein Metall-Glanz. Weissmodell-/Schwarzmodus-
  // Weiche unten (darstellung3d) bleibt unberührt, sie überschreibt die Farbe ohnehin.
  'fenster-rahmen': { color: 0xe4ddce, roughness: 0.55 },
  default: { color: 0xcfccc4, roughness: 0.9 },
};

// Serie J / J2: eine einzige KameraAktion → camera-controls-ACTION-Map. Ersetzt
// die frühere T3-`NAV_ACTION` — die gesamte Maus-Belegung (linker Klick nach
// NavModus, Mitteltaste=Orbit, Shift+Mitte=Pan, rechts=Pan) kommt jetzt aus
// `mausBelegung()` in eingabe-3d.ts, dieser Map bleibt die einzige three-Kopplung.
type MausAktion = CameraControls['mouseButtons']['left'];
const AKTION_ACTION: Record<KameraAktion, MausAktion> = {
  rotate: CameraControls.ACTION.ROTATE,
  truck: CameraControls.ACTION.TRUCK,
  dolly: CameraControls.ACTION.DOLLY,
  none: CameraControls.ACTION.NONE,
};

// Serie J / J1a: Touch-Belegung (eingabe-3d.ts) → camera-controls-Touch-ACTIONs.
// Einzige three-Kopplung des einheitlichen Eingabemodells auf der Touch-Seite.
const TOUCH_ACTION = {
  rotate: CameraControls.ACTION.TOUCH_ROTATE,
  truck: CameraControls.ACTION.TOUCH_TRUCK,
  dollyTruck: CameraControls.ACTION.TOUCH_DOLLY_TRUCK,
} as const;

export function Viewport3D({ handlers }: { handlers: React.RefObject<ViewportHandlers> }) {
  // v0.7.0 E3: der aufgelöste 3D-Darstellungsmodus ('auto' reagiert auf
  // siaPhase) als React-Zustand für den ehrlichen Beweis-Anker
  // `data-darstellung3d` am Viewport-Container — der three.js-Rebuild selbst
  // (Materialfarben unten) liest denselben Wert direkt aus dem Doc, dieser
  // Selektor sorgt nur für den DOM-Beweis. `doc.settings` ist Teil des einen
  // KosmoDoc, jede `runCommand`-Änderung (auch reine Settings-Patches, s.
  // `KosmoDoc.apply`) bumpt die Store-`revision` — der Selektor reagiert
  // also automatisch auf `design.darstellung3dSetzen` UND jeden
  // `siaPhase`-Wechsel, ohne einen eigenen Revision-Zähler zu brauchen.
  const darstellung3dAufgeloest = useProject((s) => aufgeloesteDarstellung3d(s.doc.settings));
  // PD3c (Owner-Befehl 17.07. «alles weg bitte alles in die islands»,
  // `docs/ISLAND-UI-SPEZ.md` §6 Sanktion 7): die Bottom-Leiste (Zoom-
  // Steuerung + Raster/Texturen/Kontext-Chips, `ViewportChrome.tsx`) und die
  // Nav-Leiste (Orbit/Pan/Zoom/Einpassen, unten) sind reine Viewport-Chrome
  // ausserhalb der vier Islands/der Ansichts-Info — im Island-Modus
  // verschwinden beide (s. Rückgabe-JSX unten), im Modus 'manuell' bleiben
  // sie byte-gleich wie heute.
  const designOberflaeche = useUiZustand((s) => s.designOberflaeche);
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<CameraControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  // v0.7.6 Welle 1 Stream A: 3D-Viewport-Chrome — echte Kamera-Referenz +
  // Ausgangsdistanz (fürs Zoom-Prozent, camera-controls kennt selbst keinen
  // Prozentwert) + ein leichtgewichtiges Poll-Snapshot fürs HUD/Panel/
  // Achsenkreuz. KEIN neuer Renderloop — dieselbe 400ms-Kadenz wie die
  // bestehenden Polls in dieser Datei (Render-Status: 2500ms), nur enger,
  // weil Kamera-Orientierung sich sichtbar schneller ändert.
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const distanzStartRef = useRef(1);
  const [viewportBereit, setViewportBereit] = useState(false);
  const [viewportModus, setViewportModus] = useState<ViewportModusId>('modellieren');
  const [werkzeugProModus, setWerkzeugProModus] = useState<Record<ViewportModusId, string>>({
    modellieren: 'auswahl',
    kamera: 'auswahl',
    review: 'auswahl',
  });
  const [texturenChromeAn, setTexturenChromeAn] = useState(() => texturenAktiv());
  const [vollbildAktiv, setVollbildAktiv] = useState(false);
  const [chromeSnapshot, setChromeSnapshot] = useState({
    azimutRad: 0,
    polarGrad: 90,
    distanzM: 1,
    fovGrad: 45,
    breitePx: 16,
    hoehePx: 9,
    kontextAnzahl: 0,
    splatAktiv: false,
    sonnenDatum: null as Date | null,
  });
  // v0.6.7 P0: für den «Für Vis aufnehmen»-Knopf — rendert EINEN Frame mit
  // der aktuellen Kamera (wie jeder normale Frame, keine Bewegung) und liest
  // danach sofort das Canvas-Pixelbild; rührt sonst nichts an.
  // v0.7.3 D5: optionale `{offiziell, zweck}` — s. Kommentar bei der
  // Zuweisung unten (Material-Swap in den amtlichen Modus, garantierter
  // Rückbau, KEINE bleibende Änderung am Arbeitsmodus).
  const captureRef = useRef<((opts?: { offiziell?: boolean; zweck?: 'situation' | 'volumennachweis' }) => string) | null>(null);
  const [navModus, setNavModus] = useState<'orbit' | 'pan' | 'zoom'>('orbit');
  const navModusRef = useRef<'orbit' | 'pan' | 'zoom'>('orbit');
  // Serie J / J2: Rechtsklick-/Long-Press-Kontextmenü. x/y positionieren das
  // Menü im Viewport, clientX/Y speisen den Raycast der Menü-Aktionen.
  const [kontext, setKontext] = useState<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const setKontextRef = useRef(setKontext);
  setKontextRef.current = setKontext;
  // E5 (v0.8.7 PB2, docs/V087-SPEZ.md §3): Shift-Drag-Marquee — Screen-Space-
  // Rechteck (Client-px relativ zur Canvas-Ecke) fürs sichtbare Aufzieh-
  // Overlay. Derselbe Ref-Brücken-Trick wie `kontext`/`setKontextRef` oben:
  // der Szenenaufbau-Effekt weiter unten ist imperativ/three.js-pur und
  // schreibt React-State nur über einen stabilen Ref auf den Setter.
  const [marquee3d, setMarquee3d] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const setMarquee3dRef = useRef(setMarquee3d);
  setMarquee3dRef.current = setMarquee3d;
  // J1b (Fable-Auflage): der Menü-offen-Zustand fliesst in die EINE
  // Capture-Down-Entscheidung ein (kein zweiter, verstreuter enabled-Schreiber)
  // — solange das Kontextmenü offen ist, bleibt die Kamera still.
  const kontextOffenRef = useRef(false);
  useEffect(() => {
    kontextOffenRef.current = !!kontext;
  }, [kontext]);

  // v0.7.8 Welle 2 / Paket P5 («HUDs als echte Dock-Floats»): Modus-Leiste
  // und Werkzeug-Rail rendern jetzt ausserhalb dieser Komponente (Floats in
  // `DesignWorkspace.tsx`/`DockFlaeche`, s. `viewport-chrome-runtime.ts`).
  // `viewportModusRef` hält den aktuellen Modus für `chromeWerkzeugWechsel`
  // bereit (unten, jetzt `useCallback([])` für eine STABILE Funktions-
  // Referenz — der Store registriert sie NUR EINMAL, s. Registrier-Effekt
  // weiter unten) — ohne den Ref griffe die Closure sonst dauerhaft den
  // Modus vom ERSTEN Render (klassischer Stale-Closure-Bug bei `useCallback`
  // mit leeren Deps).
  const viewportModusRef = useRef<ViewportModusId>('modellieren');
  useEffect(() => {
    viewportModusRef.current = viewportModus;
  }, [viewportModus]);

  // T5 (Owner-Laptoptest, Punkt 3) + A4-Erweiterung (ROADMAP 155, Owner-
  // Entscheid «Beides/Raycast»): Freihand-Skizzieren im 3D-Viewport — der
  // Bildschirm-Strahl trifft jetzt per Raycast die tatsächliche Fläche
  // (Wand/Decke/Volumen/Dach/Bodenraster, sketch-3d.ts reine Geometrie), die
  // Bedeutung hängt vom getroffenen Bauteil ab: Wandfläche → EIN Strich = EINE
  // Öffnung (`onSketchWandOeffnung`, sofort bei Strichende, ohne den Batch-
  // Review-Weg); alles andere (Boden/Terrain/Decke/Volumen/Dach — «boden»)
  // bleibt der bestehende Wand-Zug über denselben Batch-Fit/Übergabe-Weg wie
  // das 2D-Overlay (sketch.ts, `onSketchAccept`), jetzt auf die real
  // getroffene Fläche projiziert statt nur die flache Geschossebene. Fällt
  // der Strahl ins Leere (kein Mesh getroffen), bleibt die alte flache Ebene
  // der aktiven Geschossebene der Fallback. Die Art wird beim Strichbeginn
  // festgelegt und für den ganzen Strich beibehalten.
  const [sketchModeAn, setSketchModeAn] = useState(false);
  const [sketchStrokes, setSketchStrokes] = useState<Stroke[]>([]);
  const [sketchPending, setSketchPending] = useState<FittedSegment[] | null>(null);
  const sketchStrokesRef = useRef<Stroke[]>([]);
  const sketchPendingRef = useRef<FittedSegment[] | null>(null);
  useEffect(() => {
    sketchStrokesRef.current = sketchStrokes;
  }, [sketchStrokes]);
  useEffect(() => {
    sketchPendingRef.current = sketchPending;
  }, [sketchPending]);

  const sketchUebergeben = () => {
    const segments = fitStrokes(sketchStrokesRef.current);
    if (segments.length > 0) setSketchPending(segments);
  };
  const sketchUebernehmen = () => {
    if (!sketchPending) return;
    handlers.current?.onSketchAccept?.(sketchPending);
    setSketchPending(null);
    setSketchStrokes([]);
  };
  const sketchAllesVerwerfen = () => {
    setSketchStrokes([]);
    setSketchPending(null);
  };

  // V-M1: Render-Knopf — Laufzeit-Zustand kommt 1:1 aus dem gemeinsamen
  // `useVisRuntime`-Store (wie ein Vis-Node), nur unter dem festen Schlüssel
  // `VIEWPORT_RENDER_NODE_ID` statt einer Graph-Node-ID.
  const renderLauf = useVisRuntime((s) => s.laeufe[VIEWPORT_RENDER_NODE_ID]);
  const renderStatus: NodeLaufStatus | 'bereit' = renderLauf?.status ?? 'bereit';
  const renderLaeuftNoch = (OFFENE_LAUF_STATUS as readonly string[]).includes(renderStatus);
  const renderCloudLeer = bridgeBase() === '';

  // Eigener Poll (2.5 s, dasselbe Intervall wie NodeCanvas/EinfachAnsicht) —
  // fragt NUR den einen Viewport-Lauf ab, fasst keine fremden Node-Läufe an.
  useEffect(() => {
    const t = setInterval(() => {
      const lauf = useVisRuntime.getState().laeufe[VIEWPORT_RENDER_NODE_ID];
      if (!lauf || !(OFFENE_LAUF_STATUS as readonly string[]).includes(lauf.status)) return;
      const jetzt = Date.now();
      const limitMs = Number(localStorage.getItem('kosmo.render.timeoutMs')) || RENDER_TIMEOUT_MS_DEFAULT;
      if (istZeitUeberschritten(lauf, jetzt, limitMs)) {
        useVisRuntime.getState().patchLauf(VIEWPORT_RENDER_NODE_ID, {
          status: 'zeitueberschreitung',
          fehler: 'Zeitüberschreitung — Bridge/GPU meldet sich nicht.',
        });
        return;
      }
      if (!lauf.jobId) return;
      const jobId = lauf.jobId;
      void holeJob(jobId)
        .then((j) => {
          if (useVisRuntime.getState().laeufe[VIEWPORT_RENDER_NODE_ID]?.jobId !== jobId) return;
          if (j.result) {
            useVisRuntime.getState().patchLauf(VIEWPORT_RENDER_NODE_ID, {
              status: 'fertig',
              bild: j.result.images[0] ?? '',
              qa: j.result.qa,
            });
          } else if (j.status === 'error') {
            useVisRuntime.getState().patchLauf(VIEWPORT_RENDER_NODE_ID, { status: 'fehler', fehler: 'Render fehlgeschlagen' });
          } else {
            useVisRuntime.getState().patchLauf(VIEWPORT_RENDER_NODE_ID, { status: mappeJobStatus(j) });
          }
        })
        .catch((err) => {
          if (useVisRuntime.getState().laeufe[VIEWPORT_RENDER_NODE_ID]?.jobId !== jobId) return;
          if (istAuthFehler(err)) {
            useVisRuntime.getState().patchLauf(VIEWPORT_RENDER_NODE_ID, {
              status: 'fehler',
              fehler: 'Bridge lehnt ab — Token fehlt oder ist falsch (KosmoVis-Einstellungen).',
            });
          }
          // Transiente Netzfehler NICHT hochziehen — der nächste Poll fasst nach.
        });
    }, 2500);
    return () => clearInterval(t);
  }, []);

  // v0.7.6 Welle 1 Stream A: Chrome-Snapshot — liest NUR echte, bereits
  // vorhandene Laufzeitwerte (Kamera-Winkel/-Distanz/-FOV, Canvas-Grösse,
  // Kontext-Mesh-Anzahl, Splat-/Sonnendatum-Zustand); erfindet nichts.
  useEffect(() => {
    const t = setInterval(() => {
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      const rect = mountRef.current?.getBoundingClientRect();
      if (!controls || !camera || !rect) return;
      setChromeSnapshot({
        azimutRad: controls.azimuthAngle,
        polarGrad: (controls.polarAngle * 180) / Math.PI,
        distanzM: controls.distance,
        fovGrad: camera.fov,
        breitePx: Math.max(1, Math.round(rect.width)),
        hoehePx: Math.max(1, Math.round(rect.height)),
        kontextAnzahl: contextMeshes.length,
        splatAktiv: splatCloud !== null,
        sonnenDatum: sunDate,
      });
      // P5: Orientierungskreuz-Float liest NUR `azimutRad` aus dem Runtime-
      // Store (s. Kopfkommentar dort) — derselbe 400ms-Takt, kein zweiter
      // Poll. Bewusst NICHT der ganze Snapshot: die anderen Werte hier
      // ändern sich (Distanz/FOV/Kontext) und würden sonst unnötig oft den
      // Store-Selektor der Orientierungs-Float-Komponente feuern.
      useViewportChromeRuntime.setState({ azimutRad: controls.azimuthAngle });
    }, 400);
    return () => clearInterval(t);
  }, []);

  const renderStarten = () => {
    const { doc } = useProject.getState();
    // Kein Formular im Viewport (bewusst schlank) — derselbe Zusammenführungs-
    // Weg wie die Vis-Station (kernel `finalerRenderPrompt`/`renderPromptBausteine`),
    // nur ohne Stimmungs-/Freitext-Zusatz.
    const prompt = finalerRenderPrompt('', '', renderPromptBausteine(doc));
    const auftrag = { prompt, faithful: 0.8, samples: 128 };
    useVisRuntime.getState().setzeLauf(VIEWPORT_RENDER_NODE_ID, {
      status: 'gesendet',
      memoKey: memoKey(auftrag),
      gestartetUm: Date.now(),
    });
    void postRenderJob(auftrag)
      .then((j) =>
        useVisRuntime.getState().patchLauf(VIEWPORT_RENDER_NODE_ID, {
          jobId: j.job_id,
          status: mappeJobStatus(j),
          ...(j.approval_token !== undefined ? { approvalToken: j.approval_token } : {}),
        }),
      )
      .catch((err) => {
        // Ehrliche Offline-/CSP-Meldung — WORTGLEICH der Weg aus
        // NodeCanvas.tsx `ausfuehren()` (kein eigener, abweichender Text).
        const offline = err instanceof TypeError;
        const cspGeblockt = offline && bridgeVermutlichCspGeblockt();
        useVisRuntime.getState().patchLauf(VIEWPORT_RENDER_NODE_ID, {
          status: 'fehler',
          fehler: cspGeblockt
            ? 'Bridge-Adresse ist eine LAN-IP, die die CSP nicht erlaubt (nur localhost/127.0.0.1) — am selben Gerät über localhost ansprechen. (Offline)'
            : offline
              ? 'Bridge nicht erreichbar — läuft die HomeStation-Bridge? (Offline)'
              : err instanceof Error
                ? err.message
                : String(err),
        });
        meldeFehler(err);
      });
  };

  const renderFreigeben = () => {
    const lauf = useVisRuntime.getState().laeufe[VIEWPORT_RENDER_NODE_ID];
    if (!lauf?.jobId || !lauf.approvalToken) return;
    void freigebenJob(lauf.jobId, lauf.approvalToken)
      .then((j) => useVisRuntime.getState().patchLauf(VIEWPORT_RENDER_NODE_ID, { status: mappeJobStatus(j) }))
      .catch(meldeFehler);
  };
  const renderAbbrechen = () => {
    const lauf = useVisRuntime.getState().laeufe[VIEWPORT_RENDER_NODE_ID];
    if (!lauf?.jobId) return;
    void abbrechenJob(lauf.jobId)
      .then((j) => useVisRuntime.getState().patchLauf(VIEWPORT_RENDER_NODE_ID, { status: mappeJobStatus(j) }))
      .catch(meldeFehler);
  };
  const renderAufsBlatt = () => {
    if (!renderLauf?.jobId || !renderLauf.bild) return;
    void bildAufsBlatt(renderLauf.jobId, renderLauf.bild, 'Viewport-Render')
      .then((name) => melde(`Render liegt auf «${name}» — im KosmoPublish weiterschieben`, { ton: 'erfolg' }))
      .catch(meldeFehler);
  };

  /**
   * v0.6.7 P0 «Für Vis aufnehmen» — echte lokale Bildquelle ohne HomeStation:
   * ein Schnappschuss des aktuellen Viewport-Pixelbilds landet NUR im
   * gemeinsamen `useVisRuntime`-Store (`aufnahmen`, entities.ts:500-505:
   * Bilder gehen nie durchs Doc/Undo/Yjs) — der `aufnahme`-Node in KosmoVis
   * zeigt ihn als sein Bild. Kein Rendering, kein Bridge-Job.
   * v0.7.3 D5: Beweis-Capture → rendert ZWINGEND im amtlichen Modus
   * (`{ offiziell: true }`, s. `captureRef.current`-Kommentar unten), NIE im
   * gerade gewählten Arbeitsmodus.
   */
  const fuerVisAufnehmen = () => {
    const capture = captureRef.current;
    if (!capture) return;
    try {
      const dataUrl = capture({ offiziell: true });
      useVisRuntime.getState().fuegeAufnahmeHinzu({
        id: `aufnahme_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
        dataUrl,
        zeit: Date.now(),
        kamera: 'aktuell',
      });
      melde('Bild für KosmoVis aufgenommen — im aufnahme-Node sichtbar (kein Rendering).', { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  };

  const RENDER_STATUS_LABEL: Record<string, string> = {
    bereit: 'bereit',
    gesendet: 'gesendet',
    wartetFreigabe: 'wartet auf Freigabe',
    wartetGpu: 'wartet auf GPU-Leerlauf',
    rendert: 'rendert',
    fertig: 'fertig',
    fehler: 'fehler',
    abgebrochen: 'abgebrochen',
    zeitueberschreitung: 'Zeitüberschreitung',
  };
  const renderIstFehler = renderStatus === 'fehler' || renderStatus === 'zeitueberschreitung';
  const renderKnopfLabel =
    renderStatus === 'bereit'
      ? 'Rendern'
      : renderLaeuftNoch
        ? 'Rendert …'
        : renderStatus === 'fertig'
          ? 'Neu rendern'
          : renderIstFehler
            ? 'Erneut versuchen'
            : 'Rendern';

  // v0.7.6 Welle 1 Stream A: 3D-Viewport-Chrome — abgeleitete ECHTE
  // Anzeigewerte fürs HUD/Eigenschaften-Panel (kein Fake, s. Kopfkommentar
  // `ViewportChrome.tsx`). `standort`/`activeStoreyId` kommen reaktiv aus
  // `useProject` (Doc/Undo-Zustand), der Rest aus dem 400ms-Poll oben bzw.
  // aus `leistung.ts` (bereits importiert für den Renderer selbst).
  const chromeStandort = useProject((s) => s.doc.settings.standort);
  // WICHTIG (Zustand/`useSyncExternalStore`): der Selektor MUSS eine stabile
  // Referenz liefern (hier die Storey-Entität selbst aus dem Doc), NIE ein
  // frisches Objekt-Literal — sonst hält React den Snapshot für „uncached“
  // und rendert in einer Endlosschleife (React-Fehler #185). Das abgeleitete
  // Label wird darum AUSSERHALB des Selektors gebaut.
  const chromeGeschossEntity = useProject((s) => {
    const st = s.activeStoreyId ? s.doc.get(s.activeStoreyId) : null;
    return st && st.kind === 'storey' ? st : null;
  });
  const chromeGeschossLabel = chromeGeschossEntity
    ? `${chromeGeschossEntity.name} (${(chromeGeschossEntity.elevation / 1000).toFixed(2)} m)`
    : null;
  const chromeStandortLabel = chromeStandort?.label ?? 'Innerschweiz (Fallback, s. SONNE_STANDORT)';
  const chromeBrennweiteMm = brennweiteAusFov(chromeSnapshot.fovGrad);
  const chromeZoomProzentWert = chromeZoomProzent(chromeSnapshot.distanzM, distanzStartRef.current);
  const chromeLeistungsStufeLabel = leistungsStufeLabel(effektiveLeistungsStufe());
  const chromeSchattenAn = schattenAnFuerStufe(effektiveLeistungsStufe());

  // «−»/«+» dollen relativ zur aktuellen Distanz (camera-controls kennt
  // selbst kein Zoom-Prozent) — echte Kamerabewegung, kein Kosmetik-Zähler.
  const chromeZoomKleiner = () => {
    const c = controlsRef.current;
    if (c) void c.dolly(-c.distance * 0.2, true);
  };
  const chromeZoomGroesser = () => {
    const c = controlsRef.current;
    if (c) void c.dolly(c.distance * 0.2, true);
  };
  useEffect(() => {
    const onFullscreenChange = () => setVollbildAktiv(document.fullscreenElement != null);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);
  const chromeVollbild = () => {
    const el = mountRef.current?.parentElement ?? mountRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  };
  // Spiegelt `setTexturModus` (oben, C2) in lokalen React-Zustand — der
  // eigentliche three.js-Rebuild folgt weiterhin `texturRevision` unten,
  // unverändert; die Chrome-Anzeige braucht nur ein sofort sichtbares Echo.
  const chromeTexturToggle = () => {
    const naechster = !texturenChromeAn;
    setTexturModus(naechster);
    setTexturenChromeAn(naechster);
  };
  // `useCallback([])` (STABILE Referenz, liest `viewportModusRef` statt der
  // geschlossenen `viewportModus`-Variable) — der Registrier-Effekt unten
  // schreibt diese Funktion nur EINMAL in den Store, s. Kommentar dort.
  const chromeWerkzeugWechsel = useCallback((id: string) => {
    setWerkzeugProModus((prev) => ({ ...prev, [viewportModusRef.current]: id }));
  }, []);

  // v0.7.8 Welle 2 / Paket P5: Modus/Werkzeug/Bereit-Zustand in
  // `viewport-chrome-runtime.ts` spiegeln — die vier HUD-Floats
  // (`DesignWorkspace.tsx`) lesen NUR von dort, kein Prop-Drilling durch
  // zwei ~2000-Zeilen-Dateien. Reine Zusatz-Effekte, ändern NICHTS am
  // bestehenden lokalen State/Verhalten dieser Komponente.
  useEffect(() => {
    useViewportChromeRuntime.setState({
      bereit: viewportBereit,
      modus: viewportModus,
      aktivesWerkzeug: werkzeugProModus[viewportModus] ?? 'auswahl',
    });
  }, [viewportBereit, viewportModus, werkzeugProModus]);
  useEffect(() => {
    // Registriert die (stabilen) Aktions-Callbacks EINMAL — `setViewportModus`
    // (React-Setter) und `chromeWerkzeugWechsel` (`useCallback([])`, s.o.)
    // sind über die gesamte Lebensdauer dieser Komponenteninstanz identisch.
    useViewportChromeRuntime.setState({ onModusWechsel: setViewportModus, onWerkzeugWechsel: chromeWerkzeugWechsel });
  }, [chromeWerkzeugWechsel]);
  useEffect(
    () => () => {
      // Unmount (z.B. Wechsel in die 2D-Ansicht, s. `DesignWorkspace.tsx`
      // `viewMode!=='2d'`-Guard) — die Floats müssen verschwinden, sonst
      // zeigt der Dock nach dem Wechsel Geister-HUDs ohne lebendige Kamera
      // dahinter.
      useViewportChromeRuntime.setState({ bereit: false });
    },
    [],
  );

  // v0.7.9 (A1, «Säulen ins Dock») — dieselbe Spiegelung wie der P5-Effekt
  // oben, additiv um genau die Werte erweitert, die die zwei NEU gefloateten
  // Blöcke (`viewportHudStatuskarte`/`viewportEigenschaften`,
  // `dock-stationen.ts`) brauchen — vorher direkt als `ViewportChromeProps`
  // durchgereicht (`ViewportChrome.tsx` behält die Props-Deklaration
  // unverändert für die weiterhin dort lebende Bottom-Leiste, liest diese
  // Felder selbst aber nicht mehr, s. dortigen Kopfkommentar). Reiner
  // Zusatz-Effekt, ändert nichts am bestehenden Zustand dieser Komponente.
  useEffect(() => {
    useViewportChromeRuntime.setState({
      polarGrad: chromeSnapshot.polarGrad,
      distanzM: chromeSnapshot.distanzM,
      brennweiteMm: chromeBrennweiteMm,
      aspektBreite: chromeSnapshot.breitePx,
      aspektHoehe: chromeSnapshot.hoehePx,
      geschossLabel: chromeGeschossLabel,
      kontextAnzahl: chromeSnapshot.kontextAnzahl,
      splatAktiv: chromeSnapshot.splatAktiv,
      texturenAn: texturenChromeAn,
      sonnenDatum: chromeSnapshot.sonnenDatum,
      standortLabel: chromeStandortLabel,
      leistungsStufeLabel: chromeLeistungsStufeLabel,
      schattenAn: chromeSchattenAn,
      darstellungsModus: darstellung3dAufgeloest,
      renderStatusLabel: RENDER_STATUS_LABEL[renderStatus] ?? renderStatus,
      renderCloudLeer,
    });
  }, [
    chromeSnapshot,
    chromeBrennweiteMm,
    chromeGeschossLabel,
    texturenChromeAn,
    chromeStandortLabel,
    chromeLeistungsStufeLabel,
    chromeSchattenAn,
    darstellung3dAufgeloest,
    renderStatus,
    renderCloudLeer,
  ]);

  // Linker Klick folgt dem gewählten Modus (Mitteltaste/Rechts werden pro Geste
  // in onCaptureDown aus mausBelegung gesetzt, wegen Shift+Mitte). navModusRef
  // hält den aktuellen Modus für den Pointer-Handler bereit.
  useEffect(() => {
    navModusRef.current = navModus;
    if (controlsRef.current) {
      controlsRef.current.mouseButtons.left = AKTION_ACTION[mausBelegung(navModus, false).left];
    }
  }, [navModus]);

  useEffect(() => {
    const mount = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    // A9 (Owner-Befund K19, Leistungs-Autotuning): die beiden echten Qualitäts-
    // Schrauben (pixelRatio-Deckel, Schatten an/aus) folgen der effektiven
    // Leistungsstufe statt eines Fixwerts. Ohne Zustimmung/Messung liefert
    // effektiveLeistungsStufe() weiterhin 'hoch' (s. leistung.ts) — exakt das
    // bisherige Fixverhalten, keine unangekündigte Drosselung ohne Zustimmung.
    // Erst nach Zustimmung + tatsächlicher Prüfung (oder manuellem Override im
    // Einstellungen-Panel) weicht die Stufe davon ab; `syncLeistung` unten
    // hält den Renderer synchron, ohne den Viewport neu zu mounten.
    renderer.setPixelRatio(pixelRatioFuerStufe(effektiveLeistungsStufe(), window.devicePixelRatio));
    renderer.shadowMap.enabled = schattenAnFuerStufe(effektiveLeistungsStufe());
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    // Serie J / J1a: ohne `touch-action: none` scrollt/zoomt iPad-Safari die
    // Seite statt der Kamera; `user-select: none` verhindert Text-Auswahl beim
    // Ziehen. J2 (Fable-Review-1-Auflage): camera-controls räumt diese Styles
    // beim `enabled=false`-Toggle wieder ab — darum als Helfer, der nach jedem
    // Toggle erneut gesetzt wird (sonst scrollt Safari mitten im Stift-Strich).
    const setzeTouchStyles = () => {
      renderer.domElement.style.touchAction = 'none';
      renderer.domElement.style.userSelect = 'none';
    };
    setzeTouchStyles();

    const scene = new THREE.Scene();
    const cssVar = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#edeae2';
    scene.background = new THREE.Color(cssVar('--k-viewport-sky'));

    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 2000);
    const controls = new CameraControls(camera, renderer.domElement);
    controls.setLookAt(18, 14, 18, 4, 0, -4, false);
    controls.dollyToCursor = true;
    // Serie J / J1a: weiche Dämpfung — `draggingSmoothTime` ist direkt an der
    // Hand (kaum Verzug beim Ziehen), `smoothTime` lässt die Kamera nach dem
    // Loslassen sanft ausrollen. Ehrliche Grenze: das ist camera-controls-
    // natives Damping, kein simuliertes iOS-Flick-Momentum (siehe Buildplan §6).
    controls.draggingSmoothTime = 0.05;
    controls.smoothTime = 0.25;
    // Serie J / J2: volle Maus-Belegung aus mausBelegung — Mitteltaste=Orbit,
    // rechts=Pan (Shift+Mitte→Pan setzt onCaptureDown pro Geste).
    {
      const b = mausBelegung(navModus, false);
      controls.mouseButtons.left = AKTION_ACTION[b.left];
      controls.mouseButtons.middle = AKTION_ACTION[b.middle];
      controls.mouseButtons.right = AKTION_ACTION[b.right];
    }
    // Touch explizit belegen (bisher unkonfigurierte Defaults): 1 Finger Orbit,
    // 2 Finger Pan+Pinch-Zoom (zum Pinch-Zentrum via dollyToCursor), 3 Finger
    // Pan — aus der einzigen Quelle der Wahrheit `eingabe-3d.ts`.
    {
      const t = touchBelegung();
      controls.touches.one = TOUCH_ACTION[t.one as 'rotate' | 'truck'];
      controls.touches.two = TOUCH_ACTION[t.two];
      controls.touches.three = TOUCH_ACTION[t.three as 'rotate' | 'truck'];
    }
    controls.saveState(); // Home-Punkt für die «Einpassen»-Taste (reset())
    controlsRef.current = controls;
    // v0.7.6 Welle 1 Stream A: 3D-Viewport-Chrome — Kamera-Referenz +
    // Ausgangsdistanz (Zoom-Prozent-Basis) + Sichtbarkeits-Guard («nur wenn
    // Daten vorhanden», hier: sobald der Mount tatsächlich steht).
    cameraRef.current = camera;
    distanzStartRef.current = controls.distance;
    setViewportBereit(true);

    // E4 (v0.8.7, docs/V087-SPEZ.md §3): KAMERA-HUD ereignisbasiert — camera-
    // controls dispatcht 'control' (während einer Nutzer-Geste, z.B. je
    // pointermove-Schritt), 'update' (JEDER echte Bewegungs-Tick — exakt
    // dieselbe Bedingung, unter der `controls.update()` im Renderloop unten
    // `true` zurückgibt, s. Bibliotheksquelle camera-controls.module.js:2263-
    // 2269) und 'rest' (Bewegung/Transition ausgelaufen, inkl. programmatische
    // `setLookAt(...)`-Sprünge). Ein rAF-Throttle bündelt mehrfache Events
    // desselben Frames (mehrere native pointermove-'control'-Events VOR dem
    // nächsten Repaint sind möglich) auf HÖCHSTENS einen State-Write pro
    // Frame — kein Re-Render-Sturm beim Orbit. Der bestehende 400ms-Poll
    // (unten) bleibt als Fallback für Werte ohne Event-Kanal (Canvas-Rect,
    // Kontext-/Splat-/Sonnen-Zustand) unangetastet.
    let camHudRaf = 0;
    let camHudEventCount = 0; // Test-Beweis (E2E-Hook unten): zählt NUR ereignisgetriebene Schreibungen, getrennt vom 400ms-Poll-Zähler.
    const schreibeKameraHud = () => {
      camHudRaf = 0;
      const c = controlsRef.current;
      const cam = cameraRef.current;
      if (!c || !cam) return;
      setChromeSnapshot((prev) => ({
        ...prev,
        azimutRad: c.azimuthAngle,
        polarGrad: (c.polarAngle * 180) / Math.PI,
        distanzM: c.distance,
        fovGrad: cam.fov,
      }));
      // Derselbe Store-Write wie der 400ms-Poll unten (P5: Orientierungskreuz-
      // Float liest nur azimutRad) — jetzt zusätzlich ereignisgetrieben.
      useViewportChromeRuntime.setState({ azimutRad: c.azimuthAngle });
      camHudEventCount++;
    };
    const kameraHudEvent = () => {
      if (camHudRaf) return; // schon ein Write für DIESEN Frame geplant
      camHudRaf = requestAnimationFrame(schreibeKameraHud);
    };
    controls.addEventListener('control', kameraHudEvent);
    controls.addEventListener('update', kameraHudEvent);
    controls.addEventListener('rest', kameraHudEvent);

    // Licht: warme Sonne + weiches Himmelslicht
    const sun = new THREE.DirectionalLight(0xfff3e0, 2.6);
    sun.position.set(30, 42, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    sun.shadow.bias = -0.0003;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xf2f4f8, 0xb8b0a2, 0.9));

    // Sonnenstand (Q12): suncalc → Lichtrichtung; ohne Datum bleibt die Studio-Sonne
    let lastSunRevision = -1;
    function syncSun() {
      if (sunRevision === lastSunRevision) return;
      lastSunRevision = sunRevision;
      if (!sunDate) {
        sun.position.set(30, 42, 18);
        sun.intensity = 2.6;
        return;
      }
      const standort = useProject.getState().doc.settings.standort;
      const p = SunCalc.getPosition(
        sunDate,
        standort?.lat ?? SONNE_STANDORT.lat,
        standort?.lon ?? SONNE_STANDORT.lng,
      );
      // suncalc: azimuth 0 = Süd, +West; three: x Ost, y oben, z Süd
      const d = 70;
      const x = -Math.sin(p.azimuth) * Math.cos(p.altitude) * d;
      const y = Math.max(Math.sin(p.altitude), 0.02) * d;
      const z = Math.cos(p.azimuth) * Math.cos(p.altitude) * d;
      sun.position.set(x, y, z);
      // unter dem Horizont: fast dunkel, flache Sonne: warm gedimmt
      sun.intensity = p.altitude <= 0 ? 0.15 : 1.2 + 1.6 * Math.min(Math.sin(p.altitude) * 2, 1);
    }

    // Boden + Raster (1m fein, 10m stark)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.ShadowMaterial({ opacity: 0.18 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(200, 200, 0xb9b3a4, 0xd8d3c6);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    scene.add(grid);
    const gridMajor = new THREE.GridHelper(200, 20, 0xa39c8a, 0xa39c8a);
    (gridMajor.material as THREE.Material).transparent = true;
    (gridMajor.material as THREE.Material).opacity = 0.35;
    scene.add(gridMajor);

    // Modell-Gruppe: Kern-mm → three-Meter, y-up
    const model = new THREE.Group();
    model.scale.set(MM, MM, MM);
    scene.add(model);
    modelRef.current = model;

    const modulGroup = new THREE.Group();
    scene.add(modulGroup);
    const fensterMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a7bc0, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
    });
    let gezeichneteModulRevision = -1;
    let modulDocRevision = -1;
    function syncModulRaster() {
      const { revision: rev, doc: d } = useProject.getState();
      if (gezeichneteModulRevision === modulRevision && modulDocRevision === rev) return;
      gezeichneteModulRevision = modulRevision;
      modulDocRevision = rev;
      modulGroup.clear();
      if (!modulRaster) return;
      const punkte: THREE.Vector3[] = [];
      for (const m of d.byKind('mass') as import('@kosmo/kernel').MassBody[]) {
        const st = d.get(m.storeyId);
        const z0 = (st && st.kind === 'storey' ? st.elevation : 0) + m.baseOffset;
        for (let i = 0; i < m.outline.length; i++) {
          const a = m.outline[i]!;
          const b = m.outline[(i + 1) % m.outline.length]!;
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          // Kanten-Zuweisung übersteuert das globale Modul
          const zuweisung = m.module?.find((z) => z.kante === i + 1);
          const gezeichnet = zuweisung
            ? d.settings.fassadenModule.find((fm) => fm.name === zuweisung.modul)
            : undefined;
          const zellB = gezeichnet?.breite ?? modulRaster.b;
          const zellH = gezeichnet?.hoehe ?? modulRaster.h;
          const zellElemente = gezeichnet?.elemente ?? modulRaster.elemente ?? [];
          if (len < zellB) continue;
          const dx = (b.x - a.x) / len;
          const dy = (b.y - a.y) / len;
          // Vertikale Fugen ab Ecke (Eckenregel), horizontale je Modulhöhe
          for (let sMm = zellB; sMm < len; sMm += zellB) {
            const x = a.x + dx * sMm;
            const y = a.y + dy * sMm;
            punkte.push(new THREE.Vector3(x * MM, z0 * MM, -y * MM), new THREE.Vector3(x * MM, (z0 + m.height) * MM, -y * MM));
          }
          for (let hMm = zellH; hMm < m.height; hMm += zellH) {
            punkte.push(
              new THREE.Vector3(a.x * MM, (z0 + hMm) * MM, -a.y * MM),
              new THREE.Vector3(b.x * MM, (z0 + hMm) * MM, -b.y * MM),
            );
          }
          // Gezeichnete Modul-Elemente in jede Zelle (Fenster blau, Paneel Kontur)
          const elemente = zellElemente;
          if (elemente.length > 0) {
            const spalten = Math.floor(len / zellB);
            const zeilenZ = Math.floor(m.height / zellH);
            for (let c = 0; c < spalten; c++) {
              for (let r2 = 0; r2 < zeilenZ; r2++) {
                for (const el of elemente) {
                  const u0 = c * zellB + el.x;
                  const z1 = z0 + r2 * zellH + el.y;
                  const ecken = [
                    [u0, z1], [u0 + el.b, z1], [u0 + el.b, z1 + el.h], [u0, z1 + el.h],
                  ].map(([u, zz]) => new THREE.Vector3((a.x + dx * u!) * MM, zz! * MM, -(a.y + dy * u!) * MM));
                  for (let e2 = 0; e2 < 4; e2++) {
                    punkte.push(ecken[e2]!, ecken[(e2 + 1) % 4]!);
                  }
                  if (el.typ === 'fenster') {
                    const g2 = new THREE.BufferGeometry();
                    g2.setFromPoints([ecken[0]!, ecken[1]!, ecken[2]!, ecken[0]!, ecken[2]!, ecken[3]!]);
                    g2.computeVertexNormals();
                    modulGroup.add(new THREE.Mesh(g2, fensterMaterial));
                  }
                }
              }
            }
          }
        }
      }
      if (punkte.length > 0) {
        const g = new THREE.BufferGeometry().setFromPoints(punkte);
        modulGroup.add(
          new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9a7b2d, transparent: true, opacity: 0.85 })),
        );
      }
    }

    const previewGroup = new THREE.Group();
    previewGroup.scale.set(MM, MM, MM);
    scene.add(previewGroup);

    // Block 3 / E4 (Buildplan FM3): FreeMesh-Editiermodus — Vertex-Handles.
    // Eigene Gruppe mit derselben MM-Skalierung wie `model`, damit Handle-
    // Positionen direkt in Kern-mm (wie `artifactToObjects`) gesetzt werden
    // können. Nur befüllt, solange `handlers.current.meshEditId` gesetzt ist
    // (Performance-Auflage: Handles nur im Editiermodus, s. Buildplan §Regeln).
    const meshHandleGroup = new THREE.Group();
    meshHandleGroup.scale.set(MM, MM, MM);
    scene.add(meshHandleGroup);
    const meshHandleGeo = new THREE.SphereGeometry(140, 12, 8);
    const meshHandleMaterial = new THREE.MeshBasicMaterial({ color: 0xa84b2b, depthTest: false });
    let meshHandlesBuiltFor: { id: string; revision: number } | null = null;
    // Laufender Vertex-Drag (lokal, kein Command bis pointerup — NodeCanvas-
    // /T5-Muster): `plane` ist entweder die horizontale Ebene auf Höhe des
    // Handles (Normalfall) oder eine kamerazugewandte Vertikal-Ebene durch den
    // Handle (Shift = nur Höhe, dx/dy bleiben 0 — s. threeDeltaZuKernel).
    let meshDrag: {
      entityId: string;
      indices: number[];
      startWorld: THREE.Vector3;
      vertical: boolean;
      plane: THREE.Plane;
      handle: THREE.Mesh;
    } | null = null;

    function syncMeshHandles() {
      if (meshDrag) return; // nicht mitten im Ziehen neu aufbauen
      const id = handlers.current?.meshEditId ?? null;
      const { doc, revision: rev } = useProject.getState();
      if (!id) {
        if (meshHandlesBuiltFor) {
          meshHandleGroup.clear();
          meshHandlesBuiltFor = null;
        }
        return;
      }
      if (meshHandlesBuiltFor && meshHandlesBuiltFor.id === id && meshHandlesBuiltFor.revision === rev) return;
      meshHandlesBuiltFor = { id, revision: rev };
      meshHandleGroup.clear();
      const entity = doc.get<FreeMesh>(id);
      if (!entity || entity.kind !== 'freemesh') return;
      const storey = doc.get<Storey>(entity.storeyId);
      const elevation = storey && storey.kind === 'storey' ? storey.elevation : 0;
      for (const h of meshHandles(entity.positions)) {
        const handleMesh = new THREE.Mesh(meshHandleGeo, meshHandleMaterial);
        handleMesh.position.set(h.x, h.z + elevation, -h.y);
        handleMesh.userData['meshHandle'] = { entityId: id, indices: h.indices };
        meshHandleGroup.add(handleMesh);
      }
    }

    const meshHandleTrefferAt = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObjects(meshHandleGroup.children, false)[0] ?? null;
    };

    // T5, Punkt 3 + A4 (ROADMAP 155): KosmoSketch im 3D-Viewport — Roh-
    // Striche (dünn, gedämpft), der aktuell gezogene Strich (Akzentfarbe)
    // und die gefittete Vorschau (nach «Übergeben»). Boden/Terrain-Striche
    // liegen auf der real getroffenen Fläche (Fallback: flache Ebene der
    // aktiven Geschossebene); ein Wand-Strich liegt auf der Wandfläche
    // selbst (Weltkoordinaten der Treffer, nicht plan-projiziert).
    const sketchGroup = new THREE.Group();
    sketchGroup.scale.set(MM, MM, MM);
    scene.add(sketchGroup);
    const sketchRohMaterial = new THREE.LineBasicMaterial({ color: 0x9a9484, transparent: true, opacity: 0.6 });
    const sketchLiveMaterial = new THREE.LineBasicMaterial({ color: 0xa84b2b });
    const sketchPendingMaterial = new THREE.LineBasicMaterial({ color: 0xa84b2b });

    let sketchDrawing = false;
    let sketchLive: Pt[] = [];

    // A4: Bauteil-Art des laufenden Strichs (beim Strichbeginn festgelegt und
    // für den ganzen Strich beibehalten) + bei 'wand' die gelockte Wand samt
    // ihrem Mesh (fürs gezielte Nach-Raycasten während der Zug-Geste).
    let sketchArt: 'wand' | 'boden' | null = null;
    let sketchWandInfo: {
      wallId: string;
      a: Pt;
      b: Pt;
      laenge: number;
      storeyElevMm: number;
      maxHoeheMm: number;
      obj: THREE.Object3D;
    } | null = null;
    let sketchWandTreffer: WandTrefferPunkt[] = [];
    // Weltkoordinaten (Meter) der Wand-Treffer, nur fürs Live-Rendern der Vorschau.
    let sketchWandWelt: { x: number; y: number; z: number }[] = [];

    function aktiveElevation(): number {
      const { doc, activeStoreyId } = useProject.getState();
      const storey = activeStoreyId ? doc.get(activeStoreyId) : null;
      return storey && storey.kind === 'storey' ? storey.elevation : 0;
    }

    // Bildschirmpunkt → nächster Raycast-Treffer über allen Modell-Meshes
    // + Bodenraster (nur Mesh-Treffer zählen — Kanten-/LineSegments-Objekte
    // im Modell werden übersprungen, dasselbe Muster wie beim Element-Pick
    // weiter unten). `null`, wenn der Strahl nichts trifft (Blick über den
    // Horizont) — der Aufrufer fällt dann auf die flache Ebene zurück.
    function sketchRaycastNaechster(
      ev: PointerEvent,
    ): { point: { x: number; y: number; z: number }; obj: THREE.Object3D } | null {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects([...model.children, ground], false);
      const hit = hits.find((h) => (h.object as THREE.Mesh).isMesh);
      if (!hit) return null;
      return { point: { x: hit.point.x, y: hit.point.y, z: hit.point.z }, obj: hit.object };
    }

    // Bildschirmpunkt → flache Ebene der aktiven Geschossebene → Plan-mm.
    // Reine Geometrie in sketch-3d.ts. Fallback, wenn der Raycast nichts trifft.
    function sketchFlachEbenePunkt(ev: PointerEvent): Pt | null {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const o = raycaster.ray.origin;
      const d = raycaster.ray.direction;
      return rayToPlanPt(
        { origin: { x: o.x, y: o.y, z: o.z }, dir: { x: d.x, y: d.y, z: d.z } },
        aktiveElevation() * MM,
      );
    }

    // Boden/Terrain-Abtastung: die real getroffene Fläche (jede Mesh-Art
    // ausser Wand — Decke/Volumen/Dach/Treppe/Bodenraster), sonst die flache
    // Ebene. Horizontale Projektion (x/z) gilt unabhängig von der Trefferhöhe.
    function sketchBodenPunktVonEvent(ev: PointerEvent): Pt | null {
      const treffer = sketchRaycastNaechster(ev);
      if (treffer) return groundHitToPlanPt({ x: treffer.point.x, z: treffer.point.z });
      return sketchFlachEbenePunkt(ev);
    }

    const onSketchPointerDown = (ev: PointerEvent) => {
      if (sketchPendingRef.current) return;
      const treffer = sketchRaycastNaechster(ev);
      const { doc } = useProject.getState();
      const entityId = treffer ? (treffer.obj.userData['entityId'] as string | undefined) : undefined;
      const entityKind = entityId ? doc.get(entityId)?.kind : undefined;
      const art = klassifiziereSketchTreffer(entityKind);
      if (art === 'wand' && entityId && treffer) {
        const wall = doc.get<Wall>(entityId);
        const storey = wall ? doc.get(wall.storeyId) : undefined;
        if (wall && wall.kind === 'wall' && storey && storey.kind === 'storey') {
          const zBase = storey.elevation + wall.baseOffset;
          const zTop =
            wall.heightMode === 'fix' && wall.height ? zBase + wall.height : storey.elevation + storey.height;
          sketchArt = 'wand';
          sketchWandInfo = {
            wallId: entityId,
            a: wall.a,
            b: wall.b,
            laenge: Math.round(Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y)),
            storeyElevMm: storey.elevation,
            maxHoeheMm: zTop - storey.elevation,
            obj: treffer.obj,
          };
          const planPt = groundHitToPlanPt({ x: treffer.point.x, z: treffer.point.z });
          sketchWandTreffer = [
            {
              s: achsAbstand(wall.a, wall.b, planPt),
              hoehe: treffer.point.y * 1000 - storey.elevation,
            },
          ];
          sketchWandWelt = [treffer.point];
          (renderer.domElement as Element).setPointerCapture(ev.pointerId);
          sketchDrawing = true;
          return;
        }
      }
      // Boden/Terrain (oder kein Treffer): wie bisher ein Wand-Zug, jetzt auf
      // die real getroffene Fläche projiziert statt nur auf die flache Ebene.
      const p = treffer ? groundHitToPlanPt({ x: treffer.point.x, z: treffer.point.z }) : sketchFlachEbenePunkt(ev);
      if (!p) return;
      sketchArt = 'boden';
      sketchWandInfo = null;
      (renderer.domElement as Element).setPointerCapture(ev.pointerId);
      sketchDrawing = true;
      sketchLive = [p];
    };
    const onSketchPointerMove = (ev: PointerEvent) => {
      if (!sketchDrawing) return;
      if (sketchArt === 'wand' && sketchWandInfo) {
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.set(
          ((ev.clientX - rect.left) / rect.width) * 2 - 1,
          -((ev.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObject(sketchWandInfo.obj, false)[0];
        if (hit) {
          const planPt = groundHitToPlanPt({ x: hit.point.x, z: hit.point.z });
          sketchWandTreffer.push({
            s: achsAbstand(sketchWandInfo.a, sketchWandInfo.b, planPt),
            hoehe: hit.point.y * 1000 - sketchWandInfo.storeyElevMm,
          });
          sketchWandWelt.push({ x: hit.point.x, y: hit.point.y, z: hit.point.z });
        }
        return;
      }
      const p = sketchBodenPunktVonEvent(ev);
      if (p) sketchLive.push(p);
    };
    const onSketchPointerUp = () => {
      if (!sketchDrawing) return;
      sketchDrawing = false;
      if (sketchArt === 'wand' && sketchWandInfo) {
        const info = sketchWandInfo;
        const vorschlag = wandTrefferZuOeffnung(sketchWandTreffer, info.laenge, info.maxHoeheMm);
        sketchWandTreffer = [];
        sketchWandWelt = [];
        sketchArt = null;
        sketchWandInfo = null;
        if (vorschlag) {
          const openingType: 'fenster' | 'tuer' = vorschlag.sill <= SKETCH_TUER_SCHWELLE_MM ? 'tuer' : 'fenster';
          handlers.current?.onSketchWandOeffnung?.({ wallId: info.wallId, openingType, ...vorschlag });
        }
        return;
      }
      sketchArt = null;
      if (sketchLive.length >= 2) {
        const points = sketchLive.map((p) => ({ ...p, pressure: 0.5 }));
        setSketchStrokes((s) => [...s, { points }]);
      }
      sketchLive = [];
    };

    let sketchModeZuletzt = false;
    function syncSketchModus() {
      const an = !!handlers.current?.sketchMode;
      // Serie J / J1a: kein hartes `controls.enabled = !an` mehr — der Capture-
      // Phase-Pointerfilter (onCaptureDown) entscheidet pro Geste, ob die Kamera
      // die Eingabe sieht, sodass der Finger auch im Skizzenmodus navigiert.
      if (an === sketchModeZuletzt) return;
      sketchModeZuletzt = an;
      setSketchModeAn(an);
      if (!an) {
        sketchDrawing = false;
        sketchLive = [];
        sketchArt = null;
        sketchWandInfo = null;
        sketchWandTreffer = [];
        sketchWandWelt = [];
        setSketchStrokes([]);
        setSketchPending(null);
      }
    }

    function syncSketchDrawing() {
      sketchGroup.clear();
      if (!handlers.current?.sketchMode) return;
      const z = aktiveElevation() + 20;
      const toVec = (p: Pt) => new THREE.Vector3(p.x, z, -p.y);
      for (const stroke of sketchStrokesRef.current) {
        if (stroke.points.length < 2) continue;
        const g = new THREE.BufferGeometry().setFromPoints(stroke.points.map(toVec));
        sketchGroup.add(new THREE.Line(g, sketchRohMaterial));
      }
      if (sketchArt === 'wand' && sketchWandWelt.length >= 2) {
        // Weltkoordinaten (Meter) → sketchGroup-Lokalraum (mm, MM-skaliert).
        const g = new THREE.BufferGeometry().setFromPoints(
          sketchWandWelt.map((w) => new THREE.Vector3(w.x * 1000, w.y * 1000, w.z * 1000)),
        );
        sketchGroup.add(new THREE.Line(g, sketchLiveMaterial));
      } else if (sketchLive.length >= 2) {
        const g = new THREE.BufferGeometry().setFromPoints(sketchLive.map(toVec));
        sketchGroup.add(new THREE.Line(g, sketchLiveMaterial));
      }
      if (sketchPendingRef.current) {
        for (const seg of sketchPendingRef.current) {
          const g = new THREE.BufferGeometry().setFromPoints([toVec(seg.a), toVec(seg.b)]);
          sketchGroup.add(new THREE.Line(g, sketchPendingMaterial));
        }
      }
    }

    // Kontext (IFC-Bestand): web-ifc liefert bereits Meter/y-oben → 1:1
    const contextGroup = new THREE.Group();
    scene.add(contextGroup);
    let lastContextRevision = -1;
    function syncContext() {
      if (contextRevision === lastContextRevision) return;
      lastContextRevision = contextRevision;
      contextGroup.clear();
      for (const cm of contextMeshes) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(cm.positions.slice(), 3));
        geo.setIndex(new THREE.BufferAttribute(cm.indices, 1));
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(
          geo,
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(cm.color.r, cm.color.g, cm.color.b),
            roughness: 0.95,
            transparent: true,
            opacity: 0.55,
          }),
        );
        mesh.receiveShadow = true;
        contextGroup.add(mesh);
      }
    }

    // Splat-Kontext: eigener Punkt-Renderer (größenrichtige, runde Punkte)
    let splatPoints: THREE.Points | null = null;
    const splatUniforms = { uFocal: { value: 600 } };
    let lastSplatRevision = -1;
    function syncSplats() {
      if (splatRevision === lastSplatRevision) return;
      lastSplatRevision = splatRevision;
      if (splatPoints) {
        splatPoints.removeFromParent();
        splatPoints.geometry.dispose();
        (splatPoints.material as THREE.Material).dispose();
        splatPoints = null;
      }
      if (!splatCloud) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(splatCloud.positions, 3));
      geo.setAttribute('splatColor', new THREE.BufferAttribute(splatCloud.colors, 4));
      geo.setAttribute('splatSize', new THREE.BufferAttribute(splatCloud.sizes, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: splatUniforms,
        transparent: true,
        depthWrite: false,
        vertexShader: `
          attribute vec4 splatColor;
          attribute float splatSize;
          uniform float uFocal;
          varying vec4 vColor;
          void main() {
            vColor = splatColor;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = clamp(2.0 * splatSize * uFocal / max(-mv.z, 0.1), 1.0, 28.0);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          varying vec4 vColor;
          void main() {
            vec2 d = gl_PointCoord - 0.5;
            float r2 = dot(d, d);
            if (r2 > 0.25) discard;
            gl_FragColor = vec4(vColor.rgb, vColor.a * smoothstep(0.25, 0.08, r2));
          }`,
      });
      splatPoints = new THREE.Points(geo, mat);
      splatPoints.frustumCulled = false;
      scene.add(splatPoints);
      console.info(`Splat-Kontext: ${splatCloud.count} Punkte`);
    }

    // Referenz-3D: GLB laden (Meter, y-oben — three-nativ), nicht wählbar
    let glbGroup: THREE.Group | null = null;
    let lastGlbRevision = -1;
    function syncGlb() {
      if (glbRevision === lastGlbRevision) return;
      lastGlbRevision = glbRevision;
      if (glbGroup) {
        glbGroup.removeFromParent();
        glbGroup = null;
      }
      const req = glbRequest;
      if (!req) return;
      void import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
        new GLTFLoader().load(
          req.url,
          (gltf) => {
            if (req.revoke) URL.revokeObjectURL(req.url);
            emitGlbStatus({ status: 'loaded', url: req.url });
            if (glbRequest !== req) return; // inzwischen ersetzt
            glbGroup = gltf.scene;
            glbGroup.traverse((o) => {
              o.castShadow = true;
              o.receiveShadow = true;
            });
            scene.add(glbGroup);
            invalidate(); // V-M1 Commit 2: asynchroner Ladeabschluss — sonst verpasst on-demand die neue Geometrie
            console.info('Referenz-3D geladen:', req.url);
          },
          undefined,
          (err) => {
            if (req.revoke) URL.revokeObjectURL(req.url);
            const message = err instanceof Error ? err.message : String(err);
            emitGlbStatus({ status: 'error', url: req.url, message });
            // Ruhige Formulierung: DataWorkspace filtert den Normalfall (keine
            // lokale Quelle) schon vorher heraus — hier landet nur ein echter
            // Ladefehler einer tatsächlich versuchten, ladbaren Quelle.
            meldeFehler(`Referenz-3D liess sich nicht laden: ${message}`);
          },
        );
      });
    }

    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x2a2620 });
    const previewMaterial = new THREE.LineBasicMaterial({ color: 0xa84b2b });
    // E3 (v0.8.7, docs/V087-SPEZ.md §3): Auswahl-Kantenmaterial — EINE
    // wiederverwendete Instanz (nie pro Frame neu erzeugt, Lehre v0.8.5 §2
    // "Materialien nicht pro Frame neu erzeugen"). Aufgehellte Variante
    // derselben Akzent-Familie wie die bestehende "Kupfer-Glut"-Emissivfarbe
    // 0xa84b2b (kein neuer Farbton, nur maximal aufgehellt: R an die
    // 8-Bit-Kanalgrenze 255 statt 168 — die grösstmögliche R-Differenz
    // gegenüber der dunklen Basiskante 0x2a2620 ist rechnerisch 213, mehr
    // ist mit einem einzelnen Farbkanal nicht erreichbar), voll gesättigt/
    // opak statt gedämpft emissiv. `depthTest:false` ersetzt das in WebGL
    // wirkungslose `linewidth` (D1/E3-Vorgabe): die Auswahlkante liegt
    // sichtbar VOR der Fläche statt im Material zu verschwinden.
    // `toneMapped:false` hält die Farbe unter Belichtung satt. KEIN Puls
    // (statischer Farbwechsel) — `prefers-reduced-motion` ist damit
    // automatisch erfüllt, ohne eine Bewegungs-Ausnahme zu brauchen.
    const selectedEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0xff7a33,
      depthTest: false,
      toneMapped: false,
    });

    // v0.7.0 E3 (docs/V070-KONZEPT.md): 3D-Darstellungsmodus — 'material' ist
    // das heutige Verhalten (Katalog-Farben + Textur-Toggle) byte-/pixel-
    // identisch; 'weiss'/'schwarz' überschreiben Farbe+Rauheit EINHEITLICH
    // für alle Bauteile und überspringen die Textur-Pipeline (auch wenn der
    // Textur-Toggle an ist — «weiss»/«schwarz» sind Studienmodelle, keine
    // texturierten Materialansichten). v0.7.1 E5 4A (docs/V071-KONZEPT.md
    // «Fenster echt»): Fenster-Öffnungen tragen jetzt ECHTE Glas-/Rahmen-
    // Meshes (materialKey 'glas'/'fenster-rahmen', deriveAllMitFensterdetails
    // in scene.ts — NUR hier im Viewport verkabelt, Schnitt/Axo/GLTF-Export
    // bleiben beim unveränderten `deriveAll`). 'glas' ist die dokumentierte
    // Ausnahme von der weiss/schwarz-Vereinheitlichung: Glas bleibt in JEDEM
    // Modus transparent (0.7.0-Regel) statt einheitlich weiss/schwarz
    // eingefärbt zu werden. 'fenster-rahmen' läuft normal durch die
    // Farb-Weiche unten (folgt also dem Wand-/Studienmodell-Modus wie jedes
    // andere Bauteil).
    function artifactToObjects(a: GeometryArtifact, darstellung3d: 'material' | 'weiss' | 'schwarz'): THREE.Object3D[] {
      const geo = new THREE.BufferGeometry();
      // Kern (x,y,z) → three (x, z, −y): per Umordnung beim Kopieren
      const n = a.positions.length / 3;
      const pos = new Float32Array(a.positions.length);
      const nor = new Float32Array(a.normals.length);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = a.positions[i * 3]!;
        pos[i * 3 + 1] = a.positions[i * 3 + 2]!;
        pos[i * 3 + 2] = -a.positions[i * 3 + 1]!;
        nor[i * 3] = a.normals[i * 3]!;
        nor[i * 3 + 1] = a.normals[i * 3 + 2]!;
        nor[i * 3 + 2] = -a.normals[i * 3 + 1]!;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setIndex(new THREE.BufferAttribute(a.indices, 1));
      const spec = materialPalette[a.materialKey] ?? materialPalette['default']!;
      // C2: metrische UVs über die dominante Normalenachse (1 UV = 1 m).
      // Seiten-/Deckelflächen haben eigene Vertices — Nähte fallen auf Kanten.
      // Weiss-/Schwarzmodell: KEINE Texturen (Studienmodell-Charakter), auch
      // wenn der Textur-Toggle (localStorage) an ist.
      const karten = darstellung3d === 'material' && texturenAktiv() ? materialKarten(a.materialKey) : null;
      if (karten) {
        const uv = new Float32Array(n * 2);
        for (let i = 0; i < n; i++) {
          const px = a.positions[i * 3]! / 1000;
          const py = a.positions[i * 3 + 1]! / 1000;
          const pz = a.positions[i * 3 + 2]! / 1000;
          const ax = Math.abs(a.normals[i * 3]!);
          const ay = Math.abs(a.normals[i * 3 + 1]!);
          const az = Math.abs(a.normals[i * 3 + 2]!);
          if (az >= ax && az >= ay) {
            uv[i * 2] = px;
            uv[i * 2 + 1] = py;
          } else if (ax >= ay) {
            uv[i * 2] = py;
            uv[i * 2 + 1] = pz;
          } else {
            uv[i * 2] = px;
            uv[i * 2 + 1] = pz;
          }
        }
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      }
      // Glas-Ausnahme (v0.7.1 E5 4A): bleibt in JEDEM Modus transparent, die
      // weiss/schwarz-Vereinheitlichung unten wird für 'glas' übersprungen.
      const materialParams =
        a.materialKey === 'glas'
          ? { color: 0x8fb6c4, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.35, side: THREE.DoubleSide }
          : darstellung3d === 'weiss'
            ? { color: 0xffffff, roughness: 0.9 }
            : darstellung3d === 'schwarz'
              ? { color: 0x1c1c1c, roughness: 0.95 }
              : {
                  color: karten ? 0xffffff : spec.color,
                  roughness: spec.roughness,
                  metalness: spec.metalness ?? 0,
                  ...(karten
                    ? { map: karten.map, bumpMap: karten.bumpMap, bumpScale: karten.bumpScale }
                    : {}),
                };
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(materialParams));
      mesh.castShadow = a.materialKey !== 'glas';
      mesh.receiveShadow = a.materialKey !== 'glas';
      mesh.userData['entityId'] = a.entityId;
      // D5 (v0.7.3, captureFrame({offiziell}) unten): der Original-Materialschlüssel
      // wird für den amtlichen Beweis-Capture-Farbtausch gebraucht (Palette-
      // Lookup je Mesh, Glas-Ausnahme erkennen) — reine Metadaten, ändert
      // nichts am gerenderten Arbeitsmodus.
      mesh.userData['materialKey'] = a.materialKey;

      const eGeo = new THREE.BufferGeometry();
      const eN = a.edges.length / 3;
      const ePos = new Float32Array(a.edges.length);
      for (let i = 0; i < eN; i++) {
        ePos[i * 3] = a.edges[i * 3]!;
        ePos[i * 3 + 1] = a.edges[i * 3 + 2]!;
        ePos[i * 3 + 2] = -a.edges[i * 3 + 1]!;
      }
      eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
      const lines = new THREE.LineSegments(eGeo, edgeMaterial);
      // E3 (v0.8.7): Die Auswahl-Schleife unten muss jede LineSegments-Kante
      // ihrem Entity zuordnen können, um GENAU die richtige auf
      // `selectedEdgeMaterial` umzuschalten — bisher trug nur `mesh` eine
      // `entityId`.
      lines.userData['entityId'] = a.entityId;
      return [mesh, lines];
    }

    // Ableitung: kleine Modelle synchron (deterministisch, auch für Tests),
    // grosse im Worker — der Kern liefert transferable Arrays (kopiefrei).
    const WORKER_AB = 300; // Elemente
    let lastRevision = -1;
    let pendingRevision = -1;
    let deriveWorker: Worker | null = null;
    let lastTexturRevision = texturRevision;

    function applyArtifacts(artifacts: GeometryArtifact[]) {
      model.clear();
      // Frisch gelesen (nicht durchgereicht): die Worker-Antwort (unten)
      // kommt asynchron — der Modus muss zum REBUILD-Zeitpunkt gelten, nicht
      // zum Anfrage-Zeitpunkt.
      const darstellung3d = aufgeloesteDarstellung3d(useProject.getState().doc.settings);
      for (const a of artifacts) {
        for (const o of artifactToObjects(a, darstellung3d)) model.add(o);
      }
    }

    function syncModel() {
      const { doc, revision } = useProject.getState();
      if (texturRevision !== lastTexturRevision) {
        lastTexturRevision = texturRevision;
        lastRevision = -1; // Material-Rebuild erzwingen
      }
      if (revision === lastRevision) return;
      if (doc.entities.size < WORKER_AB) {
        lastRevision = revision;
        applyArtifacts(deriveAllMitFensterdetails(doc));
        return;
      }
      if (pendingRevision === revision) return; // Anfrage läuft bereits
      pendingRevision = revision;
      if (!deriveWorker) {
        deriveWorker = new Worker(new URL('./derive.worker.ts', import.meta.url), { type: 'module' });
        deriveWorker.onmessage = (e: MessageEvent<{ revision: number; artifacts: GeometryArtifact[] }>) => {
          pendingRevision = -1;
          // Veraltete Antworten verwerfen — der nächste Frame fragt den neuen Stand an
          if (e.data.revision !== useProject.getState().revision) return;
          lastRevision = e.data.revision;
          applyArtifacts(e.data.artifacts);
          invalidate(); // V-M1 Commit 2: Worker-Antwort kommt in einem eigenen Task, ausserhalb jedes rAF-Ticks
        };
      }
      deriveWorker.postMessage({ revision, json: doc.toJSON() });
    }

    // A9 (Owner-Befund K19): dieselbe Revisions-Poll-Idee wie `texturRevision`/
    // `syncContext` — pollt billig (ein Zahlenvergleich) statt eines eigenen
    // Event-Listeners, damit ein Override im Einstellungen-Panel sofort wirkt,
    // ohne den Viewport neu zu mounten.
    let letzteLeistungsRevision = -1;
    function syncLeistung() {
      if (leistungRevisionAktuell() === letzteLeistungsRevision) return;
      letzteLeistungsRevision = leistungRevisionAktuell();
      const stufe = effektiveLeistungsStufe();
      renderer.setPixelRatio(pixelRatioFuerStufe(stufe, window.devicePixelRatio));
      renderer.shadowMap.enabled = schattenAnFuerStufe(stufe);
    }

    function syncPreview() {
      previewGroup.clear();
      const line = handlers.current?.previewLine;
      if (line && line.length >= 2) {
        const pts = line.map((p) => new THREE.Vector3(p.x, 20, -p.y));
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        previewGroup.add(new THREE.Line(g, previewMaterial));
      }
    }

    // Picking auf die aktive Geschossebene
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function groundPoint(ev: PointerEvent): Pt | null {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const { doc, activeStoreyId } = useProject.getState();
      const storey = activeStoreyId ? doc.get(activeStoreyId) : null;
      const elevM = storey && storey.kind === 'storey' ? storey.elevation * MM : 0;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -elevM);
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      return { x: Math.round(hit.x / MM), y: Math.round(-hit.z / MM) };
    }

    let downPos: { x: number; y: number } | null = null;

    // E5 (v0.8.7 PB2, docs/V087-SPEZ.md §3): Shift-Drag-Marquee — Zustand der
    // laufenden Geste (null = keine Marquee-Geste aktiv). Start/Ende leben in
    // `onCaptureDown`/`onPointerUp` unten, die Live-Vorschau in `onPointerMove`.
    // C-14-Matrix-Fix (v0.8.7): `pointerId` gehört zum Zustand, damit ein
    // NEUER Down eine veraltete Geste erkennen und verwerfen kann.
    let marqueeDrag: { startX: number; startY: number; pointerId: number } | null = null;
    // E5 (v0.8.8 PB1): Perf-Beweis-Anker fürs Occlusion-Post-Processing im
    // Marquee-Commit (Muster wie `camHudEventCount`/`frameCount` unten) —
    // -1 solange noch KEIN Marquee-Commit mit Occlusion-Filter lief.
    let letzteMarqueeOcclusionMs = -1;

    // E5: Screen-Rechteck (Client-px) → Sub-Frustum der Kamera. Herleitung
    // (Pyramidenmantel, am drei.js-eigenen `examples/jsm/interactive/
    // SelectionBox.js`-Muster orientiert, hier ohne die Zusatzdatei/-Klasse
    // nachgebaut — nur THREE-Kernklassen; `camera.projectionMatrix`-Weg über
    // `Vector3.unproject`, das intern die inverse Projektions-/View-Matrix
    // anwendet):
    //  1. Die vier Rechteck-Ecken werden auf NDC (-1..1) abgebildet und mit
    //     `unproject(camera)` in je einen Weltpunkt auf ihrem Sichtstrahl
    //     zurückgeholt («nahe» Eckpunkte — alle vier liegen auf derselben
    //     View-Tiefe, weil hier mit NDC-z=0 gerechnet wird).
    //  2. Die Kameraposition ist die Pyramidenspitze; je zwei benachbarte
    //     nahe Eckpunkte + Kameraposition spannen eine der vier SEITEN-
    //     Ebenen auf (`setFromCoplanarPoints`).
    //  3. Die drei nahen Eckpunkte selbst (ohne Kamera) spannen die NAHE
    //     Ebene auf — bei symmetrischem FOV liegen sie exakt auf einer zur
    //     Blickachse senkrechten Ebene (jeder Eckstrahl schliesst denselben
    //     Winkel mit der Blickachse ein).
    //  4. Für die FERNE Ebene wird jeder Eckstrahl (Kamera→naher Eckpunkt)
    //     normalisiert und um `DEEP_M` verlängert — aus demselben
    //     Symmetriegrund liegen die drei so gewonnenen fernen Punkte auf
    //     einer zweiten, zur Blickachse senkrechten Ebene; ihre Normale wird
    //     gespiegelt, damit «innen» weiter kameraseitig bleibt.
    // OHNE Occlusion (ehrliches Nicht-Ziel, V087-SPEZ.md §8): das Frustum
    // sieht durch Wände — es prüft nur räumliche Lage, keine Sichtbarkeit.
    const DEEP_M = 100_000; // 100 km — endlich statt Number.MAX_VALUE (vermeidet Inf/NaN in der Vektor-Arithmetik unten), deckt jede Projektgrösse ab.
    function frustumAusRechteck(x0: number, y0: number, x1: number, y1: number): THREE.Frustum {
      const rect = renderer.domElement.getBoundingClientRect();
      const minX = Math.min(x0, x1);
      const maxX = Math.max(x0, x1);
      const minY = Math.min(y0, y1);
      const maxY = Math.max(y0, y1);
      const ndcXmin = ((minX - rect.left) / rect.width) * 2 - 1;
      const ndcXmax = ((maxX - rect.left) / rect.width) * 2 - 1;
      const ndcYoben = -((minY - rect.top) / rect.height) * 2 + 1; // Bildschirm-oben = grösseres NDC-y
      const ndcYunten = -((maxY - rect.top) / rect.height) * 2 + 1;
      const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
      const nah = (ndcX: number, ndcY: number) => new THREE.Vector3(ndcX, ndcY, 0).unproject(camera);
      const obenLinks = nah(ndcXmin, ndcYoben);
      const obenRechts = nah(ndcXmax, ndcYoben);
      const untenRechts = nah(ndcXmax, ndcYunten);
      const untenLinks = nah(ndcXmin, ndcYunten);
      const fern = (nahPunkt: THREE.Vector3) =>
        camPos.clone().add(nahPunkt.clone().sub(camPos).normalize().multiplyScalar(DEEP_M));
      const fernObenLinks = fern(obenLinks);
      const fernObenRechts = fern(obenRechts);
      const fernUntenRechts = fern(untenRechts);
      const frustum = new THREE.Frustum();
      const p = frustum.planes;
      p[0]!.setFromCoplanarPoints(camPos, obenLinks, obenRechts); // Seite oben
      p[1]!.setFromCoplanarPoints(camPos, obenRechts, untenRechts); // Seite rechts
      p[2]!.setFromCoplanarPoints(untenRechts, untenLinks, camPos); // Seite unten
      p[3]!.setFromCoplanarPoints(untenLinks, obenLinks, camPos); // Seite links
      p[4]!.setFromCoplanarPoints(obenRechts, untenRechts, untenLinks); // nahe Ebene
      p[5]!.setFromCoplanarPoints(fernUntenRechts, fernObenRechts, fernObenLinks); // ferne Ebene
      p[5]!.normal.multiplyScalar(-1);
      return frustum;
    }

    // E5: Boundingbox-Schnitttest gegen ALLE Entity-Meshes (`model.children`,
    // `userData['entityId']`, Muster wie `entityMeshCount`) — kein
    // Occlusion-Test, reiner `frustum.intersectsBox`-Schnitt je Mesh.
    function idsImFrustum(x0: number, y0: number, x1: number, y1: number): string[] {
      const frustum = frustumAusRechteck(x0, y0, x1, y1);
      const box = new THREE.Box3();
      const ids: string[] = [];
      for (const child of model.children) {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) continue;
        const entityId = mesh.userData['entityId'] as string | undefined;
        if (!entityId) continue;
        box.setFromObject(mesh);
        if (frustum.intersectsBox(box)) ids.push(entityId);
      }
      return ids;
    }

    // E5 (v0.8.8 PB1, docs/V088-SPEZ.md §3 E5, §6 Sanktion 7, D5): Occlusion-
    // Sichtbarkeitsfilter — AUSSCHLIESSLICH als Post-Verarbeitung von
    // `idsImFrustum`, im pointerup-Commit aufgerufen (s. `onPointerUp` unten).
    // NIE aus `onPointerMove` — die Live-Vorschau bleibt reines Frustum-
    // Overlay ohne Occlusion (V088-SPEZ.md §8 «Occlusion-Echtzeit-Vorschau»
    // bleibt Nicht-Ziel dieser Version).
    //
    // `entityMeshesFuerOcclusion()` filtert exakt wie `idsImFrustum` oben
    // (`isMesh` + `userData.entityId`) — dieselbe Bedingung schliesst
    // LineSegments (Kanten-Overlay, `artifactToObjects` gibt `[mesh, lines]`
    // zurück, `lines.isMesh` ist undefined) automatisch aus. Griffe
    // (`meshHandleGroup`) und Overlays (`previewGroup`/`sketchGroup`, das
    // Marquee-Rechteck selbst ist ein reines DOM-Overlay, kein Szenen-Objekt)
    // sind NICHT Kinder von `model` — die Selbst-Occlusion-Falle (ein
    // Kandidat verdeckt sich an seiner eigenen Kante/seinem eigenen Griff)
    // ist damit strukturell ausgeschlossen, ohne einen Zusatz-Filter.
    //
    // Sample-Punkte: Bbox-Mitte + 4 Bbox-Ecken (`bboxSamplePunkte`, Tetraeder-
    // Auswahl über gerade Achsen-Parität — deckt alle drei Achsen ab, ohne
    // alle 8 Ecken zu testen; 5 statt 9 Strahlen je Kandidat, Perf-Budget
    // <20 ms am Demo-Doc, s. Sanktion 7 / C-9). Je Punkt EIN Strahl von der
    // Kameraposition; der ERSTE gefilterte Treffer entscheidet: ist er das
    // Kandidaten-Mesh selbst (oder liegt er — Koplanaritäts-Toleranz
    // `EPS_KOPLANAR_M` — AM/HINTER dem Sample-Punkt statt echt davor), gilt
    // der Punkt frei. Kurzschluss beim ersten freien Punkt → sichtbar; kein
    // freier Punkt unter allen 5 → «überwiegend verdeckt» → im Aufrufer
    // ausgelassen (Semantik aus D5/E5, steht so in den Neuigkeiten).
    const EPS_KOPLANAR_M = 1e-4; // Meter — Rundungstoleranz an koplanaren Flächen (z.B. Wand/Boden-Anschluss, Wand-an-Wand-Stoss): ein Treffer AUF dem Sample-Punkt selbst darf nicht als „davor liegender Blocker" zählen.
    function bboxSamplePunkte(box: THREE.Box3): THREE.Vector3[] {
      const mitte = box.getCenter(new THREE.Vector3());
      const ecken: THREE.Vector3[] = [];
      for (let i = 0; i < 8; i++) {
        const bx = i & 1;
        const by = (i >> 1) & 1;
        const bz = (i >> 2) & 1;
        if ((bx ^ by ^ bz) !== 0) continue; // gerade Parität → 4 von 8 Ecken (Tetraeder-Streuung über alle 3 Achsen)
        ecken.push(new THREE.Vector3(bx ? box.max.x : box.min.x, by ? box.max.y : box.min.y, bz ? box.max.z : box.min.z));
      }
      return [mitte, ...ecken];
    }
    const occlusionRaycaster = new THREE.Raycaster();
    function istUeberwiegendSichtbar(mesh: THREE.Mesh, kandidatenMeshes: THREE.Mesh[], camPos: THREE.Vector3): boolean {
      const box = new THREE.Box3().setFromObject(mesh);
      for (const punkt of bboxSamplePunkte(box)) {
        const delta = punkt.clone().sub(camPos);
        const distanz = delta.length();
        if (distanz < 1e-6) return true; // Kamera praktisch AUF dem Sample-Punkt (entartet) — gilt als frei
        occlusionRaycaster.set(camPos, delta.normalize());
        occlusionRaycaster.far = distanz + EPS_KOPLANAR_M;
        const treffer = occlusionRaycaster.intersectObjects(kandidatenMeshes, false)[0];
        if (!treffer || treffer.object === mesh || treffer.distance >= distanz - EPS_KOPLANAR_M) return true;
      }
      return false; // kein freier Sample-Punkt unter allen 5 → überwiegend verdeckt
    }

    // Serie J / J1b: Gesten-Detektor (Doppel-Tap = Einpassen, Long-Press =
    // Kontextmenü + Fokus). Reiner Automat aus eingabe-3d.ts; gefüttert aus den
    // Pointer-Handlern (nur ausserhalb des Skizzenmodus), Long-Press geprüft im
    // Renderloop mit performance.now().
    const gesten = gestenDetektor();
    const meshTrefferAt = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObjects(model.children, false).find((h) => (h.object as THREE.Mesh).isMesh) ?? null;
    };
    const doppelTapEinpassen = (clientX: number, clientY: number) => {
      const hit = meshTrefferAt(clientX, clientY);
      if (hit) {
        void controls.fitToBox(hit.object, true, { paddingLeft: 0.2, paddingRight: 0.2, paddingTop: 0.2, paddingBottom: 0.2 });
      } else if (model.children.length > 0) {
        void controls.fitToBox(model, true, { paddingLeft: 0.15, paddingRight: 0.15, paddingTop: 0.15, paddingBottom: 0.15 });
      } else {
        void controls.reset(true);
      }
    };

    const onPointerDown = (ev: PointerEvent) => {
      // V-M1 Commit 2: jede Zeigergeste ist potenziell sichtbar (Auswahl,
      // Mesh-Handle-Griff, Skizzenstrich-Start, Kontextmenü) — billiger,
      // konservativer Trigger statt jeden einzelnen Folgefall separat zu
      // instrumentieren.
      invalidate();
      // E5 (v0.8.7 PB2): Shift-Marquee wurde bereits in der Capture-Phase
      // (`onCaptureDown` unten) gestartet — hier NICHT zusätzlich die
      // normale Handle-/Gesten-/Klick-Verarbeitung anstossen (`downPos`
      // bleibt null, Gesten-Automat unberührt), sonst würde derselbe Down
      // doppelt gedeutet. C-14-Matrix-Fix: gilt NUR für denselben Pointer —
      // ein NEUER Down auf einer veralteten Geste (sollte seit dem Capture-
      // Fix nicht mehr vorkommen) verwirft sie, statt dass der spätere
      // `pointerup` eine Phantom-Auswahl mit alten Koordinaten feuert.
      if (marqueeDrag) {
        if (ev.pointerId === marqueeDrag.pointerId) return;
        marqueeDrag = null;
        setMarquee3dRef.current(null);
        // E6 (v0.8.8 PB1): Stale-Discard-Ende der Marquee-Geste.
        useViewportChromeRuntime.setState({ marqueeAktiv: false });
      }
      // Block 3 / E4: pointerdown auf einem Vertex-Handle startet den lokalen
      // Zieh-Zustand — hat Vorrang vor Gesten-Automat/Klick-Erkennung, sonst
      // würde ein Doppel-Tap auf einem Handle versehentlich «Einpassen» lösen.
      // Trifft der Down daneben, bleibt es ein normaler Klick (Flächen-Pick
      // im pointerup unten). Dieselbe Pencil-Trennung wie im Skizzenmodus
      // (kameraDarfSehen(...,true)): Stift/linke Maus dürfen einen Handle
      // greifen, Finger navigieren immer weiter (J1, kein Sonderweg für
      // Touch) — sonst würde ein Finger-Tap gleichzeitig orbiten UND ziehen.
      if (!handlers.current?.sketchMode && handlers.current?.meshEditId && !kameraDarfSehen(ev.pointerType, ev.button, true)) {
        const hit = meshHandleTrefferAt(ev.clientX, ev.clientY);
        if (hit) {
          const info = hit.object.userData['meshHandle'] as { entityId: string; indices: number[] };
          const worldPos = hit.object.getWorldPosition(new THREE.Vector3());
          const vertical = ev.shiftKey;
          // Vertikal (Shift): kamerazugewandte Vertikal-Ebene durch den Handle
          // — nur die Höhe (three-y) wird ausgewertet (s. threeDeltaZuKernel).
          // Horizontal: die Ebene auf Handle-Höhe (wie `groundPoint`).
          const normal = vertical
            ? (() => {
                const n = new THREE.Vector3(camera.position.x - worldPos.x, 0, camera.position.z - worldPos.z);
                if (n.lengthSq() < 1e-8) n.set(1, 0, 0);
                return n.normalize();
              })()
            : new THREE.Vector3(0, 1, 0);
          meshDrag = {
            entityId: info.entityId,
            indices: info.indices,
            startWorld: worldPos,
            vertical,
            plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, worldPos),
            handle: hit.object as THREE.Mesh,
          };
          (renderer.domElement as Element).setPointerCapture(ev.pointerId);
          return;
        }
      }
      if (!handlers.current?.sketchMode) {
        gesten.ereignis({ typ: 'down', t: performance.now(), x: ev.clientX, y: ev.clientY, pointerId: ev.pointerId, pointerType: ev.pointerType });
      }
      if (handlers.current?.sketchMode) {
        // Serie J / J1a: nur zeichnen, wenn die Kamera dieses Event NICHT sehen
        // darf (Stift oder linke Maustaste). Finger + Mittel-/Rechtstaste
        // navigieren stattdessen — der Capture-Filter unten hat die Kamera für
        // sie freigeschaltet.
        if (!kameraDarfSehen(ev.pointerType, ev.button, true)) onSketchPointerDown(ev);
        return;
      }
      downPos = { x: ev.clientX, y: ev.clientY };
    };
    const onPointerUp = (ev: PointerEvent) => {
      // V-M1 Commit 2: Loslassen beendet oft eine Geste sichtbar (Klick-
      // Auswahl, Kontextmenü, Mesh-Drag-Commit, Skizzenstrich-Ende).
      invalidate();
      // Block 3 / E4: ein laufender Vertex-Drag committet HIER als EIN
      // `onMeshVertexDrag` (NodeCanvas-/T5-Muster) — verbraucht das up, bevor
      // Gesten-Automat/Klick-Erkennung etwas damit anfangen.
      if (meshDrag) {
        const dx3 = meshDrag.handle.position.x - meshDrag.startWorld.x / MM;
        const dy3 = meshDrag.handle.position.y - meshDrag.startWorld.y / MM;
        const dz3 = meshDrag.handle.position.z - meshDrag.startWorld.z / MM;
        const delta = threeDeltaZuKernel(dx3, dy3, dz3);
        if (delta.dx !== 0 || delta.dy !== 0 || delta.dz !== 0) {
          handlers.current?.onMeshVertexDrag?.(meshDrag.entityId, meshDrag.indices, delta);
        }
        meshDrag = null;
        downPos = null;
        return;
      }
      // E5 (v0.8.7 PB2, docs/V087-SPEZ.md §3 E5): Shift-Marquee committet HIER
      // — verbraucht das up, bevor Gesten-Automat/Klick-Erkennung etwas damit
      // anfangen (analog zum `meshDrag`-Commit oben). Winzige Rechtecke
      // (<4px Bildschirm, C-14e) sind KEIN Marquee, sondern derselbe
      // Klick-Pick wie im `pickMode`-Zweig unten (mit Shift-Toggle) — kein
      // Doppel-Feuern, keine 1-Element-„Marquee"-Auswahl über einen blossen
      // Klick.
      if (marqueeDrag) {
        const md = marqueeDrag;
        marqueeDrag = null;
        setMarquee3dRef.current(null);
        // E6 (v0.8.8 PB1, docs/V088-SPEZ.md §3 E6): Ende der Marquee-Geste —
        // deckt sowohl den Mini-Klick-Pfad (<4px) als auch den echten
        // Marquee-Commit unten ab (beide beenden dieselbe Geste, die in
        // `onCaptureDown` mit `marqueeAktiv:true` begann).
        useViewportChromeRuntime.setState({ marqueeAktiv: false });
        const moved = Math.hypot(ev.clientX - md.startX, ev.clientY - md.startY);
        if (moved < 4) {
          const rect = renderer.domElement.getBoundingClientRect();
          ndc.set(
            ((ev.clientX - rect.left) / rect.width) * 2 - 1,
            -((ev.clientY - rect.top) / rect.height) * 2 + 1,
          );
          raycaster.setFromCamera(ndc, camera);
          const hits = raycaster.intersectObjects(model.children, false);
          const hit = hits.find((h) => (h.object as THREE.Mesh).isMesh && h.object.userData['entityId']);
          handlers.current?.onPick?.(
            hit ? (hit.object.userData['entityId'] as string) : null,
            ev.shiftKey ? { toggle: true } : undefined,
          );
          return;
        }
        const ids = idsImFrustum(md.startX, md.startY, ev.clientX, ev.clientY);
        // E5 (v0.8.8 PB1, docs/V088-SPEZ.md §3 E5, §6 Sanktion 7): Occlusion-
        // Filter NUR hier im Commit — `entityMeshesFuerOcclusion` einmal
        // gesammelt und für ALLE Kandidaten wiederverwendet (Perf: EIN
        // `model.children`-Durchlauf statt k separate). Perf-Messung als
        // Testhook-Zeitstempel (`__kosmoViewport.letzteMarqueeOcclusionMs`,
        // C-9-Beweis <20 ms).
        const occlusionStart = performance.now();
        const entityMeshesFuerOcclusion: THREE.Mesh[] = [];
        for (const child of model.children) {
          const m = child as THREE.Mesh;
          if (m.isMesh && m.userData['entityId']) entityMeshesFuerOcclusion.push(m);
        }
        const camPosOcclusion = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
        const sichtbareIds = ids.filter((id) => {
          const mesh = entityMeshesFuerOcclusion.find((m) => m.userData['entityId'] === id);
          return mesh ? istUeberwiegendSichtbar(mesh, entityMeshesFuerOcclusion, camPosOcclusion) : false;
        });
        letzteMarqueeOcclusionMs = performance.now() - occlusionStart;
        // E5/DesignWorkspace.tsx-Vertrag (~1073): Shift-Marquee ist IMMER
        // additiv — derselbe Vertrag wie das 2D-Rubber-Band (PlanView.tsx),
        // hier 1:1 übernommen statt neu erfunden.
        handlers.current?.onMarqueeAuswahl?.(sichtbareIds, { additiv: true });
        return;
      }
      // J1b: Doppel-Tap → Einpassen auf den getroffenen Körper (sonst das ganze
      // Modell). Verbraucht das up.
      if (!handlers.current?.sketchMode) {
        const g = gesten.ereignis({ typ: 'up', t: performance.now(), x: ev.clientX, y: ev.clientY, pointerId: ev.pointerId, pointerType: ev.pointerType });
        if (g.doppelTap) {
          downPos = null;
          doppelTapEinpassen(g.doppelTap.x, g.doppelTap.y);
          return;
        }
      }
      // Serie J / J2: Rechtsklick OHNE Drag (<4 px) öffnet das Kontextmenü; ein
      // Rechts-Drag bleibt Pan (camera-controls hat es bereits verarbeitet).
      if (ev.button === 2 && downPos) {
        const movedR = Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y);
        downPos = null;
        if (movedR < 4) {
          const r = mountRef.current?.getBoundingClientRect();
          setKontextRef.current({
            x: r ? ev.clientX - r.left : ev.clientX,
            y: r ? ev.clientY - r.top : ev.clientY,
            clientX: ev.clientX,
            clientY: ev.clientY,
          });
        }
        return;
      }
      if (handlers.current?.sketchMode) {
        onSketchPointerUp();
        return;
      }
      if (!downPos) return;
      const moved = Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y);
      downPos = null;
      if (moved > 4 || ev.button !== 0) return; // Drag = Kamerafahrt, kein Klick
      if (handlers.current?.meshEditId) {
        // Block 3 / E4: Flächen-Pick im Editiermodus — faceIndex entspricht
        // 1:1 dem Kernel-Dreiecks-Index (deriveFreeMesh explodiert die
        // Dreiecke sequenziell, s. derive/scene.ts `idx[f*3+k] = f*3+k`).
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.set(
          ((ev.clientX - rect.left) / rect.width) * 2 - 1,
          -((ev.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const meshEditId = handlers.current.meshEditId;
        const hits = raycaster.intersectObjects(model.children, false);
        const hit = hits.find((h) => (h.object as THREE.Mesh).isMesh && h.object.userData['entityId'] === meshEditId);
        if (hit && hit.faceIndex !== undefined && hit.faceIndex !== null && meshEditId) {
          handlers.current.onMeshFaceClick?.(meshEditId, hit.faceIndex);
        }
        return;
      }
      if (handlers.current?.pickMode) {
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.set(
          ((ev.clientX - rect.left) / rect.width) * 2 - 1,
          -((ev.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(model.children, false);
        const hit = hits.find((h) => (h.object as THREE.Mesh).isMesh && h.object.userData['entityId']);
        // D5-Fix (v0.8.6 PB2, docs/V086-SPEZ.md): Shift-Klick verdrahtet den
        // seit PA1 deklarierten `opts.toggle` — derselbe Vertrag wie PlanView
        // (2D). Shift-Klick ins Leere (kein Treffer) ruft onPick(null,
        // {toggle:true}); der DesignWorkspace-Handler behandelt das bereits
        // als No-op (onPick: `if (opts?.toggle) { if (!id) return; ... }`,
        // DesignWorkspace.tsx ~1056-1064) — hier also unverändert weiterreichen.
        handlers.current.onPick?.(
          hit ? (hit.object.userData['entityId'] as string) : null,
          ev.shiftKey ? { toggle: true } : undefined,
        );
        return;
      }
      const p = groundPoint(ev);
      if (p) handlers.current?.onGroundClick?.({ p, shiftKey: ev.shiftKey });
    };
    const onPointerMove = (ev: PointerEvent) => {
      // V-M1 Commit 2: deckt Hover-Vorschau (Gummiband/Fangpunkt, von
      // DesignWorkspace über `handlers.current.previewLine` gesetzt),
      // Mesh-Handle-Drag und Skizzenstriche in einem Rutsch ab.
      invalidate();
      // Block 3 / E4: der Handle folgt lokal dem Zeiger — nur die erlaubte
      // Achse ändert sich (horizontal: x/z auf Handle-Höhe; vertikal/Shift:
      // nur die Höhe, x/z bleiben am Ursprung — threeDeltaZuKernel erzwingt
      // dx=dy=0 ohnehin, hier bleibt schon die Anzeige auf der Achse).
      if (meshDrag) {
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hit = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(meshDrag.plane, hit)) {
          if (meshDrag.vertical) {
            meshDrag.handle.position.set(meshDrag.startWorld.x / MM, hit.y / MM, meshDrag.startWorld.z / MM);
          } else {
            meshDrag.handle.position.set(hit.x / MM, meshDrag.startWorld.y / MM, hit.z / MM);
          }
        }
        return;
      }
      // E5 (v0.8.7 PB2): Shift-Marquee — nur das Overlay-Rechteck nachziehen,
      // kein Gesten-/Ground-Move (der Zeiger malt hier ein Auswahlrechteck,
      // keine Zeichen-Vorschau/keinen Hover).
      if (marqueeDrag) {
        const rect = renderer.domElement.getBoundingClientRect();
        setMarquee3dRef.current({
          x: Math.min(marqueeDrag.startX, ev.clientX) - rect.left,
          y: Math.min(marqueeDrag.startY, ev.clientY) - rect.top,
          width: Math.abs(ev.clientX - marqueeDrag.startX),
          height: Math.abs(ev.clientY - marqueeDrag.startY),
        });
        return;
      }
      if (!handlers.current?.sketchMode) {
        gesten.ereignis({ typ: 'move', t: performance.now(), x: ev.clientX, y: ev.clientY, pointerId: ev.pointerId, pointerType: ev.pointerType });
      }
      if (handlers.current?.sketchMode) {
        onSketchPointerMove(ev);
        return;
      }
      const p = groundPoint(ev);
      if (p) handlers.current?.onGroundMove?.({ p, shiftKey: ev.shiftKey });
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        // E5 (v0.8.7 PB2, docs/V087-SPEZ.md §3 E5): Esc bricht eine laufende
        // Shift-Marquee-Geste ab — «kein Feuern» heisst auch: KEIN
        // `onEscape`-Fanout (der leert im DesignWorkspace-Handler die ganze
        // Auswahl, C-14d) — nur die Geste selbst endet, die bestehende
        // Auswahl bleibt unverändert stehen.
        if (marqueeDrag) {
          marqueeDrag = null;
          setMarquee3dRef.current(null);
          controls.enabled = true;
          setzeTouchStyles();
          invalidate();
          // E6 (v0.8.8 PB1 + Fable-Nachzug, docs/V088-SPEZ.md §3 E6, C-8):
          // Esc-Ende der Marquee-Geste über den Store-Kanal. Das frühere
          // `ev.stopImmediatePropagation()` ist hier ATOMAR mit dem neuen
          // `marqueeAktiv`-Guard im DesignWorkspace-Escape-Zweig entfernt —
          // Zustand statt Listener-Reihenfolge-Kopplung. Der Reset läuft
          // BEWUSST als Macrotask nachgelagert: dieser Listener ist auf
          // demselben `window` VOR dem DesignWorkspace-Listener registriert
          // (React committet Kind-Effekte vor Eltern-Effekten), und dessen
          // Guard muss `marqueeAktiv` für DIESES Keydown noch als true
          // lesen. setTimeout(0) statt queueMicrotask, weil Microtask-
          // Checkpoints schon ZWISCHEN zwei Listener-Aufrufen desselben
          // Events laufen — ein Macrotask erst nach dem kompletten Dispatch.
          window.setTimeout(() => {
            useViewportChromeRuntime.setState({ marqueeAktiv: false });
          }, 0);
          return;
        }
        handlers.current?.onEscape?.();
        invalidate(); // V-M1 Commit 2: Escape bricht i.d.R. eine sichtbare Vorschau/Auswahl ab
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    window.addEventListener('keydown', onKey);
    // Serie J / J2: Browser-Kontextmenü unterdrücken — der Rechtsklick öffnet
    // unser eigenes Menü (onPointerUp), nicht das des Browsers.
    const onContextMenu = (ev: Event) => ev.preventDefault();
    renderer.domElement.addEventListener('contextmenu', onContextMenu);

    // Serie J / J1a: Pencil-Trennung ohne hartes Kamera-Abschalten. In der
    // Capture-Phase (vor camera-controls' eigenem Listener auf demselben
    // Element) entscheidet `kameraDarfSehen`, ob die Kamera diese Geste
    // verarbeiten darf: Stift/linke-Maus im Skizzenmodus → false (zeichnet,
    // Kamera still), Finger + Mittel/Rechts → true (navigiert). Das ersetzt das
    // frühere statische `controls.enabled = !sketchMode`, ohne die Sketch-
    // Handler (Target-Phase) zu unterbrechen (kein stopImmediatePropagation).
    const onCaptureDown = (ev: PointerEvent) => {
      // J1b: solange das Kontextmenü offen ist, bekommt die Kamera keine Geste
      // (die eine, zentrale enabled-Entscheidung — Fable-Auflage J1b-1).
      if (kontextOffenRef.current) {
        controls.enabled = false;
        setzeTouchStyles();
        return;
      }
      // E5 (v0.8.7 PB2, docs/V087-SPEZ.md §3 E5, Sanktion 8): Shift+Linksklick
      // (Maus) im Auswahl-Werkzeug startet die Marquee-Geste — der Fall biegt
      // HIER, VOR jeder camera-controls-Zuweisung, ab (`controls.enabled =
      // false` + `return`), exakt dasselbe Kapermuster wie J1a fürs
      // Skizzieren oben. camera-controls' eigener pointerdown-Listener liegt
      // auf demselben Element in der TARGET-Phase und läuft darum erst NACH
      // diesem Capture-Listener — er sieht `enabled=false` und beginnt keinen
      // Orbit/Pan/Zoom. Ohne Shift bleibt dieser Zweig unbetreten, camera-
      // controls unangetastet (Sanktion-8-Vertrag: „Marquee kapert die
      // Kamera-Geste ohne Shift NICHT"). `pickMode` (Werkzeug „Auswahl")
      // grenzt gegen Zeichenwerkzeuge ab, die Shift bereits für Ortho-Snap
      // brauchen (`onGroundClick`/`onGroundMove` `shiftKey`,
      // DesignWorkspace.tsx `zielPunkt`); `meshEditId` grenzt gegen die
      // Vertex-Handle-Vertikal-Geste ab, die Shift ebenfalls belegt (oben,
      // `onPointerDown`/hier unten `handleGetroffen`).
      if (
        ev.pointerType === 'mouse' &&
        ev.button === 0 &&
        ev.shiftKey &&
        !!handlers.current?.pickMode &&
        !handlers.current?.sketchMode &&
        !handlers.current?.meshEditId
      ) {
        controls.enabled = false;
        setzeTouchStyles();
        const rect = renderer.domElement.getBoundingClientRect();
        marqueeDrag = { startX: ev.clientX, startY: ev.clientY, pointerId: ev.pointerId };
        // E6 (v0.8.8 PB1, docs/V088-SPEZ.md §3 E6): Start-Signal für den
        // Esc-Zustands-Kanal (Brücken-Feld, s. viewport-chrome-runtime.ts).
        useViewportChromeRuntime.setState({ marqueeAktiv: true });
        // C-14-Matrix-Fund (v0.8.7): OHNE Capture landet das `pointerup`
        // nicht auf dem Canvas, wenn die Maus über einem Dock-Float (z.B.
        // der rechten `viewport-hud`-Karte, seit v0.7.9 AUSSERHALB des
        // Mounts) losgelassen wird — die Geste blieb dann hängen und der
        // NÄCHSTE normale Klick feuerte eine Phantom-Marquee-Auswahl mit
        // den alten Koordinaten. Capture (Muster `meshDrag` oben) leitet
        // move/up der Geste garantiert hierher zurück.
        (renderer.domElement as Element).setPointerCapture(ev.pointerId);
        setMarquee3dRef.current({ x: ev.clientX - rect.left, y: ev.clientY - rect.top, width: 0, height: 0 });
        return;
      }
      // Maus: volle Belegung aus mausBelegung (Shift+Mitte → Pan) VOR
      // camera-controls das pointerdown latcht — darum liegt dieser Listener
      // auf dem Mount-DIV (Capture-Phase läuft dort garantiert vor allen
      // Target-Listenern des Canvas; Fable-Review-1-Auflage J2-1).
      if (ev.pointerType === 'mouse') {
        const b = mausBelegung(navModusRef.current, ev.shiftKey);
        controls.mouseButtons.left = AKTION_ACTION[b.left];
        controls.mouseButtons.middle = AKTION_ACTION[b.middle];
        controls.mouseButtons.right = AKTION_ACTION[b.right];
      }
      // Block 3 / E4: trifft der Down einen Vertex-Handle, gilt dieselbe
      // Pencil-Trennung wie im Skizzenmodus (Stift/linke Maus ziehen den
      // Handle, Kamera steht still; Finger navigieren weiter — J1, kein
      // Sonderweg für Touch).
      const handleGetroffen =
        !!handlers.current?.meshEditId && meshHandleTrefferAt(ev.clientX, ev.clientY) !== null;
      controls.enabled = handleGetroffen
        ? kameraDarfSehen(ev.pointerType, ev.button, true)
        : kameraDarfSehen(ev.pointerType, ev.button, !!handlers.current?.sketchMode);
      setzeTouchStyles(); // enabled-Toggle räumt die Touch-Styles ab (J2-2)
    };
    const onCaptureUp = (ev: PointerEvent) => {
      controls.enabled = true;
      setzeTouchStyles();
      // E6 (v0.8.8 PB1, docs/V088-SPEZ.md §3 E6): `pointercancel` ist ein
      // GÜLTIGES Marquee-Ende (Browser bricht die Pointer-Sequenz selbst ab,
      // z.B. Touch-/Pen-Interrupt) — es gibt KEINEN eigenen `pointercancel`-
      // Listener auf dem Canvas (nur `pointerup`/`pointerdown`/`pointermove`,
      // s. Registrierung unten), darum räumt dieser Capture-Listener (auf
      // dem Mount-DIV, läuft für BEIDE Ereignisse: `pointerup`+
      // `pointercancel`) die Geste — aber NUR im `pointercancel`-Zweig: ein
      // normales `pointerup` durchläuft hier noch NICHT den Ziel-Commit
      // (`onPointerUp` unten, Target-Phase, läuft ERST NACH dieser Capture-
      // Phase) — würde `marqueeDrag` schon hier bei jedem `pointerup`
      // genullt, säße der spätere Commit-Zweig dort auf leerem Zustand.
      if (ev.type === 'pointercancel' && marqueeDrag) {
        marqueeDrag = null;
        setMarquee3dRef.current(null);
        useViewportChromeRuntime.setState({ marqueeAktiv: false });
        invalidate();
      }
    };
    // Capture-Phase auf dem Mount-DIV (nicht dem Canvas), damit der Filter
    // wirklich VOR camera-controls' eigenem pointerdown-Listener läuft.
    mount.addEventListener('pointerdown', onCaptureDown, { capture: true });
    mount.addEventListener('pointerup', onCaptureUp, { capture: true });
    mount.addEventListener('pointercancel', onCaptureUp, { capture: true });
    // Reset auch auf window: wird der Pointer ohne Capture ausserhalb des
    // Canvas losgelassen, feuert sonst kein pointerup → enabled bliebe false
    // (Rad-Zoom tot bis zur nächsten Geste). J2-3.
    window.addEventListener('pointerup', onCaptureUp);

    const clock = new THREE.Clock();
    let raf = 0;
    let testMode = false;

    // -------------------------------------------------------------------
    // V-M1 Commit 2 (v0.6.6 W2): Renderloop on-demand statt Dauerschleife.
    // Flag in `state/leistung.ts` (`istRenderBeiBedarfAn`, Default AN für
    // Nutzer:innen, E2E sät bewusst AUS über playwright-storageState) —
    // AUS verhält sich BYTE-IDENTISCH zum alten Dauerloop (der komplette
    // Gate-Block unten wird dann übersprungen, jeder Tick rendert wie bisher).
    // AN: gerendert wird nur bei (a) camera-controls-Kamerabewegung
    // (`controls.update()`-Rückgabewert — deckt `update`/`control`/
    // Übergänge ab, s. Bibliotheksquelle: die 'update'-Events dispatchen
    // exakt beim selben `true`), (b) Doc-/Auswahl-/Geschoss-Änderung
    // (`useProject.subscribe`) + Modul-Level-Signalen ohne Event-Kanal
    // (Kontext/Sonne/Splat/Textur/GLB/Modulraster/Leistungsstufe — billige
    // Revisions-Vergleiche, dieselben Zähler wie die bestehenden syncXxx()),
    // (c) laufenden Gesten (Zeiger-Events, Skizzieren, Mesh-Drag, Long-Press-
    // Treffer), (d) explizitem `invalidate()` (Resize, asynchrone Worker-/
    // GLB-Antworten). Fallback-Schraube: ein FPS-Deckel (30) ausserhalb
    // aktiver Kamerabewegung, falls eine Invalidierungs-Quelle zu oft feuert.
    let needsRender = true; // erste Zeichnung
    const invalidate = () => {
      needsRender = true;
    };
    let renderBeiBedarfAn = istRenderBeiBedarfAn();
    let letzteFlagRevision = leistungRevisionAktuell();
    let letzterRenderMs = 0;
    const FPS_DECKEL_INTERVALL_MS = 1000 / 30;
    let frameCount = 0;
    // Doc/Auswahl/aktives Geschoss: JEDE Store-Aktualisierung ist visuell
    // relevant (Patches, Undo/Redo, Yjs-Sync von einem Remote-Peer, Kosmo-KI).
    const unsubscribeProjekt = useProject.subscribe(() => invalidate());
    // Modul-Level-Revisionen (kein Event-Kanal, s. Datei-Kopf) — eigene
    // "zuletzt gesehen"-Variablen, getrennt von den syncXxx()-internen
    // (die laufen nur, wenn ohnehin schon gerendert wird).
    let dirtyContextRevision = contextRevision;
    let dirtySunRevision = sunRevision;
    let dirtyModulRevision = modulRevision;
    let dirtySplatRevision = splatRevision;
    let dirtyTexturRevision = texturRevision;
    let dirtyGlbRevision = glbRevision;
    // Werkzeug-/Modus-Signatur aus dem `handlers`-Ref + den Sketch-Refs (kein
    // Event-Kanal, DesignWorkspace/die React-States mutieren sie ausserhalb
    // dieses Effekts) — nur die Felder, die Viewport3D tatsächlich liest.
    let letzteAeussereSignatur = '';
    function aeussereSignatur(): string {
      const h = handlers.current;
      return `${h?.sketchMode ?? false}|${h?.meshEditId ?? ''}|${h?.pickMode ?? false}|${h?.previewLine?.length ?? -1}|${sketchStrokesRef.current.length}|${sketchPendingRef.current ? sketchPendingRef.current.length : -1}`;
    }

    const renderFrame = () => {
      // Immer günstig, JEDEN Tick (auch im on-demand-Leerlauf) — MUSS laufen,
      // sonst bricht die Feder-Physik bei Wiederaufnahme (Doku: "This should
      // be called in your tick loop every time"). Der Rückgabewert ist exakt
      // das camera-controls-`update`-Signal.
      const kameraAktiv = controls.update(clock.getDelta());
      if (kameraAktiv) invalidate();

      // Flag-Wechsel + Modul-Level-Revisionen + Werkzeug-Signatur: billige
      // Vergleiche, unabhängig vom aktuellen Render-Gate unten geprüft.
      if (leistungRevisionAktuell() !== letzteFlagRevision) {
        letzteFlagRevision = leistungRevisionAktuell();
        renderBeiBedarfAn = istRenderBeiBedarfAn();
        invalidate();
      }
      if (
        contextRevision !== dirtyContextRevision ||
        sunRevision !== dirtySunRevision ||
        modulRevision !== dirtyModulRevision ||
        splatRevision !== dirtySplatRevision ||
        texturRevision !== dirtyTexturRevision ||
        glbRevision !== dirtyGlbRevision
      ) {
        dirtyContextRevision = contextRevision;
        dirtySunRevision = sunRevision;
        dirtyModulRevision = modulRevision;
        dirtySplatRevision = splatRevision;
        dirtyTexturRevision = texturRevision;
        dirtyGlbRevision = glbRevision;
        invalidate();
      }
      const aktSignatur = aeussereSignatur();
      if (aktSignatur !== letzteAeussereSignatur) {
        letzteAeussereSignatur = aktSignatur;
        invalidate();
      }

      // Serie J / J2: Kontextcursor je Werkzeug/Modus — DOM-Style, kein
      // Render, darum ungegatet jeden Tick (wie bisher).
      {
        const tool = handlers.current?.sketchMode ? 'skizze' : handlers.current?.pickMode ? 'auswahl' : 'wand';
        const cur = werkzeugCursorFuer(tool, navModusRef.current);
        if (renderer.domElement.style.cursor !== cur) renderer.domElement.style.cursor = cur;
      }
      // J1b: Long-Press-Automat MUSS jeden Tick laufen (Timer-Fenster) —
      // sonst verpasst on-demand einen gehaltenen Zeiger. Öffnet das
      // Kontextmenü + setzt den Orbit-Pivot (nur ausserhalb Skizzenmodus/
      // offenem Menü; feuert genau einmal).
      if (!handlers.current?.sketchMode && !kontextOffenRef.current) {
        const lp = gesten.pruefeLongPress(performance.now());
        if (lp.longPress) {
          const hit = meshTrefferAt(lp.longPress.x, lp.longPress.y);
          if (hit) controls.setOrbitPoint(hit.point.x, hit.point.y, hit.point.z);
          const r = mount.getBoundingClientRect();
          setKontextRef.current({ x: lp.longPress.x - r.left, y: lp.longPress.y - r.top, clientX: lp.longPress.x, clientY: lp.longPress.y });
          invalidate();
        }
      }

      // ---- Render-Gate ----------------------------------------------
      // AUS (E2E-Default): dieser Block tut nichts, die Funktion läuft
      // exakt wie vor Commit 2 bis zum Ende durch — byte-identisches
      // Altverhalten für ALLE bestehenden 3D-Specs.
      if (renderBeiBedarfAn) {
        if (!needsRender) return;
        // Fallback-Schraube (getrennt von der on-demand-Erkennung): ein
        // FPS-Deckel greift NUR ausserhalb aktiver Kamerabewegung, damit
        // Orbit/Pan/Zoom so flüssig bleiben wie vorher.
        const jetzt = performance.now();
        if (!kameraAktiv && jetzt - letzterRenderMs < FPS_DECKEL_INTERVALL_MS) return;
        letzterRenderMs = jetzt;
      }
      needsRender = false;

      syncLeistung();
      syncModel();
      syncPreview();
      syncModulRaster();
      syncContext();
      syncSplats();
      syncGlb();
      syncSun();
      syncSketchModus();
      syncSketchDrawing();
      syncMeshHandles();
      // Auswahl-Highlight (Kupfer-Glut, E3 v0.8.7 um den Kanten-Akzent
      // erweitert: `model.children` enthält je Entity GENAU ein Mesh + eine
      // LineSegments-Kante — beide tragen `entityId` (Kante seit E3, s.o.
      // `artifactToObjects`), keine anderen Objekttypen leben in `model`
      // (Sketch/Preview/Handles/Kontext/GLB sind eigene Gruppen). Die Kante
      // wird per Material-REFERENZ getauscht (nie mutiert) — `edgeMaterial`
      // ist eine EINZIGE, von ALLEN Entities geteilte Instanz; ein `.color.
      // set(...)` darauf würde jede Kante im Modell verfärben, nicht nur die
      // gewählte. `selectedEdgeMaterial` ist ebenfalls eine einmalige,
      // wiederverwendete Instanz (oben) — kein Material entsteht hier neu.
      const sel = new Set(useProject.getState().selection);
      for (const child of model.children) {
        const entityId = child.userData['entityId'] as string | undefined;
        if (entityId === undefined) continue;
        const isSel = sel.has(entityId);
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.emissive) mat.emissive.setHex(isSel ? 0xa84b2b : 0x000000);
          if ('emissiveIntensity' in mat) mat.emissiveIntensity = isSel ? 0.35 : 0;
          continue;
        }
        const lines = child as THREE.LineSegments;
        if (lines.isLineSegments) {
          lines.material = isSel ? selectedEdgeMaterial : edgeMaterial;
        }
      }
      // Punktgrösse der Splats folgt Brennweite × Pufferhöhe (perspektivisch korrekt)
      splatUniforms.uFocal.value = 0.5 * renderer.domElement.height * camera.projectionMatrix.elements[5]!;
      renderer.render(scene, camera);
      frameCount++;
    };
    const loop = () => {
      renderFrame();
      if (!testMode) raf = requestAnimationFrame(loop);
    };

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      invalidate(); // V-M1 Commit 2: neue Grösse muss sofort sichtbar sein
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();
    loop();

    // v0.6.7 P0: «Für Vis aufnehmen» — EIN frischer Frame mit der jetzigen
    // Kamera (kein Sprung, keine Bewegung), sofort danach als dataURL gelesen
    // (kein `preserveDrawingBuffer`-Umweg nötig: synchron im selben Tick).
    //
    // v0.7.3 D5 («Phase entscheidet den Modus», docs/soll-073/
    // 6a-d5-phase-entscheidet-modus.png): JEDES Beweis-Capture — «Für Vis
    // aufnehmen» (oben, onClick={fuerVisAufnehmen}), Blatt-Bildslots und der
    // Kosmo-Blick (state/kosmo-blick.ts) — MUSS zwingend im AMTLICHEN Modus
    // rendern (`offizielleDarstellung3d()`, packages/kosmo-kernel/src/model/
    // doc.ts), nicht im aktuell gewählten Arbeitsmodus. Die manuelle
    // Darstellung-Auswahl (DesignWorkspace.tsx, «Darstellung»-Select) bleibt
    // sticky Arbeitsmodus, ist aber NIE amtlich — s. `offizielleDarstellung3d`-
    // Kommentar für den Unterschied zu `aufgeloesteDarstellung3d`.
    //
    // `opts.offiziell` löst dafür EINEN synchronen Material-Farbtausch aus:
    // Ziel-Modus bestimmen, jedes Mesh (ausser 'glas' — 0.7.0-Regel, Glas
    // bleibt in JEDEM Modus transparent, UNANTASTBAR) auf die Zielfarben
    // umfärben, EIN Frame rendern, `toDataURL` lesen, dann in einem
    // try/finally GARANTIERT auf die vorherigen Arbeitsmodus-Farben
    // zurückfärben und sofort erneut rendern (`renderer.render` direkt,
    // nicht `renderFrame()` — das würde bei aktivem On-Demand-Rendering
    // + FPS-Deckel den Rückbau-Frame u.U. verschlucken und das Canvas
    // sichtbar im amtlichen Modus stehen lassen). So bleibt der
    // Arbeitsmodus/das Doc unangetastet, und es gibt kein sichtbares
    // Flackern: der Browser malt erst nach Rückkehr aus dieser synchronen
    // Funktion, zu dem Zeitpunkt zeigt das Canvas bereits wieder den
    // Arbeitsmodus. Bewusst NUR ein Farbtausch (kein Textur-/UV-Rebuild) —
    // ein vollständiger Rebuild+Rückbau im selben Tick wäre unverhältnismässig
    // riskant für einen einzelnen Beweis-Frame.
    captureRef.current = (opts) => {
      if (!opts?.offiziell) {
        renderFrame();
        return renderer.domElement.toDataURL('image/png');
      }
      // Modell auf den aktuellen Doc-Stand bringen (Arbeitsmodus-Frame),
      // BEVOR der amtliche Farbtausch ansetzt — sonst könnte ein noch
      // ausstehender Rebuild (syncModel) mitten in den Tausch fallen.
      renderFrame();
      const zielModus = offizielleDarstellung3d(useProject.getState().doc.settings, opts.zweck);
      const rueckbau: { mat: THREE.MeshStandardMaterial; color: number; roughness: number; metalness: number }[] = [];
      try {
        for (const child of model.children) {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) continue;
          const materialKey = (mesh.userData['materialKey'] as string | undefined) ?? 'default';
          // Glas-Ausnahme (0.7.0-Regel): bleibt in JEDEM Modus transparent,
          // wird beim amtlichen Farbtausch NICHT angefasst.
          if (materialKey === 'glas') continue;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          rueckbau.push({ mat, color: mat.color.getHex(), roughness: mat.roughness, metalness: mat.metalness });
          const spec = materialPalette[materialKey] ?? materialPalette['default']!;
          const ziel =
            zielModus === 'weiss'
              ? { color: 0xffffff, roughness: 0.9, metalness: 0 }
              : zielModus === 'schwarz'
                ? { color: 0x1c1c1c, roughness: 0.95, metalness: 0 }
                : { color: spec.color, roughness: spec.roughness, metalness: spec.metalness ?? 0 };
          mat.color.setHex(ziel.color);
          mat.roughness = ziel.roughness;
          mat.metalness = ziel.metalness;
        }
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
      } finally {
        for (const b of rueckbau) {
          b.mat.color.setHex(b.color);
          b.mat.roughness = b.roughness;
          b.mat.metalness = b.metalness;
        }
        // Sofort zurückrendern (direkter Aufruf, NICHT renderFrame(): das
        // Render-Gate könnte den Frame bei aktivem On-Demand-Rendering
        // verschlucken) — das Canvas zeigt danach wieder den Arbeitsmodus,
        // bevor die Funktion zurückkehrt.
        renderer.render(scene, camera);
      }
    };

    // Deterministischer Test-Hook (Playwright): RAF stoppen, Einzelframe rendern
    (window as never as Record<string, unknown>)['__kosmoViewport'] = {
      // v0.6.8 («Kosmo sieht mit», state/kosmo-blick.ts): Kosmos ehrlichster
      // Blick auf die 3D-Station — derselbe Weg wie `fuerVisAufnehmen()`
      // oben (EIN frischer Frame mit der jetzigen Kamera, direkt danach
      // synchron `toDataURL`, kein dauerhaftes `preserveDrawingBuffer`).
      // `null`, solange kein Frame gerendert werden kann (z.B. nach Unmount).
      // v0.7.3 D5: `opts` optional durchgereicht — bestehende Aufrufer ohne
      // Argument (e2e/eingabe-3d.spec.ts) bleiben unverändert kompatibel.
      captureFrame: (opts?: { offiziell?: boolean; zweck?: 'situation' | 'volumennachweis' }): string | null =>
        captureRef.current?.(opts) ?? null,
      renderOnce: () => {
        testMode = true;
        cancelAnimationFrame(raf);
        // V-M1 Commit 2: `renderOnce()` MUSS immer wirklich rendern — der
        // API-Vertrag bleibt gleich, unabhängig vom on-demand-Zustand.
        needsRender = true;
        renderFrame();
      },
      resume: () => {
        testMode = false;
        needsRender = true;
        loop();
      },
      setCamera: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => {
        controls.setLookAt(px, py, pz, tx, ty, tz, false);
      },
      // Serie J / J1a: Kamerazustand für E2E-Assertions (Gesten → Kamera-Delta).
      getCamera: () => {
        const p = controls.getPosition(new THREE.Vector3());
        const t = controls.getTarget(new THREE.Vector3());
        return { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z };
      },
      // V-M1 Commit 2 (API-kompatible Erweiterung, s. Vertrag): Frame-Zähler
      // + manuelles Invalidieren für `e2e/tools/frame-messung.mts`.
      frameCount: () => frameCount,
      resetFrameCount: () => {
        frameCount = 0;
      },
      invalidate: () => invalidate(),
      renderBeiBedarfAktiv: () => renderBeiBedarfAn,
      // K2 (v0.7.0 Stream 3B, ROADMAP 144-Restrisiko): ehrlicher Beweis-Anker
      // für den Referenz-3D-Ladepfad — zählt WIRKLICH die Meshes im über
      // `syncGlb()` geladenen `glbGroup` (GLTFLoader-Ergebnis), kein Fake.
      // 0 solange kein GLB geladen ist (`glbGroup === null`).
      glbMeshCount: (): number => {
        let n = 0;
        glbGroup?.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) n++;
        });
        return n;
      },
      // D5-Fix (v0.8.6 PB2): `syncModel()` baut Doc-Entities NICHT synchron
      // in `model` ein (Golden-Präzedenz `applyArtifacts`/Worker-Pfad,
      // Zeile ~1514-1540) — ein einzelnes `renderOnce()` direkt nach
      // `__kosmo.run('design.wandZeichnen', …)` sieht darum manchmal noch
      // die ALTE Mesh-Menge. Deterministischer Zähl-Anker (wie
      // `glbMeshCount` oben), damit E2E VOR einem 3D-Pick auf die passende
      // Mesh-Anzahl pollen kann, statt eine geratene Wartezeit zu raten.
      entityMeshCount: (): number => model.children.filter((c) => (c as THREE.Mesh).isMesh).length,
      // E4-Beweis-Anker (v0.8.7, wie `entityMeshCount`): zählt NUR die
      // ereignisgetriebenen KAMERA-HUD-Schreibungen (control/update/rest,
      // rAF-gebündelt) — vom 400ms-Fallback-Poll unabhängig, damit E2E den
      // Event-Weg beweisen kann, ohne gegen dessen Timing zu wetten.
      kameraHudEventCount: (): number => camHudEventCount,
      // E5-Beweis-Anker (v0.8.8 PB1, C-9): Dauer des LETZTEN Occlusion-Post-
      // Processing im Marquee-Commit (ms, `performance.now()`-Differenz) —
      // -1 solange noch kein Marquee mit Occlusion committet hat.
      letzteMarqueeOcclusionMs: (): number => letzteMarqueeOcclusionMs,
      // E6-Beweis-Anker (v0.8.8 PB1, docs/V088-SPEZ.md §3 E6): liest den
      // neuen Esc-Zustands-Kanal (`viewport-chrome-runtime.ts` `marqueeAktiv`)
      // — kein neuer globaler Store-Zugriff nötig, dieselbe
      // `__kosmoViewport`-Testhook-Konvention wie alle Anker oben.
      marqueeAktiv: (): boolean => useViewportChromeRuntime.getState().marqueeAktiv,
    };

    return () => {
      unsubscribeProjekt();
      deriveWorker?.terminate();
      cancelAnimationFrame(raf);
      if (camHudRaf) cancelAnimationFrame(camHudRaf);
      controls.removeEventListener('control', kameraHudEvent);
      controls.removeEventListener('update', kameraHudEvent);
      controls.removeEventListener('rest', kameraHudEvent);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerdown', onCaptureDown, { capture: true } as EventListenerOptions);
      mount.removeEventListener('pointerup', onCaptureUp, { capture: true } as EventListenerOptions);
      mount.removeEventListener('pointercancel', onCaptureUp, { capture: true } as EventListenerOptions);
      window.removeEventListener('pointerup', onCaptureUp);
      window.removeEventListener('keydown', onKey);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      controlsRef.current = null;
      modelRef.current = null;
      captureRef.current = null;
      cameraRef.current = null;
      setViewportBereit(false);
      // E6 (v0.8.8 PB1, docs/V088-SPEZ.md §3 E6): Unmount-Cleanup — eine
      // laufende Marquee-Geste kann nicht über einen Unmount hinweg
      // fortbestehen (das DOM-Overlay verschwindet mit `mount` ohnehin);
      // der Store-Kanal räumt unbedingt mit, sonst bliebe `marqueeAktiv`
      // bei einem Unmount MITTEN in der Geste (z.B. Ansichtswechsel 3D→2D
      // während eines Shift-Drags) fälschlich `true` stehen.
      useViewportChromeRuntime.setState({ marqueeAktiv: false });
    };
    // navModus wird über den separaten Sync-Effekt oben nachgezogen (controlsRef) —
    // hier zählt nur der Startwert beim Aufbau der Szene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers]);

  // T3: Home/Fit — passt die Kamera auf den Modellinhalt ein, sonst zurück
  // zur gespeicherten Ausgangslage (saveState() beim Szenenaufbau).
  const einpassen = () => {
    const controls = controlsRef.current;
    const model = modelRef.current;
    if (!controls) return;
    if (model && model.children.length > 0) {
      void controls.fitToBox(model, true, { paddingLeft: 0.15, paddingRight: 0.15, paddingTop: 0.15, paddingBottom: 0.15 });
    } else {
      void controls.reset(true);
    }
  };

  // v0.7.9 (A1) — Aktions-Callbacks der zwei neu gefloateten Blöcke
  // (`viewportHudStatuskarte`/`viewportEigenschaften`) in
  // `viewport-chrome-runtime.ts` spiegeln, s. Kopfkommentar dort.
  // `einpassen`/`renderStarten`/`fuerVisAufnehmen`/`chromeTexturToggle` sind
  // (anders als `chromeWerkzeugWechsel` oben) bei jedem Render frische
  // Closures — in den Store geschrieben wird darum EINMAL ein stabiler
  // Wrapper, der über einen Ref immer die aktuelle Closure ruft. WICHTIG:
  // NICHT bei jedem Commit vier neue Funktions-Referenzen in den Store
  // schreiben — jede solche Schreibung benachrichtigt alle Store-Leser
  // (die HUD-Floats) und erzeugte bei der hohen Commit-Frequenz dieser
  // Komponente (400ms-Kamera-Poll + Render-Status-Poll) einen permanenten
  // Re-Render-Strom.
  const chromeAktionenRef = useRef({
    einpassen,
    rendern: renderStarten,
    fuerVis: fuerVisAufnehmen,
    texturToggle: chromeTexturToggle,
  });
  useEffect(() => {
    chromeAktionenRef.current = {
      einpassen,
      rendern: renderStarten,
      fuerVis: fuerVisAufnehmen,
      texturToggle: chromeTexturToggle,
    };
  });
  useEffect(() => {
    useViewportChromeRuntime.setState({
      onEinpassen: () => chromeAktionenRef.current.einpassen(),
      onRendern: () => chromeAktionenRef.current.rendern(),
      onFuerVisAufnehmen: () => chromeAktionenRef.current.fuerVis(),
      onTexturToggle: () => chromeAktionenRef.current.texturToggle(),
    });
  }, []);

  // Serie J / J2: Raycast am Kontextmenü-Klickpunkt (Body-Ebene, über die Refs).
  const kontextTreffer = (clientX: number, clientY: number) => {
    const controls = controlsRef.current;
    const model = modelRef.current;
    const canvas = mountRef.current?.querySelector('canvas');
    if (!controls || !model || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, controls.camera as THREE.Camera);
    return rc.intersectObjects(model.children, false).find((h) => (h.object as THREE.Mesh).isMesh) ?? null;
  };
  const kontextAktionen = kontext
    ? [
        {
          label: 'Auswählen',
          testid: 'kontext-auswaehlen',
          onClick: () => {
            const hit = kontextTreffer(kontext.clientX, kontext.clientY);
            handlers.current?.onPick?.(hit ? ((hit.object.userData['entityId'] as string) ?? null) : null);
          },
        },
        {
          label: 'Fokus hier',
          testid: 'kontext-fokus',
          onClick: () => {
            const hit = kontextTreffer(kontext.clientX, kontext.clientY);
            if (hit) controlsRef.current?.setOrbitPoint(hit.point.x, hit.point.y, hit.point.z);
          },
        },
        { label: 'Einpassen', testid: 'kontext-einpassen', onClick: einpassen },
        { label: 'Ansicht zurücksetzen', testid: 'kontext-reset', onClick: () => void controlsRef.current?.reset(true) },
      ]
    : [];

  return (
    <div className="v3d-root">
      <div
        ref={mountRef}
        className="v3d-mount"
        data-testid="viewport3d"
        data-darstellung3d={darstellung3dAufgeloest}
      />
      {/* E5 (v0.8.7 PB2, docs/V087-SPEZ.md §3 E5): Shift-Marquee-Overlay —
          reines Screen-Space-div (kein SVG/Three-Objekt, `marquee3d` kommt
          über den `setMarquee3dRef`-Brücken-Ref aus dem imperativen
          Pointer-Automaten oben), positioniert relativ zu `.v3d-root`
          (`position:absolute; inset:0`, deckungsgleich mit `.v3d-mount` —
          dieselbe Canvas-`getBoundingClientRect()`-Herkunft wie `x`/`y`
          oben). Optik an PlanView.tsx `plan-marquee` angelehnt (dieselben
          `--k-accent`/`--k-accent-wash`-Tokens, kein neuer Hex — Sanktion 6),
          hier als CSS-Border statt SVG-Stroke, weil kein SVG-Layer über dem
          3D-Canvas liegt. */}
      {marquee3d && (
        <div
          data-testid="viewport3d-marquee"
          style={{
            position: 'absolute',
            left: marquee3d.x,
            top: marquee3d.y,
            width: marquee3d.width,
            height: marquee3d.height,
            backgroundColor: 'var(--k-accent-wash)',
            border: '1.5px dashed var(--k-accent)',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />
      )}
      <ViewportChrome
        sichtbar={viewportBereit && designOberflaeche === 'manuell'}
        modus={viewportModus}
        azimutRad={chromeSnapshot.azimutRad}
        polarGrad={chromeSnapshot.polarGrad}
        distanzM={chromeSnapshot.distanzM}
        zoomProzentWert={chromeZoomProzentWert}
        brennweiteMm={chromeBrennweiteMm}
        aspektBreite={chromeSnapshot.breitePx}
        aspektHoehe={chromeSnapshot.hoehePx}
        geschossLabel={chromeGeschossLabel}
        kontextAnzahl={chromeSnapshot.kontextAnzahl}
        splatAktiv={chromeSnapshot.splatAktiv}
        texturenAn={texturenChromeAn}
        sonnenDatum={chromeSnapshot.sonnenDatum}
        standortLabel={chromeStandortLabel}
        leistungsStufeLabel={chromeLeistungsStufeLabel}
        schattenAn={chromeSchattenAn}
        darstellungsModus={darstellung3dAufgeloest}
        renderStatusLabel={RENDER_STATUS_LABEL[renderStatus] ?? renderStatus}
        renderCloudLeer={renderCloudLeer}
        onEinpassen={einpassen}
        onRendern={renderStarten}
        onFuerVisAufnehmen={fuerVisAufnehmen}
        onZoomKleiner={chromeZoomKleiner}
        onZoomGroesser={chromeZoomGroesser}
        onVollbild={chromeVollbild}
        vollbildAktiv={vollbildAktiv}
        onTexturToggle={chromeTexturToggle}
        versteckeBottomLeiste={sketchModeAn}
      />
      {designOberflaeche === 'manuell' && (
      <NavLeiste
        testid="nav-3d"
        aktionen={[
          { id: 'orbit', icon: '⟳', titel: 'Orbit — linke/mittlere Maustaste dreht die Kamera · 1 Finger dreht', aktiv: navModus === 'orbit', onClick: () => setNavModus('orbit') },
          { id: 'pan', icon: '✋', titel: 'Pan — rechte Maustaste (oder Shift+Mitte) verschiebt · 2/3 Finger verschieben', aktiv: navModus === 'pan', onClick: () => setNavModus('pan') },
          { id: 'zoom', icon: '🔍', titel: 'Zoom — Mausrad zieht zum Cursor · 2 Finger zusammen/auseinander (Pinch)', aktiv: navModus === 'zoom', onClick: () => setNavModus('zoom') },
          { id: 'fit', icon: '⌂', titel: 'Einpassen — Modell ins Bild holen (ohne Modell: Ausgangslage)', onClick: einpassen },
        ]}
      />
      )}
      {/* V-M1: Render-Knopf — eigene untere Werkzeug-Ecke (rechts, ÜBER der
          Orbit/Pan/Zoom/Fit-Leiste, unter dem fixen Kosmo-Symbol vorbei —
          gleiche Spalte wie `NavLeiste` (`right:88`), aber `bottom:92` statt
          `bottom:50`, damit sich nichts stapelt). Unaufdringlich: im Ruhe-
          zustand nur der Knopf, das Status-/Ergebnis-Panel wächst darüber.
          PD5 (Owner-Befund, Screenshot-Review 17.07.2026): dieser Block war
          bislang der EINE Rest der klassischen Viewport-Fläche, den PD3c/PD4
          nicht auf `designOberflaeche === 'manuell'` gegated hatten (anders
          als `<ViewportChrome sichtbar=…>` zwei Zeilen oben und `<NavLeiste>`
          direkt darunter, die beide bereits denselben Guard tragen) — «Für
          Vis aufnehmen»/«Rendern» schwebten dadurch AUCH im Island-Modus
          weiter frei über dem Viewport, ausserhalb der AUSTAUSCH-Insel (der
          E2E-Fund `viewport-panel-aktion`=0 hatte nur die AUSTAUSCH-Insel
          selbst geprüft, nicht diesen zweiten, älteren Render-Zugang). Additiv
          derselbe Guard wie die beiden Nachbarn — Manuell-Modus bleibt
          byte-gleich sichtbar, nur der Island-Modus blendet aus. */}
      {designOberflaeche === 'manuell' && (
      <div className="v3d-render-ecke">
        {renderStatus !== 'bereit' && (
          <div
            data-testid="viewport-render-panel"
            className="v3d-render-panel"
          >
            <div className="v3d-render-kopf">
              <Badge hue={moduleHue.vis}>Render</Badge>
              <span
                data-testid="viewport-render-status"
                className="v3d-render-status"
                style={{
                  color:
                    renderStatus === 'fertig'
                      ? 'var(--k-success)'
                      : renderIstFehler
                        ? 'var(--k-danger)'
                        : 'var(--k-warning)',
                }}
              >
                {RENDER_STATUS_LABEL[renderStatus] ?? renderStatus}
              </span>
            </div>
            {renderStatus === 'wartetFreigabe' && (
              <KButton size="sm" tone="quiet" data-testid="viewport-render-freigeben" onClick={renderFreigeben}>
                Freigeben
              </KButton>
            )}
            {renderLaeuftNoch && (
              <KButton size="sm" tone="ghost" data-testid="viewport-render-abbrechen" onClick={renderAbbrechen}>
                Abbrechen
              </KButton>
            )}
            {renderStatus === 'fertig' && renderLauf?.jobId && renderLauf.bild ? (
              <>
                <BridgeBild
                  jobId={renderLauf.jobId}
                  imageName={renderLauf.bild}
                  alt="Render"
                  testid="viewport-render-bild"
                  className="v3d-render-bild"
                />
                <KButton size="sm" tone="accent" data-testid="viewport-render-blatt" onClick={renderAufsBlatt}>
                  Aufs Blatt legen
                </KButton>
              </>
            ) : (
              renderIstFehler && (
                <div data-testid="viewport-render-fehler" className="v3d-render-fehler">
                  {renderLauf?.fehler ?? 'Render fehlgeschlagen'}
                </div>
              )
            )}
          </div>
        )}
        {/* v0.6.7 P0: klein, additiv, eigener Knopf — KEIN Teil der Render-
            Kette (kein Job, keine Bridge). Nimmt IMMER den aktuellen
            Viewport-Stand auf, bewegt/wählt selbst keine Kamera. */}
        <KButton
          tone="ghost"
          size="sm"
          data-testid="viewport-aufnahme"
          title="Aktuelles Viewport-Bild als lokale Bildquelle für KosmoVis aufnehmen (kein Rendering, kein Bridge-Job)"
          onClick={fuerVisAufnehmen}
        >
          <span className="v3d-knopf-inhalt">
            <KIcon name="kamera" size={14} />
            Für Vis aufnehmen
          </span>
        </KButton>
        <KButton
          tone="accent"
          size="sm"
          data-testid="viewport-render-knopf"
          disabled={renderLaeuftNoch || renderCloudLeer}
          title={
            renderCloudLeer
              ? 'Kein HomeStation-Server verbunden — im Cloud-Betrieb rendert die Kette nicht lokal. Cloud-Weg (Gemini Omni Flash, Preview) wartet auf Owner-Entscheid + Schlüssel — siehe KosmoDoc → Tech-Radar.'
              : 'Rendern — dieselbe KosmoVis-Kette wie die Vis-Station'
          }
          onClick={renderStarten}
        >
          <span className="v3d-knopf-inhalt">
            <KIcon name="kamera" size={14} />
            {renderKnopfLabel}
          </span>
        </KButton>
      </div>
      )}
      {kontext && (
        <ViewportKontextmenue
          x={kontext.x}
          y={kontext.y}
          aktionen={kontextAktionen}
          onClose={() => setKontext(null)}
        />
      )}
      {sketchModeAn && sketchStrokes.length === 0 && !sketchPending && (
        <div
          data-testid="sketch3d-hinweis"
          className="v3d-sketch-hinweis"
        >
          Klicken + ziehen zeichnet auf der getroffenen Fläche — auf einer Wand ergibt der Strich eine Öffnung, sonst
          eine Wand. Kamera steht still, bis das Werkzeug wechselt.
        </div>
      )}
      {!sketchPending && sketchStrokes.length > 0 && (
        <div
          data-testid="sketch3d-batch"
          className="v3d-sketch-batch"
        >
          <Badge hue={moduleHue.design}>Frei skizziert</Badge>
          <span className="v3d-sketch-text">{sketchStrokes.length} Strich{sketchStrokes.length === 1 ? '' : 'e'}</span>
          <KButton size="sm" tone="accent" data-testid="sketch3d-uebergeben" onClick={sketchUebergeben}>
            Übergeben
          </KButton>
          <KButton size="sm" tone="ghost" data-testid="sketch3d-verwerfen-alle" onClick={sketchAllesVerwerfen}>
            Alles verwerfen
          </KButton>
        </div>
      )}
      {sketchPending && (
        <div
          data-testid="sketch3d-proposal"
          className="v3d-sketch-batch v3d-sketch-batch--vorschlag"
        >
          <Badge hue={moduleHue.design}>Skizze erkannt</Badge>
          <span className="v3d-sketch-text">{sketchPending.length} Wände</span>
          <KButton size="sm" tone="accent" data-testid="sketch3d-accept" onClick={sketchUebernehmen}>
            Übernehmen
          </KButton>
          <KButton size="sm" tone="ghost" onClick={() => setSketchPending(null)}>
            Verwerfen
          </KButton>
        </div>
      )}
    </div>
  );
}
