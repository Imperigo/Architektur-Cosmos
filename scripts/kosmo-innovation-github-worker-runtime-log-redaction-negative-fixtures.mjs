#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  rollbackRedactionFixtures: resolve(root, args.rollbackRedactionFixtures || `data/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-${dateStamp}.json`),
  rollbackRedactionFixturesCheck: resolve(root, args.rollbackRedactionFixturesCheck || `data/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-check-${dateStamp}.json`),
  runtimeApplyGuard: resolve(root, args.runtimeApplyGuard || `data/kosmo-innovation-github-worker-runtime-apply-guard-${dateStamp}.json`),
  runtimeApplyGuardCheck: resolve(root, args.runtimeApplyGuardCheck || `data/kosmo-innovation-github-worker-runtime-apply-guard-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-log-redaction-negative-fixtures-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-log-redaction-negative-fixtures-${dateStamp}.md`);

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

  console.log('Kosmo innovation GitHub worker runtime log redaction negative fixtures');
  console.log(`Status: ${report.status}`);
  console.log(`Negative fixtures: ${report.summary.negative_fixtures}`);
  console.log(`Expected blocked: ${report.summary.expected_blocked}`);
  console.log(`Leak categories: ${report.summary.leak_categories}`);
  console.log(`Runtime executed now: ${report.summary.runtime_executed_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport(reports) {
  const failures = [];
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

  const fixtures = [
    negativeFixture({
      id: 'raw_private_source_path_in_log',
      leak_category: 'private_path',
      simulated_log_shape: {
        event_id: 'synthetic-runtime-log-001',
        raw_private_path: '<PRIVATE_SOURCE_ROOT>/books/protected-plan.pdf',
        redacted_paths_count: 0
      },
      expected_block_reasons: ['raw_private_path_present', 'redacted_paths_count_zero']
    }),
    negativeFixture({
      id: 'raw_onedrive_library_path_in_log',
      leak_category: 'private_path',
      simulated_log_shape: {
        event_id: 'synthetic-runtime-log-002',
        raw_private_path: '<ONEDRIVE_PRIVATE_LIBRARY>/11 AI Workflow/source.pdf',
        private_library_marker: true
      },
      expected_block_reasons: ['raw_onedrive_path_present', 'private_library_marker_true']
    }),
    negativeFixture({
      id: 'secret_token_value_in_log',
      leak_category: 'secret',
      simulated_log_shape: {
        event_id: 'synthetic-runtime-log-003',
        raw_secret: '<API_TOKEN>',
        redacted_secrets_count: 0
      },
      expected_block_reasons: ['raw_secret_present', 'redacted_secrets_count_zero']
    }),
    negativeFixture({
      id: 'ssh_key_material_in_log',
      leak_category: 'secret',
      simulated_log_shape: {
        event_id: 'synthetic-runtime-log-004',
        raw_secret: '<SSH_KEY>',
        secret_kind: 'ssh_private_key'
      },
      expected_block_reasons: ['raw_secret_present', 'ssh_private_key_marker_present']
    }),
    negativeFixture({
      id: 'worker_output_body_in_log',
      leak_category: 'worker_output_body',
      simulated_log_shape: {
        event_id: 'synthetic-runtime-log-005',
        worker_output_body: '<WORKER_OUTPUT_BODY_REDACTED>',
        metadata_only: false
      },
      expected_block_reasons: ['worker_output_body_present', 'metadata_only_false']
    }),
    negativeFixture({
      id: 'github_code_excerpt_in_log',
      leak_category: 'github_source_text',
      simulated_log_shape: {
        event_id: 'synthetic-runtime-log-006',
        github_code_excerpt: '<GITHUB_CODE_OR_README_REDACTED>',
        source_repo_reference_only: false
      },
      expected_block_reasons: ['github_code_excerpt_present', 'source_repo_reference_only_false']
    }),
    negativeFixture({
      id: 'readme_prose_excerpt_in_log',
      leak_category: 'github_source_text',
      simulated_log_shape: {
        event_id: 'synthetic-runtime-log-007',
        readme_prose_excerpt: '<GITHUB_CODE_OR_README_REDACTED>',
        copied_readme_text_now: true
      },
      expected_block_reasons: ['readme_prose_excerpt_present', 'copied_readme_text_now_true']
    }),
    negativeFixture({
      id: 'private_prompt_context_in_log',
      leak_category: 'private_prompt_context',
      simulated_log_shape: {
        event_id: 'synthetic-runtime-log-008',
        private_prompt_context: '<PRIVATE_PROMPT_CONTEXT_REDACTED>',
        prompt_redaction_applied: false
      },
      expected_block_reasons: ['private_prompt_context_present', 'prompt_redaction_missing']
    }),
    negativeFixture({
      id: 'raw_runtime_stdout_stderr_in_log',
      leak_category: 'runtime_stdio',
      simulated_log_shape: {
        event_id: 'synthetic-runtime-log-009',
        raw_runtime_stdout: 'synthetic unredacted stdout payload',
        raw_runtime_stderr: 'synthetic unredacted stderr payload'
      },
      expected_block_reasons: ['raw_runtime_stdout_present', 'raw_runtime_stderr_present']
    }),
    negativeFixture({
      id: 'public_ready_from_unreviewed_runtime_log',
      leak_category: 'public_ready_false_positive',
      simulated_log_shape: {
        event_id: 'synthetic-runtime-log-010',
        public_ready: true,
        overseer_review_required: false,
        rights_state: 'unknown'
      },
      expected_block_reasons: ['public_ready_true', 'overseer_review_required_false', 'rights_state_unknown']
    })
  ];

  const leakCategories = new Set(fixtures.map((fixture) => fixture.leak_category));
  fixtures.forEach((fixture) => {
    if (fixture.expected_status !== 'blocked') failures.push(`Fixture ${fixture.id} must expect blocked status.`);
    if (!fixture.synthetic_only) failures.push(`Fixture ${fixture.id} must be synthetic only.`);
    if (fixture.executed_now !== false) failures.push(`Fixture ${fixture.id} must not execute.`);
    if (fixture.public_ready_after_fixture !== 0) failures.push(`Fixture ${fixture.id} must keep public-ready at 0.`);
  });

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_log_redaction_negative_fixtures_ready'
      : 'innovation_github_worker_runtime_log_redaction_negative_fixtures_needs_review',
    policy: {
      negative_fixtures_only: true,
      synthetic_log_shapes_only: true,
      reads_private_content_now: false,
      copies_private_content_now: false,
      copies_secret_values_now: false,
      copies_worker_output_body_now: false,
      copies_github_code_or_readme_now: false,
      executes_runtime_now: false,
      executes_rollback_now: false,
      starts_models_now: false,
      writes_runtime_outputs_now: false,
      writes_worker_outputs_now: false,
      promotes_public_ready_now: false,
      public_ready_after_fixtures: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      selected_fixture_id: reports.rollbackRedactionFixtures.summary?.selected_fixture_id || null,
      negative_fixtures: fixtures.length,
      expected_blocked: fixtures.filter((fixture) => fixture.expected_status === 'blocked').length,
      leak_categories: leakCategories.size,
      runtime_executed_now: 0,
      rollback_executed_now: 0,
      runtime_outputs_written_now: 0,
      worker_outputs_written_now: 0,
      public_ready_after_fixtures: 0,
      failures: failures.length
    },
    required_leak_categories: [
      'private_path',
      'secret',
      'worker_output_body',
      'github_source_text',
      'private_prompt_context',
      'runtime_stdio',
      'public_ready_false_positive'
    ],
    negative_fixtures: fixtures,
    next_actions: [
      'Use these cases to harden future runtime log validators before any local worker runtime exists.',
      'Keep all payloads synthetic and metadata-only.',
      'Do not convert these negative fixtures into runtime execution without a separate apply guard.'
    ],
    hard_stops: [
      'These negative fixtures never read private Source Root, OneDrive or archive-library content.',
      'These negative fixtures never copy private content, secret values, worker output bodies, GitHub code or README text.',
      'These negative fixtures never execute runtime or rollback commands.',
      'These negative fixtures never start models or local workers.',
      'These negative fixtures never write runtime outputs or worker outputs.',
      'These negative fixtures never promote public-ready state.'
    ],
    failures
  };
}

function negativeFixture({ id, leak_category, simulated_log_shape, expected_block_reasons }) {
  return {
    id,
    leak_category,
    synthetic_only: true,
    copied_private_content_now: false,
    copied_secret_value_now: false,
    copied_worker_output_body_now: false,
    copied_github_code_or_readme_now: false,
    executed_now: false,
    expected_status: 'blocked',
    simulated_log_shape,
    expected_block_reasons,
    public_ready_after_fixture: 0
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Worker Runtime Log Redaction Negative Fixtures');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Selected fixture: \`${report.summary.selected_fixture_id}\``);
  lines.push(`- Negative fixtures: ${report.summary.negative_fixtures}`);
  lines.push(`- Expected blocked: ${report.summary.expected_blocked}`);
  lines.push(`- Leak categories: ${report.summary.leak_categories}`);
  lines.push(`- Runtime executed now: ${report.summary.runtime_executed_now}`);
  lines.push(`- Runtime outputs written now: ${report.summary.runtime_outputs_written_now}`);
  lines.push(`- Public-ready after fixtures: ${report.summary.public_ready_after_fixtures}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Negative Fixtures');
  lines.push('');
  report.negative_fixtures.forEach((fixture) => {
    lines.push(`- \`${fixture.id}\`: ${fixture.leak_category}, expected ${fixture.expected_status}, reasons ${fixture.expected_block_reasons.join(', ')}`);
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
