#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  ownerAction: resolve(root, args.ownerAction || `data/kosmo-source-root-owner-action-card-${dateStamp}.json`),
  decisionRefresh: resolve(root, args.decisionRefresh || `data/kosmo-source-root-decision-session-refresh-${dateStamp}.json`),
  candidateIntegrity: resolve(root, args.candidateIntegrity || `data/kosmo-source-root-candidate-integrity-check-${dateStamp}.json`),
  decisionCheck: resolve(root, args.decisionCheck || `data/kosmo-source-root-decision-session-check-${dateStamp}.json`),
  decisionSession: resolve(root, args.decisionSession || `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-root-owner-decision-packet-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-owner-decision-packet-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const ownerAction = await readJson(refs.ownerAction);
  const decisionRefresh = await readJson(refs.decisionRefresh);
  const candidateIntegrity = await readJson(refs.candidateIntegrity);
  const decisionCheck = await readJson(refs.decisionCheck);
  const decisionSession = await readJson(refs.decisionSession);
  const packet = buildPacket({ ownerAction, decisionRefresh, candidateIntegrity, decisionCheck, decisionSession });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(packet, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(packet));

  console.log('Kosmo source-root owner decision packet');
  console.log(`Status: ${packet.status}`);
  console.log(`Decision templates: ${packet.summary.decision_templates}`);
  console.log(`Exact root options: ${packet.summary.owner_confirmable_exact_roots}`);
  console.log(`Failures: ${packet.summary.failures}`);
  console.log(`Public-ready after packet: ${packet.summary.public_ready_after_packet}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (packet.failures.length > 0) process.exitCode = 1;
}

function buildPacket({ ownerAction, decisionRefresh, candidateIntegrity, decisionCheck, decisionSession }) {
  const failures = [];
  const ownerSummary = ownerAction.summary || {};
  const refreshSummary = decisionRefresh.summary || {};
  const integritySummary = candidateIntegrity.summary || {};
  const checkSummary = decisionCheck.summary || {};
  const optionChecks = candidateIntegrity.option_checks || [];
  const exactRootOptions = optionChecks.filter((option) => option.guard_class === 'owner_confirmable_exact_root' && option.exists);
  const workflowOptions = optionChecks.filter((option) => option.guard_class === 'workflow_mirror_or_codex_context');
  const assetOptions = optionChecks.filter((option) => option.guard_class === 'asset_material_library_candidate');
  const alreadySatisfied = ownerAction.status === 'source_root_owner_action_satisfied_metadata_only' &&
    decisionCheck.status === 'passed_recorded_private_diagnostic_allowed' &&
    checkSummary.private_diagnostic_allowed === true &&
    decisionSession.status === 'source_root_decision_session_recorded';

  if (alreadySatisfied) {
    return {
      schema_version: '0.1',
      generated_at: new Date().toISOString(),
      status: 'source_root_owner_decision_packet_satisfied_metadata_only',
      policy: {
        owner_prompt_only: true,
        records_decisions: false,
        mutates_decision_session: false,
        reads_private_content: false,
        copies_private_content: false,
        writes_public_files: false,
        writes_public_manifest: false,
        public_ready_after_packet: 0,
        note: 'The owner decision has already been recorded and guarded. This packet is retained as a satisfied metadata-only audit surface.'
      },
      source_refs: Object.values(refs).map((path) => relative(root, path)),
      summary: {
        owner_action_required: false,
        recommended_decision: ownerSummary.recommended_decision || null,
        decision_refresh_status: decisionRefresh.status,
        decision_refresh_options: refreshSummary.refreshed_options ?? null,
        candidate_integrity_status: candidateIntegrity.status,
        visible_path_options: integritySummary.existing_path_options ?? null,
        owner_confirmable_exact_roots: exactRootOptions.length,
        workflow_mirror_options: workflowOptions.length,
        asset_candidate_options: assetOptions.length,
        selected_decision: checkSummary.selected_decision || null,
        selected_root_path: checkSummary.selected_root_path || null,
        private_diagnostic_allowed: true,
        decision_templates: 0,
        failures: 0,
        public_ready_after_packet: 0
      },
      owner_question: {
        id: 'source_root_decision_now',
        prompt: 'Source-root decision has already been recorded and guarded.',
        allowed_answer_shape: {
          selected_decision: decisionSession.allowed_decisions || [],
          selected_root_path: 'already recorded'
        },
        safe_default: 'already_recorded'
      },
      decision_templates: [],
      option_groups: {
        owner_confirmable_exact_roots: exactRootOptions.map(optionSummary),
        workflow_mirrors_keep_blocked: workflowOptions.map(optionSummary),
        asset_sources_for_kosmoasset_review_only: assetOptions.map(optionSummary)
      },
      forbidden_until_after_recorded_owner_decision: [
        'private OCR or PDF/book text extraction',
        'copying private scans, plans, images or lecture material into Git',
        'public-ready promotion for private-source-derived references or assets'
      ],
      exact_next_commands_after_recorded_owner_decision: [
        'npm run kosmo:source-root-decision-session-check',
        'npm run kosmo:source-root-blocker-refresh',
        'npm run kosmo:source-root-activation-preflight',
        'npm run kosmo:private-metadata-inventory',
        'npm run kosmo:private-metadata-inventory-check',
        'npm run kosmo:day-batch-loop'
      ],
      failures: []
    };
  }

  if (ownerAction.status !== 'source_root_owner_action_required') failures.push(`Unexpected owner action status: ${ownerAction.status}`);
  if (![
    'source_root_decision_session_refreshed_pending',
    'source_root_decision_session_refresh_not_needed'
  ].includes(decisionRefresh.status)) failures.push(`Unexpected decision refresh status: ${decisionRefresh.status}`);
  if (candidateIntegrity.status !== 'source_root_candidate_integrity_owner_review_ready') failures.push(`Unexpected candidate integrity status: ${candidateIntegrity.status}`);
  if (decisionCheck.status !== 'passed_pending_owner_input') failures.push(`Unexpected decision check status: ${decisionCheck.status}`);
  if (checkSummary.private_diagnostic_allowed === true) failures.push('Private diagnostic is already allowed; owner decision packet should not remain in pending mode.');
  if (decisionSession.status !== 'source_root_decision_session_pending') failures.push(`Decision session must remain pending: ${decisionSession.status}`);
  if (normalize(decisionSession.selected_decision) || normalize(decisionSession.selected_root_path)) {
    failures.push('Decision session already contains a selected decision/root; packet refused pending-owner mode.');
  }

  const editTemplates = [
    {
      id: 'keep_blocked',
      label: 'Keep source-root blocked',
      when_to_use: 'Owner is not ready to identify the complete private architecture library root.',
      session_fields: {
        status: 'source_root_decision_session_recorded',
        selected_decision: 'keep_blocked',
        selected_root_path: null
      },
      unlocks_private_metadata_diagnostic: false
    },
    {
      id: 'repair_onedrive_first',
      label: 'Repair OneDrive first',
      when_to_use: 'Owner says the intended source root is a OneDrive mirror but sync markers/completeness are not resolved.',
      session_fields: {
        status: 'source_root_decision_session_recorded',
        selected_decision: 'repair_onedrive_first',
        selected_root_path: null
      },
      unlocks_private_metadata_diagnostic: false
    },
    ...exactRootOptions.map((option, index) => ({
      id: `select_exact_root_${index + 1}`,
      label: 'Select visible exact root for metadata diagnostic',
      when_to_use: 'Owner/KosmoOverseer explicitly confirms this exact path is the complete private source root for metadata-only diagnostics.',
      caution: option.reason,
      session_fields: {
        status: 'source_root_decision_session_recorded',
        selected_decision: 'select_existing_root_for_private_diagnostic',
        selected_root_path: option.path
      },
      unlocks_private_metadata_diagnostic: true
    }))
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'source_root_owner_decision_packet_ready'
      : 'source_root_owner_decision_packet_needs_review',
    policy: {
      owner_prompt_only: true,
      records_decisions: false,
      mutates_decision_session: false,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_packet: 0,
      note: 'This packet gives owner/overseer decision templates only. It does not apply a decision or inspect private source contents.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      owner_action_required: ownerSummary.owner_action_required === true,
      recommended_decision: ownerSummary.recommended_decision || null,
      decision_refresh_status: decisionRefresh.status,
      decision_refresh_options: refreshSummary.refreshed_options ?? null,
      candidate_integrity_status: candidateIntegrity.status,
      visible_path_options: integritySummary.existing_path_options ?? null,
      owner_confirmable_exact_roots: exactRootOptions.length,
      workflow_mirror_options: workflowOptions.length,
      asset_candidate_options: assetOptions.length,
      selected_decision: checkSummary.selected_decision || null,
      selected_root_path: checkSummary.selected_root_path || null,
      private_diagnostic_allowed: checkSummary.private_diagnostic_allowed === true,
      decision_templates: editTemplates.length,
      failures: failures.length,
      public_ready_after_packet: 0
    },
    owner_question: {
      id: 'source_root_decision_now',
      prompt: 'Which exact source-root decision should be recorded now?',
      allowed_answer_shape: {
        selected_decision: decisionSession.allowed_decisions || [],
        selected_root_path: 'absolute path only when selected_decision is select_existing_root_for_private_diagnostic or select_root_after_mount_check'
      },
      safe_default: 'keep_blocked'
    },
    decision_templates: editTemplates,
    option_groups: {
      owner_confirmable_exact_roots: exactRootOptions.map(optionSummary),
      workflow_mirrors_keep_blocked: workflowOptions.map(optionSummary),
      asset_sources_for_kosmoasset_review_only: assetOptions.map(optionSummary)
    },
    forbidden_until_after_recorded_owner_decision: [
      'private metadata inventory against any selected root',
      'private OCR or PDF/book text extraction',
      'copying private scans, plans, images or lecture material into Git',
      'public-ready promotion for private-source-derived references or assets'
    ],
    exact_next_commands_after_recorded_owner_decision: [
      'npm run kosmo:source-root-decision-session-check',
      'npm run kosmo:source-root-blocker-refresh',
      'npm run kosmo:source-root-activation-preflight',
      'npm run kosmo:private-metadata-inventory',
      'npm run kosmo:private-metadata-inventory-check',
      'npm run kosmo:day-batch-loop'
    ],
    failures
  };
}

function optionSummary(option) {
  return {
    id: option.id,
    path: option.path,
    guard_class: option.guard_class,
    score: option.score ?? null,
    reason: option.reason,
    activation_allowed_now: option.activation_allowed_now === true
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(packet) {
  const lines = [];
  lines.push('# Kosmo Source-Root Owner Decision Packet');
  lines.push('');
  lines.push(`Generated: ${packet.generated_at}`);
  lines.push(`Status: \`${packet.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Owner action required: ${packet.summary.owner_action_required ? 'yes' : 'no'}`);
  lines.push(`- Recommended decision: \`${packet.summary.recommended_decision || 'pending'}\``);
  lines.push(`- Decision refresh: ${packet.summary.decision_refresh_status}, options ${packet.summary.decision_refresh_options ?? '-'}`);
  lines.push(`- Candidate integrity: ${packet.summary.candidate_integrity_status}`);
  lines.push(`- Visible path options: ${packet.summary.visible_path_options ?? '-'}`);
  lines.push(`- Owner-confirmable exact roots: ${packet.summary.owner_confirmable_exact_roots}`);
  lines.push(`- Workflow mirrors: ${packet.summary.workflow_mirror_options}`);
  lines.push(`- Asset candidates: ${packet.summary.asset_candidate_options}`);
  lines.push(`- Selected decision: \`${packet.summary.selected_decision || 'pending'}\``);
  lines.push(`- Selected root path: ${packet.summary.selected_root_path ? `\`${packet.summary.selected_root_path}\`` : '`pending`'}`);
  lines.push(`- Private diagnostic allowed: ${packet.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Decision templates: ${packet.summary.decision_templates}`);
  lines.push(`- Failures: ${packet.summary.failures}`);
  lines.push(`- Public-ready after packet: ${packet.summary.public_ready_after_packet}`);
  lines.push('');
  lines.push('## Owner Question');
  lines.push('');
  lines.push(`- \`${packet.owner_question.id}\`: ${packet.owner_question.prompt}`);
  lines.push(`- Safe default: \`${packet.owner_question.safe_default}\``);
  lines.push('');
  lines.push('## Decision Templates');
  lines.push('');
  for (const template of packet.decision_templates) {
    lines.push(`### ${template.id}`);
    lines.push('');
    lines.push(`- Label: ${template.label}`);
    lines.push(`- When: ${template.when_to_use}`);
    if (template.caution) lines.push(`- Caution: ${template.caution}`);
    lines.push(`- Unlocks private metadata diagnostic: ${template.unlocks_private_metadata_diagnostic ? 'yes' : 'no'}`);
    lines.push('- Session fields:');
    lines.push(`  - \`status\`: \`${template.session_fields.status}\``);
    lines.push(`  - \`selected_decision\`: \`${template.session_fields.selected_decision}\``);
    lines.push(`  - \`selected_root_path\`: ${template.session_fields.selected_root_path ? `\`${template.session_fields.selected_root_path}\`` : '`null`'}`);
    lines.push('');
  }
  lines.push('## Option Groups');
  lines.push('');
  renderOptions(lines, 'Owner-confirmable Exact Roots', packet.option_groups.owner_confirmable_exact_roots);
  renderOptions(lines, 'Workflow Mirrors Keep Blocked', packet.option_groups.workflow_mirrors_keep_blocked);
  renderOptions(lines, 'Asset Sources For KosmoAsset Review Only', packet.option_groups.asset_sources_for_kosmoasset_review_only);
  lines.push('## Forbidden Until After Recorded Owner Decision');
  lines.push('');
  packet.forbidden_until_after_recorded_owner_decision.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Exact Next Commands After Recorded Owner Decision');
  lines.push('');
  packet.exact_next_commands_after_recorded_owner_decision.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (packet.failures.length > 0) packet.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  return lines.join('\n');
}

function renderOptions(lines, title, options) {
  lines.push(`### ${title}`);
  lines.push('');
  if (options.length === 0) {
    lines.push('- None.');
    lines.push('');
    return;
  }
  lines.push('| Path | Guard | Score | Activation now | Reason |');
  lines.push('| --- | --- | ---: | --- | --- |');
  options.forEach((option) => {
    lines.push(`| \`${escapePipe(option.path)}\` | ${option.guard_class} | ${option.score ?? '-'} | ${option.activation_allowed_now ? 'yes' : 'no'} | ${escapePipe(option.reason)} |`);
  });
  lines.push('');
}

function normalize(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
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
