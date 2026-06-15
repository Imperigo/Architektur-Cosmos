#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const matrixPath = resolve(root, args.matrix || `data/kosmo-innovation-github-promotion-matrix-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-promotion-matrix-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-promotion-matrix-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
  const checks = buildChecks(matrix);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'innovation_github_promotion_matrix_guard_passed'
      : 'innovation_github_promotion_matrix_guard_failed',
    policy: {
      validates_matrix_only: true,
      source_free_only: true,
      reads_private_content: false,
      installs_or_downloads: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, matrixPath)],
    summary: {
      matrix_status: matrix.status,
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      promotable_source_free: matrix.summary?.promotable_source_free ?? null,
      held_items: matrix.summary?.held_items ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub promotion matrix check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(matrix) {
  const hardStops = (matrix.hard_stops || []).join(' ').toLowerCase();
  const commands = (matrix.next_source_free_sequence || []).join(' ').toLowerCase();
  const promotionItems = matrix.promotion_items || [];
  const heldItems = matrix.held_items || [];
  const allItems = [...promotionItems, ...heldItems];
  return [
    check('matrix_ready', matrix.status === 'innovation_github_promotion_matrix_ready', matrix.status),
    check('policy_matrix_only', matrix.policy?.matrix_only === true, matrix.policy?.matrix_only),
    check('policy_source_free', matrix.policy?.source_free_only === true, matrix.policy?.source_free_only),
    check('policy_no_clone', matrix.policy?.clones_repositories_now === false, matrix.policy?.clones_repositories_now),
    check('policy_no_code_copy', matrix.policy?.copies_github_code === false, matrix.policy?.copies_github_code),
    check('policy_no_raw_readme', matrix.policy?.stores_raw_readme_content === false, matrix.policy?.stores_raw_readme_content),
    check('policy_no_installs', matrix.policy?.installs_dependencies_now === false, matrix.policy?.installs_dependencies_now),
    check('policy_no_downloads', matrix.policy?.downloads_models_now === false, matrix.policy?.downloads_models_now),
    check('policy_no_run_code', matrix.policy?.runs_discovered_code_now === false, matrix.policy?.runs_discovered_code_now),
    check('policy_no_private_reads', matrix.policy?.reads_private_content === false, matrix.policy?.reads_private_content),
    check('policy_no_training_rows', matrix.policy?.creates_training_rows_now === false, matrix.policy?.creates_training_rows_now),
    check('policy_no_embeddings', matrix.policy?.creates_embeddings_now === false, matrix.policy?.creates_embeddings_now),
    check('public_ready_zero', matrix.summary?.public_ready_after_matrix === 0, matrix.summary?.public_ready_after_matrix),
    check('has_review_queue_items', Number(matrix.summary?.review_queue_items || 0) >= 1, matrix.summary?.review_queue_items),
    check('has_contract_plans', Number(matrix.summary?.contract_plans || 0) >= 1, matrix.summary?.contract_plans),
    check('promotable_matches_contracts', matrix.summary?.promotable_source_free === matrix.summary?.contract_plans, `${matrix.summary?.promotable_source_free}/${matrix.summary?.contract_plans}`),
    check('target_lanes_at_least_three', Number(matrix.summary?.target_lanes || 0) >= 3, matrix.summary?.target_lanes),
    check('training_lanes_linked_at_least_three', Number(matrix.summary?.training_lanes_linked || 0) >= 3, matrix.summary?.training_lanes_linked),
    check('next_batch_source_free', matrix.summary?.next_batch_mode === 'source_free_innovation_and_guarding', matrix.summary?.next_batch_mode),
    check('executable_now_zero', matrix.summary?.executable_now === 0, matrix.summary?.executable_now),
    check('no_failures', matrix.summary?.failures === 0, matrix.summary?.failures),
    check('promotion_items_source_free', promotionItems.every((item) => item.source_free_promotable === true), promotionItems.map((item) => `${item.id}:${item.source_free_promotable}`).join(',')),
    check('promotion_items_have_fixture_root', promotionItems.every((item) => String(item.fixture_root || '').startsWith('examples/kosmo-innovation-fixtures/')), promotionItems.map((item) => item.fixture_root).join(',')),
    check('promotion_items_have_training_lane', promotionItems.every((item) => Boolean(item.training_eval_lane)), promotionItems.map((item) => item.training_eval_lane).join(',')),
    check('promotion_items_have_ontology_bindings', promotionItems.every((item) => (item.ontology_bindings?.entities || []).length > 0 && (item.ontology_bindings?.relations || []).length > 0), promotionItems.map((item) => item.id).join(',')),
    check('items_execute_now_false', allItems.every((item) => item.execute_now === false), allItems.map((item) => `${item.id}:${item.execute_now}`).join(',')),
    check('items_local_worker_blocked', allItems.every((item) => item.local_worker_allowed_now === false), allItems.map((item) => `${item.id}:${item.local_worker_allowed_now}`).join(',')),
    check('items_private_blocked', allItems.every((item) => item.private_content_allowed === false), allItems.map((item) => `${item.id}:${item.private_content_allowed}`).join(',')),
    check('items_public_ready_zero', allItems.every((item) => item.public_ready_after_item === 0), allItems.map((item) => `${item.id}:${item.public_ready_after_item}`).join(',')),
    check('sequence_has_fixture_skeletons', commands.includes('innovation-github-fixture-skeletons'), commands),
    check('sequence_has_payload_smoke', commands.includes('innovation-github-fixture-payload-smoke'), commands),
    check('sequence_has_training_eval_queue', commands.includes('training-eval-review-queue-plan'), commands),
    check('sequence_has_ontology_seed', commands.includes('architecture-ontology-seed'), commands),
    check('sequence_no_forbidden_runtime', !/(git clone|gh repo clone|pip install|npm install|ollama pull|huggingface-cli|hf download)/.test(commands), commands),
    check('hard_stop_no_clone', hardStops.includes('clone'), hardStops),
    check('hard_stop_no_copy', hardStops.includes('copy github source code'), hardStops),
    check('hard_stop_no_private_training', hardStops.includes('private-derived training rows'), hardStops),
    check('hard_stop_no_install_download', hardStops.includes('install') && hardStops.includes('download'), hardStops),
    check('hard_stop_no_public_ready', hardStops.includes('public-ready'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Promotion Matrix Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Matrix status: ${report.summary.matrix_status}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Promotable source-free: ${report.summary.promotable_source_free}`);
  lines.push(`- Held items: ${report.summary.held_items}`);
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
