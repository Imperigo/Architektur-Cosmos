/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { publicAssets, publicReferences, villaSavoyeEntry } from '@/lib/public-kosmo';
import { primaryPublicMediaUrl } from '@/lib/media';

export default function Home() {
  const references = publicReferences();
  const assets = publicAssets();
  const pilot = villaSavoyeEntry();
  const pilotImage = primaryPublicMediaUrl(pilot);

  return (
    <main className="entry-page min-h-screen bg-[#f4f2ec] text-[#111514]">
      <section className="relative min-h-[92vh] overflow-hidden border-b border-[#111514]/10">
        {pilotImage ? (
          <img
            src={pilotImage}
            alt="Villa Savoye als KosmoReferences Pilot"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(244,242,236,0.95),rgba(244,242,236,0.72)_42%,rgba(244,242,236,0.2)_76%)]" />
        <div className="relative z-10 mx-auto flex min-h-[92vh] w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4 border-b border-[#111514]/12 pb-4">
            <Link href="/" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#111514]">
              Architektur Kosmos
            </Link>
            <nav className="flex flex-wrap justify-end gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
              <Link href="/references" className="border border-[#111514]/20 px-3 py-2 transition hover:border-[#0b6b60] hover:text-[#0b6b60]">References</Link>
              <Link href="/assets" className="border border-[#111514]/20 px-3 py-2 transition hover:border-[#496f00] hover:text-[#496f00]">Assets</Link>
              <Link href="/atlas" className="border border-[#111514]/20 px-3 py-2 transition hover:border-[#111514]">Atlas</Link>
            </nav>
          </header>

          <div className="grid flex-1 items-end gap-8 pb-10 pt-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:pb-14">
            <div>
              <div className="mb-5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0b6b60]">
                <span className="border border-[#0b6b60]/35 bg-[#f4f2ec]/72 px-2.5 py-1">KosmoReferences</span>
                <span className="border border-[#496f00]/35 bg-[#f4f2ec]/72 px-2.5 py-1 text-[#496f00]">KosmoAsset</span>
                <span className="border border-[#111514]/18 bg-[#f4f2ec]/72 px-2.5 py-1">öffentliche Demo</span>
              </div>
              <h1 className="max-w-5xl text-5xl font-semibold leading-[0.92] tracking-normal sm:text-7xl lg:text-8xl">
                Architektur lesen, filtern und als Modell verstehen.
              </h1>
              <p className="mt-7 max-w-3xl text-lg leading-8 text-[#2e3430] sm:text-xl">
                Architektur Kosmos wird zur öffentlichen Referenz- und Asset-Datenbank: kuratierte Projekte, lizenzierte Bilder, bereinigte Pläne, Analyse-Layer und diagrammatische 3D-Modelle für Entwurf, Lehre und Recherche.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/references" className="bg-[#111514] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#f7f7f4] transition hover:bg-[#0b6b60]">
                  KosmoReferences öffnen
                </Link>
                <Link href="/assets" className="border border-[#111514]/24 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#111514] transition hover:border-[#496f00] hover:text-[#496f00]">
                  KosmoAsset prüfen
                </Link>
              </div>
            </div>

            <div className="border border-[#111514]/14 bg-[#f4f2ec]/82 p-5 backdrop-blur">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0b6b60]">Pilotstatus</div>
              <h2 className="mt-2 text-2xl font-semibold">{pilot.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#3d443f]">{pilot.short_description}</p>
              <div className="mt-5 grid grid-cols-3 border border-[#111514]/10 text-center text-[10px] uppercase tracking-[0.12em] text-[#3d443f]">
                <span className="border-r border-[#111514]/10 py-3">{pilot.media.filter((media) => media.url).length} Medien</span>
                <span className="border-r border-[#111514]/10 py-3">{pilot.analysis_layers?.length ?? 0} Layer</span>
                <span className="py-3">3D Demo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:px-8 md:grid-cols-3 lg:px-10">
        <PublicMetric label="Öffentliche Referenzen" value={references.length} text="Gefiltert nach public-display Medien und geprüften Datenbankprofilen." />
        <PublicMetric label="Öffentliche Assets" value={assets.length} text="Bilder, Pläne, Schnitte, Analyse-Metadaten und GLB-Preview-Modelle." />
        <PublicMetric label="Aktueller Pilot" value="Villa Savoye" text="Planbereinigung, Analyse-Layer und 3D-Filter als erster vollständiger Prototyp." />
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 border-t border-[#111514]/10 px-5 py-10 sm:px-8 lg:grid-cols-3 lg:px-10">
        <HomePanel href="/references" label="KosmoReferences" title="Projekt-Datenbank" text="Suche und filtere öffentliche Architekturprojekte nach Epoche, Material, Ort und Modellreife." />
        <HomePanel href="/assets" label="KosmoAsset" title="Asset-Datenbank" text="Prüfe öffentliche Bilder, Planzeichnungen, Schnittdiagramme, Analyse-Layer und Modell-Previews." />
        <HomePanel href="/atlas/villa-savoye/" label="Pilot" title="Villa Savoye" text="Öffne den kanonischen Pilot mit Bildern, Plänen, Text, Modellviewer und Layer-Filtern." />
      </section>
    </main>
  );
}

function PublicMetric({ label, value, text }: { label: string; value: string | number; text: string }) {
  return (
    <div className="border border-[#111514]/12 bg-white/38 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b716c]">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-[#111514]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[#3d443f]">{text}</p>
    </div>
  );
}

function HomePanel({ href, label, title, text }: { href: string; label: string; title: string; text: string }) {
  return (
    <Link href={href} className="border border-[#111514]/12 bg-[#111514] p-5 text-[#f7f7f4] transition hover:border-[#66e1d2]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#66e1d2]">{label}</div>
      <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#cbd1cc]">{text}</p>
    </Link>
  );
}
