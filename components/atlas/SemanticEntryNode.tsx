'use client';

import { ProjectDetailCard } from '@/components/atlas/ProjectDetailCard';
import { ProjectMediaGrid } from '@/components/atlas/ProjectMediaGrid';
import { ProjectPreviewCard } from '@/components/atlas/ProjectPreviewCard';
import type { SemanticLevel } from '@/lib/atlas-layout';
import type { Entry } from '@/lib/types';

type SemanticEntryNodeProps = {
  entry: Entry;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'end';
  labelLeaderX: number;
  labelLeaderY: number;
  clusterSize: number;
  semanticLevel: SemanticLevel;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
};

const entryGlyph: Record<Entry['entry_type'], string> = {
  building: '■',
  urban_plan: '□',
  landscape_project: '◇',
  text: 'T',
  theory: '△',
  map: '+',
  infrastructure: '—',
  object: '●',
  event: '×'
};

export function SemanticEntryNode({
  entry,
  x,
  y,
  labelX,
  labelY,
  labelAnchor,
  labelLeaderX,
  labelLeaderY,
  clusterSize,
  semanticLevel,
  scale,
  isSelected,
  onSelect
}: SemanticEntryNodeProps) {
  const inverseScale = 1 / scale;
  const labelWidth = Math.min(230, entry.title.length * 6.4 + 72);
  const labelRectX = labelAnchor === 'end' ? labelX - labelWidth : labelX;
  const labelTextX = labelAnchor === 'end' ? labelX - 10 : labelX + 10;
  const labelLineX = labelAnchor === 'end' ? labelX - 4 : labelX + 4;
  const cardX = x + 18;
  const cardY = y - 86;
  const showFloatingLabel = semanticLevel === 'global' || (semanticLevel === 'image' && scale < 2);

  return (
    <g
      data-entry-node="true"
      role="button"
      tabIndex={0}
      aria-label={`${entry.title}, ${entry.year_start}`}
      className="group cursor-pointer outline-none"
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <circle cx={x} cy={y} r={semanticLevel === 'global' ? 18 : 24} fill="transparent" />
      {clusterSize > 1 ? (
        <circle cx={x} cy={y} r={10.5} fill="none" stroke="#101010" strokeWidth="0.55" strokeDasharray="1 4" opacity="0.65" />
      ) : null}
      <circle
        cx={x}
        cy={y}
        r={isSelected ? 7 : 4.8}
        fill={isSelected ? '#f7f7f4' : '#101010'}
        stroke="#101010"
        strokeWidth={isSelected ? 2 : 1.2}
      />
      <text
        x={x}
        y={y + 3.5}
        textAnchor="middle"
        fill={isSelected ? '#101010' : '#f7f7f4'}
        fontSize={entry.entry_type === 'text' || entry.entry_type === 'theory' ? 7 : 8}
        fontFamily="var(--font-sans), system-ui, sans-serif"
        pointerEvents="none"
      >
        {entryGlyph[entry.entry_type]}
      </text>

      {semanticLevel === 'image' ? (
        <g transform={`translate(${x + 12} ${y - 26}) scale(${inverseScale})`}>
          <rect x="0" y="0" width="68" height="46" fill="#f7f7f4" stroke="#101010" strokeWidth="1" />
          <ProjectMediaGrid media={entry.media} x={5} y={5} slotWidth={58} slotHeight={36} gap={0} types={['exterior']} />
        </g>
      ) : null}

      {semanticLevel === 'preview' ? (
        <g transform={`translate(${cardX} ${cardY}) scale(${inverseScale})`}>
          <ProjectPreviewCard entry={entry} x={0} y={0} />
        </g>
      ) : null}

      {semanticLevel === 'detail' ? (
        <g transform={`translate(${cardX} ${cardY - 52}) scale(${inverseScale})`}>
          <ProjectDetailCard entry={entry} x={0} y={0} />
        </g>
      ) : null}

      {showFloatingLabel ? (
        <g className={isSelected || semanticLevel !== 'global' ? 'opacity-100' : 'opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100'}>
          <line x1={labelLeaderX} y1={labelLeaderY} x2={labelLineX} y2={labelY - 9} stroke="#101010" strokeWidth="0.7" />
          <rect x={labelRectX} y={labelY - 24} width={labelWidth} height="28" fill="#f7f7f4" stroke="#101010" strokeWidth="0.7" />
          <text x={labelTextX} y={labelY - 6} textAnchor={labelAnchor} fill="#101010" fontSize="11" fontFamily="var(--font-sans), system-ui, sans-serif">
            {formatYear(entry.year_start)} · {entry.title}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} v. Chr.` : `${year}`;
}
