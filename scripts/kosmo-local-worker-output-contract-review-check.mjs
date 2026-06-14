#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const reviewPath = resolve(root, args.review || `data/kosmo-local-worker-output-contract-review-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-output-contract-review-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-output-contract-review-check-${dateStamp}.md`);

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
      ? 'local_worker_output_contract_review_guard_passed'
      : 'local_worker_output_contract_review_guard_failed',
    policy: {
      review_only: true,
      reads_private_output_bodies: false,
      executes_local_workers: false,
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

  console.log('Kosmo local worker output contract review check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(review) {
  const contracts = review.contracts || [];
  return [
    check('status_ready', review.status === 'local_worker_output_contract_review_ready', review.status),
    check('policy_review_only', review.policy?.review_only === true, review.policy?.review_only),
    check('policy_no_private_body_reads', review.policy?.reads_private_output_bodies === false, review.policy?.reads_private_output_bodies),
    check('policy_no_private_body_copies', review.policy?.copies_private_output_bodies === false, review.policy?.copies_private_output_bodies),
    check('policy_no_worker_execution', review.policy?.executes_local_workers === false, review.policy?.executes_local_workers),
    check('public_ready_zero', review.summary?.public_ready_after_review === 0 && contracts.every((contract) => contract.public_ready_after_contract === 0), review.summary?.public_ready_after_review),
    check('repo_conversion_zero', review.summary?.repo_conversion_allowed_now === 0 && contracts.every((contract) => contract.repo_conversion_allowed_now === false), review.summary?.repo_conversion_allowed_now),
    check('execute_allowed_zero', review.summary?.execute_allowed_now === 0, review.summary?.execute_allowed_now),
    check('contracts_match_summary', contracts.length === review.summary?.contracts, `${contracts.length}/${review.summary?.contracts}`),
    check('contracts_have_next_gates', contracts.every((contract) => contract.required_next_gate), contracts.filter((contract) => !contract.required_next_gate).length),
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
  lines.push('# Kosmo Local Worker Output Contract Review Check');
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
