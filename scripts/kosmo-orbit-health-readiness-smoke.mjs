#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/health/health-readiness.contract.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-health-readiness.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-health-readiness.generated.md');

const requiredChannels = ['hardware-gpu', 'local-models', 'storage-backup', 'tool-connectors', 'job-queue', 'logs-repair'];
const requiredSafety = [
  'no_hardware_commands',
  'no_model_starts',
  'no_filesystem_scans',
  'no_process_launches',
  'no_queue_actions',
  'no_system_changes',
  'no_network_control',
  'no_uploads',
  'no_external_accounts',
  'no_costs'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Health readiness contract not found: ${contractPath}`);

  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  const report = buildReport(contract);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit health readiness smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'health_readiness_contract_passed') process.exit(1);
}

function buildReport(contract) {
  const channelIds = new Set((contract.channels ?? []).map((channel) => channel.id));
  const guards = (contract.channels ?? []).map((channel) => String(channel.guard ?? '').toLowerCase()).join(' ');
  const checks = [
    check('contract_file_exists', 'Health readiness contract file exists.', existsSync(contractPath)),
    check('status_ready', 'Contract status is ready.', contract.status === 'health_readiness_contract_ready'),
    check('mode_read_only', 'Contract mode is read-only telemetry.', contract.mode === 'read_only_telemetry_contract'),
    check('required_channels_present', 'All required health channels are present.', requiredChannels.every((id) => channelIds.has(id))),
    check('channel_count', 'Contract defines at least six health channels.', (contract.channels ?? []).length >= 6),
    check('all_channels_have_copy', 'Every channel has label, today, later and guard copy.', (contract.channels ?? []).every((channel) => channel.label && channel.today && channel.later && channel.guard)),
    check('safety_flags_present', 'All safety flags are present and true.', requiredSafety.every((key) => contract.safety?.[key] === true)),
    check('guards_block_hardware', 'Hardware commands are blocked.', guards.includes('keine hardwarebefehle')),
    check('guards_block_models', 'Model starts are blocked.', guards.includes('keine modellstarts')),
    check('guards_block_filesystem', 'Filesystem scans are blocked.', guards.includes('keine dateisystem-scans')),
    check('guards_block_processes', 'Process starts are blocked.', guards.includes('keine prozessstarts')),
    check('guards_block_queue', 'Queue actions are blocked.', guards.includes('keine queue-aktionen')),
    check('guards_block_system_changes', 'System changes are blocked.', guards.includes('keine systemaenderung')),
    check('has_next_actions', 'Contract records next safe actions.', Array.isArray(contract.next_actions) && contract.next_actions.length >= 2)
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-health-readiness-smoke',
    status: failed.length ? 'health_readiness_contract_blocked' : 'health_readiness_contract_passed',
    contract_file: relative(root, contractPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      channel_count: contract.channels?.length ?? 0,
      safety_flag_count: requiredSafety.filter((key) => contract.safety?.[key] === true).length
    },
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed health readiness contract check: ${item.id}`)
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
    '# KosmoOrbit Health Readiness Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static smoke for the future KosmoZentrale health telemetry contract. It validates only local JSON and does not read sensors, scan files, launch processes, start models, control queues, touch networks or spend money.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- health channels: ${report.summary.channel_count}`,
    `- safety flags: ${report.summary.safety_flag_count}/${requiredSafety.length}`,
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
