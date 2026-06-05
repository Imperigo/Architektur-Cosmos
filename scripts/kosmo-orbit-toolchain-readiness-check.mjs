#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/health/orbit-toolchain-readiness.contract.json');
const heavyReportPath = resolve(root, args.heavyReport || 'examples/kosmo-orbit/review/orbit-heavy-check-timebox.generated.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitToolchainReadiness.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-toolchain-readiness.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-toolchain-readiness.generated.md');

const requiredLaneIds = [
  'fast_review_checks',
  'typescript_no_emit',
  'eslint',
  'next_static_build',
  'path_and_runtime'
];

const requiredBlocked = [
  'claim_typescript_green',
  'claim_lint_green',
  'claim_next_build_green',
  'claim_static_export_green_without_build',
  'push_due_to_fast_checks',
  'deploy_due_to_fast_checks',
  'cloudflare_live_claim',
  'external_ci_mutation',
  'dependency_install_without_go'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Toolchain readiness contract not found: ${contractPath}`);
  if (!existsSync(heavyReportPath)) throw new Error(`Heavy check report not found: ${heavyReportPath}`);

  const contract = readJson(contractPath);
  const heavyReport = readJson(heavyReportPath);
  const componentSource = existsSync(componentPath) ? readFileSync(componentPath, 'utf8') : '';
  const routeSource = existsSync(routePath) ? readFileSync(routePath, 'utf8') : '';
  const sectionIndexSource = existsSync(sectionIndexPath) ? readFileSync(sectionIndexPath, 'utf8') : '';
  const report = buildReport({ contract, heavyReport, componentSource, routeSource, sectionIndexSource });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit toolchain readiness check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'toolchain_readiness_passed') process.exit(1);
}

function buildReport({ contract, heavyReport, componentSource, routeSource, sectionIndexSource }) {
  const lanes = asArray(contract.readiness_lanes);
  const laneIds = new Set(lanes.map((lane) => lane.id));
  const blockedToday = asArray(contract.blocked_today);
  const heavyChecks = asArray(heavyReport.checks);
  const heavyStatusById = Object.fromEntries(heavyChecks.map((checkItem) => [checkItem.id, checkItem.status]));

  const checks = [
    check('contract_file_exists', 'Toolchain readiness contract exists.', existsSync(contractPath)),
    check('heavy_report_exists', 'Heavy check timebox report exists.', existsSync(heavyReportPath)),
    check('status_ready', 'Toolchain readiness status is review-ready.', contract.status === 'toolchain_readiness_review_ready'),
    check('mode_static_review_only', 'Toolchain readiness is static review-only.', contract.mode === 'static_review_only'),
    check('required_lanes_present', 'All required toolchain lanes are present.', requiredLaneIds.every((id) => laneIds.has(id))),
    check('lanes_have_state_evidence_meaning', 'Every readiness lane has state, evidence and Orbit meaning.', lanes.every((lane) => lane.current_state && asArray(lane.evidence).length >= 2 && lane.orbit_meaning)),
    check('heavy_report_records_timeouts', 'Heavy report records TypeScript, ESLint and Next Build as timed out.', heavyStatusById.typescript_no_emit === 'timed_out' && heavyStatusById.lint === 'timed_out' && heavyStatusById.next_static_build === 'timed_out'),
    check('heavy_report_records_fast_passes', 'Heavy report records fast review checks as passed.', ['kosmosketch_adapter', 'route_smoke', 'responsive_audit', 'full_review'].every((id) => heavyStatusById[id] === 'passed')),
    check('release_gate_policy_present', 'Release gate policy blocks publish evidence on heavy timeouts.', contract.release_gate_policy?.heavy_timeout_blocks_publish_evidence === true && contract.release_gate_policy?.static_smoke_requires_successful_build === true && contract.release_gate_policy?.push_requires_owner_go === true),
    check('blocked_today_present', 'Blocked actions prevent false green release claims and push/deploy from fast checks.', requiredBlocked.every((id) => blockedToday.includes(id))),
    check('next_actions_present', 'Next actions are explicit.', asArray(contract.next_actions).length >= 4),
    check('component_imports_contract', 'Component imports the toolchain readiness contract.', componentSource.includes('orbit-toolchain-readiness.contract.json')),
    check('component_imports_heavy_report', 'Component imports the heavy check timebox report.', componentSource.includes('orbit-heavy-check-timebox.generated.json')),
    check('component_renders_toolchain_copy', 'Component renders toolchain readiness copy.', componentSource.includes('Toolchain Readiness') && componentSource.includes('TypeScript') && componentSource.includes('ESLint') && componentSource.includes('Next Static Build')),
    check('component_renders_release_gate_copy', 'Component renders release-gate safety copy.', componentSource.includes('kein Push') && componentSource.includes('kein Deploy') && componentSource.includes('kein Static-Smoke ohne Build') && componentSource.includes('kein falsches Gruen')),
    check('route_imports_component', 'Orbit route imports the toolchain readiness component.', routeSource.includes('OrbitToolchainReadiness')),
    check('route_anchors_toolchain', 'Orbit route renders a toolchain-readiness anchor.', routeSource.includes('id="toolchain-readiness"')),
    check('section_index_links_toolchain', 'Section index links to toolchain readiness.', sectionIndexSource.includes('#toolchain-readiness'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-toolchain-readiness-check',
    status: failed.length ? 'toolchain_readiness_blocked' : 'toolchain_readiness_passed',
    contract_file: relative(root, contractPath),
    heavy_report_file: relative(root, heavyReportPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      readiness_lane_count: lanes.length,
      blocked_today_count: blockedToday.length,
      heavy_timed_out_count: heavyChecks.filter((item) => item.status === 'timed_out').length,
      heavy_passed_count: heavyChecks.filter((item) => item.status === 'passed').length
    },
    readiness_lanes: lanes.map((lane) => ({
      id: lane.id,
      current_state: lane.current_state,
      evidence_count: asArray(lane.evidence).length
    })),
    checks,
    next_actions: failed.length ? failed.map((item) => `Fix failed toolchain readiness check: ${item.id}`) : contract.next_actions
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
    '# KosmoOrbit Toolchain Readiness Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    `Heavy report: \`${report.heavy_report_file}\``,
    '',
    'Static review-only check for the local TypeScript, ESLint and Next build readiness boundary. It does not push, deploy, mutate external CI, install dependencies or claim release readiness.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- readiness lanes: ${report.summary.readiness_lane_count}`,
    `- heavy passed: ${report.summary.heavy_passed_count}`,
    `- heavy timed out: ${report.summary.heavy_timed_out_count}`,
    `- blocked today: ${report.summary.blocked_today_count}`,
    '',
    '## Readiness Lanes',
    '',
    '| Lane | State | Evidence Count |',
    '| --- | --- | ---: |'
  ];

  report.readiness_lanes.forEach((lane) => {
    lines.push(`| \`${lane.id}\` | \`${lane.current_state}\` | ${lane.evidence_count} |`);
  });

  lines.push('', '## Checks', '', '| Check | Status | Meaning |', '| --- | --- | --- |');
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
