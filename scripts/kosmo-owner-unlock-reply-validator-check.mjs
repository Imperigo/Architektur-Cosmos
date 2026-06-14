#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const validatorPath = resolve(root, args.validator || `data/kosmo-owner-unlock-reply-validator-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-reply-validator-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-reply-validator-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const validator = await readJson(validatorPath);
  const checks = buildChecks(validator);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_reply_validator_guard_passed'
      : 'owner_unlock_reply_validator_guard_failed',
    policy: {
      validates_reply_validator_only: true,
      records_decisions: false,
      mutates_intake_template: false,
      mutates_session_files: false,
      executes_commands: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, validatorPath)],
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

  console.log('Kosmo owner unlock reply validator check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(validator) {
  const hardStops = (validator.hard_stops || []).join(' ').toLowerCase();
  const requiredFormat = validator.required_format || [];
  const knownStatuses = [
    'owner_unlock_reply_validator_pending_owner_reply',
    'owner_unlock_reply_valid'
  ];

  return [
    check('status_pending_or_valid', knownStatuses.includes(validator.status), validator.status),
    check('pending_answer_contract', validator.status !== 'owner_unlock_reply_validator_pending_owner_reply' || validator.summary?.answer_present === false, validator.summary?.answer_present),
    check('valid_answer_contract', validator.status !== 'owner_unlock_reply_valid' || validator.summary?.answer_present === true, validator.summary?.answer_present),
    check('policy_validator_only', validator.policy?.validator_only === true, validator.policy?.validator_only),
    check('policy_no_decision_recording', validator.policy?.records_decisions === false, validator.policy?.records_decisions),
    check('policy_no_intake_mutation', validator.policy?.mutates_intake_template === false, validator.policy?.mutates_intake_template),
    check('policy_no_session_mutation', validator.policy?.mutates_session_files === false, validator.policy?.mutates_session_files),
    check('policy_no_commands', validator.policy?.executes_commands === false, validator.policy?.executes_commands),
    check('policy_no_private_reads', validator.policy?.reads_private_content === false, validator.policy?.reads_private_content),
    check('policy_no_inventory_now', validator.policy?.runs_private_inventory_now === false, validator.policy?.runs_private_inventory_now),
    check('policy_public_ready_zero', validator.policy?.public_ready_after_validation === 0, validator.policy?.public_ready_after_validation),
    check('summary_public_ready_zero', validator.summary?.public_ready_after_validation === 0, validator.summary?.public_ready_after_validation),
    check('three_source_root_choices', validator.summary?.source_root_choices === 3, validator.summary?.source_root_choices),
    check('five_review_batch_cards', validator.summary?.review_batch_choices === 5, validator.summary?.review_batch_choices),
    check('required_format_complete', requiredFormat.length >= 4, requiredFormat.join('; ')),
    check('required_format_has_source_root', requiredFormat.some((line) => line.includes('source_root_choice')), requiredFormat.join('; ')),
    check('required_format_has_confirmed_root', requiredFormat.some((line) => line.includes('confirmed_exact_root')), requiredFormat.join('; ')),
    check('required_format_has_review_batches', requiredFormat.some((line) => line.includes('review_batches')), requiredFormat.join('; ')),
    check('hard_stop_no_decision_application', hardStops.includes('valid reply') && hardStops.includes('applied decision'), hardStops),
    check('hard_stop_no_mutation', hardStops.includes('mutate intake') && hardStops.includes('session files'), hardStops),
    check('hard_stop_no_commands', hardStops.includes('run commands'), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('private content'), hardStops),
    check('hard_stop_public_ready_zero', hardStops.includes('public-ready') && hardStops.includes('0'), hardStops),
    check('no_failures_for_guarded_state', (validator.failures || []).length === 0, (validator.failures || []).join('; '))
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
  lines.push('# Kosmo Owner Unlock Reply Validator Check');
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
