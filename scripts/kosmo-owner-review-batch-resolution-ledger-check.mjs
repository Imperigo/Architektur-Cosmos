#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const ledgerPath = resolve(root, args.ledger || `data/kosmo-owner-review-batch-resolution-ledger-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-review-batch-resolution-ledger-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-review-batch-resolution-ledger-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  const checks = buildChecks(ledger);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_review_batch_resolution_ledger_guard_passed'
      : 'owner_review_batch_resolution_ledger_guard_failed',
    policy: {
      validates_ledger_only: true,
      records_reference_item_decisions: false,
      records_asset_approvals: false,
      writes_session_files: false,
      reads_private_content: false,
      public_ready_after_guard: 0
    },
    source_refs: [relative(root, ledgerPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      warnings: 0,
      public_ready_after_guard: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner review batch resolution ledger check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(ledger) {
  const hardStops = (ledger.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', ledger.status === 'owner_review_batch_resolution_ledger_ready', ledger.status),
    check('policy_review_only', ledger.policy?.review_only === true, ledger.policy?.review_only),
    check('no_reference_item_decisions', ledger.policy?.records_reference_item_decisions === false, ledger.policy?.records_reference_item_decisions),
    check('no_asset_approvals', ledger.policy?.records_asset_approvals === false, ledger.policy?.records_asset_approvals),
    check('no_session_writes', ledger.policy?.writes_session_files === false, ledger.policy?.writes_session_files),
    check('no_private_reads', ledger.policy?.reads_private_content === false, ledger.policy?.reads_private_content),
    check('no_private_inventory_now', ledger.policy?.runs_private_inventory_now === false, ledger.policy?.runs_private_inventory_now),
    check('no_public_writes', ledger.policy?.writes_public_files === false && ledger.policy?.writes_public_manifest === false, `${ledger.policy?.writes_public_files}/${ledger.policy?.writes_public_manifest}`),
    check('public_ready_zero', ledger.summary?.public_ready_after_ledger === 0, ledger.summary?.public_ready_after_ledger),
    check('all_batches_resolved', ledger.summary?.resolved_batches === ledger.summary?.batches, `${ledger.summary?.resolved_batches}/${ledger.summary?.batches}`),
    check('all_items_resolved', ledger.summary?.resolved_items === ledger.summary?.items, `${ledger.summary?.resolved_items}/${ledger.summary?.items}`),
    check('owner_action_zero', ledger.summary?.owner_action_required === 0, ledger.summary?.owner_action_required),
    check('five_resolutions', (ledger.resolutions || []).length === 5, (ledger.resolutions || []).length),
    check('resolution_public_ready_zero', (ledger.resolutions || []).every((resolution) => resolution.public_ready_after_resolution === 0), (ledger.resolutions || []).map((resolution) => resolution.public_ready_after_resolution).join(',')),
    check('hard_stop_public_ready', hardStops.includes('public-ready'), hardStops),
    check('hard_stop_no_private_copy', hardStops.includes('private files'), hardStops),
    check('hard_stop_no_private_extraction', hardStops.includes('ocr') || hardStops.includes('extract'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Review Batch Resolution Ledger Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after guard: ${report.summary.public_ready_after_guard}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((checkItem) => {
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${String(checkItem.evidence ?? '-')}`);
  });
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
