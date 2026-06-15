#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const smokePath = resolve(root, args.smoke || `data/kosmo-innovation-github-fixture-payload-smoke-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-fixture-payload-smoke-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-fixture-payload-smoke-check-${dateStamp}.md`);

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
    status: failures.length === 0 ? 'innovation_github_fixture_payload_smoke_guard_passed' : 'innovation_github_fixture_payload_smoke_guard_failed',
    policy: {
      validates_smoke_only: true,
      copies_github_code: false,
      copies_readme_text: false,
      clones_repositories_now: false,
      installs_tools_now: false,
      downloads_models_now: false,
      runs_discovered_code_now: false,
      reads_private_content: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, smokePath)],
    summary: {
      smoke_status: smoke.status,
      payloads: smoke.summary?.payloads ?? null,
      lanes: smoke.summary?.lanes ?? null,
      content_types: smoke.summary?.content_types ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Wire GitHub fixture skeleton/payload/smoke steps into the day-batch loop.',
          'Keep repository adapter implementation as a later reviewed task.'
        ]
      : [
          'Fix GitHub fixture payload smoke guard failures.',
          'Rerun npm run kosmo:innovation-github-fixture-payload-smoke and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub fixture payload smoke check');
  console.log(`Status: ${report.status}`);
  console.log(`Payloads: ${report.summary.payloads}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkSmoke(smoke) {
  const findings = [];
  expect(smoke.schema_version === '0.1', findings, 'schema_version', 'Smoke schema_version must be 0.1.');
  expect(smoke.status === 'innovation_github_fixture_payload_smoke_passed', findings, 'smoke_passed', 'Payload smoke must pass.');
  expect(smoke.policy?.reads_fixture_payloads_only === true, findings, 'fixture_payloads_only', 'Smoke must read fixture payloads only.');
  expect(smoke.policy?.synthetic_fixture_only === true, findings, 'synthetic_only', 'Smoke must be synthetic-fixture-only.');
  expect(smoke.policy?.copies_github_code === false, findings, 'no_code_copy', 'Smoke must not copy GitHub code.');
  expect(smoke.policy?.copies_readme_text === false, findings, 'no_readme_copy', 'Smoke must not copy README text.');
  expect(smoke.policy?.clones_repositories_now === false, findings, 'no_clone', 'Smoke must not clone repositories.');
  expect(smoke.policy?.installs_tools_now === false, findings, 'no_installs', 'Smoke must not install tools.');
  expect(smoke.policy?.downloads_models_now === false, findings, 'no_download', 'Smoke must not download models.');
  expect(smoke.policy?.runs_discovered_code_now === false, findings, 'no_discovered_code_run', 'Smoke must not run discovered code.');
  expect(smoke.policy?.reads_private_content === false, findings, 'no_private_reads', 'Smoke must not read private content.');
  expect(smoke.policy?.public_ready_after_smoke === 0, findings, 'public_ready_zero', 'Smoke must keep public-ready at 0.');
  expect((smoke.summary?.payloads ?? 0) >= 10, findings, 'payload_count', 'Smoke must cover at least 10 payloads.');
  expect(smoke.summary?.lanes === smoke.summary?.required_lanes, findings, 'lanes_complete', 'Smoke must cover all required lanes.');
  expect(smoke.summary?.content_types === smoke.summary?.required_content_types, findings, 'content_types_complete', 'Smoke must cover all required content types.');
  expect(smoke.summary?.failures === 0, findings, 'smoke_failures_zero', 'Smoke failures must be 0.');
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Fixture Payload Smoke Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Smoke status: ${report.summary.smoke_status}`);
  lines.push(`- Payloads: ${report.summary.payloads}`);
  lines.push(`- Lanes: ${report.summary.lanes}`);
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
