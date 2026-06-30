/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Box, FileImage, FileText, Grid3X3, Layers3, List, RotateCcw, Search, type LucideIcon } from 'lucide-react';
import {
  publicAssetDisplayLabel,
  publicAssetKindLabels,
  publicAssetLayerLabel,
  publicAssetProvenanceLabel,
  publicAssetRightsLabel,
  publicAssetStatusLabel
} from '@/lib/public-labels';

export type PublicAsset = {
  id: string;
  projectSlug: string;
  project: string;
  kind: 'image' | 'plan' | 'section' | 'model' | 'analysis';
  label: string;
  url: string;
  previewUrl?: string;
  rights: string;
  layer: string;
  status: string;
  provenance: string;
};

type PublicAssetExplorerProps = {
  assets: PublicAsset[];
};

const kindLabels: Record<PublicAsset['kind'], string> = publicAssetKindLabels;
const assetPageSize = 24;
const assetKindPreviewMeta: Record<PublicAsset['kind'], { Icon: LucideIcon; cue: string }> = {
  image: { Icon: FileImage, cue: 'Bildfläche' },
  plan: { Icon: FileText, cue: 'Planlesung' },
  section: { Icon: FileText, cue: 'Schnittlesung' },
  model: { Icon: Box, cue: 'Modellvorschau' },
  analysis: { Icon: Layers3, cue: 'Analyseebene' }
};

export function PublicAssetExplorer({ assets }: PublicAssetExplorerProps) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<PublicAsset['kind'] | 'all'>('all');
  const [layer, setLayer] = useState('all');
  const [project, setProject] = useState('all');
  const [view, setView] = useState<'grid' | 'index'>('grid');
  const [visibleCount, setVisibleCount] = useState(assetPageSize);

  const layers = useMemo(() => ['all', ...Array.from(new Set(assets.map((asset) => asset.layer))).sort()], [assets]);
  const projects = useMemo(() => ['all', ...Array.from(new Set(assets.map((asset) => asset.project))).sort()], [assets]);
  const filtered = useMemo(() => assets.filter((asset) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery
      || [
        asset.label,
        publicAssetDisplayLabel(asset.label),
        asset.project,
        asset.kind,
        asset.layer,
        asset.rights,
        asset.status,
        asset.provenance,
        publicAssetProvenanceLabel(asset.provenance),
        publicAssetLayerLabel(asset.layer),
        publicAssetRightsLabel(asset.rights),
        publicAssetStatusLabel(asset.status)
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesKind = kind === 'all' || asset.kind === kind;
    const matchesLayer = layer === 'all' || asset.layer === layer;
    const matchesProject = project === 'all' || asset.project === project;
    return matchesQuery && matchesKind && matchesLayer && matchesProject;
  }), [assets, kind, layer, project, query]);
  const hasActiveFilters = Boolean(query.trim() || kind !== 'all' || layer !== 'all' || project !== 'all');
  const visible = filtered.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(assetPageSize);
  }, [query, kind, layer, project, view]);

  function resetFilters() {
    setQuery('');
    setKind('all');
    setLayer('all');
    setProject('all');
  }

  return (
    <section
      className="public-explorer border-t border-white/12 py-8"
      style={{ '--public-explorer-accent': '#b9f06a' } as CSSProperties}
    >
      <div className="public-explorer-head">
        <div>
          <div className="public-explorer-kicker">Öffentliche Assetbibliothek</div>
          <h2 className="public-explorer-title">Öffentliche Assets nach Projekt und Ebene</h2>
        </div>
        <div className="public-filter-grid public-asset-filter-grid">
          <label className="public-filter-field">
            <span className="public-filter-label">Suche</span>
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Bauteil, Projekt, Quelle"
              className="ak-control public-filter-control public-filter-control-search"
            />
          </label>
          <label className="public-filter-field">
            <span className="public-filter-label">Typ</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as PublicAsset['kind'] | 'all')}
              className="ak-control public-filter-control"
            >
              <option value="all">Alle Typen</option>
              {Object.entries(kindLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label className="public-filter-field">
            <span className="public-filter-label">Ebene</span>
            <select
              value={layer}
              onChange={(event) => setLayer(event.target.value)}
              className="ak-control public-filter-control"
            >
              {layers.map((item) => <option key={item} value={item}>{item === 'all' ? 'Alle Ebenen' : publicAssetLayerLabel(item)}</option>)}
            </select>
          </label>
          <label className="public-filter-field">
            <span className="public-filter-label">Projekt</span>
            <select
              value={project}
              onChange={(event) => setProject(event.target.value)}
              className="ak-control public-filter-control"
            >
              {projects.map((item) => <option key={item} value={item}>{item === 'all' ? 'Alle Projekte' : item}</option>)}
            </select>
          </label>
          <div className="public-filter-field">
            <span className="public-filter-label">Ansicht</span>
            <div className="public-view-toggle ak-control" aria-label="Ansicht">
              <AssetViewButton active={view === 'grid'} onClick={() => setView('grid')} icon={<Grid3X3 aria-hidden="true" />}>Raster</AssetViewButton>
              <AssetViewButton active={view === 'index'} onClick={() => setView('index')} icon={<List aria-hidden="true" />}>Index</AssetViewButton>
            </div>
          </div>
        </div>
      </div>

      <div className="public-results-bar">
        <div className="public-results-count">
          <strong>{filtered.length}</strong> von {assets.length} öffentlichen Assets sichtbar.
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
          <span className="public-status-pill">Rechteprüfung aktiv</span>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="public-empty-state">
          <Search aria-hidden="true" />
          <strong>Kein Asset passt zu diesem Filter</strong>
          <p>Suche, Typ, Ebene oder Projekt zurücksetzen, um die öffentliche Assetbibliothek wieder vollständig zu sehen.</p>
          <button type="button" className="public-reset-button" onClick={resetFilters}>
            <RotateCcw aria-hidden="true" />
            Filter zurücksetzen
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="mt-6 grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((asset) => (
            <article
              key={asset.id}
              className="ak-card public-explorer-card group overflow-hidden"
            >
              <div className="public-asset-media-frame aspect-[4/3] overflow-hidden border-b border-white/10">
                {asset.previewUrl ? (
                  <img src={asset.previewUrl} alt={asset.label} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
                ) : (
                  <AssetPreviewPlaceholder asset={asset} />
                )}
              </div>
              <div className="p-4">
                <div className="public-card-meta">
                  <span>{kindLabels[asset.kind]}</span>
                  <span>{publicAssetLayerLabel(asset.layer)}</span>
                </div>
                <h3 className="public-card-title public-card-title-compact">{publicAssetDisplayLabel(asset.label)}</h3>
                <p className="public-card-summary public-card-summary-compact">{asset.project}</p>
                <div className="public-card-chip-row mt-4">
                  <span>{publicAssetRightsLabel(asset.rights)}</span>
                  <span>{publicAssetStatusLabel(asset.status)}</span>
                </div>
                <p className="public-card-provenance line-clamp-2">{publicAssetProvenanceLabel(asset.provenance)}</p>
                <div className="public-card-action-row">
                  <Link href={`/atlas/${asset.projectSlug}/`} className="public-card-action-link">
                    Dossier öffnen
                  </Link>
                  <a href={asset.url} className="public-card-action-link public-card-action-link-secondary">
                    Asset prüfen
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="public-index-table">
          <div className="public-index-head hidden grid-cols-[90px_minmax(220px,1.2fr)_minmax(180px,0.8fr)_150px_130px] md:grid">
            <span>Typ</span>
            <span>Asset</span>
            <span>Projekt</span>
            <span>Ebene</span>
            <span>Status</span>
          </div>
          {visible.map((asset) => (
            <div
              key={asset.id}
              className="public-index-row grid gap-2 border-b border-white/10 px-3 py-4 md:grid-cols-[90px_minmax(220px,1.2fr)_minmax(180px,0.8fr)_150px_130px] md:items-center md:gap-4"
            >
              <span className="public-index-accent public-index-accent-label">{kindLabels[asset.kind]}</span>
              <span>
                <strong className="public-index-title public-index-title-compact">{publicAssetDisplayLabel(asset.label)}</strong>
                <span className="public-index-muted line-clamp-1">{publicAssetProvenanceLabel(asset.provenance)}</span>
              </span>
              <Link href={`/atlas/${asset.projectSlug}/`} className="public-index-body public-index-title-compact">{asset.project}</Link>
              <span className="public-index-meta">{publicAssetLayerLabel(asset.layer)}</span>
              <a href={asset.url} className="public-index-meta">{publicAssetRightsLabel(asset.rights)} / {publicAssetStatusLabel(asset.status)}</a>
            </div>
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
            onClick={() => setVisibleCount((count) => count + assetPageSize)}
            className="public-load-more-button"
          >
            Weitere {Math.min(assetPageSize, filtered.length - visible.length)} laden
          </button>
        </div>
      ) : null}
    </section>
  );
}

function AssetViewButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
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

function AssetPreviewPlaceholder({ asset }: { asset: PublicAsset }) {
  const meta = assetKindPreviewMeta[asset.kind];
  const Icon = meta.Icon;

  return (
    <div className="public-card-empty-preview public-asset-preview-empty" data-kind={asset.kind}>
      <Icon aria-hidden="true" />
      <strong>{kindLabels[asset.kind]}</strong>
      <span>{publicAssetLayerLabel(asset.layer)}</span>
      <small>{meta.cue}</small>
    </div>
  );
}
