#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { publicRouteChecks } from './public-route-manifest.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-static-metadata-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);

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

  publicRouteChecks
    .filter((route) => isHtmlRoute(route.path))
    .forEach((route) => writeRoute(outRoot, route.path, renderRouteHtml(route.path)));

  const outputPath = resolve(tempRoot, 'report.json');
  const markdownPath = resolve(tempRoot, 'report.md');
  const result = spawnSync(
    process.execPath,
    [
      'scripts/public-static-metadata-check.mjs',
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
    throw new Error('Expected public-static-metadata-check to fail for synthetic unsafe metadata.');
  }

  if (!existsSync(outputPath)) {
    throw new Error(`Expected JSON report to be written at ${relative(root, outputPath)}.`);
  }

  const report = JSON.parse(readFileSync(outputPath, 'utf8'));
  const failedIds = new Set((report.failures || []).map((failure) => failure.id));
  const requiredFailures = [
    '/:title:missing',
    '/:description:missing',
    '/orbit/:canonical:mismatch',
    '/orbit/:description:private_pattern'
  ];
  const missingFailures = requiredFailures.filter((id) => !failedIds.has(id));

  if (missingFailures.length > 0) {
    throw new Error(`Negative static metadata smoke missed expected failures: ${missingFailures.join(', ')}`);
  }

  const summary = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    expected_failed_checks: requiredFailures,
    observed_failed_checks: [...failedIds].sort(),
    report_path: keepTemp ? relative(root, outputPath) : null
  };

  console.log(JSON.stringify(summary, null, 2));
}

function renderRouteHtml(routePath) {
  if (routePath === '/') {
    return [
      '<!doctype html>',
      '<html lang="de">',
      '<head>',
      '  <meta charset="utf-8">',
      '</head>',
      '<body>Architecture Cosmos synthetic metadata fixture</body>',
      '</html>',
      ''
    ].join('\n');
  }

  const description = routePath === '/orbit/'
    ? 'Synthetic private source-root worker logs metadata fixture for the public leak detector.'
    : `Architecture Cosmos synthetic static metadata fixture for ${routePath}.`;
  const canonical = routePath === '/orbit/'
    ? 'https://example.com/orbit/'
    : `https://architekturkosmos.ch${routePath}`;

  return [
    '<!doctype html>',
    '<html lang="de">',
    '<head>',
    '  <meta charset="utf-8">',
    `  <title>Architecture Cosmos synthetic route ${routePath}</title>`,
    `  <meta name="description" content="${escapeHtmlAttribute(description)}">`,
    `  <meta property="og:title" content="Architecture Cosmos synthetic route ${routePath}">`,
    `  <meta property="og:description" content="${escapeHtmlAttribute(description)}">`,
    `  <link rel="canonical" href="${canonical}">`,
    '</head>',
    '<body>Architecture Cosmos synthetic metadata fixture</body>',
    '</html>',
    ''
  ].join('\n');
}

function writeRoute(outRoot, routePath, body) {
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

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
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
