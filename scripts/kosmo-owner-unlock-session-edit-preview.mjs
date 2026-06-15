#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const intakeApplyPlanPath = resolve(root, args.plan || `data/kosmo-owner-unlock-intake-apply-plan-${dateStamp}.json`);
const sourceRootSessionPath = resolve(
  root,
  args.sourceRootSession || `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`
);
const ownerDecisionSessionPath = resolve(
  root,
  args.ownerDecisionSession || 'examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json'
);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-session-edit-preview-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-session-edit-preview-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const intakeApplyPlan = JSON.parse(await readFile(intakeApplyPlanPath, 'utf8'));
  const sourceRootSession = JSON.parse(await readFile(sourceRootSessionPath, 'utf8'));
  const ownerDecisionSession = JSON.parse(await readFile(ownerDecisionSessionPath, 'utf8'));
  const preview = await buildPreview({ intakeApplyPlan, sourceRootSession, ownerDecisionSession });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(preview, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(preview));

  console.log('Kosmo owner unlock session edit preview');
  console.log(`Status: ${preview.status}`);
  console.log(`Preview edits: ${preview.summary.preview_edits}`);
  console.log(`Session file edits: ${preview.summary.session_file_edits}`);
  console.log(`Writes now: ${preview.summary.writes_now ? 'yes' : 'no'}`);
  console.log(`Failures: ${preview.summary.failures}`);
  console.log(`Public-ready after preview: ${preview.summary.public_ready_after_preview}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (preview.failures.length > 0) process.exitCode = 1;
}

async function buildPreview({ intakeApplyPlan, sourceRootSession, ownerDecisionSession }) {
  const failures = [];
  if (intakeApplyPlan.status !== 'owner_unlock_intake_apply_plan_ready') {
    failures.push(`Intake apply plan not ready: ${intakeApplyPlan.status}`);
  }
  if (intakeApplyPlan.policy?.writes_intake_now !== false) failures.push('Intake apply plan is not write-safe.');
  if (intakeApplyPlan.policy?.reads_private_content !== false) failures.push('Intake apply plan is not private-read safe.');
  if (sourceRootSession.status !== 'source_root_decision_session_pending') {
    failures.push(`Source-root session not pending: ${sourceRootSession.status}`);
  }
  if (sourceRootSession.selected_decision !== null || sourceRootSession.selected_root_path !== null || sourceRootSession.owner_note !== '') {
    failures.push('Source-root session already has a recorded selection.');
  }
  if (ownerDecisionSession.policy?.public_ready_after_session !== 0) failures.push('Owner decision session is not public-ready neutral.');

  const effective = valuesFromFieldEdits(intakeApplyPlan.planned_field_edits || []);
  const selectedDecision = effective.get('/source_root_answer/selected_decision') || null;
  const selectedRootPath = effective.get('/source_root_answer/selected_root_path') || null;
  const ownerNote = effective.get('/source_root_answer/owner_note') || '';

  if (!selectedDecision) failures.push('Missing selected source-root decision in intake apply plan.');
  if (selectedDecision && !(sourceRootSession.allowed_decisions || []).includes(selectedDecision)) {
    failures.push(`Source-root decision is not allowed by current session: ${selectedDecision}`);
  }
  if (selectedRootPath && !isAbsolute(selectedRootPath)) failures.push(`Selected root path is not absolute: ${selectedRootPath}`);
  if (selectedRootPath && !(await exists(selectedRootPath))) failures.push(`Selected root path does not exist: ${selectedRootPath}`);

  const sourceRootEdit = {
    id: 'source-root-session-record-preview',
    target_file: relative(root, sourceRootSessionPath),
    edit_type: 'source_root_decision_session_record',
    writes_now: false,
    current: {
      selected_decision: sourceRootSession.selected_decision,
      selected_root_path: sourceRootSession.selected_root_path,
      owner_note: sourceRootSession.owner_note
    },
    proposed: {
      selected_decision: selectedDecision,
      selected_root_path: selectedRootPath,
      owner_note: ownerNote
    },
    after_apply_required_commands: [
      'npm run kosmo:source-root-decision-session-check',
      'npm run kosmo:source-root-blocker-refresh',
      'npm run kosmo:source-root-activation-preflight'
    ],
    public_ready_after_edit: 0
  };

  const ownerCardEdits = [...effective.entries()]
    .filter(([path]) => path.startsWith('/owner_card_answers/') && path.endsWith('/owner_choice'))
    .map(([path, ownerChoice]) => {
      const index = Number(path.split('/')[2]);
      const note = effective.get(`/owner_card_answers/${index}/owner_note`) || '';
      return {
        id: `owner-card-${index}-triage-preview`,
        target_file: 'manual-review-only',
        edit_type: 'owner_card_triage_note',
        owner_card_index: index,
        owner_choice: ownerChoice,
        owner_note: note,
        writes_now: false,
        public_ready_after_edit: 0
      };
    });

  if (ownerCardEdits.length !== 5) failures.push(`Expected 5 owner-card triage previews, found ${ownerCardEdits.length}.`);

  const previewEdits = [sourceRootEdit, ...ownerCardEdits];
  const writesNow = previewEdits.some((edit) => edit.writes_now !== false);
  const publicReadyAfterPreview = previewEdits.reduce((sum, edit) => sum + Number(edit.public_ready_after_edit || 0), 0);
  if (writesNow) failures.push('At least one preview edit writes now.');
  if (publicReadyAfterPreview !== 0) failures.push('Preview would change public-ready state.');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_session_edit_preview_ready'
      : 'owner_unlock_session_edit_preview_needs_review',
    policy: {
      review_only: true,
      preview_only: true,
      writes_session_files_now: false,
      writes_intake_now: false,
      applies_decisions_now: false,
      records_source_root_now: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      runs_source_root_guards_now: false,
      public_ready_after_preview: 0
    },
    source_refs: [
      relative(root, intakeApplyPlanPath),
      relative(root, sourceRootSessionPath),
      relative(root, ownerDecisionSessionPath)
    ],
    summary: {
      intake_apply_plan_status: intakeApplyPlan.status,
      source_root_session_status: sourceRootSession.status,
      owner_decision_session_status: ownerDecisionSession.status,
      preview_edits: previewEdits.length,
      session_file_edits: previewEdits.filter((edit) => edit.target_file !== 'manual-review-only').length,
      manual_triage_edits: previewEdits.filter((edit) => edit.target_file === 'manual-review-only').length,
      selected_root_path: selectedRootPath,
      selected_root_exists: selectedRootPath ? await exists(selectedRootPath) : false,
      writes_now: false,
      failures: failures.length,
      public_ready_after_preview: publicReadyAfterPreview
    },
    preview_edits: previewEdits,
    after_manual_apply_sequence: [
      'Review this preview with Claude/KosmoOverseer.',
      'Apply the source-root session record only after exact owner reply is present in normal chat.',
      'Run npm run kosmo:source-root-decision-session-check.',
      'Run npm run kosmo:source-root-blocker-refresh.',
      'Run npm run kosmo:source-root-activation-preflight.',
      'Only then consider private metadata inventory, still review-only.'
    ],
    hard_stops: [
      'Do not apply this preview automatically.',
      'Do not write session files from this preview.',
      'Do not run private inventory from this preview.',
      'Do not read private content.',
      'Do not change public-ready state.'
    ],
    failures
  };
}

function valuesFromFieldEdits(edits) {
  const values = new Map();
  for (const edit of edits) {
    values.set(edit.path, edit.proposed_value);
  }
  return values;
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function renderMarkdown(preview) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Session Edit Preview');
  lines.push('');
  lines.push(`Generated: ${preview.generated_at}`);
  lines.push(`Status: \`${preview.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Intake apply plan: ${preview.summary.intake_apply_plan_status}`);
  lines.push(`- Source-root session: ${preview.summary.source_root_session_status}`);
  lines.push(`- Owner decision session: ${preview.summary.owner_decision_session_status}`);
  lines.push(`- Preview edits: ${preview.summary.preview_edits}`);
  lines.push(`- Session file edits: ${preview.summary.session_file_edits}`);
  lines.push(`- Manual triage edits: ${preview.summary.manual_triage_edits}`);
  lines.push(`- Selected root path: ${preview.summary.selected_root_path || '-'}`);
  lines.push(`- Selected root exists: ${preview.summary.selected_root_exists ? 'yes' : 'no'}`);
  lines.push(`- Writes now: ${preview.summary.writes_now ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after preview: ${preview.summary.public_ready_after_preview}`);
  lines.push('');
  lines.push('## Preview Edits');
  lines.push('');
  preview.preview_edits.forEach((edit) => {
    lines.push(`- \`${edit.id}\` -> \`${edit.target_file}\` (${edit.edit_type}, writes now: ${edit.writes_now ? 'yes' : 'no'})`);
  });
  lines.push('');
  lines.push('## After Manual Apply Sequence');
  lines.push('');
  preview.after_manual_apply_sequence.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  preview.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  if (preview.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    preview.failures.forEach((failure) => lines.push(`- ${failure}`));
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
