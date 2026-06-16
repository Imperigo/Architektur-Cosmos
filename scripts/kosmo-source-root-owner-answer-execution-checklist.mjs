#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const choiceMatrixPath = resolve(root, args.choiceMatrix || `data/kosmo-source-root-owner-choice-consequence-matrix-${dateStamp}.json`);
const readinessPackPath = resolve(root, args.readinessPack || `data/kosmo-post-source-root-metadata-readiness-pack-${dateStamp}.json`);
const ownerBriefPath = resolve(root, args.ownerBrief || `data/kosmo-owner-remaining-decision-brief-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-source-root-owner-answer-execution-checklist-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-owner-answer-execution-checklist-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const choiceMatrix = await readJson(choiceMatrixPath);
  const readinessPack = await readJson(readinessPackPath);
  const ownerBrief = await readJson(ownerBriefPath);
  const report = buildReport({ choiceMatrix, readinessPack, ownerBrief });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo source-root owner answer execution checklist');
  console.log(`Status: ${report.status}`);
  console.log(`Branches: ${report.summary.branches}`);
  console.log(`Unlock branches: ${report.summary.unlock_branches}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after checklist: ${report.summary.public_ready_after_checklist}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ choiceMatrix, readinessPack, ownerBrief }) {
  const failures = [];
  const sourceRootChoiceSatisfied = choiceMatrix.status === 'source_root_owner_choice_consequence_matrix_satisfied_metadata_only';
  const choiceMatrixAccepted = [
    'source_root_owner_choice_consequence_matrix_ready',
    'source_root_owner_choice_consequence_matrix_satisfied_metadata_only'
  ].includes(choiceMatrix.status);
  if (!choiceMatrixAccepted) failures.push(`Choice matrix not ready: ${choiceMatrix.status}`);
  if (readinessPack.status !== 'post_source_root_metadata_readiness_pack_ready') failures.push(`Readiness pack not ready: ${readinessPack.status}`);
  const ownerBriefAccepted = [
    'owner_remaining_decision_brief_ready',
    'owner_remaining_decision_brief_needs_review'
  ].includes(ownerBrief.status);
  if (!ownerBriefAccepted) failures.push(`Owner brief not in a guarded review state: ${ownerBrief.status}`);

  const branches = sourceRootChoiceSatisfied
    ? [{
        id: 'recorded_metadata_only_source_root',
        label: 'Recorded metadata-only Source Root',
        selected_decision: choiceMatrix.summary?.selected_decision || null,
        selected_root_path: choiceMatrix.summary?.selected_root_path || null,
        owner_confirmation_required: false,
        unlocks_private_metadata_diagnostic: choiceMatrix.summary?.private_diagnostic_allowed === true,
        executable_now: false,
        public_ready_after_branch: 0,
        allowed_after_explicit_owner_answer: {
          record_decision: false,
          run_guard_sequence: true,
          run_private_metadata_inventory_after_guards: true,
          run_private_ocr_or_pdf_text_extraction: false,
          copy_private_files_to_git: false,
          set_public_ready: false,
          run_local_llm_on_private_file_contents: false
        },
        command_order_after_recording: [
          'npm run kosmo:private-metadata-inventory',
          'npm run kosmo:private-metadata-inventory-check'
        ],
        immediate_codex_action: 'Continue metadata-only diagnostics and guarded review batches; keep private content extraction and public-ready blocked.',
        next_human_review: 'review private metadata inventory output contract before any extraction or local LLM content tasks',
        caution: 'Recorded source root does not approve OCR, PDF text extraction, private file copying, local LLM file-content tasks, or public-ready promotion.'
      }]
    : (choiceMatrix.choices || []).map((choice) => {
    const unlocks = choice.unlocks_private_metadata_diagnostic === true;
    const guardSequence = choice.guard_sequence_after_recording || [];
    return {
      id: choice.id,
      label: choice.label,
      selected_decision: choice.selected_decision,
      selected_root_path: choice.selected_root_path,
      owner_confirmation_required: choice.owner_confirmation_required === true,
      unlocks_private_metadata_diagnostic: unlocks,
      executable_now: false,
      public_ready_after_branch: 0,
      allowed_after_explicit_owner_answer: {
        record_decision: true,
        run_guard_sequence: true,
        run_private_metadata_inventory_after_guards: unlocks,
        run_private_ocr_or_pdf_text_extraction: false,
        copy_private_files_to_git: false,
        set_public_ready: false,
        run_local_llm_on_private_file_contents: false
      },
      command_order_after_recording: guardSequence,
      immediate_codex_action: immediateAction(choice),
      next_human_review: choice.next_human_review,
      caution: choice.caution
    };
  });

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'source_root_owner_answer_execution_checklist_ready'
      : 'source_root_owner_answer_execution_checklist_needs_review',
    policy: {
      checklist_only: true,
      records_decisions: false,
      mutates_decision_session: false,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_inventory_now: false,
      executes_commands: false,
      writes_public_files: false,
      public_ready_after_checklist: 0
    },
    source_refs: [
      relative(root, choiceMatrixPath),
      relative(root, readinessPackPath),
      relative(root, ownerBriefPath)
    ],
    summary: {
      branches: branches.length,
      unlock_branches: branches.filter((branch) => branch.unlocks_private_metadata_diagnostic).length,
      executable_now: branches.filter((branch) => branch.executable_now).length,
      owner_actions_required: ownerBrief.summary?.open_owner_actions ?? null,
      readiness_command_steps: readinessPack.summary?.command_sequence_steps ?? null,
      failures: failures.length,
      public_ready_after_checklist: 0
    },
    branches,
    required_owner_answer_format: {
      source_root_choice: 'One of: keep_blocked, repair_onedrive_first, select_exact_root_1',
      exact_root_confirmation: 'Required only for select_exact_root_1; must confirm the exact shown path is the complete private architecture source root.',
      review_batch_scope: 'Optional next review batch IDs; keep review-only unless separately approved.'
    },
    hard_stops: [
      'Do not infer the owner answer from this checklist.',
      'Do not run commands from a branch until the owner answer is explicitly recorded.',
      'Do not run private metadata inventory unless the selected branch unlocks it and all guards pass.',
      'Do not OCR, extract PDF text, or send private file contents to local LLM workers from this checklist.',
      'Do not copy private files, scans, OCR text, or protected assets into Git.',
      'Do not set public-ready.'
    ],
    failures
  };
}

function immediateAction(choice) {
  if (choice.id === 'select_exact_root_1') {
    return 'After explicit owner confirmation, record the exact root decision, run source-root guards, then run metadata-only private inventory if activation is ready.';
  }
  if (choice.id === 'repair_onedrive_first') {
    return 'Record repair-first decision, keep private work blocked, refresh blockers, and wait for OneDrive/source mount completion.';
  }
  return 'Record blocked decision, refresh blockers, and keep all source-dependent work closed.';
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Source-Root Owner Answer Execution Checklist');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Branches: ${report.summary.branches}`);
  lines.push(`- Unlock branches: ${report.summary.unlock_branches}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Owner actions required: ${report.summary.owner_actions_required}`);
  lines.push(`- Readiness command steps: ${report.summary.readiness_command_steps}`);
  lines.push(`- Public-ready after checklist: ${report.summary.public_ready_after_checklist}`);
  lines.push('');
  lines.push('## Branches');
  lines.push('');
  report.branches.forEach((branch) => {
    lines.push(`### ${branch.id}`);
    lines.push('');
    lines.push(`- Label: ${branch.label}`);
    lines.push(`- Selected decision: ${branch.selected_decision}`);
    lines.push(`- Selected root path: ${branch.selected_root_path ?? 'none'}`);
    lines.push(`- Unlocks metadata diagnostic: ${branch.unlocks_private_metadata_diagnostic ? 'yes' : 'no'}`);
    lines.push(`- Executable now: ${branch.executable_now ? 'yes' : 'no'}`);
    lines.push(`- Immediate Codex action: ${branch.immediate_codex_action}`);
    lines.push(`- Next human review: ${branch.next_human_review}`);
    lines.push('- Command order after recording:');
    branch.command_order_after_recording.forEach((command) => lines.push(`  - ${command}`));
    lines.push('');
  });
  lines.push('## Required Owner Answer Format');
  lines.push('');
  Object.entries(report.required_owner_answer_format).forEach(([key, value]) => {
    lines.push(`- ${key}: ${value}`);
  });
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
