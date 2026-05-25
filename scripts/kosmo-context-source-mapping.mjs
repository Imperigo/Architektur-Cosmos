#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const sourceMapPath = join(projectRoot, args['source-map'] || 'design/context-source-map.generated.json');
const sourceReviewPath = join(projectRoot, args['source-review'] || 'design/context-source-review.generated.json');
const selectionPath = join(projectRoot, args.selection || 'design/context-selection.json');
const outputJsonPath = join(projectRoot, args.output || 'design/context-source-mapping.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/context-source-mapping.md');

const decisions = new Set(['pending_review', 'accepted_as_context', 'accepted_as_design_seed', 'needs_more_source_review', 'rejected']);
const decisionUpdates = parseDecisionUpdates(asArray(args.decision));
const noteUpdates = parseNoteUpdates(asArray(args.note));

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(sourceMapPath)) throw new Error(`No context source map found: ${relative(root, sourceMapPath)}`);

  const sourceMap = readJson(sourceMapPath);
  const sourceReview = existsSync(sourceReviewPath) ? readJson(sourceReviewPath) : null;
  const selection = existsSync(selectionPath) ? readJson(selectionPath) : null;
  const existing = existsSync(outputJsonPath) ? readJson(outputJsonPath) : null;
  const mapping = buildMapping({ sourceMap, sourceReview, selection, existing });

  await mkdir(dirname(outputJsonPath), { recursive: true });
  await mkdir(dirname(outputMdPath), { recursive: true });
  await writeFile(outputJsonPath, `${JSON.stringify(mapping, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(mapping), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo context source mapping generated');
  console.log(`Project: ${mapping.project_id}`);
  console.log(`Rows: ${mapping.summary.mapping_row_count}`);
  console.log(`Pending review: ${mapping.summary.pending_review_count}`);
  console.log(`Accepted as design seed: ${mapping.summary.accepted_as_design_seed_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildMapping({ sourceMap, sourceReview, selection, existing }) {
  const existingById = new Map((existing?.rows || []).map((row) => [row.mapping_id, row]));
  const sourceReviewByCandidate = new Map((sourceReview?.rows || []).map((row) => [row.candidate_id, row]));
  const selectionByCandidate = new Map((selection?.selections || []).map((row) => [row.candidate_id, row]));
  const reviewAt = new Date().toISOString();

  const rows = sourceRows(sourceMap).map((sourceRow) => {
    const linkedCandidateId = linkedCandidateForSourceRow(sourceRow);
    const sourceReviewRow = linkedCandidateId ? sourceReviewByCandidate.get(linkedCandidateId) || null : null;
    const selectionRow = linkedCandidateId ? selectionByCandidate.get(linkedCandidateId) || null : null;
    const previous = existingById.get(sourceRow.id) || {};
    const update = decisionUpdates.get(sourceRow.id) || null;
    const addedNote = noteUpdates.get(sourceRow.id);
    const decision = update || normalizeDecision(previous.decision);

    validateDecisionUpdate(sourceRow, update);

    const notes = Array.isArray(previous.notes) ? [...previous.notes] : [];
    if (addedNote && !notes.includes(addedNote)) notes.push(addedNote);
    const wasReviewed = Boolean(update || addedNote);
    const suggested = suggestedDecision(sourceRow, selectionRow);

    return {
      mapping_id: sourceRow.id,
      source_kind: sourceRow.source_kind,
      source_name: sourceRow.name,
      source_file: sourceRow.source_file || null,
      source_map_status: sourceRow.mapping_status,
      proposed_role: sourceRow.proposed_role,
      linked_context_candidate_id: linkedCandidateId,
      current_context_selection_decision: selectionRow?.decision || null,
      source_review_status: sourceReviewRow?.human_review_status || null,
      automated_evidence_status: sourceReviewRow?.automated_evidence_status || null,
      design_seed_possible_after_review: Boolean(sourceRow.design_seed_candidate_after_review || sourceReviewRow?.design_seed_allowed_after_source_review),
      suggested_decision: suggested.decision,
      suggested_use: suggested.use,
      decision,
      allowed_decisions: allowedDecisions(sourceRow),
      review_required: decision === 'pending_review' || decision === 'needs_more_source_review',
      approved_by: wasReviewed && decision !== 'pending_review' ? args['reviewed-by'] || previous.approved_by || 'local-review' : previous.approved_by || null,
      approved_at: wasReviewed && decision !== 'pending_review' ? reviewAt : previous.approved_at || null,
      notes,
      source_facts: sourceFacts(sourceRow, sourceReviewRow),
      required_review: sourceRow.required_review || sourceReviewRow?.suggested_next_decision || null,
      warnings: sourceWarnings(sourceRow, sourceReviewRow),
      context_selection_command: contextSelectionCommand(linkedCandidateId, decision)
    };
  });

  validateUpdateTargets(new Set(rows.map((row) => row.mapping_id)));
  const summary = summarize(rows);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-context-source-mapping',
    project_id: sourceMap.project_id || sourceReview?.project_id || selection?.project_id || existing?.project_id || 'unknown-project',
    status: summary.pending_review_count > 0 ? 'source_mapping_review_required' : 'source_mapping_reviewed',
    rights_status: 'internal_only',
    source_map_path: 'design/context-source-map.generated.json',
    source_review_path: existsSync(sourceReviewPath) ? 'design/context-source-review.generated.json' : null,
    source_selection_path: existsSync(selectionPath) ? 'design/context-selection.json' : null,
    note: 'Human source mapping gate. This file records reviewed DXF layer and semantic IFC mapping decisions but does not update context-selection automatically.',
    policy: {
      source_mapping_does_not_approve_design_generation: true,
      dense_dxf_layers_cannot_be_accepted_as_design_seed: true,
      ifc_design_seed_requires_semantic_import_review_flag: true,
      context_selection_remains_final_gate: true
    },
    review: {
      reviewed_by: args['reviewed-by'] || existing?.review?.reviewed_by || null,
      reviewed_at: args['reviewed-by'] || decisionUpdates.size || noteUpdates.size ? reviewAt : existing?.review?.reviewed_at || null,
      semantic_ifc_reviewed: Boolean(args['semantic-ifc-reviewed'] || existing?.review?.semantic_ifc_reviewed),
      notes: Array.isArray(existing?.review?.notes) ? existing.review.notes : []
    },
    summary,
    rows
  };
}

function sourceRows(sourceMap) {
  const dxfRows = Array.isArray(sourceMap.dxf?.top_layers) ? sourceMap.dxf.top_layers : [];
  const semanticIfcRows = Array.isArray(sourceMap.ifc?.semantic_entity_types) ? sourceMap.ifc.semantic_entity_types : [];
  return [...dxfRows, ...semanticIfcRows];
}

function linkedCandidateForSourceRow(row) {
  if (row.source_kind === 'dxf_layer') {
    if (row.proposed_role === 'existing_building_context') return 'dxf-role-1-existing_building';
    if (['drawing_legend_or_annotation', 'drawing_frame'].includes(row.proposed_role)) return 'dxf-role-2-unclassified_layer';
    return null;
  }
  if (row.source_kind === 'ifc_entity_type' && row.proposed_role === 'semantic_building_element') {
    return 'ifc-role-3-semantic_building_elements';
  }
  return null;
}

function suggestedDecision(row, selectionRow) {
  if (selectionRow?.decision === 'rejected') return { decision: 'rejected', use: selectionRow.selected_use || 'rejected_context_candidate' };
  if (row.source_kind === 'dxf_layer') {
    if (row.proposed_role === 'existing_building_context') return { decision: 'accepted_as_context', use: 'cleaned_existing_context_reference' };
    if (row.polyline_count === 0) return { decision: 'rejected', use: 'technical_support_layer' };
    if (row.mapping_status === 'reject_for_design_mapping') return { decision: 'rejected', use: 'annotation_or_sheet_reference_only' };
    return { decision: 'needs_more_source_review', use: 'layer_review_reference' };
  }
  if (row.source_kind === 'ifc_entity_type' && row.design_seed_candidate_after_review) {
    return { decision: 'needs_more_source_review', use: 'semantic_ifc_import_before_design_seed' };
  }
  return { decision: 'accepted_as_context', use: 'source_context_reference' };
}

function allowedDecisions(row) {
  if (row.design_seed_candidate_after_review) {
    return ['accepted_as_context', 'accepted_as_design_seed', 'needs_more_source_review', 'rejected'];
  }
  return ['accepted_as_context', 'needs_more_source_review', 'rejected'];
}

function validateDecisionUpdate(row, update) {
  if (!update) return;
  if (update === 'accepted_as_design_seed' && !row.design_seed_candidate_after_review) {
    throw new Error(`Cannot accept ${row.id} as design seed. Only semantic IFC rows marked design_seed_candidate_after_review can become design seeds.`);
  }
  if (update === 'accepted_as_design_seed' && !args['semantic-ifc-reviewed']) {
    throw new Error(`Cannot accept ${row.id} as design seed without --semantic-ifc-reviewed.`);
  }
  if (!allowedDecisions(row).includes(update) && update !== 'pending_review') {
    throw new Error(`Invalid decision for ${row.id}: ${update}. Allowed: ${allowedDecisions(row).join(', ')}`);
  }
}

function sourceFacts(row, sourceReviewRow) {
  if (row.source_kind === 'dxf_layer') {
    return {
      entity_count: row.entity_count,
      polyline_count: row.polyline_count,
      polyline_coverage: row.coverage,
      vertex_hint_count: row.vertex_hint_count,
      entity_types: row.entity_types,
      source_review_facts: sourceReviewRow?.extracted_source_facts || null
    };
  }
  return {
    entity_count: row.entity_count,
    source_review_facts: sourceReviewRow?.extracted_source_facts || null
  };
}

function sourceWarnings(row, sourceReviewRow) {
  const warnings = [];
  if (Array.isArray(row.notes)) warnings.push(...row.notes);
  if (Array.isArray(sourceReviewRow?.warnings)) warnings.push(...sourceReviewRow.warnings);
  if (row.source_kind === 'dxf_layer' && row.polyline_count > 1000) warnings.push('Dense DXF layer: keep as context/reference until cleaned, never direct editable design geometry.');
  if (row.source_kind === 'ifc_entity_type' && row.design_seed_candidate_after_review) warnings.push('Semantic IFC candidate: requires Bonsai/IfcOpenShell-style import and human review before design-seed use.');
  return [...new Set(warnings)];
}

function contextSelectionCommand(candidateId, decision) {
  if (!candidateId || decision === 'pending_review') return null;
  const project = shellQuote(relative(root, projectRoot));
  const reviewedBy = shellQuote(args['reviewed-by'] || 'Local Reviewer');
  return `npm run kosmo:context-selection -- --project ${project} --decision ${candidateId}=${decision} --reviewed-by ${reviewedBy}`;
}

function summarize(rows) {
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

function renderMarkdown(mapping) {
  const project = shellQuote(relative(root, projectRoot));
  const lines = [
    '# Context Source Mapping',
    '',
    `Project ID: \`${mapping.project_id}\``,
    `Generated: ${mapping.generated_at}`,
    `Status: \`${mapping.status}\``,
    '',
    'Human source mapping gate. It does not update `context-selection.json` automatically.',
    '',
    '## Summary',
    '',
    `- rows: ${mapping.summary.mapping_row_count}`,
    `- pending review: ${mapping.summary.pending_review_count}`,
    `- accepted as context: ${mapping.summary.accepted_as_context_count}`,
    `- accepted as design seed: ${mapping.summary.accepted_as_design_seed_count}`,
    `- needs more source review: ${mapping.summary.needs_more_source_review_count}`,
    `- rejected: ${mapping.summary.rejected_count}`,
    `- design seed possible after review: ${mapping.summary.design_seed_possible_after_review_count}`,
    '',
    '## Mapping Rows',
    '',
    '| Mapping | Source | Proposed role | Decision | Suggested | Linked candidate |',
    '| --- | --- | --- | --- | --- | --- |'
  ];

  for (const row of mapping.rows) {
    lines.push(`| ${escapePipe(row.mapping_id)} | ${escapePipe(row.source_name)} | ${escapePipe(row.proposed_role)} | ${escapePipe(row.decision)} | ${escapePipe(row.suggested_decision)} | ${escapePipe(row.linked_context_candidate_id || '-')} |`);
  }

  lines.push('', '## Review Commands', '');
  for (const row of mapping.rows) {
    lines.push(`### ${row.mapping_id}`, '');
    lines.push(`Suggested: \`${row.suggested_decision}\``);
    lines.push('');
    lines.push('```bash');
    lines.push(`npm run kosmo:context-source-mapping -- --project ${project} --decision ${row.mapping_id}=${row.suggested_decision} --reviewed-by "Local Reviewer"`);
    lines.push('```');
    if (row.context_selection_command) {
      lines.push('', 'Current context-selection sync command:');
      lines.push('');
      lines.push('```bash');
      lines.push(row.context_selection_command);
      lines.push('```');
    }
    if (row.warnings.length) {
      lines.push('', 'Warnings:');
      for (const warning of row.warnings) lines.push(`- ${warning}`);
    }
    lines.push('', 'Facts:');
    lines.push('```json');
    lines.push(JSON.stringify(row.source_facts, null, 2));
    lines.push('```', '');
  }

  return `${lines.join('\n')}\n`;
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = ensureItem(manifest.outputs, 'design/context-source-mapping.json', {
      path: 'design/context-source-mapping.json',
      type: 'other',
      module: 'design',
      rights_status: 'internal_only',
      description: 'Human source mapping gate for reviewed DXF layer and semantic IFC mapping decisions.'
    });
    didChange = ensureItem(manifest.outputs, 'design/context-source-mapping.md', {
      path: 'design/context-source-mapping.md',
      type: 'other',
      module: 'design',
      rights_status: 'internal_only',
      description: 'Human-readable source mapping gate for DXF/IFC decisions.'
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
    let didChange = ensureItem(exportManifest.exports, 'design/context-source-mapping.json', {
      path: 'design/context-source-mapping.json',
      module: 'Kosmo Design',
      format: 'json',
      status: 'source_mapping_review_required',
      rights_status: 'internal_only'
    });
    didChange = ensureItem(exportManifest.exports, 'design/context-source-mapping.md', {
      path: 'design/context-source-mapping.md',
      module: 'Kosmo Design',
      format: 'markdown',
      status: 'source_mapping_review_required',
      rights_status: 'internal_only'
    }) || didChange;
    if (didChange) {
      await writeFile(exportManifestPath, `${JSON.stringify(exportManifest, null, 2)}\n`, 'utf8');
      changed.push(exportManifestPath);
    }
  }

  return changed;
}

function normalizeDecision(value) {
  return decisions.has(value) ? value : 'pending_review';
}

function parseDecisionUpdates(items) {
  const updates = new Map();
  for (const item of items) {
    const [mappingId, decision] = splitKeyValue(item, '--decision');
    const normalized = normalizeDecision(decision);
    if (normalized !== decision) {
      throw new Error(`Invalid decision for ${mappingId}: ${decision}. Allowed: ${Array.from(decisions).join(', ')}`);
    }
    updates.set(mappingId, normalized);
  }
  return updates;
}

function parseNoteUpdates(items) {
  const updates = new Map();
  for (const item of items) {
    const [mappingId, note] = splitKeyValue(item, '--note');
    updates.set(mappingId, note);
  }
  return updates;
}

function validateUpdateTargets(mappingIds) {
  for (const mappingId of [...decisionUpdates.keys(), ...noteUpdates.keys()]) {
    if (!mappingIds.has(mappingId)) {
      throw new Error(`Unknown source mapping row: ${mappingId}`);
    }
  }
}

function splitKeyValue(value, flag) {
  if (typeof value !== 'string' || !value.includes('=')) {
    throw new Error(`${flag} expects mapping_id=value`);
  }
  const [key, ...rest] = value.split('=');
  const joined = rest.join('=').trim();
  if (!key.trim() || !joined) throw new Error(`${flag} expects mapping_id=value`);
  return [key.trim(), joined];
}

function asArray(value) {
  if (value === undefined || value === null || value === false) return [];
  return Array.isArray(value) ? value : [value];
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

function shellQuote(value) {
  return `"${String(value).replace(/(["\\$`])/g, '\\$1')}"`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      addArg(parsed, key, next);
      index += 1;
    } else {
      addArg(parsed, key, true);
    }
  }
  return parsed;
}

function addArg(parsed, key, value) {
  if (parsed[key] === undefined) {
    parsed[key] = value;
    return;
  }
  parsed[key] = Array.isArray(parsed[key]) ? [...parsed[key], value] : [parsed[key], value];
}
