import type { Entry } from '@/lib/types';

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

export function EntryDetailPanel({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  if (!entry) return null;

  const location = [entry.city, entry.country].filter(Boolean).join(', ');
  const yearRange = entry.year_end && entry.year_end !== entry.year_start
    ? `${formatYear(entry.year_start)} - ${formatYear(entry.year_end)}`
    : formatYear(entry.year_start);

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
    </aside>
  );
}

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} v. Chr.` : `${year}`;
}
