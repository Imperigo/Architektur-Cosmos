'use client';

import { useMemo, useState } from 'react';
import type { Entry } from '@/lib/types';
import { polarToCartesian } from '@/lib/polar-coordinates';
import { ProjectDetailPanel } from '@/components/project-detail/ProjectDetailPanel';

const width = 1400;
const height = 900;
const cx = width / 2;
const cy = height / 2;
const rings = [80, 140, 200, 260, 320, 380, 440, 500, 560, 620, 680];
const ringLabels = ['-9000', '-500', '±0', '1000', '1200', '1400', '1600', '1800', '1900', '1950', 'aktuell'];
const sectors = [
  { label: 'Klassische Architektur', angle: 315 },
  { label: 'Vor-/Moderne Architektur', angle: 45 },
  { label: 'Post-/Nachkriegsmoderne', angle: 115 },
  { label: 'Nachhaltige Architektur', angle: 180 },
  { label: 'Vernakuläre Architektur', angle: 245 }
];

export function RadialAtlas({ entries }: { entries: Entry[] }) {
  const [selected, setSelected] = useState<Entry | null>(null);
  const nodes = useMemo(() => entries.map((entry) => ({ entry, ...polarToCartesian(cx, cy, entry.atlas.radius, entry.atlas.angle) })), [entries]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#f7f7f4] text-neutral-950">
      <div className="absolute left-6 top-6 z-10">
        <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Architecture Universe</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Radial Infinity Atlas</h1>
      </div>

      <div className="h-full w-full overflow-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-h-full min-w-full">
          <rect width={width} height={height} fill="#f7f7f4" />

          {rings.map((r, i) => (
            <g key={r}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111" strokeWidth={i % 3 === 0 ? 1.1 : 0.55} opacity={0.75} />
              <text x={cx + r + 8} y={cy - 4} fontSize="10" letterSpacing="0.08em" fill="#555">{ringLabels[i]}</text>
            </g>
          ))}

          {sectors.map((sector) => {
            const end = polarToCartesian(cx, cy, 720, sector.angle);
            const label = polarToCartesian(cx, cy, 760, sector.angle);
            return (
              <g key={sector.label}>
                <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#111" strokeWidth="1" />
                <text x={label.x} y={label.y} textAnchor="middle" fontSize="13" fontWeight="600" letterSpacing="0.08em" transform={`rotate(${sector.angle - 90} ${label.x} ${label.y})`}>
                  {sector.label}
                </text>
              </g>
            );
          })}

          {nodes.map(({ entry, x, y }) => (
            <g key={entry.id} onClick={() => setSelected(entry)} className="cursor-pointer">
              <circle cx={x} cy={y} r={6} fill="#111" />
              <circle cx={x} cy={y} r={14} fill="transparent" />
              <text x={x + 10} y={y - 8} fontSize="11" fill="#111">{entry.title}</text>
              <text x={x + 10} y={y + 6} fontSize="9" fill="#666">{entry.year_start}</text>
            </g>
          ))}
        </svg>
      </div>

      <ProjectDetailPanel entry={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
