#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const planPath = resolve(root, args.plan || `data/kosmo-training-eval-review-queue-plan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-training-eval-review-queue-plan-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-training-eval-review-queue-plan-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const plan = await readJson(planPath);
  const checks = buildChecks(plan);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'training_eval_review_queue_plan_guard_passed'
      : 'training_eval_review_queue_plan_guard_failed',
    policy: {
      validates_plan_only: true,
      creates_queue_items_now: false,
      writes_eval_rows_now: false,
      writes_training_data_now: false,
      writes_embeddings_now: false,
      reads_private_content_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, planPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      warnings: 0,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo training eval review queue plan check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(plan) {
  const hardStops = (plan.hard_stops || []).join(' ').toLowerCase();
  const roles = (plan.role_assignments || []).map((item) => item.id);
  const gates = (plan.promotion_gates || []).join(' ').toLowerCase();
  const forbidden = (plan.forbidden_input_classes || []).join(' ').toLowerCase();
  const allowed = (plan.allowed_input_classes_after_unlock || []).join(' ').toLowerCase();

  return [
    check('status_ready', plan.status === 'training_eval_review_queue_plan_ready', plan.status),
    check('policy_plan_only', plan.policy?.plan_only === true, plan.policy?.plan_only),
    check('policy_source_free', plan.policy?.source_free === true, plan.policy?.source_free),
    check('policy_no_queue_items_now', plan.policy?.creates_queue_items_now === false, plan.policy?.creates_queue_items_now),
    check('policy_no_eval_rows_now', plan.policy?.writes_eval_rows_now === false, plan.policy?.writes_eval_rows_now),
    check('policy_no_training_now', plan.policy?.writes_training_data_now === false, plan.policy?.writes_training_data_now),
    check('policy_no_embeddings_now', plan.policy?.writes_embeddings_now === false, plan.policy?.writes_embeddings_now),
    check('policy_no_fine_tuning_now', plan.policy?.runs_fine_tuning_now === false, plan.policy?.runs_fine_tuning_now),
    check('policy_no_private_reads', plan.policy?.reads_private_content_now === false, plan.policy?.reads_private_content_now),
    check('policy_no_private_storage', plan.policy?.stores_private_content === false, plan.policy?.stores_private_content),
    check('public_ready_zero', plan.summary?.public_ready_after_plan === 0, plan.summary?.public_ready_after_plan),
    check('five_review_lanes', plan.summary?.review_lanes === 5, plan.summary?.review_lanes),
    check('six_queue_states', plan.summary?.queue_states === 6, plan.summary?.queue_states),
    check('four_role_assignments', plan.summary?.role_assignments === 4, plan.summary?.role_assignments),
    check('templates_six', plan.summary?.templates_from_template === 6, plan.summary?.templates_from_template),
    check('required_fields_ten', plan.summary?.required_fields_from_template === 10, plan.summary?.required_fields_from_template),
    check('rubric_suites_six', plan.summary?.rubric_suites === 6, plan.summary?.rubric_suites),
    check('rubric_criteria_twenty_four', plan.summary?.rubric_criteria === 24, plan.summary?.rubric_criteria),
    check('pilot_worker_tasks_twelve', plan.summary?.pilot_worker_tasks === 12, plan.summary?.pilot_worker_tasks),
    check('queue_items_zero', plan.summary?.queue_items_created_now === 0, plan.summary?.queue_items_created_now),
    check('approved_eval_rows_zero', plan.summary?.approved_eval_rows_now === 0, plan.summary?.approved_eval_rows_now),
    check('training_rows_zero', plan.summary?.training_rows_created_now === 0, plan.summary?.training_rows_created_now),
    check('all_queue_states_public_ready_false', (plan.queue_states || []).every((item) => item.public_ready_allowed === false), (plan.queue_states || []).filter((item) => item.public_ready_allowed !== false).map((item) => item.id).join(',')),
    check('roles_cover_workers_and_owner', ['local_llm_worker', 'central_codex_worker', 'claude_code_worker', 'human_owner'].every((role) => roles.includes(role)), roles.join(',')),
    check('promotion_gates_cover_source_rights_owner', gates.includes('source_grounding') && gates.includes('rights_privacy') && gates.includes('owner_gate'), gates),
    check('allowed_inputs_are_summary_or_metadata_only', allowed.includes('summary') && allowed.includes('metadata') && !allowed.includes('raw_private'), allowed),
    check('forbidden_inputs_block_raw_bodies', forbidden.includes('raw_private_source_text') && forbidden.includes('ocr_body') && forbidden.includes('pdf_body') && forbidden.includes('local_worker_prose_body'), forbidden),
    check('hard_stop_no_queue_items', hardStops.includes('do not create queue items'), hardStops),
    check('hard_stop_no_private_bodies', hardStops.includes('private source text') && hardStops.includes('ocr/pdf bodies') && hardStops.includes('local worker prose bodies'), hardStops),
    check('hard_stop_no_embedding_finetune', hardStops.includes('embeddings') && hardStops.includes('fine-tunes'), hardStops),
    check('hard_stop_public_ready_false', hardStops.includes('public_ready true'), hardStops),
    check('hard_stop_no_training_without_owner_gate', hardStops.includes('without a later owner-approved training gate'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Training Eval Review Queue Plan Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
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
