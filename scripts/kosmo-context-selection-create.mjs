#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const candidatesPath = join(projectRoot, args.candidates || 'design/context-candidates.generated.json');
const selectionPath = join(projectRoot, args.output || 'design/context-selection.json');

const decisions = new Set(['undecided', 'accepted_as_context', 'accepted_as_design_seed', 'needs_more_source_review', 'rejected']);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(candidatesPath)) {
    throw new Error(`No context candidates found: ${relative(root, candidatesPath)}`);
  }

  const candidates = readJson(candidatesPath);
  const existing = existsSync(selectionPath) ? readJson(selectionPath) : null;
  const selection = buildSelection(candidates, existing);

  await mkdir(resolve(selectionPath, '..'), { recursive: true });
  await writeFile(selectionPath, `${JSON.stringify(selection, null, 2)}\n`, 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo context selection created');
  console.log(`Project: ${selection.project_id}`);
  console.log(`Candidates: ${selection.summary.candidate_count}`);
  console.log(`Undecided: ${selection.summary.undecided_count}`);
  console.log(`Accepted as design seed: ${selection.summary.accepted_as_design_seed_count}`);
  console.log(`Wrote: ${relative(root, selectionPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildSelection(candidatesPayload, existing) {
  const candidateList = Array.isArray(candidatesPayload.candidates) ? candidatesPayload.candidates : [];
  const existingById = new Map((existing?.selections || []).map((item) => [item.candidate_id, item]));
  const candidateIds = new Set(candidateList.map((candidate) => candidate.id).filter(Boolean));
  const staleSelections = (existing?.selections || [])
    .filter((item) => item?.candidate_id && !candidateIds.has(item.candidate_id))
    .map((item) => ({
      candidate_id: item.candidate_id,
      previous_decision: normalizeDecision(item.decision),
      note: 'This selection no longer has a matching generated context candidate.'
    }));

  const selections = candidateList.map((candidate) => {
    const previous = existingById.get(candidate.id) || {};
    const decision = normalizeDecision(previous.decision);
    return {
      candidate_id: candidate.id,
      label: candidate.label || candidate.id,
      kind: candidate.kind || 'unknown',
      source: candidate.source || 'unknown',
      confidence: candidate.confidence || 'unknown',
      decision,
      selected_use: previous.selected_use || candidate.suggested_use || null,
      review_required: true,
      approved_by: previous.approved_by || null,
      approved_at: previous.approved_at || null,
      notes: Array.isArray(previous.notes) ? previous.notes : [],
      warnings: Array.isArray(candidate.warnings) ? candidate.warnings : [],
      evidence_ref: `design/context-candidates.generated.json#${candidate.id}`
    };
  });

  const summary = summarize(selections, staleSelections);
  const review = {
    reviewed_by: existing?.review?.reviewed_by || null,
    reviewed_at: existing?.review?.reviewed_at || null,
    notes: Array.isArray(existing?.review?.notes) ? existing.review.notes : []
  };
  const approvedForDesign = Boolean(existing?.approved_for_design_generation) && summary.accepted_as_design_seed_count > 0 && summary.undecided_count === 0;

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-context-selection-create',
    project_id: candidatesPayload.project_id || existing?.project_id || 'unknown-project',
    status: approvedForDesign ? 'approved_for_design_seed' : 'draft_needs_human_review',
    rights_status: 'internal_only',
    source_candidates_path: 'design/context-candidates.generated.json',
    approved_for_design_generation: approvedForDesign,
    policy: {
      generated_candidates_are_not_design_facts: true,
      default_decision: 'undecided',
      accepted_as_design_seed_requires_human_review: true,
      public_or_external_use_allowed: false
    },
    review,
    summary: {
      ...summary,
      readiness: readiness(summary, approvedForDesign)
    },
    selections,
    stale_selections: staleSelections
  };
}

function summarize(selections, staleSelections) {
  const count = (decision) => selections.filter((item) => item.decision === decision).length;
  return {
    candidate_count: selections.length,
    accepted_as_context_count: count('accepted_as_context'),
    accepted_as_design_seed_count: count('accepted_as_design_seed'),
    needs_more_source_review_count: count('needs_more_source_review'),
    rejected_count: count('rejected'),
    undecided_count: count('undecided'),
    stale_selection_count: staleSelections.length
  };
}

function readiness(summary, approvedForDesign) {
  if (approvedForDesign) return 'ready_for_design_seed';
  if (summary.accepted_as_design_seed_count > 0) return 'design_seed_selection_needs_final_approval';
  if (summary.accepted_as_context_count > 0) return 'context_selected_needs_design_seed_approval';
  if (summary.candidate_count > 0) return 'needs_human_selection';
  return 'pending_context_candidates';
}

function normalizeDecision(value) {
  return decisions.has(value) ? value : 'undecided';
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    const didChange = ensureItem(manifest.outputs, 'design/context-selection.json', {
      path: 'design/context-selection.json',
      type: 'other',
      module: 'design',
      rights_status: 'internal_only',
      description: 'Human review gate for accepting context candidates as design input.'
    });
    if (didChange) {
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      changed.push(manifestPath);
    }
  }

  const exportManifestPath = join(projectRoot, 'publish/export-manifest.json');
  if (existsSync(exportManifestPath)) {
    const exportManifest = readJson(exportManifestPath);
    if (!Array.isArray(exportManifest.exports)) exportManifest.exports = [];
    const didChange = ensureItem(exportManifest.exports, 'design/context-selection.json', {
      path: 'design/context-selection.json',
      module: 'Kosmo Design',
      format: 'json',
      status: 'draft_needs_human_review',
      rights_status: 'internal_only'
    });
    if (didChange) {
      await writeFile(exportManifestPath, `${JSON.stringify(exportManifest, null, 2)}\n`, 'utf8');
      changed.push(exportManifestPath);
    }
  }

  return changed;
}

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
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
