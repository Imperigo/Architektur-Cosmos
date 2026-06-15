#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const runbookPath = resolve(root, args.runbook || `data/kosmo-owner-unlock-execution-runbook-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-execution-runbook-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-execution-runbook-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const runbook = await readJson(runbookPath);
  const checks = buildChecks(runbook);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_execution_runbook_guard_passed'
      : 'owner_unlock_execution_runbook_guard_failed',
    policy: {
      validates_runbook_only: true,
      executes_commands_now: false,
      records_decisions: false,
      writes_intake_file_now: false,
      mutates_session_files_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, runbookPath)],
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

  console.log('Kosmo owner unlock execution runbook check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(runbook) {
  const phases = runbook.phases || [];
  const commands = phases.flatMap((phase) => phase.commands || []);
  const hardStops = (runbook.hard_stops || []).join(' ').toLowerCase();
  const expectedSessionFile = `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`;
  const allowedTargets = phases.flatMap((phase) => phase.allowed_target_files || []);
  return [
    check('status_ready', runbook.status === 'owner_unlock_execution_runbook_ready', runbook.status),
    check('policy_runbook_only', runbook.policy?.runbook_only === true, runbook.policy?.runbook_only),
    check('policy_no_commands_now', runbook.policy?.executes_commands_now === false, runbook.policy?.executes_commands_now),
    check('policy_no_decisions', runbook.policy?.records_decisions === false, runbook.policy?.records_decisions),
    check('policy_no_intake_write_now', runbook.policy?.writes_intake_file_now === false, runbook.policy?.writes_intake_file_now),
    check('policy_no_session_mutation_now', runbook.policy?.mutates_session_files_now === false, runbook.policy?.mutates_session_files_now),
    check('policy_no_private_reads_now', runbook.policy?.reads_private_content_now === false, runbook.policy?.reads_private_content_now),
    check('policy_no_inventory_now', runbook.policy?.runs_private_inventory_now === false, runbook.policy?.runs_private_inventory_now),
    check('public_ready_zero', runbook.summary?.public_ready_after_runbook === 0, runbook.summary?.public_ready_after_runbook),
    check('eight_phases', phases.length === 8, phases.map((phase) => phase.id).join(',')),
    check('start_card_first', phases[0]?.commands?.[0]?.includes('owner-unlock-operational-start-card'), phases[0]?.commands?.[0]),
    check('validator_after_start_card', phases[1]?.commands?.[0]?.includes('owner-unlock-reply-validator'), phases[1]?.commands?.[0]),
    check('dry_run_after_validator', phases[2]?.commands?.[0]?.includes('owner-unlock-answer-dry-run'), phases[2]?.commands?.[0]),
    check('session_preview_before_mutation', phases[3]?.commands?.includes('npm run kosmo:owner-unlock-session-edit-preview') && phases[4]?.mutates_project_files === true, `${phases[3]?.commands?.join(',')} -> ${phases[4]?.mutates_project_files}`),
    check('manual_gate_before_session_edit', phases[3]?.type === 'manual_gate' && phases[4]?.type === 'manual_or_reviewed_edit', `${phases[3]?.type}:${phases[4]?.type}`),
    check('source_guards_conditional', phases[5]?.type === 'conditional_command' && phases[5]?.condition?.includes('Only if'), phases[5]?.condition),
    check('post_source_conditional', phases[6]?.type === 'conditional_command' && phases[6]?.condition?.includes('Only after phase 6 passes'), phases[6]?.condition),
    check('private_metadata_final_conditional', phases[7]?.type === 'conditional_command' && phases[7]?.condition?.includes('private_metadata_inventory executable_now=true'), phases[7]?.condition),
    check('expected_command_count', commands.length === 21, commands.length),
    check('includes_activation_preflight', commands.includes('npm run kosmo:source-root-activation-preflight'), commands.join('; ')),
    check('includes_start_card_check', commands.includes('npm run kosmo:owner-unlock-operational-start-card-check'), commands.join('; ')),
    check('includes_session_preview_check', commands.includes('npm run kosmo:owner-unlock-session-edit-preview-check'), commands.join('; ')),
    check('includes_post_owner_queue_check', commands.includes('npm run kosmo:source-root-post-owner-activation-queue-check'), commands.join('; ')),
    check('includes_private_metadata_check_only_final', phases[7]?.commands?.includes('npm run kosmo:private-metadata-inventory-check'), phases[7]?.commands?.join('; ')),
    check('one_mutating_phase_after_review', runbook.summary?.phases_that_may_mutate_after_review === 1, runbook.summary?.phases_that_may_mutate_after_review),
    check('current_session_file_summary', runbook.summary?.expected_session_file === expectedSessionFile, runbook.summary?.expected_session_file),
    check('only_current_session_target_allowed', allowedTargets.length === 1 && allowedTargets[0] === expectedSessionFile, allowedTargets.join(',')),
    check('no_old_2026_06_14_targets', !JSON.stringify(runbook).includes('source-root-decision-session-2026-06-14') && !JSON.stringify(runbook).includes('owner-answer-intake-template-2026-06-14'), 'old target search'),
    check('start_card_status_ready', runbook.summary?.operational_start_card_status === 'owner_unlock_operational_start_card_ready', runbook.summary?.operational_start_card_status),
    check('checkpoint_status_ready', runbook.summary?.pipeline_checkpoint_status === 'owner_unlock_pipeline_checkpoint_ready', runbook.summary?.pipeline_checkpoint_status),
    check('queue_status_ready', runbook.summary?.post_owner_queue_status === 'source_root_post_owner_activation_queue_ready', runbook.summary?.post_owner_queue_status),
    check('queue_still_blocked_now', runbook.summary?.post_owner_queue_executable_now === 0, runbook.summary?.post_owner_queue_executable_now),
    check('hard_stop_no_private_diagnostic_from_valid_reply', hardStops.includes('merely valid reply') && hardStops.includes('freeform'), hardStops),
    check('hard_stop_no_intake_edit', hardStops.includes('do not edit intake files'), hardStops),
    check('hard_stop_current_session_only', hardStops.includes(expectedSessionFile.toLowerCase()), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('private content'), hardStops),
    check('hard_stop_private_metadata_queue_gate', hardStops.includes('post-owner queue explicitly unblocks'), hardStops),
    check('hard_stop_no_public_ready', hardStops.includes('public-ready'), hardStops)
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
  lines.push('# Kosmo Owner Unlock Execution Runbook Check');
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
