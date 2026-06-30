#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const rollupPath = resolve(root, args.rollup || `data/kosmo-evening-batch-rollup-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-evening-batch-rollup-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-evening-batch-rollup-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const rollup = await readJson(rollupPath);
  const checks = buildChecks(rollup);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'kosmo_evening_batch_rollup_guard_passed'
      : 'kosmo_evening_batch_rollup_guard_failed',
    policy: {
      validates_rollup_only: true,
      reads_private_content: false,
      records_owner_decisions: false,
      runs_private_inventory_now: false,
      executes_local_workers_now: false,
      writes_training_data_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, rollupPath)],
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

  console.log('Kosmo evening batch rollup check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(rollup) {
  const packs = rollup.packs || [];
  const hardStops = (rollup.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', rollup.status === 'kosmo_evening_batch_rollup_ready', rollup.status),
    check('policy_rollup_only', rollup.policy?.rollup_only === true, rollup.policy?.rollup_only),
    check('policy_no_private_reads', rollup.policy?.reads_private_content === false, rollup.policy?.reads_private_content),
    check('policy_no_decisions', rollup.policy?.records_owner_decisions === false, rollup.policy?.records_owner_decisions),
    check('policy_no_inventory_now', rollup.policy?.runs_private_inventory_now === false, rollup.policy?.runs_private_inventory_now),
    check('policy_no_workers_now', rollup.policy?.executes_local_workers_now === false, rollup.policy?.executes_local_workers_now),
    check('policy_no_training_now', rollup.policy?.writes_training_data_now === false, rollup.policy?.writes_training_data_now),
    check('public_ready_zero', rollup.summary?.public_ready_after_rollup === 0, rollup.summary?.public_ready_after_rollup),
    check('eight_readiness_packs', packs.length === 8, packs.map((pack) => pack.id).join(',')),
    check('packs_not_executable', packs.every((pack) => pack.executable_now === false), packs.filter((pack) => pack.executable_now).map((pack) => pack.id).join(',')),
    check('pack_public_ready_zero', packs.every((pack) => pack.public_ready_after_pack === 0), packs.filter((pack) => pack.public_ready_after_pack !== 0).map((pack) => pack.id).join(',')),
    check('owner_action_required', rollup.next_owner_action?.required === true, rollup.next_owner_action?.required),
    check('accepted_choices_present', ['keep_blocked', 'repair_onedrive_first', 'select_exact_root_1'].every((choice) => rollup.next_owner_action?.accepted_choices?.includes(choice)), rollup.next_owner_action?.accepted_choices?.join(',')),
    check('no_codex_executable_now', rollup.summary?.executable_now === 0, rollup.summary?.executable_now),
    check('source_free_remaining_bounded', rollup.summary?.source_free_codex_tasks_remaining <= 3, rollup.summary?.source_free_codex_tasks_remaining),
    check('training_eval_templates_six', rollup.summary?.training_eval_templates === 6, rollup.summary?.training_eval_templates),
    check('training_review_lanes_five', rollup.summary?.training_review_lanes === 5, rollup.summary?.training_review_lanes),
    check('ontology_entity_types_eight', rollup.summary?.ontology_entity_types === 8, rollup.summary?.ontology_entity_types),
    check('guarded_checks_include_training_scaffold', String(rollup.summary?.guarded_checks || '').includes('eval template') && String(rollup.summary?.guarded_checks || '').includes('review queue') && String(rollup.summary?.guarded_checks || '').includes('ontology'), rollup.summary?.guarded_checks),
    check('hard_stops_private_training', hardStops.includes('private source contents') && hardStops.includes('local workers'), hardStops),
    check('hard_stops_no_eval_queue_embedding_finetune', hardStops.includes('eval rows') && hardStops.includes('queue items') && hardStops.includes('embeddings') && hardStops.includes('fine-tunes'), hardStops),
    check('hard_stops_public_ready', hardStops.includes('public-ready'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Evening Batch Rollup Check');
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
