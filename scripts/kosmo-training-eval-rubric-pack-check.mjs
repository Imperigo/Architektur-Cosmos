#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const rubricPath = resolve(root, args.rubric || `data/kosmo-training-eval-rubric-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-training-eval-rubric-pack-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-training-eval-rubric-pack-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const rubric = await readJson(rubricPath);
  const checks = buildChecks(rubric);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'training_eval_rubric_pack_guard_passed'
      : 'training_eval_rubric_pack_guard_failed',
    policy: {
      validates_rubric_only: true,
      writes_training_data_now: false,
      writes_embeddings_now: false,
      runs_fine_tuning_now: false,
      reads_private_content_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, rubricPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      warnings: 0,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo training eval rubric pack check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(rubric) {
  const suiteIds = (rubric.suites || []).map((suite) => suite.id);
  const hardStops = (rubric.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', rubric.status === 'training_eval_rubric_pack_ready', rubric.status),
    check('policy_rubric_only', rubric.policy?.rubric_only === true, rubric.policy?.rubric_only),
    check('policy_no_training_now', rubric.policy?.writes_training_data_now === false, rubric.policy?.writes_training_data_now),
    check('policy_no_embeddings_now', rubric.policy?.writes_embeddings_now === false, rubric.policy?.writes_embeddings_now),
    check('policy_no_fine_tuning_now', rubric.policy?.runs_fine_tuning_now === false, rubric.policy?.runs_fine_tuning_now),
    check('policy_no_private_reads', rubric.policy?.reads_private_content_now === false, rubric.policy?.reads_private_content_now),
    check('policy_no_worker_bodies', rubric.policy?.copies_worker_output_bodies === false, rubric.policy?.copies_worker_output_bodies),
    check('public_ready_zero', rubric.summary?.public_ready_after_pack === 0, rubric.summary?.public_ready_after_pack),
    check('six_suites', rubric.summary?.suites === 6, rubric.summary?.suites),
    check('twenty_four_criteria', rubric.summary?.criteria === 24, rubric.summary?.criteria),
    check('twenty_four_eval_items', rubric.summary?.eval_items_planned === 24, rubric.summary?.eval_items_planned),
    check('expected_suites_present', [
      'source_grounding_provenance',
      'architectural_analysis_depth',
      'asset_schema_quality',
      'retrieval_answer_quality',
      'local_worker_output_review',
      'kosmo_architecture_identity'
    ].every((id) => suiteIds.includes(id)), suiteIds.join(',')),
    check('all_suites_public_ready_zero', (rubric.suites || []).every((suite) => suite.public_ready_after_suite === 0), (rubric.suites || []).filter((suite) => suite.public_ready_after_suite !== 0).map((suite) => suite.id).join(',')),
    check('training_lanes_four', rubric.summary?.training_lanes === 4, rubric.summary?.training_lanes),
    check('pilot_worker_tasks_twelve', rubric.summary?.pilot_worker_tasks === 12, rubric.summary?.pilot_worker_tasks),
    check('scoring_scale_0_3', rubric.scoring?.scale === '0-3', rubric.scoring?.scale),
    check('no_auto_public_release', rubric.scoring?.automatic_public_release_allowed === false, rubric.scoring?.automatic_public_release_allowed),
    check('hard_stop_no_training', hardStops.includes('train') && hardStops.includes('fine-tune'), hardStops),
    check('hard_stop_no_embeddings', hardStops.includes('embeddings'), hardStops),
    check('hard_stop_no_private_text', hardStops.includes('private source text'), hardStops),
    check('hard_stop_no_public_release', hardStops.includes('public-release'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Training Eval Rubric Pack Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((checkItem) => {
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${String(checkItem.evidence ?? '-')}`);
  });
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
