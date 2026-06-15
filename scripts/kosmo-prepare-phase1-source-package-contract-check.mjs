#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const packagePath = resolve(root, args.package || `examples/kosmo-references/source-packages/kosmo-prepare-phase1-adapter-fixture-${dateStamp}/source-package.json`);
const sourcePackageCheckPath = resolve(root, args.sourcePackageCheck || 'scripts/kosmo-source-package-check.mjs');
const outputJson = resolve(root, args.out || `data/kosmo-prepare-phase1-source-package-contract-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-prepare-phase1-source-package-contract-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const manifest = JSON.parse(await readFile(packagePath, 'utf8'));
  const findings = checkManifest(manifest);
  const packageCheck = runSourcePackageCheck();
  if (packageCheck.status !== 0) {
    findings.push({
      id: 'source_package_checker_passes',
      severity: 'failure',
      message: 'kosmo-source-package-check must pass with --strict-artifacts.',
      detail: packageCheck.stderr || packageCheck.stdout
    });
  } else {
    findings.push({
      id: 'source_package_checker_passes',
      severity: 'passed',
      message: 'kosmo-source-package-check passed with --strict-artifacts.'
    });
  }

  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'prepare_phase1_source_package_contract_guard_passed'
      : 'prepare_phase1_source_package_contract_guard_failed',
    policy: {
      validates_synthetic_source_package: true,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_ocr: false,
      runs_embeddings_on_private_content: false,
      runs_fine_tuning: false,
      public_ready_after_check: 0
    },
    source_refs: [
      relative(root, packagePath),
      relative(root, sourcePackageCheckPath)
    ],
    summary: {
      package_id: manifest.package_id,
      package_status: manifest.status,
      rights_scope: manifest.rights_scope,
      sources: manifest.sources?.length ?? 0,
      artifacts: manifest.extraction_artifacts?.length ?? 0,
      review_gates: manifest.review_gates?.length ?? 0,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    checker_stdout: packageCheck.stdout.trim().split('\n').slice(-8)
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('KosmoPrepare phase 1 source package contract check');
  console.log(`Status: ${report.status}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Package: ${relative(root, packagePath)}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkManifest(manifest) {
  const findings = [];
  expect(manifest.schema_version === '0.1', findings, 'schema_version', 'Manifest schema_version must be 0.1.');
  expect(manifest.status === 'adapter_contract_ready', findings, 'status_adapter_contract_ready', 'Manifest must be adapter_contract_ready.');
  expect(manifest.rights_scope === 'synthetic_fixture', findings, 'rights_scope_synthetic', 'Manifest rights_scope must be synthetic_fixture.');
  expect(manifest.public_policy?.source_files_public === false, findings, 'source_files_not_public', 'Source files must not be marked public.');
  expect(manifest.public_policy?.extracted_text_public === false, findings, 'extracted_text_not_public', 'Extracted text must not be marked public.');
  expect(manifest.public_policy?.derived_summary_public === false, findings, 'derived_summary_not_public', 'Derived summary must not be marked public for this contract.');
  expect(Array.isArray(manifest.sources) && manifest.sources.length === 1, findings, 'one_source', 'Contract should have exactly one synthetic source file.');
  expect(Array.isArray(manifest.extraction_artifacts) && manifest.extraction_artifacts.length >= 4, findings, 'artifact_minimum', 'Contract should include markdown, IFC manifest and report artifacts.');
  expect((manifest.review_gates || []).length === 7, findings, 'review_gate_count', 'Contract must include all seven source package gates.');
  expect((manifest.candidate_projects || [])[0]?.promotion_status === 'adapter_contract_only', findings, 'promotion_adapter_only', 'Candidate must remain adapter_contract_only.');
  expect((manifest.next_actions || []).some((action) => action.includes('source-package-check')), findings, 'next_action_checker', 'Next actions must include source-package-check.');
  return findings;
}

function runSourcePackageCheck() {
  return spawnSync('node', [
    relative(root, sourcePackageCheckPath),
    '--package',
    relative(root, packagePath),
    '--strict-artifacts'
  ], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
    shell: false
  });
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoPrepare Phase 1 Source Package Contract Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Package: ${report.summary.package_id}`);
  lines.push(`- Package status: ${report.summary.package_status}`);
  lines.push(`- Rights scope: ${report.summary.rights_scope}`);
  lines.push(`- Sources: ${report.summary.sources}`);
  lines.push(`- Artifacts: ${report.summary.artifacts}`);
  lines.push(`- Review gates: ${report.summary.review_gates}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`));
  lines.push('');
  lines.push('## Source Package Checker');
  lines.push('');
  report.checker_stdout.forEach((line) => lines.push(`- ${line}`));
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
