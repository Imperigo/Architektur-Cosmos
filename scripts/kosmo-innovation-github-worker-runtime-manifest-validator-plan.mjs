#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  manifestDraft: resolve(root, args.manifestDraft || `data/kosmo-innovation-github-worker-runtime-batch-manifest-draft-${dateStamp}.json`),
  manifestDraftCheck: resolve(root, args.manifestDraftCheck || `data/kosmo-innovation-github-worker-runtime-batch-manifest-draft-check-${dateStamp}.json`),
  manifestNegativeFixtures: resolve(root, args.manifestNegativeFixtures || `data/kosmo-innovation-github-worker-runtime-manifest-negative-fixtures-${dateStamp}.json`),
  manifestNegativeFixturesCheck: resolve(root, args.manifestNegativeFixturesCheck || `data/kosmo-innovation-github-worker-runtime-manifest-negative-fixtures-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-manifest-validator-plan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-manifest-validator-plan-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const plan = buildPlan(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(plan));

  console.log('Kosmo innovation GitHub worker runtime manifest validator plan');
  console.log(`Status: ${plan.status}`);
  console.log(`Rules: ${plan.summary.rules}`);
  console.log(`Fixture categories: ${plan.summary.fixture_categories}`);
  console.log(`Executable now: ${plan.summary.executable_now}`);
  console.log(`Public-ready after plan: ${plan.summary.public_ready_after_plan}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (plan.failures.length > 0) process.exitCode = 1;
}

function buildPlan(reports) {
  const failures = [];
  if (reports.manifestDraft.status !== 'innovation_github_worker_runtime_batch_manifest_draft_ready') failures.push(`Manifest draft not ready: ${reports.manifestDraft.status}`);
  if (reports.manifestDraftCheck.status !== 'innovation_github_worker_runtime_batch_manifest_draft_guard_passed') failures.push(`Manifest draft check not passed: ${reports.manifestDraftCheck.status}`);
  if (reports.manifestNegativeFixtures.status !== 'innovation_github_worker_runtime_manifest_negative_fixtures_ready') failures.push(`Manifest negative fixtures not ready: ${reports.manifestNegativeFixtures.status}`);
  if (reports.manifestNegativeFixturesCheck.status !== 'innovation_github_worker_runtime_manifest_negative_fixtures_guard_passed') failures.push(`Manifest negative fixtures check not passed: ${reports.manifestNegativeFixturesCheck.status}`);

  const categories = reports.manifestNegativeFixtures.required_categories || [];
  const rules = [
    rule('block_executable_manifest', ['execution_state'], ['executable_now', 'runtime_executable_now', 'writes_runtime_manifest_now'], 'block'),
    rule('require_runtime_apply_guard', ['missing_guard'], ['runtime_apply_guard_gate', 'exact_owner_reply_gate'], 'block_if_missing'),
    rule('require_rollback_redaction_refs', ['missing_guard'], ['rollback_refs', 'redaction_refs', 'negative_log_fixture_refs'], 'block_if_empty'),
    rule('block_raw_runtime_outputs', ['raw_runtime_output'], ['raw_runtime_stdout', 'raw_runtime_stderr', 'redaction_required=false'], 'block'),
    rule('block_worker_output_body', ['worker_output_body'], ['worker_output_body', 'metadata_only=false'], 'block'),
    rule('block_private_paths', ['private_path'], ['PRIVATE_SOURCE_ROOT', 'ONEDRIVE_PRIVATE_LIBRARY'], 'block'),
    rule('block_secret_fields', ['secret'], ['OPENAI_API_KEY', 'SSH_PRIVATE_KEY', 'raw_secret'], 'block'),
    rule('block_runtime_side_effects', ['runtime_side_effect'], ['install_dependencies', 'download_models', 'start_model_runtime'], 'block'),
    rule('require_overseer_review_gate', ['missing_guard'], ['overseer_review_gate'], 'block_if_missing'),
    rule('block_public_ready_promotion', ['public_ready_false_positive'], ['public_ready=true', 'public_ready_after_manifest>0', 'rights_state=unknown'], 'block')
  ];
  const missingCategoryRules = categories.filter((category) => !rules.some((item) => item.fixture_categories.includes(category)));
  missingCategoryRules.forEach((category) => failures.push(`No validator rule covers fixture category: ${category}`));

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_manifest_validator_plan_ready'
      : 'innovation_github_worker_runtime_manifest_validator_plan_needs_review',
    policy: {
      validator_plan_only: true,
      writes_validator_code_now: false,
      executes_validator_now: false,
      executes_runtime_now: false,
      starts_models_now: false,
      installs_dependencies_now: false,
      reads_private_content_now: false,
      writes_runtime_manifest_now: false,
      writes_runtime_outputs_now: false,
      public_ready_after_plan: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      runtime_batch_id: reports.manifestDraft.summary?.runtime_batch_id || null,
      rules: rules.length,
      fixture_categories: categories.length,
      negative_fixtures: reports.manifestNegativeFixtures.summary?.negative_fixtures ?? null,
      expected_blocked: reports.manifestNegativeFixtures.summary?.expected_blocked ?? null,
      executable_now: 0,
      validator_code_written_now: 0,
      runtime_executed_now: 0,
      public_ready_after_plan: 0,
      failures: failures.length
    },
    rules,
    implementation_requirements: [
      'Validator must fail closed when any required guard reference is missing.',
      'Validator must reject runtime manifests with executable_now=true unless a later exact runtime apply gate explicitly permits a separate batch.',
      'Validator must never inspect private files; it validates manifest metadata only.',
      'Validator must redact or reject private paths, secrets, raw stdio and worker output bodies.',
      'Validator must keep public_ready false/0 for every runtime-derived artifact.'
    ],
    next_actions: [
      'Implement validator code only in a separate reviewed batch.',
      'Use this plan as the rule source for future runtime manifest validator fixtures.',
      'Keep runtime manifest validation source-free until owner/source-root gates change.'
    ],
    hard_stops: [
      'This plan never writes validator code.',
      'This plan never executes runtime commands.',
      'This plan never starts models or installs dependencies.',
      'This plan never reads private Source Root, OneDrive or archive-library content.',
      'This plan never writes runtime manifests or runtime outputs.',
      'This plan never promotes public-ready state.'
    ],
    failures
  };
}

function rule(id, fixtureCategories, fields, action) {
  return {
    id,
    fixture_categories: fixtureCategories,
    fields,
    action,
    required_before_runtime: true,
    executable_now: false,
    public_ready_after_rule: 0
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(plan) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Worker Runtime Manifest Validator Plan');
  lines.push('');
  lines.push(`Generated: ${plan.generated_at}`);
  lines.push(`Status: \`${plan.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Runtime batch ID: \`${plan.summary.runtime_batch_id}\``);
  lines.push(`- Rules: ${plan.summary.rules}`);
  lines.push(`- Fixture categories: ${plan.summary.fixture_categories}`);
  lines.push(`- Negative fixtures: ${plan.summary.negative_fixtures}`);
  lines.push(`- Expected blocked: ${plan.summary.expected_blocked}`);
  lines.push(`- Executable now: ${plan.summary.executable_now}`);
  lines.push(`- Validator code written now: ${plan.summary.validator_code_written_now}`);
  lines.push(`- Public-ready after plan: ${plan.summary.public_ready_after_plan}`);
  lines.push(`- Failures: ${plan.summary.failures}`);
  lines.push('');
  lines.push('## Rules');
  lines.push('');
  lines.push('| Rule | Categories | Action | Fields |');
  lines.push('| --- | --- | --- | --- |');
  plan.rules.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${item.fixture_categories.join(', ')} | ${item.action} | ${item.fields.join(', ')} |`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  plan.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  if (plan.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    plan.failures.forEach((failure) => lines.push(`- ${failure}`));
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
