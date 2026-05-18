import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import entries from '@/data/mock-entries.json';
import relations from '@/data/relations.json';
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
      title: 'Entry not found | Architecture Cosmos'
    };
  }

  const title = `${entry.title} | Architecture Cosmos`;
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
      siteName: 'Architecture Cosmos',
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

  return (
    <main className="entry-page min-h-screen overflow-x-hidden bg-[#050505] text-[#f7f7f4]" style={{ '--entry-accent': accent } as CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="entry-cosmos-field" aria-hidden="true">
        <span className="entry-ring entry-ring-a" />
        <span className="entry-ring entry-ring-b" />
        <span className="entry-ring entry-ring-c" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-white/12 pb-4">
          <Link href="/" className="entry-link text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f7f7f4]/78">
            Architecture Cosmos
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

        <section className="grid gap-4 border-t border-white/12 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {entry.media.map((media) => (
            <div key={media.type} className="entry-media-card min-h-[210px] border border-white/14 bg-[#070707] p-4">
              <div className="mb-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>
                <span>{media.type}</span>
                <span className="text-[#8d8d87]">slot {mediaSlotNumber(media.type)}</span>
              </div>
              <div className={`entry-media-placeholder entry-media-${media.type} flex h-28 items-center justify-center border border-white/10 text-center text-[11px] uppercase tracking-[0.14em] text-[#d7d7d0]`}>
                {media.label}
              </div>
              <p className="mt-3 text-sm leading-6 text-[#b8b8b2]">{media.placeholder}</p>
              {media.credit ? <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[#8d8d87]">{media.credit}</p> : null}
            </div>
          ))}
        </section>

        <section className="grid gap-6 border-t border-white/12 py-8 lg:grid-cols-3">
          <InfoBlock title="Themes" items={entry.themes} accent={accent} />
          <InfoBlock title="Source Trail" items={sourceItems(entry)} accent={accent} />
          <InfoBlock title="Database Tags" items={entry.database_tags ?? []} accent={accent} empty="No database tags yet" />
        </section>

        {entry.model_assets?.length || entry.analysis_layers?.length ? (
          <section className="grid gap-6 border-t border-white/12 py-8 lg:grid-cols-2">
            <InfoBlock title="3D Model Layers" items={(entry.model_assets ?? []).map((model) => `${model.model_type.replace(/_/g, ' ')} / ${model.review_status}`)} accent={accent} />
            <InfoBlock title="Analysis Layers" items={(entry.analysis_layers ?? []).map((analysis) => `${analysis.analysis_type.replace(/_/g, ' ')} / ${analysis.review_status}`)} accent={accent} />
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

function sourceItems(entry: Entry) {
  return [
    ...(entry.source_documents ?? []),
    ...(entry.source_url ? [entry.source_url] : []),
    ...(entry.source_assets?.length ? [`${entry.source_assets.length} source assets`] : [])
  ];
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
