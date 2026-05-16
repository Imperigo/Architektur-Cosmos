import type { Entry, EntryRelation } from '@/lib/types';

const entryTypeLabels: Record<Entry['entry_type'], string> = {
  building: 'Bauwerk',
  urban_plan: 'Stadtplanung',
  landscape_project: 'Landschaft',
  text: 'Text',
  theory: 'Theorie',
  map: 'Karte',
  infrastructure: 'Infrastruktur',
  object: 'Objekt',
  event: 'Ereignis'
};

const relationLabels: Record<EntryRelation['relation_type'], string> = {
  influences: 'Influence',
  responds_to: 'Response',
  shares_theme: 'Theme',
  same_author: 'Author',
  same_place: 'Place',
  typological_reference: 'Typology',
  material_reference: 'Material',
  context: 'Context'
};

type EntryDetailPanelProps = {
  entry: Entry | null;
  relations: EntryRelation[];
  entriesById: Record<string, Entry>;
  onClose: () => void;
};

export function EntryDetailPanel({ entry, relations, entriesById, onClose }: EntryDetailPanelProps) {
  if (!entry) return null;

  const location = [entry.city, entry.country].filter(Boolean).join(', ');
  const yearRange = entry.year_end && entry.year_end !== entry.year_start
    ? `${formatYear(entry.year_start)} - ${formatYear(entry.year_end)}`
    : formatYear(entry.year_start);
  const connectedRelations = relations.filter((relation) => {
    return relation.source_entry_id === entry.id || relation.target_entry_id === entry.id;
  });

  return (
    <aside className="absolute right-5 top-5 z-20 w-[min(380px,calc(100vw-40px))] border border-neutral-900 bg-[#f7f7f4]/95 p-5 shadow-[8px_8px_0_#111] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-neutral-500">{entryTypeLabels[entry.entry_type]}</p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">{entry.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="border border-neutral-900 px-2 py-1 text-xs uppercase tracking-[0.16em] hover:bg-neutral-900 hover:text-[#f7f7f4]"
        >
          Close
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-[92px_1fr] gap-x-3 gap-y-2 border-y border-neutral-300 py-4 text-sm">
        <dt className="text-neutral-500">Jahr</dt>
        <dd>{yearRange}</dd>
        <dt className="text-neutral-500">Autor:innen</dt>
        <dd>{entry.authors.join(', ')}</dd>
        {location ? (
          <>
            <dt className="text-neutral-500">Ort</dt>
            <dd>{location}</dd>
          </>
        ) : null}
      </dl>

      <p className="mt-4 text-sm leading-relaxed text-neutral-800">{entry.short_description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {entry.themes.map((theme) => (
          <span key={theme} className="border border-neutral-400 px-2 py-1 text-xs text-neutral-700">
            {theme}
          </span>
        ))}
      </div>

      {connectedRelations.length > 0 ? (
        <section className="mt-5 border-t border-neutral-300 pt-4">
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">Relations</p>
          <ul className="mt-3 space-y-3">
            {connectedRelations.slice(0, 4).map((relation) => {
              const otherId = relation.source_entry_id === entry.id ? relation.target_entry_id : relation.source_entry_id;
              const otherEntry = entriesById[otherId];

              return (
                <li key={relation.id} className="text-xs leading-relaxed text-neutral-700">
                  <span className="mr-2 border border-neutral-400 px-1.5 py-0.5 uppercase tracking-[0.14em] text-neutral-500">
                    {relationLabels[relation.relation_type]}
                  </span>
                  <span className="font-medium text-neutral-950">{otherEntry?.title ?? otherId}</span>
                  <span className="text-neutral-500"> · {relation.description}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} v. Chr.` : `${year}`;
}
