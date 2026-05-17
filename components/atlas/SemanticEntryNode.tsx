'use client';

import type { CSSProperties } from 'react';
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
  nodeRadius?: number;
  showLabel?: boolean;
  driftX?: number;
  driftY?: number;
  driftDelay?: number;
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

const styleAccent: Record<Entry['style_sector'], string> = {
  classical_architecture: '#9b6dff',
  pre_modern_architecture: '#ffb000',
  modern_architecture: '#00e7ff',
  postwar_modern_architecture: '#ff4d1f',
  sustainable_architecture: '#65ff9a',
  vernacular_architecture: '#ff007a'
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
  nodeRadius,
  showLabel = true,
  driftX = 0,
  driftY = 0,
  driftDelay = 0,
  onSelect
}: SemanticEntryNodeProps) {
  const inverseScale = 1 / scale;
  const glyphRadius = nodeRadius ?? (semanticLevel === 'global' ? 4.8 : 7.2);
  const hitRadius = Math.max(22, glyphRadius + 18);
  const glyphFontSize = Math.max(7, Math.min(14, glyphRadius * 0.72));
  const accent = styleAccent[entry.style_sector];
  const labelWidth = Math.min(230, entry.title.length * 6.4 + 72);
  const labelRectX = labelAnchor === 'end' ? labelX - labelWidth : labelX;
  const labelTextX = labelAnchor === 'end' ? labelX - 10 : labelX + 10;
  const labelLineX = labelAnchor === 'end' ? labelX - 4 : labelX + 4;
  const cardX = x + 18;
  const cardY = y - 86;
  const showFloatingLabel = showLabel && (semanticLevel === 'global' || (semanticLevel === 'image' && scale < 2));
  const driftStyle = {
    '--drift-x': `${driftX}px`,
    '--drift-y': `${driftY}px`,
    animationDelay: `${driftDelay}s`
  } as CSSProperties;

  return (
    <g
      data-entry-node="true"
      role="button"
      tabIndex={0}
      aria-label={`${entry.title}, ${entry.year_start}`}
      className="group cosmos-node-wiggle cursor-pointer outline-none"
      style={driftStyle}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <circle cx={x} cy={y} r={hitRadius} fill="transparent" />
      {clusterSize > 1 ? (
        <circle cx={x} cy={y} r={glyphRadius + 5.5} fill="none" stroke="#f7f7f4" strokeWidth="0.55" strokeDasharray="1 4" opacity="0.65" />
      ) : null}
      <EntryThumbnail entry={entry} x={x} y={y} radius={isSelected ? glyphRadius + 3 : glyphRadius} accent={accent} isSelected={isSelected} />
      <text
        x={x}
        y={y + glyphFontSize * 0.34}
        textAnchor="middle"
        fill={isSelected ? '#f7f7f4' : '#050505'}
        fontSize={entry.entry_type === 'text' || entry.entry_type === 'theory' ? Math.max(7, glyphFontSize * 0.9) : glyphFontSize}
        fontFamily="var(--font-sans), system-ui, sans-serif"
        pointerEvents="none"
        opacity={glyphRadius > 7.5 ? 0.82 : 0}
      >
        {entryGlyph[entry.entry_type]}
      </text>

      {semanticLevel === 'image' ? (
        <g transform={`translate(${x + 12} ${y - 26}) scale(${inverseScale})`}>
          <rect x="0" y="0" width="68" height="46" fill="#050505" stroke="#f7f7f4" strokeWidth="1" />
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
          <line x1={labelLeaderX} y1={labelLeaderY} x2={labelLineX} y2={labelY - 9} stroke="#f7f7f4" strokeWidth="0.7" />
          <rect x={labelRectX} y={labelY - 24} width={labelWidth} height="28" fill="#050505" stroke="#f7f7f4" strokeWidth="0.7" />
          <text x={labelTextX} y={labelY - 6} textAnchor={labelAnchor} fill="#f7f7f4" fontSize="11" fontFamily="var(--font-sans), system-ui, sans-serif">
            {formatYear(entry.year_start)} · {entry.title}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function EntryThumbnail({ entry, x, y, radius, accent, isSelected }: { entry: Entry; x: number; y: number; radius: number; accent: string; isSelected: boolean }) {
  const seed = stableHash(entry.id);
  const inset = radius * 0.34;
  const skyline = 3 + (seed % 4);
  const baseY = y + radius * 0.34;

  return (
    <g className="entry-thumbnail" pointerEvents="none">
      <circle cx={x} cy={y} r={radius} fill={isSelected ? '#050505' : thumbnailFill(entry.entry_type)} stroke={accent} strokeWidth={isSelected ? 2.15 : 1.25} />
      <circle cx={x} cy={y} r={Math.max(0, radius - 2.2)} fill="none" stroke="#f7f7f4" strokeWidth="0.45" opacity="0.62" />
      <g stroke={isSelected ? '#f7f7f4' : '#050505'} strokeWidth={Math.max(0.45, radius * 0.075)} fill="none" opacity={radius < 5.6 ? 0.28 : 0.66}>
        {Array.from({ length: skyline }, (_, index) => {
          const step = (radius * 1.35) / Math.max(1, skyline - 1);
          const localX = x - radius * 0.68 + index * step;
          const height = radius * (0.35 + ((seed >> (index * 3)) % 5) * 0.09);

          return <path key={index} d={`M ${localX} ${baseY} V ${baseY - height}`} />;
        })}
        <path d={`M ${x - radius + inset} ${baseY} H ${x + radius - inset}`} />
        {entry.entry_type === 'urban_plan' || entry.entry_type === 'map' ? (
          <circle cx={x} cy={y} r={radius * 0.38} />
        ) : (
          <path d={`M ${x - radius * 0.42} ${y - radius * 0.05} L ${x} ${y - radius * 0.45} L ${x + radius * 0.42} ${y - radius * 0.05}`} />
        )}
      </g>
    </g>
  );
}

function thumbnailFill(entryType: Entry['entry_type']) {
  if (entryType === 'text' || entryType === 'theory') return '#f7f7f4';
  if (entryType === 'landscape_project') return '#c9fff4';
  if (entryType === 'urban_plan' || entryType === 'map') return '#d7c7ff';
  if (entryType === 'infrastructure') return '#ffd7a8';
  return '#f7f7f4';
}

function stableHash(value: string) {
  return value.split('').reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} v. Chr.` : `${year}`;
}
