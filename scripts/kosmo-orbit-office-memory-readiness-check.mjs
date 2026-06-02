#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/memory/orbit-office-memory-readiness.contract.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitOfficeMemoryReadiness.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-office-memory-readiness.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-office-memory-readiness.generated.md');

const requiredLanes = [
  'project_context_memory',
  'decision_memory',
  'asset_evidence_memory',
  'learning_memory',
  'operations_memory'
];

const requiredBlocked = [
  'persistent_memory_write',
  'customer_file_scan',
  'automatic_indexing',
  'cross_project_memory_merge',
  'learning_score_write',
  'runtime_log_persistence',
  'backup_status_write',
  'external_memory_sync',
  'cloud_vector_store',
  'embedding_job_start',
  'public_memory_publish'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Office memory readiness contract not found: ${contractPath}`);
  if (!existsSync(componentPath)) throw new Error(`Office memory readiness component not found: ${componentPath}`);

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

  console.log('KosmoOrbit office memory readiness check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'office_memory_readiness_passed') process.exit(1);
}

function buildReport({ contract, componentSource, routeSource, sectionIndexSource }) {
  const lanes = asArray(contract.memory_lanes);
  const laneIds = new Set(lanes.map((lane) => lane.id));
  const blockedCapabilities = asArray(contract.blocked_capabilities);
  const checks = [
    check('contract_file_exists', 'Office memory readiness contract file exists.', existsSync(contractPath)),
    check('status_ready', 'Office memory readiness status is ready.', contract.status === 'office_memory_readiness_ready'),
    check('mode_static_review_only', 'Office memory readiness is static review-only.', contract.mode === 'static_review_only'),
    check('principles_present', 'Readiness principles are explicit.', asArray(contract.readiness_principles).length >= 4),
    check('required_lanes_present', 'All required memory lanes are present.', requiredLanes.every((id) => laneIds.has(id))),
    check('lanes_have_review_gate_and_blocks', 'Every lane has future role, readiness gate, review-only preview and blocked actions.', lanes.every((lane) => lane.future_role && lane.readiness_gate && asArray(lane.review_only_today).length >= 3 && asArray(lane.blocked_today).length >= 4)),
    check('readiness_gates_present', 'Readiness gates are explicit.', asArray(contract.readiness_gates).length >= 7),
    check('blocked_capabilities_present', 'All sensitive memory capabilities are blocked today.', requiredBlocked.every((item) => blockedCapabilities.includes(item))),
    check('next_actions_present', 'Next actions are explicit.', asArray(contract.next_actions).length >= 3),
    check('component_imports_contract', 'Component imports the office memory readiness contract.', componentSource.includes('orbit-office-memory-readiness.contract.json')),
    check('component_renders_memory_copy', 'Component renders office memory readiness copy.', componentSource.includes('Office Memory Readiness') && componentSource.includes('Was spaeter lokales Buero-Gedaechtnis werden darf')),
    check('component_renders_safety_boundary', 'Component states memory writes, customer scans, embeddings, backup status, external sync and cloud vector stores are blocked.', componentSource.includes('kein Memory-Write') && componentSource.includes('kein Kundendatei-Scan') && componentSource.includes('kein Embedding-Job') && componentSource.includes('kein Backup-Status-Write') && componentSource.includes('kein externer Memory-Sync') && componentSource.includes('kein Cloud Vector Store')),
    check('route_imports_office_memory_readiness', 'Orbit route imports the office memory readiness component.', routeSource.includes('OrbitOfficeMemoryReadiness')),
    check('route_anchors_office_memory', 'Orbit route renders an office-memory anchor.', routeSource.includes('id="office-memory"')),
    check('section_index_links_office_memory', 'Section index links to office memory.', sectionIndexSource.includes('#office-memory')),
    check('component_renders_readiness_lanes', 'Component renders memory lanes and readiness gates.', componentSource.includes('memory_lanes') && componentSource.includes('readiness_gates') && componentSource.includes('blocked_capabilities'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-office-memory-readiness-check',
    status: failed.length ? 'office_memory_readiness_blocked' : 'office_memory_readiness_passed',
    contract_file: relative(root, contractPath),
    component_file: relative(root, componentPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      principle_count: asArray(contract.readiness_principles).length,
      memory_lane_count: lanes.length,
      readiness_gate_count: asArray(contract.readiness_gates).length,
      blocked_capability_count: blockedCapabilities.length
    },
    memory_lanes: lanes.map((lane) => ({
      id: lane.id,
      review_only_count: asArray(lane.review_only_today).length,
      blocked_today_count: asArray(lane.blocked_today).length,
      readiness_gate: lane.readiness_gate
    })),
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed office memory readiness check: ${item.id}`)
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
    '# KosmoOrbit Office Memory Readiness Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static review-only check for future local office memory. It validates contract and React source only; it does not write memory, scan customer files, start embedding jobs, persist logs, write backup status, sync external systems or use cloud vector stores.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- principles: ${report.summary.principle_count}`,
    `- memory lanes: ${report.summary.memory_lane_count}`,
    `- readiness gates: ${report.summary.readiness_gate_count}`,
    `- blocked capabilities: ${report.summary.blocked_capability_count}`,
    '',
    '## Memory Lanes',
    '',
    '| Lane | Review Only | Blocked Today | Readiness Gate |',
    '| --- | ---: | ---: | --- |'
  ];

  report.memory_lanes.forEach((lane) => {
    lines.push(`| \`${lane.id}\` | ${lane.review_only_count} | ${lane.blocked_today_count} | ${escapePipe(lane.readiness_gate)} |`);
  });

  lines.push('', '## Checks', '', '| Check | Status | Meaning |', '| --- | --- | --- |');
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
