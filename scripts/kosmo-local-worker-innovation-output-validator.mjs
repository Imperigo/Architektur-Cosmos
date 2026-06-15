#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const adapterPlanPath = resolve(root, args.adapterPlan || `data/kosmo-local-worker-innovation-output-adapter-plan-${dateStamp}.json`);
const adapterPlanCheckPath = resolve(root, args.adapterPlanCheck || `data/kosmo-local-worker-innovation-output-adapter-plan-check-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-output-validator-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-output-validator-${dateStamp}.md`);

const requiredFields = [
  'schema_version',
  'generated_at',
  'task_id',
  'review_status',
  'lane',
  'source_repo_reference_only',
  'used_input_refs',
  'metadata_improvement_suggestions',
  'blockers',
  'training_eval',
  'ontology_review',
  'policy'
];

const forbiddenPatterns = [
  /public_ready\s*[:=]\s*(true|yes|ja)/i,
  /repo_conversion_allowed_now\s*[:=]\s*true/i,
  /training_promoted\s*[:=]\s*true/i,
  /private_content_allowed\s*[:=]\s*true/i,
  /copied_github_code\s*[:=]\s*true/i,
  /cloned_repo\s*[:=]\s*true/i,
  /model_started\s*[:=]\s*true/i
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const adapterPlan = JSON.parse(await readFile(adapterPlanPath, 'utf8'));
  const adapterPlanCheck = JSON.parse(await readFile(adapterPlanCheckPath, 'utf8'));
  const report = await buildReport({ adapterPlan, adapterPlanCheck });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation output validator');
  console.log(`Status: ${report.status}`);
  console.log(`Expected outputs: ${report.summary.expected_outputs}`);
  console.log(`Present outputs: ${report.summary.present_outputs}`);
  console.log(`Parsed outputs: ${report.summary.parsed_outputs}`);
  console.log(`Missing outputs: ${report.summary.missing_outputs}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after validation: ${report.summary.public_ready_after_validation}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function buildReport({ adapterPlan, adapterPlanCheck }) {
  const failures = [];
  if (adapterPlan.status !== 'local_worker_innovation_output_adapter_plan_ready') {
    failures.push(`Adapter plan not ready: ${adapterPlan.status}`);
  }
  if (adapterPlanCheck.status !== 'local_worker_innovation_output_adapter_plan_guard_passed') {
    failures.push(`Adapter plan guard not passed: ${adapterPlanCheck.status}`);
  }

  const adapters = adapterPlan.adapters || [];
  const files = [];
  for (const adapter of adapters) files.push(await validateAdapterOutput(adapter));

  const present = files.filter((file) => file.status === 'present');
  const invalid = files.filter((file) => file.json_valid === false);
  const policyMismatches = files.filter((file) => file.policy_flags_match === false);
  const trainingMismatches = files.filter((file) => file.training_eval_lane_match === false);
  const ontologyMismatches = files.filter((file) => file.ontology_bindings_match === false);
  const forbiddenHits = files.reduce((total, file) => total + file.forbidden_terms_hit_count, 0);

  if (invalid.length > 0) failures.push(`${invalid.length} present worker outputs are invalid JSON.`);
  if (policyMismatches.length > 0) failures.push(`${policyMismatches.length} worker outputs have policy mismatches.`);
  if (trainingMismatches.length > 0) failures.push(`${trainingMismatches.length} worker outputs have training lane mismatches.`);
  if (ontologyMismatches.length > 0) failures.push(`${ontologyMismatches.length} worker outputs have ontology binding mismatches.`);
  if (forbiddenHits > 0) failures.push(`${forbiddenHits} forbidden term hits detected.`);

  const status = failures.length > 0
    ? 'local_worker_innovation_output_validator_needs_review'
    : present.length === adapters.length
      ? 'local_worker_innovation_output_validator_passed'
      : 'local_worker_innovation_output_validator_waiting_for_outputs';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status,
    policy: {
      review_only: true,
      metadata_only: true,
      reads_private_sources: false,
      executes_local_workers: false,
      starts_models: false,
      stores_worker_output_body_in_git: false,
      stores_worker_recommendations_in_git: false,
      stores_allowed_metadata_only: true,
      writes_repo_derivatives: false,
      repo_conversion_allowed_now: 0,
      training_rows_promoted: 0,
      public_ready_after_validation: 0,
      note: 'This validator writes only file presence, JSON validity, missing field names, counts, booleans and ids. It never writes worker output bodies or recommendation text.'
    },
    source_refs: [
      relative(root, adapterPlanPath),
      relative(root, adapterPlanCheckPath)
    ],
    summary: {
      adapters: adapters.length,
      expected_outputs: adapters.length,
      present_outputs: present.length,
      parsed_outputs: files.filter((file) => file.json_valid === true).length,
      missing_outputs: files.filter((file) => file.status === 'missing').length,
      invalid_json_outputs: invalid.length,
      required_fields_missing_total: files.reduce((total, file) => total + file.required_fields_missing.length, 0),
      policy_mismatches: policyMismatches.length,
      training_lane_mismatches: trainingMismatches.length,
      ontology_binding_mismatches: ontologyMismatches.length,
      forbidden_terms_hit_count: forbiddenHits,
      body_copy_allowed: false,
      repo_conversion_allowed_now: 0,
      training_rows_promoted: 0,
      public_ready_after_validation: 0,
      failures: failures.length
    },
    files,
    hard_stops: [
      'Do not copy worker output bodies into Git.',
      'Do not copy local-worker recommendation text into Git.',
      'Do not execute local workers from this validator.',
      'Do not promote training rows from validator output.',
      'Do not convert worker output into repo artifacts.',
      'Do not mark public-ready.'
    ],
    next_actions: nextActions({ present, adapters, failures }),
    failures
  };
}

async function validateAdapterOutput(adapter) {
  const path = adapter.expected_output_path;
  const base = {
    adapter_id: adapter.adapter_id,
    task_id: adapter.task_id,
    lane: adapter.lane,
    training_eval_lane: adapter.training_eval_lane,
    output_path: path,
    output_path_under_worker_packets: String(path || '').includes('/KosmoZentrale/worker_packets/'),
    stores_body: false,
    stores_recommendation_text: false,
    repo_conversion_allowed_now: false,
    public_ready_after_file: 0
  };

  if (!base.output_path_under_worker_packets || !existsSync(path)) {
    return {
      ...base,
      status: existsSync(path) ? 'blocked_path_outside_worker_packets' : 'missing',
      bytes: 0,
      json_valid: null,
      schema_version_present: false,
      required_fields_present_count: 0,
      required_fields_missing: requiredFields,
      policy_flags_match: null,
      training_eval_lane_match: null,
      ontology_bindings_match: null,
      forbidden_terms_hit_count: 0,
      public_ready_flag_present: false
    };
  }

  const info = await stat(path);
  const text = await readFile(path, 'utf8');
  const forbiddenTermsHitCount = forbiddenPatterns.filter((pattern) => pattern.test(text)).length;
  const parsed = parseJson(text);
  if (!parsed.ok) {
    return {
      ...base,
      status: 'present',
      bytes: info.size,
      json_valid: false,
      schema_version_present: false,
      required_fields_present_count: 0,
      required_fields_missing: requiredFields,
      policy_flags_match: false,
      training_eval_lane_match: false,
      ontology_bindings_match: false,
      forbidden_terms_hit_count: forbiddenTermsHitCount,
      public_ready_flag_present: /public_ready/i.test(text)
    };
  }

  const value = parsed.value;
  const missingFields = requiredFields.filter((field) => !Object.hasOwn(value, field));
  return {
    ...base,
    status: 'present',
    bytes: info.size,
    json_valid: true,
    schema_version_present: typeof value.schema_version === 'string',
    required_fields_present_count: requiredFields.length - missingFields.length,
    required_fields_missing: missingFields,
    policy_flags_match: policyFlagsMatch(value.policy || {}),
    training_eval_lane_match: trainingEvalLaneMatch(value.training_eval, adapter.training_eval_lane),
    ontology_bindings_match: ontologyBindingsMatch(value.ontology_review, adapter),
    forbidden_terms_hit_count: forbiddenTermsHitCount,
    public_ready_flag_present: Boolean(value.policy?.public_ready)
  };
}

function policyFlagsMatch(policy) {
  return policy.review_only === true &&
    policy.source_free_fixture_only === true &&
    policy.reads_private_content === false &&
    policy.copies_private_content === false &&
    policy.copied_github_code === false &&
    policy.copied_github_readme_text === false &&
    policy.cloned_or_executed_repo === false &&
    policy.starts_models === false &&
    policy.writes_repo_outputs === false &&
    policy.writes_cloud_outputs === false &&
    policy.promotes_training_rows === false &&
    policy.public_ready === false;
}

function trainingEvalLaneMatch(trainingEval, expectedLane) {
  return trainingEval?.training_eval_lane === expectedLane ||
    trainingEval?.lane === expectedLane;
}

function ontologyBindingsMatch(ontologyReview, adapter) {
  const entities = new Set(ontologyReview?.entities || ontologyReview?.ontology_entities || []);
  const relations = new Set(ontologyReview?.relations || ontologyReview?.ontology_relations || []);
  return (adapter.ontology_entities || []).every((entity) => entities.has(entity)) &&
    (adapter.ontology_relations || []).every((relation) => relations.has(relation));
}

function parseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
}

function nextActions({ present, adapters, failures }) {
  if (failures.length > 0) {
    return [
      'Review validator failures with Codex/Claude before any further use.',
      'Do not copy worker output bodies into repo artifacts.',
      'Keep repo conversion and public-ready blocked.'
    ];
  }
  if (present.length < adapters.length) {
    return [
      'Waiting for source-free local-worker fixture outputs under KosmoZentrale worker_packets.',
      'When outputs exist, rerun this validator and its guard.',
      'Keep local-worker execution controlled by the existing task pack and output smoke.'
    ];
  }
  return [
    'Run Output Contract Review before any repo conversion discussion.',
    'Human/overseer review remains required before training or public use.',
    'Keep public-ready at 0.'
  ];
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Innovation Output Validator');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Expected outputs: ${report.summary.expected_outputs}`);
  lines.push(`- Present outputs: ${report.summary.present_outputs}`);
  lines.push(`- Parsed outputs: ${report.summary.parsed_outputs}`);
  lines.push(`- Missing outputs: ${report.summary.missing_outputs}`);
  lines.push(`- Invalid JSON outputs: ${report.summary.invalid_json_outputs}`);
  lines.push(`- Required fields missing total: ${report.summary.required_fields_missing_total}`);
  lines.push(`- Policy mismatches: ${report.summary.policy_mismatches}`);
  lines.push(`- Training lane mismatches: ${report.summary.training_lane_mismatches}`);
  lines.push(`- Ontology binding mismatches: ${report.summary.ontology_binding_mismatches}`);
  lines.push(`- Forbidden term hits: ${report.summary.forbidden_terms_hit_count}`);
  lines.push(`- Body copy allowed: ${report.summary.body_copy_allowed ? 'yes' : 'no'}`);
  lines.push(`- Repo conversion allowed now: ${report.summary.repo_conversion_allowed_now}`);
  lines.push(`- Public-ready after validation: ${report.summary.public_ready_after_validation}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Files');
  lines.push('');
  lines.push('| Task | Status | Bytes | JSON | Missing fields | Policy | Training | Ontology |');
  lines.push('| --- | --- | ---: | --- | ---: | --- | --- | --- |');
  report.files.forEach((file) => {
    lines.push(`| \`${file.task_id}\` | ${file.status} | ${file.bytes} | ${formatNullable(file.json_valid)} | ${file.required_fields_missing.length} | ${formatNullable(file.policy_flags_match)} | ${formatNullable(file.training_eval_lane_match)} | ${formatNullable(file.ontology_bindings_match)} |`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
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

function formatNullable(value) {
  if (value === null || value === undefined) return '-';
  return value ? 'yes' : 'no';
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
