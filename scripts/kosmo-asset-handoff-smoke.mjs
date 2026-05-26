#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const bundlePath = resolve(libraryRoot, args.bundle || 'review/asset-handoff-bundle.generated.json');
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-handoff-smoke.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-handoff-smoke.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);
  if (!existsSync(bundlePath)) throw new Error(`Handoff bundle not found: ${bundlePath}`);

  const bundle = readJson(bundlePath);
  const report = buildReport(bundle);

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoAsset handoff smoke');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`);
  console.log(`Failures: ${report.summary.failure_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.summary.failure_count > 0) process.exit(1);
}

function buildReport(bundle) {
  const checks = [];
  const outputs = bundle.outputs || {};
  const blenderPath = resolveOutput(outputs.blender_python);
  const archicadCsvPath = resolveOutput(outputs.archicad_schedule_csv);
  const blenderExists = Boolean(blenderPath && existsSync(blenderPath));
  const archicadCsvExists = Boolean(archicadCsvPath && existsSync(archicadCsvPath));
  const blenderSource = blenderExists ? readFileSync(blenderPath, 'utf8') : '';
  const csvSource = archicadCsvExists ? readFileSync(archicadCsvPath, 'utf8') : '';
  const csvRows = csvSource ? parseCsv(csvSource) : [];
  const blenderRun = blenderExists && blenderPath ? runPython(blenderPath) : null;

  checks.push(check('bundle_status', bundle.status === 'local_review_handoff_bundle', `Bundle status is ${bundle.status || 'missing'}.`));
  checks.push(check('review_only_policy', bundle.policy?.review_only === true && bundle.policy?.no_uploads === true && bundle.policy?.no_public_downloads === true, 'Bundle policy stays review-only, no uploads and no public downloads.'));
  checks.push(check('blender_output_exists', blenderExists, `Blender handoff exists at ${blenderPath ? relative(root, blenderPath) : 'missing output path'}.`));
  checks.push(check('archicad_output_exists', archicadCsvExists, `ArchiCAD CSV exists at ${archicadCsvPath ? relative(root, archicadCsvPath) : 'missing output path'}.`));
  checks.push(check('blender_write_gate', /^ALLOW_SCENE_WRITE\s*=\s*False$/m.test(blenderSource), 'Blender script keeps ALLOW_SCENE_WRITE = False.'));
  checks.push(check('blender_no_file_write_ops', !/bpy\.ops\.wm\.(save|open)_/m.test(blenderSource), 'Blender script does not call save/open mainfile operators.'));
  checks.push(check('blender_runtime_smoke', blenderRun?.ok === true && blenderRun.stdout.includes('Review-only mode'), 'Blender Python handoff runs in review-only mode without importing bpy.'));
  checks.push(check('csv_header', csvRows[0]?.join('|') === expectedCsvHeader().join('|'), 'ArchiCAD CSV header matches the handoff contract.'));
  checks.push(check('csv_row_count', Math.max(csvRows.length - 1, 0) === bundle.summary?.archicad_row_count, `ArchiCAD CSV has ${Math.max(csvRows.length - 1, 0)} data rows.`));
  checks.push(check('csv_review_locked', csvRows.slice(1).every((row) => row[6] === 'false' && row[7] === 'open'), 'ArchiCAD rows remain unapproved and open for human review.'));
  checks.push(check('source_files_exist', sourceFilesExist(bundle), 'All referenced local source files exist.'));
  checks.push(check('public_gates_blocked', (bundle.assets || []).every((asset) => asset.public_gate === 'blocked'), 'All public gates remain blocked.'));

  const failureCount = checks.filter((item) => item.status !== 'passed').length;
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-handoff-smoke',
    library_path: relative(root, libraryPath),
    bundle_path: relative(root, bundlePath),
    status: failureCount > 0 ? 'handoff_smoke_failed' : 'handoff_smoke_passed',
    policy: {
      no_uploads: true,
      no_public_downloads: true,
      no_project_file_writes: true,
      smoke_does_not_import_assets: true
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failure_count: failureCount,
      blender_row_count: bundle.summary?.blender_row_count || 0,
      archicad_row_count: bundle.summary?.archicad_row_count || 0,
      open_review_count: bundle.summary?.open_review_count || 0
    },
    outputs: {
      smoke_json: relative(root, outputJsonPath),
      smoke_markdown: relative(root, outputMdPath),
      blender_python: outputs.blender_python || null,
      archicad_schedule_csv: outputs.archicad_schedule_csv || null
    },
    checks,
    python_runtime: blenderRun,
    next_actions: failureCount > 0
      ? ['Fix failed handoff checks before using the generated Blender or ArchiCAD handoff files.']
      : ['Handoff bundle is ready for human review-only smoke tests. Keep ALLOW_SCENE_WRITE disabled until explicit approval.']
  };
}

function resolveOutput(pathname) {
  if (!pathname || typeof pathname !== 'string') return null;
  return resolve(root, pathname);
}

function runPython(pathname) {
  const result = spawnSync('python3', [pathname], { cwd: root, encoding: 'utf8' });
  return {
    command: `python3 ${relative(root, pathname)}`,
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

function sourceFilesExist(bundle) {
  const sourceFiles = [];
  for (const asset of bundle.assets || []) {
    if (asset.blender?.source_file) sourceFiles.push(asset.blender.source_file);
    if (asset.archicad?.source_file) sourceFiles.push(asset.archicad.source_file);
    if (asset.web?.source_file) sourceFiles.push(asset.web.source_file);
  }
  return sourceFiles.every((pathname) => existsSync(resolve(root, pathname)));
}

function expectedCsvHeader() {
  return ['asset_id', 'title', 'exchange_mode', 'archicad_layer', 'archicad_surface', 'source_file', 'approved_for_exchange', 'review_status'];
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuote = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"' && inQuote && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuote) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  return rows;
}

function check(id, passed, label) {
  return {
    id,
    status: passed ? 'passed' : 'failed',
    label
  };
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoAsset Handoff Smoke',
    '',
    `Library: \`${report.library_path}\``,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Review-only. This smoke checks generated handoff files and does not import assets, write project files, upload or publish anything.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count}`,
    `- failures: ${report.summary.failure_count}`,
    `- Blender rows: ${report.summary.blender_row_count}`,
    `- ArchiCAD rows: ${report.summary.archicad_row_count}`,
    `- open reviews: ${report.summary.open_review_count}`,
    '',
    '## Checks',
    ''
  ];

  for (const item of report.checks) lines.push(`- ${item.status}: ${item.label}`);
  lines.push('', '## Python Runtime', '');
  lines.push(`- command: \`${report.python_runtime?.command || '-'}\``);
  lines.push(`- status: ${report.python_runtime?.status ?? '-'}`);
  if (report.python_runtime?.stdout) lines.push(`- stdout: ${inline(report.python_runtime.stdout)}`);
  if (report.python_runtime?.stderr) lines.push(`- stderr: ${inline(report.python_runtime.stderr)}`);
  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function inline(value) {
  return `\`${String(value).replace(/`/g, "'").replace(/\n/g, ' / ')}\``;
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
