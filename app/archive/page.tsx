import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArchiveCursor } from '@/components/archive/ArchiveCursor';
import { ArchiveHistoryControls } from '@/components/archive/ArchiveHistoryControls';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import relations from '@/data/relations.json';
import archivePreview from '@/data/archive-preview.json';
import { publicAtlasEntries } from '@/lib/public-kosmo';
import type { Entry, EntryRelation, EntryType, StyleSectorId } from '@/lib/types';

const allEintraege = publicAtlasEntries() as Entry[];
const allRelationen = relations as EntryRelation[];

export const metadata: Metadata = {
  title: 'KosmoData Archiv | Architektur Kosmos',
  description: 'Statische Vorschau der KosmoData-Archivstruktur, vorbereitet für geprüfte Referenz-, Medien- und Modellabfragen.'
};

export default function ArchivePage() {
  const pilot = allEintraege.find((entry) => entry.id === archivePreview.entries[0]?.id) ?? allEintraege[0];
  const pilotEintraege = allEintraege.filter((entry) => entry.database_profile);
  const typeCounts = countBy(allEintraege, (entry) => entry.entry_type);
  const styleCounts = countBy(allEintraege, (entry) => entry.style_sector);
  const richestEintraege = [...allEintraege]
    .sort((a, b) => archiveWeight(b) - archiveWeight(a))
    .slice(0, 10);
  const workflow = archiveWorkflow(allEintraege);
  const health = archiveHealth(allEintraege, allRelationen);
  const modernVillaCluster = pilotEintraege.filter((entry) => entry.database_tags?.some((tag) => tag.includes('modern-villa')));

  return (
    <main className="entry-page archive-page min-h-screen overflow-x-hidden bg-[#050505] text-[#f7f7f4]" style={{ '--entry-accent': '#00e7ff' } as CSSProperties}>
      <ArchiveCursor />
      <div className="entry-cosmos-field" aria-hidden="true">
        <span className="entry-ring entry-ring-a" />
        <span className="entry-ring entry-ring-b" />
        <span className="entry-ring entry-ring-c" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <PublicSiteHeader active="references" context="Archivvorschau" />
        <div className="mt-4 flex justify-end">
          <ArchiveHistoryControls />
        </div>

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1.08fr)_360px] lg:py-14">
          <div>
            <div className="mb-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-[#b8b8b2]">
              <span className="border border-white/15 px-2.5 py-1">Statische Archivvorschau</span>
              <span className="border border-[#00e7ff] px-2.5 py-1 text-[#00e7ff]">D1 bereit</span>
              <span className="border border-white/15 px-2.5 py-1">R2 Vorschau-Bucket</span>
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-normal text-[#f7f7f4] sm:text-6xl lg:text-7xl">
              KosmoData Archiv
            </h1>
            <p className="mt-8 max-w-3xl text-xl leading-relaxed text-[#f7f7f4] sm:text-2xl">
              Ein statischer Kontrollraum für Einträge, Quellen, Medienslots, Relationen, Analyseebenen und zukünftige 3D-Modellpakete.
            </p>
            <p className="mt-7 max-w-3xl text-base leading-8 text-[#cfcfca]">
              Die Website liest weiterhin gebündelte JSON-Daten für maximale Geschwindigkeit und minimales Backend-Risiko. Das Vorschauarchiv ist für Validierung, Schemaentwurf und spätere Leseabfragen vorbereitet. Echte Bilder, Pläne und 3D-Vorschauen können in den Objektspeicher wechseln, sobald die Medienpolitik bereit ist.
            </p>
          </div>

          <ArchiveHealthPanel health={health} />
        </section>

        <section className="archive-metric-grid grid gap-3 border-t border-white/12 py-8 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Einträge" value={allEintraege.length} />
          <Metric label="Relationen" value={allRelationen.length} />
          <Metric label="Medien" value={archivePreview.entry_media.length} />
          <Metric label="Modellgruppen" value={archivePreview.entry_models.length} />
          <Metric label="Analyseebenen" value={archivePreview.entry_analysis.length} />
          <Metric label="Quellen" value={archivePreview.entry_sources.length} />
          <Metric label="Dossiermerkmale" value={archivePreview.tags.length} />
          <Metric label="Referenzpiloten" value={pilotEintraege.length} />
        </section>

        <section className="grid gap-6 border-t border-white/12 py-8 lg:grid-cols-[0.9fr_1.1fr]">
          <details className="entry-archive-panel archive-expandable-card border border-white/14 bg-[#071315]/70 p-5" open>
            <summary>
              <span>Archiv-Workflow</span>
              <i>öffnen</i>
            </summary>
            <div className="space-y-3">
              {workflow.stages.map((stage) => (
                <details key={stage.label} className="archive-inline-card border border-white/12 bg-[#050505]/40 p-3">
                  <summary>
                    <span className="text-sm text-[#f7f7f4]">{stage.label}</span>
                    <span className="text-xl text-[#00e7ff]">{stage.value}</span>
                  </summary>
                  <p className="mt-2 text-xs leading-5 text-[#b8b8b2]">{stage.description}</p>
                </details>
              ))}
            </div>
          </details>

          <details className="entry-archive-panel archive-expandable-card border border-white/14 bg-[#071315]/70 p-5">
            <summary>
              <span>Nächster Import-Workflow</span>
              <i>anzeigen</i>
            </summary>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-[#d7d7d0]">
              <li><span className="text-[#00e7ff]">01</span> Quellenmaterial in <code>{'archive-inbox/{entry_slug}'}</code> ablegen.</li>
              <li><span className="text-[#00e7ff]">02</span> <code>npm run archive:capture -- --input archive-inbox/villa-savoye --title &quot;Villa Savoye&quot;</code> ausführen.</li>
              <li><span className="text-[#00e7ff]">03</span> Eintragsentwurf, Quellenkandidaten, Asset-Kandidaten und Modellpakete prüfen.</li>
              <li><span className="text-[#00e7ff]">04</span> Geprüften Eintrag in <code>data/mock-entries.json</code> übernehmen.</li>
              <li><span className="text-[#00e7ff]">05</span> D1 mit <code>npm run archive:d1-preview</code> synchronisieren.</li>
            </ol>
          </details>
        </section>

        <section className="grid gap-6 border-t border-white/12 py-8 lg:grid-cols-[1.05fr_0.95fr]">
          <details className="entry-archive-panel archive-expandable-card border border-[#00e7ff]/35 bg-[#06171a]/75 p-5" open>
            <summary>
              <span>Asset-Erfassung</span>
              <i>Details</i>
            </summary>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#d7d7d0]">
              Echte Bilder, Pläne und Modelldateien bleiben review-only, bis Rechte- und Grössenprüfungen abgeschlossen sind. Der Erfassungsprozess erzeugt eine geprüfte Paketstruktur, scannt Metadaten und schreibt ein Review-Manifest ohne öffentliche Freigabe.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ArchiveMeta label="Review-Ordner" value="review-inbox/{entry_slug}" />
              <ArchiveMeta label="Inbox" value="review-package/{entry_slug}" />
              <ArchiveMeta label="Manifest" value="out/asset-manifests/{entry_slug}.json" />
              <ArchiveMeta label="Upload" value="blockiert / nur Dry-run" />
            </div>
          </details>

          <details className="entry-archive-panel archive-expandable-card border border-white/14 bg-[#071315]/70 p-5">
            <summary>
              <span>Asset-Erfassungsbefehl</span>
              <i>anzeigen</i>
            </summary>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-[#d7d7d0]">
              <li><span className="text-[#00e7ff]">01</span> Dateien in <code>review-inbox/villa-savoye/exterior</code>, <code>interior</code>, <code>section</code>, <code>plan</code> oder <code>models</code> legen.</li>
              <li><span className="text-[#00e7ff]">02</span> <code>npm run archive:asset-manifest -- --entry villa-savoye</code> ausführen.</li>
              <li><span className="text-[#00e7ff]">03</span> Blockierte Rechte, fehlende Slots und geplante R2-Keys im Manifest prüfen.</li>
            </ol>
          </details>
        </section>

        <section className="grid gap-6 border-t border-white/12 py-8 lg:grid-cols-2">
          <ArchiveList title="Eintragstypen" rows={orderedEntryTypes.map((type) => [type.replace(/_/g, ' '), `${typeCounts[type] ?? 0}`])} />
          <ArchiveList title="Baustil-Sektoren" rows={orderedStyleSectors.map((style) => [style.replace(/_/g, ' '), `${styleCounts[style] ?? 0}`])} />
        </section>

        <section className="border-t border-white/12 py-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00e7ff]">Referenzpilot</h2>
            <Link href={`/atlas/${pilot.slug}/`} className="entry-link border border-white/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#d7d7d0]">
              Pilot öffnen
            </Link>
          </div>
          <div className="entry-study-card border border-white/14 bg-[#071315]/55 p-5">
            <div className="text-2xl text-[#f7f7f4]">{pilot.title}</div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#b8b8b2]">{pilot.one_sentence}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ArchiveMeta label="Medien" value={`${pilot.media.length} Medienslots`} />
              <ArchiveMeta label="3D" value={`${pilot.model_assets?.length ?? 0} Modellgruppen`} />
              <ArchiveMeta label="Analyse" value={`${pilot.analysis_layers?.length ?? 0} Analyseebenen`} />
              <ArchiveMeta label="Merkmale" value={`${pilot.database_tags?.length ?? 0} Dossiermerkmale`} />
            </div>
          </div>
        </section>

        <section className="border-t border-white/12 py-8">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00e7ff]">Referenzpiloten</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pilotEintraege.map((entry) => (
              <Link key={entry.id} href={`/atlas/${entry.slug}/`} className="entry-link entry-relation-card border border-white/14 bg-[#071315]/55 p-4">
                <span className="block text-[10px] uppercase tracking-[0.16em] text-[#00e7ff]">{entry.database_profile?.status} / {entry.style_sector.replace(/_/g, ' ')}</span>
                <span className="mt-2 block text-lg text-[#f7f7f4]">{entry.title}</span>
                <span className="mt-2 block text-sm leading-6 text-[#b8b8b2]">
                  {entry.database_profile?.media_count ?? entry.media.length} Medien / {entry.database_profile?.model_count ?? 0} Modelle / {entry.database_profile?.analysis_count ?? 0} Analyseebenen
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-white/12 py-8">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00e7ff]">Pilotcluster / moderne Villa</h2>
          <div className="grid gap-3 lg:grid-cols-3">
            {modernVillaCluster.map((entry) => (
              <Link key={entry.id} href={`/atlas/${entry.slug}/`} className="entry-link entry-study-card border border-white/14 bg-[#071315]/55 p-4">
                <span className="block text-[10px] uppercase tracking-[0.16em] text-[#00e7ff]">{entry.year_start} / {entry.authors[0]}</span>
                <span className="mt-2 block text-xl text-[#f7f7f4]">{entry.title}</span>
                <span className="mt-3 block text-sm leading-6 text-[#b8b8b2]">{clusterPosition(entry)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-white/12 py-8">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00e7ff]">Braucht Aufmerksamkeit</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <AttentionCard title="Quellen" entries={workflow.needsQuellen} />
            <AttentionCard title="Relationen" entries={workflow.needsRelationen} />
            <AttentionCard title="Modelle" entries={workflow.needsModelle} />
          </div>
        </section>

        <section className="border-t border-white/12 py-8">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00e7ff]">Strukturierteste statische Einträge</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {richestEintraege.map((entry) => (
              <Link key={entry.id} href={`/atlas/${entry.slug}/`} className="entry-link entry-relation-card border border-white/14 bg-[#071315]/55 p-4">
                <span className="block text-[10px] uppercase tracking-[0.16em] text-[#00e7ff]">{entry.entry_type.replace(/_/g, ' ')} / {entry.style_sector.replace(/_/g, ' ')}</span>
                <span className="mt-2 block text-lg text-[#f7f7f4]">{entry.title}</span>
                <span className="mt-2 block text-sm leading-6 text-[#b8b8b2]">{archiveWeight(entry)} Archivpunkte / {entry.year_start < 0 ? `${Math.abs(entry.year_start)} v. Chr.` : entry.year_start}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

const orderedEntryTypes: EntryType[] = ['building', 'urban_plan', 'landscape_project', 'text', 'theory', 'map', 'infrastructure', 'object', 'event'];
const orderedStyleSectors: StyleSectorId[] = ['classical_architecture', 'pre_modern_architecture', 'modern_architecture', 'postwar_modern_architecture', 'sustainable_architecture', 'vernacular_architecture'];
const requiredMediaTypes = ['exterior', 'interior', 'section', 'plan'] as const;

type ArchiveHealthMetric = {
  id: string;
  label: string;
  shortLabel: string;
  value: number;
  hint: string;
};

type ArchiveHealth = {
  score: number;
  metrics: ArchiveHealthMetric[];
};

function countBy<Key extends string>(items: Entry[], keyFn: (_entry: Entry) => Key) {
  return items.reduce<Record<Key, number>>((accumulator, entry) => {
    const key = keyFn(entry);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {} as Record<Key, number>);
}

function archiveWeight(entry: Entry) {
  return entry.media.length * 8
    + (entry.source_documents?.length ?? 0) * 5
    + (entry.source_assets?.length ?? 0) * 3
    + (entry.model_assets?.length ?? 0) * 10
    + (entry.analysis_layers?.length ?? 0) * 8
    + (entry.database_tags?.length ?? 0) * 2
    + (entry.database_profile ? 20 : 0);
}

function archiveHealth(entries: Entry[], entryRelations: EntryRelation[]): ArchiveHealth {
  const total = entries.length;
  const relationEntryIds = new Set(entryRelations.flatMap((relation) => [relation.source_entry_id, relation.target_entry_id]));
  const reviewedStatuses = new Set(['reviewed', 'published']);
  const withSources = entries.filter((entry) => (entry.source_documents?.length ?? 0) > 0 || Boolean(entry.source_url));
  const withMedia = entries.filter(hasRequiredMediaSet);
  const withRelations = entries.filter((entry) => relationEntryIds.has(entry.id));
  const withModels = entries.filter((entry) => (entry.model_assets?.length ?? 0) > 0 || Boolean(entry.model_3d?.glb_url));
  const withAnalysis = entries.filter((entry) => (entry.analysis_layers?.length ?? 0) > 0 || (entry.analysis_observations?.length ?? 0) > 0);
  const reviewed = entries.filter((entry) => reviewedStatuses.has(entry.database_profile?.status ?? ''));

  const metrics: ArchiveHealthMetric[] = [
    {
      id: 'sources',
      label: 'Quellenlage',
      shortLabel: 'Quellen',
      value: percentOf(withSources.length, total),
      hint: 'Einträge mit Quelldokumenten oder belastbarer Quellen-URL.'
    },
    {
      id: 'media',
      label: 'Medienslots',
      shortLabel: 'Medien',
      value: percentOf(withMedia.length, total),
      hint: 'Aussen, Innen, Schnitt und Plan sind als Slot oder Medium angelegt.'
    },
    {
      id: 'relations',
      label: 'Wissensnetz',
      shortLabel: 'Netz',
      value: percentOf(withRelations.length, total),
      hint: 'Einträge mit mindestens einer Beziehung zu einem anderen Objekt.'
    },
    {
      id: 'models',
      label: '3D-Vorschau',
      shortLabel: '3D',
      value: percentOf(withModels.length, total),
      hint: 'Einträge mit Modellgruppen, 3D-Vorschauen oder vorbereiteten Analysegruppen.'
    },
    {
      id: 'analysis',
      label: 'Analyseebenen',
      shortLabel: 'Analyse',
      value: percentOf(withAnalysis.length, total),
      hint: 'Material, Struktur, Tektonik oder Kontext sind als Analysefelder vorbereitet.'
    },
    {
      id: 'review',
      label: 'Prüfstatus',
      shortLabel: 'Prüfung',
      value: percentOf(reviewed.length, total),
      hint: 'Einträge, die über Draft hinaus als geprüft oder publiziert markiert sind.'
    }
  ];

  return {
    score: Math.round(metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length),
    metrics
  };
}

function hasRequiredMediaSet(entry: Entry) {
  const mediaTypes = new Set(entry.media.map((media) => media.type));
  return requiredMediaTypes.every((type) => mediaTypes.has(type));
}

function percentOf(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function archiveWorkflow(entries: Entry[]) {
  const reviewed = entries.filter((entry) => entry.database_profile?.status === 'reviewed' || entry.database_profile?.status === 'published');
  const withAllMedia = entries.filter((entry) => new Set(entry.media.map((media) => media.type)).size >= 4);
  const withQuellen = entries.filter((entry) => (entry.source_documents?.length ?? 0) > 0 || Boolean(entry.source_url));
  const withModelle = entries.filter((entry) => (entry.model_assets?.length ?? 0) > 0);
  const withRelationen = entries.filter((entry) => allRelationen.some((relation) => relation.source_entry_id === entry.id || relation.target_entry_id === entry.id));

  return {
    stages: [
      { label: 'Strukturierte Einträge', value: entries.length, description: 'Objekte, die aktuell als statisches JSON gebündelt und nach D1 exportierbar sind.' },
      { label: 'Quellengestützt', value: withQuellen.length, description: 'Einträge mit mindestens einem Quelldokument oder einer Quellen-URL.' },
      { label: 'Vier Medienslots bereit', value: withAllMedia.length, description: 'Einträge mit Aussenbild, Innenbild, Schnitt und Plan als Platzhalter oder Medienzeile.' },
      { label: 'Beziehungsgraph bereit', value: withRelationen.length, description: 'Einträge, die mit mindestens einem weiteren Archivobjekt verbunden sind.' },
      { label: 'Modelldaten bereit', value: withModelle.length, description: 'Einträge mit geplanten 3D-Modellzeilen und R2-Schlüsseln.' },
      { label: 'Geprüfte Piloten', value: reviewed.length, description: 'Einträge, die über den Entwurfsstatus hinaus befördert wurden.' }
    ],
    needsQuellen: entries.filter((entry) => (entry.source_documents?.length ?? 0) === 0 && !entry.source_url).slice(0, 4),
    needsRelationen: entries.filter((entry) => !allRelationen.some((relation) => relation.source_entry_id === entry.id || relation.target_entry_id === entry.id)).slice(0, 4),
    needsModelle: entries.filter((entry) => (entry.model_assets?.length ?? 0) === 0).slice(0, 4)
  };
}

function clusterPosition(entry: Entry) {
  if (entry.id === 'villa-savoye') return 'Manifesthaus: fünf Punkte, Promenade, Pilotis und Dachgarten.';
  if (entry.id === 'haus-tugendhat') return 'Materialisierter freier Grundriss: Stahlrahmen, Schirme, Glas und fließender Wohnraum.';
  if (entry.id === 'villa-noailles') return 'Freizeitvilla: Bewegung, Terrassen, Kunst, Garten und avantgardistische Häuslichkeit.';
  return entry.one_sentence;
}

function ArchiveHealthPanel({ health }: { health: ArchiveHealth }) {
  return (
    <aside className="entry-archive-panel entry-archive-status-panel archive-expandable-card border border-white/14 bg-[#071315]/70 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00e7ff]">Archivgesundheit</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#f7f7f4]">KosmoData ist lesbar, aber noch in Prüfung.</h2>
        </div>
        <div className="entry-archive-score" style={{ borderColor: '#00e7ff', color: '#00e7ff' }}>
          <span>{health.score}</span>
          <small>%</small>
        </div>
      </div>

      <ArchiveHealthRadar metrics={health.metrics} />

      <div className="mt-4 space-y-2">
        {health.metrics.map((metric) => (
          <ArchiveHealthProgress key={metric.id} metric={metric} />
        ))}
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
        <ArchiveMeta label="Archivspeicher" value={archivePreview.storage_target.database_name} />
        <ArchiveMeta label="Frontend" value={archivePreview.storage_target.frontend_connection.replace(/_/g, ' ')} />
        <ArchiveMeta label="Assets" value={archivePreview.storage_target.assets_status.replace(/_/g, ' ')} />
        <ArchiveMeta label="Geprüft" value={archivePreview.storage_target.last_verified} />
      </dl>
    </aside>
  );
}

function ArchiveHealthRadar({ metrics }: { metrics: ArchiveHealthMetric[] }) {
  const center = 72;
  const maxRadius = 52;
  const axisPoints = metrics.map((metric, index) => radarPoint(index, metrics.length, maxRadius, center, center, 1));
  const valuePoints = metrics.map((metric, index) => radarPoint(index, metrics.length, maxRadius, center, center, metric.value / 100));

  return (
    <div className="entry-archive-radar" style={{ '--radar-accent': '#00e7ff' } as CSSProperties}>
      <svg viewBox="0 0 144 144" role="img" aria-label="Radar der Archivabdeckung">
        {[0.33, 0.66, 1].map((scale) => {
          const points = metrics.map((metric, index) => formatRadarPoint(radarPoint(index, metrics.length, maxRadius, center, center, scale))).join(' ');
          return <polygon key={scale} className="entry-radar-ring" points={points} />;
        })}
        {axisPoints.map((point, index) => (
          <line key={metrics[index].id} className="entry-radar-axis" x1={center} y1={center} x2={point.x} y2={point.y} />
        ))}
        <polygon className="entry-radar-shape" points={valuePoints.map(formatRadarPoint).join(' ')} />
        {valuePoints.map((point, index) => (
          <circle key={metrics[index].id} className="entry-radar-node" cx={point.x} cy={point.y} r="2.3" />
        ))}
        {axisPoints.map((point, index) => {
          const label = radarPoint(index, metrics.length, maxRadius + 12, center, center, 1);
          return (
            <text key={metrics[index].id} className="entry-radar-label" x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle">
              {metrics[index].shortLabel}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function ArchiveHealthProgress({ metric }: { metric: ArchiveHealthMetric }) {
  return (
    <div className="entry-archive-progress" style={{ '--progress-value': `${metric.value}%`, '--progress-accent': '#00e7ff' } as CSSProperties}>
      <div className="flex items-center justify-between gap-3">
        <span>{metric.label}</span>
        <b>{metric.value}%</b>
      </div>
      <div className="entry-archive-progress-track" aria-hidden="true">
        <span />
      </div>
      <p>{metric.hint}</p>
    </div>
  );
}

function radarPoint(index: number, total: number, radius: number, centerX: number, centerY: number, scale: number) {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  const scaledRadius = radius * scale;
  const x = centerX + Math.cos(angle) * scaledRadius;
  const y = centerY + Math.sin(angle) * scaledRadius;
  return { x, y };
}

function formatRadarPoint(point: { x: number; y: number }) {
  return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <details className="entry-study-card archive-metric-card border border-white/14 bg-[#071315]/55 p-4">
      <summary>
        <span className="text-3xl font-semibold text-[#f7f7f4]">{value}</span>
        <span className="mt-2 block text-[10px] uppercase tracking-[0.18em] text-[#b8b8b2]">{label}</span>
      </summary>
      <p className="mt-3 text-xs leading-5 text-[#b8b8b2]">
        Klickbare Archiv-Kennzahl. Diese Werte kommen aus der statischen Archivvorschau und dienen später als Health-Signal für Quellen, Medien, Modelle und Analyseabdeckung.
      </p>
    </details>
  );
}

function ArchiveMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.16em] text-[#8d8d87]">{label}</dt>
      <dd className="mt-1 break-words text-[#f7f7f4]">{value}</dd>
    </div>
  );
}

function ArchiveList({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <details className="entry-archive-panel archive-expandable-card border border-white/14 bg-[#071315]/70 p-5">
      <summary>
        <span>{title}</span>
        <i>öffnen</i>
      </summary>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b border-white/10 pb-2 text-sm">
            <span className="capitalize text-[#d7d7d0]">{label}</span>
            <span className="text-[#f7f7f4]">{value}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

function AttentionCard({ title, entries }: { title: string; entries: Entry[] }) {
  return (
    <details className="entry-archive-panel archive-expandable-card border border-white/14 bg-[#071315]/70 p-4" open>
      <summary>
        <span>{title}</span>
        <i>{entries.length}</i>
      </summary>
      <div className="mt-3 space-y-2">
        {entries.map((entry) => (
          <Link key={entry.id} href={`/atlas/${entry.slug}/`} className="entry-link block border border-white/10 bg-[#050505]/35 px-3 py-2">
            <span className="block truncate text-sm text-[#f7f7f4]">{entry.title}</span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-[#8d8d87]">{entry.entry_type.replace(/_/g, ' ')}</span>
          </Link>
        ))}
      </div>
    </details>
  );
}
