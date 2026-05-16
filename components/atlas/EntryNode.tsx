'use client';

import type { Entry } from '@/lib/types';

type EntryNodeProps = {
  entry: Entry;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'end';
  labelLeaderX: number;
  labelLeaderY: number;
  clusterSize: number;
  isSelected: boolean;
  onSelect: (entry: Entry) => void;
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

export function EntryNode({
  entry,
  x,
  y,
  labelX,
  labelY,
  labelAnchor,
  labelLeaderX,
  labelLeaderY,
  clusterSize,
  isSelected,
  onSelect
}: EntryNodeProps) {
  const labelWidth = Math.min(230, entry.title.length * 6.4 + 72);
  const labelRectX = labelAnchor === 'end' ? labelX - labelWidth : labelX;
  const labelTextX = labelAnchor === 'end' ? labelX - 10 : labelX + 10;
  const labelLineX = labelAnchor === 'end' ? labelX - 4 : labelX + 4;

  return (
    <g
      data-entry-node="true"
      role="button"
      tabIndex={0}
      aria-label={`${entry.title}, ${entry.year_start}`}
      className="group cursor-pointer outline-none"
      onClick={() => onSelect(entry)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(entry);
        }
      }}
    >
      <circle cx={x} cy={y} r={18} fill="transparent" />
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
        className="transition-all group-hover:stroke-[2]"
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
      <g className={isSelected ? 'opacity-100' : 'opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100'}>
        <line x1={labelLeaderX} y1={labelLeaderY} x2={labelLineX} y2={labelY - 9} stroke="#101010" strokeWidth="0.7" />
        <rect x={labelRectX} y={labelY - 24} width={labelWidth} height="28" fill="#f7f7f4" stroke="#101010" strokeWidth="0.7" />
        <text x={labelTextX} y={labelY - 6} textAnchor={labelAnchor} fill="#101010" fontSize="11" fontFamily="var(--font-sans), system-ui, sans-serif">
          {formatYear(entry.year_start)} · {entry.title}
        </text>
      </g>
    </g>
  );
}

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} v. Chr.` : `${year}`;
}
