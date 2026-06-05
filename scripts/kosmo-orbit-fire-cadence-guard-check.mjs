#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/memory/orbit-fire-cadence-guard.contract.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitFireCadenceGuard.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-fire-cadence-guard.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-fire-cadence-guard.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Fire cadence guard contract not found: ${contractPath}`);
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

  console.log('KosmoOrbit fire cadence guard check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (report.status !== 'fire_cadence_guard_passed') process.exit(1);
}

function buildReport({ contract, componentSource, routeSource, sectionIndexSource }) {
  const fires = asArray(contract.observed_fires);
  const drifted = fires.filter((fire) => fire.cadence_state === 'drifted');
  const blocked = asArray(contract.blocked_today);
  const checks = [
    check('contract_file_exists', 'Fire cadence guard contract exists.', existsSync(contractPath)),
    check('status_ready', 'Fire cadence guard is ready.', contract.status === 'fire_cadence_guard_ready'),
    check('mode_static_review_only', 'Fire cadence guard is static review-only.', contract.mode === 'static_review_only'),
    check('target_interval_present', 'Target interval is 5 minutes in Zurich.', contract.target_interval_minutes === 5 && contract.timezone === 'Europe/Zurich'),
    check('observed_fires_present', 'Observed fires include at least six records.', fires.length >= 6),
    check('drift_is_documented', 'At least one drifted fire is explicitly documented.', drifted.length >= 3),
    check('no_false_cadence_claim', 'Policy forbids false perfect-cadence claims.', contract.cadence_policy?.no_false_cadence_claim === true && contract.current_assessment?.cadence_perfect === false),
    check('work_quality_green_recorded', 'Assessment records work quality as green despite cadence drift.', contract.current_assessment?.work_quality_green === true),
    check('blocked_today_present', 'Blocked list prevents perfect-cadence claims, daemons, external schedulers, push/deploy and hidden drift.', ['claim_perfect_5min_cadence', 'start_real_daemon', 'start_external_scheduler', 'push_due_to_cadence', 'deploy_due_to_cadence', 'hide_drift'].every((item) => blocked.includes(item))),
    check('next_actions_present', 'Next actions are explicit.', asArray(contract.next_actions).length >= 4),
    check('component_imports_contract', 'Component imports the fire cadence guard contract.', componentSource.includes('orbit-fire-cadence-guard.contract.json')),
    check('component_renders_cadence_copy', 'Component renders cadence guard copy.', componentSource.includes('Fire Cadence Guard') && componentSource.includes('5-Minuten') && componentSource.includes('drifted')),
    check('component_renders_safety_copy', 'Component renders no daemon/scheduler/push/deploy safety copy.', componentSource.includes('kein Daemon') && componentSource.includes('kein externer Scheduler') && componentSource.includes('kein Push') && componentSource.includes('kein Deploy')),
    check('route_imports_component', 'Orbit route imports the fire cadence guard component.', routeSource.includes('OrbitFireCadenceGuard')),
    check('route_anchors_guard', 'Orbit route renders fire-cadence-guard anchor.', routeSource.includes('id="fire-cadence-guard"')),
    check('section_index_links_guard', 'Section index links to fire cadence guard.', sectionIndexSource.includes('#fire-cadence-guard'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-fire-cadence-guard-check',
    status: failed.length ? 'fire_cadence_guard_blocked' : 'fire_cadence_guard_passed',
    contract_file: relative(root, contractPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      observed_fire_count: fires.length,
      drifted_fire_count: drifted.length,
      blocked_today_count: blocked.length
    },
    checks,
    next_actions: failed.length ? failed.map((item) => `Fix failed fire cadence guard check: ${item.id}`) : contract.next_actions
  };
}

function check(id, label, passed) {
  return { id, label, status: passed ? 'passed' : 'failed' };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Fire Cadence Guard Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static review-only check for the 5-minute fire cadence. It documents drift honestly and does not start daemons, external schedulers, push, deploy or live automation.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- observed fires: ${report.summary.observed_fire_count}`,
    `- drifted fires: ${report.summary.drifted_fire_count}`,
    `- blocked today: ${report.summary.blocked_today_count}`,
    '',
    '## Checks',
    '',
    '| Check | Status | Meaning |',
    '| --- | --- | --- |'
  ];
  report.checks.forEach((item) => lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`));
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
