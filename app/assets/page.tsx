/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import { PublicAssetExplorer } from '@/components/public/PublicAssetExplorer';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import {
  ingenbohlEntry,
  publicAssets,
  publicEntryAssetTaxonomy,
  publicEntryReadiness,
  publicGateStatusSummary,
  publicKosmoDrawBundleIntakeStatus,
  publicKosmoDrawDigitalizationStatus,
  publicKosmoPublishPlanCatalogStatus,
  publicProjectMediaUrl,
  villaSavoyeAssetTaxonomy,
  villaSavoyeEntry,
  villaSavoyeReadiness
} from '@/lib/public-kosmo';

export const metadata: Metadata = {
  title: 'KosmoAsset | Architektur Kosmos',
  description: 'Öffentliche Architektur-Assets aus KosmoReferences: Bilder, Pläne, Analyseebenen und 3D-Vorschauen.'
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
  const kosmoPublishPlanCatalog = publicKosmoPublishPlanCatalogStatus();
  const publicGateSummary = publicGateStatusSummary();

  return (
    <main className="entry-page ak-page-shell">
      <div className="ak-page-inner">
        <PublicSiteHeader active="assets" context="Öffentliche Assetbibliothek" />

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-14">
          <div>
            <div className="mb-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b9f06a]">
              <span className="border border-[#b9f06a]/40 px-2.5 py-1">KosmoAsset</span>
              <span className="border border-white/14 px-2.5 py-1 text-[#aeb8b2]">Öffentliche Assetebene</span>
              <span className="border border-white/14 px-2.5 py-1 text-[#aeb8b2]">3D-Vorschau</span>
            </div>
            <h1 className="ak-page-title max-w-4xl font-semibold tracking-normal">
              Aus Referenzen werden Bauteile
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-[#cbd1cc]">
              Der Bestand bündelt öffentlich freigegebene Bilder, eigene Plan- und Schnittdiagramme, Analyseebenen und reduzierte 3D-Vorschauen aus KosmoReferences. Private PDFs, Scans und interne Quellen bleiben ausgeschlossen.
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

        <PublicAssetExplorer assets={assets} />

        <section className="grid gap-4 border-t border-white/12 py-8 md:grid-cols-4">
          <AssetCapability title="Bilder" text="Nur öffentlich freigegebene Assets aus geprüften lokalen Quellen." />
          <AssetCapability title="Pläne" text="Eigene diagrammatische Rekonstruktionen für Planlesung und Stilvereinheitlichung." />
          <AssetCapability title="Analyseebenen" text="Tragwerk, Material, Erschliessung, Fassade und Typologie als filterbare Metadaten." />
          <AssetCapability title="3D" text="Öffentliche, reduzierte Modellvorschauen als skizzenhaftes BIM-Verständnis." />
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f06a]">Öffentliche Freigabe</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Erst die Rechteprüfung macht eine Datei zum Asset</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Das Asset-Register zählt nur öffentlich freigegebene Oberflächen. Ungeprüfte Kandidaten aus KosmoDraw, KosmoPublish und privaten Quellen bleiben als Status sichtbar, aber nicht als abrufbare Dateien.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {publicGateSummary.map((item) => (
              <div key={item.label} className="border border-white/12 bg-[#11170c] p-4">
                <div className="text-3xl font-semibold text-[#f7f7f4]">{item.value}</div>
                <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b9f06a]">{item.label}</div>
                <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f06a]">Ordnung der Assetbibliothek</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Bilder und Pläne werden zu Architekturbausteinen</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Der öffentliche Asset-Pilot bleibt in Prüfung, zeigt aber bereits die spätere Struktur: Bilder und Zeichnungen sind Quellenoberflächen, daraus entstehen filterbare Architekturbausteine.
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
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f06a]">Ingenbohl Assetprüfung</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Ingenbohl liefert Struktur, Quellen bleiben geschützt</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              {ingenbohl.title} zeigt die nächste KosmoAsset-Brücke: geprüfte Analyse-, Material- und Strukturkandidaten
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
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f06a]">Asset-Übernahme aus KosmoDraw</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Zeichnung und Modell liefern Kandidaten, keine Freigaben</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Der Prüfbericht sieht {kosmoDrawIntake.summary.asset_candidate_count} Kandidaten aus {kosmoDrawIntake.summary.bundle_count} Projektpaketen.
              Davon werden aktuell 0 automatisch öffentlich freigegeben.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {kosmoDrawIntake.bundles.map((bundle) => (
              <div key={bundle.projectSlug} className="border border-white/12 bg-[#11170c] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#b9f06a]">{bundle.sourceKind}</div>
                <h3 className="mt-2 text-lg font-semibold text-[#f7f7f4]">{bundle.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">
                  {bundle.assets.total} Asset-Kandidaten, {bundle.openings.total} Öffnungen, öffentlich freigegeben nach Übernahme: {bundle.publicReadyAfterIntake}.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em]">
                  <span className="border border-white/14 px-2 py-1 text-[#aeb8b2]">{bundle.intakeAllowed ? 'prüfbereit' : 'gesperrt'}</span>
                  <span className="border border-white/14 px-2 py-1 text-[#aeb8b2]">private Verweise {bundle.privateLeakCount}</span>
                  <span className="border border-white/14 px-2 py-1 text-[#aeb8b2]">unsichere Freigaben {bundle.unsafePublicFlagCount}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f06a]">Mengenprüfung vor Assetübernahme</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Mengen sind noch keine Bauteile</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Der Analyse-Check sieht {kosmoDrawDigitalization.aggregateCounts.rooms} aggregierte Räume,
              {kosmoDrawDigitalization.aggregateCounts.walls} Wände und {kosmoDrawDigitalization.aggregateCounts.volumeTotalM3} m3 Volumen.
              Für KosmoAsset fehlen aber noch elementweise Bauteile, Öffnungen und geprüfte Asset-Kandidaten.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <AssetMetric label="Geschosse" value={kosmoDrawDigitalization.aggregateCounts.floors} />
            <AssetMetric label="NGF m2" value={kosmoDrawDigitalization.aggregateCounts.netFloorAreaM2} />
            <AssetMetric label="Öffentlich bereit" value={kosmoDrawDigitalization.publicReadyAfterIntake} />
          </div>
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f06a]">Planregister aus KosmoPublish</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Planstände werden als Register, nicht als Rohdatei gezeigt</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Der Plankatalog ist als schreibgeschützte Metadaten-Vorstufe sichtbar: {kosmoPublishPlanCatalog.phaseCount} Phasen,
              {kosmoPublishPlanCatalog.outputFields.length} Felder und aktuell {kosmoPublishPlanCatalog.publishesPlanAssetsNow ? 1 : 0} öffentlich freigegebene Plan-Assets.
              Zeichnungen werden erst nach Rechteprüfung und Owner-Freigabe in KosmoAsset sichtbar.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <AssetMetric label="Phasen" value={kosmoPublishPlanCatalog.phaseCount} />
            <AssetMetric label="Felder" value={kosmoPublishPlanCatalog.outputFields.length} />
            <AssetMetric label="Öffentliche Pläne" value={kosmoPublishPlanCatalog.publishesPlanAssetsNow ? 1 : 0} />
          </div>
        </section>

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
