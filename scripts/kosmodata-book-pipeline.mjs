#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const input = readArg('--input') ?? 'archive-inbox/books/untitled-book';
  const title = readArg('--title') ?? 'Untitled Architecture Book';
  const bookSlug = readArg('--slug') ?? slugify(title);
  const rights = readArg('--rights') ?? 'private_research';
  const projectHints = readArgs('--project');
  const outputRoot = resolve(rootDir, 'out/book-ingestion', bookSlug);
  const validationRoot = resolve(outputRoot, 'entry-drafts/validation');
  await mkdir(validationRoot, { recursive: true });

  const ingestArgs = [
    'scripts/kosmodata-book-ingest.mjs',
    '--input',
    input,
    '--title',
    title,
    '--slug',
    bookSlug,
    '--rights',
    rights
  ];
  for (const project of projectHints) {
    ingestArgs.push('--project', project);
  }

  const steps = [];
  steps.push(runStep('book_ingest', ingestArgs));
  steps.push(runStep('book_entry_drafts', [
    'scripts/kosmodata-book-entry-drafts.mjs',
    '--book',
    bookSlug
  ]));

  const draftIndexPath = resolve(outputRoot, 'entry-drafts/index.json');
  const draftIndex = await readJson(draftIndexPath);
  const validationSteps = [];
  for (const draft of draftIndex.drafts ?? []) {
    const previewPath = resolve(validationRoot, `${draft.slug}-preview.json`);
    validationSteps.push(runStep(`draft_validate:${draft.slug}`, [
      'scripts/archive-entry-draft.mjs',
      '--input',
      draft.path,
      '--output',
      relativeToRoot(previewPath)
    ]));
  }
  steps.push(...validationSteps);

  const failed = steps.filter((step) => step.status !== 'passed');
  const report = buildReport({
    input,
    title,
    bookSlug,
    rights,
    projectHints,
    outputRoot,
    draftIndex,
    steps,
    failed
  });
  await writeFile(resolve(outputRoot, 'pipeline-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'pipeline-report.md'), renderMarkdown(report), 'utf8');

  console.log('KosmoData book pipeline');
  console.log(`Title: ${title}`);
  console.log(`Slug: ${bookSlug}`);
  console.log(`Output: ${relativeToRoot(outputRoot)}`);
  console.log(`Steps: ${steps.filter((step) => step.status === 'passed').length}/${steps.length} passed`);
  console.log(`Entry drafts: ${draftIndex.draft_count ?? 0}`);
  console.log('Mode: LOCAL REVIEW ONLY. No public database write, D1 write, R2 upload or source promotion was performed.');

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

function runStep(name, args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.execPath, args, {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8
  });
  return {
    name,
    command: `node ${args.join(' ')}`,
    status: result.status === 0 ? 'passed' : 'failed',
    exit_code: result.status,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    stdout_tail: tail(result.stdout),
    stderr_tail: tail(result.stderr)
  };
}

function buildReport({ input, title, bookSlug, rights, projectHints, outputRoot, draftIndex, steps, failed }) {
  return {
    generated_at: new Date().toISOString(),
    mode: 'kosmodata_book_pipeline_review_only',
    status: failed.length ? 'failed' : 'passed',
    writes_public_database: false,
    uploads_assets: false,
    publishes: false,
    approval_required_before_apply: true,
    input,
    title,
    book_slug: bookSlug,
    rights,
    project_hints: projectHints,
    output_root: relativeToRoot(outputRoot),
    summary: {
      steps: steps.length,
      passed: steps.length - failed.length,
      failed: failed.length,
      draft_count: draftIndex.draft_count ?? 0
    },
    outputs: {
      book_manifest: `out/book-ingestion/${bookSlug}/book-manifest.json`,
      detected_projects: `out/book-ingestion/${bookSlug}/detected-projects.json`,
      source_map: `out/book-ingestion/${bookSlug}/source-map.json`,
      entry_drafts: `out/book-ingestion/${bookSlug}/entry-drafts/`,
      pipeline_report: `out/book-ingestion/${bookSlug}/pipeline-report.md`
    },
    steps,
    draft_index: draftIndex,
    next_steps: [
      'Review generated entry drafts manually before any data promotion.',
      'Run rights gate before public display of any derived metadata.',
      'Keep scans, OCR text, photographed pages and plan reproductions private.',
      'Promote only public-safe metadata and paraphrased architectural analysis.'
    ]
  };
}

function renderMarkdown(report) {
  const lines = [
    `# KosmoData Book Pipeline / ${report.title}`,
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Mode: \`${report.mode}\``,
    `Writes public database: \`${report.writes_public_database}\``,
    `Uploads assets: \`${report.uploads_assets}\``,
    '',
    '## Summary',
    '',
    `- Steps: ${report.summary.passed}/${report.summary.steps} passed`,
    `- Entry drafts: ${report.summary.draft_count}`,
    `- Rights: \`${report.rights}\``,
    `- Output: \`${report.output_root}\``,
    '',
    '## Steps',
    ''
  ];

  for (const step of report.steps) {
    lines.push(`- ${step.status === 'passed' ? 'PASS' : 'FAIL'} / ${step.name}`);
  }

  lines.push('', '## Drafts', '');
  if (!report.draft_index.drafts?.length) {
    lines.push('- No drafts generated.');
  } else {
    for (const draft of report.draft_index.drafts) {
      lines.push(`- ${draft.title}: \`${draft.path}\` / ${draft.review_status}`);
    }
  }

  lines.push('', '## Next Steps', '');
  report.next_steps.forEach((step) => lines.push(`- ${step}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function tail(value, maxLength = 2200) {
  const clean = String(value ?? '').trim();
  return clean.length > maxLength ? clean.slice(-maxLength) : clean;
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function readArgs(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) values.push(process.argv[index + 1]);
  }
  return values;
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
