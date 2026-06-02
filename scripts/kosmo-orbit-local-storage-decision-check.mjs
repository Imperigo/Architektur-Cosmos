#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const draftPath = resolve(root, args.draft || 'examples/kosmo-orbit/storage/orbit-local-storage-decision.draft.json');
const componentPath = resolve(root, args.component || 'app/orbit/OrbitLocalStorageDecisionDraft.tsx');
const routePath = resolve(root, args.route || 'app/orbit/page.tsx');
const sectionIndexPath = resolve(root, args.sectionIndex || 'app/orbit/OrbitSectionIndex.tsx');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-local-storage-decision.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-local-storage-decision.generated.md');

const requiredFields = ['storage_location', 'retention_policy', 'delete_export_restore', 'backup_test', 'role_visibility', 'privacy_review'];
const requiredBlocked = ['persistent_memory_write', 'local_storage_write', 'customer_data_index', 'automatic_embedding_job', 'backup_job_start', 'restore_job_start', 'retention_auto_delete', 'external_sync', 'cloud_vector_store'];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(draftPath)) throw new Error(`Local storage decision draft not found: ${draftPath}`);
  if (!existsSync(componentPath)) throw new Error(`Local storage decision component not found: ${componentPath}`);
  const draft = readJson(draftPath);
  const componentSource = readFileSync(componentPath, 'utf8');
  const routeSource = existsSync(routePath) ? readFileSync(routePath, 'utf8') : '';
  const sectionIndexSource = existsSync(sectionIndexPath) ? readFileSync(sectionIndexPath, 'utf8') : '';
  const report = buildReport({ draft, componentSource, routeSource, sectionIndexSource });
  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');
  console.log('KosmoOrbit local storage decision check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (report.status !== 'local_storage_decision_passed') process.exit(1);
}

function buildReport({ draft, componentSource, routeSource, sectionIndexSource }) {
  const fields = asArray(draft.decision_fields);
  const fieldIds = new Set(fields.map((field) => field.id));
  const blocked = asArray(draft.blocked_until_decision);
  const checks = [
    check('draft_file_exists', 'Local storage decision draft exists.', existsSync(draftPath)),
    check('status_ready', 'Decision draft status is ready.', draft.status === 'local_storage_decision_draft_ready'),
    check('mode_static_review_only', 'Decision draft is static review-only.', draft.mode === 'static_review_only'),
    check('required_fields_present', 'All required decision fields are present.', requiredFields.every((id) => fieldIds.has(id))),
    check('fields_need_human_decision', 'Every field still needs a human decision and evidence.', fields.every((field) => field.status === 'needs_human_decision' && asArray(field.required_evidence).length >= 3)),
    check('blocked_capabilities_present', 'Sensitive storage and memory capabilities are blocked.', requiredBlocked.every((item) => blocked.includes(item))),
    check('allowed_today_is_review_only', 'Allowed actions are static review-only.', asArray(draft.allowed_today).every((item) => ['static_decision_draft_render', 'human_review_prompt', 'local_html_smoke', 'readiness_report_generation'].includes(item))),
    check('approval_roles_present', 'Approval roles include owner, IT/KI, project lead and privacy review.', ['Chef / Admin', 'IT/KI Spezialist', 'Projektleitung', 'Datenschutz Review'].every((role) => asArray(draft.approval_roles).includes(role))),
    check('component_imports_draft', 'Component imports the local storage decision draft.', componentSource.includes('orbit-local-storage-decision.draft.json')),
    check('component_renders_decision_copy', 'Component renders local storage decision copy.', componentSource.includes('Local Storage Decision Draft') && componentSource.includes('Welche Speicherentscheidung vor echtem Memory noetig ist')),
    check('component_renders_safety_boundary', 'Component keeps storage writes, memory writes, indexing, embeddings, backup, restore and external sync blocked.', componentSource.includes('kein local storage write') && componentSource.includes('kein Memory-Write') && componentSource.includes('kein Kundendaten-Index') && componentSource.includes('kein Embedding-Job') && componentSource.includes('kein Backup-Job') && componentSource.includes('kein Restore-Job') && componentSource.includes('kein externer Sync')),
    check('route_imports_local_storage_decision', 'Orbit route imports the local storage decision component.', routeSource.includes('OrbitLocalStorageDecisionDraft')),
    check('route_anchors_local_storage_decision', 'Orbit route renders a local-storage-decision anchor.', routeSource.includes('id="local-storage-decision"')),
    check('section_index_links_local_storage_decision', 'Section index links to local storage decision.', sectionIndexSource.includes('#local-storage-decision')),
    check('component_renders_fields_and_blocks', 'Component renders decision fields and blocked capabilities.', componentSource.includes('decision_fields') && componentSource.includes('blocked_until_decision') && componentSource.includes('approval_roles')),
    check('next_actions_present', 'Next actions are explicit.', asArray(draft.next_actions).length >= 3)
  ];
  const failed = checks.filter((item) => item.status !== 'passed');
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-local-storage-decision-check',
    status: failed.length ? 'local_storage_decision_blocked' : 'local_storage_decision_passed',
    draft_file: relative(root, draftPath),
    component_file: relative(root, componentPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      decision_field_count: fields.length,
      blocked_capability_count: blocked.length,
      approval_role_count: asArray(draft.approval_roles).length
    },
    decision_fields: fields.map((field) => ({ id: field.id, evidence_count: asArray(field.required_evidence).length, status: field.status })),
    checks,
    next_actions: failed.length ? failed.map((item) => `Fix failed local storage decision check: ${item.id}`) : draft.next_actions
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
    '# KosmoOrbit Local Storage Decision Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Draft: \`${report.draft_file}\``,
    '',
    'Static review-only check for the human local storage decision. It does not write storage, memory, backups, restore jobs, embeddings, indexes or external sync.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- decision fields: ${report.summary.decision_field_count}`,
    `- blocked capabilities: ${report.summary.blocked_capability_count}`,
    `- approval roles: ${report.summary.approval_role_count}`,
    '',
    '## Decision Fields',
    '',
    '| Field | Evidence Items | Status |',
    '| --- | ---: | --- |'
  ];
  report.decision_fields.forEach((field) => lines.push(`| \`${field.id}\` | ${field.evidence_count} | \`${field.status}\` |`));
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
