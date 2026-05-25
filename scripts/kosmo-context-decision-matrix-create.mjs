#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const candidatesPath = join(projectRoot, args.candidates || 'design/context-candidates.generated.json');
const selectionPath = join(projectRoot, args.selection || 'design/context-selection.json');
const matrixJsonPath = join(projectRoot, args.output || 'design/context-decision-matrix.generated.json');
const matrixMdPath = join(projectRoot, args.markdown || 'design/context-decision-matrix.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(candidatesPath)) {
    throw new Error(`No context candidates found: ${relative(root, candidatesPath)}`);
  }

  const candidates = readJson(candidatesPath);
  const selection = existsSync(selectionPath) ? readJson(selectionPath) : null;
  const matrix = buildMatrix(candidates, selection);

  await mkdir(resolve(matrixJsonPath, '..'), { recursive: true });
  await writeFile(matrixJsonPath, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
  await writeFile(matrixMdPath, renderMarkdown(matrix), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo context decision matrix created');
  console.log(`Project: ${matrix.project_id}`);
  console.log(`Candidates: ${matrix.summary.candidate_count}`);
  console.log(`Recommended context-only: ${matrix.summary.recommended_accepted_as_context_count}`);
  console.log(`Recommended design seed: ${matrix.summary.recommended_accepted_as_design_seed_count}`);
  console.log(`Recommended source review: ${matrix.summary.recommended_needs_more_source_review_count}`);
  console.log(`Recommended rejected: ${matrix.summary.recommended_rejected_count}`);
  console.log(`Wrote: ${relative(root, matrixJsonPath)}`);
  console.log(`Wrote: ${relative(root, matrixMdPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildMatrix(candidatesPayload, selectionPayload) {
  const candidateList = Array.isArray(candidatesPayload.candidates) ? candidatesPayload.candidates : [];
  const selectionById = new Map((selectionPayload?.selections || []).map((item) => [item.candidate_id, item]));
  const rows = candidateList.map((candidate) => {
    const selection = selectionById.get(candidate.id) || {};
    const recommendation = recommend(candidate);
    return {
      candidate_id: candidate.id,
      label: candidate.label || candidate.id,
      kind: candidate.kind || 'unknown',
      source: candidate.source || 'unknown',
      confidence: candidate.confidence || 'unknown',
      current_decision: selection.decision || 'undecided',
      recommended_decision: recommendation.decision,
      recommended_use: candidate.suggested_use || recommendation.use,
      design_seed_allowed_after_review: recommendation.designSeedAllowed,
      allowed_decisions: recommendation.allowedDecisions,
      priority: recommendation.priority,
      rationale: recommendation.rationale,
      required_checks: recommendation.requiredChecks,
      warnings: Array.isArray(candidate.warnings) ? candidate.warnings : [],
      evidence_ref: `design/context-candidates.generated.json#${candidate.id}`,
      selection_ref: `design/context-selection.json#${candidate.id}`
    };
  });

  const summary = summarize(rows);
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-context-decision-matrix-create',
    project_id: candidatesPayload.project_id || selectionPayload?.project_id || 'unknown-project',
    status: 'generated_needs_review',
    rights_status: 'internal_only',
    source_candidates_path: 'design/context-candidates.generated.json',
    source_selection_path: existsSync(selectionPath) ? 'design/context-selection.json' : null,
    note: 'Recommendation matrix only. It does not approve design generation and does not overwrite context-selection decisions.',
    policy: {
      matrix_is_advisory: true,
      context_selection_is_source_of_truth_for_human_decisions: true,
      accepted_as_design_seed_requires_human_review: true,
      approved_for_design_generation_is_never_set_by_matrix: true
    },
    summary,
    rows
  };
}

function recommend(candidate) {
  const id = String(candidate.id || '');
  const kind = String(candidate.kind || '');
  const source = String(candidate.source || '');
  const confidence = String(candidate.confidence || '');
  const haystack = [id, kind, source, candidate.label, candidate.suggested_use, ...(candidate.warnings || [])]
    .join(' ')
    .toLowerCase();
  const isFallback = haystack.includes('fallback') || confidence === 'low';

  if (id === 'context-origin' || kind === 'project_origin') {
    if (isFallback) {
      return rule('needs_more_source_review', false, 'high', [
        'accepted_as_context',
        'needs_more_source_review',
        'rejected'
      ], 'Fallback or low-confidence origin should be checked against reviewed project coordinates before use.', [
        'Verify LV95/WGS84/project origin against source files.',
        'Confirm unit convention and north rotation.'
      ]);
    }
    return rule('accepted_as_context', false, 'high', ['accepted_as_context', 'needs_more_source_review', 'rejected'], 'Reviewed origin can guide coordinates but is not itself a design seed.', [
      'Confirm coordinate reference and unit convention.',
      'Record source authority in review notes.'
    ]);
  }

  if (id === 'context-perimeter' || kind === 'site_perimeter') {
    if (isFallback) {
      return rule('needs_more_source_review', false, 'high', [
        'accepted_as_context',
        'needs_more_source_review',
        'rejected'
      ], 'Fallback perimeter is only a frame and must not become a parcel or design boundary.', [
        'Compare with parcel/site boundary source.',
        'Mark whether this is frame, parcel, plot, competition area or study area.'
      ]);
    }
    return rule('accepted_as_context', false, 'high', ['accepted_as_context', 'needs_more_source_review', 'rejected'], 'Perimeter can be kept as context frame, not as verified parcel or building envelope.', [
      'Confirm it is not mistaken for a legal parcel boundary.',
      'Review scale and coordinate origin.'
    ]);
  }

  if (kind === 'dxf_layer_role') {
    if (haystack.includes('unclassified') || haystack.includes('legende') || haystack.includes('rahmen') || haystack.includes('frame')) {
      return rule('rejected', false, 'low', ['rejected', 'needs_more_source_review', 'accepted_as_context'], 'Unclassified legend/frame layers should not become design input.', [
        'Check whether the layer contains only legends, frames or annotation.',
        'Keep only if it is useful as a context underlay.'
      ]);
    }
    if (haystack.includes('existing_building')) {
      return rule('needs_more_source_review', false, 'high', ['accepted_as_context', 'needs_more_source_review', 'rejected'], 'DXF existing-building layers are useful context, but dense polylines need layer/source review before extraction.', [
        'Open source DXF and verify layer semantics.',
        'Separate buildings from parcel, terrain, annotation and frame layers.',
        'Decide whether this stays underlay or becomes cleaned context geometry.'
      ]);
    }
    return rule('needs_more_source_review', false, 'medium', ['accepted_as_context', 'needs_more_source_review', 'rejected'], 'DXF layer role is not specific enough for automatic use.', [
      'Map source layer to a Kosmo context role.',
      'Check line type, units and coordinate reference.'
    ]);
  }

  if (kind === 'ifc_bounds') {
    return rule('accepted_as_context', false, 'high', ['accepted_as_context', 'needs_more_source_review', 'rejected'], 'IFC bounds can help check extents but are not editable BIM elements.', [
      'Compare IFC bounds with DXF and origin.',
      'Use semantic IFC import before extracting elements.'
    ]);
  }

  if (kind === 'ifc_role') {
    if (haystack.includes('semantic_building_elements')) {
      return rule('needs_more_source_review', true, 'high', [
        'needs_more_source_review',
        'accepted_as_context',
        'accepted_as_design_seed',
        'rejected'
      ], 'Semantic IFC elements may become design seed only after a real IFC import and element review.', [
        'Import through Bonsai/IfcOpenShell or equivalent semantic IFC path.',
        'Verify element classes, storeys, placement and geometry.',
        'Keep approval separate from bounds/statistics.'
      ]);
    }
    if (haystack.includes('source_metadata') || haystack.includes('site_project_hierarchy') || haystack.includes('context_mesh_bounds')) {
      return rule('accepted_as_context', false, 'medium', ['accepted_as_context', 'needs_more_source_review', 'rejected'], 'IFC metadata, hierarchy and mesh bounds are context references, not design seeds.', [
        'Use as source metadata/context reference.',
        'Do not turn statistics into BIM claims.'
      ]);
    }
    return rule('needs_more_source_review', true, 'medium', ['accepted_as_context', 'needs_more_source_review', 'accepted_as_design_seed', 'rejected'], 'IFC role needs semantic review before it can influence design.', [
      'Review IFC entities through a semantic import pipeline.',
      'Confirm whether the role represents context, existing building or proposal geometry.'
    ]);
  }

  return rule('needs_more_source_review', false, 'medium', ['accepted_as_context', 'needs_more_source_review', 'rejected'], 'Unknown context candidate kind needs human classification.', [
    'Classify candidate kind and source authority.',
    'Keep out of design generation until reviewed.'
  ]);
}

function rule(decision, designSeedAllowed, priority, allowedDecisions, rationale, requiredChecks) {
  return {
    decision,
    designSeedAllowed,
    priority,
    allowedDecisions,
    rationale,
    requiredChecks,
    use: decision === 'accepted_as_context' ? 'context_reference' : null
  };
}

function summarize(rows) {
  const count = (decision) => rows.filter((item) => item.recommended_decision === decision).length;
  const currentCount = (decision) => rows.filter((item) => item.current_decision === decision).length;
  return {
    candidate_count: rows.length,
    recommended_accepted_as_context_count: count('accepted_as_context'),
    recommended_accepted_as_design_seed_count: count('accepted_as_design_seed'),
    recommended_needs_more_source_review_count: count('needs_more_source_review'),
    recommended_rejected_count: count('rejected'),
    current_accepted_as_context_count: currentCount('accepted_as_context'),
    current_accepted_as_design_seed_count: currentCount('accepted_as_design_seed'),
    current_needs_more_source_review_count: currentCount('needs_more_source_review'),
    current_rejected_count: currentCount('rejected'),
    current_undecided_count: currentCount('undecided'),
    recommended_next_step: rows.length ? 'review_context_selection_against_matrix' : 'generate_context_candidates'
  };
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = ensureItem(manifest.outputs, 'design/context-decision-matrix.generated.json', {
      path: 'design/context-decision-matrix.generated.json',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Generated recommendation matrix for reviewing context candidates.'
    });
    didChange = ensureItem(manifest.outputs, 'design/context-decision-matrix.generated.md', {
      path: 'design/context-decision-matrix.generated.md',
      type: 'other',
      module: 'design',
      rights_status: 'generated_needs_review',
      description: 'Human-readable recommendation matrix for reviewing context candidates.'
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
    let didChange = ensureItem(exportManifest.exports, 'design/context-decision-matrix.generated.json', {
      path: 'design/context-decision-matrix.generated.json',
      module: 'Kosmo Design',
      format: 'json',
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    });
    didChange = ensureItem(exportManifest.exports, 'design/context-decision-matrix.generated.md', {
      path: 'design/context-decision-matrix.generated.md',
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

function renderMarkdown(matrix) {
  const lines = [
    `# Context Decision Matrix`,
    '',
    `Project ID: \`${matrix.project_id}\``,
    `Generated: ${matrix.generated_at}`,
    '',
    'This file is advisory. The human decision source of truth remains `design/context-selection.json`.',
    '',
    '## Summary',
    '',
    `- candidates: ${matrix.summary.candidate_count}`,
    `- recommended context-only: ${matrix.summary.recommended_accepted_as_context_count}`,
    `- recommended design seed: ${matrix.summary.recommended_accepted_as_design_seed_count}`,
    `- recommended source review: ${matrix.summary.recommended_needs_more_source_review_count}`,
    `- recommended rejected: ${matrix.summary.recommended_rejected_count}`,
    `- current undecided: ${matrix.summary.current_undecided_count}`,
    '',
    '## Matrix',
    '',
    '| Candidate | Kind | Confidence | Current | Recommendation | Design seed later | Priority | Required checks |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |'
  ];

  for (const row of matrix.rows) {
    lines.push(
      `| ${escapePipe(row.candidate_id)} | ${escapePipe(row.kind)} | ${escapePipe(row.confidence)} | ${escapePipe(row.current_decision)} | ${escapePipe(row.recommended_decision)} | ${row.design_seed_allowed_after_review ? 'yes' : 'no'} | ${escapePipe(row.priority)} | ${escapePipe(row.required_checks.join('; '))} |`
    );
  }

  lines.push('', '## Notes', '');
  for (const row of matrix.rows) {
    lines.push(`- \`${row.candidate_id}\`: ${row.rationale}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
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
