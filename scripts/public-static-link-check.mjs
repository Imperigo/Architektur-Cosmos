#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { publicLeakMatches } from './public-leak-patterns.mjs';
import { publicRouteChecks } from './public-route-manifest.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outRoot = resolve(root, args.out || 'out');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-data/review/public-static-link-check.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-data/review/public-static-link-check.generated.md');

const siteOrigins = new Set([
  'https://architekturkosmos.ch',
  'https://www.architekturkosmos.ch',
  'http://127.0.0.1:3000',
  'http://localhost:3000'
]);
const requiredCoreLinks = ['/', '/references/', '/assets/', '/atlas/', '/orbit/'];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  if (!existsSync(outRoot)) {
    throw new Error(`Static export not found: ${relative(root, outRoot)}. Run npm run build first.`);
  }

  const seedRoutes = publicRouteChecks.filter((route) => isHtmlRoute(route.path));
  const pages = seedRoutes.map(checkPage);
  const targetPaths = [...new Set(pages.flatMap((page) => page.internal_targets))].sort();
  const staticAssetPaths = collectStaticAssetPaths(pages);
  const targets = targetPaths.map(checkTarget);
  const staticAssets = staticAssetPaths.map(checkStaticAsset);
  const failures = [
    ...pages.flatMap((page) => page.failures),
    ...targets.flatMap((target) => target.failures),
    ...staticAssets.flatMap((asset) => asset.failures)
  ];

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-static-link-check',
    status: failures.length === 0 ? 'public_static_link_check_passed' : 'public_static_link_check_failed',
    policy: {
      source_free: true,
      reads_private_content: false,
      writes_public_ready: false,
      starts_server: false,
      scans_static_export_only: true
    },
    inputs: {
      out_dir: relative(root, outRoot)
    },
    summary: {
      checked_pages: pages.length,
      checked_internal_targets: targets.length,
      checked_static_assets: staticAssets.length,
      skipped_external_links: pages.reduce((sum, page) => sum + page.skipped_external_links, 0),
      failed_pages: pages.filter((page) => page.status !== 'passed').length,
      failed_targets: targets.filter((target) => target.status !== 'passed').length,
      failed_static_assets: staticAssets.filter((asset) => asset.status !== 'passed').length,
      failure_count: failures.length,
      public_ready_after_check: 0
    },
    pages,
    targets,
    static_assets: staticAssets,
    failures
  };

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('Public static link check');
  console.log(`Status: ${report.status}`);
  console.log(`Pages: ${pages.filter((page) => page.status === 'passed').length}/${pages.length}`);
  console.log(`Internal targets: ${targets.filter((target) => target.status === 'passed').length}/${targets.length}`);
  console.log(`Static assets: ${staticAssets.filter((asset) => asset.status === 'passed').length}/${staticAssets.length}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (failures.length > 0) process.exit(1);
}

function checkPage(route) {
  const filePath = routeFilePath(route.path);
  const failures = [];
  if (!existsSync(filePath)) {
    failures.push({
      id: `${route.path}:file_missing`,
      detail: `Expected static route file to exist: ${relative(root, filePath)}`
    });
    return {
      path: route.path,
      file: relative(root, filePath),
      status: 'failed',
      anchor_count: 0,
      core_link_count: 0,
      private_pattern_count: 0,
      internal_targets: [],
      static_assets: [],
      skipped_external_links: 0,
      failures
    };
  }

  const body = readFileSync(filePath, 'utf8');
  const bodyLeakMatches = publicLeakMatches(body);
  const hrefs = extractAnchorHrefs(body);
  const hrefLeakMatches = hrefs.flatMap((href) => {
    return publicLeakMatches(href).map((match) => ({ href, match }));
  });
  const normalizedLinks = hrefs.map(normalizeInternalHref).filter(Boolean);
  const staticAssetRefs = extractStaticAssetRefs(body).map((href) => normalizeStaticAssetHref(href)).filter(Boolean);
  const linkSet = new Set(normalizedLinks);
  const externalLinks = hrefs.filter((href) => !normalizeInternalHref(href) && !isSkippedHref(href));

  if (bodyLeakMatches.length > 0) {
    failures.push({
      id: `${route.path}:content_leak_patterns`,
      detail: `Blocked private/source patterns: ${bodyLeakMatches.join(', ')}`
    });
  }
  hrefLeakMatches.forEach(({ href, match }) => {
    failures.push({
      id: `${route.path}:href_leak_pattern:${href}`,
      detail: `Blocked private/source pattern in href: ${match}`
    });
  });
  requiredCoreLinks.forEach((requiredPath) => {
    if (!linkSet.has(requiredPath)) {
      failures.push({
        id: `${route.path}:missing_core_link:${requiredPath}`,
        detail: `Expected exported page ${route.path} to include core navigation link ${requiredPath}.`
      });
    }
  });

  return {
    path: route.path,
    file: relative(root, filePath),
    status: failures.length === 0 ? 'passed' : 'failed',
    anchor_count: hrefs.length,
    core_link_count: requiredCoreLinks.filter((requiredPath) => linkSet.has(requiredPath)).length,
    private_pattern_count: bodyLeakMatches.length + hrefLeakMatches.length,
    internal_targets: [...new Set(normalizedLinks)].sort(),
    static_assets: [...new Set(staticAssetRefs)].sort(),
    skipped_external_links: externalLinks.length,
    failures
  };
}

function checkTarget(path) {
  const filePath = routeFilePath(path);
  const failures = [];
  const pathLeakMatches = publicLeakMatches(path);
  if (pathLeakMatches.length > 0) {
    failures.push({
      id: `${path}:target_path_leak_patterns`,
      detail: `Blocked private/source patterns: ${pathLeakMatches.join(', ')}`
    });
  }
  if (!existsSync(filePath)) {
    failures.push({
      id: `${path}:target_missing`,
      detail: `Expected linked internal target to exist in static export: ${relative(root, filePath)}`
    });
  }
  return {
    path,
    file: relative(root, filePath),
    status: failures.length === 0 ? 'passed' : 'failed',
    failures
  };
}

function checkStaticAsset(path) {
  const filePath = routeFilePath(path);
  const failures = [];
  const pathLeakMatches = publicLeakMatches(path);
  if (pathLeakMatches.length > 0) {
    failures.push({
      id: `${path}:static_asset_path_leak_patterns`,
      detail: `Blocked private/source patterns: ${pathLeakMatches.join(', ')}`
    });
  }
  if (!existsSync(filePath)) {
    failures.push({
      id: `${path}:static_asset_missing`,
      detail: `Expected referenced static asset to exist in export: ${relative(root, filePath)}`
    });
  }
  return {
    path,
    file: relative(root, filePath),
    status: failures.length === 0 ? 'passed' : 'failed',
    failures
  };
}

function extractAnchorHrefs(html) {
  const hrefs = [];
  const anchorPattern = /<a\b[^>]*\bhref=(["'])(.*?)\1/gi;
  let match;
  while ((match = anchorPattern.exec(String(html))) !== null) {
    hrefs.push(decodeHtmlAttribute(match[2]));
  }
  return hrefs;
}

function collectStaticAssetPaths(pages) {
  const htmlAssetPaths = [...new Set(pages.flatMap((page) => page.static_assets))].sort();
  const cssAssetPaths = htmlAssetPaths
    .filter((path) => path.toLowerCase().endsWith('.css'))
    .flatMap((path) => extractCssStaticAssetRefs(path));
  return [...new Set([...htmlAssetPaths, ...cssAssetPaths])].sort();
}

function extractStaticAssetRefs(html) {
  const refs = [];
  const tagPattern = /<(script|img|source|link|meta)\b[^>]*>/gi;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(String(html))) !== null) {
    const tag = tagMatch[0];
    const tagName = tagMatch[1].toLowerCase();
    if (tagName === 'meta') {
      const content = attrValue(tag, 'content');
      if (content && /\.(avif|gif|ico|jpe?g|png|svg|webp)([?#]|$)/i.test(content)) refs.push(content);
      continue;
    }

    ['href', 'src', 'poster'].forEach((name) => {
      const value = attrValue(tag, name);
      if (value) refs.push(value);
    });
    ['imagesrcset', 'srcset'].forEach((name) => {
      const value = attrValue(tag, name);
      if (value) refs.push(...splitSrcSet(value));
    });
  }
  return refs;
}

function extractCssStaticAssetRefs(cssAssetPath) {
  const filePath = routeFilePath(cssAssetPath);
  if (!existsSync(filePath)) return [];

  const css = readFileSync(filePath, 'utf8');
  const refs = [];
  const pattern = /url\(\s*(["']?)(.*?)\1\s*\)/gi;
  let match;
  while ((match = pattern.exec(css)) !== null) {
    const normalized = normalizeStaticAssetHref(match[2], cssAssetPath);
    if (normalized) refs.push(normalized);
  }
  return refs;
}

function attrValue(tag, name) {
  const pattern = new RegExp(`\\b${name}=("|')(.*?)\\1`, 'i');
  const match = String(tag).match(pattern);
  return match ? decodeHtmlAttribute(match[2]) : null;
}

function splitSrcSet(value) {
  return String(value)
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function normalizeInternalHref(href) {
  const value = String(href || '').trim();
  if (isSkippedHref(value)) return null;

  let parsed;
  try {
    parsed = new URL(value, 'https://architekturkosmos.ch');
  } catch {
    return null;
  }
  if (!siteOrigins.has(parsed.origin)) return null;

  let pathname = parsed.pathname || '/';
  if (pathname !== '/' && !extname(pathname) && !pathname.endsWith('/')) {
    pathname = `${pathname}/`;
  }
  return pathname;
}

function normalizeStaticAssetHref(href, basePath = '/') {
  const value = String(href || '').trim();
  if (isSkippedHref(value)) return null;

  let parsed;
  try {
    parsed = new URL(value, staticAssetBaseUrl(basePath));
  } catch {
    return null;
  }
  if (!siteOrigins.has(parsed.origin)) return null;
  if (!extname(parsed.pathname)) return null;
  return parsed.pathname;
}

function staticAssetBaseUrl(path) {
  const normalized = String(path || '/');
  if (normalized === '/' || normalized.endsWith('/')) return `https://architekturkosmos.ch${normalized}`;
  const directory = dirname(normalized).replace(/\\/g, '/');
  return `https://architekturkosmos.ch${directory === '/' ? '/' : `${directory}/`}`;
}

function isSkippedHref(href) {
  const value = String(href || '').trim();
  return !value
    || value.startsWith('#')
    || /^(mailto|tel|javascript|data|blob):/i.test(value);
}

function routeFilePath(path) {
  const normalized = String(path || '/').split('?')[0].split('#')[0];
  if (normalized === '/') return resolve(outRoot, 'index.html');
  const relativePath = decodeUrlPath(normalized.replace(/^\/+/, ''));
  if (extname(relativePath)) return resolve(outRoot, relativePath);
  return resolve(outRoot, relativePath, 'index.html');
}

function decodeUrlPath(path) {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function isHtmlRoute(path) {
  return !/\.(svg|txt|xml)$/i.test(path);
}

function decodeHtmlAttribute(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function renderMarkdown(report) {
  const lines = [
    '# Public Static Link Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Checks exported public HTML pages for core navigation links, private/source markers in anchors, missing internal targets and missing referenced static assets without starting a server or changing public-ready state.',
    '',
    '## Summary',
    '',
    `- pages: ${report.summary.checked_pages - report.summary.failed_pages}/${report.summary.checked_pages} passed`,
    `- internal targets: ${report.summary.checked_internal_targets - report.summary.failed_targets}/${report.summary.checked_internal_targets} passed`,
    `- static assets: ${report.summary.checked_static_assets - report.summary.failed_static_assets}/${report.summary.checked_static_assets} passed`,
    `- skipped external links: ${report.summary.skipped_external_links}`,
    `- failures: ${report.summary.failure_count}`,
    `- public-ready after check: ${report.summary.public_ready_after_check}`,
    '',
    '## Pages',
    '',
    '| Route | Status | Anchors | Core links | Internal targets | Static assets |',
    '| --- | --- | ---: | ---: | ---: | ---: |'
  ];

  report.pages.forEach((page) => {
    lines.push(`| \`${page.path}\` | \`${page.status}\` | ${page.anchor_count} | ${page.core_link_count}/${requiredCoreLinks.length} | ${page.internal_targets.length} | ${page.static_assets.length} |`);
  });

  lines.push('', '## Static Assets', '');
  lines.push('| Path | Status |');
  lines.push('| --- | --- |');
  report.static_assets.forEach((asset) => {
    lines.push(`| \`${asset.path}\` | \`${asset.status}\` |`);
  });

  if (report.failures.length > 0) {
    lines.push('', '## Failures', '');
    report.failures.forEach((failure) => lines.push(`- \`${failure.id}\`: ${failure.detail}`));
  }

  return `${lines.join('\n')}\n`;
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
