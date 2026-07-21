#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { publicLeakMatches } from './public-leak-patterns.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const publicRouteChecks = await loadPublicRouteChecks(args.manifest || 'scripts/public-route-manifest.mjs');
const entries = JSON.parse(readFileSync(resolve(root, 'data/mock-entries.json'), 'utf8'));
const failures = [];
const warnings = [];
const seen = new Set();
const sourceChecks = [];
const atlasSlugs = new Set(entries.map((entry) => entry.slug));
const requiredRoutes = new Set([
  '/',
  '/atlas/',
  '/references/',
  '/assets/',
  '/orbit/',
  '/robots.txt',
  '/sitemap.xml'
]);
const allowedStaticExtensions = new Set(['.svg', '.txt', '.xml']);
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

for (const route of publicRouteChecks) {
  checkRoute(route);
}

for (const requiredRoute of requiredRoutes) {
  if (!seen.has(requiredRoute)) {
    failures.push({
      id: `required:${requiredRoute}`,
      detail: `Required public route is missing from manifest: ${requiredRoute}`
    });
  }
}

const summary = {
  status: failures.length === 0 ? 'passed' : 'failed',
  checked_route_count: publicRouteChecks.length,
  required_route_count: requiredRoutes.size,
  source_checks: sourceChecks,
  failures,
  warnings
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length > 0) process.exit(1);

async function loadPublicRouteChecks(manifestPath) {
  const manifestUrl = manifestPath.startsWith('file:')
    ? new URL(manifestPath)
    : pathToFileURL(resolve(root, manifestPath));
  const manifest = await import(manifestUrl.href);
  if (!Array.isArray(manifest.publicRouteChecks)) {
    throw new Error(`Manifest ${manifestUrl.href} must export publicRouteChecks as an array.`);
  }
  return manifest.publicRouteChecks;
}

function checkRoute(route) {
  if (!route || typeof route !== 'object') {
    failures.push({ id: 'route:shape', detail: 'Manifest entry must be an object.' });
    return;
  }

  const path = route.path;
  if (typeof path !== 'string' || path.trim().length === 0) {
    failures.push({ id: 'route:path', detail: 'Manifest entry is missing a non-empty string path.' });
    return;
  }

  if (seen.has(path)) {
    failures.push({ id: `route:${path}:duplicate`, detail: `Duplicate public route path: ${path}` });
  }
  seen.add(path);

  if (!path.startsWith('/')) {
    failures.push({ id: `route:${path}:absolute`, detail: `Public route path must start with /: ${path}` });
  }

  if (path.includes('?') || path.includes('#')) {
    failures.push({
      id: `route:${path}:fragment-or-query`,
      detail: `Public route path must not include query strings or fragments: ${path}`
    });
  }

  if (path.includes('\\')) {
    failures.push({
      id: `route:${path}:backslash`,
      detail: `Public route path must use forward slashes only: ${path}`
    });
  }

  const unsafeSegment = path.split('/').find((segment) => segment === '.' || segment === '..');
  if (unsafeSegment) {
    failures.push({
      id: `route:${path}:dot-segment`,
      detail: `Public route path must not include ${unsafeSegment} path segments: ${path}`
    });
  }

  if (path.includes('//')) {
    failures.push({ id: `route:${path}:double-slash`, detail: `Public route path must not contain //: ${path}` });
  }

  if (path !== '/' && !hasKnownStaticExtension(path) && !path.endsWith('/')) {
    failures.push({
      id: `route:${path}:trailing-slash`,
      detail: `HTML public route path must use a trailing slash: ${path}`
    });
  }

  const blockedPattern = blockedRoutePatterns.find((pattern) => pattern.test(path));
  if (blockedPattern) {
    failures.push({
      id: `route:${path}:blocked-surface`,
      detail: `Public route manifest must not expose private/admin/source surfaces: ${blockedPattern}`
    });
  }

  const routeLeakMatches = publicLeakMatches(path);
  if (routeLeakMatches.length > 0) {
    failures.push({
      id: `route:${path}:private-pattern`,
      detail: `Public route path matches private/source leak patterns: ${routeLeakMatches.join(', ')}`
    });
  }

  checkRouteSource(path);

  const includes = route.includes ?? [];
  const rawIncludes = route.rawIncludes ?? [];
  if (!Array.isArray(includes) || !Array.isArray(rawIncludes)) {
    failures.push({
      id: `route:${path}:sentinel-array`,
      detail: `Route sentinels must be arrays for ${path}.`
    });
    return;
  }

  if (includes.length + rawIncludes.length === 0) {
    failures.push({
      id: `route:${path}:sentinel-missing`,
      detail: `Route ${path} must declare at least one content sentinel.`
    });
  }

  for (const [kind, values] of [['includes', includes], ['rawIncludes', rawIncludes]]) {
    for (const value of values) {
      checkSentinel(path, kind, value);
    }
  }

  if (route.minBodyLength !== undefined && (!Number.isInteger(route.minBodyLength) || route.minBodyLength < 1)) {
    failures.push({
      id: `route:${path}:min-body-length`,
      detail: `minBodyLength must be a positive integer for ${path}.`
    });
  }
}

function checkRouteSource(path) {
  const result = sourceCandidatesForRoute(path);
  sourceChecks.push({
    path,
    kind: result.kind,
    candidates: result.candidates,
    matched: result.matched,
    atlas_slug: result.atlasSlug ?? null
  });

  if (result.atlasSlug && !atlasSlugs.has(result.atlasSlug)) {
    failures.push({
      id: `route:${path}:atlas-slug`,
      detail: `Atlas detail route references a slug that is missing from data/mock-entries.json: ${result.atlasSlug}`
    });
  }

  if (!result.matched) {
    failures.push({
      id: `route:${path}:source-missing`,
      detail: `Public route manifest path has no matching app/public source file: ${path}`
    });
  }
}

function sourceCandidatesForRoute(path) {
  if (path === '/') {
    return routeSourceResult(path, 'app_route', ['app/page.tsx']);
  }

  if (path === '/robots.txt') {
    return routeSourceResult(path, 'metadata_route', ['app/robots.ts', 'public/robots.txt']);
  }

  if (path === '/sitemap.xml') {
    return routeSourceResult(path, 'metadata_route', ['app/sitemap.ts', 'public/sitemap.xml']);
  }

  if (path === '/icon.svg') {
    return routeSourceResult(path, 'metadata_asset', ['app/icon.svg', 'public/icon.svg']);
  }

  const atlasMatch = path.match(/^\/atlas\/([^/]+)\/$/);
  if (atlasMatch) {
    return {
      ...routeSourceResult(path, 'dynamic_atlas_route', ['app/atlas/[slug]/page.tsx']),
      atlasSlug: atlasMatch[1]
    };
  }

  if (path.endsWith('/')) {
    const routePath = path.replace(/^\/+|\/+$/g, '');
    return routeSourceResult(path, 'app_route', [`app/${routePath}/page.tsx`]);
  }

  return routeSourceResult(path, 'public_asset', [`public${path}`]);
}

function routeSourceResult(path, kind, candidates) {
  return {
    path,
    kind,
    candidates,
    matched: candidates.some((candidate) => existsSync(resolve(root, candidate)))
  };
}

function checkSentinel(path, kind, value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    failures.push({
      id: `route:${path}:${kind}:empty`,
      detail: `Route ${path} has an empty ${kind} sentinel.`
    });
    return;
  }

  const leakMatches = publicLeakMatches(value);
  if (leakMatches.length > 0) {
    failures.push({
      id: `route:${path}:${kind}:private-pattern`,
      detail: `Route ${path} sentinel matches private/source leak patterns: ${leakMatches.join(', ')}`
    });
  }
}

function hasKnownStaticExtension(path) {
  const match = path.match(/\.[a-z0-9]+$/i);
  if (!match) return false;
  if (allowedStaticExtensions.has(match[0].toLowerCase())) return true;
  warnings.push({
    id: `route:${path}:static-extension`,
    detail: `Route uses an unrecognized static extension: ${path}`
  });
  return true;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
