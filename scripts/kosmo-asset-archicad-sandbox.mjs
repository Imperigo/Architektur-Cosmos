#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const assetId = String(args.asset || '').trim();
const route = String(args.route || 'archicad').trim();
const decisionPath = resolve(libraryRoot, args.decision || `review/asset-review-decision-${assetId}-${route}.generated.json`);
const outputJsonPath = resolve(libraryRoot, args.output || `review/asset-archicad-sandbox-${assetId}.generated.json`);
const outputMdPath = resolve(libraryRoot, args.markdown || `review/asset-archicad-sandbox-${assetId}.generated.md`);
const outputCsvPath = resolve(libraryRoot, args.csv || `review/asset-archicad-sandbox-${assetId}.generated.csv`);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);
  if (!assetId) throw new Error('Missing --asset <asset_id>');
  if (route !== 'archicad') throw new Error('ArchiCAD sandbox currently requires --route archicad.');

  const library = readJson(libraryPath);
  const asset = (library.assets || []).find((candidate) => candidate.id === assetId);
  if (!asset) throw new Error(`Asset not found in library: ${assetId}`);

  const handoffBundle = readRequiredJson(resolve(libraryRoot, 'review/asset-handoff-bundle.generated.json'), 'handoff bundle');
  const handoffSmoke = readRequiredJson(resolve(libraryRoot, 'review/asset-handoff-smoke.generated.json'), 'handoff smoke');
  const decision = readRequiredJson(decisionPath, 'local review decision');
  const handoffAsset = (handoffBundle.assets || []).find((candidate) => candidate.id === assetId);
  const report = buildSandboxReport({ library, asset, handoffAsset, handoffBundle, handoffSmoke, decision });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true }),
    mkdir(dirname(outputCsvPath), { recursive: true })
  ]);
  await writeFile(outputCsvPath, renderCsv(report), 'utf8');
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoAsset ArchiCAD sandbox');
  console.log(`Asset: ${asset.title}`);
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputCsvPath)}`);

  if (report.summary.failure_count > 0) process.exit(1);
}

function buildSandboxReport({ library, asset, handoffAsset, handoffBundle, handoffSmoke, decision }) {
  const sourceFile = handoffAsset?.archicad?.source_file || null;
  const checks = [
    check('decision_recorded', decision.status === 'local_review_decision_recorded', `Decision status is ${decision.status || 'missing'}.`),
    check('decision_route', decision.route === 'archicad', `Decision route is ${decision.route || 'missing'}.`),
    check('smoke_passed', handoffSmoke.summary?.failure_count === 0, `Handoff smoke status is ${handoffSmoke.status || 'missing'}.`),
    check('handoff_archicad_profile', Boolean(handoffAsset?.archicad), 'Handoff bundle has an ArchiCAD profile for this asset.'),
    check('public_gate_blocked', handoffAsset?.public_gate === 'blocked', 'Public gate remains blocked.'),
    check('source_file_exists', Boolean(sourceFile && existsSync(resolve(root, sourceFile))), 'Referenced local source file exists.'),
    check('no_project_file_writes', true, 'Generated ArchiCAD sandbox writes only a review CSV, no project file.'),
    check('no_uploads', true, 'Generated ArchiCAD sandbox does not upload or publish assets.')
  ];
  const failureCount = checks.filter((item) => item.status !== 'passed').length;
  const archicad = handoffAsset?.archicad || {};
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-archicad-sandbox',
    library_path: relative(root, libraryPath),
    library_id: library.library_id || null,
    asset_id: asset.id,
    asset_title: asset.title,
    status: failureCount ? 'archicad_sandbox_blocked' : 'archicad_sandbox_schedule_ready',
    policy: {
      sandbox_only: true,
      no_pln_write: true,
      no_attribute_import: true,
      no_asset_upload: true,
      no_public_download: true,
      no_library_mutation: true,
      requires_manual_archicad_review: true
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failure_count: failureCount
    },
    archicad: {
      exchange_mode: archicad.exchange_mode || 'metadata_reference',
      layer: archicad.archicad_layer || '',
      surface: archicad.archicad_surface || '',
      source_file: sourceFile,
      approved_for_exchange: Boolean(archicad.approved_for_exchange),
      review_status: handoffAsset?.human_review_status || 'open'
    },
    outputs: {
      sandbox_json: relative(root, outputJsonPath),
      sandbox_markdown: relative(root, outputMdPath),
      sandbox_csv: relative(root, outputCsvPath),
      decision: relative(root, decisionPath),
      handoff_bundle: handoffBundle.outputs?.markdown || null,
      handoff_smoke: handoffSmoke.outputs?.smoke_markdown || null
    },
    checks,
    next_actions: failureCount
      ? ['Resolve failed sandbox gates before using this schedule in ArchiCAD review.']
      : [
          'Open the generated CSV beside a copied ArchiCAD sandbox project.',
          'Create or map the proposed layer/surface manually; do not import it into production attributes automatically.',
          'Record the manual review result before promoting any asset beyond local review.'
        ]
  };
}

function renderCsv(report) {
  const header = [
    'asset_id',
    'title',
    'exchange_mode',
    'archicad_layer',
    'archicad_surface',
    'source_file',
    'approved_for_exchange',
    'review_status',
    'sandbox_status'
  ];
  const row = [
    report.asset_id,
    report.asset_title,
    report.archicad.exchange_mode,
    report.archicad.layer,
    report.archicad.surface,
    report.archicad.source_file,
    String(report.archicad.approved_for_exchange),
    report.archicad.review_status,
    report.status
  ];
  return `${header.map(csvCell).join(',')}\n${row.map(csvCell).join(',')}\n`;
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoAsset ArchiCAD Sandbox',
    '',
    `Asset: ${report.asset_title} (\`${report.asset_id}\`)`,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'This is a local ArchiCAD sandbox schedule. It is not a production attribute import, does not write `.pln` files and does not publish assets.',
    '',
    '## Checks',
    ''
  ];
  report.checks.forEach((item) => lines.push(`- ${item.status}: ${item.label}`));
  lines.push('', '## ArchiCAD Mapping', '');
  lines.push(`- exchange mode: \`${report.archicad.exchange_mode}\``);
  lines.push(`- layer: ${report.archicad.layer ? `\`${report.archicad.layer}\`` : '-'}`);
  lines.push(`- surface: ${report.archicad.surface ? `\`${report.archicad.surface}\`` : '-'}`);
  lines.push(`- source file: ${report.archicad.source_file ? `\`${report.archicad.source_file}\`` : '-'}`);
  lines.push('', '## Outputs', '');
  Object.entries(report.outputs).forEach(([key, value]) => lines.push(`- ${key}: ${value ? `\`${value}\`` : '-'}`));
  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function check(id, passed, label) {
  return {
    id,
    status: passed ? 'passed' : 'failed',
    label
  };
}

function readRequiredJson(pathname, label) {
  if (!existsSync(pathname)) throw new Error(`Missing ${label}: ${pathname}`);
  return readJson(pathname);
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
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
