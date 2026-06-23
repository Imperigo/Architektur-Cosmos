import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  CircleGauge,
  Cuboid,
  Database,
  FlaskConical,
  LibraryBig,
  ShieldCheck
} from 'lucide-react';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import {
  ingenbohlEntry,
  publicAssets,
  publicGateStatusSummary,
  publicReferences,
  villaSavoyeEntry
} from '@/lib/public-kosmo';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Entwicklungsstand | ArchitekturKosmos',
  description: 'Öffentlicher Entwicklungsstand von KosmoReferences, KosmoAsset, KosmoDraw und der spezialisierten Kosmo-KI.'
};

const systemAreas = [
  {
    name: 'KosmoReferences',
    status: 'In Betrieb',
    icon: LibraryBig,
    detail: 'Öffentliche Architekturprojekte werden mit Quellen, Medien, Analyseebenen und Modellvorschauen erschlossen.',
    href: '/references/'
  },
  {
    name: 'KosmoAsset',
    status: 'In Betrieb',
    icon: Boxes,
    detail: 'Freigegebene Bilder, Pläne, Modellteile und Architekturprinzipien werden projektübergreifend auffindbar.',
    href: '/assets/'
  },
  {
    name: 'KosmoDraw',
    status: 'In Anbindung',
    icon: Cuboid,
    detail: '2D-Pläne und Bilder werden schrittweise in prüfbare Bauteilgruppen und skizzenhafte 3D-Modelle überführt.'
  },
  {
    name: 'Kosmo KI',
    status: 'Im Aufbau',
    icon: FlaskConical,
    detail: 'Die lokale Architektur-KI wird aus geprüften Referenzen, Assets und menschlich bewerteten Ergebnissen entwickelt.'
  }
];

export default function OrbitPage() {
  const references = publicReferences();
  const assets = publicAssets();
  const publicSummary = publicGateStatusSummary();
  const models = publicSummary.find((item) => item.label === '3D-Vorschauen')?.value ?? 0;
  const unsafeSignals = publicSummary.find((item) => item.label === 'Unsichere Freigaben')?.value ?? 0;
  const villa = villaSavoyeEntry();
  const ingenbohl = ingenbohlEntry();

  const metrics = [
    { label: 'Öffentliche Referenzen', value: references.length, icon: LibraryBig },
    { label: 'Öffentliche Assets', value: assets.length, icon: Boxes },
    { label: '3D-Vorschauen', value: models, icon: Cuboid },
    { label: 'Unsichere Freigaben', value: unsafeSignals, icon: ShieldCheck }
  ];

  return (
    <main className="orbit-page ak-page-shell">
      <div className="ak-page-inner">
        <PublicSiteHeader active="orbit" context="Öffentlicher Entwicklungsstand" />

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end lg:py-14">
          <div>
            <div className="mb-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#57b6c2]">
              <span className="border border-[#57b6c2]/40 px-2.5 py-1">KosmoOrbit</span>
              <span className="border border-white/14 px-2.5 py-1 text-[#aeb8b2]">Öffentlich einsehbar</span>
              <span className="border border-white/14 px-2.5 py-1 text-[#aeb8b2]">Stand 23. Juni 2026</span>
            </div>
            <h1 className="ak-page-title max-w-4xl font-semibold tracking-normal">
              ArchitekturKosmos: Entwicklungsstand
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-[#cbd1cc]">
              Die öffentliche Website zeigt, welche Teile des ArchitekturKosmos bereits nutzbar sind, welche Piloten
              geprüft werden und wo die Verbindung zwischen Referenzwissen, Assets, Zeichnung und lokaler KI entsteht.
            </p>
          </div>

          <aside className="rounded-lg border border-white/12 bg-[#14171f] p-5">
            <div className="flex items-center gap-3 text-[#57b6c2]">
              <CircleGauge className="h-[20px] w-[20px]" aria-hidden="true" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">Öffentliche Freigabe</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#b6bdcb]">
              Sichtbar sind nur geprüfte Daten, eigene Studienmodelle und Medien mit geklärter Nutzung. Interne
              Worker-Protokolle, lokale Pfade und private Quellen bleiben ausserhalb der Website.
            </p>
          </aside>
        </section>

        <section className="grid gap-px border-y border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="bg-[#101319] p-5">
                <Icon className="h-[20px] w-[20px] text-[#57b6c2]" aria-hidden="true" />
                <div className="mt-5 text-3xl font-bold text-[#f4f6fa]">{metric.value}</div>
                <div className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b92a2]">
                  {metric.label}
                </div>
              </div>
            );
          })}
        </section>

        <section className="border-b border-white/10 py-10">
          <div className="mb-6 max-w-3xl">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#57b6c2]">Systembereiche</div>
            <h2 className="mt-2 text-3xl font-bold text-[#f4f6fa]">Was bereits funktioniert</h2>
            <p className="mt-3 text-sm leading-7 text-[#b6bdcb]">
              Jeder Bereich hat eine klar getrennte Aufgabe. Öffentliche Freigabe erfolgt erst nach Inhalts- und Rechteprüfung.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {systemAreas.map((area) => {
              const Icon = area.icon;
              const content = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#101319] text-[#57b6c2]">
                        <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-lg font-bold text-[#f4f6fa]">{area.name}</h3>
                        <span className="mt-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#74c2a0]">
                          {area.status}
                        </span>
                      </div>
                    </div>
                    {area.href ? <ArrowUpRight className="h-[18px] w-[18px] text-[#8b92a2]" aria-hidden="true" /> : null}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#b6bdcb]">{area.detail}</p>
                </>
              );

              return area.href ? (
                <Link key={area.name} href={area.href} className="rounded-lg border border-white/10 bg-[#14171f] p-5 transition hover:border-[#57b6c2]/40 hover:bg-[#1a1e27]">
                  {content}
                </Link>
              ) : (
                <article key={area.name} className="rounded-lg border border-white/10 bg-[#14171f] p-5">
                  {content}
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-8 border-b border-white/10 py-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#57b6c2]">Pilotprojekte</div>
            <h2 className="mt-2 text-3xl font-bold text-[#f4f6fa]">Vom Referenzprojekt zum Architekturwissen</h2>
            <p className="mt-4 text-sm leading-7 text-[#b6bdcb]">
              Die ersten Piloten erproben zwei unterschiedliche Wege: eine moderne Ikone mit öffentlich nutzbaren
              Medien und ein Schweizer Projekt mit bewusst gesperrten privaten Quellen.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <PilotLink
              title={villa.title}
              detail={`${villa.year_start} · ${villa.city ?? 'Poissy'} · Referenz-, Plan- und 3D-Pilot`}
              href={`/atlas/${villa.slug}/`}
            />
            <PilotLink
              title={ingenbohl.title}
              detail={`${ingenbohl.year_start} · ${ingenbohl.city ?? 'Ingenbohl'} · Analyse- und Modellpilot`}
              href={`/atlas/${ingenbohl.slug}/`}
            />
          </div>
        </section>

        <section className="grid gap-5 py-10 md:grid-cols-3">
          <PublicPrinciple
            icon={Database}
            title="Nachvollziehbare Quellen"
            text="Projektwissen bleibt mit Herkunft, Rechteprüfung und Bearbeitungsstand verbunden."
          />
          <PublicPrinciple
            icon={CheckCircle2}
            title="Menschliche Freigabe"
            text="Automatische Extraktion erzeugt Kandidaten. Öffentlich werden sie erst nach Prüfung."
          />
          <PublicPrinciple
            icon={ShieldCheck}
            title="Private Daten bleiben lokal"
            text="Bücher, Scans, Vorlesungen und lokale Zwischenstände werden nicht über die Website ausgeliefert."
          />
        </section>
      </div>
    </main>
  );
}

function PilotLink({ title, detail, href }: { title: string; detail: string; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-white/10 bg-[#14171f] p-5 transition hover:border-[#57b6c2]/40 hover:bg-[#1a1e27]">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-bold leading-tight text-[#f4f6fa]">{title}</h3>
        <ArrowUpRight className="h-[18px] w-[18px] flex-none text-[#57b6c2]" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm leading-6 text-[#8b92a2]">{detail}</p>
    </Link>
  );
}

function PublicPrinciple({
  icon: Icon,
  title,
  text
}: {
  icon: typeof Database;
  title: string;
  text: string;
}) {
  return (
    <article className="border-t border-white/12 pt-5">
      <Icon className="h-[20px] w-[20px] text-[#57b6c2]" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-bold text-[#f4f6fa]">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-[#b6bdcb]">{text}</p>
    </article>
  );
}
