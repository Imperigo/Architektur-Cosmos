'use client';

import type { Entry } from '@/lib/types';

type EntryNodeProps = {
  entry: Entry;
  x: number;
  y: number;
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

export function EntryNode({ entry, x, y, isSelected, onSelect }: EntryNodeProps) {
  return (
    <g
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
      <g className="opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
        <line x1={x + 8} y1={y - 8} x2={x + 28} y2={y - 22} stroke="#101010" strokeWidth="0.7" />
        <rect x={x + 30} y={y - 36} width={Math.min(210, entry.title.length * 7 + 54)} height="28" fill="#f7f7f4" stroke="#101010" strokeWidth="0.7" />
        <text x={x + 40} y={y - 18} fill="#101010" fontSize="11" fontFamily="var(--font-sans), system-ui, sans-serif">
          {entry.year_start} · {entry.title}
        </text>
      </g>
    </g>
  );
}
