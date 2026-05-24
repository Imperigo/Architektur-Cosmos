#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const outputRoot = resolve(rootDir, 'out/brain-entry-pipeline', today);
const args = parseArgs(process.argv.slice(2));
const execute = Boolean(args.execute);
const limit = Number(args.limit ?? 1);

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  await mkdir(outputRoot, { recursive: true });

  const entries = JSON.parse(await readFile(resolve(rootDir, 'data/mock-entries.json'), 'utf8'));
  const reviewStep = runStep('brain-review', ['run', 'brain:review']);
  const brainReview = await readLatestBrainReview();
  const selectedEntries = selectEntries(entries, brainReview);

  const entryRuns = [];
  for (const entry of selectedEntries) {
    const plannedSteps = entrySteps(entry.slug);
    const steps = [];

    if (execute) {
      for (const step of plannedSteps) {
        const result = runStep(step.id, step.npm_args, step);
        steps.push(result);
        if (result.status === 'failed' && !args['continue-on-failure']) break;
      }
    }

    entryRuns.push({
      entry: entrySummary(entry),
      planned_steps: plannedSteps,
      executed: execute,
      steps,
      status: execute
        ? steps.some((step) => step.status === 'failed') ? 'failed' : 'review_pack_ready'
        : 'planned'
    });
  }

  const globalSteps = execute && selectedEntries.length
    ? [
      runStep('brain-model-status', ['run', 'brain:model-status']),
      runStep('brain-model-review', ['run', 'brain:model-review']),
      runStep('archive-validate', ['run', 'archive:validate'])
    ]
    : [];

  const report = {
    generated_at: new Date().toISOString(),
    tool: 'brain-entry-pipeline',
    mode: execute ? 'execute_local_review_pipeline' : 'plan_local_review_pipeline',
    writes_public_database: false,
    uploads_assets: false,
    writes_d1_or_r2: false,
    commits: false,
    pushes: false,
    approval_required_before_promotion: true,
    review_step: reviewStep,
    selected_count: selectedEntries.length,
    entries: entryRuns,
    global_steps: globalSteps,
    status: statusFor(entryRuns, globalSteps),
    next_owner_decisions: selectedEntries.flatMap((entry) => approvalCommands(entry.slug)),
    outputs: {
      report_json: `out/brain-entry-pipeline/${today}/latest.json`,
      report_md: `out/brain-entry-pipeline/${today}/latest.md`,
      entry_reviews: selectedEntries.map((entry) => `archive-intake/${entry.slug}/review/brain-entry-pipeline.md`)
    },
    safety_boundary: [
      'This pipeline is review-only by default.',
      'It never runs kosmodata:promote.',
      'It never copies GLBs into public/; use brain:promote-model with explicit approval for that.',
      'It never uploads to R2, writes D1, commits, pushes or publishes.',
      'Generated artifacts remain under out/ and archive-intake/ until owner approval.'
    ]
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await writeJson(resolve(outputRoot, `brain-entry-pipeline-${timestamp}.json`), report);
  await writeJson(resolve(outputRoot, 'latest.json'), report);
  await writeFile(resolve(outputRoot, `brain-entry-pipeline-${timestamp}.md`), renderMarkdown(report), 'utf8');
  await writeFile(resolve(outputRoot, 'latest.md'), renderMarkdown(report), 'utf8');
  await writeEntryReports(entryRuns, report);

  console.log('Architecture Cosmos Brain Entry Pipeline');
  console.log(`Mode: ${report.mode}`);
  console.log(`Entries: ${selectedEntries.length}`);
  console.log(`Status: ${report.status}`);
  console.log(`Report: ${report.outputs.report_md}`);
  if (!execute) console.log('Tip: add --execute to create local review packs.');
  console.log('Safety: no promotion, no upload, no D1/R2 write, no commit, no push.');

  if (report.status === 'failed') process.exitCode = 1;
}

function entrySteps(slug) {
  return [
    step('seed-from-research', ['run', 'kosmodata:seed-from-research', '--', '--entry', slug], 'Create a source-aware local seed candidate from existing entry data and research packs.'),
    step('enrichment-review', ['run', 'kosmodata:enrich', '--', '--entry', slug], 'Create proposed-entry.json and a promotion-readiness review without writing public data.'),
    step('rights-gate', ['run', 'archive:rights-gate', '--', '--entry', slug], 'Classify public/private/link-only asset and source rights.'),
    step('entry-build-review', ['run', 'cosmos:entry-build', '--', '--entry', slug, '--mode', 'review'], 'Generate the integrated 2D plan, 3D model and architecture text review pack.')
  ];
}

function step(id, npmArgs, note) {
  return {
    id,
    command: `npm ${npmArgs.join(' ')}`,
    npm_args: npmArgs,
    note
  };
}

function selectEntries(entries, brainReview) {
  if (args.entry || args.slug) {
    const wanted = String(args.entry || args.slug)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const selected = wanted
      .map((slug) => entries.find((entry) => entry.slug === slug || entry.id === slug))
      .filter(Boolean);
    if (!selected.length) throw new Error(`No matching entries found for ${wanted.join(', ')}`);
    return selected;
  }

  const tasks = [
    ...(brainReview?.tasks || []),
    ...(brainReview?.autopilot?.review_ready_tasks || [])
  ]
    .filter((taskItem) => taskItem.scope === 'entry')
    .filter((taskItem) => !args.kind || taskItem.kind === args.kind)
    .sort((a, b) => b.priority - a.priority || String(a.entry_title).localeCompare(String(b.entry_title)));

  const selectedSlugs = [];
  for (const taskItem of tasks) {
    if (!taskItem.entry_slug || selectedSlugs.includes(taskItem.entry_slug)) continue;
    selectedSlugs.push(taskItem.entry_slug);
    if (selectedSlugs.length >= safeLimit()) break;
  }

  const selected = selectedSlugs
    .map((slug) => entries.find((entry) => entry.slug === slug || entry.id === slug))
    .filter(Boolean);
  if (!selected.length) throw new Error('No entry-level Brain task found. Pass --entry {slug} to run a specific entry.');
  return selected;
}

function safeLimit() {
  return Number.isFinite(limit) && limit > 0 ? limit : 1;
}

async function readLatestBrainReview() {
  try {
    return JSON.parse(await readFile(resolve(rootDir, 'out/brain-review', today, 'brain-review.json'), 'utf8'));
  } catch {
    return null;
  }
}

function runStep(id, npmArgs, metadata = {}) {
  const invocation = resolveInvocation(npmArgs);
  const startedAt = new Date().toISOString();
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 24
  });

  return {
    id,
    command: invocation.display,
    note: metadata.note,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: result.status === 0 ? 'passed' : 'failed',
    exit_code: result.status,
    stdout_tail: tail(result.stdout),
    stderr_tail: tail(`${result.stderr ?? ''}\n${result.error?.message ?? ''}`)
  };
}

function resolveInvocation(npmArgs) {
  if (!process.env.npm_execpath) {
    return {
      command: 'npm',
      args: npmArgs,
      display: `npm ${npmArgs.join(' ')}`
    };
  }

  return {
    command: process.execPath,
    args: [process.env.npm_execpath, ...npmArgs],
    display: `npm ${npmArgs.join(' ')}`
  };
}

function statusFor(entryRuns, globalSteps) {
  if (entryRuns.some((run) => run.status === 'failed')) return 'failed';
  if (globalSteps.some((stepItem) => stepItem.status === 'failed')) return 'failed';
  if (entryRuns.every((run) => run.status === 'planned')) return 'planned';
  return 'ready_for_owner_review';
}

function approvalCommands(slug) {
  return [
    `Review archive-intake/${slug}/enrichment/proposed-entry.json`,
    `Review archive-intake/${slug}/review/entry-build-review.md`,
    `If public metadata is approved: npm run kosmodata:promote -- --entry ${slug} --confirm`,
    `If public model preview is approved: npm run brain:promote-model -- --entry ${slug} --confirm-public-model`
  ];
}

function entrySummary(entry) {
  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    year_start: entry.year_start,
    entry_type: entry.entry_type,
    style_sector: entry.style_sector
  };
}

async function writeEntryReports(entryRuns, report) {
  await Promise.all(entryRuns.map(async (run) => {
    const directory = resolve(rootDir, 'archive-intake', run.entry.slug, 'review');
    await mkdir(directory, { recursive: true });
    const entryReport = {
      ...report,
      entries: [run],
      selected_count: 1,
      outputs: {
        ...report.outputs,
        report_json: `archive-intake/${run.entry.slug}/review/brain-entry-pipeline.json`,
        report_md: `archive-intake/${run.entry.slug}/review/brain-entry-pipeline.md`
      }
    };
    await writeJson(resolve(directory, 'brain-entry-pipeline.json'), entryReport);
    await writeFile(resolve(directory, 'brain-entry-pipeline.md'), renderMarkdown(entryReport), 'utf8');
  }));
}

function renderMarkdown(report) {
  const lines = [
    '# Brain Entry Pipeline',
    '',
    `Generated: ${report.generated_at}`,
    `Mode: \`${report.mode}\``,
    `Status: \`${report.status}\``,
    `Writes public database: \`${report.writes_public_database}\``,
    `Uploads assets: \`${report.uploads_assets}\``,
    `Writes D1/R2: \`${report.writes_d1_or_r2}\``,
    ''
  ];

  lines.push('## Entries', '');
  report.entries.forEach((run, index) => {
    lines.push(`${index + 1}. **${run.entry.title}** (\`${run.entry.slug}\`) — \`${run.status}\``);
    lines.push(`   - Executed: \`${run.executed}\``);
    lines.push('   - Steps:');
    const steps = run.executed ? run.steps : run.planned_steps;
    steps.forEach((stepItem) => {
      lines.push(`     - \`${stepItem.command}\`${stepItem.status ? ` → ${stepItem.status}` : ''}`);
    });
  });

  if (report.global_steps.length) {
    lines.push('', '## Global Checks', '');
    report.global_steps.forEach((stepItem) => {
      lines.push(`- \`${stepItem.command}\` → ${stepItem.status}`);
    });
  }

  lines.push('', '## Owner Decisions', '');
  report.next_owner_decisions.forEach((item) => lines.push(`- ${item}`));

  lines.push('', '## Safety Boundary', '');
  report.safety_boundary.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function tail(value = '') {
  return String(value || '').trim().split('\n').filter(Boolean).slice(-12).join('\n');
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      parsed._.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : true;
    if (next && !next.startsWith('--')) index += 1;
  }
  return parsed;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
