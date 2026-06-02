#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/runtime/orbit-runtime-adapter.contract.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitRuntimeAdapterContract.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-runtime-adapter.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-runtime-adapter.generated.md');

const requiredLanes = [
  'health-telemetry-adapter',
  'local-model-adapter',
  'tool-launch-adapter',
  'job-queue-adapter',
  'audit-log-adapter',
  'publish-sync-adapter'
];

const requiredSafety = [
  'no_hardware_commands',
  'no_model_starts',
  'no_memory_writes',
  'no_filesystem_scans',
  'no_process_launches',
  'no_geometry_generation',
  'no_queue_actions',
  'no_cost_jobs',
  'no_user_writes',
  'no_personal_data_persistence',
  'no_uploads',
  'no_external_accounts',
  'no_public_publish',
  'no_network_control',
  'no_system_changes'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Runtime adapter contract not found: ${contractPath}`);
  if (!existsSync(componentPath)) throw new Error(`Runtime adapter component not found: ${componentPath}`);

  const contract = readJson(contractPath);
  const componentSource = readFileSync(componentPath, 'utf8');
  const routeSource = existsSync(routePath) ? readFileSync(routePath, 'utf8') : '';
  const sectionIndexSource = existsSync(sectionIndexPath) ? readFileSync(sectionIndexPath, 'utf8') : '';
  const report = buildReport({ contract, componentSource, routeSource, sectionIndexSource });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit runtime adapter check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'runtime_adapter_contract_passed') process.exit(1);
}

function buildReport({ contract, componentSource, routeSource, sectionIndexSource }) {
  const lanes = asArray(contract.adapter_lanes);
  const laneIds = new Set(lanes.map((lane) => lane.id));
  const blockedEffects = lanes.flatMap((lane) => asArray(lane.blocked_side_effects));
  const checks = [
    check('contract_file_exists', 'Runtime adapter contract file exists.', existsSync(contractPath)),
    check('status_ready', 'Runtime adapter contract status is ready.', contract.status === 'runtime_adapter_contract_ready'),
    check('mode_static_review_only', 'Runtime adapter contract is static review-only.', contract.mode === 'static_review_only'),
    check('required_lanes_present', 'All required runtime adapter lanes are present.', requiredLanes.every((id) => laneIds.has(id))),
    check('lane_count', 'Contract defines at least six adapter lanes.', lanes.length >= 6),
    check('all_lanes_have_copy', 'Every lane has label, target, future capability, today contract, evidence, human gate and blocked side effects.', lanes.every((lane) => lane.label && lane.target && lane.future_capability && lane.today_contract && asArray(lane.required_evidence).length >= 2 && lane.human_gate && asArray(lane.blocked_side_effects).length >= 2)),
    check('safety_flags_present', 'All safety flags are present and true.', requiredSafety.every((key) => contract.safety?.[key] === true)),
    check('blocks_runtime_side_effects', 'Contract blocks runtime side effects.', ['process_launches', 'model_starts', 'queue_actions', 'user_writes', 'uploads', 'external_accounts', 'public_publish'].every((effect) => blockedEffects.includes(effect))),
    check('has_promotion_requirements', 'Promotion requirements are explicit.', asArray(contract.promotion_requirements).length >= 5),
    check('has_kill_switch_requirement', 'Promotion requirements include a manual kill switch.', asArray(contract.promotion_requirements).some((item) => String(item).toLowerCase().includes('kill switch'))),
    check('component_imports_contract', 'Component imports the local runtime adapter contract.', componentSource.includes('orbit-runtime-adapter.contract.json')),
    check('component_renders_runtime_adapter', 'Component renders Runtime Adapter copy.', componentSource.includes('Runtime Adapter') && componentSource.includes('Bruecke von KosmoOrbit zur lokalen KosmoZentrale')),
    check('component_renders_safety_boundary', 'Component states adapters are not executed and no processes/data/accounts are touched.', componentSource.includes('keine Adapter werden') && componentSource.includes('kein Prozess') && componentSource.includes('keine Daten') && componentSource.includes('keine externen')),
    check('route_imports_runtime_adapter', 'Orbit route imports the runtime adapter component.', routeSource.includes('OrbitRuntimeAdapterContract')),
    check('route_anchors_runtime_adapter', 'Orbit route renders a runtime-adapter anchor.', routeSource.includes('id="runtime-adapter"')),
    check('section_index_links_runtime_adapter', 'Section index links to runtime adapter.', sectionIndexSource.includes('#runtime-adapter'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-runtime-adapter-check',
    status: failed.length ? 'runtime_adapter_contract_blocked' : 'runtime_adapter_contract_passed',
    contract_file: relative(root, contractPath),
    component_file: relative(root, componentPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      adapter_lane_count: lanes.length,
      safety_flag_count: requiredSafety.filter((key) => contract.safety?.[key] === true).length,
      promotion_requirement_count: asArray(contract.promotion_requirements).length
    },
    adapter_lanes: lanes.map((lane) => ({
      id: lane.id,
      target: lane.target,
      required_evidence_count: asArray(lane.required_evidence).length,
      blocked_side_effect_count: asArray(lane.blocked_side_effects).length,
      human_gate: lane.human_gate
    })),
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed runtime adapter check: ${item.id}`)
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Runtime Adapter Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static review-only check for the future local KosmoZentrale runtime adapters. It validates local JSON and React source only; it does not launch tools, start models, scan files, write user data, upload, publish, access external accounts or spend money.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- adapter lanes: ${report.summary.adapter_lane_count}`,
    `- safety flags: ${report.summary.safety_flag_count}/${requiredSafety.length}`,
    `- promotion requirements: ${report.summary.promotion_requirement_count}`,
    '',
    '## Adapter Lanes',
    '',
    '| Adapter | Target | Evidence | Blocked Effects | Human Gate |',
    '| --- | --- | --- | --- | --- |'
  ];

  report.adapter_lanes.forEach((lane) => {
    lines.push(`| \`${lane.id}\` | ${escapePipe(lane.target)} | ${lane.required_evidence_count} | ${lane.blocked_side_effect_count} | ${escapePipe(lane.human_gate)} |`);
  });

  lines.push('', '## Checks', '', '| Check | Status | Meaning |', '| --- | --- | --- |');
  report.checks.forEach((item) => lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`));
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
