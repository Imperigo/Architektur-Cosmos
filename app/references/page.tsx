/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import { EntryModelViewer } from '@/components/atlas/EntryModelViewer';
import { PublicReferenceExplorer } from '@/components/public/PublicReferenceExplorer';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import {
  ingenbohlEntry,
  publicGateStatusSummary,
  publicKosmoDrawDigitalizationStatus,
  publicEntryAssetTaxonomy,
  publicEntryReadiness,
  publicKosmoDrawBundleIntakeStatus,
  publicKosmoPublishPlanCatalogStatus,
  publicModelUrl,
  publicProjectMediaUrl,
  publicReferences,
  villaSavoyeAssetTaxonomy,
  villaSavoyeEntry,
  villaSavoyeModelUrl,
  villaSavoyeReadiness
} from '@/lib/public-kosmo';

export const metadata: Metadata = {
  title: 'KosmoReferences | Architektur Kosmos',
  description: 'Öffentliche Architekturreferenzen mit Bildern, Plänen, Analyseebenen und 3D-Vorschau.'
};

export default function ReferencesPage() {
  const references = publicReferences();
  const villa = villaSavoyeEntry();
  const exterior = villa.media.find((media) => media.type === 'exterior');
  const plan = villa.media.find((media) => media.type === 'plan');
  const section = villa.media.find((media) => media.type === 'section');
  const modelUrl = villaSavoyeModelUrl();
  const readiness = villaSavoyeReadiness();
  const taxonomy = villaSavoyeAssetTaxonomy();
  const ingenbohl = ingenbohlEntry();
  const ingenbohlReadiness = publicEntryReadiness(ingenbohl);
  const ingenbohlTaxonomy = publicEntryAssetTaxonomy(ingenbohl);
  const ingenbohlModelUrl = publicModelUrl(ingenbohl);
  const kosmoDrawIntake = publicKosmoDrawBundleIntakeStatus();
  const kosmoDrawDigitalization = publicKosmoDrawDigitalizationStatus();
  const kosmoPublishPlanCatalog = publicKosmoPublishPlanCatalogStatus();
  const publicGateSummary = publicGateStatusSummary();

  return (
    <main className="entry-page ak-page-shell">
      <div className="ak-page-inner">
        <PublicSiteHeader active="references" context="Öffentliche Referenzdatenbank" />

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:py-14">
          <div>
            <div className="mb-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#66e1d2]">
              <span className="border border-[#66e1d2]/40 px-2.5 py-1">KosmoReferences</span>
              <span className="border border-white/14 px-2.5 py-1 text-[#aeb8b2]">Öffentlich freigegeben</span>
              <span className="border border-white/14 px-2.5 py-1 text-[#aeb8b2]">Pilotprojekt Villa Savoye</span>
            </div>
            <h1 className="ak-page-title max-w-4xl font-semibold tracking-normal">
              Referenzatlas für Architekturprojekte
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-[#cbd1cc]">
              Bauten werden mit Autorenschaft, Ort, Zeit, Quellen, Bildern, bereinigten Planebenen, Analysefeldern und Modellvorschauen erschlossen. Gezeigt werden ausschliesslich öffentlich freigegebene Medien und eigene diagrammatische Rekonstruktionen.
            </p>
          </div>
          <div className="overflow-hidden border border-white/14 bg-[#101513]">
            {publicProjectMediaUrl(villa, exterior) ? (
              <img src={publicProjectMediaUrl(villa, exterior) ?? ''} alt="Villa Savoye Referenzbild" className="aspect-[4/3] w-full object-cover" />
            ) : null}
            <div className="p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#66e1d2]">Geprüftes Titelbild</div>
              <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">
                Das Titelbild stammt aus einem öffentlich nutzbaren Bestand der Library of Congress und hat die lokale Rechteprüfung durchlaufen.
              </p>
            </div>
          </div>
        </section>

        <PublicReferenceExplorer references={references} />

        <section className="grid gap-4 border-t border-white/12 py-8 md:grid-cols-4">
          {readiness.map((item) => (
            <div key={item.label} className="border border-white/12 bg-[#101513] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#66e1d2]">{item.status}</div>
              <h2 className="mt-2 text-lg font-semibold text-[#f7f7f4]">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{item.detail}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#66e1d2]">Freigabestatus</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Geprüfter Bestand</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Referenzen, Assets und Modellvorschauen werden erst nach Rechte- und Inhaltsprüfung freigegeben. Zwischenstände aus KosmoDraw und KosmoPublish bleiben intern, bis der Owner sie ausdrücklich bestätigt.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {publicGateSummary.map((item) => (
              <div key={item.label} className="border border-white/12 bg-[#101513] p-4">
                <div className="text-3xl font-semibold text-[#f7f7f4]">{item.value}</div>
                <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#66e1d2]">{item.label}</div>
                <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#66e1d2]">Villa Savoye / Pilotpaket</div>
            <h2 className="mt-2 text-4xl font-semibold tracking-normal">{villa.title}</h2>
            <p className="mt-5 text-base leading-8 text-[#cbd1cc]">{villa.full_description}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {villa.analysis_layers?.slice(0, 6).map((layer) => (
                <div key={layer.analysis_type} className="border border-white/12 bg-[#101513] p-4">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[#66e1d2]">{layer.analysis_type.replace(/_/g, ' ')}</div>
                  <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{layer.summary}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            {[plan, section].filter(Boolean).map((media) => (
              <div key={media?.type} className="border border-white/12 bg-[#f7f7f4] p-4 text-[#111514]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0b6b60]">{media?.type}</div>
                    <h3 className="text-xl font-semibold">{media?.label}</h3>
                  </div>
                  <span className="border border-[#111514]/14 px-2 py-1 text-[10px] uppercase tracking-[0.12em]">diagrammatisch</span>
                </div>
                {publicProjectMediaUrl(villa, media) ? (
                  <img src={publicProjectMediaUrl(villa, media) ?? ''} alt={media?.label ?? 'Plan'} className="max-h-[360px] w-full object-contain" />
                ) : null}
                <p className="mt-3 text-xs leading-5 text-[#4f5751]">{media?.credit}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-white/12 py-8">
          <EntryModelViewer modelUrl={modelUrl} title={villa.title} accent="#66e1d2" />
        </section>

        <section className="grid gap-6 border-t border-white/12 py-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#66e1d2]">Zweites Pilotprojekt</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">{ingenbohl.title}</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Ingenbohl wird als zweiter Referenz-Prototyp sichtbar, aber bewusst anders als Villa Savoye:
              Medien aus der privaten Recherche bleiben gesperrt. Geprüfte Analysefelder und die öffentliche
              3D-Vorschau demonstrieren bereits die Struktur von KosmoReferences und KosmoAsset.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ingenbohlReadiness.map((item) => (
                <div key={item.label} className="border border-white/12 bg-[#101513] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#66e1d2]">{item.status}</div>
                  <h3 className="mt-2 text-lg font-semibold text-[#f7f7f4]">{item.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            {ingenbohlModelUrl ? <EntryModelViewer modelUrl={ingenbohlModelUrl} title={ingenbohl.title} accent="#66e1d2" /> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {ingenbohlTaxonomy.map((item) => (
                <div key={item.title} className="border border-white/12 bg-[#101513] p-4">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[#66e1d2]">{item.kind}</div>
                  <h3 className="mt-2 text-lg font-semibold text-[#f7f7f4]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#66e1d2]">KosmoAsset Brücke</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Vom Projekt zum Bauteil</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Der öffentliche Pilot zeigt nicht nur Medien, sondern extrahierbare Prinzipien: Struktur, Zirkulation, Materialsystem und Zeichnungslogik. Das ist die Brücke von KosmoReferences zu KosmoAsset.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {taxonomy.map((item) => (
              <div key={item.title} className="border border-white/12 bg-[#101513] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#66e1d2]">{item.kind}</div>
                <h3 className="mt-2 text-lg font-semibold text-[#f7f7f4]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 border-t border-white/12 py-8 md:grid-cols-4">
          <ProcessStep title="1 Bild erkennen" text="Öffentliche Bildkandidaten werden nach Rechte- und Lesbarkeitsstatus sortiert." />
          <ProcessStep title="2 Plan säubern" text="Low-res Pläne werden als eigene, öffentliche Diagramme nachgezeichnet und vereinheitlicht." />
          <ProcessStep title="3 Bauteile ordnen" text="KosmoDraw trennt Tragwerk, Fassade, Erschliessung, Material und Freiraum." />
          <ProcessStep title="4 BIM skizzieren" text="KosmoVis zeigt eine 3D-Vorschau mit Modell-, Material- und Analysefiltern." />
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#66e1d2]">KosmoDraw Übernahme</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Geprüfte Übernahme aus KosmoDraw</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Der aktuelle Prüfbericht fasst KosmoDraw-Pakete als Metadaten zusammen. IFC-Pfade und lokale Artefakte
              werden nicht in den Bericht kopiert; öffentlich freigegeben bleiben nach der Übernahme {kosmoDrawIntake.summary.public_ready_after_intake}.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <IntakeMetric label="Projektpakete" value={kosmoDrawIntake.summary.bundle_count} />
              <IntakeMetric label="Öffnungen" value={kosmoDrawIntake.summary.opening_count} />
              <IntakeMetric label="Unsichere Freigaben" value={kosmoDrawIntake.summary.unsafe_public_flag_count} />
            </div>
          </div>
          <div className="grid gap-3">
            {kosmoDrawIntake.bundles.map((bundle) => (
              <div key={bundle.projectSlug} className="border border-white/12 bg-[#101513] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[#66e1d2]">{bundle.sourceKind}</div>
                    <h3 className="mt-2 text-lg font-semibold text-[#f7f7f4]">{bundle.title}</h3>
                  </div>
                  <span className="border border-white/14 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[#aeb8b2]">
                    {bundle.intakeAllowed ? 'prüfbereit' : 'gesperrt'}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-[#b9c1bc]">
                  <IntakeMini label="Räume" value={bundle.rooms} />
                  <IntakeMini label="Wände" value={bundle.walls} />
                  <IntakeMini label="Öffnungen" value={bundle.openings.total} />
                  <IntakeMini label="Assets" value={bundle.assets.total} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#66e1d2]">Mengenprüfung aus KosmoDraw</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Analyse vor Modellübernahme</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Die Freigabeprüfung akzeptiert solche Berichte als interne Analysekandidaten. Öffentlich freigegeben bleiben {kosmoDrawDigitalization.publicReadyAfterIntake},
              bis elementweise Geometrie und Asset-Kandidaten im Projektpaket vorliegen.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <IntakeMetric label="Räume aggregiert" value={kosmoDrawDigitalization.aggregateCounts.rooms} />
            <IntakeMetric label="Wände aggregiert" value={kosmoDrawDigitalization.aggregateCounts.walls} />
            <IntakeMetric label="Fehlende Bundlefelder" value={kosmoDrawDigitalization.missingBundleFields.length} />
          </div>
        </section>

        <section className="grid gap-5 border-t border-white/12 py-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#66e1d2]">Planregister aus KosmoPublish</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4]">Planregister und Freigabestatus</h2>
            <p className="mt-4 text-sm leading-7 text-[#cbd1cc]">
              Der schreibgeschützte Plankatalog ist eine sichere Metadaten-Vorstufe. Er ordnet Planvorschauen über {kosmoPublishPlanCatalog.phaseCount} Phasen,
              veröffentlicht aber keine Plan-Assets automatisch.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#8f9994]">
              Schema {kosmoPublishPlanCatalog.planNumberPattern}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <IntakeMetric label="Phasen" value={kosmoPublishPlanCatalog.phaseCount} />
            <IntakeMetric label="Toolfelder" value={kosmoPublishPlanCatalog.outputFields.length} />
            <IntakeMetric label="Öffentliche Assets" value={kosmoPublishPlanCatalog.publishesPlanAssetsNow ? 1 : 0} />
          </div>
        </section>

      </div>
    </main>
  );
}

function ProcessStep({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-white/12 bg-[#101513] p-4">
      <h3 className="text-lg font-semibold text-[#f7f7f4]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{text}</p>
    </div>
  );
}

function IntakeMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/12 bg-[#101513] p-4">
      <div className="text-3xl font-semibold text-[#f7f7f4]">{value}</div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[#66e1d2]">{label}</div>
    </div>
  );
}

function IntakeMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/10 bg-[#050707] px-2 py-3">
      <div className="text-lg font-semibold text-[#f7f7f4]">{value}</div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[#8f9994]">{label}</div>
    </div>
  );
}
