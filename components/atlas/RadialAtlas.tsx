'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent, type RefObject, type TouchEvent as ReactTouchEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { ProjectDetailCard } from '@/components/atlas/ProjectDetailCard';
import { ProjectSearch } from '@/components/atlas/ProjectSearch';
import { RelationOverlay } from '@/components/atlas/RelationOverlay';
import { SemanticEntryNode } from '@/components/atlas/SemanticEntryNode';
import { StyleSectors } from '@/components/atlas/StyleSectors';
import { WormholeRings } from '@/components/atlas/WormholeRings';
import analysisPreview from '@/data/database-analysis-preview.json';
import archivePreview from '@/data/archive-preview.json';
import { atlasSize, styleSectors } from '@/lib/atlas-layout';
import type { Entry, EntryRelation, StyleSectorId } from '@/lib/types';
import { formatYear, layoutWormholeEntries, positionToYear, wormholeState, type WormholeEntryNode } from '@/lib/wormhole-layout';

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

type IntroState = 'intro' | 'launching' | 'idle';
type SourceLens = 'afasia' | null;
type PerformanceTier = 'reduced' | 'balanced' | 'full';
type ResearchSeed = {
  project: string;
  architect: string;
  address: string;
};
type ImageIdentifyState = {
  fileName: string;
  previewUrl: string;
  status: 'empty' | 'ready' | 'identified' | 'unknown';
  candidate?: ResearchSeed & {
    confidence: number;
    reason: string;
  };
};
type EntryDraft = {
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
  kind: 'pdf' | 'image' | 'plan' | 'video' | 'model' | 'text' | 'other';
  status: 'queued' | 'classified';
};
type TouchTravelGesture = {
  mode: 'idle' | 'single' | 'pinch';
  startX: number;
  startY: number;
  lastY: number;
  lastDistance: number;
  moved: number;
};
type TouchPoint = {
  clientX: number;
  clientY: number;
};
type AtlasUiMetrics = {
  isCoarsePointer: boolean;
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

const initialEntryDraft: EntryDraft = {
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

export function RadialAtlas({ entries, relations }: { entries: Entry[]; relations: EntryRelation[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cursorRef = useRef<SVGGElement | null>(null);
  const screenCursorRef = useRef<HTMLDivElement | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const [showRelations, setShowRelations] = useState(false);
  const [activeStyleLens, setActiveStyleLens] = useState<StyleSectorId | null>(null);
  const [activeSourceLens, setActiveSourceLens] = useState<SourceLens>(null);
  const [motion, setMotion] = useState<MotionSnapshot>({
    currentTravel: 0,
    targetTravel: 0,
    velocity: 0,
    isMoving: false,
    isSettling: true
  });
  const [introState, setIntroState] = useState<IntroState>('intro');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showDatabasePanel, setShowDatabasePanel] = useState(false);
  const [localEntries, setLocalEntries] = useState<Entry[]>([]);
  const [entryDraft, setEntryDraft] = useState<EntryDraft>(initialEntryDraft);
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
  const pendingPointerPointRef = useRef<SvgPoint | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const hoveredEntryIdRef = useRef<string | null>(null);
  const touchTravelRef = useRef<TouchTravelGesture>({
    mode: 'idle',
    startX: 0,
    startY: 0,
    lastY: 0,
    lastDistance: 0,
    moved: 0
  });
  const allEntries = useMemo(() => mergeEntries(entries, localEntries), [entries, localEntries]);
  const state = useMemo(() => wormholeState(motion.currentTravel), [motion.currentTravel]);
  const coarsePointer = useCoarsePointer();
  const ui = useAtlasUiMetrics();
  const activeSelectedEntryId = selectedEntry?.id ?? null;
  const nodes = useMemo(() => layoutWormholeEntries(allEntries, state, activeSelectedEntryId ?? undefined), [activeSelectedEntryId, allEntries, state]);
  const displayNodes = useMemo(() => limitDisplayNodes(nodes, performanceTier), [nodes, performanceTier]);
  const isTraveling = motion.isMoving;
  const sourceLensCount = useMemo(() => allEntries.filter((entry) => isSourceLensEntry(entry, 'afasia')).length, [allEntries]);
  const hoveredEntry = useMemo(() => displayNodes.find((node) => node.entry.id === hoveredEntryId)?.entry ?? null, [displayNodes, hoveredEntryId]);
  const cursorVisible = introState === 'idle';
  const isIntroActive = introState !== 'idle';
  const relationOverlayActive = selectedEntry || showRelations || (performanceTier !== 'reduced' && hoveredEntry);
  const backgroundStyle = {
    filter: isIntroActive ? 'blur(7px)' : 'blur(0px)',
    opacity: selectedEntry ? 0.48 : introState === 'intro' ? 0.3 : introState === 'launching' ? 0.82 : 1,
    transition: 'filter 520ms cubic-bezier(0.19, 1, 0.22, 1), opacity 520ms cubic-bezier(0.19, 1, 0.22, 1)'
  };

  useEffect(() => {
    if (introState !== 'launching') return;

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
    }, 1650);

    return () => window.clearTimeout(timeout);
  }, [introState]);

  useEffect(() => {
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

    resetMotion(0);
    setIntroState('launching');
  }

  function travelBy(delta: number) {
    if (introState !== 'idle') {
      startIntro();
      return;
    }

    closeDossier();
    setHoveredEntry(null);
    nudgeTravel(delta);
  }

  function focusNodeInView(event: ReactMouseEvent<SVGGElement> | undefined, fallbackNode: WormholeEntryNode) {
    const point = event ? pointerToSvgPoint(event) : null;
    const nearest = point ? nearestInteractiveNode(point, displayNodes) : null;
    openDossierFromNode(nearest?.entry ?? fallbackNode.entry);
  }

  function openDossierFromNode(entry: Entry) {
    setShowFilterPanel(false);
    setShowDatabasePanel(false);
    setSelectedEntry(entry);
    setHoveredEntry(null);
  }

  function closeDossier() {
    setSelectedEntry(null);
  }

  function createLocalEntryFromDraft(draft: EntryDraft) {
    const preview = draftToEntryPreview(draft);
    const existingEntry = entries.find((entry) => entry.id === preview.id || entry.slug === preview.slug);

    if (existingEntry) {
      resetDatabaseDraftState();
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
    resetDatabaseDraftState();
    setSelectedEntry(entry);
  }

  function resetDatabaseDraftState() {
    if (imageIdentify.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageIdentify.previewUrl);
    }

    setEntryDraft(initialEntryDraft);
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

  function stepMotion() {
    const ref = motionRef.current;
    cancelMotionStep();

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
    closeDossier();
    nudgeTravel(normalizedDelta * 0.00014);
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
      touchTravelRef.current = {
        mode: 'pinch',
        startX: 0,
        startY: 0,
        lastY: averageTouchY(touches),
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
        lastY: touches[0].clientY,
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
      const distanceDelta = Math.max(-86, Math.min(86, nextDistance - previousDistance));
      touchTravelRef.current = {
        mode: 'pinch',
        startX: touchTravelRef.current.startX,
        startY: touchTravelRef.current.startY,
        lastY: averageTouchY(touches),
        lastDistance: nextDistance,
        moved: touchTravelRef.current.moved + Math.abs(distanceDelta)
      };

      nudgeTravel(distanceDelta * 0.00052);
      return;
    }

    const nextY = touches[0].clientY;
    const currentTouch = touchTravelRef.current;
    const previousY = currentTouch.mode === 'single' ? currentTouch.lastY : nextY;
    const verticalDelta = Math.max(-92, Math.min(92, previousY - nextY));
    touchTravelRef.current = {
      mode: 'single',
      startX: currentTouch.mode === 'single' ? currentTouch.startX : touches[0].clientX,
      startY: currentTouch.mode === 'single' ? currentTouch.startY : touches[0].clientY,
      lastY: nextY,
      lastDistance: 0,
      moved: currentTouch.moved + Math.abs(verticalDelta)
    };

    nudgeTravel(verticalDelta * 0.00034);
  }

  function handleTouchEnd(event: ReactTouchEvent<SVGSVGElement>) {
    if (isInterfaceTarget(event.target)) return;

    const touches = Array.from(event.touches);
    if (touches.length >= 2) {
      touchTravelRef.current = {
        mode: 'pinch',
        startX: 0,
        startY: 0,
        lastY: averageTouchY(touches),
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
        lastY: touches[0].clientY,
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
      const nearest = point ? nearestInteractiveNode(point, displayNodes) : null;
      if (nearest) {
        openDossierFromNode(nearest.entry);
      }
    }

    touchTravelRef.current = {
      mode: 'idle',
      startX: 0,
      startY: 0,
      lastY: 0,
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

    if (isInterfaceTarget(event.target)) {
      moveCursor(point);
      setHoveredEntry(null);
      return;
    }

    schedulePointerMove(point);
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

    if (selectedEntry || isTraveling || introState !== 'idle') {
      setHoveredEntry(null);
      return;
    }

    const nearest = nearestInteractiveNode(point, displayNodes);
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

  return (
    <main className={`relative h-screen w-screen overflow-hidden bg-[#050505] text-[#f7f7f4] cosmos-perf-${performanceTier} ${introState === 'launching' ? 'cosmos-launching' : ''} ${isTraveling ? 'cosmos-moving' : ''} ${introState === 'idle' && !isTraveling ? 'cosmos-idle' : ''}`}>
      <div className="h-full w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${atlasSize.width} ${atlasSize.height}`}
          className="h-full w-full touch-none cursor-none"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={() => {
            if (introState !== 'idle') startIntro();
          }}
        >
          <defs>
          </defs>
          <rect width={atlasSize.width} height={atlasSize.height} fill="#050505" />
          <g style={backgroundStyle} pointerEvents={selectedEntry ? 'none' : 'auto'}>
            <g className="wormhole-camera">
              <WormholeRings state={state} isMoving={isTraveling} quality={performanceTier} />

              {relationOverlayActive ? (
                <RelationOverlay nodes={displayNodes} relations={relations} selectedEntry={selectedEntry} focusEntry={hoveredEntry} isMoving={isTraveling} />
              ) : null}

              {displayNodes.map((node) => {
                const isSourceLensMatch = isSourceLensEntry(node.entry, activeSourceLens);
                const nodeOpacity = node.opacity * styleLensOpacity(node, activeStyleLens) * sourceLensOpacity(node, activeSourceLens);
                const displayOpacity = isSourceLensMatch ? Math.max(0.94, nodeOpacity) : nodeOpacity;

                return (
                <g
                  key={node.entry.id}
                  className="node-focus-drift"
                  opacity={displayOpacity}
                  style={{ pointerEvents: activeSourceLens && !isSourceLensMatch ? 'none' : 'auto' }}
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
                    nodeRadius={isSourceLensMatch ? Math.max(node.size, 13) : node.size}
                    showLabel={isSourceLensMatch}
                    styleLensActive={activeStyleLens === node.entry.style_sector || isSourceLensMatch}
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
                  setShowFilterPanel(false);
                }}
              />
            </g>
          </g>
          {selectedEntry ? <SnappedEntryOverlay entry={selectedEntry} onDismiss={closeDossier} /> : null}
          {introState === 'idle' ? (
            <RadialHud
              showRelations={showRelations}
              tunnelDepth={state.timePosition}
              activeStyleLens={activeStyleLens}
              activeSourceLens={activeSourceLens}
              sourceLensCount={sourceLensCount}
              onTravelForward={() => travelBy(0.026)}
              onTravelBackward={() => travelBy(-0.026)}
              onToggleLenses={() => {
                setHoveredEntry(null);
                setShowFilterPanel((current) => !current);
              }}
              onToggleSourceLens={() => {
                setHoveredEntry(null);
                setActiveSourceLens((current) => current === 'afasia' ? null : 'afasia');
              }}
              onToggleRelations={() => {
                setHoveredEntry(null);
                setShowRelations((current) => !current);
              }}
            />
          ) : null}
          {introState === 'idle' ? (
            <DatabaseAccess
              isOpen={showDatabasePanel}
              onToggle={() => {
                setHoveredEntry(null);
                setShowDatabasePanel((current) => !current);
              }}
            />
          ) : null}
          {showDatabasePanel && introState === 'idle' && !ui.isCoarsePointer ? (
            <DatabaseArchivePanel
              entries={allEntries}
              relations={relations}
              selectedEntry={selectedEntry}
              draft={entryDraft}
              intakeFiles={intakeFiles}
              researchSeed={researchSeed}
              imageIdentify={imageIdentify}
              onDraftChange={setEntryDraft}
              onIntakeFilesChange={setIntakeFiles}
              onResearchSeedChange={setResearchSeed}
              onImageIdentifyChange={setImageIdentify}
              onCreateLocalEntry={createLocalEntryFromDraft}
              onDismiss={() => setShowDatabasePanel(false)}
            />
          ) : null}
          {introState === 'idle' ? <TimeReadout timePosition={state.timePosition} currentYear={state.currentYear} /> : null}
          {introState === 'idle' ? <BrandChrome /> : null}
        </svg>
        {showDatabasePanel && introState === 'idle' && ui.isCoarsePointer ? (
          <DatabaseArchivePanel
            renderMode="html"
            entries={allEntries}
            relations={relations}
            selectedEntry={selectedEntry}
            draft={entryDraft}
            intakeFiles={intakeFiles}
            researchSeed={researchSeed}
            imageIdentify={imageIdentify}
            onDraftChange={setEntryDraft}
            onIntakeFilesChange={setIntakeFiles}
            onResearchSeedChange={setResearchSeed}
            onImageIdentifyChange={setImageIdentify}
            onCreateLocalEntry={createLocalEntryFromDraft}
            onDismiss={() => setShowDatabasePanel(false)}
          />
        ) : null}
        {introState === 'idle' ? (
          <LensControls
            isOpen={showFilterPanel}
            activeStyleLens={activeStyleLens}
            activeSourceLens={activeSourceLens}
            showRelations={showRelations}
            sourceLensCount={sourceLensCount}
            onToggle={() => {
              setHoveredEntry(null);
              setShowFilterPanel((current) => !current);
            }}
            onSetStyleLens={(styleId) => {
              setHoveredEntry(null);
              setActiveStyleLens(styleId);
            }}
            onResetLenses={() => {
              setHoveredEntry(null);
              setActiveStyleLens(null);
              setActiveSourceLens(null);
              setShowRelations(false);
            }}
            onToggleSourceLens={() => {
              setHoveredEntry(null);
              setActiveSourceLens((current) => current === 'afasia' ? null : 'afasia');
            }}
            onToggleRelations={() => {
              setHoveredEntry(null);
              setShowRelations((current) => !current);
            }}
            onDismiss={() => setShowFilterPanel(false)}
          />
        ) : null}
        {introState === 'idle' && !showDatabasePanel ? <ProjectSearch entries={allEntries} /> : null}
        {cursorVisible && !coarsePointer ? <ScreenCosmosCursor cursorRef={screenCursorRef} isDossierOpen={Boolean(selectedEntry)} /> : null}
      </div>

      {introState !== 'idle' ? <IntroGate state={introState} onStart={startIntro} /> : null}
    </main>
  );
}

function usePerformanceTier(): PerformanceTier {
  const [tier, setTier] = useState<PerformanceTier>('balanced');

  useEffect(() => {
    const updateTier = () => {
      const params = new URLSearchParams(window.location.search);
      const forcedTier = params.get('perf');

      if (forcedTier === 'reduced' || forcedTier === 'balanced' || forcedTier === 'full') {
        setTier(forcedTier);
        document.documentElement.dataset.cosmosPerf = forcedTier;
        return;
      }

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const narrowViewport = window.innerWidth < 760;
      const smallViewport = window.innerWidth < 1024;
      const cores = navigator.hardwareConcurrency || 4;
      const memory = typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number'
        ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
        : 4;
      const userAgent = navigator.userAgent.toLowerCase();
      const conservativeBrowser = userAgent.includes('opr/') || (userAgent.includes('safari') && !userAgent.includes('chrome'));

      const nextTier: PerformanceTier = reducedMotion || narrowViewport || cores <= 4 || memory <= 4
        ? 'reduced'
        : !coarsePointer && !smallViewport && cores >= 8 && memory >= 8 && !conservativeBrowser
          ? 'full'
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
  const dossierScale = useLargeInterface ? 2.36 : 1.42;
  const dossierHeight = 292 * dossierScale;

  return {
    isCoarsePointer: useLargeInterface,
    dock: {
      buttonHeight: useLargeInterface ? 78 : 20,
      buttonY: useLargeInterface ? 844 : 923,
      buttonTextY: useLargeInterface ? 893 : 936.2,
      buttonFontSize: useLargeInterface ? 21 : 6.6,
      shellWidth: useLargeInterface ? 960 : 380,
      shellHeight: useLargeInterface ? 114 : 38,
      shellY: useLargeInterface ? 826 : 914,
      shellRadius: useLargeInterface ? 57 : 19,
      gap: useLargeInterface ? 16 : 7
    },
    databasePanel: {
      width: databaseWidth,
      height: databaseHeight,
      x: useLargeInterface ? 35 : atlasSize.width - databaseWidth - 28,
      y: useLargeInterface ? 86 : Math.max(24, atlasSize.height - databaseHeight - 28)
    },
    dossier: {
      cardScale: dossierScale,
      cardY: useLargeInterface ? 136 : atlasSize.cy - dossierHeight / 2,
      closeWidth: useLargeInterface ? 86 : 46,
      actionHeight: useLargeInterface ? 42 : 22,
      actionOffsetY: useLargeInterface ? -56 : -34,
      actionFontSize: useLargeInterface ? 13 : 9,
      openWidth: useLargeInterface ? 132 : 76
    }
  };
}

function isInterfaceTarget(target: EventTarget) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('.radial-hud, .lens-control, .lens-control-panel, .lens-access, .lens-panel, .database-access, .database-draft, .dossier-overlay, .style-sector, .project-search'));
}

function isNativeOverlayTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('.database-draft, .lens-control, .lens-control-panel, .project-search, .dossier-overlay, .entry-page'));
}

function isReadableNode(node: WormholeEntryNode) {
  const margin = 54;
  const insideFrame = node.x > margin && node.x < atlasSize.width - margin && node.y > margin && node.y < atlasSize.height - margin;
  return insideFrame && node.depth >= 0.002 && node.depth <= 1.24 && node.opacity >= 0.02;
}

function limitDisplayNodes(nodes: WormholeEntryNode[], performanceTier: PerformanceTier) {
  const nodeLimit: Record<PerformanceTier, number> = {
    reduced: 58,
    balanced: 88,
    full: 112
  };

  return nodes
    .filter(isReadableNode)
    .sort((a, b) => nodeRenderPriority(b) - nodeRenderPriority(a))
    .slice(0, nodeLimit[performanceTier])
    .sort((a, b) => b.depth - a.depth);
}

function nodeRenderPriority(node: WormholeEntryNode) {
  return node.opacity * 1.3 + node.closeness * 0.7 + (node.clusterSize > 1 ? 0.12 : 0);
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

function mergeEntries(baseEntries: Entry[], localEntries: Entry[]) {
  if (localEntries.length === 0) return baseEntries;
  const merged = new Map(baseEntries.map((entry) => [entry.id, entry]));
  localEntries.forEach((entry) => merged.set(entry.id, entry));
  return [...merged.values()];
}

function isSourceLensEntry(entry: Entry, activeSourceLens: SourceLens) {
  if (!activeSourceLens) return false;

  const sourceText = [
    entry.source_url,
    entry.source_quality,
    ...(entry.source_documents ?? []),
    ...entry.themes
  ].join(' ').toLowerCase();

  return activeSourceLens === 'afasia' && sourceText.includes('afasia');
}

function nearestInteractiveNode(point: SvgPoint, nodes: WormholeEntryNode[]) {
  return nodes.reduce<{ entry: Entry; distance: number } | null>((nearest, node) => {
    if (node.opacity < 0.14) return nearest;

    const distance = Math.hypot(point.x - node.x, point.y - node.y);
    const hitRadius = Math.max(18, node.size + 10);
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

function roundMotion(value: number) {
  return Math.round(value * 100000) / 100000;
}

function RadialHud({
  showRelations,
  tunnelDepth,
  activeStyleLens,
  activeSourceLens,
  sourceLensCount,
  onTravelForward,
  onTravelBackward,
  onToggleLenses,
  onToggleSourceLens,
  onToggleRelations
}: {
  showRelations: boolean;
  tunnelDepth: number;
  activeStyleLens: StyleSectorId | null;
  activeSourceLens: SourceLens;
  sourceLensCount: number;
  onTravelForward: () => void;
  onTravelBackward: () => void;
  onToggleLenses: () => void;
  onToggleSourceLens: () => void;
  onToggleRelations: () => void;
}) {
  const ui = useAtlasUiMetrics();
  const controlsOpacity = Math.max(0.46, 1 - tunnelDepth / 0.76);
  const lensLabel = activeStyleLens ? styleShortLabel(activeStyleLens) : 'All';
  const buttons = [
    { id: 'back', label: 'Time -', active: false, width: ui.isCoarsePointer ? 150 : 58, onClick: onTravelBackward },
    { id: 'forward', label: 'Time +', active: false, width: ui.isCoarsePointer ? 150 : 58, onClick: onTravelForward },
    { id: 'lenses', label: `Lens ${lensLabel}`, active: Boolean(activeStyleLens), width: ui.isCoarsePointer ? 192 : 72, onClick: onToggleLenses },
    { id: 'afasia', label: `Afasia ${sourceLensCount}`, active: activeSourceLens === 'afasia', width: ui.isCoarsePointer ? 198 : 82, onClick: onToggleSourceLens },
    { id: 'relations', label: 'Relations', active: showRelations, width: ui.isCoarsePointer ? 198 : 78, onClick: onToggleRelations }
  ];
  let cursorX = atlasSize.cx - buttons.reduce((sum, button) => sum + button.width + ui.dock.gap, -ui.dock.gap) / 2;

  if (ui.isCoarsePointer) return null;

  return (
    <g className="radial-hud navigation-dock" pointerEvents="auto" opacity={controlsOpacity}>
      <rect x={atlasSize.cx - ui.dock.shellWidth / 2} y={ui.dock.shellY} width={ui.dock.shellWidth} height={ui.dock.shellHeight} rx={ui.dock.shellRadius} fill="#050505" stroke="#f7f7f4" strokeWidth="0.48" opacity="0.7" />
      {buttons.map((button) => {
        const x = cursorX;
        cursorX += button.width + ui.dock.gap;
        return <DockButton key={button.id} x={x} y={ui.dock.buttonY} width={button.width} height={ui.dock.buttonHeight} textY={ui.dock.buttonTextY} fontSize={ui.dock.buttonFontSize} label={button.label} active={button.active} onClick={button.onClick} />;
      })}
      {activeSourceLens ? (
        <text x={atlasSize.cx} y={ui.isCoarsePointer ? 895 : 907} textAnchor="middle" fill="#65ff9a" fontSize={ui.isCoarsePointer ? 10 : 7.2} fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.18em" opacity="0.9">
          AFASIA SOURCE LENS / {sourceLensCount} PROJECT
        </text>
      ) : null}
    </g>
  );
}

function DockButton({ x, y, width, height = 20, textY = y + 13.2, fontSize = 6.6, label, active, onClick }: { x: number; y: number; width: number; height?: number; textY?: number; fontSize?: number; label: string; active: boolean; onClick: () => void }) {
  function handleActivate(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    onClick();
  }

  return (
    <g className="dock-button" pointerEvents="auto" onPointerDown={(event) => event.stopPropagation()} onClick={handleActivate} aria-label={label}>
      <rect x={x} y={y} width={width} height={height} rx={height / 2} fill={active ? '#f7f7f4' : '#050505'} stroke={active ? '#00e7ff' : '#f7f7f4'} strokeWidth="0.58" opacity={active ? 0.94 : 0.76} />
      <text x={x + width / 2} y={textY} textAnchor="middle" fill={active ? '#050505' : '#f7f7f4'} fontSize={fontSize} fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
        {label.toUpperCase()}
      </text>
    </g>
  );
}

function LensControls({
  isOpen,
  activeStyleLens,
  activeSourceLens,
  showRelations,
  sourceLensCount,
  onToggle,
  onSetStyleLens,
  onResetLenses,
  onToggleSourceLens,
  onToggleRelations,
  onDismiss
}: {
  isOpen: boolean;
  activeStyleLens: StyleSectorId | null;
  activeSourceLens: SourceLens;
  showRelations: boolean;
  sourceLensCount: number;
  onToggle: () => void;
  onSetStyleLens: (lens: StyleSectorId | null) => void;
  onResetLenses: () => void;
  onToggleSourceLens: () => void;
  onToggleRelations: () => void;
  onDismiss: () => void;
}) {
  const tabs = [
    { id: 'all', label: 'ALLE', active: !activeStyleLens && !activeSourceLens && !showRelations, onClick: onResetLenses },
    ...styleSectors.map((sector) => ({
      id: sector.id,
      label: styleShortLabel(sector.id),
      active: activeStyleLens === sector.id,
      onClick: () => onSetStyleLens(activeStyleLens === sector.id ? null : sector.id)
    })),
    { id: 'afasia', label: `AFASIA ${sourceLensCount}`, active: activeSourceLens === 'afasia', onClick: onToggleSourceLens },
    { id: 'relations', label: 'REL', active: showRelations, onClick: onToggleRelations }
  ];

  return (
    <div
      className={`lens-control ${isOpen ? 'lens-control-open' : ''}`}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" className={`lens-control-trigger ${isOpen ? 'lens-control-trigger-open' : ''}`} onClick={onToggle}>
        <span className="lens-control-mark" aria-hidden="true" />
        <span>Lenses</span>
      </button>
      {isOpen ? (
        <div className="lens-control-panel cosmos-panel cosmos-scroll-panel cosmos-text-safe" role="dialog" aria-label="Atlas lenses">
          <div className="lens-control-head">
            <span>Active Lenses</span>
            <button type="button" className="lens-control-close" onClick={onDismiss}>X</button>
          </div>
          <div className="lens-control-grid">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`lens-control-tab ${tab.active ? 'lens-control-tab-active' : ''}`}
                onClick={tab.onClick}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
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
  const width = ui.isCoarsePointer ? 248 : 84;
  const height = ui.isCoarsePointer ? 88 : 32;
  const x = atlasSize.width - width - (ui.isCoarsePointer ? 28 : 28);
  const y = atlasSize.height - (ui.isCoarsePointer ? 120 : 52);
  const iconScale = ui.isCoarsePointer ? 2.2 : 1;
  function toggleOnce(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    onToggle();
  }

  return (
    <g
      className={`database-access ${isOpen ? 'database-access-open' : ''}`}
      pointerEvents="auto"
      transform={`translate(${x} ${y})`}
      aria-label="Database archive"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={toggleOnce}
    >
      <rect x="0" y={-height / 2} width={width} height={height} rx={height / 2} fill={isOpen ? '#f7f7f4' : '#050505'} stroke="#00e7ff" strokeWidth="0.88" opacity="0.88" />
      <g className="database-access-core" transform={`translate(${ui.isCoarsePointer ? 16 : 0} 0) scale(${iconScale})`} stroke="#f7f7f4" fill="none" strokeWidth="0.72" opacity="0.9">
        <ellipse cx="14" cy="-3.6" rx="5.6" ry="2.2" stroke={isOpen ? '#050505' : '#f7f7f4'} />
        <path d="M 8.4 -3.6 V 5.4 Q 14 8.2 19.6 5.4 V -3.6" stroke={isOpen ? '#050505' : '#f7f7f4'} />
        <path d="M 8.4 1.2 Q 14 4 19.6 1.2" stroke={isOpen ? '#050505' : '#f7f7f4'} opacity="0.52" />
      </g>
      <text x={ui.isCoarsePointer ? 88 : 29} y={ui.isCoarsePointer ? 9 : 3} fill={isOpen ? '#050505' : '#f7f7f4'} fontSize={ui.isCoarsePointer ? 22 : 7.2} fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.12em">
        DATABASE
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

function BrandChrome() {
  return (
    <g className="brand-chrome" pointerEvents="none">
      <text x={atlasSize.cx} y="32" textAnchor="middle" fill="#f7f7f4" fontSize="12" fontWeight="650" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.3em" opacity="0.76">
        ARCHITECTURE COSMOS
      </text>
    </g>
  );
}

function TimeReadout({ timePosition, currentYear }: { timePosition: number; currentYear: number }) {
  const focusEndYear = positionToYear(Math.min(1, timePosition + 0.22));
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

function dominantSpanForYear(year: number) {
  if (year >= 1990) return { label: 'Gegenwart / Digitalisierung' };
  if (year >= 1950) return { label: 'Nachkriegsmoderne' };
  if (year >= 1900) return { label: 'Moderne' };
  if (year >= 1800) return { label: 'Industrialisierung' };
  if (year >= 1400) return { label: 'Fruehmoderne' };
  if (year >= 500) return { label: 'Mittelalter / Stadt' };
  if (year >= -500) return { label: 'Antike' };
  if (year >= -3000) return { label: 'Fruehe Hochkulturen' };
  return { label: 'Proto-Urban / Ursprung' };
}

function IntroGate({ state, onStart }: { state: IntroState; onStart: () => void }) {
  return (
    <button
      type="button"
      className={`intro-gate absolute inset-0 z-30 flex cursor-none items-center justify-center bg-[#050505]/10 text-center ${state === 'launching' ? 'intro-gate-launching' : ''}`}
      onClick={onStart}
      onWheel={(event) => {
        event.preventDefault();
        onStart();
      }}
      aria-label="Start Architecture Cosmos"
    >
      <span className="block">
        <span className="intro-title-main block text-[clamp(2.4rem,7vw,6.8rem)] font-semibold uppercase tracking-[0.18em] text-[#f7f7f4]">
          architecture cosmos
        </span>
      </span>
    </button>
  );
}

type DatabaseTab = 'overview' | 'intake' | 'generate' | 'entries' | 'sources' | 'media' | 'models' | 'analysis' | 'relations' | 'draft';

function DatabaseArchivePanel({
  renderMode = 'svg',
  entries,
  relations,
  selectedEntry,
  draft,
  intakeFiles,
  researchSeed,
  imageIdentify,
  onDraftChange,
  onIntakeFilesChange,
  onResearchSeedChange,
  onImageIdentifyChange,
  onCreateLocalEntry,
  onDismiss
}: {
  renderMode?: 'svg' | 'html';
  entries: Entry[];
  relations: EntryRelation[];
  selectedEntry: Entry | null;
  draft: EntryDraft;
  intakeFiles: IntakeFile[];
  researchSeed: ResearchSeed;
  imageIdentify: ImageIdentifyState;
  onDraftChange: (draft: EntryDraft) => void;
  onIntakeFilesChange: (files: IntakeFile[]) => void;
  onResearchSeedChange: (seed: ResearchSeed) => void;
  onImageIdentifyChange: (state: ImageIdentifyState) => void;
  onCreateLocalEntry: (draft: EntryDraft) => void;
  onDismiss: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DatabaseTab>(selectedEntry ? 'entries' : 'generate');
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
    { label: 'Entries', value: entries.length },
    { label: 'Sources', value: archivePreview.entry_sources.length },
    { label: 'Media', value: archivePreview.entry_media.length },
    { label: '3D', value: archivePreview.entry_models.length },
    { label: 'Analysis', value: archivePreview.entry_analysis.length },
    { label: 'Relations', value: relations.length }
  ];
  const tabs: Array<{ id: DatabaseTab; label: string; hint: string; group: 'create' | 'review' }> = [
    { id: 'generate', label: 'Generate', hint: 'Name or image to draft', group: 'create' },
    { id: 'intake', label: 'Files', hint: 'Stage source package', group: 'create' },
    { id: 'analysis', label: 'Analyze', hint: 'Score and layers', group: 'create' },
    { id: 'draft', label: 'Draft', hint: 'Edit before adding', group: 'create' },
    { id: 'overview', label: 'Status', hint: 'What exists now', group: 'review' },
    { id: 'entries', label: 'Entries', hint: 'Current object', group: 'review' },
    { id: 'sources', label: 'Sources', hint: 'References', group: 'review' },
    { id: 'media', label: 'Media', hint: 'Images and plans', group: 'review' },
    { id: 'models', label: '3D', hint: 'Model layers', group: 'review' },
    { id: 'relations', label: 'Graph', hint: 'Connections', group: 'review' }
  ];
  const createTabs = tabs.filter((tab) => tab.group === 'create');
  const reviewTabs = tabs.filter((tab) => tab.group === 'review');

  function updateField<Key extends keyof EntryDraft>(key: Key, value: EntryDraft[Key]) {
    onDraftChange({ ...draft, [key]: value });
  }

  function updateResearchSeed<Key extends keyof ResearchSeed>(key: Key, value: ResearchSeed[Key]) {
    onResearchSeedChange({ ...researchSeed, [key]: value });
  }

  function generateResearchDraft() {
    const generatedDraft = draftFromResearchSeed(researchSeed);
    onDraftChange(generatedDraft);
    setActiveTab('draft');
  }

  function loadIngenbohlSample() {
    const seed = {
      project: 'Alterszentrum Kloster Ingenbohl',
      architect: 'Boltshauser Architekten / Roger Boltshauser',
      address: 'Klosterstrasse 20, 6440 Brunnen, Schweiz'
    };

    onResearchSeedChange(seed);
    onDraftChange(draftFromResearchSeed(seed));
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
      status: 'ready'
    });
    onDraftChange(initialEntryDraft);
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
        project: stripFileExtension(imageIdentify.fileName) || 'Unidentified image research',
        architect: '',
        address: ''
      };
      onResearchSeedChange(nextSeed);
      onDraftChange(draftFromResearchSeed(nextSeed));
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
    onDraftChange(draftFromResearchSeed(nextSeed));
    onImageIdentifyChange({
      ...imageIdentify,
      status: 'identified',
      candidate
    });
  }

  function resetPanelDraft() {
    if (imageIdentify.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageIdentify.previewUrl);
    }

    onDraftChange(initialEntryDraft);
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
        className="cosmos-panel cosmos-text-safe flex flex-col border border-[#00e7ff]/70 bg-[#050505]/95 p-4 text-[#f7f7f4] shadow-[0_0_28px_rgb(0_231_255_/_0.12)]"
        style={renderMode === 'svg' ? { width: panelWidth, height: panelHeight } : undefined}
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#00e7ff]">Architecture Cosmos Database</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#b8b8b2]">Local draft console / private library planned</div>
          </div>
          <div className="flex gap-1.5">
            <a className="border border-[#00e7ff]/70 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[#00e7ff]" href="/archive/">
              Open
            </a>
            <button className="h-6 w-8 border border-[#f7f7f4]/70 text-[10px] text-[#050505] bg-[#f7f7f4]" type="button" onClick={onDismiss}>X</button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5 border border-[#f7f7f4]/10 bg-[#050505]/35 px-2 py-1.5">
          {counts.map((item) => (
            <div key={item.label} className="flex items-baseline gap-1.5 pr-2">
              <span className="text-[10px] font-semibold leading-none text-[#f7f7f4]/85">{item.value}</span>
              <span className="text-[7.5px] uppercase tracking-[0.11em] text-[#b8b8b2]/80">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mb-3 border border-[#00e7ff]/25 bg-[#061719]/85 px-2 py-1.5 text-[8.8px] uppercase leading-snug tracking-[0.12em] text-[#c9fff4]">
          Browser session only / no D1 write / no R2 upload / private library planned
        </div>

        <div className="mb-3 space-y-2">
          <DatabaseTabGroup title="Create entry" tabs={createTabs} activeTab={activeTab} onSelect={setActiveTab} />
          <DatabaseTabGroup title="Review archive" tabs={reviewTabs} activeTab={activeTab} onSelect={setActiveTab} />
        </div>

        <div className="cosmos-scroll-panel min-h-0 flex-1 pr-1">
          {activeTab === 'overview' ? (
            <div className="space-y-2 text-[10px] leading-relaxed text-[#d9d9d2]">
              <ArchiveRow label="Mode" value="Static public atlas / browser drafts only" />
              <ArchiveRow label="Storage" value={`${archivePreview.storage_target.database.toUpperCase()} metadata preview / R2 planned`} />
              <ArchiveRow label="Status" value={`D1 preview ready / ${archivePreview.storage_target.frontend_connection.replace(/_/g, ' ')}`} />
              <ArchiveRow label="D1" value={`${archivePreview.storage_target.database_name} / verified ${archivePreview.storage_target.last_verified}`} />
              <ArchiveRow label="R2" value={`${archivePreview.storage_target.assets_bucket_name ?? 'not configured'} / no uploads`} />
              <ArchiveRow label="Assets" value={archivePreview.storage_target.assets_status.replace(/_/g, ' ')} />
              <ArchiveRow label="Pilot" value={`${pilotEntry.title}, ${pilotEntry.year_start}, ${pilotEntry.city}`} />
              {selectedEntry ? <ArchiveRow label="Current" value={`${selectedEntry.title} / ${selectedEntry.database_profile?.status ?? 'local entry'}`} /> : null}
              <p className="border border-[#00e7ff]/25 bg-[#061719] p-2 text-[#c9fff4]">
                This panel is a local planning console. It can stage drafts in the browser session, but it does not persist to D1, upload to R2 or publish user/private files.
              </p>
              <p className="border border-[#f7f7f4]/15 bg-[#050505]/55 p-2 text-[#b8b8b2]">
                Future private libraries need authentication, Cloudflare Access or an identity provider, signed R2 upload URLs, quarantine, rights gate and maintainer review before any public publication.
              </p>
              <ArchiveList
                title="How this panel works"
                items={[
                  'Generate creates a temporary draft from a project name, address, architect or image hint',
                  'Files stages source material in this browser session only',
                  'Draft lets you review and add a temporary local atlas entry',
                  'Review tabs show the current static archive preview'
                ]}
              />
            </div>
          ) : null}

          {activeTab === 'intake' ? (
            <div className="space-y-3 text-[10px] leading-relaxed text-[#d9d9d2]">
              <div
                className="database-dropzone"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={handleDrop}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00e7ff]">Drop source package</div>
                <p className="mt-2 text-[10px] leading-snug text-[#c7c7c2]">
                  PDFs, scans, plans, images, video, text notes and model files. This preview classifies the package and shows what is ready for later capture.
                </p>
                <label className="mt-3 inline-flex cursor-none items-center border border-[#00e7ff]/60 px-3 py-1.5 text-[8.5px] uppercase tracking-[0.14em] text-[#9cfff7]">
                  Select files
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
                  ['Files', intakeFiles.length],
                  ['Sources', intakeStats.sources],
                  ['Visual', intakeStats.visual],
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
                      <span className="text-[8px] uppercase tracking-[0.13em] text-[#00e7ff]">{file.kind}</span>
                      <span className="truncate text-[9.5px] text-[#f7f7f4]">{file.name}</span>
                      <span className="text-right text-[8px] text-[#8d8d87]">{formatBytes(file.size)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="border border-[#f7f7f4]/12 bg-[#050505]/45 p-2 text-[#b8b8b2]">
                  No files staged yet. Add a project package here to see source, visual and 3D readiness.
                </p>
              )}

              <div className="grid grid-cols-3 gap-1.5">
                <IntakeAction label="Capture" ready={intakeFiles.length > 0} />
                <IntakeAction label="3D Plan" ready={intakeStats.sources + intakeStats.visual > 1} />
                <IntakeAction label="Splat" ready={intakeStats.video > 0 || intakeStats.image >= 20} />
              </div>

              <button
                type="button"
                className="w-full border border-[#f7f7f4]/25 px-2 py-1.5 text-[8.5px] uppercase tracking-[0.14em] text-[#d9d9d2]"
                onClick={() => onIntakeFilesChange([])}
              >
                Clear staged files
              </button>
            </div>
          ) : null}

          {activeTab === 'generate' ? (
            <div className="space-y-3 text-[10px] leading-relaxed text-[#d9d9d2]">
              <DatabaseFlowSteps current="research" />
              <div className="database-generate-sticky">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00e7ff]">Dev AI Generate</div>
                    <p className="mt-1 text-[9px] leading-snug text-[#b8b8b2]">
                    Projektname, Adresse, Architekt oder Bildhinweis eingeben. Der Draft wird jedes Mal neu aufgebaut.
                    </p>
                  </div>
                <button
                  type="button"
                  className="shrink-0 border border-[#00e7ff]/80 bg-[#00e7ff] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#050505]"
                  onClick={generateResearchDraft}
                >
                  Let&apos;s generate
                </button>
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
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00e7ff]">Image identify</div>
                    <p className="mt-1 text-[9.5px] leading-snug text-[#b8b8b2]">
                      Drop a building image. This V1 reads filename/context hints and always resets the draft before creating a fresh result.
                    </p>
                  </div>
                  <label className="shrink-0 cursor-none border border-[#00e7ff]/60 px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-[#9cfff7]">
                    Select
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
                    <img className="h-20 w-24 object-cover" src={imageIdentify.previewUrl} alt="Image identification preview" />
                    <div className="min-w-0">
                      <div className="truncate text-[10px] text-[#f7f7f4]">{imageIdentify.fileName}</div>
                      <div className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[#8d8d87]">
                        {imageIdentify.status === 'identified' ? `identified / ${Math.round((imageIdentify.candidate?.confidence ?? 0) * 100)}%` : imageIdentify.status === 'unknown' ? 'needs manual research' : 'ready to analyze'}
                      </div>
                      {imageIdentify.candidate ? (
                        <p className="mt-1 line-clamp-2 text-[9px] leading-snug text-[#c9fff4]">{imageIdentify.candidate.project} / {imageIdentify.candidate.reason}</p>
                      ) : null}
                      <button
                        type="button"
                        className="mt-2 border border-[#00e7ff]/70 px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-[#00e7ff]"
                        onClick={identifyDroppedImage}
                      >
                        Analyze image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 border border-dashed border-[#f7f7f4]/18 bg-[#050505]/45 px-3 py-4 text-center text-[8.5px] uppercase tracking-[0.16em] text-[#8d8d87]">
                    Drop image here
                  </div>
                )}
              </div>

              <DraftInput label="Project" value={researchSeed.project} onChange={(value) => updateResearchSeed('project', value)} />
              <DraftInput label="Architect" value={researchSeed.architect} onChange={(value) => updateResearchSeed('architect', value)} />
              <DraftInput label="Address / place" value={researchSeed.address} onChange={(value) => updateResearchSeed('address', value)} />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="border border-[#f7f7f4]/25 px-2 py-2 text-[8.5px] uppercase tracking-[0.14em] text-[#d9d9d2]"
                  onClick={loadIngenbohlSample}
                >
                  Load sample
                </button>
                <button
                  type="button"
                  className="border border-[#00e7ff]/55 px-2 py-2 text-[8.5px] uppercase tracking-[0.14em] text-[#00e7ff]"
                  onClick={generateResearchDraft}
                >
                  Generate draft
                </button>
              </div>

              <p className="border border-[#f7f7f4]/12 bg-[#050505]/45 p-2 text-[9.5px] leading-snug text-[#b8b8b2]">
                Load sample fills a known test project. Generate draft converts your current inputs into an editable browser-session draft.
              </p>

              <ArchiveList
                title="What happens next"
                items={[
                  'A clean editable draft is created from the current inputs',
                  'Existing old project text is cleared before a new image analysis result is applied',
                  'Create browser entry adds it only to this session; it is not public and not saved to D1/R2'
                ]}
              />
            </div>
          ) : null}

          {activeTab === 'analysis' ? (
            <DatabaseAnalysisPackView pack={currentAnalysisPack} fallbackEntry={currentEntry} />
          ) : null}

          {activeTab === 'entries' ? (
            <div className="space-y-2">
              {currentEntry ? (
                <ArchiveList
                  title={selectedEntry ? 'Current Entry' : 'Pilot Entry'}
                  items={[
                    `${currentEntry.title} / ${currentEntry.entry_type} / ${currentEntry.style_sector}`,
                    `${currentEntry.authors.join(', ') || 'Unknown author'} / ${currentEntry.country ?? 'no country'}`,
                    `Status: ${currentProfile?.status ?? 'local draft'}`,
                    `R2 prefix: ${currentProfile?.r2_prefix ?? `entries/${currentEntry.slug}`}`
                  ]}
                />
              ) : null}
              <ArchiveList title="Pilot Entry" items={[`${pilotEntry.title} / ${pilotEntry.entry_type} / ${pilotEntry.style_sector}`, `${pilotEntry.authors_json} / ${pilotEntry.country}`, `R2 prefix: ${pilotEntry.r2_prefix}`]} />
            </div>
          ) : null}

          {activeTab === 'sources' ? (
            <ArchiveCards items={selectedEntry ? sourceCardsForEntry(selectedEntry) : archivePreview.entry_sources.map((source) => ({ title: source.title, meta: `${source.source_type} / ${source.reliability_level}`, body: source.notes }))} />
          ) : null}

          {activeTab === 'media' ? (
            <ArchiveCards items={selectedEntry ? selectedEntry.media.map((media) => ({ title: media.label, meta: `${media.type} / ${media.credit ?? 'placeholder'}`, body: media.placeholder })) : archivePreview.entry_media.map((media) => ({ title: media.title, meta: `${media.media_type} / ${media.copyright_status}`, body: media.caption }))} />
          ) : null}

          {activeTab === 'models' ? (
            <ArchiveCards items={(currentEntry?.model_assets?.length ? currentEntry.model_assets : archivePreview.entry_models).map((model) => ({ title: model.title, meta: `${model.model_type} / ${model.review_status} / confidence ${model.confidence_score ?? 'n/a'}`, body: model.source_basis }))} />
          ) : null}

          {activeTab === 'relations' ? (
            <ArchiveList title="Knowledge Graph" items={[`${relations.length} local relations available now`, 'D1 table prepared for influence, theme, source and structural relations', 'Hover network can later read the same graph instead of local JSON']} />
          ) : null}

          {activeTab === 'draft' ? (
            <div>
              <DatabaseFlowSteps current="draft" />
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[9px] uppercase tracking-[0.16em] text-[#b8b8b2]">New Entry Draft / browser session only</div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="border border-[#00e7ff]/80 bg-[#00e7ff] px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#050505]"
                    onClick={() => onCreateLocalEntry(draft)}
                  >
                    Create browser entry
                  </button>
                  <button
                    type="button"
                    className="border border-[#f7f7f4]/25 px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-[#d9d9d2]"
                    onClick={resetPanelDraft}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <p className="mb-2 border border-[#00e7ff]/25 bg-[#061719] p-2 text-[9.5px] leading-snug text-[#c9fff4]">
                Creates a temporary Atlas entry in this browser session only. Persistent D1/database saving, private libraries and uploads come in a later protected backend step.
              </p>
              <div className="mb-2 grid grid-cols-3 gap-1.5">
                {draftReadiness(draft).map((item) => (
                  <div key={item.label} className={`border px-2 py-1 ${item.ready ? 'border-[#00e7ff]/45 bg-[#061719]' : 'border-[#f7f7f4]/14 bg-[#050505]/55'}`}>
                    <div className={`text-[10px] font-semibold ${item.ready ? 'text-[#00e7ff]' : 'text-[#8d8d87]'}`}>{item.ready ? 'ready' : 'open'}</div>
                    <div className="mt-0.5 truncate text-[7.5px] uppercase tracking-[0.1em] text-[#b8b8b2]">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DraftInput label="Title" value={draft.title} onChange={(value) => updateField('title', value)} />
                <DraftInput label="Year" value={draft.year} onChange={(value) => updateField('year', value)} />
                <DraftSelect label="Type" value={draft.entry_type} options={entryTypeOptions} onChange={(value) => updateField('entry_type', value as Entry['entry_type'])} />
                <DraftSelect label="Style" value={draft.style_sector} options={styleSectors.map((sector) => ({ value: sector.id, label: styleShortLabel(sector.id) }))} onChange={(value) => updateField('style_sector', value as StyleSectorId)} />
                <DraftInput label="City" value={draft.city} onChange={(value) => updateField('city', value)} />
                <DraftInput label="Country" value={draft.country} onChange={(value) => updateField('country', value)} />
                <DraftInput label="Authors" value={draft.authors} onChange={(value) => updateField('authors', value)} />
                <DraftInput label="Themes" value={draft.themes} onChange={(value) => updateField('themes', value)} />
                <DraftInput label="Courses" value={draft.lecture_cluster} onChange={(value) => updateField('lecture_cluster', value)} />
                <DraftSelect
                  label="Rights"
                  value={draft.copyright_status}
                  options={[
                    { value: 'needs_permission', label: 'Needs rights' },
                    { value: 'private_research', label: 'Private research' },
                    { value: 'licensed', label: 'Licensed' },
                    { value: 'public_domain', label: 'Public domain' },
                    { value: 'own_work', label: 'Own work' }
                  ]}
                  onChange={(value) => updateField('copyright_status', value as EntryDraft['copyright_status'])}
                />
              </div>
              <DraftInput label="Source URL" value={draft.source_url} onChange={(value) => updateField('source_url', value)} />
              <DraftInput label="Source docs" value={draft.source_documents} onChange={(value) => updateField('source_documents', value)} />
              <label className="mt-2 block text-[9px] uppercase tracking-[0.16em] text-[#b8b8b2]">
                Short text
                <textarea
                  className="mt-1 h-11 w-full resize-none border border-[#f7f7f4]/20 bg-[#07181a] px-2 py-1 text-[11px] leading-tight text-[#f7f7f4] outline-none"
                  value={draft.short_description}
                  maxLength={180}
                  onChange={(event) => updateField('short_description', event.target.value)}
                />
              </label>
              <label className="mt-2 block text-[9px] uppercase tracking-[0.16em] text-[#b8b8b2]">
                One sentence
                <textarea
                  className="mt-1 h-11 w-full resize-none border border-[#f7f7f4]/20 bg-[#07181a] px-2 py-1 text-[11px] leading-tight text-[#f7f7f4] outline-none"
                  value={draft.one_sentence}
                  maxLength={240}
                  onChange={(event) => updateField('one_sentence', event.target.value)}
                />
              </label>
              <label className="mt-2 block text-[9px] uppercase tracking-[0.16em] text-[#b8b8b2]">
                Full description
                <textarea
                  className="mt-1 h-16 w-full resize-none border border-[#f7f7f4]/20 bg-[#07181a] px-2 py-1 text-[11px] leading-tight text-[#f7f7f4] outline-none"
                  value={draft.full_description}
                  maxLength={760}
                  onChange={(event) => updateField('full_description', event.target.value)}
                />
              </label>
              <ArchiveList
                title="Local next commands"
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

  if (renderMode === 'html') {
    return (
      <div
        className="database-draft database-archive-panel database-mobile-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Architecture Cosmos Database"
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
    <div className="flex gap-3 border-b border-[#f7f7f4]/10 pb-1.5">
      <span className="w-20 shrink-0 text-[8px] uppercase tracking-[0.16em] text-[#00e7ff]">{label}</span>
      <span className="min-w-0 text-[#f7f7f4]">{value}</span>
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
      <div className="grid grid-cols-3 gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`database-tab ${activeTab === tab.id ? 'database-tab-active' : ''}`}
            onClick={() => onSelect(tab.id)}
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
    { id: 'research', label: 'Research Pack' },
    { id: 'analysis', label: 'Analysis Pack' },
    { id: 'draft', label: 'Draft' },
    { id: 'review', label: 'Ready for Review' }
  ] as const;
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <div className="database-flow-steps" aria-label="Database workflow">
      {steps.map((step, index) => (
        <div key={step.id} className={`database-flow-step ${index <= currentIndex ? 'database-flow-step-active' : ''}`}>
          <span>{index + 1}</span>
          <small>{step.label}</small>
        </div>
      ))}
    </div>
  );
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
        <DatabaseFlowSteps current="analysis" />
        <ArchiveList
          title="Analysis Pack"
          items={[
            fallbackEntry ? `No static analysis pack yet for ${fallbackEntry.title}` : 'No selected entry analysis pack yet',
            'Run database:analyze in the terminal to produce a research and analysis pack',
            'Reviewed packs can be added to data/database-analysis-preview.json for static display'
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
      <DatabaseFlowSteps current="analysis" />
      <div className="database-analysis-hero">
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#00e7ff]">Analysis Pack</div>
          <div className="mt-1 text-[15px] font-semibold leading-tight text-[#f7f7f4]">{pack.topic}</div>
          <div className="mt-1 text-[8.5px] uppercase tracking-[0.13em] text-[#b8b8b2]">{pack.agent} / {pack.readiness_score.label.replace(/_/g, ' ')}</div>
        </div>
        <div className="database-analysis-score">
          <span>{Math.round(pack.readiness_score.score * 100)}</span>
          <small>ready</small>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <AnalysisMetric label="Source mix" value={pack.source_score.source_mix.replace(/_/g, ' ')} />
        <AnalysisMetric label="Primary" value={`${pack.source_score.primary_sources}`} />
        <AnalysisMetric label="Rights" value={pack.rights_summary.publication_default.replace(/_/g, ' ')} />
      </div>

      <AnalysisTagGroup title="Material" tags={materialTags} empty="No material tags yet" />
      <AnalysisTagGroup title="Structure" tags={structureTags} empty="No structure tags yet" />
      <AnalysisTagGroup title="Tectonics / Site" tags={tectonicTags} empty="No tectonic tags yet" />

      <ArchiveList
        title="3D / Blender Layers"
        items={[
          `Readiness: ${pack.model_potential.readiness.replace(/_/g, ' ')} / score ${Math.round(pack.model_potential.score * 100)}%`,
          `Layers: ${pack.model_potential.recommended_layers.join(', ')}`,
          `Collections: ${pack.model_potential.blender_collections.join(', ')}`
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
        title="Rights Gate"
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
          <div key={item} className="border border-[#f7f7f4]/12 bg-[#07181a]/60 px-2 py-1.5 text-[10px] leading-snug text-[#d9d9d2]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function IntakeAction({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className={`border px-2 py-1.5 ${ready ? 'border-[#00e7ff]/55 bg-[#061719]' : 'border-[#f7f7f4]/14 bg-[#050505]/55'}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${ready ? 'text-[#00e7ff]' : 'text-[#8d8d87]'}`}>{label}</div>
      <div className="mt-1 text-[7.5px] uppercase tracking-[0.1em] text-[#b8b8b2]">{ready ? 'ready' : 'needs input'}</div>
    </div>
  );
}

function ArchiveCards({ items }: { items: Array<{ title: string; meta: string; body: string }> }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={`${item.title}-${item.meta}`} className="border border-[#f7f7f4]/12 bg-[#07181a]/60 p-2">
          <div className="truncate text-[10px] font-semibold text-[#f7f7f4]">{item.title}</div>
          <div className="mt-1 truncate text-[8px] uppercase tracking-[0.14em] text-[#00e7ff]">{item.meta}</div>
          <p className="mt-1 line-clamp-3 text-[9.5px] leading-snug text-[#c7c7c2]">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

function classifyIntakeFile(name: string): IntakeFile['kind'] {
  const normalized = name.toLowerCase();
  if (normalized.endsWith('.pdf')) return 'pdf';
  if (/\.(jpg|jpeg|png|webp|tif|tiff)$/i.test(normalized)) return normalized.includes('plan') || normalized.includes('section') || normalized.includes('schnitt') || normalized.includes('grundriss') ? 'plan' : 'image';
  if (/\.(svg|dwg|dxf)$/i.test(normalized)) return 'plan';
  if (/\.(mp4|mov|m4v|avi)$/i.test(normalized)) return 'video';
  if (/\.(glb|gltf|obj|fbx|ifc|blend)$/i.test(normalized)) return 'model';
  if (/\.(txt|md|rtf|doc|docx)$/i.test(normalized)) return 'text';
  return 'other';
}

function summarizeIntakeFiles(files: IntakeFile[]) {
  return files.reduce(
    (summary, file) => {
      if (file.kind === 'pdf' || file.kind === 'text') summary.sources += 1;
      if (file.kind === 'image') summary.image += 1;
      if (file.kind === 'video') summary.video += 1;
      if (file.kind === 'plan') summary.plan += 1;
      if (file.kind === 'model') summary.model += 1;
      if (file.kind === 'image' || file.kind === 'plan' || file.kind === 'video') summary.visual += 1;
      return summary;
    },
    { sources: 0, image: 0, plan: 0, video: 0, visual: 0, model: 0 }
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
      title: entry.source_url.includes('afasia') ? 'Afasia project source' : 'Linked web source',
      meta: entry.source_quality || 'source',
      body: entry.source_url
    });
  }

  (entry.source_documents ?? []).forEach((document) => {
    cards.push({
      title: document,
      meta: 'lecture reference',
      body: `Course/document cluster for ${entry.title}.`
    });
  });

  if (entry.source_assets?.length) {
    cards.push({
      title: `${entry.source_assets.length} source assets`,
      meta: 'asset package',
      body: entry.source_assets.slice(0, 4).map((asset) => asset.label).join(' / ')
    });
  }

  if (cards.length === 0) {
    cards.push({
      title: 'Source placeholder',
      meta: 'unverified',
      body: 'No source records are attached yet.'
    });
  }

  return cards;
}

function findAnalysisPackForEntry(entry: Entry | null) {
  if (!entry) return null;
  return analysisPreview.packs.find((pack) => pack.entry_slug === entry.slug || pack.entry_slug === entry.id) ?? null;
}

const entryTypeOptions: Array<{ value: Entry['entry_type']; label: string }> = [
  { value: 'building', label: 'Building' },
  { value: 'urban_plan', label: 'Urban' },
  { value: 'landscape_project', label: 'Landscape' },
  { value: 'text', label: 'Text' },
  { value: 'theory', label: 'Theory' },
  { value: 'map', label: 'Map' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'object', label: 'Object' },
  { value: 'event', label: 'Event' }
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

function draftToEntryPreview(draft: EntryDraft) {
  const title = draft.title.trim() || 'Untitled Entry';
  const slug = slugify(title);
  const year = Number.parseInt(draft.year, 10) || 2025;
  const themes = splitList(draft.themes);
  const sourceDocuments = splitList(draft.source_documents);
  const lectureCluster = splitList(draft.lecture_cluster);
  const authors = splitList(draft.authors);
  const shortDescription = draft.short_description.trim() || `Draft archive entry for ${title}.`;
  const oneSentence = draft.one_sentence.trim() || `${title} is a draft Architecture Cosmos entry prepared for source, media, model and relation review.`;
  const fullDescription = draft.full_description.trim() || `${title} is currently staged as a local archive draft. Before publication, the entry needs source verification, media-rights review, relation mapping and analysis-layer classification.`;
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
    authors: authors.length > 0 ? authors : ['Unknown author'],
    city: draft.city.trim(),
    country: draft.country.trim(),
    style_sector: draft.style_sector,
    lecture_cluster: lectureCluster.length > 0 ? lectureCluster : ['draft_import'],
    themes: themes.length > 0 ? themes : ['needs-review'],
    short_description: shortDescription,
    one_sentence: oneSentence,
    full_description: fullDescription,
    source_quality: draft.source_url.trim() || sourceDocuments.length > 0 ? 'draft_source_attached' : 'needs_source',
    source_documents: sourceDocuments.length > 0 ? sourceDocuments : ['Draft source note'],
    source_url: draft.source_url.trim(),
    media: mediaTypes.map((type) => ({
      type,
      label: `${mediaTypeLabels[type]} placeholder`,
      placeholder: `${mediaTypeLabels[type]} media slot planned for ${title}.`,
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

function draftToLocalEntry(draft: EntryDraft, existingEntries: Entry[]): Entry {
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

function draftFromResearchSeed(seed: ResearchSeed): EntryDraft {
  const normalizedProject = seed.project.trim();
  const normalizedArchitect = seed.architect.trim();
  const normalizedAddress = seed.address.trim();
  const isIngenbohl = normalizeForMatch(`${normalizedProject} ${normalizedArchitect} ${normalizedAddress}`).includes('ingenbohl');

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
      lecture_cluster: 'Architecture Cosmos dev research, contemporary Swiss architecture',
      source_documents: 'Boltshauser Architekten project page, Baunetz project report, swiss-architects project note',
      source_url: 'https://boltshauser.info/projekt/alterszentrum-kloster-ingenbohl/',
      short_description: 'Umbau und Erweiterung des Klosterareals Ingenbohl zu einem Alterszentrum mit präziser Einbindung in Bestand, Hofstruktur und Landschaft.',
      one_sentence: 'Das Alterszentrum Kloster Ingenbohl verbindet klösterlichen Bestand, neue Pflegearchitektur, Betontragwerk, mineralische Oberflächen und landschaftliche Terrassen zu einem zeitgenössischen Schweizer Umbauprojekt.',
      full_description: 'Der Umbau des Klosters Ingenbohl in Brunnen wird als Weiterbauen am Bestand gelesen: Die neue Struktur ergänzt das klösterliche Ensemble, arbeitet mit Hof, Sockel, Terrassen und präzisen Materialschichten und übersetzt Pflegearchitektur in eine ruhige räumliche Ordnung. Für den Architecture Cosmos ist das Projekt ein wichtiger Referenzknoten für Transformation, Tragwerk, Materialökologie und tektonische Analyse: Beton, mineralische Putze, Holz- und Fassadenschichten, innere Organisation und Landschaftsbezug lassen sich später als Modell- und Filterlayer auswerten.',
      copyright_status: 'needs_permission'
    };
  }

  const title = normalizedProject || 'New Research Entry';
  const normalizedSeed = normalizeForMatch(`${normalizedProject} ${normalizedArchitect} ${normalizedAddress}`);

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
      lecture_cluster: 'Architecture Cosmos dev research, contemporary Swiss architecture',
      source_documents: 'Herzog & de Meuron project page, Kinderspital Zürich project information, architecture press review',
      source_url: 'https://www.herzogdemeuron.com/projects/377-kinderspital-zurich/',
      short_description: 'Neubau des Kinderspitals Zürich als flache, landschaftlich eingebettete Gesundheitsarchitektur mit starker Holz-, Licht- und Hoflogik.',
      one_sentence: 'Das Kinderspital Zürich von Herzog & de Meuron verbindet Gesundheitsbau, dreigeschossiges Betontragwerk, hölzerne Ausfachungen, Höfe, Tageslicht und landschaftliche Einbettung zu einem zeitgenössischen Spitaltyp.',
      full_description: 'Das Kinderspital Zürich wird als Referenz für eine neue Generation von Gesundheitsbauten gelesen: nicht als monolithisches Spital, sondern als räumlich gegliederte, horizontale und landschaftlich eingebundene Architektur. Der Akutspitalbereich wird als dreigeschossiger Betonrahmen mit komplexen hölzernen Ausfachungen beschrieben; im Inneren organisiert eine städtische Logik aus Strassen, Plätzen und grünen Höfen Orientierung und Tageslicht. Für Architecture Cosmos eignet sich das Projekt besonders für Material-, Tragwerks- und Atmosphärenanalyse: Betonrahmen, Holz, Glas, Vegetation, Patientenzimmer als kleine Cottages, Hofräume, Erschliessung und therapeutische Landschaft sollen später als filterbare 3D- und Datenbanklayer geprüft werden.',
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
    authors: normalizedArchitect,
    themes: 'needs research, source verification, rights review, material analysis, structure analysis, tectonic analysis',
    lecture_cluster: 'Architecture Cosmos dev research',
    source_documents: 'Generated research job / sources pending',
    source_url: '',
    short_description: `${title} is staged for AI-assisted research and archive classification.`,
    one_sentence: `${title} is a dev-mode research seed prepared for source discovery, rights review, media intake, model planning and analysis-layer classification.`,
    full_description: `${title} has not been verified yet. The next local research step should collect official project sources, reliable publication references, rights-safe media candidates, project metadata, structural/material/tectonic hypotheses and possible model-generation inputs.`,
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
      reason: 'filename/context matched Villa Savoye aliases',
      aliases: ['villa-savoye', 'savoye', 'poissy', 'le-corbusier']
    },
    {
      project: 'Alterszentrum Kloster Ingenbohl',
      architect: 'Boltshauser Architekten / Roger Boltshauser',
      address: 'Klosterstrasse 20, 6440 Brunnen, Schweiz',
      confidence: 0.82,
      reason: 'filename/context matched Ingenbohl/Boltshauser aliases',
      aliases: ['ingenbohl', 'boltshauser', 'brunnen', 'kloster']
    },
    {
      project: 'Kinderspital Zürich',
      architect: 'Herzog & de Meuron',
      address: 'Lenggstrasse 30, Zürich, Schweiz',
      confidence: 0.78,
      reason: 'filename/context matched Kispi/Kinderspital Zürich aliases',
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
    reason: 'filename matched an existing Architecture Cosmos entry'
  };
}

function draftReadiness(draft: EntryDraft) {
  return [
    { label: 'identity', ready: Boolean(draft.title.trim() && draft.year.trim() && draft.authors.trim()) },
    { label: 'place', ready: Boolean(draft.city.trim() || draft.country.trim()) },
    { label: 'sources', ready: Boolean(draft.source_url.trim() || draft.source_documents.trim()) },
    { label: 'themes', ready: Boolean(draft.themes.trim() || draft.lecture_cluster.trim()) },
    { label: 'text', ready: Boolean(draft.short_description.trim() && draft.one_sentence.trim()) },
    { label: 'rights', ready: draft.copyright_status !== 'needs_permission' }
  ];
}

const mediaTypes: Array<'exterior' | 'interior' | 'section' | 'plan'> = ['exterior', 'interior', 'section', 'plan'];
const mediaTypeLabels = {
  exterior: 'Exterior',
  interior: 'Interior',
  section: 'Section',
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

function SnappedEntryOverlay({ entry, onDismiss }: { entry: Entry; onDismiss: () => void }) {
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
      <g pointerEvents="none" transform={`translate(${cardX} ${cardY}) scale(${cardScale})`}>
        <ProjectDetailCard entry={entry} x={0} y={0} />
      </g>
      <g className="dossier-close" pointerEvents="auto" transform={`translate(${cardX + cardWidth - closeWidth} ${actionY})`} onClick={onDismiss}>
        <rect width={closeWidth} height={actionHeight} fill="#f7f7f4" opacity="0.94" />
        <text x={closeWidth / 2} y={ui.isCoarsePointer ? 27 : 15} textAnchor="middle" fill="#050505" fontSize={actionFont} fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.14em">
          CLOSE
        </text>
      </g>
      <a href={`/atlas/${entry.slug}/`} className="dossier-page-link">
        <g pointerEvents="auto" transform={`translate(${cardX} ${actionY})`}>
          <rect width={ui.dossier.openWidth} height={actionHeight} fill="#050505" stroke="#f7f7f4" strokeWidth="0.58" opacity="0.9" />
          <text x={ui.dossier.openWidth / 2} y={ui.isCoarsePointer ? 27 : 15} textAnchor="middle" fill="#f7f7f4" fontSize={ui.isCoarsePointer ? 12 : 8.2} fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.13em">
            OPEN PAGE
          </text>
        </g>
      </a>
    </g>
  );
}

function ScreenCosmosCursor({ cursorRef, isDossierOpen }: { cursorRef: RefObject<HTMLDivElement | null>; isDossierOpen: boolean }) {
  return (
    <div ref={cursorRef} className={`screen-cosmos-cursor ${isDossierOpen ? 'screen-cosmos-cursor-dossier' : ''}`} aria-hidden="true">
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

  if (current >= 1 && delta > 0) {
    return Math.min(1 + maxOverscroll, current + delta * 0.16);
  }

  if (current > 1 && delta < 0) {
    return Math.max(1, current + delta * 0.78);
  }

  const next = current + delta;
  if (next < 0) return next * 0.22;
  if (next > 1) return 1 + (next - 1) * 0.22;
  return next;
}
