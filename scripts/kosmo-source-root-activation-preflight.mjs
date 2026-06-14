#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  storageSnapshot: resolve(root, args.storageSnapshot || `data/kosmo-storage-mount-snapshot-${dateStamp}.json`),
  decisionCheck: resolve(root, args.decisionCheck || `data/kosmo-source-root-decision-session-check-${dateStamp}.json`),
  blockerRefresh: resolve(root, args.blockerRefresh || `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`),
  privateInventoryPlan: resolve(root, args.privateInventoryPlan || `data/kosmo-private-source-inventory-plan-${dateStamp}.json`),
  privateInventoryTemplate: resolve(root, args.privateInventoryTemplate || `examples/kosmo-references/private-inventory/private-inventory-output-template-${dateStamp}.json`),
  privateInventoryCheck: resolve(root, args.privateInventoryCheck || `data/kosmo-private-inventory-output-check-${dateStamp}.json`),
  localModelInventory: resolve(root, args.localModelInventory || `data/kosmo-local-model-inventory-${dateStamp}.json`),
  workerBoundaryCheck: resolve(root, args.workerBoundaryCheck || `data/kosmo-worker-boundary-pack-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-root-activation-preflight-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-activation-preflight-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const loaded = {};
  for (const [key, path] of Object.entries(refs)) loaded[key] = await readOptionalJson(path);

  const report = await buildReport(loaded);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo source-root activation preflight');
  console.log(`Status: ${report.status}`);
  console.log(`Selected root: ${report.summary.selected_root_path || 'pending'}`);
  console.log(`Activation ready: ${report.summary.activation_ready ? 'yes' : 'no'}`);
  console.log(`Safe commands: ${report.summary.safe_command_count}`);
  console.log(`Blocked commands: ${report.summary.blocked_command_count}`);
  console.log(`Public-ready after preflight: ${report.summary.public_ready_after_preflight}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function buildReport(loaded) {
  const decision = loaded.decisionCheck?.summary || {};
  const storage = loaded.storageSnapshot?.summary || {};
  const blocker = loaded.blockerRefresh?.summary || {};
  const plan = loaded.privateInventoryPlan || {};
  const selectedRootPath = decision.selected_root_path || null;
  const selectedRootExistsNow = selectedRootPath ? await pathExists(selectedRootPath) : false;
  const privateDiagnosticAllowed = decision.private_diagnostic_allowed === true && selectedRootExistsNow;
  const inventoryContractPassed = [
    'private_inventory_output_contract_passed',
    'private_inventory_output_contract_passed_with_warnings'
  ].includes(loaded.privateInventoryCheck?.status);
  const workerBoundaryPassed = loaded.workerBoundaryCheck?.status === 'worker_boundary_pack_guard_passed';
  const localModelsReady = loaded.localModelInventory?.status === 'local_model_inventory_ready_review_only';
  const privateRoot = plan.output_contract?.private_root || '/mnt/data/ArchitekturKosmos/KosmoZentrale/sources/private-inventory';
  const privateRootOutsideRepo = !resolve(privateRoot).startsWith(root);
  const activationReady = privateDiagnosticAllowed && inventoryContractPassed && workerBoundaryPassed && localModelsReady && privateRootOutsideRepo;

  const baseSequence = [
    command('storage_snapshot', 'npm run kosmo:storage-mount-snapshot', 'refresh mount metadata only'),
    command('source_root_locator', 'npm run kosmo:source-root-locator', 'refresh source-root candidate metadata'),
    command('source_root_selection_brief', 'npm run kosmo:source-root-selection-brief', 'refresh owner selection worksheet'),
    command('source_root_decision_check', 'npm run kosmo:source-root-decision-session-check', 'verify selected root and owner decision'),
    command('source_root_blocker_refresh', 'npm run kosmo:source-root-blocker-refresh', 'summarize blocker state'),
    command('private_source_inventory_plan', 'npm run kosmo:private-source-inventory-plan', 'build pilot-first metadata inventory scope'),
    command('private_inventory_output_template', 'npm run kosmo:private-inventory-output-template', 'refresh safe private-output contract template'),
    command('private_inventory_output_check', 'npm run kosmo:private-inventory-output-check', 'verify output contract contains no private content'),
    command('data_lane_sweep', 'npm run kosmo:data-lane-sweep', 'refresh KosmoReferences/KosmoAsset guard state'),
    command('data_lane_router', 'npm run kosmo:data-lane-command-router', 'refresh safe command routing'),
    command('worker_boundary_pack', 'npm run kosmo:worker-boundary-pack', 'refresh worker boundary map'),
    command('worker_boundary_pack_check', 'npm run kosmo:worker-boundary-pack-check', 'verify worker boundaries'),
    command('day_batch_loop', 'npm run kosmo:day-batch-loop', 'rerun full review-only loop before any handoff')
  ];
  const privateSequence = selectedRootPath
    ? [
        command(
          'private_library_diagnostic_selected_root',
          `npm run kosmo:private-library-diagnostic -- --roots "${selectedRootPath}"`,
          'metadata-only diagnostic for the owner-approved root'
        ),
        command(
          'private_metadata_inventory_selected_root',
          `npm run kosmo:private-metadata-inventory -- --root "${selectedRootPath}"`,
          'pilot-scoped metadata inventory for the owner-approved root'
        )
      ]
    : [];

  const blockedCommands = privateDiagnosticAllowed
    ? []
    : [
        command('private_library_diagnostic_without_root', 'npm run kosmo:private-library-diagnostic -- --roots "<selected-root>"', 'blocked until source-root decision check allows private diagnostic'),
        command('private_metadata_inventory_without_activation', 'npm run kosmo:private-metadata-inventory -- --root "<selected-root>"', 'blocked until source-root activation preflight is ready'),
        command('private_ocr_or_extraction', 'local OCR/PDF extraction on private files', 'blocked until source-root, scope and output guards pass'),
        command('public_promotion', 'any public-ready promotion', 'blocked until provenance, rights and owner review pass')
      ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: activationReady
      ? 'source_root_activation_ready_for_private_metadata_diagnostic'
      : privateDiagnosticAllowed
        ? 'source_root_activation_needs_contract_review'
        : 'source_root_activation_waiting_for_owner_storage_action',
    policy: {
      metadata_only: true,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_preflight: 0,
      note: 'This preflight converts existing guard reports into an activation sequence. It does not select a source root or read private files.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      data_mount_visible: storage.data_mount_visible === true,
      data_mount_available_gib: storage.data_mount_available_gib ?? null,
      archive_mount_visible: storage.archive_mount_visible === true,
      onedrive_marker_files: blocker.onedrive_marker_files ?? null,
      source_root_probable_libraries: blocker.source_root_probable_libraries ?? null,
      source_root_decision_status: loaded.decisionCheck?.status || null,
      selected_decision: decision.selected_decision || null,
      selected_root_path: selectedRootPath,
      selected_root_exists: selectedRootExistsNow,
      private_diagnostic_allowed: privateDiagnosticAllowed,
      private_inventory_plan_status: loaded.privateInventoryPlan?.status || null,
      private_inventory_contract_status: loaded.privateInventoryCheck?.status || null,
      local_model_inventory_status: loaded.localModelInventory?.status || null,
      worker_boundary_status: loaded.workerBoundaryCheck?.status || null,
      private_root: privateRoot,
      private_root_outside_repo: privateRootOutsideRepo,
      activation_ready: activationReady,
      safe_command_count: baseSequence.length + privateSequence.length,
      blocked_command_count: blockedCommands.length,
      public_ready_after_preflight: 0
    },
    pilot_scope: (plan.inventory_scope || defaultPilotScope()).map((item) => ({
      pilot_id: item.pilot_id,
      title: item.title,
      first_pass: item.first_pass,
      source_need: item.source_need,
      allowed_after_activation: activationReady,
      public_ready_after_inventory: false
    })),
    safe_activation_sequence: privateDiagnosticAllowed
      ? [...baseSequence.slice(0, 5), ...privateSequence, ...baseSequence.slice(5)]
      : baseSequence,
    blocked_commands: blockedCommands,
    git_guard: {
      private_root: privateRoot,
      private_root_outside_repo: privateRootOutsideRepo,
      allowed_in_git: plan.output_contract?.public_repo_outputs_allowed || [
        'metadata counts',
        'file path fingerprints',
        'rights status placeholders',
        'gap summaries written in own words'
      ],
      forbidden_in_git: plan.output_contract?.public_repo_outputs_forbidden || [
        'book scans',
        'PDF full text',
        'protected plans or screenshots',
        'private images',
        'long quotations',
        'public-ready promotion flags'
      ]
    },
    handoff_for_workers: {
      codex: 'Maintain this preflight and review-only gates; do not infer a source root.',
      claude_code: 'If you edit source-root sessions or private inventory flows, leave a dated handoff and rerun this preflight.',
      local_llm: 'After activation, only process pilot-scoped metadata tasks and return contract-checked outputs.',
      kosmo_overseer: 'Treat activation_ready=true as permission for metadata diagnostics only, not as public promotion.'
    },
    next_actions: activationReady
      ? [
          'Run the safe activation sequence in order.',
          'Keep pilot scope limited to Villa Savoye, Kapelle Sogn Benedetg and Alterszentrum Kloster Ingenbohl.',
          'Run private inventory output check before handing any metadata back to Codex/Claude.',
          'Keep public-ready false until rights/provenance review passes.'
        ]
      : [
          'Owner/KosmoOverseer selects or mounts a real private source root.',
          'Rerun source-root locator, selection brief, decision-session check and blocker refresh.',
          'Do not run private OCR, extraction, copying or public promotion.'
        ]
  };
}

function command(id, commandLine, purpose) {
  return { id, command: commandLine, purpose };
}

function defaultPilotScope() {
  return [
    {
      pilot_id: 'villa-savoye',
      title: 'Villa Savoye',
      first_pass: 'metadata_only_media_plan_model_provenance',
      source_need: 'file-level provenance and build-log evidence for existing media, diagrams and low.glb'
    },
    {
      pilot_id: 'kapelle-sogn-benedetg',
      title: 'Kapelle Sogn Benedetg',
      first_pass: 'metadata_only_private_library_source_discovery',
      source_need: 'private book/ETH/HSLU references for timber structure, drawings, materials and model basis'
    },
    {
      pilot_id: 'alterszentrum-kloster-ingenbohl',
      title: 'Alterszentrum Kloster Ingenbohl',
      first_pass: 'metadata_only_pdf_and_structure_source_discovery',
      source_need: 'private/link-only study-commission PDF decision, structure/material evidence and model basis'
    }
  ];
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Source-Root Activation Preflight');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Data mount visible: ${report.summary.data_mount_visible ? 'yes' : 'no'}`);
  lines.push(`- Data mount available GiB: ${report.summary.data_mount_available_gib ?? 'unknown'}`);
  lines.push(`- Archive mount visible: ${report.summary.archive_mount_visible ? 'yes' : 'no'}`);
  lines.push(`- OneDrive marker files: ${report.summary.onedrive_marker_files ?? 'unknown'}`);
  lines.push(`- Source-root decision: ${report.summary.source_root_decision_status || 'missing'}`);
  lines.push(`- Selected root: ${report.summary.selected_root_path ? `\`${report.summary.selected_root_path}\`` : '`pending`'}`);
  lines.push(`- Selected root exists: ${report.summary.selected_root_exists ? 'yes' : 'no'}`);
  lines.push(`- Private diagnostic allowed: ${report.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Private inventory plan: ${report.summary.private_inventory_plan_status || 'missing'}`);
  lines.push(`- Private inventory contract: ${report.summary.private_inventory_contract_status || 'missing'}`);
  lines.push(`- Local models: ${report.summary.local_model_inventory_status || 'missing'}`);
  lines.push(`- Worker boundary: ${report.summary.worker_boundary_status || 'missing'}`);
  lines.push(`- Private root outside repo: ${report.summary.private_root_outside_repo ? 'yes' : 'no'}`);
  lines.push(`- Activation ready: ${report.summary.activation_ready ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after preflight: ${report.summary.public_ready_after_preflight}`);
  lines.push('');
  lines.push('## Pilot Scope');
  lines.push('');
  lines.push('| Pilot | First pass | Allowed after activation | Source need |');
  lines.push('| --- | --- | --- | --- |');
  report.pilot_scope.forEach((item) => {
    lines.push(`| ${escapePipe(item.title)} | \`${item.first_pass}\` | ${item.allowed_after_activation ? 'yes' : 'no'} | ${escapePipe(item.source_need)} |`);
  });
  lines.push('');
  lines.push('## Safe Activation Sequence');
  lines.push('');
  report.safe_activation_sequence.forEach((item, index) => {
    lines.push(`${index + 1}. \`${item.command}\` - ${item.purpose}`);
  });
  lines.push('');
  lines.push('## Blocked Commands');
  lines.push('');
  if (report.blocked_commands.length === 0) lines.push('- None for metadata diagnostics; private content extraction and public promotion still require later gates.');
  else report.blocked_commands.forEach((item) => lines.push(`- \`${item.command}\` - ${item.purpose}`));
  lines.push('');
  lines.push('## Git Guard');
  lines.push('');
  lines.push(`Private root: \`${report.git_guard.private_root}\``);
  lines.push('');
  lines.push('Allowed in Git/public repo:');
  report.git_guard.allowed_in_git.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('Forbidden in Git/public repo:');
  report.git_guard.forbidden_in_git.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
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
