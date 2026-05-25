#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const outputJsonPath = join(projectRoot, args.output || 'design/ifc-human-review-guide.generated.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/ifc-human-review-guide.generated.md');

const paths = {
  manifest: join(projectRoot, 'kosmo.project.json'),
  sourceMapping: join(projectRoot, 'design/context-source-mapping.json'),
  contextSelection: join(projectRoot, 'design/context-selection.json'),
  ifcOpenShellReview: join(projectRoot, 'design/ifcopenshell-semantic-review.generated.json'),
  humanReviewPack: join(projectRoot, 'design/ifc-human-review-pack.generated.json'),
  humanReviewViewer: join(projectRoot, 'design/ifc-human-review-viewer.generated.json'),
  humanReviewDecision: join(projectRoot, 'design/ifc-human-review-decision.json'),
  humanReviewSync: join(projectRoot, 'design/ifc-human-review-sync.generated.json'),
  geometryPreview: join(projectRoot, 'design/ifc-geometry-preview.generated.json'),
  alignmentPreview: join(projectRoot, 'design/ifc-dxf-alignment-preview.generated.json'),
  layerPlan: join(projectRoot, 'design/ifc-layer-plan.generated.json'),
  blenderAudit: join(projectRoot, 'design/blender-context-import.audit.json'),
  geometrySvg: join(projectRoot, 'viz/previews/ifc-geometry-preview.svg'),
  alignmentSvg: join(projectRoot, 'viz/previews/ifc-dxf-alignment-preview.svg'),
  layerSvg: join(projectRoot, 'viz/previews/ifc-layer-plan.svg')
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const guide = buildGuide();

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(guide, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(guide), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo IFC human review guide generated');
  console.log(`Project: ${guide.project_id}`);
  console.log(`Status: ${guide.status}`);
  console.log(`Review checks: ${guide.summary.human_check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildGuide() {
  const manifest = readOptionalJson(paths.manifest);
  const sourceMapping = readOptionalJson(paths.sourceMapping);
  const contextSelection = readOptionalJson(paths.contextSelection);
  const ifcOpenShellReview = readOptionalJson(paths.ifcOpenShellReview);
  const humanReviewPack = readOptionalJson(paths.humanReviewPack);
  const humanReviewViewer = readOptionalJson(paths.humanReviewViewer);
  const humanReviewDecision = readOptionalJson(paths.humanReviewDecision);
  const humanReviewSync = readOptionalJson(paths.humanReviewSync);
  const geometryPreview = readOptionalJson(paths.geometryPreview);
  const alignmentPreview = readOptionalJson(paths.alignmentPreview);
  const layerPlan = readOptionalJson(paths.layerPlan);
  const blenderAudit = readOptionalJson(paths.blenderAudit);
  const projectId = manifest?.project_id || humanReviewPack?.project_id || basename(projectRoot);
  const ifcRow = findIfcMappingRow(sourceMapping);
  const ifcSourcePath = ifcRow?.source_file?.path || 'data/source-files/Bestand_Kontext.ifc';
  const humanChecks = Array.isArray(humanReviewPack?.human_checklist) ? humanReviewPack.human_checklist : [];
  const decisionCommands = buildDecisionCommands(projectRoot, args['reviewed-by'] || 'Reviewer');
  const status = humanReviewPack && humanReviewViewer
    ? 'ifc_human_review_guide_ready'
    : 'ifc_human_review_guide_incomplete';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-ifc-human-review-guide',
    project_id: projectId,
    project_name: manifest?.name || humanReviewPack?.project_name || null,
    status,
    rights_status: 'internal_only',
    note: 'Project-specific human review guide for semantic IFC review. It does not approve design generation.',
    policy: {
      guide_is_instruction_only: true,
      guide_does_not_modify_context_selection: true,
      final_decision_requires_human_review_decision_tool: true,
      design_seed_requires_separate_sync_and_context_guard: true
    },
    source_files: sourceFiles(),
    review_inputs: {
      ifc_file: ifcSourcePath,
      static_viewer_html: humanReviewViewer?.output_files?.html || 'design/ifc-human-review-viewer.generated.html',
      ifcopenshell_report: 'design/ifcopenshell-semantic-review.generated.md',
      human_review_pack: 'design/ifc-human-review-pack.generated.md',
      decision_record: 'design/ifc-human-review-decision.md',
      sync_report: 'design/ifc-human-review-sync.generated.md',
      previews: [
        previewInput('IFC geometry preview', paths.geometrySvg),
        previewInput('IFC/DXF alignment preview', paths.alignmentSvg),
        previewInput('IFC layer plan', paths.layerSvg)
      ],
      blender_review_blend: blenderAudit?.summary?.output_blend || null
    },
    summary: {
      evidence_ready: Boolean(humanReviewPack?.summary?.evidence_ready),
      viewer_ready: humanReviewViewer?.status === 'ifc_review_viewer_ready',
      final_decision_recorded: Boolean(humanReviewDecision?.summary?.final_decision_recorded),
      current_decision: humanReviewDecision?.decision || humanReviewPack?.summary?.recommended_decision_now || 'keep_needs_more_source_review',
      sync_status: humanReviewSync?.status || null,
      design_generation_allowed: Boolean(contextSelection?.approved_for_design_generation),
      human_check_count: humanChecks.length,
      open_human_check_count: humanChecks.filter((item) => item.status === 'pending_human_review').length,
      ifc_proxy_count: numberOrDefault(ifcOpenShellReview?.summary?.ifcbuildingelementproxy_count, 0),
      ifc_body_brep_count: numberOrDefault(ifcOpenShellReview?.summary?.proxies_with_body_brep, 0),
      ifcopenshell_checks: `${numberOrDefault(ifcOpenShellReview?.summary?.machine_checks_passed, 0)}/${numberOrDefault(ifcOpenShellReview?.summary?.machine_check_count, 0)}`,
      unit_scale: ifcOpenShellReview?.summary?.unit_scale ?? null,
      storey_count: numberOrDefault(ifcOpenShellReview?.summary?.storey_count, 0),
      geometry_extents_m: {
        width: numberOrDefault(geometryPreview?.summary?.global_width_m_estimate, 0),
        depth: numberOrDefault(geometryPreview?.summary?.global_depth_m_estimate, 0),
        height: numberOrDefault(geometryPreview?.summary?.global_height_m_estimate, 0)
      },
      alignment_hint: alignmentPreview?.summary?.alignment_hint || null,
      alignment_center_offset_m: numberOrDefault(alignmentPreview?.summary?.center_offset_m_estimate, 0),
      layer_group_count: numberOrDefault(layerPlan?.summary?.layer_group_count, 0),
      blender_audit_status: blenderAudit?.status || null
    },
    review_protocol: buildReviewProtocol({ humanChecks, ifcSourcePath }),
    decision_rubric: buildDecisionRubric(),
    decision_commands: decisionCommands,
    red_flags: buildRedFlags({ ifcOpenShellReview, humanReviewPack, humanReviewDecision, geometryPreview, alignmentPreview, layerPlan, blenderAudit }),
    next_actions: buildNextActions({ humanReviewDecision, humanReviewSync })
  };
}

function buildReviewProtocol({ humanChecks, ifcSourcePath }) {
  return [
    {
      id: 'prepare_session',
      title: '1. Review-Session vorbereiten',
      steps: [
        'Oeffne den statischen IFC Human Review Viewer.',
        `Oeffne dieselbe IFC-Datei im semantischen IFC-Viewer: ${ifcSourcePath}.`,
        'Lege Viewer, IFC-Tree, Geometriepreview, Alignment-Preview und Layerplan nebeneinander.'
      ]
    },
    {
      id: 'semantic_tree_review',
      title: '2. Semantischen IFC-Tree pruefen',
      steps: [
        'Pruefe, ob Project, Site, Building und Storey plausibel geladen werden.',
        'Pruefe, ob alle relevanten Bestandselemente unter dem erwarteten Storey liegen.',
        'Pruefe, ob IFCBUILDINGELEMENTPROXY als Kontextklasse akzeptabel ist oder eine Re-Klassifikation noetig waere.'
      ]
    },
    {
      id: 'units_origin_geometry',
      title: '3. Einheiten, Ursprung und Geometrie pruefen',
      steps: [
        'Vergleiche Meter-Units und Objekt-Placements mit dem Projektkontext.',
        'Vergleiche IFC-Bounds mit DXF-Unterlage und Projektursprung.',
        'Markiere auffaellige Ausreisser bei Hoehe, Footprint, Offsets oder fehlenden Elementen.'
      ]
    },
    {
      id: 'properties_layers',
      title: '4. Properties und Layerplan pruefen',
      steps: [
        'Pruefe Property Sets wie OBJEKTART, DACH_MIN, DACH_MAX und gml_id.',
        'Entscheide, ob die generierten Layergruppen nur als Kontext taugen oder fein genug fuer spaetere Modellarbeit sind.',
        'Pruefe den Blender-Audit: Review-Objekte muessen gesperrt und review-only bleiben.'
      ]
    },
    {
      id: 'human_checklist',
      title: '5. Human Checklist abarbeiten',
      steps: humanChecks.map((check) => `${check.id}: ${check.question}`)
    },
    {
      id: 'record_decision',
      title: '6. Finalen Entscheid recorden',
      steps: [
        'Wenn ein Check offen oder unsicher bleibt: keep_needs_more_source_review.',
        'Wenn die IFC als Referenz taugt, aber nicht als editierbarer Seed: accepted_as_context.',
        'Wenn Quelle, Semantik, Ursprung, Einheiten und Layer wirklich belastbar sind: accepted_as_design_seed nur mit separater Design-Freigabe.',
        'Wenn Quelle oder Semantik nicht vertrauenswuerdig sind: rejected.'
      ]
    }
  ];
}

function buildDecisionRubric() {
  return [
    {
      decision: 'keep_needs_more_source_review',
      use_when: 'mindestens ein menschlicher Check offen ist, Quelle/Origin/Layer unsicher sind oder die IFC nur maschinell, aber nicht visuell geprueft wurde',
      effect: 'bleibt Kontext-Review; kein Design-Seed; keine Design-Generierung'
    },
    {
      decision: 'accepted_as_context',
      use_when: 'Semantik und Geometrie als Referenz plausibel sind, aber Klassen/Layer noch zu grob fuer editierbare Modellgenerierung bleiben',
      effect: 'darf als staerkere Referenz dienen; bleibt ohne Design-Generierung'
    },
    {
      decision: 'accepted_as_design_seed',
      use_when: 'alle Human Checks bestaetigt sind und die IFC als semantisch, geometrisch und quellenbezogen belastbarer Seed gilt',
      effect: 'kann spaetere Design-Seed-Workflows freischalten, aber nur mit --approve-design-generation und Context Guard'
    },
    {
      decision: 'rejected',
      use_when: 'Quelle, Units, Origin, Storeys, Properties oder Klassen nicht vertrauenswuerdig sind',
      effect: 'blockiert den IFC-Kandidaten fuer Downstream-Seed-Nutzung'
    }
  ];
}

function buildDecisionCommands(projectRoot, reviewer) {
  const project = shellQuote(relative(root, projectRoot));
  const reviewedBy = shellQuote(reviewer);
  return [
    {
      decision: 'keep_needs_more_source_review',
      command: `npm run kosmo:ifc-human-review-decision -- --project ${project} --record-final --decision keep_needs_more_source_review --reviewed-by ${reviewedBy}`
    },
    {
      decision: 'accepted_as_context',
      command: `npm run kosmo:ifc-human-review-decision -- --project ${project} --record-final --decision accepted_as_context --reviewed-by ${reviewedBy} --confirm-checklist --i-confirm-human-ifc-review`
    },
    {
      decision: 'accepted_as_design_seed',
      command: `npm run kosmo:ifc-human-review-decision -- --project ${project} --record-final --decision accepted_as_design_seed --reviewed-by ${reviewedBy} --confirm-checklist --i-confirm-human-ifc-review --approve-design-generation`
    },
    {
      decision: 'rejected',
      command: `npm run kosmo:ifc-human-review-decision -- --project ${project} --record-final --decision rejected --reviewed-by ${reviewedBy}`
    },
    {
      decision: 'sync_after_final_decision',
      command: `npm run kosmo:ifc-human-review-sync -- --project ${project}`
    },
    {
      decision: 'apply_sync_after_owner_confirmation',
      command: `npm run kosmo:ifc-human-review-sync -- --project ${project} --apply --confirm-sync --i-understand-context-selection-mutation`
    }
  ];
}

function buildRedFlags({ ifcOpenShellReview, humanReviewPack, humanReviewDecision, geometryPreview, alignmentPreview, layerPlan, blenderAudit }) {
  const flags = [];
  if (humanReviewPack?.summary?.evidence_ready !== true) flags.push('Machine evidence is not ready.');
  if (humanReviewDecision?.summary?.final_decision_recorded !== true) flags.push('Final human IFC decision is not recorded.');
  if (ifcOpenShellReview?.summary?.machine_checks_passed !== ifcOpenShellReview?.summary?.machine_check_count) flags.push('IfcOpenShell machine checks are incomplete.');
  if (ifcOpenShellReview?.summary?.unit_scale !== 1) flags.push(`Unit scale is ${ifcOpenShellReview?.summary?.unit_scale ?? 'unknown'}, expected 1.`);
  if ((geometryPreview?.summary?.global_height_m_estimate || 0) > 80) flags.push('Geometry height extent is very large; inspect outliers before seed use.');
  if ((alignmentPreview?.summary?.center_offset_m_estimate || 0) > 20) flags.push('IFC/DXF center offset is high; visually review origin alignment.');
  if ((layerPlan?.summary?.layer_group_count || 0) < 2) flags.push('Layer plan has too few groups for confident semantic use.');
  if (blenderAudit && blenderAudit.status !== 'passed') flags.push('Blender context audit did not pass.');
  if (blenderAudit?.summary?.mesh_polygon_count > 0) flags.push('Blender audit found mesh faces in review-only context import.');
  return flags.length ? flags : ['No extra machine red flags beyond the open human checklist.'];
}

function buildNextActions({ humanReviewDecision, humanReviewSync }) {
  if (humanReviewDecision?.summary?.final_decision_recorded !== true) {
    return [
      'Open the static IFC review viewer.',
      'Open the IFC in Bonsai/IfcOpenShell or an equivalent semantic IFC viewer.',
      'Complete the human checklist.',
      'Record a final IFC human decision with npm run kosmo:ifc-human-review-decision.'
    ];
  }
  if (!humanReviewSync) return ['Run npm run kosmo:ifc-human-review-sync to dry-run the final decision sync.'];
  if (humanReviewSync.status === 'ifc_sync_dry_run_changes_ready') return ['Review the sync plan and apply it only after explicit owner confirmation.'];
  return ['Run package-check and context-guard before any downstream design workflow.'];
}

function findIfcMappingRow(sourceMapping) {
  const rows = Array.isArray(sourceMapping?.rows) ? sourceMapping.rows : [];
  return rows.find((row) => row.linked_context_candidate_id === 'ifc-role-3-semantic_building_elements')
    || rows.find((row) => row.source_kind === 'ifc_entity_type')
    || null;
}

function previewInput(label, pathname) {
  return {
    label,
    path: relative(projectRoot, pathname),
    exists: existsSync(pathname),
    size_bytes: existsSync(pathname) ? statSync(pathname).size : 0
  };
}

function renderMarkdown(guide) {
  const lines = [
    '# Kosmo IFC Human Review Anleitung',
    '',
    `Project ID: \`${guide.project_id}\``,
    `Generated: ${guide.generated_at}`,
    `Status: \`${guide.status}\``,
    '',
    'Diese Anleitung ist eine menschliche Pruefroutine fuer den IFC-Kandidaten. Sie ist kein Approval und aendert keine Projekt-Gates.',
    '',
    '## Review Inputs',
    '',
    `- IFC file: \`${guide.review_inputs.ifc_file}\``,
    `- Static viewer: \`${guide.review_inputs.static_viewer_html}\``,
    `- IfcOpenShell report: \`${guide.review_inputs.ifcopenshell_report}\``,
    `- Human review pack: \`${guide.review_inputs.human_review_pack}\``,
    `- Decision record: \`${guide.review_inputs.decision_record}\``,
    `- Sync report: \`${guide.review_inputs.sync_report}\``
  ];

  for (const preview of guide.review_inputs.previews) {
    lines.push(`- ${preview.label}: \`${preview.path}\` (${preview.exists ? 'exists' : 'missing'})`);
  }
  if (guide.review_inputs.blender_review_blend) lines.push(`- Blender review blend: \`${guide.review_inputs.blender_review_blend}\``);

  lines.push('', '## Machine Snapshot', '');
  lines.push(`- evidence ready: ${guide.summary.evidence_ready ? 'yes' : 'no'}`);
  lines.push(`- viewer ready: ${guide.summary.viewer_ready ? 'yes' : 'no'}`);
  lines.push(`- final decision recorded: ${guide.summary.final_decision_recorded ? 'yes' : 'no'}`);
  lines.push(`- current decision: \`${guide.summary.current_decision}\``);
  lines.push(`- sync status: \`${guide.summary.sync_status || '-'}\``);
  lines.push(`- design generation allowed: ${guide.summary.design_generation_allowed ? 'yes' : 'no'}`);
  lines.push(`- human checks open: ${guide.summary.open_human_check_count}/${guide.summary.human_check_count}`);
  lines.push(`- IfcOpenShell checks: ${guide.summary.ifcopenshell_checks}`);
  lines.push(`- IFC proxies / Body-Brep: ${guide.summary.ifc_proxy_count}/${guide.summary.ifc_body_brep_count}`);
  lines.push(`- unit scale: ${guide.summary.unit_scale ?? '-'}`);
  lines.push(`- storeys: ${guide.summary.storey_count}`);
  lines.push(`- geometry extents: ${guide.summary.geometry_extents_m.width} x ${guide.summary.geometry_extents_m.depth} x ${guide.summary.geometry_extents_m.height} m`);
  lines.push(`- alignment hint: ${guide.summary.alignment_hint || '-'}`);
  lines.push(`- alignment center offset: ${guide.summary.alignment_center_offset_m} m`);
  lines.push(`- layer groups: ${guide.summary.layer_group_count}`);
  lines.push(`- Blender audit: ${guide.summary.blender_audit_status || '-'}`);

  lines.push('', '## Ablauf', '');
  for (const section of guide.review_protocol) {
    lines.push(`### ${section.title}`, '');
    for (const step of section.steps) lines.push(`- ${step}`);
    lines.push('');
  }

  lines.push('## Entscheidungslogik', '');
  for (const item of guide.decision_rubric) {
    lines.push(`- \`${item.decision}\`: ${item.use_when}. Effekt: ${item.effect}.`);
  }

  lines.push('', '## Red Flags', '');
  for (const flag of guide.red_flags) lines.push(`- ${flag}`);

  lines.push('', '## Decision Commands', '');
  for (const item of guide.decision_commands) {
    lines.push(`### ${item.decision}`, '');
    lines.push('```bash');
    lines.push(item.command);
    lines.push('```');
    lines.push('');
  }

  lines.push('## Next Actions', '');
  for (const action of guide.next_actions) lines.push(`- ${action}`);
  return `${lines.join('\n')}\n`;
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
    outputItem('design/ifc-human-review-guide.generated.json', 'other', 'design', 'Kosmo Design', 'json', 'Project-specific human IFC review guide.'),
    outputItem('design/ifc-human-review-guide.generated.md', 'other', 'design', 'Kosmo Design', 'markdown', 'Human-readable IFC review Anleitung and decision commands.')
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

function numberOrDefault(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
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
