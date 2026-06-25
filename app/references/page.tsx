/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { EntryModelViewer } from '@/components/atlas/EntryModelViewer';
import { PublicReferenceExplorer } from '@/components/public/PublicReferenceExplorer';
import { PublicBundleCard, PublicCardGrid, PublicHeroPreview, PublicInfoCard, PublicMediaCard, PublicMetricCard, PublicSplitSection } from '@/components/public/PublicSectionPrimitives';
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
    <main className="entry-page ak-page-shell" style={{ '--ak-accent': '#66e1d2' } as CSSProperties}>
      <div className="ak-page-inner">
        <PublicSiteHeader active="references" context="Öffentliche Referenzdatenbank" />

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:py-14">
          <div>
            <div className="public-hero-tags">
              <span className="public-hero-tag public-hero-tag-accent">KosmoReferences</span>
              <span className="public-hero-tag">Öffentlich freigegeben</span>
              <span className="public-hero-tag">Pilotprojekt Villa Savoye</span>
            </div>
            <h1 className="ak-page-title max-w-4xl font-semibold tracking-normal">
              Vom Bauwerk zum prüfbaren Dossier
            </h1>
            <p className="public-hero-lede">
              Bauten werden mit Autorenschaft, Ort, Zeit, Quellen, Bildern, bereinigten Planebenen, Analysefeldern und Modellvorschauen erschlossen. Gezeigt werden ausschliesslich öffentlich freigegebene Medien und eigene diagrammatische Rekonstruktionen.
            </p>
          </div>
          <PublicHeroPreview
            accent="#66e1d2"
            kicker="Geprüftes Titelbild"
            caption={(
              <p>
                Das Titelbild stammt aus einem öffentlich nutzbaren Bestand der Library of Congress und hat die lokale Rechteprüfung durchlaufen.
              </p>
            )}
          >
            {publicProjectMediaUrl(villa, exterior) ? (
              <img src={publicProjectMediaUrl(villa, exterior) ?? ''} alt="Villa Savoye Referenzbild" className="aspect-[4/3] w-full object-cover" />
            ) : null}
          </PublicHeroPreview>
        </section>

        <PublicReferenceExplorer references={references} />

        <section className="border-t border-white/12 py-8">
          <PublicCardGrid columns={4}>
          {readiness.map((item) => (
            <PublicInfoCard key={item.label} accent="#66e1d2" kicker={item.status} title={item.label} body={<p>{item.detail}</p>} />
          ))}
          </PublicCardGrid>
        </section>

        <PublicSplitSection
          accent="#66e1d2"
          kicker="Freigabestatus"
          title="Was öffentlich sichtbar sein darf"
          body={(
            <p>
              Referenzen, Assets und Modellvorschauen werden erst nach Rechte- und Inhaltsprüfung freigegeben. Zwischenstände aus KosmoDraw und KosmoPublish bleiben intern, bis der Owner sie ausdrücklich bestätigt.
            </p>
          )}
        >
          <PublicCardGrid columns={2}>
            {publicGateSummary.map((item) => (
              <PublicMetricCard key={item.label} accent="#66e1d2" label={item.label} value={item.value} detail={<p>{item.detail}</p>} />
            ))}
          </PublicCardGrid>
        </PublicSplitSection>

        <PublicSplitSection
          accent="#66e1d2"
          kicker="Villa Savoye / Pilotpaket"
          title="Villa Savoye als prüfbares Referenzdossier"
          body={(
            <>
              <p>{villa.full_description}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {villa.analysis_layers?.slice(0, 6).map((layer) => (
                <PublicInfoCard
                  key={layer.analysis_type}
                  accent="#66e1d2"
                  kicker="Analyseebene"
                  title={layer.analysis_type.replace(/_/g, ' ')}
                  body={<p>{layer.summary}</p>}
                />
              ))}
              </div>
            </>
          )}
        >
          <div className="grid gap-4">
            {[plan, section].filter(Boolean).map((media) => (
              <PublicMediaCard
                key={media?.type}
                accent="#66e1d2"
                kicker={media?.type ?? 'Plan'}
                title={media?.label ?? 'Planebene'}
                badge="diagrammatisch"
                media={publicProjectMediaUrl(villa, media) ? (
                  <img src={publicProjectMediaUrl(villa, media) ?? ''} alt={media?.label ?? 'Plan'} />
                ) : null}
                caption={<p>{media?.credit}</p>}
              />
            ))}
          </div>
        </PublicSplitSection>

        <section className="border-t border-white/12 py-8">
          <EntryModelViewer modelUrl={modelUrl} title={villa.title} accent="#66e1d2" />
        </section>

        <PublicSplitSection
          accent="#66e1d2"
          kicker="Zweites Pilotprojekt"
          title="Ingenbohl zeigt Struktur, ohne private Quellen zu öffnen"
          body={(
            <>
              <p>
              Ingenbohl wird als zweiter Referenz-Prototyp sichtbar, aber bewusst anders als Villa Savoye:
              Medien aus der privaten Recherche bleiben gesperrt. Geprüfte Analysefelder und die öffentliche
              3D-Vorschau demonstrieren bereits die Struktur von KosmoReferences und KosmoAsset.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ingenbohlReadiness.map((item) => (
                <PublicInfoCard key={item.label} accent="#66e1d2" kicker={item.status} title={item.label} body={<p>{item.detail}</p>} />
              ))}
              </div>
            </>
          )}
        >
          <div className="grid gap-4">
            {ingenbohlModelUrl ? <EntryModelViewer modelUrl={ingenbohlModelUrl} title={ingenbohl.title} accent="#66e1d2" /> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {ingenbohlTaxonomy.map((item) => (
                <PublicInfoCard key={item.title} accent="#66e1d2" kicker={item.kind} title={item.title} body={<p>{item.detail}</p>} />
              ))}
            </div>
          </div>
        </PublicSplitSection>

        <PublicSplitSection
          accent="#66e1d2"
          kicker="KosmoAsset Brücke"
          title="Aus Lesarten entstehen wiederverwendbare Bauteilgruppen"
          body={(
            <p>
              Der öffentliche Pilot zeigt nicht nur Medien, sondern extrahierbare Prinzipien: Struktur, Zirkulation, Materialsystem und Zeichnungslogik. Das ist die Brücke von KosmoReferences zu KosmoAsset.
            </p>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {taxonomy.map((item) => (
              <PublicInfoCard key={item.title} accent="#66e1d2" kicker={item.kind} title={item.title} body={<p>{item.detail}</p>} />
            ))}
          </div>
        </PublicSplitSection>

        <section className="border-t border-white/12 py-8">
          <PublicCardGrid columns={4}>
            <PublicInfoCard accent="#66e1d2" title="1 Bild erkennen" body={<p>Öffentliche Bildkandidaten werden nach Rechte- und Lesbarkeitsstatus sortiert.</p>} />
            <PublicInfoCard accent="#66e1d2" title="2 Plan säubern" body={<p>Low-res Pläne werden als eigene, öffentliche Diagramme nachgezeichnet und vereinheitlicht.</p>} />
            <PublicInfoCard accent="#66e1d2" title="3 Bauteile ordnen" body={<p>KosmoDraw trennt Tragwerk, Fassade, Erschliessung, Material und Freiraum.</p>} />
            <PublicInfoCard accent="#66e1d2" title="4 BIM skizzieren" body={<p>KosmoVis zeigt eine 3D-Vorschau mit Modell-, Material- und Analysefiltern.</p>} />
          </PublicCardGrid>
        </section>

        <PublicSplitSection
          accent="#66e1d2"
          kicker="KosmoDraw Übernahme"
          title="Plan- und Modellstände werden zuerst geprüft"
          body={(
            <>
              <p>
              Der aktuelle Prüfbericht fasst KosmoDraw-Pakete als Metadaten zusammen. IFC-Pfade und lokale Artefakte
              werden nicht in den Bericht kopiert; öffentlich freigegeben bleiben nach der Übernahme {kosmoDrawIntake.summary.public_ready_after_intake}.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <PublicMetricCard accent="#66e1d2" label="Projektpakete" value={kosmoDrawIntake.summary.bundle_count} />
              <PublicMetricCard accent="#66e1d2" label="Öffnungen" value={kosmoDrawIntake.summary.opening_count} />
              <PublicMetricCard accent="#66e1d2" label="Unsichere Freigaben" value={kosmoDrawIntake.summary.unsafe_public_flag_count} />
              </div>
            </>
          )}
        >
          <div className="grid gap-3">
            {kosmoDrawIntake.bundles.map((bundle) => (
              <PublicBundleCard
                key={bundle.projectSlug}
                accent="#66e1d2"
                kicker={bundle.sourceKind}
                title={bundle.title}
                status={bundle.intakeAllowed ? 'prüfbereit' : 'gesperrt'}
                body={<p>Review-only Aufnahme aus KosmoDraw. Lokale Artefakte und IFC-Pfade bleiben ausgeschlossen.</p>}
                metrics={[
                  { label: 'Räume', value: bundle.rooms },
                  { label: 'Wände', value: bundle.walls },
                  { label: 'Öffnungen', value: bundle.openings.total },
                  { label: 'Assets', value: bundle.assets.total }
                ]}
              />
            ))}
          </div>
        </PublicSplitSection>

        <PublicSplitSection
          accent="#66e1d2"
          kicker="Mengenprüfung aus KosmoDraw"
          title="Mengenwerte erklären noch kein Gebäude"
          body={(
            <p>
              Die Freigabeprüfung akzeptiert solche Berichte als interne Analysekandidaten. Öffentlich freigegeben bleiben {kosmoDrawDigitalization.publicReadyAfterIntake},
              bis elementweise Geometrie und Asset-Kandidaten im Projektpaket vorliegen.
            </p>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <PublicMetricCard accent="#66e1d2" label="Räume aggregiert" value={kosmoDrawDigitalization.aggregateCounts.rooms} />
            <PublicMetricCard accent="#66e1d2" label="Wände aggregiert" value={kosmoDrawDigitalization.aggregateCounts.walls} />
            <PublicMetricCard accent="#66e1d2" label="Fehlende Bundlefelder" value={kosmoDrawDigitalization.missingBundleFields.length} />
          </div>
        </PublicSplitSection>

        <PublicSplitSection
          accent="#66e1d2"
          kicker="Planregister aus KosmoPublish"
          title="Zeichnungen bleiben nachvollziehbar versioniert"
          body={(
            <>
              <p>
              Der schreibgeschützte Plankatalog ist eine sichere Metadaten-Vorstufe. Er ordnet Planvorschauen über {kosmoPublishPlanCatalog.phaseCount} Phasen,
              veröffentlicht aber keine Plan-Assets automatisch.
              </p>
              <p>Schema {kosmoPublishPlanCatalog.planNumberPattern}</p>
            </>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <PublicMetricCard accent="#66e1d2" label="Phasen" value={kosmoPublishPlanCatalog.phaseCount} />
            <PublicMetricCard accent="#66e1d2" label="Toolfelder" value={kosmoPublishPlanCatalog.outputFields.length} />
            <PublicMetricCard accent="#66e1d2" label="Öffentliche Assets" value={kosmoPublishPlanCatalog.publishesPlanAssetsNow ? 1 : 0} />
          </div>
        </PublicSplitSection>

      </div>
    </main>
  );
}
