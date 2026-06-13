#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `data/kosmodata-lane-sweep-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmodata-lane-sweep-${dateStamp}.md`);
const assetLibrary = args.assetLibrary || 'examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json';
const timeoutMs = Number(args.timeoutMs || 180000);

const steps = [
  {
    id: 'kosmoreferences_nightly_gate',
    label: 'KosmoReferences Nightly Gate',
    command: 'npm',
    args: ['run', 'kosmo:references-nightly-gate'],
    report: 'data/kosmoreferences-nightly-gate-2026-06-13.json'
  },
  {
    id: 'kosmoasset_seed_full_review',
    label: 'KosmoAsset Seed Full Review',
    command: 'npm',
    args: ['run', 'kosmo:asset-full-review', '--', '--library', assetLibrary],
    report: 'examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-full-review.generated.json'
  },
  {
    id: 'human_decision_queue',
    label: 'Human Decision Queue',
    command: 'npm',
    args: ['run', 'kosmo:human-decision-queue'],
    report: 'data/kosmo-human-decision-queue-2026-06-13.json'
  }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const startedAt = Date.now();
  const stepResults = [];
  for (const step of steps) {
    stepResults.push(await runStep(step));
  }

  const referencesGate = await readOptionalJson(resolve(root, steps[0].report));
  const referencesStatus = await readOptionalJson(resolve(root, 'data/kosmoreferences-data-lane-status.json'));
  const assetFullReview = await readOptionalJson(resolve(root, steps[1].report));
  const humanDecisionQueue = await readOptionalJson(resolve(root, steps[2].report));
  const failedSteps = stepResults.filter((step) => step.exit_code !== 0);
  const status = failedSteps.length
    ? 'kosmodata_lane_sweep_failed'
    : isReviewOnlyHealthy({ referencesGate, referencesStatus, assetFullReview, humanDecisionQueue })
      ? 'kosmodata_lane_sweep_review_only_passed'
      : 'kosmodata_lane_sweep_needs_review';

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status,
    policy: {
      review_only: true,
      public_writes_allowed: false,
      public_ready_required: 0,
      asset_public_downloads_allowed: false,
      note: 'This sweep orchestrates existing KosmoReferences and KosmoAsset gates. It does not approve, promote, upload or publish assets.'
    },
    summary: {
      duration_ms: Date.now() - startedAt,
      steps: stepResults.length,
      passed_steps: stepResults.filter((step) => step.exit_code === 0).length,
      failed_steps: failedSteps.length,
      references_status: referencesGate?.status || null,
      references_steps: referencesGate?.summary?.steps || null,
      references_passed_steps: referencesGate?.summary?.passed_steps || null,
      references_public_ready_assets: referencesGate?.summary?.public_ready_assets ?? referencesStatus?.summary?.public_ready_assets ?? null,
      references_owner_pending: referencesGate?.summary?.owner_decision_session_pending ?? referencesStatus?.summary?.owner_decision_session_pending ?? null,
      references_private_library: referencesGate?.summary?.private_library_status ?? referencesStatus?.summary?.private_library_status ?? null,
      asset_status: assetFullReview?.status || null,
      asset_steps: assetFullReview?.summary?.step_count || null,
      asset_passed_steps: assetFullReview?.summary?.passed_steps || null,
      asset_open_human_reviews: assetFullReview?.summary?.open_human_review_count ?? null,
      asset_public_ready_count: assetFullReview?.summary?.public_ready_count ?? null,
      asset_promotion_allowed: assetFullReview?.summary?.promotion_allowed === true,
      asset_promotion_blockers: assetFullReview?.summary?.promotion_guard_blockers ?? null,
      human_queue_status: humanDecisionQueue?.status || null,
      human_queue_open_items: humanDecisionQueue?.summary?.open_items ?? null,
      human_queue_reference_items: humanDecisionQueue?.summary?.reference_items ?? null,
      human_queue_asset_items: humanDecisionQueue?.summary?.asset_items ?? null
    },
    reports: {
      references_gate: steps[0].report,
      references_status: 'data/kosmoreferences-data-lane-status.json',
      asset_full_review: steps[1].report,
      human_decision_queue: steps[2].report
    },
    steps: stepResults,
    next_actions: nextActions({ failedSteps, referencesGate, referencesStatus, assetFullReview, humanDecisionQueue })
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('KosmoData lane sweep');
  console.log(`Status: ${report.status}`);
  console.log(`Steps: ${report.summary.passed_steps}/${report.summary.steps} passed`);
  console.log(`References: ${report.summary.references_status}`);
  console.log(`KosmoAsset: ${report.summary.asset_status}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failedSteps.length > 0) process.exitCode = 1;
}

async function runStep(step) {
  const startedAt = Date.now();
  const output = [];
  let timedOut = false;
  const exitCode = await new Promise((resolvePromise) => {
    const child = spawn(step.command, step.args, {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => output.push(String(chunk)));
    child.stderr.on('data', (chunk) => output.push(String(chunk)));
    child.on('error', (error) => {
      clearTimeout(timer);
      output.push(error.message);
      resolvePromise(1);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise(timedOut ? 124 : code ?? 1);
    });
  });

  return {
    id: step.id,
    label: step.label,
    command: [step.command, ...step.args].join(' '),
    report: step.report,
    started_at: new Date(startedAt).toISOString(),
    duration_ms: Date.now() - startedAt,
    exit_code: exitCode,
    status: exitCode === 0 ? 'passed' : timedOut ? 'timed_out' : 'failed',
    output_excerpt: excerpt(output.join(''))
  };
}

function isReviewOnlyHealthy({ referencesGate, referencesStatus, assetFullReview, humanDecisionQueue }) {
  const referencesOk = referencesGate?.status === 'passed_review_only' &&
    (referencesGate?.summary?.public_ready_assets ?? referencesStatus?.summary?.public_ready_assets) === 0;
  const assetOk = assetFullReview?.status === 'asset_full_review_ready_for_human_decisions' &&
    assetFullReview?.summary?.promotion_allowed !== true &&
    assetFullReview?.summary?.public_ready_count === 0;
  const queueOk = humanDecisionQueue?.status === 'human_decision_queue_open' &&
    humanDecisionQueue?.summary?.public_ready_after_queue === 0;
  return referencesOk && assetOk && queueOk;
}

function nextActions({ failedSteps, referencesGate, referencesStatus, assetFullReview, humanDecisionQueue }) {
  if (failedSteps.length > 0) return [`Fix failed sweep steps: ${failedSteps.map((step) => step.id).join(', ')}.`];
  const actions = [];
  const ownerPending = humanDecisionQueue?.summary?.reference_items ?? referencesGate?.summary?.owner_decision_session_pending ?? referencesStatus?.summary?.owner_decision_session_pending ?? 0;
  if (ownerPending > 0) actions.push(`Owner resolves ${ownerPending} KosmoReferences decisions before public promotion review.`);
  const assetOpen = humanDecisionQueue?.summary?.asset_items ?? assetFullReview?.summary?.open_human_review_count ?? 0;
  if (assetOpen > 0) actions.push(`Complete ${assetOpen} KosmoAsset human reviews before local approvals or sandbox certificates.`);
  const privateLibrary = referencesGate?.summary?.private_library_status ?? referencesStatus?.summary?.private_library_status;
  if (privateLibrary !== 'library_candidate_visible') actions.push('Expose or mount the real large private book/ETH/HSLU library root.');
  actions.push('Keep public-ready assets at 0 until separate owner and promotion reviews pass.');
  return actions;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoData Lane Sweep');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Steps passed: ${report.summary.passed_steps}/${report.summary.steps}`);
  lines.push(`- Duration: ${report.summary.duration_ms}ms`);
  lines.push(`- KosmoReferences: ${report.summary.references_status} (${report.summary.references_passed_steps}/${report.summary.references_steps})`);
  lines.push(`- References public-ready assets: ${report.summary.references_public_ready_assets}`);
  lines.push(`- References owner pending: ${report.summary.references_owner_pending}`);
  lines.push(`- Private library: ${report.summary.references_private_library}`);
  lines.push(`- KosmoAsset: ${report.summary.asset_status} (${report.summary.asset_passed_steps}/${report.summary.asset_steps})`);
  lines.push(`- KosmoAsset open human reviews: ${report.summary.asset_open_human_reviews}`);
  lines.push(`- KosmoAsset public-ready assets: ${report.summary.asset_public_ready_count}`);
  lines.push(`- KosmoAsset promotion allowed: ${report.summary.asset_promotion_allowed ? 'yes' : 'no'}`);
  lines.push(`- KosmoAsset promotion blockers: ${report.summary.asset_promotion_blockers}`);
  lines.push(`- Human decision queue: ${report.summary.human_queue_status}`);
  lines.push(`- Human decision open items: ${report.summary.human_queue_open_items}`);
  lines.push(`- Human decision split: ${report.summary.human_queue_reference_items} references / ${report.summary.human_queue_asset_items} assets`);
  lines.push('');
  lines.push('## Steps');
  lines.push('');
  lines.push('| Step | Status | Duration | Report |');
  lines.push('| --- | --- | ---: | --- |');
  report.steps.forEach((step) => {
    lines.push(`| ${step.label} | ${step.status} | ${step.duration_ms}ms | \`${step.report}\` |`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function excerpt(value) {
  const normalized = value.replace(/\r/g, '').trim();
  if (normalized.length <= 1600) return normalized;
  return `${normalized.slice(0, 900)}\n...\n${normalized.slice(-600)}`;
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
