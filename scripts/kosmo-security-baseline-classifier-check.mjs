#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const classifierPath = resolve(root, args.classifier || `data/kosmo-security-baseline-classifier-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-security-baseline-classifier-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-security-baseline-classifier-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const classifier = JSON.parse(await readFile(classifierPath, 'utf8'));
  const findings = checkClassifier(classifier);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'security_baseline_classifier_guard_passed' : 'security_baseline_classifier_guard_failed',
    policy: {
      validates_classifier_only: true,
      suppresses_findings_now: false,
      modifies_security_check_now: false,
      secrets_never_allowed: true,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, classifierPath)],
    summary: {
      classifier_status: classifier.status,
      personal_identifier_findings: classifier.summary?.personal_identifier_findings ?? null,
      secret_findings: classifier.summary?.secret_findings ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo security baseline classifier check');
  console.log(`Status: ${report.status}`);
  console.log(`Personal findings: ${report.summary.personal_identifier_findings}`);
  console.log(`Secret findings: ${report.summary.secret_findings}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkClassifier(classifier) {
  const findings = [];
  expect(classifier.schema_version === '0.1', findings, 'schema_version', 'Classifier schema_version must be 0.1.');
  expect(classifier.status === 'security_baseline_classifier_ready', findings, 'classifier_ready', 'Classifier must be ready.');
  expect(classifier.policy?.classifier_only === true, findings, 'classifier_only', 'Classifier must be classifier-only.');
  expect(classifier.policy?.suppresses_findings_now === false, findings, 'no_suppression_now', 'Classifier must not suppress findings.');
  expect(classifier.policy?.modifies_security_check_now === false, findings, 'no_security_check_patch', 'Classifier must not modify security check.');
  expect(classifier.policy?.secrets_never_allowed === true, findings, 'secrets_never_allowed', 'Classifier must keep secrets never allowed.');
  expect(classifier.policy?.redacts_identifier_values_in_output === true, findings, 'redacted_output', 'Classifier output must avoid identifier values.');
  expect(classifier.policy?.public_ready_after_classifier === 0, findings, 'public_ready_zero', 'Classifier must keep public-ready at 0.');
  expect(Number.isInteger(classifier.summary?.personal_identifier_findings), findings, 'personal_count_present', 'Classifier must count personal findings.');
  expect(Number.isInteger(classifier.summary?.secret_findings), findings, 'secret_count_present', 'Classifier must count secret findings.');
  expect(Array.isArray(classifier.top_files), findings, 'top_files_present', 'Classifier must include top files by count.');
  expect(Array.isArray(classifier.unclassified_files), findings, 'unclassified_files_present', 'Classifier must include unclassified files by count.');
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Security Baseline Classifier Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Classifier status: ${report.summary.classifier_status}`);
  lines.push(`- Personal identifier findings: ${report.summary.personal_identifier_findings}`);
  lines.push(`- Secret findings: ${report.summary.secret_findings}`);
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
