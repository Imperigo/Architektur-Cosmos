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
  /\bocr\b/i
];

const modelsBySlug = new Map(publicModelPreviews.models.map((model) => [model.slug, model]));
const failures = [];
const warnings = [];
const publicRoutes = [
  '/',
  '/orbit/',
  '/references/',
  '/assets/',
  '/atlas/villa-savoye/',
  '/atlas/alterszentrum-kloster-ingenbohl/',
  '/sitemap.xml'
];

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

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

function checkDataSurfaces() {
  for (const entry of entries) {
    const publicMedia = entry.media.filter((media) => publicProjectMediaUrl(entry, media));
    const hasPublicModel = modelsBySlug.has(entry.slug);
    const status = entry.database_profile?.status;
    const appearsInPublicDemo = (publicMedia.length > 0 || hasPublicModel) && (status === 'reviewed' || status === 'published' || hasPublicModel);

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

  const ingenbohl = entries.find((entry) => entry.slug === 'alterszentrum-kloster-ingenbohl');
  if (!ingenbohl) {
    recordFailure('alterszentrum-kloster-ingenbohl:missing', 'Ingenbohl pilot entry is missing.');
  } else {
    const publicMedia = ingenbohl.media.filter((media) => publicProjectMediaUrl(ingenbohl, media));
    const reviewedLayers = (ingenbohl.analysis_layers ?? []).filter((layer) => layer.review_status === 'reviewed' || layer.review_status === 'verified').length;
    if (publicMedia.length > 0) {
      warnings.push({ id: 'alterszentrum-kloster-ingenbohl:media', detail: `Ingenbohl exposes ${publicMedia.length} public media slots; verify owner approval.` });
    }
    if (!modelsBySlug.has(ingenbohl.slug)) {
      recordFailure('alterszentrum-kloster-ingenbohl:model', 'Ingenbohl public pilot needs a public GLB preview.');
    }
    if (reviewedLayers < 4) {
      warnings.push({ id: 'alterszentrum-kloster-ingenbohl:layers', detail: `Only ${reviewedLayers} reviewed/verified analysis layers.` });
    }
  }
}

async function checkRenderedRoutes(baseUrl) {
  if (!baseUrl) return [];
  const checkedRoutes = [];
  const normalizedBase = baseUrl.replace(/\/$/, '');

  for (const route of publicRoutes) {
    const url = `${normalizedBase}${route}`;
    checkedRoutes.push(route);
    let response;
    try {
      response = await fetch(url);
    } catch (error) {
      recordFailure(`route:${route}:fetch`, `failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    if (!response.ok) {
      recordFailure(`route:${route}:status`, `route ${url} returned HTTP ${response.status}`);
      continue;
    }

    const body = await response.text();
    if (hasPrivateLeak(body)) {
      recordFailure(`route:${route}:leak`, `rendered route contains a blocked private/source pattern.`);
    }
  }

  return checkedRoutes;
}

async function main() {
  checkDataSurfaces();
  const checkedRoutes = await checkRenderedRoutes(argValue('--base-url') ?? process.env.PUBLIC_GATE_BASE_URL ?? null);

  const summary = {
    status: failures.length === 0 ? 'passed' : 'failed',
    checked_public_entries: entries.filter((entry) => entry.media.some((media) => publicProjectMediaUrl(entry, media)) || modelsBySlug.has(entry.slug)).length,
    checked_public_models: publicModelPreviews.models.length,
    checked_routes: checkedRoutes,
    failures,
    warnings
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
