#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/memory/orbit-autonomous-loop-ledger.contract.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitAutonomousLoopLedger.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-autonomous-loop-ledger.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-autonomous-loop-ledger.generated.md');

const requiredMemory = ['autonomous_fire_state', 'toolchain_readiness', 'github_imperigo_gate'];
const requiredBlocked = [
  'push_without_owner_go',
  'deploy_without_owner_go',
  'github_mutation_without_owner_go',
  'typescript_green_claim_without_completed_logs',
  'eslint_green_claim_without_completed_logs',
  'next_build_green_claim_without_completed_logs',
  'static_export_smoke_without_successful_build',
  'external_account_change',
  'cost_job'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Autonomous loop ledger contract not found: ${contractPath}`);

  const contract = readJson(contractPath);
  const componentSource = existsSync(componentPath) ? readFileSync(componentPath, 'utf8') : '';
  const routeSource = existsSync(routePath) ? readFileSync(routePath, 'utf8') : '';
  const sectionIndexSource = existsSync(sectionIndexPath) ? readFileSync(sectionIndexPath, 'utf8') : '';
  const report = buildReport({ contract, componentSource, routeSource, sectionIndexSource });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit autonomous loop ledger check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'autonomous_loop_ledger_passed') process.exit(1);
}

function buildReport({ contract, componentSource, routeSource, sectionIndexSource }) {
  const fireRecords = asArray(contract.fire_records);
  const memoryAdded = asArray(contract.memory_added_today);
  const stillBlocked = asArray(contract.still_blocked);
  const checks = [
    check('contract_file_exists', 'Autonomous loop ledger contract exists.', existsSync(contractPath)),
    check('status_ready', 'Autonomous loop ledger is ready.', contract.status === 'autonomous_loop_ledger_ready'),
    check('mode_static_review_only', 'Autonomous loop ledger is static review-only.', contract.mode === 'static_review_only'),
    check('zurich_boundary_present', 'Loop boundary keeps Zurich date, 5-minute interval and 24:00 stop.', contract.timezone === 'Europe/Zurich' && contract.loop_boundary?.fire_interval_minutes === 5 && contract.loop_boundary?.stop_after_local_time === '24:00'),
    check('fire_requirements_present', 'Loop boundary requires time check, summary and memory capture each fire.', contract.loop_boundary?.requires_time_check_each_fire === true && contract.loop_boundary?.requires_summary_each_fire === true && contract.loop_boundary?.requires_memory_capture_each_fire === true),
    check('fire_records_present', 'At least three fire records are captured.', fireRecords.length >= 3),
    check('fire_record_files_exist', 'Every fire record file exists.', fireRecords.every((item) => existsSync(resolve(root, item.record || '')))),
    check('fire_records_have_checks', 'Every fire record has primary delta and check evidence.', fireRecords.every((item) => item.primary_delta && asArray(item.checks).length >= 3)),
    check('green_state_present', 'Current green state records current full review and route smoke.', /^\d+\/\d+$/.test(contract.current_green_state?.route_smoke || '') && /^\d+\/\d+$/.test(contract.current_green_state?.full_review || '')),
    check('memory_added_present', 'Memory additions include Fire State, Toolchain Readiness and GitHub Imperigo.', requiredMemory.every((item) => memoryAdded.includes(item))),
    check('blocked_boundaries_present', 'Blocked boundaries keep owner-go, heavy checks, static export, external accounts and costs gated.', requiredBlocked.every((item) => stillBlocked.includes(item))),
    check('next_actions_present', 'Next safe actions are explicit.', asArray(contract.next_safe_actions).length >= 4),
    check('component_imports_contract', 'Component imports the autonomous loop ledger contract.', componentSource.includes('orbit-autonomous-loop-ledger.contract.json')),
    check('component_renders_ledger_copy', 'Component renders autonomous loop ledger copy.', componentSource.includes('Autonomous Loop Ledger') && componentSource.includes('24:00') && componentSource.includes('5-Minuten')),
    check('component_renders_summary_copy', 'Component renders fire records, memory and blocked boundaries.', componentSource.includes('Fire Timeline') && componentSource.includes('Memory Added') && componentSource.includes('Weiter blockiert')),
    check('route_imports_component', 'Orbit route imports the autonomous loop ledger component.', routeSource.includes('OrbitAutonomousLoopLedger')),
    check('route_anchors_ledger', 'Orbit route renders autonomous-loop-ledger anchor.', routeSource.includes('id="autonomous-loop-ledger"')),
    check('section_index_links_ledger', 'Section index links to autonomous loop ledger.', sectionIndexSource.includes('#autonomous-loop-ledger'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-autonomous-loop-ledger-check',
    status: failed.length ? 'autonomous_loop_ledger_blocked' : 'autonomous_loop_ledger_passed',
    contract_file: relative(root, contractPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      fire_record_count: fireRecords.length,
      memory_added_count: memoryAdded.length,
      blocked_boundary_count: stillBlocked.length
    },
    checks,
    next_actions: failed.length ? failed.map((item) => `Fix failed autonomous loop ledger check: ${item.id}`) : contract.next_safe_actions
  };
}

function check(id, label, passed) {
  return {
    id,
    label,
    status: passed ? 'passed' : 'failed'
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Autonomous Loop Ledger Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static review-only check for the autonomous loop ledger. It validates local fire records, 5-minute loop boundary, memory additions and blocked side effects.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- fire records: ${report.summary.fire_record_count}`,
    `- memory additions: ${report.summary.memory_added_count}`,
    `- blocked boundaries: ${report.summary.blocked_boundary_count}`,
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

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}
