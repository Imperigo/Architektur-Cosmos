'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
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
type DatabaseTab = 'entries' | 'media' | 'sources' | 'relations' | 'tags';

export function RadialAtlas({ entries, relations }: { entries: Entry[]; relations: EntryRelation[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
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
  const [pointerPoint, setPointerPoint] = useState<SvgPoint | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showDatabasePanel, setShowDatabasePanel] = useState(false);
  const [activeDatabaseTab, setActiveDatabaseTab] = useState<DatabaseTab>('entries');
  const motionRef = useRef({
    currentTravel: 0,
    targetTravel: 0,
    velocity: 0,
    frame: null as number | null,
    timeout: null as number | null
  });
  const pendingPointerPointRef = useRef<SvgPoint | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const state = useMemo(() => wormholeState(motion.currentTravel), [motion.currentTravel]);
  const activeSelectedEntryId = selectedEntry?.id ?? null;
  const nodes = useMemo(() => layoutWormholeEntries(entries, state, activeSelectedEntryId ?? undefined), [activeSelectedEntryId, entries, state]);
  const displayNodes = useMemo(() => limitDisplayNodes(nodes), [nodes]);
  const isTraveling = motion.isMoving;
  const sourceLensCount = useMemo(() => entries.filter((entry) => isSourceLensEntry(entry, 'afasia')).length, [entries]);
  const cursorPoint = introState === 'idle' && !isTraveling ? pointerPoint ?? { x: atlasSize.cx, y: atlasSize.cy } : null;
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
    setPointerPoint(point);
  }

  function handlePointerLeave() {
    pendingPointerPointRef.current = null;
    setPointerPoint(null);

    if (pointerFrameRef.current !== null) {
      window.cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }

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
              <StyleSectors state={state} isMoving={isTraveling} activeStyleLens={activeStyleLens} />

              {showRelations ? <RelationOverlay nodes={displayNodes} relations={relations} selectedEntry={selectedEntry} isMoving={isTraveling} /> : null}

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
                    nodeRadius={node.size}
                    showLabel={false}
                    styleLensActive={activeStyleLens === node.entry.style_sector}
                    driftX={node.driftX}
                    driftY={node.driftY}
                    driftDelay={node.driftDelay}
                    onSelect={() => focusNodeInView(node)}
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
              onTravelForward={() => travelBy(0.018)}
              onTravelBackward={() => travelBy(-0.018)}
              onCycleStyleLens={() => setActiveStyleLens((current) => nextStyleLens(current))}
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
            <DatabasePlaceholderPanel
              activeTab={activeDatabaseTab}
              onTabChange={setActiveDatabaseTab}
              onDismiss={() => setShowDatabasePanel(false)}
            />
          ) : null}
          {introState === 'idle' ? <TimeReadout timePosition={state.timePosition} currentYear={state.currentYear} /> : null}
          {introState === 'idle' ? <BrandChrome /> : null}
          {cursorPoint ? <CosmosCursor pointer={cursorPoint} isDossierOpen={Boolean(selectedEntry)} /> : null}
        </svg>
      </div>

      {introState !== 'idle' ? <IntroGate state={introState} onStart={startIntro} /> : null}
    </main>
  );
}

function isReadableNode(node: WormholeEntryNode) {
  const margin = 54;
  const insideFrame = node.x > margin && node.x < atlasSize.width - margin && node.y > margin && node.y < atlasSize.height - margin;
  return insideFrame && node.depth >= 0.018 && node.depth <= 0.9 && node.opacity >= 0.12;
}

function limitDisplayNodes(nodes: WormholeEntryNode[]) {
  return nodes
    .filter(isReadableNode)
    .sort((a, b) => nodeRenderPriority(b) - nodeRenderPriority(a))
    .slice(0, 72)
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
  return 0.035 + node.closeness * 0.055;
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
  onCycleStyleLens,
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
  onCycleStyleLens: () => void;
  onToggleSourceLens: () => void;
  onToggleRelations: () => void;
}) {
  const controlsOpacity = Math.max(0.46, 1 - tunnelDepth / 0.76);
  const lensLabel = activeStyleLens ? styleSectors.find((sector) => sector.id === activeStyleLens)?.label ?? 'Stil' : 'Alle Stile';

  return (
    <g className="radial-hud navigation-dock" pointerEvents="auto" opacity={controlsOpacity}>
      <rect x={atlasSize.cx - 132} y="918" width="264" height="30" rx="15" fill="#050505" stroke="#f7f7f4" strokeWidth="0.5" opacity="0.68" />
      <g opacity={controlsOpacity}>
        <HudButton x={atlasSize.cx - 92} y={933} kind="backward" label="zurueck" onClick={onTravelBackward} />
        <HudButton x={atlasSize.cx - 46} y={933} kind="forward" label="vor" onClick={onTravelForward} />
        <HudButton x={atlasSize.cx} y={933} kind="lens" label={lensLabel} active={Boolean(activeStyleLens)} onClick={onCycleStyleLens} />
        <HudButton x={atlasSize.cx + 46} y={933} kind="source" label="afasia" active={activeSourceLens === 'afasia'} onClick={onToggleSourceLens} />
        <HudButton x={atlasSize.cx + 92} y={933} kind="relations" label="relations" active={showRelations} onClick={onToggleRelations} />
      </g>
      {activeSourceLens ? (
        <text x={atlasSize.cx} y="907" textAnchor="middle" fill="#65ff9a" fontSize="7.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.18em" opacity="0.9">
          AFASIA SOURCE LENS / {sourceLensCount} PROJECT
        </text>
      ) : null}
    </g>
  );
}

function HudButton({ x, y, kind, label, active = false, onClick }: { x: number; y: number; kind: 'backward' | 'forward' | 'lens' | 'source' | 'relations'; label: string; active?: boolean; onClick: () => void }) {
  function handleActivate(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    onClick();
  }

  return (
    <g className="hud-button" pointerEvents="auto" onPointerDown={(event) => event.stopPropagation()} onClick={handleActivate} aria-label={label}>
      <circle cx={x} cy={y} r="19" fill="#050505" opacity="0.001" />
      <circle cx={x} cy={y} r="12.5" fill={active ? '#f7f7f4' : '#050505'} stroke={active ? '#00e7ff' : '#f7f7f4'} strokeWidth="0.75" opacity="0.88" />
      <HudIcon x={x} y={y} kind={kind} active={active} />
    </g>
  );
}

function HudIcon({ x, y, kind, active }: { x: number; y: number; kind: 'backward' | 'forward' | 'lens' | 'source' | 'relations'; active: boolean }) {
  const stroke = active ? '#050505' : '#f7f7f4';

  if (kind === 'relations') {
    return (
      <g stroke={stroke} fill={active ? '#050505' : '#f7f7f4'} strokeWidth="0.9" opacity="0.9">
        <line x1={x - 4.2} y1={y + 3.2} x2={x} y2={y - 4.5} />
        <line x1={x} y1={y - 4.5} x2={x + 4.4} y2={y + 3.2} />
        <circle cx={x - 4.2} cy={y + 3.2} r="1.6" />
        <circle cx={x} cy={y - 4.5} r="1.6" />
        <circle cx={x + 4.4} cy={y + 3.2} r="1.6" />
      </g>
    );
  }

  if (kind === 'lens') {
    return (
      <g stroke={stroke} fill="none" strokeWidth="1" opacity="0.9">
        <circle cx={x} cy={y} r="5.1" />
        <path d={`M ${x - 7} ${y} H ${x + 7}`} />
        <path d={`M ${x} ${y - 7} V ${y + 7}`} opacity="0.55" />
      </g>
    );
  }

  if (kind === 'source') {
    return (
      <g stroke={stroke} fill="none" strokeWidth="0.95" opacity="0.92">
        <path d={`M ${x - 6.4} ${y + 4.8} H ${x + 6.4}`} />
        <path d={`M ${x - 5.5} ${y + 2.2} C ${x - 3.3} ${y - 5.8}, ${x + 3.3} ${y - 5.8}, ${x + 5.5} ${y + 2.2}`} />
        <circle cx={x} cy={y - 1.4} r="1.3" fill={stroke} />
      </g>
    );
  }

  return (
    <g stroke={stroke} strokeWidth="1.25" fill="none" opacity="0.9">
      <path d={kind === 'forward' ? `M ${x - 4} ${y - 6} L ${x + 4} ${y} L ${x - 4} ${y + 6}` : `M ${x + 4} ${y - 6} L ${x - 4} ${y} L ${x + 4} ${y + 6}`} />
      <line x1={kind === 'forward' ? x - 6 : x + 6} y1={y} x2={kind === 'forward' ? x + 5 : x - 5} y2={y} opacity="0.5" />
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
  const x = atlasSize.width - 164;
  const y = atlasSize.height - 54;
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
      <rect className="database-access-shell" x="0" y="-16" width="128" height="32" rx="16" fill="#050505" stroke="#00e7ff" strokeWidth="0.55" opacity="0.74" />
      <g className="database-access-core" stroke="#f7f7f4" fill="none" strokeWidth="0.72" opacity="0.9">
        <ellipse cx="16" cy="-4.4" rx="6.1" ry="2.4" />
        <path d="M 9.9 -4.4 V 5.8 Q 16 9.1 22.1 5.8 V -4.4" />
        <path d="M 9.9 0.8 Q 16 4 22.1 0.8" opacity="0.52" />
      </g>
      <text className="database-access-label" x="34" y="3" fill="#f7f7f4" fontSize="7.5" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.2em">
        DATABASE / ARCHIVE
      </text>
      <rect
        x="0"
        y="-16"
        width="128"
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

function nextStyleLens(current: StyleSectorId | null): StyleSectorId | null {
  if (!current) return styleSectors[0].id;
  const currentIndex = styleSectors.findIndex((sector) => sector.id === current);
  const next = styleSectors[currentIndex + 1];
  return next?.id ?? null;
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

function DatabasePlaceholderPanel({
  activeTab,
  onTabChange,
  onDismiss
}: {
  activeTab: DatabaseTab;
  onTabChange: (tab: DatabaseTab) => void;
  onDismiss: () => void;
}) {
  const x = atlasSize.width - 310;
  const y = atlasSize.height - 234;
  const tabs: Array<{ id: DatabaseTab; label: string; description: string }> = [
    { id: 'entries', label: 'Entries', description: 'Projekte, Texte, Plaene, Events.' },
    { id: 'media', label: 'Media', description: 'Bild, Schnitt, Grundriss, 3D.' },
    { id: 'sources', label: 'Sources', description: 'PDFs, Afasia, Literatur.' },
    { id: 'relations', label: 'Relations', description: 'Einfluss, Thema, Ort, Autor.' },
    { id: 'tags', label: 'Tags', description: 'Themen, Kurse, Layer, Linsen.' }
  ];
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <g className="database-placeholder" pointerEvents="auto">
      <rect x={x} y={y} width="270" height="166" rx="4" fill="#050505" stroke="#00e7ff" strokeWidth="0.75" opacity="0.92" />
      <text x={x + 18} y={y + 30} fill="#f7f7f4" fontSize="11.2" fontWeight="650" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.16em">
        COSMOS DATABASE
      </text>
      <text x={x + 18} y={y + 52} fill="#b8b8b2" fontSize="8.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
        PLATZHALTER FUER DAS SPAETERE ARCHIVSYSTEM
      </text>
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <g
            key={tab.id}
            className={`database-tab ${isActive ? 'database-tab-active' : ''}`}
            transform={`translate(${x + 18 + (index % 2) * 116} ${y + 72 + Math.floor(index / 2) * 23})`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onTabChange(tab.id);
            }}
          >
            <rect width="98" height="15" rx="7.5" fill={isActive ? '#f7f7f4' : '#07181a'} stroke={isActive ? '#00e7ff' : index % 2 === 0 ? '#00e7ff' : '#ffb000'} strokeWidth="0.45" opacity="0.92" />
            <text x="49" y="10.8" textAnchor="middle" fill={isActive ? '#050505' : '#f7f7f4'} fontSize="7.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.12em">
              {tab.label.toUpperCase()}
            </text>
          </g>
        );
      })}
      <g transform={`translate(${x + 18} ${y + 145})`} pointerEvents="none">
        <line x1="0" y1="-11" x2="232" y2="-11" stroke="#00e7ff" strokeWidth="0.45" opacity="0.32" />
        <text x="0" y="0" fill="#f7f7f4" fontSize="7.4" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.12em">
          {currentTab.label.toUpperCase()}
        </text>
        <text x="0" y="13" fill="#b8b8b2" fontSize="7" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.04em">
          {currentTab.description.toUpperCase()}
        </text>
      </g>
      <g className="dossier-close" pointerEvents="auto" transform={`translate(${x + 232} ${y + 12})`} onClick={(event) => { event.stopPropagation(); onDismiss(); }}>
        <rect width="28" height="16" rx="8" fill="#f7f7f4" opacity="0.88" />
        <text x="14" y="11.2" textAnchor="middle" fill="#050505" fontSize="7.2" fontFamily="var(--font-sans), system-ui, sans-serif">
          X
        </text>
      </g>
    </g>
  );
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

function CosmosCursor({ pointer, isDossierOpen }: { pointer: SvgPoint; isDossierOpen: boolean }) {
  return (
    <g className="cosmos-cursor" pointerEvents="none" transform={`translate(${pointer.x} ${pointer.y})`} opacity={isDossierOpen ? 0.78 : 1}>
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
