/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicAssetExplorer } from '@/components/public/PublicAssetExplorer';
import { publicAssets, villaSavoyeEntry } from '@/lib/public-kosmo';
import { publicDisplayMediaUrl } from '@/lib/media';

export const metadata: Metadata = {
  title: 'KosmoAsset | Architektur Kosmos',
  description: 'Öffentliche Architektur-Assets aus KosmoReferences: Bilder, Pläne, Analyse-Layer und GLB-Previews.'
};

export default function AssetsPage() {
  const assets = publicAssets();
  const villa = villaSavoyeEntry();
  const plan = villa.media.find((media) => media.type === 'plan');
  const section = villa.media.find((media) => media.type === 'section');
  const publicImages = villa.media.filter((media) => publicDisplayMediaUrl(media) && (media.type === 'exterior' || media.type === 'interior'));

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
            <h1 className="max-w-5xl text-5xl font-semibold leading-[0.92] tracking-normal sm:text-7xl">
              Aus Referenzen werden wiederverwendbare Architektur-Assets.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-[#cbd1cc]">
              KosmoAsset ist die öffentliche Schicht aus KosmoReferences: lizenzierte Bilder, eigene Plan- und Schnittdiagramme, Modell-Previews und Analyse-Layer. Private PDFs, Scans und interne Quellen bleiben draussen.
            </p>
          </div>
          <div className="border border-white/14 bg-[#11170c] p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b9f06a]">Villa Savoye Assetpaket</div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {publicImages.map((media) => (
                <img key={media.type} src={publicDisplayMediaUrl(media) ?? ''} alt={media.label} className="aspect-square w-full object-cover" />
              ))}
              {[plan, section].filter(Boolean).map((media) => (
                <div key={media?.type} className="flex aspect-square items-center justify-center bg-[#f7f7f4] p-3">
                  {publicDisplayMediaUrl(media) ? <img src={publicDisplayMediaUrl(media) ?? ''} alt={media?.label ?? 'Diagramm'} className="max-h-full max-w-full object-contain" /> : null}
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
