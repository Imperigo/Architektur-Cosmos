#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmo-day-batch-loop-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-day-batch-loop-${dateStamp}.md`);
const timeoutMs = Number(args.timeoutMs || 240000);
const sourceRootSession = resolve(root, `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`);

const steps = [
  step('onedrive_sync_errors', 'OneDrive Sync Errors', ['run', 'kosmo:onedrive-sync-errors']),
  step('storage_mount_snapshot', 'Storage Mount Snapshot', ['run', 'kosmo:storage-mount-snapshot']),
  step('source_root_locator', 'Source Root Locator', ['run', 'kosmo:source-root-locator']),
  step('source_root_selection_brief', 'Source Root Selection Brief', ['run', 'kosmo:source-root-selection-brief']),
  conditionalStep(
    'source_root_decision_session_create',
    'Source Root Decision Session Create',
    ['run', 'kosmo:source-root-decision-session-create'],
    () => !existsSync(sourceRootSession),
    `Session already exists: ${relative(root, sourceRootSession)}`
  ),
  step('source_root_decision_session_check', 'Source Root Decision Session Check', ['run', 'kosmo:source-root-decision-session-check']),
  step('private_library_diagnostic', 'Private Library Diagnostic Metadata', [
    'run',
    'kosmo:private-library-diagnostic',
    '--',
    '--out',
    `data/kosmoreferences-private-library-diagnostic-${dateStamp}.json`,
    '--markdown',
    `docs/codex/kosmoreferences-private-library-diagnostic-${dateStamp}.md`
  ]),
  step('source_root_blocker_refresh', 'Source Root Blocker Refresh', ['run', 'kosmo:source-root-blocker-refresh']),
  step('local_worker_task_pack_refresh', 'Local Worker Task Pack Refresh', ['run', 'kosmo:local-worker-task-pack-refresh']),
  step('local_worker_output_review', 'Local Worker Output Review', ['run', 'kosmo:local-worker-output-review']),
  step('bootstrap_data_lane_sweep', 'Bootstrap Data Lane Sweep', ['run', 'kosmo:data-lane-sweep'], { allowFailure: true }),
  step('bootstrap_router', 'Bootstrap Router', ['run', 'kosmo:data-lane-command-router']),
  step('core_data_lane_sweep', 'Core Data Lane Sweep', ['run', 'kosmo:data-lane-sweep']),
  step('pilot_evidence_matrix', 'Pilot Evidence Matrix', ['run', 'kosmo:pilot-evidence-matrix']),
  step('pilot_package_check', 'Pilot Package Check', ['run', 'kosmo:pilot-package-check']),
  step('core_router', 'Core Router', ['run', 'kosmo:data-lane-command-router']),
  step('worker_boundary_pack', 'Worker Boundary Pack', ['run', 'kosmo:worker-boundary-pack']),
  step('worker_boundary_pack_check', 'Worker Boundary Pack Check', ['run', 'kosmo:worker-boundary-pack-check']),
  step('local_worker_launch_queue', 'Local Worker Launch Queue', ['run', 'kosmo:local-worker-launch-queue']),
  step('local_worker_output_conversion_plan', 'Local Worker Output Conversion Plan', ['run', 'kosmo:local-worker-output-conversion-plan']),
  step('owner_review_packet', 'Owner Review Packet', ['run', 'kosmo:owner-review-packet']),
  step('owner_review_packet_check', 'Owner Review Packet Check', ['run', 'kosmo:owner-review-packet-check']),
  step('owner_review_session_brief', 'Owner Review Session Brief', ['run', 'kosmo:owner-review-session-brief']),
  step('owner_review_session_brief_check', 'Owner Review Session Brief Check', ['run', 'kosmo:owner-review-session-brief-check']),
  step('night_loop_checkpoint', 'Night Loop Checkpoint', ['run', 'kosmo:night-loop-checkpoint']),
  step('innovation_lane_plan', 'Innovation Lane Plan', ['run', 'kosmo:innovation-lane-plan']),
  step('innovation_smoke', 'Innovation Smoke', ['run', 'kosmo:innovation-smoke']),
  step('orbit_status_bridge', 'Orbit Status Bridge', ['run', 'kosmo:orbit-status-bridge'])
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const startedAt = Date.now();
  const results = [];
  for (const item of steps) {
    if (item.shouldRun && !item.shouldRun()) {
      results.push(skippedResult(item));
      continue;
    }
    results.push(await runStep(item));
    const last = results.at(-1);
    if (last.exit_code !== 0 && !item.allowFailure) break;
  }

  const report = await buildReport({ results, startedAt });
  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo day batch loop');
  console.log(`Status: ${report.status}`);
  console.log(`Required steps: ${report.summary.required_passed_steps}/${report.summary.required_steps}`);
  console.log(`Core sweep: ${report.summary.core_sweep_status}`);
  console.log(`Worker boundary: ${report.summary.worker_boundary_status}`);
  console.log(`Owner handoff: ${report.summary.owner_handoff_status}`);
  console.log(`Innovation smoke: ${report.summary.innovation_smoke_status}`);
  console.log(`Orbit bridge: ${report.summary.orbit_bridge_status}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.status !== 'day_batch_loop_passed_review_only') process.exitCode = 1;
}

function step(id, label, npmArgs, options = {}) {
  return { id, label, command: 'npm', args: npmArgs, allowFailure: Boolean(options.allowFailure) };
}

function conditionalStep(id, label, npmArgs, shouldRun, skippedReason) {
  return { ...step(id, label, npmArgs), shouldRun, skippedReason };
}

async function runStep(item) {
  const startedAt = Date.now();
  const output = [];
  let timedOut = false;
  const exitCode = await new Promise((resolvePromise) => {
    const child = spawn(item.command, item.args, {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);
    child.stdout.on('data', (chunk) => output.push(String(chunk)));
    child.stderr.on('data', (chunk) => output.push(String(chunk)));
    child.on('error', (error) => {
      clearTimeout(timer);
      output.push(error.message);
      resolvePromise(1);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise(timedOut ? 124 : code ?? 1);
    });
  });

  return {
    id: item.id,
    label: item.label,
    command: [item.command, ...item.args].join(' '),
    required: !item.allowFailure,
    started_at: new Date(startedAt).toISOString(),
    duration_ms: Date.now() - startedAt,
    exit_code: exitCode,
    status: exitCode === 0 ? 'passed' : timedOut ? 'timed_out' : item.allowFailure ? 'allowed_failure' : 'failed',
    output_excerpt: excerpt(output.join(''))
  };
}

function skippedResult(item) {
  return {
    id: item.id,
    label: item.label,
    command: [item.command, ...item.args].join(' '),
    required: false,
    started_at: new Date().toISOString(),
    duration_ms: 0,
    exit_code: 0,
    status: 'skipped',
    output_excerpt: item.skippedReason
  };
}

async function buildReport({ results, startedAt }) {
  const required = results.filter((result) => result.required !== false);
  const requiredFailures = required.filter((result) => result.exit_code !== 0);
  const sweep = await readOptionalJson(`data/kosmodata-lane-sweep-${dateStamp}.json`);
  const router = await readOptionalJson(`data/kosmo-data-lane-command-router-${dateStamp}.json`);
  const boundary = await readOptionalJson(`data/kosmo-worker-boundary-pack-check-${dateStamp}.json`);
  const ownerPacket = await readOptionalJson(`data/kosmo-owner-review-packet-check-${dateStamp}.json`);
  const ownerSession = await readOptionalJson(`data/kosmo-owner-review-session-brief-check-${dateStamp}.json`);
  const blocker = await readOptionalJson(`data/kosmo-source-root-blocker-refresh-${dateStamp}.json`);
  const checkpoint = await readOptionalJson(`data/kosmo-night-loop-checkpoint-${dateStamp}.json`);
  const innovationSmoke = await readOptionalJson(`data/kosmo-innovation-smoke-${dateStamp}.json`);
  const orbitBridge = await readOptionalJson(`data/kosmo-orbit-status-bridge-${dateStamp}.json`);
  const ownerHandoffPassed = ownerPacket?.status === 'owner_review_packet_guard_passed' &&
    ownerSession?.status === 'owner_review_session_brief_guard_passed';
  const invariants = [
    invariant('required_steps_passed', requiredFailures.length === 0, `${required.length - requiredFailures.length}/${required.length}`),
    invariant('core_sweep_review_only', sweep?.status === 'kosmodata_lane_sweep_review_only_passed', sweep?.status),
    invariant('router_guarded_review_only', router?.status === 'worker_router_guarded_review_only', router?.status),
    invariant('worker_boundary_passed', boundary?.status === 'worker_boundary_pack_guard_passed', boundary?.status),
    invariant('owner_handoff_passed', ownerHandoffPassed, `${ownerPacket?.status || 'missing'} / ${ownerSession?.status || 'missing'}`),
    invariant('innovation_smoke_review_only', innovationSmoke?.status === 'innovation_smoke_passed_review_only', innovationSmoke?.status),
    invariant('orbit_bridge_ready', ['orbit_bridge_ready_with_blockers', 'orbit_bridge_all_ready_review_only'].includes(orbitBridge?.status), orbitBridge?.status),
    invariant('public_ready_zero', (sweep?.summary?.references_public_ready_assets ?? 0) === 0, `public_ready=${sweep?.summary?.references_public_ready_assets ?? 0}`),
    invariant('private_source_still_guarded', blocker?.summary?.private_diagnostic_allowed !== true, `private_diagnostic_allowed=${blocker?.summary?.private_diagnostic_allowed}`)
  ];
  const passed = invariants.every((item) => item.status === 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: passed ? 'day_batch_loop_passed_review_only' : 'day_batch_loop_needs_review',
    policy: {
      review_only: true,
      records_decisions: false,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_loop: 0,
      note: 'This loop runs review-only guards and handoff generators. It does not select source roots, read private source contents, promote assets or publish files.'
    },
    summary: {
      duration_ms: Date.now() - startedAt,
      steps: results.length,
      required_steps: required.length,
      required_passed_steps: required.length - requiredFailures.length,
      allowed_failures: results.filter((result) => result.status === 'allowed_failure').length,
      skipped_steps: results.filter((result) => result.status === 'skipped').length,
      core_sweep_status: sweep?.status || null,
      router_status: router?.status || null,
      worker_boundary_status: boundary?.status || null,
      owner_handoff_status: ownerHandoffPassed ? 'passed' : 'needs_review',
      innovation_smoke_status: innovationSmoke?.status || null,
      orbit_bridge_status: orbitBridge?.status || null,
      source_root_blocker_status: blocker?.status || null,
      private_diagnostic_allowed: blocker?.summary?.private_diagnostic_allowed === true,
      night_loop_checkpoint_status: checkpoint?.status || null,
      public_ready_after_loop: 0
    },
    source_refs: [
      `data/kosmodata-lane-sweep-${dateStamp}.json`,
      `data/kosmo-data-lane-command-router-${dateStamp}.json`,
      `data/kosmo-worker-boundary-pack-check-${dateStamp}.json`,
      `data/kosmo-owner-review-packet-check-${dateStamp}.json`,
      `data/kosmo-owner-review-session-brief-check-${dateStamp}.json`,
      `data/kosmo-source-root-blocker-refresh-${dateStamp}.json`,
      `data/kosmo-night-loop-checkpoint-${dateStamp}.json`,
      `data/kosmo-innovation-smoke-${dateStamp}.json`,
      `data/kosmo-orbit-status-bridge-${dateStamp}.json`
    ],
    invariants,
    steps: results,
    next_actions: [
      'Use this script as the daily autonomous KosmoReferences/KosmoAsset review-only loop.',
      'If source-root remains blocked, present the owner review packet and do not run private extraction.',
      'After a real source root is recorded, rerun this loop before any pilot-first private inventory.'
    ]
  };
}

function invariant(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence: String(evidence ?? 'missing')
  };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(resolve(root, path), 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Day Batch Loop');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Required steps: ${report.summary.required_passed_steps}/${report.summary.required_steps}`);
  lines.push(`- Allowed bootstrap failures: ${report.summary.allowed_failures}`);
  lines.push(`- Skipped steps: ${report.summary.skipped_steps}`);
  lines.push(`- Core sweep: ${report.summary.core_sweep_status}`);
  lines.push(`- Router: ${report.summary.router_status}`);
  lines.push(`- Worker boundary: ${report.summary.worker_boundary_status}`);
  lines.push(`- Owner handoff: ${report.summary.owner_handoff_status}`);
  lines.push(`- Innovation smoke: ${report.summary.innovation_smoke_status}`);
  lines.push(`- Orbit bridge: ${report.summary.orbit_bridge_status}`);
  lines.push(`- Source-root blocker: ${report.summary.source_root_blocker_status}`);
  lines.push(`- Private diagnostic allowed: ${report.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Night loop checkpoint: ${report.summary.night_loop_checkpoint_status}`);
  lines.push(`- Public-ready after loop: ${report.summary.public_ready_after_loop}`);
  lines.push('');
  lines.push('## Invariants');
  lines.push('');
  lines.push('| Invariant | Status | Evidence |');
  lines.push('| --- | --- | --- |');
  report.invariants.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${item.status} | ${escapePipe(item.evidence)} |`);
  });
  lines.push('');
  lines.push('## Steps');
  lines.push('');
  lines.push('| Step | Status | Required | Duration |');
  lines.push('| --- | --- | --- | ---: |');
  report.steps.forEach((item) => {
    lines.push(`| ${escapePipe(item.label)} | ${item.status} | ${item.required === false ? 'no' : 'yes'} | ${item.duration_ms}ms |`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}`;
}

function excerpt(value) {
  const normalized = String(value || '').trim();
  if (normalized.length <= 1600) return normalized;
  return normalized.slice(-1600);
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
