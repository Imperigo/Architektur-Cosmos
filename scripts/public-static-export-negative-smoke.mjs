#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { publicRouteChecks } from './public-route-manifest.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-static-export-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);
const blockedText = '/mnt/data/ArchitekturKosmos/private-library/source-root/raw-scan.pdf';
const missingAsset = '_next/static/chunks/missing-public-static-export-negative-smoke.js';

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

  publicRouteChecks.forEach((route) => writeRoute(outRoot, route.path, renderSyntheticRoute(route)));

  const outputPath = resolve(tempRoot, 'report.json');
  const markdownPath = resolve(tempRoot, 'report.md');
  const result = spawnSync(
    process.execPath,
    [
      'scripts/public-static-export-smoke.mjs',
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
    throw new Error('Expected public-static-export-smoke to fail for synthetic private/source text and a missing _next/static asset.');
  }

  if (!existsSync(outputPath)) {
    throw new Error(`Expected JSON report to be written at ${relative(root, outputPath)}.`);
  }

  const report = JSON.parse(readFileSync(outputPath, 'utf8'));
  const failedIds = new Set(
    (report.routes || [])
      .flatMap((route) => route.checks || [])
      .filter((check) => !check.passed)
      .map((check) => check.id)
  );
  const requiredFailures = [
    '/:no_private_patterns',
    '/:referenced_static_assets_exist'
  ];
  const missingFailures = requiredFailures.filter((id) => !failedIds.has(id));

  if (missingFailures.length > 0) {
    throw new Error(`Negative static export smoke missed expected failures: ${missingFailures.join(', ')}`);
  }

  const summary = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    blocked_text: blockedText,
    missing_asset: missingAsset,
    expected_failed_checks: requiredFailures,
    observed_failed_checks: [...failedIds].sort(),
    report_path: keepTemp ? relative(root, outputPath) : null
  };

  console.log(JSON.stringify(summary, null, 2));
}

function renderSyntheticRoute(route) {
  const routePath = route.path;
  const isStaticAsset = /\.[a-z0-9]+$/i.test(routePath);
  const lines = [];

  for (const sentinel of route.includes ?? []) {
    lines.push(`<p>${escapeHtml(sentinel)}</p>`);
  }

  for (const sentinel of route.rawIncludes ?? []) {
    lines.push(String(sentinel));
  }

  const filler = 'Architecture Cosmos synthetic static export fixture. '.repeat(20);
  if (isStaticAsset) return `${lines.join('\n')}\n${filler}\n`;

  if (routePath === '/') {
    lines.push(`<script src="/${missingAsset}"></script>`);
    lines.push(`<p>${escapeHtml(blockedText)}</p>`);
  }

  return [
    '<!doctype html>',
    '<html lang="de">',
    '<head><meta charset="utf-8"><title>Architecture Cosmos synthetic route</title></head>',
    '<body>',
    ...lines,
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

function routeFilePath(outRoot, routePath) {
  const normalized = String(routePath || '/').replace(/^\/+/, '');
  if (!normalized) return resolve(outRoot, 'index.html');
  if (/\.[a-z0-9]+$/i.test(normalized)) return resolve(outRoot, normalized);
  return resolve(outRoot, normalized, 'index.html');
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
