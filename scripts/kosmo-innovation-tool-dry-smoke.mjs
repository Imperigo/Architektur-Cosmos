#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const payloadsPath = resolve(root, args.payloads || `data/kosmo-innovation-fixture-payloads-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-tool-dry-smoke-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-tool-dry-smoke-${dateStamp}.md`);

const toolLanes = [
  lane('docling_markitdown_document_shape', ['document_conversion_fixture'], checkDocumentConversion),
  lane('qwen_retrieval_shape', ['retrieval_fixture'], checkRetrieval),
  lane('ifcopenshell_entity_shape', ['ifc_shape_manifest'], checkIfc),
  lane('deepseek_ocr_shape', ['ocr_fixture'], checkOcr),
  lane('qwen_vl_visual_shape', ['visual_retrieval_fixture'], checkVisual),
  lane('topologicpy_graph_shape', ['spatial_graph_fixture'], checkGraph),
  lane('paper2poster_layout_shape', ['publish_layout_fixture'], checkLayout),
  lane('speckle_connector_boundary_shape', ['connector_boundary_fixture'], checkConnector)
];

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

  const laneReports = toolLanes.map((toolLane) => runLane(toolLane, payloads));
  failures.push(...laneReports.flatMap((item) => item.failures.map((failure) => `${item.id}: ${failure}`)));

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_tool_dry_smoke_passed' : 'innovation_tool_dry_smoke_failed',
    policy: {
      dry_smoke_only: true,
      reads_fixture_payloads_only: true,
      installs_tools_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      runs_private_ocr: false,
      runs_embeddings_on_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_smoke: 0,
      note: 'This dry smoke validates fixture payload shapes for future tool integrations. It does not import, install or execute external tools.'
    },
    source_refs: [relative(root, payloadsPath)],
    summary: {
      tool_lanes: laneReports.length,
      passed_lanes: laneReports.filter((item) => item.status === 'passed').length,
      payloads_read: payloads.length,
      executable_now: 0,
      failures: failures.length,
      public_ready_after_smoke: 0
    },
    tool_lanes: laneReports,
    failures,
    next_actions: [
      'Create isolated dependency preflight scripts for Docling, MarkItDown, Qwen and IfcOpenShell.',
      'Keep those preflights install-free until dependency policy is explicitly accepted.',
      'After dependency preflight, add optional local-only smoke commands that consume generated fixtures only.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation tool dry smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Tool lanes: ${report.summary.passed_lanes}/${report.summary.tool_lanes}`);
  console.log(`Payloads read: ${report.summary.payloads_read}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function runLane(toolLane, payloads) {
  const selected = payloads.filter(({ payload }) => toolLane.contentTypes.includes(payload.content?.type));
  const failures = [];
  if (selected.length === 0) failures.push(`No payloads for content types: ${toolLane.contentTypes.join(', ')}`);
  for (const item of selected) {
    failures.push(...toolLane.check(item.payload).map((failure) => `${item.file}: ${failure}`));
  }
  return {
    id: toolLane.id,
    status: failures.length === 0 ? 'passed' : 'failed',
    content_types: toolLane.contentTypes,
    payloads: selected.map((item) => item.file),
    failures,
    public_ready_after_lane: 0
  };
}

function lane(id, contentTypes, check) {
  return { id, contentTypes, check };
}

function checkDocumentConversion(payload) {
  const content = payload.content || {};
  const failures = [];
  if (!content.title) failures.push('Missing document title.');
  if (!Array.isArray(content.sections) || content.sections.length < 2) failures.push('Document fixture must contain at least two sections.');
  if (!content.sections?.some((section) => Array.isArray(section.rows))) failures.push('Document fixture must include tabular rows.');
  return failures;
}

function checkRetrieval(payload) {
  const content = payload.content || {};
  const failures = [];
  if (!Array.isArray(content.chunks) || content.chunks.length < 2) failures.push('Retrieval fixture must include at least two chunks.');
  if (!Array.isArray(content.queries) || content.queries.length < 1) failures.push('Retrieval fixture must include queries.');
  if (!content.chunks?.every((chunk) => chunk.id && chunk.text && chunk.topic)) failures.push('Every retrieval chunk needs id, topic and text.');
  return failures;
}

function checkIfc(payload) {
  const content = payload.content || {};
  const failures = [];
  if (!Array.isArray(content.entities) || !content.entities.includes('IfcProject')) failures.push('IFC shape must include IfcProject.');
  if (!content.entities?.includes('IfcWall')) failures.push('IFC shape must include IfcWall.');
  if (!content.expected_counts || Number(content.expected_counts.IfcWall || 0) < 1) failures.push('IFC shape must include expected IfcWall count.');
  if (content.units !== 'metre') failures.push('IFC shape units must be metre.');
  return failures;
}

function checkOcr(payload) {
  const content = payload.content || {};
  const failures = [];
  if (!Array.isArray(content.expected_words) || content.expected_words.length < 3) failures.push('OCR fixture must include expected words.');
  if (content.uncertainty_required !== true) failures.push('OCR fixture must require uncertainty output.');
  return failures;
}

function checkVisual(payload) {
  const content = payload.content || {};
  const failures = [];
  if (!Array.isArray(content.image_manifest) || content.image_manifest.length < 2) failures.push('Visual fixture must include at least two image manifest rows.');
  if (!content.image_manifest?.every((item) => item.id && Array.isArray(item.tags))) failures.push('Every visual row needs id and tags.');
  return failures;
}

function checkGraph(payload) {
  const content = payload.content || {};
  const failures = [];
  if (!Array.isArray(content.nodes) || content.nodes.length < 3) failures.push('Graph fixture must include at least three nodes.');
  if (!Array.isArray(content.edges) || content.edges.length < 2) failures.push('Graph fixture must include at least two edges.');
  if (!Array.isArray(content.expected_metrics) || !content.expected_metrics.includes('adjacency')) failures.push('Graph fixture must include adjacency metric.');
  return failures;
}

function checkLayout(payload) {
  const content = payload.content || {};
  const failures = [];
  if (!Array.isArray(content.zones) || !content.zones.includes('rights_note')) failures.push('Layout fixture must include rights_note zone.');
  if (!Array.isArray(content.scoring) || !content.scoring.includes('source_visibility')) failures.push('Layout fixture must score source visibility.');
  return failures;
}

function checkConnector(payload) {
  const content = payload.content || {};
  const failures = [];
  if (!Array.isArray(content.objects) || content.objects.length < 1) failures.push('Connector fixture must include objects.');
  if (!content.objects?.every((item) => item.cloud_write_allowed === false)) failures.push('Connector fixture must keep cloud writes blocked.');
  return failures;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Tool Dry Smoke');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Tool lanes: ${report.summary.passed_lanes}/${report.summary.tool_lanes}`);
  lines.push(`- Payloads read: ${report.summary.payloads_read}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after smoke: ${report.summary.public_ready_after_smoke}`);
  lines.push('');
  lines.push('## Tool Lanes');
  lines.push('');
  lines.push('| Lane | Status | Payloads |');
  lines.push('| --- | --- | ---: |');
  for (const item of report.tool_lanes) {
    lines.push(`| \`${item.id}\` | ${item.status} | ${item.payloads.length} |`);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
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
