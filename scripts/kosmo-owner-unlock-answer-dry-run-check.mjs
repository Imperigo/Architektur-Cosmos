#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const dryRunPath = resolve(root, args.dryRun || `data/kosmo-owner-unlock-answer-dry-run-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-answer-dry-run-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-answer-dry-run-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const dryRun = await readJson(dryRunPath);
  const checks = buildChecks(dryRun);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_answer_dry_run_guard_passed'
      : 'owner_unlock_answer_dry_run_guard_failed',
    policy: {
      validates_dry_run_only: true,
      records_decisions: false,
      writes_intake_file: false,
      mutates_session_files: false,
      runs_source_root_guards: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, dryRunPath)],
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

  console.log('Kosmo owner unlock answer dry run check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(dryRun) {
  const hardStops = (dryRun.hard_stops || []).join(' ').toLowerCase();
  const ready = dryRun.status === 'owner_unlock_answer_dry_run_ready_for_review';
  const pending = dryRun.status === 'owner_unlock_answer_dry_run_pending_answer';
  return [
    check('status_known', ready || pending || dryRun.status === 'owner_unlock_answer_dry_run_attention_required', dryRun.status),
    check('policy_dry_run_only', dryRun.policy?.dry_run_only === true, dryRun.policy?.dry_run_only),
    check('policy_isolated_reports_only', dryRun.policy?.writes_isolated_reports_only === true, dryRun.policy?.writes_isolated_reports_only),
    check('policy_no_decisions', dryRun.policy?.records_decisions === false, dryRun.policy?.records_decisions),
    check('policy_no_intake_write', dryRun.policy?.writes_intake_file === false, dryRun.policy?.writes_intake_file),
    check('policy_no_session_mutation', dryRun.policy?.mutates_session_files === false, dryRun.policy?.mutates_session_files),
    check('policy_no_source_root_guards', dryRun.policy?.runs_source_root_guards === false, dryRun.policy?.runs_source_root_guards),
    check('policy_no_private_reads', dryRun.policy?.reads_private_content === false, dryRun.policy?.reads_private_content),
    check('policy_no_inventory_now', dryRun.policy?.runs_private_inventory_now === false, dryRun.policy?.runs_private_inventory_now),
    check('public_ready_zero', dryRun.summary?.public_ready_after_dry_run === 0, dryRun.summary?.public_ready_after_dry_run),
    check('four_steps', (dryRun.steps || []).length === 4, (dryRun.steps || []).map((step) => step.id).join(',')),
    check('validator_step_present', (dryRun.steps || []).some((step) => step.id === 'validator'), (dryRun.steps || []).map((step) => step.id).join(',')),
    check('validator_check_step_present', (dryRun.steps || []).some((step) => step.id === 'validator-check'), (dryRun.steps || []).map((step) => step.id).join(',')),
    check('intake_map_step_present', (dryRun.steps || []).some((step) => step.id === 'intake-map'), (dryRun.steps || []).map((step) => step.id).join(',')),
    check('intake_map_check_step_present', (dryRun.steps || []).some((step) => step.id === 'intake-map-check'), (dryRun.steps || []).map((step) => step.id).join(',')),
    check('ready_requires_valid_validator', !ready || dryRun.summary?.validator_status === 'owner_unlock_reply_valid', dryRun.summary?.validator_status),
    check('ready_requires_map_ready', !ready || dryRun.summary?.intake_map_status === 'owner_unlock_reply_intake_map_ready_for_review', dryRun.summary?.intake_map_status),
    check('pending_has_no_patch', !pending || dryRun.summary?.patch_operations === 0, dryRun.summary?.patch_operations),
    check('hard_stop_no_approval', hardStops.includes('applied owner approval'), hardStops),
    check('hard_stop_no_source_root_guards', hardStops.includes('source-root guards'), hardStops),
    check('hard_stop_no_intake_write', hardStops.includes('intake template'), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('private content'), hardStops),
    check('hard_stop_public_ready_zero', hardStops.includes('public-ready') && hardStops.includes('0'), hardStops)
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
  lines.push('# Kosmo Owner Unlock Answer Dry Run Check');
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
