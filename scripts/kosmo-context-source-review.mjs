#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const candidatesPath = join(projectRoot, args.candidates || 'design/context-candidates.generated.json');
const selectionPath = join(projectRoot, args.selection || 'design/context-selection.json');
const matrixPath = join(projectRoot, args.matrix || 'design/context-decision-matrix.generated.json');
const outputJsonPath = join(projectRoot, args.output || 'design/context-source-review.generated.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/context-source-review.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(candidatesPath)) throw new Error(`No context candidates found: ${relative(root, candidatesPath)}`);
  if (!existsSync(selectionPath)) throw new Error(`No context selection found: ${relative(root, selectionPath)}`);

  const candidates = readJson(candidatesPath);
  const selection = readJson(selectionPath);
  const matrix = existsSync(matrixPath) ? readJson(matrixPath) : null;
  const sourceRegistry = existsSync(join(projectRoot, 'data/sources.json')) ? readJson(join(projectRoot, 'data/sources.json')) : null;
  const review = buildSourceReview({ candidates, selection, matrix, sourceRegistry });

  await mkdir(resolve(outputJsonPath, '..'), { recursive: true });
  await writeFile(outputJsonPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(review), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo context source review generated');
  console.log(`Project: ${review.project_id}`);
  console.log(`Targets: ${review.summary.target_count}`);
  console.log(`Evidence confirmed: ${review.summary.automated_evidence_confirmed_count}`);
  console.log(`Open human reviews: ${review.summary.open_human_review_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildSourceReview({ candidates, selection, matrix, sourceRegistry }) {
  const candidateById = new Map((candidates.candidates || []).map((item) => [item.id, item]));
  const matrixById = new Map((matrix?.rows || []).map((item) => [item.candidate_id, item]));
  const targets = (selection.selections || []).filter((item) => item.decision === 'needs_more_source_review');
  const sourcePaths = resolveSourcePaths(sourceRegistry);
  const cachedAnalyses = {};

  const rows = targets.map((selected) => {
    const candidate = candidateById.get(selected.candidate_id) || {};
    const matrixRow = matrixById.get(selected.candidate_id) || {};
    if (candidate.kind === 'dxf_layer_role') {
      cachedAnalyses.dxf ||= analyzeDxf(sourcePaths.dxf);
      return reviewDxfCandidate({ selected, candidate, matrixRow, sourcePath: sourcePaths.dxf, dxf: cachedAnalyses.dxf });
    }
    if (candidate.kind === 'ifc_role' || candidate.kind === 'ifc_bounds') {
      cachedAnalyses.ifc ||= analyzeIfc(sourcePaths.ifc);
      return reviewIfcCandidate({ selected, candidate, matrixRow, sourcePath: sourcePaths.ifc, ifc: cachedAnalyses.ifc });
    }
    return reviewGenericCandidate({ selected, candidate, matrixRow });
  });

  const summary = summarize(rows);
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-context-source-review',
    project_id: candidates.project_id || selection.project_id || 'unknown-project',
    status: summary.open_human_review_count > 0 ? 'source_review_required' : 'no_source_review_targets',
    rights_status: 'internal_only',
    source_candidates_path: 'design/context-candidates.generated.json',
    source_selection_path: 'design/context-selection.json',
    source_matrix_path: existsSync(matrixPath) ? 'design/context-decision-matrix.generated.json' : null,
    note: 'Automated source presence/evidence review only. Human layer/IFC review remains required before any design seed approval.',
    policy: {
      source_review_does_not_approve_design_generation: true,
      source_review_does_not_override_context_selection: true,
      manual_layer_or_ifc_review_required_for_design_seed: true
    },
    summary,
    rows
  };
}

function reviewDxfCandidate({ selected, candidate, matrixRow, sourcePath, dxf }) {
  const evidenceLayers = candidate.evidence?.evidence_layers || [];
  const evidenceLayerStats = evidenceLayers.map((layer) => ({
    layer,
    polyline_count: dxf.layerPolylineCounts[layer] || 0
  }));
  const evidencePolylineCount = evidenceLayerStats.reduce((sum, item) => sum + item.polyline_count, 0);
  const evidenceCoverage = dxf.totalPolylines > 0 ? round(evidencePolylineCount / dxf.totalPolylines) : null;
  const evidenceConfirmed = Boolean(dxf.exists && evidenceLayers.length && evidenceLayerStats.every((item) => item.polyline_count > 0));

  return {
    candidate_id: selected.candidate_id,
    label: candidate.label || selected.candidate_id,
    kind: candidate.kind || 'unknown',
    current_decision: selected.decision,
    matrix_recommendation: matrixRow.recommended_decision || null,
    source_file: sourceFileStatus(sourcePath),
    automated_evidence_status: evidenceConfirmed ? 'evidence_confirmed' : 'evidence_missing_or_incomplete',
    human_review_status: 'pending',
    design_seed_allowed_after_source_review: false,
    extracted_source_facts: {
      dxf_total_polylines: dxf.totalPolylines,
      dxf_total_polyline_layers: Object.keys(dxf.layerPolylineCounts).length,
      evidence_layers: evidenceLayerStats,
      evidence_polyline_count: evidencePolylineCount,
      evidence_polyline_coverage: evidenceCoverage,
      top_polyline_layers: dxf.topPolylineLayers
    },
    open_checks: [
      'Open the full source DXF and verify that the evidence layer contains only existing/context buildings.',
      'Separate buildings from parcel, terrain, annotation, legend, frame and planning-constraint layers.',
      'Decide whether this candidate stays as context underlay or becomes cleaned context geometry.',
      'Do not use dense DXF segments directly as editable design objects.'
    ],
    suggested_next_decision: 'keep_needs_more_source_review_until_layer_mapping',
    warnings: candidate.warnings || []
  };
}

function reviewIfcCandidate({ selected, candidate, matrixRow, sourcePath, ifc }) {
  const semanticEntityCount = countSemanticIfcElements(ifc.entityCounts);
  const evidenceConfirmed = Boolean(ifc.exists && semanticEntityCount > 0);

  return {
    candidate_id: selected.candidate_id,
    label: candidate.label || selected.candidate_id,
    kind: candidate.kind || 'unknown',
    current_decision: selected.decision,
    matrix_recommendation: matrixRow.recommended_decision || null,
    source_file: sourceFileStatus(sourcePath),
    automated_evidence_status: evidenceConfirmed ? 'evidence_confirmed' : 'evidence_missing_or_incomplete',
    human_review_status: 'pending',
    design_seed_allowed_after_source_review: Boolean(matrixRow.design_seed_allowed_after_review),
    extracted_source_facts: {
      ifc_total_entities: ifc.totalEntities,
      semantic_building_element_count: semanticEntityCount,
      project_structure_count: countKeys(ifc.entityCounts, ['IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY']),
      product_shape_count: countKeys(ifc.entityCounts, ['IFCPRODUCTDEFINITIONSHAPE']),
      property_count: countKeys(ifc.entityCounts, ['IFCPROPERTYSET', 'IFCPROPERTYSINGLEVALUE', 'IFCRELDEFINESBYPROPERTIES']),
      top_entities: ifc.topEntities,
      semantic_entity_counts: semanticIfcTypes(ifc.entityCounts)
    },
    open_checks: [
      'Import the IFC through Bonsai/IfcOpenShell or an equivalent semantic IFC path.',
      'Verify element classes, storeys, object placement, units and source coordinate reference.',
      'Compare semantic elements with DXF underlay, IFC bounds and LV95/project origin.',
      'Only after semantic import review may selected elements become a design seed.'
    ],
    suggested_next_decision: 'keep_needs_more_source_review_until_semantic_ifc_import',
    warnings: candidate.warnings || []
  };
}

function reviewGenericCandidate({ selected, candidate, matrixRow }) {
  return {
    candidate_id: selected.candidate_id,
    label: candidate.label || selected.candidate_id,
    kind: candidate.kind || 'unknown',
    current_decision: selected.decision,
    matrix_recommendation: matrixRow.recommended_decision || null,
    source_file: null,
    automated_evidence_status: 'not_checked',
    human_review_status: 'pending',
    design_seed_allowed_after_source_review: false,
    extracted_source_facts: {},
    open_checks: ['Manually inspect candidate evidence and source authority before changing this decision.'],
    suggested_next_decision: 'keep_needs_more_source_review',
    warnings: candidate.warnings || []
  };
}

function resolveSourcePaths(sourceRegistry) {
  const sources = sourceRegistry?.sources || [];
  const byType = (type, fallback) => {
    const source = sources.find((item) => item.type === type && item.path);
    return join(projectRoot, source?.path || fallback);
  };
  return {
    dxf: byType('dxf', 'data/source-files/Plangrundlage.dxf'),
    ifc: byType('ifc', 'data/source-files/Bestand_Kontext.ifc')
  };
}

function analyzeDxf(pathname) {
  if (!existsSync(pathname)) return { exists: false, totalPolylines: 0, layerPolylineCounts: {}, topPolylineLayers: [] };
  const lines = readFileSync(pathname, 'utf8').split(/\r?\n/);
  const layerPolylineCounts = {};
  let currentType = null;
  let currentLayer = null;
  let totalPolylines = 0;

  const flushEntity = () => {
    if (!['LWPOLYLINE', 'POLYLINE'].includes(currentType)) return;
    const layer = currentLayer || '0';
    layerPolylineCounts[layer] = (layerPolylineCounts[layer] || 0) + 1;
    totalPolylines += 1;
  };

  for (let index = 0; index < lines.length - 1; index += 2) {
    const code = lines[index].trim();
    const value = lines[index + 1].trim();
    if (code === '0') {
      flushEntity();
      currentType = value;
      currentLayer = null;
    } else if (code === '8') {
      currentLayer = value;
    }
  }
  flushEntity();

  return {
    exists: true,
    totalPolylines,
    layerPolylineCounts,
    topPolylineLayers: topCounts(layerPolylineCounts, 10).map(([layer, count]) => ({ layer, count }))
  };
}

function analyzeIfc(pathname) {
  if (!existsSync(pathname)) return { exists: false, totalEntities: 0, entityCounts: {}, topEntities: [] };
  const content = readFileSync(pathname, 'utf8');
  const entityCounts = {};
  const pattern = /#\d+\s*=\s*(IFC[A-Z0-9_]+)/g;
  let match;
  let totalEntities = 0;
  while ((match = pattern.exec(content)) !== null) {
    const type = match[1];
    entityCounts[type] = (entityCounts[type] || 0) + 1;
    totalEntities += 1;
  }
  return {
    exists: true,
    totalEntities,
    entityCounts,
    topEntities: topCounts(entityCounts, 16).map(([type, count]) => ({ type, count }))
  };
}

function summarize(rows) {
  const count = (status) => rows.filter((item) => item.automated_evidence_status === status).length;
  return {
    target_count: rows.length,
    automated_evidence_confirmed_count: count('evidence_confirmed'),
    automated_evidence_missing_or_incomplete_count: count('evidence_missing_or_incomplete'),
    open_human_review_count: rows.filter((item) => item.human_review_status === 'pending').length,
    design_seed_possible_after_review_count: rows.filter((item) => item.design_seed_allowed_after_source_review).length,
    recommended_next_step: rows.length ? 'complete_manual_source_review_for_target_candidates' : 'no_source_review_targets'
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

function renderMarkdown(review) {
  const lines = [
    '# Context Source Review',
    '',
    `Project ID: \`${review.project_id}\``,
    `Generated: ${review.generated_at}`,
    `Status: \`${review.status}\``,
    '',
    'Automated source/evidence check only. Human layer/IFC review remains required before design seed approval.',
    '',
    '## Summary',
    '',
    `- targets: ${review.summary.target_count}`,
    `- evidence confirmed: ${review.summary.automated_evidence_confirmed_count}`,
    `- evidence missing/incomplete: ${review.summary.automated_evidence_missing_or_incomplete_count}`,
    `- open human reviews: ${review.summary.open_human_review_count}`,
    `- design seed possible after review: ${review.summary.design_seed_possible_after_review_count}`,
    '',
    '## Targets',
    '',
    '| Candidate | Current | Evidence | Human review | Design seed later | Source |',
    '| --- | --- | --- | --- | --- | --- |'
  ];

  for (const row of review.rows) {
    lines.push(`| ${escapePipe(row.candidate_id)} | ${escapePipe(row.current_decision)} | ${escapePipe(row.automated_evidence_status)} | ${escapePipe(row.human_review_status)} | ${row.design_seed_allowed_after_source_review ? 'yes' : 'no'} | ${escapePipe(row.source_file?.path || '-')} |`);
  }

  for (const row of review.rows) {
    lines.push('', `## ${row.candidate_id}`, '');
    lines.push(`Suggested next decision: \`${row.suggested_next_decision}\``);
    lines.push('', 'Open checks:');
    for (const check of row.open_checks) lines.push(`- ${check}`);
    if (row.warnings?.length) {
      lines.push('', 'Warnings:');
      for (const warning of row.warnings) lines.push(`- ${warning}`);
    }
    lines.push('', 'Extracted facts:');
    lines.push('```json');
    lines.push(JSON.stringify(row.extracted_source_facts, null, 2));
    lines.push('```');
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = ensureItem(manifest.outputs, 'design/context-source-review.generated.json', {
      path: 'design/context-source-review.generated.json',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Automated source evidence review for context candidates that need source review.'
    });
    didChange = ensureItem(manifest.outputs, 'design/context-source-review.generated.md', {
      path: 'design/context-source-review.generated.md',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Human-readable source evidence review for context candidates.'
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
    let didChange = ensureItem(exportManifest.exports, 'design/context-source-review.generated.json', {
      path: 'design/context-source-review.generated.json',
      module: 'Kosmo Design',
      format: 'json',
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    });
    didChange = ensureItem(exportManifest.exports, 'design/context-source-review.generated.md', {
      path: 'design/context-source-review.generated.md',
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

function semanticIfcTypes(entityCounts) {
  const result = {};
  for (const type of semanticIfcElementTypes()) {
    if (entityCounts[type]) result[type] = entityCounts[type];
  }
  return result;
}

function countSemanticIfcElements(entityCounts) {
  return countKeys(entityCounts, semanticIfcElementTypes());
}

function semanticIfcElementTypes() {
  return [
    'IFCBEAM',
    'IFCBUILDINGELEMENTPROXY',
    'IFCCOLUMN',
    'IFCCOVERING',
    'IFCCURTAINWALL',
    'IFCDOOR',
    'IFCFOOTING',
    'IFCMEMBER',
    'IFCPLATE',
    'IFCRAILING',
    'IFCRAMP',
    'IFCROOF',
    'IFCSLAB',
    'IFCSTAIR',
    'IFCWALL',
    'IFCWALLSTANDARDCASE',
    'IFCWINDOW'
  ];
}

function countKeys(map, keys) {
  return keys.reduce((sum, key) => sum + (map[key] || 0), 0);
}

function topCounts(counts, limit) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
}

function round(value) {
  return Math.round(value * 10000) / 10000;
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
