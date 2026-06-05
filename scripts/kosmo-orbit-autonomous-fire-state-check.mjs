#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/memory/orbit-autonomous-fire-state.contract.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitAutonomousFireState.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-autonomous-fire-state.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-autonomous-fire-state.generated.md');

const requiredAllowed = [
  'read_project_docs',
  'create_static_contracts',
  'create_review_reports',
  'update_orbit_review_only_ui',
  'run_fast_local_smokes',
  'write_memory_snapshots',
  'write_autonomous_fire_records'
];

const requiredApproval = [
  'push_to_main',
  'live_deploy',
  'external_account_change',
  'cloud_upload',
  'cost_job',
  'customer_data_scan',
  'real_runtime_process_launch',
  'destructive_git_or_filesystem_action'
];

const requiredBlocked = [
  'real_timer_daemon',
  'automation_process_launch',
  'github_push_without_owner_go',
  'cloudflare_deploy',
  'external_api_call',
  'runtime_memory_write',
  'tool_execution',
  'blender_launch',
  'bim_or_ifc_write'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Autonomous fire state contract not found: ${contractPath}`);

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

  console.log('KosmoOrbit autonomous fire state check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'autonomous_fire_state_passed') process.exit(1);
}

function buildReport({ contract, componentSource, routeSource, sectionIndexSource }) {
  const allowed = asArray(contract.autonomous_permissions?.allowed_without_question);
  const approval = asArray(contract.autonomous_permissions?.ask_or_explicit_go_required);
  const addonMemory = asArray(contract.addon_memory);
  const ownMemory = asArray(contract.own_memory);
  const blockedToday = asArray(contract.blocked_today);
  const knownBlockers = asArray(contract.current_fire?.known_blockers);
  const nextActions = asArray(contract.next_safe_actions);

  const checks = [
    check('contract_file_exists', 'Autonomous fire state contract exists.', existsSync(contractPath)),
    check('status_ready', 'Autonomous fire state is ready.', contract.status === 'autonomous_fire_state_ready'),
    check('mode_static_review_only', 'Autonomous fire state is static review-only.', contract.mode === 'static_review_only'),
    check('date_and_timezone_present', 'Local date and Zurich timezone are explicit.', contract.date_local === '2026-06-05' && contract.timezone === 'Europe/Zurich'),
    check('loop_until_midnight_present', 'Loop goal references autonomous block until midnight Zurich time.', String(contract.loop_goal?.label || '').includes('24:00') && contract.loop_goal?.fire_interval_minutes === 5),
    check('summary_and_memory_required', 'Every fire requires summary and memory capture.', contract.loop_goal?.summary_required_each_fire === true && contract.loop_goal?.memory_capture_required === true),
    check('current_fire_present', 'Current fire state and local time are recorded.', Boolean(contract.current_fire?.local_time) && contract.current_fire?.state === 'in_progress'),
    check('known_blockers_present', 'Known blockers are explicit.', knownBlockers.length >= 3),
    check('allowed_actions_present', 'Allowed autonomous actions are explicit.', requiredAllowed.every((item) => allowed.includes(item))),
    check('approval_actions_present', 'Dangerous actions require explicit approval.', requiredApproval.every((item) => approval.includes(item))),
    check('addon_memory_present', 'Addon memory entries are present.', addonMemory.length >= 3 && addonMemory.every((item) => item.id && item.status && item.memory)),
    check('own_memory_present', 'Worker own memory entries are present.', ownMemory.length >= 4),
    check('next_safe_actions_present', 'Next safe actions are explicit.', nextActions.length >= 4),
    check('blocked_today_present', 'Blocked today contains runtime, GitHub, Cloudflare, external API, memory write, tool execution and BIM/IFC guards.', requiredBlocked.every((item) => blockedToday.includes(item))),
    check('component_imports_contract', 'Orbit component imports the fire state contract.', componentSource.includes('orbit-autonomous-fire-state.contract.json')),
    check('component_renders_fire_copy', 'Orbit component renders autonomous fire copy.', componentSource.includes('Autonomer Fire State') && componentSource.includes('5-Minuten-Fire')),
    check('component_renders_memory_copy', 'Orbit component renders addon and own memory copy.', componentSource.includes('Addon Memory') && componentSource.includes('Eigene Worker Memory')),
    check('component_renders_safety_copy', 'Orbit component renders safety boundaries.', componentSource.includes('kein Push') && componentSource.includes('kein Deploy') && componentSource.includes('keine externen Accounts') && componentSource.includes('keine Runtime-Writes')),
    check('route_imports_component', 'Orbit route imports the autonomous fire state component.', routeSource.includes('OrbitAutonomousFireState')),
    check('route_anchors_fire_state', 'Orbit route renders an autonomous-fire anchor.', routeSource.includes('id="autonomous-fire"')),
    check('section_index_links_fire_state', 'Section index links to autonomous fire state.', sectionIndexSource.includes('#autonomous-fire'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-autonomous-fire-state-check',
    status: failed.length ? 'autonomous_fire_state_blocked' : 'autonomous_fire_state_passed',
    contract_file: relative(root, contractPath),
    component_file: relative(root, componentPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      allowed_action_count: allowed.length,
      approval_action_count: approval.length,
      addon_memory_count: addonMemory.length,
      own_memory_count: ownMemory.length,
      blocked_today_count: blockedToday.length
    },
    fire_state: {
      date_local: contract.date_local,
      timezone: contract.timezone,
      local_time: contract.current_fire?.local_time,
      fire_interval_minutes: contract.loop_goal?.fire_interval_minutes,
      state: contract.current_fire?.state
    },
    checks,
    next_actions: failed.length ? failed.map((item) => `Fix failed autonomous fire state check: ${item.id}`) : nextActions
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
    '# KosmoOrbit Autonomous Fire State Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static review-only check for the autonomous block fire state. It validates fire interval, local time, memory capture, allowed scope and blocked actions. It does not start a timer, daemon, GitHub action, deploy, upload, runtime tool or external account action.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- fire interval: ${report.fire_state.fire_interval_minutes} minutes`,
    `- addon memory entries: ${report.summary.addon_memory_count}`,
    `- own memory entries: ${report.summary.own_memory_count}`,
    `- blocked today: ${report.summary.blocked_today_count}`,
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
