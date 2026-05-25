#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const outputJsonPath = join(projectRoot, args.output || 'design/ifc-human-review-pack.generated.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/ifc-human-review-pack.generated.md');

const paths = {
  manifest: join(projectRoot, 'kosmo.project.json'),
  sourceReview: join(projectRoot, 'design/context-source-review.generated.json'),
  sourceMapping: join(projectRoot, 'design/context-source-mapping.json'),
  contextSelection: join(projectRoot, 'design/context-selection.json'),
  ifcSemanticProof: join(projectRoot, 'design/ifc-semantic-proof.generated.json'),
  ifcOpenShellReview: join(projectRoot, 'design/ifcopenshell-semantic-review.generated.json'),
  ifcGeometryPreview: join(projectRoot, 'design/ifc-geometry-preview.generated.json'),
  ifcDxfAlignmentPreview: join(projectRoot, 'design/ifc-dxf-alignment-preview.generated.json'),
  ifcLayerPlan: join(projectRoot, 'design/ifc-layer-plan.generated.json'),
  blenderContextImport: join(projectRoot, 'design/blender-context-import.generated.json'),
  blenderContextSmoke: join(projectRoot, 'design/blender-context-import.smoke.json'),
  blenderContextAudit: join(projectRoot, 'design/blender-context-import.audit.json')
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const pack = buildReviewPack();

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(pack), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo IFC human review pack generated');
  console.log(`Project: ${pack.project_id}`);
  console.log(`Status: ${pack.status}`);
  console.log(`Evidence ready: ${pack.summary.evidence_ready ? 'yes' : 'no'}`);
  console.log(`Human review required: ${pack.summary.human_review_required ? 'yes' : 'no'}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildReviewPack() {
  const manifest = readOptionalJson(paths.manifest);
  const sourceReview = readOptionalJson(paths.sourceReview);
  const sourceMapping = readOptionalJson(paths.sourceMapping);
  const contextSelection = readOptionalJson(paths.contextSelection);
  const semanticProof = readOptionalJson(paths.ifcSemanticProof);
  const ifcOpenShellReview = readOptionalJson(paths.ifcOpenShellReview);
  const geometryPreview = readOptionalJson(paths.ifcGeometryPreview);
  const alignmentPreview = readOptionalJson(paths.ifcDxfAlignmentPreview);
  const layerPlan = readOptionalJson(paths.ifcLayerPlan);
  const blenderContextImport = readOptionalJson(paths.blenderContextImport);
  const blenderContextSmoke = readOptionalJson(paths.blenderContextSmoke);
  const blenderContextAudit = readOptionalJson(paths.blenderContextAudit);
  const projectId = manifest?.project_id || sourceReview?.project_id || basename(projectRoot);
  const sourceReviewRows = sourceReview?.rows || [];
  const sourceMappingRows = sourceMapping?.rows || [];
  const ifcMappingRow = sourceMappingRows.find((row) => row.linked_context_candidate_id === 'ifc-role-3-semantic_building_elements')
    || sourceMappingRows.find((row) => row.source_kind === 'ifc_entity_type');
  const ifcRow = sourceReviewRows.find((row) => row.candidate_id === 'ifc-role-3-semantic_building_elements')
    || sourceReviewRows.find((row) => row.kind === 'ifc_role')
    || ifcMappingRow;
  const evidence = buildEvidence({
    ifcRow,
    ifcMappingRow,
    contextSelection,
    semanticProof,
    ifcOpenShellReview,
    geometryPreview,
    alignmentPreview,
    layerPlan,
    blenderContextImport,
    blenderContextSmoke,
    blenderContextAudit
  });
  const checklist = buildChecklist(evidence);
  const passedMachineChecks = evidence.machine_checks.filter((item) => item.status === 'passed').length;
  const failedMachineChecks = evidence.machine_checks.filter((item) => item.status === 'failed').length;
  const blockedMachineChecks = evidence.machine_checks.filter((item) => item.status === 'blocked').length;
  const humanReviewRequired = true;
  const designGenerationAllowed = Boolean(contextSelection?.approved_for_design_generation);
  const designSeedApproved = Boolean(semanticProof?.summary?.design_seed_approved || contextSelection?.approved_for_design_generation);
  const evidenceReady = failedMachineChecks === 0
    && blockedMachineChecks === 0
    && passedMachineChecks >= 6
    && Boolean(ifcRow);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-ifc-human-review-pack',
    project_id: projectId,
    project_name: manifest?.name || null,
    status: evidenceReady ? 'ifc_human_review_packet_ready' : 'ifc_human_review_packet_incomplete',
    rights_status: 'internal_only',
    candidate_id: ifcRow?.candidate_id || 'ifc-role-3-semantic_building_elements',
    note: 'Human review packet for semantic IFC design-seed assessment. This does not approve design generation.',
    policy: {
      packet_does_not_approve_design_generation: true,
      packet_does_not_modify_context_selection: true,
      bonsai_or_ifcopenshell_review_still_required: true,
      design_seed_approval_requires_human_decision: true
    },
    summary: {
      evidence_ready: evidenceReady,
      human_review_required: humanReviewRequired,
      design_generation_allowed: designGenerationAllowed,
      design_seed_approved: designSeedApproved,
      machine_check_count: evidence.machine_checks.length,
      machine_checks_passed: passedMachineChecks,
      machine_checks_failed: failedMachineChecks,
      machine_checks_blocked: blockedMachineChecks,
      human_check_count: checklist.length,
      open_human_check_count: checklist.filter((item) => item.status === 'pending_human_review').length,
      recommended_decision_now: 'keep_needs_more_source_review',
      recommended_next_step: evidenceReady
        ? 'open_ifc_in_semantic_viewer_and_complete_human_checklist'
        : 'complete_missing_machine_evidence_before_human_review'
    },
    source_files: sourceFiles(),
    source_review: {
      status: sourceReview?.status || null,
      source_candidate_decision: ifcRow?.current_decision || ifcMappingRow?.decision || ifcMappingRow?.suggested_decision || null,
      source_review_human_status: ifcRow?.human_review_status || ifcMappingRow?.source_review_status || null,
      mapping_decision: ifcMappingRow?.decision || null,
      semantic_ifc_reviewed: Boolean(sourceMapping?.review?.semantic_ifc_reviewed)
    },
    evidence,
    human_checklist: checklist,
    decision_options: [
      {
        decision: 'keep_needs_more_source_review',
        when: 'default until the IFC has been opened in a semantic IFC viewer and checked against the list below',
        effect: 'keeps context as reference only; no design seed, no model generation'
      },
      {
        decision: 'accepted_as_context',
        when: 'after semantic viewer confirms the IFC is reliable as reference but not yet suitable as editable seed',
        effect: 'allows stronger reference use but still no design generation'
      },
      {
        decision: 'accepted_as_design_seed',
        when: 'only after semantic classes, storeys, placement, units, origin and layer mapping are reviewed by a human',
        effect: 'can unlock design-seed workflow only if approved_for_design_generation is also true'
      },
      {
        decision: 'rejected',
        when: 'if semantic classes, origin, units or source authority are not trustworthy',
        effect: 'removes this IFC semantic candidate from downstream seed consideration'
      }
    ],
    next_actions: [
      'Open the IFC in Bonsai/IfcOpenShell or an equivalent semantic IFC viewer.',
      'Compare the semantic element tree with design/ifc-semantic-proof.generated.md.',
      'Compare geometry/origin with viz/previews/ifc-dxf-alignment-preview.svg and the audited Blender review file.',
      'Keep context-selection approved_for_design_generation=false until the checklist is completed by a human reviewer.'
    ]
  };
}

function buildEvidence({
  ifcRow,
  ifcMappingRow,
  contextSelection,
  semanticProof,
  ifcOpenShellReview,
  geometryPreview,
  alignmentPreview,
  layerPlan,
  blenderContextImport,
  blenderContextSmoke,
  blenderContextAudit
}) {
  const semanticSummary = semanticProof?.summary || {};
  const ifcOpenShellSummary = ifcOpenShellReview?.summary || {};
  const geometrySummary = geometryPreview?.summary || {};
  const alignmentSummary = alignmentPreview?.summary || {};
  const layerSummary = layerPlan?.summary || {};
  const importSummary = blenderContextImport?.summary || {};
  const smokeSummary = blenderContextSmoke || {};
  const auditSummary = blenderContextAudit?.summary || {};
  const sourceCandidate = ifcRow || ifcMappingRow;
  const machineChecks = [
    check('ifc_source_exists', sourceCandidate?.source_file?.exists === true || semanticSummary.ifc_exists === true, `IFC source exists: ${sourceCandidate?.source_file?.path || 'semantic proof source'}.`),
    check('source_mapping_not_seed', ifcMappingRow?.decision !== 'accepted_as_design_seed' && contextSelection?.approved_for_design_generation !== true, `IFC mapping decision is ${ifcMappingRow?.decision || 'unknown'}; suggested decision is ${ifcMappingRow?.suggested_decision || 'unknown'}.`),
    check('design_generation_blocked', contextSelection?.approved_for_design_generation !== true, 'Context selection does not approve design generation.'),
    check('ifcopenshell_review_ready', ifcOpenShellReview?.status === 'ifcopenshell_semantic_review_ready', `IfcOpenShell machine checks: ${ifcOpenShellSummary.machine_checks_passed || 0}/${ifcOpenShellSummary.machine_check_count || 0}.`),
    check('ifcopenshell_units_meter', ifcOpenShellSummary.unit_scale === 1, `IfcOpenShell unit scale: ${ifcOpenShellSummary.unit_scale ?? 'unknown'}.`),
    check('ifcopenshell_body_brep_ready', ifcOpenShellSummary.proxies_with_body_brep === ifcOpenShellSummary.ifcbuildingelementproxy_count, `${ifcOpenShellSummary.proxies_with_body_brep || 0} Body/Brep proxy elements.`),
    check('semantic_elements_present', semanticSummary.ifcbuildingelementproxy_count > 0, `${semanticSummary.ifcbuildingelementproxy_count || 0} IFCBUILDINGELEMENTPROXY elements found.`),
    check('semantic_integrity_full', semanticSummary.semantic_integrity_score === 1, `Semantic integrity score is ${semanticSummary.semantic_integrity_score ?? 'unknown'}.`),
    check('geometry_bboxes_resolved', geometrySummary.elements_with_geometry_bbox === semanticSummary.ifcbuildingelementproxy_count, `${geometrySummary.elements_with_geometry_bbox || 0} geometry bboxes resolved.`),
    checkStatus('alignment_preview_ready', alignmentStatus(alignmentPreview), `Alignment hint: ${alignmentSummary.alignment_hint || 'not generated yet'}.`),
    check('layer_plan_review_ready', layerPlan?.status === 'ifc_layer_plan_ready_for_human_review', `${layerSummary.layer_group_count || 0} layer groups proposed.`),
    check('blender_context_import_planned', (importSummary.blender_object_count || 0) > 0, `${importSummary.blender_object_count || 0} Blender context objects planned; status ${blenderContextImport?.status || 'missing'}.`),
    checkStatus('blender_context_smoke_locked', smokeSummary.object_count > 0 ? (smokeSummary.locked_object_count === smokeSummary.object_count ? 'passed' : 'failed') : 'blocked', `${smokeSummary.locked_object_count || 0}/${smokeSummary.object_count || 0} smoke objects locked.`),
    checkStatus('blender_context_audit_passed', blenderContextAudit ? (blenderContextAudit.status === 'passed' ? 'passed' : 'failed') : 'blocked', `Audit failures: ${(blenderContextAudit?.failures || []).length}.`),
    checkStatus('no_blender_design_mesh_faces', blenderContextAudit ? (auditSummary.mesh_polygon_count === 0 ? 'passed' : 'failed') : 'blocked', `${auditSummary.mesh_polygon_count ?? 'not audited'} mesh faces found in audited context import.`)
  ];

  return {
    machine_checks: machineChecks,
    semantic_summary: {
      status: semanticProof?.status || null,
      engine: semanticProof?.engine || null,
      ifcbuildingelementproxy_count: semanticSummary.ifcbuildingelementproxy_count || 0,
      elements_with_object_placement: semanticSummary.elements_with_object_placement || 0,
      elements_with_product_shape: semanticSummary.elements_with_product_shape || 0,
      elements_contained_in_spatial_structure: semanticSummary.elements_contained_in_spatial_structure || 0,
      elements_with_property_sets: semanticSummary.elements_with_property_sets || 0,
      semantic_integrity_score: semanticSummary.semantic_integrity_score || 0,
      project_structure: semanticProof?.project_structure || [],
      proxy_object_type_top: semanticProof?.distributions?.proxy_object_type_top || [],
      container_top: semanticProof?.distributions?.container_top || [],
      property_set_top: semanticProof?.distributions?.property_set_top || [],
      element_sample: (semanticProof?.element_sample || []).slice(0, 12)
    },
    ifcopenshell_summary: {
      status: ifcOpenShellReview?.status || null,
      version: ifcOpenShellSummary.ifcopenshell_version || null,
      schema: ifcOpenShellReview?.ifc_schema || null,
      unit_scale: ifcOpenShellSummary.unit_scale ?? null,
      machine_checks_passed: ifcOpenShellSummary.machine_checks_passed || 0,
      machine_check_count: ifcOpenShellSummary.machine_check_count || 0,
      ifcbuildingelementproxy_count: ifcOpenShellSummary.ifcbuildingelementproxy_count || 0,
      proxies_with_body_brep: ifcOpenShellSummary.proxies_with_body_brep || 0,
      proxies_contained_in_spatial_structure: ifcOpenShellSummary.proxies_contained_in_spatial_structure || 0,
      distributions: ifcOpenShellReview?.distributions || {},
      element_sample: (ifcOpenShellReview?.element_sample || []).slice(0, 12)
    },
    geometry_summary: {
      status: geometryPreview?.status || null,
      elements_with_geometry_bbox: geometrySummary.elements_with_geometry_bbox || 0,
      faces_resolved: geometrySummary.faces_resolved || 0,
      global_width_m_estimate: geometrySummary.global_width_m_estimate || 0,
      global_depth_m_estimate: geometrySummary.global_depth_m_estimate || 0,
      global_height_m_estimate: geometrySummary.global_height_m_estimate || 0,
      svg_preview: 'viz/previews/ifc-geometry-preview.svg'
    },
    alignment_summary: {
      status: alignmentPreview?.status || null,
      accepted_dxf_layer_count: alignmentSummary.accepted_dxf_layer_count || 0,
      dxf_accepted_polyline_count: alignmentSummary.dxf_accepted_polyline_count || 0,
      ifc_geometry_bbox_count: alignmentSummary.ifc_geometry_bbox_count || 0,
      center_offset_m_estimate: alignmentSummary.center_offset_m_estimate || 0,
      overlap_ratio_of_smaller_bbox: alignmentSummary.overlap_ratio_of_smaller_bbox || 0,
      alignment_hint: alignmentSummary.alignment_hint || null,
      svg_preview: 'viz/previews/ifc-dxf-alignment-preview.svg'
    },
    layer_summary: {
      status: layerPlan?.status || null,
      ifc_element_count: layerSummary.ifc_element_count || 0,
      layer_group_count: layerSummary.layer_group_count || 0,
      material_group_count: layerSummary.material_group_count || 0,
      approved_for_import: Boolean(layerPlan?.approved_for_import || layerPlan?.summary?.approved_for_import),
      layer_groups: (layerPlan?.layer_groups || []).map((group) => ({
        key: group.key,
        label: group.label,
        type: group.type,
        element_count: group.element_count,
        review_status: group.review_status
      }))
    },
    blender_review_summary: {
      import_status: blenderContextImport?.status || null,
      smoke_object_count: smokeSummary.object_count || 0,
      smoke_locked_object_count: smokeSummary.locked_object_count || 0,
      audit_status: blenderContextAudit?.status || null,
      audit_mesh_polygon_count: auditSummary.mesh_polygon_count || 0,
      audit_dxf_polyline_count: auditSummary.dxf_polyline_count || 0,
      audit_ifc_bbox_count: auditSummary.ifc_bbox_count || 0,
      output_blend: smokeSummary.output_blend || null
    }
  };
}

function buildChecklist(evidence) {
  const elementCount = evidence.semantic_summary.ifcbuildingelementproxy_count || 'die';
  const storeyLabel = evidence.semantic_summary.container_top?.[0]?.value || evidence.semantic_summary.container_top?.[0]?.name || 'den erwarteten Geschossen';
  return [
    item('semantic_viewer_import', 'Open `data/source-files/Bestand_Kontext.ifc` in Bonsai/IfcOpenShell or equivalent and confirm the semantic tree loads without import errors.'),
    item('element_class_review', `Confirm whether ${elementCount} IFCBUILDINGELEMENTPROXY objects are acceptable as semantic Bestand/context elements or need reclassification.`),
    item('storey_review', `Confirm all ${elementCount} elements belong to ${storeyLabel} and there are no missing/extra storeys.`),
    item('placement_units_review', 'Confirm object placements and project units match the expected meter-based project context.'),
    item('origin_alignment_review', 'Compare the semantic IFC import against DXF underlay, IFC bounds and LV95/project origin.'),
    item('geometry_outlier_review', 'Inspect large footprint/height outliers in the geometry preview before trusting the IFC as a design seed.'),
    item('property_set_review', 'Check `Pset_AtelierBlaupause_Object` fields such as OBJEKTART, DACH_MIN, DACH_MAX and gml_id for reliability.'),
    item('layer_mapping_review', 'Review the generated Mass/material_unknown layer plan and decide whether finer wall/slab/roof/support classes are possible.'),
    item('blender_reference_review', 'Open the audited Blender review blend and visually confirm it is only a locked reference underlay.'),
    item('final_seed_decision', 'Only after the checks above: decide keep as source review, accept as context, reject or approve as design seed.')
  ].map((entry) => ({
    ...entry,
    status: 'pending_human_review',
    evidence_hint: evidenceHint(entry.id, evidence)
  }));
}

function item(id, question) {
  return { id, question };
}

function evidenceHint(id, evidence) {
  const hints = {
    semantic_viewer_import: `IfcOpenShell machine import passed ${evidence.ifcopenshell_summary.machine_checks_passed}/${evidence.ifcopenshell_summary.machine_check_count}; visual Bonsai-style tree review remains human.`,
    element_class_review: `${evidence.ifcopenshell_summary.ifcbuildingelementproxy_count || evidence.semantic_summary.ifcbuildingelementproxy_count} IFCBUILDINGELEMENTPROXY elements found.`,
    storey_review: `Container distribution: ${formatTop(evidence.semantic_summary.container_top)}`,
    placement_units_review: `${evidence.semantic_summary.elements_with_object_placement} elements have object placement; geometry extents are ${evidence.geometry_summary.global_width_m_estimate} x ${evidence.geometry_summary.global_depth_m_estimate} x ${evidence.geometry_summary.global_height_m_estimate} m.`,
    origin_alignment_review: `Alignment hint: ${evidence.alignment_summary.alignment_hint}; center offset estimate ${evidence.alignment_summary.center_offset_m_estimate} m.`,
    geometry_outlier_review: `${evidence.geometry_summary.faces_resolved} faces resolved; inspect SVG preview and element samples.`,
    property_set_review: `Property set distribution: ${formatTop(evidence.semantic_summary.property_set_top)}`,
    layer_mapping_review: `${evidence.layer_summary.layer_group_count} generated layer groups; approved_for_import is ${evidence.layer_summary.approved_for_import ? 'true' : 'false'}.`,
    blender_reference_review: `Audit status ${evidence.blender_review_summary.audit_status}; mesh faces ${evidence.blender_review_summary.audit_mesh_polygon_count}.`,
    final_seed_decision: 'Recommended current decision remains keep_needs_more_source_review.'
  };
  return hints[id] || '';
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

function check(id, passed, detail) {
  return { id, status: passed ? 'passed' : 'failed', detail };
}

function checkStatus(id, status, detail) {
  return { id, status, detail };
}

function alignmentStatus(alignmentPreview) {
  if (!alignmentPreview) return 'blocked';
  if (alignmentPreview.status === 'ifc_dxf_alignment_preview_ready_for_human_review') return 'passed';
  if (alignmentPreview.status === 'missing_dxf_source') return 'blocked';
  return 'failed';
}

function formatTop(items) {
  if (!Array.isArray(items) || !items.length) return 'none';
  return items.slice(0, 3).map((item) => `${item.value || item.name || item.type}: ${item.count}`).join(', ');
}

function renderMarkdown(pack) {
  const lines = [
    '# IFC Human Review Pack',
    '',
    `Project ID: \`${pack.project_id}\``,
    `Generated: ${pack.generated_at}`,
    `Status: \`${pack.status}\``,
    `Candidate: \`${pack.candidate_id}\``,
    '',
    'This packet gathers machine evidence for human IFC review. It does not approve design generation.',
    '',
    '## Summary',
    '',
    `- evidence ready: ${pack.summary.evidence_ready ? 'yes' : 'no'}`,
    `- human review required: ${pack.summary.human_review_required ? 'yes' : 'no'}`,
    `- design generation allowed: ${pack.summary.design_generation_allowed ? 'yes' : 'no'}`,
    `- design seed approved: ${pack.summary.design_seed_approved ? 'yes' : 'no'}`,
    `- machine checks passed: ${pack.summary.machine_checks_passed}/${pack.summary.machine_check_count}`,
    `- open human checks: ${pack.summary.open_human_check_count}`,
    `- recommended decision now: \`${pack.summary.recommended_decision_now}\``,
    '',
    '## Machine Checks',
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |'
  ];
  for (const check of pack.evidence.machine_checks) {
    lines.push(`| ${escapePipe(check.id)} | ${escapePipe(check.status)} | ${escapePipe(check.detail)} |`);
  }

  lines.push('', '## Human Checklist', '', '| Check | Status | Question | Evidence hint |', '| --- | --- | --- | --- |');
  for (const check of pack.human_checklist) {
    lines.push(`| ${escapePipe(check.id)} | ${escapePipe(check.status)} | ${escapePipe(check.question)} | ${escapePipe(check.evidence_hint)} |`);
  }

  lines.push('', '## Evidence Snapshot', '');
  lines.push(`- IFCBUILDINGELEMENTPROXY: ${pack.evidence.semantic_summary.ifcbuildingelementproxy_count}`);
  lines.push(`- contained in spatial structure: ${pack.evidence.semantic_summary.elements_contained_in_spatial_structure}`);
  lines.push(`- property sets: ${pack.evidence.semantic_summary.elements_with_property_sets}`);
  lines.push(`- semantic integrity score: ${pack.evidence.semantic_summary.semantic_integrity_score}`);
  lines.push(`- IfcOpenShell review: ${pack.evidence.ifcopenshell_summary.status || '-'}`);
  lines.push(`- IfcOpenShell machine checks: ${pack.evidence.ifcopenshell_summary.machine_checks_passed}/${pack.evidence.ifcopenshell_summary.machine_check_count}`);
  lines.push(`- IfcOpenShell unit scale: ${pack.evidence.ifcopenshell_summary.unit_scale ?? '-'}`);
  lines.push(`- geometry bboxes: ${pack.evidence.geometry_summary.elements_with_geometry_bbox}`);
  lines.push(`- faces resolved: ${pack.evidence.geometry_summary.faces_resolved}`);
  lines.push(`- alignment hint: ${pack.evidence.alignment_summary.alignment_hint || '-'}`);
  lines.push(`- Blender audit: ${pack.evidence.blender_review_summary.audit_status || '-'}`);
  lines.push(`- Blender audit mesh faces: ${pack.evidence.blender_review_summary.audit_mesh_polygon_count}`);

  lines.push('', '## Decision Options', '');
  for (const option of pack.decision_options) {
    lines.push(`- \`${option.decision}\`: ${option.when}. Effect: ${option.effect}.`);
  }

  lines.push('', '## Next Actions', '');
  for (const action of pack.next_actions) lines.push(`- ${action}`);
  lines.push('');
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
    outputItem('design/ifc-human-review-pack.generated.json', 'other', 'design', 'Kosmo Design', 'json', 'Machine evidence and human checklist for IFC semantic review.'),
    outputItem('design/ifc-human-review-pack.generated.md', 'other', 'design', 'Kosmo Design', 'markdown', 'Human-readable IFC semantic review checklist.')
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
