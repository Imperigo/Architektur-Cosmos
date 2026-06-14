#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-orbit-status-bridge-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-orbit-status-bridge-${dateStamp}.md`);

const refs = {
  dayBatch: `data/kosmo-day-batch-loop-${dateStamp}.json`,
  sourceRoot: `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`,
  sourceRootOwnerAction: `data/kosmo-source-root-owner-action-card-${dateStamp}.json`,
  sourceRootActivation: `data/kosmo-source-root-activation-preflight-${dateStamp}.json`,
  privateMetadataInventory: `data/kosmo-private-metadata-inventory-runner-${dateStamp}.json`,
  privateMetadataInventoryFixture: `data/kosmo-private-metadata-inventory-fixture-smoke-${dateStamp}.json`,
  privateMetadataInventoryCheck: `data/kosmo-private-metadata-inventory-check-${dateStamp}.json`,
  localModelInventory: `data/kosmo-local-model-inventory-${dateStamp}.json`,
  sweep: `data/kosmodata-lane-sweep-${dateStamp}.json`,
  workerBoundary: `data/kosmo-worker-boundary-pack-check-${dateStamp}.json`,
  ownerPacket: `data/kosmo-owner-review-packet-check-${dateStamp}.json`,
  assetBridge: `data/kosmoasset-reference-bridge-check-${dateStamp}.json`,
  assetSourceCandidateMap: `data/kosmoasset-source-candidate-map-${dateStamp}.json`,
  innovationPlan: `data/kosmo-innovation-lane-plan-${dateStamp}.json`,
  innovationSmoke: `data/kosmo-innovation-smoke-${dateStamp}.json`,
  nightLoop: `data/kosmo-night-loop-checkpoint-${dateStamp}.json`
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readOptionalJson(path);
  const bridge = buildBridge(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(bridge, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(bridge));

  console.log('Kosmo Orbit status bridge');
  console.log(`Status: ${bridge.status}`);
  console.log(`Cards: ${bridge.summary.cards}`);
  console.log(`Blocking cards: ${bridge.summary.blocking_cards}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildBridge(reports) {
  const daySummary = reports.dayBatch?.summary || {};
  const sourceSummary = reports.sourceRoot?.summary || {};
  const ownerActionSummary = reports.sourceRootOwnerAction?.summary || {};
  const activationSummary = reports.sourceRootActivation?.summary || {};
  const privateInventorySummary = reports.privateMetadataInventory?.summary || {};
  const privateInventoryFixtureSummary = reports.privateMetadataInventoryFixture?.summary || {};
  const modelSummary = reports.localModelInventory?.summary || {};
  const sweepSummary = reports.sweep?.summary || {};
  const assetBridgeSummary = reports.assetBridge?.summary || {};
  const assetSourceCandidateSummary = reports.assetSourceCandidateMap?.summary || {};
  const innovationSummary = reports.innovationSmoke?.summary || {};
  const cards = [
    {
      id: 'day-batch',
      title: 'Daily Batch',
      status: reports.dayBatch?.status === 'day_batch_loop_passed_review_only' ? 'ready' : 'needs_review',
      signal: `${daySummary.required_passed_steps ?? 0}/${daySummary.required_steps ?? 0} required steps`,
      owner_action_required: false,
      route_hint: 'KosmoReferences/KosmoAsset daily loop',
      source_ref: refs.dayBatch
    },
    {
      id: 'source-root',
      title: 'Source Root',
      status: sourceSummary.private_diagnostic_allowed === true ? 'ready' : 'blocked',
      signal: sourceSummary.private_diagnostic_allowed === true
        ? 'private diagnostic allowed'
        : `blocked: ${sourceSummary.source_root_probable_libraries ?? 0} probable libraries, ${sourceSummary.onedrive_marker_files ?? 0} OneDrive markers`,
      owner_action_required: sourceSummary.private_diagnostic_allowed !== true,
      route_hint: 'Owner/KosmoOverseer must record true private source root',
      source_ref: refs.sourceRoot
    },
    {
      id: 'source-root-owner-action',
      title: 'Source Root Owner Action',
      status: reports.sourceRootOwnerAction?.status === 'source_root_owner_action_satisfied_metadata_only'
        ? 'ready'
        : reports.sourceRootOwnerAction?.status === 'source_root_owner_action_required'
          ? 'blocked'
          : 'needs_review',
      signal: reports.sourceRootOwnerAction?.status === 'source_root_owner_action_required'
        ? `action required: ${ownerActionSummary.recommended_decision || 'select or mount source root'}`
        : `decision ${ownerActionSummary.selected_decision || 'pending'}, root ${ownerActionSummary.selected_root_path || 'pending'}`,
      owner_action_required: ownerActionSummary.owner_action_required !== false,
      route_hint: 'Exact owner edit needed for source-root decision session',
      source_ref: refs.sourceRootOwnerAction
    },
    {
      id: 'source-root-activation',
      title: 'Source Root Activation',
      status: activationSummary.activation_ready === true
        ? 'ready'
        : reports.sourceRootActivation?.status === 'source_root_activation_needs_contract_review'
          ? 'needs_review'
          : 'blocked',
      signal: activationSummary.activation_ready === true
        ? `activation ready for ${activationSummary.selected_root_path}`
        : `${reports.sourceRootActivation?.status || 'missing'}, safe commands ${activationSummary.safe_command_count ?? 0}, blocked ${activationSummary.blocked_command_count ?? 0}`,
      owner_action_required: activationSummary.activation_ready !== true,
      route_hint: 'Post-source-root safe activation sequence',
      source_ref: refs.sourceRootActivation
    },
    {
      id: 'local-models',
      title: 'Local Models',
      status: reports.localModelInventory?.status === 'local_model_inventory_ready_review_only' ? 'review_only_ready' : 'needs_review',
      signal: `${modelSummary.ready_roles ?? 0}/${modelSummary.required_roles ?? 0} roles, ${modelSummary.ollama_model_count ?? 0} Ollama models, ${modelSummary.total_visible_ollama_size_gb ?? 0} GB`,
      owner_action_required: false,
      route_hint: 'Ollama/Odysseus local worker readiness',
      source_ref: refs.localModelInventory
    },
    {
      id: 'private-metadata-inventory',
      title: 'Private Metadata Inventory',
      status: reports.privateMetadataInventory?.status === 'private_metadata_inventory_ready_private_output_written'
        ? 'review_only_ready'
        : reports.privateMetadataInventory?.status === 'private_metadata_inventory_blocked_until_activation'
          ? reports.privateMetadataInventoryFixture?.status === 'private_metadata_inventory_fixture_passed' &&
            reports.privateMetadataInventoryCheck?.status === 'private_metadata_inventory_guard_passed'
            ? 'blocked_with_smoke_passed'
            : 'blocked'
          : 'needs_review',
      signal: reports.privateMetadataInventory?.status === 'private_metadata_inventory_blocked_until_activation'
        ? `blocked until source-root activation; fixture ${privateInventoryFixtureSummary.total_candidate_matches ?? 0} matches; guard ${reports.privateMetadataInventoryCheck?.status || 'missing'}`
        : `${privateInventorySummary.total_candidate_matches ?? 0} candidates, scanned ${privateInventorySummary.files_scanned ?? 0} files`,
      owner_action_required: reports.privateMetadataInventory?.status === 'private_metadata_inventory_blocked_until_activation',
      route_hint: 'Pilot-scoped metadata-only inventory',
      source_ref: refs.privateMetadataInventory
    },
    {
      id: 'pilot-references',
      title: 'Pilot References',
      status: reports.sweep?.status === 'kosmodata_lane_sweep_review_only_passed' ? 'review_only' : 'needs_review',
      signal: `${sweepSummary.pilot_evidence_pilots ?? 0} pilots, ${sweepSummary.pilot_evidence_total_gaps ?? 0} evidence gaps`,
      owner_action_required: (sweepSummary.human_queue_open_items ?? 0) > 0,
      route_hint: 'Villa Savoye / Sogn Benedetg / Ingenbohl',
      source_ref: refs.sweep
    },
    {
      id: 'kosmoasset',
      title: 'KosmoAsset',
      status: sweepSummary.asset_promotion_allowed === true ? 'ready' : 'review_only',
      signal: `${sweepSummary.asset_open_human_reviews ?? 0} human reviews open, public-ready ${sweepSummary.asset_public_ready_count ?? 0}`,
      owner_action_required: (sweepSummary.asset_open_human_reviews ?? 0) > 0,
      route_hint: 'Review-only seed asset lane',
      source_ref: refs.sweep
    },
    {
      id: 'asset-reference-bridge',
      title: 'Asset Reference Bridge',
      status: reports.assetBridge?.status === 'kosmoasset_reference_bridge_review_only_passed' ? 'review_only_ready' : 'needs_review',
      signal: `${assetBridgeSummary.complete_pilot_bridges ?? 0}/${assetBridgeSummary.pilots ?? 0} pilot bridges, ${assetBridgeSummary.asset_count ?? 0} assets, public-ready ${assetBridgeSummary.public_ready_count ?? 0}`,
      owner_action_required: (assetBridgeSummary.open_human_review_count ?? 0) > 0,
      route_hint: 'Villa/Sogn/Ingenbohl asset derivation gate',
      source_ref: refs.assetBridge
    },
    {
      id: 'asset-source-candidates',
      title: 'Asset Source Candidates',
      status: reports.assetSourceCandidateMap?.status === 'kosmoasset_source_candidate_map_review_only_ready' ? 'review_only_ready' : 'needs_review',
      signal: `${assetSourceCandidateSummary.asset_lane_candidates ?? 0} asset-lane candidates, material ${assetSourceCandidateSummary.material_library_candidates ?? 0}, public-ready ${assetSourceCandidateSummary.public_ready_after_map ?? 0}`,
      owner_action_required: (assetSourceCandidateSummary.asset_lane_candidates ?? 0) > 0,
      route_hint: 'Map source-root candidates into KosmoAsset lanes without ingestion',
      source_ref: refs.assetSourceCandidateMap
    },
    {
      id: 'worker-boundary',
      title: 'Worker Boundary',
      status: reports.workerBoundary?.status === 'worker_boundary_pack_guard_passed' ? 'locked' : 'needs_review',
      signal: `${reports.workerBoundary?.summary?.worker_count ?? 0} workers, ${reports.workerBoundary?.summary?.blocked_commands ?? 0} blocked command classes`,
      owner_action_required: false,
      route_hint: 'Local LLM / Codex / Claude task boundary',
      source_ref: refs.workerBoundary
    },
    {
      id: 'innovation',
      title: 'Innovation Lanes',
      status: reports.innovationSmoke?.status === 'innovation_smoke_passed_review_only' ? 'review_only_ready' : 'needs_review',
      signal: `${innovationSummary.passed ?? 0}/${innovationSummary.checks ?? 0} public-safe smoke checks passed`,
      owner_action_required: false,
      route_hint: 'MarkItDown / IfcOpenShell / Qwen / OCR / Paper2Poster',
      source_ref: refs.innovationSmoke
    },
    {
      id: 'owner-handoff',
      title: 'Owner Handoff',
      status: reports.ownerPacket?.status === 'owner_review_packet_guard_passed' ? 'ready' : 'needs_review',
      signal: '6 questions, no filled answers recorded',
      owner_action_required: true,
      route_hint: 'Present source-root and review packet questions',
      source_ref: refs.ownerPacket
    }
  ];
  const blockingCards = cards.filter((card) => card.status === 'blocked' || card.status.startsWith('blocked_') || card.status === 'needs_review');
  const ownerActionCards = cards.filter((card) => card.owner_action_required);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: blockingCards.length === 0 ? 'orbit_bridge_all_ready_review_only' : 'orbit_bridge_ready_with_blockers',
    policy: {
      dashboard_only: true,
      records_decisions: false,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_bridge: 0,
      note: 'This bridge is a dashboard contract for KosmoOrbit. It summarizes existing guard reports only and does not unlock private work.'
    },
    source_refs: Object.values(refs),
    summary: {
      cards: cards.length,
      blocking_cards: blockingCards.length,
      owner_action_cards: ownerActionCards.length,
      source_root_blocked: sourceSummary.private_diagnostic_allowed !== true,
      day_batch_status: reports.dayBatch?.status || null,
      source_root_owner_action_status: reports.sourceRootOwnerAction?.status || null,
      source_root_owner_recommended_decision: ownerActionSummary.recommended_decision || null,
      source_root_activation_status: reports.sourceRootActivation?.status || null,
      private_metadata_inventory_status: reports.privateMetadataInventory?.status || null,
      private_metadata_inventory_fixture_status: reports.privateMetadataInventoryFixture?.status || null,
      private_metadata_inventory_check_status: reports.privateMetadataInventoryCheck?.status || null,
      local_model_inventory_status: reports.localModelInventory?.status || null,
      asset_bridge_status: reports.assetBridge?.status || null,
      asset_source_candidate_map_status: reports.assetSourceCandidateMap?.status || null,
      asset_source_candidate_map_candidates: assetSourceCandidateSummary.asset_lane_candidates ?? null,
      innovation_smoke_status: reports.innovationSmoke?.status || null,
      public_ready_after_bridge: 0
    },
    orbit_cards: cards,
    recommended_orbit_sections: [
      'status_strip',
      'local_models_card',
      'source_root_blocker_card',
      'source_root_owner_action_card',
      'source_root_activation_card',
      'private_metadata_inventory_card',
      'pilot_reference_cards',
      'asset_reference_bridge_card',
      'asset_source_candidate_map_card',
      'worker_boundary_card',
      'innovation_lane_card',
      'owner_handoff_card'
    ],
    next_actions: [
      'KosmoOrbit can render orbit_cards as a read-only dashboard.',
      'Do not add action buttons for blocked private commands until source-root passes.',
      'Use owner_action_required cards to prepare the next owner review conversation.'
    ]
  };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(resolve(root, path), 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(bridge) {
  const lines = [];
  lines.push('# Kosmo Orbit Status Bridge');
  lines.push('');
  lines.push(`Generated: ${bridge.generated_at}`);
  lines.push(`Status: \`${bridge.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Cards: ${bridge.summary.cards}`);
  lines.push(`- Blocking cards: ${bridge.summary.blocking_cards}`);
  lines.push(`- Owner action cards: ${bridge.summary.owner_action_cards}`);
  lines.push(`- Source root blocked: ${bridge.summary.source_root_blocked ? 'yes' : 'no'}`);
  lines.push(`- Day batch: ${bridge.summary.day_batch_status}`);
  lines.push(`- Source-root owner action: ${bridge.summary.source_root_owner_action_status}`);
  lines.push(`- Source-root recommended decision: ${bridge.summary.source_root_owner_recommended_decision}`);
  lines.push(`- Source-root activation: ${bridge.summary.source_root_activation_status}`);
  lines.push(`- Private metadata inventory: ${bridge.summary.private_metadata_inventory_status}`);
  lines.push(`- Private metadata inventory fixture: ${bridge.summary.private_metadata_inventory_fixture_status}`);
  lines.push(`- Private metadata inventory check: ${bridge.summary.private_metadata_inventory_check_status}`);
  lines.push(`- Local models: ${bridge.summary.local_model_inventory_status}`);
  lines.push(`- Asset bridge: ${bridge.summary.asset_bridge_status}`);
  lines.push(`- Asset source candidate map: ${bridge.summary.asset_source_candidate_map_status}, candidates ${bridge.summary.asset_source_candidate_map_candidates ?? '-'}`);
  lines.push(`- Innovation smoke: ${bridge.summary.innovation_smoke_status}`);
  lines.push(`- Public-ready after bridge: ${bridge.summary.public_ready_after_bridge}`);
  lines.push('');
  lines.push('## Orbit Cards');
  lines.push('');
  lines.push('| Card | Status | Owner Action | Signal |');
  lines.push('| --- | --- | --- | --- |');
  bridge.orbit_cards.forEach((card) => {
    lines.push(`| \`${card.id}\` ${escapePipe(card.title)} | ${card.status} | ${card.owner_action_required ? 'yes' : 'no'} | ${escapePipe(card.signal)} |`);
  });
  lines.push('');
  lines.push('## Recommended Orbit Sections');
  lines.push('');
  bridge.recommended_orbit_sections.forEach((section) => lines.push(`- \`${section}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  bridge.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}`;
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
