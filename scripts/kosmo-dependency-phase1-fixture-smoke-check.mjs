#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const smokePath = resolve(root, args.smoke || `data/kosmo-dependency-phase1-fixture-smoke-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-dependency-phase1-fixture-smoke-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-dependency-phase1-fixture-smoke-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const smoke = JSON.parse(await readFile(smokePath, 'utf8'));
  const findings = checkSmoke(smoke);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'dependency_phase1_fixture_smoke_guard_passed' : 'dependency_phase1_fixture_smoke_guard_failed',
    policy: {
      validates_fixture_only: true,
      downloads_models_now: false,
      reads_private_content: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, smokePath)],
    summary: {
      smoke_status: smoke.status,
      checks: smoke.summary?.checks ?? null,
      passed_checks: smoke.summary?.passed_checks ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo dependency phase 1 fixture smoke check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkSmoke(smoke) {
  const findings = [];
  expect(smoke.schema_version === '0.1', findings, 'schema_version', 'Smoke schema_version must be 0.1.');
  expect(smoke.status === 'dependency_phase1_fixture_smoke_passed', findings, 'smoke_passed', 'Smoke must pass.');
  expect(smoke.policy?.fixture_only === true, findings, 'fixture_only', 'Smoke must be fixture-only.');
  expect(smoke.policy?.uses_synthetic_inputs_only === true, findings, 'synthetic_only', 'Smoke must use synthetic inputs only.');
  expect(smoke.policy?.downloads_models_now === false, findings, 'no_model_downloads', 'Smoke must not download models.');
  expect(smoke.policy?.reads_private_content === false, findings, 'no_private_reads', 'Smoke must not read private content.');
  expect(smoke.policy?.runs_private_ocr === false, findings, 'no_private_ocr', 'Smoke must not run private OCR.');
  expect(smoke.policy?.runs_embeddings_on_private_content === false, findings, 'no_private_embeddings', 'Smoke must not run embeddings on private content.');
  expect(smoke.policy?.public_ready_after_smoke === 0, findings, 'public_ready_zero', 'Smoke must keep public-ready at 0.');
  expect(smoke.summary?.checks === 5, findings, 'check_count', 'Smoke must include five checks.');
  expect(smoke.summary?.passed_checks === smoke.summary?.checks, findings, 'all_passed', 'All smoke checks must pass.');
  for (const check of smoke.checks || []) {
    expect(check.status === 'passed', findings, `check_passed:${check.id}`, `${check.id} must pass.`);
    expect(check.reads_private_content === false, findings, `check_no_private:${check.id}`, `${check.id} must not read private content.`);
    expect(check.public_ready_after_check === 0, findings, `check_public_ready_zero:${check.id}`, `${check.id} must keep public-ready at 0.`);
  }
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Dependency Phase 1 Fixture Smoke Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Smoke status: ${report.summary.smoke_status}`);
  lines.push(`- Checks: ${report.summary.passed_checks}/${report.summary.checks}`);
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
