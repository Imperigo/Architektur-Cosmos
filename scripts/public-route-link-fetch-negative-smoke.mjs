#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-route-link-fetch-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);
const outputPath = resolve(tempRoot, 'report.json');
const markdownPath = resolve(tempRoot, 'report.md');

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

  const result = spawnSync(
    process.execPath,
    [
      'scripts/public-route-link-smoke.mjs',
      '--base-url',
      'http://127.0.0.1:3998',
      '--timeout-ms',
      '100',
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
    throw new Error('Expected public-route-link-smoke to fail for an unreachable synthetic base URL.');
  }

  if (!existsSync(outputPath)) {
    throw new Error('Expected public-route-link-smoke to write a JSON report for unreachable route fetches.');
  }

  const report = JSON.parse(readFileSync(outputPath, 'utf8'));
  const failedIds = new Set((report.failed_findings || []).map((finding) => finding.id));
  const requiredFailures = [
    '/:fetch',
    '/references/:fetch',
    '/assets/:fetch',
    '/atlas/:fetch',
    '/orbit/:fetch'
  ];
  const missingFailures = requiredFailures.filter((id) => !failedIds.has(id));

  if (report.status !== 'public_route_link_smoke_failed') {
    throw new Error(`Expected failed route link smoke status, got ${report.status}.`);
  }

  if (missingFailures.length > 0) {
    throw new Error(`Negative route link fetch smoke missed expected failures: ${missingFailures.join(', ')}`);
  }

  console.log(JSON.stringify({
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    expected_failed_checks: requiredFailures,
    observed_failed_checks: [...failedIds].sort(),
    report_path: keepTemp ? outputPath : null
  }, null, 2));
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
