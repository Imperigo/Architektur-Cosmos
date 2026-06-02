#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const contractPath = resolve(root, args.contract || 'examples/kosmo-orbit/storage/orbit-delete-export-restore-drill.contract.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitDeleteExportRestoreDrill.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-delete-export-restore-drill.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-delete-export-restore-drill.generated.md');

const requiredScope = ['delete_request', 'export_package', 'restore_probe', 'audit_trace'];
const requiredBlocked = ['real_delete_job', 'real_export_job', 'real_restore_job', 'customer_data_export', 'customer_data_delete', 'backup_restore', 'retention_auto_delete', 'external_archive_sync'];
const allowedToday = ['static_drill_render', 'human_review_prompt', 'testdata_only_walkthrough', 'readiness_report_generation'];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(contractPath)) throw new Error(`Delete/export/restore drill contract not found: ${contractPath}`);
  if (!existsSync(componentPath)) throw new Error(`Delete/export/restore drill component not found: ${componentPath}`);
  const contract = readJson(contractPath);
  const componentSource = readFileSync(componentPath, 'utf8');
  const routeSource = existsSync(routePath) ? readFileSync(routePath, 'utf8') : '';
  const sectionIndexSource = existsSync(sectionIndexPath) ? readFileSync(sectionIndexPath, 'utf8') : '';
  const report = buildReport({ contract, componentSource, routeSource, sectionIndexSource });
  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');
  console.log('KosmoOrbit delete/export/restore drill check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (report.status !== 'delete_export_restore_drill_passed') process.exit(1);
}

function buildReport({ contract, componentSource, routeSource, sectionIndexSource }) {
  const scope = asArray(contract.drill_scope);
  const scopeIds = new Set(scope.map((item) => item.id));
  const blocked = asArray(contract.blocked_until_drill);
  const checks = [
    check('contract_file_exists', 'Delete/export/restore drill contract exists.', existsSync(contractPath)),
    check('status_ready', 'Drill contract status is ready.', contract.status === 'delete_export_restore_drill_ready'),
    check('mode_static_review_only', 'Drill contract is static review-only.', contract.mode === 'static_review_only'),
    check('required_scope_present', 'Delete, export, restore and audit trace scopes are present.', requiredScope.every((id) => scopeIds.has(id))),
    check('scope_needs_human_review', 'Every drill scope still needs human review and evidence.', scope.every((item) => item.status === 'needs_human_review' && asArray(item.required_evidence).length >= 3)),
    check('blocked_capabilities_present', 'Real delete, export, restore, customer data, backup and sync actions are blocked.', requiredBlocked.every((item) => blocked.includes(item))),
    check('allowed_today_is_review_only', 'Allowed actions are static, human-review and test-data only.', asArray(contract.allowed_today).every((item) => allowedToday.includes(item))),
    check('review_roles_present', 'Review roles include owner, IT/KI, project lead and privacy review.', ['Chef / Admin', 'IT/KI Spezialist', 'Projektleitung', 'Datenschutz Review'].every((role) => asArray(contract.review_roles).includes(role))),
    check('promotion_requirements_present', 'Promotion requirements include drill, privacy, backup, audit and owner gates.', asArray(contract.promotion_requirements).length >= 5 && contract.promotion_requirements.join(' ').includes('Owner')),
    check('component_imports_contract', 'Component imports the delete/export/restore drill contract.', componentSource.includes('orbit-delete-export-restore-drill.contract.json')),
    check('component_renders_drill_copy', 'Component renders delete/export/restore drill copy.', componentSource.includes('Delete / Export / Restore Drill') && componentSource.includes('Wie KosmoOrbit lokale Daten reversibel und pruefbar halten muss')),
    check('component_renders_safety_boundary', 'Component keeps real delete, export, restore, customer data, backup restore and external archive sync blocked.', componentSource.includes('kein real delete job') && componentSource.includes('kein real export job') && componentSource.includes('kein real restore job') && componentSource.includes('kein Kundendaten-Export') && componentSource.includes('kein Kundendaten-Delete') && componentSource.includes('kein Backup-Restore') && componentSource.includes('kein externer Archiv-Sync')),
    check('route_imports_drill', 'Orbit route imports the delete/export/restore drill component.', routeSource.includes('OrbitDeleteExportRestoreDrill')),
    check('route_anchors_drill', 'Orbit route renders a delete-export-restore anchor.', routeSource.includes('id="delete-export-restore"')),
    check('section_index_links_drill', 'Section index links to delete/export/restore drill.', sectionIndexSource.includes('#delete-export-restore')),
    check('next_actions_present', 'Next actions are explicit.', asArray(contract.next_actions).length >= 3)
  ];
  const failed = checks.filter((item) => item.status !== 'passed');
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-delete-export-restore-drill-check',
    status: failed.length ? 'delete_export_restore_drill_blocked' : 'delete_export_restore_drill_passed',
    contract_file: relative(root, contractPath),
    component_file: relative(root, componentPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      scope_count: scope.length,
      blocked_capability_count: blocked.length,
      review_role_count: asArray(contract.review_roles).length,
      promotion_requirement_count: asArray(contract.promotion_requirements).length
    },
    drill_scope: scope.map((item) => ({ id: item.id, evidence_count: asArray(item.required_evidence).length, status: item.status })),
    checks,
    next_actions: failed.length ? failed.map((item) => `Fix failed delete/export/restore drill check: ${item.id}`) : contract.next_actions
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
    '# KosmoOrbit Delete / Export / Restore Drill Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Contract: \`${report.contract_file}\``,
    '',
    'Static review-only check for the future local delete/export/restore drill. It does not delete, export, restore, write audit logs, touch customer data, run backups or sync archives.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- drill scope items: ${report.summary.scope_count}`,
    `- blocked capabilities: ${report.summary.blocked_capability_count}`,
    `- review roles: ${report.summary.review_role_count}`,
    `- promotion requirements: ${report.summary.promotion_requirement_count}`,
    '',
    '## Drill Scope',
    '',
    '| Scope | Evidence Items | Status |',
    '| --- | ---: | --- |'
  ];
  report.drill_scope.forEach((item) => lines.push(`| \`${item.id}\` | ${item.evidence_count} | \`${item.status}\` |`));
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
