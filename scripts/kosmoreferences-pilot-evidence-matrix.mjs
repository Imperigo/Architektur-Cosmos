#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const gapMapPath = resolve(root, args.gapMap || 'data/kosmoreferences-pilot-gap-map-2026-06-13.json');
const dataLanePath = resolve(root, args.dataLane || 'data/kosmodata-lane-sweep-2026-06-13.json');
const localWorkerReviewPath = resolve(root, args.localWorkerReview || 'data/kosmo-local-worker-output-review-2026-06-13.json');
const oneDriveRepairPath = resolve(root, args.oneDriveRepair || 'data/kosmo-onedrive-sync-error-summary-2026-06-13.json');
const outputJson = resolve(root, args.out || `data/kosmoreferences-pilot-evidence-matrix-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmoreferences-pilot-evidence-matrix-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const gapMap = await readJson(gapMapPath);
  const dataLane = await readJson(dataLanePath);
  const localWorkerReview = await readJson(localWorkerReviewPath);
  const oneDriveRepair = await readJson(oneDriveRepairPath);

  const pilots = gapMap.pilots.map((pilot) => {
    const gapCounts = countBy(pilot.gaps.map((gap) => gap.status));
    return {
      id: pilot.id,
      title: pilot.title,
      current_status: pilot.current_status,
      source_state: pilot.source_state,
      blocked_counts: pilot.blocked_counts,
      gap_count: pilot.gaps.length,
      gap_status_counts: gapCounts,
      blocking_gap_types: pilot.gaps
        .filter((gap) => ['blocking_public', 'needs_source', 'needs_rights_review', 'needs_source_review'].includes(gap.status))
        .map((gap) => gap.gap_type),
      recommended_workers: unique(pilot.gaps.map((gap) => gap.recommended_worker)),
      next_action: pilot.next_action,
      public_ready_allowed: false
    };
  });

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'pilot_evidence_matrix_review_only',
    policy: {
      review_only: true,
      public_ready_allowed: false,
      private_content_copied: false,
      note: 'This matrix summarizes review gaps and gate states only. It does not copy private library contents, page text, plans, images or worker packet bodies.'
    },
    source_refs: [
      relative(root, gapMapPath),
      relative(root, dataLanePath),
      relative(root, localWorkerReviewPath),
      relative(root, oneDriveRepairPath)
    ],
    summary: {
      pilots: pilots.length,
      total_gap_count: pilots.reduce((sum, pilot) => sum + pilot.gap_count, 0),
      media_slots_blocked: sumBy(pilots, (pilot) => pilot.blocked_counts.media),
      asset_candidates_blocked: sumBy(pilots, (pilot) => pilot.blocked_counts.asset_candidates),
      public_ready_assets: dataLane.summary?.references_public_ready_assets ?? 0,
      data_lane_status: dataLane.status,
      data_lane_steps: dataLane.summary?.steps ?? null,
      data_lane_passed_steps: dataLane.summary?.passed_steps ?? null,
      local_worker_review_status: localWorkerReview.status,
      local_worker_outputs: `${localWorkerReview.summary?.present_outputs ?? 0}/${localWorkerReview.summary?.required_outputs ?? 0}`,
      local_worker_high_risk_hits: localWorkerReview.summary?.high_risk_hits ?? null,
      private_library_status: dataLane.summary?.references_private_library ?? null,
      private_library_sync_errors: dataLane.summary?.references_private_library_sync_errors ?? null,
      onedrive_repair_marker_files: oneDriveRepair.summary?.marker_files ?? null,
      onedrive_repair_leaf_markers: oneDriveRepair.summary?.leaf_marker_files ?? null,
      onedrive_repair_missing_items: oneDriveRepair.summary?.aggregate_missing_items ?? null
    },
    pilots,
    next_actions: [
      'Keep all three pilots review-only until owner decisions and file-level rights/provenance pass.',
      'Use Villa Savoye for file-level media/model provenance first because local assets already exist.',
      'Use Sogn Benedetg for private-library mount/source discovery; do not harden geometry before the source root is visible.',
      'Use Ingenbohl for link-only PDF extraction decision and structure/material evidence planning.',
      'Run npm run kosmo:data-lane-sweep after any pilot evidence update.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('KosmoReferences pilot evidence matrix');
  console.log(`Status: ${report.status}`);
  console.log(`Pilots: ${report.summary.pilots}`);
  console.log(`Gaps: ${report.summary.total_gap_count}`);
  console.log(`Data lane: ${report.summary.data_lane_passed_steps}/${report.summary.data_lane_steps}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoReferences Pilot Evidence Matrix');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pilots: ${report.summary.pilots}`);
  lines.push(`- Total gaps: ${report.summary.total_gap_count}`);
  lines.push(`- Media slots blocked: ${report.summary.media_slots_blocked}`);
  lines.push(`- Asset candidates blocked: ${report.summary.asset_candidates_blocked}`);
  lines.push(`- Public-ready assets: ${report.summary.public_ready_assets}`);
  lines.push(`- Data-Lane Sweep: ${report.summary.data_lane_passed_steps}/${report.summary.data_lane_steps} (${report.summary.data_lane_status})`);
  lines.push(`- Local Worker Review: ${report.summary.local_worker_outputs}, ${report.summary.local_worker_high_risk_hits} risk (${report.summary.local_worker_review_status})`);
  lines.push(`- Private library: ${report.summary.private_library_status}, ${report.summary.private_library_sync_errors} curated sync errors`);
  lines.push(`- OneDrive Repair Sweep: ${report.summary.onedrive_repair_leaf_markers}/${report.summary.onedrive_repair_marker_files} markers, ${report.summary.onedrive_repair_missing_items} missing`);
  lines.push('');
  lines.push('## Pilot Matrix');
  lines.push('');
  lines.push('| Pilot | Status | Gaps | Blocking gap types | Workers | Next action |');
  lines.push('| --- | --- | ---: | --- | --- | --- |');
  for (const pilot of report.pilots) {
    lines.push(`| ${pilot.title} | ${pilot.current_status} | ${pilot.gap_count} | ${pilot.blocking_gap_types.join(', ') || '-'} | ${pilot.recommended_workers.join(', ') || '-'} | ${pilot.next_action} |`);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('All pilots remain review-only. This matrix does not approve public display or copy private source content.');
  lines.push('');
  return `${lines.join('\n')}`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function sumBy(values, selector) {
  return values.reduce((sum, value) => sum + Number(selector(value) || 0), 0);
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
