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
  const accent = styleColor(entry.style_sector);
  const location = [entry.city, entry.country].filter(Boolean).join(', ');
  const jsonLd = entryJsonLd(entry);

  return (
    <main className="entry-page min-h-screen overflow-x-hidden bg-[#050505] text-[#f7f7f4]" style={{ '--entry-accent': accent } as CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8 lg:px-10">
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
            <div className="mb-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-[#b8b8b2]">
              <span className="border border-white/15 px-2.5 py-1">{formatYear(entry.year_start)}</span>
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

          <aside className="border border-white/14 bg-[#071315]/70 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>Archive Status</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <EntryMeta label="Source quality" value={entry.source_quality.replace(/_/g, ' ')} />
              <EntryMeta label="Lecture cluster" value={(entry.lecture_cluster ?? []).join(', ') || 'not assigned'} />
              <EntryMeta label="Media slots" value={`${entry.media.length}`} />
              <EntryMeta label="Relations" value={`${related.length}`} />
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

        <section className="grid gap-4 border-t border-white/12 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {entry.media.map((media) => (
            <div key={media.type} className="min-h-[180px] border border-white/14 bg-[#070707] p-4">
              <div className="mb-3 text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>{media.type}</div>
              <div className="flex h-24 items-center justify-center border border-white/10 bg-[radial-gradient(circle_at_50%_40%,rgba(247,247,244,0.11),rgba(247,247,244,0.02)_58%,transparent_70%)] text-center text-[11px] uppercase tracking-[0.14em] text-[#d7d7d0]">
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

        <section className="border-t border-white/12 py-8">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>Relations</h2>
          {related.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map(({ relation, entry: relatedEntry }) => (
                <Link key={relation.id} href={`/atlas/${relatedEntry.slug}/`} className="entry-link border border-white/14 bg-[#071315]/55 p-4">
                  <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: accent }}>{relation.relation_type.replace(/_/g, ' ')}</div>
                  <div className="mt-2 text-lg text-[#f7f7f4]">{relatedEntry.title}</div>
                  <p className="mt-2 text-sm leading-6 text-[#b8b8b2]">{relation.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#b8b8b2]">No relations attached yet.</p>
          )}
        </section>
      </div>
    </main>
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

function sourceItems(entry: Entry) {
  return [
    ...(entry.source_documents ?? []),
    ...(entry.source_url ? [entry.source_url] : []),
    ...(entry.source_assets?.length ? [`${entry.source_assets.length} source assets`] : [])
  ];
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
