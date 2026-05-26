#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const projectRoot = resolve(readArg('--project') ?? 'examples/kosmo-projects/kosmo-demo-001');
const schemaPath = resolve(readArg('--schema') ?? 'schema/kosmo-project-package.schema.json');
const manifestPath = join(projectRoot, 'kosmo.project.json');
const failures = [];
const warnings = [];

main();

function main() {
  console.log('Kosmo project package check');
  console.log(`Project: ${relative(process.cwd(), projectRoot)}`);
  console.log(`Schema: ${relative(process.cwd(), schemaPath)}`);

  const schema = readJson(schemaPath);
  const manifest = readJson(manifestPath);

  if (!schema) failures.push('Schema could not be parsed.');
  if (!manifest) failures.push('Manifest could not be parsed.');
  if (!schema || !manifest) return finish();

  checkManifest(manifest);
  checkPackagePaths(manifest);
  checkArtifacts('inputs', manifest.inputs ?? []);
  checkArtifacts('outputs', manifest.outputs ?? []);
  checkContextSelection();
  checkJsonFiles(projectRoot);
  checkJsonlFiles(projectRoot);

  return finish();
}

function checkManifest(manifest) {
  const required = [
    'schema_version',
    'project_id',
    'name',
    'created_at',
    'risk_level',
    'site',
    'modules',
    'package_paths',
    'review_gates'
  ];

  for (const key of required) {
    if (!(key in manifest)) failures.push(`Manifest missing required key: ${key}`);
  }

  if (manifest.schema_version !== '0.1') {
    failures.push(`Manifest schema_version must be "0.1", got "${manifest.schema_version}"`);
  }

  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(manifest.project_id ?? '')) {
    failures.push(`Manifest project_id is not a Kosmo slug: ${manifest.project_id}`);
  }

  const modules = ['prepare', 'data', 'orbit', 'design', 'draw', 'viz', 'publish', 'zentrale'];
  for (const moduleName of modules) {
    const state = manifest.modules?.[moduleName];
    if (!state) failures.push(`Manifest missing module state: ${moduleName}`);
    else if (!['pending', 'in_progress', 'review_ready', 'approved', 'blocked', 'skipped'].includes(state.status)) {
      failures.push(`Invalid status for module ${moduleName}: ${state.status}`);
    }
  }

  const gates = ['public_release', 'external_upload', 'client_delivery', 'paid_cloud_job'];
  for (const gate of gates) {
    const state = manifest.review_gates?.[gate];
    if (!state) failures.push(`Manifest missing review gate: ${gate}`);
    else if (!['disabled', 'requires_human_approval', 'approved'].includes(state.mode)) {
      failures.push(`Invalid review gate mode for ${gate}: ${state.mode}`);
    }
  }
}

function checkPackagePaths(manifest) {
  for (const [label, folder] of Object.entries(manifest.package_paths ?? {})) {
    if (!isSafeRelativePath(folder)) {
      failures.push(`Unsafe package path for ${label}: ${folder}`);
      continue;
    }
    const fullPath = join(projectRoot, folder);
    if (!existsSync(fullPath)) failures.push(`Package path does not exist for ${label}: ${folder}`);
    else if (!statSync(fullPath).isDirectory()) failures.push(`Package path is not a directory for ${label}: ${folder}`);
  }
}

function checkArtifacts(kind, artifacts) {
  if (!Array.isArray(artifacts)) {
    failures.push(`Manifest ${kind} must be an array.`);
    return;
  }

  for (const artifact of artifacts) {
    if (!artifact?.path || !isSafeRelativePath(artifact.path)) {
      failures.push(`Unsafe or missing ${kind} artifact path: ${artifact?.path}`);
      continue;
    }
    const fullPath = join(projectRoot, artifact.path);
    if (!existsSync(fullPath)) failures.push(`${kind} artifact is missing: ${artifact.path}`);
  }
}

function checkJsonFiles(root) {
  for (const file of walk(root)) {
    if (!file.endsWith('.json')) continue;
    readJson(file);
  }
}

function checkJsonlFiles(root) {
  for (const file of walk(root)) {
    if (!file.endsWith('.jsonl')) continue;
    const lines = readFileSync(file, 'utf8').split('\n').filter((line) => line.trim().length > 0);
    lines.forEach((line, index) => {
      try {
        JSON.parse(line);
      } catch (error) {
        failures.push(`${relative(process.cwd(), file)}:${index + 1} invalid JSONL: ${error.message}`);
      }
    });
  }
}

function checkContextSelection() {
  const candidatesPath = join(projectRoot, 'design/context-candidates.generated.json');
  const selectionPath = join(projectRoot, 'design/context-selection.json');
  const matrixPath = join(projectRoot, 'design/context-decision-matrix.generated.json');
  const sourceMapPath = join(projectRoot, 'design/context-source-map.generated.json');
  const sourceMappingPath = join(projectRoot, 'design/context-source-mapping.json');
  const sourceReviewPath = join(projectRoot, 'design/context-source-review.generated.json');
  const ifcSemanticProofPath = join(projectRoot, 'design/ifc-semantic-proof.generated.json');
  const ifcOpenShellReviewPath = join(projectRoot, 'design/ifcopenshell-semantic-review.generated.json');
  const ifcGeometryPreviewPath = join(projectRoot, 'design/ifc-geometry-preview.generated.json');
  const ifcDxfAlignmentPreviewPath = join(projectRoot, 'design/ifc-dxf-alignment-preview.generated.json');
  const ifcLayerPlanPath = join(projectRoot, 'design/ifc-layer-plan.generated.json');
  const ifcHumanReviewPackPath = join(projectRoot, 'design/ifc-human-review-pack.generated.json');
  const ifcHumanReviewViewerPath = join(projectRoot, 'design/ifc-human-review-viewer.generated.json');
  const ifcHumanReviewDecisionPath = join(projectRoot, 'design/ifc-human-review-decision.json');
  const ifcHumanReviewSyncPath = join(projectRoot, 'design/ifc-human-review-sync.generated.json');
  const ifcHumanReviewGuidePath = join(projectRoot, 'design/ifc-human-review-guide.generated.json');
  const ifcHumanReviewSessionPath = join(projectRoot, 'design/ifc-human-review-session.json');
  const modelLayerHandoffPath = join(projectRoot, 'design/model-layer-handoff.generated.json');
  const contextHandoffPath = join(projectRoot, 'design/context-handoff.generated.json');
  const blenderContextImportPath = join(projectRoot, 'design/blender-context-import.generated.json');
  const blenderContextSmokePath = join(projectRoot, 'design/blender-context-import.smoke.json');
  const blenderContextAuditPath = join(projectRoot, 'design/blender-context-import.audit.json');
  const candidates = existsSync(candidatesPath) ? readJson(candidatesPath) : null;
  const selection = existsSync(selectionPath) ? readJson(selectionPath) : null;
  const matrix = existsSync(matrixPath) ? readJson(matrixPath) : null;
  const sourceMap = existsSync(sourceMapPath) ? readJson(sourceMapPath) : null;
  const sourceMapping = existsSync(sourceMappingPath) ? readJson(sourceMappingPath) : null;
  const sourceReview = existsSync(sourceReviewPath) ? readJson(sourceReviewPath) : null;
  const ifcSemanticProof = existsSync(ifcSemanticProofPath) ? readJson(ifcSemanticProofPath) : null;
  const ifcOpenShellReview = existsSync(ifcOpenShellReviewPath) ? readJson(ifcOpenShellReviewPath) : null;
  const ifcGeometryPreview = existsSync(ifcGeometryPreviewPath) ? readJson(ifcGeometryPreviewPath) : null;
  const ifcDxfAlignmentPreview = existsSync(ifcDxfAlignmentPreviewPath) ? readJson(ifcDxfAlignmentPreviewPath) : null;
  const ifcLayerPlan = existsSync(ifcLayerPlanPath) ? readJson(ifcLayerPlanPath) : null;
  const ifcHumanReviewPack = existsSync(ifcHumanReviewPackPath) ? readJson(ifcHumanReviewPackPath) : null;
  const ifcHumanReviewViewer = existsSync(ifcHumanReviewViewerPath) ? readJson(ifcHumanReviewViewerPath) : null;
  const ifcHumanReviewDecision = existsSync(ifcHumanReviewDecisionPath) ? readJson(ifcHumanReviewDecisionPath) : null;
  const ifcHumanReviewSync = existsSync(ifcHumanReviewSyncPath) ? readJson(ifcHumanReviewSyncPath) : null;
  const ifcHumanReviewGuide = existsSync(ifcHumanReviewGuidePath) ? readJson(ifcHumanReviewGuidePath) : null;
  const ifcHumanReviewSession = existsSync(ifcHumanReviewSessionPath) ? readJson(ifcHumanReviewSessionPath) : null;
  const modelLayerHandoff = existsSync(modelLayerHandoffPath) ? readJson(modelLayerHandoffPath) : null;
  const contextHandoff = existsSync(contextHandoffPath) ? readJson(contextHandoffPath) : null;
  const blenderContextImport = existsSync(blenderContextImportPath) ? readJson(blenderContextImportPath) : null;
  const blenderContextSmoke = existsSync(blenderContextSmokePath) ? readJson(blenderContextSmokePath) : null;
  const blenderContextAudit = existsSync(blenderContextAuditPath) ? readJson(blenderContextAuditPath) : null;
  const ifcGeometryPreviewReady = isIfcGeometryPreviewReady(ifcGeometryPreview);
  const ifcOpenShellReviewReady = isIfcOpenShellReviewReady(ifcOpenShellReview);
  const ifcDxfAlignmentPreviewReady = isIfcDxfAlignmentPreviewReady(ifcDxfAlignmentPreview);
  const ifcLayerPlanReady = isIfcLayerPlanReady(ifcLayerPlan);
  const modelLayerHandoffReady = isModelLayerHandoffReady(modelLayerHandoff);
  const contextHandoffReady = isContextHandoffReady(contextHandoff);
  const blenderContextImportReady = isBlenderContextImportReady(blenderContextImport);

  if (candidates && !selection) {
    warnings.push('Context candidates exist, but design/context-selection.json is missing.');
    return;
  }
  if (candidates && !matrix) warnings.push('Context candidates exist, but design/context-decision-matrix.generated.json is missing.');
  if (!candidates || !selection) return;

  const candidateIds = new Set((Array.isArray(candidates.candidates) ? candidates.candidates : []).map((candidate) => candidate.id).filter(Boolean));
  const selections = Array.isArray(selection.selections) ? selection.selections : [];
  const selectionIds = new Set(selections.map((item) => item.candidate_id).filter(Boolean));
  const missingSelections = [...candidateIds].filter((id) => !selectionIds.has(id));
  const staleSelections = selections.filter((item) => item?.candidate_id && !candidateIds.has(item.candidate_id));
  const undecidedSelections = selections.filter((item) => item.decision === 'undecided');
  const sourceReviewSelections = selections.filter((item) => item.decision === 'needs_more_source_review');
  const acceptedDesignSeeds = selections.filter((item) => item.decision === 'accepted_as_design_seed');

  if (missingSelections.length) warnings.push(`Context selection is missing candidate decisions: ${missingSelections.join(', ')}`);
  if (staleSelections.length) warnings.push(`Context selection has stale decisions: ${staleSelections.map((item) => item.candidate_id).join(', ')}`);
  if (undecidedSelections.length) warnings.push(`Context selection has undecided candidates: ${undecidedSelections.length}`);
  if (sourceReviewSelections.length && !sourceMap) warnings.push('Context selection has source-review candidates, but design/context-source-map.generated.json is missing.');
  if (sourceReviewSelections.length && !sourceMapping) warnings.push('Context selection has source-review candidates, but design/context-source-mapping.json is missing.');
  if (sourceReviewSelections.length && !sourceReview) warnings.push('Context selection has source-review candidates, but design/context-source-review.generated.json is missing.');
  if (sourceMapping?.summary?.pending_review_count > 0) warnings.push(`Context source mapping has pending review rows: ${sourceMapping.summary.pending_review_count}`);
  if (sourceReview?.summary?.open_human_review_count > 0) warnings.push(`Context source review has open human checks: ${sourceReview.summary.open_human_review_count}`);
  if (sourceReview?.summary?.design_seed_possible_after_review_count > 0 && !ifcSemanticProof) {
    warnings.push('Context source review has an IFC design-seed candidate, but design/ifc-semantic-proof.generated.json is missing.');
  }
  if (sourceReview?.summary?.design_seed_possible_after_review_count > 0 && !ifcOpenShellReviewReady) {
    warnings.push('Context source review has an IFC design-seed candidate, but design/ifcopenshell-semantic-review.generated.json is missing or incomplete.');
  }
  if (ifcSemanticProof?.summary?.ifcbuildingelementproxy_count > 0 && !ifcGeometryPreviewReady) {
    warnings.push('IFC semantic proof exists, but design/ifc-geometry-preview.generated.json is missing or still pending.');
  }
  if (ifcGeometryPreviewReady && sourceMapping?.summary?.accepted_as_context_count > 0 && !ifcDxfAlignmentPreviewReady) {
    warnings.push('IFC geometry preview exists, but design/ifc-dxf-alignment-preview.generated.json is missing or still pending.');
  }
  if (ifcGeometryPreviewReady && !ifcLayerPlanReady) {
    warnings.push('IFC geometry preview exists, but design/ifc-layer-plan.generated.json is missing or still pending.');
  }
  if (sourceReview?.summary?.open_human_review_count > 0 && ifcLayerPlanReady && !ifcHumanReviewPack) {
    warnings.push('IFC source review has open human checks, but design/ifc-human-review-pack.generated.json is missing.');
  }
  if (sourceReview?.summary?.open_human_review_count > 0 && ifcHumanReviewPack && ifcHumanReviewPack.summary?.evidence_ready !== true) {
    warnings.push('IFC human review pack exists, but machine evidence is not ready.');
  }
  if (sourceReview?.summary?.open_human_review_count > 0 && ifcHumanReviewPack?.summary?.evidence_ready === true && !ifcHumanReviewViewer) {
    warnings.push('IFC human review pack evidence is ready, but design/ifc-human-review-viewer.generated.json is missing.');
  }
  if (ifcHumanReviewViewer && ifcHumanReviewViewer.status !== 'ifc_review_viewer_ready') {
    warnings.push('IFC human review viewer exists, but is not ready.');
  }
  if (ifcHumanReviewViewer?.status === 'ifc_review_viewer_ready' && !ifcHumanReviewDecision) {
    warnings.push('IFC human review viewer is ready, but design/ifc-human-review-decision.json is missing.');
  }
  if (ifcHumanReviewViewer?.status === 'ifc_review_viewer_ready' && !ifcHumanReviewGuide) {
    warnings.push('IFC human review viewer is ready, but design/ifc-human-review-guide.generated.json is missing.');
  }
  if (ifcHumanReviewGuide && ifcHumanReviewGuide.status !== 'ifc_human_review_guide_ready') {
    warnings.push('IFC human review guide exists, but is not ready.');
  }
  if (ifcHumanReviewGuide?.status === 'ifc_human_review_guide_ready' && !ifcHumanReviewSession) {
    warnings.push('IFC human review guide is ready, but design/ifc-human-review-session.json is missing.');
  }
  if (ifcHumanReviewSession?.status === 'ifc_human_review_session_positive_decision_blocked') {
    warnings.push('IFC human review session proposes a positive decision but still has pending checks.');
  }
  if (ifcHumanReviewDecision && ifcHumanReviewDecision.summary?.final_decision_recorded !== true) {
    warnings.push('IFC human review decision exists, but final human decision is not recorded.');
  }
  if (
    ifcHumanReviewDecision?.summary?.final_decision_recorded === true
    && ['accepted_as_context', 'accepted_as_design_seed'].includes(ifcHumanReviewDecision.decision)
    && !ifcHumanReviewSession
  ) {
    warnings.push('IFC human review decision is positive, but design/ifc-human-review-session.json is missing.');
  }
  if (
    ifcHumanReviewDecision?.summary?.final_decision_recorded === true
    && ['accepted_as_context', 'accepted_as_design_seed'].includes(ifcHumanReviewDecision.decision)
    && ifcHumanReviewSession?.decision_readiness?.ready !== true
  ) {
    warnings.push('IFC human review decision is positive, but review session is not decision-ready.');
  }
  if (
    ifcHumanReviewDecision?.summary?.final_decision_recorded === true
    && ['accepted_as_context', 'accepted_as_design_seed'].includes(ifcHumanReviewDecision.decision)
    && ifcHumanReviewSession?.proposed_decision !== ifcHumanReviewDecision.decision
  ) {
    warnings.push('IFC human review decision does not match review-session proposed decision.');
  }
  if (ifcHumanReviewDecision?.decision === 'accepted_as_design_seed' && ifcHumanReviewDecision.summary?.design_generation_approval_granted !== true) {
    warnings.push('IFC human review decision accepts a design seed, but design-generation approval is not granted.');
  }
  if (ifcHumanReviewDecision?.decision === 'accepted_as_design_seed' && ifcHumanReviewSession?.summary?.not_applicable_check_count > 0) {
    warnings.push('IFC design-seed decision has not-applicable review-session checks.');
  }
  if (ifcHumanReviewDecision?.summary?.design_generation_approval_granted === true && selection.approved_for_design_generation !== true) {
    warnings.push('IFC human review grants design-generation approval, but context-selection approved_for_design_generation is still false.');
  }
  if (
    ifcHumanReviewDecision?.summary?.final_decision_recorded === true
    && (ifcHumanReviewDecision.summary?.context_selection_update_required || ifcHumanReviewDecision.summary?.source_mapping_update_required)
    && !ifcHumanReviewSync
  ) {
    warnings.push('IFC human review decision is final but design/ifc-human-review-sync.generated.json is missing.');
  }
  if (ifcHumanReviewSync?.status === 'ifc_sync_dry_run_changes_ready') {
    warnings.push('IFC human review sync dry-run has changes ready but they are not applied.');
  }
  if (ifcLayerPlanReady && !modelLayerHandoffReady) {
    warnings.push('IFC layer plan exists, but design/model-layer-handoff.generated.json is missing or still pending.');
  }
  if (!undecidedSelections.length && selections.some((item) => item.decision === 'accepted_as_context') && !contextHandoffReady) {
    warnings.push('Context selection is reviewed, but design/context-handoff.generated.json is missing or still pending.');
  }
  if (contextHandoffReady && !blenderContextImportReady) {
    warnings.push('Context handoff exists, but design/blender-context-import.generated.json is missing or still pending.');
  }
  if (blenderContextSmoke) {
    const objectCount = Number(blenderContextSmoke.object_count || 0);
    const lockedObjectCount = Number(blenderContextSmoke.locked_object_count || 0);
    const reviewOnlyObjectCount = Number(blenderContextSmoke.review_only_object_count || 0);
    if (objectCount > 0 && lockedObjectCount !== objectCount) {
      warnings.push('Blender context smoke exists, but not all generated context objects are locked.');
    }
    if (objectCount > 0 && reviewOnlyObjectCount !== objectCount) {
      warnings.push('Blender context smoke exists, but not all generated context objects are tagged review-only.');
    }
    if (blenderContextSmoke.output_blend && !existsSync(blenderContextSmoke.output_blend)) {
      warnings.push('Blender context smoke summary references an output blend file that does not exist.');
    }
  }
  if (blenderContextAudit) {
    if (blenderContextAudit.status !== 'passed') {
      warnings.push('Blender context audit exists, but did not pass.');
    }
    const meshPolygonCount = Number(blenderContextAudit.summary?.mesh_polygon_count || 0);
    if (meshPolygonCount > 0) {
      warnings.push(`Blender context audit found mesh faces in context-only import: ${meshPolygonCount}`);
    }
    const failures = Array.isArray(blenderContextAudit.failures) ? blenderContextAudit.failures : [];
    for (const failure of failures) warnings.push(`Blender context audit failure: ${failure}`);
  }
  if (acceptedDesignSeeds.length && selection.approved_for_design_generation !== true) {
    warnings.push('Context selection contains accepted design seeds but approved_for_design_generation is not true.');
  }
  if (matrix) {
    const rows = Array.isArray(matrix.rows) ? matrix.rows : [];
    const rowIds = new Set(rows.map((item) => item.candidate_id).filter(Boolean));
    const missingRows = [...candidateIds].filter((id) => !rowIds.has(id));
    if (missingRows.length) warnings.push(`Context decision matrix is missing candidate rows: ${missingRows.join(', ')}`);
  }
}

function isIfcGeometryPreviewReady(preview) {
  return Boolean(
    preview
      && preview.status === 'ifc_geometry_preview_ready_for_human_review'
      && preview.summary?.elements_with_geometry_bbox > 0
  );
}

function isIfcOpenShellReviewReady(review) {
  return Boolean(
    review
      && review.status === 'ifcopenshell_semantic_review_ready'
      && review.summary?.ifcbuildingelementproxy_count > 0
      && review.summary?.machine_checks_passed === review.summary?.machine_check_count
  );
}

function isIfcDxfAlignmentPreviewReady(preview) {
  return Boolean(
    preview
      && preview.status === 'ifc_dxf_alignment_preview_ready_for_human_review'
      && preview.summary?.dxf_accepted_polyline_count > 0
      && preview.summary?.ifc_geometry_bbox_count > 0
  );
}

function isIfcLayerPlanReady(plan) {
  return Boolean(
    plan
      && plan.status === 'ifc_layer_plan_ready_for_human_review'
      && plan.summary?.ifc_element_count > 0
      && plan.summary?.layer_group_count > 0
  );
}

function isContextHandoffReady(handoff) {
  return Boolean(
    handoff
      && ['context_reference_handoff_ready', 'design_seed_handoff_ready'].includes(handoff.status)
      && handoff.summary?.context_input_count > 0
  );
}

function isModelLayerHandoffReady(handoff) {
  return Boolean(
    handoff
      && handoff.status === 'model_layer_handoff_ready_for_human_review'
      && handoff.summary?.layer_export_count > 0
  );
}

function isBlenderContextImportReady(importPlan) {
  return Boolean(
    importPlan
      && importPlan.status === 'blender_context_import_ready_for_review'
      && importPlan.summary?.blender_object_count > 0
  );
}

function readJson(pathname) {
  try {
    return JSON.parse(readFileSync(pathname, 'utf8'));
  } catch (error) {
    failures.push(`${relative(process.cwd(), pathname)} invalid JSON: ${error.message}`);
    return null;
  }
}

function walk(root) {
  const results = [];
  for (const name of readdirSync(root)) {
    const pathname = join(root, name);
    const stats = statSync(pathname);
    if (stats.isDirectory()) results.push(...walk(pathname));
    else results.push(pathname);
  }
  return results;
}

function isSafeRelativePath(value) {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('/') && !value.startsWith('..') && !/^[A-Za-z]:/.test(value);
}

function finish() {
  if (warnings.length) {
    console.log('\nWarnings:');
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (failures.length) {
    console.error('\nPackage check failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log('\nPackage check passed.');
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
