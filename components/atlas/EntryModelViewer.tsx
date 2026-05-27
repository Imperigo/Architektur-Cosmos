'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Material, Mesh } from 'three';

type EntryModelViewerProps = {
  modelUrl: string;
  title: string;
  accent: string;
};

type ViewerStatus = 'loading' | 'ready' | 'error';
type ViewerStyle = 'realistic' | 'analysis' | 'materials' | 'ghost';
type AnalysisLayerId = 'site' | 'mass' | 'structure' | 'envelope' | 'circulation' | 'roof_garden';
type MaterialLayerId = 'mineral' | 'concrete' | 'glass' | 'landscape' | 'circulation' | 'annotation';

type MeshRecord = {
  mesh: Mesh;
  layer: AnalysisLayerId;
  materialLayer: MaterialLayerId;
  originalMaterial: Material | Material[];
};

const analysisLayers: Array<{ id: AnalysisLayerId; label: string; color: string; description: string }> = [
  { id: 'site', label: 'Site', color: '#6cff9a', description: 'terrain / ground context' },
  { id: 'mass', label: 'Mass', color: '#f7f7f4', description: 'lifted body and slabs' },
  { id: 'structure', label: 'Tragwerk', color: '#ffb000', description: 'pilotis, slabs, structural order' },
  { id: 'envelope', label: 'Hülle', color: '#00e7ff', description: 'facade, ribbons, screens' },
  { id: 'circulation', label: 'Zirkulation', color: '#ff4d8d', description: 'ramp and promenade' },
  { id: 'roof_garden', label: 'Dachgarten', color: '#7dff6a', description: 'roof landscape' }
];

const materialLayers: Array<{ id: MaterialLayerId; label: string; color: string; description: string }> = [
  { id: 'mineral', label: 'Mineral', color: '#e8e5d7', description: 'render, plaster and mineral surfaces' },
  { id: 'concrete', label: 'Concrete', color: '#b8b5aa', description: 'pilotis, slabs and structural concrete' },
  { id: 'glass', label: 'Glass', color: '#74c8d4', description: 'ribbon windows and transparent envelope' },
  { id: 'landscape', label: 'Landscape', color: '#65ff9a', description: 'site, ground and roof garden' },
  { id: 'circulation', label: 'Path', color: '#ff4d8d', description: 'ramp, promenade and movement layers' },
  { id: 'annotation', label: 'Trace', color: '#ffb000', description: 'analytical traces and source markers' }
];

export function EntryModelViewer({ modelUrl, title, accent }: EntryModelViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const meshRecordsRef = useRef<MeshRecord[]>([]);
  const analysisMaterialsRef = useRef<Partial<Record<AnalysisLayerId, Material>>>({});
  const materialModeMaterialsRef = useRef<Partial<Record<MaterialLayerId, Material>>>({});
  const ghostMaterialsRef = useRef<Partial<Record<AnalysisLayerId, Material>>>({});
  const viewerStyleRef = useRef<ViewerStyle>('realistic');
  const visibleLayersRef = useRef<Record<AnalysisLayerId, boolean>>({
    site: true,
    mass: true,
    structure: true,
    envelope: true,
    circulation: true,
    roof_garden: true
  });
  const visibleMaterialsRef = useRef<Record<MaterialLayerId, boolean>>({
    mineral: true,
    concrete: true,
    glass: true,
    landscape: true,
    circulation: true,
    annotation: true
  });
  const [status, setStatus] = useState<ViewerStatus>('loading');
  const [viewerStyle, setViewerStyle] = useState<ViewerStyle>('realistic');
  const [visibleLayers, setVisibleLayers] = useState<Record<AnalysisLayerId, boolean>>(() => ({
    site: true,
    mass: true,
    structure: true,
    envelope: true,
    circulation: true,
    roof_garden: true
  }));
  const [visibleMaterials, setVisibleMaterials] = useState<Record<MaterialLayerId, boolean>>(() => ({
    mineral: true,
    concrete: true,
    glass: true,
    landscape: true,
    circulation: true,
    annotation: true
  }));

  useEffect(() => {
    viewerStyleRef.current = viewerStyle;
    visibleLayersRef.current = visibleLayers;
    visibleMaterialsRef.current = visibleMaterials;
    applyViewerStyle(meshRecordsRef.current, analysisMaterialsRef.current, materialModeMaterialsRef.current, ghostMaterialsRef.current, viewerStyle, visibleLayers, visibleMaterials);
  }, [viewerStyle, visibleLayers, visibleMaterials]);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    async function boot() {
      if (!mountRef.current) return;

      const [Three, { GLTFLoader }, { OrbitControls }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/controls/OrbitControls.js')
      ]);

      if (disposed || !mountRef.current) return;

      const mount = mountRef.current;
      const viewerQuality = detectViewerQuality();
      const scene = new Three.Scene();
      scene.background = new Three.Color(0x050505);
      scene.fog = new Three.Fog(0x050505, 18, 42);
      const analysisMaterials = {} as Record<AnalysisLayerId, Material>;
      const materialModeMaterials = {} as Record<MaterialLayerId, Material>;
      const ghostMaterials = {} as Record<AnalysisLayerId, Material>;

      analysisLayers.forEach((layer) => {
        analysisMaterials[layer.id] = new Three.MeshStandardMaterial({
          color: new Three.Color(layer.color),
          emissive: new Three.Color(layer.color),
          emissiveIntensity: 0.06,
          roughness: 0.72,
          metalness: 0
        });
        ghostMaterials[layer.id] = new Three.MeshStandardMaterial({
          color: new Three.Color(layer.color),
          transparent: true,
          opacity: layer.id === 'structure' || layer.id === 'circulation' ? 0.72 : 0.18,
          roughness: 0.88,
          metalness: 0,
          depthWrite: false
        });
      });

      materialLayers.forEach((layer) => {
        materialModeMaterials[layer.id] = new Three.MeshStandardMaterial({
          color: new Three.Color(layer.color),
          emissive: new Three.Color(layer.color),
          emissiveIntensity: layer.id === 'glass' || layer.id === 'circulation' ? 0.08 : 0.035,
          transparent: layer.id === 'glass',
          opacity: layer.id === 'glass' ? 0.78 : 1,
          roughness: layer.id === 'glass' ? 0.42 : 0.86,
          metalness: 0
        });
      });

      analysisMaterialsRef.current = analysisMaterials;
      materialModeMaterialsRef.current = materialModeMaterials;
      ghostMaterialsRef.current = ghostMaterials;

      const camera = new Three.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.set(16, 11, 16);

      const renderer = new Three.WebGLRenderer({
        antialias: viewerQuality !== 'reduced',
        alpha: false,
        powerPreference: viewerQuality === 'reduced' ? 'default' : 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, viewerQuality === 'full' ? 2 : viewerQuality === 'balanced' ? 1.5 : 1));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.outputColorSpace = Three.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.075;
      controls.target.set(0, 3.1, 0);
      controls.minDistance = 7;
      controls.maxDistance = 36;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.update();

      scene.add(new Three.HemisphereLight(0xeefcff, 0x071315, 1.45));
      const keyLight = new Three.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(8, 12, 7);
      scene.add(keyLight);
      const accentLight = new Three.PointLight(accent, 4.5, 28);
      accentLight.position.set(-8, 5, -7);
      scene.add(accentLight);

      const grid = new Three.GridHelper(30, 30, new Three.Color(accent), new Three.Color(0x183238));
      grid.position.y = -0.02;
      scene.add(grid);

      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;
          const meshRecords: MeshRecord[] = [];
          model.traverse((child) => {
            if ('isMesh' in child && child.isMesh) {
              const mesh = child as Mesh;
              child.castShadow = false;
              child.receiveShadow = true;
              meshRecords.push({
                mesh,
                layer: layerFromMeshName(mesh.name),
                materialLayer: materialLayerFromMesh(mesh.name, mesh.material),
                originalMaterial: mesh.material
              });
            }
          });
          meshRecordsRef.current = meshRecords;
          applyViewerStyle(meshRecords, analysisMaterials, materialModeMaterials, ghostMaterials, viewerStyleRef.current, visibleLayersRef.current, visibleMaterialsRef.current);
          scene.add(model);
          setStatus('ready');
        },
        undefined,
        () => {
          if (!disposed) setStatus('error');
        }
      );

      const resize = () => {
        if (!mountRef.current) return;
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      };
      window.addEventListener('resize', resize);

      let frame = 0;
      const animate = () => {
        if (disposed) return;
        frame = window.requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        window.removeEventListener('resize', resize);
        window.cancelAnimationFrame(frame);
        controls.dispose();
        [...Object.values(analysisMaterialsRef.current), ...Object.values(materialModeMaterialsRef.current), ...Object.values(ghostMaterialsRef.current)].forEach((material) => material?.dispose());
        meshRecordsRef.current = [];
        analysisMaterialsRef.current = {};
        materialModeMaterialsRef.current = {};
        ghostMaterialsRef.current = {};
        renderer.dispose();
        mount.removeChild(renderer.domElement);
      };
    }

    boot().catch(() => {
      if (!disposed) setStatus('error');
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [accent, modelUrl]);

  function toggleLayer(layerId: AnalysisLayerId) {
    setVisibleLayers((current) => ({
      ...current,
      [layerId]: !current[layerId]
    }));
  }

  function toggleMaterial(layerId: MaterialLayerId) {
    setVisibleMaterials((current) => ({
      ...current,
      [layerId]: !current[layerId]
    }));
  }

  return (
    <article id="model-viewer" className="entry-model-viewer border border-white/14 bg-[#050505]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>3D-Referenzkern / Blender-Layer</div>
          <h2 className="mt-1 max-w-full overflow-wrap-anywhere text-lg leading-tight text-[#f7f7f4] sm:text-xl">{title} / Material-, Tragwerks- und Analysemodell</h2>
        </div>
        <div className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-[#8d8d87]">ziehen drehen / scroll zoomen</div>
      </div>
      <div className="relative h-[420px] min-h-[320px] w-full overflow-hidden" style={{ '--viewer-accent': accent } as CSSProperties}>
        <div ref={mountRef} className="h-full w-full" />
        {status === 'ready' ? (
          <div className="entry-model-controls absolute left-3 top-3 max-w-[calc(100%-24px)] border border-white/15 bg-[#050505]/78 p-3 text-[#f7f7f4] backdrop-blur-md">
            <div className="mb-2 text-[8px] uppercase tracking-[0.18em] text-[#8d8d87]">Darstellung</div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[
                ['realistic', 'Realistisch'],
                ['analysis', 'Analyse'],
                ['materials', 'Material'],
                ['ghost', 'Ghost']
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] transition ${viewerStyle === id ? 'border-[#00e7ff] bg-[#00e7ff] text-[#050505]' : 'border-white/25 bg-black/20 text-[#d7d7d0] hover:border-[#00e7ff]/70'}`}
                  onClick={() => setViewerStyle(id as ViewerStyle)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mb-1 text-[8px] uppercase tracking-[0.18em] text-[#8d8d87]">Analyse-Layer</div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {analysisLayers.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  className={`flex min-w-0 items-center gap-1.5 border px-2 py-1 text-left transition ${visibleLayers[layer.id] ? 'border-white/25 bg-white/5 text-[#f7f7f4]' : 'border-white/10 bg-black/25 text-[#777]'}`}
                  onClick={() => toggleLayer(layer.id)}
                  title={layer.description}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: visibleLayers[layer.id] ? layer.color : '#555' }} />
                  <span className="truncate text-[9px] uppercase tracking-[0.12em]">{layer.label}</span>
                </button>
              ))}
            </div>
            <div className="mb-1 mt-2 text-[8px] uppercase tracking-[0.18em] text-[#8d8d87]">Materialfilter</div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {materialLayers.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  className={`flex min-w-0 items-center gap-1.5 border px-2 py-1 text-left transition ${visibleMaterials[layer.id] ? 'border-white/25 bg-white/5 text-[#f7f7f4]' : 'border-white/10 bg-black/25 text-[#777]'}`}
                  onClick={() => toggleMaterial(layer.id)}
                  title={layer.description}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: visibleMaterials[layer.id] ? layer.color : '#555' }} />
                  <span className="truncate text-[9px] uppercase tracking-[0.12em]">{layer.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {status !== 'ready' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#050505]/82 text-[10px] uppercase tracking-[0.18em] text-[#d7d7d0]">
            {status === 'loading' ? '3D-Modell wird geladen' : '3D-Modell konnte nicht geladen werden'}
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 border-t border-white/10 p-4 text-sm leading-6 text-[#b8b8b2] md:grid-cols-3">
        <div><span style={{ color: accent }}>Modell:</span> Site, Masse, Tragwerk, Hülle, Zirkulation, Dachgarten.</div>
        <div><span style={{ color: accent }}>Material:</span> mineral, Beton, Glas, Landschaft, Pfad, Spur.</div>
        <div><span style={{ color: accent }}>Blender:</span> Layernamen spiegeln spätere Import-Collections.</div>
      </div>
    </article>
  );
}

function layerFromMeshName(name: string): AnalysisLayerId {
  const normalized = name.toLowerCase();
  if (normalized.includes('site') || normalized.includes('ground')) return 'site';
  if (normalized.includes('structure') || normalized.includes('pilotis') || normalized.includes('slab')) return 'structure';
  if (normalized.includes('envelope') || normalized.includes('window') || normalized.includes('screen')) return 'envelope';
  if (normalized.includes('circulation') || normalized.includes('ramp') || normalized.includes('trace')) return 'circulation';
  if (normalized.includes('roof_garden') || normalized.includes('roof garden') || normalized.includes('planted')) return 'roof_garden';
  return 'mass';
}

function materialLayerFromMesh(name: string, material: Material | Material[]): MaterialLayerId {
  const normalized = `${name} ${materialName(material)}`.toLowerCase();
  if (normalized.includes('glass') || normalized.includes('window')) return 'glass';
  if (normalized.includes('site') || normalized.includes('ground') || normalized.includes('garden') || normalized.includes('planted')) return 'landscape';
  if (normalized.includes('circulation') || normalized.includes('ramp') || normalized.includes('promenade')) return 'circulation';
  if (normalized.includes('trace') || normalized.includes('annotation')) return 'annotation';
  if (normalized.includes('concrete') || normalized.includes('pilotis') || normalized.includes('slab') || normalized.includes('structure')) return 'concrete';
  return 'mineral';
}

function materialName(material: Material | Material[]) {
  if (Array.isArray(material)) return material.map((item) => item.name).join(' ');
  return material.name;
}

function detectViewerQuality(): 'reduced' | 'balanced' | 'full' {
  const forcedTier = document.documentElement.dataset.cosmosPerf;
  if (forcedTier === 'reduced' || forcedTier === 'balanced' || forcedTier === 'full') return forcedTier;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const narrowViewport = window.innerWidth < 760;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number'
    ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
    : 4;

  if (reducedMotion || coarsePointer || narrowViewport || cores <= 4 || memory <= 4) return 'reduced';
  if (window.innerWidth >= 1180 && cores >= 8 && memory >= 8) return 'full';
  return 'balanced';
}

function applyViewerStyle(
  records: MeshRecord[],
  analysisMaterials: Partial<Record<AnalysisLayerId, Material>>,
  materialModeMaterials: Partial<Record<MaterialLayerId, Material>>,
  ghostMaterials: Partial<Record<AnalysisLayerId, Material>>,
  viewerStyle: ViewerStyle,
  visibleLayers: Record<AnalysisLayerId, boolean>,
  visibleMaterials: Record<MaterialLayerId, boolean>
) {
  for (const record of records) {
    record.mesh.visible = viewerStyle === 'materials' ? visibleMaterials[record.materialLayer] : visibleLayers[record.layer];

    if (viewerStyle === 'analysis') {
      record.mesh.material = analysisMaterials[record.layer] ?? record.originalMaterial;
      continue;
    }

    if (viewerStyle === 'materials') {
      record.mesh.material = materialModeMaterials[record.materialLayer] ?? record.originalMaterial;
      continue;
    }

    if (viewerStyle === 'ghost') {
      record.mesh.material = ghostMaterials[record.layer] ?? record.originalMaterial;
      continue;
    }

    record.mesh.material = record.originalMaterial;
  }
}
