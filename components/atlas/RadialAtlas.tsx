'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { AtlasControls } from '@/components/atlas/AtlasControls';
import { ProjectDetailCard } from '@/components/atlas/ProjectDetailCard';
import { ProjectPreviewCard } from '@/components/atlas/ProjectPreviewCard';
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

const hoverRadius = 76;

export function RadialAtlas({ entries, relations }: { entries: Entry[]; relations: EntryRelation[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showRelations, setShowRelations] = useState(true);
  const [travel, setTravel] = useState(0);
  const [hasTravelled, setHasTravelled] = useState(false);
  const [snappedEntryId, setSnappedEntryId] = useState<string | null>(null);
  const [hoverEntryId, setHoverEntryId] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState('all');
  const [pointerPoint, setPointerPoint] = useState<SvgPoint | null>(null);
  const state = wormholeState(travel);
  const themes = useMemo(() => atlasThemes(entries), [entries]);
  const filteredEntries = useMemo(() => {
    if (activeTheme === 'all') return entries;
    return entries.filter((entry) => entry.themes.includes(activeTheme));
  }, [activeTheme, entries]);
  const nodes = useMemo(() => layoutWormholeEntries(filteredEntries, state, selectedEntry?.id), [filteredEntries, selectedEntry?.id, state.phase, state.timePosition]);
  const snappedNode = useMemo(() => nodes.find((node) => node.entry.id === snappedEntryId) ?? null, [nodes, snappedEntryId]);
  const hoverNode = useMemo(() => nodes.find((node) => node.entry.id === hoverEntryId) ?? null, [nodes, hoverEntryId]);
  const depthScale = 1 + state.timePosition * 2.8;
  const titleOpacity = hasTravelled ? 0 : 1;
  const titleTransform = hasTravelled ? '-translate-y-5 scale-95' : 'translate-y-0 scale-100';
  const backgroundStyle = {
    filter: snappedNode ? 'blur(6px)' : 'blur(0px)',
    opacity: snappedNode ? 0.34 : 1,
    transition: 'filter 520ms cubic-bezier(0.19, 1, 0.22, 1), opacity 520ms cubic-bezier(0.19, 1, 0.22, 1)'
  };

  useEffect(() => {
    if (snappedEntryId && !snappedNode) {
      setSnappedEntryId(null);
      setHoverEntryId(null);
      setSelectedEntry(null);
    }
  }, [snappedEntryId, snappedNode]);

  useEffect(() => {
    const visibleIds = new Set(filteredEntries.map((entry) => entry.id));

    if (selectedEntry && !visibleIds.has(selectedEntry.id)) {
      releaseSnap();
    }

    if (hoverEntryId && !visibleIds.has(hoverEntryId)) {
      setHoverEntryId(null);
    }
  }, [filteredEntries, hoverEntryId, selectedEntry]);

  function travelBy(delta: number) {
    setHasTravelled(true);
    releaseSnap();
    setTravel((current) => loopTravel(current + delta));
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
    setHoverEntryId(node.entry.id);
  }

  function releaseSnap() {
    setSnappedEntryId(null);
    setHoverEntryId(null);
    setSelectedEntry(null);
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const normalizedDelta = Math.max(-140, Math.min(140, event.deltaY));
    travelBy(normalizedDelta * 0.00042);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const point = pointerToSvgPoint(event);
    if (!point) return;

    setPointerPoint(point);

    if (snappedNode) {
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
    setPointerPoint(null);
    if (!snappedNode) {
      setHoverEntryId(null);
    }
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
          className="h-full w-full touch-none cursor-none"
          onWheel={handleWheel}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <rect width={atlasSize.width} height={atlasSize.height} fill="#050505" />
          <g style={backgroundStyle} pointerEvents={snappedNode ? 'none' : 'auto'}>
            <WormholeRings state={state} />
            <StyleSectors />

            {showRelations ? <RelationOverlay nodes={nodes} relations={relations} selectedEntry={snappedNode?.entry ?? hoverNode?.entry ?? null} /> : null}

            {hoverNode && pointerPoint && !snappedNode ? <HoverPreview pointer={pointerPoint} node={hoverNode} /> : null}

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
                  isSelected={hoverEntryId === node.entry.id || snappedEntryId === node.entry.id}
                  nodeRadius={node.size}
                  showLabel={false}
                  driftX={node.driftX}
                  driftY={node.driftY}
                  driftDelay={node.driftDelay}
                  onSelect={() => focusNodeInView(node)}
                />
              </g>
            ))}
          </g>
          {snappedNode ? <SnappedEntryOverlay node={snappedNode} onDismiss={releaseSnap} /> : null}
          {pointerPoint ? <CosmosCursor pointer={pointerPoint} activeNode={hoverNode ?? snappedNode} /> : null}
          <g pointerEvents="none">
            <text x="22" y={atlasSize.height - 92} fill="#b8b8b8" fontSize="10" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.16em">
              CURRENT RING {formatYear(state.currentYear)} · {state.direction === 'into_past' ? 'INTO HISTORY' : 'RETURN LOOP'}
            </text>
          </g>
        </svg>
      </div>

      <div className="cosmos-status-chip absolute bottom-4 left-4 z-10 origin-bottom-left scale-75 border border-[#f7f7f4]/35 bg-[#050505]/78 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-neutral-300 opacity-45 backdrop-blur-md transition-all duration-300 ease-out hover:scale-100 hover:border-[#f7f7f4]/70 hover:opacity-100">
        {filteredEntries.length}/{entries.length} entries · {relations.length} relations · wormhole loop
      </div>

      <ThemeLens
        themes={themes}
        activeTheme={activeTheme}
        onThemeChange={(theme) => {
          setActiveTheme(theme);
          releaseSnap();
        }}
      />

      <AtlasControls
        scale={depthScale}
        zoomModeLabel={zoomModeLabel(depthScale)}
        showRelations={showRelations}
        relationCount={relations.length}
        onZoomIn={() => travelBy(0.035)}
        onZoomOut={() => travelBy(-0.035)}
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

function ThemeLens({
  themes,
  activeTheme,
  onThemeChange
}: {
  themes: ReturnType<typeof atlasThemes>;
  activeTheme: string;
  onThemeChange: (theme: string) => void;
}) {
  return (
    <div className="group absolute right-4 top-1/2 z-20 max-h-[72vh] w-10 -translate-y-1/2 overflow-hidden border border-[#f7f7f4]/35 bg-[#050505]/68 text-[#f7f7f4] opacity-55 backdrop-blur-md transition-all duration-300 ease-out hover:w-64 hover:opacity-100">
      <div className="flex h-10 items-center justify-center border-b border-[#f7f7f4]/35 text-[9px] uppercase tracking-[0.2em] group-hover:justify-start group-hover:px-3">
        <span className="group-hover:hidden">Lens</span>
        <span className="hidden group-hover:inline">Theme Lens</span>
      </div>
      <div className="max-h-[calc(72vh-2.5rem)] overflow-y-auto p-2">
        <ThemeButton active={activeTheme === 'all'} label="All themes" count={themes.reduce((sum, theme) => sum + theme.count, 0)} onClick={() => onThemeChange('all')} />
        {themes.map((theme) => (
          <ThemeButton key={theme.id} active={activeTheme === theme.id} label={theme.label} count={theme.count} onClick={() => onThemeChange(theme.id)} />
        ))}
      </div>
    </div>
  );
}

function ThemeButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 flex h-8 w-full items-center justify-between border px-2 text-left text-[10px] uppercase tracking-[0.12em] transition-all duration-200 ${
        active
          ? 'border-[#f7f7f4] bg-[#f7f7f4] text-[#050505]'
          : 'border-[#f7f7f4]/25 text-neutral-300 hover:border-[#f7f7f4]/70 hover:text-[#f7f7f4]'
      }`}
    >
      <span className="hidden truncate group-hover:inline">{label}</span>
      <span className="group-hover:hidden">{label.slice(0, 1)}</span>
      <span>{count}</span>
    </button>
  );
}

function distance(point: SvgPoint, node: WormholeEntryNode) {
  return Math.hypot(point.x - node.x, point.y - node.y);
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
      <line x1={pointer.x} y1={pointer.y} x2={node.x} y2={node.y} stroke="#f7f7f4" strokeWidth="0.6" strokeDasharray="1 9" opacity="0.34" />
      <circle cx={node.x} cy={node.y} r={node.size + 11} fill="none" stroke="#f7f7f4" strokeWidth="0.8" opacity="0.44" />
      <circle cx={node.x} cy={node.y} r={node.size + 20} fill="none" stroke="#f7f7f4" strokeWidth="0.45" strokeDasharray="1 8" opacity="0.24" />
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

function loopTravel(value: number) {
  return ((value % 2) + 2) % 2;
}
