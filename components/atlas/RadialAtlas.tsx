'use client';

import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { AtlasControls } from '@/components/atlas/AtlasControls';
import { EntryDetailPanel } from '@/components/atlas/EntryDetailPanel';
import { EntryNode } from '@/components/atlas/EntryNode';
import { RelationOverlay } from '@/components/atlas/RelationOverlay';
import { StyleSectors } from '@/components/atlas/StyleSectors';
import { TimeRings } from '@/components/atlas/TimeRings';
import { atlasSize, layoutEntries } from '@/lib/atlas-layout';
import type { Entry, EntryRelation } from '@/lib/types';

type ViewTransform = {
  scale: number;
  x: number;
  y: number;
};

const minScale = 0.7;
const maxScale = 2.4;

export function RadialAtlas({ entries, relations }: { entries: Entry[]; relations: EntryRelation[] }) {
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(entries[0] ?? null);
  const [showRelations, setShowRelations] = useState(true);
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panPoint = useRef<{ x: number; y: number } | null>(null);
  const nodes = useMemo(() => layoutEntries(entries), [entries]);
  const entriesById = useMemo(() => {
    return Object.fromEntries(entries.map((entry) => [entry.id, entry]));
  }, [entries]);

  function zoomBy(delta: number) {
    setViewTransform((current) => ({
      ...current,
      scale: clampScale(current.scale * delta)
    }));
  }

  function resetView() {
    setViewTransform({ scale: 1, x: 0, y: 0 });
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

            <TimeRings />
            <StyleSectors />

            {showRelations ? <RelationOverlay nodes={nodes} relations={relations} selectedEntry={selectedEntry} /> : null}

            {nodes.map(({ entry, x, y, labelX, labelY, labelAnchor, labelLeaderX, labelLeaderY, clusterSize }) => (
              <EntryNode
                key={entry.id}
                entry={entry}
                x={x}
                y={y}
                labelX={labelX}
                labelY={labelY}
                labelAnchor={labelAnchor}
                labelLeaderX={labelLeaderX}
                labelLeaderY={labelLeaderY}
                clusterSize={clusterSize}
                isSelected={selectedEntry?.id === entry.id}
                onSelect={setSelectedEntry}
              />
            ))}
          </g>
        </svg>
      </div>

      <div className="absolute bottom-5 left-5 z-10 border border-neutral-300 bg-[#f7f7f4]/90 px-3 py-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
        {entries.length} entries · {relations.length} relations · SVG MVP
      </div>

      <AtlasControls
        scale={viewTransform.scale}
        showRelations={showRelations}
        relationCount={relations.length}
        onZoomIn={() => zoomBy(1.16)}
        onZoomOut={() => zoomBy(0.86)}
        onReset={resetView}
        onToggleRelations={() => setShowRelations((current) => !current)}
      />

      <EntryDetailPanel
        entry={selectedEntry}
        relations={relations}
        entriesById={entriesById}
        onClose={() => setSelectedEntry(null)}
      />
    </main>
  );
}

function clampScale(scale: number) {
  return Math.min(maxScale, Math.max(minScale, Math.round(scale * 100) / 100));
}
