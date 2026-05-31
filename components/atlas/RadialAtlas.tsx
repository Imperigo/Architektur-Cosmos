'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent, type RefObject, type TouchEvent as ReactTouchEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { ProjectDetailCard, type ProjectDetailFilter } from '@/components/atlas/ProjectDetailCard';
import { ProjectSearch } from '@/components/atlas/ProjectSearch';
import { RelationOverlay } from '@/components/atlas/RelationOverlay';
import { SemanticEntryNode } from '@/components/atlas/SemanticEntryNode';
import { StyleSectors } from '@/components/atlas/StyleSectors';
import { WormholeCanvas } from '@/components/atlas/WormholeCanvas';
import { WormholeRings } from '@/components/atlas/WormholeRings';
import analysisPreview from '@/data/database-analysis-preview.json';
import archivePreview from '@/data/archive-preview.json';
import brainTools from '@/data/brain-tools.json';
import reviewQueue from '@/data/review-queue.json';
import assetWarmConcreteBlenderRunPreview from '@/examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-sandbox-warm-concrete-material-001.blender-run.generated.json';
import assetDecisionLedgerPreview from '@/examples/kosmo-assets/kosmo-asset-demo/review/asset-decision-ledger.generated.json';
import assetExportPlanPreview from '@/examples/kosmo-assets/kosmo-asset-demo/review/asset-export-plan.generated.json';
import assetExchangeProfilePreview from '@/examples/kosmo-assets/kosmo-asset-demo/review/asset-exchange-profile.generated.json';
import assetHandoffBundlePreview from '@/examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-bundle.generated.json';
import assetHandoffSmokePreview from '@/examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-smoke.generated.json';
import assetHumanReviewSessionPreview from '@/examples/kosmo-assets/kosmo-asset-demo/review/asset-human-review-session.generated.json';
import assetLibraryPreview from '@/examples/kosmo-assets/kosmo-asset-demo/library.json';
import assetReviewPackPreview from '@/examples/kosmo-assets/kosmo-asset-demo/review/asset-review-pack.generated.json';
import { atlasSize, styleSectors } from '@/lib/atlas-layout';
import { kosmoOrbitModules, type KosmoModuleId, type KosmoOrbitModule } from '@/lib/kosmo-modules';
import { publicDisplayMediaUrl } from '@/lib/media';
import type { Entry, EntryRelation, StyleSectorId } from '@/lib/types';
import { formatYear, layoutWormholeEntries, positionToYear, wormholeState, wormholeTravelEnd, type WormholeEntryNode } from '@/lib/wormhole-layout';

type SvgPoint = {
  x: number;
  y: number;
};

type MotionSnapshot = {
  currentTravel: number;
  targetTravel: number;
  velocity: number;
  isMoving: boolean;
  isSettling: boolean;
};
type VisualZoomSnapshot = {
  currentZoom: number;
  targetZoom: number;
  velocity: number;
  isZooming: boolean;
};
type VisualPan = {
  x: number;
  y: number;
};

type IntroState = 'intro' | 'hub' | 'asset' | 'launching' | 'idle';
type AssetPreviewRecord = (typeof assetLibraryPreview.assets)[number];
type AssetDecisionLedgerDecision = {
  route?: string;
  decision: string;
  reviewer?: string | null;
  status: string;
  generated_at?: string;
  public_gate_remains_blocked?: boolean;
};
type AssetDecisionLedgerCertificate = {
  route?: string;
  status: string;
  generated_at?: string;
  certificate_id?: string;
  failed_checks?: number;
  public_gate?: string;
};
type AssetDecisionLedgerRecord = Omit<(typeof assetDecisionLedgerPreview.rows)[number], 'latest_decision' | 'latest_certificate'> & {
  latest_decision: AssetDecisionLedgerDecision | null;
  latest_certificate: AssetDecisionLedgerCertificate | null;
};
type AssetExportPlanRecord = (typeof assetExportPlanPreview.assets)[number];
type AssetExchangeProfileRecord = (typeof assetExchangeProfilePreview.assets)[number];
type AssetHandoffBundleRecord = (typeof assetHandoffBundlePreview.assets)[number];
type AssetHumanReviewSessionRecord = (typeof assetHumanReviewSessionPreview.assets)[number];
type AssetReviewPackRecord = (typeof assetReviewPackPreview.assets)[number];
type AssetFamilyFilter = 'all' | '2d' | 'material' | '3d';
type AssetReviewAction = {
  id: string;
  label: string;
  kicker: string;
  description: string;
  command: string;
};
type AssetKosmoDataRef = {
  kind?: string;
  entry_id?: string;
  relation?: string;
  usage_policy?: string;
  review_status?: string;
  notes?: string;
};
type AssetGateTone = 'ready' | 'review' | 'blocked' | 'local';
type AssetGateSignal = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: AssetGateTone;
};
const sourceLensDefinitions = [
  { id: 'afasia', label: 'Afasia', terms: ['afasia'] },
  { id: 'espazium', label: 'Espazium', terms: ['espazium', 'tec21'] },
  { id: 'bestswiss', label: 'BestSwiss', terms: ['bestswissarchitects', 'best swiss architects'] },
  { id: 'instagram', label: 'Instagram', terms: ['instagram.com', 'instagram'] },
  { id: 'eth', label: 'ETH', terms: ['eth', 'lecture_pdf', 'lecture notes', 'architekturgeschichte', 'global history', 'landschaftsarchitektur'] },
  { id: 'official', label: 'Official', terms: ['official', 'unesco', 'fondation', 'centres des monuments', 'stadt zürich', 'stadt-zuerich', 'thehighline.org', 'dainst'] },
  { id: 'office', label: 'Office', terms: ['boltshauser', 'burckhardt', 'raderschall', 'diller scofidio', 'field operations', 'le corbusier', 'no architecture'] },
  { id: 'archive', label: 'Archive', terms: ['archive', 'library of congress', 'wikimedia', 'commons', 'e-periodica', 'research collection'] }
] as const;
type SourceLensId = (typeof sourceLensDefinitions)[number]['id'];
type SourceLens = SourceLensId | null;
const tagLayerDefinitions = [
  { id: 'public_space', label: 'Raum', terms: ['public-space', 'polis', 'city', 'urban', 'plaza', 'garden', 'courtyard', 'landscape-urbanism'] },
  { id: 'reuse', label: 'Reuse', terms: ['reuse', 'industrial-reuse', 'palimpsest', 'urban-repair', 'conversion', 'umbau', 'renovation'] },
  { id: 'infrastructure', label: 'Infra', terms: ['infrastructure', 'rail', 'water', 'drainage', 'transport', 'bridge', 'canal'] },
  { id: 'landscape', label: 'Land', terms: ['landscape', 'garden', 'vegetation', 'topography', 'climate-landscape', 'terrain'] },
  { id: 'material', label: 'Material', terms: ['material:', 'stone', 'brick', 'concrete', 'glass', 'wood', 'steel', 'mud_brick', 'limestone', 'vegetation'] },
  { id: 'housing', label: 'Wohnen', terms: ['housing', 'collective-living', 'domesticity', 'villa', 'monastery', 'care', 'residential'] }
] as const;
type TagLayerId = (typeof tagLayerDefinitions)[number]['id'];
type ActiveTagLayer = TagLayerId | null;
type PerformanceTier = 'reduced' | 'balanced' | 'full';
type ResearchSeed = {
  project: string;
  architect: string;
  address: string;
};
type ImageIdentifyState = {
  fileName: string;
  previewUrl: string;
  status: 'empty' | 'bereit' | 'erkannt' | 'unknown';
  candidate?: ResearchSeed & {
    confidence: number;
    reason: string;
  };
};
type EntryEntwurf = {
  title: string;
  year: string;
  entry_type: Entry['entry_type'];
  style_sector: StyleSectorId;
  city: string;
  country: string;
  authors: string;
  themes: string;
  lecture_cluster: string;
  source_documents: string;
  source_url: string;
  short_description: string;
  one_sentence: string;
  full_description: string;
  copyright_status: 'needs_permission' | 'private_research' | 'licensed' | 'public_domain' | 'own_work';
};
type IntakeFile = {
  id: string;
  name: string;
  size: number;
  kind: 'pdf' | 'book' | 'image' | 'plan' | 'video' | 'model' | 'text' | 'other';
  status: 'queued' | 'classified';
};
type TouchTravelGesture = {
  mode: 'idle' | 'single' | 'pinch';
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastMidX: number;
  lastMidY: number;
  lastDistance: number;
  moved: number;
};
type TouchPoint = {
  clientX: number;
  clientY: number;
};
type AtlasUiMetrics = {
  isCoarsePointer: boolean;
  hasFinePointer: boolean;
  dock: {
    buttonHeight: number;
    buttonY: number;
    buttonTextY: number;
    buttonFontSize: number;
    shellWidth: number;
    shellHeight: number;
    shellY: number;
    shellRadius: number;
    gap: number;
  };
  databasePanel: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  dossier: {
    cardScale: number;
    cardY: number;
    closeWidth: number;
    actionHeight: number;
    actionOffsetY: number;
    actionFontSize: number;
    openWidth: number;
  };
};

const initialEntryEntwurf: EntryEntwurf = {
  title: '',
  year: '2025',
  entry_type: 'building',
  style_sector: 'modern_architecture',
  city: '',
  country: '',
  authors: '',
  themes: '',
  lecture_cluster: '',
  source_documents: '',
  source_url: '',
  short_description: '',
  one_sentence: '',
  full_description: '',
  copyright_status: 'needs_permission'
};

const databaseCountLabels: Record<string, string> = {
  Eintraege: 'Einträge',
  Einträge: 'Einträge',
  Quellen: 'Quellen',
  Medien: 'Medien',
  '3D': '3D',
  Analyse: 'Analyse',
  Relationen: 'Relationen'
};

const developerSessionKey = 'architecture-cosmos-dev-mode';

function readInitialIntroState(): IntroState {
  if (typeof window === 'undefined') return 'intro';
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'hub') return 'hub';
    if (window.location.pathname.startsWith('/atlas')) return 'idle';
    return isKosmoDataReturn(params) ? 'idle' : 'intro';
  } catch {
    return 'intro';
  }
}

function isKosmoDataReturn(params: URLSearchParams) {
  const returnTarget = params.get('return');
  return returnTarget === 'database' || returnTarget === 'kosmodata';
}

function previousIntroState(current: IntroState): IntroState {
  if (current === 'idle' || current === 'asset' || current === 'launching') return 'hub';
  if (current === 'hub') return 'intro';
  return 'intro';
}

export function RadialAtlas({ entries, relations }: { entries: Entry[]; relations: EntryRelation[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cursorRef = useRef<SVGGElement | null>(null);
  const screenCursorRef = useRef<HTMLDivElement | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const [showRelations, setShowRelations] = useState(false);
  const [activeStyleLens, setActiveStyleLens] = useState<StyleSectorId | null>(null);
  const [activeSourceLens, setActiveSourceLens] = useState<SourceLens>(null);
  const [activeTagLayer, setActiveTagLayer] = useState<ActiveTagLayer>(null);
  const [motion, setMotion] = useState<MotionSnapshot>({
    currentTravel: 0,
    targetTravel: 0,
    velocity: 0,
    isMoving: false,
    isSettling: true
  });
  const [visualZoom, setVisualZoom] = useState<VisualZoomSnapshot>({
    currentZoom: 1,
    targetZoom: 1,
    velocity: 0,
    isZooming: false
  });
  const [, setVisualPan] = useState<VisualPan>({ x: 0, y: 0 });
  const [introState, setIntroState] = useState<IntroState>(readInitialIntroState);
  const [returningFromDatabase, setReturningFromDatabase] = useState(false);
  const [showDatabasePanel, setShowDatabasePanel] = useState(false);
  const [developerMode, setDeveloperMode] = useState(readDeveloperSession);
  const [localEntries, setLocalEntries] = useState<Entry[]>([]);
  const [entryEntwurf, setEntryEntwurf] = useState<EntryEntwurf>(initialEntryEntwurf);
  const [researchSeed, setResearchSeed] = useState<ResearchSeed>({
    project: '',
    architect: '',
    address: ''
  });
  const [imageIdentify, setImageIdentify] = useState<ImageIdentifyState>({
    fileName: '',
    previewUrl: '',
    status: 'empty'
  });
  const [intakeFiles, setIntakeFiles] = useState<IntakeFile[]>([]);
  const performanceTier = usePerformanceTier();
  const motionRef = useRef({
    currentTravel: 0,
    targetTravel: 0,
    velocity: 0,
    frame: null as number | null,
    timeout: null as number | null
  });
  const nudgeTravelRef = useRef<(delta: number) => void>(() => undefined);
  const visualZoomRef = useRef({
    currentZoom: 1,
    targetZoom: 1,
    velocity: 0,
    frame: null as number | null,
    timeout: null as number | null
  });
  const mainRef = useRef<HTMLElement | null>(null);
  const cameraRef = useRef<SVGGElement | null>(null);
  const visualPanRef = useRef<VisualPan>({ x: 0, y: 0 });
  const panGestureRef = useRef({
    active: false,
    pointerId: -1,
    startClientX: 0,
    startClientY: 0,
    startPanX: 0,
    startPanY: 0,
    moved: false
  });
  const panFrameRef = useRef<number | null>(null);
  const databaseHistoryRef = useRef(false);
  const dossierHistoryRef = useRef(false);
  const showDatabasePanelRef = useRef(false);
  const selectedEntryRef = useRef<Entry | null>(null);
  const pendingPanRef = useRef<VisualPan | null>(null);
  const pendingPointerPointRef = useRef<SvgPoint | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const hoveredEntryIdRef = useRef<string | null>(null);
  const touchTravelRef = useRef<TouchTravelGesture>({
    mode: 'idle',
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastMidX: 0,
    lastMidY: 0,
    lastDistance: 0,
    moved: 0
  });
  const lastFreeTapRef = useRef({
    at: 0,
    x: 0,
    y: 0
  });
  const allEntries = useMemo(() => mergeEntries(entries, localEntries), [entries, localEntries]);

  function updateDeveloperMode(enabled: boolean) {
    setDeveloperMode(enabled);
    try {
      if (enabled) {
        window.sessionStorage.setItem(developerSessionKey, 'unlocked');
      } else {
        window.sessionStorage.removeItem(developerSessionKey);
      }
    } catch {
      // Session storage can be disabled; the visible state still updates.
    }
  }

  const state = useMemo(() => wormholeState(motion.currentTravel), [motion.currentTravel]);
  const ui = useAtlasUiMetrics();
  const activeSelectedEntryId = selectedEntry?.id ?? null;
  const nodes = useMemo(() => layoutWormholeEntries(allEntries, state, activeSelectedEntryId ?? undefined), [activeSelectedEntryId, allEntries, state]);
  const displayNodes = useMemo(() => limitDisplayNodes(nodes), [nodes]);
  const isTraveling = motion.isMoving;
  const hoveredEntry = useMemo(() => displayNodes.find((node) => node.entry.id === hoveredEntryId)?.entry ?? null, [displayNodes, hoveredEntryId]);
  const cursorVisible = ui.hasFinePointer;
  const fastNodeRender = performanceTier === 'reduced';
  const relationOverlayActive = Boolean(showRelations || (!isTraveling && (selectedEntry || (performanceTier !== 'reduced' && hoveredEntry))));
  const backgroundStyle = {
    filter: 'none',
    opacity: selectedEntry ? 0.48 : introState === 'intro' ? 0.06 : introState === 'hub' || introState === 'asset' ? 0.1 : introState === 'launching' ? 0.82 : 1,
    transition: 'opacity 420ms cubic-bezier(0.19, 1, 0.22, 1)'
  };
  const visualZoomValue = visualZoom.currentZoom;
  const visualPanForRender = visualPanRef.current;
  const cameraTransform = buildCameraTransform(visualZoomValue, visualPanForRender);
  const visualZoomStyle = {
    '--cosmos-visual-zoom': String(roundZoom(visualZoomValue)),
    '--cosmos-visual-pan-x': `${roundMotion(visualPanForRender.x)}px`,
    '--cosmos-visual-pan-y': `${roundMotion(visualPanForRender.y)}px`
  } as CSSProperties;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!isKosmoDataReturn(params)) return;

    setIntroState('idle');
    setReturningFromDatabase(true);
    params.delete('return');
    const nextQuery = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`);

    motionRef.current = {
      currentTravel: 0.085,
      targetTravel: 0,
      velocity: -0.0018,
      frame: null,
      timeout: null
    };
    setMotion({
      currentTravel: 0.085,
      targetTravel: 0,
      velocity: -0.0018,
      isMoving: true,
      isSettling: false
    });

    const travelTimeout = window.setTimeout(() => {
      nudgeTravelRef.current(-0.085);
    }, 80);
    const doneTimeout = window.setTimeout(() => {
      cancelMotionStep();
      motionRef.current = {
        currentTravel: 0,
        targetTravel: 0,
        velocity: 0,
        frame: null,
        timeout: null
      };
      setMotion({
        currentTravel: 0,
        targetTravel: 0,
        velocity: 0,
        isMoving: false,
        isSettling: true
      });
      setReturningFromDatabase(false);
    }, 1180);

    return () => {
      window.clearTimeout(travelTimeout);
      window.clearTimeout(doneTimeout);
    };
  }, []);

  useEffect(() => {
    if (!returningFromDatabase) return;

    const timeout = window.setTimeout(() => {
      cancelMotionStep();
      motionRef.current = {
        currentTravel: 0,
        targetTravel: 0,
        velocity: 0,
        frame: null,
        timeout: null
      };
      setMotion({
        currentTravel: 0,
        targetTravel: 0,
        velocity: 0,
        isMoving: false,
        isSettling: true
      });
      setReturningFromDatabase(false);
    }, 1320);

    return () => window.clearTimeout(timeout);
  }, [returningFromDatabase]);

  useEffect(() => {
    if (introState !== 'launching') return;

    const motionTimeout = window.setTimeout(() => {
      nudgeTravelRef.current(0.11);
    }, 360);

    const timeout = window.setTimeout(() => {
      setIntroState('idle');
      const currentMotion = motionRef.current;
      if (currentMotion.frame !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(currentMotion.frame);
      }

      if (currentMotion.timeout !== null) {
        window.clearTimeout(currentMotion.timeout);
      }

      motionRef.current = {
        currentTravel: 0,
        targetTravel: 0,
        velocity: 0,
        frame: null,
        timeout: null
      };

      setMotion({
        currentTravel: 0,
        targetTravel: 0,
        velocity: 0,
        isMoving: false,
        isSettling: true
      });
    }, 2300);

    return () => {
      window.clearTimeout(motionTimeout);
      window.clearTimeout(timeout);
    };
  }, [introState]);

  useEffect(() => {
    showDatabasePanelRef.current = showDatabasePanel;
  }, [showDatabasePanel]);

  useEffect(() => {
    selectedEntryRef.current = selectedEntry;
  }, [selectedEntry]);

  useEffect(() => {
    const handlePopState = () => {
      if (showDatabasePanelRef.current && databaseHistoryRef.current) {
        databaseHistoryRef.current = false;
        setShowDatabasePanel(false);
        return;
      }

      if (selectedEntryRef.current && dossierHistoryRef.current) {
        dossierHistoryRef.current = false;
        setSelectedEntry(null);
        return;
      }

      if (introState !== 'intro') {
        setIntroState(previousIntroState);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const shouldDismiss = event.key === 'Escape' || (event.key === 'Backspace' && !isEditableKeyboardTarget(event.target));
      if (!shouldDismiss) return;

      if (showDatabasePanelRef.current) {
        event.preventDefault();
        closeDatabasePanel();
        return;
      }

      if (selectedEntryRef.current) {
        event.preventDefault();
        closeDossier();
        return;
      }

      if (introState !== 'intro') {
        event.preventDefault();
        setIntroState(previousIntroState);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [introState]);

  useEffect(() => {
    const visualZoomState = visualZoomRef.current;
    const preventBrowserWheel = (event: WheelEvent) => {
      if (isNativeOverlayTarget(event.target)) return;
      if (event.cancelable) event.preventDefault();
    };
    const preventBrowserTouch = (event: TouchEvent) => {
      if (isNativeOverlayTarget(event.target)) return;
      if (event.cancelable) event.preventDefault();
    };

    window.addEventListener('wheel', preventBrowserWheel, { capture: true, passive: false });
    window.addEventListener('touchmove', preventBrowserTouch, { capture: true, passive: false });
    window.addEventListener('gesturestart', preventBrowserWheel as unknown as EventListener, { capture: true, passive: false });
    window.addEventListener('gesturechange', preventBrowserWheel as unknown as EventListener, { capture: true, passive: false });

    return () => {
      window.removeEventListener('wheel', preventBrowserWheel, { capture: true });
      window.removeEventListener('touchmove', preventBrowserTouch, { capture: true });
      window.removeEventListener('gesturestart', preventBrowserWheel as unknown as EventListener, { capture: true });
      window.removeEventListener('gesturechange', preventBrowserWheel as unknown as EventListener, { capture: true });

      const currentMotion = motionRef.current;
      if (currentMotion.frame !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(currentMotion.frame);
      }

      if (currentMotion.timeout !== null) {
        window.clearTimeout(currentMotion.timeout);
      }

      if (pointerFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerFrameRef.current);
      }

      if (panFrameRef.current !== null) {
        window.cancelAnimationFrame(panFrameRef.current);
      }

      if (visualZoomState.frame !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(visualZoomState.frame);
      }

      if (visualZoomState.timeout !== null) {
        window.clearTimeout(visualZoomState.timeout);
      }
    };
  }, []);

  useEffect(() => {
    const updateScreenCursor = (event: globalThis.PointerEvent) => {
      const cursor = screenCursorRef.current;
      if (!cursor) return;
      cursor.style.transform = `translate3d(${event.clientX - 17}px, ${event.clientY - 17}px, 0)`;
    };

    window.addEventListener('pointermove', updateScreenCursor, { capture: true, passive: true });

    return () => {
      window.removeEventListener('pointermove', updateScreenCursor, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (cursorVisible) {
      moveCursor({ x: atlasSize.cx, y: atlasSize.cy });
      return;
    }

    setHoveredEntry(null);
  }, [cursorVisible]);

  function startIntro() {
    if (introState === 'idle') return;
    if (introState === 'intro') {
      pushViewHistory('hub');
      setIntroState('hub');
      return;
    }

    pushViewHistory('atlas');
    resetMotion(0);
    setIntroState('launching');
  }

  function returnToModuleHub() {
    databaseHistoryRef.current = false;
    dossierHistoryRef.current = false;
    setShowDatabasePanel(false);
    setSelectedEntry(null);
    setHoveredEntry(null);
    resetVisualZoom();
    setIntroState('hub');
  }

  function zoomViewBy(factor: number) {
    if (introState !== 'idle') {
      startIntro();
      return;
    }

    setHoveredEntry(null);
    nudgeVisualZoom(factor);
  }

  function handleFreeSpaceTap(touch: TouchPoint) {
    const now = Date.now();
    const previous = lastFreeTapRef.current;
    const tapDistance = Math.hypot(touch.clientX - previous.x, touch.clientY - previous.y);
    const isDoubleTap = now - previous.at < 320 && tapDistance < 34;

    if (isDoubleTap) {
      lastFreeTapRef.current = { at: 0, x: 0, y: 0 };
      if (visualZoomRef.current.currentZoom > 1.04 || visualZoomRef.current.targetZoom > 1.04) {
        resetVisualZoom();
      } else {
        zoomViewBy(1.38);
      }
      return;
    }

    lastFreeTapRef.current = {
      at: now,
      x: touch.clientX,
      y: touch.clientY
    };
  }

  function focusNodeInView(event: ReactMouseEvent<SVGGElement> | undefined, fallbackNode: WormholeEntryNode) {
    if (panGestureRef.current.active && panGestureRef.current.moved) return;
    event?.stopPropagation();
    offenDossierFromNode(fallbackNode.entry);
  }

  function offenDossierFromNode(entry: Entry) {
    databaseHistoryRef.current = false;
    setShowDatabasePanel(false);
    pushOverlayHistory('dossier');
    dossierHistoryRef.current = true;
    setSelectedEntry(entry);
    setHoveredEntry(null);
  }

  function closeDossier() {
    if (dossierHistoryRef.current) {
      window.history.back();
      return;
    }

    dossierHistoryRef.current = false;
    setSelectedEntry(null);
  }

  function activateFilterFromDossier(filter: ProjectDetailFilter) {
    setHoveredEntry(null);
    setShowRelations(true);

    if (filter.kind === 'style') {
      const styleId = resolveStyleFilter(filter.value);
      if (styleId) {
        setActiveStyleLens(styleId);
        setActiveTagLayer(null);
        setActiveSourceLens(null);
      }
    } else {
      const sourceLens = resolveSourceLensFromFilter(filter.value);
      const tagLayer = resolveTagLayerFromFilter(filter.value);

      setActiveStyleLens(null);

      if (sourceLens) {
        setActiveSourceLens(sourceLens);
        setActiveTagLayer(null);
      } else if (tagLayer) {
        setActiveTagLayer(tagLayer);
        setActiveSourceLens(null);
      } else {
        setActiveTagLayer(null);
        setActiveSourceLens(null);
      }
    }

    closeDossier();
  }

  function offenDatabasePanel() {
    if (!showDatabasePanelRef.current) {
      pushOverlayHistory('database');
      databaseHistoryRef.current = true;
    }

    setShowDatabasePanel(true);
  }

  function closeDatabasePanel() {
    if (databaseHistoryRef.current) {
      window.history.back();
      return;
    }

    databaseHistoryRef.current = false;
    setShowDatabasePanel(false);
  }

  function toggleDatabasePanel() {
    if (showDatabasePanelRef.current) {
      closeDatabasePanel();
      return;
    }

    offenDatabasePanel();
  }

  function pushOverlayHistory(name: 'database' | 'dossier') {
    const currentState = typeof window.history.state === 'object' && window.history.state !== null ? window.history.state : {};
    if (currentState.cosmosOverlay === name) return;
    window.history.pushState({ ...currentState, cosmosOverlay: name }, '', window.location.href);
  }

  function pushViewHistory(name: 'hub' | 'atlas') {
    if (typeof window === 'undefined') return;
    const currentState = typeof window.history.state === 'object' && window.history.state !== null ? window.history.state : {};
    if (currentState.cosmosView === name) return;
    window.history.pushState({ ...currentState, cosmosView: name }, '', window.location.href);
  }

  function createLocalEntryFromEntwurf(draft: EntryEntwurf) {
    const preview = draftToEntryPreview(draft);
    const existingEntry = entries.find((entry) => entry.id === preview.id || entry.slug === preview.slug);

    if (existingEntry) {
      resetDatabaseEntwurfState();
      setActiveStyleLens(null);
      setActiveSourceLens(null);
      setShowRelations(false);
      setShowDatabasePanel(false);
      setSelectedEntry(existingEntry);
      return;
    }

    const entry = draftToLocalEntry(draft, allEntries);
    setLocalEntries((currentEntries) => {
      const nextEntries = currentEntries.filter((currentEntry) => currentEntry.id !== entry.id);
      return [...nextEntries, entry];
    });
    setActiveStyleLens(null);
    setActiveSourceLens(null);
    setShowRelations(false);
    setShowDatabasePanel(false);
    resetDatabaseEntwurfState();
    setSelectedEntry(entry);
  }

  function resetDatabaseEntwurfState() {
    if (imageIdentify.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageIdentify.previewUrl);
    }

    setEntryEntwurf(initialEntryEntwurf);
    setResearchSeed({ project: '', architect: '', address: '' });
    setImageIdentify({ fileName: '', previewUrl: '', status: 'empty' });
    setIntakeFiles([]);
  }

  function resetMotion(value: number) {
    cancelMotionStep();

    motionRef.current = {
      currentTravel: value,
      targetTravel: value,
      velocity: 0,
      frame: null,
      timeout: null
    };

    setMotion({
      currentTravel: value,
      targetTravel: value,
      velocity: 0,
      isMoving: false,
      isSettling: true
    });
  }

  function nudgeVisualZoom(factor: number) {
    const ref = visualZoomRef.current;
    const boundedFactor = Math.max(0.72, Math.min(1.38, factor));
    ref.targetZoom = clampVisualZoom(ref.targetZoom * boundedFactor);
    ref.velocity += (boundedFactor - 1) * 0.22;
    setVisualZoom((current) => ({
      ...current,
      targetZoom: roundZoom(ref.targetZoom),
      velocity: roundZoom(ref.velocity),
      isZooming: true
    }));

    scheduleVisualZoomStep();
  }

  function setVisualZoomTarget(targetZoom: number) {
    const ref = visualZoomRef.current;
    ref.targetZoom = clampVisualZoom(targetZoom);
    ref.velocity += (ref.targetZoom - ref.currentZoom) * 0.16;
    setVisualZoom((current) => ({
      ...current,
      targetZoom: roundZoom(ref.targetZoom),
      velocity: roundZoom(ref.velocity),
      isZooming: true
    }));

    scheduleVisualZoomStep();
  }

  function resetVisualZoom() {
    setVisualZoomTarget(1);
    scheduleVisualPan({ x: 0, y: 0 });
  }

  function setVisualPanValue(nextPan: VisualPan) {
    const next = clampVisualPan(nextPan, Math.max(visualZoomRef.current.currentZoom, visualZoomRef.current.targetZoom));
    visualPanRef.current = next;
    applyVisualTransform();
  }

  function scheduleVisualPan(nextPan: VisualPan) {
    pendingPanRef.current = nextPan;

    if (panFrameRef.current !== null) return;

    panFrameRef.current = window.requestAnimationFrame(() => {
      panFrameRef.current = null;
      const pendingPan = pendingPanRef.current;
      pendingPanRef.current = null;
      if (pendingPan) setVisualPanValue(pendingPan);
    });
  }

  function resetVisualPanIfUnzoomed(nextZoom: number) {
    if (nextZoom > 1.01) return;
    visualPanRef.current = { x: 0, y: 0 };
    setVisualPan({ x: 0, y: 0 });
    applyVisualTransform({ x: 0, y: 0 }, nextZoom);
  }

  function stepVisualZoom() {
    const ref = visualZoomRef.current;
    cancelVisualZoomStep();

    const delta = ref.targetZoom - ref.currentZoom;
    const nextVelocity = ref.velocity * 0.5 + delta * 0.22;
    const nextZoom = clampVisualZoom(ref.currentZoom + nextVelocity);
    const settled = Math.abs(ref.targetZoom - nextZoom) < 0.0016 && Math.abs(nextVelocity) < 0.0012;

    ref.currentZoom = settled ? ref.targetZoom : nextZoom;
    ref.velocity = settled ? 0 : nextVelocity;

    setVisualZoom({
      currentZoom: roundZoom(ref.currentZoom),
      targetZoom: roundZoom(ref.targetZoom),
      velocity: roundZoom(ref.velocity),
      isZooming: !settled
    });
    applyVisualTransform(visualPanRef.current, ref.currentZoom);
    resetVisualPanIfUnzoomed(ref.currentZoom);

    if (!settled) {
      scheduleVisualZoomStep();
    }
  }

  function scheduleVisualZoomStep() {
    const ref = visualZoomRef.current;
    if (ref.frame !== null || ref.timeout !== null) return;

    if (typeof window.requestAnimationFrame === 'function') {
      ref.frame = window.requestAnimationFrame(stepVisualZoom);
      return;
    }

    ref.timeout = window.setTimeout(stepVisualZoom, 34);
  }

  function cancelVisualZoomStep() {
    const ref = visualZoomRef.current;

    if (ref.frame !== null && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(ref.frame);
    }

    if (ref.timeout !== null) {
      window.clearTimeout(ref.timeout);
    }

    ref.frame = null;
    ref.timeout = null;
  }

  function nudgeTravel(delta: number) {
    const ref = motionRef.current;
    const boundedDelta = Math.max(-0.052, Math.min(0.052, delta));
    ref.targetTravel = advanceTravel(ref.targetTravel, boundedDelta);
    ref.velocity += boundedDelta * 0.18;
    setMotion((current) => ({
      ...current,
      targetTravel: roundMotion(ref.targetTravel),
      velocity: roundMotion(ref.velocity),
      isMoving: true,
      isSettling: false
    }));

    scheduleMotionStep();
  }
  nudgeTravelRef.current = nudgeTravel;

  function stepMotion() {
    const ref = motionRef.current;
    cancelMotionStep();

    if (ref.targetTravel < 0 && ref.currentTravel < 0) {
      ref.targetTravel = 0;
    } else if (ref.targetTravel > wormholeTravelEnd && ref.currentTravel > wormholeTravelEnd) {
      ref.targetTravel = wormholeTravelEnd;
    }

    const delta = ref.targetTravel - ref.currentTravel;
    const nextVelocity = ref.velocity * 0.62 + delta * 0.18;
    const nextTravel = advanceTravel(ref.currentTravel, nextVelocity);
    const settled = Math.abs(ref.targetTravel - nextTravel) < 0.00035 && Math.abs(nextVelocity) < 0.00028;

    ref.currentTravel = settled ? ref.targetTravel : nextTravel;
    ref.velocity = settled ? 0 : nextVelocity;

    setMotion({
      currentTravel: roundMotion(ref.currentTravel),
      targetTravel: roundMotion(ref.targetTravel),
      velocity: roundMotion(ref.velocity),
      isMoving: !settled,
      isSettling: settled
    });

    if (!settled) {
      scheduleMotionStep();
    }
  }

  function scheduleMotionStep() {
    const ref = motionRef.current;
    if (ref.frame !== null || ref.timeout !== null) return;

    if (typeof window.requestAnimationFrame === 'function') {
      ref.frame = window.requestAnimationFrame(stepMotion);
      return;
    }

    ref.timeout = window.setTimeout(stepMotion, 34);
  }

  function cancelMotionStep() {
    const ref = motionRef.current;

    if (ref.frame !== null && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(ref.frame);
    }

    if (ref.timeout !== null) {
      window.clearTimeout(ref.timeout);
    }

    ref.frame = null;
    ref.timeout = null;
  }

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    if (introState !== 'idle') {
      startIntro();
      return;
    }

    const normalizedDelta = Math.max(-140, Math.min(140, event.deltaY));
    setHoveredEntry(null);

    if (event.ctrlKey) {
      zoomViewBy(Math.exp(-normalizedDelta * 0.0042));
      return;
    }

    closeDossier();
    nudgeTravel(normalizedDelta * 0.00008);
  }

  function handleTouchStart(event: ReactTouchEvent<SVGSVGElement>) {
    if (isInterfaceTarget(event.target)) return;
    if (event.cancelable) event.preventDefault();

    if (introState !== 'idle') {
      startIntro();
      return;
    }

    const touches = Array.from(event.touches);
    setHoveredEntry(null);

    if (touches.length >= 2) {
      const midpoint = averageTouchPoint(touches);
      touchTravelRef.current = {
        mode: 'pinch',
        startX: midpoint.clientX,
        startY: midpoint.clientY,
        lastX: midpoint.clientX,
        lastY: averageTouchY(touches),
        lastMidX: midpoint.clientX,
        lastMidY: midpoint.clientY,
        lastDistance: touchDistance(touches[0], touches[1]),
        moved: 0
      };
      return;
    }

    if (touches.length === 1) {
      touchTravelRef.current = {
        mode: 'single',
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        lastX: touches[0].clientX,
        lastY: touches[0].clientY,
        lastMidX: touches[0].clientX,
        lastMidY: touches[0].clientY,
        lastDistance: 0,
        moved: 0
      };
    }
  }

  function handleTouchMove(event: ReactTouchEvent<SVGSVGElement>) {
    if (isInterfaceTarget(event.target)) return;
    if (event.cancelable) event.preventDefault();

    if (introState !== 'idle') {
      startIntro();
      return;
    }

    const touches = Array.from(event.touches);
    if (touches.length === 0) return;

    closeDossier();
    setHoveredEntry(null);

    if (touches.length >= 2) {
      const nextDistance = touchDistance(touches[0], touches[1]);
      const previousDistance = touchTravelRef.current.mode === 'pinch' ? touchTravelRef.current.lastDistance : nextDistance;
      const midpoint = averageTouchPoint(touches);
      const distanceDelta = Math.max(-86, Math.min(86, nextDistance - previousDistance));
      const pinchFactor = previousDistance > 0 ? Math.max(0.78, Math.min(1.28, nextDistance / previousDistance)) : 1;
      const previousMidX = touchTravelRef.current.mode === 'pinch' ? touchTravelRef.current.lastMidX : midpoint.clientX;
      const previousMidY = touchTravelRef.current.mode === 'pinch' ? touchTravelRef.current.lastMidY : midpoint.clientY;
      const midDeltaX = Math.max(-72, Math.min(72, midpoint.clientX - previousMidX));
      const midDeltaY = Math.max(-72, Math.min(72, midpoint.clientY - previousMidY));
      touchTravelRef.current = {
        mode: 'pinch',
        startX: touchTravelRef.current.startX || midpoint.clientX,
        startY: touchTravelRef.current.startY || midpoint.clientY,
        lastX: midpoint.clientX,
        lastY: averageTouchY(touches),
        lastMidX: midpoint.clientX,
        lastMidY: midpoint.clientY,
        lastDistance: nextDistance,
        moved: touchTravelRef.current.moved + Math.abs(distanceDelta) + Math.hypot(midDeltaX, midDeltaY)
      };

      zoomViewBy(pinchFactor);
      if (visualZoomRef.current.targetZoom > 1.02 || visualZoomRef.current.currentZoom > 1.02) {
        scheduleVisualPan({
          x: visualPanRef.current.x + midDeltaX * 0.86,
          y: visualPanRef.current.y + midDeltaY * 0.86
        });
      }
      return;
    }

    const nextX = touches[0].clientX;
    const nextY = touches[0].clientY;
    const currentTouch = touchTravelRef.current;
    const previousX = currentTouch.mode === 'single' ? currentTouch.lastX : nextX;
    const previousY = currentTouch.mode === 'single' ? currentTouch.lastY : nextY;
    const horizontalDelta = Math.max(-96, Math.min(96, nextX - previousX));
    const verticalDelta = Math.max(-92, Math.min(92, previousY - nextY));
    const isZoomPan = visualZoomRef.current.currentZoom > 1.035 || visualZoomRef.current.targetZoom > 1.035;
    touchTravelRef.current = {
      mode: 'single',
      startX: currentTouch.mode === 'single' ? currentTouch.startX : touches[0].clientX,
      startY: currentTouch.mode === 'single' ? currentTouch.startY : touches[0].clientY,
      lastX: nextX,
      lastY: nextY,
      lastMidX: nextX,
      lastMidY: nextY,
      lastDistance: 0,
      moved: currentTouch.moved + Math.hypot(horizontalDelta, verticalDelta)
    };

    if (isZoomPan) {
      scheduleVisualPan({
        x: visualPanRef.current.x + horizontalDelta,
        y: visualPanRef.current.y - verticalDelta
      });
      return;
    }

    nudgeTravel(verticalDelta * 0.0002);
  }

  function handleTouchEnd(event: ReactTouchEvent<SVGSVGElement>) {
    if (isInterfaceTarget(event.target)) return;

    const touches = Array.from(event.touches);
    if (touches.length >= 2) {
      const midpoint = averageTouchPoint(touches);
      touchTravelRef.current = {
        mode: 'pinch',
        startX: midpoint.clientX,
        startY: midpoint.clientY,
        lastX: midpoint.clientX,
        lastY: averageTouchY(touches),
        lastMidX: midpoint.clientX,
        lastMidY: midpoint.clientY,
        lastDistance: touchDistance(touches[0], touches[1]),
        moved: 0
      };
      return;
    }

    if (touches.length === 1) {
      touchTravelRef.current = {
        mode: 'single',
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        lastX: touches[0].clientX,
        lastY: touches[0].clientY,
        lastMidX: touches[0].clientX,
        lastMidY: touches[0].clientY,
        lastDistance: 0,
        moved: 0
      };
      return;
    }

    const finishedTouch = event.changedTouches[0];
    const currentTouch = touchTravelRef.current;
    const tapDistance = finishedTouch && currentTouch.mode === 'single'
      ? Math.hypot(finishedTouch.clientX - currentTouch.startX, finishedTouch.clientY - currentTouch.startY)
      : Number.POSITIVE_INFINITY;

    if (finishedTouch && currentTouch.mode === 'single' && currentTouch.moved < 10 && tapDistance < 14 && !selectedEntry) {
      const point = pointerToSvgPoint(finishedTouch);
      const nearest = point ? nearestInteractiveNode(toCameraPoint(point), displayNodes, {
        coarse: ui.isCoarsePointer,
        zoom: visualZoomRef.current.currentZoom
      }) : null;
      if (nearest) {
        offenDossierFromNode(nearest.entry);
      } else {
        handleFreeSpaceTap(finishedTouch);
      }
    }

    setVisualPan(visualPanRef.current);
    touchTravelRef.current = {
      mode: 'idle',
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      lastMidX: 0,
      lastMidY: 0,
      lastDistance: 0,
      moved: 0
    };
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'touch') {
      setHoveredEntry(null);
      return;
    }

    const point = pointerToSvgPoint(event);
    if (!point) return;

    if (panGestureRef.current.active) {
      event.preventDefault();
      const gesture = panGestureRef.current;
      const dx = event.clientX - gesture.startClientX;
      const dy = event.clientY - gesture.startClientY;
      if (Math.hypot(dx, dy) > 3) gesture.moved = true;
      scheduleVisualPan({
        x: gesture.startPanX + dx,
        y: gesture.startPanY + dy
      });
      moveCursor(point);
      setHoveredEntry(null);
      return;
    }

    if (isInterfaceTarget(event.target)) {
      moveCursor(point);
      setHoveredEntry(null);
      return;
    }

    schedulePointerMove(point);
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'touch' || event.button !== 0 || isInterfaceTarget(event.target) || selectedEntry || introState !== 'idle') return;
    if (isEntryNodeTarget(event.target)) {
      panGestureRef.current.moved = false;
      return;
    }
    if (visualZoomRef.current.currentZoom <= 1.02) return;

    panGestureRef.current = {
      active: true,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: visualPanRef.current.x,
      startPanY: visualPanRef.current.y,
      moved: false
    };
    setHoveredEntry(null);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (!panGestureRef.current.active || panGestureRef.current.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setVisualPan(visualPanRef.current);
    window.setTimeout(() => {
      panGestureRef.current = {
        active: false,
        pointerId: -1,
        startClientX: 0,
        startClientY: 0,
        startPanX: 0,
        startPanY: 0,
        moved: false
      };
    }, 0);
  }

  function handleAtlasClick(event: ReactMouseEvent<SVGSVGElement>) {
    if (introState !== 'idle') {
      startIntro();
      return;
    }

    if (isInterfaceTarget(event.target)) return;
    if (showDatabasePanelRef.current) {
      closeDatabasePanel();
      return;
    }
    if (selectedEntry) {
      closeDossier();
      return;
    }
    if (panGestureRef.current.moved) return;

    const point = pointerToSvgPoint(event);
    const nearest = point ? nearestInteractiveNode(toCameraPoint(point), displayNodes, {
      coarse: ui.isCoarsePointer,
      zoom: visualZoomRef.current.currentZoom
    }) : null;
    if (nearest) {
      offenDossierFromNode(nearest.entry);
    }
  }

  function schedulePointerMove(point: SvgPoint) {
    pendingPointerPointRef.current = point;

    if (pointerFrameRef.current !== null) return;

    pointerFrameRef.current = window.requestAnimationFrame(() => {
      const nextPoint = pendingPointerPointRef.current;
      pendingPointerPointRef.current = null;
      pointerFrameRef.current = null;

      if (nextPoint) {
        commitPointerMove(nextPoint);
      }
    });
  }

  function commitPointerMove(point: SvgPoint) {
    moveCursor(point);

    if (selectedEntry || isTraveling || introState !== 'idle' || performanceTier === 'reduced') {
      setHoveredEntry(null);
      return;
    }

    const nearest = nearestInteractiveNode(toCameraPoint(point), displayNodes, {
      zoom: visualZoomRef.current.currentZoom
    });
    setHoveredEntry(nearest?.entry.id ?? null);
  }

  function handlePointerLeave() {
    pendingPointerPointRef.current = null;
    setHoveredEntry(null);

    if (pointerFrameRef.current !== null) {
      window.cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }

  }

  function moveCursor(point: SvgPoint) {
    const cursor = cursorRef.current;
    if (!cursor) return;
    cursor.setAttribute('transform', `translate(${point.x} ${point.y})`);
  }

  function setHoveredEntry(entryId: string | null) {
    if (hoveredEntryIdRef.current === entryId) return;
    hoveredEntryIdRef.current = entryId;
    setHoveredEntryId(entryId);
  }

  function pointerToSvgPoint(event: { clientX: number; clientY: number }): SvgPoint | null {
    const svg = svgRef.current;
    if (!svg) return null;

    const matrix = svg.getScreenCTM();
    if (!matrix) return null;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function screenPanToSvgPan(pan: VisualPan): VisualPan {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return pan;

    return {
      x: pan.x * (atlasSize.width / rect.width),
      y: pan.y * (atlasSize.height / rect.height)
    };
  }

  function buildCameraTransform(zoom: number, pan: VisualPan) {
    const svgPan = screenPanToSvgPan(pan);
    return `translate(${roundMotion(atlasSize.cx + svgPan.x)} ${roundMotion(atlasSize.cy + svgPan.y)}) scale(${roundZoom(zoom)}) translate(${-atlasSize.cx} ${-atlasSize.cy})`;
  }

  function applyVisualTransform(pan = visualPanRef.current, zoom = visualZoomRef.current.currentZoom) {
    const main = mainRef.current;
    const camera = cameraRef.current;

    if (main) {
      main.style.setProperty('--cosmos-visual-zoom', String(roundZoom(zoom)));
      main.style.setProperty('--cosmos-visual-pan-x', `${roundMotion(pan.x)}px`);
      main.style.setProperty('--cosmos-visual-pan-y', `${roundMotion(pan.y)}px`);
    }

    if (camera) {
      camera.setAttribute('transform', buildCameraTransform(zoom, pan));
    }
  }

  function toCameraPoint(point: SvgPoint): SvgPoint {
    const zoom = visualZoomRef.current.currentZoom || 1;
    const pan = screenPanToSvgPan(visualPanRef.current);
    return {
      x: atlasSize.cx + (point.x - atlasSize.cx - pan.x) / zoom,
      y: atlasSize.cy + (point.y - atlasSize.cy - pan.y) / zoom
    };
  }

  return (
    <main ref={mainRef} style={visualZoomStyle} className={`relative h-screen w-screen overflow-hidden bg-[#050505] text-[#f7f7f4] cosmos-perf-${performanceTier} cosmos-intro-${introState} ${ui.isCoarsePointer ? 'cosmos-mobile-web' : 'cosmos-desktop-web'} ${ui.hasFinePointer ? 'cosmos-fine-pointer' : 'cosmos-touch-web'} ${introState === 'launching' ? 'cosmos-launching' : ''} ${returningFromDatabase ? 'cosmos-returning-from-database' : ''} ${isTraveling || visualZoom.isZooming ? 'cosmos-moving' : ''} ${visualZoom.currentZoom > 1.01 ? 'cosmos-lensing' : ''} ${introState === 'idle' && !isTraveling && !visualZoom.isZooming ? 'cosmos-idle' : ''}`}>
      <WormholeCanvas state={state} isMoving={isTraveling} quality={performanceTier} />
      <div className="relative z-10 h-full w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${atlasSize.width} ${atlasSize.height}`}
          className="h-full w-full touch-none cursor-none"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onClick={handleAtlasClick}
        >
          <defs>
          </defs>
          <rect width={atlasSize.width} height={atlasSize.height} fill="#050505" opacity={introState === 'intro' ? 0.16 : 0.02} />
          <g style={backgroundStyle} pointerEvents={selectedEntry ? 'none' : 'auto'}>
            <g ref={cameraRef} className="wormhole-camera" transform={cameraTransform}>
              {performanceTier === 'full' ? <WormholeRings state={state} isMoving={isTraveling} quality={performanceTier} /> : null}

              {relationOverlayActive ? (
                <RelationOverlay nodes={displayNodes} relations={relations} selectedEntry={selectedEntry} focusEntry={hoveredEntry} isMoving={isTraveling && !showRelations} />
              ) : null}

              {displayNodes.map((node) => {
                const isSourceLensMatch = isSourceLensEntry(node.entry, activeSourceLens);
                const isTagLayerMatch = isTagLayerEntry(node.entry, activeTagLayer);
                const nodeOpacity = node.opacity * styleLensOpacity(node, activeStyleLens) * sourceLensOpacity(node, activeSourceLens) * tagLayerOpacity(node, activeTagLayer);
                const displayOpacity = isSourceLensMatch || isTagLayerMatch ? Math.max(0.94, nodeOpacity) : nodeOpacity;

                return (
                <g
                  key={node.entry.id}
                  className="node-focus-drift"
                  opacity={displayOpacity}
                  style={{ pointerEvents: node.opacity < 0.045 ? 'none' : 'auto' }}
                >
                  <SemanticEntryNode
                    entry={node.entry}
                    x={node.x}
                    y={node.y}
                    labelX={node.labelX}
                    labelY={node.labelY}
                    labelAnchor={node.labelAnchor}
                    labelLeaderX={node.labelLeaderX}
                    labelLeaderY={node.labelLeaderY}
                    clusterSize={node.clusterSize}
                    semanticLevel="global"
                    scale={1}
                    isSelected={activeSelectedEntryId === node.entry.id}
                    isHovered={hoveredEntryId === node.entry.id}
                    nodeRadius={isSourceLensMatch || isTagLayerMatch ? Math.max(node.size, 13) : node.size}
                    showLabel={!fastNodeRender && (isSourceLensMatch || isTagLayerMatch)}
                    styleLensActive={activeStyleLens === node.entry.style_sector || isSourceLensMatch || isTagLayerMatch}
                    renderMode={fastNodeRender ? 'fast' : 'full'}
                    driftX={node.driftX}
                    driftY={node.driftY}
                    driftDelay={node.driftDelay}
                    onSelect={(event) => focusNodeInView(event, node)}
                    onHover={setHoveredEntry}
                  />
                </g>
                );
              })}
              <StyleSectors
                state={state}
                isMoving={isTraveling}
                activeStyleLens={activeStyleLens}
                onSelectStyleLens={(styleId) => {
                  setHoveredEntry(null);
                  setActiveStyleLens((current) => current === styleId ? null : styleId);
                  setActiveSourceLens(null);
                }}
              />
            </g>
          </g>
          {selectedEntry && !showDatabasePanel ? <SnappedEntryOverlay entry={selectedEntry} onDismiss={closeDossier} onSelectFilter={activateFilterFromDossier} /> : null}
          {introState === 'idle' && !ui.isCoarsePointer ? (
            <DatabaseAccess
              isOpen={showDatabasePanel}
              onToggle={() => {
                setHoveredEntry(null);
                toggleDatabasePanel();
              }}
            />
          ) : null}
          {introState === 'idle' && !ui.isCoarsePointer ? <TimeReadout timePosition={state.timePosition} currentYear={state.currentYear} /> : null}
          {introState === 'idle' && !ui.isCoarsePointer ? <VisualZoomReadout zoom={visualZoom.currentZoom} /> : null}
          {introState === 'idle' || introState === 'launching' ? <BrandChrome isArriving={introState === 'launching'} onReturnToHub={returnToModuleHub} /> : null}
        </svg>
        {showDatabasePanel && introState === 'idle' ? (
          <DatabaseArchivePanel
            renderMode="html"
            entries={allEntries}
            relations={relations}
            selectedEntry={selectedEntry}
            draft={entryEntwurf}
            intakeFiles={intakeFiles}
            researchSeed={researchSeed}
            imageIdentify={imageIdentify}
            developerMode={developerMode}
            onEntwurfChange={setEntryEntwurf}
            onIntakeFilesChange={setIntakeFiles}
            onResearchSeedChange={setResearchSeed}
            onImageIdentifyChange={setImageIdentify}
            onCreateLocalEntry={createLocalEntryFromEntwurf}
            onDismiss={closeDatabasePanel}
            onReturnToHub={returnToModuleHub}
          />
        ) : null}
        {introState === 'idle' && !showDatabasePanel ? (
          <ProjectSearch entries={allEntries} developerMode={developerMode} onDeveloperModeChange={updateDeveloperMode} />
        ) : null}
        {introState === 'idle' && !showDatabasePanel && !ui.isCoarsePointer ? (
          <FilterAccess
            showRelations={showRelations}
            activeTagLayer={activeTagLayer}
            activeSourceLens={activeSourceLens}
            onSelectTagLayer={(layerId) => {
              setHoveredEntry(null);
              setActiveTagLayer((current) => current === layerId ? null : layerId);
              setActiveSourceLens(null);
            }}
            onSelectSourceLens={(lensId) => {
              setHoveredEntry(null);
              setActiveSourceLens((current) => current === lensId ? null : lensId);
              setActiveTagLayer(null);
            }}
            onReset={() => {
              setHoveredEntry(null);
              setActiveTagLayer(null);
              setActiveSourceLens(null);
            }}
            onToggleRelations={() => {
              setHoveredEntry(null);
              setShowRelations((current) => !current);
            }}
          />
        ) : null}
        {introState === 'idle' && ui.isCoarsePointer && !selectedEntry && !showDatabasePanel ? (
          <MobileDatabaseAccess
            onToggle={() => {
              setHoveredEntry(null);
              toggleDatabasePanel();
            }}
          />
        ) : null}
        {introState === 'idle' && ui.isCoarsePointer && !selectedEntry && !showDatabasePanel ? (
          <MobileAtlasHud
            currentYear={state.currentYear}
            timePosition={state.timePosition}
            visualZoom={visualZoom.currentZoom}
            showRelations={showRelations}
            activeTagLayer={activeTagLayer}
            onZoomIn={() => zoomViewBy(1.22)}
            onZoomOut={() => zoomViewBy(0.82)}
            onResetZoom={resetVisualZoom}
            onSelectTagLayer={(layerId) => {
              setHoveredEntry(null);
              setActiveTagLayer((current) => current === layerId ? null : layerId);
              setActiveSourceLens(null);
            }}
            onToggleRelations={() => {
              setHoveredEntry(null);
              setShowRelations((current) => !current);
            }}
          />
        ) : null}
      </div>

      {introState !== 'idle' ? <IntroGate state={introState} onStart={startIntro} onOpenKosmoAsset={() => setIntroState('asset')} onReturnToHub={returnToModuleHub} /> : null}
      {introState === 'launching' ? <WormholeBirthOverlay /> : null}
      {returningFromDatabase ? <DatabaseReturnOverlay /> : null}
      {cursorVisible ? <ScreenCosmosCursor cursorRef={screenCursorRef} isDossierOpen={Boolean(selectedEntry)} isOverlayOpen={showDatabasePanel || introState !== 'idle'} /> : null}
    </main>
  );
}

function usePerformanceTier(): PerformanceTier {
  const [tier, setTier] = useState<PerformanceTier>('balanced');

  useEffect(() => {
    const updateTier = () => {
      const params = new URLSearchParams(window.location.search);
      const forcedTier = params.get('perf');
      const userAgent = navigator.userAgent.toLowerCase();
      const browserMode = browserPerformanceMode(userAgent);
      document.documentElement.dataset.cosmosBrowser = browserMode;

      if (forcedTier === 'reduced' || forcedTier === 'balanced' || forcedTier === 'full') {
        setTier(forcedTier);
        document.documentElement.dataset.cosmosPerf = forcedTier;
        return;
      }

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const narrowViewport = window.innerWidth < 760;
      const cores = navigator.hardwareConcurrency || 4;
      const memory = typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number'
        ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
        : 8;
      const fragileDevice = cores <= 4 || memory <= 4;
      const fragileViewport = narrowViewport || coarsePointer;

      const nextTier: PerformanceTier = reducedMotion || fragileViewport || fragileDevice
        ? 'reduced'
        : 'balanced';

      setTier(nextTier);
      document.documentElement.dataset.cosmosPerf = nextTier;
    };

    updateTier();
    window.addEventListener('resize', updateTier, { passive: true });

    return () => window.removeEventListener('resize', updateTier);
  }, []);

  return tier;
}

function browserPerformanceMode(userAgent: string) {
  if (userAgent.includes('opr/') || userAgent.includes('opera')) return 'opera';
  if (userAgent.includes('safari') && !userAgent.includes('chrome') && !userAgent.includes('chromium')) return 'safari';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('chrome') || userAgent.includes('chromium')) return 'chromium';
  return 'standard';
}

function useCoarsePointer() {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const updatePointerMode = () => setIsCoarsePointer(media.matches);

    updatePointerMode();
    media.addEventListener('change', updatePointerMode);

    return () => media.removeEventListener('change', updatePointerMode);
  }, []);

  return isCoarsePointer;
}

function useAtlasUiMetrics(): AtlasUiMetrics {
  const isCoarsePointer = useCoarsePointer();
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);

  useEffect(() => {
    const updateViewportMode = () => setIsNarrowViewport(window.innerWidth <= 760);

    updateViewportMode();
    window.addEventListener('resize', updateViewportMode, { passive: true });

    return () => window.removeEventListener('resize', updateViewportMode);
  }, []);

  const useLargeInterface = isCoarsePointer || isNarrowViewport;
  const databaseWidth = useLargeInterface ? 910 : 468;
  const databaseHeight = useLargeInterface ? 810 : 660;
  const dossierScale = useLargeInterface ? 2.72 : 1.42;
  const dossierHeight = 292 * dossierScale;

  return {
    isCoarsePointer: useLargeInterface,
    hasFinePointer: !isCoarsePointer,
    dock: {
      buttonHeight: useLargeInterface ? 78 : 20,
      buttonY: useLargeInterface ? 844 : 923,
      buttonTextY: useLargeInterface ? 893 : 936.2,
      buttonFontSize: useLargeInterface ? 21 : 6.6,
      shellWidth: useLargeInterface ? 960 : 520,
      shellHeight: useLargeInterface ? 114 : 38,
      shellY: useLargeInterface ? 826 : 914,
      shellRadius: useLargeInterface ? 57 : 19,
      gap: useLargeInterface ? 16 : 7
    },
    databasePanel: {
      width: databaseWidth,
      height: databaseHeight,
      x: useLargeInterface ? 35 : 28,
      y: useLargeInterface ? 86 : 78
    },
    dossier: {
      cardScale: dossierScale,
      cardY: useLargeInterface ? 104 : atlasSize.cy - dossierHeight / 2,
      closeWidth: useLargeInterface ? 96 : 46,
      actionHeight: useLargeInterface ? 44 : 22,
      actionOffsetY: useLargeInterface ? -58 : -34,
      actionFontSize: useLargeInterface ? 13.5 : 9,
      openWidth: useLargeInterface ? 142 : 76
    }
  };
}

function isInterfaceTarget(target: EventTarget) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('.radial-hud, .filter-access, .lens-control, .lens-control-panel, .lens-access, .lens-panel, .database-access, .mobile-database-trigger, .database-draft, .dossier-overlay, .style-sector, .project-search'));
}

function isEntryNodeTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-entry-node="true"]'));
}

function isNativeOverlayTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('.database-draft, .lens-control, .lens-control-panel, .project-search, .dossier-overlay, .entry-page'));
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function isReadableNode(node: WormholeEntryNode) {
  const margin = -96;
  const insideExtendedFrame = node.x > margin && node.x < atlasSize.width - margin && node.y > margin && node.y < atlasSize.height - margin;
  return insideExtendedFrame && node.depth >= -0.12 && node.depth <= 1.26 && node.opacity >= 0.006;
}

function limitDisplayNodes(nodes: WormholeEntryNode[]) {
  return nodes
    .filter(isReadableNode)
    .sort((a, b) => b.depth - a.depth);
}

function styleLensOpacity(node: WormholeEntryNode, activeStyleLens: StyleSectorId | null) {
  if (!activeStyleLens) return 1;
  if (node.entry.style_sector === activeStyleLens) return 1;
  return 0.24 + node.closeness * 0.18;
}

function sourceLensOpacity(node: WormholeEntryNode, activeSourceLens: SourceLens) {
  if (!activeSourceLens) return 1;

  if (isSourceLensEntry(node.entry, activeSourceLens)) return 1;
  return 0.035;
}

function tagLayerOpacity(node: WormholeEntryNode, activeTagLayer: ActiveTagLayer) {
  if (!activeTagLayer) return 1;
  if (isTagLayerEntry(node.entry, activeTagLayer)) return 1;
  return 0.08 + node.closeness * 0.12;
}

function mergeEntries(baseEntries: Entry[], localEntries: Entry[]) {
  if (localEntries.length === 0) return baseEntries;
  const merged = new Map(baseEntries.map((entry) => [entry.id, entry]));
  localEntries.forEach((entry) => merged.set(entry.id, entry));
  return [...merged.values()];
}

function isSourceLensEntry(entry: Entry, activeSourceLens: SourceLens) {
  if (!activeSourceLens) return false;
  const definition = sourceLensDefinitions.find((source) => source.id === activeSourceLens);
  if (!definition) return false;

  const sourceText = [
    entry.source_url,
    entry.source_quality,
    ...(entry.source_documents ?? []),
    ...(entry.source_candidates?.map((source) => `${source.source_type} ${source.title} ${source.url ?? ''} ${source.notes ?? ''}`) ?? []),
    ...(entry.source_assets?.map((asset) => `${asset.kind} ${asset.label} ${asset.url} ${asset.source_url ?? ''} ${asset.credit ?? ''}`) ?? []),
    ...(entry.media?.map((media) => `${media.label} ${media.url ?? ''} ${media.source_url ?? ''} ${media.credit ?? ''}`) ?? []),
    ...(entry.asset_candidates?.map((asset) => `${asset.kind} ${asset.title} ${asset.local_path ?? ''} ${asset.planned_r2_key ?? ''}`) ?? []),
    ...entry.themes,
    ...(entry.authors ?? [])
  ].join(' ').toLowerCase();

  return definition.terms.some((term) => sourceText.includes(term.toLowerCase()));
}

function isTagLayerEntry(entry: Entry, activeTagLayer: ActiveTagLayer) {
  if (!activeTagLayer) return false;
  const definition = tagLayerDefinitions.find((layer) => layer.id === activeTagLayer);
  if (!definition) return false;

  const layerText = [
    entry.entry_type,
    entry.program?.type,
    entry.program?.subtype,
    entry.context?.topography,
    entry.context?.setting,
    entry.materials?.notes,
    ...(entry.database_tags ?? []),
    ...(entry.themes ?? []),
    ...(entry.vibes ?? []),
    ...(entry.materials?.primary ?? []),
    ...(entry.materials?.secondary ?? []),
    ...(entry.materials?.stone_type ?? []),
    ...(entry.context?.heritage_context ?? []),
    ...(entry.context?.landscape_relation ?? []),
    ...(entry.analysis_observations?.map((observation) => `${observation.analysis_type} ${observation.label}`) ?? [])
  ].join(' ').toLowerCase();

  return definition.terms.some((term) => layerText.includes(term.toLowerCase()));
}

function resolveStyleFilter(value: ProjectDetailFilter['value']) {
  const normalized = String(value).toLowerCase().replace(/^style:/, '').replace(/-/g, '_');
  return styleSectors.find((sector) => sector.id === normalized)?.id ?? null;
}

function resolveSourceLensFromFilter(value: ProjectDetailFilter['value']) {
  const normalized = String(value).toLowerCase().replace(/[_-]/g, ' ');
  return sourceLensDefinitions.find((definition) => {
    if (normalized.includes(definition.id.toLowerCase())) return true;
    return definition.terms.some((term) => normalized.includes(term.toLowerCase().replace(/[_-]/g, ' ')));
  })?.id ?? null;
}

function resolveTagLayerFromFilter(value: ProjectDetailFilter['value']) {
  const normalized = String(value).toLowerCase().replace(/[_-]/g, ' ');
  return tagLayerDefinitions.find((definition) => {
    if (normalized.includes(definition.id.toLowerCase().replace(/[_-]/g, ' '))) return true;
    return definition.terms.some((term) => normalized.includes(term.toLowerCase().replace(/[_-]/g, ' ')));
  })?.id ?? null;
}

function nearestInteractiveNode(point: SvgPoint, nodes: WormholeEntryNode[], options: { coarse?: boolean; zoom?: number } = {}) {
  const baseHitRadius = options.coarse ? 36 : 24;
  const zoomedHitBoost = (options.zoom ?? 1) > 1.02 ? 18 : 0;

  return nodes.reduce<{ entry: Entry; distance: number } | null>((nearest, node) => {
    if (node.opacity < 0.045) return nearest;

    const distance = Math.hypot(point.x - node.x, point.y - node.y);
    const hitRadius = Math.max(baseHitRadius, node.size + 10 + zoomedHitBoost);
    if (distance > hitRadius) return nearest;

    if (!nearest || distance < nearest.distance) {
      return { entry: node.entry, distance };
    }

    return nearest;
  }, null);
}

function touchDistance(first: TouchPoint, second: TouchPoint) {
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function averageTouchY(touches: TouchPoint[]) {
  return touches.reduce((sum, touch) => sum + touch.clientY, 0) / touches.length;
}

function averageTouchPoint(touches: TouchPoint[]) {
  return {
    clientX: touches.reduce((sum, touch) => sum + touch.clientX, 0) / touches.length,
    clientY: touches.reduce((sum, touch) => sum + touch.clientY, 0) / touches.length
  };
}

function roundMotion(value: number) {
  return Math.round(value * 100000) / 100000;
}

function FilterAccess({
  showRelations,
  activeTagLayer,
  activeSourceLens,
  onSelectTagLayer,
  onSelectSourceLens,
  onReset,
  onToggleRelations
}: {
  showRelations: boolean;
  activeTagLayer: ActiveTagLayer;
  activeSourceLens: SourceLens;
  onSelectTagLayer: (layerId: TagLayerId | null) => void;
  onSelectSourceLens: (lensId: SourceLensId) => void;
  onReset: () => void;
  onToggleRelations: () => void;
}) {
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const filterRef = useRef<HTMLElement | null>(null);
  const activeCount = (activeTagLayer ? 1 : 0) + (activeSourceLens ? 1 : 0) + (showRelations ? 1 : 0);
  const isPanelOpen = isHoverOpen || isPinnedOpen;

  useEffect(() => {
    if (!isPanelOpen) return;

    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      const root = filterRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setIsHoverOpen(false);
      setIsPinnedOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Backspace') return;
      event.preventDefault();
      event.stopPropagation();
      setIsHoverOpen(false);
      setIsPinnedOpen(false);
    };

    window.addEventListener('pointerdown', closeOnOutsidePointer, { capture: true });
    window.addEventListener('keydown', closeOnEscape, { capture: true });

    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePointer, { capture: true });
      window.removeEventListener('keydown', closeOnEscape, { capture: true });
    };
  }, [isPanelOpen]);

  function stopAndRun(event: ReactMouseEvent, action: () => void) {
    event.preventDefault();
    event.stopPropagation();
    action();
  }

  return (
    <aside
      className={`filter-access cosmos-text-safe ${isPanelOpen ? 'filter-access-open' : ''} ${isPinnedOpen ? 'filter-access-pinned' : ''}`}
      ref={filterRef}
      onPointerEnter={() => setIsHoverOpen(true)}
      onPointerLeave={() => setIsHoverOpen(false)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' && event.key !== 'Backspace') return;
        event.preventDefault();
        event.stopPropagation();
        setIsHoverOpen(false);
        setIsPinnedOpen(false);
      }}
    >
      {isPanelOpen ? (
        <div className="filter-access-panel" aria-label="KosmoData Filter">
          <section>
            <div className="filter-access-section-title">Ebenen</div>
            <div className="filter-access-grid">
              <button type="button" className={!activeTagLayer && !activeSourceLens ? 'filter-access-active' : ''} onClick={(event) => stopAndRun(event, onReset)}>
                Alle
              </button>
              {tagLayerDefinitions.map((layer) => (
                <button key={layer.id} type="button" className={activeTagLayer === layer.id ? 'filter-access-active' : ''} onClick={(event) => stopAndRun(event, () => onSelectTagLayer(layer.id))}>
                  {layer.label}
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="filter-access-section-title">Quellwebseite</div>
            <div className="filter-access-grid filter-access-source-grid">
              {sourceLensDefinitions.map((source) => (
                <button key={source.id} type="button" className={activeSourceLens === source.id ? 'filter-access-active' : ''} onClick={(event) => stopAndRun(event, () => onSelectSourceLens(source.id))}>
                  {source.label}
                </button>
              ))}
            </div>
          </section>
          <section>
            <button type="button" className={`filter-access-relations ${showRelations ? 'filter-access-active' : ''}`} onClick={(event) => stopAndRun(event, onToggleRelations)}>
              Netzwerk {showRelations ? 'aktiv' : 'anzeigen'}
            </button>
          </section>
        </div>
      ) : null}
      <button
        type="button"
        className={`filter-access-trigger ${activeCount ? 'filter-access-trigger-active' : ''}`}
        aria-label="Filter öffnen"
        aria-expanded={isPanelOpen}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsPinnedOpen((current) => !current);
          setIsHoverOpen(true);
        }}
      >
        <span>Filter</span>
        {activeCount ? <i>{activeCount}</i> : null}
      </button>
    </aside>
  );
}

function MobileAtlasHud({
  currentYear,
  timePosition,
  visualZoom,
  showRelations,
  activeTagLayer,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onSelectTagLayer,
  onToggleRelations
}: {
  currentYear: number;
  timePosition: number;
  visualZoom: number;
  showRelations: boolean;
  activeTagLayer: ActiveTagLayer;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onSelectTagLayer: (layerId: TagLayerId | null) => void;
  onToggleRelations: () => void;
}) {
  const span = dominantSpanForYear(currentYear);
  const progress = Math.round(Math.max(0, Math.min(1, timePosition / wormholeTravelEnd)) * 100);

  function stopAndRun(event: { stopPropagation: () => void; preventDefault?: () => void }, action: () => void) {
    event.preventDefault?.();
    event.stopPropagation();
    action();
  }

  return (
    <div className="mobile-atlas-shell cosmos-text-safe" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <section className="mobile-atlas-time" aria-label="Aktuelle Zeitposition">
        <div>
          <span className="mobile-atlas-kicker">Zeitfenster</span>
          <strong>{formatYear(currentYear)}</strong>
        </div>
        <div className="mobile-atlas-time-meta">
          <span>{span.label}</span>
          <i>{progress}% Tiefe</i>
        </div>
        {visualZoom > 1.03 ? <em>{Math.round(visualZoom * 100)}% Lupe</em> : null}
      </section>

      <section className="mobile-atlas-gesture" aria-label="Touch-Gesten und Lupe">
        <p>
          <span>1 Finger: {visualZoom > 1.03 ? 'Lupe ziehen' : 'Zeitreise'}</span>
          <small>Pinch zoomt · Doppeltipp setzt Lupe</small>
        </p>
        <div>
          <button type="button" onClick={(event) => stopAndRun(event, onZoomOut)} aria-label="Lupe verkleinern">−</button>
          <button type="button" onClick={(event) => stopAndRun(event, onResetZoom)} aria-label="Lupe zurücksetzen">1:1</button>
          <button type="button" onClick={(event) => stopAndRun(event, onZoomIn)} aria-label="Lupe vergrößern">+</button>
        </div>
      </section>

      <nav className="mobile-atlas-dock" aria-label="Mobile Atlas Filter und Navigation">
        <button type="button" className={!activeTagLayer ? 'mobile-atlas-active' : ''} onClick={(event) => stopAndRun(event, () => onSelectTagLayer(null))} aria-pressed={!activeTagLayer}>
          Alle
        </button>
        {tagLayerDefinitions.map((layer) => (
          <button key={layer.id} type="button" className={activeTagLayer === layer.id ? 'mobile-atlas-active' : ''} onClick={(event) => stopAndRun(event, () => onSelectTagLayer(layer.id))} aria-pressed={activeTagLayer === layer.id}>
            {layer.label}
          </button>
        ))}
        <button type="button" className={showRelations ? 'mobile-atlas-active' : ''} onClick={(event) => stopAndRun(event, onToggleRelations)} aria-pressed={showRelations}>
          Netz
        </button>
      </nav>
    </div>
  );
}

function MobileDatabaseAccess({ onToggle }: { onToggle: () => void }) {
  return (
    <button
      type="button"
      className="mobile-database-trigger cosmos-trigger"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      aria-label="KosmoData öffnen"
    >
      <span aria-hidden="true">◆</span>
      <span>KosmoData</span>
    </button>
  );
}

function styleShortLabel(id: StyleSectorId) {
  const labels: Record<StyleSectorId, string> = {
    classical_architecture: 'I',
    pre_modern_architecture: 'II',
    modern_architecture: 'III',
    postwar_modern_architecture: 'IV',
    sustainable_architecture: 'V',
    vernacular_architecture: 'VI'
  };
  return labels[id];
}

function DatabaseAccess({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const ui = useAtlasUiMetrics();
  const width = ui.isCoarsePointer ? 284 : 130;
  const height = ui.isCoarsePointer ? 112 : 46;
  const x = ui.isCoarsePointer ? 34 : 28;
  const y = ui.isCoarsePointer ? 82 : 50;
  const iconScale = ui.isCoarsePointer ? 1.58 : 1.02;
  function toggleOnce(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    onToggle();
  }

  return (
    <g
      className={`database-access ${isOpen ? 'database-access-offen' : ''}`}
      pointerEvents="auto"
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label="KosmoData öffnen"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={toggleOnce}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      <rect x="0" y={-height / 2} width={width} height={height} rx={height / 2} fill={isOpen ? '#f7f7f4' : '#050505'} stroke="#00e7ff" strokeWidth="0.92" opacity="0.9" />
      <path d={`M ${height / 2} ${-height / 2 + 1} H ${width - height / 2}`} stroke="#00e7ff" strokeWidth="0.42" opacity={isOpen ? 0.18 : 0.34} />
      <g className="database-access-core" transform={`translate(${ui.isCoarsePointer ? 24 : 13} ${ui.isCoarsePointer ? -5.8 : -2.1}) scale(${iconScale})`} stroke="#f7f7f4" fill="none" strokeWidth="0.72" opacity="0.9">
        <ellipse cx="14" cy="-3.6" rx="5.6" ry="2.2" stroke={isOpen ? '#050505' : '#f7f7f4'} />
        <path d="M 8.4 -3.6 V 5.4 Q 14 8.2 19.6 5.4 V -3.6" stroke={isOpen ? '#050505' : '#f7f7f4'} />
        <path d="M 8.4 1.2 Q 14 4 19.6 1.2" stroke={isOpen ? '#050505' : '#f7f7f4'} opacity="0.52" />
      </g>
      <text x={ui.isCoarsePointer ? 78 : 45} y={ui.isCoarsePointer ? 8.6 : 4.4} fill={isOpen ? '#050505' : '#f7f7f4'} fontSize={ui.isCoarsePointer ? 24 : 8.2} fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em" fontWeight="650">
        KOSMODATA
      </text>
      <rect
        x="0"
        y={-height / 2}
        width={width}
        height={height}
        rx={height / 2}
        fill="#050505"
        opacity="0.001"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={toggleOnce}
      />
    </g>
  );
}

function BrandChrome({ isArriving = false, onReturnToHub }: { isArriving?: boolean; onReturnToHub: () => void }) {
  return (
    <g
      className={`brand-chrome ${isArriving ? 'brand-chrome-arriving' : ''}`}
      pointerEvents="auto"
      role="button"
      tabIndex={0}
      aria-label="Zurück zum Hauptmenü"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onReturnToHub();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onReturnToHub();
        }
      }}
    >
      <g transform={`translate(${atlasSize.cx - 31} 20) scale(0.98)`} opacity="0.88">
        <circle cx="32" cy="32" r="31" fill="#050505" opacity="0.001" />
        <CosmosGlyph />
      </g>
    </g>
  );
}

function CosmosGlyph() {
  return (
    <g className="cosmos-glyph" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="8.5" fill="#050505" stroke="#f7f7f4" strokeWidth="1.25" opacity="0.9" />
      <path d="M15.4 30.7c5.2-14.4 27.6-17.8 35.5-4.8 6.4 10.5-1.7 23.6-15.5 24.7-13.1 1-24.4-8.1-22.5-17.8" stroke="#f7f7f4" strokeWidth="1.65" />
      <path d="M21.2 36.8c4.8 7.8 18.6 8.5 25.1 1.6 5.9-6.3 2.5-15.4-6.5-17.3-8.3-1.8-16.5 2.5-18.6 8.6" stroke="#00e7ff" strokeWidth="1.2" opacity="0.86" />
      <path d="M19 20.4 32 32 45.2 43.8" stroke="#f5b342" strokeWidth="0.9" opacity="0.78" />
      <path d="M45.1 19.6 32 32 19.2 44.2" stroke="#ff4fd8" strokeWidth="0.85" opacity="0.72" />
      <circle cx="32" cy="32" r="2.1" fill="#f7f7f4" stroke="none" opacity="0.92" />
      <circle cx="19.2" cy="20.7" r="1.4" fill="#f5b342" stroke="none" />
      <circle cx="45.1" cy="19.8" r="1.35" fill="#00e7ff" stroke="none" />
      <circle cx="45.2" cy="43.8" r="1.25" fill="#ff4fd8" stroke="none" />
      <circle cx="18.9" cy="44.1" r="1.15" fill="#f7f7f4" stroke="none" />
    </g>
  );
}

function TimeReadout({ timePosition, currentYear }: { timePosition: number; currentYear: number }) {
  const focusEndYear = positionToYear(Math.min(wormholeTravelEnd, timePosition + 0.22));
  const span = dominantSpanForYear(currentYear);

  return (
    <g className="time-readout" pointerEvents="none" opacity="0.88">
      <line x1="42" y1="880" x2="172" y2="880" stroke="#f7f7f4" strokeWidth="0.6" opacity="0.5" />
      <text x="42" y="842" fill="#f7f7f4" fontSize="27" fontWeight="650" fontFamily="var(--font-sans), system-ui, sans-serif">
        {formatYear(currentYear)}
      </text>
      <text x="42" y="862" fill="#c7c7c2" fontSize="9.5" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.18em">
        {span.label.toUpperCase()}
      </text>
      <text x="42" y="898" fill="#9c9c96" fontSize="8.5" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.12em">
        {formatYear(Math.min(currentYear, focusEndYear))} - {formatYear(Math.max(currentYear, focusEndYear))}
      </text>
    </g>
  );
}

function VisualZoomReadout({ zoom }: { zoom: number }) {
  const opacity = Math.max(0, Math.min(0.74, (zoom - 1.02) * 1.35));
  if (opacity <= 0.01) return null;

  return (
    <g className="visual-zoom-readout" pointerEvents="none" opacity={opacity}>
      <line x1="804" y1="880" x2="934" y2="880" stroke="#00e7ff" strokeWidth="0.6" opacity="0.52" />
      <text x="934" y="848" textAnchor="end" fill="#f7f7f4" fontSize="19" fontWeight="560" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.03em">
        {Math.round(zoom * 100)}%
      </text>
      <text x="934" y="866" textAnchor="end" fill="#9cfff7" fontSize="8.4" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.18em">
        OPTISCHE LUPE
      </text>
      <text x="934" y="898" textAnchor="end" fill="#9c9c96" fontSize="7.6" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.12em">
        PINCH ZOOM / ZEIT BLEIBT STABIL
      </text>
    </g>
  );
}

function dominantSpanForYear(year: number) {
  if (year >= 1990) return { label: 'Gegenwart / Digitalisierung' };
  if (year >= 1950) return { label: 'Nachkriegsmoderne' };
  if (year >= 1900) return { label: 'Moderne' };
  if (year >= 1800) return { label: 'Industrialisierung' };
  if (year >= 1400) return { label: 'Frühmoderne' };
  if (year >= 500) return { label: 'Mittelalter / Stadt' };
  if (year >= -500) return { label: 'Antike' };
  if (year >= -3000) return { label: 'Frühe Hochkulturen' };
  return { label: 'Proto-Urban / Ursprung' };
}

function IntroGate({ state, onStart, onOpenKosmoAsset, onReturnToHub }: { state: IntroState; onStart: () => void; onOpenKosmoAsset: () => void; onReturnToHub: () => void }) {
  const lastTouchStartRef = useRef(0);

  function startFromTouch(event: ReactTouchEvent<HTMLElement>) {
    lastTouchStartRef.current = Date.now();
    event.preventDefault();
    event.stopPropagation();
    onStart();
  }

  function startFromClick() {
    if (Date.now() - lastTouchStartRef.current < 500) return;
    onStart();
  }

  if (state === 'hub') {
    return (
      <section
        className="intro-gate intro-gate-hub absolute inset-0 z-30 flex items-center justify-center bg-[#050505]/10 text-center"
        aria-label="Architecture Cosmos Hauptmenü"
      >
        <OrbitMenuBackdrop mode="hub" />
        <ModuleHub onOpenKosmoData={onStart} onOpenKosmoAsset={onOpenKosmoAsset} />
      </section>
    );
  }

  if (state === 'asset') {
    return (
      <section
        className="intro-gate intro-gate-asset absolute inset-0 z-30 flex items-center justify-center bg-[#050505]/10 text-left"
        aria-label="KosmoAsset"
      >
        <OrbitMenuBackdrop mode="hub" />
        <KosmoAssetWorkspace onReturnToHub={onReturnToHub} />
      </section>
    );
  }

  if (state === 'launching') {
    return (
      <div className="intro-gate intro-gate-launching absolute inset-0 z-30 flex items-center justify-center bg-[#050505]/10 text-center" aria-hidden="true">
        <span className="intro-title-lockup block">
          <svg className="intro-cosmos-mark mx-auto mb-7 block h-[clamp(5.4rem,13vw,11rem)] w-[clamp(5.4rem,13vw,11rem)]" viewBox="0 0 64 64" aria-hidden="true">
            <CosmosGlyph />
          </svg>
          <IntroTitle />
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="intro-gate absolute inset-0 z-30 flex items-center justify-center bg-[#050505]/10 text-center"
      onTouchStart={startFromTouch}
      onClick={startFromClick}
      onWheel={(event) => {
        event.preventDefault();
        onStart();
      }}
      aria-label="Start Architektur Kosmos"
    >
      <OrbitMenuBackdrop mode="intro" />
      <span className="intro-title-lockup block">
        <svg className="intro-cosmos-mark mx-auto mb-7 block h-[clamp(5.4rem,13vw,11rem)] w-[clamp(5.4rem,13vw,11rem)]" viewBox="0 0 64 64" aria-hidden="true">
          <CosmosGlyph />
        </svg>
        <IntroTitle />
      </span>
    </button>
  );
}

function IntroTitle() {
  return (
    <span className="intro-title-main block uppercase" aria-hidden="true">
      <span className="intro-title-architecture block">architektur</span>
      <span className="intro-title-kosmos block">kosmos</span>
    </span>
  );
}

function OrbitMenuBackdrop({ mode }: { mode: 'intro' | 'hub' }) {
  const stars = Array.from({ length: 26 }, (_, index) => index);

  return (
    <span className={`orbit-menu-backdrop orbit-menu-backdrop-${mode}`} aria-hidden="true">
      <span className="orbit-menu-nebula" />
      <span className="orbit-menu-grid orbit-menu-grid-a" />
      <span className="orbit-menu-grid orbit-menu-grid-b" />
      <span className="orbit-menu-axis orbit-menu-axis-a" />
      <span className="orbit-menu-axis orbit-menu-axis-b" />
      <span className="orbit-menu-stars">
        {stars.map((star) => {
          const angleA = star * 137.5;
          const angleB = star * 97.3;
          const left = 50 + Math.cos((angleA * Math.PI) / 180) * (18 + (star % 5) * 6.2);
          const top = 50 + Math.sin((angleB * Math.PI) / 180) * (16 + (star % 7) * 4.4);

          return (
            <i
              key={star}
              style={{
                '--star-index': star,
                '--star-left': `${Math.max(5, Math.min(95, left))}%`,
                '--star-top': `${Math.max(6, Math.min(94, top))}%`,
                '--star-opacity': 0.28 + (star % 5) * 0.1
              } as CSSProperties}
            />
          );
        })}
      </span>
    </span>
  );
}

function ModuleHub({ onOpenKosmoData, onOpenKosmoAsset }: { onOpenKosmoData: () => void; onOpenKosmoAsset: () => void }) {
  const lastTouchActionRef = useRef(0);
  const [selectedModuleId, setSelectedModuleId] = useState<KosmoModuleId | null>(null);
  const modules: Array<KosmoOrbitModule & { onClick?: () => void }> = kosmoOrbitModules.map((module) => (
    module.id === 'data' ? { ...module, onClick: onOpenKosmoData } : module.id === 'asset' ? { ...module, onClick: onOpenKosmoAsset } : module
  ));
  const selectedModule = modules.find((module) => module.id === selectedModuleId) || null;

  return (
    <div
      className="module-hub cosmos-text-safe"
      tabIndex={-1}
      onClick={() => setSelectedModuleId(null)}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' && event.key !== 'Backspace') return;
        event.preventDefault();
        setSelectedModuleId(null);
      }}
    >
      <div className="module-hub-orbit module-hub-orbit-a" />
      <div className="module-hub-orbit module-hub-orbit-b" />
      <div className="module-hub-core">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <CosmosGlyph />
        </svg>
      </div>
      {modules.map((module) => {
        const isReady = module.status === 'bereit';
        return (
          <button
            key={module.id}
            type="button"
            className={`module-station ${isReady ? 'module-station-ready' : 'module-station-planned'} ${selectedModuleId === module.id ? 'module-station-selected' : ''}`}
            style={{ '--station-x': `${module.x}px`, '--station-y': `${module.y}px`, '--station-x-mobile': `${module.xMobile}px`, '--station-y-mobile': `${module.yMobile}px`, '--station-accent': module.accent } as CSSProperties}
            aria-pressed={selectedModuleId === module.id}
            onTouchStart={(event) => {
              lastTouchActionRef.current = Date.now();
              event.preventDefault();
              event.stopPropagation();
              if (isReady) module.onClick?.();
              else setSelectedModuleId(module.id);
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (Date.now() - lastTouchActionRef.current < 500) return;
              if (isReady) module.onClick?.();
              else setSelectedModuleId((current) => (current === module.id ? null : module.id));
            }}
            aria-label={isReady ? `${module.name} öffnen` : `${module.name} Vorschau öffnen`}
          >
            <small>{module.status}</small>
            <strong>{module.name}</strong>
            <span>{module.label}</span>
            <em>{module.description}</em>
          </button>
        );
      })}
      {selectedModule ? (
        <aside
          className="module-hub-preview"
          style={{ '--station-accent': selectedModule.accent } as CSSProperties}
          role="dialog"
          aria-label={`${selectedModule.name} Modulvorschau`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <small>{selectedModule.status}</small>
          <strong>{selectedModule.name}</strong>
          <span>{selectedModule.label}</span>
          <p>{selectedModule.description}</p>
          <div className="module-hub-preview-gate" data-ready={selectedModule.status === 'bereit' ? 'true' : 'false'}>
            <span>
              <small>Zugang</small>
              <strong>{selectedModule.status === 'bereit' ? 'freigeschaltet' : 'geplant'}</strong>
            </span>
            <span>
              <small>Nächster Schritt</small>
              <strong>{selectedModule.status === 'bereit' ? 'öffnen' : 'Roadmap prüfen'}</strong>
            </span>
          </div>
          <div className="module-hub-preview-metrics" aria-label={`${selectedModule.name} Statuswerte`}>
            {selectedModule.metrics.map((metric) => (
              <span key={`${metric.label}-${metric.value}`}>
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
              </span>
            ))}
          </div>
          <ul>
            {selectedModule.detail.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setSelectedModuleId(null)}>
            Vorschau schließen
          </button>
        </aside>
      ) : null}
    </div>
  );
}

function KosmoAssetWorkspace({ onReturnToHub }: { onReturnToHub: () => void }) {
  const [activeFamily, setActiveFamily] = useState<AssetFamilyFilter>('all');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(assetLibraryPreview.assets[0]?.id ?? null);
  const assets = assetLibraryPreview.assets;
  const assetFamilies = [
    { id: 'all', label: 'Alle', description: 'Gesamte Prüfbibliothek' },
    { id: '2d', label: '2D', description: 'Planzeichen, Vektoren, DXF' },
    { id: 'material', label: 'Material', description: 'Texturen und Materiallayer' },
    { id: '3d', label: '3D', description: 'GLB, Blender, ArchiCAD' }
  ] satisfies Array<{ id: AssetFamilyFilter; label: string; description: string }>;
  const filteredAssets = activeFamily === 'all' ? assets : assets.filter((asset) => assetFamily(asset) === activeFamily);
  const selectedAsset = filteredAssets.find((asset) => asset.id === selectedAssetId) ?? filteredAssets[0] ?? assets[0];
  const formats = [...new Set(assets.flatMap((asset) => asset.formats.map((format) => format.format)))];
  const exportTargets = [...new Set(assets.flatMap((asset) => asset.export_targets))];
  const existingFormats = assets.reduce((total, asset) => total + asset.formats.filter((format) => format.status === 'exists').length, 0);
  const plannedFormats = assets.reduce((total, asset) => total + asset.formats.filter((format) => format.status === 'planned').length, 0);
  const reviewSummary = assetReviewPackPreview.summary;

  return (
    <div className="kosmo-asset-workspace cosmos-text-safe">
      <div className="kosmo-asset-shell">
        <header className="kosmo-asset-header">
          <button type="button" className="kosmo-asset-back" onClick={onReturnToHub} aria-label="Zurück zum Hauptmenü">
            Zurück
          </button>
          <div>
            <small>Orbit-Station / Prüfbibliothek</small>
            <h2>KosmoAsset</h2>
            <p>Werkstatt-Orbit für wiederverwendbare 2D-, 3D-, Material- und Exportressourcen. V1 bleibt lokal, nur in Prüfung und ohne Upload.</p>
          </div>
          <div className="kosmo-asset-status">
            <span>{formatAssetValue(assetLibraryPreview.rights_scope)}</span>
            <strong>{assets.length} Ressourcen</strong>
          </div>
        </header>

        <section className="kosmo-asset-lab" aria-label="KosmoAsset Bibliotheksvorschau">
          <div className="kosmo-asset-core" aria-label="KosmoAsset Asset-Orbits">
            <span className="kosmo-asset-core-ring kosmo-asset-core-ring-a" />
            <span className="kosmo-asset-core-ring kosmo-asset-core-ring-b" />
            <span className="kosmo-asset-core-glyph">
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <CosmosGlyph />
              </svg>
            </span>
            {assets.map((asset, index) => (
              <button
                key={asset.id}
                type="button"
                className={`kosmo-asset-orbit-dot kosmo-asset-orbit-dot-${index + 1}${selectedAsset?.id === asset.id ? ' is-selected' : ''}`}
                style={{ '--asset-accent': assetAccent(asset) } as CSSProperties}
                onClick={() => {
                  setActiveFamily(assetFamily(asset));
                  setSelectedAssetId(asset.id);
                }}
                aria-label={`${asset.title} auswählen`}
                title={asset.title}
              />
            ))}
          </div>

          <div className="kosmo-asset-dashboard">
            <div className="kosmo-asset-metrics" aria-label="KosmoAsset Kennzahlen">
              <MetricBlock label="Vorhanden" value={String(existingFormats)} />
              <MetricBlock label="Geplant" value={String(plannedFormats)} />
              <MetricBlock label="Lokal bereit" value={String(reviewSummary.local_ready_count)} />
              <MetricBlock label="Public bereit" value={String(reviewSummary.public_ready_count)} />
              <MetricBlock label="Prüfung offen" value={String(reviewSummary.open_human_review_count)} />
              <MetricBlock label="Exportziele" value={String(exportTargets.length)} />
            </div>

            <div className="kosmo-asset-mode-strip" data-public-ready={reviewSummary.public_assets_allowed ? 'true' : 'false'}>
              <span>
                <small>Modus</small>
                <strong>{reviewSummary.upload_allowed ? 'Upload möglich' : 'Review-only lokal'}</strong>
              </span>
              <span>
                <small>Public Assets</small>
                <strong>{reviewSummary.public_assets_allowed ? 'freigegeben' : 'gesperrt'}</strong>
              </span>
              <p>{formatAssetValue(reviewSummary.recommended_next_step)}</p>
            </div>

            <div className="kosmo-asset-categories" aria-label="Asset Kategorien">
              {assetFamilies.map((family) => (
                <button
                  key={family.id}
                  type="button"
                  className={activeFamily === family.id ? 'is-active' : undefined}
                  onClick={() => {
                    setActiveFamily(family.id);
                    const nextAsset = family.id === 'all' ? assets[0] : assets.find((asset) => assetFamily(asset) === family.id);
                    setSelectedAssetId(nextAsset?.id ?? null);
                  }}
                  aria-pressed={activeFamily === family.id}
                  title={family.description}
                >
                  <span>{family.label}</span>
                  <small>{family.description}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="kosmo-asset-library" aria-label="Demo-Assets">
          <div className="kosmo-asset-grid">
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} isSelected={selectedAsset?.id === asset.id} onSelect={() => setSelectedAssetId(asset.id)} />
            ))}
          </div>
          {selectedAsset ? <AssetInspector asset={selectedAsset} /> : null}
        </section>
      </div>
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function AssetCard({ asset, isSelected, onSelect }: { asset: AssetPreviewRecord; isSelected: boolean; onSelect: () => void }) {
  const accent = assetAccent(asset);
  const rightsTone = asset.rights_status === 'own_work' || asset.rights_status === 'public_domain' || asset.rights_status === 'licensed' ? 'ready' : 'review';
  const handoffBundle = assetHandoffBundle(asset.id);
  const cardSummary = assetReviewSummary({
    asset,
    reviewPack: assetReviewPack(asset.id),
    decisionLedger: assetDecisionLedger(asset.id),
    handoffSmoke: handoffBundle ? assetHandoffSmokePreview : null
  });

  return (
    <button
      type="button"
      className={`kosmo-asset-card${isSelected ? ' is-selected' : ''}`}
      style={{ '--asset-accent': accent } as CSSProperties}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className={`kosmo-asset-visual kosmo-asset-visual-${assetVisualKind(asset)}`} aria-hidden="true">
        <AssetPreviewGraphic asset={asset} />
        <span className="kosmo-asset-card-gate" data-tone={cardSummary.tone}>
          {cardSummary.publicGate === 'gesperrt' ? 'Public gesperrt' : 'Public offen?'}
        </span>
      </div>
      <div className="kosmo-asset-card-body">
        <small>{formatAssetValue(asset.asset_type)} / {formatAssetValue(asset.category)}</small>
        <h3>{asset.title}</h3>
        <p>{formatAssetText(asset.description)}</p>
        <span className="kosmo-asset-card-status" data-tone={cardSummary.tone}>{cardSummary.status}</span>
      </div>
      <div className="kosmo-asset-card-tags" aria-label={`${asset.title} Exportziele`}>
        {asset.export_targets.slice(0, 5).map((target) => (
          <span key={target}>{target}</span>
        ))}
      </div>
      <div className="kosmo-asset-card-footer">
        <span className={`kosmo-asset-rights kosmo-asset-rights-${rightsTone}`}>{formatAssetValue(asset.rights_status)}</span>
        <span>{asset.formats.map((format) => format.format).join(' / ')}</span>
      </div>
    </button>
  );
}

function AssetInspector({ asset }: { asset: AssetPreviewRecord }) {
  const accent = assetAccent(asset);
  const confidence = Math.round(asset.confidence * 100);
  const exportPlan = assetExportPlan(asset.id);
  const exchangeProfile = assetExchangeProfile(asset.id);
  const handoffBundle = assetHandoffBundle(asset.id);
  const handoffSmoke = handoffBundle ? assetHandoffSmokePreview : null;
  const reviewPack = assetReviewPack(asset.id);
  const humanReviewSession = assetHumanReviewSession(asset.id);
  const decisionLedger = assetDecisionLedger(asset.id);
  const generatedProfiles = assetGeneratedProfiles(asset);
  const generatedProfile = generatedProfiles[0] ?? null;
  const secondaryGeneratedProfiles = generatedProfiles.slice(1);
  const kosmodataRefs = assetKosmoDataRefs(asset);
  const generatedLayerLabel = generatedProfile ? generatedProfileLabel(generatedProfile) : 'Layer';
  const generatedMetric = generatedProfile ? generatedProfileMetric(generatedProfile) : null;
  const localFormats = asset.formats
    .map((format) => ({ ...format, path: 'path' in format ? format.path : undefined }))
    .filter((format) => format.status === 'exists' && format.path);
  const reviewActions = useMemo(() => assetReviewActions(asset), [asset]);
  const gateSignals = assetGateSignals({ asset, reviewPack, decisionLedger, handoffSmoke });
  const reviewSummary = assetReviewSummary({ asset, reviewPack, decisionLedger, handoffSmoke });
  const [activeActionId, setActiveActionId] = useState(reviewActions[0]?.id ?? 'library-check');
  const activeAction = reviewActions.find((action) => action.id === activeActionId) ?? reviewActions[0];

  useEffect(() => {
    setActiveActionId(reviewActions[0]?.id ?? 'library-check');
  }, [asset.id, reviewActions]);

  return (
    <aside className="kosmo-asset-inspector" style={{ '--asset-accent': accent } as CSSProperties} aria-label={`${asset.title} Inspektor`}>
      <div className="kosmo-asset-inspector-head">
        <small>Asset-Inspektor</small>
        <h3>{asset.title}</h3>
        <p>{formatAssetText(asset.description)}</p>
      </div>

      <div className="kosmo-asset-review-banner" data-tone={reviewSummary.tone}>
        <span>
          <small>Status</small>
          <strong>{reviewSummary.status}</strong>
        </span>
        <span>
          <small>Public Gate</small>
          <strong>{reviewSummary.publicGate}</strong>
        </span>
        <p>{reviewSummary.message}</p>
      </div>

      <div className={`kosmo-asset-inspector-preview${generatedProfile ? ' kosmo-asset-inspector-preview-generated' : ''}`} aria-hidden="true">
        {generatedProfile ? <GeneratedAssetPreview asset={asset} profile={generatedProfile} /> : <AssetPreviewGraphic asset={asset} />}
      </div>

      <div className="kosmo-asset-inspector-gates" aria-label="Rechte und Prüfung">
        <MetricBlock label="Rechte" value={formatAssetValue(asset.rights_status)} />
        <MetricBlock label="Prüfung" value={formatAssetValue(asset.review_status)} />
        <MetricBlock label="Sicherheit" value={`${confidence}%`} />
      </div>

      <div className="kosmo-asset-inspector-section kosmo-asset-gate-card" aria-label={`${asset.title} Asset-Ampel`}>
        <strong>Asset-Ampel</strong>
        <div className="kosmo-asset-gate-grid">
          {gateSignals.map((signal) => (
            <span key={`${asset.id}-${signal.id}`} data-tone={signal.tone}>
              <i aria-hidden="true" />
              <small>{signal.label}</small>
              <b>{signal.value}</b>
              <em>{signal.detail}</em>
            </span>
          ))}
        </div>
      </div>

      <AssetLocalProofSummary asset={asset} decisionLedger={decisionLedger} handoffSmoke={handoffSmoke} />

      <div className="kosmo-asset-inspector-section">
        <strong>Formate</strong>
        <ul>
          {asset.formats.map((format) => (
            <li key={`${asset.id}-${format.format}`}>
              <span>{format.format}</span>
              <small>{format.status === 'exists' ? 'vorhanden' : 'geplant'}</small>
            </li>
          ))}
        </ul>
      </div>

      {localFormats.length ? (
        <div className="kosmo-asset-inspector-section kosmo-asset-local-export">
          <strong>Lokaler Export</strong>
          {localFormats.map((format) => (
            <code key={`${asset.id}-${format.format}-${format.path}`}>{format.path}</code>
          ))}
          <p>Nur lokale Prüfung: keine R2-Uploads, keine öffentlichen Downloads, keine Datenbank-Schreibvorgänge.</p>
        </div>
      ) : null}

      {generatedProfile ? (
        <div className="kosmo-asset-inspector-section kosmo-asset-layer-preview">
          <strong>{generatedLayerLabel}</strong>
          <div className="kosmo-asset-layer-stack" aria-label={`${asset.title} ${generatedLayerLabel}`}>
            {generatedProfile.layer_names.map((layer, index) => (
              <span key={`${asset.id}-${layer}`} style={{ '--layer-index': index } as CSSProperties}>
                <i />
                <b>{layer}</b>
              </span>
            ))}
          </div>
          <p>{generatedMetric ? `${generatedMetric} · ` : ''}{formatAssetValue(generatedProfile.status)}</p>
        </div>
      ) : null}

      {secondaryGeneratedProfiles.length ? (
        <div className="kosmo-asset-inspector-section kosmo-asset-profile-list">
          <strong>Weitere Profile</strong>
          {secondaryGeneratedProfiles.map((profile) => (
            <span key={`${asset.id}-${profile.generator}-${profile.status}`}>
              <b>{generatedProfileLabel(profile)}</b>
              <small>{generatedProfileMetric(profile) ?? formatAssetValue(profile.status)}</small>
            </span>
          ))}
        </div>
      ) : null}

      <div className="kosmo-asset-inspector-section">
        <strong>Exportziele</strong>
        <div className="kosmo-asset-inspector-tags">
          {asset.export_targets.map((target) => (
            <span key={`${asset.id}-${target}`}>{target}</span>
          ))}
        </div>
      </div>

      {kosmodataRefs.length ? (
        <div className="kosmo-asset-inspector-section kosmo-asset-kosmodata-card">
          <strong>KosmoData-Brücke</strong>
          <div className="kosmo-asset-kosmodata-grid">
            {kosmodataRefs.map((ref) => (
              <span key={`${asset.id}-${ref.entry_id}-${ref.relation}`}>
                <small>{formatAssetValue(ref.relation ?? ref.kind ?? 'reference')}</small>
                <b>{ref.entry_id ?? 'Referenz'}</b>
                <em>{formatAssetValue(ref.usage_policy ?? 'context_only')} / {formatAssetValue(ref.review_status ?? 'review')}</em>
              </span>
            ))}
          </div>
          <p>Projektwissen darf die Sprache und Taxonomie des Assets stuetzen. Die Asset-Freigabe bleibt trotzdem ein eigener Review-, Rechte- und Public-Gate-Prozess.</p>
        </div>
      ) : null}

      {exportPlan ? (
        <div className="kosmo-asset-inspector-section kosmo-asset-route-plan">
          <strong>Export-Routen</strong>
          <div className="kosmo-asset-route-grid">
            {exportPlan.routes.map((route) => (
              <span key={`${asset.id}-${route.target}`} data-status={route.status}>
                <b>{route.target}</b>
                <small>{formatAssetValue(route.status)}</small>
              </span>
            ))}
          </div>
          <p>{formatAssetText(exportPlan.next_step)}</p>
        </div>
      ) : null}

      {reviewPack ? (
        <div className="kosmo-asset-inspector-section kosmo-asset-decision-card">
          <strong>Entscheidkarte</strong>
          <div className="kosmo-asset-decision-status">
            <span data-status={reviewPack.human_review_status}>
              <small>Menschliche Prüfung</small>
              <b>{formatAssetValue(reviewPack.human_review_status)}</b>
            </span>
            <span data-status={reviewPack.public_ready ? 'ready' : 'private'}>
              <small>Öffentlichkeits-Gate</small>
              <b>{reviewPack.public_ready ? 'bereit' : 'gesperrt'}</b>
            </span>
            <span data-status={reviewPack.local_ready ? 'ready' : 'missing'}>
              <small>Lokal</small>
              <b>{reviewPack.local_ready ? 'bereit' : 'fehlt'}</b>
            </span>
          </div>
          <div className="kosmo-asset-decision-checklist">
            {reviewPack.checklist.map((item) => (
              <span key={`${asset.id}-${item.id}`} data-status={item.status}>
                <i />
                <b>{assetChecklistLabel(item.id, item.label)}</b>
              </span>
            ))}
          </div>
          <p>Vorschlag: {formatAssetValue(reviewPack.suggested_decision)}</p>
        </div>
      ) : null}

      {humanReviewSession ? (
        <div className="kosmo-asset-inspector-section kosmo-asset-human-session-card">
          <strong>Menschliche Prüfsession</strong>
          <div className="kosmo-asset-human-session-grid">
            <span data-status={humanReviewSession.review_priority}>
              <small>Priorität</small>
              <b>{formatAssetValue(humanReviewSession.review_priority)}</b>
            </span>
            <span data-status={humanReviewSession.human_review_status}>
              <small>Status</small>
              <b>{formatAssetValue(humanReviewSession.human_review_status)}</b>
            </span>
            <span data-status={humanReviewSession.machine_evidence.handoff_smoke_passed ? 'ready' : 'blocked'}>
              <small>Smoke-Test</small>
              <b>{humanReviewSession.machine_evidence.handoff_smoke_passed ? 'bestanden' : 'offen'}</b>
            </span>
          </div>
          <div className="kosmo-asset-human-session-checks">
            {humanReviewSession.human_session.checklist.slice(0, 4).map((item) => (
              <span key={`${asset.id}-${item.id}`} data-status={item.status}>
                <i />
                <b>{assetHumanSessionCheckLabel(item.id, item.label)}</b>
              </span>
            ))}
          </div>
          <code>{humanReviewSession.commands.record_needs_review}</code>
        </div>
      ) : null}

      {decisionLedger ? (
        <div className="kosmo-asset-inspector-section kosmo-asset-ledger-card">
          <strong>Entscheidungsbuch</strong>
          <div className="kosmo-asset-ledger-grid">
            <span data-status={decisionLedger.ledger_status}>
              <small>Status</small>
              <b>{formatAssetValue(decisionLedger.ledger_status)}</b>
            </span>
            <span data-status={decisionLedger.latest_decision ? 'recorded' : 'missing'}>
              <small>Entscheid</small>
              <b>{decisionLedger.latest_decision?.decision ? formatAssetValue(decisionLedger.latest_decision.decision) : 'fehlt'}</b>
            </span>
            <span data-status={decisionLedger.sandbox_ready ? 'ready' : 'blocked'}>
              <small>Sandbox</small>
              <b>{decisionLedger.sandbox_ready ? 'bereit' : 'gesperrt'}</b>
            </span>
          </div>
          <code>{decisionLedger.expected_command}</code>
        </div>
      ) : null}

      {exchangeProfile ? (
        <div className="kosmo-asset-inspector-section kosmo-asset-exchange-card">
          <strong>Übergabeprofil</strong>
          <div className="kosmo-asset-exchange-grid">
            <span data-enabled={exchangeProfile.blender ? 'true' : 'false'}>
              <small>Blender</small>
              <b>{exchangeProfile.blender?.import_mode ? formatAssetValue(exchangeProfile.blender.import_mode) : 'nicht aktiv'}</b>
            </span>
            <span data-enabled={exchangeProfile.archicad ? 'true' : 'false'}>
              <small>ArchiCAD</small>
              <b>{exchangeProfile.archicad?.exchange_mode ? formatAssetValue(exchangeProfile.archicad.exchange_mode) : 'nicht aktiv'}</b>
            </span>
            <span data-enabled={exchangeProfile.web ? 'true' : 'false'}>
              <small>Web</small>
              <b>{exchangeProfile.web?.public_gate ? formatAssetValue(exchangeProfile.web.public_gate) : 'nicht aktiv'}</b>
            </span>
          </div>
          <div className="kosmo-asset-exchange-paths">
            {exchangeProfile.blender?.collection_name ? <code>{exchangeProfile.blender.collection_name}</code> : null}
            {exchangeProfile.archicad?.archicad_layer ? <code>{exchangeProfile.archicad.archicad_layer}</code> : null}
            {exchangeProfile.archicad?.archicad_surface ? <code>{exchangeProfile.archicad.archicad_surface}</code> : null}
          </div>
          <p>{formatAssetText(exchangeProfile.review_note)}</p>
        </div>
      ) : null}

      {handoffBundle ? (
        <div className="kosmo-asset-inspector-section kosmo-asset-handoff-card">
          <strong>Übergabepaket</strong>
          <div className="kosmo-asset-handoff-grid">
            <span data-enabled={handoffBundle.blender ? 'true' : 'false'}>
              <small>Blender Python</small>
              <b>{handoffBundle.blender?.import_mode ? formatAssetValue(handoffBundle.blender.import_mode) : 'nicht aktiv'}</b>
            </span>
            <span data-enabled={handoffBundle.archicad ? 'true' : 'false'}>
              <small>ArchiCAD CSV</small>
              <b>{handoffBundle.archicad?.exchange_mode ? formatAssetValue(handoffBundle.archicad.exchange_mode) : 'nicht aktiv'}</b>
            </span>
            <span data-enabled={handoffBundle.public_gate === 'blocked' ? 'false' : 'true'}>
              <small>Öffentlichkeits-Gate</small>
              <b>{formatAssetValue(handoffBundle.public_gate)}</b>
            </span>
          </div>
          <div className="kosmo-asset-handoff-files">
            {handoffBundle.blender ? <code>{assetHandoffBundlePreview.outputs.blender_python}</code> : null}
            {handoffBundle.archicad ? <code>{assetHandoffBundlePreview.outputs.archicad_schedule_csv}</code> : null}
          </div>
          <p>Nur lokale Prüfung: Blender schreibt standardmäßig nicht in die Szene; ArchiCAD nutzt den CSV nur als Namens- und Layerliste.</p>
        </div>
      ) : null}

      {handoffSmoke ? (
        <div className="kosmo-asset-inspector-section kosmo-asset-smoke-card">
          <strong>Smoke-Test</strong>
          <div className="kosmo-asset-handoff-grid">
            <span data-enabled={handoffSmoke.summary.failure_count === 0 ? 'true' : 'false'}>
              <small>Checks</small>
              <b>{handoffSmoke.summary.passed_checks}/{handoffSmoke.summary.check_count}</b>
            </span>
            <span data-enabled={handoffSmoke.python_runtime.ok ? 'true' : 'false'}>
              <small>Blender Python</small>
              <b>{handoffSmoke.python_runtime.ok ? 'läuft' : 'Fehler'}</b>
            </span>
            <span data-enabled={handoffSmoke.policy.no_project_file_writes ? 'false' : 'true'}>
              <small>Szenenänderung</small>
              <b>{handoffSmoke.policy.no_project_file_writes ? 'gesperrt' : 'aktiv'}</b>
            </span>
          </div>
          <p>{formatAssetText(handoffSmoke.next_actions[0])}</p>
        </div>
      ) : null}

      <AssetReviewWorkflow asset={asset} reviewPack={reviewPack} handoffBundle={handoffBundle} handoffSmoke={handoffSmoke} />

      <div className="kosmo-asset-inspector-section kosmo-asset-review-actions">
        <strong>Prüfaktionen</strong>
        <p>Lokale Brain-Befehle für Prüfung und Export. Sie erzeugen Prüfdateien, aber keine Cloud-Uploads.</p>
        <div className="kosmo-asset-review-action-grid">
          {reviewActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={activeAction?.id === action.id ? 'is-active' : undefined}
              onClick={() => setActiveActionId(action.id)}
            >
              <small>{action.kicker}</small>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
        {activeAction ? (
          <div className="kosmo-asset-review-command">
            <b>{activeAction.description}</b>
            <code>{activeAction.command}</code>
          </div>
        ) : null}
      </div>

      <div className="kosmo-asset-inspector-section">
        <strong>Quellenbasis</strong>
        <p>{asset.source_basis[0] ? formatAssetText(asset.source_basis[0]) : 'Noch keine Quellenbasis hinterlegt.'}</p>
      </div>
    </aside>
  );
}

function AssetLocalProofSummary({
  asset,
  decisionLedger,
  handoffSmoke
}: {
  asset: AssetPreviewRecord;
  decisionLedger: AssetDecisionLedgerRecord | null;
  handoffSmoke: typeof assetHandoffSmokePreview | null;
}) {
  const blenderRun = assetBlenderSandboxRun(asset.id);
  const decision = decisionLedger?.latest_decision ?? null;
  const certificate = decisionLedger?.latest_certificate ?? null;
  const smokePassed = handoffSmoke?.summary.failure_count === 0;
  const isApproved = decisionLedger?.human_decision_state === 'approved';
  const isCertified = decisionLedger?.certificate_ready === true;
  const blenderPassed = blenderRun?.status === 'blender_background_sandbox_passed';

  if (!isApproved && !isCertified && !blenderPassed) return null;

  const reviewer = decision?.reviewer ?? decisionLedger?.reviewer ?? 'nicht benannt';
  const route = decision?.route ?? decisionLedger?.route ?? 'lokal';
  const publicGateBlocked = decisionLedger?.public_gate === 'blocked' || certificate?.public_gate === 'blocked' || asset.public_use_allowed === false;
  const proofStatus = isCertified && blenderPassed
    ? 'lokal zertifiziert + Blender geprüft'
    : isCertified
      ? 'lokal zertifiziert'
      : 'lokale Review-Evidenz';
  const proofDate = formatProofDate(certificate?.generated_at ?? decision?.generated_at);

  return (
    <div className="kosmo-asset-inspector-section kosmo-asset-proof-card" aria-label={`${asset.title} lokaler Qualitätsnachweis`}>
      <div className="kosmo-asset-proof-head">
        <small>Lokaler Qualitätsnachweis</small>
        <strong>{proofStatus}</strong>
        <p>Dieses Asset ist für lokale Sandbox-Arbeit nachvollziehbar geprüft. Das Öffentlichkeits-Gate bleibt geschlossen: keine R2-Uploads, keine Downloads und keine Datenbank-Schreibvorgänge.</p>
      </div>
      <div className="kosmo-asset-proof-grid">
        <span data-tone={isApproved ? 'ready' : 'review'}>
          <small>Mensch</small>
          <b>{reviewer}</b>
          <em>{decision ? `${formatAssetValue(decision.decision)} / ${formatAssetValue(route)}` : 'Entscheid fehlt'}</em>
        </span>
        <span data-tone={isCertified ? 'ready' : 'review'}>
          <small>Zertifikat</small>
          <b>{isCertified ? 'gültig lokal' : 'offen'}</b>
          <em>{certificate ? `${formatAssetValue(certificate.status)} / ${certificate.failed_checks ?? 0} Fehler` : 'Noch kein Zertifikat'}</em>
        </span>
        <span data-tone={blenderPassed ? 'ready' : smokePassed ? 'review' : 'blocked'}>
          <small>Blender</small>
          <b>{blenderPassed ? `Run ${blenderRun?.blender_version ?? 'bestanden'}` : smokePassed ? 'Smoke grün' : 'offen'}</b>
          <em>{blenderPassed ? `${blenderRun?.anchor_count ?? 0} Review-Anker im Sandbox-Lauf` : 'Noch kein echter Blender-Background-Run'}</em>
        </span>
        <span data-tone={publicGateBlocked ? 'local' : 'blocked'}>
          <small>Öffentlich</small>
          <b>{publicGateBlocked ? 'gesperrt' : 'prüfen'}</b>
          <em>{publicGateBlocked ? 'nur lokal/review-only, keine öffentliche Freigabe' : 'Public-Gate separat entscheiden'}</em>
        </span>
      </div>
      {blenderRun ? (
        <div className="kosmo-asset-proof-details">
          <span>
            <small>Material</small>
            <b>{blenderRun.material.exists ? blenderRun.material.name : 'nicht erstellt'}</b>
          </span>
          <span>
            <small>Collection</small>
            <b>{assetBlenderCollectionExists(blenderRun.collections, `KOSMO_SANDBOX/${asset.id}`) ? `KOSMO_SANDBOX/${asset.id}` : 'nicht gefunden'}</b>
          </span>
          <span>
            <small>Datum</small>
            <b>{proofDate}</b>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function AssetReviewWorkflow({
  asset,
  reviewPack,
  handoffBundle,
  handoffSmoke
}: {
  asset: AssetPreviewRecord;
  reviewPack: AssetReviewPackRecord | null;
  handoffBundle: AssetHandoffBundleRecord | null;
  handoffSmoke: typeof assetHandoffSmokePreview | null;
}) {
  const smokePassed = handoffSmoke?.summary.failure_count === 0;
  const reviewOpen = reviewPack?.human_review_status === 'open';
  const availableRoutes = assetDecisionRoutes(asset, handoffBundle);
  const commands = availableRoutes.map((route) => ({
    route,
    command: `npm run kosmo:asset-review-decision -- --library ${assetLibraryPath()} --asset ${asset.id} --route ${route} --decision approve-local --confirm-human-review --reviewer "REPLACE_WITH_REVIEWER_NAME"`
  }));
  const steps = [
    {
      label: '1 Auswahl',
      status: 'bereit',
      tone: 'ready',
      text: `${asset.title} ist als Prüf-Asset gewählt.`
    },
    {
      label: '2 Prüfung lesen',
      status: reviewOpen ? 'offen' : 'geschlossen',
      tone: reviewOpen ? 'review' : 'ready',
      text: reviewPack?.suggested_decision ? `Vorschlag: ${formatAssetValue(reviewPack.suggested_decision)}` : 'Prüfpaket fehlt noch.'
    },
    {
      label: '3 Smoke',
      status: smokePassed ? `${handoffSmoke.summary.passed_checks}/${handoffSmoke.summary.check_count}` : 'blockiert',
      tone: smokePassed ? 'ready' : 'blocked',
      text: smokePassed ? 'Blender/ArchiCAD-Übergabe ist lokal geprüft.' : 'Vor Freigabe zuerst Übergabe-Smoke ausführen.'
    },
    {
      label: '4 Manuelle Freigabe',
      status: smokePassed ? 'lokal möglich' : 'gesperrt',
      tone: smokePassed ? 'review' : 'blocked',
      text: smokePassed ? 'Freigabe schreibt nur lokale Evidenz, keine Assets und keine Öffentlichkeits-Gates.' : 'Ohne Smoke-Test keine lokale Freigabe.'
    }
  ];

  return (
    <div className="kosmo-asset-inspector-section kosmo-asset-workflow-card">
      <strong>Prüfworkflow</strong>
      <div className="kosmo-asset-workflow-steps">
        {steps.map((step) => (
          <span key={step.label} data-tone={step.tone}>
            <small>{step.label}</small>
            <b>{step.status}</b>
            <em>{step.text}</em>
          </span>
        ))}
      </div>
      <div className="kosmo-asset-approval-commands">
        <small>Lokale Freigabe-Befehle</small>
        {commands.map((item) => (
          <code key={`${asset.id}-${item.route}`}>{item.command}</code>
        ))}
      </div>
    </div>
  );
}

function AssetPreviewGraphic({ asset }: { asset: AssetPreviewRecord }) {
  const preview = asset.preview;
  const primary = preview?.primary ?? assetAccent(asset);
  const secondary = preview?.secondary ?? '#f7f7f4';
  const swatches = preview?.swatches ?? [primary, secondary];

  if (preview?.kind === 'material_swatch') {
    return (
      <>
        <span className="kosmo-asset-preview-material" style={{ '--preview-primary': primary, '--preview-secondary': secondary } as CSSProperties} />
        <i className="kosmo-asset-preview-grain" />
        <em className="kosmo-asset-preview-label">{preview.label}</em>
        <b className="kosmo-asset-preview-swatches">
          {swatches.slice(0, 3).map((swatch) => (
            <u key={swatch} style={{ '--preview-swatch': swatch } as CSSProperties} />
          ))}
        </b>
      </>
    );
  }

  if (preview?.kind === 'wireframe_component') {
    return (
      <>
        <span className="kosmo-asset-preview-wireframe" style={{ '--preview-primary': primary, '--preview-secondary': secondary } as CSSProperties} />
        <i className="kosmo-asset-preview-wireframe-depth" />
        <em className="kosmo-asset-preview-label">{preview.label}</em>
      </>
    );
  }

  return (
    <>
      <span className="kosmo-asset-preview-axis" style={{ '--preview-primary': primary, '--preview-secondary': secondary } as CSSProperties} />
      <i className="kosmo-asset-preview-axis-line" />
      <em className="kosmo-asset-preview-label">{preview?.label ?? 'Asset'}</em>
    </>
  );
}

function GeneratedAssetPreview({ asset, profile }: { asset: AssetPreviewRecord; profile: GeneratedAssetProfile }) {
  const isDxf = profile.status.includes('dxf');
  const isMaterial = profile.status.includes('material');
  const accent = assetAccent(asset);
  const metric = generatedProfileMetric(profile) ?? 'Prüfung';
  const visibleLayers = profile.layer_names.slice(0, 5);
  const preview = asset.preview;
  const primary = preview?.primary ?? accent;
  const secondary = preview?.secondary ?? '#f7f7f4';
  const swatches = preview?.swatches ?? [primary, secondary, accent];

  if (isDxf) {
    return (
      <div className="kosmo-generated-preview kosmo-generated-preview-dxf" style={{ '--asset-accent': accent } as CSSProperties}>
        <span className="kosmo-generated-dxf-grid" />
        <span className="kosmo-generated-dxf-axis kosmo-generated-dxf-axis-x" />
        <span className="kosmo-generated-dxf-axis kosmo-generated-dxf-axis-y" />
        <span className="kosmo-generated-dxf-circle kosmo-generated-dxf-circle-a" />
        <span className="kosmo-generated-dxf-circle kosmo-generated-dxf-circle-b" />
        <b>{metric}</b>
        <em>{visibleLayers.join(' · ')}</em>
      </div>
    );
  }

  if (isMaterial) {
    return (
      <div
        className="kosmo-generated-preview kosmo-generated-preview-material"
        style={{
          '--asset-accent': accent,
          '--preview-primary': primary,
          '--preview-secondary': secondary
        } as CSSProperties}
      >
        <span className="kosmo-generated-material-swatch" />
        <span className="kosmo-generated-material-roughness" />
        <span className="kosmo-generated-material-grid">
          {swatches.slice(0, 3).map((swatch) => (
            <i key={swatch} style={{ '--preview-swatch': swatch } as CSSProperties} />
          ))}
        </span>
        <b>{metric}</b>
        <em>{visibleLayers.join(' · ')}</em>
      </div>
    );
  }

  return (
    <div className="kosmo-generated-preview kosmo-generated-preview-glb" style={{ '--asset-accent': accent } as CSSProperties}>
      <span className="kosmo-generated-model-shadow" />
      <span className="kosmo-generated-model-plate kosmo-generated-model-plate-base" />
      <span className="kosmo-generated-model-column" />
      <span className="kosmo-generated-model-plate kosmo-generated-model-plate-top" />
      <span className="kosmo-generated-model-axis kosmo-generated-model-axis-x" />
      <span className="kosmo-generated-model-axis kosmo-generated-model-axis-z" />
      <b>{metric}</b>
      <em>{visibleLayers.join(' · ')}</em>
    </div>
  );
}

function assetVisualKind(asset: AssetPreviewRecord) {
  if (asset.asset_type.includes('material')) return 'material';
  if (asset.asset_type.includes('glb') || asset.asset_type.includes('3d')) return 'model';
  return 'vector';
}

function assetFamily(asset: AssetPreviewRecord): AssetFamilyFilter {
  if (asset.asset_type.includes('material')) return 'material';
  if (asset.asset_type.includes('glb') || asset.asset_type.includes('3d')) return '3d';
  return '2d';
}

function assetAccent(asset: AssetPreviewRecord) {
  if (asset.asset_type.includes('material')) return '#f5b342';
  if (asset.asset_type.includes('glb') || asset.asset_type.includes('3d')) return '#00e7ff';
  return '#ff4fd8';
}

function assetExportPlan(assetId: string): AssetExportPlanRecord | null {
  return assetExportPlanPreview.assets.find((asset) => asset.id === assetId) ?? null;
}

function assetExchangeProfile(assetId: string): AssetExchangeProfileRecord | null {
  return assetExchangeProfilePreview.assets.find((asset) => asset.id === assetId) ?? null;
}

function assetHandoffBundle(assetId: string): AssetHandoffBundleRecord | null {
  return assetHandoffBundlePreview.assets.find((asset) => asset.id === assetId) ?? null;
}

function assetReviewPack(assetId: string): AssetReviewPackRecord | null {
  return assetReviewPackPreview.assets.find((asset) => asset.id === assetId) ?? null;
}

function assetHumanReviewSession(assetId: string): AssetHumanReviewSessionRecord | null {
  return assetHumanReviewSessionPreview.assets.find((asset) => asset.id === assetId) ?? null;
}

function assetDecisionLedger(assetId: string): AssetDecisionLedgerRecord | null {
  return (assetDecisionLedgerPreview.rows.find((asset) => asset.asset_id === assetId) as AssetDecisionLedgerRecord | undefined) ?? null;
}

function assetKosmoDataRefs(asset: AssetPreviewRecord): AssetKosmoDataRef[] {
  if (!('kosmodata_refs' in asset) || !Array.isArray(asset.kosmodata_refs)) return [];
  return asset.kosmodata_refs.filter((ref): ref is AssetKosmoDataRef => Boolean(ref && typeof ref === 'object'));
}

function assetBlenderSandboxRun(assetId: string) {
  return assetWarmConcreteBlenderRunPreview.asset_id === assetId ? assetWarmConcreteBlenderRunPreview : null;
}

function assetBlenderCollectionExists(collections: typeof assetWarmConcreteBlenderRunPreview.collections, key: string) {
  return (collections as Record<string, boolean>)[key] === true;
}

function formatProofDate(value?: string | null) {
  if (!value) return 'ohne Datum';
  return value.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

function assetLibraryPath() {
  return 'examples/kosmo-assets/kosmo-asset-demo/library.json';
}

function assetDecisionRoutes(asset: AssetPreviewRecord, handoffBundle: AssetHandoffBundleRecord | null) {
  const routes = new Set<string>();
  if (handoffBundle?.blender) routes.add('blender');
  if (handoffBundle?.archicad) routes.add('archicad');
  if (asset.export_targets.includes('blender')) routes.add('blender');
  if (asset.export_targets.includes('archicad') || asset.export_targets.includes('cad')) routes.add('archicad');
  if (asset.formats.some((format) => format.format === 'glb')) routes.add('glb');
  if (asset.formats.some((format) => format.format === 'dxf')) routes.add('dxf');
  if (asset.asset_type.includes('material')) routes.add('material');
  if (!routes.size) routes.add('all');
  return [...routes].slice(0, 3);
}

function assetGateSignals({
  asset,
  reviewPack,
  decisionLedger,
  handoffSmoke
}: {
  asset: AssetPreviewRecord;
  reviewPack: AssetReviewPackRecord | null;
  decisionLedger: AssetDecisionLedgerRecord | null;
  handoffSmoke: typeof assetHandoffSmokePreview | null;
}): AssetGateSignal[] {
  const smokePassed = handoffSmoke?.summary.failure_count === 0;
  const technicalReady = reviewPack?.local_ready === true && smokePassed;
  const technicalTone: AssetGateTone = technicalReady ? 'ready' : handoffSmoke && !smokePassed ? 'blocked' : 'review';
  const humanDecisionState = decisionLedger?.human_decision_state ?? 'needs_more_evidence';
  const humanSignal = humanGateSignal(humanDecisionState);
  const publicGate = decisionLedger?.public_gate ?? (reviewPack?.public_ready ? 'ready' : 'blocked');
  const publicLocalOnly = publicGate === 'blocked' && asset.public_use_allowed === false;
  const certificateStatus = decisionLedger?.certificate_status ?? 'missing_certificate';
  const certificateReady = decisionLedger?.certificate_ready === true;

  return [
    {
      id: 'technical',
      label: 'Technik',
      value: technicalReady ? 'OK' : technicalTone === 'blocked' ? 'Blockiert' : 'Prüfen',
      detail: smokePassed ? 'Lokale Dateien und Smoke-Test sind grün.' : 'Vor Sandbox zuerst Vollprüfung und Smoke-Test prüfen.',
      tone: technicalTone
    },
    {
      id: 'human',
      label: 'Mensch',
      value: humanSignal.value,
      detail: humanSignal.detail,
      tone: humanSignal.tone
    },
    {
      id: 'public',
      label: 'Öffentlich',
      value: publicLocalOnly ? 'Gesperrt' : publicGate === 'blocked' ? 'Prüfung' : 'Risiko',
      detail: publicLocalOnly ? 'Lokale Prüfspur, kein Download und kein R2.' : 'Öffentlichkeits-Gate braucht separate Rechte-/Owner-Prüfung.',
      tone: publicLocalOnly ? 'local' : publicGate === 'blocked' ? 'review' : 'blocked'
    },
    {
      id: 'certificate',
      label: 'Zertifikat',
      value: certificateReady ? 'bereit' : 'offen',
      detail: certificateReady ? 'Lokales Qualitätszertifikat liegt als Evidenz vor.' : formatAssetValue(certificateStatus),
      tone: certificateReady ? 'ready' : 'review'
    }
  ];
}

function assetReviewSummary({
  asset,
  reviewPack,
  decisionLedger,
  handoffSmoke
}: {
  asset: AssetPreviewRecord;
  reviewPack: AssetReviewPackRecord | null;
  decisionLedger: AssetDecisionLedgerRecord | null;
  handoffSmoke: typeof assetHandoffSmokePreview | null;
}) {
  const publicBlocked = asset.public_use_allowed === false || decisionLedger?.public_gate === 'blocked' || reviewPack?.public_ready === false;
  const humanState = decisionLedger?.human_decision_state ?? reviewPack?.human_review_status ?? asset.review_status;
  const localReady = reviewPack?.local_ready === true || decisionLedger?.certificate_ready === true;
  const smokePassed = handoffSmoke?.summary.failure_count === 0;
  const needsHuman = humanState !== 'approved';
  const status = localReady && smokePassed && !needsHuman
    ? 'lokal geprüft'
    : localReady || smokePassed
      ? 'lokale Evidenz'
      : 'Review offen';
  const publicGate = publicBlocked ? 'gesperrt' : 'separat prüfen';
  const tone: AssetGateTone = publicBlocked ? (needsHuman ? 'review' : 'local') : 'blocked';
  const message = publicBlocked
    ? needsHuman
      ? 'Dieses Asset ist nur als lokale Prüfspur gedacht. Vor Blender-/ArchiCAD-Promotion braucht es menschliche Sichtprüfung; öffentliche Downloads und R2 bleiben gesperrt.'
      : 'Dieses Asset hat lokale Evidenz, bleibt aber bewusst nicht öffentlich: kein R2, kein Download, kein automatisches Publishing.'
    : 'Dieses Asset darf nicht automatisch öffentlich werden. Rechte, Quelle, Owner und Review müssen separat entschieden werden.';

  return { status, publicGate, message, tone };
}

function humanGateSignal(state: string): Pick<AssetGateSignal, 'value' | 'detail' | 'tone'> {
  if (state === 'approved') {
    return {
      value: 'lokal OK',
      detail: 'Benannte menschliche Freigabe ist lokal verbucht.',
      tone: 'ready'
    };
  }
  if (state === 'blocked') {
    return {
      value: 'blockiert',
      detail: 'Öffentlichkeits- oder Routen-Gate bleibt bewusst geschlossen.',
      tone: 'local'
    };
  }
  if (state === 'rejected') {
    return {
      value: 'abgelehnt',
      detail: 'Asset-Route darf nicht in Übergabe-Workflows.',
      tone: 'blocked'
    };
  }
  return {
    value: 'Evidenz fehlt',
    detail: 'Menschliche Checkliste und Entscheidungsrecord sind noch offen.',
    tone: 'review'
  };
}

function assetChecklistLabel(id: string, fallback: string) {
  const labels: Record<string, string> = {
    source_basis: 'Quellenbasis dokumentiert',
    local_files: 'Lokale Dateien vorhanden',
    rights_gate: 'Rechte-Gate sicher',
    kosmodata_bridge: 'KosmoData-Brücke dokumentiert',
    public_gate: 'Öffentlichkeits-Gate blockiert unsichere Assets',
    review_status: 'Menschliche Prüfung fehlt',
    export_routes: 'Export-Routen ohne Blocker',
    generated_profile: 'Generiertes Profil vorhanden',
    library_check: 'Bibliothekscheck bestanden'
  };
  return labels[id] ?? fallback;
}

function assetHumanSessionCheckLabel(id: string, fallback: string) {
  const labels: Record<string, string> = {
    source_basis_read: 'Quellenbasis gelesen',
    rights_risk_checked: 'Rechte-/Öffentlichkeits-Gate geprüft',
    local_file_opened: 'Lokale Datei angeschaut',
    scale_origin_layer_checked: 'Maßstab, Ursprung und Layer geprüft',
    ai_slop_risk_checked: 'Qualität gegen KI-Slop geprüft',
    route_decision_ready: 'Routenentscheidung bereit'
  };
  return labels[id] ?? fallback;
}

function assetReviewActions(asset: AssetPreviewRecord): AssetReviewAction[] {
  const libraryPath = assetLibraryPath();
  const decisionRoutes = assetDecisionRoutes(asset, assetHandoffBundle(asset.id));
  const commands: AssetReviewAction[] = [
    {
      id: 'library-check',
      label: 'Bibliothek prüfen',
      kicker: 'QA',
      description: 'Validiert Rechte, Formate, Exportziele und Pflichtfelder der Asset-Bibliothek.',
      command: `npm run kosmo:asset-library-check -- --library ${libraryPath}`
    },
    {
      id: 'export-plan',
      label: 'Exportplan',
      kicker: 'Route',
      description: 'Erzeugt den lokalen Exportplan für Blender, ArchiCAD, Web und Prüfschritte.',
      command: `npm run kosmo:asset-export-plan -- --library ${libraryPath}`
    },
    {
      id: 'exchange-profile',
      label: 'Übergabeprofil',
      kicker: 'Brücke',
      description: 'Erzeugt das lokale Blender-/ArchiCAD-/Web-Übergabeprofil für Benennung, Layer und Oberflächenmapping.',
      command: `npm run kosmo:asset-exchange-profile -- --library ${libraryPath}`
    },
    {
      id: 'full-review',
      label: 'Vollprüfung',
      kicker: 'Batch',
      description: 'Führt den ganzen lokalen Prüfbatch aus: Check, Exportplan, Prüfpaket, Übergabeprofil, Übergabepaket, Smoke-Test, menschliche Prüfsession und Entscheidungsbuch.',
      command: `npm run kosmo:asset-full-review -- --library ${libraryPath}`
    },
    {
      id: 'human-review-session',
      label: 'Prüfsession',
      kicker: 'Prüfung',
      description: 'Erzeugt die editierbare lokale menschliche Prüfsession mit offenen Asset-Checks und sicheren Entscheidbefehlen.',
      command: `npm run kosmo:asset-human-review-session -- --library ${libraryPath}`
    },
    {
      id: 'decision-ledger',
      label: 'Entscheidbuch',
      kicker: 'Audit',
      description: 'Liest lokale Prüfentscheidungen und Zertifikate als Auditbuch. Erzeugt keine Freigabe.',
      command: `npm run kosmo:asset-decision-ledger -- --library ${libraryPath}`
    },
    {
      id: 'handoff-bundle',
      label: 'Übergabepaket',
      kicker: 'Export',
      description: 'Erzeugt die lokale Prüfvorlage für Blender-Python und den ArchiCAD-Schedule aus dem Übergabeprofil.',
      command: `npm run kosmo:asset-handoff-bundle -- --library ${libraryPath}`
    },
    {
      id: 'handoff-smoke',
      label: 'Smoke-Test',
      kicker: 'QA',
      description: 'Prüft Blender-Python, ArchiCAD-CSV, lokale Quellen und blockierte Öffentlichkeits-Gates ohne Asset-Import.',
      command: `npm run kosmo:asset-handoff-smoke -- --library ${libraryPath}`
    },
    {
      id: 'review-pack',
      label: 'Prüfpaket',
      kicker: 'Prüfung',
      description: 'Bündelt Check, Export-Routen, lokale Dateien und offene menschliche Asset-Prüfungen.',
      command: `npm run kosmo:asset-review-pack -- --library ${libraryPath}`
    },
    {
      id: 'review-decision',
      label: 'Freigabe-Draft',
      kicker: 'Gate',
      description: 'Schreibt eine lokale menschliche Freigabe-Evidenz für ein Asset, ohne Bibliothek, Blender, ArchiCAD oder Öffentlichkeits-Gates zu verändern.',
      command: `npm run kosmo:asset-review-decision -- --library ${libraryPath} --asset ${asset.id} --route ${decisionRoutes[0]} --decision approve-local --confirm-human-review --reviewer "REPLACE_WITH_REVIEWER_NAME"`
    },
    {
      id: 'review-certificate',
      label: 'Prüfzertifikat',
      kicker: 'Cert',
      description: 'Bündelt lokale Freigabe, menschliche Prüfsession, Smoke-Test und Öffentlichkeits-Gate als Zertifikat für Sandbox-Tests. Keine Veröffentlichung.',
      command: `npm run kosmo:asset-review-certificate -- --library ${libraryPath} --asset ${asset.id} --route ${decisionRoutes[0]}`
    },
    {
      id: 'certificate-smoke',
      label: 'Cert Smoke',
      kicker: 'QA',
      description: 'Testet das Zertifikat-Gate mit temporärer Freigabe und räumt die Entscheid-/Zertifikatsdateien danach wieder weg.',
      command: `npm run kosmo:asset-certificate-smoke -- --library ${libraryPath} --asset ${asset.id} --route ${decisionRoutes[0]}`
    },
    {
      id: 'promotion-guard',
      label: 'Promotion Guard',
      kicker: 'Sicher',
      description: 'Prüft, dass keine Asset-Promotion, kein Upload und kein Öffentlichkeits-Gate ohne eigene Rechte-/Owner-Prüfung möglich ist.',
      command: `npm run kosmo:asset-promotion-guard -- --library ${libraryPath}`
    }
  ];

  const hasGlbFormat = asset.formats.some((format) => format.format === 'glb');
  const hasDxfFormat = asset.formats.some((format) => format.format === 'dxf');
  const canGenerateGlb = hasGlbFormat || asset.asset_type.includes('glb') || asset.asset_type.includes('3d');
  const canGenerateDxf = hasDxfFormat || asset.asset_type.includes('2d') || asset.export_targets.includes('cad');

  if (decisionRoutes.includes('blender')) {
    commands.push({
      id: 'blender-sandbox',
      label: 'Blender Sandbox',
      kicker: 'BPy',
      description: 'Erzeugt eine Blender-Sandbox-Python-Datei nach lokaler Freigabe und Smoke-Test. Nur für kopierte Testdateien.',
      command: `npm run kosmo:asset-blender-sandbox -- --library ${libraryPath} --asset ${asset.id} --route blender`
    });
  }

  if (decisionRoutes.includes('archicad')) {
    commands.push({
      id: 'archicad-sandbox',
      label: 'ArchiCAD Sandbox',
      kicker: 'AC',
      description: 'Erzeugt einen ArchiCAD-Sandbox-Schedule nach lokaler Freigabe und Smoke-Test. Nur für manuelle Attribut- und Layerprüfung.',
      command: `npm run kosmo:asset-archicad-sandbox -- --library ${libraryPath} --asset ${asset.id} --route archicad`
    });
  }

  if (canGenerateGlb) {
    commands.push({
      id: 'generate-glb',
      label: 'GLB erzeugen',
      kicker: '3D',
      description: 'Generiert oder aktualisiert das diagrammatische GLB-Demoasset mit Layerprofil.',
      command: `npm run kosmo:asset-generate-demo-glb -- --library ${libraryPath} --asset ${asset.id}`
    });
  }

  if (canGenerateDxf) {
    commands.push({
      id: 'generate-dxf',
      label: 'DXF erzeugen',
      kicker: '2D',
      description: 'Generiert oder aktualisiert das diagrammatische DXF-Planzeichen oder den Bauteil-Footprint.',
      command: `npm run kosmo:asset-generate-demo-dxf -- --library ${libraryPath} --asset ${asset.id}`
    });
  }

  if (asset.asset_type.includes('material') || asset.formats.some((format) => format.format === 'material_json')) {
    commands.push({
      id: 'generate-material-profile',
      label: 'Materialprofil',
      kicker: 'Mat',
      description: 'Generiert oder aktualisiert das lokale Materialparameter-Profil für Blender- und ArchiCAD-Mapping.',
      command: `npm run kosmo:asset-generate-demo-material-profile -- --library ${libraryPath} --asset ${asset.id}`
    });
  }

  commands.push({
    id: 'brain-doctor',
    label: 'Brain prüfen',
    kicker: 'Brain',
    description: 'Prüft die lokale Tool-Registry und meldet fehlende Prüfarbeitsstände, ohne etwas zu veröffentlichen.',
    command: 'npm run brain:doctor'
  });

  return commands;
}

type GeneratedAssetProfile = {
  generated_at?: string;
  generator?: string;
  status: string;
  caveat?: string;
  triangle_count?: number;
  entity_count?: number;
  parameter_count?: number;
  layer_names: string[];
};

function assetGeneratedProfiles(asset: AssetPreviewRecord): GeneratedAssetProfile[] {
  const primary = 'generated_asset_profile' in asset ? asset.generated_asset_profile : null;
  const rows = 'generated_asset_profiles' in asset && Array.isArray(asset.generated_asset_profiles) ? asset.generated_asset_profiles : [];
  const profiles = [primary, ...rows]
    .map((profile) => normalizeGeneratedProfile(profile))
    .filter((profile): profile is GeneratedAssetProfile => Boolean(profile));
  const uniqueProfiles = profiles.filter((profile, index, list) => (
    list.findIndex((candidate) => candidate.generator === profile.generator && candidate.status === profile.status) === index
  ));

  return uniqueProfiles.sort((a, b) => generatedProfilePriority(asset, a) - generatedProfilePriority(asset, b));
}

function normalizeGeneratedProfile(profile: unknown): GeneratedAssetProfile | null {
  if (!profile || typeof profile !== 'object') return null;
  const row = profile as Record<string, unknown>;
  if (typeof row.status !== 'string' || !Array.isArray(row.layer_names)) return null;
  return {
    generated_at: typeof row.generated_at === 'string' ? row.generated_at : undefined,
    generator: typeof row.generator === 'string' ? row.generator : undefined,
    status: row.status,
    caveat: typeof row.caveat === 'string' ? row.caveat : undefined,
    triangle_count: typeof row.triangle_count === 'number' ? row.triangle_count : undefined,
    entity_count: typeof row.entity_count === 'number' ? row.entity_count : undefined,
    parameter_count: typeof row.parameter_count === 'number' ? row.parameter_count : undefined,
    layer_names: row.layer_names.filter((layer): layer is string => typeof layer === 'string')
  };
}

function generatedProfilePriority(asset: AssetPreviewRecord, profile: GeneratedAssetProfile) {
  if (asset.asset_type.includes('material') && profile.status.includes('material')) return 0;
  if (asset.asset_type.includes('glb') && profile.status.includes('glb')) return 0;
  if (asset.asset_type.includes('2d') && profile.status.includes('dxf')) return 0;
  if (profile.status.includes('material')) return 1;
  if (profile.status.includes('glb')) return 1;
  if (profile.status.includes('dxf')) return 2;
  return 3;
}

function generatedProfileLabel(profile: GeneratedAssetProfile) {
  if (profile.status.includes('material')) return 'Material-Layer';
  if (profile.status.includes('dxf')) return 'CAD-Layer';
  if (profile.status.includes('glb')) return '3D-Layer';
  return 'Analyse-Layer';
}

function generatedProfileMetric(profile: GeneratedAssetProfile) {
  if (typeof profile.triangle_count === 'number') return `${profile.triangle_count} Dreiecke`;
  if (typeof profile.entity_count === 'number') return `${profile.entity_count} DXF-Elemente`;
  if (typeof profile.parameter_count === 'number') return `${profile.parameter_count} Parameter`;
  return null;
}

function formatAssetValue(value: string) {
  const labels: Record<string, string> = {
    '2d_symbol': '2D-Zeichen',
    annotation: 'Annotation',
    material: 'Material',
    structure: 'Struktur',
    glb_model: 'GLB-Modell',
    own_work: 'eigene Arbeit',
    generated_needs_review: 'generiert, Prüfung offen',
    missing_decision: 'Entscheid fehlt',
    needs_review_recorded: 'Review offen verbucht',
    local_approval_recorded: 'lokale Freigabe verbucht',
    local_approval_missing: 'lokale Freigabe fehlt',
    local_certificate_missing: 'lokales Zertifikat fehlt',
    material_context: 'Materialkontext',
    context_only: 'nur Kontext',
    reference_entry: 'Referenzeintrag',
    not_required_for_note: 'für Notiz nicht nötig',
    continue_manual_review: 'manuelle Prüfung fortsetzen',
    keep_public_gate_blocked: 'Öffentlichkeits-Gate gesperrt halten',
    normal: 'normal',
    pending_human_review: 'menschliche Prüfung offen',
    needs_human_review: 'menschliche Prüfung nötig',
    passed: 'bestanden',
    public_domain: 'gemeinfrei',
    licensed: 'lizenziert',
    needs_review: 'Prüfung offen',
    open: 'offen',
    draft: 'Entwurf',
    reviewed: 'geprüft',
    verified: 'verifiziert',
    needs_more_evidence: 'mehr Evidenz nötig',
    local_review_only: 'nur lokale Prüfung',
    local_review_dxf_generated: 'lokales DXF generiert',
    local_review_glb_generated: 'lokales GLB generiert',
    local_review_material_profile_generated: 'lokales Materialprofil generiert',
    local_review_decision_recorded: 'lokaler Entscheid verbucht',
    local_review_note_recorded: 'lokale Review-Notiz verbucht',
    asset_decision_ledger_open: 'Entscheidbuch offen',
    asset_local_review_certified: 'lokal zertifiziert',
    complete_human_review_before_promotion: 'vor Promotion menschlich prüfen',
    missing_certificate: 'Zertifikat fehlt',
    blocked: 'gesperrt',
    ready: 'bereit',
    approved: 'freigegeben',
    rejected: 'abgelehnt',
    review: 'Prüfung',
    private: 'privat',
    recorded: 'verbucht',
    missing: 'fehlt',
    approve_local: 'lokal freigeben',
    generate_local_evidence: 'lokale Evidenz erzeugen',
    manual_review_required: 'manuelle Prüfung nötig',
    web_public_blocked: 'Web öffentlich gesperrt',
    blender_review_only: 'Blender nur zur Prüfung',
    archicad_review_only: 'ArchiCAD nur zur Prüfung',
    dxf_underlay_or_symbol: 'DXF-Unterlage / Symbol',
    surface_attribute_reference: 'Oberflächenreferenz',
    create_material_from_parameters: 'Material aus Parametern',
    link_glb_as_collection: 'GLB als Collection verlinken',
    public_gate_blocked: 'Öffentlichkeits-Gate gesperrt',
    not_certified: 'nicht zertifiziert',
    record_or_defer_human_decision: 'Entscheid erfassen oder vertagen',
    complete_asset_human_review_session_before_approval_commands: 'Prüfsession vor Freigabe abschließen',
    local_only: 'nur lokal',
    local_file: 'lokale Datei',
    planned: 'geplant',
    exists: 'vorhanden',
    review_only: 'nur Prüfung'
  };
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return labels[key] ?? value.replace(/[_-]/g, ' ');
}

function formatAssetText(value: string) {
  const labels: Record<string, string> = {
    'Minimal SVG annotation symbol for plan and section overlays.': 'Minimales SVG-Annotationszeichen für Plan- und Schnitt-Overlays.',
    'Neutral material metadata sample for Blender/ArchiCAD material mapping.': 'Neutrales Material-Metadatenbeispiel für Blender- und ArchiCAD-Materialmapping.',
    'Local diagrammatic GLB component for Blender/ArchiCAD exchange tests.': 'Lokale diagrammatische GLB-Komponente für Blender- und ArchiCAD-Übergabetests.',
    'Run human review and move review_status to reviewed or verified.': 'Menschliche Prüfung durchführen und den Prüfstatus danach auf geprüft oder verifiziert setzen.',
    'Review assets with local source files before promoting them to reusable workflow assets.': 'Assets mit lokalen Quelldateien prüfen, bevor sie zu wiederverwendbaren Workflow-Assets werden.',
    'Human review is still open; exchange profiles are naming proposals only.': 'Die menschliche Prüfung ist noch offen; Übergabeprofile sind aktuell nur Benennungsvorschläge.',
    ['Cl' + 'ose human review before importing assets into production Blender/ArchiCAD files.']: 'Menschliche Prüfung abschließen, bevor Assets in produktive Blender- oder ArchiCAD-Dateien importiert werden.',
    'Run a local Blender smoke only with review assets, not production files.': 'Lokalen Blender-Smoke-Test nur mit Prüfassets ausführen, nicht mit produktiven Dateien.',
    'Keep ArchiCAD profiles as layer/surface naming references until reviewed.': 'ArchiCAD-Profile bis zur Prüfung nur als Layer- und Oberflächenreferenz verwenden.',
    'Keep public web/download gates blocked until rights and review are explicit.': 'Öffentliche Web- und Download-Gates gesperrt halten, bis Rechte und Prüfung explizit geklärt sind.',
    'Source basis is documented.': 'Die Quellenbasis ist dokumentiert.',
    'No KosmoData references are attached to this asset.': 'Dieses Asset ist noch mit keiner KosmoData-Referenz verknüpft.',
    'At least one local source/export file exists.': 'Mindestens eine lokale Quellen- oder Exportdatei ist vorhanden.',
    'Rights status does not allow unsafe public use.': 'Der Rechte-Status verhindert unsichere öffentliche Nutzung.',
    'Public use is blocked unless rights and review are ready.': 'Öffentliche Nutzung bleibt gesperrt, bis Rechte und Prüfung bereit sind.',
    'Human review status is reviewed or verified.': 'Der menschliche Prüfstatus ist geprüft oder verifiziert.',
    'No export route is blocked.': 'Keine Exportroute ist blockiert.',
    ['Gen' + 'erated assets carry a generated profile.']: 'Generierte Assets besitzen ein generiertes Profil.',
    'Asset passed the library check row.': 'Das Asset hat den Bibliothekscheck bestanden.',
    'Open local SVG/DXF/GLB/material files and record a human review decision before promotion.': 'Lokale SVG-, DXF-, GLB- oder Materialdateien öffnen und vor Promotion einen menschlichen Prüfentscheid erfassen.',
    'Confirm generated assets are not derived from protected project images, scans or third-party models.': 'Bestätigen, dass generierte Assets nicht aus geschützten Projektbildern, Scans oder Drittmodellen abgeleitet sind.',
    'Handoff bundle is ready for human review-only smoke tests. Keep ALLOW_SCENE_WRITE disabled until explicit approval.': 'Das Übergabepaket ist bereit für menschliche Review-only-Smoke-Tests. ALLOW_SCENE_WRITE bleibt bis zur expliziten Freigabe deaktiviert.'
  };
  return labels[value] ?? value;
}

function WormholeBirthOverlay() {
  const sparks = Array.from({ length: 10 }, (_, index) => index);

  return (
    <div className="wormhole-birth-overlay" aria-hidden="true">
      <div className="wormhole-birth-core">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="wormhole-birth-grid">
        <span />
        <span />
        <span />
      </div>
      <div className="wormhole-birth-sparks">
        {sparks.map((spark) => (
          <i key={spark} style={{ '--spark-index': spark } as CSSProperties} />
        ))}
      </div>
      <div className="wormhole-birth-label">Wurmloch wird erzeugt</div>
    </div>
  );
}

function DatabaseReturnOverlay() {
  return (
    <div className="database-return-overlay" aria-hidden="true">
      <div className="database-return-orbit">
        <span />
        <span />
        <span />
      </div>
      <div className="database-return-label">Zurück ins Wurmloch</div>
    </div>
  );
}

type DatabaseTab = 'overview' | 'intake' | 'books' | 'generate' | 'entries' | 'sources' | 'media' | 'models' | 'analysis' | 'relations' | 'brain' | 'draft';

function DatabaseArchivePanel({
  renderMode = 'svg',
  entries,
  relations,
  selectedEntry,
  draft,
  intakeFiles,
  researchSeed,
  imageIdentify,
  developerMode,
  onEntwurfChange,
  onIntakeFilesChange,
  onResearchSeedChange,
  onImageIdentifyChange,
  onCreateLocalEntry,
  onDismiss,
  onReturnToHub
}: {
  renderMode?: 'svg' | 'html';
  entries: Entry[];
  relations: EntryRelation[];
  selectedEntry: Entry | null;
  draft: EntryEntwurf;
  intakeFiles: IntakeFile[];
  researchSeed: ResearchSeed;
  imageIdentify: ImageIdentifyState;
  developerMode: boolean;
  onEntwurfChange: (draft: EntryEntwurf) => void;
  onIntakeFilesChange: (files: IntakeFile[]) => void;
  onResearchSeedChange: (seed: ResearchSeed) => void;
  onImageIdentifyChange: (state: ImageIdentifyState) => void;
  onCreateLocalEntry: (draft: EntryEntwurf) => void;
  onDismiss: () => void;
  onReturnToHub: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DatabaseTab>(selectedEntry ? 'entries' : 'overview');
  const panelRootRef = useRef<HTMLDivElement | null>(null);
  const ui = useAtlasUiMetrics();
  const panelWidth = ui.databasePanel.width;
  const panelHeight = ui.databasePanel.height;
  const x = ui.databasePanel.x;
  const y = ui.databasePanel.y;
  const preview = draftToEntryPreview(draft);
  const intakeStats = summarizeIntakeFiles(intakeFiles);
  const pilotEntry = archivePreview.entries[0];
  const currentEntry = selectedEntry ?? entries.find((entry) => entry.id === pilotEntry.id) ?? null;
  const currentAnalysisPack = findAnalysisPackForEntry(currentEntry);
  const currentProfile = currentEntry?.database_profile;
  const counts = [
    { label: 'Einträge', value: entries.length },
    { label: 'Quellen', value: archivePreview.entry_sources.length },
    { label: 'Medien', value: archivePreview.entry_media.length },
    { label: '3D', value: archivePreview.entry_models.length },
    { label: 'Analyse', value: archivePreview.entry_analysis.length },
    { label: 'Relationen', value: relations.length }
  ];
  const tabs: Array<{ id: DatabaseTab; label: string; hint: string; group: 'create' | 'review'; devOnly?: boolean }> = [
    { id: 'generate', label: 'KI Erfassen', hint: 'Name oder Bild zu Entwurf', group: 'create', devOnly: true },
    { id: 'intake', label: 'Erfassen', hint: 'Gast, Konto oder Dev', group: 'create' },
    { id: 'books', label: 'Bücher', hint: 'Scans zu Projekten', group: 'create' },
    { id: 'analysis', label: 'Analyse', hint: 'Layer und Prüfung', group: 'create', devOnly: true },
    { id: 'draft', label: 'Entwurf', hint: 'Vor Eintrag prüfen', group: 'create', devOnly: true },
    { id: 'overview', label: 'Wissen', hint: 'Stand der Datenbank', group: 'review' },
    { id: 'entries', label: 'Objekte', hint: 'Aktuelles Objekt', group: 'review' },
    { id: 'sources', label: 'Quellen', hint: 'Nachweise', group: 'review' },
    { id: 'media', label: 'Medien', hint: 'Bilder und Pläne', group: 'review' },
    { id: 'models', label: '3D', hint: 'Modellebenen', group: 'review' },
    { id: 'brain', label: 'Brain', hint: 'Werkzeuge', group: 'review' },
    { id: 'relations', label: 'Graph', hint: 'Verknüpfungen', group: 'review' }
  ];
  const visibleTabs = developerMode ? tabs : tabs.filter((tab) => !tab.devOnly);
  const createTabs = visibleTabs.filter((tab) => tab.group === 'create');
  const reviewTabs = visibleTabs.filter((tab) => tab.group === 'review');
  const safeActiveTab = !developerMode && isDevOnlyDatabaseTab(activeTab) ? 'overview' : activeTab;
  const workflowStage = databaseWorkflowStage(safeActiveTab);

  function updateField<Key extends keyof EntryEntwurf>(key: Key, value: EntryEntwurf[Key]) {
    onEntwurfChange({ ...draft, [key]: value });
  }

  function updateResearchSeed<Key extends keyof ResearchSeed>(key: Key, value: ResearchSeed[Key]) {
    onResearchSeedChange({ ...researchSeed, [key]: value });
  }

  function generateResearchEntwurf() {
    const generatedEntwurf = draftFromResearchSeed(researchSeed);
    onEntwurfChange(generatedEntwurf);
    setActiveTab('draft');
  }

  function handlePrimaryGenerate() {
    if (!developerMode) {
      setActiveTab('overview');
      return;
    }

    if (safeActiveTab !== 'generate') {
      setActiveTab('generate');
      return;
    }

    generateResearchEntwurf();
  }

  function printCurrentDatabaseView() {
    if (typeof window === 'undefined') return;
    window.print();
  }

  function activateIntakeTab(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setActiveTab('intake');
  }

  function activatePrint(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    printCurrentDatabaseView();
  }

  function loadIngenbohlSample() {
    const seed = {
      project: 'Alterszentrum Kloster Ingenbohl',
      architect: 'Boltshauser Architekten / Roger Boltshauser',
      address: 'Klosterstrasse 20, 6440 Brunnen, Schweiz'
    };

    onResearchSeedChange(seed);
    onEntwurfChange(draftFromResearchSeed(seed));
    if (imageIdentify.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageIdentify.previewUrl);
    }
    onImageIdentifyChange({ fileName: '', previewUrl: '', status: 'empty' });
    setActiveTab('draft');
  }

  function stageIdentifyImage(file: File) {
    const objectUrl = URL.createObjectURL(file);

    if (imageIdentify.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageIdentify.previewUrl);
    }

    onImageIdentifyChange({
      fileName: file.name,
      previewUrl: objectUrl,
      status: 'bereit'
    });
    onEntwurfChange(initialEntryEntwurf);
    onResearchSeedChange({ project: '', architect: '', address: '' });
    setActiveTab('generate');
  }

  function handleIdentifyImageDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const imageFile = Array.from(event.dataTransfer.files).find((file) => file.type.startsWith('image/'));
    if (imageFile) stageIdentifyImage(imageFile);
  }

  function identifyDroppedImage() {
    const candidate = identifyBuildingFromImageName(
      `${imageIdentify.fileName} ${researchSeed.project} ${researchSeed.architect} ${researchSeed.address}`,
      entries
    );

    if (!candidate) {
      const nextSeed = {
        project: stripFileExtension(imageIdentify.fileName) || 'Unerkannt image research',
        architect: '',
        address: ''
      };
      onResearchSeedChange(nextSeed);
      onEntwurfChange(draftFromResearchSeed(nextSeed));
      onImageIdentifyChange({
        ...imageIdentify,
        status: 'unknown',
        candidate: undefined
      });
      return;
    }

    const nextSeed = {
      project: candidate.project,
      architect: candidate.architect,
      address: candidate.address
    };
    onResearchSeedChange(nextSeed);
    onEntwurfChange(draftFromResearchSeed(nextSeed));
    onImageIdentifyChange({
      ...imageIdentify,
      status: 'erkannt',
      candidate
    });
  }

  function resetPanelEntwurf() {
    if (imageIdentify.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageIdentify.previewUrl);
    }

    onEntwurfChange(initialEntryEntwurf);
    onResearchSeedChange({ project: '', architect: '', address: '' });
    onImageIdentifyChange({ fileName: '', previewUrl: '', status: 'empty' });
    onIntakeFilesChange([]);
    setActiveTab('generate');
  }

  function appendFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      kind: classifyIntakeFile(file.name),
      status: 'classified' as const
    }));
    const merged = new Map(intakeFiles.map((file) => [file.id, file]));
    nextFiles.forEach((file) => merged.set(file.id, file));
    onIntakeFilesChange([...merged.values()]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    appendFiles(event.dataTransfer.files);
  }

  const panelContent = (
      <div
        ref={panelRootRef}
        className="cosmos-panel cosmos-text-safe flex flex-col border border-[#00e7ff]/70 bg-[#050505]/95 p-4 text-[#f7f7f4] shadow-[0_0_28px_rgb(0_231_255_/_0.12)]"
        style={renderMode === 'svg' ? { width: panelWidth, height: panelHeight } : undefined}
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              className="database-logo-return"
              aria-label="Zurück zum Hauptmenü"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onReturnToHub();
              }}
            >
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <CosmosGlyph />
              </svg>
            </button>
            <div className="database-panel-title">KosmoData</div>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[9.5px] uppercase tracking-[0.18em] text-[#b8b8b2]">
            <span>{developerMode ? 'Dev-Zugang aktiv / private Werkzeuge sichtbar' : 'Öffentliche Wissensansicht / private Werkzeuge gesperrt'}</span>
            <button
              type="button"
              className="database-print-action"
              data-database-action="print"
              onPointerDown={activatePrint}
              onClick={(event) => event.stopPropagation()}
            >
              Ansicht drucken
            </button>
            <button
              type="button"
              className="database-back-action"
              onPointerDown={(event) => {
                event.stopPropagation();
                onDismiss();
              }}
              onClick={(event) => event.stopPropagation()}
            >
              Zurück
            </button>
          </div>
        </div>

        <a className="database-gold-action mb-2" href="/archive/" aria-label="Datenbank öffnen">
          <span>Datenbank öffnen</span>
          <small>Direkter Zugriff auf die aktuelle Archiv- und Wissensplattform</small>
        </a>

        <button
          type="button"
          className="database-user-intake mb-3"
          data-database-action="intake"
          onPointerDown={activateIntakeTab}
          onClick={(event) => event.stopPropagation()}
        >
          <span>Eigenes Projekt erfassen</span>
          <small>Gast, Nutzerkonto oder Dev-Zugang wählen.</small>
        </button>

        {safeActiveTab === 'intake' ? (
          <DatabaseIntakeModes developerMode={developerMode} onSelectDev={() => setActiveTab(developerMode ? 'generate' : 'overview')} />
        ) : null}

        <div className="mb-3 grid grid-cols-3 gap-1.5 border border-[#f7f7f4]/10 bg-[#050505]/28 px-2 py-2 sm:grid-cols-6">
          {counts.map((item) => (
            <div key={item.label} className="min-w-0">
              <span className="block text-[10px] font-semibold leading-none text-[#f7f7f4]/78">{item.value}</span>
              <span className="mt-1 block truncate text-[7px] uppercase tracking-[0.1em] text-[#b8b8b2]/62">{databaseCountLabels[item.label] ?? item.label}</span>
            </div>
          ))}
        </div>

        <div className={`mb-3 border px-2 py-1.5 text-[8.8px] uppercase leading-snug tracking-[0.12em] ${developerMode ? 'border-[#f5b342]/34 bg-[#201407]/70 text-[#ffe1a3]' : 'border-[#00e7ff]/25 bg-[#061719]/85 text-[#c9fff4]'}`}>
          {developerMode
            ? 'Dev freigeschaltet / private Copyright-Workflows sichtbar / keine automatische Veröffentlichung'
            : 'Dev gesperrt / nur public-safe Metadaten / private Werkzeuge unter Search entsperren'}
        </div>

        {developerMode ? (
          <div className="database-top-workflow mb-3">
            <DatabaseFlowSteps current={workflowStage} />
            <div className="database-primary-action">
              <button
                type="button"
                className="database-primary-generate"
                onClick={handlePrimaryGenerate}
              >
                {safeActiveTab === 'generate' ? 'Entwurf erzeugen' : 'Dev KI Erfassen'}
              </button>
              <small>{safeActiveTab === 'generate' ? 'nutzt aktuelle Eingaben' : 'öffnet Generator'}</small>
            </div>
          </div>
        ) : (
          <p className="mb-3 border border-[#f7f7f4]/12 bg-[#050505]/55 p-2 text-[9.5px] leading-snug text-[#b8b8b2]">
            Private Erfassung, KI-Generierung, Entwurfserstellung und copyright-sensible Prüfung bleiben verborgen, bis der lokale Dev-Zugang entsperrt ist. Das ist eine UI-Schranke, keine echte Authentifizierung.
          </p>
        )}

        <div className="cosmos-scroll-panel min-h-0 flex-1 pr-1">
          <div className="database-tab-section">
            {createTabs.length ? <DatabaseTabGroup title="Erfassung" tabs={createTabs} activeTab={safeActiveTab} onSelect={setActiveTab} /> : null}
            <DatabaseTabGroup title="Wissen" tabs={reviewTabs} activeTab={safeActiveTab} onSelect={setActiveTab} />
          </div>

          {safeActiveTab === 'overview' ? (
            <div className="space-y-2 text-[10px] leading-relaxed text-[#d9d9d2]">
              <ArchiveRow label="Modus" value="Statischer öffentlicher Atlas / Browser-Entwürfe nur lokal" />
              <ArchiveRow label="Speicher" value={`${archivePreview.storage_target.database.toUpperCase()} Metadaten-Vorschau / R2 vorbereitet`} />
              <ArchiveRow label="Status" value={`D1 preview bereit / ${archivePreview.storage_target.frontend_connection.replace(/_/g, ' ')}`} />
              <ArchiveRow label="D1" value={`${archivePreview.storage_target.database_name} / geprüft ${archivePreview.storage_target.last_verified}`} />
              <ArchiveRow label="R2" value={`${archivePreview.storage_target.assets_bucket_name ?? 'nicht konfiguriert'} / keine Uploads`} />
              <ArchiveRow label="Assets" value={archivePreview.storage_target.assets_status.replace(/_/g, ' ')} />
              <ArchiveRow label="Pilot" value={`${pilotEntry.title}, ${pilotEntry.year_start}, ${pilotEntry.city}`} />
              {selectedEntry ? <ArchiveRow label="Aktuell" value={`${selectedEntry.title} / ${selectedEntry.database_profile?.status ?? 'local entry'}`} /> : null}
              <div className="grid grid-cols-3 gap-1.5">
                <BrainMiniMetric label="Brain-Tools" value={brainTools.tools.length} />
                <BrainMiniMetric label="Prüfung" value={reviewQueue.items.length} />
                <BrainMiniMetric label="Modus" value={brainTools.mode === 'local_review_only' ? 'lokal' : brainTools.mode} />
              </div>
              <p className="border border-[#00e7ff]/25 bg-[#061719] p-2 text-[#c9fff4]">
                Dieses Panel ist eine lokale Planungskonsole. Es kann Entwürfe in der Browser-Session vorbereiten, speichert aber nicht in D1, lädt nicht nach R2 hoch und veröffentlicht keine Nutzer- oder Privatdateien.
              </p>
              <p className="border border-[#f7f7f4]/15 bg-[#050505]/55 p-2 text-[#b8b8b2]">
                Spätere private Bibliotheken brauchen Authentifizierung, Cloudflare Access oder einen Identity Provider, signierte R2-Upload-URLs, Quarantäne, Rechteprüfung und manuelle Kontrolle vor jeder öffentlichen Veröffentlichung.
              </p>
              <ArchiveList
                title="So funktioniert dieses Panel"
                items={[
                  'KI Erfassen erzeugt einen temporären Entwurf aus Projektname, Adresse, Architekt oder Bildhinweis',
                  'Dateien sammelt Quellenmaterial nur in dieser Browser-Session',
                  'Entwurf erlaubt Prüfung und temporäres Hinzufügen eines lokalen Atlas-Eintrags',
                  'Wissens-Tabs zeigen die aktuelle statische Archivvorschau'
                ]}
              />
            </div>
          ) : null}

          {safeActiveTab === 'intake' ? (
            <div className="space-y-3 text-[10px] leading-relaxed text-[#d9d9d2]">
              <div
                className="database-dropzone"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={handleDrop}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00e7ff]">Quellenpaket ablegen</div>
                <p className="mt-2 text-[10px] leading-snug text-[#c7c7c2]">
                  PDFs, Scans, Pläne, Bilder, Videos, Textnotizen und Modelldateien. Diese Vorschau klassifiziert das Paket und zeigt, was für spätere Erfassung bereit ist.
                </p>
                <label className="mt-3 inline-flex cursor-none items-center border border-[#00e7ff]/60 px-3 py-1.5 text-[8.5px] uppercase tracking-[0.14em] text-[#9cfff7]">
                  Dateien wählen
                  <input
                    className="sr-only"
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.svg,.mp4,.mov,.glb,.gltf,.obj,.fbx,.ifc"
                    onChange={(event) => {
                      if (event.target.files) appendFiles(event.target.files);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  ['Dateien', intakeFiles.length],
                  ['Quellen', intakeStats.sources],
                  ['Bild/Plan', intakeStats.visual],
                  ['3D', intakeStats.model]
                ].map(([label, value]) => (
                  <div key={label} className="border border-[#f7f7f4]/14 bg-[#07181a]/70 px-2 py-1.5">
                    <div className="text-[13px] font-semibold leading-none text-[#f7f7f4]">{value}</div>
                    <div className="mt-1 truncate text-[7.5px] uppercase tracking-[0.12em] text-[#b8b8b2]">{label}</div>
                  </div>
                ))}
              </div>

              {intakeFiles.length ? (
                <div className="space-y-1.5">
                  {intakeFiles.map((file) => (
                    <div key={file.id} className="grid grid-cols-[62px_minmax(0,1fr)_58px] gap-2 border border-[#f7f7f4]/12 bg-[#07181a]/60 px-2 py-1.5">
                      <span className="text-[8px] uppercase tracking-[0.13em] text-[#00e7ff]">{fileKindLabel(file.kind)}</span>
                      <span className="truncate text-[9.5px] text-[#f7f7f4]">{file.name}</span>
                      <span className="text-right text-[8px] text-[#8d8d87]">{formatBytes(file.size)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="border border-[#f7f7f4]/12 bg-[#050505]/45 p-2 text-[#b8b8b2]">
                  Noch keine Dateien gesammelt. Füge ein Projektpaket hinzu, um Quellen-, Bild- und 3D-Bereitschaft zu sehen.
                </p>
              )}

              <div className="grid grid-cols-3 gap-1.5">
                <IntakeAction label="Erfassen" bereit={intakeFiles.length > 0} />
                <IntakeAction label="3D Plan" bereit={intakeStats.sources + intakeStats.visual > 1} />
                <IntakeAction label="Splat" bereit={intakeStats.video > 0 || intakeStats.image >= 20} />
              </div>

              <button
                type="button"
                className="w-full border border-[#f7f7f4]/25 px-2 py-1.5 text-[8.5px] uppercase tracking-[0.14em] text-[#d9d9d2]"
                onClick={() => onIntakeFilesChange([])}
              >
                Gesammelte Dateien leeren
              </button>
            </div>
          ) : null}

          {safeActiveTab === 'books' ? (
            <DatabaseBookLibraryView intakeStats={intakeStats} intakeFiles={intakeFiles} onDrop={handleDrop} appendFiles={appendFiles} />
          ) : null}

          {safeActiveTab === 'generate' ? (
            <div className="space-y-3 text-[10px] leading-relaxed text-[#d9d9d2]">
              <div className="database-generate-sticky">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00e7ff]">Dev KI Erfassen</div>
                    <p className="mt-1 text-[9px] leading-snug text-[#b8b8b2]">
                    Projektname, Adresse, Architekt oder Bildhinweis eingeben. Der Entwurf wird jedes Mal neu aufgebaut.
                    </p>
                  </div>
                <div className="shrink-0 border border-[#00e7ff]/35 px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-[#00e7ff]">
                  Oben starten
                </div>
              </div>

              <div
                className="database-image-identify"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={handleIdentifyImageDrop}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00e7ff]">Bild erkennen</div>
                    <p className="mt-1 text-[9.5px] leading-snug text-[#b8b8b2]">
                      Ziehe ein Gebäudebild hinein. V1 liest Dateiname und Kontext-Hinweise und setzt den Entwurf vor jedem neuen Resultat zurück.
                    </p>
                  </div>
                  <label className="shrink-0 cursor-none border border-[#00e7ff]/60 px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-[#9cfff7]">
                    Bild wählen
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) stageIdentifyImage(file);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>

                {imageIdentify.previewUrl ? (
                  <div className="mt-3 grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Local browser preview uses a blob URL. */}
                    <img className="h-20 w-24 object-cover" src={imageIdentify.previewUrl} alt="Vorschau der Bilderkennung" />
                    <div className="min-w-0">
                      <div className="truncate text-[10px] text-[#f7f7f4]">{imageIdentify.fileName}</div>
                      <div className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[#8d8d87]">
                        {imageIdentify.status === 'erkannt' ? `erkannt / ${Math.round((imageIdentify.candidate?.confidence ?? 0) * 100)}%` : imageIdentify.status === 'unknown' ? 'braucht manuelle Recherche' : 'bereit zur Analyse'}
                      </div>
                      {imageIdentify.candidate ? (
                        <p className="mt-1 line-clamp-2 text-[9px] leading-snug text-[#c9fff4]">{imageIdentify.candidate.project} / {imageIdentify.candidate.reason}</p>
                      ) : null}
                      <button
                        type="button"
                        className="mt-2 border border-[#00e7ff]/70 px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-[#00e7ff]"
                        onClick={identifyDroppedImage}
                      >
                        Bild analysieren
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 border border-dashed border-[#f7f7f4]/18 bg-[#050505]/45 px-3 py-4 text-center text-[8.5px] uppercase tracking-[0.16em] text-[#8d8d87]">
                    Bild hier ablegen
                  </div>
                )}
              </div>

              <DraftInput label="Projekt" value={researchSeed.project} onChange={(value) => updateResearchSeed('project', value)} />
              <DraftInput label="Architekt" value={researchSeed.architect} onChange={(value) => updateResearchSeed('architect', value)} />
              <DraftInput label="Adresse / Ort" value={researchSeed.address} onChange={(value) => updateResearchSeed('address', value)} />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="border border-[#f7f7f4]/25 px-2 py-2 text-[8.5px] uppercase tracking-[0.14em] text-[#d9d9d2]"
                  onClick={loadIngenbohlSample}
                >
                  Beispiel laden
                </button>
                <button
                  type="button"
                  className="border border-[#00e7ff]/55 px-2 py-2 text-[8.5px] uppercase tracking-[0.14em] text-[#00e7ff]"
                  onClick={generateResearchEntwurf}
                >
                  Entwurf erzeugen
                </button>
              </div>

              <p className="border border-[#f7f7f4]/12 bg-[#050505]/45 p-2 text-[9.5px] leading-snug text-[#b8b8b2]">
                Beispiel laden setzt ein bekanntes Testprojekt ein. Entwurf erzeugen wandelt die aktuellen Eingaben in einen editierbaren Browser-Entwurf um.
              </p>

              <ArchiveList
                title="Nächster Ablauf"
                items={[
                  'Aus den aktuellen Eingaben entsteht ein sauberer editierbarer Entwurf',
                  'Alter Projekttext wird gelöscht, bevor eine neue Bildanalyse angewendet wird',
                  'Browser-Eintrag erstellen fügt ihn nur dieser Session hinzu; er ist nicht öffentlich und nicht in D1/R2 gespeichert'
                ]}
              />
            </div>
          ) : null}

          {safeActiveTab === 'analysis' ? (
            <DatabaseAnalysisPackView pack={currentAnalysisPack} fallbackEntry={currentEntry} />
          ) : null}

          {safeActiveTab === 'entries' ? (
            <div className="space-y-2">
              {currentEntry ? (
                <ArchiveList
                  title={selectedEntry ? 'Aktueller Eintrag' : 'Pilot-Eintrag'}
                  items={[
                    `${currentEntry.title} / ${currentEntry.entry_type} / ${currentEntry.style_sector}`,
                    `${currentEntry.authors.join(', ') || 'Unbekannte Autorenschaft'} / ${currentEntry.country ?? 'kein Land'}`,
                    `Status: ${currentProfile?.status ?? 'lokaler Entwurf'}`,
                    `R2 prefix: ${currentProfile?.r2_prefix ?? `entries/${currentEntry.slug}`}`
                  ]}
                />
              ) : null}
              <ArchiveList title="Pilot-Eintrag" items={[`${pilotEntry.title} / ${pilotEntry.entry_type} / ${pilotEntry.style_sector}`, `${pilotEntry.authors_json} / ${pilotEntry.country}`, `R2 prefix: ${pilotEntry.r2_prefix}`]} />
            </div>
          ) : null}

          {safeActiveTab === 'sources' ? (
            <ArchiveCards items={selectedEntry ? sourceCardsForEntry(selectedEntry) : archivePreview.entry_sources.map((source) => ({ title: source.title, meta: `${source.source_type} / ${source.reliability_level}`, body: source.notes }))} />
          ) : null}

          {safeActiveTab === 'media' ? (
            <ArchiveCards items={currentEntry ? currentEntry.media.map((media) => {
              const mediaUrl = publicDisplayMediaUrl(media);
              return {
                title: media.label,
                meta: `${media.type} / ${media.credit ?? 'Platzhalter'}`,
                body: `${media.placeholder}${mediaUrl ? ` / ${mediaUrl}` : ' / kein öffentliches Bild angehängt'}`,
                imageUrl: mediaUrl ?? undefined
              };
            }) : archivePreview.entry_media.map((media) => ({ title: media.title, meta: `${media.media_type} / ${media.copyright_status}`, body: media.caption }))} />
          ) : null}

          {safeActiveTab === 'models' ? (
            <ArchiveCards items={(currentEntry?.model_assets?.length ? currentEntry.model_assets : archivePreview.entry_models).map((model) => ({ title: model.title, meta: `${model.model_type} / ${model.review_status} / confidence ${model.confidence_score ?? 'n/a'}`, body: model.source_basis }))} />
          ) : null}

          {safeActiveTab === 'relations' ? (
            <ArchiveList title="Wissensgraph" items={[`${relations.length} lokale Relationen aktuell verfügbar`, 'D1-Tabelle ist für Einfluss-, Themen-, Quellen- und Strukturrelationen vorbereitet', 'Das Hover-Netzwerk kann später denselben Graph statt lokaler JSON-Daten lesen']} />
          ) : null}

          {safeActiveTab === 'brain' ? (
            <div className="space-y-2 text-[10px] leading-relaxed text-[#d9d9d2]">
              <ArchiveRow label="Modus" value={brainTools.mode === 'local_review_only' ? 'Lokaler Prüfmodus / keine automatischen Schreibvorgänge' : brainTools.mode} />
              <ArchiveRow label="Öffentlich" value={brainTools.writes_public_database || brainTools.uploads_assets ? 'Aktionen durch Freigabe-Gate gesperrt' : 'Keine Datenbank-Schreibvorgänge, keine Asset-Uploads'} />
              <ArchiveRow label="Prüfung" value={`${reviewQueue.items.length} offene manuelle Freigaben`} />
              <ArchiveCards
                items={brainTools.tools.map((tool) => ({
                  title: tool.label,
                  meta: tool.id.replace(/_/g, ' '),
                  body: `${tool.purpose} Befehl: ${tool.command}`
                }))}
              />
              <ArchiveList title="Brain-Leitplanken" items={brainTools.guardrails} />
            </div>
          ) : null}

          {safeActiveTab === 'draft' ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[9px] uppercase tracking-[0.16em] text-[#b8b8b2]">Neuer Eintragsentwurf / nur Browser-Session</div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="border border-[#00e7ff]/80 bg-[#00e7ff] px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#050505]"
                    onClick={() => onCreateLocalEntry(draft)}
                  >
                    Browser-Eintrag erstellen
                  </button>
                  <button
                    type="button"
                    className="border border-[#f7f7f4]/25 px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-[#d9d9d2]"
                    onClick={resetPanelEntwurf}
                  >
                    Leeren
                  </button>
                </div>
              </div>
              <p className="mb-2 border border-[#00e7ff]/25 bg-[#061719] p-2 text-[9.5px] leading-snug text-[#c9fff4]">
                Erstellt nur in dieser Browser-Session einen temporären Atlas-Eintrag. Persistente D1-Speicherung, private Bibliotheken und Uploads folgen erst in einem geschützten Backend-Schritt.
              </p>
              <div className="mb-2 grid grid-cols-3 gap-1.5">
                {draftReadiness(draft).map((item) => (
                  <div key={item.label} className={`border px-2 py-1 ${item.bereit ? 'border-[#00e7ff]/45 bg-[#061719]' : 'border-[#f7f7f4]/14 bg-[#050505]/55'}`}>
                    <div className={`text-[10px] font-semibold ${item.bereit ? 'text-[#00e7ff]' : 'text-[#8d8d87]'}`}>{item.bereit ? 'bereit' : 'offen'}</div>
                    <div className="mt-0.5 truncate text-[7.5px] uppercase tracking-[0.1em] text-[#b8b8b2]">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DraftInput label="Titel" value={draft.title} onChange={(value) => updateField('title', value)} />
                <DraftInput label="Jahr" value={draft.year} onChange={(value) => updateField('year', value)} />
                <DraftSelect label="Typ" value={draft.entry_type} options={entryTypeOptions} onChange={(value) => updateField('entry_type', value as Entry['entry_type'])} />
                <DraftSelect label="Stil" value={draft.style_sector} options={styleSectors.map((sector) => ({ value: sector.id, label: styleShortLabel(sector.id) }))} onChange={(value) => updateField('style_sector', value as StyleSectorId)} />
                <DraftInput label="Stadt" value={draft.city} onChange={(value) => updateField('city', value)} />
                <DraftInput label="Land" value={draft.country} onChange={(value) => updateField('country', value)} />
                <DraftInput label="Autorenschaft" value={draft.authors} onChange={(value) => updateField('authors', value)} />
                <DraftInput label="Themen" value={draft.themes} onChange={(value) => updateField('themes', value)} />
                <DraftInput label="Kurse" value={draft.lecture_cluster} onChange={(value) => updateField('lecture_cluster', value)} />
                <DraftSelect
                  label="Rechte"
                  value={draft.copyright_status}
                  options={[
                    { value: 'needs_permission', label: 'Rechte offen' },
                    { value: 'private_research', label: 'Private Recherche' },
                    { value: 'licensed', label: 'Lizenziert' },
                    { value: 'public_domain', label: 'Gemeinfrei' },
                    { value: 'own_work', label: 'Eigene Arbeit' }
                  ]}
                  onChange={(value) => updateField('copyright_status', value as EntryEntwurf['copyright_status'])}
                />
              </div>
              <DraftInput label="Quellen-URL" value={draft.source_url} onChange={(value) => updateField('source_url', value)} />
              <DraftInput label="Quellendokumente" value={draft.source_documents} onChange={(value) => updateField('source_documents', value)} />
              <label className="mt-2 block text-[9px] uppercase tracking-[0.16em] text-[#b8b8b2]">
                Kurztext
                <textarea
                  className="mt-1 h-11 w-full resize-none border border-[#f7f7f4]/20 bg-[#07181a] px-2 py-1 text-[11px] leading-tight text-[#f7f7f4] outline-none"
                  value={draft.short_description}
                  maxLength={180}
                  onChange={(event) => updateField('short_description', event.target.value)}
                />
              </label>
              <label className="mt-2 block text-[9px] uppercase tracking-[0.16em] text-[#b8b8b2]">
                Ein Satz
                <textarea
                  className="mt-1 h-11 w-full resize-none border border-[#f7f7f4]/20 bg-[#07181a] px-2 py-1 text-[11px] leading-tight text-[#f7f7f4] outline-none"
                  value={draft.one_sentence}
                  maxLength={240}
                  onChange={(event) => updateField('one_sentence', event.target.value)}
                />
              </label>
              <label className="mt-2 block text-[9px] uppercase tracking-[0.16em] text-[#b8b8b2]">
                Vollbeschreibung
                <textarea
                  className="mt-1 h-16 w-full resize-none border border-[#f7f7f4]/20 bg-[#07181a] px-2 py-1 text-[11px] leading-tight text-[#f7f7f4] outline-none"
                  value={draft.full_description}
                  maxLength={760}
                  onChange={(event) => updateField('full_description', event.target.value)}
                />
              </label>
              <ArchiveList
                title="Lokale nächste Befehle"
                items={[
                  `npm run archive:draft -- --input data/drafts/${preview.slug}.json`,
                  `npm run archive:asset-manifest -- --entry ${preview.slug} --copyright ${draft.copyright_status}`,
                  `npm run archive:model-plan -- --entry ${preview.slug}`
                ]}
              />
              <pre className="mt-3 max-h-[168px] overflow-y-auto whitespace-pre-wrap border border-[#00e7ff]/25 bg-black/35 p-2 text-[9px] leading-snug text-[#c9fff4]">
                {JSON.stringify(preview, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
  );

  const htmlPanelStyle = renderMode === 'html' && !ui.isCoarsePointer ? {
    left: x,
    top: y,
    width: panelWidth,
    height: panelHeight
  } as CSSProperties : undefined;

  if (renderMode === 'html') {
    return (
      <div
        className={`database-draft database-archive-panel ${ui.isCoarsePointer ? 'database-mobile-overlay' : 'database-desktop-overlay'}`}
        style={htmlPanelStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Architektur Kosmos Datenbank"
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {panelContent}
      </div>
    );
  }

  return (
    <foreignObject x={x} y={y} width={panelWidth} height={panelHeight} className="database-draft database-archive-panel" pointerEvents="auto">
      {panelContent}
    </foreignObject>
  );
}

function ArchiveRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-3 border-b border-[#f7f7f4]/10 pb-1.5">
      <span className="w-20 shrink-0 overflow-hidden text-ellipsis text-[8px] uppercase tracking-[0.12em] text-[#00e7ff]">{label}</span>
      <span className="min-w-0 overflow-wrap-anywhere text-[#f7f7f4]">{value}</span>
    </div>
  );
}

function BrainMiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-[#00e7ff]/18 bg-[#061719]/82 px-2 py-1.5">
      <div className="truncate text-[12px] font-semibold leading-none text-[#f7f7f4]">{value}</div>
      <div className="mt-1 truncate text-[7px] uppercase tracking-[0.12em] text-[#9cfff7]/72">{label}</div>
    </div>
  );
}

function DatabaseIntakeModes({ developerMode, onSelectDev }: { developerMode: boolean; onSelectDev: () => void }) {
  return (
    <div className="database-intake-modes mb-3">
      <div className="database-intake-card database-intake-card-active" aria-current="true">
        <div className="database-intake-card-head">
          <strong>Gast-Antrag</strong>
          <span className="database-intake-status">Aktiv</span>
        </div>
        <span>Projektinformationen sammeln und als public-safe Vorschlag vorbereiten.</span>
      </div>
      <div className="database-intake-card database-intake-card-planned" aria-disabled="true">
        <div className="database-intake-card-head">
          <strong>Nutzerkonto</strong>
          <span className="database-intake-status">Geplant</span>
        </div>
        <span>Geplant: private Bibliothek mit lokalem Projektordner und Datenblatt-Download.</span>
      </div>
      <button
        type="button"
        className={`database-intake-card ${developerMode ? 'database-intake-card-dev' : 'database-intake-card-locked'}`}
        data-database-action="dev"
        disabled={!developerMode}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelectDev();
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="database-intake-card-head">
          <strong>{developerMode ? 'Dev starten' : 'Dev-Modus'}</strong>
          <span className="database-intake-status">{developerMode ? 'Bereit' : 'Gesperrt'}</span>
        </div>
        <span>Geschützte Vollerfassung für private Recherche; unter Suche mit Code freischalten.</span>
      </button>
    </div>
  );
}

function DatabaseBookLibraryView({
  intakeStats,
  intakeFiles,
  onDrop,
  appendFiles
}: {
  intakeStats: ReturnType<typeof summarizeIntakeFiles>;
  intakeFiles: IntakeFile[];
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  appendFiles: (files: FileList | File[]) => void;
}) {
  const bookReady = intakeStats.book + intakeStats.pdf + intakeStats.image > 0;
  const detectedBookFiles = intakeFiles.filter((file) => file.kind === 'book' || file.kind === 'pdf' || file.kind === 'image');

  return (
    <div className="space-y-3 text-[10px] leading-relaxed text-[#d9d9d2]">
      <div className="database-book-hero">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f5b342]">Buchbibliothek / Privatarchiv</div>
          <p className="mt-1 text-[10px] leading-snug text-[#f7f7f4]/78">
            Private Buchscans, Handyfotos und PDFs werden zu lokalen Prüfpaketen. Keine Veröffentlichung, keine Cloud, keine Datenbank-Schreibvorgänge.
          </p>
        </div>
        <span>{bookReady ? 'bereit' : 'geplant'}</span>
      </div>

      <div
        className="database-book-dropzone"
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onDrop={onDrop}
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f5b342]">Buchmaterial ablegen</div>
        <p className="mt-2 text-[9.5px] leading-snug text-[#c7c7c2]">
          Buch-PDFs, Kapitel, Scans, Doppelseiten oder Handyfotos. Aktuell Browser-Vorschau und lokale Pipeline: Import, Projektentwürfe, Entwurfsprüfung.
        </p>
        <label className="mt-3 inline-flex cursor-none items-center border border-[#f5b342]/70 px-3 py-1.5 text-[8.5px] uppercase tracking-[0.14em] text-[#ffe1a3]">
          Buchdateien wählen
          <input
            className="sr-only"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff,.txt,.md"
            onChange={(event) => {
              if (event.target.files) appendFiles(event.target.files);
              event.currentTarget.value = '';
            }}
          />
        </label>
      </div>

      <div className="database-book-grid">
        <BookPipelineCard title="1 Reinigung" body="Seiten ausrichten, zuschneiden, Doppelseiten trennen, Kontrast und Schatten korrigieren." active={bookReady} />
        <BookPipelineCard title="2 OCR/Layout" body="Text, Bildblöcke, Pläne, Bildlegenden, Kapitel und Projektlisten erkennen." active={bookReady} />
        <BookPipelineCard title="3 Projekte" body="Projektgruppen mit Titel, Architekt, Jahr, Ort, Seitenreferenzen und Konfidenzwert bilden." active={bookReady} />
        <BookPipelineCard title="4 Rechte-Gate" body="Private Quellenpakete strikt von public-safe Metadaten und Paraphrasen trennen." active={bookReady} />
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <BrainMiniMetric label="Buch/PDF" value={intakeStats.book + intakeStats.pdf} />
        <BrainMiniMetric label="Seitenbilder" value={intakeStats.image} />
        <BrainMiniMetric label="Text" value={intakeStats.sources} />
        <BrainMiniMetric label="Öffentlich" value="Gate" />
      </div>

      <ArchiveList
        title="Private / öffentliche Trennung"
        items={[
          'Privatarchiv: gereinigte Seiten, OCR, Seitenverweise und Projektentwürfe nur für den Besitzer',
          'Öffentliche Website: nur Bibliografie, Metadaten, Links und paraphrasierte Analyse nach Rechteprüfung',
          'Dev-Modus: tiefere interne Research-Pakete, aber keine automatische Veröffentlichung'
        ]}
      />

      {detectedBookFiles.length ? (
        <ArchiveCards
          items={detectedBookFiles.slice(0, 6).map((file) => ({
            title: file.name,
            meta: `${fileKindLabel(file.kind)} / ${formatBytes(file.size)}`,
            body: file.kind === 'book'
              ? 'Wird als Buch-/Kapitelquelle klassifiziert und später für OCR und Projekt-Clustering vorbereitet.'
              : 'Kann als Buchseite, Bildtafel oder ergänzende Quelle in das private Quellenpaket eingehen.'
          }))}
        />
      ) : (
        <p className="border border-[#f5b342]/24 bg-[#1a1105]/68 p-2 text-[9.5px] leading-snug text-[#ffe1a3]">
          Noch kein Buchmaterial gesammelt. Diese Funktion ist als private Bibliothek geplant und speichert aktuell nichts dauerhaft.
        </p>
      )}

      <ArchiveList
        title="Späterer lokaler Befehl"
        items={[
          'npm run kosmodata:book-ingest -- --input archive-inbox/books/{book_slug} --title "Buchtitel"',
          'npm run kosmodata:book-drafts -- --book {book_slug}',
          'npm run kosmodata:book-pipeline -- --input archive-inbox/books/{book_slug} --title "Buchtitel"',
          'Ausgabe: clean-pages, OCR, detected-projects.json, source-map.json und review-report.md'
        ]}
      />
    </div>
  );
}

function BookPipelineCard({ title, body, active }: { title: string; body: string; active: boolean }) {
  return (
    <div className={`database-book-card ${active ? 'database-book-card-active' : ''}`}>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function DatabaseTabGroup({
  title,
  tabs,
  activeTab,
  onSelect
}: {
  title: string;
  tabs: Array<{ id: DatabaseTab; label: string; hint: string }>;
  activeTab: DatabaseTab;
  onSelect: (tab: DatabaseTab) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[8px] uppercase tracking-[0.18em] text-[#00e7ff]/80">{title}</div>
      <div className="database-tab-grid">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`database-tab ${activeTab === tab.id ? 'database-tab-active' : ''}`}
            data-database-tab={tab.id}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelect(tab.id);
            }}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(tab.id);
            }}
          >
            <span>{tab.label}</span>
            <small>{tab.hint}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function DatabaseFlowSteps({ current }: { current: 'research' | 'analysis' | 'draft' | 'review' }) {
  const steps = [
    { id: 'research', label: 'Recherchepaket' },
    { id: 'analysis', label: 'Analysepaket' },
    { id: 'draft', label: 'Entwurf' },
    { id: 'review', label: 'Bereit zur Prüfung' }
  ] as const;
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <div className="database-flow-steps" aria-label="Datenbank-Workflow">
      {steps.map((step, index) => (
        <div key={step.id} className={`database-flow-step ${index <= currentIndex ? 'database-flow-step-active' : ''}`}>
          <span>{index + 1}</span>
          <small>{step.label}</small>
        </div>
      ))}
    </div>
  );
}

function databaseWorkflowStage(tab: DatabaseTab): 'research' | 'analysis' | 'draft' | 'review' {
  if (tab === 'analysis' || tab === 'models' || tab === 'media') return 'analysis';
  if (tab === 'draft') return 'draft';
  if (tab === 'overview' || tab === 'entries' || tab === 'sources' || tab === 'relations' || tab === 'brain') return 'review';
  return 'research';
}

function isDevOnlyDatabaseTab(tab: DatabaseTab) {
  return tab === 'generate' || tab === 'analysis' || tab === 'draft';
}

function readDeveloperSession() {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(developerSessionKey) === 'unlocked';
  } catch {
    return false;
  }
}

function DatabaseAnalysisPackView({
  pack,
  fallbackEntry
}: {
  pack: (typeof analysisPreview.packs)[number] | null;
  fallbackEntry: Entry | null;
}) {
  if (!pack) {
    return (
      <div className="space-y-3 text-[10px] leading-relaxed text-[#d9d9d2]">
        <ArchiveList
          title="Analysepaket"
          items={[
            fallbackEntry ? `Noch kein statisches Analysepaket für ${fallbackEntry.title}` : 'Noch kein Analysepaket für den ausgewählten Eintrag',
            'Führe database:analyze im Terminal aus, um ein Recherche- und Analysepaket zu erzeugen',
            'Geprüfte Pakete können für die statische Anzeige in data/database-analysis-preview.json ergänzt werden'
          ]}
        />
      </div>
    );
  }

  const materialTags = pack.analysis_tags.filter((tag) => tag.startsWith('material:'));
  const structureTags = pack.analysis_tags.filter((tag) => tag.startsWith('structure:'));
  const tectonicTags = pack.analysis_tags.filter((tag) => tag.startsWith('analysis:') || tag.startsWith('spatial:') || tag.startsWith('landscape:'));

  return (
    <div className="space-y-3 text-[10px] leading-relaxed text-[#d9d9d2]">
      <div className="database-analysis-hero">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#00e7ff]">Analysepaket</div>
          <div className="mt-1 overflow-wrap-anywhere text-[15px] font-semibold leading-tight text-[#f7f7f4]">{pack.topic}</div>
          <div className="mt-1 overflow-wrap-anywhere text-[8.5px] uppercase tracking-[0.1em] text-[#b8b8b2]">{pack.agent} / {pack.readiness_score.label.replace(/_/g, ' ')}</div>
        </div>
        <div className="database-analysis-score">
          <span>{Math.round(pack.readiness_score.score * 100)}</span>
          <small>bereit</small>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <AnalysisMetric label="Quellenmix" value={pack.source_score.source_mix.replace(/_/g, ' ')} />
        <AnalysisMetric label="Primärquellen" value={`${pack.source_score.primary_sources}`} />
        <AnalysisMetric label="Rechte" value={pack.rights_summary.publication_default.replace(/_/g, ' ')} />
      </div>

      <AnalysisTagGroup title="Material" tags={materialTags} empty="Noch keine Material-Tags" />
      <AnalysisTagGroup title="Tragwerk" tags={structureTags} empty="Noch keine Tragwerk-Tags" />
      <AnalysisTagGroup title="Tektonik / Ort" tags={tectonicTags} empty="Noch keine Tektonik-Tags" />

      <ArchiveList
        title="3D / Blender-Ebenen"
        items={[
          `Bereitschaft: ${pack.model_potential.readiness.replace(/_/g, ' ')} / Wert ${Math.round(pack.model_potential.score * 100)}%`,
          `Ebenen: ${pack.model_potential.recommended_layers.join(', ')}`,
          `Blender-Sammlungen: ${pack.model_potential.blender_collections.join(', ')}`
        ]}
      />

      <ArchiveCards
        items={pack.source_assessments.slice(0, 5).map((source) => ({
          title: source.name,
          meta: `${source.reliability} / ${Math.round(source.confidence * 100)}% / ${source.rights_decision.replace(/_/g, ' ')}`,
          body: source.recommended_use
        }))}
      />

      <ArchiveList
        title="Rechte-Gate"
        items={[
          pack.rights_summary.note,
          ...pack.readiness_score.blockers.map((blocker) => `Blocker: ${blocker}`)
        ]}
      />
    </div>
  );
}

function AnalysisMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#f7f7f4]/12 bg-[#07181a]/65 px-2 py-1.5">
      <div className="truncate text-[9.5px] font-semibold text-[#f7f7f4]">{value}</div>
      <div className="mt-1 truncate text-[7.5px] uppercase tracking-[0.1em] text-[#b8b8b2]">{label}</div>
    </div>
  );
}

function AnalysisTagGroup({ title, tags, empty }: { title: string; tags: string[]; empty: string }) {
  return (
    <div>
      <div className="mb-2 text-[9px] uppercase tracking-[0.18em] text-[#00e7ff]">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {(tags.length ? tags : [empty]).slice(0, 10).map((tag) => (
          <span key={tag} className="border border-[#00e7ff]/24 bg-[#061719]/80 px-2 py-1 text-[8.5px] leading-tight text-[#d9d9d2]">
            {tag.replace(/^[^:]+:/, '').replace(/-/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}

function ArchiveList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 text-[9px] uppercase tracking-[0.18em] text-[#00e7ff]">{title}</div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item} className="min-w-0 overflow-wrap-anywhere border border-[#f7f7f4]/12 bg-[#07181a]/60 px-2 py-1.5 text-[10px] leading-snug text-[#d9d9d2]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function IntakeAction({ label, bereit }: { label: string; bereit: boolean }) {
  return (
    <div className={`border px-2 py-1.5 ${bereit ? 'border-[#00e7ff]/55 bg-[#061719]' : 'border-[#f7f7f4]/14 bg-[#050505]/55'}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${bereit ? 'text-[#00e7ff]' : 'text-[#8d8d87]'}`}>{label}</div>
      <div className="mt-1 text-[7.5px] uppercase tracking-[0.1em] text-[#b8b8b2]">{bereit ? 'bereit' : 'braucht Input'}</div>
    </div>
  );
}

function ArchiveCards({ items }: { items: Array<{ title: string; meta: string; body: string; imageUrl?: string }> }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={`${item.title}-${item.meta}`} className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] gap-2 border border-[#f7f7f4]/12 bg-[#07181a]/60 p-2">
          <div className="h-11 overflow-hidden border border-[#f7f7f4]/12 bg-[#050505]/72">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Database preview renders licensed/static URLs without Next image optimization.
              <img src={item.imageUrl} alt="" className="h-full w-full object-cover opacity-90" loading="lazy" />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_35%_25%,rgb(247_247_244_/_0.22),rgb(0_231_255_/_0.12)_42%,rgb(5_5_5_/_0.92)_100%)]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[10px] font-semibold text-[#f7f7f4]">{item.title}</div>
            <div className="mt-1 truncate text-[8px] uppercase tracking-[0.14em] text-[#00e7ff]">{item.meta}</div>
            <p className="mt-1 line-clamp-3 text-[9.5px] leading-snug text-[#c7c7c2]">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function classifyIntakeFile(name: string): IntakeFile['kind'] {
  const normalized = name.toLowerCase();
  if (/(book|buch|catalog|katalog|monograph|monografie|reader|chapter|kapitel|isbn)/i.test(normalized)) return 'book';
  if (normalized.endsWith('.pdf')) return 'pdf';
  if (/\.(jpg|jpeg|png|webp|tif|tiff)$/i.test(normalized)) return normalized.includes('plan') || normalized.includes('section') || normalized.includes('schnitt') || normalized.includes('grundriss') ? 'plan' : 'image';
  if (/\.(svg|dwg|dxf)$/i.test(normalized)) return 'plan';
  if (/\.(mp4|mov|m4v|avi)$/i.test(normalized)) return 'video';
  if (/\.(glb|gltf|obj|fbx|ifc|blend)$/i.test(normalized)) return 'model';
  if (/\.(txt|md|rtf|doc|docx)$/i.test(normalized)) return 'text';
  return 'other';
}

function fileKindLabel(kind: IntakeFile['kind']) {
  const labels: Record<IntakeFile['kind'], string> = {
    pdf: 'PDF',
    book: 'Buch',
    image: 'Bild',
    plan: 'Plan',
    video: 'Video',
    model: '3D',
    text: 'Text',
    other: 'Datei'
  };
  return labels[kind];
}

function summarizeIntakeFiles(files: IntakeFile[]) {
  return files.reduce(
    (summary, file) => {
      if (file.kind === 'pdf') {
        summary.pdf += 1;
        summary.sources += 1;
      }
      if (file.kind === 'text') summary.sources += 1;
      if (file.kind === 'book') {
        summary.book += 1;
        summary.sources += 1;
      }
      if (file.kind === 'image') summary.image += 1;
      if (file.kind === 'video') summary.video += 1;
      if (file.kind === 'plan') summary.plan += 1;
      if (file.kind === 'model') summary.model += 1;
      if (file.kind === 'image' || file.kind === 'plan' || file.kind === 'video') summary.visual += 1;
      return summary;
    },
    { sources: 0, pdf: 0, book: 0, image: 0, plan: 0, video: 0, visual: 0, model: 0 }
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function sourceCardsForEntry(entry: Entry) {
  const cards = [];

  if (entry.source_url) {
    cards.push({
      title: entry.source_url.includes('afasia') ? 'Afasia-Projektquelle' : 'Verknüpfte Webquelle',
      meta: entry.source_quality || 'Quelle',
      body: entry.source_url
    });
  }

  (entry.source_documents ?? []).forEach((document) => {
    cards.push({
      title: document,
      meta: 'Vorlesungsreferenz',
      body: `Kurs- oder Dokumentcluster für ${entry.title}.`
    });
  });

  if (entry.source_assets?.length) {
    cards.push({
      title: `${entry.source_assets.length} Quellen-Assets`,
      meta: 'Asset-Paket',
      body: entry.source_assets.slice(0, 4).map((asset) => asset.label).join(' / ')
    });
  }

  if (cards.length === 0) {
    cards.push({
      title: 'Quellenplatzhalter',
      meta: 'ungeprüft',
      body: 'Für diesen Eintrag sind noch keine Quellenrecords verknüpft.'
    });
  }

  return cards;
}

function findAnalysisPackForEntry(entry: Entry | null) {
  if (!entry) return null;
  return analysisPreview.packs.find((pack) => pack.entry_slug === entry.slug || pack.entry_slug === entry.id) ?? null;
}

const entryTypeOptions: Array<{ value: Entry['entry_type']; label: string }> = [
  { value: 'building', label: 'Gebäude' },
  { value: 'urban_plan', label: 'Städtebau' },
  { value: 'landscape_project', label: 'Landschaft' },
  { value: 'text', label: 'Text' },
  { value: 'theory', label: 'Theorie' },
  { value: 'map', label: 'Karte' },
  { value: 'infrastructure', label: 'Infrastruktur' },
  { value: 'object', label: 'Objekt' },
  { value: 'event', label: 'Ereignis' }
];

function DraftInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-[9px] uppercase tracking-[0.16em] text-[#b8b8b2]">
      {label}
      <input
        className="mt-1 h-7 w-full border border-[#f7f7f4]/20 bg-[#07181a] px-2 text-[11px] text-[#f7f7f4] outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function DraftSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block text-[9px] uppercase tracking-[0.16em] text-[#b8b8b2]">
      {label}
      <select
        className="mt-1 h-7 w-full border border-[#f7f7f4]/20 bg-[#07181a] px-2 text-[11px] text-[#f7f7f4] outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function draftToEntryPreview(draft: EntryEntwurf) {
  const title = draft.title.trim() || 'Unbenannter Eintrag';
  const slug = slugify(title);
  const year = Number.parseInt(draft.year, 10) || 2025;
  const themes = splitList(draft.themes);
  const sourceDocuments = splitList(draft.source_documents);
  const lectureCluster = splitList(draft.lecture_cluster);
  const authors = splitList(draft.authors);
  const shortDescription = draft.short_description.trim() || `Archiv-Entwurf für ${title}.`;
  const oneSentence = draft.one_sentence.trim() || `${title} ist ein lokaler Architektur-Kosmos-Entwurf für Quellen-, Medien-, Modell- und Relationsprüfung.`;
  const fullDescription = draft.full_description.trim() || `${title} ist aktuell als lokaler Archiv-Entwurf vorgemerkt. Vor einer Veröffentlichung braucht der Eintrag Quellenprüfung, Medienrechteprüfung, Relationsmapping und Analyse-Layer-Klassifikation.`;
  const databaseTags = [
    `source:${draft.source_url.trim() ? 'web-source' : 'needs-source'}`,
    `typology:${draft.entry_type.replace(/_/g, '-')}`,
    `style:${draft.style_sector.replace(/_/g, '-')}`,
    ...themes.slice(0, 5).map((theme) => `theme:${slugify(theme)}`),
    ...lectureCluster.slice(0, 3).map((cluster) => `course:${slugify(cluster)}`),
    `rights:${draft.copyright_status.replace(/_/g, '-')}`,
    'analysis:needs-review'
  ];

  return {
    id: slug,
    slug,
    title,
    entry_type: draft.entry_type,
    year_start: year,
    year_end: null,
    authors: authors.length > 0 ? authors : ['Unbekannte Autorenschaft'],
    city: draft.city.trim(),
    country: draft.country.trim(),
    style_sector: draft.style_sector,
    lecture_cluster: lectureCluster.length > 0 ? lectureCluster : ['draft_import'],
    themes: themes.length > 0 ? themes : ['needs-review'],
    short_description: shortDescription,
    one_sentence: oneSentence,
    full_description: fullDescription,
    source_quality: draft.source_url.trim() || sourceDocuments.length > 0 ? 'draft_source_attached' : 'needs_source',
    source_documents: sourceDocuments.length > 0 ? sourceDocuments : ['Entwurfsnotiz zur Quelle'],
    source_url: draft.source_url.trim(),
    media: mediaTypes.map((type) => ({
      type,
      label: `${mediaTypeLabels[type]} Platzhalter`,
      placeholder: `${mediaTypeLabels[type]}-Medienslot für ${title} geplant.`,
      credit: draft.copyright_status
    })),
    database_tags: Array.from(new Set(databaseTags)),
    database_profile: {
      status: 'draft',
      r2_prefix: `entries/${slug}`,
      source_count: sourceDocuments.length + (draft.source_url.trim() ? 1 : 0),
      media_count: 4,
      model_count: 0,
      analysis_count: 0,
      tag_count: Array.from(new Set(databaseTags)).length
    }
  };
}

function draftToLocalEntry(draft: EntryEntwurf, existingEntries: Entry[]): Entry {
  const preview = draftToEntryPreview(draft);
  const existingIds = new Set(existingEntries.map((entry) => entry.id));
  const isBaseConflict = existingIds.has(preview.id);
  const id = isBaseConflict ? uniqueEntryId(`${preview.id}-draft`, existingIds) : preview.id;
  const slug = id;

  return {
    ...preview,
    id,
    slug,
    year_end: undefined,
    source_quality: `${preview.source_quality}_local_session`,
    database_tags: [...(preview.database_tags ?? []), 'status:local-session'],
    database_profile: {
      ...preview.database_profile,
      status: 'draft',
      r2_prefix: `entries/${slug}`
    },
    ingestion_status: {
      stage: 'ready_for_wormhole',
      source_status: preview.source_url || (preview.source_documents?.length ?? 0) > 0 ? 'candidate' : 'none',
      asset_status: 'candidate',
      model_status: 'planned',
      updated_at: new Date().toISOString()
    }
  };
}

function uniqueEntryId(baseId: string, existingIds: Set<string>) {
  if (!existingIds.has(baseId)) return baseId;
  let index = 2;
  let nextId = `${baseId}-${index}`;

  while (existingIds.has(nextId)) {
    index += 1;
    nextId = `${baseId}-${index}`;
  }

  return nextId;
}

function draftFromResearchSeed(seed: ResearchSeed): EntryEntwurf {
  const normalizedProjekt = seed.project.trim();
  const normalizedArchitekt = seed.architect.trim();
  const normalizedAddress = seed.address.trim();
  const isIngenbohl = normalizeForMatch(`${normalizedProjekt} ${normalizedArchitekt} ${normalizedAddress}`).includes('ingenbohl');

  if (isIngenbohl) {
    return {
      title: 'Alterszentrum Kloster Ingenbohl',
      year: '2023',
      entry_type: 'building',
      style_sector: 'sustainable_architecture',
      city: 'Brunnen',
      country: 'Schweiz',
      authors: 'Boltshauser Architekten, Roger Boltshauser',
      themes: 'adaptive reuse, monastery, care architecture, concrete structure, lime plaster, clay plaster, timber facade, inner courtyard, roof garden, existing fabric',
      lecture_cluster: 'Architektur-Kosmos Dev-Recherche, zeitgenössische Schweizer Architektur',
      source_documents: 'Boltshauser Architekten project page, Baunetz project report, swiss-architects project note',
      source_url: 'https://boltshauser.info/projekt/alterszentrum-kloster-ingenbohl/',
      short_description: 'Umbau und Erweiterung des Klosterareals Ingenbohl zu einem Alterszentrum mit präziser Einbindung in Bestand, Hofstruktur und Landschaft.',
      one_sentence: 'Das Alterszentrum Kloster Ingenbohl verbindet klösterlichen Bestand, neue Pflegearchitektur, Betontragwerk, mineralische Oberflächen und landschaftliche Terrassen zu einem zeitgenössischen Schweizer Umbauprojekt.',
      full_description: 'Der Umbau des Klosters Ingenbohl in Brunnen wird als Weiterbauen am Bestand gelesen: Die neue Struktur ergänzt das klösterliche Ensemble, arbeitet mit Hof, Sockel, Terrassen und präzisen Materialschichten und übersetzt Pflegearchitektur in eine ruhige räumliche Ordnung. Für den Architektur Kosmos ist das Projekt ein wichtiger Referenzknoten für Transformation, Tragwerk, Materialökologie und tektonische Analyse: Beton, mineralische Putze, Holz- und Fassadenschichten, innere Organisation und Landschaftsbezug lassen sich später als Modell- und Filterlayer auswerten.',
      copyright_status: 'needs_permission'
    };
  }

  const title = normalizedProjekt || 'Neuer Rechercheeintrag';
  const normalizedSeed = normalizeForMatch(`${normalizedProjekt} ${normalizedArchitekt} ${normalizedAddress}`);

  if (normalizedSeed.includes('kispi') || normalizedSeed.includes('kinderspital') || (normalizedSeed.includes('herzog') && normalizedSeed.includes('meuron'))) {
    return {
      title: 'Kinderspital Zürich',
      year: '2024',
      entry_type: 'building',
      style_sector: 'sustainable_architecture',
      city: 'Zürich',
      country: 'Schweiz',
      authors: 'Herzog & de Meuron',
      themes: 'hospital architecture, concrete frame, timber infill, healthcare, landscape campus, low-rise hospital, patient cottages, courtyard, daylight, children hospital',
      lecture_cluster: 'Architektur-Kosmos Dev-Recherche, zeitgenössische Schweizer Architektur',
      source_documents: 'Herzog & de Meuron project page, Kinderspital Zürich project information, architecture press review',
      source_url: 'https://www.herzogdemeuron.com/projects/377-kinderspital-zurich/',
      short_description: 'Neubau des Kinderspitals Zürich als flache, landschaftlich eingebettete Gesundheitsarchitektur mit starker Holz-, Licht- und Hoflogik.',
      one_sentence: 'Das Kinderspital Zürich von Herzog & de Meuron verbindet Gesundheitsbau, dreigeschossiges Betontragwerk, hölzerne Ausfachungen, Höfe, Tageslicht und landschaftliche Einbettung zu einem zeitgenössischen Spitaltyp.',
      full_description: 'Das Kinderspital Zürich wird als Referenz für eine neue Generation von Gesundheitsbauten gelesen: nicht als monolithisches Spital, sondern als räumlich gegliederte, horizontale und landschaftlich eingebundene Architektur. Der Akutspitalbereich wird als dreigeschossiger Betonrahmen mit komplexen hölzernen Ausfachungen beschrieben; im Inneren organisiert eine städtische Logik aus Strassen, Plätzen und grünen Höfen Orientierung und Tageslicht. Für Architektur Kosmos eignet sich das Projekt besonders für Material-, Tragwerks- und Atmosphärenanalyse: Betonrahmen, Holz, Glas, Vegetation, Patientenzimmer als kleine Cottages, Hofräume, Erschliessung und therapeutische Landschaft sollen später als filterbare 3D- und Datenbanklayer geprüft werden.',
      copyright_status: 'needs_permission'
    };
  }

  return {
    title,
    year: '2025',
    entry_type: 'building',
    style_sector: 'sustainable_architecture',
    city: normalizedAddress,
    country: '',
    authors: normalizedArchitekt,
    themes: 'needs research, source verification, rights review, material analysis, structure analysis, tectonic analysis',
    lecture_cluster: 'Architektur-Kosmos Dev-Recherche',
    source_documents: 'Generierter Rechercheauftrag / Quellen offen',
    source_url: '',
    short_description: `${title} ist für KI-gestützte Recherche und Archivklassifikation vorbereitet.`,
    one_sentence: `${title} ist ein Dev-Recherche-Seed für Quellensuche, Rechteprüfung, Medienaufnahme, Modellplanung und Analyseklassifikation.`,
    full_description: `${title} ist noch nicht verifiziert. Der nächste lokale Rechercheschritt sammelt offizielle Projektquellen, verlässliche Publikationen, rechteklare Medienkandidaten, Projektdaten, Struktur-/Material-/Tektonik-Hypothesen und mögliche Inputs für die Modellgenerierung.`,
    copyright_status: 'needs_permission'
  };
}

function identifyBuildingFromImageName(fileName: string, entries: Entry[]) {
  const normalizedFile = normalizeForMatch(fileName);

  const knownCandidates: Array<ResearchSeed & { confidence: number; reason: string; aliases: string[] }> = [
    {
      project: 'Villa Savoye',
      architect: 'Le Corbusier, Pierre Jeanneret',
      address: 'Poissy, France',
      confidence: 0.86,
      reason: 'Dateiname oder Kontext passt zu Villa-Savoye-Aliasnamen',
      aliases: ['villa-savoye', 'savoye', 'poissy', 'le-corbusier']
    },
    {
      project: 'Alterszentrum Kloster Ingenbohl',
      architect: 'Boltshauser Architekten / Roger Boltshauser',
      address: 'Klosterstrasse 20, 6440 Brunnen, Schweiz',
      confidence: 0.82,
      reason: 'Dateiname oder Kontext passt zu Ingenbohl-/Boltshauser-Aliasnamen',
      aliases: ['ingenbohl', 'boltshauser', 'brunnen', 'kloster']
    },
    {
      project: 'Kinderspital Zürich',
      architect: 'Herzog & de Meuron',
      address: 'Lenggstrasse 30, Zürich, Schweiz',
      confidence: 0.78,
      reason: 'Dateiname oder Kontext passt zu Kispi-/Kinderspital-Zürich-Aliasnamen',
      aliases: ['kispi', 'kinderspital', 'kinderspital-zuerich', 'kinderspital-zurich', 'children-hospital-zurich', 'herzog-de-meuron', 'lengg']
    }
  ];

  const matchedKnown = knownCandidates.find((candidate) => candidate.aliases.some((alias) => normalizedFile.includes(alias)));
  if (matchedKnown) return matchedKnown;

  const matchedEntry = entries.find((entry) => {
    const aliases = [entry.slug, entry.title, ...entry.authors, entry.city ?? '', entry.country ?? ''].map(normalizeForMatch).filter(Boolean);
    return aliases.some((alias) => alias.length > 4 && normalizedFile.includes(alias));
  });

  if (!matchedEntry) return null;

  return {
    project: matchedEntry.title,
    architect: matchedEntry.authors.join(', '),
    address: [matchedEntry.city, matchedEntry.country].filter(Boolean).join(', '),
    confidence: 0.72,
    reason: 'Dateiname passt zu einem bestehenden Architektur-Kosmos-Eintrag'
  };
}

function draftReadiness(draft: EntryEntwurf) {
  return [
    { label: 'Identität', bereit: Boolean(draft.title.trim() && draft.year.trim() && draft.authors.trim()) },
    { label: 'Ort', bereit: Boolean(draft.city.trim() || draft.country.trim()) },
    { label: 'Quellen', bereit: Boolean(draft.source_url.trim() || draft.source_documents.trim()) },
    { label: 'Themen', bereit: Boolean(draft.themes.trim() || draft.lecture_cluster.trim()) },
    { label: 'Text', bereit: Boolean(draft.short_description.trim() && draft.one_sentence.trim()) },
    { label: 'Rechte', bereit: draft.copyright_status !== 'needs_permission' }
  ];
}

const mediaTypes: Array<'exterior' | 'interior' | 'section' | 'plan'> = ['exterior', 'interior', 'section', 'plan'];
const mediaTypeLabels = {
  exterior: 'Außen',
  interior: 'Innen',
  section: 'Schnitt',
  plan: 'Plan'
} satisfies Record<(typeof mediaTypes)[number], string>;

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function slugify(value: string) {
  return normalizeForMatch(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-entry';
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function stripFileExtension(value: string) {
  return value
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

function SnappedEntryOverlay({ entry, onDismiss, onSelectFilter }: { entry: Entry; onDismiss: () => void; onSelectFilter: (filter: ProjectDetailFilter) => void }) {
  const ui = useAtlasUiMetrics();
  const cardScale = ui.dossier.cardScale;
  const cardWidth = 352 * cardScale;
  const cardHeight = 292 * cardScale;
  const cardX = atlasSize.cx - cardWidth / 2;
  const cardY = ui.dossier.cardY;
  const closeWidth = ui.dossier.closeWidth;
  const actionHeight = ui.dossier.actionHeight;
  const actionY = cardY + ui.dossier.actionOffsetY;
  const actionFont = ui.dossier.actionFontSize;

  return (
    <g className="dossier-overlay" pointerEvents="auto" opacity="1">
      <rect width={atlasSize.width} height={atlasSize.height} fill="#050505" opacity="0.34" onClick={onDismiss} />
      <circle cx={atlasSize.cx} cy={atlasSize.cy} r="252" fill="none" stroke="#f7f7f4" strokeWidth="0.8" strokeDasharray="1 13" opacity="0.22" />
      <g transform={`translate(${cardX - 12} ${cardY - 12})`}>
        <rect width={cardWidth + 24} height={cardHeight + 24} fill="#050505" stroke="#f7f7f4" strokeWidth="0.85" opacity="0.88" />
      </g>
      <g pointerEvents="auto" transform={`translate(${cardX} ${cardY}) scale(${cardScale})`}>
        <ProjectDetailCard entry={entry} x={0} y={0} onSelectFilter={onSelectFilter} />
      </g>
      <g
        className="dossier-close"
        pointerEvents="auto"
        transform={`translate(${cardX + cardWidth - closeWidth} ${actionY})`}
        role="button"
        tabIndex={0}
        aria-label="Projekt schließen"
        onClick={onDismiss}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onDismiss();
        }}
      >
        <rect width={closeWidth} height={actionHeight} fill="#f7f7f4" opacity="0.94" />
        <text x={closeWidth / 2} y={ui.isCoarsePointer ? 27 : 15} textAnchor="middle" fill="#050505" fontSize={actionFont} fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.14em">
          ZURÜCK
        </text>
      </g>
      <a href={`/atlas/${entry.slug}/`} className="dossier-page-link">
        <g pointerEvents="auto" transform={`translate(${cardX} ${actionY})`}>
          <rect width={ui.dossier.openWidth} height={actionHeight} fill="#050505" stroke="#f7f7f4" strokeWidth="0.58" opacity="0.9" />
          <text x={ui.dossier.openWidth / 2} y={ui.isCoarsePointer ? 27 : 15} textAnchor="middle" fill="#f7f7f4" fontSize={ui.isCoarsePointer ? 12 : 8.2} fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.13em">
            EINTRAG
          </text>
        </g>
      </a>
    </g>
  );
}

function ScreenCosmosCursor({ cursorRef, isDossierOpen, isOverlayOpen }: { cursorRef: RefObject<HTMLDivElement | null>; isDossierOpen: boolean; isOverlayOpen: boolean }) {
  return (
    <div ref={cursorRef} className={`screen-cosmos-cursor ${isDossierOpen ? 'screen-cosmos-cursor-dossier' : ''} ${isOverlayOpen ? 'screen-cosmos-cursor-overlay' : ''}`} aria-hidden="true">
      <span className="screen-cosmos-cursor-ring" />
      <span className="screen-cosmos-cursor-h screen-cosmos-cursor-line" />
      <span className="screen-cosmos-cursor-v screen-cosmos-cursor-line" />
      <span className="screen-cosmos-cursor-dot" />
    </div>
  );
}

function advanceTravel(current: number, delta: number) {
  const maxOverscroll = 0.065;

  if (current <= 0 && delta < 0) {
    return Math.max(-maxOverscroll, current + delta * 0.16);
  }

  if (current < 0 && delta > 0) {
    return Math.min(0, current + delta * 0.78);
  }

  if (current >= wormholeTravelEnd && delta > 0) {
    return Math.min(wormholeTravelEnd + maxOverscroll, current + delta * 0.16);
  }

  if (current > wormholeTravelEnd && delta < 0) {
    return Math.max(wormholeTravelEnd, current + delta * 0.78);
  }

  const next = current + delta;
  if (next < 0) return next * 0.22;
  if (next > wormholeTravelEnd) return wormholeTravelEnd + (next - wormholeTravelEnd) * 0.22;
  return next;
}

function clampVisualZoom(value: number) {
  return Math.max(1, Math.min(2.65, value));
}

function clampVisualPan(value: VisualPan, zoom: number) {
  const zoomExcess = Math.max(0, zoom - 1);
  const maxX = Math.min(360, atlasSize.width * zoomExcess * 0.24);
  const maxY = Math.min(270, atlasSize.height * zoomExcess * 0.24);

  return {
    x: Math.max(-maxX, Math.min(maxX, value.x)),
    y: Math.max(-maxY, Math.min(maxY, value.y))
  };
}

function roundZoom(value: number) {
  return Math.round(value * 1000) / 1000;
}
