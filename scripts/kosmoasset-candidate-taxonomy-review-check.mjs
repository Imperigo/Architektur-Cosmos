#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const reviewPath = resolve(root, args.review || `data/kosmoasset-candidate-taxonomy-review-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmoasset-candidate-taxonomy-review-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmoasset-candidate-taxonomy-review-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const review = await readJson(reviewPath);
  const checks = buildChecks(review);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'kosmoasset_candidate_taxonomy_review_guard_passed'
      : 'kosmoasset_candidate_taxonomy_review_guard_failed',
    policy: {
      review_only: true,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, reviewPath)],
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

  console.log('KosmoAsset candidate taxonomy review check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(review) {
  const candidates = review.candidate_reviews || [];
  return [
    check('status_ready', review.status === 'kosmoasset_candidate_taxonomy_review_ready', review.status),
    check('policy_review_only', review.policy?.review_only === true, review.policy?.review_only),
    check('policy_no_private_reads', review.policy?.reads_private_content === false, review.policy?.reads_private_content),
    check('policy_no_private_copies', review.policy?.copies_private_content === false, review.policy?.copies_private_content),
    check('policy_no_private_inventory_now', review.policy?.runs_private_inventory_now === false, review.policy?.runs_private_inventory_now),
    check('policy_no_private_paths_in_reviews', review.policy?.includes_private_paths === false && candidates.every((candidate) => !('path' in candidate)), review.policy?.includes_private_paths),
    check('public_ready_zero', review.summary?.public_ready_after_review === 0 && candidates.every((candidate) => candidate.public_ready_after_review === 0), review.summary?.public_ready_after_review),
    check('asset_use_blocked_now', candidates.every((candidate) => candidate.asset_use_allowed_now === false), candidates.filter((candidate) => candidate.asset_use_allowed_now).length),
    check('candidate_count_matches_summary', candidates.length === review.summary?.candidate_reviews, `${candidates.length}/${review.summary?.candidate_reviews}`),
    check('owner_confirmations_present', candidates.every((candidate) => candidate.required_confirmation), candidates.filter((candidate) => !candidate.required_confirmation).length),
    check('lane_definitions_present', (review.lane_definitions || []).length >= 3, (review.lane_definitions || []).length),
    check('hard_stops_present', (review.hard_stops || []).length >= 5, (review.hard_stops || []).length)
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
  lines.push('# KosmoAsset Candidate Taxonomy Review Check');
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
