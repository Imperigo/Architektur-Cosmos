#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const planPath = resolve(root, args.plan || `data/kosmo-innovation-github-fixture-contract-plan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-fixture-contract-plan-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-fixture-contract-plan-check-${dateStamp}.md`);

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
    status: failures.length === 0 ? 'innovation_github_fixture_contract_plan_guard_passed' : 'innovation_github_fixture_contract_plan_guard_failed',
    policy: {
      validates_plan_only: true,
      copies_github_code: false,
      reads_private_content: false,
      installs_or_downloads: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, planPath)],
    summary: {
      plan_status: plan.status,
      contract_plans: plan.summary?.contract_plans ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub fixture contract plan check');
  console.log(`Status: ${report.status}`);
  console.log(`Contract plans: ${report.summary.contract_plans}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPlan(plan) {
  const findings = [];
  const lanes = new Set((plan.contract_plans || []).map((item) => item.target_lane));
  expect(plan.schema_version === '0.1', findings, 'schema_version', 'Plan schema_version must be 0.1.');
  expect(plan.status === 'innovation_github_fixture_contract_plan_ready', findings, 'plan_ready', 'Plan must be ready.');
  expect(plan.policy?.plan_only === true, findings, 'plan_only', 'Plan must be plan-only.');
  expect(plan.policy?.synthetic_fixture_only === true, findings, 'synthetic_only', 'Plan must use synthetic fixtures only.');
  expect(plan.policy?.copies_github_code === false, findings, 'no_code_copy', 'Plan must not copy GitHub code.');
  expect(plan.policy?.stores_raw_readme_content === false, findings, 'no_raw_readme', 'Plan must not store raw README content.');
  expect(plan.policy?.clones_repositories_now === false, findings, 'no_clone', 'Plan must not clone repositories.');
  expect(plan.policy?.installs_dependencies_now === false, findings, 'no_install', 'Plan must not install dependencies.');
  expect(plan.policy?.downloads_models_now === false, findings, 'no_download', 'Plan must not download models.');
  expect(plan.policy?.runs_discovered_code_now === false, findings, 'no_run_code', 'Plan must not run discovered code.');
  expect(plan.policy?.reads_private_content === false, findings, 'no_private_reads', 'Plan must not read private content.');
  expect(plan.policy?.public_ready_after_plan === 0, findings, 'public_ready_zero', 'Plan must keep public-ready at 0.');
  expect((plan.contract_plans || []).length >= 3, findings, 'plan_count', 'Plan must include at least three contract plans.');
  ['kosmo_prepare', 'kosmo_asset', 'worker_integration'].forEach((lane) => {
    expect(lanes.has(lane), findings, `target_lane:${lane}`, `Plan must include ${lane}.`);
  });
  for (const item of plan.contract_plans || []) {
    const guards = (item.guard_requirements || []).join(' ').toLowerCase();
    expect(item.proposed_fixture_root?.startsWith('examples/kosmo-innovation-fixtures/'), findings, `fixture_root:${item.id}`, `${item.id} must stay under examples/kosmo-innovation-fixtures.`);
    expect(item.execute_now === false, findings, `execute_false:${item.id}`, `${item.id} must not execute now.`);
    expect(item.public_ready_after_plan === 0, findings, `public_ready_zero:${item.id}`, `${item.id} must keep public-ready at 0.`);
    expect(guards.includes('synthetic inputs only'), findings, `guard_synthetic:${item.id}`, `${item.id} must require synthetic inputs.`);
    expect(guards.includes('no github code copied'), findings, `guard_no_code:${item.id}`, `${item.id} must forbid copying GitHub code.`);
    expect(guards.includes('no readme text copied'), findings, `guard_no_readme:${item.id}`, `${item.id} must forbid copying README text.`);
    expect(guards.includes('no repository clone'), findings, `guard_no_clone:${item.id}`, `${item.id} must forbid repository clone.`);
    expect(guards.includes('no dependency install'), findings, `guard_no_install:${item.id}`, `${item.id} must forbid dependency install.`);
  }
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Fixture Contract Plan Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Plan status: ${report.summary.plan_status}`);
  lines.push(`- Contract plans: ${report.summary.contract_plans}`);
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
