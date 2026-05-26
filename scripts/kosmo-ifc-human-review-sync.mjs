#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');

const paths = {
  manifest: join(projectRoot, 'kosmo.project.json'),
  decision: join(projectRoot, args.decision || 'design/ifc-human-review-decision.json'),
  selection: join(projectRoot, args.selection || 'design/context-selection.json'),
  sourceMapping: join(projectRoot, args['source-mapping'] || 'design/context-source-mapping.json'),
  outputJson: join(projectRoot, args.output || 'design/ifc-human-review-sync.generated.json'),
  outputMd: join(projectRoot, args.markdown || 'design/ifc-human-review-sync.generated.md')
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(paths.decision)) throw new Error(`No IFC human review decision found: ${relative(root, paths.decision)}`);

  const payload = buildSyncPayload();
  validateApply(payload);

  if (payload.apply.mode === 'applied') {
    if (payload.updated_files.context_selection) {
      await writeFile(paths.selection, `${JSON.stringify(payload.updated_files.context_selection, null, 2)}\n`, 'utf8');
    }
    if (payload.updated_files.source_mapping) {
      await writeFile(paths.sourceMapping, `${JSON.stringify(payload.updated_files.source_mapping, null, 2)}\n`, 'utf8');
    }
  }

  await Promise.all([
    mkdir(dirname(paths.outputJson), { recursive: true }),
    mkdir(dirname(paths.outputMd), { recursive: true })
  ]);
  const report = reportPayload(payload);
  await writeFile(paths.outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(paths.outputMd, renderMarkdown(report), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo IFC human review sync generated');
  console.log(`Project: ${report.project_id}`);
  console.log(`Status: ${report.status}`);
  console.log(`Apply mode: ${report.apply.mode}`);
  console.log(`Operations: ${report.summary.operation_count}`);
  console.log(`Wrote: ${relative(root, paths.outputMd)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildSyncPayload() {
  const manifest = readOptionalJson(paths.manifest);
  const decision = readJson(paths.decision);
  const selection = readOptionalJson(paths.selection);
  const sourceMapping = readOptionalJson(paths.sourceMapping);
  const finalDecision = Boolean(decision.summary?.final_decision_recorded);
  const designApproval = Boolean(decision.summary?.design_generation_approval_granted);
  const mappedDecision = mapDecision(decision.decision);
  const candidateId = decision.candidate_id;
  const reviewer = args['reviewed-by'] || decision.reviewed_by || null;
  const applyRequested = Boolean(args.apply);
  const canSync = finalDecision && mappedDecision && !blockedDesignSeed(decision);
  const operations = canSync
    ? buildOperations({ selection, sourceMapping, decision, mappedDecision, candidateId, designApproval, reviewer })
    : [];
  const updatedSelection = canSync && selection ? syncSelection({ selection, decision, mappedDecision, candidateId, designApproval, reviewer }) : null;
  const updatedSourceMapping = canSync && sourceMapping ? syncSourceMapping({ sourceMapping, decision, mappedDecision, candidateId, designApproval, reviewer }) : null;
  const mode = applyRequested ? 'applied' : 'dry_run';
  const status = syncStatus({ canSync, applyRequested, operations, decision });

  return {
    project_id: manifest?.project_id || decision.project_id || basename(projectRoot),
    project_name: manifest?.name || decision.project_name || null,
    status,
    decision,
    mapped_decision: mappedDecision,
    can_sync: canSync,
    apply: {
      requested: applyRequested,
      mode,
      confirm_sync: Boolean(args['confirm-sync']),
      confirm_mutation: Boolean(args['i-understand-context-selection-mutation'])
    },
    operations,
    updated_files: {
      context_selection: updatedSelection,
      source_mapping: updatedSourceMapping
    }
  };
}

function buildOperations({ selection, sourceMapping, decision, mappedDecision, candidateId, designApproval, reviewer }) {
  const operations = [];
  const selectionRow = selectionForCandidate(selection, candidateId);
  const mappingRow = mappingForCandidate(sourceMapping, candidateId);

  if (selectionRow && selectionRow.decision !== mappedDecision) {
    operations.push({
      target: 'design/context-selection.json',
      action: 'update_candidate_decision',
      candidate_id: candidateId,
      from: selectionRow.decision,
      to: mappedDecision,
      reviewer
    });
  }
  if (selection && Boolean(selection.approved_for_design_generation) !== designApproval) {
    operations.push({
      target: 'design/context-selection.json',
      action: 'update_design_generation_approval',
      from: Boolean(selection.approved_for_design_generation),
      to: designApproval,
      reviewer
    });
  }
  if (mappingRow && mappingRow.decision !== mappedDecision) {
    operations.push({
      target: 'design/context-source-mapping.json',
      action: 'update_source_mapping_decision',
      mapping_id: mappingRow.mapping_id,
      from: mappingRow.decision,
      to: mappedDecision,
      reviewer
    });
  }
  if (mappingRow && mappingRow.current_context_selection_decision !== mappedDecision) {
    operations.push({
      target: 'design/context-source-mapping.json',
      action: 'update_source_mapping_context_decision',
      mapping_id: mappingRow.mapping_id,
      from: mappingRow.current_context_selection_decision,
      to: mappedDecision,
      reviewer
    });
  }
  const mappedReviewStatus = sourceReviewStatusForDecision(decision.decision, mappedDecision);
  if (mappingRow && mappedReviewStatus && mappingRow.source_review_status !== mappedReviewStatus) {
    operations.push({
      target: 'design/context-source-mapping.json',
      action: 'update_source_mapping_review_status',
      mapping_id: mappingRow.mapping_id,
      from: mappingRow.source_review_status,
      to: mappedReviewStatus,
      reviewer
    });
  }
  if (sourceMapping && decision.decision === 'accepted_as_design_seed' && sourceMapping.review?.semantic_ifc_reviewed !== true) {
    operations.push({
      target: 'design/context-source-mapping.json',
      action: 'mark_semantic_ifc_reviewed',
      from: Boolean(sourceMapping.review?.semantic_ifc_reviewed),
      to: true,
      reviewer
    });
  }
  if (!selectionRow) {
    operations.push({
      target: 'design/context-selection.json',
      action: 'missing_candidate',
      candidate_id: candidateId,
      note: 'No matching context-selection row found.'
    });
  }
  if (!mappingRow) {
    operations.push({
      target: 'design/context-source-mapping.json',
      action: 'missing_mapping_row',
      candidate_id: candidateId,
      note: 'No linked source-mapping row found.'
    });
  }

  return operations;
}

function syncSelection({ selection, decision, mappedDecision, candidateId, designApproval, reviewer }) {
  const next = structuredClone(selection);
  const row = selectionForCandidate(next, candidateId);
  const timestamp = new Date().toISOString();
  if (row) {
    row.decision = mappedDecision;
    row.review_required = mappedDecision === 'undecided' || mappedDecision === 'needs_more_source_review';
    row.approved_by = reviewer;
    row.approved_at = timestamp;
    if (!Array.isArray(row.notes)) row.notes = [];
    addUnique(row.notes, `Synced from design/ifc-human-review-decision.json with decision ${decision.decision}.`);
  }
  next.approved_for_design_generation = designApproval;
  next.status = designApproval ? 'approved_for_design_seed' : 'draft_needs_human_review';
  next.generated_at = timestamp;
  next.review = {
    ...(next.review || {}),
    reviewed_by: reviewer,
    reviewed_at: timestamp
  };
  next.summary = {
    ...summarizeSelection(next.selections || []),
    stale_selection_count: Array.isArray(next.stale_selections) ? next.stale_selections.length : 0,
    readiness: selectionReadiness(next.selections || [], designApproval)
  };
  return next;
}

function syncSourceMapping({ sourceMapping, decision, mappedDecision, candidateId, designApproval, reviewer }) {
  const next = structuredClone(sourceMapping);
  const row = mappingForCandidate(next, candidateId);
  const timestamp = new Date().toISOString();
  if (row) {
    row.decision = mappedDecision;
    row.current_context_selection_decision = mappedDecision;
    const mappedReviewStatus = sourceReviewStatusForDecision(decision.decision, mappedDecision);
    if (mappedReviewStatus) row.source_review_status = mappedReviewStatus;
    row.review_required = mappedDecision === 'pending_review' || mappedDecision === 'needs_more_source_review';
    row.approved_by = reviewer;
    row.approved_at = timestamp;
    if (!Array.isArray(row.notes)) row.notes = [];
    addUnique(row.notes, `Synced from design/ifc-human-review-decision.json with decision ${decision.decision}.`);
  }
  next.generated_at = timestamp;
  next.review = {
    ...(next.review || {}),
    reviewed_by: reviewer,
    reviewed_at: timestamp,
    semantic_ifc_reviewed: Boolean(next.review?.semantic_ifc_reviewed || designApproval)
  };
  next.summary = summarizeMapping(next.rows || []);
  next.status = next.summary.pending_review_count > 0 ? 'source_mapping_review_required' : 'source_mapping_reviewed';
  return next;
}

function reportPayload(payload) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-ifc-human-review-sync',
    project_id: payload.project_id,
    project_name: payload.project_name,
    status: payload.status,
    rights_status: 'internal_only',
    candidate_id: payload.decision.candidate_id,
    source_decision: payload.decision.decision,
    mapped_context_decision: payload.mapped_decision,
    policy: {
      dry_run_by_default: true,
      apply_requires_confirm_sync: true,
      apply_requires_mutation_confirmation: true,
      sync_requires_final_human_decision: true,
      sync_does_not_create_new_candidates: true
    },
    apply: payload.apply,
    summary: {
      can_sync: payload.can_sync,
      operation_count: payload.operations.length,
      context_selection_would_write: Boolean(payload.updated_files.context_selection),
      source_mapping_would_write: Boolean(payload.updated_files.source_mapping),
      design_generation_approval: Boolean(payload.decision.summary?.design_generation_approval_granted),
      recommended_next_step: recommendedNextStep(payload)
    },
    operations: payload.operations,
    source_files: {
      decision: fileStatus(paths.decision),
      context_selection: fileStatus(paths.selection),
      source_mapping: fileStatus(paths.sourceMapping)
    }
  };
}

function validateApply(payload) {
  if (!payload.apply.requested) return;
  const errors = [];
  if (!payload.can_sync) errors.push('Cannot apply sync before a final, unblocked IFC human decision exists.');
  if (!payload.apply.confirm_sync) errors.push('Apply requires --confirm-sync.');
  if (!payload.apply.confirm_mutation) errors.push('Apply requires --i-understand-context-selection-mutation.');
  if (!payload.decision.reviewed_by && !args['reviewed-by']) errors.push('Apply requires a reviewer from the decision file or --reviewed-by.');
  if (payload.operations.some((operation) => operation.action.startsWith('missing_'))) {
    errors.push('Cannot apply sync while target rows are missing.');
  }
  if (errors.length) throw new Error(errors.join('\n'));
}

function syncStatus({ canSync, applyRequested, operations, decision }) {
  if (!decision.summary?.final_decision_recorded) return 'ifc_sync_blocked_pending_final_decision';
  if (blockedDesignSeed(decision)) return 'ifc_sync_blocked_design_seed_approval_missing';
  if (!canSync) return 'ifc_sync_blocked';
  if (applyRequested) return operations.length ? 'ifc_sync_applied' : 'ifc_sync_no_changes_needed';
  return operations.length ? 'ifc_sync_dry_run_changes_ready' : 'ifc_sync_dry_run_no_changes_needed';
}

function recommendedNextStep(payload) {
  if (!payload.decision.summary?.final_decision_recorded) return 'record_final_ifc_human_review_decision_first';
  if (payload.status === 'ifc_sync_blocked_design_seed_approval_missing') return 'record_design_seed_approval_or_choose_context_only_decision';
  if (payload.apply.requested) return 'rerun_package_check_and_context_guard';
  if (payload.operations.length > 0) return 'review_sync_plan_then_apply_with_confirm_flags';
  return 'no_sync_changes_needed';
}

function mapDecision(decision) {
  if (decision === 'keep_needs_more_source_review') return 'needs_more_source_review';
  if (decision === 'accepted_as_context') return 'accepted_as_context';
  if (decision === 'accepted_as_design_seed') return 'accepted_as_design_seed';
  if (decision === 'rejected') return 'rejected';
  return null;
}

function sourceReviewStatusForDecision(sourceDecision, mappedDecision) {
  if (mappedDecision === 'needs_more_source_review') return 'pending';
  if (['accepted_as_context', 'accepted_as_design_seed', 'rejected'].includes(sourceDecision)) {
    return 'confirmed_by_ifc_human_review';
  }
  return null;
}

function blockedDesignSeed(decision) {
  return decision.decision === 'accepted_as_design_seed'
    && decision.summary?.design_generation_approval_granted !== true;
}

function selectionForCandidate(selection, candidateId) {
  const rows = Array.isArray(selection?.selections) ? selection.selections : [];
  return rows.find((row) => row.candidate_id === candidateId) || null;
}

function mappingForCandidate(sourceMapping, candidateId) {
  const rows = Array.isArray(sourceMapping?.rows) ? sourceMapping.rows : [];
  return rows.find((row) => row.linked_context_candidate_id === candidateId || row.candidate_id === candidateId) || null;
}

function summarizeSelection(selections) {
  const count = (decision) => selections.filter((item) => item.decision === decision).length;
  return {
    candidate_count: selections.length,
    accepted_as_context_count: count('accepted_as_context'),
    accepted_as_design_seed_count: count('accepted_as_design_seed'),
    needs_more_source_review_count: count('needs_more_source_review'),
    rejected_count: count('rejected'),
    undecided_count: count('undecided')
  };
}

function selectionReadiness(selections, approvedForDesign) {
  const summary = summarizeSelection(selections);
  if (approvedForDesign) return 'ready_for_design_seed';
  if (summary.accepted_as_design_seed_count > 0) return 'design_seed_selection_needs_final_approval';
  if (summary.needs_more_source_review_count > 0) return 'context_selected_needs_source_review';
  if (summary.undecided_count > 0) return 'needs_human_selection';
  if (summary.accepted_as_context_count > 0) return 'context_selected_needs_design_seed_approval';
  return 'pending_context_candidates';
}

function summarizeMapping(rows) {
  const count = (decision) => rows.filter((row) => row.decision === decision).length;
  return {
    mapping_row_count: rows.length,
    pending_review_count: count('pending_review'),
    accepted_as_context_count: count('accepted_as_context'),
    accepted_as_design_seed_count: count('accepted_as_design_seed'),
    needs_more_source_review_count: count('needs_more_source_review'),
    rejected_count: count('rejected'),
    linked_context_candidate_count: rows.filter((row) => row.linked_context_candidate_id).length,
    design_seed_possible_after_review_count: rows.filter((row) => row.design_seed_possible_after_review).length,
    recommended_next_step: rows.some((row) => row.decision === 'pending_review')
      ? 'review_source_mapping_rows'
      : 'sync_reviewed_mapping_decisions_to_context_selection'
  };
}

function renderMarkdown(report) {
  const lines = [
    '# IFC Human Review Sync',
    '',
    `Project ID: \`${report.project_id}\``,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Candidate: \`${report.candidate_id}\``,
    `Source decision: \`${report.source_decision}\``,
    `Mapped context decision: \`${report.mapped_context_decision || '-'}\``,
    '',
    'Dry-run by default. This report applies changes only when the command is run with explicit sync confirmation flags.',
    '',
    '## Summary',
    '',
    `- can sync: ${report.summary.can_sync ? 'yes' : 'no'}`,
    `- apply mode: ${report.apply.mode}`,
    `- operations: ${report.summary.operation_count}`,
    `- context-selection would write: ${report.summary.context_selection_would_write ? 'yes' : 'no'}`,
    `- source-mapping would write: ${report.summary.source_mapping_would_write ? 'yes' : 'no'}`,
    `- design generation approval: ${report.summary.design_generation_approval ? 'yes' : 'no'}`,
    `- recommended next step: \`${report.summary.recommended_next_step}\``,
    '',
    '## Operations',
    ''
  ];

  if (!report.operations.length) {
    lines.push('- none');
  } else {
    lines.push('| Target | Action | From | To |');
    lines.push('| --- | --- | --- | --- |');
    for (const operation of report.operations) {
      lines.push(`| ${escapePipe(operation.target)} | ${escapePipe(operation.action)} | ${escapePipe(operation.from ?? '-')} | ${escapePipe(operation.to ?? '-')} |`);
    }
  }

  lines.push('', '## Apply Command', '');
  lines.push('```bash');
  lines.push(`npm run kosmo:ifc-human-review-sync -- --project ${shellQuote(relative(root, projectRoot))} --apply --confirm-sync --i-understand-context-selection-mutation`);
  lines.push('```');

  return `${lines.join('\n')}\n`;
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = false;
    for (const item of packageOutputItems()) {
      didChange = ensureItem(manifest.outputs, item.path, item.manifest) || didChange;
    }
    if (didChange) {
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      changed.push(manifestPath);
    }
  }

  const exportManifestPath = join(projectRoot, 'publish/export-manifest.json');
  if (existsSync(exportManifestPath)) {
    const exportManifest = readJson(exportManifestPath);
    if (!Array.isArray(exportManifest.exports)) exportManifest.exports = [];
    let didChange = false;
    for (const item of packageOutputItems()) {
      didChange = ensureItem(exportManifest.exports, item.path, item.exportManifest) || didChange;
    }
    if (didChange) {
      await writeFile(exportManifestPath, `${JSON.stringify(exportManifest, null, 2)}\n`, 'utf8');
      changed.push(exportManifestPath);
    }
  }
  return changed;
}

function packageOutputItems() {
  return [
    outputItem('design/ifc-human-review-sync.generated.json', 'other', 'design', 'Kosmo Design', 'json', 'Dry-run/apply report for syncing a final IFC human decision into context gates.'),
    outputItem('design/ifc-human-review-sync.generated.md', 'other', 'design', 'Kosmo Design', 'markdown', 'Human-readable IFC decision sync report.')
  ];
}

function outputItem(path, type, module, exportModule, format, description) {
  return {
    path,
    manifest: { path, type, module, rights_status: 'generated_needs_review', description },
    exportManifest: { path, module: exportModule, format, status: 'generated_needs_review', rights_status: 'generated_needs_review' }
  };
}

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
}

function fileStatus(pathname) {
  return {
    path: relative(projectRoot, pathname),
    exists: existsSync(pathname)
  };
}

function addUnique(items, value) {
  if (!items.includes(value)) items.push(value);
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function readOptionalJson(pathname) {
  if (!existsSync(pathname)) return null;
  return readJson(pathname);
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function shellQuote(value) {
  const string = String(value || '.');
  if (/^[A-Za-z0-9_./:-]+$/.test(string)) return string;
  return `"${string.replace(/(["\\$`])/g, '\\$1')}"`;
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
