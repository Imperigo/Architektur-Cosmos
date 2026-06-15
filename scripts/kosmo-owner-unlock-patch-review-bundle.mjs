#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const previewPath = resolve(root, args.preview || `data/kosmo-owner-unlock-exact-reply-preview-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-patch-review-bundle-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-patch-review-bundle-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const preview = await readJson(previewPath);
  const intakeMapPath = resolve(root, preview.dry_run_outputs?.intake_map || '');
  const intakeMapCheckPath = resolve(root, preview.dry_run_outputs?.intake_map_check || '');
  const intakeMap = await readJson(intakeMapPath);
  const intakeMapCheck = await readJson(intakeMapCheckPath);
  const bundle = buildBundle({ preview, intakeMap, intakeMapCheck, intakeMapPath, intakeMapCheckPath });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(bundle, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(bundle));

  console.log('Kosmo owner unlock patch review bundle');
  console.log(`Status: ${bundle.status}`);
  console.log(`Patch operations: ${bundle.summary.patch_operations}`);
  console.log(`Source-root patches: ${bundle.summary.source_root_patches}`);
  console.log(`Owner-card patches: ${bundle.summary.owner_card_patches}`);
  console.log(`Applies patch now: ${bundle.summary.applies_patch_now ? 'yes' : 'no'}`);
  console.log(`Public-ready after bundle: ${bundle.summary.public_ready_after_bundle}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (bundle.failures.length > 0) process.exitCode = 1;
}

function buildBundle({ preview, intakeMap, intakeMapCheck, intakeMapPath, intakeMapCheckPath }) {
  const failures = [];
  if (preview.status !== 'owner_unlock_answer_dry_run_ready_for_review') failures.push(`Preview not ready: ${preview.status}`);
  if (intakeMap.status !== 'owner_unlock_reply_intake_map_ready_for_review') failures.push(`Intake map not ready: ${intakeMap.status}`);
  if (intakeMapCheck.status !== 'owner_unlock_reply_intake_map_guard_passed') failures.push(`Intake map check not passed: ${intakeMapCheck.status}`);

  const patchOperations = intakeMap.patch_operations || [];
  const sourceRootOperations = patchOperations.filter((operation) => operation.target === 'source_root_answer');
  const ownerCardOperations = patchOperations.filter((operation) => operation.target.startsWith('owner_card_answers.'));
  if (sourceRootOperations.length !== 1) failures.push(`Expected 1 source-root patch, found ${sourceRootOperations.length}.`);
  if (ownerCardOperations.length !== 5) failures.push(`Expected 5 owner-card patches, found ${ownerCardOperations.length}.`);
  if (patchOperations.some((operation) => operation.value?.public_ready_after_card > 0 || operation.value?.public_ready_after_decision > 0)) {
    failures.push('At least one patch would set public-ready above 0.');
  }
  if (ownerCardOperations.some((operation) => operation.value?.allowed_by_template !== true)) {
    failures.push('At least one owner-card patch is not allowed by the template.');
  }

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_patch_review_bundle_ready'
      : 'owner_unlock_patch_review_bundle_needs_review',
    policy: {
      review_only: true,
      bundle_only: true,
      applies_patch_now: false,
      writes_intake_file: false,
      records_decisions: false,
      mutates_session_files: false,
      runs_source_root_guards: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_bundle: 0
    },
    source_refs: [
      relative(root, previewPath),
      relative(root, intakeMapPath),
      relative(root, intakeMapCheckPath)
    ],
    summary: {
      preview_status: preview.status,
      intake_map_status: intakeMap.status,
      intake_map_check_status: intakeMapCheck.status,
      patch_operations: patchOperations.length,
      source_root_patches: sourceRootOperations.length,
      owner_card_patches: ownerCardOperations.length,
      reference_decision_patches: (intakeMap.proposed_intake_patch?.reference_decision_answers || []).length,
      allowed_owner_card_patches: ownerCardOperations.filter((operation) => operation.value?.allowed_by_template === true).length,
      applies_patch_now: false,
      failures: failures.length,
      public_ready_after_bundle: 0
    },
    proposed_patch_operations: patchOperations,
    proposed_intake_patch: intakeMap.proposed_intake_patch,
    review_sequence_before_any_apply: [
      'Claude/Codex review this bundle and the intake-map guard.',
      'Owner sends the exact reply in the same turn or a newer turn.',
      'Apply only the listed fields to the owner answer intake template.',
      'Run npm run kosmo:owner-answer-intake-check.',
      'Run npm run kosmo:owner-answer-session-edit-plan.',
      'Only then run source-root decision/session guards.'
    ],
    hard_stops: [
      'Do not apply this bundle automatically.',
      'Do not write the intake template from this bundle.',
      'Do not mutate session files from this bundle.',
      'Do not run source-root guards from this bundle.',
      'Do not read private content.',
      'Keep public-ready at 0.'
    ],
    failures
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(bundle) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Patch Review Bundle');
  lines.push('');
  lines.push(`Generated: ${bundle.generated_at}`);
  lines.push(`Status: \`${bundle.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Preview status: ${bundle.summary.preview_status}`);
  lines.push(`- Intake map status: ${bundle.summary.intake_map_status}`);
  lines.push(`- Intake map check: ${bundle.summary.intake_map_check_status}`);
  lines.push(`- Patch operations: ${bundle.summary.patch_operations}`);
  lines.push(`- Source-root patches: ${bundle.summary.source_root_patches}`);
  lines.push(`- Owner-card patches: ${bundle.summary.owner_card_patches}`);
  lines.push(`- Applies patch now: ${bundle.summary.applies_patch_now ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after bundle: ${bundle.summary.public_ready_after_bundle}`);
  lines.push('');
  lines.push('## Proposed Patch Operations');
  lines.push('');
  bundle.proposed_patch_operations.forEach((operation) => {
    lines.push(`- ${operation.operation} -> \`${operation.target}\``);
  });
  lines.push('');
  lines.push('## Review Sequence Before Any Apply');
  lines.push('');
  bundle.review_sequence_before_any_apply.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  bundle.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  if (bundle.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    bundle.failures.forEach((failure) => lines.push(`- ${failure}`));
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
