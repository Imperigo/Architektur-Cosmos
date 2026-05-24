#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const args = parseArgs(process.argv.slice(2));
const execute = Boolean(args.execute);
const autopush = Boolean(args.autopush || args.publish || process.env.ARCHITECTURE_COSMOS_BRAIN_AUTOPUSH === '1');
const confirmAutopush = Boolean(args['confirm-autopush'] || process.env.ARCHITECTURE_COSMOS_BRAIN_AUTOPUSH === '1');
const limit = Number(args.limit ?? 1);
const outputRoot = resolve(rootDir, 'out/brain-autopilot', today);
const statePath = resolve(rootDir, 'archive-intake/_brain/autopilot-state.json');

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  await mkdir(outputRoot, { recursive: true });

  const reviewStep = runStep('brain-review', ['run', 'brain:review']);
  if (reviewStep.status !== 'passed') {
    const failed = buildRun({
      reviewStep,
      selected_tasks: [],
      status: 'failed',
      reason: 'Brain review did not complete; autopilot stopped before any pipeline work.'
    });
    await writeRun(failed);
    process.exitCode = 1;
    return;
  }

  const review = JSON.parse(await readFile(resolve(rootDir, 'out/brain-review', today, 'brain-review.json'), 'utf8'));
  const completedTaskIds = args.repeat ? new Set() : await readCompletedTaskIds();
  const selectedTasks = selectTasks(review.tasks ?? [], completedTaskIds);
  const runs = [];

  for (const task of selectedTasks) {
    const plan = planForTask(task);
    const stepResults = execute ? plan.steps.map((step) => runStep(step.id, step.npm_args, step)) : [];
    runs.push({
      task,
      plan,
      executed: execute,
      steps: stepResults,
      status: stepResults.some((step) => step.status === 'failed') ? 'failed' : 'ready_for_owner_review'
    });
  }

  const report = buildRun({
    reviewStep,
    selected_tasks: selectedTasks,
    skipped_recent_task_ids: [...completedTaskIds],
    runs,
    status: runs.some((run) => run.status === 'failed') ? 'failed' : 'ready_for_owner_review'
  });

  await writeRun(report);

  const autopushStep = autopush
    ? runStep('brain-autopush', [
      'run',
      'brain:autopush',
      '--',
      '--message',
      `Brain autopilot review batch ${today}`,
      ...(confirmAutopush ? ['--confirm-autopush'] : [])
    ])
    : null;

  console.log('Architecture Cosmos Brain Autopilot');
  console.log(`Mode: ${execute ? 'execute local review-only pipeline' : 'plan only'}`);
  console.log(`Tasks selected: ${selectedTasks.length}`);
  console.log(`Report: ${relativeToRoot(report.outputs.json)}`);
  if (!execute) console.log('Tip: add --execute to run the safe local review pipeline.');
  if (autopushStep) {
    console.log(`Autopush: ${autopushStep.status}`);
    if (autopushStep.status === 'failed') {
      console.log('Autopush failed; report was still written locally.');
      console.log(autopushStep.stderr_tail || autopushStep.stdout_tail);
    }
  }
  console.log(`Safety: no promote, no D1/R2 write, no public asset release.${autopush ? ' Guarded commit/push was explicitly requested.' : ' No commit or push.'}`);

  if (report.status === 'failed' || autopushStep?.status === 'failed') process.exitCode = 1;
}

async function readCompletedTaskIds() {
  const root = resolve(rootDir, 'out/brain-autopilot');
  const completed = new Set();
  try {
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    (state.completed_task_ids || []).forEach((id) => completed.add(id));
  } catch {
    // Runtime state is optional; historic reports below can still seed memory.
  }

  let days = [];
  try {
    days = await readdir(root, { withFileTypes: true });
  } catch {
    return completed;
  }

  for (const day of days.filter((item) => item.isDirectory())) {
    const dir = resolve(root, day.name);
    let files = [];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const file of files.filter((item) => /^brain-autopilot-.*\.json$/.test(item))) {
      try {
        const report = JSON.parse(await readFile(resolve(dir, file), 'utf8'));
        if (report.status !== 'ready_for_owner_review') continue;
        if (report.execute !== true) continue;
        (report.selected_tasks || []).forEach((task) => completed.add(task.id));
      } catch {
        // Ignore malformed historic reports; the current run will still write diagnostics.
      }
    }
  }
  return completed;
}

function selectTasks(tasks, completedTaskIds) {
  const supported = tasks
    .filter((task) => task.scope === 'entry')
    .filter((task) => !args.entry || task.entry_slug === args.entry || task.entry_id === args.entry)
    .filter((task) => !args.kind || task.kind === args.kind)
    .filter((task) => !completedTaskIds.has(task.id))
    .filter((task) => Boolean(pipelineForKind(task.kind)))
    .sort((a, b) => b.priority - a.priority || String(a.entry_title).localeCompare(String(b.entry_title)));

  return supported.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 1);
}

function planForTask(task) {
  const slug = task.entry_slug;
  const pipeline = pipelineForKind(task.kind);
  const steps = pipeline.steps(slug);
  return {
    id: pipeline.id,
    label: pipeline.label,
    purpose: pipeline.purpose,
    writes_public_database: false,
    uploads_assets: false,
    approval_required_before_promotion: true,
    selected_because: {
      task_id: task.id,
      kind: task.kind,
      priority: task.priority,
      title: task.title
    },
    steps,
    owner_review_outputs: [
      `out/brain-autopilot/${today}/`,
      `out/kosmodata-enrichment/${slug}/`,
      `archive-intake/${slug}/review/`,
      `out/archive-rights/${slug}/`,
      `archive-intake/${slug}/automation/`
    ],
    possible_owner_approval_commands: approvalCommandsFor(pipeline.id, slug)
  };
}

function approvalCommandsFor(pipelineId, slug) {
  if (['research_enrichment_pipeline', 'analysis_text_pipeline'].includes(pipelineId)) {
    return [
      `npm run kosmodata:promote -- --entry ${slug} --confirm`,
      `git add data/mock-entries.json && git commit -m "Promote ${slug} enrichment"`,
      'git push origin main'
    ];
  }

  if (pipelineId === 'model_planning_pipeline') {
    return [
      `open archive-intake/${slug}/automation/next-actions.md`,
      `open archive-intake/${slug}/automation/blender-import-profile.json`,
      'Approve model-layer schema before any public asset release.'
    ];
  }

  if (pipelineId === 'rights_review_pipeline') {
    return [
      `open out/archive-rights/${slug}/rights-report.md`,
      'Mark media as public-safe only after source/license review.',
      'Do not publish private/copyrighted assets.'
    ];
  }

  if (pipelineId === 'media_review_pipeline') {
    return [
      'Review out/hero-image-audit.json',
      'Only apply public-safe hero images with attribution.',
      'Use a manual hero override if the audit finds a project-specific public-safe image.'
    ];
  }

  return [
    `open archive-intake/${slug}/review/entry-build-review.md`,
    'Approve a targeted next action before tracked data changes.'
  ];
}

function pipelineForKind(kind) {
  const pipelines = {
    rights: {
      id: 'rights_review_pipeline',
      label: 'Rights Review Pipeline',
      purpose: 'Classify existing media/source rights, then refresh the entry build review packet.',
      steps: (slug) => [
        step('rights-gate', ['run', 'archive:rights-gate', '--', '--entry', slug], 'Writes a local rights report only.'),
        step('entry-build-review', ['run', 'cosmos:entry-build', '--', '--entry', slug, '--mode', 'review'], 'Refreshes local plan/model/text review outputs.')
      ]
    },
    research: {
      id: 'research_enrichment_pipeline',
      label: 'Research Enrichment Pipeline',
      purpose: 'Turn available source metadata and research packs into a proposed Entry update.',
      steps: (slug) => [
        step('seed-from-research', ['run', 'kosmodata:seed-from-research', '--', '--entry', slug], 'Creates a local seed candidate.'),
        step('enrichment-review', ['run', 'kosmodata:enrich', '--', '--entry', slug], 'Creates proposed-entry.json and owner review notes.'),
        step('entry-build-review', ['run', 'cosmos:entry-build', '--', '--entry', slug, '--mode', 'review'], 'Refreshes local plan/model/text review outputs.')
      ]
    },
    analysis: {
      id: 'analysis_text_pipeline',
      label: 'Analysis and Text Pipeline',
      purpose: 'Prepare architecture text, analysis filters and review packets without public promotion.',
      steps: (slug) => [
        step('seed-from-research', ['run', 'kosmodata:seed-from-research', '--', '--entry', slug], 'Creates analysis-aware seed fields.'),
        step('enrichment-review', ['run', 'kosmodata:enrich', '--', '--entry', slug], 'Creates a review-only proposed Entry.'),
        step('architecture-text', ['run', 'cosmos:text-generate', '--', '--entry', slug], 'Writes local architecture text review output.'),
        step('entry-build-review', ['run', 'cosmos:entry-build', '--', '--entry', slug, '--mode', 'review'], 'Refreshes local integrated review output.')
      ]
    },
    model: {
      id: 'model_planning_pipeline',
      label: 'Model Planning Pipeline',
      purpose: 'Prepare local Blender/ArchiCAD model layer contracts and review outputs.',
      steps: (slug) => [
        step('model-plan', ['run', 'archive:model-plan', '--', '--entry', slug], 'Writes local model package, analysis profile and Blender/ArchiCAD exchange profiles.'),
        step('model-generate-review', ['run', 'cosmos:model-generate', '--', '--entry', slug], 'Generates or plans diagrammatic model output where supported.'),
        step('entry-build-review', ['run', 'cosmos:entry-build', '--', '--entry', slug, '--mode', 'review'], 'Refreshes local integrated review output.')
      ]
    },
    media: {
      id: 'media_review_pipeline',
      label: 'Media Review Pipeline',
      purpose: 'Audit hero-image coverage and refresh the specific entry review packet.',
      steps: (slug) => [
        step('hero-audit', ['run', 'database:hero-images:audit'], 'Audits public-safe hero coverage without applying changes.'),
        step('planet-thumbnail-audit', ['run', 'database:planet-thumbnails:audit'], 'Checks planet thumbnail safety and duplicate URLs.'),
        step('entry-build-review', ['run', 'cosmos:entry-build', '--', '--entry', slug, '--mode', 'review'], 'Refreshes local entry review output.')
      ]
    },
    relations: {
      id: 'relations_review_pipeline',
      label: 'Relations Review Pipeline',
      purpose: 'Audit archive integrity and prepare a review packet for relation strengthening.',
      steps: (slug) => [
        step('archive-validate', ['run', 'archive:validate'], 'Checks relation integrity and archive schema.'),
        step('entry-build-review', ['run', 'cosmos:entry-build', '--', '--entry', slug, '--mode', 'review'], 'Refreshes local review context for relation work.')
      ]
    }
  };
  return pipelines[kind] ?? null;
}

function step(id, npmArgs, note) {
  return {
    id,
    command: `npm ${npmArgs.join(' ')}`,
    npm_args: npmArgs,
    note
  };
}

function runStep(id, npmArgs, metadata = {}) {
  const result = spawnSync('npm', npmArgs, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 16
  });

  return {
    id,
    command: `npm ${npmArgs.join(' ')}`,
    note: metadata.note,
    status: result.status === 0 ? 'passed' : 'failed',
    exit_code: result.status,
    stdout_tail: tail(result.stdout),
    stderr_tail: tail(result.stderr)
  };
}

function buildRun({ reviewStep, selected_tasks, skipped_recent_task_ids = [], runs = [], status, reason }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = resolve(outputRoot, `brain-autopilot-${timestamp}.json`);
  const mdPath = resolve(outputRoot, `brain-autopilot-${timestamp}.md`);
  return {
    generated_at: new Date().toISOString(),
    mode: 'local_review_autopilot',
    execute,
    status,
    reason,
    writes_public_database: false,
    uploads_assets: false,
    commits: autopush ? 'guarded_with_confirm_autopush' : false,
    pushes: autopush ? 'guarded_with_confirm_autopush' : false,
    approval_required_before_promotion: true,
    review_step: reviewStep,
    skipped_recent_task_ids,
    selected_tasks,
    runs,
    safety_boundary: [
      'No kosmodata:promote is run by Brain Autopilot.',
      'No tracked source file is edited by Brain Autopilot.',
      autopush
        ? 'Commit/push is allowed only through brain:autopush with --confirm-autopush after security, lint and build gates pass.'
        : 'No D1/R2 write, upload, email send, commit, push or publish is performed.',
      'No D1/R2 write, upload, email send or public asset release is performed.',
      'Generated outputs are review packs under out/ and archive-intake/.'
    ],
    outputs: {
      json: jsonPath,
      markdown: mdPath
    }
  };
}

async function writeRun(report) {
  await writeFile(report.outputs.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(report.outputs.markdown, renderMarkdown(report), 'utf8');
  await writeFile(resolve(outputRoot, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'latest.md'), renderMarkdown(report), 'utf8');
  await updateState(report);
}

async function updateState(report) {
  if (report.execute !== true) return;
  let state = {
    version: 1,
    completed_task_ids: [],
    failed_task_ids: [],
    runs: []
  };
  try {
    state = JSON.parse(await readFile(statePath, 'utf8'));
  } catch {
    // First runtime state file.
  }

  const completed = new Set(state.completed_task_ids || []);
  const failed = new Set(state.failed_task_ids || []);
  const completedRuns = (report.runs || []).filter((run) => run.status === 'ready_for_owner_review');
  const failedRuns = (report.runs || []).filter((run) => run.status === 'failed');
  completedRuns.forEach((run) => {
    completed.add(run.task.id);
    failed.delete(run.task.id);
  });
  failedRuns.forEach((run) => {
    if (!completed.has(run.task.id)) failed.add(run.task.id);
  });
  state.version = 1;
  state.updated_at = new Date().toISOString();
  state.completed_task_ids = [...completed].sort();
  state.failed_task_ids = [...failed].sort();
  state.runs = [
    ...(state.runs || []),
    {
      generated_at: report.generated_at,
      status: report.status,
      task_ids: (report.selected_tasks || []).map((task) => task.id),
      completed_task_ids: completedRuns.map((run) => run.task.id),
      failed_task_ids: failedRuns.map((run) => run.task.id),
      report: relativeToRoot(report.outputs.json)
    }
  ].slice(-50);

  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function renderMarkdown(report) {
  const lines = [
    '# Architecture Cosmos Brain Autopilot',
    '',
    `Generated: ${report.generated_at}`,
    `Mode: \`${report.mode}\``,
    `Execute: \`${report.execute}\``,
    `Status: \`${report.status}\``,
    `Writes public database: \`${report.writes_public_database}\``,
    `Uploads assets: \`${report.uploads_assets}\``,
    `Commits: \`${report.commits}\``,
    `Pushes: \`${report.pushes}\``,
    ''
  ];

  if (report.reason) lines.push(`Reason: ${report.reason}`, '');

  if (report.skipped_recent_task_ids?.length) {
    lines.push('## Recently Completed Tasks Skipped', '');
    report.skipped_recent_task_ids.slice(0, 20).forEach((id) => lines.push(`- \`${id}\``));
    if (report.skipped_recent_task_ids.length > 20) lines.push(`- ...and ${report.skipped_recent_task_ids.length - 20} more`);
    lines.push('');
  }

  lines.push('## Selected Tasks', '');
  if (!report.selected_tasks.length) {
    lines.push('- No supported entry task selected.');
  } else {
    report.selected_tasks.forEach((task, index) => {
      lines.push(`${index + 1}. **${task.title}**`);
      lines.push(`   - Entry: \`${task.entry_title}\` / \`${task.entry_slug}\``);
      lines.push(`   - Kind: \`${task.kind}\`; priority: \`${task.priority}\``);
      lines.push(`   - ${task.body}`);
    });
  }

  lines.push('', '## Runs', '');
  if (!report.runs.length) {
    lines.push('- No pipeline runs.');
  } else {
    report.runs.forEach((run, index) => {
      lines.push(`${index + 1}. **${run.plan.label}** — \`${run.status}\``);
      lines.push(`   - Purpose: ${run.plan.purpose}`);
      lines.push(`   - Executed: \`${run.executed}\``);
      lines.push('   - Steps:');
      run.plan.steps.forEach((stepItem) => {
        const executed = run.steps.find((item) => item.id === stepItem.id);
        lines.push(`     - \`${stepItem.command}\`${executed ? ` → ${executed.status}` : ''}`);
      });
      lines.push('   - Owner approval commands:');
      run.plan.possible_owner_approval_commands.forEach((command) => lines.push(`     - \`${command}\``));
    });
  }

  lines.push('', '## Safety Boundary', '');
  report.safety_boundary.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : true;
    if (next && !next.startsWith('--')) index += 1;
  }
  return parsed;
}

function tail(value = '') {
  const lines = value.trim().split('\n').filter(Boolean);
  return lines.slice(-10).join('\n');
}

function relativeToRoot(path) {
  return path.replace(`${rootDir}/`, '');
}
