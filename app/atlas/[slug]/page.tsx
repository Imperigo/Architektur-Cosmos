import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { EntryModelViewer } from '@/components/atlas/EntryModelViewer';
import { MediaLightbox } from '@/components/atlas/MediaLightbox';
import { ProjectSearch } from '@/components/atlas/ProjectSearch';
import entries from '@/data/mock-entries.json';
import publicModelPreviews from '@/data/public-model-previews.json';
import relations from '@/data/relations.json';
import { styleSectorColors } from '@/lib/atlas-layout';
import { prettifyGermanText } from '@/lib/display-text';
import { primaryPublicMediaUrl, publicDisplayMediaUrl } from '@/lib/media';
import type { Entry, EntryRelation, StyleSectorId } from '@/lib/types';

const allEntries = entries as Entry[];
const allRelationen = relations as EntryRelation[];
const publicModels = publicModelPreviews.models as Array<{ slug: string; url: string }>;
const siteUrl = 'https://architekturkosmos.ch';

type ArchiveStatusMetric = {
  id: string;
  label: string;
  shortLabel: string;
  value: number;
  hint: string;
};

type EntryPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return allEntries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: EntryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = findEntry(slug);

  if (!entry) {
    return {
      title: 'Eintrag nicht gefunden | Architektur Kosmos'
    };
  }

  const title = `${entry.title} | Architektur Kosmos`;
  const description = prettifyGermanText(entry.one_sentence || entry.short_description);
  const url = `${siteUrl}/atlas/${entry.slug}/`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Architektur Kosmos',
      type: 'article'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    }
  };
}

export default async function EntryPage({ params }: EntryPageProps) {
  const { slug } = await params;
  const entry = findEntry(slug);

  if (!entry) notFound();

  const related = relatedEntries(entry).slice(0, 8);
  const neighbors = timelineNeighbors(entry);
  const peers = stylePeers(entry).slice(0, 4);
  const compareEntries = comparisonEntries(entry);
  const accent = styleColor(entry.style_sector);
  const location = [entry.city, entry.country].filter(Boolean).join(', ');
  const jsonLd = entryJsonLd(entry);
  const yearLabel = formatYear(entry.year_start);
  const archiveScore = archiveLeseniness(entry);
  const publicModelUrl = publicModelPreviewUrl(entry);
  const heroImage = primaryMediaUrl(entry);
  const visualProfile = entryVisualProfile(entry);
  const displayOneSentence = prettifyGermanText(entry.one_sentence || entry.short_description);
  const displayFullDescription = prettifyGermanText(entry.full_description);

  return (
    <main
      className={`entry-page entry-page-${entry.slug} min-h-screen overflow-x-hidden bg-[#050505] text-[#f7f7f4]`}
      style={{
        '--entry-accent': accent,
        '--entry-material-a': visualProfile.materialColors[0],
        '--entry-material-b': visualProfile.materialColors[1],
        '--entry-material-c': visualProfile.materialColors[2]
      } as CSSProperties}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProjectSearch entries={allEntries} currentSlug={entry.slug} />
      <div className="entry-cosmos-field" aria-hidden="true">
        {heroImage ? <span className="entry-object-backdrop" style={{ backgroundImage: `url(${heroImage})` }} /> : null}
        <span className="entry-ring entry-ring-a" />
        <span className="entry-ring entry-ring-b" />
        <span className="entry-ring entry-ring-c" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-white/12 pb-4">
          <Link href="/" className="entry-link text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f7f7f4]/78">
            Architektur Kosmos
          </Link>
          <Link href="/atlas/?return=kosmodata" className="entry-link border border-white/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#d7d7d0]">
            Zurück zu KosmoData
          </Link>
        </header>

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1.08fr)_360px] lg:py-14">
          <div>
            <div className="mb-6 grid max-w-xl grid-cols-3 border border-white/12 bg-[#071315]/45 text-center">
              <EntryStat label="Zeit" value={yearLabel} />
              <EntryStat label="Ebene" value={entry.entry_type.replace(/_/g, ' ')} />
              <EntryStat label="Netzwerk" value={`${related.length} Links`} />
            </div>
            <div className="mb-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-[#b8b8b2]">
              <span className="border border-white/15 px-2.5 py-1">{yearLabel}</span>
              <span className="border border-white/15 px-2.5 py-1">{entry.entry_type.replace(/_/g, ' ')}</span>
              <span className="border px-2.5 py-1" style={{ borderColor: accent, color: accent }}>{entry.style_sector.replace(/_/g, ' ')}</span>
              {entry.database_profile ? <span className="border px-2.5 py-1" style={{ borderColor: accent, color: accent }}>Datenbank Pilot</span> : null}
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-normal text-[#f7f7f4] sm:text-6xl lg:text-7xl">
              {entry.title}
            </h1>
            <div className="mt-5 max-w-3xl text-sm uppercase tracking-[0.12em] text-[#b8b8b2]">
              {entry.authors.join(', ') || 'unbekannte Autorschaft'}{location ? ` / ${location}` : ''}
            </div>
            <p className="entry-text-reactive entry-text-hero mt-8 max-w-3xl text-xl leading-relaxed text-[#f7f7f4] sm:text-2xl">
              {displayOneSentence}
            </p>
            <p className="entry-text-reactive entry-text-body mt-7 max-w-3xl text-base leading-8 text-[#cfcfca]">
              {displayFullDescription}
            </p>
          </div>

          <ArchiveStatusPanel entry={entry} relatedCount={related.length} archiveScore={archiveScore} accent={accent} />
        </section>

        <ModelAnalysisSection entry={entry} modelUrl={publicModelUrl} accent={accent} />

        {entry.architecture_text ? <ArchitectureTextSection entry={entry} accent={accent} /> : null}

        <ObjectIdentityPanel entry={entry} profile={visualProfile} accent={accent} />

        <section className="entry-study-grid grid gap-4 border-t border-white/12 py-8 lg:grid-cols-3">
          <StudyCard
            title="Lesen"
            label="Lernimpuls"
            body={studyPrompt(entry)}
            accent={accent}
          />
          <StudyCard
            title="Vergleichen"
            label={entry.style_sector.replace(/_/g, ' ')}
            body={peers.length ? peers.map((peer) => peer.title).join(' / ') : 'Noch keine nahen Vergleichseintraege.'}
            accent={accent}
          />
          <StudyCard
            title="Archiv"
            label={`${archiveScore}% strukturiert`}
            body={archiveSummary(entry)}
            accent={accent}
          />
        </section>

        <section id="media-gallery" className="entry-media-gallery border-t border-white/12 py-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>Objektmedien</div>
              <h2 className="mt-2 text-3xl text-[#f7f7f4]">Bilder, Plan und Schnitt</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#b8b8b2]">
              Die vier Slots werden als lesbare Projektgrundlage gezeigt: Atmosphäre, Raum, Grundrisslogik und Schnittsequenz.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {entry.media.map((media) => (
              <MediaCard key={media.type} media={media} entry={entry} profile={visualProfile} accent={accent} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 border-t border-white/12 py-8 lg:grid-cols-3">
          <InfoBlock title="Themen" items={entry.themes} accent={accent} />
          <InfoBlock title="Quellenpfad" items={sourceItems(entry)} accent={accent} />
          <InfoBlock title="Datenbank Tags" items={entry.database_tags ?? []} accent={accent} empty="Noch keine Datenbank-Tags" />
        </section>

        {entry.analysis_layers?.length || entry.analysis_observations?.length ? (
          <section className="grid gap-4 border-t border-white/12 py-8 lg:grid-cols-3">
            <AnalysisCard
              title="Tragwerk"
              accent={accent}
              items={analysisItems(entry, ['structure'])}
              empty="Noch kein Tragwerkslayer."
            />
            <AnalysisCard
              title="Material"
              accent={accent}
              items={analysisItems(entry, ['material_system', 'material_tag', 'roof_form'])}
              empty="Noch kein Materiallayer."
            />
            <AnalysisCard
              title="Tektonik"
              accent={accent}
              items={analysisItems(entry, ['tectonics', 'circulation', 'source_reconstruction'])}
              empty="Noch kein Tektoniklayer."
            />
          </section>
        ) : null}

        {entry.ingestion_status || entry.model_packages?.length || entry.splat_assets?.length || entry.analysis_observations?.length ? (
          <section className="grid gap-6 border-t border-white/12 py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <article className="entry-study-card border border-white/14 bg-[#071315]/55 p-5">
              <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>KI-Referenzpilot</div>
              <h2 className="mt-3 text-2xl text-[#f7f7f4]">Erfassung, Modell und Analyse-Pipeline</h2>
              <div className="mt-5 grid gap-3 text-sm leading-6 text-[#cfcfca] sm:grid-cols-2">
                {entry.ingestion_status ? (
                  <>
                    <EntryMeta label="Wurmloch-Status" value={entry.ingestion_status.stage.replace(/_/g, ' ')} />
                    <EntryMeta label="Quellen" value={entry.ingestion_status.source_status.replace(/_/g, ' ')} />
                    <EntryMeta label="Assets" value={entry.ingestion_status.asset_status.replace(/_/g, ' ')} />
                    <EntryMeta label="Modelle" value={entry.ingestion_status.model_status.replace(/_/g, ' ')} />
                  </>
                ) : null}
              </div>
              {entry.model_packages?.length ? (
                <div className="mt-6">
                  <h3 className="text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>Modellpakete</h3>
                  <div className="mt-3 grid gap-3">
                    {entry.model_packages.map((modelPackage) => (
                      <div key={modelPackage.package_type} className="border border-white/10 bg-[#050505]/45 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm text-[#f7f7f4]">{modelPackage.package_type.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: accent }}>{modelPackage.status.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-[#b8b8b2]">{prettifyGermanText(modelPackage.notes ?? modelPackage.planned_paths[0])}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>

            <div className="grid gap-6">
              {entry.splat_assets?.length ? (
                <article className="entry-study-card border border-white/14 bg-[#071315]/55 p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>Gaussian-Splat-Ebene</div>
                  {entry.splat_assets.map((splat) => (
                    <div key={splat.r2_key} className="mt-3">
                      <h2 className="text-xl text-[#f7f7f4]">{splat.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[#b8b8b2]">{prettifyGermanText(splat.use_case ?? splat.source_basis)}</p>
                      <p className="mt-3 break-words text-[10px] uppercase tracking-[0.12em] text-[#8d8d87]">{splat.r2_key}</p>
                    </div>
                  ))}
                </article>
              ) : null}

              {entry.analysis_observations?.length ? (
                <InfoBlock
                  title="Analysebeobachtungen"
                  items={entry.analysis_observations.map((observation) => {
                    const confidence = typeof observation.confidence_score === 'number' ? ` ${Math.round(observation.confidence_score * 100)}%` : '';
                    return `${observation.analysis_type}: ${observation.label}${confidence}`;
                  })}
                  accent={accent}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {entry.asset_candidates?.length ? (
          <section className="border-t border-white/12 py-8">
            <InfoBlock
              title="Asset-Kandidaten"
              items={entry.asset_candidates.map((asset) => `${asset.kind}: ${asset.title} / ${asset.rights_status}${asset.public_display_allowed ? ' / anzeigebereit' : ' / Prüfung vor Veröffentlichung'}`)}
              accent={accent}
            />
          </section>
        ) : null}

        {compareEntries.length ? (
          <section className="border-t border-white/12 py-8">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>Vergleichen mit</h2>
            <div className="grid gap-3 lg:grid-cols-3">
              {compareEntries.map((candidate) => (
                <Link key={candidate.id} href={`/atlas/${candidate.slug}/`} className="entry-link entry-study-card border border-white/14 bg-[#071315]/55 p-4">
                  <span className="block text-[10px] uppercase tracking-[0.16em]" style={{ color: accent }}>{candidate.year_start} / {candidate.authors[0] ?? 'unbekannt'}</span>
                  <span className="mt-2 block text-xl text-[#f7f7f4]">{candidate.title}</span>
                  <span className="mt-3 block text-sm leading-6 text-[#b8b8b2]">{prettifyGermanText(comparisonAxis(entry, candidate))}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="border-t border-white/12 py-8">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>Relationen</h2>
          {related.length ? (
            <div className="entry-relation-network grid gap-3 sm:grid-cols-2">
              {related.map(({ relation, entry: relatedEntry }, index) => (
                <Link key={relation.id} href={`/atlas/${relatedEntry.slug}/`} className="entry-link entry-relation-card border border-white/14 bg-[#071315]/55 p-4" style={{ '--relation-index': index } as CSSProperties}>
                  <div className="flex items-start gap-3">
                    <span className="entry-relation-node mt-1" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-[10px] uppercase tracking-[0.16em]" style={{ color: accent }}>{relation.relation_type.replace(/_/g, ' ')}</span>
                      <span className="mt-2 block text-lg text-[#f7f7f4]">{relatedEntry.title}</span>
                      <span className="mt-2 block text-sm leading-6 text-[#b8b8b2]">{prettifyGermanText(relation.description)}</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#b8b8b2]">Noch keine Relationen angelegt.</p>
          )}
        </section>

        <nav className="entry-timeline-nav grid gap-3 border-t border-white/12 py-8 sm:grid-cols-2" aria-label="Chronologische Eintragsnavigation">
          {neighbors.previous ? (
            <Link href={`/atlas/${neighbors.previous.slug}/`} className="entry-link entry-timeline-link border border-white/14 bg-[#071315]/55 p-4">
              <span className="block text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>Früher</span>
              <span className="mt-2 block text-xl text-[#f7f7f4]">{neighbors.previous.title}</span>
              <span className="mt-2 block text-sm text-[#b8b8b2]">{formatYear(neighbors.previous.year_start)}</span>
            </Link>
          ) : (
            <div className="entry-timeline-link border border-white/10 bg-[#071315]/25 p-4 text-[#8d8d87]">Anfang des aktuellen Archiv-Ausschnitts</div>
          )}
          {neighbors.next ? (
            <Link href={`/atlas/${neighbors.next.slug}/`} className="entry-link entry-timeline-link border border-white/14 bg-[#071315]/55 p-4 text-right">
              <span className="block text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>Später</span>
              <span className="mt-2 block text-xl text-[#f7f7f4]">{neighbors.next.title}</span>
              <span className="mt-2 block text-sm text-[#b8b8b2]">{formatYear(neighbors.next.year_start)}</span>
            </Link>
          ) : (
            <div className="entry-timeline-link border border-white/10 bg-[#071315]/25 p-4 text-right text-[#8d8d87]">Neuestes Objekt im aktuellen Archiv-Ausschnitt</div>
          )}
        </nav>
      </div>
    </main>
  );
}

function EntryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-white/10 px-3 py-3 last:border-r-0">
      <div className="text-[9px] uppercase tracking-[0.18em] text-[#8d8d87]">{label}</div>
      <div className="mt-1 truncate text-sm text-[#f7f7f4]">{value}</div>
    </div>
  );
}

function findEntry(slug: string) {
  return allEntries.find((entry) => entry.slug === slug);
}

function relatedEntries(entry: Entry) {
  return allRelationen
    .filter((relation) => relation.source_entry_id === entry.id || relation.target_entry_id === entry.id)
    .map((relation) => {
      const relatedId = relation.source_entry_id === entry.id ? relation.target_entry_id : relation.source_entry_id;
      const relatedEntry = allEntries.find((candidate) => candidate.id === relatedId);
      return relatedEntry ? { relation, entry: relatedEntry } : null;
    })
    .filter((item): item is { relation: EntryRelation; entry: Entry } => Boolean(item));
}

function timelineNeighbors(entry: Entry) {
  const sorted = [...allEntries].sort((a, b) => {
    if (a.year_start !== b.year_start) return a.year_start - b.year_start;
    return a.title.localeCompare(b.title);
  });
  const index = sorted.findIndex((candidate) => candidate.id === entry.id);

  return {
    previous: index > 0 ? sorted[index - 1] : null,
    next: index >= 0 && index < sorted.length - 1 ? sorted[index + 1] : null
  };
}

function stylePeers(entry: Entry) {
  return allEntries
    .filter((candidate) => candidate.id !== entry.id && candidate.style_sector === entry.style_sector)
    .sort((a, b) => Math.abs(a.year_start - entry.year_start) - Math.abs(b.year_start - entry.year_start));
}

function comparisonEntries(entry: Entry) {
  const modernVillaIds = ['villa-noailles', 'haus-tugendhat', 'villa-savoye'];
  const clusterIds = entry.database_tags?.some((tag) => tag.includes('modern-villa')) ? modernVillaIds : [];
  const relatedIds = relatedEntries(entry).map((item) => item.entry.id);
  const ids = [...clusterIds, ...relatedIds].filter((id) => id !== entry.id);
  return [...new Set(ids)]
    .map((id) => allEntries.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Entry => Boolean(candidate))
    .slice(0, 3);
}

function comparisonAxis(entry: Entry, candidate: Entry) {
  const pair = new Set([entry.id, candidate.id]);
  if (pair.has('villa-savoye') && pair.has('haus-tugendhat')) return 'Manifestdiagramm versus materialisierter freier Grundriss.';
  if (pair.has('villa-savoye') && pair.has('villa-noailles')) return 'Fünf-Punkte-Manifest versus Freizeit, Bewegung und Gartenkultur.';
  if (pair.has('haus-tugendhat') && pair.has('villa-noailles')) return 'Materialschirm-Häuslichkeit versus terrassierte Avantgarde-Lebensform.';
  return `Vergleiche ${entry.themes[0]?.replace(/[_:]/g, ' ') ?? 'Archivlogik'} mit ${candidate.themes[0]?.replace(/[_:]/g, ' ') ?? 'Archivlogik'}.`;
}

function EntryMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="entry-meta-row">
      <dt className="text-[10px] uppercase tracking-[0.16em] text-[#8d8d87]">{label}</dt>
      <dd className="mt-1 break-words text-[#f7f7f4]">{value}</dd>
    </div>
  );
}

function ArchiveStatusPanel({ entry, relatedCount, archiveScore, accent }: { entry: Entry; relatedCount: number; archiveScore: number; accent: string }) {
  const metrics = archiveStatusMetrics(entry, relatedCount);
  const strongest = [...metrics].sort((a, b) => b.value - a.value)[0];
  const weakest = [...metrics].sort((a, b) => a.value - b.value)[0];

  return (
    <aside className="entry-archive-panel entry-archive-status-panel border border-white/14 bg-[#071315]/70 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>Archivstatus</h2>
          <p className="mt-2 text-xs leading-5 text-[#b8b8b2]">Datenreife, Quellenlage und Modellpotenzial als interaktive Übersicht.</p>
        </div>
        <div className="entry-archive-score" style={{ borderColor: accent, color: accent }}>
          <span>{archiveScore}</span>
          <small>%</small>
        </div>
      </div>

      <ArchiveRadarChart metrics={metrics} accent={accent} />

      <div className="mt-4 space-y-2">
        {metrics.map((metric) => (
          <ArchiveProgressRow key={metric.id} metric={metric} accent={accent} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] leading-snug">
        <div className="entry-archive-insight border border-white/10 bg-[#050505]/45 p-2">
          <span className="block uppercase tracking-[0.16em] text-[#8d8d87]">Stark</span>
          <b className="mt-1 block text-[#f7f7f4]">{strongest.label}</b>
        </div>
        <div className="entry-archive-insight border border-white/10 bg-[#050505]/45 p-2">
          <span className="block uppercase tracking-[0.16em] text-[#8d8d87]">Nächster Schritt</span>
          <b className="mt-1 block text-[#f7f7f4]">{weakest.label}</b>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        <EntryMeta label="Quellen" value={entry.source_quality.replace(/_/g, ' ')} />
        <EntryMeta label="Kurs / Cluster" value={(entry.lecture_cluster ?? []).join(', ') || 'nicht zugeordnet'} />
        {entry.database_profile ? <EntryMeta label="Datenbank" value={`${entry.database_profile.status} / ${entry.database_profile.r2_prefix}`} /> : null}
      </dl>
    </aside>
  );
}

function ArchiveRadarChart({ metrics, accent }: { metrics: ArchiveStatusMetric[]; accent: string }) {
  const center = 92;
  const radius = 64;
  const polygon = radarPoints(metrics.map((metric) => metric.value), center, radius);
  const rings = [0.33, 0.66, 1];

  return (
    <div className="entry-archive-radar" style={{ '--radar-accent': accent } as CSSProperties}>
      <svg viewBox="0 0 184 184" role="img" aria-label="Spinnendiagramm der Archivqualitaet">
        {rings.map((ring) => (
          <polygon key={ring} points={radarPoints(metrics.map(() => ring * 100), center, radius)} className="entry-radar-ring" />
        ))}
        {metrics.map((metric, index) => {
          const point = radarPoint(index, metrics.length, center, radius);
          const labelPoint = radarPoint(index, metrics.length, center, radius + 18);
          return (
            <g key={metric.id}>
              <line x1={center} y1={center} x2={point.x} y2={point.y} className="entry-radar-axis" />
              <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle" className="entry-radar-label">
                {metric.shortLabel}
              </text>
            </g>
          );
        })}
        <polygon points={polygon} className="entry-radar-shape" />
        {metrics.map((metric, index) => {
          const point = radarPoint(index, metrics.length, center, radius * (metric.value / 100));
          return <circle key={metric.id} cx={point.x} cy={point.y} r="3.2" className="entry-radar-node" />;
        })}
      </svg>
    </div>
  );
}

function ArchiveProgressRow({ metric, accent }: { metric: ArchiveStatusMetric; accent: string }) {
  return (
    <div className="entry-archive-progress" style={{ '--progress-value': `${metric.value}%`, '--progress-accent': accent } as CSSProperties}>
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

function ModelAnalysisSection({ entry, modelUrl, accent }: { entry: Entry; modelUrl: string | null; accent: string }) {
  const hasModelOrAnalysis = Boolean(modelUrl || entry.model_assets?.length || entry.analysis_layers?.length || entry.analysis_observations?.length);
  if (!hasModelOrAnalysis) return null;

  const materialFilters = materialFilterItems(entry);
  const blenderLayers = blenderLayerItems(entry);
  const publicPreviewReady = Boolean(modelUrl);
  const plannedModelCount = (entry.model_assets?.length ?? 0) + (entry.model_3d?.parts?.length ?? 0);
  const modelStatusLabel = publicPreviewReady
    ? 'Öffentliches GLB-Preview vorhanden'
    : plannedModelCount > 0
      ? 'Modell-Layer geplant, GLB noch nicht öffentlich'
      : 'Modellaufbau offen';

  return (
    <section className="border-t border-white/12 py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: accent }}>3D-Referenzkern</div>
          <h2 className="mt-2 max-w-3xl text-3xl leading-tight text-[#f7f7f4] sm:text-4xl">
            Modell, Materialanalyse und Blender-Layer
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-[#b8b8b2]">
          Dieser Bereich ist der spätere Importkern: Geometrie, Materialfilter, Tragwerk, Tektonik und Quellenbasis sollen in Blender als eigene Ebenen ein- und ausgeblendet werden können.
        </p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="border border-white/14 bg-[#050505]/50 px-3 py-2 text-[10px] uppercase tracking-[0.14em]" style={{ color: accent }}>
          {modelStatusLabel}
        </span>
        <span className="border border-white/14 bg-[#050505]/50 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#b8b8b2]">
          {plannedModelCount} geplante Layer
        </span>
        <span className="border border-white/14 bg-[#050505]/50 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#b8b8b2]">
          Brain-Modellpipeline
        </span>
      </div>

      {modelUrl ? (
        <EntryModelViewer modelUrl={modelUrl} title={entry.title} accent={accent} />
      ) : (
        <article className="border border-white/14 bg-[#071315]/55 p-5">
          <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>Modellstatus: geplant</div>
          <h3 className="mt-3 text-2xl text-[#f7f7f4]">Noch kein öffentliches 3D-Modell</h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#b8b8b2]">
            Die Datenbank enthält hier Modell-Layer, R2-Zielpfade oder Analyseprofile, aber noch kein geprüftes GLB für den öffentlichen Viewer. Das Brain muss zuerst Quellenbasis, Plan-/Schnittlage, Layerstruktur und Rechte prüfen.
          </p>
        </article>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <InfoBlock
          title="Blender-Collections"
          items={blenderLayers}
          accent={accent}
          empty="Noch keine Modell-Collections geplant"
        />
        <InfoBlock
          title="Materialfilter"
          items={materialFilters}
          accent={accent}
          empty="Noch keine Materialfilter"
        />
        <InfoBlock
          title="Quellenbasis"
          items={modelSourceItems(entry)}
          accent={accent}
          empty="Noch keine Modell-Quellenbasis"
        />
      </div>
    </section>
  );
}

function ArchitectureTextSection({ entry, accent }: { entry: Entry; accent: string }) {
  const text = entry.architecture_text;
  if (!text) return null;
  const chapters = text.chapters.slice(0, 4);

  return (
    <section className="entry-architecture-text border-t border-white/12 py-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>Architektonische Lesart</div>
          <h2 className="mt-3 max-w-xl text-3xl leading-tight text-[#f7f7f4] sm:text-4xl">{prettifyGermanText(text.headline)}</h2>
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] uppercase tracking-[0.14em] text-[#8d8d87]">
            <span className="border border-white/14 px-2.5 py-1">{text.language ?? 'de'}</span>
            <span className="border border-white/14 px-2.5 py-1">{germanStatusLabel(text.review_status ?? 'draft_review')}</span>
          </div>
        </div>
        <div>
          <p className="entry-text-reactive entry-architecture-overview text-lg leading-8 text-[#e5e5df]">{prettifyGermanText(text.overview)}</p>
          <div className="mt-6 grid gap-3">
            {chapters.map((chapter) => (
              <article key={chapter.title} className="entry-architecture-chapter border border-white/12 bg-[#071315]/56 p-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>{prettifyGermanText(chapter.title)}</h3>
                <p className="mt-3 text-sm leading-7 text-[#cfcfca]">{prettifyGermanText(chapter.text)}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ObjectIdentityPanel({ entry, profile, accent }: { entry: Entry; profile: EntryVisualProfile; accent: string }) {
  return (
    <section className="entry-object-signature border-t border-white/12 py-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <article className="entry-material-board border border-white/14 bg-[#071315]/60 p-5">
          <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>Objekt-Signatur</div>
          <h2 className="mt-3 text-3xl leading-tight text-[#f7f7f4]">{profile.title}</h2>
          <p className="entry-text-reactive mt-4 text-sm leading-7 text-[#cfcfca]">{prettifyGermanText(profile.reading)}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {profile.materials.map((material, index) => (
              <div key={material} className="entry-material-chip border border-white/12 bg-[#050505]/45 p-3">
                <span className="entry-material-swatch" style={{ background: profile.materialColors[index % profile.materialColors.length] }} />
                <span className="mt-3 block text-[10px] uppercase tracking-[0.14em] text-[#d7d7d0]">{prettifyGermanText(material)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="entry-composition-board border border-white/14 bg-[#071315]/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>Material- und Kompositionsanalyse</div>
              <h2 className="mt-3 text-2xl text-[#f7f7f4]">{profile.compositionTitle}</h2>
            </div>
            <span className="border border-white/14 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#b8b8b2]">{entry.year_start}</span>
          </div>
          <div className={`entry-composition-diagram entry-composition-${profile.diagramType} mt-5`} aria-hidden="true">
            <span className="entry-composition-mass" />
            <span className="entry-composition-court" />
            <span className="entry-composition-core" />
            <span className="entry-composition-slope" />
            <span className="entry-composition-strata" />
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {profile.composition.map((item) => (
              <div key={item} className="entry-text-reactive border border-white/10 bg-[#050505]/42 p-3 text-sm leading-6 text-[#cfcfca]">
                {prettifyGermanText(item)}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function MediaCard({ media, entry, profile, accent }: { media: Entry['media'][number]; entry: Entry; profile: EntryVisualProfile; accent: string }) {
  const isDrawing = media.type === 'plan' || media.type === 'section';
  const mediaUrl = publicDisplayMediaUrl(media);

  return (
    <article className={`entry-media-card entry-media-card-${media.type} border border-white/14 bg-[#070707]`}>
      <div className="entry-media-surface">
        {mediaUrl ? (
          <MediaLightbox
            src={mediaUrl}
            label={media.label}
            type={media.type}
            credit={media.credit}
            isDrawing={isDrawing}
            accent={accent}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Static export serves mixed JPG/SVG archive assets directly. */}
            <img
              className={`entry-media-image ${isDrawing ? 'entry-media-image-drawing' : ''}`}
              src={mediaUrl}
              alt={media.label}
              loading="lazy"
            />
          </MediaLightbox>
        ) : (
          <div className={`entry-media-placeholder entry-media-${media.type} flex h-full items-center justify-center border border-white/10 text-center text-[11px] uppercase tracking-[0.14em] text-[#d7d7d0]`}>
            <ObjectMediaPlaceholder mediaType={media.type} entry={entry} profile={profile} />
          </div>
        )}
      </div>
      <div className="entry-media-caption">
        <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>
          <span>{germanMediaTypeLabel(media.type)}</span>
          <span className="text-[#8d8d87]">Slot {mediaSlotNumber(media.type)}</span>
        </div>
        <h3 className="mt-2 text-xl text-[#f7f7f4]">{media.label}</h3>
        <p className="mt-3 text-sm leading-6 text-[#b8b8b2]">{prettifyGermanText(media.placeholder)}</p>
        {media.credit ? <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[#8d8d87]">{media.credit}</p> : null}
      </div>
    </article>
  );
}

function ObjectMediaPlaceholder({ mediaType, entry, profile }: { mediaType: Entry['media'][number]['type']; entry: Entry; profile: EntryVisualProfile }) {
  const label = profile.slotLesenings[mediaType] ?? entry.title;

  return (
    <div className={`entry-object-media-diagram entry-object-media-${mediaType}`}>
      <span className="entry-object-media-frame" />
      <span className="entry-object-media-core" />
      <span className="entry-object-media-slope" />
      <span className="entry-object-media-strata" />
      <span className="entry-object-media-label">{prettifyGermanText(label)}</span>
    </div>
  );
}

function InfoBlock({ title, items, accent, empty = 'Keine Eintraege vorhanden' }: { title: string; items: string[]; accent: string; empty?: string }) {
  return (
    <div className="entry-info-block">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>{title}</h2>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className="entry-info-chip border border-white/14 bg-[#071315]/70 px-3 py-2 text-xs uppercase tracking-[0.11em] text-[#d7d7d0]">
              {prettifyGermanText(item.replace(/[_:]/g, ' '))}
            </span>
          ))}
        </div>
      ) : (
        <p className="entry-text-reactive text-sm text-[#b8b8b2]">{prettifyGermanText(empty)}</p>
      )}
    </div>
  );
}

function StudyCard({ title, label, body, accent }: { title: string; label: string; body: string; accent: string }) {
  return (
    <article className="entry-study-card border border-white/14 bg-[#071315]/55 p-4">
      <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>{title}</div>
      <div className="mt-3 text-xl text-[#f7f7f4]">{label}</div>
      <p className="mt-3 text-sm leading-6 text-[#b8b8b2]">{prettifyGermanText(body)}</p>
    </article>
  );
}

function AnalysisCard({ title, items, accent, empty }: { title: string; items: string[]; accent: string; empty: string }) {
  return (
    <article className="entry-study-card border border-white/14 bg-[#071315]/55 p-4">
      <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>{title}</div>
      {items.length ? (
        <div className="mt-3 space-y-2">
          {items.slice(0, 5).map((item) => (
            <div key={item} className="entry-text-reactive border border-white/10 bg-[#050505]/45 p-2 text-sm leading-6 text-[#d7d7d0]">
              {prettifyGermanText(item.replace(/[_:]/g, ' '))}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[#b8b8b2]">{prettifyGermanText(empty)}</p>
      )}
    </article>
  );
}

type EntryVisualProfile = {
  title: string;
  reading: string;
  materials: string[];
  materialColors: [string, string, string];
  compositionTitle: string;
  composition: string[];
  diagramType: 'monastery-plinth' | 'free-plan' | 'generic';
  slotLesenings: Record<Entry['media'][number]['type'], string>;
};

function entryVisualProfile(entry: Entry): EntryVisualProfile {
  if (entry.slug === 'alterszentrum-kloster-ingenbohl') {
    return {
      title: 'Mineralischer Klosterhügel, neue Pflegeordnung',
      reading: 'Das Objektblatt folgt der Materiallogik des Projekts: ein ruhiger, erdiger Grundton aus Klosterhügel und Bestand, darüber präzise grüne Akzente für Garten, Hof und Heilpflege. Die Oberfläche liest sich weniger als Bildcollage, mehr als tektonische Schichtung aus Sockel, Kern, Fassade und Hof.',
      materials: ['Trasskalk / mineralisch', 'Holz lasiert', 'Betontragwerk'],
      materialColors: ['#9b9b83', '#5f7655', '#6f746d'],
      compositionTitle: 'Quadratischer Körper, Hof, Hangkante und vertikale Fassadenstrata',
      composition: [
        'Fast quadratischer Baukörper mit eingeschnittenem Hof als ruhigem Zentrum.',
        'Stahlbetonskelett und aussteifender Kern als tragende Grundstruktur.',
        'Vertikale Fassadengliederung und Trasskalkelemente erzeugen eine mineralische Tiefe.',
        'Hangkante, Garten und Klosterbestand werden als zusammenhängender Campus gelesen.'
      ],
      diagramType: 'monastery-plinth',
      slotLesenings: {
        exterior: 'Hangkante / Klosterhügel / vertikale Fassade',
        interior: 'Pflegezimmer / mineralische Ruhe / Holz und Putz',
        section: 'Sockel, Hof, Kern und Terrassen',
        plan: 'Quadrat, Hof, Cluster und Erschliessung'
      }
    };
  }

  if (entry.slug === 'villa-savoye') {
    return {
      title: 'Weisser Apparat, freie Bewegung',
      reading: 'Das Objektblatt betont die abstrakte Modernität: heller Körper, Pilotis, Rampe, Dachgarten und horizontale Fenster werden als räumliche Maschine lesbar.',
      materials: ['Putz / Weiss', 'Glasband', 'Beton / Pilotis'],
      materialColors: ['#e8e5d7', '#83b7bd', '#8d9189'],
      compositionTitle: 'Freier Grundriss, Rampe und Dachgarten',
      composition: ['Pilotis lösen den Körper vom Boden.', 'Rampe verbindet Bewegung und Blick.', 'Bandfenster schneiden die Fassade horizontal.', 'Dachgarten ersetzt den verlorenen Boden.'],
      diagramType: 'free-plan',
      slotLesenings: {
        exterior: 'Weisser Körper auf Pilotis',
        interior: 'Rampe und freier Raum',
        section: 'Promenade architecturale',
        plan: 'Freier Grundriss'
      }
    };
  }

  return {
    title: 'Objektlogik aus Quellen, Material und Filter',
    reading: 'Dieses Datenblatt verwendet die vorhandenen Quellen, Themen und Analysefelder, um eine objektspezifische Oberfläche aufzubauen. Mit echten Medien kann die visuelle Identität später präziser werden.',
    materials: entry.themes.slice(0, 3).length ? entry.themes.slice(0, 3) : ['Quelle', 'Typ', 'Kontext'],
    materialColors: ['#6d7674', '#8f8b75', '#6f677e'],
    compositionTitle: 'Kompositionslesung',
    composition: [
      entry.short_description,
      `Typologie: ${entry.entry_type.replace(/_/g, ' ')}`,
      `Stilsektor: ${entry.style_sector.replace(/_/g, ' ')}`,
      `Filter: ${entry.themes.slice(0, 3).join(', ') || 'Prüfung offen'}`
    ],
    diagramType: 'generic',
    slotLesenings: {
      exterior: 'Aussenwirkung und Kontext',
      interior: 'Innenraum und Atmosphäre',
      section: 'Schnitt und Tragwerk',
      plan: 'Grundriss und Ordnung'
    }
  };
}

function sourceItems(entry: Entry) {
  return [
    ...(entry.source_documents ?? []),
    ...(entry.source_url ? [entry.source_url] : []),
    ...(entry.source_assets?.length ? [`${entry.source_assets.length} Quellenassets`] : [])
  ];
}

function blenderLayerItems(entry: Entry) {
  const modelLayers = (entry.model_assets ?? []).map((model) => `${germanTechnicalLabel(model.model_type)} / ${germanStatusLabel(model.review_status)}`);
  const analysisLayers = (entry.analysis_layers ?? []).map((analysis) => `Analyse ${germanTechnicalLabel(analysis.analysis_type)} / ${germanStatusLabel(analysis.review_status)}`);

  if (modelLayers.length || analysisLayers.length) {
    return [...modelLayers, ...analysisLayers].slice(0, 10);
  }

  return [
    'Site-Kontext / geplant',
    'Massenmodell / geplant',
    'Tragwerk / geplant',
    'Hülle / geplant',
    'Zirkulation / geplant',
    'Tektonik / geplant'
  ];
}

function materialFilterItems(entry: Entry) {
  const tagMaterials = (entry.database_tags ?? [])
    .filter((tag) => tag.startsWith('material:') || tag.startsWith('structure:'))
    .map((tag) => tag.replace(/[_:]/g, ' '));
  const analysisMaterials = (entry.analysis_layers ?? [])
    .filter((layer) => layer.analysis_type === 'material_system' || layer.analysis_type === 'filter_classification')
    .flatMap((layer) => extractAnalysisValues(layer.data, ['materials', 'material_filters', 'structural_filters']));
  const observationMaterials = (entry.analysis_observations ?? [])
    .filter((observation) => observation.analysis_type === 'material_tag' || observation.analysis_type === 'structure')
    .map((observation) => observation.label);

  return [...new Set([...tagMaterials, ...analysisMaterials, ...observationMaterials])].slice(0, 12);
}

function modelSourceItems(entry: Entry) {
  const modelSources = (entry.model_assets ?? []).map((model) => `${model.model_type.replace(/_/g, ' ')}: ${model.source_basis}`);
  if (modelSources.length) return modelSources.slice(0, 6);
  return [
    ...(entry.source_documents ?? []).slice(0, 3),
    entry.source_url ?? 'rechtegeprüfte Pläne, Schnitte und Bilder nötig'
  ].filter(Boolean);
}

function extractAnalysisValues(data: Record<string, unknown> | undefined, keys: string[]) {
  if (!data) return [];
  return keys.flatMap((key) => {
    const value = data[key];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
    return typeof value === 'string' ? [value] : [];
  });
}

function analysisItems(entry: Entry, types: string[]) {
  const layerItems = (entry.analysis_layers ?? [])
    .filter((layer) => types.includes(layer.analysis_type))
    .map((layer) => `${layer.analysis_type}: ${layer.summary}`);
  const observationItems = (entry.analysis_observations ?? [])
    .filter((observation) => types.includes(observation.analysis_type))
    .map((observation) => {
      const confidence = typeof observation.confidence_score === 'number' ? ` (${Math.round(observation.confidence_score * 100)}%)` : '';
      return `${observation.label}${confidence}`;
    });
  return [...layerItems, ...observationItems];
}

function publicModelPreviewUrl(entry: Entry) {
  return publicModels.find((model) => model.slug === entry.slug)?.url ?? null;
}

function primaryMediaUrl(entry: Entry) {
  return primaryPublicMediaUrl(entry);
}

function mediaSlotNumber(type: Entry['media'][number]['type']) {
  const order: Record<Entry['media'][number]['type'], string> = {
    exterior: '01',
    interior: '02',
    section: '03',
    plan: '04'
  };
  return order[type];
}

function germanMediaTypeLabel(type: Entry['media'][number]['type']) {
  const labels: Record<Entry['media'][number]['type'], string> = {
    exterior: 'Außen',
    interior: 'Innen',
    section: 'Schnitt',
    plan: 'Plan'
  };
  return labels[type];
}

function germanTechnicalLabel(value: string) {
  const labels: Record<string, string> = {
    analysis: 'Analyse',
    circulation: 'Zirkulation',
    envelope: 'Hülle',
    facade: 'Fassade',
    filter_classification: 'Filterklassifikation',
    full: 'Vollmodell',
    interior: 'Innenraum',
    low: 'Low-Poly-Modell',
    mass: 'Massenmodell',
    material_system: 'Materialsystem',
    material_tag: 'Materialtag',
    model: 'Modell',
    roof_form: 'Dachform',
    site: 'Site',
    source_reconstruction: 'Quellenrekonstruktion',
    structure: 'Tragwerk',
    tectonic: 'Tektonik',
    tectonics: 'Tektonik',
    typology: 'Typologie'
  };
  return labels[value] ?? value.replace(/_/g, ' ');
}

function germanStatusLabel(value: string) {
  const labels: Record<string, string> = {
    draft: 'Entwurf',
    draft_review: 'Entwurf in Prüfung',
    generated_needs_review: 'generiert, Prüfung nötig',
    needs_review: 'Prüfung nötig',
    needs_source: 'Quelle nötig',
    needs_source_review: 'Quellenprüfung nötig',
    needs_sources: 'Quellen nötig',
    planned: 'geplant',
    published: 'veröffentlicht',
    reviewed: 'geprüft',
    review: 'Prüfung',
    verified: 'verifiziert'
  };
  return labels[value] ?? value.replace(/_/g, ' ');
}

function archiveStatusMetrics(entry: Entry, relatedCount: number): ArchiveStatusMetric[] {
  const sourceValue = Math.min(100, (entry.source_documents?.length ?? 0) * 20 + (entry.source_url ? 24 : 0) + (entry.source_candidates?.length ?? 0) * 8 + (entry.source_quality.includes('verified') ? 24 : 0));
  const mediaValue = Math.min(100, new Set(entry.media.map((media) => media.type)).size * 20 + entry.media.filter((media) => publicDisplayMediaUrl(media)).length * 5);
  const networkValue = Math.min(100, relatedCount * 17 + (entry.database_tags?.length ?? 0) * 2);
  const hasPublicModelPreview = Boolean(publicModelPreviewUrl(entry));
  const plannedModelLayers = (entry.model_assets?.length ?? 0) + (entry.model_3d?.parts?.length ?? 0);
  const modelValue = hasPublicModelPreview
    ? Math.min(100, 72 + plannedModelLayers * 4)
    : Math.min(58, plannedModelLayers * 9);
  const analysisValue = Math.min(100, (entry.analysis_layers?.length ?? 0) * 18 + (entry.analysis_observations?.length ?? 0) * 9);
  const textValue = Math.min(100, (entry.architecture_text?.chapters.length ?? 0) * 16 + (entry.full_description.length > 320 ? 28 : 12) + (entry.one_sentence.length > 40 ? 12 : 0));

  return [
    { id: 'sources', label: 'Quellenlage', shortLabel: 'Quelle', value: Math.round(sourceValue), hint: 'Nachweise, Quellenkandidaten und Verifizierungsgrad.' },
    { id: 'media', label: 'Medien / Pläne', shortLabel: 'Medien', value: Math.round(mediaValue), hint: 'Außen, Innen, Schnitt, Grundriss und öffentliche Medien.' },
    { id: 'network', label: 'Wissensnetz', shortLabel: 'Netz', value: Math.round(networkValue), hint: 'Relationen, Tags und thematische Anschlussfähigkeit.' },
    { id: 'model', label: '3D-Modell', shortLabel: '3D', value: Math.round(modelValue), hint: hasPublicModelPreview ? 'Öffentliches GLB-Preview plus geplante Blender-Layer.' : 'Geplante Modell-Layer; noch kein öffentliches GLB.' },
    { id: 'analysis', label: 'Analyse', shortLabel: 'Analyse', value: Math.round(analysisValue), hint: 'Material, Tragwerk, Tektonik und Beobachtungslayer.' },
    { id: 'text', label: 'Texttiefe', shortLabel: 'Text', value: Math.round(textValue), hint: 'Architekturtext, Kapitelstruktur und beschreibende Dichte.' }
  ];
}

function radarPoints(values: number[], center: number, radius: number) {
  return values.map((value, index) => {
    const point = radarPoint(index, values.length, center, radius * (Math.max(0, Math.min(100, value)) / 100));
    return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }).join(' ');
}

function radarPoint(index: number, total: number, center: number, radius: number) {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius
  };
}

function studyPrompt(entry: Entry) {
  const type = entry.entry_type.replace(/_/g, ' ');
  const theme = entry.themes[0]?.replace(/[_:]/g, ' ') ?? 'Architekturgeschichte';
  return `Lies diesen ${type} über ${theme}: Wo liegt die formale Logik, was ist technisch oder tektonisch, und was gehört zum historischen Kontext?`;
}

function archiveLeseniness(entry: Entry) {
  const mediaScore = Math.min(entry.media.length, 4) * 12;
  const relationScore = Math.min(relatedEntries(entry).length, 4) * 6;
  const textScore = entry.full_description.length > 220 ? 18 : 8;
  const databaseScore = entry.database_profile ? 16 : 0;
  const analysisScore = Math.min(entry.analysis_layers?.length ?? 0, 4) * 3;
  return Math.min(100, mediaScore + relationScore + textScore + databaseScore + analysisScore);
}

function archiveSummary(entry: Entry) {
  const parts = [
    `${entry.media.length}/4 Medienslots`,
    `${relatedEntries(entry).length} Relationen`,
    entry.database_profile ? `${entry.database_profile.model_count} Modell-Layer` : '3D-Modell offen'
  ];
  return parts.join(' / ');
}

function entryJsonLd(entry: Entry) {
  const location = [entry.city, entry.country].filter(Boolean).join(', ');
  return {
    '@context': 'https://schema.org',
    '@type': entry.entry_type === 'text' || entry.entry_type === 'theory' ? 'CreativeWork' : 'Place',
    name: entry.title,
    description: prettifyGermanText(entry.one_sentence || entry.short_description),
    url: `${siteUrl}/atlas/${entry.slug}/`,
    creator: entry.authors,
    location: location || undefined,
    dateCreated: entry.year_start > 0 ? String(entry.year_start) : undefined,
    keywords: [...entry.themes, entry.style_sector, entry.entry_type].join(', ')
  };
}

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} v. Chr.` : `${year}`;
}

function styleColor(styleSector: StyleSectorId) {
  return styleSectorColors[styleSector];
}
