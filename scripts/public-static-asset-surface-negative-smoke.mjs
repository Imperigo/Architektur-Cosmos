#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-static-asset-surface-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);

try {
  runSmoke();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  if (!keepTemp) rmSync(tempRoot, { recursive: true, force: true });
}

function runSmoke() {
  rmSync(tempRoot, { recursive: true, force: true });
  const outRoot = resolve(tempRoot, 'out');
  mkdirSync(outRoot, { recursive: true });

  writeFile(outRoot, 'index.html', '<!doctype html><html><body>Architecture Cosmos public fixture.</body></html>');
  writeFile(outRoot, 'assets/site.css', 'body { color: #111; }');
  writeFile(outRoot, '_headers', '/*\n  X-Frame-Options: DENY\n');

  const clean = runSurfaceCheck(outRoot, 'clean');
  if (clean.status !== 0) {
    throw new Error(`Expected clean synthetic export to pass, got ${clean.status}.\n${clean.output}`);
  }

  const missingOut = runSurfaceCheck(resolve(tempRoot, 'missing-out'), 'missing-out', ['--allow-missing-out']);
  if (missingOut.status !== 0) {
    throw new Error(`Expected --allow-missing-out to skip a missing export, got ${missingOut.status}.\n${missingOut.output}`);
  }
  const missingOutReport = JSON.parse(readFileSync(missingOut.outputPath, 'utf8'));
  if (
    missingOutReport.status !== 'public_static_asset_surface_check_skipped_missing_out'
    || missingOutReport.summary?.failure_count !== 0
    || missingOutReport.summary?.public_ready_after_check !== 0
  ) {
    throw new Error(`Unexpected --allow-missing-out report: ${JSON.stringify(missingOutReport)}`);
  }

  writeFile(outRoot, 'archive-media/public-safe-name.pdf', '%PDF synthetic public fixture');
  writeFile(outRoot, 'downloads/reference-dump.zip', 'synthetic zip placeholder');
  writeFile(outRoot, 'data/cache.sqlite', 'synthetic sqlite placeholder');
  writeFile(outRoot, 'cad/raw-plan.dwg', 'synthetic dwg placeholder');
  writeFile(outRoot, 'model/source-scene.blend', 'synthetic blend placeholder');
  writeFile(outRoot, 'media/disguised-source-plan.pdf.jpg', 'synthetic renamed source artifact with public-looking final extension');
  writeFile(outRoot, 'media/disguised-office-sheet.xlsx.txt', 'synthetic renamed office artifact with public-looking final extension');
  writeFile(outRoot, 'media/source-package.pdf/index.html', '<!doctype html><title>Synthetic source package directory</title>');
  writeFile(outRoot, 'media/source-root-note.txt', 'Synthetic text mentions /mnt/data/ArchitekturKosmos/source-root/private-scan.pdf');
  writeFile(outRoot, 'media/spoofed-public-image.jpg', '%PDF synthetic public fixture renamed as jpg');
  writeBinaryFile(outRoot, 'scripts/spoofed-public-bundle.js', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]));
  writeFile(outRoot, 'data/spoofed-public-cache.json', 'SQLite format 3 synthetic fixture renamed as json');
  writeBinaryFile(outRoot, 'media/oversized-public-image.jpg', Buffer.alloc(1024, 0x61));

  const poisoned = runSurfaceCheck(outRoot, 'poisoned', ['--max-asset-bytes', '512']);
  if (poisoned.status === 0) {
    throw new Error('Expected public-static-asset-surface-check to fail for synthetic unsafe static assets.');
  }

  if (!existsSync(poisoned.outputPath)) {
    throw new Error(`Expected JSON report to be written at ${relative(root, poisoned.outputPath)}.`);
  }

  const report = JSON.parse(readFileSync(poisoned.outputPath, 'utf8'));
  const failedIds = new Set((report.failures || []).map((failure) => failure.id));
  const expectedFailedIds = [
    'asset:archive-media/public-safe-name.pdf:blocked-extension',
    'asset:downloads/reference-dump.zip:blocked-extension',
    'asset:data/cache.sqlite:blocked-extension',
    'asset:cad/raw-plan.dwg:blocked-extension',
    'asset:model/source-scene.blend:blocked-extension',
    'asset:media/disguised-source-plan.pdf.jpg:embedded-blocked-extension',
    'asset:media/disguised-office-sheet.xlsx.txt:embedded-blocked-extension',
    'asset:media/source-package.pdf/index.html:embedded-blocked-extension',
    'asset:media/source-root-note.txt:path-leak',
    'asset:media/source-root-note.txt:content-leak',
    'asset:media/spoofed-public-image.jpg:blocked-signature',
    'asset:scripts/spoofed-public-bundle.js:blocked-signature',
    'asset:data/spoofed-public-cache.json:blocked-signature',
    'asset:media/oversized-public-image.jpg:oversized-asset'
  ];
  const missingFailedIds = expectedFailedIds.filter((id) => !failedIds.has(id));

  if (missingFailedIds.length > 0) {
    throw new Error(`Static asset surface negative smoke missed expected failures: ${missingFailedIds.join(', ')}`);
  }

  console.log(JSON.stringify({
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    allow_missing_out_status: missingOutReport.status,
    expected_failed_checks: expectedFailedIds,
    observed_failed_checks: [...failedIds].sort(),
    report_path: keepTemp ? relative(root, poisoned.outputPath) : null
  }, null, 2));
}

function runSurfaceCheck(outRoot, label, extraArgs = []) {
  const outputPath = resolve(tempRoot, `${label}.json`);
  const markdownPath = resolve(tempRoot, `${label}.md`);
  const result = spawnSync(process.execPath, [
    'scripts/public-static-asset-surface-check.mjs',
    '--out',
    outRoot,
    '--output',
    outputPath,
    '--markdown',
    markdownPath,
    ...extraArgs
  ], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  return {
    status: result.status,
    output: `${result.stdout || ''}${result.stderr || ''}`,
    outputPath,
    markdownPath
  };
}

function writeFile(outRoot, relativePath, body) {
  const filePath = resolve(outRoot, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${body}\n`, 'utf8');
}

function writeBinaryFile(outRoot, relativePath, body) {
  const filePath = resolve(outRoot, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, body);
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
