#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  manifestDraft: resolve(root, args.manifestDraft || `data/kosmo-innovation-github-worker-runtime-batch-manifest-draft-${dateStamp}.json`),
  manifestDraftCheck: resolve(root, args.manifestDraftCheck || `data/kosmo-innovation-github-worker-runtime-batch-manifest-draft-check-${dateStamp}.json`),
  runtimeApplyGuard: resolve(root, args.runtimeApplyGuard || `data/kosmo-innovation-github-worker-runtime-apply-guard-${dateStamp}.json`),
  runtimeApplyGuardCheck: resolve(root, args.runtimeApplyGuardCheck || `data/kosmo-innovation-github-worker-runtime-apply-guard-check-${dateStamp}.json`),
  rollbackRedactionFixtures: resolve(root, args.rollbackRedactionFixtures || `data/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-${dateStamp}.json`),
  rollbackRedactionFixturesCheck: resolve(root, args.rollbackRedactionFixturesCheck || `data/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-check-${dateStamp}.json`),
  logRedactionNegativeFixtures: resolve(root, args.logRedactionNegativeFixtures || `data/kosmo-innovation-github-worker-runtime-log-redaction-negative-fixtures-${dateStamp}.json`),
  logRedactionNegativeFixturesCheck: resolve(root, args.logRedactionNegativeFixturesCheck || `data/kosmo-innovation-github-worker-runtime-log-redaction-negative-fixtures-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-manifest-negative-fixtures-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-manifest-negative-fixtures-${dateStamp}.md`);

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

  console.log('Kosmo innovation GitHub worker runtime manifest negative fixtures');
  console.log(`Status: ${report.status}`);
  console.log(`Negative fixtures: ${report.summary.negative_fixtures}`);
  console.log(`Expected blocked: ${report.summary.expected_blocked}`);
  console.log(`Categories: ${report.summary.categories}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Public-ready after fixtures: ${report.summary.public_ready_after_fixtures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport(reports) {
  const failures = [];
  if (reports.manifestDraft.status !== 'innovation_github_worker_runtime_batch_manifest_draft_ready') failures.push(`Manifest draft not ready: ${reports.manifestDraft.status}`);
  if (reports.manifestDraftCheck.status !== 'innovation_github_worker_runtime_batch_manifest_draft_guard_passed') failures.push(`Manifest draft check not passed: ${reports.manifestDraftCheck.status}`);
  if (!['innovation_github_worker_runtime_apply_guard_waiting_for_exact_reply', 'innovation_github_worker_runtime_apply_guard_ready_for_separate_runtime_batch'].includes(reports.runtimeApplyGuard.status)) failures.push(`Runtime apply guard in unexpected state: ${reports.runtimeApplyGuard.status}`);
  if (reports.runtimeApplyGuardCheck.status !== 'innovation_github_worker_runtime_apply_guard_guard_passed') failures.push(`Runtime apply guard check not passed: ${reports.runtimeApplyGuardCheck.status}`);
  if (reports.rollbackRedactionFixtures.status !== 'innovation_github_worker_runtime_rollback_redaction_fixtures_ready') failures.push(`Rollback/redaction fixtures not ready: ${reports.rollbackRedactionFixtures.status}`);
  if (reports.rollbackRedactionFixturesCheck.status !== 'innovation_github_worker_runtime_rollback_redaction_fixtures_guard_passed') failures.push(`Rollback/redaction fixtures check not passed: ${reports.rollbackRedactionFixturesCheck.status}`);
  if (reports.logRedactionNegativeFixtures.status !== 'innovation_github_worker_runtime_log_redaction_negative_fixtures_ready') failures.push(`Log redaction negative fixtures not ready: ${reports.logRedactionNegativeFixtures.status}`);
  if (reports.logRedactionNegativeFixturesCheck.status !== 'innovation_github_worker_runtime_log_redaction_negative_fixtures_guard_passed') failures.push(`Log redaction negative fixtures check not passed: ${reports.logRedactionNegativeFixturesCheck.status}`);

  const fixtures = [
    fixture('manifest_marks_executable_now', 'execution_state', { executable_now: true, runtime_executable_now: true, writes_runtime_manifest_now: true }, ['executable_now_true', 'runtime_executable_now_true', 'writes_runtime_manifest_now_true']),
    fixture('manifest_skips_runtime_apply_guard', 'missing_guard', { prerequisite_ids: ['readiness_plan_guard_passed', 'rollback_redaction_guard_passed'], missing_prerequisite_ids: ['runtime_apply_guard_gate'] }, ['runtime_apply_guard_gate_missing']),
    fixture('manifest_missing_rollback_redaction_refs', 'missing_guard', { rollback_refs: [], redaction_refs: [], negative_log_fixture_refs: [] }, ['rollback_refs_missing', 'redaction_refs_missing', 'negative_log_fixture_refs_missing']),
    fixture('manifest_writes_raw_runtime_outputs', 'raw_runtime_output', { expected_outputs: [{ id: 'raw_runtime_stdout', written_now: true, redaction_required: false }, { id: 'raw_runtime_stderr', written_now: true, redaction_required: false }] }, ['raw_runtime_stdout_requested', 'raw_runtime_stderr_requested', 'redaction_required_false']),
    fixture('manifest_embeds_worker_output_body', 'worker_output_body', { expected_outputs: [{ id: 'worker_output_body', written_now: true, metadata_only: false }] }, ['worker_output_body_requested', 'metadata_only_false']),
    fixture('manifest_contains_private_source_path', 'private_path', { input_refs: ['<PRIVATE_SOURCE_ROOT>/books/protected-plan.pdf', '<ONEDRIVE_PRIVATE_LIBRARY>/11 AI Workflow/source.pdf'] }, ['private_source_path_present', 'onedrive_private_path_present']),
    fixture('manifest_contains_secret_field', 'secret', { env: { OPENAI_API_KEY: '<API_TOKEN>', SSH_PRIVATE_KEY: '<SSH_KEY>' }, redacted_secrets_count: 0 }, ['secret_field_present', 'ssh_key_field_present', 'redacted_secrets_count_zero']),
    fixture('manifest_starts_models_or_installs_dependencies', 'runtime_side_effect', { phases: [{ id: 'install_dependencies', executable_now: true }, { id: 'download_models', executable_now: true }, { id: 'start_model_runtime', executable_now: true }] }, ['install_dependencies_phase_executable', 'download_models_phase_executable', 'start_model_runtime_phase_executable']),
    fixture('manifest_skips_overseer_review_gate', 'missing_guard', { review_gates: [{ id: 'log_redaction_gate', passed: true }, { id: 'rollback_gate', passed: true }, { id: 'public_ready_gate', passed: true }] }, ['overseer_review_gate_missing', 'public_ready_gate_passed']),
    fixture('manifest_promotes_public_ready', 'public_ready_false_positive', { public_ready: true, public_ready_after_manifest: 1, rights_state: 'unknown' }, ['public_ready_true', 'public_ready_after_manifest_nonzero', 'rights_state_unknown'])
  ];

  fixtures.forEach((item) => {
    if (item.expected_status !== 'blocked') failures.push(`Fixture ${item.id} must expect blocked status.`);
    if (item.synthetic_only !== true) failures.push(`Fixture ${item.id} must be synthetic only.`);
    if (item.executable_now !== false) failures.push(`Fixture ${item.id} must not be executable.`);
    if (item.public_ready_after_fixture !== 0) failures.push(`Fixture ${item.id} must keep public-ready at 0.`);
  });

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_github_worker_runtime_manifest_negative_fixtures_ready' : 'innovation_github_worker_runtime_manifest_negative_fixtures_needs_review',
    policy: {
      negative_fixtures_only: true,
      synthetic_manifest_shapes_only: true,
      reads_private_content_now: false,
      copies_private_content_now: false,
      copies_secret_values_now: false,
      copies_worker_output_body_now: false,
      executes_runtime_now: false,
      executes_rollback_now: false,
      starts_models_now: false,
      installs_dependencies_now: false,
      downloads_models_now: false,
      writes_runtime_manifest_now: false,
      writes_runtime_outputs_now: false,
      writes_worker_outputs_now: false,
      promotes_public_ready_now: false,
      public_ready_after_fixtures: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      runtime_batch_id: reports.manifestDraft.summary?.runtime_batch_id || null,
      negative_fixtures: fixtures.length,
      expected_blocked: fixtures.filter((item) => item.expected_status === 'blocked').length,
      categories: new Set(fixtures.map((item) => item.category)).size,
      executable_now: 0,
      runtime_executed_now: 0,
      rollback_executed_now: 0,
      runtime_manifest_written_now: 0,
      runtime_outputs_written_now: 0,
      worker_outputs_written_now: 0,
      public_ready_after_fixtures: 0,
      failures: failures.length
    },
    required_categories: ['execution_state', 'missing_guard', 'raw_runtime_output', 'worker_output_body', 'private_path', 'secret', 'runtime_side_effect', 'public_ready_false_positive'],
    negative_fixtures: fixtures,
    next_actions: [
      'Use these fixtures to harden any future runtime-manifest validator before runtime adapter work starts.',
      'Keep manifest generation review-only until exact owner reply, redaction and overseer gates are green.',
      'Regenerate these fixtures after any runtime manifest schema change.'
    ],
    hard_stops: [
      'These manifest negative fixtures never execute runtime commands.',
      'These manifest negative fixtures never execute rollback commands.',
      'These manifest negative fixtures never start models, install dependencies or download models.',
      'These manifest negative fixtures never read private Source Root, OneDrive or archive-library content.',
      'These manifest negative fixtures never copy private content, secret values or worker output bodies.',
      'These manifest negative fixtures never write runtime manifests, runtime outputs or worker outputs.',
      'These manifest negative fixtures never promote public-ready state.'
    ],
    failures
  };
}

function fixture(id, category, simulated_manifest_shape, expected_block_reasons) {
  return {
    id,
    category,
    synthetic_only: true,
    executable_now: false,
    expected_status: 'blocked',
    simulated_manifest_shape,
    expected_block_reasons,
    copied_private_content_now: false,
    copied_secret_value_now: false,
    copied_worker_output_body_now: false,
    runtime_executed_now: false,
    rollback_executed_now: false,
    runtime_manifest_written_now: false,
    runtime_outputs_written_now: false,
    worker_outputs_written_now: false,
    public_ready_after_fixture: 0
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Worker Runtime Manifest Negative Fixtures');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Runtime batch ID: \`${report.summary.runtime_batch_id}\``);
  lines.push(`- Negative fixtures: ${report.summary.negative_fixtures}`);
  lines.push(`- Expected blocked: ${report.summary.expected_blocked}`);
  lines.push(`- Categories: ${report.summary.categories}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Runtime manifests written now: ${report.summary.runtime_manifest_written_now}`);
  lines.push(`- Runtime outputs written now: ${report.summary.runtime_outputs_written_now}`);
  lines.push(`- Worker outputs written now: ${report.summary.worker_outputs_written_now}`);
  lines.push(`- Public-ready after fixtures: ${report.summary.public_ready_after_fixtures}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Fixtures');
  lines.push('');
  lines.push('| Fixture | Category | Expected | Reasons |');
  lines.push('| --- | --- | --- | --- |');
  report.negative_fixtures.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${item.category} | ${item.expected_status} | ${item.expected_block_reasons.join(', ')} |`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
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
