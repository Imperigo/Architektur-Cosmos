#!/usr/bin/env node

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-reply-validator-smoke-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-reply-validator-smoke-${dateStamp}.md`);
const tempRoot = resolve(root, '.tmp/kosmo-owner-unlock-reply-validator-smoke');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await rm(tempRoot, { recursive: true, force: true });
  await mkdir(tempRoot, { recursive: true });

  const cases = [
    {
      id: 'pending_no_answer',
      answer: '',
      expected_status: 'owner_unlock_reply_validator_pending_owner_reply',
      expected_exit_code: 0
    },
    {
      id: 'valid_repair_onedrive_first',
      answer: 'source_root_choice=repair_onedrive_first; confirmed_exact_root=no; review_batches=none; note=smoke',
      expected_status: 'owner_unlock_reply_valid',
      expected_exit_code: 0
    },
    {
      id: 'valid_select_exact_root_review_only',
      answer: 'source_root_choice=select_exact_root_1; confirmed_exact_root=yes; review_batches=all_review_only; note=smoke',
      expected_status: 'owner_unlock_reply_valid',
      expected_exit_code: 0
    },
    {
      id: 'invalid_unlock_without_confirmation',
      answer: 'source_root_choice=select_exact_root_1; confirmed_exact_root=no; review_batches=batch-a; note=smoke',
      expected_status: 'owner_unlock_reply_invalid',
      expected_exit_code: 1
    },
    {
      id: 'invalid_vague_all_free_grant',
      answer: 'ich gebe alles frei',
      expected_status: 'owner_unlock_reply_invalid',
      expected_exit_code: 1
    }
  ];

  const results = [];
  for (const smokeCase of cases) {
    results.push(await runCase(smokeCase));
  }

  await rm(tempRoot, { recursive: true, force: true });

  const failures = results.filter((result) => !result.passed);
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_reply_validator_smoke_passed'
      : 'owner_unlock_reply_validator_smoke_failed',
    policy: {
      smoke_only: true,
      executes_validator_cli_only: true,
      records_decisions: false,
      mutates_intake_template: false,
      mutates_session_files: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_smoke: 0
    },
    summary: {
      cases: results.length,
      passed: results.length - failures.length,
      failures: failures.length,
      expected_invalid_cases: results.filter((result) => result.expected_status === 'owner_unlock_reply_invalid').length,
      public_ready_after_smoke: 0
    },
    cases: results,
    hard_stops: [
      'Smoke cases use synthetic owner replies only.',
      'Do not copy smoke answers into owner intake files.',
      'Do not run private inventory from this smoke.',
      'Do not read private content.',
      'Keep public-ready at 0.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner unlock reply validator smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Cases: ${report.summary.passed}/${report.summary.cases}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after smoke: ${report.summary.public_ready_after_smoke}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

async function runCase(smokeCase) {
  const caseJson = resolve(tempRoot, `${smokeCase.id}.json`);
  const caseMd = resolve(tempRoot, `${smokeCase.id}.md`);
  const commandArgs = [
    'scripts/kosmo-owner-unlock-reply-validator.mjs',
    '--out',
    caseJson,
    '--markdown',
    caseMd
  ];
  if (smokeCase.answer) {
    commandArgs.push('--answer', smokeCase.answer);
  }

  const run = spawnSync(process.execPath, commandArgs, {
    cwd: root,
    encoding: 'utf8'
  });

  let actualStatus = 'missing-output';
  let failures = null;
  try {
    const output = JSON.parse(await readFile(caseJson, 'utf8'));
    actualStatus = output.status;
    failures = output.failures || [];
  } catch (error) {
    failures = [`Could not read case output: ${error.message}`];
  }

  const exitCode = run.status ?? 1;
  const passed = actualStatus === smokeCase.expected_status && exitCode === smokeCase.expected_exit_code;

  return {
    id: smokeCase.id,
    expected_status: smokeCase.expected_status,
    actual_status: actualStatus,
    expected_exit_code: smokeCase.expected_exit_code,
    actual_exit_code: exitCode,
    failures,
    passed
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Reply Validator Smoke');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Cases: ${report.summary.passed}/${report.summary.cases}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Expected invalid cases: ${report.summary.expected_invalid_cases}`);
  lines.push(`- Public-ready after smoke: ${report.summary.public_ready_after_smoke}`);
  lines.push('');
  lines.push('## Cases');
  lines.push('');
  report.cases.forEach((smokeCase) => {
    lines.push(`- ${smokeCase.passed ? 'passed' : 'failed'}: \`${smokeCase.id}\` expected \`${smokeCase.expected_status}\`, got \`${smokeCase.actual_status}\`, exit ${smokeCase.actual_exit_code}`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
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
