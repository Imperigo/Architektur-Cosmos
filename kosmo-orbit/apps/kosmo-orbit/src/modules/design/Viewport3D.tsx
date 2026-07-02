import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { deriveAll, type GeometryArtifact, type Pt } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import type { ContextMesh } from './ifc-import';

// Kontext-Layer (IFC-Bestand): sessionweit, nicht synchronisiert
let contextMeshes: ContextMesh[] = [];
let contextRevision = 0;
export function setContextMeshes(meshes: ContextMesh[]): void {
  contextMeshes = meshes;
  contextRevision++;
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
  onEscape?: () => void;
  /** Vorschau-Polylinie in Kern-mm (Werkzeug-Gummiband). */
  previewLine?: Pt[] | null;
  /** KosmoSketch: Freihand-Overlay im Plan aktiv. */
  sketchMode?: boolean;
  onSketchAccept?: (segments: { a: Pt; b: Pt }[]) => void;
  /** Auswahl-Werkzeug: Klick pickt Element statt zu zeichnen. */
  pickMode?: boolean;
  onPick?: (entityId: string | null) => void;
}

const materialPalette: Record<string, { color: number; roughness: number }> = {
  beton: { color: 0xc9c5bc, roughness: 0.9 },
  masse: { color: 0xd8cfc0, roughness: 0.95 },
  dach: { color: 0x6e5f52, roughness: 0.85 },
  holz: { color: 0xb08d5e, roughness: 0.8 },
  default: { color: 0xcfccc4, roughness: 0.9 },
};

export function Viewport3D({ handlers }: { handlers: React.RefObject<ViewportHandlers> }) {
  const mountRef = useRef<HTMLDivElement>(null);

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
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: spec.color, roughness: spec.roughness }),
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

    let lastRevision = -1;
    function syncModel() {
      const { doc, revision } = useProject.getState();
      if (revision === lastRevision) return;
      lastRevision = revision;
      model.clear();
      for (const a of deriveAll(doc)) {
        for (const o of artifactToObjects(a)) model.add(o);
      }
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
      syncContext();
      syncSplats();
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
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('keydown', onKey);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [handlers]);

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} data-testid="viewport3d" />;
}
