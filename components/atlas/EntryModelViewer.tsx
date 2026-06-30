'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Blend, Box, Eye, EyeOff, Layers3, Palette, RotateCcw, ScanLine } from 'lucide-react';
import type { Material, Mesh, Object3D } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

type EntryModelViewerProps = {
  modelUrl: string;
  title: string;
  accent: string;
};

type ViewerStatus = 'loading' | 'ready' | 'error';
type ViewerStyle = 'realistic' | 'analysis' | 'materials' | 'ghost';
type AnalysisLayerId =
  | 'site'
  | 'mass'
  | 'structure'
  | 'envelope'
  | 'interior'
  | 'circulation'
  | 'landscape'
  | 'infrastructure'
  | 'services'
  | 'context'
  | 'analysis'
  | 'general';
type MaterialLayerId =
  | 'mineral'
  | 'concrete'
  | 'timber'
  | 'glass'
  | 'metal'
  | 'landscape'
  | 'circulation'
  | 'annotation';

type ViewerMaterial = Material & { name: string };
type ViewerMesh = Mesh & { material: ViewerMaterial | ViewerMaterial[] };

type MeshRecord = {
  mesh: ViewerMesh;
  layer: AnalysisLayerId;
  materialLayer: MaterialLayerId;
  originalMaterial: ViewerMaterial | ViewerMaterial[];
};

type LayerDefinition<T extends string> = {
  id: T;
  label: string;
  color: string;
  description: string;
};

const analysisLayers: Array<LayerDefinition<AnalysisLayerId>> = [
  { id: 'site', label: 'Terrain', color: '#74c2a0', description: 'Gelände und unmittelbarer Baugrund' },
  { id: 'mass', label: 'Volumen', color: '#b6bdcb', description: 'Baukörper und räumliche Hauptvolumen' },
  { id: 'structure', label: 'Tragwerk', color: '#cbb06a', description: 'Stützen, Platten, Kerne und tragende Ordnung' },
  { id: 'envelope', label: 'Fassade', color: '#57b6c2', description: 'Gebäudehülle, Fenster und Fassadenschichten' },
  { id: 'interior', label: 'Innenraum', color: '#b08a6e', description: 'Raumschichten, Ausbau und innere Organisation' },
  { id: 'circulation', label: 'Erschließung', color: '#c082b4', description: 'Treppen, Rampen, Galerien und Zugänge' },
  { id: 'landscape', label: 'Freiraum', color: '#82ad76', description: 'Gärten, Terrassen und bepflanzte Flächen' },
  { id: 'infrastructure', label: 'Infrastruktur', color: '#6f9bcf', description: 'Verkehrs- und Versorgungselemente' },
  { id: 'services', label: 'Gebäudetechnik', color: '#cd7670', description: 'HLKSE und technische Systeme' },
  { id: 'context', label: 'Kontext', color: '#8b92a2', description: 'Städtebauliche und bauliche Umgebung' },
  { id: 'analysis', label: 'Analyse', color: '#d39a68', description: 'Diagramme, Schnitte und analytische Spuren' },
  { id: 'general', label: 'Allgemein', color: '#b6bdcb', description: 'Noch nicht genauer klassifizierte Modellteile' }
];

const materialLayers: Array<LayerDefinition<MaterialLayerId>> = [
  { id: 'mineral', label: 'Mineralisch', color: '#d4d0c2', description: 'Putz, Mauerwerk und mineralische Oberflächen' },
  { id: 'concrete', label: 'Beton', color: '#9fa3a9', description: 'Stahlbeton, Platten, Stützen und Kerne' },
  { id: 'timber', label: 'Holz', color: '#b08a6e', description: 'Holzfassaden, Holzbau und Ausbau' },
  { id: 'glass', label: 'Glas', color: '#57b6c2', description: 'Fenster, Glasfassaden und transparente Flächen' },
  { id: 'metal', label: 'Metall', color: '#6f9bcf', description: 'Metallische Trag- und Fassadenelemente' },
  { id: 'landscape', label: 'Vegetation', color: '#74c2a0', description: 'Terrain, Gärten und bepflanzte Flächen' },
  { id: 'circulation', label: 'Bewegung', color: '#c082b4', description: 'Erschließung und Bewegungsräume' },
  { id: 'annotation', label: 'Markierung', color: '#cbb06a', description: 'Analytische Spuren und Modellhinweise' }
];

const viewerStyles: Array<{ id: ViewerStyle; label: string; icon: typeof Box }> = [
  { id: 'realistic', label: 'Modell', icon: Box },
  { id: 'analysis', label: 'Bauteile', icon: ScanLine },
  { id: 'materials', label: 'Material', icon: Palette },
  { id: 'ghost', label: 'Röntgen', icon: Blend }
];

const initialLayerVisibility = Object.fromEntries(analysisLayers.map((layer) => [layer.id, true])) as Record<AnalysisLayerId, boolean>;
const initialMaterialVisibility = Object.fromEntries(materialLayers.map((layer) => [layer.id, true])) as Record<MaterialLayerId, boolean>;

export function EntryModelViewer({ modelUrl, title, accent }: EntryModelViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const meshRecordsRef = useRef<MeshRecord[]>([]);
  const analysisMaterialsRef = useRef<Partial<Record<AnalysisLayerId, ViewerMaterial>>>({});
  const materialModeMaterialsRef = useRef<Partial<Record<MaterialLayerId, ViewerMaterial>>>({});
  const ghostMaterialsRef = useRef<Partial<Record<AnalysisLayerId, ViewerMaterial>>>({});
  const viewerStyleRef = useRef<ViewerStyle>('realistic');
  const visibleLayersRef = useRef(initialLayerVisibility);
  const visibleMaterialsRef = useRef(initialMaterialVisibility);
  const [status, setStatus] = useState<ViewerStatus>('loading');
  const [viewerStyle, setViewerStyle] = useState<ViewerStyle>('realistic');
  const [visibleLayers, setVisibleLayers] = useState(initialLayerVisibility);
  const [visibleMaterials, setVisibleMaterials] = useState(initialMaterialVisibility);
  const [layerCounts, setLayerCounts] = useState<Partial<Record<AnalysisLayerId, number>>>({});
  const [materialCounts, setMaterialCounts] = useState<Partial<Record<MaterialLayerId, number>>>({});

  const activeAnalysisLayers = useMemo(
    () => analysisLayers.filter((layer) => (layerCounts[layer.id] ?? 0) > 0),
    [layerCounts]
  );
  const activeMaterialLayers = useMemo(
    () => materialLayers.filter((layer) => (materialCounts[layer.id] ?? 0) > 0),
    [materialCounts]
  );
  const meshCount = Object.values(layerCounts).reduce((sum, count) => sum + (count ?? 0), 0);

  useEffect(() => {
    viewerStyleRef.current = viewerStyle;
    visibleLayersRef.current = visibleLayers;
    visibleMaterialsRef.current = visibleMaterials;
    applyViewerStyle(
      meshRecordsRef.current,
      analysisMaterialsRef.current,
      materialModeMaterialsRef.current,
      ghostMaterialsRef.current,
      viewerStyle,
      visibleLayers,
      visibleMaterials
    );
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
      scene.background = new Three.Color(0x0b0d12);
      scene.fog = new Three.Fog(0x0b0d12, 18, 42);
      const analysisMaterials = {} as Record<AnalysisLayerId, ViewerMaterial>;
      const materialModeMaterials = {} as Record<MaterialLayerId, ViewerMaterial>;
      const ghostMaterials = {} as Record<AnalysisLayerId, ViewerMaterial>;

      analysisLayers.forEach((layer) => {
        analysisMaterials[layer.id] = new Three.MeshStandardMaterial({
          color: new Three.Color(layer.color),
          emissive: new Three.Color(layer.color),
          emissiveIntensity: 0.035,
          roughness: 0.78,
          metalness: 0
        });
        ghostMaterials[layer.id] = new Three.MeshStandardMaterial({
          color: new Three.Color(layer.color),
          transparent: true,
          opacity: layer.id === 'structure' || layer.id === 'circulation' ? 0.74 : 0.16,
          roughness: 0.9,
          metalness: 0,
          depthWrite: false
        });
      });

      materialLayers.forEach((layer) => {
        materialModeMaterials[layer.id] = new Three.MeshStandardMaterial({
          color: new Three.Color(layer.color),
          emissive: new Three.Color(layer.color),
          emissiveIntensity: layer.id === 'glass' ? 0.06 : 0.025,
          transparent: layer.id === 'glass',
          opacity: layer.id === 'glass' ? 0.76 : 1,
          roughness: layer.id === 'glass' || layer.id === 'metal' ? 0.38 : 0.84,
          metalness: layer.id === 'metal' ? 0.28 : 0
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

      scene.add(new Three.HemisphereLight(0xeefcff, 0x101319, 1.35));
      const keyLight = new Three.DirectionalLight(0xffffff, 2.1);
      keyLight.position.set(8, 12, 7);
      scene.add(keyLight);
      const accentLight = new Three.PointLight(accent, 3.1, 28);
      accentLight.position.set(-8, 5, -7);
      scene.add(accentLight);

      const grid = new Three.GridHelper(30, 30, new Three.Color(accent), new Three.Color(0x252c36));
      grid.position.y = -0.02;
      scene.add(grid);

      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf: GLTF) => {
          if (disposed) return;
          const model = gltf.scene;
          const meshRecords: MeshRecord[] = [];
          const nextLayerCounts: Partial<Record<AnalysisLayerId, number>> = {};
          const nextMaterialCounts: Partial<Record<MaterialLayerId, number>> = {};

          model.traverse((child: Object3D) => {
            if (!('isMesh' in child) || !child.isMesh) return;

            const mesh = child as ViewerMesh;
            const semanticName = objectSemanticName(mesh);
            const layer = layerFromMeshName(semanticName);
            const materialLayer = materialLayerFromMesh(semanticName, mesh.material);
            child.castShadow = false;
            child.receiveShadow = true;
            meshRecords.push({ mesh, layer, materialLayer, originalMaterial: mesh.material });
            nextLayerCounts[layer] = (nextLayerCounts[layer] ?? 0) + 1;
            nextMaterialCounts[materialLayer] = (nextMaterialCounts[materialLayer] ?? 0) + 1;
          });

          meshRecordsRef.current = meshRecords;
          setLayerCounts(nextLayerCounts);
          setMaterialCounts(nextMaterialCounts);
          applyViewerStyle(
            meshRecords,
            analysisMaterials,
            materialModeMaterials,
            ghostMaterials,
            viewerStyleRef.current,
            visibleLayersRef.current,
            visibleMaterialsRef.current
          );
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
        [...Object.values(analysisMaterialsRef.current), ...Object.values(materialModeMaterialsRef.current), ...Object.values(ghostMaterialsRef.current)].forEach((material) => {
          material?.dispose();
        });
        meshRecordsRef.current = [];
        analysisMaterialsRef.current = {};
        materialModeMaterialsRef.current = {};
        ghostMaterialsRef.current = {};
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
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
    setVisibleLayers((current) => ({ ...current, [layerId]: !current[layerId] }));
  }

  function toggleMaterial(layerId: MaterialLayerId) {
    setVisibleMaterials((current) => ({ ...current, [layerId]: !current[layerId] }));
  }

  function resetVisibility() {
    setVisibleLayers(initialLayerVisibility);
    setVisibleMaterials(initialMaterialVisibility);
  }

  const activeFilters = viewerStyle === 'materials' ? activeMaterialLayers : activeAnalysisLayers;
  const hiddenFilterCount = viewerStyle === 'materials'
    ? activeMaterialLayers.filter((layer) => !visibleMaterials[layer.id]).length
    : activeAnalysisLayers.filter((layer) => !visibleLayers[layer.id]).length;

  return (
    <article id="model-viewer" className="entry-model-viewer ak-model-viewer">
      <header className="ak-model-viewer-header">
        <div className="min-w-0">
          <div className="ak-model-viewer-eyebrow">Interaktives Studienmodell</div>
          <h2>{title}: Bauteile untersuchen</h2>
        </div>
        <div className="ak-model-viewer-summary" aria-live="polite">
          <Layers3 aria-hidden="true" />
          {status === 'ready' ? `${meshCount} Modellteile` : status === 'loading' ? 'Modell wird geladen' : 'Modell nicht verfügbar'}
        </div>
      </header>

      <div className="ak-model-viewer-stage" style={{ '--viewer-accent': accent } as CSSProperties}>
        <div ref={mountRef} className="h-full w-full" />

        {status === 'ready' ? (
          <div className="entry-model-controls ak-model-controls">
            <div className="ak-model-control-section">
              <div className="ak-model-control-heading">
                <span>Darstellung</span>
                <button type="button" className="ak-model-reset" onClick={resetVisibility} disabled={hiddenFilterCount === 0} title="Alle Modellteile einblenden">
                  <RotateCcw aria-hidden="true" />
                  <span>Zurücksetzen</span>
                </button>
              </div>
              <div className="ak-model-style-switch" role="group" aria-label="Darstellungsart">
                {viewerStyles.map((style) => {
                  const Icon = style.icon;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      className={viewerStyle === style.id ? 'is-active' : ''}
                      aria-pressed={viewerStyle === style.id}
                      onClick={() => setViewerStyle(style.id)}
                    >
                      <Icon aria-hidden="true" />
                      <span>{style.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ak-model-control-section">
              <div className="ak-model-control-heading">
                <span>{viewerStyle === 'materials' ? 'Materialgruppen' : 'Bauteilgruppen'}</span>
                <span>{activeFilters.length} erkannt</span>
              </div>
              <div className="ak-model-filter-grid">
                {viewerStyle === 'materials'
                  ? activeMaterialLayers.map((layer) => (
                    <FilterButton
                      key={layer.id}
                      label={layer.label}
                      description={layer.description}
                      color={layer.color}
                      count={materialCounts[layer.id] ?? 0}
                      visible={visibleMaterials[layer.id]}
                      onClick={() => toggleMaterial(layer.id)}
                    />
                  ))
                  : activeAnalysisLayers.map((layer) => (
                    <FilterButton
                      key={layer.id}
                      label={layer.label}
                      description={layer.description}
                      color={layer.color}
                      count={layerCounts[layer.id] ?? 0}
                      visible={visibleLayers[layer.id]}
                      onClick={() => toggleLayer(layer.id)}
                    />
                  ))}
              </div>
            </div>
          </div>
        ) : null}

        {status !== 'ready' ? (
          <div className="ak-model-viewer-status">
            {status === 'loading' ? '3D-Modell wird vorbereitet' : '3D-Modell konnte nicht geladen werden'}
          </div>
        ) : null}

        <div className="ak-model-viewer-hint">Ziehen zum Drehen · Scrollen zum Zoomen</div>
      </div>

      <footer className="ak-model-viewer-footer">
        <span>Diagrammatisches Studienmodell</span>
        <span>{activeAnalysisLayers.length} Bauteilgruppen · {activeMaterialLayers.length} Materialgruppen</span>
        <span>KosmoDraw-kompatible Layerstruktur</span>
      </footer>
    </article>
  );
}

function FilterButton({
  label,
  description,
  color,
  count,
  visible,
  onClick
}: {
  label: string;
  description: string;
  color: string;
  count: number;
  visible: boolean;
  onClick: () => void;
}) {
  const VisibilityIcon = visible ? Eye : EyeOff;

  return (
    <button
      type="button"
      className={visible ? 'ak-model-filter is-visible' : 'ak-model-filter'}
      aria-pressed={visible}
      onClick={onClick}
      title={description}
    >
      <span className="ak-model-filter-swatch" style={{ background: visible ? color : 'transparent', borderColor: color }} />
      <span className="ak-model-filter-label">{label}</span>
      <span className="ak-model-filter-count">{count}</span>
      <VisibilityIcon aria-hidden="true" />
    </button>
  );
}

function objectSemanticName(mesh: ViewerMesh) {
  const names = [mesh.name];
  let parent = mesh.parent;
  while (parent) {
    if (parent.name) names.push(parent.name);
    parent = parent.parent;
  }
  return names.join(' ');
}

function layerFromMeshName(name: string): AnalysisLayerId {
  const normalized = name.toLowerCase();
  if (includesAny(normalized, ['hlkse', 'mep', 'haustechnik', 'tga', 'services'])) return 'services';
  if (includesAny(normalized, ['tragwerk', 'structure', 'structural', 'pilotis', 'column', 'slab', 'core', 'frame', 'pier'])) return 'structure';
  if (includesAny(normalized, ['fassade', 'facade', 'envelope', 'window', 'screen', 'ribbon'])) return 'envelope';
  if (includesAny(normalized, ['ausbau', 'interior', 'finish', 'room', 'chapel', 'foyer', 'cell bay'])) return 'interior';
  if (includesAny(normalized, ['circulation', 'ramp', 'stair', 'promenade', 'gallery', 'bridge', 'threshold', 'entry'])) return 'circulation';
  if (includesAny(normalized, ['infrastructure', 'rail', 'station', 'transport', 'platform'])) return 'infrastructure';
  if (includesAny(normalized, ['roof_garden', 'roof garden', 'roof_terrace', 'terrace', 'planted', 'garden', 'landscape'])) return 'landscape';
  if (includesAny(normalized, ['site', 'ground', 'terrain', 'hill', 'plateau', 'plinth'])) return 'site';
  if (includesAny(normalized, ['context', 'existing', 'monastery', 'expo'])) return 'context';
  if (includesAny(normalized, ['analysis', 'trace', 'annotation', 'diagram'])) return 'analysis';
  if (includesAny(normalized, ['mass', 'volume', 'tower', 'housing module', 'block'])) return 'mass';
  if (includesAny(normalized, ['allgemein', 'general'])) return 'general';
  return 'mass';
}

function materialLayerFromMesh(name: string, material: ViewerMaterial | ViewerMaterial[]): MaterialLayerId {
  const normalized = `${name} ${materialName(material)}`.toLowerCase();
  if (includesAny(normalized, ['glass', 'window', 'glazing'])) return 'glass';
  if (includesAny(normalized, ['timber', 'wood', 'holz', 'fir'])) return 'timber';
  if (includesAny(normalized, ['steel', 'metal', 'aluminium', 'aluminum'])) return 'metal';
  if (includesAny(normalized, ['site', 'ground', 'garden', 'planted', 'landscape', 'vegetation', 'terrace'])) return 'landscape';
  if (includesAny(normalized, ['circulation', 'ramp', 'promenade', 'gallery', 'bridge', 'threshold'])) return 'circulation';
  if (includesAny(normalized, ['trace', 'annotation', 'analysis', 'marker'])) return 'annotation';
  if (includesAny(normalized, ['concrete', 'beton', 'pilotis', 'slab', 'structure', 'column', 'core', 'frame'])) return 'concrete';
  return 'mineral';
}

function includesAny(value: string, tokens: string[]) {
  return tokens.some((token) => value.includes(token));
}

function materialName(material: ViewerMaterial | ViewerMaterial[]) {
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
  analysisMaterials: Partial<Record<AnalysisLayerId, ViewerMaterial>>,
  materialModeMaterials: Partial<Record<MaterialLayerId, ViewerMaterial>>,
  ghostMaterials: Partial<Record<AnalysisLayerId, ViewerMaterial>>,
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
