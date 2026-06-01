#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/routines/orbit-office-routine.contract.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-office-routine.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-office-routine.generated.md');

const requiredPhases = ['morning', 'workday', 'training', 'evening', 'safety'];
const requiredBlockedActions = [
  'start_local_model',
  'launch_blender',
  'generate_geometry',
  'write_user_project_data',
  'upload_to_cloud',
  'sync_external_account',
  'public_publish',
  'push_to_main_without_go',
  'spend_money'
];
const requiredSafety = [
  'no_cloud_costs',
  'no_external_accounts',
  'no_uploads',
  'no_runtime_processes',
  'no_model_start',
  'no_geometry_generation',
  'no_public_publish',
  'no_user_data_writes',
  'no_unapproved_push'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Orbit office routine contract not found: ${contractPath}`);

  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  const report = buildReport(contract);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit office routine smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_office_routine_contract_passed') process.exit(1);
}

function buildReport(contract) {
  const routines = contract.routines ?? [];
  const phases = new Set(routines.map((routine) => routine.phase));
  const blockedActions = new Set(contract.blocked_actions ?? []);
  const checks = [
    check('contract_file_exists', 'Office routine contract file exists.', existsSync(contractPath)),
    check('status_ready', 'Office routine contract status is ready.', contract.status === 'orbit_office_routine_contract_ready'),
    check('mode_static_review_only', 'Office routine contract is static review-only.', contract.mode === 'static_review_only'),
    check('routine_count', 'Office routine defines at least six routine moments.', routines.length >= 6),
    check('required_phases_present', 'Office routine covers morning, workday, training, evening and safety phases.', requiredPhases.every((phase) => phases.has(phase))),
    check('all_routines_have_trace_fields', 'Every routine has phase, owner, intent, signals, output and confirmation flag.', routines.every((routine) => routine.id && routine.phase && routine.owner_role && routine.intent && Array.isArray(routine.allowed_signals) && routine.output && typeof routine.requires_human_confirmation === 'boolean')),
    check('all_routines_non_writing', 'Current routines do not write user data.', routines.every((routine) => routine.writes_user_data === false)),
    check('blocked_actions_complete', 'Routine contract blocks runtime, cloud, publish, push and cost actions.', requiredBlockedActions.every((action) => blockedActions.has(action))),
    check('safety_flags_present', 'All safety flags are present and true.', requiredSafety.every((key) => contract.safety?.[key] === true)),
    check('has_next_actions', 'Contract records next safe actions.', Array.isArray(contract.next_actions) && contract.next_actions.length >= 2)
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-office-routine-smoke',
    status: failed.length ? 'orbit_office_routine_contract_blocked' : 'orbit_office_routine_contract_passed',
    contract_file: relative(root, contractPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      routine_count: routines.length,
      phase_count: phases.size,
      blocked_action_count: blockedActions.size,
      writing_routine_count: routines.filter((routine) => routine.writes_user_data === true).length
    },
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed office routine contract check: ${item.id}`)
      : contract.next_actions
  };
}

function check(id, label, passed) {
  return {
    id,
    label,
    status: passed ? 'passed' : 'failed'
  };
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Office Routine Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static smoke for the future office rhythm in KosmoOrbit. It validates JSON only and does not start models, launch tools, write user data, upload, publish, sync external accounts or spend money.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- routines: ${report.summary.routine_count}`,
    `- phases: ${report.summary.phase_count}`,
    `- blocked actions: ${report.summary.blocked_action_count}`,
    `- writing routines: ${report.summary.writing_routine_count}`,
    '',
    '## Checks',
    '',
    '| Check | Status | Meaning |',
    '| --- | --- | --- |'
  ];

  report.checks.forEach((item) => {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`);
  });

  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
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
