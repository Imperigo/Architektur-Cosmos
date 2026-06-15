#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const reportPath = resolve(root, args.report || 'examples/kosmo-prepare/phase1-adapter-fixture/prepare-phase1-adapter-report.json');
const outputJson = resolve(root, args.out || `data/kosmo-prepare-phase1-adapter-fixture-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-prepare-phase1-adapter-fixture-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const findings = checkReport(report);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const check = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'prepare_phase1_adapter_fixture_guard_passed' : 'prepare_phase1_adapter_fixture_guard_failed',
    policy: {
      validates_synthetic_fixture_only: true,
      reads_private_content: false,
      downloads_models_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, reportPath)],
    summary: {
      fixture_status: report.status,
      checks: report.checks?.length ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(check, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(check));

  console.log('KosmoPrepare phase 1 adapter fixture check');
  console.log(`Status: ${check.status}`);
  console.log(`Failures: ${check.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkReport(report) {
  const findings = [];
  expect(report.schema_version === '0.1', findings, 'schema_version', 'Report schema_version must be 0.1.');
  expect(report.status === 'prepare_phase1_adapter_fixture_ready', findings, 'fixture_ready', 'Adapter fixture must be ready.');
  expect(report.policy?.synthetic_fixture_only === true, findings, 'synthetic_only', 'Adapter fixture must be synthetic-only.');
  expect(report.policy?.reads_private_content === false, findings, 'no_private_reads', 'Adapter fixture must not read private content.');
  expect(report.policy?.downloads_models_now === false, findings, 'no_model_downloads', 'Adapter fixture must not download models.');
  expect(report.policy?.public_ready_after_fixture === 0, findings, 'public_ready_zero', 'Adapter fixture must keep public-ready at 0.');
  for (const [key, value] of Object.entries(report.outputs || {})) {
    expect(existsSync(resolve(root, value)), findings, `output_exists:${key}`, `${key} output must exist.`);
  }
  const markdownPath = resolve(root, report.outputs?.converted_markdown || '');
  const ifcManifestPath = resolve(root, report.outputs?.ifc_entity_manifest || '');
  const markdown = existsSync(markdownPath) ? readFileSync(markdownPath, 'utf8') : '';
  const ifcManifest = existsSync(ifcManifestPath) ? readFileSync(ifcManifestPath, 'utf8') : '';
  expect(markdown.includes('# KosmoPrepare Synthetic Fixture'), findings, 'markdown_heading', 'Converted markdown must include fixture heading.');
  expect(markdown.includes('Material system: timber frame'), findings, 'markdown_material', 'Converted markdown must include material line.');
  expect(ifcManifest.includes('IfcProject'), findings, 'ifc_project', 'IFC manifest must include IfcProject.');
  expect(ifcManifest.includes('IfcMaterial'), findings, 'ifc_material', 'IFC manifest must include IfcMaterial.');
  expect((report.checks || []).every((item) => item.status === 'passed'), findings, 'all_report_checks_passed', 'All report checks must pass.');
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(check) {
  const lines = [];
  lines.push('# KosmoPrepare Phase 1 Adapter Fixture Check');
  lines.push('');
  lines.push(`Generated: ${check.generated_at}`);
  lines.push(`Status: \`${check.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Fixture status: ${check.summary.fixture_status}`);
  lines.push(`- Checks: ${check.summary.checks}`);
  lines.push(`- Failures: ${check.summary.failures}`);
  lines.push(`- Public-ready after check: ${check.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  check.findings.forEach((finding) => lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`));
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
