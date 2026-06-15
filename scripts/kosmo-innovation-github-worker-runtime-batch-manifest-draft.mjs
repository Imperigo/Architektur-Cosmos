#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  readinessPlan: resolve(root, args.readinessPlan || `data/kosmo-innovation-github-worker-runtime-batch-readiness-plan-${dateStamp}.json`),
  readinessPlanCheck: resolve(root, args.readinessPlanCheck || `data/kosmo-innovation-github-worker-runtime-batch-readiness-plan-check-${dateStamp}.json`),
  rollbackRedactionFixtures: resolve(root, args.rollbackRedactionFixtures || `data/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-${dateStamp}.json`),
  rollbackRedactionFixturesCheck: resolve(root, args.rollbackRedactionFixturesCheck || `data/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-check-${dateStamp}.json`),
  runtimeApplyGuard: resolve(root, args.runtimeApplyGuard || `data/kosmo-innovation-github-worker-runtime-apply-guard-${dateStamp}.json`),
  runtimeApplyGuardCheck: resolve(root, args.runtimeApplyGuardCheck || `data/kosmo-innovation-github-worker-runtime-apply-guard-check-${dateStamp}.json`),
  logRedactionNegativeFixtures: resolve(root, args.logRedactionNegativeFixtures || `data/kosmo-innovation-github-worker-runtime-log-redaction-negative-fixtures-${dateStamp}.json`),
  logRedactionNegativeFixturesCheck: resolve(root, args.logRedactionNegativeFixturesCheck || `data/kosmo-innovation-github-worker-runtime-log-redaction-negative-fixtures-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-batch-manifest-draft-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-batch-manifest-draft-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const report = buildReport(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub worker runtime batch manifest draft');
  console.log(`Status: ${report.status}`);
  console.log(`Batch ID: ${report.summary.runtime_batch_id}`);
  console.log(`Prerequisites: ${report.summary.prerequisites}`);
  console.log(`Blocked prerequisites: ${report.summary.blocked_prerequisites}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport(reports) {
  const failures = [];
  if (reports.readinessPlan.status !== 'innovation_github_worker_runtime_batch_readiness_plan_ready') {
    failures.push(`Readiness plan not ready: ${reports.readinessPlan.status}`);
  }
  if (reports.readinessPlanCheck.status !== 'innovation_github_worker_runtime_batch_readiness_plan_guard_passed') {
    failures.push(`Readiness plan check not passed: ${reports.readinessPlanCheck.status}`);
  }
  if (reports.rollbackRedactionFixtures.status !== 'innovation_github_worker_runtime_rollback_redaction_fixtures_ready') {
    failures.push(`Rollback/redaction fixtures not ready: ${reports.rollbackRedactionFixtures.status}`);
  }
  if (reports.rollbackRedactionFixturesCheck.status !== 'innovation_github_worker_runtime_rollback_redaction_fixtures_guard_passed') {
    failures.push(`Rollback/redaction fixtures check not passed: ${reports.rollbackRedactionFixturesCheck.status}`);
  }
  if (![
    'innovation_github_worker_runtime_apply_guard_waiting_for_exact_reply',
    'innovation_github_worker_runtime_apply_guard_ready_for_separate_runtime_batch'
  ].includes(reports.runtimeApplyGuard.status)) {
    failures.push(`Runtime apply guard in unexpected state: ${reports.runtimeApplyGuard.status}`);
  }
  if (reports.runtimeApplyGuardCheck.status !== 'innovation_github_worker_runtime_apply_guard_guard_passed') {
    failures.push(`Runtime apply guard check not passed: ${reports.runtimeApplyGuardCheck.status}`);
  }
  if (reports.logRedactionNegativeFixtures.status !== 'innovation_github_worker_runtime_log_redaction_negative_fixtures_ready') {
    failures.push(`Log redaction negative fixtures not ready: ${reports.logRedactionNegativeFixtures.status}`);
  }
  if (reports.logRedactionNegativeFixturesCheck.status !== 'innovation_github_worker_runtime_log_redaction_negative_fixtures_guard_passed') {
    failures.push(`Log redaction negative fixtures check not passed: ${reports.logRedactionNegativeFixturesCheck.status}`);
  }

  const exactOwnerReplyValid = reports.runtimeApplyGuard.summary?.exact_reply_valid === true;
  const runtimeReadinessExecutable = reports.readinessPlan.summary?.runtime_executable_now === true;
  const prerequisites = [
    prereq('readiness_plan_guard_passed', true, 'Runtime readiness plan and check are present.'),
    prereq('rollback_redaction_guard_passed', true, 'Rollback/redaction fixtures and check are present.'),
    prereq('log_redaction_negative_fixtures_passed', true, 'Unsafe runtime log cases are blocked.'),
    prereq('exact_owner_runtime_reply_valid', exactOwnerReplyValid, 'Exact key=value owner reply is required.'),
    prereq('runtime_readiness_executable', runtimeReadinessExecutable, 'Readiness plan must permit runtime execution.'),
    prereq('source_root_or_source_free_scope_confirmed', exactOwnerReplyValid, 'Runtime batch scope must be separately confirmed as source-free or source-root-safe.'),
    prereq('pre_runtime_overseer_review_required', false, 'Overseer review must happen in a later runtime batch, not in this draft.')
  ];
  const phases = [
    phase('preflight_guard_refresh', ['rerun_readiness_plan', 'rerun_apply_guard', 'rerun_log_redaction_negative_fixtures'], false),
    phase('runtime_environment_snapshot', ['capture_runtime_config_metadata', 'capture_gpu_model_metadata', 'capture_output_root_metadata'], false),
    phase('source_free_worker_invocation', ['run_only_allowed_command_shapes', 'write_redacted_metadata_log', 'skip_private_inputs'], false),
    phase('post_output_validator_gate', ['validate_metadata_only_outputs', 'block_raw_runtime_stdio', 'block_public_ready'], false),
    phase('rollback_ready_checkpoint', ['record_stop_plan', 'record_output_cleanup_plan', 'record_config_restore_refs'], false),
    phase('overseer_handoff_review', ['write_review_only_handoff', 'require_claude_kosmooverseer_review', 'require_owner_review_before_promotion'], false)
  ];
  const expectedOutputs = [
    output('runtime_batch_manifest_redacted', 'json', false),
    output('runtime_metadata_log_redacted', 'jsonl', false),
    output('worker_output_metadata_only', 'json', false),
    output('post_output_validator_report', 'json', false),
    output('rollback_manifest_redacted', 'json', false),
    output('overseer_review_handoff', 'markdown', false)
  ];
  const reviewGates = [
    gate('exact_owner_reply_gate', exactOwnerReplyValid),
    gate('source_root_or_source_free_gate', exactOwnerReplyValid),
    gate('runtime_apply_guard_gate', exactOwnerReplyValid),
    gate('log_redaction_gate', true),
    gate('rollback_gate', true),
    gate('overseer_review_gate', false),
    gate('public_ready_gate', false)
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_batch_manifest_draft_ready'
      : 'innovation_github_worker_runtime_batch_manifest_draft_needs_review',
    policy: {
      manifest_draft_only: true,
      executes_runtime_now: false,
      executes_rollback_now: false,
      starts_models_now: false,
      installs_dependencies_now: false,
      reads_private_content_now: false,
      writes_runtime_outputs_now: false,
      writes_worker_outputs_now: false,
      writes_runtime_manifest_now: false,
      public_ready_after_manifest: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      runtime_batch_id: `github-worker-runtime-batch-draft-${dateStamp}`,
      selected_fixture_id: reports.readinessPlan.summary?.selected_fixture_id || null,
      prerequisites: prerequisites.length,
      blocked_prerequisites: prerequisites.filter((item) => item.ready !== true).length,
      phases: phases.length,
      expected_outputs: expectedOutputs.length,
      review_gates: reviewGates.length,
      open_review_gates: reviewGates.filter((item) => item.passed !== true).length,
      exact_owner_reply_valid: exactOwnerReplyValid,
      executable_now: false,
      runtime_executable_now_from_readiness: runtimeReadinessExecutable,
      writes_runtime_manifest_now: false,
      public_ready_after_manifest: 0,
      failures: failures.length
    },
    prerequisites,
    phases,
    expected_outputs: expectedOutputs,
    rollback_refs: reports.rollbackRedactionFixtures.rollback_steps || [],
    redaction_refs: reports.rollbackRedactionFixtures.redaction_rules || [],
    negative_log_fixture_refs: (reports.logRedactionNegativeFixtures.negative_fixtures || []).map((fixture) => ({
      id: fixture.id,
      leak_category: fixture.leak_category,
      expected_status: fixture.expected_status
    })),
    review_gates: reviewGates,
    next_actions: [
      'Keep this manifest as a draft until exact owner reply and runtime readiness both permit a separate batch.',
      'Before any future runtime call, regenerate this manifest and its check from fresh guard outputs.',
      'Do not write runtime outputs from this manifest draft.'
    ],
    hard_stops: [
      'This manifest draft never executes runtime commands.',
      'This manifest draft never starts models or local workers.',
      'This manifest draft never reads private Source Root, OneDrive or archive-library content.',
      'This manifest draft never writes runtime manifests, runtime outputs or worker outputs.',
      'This manifest draft never marks anything public-ready.'
    ],
    failures
  };
}

function prereq(id, ready, description) {
  return { id, ready, description };
}

function phase(id, planned_actions, executable_now) {
  return { id, planned_actions, executable_now, review_only: true };
}

function output(id, format, written_now) {
  return { id, format, written_now, review_only: true, redaction_required: true };
}

function gate(id, passed) {
  return { id, passed, required_before_execution: true };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Worker Runtime Batch Manifest Draft');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Runtime batch ID: \`${report.summary.runtime_batch_id}\``);
  lines.push(`- Selected fixture: \`${report.summary.selected_fixture_id}\``);
  lines.push(`- Prerequisites: ${report.summary.prerequisites}`);
  lines.push(`- Blocked prerequisites: ${report.summary.blocked_prerequisites}`);
  lines.push(`- Phases: ${report.summary.phases}`);
  lines.push(`- Expected outputs: ${report.summary.expected_outputs}`);
  lines.push(`- Review gates: ${report.summary.review_gates}`);
  lines.push(`- Open review gates: ${report.summary.open_review_gates}`);
  lines.push(`- Exact owner reply valid: ${report.summary.exact_owner_reply_valid ? 'yes' : 'no'}`);
  lines.push(`- Executable now: ${report.summary.executable_now ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after manifest: ${report.summary.public_ready_after_manifest}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Phases');
  lines.push('');
  report.phases.forEach((phaseItem) => {
    lines.push(`- \`${phaseItem.id}\`: executable now ${phaseItem.executable_now ? 'yes' : 'no'}, actions ${phaseItem.planned_actions.join(', ')}`);
  });
  lines.push('');
  lines.push('## Review Gates');
  lines.push('');
  report.review_gates.forEach((gateItem) => {
    lines.push(`- \`${gateItem.id}\`: ${gateItem.passed ? 'passed' : 'open'}`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (report.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    report.failures.forEach((failure) => lines.push(`- ${failure}`));
    lines.push('');
  }
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
