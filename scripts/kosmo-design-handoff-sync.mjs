#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = args.date || new Date().toISOString().slice(0, 10);

const inputSpecs = [
  {
    id: 'source_free_queue',
    lane: 'ArchitectureCosmos',
    path: args.sourceQueue || `docs/codex/kosmo-source-independent-work-queue-${dateStamp}.md`,
    markers: ['Codex executable now: 0', 'Owner actions: 2', 'Public-ready after queue: 0'],
    signal: 'Source-free queue has no Codex-executable tasks; fallback work must stay review-only or public-safe.'
  },
  {
    id: 'data_lane_sweep',
    lane: 'KosmoReferences/KosmoAsset',
    path: args.dataLaneSweep || `docs/codex/kosmodata-lane-sweep-${dateStamp}.md`,
    markers: ['Status: `kosmodata_lane_sweep_review_only_passed`', 'KosmoAsset public-ready assets: 0'],
    signal: 'References and asset lanes are structurally ready for review, but not promotion.'
  },
  {
    id: 'overseer_sync_board',
    lane: 'KosmoOverseer',
    path: args.overseerSync || `docs/codex/kosmo-overseer-sync-board-${dateStamp}.md`,
    markers: ['Status: `overseer_sync_board_ready`', 'Public-ready after board: 0'],
    signal: 'Overseer board is current; owner, source-root and private-inventory blockers remain active.'
  },
  {
    id: 'claude_overseer_intake',
    lane: 'Claude/KosmoOverseer',
    path: args.claudeOverseerIntake ||
      '/mnt/data/ArchitekturKosmos/KosmoOrbit/_overseer/intake/inbox/2026-06-16-codex-synergiebericht-338-claude-kosmooverseer-implementation-intake.md',
    markers: ['Claude/KosmoOverseer', 'Dirty Worktree Guard', 'Kein `public-ready`'],
    signal: 'Claude/KosmoOverseer intake keeps exact staging and owner unlock gates as active coordination boundaries.'
  },
  {
    id: 'cross_lane_handoff_sync',
    lane: 'Codex/KosmoDesign',
    path: args.crossLaneSync ||
      '/mnt/data/ArchitekturKosmos/KosmoOrbit/_overseer/intake/inbox/2026-07-01-codex-cross-lane-handoff-sync.md',
    markers: ['KosmoDesign/KosmoDraw handoffs reinforce the boundary', 'Source-free queue'],
    signal: 'KosmoDesign/KosmoDraw contracts may be consumed, but sibling-lane code must not be silently edited.'
  },
  {
    id: 'tkb_program_refresh',
    lane: 'Claude/KosmoPrepare',
    path: args.tkbProgramRefresh ||
      '/mnt/data/ArchitekturKosmos/KosmoOrbit/_overseer/intake/inbox/2026-07-01-claude-tkb-programm-authentisch-aufgefrischt.md',
    markers: ['Raumprogramm authentisch aufgefrischt', 'KosmoPrepare', 'KosmoVis'],
    signal: 'TKB program refresh is a private-lane dependency signal for design/render review, not a public data source.'
  },
  {
    id: 'tkb_ifc_rematerialized',
    lane: 'Claude/KosmoPublish',
    path: args.tkbIfc ||
      '/mnt/data/ArchitekturKosmos/KosmoOrbit/_overseer/intake/inbox/2026-07-01-claude-kosmopublish-tkb-rematerialisiert-to-kosmovis.md',
    markers: ['IFC bereit', 'KosmoVis', 'maßstäblich korrekt'],
    signal: 'Geometry-bearing publish output unblocks lane-local render QA, while raw working paths remain non-public.'
  },
  {
    id: 'tkb_massing_model',
    lane: 'Claude/KosmoPublish/KosmoVis',
    path: args.tkbMassing ||
      '/mnt/data/ArchitekturKosmos/KosmoOrbit/_overseer/intake/inbox/2026-07-01-claude-tkb-programm-treues-massenmodell-to-kosmovis.md',
    markers: ['MASSENMODELL', 'KosmoVis', 'render-bereit'],
    signal: 'Program-faithful massing is suitable for lane-local visual QA, not direct public promotion.'
  }
];

const outputJson = resolve(root, args.out || `data/kosmo-design-handoff-sync-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-design-handoff-sync-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const inputs = [];
  const failures = [];

  for (const spec of inputSpecs) {
    const resolvedPath = resolve(root, spec.path);
    const text = await readFile(resolvedPath, 'utf8');
    const missingMarkers = spec.markers.filter((marker) => !text.includes(marker));
    if (missingMarkers.length > 0) {
      failures.push(`${spec.id} missing markers: ${missingMarkers.join(', ')}`);
    }
    inputs.push({
      id: spec.id,
      lane: spec.lane,
      source_label: basename(spec.path),
      bytes: Buffer.byteLength(text, 'utf8'),
      markers_checked: spec.markers.length,
      missing_markers: missingMarkers,
      signal: spec.signal
    });
  }

  const report = buildReport(inputs, failures);
  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo design handoff sync');
  console.log(`Status: ${report.status}`);
  console.log(`Inputs: ${report.summary.inputs}`);
  console.log(`Signals: ${report.summary.signals}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after sync: ${report.summary.public_ready_after_sync}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildReport(inputs, failures) {
  const signals = inputs.map((input) => ({
    id: input.id,
    lane: input.lane,
    source_label: input.source_label,
    finding: input.signal,
    review_only: true,
    public_display_allowed: false
  }));

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'kosmo_design_handoff_sync_review_only_ready'
      : 'kosmo_design_handoff_sync_needs_review',
    mode: 'review_only',
    public_display_allowed: false,
    policy: {
      sync_only: true,
      reads_handoff_text: true,
      copies_private_paths: false,
      copies_document_bodies: false,
      edits_sibling_lane_code: false,
      writes_public_files_now: false,
      records_owner_decisions: false,
      runs_private_inventory_now: false,
      executes_local_workers_now: false,
      public_ready_after_sync: 0
    },
    source_refs: inputs.map((input) => ({
      id: input.id,
      lane: input.lane,
      source_label: input.source_label
    })),
    summary: {
      inputs: inputs.length,
      signals: signals.length,
      handoff_inputs: inputs.filter((input) => !input.source_label.startsWith('kosmo-')).length,
      privacy_guards: 8,
      failures: failures.length,
      public_ready_after_sync: 0
    },
    signals,
    integration_notes: [
      'Codex may consume KosmoDesign and KosmoDraw contracts and write visible notices, but this sync does not edit sibling-lane code.',
      'TKB design/render signals remain lane-local review dependencies and cannot be used as public website content or public-ready evidence.',
      'KosmoReferences and KosmoAsset stay review-only until owner source-root, rights and promotion decisions pass their guards.',
      'Overseer should route future design/render follow-ups through explicit handoffs before related file edits.'
    ],
    blockers: [
      {
        id: 'owner_source_root_choice',
        status: 'owner_action_required',
        effect: 'Blocks private inventory and private-derived authoring.'
      },
      {
        id: 'owner_review_batches',
        status: 'owner_action_required',
        effect: 'Blocks promotion of review-only reference and asset candidates.'
      },
      {
        id: 'public_ready',
        status: 'locked_zero',
        effect: 'No synced signal is public-displayable.'
      }
    ],
    hard_stops: [
      'Do not treat handoff signals as owner approval.',
      'Do not copy private source paths or document bodies into public files.',
      'Do not run private inventory or local workers on private contents from this sync.',
      'Do not set public-ready.'
    ],
    failures
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Design Handoff Sync');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push(`Mode: \`${report.mode}\``);
  lines.push(`Public display allowed: \`${report.public_display_allowed}\``);
  lines.push(`Public-ready after sync: \`${report.summary.public_ready_after_sync}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Inputs: ${report.summary.inputs}`);
  lines.push(`- Signals: ${report.summary.signals}`);
  lines.push(`- Privacy guards: ${report.summary.privacy_guards}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push('');
  lines.push('## Signals');
  lines.push('');
  lines.push('| Lane | Source | Finding |');
  lines.push('| --- | --- | --- |');
  report.signals.forEach((signal) => {
    lines.push(`| ${signal.lane} | \`${signal.source_label}\` | ${signal.finding} |`);
  });
  lines.push('');
  lines.push('## Integration Notes');
  lines.push('');
  report.integration_notes.forEach((note) => lines.push(`- ${note}`));
  lines.push('');
  lines.push('## Blockers');
  lines.push('');
  lines.push('| Blocker | Status | Effect |');
  lines.push('| --- | --- | --- |');
  report.blockers.forEach((blocker) => {
    lines.push(`| \`${blocker.id}\` | ${blocker.status} | ${blocker.effect} |`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  return lines.join('\n');
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
