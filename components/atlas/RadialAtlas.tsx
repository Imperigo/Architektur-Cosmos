'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject, type WheelEvent as ReactWheelEvent } from 'react';
import { ProjectDetailCard } from '@/components/atlas/ProjectDetailCard';
import { RelationOverlay } from '@/components/atlas/RelationOverlay';
import { SemanticEntryNode } from '@/components/atlas/SemanticEntryNode';
import { StyleSectors } from '@/components/atlas/StyleSectors';
import { WormholeRings } from '@/components/atlas/WormholeRings';
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
  short_description: string;
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
  short_description: ''
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
    nudgeTravel(delta);
  }

  function focusNodeInView(node: WormholeEntryNode) {
    openDossierFromNode(node.entry);
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

  function pointerToSvgPoint(event: PointerEvent<SVGSVGElement>): SvgPoint | null {
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    return {
      x: ((event.clientX - rect.left) / rect.width) * atlasSize.width,
      y: ((event.clientY - rect.top) / rect.height) * atlasSize.height
    };
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
              <StyleSectors
                state={state}
                isMoving={isTraveling}
                activeStyleLens={activeStyleLens}
                onSelectStyleLens={(styleId) => {
                  setActiveStyleLens((current) => current === styleId ? null : styleId);
                  setShowFilterPanel(false);
                }}
              />

              {showRelations || hoveredEntry || selectedEntry ? (
                <RelationOverlay nodes={displayNodes} relations={relations} selectedEntry={selectedEntry} focusEntry={hoveredEntry} isMoving={isTraveling} />
              ) : null}

              {displayNodes.map((node) => {
                return (
                <g
                  key={node.entry.id}
                  className="node-focus-drift"
                  opacity={node.opacity * styleLensOpacity(node, activeStyleLens) * sourceLensOpacity(node, activeSourceLens)}
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
                    nodeRadius={node.size}
                    showLabel={false}
                    styleLensActive={activeStyleLens === node.entry.style_sector}
                    driftX={node.driftX}
                    driftY={node.driftY}
                    driftDelay={node.driftDelay}
                    onSelect={() => focusNodeInView(node)}
                    onHover={setHoveredEntry}
                  />
                </g>
                );
              })}
            </g>
          </g>
          {selectedEntry ? <SnappedEntryOverlay entry={selectedEntry} onDismiss={closeDossier} /> : null}
          {introState === 'idle' ? (
            <LensAccess isOpen={showFilterPanel} onToggle={() => setShowFilterPanel((current) => !current)} />
          ) : null}
          {showFilterPanel && introState === 'idle' ? (
            <FilterPanel
              activeStyleLens={activeStyleLens}
              activeSourceLens={activeSourceLens}
              showRelations={showRelations}
              sourceLensCount={sourceLensCount}
              onSetStyleLens={setActiveStyleLens}
              onResetLenses={() => {
                setActiveStyleLens(null);
                setActiveSourceLens(null);
                setShowRelations(false);
              }}
              onToggleSourceLens={() => setActiveSourceLens((current) => current === 'afasia' ? null : 'afasia')}
              onToggleRelations={() => setShowRelations((current) => !current)}
              onDismiss={() => setShowFilterPanel(false)}
            />
          ) : null}
          {introState === 'idle' ? (
            <RadialHud
              showRelations={showRelations}
              tunnelDepth={state.timePosition}
              activeStyleLens={activeStyleLens}
              activeSourceLens={activeSourceLens}
              sourceLensCount={sourceLensCount}
              onTravelForward={() => travelBy(0.026)}
              onTravelBackward={() => travelBy(-0.026)}
              onToggleLenses={() => setShowFilterPanel((current) => !current)}
              onToggleSourceLens={() => setActiveSourceLens((current) => current === 'afasia' ? null : 'afasia')}
              onToggleRelations={() => setShowRelations((current) => !current)}
            />
          ) : null}
          {introState === 'idle' ? (
            <DatabaseAccess
              isOpen={showDatabasePanel}
              onToggle={() => setShowDatabasePanel((current) => !current)}
            />
          ) : null}
          {showDatabasePanel && introState === 'idle' ? (
            <DatabaseDraftPanel
              draft={entryDraft}
              onDraftChange={setEntryDraft}
              onDismiss={() => setShowDatabasePanel(false)}
            />
          ) : null}
          {introState === 'idle' ? <TimeReadout timePosition={state.timePosition} currentYear={state.currentYear} /> : null}
          {introState === 'idle' ? <BrandChrome /> : null}
          {cursorVisible ? <CosmosCursor cursorRef={cursorRef} isDossierOpen={Boolean(selectedEntry)} /> : null}
        </svg>
      </div>

      {introState !== 'idle' ? <IntroGate state={introState} onStart={startIntro} /> : null}
    </main>
  );
}

function isReadableNode(node: WormholeEntryNode) {
  const margin = 54;
  const insideFrame = node.x > margin && node.x < atlasSize.width - margin && node.y > margin && node.y < atlasSize.height - margin;
  return insideFrame && node.depth >= 0.012 && node.depth <= 1.24 && node.opacity >= 0.1;
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
  return 0.18 + node.closeness * 0.16;
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
    const hitRadius = Math.max(28, node.size + 22);
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

function LensAccess({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <g
      className={`lens-access ${isOpen ? 'lens-access-open' : ''}`}
      transform="translate(34 70)"
      pointerEvents="auto"
      aria-label="Open atlas lenses"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <rect width="86" height="27" rx="13.5" fill="#050505" stroke={isOpen ? '#00e7ff' : '#f7f7f4'} strokeWidth="0.62" opacity="0.78" />
      <circle cx="17" cy="13.5" r="5.2" fill="none" stroke={isOpen ? '#00e7ff' : '#f7f7f4'} strokeWidth="0.72" />
      <path d="M 10.8 13.5 H 23.2 M 17 7.3 V 19.7" stroke={isOpen ? '#00e7ff' : '#f7f7f4'} strokeWidth="0.56" opacity="0.72" />
      <text x="35" y="17" fill="#f7f7f4" fontSize="7.8" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.18em">
        LENSES
      </text>
    </g>
  );
}

function FilterPanel({
  activeStyleLens,
  activeSourceLens,
  showRelations,
  sourceLensCount,
  onSetStyleLens,
  onResetLenses,
  onToggleSourceLens,
  onToggleRelations,
  onDismiss
}: {
  activeStyleLens: StyleSectorId | null;
  activeSourceLens: SourceLens;
  showRelations: boolean;
  sourceLensCount: number;
  onSetStyleLens: (lens: StyleSectorId | null) => void;
  onResetLenses: () => void;
  onToggleSourceLens: () => void;
  onToggleRelations: () => void;
  onDismiss: () => void;
}) {
  const x = 34;
  const y = 108;
  const tabs = [
    { id: 'all', label: 'ALLE', active: !activeStyleLens && !activeSourceLens && !showRelations, width: 52, onClick: onResetLenses },
    ...styleSectors.map((sector) => ({
      id: sector.id,
      label: styleShortLabel(sector.id),
      active: activeStyleLens === sector.id,
      width: 38,
      onClick: () => onSetStyleLens(activeStyleLens === sector.id ? null : sector.id)
    })),
    { id: 'afasia', label: `AFASIA ${sourceLensCount}`, active: activeSourceLens === 'afasia', width: 84, onClick: onToggleSourceLens },
    { id: 'relations', label: 'REL', active: showRelations, width: 46, onClick: onToggleRelations }
  ];

  return (
    <g className="lens-panel" transform={`translate(${x} ${y})`} pointerEvents="auto" aria-label="Atlas lens panel" onPointerDown={(event) => event.stopPropagation()}>
      <rect width="384" height="88" rx="8" fill="#050505" stroke="#00e7ff" strokeWidth="0.55" opacity="0.82" />
      <text x="15" y="23" fill="#9cfff7" fontSize="7.4" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.22em" opacity="0.86">
        ACTIVE LENSES
      </text>
      <g className="lens-panel-close" transform="translate(342 11)" onClick={(event) => { event.stopPropagation(); onDismiss(); }}>
        <rect width="25" height="15" rx="7.5" fill="#f7f7f4" opacity="0.84" />
        <text x="12.5" y="10.8" textAnchor="middle" fill="#050505" fontSize="7" fontFamily="var(--font-sans), system-ui, sans-serif">
          X
        </text>
      </g>
      {tabs.map((tab, index) => {
        const row = index < 5 ? 0 : 1;
        const rowTabs = row === 0 ? tabs.slice(0, 5) : tabs.slice(5);
        const tabX = rowTabs.slice(0, index - (row === 0 ? 0 : 5)).reduce((sum, item) => sum + item.width + 7, 15);
        const tabY = row === 0 ? 36 : 60;

        return (
          <g
            key={tab.id}
            className={`filter-tab ${tab.active ? 'filter-tab-active' : ''}`}
            transform={`translate(${tabX} ${tabY})`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              tab.onClick();
            }}
          >
            <rect width={tab.width} height="18" rx="9" fill={tab.active ? '#f7f7f4' : '#050505'} stroke={tab.active ? '#00e7ff' : '#f7f7f4'} strokeWidth="0.5" opacity={tab.active ? 0.92 : 0.72} />
            <text x={tab.width / 2} y="12.4" textAnchor="middle" fill={tab.active ? '#050505' : '#f7f7f4'} fontSize="6.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.11em">
              {tab.label}
            </text>
          </g>
        );
      })}
    </g>
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
      <text x="34" y="38" fill="#f7f7f4" fontSize="11" fontWeight="600" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.28em" opacity="0.72">
        ARCHITECTURE COSMOS
      </text>
      <text x={atlasSize.width - 34} y="38" textAnchor="end" fill="#c7c7c2" fontSize="9" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.22em" opacity="0.62">
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
        <span className="intro-title-byline mt-4 block text-[clamp(0.7rem,1.5vw,1rem)] uppercase tracking-[0.42em] text-neutral-300">
          made by andrin
        </span>
      </span>
    </button>
  );
}

function DatabaseDraftPanel({
  draft,
  onDraftChange,
  onDismiss
}: {
  draft: EntryDraft;
  onDraftChange: (draft: EntryDraft) => void;
  onDismiss: () => void;
}) {
  const x = atlasSize.width - 392;
  const y = atlasSize.height - 418;
  const preview = draftToEntryPreview(draft);

  function updateField<Key extends keyof EntryDraft>(key: Key, value: EntryDraft[Key]) {
    onDraftChange({ ...draft, [key]: value });
  }

  return (
    <foreignObject x={x} y={y} width="360" height="350" className="database-draft" pointerEvents="auto">
      <div
        className="border border-[#00e7ff]/70 bg-[#050505]/95 p-4 text-[#f7f7f4] shadow-[0_0_28px_rgb(0_231_255_/_0.12)]"
        style={{ width: 360, height: 350 }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#00e7ff]">New Entry Draft</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#b8b8b2]">Static JSON preview only</div>
          </div>
          <button className="h-6 w-8 border border-[#f7f7f4]/70 text-[10px] text-[#050505] bg-[#f7f7f4]" type="button" onClick={onDismiss}>X</button>
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
        </div>
        <pre className="mt-3 h-[70px] overflow-hidden whitespace-pre-wrap border border-[#00e7ff]/25 bg-black/35 p-2 text-[9px] leading-snug text-[#c9fff4]">
          {JSON.stringify(preview, null, 2)}
        </pre>
        <label className="mt-2 block text-[9px] uppercase tracking-[0.16em] text-[#b8b8b2]">
          Short text
          <textarea
            className="mt-1 h-10 w-full resize-none border border-[#f7f7f4]/20 bg-[#07181a] px-2 py-1 text-[11px] leading-tight text-[#f7f7f4] outline-none"
            value={draft.short_description}
            maxLength={180}
            onChange={(event) => updateField('short_description', event.target.value)}
          />
        </label>
      </div>
    </foreignObject>
  );
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
  return {
    id: slugify(title),
    title,
    entry_type: draft.entry_type,
    year_start: Number.parseInt(draft.year, 10) || 2025,
    authors: splitList(draft.authors),
    city: draft.city.trim(),
    country: draft.country.trim(),
    style_sector: draft.style_sector,
    themes: splitList(draft.themes),
    short_description: draft.short_description.trim()
  };
}

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
