'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { ProjectDetailCard } from '@/components/atlas/ProjectDetailCard';
import { ProjectMediaGrid } from '@/components/atlas/ProjectMediaGrid';
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

const hoverRadius = 76;
type IntroState = 'intro' | 'launching' | 'idle';

export function RadialAtlas({ entries, relations }: { entries: Entry[]; relations: EntryRelation[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showRelations, setShowRelations] = useState(true);
  const [activeStyleLens, setActiveStyleLens] = useState<StyleSectorId | null>(null);
  const [travel, setTravel] = useState(0);
  const [isTraveling, setIsTraveling] = useState(false);
  const [introState, setIntroState] = useState<IntroState>('intro');
  const [snappedEntryId, setSnappedEntryId] = useState<string | null>(null);
  const [hoverEntryId, setHoverEntryId] = useState<string | null>(null);
  const [hoverFocusId, setHoverFocusId] = useState<string | null>(null);
  const [pointerPoint, setPointerPoint] = useState<SvgPoint | null>(null);
  const pendingTravelDeltaRef = useRef(0);
  const travelFrameRef = useRef<number | null>(null);
  const travelIdleTimeoutRef = useRef<number | null>(null);
  const pendingPointerPointRef = useRef<SvgPoint | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const state = useMemo(() => wormholeState(travel), [travel]);
  const activeSelectedEntryId = selectedEntry?.id;
  const activeSnappedEntryId = snappedEntryId;
  const activeHoverEntryId = hoverEntryId;
  const nodes = useMemo(() => layoutWormholeEntries(entries, state, activeSelectedEntryId), [activeSelectedEntryId, entries, state]);
  const displayNodes = useMemo(() => nodes.filter(isReadableNode), [nodes]);
  const snappedNode = useMemo(() => displayNodes.find((node) => node.entry.id === activeSnappedEntryId) ?? null, [activeSnappedEntryId, displayNodes]);
  const hoverNode = useMemo(() => displayNodes.find((node) => node.entry.id === activeHoverEntryId) ?? null, [activeHoverEntryId, displayNodes]);
  const isHoverFocusActive = hoverFocusId === hoverNode?.entry.id && !snappedNode;
  const cameraFocus = focusCameraOffset(hoverNode, isHoverFocusActive && !isTraveling);
  const isIntroActive = introState !== 'idle';
  const backgroundStyle = {
    filter: snappedNode ? 'blur(6px)' : isIntroActive ? 'blur(7px)' : 'blur(0px)',
    opacity: snappedNode ? 0.34 : introState === 'intro' ? 0.3 : introState === 'launching' ? 0.82 : 1,
    transition: 'filter 520ms cubic-bezier(0.19, 1, 0.22, 1), opacity 520ms cubic-bezier(0.19, 1, 0.22, 1)'
  };

  useEffect(() => {
    if (introState !== 'launching') return;

    const timeout = window.setTimeout(() => {
      setIntroState('idle');
      setTravel(0);
    }, 1650);

    return () => window.clearTimeout(timeout);
  }, [introState]);

  useEffect(() => {
    if (!hoverNode || snappedNode) return;
    if (isTraveling) return;

    const timeout = window.setTimeout(() => setHoverFocusId(hoverNode.entry.id), 2300);
    return () => window.clearTimeout(timeout);
  }, [hoverNode, isTraveling, snappedNode]);

  useEffect(() => {
    return () => {
      if (travelFrameRef.current !== null) {
        window.cancelAnimationFrame(travelFrameRef.current);
      }

      if (travelIdleTimeoutRef.current !== null) {
        window.clearTimeout(travelIdleTimeoutRef.current);
      }

      if (pointerFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerFrameRef.current);
      }
    };
  }, []);

  function startIntro() {
    if (introState === 'idle') return;

    cancelPendingTravel();
    setTravel(0);
    setIntroState('launching');
  }

  function travelBy(delta: number) {
    if (introState !== 'idle') {
      startIntro();
      return;
    }

    markTraveling(220);
    releaseSnap();
    setTravel((current) => advanceTravel(current, delta));
  }

  function focusNodeInView(node: WormholeEntryNode) {
    snapToNode(node);
  }

  function snapToNode(node: WormholeEntryNode) {
    setSelectedEntry(node.entry);
    setSnappedEntryId(node.entry.id);
    setHoverEntryId(node.entry.id);
  }

  function releaseSnap() {
    setSnappedEntryId((current) => (current === null ? current : null));
    setHoverEntryId((current) => (current === null ? current : null));
    setHoverFocusId((current) => (current === null ? current : null));
    setSelectedEntry((current) => (current === null ? current : null));
  }

  function markTraveling(idleDelay = 160) {
    setIsTraveling(true);

    if (travelIdleTimeoutRef.current !== null) {
      window.clearTimeout(travelIdleTimeoutRef.current);
    }

    travelIdleTimeoutRef.current = window.setTimeout(() => {
      setIsTraveling(false);
      travelIdleTimeoutRef.current = null;
    }, idleDelay);
  }

  function cancelPendingTravel() {
    pendingTravelDeltaRef.current = 0;

    if (travelFrameRef.current !== null) {
      window.cancelAnimationFrame(travelFrameRef.current);
      travelFrameRef.current = null;
    }
  }

  function scheduleTravel(delta: number) {
    pendingTravelDeltaRef.current = Math.max(-0.052, Math.min(0.052, pendingTravelDeltaRef.current + delta));
    markTraveling();

    if (travelFrameRef.current !== null) return;

    travelFrameRef.current = window.requestAnimationFrame(() => {
      const pendingDelta = pendingTravelDeltaRef.current;
      pendingTravelDeltaRef.current = 0;
      travelFrameRef.current = null;

      if (pendingDelta === 0) return;

      releaseSnap();
      setTravel((current) => advanceTravel(current, pendingDelta));
    });
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    if (introState !== 'idle') {
      startIntro();
      return;
    }

    const normalizedDelta = Math.max(-140, Math.min(140, event.deltaY));
    scheduleTravel(normalizedDelta * 0.00036);
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

    if (snappedNode || isTraveling) {
      if (isTraveling) {
        setHoverEntryId((current) => (current === null ? current : null));
        setHoverFocusId((current) => (current === null ? current : null));
      }
      return;
    }

    if (isHoverFocusActive && hoverNode) {
      const hoverDistance = distance(point, hoverNode);
      if (hoverDistance <= hoverRadius * 2.2) return;

      setHoverEntryId(null);
      setHoverFocusId(null);
      return;
    }

    if (hoverNode) {
      const hoverDistance = distance(point, hoverNode);
      if (hoverDistance <= hoverRadius + hoverNode.size * 1.1) return;
    }

    const nearest = nearestNode(point, displayNodes);

    if (!nearest) {
      setHoverEntryId(null);
      return;
    }

    setHoverEntryId(nearest.distance <= hoverRadius + nearest.node.size * 0.4 ? nearest.node.entry.id : null);
  }

  function handlePointerLeave() {
    pendingPointerPointRef.current = null;
    if (pointerFrameRef.current !== null) {
      window.cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }

    setPointerPoint(null);
    if (!snappedNode) {
      setHoverEntryId(null);
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
          <rect width={atlasSize.width} height={atlasSize.height} fill="#050505" />
          <g style={backgroundStyle} pointerEvents={snappedNode ? 'none' : 'auto'}>
            <g
              className="wormhole-camera"
              style={{
                transform: `translate(${cameraFocus.x}px, ${cameraFocus.y}px) scale(${cameraFocus.scale})`,
                transformOrigin: `${atlasSize.cx}px ${atlasSize.cy}px`
              }}
            >
              <WormholeRings state={state} isMoving={isTraveling} />
              <StyleSectors state={state} isMoving={isTraveling} activeStyleLens={activeStyleLens} />

              {showRelations ? <RelationOverlay nodes={displayNodes} relations={relations} selectedEntry={snappedNode?.entry ?? hoverNode?.entry ?? null} isMoving={isTraveling} /> : null}

              {hoverNode && pointerPoint && !snappedNode && !isTraveling && !isHoverFocusActive ? <HoverPreview pointer={pointerPoint} node={hoverNode} /> : null}

              {displayNodes.map((node) => {
                const displayOffset = focusDisplayOffset(node, hoverNode, isHoverFocusActive);

                return (
                <g
                  key={node.entry.id}
                  className="node-focus-drift"
                  opacity={node.opacity * styleLensOpacity(node, activeStyleLens)}
                  style={{ transform: `translate(${displayOffset.x}px, ${displayOffset.y}px)` }}
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
                    isSelected={activeHoverEntryId === node.entry.id || activeSnappedEntryId === node.entry.id}
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
          {snappedNode ? <SnappedEntryOverlay node={snappedNode} onDismiss={releaseSnap} /> : null}
          {introState === 'idle' ? (
            <RadialHud
              showRelations={showRelations}
              tunnelDepth={state.timePosition}
              activeStyleLens={activeStyleLens}
              onTravelForward={() => travelBy(0.035)}
              onTravelBackward={() => travelBy(-0.035)}
              onCycleStyleLens={() => setActiveStyleLens((current) => nextStyleLens(current))}
              onToggleRelations={() => setShowRelations((current) => !current)}
            />
          ) : null}
          {introState === 'idle' ? <TimeReadout timePosition={state.timePosition} currentYear={state.currentYear} /> : null}
          {introState === 'idle' ? <BrandChrome /> : null}
          {pointerPoint ? <CosmosCursor pointer={pointerPoint} activeNode={hoverNode ?? snappedNode} /> : null}
        </svg>
      </div>

      {introState !== 'idle' ? <IntroGate state={introState} onStart={startIntro} /> : null}
    </main>
  );
}

function nearestNode(point: SvgPoint, nodes: WormholeEntryNode[]) {
  return nodes.reduce<{ node: WormholeEntryNode; distance: number } | null>((nearest, node) => {
    if (node.opacity < 0.08) return nearest;

    const nodeDistance = distance(point, node);
    if (!nearest || nodeDistance < nearest.distance) {
      return { node, distance: nodeDistance };
    }

    return nearest;
  }, null);
}

function isReadableNode(node: WormholeEntryNode) {
  const margin = 54;
  const insideFrame = node.x > margin && node.x < atlasSize.width - margin && node.y > margin && node.y < atlasSize.height - margin;
  return insideFrame && node.depth >= 0.045 && node.depth <= 0.94 && node.opacity >= 0.36;
}

function styleLensOpacity(node: WormholeEntryNode, activeStyleLens: StyleSectorId | null) {
  if (!activeStyleLens) return 1;
  if (node.entry.style_sector === activeStyleLens) return 1;
  return 0.24 + node.closeness * 0.18;
}

function focusDisplayOffset(node: WormholeEntryNode, focusNode: WormholeEntryNode | null, focusActive: boolean): SvgPoint {
  if (!focusNode || !focusActive) return { x: 0, y: 0 };

  const depthDelta = Math.abs(node.depth - focusNode.depth);
  const angularDelta = Math.abs(shortestAngleDelta(node.angle, focusNode.angle));
  const isClusterNeighbor = depthDelta < 0.028 && angularDelta < 26;

  if (!isClusterNeighbor) return { x: 0, y: 0 };

  const strength = node.entry.id === focusNode.entry.id ? 0.13 : 0.09;

  return {
    x: (atlasSize.cx - node.x) * strength,
    y: (atlasSize.cy - node.y) * strength
  };
}

function focusCameraOffset(focusNode: WormholeEntryNode | null, focusActive: boolean) {
  if (!focusNode || !focusActive) {
    return { x: 0, y: 0, scale: 1 };
  }

  return {
    x: (atlasSize.cx - focusNode.x) * 0.16,
    y: (atlasSize.cy - focusNode.y) * 0.16,
    scale: 1.045
  };
}

function shortestAngleDelta(a: number, b: number) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

function RadialHud({
  showRelations,
  tunnelDepth,
  activeStyleLens,
  onTravelForward,
  onTravelBackward,
  onCycleStyleLens,
  onToggleRelations
}: {
  showRelations: boolean;
  tunnelDepth: number;
  activeStyleLens: StyleSectorId | null;
  onTravelForward: () => void;
  onTravelBackward: () => void;
  onCycleStyleLens: () => void;
  onToggleRelations: () => void;
}) {
  const controlsOpacity = Math.max(0.46, 1 - tunnelDepth / 0.76);
  const lensLabel = activeStyleLens ? styleSectors.find((sector) => sector.id === activeStyleLens)?.label ?? 'Stil' : 'Alle Stile';

  return (
    <g className="radial-hud navigation-dock" pointerEvents="auto" opacity={controlsOpacity}>
      <rect x={atlasSize.cx - 124} y="886" width="248" height="42" rx="21" fill="#050505" stroke="#f7f7f4" strokeWidth="0.55" opacity="0.72" />
      <g opacity={controlsOpacity}>
        <HudButton x={atlasSize.cx - 82} y={907} kind="backward" label="zurueck" onClick={onTravelBackward} />
        <HudButton x={atlasSize.cx - 28} y={907} kind="forward" label="vor" onClick={onTravelForward} />
        <HudButton x={atlasSize.cx + 28} y={907} kind="lens" label={lensLabel} active={Boolean(activeStyleLens)} onClick={onCycleStyleLens} />
        <HudButton x={atlasSize.cx + 82} y={907} kind="relations" label="relations" active={showRelations} onClick={onToggleRelations} />
      </g>
    </g>
  );
}

function HudButton({ x, y, kind, label, active = false, onClick }: { x: number; y: number; kind: 'backward' | 'forward' | 'lens' | 'relations'; label: string; active?: boolean; onClick: () => void }) {
  return (
    <g className="hud-button" onClick={(event) => { event.stopPropagation(); onClick(); }} aria-label={label}>
      <circle cx={x} cy={y} r="14" fill={active ? '#f7f7f4' : '#050505'} stroke={active ? '#00e7ff' : '#f7f7f4'} strokeWidth="0.75" opacity="0.88" />
      <HudIcon x={x} y={y} kind={kind} active={active} />
    </g>
  );
}

function HudIcon({ x, y, kind, active }: { x: number; y: number; kind: 'backward' | 'forward' | 'lens' | 'relations'; active: boolean }) {
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

  return (
    <g stroke={stroke} strokeWidth="1.25" fill="none" opacity="0.9">
      <path d={kind === 'forward' ? `M ${x - 4} ${y - 6} L ${x + 4} ${y} L ${x - 4} ${y + 6}` : `M ${x + 4} ${y - 6} L ${x - 4} ${y} L ${x + 4} ${y + 6}`} />
      <line x1={kind === 'forward' ? x - 6 : x + 6} y1={y} x2={kind === 'forward' ? x + 5 : x - 5} y2={y} opacity="0.5" />
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

function distance(point: SvgPoint, node: WormholeEntryNode) {
  return Math.hypot(point.x - node.x, point.y - node.y);
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
        <span className="block text-[clamp(2.4rem,7vw,6.8rem)] font-semibold uppercase tracking-[0.18em] text-[#f7f7f4]">
          architecture cosmos
        </span>
        <span className="mt-4 block text-[clamp(0.7rem,1.5vw,1rem)] uppercase tracking-[0.42em] text-neutral-300">
          made by andrin
        </span>
      </span>
    </button>
  );
}

function HoverPreview({ pointer, node }: { pointer: SvgPoint; node: WormholeEntryNode }) {
  const previewScale = node.closeness > 0.68 ? 0.78 : 0.66;
  const baseWidth = previewCardWidth(node.entry);
  const cardWidth = baseWidth * previewScale;
  const cardHeight = 82 * previewScale;
  const side = node.x > atlasSize.cx ? -1 : 1;
  const x = Math.max(34, Math.min(atlasSize.width - cardWidth - 34, node.x + side * 28));
  const y = Math.max(34, Math.min(atlasSize.height - cardHeight - 34, node.y - cardHeight / 2));

  return (
    <g className="hover-preview" pointerEvents="none">
      <line x1={pointer.x} y1={pointer.y} x2={node.x} y2={node.y} stroke="#fff8d6" strokeWidth="0.55" strokeDasharray="1 9" opacity="0.42" />
      <circle cx={node.x} cy={node.y} r={node.size + 9} fill="none" stroke="#fff8d6" strokeWidth="0.62" opacity="0.54" />
      <circle cx={node.x} cy={node.y} r={node.size + 15} fill="none" stroke="#00e7ff" strokeWidth="0.45" strokeDasharray="1 8" opacity="0.32" />
      <g transform={`translate(${x} ${y}) scale(${previewScale})`}>
        <HoverImageCard entry={node.entry} width={baseWidth} />
      </g>
    </g>
  );
}

function HoverImageCard({ entry, width }: { entry: Entry; width: number }) {
  const mediaWidth = 74;
  const title = entry.title.length > 30 ? `${entry.title.slice(0, 27).trim()}...` : entry.title;

  return (
    <g className="hover-image-card">
      <rect x="0" y="0" width={width} height="82" rx="2" fill="#050505" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.9" />
      <ProjectMediaGrid media={entry.media} x={8} y={8} slotWidth={58} slotHeight={46} gap={0} types={['exterior']} />
      <text x={mediaWidth + 10} y="27" fill="#f7f7f4" fontSize="10.5" fontWeight="650" fontFamily="var(--font-sans), system-ui, sans-serif">
        {title}
      </text>
      <text x={mediaWidth + 10} y="48" fill="#b8b8b2" fontSize="7.4" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.16em">
        {formatYear(entry.year_start)}
      </text>
    </g>
  );
}

function SnappedEntryOverlay({ node, onDismiss }: { node: WormholeEntryNode; onDismiss: () => void }) {
  const cardScale = 1.42;
  const cardWidth = 352 * cardScale;
  const cardHeight = 292 * cardScale;
  const cardX = atlasSize.cx - cardWidth / 2;
  const cardY = atlasSize.cy - cardHeight / 2;

  return (
    <g className="dossier-overlay" pointerEvents="auto" opacity="1">
      <rect width={atlasSize.width} height={atlasSize.height} fill="#050505" opacity="0.34" onClick={onDismiss} />
      <line x1={node.x} y1={node.y} x2={atlasSize.cx} y2={atlasSize.cy} stroke="#f7f7f4" strokeWidth="0.7" strokeDasharray="3 9" opacity="0.28" />
      <circle cx={atlasSize.cx} cy={atlasSize.cy} r="252" fill="none" stroke="#f7f7f4" strokeWidth="0.8" strokeDasharray="1 13" opacity="0.22" />
      <g transform={`translate(${cardX - 12} ${cardY - 12})`}>
        <rect width={cardWidth + 24} height={cardHeight + 24} fill="#050505" stroke="#f7f7f4" strokeWidth="0.85" opacity="0.88" />
      </g>
      <g pointerEvents="none" transform={`translate(${cardX} ${cardY}) scale(${cardScale})`}>
        <ProjectDetailCard entry={node.entry} x={0} y={0} />
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

function CosmosCursor({ pointer, activeNode }: { pointer: SvgPoint; activeNode: WormholeEntryNode | null }) {
  return (
    <g className="cosmos-cursor" pointerEvents="none" transform={`translate(${pointer.x} ${pointer.y})`}>
      <circle r={activeNode ? 16 : 12} fill="none" stroke="#050505" strokeWidth="3.4" opacity="0.88" />
      <circle r={activeNode ? 14 : 10} fill="none" stroke="#f7f7f4" strokeWidth="0.8" opacity={activeNode ? 0.82 : 0.52} />
      {activeNode ? <circle r="8.2" fill="none" stroke="#00e7ff" strokeWidth="0.55" opacity="0.58" /> : null}
      <circle r="2.1" fill="#f7f7f4" opacity="0.86" />
      <line x1="-18" y1="0" x2="-11" y2="0" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
      <line x1="11" y1="0" x2="18" y2="0" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
      <line x1="0" y1="-18" x2="0" y2="-11" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
      <line x1="0" y1="11" x2="0" y2="18" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
    </g>
  );
}

function previewCardWidth(entry: Entry) {
  return Math.max(190, Math.min(262, entry.title.length * 5.7 + 108));
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
