#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const smokePath = resolve(root, args.smoke || `data/kosmo-local-worker-innovation-output-smoke-${dateStamp}.json`);
const smokeCheckPath = resolve(root, args.smokeCheck || `data/kosmo-local-worker-innovation-output-smoke-check-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-output-adapter-plan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-output-adapter-plan-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const smoke = JSON.parse(await readFile(smokePath, 'utf8'));
  const smokeCheck = JSON.parse(await readFile(smokeCheckPath, 'utf8'));
  const report = buildReport({ smoke, smokeCheck });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation output adapter plan');
  console.log(`Status: ${report.status}`);
  console.log(`Adapters: ${report.summary.adapters}`);
  console.log(`Metadata fields: ${report.summary.metadata_capture_fields}`);
  console.log(`Body copy allowed: ${report.summary.body_copy_allowed}`);
  console.log(`Public-ready after plan: ${report.summary.public_ready_after_plan}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport({ smoke, smokeCheck }) {
  const failures = [];
  if (smoke.status !== 'local_worker_innovation_output_smoke_ready') failures.push(`Smoke not ready: ${smoke.status}`);
  if (smokeCheck.status !== 'local_worker_innovation_output_smoke_guard_passed') failures.push(`Smoke guard not passed: ${smokeCheck.status}`);
  const outputs = smoke.expected_outputs || [];
  const adapters = outputs.map((output) => ({
    adapter_id: `adapter-${output.task_id}`,
    task_id: output.task_id,
    lane: output.lane,
    expected_output_path: output.output_path,
    training_eval_lane: output.training_eval_lane,
    ontology_entities: output.ontology_bindings?.entities || [],
    ontology_relations: output.ontology_bindings?.relations || [],
    allowed_read_mode: 'json_schema_and_metadata_only',
    may_parse_json: true,
    may_store_body_excerpt_in_git: false,
    may_store_worker_recommendations_in_git: false,
    may_store_policy_flags_in_git: true,
    may_store_counts_and_presence_in_git: true,
    repo_conversion_allowed_now: false,
    public_ready_after_adapter: 0,
    required_metadata_capture: [
      'exists',
      'bytes',
      'json_valid',
      'schema_version_present',
      'required_fields_present_count',
      'required_fields_missing',
      'policy_flags_match',
      'training_eval_lane_match',
      'ontology_bindings_match',
      'forbidden_terms_hit_count',
      'public_ready_flag_present'
    ],
    required_validation_steps: [
      'stat expected output path',
      'parse JSON only if file exists and path is under worker_packets',
      'validate required top-level fields from smoke contract',
      'validate policy booleans remain false for private, GitHub copy, repo conversion, training and public-ready',
      'record only counts, booleans, ids and missing-field names',
      'discard worker recommendation text before writing repo report'
    ],
    hard_stops: [
      'do_not_copy_output_body',
      'do_not_store_recommendation_text',
      'do_not_promote_training_rows',
      'do_not_convert_to_repo_artifact',
      'do_not_mark_public_ready'
    ]
  }));

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_output_adapter_plan_ready'
      : 'local_worker_innovation_output_adapter_plan_needs_review',
    policy: {
      review_only: true,
      adapter_plan_only: true,
      reads_private_content_now: false,
      reads_worker_output_bodies_now: false,
      future_parser_body_copy_allowed: false,
      stores_worker_body_in_git: false,
      stores_worker_recommendations_in_git: false,
      stores_metadata_only: true,
      executes_local_workers: false,
      starts_models: false,
      writes_repo_derivatives_now: false,
      public_ready_after_plan: 0
    },
    source_refs: [
      relative(root, smokePath),
      relative(root, smokeCheckPath)
    ],
    summary: {
      adapters: adapters.length,
      source_smoke_expected_outputs: smoke.summary?.expected_outputs ?? null,
      smoke_guard_failures: smokeCheck.summary?.failures ?? null,
      lanes: countUnique(adapters.map((adapter) => adapter.lane)),
      training_lanes: countUnique(adapters.map((adapter) => adapter.training_eval_lane)),
      metadata_capture_fields: countUnique(adapters.flatMap((adapter) => adapter.required_metadata_capture)),
      body_copy_allowed: false,
      repo_conversion_allowed_now: 0,
      public_ready_after_plan: 0,
      failures: failures.length
    },
    adapters,
    next_actions: [
      'Implement a future metadata-only validator only after an actual local-worker fixture run exists.',
      'Validator output may store booleans, counts, ids and missing-field lists, but not worker body text.',
      'Keep Output Contract Review and human/overseer review before any repo conversion.',
      'Keep Source Root and private content blocked until exact owner unlock is present.'
    ],
    failures
  };
}

function countUnique(values) {
  return new Set(values.filter(Boolean)).size;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Output Adapter Plan');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Adapters: ${report.summary.adapters}`);
  lines.push(`- Source smoke expected outputs: ${report.summary.source_smoke_expected_outputs}`);
  lines.push(`- Smoke guard failures: ${report.summary.smoke_guard_failures}`);
  lines.push(`- Lanes: ${report.summary.lanes}`);
  lines.push(`- Training lanes: ${report.summary.training_lanes}`);
  lines.push(`- Metadata capture fields: ${report.summary.metadata_capture_fields}`);
  lines.push(`- Body copy allowed: ${report.summary.body_copy_allowed ? 'yes' : 'no'}`);
  lines.push(`- Repo conversion allowed now: ${report.summary.repo_conversion_allowed_now}`);
  lines.push(`- Public-ready after plan: ${report.summary.public_ready_after_plan}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Adapters');
  lines.push('');
  lines.push('| Adapter | Lane | Training lane | Read mode | Body to Git |');
  lines.push('| --- | --- | --- | --- | --- |');
  report.adapters.forEach((adapter) => {
    lines.push(`| \`${adapter.adapter_id}\` | ${adapter.lane} | ${adapter.training_eval_lane} | ${adapter.allowed_read_mode} | ${adapter.may_store_body_excerpt_in_git ? 'yes' : 'no'} |`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
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
