#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const smokePath = resolve(root, args.smoke || `data/kosmo-owner-unlock-reply-validator-smoke-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-reply-validator-smoke-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-reply-validator-smoke-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const smoke = await readJson(smokePath);
  const checks = buildChecks(smoke);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_reply_validator_smoke_guard_passed'
      : 'owner_unlock_reply_validator_smoke_guard_failed',
    policy: {
      validates_smoke_only: true,
      records_decisions: false,
      mutates_intake_template: false,
      mutates_session_files: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, smokePath)],
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

  console.log('Kosmo owner unlock reply validator smoke check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(smoke) {
  const cases = smoke.cases || [];
  const caseById = new Map(cases.map((smokeCase) => [smokeCase.id, smokeCase]));
  const hardStops = (smoke.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_passed', smoke.status === 'owner_unlock_reply_validator_smoke_passed', smoke.status),
    check('policy_smoke_only', smoke.policy?.smoke_only === true, smoke.policy?.smoke_only),
    check('policy_validator_cli_only', smoke.policy?.executes_validator_cli_only === true, smoke.policy?.executes_validator_cli_only),
    check('policy_no_decisions', smoke.policy?.records_decisions === false, smoke.policy?.records_decisions),
    check('policy_no_intake_mutation', smoke.policy?.mutates_intake_template === false, smoke.policy?.mutates_intake_template),
    check('policy_no_session_mutation', smoke.policy?.mutates_session_files === false, smoke.policy?.mutates_session_files),
    check('policy_no_private_reads', smoke.policy?.reads_private_content === false, smoke.policy?.reads_private_content),
    check('policy_no_inventory_now', smoke.policy?.runs_private_inventory_now === false, smoke.policy?.runs_private_inventory_now),
    check('public_ready_zero', smoke.summary?.public_ready_after_smoke === 0, smoke.summary?.public_ready_after_smoke),
    check('five_cases', cases.length === 5, cases.map((smokeCase) => smokeCase.id).join(',')),
    check('all_cases_passed', cases.every((smokeCase) => smokeCase.passed === true), cases.filter((smokeCase) => !smokeCase.passed).map((smokeCase) => smokeCase.id).join(',')),
    check('pending_case_present', caseById.get('pending_no_answer')?.actual_status === 'owner_unlock_reply_validator_pending_owner_reply', caseById.get('pending_no_answer')?.actual_status),
    check('repair_case_valid', caseById.get('valid_repair_onedrive_first')?.actual_status === 'owner_unlock_reply_valid', caseById.get('valid_repair_onedrive_first')?.actual_status),
    check('select_root_case_valid', caseById.get('valid_select_exact_root_review_only')?.actual_status === 'owner_unlock_reply_valid', caseById.get('valid_select_exact_root_review_only')?.actual_status),
    check('invalid_case_rejected', caseById.get('invalid_unlock_without_confirmation')?.actual_status === 'owner_unlock_reply_invalid', caseById.get('invalid_unlock_without_confirmation')?.actual_status),
    check('invalid_case_exit_one', caseById.get('invalid_unlock_without_confirmation')?.actual_exit_code === 1, caseById.get('invalid_unlock_without_confirmation')?.actual_exit_code),
    check('vague_all_free_rejected', caseById.get('invalid_vague_all_free_grant')?.actual_status === 'owner_unlock_reply_invalid', caseById.get('invalid_vague_all_free_grant')?.actual_status),
    check('vague_all_free_exit_one', caseById.get('invalid_vague_all_free_grant')?.actual_exit_code === 1, caseById.get('invalid_vague_all_free_grant')?.actual_exit_code),
    check('two_expected_invalid_cases', smoke.summary?.expected_invalid_cases === 2, smoke.summary?.expected_invalid_cases),
    check('hard_stops_no_intake_copy', hardStops.includes('do not copy') && hardStops.includes('intake'), hardStops),
    check('hard_stops_no_inventory', hardStops.includes('private inventory'), hardStops),
    check('hard_stops_no_private_content', hardStops.includes('private content'), hardStops),
    check('hard_stops_public_ready_zero', hardStops.includes('public-ready') && hardStops.includes('0'), hardStops)
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
  lines.push('# Kosmo Owner Unlock Reply Validator Smoke Check');
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
