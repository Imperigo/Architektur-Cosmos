#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-full-review.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-full-review.generated.md');

const steps = [
  {
    id: 'library_check',
    label: 'Library Check',
    script: 'kosmo:asset-library-check',
    report: 'review/asset-library-check.generated.json'
  },
  {
    id: 'export_plan',
    label: 'Export Plan',
    script: 'kosmo:asset-export-plan',
    report: 'review/asset-export-plan.generated.json'
  },
  {
    id: 'review_pack',
    label: 'Review Pack',
    script: 'kosmo:asset-review-pack',
    report: 'review/asset-review-pack.generated.json'
  },
  {
    id: 'exchange_profile',
    label: 'Exchange Profile',
    script: 'kosmo:asset-exchange-profile',
    report: 'review/asset-exchange-profile.generated.json'
  },
  {
    id: 'handoff_bundle',
    label: 'Handoff Bundle',
    script: 'kosmo:asset-handoff-bundle',
    report: 'review/asset-handoff-bundle.generated.json'
  },
  {
    id: 'handoff_smoke',
    label: 'Handoff Smoke',
    script: 'kosmo:asset-handoff-smoke',
    report: 'review/asset-handoff-smoke.generated.json'
  },
  {
    id: 'human_review_session',
    label: 'Human Review Session',
    script: 'kosmo:asset-human-review-session',
    report: 'review/asset-human-review-session.generated.json'
  }
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);

  const stepRows = [];
  for (const step of steps) {
    const row = runStep(step);
    stepRows.push(row);
    if (row.status !== 'passed' && !args['continue-on-failure']) break;
  }

  const report = buildReport(stepRows);
  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoAsset full review');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Steps: ${report.summary.passed_steps}/${report.summary.step_count} passed`);
  console.log(`Open human reviews: ${report.summary.open_human_review_count}`);
  console.log(`Blocked routes: ${report.summary.blocked_route_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.summary.failed_steps > 0) process.exit(1);
}

function runStep(step) {
  const command = ['npm', 'run', step.script, '--', '--library', relative(root, libraryPath)];
  const result = spawnSync(command[0], command.slice(1), {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const reportPath = resolve(libraryRoot, step.report);
  const report = existsSync(reportPath) ? readJson(reportPath) : null;

  return {
    id: step.id,
    label: step.label,
    command: command.join(' '),
    status: result.status === 0 ? 'passed' : 'failed',
    exit_code: result.status,
    report_path: relative(root, reportPath),
    report_exists: Boolean(report),
    report_status: report?.status || null,
    stdout_tail: tail(result.stdout),
    stderr_tail: tail(result.stderr)
  };
}

function buildReport(stepRows) {
  const library = readJson(libraryPath);
  const libraryCheck = readOptionalReport('review/asset-library-check.generated.json');
  const exportPlan = readOptionalReport('review/asset-export-plan.generated.json');
  const reviewPack = readOptionalReport('review/asset-review-pack.generated.json');
  const exchangeProfile = readOptionalReport('review/asset-exchange-profile.generated.json');
  const handoffBundle = readOptionalReport('review/asset-handoff-bundle.generated.json');
  const handoffSmoke = readOptionalReport('review/asset-handoff-smoke.generated.json');
  const humanReviewSession = readOptionalReport('review/asset-human-review-session.generated.json');
  const failedSteps = stepRows.filter((step) => step.status !== 'passed');
  const openHumanReviews = reviewPack?.summary?.open_human_review_count || 0;
  const status = failedSteps.length
    ? 'asset_full_review_failed'
    : openHumanReviews > 0
      ? 'asset_full_review_ready_for_human_decisions'
      : 'asset_full_review_passed';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-full-review',
    library_path: relative(root, libraryPath),
    library_id: library.library_id || null,
    status,
    policy: {
      no_uploads: true,
      no_public_downloads: true,
      no_d1_writes: true,
      no_r2_writes: true,
      review_does_not_approve_public_use: true,
      human_decisions_required_for_local_approval: true
    },
    summary: {
      step_count: stepRows.length,
      passed_steps: stepRows.filter((step) => step.status === 'passed').length,
      failed_steps: failedSteps.length,
      asset_count: library.assets?.length || 0,
      local_ready_count: reviewPack?.summary?.local_ready_count || 0,
      public_ready_count: reviewPack?.summary?.public_ready_count || 0,
      open_human_review_count: openHumanReviews,
      library_check_status: libraryCheck?.status || null,
      generated_profile_count: reviewPack?.summary?.generated_profile_count || 0,
      blocked_route_count: exportPlan?.summary?.blocked_route_count || reviewPack?.summary?.blocked_route_count || 0,
      needs_review_route_count: reviewPack?.summary?.needs_review_route_count || exportPlan?.summary?.review_route_count || 0,
      blender_profile_count: exchangeProfile?.summary?.blender_profile_count || 0,
      archicad_profile_count: exchangeProfile?.summary?.archicad_profile_count || 0,
      handoff_blender_rows: handoffBundle?.summary?.blender_row_count || 0,
      handoff_archicad_rows: handoffBundle?.summary?.archicad_row_count || 0,
      handoff_smoke_failures: handoffSmoke?.summary?.failure_count ?? null,
      human_review_session_status: humanReviewSession?.status || null,
      human_review_session_open_items: humanReviewSession?.summary?.open_item_count ?? openHumanReviews
    },
    outputs: {
      full_review_json: relative(root, outputJsonPath),
      full_review_markdown: relative(root, outputMdPath),
      library_check: reviewPath('asset-library-check.generated.md'),
      export_plan: reviewPath('asset-export-plan.generated.md'),
      review_pack: reviewPath('asset-review-pack.generated.md'),
      exchange_profile: reviewPath('asset-exchange-profile.generated.md'),
      handoff_bundle: reviewPath('asset-handoff-bundle.generated.md'),
      handoff_smoke: reviewPath('asset-handoff-smoke.generated.md'),
      human_review_session: reviewPath('asset-human-review-session.generated.md')
    },
    steps: stepRows,
    assets: fullReviewAssets({ library, reviewPack, exchangeProfile, handoffBundle, humanReviewSession }),
    next_actions: nextActions({ failedSteps, openHumanReviews })
  };
}

function fullReviewAssets({ library, reviewPack, exchangeProfile, handoffBundle, humanReviewSession }) {
  const reviewRows = new Map((reviewPack?.assets || []).map((asset) => [asset.id, asset]));
  const exchangeRows = new Map((exchangeProfile?.assets || []).map((asset) => [asset.id, asset]));
  const handoffRows = new Map((handoffBundle?.assets || []).map((asset) => [asset.id, asset]));
  const sessionRows = new Map((humanReviewSession?.assets || []).map((asset) => [asset.id, asset]));
  return (library.assets || []).map((asset) => {
    const review = reviewRows.get(asset.id);
    const exchange = exchangeRows.get(asset.id);
    const handoff = handoffRows.get(asset.id);
    const session = sessionRows.get(asset.id);
    return {
      id: asset.id,
      title: asset.title,
      asset_type: asset.asset_type,
      rights_status: asset.rights_status,
      review_status: asset.review_status,
      human_review_status: review?.human_review_status || 'unknown',
      public_gate: handoff?.public_gate || exchange?.public_gate || 'unknown',
      local_ready: Boolean(review?.local_ready),
      blender: Boolean(exchange?.blender || handoff?.blender),
      archicad: Boolean(exchange?.archicad || handoff?.archicad),
      web: Boolean(exchange?.web || handoff?.web),
      suggested_decision: review?.suggested_decision || null,
      review_priority: session?.review_priority || null,
      primary_review_route: session?.primary_route || null
    };
  });
}

function nextActions({ failedSteps, openHumanReviews }) {
  if (failedSteps.length) {
    return [
      `Fix failed step '${failedSteps[0].label}' before using this asset library in handoff workflows.`,
      'Keep public gates blocked until the full review passes again.'
    ];
  }
  const actions = ['Use this full-review report as the evening batch checkpoint for KosmoAsset.'];
  if (openHumanReviews > 0) {
    actions.push('Complete asset-human-review-session.generated.md before recording explicit local decisions per asset/route.');
  }
  actions.push('Keep public downloads, R2 uploads and D1 writes disabled.');
  return actions;
}

function readOptionalReport(reportPath) {
  const pathname = resolve(libraryRoot, reportPath);
  return existsSync(pathname) ? readJson(pathname) : null;
}

function reviewPath(filename) {
  return relative(root, resolve(libraryRoot, 'review', filename));
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function tail(output) {
  return String(output || '')
    .trim()
    .split('\n')
    .slice(-8)
    .join('\n');
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoAsset Full Review',
    '',
    `Library: \`${report.library_id}\``,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Review-only evening batch. This command runs the local KosmoAsset review chain and does not upload, publish, write D1/R2 or approve public use.',
    '',
    '## Summary',
    '',
    `- steps: ${report.summary.passed_steps}/${report.summary.step_count}`,
    `- assets: ${report.summary.asset_count}`,
    `- local ready: ${report.summary.local_ready_count}`,
    `- public ready: ${report.summary.public_ready_count}`,
    `- open human reviews: ${report.summary.open_human_review_count}`,
    `- generated profiles: ${report.summary.generated_profile_count}`,
    `- blocked routes: ${report.summary.blocked_route_count}`,
    `- needs-review routes: ${report.summary.needs_review_route_count}`,
    `- Blender profiles: ${report.summary.blender_profile_count}`,
    `- ArchiCAD profiles: ${report.summary.archicad_profile_count}`,
    `- Handoff smoke failures: ${report.summary.handoff_smoke_failures ?? '-'}`,
    `- human review session: ${report.summary.human_review_session_status || '-'}`,
    `- human review session open items: ${report.summary.human_review_session_open_items}`,
    '',
    '## Steps',
    '',
    '| Step | Status | Report |',
    '| --- | --- | --- |'
  ];

  for (const step of report.steps) {
    lines.push(`| ${escapePipe(step.label)} | ${escapePipe(step.status)} | \`${escapePipe(step.report_path)}\` |`);
  }

  lines.push('', '## Assets', '', '| Asset | Human Review | Priority | Route | Public Gate | Blender | ArchiCAD | Suggested Decision |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const asset of report.assets) {
    lines.push(`| ${escapePipe(asset.title)} | ${escapePipe(asset.human_review_status)} | ${escapePipe(asset.review_priority || '-')} | ${escapePipe(asset.primary_review_route || '-')} | ${escapePipe(asset.public_gate)} | ${asset.blender ? 'yes' : 'no'} | ${asset.archicad ? 'yes' : 'no'} | ${escapePipe(asset.suggested_decision || '-')} |`);
  }

  lines.push('', '## Outputs', '');
  Object.entries(report.outputs).forEach(([key, value]) => lines.push(`- ${key}: \`${value}\``));
  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
