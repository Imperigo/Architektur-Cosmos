/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Grid3X3, ImageOff, List, RotateCcw, Search } from 'lucide-react';
import { publicStatusLabel } from '@/lib/public-labels';

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
const referencePageSize = 12;

export function PublicReferenceExplorer({ references }: PublicReferenceExplorerProps) {
  const [query, setQuery] = useState('');
  const [style, setStyle] = useState('all');
  const [material, setMaterial] = useState('all');
  const [view, setView] = useState<'grid' | 'index'>('grid');
  const [visibleCount, setVisibleCount] = useState(referencePageSize);

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
  const visible = filtered.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(referencePageSize);
  }, [query, style, material, view]);

  function resetFilters() {
    setQuery('');
    setStyle('all');
    setMaterial('all');
  }

  return (
    <section
      className="public-explorer border-t border-white/12 py-8"
      style={{ '--public-explorer-accent': '#57b6c2' } as CSSProperties}
    >
      <div className="public-explorer-head">
        <div>
          <div className="public-explorer-kicker">Öffentliche Referenzdatenbank</div>
          <h2 className="public-explorer-title">Referenzdossiers im öffentlichen Bestand</h2>
        </div>
        <div className="public-filter-grid public-reference-filter-grid">
          <label className="public-filter-field">
            <span className="public-filter-label">Suche</span>
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Projekt, Material, Ort"
              className="ak-control public-filter-control public-filter-control-search"
            />
          </label>
          <label className="public-filter-field">
            <span className="public-filter-label">Epoche</span>
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="ak-control public-filter-control"
            >
              {styles.map((item) => (
                <option key={item} value={item}>{item === 'all' ? 'Alle Epochen' : styleLabels[item] ?? item.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
          <label className="public-filter-field">
            <span className="public-filter-label">Material</span>
            <select
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
              className="ak-control public-filter-control"
            >
              {materials.map((item) => (
                <option key={item} value={item}>{item === 'all' ? 'Alle Materialien' : item.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
          <div className="public-filter-field">
            <span className="public-filter-label">Ansicht</span>
            <div className="public-view-toggle ak-control" aria-label="Ansicht">
              <ViewButton active={view === 'grid'} onClick={() => setView('grid')} icon={<Grid3X3 aria-hidden="true" />}>Raster</ViewButton>
              <ViewButton active={view === 'index'} onClick={() => setView('index')} icon={<List aria-hidden="true" />}>Index</ViewButton>
            </div>
          </div>
        </div>
      </div>

      <div className="public-results-bar">
        <div className="public-results-count">
          <strong>{filtered.length}</strong> von {references.length} öffentlichen Referenzen sichtbar.
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="public-reset-button"
          >
            <RotateCcw aria-hidden="true" />
            Filter zurücksetzen
          </button>
        ) : (
          <span className="public-status-pill">Freigabeprüfung aktiv</span>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="public-empty-state">
          <Search aria-hidden="true" />
          <strong>Keine Referenz passt zu diesem Filter</strong>
          <p>Suche, Epoche oder Material zurücksetzen, um den öffentlichen Bestand wieder vollständig zu sehen.</p>
          <button type="button" className="public-reset-button" onClick={resetFilters}>
            <RotateCcw aria-hidden="true" />
            Filter zurücksetzen
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="mt-6 grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((entry) => (
          <Link
            key={entry.slug}
            href={`/atlas/${entry.slug}/`}
            className="ak-card group overflow-hidden transition hover:bg-[#1a1e27]"
          >
            <div className="aspect-[4/3] overflow-hidden bg-[#141817]">
              {entry.imageUrl ? (
                <img
                  src={entry.imageUrl}
                  alt={`${entry.title} Referenzbild`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                />
              ) : (
                <div className="public-card-empty-preview public-reference-preview-empty">
                  <ImageOff aria-hidden="true" />
                  <strong>Bild in Prüfung</strong>
                  <span>{entry.title}</span>
                  <small>kein öffentliches Bild freigegeben</small>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="public-card-meta">
                <span>{entry.year}</span>
                <span>{styleLabels[entry.style] ?? entry.style.replace(/_/g, ' ')}</span>
                {entry.hasModel ? <span>3D-Vorschau</span> : null}
              </div>
              <h3 className="public-card-title">{entry.title}</h3>
              <p className="public-card-summary">{entry.summary}</p>
              <div className="public-card-status-panel mt-4">
                <div className="public-card-chip-row">
                  <span>{publicStatusLabel(entry.gateStatus)}</span>
                  <span>{entry.readinessScore}%</span>
                </div>
                <div className="public-progress-track mt-2 h-1.5 overflow-hidden">
                  <div className="public-progress-fill h-full" style={{ width: `${entry.readinessScore}%` }} />
                </div>
              </div>
              <div className="public-card-stat-grid mt-4">
                <span>{entry.mediaCount} Medien</span>
                <span>{entry.analysisCount} Analysen</span>
                <span>{entry.materials.length || 0} Mat.</span>
              </div>
              <div className="public-card-location">{entry.location}</div>
              {entry.imageCredit ? <div className="public-card-credit">{entry.imageCredit}</div> : null}
            </div>
          </Link>
          ))}
        </div>
      ) : (
        <div className="public-index-table">
          <div className="public-index-head hidden grid-cols-[80px_minmax(220px,1.2fr)_minmax(160px,0.8fr)_120px_100px] md:grid">
            <span>Jahr</span>
            <span>Projekt</span>
            <span>Ort / Autor</span>
            <span>Bestand</span>
            <span>Datenstand</span>
          </div>
          {visible.map((entry) => (
            <Link
              key={entry.slug}
              href={`/atlas/${entry.slug}/`}
              className="public-index-row grid gap-2 border-b border-white/10 px-3 py-4 md:grid-cols-[80px_minmax(220px,1.2fr)_minmax(160px,0.8fr)_120px_100px] md:items-center md:gap-4"
            >
              <span className="public-index-accent public-index-accent-year">{entry.year}</span>
              <span>
                <strong className="public-index-title">{entry.title}</strong>
                <span className="public-index-submeta">
                  {styleLabels[entry.style] ?? entry.style.replace(/_/g, ' ')}
                </span>
              </span>
              <span className="public-index-body">
                {entry.location || 'Ort in Prüfung'}
                {entry.authors.length ? <span className="public-index-muted">{entry.authors.join(', ')}</span> : null}
              </span>
              <span className="public-index-meta">
                {entry.mediaCount} Medien / {entry.analysisCount} Analysen
              </span>
              <span className="flex items-center justify-between gap-3 md:block">
                <span className="public-index-value">{entry.readinessScore}%</span>
                <span className="public-progress-track mt-2 block h-px flex-1 md:w-full">
                  <span className="public-progress-fill block h-px" style={{ width: `${entry.readinessScore}%` }} />
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
      {visible.length < filtered.length ? (
        <div className="public-load-more-row">
          <span className="public-load-more-count">
            {visible.length} von {filtered.length} geladen
          </span>
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + referencePageSize)}
            className="public-load-more-button"
          >
            Weitere {Math.min(referencePageSize, filtered.length - visible.length)} laden
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ViewButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`public-view-button ${active ? 'is-active' : ''}`}
    >
      {icon}{children}
    </button>
  );
}
