/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicAssetExplorer } from '@/components/public/PublicAssetExplorer';
import {
  ingenbohlEntry,
  publicAssets,
  publicEntryAssetTaxonomy,
  publicEntryReadiness,
  publicKosmoDrawBundleIntakeStatus,
  publicKosmoDrawDigitalizationStatus,
  publicProjectMediaUrl,
  villaSavoyeAssetTaxonomy,
  villaSavoyeEntry,
  villaSavoyeReadiness
} from '@/lib/public-kosmo';

export const metadata: Metadata = {
  title: 'KosmoAsset | Architektur Kosmos',
  description: 'Öffentliche Architektur-Assets aus KosmoReferences: Bilder, Pläne, Analyse-Layer und GLB-Previews.'
};

export default function AssetsPage() {
  const assets = publicAssets();
  const villa = villaSavoyeEntry();
  const plan = villa.media.find((media) => media.type === 'plan');
  const section = villa.media.find((media) => media.type === 'section');
  const publicImages = villa.media.filter((media) => publicProjectMediaUrl(villa, media) && (media.type === 'exterior' || media.type === 'interior'));
  const readiness = villaSavoyeReadiness();
  const taxonomy = villaSavoyeAssetTaxonomy();
  const ingenbohl = ingenbohlEntry();
  const ingenbohlReadiness = publicEntryReadiness(ingenbohl);
  const ingenbohlTaxonomy = publicEntryAssetTaxonomy(ingenbohl);
  const kosmoDrawIntake = publicKosmoDrawBundleIntakeStatus();
  const kosmoDrawDigitalization = publicKosmoDrawDigitalizationStatus();

  return (
    <main className="entry-page min-h-screen bg-[#060805] text-[#f7f7f4]" style={{ '--entry-accent': '#b9f06a' } as React.CSSProperties}>
      <div className="mx-auto w-full max-w-7xl px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-white/12 pb-4">
          <Link href="/" className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f7f7f4]/78">Architektur Kosmos</Link>
          <nav className="flex flex-wrap justify-end gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
            <Link href="/references" className="border border-white/18 px-3 py-2 transition hover:border-[#66e1d2] hover:text-[#66e1d2]">References</Link>
            <Link href="/atlas" className="border border-white/18 px-3 py-2 transition hover:border-[#b9f06a] hover:text-[#b9f06a]">Atlas</Link>
          </nav>
        </header>

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-14">
          <div>
            <div className="mb-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b9f06a]">
              <span className="border border-[#b9f06a]/40 px-2.5 py-1">KosmoAsset</span>
              <span className="border border-white/14 px-2.5 py-1 text-[#aeb8b2]">public asset layer</span>
              <span className="border border-white/14 px-2.5 py-1 text-[#aeb8b2]">GLB Preview</span>
            </div>
            <h1 className="max-w-5xl text-[2rem] font-semibold leading-[1.02] tracking-normal sm:text-7xl sm:leading-[0.92]">
              Aus Referenzen werden Architektur-Assets.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-[#cbd1cc]">
              KosmoAsset ist die öffentliche Schicht aus KosmoReferences: lizenzierte Bilder, eigene Plan- und Schnittdiagramme, Modell-Previews und Analyse-Layer. Private PDFs, Scans und interne Quellen bleiben draussen.
            </p>
          </div>
          <div className="border border-white/14 bg-[#11170c] p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b9f06a]">Villa Savoye Assetpaket</div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {publicImages.map((media) => (
                <img key={media.type} src={publicProjectMediaUrl(villa, media) ?? ''} alt={media.label} className="aspect-square w-full object-cover" />
              ))}
              {[plan, section].filter(Boolean).map((media) => (
                <div key={media?.type} className="flex aspect-square items-center justify-center bg-[#f7f7f4] p-3">
                  {publicProjectMediaUrl(villa, media) ? <img src={publicProjectMediaUrl(villa, media) ?? ''} alt={media?.label ?? 'Diagramm'} className="max-h-full max-w-full object-contain" /> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-t border-white/12 py-8 md:grid-cols-4">
          <AssetCapability title="Bilder" text="Nur public-display Assets aus Rights-Gate und lokalen Quellen." />
          <AssetCapability title="Pläne" text="Eigene diagrammatische Rekonstruktionen für Planlesung und Stilvereinheitlichung." />
          <AssetCapability title="Layer" text="Tragwerk, Material, Zirkulation, Hülle und Typologie als filterbare Metadaten." />
          <AssetCapability title="3D" text="Öffentliche Low-GLB-Previews als skizzenhaftes BIM-Verständnis." />
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f06a]">Asset Taxonomie</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">KosmoAsset trennt Medien, Bauteile und Prinzipien.</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Der öffentliche Asset-Pilot bleibt review-only in der Freigabe, zeigt aber bereits die spätere Struktur: Bilder und Zeichnungen sind Quellenoberflächen, daraus entstehen filterbare Architekturbausteine.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {taxonomy.map((item) => (
              <div key={item.title} className="border border-white/12 bg-[#11170c] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#b9f06a]">{item.kind}</div>
                <h3 className="mt-2 text-lg font-semibold text-[#f7f7f4]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 border-t border-white/12 py-8 md:grid-cols-4">
          {readiness.map((item) => (
            <div key={item.label} className="border border-white/12 bg-[#11170c] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b9f06a]">{item.status}</div>
              <h2 className="mt-2 text-lg font-semibold text-[#f7f7f4]">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{item.detail}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f06a]">Ingenbohl Review-Asset</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Ein zweiter Pilot ohne private Medien-Leak.</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              {ingenbohl.title} zeigt die naechste KosmoAsset-Bruecke: reviewed Analyse, Material- und Strukturkandidaten
              sowie Modellstatus werden indexiert, aber Bilder, Pläne und private Quellen bleiben gesperrt.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ingenbohlReadiness.map((item) => (
                <div key={item.label} className="border border-white/12 bg-[#11170c] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b9f06a]">{item.status}</div>
                  <h3 className="mt-2 text-lg font-semibold text-[#f7f7f4]">{item.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ingenbohlTaxonomy.map((item) => (
              <div key={item.title} className="border border-white/12 bg-[#11170c] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#b9f06a]">{item.kind}</div>
                <h3 className="mt-2 text-lg font-semibold text-[#f7f7f4]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f06a]">KosmoDraw Asset Intake</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Modell- und Zeichnungskandidaten bleiben zuerst Asset-Review.</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Der Intake-Report sieht {kosmoDrawIntake.summary.asset_candidate_count} Kandidaten aus {kosmoDrawIntake.summary.bundle_count} Bundles.
              Davon werden aktuell 0 automatisch public-ready gesetzt.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {kosmoDrawIntake.bundles.map((bundle) => (
              <div key={bundle.projectSlug} className="border border-white/12 bg-[#11170c] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#b9f06a]">{bundle.sourceKind}</div>
                <h3 className="mt-2 text-lg font-semibold text-[#f7f7f4]">{bundle.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">
                  {bundle.assets.total} Asset-Kandidaten, {bundle.openings.total} Oeffnungen, public-ready nach Intake: {bundle.publicReadyAfterIntake}.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em]">
                  <span className="border border-white/14 px-2 py-1 text-[#aeb8b2]">{bundle.intakeAllowed ? 'review ready' : 'blocked'}</span>
                  <span className="border border-white/14 px-2 py-1 text-[#aeb8b2]">private leaks {bundle.privateLeakCount}</span>
                  <span className="border border-white/14 px-2 py-1 text-[#aeb8b2]">public flags {bundle.unsafePublicFlagCount}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f06a]">Digitalization Asset Preflight</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Mengen- und Strukturreports werden nicht automatisch zu Assets.</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Der Analyse-Check sieht {kosmoDrawDigitalization.aggregateCounts.rooms} aggregierte Raeume,
              {kosmoDrawDigitalization.aggregateCounts.walls} Waende und {kosmoDrawDigitalization.aggregateCounts.volumeTotalM3} m3 Volumen.
              Fuer KosmoAsset fehlen aber noch elementweise Bauteile, Oeffnungen und review-only Asset-Kandidaten.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <AssetMetric label="Geschosse" value={kosmoDrawDigitalization.aggregateCounts.floors} />
            <AssetMetric label="NGF m2" value={kosmoDrawDigitalization.aggregateCounts.netFloorAreaM2} />
            <AssetMetric label="Public-ready" value={kosmoDrawDigitalization.publicReadyAfterIntake} />
          </div>
        </section>

        <PublicAssetExplorer assets={assets} />
      </div>
    </main>
  );
}

function AssetCapability({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-white/12 bg-[#11170c] p-4">
      <h2 className="text-lg font-semibold text-[#f7f7f4]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{text}</p>
    </div>
  );
}

function AssetMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/12 bg-[#11170c] p-4">
      <div className="text-3xl font-semibold text-[#f7f7f4]">{value}</div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[#b9f06a]">{label}</div>
    </div>
  );
}
