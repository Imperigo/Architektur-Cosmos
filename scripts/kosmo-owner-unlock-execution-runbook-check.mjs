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
    check('seven_phases', phases.length === 7, phases.map((phase) => phase.id).join(',')),
    check('validator_first', phases[0]?.commands?.[0]?.includes('owner-unlock-reply-validator'), phases[0]?.commands?.[0]),
    check('map_after_validator', phases[1]?.commands?.[0]?.includes('owner-unlock-reply-intake-map'), phases[1]?.commands?.[0]),
    check('manual_gate_before_intake_edit', phases[2]?.type === 'manual_gate' && phases[3]?.mutates_project_files === true, `${phases[2]?.type}:${phases[3]?.mutates_project_files}`),
    check('intake_guard_before_session_plan', phases[3]?.commands?.includes('npm run kosmo:owner-answer-intake-check') && phases[4]?.commands?.includes('npm run kosmo:owner-answer-session-edit-plan'), `${phases[3]?.commands?.join(',')} -> ${phases[4]?.commands?.join(',')}`),
    check('source_guards_conditional', phases[5]?.type === 'conditional_command' && phases[5]?.condition?.includes('Only if'), phases[5]?.condition),
    check('post_source_conditional', phases[6]?.type === 'conditional_command' && phases[6]?.condition?.includes('Only after phase 6 passes'), phases[6]?.condition),
    check('expected_command_count', commands.length === 12, commands.length),
    check('includes_activation_preflight', commands.includes('npm run kosmo:source-root-activation-preflight'), commands.join('; ')),
    check('includes_post_source_readiness', commands.includes('npm run kosmo:post-source-root-metadata-readiness-pack'), commands.join('; ')),
    check('one_mutating_phase_after_review', runbook.summary?.phases_that_may_mutate_after_review === 1, runbook.summary?.phases_that_may_mutate_after_review),
    check('hard_stop_no_private_diagnostic_from_valid_reply', hardStops.includes('merely valid reply'), hardStops),
    check('hard_stop_review_before_intake', hardStops.includes('reviewing the intake map'), hardStops),
    check('hard_stop_intake_guard_before_session', hardStops.includes('intake guard passes'), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('private content'), hardStops),
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
