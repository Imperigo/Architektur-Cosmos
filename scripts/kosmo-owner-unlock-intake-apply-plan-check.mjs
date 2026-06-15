#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const planPath = resolve(root, args.plan || `data/kosmo-owner-unlock-intake-apply-plan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-intake-apply-plan-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-intake-apply-plan-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const checks = buildChecks(plan);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_intake_apply_plan_guard_passed'
      : 'owner_unlock_intake_apply_plan_guard_failed',
    policy: {
      review_only: true,
      validates_plan_only: true,
      writes_intake_now: false,
      records_decisions: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, planPath)],
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

  console.log('Kosmo owner unlock intake apply plan check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(plan) {
  const hardStops = (plan.hard_stops || []).join(' ').toLowerCase();
  const commands = (plan.after_manual_apply_commands || []).join(' ');
  return [
    check('status_ready', plan.status === 'owner_unlock_intake_apply_plan_ready', plan.status),
    check('policy_review_only', plan.policy?.review_only === true, plan.policy?.review_only),
    check('policy_plan_only', plan.policy?.plan_only === true, plan.policy?.plan_only),
    check('policy_no_write_now', plan.policy?.writes_intake_now === false && plan.summary?.writes_intake_now === false, `${plan.policy?.writes_intake_now}/${plan.summary?.writes_intake_now}`),
    check('policy_no_decision_recording', plan.policy?.records_decisions === false, plan.policy?.records_decisions),
    check('policy_no_session_mutation', plan.policy?.mutates_session_files === false, plan.policy?.mutates_session_files),
    check('policy_no_source_root_guards_now', plan.policy?.runs_source_root_guards === false, plan.policy?.runs_source_root_guards),
    check('policy_no_private_reads', plan.policy?.reads_private_content === false, plan.policy?.reads_private_content),
    check('policy_no_private_inventory', plan.policy?.runs_private_inventory_now === false, plan.policy?.runs_private_inventory_now),
    check('public_ready_zero', plan.summary?.public_ready_after_plan === 0, plan.summary?.public_ready_after_plan),
    check('planned_field_count', plan.summary?.planned_field_edits === 13, plan.summary?.planned_field_edits),
    check('source_root_field_count', plan.summary?.source_root_field_edits === 3, plan.summary?.source_root_field_edits),
    check('owner_card_field_count', plan.summary?.owner_card_field_edits === 10, plan.summary?.owner_card_field_edits),
    check('target_empty_before_apply', plan.summary?.target_intake_currently_empty === true, plan.summary?.target_intake_currently_empty),
    check('selected_root_exists', plan.summary?.selected_root_exists === true, plan.summary?.selected_root_exists),
    check('all_fields_write_false', (plan.planned_field_edits || []).every((edit) => edit.writes_now === false), (plan.planned_field_edits || []).filter((edit) => edit.writes_now !== false).map((edit) => edit.path).join(',')),
    check('after_apply_intake_check_first', commands.includes('owner-answer-intake-check'), commands),
    check('hard_stop_no_auto_apply', hardStops.includes('do not apply this plan automatically'), hardStops),
    check('hard_stop_no_overwrite', hardStops.includes('do not overwrite non-empty owner intake fields'), hardStops),
    check('hard_stop_no_session_mutation', hardStops.includes('do not mutate session files'), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('do not read private content'), hardStops),
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

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Intake Apply Plan Check');
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
