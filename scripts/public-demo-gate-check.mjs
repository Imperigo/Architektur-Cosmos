import fs from 'node:fs';
import path from 'node:path';
import { publicLeakMatches } from './public-leak-patterns.mjs';
import { publicRouteChecks, publicRoutes } from './public-route-manifest.mjs';

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
const modelsBySlug = new Map(publicModelPreviews.models.map((model) => [model.slug, model]));
const failures = [];
const warnings = [];
const requiredManifestRoutes = new Set([
  '/',
  '/atlas/',
  '/references/',
  '/assets/',
  '/orbit/',
  '/robots.txt',
  '/sitemap.xml'
]);
const allowedManifestStaticExtensions = new Set(['.svg', '.txt', '.xml']);
const blockedRoutePatterns = [
  /(^|\/)admin(\/|$)/i,
  /(^|\/)private(\/|$)/i,
  /(^|\/)source-root(\/|$)/i,
  /(^|\/)archive-intake(\/|$)/i,
  /(^|\/)_overseer(\/|$)/i,
  /(^|\/)worker[-_]?logs?(\/|$)/i,
  /(^|\/)\.codex(\/|$)/i,
  /(^|\/)\.claude(\/|$)/i
];
function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function hasFlag(name) {
  return process.argv.includes(name);
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
  return publicLeakMatches(value ?? '').length > 0;
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

function checkRouteManifestSurfaces() {
  const routePaths = publicRouteChecks.map((route) => route.path);
  const seen = new Set();

  if (routePaths.length === 0) {
    recordFailure('route-manifest:empty', 'public route manifest has no routes.');
  }

  for (const route of publicRouteChecks) {
    if (!route?.path || typeof route.path !== 'string') {
      recordFailure('route-manifest:path', 'public route manifest entry is missing a string path.');
      continue;
    }

    if (seen.has(route.path)) {
      recordFailure(`route-manifest:${route.path}:duplicate`, `duplicate public route path: ${route.path}`);
    }
    seen.add(route.path);

    if (!route.path.startsWith('/')) {
      recordFailure(`route-manifest:${route.path}:absolute`, `public route path must start with /: ${route.path}`);
    }
    if (route.path.includes('?') || route.path.includes('#')) {
      recordFailure(
        `route-manifest:${route.path}:fragment-or-query`,
        `public route path must not include query strings or fragments: ${route.path}`
      );
    }
    if (route.path.includes('\\')) {
      recordFailure(`route-manifest:${route.path}:backslash`, `public route path must use forward slashes only: ${route.path}`);
    }
    const unsafeSegment = route.path.split('/').find((segment) => segment === '.' || segment === '..');
    if (unsafeSegment) {
      recordFailure(
        `route-manifest:${route.path}:dot-segment`,
        `public route path must not include ${unsafeSegment} path segments: ${route.path}`
      );
    }
    if (route.path.includes('//')) {
      recordFailure(`route-manifest:${route.path}:double-slash`, `public route path must not contain //: ${route.path}`);
    }
    if (route.path !== '/' && !hasKnownManifestStaticExtension(route.path) && !route.path.endsWith('/')) {
      recordFailure(`route-manifest:${route.path}:trailing-slash`, `HTML public route path must use a trailing slash: ${route.path}`);
    }
    const blockedPattern = blockedRoutePatterns.find((pattern) => pattern.test(route.path));
    if (blockedPattern) {
      recordFailure(
        `route-manifest:${route.path}:blocked-surface`,
        `public route manifest must not expose private/admin/source surfaces: ${blockedPattern}`
      );
    }
    if (hasPrivateLeak(route.path)) {
      recordFailure(`route-manifest:${route.path}:path-leak`, `public route path leaks private/source pattern: ${route.path}`);
    }
    if (route.minBodyLength !== undefined && (!Number.isInteger(route.minBodyLength) || route.minBodyLength < 1)) {
      recordFailure(`route-manifest:${route.path}:min-body-length`, `minBodyLength must be a positive integer for ${route.path}.`);
    }

    const includes = route.includes ?? [];
    const rawIncludes = route.rawIncludes ?? [];
    if (!Array.isArray(includes) || !Array.isArray(rawIncludes)) {
      recordFailure(`route-manifest:${route.path}:sentinel-array`, `route sentinels must be arrays for ${route.path}.`);
      continue;
    }
    if (includes.length + rawIncludes.length === 0) {
      recordFailure(`route-manifest:${route.path}:sentinel-missing`, `route ${route.path} must declare at least one content sentinel.`);
    }

    for (const expected of [...includes, ...rawIncludes]) {
      if (typeof expected !== 'string' || expected.trim().length === 0) {
        recordFailure(`route-manifest:${route.path}:empty-sentinel`, `route ${route.path} has an empty include sentinel.`);
      }
      if (hasPrivateLeak(expected)) {
        recordFailure(`route-manifest:${route.path}:sentinel-leak`, `route ${route.path} sentinel leaks private/source pattern: ${expected}`);
      }
    }
  }

  for (const requiredRoute of requiredManifestRoutes) {
    if (!seen.has(requiredRoute)) {
      recordFailure(`route-manifest:${requiredRoute}:required`, `required public route missing from manifest: ${requiredRoute}`);
    }
  }

  return [...routePaths].sort();
}

function hasKnownManifestStaticExtension(path) {
  const match = path.match(/\.[a-z0-9]+$/i);
  if (!match) return false;
  if (allowedManifestStaticExtensions.has(match[0].toLowerCase())) return true;
  warnings.push({
    id: `route-manifest:${path}:static-extension`,
    detail: `Route uses an unrecognized static extension: ${path}`
  });
  return true;
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
    const leakMatches = publicLeakMatches(body);
    if (leakMatches.length > 0) {
      recordFailure(`route:${route}:leak`, `rendered route contains blocked private/source patterns: ${leakMatches.join(', ')}`);
    }
  }

  return checkedRoutes;
}

function checkStaticExportRoutes(outDir = 'out') {
  const checkedRoutes = [];
  const outRoot = path.resolve(outDir);

  if (!fs.existsSync(outRoot)) {
    if (hasFlag('--require-static-export')) {
      recordFailure(
        'static-export:out:missing',
        `static export directory is missing and --require-static-export was passed: ${path.relative(process.cwd(), outRoot)}`
      );
      return {
        status: 'failed_missing_out',
        out_dir: outDir,
        checked_routes: checkedRoutes
      };
    }
    return {
      status: 'skipped_missing_out',
      out_dir: outDir,
      checked_routes: checkedRoutes
    };
  }

  for (const route of publicRouteChecks) {
    const filePath = staticFilePath(outRoot, route.path);
    checkedRoutes.push(route.path);

    if (!fs.existsSync(filePath)) {
      recordFailure(`static-route:${route.path}:file`, `exported route file is missing: ${path.relative(process.cwd(), filePath)}`);
      continue;
    }

    const body = fs.readFileSync(filePath, 'utf8');
    const normalized = normalizeHtmlText(body);
    const minBodyLength = route.minBodyLength ?? 500;
    const leakMatches = publicLeakMatches(body);

    if (body.length < minBodyLength) {
      recordFailure(`static-route:${route.path}:min-body-length`, `exported route body is too short: ${body.length} < ${minBodyLength}`);
    }

    for (const expected of route.includes ?? []) {
      if (!normalized.includes(expected)) {
        recordFailure(`static-route:${route.path}:includes:${expected}`, `exported route is missing normalized sentinel: ${expected}`);
      }
    }

    for (const expected of route.rawIncludes ?? []) {
      if (!body.includes(expected)) {
        recordFailure(`static-route:${route.path}:raw-includes:${expected}`, `exported route is missing raw sentinel: ${expected}`);
      }
    }

    if (leakMatches.length > 0) {
      recordFailure(`static-route:${route.path}:leak`, `exported route contains blocked private/source patterns: ${leakMatches.join(', ')}`);
    }
  }

  return {
    status: 'checked',
    out_dir: outDir,
    checked_routes: checkedRoutes
  };
}

function staticFilePath(outRoot, routePath) {
  if (routePath === '/') return path.join(outRoot, 'index.html');
  const normalized = routePath.replace(/^\/+/, '');
  if (/\.[a-z0-9]+$/i.test(normalized)) return path.join(outRoot, normalized);
  return path.join(outRoot, normalized, 'index.html');
}

function normalizeHtmlText(value) {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  checkDataSurfaces();
  const checkedRouteManifest = checkRouteManifestSurfaces();
  const checkedRoutes = await checkRenderedRoutes(argValue('--base-url') ?? process.env.PUBLIC_GATE_BASE_URL ?? null);
  const staticExport = checkStaticExportRoutes(argValue('--static-out') ?? process.env.PUBLIC_GATE_STATIC_OUT ?? 'out');

  const summary = {
    status: failures.length === 0 ? 'passed' : 'failed',
    checked_public_entries: entries.filter((entry) => entry.media.some((media) => publicProjectMediaUrl(entry, media)) || modelsBySlug.has(entry.slug)).length,
    checked_public_models: publicModelPreviews.models.length,
    checked_route_manifest: checkedRouteManifest,
    checked_routes: checkedRoutes,
    checked_static_routes: staticExport.checked_routes,
    static_export: {
      status: staticExport.status,
      out_dir: staticExport.out_dir
    },
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
