/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';

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

const kindLabels: Record<PublicAsset['kind'], string> = {
  image: 'Bild',
  plan: 'Plan',
  section: 'Schnitt',
  model: '3D',
  analysis: 'Analyse'
};
const assetPageSize = 24;

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
      || [asset.label, asset.project, asset.kind, asset.layer, asset.rights, asset.provenance]
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
    <section className="border-t border-white/12 py-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f06a]">Öffentliche Assetdatenbank</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4] sm:text-4xl">Medien, Pläne, Layer und Modelle</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:w-[860px] xl:grid-cols-[1.25fr_0.8fr_1fr_1fr_auto]">
          <label>
            <span className="sr-only">Assets suchen</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Asset, Projekt, Provenienz"
              className="h-11 w-full border border-white/14 bg-[#111514] px-3 text-sm text-[#f7f7f4] outline-none transition focus:border-[#b9f06a]"
            />
          </label>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as PublicAsset['kind'] | 'all')}
            className="h-11 border border-white/14 bg-[#111514] px-3 text-sm text-[#f7f7f4] outline-none transition focus:border-[#b9f06a]"
          >
            <option value="all">Alle Typen</option>
            {Object.entries(kindLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select
            value={layer}
            onChange={(event) => setLayer(event.target.value)}
            className="h-11 border border-white/14 bg-[#111514] px-3 text-sm text-[#f7f7f4] outline-none transition focus:border-[#b9f06a]"
          >
            {layers.map((item) => <option key={item} value={item}>{item === 'all' ? 'Alle Layer' : item.replace(/_/g, ' ')}</option>)}
          </select>
          <select
            value={project}
            onChange={(event) => setProject(event.target.value)}
            className="h-11 border border-white/14 bg-[#111514] px-3 text-sm text-[#f7f7f4] outline-none transition focus:border-[#b9f06a]"
          >
            {projects.map((item) => <option key={item} value={item}>{item === 'all' ? 'Alle Projekte' : item}</option>)}
          </select>
          <div className="grid h-11 grid-cols-2 border border-white/14 bg-[#111514] p-1" aria-label="Ansicht">
            <AssetViewButton active={view === 'grid'} onClick={() => setView('grid')}>Raster</AssetViewButton>
            <AssetViewButton active={view === 'index'} onClick={() => setView('index')}>Index</AssetViewButton>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-3">
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
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b9f06a] transition hover:text-white"
          >
            Filter zurücksetzen
          </button>
        ) : (
          <span className="text-[9px] uppercase tracking-[0.14em] text-[#65705f]">Rights Gate aktiv</span>
        )}
      </div>

      {view === 'grid' ? (
        <div className="mt-6 grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((asset) => (
          <a
            key={asset.id}
            href={asset.url}
            className="group bg-[#0c110d] transition hover:bg-[#12190f]"
          >
            <div className="aspect-[4/3] overflow-hidden border-b border-white/10 bg-[#151a14]">
              {asset.previewUrl ? (
                <img src={asset.previewUrl} alt={asset.label} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-[10px] uppercase tracking-[0.18em] text-[#8ea56b]">{kindLabels[asset.kind]}</div>
              )}
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-[#b9f06a]">
                <span>{kindLabels[asset.kind]}</span>
                <span>{asset.layer.replace(/_/g, ' ')}</span>
              </div>
              <h3 className="mt-3 text-base leading-tight text-[#f7f7f4]">{asset.label}</h3>
              <p className="mt-2 text-sm text-[#b9c1bc]">{asset.project}</p>
              <div className="mt-4 text-[10px] uppercase tracking-[0.12em] text-[#7f8a82]">{asset.rights} / {asset.status}</div>
              <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#8f9a92]">{asset.provenance}</p>
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
            <span>Layer</span>
            <span>Status</span>
          </div>
          {visible.map((asset) => (
            <a
              key={asset.id}
              href={asset.url}
              className="grid gap-2 border-b border-white/10 px-3 py-4 transition hover:bg-[#b9f06a]/6 md:grid-cols-[90px_minmax(220px,1.2fr)_minmax(180px,0.8fr)_150px_130px] md:items-center md:gap-4"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b9f06a]">{kindLabels[asset.kind]}</span>
              <span>
                <strong className="block text-sm font-semibold text-[#f7f7f4]">{asset.label}</strong>
                <span className="mt-1 line-clamp-1 block text-[10px] text-[#69736b]">{asset.provenance}</span>
              </span>
              <span className="text-xs text-[#a1aca4]">{asset.project}</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#8f9a92]">{asset.layer.replace(/_/g, ' ')}</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#8f9a92]">{asset.rights} / {asset.status}</span>
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
            className="border border-[#b9f06a]/45 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b9f06a] transition hover:bg-[#b9f06a] hover:text-[#0b1108]"
          >
            Weitere {Math.min(assetPageSize, filtered.length - visible.length)} laden
          </button>
        </div>
      ) : null}
    </section>
  );
}

function AssetViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`text-[9px] font-semibold uppercase tracking-[0.14em] transition ${
        active ? 'bg-[#b9f06a] text-[#0b1108]' : 'text-[#8f9a92] hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
