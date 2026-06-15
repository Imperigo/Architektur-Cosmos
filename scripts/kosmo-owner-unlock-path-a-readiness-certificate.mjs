#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  fastReplyCard: resolve(root, args.fastReplyCard || `data/kosmo-owner-unlock-fast-reply-card-${dateStamp}.json`),
  fastReplyCardCheck: resolve(root, args.fastReplyCardCheck || `data/kosmo-owner-unlock-fast-reply-card-check-${dateStamp}.json`),
  exactReplyPreview: resolve(root, args.exactReplyPreview || `data/kosmo-owner-unlock-exact-reply-preview-${dateStamp}.json`),
  exactReplyPreviewCheck: resolve(root, args.exactReplyPreviewCheck || `data/kosmo-owner-unlock-exact-reply-preview-check-${dateStamp}.json`),
  activationPreflight: resolve(root, args.activationPreflight || `data/kosmo-source-root-activation-preflight-${dateStamp}.json`),
  sourceRootBlocker: resolve(root, args.sourceRootBlocker || `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-path-a-readiness-certificate-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-path-a-readiness-certificate-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readOptionalJson(path);
  const certificate = buildCertificate(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(certificate, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(certificate));

  console.log('Kosmo owner unlock Path A readiness certificate');
  console.log(`Status: ${certificate.status}`);
  console.log(`Exact preview ready: ${certificate.summary.exact_reply_preview_ready ? 'yes' : 'no'}`);
  console.log(`Can start after exact owner reply: ${certificate.summary.path_a_can_start_after_exact_owner_reply ? 'yes' : 'no'}`);
  console.log(`Applies decision now: ${certificate.summary.applies_decision_now ? 'yes' : 'no'}`);
  console.log(`Failures: ${certificate.summary.failures}`);
  console.log(`Public-ready after certificate: ${certificate.summary.public_ready_after_certificate}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (certificate.failures.length > 0) process.exitCode = 1;
}

function buildCertificate(reports) {
  const failures = [];
  const fastReplyReady = reports.fastReplyCard?.status === 'owner_unlock_fast_reply_card_ready' &&
    reports.fastReplyCardCheck?.status === 'owner_unlock_fast_reply_card_guard_passed';
  const exactPreviewReady = reports.exactReplyPreview?.status === 'owner_unlock_answer_dry_run_ready_for_review' &&
    reports.exactReplyPreviewCheck?.status === 'owner_unlock_answer_dry_run_guard_passed';
  const activationReady = reports.activationPreflight?.summary?.activation_ready === true ||
    reports.activationPreflight?.status === 'source_root_activation_ready_for_private_metadata_diagnostic';
  const sourceRootStillBlocked = reports.sourceRootBlocker?.summary?.private_diagnostic_allowed !== true ||
    !activationReady;

  if (!fastReplyReady) failures.push('Fast reply card is not ready and guarded.');
  if (!exactPreviewReady) failures.push('Exact reply preview is not ready and guarded.');
  if (reports.exactReplyPreview?.summary?.patch_operations < 1) failures.push('Exact reply preview has no proposed patch operations.');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_path_a_readiness_certificate_ready'
      : 'owner_unlock_path_a_readiness_certificate_needs_review',
    policy: {
      review_only: true,
      certificate_only: true,
      records_owner_decision: false,
      writes_intake_file: false,
      mutates_session_files: false,
      runs_source_root_guards: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_certificate: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      fast_reply_ready: fastReplyReady,
      broad_unlock_intent: reports.fastReplyCard?.summary?.broad_unlock_intent === true,
      exact_reply_preview_ready: exactPreviewReady,
      validator_status: reports.exactReplyPreview?.summary?.validator_status || null,
      intake_map_status: reports.exactReplyPreview?.summary?.intake_map_status || null,
      patch_operations: reports.exactReplyPreview?.summary?.patch_operations ?? 0,
      owner_card_patches: reports.exactReplyPreview?.summary?.owner_card_patches ?? 0,
      source_root_activation_status: reports.activationPreflight?.status || null,
      activation_ready_now: activationReady,
      source_root_still_blocked_now: sourceRootStillBlocked,
      path_a_can_start_after_exact_owner_reply: failures.length === 0,
      applies_decision_now: false,
      failures: failures.length,
      public_ready_after_certificate: 0
    },
    exact_reply_required_before_path_a: reports.fastReplyCard?.recommended_reply_if_exact_root_is_true || [],
    safe_default_reply: reports.fastReplyCard?.safe_default_reply || [],
    path_a_next_commands_after_owner_exact_reply: [
      'npm run kosmo:owner-unlock-reply-validator -- --answer "<owner_reply>"',
      'npm run kosmo:owner-unlock-answer-dry-run -- --answer "<owner_reply>"',
      'review data/owner-unlock-dry-runs/<run>/intake-map.json',
      'apply only reviewed owner-intake/session edits',
      'npm run kosmo:source-root-decision-session-check',
      'npm run kosmo:source-root-blocker-refresh',
      'npm run kosmo:source-root-activation-preflight',
      'npm run kosmo:source-root-post-owner-activation-queue',
      'npm run kosmo:source-root-post-owner-activation-queue-check'
    ],
    hard_stops: [
      'Do not treat this certificate as owner approval.',
      'Do not apply the preview patch operations automatically.',
      'Do not run source-root guards from this certificate.',
      'Do not read private content.',
      'Do not run private inventory.',
      'Keep public-ready at 0.'
    ],
    failures
  };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(certificate) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Path A Readiness Certificate');
  lines.push('');
  lines.push(`Generated: ${certificate.generated_at}`);
  lines.push(`Status: \`${certificate.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Fast reply ready: ${certificate.summary.fast_reply_ready ? 'yes' : 'no'}`);
  lines.push(`- Broad unlock intent: ${certificate.summary.broad_unlock_intent ? 'yes' : 'no'}`);
  lines.push(`- Exact reply preview ready: ${certificate.summary.exact_reply_preview_ready ? 'yes' : 'no'}`);
  lines.push(`- Validator: ${certificate.summary.validator_status}`);
  lines.push(`- Intake map: ${certificate.summary.intake_map_status}`);
  lines.push(`- Patch operations: ${certificate.summary.patch_operations}`);
  lines.push(`- Owner card patches: ${certificate.summary.owner_card_patches}`);
  lines.push(`- Source-root activation: ${certificate.summary.source_root_activation_status}`);
  lines.push(`- Activation ready now: ${certificate.summary.activation_ready_now ? 'yes' : 'no'}`);
  lines.push(`- Source-root still blocked now: ${certificate.summary.source_root_still_blocked_now ? 'yes' : 'no'}`);
  lines.push(`- Path A can start after exact owner reply: ${certificate.summary.path_a_can_start_after_exact_owner_reply ? 'yes' : 'no'}`);
  lines.push(`- Applies decision now: ${certificate.summary.applies_decision_now ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after certificate: ${certificate.summary.public_ready_after_certificate}`);
  lines.push('');
  lines.push('## Exact Reply Required Before Path A');
  lines.push('');
  certificate.exact_reply_required_before_path_a.forEach((line) => lines.push(`- \`${line}\``));
  lines.push('');
  lines.push('## Path A Next Commands After Owner Exact Reply');
  lines.push('');
  certificate.path_a_next_commands_after_owner_exact_reply.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  certificate.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  if (certificate.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    certificate.failures.forEach((failure) => lines.push(`- ${failure}`));
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
