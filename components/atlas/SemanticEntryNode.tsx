'use client';

import { useId, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { ProjectDetailCard } from '@/components/atlas/ProjectDetailCard';
import { ProjectMediaGrid } from '@/components/atlas/ProjectMediaGrid';
import { ProjectPreviewCard } from '@/components/atlas/ProjectPreviewCard';
import type { SemanticLevel } from '@/lib/atlas-layout';
import { primaryPublicMediaUrl } from '@/lib/media';
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
  styleLensActive?: boolean;
  isHovered?: boolean;
  renderMode?: 'full' | 'fast';
  driftX?: number;
  driftY?: number;
  driftDelay?: number;
  onSelect: (event?: ReactMouseEvent<SVGGElement>) => void;
  onHover?: (entryId: string | null) => void;
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
  classical_architecture: '#a56bff',
  pre_modern_architecture: '#ffd43d',
  modern_architecture: '#00f5ff',
  postwar_modern_architecture: '#ff4b20',
  sustainable_architecture: '#65ff73',
  vernacular_architecture: '#ff38f5'
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
  styleLensActive = false,
  isHovered = false,
  renderMode = 'full',
  driftX = 0,
  driftY = 0,
  driftDelay = 0,
  onSelect,
  onHover
}: SemanticEntryNodeProps) {
  const inverseScale = 1 / scale;
  const isFast = renderMode === 'fast';
  const hasImageThumbnail = Boolean(primaryImageUrl(entry));
  const glyphRadius = nodeRadius ?? (semanticLevel === 'global' ? 4.8 : 7.2);
  const hitRadius = Math.max(isFast ? 18 : 15, glyphRadius + 8);
  const glyphFontSize = Math.max(7, Math.min(14, glyphRadius * 0.72));
  const accent = styleAccent[entry.style_sector];
  const labelWidth = Math.min(230, entry.title.length * 6.4 + 72);
  const labelRectX = labelAnchor === 'end' ? labelX - labelWidth : labelX;
  const labelTextX = labelAnchor === 'end' ? labelX - 10 : labelX + 10;
  const labelLineX = labelAnchor === 'end' ? labelX - 4 : labelX + 4;
  const cardX = x + 18;
  const cardY = y - 86;
  const showFloatingLabel = !isFast && showLabel && (semanticLevel === 'global' || (semanticLevel === 'image' && scale < 2));
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
      onPointerEnter={() => onHover?.(entry.id)}
      onPointerLeave={() => onHover?.(null)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(event);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <circle cx={x} cy={y} r={hitRadius} fill="transparent" />
      {clusterSize > 1 && !isFast ? (
        <circle cx={x} cy={y} r={glyphRadius + 5.5} fill="none" stroke="#f7f7f4" strokeWidth="0.55" strokeDasharray="1 4" opacity="0.65" />
      ) : null}
      {isHovered && !isFast ? (
        <circle cx={x} cy={y} r={glyphRadius + 9} fill="none" stroke={accent} strokeWidth="0.75" strokeDasharray="1 6" opacity="0.78" pointerEvents="none" />
      ) : null}
      <EntryThumbnail entry={entry} x={x} y={y} radius={isSelected ? glyphRadius + 3 : isHovered && !isFast ? glyphRadius + 1.5 : glyphRadius} accent={accent} isSelected={isSelected} styleLensActive={!isFast && (styleLensActive || isHovered)} renderMode={renderMode} />
      {!isFast && !hasImageThumbnail ? <text
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
      </text> : null}

      {!isFast && semanticLevel === 'image' ? (
        <g transform={`translate(${x + 12} ${y - 26}) scale(${inverseScale})`}>
          <rect x="0" y="0" width="68" height="46" fill="#050505" stroke="#f7f7f4" strokeWidth="1" />
          <ProjectMediaGrid media={entry.media} x={5} y={5} slotWidth={58} slotHeight={36} gap={0} types={['exterior']} />
        </g>
      ) : null}

      {!isFast && semanticLevel === 'preview' ? (
        <g transform={`translate(${cardX} ${cardY}) scale(${inverseScale})`}>
          <ProjectPreviewCard entry={entry} x={0} y={0} />
        </g>
      ) : null}

      {!isFast && semanticLevel === 'detail' ? (
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

function EntryThumbnail({ entry, x, y, radius, accent, isSelected, styleLensActive, renderMode }: { entry: Entry; x: number; y: number; radius: number; accent: string; isSelected: boolean; styleLensActive: boolean; renderMode: 'full' | 'fast' }) {
  const reactId = useId();
  const seed = stableHash(entry.id);
  const isFast = renderMode === 'fast';
  const imageUrl = primaryImageUrl(entry);
  const inset = radius * 0.34;
  const skyline = 3 + (seed % 4);
  const baseY = y + radius * 0.34;
  const accentStroke = isFast ? 1.3 : isSelected || styleLensActive ? 2.45 : 1.7;
  const accentFillOpacity = isFast ? 0.28 : styleLensActive ? 0.42 : 0.26;
  const showDetailLines = !imageUrl && !isFast && (radius >= 6.4 || isSelected || styleLensActive);
  const stableSuffix = `${sanitizeId(entry.id)}-${sanitizeId(reactId)}`;
  const clipId = `entry-thumb-clip-${stableSuffix}`;
  const shadeId = `entry-planet-shade-${stableSuffix}`;
  const glowId = `entry-planet-glow-${stableSuffix}`;
  const lightX = x - radius * (0.38 + (seed % 11) * 0.012);
  const lightY = y - radius * (0.44 + (seed % 7) * 0.014);

  return (
    <g className="entry-thumbnail" pointerEvents="none">
      <defs>
        <radialGradient id={glowId} cx="34%" cy="28%" r="74%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isFast ? 0.3 : 0.46} />
          <stop offset="42%" stopColor={accent} stopOpacity={isFast ? 0.14 : 0.22} />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={shadeId} cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isFast ? 0.18 : 0.26} />
          <stop offset="48%" stopColor={accent} stopOpacity="0.07" />
          <stop offset="80%" stopColor="#050505" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#000000" stopOpacity={imageUrl ? (isFast ? 0.42 : 0.52) : (isFast ? 0.68 : 0.82)} />
        </radialGradient>
        {imageUrl ? (
          <clipPath id={clipId}>
            <circle cx={x} cy={y} r={Math.max(0, radius - 0.35)} />
          </clipPath>
        ) : null}
      </defs>
          <circle cx={x} cy={y} r={radius + 5.2} fill={accent} opacity={isFast ? accentFillOpacity * 0.68 : accentFillOpacity} />
          <circle cx={x} cy={y} r={radius + 2.7} fill={`url(#${glowId})`} opacity={styleLensActive || isSelected ? 0.98 : 0.74} />
      {imageUrl ? (
        <>
          <circle cx={x} cy={y} r={radius} fill="#050505" stroke={accent} strokeWidth={accentStroke + 0.25} />
          <image
            key={`${entry.id}-${imageUrl}`}
            href={imageUrl}
            x={x - radius}
            y={y - radius}
            width={radius * 2}
            height={radius * 2}
            preserveAspectRatio="xMidYMid slice"
            opacity={isFast ? 0.94 : 1}
            clipPath={`url(#${clipId})`}
          />
          <circle cx={x} cy={y} r={Math.max(0, radius - 0.35)} fill={accent} opacity={isFast ? 0.12 : 0.18} />
          <circle cx={x} cy={y} r={Math.max(0, radius - 0.35)} fill={`url(#${shadeId})`} opacity={isFast ? 0.54 : 0.64} />
          {!isFast ? <circle cx={lightX} cy={lightY} r={Math.max(1.1, radius * 0.17)} fill="#ffffff" opacity="0.24" /> : null}
          <path
            d={`M ${x - radius * 0.58} ${y + radius * 0.72} C ${x - radius * 0.08} ${y + radius * 0.98}, ${x + radius * 0.68} ${y + radius * 0.78}, ${x + radius * 0.86} ${y + radius * 0.08}`}
            fill="none"
            stroke="#050505"
            strokeWidth={Math.max(0.35, radius * 0.09)}
            opacity={isFast ? 0.16 : 0.22}
          />
          <circle cx={x} cy={y} r={Math.max(0, radius - 0.65)} fill="none" stroke="#f7f7f4" strokeWidth="0.46" opacity={isSelected || styleLensActive ? 0.86 : 0.52} />
        </>
      ) : (
        <>
          <circle cx={x} cy={y} r={radius} fill={isSelected ? '#050505' : thumbnailFill(entry.entry_type)} stroke={accent} strokeWidth={accentStroke} />
          <circle cx={x} cy={y} r={Math.max(0, radius - 0.3)} fill={`url(#${shadeId})`} opacity={isFast ? 0.66 : 0.78} />
          {!isFast ? <circle cx={lightX} cy={lightY} r={Math.max(1, radius * 0.14)} fill="#ffffff" opacity="0.22" /> : null}
        </>
      )}
      {showDetailLines ? (
        <>
          <circle cx={x} cy={y} r={Math.max(0, radius - 2.2)} fill="none" stroke={accent} strokeWidth="0.55" opacity="0.72" />
          <g stroke={isSelected ? '#f7f7f4' : '#050505'} strokeWidth={Math.max(0.45, radius * 0.075)} fill="none" opacity={0.7}>
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
        </>
      ) : null}
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

function primaryImageUrl(entry: Entry) {
  return primaryPublicMediaUrl(entry);
}

function sanitizeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function stableHash(value: string) {
  return value.split('').reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} v. Chr.` : `${year}`;
}
