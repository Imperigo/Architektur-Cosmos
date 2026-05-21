import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { EntryModelViewer } from '@/components/atlas/EntryModelViewer';
import { MediaLightbox } from '@/components/atlas/MediaLightbox';
import { ProjectSearch } from '@/components/atlas/ProjectSearch';
import entries from '@/data/mock-entries.json';
import relations from '@/data/relations.json';
import { primaryPublicMediaUrl, publicDisplayMediaUrl } from '@/lib/media';
import type { Entry, EntryRelation, StyleSectorId } from '@/lib/types';

const allEntries = entries as Entry[];
const allRelations = relations as EntryRelation[];
const siteUrl = 'https://architekturkosmos.ch';

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
      title: 'Entry not found | Architektur Kosmos'
    };
  }

  const title = `${entry.title} | Architektur Kosmos`;
  const description = entry.one_sentence || entry.short_description;
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
  const archiveScore = archiveReadiness(entry);
  const publicModelUrl = publicModelPreviewUrl(entry);
  const heroImage = primaryMediaUrl(entry);
  const visualProfile = entryVisualProfile(entry);

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
          <Link href="/atlas/" className="entry-link border border-white/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#d7d7d0]">
            Back to Atlas
          </Link>
        </header>

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1.08fr)_360px] lg:py-14">
          <div>
            <div className="mb-6 grid max-w-xl grid-cols-3 border border-white/12 bg-[#071315]/45 text-center">
              <EntryStat label="Time" value={yearLabel} />
              <EntryStat label="Layer" value={entry.entry_type.replace(/_/g, ' ')} />
              <EntryStat label="Network" value={`${related.length} links`} />
            </div>
            <div className="mb-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-[#b8b8b2]">
              <span className="border border-white/15 px-2.5 py-1">{yearLabel}</span>
              <span className="border border-white/15 px-2.5 py-1">{entry.entry_type.replace(/_/g, ' ')}</span>
              <span className="border px-2.5 py-1" style={{ borderColor: accent, color: accent }}>{entry.style_sector.replace(/_/g, ' ')}</span>
              {entry.database_profile ? <span className="border px-2.5 py-1" style={{ borderColor: accent, color: accent }}>Database Pilot</span> : null}
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-normal text-[#f7f7f4] sm:text-6xl lg:text-7xl">
              {entry.title}
            </h1>
            <div className="mt-5 max-w-3xl text-sm uppercase tracking-[0.12em] text-[#b8b8b2]">
              {entry.authors.join(', ') || 'Unknown author'}{location ? ` / ${location}` : ''}
            </div>
            <p className="mt-8 max-w-3xl text-xl leading-relaxed text-[#f7f7f4] sm:text-2xl">
              {entry.one_sentence || entry.short_description}
            </p>
            <p className="mt-7 max-w-3xl text-base leading-8 text-[#cfcfca]">
              {entry.full_description}
            </p>
          </div>

          <aside className="entry-archive-panel border border-white/14 bg-[#071315]/70 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>Archive Status</h2>
            <div className="my-5 h-28 border border-white/10 bg-[#050505]/55 p-3">
              <div className="entry-mini-orbit mx-auto h-full max-w-[210px]" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <EntryMeta label="Source quality" value={entry.source_quality.replace(/_/g, ' ')} />
              <EntryMeta label="Lecture cluster" value={(entry.lecture_cluster ?? []).join(', ') || 'not assigned'} />
              <EntryMeta label="Media slots" value={`${entry.media.length}`} />
              <EntryMeta label="Relations" value={`${related.length}`} />
              <EntryMeta label="Archive readiness" value={`${archiveScore}%`} />
              {entry.database_profile ? (
                <>
                  <EntryMeta label="Database" value={entry.database_profile.status} />
                  <EntryMeta label="3D layers" value={`${entry.database_profile.model_count}`} />
                  <EntryMeta label="Analysis layers" value={`${entry.database_profile.analysis_count}`} />
                  <EntryMeta label="R2 prefix" value={entry.database_profile.r2_prefix} />
                </>
              ) : null}
            </dl>
          </aside>
        </section>

        <ModelAnalysisSection entry={entry} modelUrl={publicModelUrl} accent={accent} />

        {entry.architecture_text ? <ArchitectureTextSection entry={entry} accent={accent} /> : null}

        <ObjectIdentityPanel entry={entry} profile={visualProfile} accent={accent} />

        <section className="entry-study-grid grid gap-4 border-t border-white/12 py-8 lg:grid-cols-3">
          <StudyCard
            title="Read"
            label="Learning prompt"
            body={studyPrompt(entry)}
            accent={accent}
          />
          <StudyCard
            title="Compare"
            label={entry.style_sector.replace(/_/g, ' ')}
            body={peers.length ? peers.map((peer) => peer.title).join(' / ') : 'No close comparison entries yet.'}
            accent={accent}
          />
          <StudyCard
            title="Archive"
            label={`${archiveScore}% structured`}
            body={archiveSummary(entry)}
            accent={accent}
          />
        </section>

        <section id="media-gallery" className="entry-media-gallery border-t border-white/12 py-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>Object Media</div>
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
          <InfoBlock title="Themes" items={entry.themes} accent={accent} />
          <InfoBlock title="Source Trail" items={sourceItems(entry)} accent={accent} />
          <InfoBlock title="Database Tags" items={entry.database_tags ?? []} accent={accent} empty="No database tags yet" />
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
              <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>AI Reference Pilot</div>
              <h2 className="mt-3 text-2xl text-[#f7f7f4]">Capture, model and analysis pipeline</h2>
              <div className="mt-5 grid gap-3 text-sm leading-6 text-[#cfcfca] sm:grid-cols-2">
                {entry.ingestion_status ? (
                  <>
                    <EntryMeta label="Wormhole status" value={entry.ingestion_status.stage.replace(/_/g, ' ')} />
                    <EntryMeta label="Sources" value={entry.ingestion_status.source_status.replace(/_/g, ' ')} />
                    <EntryMeta label="Assets" value={entry.ingestion_status.asset_status.replace(/_/g, ' ')} />
                    <EntryMeta label="Models" value={entry.ingestion_status.model_status.replace(/_/g, ' ')} />
                  </>
                ) : null}
              </div>
              {entry.model_packages?.length ? (
                <div className="mt-6">
                  <h3 className="text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>Model Packages</h3>
                  <div className="mt-3 grid gap-3">
                    {entry.model_packages.map((modelPackage) => (
                      <div key={modelPackage.package_type} className="border border-white/10 bg-[#050505]/45 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm text-[#f7f7f4]">{modelPackage.package_type.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: accent }}>{modelPackage.status.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-[#b8b8b2]">{modelPackage.notes ?? modelPackage.planned_paths[0]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>

            <div className="grid gap-6">
              {entry.splat_assets?.length ? (
                <article className="entry-study-card border border-white/14 bg-[#071315]/55 p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>Gaussian Splat Layer</div>
                  {entry.splat_assets.map((splat) => (
                    <div key={splat.r2_key} className="mt-3">
                      <h2 className="text-xl text-[#f7f7f4]">{splat.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[#b8b8b2]">{splat.use_case ?? splat.source_basis}</p>
                      <p className="mt-3 break-words text-[10px] uppercase tracking-[0.12em] text-[#8d8d87]">{splat.r2_key}</p>
                    </div>
                  ))}
                </article>
              ) : null}

              {entry.analysis_observations?.length ? (
                <InfoBlock
                  title="Analysis Observations"
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
              title="Asset Candidates"
              items={entry.asset_candidates.map((asset) => `${asset.kind}: ${asset.title} / ${asset.rights_status}${asset.public_display_allowed ? ' / display ready' : ' / review before publish'}`)}
              accent={accent}
            />
          </section>
        ) : null}

        {compareEntries.length ? (
          <section className="border-t border-white/12 py-8">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>Compare With</h2>
            <div className="grid gap-3 lg:grid-cols-3">
              {compareEntries.map((candidate) => (
                <Link key={candidate.id} href={`/atlas/${candidate.slug}/`} className="entry-link entry-study-card border border-white/14 bg-[#071315]/55 p-4">
                  <span className="block text-[10px] uppercase tracking-[0.16em]" style={{ color: accent }}>{candidate.year_start} / {candidate.authors[0] ?? 'unknown'}</span>
                  <span className="mt-2 block text-xl text-[#f7f7f4]">{candidate.title}</span>
                  <span className="mt-3 block text-sm leading-6 text-[#b8b8b2]">{comparisonAxis(entry, candidate)}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="border-t border-white/12 py-8">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>Relations</h2>
          {related.length ? (
            <div className="entry-relation-network grid gap-3 sm:grid-cols-2">
              {related.map(({ relation, entry: relatedEntry }, index) => (
                <Link key={relation.id} href={`/atlas/${relatedEntry.slug}/`} className="entry-link entry-relation-card border border-white/14 bg-[#071315]/55 p-4" style={{ '--relation-index': index } as CSSProperties}>
                  <div className="flex items-start gap-3">
                    <span className="entry-relation-node mt-1" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-[10px] uppercase tracking-[0.16em]" style={{ color: accent }}>{relation.relation_type.replace(/_/g, ' ')}</span>
                      <span className="mt-2 block text-lg text-[#f7f7f4]">{relatedEntry.title}</span>
                      <span className="mt-2 block text-sm leading-6 text-[#b8b8b2]">{relation.description}</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#b8b8b2]">No relations attached yet.</p>
          )}
        </section>

        <nav className="entry-timeline-nav grid gap-3 border-t border-white/12 py-8 sm:grid-cols-2" aria-label="Chronological entry navigation">
          {neighbors.previous ? (
            <Link href={`/atlas/${neighbors.previous.slug}/`} className="entry-link entry-timeline-link border border-white/14 bg-[#071315]/55 p-4">
              <span className="block text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>Earlier</span>
              <span className="mt-2 block text-xl text-[#f7f7f4]">{neighbors.previous.title}</span>
              <span className="mt-2 block text-sm text-[#b8b8b2]">{formatYear(neighbors.previous.year_start)}</span>
            </Link>
          ) : (
            <div className="entry-timeline-link border border-white/10 bg-[#071315]/25 p-4 text-[#8d8d87]">Beginning of current archive slice</div>
          )}
          {neighbors.next ? (
            <Link href={`/atlas/${neighbors.next.slug}/`} className="entry-link entry-timeline-link border border-white/14 bg-[#071315]/55 p-4 text-right">
              <span className="block text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>Later</span>
              <span className="mt-2 block text-xl text-[#f7f7f4]">{neighbors.next.title}</span>
              <span className="mt-2 block text-sm text-[#b8b8b2]">{formatYear(neighbors.next.year_start)}</span>
            </Link>
          ) : (
            <div className="entry-timeline-link border border-white/10 bg-[#071315]/25 p-4 text-right text-[#8d8d87]">Newest object in current archive slice</div>
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
  return allRelations
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
  if (pair.has('villa-savoye') && pair.has('haus-tugendhat')) return 'Manifest diagram versus material free-plan space.';
  if (pair.has('villa-savoye') && pair.has('villa-noailles')) return 'Five-points manifesto versus leisure, movement and garden culture.';
  if (pair.has('haus-tugendhat') && pair.has('villa-noailles')) return 'Material-screen domesticity versus terraced avant-garde lifestyle.';
  return `Compare ${entry.themes[0]?.replace(/[_:]/g, ' ') ?? 'archive logic'} with ${candidate.themes[0]?.replace(/[_:]/g, ' ') ?? 'archive logic'}.`;
}

function EntryMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.16em] text-[#8d8d87]">{label}</dt>
      <dd className="mt-1 break-words text-[#f7f7f4]">{value}</dd>
    </div>
  );
}

function ModelAnalysisSection({ entry, modelUrl, accent }: { entry: Entry; modelUrl: string | null; accent: string }) {
  const hasModelOrAnalysis = Boolean(modelUrl || entry.model_assets?.length || entry.analysis_layers?.length || entry.analysis_observations?.length);
  if (!hasModelOrAnalysis) return null;

  const materialFilters = materialFilterItems(entry);
  const blenderLayers = blenderLayerItems(entry);

  return (
    <section className="border-t border-white/12 py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: accent }}>3D Reference Core</div>
          <h2 className="mt-2 max-w-3xl text-3xl leading-tight text-[#f7f7f4] sm:text-4xl">
            Modell, Materialanalyse und Blender-Layer
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-[#b8b8b2]">
          Dieser Bereich ist der spätere Importkern: Geometrie, Materialfilter, Tragwerk, Tektonik und Quellenbasis sollen in Blender als eigene Ebenen ein- und ausgeblendet werden können.
        </p>
      </div>

      {modelUrl ? (
        <EntryModelViewer modelUrl={modelUrl} title={entry.title} accent={accent} />
      ) : (
        <article className="border border-white/14 bg-[#071315]/55 p-5">
          <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>Model pending</div>
          <h3 className="mt-3 text-2xl text-[#f7f7f4]">Noch kein öffentliches 3D-Modell</h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#b8b8b2]">
            Das Projekt bleibt als Analyse- und Quellenpilot aktiv, bis rights-reviewed Plan-, Schnitt- oder Modellgrundlagen vorhanden sind.
          </p>
        </article>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <InfoBlock
          title="Blender Collections"
          items={blenderLayers}
          accent={accent}
          empty="No model collections planned yet"
        />
        <InfoBlock
          title="Material Filters"
          items={materialFilters}
          accent={accent}
          empty="No material filters yet"
        />
        <InfoBlock
          title="Source Basis"
          items={modelSourceItems(entry)}
          accent={accent}
          empty="No model source basis yet"
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
          <h2 className="mt-3 max-w-xl text-3xl leading-tight text-[#f7f7f4] sm:text-4xl">{text.headline}</h2>
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] uppercase tracking-[0.14em] text-[#8d8d87]">
            <span className="border border-white/14 px-2.5 py-1">{text.language ?? 'de'}</span>
            <span className="border border-white/14 px-2.5 py-1">{text.review_status?.replace(/_/g, ' ') ?? 'draft review'}</span>
          </div>
        </div>
        <div>
          <p className="text-lg leading-8 text-[#e5e5df]">{text.overview}</p>
          <div className="mt-6 grid gap-3">
            {chapters.map((chapter) => (
              <article key={chapter.title} className="entry-architecture-chapter border border-white/12 bg-[#071315]/56 p-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>{chapter.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#cfcfca]">{chapter.text}</p>
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
          <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>Object Signature</div>
          <h2 className="mt-3 text-3xl leading-tight text-[#f7f7f4]">{profile.title}</h2>
          <p className="mt-4 text-sm leading-7 text-[#cfcfca]">{profile.reading}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {profile.materials.map((material, index) => (
              <div key={material} className="entry-material-chip border border-white/12 bg-[#050505]/45 p-3">
                <span className="entry-material-swatch" style={{ background: profile.materialColors[index % profile.materialColors.length] }} />
                <span className="mt-3 block text-[10px] uppercase tracking-[0.14em] text-[#d7d7d0]">{material}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="entry-composition-board border border-white/14 bg-[#071315]/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>Material + Composition Analysis</div>
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
              <div key={item} className="border border-white/10 bg-[#050505]/42 p-3 text-sm leading-6 text-[#cfcfca]">
                {item}
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
          <span>{media.type}</span>
          <span className="text-[#8d8d87]">slot {mediaSlotNumber(media.type)}</span>
        </div>
        <h3 className="mt-2 text-xl text-[#f7f7f4]">{media.label}</h3>
        <p className="mt-3 text-sm leading-6 text-[#b8b8b2]">{media.placeholder}</p>
        {media.credit ? <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[#8d8d87]">{media.credit}</p> : null}
      </div>
    </article>
  );
}

function ObjectMediaPlaceholder({ mediaType, entry, profile }: { mediaType: Entry['media'][number]['type']; entry: Entry; profile: EntryVisualProfile }) {
  const label = profile.slotReadings[mediaType] ?? entry.title;

  return (
    <div className={`entry-object-media-diagram entry-object-media-${mediaType}`}>
      <span className="entry-object-media-frame" />
      <span className="entry-object-media-core" />
      <span className="entry-object-media-slope" />
      <span className="entry-object-media-strata" />
      <span className="entry-object-media-label">{label}</span>
    </div>
  );
}

function InfoBlock({ title, items, accent, empty = 'No entries yet' }: { title: string; items: string[]; accent: string; empty?: string }) {
  return (
    <div>
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>{title}</h2>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className="border border-white/14 bg-[#071315]/70 px-3 py-2 text-xs uppercase tracking-[0.11em] text-[#d7d7d0]">
              {item.replace(/[_:]/g, ' ')}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#b8b8b2]">{empty}</p>
      )}
    </div>
  );
}

function StudyCard({ title, label, body, accent }: { title: string; label: string; body: string; accent: string }) {
  return (
    <article className="entry-study-card border border-white/14 bg-[#071315]/55 p-4">
      <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>{title}</div>
      <div className="mt-3 text-xl text-[#f7f7f4]">{label}</div>
      <p className="mt-3 text-sm leading-6 text-[#b8b8b2]">{body}</p>
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
            <div key={item} className="border border-white/10 bg-[#050505]/45 p-2 text-sm leading-6 text-[#d7d7d0]">
              {item.replace(/[_:]/g, ' ')}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[#b8b8b2]">{empty}</p>
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
  slotReadings: Record<Entry['media'][number]['type'], string>;
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
      slotReadings: {
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
      slotReadings: {
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
    materials: entry.themes.slice(0, 3).length ? entry.themes.slice(0, 3) : ['source', 'type', 'context'],
    materialColors: ['#6d7674', '#8f8b75', '#6f677e'],
    compositionTitle: 'Kompositionslesung',
    composition: [
      entry.short_description,
      `Typologie: ${entry.entry_type.replace(/_/g, ' ')}`,
      `Stilsektor: ${entry.style_sector.replace(/_/g, ' ')}`,
      `Filter: ${entry.themes.slice(0, 3).join(', ') || 'needs review'}`
    ],
    diagramType: 'generic',
    slotReadings: {
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
    ...(entry.source_assets?.length ? [`${entry.source_assets.length} source assets`] : [])
  ];
}

function blenderLayerItems(entry: Entry) {
  const modelLayers = (entry.model_assets ?? []).map((model) => `${model.model_type.replace(/_/g, ' ')} / ${model.review_status}`);
  const analysisLayers = (entry.analysis_layers ?? []).map((analysis) => `analysis ${analysis.analysis_type.replace(/_/g, ' ')} / ${analysis.review_status}`);

  if (modelLayers.length || analysisLayers.length) {
    return [...modelLayers, ...analysisLayers].slice(0, 10);
  }

  return [
    'site context / planned',
    'mass model / planned',
    'structure / planned',
    'envelope / planned',
    'circulation / planned',
    'tectonics / planned'
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
    entry.source_url ?? 'rights-reviewed plans, sections and images needed'
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
  if (entry.slug !== 'villa-savoye') return null;
  return '/archive-models/villa-savoye/low.glb';
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

function studyPrompt(entry: Entry) {
  const type = entry.entry_type.replace(/_/g, ' ');
  const theme = entry.themes[0]?.replace(/[_:]/g, ' ') ?? 'architectural history';
  return `Read this ${type} through ${theme}: locate what is formal, what is technical, and what belongs to its historical context.`;
}

function archiveReadiness(entry: Entry) {
  const mediaScore = Math.min(entry.media.length, 4) * 12;
  const relationScore = Math.min(relatedEntries(entry).length, 4) * 6;
  const textScore = entry.full_description.length > 220 ? 18 : 8;
  const databaseScore = entry.database_profile ? 16 : 0;
  const analysisScore = Math.min(entry.analysis_layers?.length ?? 0, 4) * 3;
  return Math.min(100, mediaScore + relationScore + textScore + databaseScore + analysisScore);
}

function archiveSummary(entry: Entry) {
  const parts = [
    `${entry.media.length}/4 media slots`,
    `${relatedEntries(entry).length} relations`,
    entry.database_profile ? `${entry.database_profile.model_count} model layers` : '3D model pending'
  ];
  return parts.join(' / ');
}

function entryJsonLd(entry: Entry) {
  const location = [entry.city, entry.country].filter(Boolean).join(', ');
  return {
    '@context': 'https://schema.org',
    '@type': entry.entry_type === 'text' || entry.entry_type === 'theory' ? 'CreativeWork' : 'Place',
    name: entry.title,
    description: entry.one_sentence || entry.short_description,
    url: `${siteUrl}/atlas/${entry.slug}/`,
    creator: entry.authors,
    location: location || undefined,
    dateCreated: entry.year_start > 0 ? String(entry.year_start) : undefined,
    keywords: [...entry.themes, entry.style_sector, entry.entry_type].join(', ')
  };
}

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year}`;
}

function styleColor(styleSector: StyleSectorId) {
  const colors: Record<StyleSectorId, string> = {
    classical_architecture: '#9b6dff',
    pre_modern_architecture: '#ffb000',
    modern_architecture: '#00e7ff',
    postwar_modern_architecture: '#ff4d1f',
    sustainable_architecture: '#65ff9a',
    vernacular_architecture: '#ff007a'
  };

  return colors[styleSector];
}
