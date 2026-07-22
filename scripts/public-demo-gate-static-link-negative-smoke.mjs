#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { publicRouteChecks } from './public-route-manifest.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-demo-gate-static-link-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);
const blockedHref = '/_overseer/private-source.pdf';
const missingHref = '/atlas/missing-public-route/';
const encodedSameOriginBlockedHref = 'https://www.architekturkosmos.ch/owner-inbox/?from=static&next=/atlas/';
const invalidHref = 'http://[::1';
const missingImageSrc = '/_next/static/media/missing-public-demo-gate-smoke.webp';
const cssAssetHref = '/_next/static/css/public-demo-gate-static-link-negative-smoke.css';
const missingFontHref = '/_next/static/media/missing-public-demo-gate-smoke.woff2';
const expectedFailures = [
  `static-route:/:href-leak:${blockedHref}`,
  `static-route:/:href-blocked-surface:${blockedHref}`,
  `static-route:/:href-target-missing:${blockedHref}`,
  `static-route:/:href-target-missing:${missingHref}`,
  `static-route:/:href-leak:${encodedSameOriginBlockedHref}`,
  'static-route:/:href-blocked-surface:/owner-inbox/?from=static&next=/atlas/',
  'static-route:href-invalid-url',
  `static-route:/:asset-target-missing:${missingImageSrc}`,
  `static-asset:${cssAssetHref}:content-leak`,
  `static-route:${cssAssetHref}:asset-target-missing:${missingFontHref}`
];

try {
  runSmoke();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  if (!keepTemp) rmSync(tempRoot, { recursive: true, force: true });
}

function runSmoke() {
  rmSync(tempRoot, { recursive: true, force: true });
  const outRoot = resolve(tempRoot, 'out');
  mkdirSync(outRoot, { recursive: true });

  const htmlRoutePaths = publicRouteChecks
    .filter((route) => !isStaticAssetRoute(route.path))
    .map((route) => route.path);

  for (const route of publicRouteChecks) {
    writeRoute(outRoot, route.path, renderSyntheticRoute(route, htmlRoutePaths));
  }
  writeFile(outRoot, cssAssetHref, [
    '/* synthetic source-root marker for public demo gate */',
    '@font-face {',
    '  font-family: "KosmoSynthetic";',
    `  src: url("${missingFontHref}") format("woff2");`,
    '}',
    ''
  ].join('\n'));

  const result = spawnSync(
    process.execPath,
    [
      'scripts/public-demo-gate-check.mjs',
      '--static-out',
      outRoot,
      '--require-static-export'
    ],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (result.status === 0) {
    throw new Error('Expected public-demo-gate-check to fail for synthetic unsafe static links.');
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Expected JSON output from public-demo-gate-check. stderr: ${result.stderr || error.message}`);
  }

  const failureIds = new Set((report.failures || []).map((failure) => failure.id));
  const missingFailures = expectedFailures.filter((id) => !failureIds.has(id));
  if (missingFailures.length > 0) {
    throw new Error(`Negative public demo gate smoke missed expected link failures: ${missingFailures.join(', ')}`);
  }

  const summary = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    expected_failed_checks: expectedFailures,
    checked_links: report.static_export?.checked_links ?? null,
    checked_internal_targets: report.static_export?.checked_internal_targets ?? null,
    checked_static_assets: report.static_export?.checked_static_assets ?? null,
    observed_failure_count: report.failures?.length ?? 0,
    out_dir: keepTemp ? relative(root, outRoot) : null
  };

  console.log(JSON.stringify(summary, null, 2));
}

function renderSyntheticRoute(route, htmlRoutePaths) {
  const routePath = route.path;
  const isStaticAsset = isStaticAssetRoute(routePath);
  const lines = [];

  for (const sentinel of route.includes ?? []) {
    lines.push(`<p>${escapeHtml(sentinel)}</p>`);
  }

  for (const sentinel of route.rawIncludes ?? []) {
    lines.push(String(sentinel));
  }

  const filler = 'Architecture Cosmos synthetic public route link fixture. '.repeat(20);
  if (isStaticAsset) return `${lines.join('\n')}\n${filler}\n`;

  const links = routePath === '/'
    ? [...htmlRoutePaths, blockedHref, missingHref, encodedSameOriginBlockedHref, invalidHref]
    : htmlRoutePaths;

  return [
    '<!doctype html>',
    '<html lang="de">',
    '<head>',
    '<meta charset="utf-8">',
    '<title>Architecture Cosmos synthetic route</title>',
    routePath === '/' ? `<link rel="stylesheet" href="${escapeHtml(cssAssetHref)}">` : '',
    '</head>',
    '<body>',
    ...lines,
    ...links.map((href) => `<a href="${escapeHtml(href)}">${escapeHtml(href)}</a>`),
    routePath === '/' ? `<img src="${escapeHtml(missingImageSrc)}" alt="Synthetic missing public asset">` : '',
    `<p>${filler}</p>`,
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

function writeRoute(outRoot, routePath, body) {
  const filePath = routeFilePath(outRoot, routePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, body, 'utf8');
  if (!existsSync(filePath)) {
    throw new Error(`Failed to write synthetic route fixture: ${relative(root, filePath)}`);
  }
}

function writeFile(outRoot, routePath, body) {
  const filePath = routeFilePath(outRoot, routePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, body, 'utf8');
}

function routeFilePath(outRoot, routePath) {
  const normalized = String(routePath || '/').replace(/^\/+/, '');
  if (!normalized) return resolve(outRoot, 'index.html');
  if (/\.[a-z0-9]+$/i.test(normalized)) return resolve(outRoot, normalized);
  return resolve(outRoot, normalized, 'index.html');
}

function isStaticAssetRoute(routePath) {
  return /\.(svg|txt|xml)$/i.test(routePath);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
