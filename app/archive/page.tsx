import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import entries from '@/data/mock-entries.json';
import relations from '@/data/relations.json';
import archivePreview from '@/data/archive-preview.json';
import type { Entry, EntryRelation, EntryType, StyleSectorId } from '@/lib/types';

const allEntries = entries as Entry[];
const allRelations = relations as EntryRelation[];

export const metadata: Metadata = {
  title: 'Archive Preview | Architecture Cosmos',
  description: 'Static preview of the Architecture Cosmos archive structure, prepared for Cloudflare D1 and future media/model storage.'
};

export default function ArchivePage() {
  const pilot = allEntries.find((entry) => entry.id === archivePreview.entries[0]?.id) ?? allEntries[0];
  const typeCounts = countBy(allEntries, (entry) => entry.entry_type);
  const styleCounts = countBy(allEntries, (entry) => entry.style_sector);
  const richestEntries = [...allEntries]
    .sort((a, b) => archiveWeight(b) - archiveWeight(a))
    .slice(0, 10);
  const workflow = archiveWorkflow(allEntries);

  return (
    <main className="entry-page archive-page min-h-screen overflow-x-hidden bg-[#050505] text-[#f7f7f4]" style={{ '--entry-accent': '#00e7ff' } as CSSProperties}>
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
            <div className="mb-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-[#b8b8b2]">
              <span className="border border-white/15 px-2.5 py-1">Static archive preview</span>
              <span className="border border-[#00e7ff] px-2.5 py-1 text-[#00e7ff]">D1 ready</span>
              <span className="border border-white/15 px-2.5 py-1">R2 preview bucket</span>
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-normal text-[#f7f7f4] sm:text-6xl lg:text-7xl">
              Archive Database
            </h1>
            <p className="mt-8 max-w-3xl text-xl leading-relaxed text-[#f7f7f4] sm:text-2xl">
              A static control room for entries, sources, media slots, relations, analysis layers and future 3D model packages.
            </p>
            <p className="mt-7 max-w-3xl text-base leading-8 text-[#cfcfca]">
              The website still reads bundled JSON for maximum speed and zero backend risk. Cloudflare D1 is prepared as a preview archive for validation, schema design and later read-only queries. Real images, plans and GLB models can move to object storage once the media policy is ready.
            </p>
          </div>

          <aside className="entry-archive-panel border border-white/14 bg-[#071315]/70 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00e7ff]">Storage Status</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <ArchiveMeta label="Database" value={archivePreview.storage_target.database_name} />
              <ArchiveMeta label="Status" value={archivePreview.storage_target.status.replace(/_/g, ' ')} />
              <ArchiveMeta label="Frontend" value={archivePreview.storage_target.frontend_connection.replace(/_/g, ' ')} />
              <ArchiveMeta label="R2 bucket" value={archivePreview.storage_target.assets_bucket_name ?? 'not configured'} />
              <ArchiveMeta label="Assets" value={archivePreview.storage_target.assets_status.replace(/_/g, ' ')} />
              <ArchiveMeta label="Verified" value={archivePreview.storage_target.last_verified} />
            </dl>
          </aside>
        </section>

        <section className="archive-metric-grid grid gap-3 border-t border-white/12 py-8 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Entries" value={allEntries.length} />
          <Metric label="Relations" value={allRelations.length} />
          <Metric label="Media rows" value={archivePreview.entry_media.length} />
          <Metric label="Model layers" value={archivePreview.entry_models.length} />
          <Metric label="Analysis layers" value={archivePreview.entry_analysis.length} />
          <Metric label="Source rows" value={archivePreview.entry_sources.length} />
          <Metric label="Tags" value={archivePreview.tags.length} />
          <Metric label="Pilot objects" value={archivePreview.entries.length} />
        </section>

        <section className="grid gap-6 border-t border-white/12 py-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="entry-archive-panel border border-white/14 bg-[#071315]/70 p-5">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00e7ff]">Archive Workflow</h2>
            <div className="space-y-3">
              {workflow.stages.map((stage) => (
                <div key={stage.label} className="border border-white/12 bg-[#050505]/40 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-[#f7f7f4]">{stage.label}</span>
                    <span className="text-xl text-[#00e7ff]">{stage.value}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#b8b8b2]">{stage.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="entry-archive-panel border border-white/14 bg-[#071315]/70 p-5">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00e7ff]">Next Import Workflow</h2>
            <ol className="space-y-3 text-sm leading-6 text-[#d7d7d0]">
              <li><span className="text-[#00e7ff]">01</span> Create a local draft from <code>data/entry-draft-template.json</code>.</li>
              <li><span className="text-[#00e7ff]">02</span> Run <code>npm run archive:draft -- --input path/to/draft.json</code>.</li>
              <li><span className="text-[#00e7ff]">03</span> Review generated R2 keys; uploads remain blocked.</li>
              <li><span className="text-[#00e7ff]">04</span> Add reviewed entry to <code>data/mock-entries.json</code>.</li>
              <li><span className="text-[#00e7ff]">05</span> Sync D1 with <code>npm run archive:d1-preview</code>.</li>
            </ol>
          </div>
        </section>

        <section className="grid gap-6 border-t border-white/12 py-8 lg:grid-cols-2">
          <ArchiveList title="Entry Types" rows={orderedEntryTypes.map((type) => [type.replace(/_/g, ' '), `${typeCounts[type] ?? 0}`])} />
          <ArchiveList title="Style Sectors" rows={orderedStyleSectors.map((style) => [style.replace(/_/g, ' '), `${styleCounts[style] ?? 0}`])} />
        </section>

        <section className="border-t border-white/12 py-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00e7ff]">Database Pilot</h2>
            <Link href={`/atlas/${pilot.slug}/`} className="entry-link border border-white/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#d7d7d0]">
              Open Pilot
            </Link>
          </div>
          <div className="entry-study-card border border-white/14 bg-[#071315]/55 p-5">
            <div className="text-2xl text-[#f7f7f4]">{pilot.title}</div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#b8b8b2]">{pilot.one_sentence}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ArchiveMeta label="Media" value={`${pilot.media.length} slots`} />
              <ArchiveMeta label="3D" value={`${pilot.model_assets?.length ?? 0} model layers`} />
              <ArchiveMeta label="Analysis" value={`${pilot.analysis_layers?.length ?? 0} analysis layers`} />
              <ArchiveMeta label="Tags" value={`${pilot.database_tags?.length ?? 0} tags`} />
            </div>
          </div>
        </section>

        <section className="border-t border-white/12 py-8">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00e7ff]">Needs Attention</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <AttentionCard title="Sources" entries={workflow.needsSources} />
            <AttentionCard title="Relations" entries={workflow.needsRelations} />
            <AttentionCard title="Models" entries={workflow.needsModels} />
          </div>
        </section>

        <section className="border-t border-white/12 py-8">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00e7ff]">Richest Static Entries</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {richestEntries.map((entry) => (
              <Link key={entry.id} href={`/atlas/${entry.slug}/`} className="entry-link entry-relation-card border border-white/14 bg-[#071315]/55 p-4">
                <span className="block text-[10px] uppercase tracking-[0.16em] text-[#00e7ff]">{entry.entry_type.replace(/_/g, ' ')} / {entry.style_sector.replace(/_/g, ' ')}</span>
                <span className="mt-2 block text-lg text-[#f7f7f4]">{entry.title}</span>
                <span className="mt-2 block text-sm leading-6 text-[#b8b8b2]">{archiveWeight(entry)} archive points / {entry.year_start < 0 ? `${Math.abs(entry.year_start)} BCE` : entry.year_start}</span>
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

function countBy<Key extends string>(items: Entry[], keyFn: (entry: Entry) => Key) {
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

function archiveWorkflow(entries: Entry[]) {
  const reviewed = entries.filter((entry) => entry.database_profile?.status === 'reviewed' || entry.database_profile?.status === 'published');
  const withAllMedia = entries.filter((entry) => new Set(entry.media.map((media) => media.type)).size >= 4);
  const withSources = entries.filter((entry) => (entry.source_documents?.length ?? 0) > 0 || Boolean(entry.source_url));
  const withModels = entries.filter((entry) => (entry.model_assets?.length ?? 0) > 0);
  const withRelations = entries.filter((entry) => allRelations.some((relation) => relation.source_entry_id === entry.id || relation.target_entry_id === entry.id));

  return {
    stages: [
      { label: 'Structured entries', value: entries.length, description: 'Objects currently bundled in static JSON and exportable to D1.' },
      { label: 'Source-backed', value: withSources.length, description: 'Entries with at least one source document or source URL.' },
      { label: 'Four-slot media ready', value: withAllMedia.length, description: 'Entries with exterior, interior, section and plan placeholders or media rows.' },
      { label: 'Relation graph ready', value: withRelations.length, description: 'Entries connected to at least one other archive object.' },
      { label: 'Model metadata ready', value: withModels.length, description: 'Entries with planned 3D model rows and R2 keys.' },
      { label: 'Reviewed pilots', value: reviewed.length, description: 'Entries promoted beyond draft status.' }
    ],
    needsSources: entries.filter((entry) => (entry.source_documents?.length ?? 0) === 0 && !entry.source_url).slice(0, 4),
    needsRelations: entries.filter((entry) => !allRelations.some((relation) => relation.source_entry_id === entry.id || relation.target_entry_id === entry.id)).slice(0, 4),
    needsModels: entries.filter((entry) => (entry.model_assets?.length ?? 0) === 0).slice(0, 4)
  };
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="entry-study-card border border-white/14 bg-[#071315]/55 p-4">
      <div className="text-3xl font-semibold text-[#f7f7f4]">{value}</div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[#b8b8b2]">{label}</div>
    </div>
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
    <div className="entry-archive-panel border border-white/14 bg-[#071315]/70 p-5">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00e7ff]">{title}</h2>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b border-white/10 pb-2 text-sm">
            <span className="capitalize text-[#d7d7d0]">{label}</span>
            <span className="text-[#f7f7f4]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttentionCard({ title, entries }: { title: string; entries: Entry[] }) {
  return (
    <div className="entry-archive-panel border border-white/14 bg-[#071315]/70 p-4">
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00e7ff]">{title}</h3>
      <div className="space-y-2">
        {entries.map((entry) => (
          <Link key={entry.id} href={`/atlas/${entry.slug}/`} className="entry-link block border border-white/10 bg-[#050505]/35 px-3 py-2">
            <span className="block truncate text-sm text-[#f7f7f4]">{entry.title}</span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-[#8d8d87]">{entry.entry_type.replace(/_/g, ' ')}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
