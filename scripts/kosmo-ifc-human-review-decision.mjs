#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const outputJsonPath = join(projectRoot, args.output || 'design/ifc-human-review-decision.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/ifc-human-review-decision.md');

const allowedDecisions = new Set([
  'keep_needs_more_source_review',
  'accepted_as_context',
  'accepted_as_design_seed',
  'rejected'
]);

const paths = {
  manifest: join(projectRoot, 'kosmo.project.json'),
  contextSelection: join(projectRoot, 'design/context-selection.json'),
  sourceMapping: join(projectRoot, 'design/context-source-mapping.json'),
  sourceReview: join(projectRoot, 'design/context-source-review.generated.json'),
  humanReviewPack: join(projectRoot, 'design/ifc-human-review-pack.generated.json'),
  humanReviewViewer: join(projectRoot, 'design/ifc-human-review-viewer.generated.json'),
  ifcOpenShellReview: join(projectRoot, 'design/ifcopenshell-semantic-review.generated.json'),
  existingDecision: outputJsonPath
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const decision = buildDecision();
  validateDecision(decision);
  guardExistingFinalDecision(decision);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(decision, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(decision), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo IFC human review decision written');
  console.log(`Project: ${decision.project_id}`);
  console.log(`Status: ${decision.status}`);
  console.log(`Decision: ${decision.decision}`);
  console.log(`Final decision recorded: ${decision.summary.final_decision_recorded ? 'yes' : 'no'}`);
  console.log(`Design generation approval: ${decision.summary.design_generation_approval_granted ? 'yes' : 'no'}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildDecision() {
  const manifest = readOptionalJson(paths.manifest);
  const contextSelection = readOptionalJson(paths.contextSelection);
  const sourceMapping = readOptionalJson(paths.sourceMapping);
  const sourceReview = readOptionalJson(paths.sourceReview);
  const humanReviewPack = readOptionalJson(paths.humanReviewPack);
  const humanReviewViewer = readOptionalJson(paths.humanReviewViewer);
  const ifcOpenShellReview = readOptionalJson(paths.ifcOpenShellReview);
  const projectId = manifest?.project_id || humanReviewPack?.project_id || basename(projectRoot);
  const candidateId = args.candidate || humanReviewPack?.candidate_id || 'ifc-role-3-semantic_building_elements';
  const decision = args.decision || humanReviewPack?.summary?.recommended_decision_now || 'keep_needs_more_source_review';
  const finalDecisionRequested = Boolean(args['record-final']);
  const checklist = buildChecklist(humanReviewPack);
  const checklistSummary = summarizeChecklist(checklist);
  const positiveDecision = ['accepted_as_context', 'accepted_as_design_seed'].includes(decision);
  const designSeedDecision = decision === 'accepted_as_design_seed';
  const designApprovalRequested = Boolean(args['approve-design-generation']);
  const designGenerationApprovalGranted = Boolean(
    finalDecisionRequested
      && designSeedDecision
      && designApprovalRequested
      && args['i-confirm-human-ifc-review']
      && checklistSummary.confirmed_count === checklistSummary.check_count
      && checklistSummary.failed_count === 0
      && humanReviewPack?.summary?.evidence_ready === true
  );
  const currentSelection = currentSelectionForCandidate(contextSelection, candidateId);
  const currentMapping = currentMappingForCandidate(sourceMapping, candidateId);
  const status = decisionStatus({
    decision,
    finalDecisionRequested,
    positiveDecision,
    designGenerationApprovalGranted
  });

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-ifc-human-review-decision',
    project_id: projectId,
    project_name: manifest?.name || humanReviewPack?.project_name || null,
    status,
    rights_status: 'internal_only',
    candidate_id: candidateId,
    decision,
    reviewed_by: args['reviewed-by'] || null,
    reviewed_at: finalDecisionRequested ? new Date().toISOString() : null,
    notes: normalizeList(args.note),
    policy: {
      decision_file_does_not_modify_context_selection: true,
      decision_file_does_not_modify_source_mapping: true,
      draft_is_not_human_approval: true,
      accepted_as_design_seed_requires_record_final: true,
      accepted_as_design_seed_requires_confirm_checklist: true,
      accepted_as_design_seed_requires_approve_design_generation_flag: true,
      design_generation_still_requires_context_selection_approval: true
    },
    source_files: sourceFiles(),
    current_state: {
      context_selection_decision: currentSelection?.decision || null,
      context_selection_approved_for_design_generation: Boolean(contextSelection?.approved_for_design_generation),
      source_mapping_decision: currentMapping?.decision || null,
      source_review_status: sourceReview?.status || null,
      source_review_open_human_review_count: numberOrDefault(sourceReview?.summary?.open_human_review_count, 0),
      human_review_pack_status: humanReviewPack?.status || null,
      human_review_viewer_status: humanReviewViewer?.status || null,
      ifcopenshell_review_status: ifcOpenShellReview?.status || null
    },
    evidence_snapshot: {
      evidence_ready: Boolean(humanReviewPack?.summary?.evidence_ready),
      design_generation_allowed_before_decision: Boolean(humanReviewPack?.summary?.design_generation_allowed),
      human_pack_machine_checks_passed: numberOrDefault(humanReviewPack?.summary?.machine_checks_passed, 0),
      human_pack_machine_check_count: numberOrDefault(humanReviewPack?.summary?.machine_check_count, 0),
      ifcopenshell_machine_checks_passed: numberOrDefault(ifcOpenShellReview?.summary?.machine_checks_passed, 0),
      ifcopenshell_machine_check_count: numberOrDefault(ifcOpenShellReview?.summary?.machine_check_count, 0),
      ifc_proxy_count: numberOrDefault(ifcOpenShellReview?.summary?.ifcbuildingelementproxy_count, 0),
      ifc_body_brep_count: numberOrDefault(ifcOpenShellReview?.summary?.proxies_with_body_brep, 0),
      open_pack_human_check_count: numberOrDefault(humanReviewPack?.summary?.open_human_check_count, 0),
      viewer_preview_count: numberOrDefault(humanReviewViewer?.summary?.preview_count, 0)
    },
    human_checklist: checklist,
    summary: {
      final_decision_recorded: finalDecisionRequested,
      positive_decision: positiveDecision,
      design_seed_decision: designSeedDecision,
      design_generation_approval_requested: designApprovalRequested,
      design_generation_approval_granted: designGenerationApprovalGranted,
      context_selection_update_required: Boolean(currentSelection && currentSelection.decision !== decision),
      source_mapping_update_required: Boolean(currentMapping && currentMapping.decision !== decision),
      check_count: checklistSummary.check_count,
      confirmed_check_count: checklistSummary.confirmed_count,
      failed_check_count: checklistSummary.failed_count,
      open_human_check_count: checklistSummary.open_count,
      evidence_ready: Boolean(humanReviewPack?.summary?.evidence_ready),
      recommended_next_step: recommendedNextStep({
        decision,
        finalDecisionRequested,
        positiveDecision,
        designGenerationApprovalGranted,
        currentSelection,
        currentMapping,
        checklistSummary
      })
    },
    recommended_context_selection_patch: buildContextSelectionPatch({
      candidateId,
      decision,
      finalDecisionRequested,
      designGenerationApprovalGranted,
      reviewer: args['reviewed-by'] || null
    })
  };
}

function buildChecklist(humanReviewPack) {
  const checks = Array.isArray(humanReviewPack?.human_checklist) ? humanReviewPack.human_checklist : [];
  const failedChecks = new Set(normalizeList(args['failed-check']));
  const pendingChecks = new Set(normalizeList(args['pending-check']));
  const confirmedChecks = new Set(normalizeList(args['confirmed-check']));
  const confirmAll = Boolean(args['confirm-checklist']);

  return checks.map((check) => {
    let status = confirmAll ? 'confirmed_by_reviewer' : 'pending_human_review';
    if (confirmedChecks.has(check.id)) status = 'confirmed_by_reviewer';
    if (failedChecks.has(check.id)) status = 'failed_by_reviewer';
    if (pendingChecks.has(check.id)) status = 'pending_human_review';
    return {
      id: check.id,
      status,
      question: check.question,
      evidence_hint: check.evidence_hint || '',
      reviewer_note: ''
    };
  });
}

function summarizeChecklist(checklist) {
  return {
    check_count: checklist.length,
    confirmed_count: checklist.filter((item) => item.status === 'confirmed_by_reviewer').length,
    failed_count: checklist.filter((item) => item.status === 'failed_by_reviewer').length,
    open_count: checklist.filter((item) => item.status === 'pending_human_review').length
  };
}

function validateDecision(decision) {
  const errors = [];
  if (!existsSync(paths.humanReviewPack)) errors.push(`Missing IFC human review pack: ${relative(root, paths.humanReviewPack)}`);
  if (!allowedDecisions.has(decision.decision)) {
    errors.push(`Invalid decision "${decision.decision}". Use one of: ${[...allowedDecisions].join(', ')}`);
  }
  if (decision.summary.final_decision_recorded && !decision.reviewed_by) {
    errors.push('Final decisions require --reviewed-by "Name".');
  }
  if (decision.summary.positive_decision && decision.summary.final_decision_recorded && !args['confirm-checklist']) {
    errors.push('Positive final decisions require --confirm-checklist.');
  }
  if (decision.summary.positive_decision && decision.summary.final_decision_recorded && !args['i-confirm-human-ifc-review']) {
    errors.push('Positive final decisions require --i-confirm-human-ifc-review.');
  }
  if (decision.summary.positive_decision && decision.summary.final_decision_recorded && decision.summary.open_human_check_count > 0) {
    errors.push(`Positive final decisions cannot keep pending human checks: ${decision.summary.open_human_check_count}.`);
  }
  if (decision.summary.positive_decision && decision.summary.failed_check_count > 0) {
    errors.push(`Positive decisions cannot contain failed human checks: ${decision.summary.failed_check_count}.`);
  }
  if (decision.decision === 'accepted_as_design_seed' && !decision.summary.design_generation_approval_granted) {
    errors.push('accepted_as_design_seed requires --record-final --confirm-checklist --i-confirm-human-ifc-review --approve-design-generation and ready machine evidence.');
  }
  if (args['approve-design-generation'] && decision.decision !== 'accepted_as_design_seed') {
    errors.push('--approve-design-generation is only valid with --decision accepted_as_design_seed.');
  }
  if (errors.length) throw new Error(errors.join('\n'));
}

function guardExistingFinalDecision(decision) {
  if (!existsSync(paths.existingDecision) || args.force) return;
  const existing = readOptionalJson(paths.existingDecision);
  if (existing?.summary?.final_decision_recorded === true && existing.decision !== decision.decision) {
    throw new Error(`Existing final IFC decision would be overwritten: ${relative(root, paths.existingDecision)}. Re-run with --force if this is intentional.`);
  }
}

function decisionStatus({ decision, finalDecisionRequested, positiveDecision, designGenerationApprovalGranted }) {
  if (!finalDecisionRequested) return 'ifc_human_review_decision_draft';
  if (designGenerationApprovalGranted) return 'ifc_design_seed_approval_recorded';
  if (decision === 'accepted_as_context') return 'ifc_context_acceptance_recorded';
  if (decision === 'rejected') return 'ifc_candidate_rejection_recorded';
  if (positiveDecision) return 'ifc_human_review_positive_decision_blocked';
  return 'ifc_human_review_decision_recorded';
}

function recommendedNextStep({
  decision,
  finalDecisionRequested,
  positiveDecision,
  designGenerationApprovalGranted,
  currentSelection,
  currentMapping,
  checklistSummary
}) {
  if (!finalDecisionRequested) return 'open_viewer_and_record_final_human_decision';
  if (positiveDecision && checklistSummary.open_count > 0) return 'complete_pending_human_checks_before_positive_decision';
  if (positiveDecision && checklistSummary.failed_count > 0) return 'resolve_failed_human_checks_or_reject_candidate';
  if (designGenerationApprovalGranted) return 'sync_context_selection_only_after_owner_confirms_design_seed_use';
  if (currentSelection && currentSelection.decision !== decision) return 'sync_reviewed_decision_to_context_selection_when_owner_approves';
  if (currentMapping && currentMapping.decision !== decision) return 'sync_reviewed_decision_to_source_mapping_when_owner_approves';
  return 'keep_design_generation_blocked_until_context_selection_approval';
}

function buildContextSelectionPatch({ candidateId, decision, finalDecisionRequested, designGenerationApprovalGranted, reviewer }) {
  if (!finalDecisionRequested) return null;
  return {
    candidate_id: candidateId,
    decision,
    approved_by: reviewer,
    approved_at: new Date().toISOString(),
    approved_for_design_generation: designGenerationApprovalGranted,
    note: 'Suggested patch only. This decision tool does not edit design/context-selection.json.'
  };
}

function currentSelectionForCandidate(contextSelection, candidateId) {
  const selections = Array.isArray(contextSelection?.selections) ? contextSelection.selections : [];
  return selections.find((item) => item.candidate_id === candidateId) || null;
}

function currentMappingForCandidate(sourceMapping, candidateId) {
  const rows = Array.isArray(sourceMapping?.rows) ? sourceMapping.rows : [];
  return rows.find((item) => item.linked_context_candidate_id === candidateId || item.candidate_id === candidateId) || null;
}

function sourceFiles() {
  return Object.fromEntries(Object.entries(paths).map(([key, pathname]) => [key, sourceFileStatus(pathname)]));
}

function sourceFileStatus(pathname) {
  return {
    path: relative(projectRoot, pathname),
    name: basename(pathname),
    exists: existsSync(pathname),
    size_bytes: existsSync(pathname) ? statSync(pathname).size : 0
  };
}

function renderMarkdown(decision) {
  const lines = [
    '# IFC Human Review Decision',
    '',
    `Project ID: \`${decision.project_id}\``,
    `Generated: ${decision.generated_at}`,
    `Status: \`${decision.status}\``,
    `Candidate: \`${decision.candidate_id}\``,
    `Decision: \`${decision.decision}\``,
    `Reviewed by: ${decision.reviewed_by || '-'}`,
    '',
    'This file records the human decision gate for the IFC candidate. It does not modify context-selection or source-mapping by itself.',
    '',
    '## Summary',
    '',
    `- final decision recorded: ${decision.summary.final_decision_recorded ? 'yes' : 'no'}`,
    `- evidence ready: ${decision.summary.evidence_ready ? 'yes' : 'no'}`,
    `- confirmed checks: ${decision.summary.confirmed_check_count}/${decision.summary.check_count}`,
    `- failed checks: ${decision.summary.failed_check_count}`,
    `- open human checks: ${decision.summary.open_human_check_count}`,
    `- design generation approval requested: ${decision.summary.design_generation_approval_requested ? 'yes' : 'no'}`,
    `- design generation approval granted: ${decision.summary.design_generation_approval_granted ? 'yes' : 'no'}`,
    `- context-selection update required: ${decision.summary.context_selection_update_required ? 'yes' : 'no'}`,
    `- source-mapping update required: ${decision.summary.source_mapping_update_required ? 'yes' : 'no'}`,
    `- recommended next step: \`${decision.summary.recommended_next_step}\``,
    '',
    '## Current State',
    '',
    `- context-selection decision: \`${decision.current_state.context_selection_decision || '-'}\``,
    `- context-selection approved for design generation: ${decision.current_state.context_selection_approved_for_design_generation ? 'yes' : 'no'}`,
    `- source-mapping decision: \`${decision.current_state.source_mapping_decision || '-'}\``,
    `- source-review open human checks: ${decision.current_state.source_review_open_human_review_count}`,
    `- human review pack: \`${decision.current_state.human_review_pack_status || '-'}\``,
    `- human review viewer: \`${decision.current_state.human_review_viewer_status || '-'}\``,
    '',
    '## Evidence Snapshot',
    '',
    `- human pack machine checks: ${decision.evidence_snapshot.human_pack_machine_checks_passed}/${decision.evidence_snapshot.human_pack_machine_check_count}`,
    `- IfcOpenShell machine checks: ${decision.evidence_snapshot.ifcopenshell_machine_checks_passed}/${decision.evidence_snapshot.ifcopenshell_machine_check_count}`,
    `- IFC proxies / Body-Brep: ${decision.evidence_snapshot.ifc_proxy_count}/${decision.evidence_snapshot.ifc_body_brep_count}`,
    `- viewer previews: ${decision.evidence_snapshot.viewer_preview_count}`,
    '',
    '## Human Checklist',
    '',
    '| Check | Status | Question | Evidence hint |',
    '| --- | --- | --- | --- |'
  ];

  for (const check of decision.human_checklist) {
    lines.push(`| ${escapePipe(check.id)} | ${escapePipe(check.status)} | ${escapePipe(check.question)} | ${escapePipe(check.evidence_hint)} |`);
  }

  lines.push('', '## Notes', '');
  if (decision.notes.length) {
    for (const note of decision.notes) lines.push(`- ${note}`);
  } else {
    lines.push('- none');
  }

  lines.push('', '## Suggested Context-Selection Patch', '');
  if (decision.recommended_context_selection_patch) {
    lines.push('```json');
    lines.push(JSON.stringify(decision.recommended_context_selection_patch, null, 2));
    lines.push('```');
  } else {
    lines.push('- none');
  }

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
    outputItem('design/ifc-human-review-decision.json', 'other', 'design', 'Kosmo Design', 'json', 'Human IFC decision gate for context/design-seed handling.'),
    outputItem('design/ifc-human-review-decision.md', 'other', 'design', 'Kosmo Design', 'markdown', 'Human-readable IFC decision record.')
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

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function readOptionalJson(pathname) {
  if (!existsSync(pathname)) return null;
  return readJson(pathname);
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.length) return [value];
  return [];
}

function numberOrDefault(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function parseArgs(argv) {
  const parsed = {};
  const repeatable = new Set(['note', 'failed-check', 'pending-check', 'confirmed-check']);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    const value = next && !next.startsWith('--') ? next : true;
    if (repeatable.has(key)) {
      if (!Array.isArray(parsed[key])) parsed[key] = [];
      parsed[key].push(value);
    } else {
      parsed[key] = value;
    }
    if (value !== true) index += 1;
  }
  return parsed;
}
