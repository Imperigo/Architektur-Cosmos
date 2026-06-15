#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const reportPath = resolve(root, args.report || `data/kosmo-asset-prepare-phase1-fixture-contract-${dateStamp}.json`);
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-prepare-phase1-fixture/library.json');
const outputJson = resolve(root, args.out || `data/kosmo-asset-prepare-phase1-fixture-contract-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-asset-prepare-phase1-fixture-contract-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const library = JSON.parse(await readFile(libraryPath, 'utf8'));
  const findings = checkContract(report, library);
  const libraryCheck = runAssetLibraryCheck();

  if (libraryCheck.status === 0) {
    findings.push({ id: 'asset_library_check_passes', severity: 'passed', message: 'kosmo-asset-library-check passed for the fixture library.' });
  } else {
    findings.push({
      id: 'asset_library_check_passes',
      severity: 'failure',
      message: 'kosmo-asset-library-check must pass for the fixture library.',
      detail: libraryCheck.stderr || libraryCheck.stdout
    });
  }

  const failures = findings.filter((finding) => finding.severity === 'failure');
  const guard = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'kosmoasset_prepare_phase1_fixture_contract_guard_passed'
      : 'kosmoasset_prepare_phase1_fixture_contract_guard_failed',
    policy: {
      reads_private_content: false,
      copies_private_content: false,
      ingests_assets: false,
      uploads_allowed: false,
      public_assets_allowed: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, reportPath), relative(root, libraryPath)],
    summary: {
      contract_status: report.status,
      library_id: library.library_id,
      assets: library.assets?.length ?? 0,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    checker_stdout: libraryCheck.stdout.trim().split('\n').slice(-8)
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(guard, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(guard));

  console.log('KosmoAsset Prepare phase 1 fixture contract check');
  console.log(`Status: ${guard.status}`);
  console.log(`Failures: ${guard.summary.failures}`);
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkContract(report, library) {
  const findings = [];
  expect(report.schema_version === '0.1', findings, 'schema_version', 'Report schema_version must be 0.1.');
  expect(report.status === 'kosmoasset_prepare_phase1_fixture_contract_ready', findings, 'contract_ready', 'Contract must be ready.');
  expect(report.policy?.synthetic_fixture_only === true, findings, 'synthetic_only', 'Contract must be synthetic-only.');
  expect(report.policy?.reads_private_content === false, findings, 'no_private_reads', 'Contract must not read private content.');
  expect(report.policy?.copies_private_content === false, findings, 'no_private_copies', 'Contract must not copy private content.');
  expect(report.policy?.ingests_assets === false, findings, 'no_asset_ingestion', 'Contract must not ingest external assets.');
  expect(report.policy?.uploads_allowed === false, findings, 'no_uploads', 'Contract must keep uploads disabled.');
  expect(report.policy?.public_assets_allowed === false, findings, 'no_public_assets', 'Contract must not allow public assets.');
  expect(report.policy?.public_ready_after_contract === 0, findings, 'public_ready_zero', 'Contract must keep public-ready at 0.');
  expect(library.schema_version === '0.1', findings, 'library_schema', 'Library schema_version must be 0.1.');
  expect(library.rights_scope === 'local_review_only', findings, 'library_review_only', 'Library must be local_review_only.');
  expect(library.storage_policy?.uploads_allowed === false, findings, 'library_uploads_false', 'Library uploads must be disabled.');
  expect(library.storage_policy?.public_assets_allowed === false, findings, 'library_public_false', 'Library public assets must be disabled.');
  expect(Array.isArray(library.assets) && library.assets.length === 2, findings, 'two_assets', 'Fixture library must include exactly two asset candidates.');
  expect((library.assets || []).every((asset) => asset.public_use_allowed === false), findings, 'all_assets_private', 'All fixture assets must have public_use_allowed=false.');
  expect((library.assets || []).every((asset) => asset.local_only === true), findings, 'all_assets_local_only', 'All fixture assets must be local_only.');
  return findings;
}

function runAssetLibraryCheck() {
  return spawnSync('node', [
    'scripts/kosmo-asset-library-check.mjs',
    '--library',
    relative(root, libraryPath)
  ], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
    shell: false
  });
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(guard) {
  const lines = [];
  lines.push('# KosmoAsset Prepare Phase 1 Fixture Contract Check');
  lines.push('');
  lines.push(`Generated: ${guard.generated_at}`);
  lines.push(`Status: \`${guard.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Contract status: ${guard.summary.contract_status}`);
  lines.push(`- Library: ${guard.summary.library_id}`);
  lines.push(`- Assets: ${guard.summary.assets}`);
  lines.push(`- Failures: ${guard.summary.failures}`);
  lines.push(`- Public-ready after check: ${guard.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  guard.findings.forEach((finding) => lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`));
  lines.push('');
  lines.push('## Asset Library Checker');
  lines.push('');
  guard.checker_stdout.forEach((line) => lines.push(`- ${line}`));
  lines.push('');
  return lines.join('\n');
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
