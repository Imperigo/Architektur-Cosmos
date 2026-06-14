#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const queuePath = resolve(root, args.queue || `data/kosmo-source-independent-work-queue-${dateStamp}.json`);
const choiceMatrixPath = resolve(root, args.choiceMatrix || `data/kosmo-source-root-owner-choice-consequence-matrix-${dateStamp}.json`);
const answerSheetPath = resolve(root, args.answerSheet || `data/kosmo-owner-answer-sheet-${dateStamp}.json`);
const pilotGapPath = resolve(root, args.pilotGapLabels || `data/kosmoreferences-pilot-gap-label-review-${dateStamp}.json`);
const assetTaxonomyPath = resolve(root, args.assetTaxonomy || `data/kosmoasset-candidate-taxonomy-review-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-remaining-decision-brief-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-remaining-decision-brief-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const queue = await readJson(queuePath);
  const choiceMatrix = await readJson(choiceMatrixPath);
  const answerSheet = await readJson(answerSheetPath);
  const pilotGapLabels = await readJson(pilotGapPath);
  const assetTaxonomy = await readJson(assetTaxonomyPath);
  const report = buildReport({ queue, choiceMatrix, answerSheet, pilotGapLabels, assetTaxonomy });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner remaining decision brief');
  console.log(`Status: ${report.status}`);
  console.log(`Decision groups: ${report.summary.decision_groups}`);
  console.log(`Open owner actions: ${report.summary.open_owner_actions}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after brief: ${report.summary.public_ready_after_brief}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ queue, choiceMatrix, answerSheet, pilotGapLabels, assetTaxonomy }) {
  const failures = [];
  if (queue.status !== 'source_independent_work_queue_ready') failures.push(`Queue not ready: ${queue.status}`);
  if ((queue.summary?.codex_executable_now ?? 1) !== 0) failures.push('Source-free Codex tasks are not complete.');
  if (choiceMatrix.status !== 'source_root_owner_choice_consequence_matrix_ready') failures.push(`Choice matrix not ready: ${choiceMatrix.status}`);
  if (answerSheet.status !== 'owner_answer_sheet_ready') failures.push(`Owner answer sheet not ready: ${answerSheet.status}`);

  const sourceRootDecision = {
    id: 'source_root_choice',
    status: 'owner_action_required',
    question: 'Welche Source-Root-Option soll als naechster Zustand gelten?',
    recommended_default: 'repair_onedrive_first_or_keep_blocked_until_complete_root_is_confirmed',
    choices: (choiceMatrix.choices || []).map((choice) => ({
      id: choice.id,
      label: choice.label,
      unlocks_private_metadata_diagnostic: choice.unlocks_private_metadata_diagnostic === true,
      public_ready_after_choice: choice.public_ready_after_choice ?? 0,
      caution: choice.caution
    })),
    safe_after_answer: 'Run source-root decision checks and activation preflight before any private metadata inventory.'
  };

  const reviewBatchDecision = {
    id: 'open_review_batches',
    status: 'owner_action_required',
    question: 'Welche offenen Reference/Asset Review-Batches duerfen als naechstes bearbeitet werden?',
    recommended_default: 'keep_all_review_only_until_source_root_and_rights_gates_are_confirmed',
    open_batches: answerSheet.summary?.owner_cards ?? null,
    open_items: answerSheet.summary?.owner_card_items ?? null,
    pilot_gap_owner_decisions: pilotGapLabels.summary?.owner_decisions_required ?? null,
    asset_owner_confirmations: assetTaxonomy.summary?.owner_confirmations_required ?? null,
    safe_after_answer: 'Record answers into owner intake/session only; keep public-ready at 0.'
  };

  const decisions = [sourceRootDecision, reviewBatchDecision];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_remaining_decision_brief_ready'
      : 'owner_remaining_decision_brief_needs_review',
    policy: {
      review_only: true,
      reads_private_content: false,
      records_owner_decisions: false,
      runs_private_inventory_now: false,
      executes_local_workers: false,
      public_ready_after_brief: 0
    },
    source_refs: [
      relative(root, queuePath),
      relative(root, choiceMatrixPath),
      relative(root, answerSheetPath),
      relative(root, pilotGapPath),
      relative(root, assetTaxonomyPath)
    ],
    summary: {
      decision_groups: decisions.length,
      open_owner_actions: decisions.filter((decision) => decision.status === 'owner_action_required').length,
      source_root_choices: sourceRootDecision.choices.length,
      unlock_choices: sourceRootDecision.choices.filter((choice) => choice.unlocks_private_metadata_diagnostic).length,
      open_review_batches: reviewBatchDecision.open_batches,
      open_review_items: reviewBatchDecision.open_items,
      pilot_gap_owner_decisions: reviewBatchDecision.pilot_gap_owner_decisions,
      asset_owner_confirmations: reviewBatchDecision.asset_owner_confirmations,
      failures: failures.length,
      public_ready_after_brief: 0
    },
    decisions,
    hard_stops: [
      'Do not record an owner decision automatically.',
      'Do not run private metadata inventory from this brief.',
      'Do not read private source contents.',
      'Do not execute local workers.',
      'Keep public-ready at 0.'
    ],
    failures
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Remaining Decision Brief');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Decision groups: ${report.summary.decision_groups}`);
  lines.push(`- Open owner actions: ${report.summary.open_owner_actions}`);
  lines.push(`- Source-root choices: ${report.summary.source_root_choices}`);
  lines.push(`- Unlock choices: ${report.summary.unlock_choices}`);
  lines.push(`- Open review batches: ${report.summary.open_review_batches}`);
  lines.push(`- Open review items: ${report.summary.open_review_items}`);
  lines.push(`- Pilot-gap owner decisions: ${report.summary.pilot_gap_owner_decisions}`);
  lines.push(`- Asset owner confirmations: ${report.summary.asset_owner_confirmations}`);
  lines.push(`- Public-ready after brief: ${report.summary.public_ready_after_brief}`);
  lines.push('');
  lines.push('## Decisions');
  lines.push('');
  report.decisions.forEach((decision) => {
    lines.push(`### ${decision.id}`);
    lines.push('');
    lines.push(`- Status: ${decision.status}`);
    lines.push(`- Question: ${decision.question}`);
    lines.push(`- Recommended default: ${decision.recommended_default}`);
    lines.push(`- Safe after answer: ${decision.safe_after_answer}`);
    if (decision.choices) {
      lines.push('- Choices:');
      decision.choices.forEach((choice) => {
        lines.push(`  - \`${choice.id}\`: ${choice.label}; unlocks metadata diagnostic ${choice.unlocks_private_metadata_diagnostic ? 'yes' : 'no'}; public-ready ${choice.public_ready_after_choice}`);
      });
    }
    lines.push('');
  });
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
