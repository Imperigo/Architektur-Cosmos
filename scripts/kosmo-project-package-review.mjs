#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const manifestPath = join(projectRoot, 'kosmo.project.json');
const publishDir = join(projectRoot, 'publish');
const reviewJsonPath = join(publishDir, 'review-pack.json');
const reviewMdPath = join(publishDir, 'review-pack.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(manifestPath)) throw new Error(`No kosmo.project.json found in ${relative(root, projectRoot)}`);

  const check = runPackageCheck();
  const manifest = readJson(manifestPath);
  const report = buildReport(manifest, check);
  await mkdir(publishDir, { recursive: true });
  await writeFile(reviewJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(reviewMdPath, renderMarkdown(report), 'utf8');

  console.log('Kosmo package review generated');
  console.log(`Project: ${manifest.name} (${manifest.project_id})`);
  console.log(`Readiness: ${report.readiness}`);
  console.log(`Wrote: ${relative(root, reviewMdPath)}`);
  if (report.blockers.length) process.exitCode = 1;
}

function buildReport(manifest, check) {
  const modules = Object.entries(manifest.modules || {}).map(([id, state]) => ({
    id,
    status: state.status,
    owner: state.owner || null,
    summary: state.summary || ''
  }));
  const gates = Object.entries(manifest.review_gates || {}).map(([id, gate]) => ({
    id,
    mode: gate.mode,
    reason: gate.reason || '',
    approved_by: gate.approved_by || null,
    approved_at: gate.approved_at || null
  }));
  const inputs = (manifest.inputs || []).map((item) => artifactStatus(item));
  const outputs = (manifest.outputs || []).map((item) => artifactStatus(item));
  const memory = readMemoryLogs();
  const contextReview = readContextReview();
  const blockers = [];
  const warnings = [];

  if (!check.ok) blockers.push('Package check failed.');
  if (gates.some((gate) => gate.id === 'public_release' && gate.mode !== 'approved')) {
    warnings.push('Public release is not approved.');
  }
  if (gates.some((gate) => gate.id === 'external_upload' && gate.mode !== 'approved')) {
    warnings.push('External upload is not approved.');
  }
  for (const artifact of [...inputs, ...outputs]) {
    if (!artifact.exists) blockers.push(`Missing artifact: ${artifact.path}`);
    if (artifact.rights_status === 'unknown' || artifact.rights_status === 'blocked') {
      warnings.push(`Rights review needed for ${artifact.path}: ${artifact.rights_status}`);
    }
    if (artifact.rights_status === 'generated_needs_review') {
      warnings.push(`Generated output needs review: ${artifact.path}`);
    }
  }
  if (contextReview.candidate_count > 0 && !contextReview.selection_exists) {
    warnings.push('Context candidates exist but design/context-selection.json is missing.');
  }
  if (contextReview.candidate_count > 0 && !contextReview.matrix_exists) {
    warnings.push('Context candidates exist but design/context-decision-matrix.generated.json is missing.');
  }
  if (contextReview.selection_exists && contextReview.undecided_count > 0) {
    warnings.push(`Context selection still has undecided candidates: ${contextReview.undecided_count}`);
  }
  if (contextReview.selection_exists && contextReview.needs_more_source_review_count > 0) {
    warnings.push(`Context selection needs source review for candidates: ${contextReview.needs_more_source_review_count}`);
  }
  if (contextReview.selection_exists && contextReview.needs_more_source_review_count > 0 && !contextReview.source_review_exists) {
    warnings.push('Context selection has source-review candidates but design/context-source-review.generated.json is missing.');
  }
  if (contextReview.selection_exists && contextReview.needs_more_source_review_count > 0 && !contextReview.source_map_exists) {
    warnings.push('Context selection has source-review candidates but design/context-source-map.generated.json is missing.');
  }
  if (contextReview.selection_exists && contextReview.needs_more_source_review_count > 0 && !contextReview.source_mapping_exists) {
    warnings.push('Context selection has source-review candidates but design/context-source-mapping.json is missing.');
  }
  if (contextReview.source_mapping_exists && contextReview.source_mapping_pending_review_count > 0) {
    warnings.push(`Context source mapping still has pending review rows: ${contextReview.source_mapping_pending_review_count}`);
  }
  if (contextReview.source_review_exists && contextReview.source_review_open_human_review_count > 0) {
    warnings.push(`Context source review still has open human checks: ${contextReview.source_review_open_human_review_count}`);
  }
  if (contextReview.source_review_design_seed_possible_after_review_count > 0 && !contextReview.ifc_semantic_proof_exists) {
    warnings.push('IFC semantic proof is missing for source-review design-seed candidate.');
  }
  if (contextReview.ifc_semantic_proof_proxy_count > 0 && !contextReview.ifc_geometry_preview_ready) {
    warnings.push('IFC geometry preview is missing or still pending for semantic IFC proof.');
  }
  if (contextReview.ifc_geometry_preview_ready && contextReview.source_mapping_accepted_as_context_count > 0 && !contextReview.ifc_dxf_alignment_preview_ready) {
    warnings.push('IFC/DXF alignment preview is missing or still pending for reviewed DXF context.');
  }
  if (contextReview.ifc_geometry_preview_ready && !contextReview.ifc_layer_plan_ready) {
    warnings.push('IFC layer plan is missing or still pending for Blender/ArchiCAD layer review.');
  }
  if (contextReview.ifc_layer_plan_ready && !contextReview.model_layer_handoff_ready) {
    warnings.push('Model layer handoff is missing or still pending for Blender/ArchiCAD export review.');
  }
  if (contextReview.selection_exists && contextReview.undecided_count === 0 && contextReview.accepted_as_context_count > 0 && !contextReview.context_handoff_ready) {
    warnings.push('Kosmo Design context handoff is missing or still pending.');
  }
  if (contextReview.context_handoff_ready && !contextReview.blender_context_import_ready) {
    warnings.push('Blender context import is missing or still pending for read-only context review.');
  }
  if (contextReview.accepted_as_design_seed_count > 0 && !contextReview.approved_for_design_generation) {
    warnings.push('Context candidates are selected as design seed but final design-generation approval is still false.');
  }

  const moduleSummary = {
    total: modules.length,
    pending: modules.filter((item) => item.status === 'pending').length,
    in_progress: modules.filter((item) => item.status === 'in_progress').length,
    review_ready: modules.filter((item) => item.status === 'review_ready').length,
    approved: modules.filter((item) => item.status === 'approved').length,
    blocked: modules.filter((item) => item.status === 'blocked').length,
    skipped: modules.filter((item) => item.status === 'skipped').length
  };

  const readiness = blockers.length
    ? 'blocked'
    : warnings.length
      ? 'review_required'
      : 'ready_for_local_review';

  return {
    generated_at: new Date().toISOString(),
    generator: 'kosmo-project-package-review',
    project: {
      id: manifest.project_id,
      name: manifest.name,
      root: relative(root, projectRoot),
      risk_level: manifest.risk_level,
      status: manifest.status || 'draft'
    },
    site: manifest.site || {},
    readiness,
    package_check: {
      ok: check.ok,
      command: check.command,
      output: check.output.trim()
    },
    module_summary: moduleSummary,
    modules,
    gates,
    inputs,
    outputs,
    context_review: contextReview,
    memory,
    blockers,
    warnings,
    next_actions: nextActions({ modules, gates, blockers, warnings, outputs, contextReview })
  };
}

function artifactStatus(item) {
  const fullPath = join(projectRoot, item.path || '');
  return {
    ...item,
    exists: Boolean(item.path && existsSync(fullPath)),
    size_bytes: item.path && existsSync(fullPath) ? statSync(fullPath).size : 0
  };
}

function readMemoryLogs() {
  return {
    decisions: readJsonl(join(projectRoot, 'memory/decisions.jsonl')).slice(-5),
    jobs: readJsonl(join(projectRoot, 'memory/jobs.jsonl')).slice(-5),
    uncertainties: readJsonl(join(projectRoot, 'memory/uncertainty-log.jsonl')).slice(-5)
  };
}

function readContextReview() {
  const candidatesPath = join(projectRoot, 'design/context-candidates.generated.json');
  const selectionPath = join(projectRoot, 'design/context-selection.json');
  const matrixPath = join(projectRoot, 'design/context-decision-matrix.generated.json');
  const sourceMapPath = join(projectRoot, 'design/context-source-map.generated.json');
  const sourceMappingPath = join(projectRoot, 'design/context-source-mapping.json');
  const sourceReviewPath = join(projectRoot, 'design/context-source-review.generated.json');
  const ifcSemanticProofPath = join(projectRoot, 'design/ifc-semantic-proof.generated.json');
  const ifcGeometryPreviewPath = join(projectRoot, 'design/ifc-geometry-preview.generated.json');
  const ifcDxfAlignmentPreviewPath = join(projectRoot, 'design/ifc-dxf-alignment-preview.generated.json');
  const ifcLayerPlanPath = join(projectRoot, 'design/ifc-layer-plan.generated.json');
  const modelLayerHandoffPath = join(projectRoot, 'design/model-layer-handoff.generated.json');
  const contextHandoffPath = join(projectRoot, 'design/context-handoff.generated.json');
  const blenderContextImportPath = join(projectRoot, 'design/blender-context-import.generated.json');
  const candidates = existsSync(candidatesPath) ? safeReadJson(candidatesPath) : null;
  const selection = existsSync(selectionPath) ? safeReadJson(selectionPath) : null;
  const matrix = existsSync(matrixPath) ? safeReadJson(matrixPath) : null;
  const sourceMap = existsSync(sourceMapPath) ? safeReadJson(sourceMapPath) : null;
  const sourceMapping = existsSync(sourceMappingPath) ? safeReadJson(sourceMappingPath) : null;
  const sourceReview = existsSync(sourceReviewPath) ? safeReadJson(sourceReviewPath) : null;
  const ifcSemanticProof = existsSync(ifcSemanticProofPath) ? safeReadJson(ifcSemanticProofPath) : null;
  const ifcGeometryPreview = existsSync(ifcGeometryPreviewPath) ? safeReadJson(ifcGeometryPreviewPath) : null;
  const ifcDxfAlignmentPreview = existsSync(ifcDxfAlignmentPreviewPath) ? safeReadJson(ifcDxfAlignmentPreviewPath) : null;
  const ifcLayerPlan = existsSync(ifcLayerPlanPath) ? safeReadJson(ifcLayerPlanPath) : null;
  const modelLayerHandoff = existsSync(modelLayerHandoffPath) ? safeReadJson(modelLayerHandoffPath) : null;
  const contextHandoff = existsSync(contextHandoffPath) ? safeReadJson(contextHandoffPath) : null;
  const blenderContextImport = existsSync(blenderContextImportPath) ? safeReadJson(blenderContextImportPath) : null;
  const selections = Array.isArray(selection?.selections) ? selection.selections : [];
  const rows = Array.isArray(matrix?.rows) ? matrix.rows : [];
  const candidateCount = numberOrDefault(candidates?.summary?.candidate_count, Array.isArray(candidates?.candidates) ? candidates.candidates.length : 0);
  const countDecision = (decision) => selections.filter((item) => item.decision === decision).length;
  const countRecommended = (decision) => rows.filter((item) => item.recommended_decision === decision).length;

  return {
    candidates_exists: Boolean(candidates),
    selection_exists: Boolean(selection),
    matrix_exists: Boolean(matrix),
    candidate_count: candidateCount,
    selection_count: selections.length,
    matrix_row_count: rows.length,
    accepted_as_context_count: countDecision('accepted_as_context'),
    accepted_as_design_seed_count: countDecision('accepted_as_design_seed'),
    needs_more_source_review_count: countDecision('needs_more_source_review'),
    rejected_count: countDecision('rejected'),
    undecided_count: countDecision('undecided'),
    recommended_accepted_as_context_count: countRecommended('accepted_as_context'),
    recommended_accepted_as_design_seed_count: countRecommended('accepted_as_design_seed'),
    recommended_needs_more_source_review_count: countRecommended('needs_more_source_review'),
    recommended_rejected_count: countRecommended('rejected'),
    source_map_exists: Boolean(sourceMap),
    source_map_dxf_layer_count: numberOrDefault(sourceMap?.summary?.dxf_layer_count, 0),
    source_map_dxf_total_polylines: numberOrDefault(sourceMap?.summary?.dxf_total_polylines, 0),
    source_map_ifc_entity_type_count: numberOrDefault(sourceMap?.summary?.ifc_entity_type_count, 0),
    source_map_ifc_semantic_building_element_count: numberOrDefault(sourceMap?.summary?.ifc_semantic_building_element_count, 0),
    source_map_design_seed_candidate_after_review_count: numberOrDefault(sourceMap?.summary?.design_seed_candidate_after_review_count, 0),
    source_mapping_exists: Boolean(sourceMapping),
    source_mapping_row_count: numberOrDefault(sourceMapping?.summary?.mapping_row_count, 0),
    source_mapping_pending_review_count: numberOrDefault(sourceMapping?.summary?.pending_review_count, 0),
    source_mapping_accepted_as_context_count: numberOrDefault(sourceMapping?.summary?.accepted_as_context_count, 0),
    source_mapping_accepted_as_design_seed_count: numberOrDefault(sourceMapping?.summary?.accepted_as_design_seed_count, 0),
    source_mapping_needs_more_source_review_count: numberOrDefault(sourceMapping?.summary?.needs_more_source_review_count, 0),
    source_mapping_rejected_count: numberOrDefault(sourceMapping?.summary?.rejected_count, 0),
    source_review_exists: Boolean(sourceReview),
    source_review_target_count: numberOrDefault(sourceReview?.summary?.target_count, 0),
    source_review_evidence_confirmed_count: numberOrDefault(sourceReview?.summary?.automated_evidence_confirmed_count, 0),
    source_review_open_human_review_count: numberOrDefault(sourceReview?.summary?.open_human_review_count, 0),
    source_review_design_seed_possible_after_review_count: numberOrDefault(sourceReview?.summary?.design_seed_possible_after_review_count, 0),
    ifc_semantic_proof_exists: Boolean(ifcSemanticProof),
    ifc_semantic_proof_engine: ifcSemanticProof?.engine?.name || null,
    ifc_semantic_proof_proxy_count: numberOrDefault(ifcSemanticProof?.summary?.ifcbuildingelementproxy_count, 0),
    ifc_semantic_proof_contained_count: numberOrDefault(ifcSemanticProof?.summary?.elements_contained_in_spatial_structure, 0),
    ifc_semantic_proof_property_set_element_count: numberOrDefault(ifcSemanticProof?.summary?.elements_with_property_sets, 0),
    ifc_semantic_proof_integrity_score: numberOrDefault(ifcSemanticProof?.summary?.semantic_integrity_score, 0),
    ifc_semantic_proof_design_seed_approved: Boolean(ifcSemanticProof?.summary?.design_seed_approved),
    ifc_geometry_preview_exists: Boolean(ifcGeometryPreview),
    ifc_geometry_preview_status: ifcGeometryPreview?.status || null,
    ifc_geometry_preview_ready: isIfcGeometryPreviewReady(ifcGeometryPreview),
    ifc_geometry_preview_element_count: numberOrDefault(ifcGeometryPreview?.summary?.ifcbuildingelementproxy_count, 0),
    ifc_geometry_preview_bbox_count: numberOrDefault(ifcGeometryPreview?.summary?.elements_with_geometry_bbox, 0),
    ifc_geometry_preview_face_count: numberOrDefault(ifcGeometryPreview?.summary?.faces_resolved, 0),
    ifc_geometry_preview_width: numberOrDefault(ifcGeometryPreview?.summary?.global_width_m_estimate, 0),
    ifc_geometry_preview_depth: numberOrDefault(ifcGeometryPreview?.summary?.global_depth_m_estimate, 0),
    ifc_geometry_preview_height: numberOrDefault(ifcGeometryPreview?.summary?.global_height_m_estimate, 0),
    ifc_dxf_alignment_preview_exists: Boolean(ifcDxfAlignmentPreview),
    ifc_dxf_alignment_preview_status: ifcDxfAlignmentPreview?.status || null,
    ifc_dxf_alignment_preview_ready: isIfcDxfAlignmentPreviewReady(ifcDxfAlignmentPreview),
    ifc_dxf_alignment_dxf_polyline_count: numberOrDefault(ifcDxfAlignmentPreview?.summary?.dxf_accepted_polyline_count, 0),
    ifc_dxf_alignment_ifc_bbox_count: numberOrDefault(ifcDxfAlignmentPreview?.summary?.ifc_geometry_bbox_count, 0),
    ifc_dxf_alignment_center_offset: numberOrDefault(ifcDxfAlignmentPreview?.summary?.center_offset_m_estimate, 0),
    ifc_dxf_alignment_overlap_ratio: numberOrDefault(ifcDxfAlignmentPreview?.summary?.overlap_ratio_of_smaller_bbox, 0),
    ifc_dxf_alignment_hint: ifcDxfAlignmentPreview?.summary?.alignment_hint || null,
    ifc_layer_plan_exists: Boolean(ifcLayerPlan),
    ifc_layer_plan_status: ifcLayerPlan?.status || null,
    ifc_layer_plan_ready: isIfcLayerPlanReady(ifcLayerPlan),
    ifc_layer_plan_element_count: numberOrDefault(ifcLayerPlan?.summary?.ifc_element_count, 0),
    ifc_layer_plan_group_count: numberOrDefault(ifcLayerPlan?.summary?.layer_group_count, 0),
    ifc_layer_plan_material_group_count: numberOrDefault(ifcLayerPlan?.summary?.material_group_count, 0),
    ifc_layer_plan_structure_element_count: numberOrDefault(ifcLayerPlan?.summary?.structure_element_count, 0),
    ifc_layer_plan_facade_element_count: numberOrDefault(ifcLayerPlan?.summary?.facade_element_count, 0),
    model_layer_handoff_exists: Boolean(modelLayerHandoff),
    model_layer_handoff_status: modelLayerHandoff?.status || null,
    model_layer_handoff_ready: isModelLayerHandoffReady(modelLayerHandoff),
    model_layer_handoff_layer_export_count: numberOrDefault(modelLayerHandoff?.summary?.layer_export_count, 0),
    model_layer_handoff_planned_glb_count: numberOrDefault(modelLayerHandoff?.summary?.planned_glb_count, 0),
    model_layer_handoff_blender_collection_count: numberOrDefault(modelLayerHandoff?.summary?.blender_collection_count, 0),
    model_layer_handoff_archicad_layer_count: numberOrDefault(modelLayerHandoff?.summary?.archicad_layer_count, 0),
    model_layer_handoff_glb_export_allowed: Boolean(modelLayerHandoff?.summary?.glb_export_allowed),
    context_handoff_exists: Boolean(contextHandoff),
    context_handoff_status: contextHandoff?.status || null,
    context_handoff_ready: isContextHandoffReady(contextHandoff),
    context_handoff_mode: contextHandoff?.summary?.handoff_mode || null,
    context_handoff_context_input_count: numberOrDefault(contextHandoff?.summary?.context_input_count, 0),
    context_handoff_design_seed_allowed_count: numberOrDefault(contextHandoff?.summary?.design_seed_allowed_count, 0),
    context_handoff_blocked_input_count: numberOrDefault(contextHandoff?.summary?.blocked_input_count, 0),
    blender_context_import_exists: Boolean(blenderContextImport),
    blender_context_import_status: blenderContextImport?.status || null,
    blender_context_import_ready: isBlenderContextImportReady(blenderContextImport),
    blender_context_import_object_count: numberOrDefault(blenderContextImport?.summary?.blender_object_count, 0),
    blender_context_import_dxf_polyline_count: numberOrDefault(blenderContextImport?.summary?.dxf_embedded_polyline_count, 0),
    blender_context_import_ifc_bbox_count: numberOrDefault(blenderContextImport?.summary?.ifc_bbox_count, 0),
    blender_context_import_layer_collection_count: numberOrDefault(blenderContextImport?.summary?.ifc_layer_collection_count, 0),
    stale_selection_count: numberOrDefault(selection?.summary?.stale_selection_count, Array.isArray(selection?.stale_selections) ? selection.stale_selections.length : 0),
    readiness: selection?.summary?.readiness || matrix?.summary?.recommended_next_step || candidates?.summary?.suggested_next_step || null,
    approved_for_design_generation: Boolean(selection?.approved_for_design_generation)
  };
}

function readJsonl(pathname) {
  if (!existsSync(pathname)) return [];
  return readFileSync(pathname, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { invalid_jsonl: line };
      }
    });
}

function nextActions({ modules, gates, blockers, warnings, outputs, contextReview }) {
  if (blockers.length) return ['Fix missing artifacts or invalid JSON before continuing.'];
  const actions = [];
  if (contextReview?.candidate_count > 0 && !contextReview.matrix_exists) actions.push('Create design/context-decision-matrix.generated.json from context candidates.');
  if (contextReview?.candidate_count > 0 && !contextReview.selection_exists) actions.push('Create design/context-selection.json from context candidates.');
  if (contextReview?.selection_exists && contextReview.undecided_count > 0) actions.push('Review context-selection decisions before using candidates as design input.');
  if (contextReview?.selection_exists && contextReview.needs_more_source_review_count > 0 && !contextReview.source_map_exists) actions.push('Create design/context-source-map.generated.json to inventory DXF layers and IFC entity types.');
  if (contextReview?.selection_exists && contextReview.needs_more_source_review_count > 0 && !contextReview.source_mapping_exists) actions.push('Create design/context-source-mapping.json for explicit DXF layer and IFC mapping decisions.');
  if (contextReview?.source_mapping_pending_review_count > 0) actions.push('Review pending source-mapping rows before syncing decisions to context-selection.');
  if (contextReview?.selection_exists && contextReview.needs_more_source_review_count > 0 && !contextReview.source_review_exists) actions.push('Create design/context-source-review.generated.json for candidates marked needs_more_source_review.');
  if (contextReview?.selection_exists && contextReview.needs_more_source_review_count > 0) actions.push('Verify sources for context-selection candidates marked needs_more_source_review.');
  if (contextReview?.source_review_design_seed_possible_after_review_count > 0 && !contextReview.ifc_semantic_proof_exists) actions.push('Run npm run kosmo:ifc-semantic-proof for semantic IFC evidence before design-seed review.');
  if (contextReview?.ifc_semantic_proof_exists && contextReview?.source_review_open_human_review_count > 0) actions.push('Human-review IFC semantic proof before changing IFC source-review decision.');
  if (contextReview?.ifc_semantic_proof_proxy_count > 0 && !contextReview.ifc_geometry_preview_ready) actions.push('Run npm run kosmo:ifc-geometry-preview for a visual IFC top-projection review.');
  if (contextReview?.ifc_geometry_preview_ready && contextReview?.source_mapping_accepted_as_context_count > 0 && !contextReview.ifc_dxf_alignment_preview_ready) actions.push('Run npm run kosmo:ifc-dxf-alignment-preview to compare IFC bboxes with accepted DXF context.');
  if (contextReview?.ifc_geometry_preview_ready && !contextReview.ifc_layer_plan_ready) actions.push('Run npm run kosmo:ifc-layer-plan to propose Blender collections and ArchiCAD layers.');
  if (contextReview?.ifc_layer_plan_ready && !contextReview.model_layer_handoff_ready) actions.push('Run npm run kosmo:model-layer-handoff to create the review-only Blender/ArchiCAD export handoff.');
  if (contextReview?.selection_exists && contextReview?.undecided_count === 0 && contextReview?.accepted_as_context_count > 0 && !contextReview.context_handoff_ready) actions.push('Run npm run kosmo:context-handoff to create the Kosmo Design context-only handoff.');
  if (contextReview?.context_handoff_ready && !contextReview.blender_context_import_ready) actions.push('Run npm run kosmo:blender-context-import to create a locked Blender context review script.');
  if (contextReview?.ifc_geometry_preview_exists && contextReview?.source_review_open_human_review_count > 0) actions.push('Compare IFC geometry preview against DXF context before any design-seed approval.');
  if (contextReview?.source_map_design_seed_candidate_after_review_count > 0) actions.push('Review source-map semantic candidates before any design-seed approval.');
  if (contextReview?.accepted_as_design_seed_count > 0 && !contextReview.approved_for_design_generation) actions.push('Set final approval only after a human has checked context-selection.');
  if (modules.some((module) => module.id === 'data' && module.status === 'pending')) actions.push('Let Kosmo Data add reviewed references, sources and asset candidates.');
  if (modules.some((module) => module.id === 'design' && module.status === 'pending')) actions.push('Import design/model-profile.json into Kosmo Design and write an import status.');
  if (modules.some((module) => module.id === 'draw' && module.status === 'pending')) actions.push('Replace placeholder SVG exports with Kosmo Draw generated plans.');
  if (modules.some((module) => module.id === 'viz' && module.status === 'pending')) actions.push('Generate a first Kosmo Viz preview or camera check.');
  if (outputs.some((item) => item.rights_status === 'generated_needs_review')) actions.push('Review generated outputs before any public or external use.');
  if (gates.some((gate) => gate.id === 'paid_cloud_job' && gate.mode === 'requires_human_approval')) actions.push('Ask for explicit approval before paid cloud jobs.');
  if (warnings.length && !actions.length) actions.push('Resolve warnings before promotion.');
  return actions.length ? actions : ['Package is ready for local owner review.'];
}

function renderMarkdown(report) {
  const lines = [
    `# ${report.project.name} Review Pack`,
    '',
    `Generated: ${report.generated_at}`,
    `Project ID: \`${report.project.id}\``,
    `Risk level: \`${report.project.risk_level}\``,
    `Readiness: \`${report.readiness}\``,
    '',
    '## Module Status',
    '',
    '| Module | Status | Owner | Summary |',
    '| --- | --- | --- | --- |'
  ];

  for (const moduleState of report.modules) {
    lines.push(`| ${moduleState.id} | ${moduleState.status} | ${moduleState.owner || '-'} | ${escapePipe(moduleState.summary)} |`);
  }

  lines.push('', '## Review Gates', '', '| Gate | Mode | Reason |', '| --- | --- | --- |');
  for (const gate of report.gates) {
    lines.push(`| ${gate.id} | ${gate.mode} | ${escapePipe(gate.reason)} |`);
  }

  lines.push('', '## Inputs', '');
  appendArtifactList(lines, report.inputs);
  lines.push('', '## Outputs', '');
  appendArtifactList(lines, report.outputs);

  lines.push('', '## Context Selection', '');
  appendContextReview(lines, report.context_review);

  lines.push('', '## Blockers', '');
  appendList(lines, report.blockers);
  lines.push('', '## Warnings', '');
  appendList(lines, report.warnings);
  lines.push('', '## Recent Memory', '');
  lines.push(`- decisions: ${report.memory.decisions.length}`);
  lines.push(`- jobs: ${report.memory.jobs.length}`);
  lines.push(`- uncertainties: ${report.memory.uncertainties.length}`);
  lines.push('', '## Next Actions', '');
  appendList(lines, report.next_actions);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function appendArtifactList(lines, artifacts) {
  if (!artifacts.length) {
    lines.push('- none');
    return;
  }
  for (const item of artifacts) {
    const marker = item.exists ? 'ok' : 'missing';
    lines.push(`- ${marker}: \`${item.path}\` (${item.module}, ${item.type}, ${item.rights_status})`);
  }
}

function appendList(lines, items) {
  if (!items.length) {
    lines.push('- none');
    return;
  }
  for (const item of items) lines.push(`- ${item}`);
}

function appendContextReview(lines, contextReview) {
  if (!contextReview.candidates_exists && !contextReview.selection_exists) {
    lines.push('- no context candidates or selection file yet');
    return;
  }
  lines.push(`- candidates: ${contextReview.candidate_count}`);
  lines.push(`- selection file: ${contextReview.selection_exists ? 'present' : 'missing'}`);
  lines.push(`- decision matrix: ${contextReview.matrix_exists ? 'present' : 'missing'}`);
  lines.push(`- accepted as context: ${contextReview.accepted_as_context_count}`);
  lines.push(`- accepted as design seed: ${contextReview.accepted_as_design_seed_count}`);
  lines.push(`- needs more source review: ${contextReview.needs_more_source_review_count}`);
  lines.push(`- rejected: ${contextReview.rejected_count}`);
  lines.push(`- undecided: ${contextReview.undecided_count}`);
  lines.push(`- matrix recommends context-only: ${contextReview.recommended_accepted_as_context_count}`);
  lines.push(`- matrix recommends design seed: ${contextReview.recommended_accepted_as_design_seed_count}`);
  lines.push(`- matrix recommends source review: ${contextReview.recommended_needs_more_source_review_count}`);
  lines.push(`- matrix recommends rejected: ${contextReview.recommended_rejected_count}`);
  lines.push(`- source map: ${contextReview.source_map_exists ? 'present' : 'missing'}`);
  lines.push(`- source map DXF layers: ${contextReview.source_map_dxf_layer_count}`);
  lines.push(`- source map DXF polylines: ${contextReview.source_map_dxf_total_polylines}`);
  lines.push(`- source map IFC entity types: ${contextReview.source_map_ifc_entity_type_count}`);
  lines.push(`- source map IFC semantic elements: ${contextReview.source_map_ifc_semantic_building_element_count}`);
  lines.push(`- source map design-seed candidates after review: ${contextReview.source_map_design_seed_candidate_after_review_count}`);
  lines.push(`- source mapping: ${contextReview.source_mapping_exists ? 'present' : 'missing'}`);
  lines.push(`- source mapping rows: ${contextReview.source_mapping_row_count}`);
  lines.push(`- source mapping pending: ${contextReview.source_mapping_pending_review_count}`);
  lines.push(`- source mapping accepted context: ${contextReview.source_mapping_accepted_as_context_count}`);
  lines.push(`- source mapping accepted design seed: ${contextReview.source_mapping_accepted_as_design_seed_count}`);
  lines.push(`- source mapping needs source review: ${contextReview.source_mapping_needs_more_source_review_count}`);
  lines.push(`- source mapping rejected: ${contextReview.source_mapping_rejected_count}`);
  lines.push(`- source review: ${contextReview.source_review_exists ? 'present' : 'missing'}`);
  lines.push(`- source review targets: ${contextReview.source_review_target_count}`);
  lines.push(`- source evidence confirmed: ${contextReview.source_review_evidence_confirmed_count}`);
  lines.push(`- source human checks open: ${contextReview.source_review_open_human_review_count}`);
  lines.push(`- source review design-seed possible after review: ${contextReview.source_review_design_seed_possible_after_review_count}`);
  lines.push(`- IFC semantic proof: ${contextReview.ifc_semantic_proof_exists ? 'present' : 'missing'}`);
  lines.push(`- IFC semantic proof engine: ${contextReview.ifc_semantic_proof_engine || '-'}`);
  lines.push(`- IFC semantic proxies: ${contextReview.ifc_semantic_proof_proxy_count}`);
  lines.push(`- IFC semantic contained proxies: ${contextReview.ifc_semantic_proof_contained_count}`);
  lines.push(`- IFC semantic proxies with property sets: ${contextReview.ifc_semantic_proof_property_set_element_count}`);
  lines.push(`- IFC semantic integrity score: ${contextReview.ifc_semantic_proof_integrity_score}`);
  lines.push(`- IFC geometry preview: ${ifcGeometryPreviewLabel(contextReview)}`);
  lines.push(`- IFC geometry preview elements: ${contextReview.ifc_geometry_preview_element_count}`);
  lines.push(`- IFC geometry preview bboxes: ${contextReview.ifc_geometry_preview_bbox_count}`);
  lines.push(`- IFC geometry preview faces: ${contextReview.ifc_geometry_preview_face_count}`);
  lines.push(`- IFC geometry preview extents: ${contextReview.ifc_geometry_preview_width} x ${contextReview.ifc_geometry_preview_depth} x ${contextReview.ifc_geometry_preview_height} m`);
  lines.push(`- IFC/DXF alignment preview: ${ifcDxfAlignmentPreviewLabel(contextReview)}`);
  lines.push(`- IFC/DXF alignment DXF polylines: ${contextReview.ifc_dxf_alignment_dxf_polyline_count}`);
  lines.push(`- IFC/DXF alignment IFC bboxes: ${contextReview.ifc_dxf_alignment_ifc_bbox_count}`);
  lines.push(`- IFC/DXF alignment center offset: ${contextReview.ifc_dxf_alignment_center_offset} m`);
  lines.push(`- IFC/DXF alignment overlap ratio: ${contextReview.ifc_dxf_alignment_overlap_ratio}`);
  lines.push(`- IFC/DXF alignment hint: ${contextReview.ifc_dxf_alignment_hint || '-'}`);
  lines.push(`- IFC layer plan: ${ifcLayerPlanLabel(contextReview)}`);
  lines.push(`- IFC layer plan elements: ${contextReview.ifc_layer_plan_element_count}`);
  lines.push(`- IFC layer plan groups: ${contextReview.ifc_layer_plan_group_count}`);
  lines.push(`- IFC layer plan material groups: ${contextReview.ifc_layer_plan_material_group_count}`);
  lines.push(`- IFC layer plan structure elements: ${contextReview.ifc_layer_plan_structure_element_count}`);
  lines.push(`- IFC layer plan facade elements: ${contextReview.ifc_layer_plan_facade_element_count}`);
  lines.push(`- model layer handoff: ${modelLayerHandoffLabel(contextReview)}`);
  lines.push(`- model layer handoff layer exports: ${contextReview.model_layer_handoff_layer_export_count}`);
  lines.push(`- model layer handoff planned GLBs: ${contextReview.model_layer_handoff_planned_glb_count}`);
  lines.push(`- model layer handoff Blender collections: ${contextReview.model_layer_handoff_blender_collection_count}`);
  lines.push(`- model layer handoff ArchiCAD layers: ${contextReview.model_layer_handoff_archicad_layer_count}`);
  lines.push(`- model layer handoff GLB export allowed: ${contextReview.model_layer_handoff_glb_export_allowed ? 'yes' : 'no'}`);
  lines.push(`- context handoff: ${contextHandoffLabel(contextReview)}`);
  lines.push(`- context handoff mode: ${contextReview.context_handoff_mode || '-'}`);
  lines.push(`- context handoff context inputs: ${contextReview.context_handoff_context_input_count}`);
  lines.push(`- context handoff design seeds allowed: ${contextReview.context_handoff_design_seed_allowed_count}`);
  lines.push(`- context handoff blocked inputs: ${contextReview.context_handoff_blocked_input_count}`);
  lines.push(`- Blender context import: ${blenderContextImportLabel(contextReview)}`);
  lines.push(`- Blender context import objects: ${contextReview.blender_context_import_object_count}`);
  lines.push(`- Blender context import DXF polylines: ${contextReview.blender_context_import_dxf_polyline_count}`);
  lines.push(`- Blender context import IFC bboxes: ${contextReview.blender_context_import_ifc_bbox_count}`);
  lines.push(`- Blender context import layer collections: ${contextReview.blender_context_import_layer_collection_count}`);
  lines.push(`- approved for design generation: ${contextReview.approved_for_design_generation ? 'yes' : 'no'}`);
  lines.push(`- readiness: ${contextReview.readiness || 'unknown'}`);
}

function isIfcGeometryPreviewReady(preview) {
  return Boolean(
    preview
      && preview.status === 'ifc_geometry_preview_ready_for_human_review'
      && preview.summary?.elements_with_geometry_bbox > 0
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

function ifcGeometryPreviewLabel(contextReview) {
  if (!contextReview.ifc_geometry_preview_exists) return 'missing';
  if (contextReview.ifc_geometry_preview_ready) return 'ready';
  return `pending (${contextReview.ifc_geometry_preview_status || 'unknown'})`;
}

function ifcDxfAlignmentPreviewLabel(contextReview) {
  if (!contextReview.ifc_dxf_alignment_preview_exists) return 'missing';
  if (contextReview.ifc_dxf_alignment_preview_ready) return 'ready';
  return `pending (${contextReview.ifc_dxf_alignment_preview_status || 'unknown'})`;
}

function ifcLayerPlanLabel(contextReview) {
  if (!contextReview.ifc_layer_plan_exists) return 'missing';
  if (contextReview.ifc_layer_plan_ready) return 'ready';
  return `pending (${contextReview.ifc_layer_plan_status || 'unknown'})`;
}

function modelLayerHandoffLabel(contextReview) {
  if (!contextReview.model_layer_handoff_exists) return 'missing';
  if (contextReview.model_layer_handoff_ready) return 'ready';
  return `pending (${contextReview.model_layer_handoff_status || 'unknown'})`;
}

function contextHandoffLabel(contextReview) {
  if (!contextReview.context_handoff_exists) return 'missing';
  if (contextReview.context_handoff_ready) return 'ready';
  return `pending (${contextReview.context_handoff_status || 'unknown'})`;
}

function blenderContextImportLabel(contextReview) {
  if (!contextReview.blender_context_import_exists) return 'missing';
  if (contextReview.blender_context_import_ready) return 'ready';
  return `pending (${contextReview.blender_context_import_status || 'unknown'})`;
}

function runPackageCheck() {
  const command = `npm run kosmo:package-check -- --project ${relative(root, projectRoot)}`;
  const result = spawnSync('npm', ['run', 'kosmo:package-check', '--', '--project', relative(root, projectRoot)], {
    cwd: root,
    encoding: 'utf8'
  });
  return {
    ok: result.status === 0,
    command,
    output: `${result.stdout || ''}${result.stderr || ''}`
  };
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function safeReadJson(pathname) {
  try {
    return readJson(pathname);
  } catch {
    return null;
  }
}

function numberOrDefault(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function escapePipe(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
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
