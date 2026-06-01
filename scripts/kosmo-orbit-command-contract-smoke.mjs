#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/commands/orbit-command.contract.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-command-contract.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-command-contract.generated.md');

const requiredCommands = [
  'open-project-package',
  'open-design-review',
  'run-quality-checks',
  'start-blender-pipeline',
  'generate-design-variant',
  'write-decision-record',
  'publish-package',
  'repair-connector',
  'sync-external-collab'
];

const requiredSafety = [
  'no_process_launches',
  'no_geometry_generation',
  'no_user_writes',
  'no_public_publish',
  'no_uploads',
  'no_external_accounts',
  'no_network_control',
  'no_costs'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Orbit command contract not found: ${contractPath}`);

  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  const report = buildReport(contract);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit command contract smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_command_contract_passed') process.exit(1);
}

function buildReport(contract) {
  const commandIds = new Set((contract.commands ?? []).map((command) => command.id));
  const states = new Set((contract.commands ?? []).map((command) => command.state));
  const gates = (contract.commands ?? []).map((command) => String(command.gate ?? '').toLowerCase()).join(' ');
  const checks = [
    check('contract_file_exists', 'Command contract file exists.', existsSync(contractPath)),
    check('status_ready', 'Command contract status is ready.', contract.status === 'orbit_command_contract_ready'),
    check('mode_static_review_only', 'Command contract is static review-only.', contract.mode === 'static_review_only'),
    check('required_commands_present', 'All required command intents are present.', requiredCommands.every((id) => commandIds.has(id))),
    check('command_count', 'Contract defines at least nine command intents.', (contract.commands ?? []).length >= 9),
    check('states_cover_review_and_blocked', 'Contract separates review, local check and blocked states.', states.has('review_enabled') && states.has('local_check') && states.has('blocked')),
    check('all_commands_have_copy', 'Every command has label, area, role, today and gate copy.', (contract.commands ?? []).every((command) => command.label && command.area && command.role && command.today && command.gate)),
    check('safety_flags_present', 'All safety flags are present and true.', requiredSafety.every((key) => contract.safety?.[key] === true)),
    check('blocks_process_launches', 'Process launches stay blocked.', gates.includes('keine prozessstarts')),
    check('blocks_geometry_generation', 'Geometry generation stays blocked.', gates.includes('keine geometrie-generierung')),
    check('blocks_user_writes', 'User writes stay blocked.', gates.includes('keine user-writes')),
    check('blocks_public_publish', 'Public publish stays blocked.', gates.includes('kein public-publish')),
    check('blocks_network_control', 'Network control stays blocked.', gates.includes('keine netzwerksteuerung')),
    check('has_next_actions', 'Contract records next safe actions.', Array.isArray(contract.next_actions) && contract.next_actions.length >= 2)
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-command-contract-smoke',
    status: failed.length ? 'orbit_command_contract_blocked' : 'orbit_command_contract_passed',
    contract_file: relative(root, contractPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      command_count: contract.commands?.length ?? 0,
      blocked_command_count: (contract.commands ?? []).filter((command) => command.state === 'blocked').length,
      review_enabled_command_count: (contract.commands ?? []).filter((command) => command.state === 'review_enabled').length
    },
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed command contract check: ${item.id}`)
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
    '# KosmoOrbit Command Contract Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static smoke for the future KosmoOrbit command contract. It validates local JSON only and does not launch tools, generate geometry, write user data, upload, publish, access external accounts, control networks or spend money.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- commands: ${report.summary.command_count}`,
    `- blocked commands: ${report.summary.blocked_command_count}`,
    `- review-enabled commands: ${report.summary.review_enabled_command_count}`,
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
