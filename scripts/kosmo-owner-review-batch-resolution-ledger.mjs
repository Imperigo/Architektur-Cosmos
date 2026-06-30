#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  intake: resolve(root, args.intake || `examples/kosmo-references/provenance/owner-answer-intake-template-${dateStamp}.json`),
  intakeCheck: resolve(root, args.intakeCheck || `data/kosmo-owner-answer-intake-check-${dateStamp}.json`),
  batches: resolve(root, args.batches || `data/kosmo-human-decision-owner-batches-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-owner-review-batch-resolution-ledger-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-review-batch-resolution-ledger-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {
    intake: await readJson(refs.intake),
    intakeCheck: await readJson(refs.intakeCheck),
    batches: await readJson(refs.batches)
  };
  const ledger = buildLedger(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(ledger, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(ledger));

  console.log('Kosmo owner review batch resolution ledger');
  console.log(`Status: ${ledger.status}`);
  console.log(`Resolved batches: ${ledger.summary.resolved_batches}/${ledger.summary.batches}`);
  console.log(`Resolved items: ${ledger.summary.resolved_items}/${ledger.summary.items}`);
  console.log(`Owner action required: ${ledger.summary.owner_action_required}`);
  console.log(`Failures: ${ledger.summary.failures}`);
  console.log(`Public-ready after ledger: ${ledger.summary.public_ready_after_ledger}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (ledger.failures.length > 0) process.exitCode = 1;
}

function buildLedger({ intake, intakeCheck, batches }) {
  const failures = [];
  const intakeGuarded = [
    'owner_answer_intake_guard_passed_pending_owner_input',
    'owner_answer_intake_guard_passed_with_answers'
  ].includes(intakeCheck.status);
  if (!intakeGuarded) failures.push(`Intake check must be guarded: ${intakeCheck.status}`);
  if ((intakeCheck.summary?.failures ?? 1) !== 0) failures.push('Intake check has failures.');
  if ((intakeCheck.summary?.public_ready_after_guard ?? 1) !== 0) failures.push('Intake check public-ready must stay 0.');
  if (batches.status !== 'owner_decision_batches_open') failures.push(`Owner batches must be visible before triage: ${batches.status}`);

  const answersByBatch = new Map((intake.owner_card_answers || []).map((answer) => [answer.batch_id, answer]));
  const resolutions = (batches.batches || []).map((batch) => {
    const answer = answersByBatch.get(batch.id);
    const ownerChoice = answer?.owner_choice || null;
    const resolved = Boolean(ownerChoice);
    if (resolved && answer && !(answer.allowed_choices || []).includes(ownerChoice)) failures.push(`Owner choice not allowed for ${batch.id}: ${ownerChoice}`);
    if ((answer?.public_ready_after_card ?? 0) !== 0) failures.push(`Owner card would set public-ready for ${batch.id}.`);

    return {
      batch_id: batch.id,
      label: batch.label,
      owner_choice: ownerChoice,
      owner_note: answer?.owner_note || '',
      resolution_status: resolved ? 'triaged_review_only' : 'owner_pending',
      item_count: batch.total_items,
      resolved_item_count: resolved ? batch.total_items : 0,
      public_ready_after_resolution: 0,
      item_policy_after_resolution: itemPolicy(batch, ownerChoice),
      remaining_blockers: remainingBlockers(batch, ownerChoice)
    };
  });

  const resolvedBatches = resolutions.filter((resolution) => resolution.resolution_status === 'triaged_review_only');
  const items = resolutions.reduce((sum, resolution) => sum + resolution.item_count, 0);
  const resolvedItems = resolutions.reduce((sum, resolution) => sum + resolution.resolved_item_count, 0);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 && resolvedBatches.length === resolutions.length
      ? 'owner_review_batch_resolution_ledger_ready'
      : failures.length === 0
        ? 'owner_review_batch_resolution_ledger_pending_owner_input'
        : 'owner_review_batch_resolution_ledger_needs_review',
    policy: {
      review_only: true,
      records_reference_item_decisions: false,
      records_asset_approvals: false,
      writes_session_files: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_ledger: 0,
      note: 'This ledger resolves owner review cards as review-only triage only. It does not approve reference items, assets or public display.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      intake_status: intake.status,
      intake_check_status: intakeCheck.status,
      batches_status: batches.status,
      batches: resolutions.length,
      resolved_batches: resolvedBatches.length,
      unresolved_batches: resolutions.length - resolvedBatches.length,
      items,
      resolved_items: resolvedItems,
      owner_action_required: resolutions.length - resolvedBatches.length,
      failures: failures.length,
      public_ready_after_ledger: 0
    },
    resolutions,
    next_actions: [
      'Treat owner review cards as triaged review-only.',
      'Keep individual reference media, derived files and model promotion decisions blocked unless a separate item-level review is opened.',
      'Keep KosmoAsset candidates in needs-review/local-review state until named human file review exists.',
      'Rerun data-lane, router, Orbit and overseer sync after this ledger changes.'
    ],
    hard_stops: [
      'Do not convert this ledger into public-ready approvals.',
      'Do not copy private files into Git.',
      'Do not OCR or extract private source text from this ledger.',
      'Do not run local LLMs on private file contents from this ledger.'
    ],
    failures
  };
}

function itemPolicy(batch, ownerChoice) {
  if (batch.id === 'batch-a-villa-savoye-image-candidates') {
    return ownerChoice === 'open_one_source_credit_review'
      ? 'open_separate_source_credit_review_only'
      : 'keep_reference_images_blocked_pending_context';
  }
  if (batch.id === 'batch-e-kosmoasset-human-reviews') {
    return ownerChoice === 'block_public'
      ? 'keep_assets_local_and_block_public'
      : 'keep_assets_needs_review';
  }
  return 'use_safe_default_keep_review_only';
}

function remainingBlockers(batch, ownerChoice) {
  const blockers = ['public_ready_promotion', 'private_content_extraction'];
  if (batch.id.includes('model')) blockers.push('model_quality_and_source_confidence_review');
  if (batch.id.includes('sogn')) blockers.push('sogn_private_source_context_review');
  if (batch.id.includes('villa-savoye')) blockers.push('source_credit_or_derived_file_basis_review');
  if (batch.id.includes('kosmoasset') && ownerChoice !== 'assign_named_human_review') blockers.push('named_human_file_review');
  return blockers;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(ledger) {
  const lines = [];
  lines.push('# Kosmo Owner Review Batch Resolution Ledger');
  lines.push('');
  lines.push(`Generated: ${ledger.generated_at}`);
  lines.push(`Status: \`${ledger.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Intake check: ${ledger.summary.intake_check_status}`);
  lines.push(`- Resolved batches: ${ledger.summary.resolved_batches}/${ledger.summary.batches}`);
  lines.push(`- Resolved items: ${ledger.summary.resolved_items}/${ledger.summary.items}`);
  lines.push(`- Owner action required: ${ledger.summary.owner_action_required}`);
  lines.push(`- Public-ready after ledger: ${ledger.summary.public_ready_after_ledger}`);
  lines.push('');
  lines.push('## Resolutions');
  lines.push('');
  lines.push('| Batch | Choice | Status | Items | Policy |');
  lines.push('| --- | --- | --- | ---: | --- |');
  ledger.resolutions.forEach((resolution) => {
    lines.push(`| \`${resolution.batch_id}\` | \`${resolution.owner_choice || 'none'}\` | ${resolution.resolution_status} | ${resolution.resolved_item_count}/${resolution.item_count} | ${resolution.item_policy_after_resolution} |`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  ledger.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  if (ledger.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    ledger.failures.forEach((failure) => lines.push(`- ${failure}`));
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
