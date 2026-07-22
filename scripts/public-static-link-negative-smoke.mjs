#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { publicRouteChecks } from './public-route-manifest.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-static-link-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);
const blockedHref = '/_overseer/private-source.pdf';
const missingHref = '/atlas/missing-public-route/';
const cssAssetHref = '/_next/static/css/public-static-link-negative-smoke.css';
const missingCssAssetHref = '/_next/static/media/missing-public-static-link-negative-smoke.woff2';
const coreLinks = ['/', '/references/', '/assets/', '/atlas/', '/orbit/'];

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

  const htmlRoutes = publicRouteChecks.filter((route) => isHtmlRoute(route.path));
  htmlRoutes.forEach((route) => writeRoute(outRoot, route.path, renderRouteHtml(route.path)));
  writeFile(outRoot, cssAssetHref, [
    '/* synthetic source-root marker for public static link guard */',
    '@font-face {',
    '  font-family: "KosmoSynthetic";',
    `  src: url("${missingCssAssetHref}") format("woff2");`,
    '}',
    ''
  ].join('\n'));

  const outputPath = resolve(tempRoot, 'report.json');
  const markdownPath = resolve(tempRoot, 'report.md');
  const result = spawnSync(
    process.execPath,
    [
      'scripts/public-static-link-check.mjs',
      '--out',
      outRoot,
      '--output',
      outputPath,
      '--markdown',
      markdownPath
    ],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (result.status === 0) {
    throw new Error('Expected public-static-link-check to fail for synthetic unsafe links.');
  }

  if (!existsSync(outputPath)) {
    throw new Error(`Expected JSON report to be written at ${relative(root, outputPath)}.`);
  }

  const report = JSON.parse(readFileSync(outputPath, 'utf8'));
  const failedIds = new Set((report.failures || []).map((failure) => failure.id));
  const requiredFailures = [
    '/:content_leak_patterns',
    `/:href_leak_pattern:${blockedHref}`,
    `${blockedHref}:target_path_leak_patterns`,
    `${blockedHref}:target_missing`,
    `${missingHref}:target_missing`,
    `${cssAssetHref}:static_asset_content_leak_patterns`,
    `${missingCssAssetHref}:static_asset_missing`
  ];
  const missingFailures = requiredFailures.filter((id) => !failedIds.has(id));

  if (missingFailures.length > 0) {
    throw new Error(`Negative static link smoke missed expected failures: ${missingFailures.join(', ')}`);
  }

  const summary = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    blocked_href: blockedHref,
    missing_href: missingHref,
    css_asset_href: cssAssetHref,
    missing_css_asset_href: missingCssAssetHref,
    expected_failed_checks: requiredFailures,
    observed_failed_checks: [...failedIds].sort(),
    report_path: keepTemp ? relative(root, outputPath) : null
  };

  console.log(JSON.stringify(summary, null, 2));
}

function renderRouteHtml(routePath) {
  const links = [...coreLinks];
  if (routePath === '/') links.push(blockedHref, missingHref);

  return [
    '<!doctype html>',
    '<html lang="de">',
    '<head>',
    '  <meta charset="utf-8">',
    `  <title>Architecture Cosmos synthetic route ${routePath}</title>`,
    routePath === '/' ? `  <link rel="stylesheet" href="${cssAssetHref}">` : '',
    '</head>',
    '<body>',
    ...links.map((href) => `  <a href="${href}">${href}</a>`),
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

function writeRoute(outRoot, routePath, body) {
  writeFile(outRoot, routePath, body);
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

function isHtmlRoute(routePath) {
  return !/\.(svg|txt|xml)$/i.test(routePath);
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
