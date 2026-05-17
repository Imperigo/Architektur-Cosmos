'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { ProjectDetailCard } from '@/components/atlas/ProjectDetailCard';
import { ProjectPreviewCard } from '@/components/atlas/ProjectPreviewCard';
import { RadialLetterText } from '@/components/atlas/RadialText';
import { RelationOverlay } from '@/components/atlas/RelationOverlay';
import { SemanticEntryNode } from '@/components/atlas/SemanticEntryNode';
import { StyleSectors } from '@/components/atlas/StyleSectors';
import { WormholeRings } from '@/components/atlas/WormholeRings';
import { atlasSize } from '@/lib/atlas-layout';
import { polarToCartesian } from '@/lib/polar-coordinates';
import type { Entry, EntryRelation } from '@/lib/types';
import { formatYear, layoutWormholeEntries, wormholeState, type WormholeEntryNode } from '@/lib/wormhole-layout';

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
  const [travel, setTravel] = useState(0);
  const [isTraveling, setIsTraveling] = useState(false);
  const [introState, setIntroState] = useState<IntroState>('intro');
  const [snappedEntryId, setSnappedEntryId] = useState<string | null>(null);
  const [hoverEntryId, setHoverEntryId] = useState<string | null>(null);
  const [hoverFocusId, setHoverFocusId] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState('all');
  const [hudThemeId, setHudThemeId] = useState<string | null>(null);
  const [pointerPoint, setPointerPoint] = useState<SvgPoint | null>(null);
  const pendingTravelDeltaRef = useRef(0);
  const travelFrameRef = useRef<number | null>(null);
  const travelIdleTimeoutRef = useRef<number | null>(null);
  const pendingPointerPointRef = useRef<SvgPoint | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const state = useMemo(() => wormholeState(travel), [travel]);
  const themes = useMemo(() => atlasThemes(entries), [entries]);
  const filteredEntries = useMemo(() => {
    if (activeTheme === 'all') return entries;
    return entries.filter((entry) => entry.themes.includes(activeTheme));
  }, [activeTheme, entries]);
  const visibleEntryIds = useMemo(() => new Set(filteredEntries.map((entry) => entry.id)), [filteredEntries]);
  const activeSelectedEntryId = selectedEntry && visibleEntryIds.has(selectedEntry.id) ? selectedEntry.id : undefined;
  const activeSnappedEntryId = snappedEntryId && visibleEntryIds.has(snappedEntryId) ? snappedEntryId : null;
  const activeHoverEntryId = hoverEntryId && visibleEntryIds.has(hoverEntryId) ? hoverEntryId : null;
  const nodes = useMemo(() => layoutWormholeEntries(filteredEntries, state, activeSelectedEntryId), [activeSelectedEntryId, filteredEntries, state]);
  const snappedNode = useMemo(() => nodes.find((node) => node.entry.id === activeSnappedEntryId) ?? null, [activeSnappedEntryId, nodes]);
  const hoverNode = useMemo(() => nodes.find((node) => node.entry.id === activeHoverEntryId) ?? null, [activeHoverEntryId, nodes]);
  const isHoverFocusActive = hoverFocusId === hoverNode?.entry.id && !snappedNode;
  const cameraFocus = focusCameraOffset(hoverNode, isHoverFocusActive && !isTraveling);
  const depthScale = 1 + state.timePosition * 2.8;
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

  function resetView() {
    cancelPendingTravel();
    markTraveling(220);
    setTravel(0);
    releaseSnap();
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

    const nearest = nearestNode(point, nodes);

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
    <main className={`relative h-screen w-screen overflow-hidden bg-[#050505] text-[#f7f7f4] ${introState === 'launching' ? 'cosmos-launching' : ''} ${isTraveling ? 'cosmos-moving' : ''}`}>
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
              <StyleSectors state={state} isMoving={isTraveling} />

              {showRelations ? <RelationOverlay nodes={nodes} relations={relations} selectedEntry={snappedNode?.entry ?? hoverNode?.entry ?? null} isMoving={isTraveling} /> : null}

              {hoverNode && pointerPoint && !snappedNode && !isTraveling ? <HoverPreview pointer={pointerPoint} node={hoverNode} /> : null}

              {nodes.map((node) => {
                const displayOffset = focusDisplayOffset(node, hoverNode, isHoverFocusActive);

                return (
                <g
                  key={node.entry.id}
                  className="node-focus-drift"
                  opacity={node.opacity}
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
                    stretchX={node.stretchX}
                    stretchY={node.stretchY}
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
              themes={themes}
              activeTheme={activeTheme}
              hoverThemeId={hudThemeId}
              currentYear={formatYear(state.currentYear)}
              zoomLabel={zoomModeLabel(depthScale)}
	              zoomPercent={Math.round(depthScale * 100)}
	              visibleEntryCount={filteredEntries.length}
	              totalEntryCount={entries.length}
	              relationCount={relations.length}
	              showRelations={showRelations}
	              tunnelDepth={state.timePosition}
	              onThemeChange={(theme) => {
                setActiveTheme(theme);
                releaseSnap();
              }}
              onThemeHover={setHudThemeId}
              onZoomIn={() => travelBy(0.035)}
              onZoomOut={() => travelBy(-0.035)}
              onReset={resetView}
              onToggleRelations={() => setShowRelations((current) => !current)}
            />
          ) : null}
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

function atlasThemes(entries: Entry[]) {
  const counts = entries.reduce<Map<string, number>>((accumulator, entry) => {
    entry.themes.forEach((theme) => {
      accumulator.set(theme, (accumulator.get(theme) ?? 0) + 1);
    });
    return accumulator;
  }, new Map());

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 18)
    .map(([id, count]) => ({ id, label: themeLabel(id), count }));
}

function RadialHud({
  themes,
  activeTheme,
  hoverThemeId,
  currentYear,
  zoomLabel,
  zoomPercent,
  visibleEntryCount,
  totalEntryCount,
  relationCount,
  showRelations,
  tunnelDepth,
  onThemeChange,
  onThemeHover,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleRelations
}: {
  themes: ReturnType<typeof atlasThemes>;
  activeTheme: string;
  hoverThemeId: string | null;
  currentYear: string;
  zoomLabel: string;
  zoomPercent: number;
  visibleEntryCount: number;
  totalEntryCount: number;
  relationCount: number;
  showRelations: boolean;
  tunnelDepth: number;
  onThemeChange: (theme: string) => void;
  onThemeHover: (theme: string | null) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleRelations: () => void;
}) {
  const hudThemes = themes.slice(0, 12);
  const selectedTheme = activeTheme === 'all' ? null : themes.find((theme) => theme.id === activeTheme);
  const hoveredTheme = hoverThemeId ? themes.find((theme) => theme.id === hoverThemeId) : null;
  const themeLabelText = hoveredTheme?.label ?? selectedTheme?.label ?? 'All Themes';
  const legendOpacity = Math.max(0, 1 - tunnelDepth / 0.24);
  const controlsOpacity = Math.max(0.28, legendOpacity);

  return (
    <g className="radial-hud" pointerEvents="auto">
      <g opacity={legendOpacity} pointerEvents={legendOpacity > 0.08 ? 'auto' : 'none'}>
        <OrbitText angle={180} radius={457} text="ARCHITECTURE COSMOS" size={8.4} />
        <OrbitText angle={288} radius={457} text={`${visibleEntryCount}/${totalEntryCount} ENTRIES`} size={8} muted />
        <OrbitText angle={252} radius={457} text={`${currentYear} · ${zoomLabel} · ${zoomPercent}%`} size={8} muted />
        <OrbitText angle={286} radius={421} text={`${relationCount} STRANDS`} size={7.2} muted />
        <HudThemeMarker
          angle={305}
          label="ALL"
          active={activeTheme === 'all'}
          labelVisible={activeTheme === 'all' || hoverThemeId === 'all'}
          count={totalEntryCount}
          onClick={() => onThemeChange('all')}
          onHover={() => onThemeHover('all')}
          onLeave={() => onThemeHover(null)}
        />
        {hudThemes.map((theme, index) => (
          <HudThemeMarker
            key={theme.id}
            angle={315 + index * (90 / Math.max(1, hudThemes.length - 1))}
            label={theme.label}
            active={activeTheme === theme.id}
            labelVisible={activeTheme === theme.id || hoverThemeId === theme.id}
            count={theme.count}
            onClick={() => onThemeChange(theme.id)}
            onHover={() => onThemeHover(theme.id)}
            onLeave={() => onThemeHover(null)}
          />
        ))}
        <OrbitText angle={38} radius={414} text={themeLabelText.toUpperCase()} size={8.4} />
      </g>
      <g opacity={controlsOpacity}>
        <HudButton angle={214} label="-" onClick={onZoomOut} />
        <HudButton angle={232} label="+" onClick={onZoomIn} />
        <HudButton angle={250} label="0" onClick={onReset} />
        <HudButton angle={268} label={showRelations ? 'REL' : 'OFF'} active={showRelations} onClick={onToggleRelations} />
      </g>
    </g>
  );
}

function HudThemeMarker({
  angle,
  label,
  count,
  active,
  labelVisible,
  onClick,
  onHover,
  onLeave
}: {
  angle: number;
  label: string;
  count: number;
  active: boolean;
  labelVisible: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const point = polarToCartesian(atlasSize.cx, atlasSize.cy, 438, angle);
  const tick = polarToCartesian(atlasSize.cx, atlasSize.cy, active ? 418 : 424, angle);
  const shortLabel = label === 'ALL' ? 'ALL' : label.split(' ').map((word) => word[0]).join('').slice(0, 3);

  return (
    <g className="hud-theme-marker" onClick={onClick} onPointerEnter={onHover} onPointerLeave={onLeave}>
      <line x1={tick.x} y1={tick.y} x2={point.x} y2={point.y} stroke={active ? '#c9fff4' : '#fff8d6'} strokeWidth={active ? 1.8 : 1} opacity={active ? 0.96 : 0.52} filter="url(#wormhole-energy-glow)" />
      <circle cx={point.x} cy={point.y} r={active ? 6.6 : 4.2} fill={active ? '#c9fff4' : '#050505'} stroke="#fff8d6" strokeWidth="0.95" opacity={active ? 1 : 0.86} />
      {labelVisible ? (
        <RadialLetterText
          text={`${shortLabel}${count > 9 ? '+' : ''}`}
          cx={atlasSize.cx}
          cy={atlasSize.cy}
          radius={450}
          angle={angle}
          fill={active ? '#c9fff4' : '#d6d6d2'}
          fontSize={5.8}
          fontWeight={700}
          strokeWidth={2}
          letterAngleStep={1.25}
        />
      ) : null}
    </g>
  );
}

function HudButton({ angle, label, active = false, onClick }: { angle: number; label: string; active?: boolean; onClick: () => void }) {
  const point = polarToCartesian(atlasSize.cx, atlasSize.cy, 432, angle);

  return (
    <g className="hud-button" onClick={onClick}>
      <circle cx={point.x} cy={point.y} r="12" fill={active ? '#fff8d6' : '#050505'} stroke="#fff8d6" strokeWidth="1" opacity="0.94" filter="url(#wormhole-energy-glow)" />
      <RadialLetterText
        text={label}
        cx={atlasSize.cx}
        cy={atlasSize.cy}
        radius={432}
        angle={angle}
        fill={active ? '#050505' : '#f7f7f4'}
        fontSize={7.4}
        fontWeight={700}
        stroke={active ? '#f7f7f4' : '#050505'}
        strokeWidth={1.4}
        letterAngleStep={1.15}
      />
    </g>
  );
}

function OrbitText({ angle, radius, text, size, muted = false }: { angle: number; radius: number; text: string; size: number; muted?: boolean }) {
  return (
    <RadialLetterText
      text={text}
      cx={atlasSize.cx}
      cy={atlasSize.cy}
      radius={radius}
      angle={angle}
      fill={muted ? '#b8b8b8' : '#f7f7f4'}
      fontSize={size}
      stroke="#050505"
      strokeWidth={3}
      opacity={muted ? 0.84 : 1}
      letterAngleStep={1.42}
    />
  );
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
  const previewScale = node.closeness > 0.68 ? 0.82 : 0.68;
  const baseWidth = previewCardWidth(node.entry);
  const cardWidth = baseWidth * previewScale;
  const cardHeight = 148 * previewScale;
  const side = node.x > atlasSize.cx ? -1 : 1;
  const x = Math.max(34, Math.min(atlasSize.width - cardWidth - 34, node.x + side * 30));
  const y = Math.max(34, Math.min(atlasSize.height - cardHeight - 34, node.y - cardHeight / 2));

  return (
    <g className="hover-preview" pointerEvents="none">
      <line x1={pointer.x} y1={pointer.y} x2={node.x} y2={node.y} stroke="#fff8d6" strokeWidth="0.95" strokeDasharray="1 7" opacity="0.58" filter="url(#wormhole-energy-glow)" />
      <circle cx={node.x} cy={node.y} r={node.size + 11} fill="none" stroke="#fff8d6" strokeWidth="1.15" opacity="0.66" filter="url(#wormhole-energy-glow)" />
      <circle cx={node.x} cy={node.y} r={node.size + 20} fill="none" stroke="#00e7ff" strokeWidth="0.72" strokeDasharray="1 7" opacity="0.42" />
      <g transform={`translate(${x} ${y}) scale(${previewScale})`}>
        <ProjectPreviewCard entry={node.entry} x={0} y={0} width={baseWidth} />
      </g>
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
      <circle r={activeNode ? 14 : 10} fill="none" stroke="#f7f7f4" strokeWidth="0.8" opacity={activeNode ? 0.82 : 0.52} />
      <circle r="2.1" fill="#f7f7f4" opacity="0.86" />
      <line x1="-18" y1="0" x2="-11" y2="0" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
      <line x1="11" y1="0" x2="18" y2="0" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
      <line x1="0" y1="-18" x2="0" y2="-11" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
      <line x1="0" y1="11" x2="0" y2="18" stroke="#f7f7f4" strokeWidth="0.65" opacity="0.62" />
    </g>
  );
}

function zoomModeLabel(scale: number) {
  if (scale >= 3.2) return 'Dossier';
  if (scale >= 2) return 'Preview';
  if (scale >= 1.15) return 'Image';
  return 'Global';
}

function previewCardWidth(entry: Entry) {
  return Math.max(260, Math.min(338, entry.title.length * 7.2 + 150));
}

function themeLabel(theme: string) {
  return theme
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
