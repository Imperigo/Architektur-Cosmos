/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';
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

  return (
    <section className="public-explorer border-t border-white/12 py-8">
      <div className="public-explorer-head">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#57b6c2]">Öffentliche Assetbibliothek</div>
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
              className="ak-control h-11 w-full pl-10 pr-3 text-sm outline-none transition focus:border-[#57b6c2]"
            />
          </label>
          <label className="public-filter-field">
            <span className="public-filter-label">Typ</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as PublicAsset['kind'] | 'all')}
              className="ak-control h-11 w-full px-3 text-sm outline-none transition focus:border-[#57b6c2]"
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
              className="ak-control h-11 w-full px-3 text-sm outline-none transition focus:border-[#57b6c2]"
            >
              {layers.map((item) => <option key={item} value={item}>{item === 'all' ? 'Alle Ebenen' : publicAssetLayerLabel(item)}</option>)}
            </select>
          </label>
          <label className="public-filter-field">
            <span className="public-filter-label">Projekt</span>
            <select
              value={project}
              onChange={(event) => setProject(event.target.value)}
              className="ak-control h-11 w-full px-3 text-sm outline-none transition focus:border-[#57b6c2]"
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
        <div className="text-sm text-[#aeb8b2]">
          <strong className="font-semibold text-[#f7f7f4]">{filtered.length}</strong> von {assets.length} öffentlichen Assets sichtbar.
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setKind('all');
              setLayer('all');
              setProject('all');
            }}
            className="public-reset-button"
          >
            <RotateCcw aria-hidden="true" />
            Filter zurücksetzen
          </button>
        ) : (
          <span className="public-status-pill">Rechteprüfung aktiv</span>
        )}
      </div>

      {view === 'grid' ? (
        <div className="mt-6 grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((asset) => (
          <a
            key={asset.id}
            href={asset.url}
            className="ak-card group overflow-hidden transition hover:bg-[#1a1e27]"
          >
            <div className="aspect-[4/3] overflow-hidden border-b border-white/10 bg-[#151a14]">
              {asset.previewUrl ? (
                <img src={asset.previewUrl} alt={asset.label} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
              ) : (
                <AssetPreviewPlaceholder asset={asset} />
              )}
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.1em] text-[#57b6c2]">
                <span>{kindLabels[asset.kind]}</span>
                <span>{publicAssetLayerLabel(asset.layer)}</span>
              </div>
              <h3 className="mt-3 text-base leading-tight text-[#f7f7f4]">{publicAssetDisplayLabel(asset.label)}</h3>
              <p className="mt-2 text-sm text-[#b9c1bc]">{asset.project}</p>
              <div className="public-card-chip-row mt-4">
                <span>{publicAssetRightsLabel(asset.rights)}</span>
                <span>{publicAssetStatusLabel(asset.status)}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#8f9a92]">{publicAssetProvenanceLabel(asset.provenance)}</p>
            </div>
          </a>
          ))}
        </div>
      ) : (
        <div className="mt-6 border-t border-white/12">
          <div className="hidden grid-cols-[90px_minmax(220px,1.2fr)_minmax(180px,0.8fr)_150px_130px] gap-4 border-b border-white/12 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#65705f] md:grid">
            <span>Typ</span>
            <span>Asset</span>
            <span>Projekt</span>
            <span>Ebene</span>
            <span>Status</span>
          </div>
          {visible.map((asset) => (
            <a
              key={asset.id}
              href={asset.url}
              className="grid gap-2 border-b border-white/10 px-3 py-4 transition hover:bg-[#57b6c2]/6 md:grid-cols-[90px_minmax(220px,1.2fr)_minmax(180px,0.8fr)_150px_130px] md:items-center md:gap-4"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#57b6c2]">{kindLabels[asset.kind]}</span>
              <span>
                <strong className="block text-sm font-semibold text-[#f7f7f4]">{publicAssetDisplayLabel(asset.label)}</strong>
                <span className="mt-1 line-clamp-1 block text-[10px] text-[#69736b]">{publicAssetProvenanceLabel(asset.provenance)}</span>
              </span>
              <span className="text-xs text-[#a1aca4]">{asset.project}</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#8f9a92]">{publicAssetLayerLabel(asset.layer)}</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#8f9a92]">{publicAssetRightsLabel(asset.rights)} / {publicAssetStatusLabel(asset.status)}</span>
            </a>
          ))}
        </div>
      )}
      {visible.length < filtered.length ? (
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/12 pt-4">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#65705f]">
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
