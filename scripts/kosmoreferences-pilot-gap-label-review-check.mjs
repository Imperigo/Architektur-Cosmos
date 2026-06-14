#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const reviewPath = resolve(root, args.review || `data/kosmoreferences-pilot-gap-label-review-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmoreferences-pilot-gap-label-review-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmoreferences-pilot-gap-label-review-check-${dateStamp}.md`);

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
      ? 'pilot_gap_label_review_guard_passed'
      : 'pilot_gap_label_review_guard_failed',
    policy: {
      review_only: true,
      reads_private_content: false,
      copies_private_content: false,
      extracts_pdf_or_media: false,
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

  console.log('KosmoReferences pilot gap label review check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(review) {
  const labels = review.gap_labels || [];
  return [
    check('status_ready', review.status === 'pilot_gap_label_review_ready', review.status),
    check('policy_review_only', review.policy?.review_only === true, review.policy?.review_only),
    check('policy_no_private_reads', review.policy?.reads_private_content === false, review.policy?.reads_private_content),
    check('policy_no_private_copies', review.policy?.copies_private_content === false, review.policy?.copies_private_content),
    check('policy_no_pdf_or_media_extraction', review.policy?.extracts_pdf_or_media === false, review.policy?.extracts_pdf_or_media),
    check('public_ready_zero', review.summary?.public_ready_after_review === 0 && labels.every((label) => label.public_ready_after_label === 0), review.summary?.public_ready_after_review),
    check('labels_match_summary', labels.length === review.summary?.gap_labels, `${labels.length}/${review.summary?.gap_labels}`),
    check('all_labels_have_gates', labels.every((label) => label.gate && label.severity), labels.filter((label) => !label.gate || !label.severity).length),
    check('owner_decision_count_matches', labels.filter((label) => label.owner_decision_required).length === review.summary?.owner_decisions_required, review.summary?.owner_decisions_required),
    check('hard_stops_present', (review.hard_stops || []).length >= 5, (review.hard_stops || []).length),
    check('pilot_priorities_present', (review.pilot_priorities || []).length === review.summary?.pilots, (review.pilot_priorities || []).length)
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
  lines.push('# KosmoReferences Pilot Gap Label Review Check');
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
