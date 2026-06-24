'use client';

import Link from 'next/link';
import { RadialAtlasClient } from '@/components/atlas/RadialAtlasClient';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
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
        <div className="pointer-events-auto">
          <PublicSiteHeader active="home" fixed context="Öffentlicher Architekturatlas" />
        </div>

        <div className="pointer-events-auto grid gap-3 px-4 pb-4 sm:px-6 sm:pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:items-end lg:px-8">
          <section className="ak-card bg-[rgb(11_13_18/0.82)] px-4 py-3 backdrop-blur-xl lg:max-w-2xl">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <StatusValue label="KosmoReferences" value={referenceCount} />
              <StatusValue label="KosmoAsset" value={assetCount} />
              <StatusValue label="Pilotprojekte" value="2" />
            </div>
            <p className="mt-2 hidden max-w-xl text-[10px] leading-5 tracking-[0.04em] text-[#9aa7a5] sm:block">
              Ein lesbarer Ausschnitt aus KosmoReferences: geprüfte Projekte, Bild- und Planstände, Bauteilgruppen und reduzierte 3D-Studien.
            </p>
          </section>

          <section className="ak-card justify-self-stretch overflow-hidden bg-[rgb(11_13_18/0.82)] backdrop-blur-xl lg:justify-self-end lg:min-w-[360px]">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b92a2]">
                Öffentliche Piloten
              </span>
              <Link
                href="/references/"
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#57b6c2] transition hover:text-white"
              >
                Alle Referenzen
              </Link>
            </div>
            <div className="grid sm:grid-cols-2">
              {pilots.map((pilot) => (
                <Link
                  key={pilot.href}
                  href={pilot.href}
                  className="border-t border-white/10 px-3 py-3 transition hover:bg-white/8 sm:border-l sm:first:border-l-0"
                >
                  <span className="block text-sm font-semibold text-[#f4f6fa]">{pilot.title}</span>
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-[#8b92a2]">
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
      <span className="text-lg font-bold text-[#f4f6fa]">{value}</span>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8b92a2]">{label}</span>
    </span>
  );
}
