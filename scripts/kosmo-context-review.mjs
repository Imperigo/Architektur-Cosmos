#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const candidatesPath = join(projectRoot, args.candidates || 'design/context-candidates.generated.json');
const selectionPath = join(projectRoot, args.selection || 'design/context-selection.json');
const matrixPath = join(projectRoot, args.matrix || 'design/context-decision-matrix.generated.json');
const reviewJsonPath = join(projectRoot, args.output || 'design/context-review.json');
const reviewMdPath = join(projectRoot, args.markdown || 'design/context-review.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(candidatesPath)) {
    throw new Error(`No context candidates found: ${relative(root, candidatesPath)}`);
  }

  runSelectionIfNeeded();
  runMatrix();

  const candidates = readJson(candidatesPath);
  const selection = existsSync(selectionPath) ? readJson(selectionPath) : null;
  const matrix = existsSync(matrixPath) ? readJson(matrixPath) : null;
  const review = buildReview(candidates, selection, matrix);

  await mkdir(resolve(reviewJsonPath, '..'), { recursive: true });
  await writeFile(reviewJsonPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  await writeFile(reviewMdPath, renderMarkdown(review), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  printTerminalReview(review);
  console.log(`Wrote: ${relative(root, reviewMdPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function runSelectionIfNeeded() {
  const selectionArgs = [
    'scripts/kosmo-context-selection-create.mjs',
    '--project',
    projectRoot
  ];

  for (const decision of asArray(args.decision)) {
    selectionArgs.push('--decision', decision);
  }
  for (const note of asArray(args.note)) {
    selectionArgs.push('--note', note);
  }
  if (args['reviewed-by']) selectionArgs.push('--reviewed-by', args['reviewed-by']);
  if (args['approve-design-generation']) selectionArgs.push('--approve-design-generation');

  const shouldRun = !existsSync(selectionPath)
    || asArray(args.decision).length > 0
    || asArray(args.note).length > 0
    || Boolean(args['approve-design-generation']);

  if (!shouldRun) return;
  runNode(selectionArgs, 'context selection');
}

function runMatrix() {
  runNode([
    'scripts/kosmo-context-decision-matrix-create.mjs',
    '--project',
    projectRoot
  ], 'context decision matrix');
}

function buildReview(candidatesPayload, selectionPayload, matrixPayload) {
  const candidates = Array.isArray(candidatesPayload.candidates) ? candidatesPayload.candidates : [];
  const selections = Array.isArray(selectionPayload?.selections) ? selectionPayload.selections : [];
  const matrixRows = Array.isArray(matrixPayload?.rows) ? matrixPayload.rows : [];
  const selectionById = new Map(selections.map((item) => [item.candidate_id, item]));
  const matrixById = new Map(matrixRows.map((item) => [item.candidate_id, item]));
  const projectPath = relative(root, projectRoot) || '.';

  const rows = candidates.map((candidate) => {
    const selection = selectionById.get(candidate.id) || {};
    const matrix = matrixById.get(candidate.id) || {};
    const recommendedDecision = matrix.recommended_decision || 'needs_more_source_review';
    const currentDecision = selection.decision || 'undecided';
    const commandDecision = currentDecision === 'undecided' ? recommendedDecision : currentDecision;
    return {
      candidate_id: candidate.id,
      label: candidate.label || candidate.id,
      kind: candidate.kind || 'unknown',
      source: candidate.source || 'unknown',
      confidence: candidate.confidence || 'unknown',
      current_decision: currentDecision,
      recommended_decision: recommendedDecision,
      priority: matrix.priority || 'medium',
      design_seed_allowed_after_review: Boolean(matrix.design_seed_allowed_after_review),
      selected_use: selection.selected_use || candidate.suggested_use || matrix.recommended_use || null,
      rationale: matrix.rationale || 'No matrix rationale available.',
      required_checks: Array.isArray(matrix.required_checks) ? matrix.required_checks : [],
      warnings: Array.isArray(candidate.warnings) ? candidate.warnings : [],
      notes: Array.isArray(selection.notes) ? selection.notes : [],
      suggested_command: `npm run kosmo:context-review -- --project ${projectPath} --decision ${candidate.id}=${commandDecision} --reviewed-by "Local Reviewer"`
    };
  });

  const summary = summarize(rows, selectionPayload, matrixPayload);
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-context-review',
    project_id: candidatesPayload.project_id || selectionPayload?.project_id || matrixPayload?.project_id || 'unknown-project',
    project_path: projectPath,
    status: summary.approved_for_design_generation ? 'approved_for_design_seed' : 'review_required',
    rights_status: 'internal_only',
    policy: {
      context_review_is_local_only: true,
      suggested_commands_do_not_override_human_judgement: true,
      final_design_generation_requires_approve_flag: true
    },
    summary,
    rows,
    next_actions: nextActions(summary, rows)
  };
}

function summarize(rows, selectionPayload, matrixPayload) {
  const currentCount = (decision) => rows.filter((item) => item.current_decision === decision).length;
  const recommendedCount = (decision) => rows.filter((item) => item.recommended_decision === decision).length;
  return {
    candidate_count: rows.length,
    undecided_count: currentCount('undecided'),
    accepted_as_context_count: currentCount('accepted_as_context'),
    accepted_as_design_seed_count: currentCount('accepted_as_design_seed'),
    needs_more_source_review_count: currentCount('needs_more_source_review'),
    rejected_count: currentCount('rejected'),
    recommended_accepted_as_context_count: recommendedCount('accepted_as_context'),
    recommended_accepted_as_design_seed_count: recommendedCount('accepted_as_design_seed'),
    recommended_needs_more_source_review_count: recommendedCount('needs_more_source_review'),
    recommended_rejected_count: recommendedCount('rejected'),
    approved_for_design_generation: Boolean(selectionPayload?.approved_for_design_generation),
    selection_readiness: selectionPayload?.summary?.readiness || null,
    matrix_next_step: matrixPayload?.summary?.recommended_next_step || null
  };
}

function nextActions(summary, rows) {
  const actions = [];
  if (summary.undecided_count > 0) {
    actions.push(`Review ${summary.undecided_count} undecided context candidate(s).`);
  }
  if (summary.needs_more_source_review_count > 0) {
    actions.push(`Add or verify sources for ${summary.needs_more_source_review_count} candidate(s) marked needs_more_source_review.`);
  }
  if (summary.accepted_as_design_seed_count > 0 && !summary.approved_for_design_generation) {
    actions.push('Run context-review with --approve-design-generation only after all accepted design seeds are checked.');
  }
  const highPriority = rows.filter((item) => item.priority === 'high' && item.current_decision === 'undecided').length;
  if (highPriority > 0) actions.push(`Start with ${highPriority} high-priority undecided candidate(s).`);
  if (!actions.length) actions.push('Context review is ready for local owner review.');
  return actions;
}

function renderMarkdown(review) {
  const lines = [
    `# ${review.project_id} Context Review`,
    '',
    `Generated: ${review.generated_at}`,
    `Project path: \`${review.project_path}\``,
    `Status: \`${review.status}\``,
    `Approved for design generation: ${review.summary.approved_for_design_generation ? 'yes' : 'no'}`,
    '',
    '## Summary',
    '',
    `- candidates: ${review.summary.candidate_count}`,
    `- undecided: ${review.summary.undecided_count}`,
    `- accepted as context: ${review.summary.accepted_as_context_count}`,
    `- accepted as design seed: ${review.summary.accepted_as_design_seed_count}`,
    `- needs more source review: ${review.summary.needs_more_source_review_count}`,
    `- rejected: ${review.summary.rejected_count}`,
    '',
    '## Candidate Decisions',
    '',
    '| Candidate | Kind | Confidence | Current | Recommended | Priority |',
    '| --- | --- | --- | --- | --- | --- |'
  ];

  for (const row of review.rows) {
    lines.push(`| ${row.candidate_id} | ${row.kind} | ${row.confidence} | ${row.current_decision} | ${row.recommended_decision} | ${row.priority} |`);
  }

  lines.push('', '## Review Commands', '');
  for (const row of review.rows) {
    lines.push(`### ${row.candidate_id}`);
    lines.push('');
    lines.push(`Rationale: ${row.rationale}`);
    if (row.required_checks.length) {
      lines.push('', 'Required checks:');
      for (const check of row.required_checks) lines.push(`- ${check}`);
    }
    if (row.warnings.length) {
      lines.push('', 'Warnings:');
      for (const warning of row.warnings) lines.push(`- ${warning}`);
    }
    lines.push('', 'Suggested command:');
    lines.push('');
    lines.push('```bash');
    lines.push(row.suggested_command);
    lines.push('```');
    lines.push('');
  }

  lines.push('## Next Actions', '');
  for (const action of review.next_actions) lines.push(`- ${action}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function printTerminalReview(review) {
  console.log('Kosmo context review');
  console.log(`Project: ${review.project_id}`);
  console.log(`Candidates: ${review.summary.candidate_count}`);
  console.log(`Undecided: ${review.summary.undecided_count}`);
  console.log(`Needs source review: ${review.summary.needs_more_source_review_count}`);
  console.log(`Approved for design generation: ${review.summary.approved_for_design_generation ? 'yes' : 'no'}`);
  console.log('');
  for (const row of review.rows) {
    console.log(`- ${row.candidate_id}: ${row.current_decision} -> recommended ${row.recommended_decision} (${row.priority})`);
  }
  console.log('');
  console.log('Next actions:');
  for (const action of review.next_actions) console.log(`- ${action}`);
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = ensureItem(manifest.outputs, 'design/context-review.json', {
      path: 'design/context-review.json',
      type: 'other',
      module: 'design',
      rights_status: 'internal_only',
      description: 'Human-readable local context review with recommended commands.'
    });
    didChange = ensureItem(manifest.outputs, 'design/context-review.md', {
      path: 'design/context-review.md',
      type: 'other',
      module: 'design',
      rights_status: 'internal_only',
      description: 'Markdown context review for owner decisions.'
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
    let didChange = ensureItem(exportManifest.exports, 'design/context-review.json', {
      path: 'design/context-review.json',
      module: 'Kosmo Design',
      format: 'json',
      status: 'local_review_only',
      rights_status: 'internal_only'
    });
    didChange = ensureItem(exportManifest.exports, 'design/context-review.md', {
      path: 'design/context-review.md',
      module: 'Kosmo Design',
      format: 'markdown',
      status: 'local_review_only',
      rights_status: 'internal_only'
    }) || didChange;
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

function runNode(argv, label) {
  const result = spawnSync(process.execPath, argv, {
    cwd: root,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error(`Failed to create ${label}:\n${result.stdout || ''}${result.stderr || ''}`.trim());
  }
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

function asArray(value) {
  if (value === undefined || value === null || value === false) return [];
  return Array.isArray(value) ? value : [value];
}
