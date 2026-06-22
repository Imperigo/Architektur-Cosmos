'use client';

import Link from 'next/link';
import { RadialAtlasClient } from '@/components/atlas/RadialAtlasClient';
import type { Entry, EntryRelation } from '@/lib/types';

type HomePilot = {
  title: string;
  href: string;
  detail: string;
};

type HomeCosmosProps = {
  entries: Entry[];
  relations: EntryRelation[];
  referenceCount: number;
  assetCount: number;
  pilots: HomePilot[];
};

const navigation = [
  { href: '/references/', label: 'References' },
  { href: '/assets/', label: 'Assets' },
  { href: '/atlas/', label: 'Atlas' },
  { href: '/orbit/', label: 'KosmoOrbit' }
];

export function HomeCosmos({
  entries,
  relations,
  referenceCount,
  assetCount,
  pilots
}: HomeCosmosProps) {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#050505] text-[#f7f7f4]">
      <RadialAtlasClient entries={entries} relations={relations} />

      <div className="pointer-events-none absolute inset-0 z-[45] flex flex-col justify-between">
        <header className="pointer-events-auto flex items-start justify-between gap-5 px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8">
          <Link
            href="/"
            className="group border-l border-[#00e7ff]/70 bg-[#050505]/58 py-2 pl-3 pr-4 backdrop-blur-md transition hover:border-[#f7f7f4]"
          >
            <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f7f7f4]">
              Architektur Kosmos
            </span>
            <span className="mt-1 block text-[8px] uppercase tracking-[0.18em] text-[#8caaa9]">
              Public Atlas / 2026
            </span>
          </Link>

          <nav
            className="flex max-w-[70vw] flex-wrap justify-end border-y border-white/12 bg-[#050505]/58 backdrop-blur-md"
            aria-label="Öffentliche Bereiche"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-l border-white/10 px-3 py-2.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#cbd6d4] transition first:border-l-0 hover:bg-white/8 hover:text-[#9cfff7] sm:px-4 sm:text-[10px]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="pointer-events-auto grid gap-3 px-4 pb-4 sm:px-6 sm:pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:items-end lg:px-8">
          <section className="border-l border-[#00e7ff]/55 bg-[#050505]/62 py-3 pl-3 pr-4 backdrop-blur-md lg:max-w-2xl">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <StatusValue label="KosmoReferences" value={referenceCount} />
              <StatusValue label="KosmoAsset" value={assetCount} />
              <StatusValue label="Aktueller Stand" value="2 Piloten" />
            </div>
            <p className="mt-2 hidden max-w-xl text-[10px] leading-5 tracking-[0.04em] text-[#9aa7a5] sm:block">
              Öffentliche Architekturprojekte, geprüfte Medien, Analyse-Layer und diagrammatische 3D-Modelle.
            </p>
          </section>

          <section className="justify-self-stretch border-t border-white/14 bg-[#050505]/62 backdrop-blur-md lg:justify-self-end lg:min-w-[360px]">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#6f8988]">
                Public Pilots
              </span>
              <Link
                href="/references/"
                className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#9cfff7] transition hover:text-white"
              >
                Alle Referenzen
              </Link>
            </div>
            <div className="grid sm:grid-cols-2">
              {pilots.map((pilot) => (
                <Link
                  key={pilot.href}
                  href={pilot.href}
                  className="border-t border-white/10 px-3 py-2.5 transition hover:bg-white/8 sm:border-l sm:first:border-l-0"
                >
                  <span className="block text-[10px] font-semibold text-[#f7f7f4]">{pilot.title}</span>
                  <span className="mt-1 block text-[8px] uppercase tracking-[0.14em] text-[#7f9391]">
                    {pilot.detail}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function StatusValue({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="text-sm font-semibold text-[#f7f7f4]">{value}</span>
      <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#78918f]">{label}</span>
    </span>
  );
}
