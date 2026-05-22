'use client';

import { useEffect, useState } from 'react';
import { RadialAtlas } from '@/components/atlas/RadialAtlas';
import type { Entry, EntryRelation } from '@/lib/types';

export function RadialAtlasClient({ entries, relations }: { entries: Entry[]; relations: EntryRelation[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <AtlasBootFallback />;

  return <RadialAtlas entries={entries} relations={relations} />;
}

function AtlasBootFallback() {
  return (
    <main className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#050505] text-[#f7f7f4]">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-1/2 top-1/2 h-[min(76vw,76vh)] w-[min(76vw,76vh)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 shadow-[0_0_90px_rgba(0,231,255,0.12)]" />
        <div className="absolute left-1/2 top-1/2 h-[min(48vw,48vh)] w-[min(48vw,48vh)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10" />
      </div>
      <div className="relative text-center">
        <p className="text-[clamp(2.2rem,8vw,6.8rem)] font-semibold uppercase leading-[0.98] tracking-[0.28em]">
          Architektur
          <br />
          Kosmos
        </p>
      </div>
    </main>
  );
}
