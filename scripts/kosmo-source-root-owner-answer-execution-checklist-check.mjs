#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const checklistPath = resolve(root, args.checklist || `data/kosmo-source-root-owner-answer-execution-checklist-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-source-root-owner-answer-execution-checklist-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-owner-answer-execution-checklist-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const checklist = await readJson(checklistPath);
  const checks = buildChecks(checklist);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'source_root_owner_answer_execution_checklist_guard_passed'
      : 'source_root_owner_answer_execution_checklist_guard_failed',
    policy: {
      validates_checklist_only: true,
      records_decisions: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      executes_commands: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, checklistPath)],
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

  console.log('Kosmo source-root owner answer execution checklist check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(checklist) {
  const branches = checklist.branches || [];
  const branchIds = branches.map((branch) => branch.id);
  const unlockBranches = branches.filter((branch) => branch.unlocks_private_metadata_diagnostic === true);
  const allCommands = branches.flatMap((branch) => branch.command_order_after_recording || []);
  const forbiddenCommand = allCommands.find((command) => /ocr|pdf-text|extract|upload|publish|public-ready|rm |cp |rsync|scp|ssh/i.test(command));

  return [
    check('status_ready', checklist.status === 'source_root_owner_answer_execution_checklist_ready', checklist.status),
    check('policy_checklist_only', checklist.policy?.checklist_only === true, checklist.policy?.checklist_only),
    check('policy_no_decision_recording', checklist.policy?.records_decisions === false, checklist.policy?.records_decisions),
    check('policy_no_private_reads', checklist.policy?.reads_private_content === false, checklist.policy?.reads_private_content),
    check('policy_no_private_inventory_now', checklist.policy?.runs_private_inventory_now === false, checklist.policy?.runs_private_inventory_now),
    check('policy_no_command_execution', checklist.policy?.executes_commands === false, checklist.policy?.executes_commands),
    check('public_ready_zero', checklist.summary?.public_ready_after_checklist === 0, checklist.summary?.public_ready_after_checklist),
    check('three_branches', branches.length === 3, branches.length),
    check('expected_branches_present', ['keep_blocked', 'repair_onedrive_first', 'select_exact_root_1'].every((id) => branchIds.includes(id)), branchIds.join(',')),
    check('one_unlock_branch', unlockBranches.length === 1 && unlockBranches[0]?.id === 'select_exact_root_1', unlockBranches.map((branch) => branch.id).join(',')),
    check('nothing_executable_now', branches.every((branch) => branch.executable_now === false), branches.filter((branch) => branch.executable_now).map((branch) => branch.id).join(',')),
    check('owner_confirmation_required', branches.every((branch) => branch.owner_confirmation_required === true), branches.map((branch) => `${branch.id}:${branch.owner_confirmation_required}`).join(',')),
    check('unlock_allows_inventory_after_guards_only', unlockBranches[0]?.allowed_after_explicit_owner_answer?.run_private_metadata_inventory_after_guards === true, unlockBranches[0]?.allowed_after_explicit_owner_answer?.run_private_metadata_inventory_after_guards),
    check('blocked_branches_no_inventory', branches.filter((branch) => !branch.unlocks_private_metadata_diagnostic).every((branch) => branch.allowed_after_explicit_owner_answer?.run_private_metadata_inventory_after_guards === false), 'blocked branches'),
    check('no_forbidden_commands', forbiddenCommand === undefined, forbiddenCommand),
    check('hard_stops_present', (checklist.hard_stops || []).length >= 6, (checklist.hard_stops || []).length)
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
  lines.push('# Kosmo Source-Root Owner Answer Execution Checklist Check');
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
