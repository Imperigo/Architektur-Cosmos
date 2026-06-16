#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  validatorPlan: resolve(root, args.validatorPlan || `data/kosmo-innovation-github-worker-runtime-manifest-validator-plan-${dateStamp}.json`),
  validatorPlanCheck: resolve(root, args.validatorPlanCheck || `data/kosmo-innovation-github-worker-runtime-manifest-validator-plan-check-${dateStamp}.json`),
  manifestDraft: resolve(root, args.manifestDraft || `data/kosmo-innovation-github-worker-runtime-batch-manifest-draft-${dateStamp}.json`),
  manifestDraftCheck: resolve(root, args.manifestDraftCheck || `data/kosmo-innovation-github-worker-runtime-batch-manifest-draft-check-${dateStamp}.json`),
  manifestNegativeFixtures: resolve(root, args.manifestNegativeFixtures || `data/kosmo-innovation-github-worker-runtime-manifest-negative-fixtures-${dateStamp}.json`),
  manifestNegativeFixturesCheck: resolve(root, args.manifestNegativeFixturesCheck || `data/kosmo-innovation-github-worker-runtime-manifest-negative-fixtures-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-manifest-validator-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-manifest-validator-${dateStamp}.md`);

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

  console.log('Kosmo innovation GitHub worker runtime manifest validator');
  console.log(`Status: ${report.status}`);
  console.log(`Validated manifests: ${report.summary.validated_manifests}`);
  console.log(`Blocked manifests: ${report.summary.blocked_manifests}`);
  console.log(`Review-only valid manifests: ${report.summary.review_only_valid_manifests}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after validation: ${report.summary.public_ready_after_validation}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport(reports) {
  const failures = [];
  requireStatus(failures, reports.validatorPlan, [
    'innovation_github_worker_runtime_manifest_validator_plan_ready',
    'innovation_github_worker_runtime_manifest_validator_plan_needs_review'
  ], 'Validator plan');
  requireStatus(failures, reports.validatorPlanCheck, 'innovation_github_worker_runtime_manifest_validator_plan_guard_passed', 'Validator plan check');
  requireStatus(failures, reports.manifestDraft, [
    'innovation_github_worker_runtime_batch_manifest_draft_ready',
    'innovation_github_worker_runtime_batch_manifest_draft_needs_review'
  ], 'Manifest draft');
  requireStatus(failures, reports.manifestDraftCheck, 'innovation_github_worker_runtime_batch_manifest_draft_guard_passed', 'Manifest draft check');
  requireStatus(failures, reports.manifestNegativeFixtures, [
    'innovation_github_worker_runtime_manifest_negative_fixtures_ready',
    'innovation_github_worker_runtime_manifest_negative_fixtures_needs_review'
  ], 'Manifest negative fixtures');
  requireStatus(failures, reports.manifestNegativeFixturesCheck, 'innovation_github_worker_runtime_manifest_negative_fixtures_guard_passed', 'Manifest negative fixtures check');

  const ruleIds = new Set((reports.validatorPlan.rules || []).map((rule) => rule.id));
  for (const requiredRule of requiredRuleIds()) {
    if (!ruleIds.has(requiredRule)) failures.push(`Missing validator rule: ${requiredRule}`);
  }

  const validations = [];
  validations.push(validateManifestShape({
    id: reports.manifestDraft.summary?.runtime_batch_id || 'runtime_batch_manifest_draft',
    source_kind: 'manifest_draft',
    shape: normalizeManifestDraft(reports.manifestDraft),
    expected_status: 'blocked'
  }));

  for (const fixture of reports.manifestNegativeFixtures.negative_fixtures || []) {
    validations.push(validateManifestShape({
      id: fixture.id,
      source_kind: 'negative_fixture',
      shape: fixture.simulated_manifest_shape || {},
      expected_status: fixture.expected_status
    }));
  }

  validations.push(validateManifestShape({
    id: 'synthetic_review_only_safe_manifest',
    source_kind: 'positive_control',
    shape: buildPositiveControlShape(),
    expected_status: 'review_only_valid'
  }));

  for (const validation of validations) {
    if (validation.status !== validation.expected_status) {
      failures.push(`Manifest ${validation.id} expected ${validation.expected_status}, got ${validation.status}.`);
    }
    if (validation.runtime_executed_now !== false) failures.push(`Manifest ${validation.id} must not execute runtime.`);
    if (validation.public_ready_after_validation !== 0) failures.push(`Manifest ${validation.id} must keep public-ready at 0.`);
  }

  const blocked = validations.filter((validation) => validation.status === 'blocked');
  const reviewOnlyValid = validations.filter((validation) => validation.status === 'review_only_valid');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_manifest_validator_passed'
      : 'innovation_github_worker_runtime_manifest_validator_failed',
    policy: {
      static_metadata_validator_only: true,
      validates_manifest_metadata_only: true,
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
      public_ready_after_validation: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      rules: reports.validatorPlan.summary?.rules ?? null,
      validated_manifests: validations.length,
      manifest_draft_validated: 1,
      negative_fixtures_validated: (reports.manifestNegativeFixtures.negative_fixtures || []).length,
      positive_controls_validated: 1,
      blocked_manifests: blocked.length,
      review_only_valid_manifests: reviewOnlyValid.length,
      executable_manifests_after_validation: 0,
      runtime_executed_now: 0,
      runtime_manifest_written_now: 0,
      runtime_outputs_written_now: 0,
      worker_outputs_written_now: 0,
      public_ready_after_validation: 0,
      failures: failures.length
    },
    validations,
    hard_stops: [
      'Validator reads JSON metadata reports only.',
      'Validator never reads private Source Root, OneDrive or archive-library files.',
      'Validator never copies private content, secret values or worker output bodies.',
      'Validator never executes runtime commands, rollback commands, model starts, installs or downloads.',
      'Validator never writes runtime manifests, runtime outputs or worker outputs.',
      'Validator never promotes public-ready state.'
    ],
    next_actions: [
      'Wire this validator into the visible Today/Tomorrow/Orbit flow after Claude/KosmoOverseer review.',
      'Keep every future runtime manifest blocked until exact owner gate and overseer review are present.',
      'Extend positive controls only with synthetic, non-executable metadata shapes.'
    ],
    failures
  };
}

function validateManifestShape({ id, source_kind, shape, expected_status }) {
  const reasons = new Set();
  const gates = collectGateStates(shape);
  const expectedOutputs = Array.isArray(shape.expected_outputs) ? shape.expected_outputs : [];
  const phases = Array.isArray(shape.phases) ? shape.phases : [];
  const inputRefs = Array.isArray(shape.input_refs) ? shape.input_refs : [];
  const envKeys = shape.env && typeof shape.env === 'object' ? Object.keys(shape.env) : [];

  if (shape.executable_now === true || shape.runtime_executable_now === true || shape.writes_runtime_manifest_now === true) {
    reasons.add('block_executable_manifest');
  }
  if (gates.get('runtime_apply_guard_gate') !== true || includesValue(shape.missing_prerequisite_ids, 'runtime_apply_guard_gate')) {
    reasons.add('require_runtime_apply_guard');
  }
  if (!hasNonEmptyArray(shape.rollback_refs) || !hasNonEmptyArray(shape.redaction_refs) || !hasNonEmptyArray(shape.negative_log_fixture_refs)) {
    reasons.add('require_rollback_redaction_refs');
  }
  if (expectedOutputs.some((output) => /raw_runtime_std(out|err)/.test(String(output.id)) && (output.written_now === true || output.redaction_required === false))) {
    reasons.add('block_raw_runtime_outputs');
  }
  if (expectedOutputs.some((output) => output.id === 'worker_output_body' || output.metadata_only === false)) {
    reasons.add('block_worker_output_body');
  }
  if (inputRefs.some((ref) => /PRIVATE_SOURCE_ROOT|ONEDRIVE_PRIVATE_LIBRARY|\/books\/|protected-plan\.pdf/i.test(String(ref)))) {
    reasons.add('block_private_paths');
  }
  if (envKeys.some((key) => /OPENAI_API_KEY|SSH_PRIVATE_KEY|TOKEN|SECRET/i.test(key)) || shape.raw_secret) {
    reasons.add('block_secret_fields');
  }
  if (phases.some((phase) => ['install_dependencies', 'download_models', 'start_model_runtime'].includes(phase.id) && phase.executable_now === true)) {
    reasons.add('block_runtime_side_effects');
  }
  if (gates.get('overseer_review_gate') !== true) {
    reasons.add('require_overseer_review_gate');
  }
  if (shape.public_ready === true || Number(shape.public_ready_after_manifest || 0) > 0 || shape.rights_state === 'unknown') {
    reasons.add('block_public_ready_promotion');
  }

  const blockReasons = [...reasons];
  return {
    id,
    source_kind,
    expected_status,
    status: blockReasons.length > 0 ? 'blocked' : 'review_only_valid',
    block_reasons: blockReasons,
    reason_count: blockReasons.length,
    runtime_executed_now: false,
    rollback_executed_now: false,
    runtime_manifest_written_now: false,
    runtime_outputs_written_now: false,
    worker_outputs_written_now: false,
    public_ready_after_validation: 0
  };
}

function normalizeManifestDraft(draft) {
  return {
    executable_now: draft.summary?.executable_now === true,
    runtime_executable_now: draft.summary?.runtime_executable_now_from_readiness === true,
    writes_runtime_manifest_now: draft.summary?.writes_runtime_manifest_now === true,
    missing_prerequisite_ids: (draft.prerequisites || []).filter((item) => item.ready !== true).map((item) => item.id),
    rollback_refs: draft.rollback_refs || [],
    redaction_refs: draft.redaction_refs || [],
    negative_log_fixture_refs: draft.negative_log_fixture_refs || [],
    expected_outputs: draft.expected_outputs || [],
    review_gates: draft.review_gates || [],
    phases: draft.phases || [],
    input_refs: draft.source_refs || [],
    public_ready: false,
    public_ready_after_manifest: draft.summary?.public_ready_after_manifest ?? 0,
    rights_state: 'review_only'
  };
}

function buildPositiveControlShape() {
  return {
    executable_now: false,
    runtime_executable_now: false,
    writes_runtime_manifest_now: false,
    missing_prerequisite_ids: [],
    rollback_refs: ['synthetic_rollback_ref'],
    redaction_refs: ['synthetic_redaction_ref'],
    negative_log_fixture_refs: ['synthetic_log_fixture_ref'],
    expected_outputs: [
      { id: 'runtime_metadata_log_redacted', written_now: false, redaction_required: true },
      { id: 'worker_output_metadata_only', written_now: false, metadata_only: true }
    ],
    review_gates: [
      { id: 'runtime_apply_guard_gate', passed: true },
      { id: 'overseer_review_gate', passed: true },
      { id: 'public_ready_gate', passed: false }
    ],
    phases: [
      { id: 'preflight_guard_refresh', executable_now: false },
      { id: 'post_output_validator_gate', executable_now: false }
    ],
    input_refs: ['synthetic/source-free/fixture.json'],
    public_ready: false,
    public_ready_after_manifest: 0,
    rights_state: 'review_only'
  };
}

function collectGateStates(shape) {
  const gates = new Map();
  for (const gate of shape.review_gates || []) gates.set(gate.id, gate.passed === true);
  for (const id of shape.prerequisite_ids || []) {
    if (!gates.has(id)) gates.set(id, true);
  }
  return gates;
}

function requireStatus(failures, report, expected, label) {
  const expectedStatuses = Array.isArray(expected) ? expected : [expected];
  if (!expectedStatuses.includes(report?.status)) failures.push(`${label} not ready: ${report?.status || 'missing'}`);
}

function requiredRuleIds() {
  return [
    'block_executable_manifest',
    'require_runtime_apply_guard',
    'require_rollback_redaction_refs',
    'block_raw_runtime_outputs',
    'block_worker_output_body',
    'block_private_paths',
    'block_secret_fields',
    'block_runtime_side_effects',
    'require_overseer_review_gate',
    'block_public_ready_promotion'
  ];
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function includesValue(value, needle) {
  return Array.isArray(value) && value.includes(needle);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Worker Runtime Manifest Validator');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Rules: ${report.summary.rules}`);
  lines.push(`- Validated manifests: ${report.summary.validated_manifests}`);
  lines.push(`- Manifest draft validated: ${report.summary.manifest_draft_validated}`);
  lines.push(`- Negative fixtures validated: ${report.summary.negative_fixtures_validated}`);
  lines.push(`- Positive controls validated: ${report.summary.positive_controls_validated}`);
  lines.push(`- Blocked manifests: ${report.summary.blocked_manifests}`);
  lines.push(`- Review-only valid manifests: ${report.summary.review_only_valid_manifests}`);
  lines.push(`- Runtime executed now: ${report.summary.runtime_executed_now}`);
  lines.push(`- Public-ready after validation: ${report.summary.public_ready_after_validation}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Validations');
  lines.push('');
  lines.push('| Manifest | Kind | Status | Reasons |');
  lines.push('| --- | --- | --- | --- |');
  report.validations.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${item.source_kind} | ${item.status} | ${item.block_reasons.join(', ') || '-'} |`);
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
