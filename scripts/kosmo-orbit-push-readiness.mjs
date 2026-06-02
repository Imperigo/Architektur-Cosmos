#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-push-readiness.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-push-readiness.generated.md');

const reportPaths = {
  route_smoke: 'examples/kosmo-orbit/review/orbit-route-smoke.generated.json',
  static_smoke: 'examples/kosmo-orbit/review/orbit-static-export-smoke.generated.json',
  full_review: 'examples/kosmo-orbit/review/orbit-full-review.generated.json',
  atlas_static_smoke: 'examples/kosmo-data/review/atlas-static-export-smoke.generated.json'
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const report = buildReport();

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit push readiness');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_push_readiness_review_only') process.exit(1);
}

function buildReport() {
  const branch = git(['branch', '--show-current']).trim();
  const statusShort = git(['status', '--short']).trim();
  const aheadCount = Number(git(['rev-list', '--count', 'origin/main..HEAD']).trim() || 0);
  const hasUnpushedCommits = aheadCount > 0;
  const reports = Object.fromEntries(
    Object.entries(reportPaths).map(([key, path]) => [key, readJson(path)])
  );
  const commandEvidence = [
    commandCheck('git_diff_check', 'git diff --check has no whitespace errors.', 'git', ['diff', '--check']),
    commandCheck('lint_zero_warnings', 'ESLint passes with zero warnings.', 'npm', ['run', 'lint']),
    commandCheck('typescript_no_emit', 'TypeScript no-emit check passes.', resolve(root, 'node_modules/.bin/tsc'), ['--noEmit', '--pretty', 'false', '--incremental', 'false'])
  ];

  const checks = [
    check('on_main', 'Current branch is main.', branch === 'main'),
    check('ahead_of_origin', 'Local main has commits waiting for explicit push go.', hasUnpushedCommits),
    check('worktree_clean', 'Worktree is clean before any push decision.', statusShort.length === 0),
    check('route_smoke_green', 'KosmoOrbit route smoke is green.', reports.route_smoke?.status === 'orbit_route_smoke_passed'),
    check('static_smoke_green', 'KosmoOrbit static export smoke is green.', reports.static_smoke?.status === 'orbit_static_export_smoke_passed'),
    check('full_review_green', 'KosmoOrbit full review is green.', reports.full_review?.status === 'orbit_full_review_ready_for_review_mode'),
    check('atlas_static_smoke_green', 'KosmoData atlas static export smoke is green.', reports.atlas_static_smoke?.status === 'atlas_static_export_smoke_passed'),
    ...commandEvidence.map((item) => check(item.id, item.label, item.status === 'passed')),
    check('owner_gate_required', 'Push remains blocked until explicit Owner-Go.', true),
    check('no_live_action_taken', 'This report does not push, deploy, upload or call external accounts.', true)
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-push-readiness',
    status: failed.length ? 'orbit_push_readiness_blocked' : 'orbit_push_readiness_review_only',
    git: {
      branch,
      remote: 'origin/main',
      has_unpushed_commits: hasUnpushedCommits,
      worktree_clean: statusShort.length === 0,
      status_short: statusShort
    },
    evidence: {
      route_smoke: summarizeReport(reports.route_smoke),
      static_smoke: summarizeReport(reports.static_smoke),
      full_review: summarizeReport(reports.full_review),
      atlas_static_smoke: summarizeReport(reports.atlas_static_smoke),
      commands: commandEvidence
    },
    decision: {
      local_demo_ready: failed.length === 0,
      push_ready_if_owner_go: failed.length === 0,
      push_blocked_without_owner_go: true,
      recommended_next_options: [
        'Owner-Go einholen und main pushen, danach Cloudflare Deploy und Live-Smoke pruefen.',
        'Weiter lokal halten und den Buero-Pilot mit anonymisiertem Projektpaket starten.',
        'KosmoDesign V2 Review Mode vertiefen, ohne Design-Generation freizuschalten.'
      ]
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length
    },
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Resolve push readiness check: ${item.id}`)
      : [
          'Do not push automatically; wait for explicit Push/Live/Deploy-Go.',
          'If Go is given, push main and run a live smoke with a cache-buster.',
          'If Go is not given, use this as the local demo decision record.'
        ]
  };
}

function summarizeReport(report) {
  if (!report) return null;
  return {
    status: report.status,
    passed_checks: report.summary?.passed_checks ?? null,
    check_count: report.summary?.check_count ?? null,
    failed_checks: report.summary?.failed_checks ?? null
  };
}

function check(id, label, passed) {
  return {
    id,
    label,
    status: passed ? 'passed' : 'failed'
  };
}

function commandCheck(id, label, command, commandArgs) {
  const displayCommand = [commandLabel(command), ...commandArgs].join(' ');
  try {
    const output = execFileSync(command, commandArgs, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 8,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return {
      id,
      label,
      command: displayCommand,
      status: 'passed',
      output_excerpt: outputExcerpt(output)
    };
  } catch (error) {
    return {
      id,
      label,
      command: displayCommand,
      status: 'failed',
      output_excerpt: outputExcerpt(`${error.stdout ?? ''}\n${error.stderr ?? ''}`)
    };
  }
}

function commandLabel(command) {
  if (command.startsWith(root)) return relative(root, command);
  return command;
}

function outputExcerpt(value) {
  const lines = String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(-6).join(' | ');
}

function readJson(path) {
  const fullPath = resolve(root, path);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, 'utf8'));
}

function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8
  });
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Push Readiness',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'This is a local review-only push decision report. It does not push, deploy, upload, spend money or call external accounts.',
    '',
    '## Git',
    '',
    `- branch: \`${report.git.branch}\``,
    `- remote: \`${report.git.remote}\``,
    `- has unpushed commits: ${report.git.has_unpushed_commits ? 'yes' : 'no'}`,
    `- worktree clean: ${report.git.worktree_clean ? 'yes' : 'no'}`,
    '',
    '## Evidence',
    '',
    '| Report | Status | Checks |',
    '| --- | --- | --- |'
  ];

  Object.entries(report.evidence).forEach(([key, value]) => {
    if (key === 'commands') return;
    lines.push(`| \`${key}\` | \`${value?.status ?? 'missing'}\` | ${value?.passed_checks ?? '-'} / ${value?.check_count ?? '-'} |`);
  });

  lines.push('', '## Command Evidence', '', '| Command | Status | Output |', '| --- | --- | --- |');
  report.evidence.commands.forEach((item) => {
    lines.push(`| \`${escapePipe(item.command)}\` | \`${item.status}\` | ${escapePipe(item.output_excerpt || 'no output')} |`);
  });

  lines.push('', '## Checks', '', '| Check | Status | Meaning |', '| --- | --- | --- |');
  report.checks.forEach((item) => {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`);
  });

  lines.push('', '## Decision', '');
  lines.push(`- local demo ready: ${report.decision.local_demo_ready ? 'yes' : 'no'}`);
  lines.push(`- push ready if Owner-Go: ${report.decision.push_ready_if_owner_go ? 'yes' : 'no'}`);
  lines.push(`- push blocked without Owner-Go: ${report.decision.push_blocked_without_owner_go ? 'yes' : 'no'}`);
  lines.push('', '## Recommended Next Options', '');
  report.decision.recommended_next_options.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}
