#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  readinessPlan: resolve(root, args.readinessPlan || `data/kosmo-innovation-github-worker-runtime-batch-readiness-plan-${dateStamp}.json`),
  readinessPlanCheck: resolve(root, args.readinessPlanCheck || `data/kosmo-innovation-github-worker-runtime-batch-readiness-plan-check-${dateStamp}.json`),
  negativeFixtures: resolve(root, args.negativeFixtures || `data/kosmo-innovation-github-worker-adapter-boundary-negative-fixtures-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-rollback-redaction-fixtures-${dateStamp}.md`);

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

  console.log('Kosmo innovation GitHub worker runtime rollback redaction fixtures');
  console.log(`Status: ${report.status}`);
  console.log(`Fixture groups: ${report.summary.fixture_groups}`);
  console.log(`Redaction rules: ${report.summary.redaction_rules}`);
  console.log(`Rollback steps: ${report.summary.rollback_steps}`);
  console.log(`Runtime executed now: ${report.summary.runtime_executed_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport(reports) {
  const failures = [];
  if (reports.readinessPlan.status !== 'innovation_github_worker_runtime_batch_readiness_plan_ready') {
    failures.push(`Runtime readiness plan not ready: ${reports.readinessPlan.status}`);
  }
  if (reports.readinessPlanCheck.status !== 'innovation_github_worker_runtime_batch_readiness_plan_guard_passed') {
    failures.push(`Runtime readiness plan check not passed: ${reports.readinessPlanCheck.status}`);
  }
  if (reports.negativeFixtures.status !== 'innovation_github_worker_adapter_boundary_negative_fixtures_ready') {
    failures.push(`Negative fixtures not ready: ${reports.negativeFixtures.status}`);
  }

  const redactionRules = [
    rule('private_path_redaction', ['<PRIVATE_SOURCE_ROOT>', '<ONEDRIVE_PRIVATE_LIBRARY>', '<ARCHIVE_LIBRARY>'], 'Replace private path-like values with stable placeholders.'),
    rule('secret_token_redaction', ['<API_TOKEN>', '<SSH_KEY>', '<ENV_SECRET>'], 'Replace token-like and key-like values before any handoff or Git write.'),
    rule('worker_output_body_redaction', ['<WORKER_OUTPUT_BODY_REDACTED>'], 'Keep worker output bodies out of Git and expose metadata counts only.'),
    rule('github_source_text_redaction', ['<GITHUB_CODE_OR_README_REDACTED>'], 'Do not copy GitHub code or README prose into runtime logs.'),
    rule('model_prompt_redaction', ['<PRIVATE_PROMPT_CONTEXT_REDACTED>'], 'Redact prompts if they include private project or source-root context.')
  ];

  const rollbackSteps = [
    rollback('stop_runtime_processes', 'Stop model/server/worker processes started by the separate runtime batch.'),
    rollback('remove_generated_runtime_outputs', 'Remove generated runtime outputs from the runtime output root, leaving only redacted metadata logs.'),
    rollback('restore_pre_runtime_config', 'Restore config snapshots captured before runtime start.'),
    rollback('invalidate_unreviewed_worker_outputs', 'Mark worker outputs invalid until overseer review passes.'),
    rollback('rerun_readiness_without_execution', 'Rerun readiness, negative fixtures and log-redaction checks after rollback.')
  ];

  const fixtureGroups = [
    {
      id: 'redacted_log_shape_fixture',
      purpose: 'Define safe runtime log shape before any runtime exists.',
      required_fields: ['event_id', 'runtime_batch_id', 'status', 'redacted_paths_count', 'redacted_secrets_count', 'public_ready'],
      forbidden_fields: ['raw_private_path', 'raw_secret', 'worker_output_body', 'github_code_excerpt', 'readme_prose_excerpt'],
      public_ready_after_fixture: 0
    },
    {
      id: 'rollback_manifest_shape_fixture',
      purpose: 'Define reversible runtime-batch manifest shape.',
      required_fields: ['runtime_batch_id', 'pre_state_snapshot_id', 'created_outputs', 'stop_commands_reviewed', 'rollback_status'],
      forbidden_fields: ['destructive_command_unreviewed', 'private_source_body', 'secret_value'],
      public_ready_after_fixture: 0
    },
    {
      id: 'post_rollback_evidence_fixture',
      purpose: 'Define evidence expected after rollback without keeping private/runtime payloads.',
      required_fields: ['runtime_batch_id', 'outputs_removed_count', 'configs_restored', 'redaction_check_passed', 'overseer_review_required'],
      forbidden_fields: ['raw_runtime_stdout', 'raw_runtime_stderr', 'private_input_excerpt'],
      public_ready_after_fixture: 0
    }
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_rollback_redaction_fixtures_ready'
      : 'innovation_github_worker_runtime_rollback_redaction_fixtures_needs_review',
    policy: {
      fixture_plan_only: true,
      synthetic_metadata_only: true,
      executes_runtime_now: false,
      executes_rollback_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      writes_runtime_outputs_now: false,
      writes_worker_outputs_now: false,
      copies_secret_values_now: false,
      copies_worker_output_body_now: false,
      copies_github_code_or_readme_now: false,
      public_ready_after_fixtures: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      selected_fixture_id: reports.readinessPlan.summary?.selected_fixture_id || null,
      fixture_groups: fixtureGroups.length,
      redaction_rules: redactionRules.length,
      rollback_steps: rollbackSteps.length,
      forbidden_fields_total: fixtureGroups.reduce((sum, group) => sum + group.forbidden_fields.length, 0),
      runtime_executed_now: 0,
      rollback_executed_now: 0,
      runtime_outputs_written_now: 0,
      worker_outputs_written_now: 0,
      public_ready_after_fixtures: 0,
      failures: failures.length
    },
    fixture_groups: fixtureGroups,
    redaction_rules: redactionRules,
    rollback_steps: rollbackSteps,
    required_before_runtime_unblock: [
      'redacted_log_shape_fixture_check_passed',
      'rollback_manifest_shape_fixture_check_passed',
      'post_rollback_evidence_fixture_check_passed',
      'runtime_batch_readiness_plan_still_guard_passed',
      'negative_fixtures_still_guard_passed',
      'separate_runtime_apply_guard_passed'
    ],
    hard_stops: [
      'These fixtures never execute runtime or rollback commands.',
      'These fixtures never start models or local workers.',
      'These fixtures never read private Source Root, OneDrive or archive-library content.',
      'These fixtures never write runtime outputs or worker outputs.',
      'These fixtures never copy secret values, worker output bodies, GitHub code or README text.',
      'These fixtures never promote public-ready state.'
    ],
    failures
  };
}

function rule(id, placeholders, description) {
  return { id, placeholders, description, required_now: true };
}

function rollback(id, description) {
  return { id, description, executable_now: false, requires_overseer_review: true };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Worker Runtime Rollback Redaction Fixtures');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Selected fixture: \`${report.summary.selected_fixture_id}\``);
  lines.push(`- Fixture groups: ${report.summary.fixture_groups}`);
  lines.push(`- Redaction rules: ${report.summary.redaction_rules}`);
  lines.push(`- Rollback steps: ${report.summary.rollback_steps}`);
  lines.push(`- Runtime executed now: ${report.summary.runtime_executed_now}`);
  lines.push(`- Rollback executed now: ${report.summary.rollback_executed_now}`);
  lines.push(`- Public-ready after fixtures: ${report.summary.public_ready_after_fixtures}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Fixture Groups');
  lines.push('');
  report.fixture_groups.forEach((group) => {
    lines.push(`- \`${group.id}\`: ${group.purpose}`);
  });
  lines.push('');
  lines.push('## Rollback Steps');
  lines.push('');
  report.rollback_steps.forEach((step) => {
    lines.push(`- \`${step.id}\`: ${step.description}`);
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
