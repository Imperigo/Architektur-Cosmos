#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const batchPath = resolve(root, args.batch || `data/kosmo-evening-big-batch-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-evening-big-batch-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-evening-big-batch-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const batch = JSON.parse(await readFile(batchPath, 'utf8'));
  const checks = buildChecks(batch);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'evening_big_batch_guard_passed' : 'evening_big_batch_guard_failed',
    policy: {
      validates_plan_only: true,
      reads_private_content: false,
      executes_local_workers: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, batchPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      warnings: 0,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo evening big batch check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(batch) {
  const commands = (batch.phases || []).flatMap((phase) => phase.commands || []);
  const hardStops = (batch.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', batch.status === 'evening_big_batch_ready', batch.status),
    check('seven_phases', (batch.phases || []).length === 7, (batch.phases || []).length),
    check('required_commands_enough', commands.length >= 30, commands.length),
    check('policy_review_only', batch.policy?.review_only_default === true, batch.policy?.review_only_default),
    check('policy_no_private_reads', batch.policy?.reads_private_content_now === false, batch.policy?.reads_private_content_now),
    check('policy_no_copy_private_to_git', batch.policy?.copies_private_content_to_git === false, batch.policy?.copies_private_content_to_git),
    check('policy_no_ocr_now', batch.policy?.runs_ocr_now === false, batch.policy?.runs_ocr_now),
    check('policy_no_embeddings_now', batch.policy?.creates_embeddings_now === false, batch.policy?.creates_embeddings_now),
    check('policy_no_finetune_now', batch.policy?.runs_fine_tuning_now === false, batch.policy?.runs_fine_tuning_now),
    check('policy_no_private_worker_execution', batch.policy?.executes_local_workers_on_private_content_now === false, batch.policy?.executes_local_workers_on_private_content_now),
    check('policy_no_public_ready', batch.policy?.publishes_or_sets_public_ready === false && batch.summary?.public_ready_after_batch === 0, batch.summary?.public_ready_after_batch),
    check('owner_actions_clear', batch.summary?.owner_actions_now === 0, batch.summary?.owner_actions_now),
    check('review_batches_resolved', batch.summary?.review_batches_resolved === 5 && batch.summary?.review_items_resolved === 16, `${batch.summary?.review_batches_resolved}/${batch.summary?.review_items_resolved}`),
    check('has_data_lane_refresh', commands.includes('npm run kosmo:data-lane-sweep'), commands.join(' ')),
    check('has_references_pilot_work', commands.includes('npm run kosmo:pilot-gap-label-review-check'), commands.join(' ')),
    check('has_asset_review_work', commands.includes('npm run kosmo:asset-candidate-taxonomy-review-check'), commands.join(' ')),
    check('has_local_worker_guards', commands.includes('npm run kosmo:local-worker-execution-runbook-check'), commands.join(' ')),
    check('has_orbit_overseer_sync', commands.includes('npm run kosmo:overseer-sync-board-check'), commands.join(' ')),
    check('has_final_lint', commands.includes('npm run lint'), commands.join(' ')),
    check('hard_stops_private_sources', hardStops.includes('privaten pdfs') && hardStops.includes('geschuetzten assets'), hardStops),
    check('hard_stops_no_public', hardStops.includes('public-freigabe') && hardStops.includes('asset-promotion'), hardStops),
    check('hard_stops_no_llm_private', hardStops.includes('lokalen llms') && hardStops.includes('privaten inhaltsdateien'), hardStops),
    check('hard_stops_worker_visibility', hardStops.includes('fremden worker-artefakte') && hardStops.includes('handoff'), hardStops)
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
  lines.push('# Kosmo Evening Big Batch Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
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
