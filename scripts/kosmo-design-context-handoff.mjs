#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const outputJsonPath = join(projectRoot, args.output || 'design/context-handoff.generated.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/context-handoff.generated.md');

const paths = {
  manifest: join(projectRoot, 'kosmo.project.json'),
  candidates: join(projectRoot, 'design/context-candidates.generated.json'),
  selection: join(projectRoot, 'design/context-selection.json'),
  contextImport: join(projectRoot, 'design/context-import.generated.json'),
  sourceMap: join(projectRoot, 'design/context-source-map.generated.json'),
  sourceMapping: join(projectRoot, 'design/context-source-mapping.json'),
  sourceReview: join(projectRoot, 'design/context-source-review.generated.json'),
  ifcSemanticProof: join(projectRoot, 'design/ifc-semantic-proof.generated.json'),
  ifcGeometryPreview: join(projectRoot, 'design/ifc-geometry-preview.generated.json'),
  ifcDxfAlignmentPreview: join(projectRoot, 'design/ifc-dxf-alignment-preview.generated.json'),
  ifcLayerPlan: join(projectRoot, 'design/ifc-layer-plan.generated.json')
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const handoff = buildHandoff();

  await mkdir(dirname(outputJsonPath), { recursive: true });
  await mkdir(dirname(outputMdPath), { recursive: true });
  await writeFile(outputJsonPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(handoff), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo Design context handoff generated');
  console.log(`Project: ${handoff.project_id}`);
  console.log(`Status: ${handoff.status}`);
  console.log(`Mode: ${handoff.summary.handoff_mode}`);
  console.log(`Context inputs: ${handoff.summary.context_input_count}`);
  console.log(`Design seeds: ${handoff.summary.design_seed_input_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildHandoff() {
  const manifest = existsSync(paths.manifest) ? readJson(paths.manifest) : null;
  const candidates = existsSync(paths.candidates) ? readJson(paths.candidates) : null;
  const selection = existsSync(paths.selection) ? readJson(paths.selection) : null;
  const contextImport = existsSync(paths.contextImport) ? readJson(paths.contextImport) : null;
  const sourceMap = existsSync(paths.sourceMap) ? readJson(paths.sourceMap) : null;
  const sourceMapping = existsSync(paths.sourceMapping) ? readJson(paths.sourceMapping) : null;
  const sourceReview = existsSync(paths.sourceReview) ? readJson(paths.sourceReview) : null;
  const ifcSemanticProof = existsSync(paths.ifcSemanticProof) ? readJson(paths.ifcSemanticProof) : null;
  const ifcGeometryPreview = existsSync(paths.ifcGeometryPreview) ? readJson(paths.ifcGeometryPreview) : null;
  const ifcDxfAlignmentPreview = existsSync(paths.ifcDxfAlignmentPreview) ? readJson(paths.ifcDxfAlignmentPreview) : null;
  const ifcLayerPlan = existsSync(paths.ifcLayerPlan) ? readJson(paths.ifcLayerPlan) : null;
  const candidateById = new Map((candidates?.candidates || []).map((candidate) => [candidate.id, candidate]));
  const selections = Array.isArray(selection?.selections) ? selection.selections : [];
  const contextInputs = selections
    .filter((item) => item.decision === 'accepted_as_context')
    .map((item) => contextInput(item, candidateById.get(item.candidate_id), { contextImport, sourceMapping, ifcGeometryPreview, ifcDxfAlignmentPreview }));
  const designSeedInputs = selections
    .filter((item) => item.decision === 'accepted_as_design_seed')
    .map((item) => designSeedInput(item, candidateById.get(item.candidate_id), selection));
  const blockedInputs = selections
    .filter((item) => ['needs_more_source_review', 'undecided', 'rejected'].includes(item.decision))
    .map((item) => blockedInput(item, candidateById.get(item.candidate_id), { sourceReview, ifcSemanticProof, ifcGeometryPreview, ifcDxfAlignmentPreview, ifcLayerPlan }));
  const summary = summarize({ selection, selections, contextInputs, designSeedInputs, blockedInputs, ifcDxfAlignmentPreview, ifcLayerPlan });
  const status = handoffStatus(summary, selection);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-design-context-handoff',
    project_id: manifest?.project_id || selection?.project_id || candidates?.project_id || basename(projectRoot),
    project_name: manifest?.name || null,
    status,
    rights_status: 'internal_only',
    source_stage: 'phase_0_context_handoff',
    note: 'This handoff tells Kosmo Design what may be seen as context and what remains blocked. It is not a design-generation approval.',
    policy: {
      handoff_does_not_approve_design_generation: true,
      accepted_context_is_reference_only: true,
      accepted_design_seed_requires_approved_for_design_generation: true,
      unresolved_or_rejected_inputs_are_blocked: true,
      public_or_external_use_allowed: false
    },
    source_files: sourceFiles(),
    summary,
    guardrails: guardrails(summary),
    context_inputs: contextInputs,
    design_seed_inputs: designSeedInputs,
    blocked_inputs: blockedInputs,
    evidence: evidenceSummary({ contextImport, sourceMap, sourceMapping, sourceReview, ifcSemanticProof, ifcGeometryPreview, ifcDxfAlignmentPreview, ifcLayerPlan }),
    next_actions: nextActions(summary)
  };
}

function contextInput(selection, candidate, evidence) {
  return {
    candidate_id: selection.candidate_id,
    label: selection.label,
    kind: selection.kind,
    source: selection.source,
    confidence: selection.confidence,
    selected_use: selection.selected_use,
    handoff_role: handoffRole(selection, candidate),
    downstream_permission: 'context_reference_only',
    design_generation_allowed: false,
    evidence_ref: selection.evidence_ref,
    source_artifacts: sourceArtifactsFor(selection, evidence),
    warnings: unique([...(candidate?.warnings || []), ...(selection.warnings || [])]),
    notes: selection.notes || []
  };
}

function designSeedInput(selection, candidate, contextSelection) {
  const approved = Boolean(contextSelection?.approved_for_design_generation);
  return {
    candidate_id: selection.candidate_id,
    label: selection.label,
    kind: selection.kind,
    source: selection.source,
    selected_use: selection.selected_use,
    downstream_permission: approved ? 'design_seed_allowed_after_human_approval' : 'blocked_until_final_design_generation_approval',
    design_generation_allowed: approved,
    evidence_ref: selection.evidence_ref,
    warnings: unique([...(candidate?.warnings || []), ...(selection.warnings || [])]),
    notes: selection.notes || []
  };
}

function blockedInput(selection, candidate, evidence) {
  return {
    candidate_id: selection.candidate_id,
    label: selection.label,
    kind: selection.kind,
    source: selection.source,
    decision: selection.decision,
    selected_use: selection.selected_use,
    blocked_reason: blockedReason(selection),
    downstream_permission: 'blocked',
    design_generation_allowed: false,
    evidence_ref: selection.evidence_ref,
    source_artifacts: sourceArtifactsFor(selection, evidence),
    warnings: unique([...(candidate?.warnings || []), ...(selection.warnings || [])]),
    notes: selection.notes || []
  };
}

function sourceArtifactsFor(selection, evidence) {
  const artifacts = [];
  if (selection.kind === 'project_origin' || selection.kind === 'site_perimeter') artifacts.push('design/context-import.generated.json');
  if (selection.kind === 'dxf_layer_role') {
    artifacts.push('design/context-source-map.generated.json', 'design/context-source-mapping.json');
    if (evidence.ifcDxfAlignmentPreview) artifacts.push('design/ifc-dxf-alignment-preview.generated.json');
  }
  if (selection.kind === 'ifc_bounds' || selection.kind === 'ifc_role') {
    artifacts.push('design/ifc-semantic-proof.generated.json', 'design/ifc-geometry-preview.generated.json');
    if (evidence.ifcDxfAlignmentPreview) artifacts.push('design/ifc-dxf-alignment-preview.generated.json');
    if (evidence.ifcLayerPlan) artifacts.push('design/ifc-layer-plan.generated.json');
  }
  return unique(artifacts);
}

function handoffRole(selection, candidate) {
  if (selection.kind === 'project_origin') return 'coordinate_reference';
  if (selection.kind === 'site_perimeter') return 'context_boundary_reference';
  if (selection.kind === 'dxf_layer_role') return 'existing_dxf_underlay_reference';
  if (selection.kind === 'ifc_bounds') return 'ifc_extent_reference';
  if (selection.kind === 'ifc_role' && selection.candidate_id?.includes('metadata')) return 'ifc_metadata_reference';
  if (selection.kind === 'ifc_role' && selection.candidate_id?.includes('hierarchy')) return 'ifc_project_hierarchy_reference';
  return candidate?.suggested_use || selection.selected_use || 'context_reference';
}

function blockedReason(selection) {
  if (selection.decision === 'needs_more_source_review') return 'source_review_or_semantic_import_required';
  if (selection.decision === 'undecided') return 'human_context_selection_required';
  if (selection.decision === 'rejected') return 'rejected_by_context_selection';
  return 'not_available_for_downstream_use';
}

function summarize({ selection, selections, contextInputs, designSeedInputs, blockedInputs, ifcDxfAlignmentPreview, ifcLayerPlan }) {
  const approved = Boolean(selection?.approved_for_design_generation);
  const unresolvedCount = selections.filter((item) => ['undecided', 'needs_more_source_review'].includes(item.decision)).length;
  const designSeedAllowedCount = designSeedInputs.filter((item) => item.design_generation_allowed).length;
  const alignmentReady = isIfcDxfAlignmentPreviewReady(ifcDxfAlignmentPreview);
  const layerPlanReady = isIfcLayerPlanReady(ifcLayerPlan);
  return {
    candidate_count: selections.length,
    context_input_count: contextInputs.length,
    design_seed_input_count: designSeedInputs.length,
    design_seed_allowed_count: designSeedAllowedCount,
    blocked_input_count: blockedInputs.length,
    unresolved_input_count: unresolvedCount,
    rejected_input_count: selections.filter((item) => item.decision === 'rejected').length,
    approved_for_design_generation: approved,
    context_reference_ready: contextInputs.length > 0 && unresolvedCount === 0,
    alignment_preview_ready: alignmentReady,
    alignment_hint: ifcDxfAlignmentPreview?.summary?.alignment_hint || null,
    ifc_layer_plan_ready: layerPlanReady,
    ifc_layer_group_count: numberOrDefault(ifcLayerPlan?.summary?.layer_group_count, 0),
    ifc_material_group_count: numberOrDefault(ifcLayerPlan?.summary?.material_group_count, 0),
    handoff_mode: approved && designSeedAllowedCount > 0 ? 'approved_design_seed_handoff' : 'context_reference_only',
    design_generation_allowed: approved && designSeedAllowedCount > 0,
    recommended_next_step: approved && designSeedAllowedCount > 0
      ? 'run_downstream_design_generation_with_guard'
      : 'use_context_as_reference_only_and_complete_open_source_review'
  };
}

function handoffStatus(summary, selection) {
  if (!selection) return 'missing_context_selection';
  if (summary.design_generation_allowed) return 'design_seed_handoff_ready';
  if (summary.context_input_count > 0) return 'context_reference_handoff_ready';
  return 'context_handoff_pending_review';
}

function evidenceSummary({ contextImport, sourceMap, sourceMapping, sourceReview, ifcSemanticProof, ifcGeometryPreview, ifcDxfAlignmentPreview, ifcLayerPlan }) {
  return {
    context_import: {
      exists: Boolean(contextImport),
      object_count: numberOrDefault(contextImport?.context?.object_count, 0),
      dxf_total_polylines: numberOrDefault(contextImport?.context?.dxf?.total_polylines, 0),
      ifc_entity_count: numberOrDefault(contextImport?.context?.ifc?.entity_count, 0)
    },
    source_map: {
      exists: Boolean(sourceMap),
      dxf_layer_count: numberOrDefault(sourceMap?.summary?.dxf_layer_count, 0),
      ifc_semantic_building_element_count: numberOrDefault(sourceMap?.summary?.ifc_semantic_building_element_count, 0)
    },
    source_mapping: {
      exists: Boolean(sourceMapping),
      accepted_as_context_count: numberOrDefault(sourceMapping?.summary?.accepted_as_context_count, 0),
      accepted_as_design_seed_count: numberOrDefault(sourceMapping?.summary?.accepted_as_design_seed_count, 0),
      needs_more_source_review_count: numberOrDefault(sourceMapping?.summary?.needs_more_source_review_count, 0),
      rejected_count: numberOrDefault(sourceMapping?.summary?.rejected_count, 0)
    },
    source_review: {
      exists: Boolean(sourceReview),
      open_human_review_count: numberOrDefault(sourceReview?.summary?.open_human_review_count, 0),
      design_seed_possible_after_review_count: numberOrDefault(sourceReview?.summary?.design_seed_possible_after_review_count, 0)
    },
    ifc_semantic_proof: {
      exists: Boolean(ifcSemanticProof),
      proxy_count: numberOrDefault(ifcSemanticProof?.summary?.ifcbuildingelementproxy_count, 0),
      contained_count: numberOrDefault(ifcSemanticProof?.summary?.elements_contained_in_spatial_structure, 0),
      property_set_count: numberOrDefault(ifcSemanticProof?.summary?.elements_with_property_sets, 0),
      integrity_score: numberOrDefault(ifcSemanticProof?.summary?.semantic_integrity_score, 0)
    },
    ifc_geometry_preview: {
      exists: Boolean(ifcGeometryPreview),
      ready: isIfcGeometryPreviewReady(ifcGeometryPreview),
      bbox_count: numberOrDefault(ifcGeometryPreview?.summary?.elements_with_geometry_bbox, 0),
      face_count: numberOrDefault(ifcGeometryPreview?.summary?.faces_resolved, 0)
    },
    ifc_dxf_alignment_preview: {
      exists: Boolean(ifcDxfAlignmentPreview),
      ready: isIfcDxfAlignmentPreviewReady(ifcDxfAlignmentPreview),
      dxf_polyline_count: numberOrDefault(ifcDxfAlignmentPreview?.summary?.dxf_accepted_polyline_count, 0),
      ifc_bbox_count: numberOrDefault(ifcDxfAlignmentPreview?.summary?.ifc_geometry_bbox_count, 0),
      center_offset_m_estimate: numberOrDefault(ifcDxfAlignmentPreview?.summary?.center_offset_m_estimate, 0),
      overlap_ratio_of_smaller_bbox: numberOrDefault(ifcDxfAlignmentPreview?.summary?.overlap_ratio_of_smaller_bbox, 0),
      alignment_hint: ifcDxfAlignmentPreview?.summary?.alignment_hint || null
    },
    ifc_layer_plan: {
      exists: Boolean(ifcLayerPlan),
      ready: isIfcLayerPlanReady(ifcLayerPlan),
      layer_group_count: numberOrDefault(ifcLayerPlan?.summary?.layer_group_count, 0),
      material_group_count: numberOrDefault(ifcLayerPlan?.summary?.material_group_count, 0),
      structure_element_count: numberOrDefault(ifcLayerPlan?.summary?.structure_element_count, 0),
      facade_element_count: numberOrDefault(ifcLayerPlan?.summary?.facade_element_count, 0)
    }
  };
}

function guardrails(summary) {
  const rules = [
    'Use context inputs only as reference, snapping aid, extent check or visual underlay.',
    'Do not convert dense DXF context polylines into editable design geometry automatically.',
    'Do not claim BIM semantics from IFC bounding boxes or STEP fallback previews.',
    'Do not instantiate Blender collections from generated layer plans until a human approves the layer mapping.',
    'Do not run design generation unless context-selection has accepted_as_design_seed and approved_for_design_generation=true.',
    'Keep all outputs internal until public_release/external_upload/client_delivery gates are explicitly approved.'
  ];
  if (summary.unresolved_input_count > 0) rules.push('Resolve needs_more_source_review or undecided inputs before promoting any design seed.');
  return rules;
}

function nextActions(summary) {
  if (!summary.context_input_count) return ['Review design/context-selection.json and accept safe context references first.'];
  if (!summary.ifc_layer_plan_ready) return ['Run npm run kosmo:ifc-layer-plan after IFC geometry preview is ready.'];
  if (!summary.alignment_preview_ready) return ['Run npm run kosmo:ifc-dxf-alignment-preview after IFC geometry preview and source mapping are ready.'];
  if (summary.unresolved_input_count > 0) {
    return [
      'Use this handoff as context-reference-only input for Kosmo Design.',
      'Complete the open IFC source review through Bonsai/IfcOpenShell-style semantic import before any design seed.',
      'Keep approved_for_design_generation=false until a human intentionally promotes a reviewed source.'
    ];
  }
  if (!summary.design_generation_allowed) {
    return [
      'Use this handoff as context-reference-only input for Kosmo Design.',
      'Promote a design seed only after explicit human review and final design-generation approval.'
    ];
  }
  return ['Run downstream design generation through kosmo:context-guard --require-approved-design-seed.'];
}

function renderMarkdown(handoff) {
  const lines = [
    '# Kosmo Design Context Handoff',
    '',
    `Project ID: \`${handoff.project_id}\``,
    `Generated: ${handoff.generated_at}`,
    `Status: \`${handoff.status}\``,
    `Mode: \`${handoff.summary.handoff_mode}\``,
    '',
    'This handoff is an explicit boundary between reviewed context and blocked design seeds.',
    '',
    '## Summary',
    '',
    `- context inputs: ${handoff.summary.context_input_count}`,
    `- design seed inputs: ${handoff.summary.design_seed_input_count}`,
    `- design seeds allowed: ${handoff.summary.design_seed_allowed_count}`,
    `- blocked inputs: ${handoff.summary.blocked_input_count}`,
    `- unresolved inputs: ${handoff.summary.unresolved_input_count}`,
    `- alignment preview ready: ${handoff.summary.alignment_preview_ready ? 'yes' : 'no'}`,
    `- alignment hint: \`${handoff.summary.alignment_hint || '-'}\``,
    `- IFC layer plan ready: ${handoff.summary.ifc_layer_plan_ready ? 'yes' : 'no'}`,
    `- IFC layer groups: ${handoff.summary.ifc_layer_group_count}`,
    `- IFC material groups: ${handoff.summary.ifc_material_group_count}`,
    `- approved for design generation: ${handoff.summary.approved_for_design_generation ? 'yes' : 'no'}`,
    `- design generation allowed: ${handoff.summary.design_generation_allowed ? 'yes' : 'no'}`,
    '',
    '## Context Inputs',
    '',
    '| Candidate | Role | Permission | Use |',
    '| --- | --- | --- | --- |'
  ];

  for (const input of handoff.context_inputs) {
    lines.push(`| ${escapePipe(input.label)} | ${escapePipe(input.handoff_role)} | ${escapePipe(input.downstream_permission)} | ${escapePipe(input.selected_use)} |`);
  }
  if (!handoff.context_inputs.length) lines.push('| none | - | - | - |');

  lines.push('', '## Blocked Inputs', '', '| Candidate | Decision | Reason |', '| --- | --- | --- |');
  for (const input of handoff.blocked_inputs) {
    lines.push(`| ${escapePipe(input.label)} | ${escapePipe(input.decision)} | ${escapePipe(input.blocked_reason)} |`);
  }
  if (!handoff.blocked_inputs.length) lines.push('| none | - | - |');

  lines.push('', '## Evidence', '');
  lines.push(`- context import objects: ${handoff.evidence.context_import.object_count}`);
  lines.push(`- DXF total polylines: ${handoff.evidence.context_import.dxf_total_polylines}`);
  lines.push(`- source mapping accepted context: ${handoff.evidence.source_mapping.accepted_as_context_count}`);
  lines.push(`- IFC semantic proxies: ${handoff.evidence.ifc_semantic_proof.proxy_count}`);
  lines.push(`- IFC geometry bboxes: ${handoff.evidence.ifc_geometry_preview.bbox_count}`);
  lines.push(`- IFC/DXF alignment overlap: ${handoff.evidence.ifc_dxf_alignment_preview.overlap_ratio_of_smaller_bbox}`);
  lines.push(`- IFC/DXF alignment center offset: ${handoff.evidence.ifc_dxf_alignment_preview.center_offset_m_estimate} m`);
  lines.push(`- IFC layer groups: ${handoff.evidence.ifc_layer_plan.layer_group_count}`);
  lines.push(`- IFC material groups: ${handoff.evidence.ifc_layer_plan.material_group_count}`);

  lines.push('', '## Guardrails', '');
  for (const rule of handoff.guardrails) lines.push(`- ${rule}`);

  lines.push('', '## Next Actions', '');
  for (const action of handoff.next_actions) lines.push(`- ${action}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = ensureItem(manifest.outputs, 'design/context-handoff.generated.json', {
      path: 'design/context-handoff.generated.json',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Kosmo Design context handoff: explicit context-only inputs and blocked design seeds.'
    });
    didChange = ensureItem(manifest.outputs, 'design/context-handoff.generated.md', {
      path: 'design/context-handoff.generated.md',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Human-readable Kosmo Design context handoff.'
    }) || didChange;
    if (didChange) {
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      changed.push(manifestPath);
    }
  }

  const exportManifestPath = join(projectRoot, 'publish/export-manifest.json');
  if (existsSync(exportManifestPath)) {
    const exportManifest = readJson(exportManifestPath);
    if (!Array.isArray(exportManifest.exports)) exportManifest.exports = [];
    let didChange = ensureItem(exportManifest.exports, 'design/context-handoff.generated.json', {
      path: 'design/context-handoff.generated.json',
      module: 'Kosmo Design',
      format: 'json',
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    });
    didChange = ensureItem(exportManifest.exports, 'design/context-handoff.generated.md', {
      path: 'design/context-handoff.generated.md',
      module: 'Kosmo Design',
      format: 'markdown',
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    }) || didChange;
    if (didChange) {
      await writeFile(exportManifestPath, `${JSON.stringify(exportManifest, null, 2)}\n`, 'utf8');
      changed.push(exportManifestPath);
    }
  }

  return changed;
}

function sourceFiles() {
  return {
    context_selection: sourceFileStatus(paths.selection),
    context_candidates: sourceFileStatus(paths.candidates),
    context_import: sourceFileStatus(paths.contextImport),
    source_map: sourceFileStatus(paths.sourceMap),
    source_mapping: sourceFileStatus(paths.sourceMapping),
    source_review: sourceFileStatus(paths.sourceReview),
    ifc_semantic_proof: sourceFileStatus(paths.ifcSemanticProof),
    ifc_geometry_preview: sourceFileStatus(paths.ifcGeometryPreview),
    ifc_dxf_alignment_preview: sourceFileStatus(paths.ifcDxfAlignmentPreview),
    ifc_layer_plan: sourceFileStatus(paths.ifcLayerPlan)
  };
}

function sourceFileStatus(pathname) {
  return {
    path: relative(projectRoot, pathname),
    name: basename(pathname),
    exists: existsSync(pathname),
    size_bytes: existsSync(pathname) ? statSync(pathname).size : 0
  };
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

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
}

function numberOrDefault(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
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
