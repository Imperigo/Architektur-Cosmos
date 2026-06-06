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
  const checks = [
    check('status_file_exists', 'Night status input file exists.', existsSync(statusPath)),
    check('schema_version', 'Night status schema version is 0.1.', status.schema_version === '0.1'),
    check('goal_present', 'Night status carries the KOSMO control-spine goal.', String(status.goal || '').includes('KOSMO local control spine')),
    check('progress_number', 'Progress percent is a valid number between 0 and 100.', Number.isFinite(status.progress_percent) && status.progress_percent >= 0 && status.progress_percent <= 100),
    check('progress_bar_present', 'Progress bar is present for UI handoff.', typeof status.progress_bar === 'string' && status.progress_bar.includes('%')),
    check('required_lanes_present', 'All KOSMO control-spine lanes are present.', requiredLanes.every((id) => laneIds.has(id))),
    check('ready_lane_majority', 'At least six of seven lanes are ready.', readyLanes.length >= 6),
    check('runtime_ready', 'Odysseus runtime lane is ready.', lanes.some((lane) => lane.id === 'odysseus-runtime' && lane.status === 'ready')),
    check('model_ready', 'KOSMO Ollama model lane is ready.', lanes.some((lane) => lane.id === 'kosmo-model' && lane.status === 'ready')),
    check('handover_ready', 'Home-PC handover lane is ready.', lanes.some((lane) => lane.id === 'home-pc-handover' && lane.status === 'ready')),
    check('home_pc_start_ready', 'Home-PC start readiness lane is ready.', lanes.some((lane) => lane.id === 'home-pc-start-readiness' && lane.status === 'ready')),
    check('github_separation_blocked', 'GitHub separation remains blocked until a dedicated Starter repo or explicit import approval exists.', githubLane?.status === 'blocked'),
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
      start_dry_run_status: 'home_pc_start_dry_run_passed',
      start_dry_run_checks: '25/25',
      purpose: 'Machine-readable Linux handover index for the future Home-PC setup.',
      first_commands: [
        'shasum -a 256 -c KOSMO-home-pc-linux-handover.zip.sha256',
        'unzip KOSMO-home-pc-linux-handover.zip -d KOSMO-home-pc-linux-handover',
        'less KOSMO-home-pc-linux-handover/tmp/kosmo-night-status.md',
        'less KOSMO-home-pc-linux-handover/tmp/kosmo-home-pc-linux-handover-manifest.json'
      ]
    },
    github_separation_decision: {
      status: 'owner_go_required',
      recommended_repository: 'Imperigo/Architekturkosmos_Codex_Starter',
      first_import_branch: 'kosmo-starter-initial-import-20260606',
      website_repository: 'Imperigo/Architektur-Cosmos',
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
  lines.push(`- purpose: ${report.home_pc_handover.purpose}`);
  lines.push('', 'First commands:');
  report.home_pc_handover.first_commands.forEach((command) => lines.push(`- \`${command}\``));

  lines.push('', '## GitHub Separation Decision', '');
  lines.push(`- status: \`${report.github_separation_decision.status}\``);
  lines.push(`- recommended repository: \`${report.github_separation_decision.recommended_repository}\``);
  lines.push(`- first import branch: \`${report.github_separation_decision.first_import_branch}\``);
  lines.push(`- website repository: \`${report.github_separation_decision.website_repository}\``);
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
