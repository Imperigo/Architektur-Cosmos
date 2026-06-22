/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export type PublicReference = {
  slug: string;
  title: string;
  year: number;
  authors: string[];
  location: string;
  style: string;
  type: string;
  summary: string;
  imageUrl: string | null;
  imageCredit: string | null;
  tags: string[];
  materials: string[];
  hasModel: boolean;
  mediaCount: number;
  analysisCount: number;
  gateStatus: string;
  readinessScore: number;
};

type PublicReferenceExplorerProps = {
  references: PublicReference[];
};

const styleLabels: Record<string, string> = {
  classical_architecture: 'Klassik',
  pre_modern_architecture: 'Vormoderne',
  modern_architecture: 'Moderne',
  postwar_modern_architecture: 'Nachkriegsmoderne',
  sustainable_architecture: 'Nachhaltigkeit',
  vernacular_architecture: 'Vernakulär'
};

export function PublicReferenceExplorer({ references }: PublicReferenceExplorerProps) {
  const [query, setQuery] = useState('');
  const [style, setStyle] = useState('all');
  const [material, setMaterial] = useState('all');
  const [view, setView] = useState<'grid' | 'index'>('grid');

  const styles = useMemo(() => ['all', ...Array.from(new Set(references.map((entry) => entry.style))).sort()], [references]);
  const materials = useMemo(() => {
    const values = references.flatMap((entry) => entry.materials);
    return ['all', ...Array.from(new Set(values)).sort()];
  }, [references]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return references.filter((entry) => {
      const matchesQuery = !normalizedQuery
        || [entry.title, entry.summary, entry.location, ...entry.authors, ...entry.tags, ...entry.materials]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStyle = style === 'all' || entry.style === style;
      const matchesMaterial = material === 'all' || entry.materials.includes(material);
      return matchesQuery && matchesStyle && matchesMaterial;
    });
  }, [references, query, style, material]);
  const hasActiveFilters = Boolean(query.trim() || style !== 'all' || material !== 'all');

  return (
    <section className="border-t border-white/12 py-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#66e1d2]">Öffentliche Referenzdatenbank</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4] sm:text-4xl">Projekte suchen, filtern und öffnen</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[760px] lg:grid-cols-[1.35fr_1fr_1fr_auto]">
          <label className="block">
            <span className="sr-only">Suche</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Projekt, Material, Ort"
              className="h-11 w-full border border-white/14 bg-[#111514] px-3 text-sm text-[#f7f7f4] outline-none transition focus:border-[#66e1d2]"
            />
          </label>
          <label className="block">
            <span className="sr-only">Stil</span>
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="h-11 w-full border border-white/14 bg-[#111514] px-3 text-sm text-[#f7f7f4] outline-none transition focus:border-[#66e1d2]"
            >
              {styles.map((item) => (
                <option key={item} value={item}>{item === 'all' ? 'Alle Epochen' : styleLabels[item] ?? item.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Material</span>
            <select
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
              className="h-11 w-full border border-white/14 bg-[#111514] px-3 text-sm text-[#f7f7f4] outline-none transition focus:border-[#66e1d2]"
            >
              {materials.map((item) => (
                <option key={item} value={item}>{item === 'all' ? 'Alle Materialien' : item.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
          <div className="grid h-11 grid-cols-2 border border-white/14 bg-[#111514] p-1" aria-label="Ansicht">
            <ViewButton active={view === 'grid'} onClick={() => setView('grid')}>Raster</ViewButton>
            <ViewButton active={view === 'index'} onClick={() => setView('index')}>Index</ViewButton>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-3">
        <div className="text-sm text-[#aeb8b2]">
          <strong className="font-semibold text-[#f7f7f4]">{filtered.length}</strong> von {references.length} öffentlichen Referenzen sichtbar.
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStyle('all');
              setMaterial('all');
            }}
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#66e1d2] transition hover:text-white"
          >
            Filter zurücksetzen
          </button>
        ) : (
          <span className="text-[9px] uppercase tracking-[0.14em] text-[#65706b]">Public Gate aktiv</span>
        )}
      </div>

      {view === 'grid' ? (
        <div className="mt-6 grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry) => (
          <Link
            key={entry.slug}
            href={`/atlas/${entry.slug}/`}
            className="group overflow-hidden bg-[#0b100f] transition hover:bg-[#101816]"
          >
            <div className="aspect-[4/3] overflow-hidden bg-[#141817]">
              {entry.imageUrl ? (
                <img
                  src={entry.imageUrl}
                  alt={`${entry.title} Referenzbild`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.18em] text-[#6f7772]">Bild in Prüfung</div>
              )}
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-[#66e1d2]">
                <span>{entry.year}</span>
                <span>{styleLabels[entry.style] ?? entry.style.replace(/_/g, ' ')}</span>
                {entry.hasModel ? <span>3D Preview</span> : null}
              </div>
              <h3 className="mt-3 text-xl leading-tight text-[#f7f7f4]">{entry.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#b9c1bc]">{entry.summary}</p>
              <div className="mt-4 border border-[#66e1d2]/18 bg-[#66e1d2]/6 p-3">
                <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.12em] text-[#66e1d2]">
                  <span>{entry.gateStatus}</span>
                  <span>{entry.readinessScore}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden bg-white/10">
                  <div className="h-full bg-[#66e1d2]" style={{ width: `${entry.readinessScore}%` }} />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 border border-white/10 text-center text-[10px] uppercase tracking-[0.12em] text-[#aeb8b2]">
                <span className="border-r border-white/10 py-2">{entry.mediaCount} Medien</span>
                <span className="border-r border-white/10 py-2">{entry.analysisCount} Layer</span>
                <span className="py-2">{entry.materials.length || 0} Mat.</span>
              </div>
              <div className="mt-3 text-xs leading-5 text-[#858f89]">{entry.location}</div>
              {entry.imageCredit ? <div className="mt-2 text-[10px] leading-4 text-[#6f7772]">{entry.imageCredit}</div> : null}
            </div>
          </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 border-t border-white/12">
          <div className="hidden grid-cols-[80px_minmax(220px,1.2fr)_minmax(160px,0.8fr)_120px_100px] gap-4 border-b border-white/12 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#65706b] md:grid">
            <span>Jahr</span>
            <span>Projekt</span>
            <span>Ort / Autor</span>
            <span>Bestand</span>
            <span>Readiness</span>
          </div>
          {filtered.map((entry) => (
            <Link
              key={entry.slug}
              href={`/atlas/${entry.slug}/`}
              className="grid gap-2 border-b border-white/10 px-3 py-4 transition hover:bg-[#66e1d2]/6 md:grid-cols-[80px_minmax(220px,1.2fr)_minmax(160px,0.8fr)_120px_100px] md:items-center md:gap-4"
            >
              <span className="text-sm font-semibold text-[#66e1d2]">{entry.year}</span>
              <span>
                <strong className="block text-base font-semibold text-[#f7f7f4]">{entry.title}</strong>
                <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-[#7d8984]">
                  {styleLabels[entry.style] ?? entry.style.replace(/_/g, ' ')}
                </span>
              </span>
              <span className="text-xs leading-5 text-[#9ca8a2]">
                {entry.location || 'Ort in Prüfung'}
                {entry.authors.length ? <span className="block text-[#69736f]">{entry.authors.join(', ')}</span> : null}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#9ca8a2]">
                {entry.mediaCount} Medien / {entry.analysisCount} Layer
              </span>
              <span className="flex items-center justify-between gap-3 md:block">
                <span className="text-sm font-semibold text-[#f7f7f4]">{entry.readinessScore}%</span>
                <span className="mt-2 block h-px flex-1 bg-white/10 md:w-full">
                  <span className="block h-px bg-[#66e1d2]" style={{ width: `${entry.readinessScore}%` }} />
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`text-[9px] font-semibold uppercase tracking-[0.14em] transition ${
        active ? 'bg-[#66e1d2] text-[#07100f]' : 'text-[#89958f] hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
