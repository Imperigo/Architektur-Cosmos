import type { Entry } from '@/lib/types';

export function ProjectDetailPanel({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  if (!entry) return null;

  return (
    <aside className="absolute right-6 top-6 z-20 w-[360px] border border-neutral-900 bg-[#f7f7f4]/95 p-5 shadow-xl backdrop-blur">
      <button onClick={onClose} className="float-right text-sm uppercase tracking-wider">Close</button>
      <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">{entry.entry_type}</p>
      <h2 className="mt-3 text-2xl font-semibold">{entry.title}</h2>
      <p className="mt-1 text-sm text-neutral-600">{entry.year_start} · {entry.city}, {entry.country}</p>
      <p className="mt-4 text-sm leading-relaxed">{entry.short_description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {entry.themes.map((theme) => (
          <span key={theme} className="border border-neutral-400 px-2 py-1 text-xs">{theme}</span>
        ))}
      </div>
    </aside>
  );
}
