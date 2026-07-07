import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { gestenDetektor, kameraDarfSehen, mausBelegung, touchBelegung, werkzeugCursorFuer, type KameraAktion } from './eingabe-3d';
import { ViewportKontextmenue } from './ViewportKontextmenue';
import * as SunCalc from 'suncalc';
import { deriveAll, type GeometryArtifact, type Pt, type Wall } from '@kosmo/kernel';
import { Badge, KButton, meldeFehler, moduleHue } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import type { ContextMesh } from './ifc-import';
import { pbrPalette } from '@kosmo/data';
import type { Fluchtlinie } from './zeichenhilfen';
import { NavLeiste } from './NavLeiste';
import { fitStrokes, type FittedSegment, type Stroke } from './sketch';
import {
  achsAbstand,
  groundHitToPlanPt,
  klassifiziereSketchTreffer,
  rayToPlanPt,
  wandTrefferZuOeffnung,
  type WandTrefferPunkt,
} from './sketch-3d';

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
  onSketchAccept?: (segments: { a: Pt; b: Pt }[]) => void;
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
  onPick?: (entityId: string | null) => void;
  /** 2D-Verschieben: Geste beginnt auf einem getroffenen Element (liefert false = kein Ziehen). */
  onMoveStart?: (entityId: string, p: Pt) => boolean;
  onMoveDrag?: (p: Pt) => void;
  onMoveEnd?: (p: Pt) => void;
  /** Lebende Zieh-Vorschau (Kern-mm), während `onMoveStart…onMoveEnd` läuft. */
  moveOffset?: { id: string; dx: number; dy: number } | null;
  /** T3-Zeichenhilfen: sichtbare Fluchtlinien (Ausrichtung an bestehenden Punkten) — nur 2D-Overlay (PlanView). */
  fluchtlinien?: Fluchtlinie[];
  /** T3: Shift hat den Winkel zum letzten Punkt auf 45°-Vielfache fixiert. */
  orthoAktiv?: boolean;
}

import { materialKarten, texturenAktiv } from './texturen';

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
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<CameraControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const [navModus, setNavModus] = useState<'orbit' | 'pan' | 'zoom'>('orbit');
  const navModusRef = useRef<'orbit' | 'pan' | 'zoom'>('orbit');
  // Serie J / J2: Rechtsklick-/Long-Press-Kontextmenü. x/y positionieren das
  // Menü im Viewport, clientX/Y speisen den Raycast der Menü-Aktionen.
  const [kontext, setKontext] = useState<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const setKontextRef = useRef(setKontext);
  setKontextRef.current = setKontext;
  // J1b (Fable-Auflage): der Menü-offen-Zustand fliesst in die EINE
  // Capture-Down-Entscheidung ein (kein zweiter, verstreuter enabled-Schreiber)
  // — solange das Kontextmenü offen ist, bleibt die Kamera still.
  const kontextOffenRef = useRef(false);
  useEffect(() => {
    kontextOffenRef.current = !!kontext;
  }, [kontext]);

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
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

    function artifactToObjects(a: GeometryArtifact): THREE.Object3D[] {
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
      const karten = texturenAktiv() ? materialKarten(a.materialKey) : null;
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
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color: karten ? 0xffffff : spec.color,
          roughness: spec.roughness,
          metalness: spec.metalness ?? 0,
          ...(karten
            ? { map: karten.map, bumpMap: karten.bumpMap, bumpScale: karten.bumpScale }
            : {}),
        }),
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData['entityId'] = a.entityId;

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
      for (const a of artifacts) {
        for (const o of artifactToObjects(a)) model.add(o);
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
        applyArtifacts(deriveAll(doc));
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
        };
      }
      deriveWorker.postMessage({ revision, json: doc.toJSON() });
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
      if (handlers.current?.pickMode) {
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.set(
          ((ev.clientX - rect.left) / rect.width) * 2 - 1,
          -((ev.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(model.children, false);
        const hit = hits.find((h) => (h.object as THREE.Mesh).isMesh && h.object.userData['entityId']);
        handlers.current.onPick?.(hit ? (hit.object.userData['entityId'] as string) : null);
        return;
      }
      const p = groundPoint(ev);
      if (p) handlers.current?.onGroundClick?.({ p, shiftKey: ev.shiftKey });
    };
    const onPointerMove = (ev: PointerEvent) => {
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
      if (ev.key === 'Escape') handlers.current?.onEscape?.();
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
      controls.enabled = kameraDarfSehen(ev.pointerType, ev.button, !!handlers.current?.sketchMode);
      setzeTouchStyles(); // enabled-Toggle räumt die Touch-Styles ab (J2-2)
    };
    const onCaptureUp = () => {
      controls.enabled = true;
      setzeTouchStyles();
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
    const renderFrame = () => {
      syncModel();
      syncPreview();
      syncModulRaster();
      syncContext();
      syncSplats();
      syncGlb();
      syncSun();
      syncSketchModus();
      syncSketchDrawing();
      // Serie J / J2: Kontextcursor je Werkzeug/Modus. handlers ist ein Ref
      // (kein Re-Render bei Werkzeugwechsel), darum je Frame abgeleitet und nur
      // bei Änderung gesetzt.
      {
        const tool = handlers.current?.sketchMode ? 'skizze' : handlers.current?.pickMode ? 'auswahl' : 'wand';
        const cur = werkzeugCursorFuer(tool, navModusRef.current);
        if (renderer.domElement.style.cursor !== cur) renderer.domElement.style.cursor = cur;
      }
      // J1b: Long-Press öffnet das Kontextmenü + setzt den Orbit-Pivot auf den
      // Treffer (nur ausserhalb Skizzenmodus/offenem Menü; feuert genau einmal).
      if (!handlers.current?.sketchMode && !kontextOffenRef.current) {
        const lp = gesten.pruefeLongPress(performance.now());
        if (lp.longPress) {
          const hit = meshTrefferAt(lp.longPress.x, lp.longPress.y);
          if (hit) controls.setOrbitPoint(hit.point.x, hit.point.y, hit.point.z);
          const r = mount.getBoundingClientRect();
          setKontextRef.current({ x: lp.longPress.x - r.left, y: lp.longPress.y - r.top, clientX: lp.longPress.x, clientY: lp.longPress.y });
        }
      }
      // Auswahl-Highlight (Kupfer-Glut)
      const sel = new Set(useProject.getState().selection);
      for (const child of model.children) {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) continue;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const isSel = sel.has(mesh.userData['entityId'] as string);
        if (mat.emissive) mat.emissive.setHex(isSel ? 0xa84b2b : 0x000000);
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = isSel ? 0.35 : 0;
      }
      controls.update(clock.getDelta());
      // Punktgrösse der Splats folgt Brennweite × Pufferhöhe (perspektivisch korrekt)
      splatUniforms.uFocal.value = 0.5 * renderer.domElement.height * camera.projectionMatrix.elements[5]!;
      renderer.render(scene, camera);
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
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();
    loop();

    // Deterministischer Test-Hook (Playwright): RAF stoppen, Einzelframe rendern
    (window as never as Record<string, unknown>)['__kosmoViewport'] = {
      renderOnce: () => {
        testMode = true;
        cancelAnimationFrame(raf);
        renderFrame();
      },
      resume: () => {
        testMode = false;
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
    };

    return () => {
      deriveWorker?.terminate();
      cancelAnimationFrame(raf);
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
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} data-testid="viewport3d" />
      <NavLeiste
        testid="nav-3d"
        aktionen={[
          { id: 'orbit', icon: '⟳', titel: 'Orbit — linke/mittlere Maustaste dreht die Kamera · 1 Finger dreht', aktiv: navModus === 'orbit', onClick: () => setNavModus('orbit') },
          { id: 'pan', icon: '✋', titel: 'Pan — rechte Maustaste (oder Shift+Mitte) verschiebt · 2/3 Finger verschieben', aktiv: navModus === 'pan', onClick: () => setNavModus('pan') },
          { id: 'zoom', icon: '🔍', titel: 'Zoom — Mausrad zieht zum Cursor · 2 Finger zusammen/auseinander (Pinch)', aktiv: navModus === 'zoom', onClick: () => setNavModus('zoom') },
          { id: 'fit', icon: '⌂', titel: 'Einpassen — Modell ins Bild holen (ohne Modell: Ausgangslage)', onClick: einpassen },
        ]}
      />
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
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 18,
            transform: 'translateX(-50%)',
            background: 'var(--k-surface)',
            border: '1px solid var(--k-line)',
            borderRadius: 'var(--k-radius-md)',
            padding: '6px 12px',
            fontSize: 13,
            boxShadow: 'var(--k-shadow-overlay)',
          }}
        >
          Klicken + ziehen zeichnet auf der getroffenen Fläche — auf einer Wand ergibt der Strich eine Öffnung, sonst
          eine Wand. Kamera steht still, bis das Werkzeug wechselt.
        </div>
      )}
      {!sketchPending && sketchStrokes.length > 0 && (
        <div
          data-testid="sketch3d-batch"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 18,
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'var(--k-surface)',
            border: '1px solid var(--k-line)',
            borderRadius: 'var(--k-radius-md)',
            padding: '8px 12px',
            boxShadow: 'var(--k-shadow-overlay)',
          }}
        >
          <Badge hue={moduleHue.design}>Frei skizziert</Badge>
          <span style={{ fontSize: 13 }}>{sketchStrokes.length} Strich{sketchStrokes.length === 1 ? '' : 'e'}</span>
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
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 18,
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'var(--k-surface)',
            border: '1px solid var(--k-accent)',
            borderRadius: 'var(--k-radius-md)',
            padding: '8px 12px',
            boxShadow: 'var(--k-shadow-overlay)',
          }}
        >
          <Badge hue={moduleHue.design}>Skizze erkannt</Badge>
          <span style={{ fontSize: 13 }}>{sketchPending.length} Wände</span>
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
