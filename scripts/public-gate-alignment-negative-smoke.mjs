#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();

const cleanGateScript = [
  'npm run public:route-manifest-check',
  'npm run public:route-gate-alignment-check',
  'npm run public:navigation-canon-check',
  'node scripts/public-demo-gate-check.mjs',
  'node scripts/public-static-link-check.mjs --allow-missing-out',
  'node scripts/public-static-asset-surface-check.mjs --allow-missing-out',
  'npm run public:entry-detail-dossier-check',
  'npm run public:gate-alignment-check'
].join(' && ');

const cleanVacationSafeSource = [
  "command: ['node', 'scripts/public-demo-gate-check.mjs']",
  "command: ['node', 'scripts/public-gate-alignment-negative-smoke.mjs']",
  "command: ['node', 'scripts/public-demo-gate-static-sentinel-negative-smoke.mjs']",
  "command: ['node', 'scripts/public-route-manifest-check.mjs']",
  "command: ['node', 'scripts/public-route-manifest-negative-smoke.mjs']",
  "command: ['node', 'scripts/public-route-gate-alignment-check.mjs']",
  "command: ['node', 'scripts/public-route-gate-alignment-negative-smoke.mjs']",
  "command: ['node', 'scripts/public-navigation-canon-check.mjs']",
  "command: ['node', 'scripts/public-navigation-canon-negative-smoke.mjs']",
  "command: ['node', 'scripts/public-static-link-check.mjs']",
  "command: ['node', 'scripts/public-static-link-negative-smoke.mjs']",
  "command: ['node', 'scripts/public-client-bundle-privacy-diagnostic.mjs']",
  "command: ['node', 'scripts/public-client-bundle-privacy-diagnostic-negative-smoke.mjs']",
  "command: ['node', 'scripts/public-static-asset-surface-check.mjs']",
  "command: ['node', 'scripts/public-static-asset-surface-negative-smoke.mjs']",
  "command: ['node', 'scripts/public-entry-detail-dossier-check.mjs']",
  "command: ['node', 'scripts/public-entry-detail-dossier-negative-smoke.mjs']"
].join('\n');

const cases = [
  {
    id: 'missing_route_manifest',
    gateScript: 'node scripts/public-demo-gate-check.mjs && node scripts/public-static-asset-surface-check.mjs --allow-missing-out',
    vacationSafeSource: cleanVacationSafeSource,
    expectedFailures: ['gate:route_manifest:missing', 'gate:route_gate_alignment:missing', 'gate:navigation_canon:missing', 'gate:demo_gate:order', 'gate:static_link:missing', 'gate:static_asset_surface:order', 'gate:entry_detail_dossier:missing']
  },
  {
    id: 'wrong_order',
    gateScript: [
      'node scripts/public-demo-gate-check.mjs',
      'npm run public:route-manifest-check',
      'npm run public:route-gate-alignment-check',
      'npm run public:navigation-canon-check',
      'node scripts/public-static-link-check.mjs --allow-missing-out',
      'node scripts/public-static-asset-surface-check.mjs --allow-missing-out',
      'npm run public:entry-detail-dossier-check'
    ].join(' && '),
    vacationSafeSource: cleanVacationSafeSource,
    expectedFailures: ['gate:route_manifest:order', 'gate:route_gate_alignment:order', 'gate:navigation_canon:order', 'gate:demo_gate:order']
  },
  {
    id: 'missing_allow_missing_out',
    gateScript: 'npm run public:route-manifest-check && npm run public:route-gate-alignment-check && npm run public:navigation-canon-check && node scripts/public-demo-gate-check.mjs && node scripts/public-static-asset-surface-check.mjs && npm run public:entry-detail-dossier-check',
    vacationSafeSource: cleanVacationSafeSource,
    expectedFailures: ['gate:static_link:missing', 'gate:static_asset_surface:missing', 'gate:unexpected-command:node-scripts-public-static-asset-surface-check-mjs']
  },
  {
    id: 'static_link_missing_allow_missing_out',
    gateScript: [
      'npm run public:route-manifest-check',
      'npm run public:route-gate-alignment-check',
      'npm run public:navigation-canon-check',
      'node scripts/public-demo-gate-check.mjs',
      'node scripts/public-static-link-check.mjs',
      'node scripts/public-static-asset-surface-check.mjs --allow-missing-out',
      'npm run public:entry-detail-dossier-check'
    ].join(' && '),
    vacationSafeSource: cleanVacationSafeSource,
    expectedFailures: ['gate:static_link:missing', 'gate:unexpected-command:node-scripts-public-static-link-check-mjs']
  },
  {
    id: 'forbidden_live_check',
    gateScript: `${cleanGateScript} && npm run public:demo-live-check`,
    vacationSafeSource: cleanVacationSafeSource,
    expectedFailures: ['gate:unexpected-command:npm-run-public-demo-live-check', 'gate:live_check:npm-run-public-demo-live-check']
  },
  {
    id: 'missing_vacation_coverage',
    gateScript: cleanGateScript,
    vacationSafeSource: cleanVacationSafeSource.replace("command: ['node', 'scripts/public-route-gate-alignment-check.mjs']", ''),
    expectedFailures: ['vacation-safe:route_gate_alignment:coverage']
  },
  {
    id: 'missing_negative_smoke_coverage',
    gateScript: cleanGateScript,
    vacationSafeSource: cleanVacationSafeSource.replace("command: ['node', 'scripts/public-route-gate-alignment-negative-smoke.mjs']", ''),
    expectedFailures: ['vacation-safe:route_gate_alignment:negative-smoke-coverage']
  },
  {
    id: 'missing_gate_alignment_negative_smoke_coverage',
    gateScript: cleanGateScript,
    vacationSafeSource: cleanVacationSafeSource.replace("command: ['node', 'scripts/public-gate-alignment-negative-smoke.mjs']", ''),
    expectedFailures: ['vacation-safe:gate_alignment_negative_smoke:coverage']
  },
  {
    id: 'missing_client_bundle_privacy_diagnostic_coverage',
    gateScript: cleanGateScript,
    vacationSafeSource: cleanVacationSafeSource.replace("command: ['node', 'scripts/public-client-bundle-privacy-diagnostic.mjs']", ''),
    expectedFailures: ['vacation-safe:client_bundle_privacy_diagnostic:coverage']
  },
  {
    id: 'missing_client_bundle_privacy_diagnostic_negative_smoke_coverage',
    gateScript: cleanGateScript,
    vacationSafeSource: cleanVacationSafeSource.replace("command: ['node', 'scripts/public-client-bundle-privacy-diagnostic-negative-smoke.mjs']", ''),
    expectedFailures: ['vacation-safe:client_bundle_privacy_diagnostic_negative_smoke:coverage']
  }
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const workspace = await mkdtemp(join(tmpdir(), 'public-gate-alignment-negative-'));
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
  const packagePath = join(workspace, `${testCase.id}.package.json`);
  const vacationSafePath = join(workspace, `${testCase.id}.public-vacation-safe-check.mjs`);
  await writeFile(packagePath, `${JSON.stringify({ scripts: { 'public:gate-check': testCase.gateScript } }, null, 2)}\n`, 'utf8');
  await writeFile(vacationSafePath, `${testCase.vacationSafeSource}\n`, 'utf8');

  const result = spawnSync(process.execPath, [
    'scripts/public-gate-alignment-check.mjs',
    '--package',
    resolve(packagePath),
    '--vacation-safe-check',
    resolve(vacationSafePath)
  ], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.status === 0) {
    throw new Error(`Expected public-gate-alignment-check to fail for synthetic case ${testCase.id}.`);
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
    throw new Error(`Gate alignment negative smoke ${testCase.id} missed failures: ${missed.join(', ')}`);
  }

  return {
    id: testCase.id,
    expected_failed_checks: testCase.expectedFailures,
    observed_failed_checks: [...failedIds].sort()
  };
}
