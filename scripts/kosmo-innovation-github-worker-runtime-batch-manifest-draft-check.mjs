#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const manifestPath = resolve(root, args.manifest || `data/kosmo-innovation-github-worker-runtime-batch-manifest-draft-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-worker-runtime-batch-manifest-draft-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-worker-runtime-batch-manifest-draft-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const checks = buildChecks(manifest);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_worker_runtime_batch_manifest_draft_guard_passed'
      : 'innovation_github_worker_runtime_batch_manifest_draft_guard_failed',
    policy: {
      validates_manifest_draft_only: true,
      executes_runtime_now: false,
      writes_runtime_outputs_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, manifestPath)],
    summary: {
      manifest_status: manifest.status,
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      runtime_batch_id: manifest.summary?.runtime_batch_id || null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub worker runtime batch manifest draft check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Batch ID: ${report.summary.runtime_batch_id}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(manifest) {
  const hardStops = (manifest.hard_stops || []).join(' ').toLowerCase();
  const prerequisiteIds = new Set((manifest.prerequisites || []).map((item) => item.id));
  const phaseIds = new Set((manifest.phases || []).map((item) => item.id));
  const outputIds = new Set((manifest.expected_outputs || []).map((item) => item.id));
  const gateIds = new Set((manifest.review_gates || []).map((item) => item.id));
  return [
    check('status_ready', manifest.status === 'innovation_github_worker_runtime_batch_manifest_draft_ready', manifest.status),
    check('policy_manifest_draft_only', manifest.policy?.manifest_draft_only === true, manifest.policy?.manifest_draft_only),
    check('policy_no_runtime_rollback', manifest.policy?.executes_runtime_now === false && manifest.policy?.executes_rollback_now === false, JSON.stringify(manifest.policy)),
    check('policy_no_models_install', manifest.policy?.starts_models_now === false && manifest.policy?.installs_dependencies_now === false, JSON.stringify(manifest.policy)),
    check('policy_no_private_reads', manifest.policy?.reads_private_content_now === false, manifest.policy?.reads_private_content_now),
    check('policy_no_outputs', manifest.policy?.writes_runtime_outputs_now === false && manifest.policy?.writes_worker_outputs_now === false && manifest.policy?.writes_runtime_manifest_now === false, JSON.stringify(manifest.policy)),
    check('public_ready_zero', manifest.policy?.public_ready_after_manifest === 0 && manifest.summary?.public_ready_after_manifest === 0, manifest.summary?.public_ready_after_manifest),
    check('batch_id_present', String(manifest.summary?.runtime_batch_id || '').startsWith('github-worker-runtime-batch-draft-'), manifest.summary?.runtime_batch_id),
    check('executable_false', manifest.summary?.executable_now === false, manifest.summary?.executable_now),
    check('writes_manifest_false', manifest.summary?.writes_runtime_manifest_now === false, manifest.summary?.writes_runtime_manifest_now),
    check('prerequisites_present', ['readiness_plan_guard_passed', 'rollback_redaction_guard_passed', 'log_redaction_negative_fixtures_passed', 'exact_owner_runtime_reply_valid', 'runtime_readiness_executable', 'source_root_or_source_free_scope_confirmed', 'pre_runtime_overseer_review_required'].every((id) => prerequisiteIds.has(id)), [...prerequisiteIds].join(',')),
    check('blocked_prerequisites_expected', manifest.summary?.blocked_prerequisites >= 3, manifest.summary?.blocked_prerequisites),
    check('phases_present', ['preflight_guard_refresh', 'runtime_environment_snapshot', 'source_free_worker_invocation', 'post_output_validator_gate', 'rollback_ready_checkpoint', 'overseer_handoff_review'].every((id) => phaseIds.has(id)), [...phaseIds].join(',')),
    check('phases_not_executable', (manifest.phases || []).every((item) => item.executable_now === false && item.review_only === true), 'phases not executable'),
    check('expected_outputs_present', ['runtime_batch_manifest_redacted', 'runtime_metadata_log_redacted', 'worker_output_metadata_only', 'post_output_validator_report', 'rollback_manifest_redacted', 'overseer_review_handoff'].every((id) => outputIds.has(id)), [...outputIds].join(',')),
    check('expected_outputs_not_written', (manifest.expected_outputs || []).every((item) => item.written_now === false && item.review_only === true && item.redaction_required === true), 'outputs not written'),
    check('review_gates_present', ['exact_owner_reply_gate', 'source_root_or_source_free_gate', 'runtime_apply_guard_gate', 'log_redaction_gate', 'rollback_gate', 'overseer_review_gate', 'public_ready_gate'].every((id) => gateIds.has(id)), [...gateIds].join(',')),
    check('review_gates_open_expected', manifest.summary?.open_review_gates >= 4, manifest.summary?.open_review_gates),
    check('rollback_refs_present', (manifest.rollback_refs || []).length >= 5, (manifest.rollback_refs || []).length),
    check('redaction_refs_present', (manifest.redaction_refs || []).length >= 5, (manifest.redaction_refs || []).length),
    check('negative_log_refs_present', (manifest.negative_log_fixture_refs || []).length >= 10, (manifest.negative_log_fixture_refs || []).length),
    check('source_refs_cover_inputs', (manifest.source_refs || []).some((ref) => ref.includes('runtime-batch-readiness-plan')) && (manifest.source_refs || []).some((ref) => ref.includes('runtime-apply-guard')) && (manifest.source_refs || []).some((ref) => ref.includes('log-redaction-negative-fixtures')), (manifest.source_refs || []).join(',')),
    check('hard_stop_no_runtime', hardStops.includes('never executes runtime'), hardStops),
    check('hard_stop_no_models_workers', hardStops.includes('never starts models') && hardStops.includes('local workers'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_no_outputs', hardStops.includes('runtime manifests') && hardStops.includes('worker outputs'), hardStops),
    check('hard_stop_no_public', hardStops.includes('public-ready'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Worker Runtime Batch Manifest Draft Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Manifest status: ${report.summary.manifest_status}`);
  lines.push(`- Batch ID: \`${report.summary.runtime_batch_id}\``);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((checkItem) => {
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${String(checkItem.evidence ?? '-')}`);
  });
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
