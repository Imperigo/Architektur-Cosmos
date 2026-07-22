#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { publicLeakMatches } from './public-leak-patterns.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const appDir = resolve(root, args['app-dir'] || 'app');
const entriesPath = resolve(root, args.entries || 'data/mock-entries.json');
const manifestPath = resolve(root, args.manifest || 'scripts/public-route-manifest.mjs');
const blockedPublicSourceRoutePatterns = [
  /(^|\/)admin(\/|$)/i,
  /(^|\/)private(\/|$)/i,
  /(^|\/)source-root(\/|$)/i,
  /(^|\/)archive-intake(\/|$)/i,
  /(^|\/)owner-inbox(\/|$)/i,
  /(^|\/)handoffs?(\/|$)/i,
  /(^|\/)codex-handoffs?(\/|$)/i,
  /(^|\/)codex-memory(\/|$)/i,
  /(^|\/)09[-_]?codex[-_]?memory(\/|$)/i,
  /(^|\/)kosmo[-_]?orbit(\/|$)/i,
  /(^|\/)kosmo[-_]?references(\/|$)/i,
  /(^|\/)kosmo[-_]?asset(\/|$)/i,
  /(^|\/)intake\/inbox(\/|$)/i,
  /(^|\/)_overseer(\/|$)/i,
  /(^|\/)worker[-_]?logs?(\/|$)/i,
  /(^|\/)\.codex(\/|$)/i,
  /(^|\/)\.claude(\/|$)/i
];
const knownMetadataSources = new Map([
  ['robots.ts', '/robots.txt'],
  ['sitemap.ts', '/sitemap.xml'],
  ['icon.svg', '/icon.svg']
]);

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const manifest = await loadRouteManifest(manifestPath);
  const publicRoutes = new Set(manifest.publicRoutes);
  const publicRouteChecks = manifest.publicRouteChecks;
  const entries = JSON.parse(readFileSync(entriesPath, 'utf8'));
  const atlasSlugs = new Set(entries.map((entry) => entry.slug));
  const sourceFiles = await collectPublicSourceFiles(appDir);
  const sourceChecks = sourceFiles.map((filePath) => checkSourceRoute(filePath, publicRoutes, publicRouteChecks, atlasSlugs));
  const failures = sourceChecks.flatMap((check) => check.failures);

  const report = {
    status: failures.length === 0 ? 'passed' : 'failed',
    checked_source_count: sourceChecks.length,
    checked_static_source_count: sourceChecks.filter((check) => check.kind !== 'dynamic_route').length,
    checked_dynamic_source_count: sourceChecks.filter((check) => check.kind === 'dynamic_route').length,
    manifest_route_count: publicRoutes.size,
    source_checks: sourceChecks,
    failures
  };

  console.log(JSON.stringify(report, null, 2));
  if (failures.length > 0) process.exit(1);
}

async function loadRouteManifest(filePath) {
  const manifestUrl = pathToFileURL(resolve(root, filePath)).href;
  const manifest = await import(manifestUrl);
  if (!Array.isArray(manifest.publicRouteChecks)) {
    throw new Error(`Manifest ${relative(root, resolve(root, filePath))} must export publicRouteChecks as an array.`);
  }
  if (!Array.isArray(manifest.publicRoutes)) {
    throw new Error(`Manifest ${relative(root, resolve(root, filePath))} must export publicRoutes as an array.`);
  }
  return manifest;
}

async function collectPublicSourceFiles(directory) {
  if (!existsSync(directory)) return [];
  const collected = [];
  const items = await readdir(directory, { withFileTypes: true });
  for (const item of items) {
    const absolutePath = resolve(directory, item.name);
    if (item.isDirectory()) {
      collected.push(...await collectPublicSourceFiles(absolutePath));
      continue;
    }
    if (item.isFile() && isPublicRouteSourceFile(absolutePath)) {
      collected.push(absolutePath);
    }
  }
  return collected.sort();
}

function isPublicRouteSourceFile(filePath) {
  const relativePath = relative(appDir, filePath).replace(/\\/g, '/');
  const fileName = relativePath.split('/').at(-1);
  return /^page\.(t|j)sx?$/.test(fileName) || knownMetadataSources.has(relativePath);
}

function checkSourceRoute(filePath, publicRoutes, publicRouteChecks, atlasSlugs) {
  const source = sourceDescriptor(filePath);
  const failures = [];
  const pathMatches = publicLeakMatches(source.route);
  const sourceMatches = publicLeakMatches(source.file);
  const blockedPattern = blockedPublicSourceRoutePatterns.find((pattern) => pattern.test(source.route) || pattern.test(source.file));

  if (pathMatches.length > 0 || sourceMatches.length > 0) {
    failures.push({
      id: `source-route:${source.route}:private-pattern`,
      detail: `Source route path matches private/source leak pattern(s): ${[...new Set([...pathMatches, ...sourceMatches])].join(', ')}`
    });
  }

  if (blockedPattern) {
    failures.push({
      id: `source-route:${source.route}:blocked-surface`,
      detail: `App route source must not expose private/admin/source surfaces: ${blockedPattern}`
    });
  }

  if (source.kind === 'dynamic_route') {
    checkDynamicRouteSource(source, publicRouteChecks, atlasSlugs, failures);
  } else if (!publicRoutes.has(source.route)) {
    failures.push({
      id: `source-route:${source.route}:manifest-missing`,
      detail: `Static app route source is missing from publicRoutes manifest: ${source.route}`
    });
  }

  return {
    file: source.file,
    route: source.route,
    kind: source.kind,
    matched_manifest_routes: source.kind === 'dynamic_route'
      ? matchingManifestRoutes(source, publicRouteChecks).map((route) => route.path)
      : (publicRoutes.has(source.route) ? [source.route] : []),
    status: failures.length === 0 ? 'passed' : 'failed',
    failures
  };
}

function sourceDescriptor(filePath) {
  const relativePath = relative(appDir, filePath).replace(/\\/g, '/');
  const metadataRoute = knownMetadataSources.get(relativePath);
  if (metadataRoute) {
    return {
      file: relative(root, filePath),
      route: metadataRoute,
      kind: 'metadata_route'
    };
  }

  const routePath = relativePath
    .replace(/\/page\.(t|j)sx?$/, '')
    .replace(/^page\.(t|j)sx?$/, '');
  const segments = routePath ? routePath.split('/') : [];
  const route = segments.length === 0 ? '/' : `/${segments.join('/')}/`;
  return {
    file: relative(root, filePath),
    route,
    kind: route.includes('[') ? 'dynamic_route' : 'app_route'
  };
}

function checkDynamicRouteSource(source, publicRouteChecks, atlasSlugs, failures) {
  if (source.route !== '/atlas/[slug]/') {
    failures.push({
      id: `source-route:${source.route}:unsupported-dynamic`,
      detail: `Dynamic app route source is not in the approved public Atlas slug pattern: ${source.route}`
    });
    return;
  }

  const matchedRoutes = matchingManifestRoutes(source, publicRouteChecks);
  if (matchedRoutes.length === 0) {
    failures.push({
      id: `source-route:${source.route}:manifest-missing`,
      detail: `Dynamic Atlas route source has no concrete public manifest route: ${source.route}`
    });
    return;
  }

  for (const route of matchedRoutes) {
    const slug = route.path.match(/^\/atlas\/([^/]+)\/$/)?.[1];
    if (!slug || !atlasSlugs.has(slug)) {
      failures.push({
        id: `source-route:${route.path}:atlas-slug`,
        detail: `Concrete Atlas manifest route has no matching data/mock-entries.json slug: ${route.path}`
      });
    }
  }
}

function matchingManifestRoutes(source, publicRouteChecks) {
  if (source.route !== '/atlas/[slug]/') return [];
  return publicRouteChecks.filter((route) => /^\/atlas\/[^/]+\/$/.test(route.path));
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (index + 1 < argv.length && next && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
