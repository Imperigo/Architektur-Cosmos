'use client';

import { useMemo, useState } from 'react';
import { EntryDetailPanel } from '@/components/atlas/EntryDetailPanel';
import { EntryNode } from '@/components/atlas/EntryNode';
import { StyleSectors } from '@/components/atlas/StyleSectors';
import { TimeRings } from '@/components/atlas/TimeRings';
import { atlasSize, entryPosition } from '@/lib/atlas-layout';
import type { Entry } from '@/lib/types';

export function RadialAtlas({ entries }: { entries: Entry[] }) {
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(entries[0] ?? null);
  const nodes = useMemo(() => entries.map((entry) => ({ entry, ...entryPosition(entry) })), [entries]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#f7f7f4] text-neutral-950">
      <div className="absolute left-5 top-5 z-10 max-w-[340px]">
        <p className="text-xs uppercase tracking-[0.34em] text-neutral-500">Architecture Universe</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Radial Infinity Atlas</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          Ein erster Atlas der Bauwerke, Texte, Pläne und Ereignisse als Zeitringe und Stilsektoren.
        </p>
      </div>

      <div className="h-full w-full overflow-auto">
        <svg viewBox={`0 0 ${atlasSize.width} ${atlasSize.height}`} className="min-h-full min-w-full">
          <rect width={atlasSize.width} height={atlasSize.height} fill="#f7f7f4" />
          <path d={`M ${atlasSize.cx} 44 V ${atlasSize.height - 44} M 44 ${atlasSize.cy} H ${atlasSize.width - 44}`} stroke="#d4d4d4" strokeWidth="0.7" strokeDasharray="2 10" />
          <circle cx={atlasSize.cx} cy={atlasSize.cy} r="11" fill="none" stroke="#111" strokeWidth="0.9" />
          <circle cx={atlasSize.cx} cy={atlasSize.cy} r="2" fill="#111" />

          <TimeRings />
          <StyleSectors />

          {nodes.map(({ entry, x, y }) => (
            <EntryNode
              key={entry.id}
              entry={entry}
              x={x}
              y={y}
              isSelected={selectedEntry?.id === entry.id}
              onSelect={setSelectedEntry}
            />
          ))}
        </svg>
      </div>

      <div className="absolute bottom-5 left-5 z-10 border border-neutral-300 bg-[#f7f7f4]/90 px-3 py-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
        {entries.length} entries · lokal gemockt · SVG MVP
      </div>

      <EntryDetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </main>
  );
}
