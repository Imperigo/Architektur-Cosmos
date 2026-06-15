#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const smokePath = resolve(root, args.smoke || `data/kosmo-innovation-fixture-payload-smoke-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-fixture-payload-smoke-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-fixture-payload-smoke-check-${dateStamp}.md`);

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
    status: failures.length === 0 ? 'innovation_fixture_payload_smoke_guard_passed' : 'innovation_fixture_payload_smoke_guard_failed',
    policy: {
      validates_smoke_only: true,
      installs_tools_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      writes_public_files: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, smokePath)],
    summary: {
      smoke_status: smoke.status,
      payloads: smoke.summary?.payloads ?? null,
      content_types: smoke.summary?.content_types ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Add public-safe tool-shape smoke for document conversion and IFC entity extraction.',
          'Keep dependency installs and real tool execution gated separately.'
        ]
      : [
          'Fix payload smoke guard failures.',
          'Rerun npm run kosmo:innovation-fixture-payload-smoke and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation fixture payload smoke check');
  console.log(`Status: ${report.status}`);
  console.log(`Payloads: ${report.summary.payloads}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkSmoke(smoke) {
  const findings = [];
  expect(smoke.schema_version === '0.1', findings, 'schema_version', 'Smoke schema_version must be 0.1.');
  expect(smoke.status === 'innovation_fixture_payload_smoke_passed', findings, 'smoke_passed', 'Payload smoke must pass.');
  expect(smoke.policy?.reads_fixture_payloads_only === true, findings, 'fixture_payloads_only', 'Smoke must read fixture payloads only.');
  expect(smoke.policy?.installs_tools_now === false, findings, 'no_installs', 'Smoke must not install tools.');
  expect(smoke.policy?.runs_tools_now === false, findings, 'no_tool_runs', 'Smoke must not run tools.');
  expect(smoke.policy?.reads_private_content === false, findings, 'no_private_reads', 'Smoke must not read private content.');
  expect(smoke.policy?.public_ready_after_smoke === 0, findings, 'public_ready_zero', 'Smoke must keep public-ready at 0.');
  expect((smoke.summary?.payloads ?? 0) >= 18, findings, 'payload_count', 'Smoke must cover at least 18 payloads.');
  expect(smoke.summary?.content_types === smoke.summary?.required_content_types, findings, 'content_types_complete', 'Smoke must cover all required content types.');
  expect(smoke.summary?.failures === 0, findings, 'smoke_failures_zero', 'Smoke failures must be 0.');
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Fixture Payload Smoke Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Smoke status: ${report.summary.smoke_status}`);
  lines.push(`- Payloads: ${report.summary.payloads}`);
  lines.push(`- Content types: ${report.summary.content_types}`);
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
