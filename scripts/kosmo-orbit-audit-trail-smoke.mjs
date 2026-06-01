#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/audit/orbit-audit-trail.contract.json');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-audit-trail.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-audit-trail.generated.md');

const requiredEventCommands = [
  'open-project-package',
  'open-design-review',
  'run-quality-checks',
  'start-blender-pipeline',
  'generate-design-variant',
  'publish-package'
];

const requiredSafety = [
  'no_user_writes',
  'no_process_launches',
  'no_geometry_generation',
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
  if (!existsSync(contractPath)) throw new Error(`Orbit audit trail contract not found: ${contractPath}`);

  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  const report = buildReport(contract);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit audit trail smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_audit_trail_contract_passed') process.exit(1);
}

function buildReport(contract) {
  const commandIds = new Set((contract.events ?? []).map((event) => event.command_id));
  const outcomes = new Set((contract.events ?? []).map((event) => event.outcome));
  const checks = [
    check('contract_file_exists', 'Audit trail contract file exists.', existsSync(contractPath)),
    check('status_ready', 'Audit trail contract status is ready.', contract.status === 'orbit_audit_trail_contract_ready'),
    check('mode_static_review_only', 'Audit trail contract is static review-only.', contract.mode === 'static_review_only'),
    check('required_event_commands_present', 'Audit trail covers required command intents.', requiredEventCommands.every((id) => commandIds.has(id))),
    check('event_count', 'Audit trail defines at least six representative events.', (contract.events ?? []).length >= 6),
    check('outcomes_cover_review_check_and_blocked', 'Audit trail covers review, local check and blocked outcomes.', outcomes.has('review_enabled') && outcomes.has('local_check') && outcomes.has('blocked')),
    check('all_events_have_trace_fields', 'Every event has command, role, intent, evidence, gate, outcome and writes flag.', (contract.events ?? []).every((event) => event.command_id && event.actor_role && event.intent && event.evidence && event.gate && event.outcome && typeof event.writes === 'boolean')),
    check('all_events_non_writing', 'Current audit events do not write user data.', (contract.events ?? []).every((event) => event.writes === false)),
    check('retention_is_static_today', 'Retention policy stays static today and requires review before persistence.', contract.retention_policy?.today_storage === 'static_contract_only' && contract.retention_policy?.requires_human_review_before_persistence === true),
    check('safety_flags_present', 'All safety flags are present and true.', requiredSafety.every((key) => contract.safety?.[key] === true)),
    check('has_next_actions', 'Contract records next safe actions.', Array.isArray(contract.next_actions) && contract.next_actions.length >= 2)
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-audit-trail-smoke',
    status: failed.length ? 'orbit_audit_trail_contract_blocked' : 'orbit_audit_trail_contract_passed',
    contract_file: relative(root, contractPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      event_count: contract.events?.length ?? 0,
      blocked_event_count: (contract.events ?? []).filter((event) => event.outcome === 'blocked').length,
      writing_event_count: (contract.events ?? []).filter((event) => event.writes === true).length
    },
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed audit trail contract check: ${item.id}`)
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
    '# KosmoOrbit Audit Trail Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static smoke for the future KosmoOrbit audit trail. It validates local JSON only and does not write user data, launch tools, generate geometry, upload, publish, access external accounts, control networks or spend money.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- events: ${report.summary.event_count}`,
    `- blocked events: ${report.summary.blocked_event_count}`,
    `- writing events: ${report.summary.writing_event_count}`,
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
