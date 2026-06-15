#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const runPath = resolve(root, args.run || `data/kosmo-innovation-dependency-preflight-runner-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-dependency-preflight-runner-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-dependency-preflight-runner-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const run = JSON.parse(await readFile(runPath, 'utf8'));
  const findings = checkRun(run);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_dependency_preflight_runner_guard_passed' : 'innovation_dependency_preflight_runner_guard_failed',
    policy: {
      validates_local_availability_check_only: true,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, runPath)],
    summary: {
      run_status: run.status,
      dependency_groups: run.summary?.dependency_groups ?? null,
      available_groups: run.summary?.available_groups ?? null,
      checks: run.summary?.checks ?? null,
      passed_checks: run.summary?.passed_checks ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use unavailable groups as an install/download backlog, not as permission to install.',
          'Keep dependency installation and model downloads in a separate explicit batch.'
        ]
      : [
          'Fix runner guard failures.',
          'Rerun npm run kosmo:innovation-dependency-preflight-runner and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation dependency preflight runner check');
  console.log(`Status: ${report.status}`);
  console.log(`Available groups: ${report.summary.available_groups}/${report.summary.dependency_groups}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkRun(run) {
  const findings = [];
  expect(run.schema_version === '0.1', findings, 'schema_version', 'Run schema_version must be 0.1.');
  expect(run.status === 'innovation_dependency_preflight_run_completed', findings, 'run_completed', 'Dependency preflight run must complete.');
  expect(run.policy?.local_availability_check_only === true, findings, 'availability_only', 'Runner must be local-availability-check-only.');
  expect(run.policy?.whitelisted_commands_only === true, findings, 'whitelist_only', 'Runner must use whitelisted checks only.');
  expect(run.policy?.installs_dependencies_now === false, findings, 'no_installs', 'Runner must not install dependencies.');
  expect(run.policy?.downloads_models_now === false, findings, 'no_downloads', 'Runner must not download models.');
  expect(run.policy?.runs_tools_now === false, findings, 'no_tool_runs', 'Runner must not run innovation tools.');
  expect(run.policy?.reads_private_content === false, findings, 'no_private_reads', 'Runner must not read private content.');
  expect(run.policy?.public_ready_after_run === 0, findings, 'public_ready_zero', 'Runner must keep public-ready at 0.');
  expect(run.summary?.dependency_groups >= 7, findings, 'dependency_group_count', 'Runner must cover at least seven dependency groups.');
  expect(run.summary?.checks >= 12, findings, 'check_count', 'Runner must execute at least twelve local availability checks.');
  expect(run.summary?.failures === 0, findings, 'failures_zero', 'Runner structural failures must be 0.');
  for (const group of run.groups || []) {
    expect(group.installs_dependencies_now === false, findings, `group_no_installs:${group.id}`, `${group.id} must not install dependencies.`);
    expect(group.downloads_models_now === false, findings, `group_no_downloads:${group.id}`, `${group.id} must not download models.`);
    expect(group.runs_tools_now === false, findings, `group_no_tool_runs:${group.id}`, `${group.id} must not run tools.`);
    expect(group.reads_private_content === false, findings, `group_no_private_reads:${group.id}`, `${group.id} must not read private content.`);
    expect(group.public_ready_after_group === 0, findings, `group_public_ready_zero:${group.id}`, `${group.id} must keep public-ready at 0.`);
    expect((group.checks || []).length > 0, findings, `group_checks:${group.id}`, `${group.id} must include checks.`);
    for (const check of group.checks || []) {
      expect(['passed', 'unavailable'].includes(check.status), findings, `check_status:${group.id}:${check.id}`, `${check.id} must be passed or unavailable.`);
      expect(!/\bpip\s+install\b|\bnpm\s+install\b|\bhf\s+download\b|\bgit\s+clone\b/i.test(check.command_label || ''), findings, `check_no_install:${group.id}:${check.id}`, `${check.id} must not be an install/download/clone command.`);
    }
  }
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Dependency Preflight Runner Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Run status: ${report.summary.run_status}`);
  lines.push(`- Available groups: ${report.summary.available_groups}/${report.summary.dependency_groups}`);
  lines.push(`- Passed checks: ${report.summary.passed_checks}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`));
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
