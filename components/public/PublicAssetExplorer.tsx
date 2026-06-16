/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo, useState } from 'react';

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

export function PublicAssetExplorer({ assets }: PublicAssetExplorerProps) {
  const [kind, setKind] = useState<PublicAsset['kind'] | 'all'>('all');
  const [layer, setLayer] = useState('all');

  const layers = useMemo(() => ['all', ...Array.from(new Set(assets.map((asset) => asset.layer))).sort()], [assets]);
  const filtered = useMemo(() => assets.filter((asset) => {
    const matchesKind = kind === 'all' || asset.kind === kind;
    const matchesLayer = layer === 'all' || asset.layer === layer;
    return matchesKind && matchesLayer;
  }), [assets, kind, layer]);

  return (
    <section className="border-t border-white/12 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f06a]">Öffentliche Assetdatenbank</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#f7f7f4] sm:text-4xl">Medien, Pläne, Layer und Modelle</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:w-[420px]">
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
        </div>
      </div>

      <div className="mt-4 text-sm text-[#aeb8b2]">{filtered.length} von {assets.length} öffentlichen Assets sichtbar.</div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {filtered.map((asset) => (
          <a
            key={asset.id}
            href={asset.url}
            className="group border border-white/12 bg-[#0c110d] transition hover:border-[#b9f06a]/80"
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
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
