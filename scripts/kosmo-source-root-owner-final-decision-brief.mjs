#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  selectionBrief: resolve(root, args.selectionBrief || `data/kosmo-source-root-selection-brief-${dateStamp}.json`),
  decisionPacket: resolve(root, args.decisionPacket || `data/kosmo-source-root-owner-decision-packet-${dateStamp}.json`),
  decisionPacketCheck: resolve(root, args.decisionPacketCheck || `data/kosmo-source-root-owner-decision-packet-check-${dateStamp}.json`),
  decisionSessionCheck: resolve(root, args.decisionSessionCheck || `data/kosmo-source-root-decision-session-check-${dateStamp}.json`),
  activationQueueCheck: resolve(root, args.activationQueueCheck || `data/kosmo-source-root-post-owner-activation-queue-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-root-owner-final-decision-brief-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-owner-final-decision-brief-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {
    selectionBrief: await readJson(refs.selectionBrief),
    decisionPacket: await readJson(refs.decisionPacket),
    decisionPacketCheck: await readJson(refs.decisionPacketCheck),
    decisionSessionCheck: await readJson(refs.decisionSessionCheck),
    activationQueueCheck: await readJson(refs.activationQueueCheck)
  };
  const brief = buildBrief(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(brief, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(brief));

  console.log('Kosmo source-root owner final decision brief');
  console.log(`Status: ${brief.status}`);
  console.log(`Decision options: ${brief.summary.decision_options}`);
  console.log(`Unlock options: ${brief.summary.unlock_options}`);
  console.log(`Recommended default: ${brief.summary.recommended_default}`);
  console.log(`Failures: ${brief.summary.failures}`);
  console.log(`Public-ready after brief: ${brief.summary.public_ready_after_brief}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (brief.failures.length > 0) process.exitCode = 1;
}

function buildBrief({ selectionBrief, decisionPacket, decisionPacketCheck, decisionSessionCheck, activationQueueCheck }) {
  const failures = [];
  if (selectionBrief.status !== 'source_root_owner_selection_needed') failures.push(`Selection brief not owner-needed: ${selectionBrief.status}`);
  if (decisionPacket.status !== 'source_root_owner_decision_packet_ready') failures.push(`Decision packet not ready: ${decisionPacket.status}`);
  if (decisionPacketCheck.status !== 'source_root_owner_decision_packet_guard_passed') failures.push(`Decision packet guard not passed: ${decisionPacketCheck.status}`);
  if (decisionSessionCheck.status !== 'passed_pending_owner_input') failures.push(`Decision session is not pending owner input: ${decisionSessionCheck.status}`);
  if (activationQueueCheck.status !== 'source_root_post_owner_activation_queue_guard_passed') failures.push(`Activation queue guard not passed: ${activationQueueCheck.status}`);

  const templates = decisionPacket.decision_templates || [];
  const unlockTemplates = templates.filter((template) => template.unlocks_private_metadata_diagnostic === true);
  const visibleOptions = selectionBrief.selection_options || selectionBrief.top_options || selectionBrief.options || [];
  const answerChoices = templates.map((template) => ({
    id: template.id,
    label: template.label,
    selected_decision: template.session_fields?.selected_decision || null,
    selected_root_path: template.session_fields?.selected_root_path || null,
    unlocks_private_metadata_diagnostic: template.unlocks_private_metadata_diagnostic === true,
    when_to_use: template.when_to_use,
    caution: template.caution || null
  }));

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'source_root_owner_final_decision_brief_ready'
      : 'source_root_owner_final_decision_brief_needs_review',
    policy: {
      owner_brief_only: true,
      records_decisions: false,
      mutates_decision_session: false,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_inventory_now: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_brief: 0,
      note: 'This brief presents the final owner decision choices. It does not apply any choice.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      selection_status: selectionBrief.status,
      decision_packet_status: decisionPacket.status,
      decision_packet_guard_status: decisionPacketCheck.status,
      decision_session_status: decisionSessionCheck.status,
      activation_queue_guard_status: activationQueueCheck.status,
      locator_candidates: selectionBrief.summary?.candidates ?? null,
      probable_private_libraries: selectionBrief.summary?.probable_large_private_libraries ?? null,
      workflow_or_project_mirrors: selectionBrief.summary?.workflow_or_project_mirrors ?? null,
      onedrive_like_roots: selectionBrief.summary?.onedrive_like_roots ?? null,
      roots_with_sync_errors: selectionBrief.summary?.roots_with_sync_errors ?? null,
      decision_options: answerChoices.length,
      unlock_options: unlockTemplates.length,
      recommended_default: 'repair_onedrive_first_or_keep_blocked',
      selected_decision: decisionSessionCheck.summary?.selected_decision || null,
      private_diagnostic_allowed: decisionSessionCheck.summary?.private_diagnostic_allowed === true,
      failures: failures.length,
      public_ready_after_brief: 0
    },
    owner_prompt: {
      question: 'Welchen Source-Root-Entscheid soll Kosmo jetzt verwenden?',
      safe_default: 'Wenn du nicht 100% sicher bist, waehle repair_onedrive_first oder keep_blocked.',
      exact_unlock_warning: 'Die unlockende Option darf nur verwendet werden, wenn der angezeigte Pfad exakt die vollstaendige private Architekturquelle ist.'
    },
    answer_choices: answerChoices,
    visible_source_root_candidates: visibleOptions.slice(0, 10).map((option) => ({
      id: option.id,
      path: option.path || null,
      classification: option.classification || null,
      role_guess: option.role_guess || null,
      score: option.score ?? null,
      safe_default: option.safe_default || 'keep_blocked',
      recommended_action: option.recommended_action || null
    })),
    post_decision_command_order: [
      'npm run kosmo:source-root-decision-session-check',
      'npm run kosmo:source-root-blocker-refresh',
      'npm run kosmo:source-root-activation-preflight',
      'npm run kosmo:source-root-post-owner-activation-queue',
      'npm run kosmo:source-root-post-owner-activation-queue-check'
    ],
    hard_stops: [
      'Do not edit the decision session from this brief without explicit owner confirmation.',
      'Do not run private metadata inventory while private_diagnostic_allowed is false.',
      'Do not run OCR/PDF extraction from private sources at this stage.',
      'Do not set public-ready from this source-root decision.'
    ],
    failures
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(brief) {
  const lines = [];
  lines.push('# Kosmo Source-Root Owner Final Decision Brief');
  lines.push('');
  lines.push(`Generated: ${brief.generated_at}`);
  lines.push(`Status: \`${brief.status}\``);
  lines.push('');
  lines.push('## Owner Prompt');
  lines.push('');
  lines.push(brief.owner_prompt.question);
  lines.push('');
  lines.push(`Safe default: ${brief.owner_prompt.safe_default}`);
  lines.push('');
  lines.push(`Warning: ${brief.owner_prompt.exact_unlock_warning}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Selection status: ${brief.summary.selection_status}`);
  lines.push(`- Decision packet: ${brief.summary.decision_packet_status}`);
  lines.push(`- Packet guard: ${brief.summary.decision_packet_guard_status}`);
  lines.push(`- Decision session: ${brief.summary.decision_session_status}`);
  lines.push(`- Activation queue guard: ${brief.summary.activation_queue_guard_status}`);
  lines.push(`- Locator candidates: ${brief.summary.locator_candidates}`);
  lines.push(`- Probable private libraries: ${brief.summary.probable_private_libraries}`);
  lines.push(`- Workflow/project mirrors: ${brief.summary.workflow_or_project_mirrors}`);
  lines.push(`- OneDrive-like roots: ${brief.summary.onedrive_like_roots}`);
  lines.push(`- Roots with sync errors: ${brief.summary.roots_with_sync_errors}`);
  lines.push(`- Decision options: ${brief.summary.decision_options}`);
  lines.push(`- Unlock options: ${brief.summary.unlock_options}`);
  lines.push(`- Recommended default: ${brief.summary.recommended_default}`);
  lines.push(`- Private diagnostic allowed: ${brief.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after brief: ${brief.summary.public_ready_after_brief}`);
  lines.push('');
  lines.push('## Answer Choices');
  lines.push('');
  lines.push('| Choice | Decision | Root | Unlocks private metadata diagnostic | When to use |');
  lines.push('| --- | --- | --- | --- | --- |');
  brief.answer_choices.forEach((choice) => {
    lines.push(`| \`${choice.id}\` | \`${choice.selected_decision}\` | ${choice.selected_root_path ? `\`${choice.selected_root_path}\`` : '-'} | ${choice.unlocks_private_metadata_diagnostic ? 'yes' : 'no'} | ${escapePipe(choice.when_to_use)} |`);
  });
  lines.push('');
  lines.push('## Visible Candidates');
  lines.push('');
  lines.push('| Candidate | Role | Score | Path | Safe default |');
  lines.push('| --- | --- | ---: | --- | --- |');
  brief.visible_source_root_candidates.forEach((candidate) => {
    lines.push(`| \`${candidate.id}\` | ${candidate.role_guess || candidate.classification || '-'} | ${candidate.score ?? '-'} | ${candidate.path ? `\`${escapePipe(candidate.path)}\`` : '-'} | ${candidate.safe_default} |`);
  });
  lines.push('');
  lines.push('## Post-Decision Command Order');
  lines.push('');
  brief.post_decision_command_order.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  brief.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (brief.failures.length > 0) brief.failures.forEach((failure) => lines.push(`- ${failure}`));
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
