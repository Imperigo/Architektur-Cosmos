'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent, type RefObject, type WheelEvent as ReactWheelEvent } from 'react';
import { ProjectDetailCard } from '@/components/atlas/ProjectDetailCard';
import { RelationOverlay } from '@/components/atlas/RelationOverlay';
import { SemanticEntryNode } from '@/components/atlas/SemanticEntryNode';
import { StyleSectors } from '@/components/atlas/StyleSectors';
import { WormholeRings } from '@/components/atlas/WormholeRings';
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
  copyright_status: 'needs_permission' | 'licensed' | 'public_domain' | 'own_work';
};
type IntakeFile = {
  id: string;
  name: string;
  size: number;
  kind: 'pdf' | 'image' | 'plan' | 'video' | 'model' | 'text' | 'other';
  status: 'queued' | 'classified';
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
  const [entryDraft, setEntryDraft] = useState<EntryDraft>(initialEntryDraft);
  const [intakeFiles, setIntakeFiles] = useState<IntakeFile[]>([]);
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
  const state = useMemo(() => wormholeState(motion.currentTravel), [motion.currentTravel]);
  const activeSelectedEntryId = selectedEntry?.id ?? null;
  const nodes = useMemo(() => layoutWormholeEntries(entries, state, activeSelectedEntryId ?? undefined), [activeSelectedEntryId, entries, state]);
  const displayNodes = useMemo(() => limitDisplayNodes(nodes), [nodes]);
  const isTraveling = motion.isMoving;
  const sourceLensCount = useMemo(() => entries.filter((entry) => isSourceLensEntry(entry, 'afasia')).length, [entries]);
  const hoveredEntry = useMemo(() => displayNodes.find((node) => node.entry.id === hoveredEntryId)?.entry ?? null, [displayNodes, hoveredEntryId]);
  const cursorVisible = introState === 'idle' && !isTraveling;
  const isIntroActive = introState !== 'idle';
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
      if (event.cancelable) event.preventDefault();
    };
    const preventBrowserTouch = (event: TouchEvent) => {
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

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
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
    <main className={`relative h-screen w-screen overflow-hidden bg-[#050505] text-[#f7f7f4] ${introState === 'launching' ? 'cosmos-launching' : ''} ${isTraveling ? 'cosmos-moving' : ''} ${introState === 'idle' && !isTraveling ? 'cosmos-idle' : ''}`}>
      <div className="h-full w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${atlasSize.width} ${atlasSize.height}`}
          className="h-full w-full touch-none cursor-none"
          onWheel={handleWheel}
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
              <WormholeRings state={state} isMoving={isTraveling} />

              {showRelations || hoveredEntry || selectedEntry ? (
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
          {showDatabasePanel && introState === 'idle' ? (
            <DatabaseArchivePanel
              entries={entries}
              relations={relations}
              selectedEntry={selectedEntry}
              draft={entryDraft}
              intakeFiles={intakeFiles}
              onDraftChange={setEntryDraft}
              onIntakeFilesChange={setIntakeFiles}
              onDismiss={() => setShowDatabasePanel(false)}
            />
          ) : null}
          {introState === 'idle' ? <TimeReadout timePosition={state.timePosition} currentYear={state.currentYear} /> : null}
          {introState === 'idle' ? <BrandChrome /> : null}
          {cursorVisible ? <CosmosCursor cursorRef={cursorRef} isDossierOpen={Boolean(selectedEntry)} /> : null}
        </svg>
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
      </div>

      {introState !== 'idle' ? <IntroGate state={introState} onStart={startIntro} /> : null}
    </main>
  );
}

function isInterfaceTarget(target: EventTarget) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('.radial-hud, .lens-access, .lens-panel, .database-access, .database-draft, .dossier-overlay, .style-sector'));
}

function isReadableNode(node: WormholeEntryNode) {
  const margin = 54;
  const insideFrame = node.x > margin && node.x < atlasSize.width - margin && node.y > margin && node.y < atlasSize.height - margin;
  return insideFrame && node.depth >= 0.002 && node.depth <= 1.24 && node.opacity >= 0.02;
}

function limitDisplayNodes(nodes: WormholeEntryNode[]) {
  return nodes
    .filter(isReadableNode)
    .sort((a, b) => nodeRenderPriority(b) - nodeRenderPriority(a))
    .slice(0, 112)
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
  const controlsOpacity = Math.max(0.46, 1 - tunnelDepth / 0.76);
  const lensLabel = activeStyleLens ? styleShortLabel(activeStyleLens) : 'All';
  const buttons = [
    { id: 'back', label: 'Time -', active: false, width: 58, onClick: onTravelBackward },
    { id: 'forward', label: 'Time +', active: false, width: 58, onClick: onTravelForward },
    { id: 'lenses', label: `Lens ${lensLabel}`, active: Boolean(activeStyleLens), width: 72, onClick: onToggleLenses },
    { id: 'afasia', label: `Afasia ${sourceLensCount}`, active: activeSourceLens === 'afasia', width: 82, onClick: onToggleSourceLens },
    { id: 'relations', label: 'Relations', active: showRelations, width: 78, onClick: onToggleRelations }
  ];
  let cursorX = atlasSize.cx - buttons.reduce((sum, button) => sum + button.width + 7, -7) / 2;

  return (
    <g className="radial-hud navigation-dock" pointerEvents="auto" opacity={controlsOpacity}>
      <rect x={atlasSize.cx - 190} y="914" width="380" height="38" rx="19" fill="#050505" stroke="#f7f7f4" strokeWidth="0.48" opacity="0.7" />
      {buttons.map((button) => {
        const x = cursorX;
        cursorX += button.width + 7;
        return <DockButton key={button.id} x={x} y={923} width={button.width} label={button.label} active={button.active} onClick={button.onClick} />;
      })}
      {activeSourceLens ? (
        <text x={atlasSize.cx} y="907" textAnchor="middle" fill="#65ff9a" fontSize="7.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.18em" opacity="0.9">
          AFASIA SOURCE LENS / {sourceLensCount} PROJECT
        </text>
      ) : null}
    </g>
  );
}

function DockButton({ x, y, width, label, active, onClick }: { x: number; y: number; width: number; label: string; active: boolean; onClick: () => void }) {
  function handleActivate(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    onClick();
  }

  return (
    <g className="dock-button" pointerEvents="auto" onPointerDown={(event) => event.stopPropagation()} onClick={handleActivate} aria-label={label}>
      <rect x={x} y={y} width={width} height="20" rx="10" fill={active ? '#f7f7f4' : '#050505'} stroke={active ? '#00e7ff' : '#f7f7f4'} strokeWidth="0.58" opacity={active ? 0.94 : 0.76} />
      <text x={x + width / 2} y={y + 13.2} textAnchor="middle" fill={active ? '#050505' : '#f7f7f4'} fontSize="6.6" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
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
    <div className="lens-control" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <button type="button" className={`lens-control-trigger ${isOpen ? 'lens-control-trigger-open' : ''}`} onClick={onToggle}>
        <span className="lens-control-mark" aria-hidden="true" />
        <span>Lenses</span>
      </button>
      {isOpen ? (
        <div className="lens-control-panel" role="dialog" aria-label="Atlas lenses">
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
  const x = atlasSize.width - 112;
  const y = atlasSize.height - 52;
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
      <rect x="0" y="-16" width="84" height="32" rx="16" fill={isOpen ? '#f7f7f4' : '#050505'} stroke="#00e7ff" strokeWidth="0.62" opacity="0.88" />
      <g className="database-access-core" stroke="#f7f7f4" fill="none" strokeWidth="0.72" opacity="0.9">
        <ellipse cx="14" cy="-3.6" rx="5.6" ry="2.2" stroke={isOpen ? '#050505' : '#f7f7f4'} />
        <path d="M 8.4 -3.6 V 5.4 Q 14 8.2 19.6 5.4 V -3.6" stroke={isOpen ? '#050505' : '#f7f7f4'} />
        <path d="M 8.4 1.2 Q 14 4 19.6 1.2" stroke={isOpen ? '#050505' : '#f7f7f4'} opacity="0.52" />
      </g>
      <text x="29" y="3" fill={isOpen ? '#050505' : '#f7f7f4'} fontSize="7.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.12em">
        DATABASE
      </text>
      <rect
        x="0"
        y="-16"
        width="84"
        height="32"
        rx="16"
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
      <text x={atlasSize.cx} y="49" textAnchor="middle" fill="#c7c7c2" fontSize="7" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.18em" opacity="0.52">
        MADE BY ANDRIN BAUMANN
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

type DatabaseTab = 'overview' | 'intake' | 'entries' | 'sources' | 'media' | 'models' | 'analysis' | 'relations' | 'draft';

function DatabaseArchivePanel({
  entries,
  relations,
  selectedEntry,
  draft,
  intakeFiles,
  onDraftChange,
  onIntakeFilesChange,
  onDismiss
}: {
  entries: Entry[];
  relations: EntryRelation[];
  selectedEntry: Entry | null;
  draft: EntryDraft;
  intakeFiles: IntakeFile[];
  onDraftChange: (draft: EntryDraft) => void;
  onIntakeFilesChange: (files: IntakeFile[]) => void;
  onDismiss: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DatabaseTab>(selectedEntry ? 'entries' : 'intake');
  const x = atlasSize.width - 414;
  const y = atlasSize.height - 536;
  const preview = draftToEntryPreview(draft);
  const intakeSlug = preview.slug;
  const intakeStats = summarizeIntakeFiles(intakeFiles);
  const pilotEntry = archivePreview.entries[0];
  const currentEntry = selectedEntry ?? entries.find((entry) => entry.id === pilotEntry.id) ?? null;
  const currentProfile = currentEntry?.database_profile;
  const counts = [
    { label: 'Entries', value: entries.length },
    { label: 'Sources', value: archivePreview.entry_sources.length },
    { label: 'Media', value: archivePreview.entry_media.length },
    { label: '3D', value: archivePreview.entry_models.length },
    { label: 'Analysis', value: archivePreview.entry_analysis.length },
    { label: 'Relations', value: relations.length }
  ];
  const tabs: Array<{ id: DatabaseTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'intake', label: 'Intake' },
    { id: 'entries', label: 'Entries' },
    { id: 'sources', label: 'Sources' },
    { id: 'media', label: 'Media' },
    { id: 'models', label: '3D' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'relations', label: 'Relations' },
    { id: 'draft', label: 'Draft' }
  ];

  function updateField<Key extends keyof EntryDraft>(key: Key, value: EntryDraft[Key]) {
    onDraftChange({ ...draft, [key]: value });
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

  return (
    <foreignObject x={x} y={y} width="382" height="468" className="database-draft database-archive-panel" pointerEvents="auto">
      <div
        className="flex flex-col border border-[#00e7ff]/70 bg-[#050505]/95 p-4 text-[#f7f7f4] shadow-[0_0_28px_rgb(0_231_255_/_0.12)]"
        style={{ width: 382, height: 468 }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#00e7ff]">Architecture Cosmos Database</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#b8b8b2]">Local intake console / static frontend</div>
          </div>
          <div className="flex gap-1.5">
            <a className="border border-[#00e7ff]/70 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[#00e7ff]" href="/archive/">
              Open
            </a>
            <button className="h-6 w-8 border border-[#f7f7f4]/70 text-[10px] text-[#050505] bg-[#f7f7f4]" type="button" onClick={onDismiss}>X</button>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-1.5">
          {counts.map((item) => (
            <div key={item.label} className="border border-[#f7f7f4]/15 bg-[#07181a]/80 px-2 py-1.5">
              <div className="text-[13px] font-semibold leading-none text-[#f7f7f4]">{item.value}</div>
              <div className="mt-1 truncate text-[8px] uppercase tracking-[0.12em] text-[#b8b8b2]">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`border px-2 py-1 text-[8.5px] uppercase tracking-[0.11em] ${activeTab === tab.id ? 'border-[#00e7ff] bg-[#00e7ff] text-[#050505]' : 'border-[#f7f7f4]/20 bg-[#050505] text-[#d9d9d2]'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {activeTab === 'overview' ? (
            <div className="space-y-2 text-[10px] leading-relaxed text-[#d9d9d2]">
              <ArchiveRow label="Storage" value={`${archivePreview.storage_target.database.toUpperCase()} metadata / R2 preview bucket`} />
              <ArchiveRow label="Status" value={`Cloud D1 + R2 preview ready / ${archivePreview.storage_target.frontend_connection.replace(/_/g, ' ')}`} />
              <ArchiveRow label="D1" value={`${archivePreview.storage_target.database_name} / verified ${archivePreview.storage_target.last_verified}`} />
              <ArchiveRow label="R2" value={`${archivePreview.storage_target.assets_bucket_name ?? 'not configured'} / no uploads`} />
              <ArchiveRow label="Assets" value={archivePreview.storage_target.assets_status.replace(/_/g, ' ')} />
              <ArchiveRow label="Pilot" value={`${pilotEntry.title}, ${pilotEntry.year_start}, ${pilotEntry.city}`} />
              {selectedEntry ? <ArchiveRow label="Current" value={`${selectedEntry.title} / ${selectedEntry.database_profile?.status ?? 'local entry'}`} /> : null}
              <p className="border border-[#00e7ff]/25 bg-[#061719] p-2 text-[#c9fff4]">
                The archive foundation now exists as Cloudflare D1 plus an empty R2 preview bucket while this frontend still reads bundled JSON. Asset uploads remain blocked until media rights and file policy are ready.
              </p>
              <ArchiveList
                title="Local Capture Automation"
                items={[
                  'Drop PDFs, books, plans, images or model files into archive-inbox/{slug}',
                  'Run archive:capture to generate entry draft, source candidates, asset candidates and model-package placeholders',
                  '10 GB local private storage guardrail across archive-inbox and archive-intake',
                  'Only own_work, licensed and public_domain assets are marked public-display ready'
                ]}
              />
              <ArchiveList title="Next Database Steps" items={['Keep D1 preview in sync with archive:d1-preview', 'Use D1 for validation and query design, not live reads yet', 'Keep R2 uploads blocked until media/model upload policy is ready', 'Add read-only Worker API only after static schema is proven']} />
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
                  PDFs, scans, plans, images, video, text notes and model files. This browser preview classifies files only; real capture still runs locally from archive-inbox.
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
                  No files staged yet. For the real local run, create archive-inbox/{intakeSlug} and place the same files there.
                </p>
              )}

              <ArchiveList
                title="Local automation sequence"
                items={[
                  `mkdir -p archive-inbox/${intakeSlug}`,
                  `npm run archive:autopilot -- --input archive-inbox/${intakeSlug} --title "${preview.title}" --copyright ${draft.copyright_status}`,
                  `npm run archive:capture -- --input archive-inbox/${intakeSlug} --title "${preview.title}"`,
                  `npm run archive:model-plan -- --entry ${intakeSlug}`,
                  `npm run archive:model-generate -- --entry ${intakeSlug}`,
                  'future: run Gaussian splat generation after own/licensed video frames are staged'
                ]}
              />

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

          {activeTab === 'analysis' ? (
            <ArchiveCards items={(currentEntry?.analysis_layers?.length ? currentEntry.analysis_layers : archivePreview.entry_analysis).map((analysis) => ({ title: analysis.analysis_type.replace(/_/g, ' '), meta: analysis.review_status, body: analysis.summary }))} />
          ) : null}

          {activeTab === 'relations' ? (
            <ArchiveList title="Knowledge Graph" items={[`${relations.length} local relations available now`, 'D1 table prepared for influence, theme, source and structural relations', 'Hover network can later read the same graph instead of local JSON']} />
          ) : null}

          {activeTab === 'draft' ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[9px] uppercase tracking-[0.16em] text-[#b8b8b2]">New Entry Draft / local JSON preview only</div>
                <button
                  type="button"
                  className="border border-[#f7f7f4]/25 px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-[#d9d9d2]"
                  onClick={() => onDraftChange(initialEntryDraft)}
                >
                  Reset
                </button>
              </div>
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
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-entry';
}

function SnappedEntryOverlay({ entry, onDismiss }: { entry: Entry; onDismiss: () => void }) {
  const cardScale = 1.42;
  const cardWidth = 352 * cardScale;
  const cardHeight = 292 * cardScale;
  const cardX = atlasSize.cx - cardWidth / 2;
  const cardY = atlasSize.cy - cardHeight / 2;

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
      <g className="dossier-close" pointerEvents="auto" transform={`translate(${cardX + cardWidth - 46} ${cardY - 34})`} onClick={onDismiss}>
        <rect width="46" height="22" fill="#f7f7f4" opacity="0.94" />
        <text x="23" y="15" textAnchor="middle" fill="#050505" fontSize="9" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.14em">
          CLOSE
        </text>
      </g>
      <a href={`/atlas/${entry.slug}/`} className="dossier-page-link">
        <g pointerEvents="auto" transform={`translate(${cardX} ${cardY - 34})`}>
          <rect width="76" height="22" fill="#050505" stroke="#f7f7f4" strokeWidth="0.58" opacity="0.9" />
          <text x="38" y="15" textAnchor="middle" fill="#f7f7f4" fontSize="8.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.13em">
            OPEN PAGE
          </text>
        </g>
      </a>
    </g>
  );
}

function CosmosCursor({ cursorRef, isDossierOpen }: { cursorRef: RefObject<SVGGElement | null>; isDossierOpen: boolean }) {
  return (
    <g ref={cursorRef} className="cosmos-cursor" pointerEvents="none" transform={`translate(${atlasSize.cx} ${atlasSize.cy})`} opacity={isDossierOpen ? 0.78 : 1}>
      <circle r="12" fill="none" stroke="#050505" strokeWidth="3.4" opacity="0.88" />
      <circle r="10" fill="none" stroke="#f7f7f4" strokeWidth="0.8" opacity="0.6" />
      <circle r="7.2" fill="none" stroke="#00e7ff" strokeWidth="0.45" opacity={isDossierOpen ? 0.32 : 0.46} />
      <circle r="2.1" fill="#f7f7f4" opacity="0.86" />
      <line x1="-18" y1="0" x2="-11" y2="0" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
      <line x1="11" y1="0" x2="18" y2="0" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
      <line x1="0" y1="-18" x2="0" y2="-11" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
      <line x1="0" y1="11" x2="0" y2="18" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
    </g>
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
