#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputRoot = resolve(rootDir, 'archive-inbox/books/smoke-villa-savoye');
const outputRoot = resolve(rootDir, 'out/book-ingestion/villa-savoye-smoke-book');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await rm(inputRoot, { recursive: true, force: true });
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(inputRoot, { recursive: true });

  await writeFile(resolve(inputRoot, 'notes-villa-savoye.md'), [
    'Project: Villa Savoye',
    'Architect: Le Corbusier',
    'This is a smoke-test source note for private book ingestion.'
  ].join('\n'));
  await writeFile(resolve(inputRoot, 'page-042-villa-savoye-plan.jpg'), 'fake smoke image bytes\n');

  const result = spawnSync(process.execPath, [
    'scripts/kosmodata-book-ingest.mjs',
    '--input',
    'archive-inbox/books/smoke-villa-savoye',
    '--title',
    'Villa Savoye Smoke Book',
    '--project',
    'Villa Savoye'
  ], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 4
  });

  if (result.status !== 0) {
    throw new Error(`Book ingest command failed.\n${result.stdout}\n${result.stderr}`);
  }

  const draftResult = spawnSync(process.execPath, [
    'scripts/kosmodata-book-entry-drafts.mjs',
    '--book',
    'villa-savoye-smoke-book'
  ], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 4
  });

  if (draftResult.status !== 0) {
    throw new Error(`Book draft command failed.\n${draftResult.stdout}\n${draftResult.stderr}`);
  }

  const pipelineResult = spawnSync(process.execPath, [
    'scripts/kosmodata-book-pipeline.mjs',
    '--input',
    'archive-inbox/books/smoke-villa-savoye',
    '--title',
    'Villa Savoye Smoke Book',
    '--project',
    'Villa Savoye'
  ], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 4
  });

  if (pipelineResult.status !== 0) {
    throw new Error(`Book pipeline command failed.\n${pipelineResult.stdout}\n${pipelineResult.stderr}`);
  }

  const manifest = await readJson(resolve(outputRoot, 'book-manifest.json'));
  const projects = await readJson(resolve(outputRoot, 'detected-projects.json'));
  const sourceMap = await readJson(resolve(outputRoot, 'source-map.json'));
  const report = await readFile(resolve(outputRoot, 'review-report.md'), 'utf8');
  const draftIndex = await readJson(resolve(outputRoot, 'entry-drafts/index.json'));
  const villaDraft = await readJson(resolve(outputRoot, 'entry-drafts/villa-savoye.json'));
  const pipelineReport = await readJson(resolve(outputRoot, 'pipeline-report.json'));

  assert(manifest.mode === 'local_book_ingestion_preview', 'Manifest mode should be local preview.');
  assert(manifest.upload_allowed === false, 'Book ingest must not allow upload.');
  assert(manifest.summary.files_scanned === 2, 'Smoke fixture should scan two files.');
  assert(projects.length === 1, `Expected one project draft, got ${projects.length}.`);
  assert(projects[0].slug === 'villa-savoye', 'Detected project should be Villa Savoye.');
  assert(projects[0].public_display === 'metadata_only', 'Detected project must be public metadata only.');
  assert(sourceMap.files.every((file) => file.public_display === 'blocked_private_source'), 'All book files must be blocked private sources.');
  assert(report.includes('Book pages, scans, OCR text'), 'Review report should include rights rule.');
  assert(draftIndex.draft_count === 1, 'Book draft index should contain one draft.');
  assert(villaDraft.slug === 'villa-savoye', 'Book draft slug should be Villa Savoye.');
  assert(villaDraft.ingestion_status.asset_status === 'rights_blocked', 'Book draft assets must stay rights-blocked.');
  assert(villaDraft.database_tags.includes('public-display:metadata-only'), 'Book draft must be metadata-only.');
  assert(pipelineReport.status === 'passed', 'Book pipeline report should pass.');
  assert(pipelineReport.summary.draft_count === 1, 'Book pipeline should report one draft.');

  console.log('KosmoData book ingest smoke test passed.');
  console.log('Review pack: out/book-ingestion/villa-savoye-smoke-book');
  console.log(`Detected project: ${projects[0].title}`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
