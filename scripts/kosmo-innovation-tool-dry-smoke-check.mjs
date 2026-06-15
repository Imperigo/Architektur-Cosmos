#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const smokePath = resolve(root, args.smoke || `data/kosmo-innovation-tool-dry-smoke-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-tool-dry-smoke-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-tool-dry-smoke-check-${dateStamp}.md`);

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
    status: failures.length === 0 ? 'innovation_tool_dry_smoke_guard_passed' : 'innovation_tool_dry_smoke_guard_failed',
    policy: {
      validates_dry_smoke_only: true,
      installs_tools_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      writes_public_files: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, smokePath)],
    summary: {
      smoke_status: smoke.status,
      tool_lanes: smoke.summary?.tool_lanes ?? null,
      passed_lanes: smoke.summary?.passed_lanes ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Prepare dependency preflight contracts for the highest-priority lanes.',
          'Do not install or execute external tools until a separate dependency gate is accepted.'
        ]
      : [
          'Fix tool dry smoke guard failures.',
          'Rerun npm run kosmo:innovation-tool-dry-smoke and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation tool dry smoke check');
  console.log(`Status: ${report.status}`);
  console.log(`Tool lanes: ${report.summary.passed_lanes}/${report.summary.tool_lanes}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkSmoke(smoke) {
  const findings = [];
  expect(smoke.schema_version === '0.1', findings, 'schema_version', 'Smoke schema_version must be 0.1.');
  expect(smoke.status === 'innovation_tool_dry_smoke_passed', findings, 'dry_smoke_passed', 'Tool dry smoke must pass.');
  expect(smoke.policy?.dry_smoke_only === true, findings, 'dry_smoke_only', 'Smoke must be dry-smoke-only.');
  expect(smoke.policy?.reads_fixture_payloads_only === true, findings, 'fixture_payloads_only', 'Smoke must read fixture payloads only.');
  expect(smoke.policy?.installs_tools_now === false, findings, 'no_installs', 'Smoke must not install tools.');
  expect(smoke.policy?.runs_tools_now === false, findings, 'no_tool_runs', 'Smoke must not run tools.');
  expect(smoke.policy?.reads_private_content === false, findings, 'no_private_reads', 'Smoke must not read private content.');
  expect(smoke.policy?.runs_private_ocr === false, findings, 'no_private_ocr', 'Smoke must not run private OCR.');
  expect(smoke.policy?.runs_embeddings_on_private_content === false, findings, 'no_private_embeddings', 'Smoke must not run private embeddings.');
  expect(smoke.policy?.public_ready_after_smoke === 0, findings, 'public_ready_zero', 'Smoke must keep public-ready at 0.');
  expect(smoke.summary?.tool_lanes === 8, findings, 'tool_lane_count', 'Smoke must cover eight tool lanes.');
  expect(smoke.summary?.passed_lanes === smoke.summary?.tool_lanes, findings, 'all_lanes_passed', 'All tool lanes must pass.');
  expect(smoke.summary?.payloads_read >= 18, findings, 'payload_count', 'Smoke must read at least 18 payloads.');
  expect(smoke.summary?.executable_now === 0, findings, 'executable_zero', 'Smoke executable_now must be 0.');
  expect(smoke.summary?.failures === 0, findings, 'failures_zero', 'Smoke failures must be 0.');
  for (const lane of smoke.tool_lanes || []) {
    expect(lane.status === 'passed', findings, `lane_passed:${lane.id}`, `${lane.id} must pass.`);
    expect((lane.payloads || []).length > 0, findings, `lane_payloads:${lane.id}`, `${lane.id} must include payloads.`);
    expect(lane.public_ready_after_lane === 0, findings, `lane_public_ready_zero:${lane.id}`, `${lane.id} must keep public-ready at 0.`);
  }
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Tool Dry Smoke Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Smoke status: ${report.summary.smoke_status}`);
  lines.push(`- Tool lanes: ${report.summary.passed_lanes}/${report.summary.tool_lanes}`);
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
