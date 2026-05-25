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
  const candidates = existsSync(candidatesPath) ? safeReadJson(candidatesPath) : null;
  const selection = existsSync(selectionPath) ? safeReadJson(selectionPath) : null;
  const matrix = existsSync(matrixPath) ? safeReadJson(matrixPath) : null;
  const sourceMap = existsSync(sourceMapPath) ? safeReadJson(sourceMapPath) : null;
  const sourceMapping = existsSync(sourceMappingPath) ? safeReadJson(sourceMappingPath) : null;
  const sourceReview = existsSync(sourceReviewPath) ? safeReadJson(sourceReviewPath) : null;
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
  lines.push(`- approved for design generation: ${contextReview.approved_for_design_generation ? 'yes' : 'no'}`);
  lines.push(`- readiness: ${contextReview.readiness || 'unknown'}`);
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
