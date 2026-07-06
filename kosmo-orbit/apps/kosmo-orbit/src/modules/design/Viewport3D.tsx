import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import CameraControls from 'camera-controls';
import * as SunCalc from 'suncalc';
import { deriveAll, type GeometryArtifact, type Pt } from '@kosmo/kernel';
import { meldeFehler } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import type { ContextMesh } from './ifc-import';
import { pbrPalette } from '@kosmo/data';
import type { Fluchtlinie } from './zeichenhilfen';
import { NavLeiste } from './NavLeiste';

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

// T3: Orbit/Pan/Zoom-Modus fürs linke Mausdrücken — rechte Maustaste/Mittel-
// taste/Rad bleiben IMMER Pan/Zoom (camera-controls-Default, unverändert),
// die Knöpfe geben zusätzlich dem linken Klick eine explizite Bedeutung (v.a.
// hilfreich am Trackpad ohne Mitteltaste).
type MausAktion = CameraControls['mouseButtons']['left'];
const NAV_ACTION: Record<'orbit' | 'pan' | 'zoom', MausAktion> = {
  orbit: CameraControls.ACTION.ROTATE,
  pan: CameraControls.ACTION.TRUCK,
  zoom: CameraControls.ACTION.DOLLY,
};

export function Viewport3D({ handlers }: { handlers: React.RefObject<ViewportHandlers> }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<CameraControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const [navModus, setNavModus] = useState<'orbit' | 'pan' | 'zoom'>('orbit');

  // Linker Klick übernimmt den gewählten Modus; Rechtsklick/Mitteltaste/Rad
  // bleiben von camera-controls unangetastet (kein Funktionsverlust).
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.mouseButtons.left = NAV_ACTION[navModus];
  }, [navModus]);

  useEffect(() => {
    const mount = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const cssVar = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#edeae2';
    scene.background = new THREE.Color(cssVar('--k-viewport-sky'));

    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 2000);
    const controls = new CameraControls(camera, renderer.domElement);
    controls.setLookAt(18, 14, 18, 4, 0, -4, false);
    controls.dollyToCursor = true;
    controls.smoothTime = 0.12;
    controls.mouseButtons.left = NAV_ACTION[navModus];
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
    const onPointerDown = (ev: PointerEvent) => {
      downPos = { x: ev.clientX, y: ev.clientY };
    };
    const onPointerUp = (ev: PointerEvent) => {
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
    };

    return () => {
      deriveWorker?.terminate();
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('keydown', onKey);
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

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} data-testid="viewport3d" />
      <NavLeiste
        testid="nav-3d"
        aktionen={[
          { id: 'orbit', icon: '⟳', titel: 'Orbit — linke Maustaste dreht die Kamera um das Modell', aktiv: navModus === 'orbit', onClick: () => setNavModus('orbit') },
          { id: 'pan', icon: '✋', titel: 'Pan — linke Maustaste verschiebt die Ansicht (sonst: rechte Maustaste)', aktiv: navModus === 'pan', onClick: () => setNavModus('pan') },
          { id: 'zoom', icon: '🔍', titel: 'Zoom — linke Maustaste zieht näher/weiter (sonst: Mausrad/Mitteltaste)', aktiv: navModus === 'zoom', onClick: () => setNavModus('zoom') },
          { id: 'fit', icon: '⌂', titel: 'Einpassen — Modell ins Bild holen (ohne Modell: Ausgangslage)', onClick: einpassen },
        ]}
      />
    </div>
  );
}
