#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-route-manifest-negative-smoke');
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
  mkdirSync(tempRoot, { recursive: true });

  const manifestPath = resolve(tempRoot, 'public-route-manifest.synthetic.mjs');
  writeFileSync(manifestPath, renderSyntheticManifest(), 'utf8');

  const result = spawnSync(
    process.execPath,
    ['scripts/public-route-manifest-check.mjs', '--manifest', manifestPath],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (result.status === 0) {
    throw new Error('Expected public-route-manifest-check to fail for the synthetic unsafe manifest.');
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Expected JSON output from public-route-manifest-check. stderr: ${result.stderr || error.message}`);
  }

  const failedIds = new Set((report.failures || []).map((failure) => failure.id));
  const requiredFailures = [
    'route:/assets/:duplicate',
    'route:/private/source-root/:blocked-surface',
    'route:/private/source-root/:private-pattern',
    'route:/private/source-root/:includes:private-pattern',
    'route:/atlas/not-in-data/:atlas-slug',
    'route:/review-missing/:source-missing',
    'route:/assets/?debug=1:fragment-or-query',
    'route:/assets/#debug:fragment-or-query',
    'route:/../private/:dot-segment',
    'route:/assets\\private/:backslash',
    'route:/bad-min/:min-body-length'
  ];
  const missingFailures = requiredFailures.filter((id) => !failedIds.has(id));
  if (missingFailures.length > 0) {
    throw new Error(`Negative route manifest smoke missed expected failures: ${missingFailures.join(', ')}`);
  }

  const summary = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    manifest_path: keepTemp ? relative(root, manifestPath) : null,
    expected_failed_checks: requiredFailures,
    observed_failed_checks: [...failedIds].sort()
  };

  console.log(JSON.stringify(summary, null, 2));
}

function renderSyntheticManifest() {
  const baseManifestUrl = pathToFileURL(resolve(root, 'scripts/public-route-manifest.mjs')).href;
  return [
    `import { publicRouteChecks as baseRoutes } from ${JSON.stringify(baseManifestUrl)};`,
    '',
    'export const publicRouteChecks = [',
    '  ...baseRoutes,',
    "  { path: '/assets/', includes: ['KosmoAsset'] },",
    "  { path: '/private/source-root/', includes: ['private source-root OCR worker logs'] },",
    "  { path: '/atlas/not-in-data/', includes: ['Synthetic missing Atlas entry'] },",
    "  { path: '/review-missing/', includes: ['Synthetic route with no app source'] },",
    "  { path: '/assets/?debug=1', includes: ['Synthetic query route'] },",
    "  { path: '/assets/#debug', includes: ['Synthetic fragment route'] },",
    "  { path: '/../private/', includes: ['Synthetic dot segment route'] },",
    "  { path: '/assets\\\\private/', includes: ['Synthetic backslash route'] },",
    "  { path: '/bad-min/', includes: ['Synthetic bad minimum'], minBodyLength: 0 },",
    '];',
    ''
  ].join('\n');
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
