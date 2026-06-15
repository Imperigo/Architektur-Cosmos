#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const payloadsPath = resolve(root, args.payloads || `data/kosmo-innovation-fixture-payloads-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-fixture-payloads-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-fixture-payloads-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const payloads = JSON.parse(await readFile(payloadsPath, 'utf8'));
  const findings = await checkPayloads(payloads);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_fixture_payloads_guard_passed' : 'innovation_fixture_payloads_guard_failed',
    policy: {
      validates_payloads_only: true,
      installs_tools_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      writes_public_files: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, payloadsPath)],
    summary: {
      payloads_status: payloads.status,
      payloads_checked: payloads.written_payloads?.length ?? 0,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Create isolated smoke readers for fixture payload shape.',
          'Keep dependency installation separate and explicit.',
          'Do not run private OCR, embeddings or training.'
        ]
      : [
          'Fix fixture payload guard failures.',
          'Rerun npm run kosmo:innovation-fixture-payloads and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation fixture payloads check');
  console.log(`Status: ${report.status}`);
  console.log(`Payloads checked: ${report.summary.payloads_checked}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

async function checkPayloads(report) {
  const findings = [];
  expect(report.schema_version === '0.1', findings, 'schema_version', 'Payload report schema_version must be 0.1.');
  expect(report.status === 'innovation_fixture_payloads_ready', findings, 'payloads_ready', 'Payload report must be ready.');
  expect(report.policy?.generated_payloads_only === true, findings, 'generated_payloads_only', 'Report must be generated-payloads-only.');
  expect(report.policy?.installs_tools_now === false, findings, 'no_installs', 'Report must not install tools.');
  expect(report.policy?.runs_tools_now === false, findings, 'no_tool_runs', 'Report must not run tools.');
  expect(report.policy?.reads_private_content === false, findings, 'no_private_reads', 'Report must not read private content.');
  expect(report.policy?.public_ready_after_payloads === 0, findings, 'public_ready_zero', 'Report must keep public-ready at 0.');
  expect((report.written_payloads || []).length >= 18, findings, 'payload_count', 'Report must include at least 18 payloads.');
  for (const file of report.written_payloads || []) {
    expect(file.startsWith('examples/kosmo-innovation-fixtures/'), findings, `payload_root:${file}`, `${file} must stay under examples/kosmo-innovation-fixtures.`);
    expect(file.endsWith('.fixture.json'), findings, `payload_extension:${file}`, `${file} must use .fixture.json extension.`);
    expect(await exists(resolve(root, file)), findings, `payload_exists:${file}`, `${file} must exist.`);
    const payload = JSON.parse(await readFile(resolve(root, file), 'utf8'));
    expect(payload.status === 'generated_public_safe_fixture_payload', findings, `payload_status:${file}`, `${file} must be generated public-safe payload.`);
    expect(payload.policy?.private_content === false, findings, `payload_no_private:${file}`, `${file} must declare no private content.`);
    expect(payload.policy?.tool_output === false, findings, `payload_not_tool_output:${file}`, `${file} must not claim to be tool output.`);
    expect(payload.policy?.public_ready === false, findings, `payload_public_ready_false:${file}`, `${file} must keep public_ready false.`);
    expect(payload.policy?.public_ready_after_payload === 0, findings, `payload_public_ready_zero:${file}`, `${file} must keep public-ready after payload at 0.`);
    expect(payload.expected_review?.human_review_required_before_training === true, findings, `payload_human_review:${file}`, `${file} must require human review before training.`);
  }
  return findings;
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Fixture Payloads Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Payloads status: ${report.summary.payloads_status}`);
  lines.push(`- Payloads checked: ${report.summary.payloads_checked}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => {
    lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`);
  });
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
