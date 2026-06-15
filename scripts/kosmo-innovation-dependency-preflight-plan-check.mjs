#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const planPath = resolve(root, args.plan || `data/kosmo-innovation-dependency-preflight-plan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-dependency-preflight-plan-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-dependency-preflight-plan-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const findings = checkPlan(plan);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_dependency_preflight_plan_guard_passed' : 'innovation_dependency_preflight_plan_guard_failed',
    policy: {
      validates_plan_only: true,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, planPath)],
    summary: {
      plan_status: plan.status,
      dependency_groups: plan.summary?.dependency_groups ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use this plan as the dependency gate map.',
          'Do not install/download from this plan; create a separate explicit preflight run script when needed.'
        ]
      : [
          'Fix dependency preflight plan guard failures.',
          'Rerun npm run kosmo:innovation-dependency-preflight-plan and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation dependency preflight plan check');
  console.log(`Status: ${report.status}`);
  console.log(`Dependency groups: ${report.summary.dependency_groups}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPlan(plan) {
  const findings = [];
  expect(plan.schema_version === '0.1', findings, 'schema_version', 'Plan schema_version must be 0.1.');
  expect(plan.status === 'innovation_dependency_preflight_plan_ready', findings, 'plan_ready', 'Dependency preflight plan must be ready.');
  expect(plan.policy?.plan_only === true, findings, 'plan_only', 'Plan must be plan-only.');
  expect(plan.policy?.installs_dependencies_now === false, findings, 'no_installs', 'Plan must not install dependencies.');
  expect(plan.policy?.downloads_models_now === false, findings, 'no_downloads', 'Plan must not download models.');
  expect(plan.policy?.runs_tools_now === false, findings, 'no_tool_runs', 'Plan must not run tools.');
  expect(plan.policy?.reads_private_content === false, findings, 'no_private_reads', 'Plan must not read private content.');
  expect(plan.policy?.public_ready_after_plan === 0, findings, 'public_ready_zero', 'Plan must keep public-ready at 0.');
  expect((plan.dependency_groups || []).length >= 6, findings, 'dependency_group_count', 'Plan must include at least six dependency groups.');
  expect(plan.summary?.executable_now === 0, findings, 'executable_zero', 'Plan executable_now must be 0.');
  for (const group of plan.dependency_groups || []) {
    expect(group.allowed_now === false, findings, `allowed_now_false:${group.id}`, `${group.id} must not be allowed now.`);
    expect(group.requires_manual_dependency_gate === true, findings, `manual_gate:${group.id}`, `${group.id} must require manual dependency gate.`);
    expect(group.private_content_allowed_after_preflight === false, findings, `private_after_preflight_false:${group.id}`, `${group.id} must not allow private content after preflight.`);
    expect(group.public_ready_after_group === 0, findings, `public_ready_zero:${group.id}`, `${group.id} must keep public-ready at 0.`);
    expect((group.preflight_commands || []).length > 0, findings, `commands_present:${group.id}`, `${group.id} must define command templates.`);
    const commands = (group.preflight_commands || []).join(' ');
    expect(!/\bpip\s+install\b|\bnpm\s+install\b|\bhf\s+download\b|\bgit\s+clone\b/i.test(commands), findings, `no_install_commands:${group.id}`, `${group.id} command templates must not install, clone or download.`);
  }
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Dependency Preflight Plan Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Plan status: ${report.summary.plan_status}`);
  lines.push(`- Dependency groups: ${report.summary.dependency_groups}`);
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
