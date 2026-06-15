#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const bundlePath = resolve(root, args.bundle || `data/kosmo-owner-unlock-patch-review-bundle-${dateStamp}.json`);
const intakePath = resolve(
  root,
  args.intake || `examples/kosmo-references/provenance/owner-answer-intake-template-${dateStamp}.json`
);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-intake-apply-plan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-intake-apply-plan-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const bundle = JSON.parse(await readFile(bundlePath, 'utf8'));
  const intake = JSON.parse(await readFile(intakePath, 'utf8'));
  const plan = await buildPlan({ bundle, intake });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(plan));

  console.log('Kosmo owner unlock intake apply plan');
  console.log(`Status: ${plan.status}`);
  console.log(`Planned field edits: ${plan.summary.planned_field_edits}`);
  console.log(`Target intake currently empty: ${plan.summary.target_intake_currently_empty ? 'yes' : 'no'}`);
  console.log(`Writes intake now: ${plan.summary.writes_intake_now ? 'yes' : 'no'}`);
  console.log(`Failures: ${plan.summary.failures}`);
  console.log(`Public-ready after plan: ${plan.summary.public_ready_after_plan}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (plan.failures.length > 0) process.exitCode = 1;
}

async function buildPlan({ bundle, intake }) {
  const failures = [];
  if (bundle.status !== 'owner_unlock_patch_review_bundle_ready') failures.push(`Patch review bundle not ready: ${bundle.status}`);
  if (intake.status !== 'owner_answer_intake_template_pending_owner_input') failures.push(`Intake template not pending owner input: ${intake.status}`);

  const sourcePatch = bundle.proposed_intake_patch?.source_root_answer || null;
  const ownerPatches = bundle.proposed_intake_patch?.owner_card_answers || [];
  if (!sourcePatch) failures.push('Missing source-root patch.');
  if (ownerPatches.length !== 5) failures.push(`Expected 5 owner-card patches, found ${ownerPatches.length}.`);

  const plannedFieldEdits = [];
  if (sourcePatch) {
    plannedFieldEdits.push(fieldEdit('/source_root_answer/selected_decision', intake.source_root_answer?.selected_decision ?? null, sourcePatch.selected_decision));
    plannedFieldEdits.push(fieldEdit('/source_root_answer/selected_root_path', intake.source_root_answer?.selected_root_path ?? null, sourcePatch.selected_root_path));
    plannedFieldEdits.push(fieldEdit('/source_root_answer/owner_note', intake.source_root_answer?.owner_note ?? '', sourcePatch.owner_note || ''));
    if (!isAbsolute(sourcePatch.selected_root_path || '')) failures.push('Selected root path is not absolute.');
    if (sourcePatch.selected_root_path && !(await exists(sourcePatch.selected_root_path))) failures.push(`Selected root path does not exist: ${sourcePatch.selected_root_path}`);
  }

  const ownerCardsById = new Map((intake.owner_card_answers || []).map((answer, index) => [answer.batch_id, { answer, index }]));
  for (const patch of ownerPatches) {
    const target = ownerCardsById.get(patch.batch_id);
    if (!target) {
      failures.push(`Missing owner-card answer target: ${patch.batch_id}`);
      continue;
    }
    if (!(target.answer.allowed_choices || []).includes(patch.owner_choice)) failures.push(`Owner choice not allowed for ${patch.batch_id}: ${patch.owner_choice}`);
    plannedFieldEdits.push(fieldEdit(`/owner_card_answers/${target.index}/owner_choice`, target.answer.owner_choice ?? null, patch.owner_choice));
    plannedFieldEdits.push(fieldEdit(`/owner_card_answers/${target.index}/owner_note`, target.answer.owner_note ?? '', patch.owner_note || ''));
  }

  if (plannedFieldEdits.some((edit) => edit.current_value !== null && edit.current_value !== '')) {
    failures.push('Target intake template already contains at least one field that this plan would overwrite.');
  }

  const publicReadyWouldChange = plannedFieldEdits.some((edit) => edit.path.includes('public_ready'));
  if (publicReadyWouldChange) failures.push('Plan attempts to edit public-ready fields.');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_intake_apply_plan_ready'
      : 'owner_unlock_intake_apply_plan_needs_review',
    policy: {
      review_only: true,
      plan_only: true,
      writes_intake_now: false,
      records_decisions: false,
      mutates_session_files: false,
      runs_source_root_guards: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_plan: 0
    },
    source_refs: [
      relative(root, bundlePath),
      relative(root, intakePath)
    ],
    summary: {
      patch_bundle_status: bundle.status,
      intake_status: intake.status,
      planned_field_edits: plannedFieldEdits.length,
      source_root_field_edits: plannedFieldEdits.filter((edit) => edit.path.startsWith('/source_root_answer/')).length,
      owner_card_field_edits: plannedFieldEdits.filter((edit) => edit.path.startsWith('/owner_card_answers/')).length,
      target_intake_currently_empty: plannedFieldEdits.every((edit) => edit.current_value === null || edit.current_value === ''),
      selected_root_path: sourcePatch?.selected_root_path || null,
      selected_root_exists: sourcePatch?.selected_root_path ? await exists(sourcePatch.selected_root_path) : false,
      writes_intake_now: false,
      failures: failures.length,
      public_ready_after_plan: 0
    },
    planned_field_edits: plannedFieldEdits,
    after_manual_apply_commands: [
      'npm run kosmo:owner-answer-intake-check',
      'npm run kosmo:owner-answer-session-edit-plan',
      'npm run kosmo:source-root-decision-session-check',
      'npm run kosmo:source-root-blocker-refresh',
      'npm run kosmo:source-root-activation-preflight'
    ],
    hard_stops: [
      'Do not apply this plan automatically.',
      'Do not overwrite non-empty owner intake fields without a fresh review.',
      'Do not mutate session files from this plan.',
      'Do not run source-root guards from this plan.',
      'Do not read private content.',
      'Keep public-ready at 0.'
    ],
    failures
  };
}

function fieldEdit(path, currentValue, proposedValue) {
  return {
    path,
    current_value: currentValue,
    proposed_value: proposedValue,
    writes_now: false
  };
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function renderMarkdown(plan) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Intake Apply Plan');
  lines.push('');
  lines.push(`Generated: ${plan.generated_at}`);
  lines.push(`Status: \`${plan.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Patch bundle: ${plan.summary.patch_bundle_status}`);
  lines.push(`- Intake status: ${plan.summary.intake_status}`);
  lines.push(`- Planned field edits: ${plan.summary.planned_field_edits}`);
  lines.push(`- Source-root field edits: ${plan.summary.source_root_field_edits}`);
  lines.push(`- Owner-card field edits: ${plan.summary.owner_card_field_edits}`);
  lines.push(`- Target intake currently empty: ${plan.summary.target_intake_currently_empty ? 'yes' : 'no'}`);
  lines.push(`- Selected root path: ${plan.summary.selected_root_path || '-'}`);
  lines.push(`- Selected root exists: ${plan.summary.selected_root_exists ? 'yes' : 'no'}`);
  lines.push(`- Writes intake now: ${plan.summary.writes_intake_now ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after plan: ${plan.summary.public_ready_after_plan}`);
  lines.push('');
  lines.push('## Planned Field Edits');
  lines.push('');
  plan.planned_field_edits.forEach((edit) => {
    lines.push(`- \`${edit.path}\`: \`${String(edit.current_value ?? 'null')}\` -> \`${String(edit.proposed_value ?? 'null')}\``);
  });
  lines.push('');
  lines.push('## After Manual Apply Commands');
  lines.push('');
  plan.after_manual_apply_commands.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  plan.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  if (plan.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    plan.failures.forEach((failure) => lines.push(`- ${failure}`));
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
