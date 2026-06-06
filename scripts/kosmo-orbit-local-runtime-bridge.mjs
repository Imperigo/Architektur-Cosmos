#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const defaultStatusPath = 'examples/kosmo-orbit/runtime/kosmo-night-status.demo.json';
const statusPath = resolve(root, args.status || process.env.KOSMO_NIGHT_STATUS_JSON || defaultStatusPath);
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-local-runtime-bridge.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-local-runtime-bridge.generated.md');

const requiredLanes = [
  'odysseus-runtime',
  'kosmo-model',
  'desktop-artifacts',
  'home-pc-handover',
  'home-pc-start-readiness',
  'kosmo-orbit',
  'kosmo-orbit-render-smoke',
  'github-separation'
];

const requiredPolicies = [
  'no_publish',
  'no_external_accounts',
  'no_secrets_changes',
  'no_repo_mixing_without_approval',
  'dry_run_first'
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(statusPath)) throw new Error(`KOSMO night status not found: ${statusPath}`);

  const status = readJson(statusPath);
  const report = buildReport(status);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit local runtime bridge');
  console.log(`Status: ${report.status}`);
  console.log(`Progress: ${report.summary.progress_percent}%`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'local_runtime_bridge_passed') process.exit(1);
}

function buildReport(status) {
  const lanes = asArray(status.lanes);
  const laneIds = new Set(lanes.map((lane) => lane.id));
  const readyLanes = lanes.filter((lane) => lane.status === 'ready' || lane.ready === true);
  const githubLane = lanes.find((lane) => lane.id === 'github-separation');
  const blockedLanes = lanes.filter((lane) => lane.status === 'blocked');
  const policy = status.policy || {};
  const sources = status.sources_of_truth || {};
  const closeoutEvidence = status.closeout_aggregator?.evidence || {};
  const checks = [
    check('status_file_exists', 'Night status input file exists.', existsSync(statusPath)),
    check('schema_version', 'Night status schema version is 0.1.', status.schema_version === '0.1'),
    check('goal_present', 'Night status carries the KOSMO control-spine goal.', String(status.goal || '').includes('KOSMO local control spine')),
    check('progress_number', 'Progress percent is a valid number between 0 and 100.', Number.isFinite(status.progress_percent) && status.progress_percent >= 0 && status.progress_percent <= 100),
    check('progress_bar_present', 'Progress bar is present for UI handoff.', typeof status.progress_bar === 'string' && status.progress_bar.includes('%')),
    check('required_lanes_present', 'All KOSMO control-spine lanes are present.', requiredLanes.every((id) => laneIds.has(id))),
    check('ready_lane_majority', 'At least seven of eight lanes are ready.', readyLanes.length >= 7),
    check('runtime_ready', 'Odysseus runtime lane is ready.', lanes.some((lane) => lane.id === 'odysseus-runtime' && lane.status === 'ready')),
    check('model_ready', 'KOSMO Ollama model lane is ready.', lanes.some((lane) => lane.id === 'kosmo-model' && lane.status === 'ready')),
    check('handover_ready', 'Home-PC handover lane is ready.', lanes.some((lane) => lane.id === 'home-pc-handover' && lane.status === 'ready')),
    check('home_pc_start_ready', 'Home-PC start readiness lane is ready.', lanes.some((lane) => lane.id === 'home-pc-start-readiness' && lane.status === 'ready')),
    check('orbit_render_smoke_ready', 'Orbit local render smoke lane is ready and visible.', lanes.some((lane) => lane.id === 'kosmo-orbit-render-smoke' && lane.status === 'ready' && String(lane.evidence || '').includes('9/9'))),
    check('github_separation_blocked', 'GitHub separation remains blocked until a dedicated Starter repo or explicit import approval exists.', githubLane?.status === 'blocked'),
    check('github_import_readiness_visible', 'GitHub import readiness is visible while Owner-Go remains blocked.', String(githubLane?.evidence || '').includes('import_readiness=passed')),
    check('next_action_queue_visible', 'Next-action queue is visible for allowed, waiting and blocked work.', status.next_action_queue?.status === 'next_action_queue_ready' && asArray(status.next_action_queue.actions).length >= 4),
    check('runway_report_visible', 'Runway report is visible for Mac, Linux, Owner-Go and post-boot phases.', status.runway_report?.status === 'runway_report_ready' && asArray(status.runway_report.runway).length === 4),
    check('closeout_aggregator_visible', 'Closeout aggregator is visible as the Home-PC read order and final evidence packet.', status.closeout_aggregator?.status === 'closeout_aggregator_ready' && asArray(status.closeout_aggregator.read_order).length >= 5),
    check('loop_closeout_dashboard_visible', 'Loop closeout dashboard is visible with safest next action.', status.loop_closeout_dashboard?.status === 'loop_closeout_dashboard_ready' && status.loop_closeout_dashboard?.safest_next_action?.id === 'refresh-control-spine'),
    check('home_pc_doctor_visible', 'Home-PC handover doctor evidence is visible in the closeout packet.', String(status.closeout_aggregator?.evidence?.home_pc_handover_doctor || '') === 'home_pc_handover_doctor_passed'),
    check('home_pc_zip_smoke_visible', 'Home-PC ZIP smoke evidence and Start Card are visible in the closeout packet.', String(status.closeout_aggregator?.evidence?.home_pc_handover_zip_smoke || '') === 'home_pc_handover_zip_smoke_passed' && String(status.closeout_aggregator?.evidence?.home_pc_handover_zip_smoke_checks || '') === '19/19' && String(status.closeout_aggregator?.evidence?.home_pc_start_card || '').includes('KOSMO_HOME_PC_START_CARD.md')),
    check('orbit_render_smoke_closeout_visible', 'Orbit render smoke evidence is visible in the closeout packet.', String(status.closeout_aggregator?.evidence?.orbit_render_smoke || '') === 'orbit_local_render_smoke_passed' && String(status.closeout_aggregator?.evidence?.orbit_render_smoke_checks || '') === '9/9'),
    check('policy_flags_present', 'All safety policy flags are present and true.', requiredPolicies.every((key) => policy[key] === true)),
    check('sources_present', 'Local starter, cloud starter and Orbit website sources are represented.', Boolean(sources.local_starter && sources.cloud_starter && sources.orbit_website)),
    check('no_private_path_required', 'Bridge can run from a repo-local demo status without a private local path.', relative(root, statusPath).startsWith('examples/kosmo-orbit/runtime/') || Boolean(process.env.KOSMO_NIGHT_STATUS_JSON))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-local-runtime-bridge',
    status: failed.length ? 'local_runtime_bridge_blocked' : 'local_runtime_bridge_passed',
    input_status_file: relative(root, statusPath),
    mode: process.env.KOSMO_NIGHT_STATUS_JSON || args.status ? 'external_local_status_import' : 'repo_local_demo_status',
    policy: {
      review_only: true,
      no_runtime_actions: true,
      no_process_launches: true,
      no_model_starts: true,
      no_filesystem_scan: true,
      no_uploads: true,
      no_public_publish: true,
      no_external_accounts: true
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      progress_percent: status.progress_percent,
      ready_lanes: readyLanes.length,
      blocked_lanes: blockedLanes.length,
      open_blocker_count: blockedLanes.length
    },
    control_spine: {
      goal: status.goal,
      progress_bar: status.progress_bar,
      generated_at: status.generated_at
    },
    lanes: lanes.map((lane) => ({
      id: lane.id,
      label: lane.label,
      status: lane.status,
      evidence: lane.evidence,
      next_action: lane.next_action
    })),
    sources: {
      local_starter_commit: sources.local_starter?.commit || null,
      cloud_starter_commit: sources.cloud_starter?.commit || null,
      orbit_website_commit: sources.orbit_website?.commit || null
    },
    home_pc_handover: {
      platform: 'linux-workstation',
      zip_artifact: 'dist/KOSMO-home-pc-linux-handover.zip',
      checksum_artifact: 'dist/KOSMO-home-pc-linux-handover.zip.sha256',
      manifest_artifact: 'tmp/kosmo-home-pc-linux-handover-manifest.json',
      start_dry_run_script: 'scripts/kosmo-home-pc-start-dry-run.sh',
      start_dry_run_report: 'tmp/kosmo-home-pc-start-dry-run.json',
      start_dry_run_status: closeoutEvidence.home_pc_dry_run || 'home_pc_start_dry_run_passed',
      start_dry_run_checks: closeoutEvidence.home_pc_dry_run_checks || 'missing',
      doctor_script: 'scripts/kosmo-home-pc-handover-doctor.sh',
      doctor_report: closeoutEvidence.home_pc_handover_doctor_report || 'tmp/kosmo-home-pc-handover-doctor.json',
      doctor_status: closeoutEvidence.home_pc_handover_doctor || 'missing',
      doctor_checks: closeoutEvidence.home_pc_handover_doctor_checks || 'missing',
      zip_smoke_script: 'scripts/kosmo-home-pc-handover-zip-smoke.sh',
      zip_smoke_report: closeoutEvidence.home_pc_handover_zip_smoke_report || 'tmp/kosmo-home-pc-handover-zip-smoke.json',
      zip_smoke_status: closeoutEvidence.home_pc_handover_zip_smoke || 'missing',
      zip_smoke_checks: closeoutEvidence.home_pc_handover_zip_smoke_checks || 'missing',
      start_card: closeoutEvidence.home_pc_start_card || 'docs/home_station/KOSMO_HOME_PC_START_CARD.md',
      purpose: 'Machine-readable Linux handover index for the future Home-PC setup.',
      first_commands: [
        'shasum -a 256 -c KOSMO-home-pc-linux-handover.zip.sha256',
        'unzip KOSMO-home-pc-linux-handover.zip -d KOSMO-home-pc-linux-handover',
        'cd KOSMO-home-pc-linux-handover',
        './scripts/kosmo-home-pc-start-here.sh',
        './scripts/kosmo-home-pc-handover-index.sh',
        './scripts/kosmo-home-pc-handover-doctor.sh',
        './scripts/kosmo-home-pc-start-dry-run.sh',
        './scripts/kosmo-loop-refresh-evidence.sh',
        './scripts/kosmo-home-pc-handover-zip-smoke.sh',
        'less docs/home_station/KOSMO_HOME_PC_START_CARD.md',
        'less tmp/kosmo-home-pc-linux-first-run-plan.md',
        'less KOSMO-home-pc-linux-handover/tmp/kosmo-next-action-queue.md',
        'less KOSMO-home-pc-linux-handover/tmp/kosmo-runway-report.md',
        'less KOSMO-home-pc-linux-handover/tmp/kosmo-closeout-aggregator.md',
        'less KOSMO-home-pc-linux-handover/tmp/kosmo-night-status.md',
        'less KOSMO-home-pc-linux-handover/tmp/kosmo-home-pc-linux-handover-manifest.json'
      ]
    },
    next_action_queue: normalizeNextActionQueue(status.next_action_queue),
    runway_report: normalizeRunwayReport(status.runway_report),
    closeout_aggregator: normalizeCloseoutAggregator(status.closeout_aggregator),
    loop_closeout_dashboard: normalizeLoopCloseoutDashboard(status.loop_closeout_dashboard),
    github_separation_decision: {
      status: 'owner_go_required',
      recommended_repository: 'Imperigo/Architekturkosmos_Codex_Starter',
      first_import_branch: 'kosmo-starter-initial-import-20260606',
      website_repository: 'Imperigo/Architektur-Cosmos',
      import_readiness_status: String(githubLane?.evidence || '').includes('import_readiness=passed') ? 'github_import_readiness_passed' : 'missing_or_blocked',
      import_readiness_checks: '19/19',
      import_readiness_report: 'tmp/kosmo-github-import-readiness.json',
      evidence: githubLane?.evidence || 'Decision pack pending.',
      blocked_until: [
        'Dedicated Starter repository exists.',
        'Owner explicitly approves first import.',
        'First push uses a review branch, not main.',
        'Website repository remains separate.'
      ],
      forbidden_without_owner_go: [
        'create GitHub repository',
        'push to main',
        'push starter tree into website repository',
        'change secrets',
        'enable deployments'
      ]
    },
    checks,
    next_actions: asArray(status.next_three_implementation_steps)
  };
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Local Runtime Bridge',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Input: \`${report.input_status_file}\``,
    `Mode: \`${report.mode}\``,
    '',
    'Review-only bridge from the local KOSMO Night Status into KosmoOrbit. It reads a JSON snapshot and writes report artifacts only; it does not launch processes, start models, scan private files, upload, publish, access external accounts or spend money.',
    '',
    '## Summary',
    '',
    `- progress: \`${report.control_spine.progress_bar}\``,
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- ready lanes: ${report.summary.ready_lanes}`,
    `- blocked lanes: ${report.summary.blocked_lanes}`,
    '',
    '## Lanes',
    '',
    '| Lane | Status | Evidence | Next |',
    '| --- | --- | --- | --- |'
  ];

  report.lanes.forEach((lane) => {
    lines.push(`| \`${lane.id}\` | \`${lane.status}\` | ${escapePipe(lane.evidence)} | ${escapePipe(lane.next_action)} |`);
  });

  lines.push('', '## Sources', '');
  lines.push(`- local starter commit: \`${report.sources.local_starter_commit}\``);
  lines.push(`- cloud starter commit: \`${report.sources.cloud_starter_commit}\``);
  lines.push(`- Orbit website commit: \`${report.sources.orbit_website_commit}\``);

  lines.push('', '## Home PC Handover', '');
  lines.push(`- platform: \`${report.home_pc_handover.platform}\``);
  lines.push(`- zip: \`${report.home_pc_handover.zip_artifact}\``);
  lines.push(`- checksum: \`${report.home_pc_handover.checksum_artifact}\``);
  lines.push(`- manifest: \`${report.home_pc_handover.manifest_artifact}\``);
  lines.push(`- start dry-run script: \`${report.home_pc_handover.start_dry_run_script}\``);
  lines.push(`- start dry-run report: \`${report.home_pc_handover.start_dry_run_report}\``);
  lines.push(`- start dry-run status: \`${report.home_pc_handover.start_dry_run_status}\``);
  lines.push(`- start dry-run checks: \`${report.home_pc_handover.start_dry_run_checks}\``);
  lines.push(`- doctor script: \`${report.home_pc_handover.doctor_script}\``);
  lines.push(`- doctor report: \`${report.home_pc_handover.doctor_report}\``);
  lines.push(`- doctor status: \`${report.home_pc_handover.doctor_status}\``);
  lines.push(`- doctor checks: \`${report.home_pc_handover.doctor_checks}\``);
  lines.push(`- ZIP smoke script: \`${report.home_pc_handover.zip_smoke_script}\``);
  lines.push(`- ZIP smoke report: \`${report.home_pc_handover.zip_smoke_report}\``);
  lines.push(`- ZIP smoke status: \`${report.home_pc_handover.zip_smoke_status}\``);
  lines.push(`- ZIP smoke checks: \`${report.home_pc_handover.zip_smoke_checks}\``);
  lines.push(`- Start Card: \`${report.home_pc_handover.start_card}\``);
  lines.push(`- purpose: ${report.home_pc_handover.purpose}`);
  lines.push('', 'First commands:');
  report.home_pc_handover.first_commands.forEach((command) => lines.push(`- \`${command}\``));

  lines.push('', '## Next-Action Queue', '');
  lines.push(`- status: \`${report.next_action_queue.status}\``);
  lines.push(`- ready actions: ${report.next_action_queue.ready_actions}`);
  lines.push(`- blocked actions: ${report.next_action_queue.blocked_actions}`);
  lines.push('', '| Action | Lane | Status | Owner-Go | Autonomous |');
  lines.push('| --- | --- | --- | --- | --- |');
  report.next_action_queue.actions.forEach((action) => {
    lines.push(`| \`${action.id}\` | \`${action.lane}\` | \`${action.status}\` | \`${action.owner_go_required}\` | \`${action.autonomous_allowed}\` |`);
  });

  lines.push('', '## Runway Report', '');
  lines.push(`- status: \`${report.runway_report.status}\``);
  lines.push(`- phases: ${report.runway_report.phase_count}`);
  report.runway_report.runway.forEach((phase) => {
    lines.push(`- ${phase.title}: ${phase.intent}`);
  });

  lines.push('', '## Closeout Aggregator', '');
  lines.push(`- status: \`${report.closeout_aggregator.status}\``);
  lines.push(`- checks: ${report.closeout_aggregator.passed_checks}/${report.closeout_aggregator.check_count}`);
  lines.push(`- warnings: ${report.closeout_aggregator.warnings}`);
  lines.push(`- starter commit: \`${report.closeout_aggregator.current_state.starter_commit}\``);
  lines.push(`- orbit commit: \`${report.closeout_aggregator.current_state.orbit_commit}\``);
  lines.push(`- Home-PC dry-run: \`${report.closeout_aggregator.evidence.home_pc_dry_run}\` (${report.closeout_aggregator.evidence.home_pc_dry_run_checks})`);
  lines.push(`- Home-PC doctor: \`${report.closeout_aggregator.evidence.home_pc_handover_doctor}\` (${report.closeout_aggregator.evidence.home_pc_handover_doctor_checks})`);
  lines.push(`- Home-PC ZIP smoke: \`${report.closeout_aggregator.evidence.home_pc_handover_zip_smoke}\` (${report.closeout_aggregator.evidence.home_pc_handover_zip_smoke_checks})`);
  lines.push(`- Home-PC Start Card: \`${report.closeout_aggregator.evidence.home_pc_start_card}\``);
  lines.push(`- handover ZIP: \`${report.closeout_aggregator.evidence.handover_zip}\``);
  lines.push(`- handover checksum: \`${report.closeout_aggregator.evidence.handover_checksum}\``);
  lines.push('', 'Read order:');
  report.closeout_aggregator.read_order.forEach((item) => lines.push(`- \`${item}\``));
  lines.push('', 'Owner-Go blockers:');
  report.closeout_aggregator.owner_go_blockers.forEach((item) => lines.push(`- ${item}`));
  lines.push('', 'Forbidden actions:');
  report.closeout_aggregator.forbidden_actions.forEach((item) => lines.push(`- ${item}`));

  lines.push('', '## Loop Closeout Dashboard', '');
  lines.push(`- status: \`${report.loop_closeout_dashboard.status}\``);
  lines.push(`- checks: ${report.loop_closeout_dashboard.passed_checks}/${report.loop_closeout_dashboard.check_count}`);
  lines.push(`- progress: \`${report.loop_closeout_dashboard.progress}\``);
  lines.push(`- starter commit: \`${report.loop_closeout_dashboard.current_state.starter_commit}\``);
  lines.push(`- runtime bundle: \`${report.loop_closeout_dashboard.current_state.runtime_bundle}\``);
  lines.push(`- safest next action: \`${report.loop_closeout_dashboard.safest_next_action.id}\``);
  lines.push(`- command: \`${report.loop_closeout_dashboard.safest_next_action.command}\``);

  lines.push('', '## GitHub Separation Decision', '');
  lines.push(`- status: \`${report.github_separation_decision.status}\``);
  lines.push(`- recommended repository: \`${report.github_separation_decision.recommended_repository}\``);
  lines.push(`- first import branch: \`${report.github_separation_decision.first_import_branch}\``);
  lines.push(`- website repository: \`${report.github_separation_decision.website_repository}\``);
  lines.push(`- import readiness: \`${report.github_separation_decision.import_readiness_status}\``);
  lines.push(`- import readiness checks: \`${report.github_separation_decision.import_readiness_checks}\``);
  lines.push(`- import readiness report: \`${report.github_separation_decision.import_readiness_report}\``);
  lines.push(`- evidence: ${report.github_separation_decision.evidence}`);
  lines.push('', 'Blocked until:');
  report.github_separation_decision.blocked_until.forEach((item) => lines.push(`- ${item}`));
  lines.push('', 'Forbidden without Owner-Go:');
  report.github_separation_decision.forbidden_without_owner_go.forEach((item) => lines.push(`- ${item}`));

  lines.push('', '## Checks', '', '| Check | Status | Meaning |', '| --- | --- | --- |');
  report.checks.forEach((item) => lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`));

  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function check(id, label, passed) {
  return {
    id,
    label,
    status: passed ? 'passed' : 'failed'
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function normalizeNextActionQueue(queue) {
  const actions = asArray(queue?.actions).map((action) => ({
    id: action.id,
    title: action.title,
    lane: action.lane,
    priority: action.priority,
    status: action.status,
    mode: action.mode,
    command: action.command,
    evidence: action.evidence,
    owner_go_required: Boolean(action.owner_go_required),
    autonomous_allowed: Boolean(action.autonomous_allowed)
  }));

  return {
    status: queue?.status || 'missing',
    ready_actions: queue?.summary?.ready_actions ?? actions.filter((action) => action.status === 'ready').length,
    blocked_actions: queue?.summary?.blocked_actions ?? actions.filter((action) => action.status === 'blocked').length,
    actions
  };
}

function normalizeRunwayReport(runwayReport) {
  const runway = asArray(runwayReport?.runway).map((phase) => ({
    id: phase.id,
    title: phase.title,
    intent: phase.intent,
    items: asArray(phase.items).map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      next_step: item.next_step,
      evidence: item.evidence
    }))
  }));

  return {
    status: runwayReport?.status || 'missing',
    phase_count: runwayReport?.summary?.phase_count ?? runway.length,
    runway
  };
}

function normalizeCloseoutAggregator(closeout) {
  const currentState = closeout?.current_state || {};
  const evidence = closeout?.evidence || {};

  return {
    status: closeout?.status || 'missing',
    passed_checks: closeout?.summary?.passed_checks ?? 0,
    check_count: closeout?.summary?.check_count ?? 0,
    warnings: closeout?.summary?.warnings ?? 0,
    current_state: {
      starter_commit: currentState.starter_commit || null,
      orbit_commit: currentState.orbit_commit || null,
      night_progress: currentState.night_progress || null,
      ready_lanes: currentState.ready_lanes ?? null,
      blocked_lanes: currentState.blocked_lanes ?? null
    },
    evidence: {
      github_import: evidence.github_import || 'missing',
      first_run: evidence.first_run || 'missing',
      queue: evidence.queue || 'missing',
      runway: evidence.runway || 'missing',
      home_pc_dry_run: evidence.home_pc_dry_run || 'missing',
      home_pc_dry_run_checks: evidence.home_pc_dry_run_checks || 'missing',
      home_pc_handover_doctor: evidence.home_pc_handover_doctor || 'missing',
      home_pc_handover_doctor_checks: evidence.home_pc_handover_doctor_checks || 'missing',
      home_pc_handover_doctor_report: evidence.home_pc_handover_doctor_report || 'missing',
      home_pc_handover_zip_smoke: evidence.home_pc_handover_zip_smoke || 'missing',
      home_pc_handover_zip_smoke_checks: evidence.home_pc_handover_zip_smoke_checks || 'missing',
      home_pc_handover_zip_smoke_report: evidence.home_pc_handover_zip_smoke_report || 'missing',
      home_pc_start_card: evidence.home_pc_start_card || 'missing',
      handover_zip: evidence.handover_zip || 'missing',
      handover_checksum: evidence.handover_checksum || 'missing',
      runtime_bundle: evidence.runtime_bundle || 'missing',
      runtime_latest_zip: evidence.runtime_latest_zip || 'missing',
      orbit_review_branch: evidence.orbit_review_branch || 'missing',
      orbit_render_smoke: evidence.orbit_render_smoke || 'missing',
      orbit_render_smoke_checks: evidence.orbit_render_smoke_checks || 'missing',
      orbit_render_smoke_report: evidence.orbit_render_smoke_report || 'missing'
    },
    read_order: asArray(closeout?.read_order),
    owner_go_blockers: asArray(closeout?.owner_go_blockers),
    forbidden_actions: asArray(closeout?.forbidden_actions)
  };
}

function normalizeLoopCloseoutDashboard(dashboard) {
  const currentState = dashboard?.current_state || {};
  const evidence = dashboard?.evidence || {};
  const action = dashboard?.safest_next_action || {};

  return {
    status: dashboard?.status || 'missing',
    passed_checks: dashboard?.summary?.passed_checks ?? 0,
    check_count: dashboard?.summary?.check_count ?? 0,
    warnings: dashboard?.summary?.warnings ?? 0,
    progress: dashboard?.summary?.progress || null,
    current_state: {
      starter_commit: currentState.starter_commit || null,
      orbit_commit: currentState.orbit_commit || null,
      orbit_branch: currentState.orbit_branch || null,
      runtime_bundle: currentState.runtime_bundle || null,
      runtime_latest_zip: currentState.runtime_latest_zip || null,
      home_pc_handover_zip: currentState.home_pc_handover_zip || null,
      manifest_source_commit: currentState.manifest_source_commit || null
    },
    evidence: {
      night_status: evidence.night_status || 'missing',
      doctor: evidence.doctor || 'missing',
      dry_run: evidence.dry_run || 'missing',
      zip_smoke: evidence.zip_smoke || 'missing',
      start_card: evidence.start_card || 'missing',
      closeout: evidence.closeout || 'missing',
      orbit_render_smoke: evidence.orbit_render_smoke || 'missing',
      handover_checksum: evidence.handover_checksum || 'missing',
      latest_zip_checksum: evidence.latest_zip_checksum || 'missing'
    },
    safest_next_action: {
      id: action.id || 'missing',
      title: action.title || 'missing',
      command: action.command || 'missing',
      reason: action.reason || 'missing'
    },
    forbidden_without_owner_go: asArray(dashboard?.forbidden_without_owner_go)
  };
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
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
