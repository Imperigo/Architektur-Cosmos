import entries from '@/data/mock-entries.json';
import publicModelPreviews from '@/data/public-model-previews.json';
import { primaryPublicMediaUrl, publicDisplayMediaUrl } from '@/lib/media';
import type { Entry } from '@/lib/types';
import type { PublicAsset } from '@/components/public/PublicAssetExplorer';
import type { PublicReference } from '@/components/public/PublicReferenceExplorer';

const allEntries = entries as Entry[];
const publicModels = publicModelPreviews.models as Array<{ slug: string; title: string; url: string; status: string; license: string; public_display_status: string; caveat: string }>;
const publicModelBySlug = new Map(publicModels.map((model) => [model.slug, model]));

export function publicReferenceEntries() {
  return allEntries
    .filter((entry) => {
      const hasPublicMedia = entry.media.some((media) => publicDisplayMediaUrl(media));
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
    imageUrl: primaryPublicMediaUrl(entry),
    imageCredit: entry.media.find((media) => publicDisplayMediaUrl(media))?.credit ?? null,
    tags: entry.database_tags ?? entry.themes,
    materials: materialTags(entry),
    hasModel: publicModelBySlug.has(entry.slug),
    mediaCount: entry.media.filter((media) => publicDisplayMediaUrl(media)).length,
    analysisCount: entry.analysis_layers?.length ?? 0
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
      const url = publicDisplayMediaUrl(media);
      if (!url) continue;
      assets.push({
        id: `${entry.slug}-${media.type}`,
        project: entry.title,
        kind: media.type === 'plan' ? 'plan' : media.type === 'section' ? 'section' : 'image',
        label: media.label,
        url,
        previewUrl: media.type === 'plan' || media.type === 'section' ? url : url,
        rights: media.license ?? 'reviewed',
        layer: media.type,
        status: 'public_display'
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
        status: layer.review_status
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
      status: model.public_display_status
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
    + entry.media.filter((media) => publicDisplayMediaUrl(media)).length * 12
    + (entry.database_tags?.length ?? 0);
}
