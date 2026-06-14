#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const rubricPath = resolve(root, args.rubric || `data/kosmo-training-eval-rubric-pack-${dateStamp}.json`);
const templatePath = resolve(root, args.template || `data/kosmo-training-eval-row-template-${dateStamp}.json`);
const pilotQueuePath = resolve(root, args.pilotQueue || `data/kosmo-local-worker-pilot-task-queue-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-training-eval-review-queue-plan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-training-eval-review-queue-plan-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const rubric = await readJson(rubricPath);
  const template = await readJson(templatePath);
  const pilotQueue = await readJson(pilotQueuePath);
  const report = buildReport({ rubric, template, pilotQueue });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo training eval review queue plan');
  console.log(`Status: ${report.status}`);
  console.log(`Review lanes: ${report.summary.review_lanes}`);
  console.log(`Queue states: ${report.summary.queue_states}`);
  console.log(`Queue items created now: ${report.summary.queue_items_created_now}`);
  console.log(`Public-ready after plan: ${report.summary.public_ready_after_plan}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport({ rubric, template, pilotQueue }) {
  const failures = [];
  if (rubric.status !== 'training_eval_rubric_pack_ready') failures.push(`Rubric not ready: ${rubric.status}`);
  if (template.status !== 'training_eval_row_template_ready') failures.push(`Template not ready: ${template.status}`);
  if (pilotQueue.status !== 'local_worker_pilot_task_queue_ready_blocked') failures.push(`Pilot worker queue not ready blocked: ${pilotQueue.status}`);

  const reviewLanes = [
    lane('candidate_intake', 'Accept only structured candidate metadata, never raw private bodies.'),
    lane('source_grounding_review', 'Check source state, citation basis, uncertainty and invention risk.'),
    lane('architecture_quality_review', 'Grade architectural depth against rubric criteria.'),
    lane('rights_privacy_review', 'Confirm rights state, privacy state and public-ready false by default.'),
    lane('promotion_decision', 'Decide eval-only use, rework or rejection; no training promotion without later owner gate.')
  ];
  const queueStates = [
    state('draft_candidate', false),
    state('needs_source_grounding_review', false),
    state('needs_architecture_quality_review', false),
    state('needs_rights_privacy_review', false),
    state('approved_eval_only', false),
    state('rejected_or_rework', false)
  ];
  const roleAssignments = [
    role('local_llm_worker', 'May propose structured placeholders and classifications only; no repo writes, no private text bodies.'),
    role('central_codex_worker', 'Primary queue architect, guard author and first review pass for schema, grounding and safety.'),
    role('claude_code_worker', 'Second reviewer for implementation quality, Orbit/KosmoOverseer integration and contradiction checks.'),
    role('human_owner', 'Approves source-root unlocks, rights-sensitive decisions and any future public/training promotion.')
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'training_eval_review_queue_plan_ready'
      : 'training_eval_review_queue_plan_needs_review',
    policy: {
      plan_only: true,
      source_free: true,
      creates_queue_items_now: false,
      writes_eval_rows_now: false,
      writes_training_data_now: false,
      writes_embeddings_now: false,
      runs_fine_tuning_now: false,
      reads_private_content_now: false,
      stores_private_content: false,
      public_ready_after_plan: 0
    },
    source_refs: [
      relative(root, rubricPath),
      relative(root, templatePath),
      relative(root, pilotQueuePath)
    ],
    summary: {
      review_lanes: reviewLanes.length,
      queue_states: queueStates.length,
      role_assignments: roleAssignments.length,
      templates_from_template: template.summary?.templates ?? null,
      required_fields_from_template: template.summary?.required_fields ?? null,
      rubric_suites: rubric.summary?.suites ?? null,
      rubric_criteria: rubric.summary?.criteria ?? null,
      pilot_worker_tasks: pilotQueue.summary?.tasks ?? null,
      queue_items_created_now: 0,
      approved_eval_rows_now: 0,
      training_rows_created_now: 0,
      public_ready_after_plan: 0,
      failures: failures.length
    },
    allowed_input_classes_after_unlock: [
      'reviewed_public_safe_summary',
      'owner_approved_private_derived_summary',
      'local_worker_structured_metadata_without_body'
    ],
    forbidden_input_classes: [
      'raw_private_source_text',
      'ocr_body',
      'pdf_body',
      'private_image_bytes',
      'local_worker_prose_body',
      'unreviewed_public_ready_claim'
    ],
    review_lanes: reviewLanes,
    queue_states: queueStates,
    role_assignments: roleAssignments,
    promotion_gates: [
      'source_grounding_passed',
      'architecture_quality_passed',
      'rights_privacy_passed',
      'codex_or_claude_review_recorded',
      'owner_gate_required_before_training_or_public_release'
    ],
    hard_stops: [
      'Do not create queue items from this plan.',
      'Do not copy private source text, OCR/PDF bodies or local worker prose bodies.',
      'Do not create embeddings or fine-tunes now.',
      'Do not mark any row public_ready true.',
      'Do not train from approved_eval_only rows without a later owner-approved training gate.'
    ],
    failures
  };
}

function lane(id, rule) {
  return { id, rule, executable_now: false };
}

function state(id, publicReadyAllowed) {
  return { id, public_ready_allowed: publicReadyAllowed };
}

function role(id, responsibility) {
  return { id, responsibility };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Training Eval Review Queue Plan');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Review lanes: ${report.summary.review_lanes}`);
  lines.push(`- Queue states: ${report.summary.queue_states}`);
  lines.push(`- Role assignments: ${report.summary.role_assignments}`);
  lines.push(`- Templates from template: ${report.summary.templates_from_template}`);
  lines.push(`- Required fields from template: ${report.summary.required_fields_from_template}`);
  lines.push(`- Rubric suites: ${report.summary.rubric_suites}`);
  lines.push(`- Rubric criteria: ${report.summary.rubric_criteria}`);
  lines.push(`- Pilot worker tasks: ${report.summary.pilot_worker_tasks}`);
  lines.push(`- Queue items created now: ${report.summary.queue_items_created_now}`);
  lines.push(`- Approved eval rows now: ${report.summary.approved_eval_rows_now}`);
  lines.push(`- Training rows created now: ${report.summary.training_rows_created_now}`);
  lines.push(`- Public-ready after plan: ${report.summary.public_ready_after_plan}`);
  lines.push('');
  lines.push('## Review Lanes');
  lines.push('');
  report.review_lanes.forEach((item) => lines.push(`- \`${item.id}\`: ${item.rule}`));
  lines.push('');
  lines.push('## Role Assignments');
  lines.push('');
  report.role_assignments.forEach((item) => lines.push(`- \`${item.id}\`: ${item.responsibility}`));
  lines.push('');
  lines.push('## Promotion Gates');
  lines.push('');
  report.promotion_gates.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
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
