#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const payloadsPath = resolve(root, args.payloads || `data/kosmo-innovation-fixture-payloads-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-fixture-payload-smoke-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-fixture-payload-smoke-${dateStamp}.md`);

const requiredContentTypes = new Set([
  'document_conversion_fixture',
  'retrieval_fixture',
  'ifc_shape_manifest',
  'ocr_fixture',
  'visual_retrieval_fixture',
  'spatial_graph_fixture',
  'publish_layout_fixture',
  'connector_boundary_fixture'
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const payloadReport = JSON.parse(await readFile(payloadsPath, 'utf8'));
  const payloads = [];
  const failures = [];
  if (payloadReport.status !== 'innovation_fixture_payloads_ready') {
    failures.push(`Payload report not ready: ${payloadReport.status}`);
  }

  for (const file of payloadReport.written_payloads || []) {
    const payload = JSON.parse(await readFile(resolve(root, file), 'utf8'));
    payloads.push({ file, payload });
  }

  const contentTypes = new Set(payloads.map(({ payload }) => payload.content?.type).filter(Boolean));
  for (const type of requiredContentTypes) {
    if (!contentTypes.has(type)) failures.push(`Missing content type: ${type}`);
  }

  for (const { file, payload } of payloads) {
    if (payload.policy?.private_content !== false) failures.push(`Payload has private_content not false: ${file}`);
    if (payload.policy?.tool_output !== false) failures.push(`Payload claims tool output: ${file}`);
    if (payload.policy?.public_ready !== false) failures.push(`Payload claims public_ready: ${file}`);
    if (payload.expected_review?.human_review_required_before_training !== true) failures.push(`Payload missing human training review gate: ${file}`);
  }

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_fixture_payload_smoke_passed' : 'innovation_fixture_payload_smoke_failed',
    policy: {
      reads_fixture_payloads_only: true,
      installs_tools_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      writes_public_files: false,
      public_ready_after_smoke: 0
    },
    source_refs: [relative(root, payloadsPath)],
    summary: {
      payloads: payloads.length,
      content_types: contentTypes.size,
      required_content_types: requiredContentTypes.size,
      failures: failures.length,
      public_ready_after_smoke: 0
    },
    content_type_counts: [...contentTypes].sort().map((type) => ({
      type,
      count: payloads.filter(({ payload }) => payload.content?.type === type).length
    })),
    failures,
    next_actions: [
      'Create tool-specific dry smoke scripts that read these payload shapes.',
      'Keep actual dependency installation separate and explicit.',
      'Use these fixture payloads as the first public-safe tests for future Docling/MarkItDown/Qwen/IfcOpenShell integration.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation fixture payload smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Payloads: ${report.summary.payloads}`);
  console.log(`Content types: ${report.summary.content_types}/${report.summary.required_content_types}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Fixture Payload Smoke');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Payloads: ${report.summary.payloads}`);
  lines.push(`- Content types: ${report.summary.content_types}/${report.summary.required_content_types}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after smoke: ${report.summary.public_ready_after_smoke}`);
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
