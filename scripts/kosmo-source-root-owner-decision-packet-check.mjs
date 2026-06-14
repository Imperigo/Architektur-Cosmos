#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  packet: resolve(root, args.packet || `data/kosmo-source-root-owner-decision-packet-${dateStamp}.json`),
  candidateIntegrity: resolve(root, args.candidateIntegrity || `data/kosmo-source-root-candidate-integrity-check-${dateStamp}.json`),
  decisionSession: resolve(root, args.decisionSession || `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-root-owner-decision-packet-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-owner-decision-packet-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const packet = await readJson(refs.packet);
  const candidateIntegrity = await readJson(refs.candidateIntegrity);
  const decisionSession = await readJson(refs.decisionSession);
  const findings = await checkPacket({ packet, candidateIntegrity, decisionSession });
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'source_root_owner_decision_packet_guard_passed'
      : 'source_root_owner_decision_packet_guard_failed',
    policy: {
      guard_only: true,
      records_decisions: false,
      mutates_decision_session: false,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_guard: 0,
      note: 'This guard validates the owner decision packet and its source-root templates. It does not apply owner decisions.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      packet_status: packet.status,
      candidate_integrity_status: candidateIntegrity.status,
      decision_session_status: decisionSession.status,
      decision_templates: packet.decision_templates?.length ?? 0,
      unlocking_templates: (packet.decision_templates || []).filter((template) => template.unlocks_private_metadata_diagnostic === true).length,
      owner_confirmable_exact_roots: packet.summary?.owner_confirmable_exact_roots ?? null,
      failures: failures.length,
      warnings: warnings.length,
      public_ready_after_guard: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use this guarded packet as the owner-facing source-root decision surface.',
          'Record a decision only after explicit owner/KosmoOverseer confirmation.',
          'Rerun source-root decision-session check and day batch after any recorded decision.'
        ]
      : [
          'Fix packet guard failures before presenting source-root templates.',
          'Rerun source-root candidate integrity, owner decision packet and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo source-root owner decision packet check');
  console.log(`Status: ${report.status}`);
  console.log(`Templates: ${report.summary.decision_templates}`);
  console.log(`Unlocking templates: ${report.summary.unlocking_templates}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

async function checkPacket({ packet, candidateIntegrity, decisionSession }) {
  const findings = [];
  const templates = packet.decision_templates || [];
  const exactRootPaths = new Set(
    (candidateIntegrity.option_checks || [])
      .filter((option) => option.guard_class === 'owner_confirmable_exact_root' && option.exists === true)
      .map((option) => option.path)
  );

  expect(packet.status === 'source_root_owner_decision_packet_ready', findings, 'packet_ready', 'Packet status must be ready.');
  expect(packet.policy?.records_decisions === false, findings, 'records_decisions_false', 'Packet must not record decisions.');
  expect(packet.policy?.mutates_decision_session === false, findings, 'mutates_decision_session_false', 'Packet must not mutate the decision session.');
  expect(packet.policy?.reads_private_content === false, findings, 'reads_private_content_false', 'Packet must not read private content.');
  expect(packet.policy?.copies_private_content === false, findings, 'copies_private_content_false', 'Packet must not copy private content.');
  expect(packet.policy?.writes_public_files === false, findings, 'writes_public_files_false', 'Packet must not write public files.');
  expect(packet.policy?.writes_public_manifest === false, findings, 'writes_public_manifest_false', 'Packet must not write public manifests.');
  expect(packet.policy?.public_ready_after_packet === 0, findings, 'packet_public_ready_zero', 'Packet must keep public-ready at 0.');
  expect(packet.summary?.private_diagnostic_allowed === false, findings, 'private_diagnostic_not_allowed_yet', 'Pending packet must not allow private diagnostic yet.');
  expect(packet.summary?.selected_decision === null, findings, 'selected_decision_null', 'Packet must not contain a selected decision.');
  expect(packet.summary?.selected_root_path === null, findings, 'selected_root_path_null', 'Packet must not contain a selected root path.');
  expect(candidateIntegrity.status === 'source_root_candidate_integrity_owner_review_ready', findings, 'candidate_integrity_ready', 'Candidate integrity must be ready.');
  expect(decisionSession.status === 'source_root_decision_session_pending', findings, 'decision_session_pending', 'Decision session must remain pending.');
  expect(!normalize(decisionSession.selected_decision), findings, 'session_selected_decision_empty', 'Decision session must not contain selected_decision.');
  expect(!normalize(decisionSession.selected_root_path), findings, 'session_selected_root_empty', 'Decision session must not contain selected_root_path.');
  expect(templates.length >= 3, findings, 'templates_present', 'Packet must expose at least three decision templates.');

  const templateIds = templates.map((template) => template.id);
  expect(templateIds.includes('keep_blocked'), findings, 'template_keep_blocked_present', 'keep_blocked template must exist.');
  expect(templateIds.includes('repair_onedrive_first'), findings, 'template_repair_onedrive_present', 'repair_onedrive_first template must exist.');
  const unlockingTemplates = templates.filter((template) => template.unlocks_private_metadata_diagnostic === true);
  expect(unlockingTemplates.length === (packet.summary?.owner_confirmable_exact_roots ?? 0), findings, 'unlocking_template_count_matches_exact_roots', 'Unlocking templates must match owner-confirmable exact roots.');
  expect(unlockingTemplates.length <= 1, findings, 'unlocking_template_count_limited', 'Only one unlocking template is allowed before owner selection.');

  for (const template of templates) {
    checkTemplate(template, findings, exactRootPaths, decisionSession.allowed_decisions || []);
  }

  return findings;
}

function checkTemplate(template, findings, exactRootPaths, allowedDecisions) {
  const prefix = `template:${template.id}`;
  const fields = template.session_fields || {};
  expect(fields.status === 'source_root_decision_session_recorded', findings, `${prefix}:recorded_status`, 'Template must record the session only after owner confirmation.');
  expect(allowedDecisions.includes(fields.selected_decision), findings, `${prefix}:allowed_decision`, `Template selected_decision must be allowed: ${fields.selected_decision}`);
  if (template.unlocks_private_metadata_diagnostic === true) {
    expect(fields.selected_decision === 'select_existing_root_for_private_diagnostic', findings, `${prefix}:unlock_decision`, 'Unlocking template must use select_existing_root_for_private_diagnostic.');
    expect(typeof fields.selected_root_path === 'string' && fields.selected_root_path.startsWith('/'), findings, `${prefix}:absolute_root`, 'Unlocking template must include an absolute selected_root_path.');
    expect(exactRootPaths.has(fields.selected_root_path), findings, `${prefix}:root_in_integrity`, 'Unlocking template root must match an owner-confirmable exact root.');
  } else {
    expect(fields.selected_root_path === null, findings, `${prefix}:no_root_for_blocked_decision`, 'Non-unlocking templates must not include a root path.');
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function expect(condition, findings, id, message) {
  findings.push({
    id,
    severity: condition ? 'passed' : 'failure',
    message
  });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Source-Root Owner Decision Packet Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Packet status: ${report.summary.packet_status}`);
  lines.push(`- Candidate integrity: ${report.summary.candidate_integrity_status}`);
  lines.push(`- Decision session: ${report.summary.decision_session_status}`);
  lines.push(`- Decision templates: ${report.summary.decision_templates}`);
  lines.push(`- Unlocking templates: ${report.summary.unlocking_templates}`);
  lines.push(`- Owner-confirmable exact roots: ${report.summary.owner_confirmable_exact_roots}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Public-ready after guard: ${report.summary.public_ready_after_guard}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  lines.push('| Finding | Severity | Message |');
  lines.push('| --- | --- | --- |');
  report.findings.forEach((finding) => {
    lines.push(`| \`${finding.id}\` | ${finding.severity} | ${escapePipe(finding.message)} |`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return lines.join('\n');
}

function normalize(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
