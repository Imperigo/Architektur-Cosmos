'use client';

import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { AtlasControls } from '@/components/atlas/AtlasControls';
import { RelationOverlay } from '@/components/atlas/RelationOverlay';
import { SemanticEntryNode } from '@/components/atlas/SemanticEntryNode';
import { StyleSectors } from '@/components/atlas/StyleSectors';
import { TimeRings } from '@/components/atlas/TimeRings';
import { atlasSize, layoutEntries, type AtlasNode, type SemanticLevel } from '@/lib/atlas-layout';
import type { Entry, EntryRelation } from '@/lib/types';

type ViewTransform = {
  scale: number;
  x: number;
  y: number;
};

const minScale = 0.7;
const maxScale = 3.8;

export function RadialAtlas({ entries, relations }: { entries: Entry[]; relations: EntryRelation[] }) {
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(entries[0] ?? null);
  const [showRelations, setShowRelations] = useState(true);
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panPoint = useRef<{ x: number; y: number } | null>(null);
  const nodes = useMemo(() => layoutEntries(entries), [entries]);
  const viewportCenter = screenToAtlas(atlasSize.cx, atlasSize.cy, viewTransform);
  const focusNode = nearestNodeToViewport(nodes, viewTransform);

  function zoomBy(delta: number) {
    setViewTransform((current) => {
      const nextScale = clampScale(current.scale * delta);
      const center = screenToAtlas(atlasSize.cx, atlasSize.cy, current);

      return {
        scale: nextScale,
        x: Math.round(atlasSize.cx - center.x * nextScale),
        y: Math.round(atlasSize.cy - center.y * nextScale)
      };
    });
  }

  function resetView() {
    setViewTransform({ scale: 1, x: 0, y: 0 });
  }

  function focusNodeInView(node: AtlasNode) {
    setSelectedEntry(node.entry);
    setViewTransform((current) => ({
      ...current,
      x: Math.round(atlasSize.cx - node.x * current.scale),
      y: Math.round(atlasSize.cy - node.y * current.scale)
    }));
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.08 : 0.92);
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;

    const target = event.target as Element;
    if (target.closest('[data-entry-node="true"]')) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    panPoint.current = { x: event.clientX, y: event.clientY };
    setIsPanning(true);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!panPoint.current) return;

    const previous = panPoint.current;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    panPoint.current = { x: event.clientX, y: event.clientY };

    setViewTransform((current) => ({
      ...current,
      x: current.x + dx,
      y: current.y + dy
    }));
  }

  function endPan() {
    panPoint.current = null;
    setIsPanning(false);
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#f7f7f4] text-neutral-950">
      <div className="absolute left-5 top-5 z-10 max-w-[340px]">
        <p className="text-xs uppercase tracking-[0.34em] text-neutral-500">Architecture Cosmos</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Radial Infinity Atlas</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          Ein erster Atlas der Bauwerke, Texte, Pläne und Ereignisse als Zeitringe und Stilsektoren.
        </p>
      </div>

      <div className="h-full w-full">
        <svg
          viewBox={`0 0 ${atlasSize.width} ${atlasSize.height}`}
          className={`h-full w-full touch-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onPointerLeave={endPan}
        >
          <rect width={atlasSize.width} height={atlasSize.height} fill="#f7f7f4" />
          <g transform={`translate(${viewTransform.x} ${viewTransform.y}) scale(${viewTransform.scale})`}>
            <path d={`M ${atlasSize.cx} 44 V ${atlasSize.height - 44} M 44 ${atlasSize.cy} H ${atlasSize.width - 44}`} stroke="#d4d4d4" strokeWidth="0.7" strokeDasharray="2 10" />
            <circle cx={atlasSize.cx} cy={atlasSize.cy} r="11" fill="none" stroke="#111" strokeWidth="0.9" />
            <circle cx={atlasSize.cx} cy={atlasSize.cy} r="2" fill="#111" />

            <TimeRings scale={viewTransform.scale} focusYear={focusNode?.entry.year_start} />
            <StyleSectors />

            {showRelations ? <RelationOverlay nodes={nodes} relations={relations} selectedEntry={selectedEntry} /> : null}

            {nodes.map((node) => (
              <SemanticEntryNode
                key={node.entry.id}
                entry={node.entry}
                x={node.x}
                y={node.y}
                labelX={node.labelX}
                labelY={node.labelY}
                labelAnchor={node.labelAnchor}
                labelLeaderX={node.labelLeaderX}
                labelLeaderY={node.labelLeaderY}
                clusterSize={node.clusterSize}
                semanticLevel={semanticLevelForNode(node, viewTransform, selectedEntry?.id)}
                scale={viewTransform.scale}
                isSelected={selectedEntry?.id === node.entry.id}
                onSelect={() => focusNodeInView(node)}
              />
            ))}
          </g>
          <g pointerEvents="none">
            <text x="20" y={atlasSize.height - 82} fill="#525252" fontSize="10" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.16em">
              VIEWPORT CENTER {Math.round(viewportCenter.x)} / {Math.round(viewportCenter.y)}
            </text>
          </g>
        </svg>
      </div>

      <div className="absolute bottom-5 left-5 z-10 border border-neutral-300 bg-[#f7f7f4]/90 px-3 py-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
        {entries.length} entries · {relations.length} relations · semantic zoom
      </div>

      <AtlasControls
        scale={viewTransform.scale}
        zoomModeLabel={zoomModeLabel(viewTransform.scale)}
        showRelations={showRelations}
        relationCount={relations.length}
        onZoomIn={() => zoomBy(1.22)}
        onZoomOut={() => zoomBy(0.82)}
        onReset={resetView}
        onToggleRelations={() => setShowRelations((current) => !current)}
      />
    </main>
  );
}

function clampScale(scale: number) {
  return Math.min(maxScale, Math.max(minScale, Math.round(scale * 100) / 100));
}

function screenToAtlas(screenX: number, screenY: number, transform: ViewTransform) {
  return {
    x: (screenX - transform.x) / transform.scale,
    y: (screenY - transform.y) / transform.scale
  };
}

function screenPosition(node: AtlasNode, transform: ViewTransform) {
  return {
    x: node.x * transform.scale + transform.x,
    y: node.y * transform.scale + transform.y
  };
}

function screenDistanceFromCenter(node: AtlasNode, transform: ViewTransform) {
  const position = screenPosition(node, transform);
  return Math.hypot(position.x - atlasSize.cx, position.y - atlasSize.cy);
}

function semanticLevelForNode(node: AtlasNode, transform: ViewTransform, selectedEntryId?: string): SemanticLevel {
  const distance = screenDistanceFromCenter(node, transform);
  const isSelected = node.entry.id === selectedEntryId;

  if (transform.scale >= 3.2 && isSelected) return 'detail';
  if (transform.scale >= 2 && (isSelected || distance < 320)) return 'preview';
  if (transform.scale >= 1.15 && (isSelected || distance < 470)) return 'image';
  return 'global';
}

function nearestNodeToViewport(nodes: AtlasNode[], transform: ViewTransform) {
  return nodes.reduce<AtlasNode | null>((nearest, node) => {
    if (!nearest) return node;
    return screenDistanceFromCenter(node, transform) < screenDistanceFromCenter(nearest, transform) ? node : nearest;
  }, null);
}

function zoomModeLabel(scale: number) {
  if (scale >= 3.2) return 'Dossier';
  if (scale >= 2) return 'Preview';
  if (scale >= 1.15) return 'Image';
  return 'Global';
}
