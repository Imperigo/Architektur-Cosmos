'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { AtlasControls } from '@/components/atlas/AtlasControls';
import { ProjectDetailCard } from '@/components/atlas/ProjectDetailCard';
import { RelationOverlay } from '@/components/atlas/RelationOverlay';
import { SemanticEntryNode } from '@/components/atlas/SemanticEntryNode';
import { StyleSectors } from '@/components/atlas/StyleSectors';
import { WormholeRings } from '@/components/atlas/WormholeRings';
import { atlasSize } from '@/lib/atlas-layout';
import type { Entry, EntryRelation } from '@/lib/types';
import { formatYear, layoutWormholeEntries, wormholeState, type WormholeEntryNode } from '@/lib/wormhole-layout';

type SvgPoint = {
  x: number;
  y: number;
};

const magnetRadius = 126;
const snapRadius = 54;
const releaseRadius = 162;

export function RadialAtlas({ entries, relations }: { entries: Entry[]; relations: EntryRelation[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showRelations, setShowRelations] = useState(true);
  const [travel, setTravel] = useState(0);
  const [hasTravelled, setHasTravelled] = useState(false);
  const [snappedEntryId, setSnappedEntryId] = useState<string | null>(null);
  const [magnetEntryId, setMagnetEntryId] = useState<string | null>(null);
  const [pointerPoint, setPointerPoint] = useState<SvgPoint | null>(null);
  const state = wormholeState(travel);
  const nodes = useMemo(() => layoutWormholeEntries(entries, state, selectedEntry?.id), [entries, selectedEntry?.id, state.timePosition]);
  const snappedNode = useMemo(() => nodes.find((node) => node.entry.id === snappedEntryId) ?? null, [nodes, snappedEntryId]);
  const magnetNode = useMemo(() => nodes.find((node) => node.entry.id === magnetEntryId) ?? null, [nodes, magnetEntryId]);
  const depthScale = 1 + state.timePosition * 2.8;
  const titleOpacity = hasTravelled ? 0 : 1;
  const titleTransform = hasTravelled ? '-translate-y-5 scale-95' : 'translate-y-0 scale-100';
  const backgroundStyle = {
    filter: snappedNode ? 'blur(5px)' : 'blur(0px)',
    opacity: snappedNode ? 0.28 : 1,
    transition: 'filter 420ms ease, opacity 420ms ease'
  };

  useEffect(() => {
    if (snappedEntryId && !snappedNode) {
      setSnappedEntryId(null);
      setMagnetEntryId(null);
      setSelectedEntry(null);
    }
  }, [snappedEntryId, snappedNode]);

  function travelBy(delta: number) {
    setHasTravelled(true);
    releaseSnap();
    setTravel((current) => current + delta);
  }

  function resetView() {
    setTravel(0);
    setHasTravelled(false);
    releaseSnap();
  }

  function focusNodeInView(node: WormholeEntryNode) {
    snapToNode(node);
  }

  function snapToNode(node: WormholeEntryNode) {
    setSelectedEntry(node.entry);
    setSnappedEntryId(node.entry.id);
    setMagnetEntryId(node.entry.id);
  }

  function releaseSnap() {
    setSnappedEntryId(null);
    setMagnetEntryId(null);
    setSelectedEntry(null);
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    travelBy(event.deltaY > 0 ? 0.028 : -0.028);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const point = pointerToSvgPoint(event);
    if (!point) return;

    setPointerPoint(point);

    if (snappedNode) {
      const distanceToSnappedNode = distance(point, snappedNode);
      if (distanceToSnappedNode > releaseRadius) {
        releaseSnap();
      }
      return;
    }

    const nearest = nearestNode(point, nodes);

    if (!nearest) {
      setMagnetEntryId(null);
      return;
    }

    const magneticDistance = magnetRadius + nearest.node.size * 0.65;
    const snappingDistance = snapRadius + nearest.node.size * 0.45;

    if (nearest.distance <= snappingDistance) {
      snapToNode(nearest.node);
      return;
    }

    setMagnetEntryId(nearest.distance <= magneticDistance ? nearest.node.entry.id : null);
  }

  function handlePointerLeave() {
    setPointerPoint(null);
    releaseSnap();
  }

  function pointerToSvgPoint(event: PointerEvent<SVGSVGElement>): SvgPoint | null {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#050505] text-[#f7f7f4]">
      <div
        className={`pointer-events-none absolute left-1/2 top-8 z-10 max-w-2xl -translate-x-1/2 text-center transition-all duration-700 ${titleTransform}`}
        style={{ opacity: titleOpacity }}
      >
        <p className="text-xs uppercase tracking-[0.42em] text-neutral-400">Architecture Cosmos</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Radial Infinity Atlas</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          Scroll into the time wormhole. The camera stays centered while architecture moves through history.
        </p>
      </div>

      <div className="h-full w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${atlasSize.width} ${atlasSize.height}`}
          className={`h-full w-full touch-none ${snappedNode ? 'cursor-none' : 'cursor-ns-resize'}`}
          onWheel={handleWheel}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <rect width={atlasSize.width} height={atlasSize.height} fill="#050505" />
          <g style={backgroundStyle} pointerEvents={snappedNode ? 'none' : 'auto'}>
            <WormholeRings state={state} />
            <StyleSectors />

            {showRelations ? <RelationOverlay nodes={nodes} relations={relations} selectedEntry={snappedNode?.entry ?? null} /> : null}

            {magnetNode && pointerPoint && !snappedNode ? <MagnetCue pointer={pointerPoint} node={magnetNode} /> : null}

            {nodes.map((node) => (
              <g key={node.entry.id} opacity={node.opacity}>
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
                  isSelected={magnetEntryId === node.entry.id || snappedEntryId === node.entry.id}
                  nodeRadius={node.size}
                  showLabel={false}
                  onSelect={() => focusNodeInView(node)}
                />
              </g>
            ))}
          </g>
          {snappedNode ? <SnappedEntryOverlay node={snappedNode} /> : null}
          <g pointerEvents="none">
            <text x="22" y={atlasSize.height - 92} fill="#b8b8b8" fontSize="10" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.16em">
              CURRENT RING {formatYear(state.currentYear)} · {state.direction === 'into_past' ? 'INTO HISTORY' : 'RETURN LOOP'}
            </text>
          </g>
        </svg>
      </div>

      <div className="absolute bottom-5 left-5 z-10 border border-[#f7f7f4]/45 bg-[#050505]/90 px-3 py-2 text-xs uppercase tracking-[0.18em] text-neutral-300">
        {entries.length} entries · {relations.length} relations · wormhole loop
      </div>

      <AtlasControls
        scale={depthScale}
        zoomModeLabel={zoomModeLabel(depthScale)}
        showRelations={showRelations}
        relationCount={relations.length}
        onZoomIn={() => travelBy(0.065)}
        onZoomOut={() => travelBy(-0.065)}
        onReset={resetView}
        onToggleRelations={() => setShowRelations((current) => !current)}
      />
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

function distance(point: SvgPoint, node: WormholeEntryNode) {
  return Math.hypot(point.x - node.x, point.y - node.y);
}

function MagnetCue({ pointer, node }: { pointer: SvgPoint; node: WormholeEntryNode }) {
  const pull = 0.72;
  const proxyX = pointer.x + (node.x - pointer.x) * pull;
  const proxyY = pointer.y + (node.y - pointer.y) * pull;

  return (
    <g pointerEvents="none">
      <line x1={pointer.x} y1={pointer.y} x2={node.x} y2={node.y} stroke="#f7f7f4" strokeWidth="0.7" strokeDasharray="2 8" opacity="0.42" />
      <circle cx={node.x} cy={node.y} r={node.size + 12} fill="none" stroke="#f7f7f4" strokeWidth="0.8" opacity="0.46" />
      <circle cx={proxyX} cy={proxyY} r="3.5" fill="#f7f7f4" opacity="0.75" />
    </g>
  );
}

function SnappedEntryOverlay({ node }: { node: WormholeEntryNode }) {
  const cardScale = 1.42;
  const cardWidth = 352 * cardScale;
  const cardHeight = 292 * cardScale;
  const cardX = atlasSize.cx - cardWidth / 2;
  const cardY = atlasSize.cy - cardHeight / 2;

  return (
    <g pointerEvents="none" opacity="1">
      <rect width={atlasSize.width} height={atlasSize.height} fill="#050505" opacity="0.34" />
      <line x1={node.x} y1={node.y} x2={atlasSize.cx} y2={atlasSize.cy} stroke="#f7f7f4" strokeWidth="0.7" strokeDasharray="3 9" opacity="0.28" />
      <circle cx={atlasSize.cx} cy={atlasSize.cy} r="252" fill="none" stroke="#f7f7f4" strokeWidth="0.8" strokeDasharray="1 13" opacity="0.22" />
      <g transform={`translate(${cardX - 12} ${cardY - 12})`}>
        <rect width={cardWidth + 24} height={cardHeight + 24} fill="#050505" stroke="#f7f7f4" strokeWidth="0.85" opacity="0.88" />
      </g>
      <g transform={`translate(${cardX} ${cardY}) scale(${cardScale})`}>
        <ProjectDetailCard entry={node.entry} x={0} y={0} />
      </g>
    </g>
  );
}

function zoomModeLabel(scale: number) {
  if (scale >= 3.2) return 'Dossier';
  if (scale >= 2) return 'Preview';
  if (scale >= 1.15) return 'Image';
  return 'Global';
}
