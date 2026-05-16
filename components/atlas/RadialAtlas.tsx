'use client';

import { useMemo, useState, type WheelEvent } from 'react';
import { AtlasControls } from '@/components/atlas/AtlasControls';
import { RelationOverlay } from '@/components/atlas/RelationOverlay';
import { SemanticEntryNode } from '@/components/atlas/SemanticEntryNode';
import { StyleSectors } from '@/components/atlas/StyleSectors';
import { WormholeRings } from '@/components/atlas/WormholeRings';
import { atlasSize, type AtlasNode } from '@/lib/atlas-layout';
import type { Entry, EntryRelation } from '@/lib/types';
import { formatYear, layoutWormholeEntries, wormholeState } from '@/lib/wormhole-layout';

export function RadialAtlas({ entries, relations }: { entries: Entry[]; relations: EntryRelation[] }) {
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showRelations, setShowRelations] = useState(true);
  const [travel, setTravel] = useState(0);
  const [hasTravelled, setHasTravelled] = useState(false);
  const state = wormholeState(travel);
  const nodes = useMemo(() => layoutWormholeEntries(entries, state, selectedEntry?.id), [entries, selectedEntry?.id, state]);
  const depthScale = 1 + state.timePosition * 2.8;
  const titleOpacity = hasTravelled ? 0 : 1;
  const titleTransform = hasTravelled ? '-translate-y-5 scale-95' : 'translate-y-0 scale-100';

  function travelBy(delta: number) {
    setHasTravelled(true);
    setTravel((current) => current + delta);
  }

  function resetView() {
    setTravel(0);
    setHasTravelled(false);
    setSelectedEntry(null);
  }

  function focusNodeInView(node: AtlasNode) {
    setSelectedEntry(node.entry);
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    travelBy(event.deltaY > 0 ? 0.028 : -0.028);
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
          viewBox={`0 0 ${atlasSize.width} ${atlasSize.height}`}
          className="h-full w-full touch-none cursor-ns-resize"
          onWheel={handleWheel}
        >
          <rect width={atlasSize.width} height={atlasSize.height} fill="#050505" />
          <WormholeRings state={state} />
          <StyleSectors />

          {showRelations ? <RelationOverlay nodes={nodes} relations={relations} selectedEntry={selectedEntry} /> : null}

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
                semanticLevel={node.semanticLevel}
                scale={1}
                isSelected={selectedEntry?.id === node.entry.id}
                onSelect={() => focusNodeInView(node)}
              />
            </g>
          ))}
          <circle cx={atlasSize.cx} cy={atlasSize.cy} r="7" fill="#f7f7f4" opacity="0.92" />
          <circle cx={atlasSize.cx} cy={atlasSize.cy} r="18" fill="none" stroke="#f7f7f4" strokeWidth="0.8" opacity="0.5" />
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

function zoomModeLabel(scale: number) {
  if (scale >= 3.2) return 'Dossier';
  if (scale >= 2) return 'Preview';
  if (scale >= 1.15) return 'Image';
  return 'Global';
}
