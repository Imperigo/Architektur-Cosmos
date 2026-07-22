#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();

const cases = [
  {
    id: 'duplicate_gate_route',
    moduleSource: renderManifest({
      publicRouteChecks: [{ path: '/' }, { path: '/atlas/' }],
      publicRoutes: ['/', '/', '/atlas/']
    }),
    expectedFailures: ['gate:duplicate:/']
  },
  {
    id: 'duplicate_smoke_route',
    moduleSource: renderManifest({
      publicRouteChecks: [{ path: '/' }, { path: '/' }],
      publicRoutes: ['/']
    }),
    expectedFailures: ['smoke:duplicate:/']
  },
  {
    id: 'missing_smoke_coverage',
    moduleSource: renderManifest({
      publicRouteChecks: [{ path: '/' }],
      publicRoutes: ['/', '/atlas/']
    }),
    expectedFailures: ['missing-smoke:/atlas/']
  },
  {
    id: 'missing_gate_coverage',
    moduleSource: renderManifest({
      publicRouteChecks: [{ path: '/' }, { path: '/atlas/' }],
      publicRoutes: ['/']
    }),
    expectedFailures: ['missing-gate:/atlas/']
  },
  {
    id: 'malformed_exports',
    moduleSource: [
      "export const publicRouteChecks = 'not-array';",
      "export const publicRoutes = 'not-array';"
    ].join('\n'),
    expectedFailures: ['gate:export:publicRoutes', 'smoke:export:publicRouteChecks']
  }
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const workspace = await mkdtemp(join(tmpdir(), 'public-route-gate-alignment-negative-'));
  try {
    const results = [];
    for (const testCase of cases) {
      results.push(await runCase(workspace, testCase));
    }

    console.log(JSON.stringify({
      status: 'passed',
      synthetic_only: true,
      reads_private_content: false,
      starts_server: false,
      checked_cases: results.length,
      cases: results
    }, null, 2));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function runCase(workspace, testCase) {
  const manifestPath = join(workspace, `${testCase.id}.manifest.mjs`);
  await writeFile(manifestPath, `${testCase.moduleSource}\n`, 'utf8');

  const result = spawnSync(process.execPath, [
    'scripts/public-route-gate-alignment-check.mjs',
    '--manifest',
    resolve(manifestPath)
  ], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.status === 0) {
    throw new Error(`Expected public-route-gate-alignment-check to fail for synthetic case ${testCase.id}.`);
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Expected JSON output for ${testCase.id}. stderr: ${result.stderr || error.message}`);
  }

  const failedIds = new Set((report.failures || []).map((failure) => failure.id));
  const missed = testCase.expectedFailures.filter((id) => !failedIds.has(id));
  if (missed.length > 0) {
    throw new Error(`Route gate alignment negative smoke ${testCase.id} missed failures: ${missed.join(', ')}`);
  }

  return {
    id: testCase.id,
    expected_failed_checks: testCase.expectedFailures,
    observed_failed_checks: [...failedIds].sort()
  };
}

function renderManifest(value) {
  return [
    `export const publicRouteChecks = ${JSON.stringify(value.publicRouteChecks, null, 2)};`,
    `export const publicRoutes = ${JSON.stringify(value.publicRoutes, null, 2)};`
  ].join('\n');
}
