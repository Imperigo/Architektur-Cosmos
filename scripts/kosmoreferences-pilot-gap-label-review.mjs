#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const gapMapPath = resolve(root, args.gapMap || existingDatedPath('data/kosmoreferences-pilot-gap-map', dateStamp, '2026-06-13'));
const evidenceMatrixPath = resolve(root, args.evidenceMatrix || `data/kosmoreferences-pilot-evidence-matrix-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmoreferences-pilot-gap-label-review-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmoreferences-pilot-gap-label-review-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const gapMap = await readJson(gapMapPath);
  const evidenceMatrix = await readJson(evidenceMatrixPath);
  const report = buildReport(gapMap, evidenceMatrix);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('KosmoReferences pilot gap label review');
  console.log(`Status: ${report.status}`);
  console.log(`Gap labels: ${report.summary.gap_labels}`);
  console.log(`Hard blockers: ${report.summary.hard_blockers}`);
  console.log(`Owner decisions: ${report.summary.owner_decisions_required}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after review: ${report.summary.public_ready_after_review}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport(gapMap, evidenceMatrix) {
  const failures = [];
  if (gapMap.status !== 'review_only') failures.push(`Gap map not review-only: ${gapMap.status}`);
  if (evidenceMatrix.status !== 'pilot_evidence_matrix_review_only') failures.push(`Evidence matrix not review-only: ${evidenceMatrix.status}`);

  const gapLabels = gapMap.pilots.flatMap((pilot) => pilot.gaps.map((gap) => labelGap(pilot, gap)));
  if (gapLabels.some((label) => label.public_ready_after_label !== 0)) failures.push('Every gap label must keep public-ready at 0.');
  if (gapLabels.some((label) => label.reads_private_content || label.copies_private_content)) failures.push('Gap label review contains unsafe private-content access.');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'pilot_gap_label_review_ready'
      : 'pilot_gap_label_review_needs_review',
    policy: {
      review_only: true,
      source_independent: true,
      reads_private_content: false,
      copies_private_content: false,
      extracts_pdf_or_media: false,
      runs_private_inventory_now: false,
      executes_local_worker_now: false,
      public_ready_after_review: 0,
      note: 'This review labels existing pilot gaps and routing only. It does not inspect private sources, media, plans, PDFs or local worker private outputs.'
    },
    source_refs: [
      relative(root, gapMapPath),
      relative(root, evidenceMatrixPath)
    ],
    summary: {
      pilots: gapMap.pilots.length,
      gap_labels: gapLabels.length,
      hard_blockers: gapLabels.filter((label) => label.severity === 'hard_blocker').length,
      source_gated: gapLabels.filter((label) => label.gate === 'source_required').length,
      rights_gated: gapLabels.filter((label) => label.gate === 'rights_required').length,
      provenance_gated: gapLabels.filter((label) => label.gate === 'provenance_required').length,
      review_gated: gapLabels.filter((label) => label.gate === 'review_required').length,
      private_draft_gated: gapLabels.filter((label) => label.gate === 'private_draft_only').length,
      owner_decisions_required: gapLabels.filter((label) => label.owner_decision_required).length,
      local_worker_allowed_now: gapLabels.filter((label) => label.local_worker_allowed_now).length,
      public_ready_after_review: 0,
      failures: failures.length
    },
    gap_labels: gapLabels,
    pilot_priorities: gapMap.pilots.map((pilot) => ({
      pilot_id: pilot.id,
      priority_label: priorityForPilot(pilot),
      first_safe_action: firstSafeActionForPilot(pilot),
      public_ready_after_priority: 0
    })),
    hard_stops: [
      'Do not read private pilot source folders.',
      'Do not copy PDF text, page images, plans or media into this review.',
      'Do not execute local workers from this review.',
      'Keep all media/model/asset slots blocked until file-level rights and provenance pass.',
      'Keep public-ready at 0.'
    ],
    failures
  };
}

function labelGap(pilot, gap) {
  const gate = gateFor(gap.status, gap.gap_type);
  return {
    id: `${pilot.id}:${gap.gap_type}`,
    pilot_id: pilot.id,
    gap_type: gap.gap_type,
    original_status: gap.status,
    gate,
    severity: severityFor(gap.status, gate),
    owner_decision_required: ['source_required', 'rights_required', 'provenance_required'].includes(gate),
    local_worker_allowed_now: ['review_required', 'private_draft_only'].includes(gate),
    local_worker_instruction: instructionFor(gate),
    recommended_worker: gap.recommended_worker,
    next_source_type_label: sourceTypeLabel(gap.next_source_type),
    reads_private_content: false,
    copies_private_content: false,
    extracts_pdf_or_media: false,
    public_ready_after_label: 0
  };
}

function gateFor(status, gapType) {
  if (status === 'needs_source' || status === 'needs_source_review') return 'source_required';
  if (status === 'needs_rights_review' || gapType.includes('rights')) return 'rights_required';
  if (status === 'blocking_public' || gapType.includes('provenance')) return 'provenance_required';
  if (status === 'draft_ok_private') return 'private_draft_only';
  return 'review_required';
}

function severityFor(status, gate) {
  if (['provenance_required', 'rights_required', 'source_required'].includes(gate)) return 'hard_blocker';
  if (status === 'needs_review') return 'review_blocker';
  return 'private_study_ok';
}

function instructionFor(gate) {
  if (gate === 'source_required') return 'Create only source-wishlist metadata; wait for owner/source-root before evidence extraction.';
  if (gate === 'rights_required') return 'Prepare decision brief only; do not extract PDF/media until rights gate passes.';
  if (gate === 'provenance_required') return 'Prepare provenance manifest schema only; keep media/model blocked.';
  if (gate === 'private_draft_only') return 'Local study notes are allowed, but outputs stay private and review-only.';
  return 'Review labels and uncertainty; do not promote public assets.';
}

function sourceTypeLabel(value) {
  const lower = String(value || '').toLowerCase();
  if (lower.includes('pdf')) return 'pdf_decision_needed';
  if (lower.includes('media') || lower.includes('license')) return 'media_rights_manifest_needed';
  if (lower.includes('plan') || lower.includes('drawing')) return 'plan_geometry_source_needed';
  if (lower.includes('material') || lower.includes('texture')) return 'material_profile_needed';
  if (lower.includes('structure') || lower.includes('construction')) return 'structure_source_needed';
  if (lower.includes('model')) return 'model_build_log_needed';
  return 'source_metadata_needed';
}

function priorityForPilot(pilot) {
  if (pilot.id === 'villa-savoye') return 'file_rights_and_plan_provenance_first';
  if (pilot.id === 'kapelle-sogn-benedetg') return 'source_root_and_timber_structure_first';
  if (pilot.id === 'alterszentrum-kloster-ingenbohl') return 'pdf_rights_and_structure_evidence_first';
  return 'owner_review_first';
}

function firstSafeActionForPilot(pilot) {
  if (pilot.id === 'villa-savoye') return 'Draft file-level provenance manifest fields for existing local media/model assets.';
  if (pilot.id === 'kapelle-sogn-benedetg') return 'Draft source wishlist for library/lecture evidence and timber structure details.';
  if (pilot.id === 'alterszentrum-kloster-ingenbohl') return 'Draft link-only PDF extraction decision fields and structure evidence checklist.';
  return 'Keep review-only and request owner decision.';
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoReferences Pilot Gap Label Review');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pilots: ${report.summary.pilots}`);
  lines.push(`- Gap labels: ${report.summary.gap_labels}`);
  lines.push(`- Hard blockers: ${report.summary.hard_blockers}`);
  lines.push(`- Source-gated: ${report.summary.source_gated}`);
  lines.push(`- Rights-gated: ${report.summary.rights_gated}`);
  lines.push(`- Provenance-gated: ${report.summary.provenance_gated}`);
  lines.push(`- Review-gated: ${report.summary.review_gated}`);
  lines.push(`- Private draft gated: ${report.summary.private_draft_gated}`);
  lines.push(`- Owner decisions required: ${report.summary.owner_decisions_required}`);
  lines.push(`- Local worker allowed now: ${report.summary.local_worker_allowed_now}`);
  lines.push(`- Public-ready after review: ${report.summary.public_ready_after_review}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Gap Labels');
  lines.push('');
  lines.push('| Gap | Gate | Severity | Owner decision | Local worker now | Source label |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  report.gap_labels.forEach((label) => {
    lines.push(`| \`${label.id}\` | ${label.gate} | ${label.severity} | ${label.owner_decision_required ? 'yes' : 'no'} | ${label.local_worker_allowed_now ? 'yes' : 'no'} | ${label.next_source_type_label} |`);
  });
  lines.push('');
  lines.push('## Pilot Priorities');
  lines.push('');
  report.pilot_priorities.forEach((pilot) => {
    lines.push(`- \`${pilot.pilot_id}\`: ${pilot.priority_label}; ${pilot.first_safe_action}`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  return lines.join('\n');
}

function existingDatedPath(prefix, preferredDate, fallbackDate) {
  const preferred = `${prefix}-${preferredDate}.json`;
  if (existsSync(resolve(root, preferred))) return preferred;
  return `${prefix}-${fallbackDate}.json`;
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
