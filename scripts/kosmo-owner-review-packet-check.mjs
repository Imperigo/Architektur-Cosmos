#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const packetPath = resolve(root, args.packet || `data/kosmo-owner-review-packet-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-review-packet-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-review-packet-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const packet = JSON.parse(await readFile(packetPath, 'utf8'));
  const findings = [
    ...checkPolicy(packet),
    ...checkSummary(packet),
    ...checkReviewOrder(packet),
    ...(await checkReviewRefs(packet))
  ];
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'owner_review_packet_guard_passed' : 'owner_review_packet_guard_failed',
    policy: {
      records_decisions: false,
      writes_session_files: false,
      applies_decisions: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_guard: 0,
      note: 'This guard validates the owner review packet entry point. It does not collect answers, apply decisions or publish files.'
    },
    source_refs: [relative(root, packetPath)],
    summary: {
      packet_status: packet.status,
      data_lane_status: packet.summary?.data_lane_status ?? null,
      review_order_items: packet.review_order?.length ?? 0,
      questions: packet.summary?.questions ?? null,
      filled_answers: packet.summary?.filled_answers ?? null,
      planned_edits: packet.summary?.planned_edits ?? null,
      failures: failures.length,
      warnings: warnings.length,
      public_ready_after_guard: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use the owner review packet as the single entry point for the next owner review round.',
          'Present questions without treating chat text as recorded decisions.',
          'Transfer only explicit owner answers into the intake template, then rerun intake and session edit guards.'
        ]
      : [
          'Fix owner review packet guard failures before presenting the packet.',
          'Rerun npm run kosmo:owner-review-packet and npm run kosmo:owner-review-packet-check.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner review packet check');
  console.log(`Status: ${report.status}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPolicy(packet) {
  const findings = [];
  expect(packet.status === 'owner_review_packet_ready', findings, 'packet_status_ready', 'Owner review packet status must be owner_review_packet_ready.');
  expect(packet.policy?.records_decisions === false, findings, 'records_decisions_false', 'Packet must not record decisions.');
  expect(packet.policy?.writes_session_files === false, findings, 'writes_session_files_false', 'Packet must not write session files.');
  expect(packet.policy?.applies_decisions === false, findings, 'applies_decisions_false', 'Packet must not apply decisions.');
  expect(packet.policy?.writes_public_files === false, findings, 'writes_public_files_false', 'Packet must not write public files.');
  expect(packet.policy?.writes_public_manifest === false, findings, 'writes_public_manifest_false', 'Packet must not write public manifests.');
  expect(packet.policy?.public_ready_after_packet === 0, findings, 'public_ready_after_packet_zero', 'Packet policy must keep public-ready after packet at 0.');
  return findings;
}

function checkSummary(packet) {
  const summary = packet.summary || {};
  const findings = [];
  expect(summary.data_lane_status === 'kosmodata_lane_sweep_review_only_passed', findings, 'data_lane_review_only_passed', 'Packet must reference a review-only passed data lane.');
  expect(summary.question_brief_status === 'owner_question_brief_ready', findings, 'question_brief_ready', 'Question brief must be ready.');
  expect(summary.question_brief_guard_status === 'owner_question_brief_guard_passed', findings, 'question_brief_guard_passed', 'Question brief guard must pass.');
  expect(summary.questions === 6, findings, 'question_count_six', 'Packet must expose the six-question owner brief.');
  expect(summary.intake_status === 'owner_answer_intake_template_pending_owner_input', findings, 'intake_pending_owner', 'Owner answer intake must still wait for owner input.');
  expect(summary.intake_guard_status === 'owner_answer_intake_guard_passed_pending_owner_input', findings, 'intake_guard_pending_owner', 'Owner answer intake guard must pass while pending owner input.');
  expect(summary.filled_answers === 0, findings, 'filled_answers_zero', 'Packet must not contain filled answers.');
  expect(summary.session_edit_plan_status === 'owner_answer_session_edit_plan_pending_owner_input', findings, 'session_edit_plan_pending_owner', 'Session edit plan must remain pending owner input.');
  expect(summary.planned_edits === 0, findings, 'planned_edits_zero', 'Packet must not plan edits.');
  expect(summary.public_ready_after_packet === 0, findings, 'summary_public_ready_zero', 'Packet summary must keep public-ready at 0.');
  return findings;
}

function checkReviewOrder(packet) {
  const findings = [];
  const order = packet.review_order || [];
  const required = [
    ['Owner Question Brief', 'owner_question_brief_ready'],
    ['Question Brief Guard', 'owner_question_brief_guard_passed'],
    ['Owner Answer Intake', 'owner_answer_intake_template_pending_owner_input'],
    ['Owner Answer Intake Check', 'owner_answer_intake_guard_passed_pending_owner_input'],
    ['Session Edit Plan', 'owner_answer_session_edit_plan_pending_owner_input']
  ];
  expect(order.length === required.length, findings, 'review_order_length', `Packet review order must contain ${required.length} items.`);
  required.forEach(([title, status], index) => {
    const item = order[index];
    expect(item?.order === index + 1, findings, `review_order_number:${index + 1}`, `Review order item ${index + 1} must be in sequence.`);
    expect(item?.title === title, findings, `review_order_title:${title}`, `Review order item ${index + 1} must be ${title}.`);
    expect(item?.required_status === status, findings, `review_order_status:${title}`, `${title} must require status ${status}.`);
    expect(typeof item?.json === 'string' && item.json.length > 0, findings, `review_order_json:${title}`, `${title} must include a JSON source path.`);
  });
  return findings;
}

async function checkReviewRefs(packet) {
  const findings = [];
  for (const item of packet.review_order || []) {
    const jsonPath = resolve(root, item.json || '');
    const exists = await pathExists(jsonPath);
    expect(exists, findings, `review_ref_exists:${item.title}`, `${item.title} JSON source must exist.`);
    if (!exists) continue;
    try {
      const source = JSON.parse(await readFile(jsonPath, 'utf8'));
      expect(source.status === item.required_status, findings, `review_ref_status:${item.title}`, `${item.title} source status must match packet required status.`);
    } catch (error) {
      findings.push({
        id: `review_ref_parse:${item.title}`,
        severity: 'failure',
        message: `${item.title} JSON source could not be parsed: ${error.message}`
      });
    }
  }
  return findings;
}

async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
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
  lines.push('# Kosmo Owner Review Packet Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Packet status: ${report.summary.packet_status}`);
  lines.push(`- Data lane status: ${report.summary.data_lane_status}`);
  lines.push(`- Review order items: ${report.summary.review_order_items}`);
  lines.push(`- Questions: ${report.summary.questions}`);
  lines.push(`- Filled answers: ${report.summary.filled_answers}`);
  lines.push(`- Planned edits: ${report.summary.planned_edits}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Public-ready after guard: ${report.summary.public_ready_after_guard}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => {
    lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return lines.join('\n');
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
