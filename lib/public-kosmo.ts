import entries from '@/data/mock-entries.json';
import publicModelPreviews from '@/data/public-model-previews.json';
import { primaryPublicMediaUrl, publicDisplayMediaUrl } from '@/lib/media';
import type { AssetCandidate, Entry, EntryMedia } from '@/lib/types';
import type { PublicAsset } from '@/components/public/PublicAssetExplorer';
import type { PublicReference } from '@/components/public/PublicReferenceExplorer';

const allEntries = entries as Entry[];
const publicModels = publicModelPreviews.models as Array<{ slug: string; title: string; url: string; status: string; license: string; public_display_status: string; caveat: string }>;
const publicModelBySlug = new Map(publicModels.map((model) => [model.slug, model]));
const publicAssetRights = new Set(['public_domain', 'licensed', 'own_work']);

export function publicReferenceEntries() {
  return allEntries
    .filter((entry) => {
      const hasPublicMedia = entry.media.some((media) => publicProjectMediaUrl(entry, media));
      const status = entry.database_profile?.status;
      return hasPublicMedia && (status === 'reviewed' || status === 'published' || publicModelBySlug.has(entry.slug));
    })
    .sort((left, right) => publicReferenceWeight(right) - publicReferenceWeight(left));
}

export function publicReferences(): PublicReference[] {
  return publicReferenceEntries().map((entry) => ({
    slug: entry.slug,
    title: entry.title,
    year: entry.year_start,
    authors: entry.authors,
    location: [entry.city, entry.country].filter(Boolean).join(', '),
    style: entry.style_sector,
    type: entry.entry_type,
    summary: entry.one_sentence || entry.short_description,
    imageUrl: primaryPublicProjectMediaUrl(entry),
    imageCredit: entry.media.find((media) => publicProjectMediaUrl(entry, media))?.credit ?? null,
    tags: entry.database_tags ?? entry.themes,
    materials: materialTags(entry),
    hasModel: publicModelBySlug.has(entry.slug),
    mediaCount: entry.media.filter((media) => publicProjectMediaUrl(entry, media)).length,
    analysisCount: entry.analysis_layers?.length ?? 0,
    gateStatus: publicGateStatus(entry),
    readinessScore: publicReadinessScore(entry)
  }));
}

export function villaSavoyeEntry() {
  return allEntries.find((entry) => entry.slug === 'villa-savoye') as Entry;
}

export function villaSavoyeModelUrl() {
  return publicModelBySlug.get('villa-savoye')?.url ?? '/archive-models/villa-savoye/low.glb';
}

export function publicAssets(): PublicAsset[] {
  const assets: PublicAsset[] = [];

  for (const entry of publicReferenceEntries()) {
    for (const media of entry.media) {
      const url = publicProjectMediaUrl(entry, media);
      if (!url) continue;
      const candidate = publicAssetCandidateForMedia(entry, media);
      assets.push({
        id: `${entry.slug}-${media.type}`,
        project: entry.title,
        kind: media.type === 'plan' ? 'plan' : media.type === 'section' ? 'section' : 'image',
        label: media.label,
        url,
        previewUrl: media.type === 'plan' || media.type === 'section' ? url : url,
        rights: candidate?.rights_status ?? media.license ?? 'reviewed',
        layer: media.type,
        status: candidate ? 'public_display_allowed' : 'public_display',
        provenance: media.credit ?? candidate?.planned_r2_key ?? 'public gate'
      });
    }

    for (const layer of entry.analysis_layers ?? []) {
      assets.push({
        id: `${entry.slug}-analysis-${layer.analysis_type}`,
        project: entry.title,
        kind: 'analysis',
        label: `${entry.title}: ${layer.analysis_type.replace(/_/g, ' ')}`,
        url: `/atlas/${entry.slug}/#model-viewer`,
        rights: 'metadata_only',
        layer: layer.analysis_type,
        status: layer.review_status,
        provenance: layer.r2_key ?? 'analysis metadata'
      });
    }
  }

  for (const model of publicModels) {
    assets.push({
      id: `${model.slug}-model`,
      project: model.title,
      kind: 'model',
      label: `${model.title}: öffentliches GLB-Preview`,
      url: model.url,
      rights: model.license,
      layer: '3d_preview',
      status: model.public_display_status,
      provenance: model.caveat
    });
  }

  return assets.sort((left, right) => `${left.project}-${left.kind}`.localeCompare(`${right.project}-${right.kind}`));
}

export function materialTags(entry: Entry) {
  const materialSet = new Set<string>();
  entry.materials?.primary?.forEach((item) => materialSet.add(item));
  entry.materials?.secondary?.forEach((item) => materialSet.add(item));
  entry.database_tags?.forEach((tag) => {
    if (tag.startsWith('material:')) materialSet.add(tag.replace('material:', ''));
    if (tag.startsWith('structure:')) materialSet.add(tag.replace('structure:', ''));
  });
  return [...materialSet].slice(0, 8);
}

function publicReferenceWeight(entry: Entry) {
  return (entry.slug === 'villa-savoye' ? 1000 : 0)
    + (publicModelBySlug.has(entry.slug) ? 180 : 0)
    + (entry.database_profile?.status === 'reviewed' ? 100 : 0)
    + (entry.analysis_layers?.length ?? 0) * 8
    + entry.media.filter((media) => publicProjectMediaUrl(entry, media)).length * 12
    + (entry.database_tags?.length ?? 0);
}

export function publicProjectMediaUrl(entry: Entry, media: EntryMedia | undefined) {
  if (!media) return null;
  return publicDisplayMediaUrl(media) ?? (publicAssetCandidateForMedia(entry, media) ? media.url ?? null : null);
}

export function primaryPublicProjectMediaUrl(entry: Entry) {
  return entry.media.find((media) => media.type === 'exterior' && publicProjectMediaUrl(entry, media))?.url
    ?? entry.media.find((media) => publicProjectMediaUrl(entry, media))?.url
    ?? primaryPublicMediaUrl(entry);
}

export function publicAssetCandidateForMedia(entry: Entry, media: EntryMedia | undefined): AssetCandidate | undefined {
  if (!media?.url) return undefined;
  return entry.asset_candidates?.find((candidate) => {
    const matchesSlot = !candidate.media_slot || candidate.media_slot === media.type;
    const matchesPath = candidate.local_path === media.url;
    return matchesSlot
      && matchesPath
      && candidate.public_display_allowed
      && publicAssetRights.has(candidate.rights_status);
  });
}

export function publicGateStatus(entry: Entry) {
  const mediaReady = entry.media.filter((media) => publicProjectMediaUrl(entry, media)).length;
  const analysisReady = (entry.analysis_layers ?? []).filter((layer) => layer.review_status === 'reviewed' || layer.review_status === 'verified').length;
  const hasModel = publicModelBySlug.has(entry.slug);
  if (mediaReady >= 3 && analysisReady >= 3 && hasModel) return 'public pilot ready';
  if (mediaReady > 0 && (analysisReady > 0 || hasModel)) return 'public review demo';
  return 'source review only';
}

export function publicReadinessScore(entry: Entry) {
  const mediaReady = Math.min(4, entry.media.filter((media) => publicProjectMediaUrl(entry, media)).length) * 15;
  const analysisReady = Math.min(6, (entry.analysis_layers ?? []).filter((layer) => layer.review_status === 'reviewed' || layer.review_status === 'verified').length) * 5;
  const modelReady = publicModelBySlug.has(entry.slug) ? 10 : 0;
  return Math.min(100, mediaReady + analysisReady + modelReady);
}

export function villaSavoyeReadiness() {
  const villa = villaSavoyeEntry();
  const reviewedLayers = (villa.analysis_layers ?? []).filter((layer) => layer.review_status === 'reviewed' || layer.review_status === 'verified').length;
  const mediaReady = villa.media.filter((media) => publicProjectMediaUrl(villa, media)).length;
  const model = publicModelBySlug.get(villa.slug);

  return [
    {
      label: 'Public media gate',
      status: 'ready',
      detail: `${mediaReady} display-safe Medien inkl. eigener Plan-/Schnittdiagramme.`
    },
    {
      label: 'Analyse-Layer',
      status: 'reviewed',
      detail: `${reviewedLayers}/${villa.analysis_layers?.length ?? 0} Layer sind reviewed oder verified.`
    },
    {
      label: '3D Preview',
      status: model ? 'public preview' : 'missing',
      detail: model?.caveat ?? 'Noch kein oeffentliches Preview-Modell.'
    },
    {
      label: 'KosmoPublish IFC-Pläne',
      status: 'upstream gate',
      detail: 'MCP-Tool ist integriert; belastbare Plan-Renderings warten auf wandhaltige IFCs aus KosmoDraw/KosmoPrepare.'
    }
  ];
}

export function villaSavoyeAssetTaxonomy() {
  return [
    {
      title: 'Pilotis / Tragstruktur',
      kind: 'structure',
      detail: 'Stuetzenraster, Stahlbeton-Skelett, freie Fassade und freier Grundriss als wiederverwendbare Strukturprinzipien.'
    },
    {
      title: 'Promenade / Rampe',
      kind: 'circulation',
      detail: 'Ankommen unter dem Volumen, Rampe, Wohnebene und Dachgarten als Bewegungssequenz.'
    },
    {
      title: 'Materialsystem',
      kind: 'material',
      detail: 'Reinforced concrete, weisser Putz, Glasbaender, Stahl und Dachgarten als Materialfilter.'
    },
    {
      title: 'Plan-/Schnittdiagramme',
      kind: 'drawing',
      detail: 'Eigene diagrammatische SVG-Rekonstruktionen, nicht vermessene Bauplaene.'
    }
  ];
}
