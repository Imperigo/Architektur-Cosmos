#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const payloadsPath = resolve(root, args.payloads || `data/kosmo-innovation-github-fixture-payloads-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-fixture-payload-smoke-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-fixture-payload-smoke-${dateStamp}.md`);

const requiredContentTypes = new Set([
  'synthetic_architecture_document_manifest',
  'document_layout_expectation',
  'synthetic_asset_manifest',
  'asset_similarity_query_fixture',
  'local_worker_command_boundary',
  'runtime_risk_matrix'
]);

const requiredLanes = new Set(['kosmo_prepare', 'kosmo_asset', 'worker_integration']);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const payloadReport = JSON.parse(await readFile(payloadsPath, 'utf8'));
  const payloads = [];
  const failures = [];
  if (payloadReport.status !== 'innovation_github_fixture_payloads_ready') {
    failures.push(`Payload report not ready: ${payloadReport.status}`);
  }

  for (const file of payloadReport.written_payloads || []) {
    const payload = JSON.parse(await readFile(resolve(root, file), 'utf8'));
    payloads.push({ file, payload });
  }

  const contentTypes = new Set(payloads.map(({ payload }) => payload.content?.type).filter(Boolean));
  const lanes = new Set(payloads.map(({ payload }) => payload.lane).filter(Boolean));

  for (const type of requiredContentTypes) {
    if (!contentTypes.has(type)) failures.push(`Missing content type: ${type}`);
  }
  for (const lane of requiredLanes) {
    if (!lanes.has(lane)) failures.push(`Missing lane: ${lane}`);
  }

  for (const { file, payload } of payloads) {
    if (payload.status !== 'generated_github_signal_fixture_payload') failures.push(`Unexpected payload status: ${file}`);
    if (payload.source_repo_is_reference_only !== true) failures.push(`Source repo not reference-only: ${file}`);
    if (payload.policy?.private_content !== false) failures.push(`Payload has private_content not false: ${file}`);
    if (payload.policy?.copied_github_code !== false) failures.push(`Payload permits GitHub code copy: ${file}`);
    if (payload.policy?.copied_readme_text !== false) failures.push(`Payload permits README copy: ${file}`);
    if (payload.policy?.tool_output !== false) failures.push(`Payload claims tool output: ${file}`);
    if (payload.policy?.public_ready !== false) failures.push(`Payload claims public_ready: ${file}`);
    if (payload.expected_review?.repository_review_required_before_adapter_work !== true) failures.push(`Payload missing repository review gate: ${file}`);
    if (payload.expected_review?.human_review_required_before_training !== true) failures.push(`Payload missing human training review gate: ${file}`);
  }

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_github_fixture_payload_smoke_passed' : 'innovation_github_fixture_payload_smoke_failed',
    policy: {
      reads_fixture_payloads_only: true,
      synthetic_fixture_only: true,
      copies_github_code: false,
      copies_readme_text: false,
      clones_repositories_now: false,
      installs_tools_now: false,
      downloads_models_now: false,
      runs_discovered_code_now: false,
      reads_private_content: false,
      writes_public_files: false,
      public_ready_after_smoke: 0
    },
    source_refs: [relative(root, payloadsPath)],
    summary: {
      payloads: payloads.length,
      lanes: lanes.size,
      required_lanes: requiredLanes.size,
      content_types: contentTypes.size,
      required_content_types: requiredContentTypes.size,
      failures: failures.length,
      public_ready_after_smoke: 0
    },
    lane_counts: [...lanes].sort().map((lane) => ({
      lane,
      count: payloads.filter(({ payload }) => payload.lane === lane).length
    })),
    content_type_counts: [...contentTypes].sort().map((type) => ({
      type,
      count: payloads.filter(({ payload }) => payload.content?.type === type).length
    })),
    failures,
    next_actions: [
      'Wire this GitHub fixture payload chain into the day-batch loop.',
      'Keep actual adapter execution behind dependency/install review gates.',
      'Use the smoke report as the first review-only readiness signal for GitHub-inspired local worker contracts.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub fixture payload smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Payloads: ${report.summary.payloads}`);
  console.log(`Lanes: ${report.summary.lanes}/${report.summary.required_lanes}`);
  console.log(`Content types: ${report.summary.content_types}/${report.summary.required_content_types}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Fixture Payload Smoke');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Payloads: ${report.summary.payloads}`);
  lines.push(`- Lanes: ${report.summary.lanes}/${report.summary.required_lanes}`);
  lines.push(`- Content types: ${report.summary.content_types}/${report.summary.required_content_types}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after smoke: ${report.summary.public_ready_after_smoke}`);
  lines.push('');
  lines.push('## Lanes');
  lines.push('');
  report.lane_counts.forEach((item) => lines.push(`- ${item.lane}: ${item.count}`));
  lines.push('');
  lines.push('## Content Types');
  lines.push('');
  report.content_type_counts.forEach((item) => lines.push(`- ${item.type}: ${item.count}`));
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
