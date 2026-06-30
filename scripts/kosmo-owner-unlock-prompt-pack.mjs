#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const rollupPath = resolve(root, args.rollup || `data/kosmo-evening-batch-rollup-${dateStamp}.json`);
const ownerBriefPath = resolve(root, args.ownerBrief || `data/kosmo-owner-remaining-decision-brief-${dateStamp}.json`);
const executionChecklistPath = resolve(root, args.executionChecklist || `data/kosmo-source-root-owner-answer-execution-checklist-${dateStamp}.json`);
const intakeTemplatePath = resolve(root, args.intakeTemplate || `examples/kosmo-references/provenance/owner-answer-intake-template-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-prompt-pack-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-prompt-pack-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const rollup = await readJsonOptional(rollupPath, {
    status: 'kosmo_evening_batch_rollup_bootstrap_missing',
    summary: {},
    bootstrap_missing: true
  });
  const ownerBrief = await readJson(ownerBriefPath);
  const executionChecklist = await readJson(executionChecklistPath);
  const intakeTemplate = await readJson(intakeTemplatePath);
  const report = buildReport({ rollup, ownerBrief, executionChecklist, intakeTemplate });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner unlock prompt pack');
  console.log(`Status: ${report.status}`);
  console.log(`Prompt questions: ${report.summary.prompt_questions}`);
  console.log(`Source-root choices: ${report.summary.source_root_choices}`);
  console.log(`Review batches: ${report.summary.review_batches}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after pack: ${report.summary.public_ready_after_pack}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ rollup, ownerBrief, executionChecklist, intakeTemplate }) {
  const failures = [];
  const rollupAccepted = [
    'kosmo_evening_batch_rollup_ready',
    'kosmo_evening_batch_rollup_needs_review',
    'kosmo_evening_batch_rollup_bootstrap_missing'
  ].includes(rollup.status);
  const ownerBriefAccepted = [
    'owner_remaining_decision_brief_ready',
    'owner_remaining_decision_brief_needs_review'
  ].includes(ownerBrief.status);
  if (!rollupAccepted) failures.push(`Rollup not in a guarded bootstrap state: ${rollup.status}`);
  if (!ownerBriefAccepted) failures.push(`Owner brief not in a guarded review state: ${ownerBrief.status}`);
  if (executionChecklist.status !== 'source_root_owner_answer_execution_checklist_ready') failures.push(`Execution checklist not ready: ${executionChecklist.status}`);
  if (intakeTemplate.status !== 'owner_answer_intake_template_pending_owner_input') failures.push(`Intake template not pending owner input: ${intakeTemplate.status}`);

  const sourceRootQuestion = {
    id: 'source_root_choice',
    question: 'Welche Source-Root-Antwort soll ich als naechstes explizit erfassen?',
    required: true,
    allowed_answers: (executionChecklist.branches || []).map((branch) => ({
      answer: branch.id,
      label: branch.label,
      selected_decision_for_intake: branch.selected_decision,
      selected_root_path_for_intake: branch.selected_root_path,
      unlocks_metadata_inventory_after_guards: branch.unlocks_private_metadata_diagnostic === true,
      public_ready_after_answer: 0,
      caution: branch.caution
    })),
    safe_default: 'repair_onedrive_first_or_keep_blocked',
    exact_text_owner_can_reply: 'source_root_choice=<keep_blocked|repair_onedrive_first|select_exact_root_1>; confirmed_exact_root=<yes|no>; note=<optional>'
  };

  const reviewBatchQuestion = {
    id: 'review_batch_scope',
    question: 'Welche Review-Batches sollen als naechstes vorbereitet werden?',
    required: false,
    allowed_answers: (intakeTemplate.owner_card_answers || []).map((card) => ({
      batch_id: card.batch_id,
      label: card.label,
      choices: card.allowed_choices,
      safe_default: card.safe_default,
      items: card.items,
      public_ready_after_card: 0
    })),
    safe_default: 'keep_all_review_only',
    exact_text_owner_can_reply: 'review_batches=<none|batch-a|batch-b|batch-c|batch-d|batch-e|all_review_only>; batch_notes=<optional>'
  };

  const promptBlocks = [
    {
      id: 'short_owner_reply',
      title: 'Kurzantwort fuer Andrin',
      lines: [
        'source_root_choice=...',
        'confirmed_exact_root=...',
        'review_batches=...',
        'note=...'
      ]
    },
    {
      id: 'safe_default_reply',
      title: 'Sichere Default-Antwort',
      lines: [
        'source_root_choice=repair_onedrive_first',
        'confirmed_exact_root=no',
        'review_batches=none',
        'note=Quelle bleibt blockiert, bis die vollstaendige private Architekturquelle bestaetigt ist.'
      ]
    },
    {
      id: 'unlock_reply_only_if_true',
      title: 'Unlock-Antwort nur bei exakter Bestaetigung',
      lines: [
        'source_root_choice=select_exact_root_1',
        'confirmed_exact_root=yes',
        'review_batches=all_review_only',
        'note=/mnt/archiv/ArchitekturKosmos/Assets ist die vollstaendige private Architekturquelle fuer den naechsten Metadata-Diagnostic-Lauf.'
      ]
    }
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'owner_unlock_prompt_pack_ready' : 'owner_unlock_prompt_pack_needs_review',
    policy: {
      prompt_only: true,
      records_decisions: false,
      mutates_intake_template: false,
      executes_commands: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      writes_public_files: false,
      public_ready_after_pack: 0
    },
    source_refs: [
      relative(root, rollupPath),
      relative(root, ownerBriefPath),
      relative(root, executionChecklistPath),
      relative(root, intakeTemplatePath)
    ],
    summary: {
      prompt_questions: 2,
      rollup_status: rollup.status,
      rollup_bootstrap_missing: rollup.bootstrap_missing === true,
      source_root_choices: sourceRootQuestion.allowed_answers.length,
      unlock_choices: sourceRootQuestion.allowed_answers.filter((answer) => answer.unlocks_metadata_inventory_after_guards).length,
      review_batches: reviewBatchQuestion.allowed_answers.length,
      review_items: reviewBatchQuestion.allowed_answers.reduce((sum, item) => sum + (item.items || 0), 0),
      failures: failures.length,
      public_ready_after_pack: 0
    },
    questions: [sourceRootQuestion, reviewBatchQuestion],
    prompt_blocks: promptBlocks,
    after_owner_reply_pipeline: [
      'Copy only explicit owner answers into the owner answer intake template.',
      'Run owner answer intake check and session edit plan.',
      'Run source-root decision session check and activation preflight.',
      'Only after guards pass, follow the matching owner answer execution branch.'
    ],
    hard_stops: [
      'Do not infer missing owner answers.',
      'Do not auto-fill intake/session files from this prompt pack.',
      'Do not run commands from the selected branch until the explicit answer is recorded.',
      'Do not run private inventory unless the unlock branch is explicitly confirmed and guards pass.',
      'Do not read, OCR, embed, train on or copy private source contents.',
      'Keep public-ready at 0.'
    ],
    failures
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonOptional(path, fallback) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return fallback;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Prompt Pack');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Kurzantwort');
  lines.push('');
  report.prompt_blocks[0].lines.forEach((line) => lines.push(`- \`${line}\``));
  lines.push('');
  lines.push('## Sichere Default-Antwort');
  lines.push('');
  report.prompt_blocks[1].lines.forEach((line) => lines.push(`- \`${line}\``));
  lines.push('');
  lines.push('## Unlock Nur Wenn Wirklich Korrekt');
  lines.push('');
  report.prompt_blocks[2].lines.forEach((line) => lines.push(`- \`${line}\``));
  lines.push('');
  lines.push('## Fragen');
  lines.push('');
  report.questions.forEach((question) => {
    lines.push(`### ${question.id}`);
    lines.push('');
    lines.push(`- Required: ${question.required ? 'yes' : 'no'}`);
    lines.push(`- Question: ${question.question}`);
    lines.push(`- Safe default: ${question.safe_default}`);
    lines.push(`- Reply format: \`${question.exact_text_owner_can_reply}\``);
    lines.push('');
  });
  lines.push('## After Owner Reply Pipeline');
  lines.push('');
  report.after_owner_reply_pipeline.forEach((item) => lines.push(`- ${item}`));
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
