#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/governance/orbit-data-governance.contract.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitDataGovernanceContract.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-data-governance.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-data-governance.generated.md');

const requiredDomains = [
  'project_knowledge',
  'asset_and_rights',
  'identity_and_sessions',
  'audit_and_decisions',
  'learning_and_training'
];

const requiredBlocked = [
  'd1_write',
  'r2_upload',
  'cloud_upload',
  'customer_data_write',
  'profile_persistence',
  'session_storage',
  'audit_log_write',
  'decision_record_write',
  'learning_score_write',
  'external_sync',
  'backup_job_start',
  'retention_auto_delete',
  'public_publish'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Data governance contract not found: ${contractPath}`);
  if (!existsSync(componentPath)) throw new Error(`Data governance component not found: ${componentPath}`);

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

  console.log('KosmoOrbit data governance check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'data_governance_contract_passed') process.exit(1);
}

function buildReport({ contract, componentSource, routeSource, sectionIndexSource }) {
  const domains = asArray(contract.data_domains);
  const domainIds = new Set(domains.map((domain) => domain.id));
  const storageLanes = asArray(contract.storage_lanes);
  const blockedCapabilities = asArray(contract.blocked_capabilities);
  const checks = [
    check('contract_file_exists', 'Data governance contract file exists.', existsSync(contractPath)),
    check('status_ready', 'Data governance contract status is ready.', contract.status === 'data_governance_contract_ready'),
    check('mode_static_review_only', 'Data governance contract is static review-only.', contract.mode === 'static_review_only'),
    check('principles_present', 'Governance principles are explicit.', asArray(contract.governance_principles).length >= 4),
    check('required_domains_present', 'All required data domains are present.', requiredDomains.every((id) => domainIds.has(id))),
    check('domains_have_retention_backup_and_blocks', 'Every data domain has preview scope, future storage scope, retention gate, backup gate and blocked actions.', domains.every((domain) => asArray(domain.today_preview_scope).length > 0 && asArray(domain.future_storage_scope).length > 0 && domain.retention_gate && domain.backup_gate && asArray(domain.blocked_today).length >= 3)),
    check('storage_lanes_present', 'Local JSON preview, local office store and external exchange lanes are present.', ['local_json_preview', 'local_office_store', 'external_exchange'].every((id) => storageLanes.some((lane) => lane.id === id))),
    check('storage_lanes_block_writes', 'Every storage lane blocks writes or sync today.', storageLanes.every((lane) => asArray(lane.blocked_today).length >= 3)),
    check('blocked_capabilities_present', 'All sensitive data capabilities are blocked today.', requiredBlocked.every((item) => blockedCapabilities.includes(item))),
    check('promotion_requirements_present', 'Promotion requirements are explicit.', asArray(contract.promotion_requirements).length >= 6),
    check('component_imports_contract', 'Component imports the data governance contract.', componentSource.includes('orbit-data-governance.contract.json')),
    check('component_renders_governance_copy', 'Component renders data governance boundary copy.', componentSource.includes('Data Governance Boundary') && componentSource.includes('Welche lokalen Daten KosmoOrbit spaeter speichern darf')),
    check('component_renders_safety_boundary', 'Component states D1 writes, R2 uploads, customer writes, backup jobs and external sync are blocked.', componentSource.includes('keine D1-Writes') && componentSource.includes('keine R2-Uploads') && componentSource.includes('keine Kundendaten-Writes') && componentSource.includes('kein Backup-Job') && componentSource.includes('kein externer Sync')),
    check('route_imports_data_governance', 'Orbit route imports the data governance component.', routeSource.includes('OrbitDataGovernanceContract')),
    check('route_anchors_data_governance', 'Orbit route renders a data-governance anchor.', routeSource.includes('id="data-governance"')),
    check('section_index_links_data_governance', 'Section index links to data governance.', sectionIndexSource.includes('#data-governance'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-data-governance-check',
    status: failed.length ? 'data_governance_contract_blocked' : 'data_governance_contract_passed',
    contract_file: relative(root, contractPath),
    component_file: relative(root, componentPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      principle_count: asArray(contract.governance_principles).length,
      data_domain_count: domains.length,
      storage_lane_count: storageLanes.length,
      blocked_capability_count: blockedCapabilities.length,
      promotion_requirement_count: asArray(contract.promotion_requirements).length
    },
    data_domains: domains.map((domain) => ({
      id: domain.id,
      future_scope_count: asArray(domain.future_storage_scope).length,
      preview_scope_count: asArray(domain.today_preview_scope).length,
      blocked_today_count: asArray(domain.blocked_today).length,
      retention_gate: domain.retention_gate
    })),
    storage_lanes: storageLanes.map((lane) => ({
      id: lane.id,
      blocked_today_count: asArray(lane.blocked_today).length
    })),
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed data governance check: ${item.id}`)
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
    '# KosmoOrbit Data Governance Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static review-only check for future local Orbit storage, retention, backup and privacy rules. It validates local JSON and React source only; it does not write D1/R2, upload, persist profiles, write customer data, start backup jobs, sync external systems or publish data.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- principles: ${report.summary.principle_count}`,
    `- data domains: ${report.summary.data_domain_count}`,
    `- storage lanes: ${report.summary.storage_lane_count}`,
    `- blocked capabilities: ${report.summary.blocked_capability_count}`,
    `- promotion requirements: ${report.summary.promotion_requirement_count}`,
    '',
    '## Data Domains',
    '',
    '| Domain | Future Scope | Preview Scope | Blocked Today | Retention Gate |',
    '| --- | ---: | ---: | ---: | --- |'
  ];

  report.data_domains.forEach((domain) => {
    lines.push(`| \`${domain.id}\` | ${domain.future_scope_count} | ${domain.preview_scope_count} | ${domain.blocked_today_count} | ${escapePipe(domain.retention_gate)} |`);
  });

  lines.push('', '## Storage Lanes', '', '| Lane | Blocked Today |', '| --- | ---: |');
  report.storage_lanes.forEach((lane) => {
    lines.push(`| \`${lane.id}\` | ${lane.blocked_today_count} |`);
  });

  lines.push('', '## Checks', '', '| Check | Status | Meaning |', '| --- | --- | --- |');
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
