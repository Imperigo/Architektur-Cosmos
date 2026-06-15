#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const previewPath = resolve(root, args.preview || `data/kosmo-local-worker-innovation-conversion-plan-preview-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-conversion-plan-preview-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-conversion-plan-preview-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const preview = JSON.parse(await readFile(previewPath, 'utf8'));
  const checks = buildChecks(preview);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_conversion_plan_preview_guard_passed'
      : 'local_worker_innovation_conversion_plan_preview_guard_failed',
    policy: {
      validates_preview_only: true,
      executes_conversions_now: false,
      reads_private_content_now: false,
      writes_repo_derivatives_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, previewPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      preview_status: preview.status,
      mode: preview.summary?.mode || null,
      eligible_candidates: preview.summary?.eligible_candidates ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation conversion plan preview check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Mode: ${report.summary.mode}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(preview) {
  const allowedModes = new Set([
    'waiting_for_positive_review_decisions',
    'preview_waiting_for_separate_apply_guard'
  ]);
  const items = preview.conversion_plan_items || [];
  const hardStops = (preview.hard_stops || []).join(' ').toLowerCase();
  const exactReply = String(preview.exact_reply_template_for_future_apply || '');
  return [
    check('status_ready', preview.status === 'local_worker_innovation_conversion_plan_preview_ready', preview.status),
    check('mode_guarded', allowedModes.has(preview.summary?.mode), preview.summary?.mode),
    check('policy_preview_only', preview.policy?.preview_only === true, preview.policy?.preview_only),
    check('policy_no_apply_now', preview.policy?.applies_decisions_now === false, preview.policy?.applies_decisions_now),
    check('policy_no_conversion_now', preview.policy?.executes_conversions_now === false, preview.policy?.executes_conversions_now),
    check('policy_no_private_reads', preview.policy?.reads_private_sources_now === false, preview.policy?.reads_private_sources_now),
    check('policy_no_worker_execution', preview.policy?.executes_local_workers_now === false, preview.policy?.executes_local_workers_now),
    check('policy_no_model_start', preview.policy?.starts_models_now === false, preview.policy?.starts_models_now),
    check('policy_no_body_copy', preview.policy?.copies_worker_output_body_now === false && preview.policy?.copies_worker_recommendation_text_now === false, JSON.stringify(preview.policy)),
    check('policy_no_repo_derivatives', preview.policy?.writes_repo_derivatives_now === false, preview.policy?.writes_repo_derivatives_now),
    check('policy_no_training', preview.policy?.promotes_training_rows_now === false, preview.policy?.promotes_training_rows_now),
    check('public_ready_zero', preview.policy?.public_ready_after_preview === 0 && preview.summary?.public_ready_after_preview === 0, preview.summary?.public_ready_after_preview),
    check('conversions_zero', preview.summary?.conversions_executed_now === 0 && items.every((item) => item.conversion_executed_now === false), preview.summary?.conversions_executed_now),
    check('repo_outputs_zero', preview.summary?.repo_outputs_written_now === 0 && items.every((item) => item.repo_output_written_now === false), preview.summary?.repo_outputs_written_now),
    check('training_zero', preview.summary?.training_rows_promoted_now === 0 && items.every((item) => item.training_row_promoted_now === false), preview.summary?.training_rows_promoted_now),
    check('body_copy_zero', preview.summary?.worker_output_bodies_copied_now === 0 && preview.summary?.worker_recommendation_text_copied_now === 0, JSON.stringify(preview.summary)),
    check('items_public_ready_zero', items.every((item) => item.public_ready_after_plan_item === 0), items.length),
    check('eligible_count_matches_items', preview.summary?.eligible_candidates === items.length && preview.summary?.conversion_steps_planned === items.length, `${items.length}/${preview.summary?.eligible_candidates}`),
    check('allowed_future_apply_decisions', (preview.allowed_future_apply_decisions || []).includes('approve_separate_conversion_apply_later'), (preview.allowed_future_apply_decisions || []).join(', ')),
    check('exact_reply_has_candidate', exactReply.includes('candidate_task_id=<task_id>'), exactReply),
    check('exact_reply_has_human_overseer', exactReply.includes('confirmed_human_overseer_decision=yes'), exactReply),
    check('exact_reply_has_validator', exactReply.includes('confirmed_validator_guard_passed=yes'), exactReply),
    check('exact_reply_has_no_private', exactReply.includes('confirmed_no_private_content=yes'), exactReply),
    check('exact_reply_has_no_body_copy', exactReply.includes('confirmed_no_worker_body_copy=yes'), exactReply),
    check('exact_reply_has_public_false', exactReply.includes('confirmed_public_ready_false=yes'), exactReply),
    check('hard_stop_no_conversion', hardStops.includes('never executes conversions'), hardStops),
    check('hard_stop_no_repo_derivatives', hardStops.includes('never writes repo derivatives'), hardStops),
    check('hard_stop_no_body_copy', hardStops.includes('never copies worker output bodies'), hardStops),
    check('hard_stop_no_training_public', hardStops.includes('training rows') && hardStops.includes('public-ready'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops)
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
  lines.push('# Kosmo Local Worker Innovation Conversion Plan Preview Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Preview status: ${report.summary.preview_status}`);
  lines.push(`- Mode: ${report.summary.mode}`);
  lines.push(`- Eligible candidates: ${report.summary.eligible_candidates}`);
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
    if (index + 1 < argv.length && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
