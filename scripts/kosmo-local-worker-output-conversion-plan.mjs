#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  taskPack: resolve(root, args.taskPack || `data/kosmo-local-worker-task-pack-${dateStamp}.json`),
  outputReview: resolve(root, args.outputReview || `data/kosmo-local-worker-output-review-${dateStamp}.json`),
  launchQueue: resolve(root, args.launchQueue || `data/kosmo-local-worker-launch-queue-${dateStamp}.json`),
  boundaryCheck: resolve(root, args.boundaryCheck || `data/kosmo-worker-boundary-pack-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-local-worker-output-conversion-plan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-output-conversion-plan-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const taskPack = await readJson(refs.taskPack);
  const outputReview = await readJson(refs.outputReview);
  const launchQueue = await readJson(refs.launchQueue);
  const boundaryCheck = await readJson(refs.boundaryCheck);

  const filesByName = new Map((outputReview.files || []).map((file) => [file.filename, file]));
  const guardPassed = boundaryCheck.status === 'worker_boundary_pack_guard_passed' &&
    boundaryCheck.summary?.failures === 0;
  const launchIdle = launchQueue.status === 'local_worker_launch_queue_idle_outputs_present' &&
    launchQueue.summary?.launchable_now === 0;

  const items = (taskPack.tasks || []).map((task) => {
    const filename = basename(task.output_path || '');
    const review = filesByName.get(filename);
    const present = review?.status === 'present';
    return {
      task_id: task.task_id,
      priority: task.priority,
      lane: task.lane,
      output_filename: filename,
      output_status: review?.status || 'unknown',
      output_bytes: review?.bytes ?? 0,
      json_status: review?.json_status || 'unknown',
      high_risk_terms: review?.high_risk_terms || [],
      conversion_status: present && guardPassed && launchIdle
        ? 'eligible_for_manual_metadata_review'
        : 'blocked_until_output_and_guard_pass',
      repo_conversion_allowed_now: false,
      required_review: [
        'human reads private output locally',
        'extract only own-written metadata-safe summary',
        'cite source reports, not private passages',
        'keep public-ready at 0'
      ]
    };
  });

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: guardPassed && launchIdle
      ? 'local_worker_output_conversion_plan_review_only'
      : 'local_worker_output_conversion_plan_blocked',
    policy: {
      metadata_only: true,
      reads_private_output_contents: false,
      copies_private_content: false,
      writes_repo_derivatives: false,
      public_ready_allowed: false,
      public_ready_after_plan: 0,
      note: 'This plan indexes local worker outputs by metadata only. It does not read private output contents or convert them into repo artifacts.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      tasks_total: items.length,
      eligible_for_manual_metadata_review: items.filter((item) => item.conversion_status === 'eligible_for_manual_metadata_review').length,
      repo_conversion_allowed_now: 0,
      high_risk_hits: outputReview.summary?.high_risk_hits ?? null,
      guard_passed: guardPassed,
      launch_idle: launchIdle,
      public_ready_after_plan: 0
    },
    items,
    next_actions: [
      'Do not copy private local worker output contents into Git.',
      'Codex/Claude may manually review private outputs locally and create separate metadata-safe repo summaries only when needed.',
      'Any future repo summary must cite this plan, the output review and the boundary guard.',
      'Keep public-ready at 0 until separate owner, provenance and rights gates pass.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker output conversion plan');
  console.log(`Status: ${report.status}`);
  console.log(`Eligible: ${report.summary.eligible_for_manual_metadata_review}/${report.summary.tasks_total}`);
  console.log(`Repo conversion allowed now: ${report.summary.repo_conversion_allowed_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Output Conversion Plan');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Tasks total: ${report.summary.tasks_total}`);
  lines.push(`- Eligible for manual metadata review: ${report.summary.eligible_for_manual_metadata_review}`);
  lines.push(`- Repo conversion allowed now: ${report.summary.repo_conversion_allowed_now}`);
  lines.push(`- High-risk hits: ${report.summary.high_risk_hits}`);
  lines.push(`- Boundary guard passed: ${report.summary.guard_passed ? 'yes' : 'no'}`);
  lines.push(`- Launch queue idle: ${report.summary.launch_idle ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after plan: ${report.summary.public_ready_after_plan}`);
  lines.push('');
  lines.push('## Items');
  lines.push('');
  lines.push('| Priority | Task | Output | Review | Conversion | Repo now |');
  lines.push('| ---: | --- | --- | --- | --- | --- |');
  for (const item of report.items) {
    lines.push(`| ${item.priority} | \`${item.task_id}\` | \`${item.output_filename}\` | ${item.output_status}/${item.json_status}/${item.high_risk_terms.length} risk | ${item.conversion_status} | ${item.repo_conversion_allowed_now ? 'yes' : 'no'} |`);
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
