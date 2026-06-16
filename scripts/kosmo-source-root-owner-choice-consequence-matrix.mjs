#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  finalBrief: resolve(root, args.finalBrief || `data/kosmo-source-root-owner-final-decision-brief-${dateStamp}.json`),
  dryRun: resolve(root, args.dryRun || `data/kosmo-source-root-decision-dry-run-${dateStamp}.json`),
  queueGuard: resolve(root, args.queueGuard || `data/kosmo-source-root-post-owner-activation-queue-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-root-owner-choice-consequence-matrix-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-owner-choice-consequence-matrix-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {
    finalBrief: await readJson(refs.finalBrief),
    dryRun: await readJson(refs.dryRun),
    queueGuard: await readJson(refs.queueGuard)
  };
  const matrix = buildMatrix(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(matrix, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(matrix));

  console.log('Kosmo source-root owner choice consequence matrix');
  console.log(`Status: ${matrix.status}`);
  console.log(`Choices: ${matrix.summary.choices}`);
  console.log(`Unlock choices: ${matrix.summary.unlock_choices}`);
  console.log(`Blocked choices: ${matrix.summary.blocked_choices}`);
  console.log(`Failures: ${matrix.summary.failures}`);
  console.log(`Public-ready after matrix: ${matrix.summary.public_ready_after_matrix}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (matrix.failures.length > 0) process.exitCode = 1;
}

function buildMatrix({ finalBrief, dryRun, queueGuard }) {
  if (isSatisfiedMetadataOnly({ finalBrief, dryRun, queueGuard })) {
    return {
      schema_version: '0.1',
      generated_at: new Date().toISOString(),
      status: 'source_root_owner_choice_consequence_matrix_satisfied_metadata_only',
      policy: {
        matrix_only: true,
        records_decisions: false,
        mutates_decision_session: false,
        reads_private_content: false,
        copies_private_content: false,
        runs_private_inventory_now: false,
        writes_public_files: false,
        writes_public_manifest: false,
        public_ready_after_matrix: 0,
        note: 'The owner source-root choice has already been recorded and guarded. The matrix is retained as a satisfied metadata-only audit.'
      },
      source_refs: Object.values(refs).map((path) => relative(root, path)),
      summary: {
        final_brief_status: finalBrief.status,
        dry_run_status: dryRun.status,
        queue_guard_status: queueGuard.status,
        choices: 0,
        unlock_choices: 0,
        blocked_choices: 0,
        failures: 0,
        public_ready_after_matrix: 0,
        selected_decision: finalBrief.summary?.selected_decision || null,
        selected_root_path: finalBrief.summary?.selected_root_path || null,
        private_diagnostic_allowed: finalBrief.summary?.private_diagnostic_allowed === true
      },
      choices: [],
      recommendation: {
        safe_default: 'already_recorded',
        rule: 'The selected root is recorded for metadata-only diagnostics. Keep OCR, PDF text extraction, private file copying, local LLM file-content tasks and public-ready promotion blocked until separately approved.'
      },
      hard_stops: [
        'Do not OCR or extract private PDF/book text from this satisfied matrix.',
        'Do not copy private files, scans, OCR text, or protected assets into Git.',
        'Do not set public-ready from private sources.',
        'Do not run local LLM tasks on private file contents before a separate guarded contract exists.'
      ],
      failures: []
    };
  }

  const failures = [];
  if (finalBrief.status !== 'source_root_owner_final_decision_brief_ready') failures.push(`Final brief not ready: ${finalBrief.status}`);
  if (dryRun.status !== 'source_root_decision_dry_run_ready') failures.push(`Decision dry run not ready: ${dryRun.status}`);
  if (queueGuard.status !== 'source_root_post_owner_activation_queue_guard_passed') failures.push(`Queue guard not passed: ${queueGuard.status}`);

  const dryRunById = new Map((dryRun.scenarios || []).map((scenario) => [scenario.id, scenario]));
  const choices = (finalBrief.answer_choices || []).map((choice) => {
    const scenario = dryRunById.get(choice.id);
    if (!scenario) failures.push(`Missing dry-run scenario for choice: ${choice.id}`);
    const unlocks = choice.unlocks_private_metadata_diagnostic === true &&
      scenario?.metadata_diagnostic_would_be_allowed_after_recorded_decision === true;
    return {
      id: choice.id,
      label: choice.label,
      selected_decision: choice.selected_decision,
      selected_root_path: choice.selected_root_path,
      owner_confirmation_required: true,
      unlocks_private_metadata_diagnostic: unlocks,
      private_work_after_recording: unlocks ? 'metadata_only_possible_after_all_guards' : 'blocked',
      public_ready_after_choice: 0,
      first_command_after_recording: scenario?.first_allowed_command_after_recording || 'npm run kosmo:source-root-decision-session-check',
      guard_sequence_after_recording: unlocks
        ? [
            'npm run kosmo:source-root-decision-session-check',
            'npm run kosmo:source-root-blocker-refresh',
            'npm run kosmo:source-root-activation-preflight',
            'npm run kosmo:source-root-post-owner-activation-queue',
            'npm run kosmo:source-root-post-owner-activation-queue-check',
            'npm run kosmo:private-metadata-inventory',
            'npm run kosmo:private-metadata-inventory-check',
            'npm run kosmo:day-batch-loop'
          ]
        : [
            'npm run kosmo:source-root-decision-session-check',
            'npm run kosmo:source-root-blocker-refresh',
            'npm run kosmo:source-root-activation-preflight',
            'npm run kosmo:source-root-post-owner-activation-queue',
            'npm run kosmo:source-root-post-owner-activation-queue-check',
            'npm run kosmo:day-batch-loop'
          ],
      still_blocked_after_choice: unlocks
        ? [
            'private OCR/PDF/book text extraction',
            'copying private files into Git',
            'public-ready promotion from private sources',
            'local LLM file-content tasks before metadata output guards pass'
          ]
        : [
            'private metadata inventory',
            'private OCR/PDF/book text extraction',
            'source-dependent authoring',
            'public-ready promotion from private sources',
            'local LLM tasks with private file contents'
          ],
      next_human_review: unlocks
        ? 'review private metadata inventory output contract before any extraction or local LLM content tasks'
        : 'owner confirms a real complete source root or repair/mount action is complete',
      caution: choice.caution || choice.when_to_use || scenario?.caution || ''
    };
  });

  if (choices.length !== (dryRun.scenarios || []).length) failures.push('Choice count must match dry-run scenario count.');
  const unlockChoices = choices.filter((choice) => choice.unlocks_private_metadata_diagnostic);
  if (unlockChoices.length !== (finalBrief.summary?.unlock_options ?? 0)) failures.push('Unlock choice count must match final brief summary.');
  if (choices.some((choice) => choice.public_ready_after_choice !== 0)) failures.push('All choices must keep public-ready at 0.');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'source_root_owner_choice_consequence_matrix_ready'
      : 'source_root_owner_choice_consequence_matrix_needs_review',
    policy: {
      matrix_only: true,
      records_decisions: false,
      mutates_decision_session: false,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_inventory_now: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_matrix: 0,
      note: 'This matrix previews consequences of owner choices. It does not apply choices or inspect private sources.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      final_brief_status: finalBrief.status,
      dry_run_status: dryRun.status,
      queue_guard_status: queueGuard.status,
      choices: choices.length,
      unlock_choices: unlockChoices.length,
      blocked_choices: choices.filter((choice) => !choice.unlocks_private_metadata_diagnostic).length,
      failures: failures.length,
      public_ready_after_matrix: 0
    },
    choices,
    recommendation: {
      safe_default: finalBrief.summary?.recommended_default || 'repair_onedrive_first_or_keep_blocked',
      rule: 'Pick the unlock choice only after explicit owner confirmation that the exact path is the complete private architecture source root.'
    },
    failures
  };
}

function isSatisfiedMetadataOnly({ finalBrief, dryRun, queueGuard }) {
  return finalBrief.status === 'source_root_owner_final_decision_brief_satisfied_metadata_only' &&
    dryRun.status === 'source_root_decision_dry_run_satisfied_recorded_selection' &&
    queueGuard.status === 'source_root_post_owner_activation_queue_guard_passed' &&
    finalBrief.summary?.selected_decision === 'select_existing_root_for_private_diagnostic' &&
    typeof finalBrief.summary?.selected_root_path === 'string' &&
    finalBrief.summary.selected_root_path.length > 0 &&
    finalBrief.summary?.private_diagnostic_allowed === true &&
    (finalBrief.summary?.public_ready_after_brief ?? 0) === 0 &&
    (dryRun.summary?.public_ready_after_dry_run ?? 0) === 0;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(matrix) {
  const lines = [];
  lines.push('# Kosmo Source-Root Owner Choice Consequence Matrix');
  lines.push('');
  lines.push(`Generated: ${matrix.generated_at}`);
  lines.push(`Status: \`${matrix.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Final brief: ${matrix.summary.final_brief_status}`);
  lines.push(`- Dry run: ${matrix.summary.dry_run_status}`);
  lines.push(`- Queue guard: ${matrix.summary.queue_guard_status}`);
  lines.push(`- Choices: ${matrix.summary.choices}`);
  lines.push(`- Unlock choices: ${matrix.summary.unlock_choices}`);
  lines.push(`- Blocked choices: ${matrix.summary.blocked_choices}`);
  lines.push(`- Failures: ${matrix.summary.failures}`);
  lines.push(`- Public-ready after matrix: ${matrix.summary.public_ready_after_matrix}`);
  lines.push('');
  lines.push('## Recommendation');
  lines.push('');
  lines.push(`- Safe default: ${matrix.recommendation.safe_default}`);
  lines.push(`- Rule: ${matrix.recommendation.rule}`);
  lines.push('');
  lines.push('## Choice Matrix');
  lines.push('');
  lines.push('| Choice | Decision | Root | Private metadata | First command | Public-ready | Next human review |');
  lines.push('| --- | --- | --- | --- | --- | ---: | --- |');
  matrix.choices.forEach((choice) => {
    lines.push(`| \`${choice.id}\` | \`${choice.selected_decision}\` | ${choice.selected_root_path ? `\`${escapePipe(choice.selected_root_path)}\`` : '-'} | ${choice.private_work_after_recording} | \`${choice.first_command_after_recording}\` | ${choice.public_ready_after_choice} | ${escapePipe(choice.next_human_review)} |`);
  });
  lines.push('');
  lines.push('## Guard Sequences');
  lines.push('');
  matrix.choices.forEach((choice) => {
    lines.push(`### ${choice.id}`);
    lines.push('');
    choice.guard_sequence_after_recording.forEach((command) => lines.push(`- \`${command}\``));
    lines.push('');
    lines.push('Still blocked:');
    choice.still_blocked_after_choice.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  });
  lines.push('## Failures');
  lines.push('');
  if (matrix.failures.length > 0) matrix.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  return lines.join('\n');
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
