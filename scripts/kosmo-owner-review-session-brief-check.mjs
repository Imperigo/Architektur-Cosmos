#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const briefPath = resolve(root, args.brief || `data/kosmo-owner-review-session-brief-${dateStamp}.json`);
const questionBriefPath = resolve(root, args.questionBrief || `data/kosmo-owner-question-brief-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-review-session-brief-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-review-session-brief-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const brief = JSON.parse(await readFile(briefPath, 'utf8'));
  const questionBrief = JSON.parse(await readFile(questionBriefPath, 'utf8'));
  const findings = [
    ...checkPolicy(brief),
    ...checkSummary(brief),
    ...checkPriorSignals(brief),
    ...checkQuestions(brief, questionBrief),
    ...checkSourceRoot(brief)
  ];
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'owner_review_session_brief_guard_passed' : 'owner_review_session_brief_guard_failed',
    policy: {
      records_decisions: false,
      writes_session_files: false,
      applies_decisions: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_guard: 0,
      note: 'This guard validates the owner review session brief. It does not record answers or apply decisions.'
    },
    source_refs: [relative(root, briefPath), relative(root, questionBriefPath)],
    summary: {
      brief_status: brief.status,
      questions: brief.summary?.questions ?? null,
      prior_signals: brief.summary?.prior_signals ?? null,
      prior_signals_recordable_now: brief.summary?.prior_signals_recordable_now ?? null,
      actionable_decisions_written: brief.summary?.actionable_decisions_written ?? null,
      failures: failures.length,
      warnings: warnings.length,
      public_ready_after_guard: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use the session brief as the paste-ready owner conversation guide.',
          'Keep prior chat signals non-recordable until explicit owner answers are given.',
          'After explicit answers, update intake template and rerun intake/session guards.'
        ]
      : [
          'Fix owner review session brief guard failures before presenting it.',
          'Rerun npm run kosmo:owner-review-session-brief and npm run kosmo:owner-review-session-brief-check.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner review session brief check');
  console.log(`Status: ${report.status}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPolicy(brief) {
  const findings = [];
  expect(brief.status === 'owner_review_session_brief_ready', findings, 'session_brief_ready', 'Session brief must be ready.');
  expect(brief.policy?.records_decisions === false, findings, 'records_decisions_false', 'Session brief must not record decisions.');
  expect(brief.policy?.writes_session_files === false, findings, 'writes_session_files_false', 'Session brief must not write session files.');
  expect(brief.policy?.applies_decisions === false, findings, 'applies_decisions_false', 'Session brief must not apply decisions.');
  expect(brief.policy?.writes_public_files === false, findings, 'writes_public_files_false', 'Session brief must not write public files.');
  expect(brief.policy?.writes_public_manifest === false, findings, 'writes_public_manifest_false', 'Session brief must not write public manifests.');
  expect(brief.policy?.public_ready_after_brief === 0, findings, 'public_ready_after_brief_zero', 'Session brief must keep public-ready after brief at 0.');
  return findings;
}

function checkSummary(brief) {
  const findings = [];
  expect(brief.summary?.packet_status === 'owner_review_packet_ready', findings, 'packet_ready', 'Session brief must reference a ready owner review packet.');
  expect(brief.summary?.packet_guard_status === 'owner_review_packet_guard_passed', findings, 'packet_guard_passed', 'Session brief must reference a passing packet guard.');
  expect(brief.summary?.router_status === 'worker_router_guarded_review_only', findings, 'router_guarded_review_only', 'Session brief must keep router guarded review-only.');
  expect(brief.summary?.questions === 6, findings, 'question_count_six', 'Session brief must contain six owner questions.');
  expect(brief.summary?.prior_signals === 5, findings, 'prior_signal_count_five', 'Session brief must classify five prior owner signals.');
  expect(brief.summary?.prior_signals_recordable_now === 0, findings, 'prior_signals_recordable_zero', 'No prior signal may be recordable now.');
  expect(brief.summary?.required_owner_answers === 6, findings, 'required_answers_six', 'All six owner answers must remain required.');
  expect(brief.summary?.actionable_decisions_written === 0, findings, 'actionable_decisions_written_zero', 'Session brief must not write actionable decisions.');
  expect(brief.summary?.public_ready_after_brief === 0, findings, 'summary_public_ready_zero', 'Session brief summary must keep public-ready at 0.');
  return findings;
}

function checkPriorSignals(brief) {
  const findings = [];
  const signals = brief.prior_owner_signals || [];
  expect(signals.length === 5, findings, 'prior_signals_array_count', 'Prior owner signals array must contain five items.');
  for (const signal of signals) {
    expect(signal.recordable_now === false, findings, `prior_signal_not_recordable:${signal.id}`, `Prior signal ${signal.id} must not be recordable now.`);
    expect(typeof signal.reason === 'string' && signal.reason.length > 20, findings, `prior_signal_reason:${signal.id}`, `Prior signal ${signal.id} must include a reason.`);
  }
  return findings;
}

function checkQuestions(brief, questionBrief) {
  const findings = [];
  const sessionQuestions = brief.owner_questions || [];
  const sourceQuestions = questionBrief.questions || [];
  const sourceById = new Map(sourceQuestions.map((question) => [question.id, question]));
  expect(sessionQuestions.length === sourceQuestions.length, findings, 'question_count_matches_source', 'Session question count must match owner question brief.');
  for (const question of sessionQuestions) {
    const source = sourceById.get(question.id);
    expect(Boolean(source), findings, `question_source_exists:${question.id}`, `Session question ${question.id} must exist in owner question brief.`);
    if (!source) continue;
    expect(question.current_status === 'unanswered', findings, `question_unanswered:${question.id}`, `Session question ${question.id} must remain unanswered.`);
    expect(question.safe_default === source.safe_default, findings, `question_safe_default_match:${question.id}`, `Session question ${question.id} safe default must match source.`);
    expect(sameSet(question.allowed_answers, source.allowed_answers), findings, `question_allowed_answers_match:${question.id}`, `Session question ${question.id} allowed answers must match source.`);
  }
  return findings;
}

function checkSourceRoot(brief) {
  const status = brief.source_root_status || {};
  const findings = [];
  expect(status.current_selected_decision == null, findings, 'source_root_decision_pending', 'Source-root decision must remain pending.');
  expect(status.current_selected_root_path == null, findings, 'source_root_path_pending', 'Source-root path must remain pending.');
  expect(status.safe_default === 'keep_blocked', findings, 'source_root_safe_default_keep_blocked', 'Source-root safe default must remain keep_blocked.');
  return findings;
}

function sameSet(left = [], right = []) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
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
  lines.push('# Kosmo Owner Review Session Brief Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Brief status: ${report.summary.brief_status}`);
  lines.push(`- Questions: ${report.summary.questions}`);
  lines.push(`- Prior signals: ${report.summary.prior_signals}`);
  lines.push(`- Prior signals recordable now: ${report.summary.prior_signals_recordable_now}`);
  lines.push(`- Actionable decisions written: ${report.summary.actionable_decisions_written}`);
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
