#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { publicRouteChecks } from './public-route-manifest.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-demo-gate-static-text-surface-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);
const leakFile = 'source-root-leak.txt';
const expectedFailure = `static-export-text:${leakFile}:leak`;

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

  for (const route of publicRouteChecks) {
    writeRoute(outRoot, route.path, renderSyntheticRoute(route));
  }

  writeFileSync(
    resolve(outRoot, leakFile),
    'Synthetic negative fixture: /mnt/source-root/private-library/raw-scan.pdf must never pass the public demo gate.\n',
    'utf8'
  );

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
    throw new Error('Expected public-demo-gate-check to fail for a synthetic exported text surface with private/source markers.');
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Expected JSON output from public-demo-gate-check. stderr: ${result.stderr || error.message}`);
  }

  const failureIds = new Set((report.failures || []).map((failure) => failure.id));
  if (!failureIds.has(expectedFailure)) {
    throw new Error(`Negative public demo gate smoke missed ${expectedFailure}.`);
  }

  const summary = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    expected_failed_check: expectedFailure,
    checked_text_surface_files: report.static_export?.checked_text_surface_files ?? null,
    observed_failure_count: report.failures?.length ?? 0,
    out_dir: keepTemp ? relative(root, outRoot) : null
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

  const filler = 'Architecture Cosmos synthetic public route sentinel fixture. '.repeat(20);
  if (isStaticAsset) return `${lines.join('\n')}\n${filler}\n`;

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
