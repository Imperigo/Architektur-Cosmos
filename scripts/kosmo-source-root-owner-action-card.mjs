#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  storageSnapshot: resolve(root, args.storageSnapshot || `data/kosmo-storage-mount-snapshot-${dateStamp}.json`),
  blockerRefresh: resolve(root, args.blockerRefresh || `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`),
  selectionBrief: resolve(root, args.selectionBrief || `data/kosmo-source-root-selection-brief-${dateStamp}.json`),
  decisionSession: resolve(root, args.decisionSession || `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`),
  decisionCheck: resolve(root, args.decisionCheck || `data/kosmo-source-root-decision-session-check-${dateStamp}.json`),
  activationPreflight: resolve(root, args.activationPreflight || `data/kosmo-source-root-activation-preflight-${dateStamp}.json`),
  metadataInventoryCheck: resolve(root, args.metadataInventoryCheck || `data/kosmo-private-metadata-inventory-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-root-owner-action-card-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-owner-action-card-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const loaded = {};
  for (const [key, path] of Object.entries(refs)) loaded[key] = await readOptionalJson(path);
  const card = buildCard(loaded);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(card, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(card));

  console.log('Kosmo source-root owner action card');
  console.log(`Status: ${card.status}`);
  console.log(`Owner action: ${card.summary.owner_action_required ? 'yes' : 'no'}`);
  console.log(`Recommended decision: ${card.summary.recommended_decision}`);
  console.log(`Candidate roots: ${card.summary.candidate_roots}`);
  console.log(`Public-ready after card: ${card.summary.public_ready_after_card}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildCard(loaded) {
  const storage = loaded.storageSnapshot?.summary || {};
  const blocker = loaded.blockerRefresh?.summary || {};
  const selection = loaded.selectionBrief || {};
  const decision = loaded.decisionSession || {};
  const decisionCheck = loaded.decisionCheck || {};
  const activation = loaded.activationPreflight || {};
  const metadataGuard = loaded.metadataInventoryCheck || {};
  const selectedRoot = decisionCheck.summary?.selected_root_path || decision.selected_root_path || null;
  const privateDiagnosticAllowed = decisionCheck.summary?.private_diagnostic_allowed === true;
  const ownerActionRequired = privateDiagnosticAllowed !== true;
  const candidateRoots = (selection.selection_options || []).filter((option) => option.path).slice(0, 8);
  const recommendedDecision = recommendDecision({ storage, blocker, candidateRoots });

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: ownerActionRequired
      ? 'source_root_owner_action_required'
      : 'source_root_owner_action_satisfied_metadata_only',
    policy: {
      decision_card_only: true,
      records_decisions: false,
      mutates_decision_session: false,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_card: 0,
      note: 'This card summarizes the owner action needed to unlock metadata diagnostics. It does not edit the decision session or inspect private sources.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      owner_action_required: ownerActionRequired,
      data_mount_visible: storage.data_mount_visible === true,
      data_mount_available_gib: storage.data_mount_available_gib ?? null,
      archive_mount_visible: storage.archive_mount_visible === true,
      onedrive_marker_files: blocker.onedrive_marker_files ?? null,
      probable_large_private_libraries: blocker.source_root_probable_libraries ?? null,
      workflow_mirrors: blocker.source_root_workflow_mirrors ?? null,
      candidate_roots: candidateRoots.length,
      decision_session_status: decision.status || null,
      decision_check_status: decisionCheck.status || null,
      selected_decision: decisionCheck.summary?.selected_decision || decision.selected_decision || null,
      selected_root_path: selectedRoot,
      selected_root_exists: decisionCheck.summary?.selected_root_exists === true,
      private_diagnostic_allowed: privateDiagnosticAllowed,
      activation_status: activation.status || null,
      metadata_inventory_guard_status: metadataGuard.status || null,
      recommended_decision: recommendedDecision,
      public_ready_after_card: 0
    },
    decision_file: {
      path: relative(root, refs.decisionSession),
      fields_to_set_only_after_owner_confirmation: [
        'status',
        'selected_decision',
        'selected_root_path',
        'owner_confirmation_note'
      ],
      valid_selected_decision_values: decision.allowed_decisions || [
        'keep_blocked',
        'mount_archive_first',
        'repair_onedrive_first',
        'select_existing_root_for_private_diagnostic',
        'select_root_after_mount_check'
      ],
      safe_examples: [
        {
          when: 'real complete private library root is visible now',
          status: 'source_root_decision_session_recorded',
          selected_decision: 'select_existing_root_for_private_diagnostic',
          selected_root_path: '<absolute-owner-approved-root>'
        },
        {
          when: 'archive HDD/private library is not mounted yet',
          status: 'source_root_decision_session_recorded',
          selected_decision: 'mount_archive_first',
          selected_root_path: null
        },
        {
          when: 'OneDrive root is intended but sync markers remain unresolved',
          status: 'source_root_decision_session_recorded',
          selected_decision: 'repair_onedrive_first',
          selected_root_path: null
        }
      ]
    },
    candidate_roots: candidateRoots.map((option) => ({
      id: option.id,
      path: option.path,
      score: option.score ?? null,
      caution: cautionFor(option.path)
    })),
    exact_next_commands_after_owner_edit: [
      'npm run kosmo:storage-mount-snapshot',
      'npm run kosmo:source-root-locator',
      'npm run kosmo:source-root-selection-brief',
      'npm run kosmo:source-root-decision-session-check',
      'npm run kosmo:source-root-blocker-refresh',
      'npm run kosmo:source-root-activation-preflight',
      'npm run kosmo:private-metadata-inventory',
      'npm run kosmo:private-metadata-inventory-fixture-smoke',
      'npm run kosmo:private-metadata-inventory-check',
      'npm run kosmo:day-batch-loop'
    ],
    still_forbidden_until_later_gates: [
      'private OCR or PDF/book text extraction',
      'copying private scans, images, plans or lecture material into Git',
      'public-ready promotion for Sogn Benedetg, Ingenbohl or source-dependent assets',
      'local LLM tasks that read private file contents'
    ],
    owner_prompt: ownerActionRequired
      ? [
          'Please confirm one exact source-root decision.',
          'If the real library is mounted, provide the absolute path.',
          'If it is not mounted, confirm whether to mount archive first or repair OneDrive first.'
        ]
      : [
          'Source-root owner action is satisfied for metadata diagnostics only.',
          'Continue with guarded private metadata inventory and output checks.'
        ]
  };
}

function recommendDecision({ storage, blocker, candidateRoots }) {
  if (blocker.private_diagnostic_allowed === true) return 'already_allowed';
  if (storage.archive_mount_visible !== true) return 'mount_archive_first_or_confirm_non_archive_root';
  if ((blocker.onedrive_marker_files ?? 0) > 0) return 'repair_onedrive_first_or_confirm_complete_non_onedrive_root';
  if (candidateRoots.length > 0) return 'select_existing_root_for_private_diagnostic_after_owner_confirmation';
  return 'keep_blocked';
}

function cautionFor(path) {
  const lower = String(path || '').toLowerCase();
  if (lower.includes('11_ai_workflow') || lower.includes('kosmowebsite')) return 'workflow/project mirror; likely not the full private architecture library';
  if (lower === '/mnt/data/architekturkosmos') return 'project root; only valid if owner confirms it contains the complete private library';
  if (lower.includes('onedrive')) return 'OneDrive-like path; verify sync markers and completeness';
  if (lower.includes('/mnt/archiv')) return 'archive path; verify it is an own mounted archive disk';
  return 'requires owner confirmation before use';
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(card) {
  const lines = [];
  lines.push('# Kosmo Source-Root Owner Action Card');
  lines.push('');
  lines.push(`Generated: ${card.generated_at}`);
  lines.push(`Status: \`${card.status}\``);
  lines.push('');
  lines.push('## Current State');
  lines.push('');
  lines.push(`- Owner action required: ${card.summary.owner_action_required ? 'yes' : 'no'}`);
  lines.push(`- Data mount visible: ${card.summary.data_mount_visible ? 'yes' : 'no'}`);
  lines.push(`- Data mount free GiB: ${card.summary.data_mount_available_gib ?? 'unknown'}`);
  lines.push(`- Archive mount visible: ${card.summary.archive_mount_visible ? 'yes' : 'no'}`);
  lines.push(`- OneDrive marker files: ${card.summary.onedrive_marker_files ?? 'unknown'}`);
  lines.push(`- Probable large private libraries: ${card.summary.probable_large_private_libraries ?? 'unknown'}`);
  lines.push(`- Workflow mirrors: ${card.summary.workflow_mirrors ?? 'unknown'}`);
  lines.push(`- Selected decision: ${card.summary.selected_decision || 'pending'}`);
  lines.push(`- Selected root: ${card.summary.selected_root_path ? `\`${card.summary.selected_root_path}\`` : '`pending`'}`);
  lines.push(`- Private diagnostic allowed: ${card.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Recommended decision: \`${card.summary.recommended_decision}\``);
  lines.push(`- Public-ready after card: ${card.summary.public_ready_after_card}`);
  lines.push('');
  lines.push('## Decision File');
  lines.push('');
  lines.push(`File: \`${card.decision_file.path}\``);
  lines.push('');
  lines.push('Fields to set only after owner confirmation:');
  card.decision_file.fields_to_set_only_after_owner_confirmation.forEach((field) => lines.push(`- \`${field}\``));
  lines.push('');
  lines.push('## Candidate Roots');
  lines.push('');
  lines.push('| Candidate | Score | Caution |');
  lines.push('| --- | ---: | --- |');
  card.candidate_roots.forEach((candidate) => {
    lines.push(`| \`${escapePipe(candidate.path)}\` | ${candidate.score ?? '-'} | ${escapePipe(candidate.caution)} |`);
  });
  lines.push('');
  lines.push('## Exact Next Commands After Owner Edit');
  lines.push('');
  card.exact_next_commands_after_owner_edit.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Still Forbidden');
  lines.push('');
  card.still_forbidden_until_later_gates.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Owner Prompt');
  lines.push('');
  card.owner_prompt.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
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
