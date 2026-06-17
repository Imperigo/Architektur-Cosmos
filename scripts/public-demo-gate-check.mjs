import fs from 'node:fs';

const entries = JSON.parse(fs.readFileSync('data/mock-entries.json', 'utf8'));
const publicModelPreviews = JSON.parse(fs.readFileSync('data/public-model-previews.json', 'utf8'));

const blockedLicenses = new Set([
  'all_rights_reserved',
  'needs_permission',
  'private_research',
  'personal_only',
  'unknown'
]);
const allowedAssetRights = new Set(['public_domain', 'licensed', 'own_work']);
const privateLeakPatterns = [
  /\/mnt\//i,
  /\/home\//i,
  /source-root/i,
  /private-library/i,
  /onedrive/i,
  /archiv\/architekturkosmos\/assets/i,
  /\.pdf($|\?)/i,
  /archive-intake/i,
  /ocr/i
];

const modelsBySlug = new Map(publicModelPreviews.models.map((model) => [model.slug, model]));
const failures = [];
const warnings = [];

function publicAssetCandidateForMedia(entry, media) {
  if (!media?.url) return undefined;
  return entry.asset_candidates?.find((candidate) => {
    return (!candidate.media_slot || candidate.media_slot === media.type)
      && candidate.local_path === media.url
      && candidate.public_display_allowed
      && allowedAssetRights.has(candidate.rights_status);
  });
}

function publicProjectMediaUrl(entry, media) {
  if (!media?.url) return null;
  const publicByLicense = !blockedLicenses.has(String(media.license ?? ''));
  return publicByLicense || publicAssetCandidateForMedia(entry, media) ? media.url : null;
}

function hasPrivateLeak(value) {
  return privateLeakPatterns.some((pattern) => pattern.test(String(value ?? '')));
}

function recordFailure(id, detail) {
  failures.push({ id, detail });
}

for (const entry of entries) {
  const publicMedia = entry.media.filter((media) => publicProjectMediaUrl(entry, media));
  const hasPublicModel = modelsBySlug.has(entry.slug);
  const status = entry.database_profile?.status;
  const appearsInPublicDemo = publicMedia.length > 0 && (status === 'reviewed' || status === 'published' || hasPublicModel);

  if (!appearsInPublicDemo) continue;

  for (const media of publicMedia) {
    if (hasPrivateLeak(media.url)) {
      recordFailure(`${entry.slug}:${media.type}:url`, `public media url leaks private/source path: ${media.url}`);
    }
    if (hasPrivateLeak(media.source_url) && !publicAssetCandidateForMedia(entry, media)) {
      recordFailure(`${entry.slug}:${media.type}:source`, `public media source leaks private/source path: ${media.source_url}`);
    }
    if (blockedLicenses.has(String(media.license ?? '')) && !publicAssetCandidateForMedia(entry, media)) {
      recordFailure(`${entry.slug}:${media.type}:license`, `blocked media license exposed without approved asset candidate: ${media.license}`);
    }
  }
}

for (const model of publicModelPreviews.models) {
  if (hasPrivateLeak(model.url) || hasPrivateLeak(model.source_path)) {
    recordFailure(`${model.slug}:model-path`, `public model preview has private/source path: ${model.url} / ${model.source_path}`);
  }
  if (String(model.public_display_status ?? '').toLowerCase().includes('private')) {
    recordFailure(`${model.slug}:model-status`, `public model preview status is not public-safe: ${model.public_display_status}`);
  }
}

const villa = entries.find((entry) => entry.slug === 'villa-savoye');
if (!villa) {
  recordFailure('villa-savoye:missing', 'Villa Savoye pilot entry is missing.');
} else {
  for (const type of ['plan', 'section']) {
    const media = villa.media.find((item) => item.type === type);
    const candidate = publicAssetCandidateForMedia(villa, media);
    if (!media || !candidate) {
      recordFailure(`villa-savoye:${type}:candidate`, `${type} is not public-displayable through an approved own-work asset candidate.`);
    }
  }
  const reviewedLayers = (villa.analysis_layers ?? []).filter((layer) => layer.review_status === 'reviewed' || layer.review_status === 'verified').length;
  if (reviewedLayers < 4) {
    warnings.push({ id: 'villa-savoye:layers', detail: `Only ${reviewedLayers} reviewed/verified analysis layers.` });
  }
}

const summary = {
  status: failures.length === 0 ? 'passed' : 'failed',
  checked_public_entries: entries.filter((entry) => entry.media.some((media) => publicProjectMediaUrl(entry, media))).length,
  checked_public_models: publicModelPreviews.models.length,
  failures,
  warnings
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
