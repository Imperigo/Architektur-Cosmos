#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const packPath = resolve(root, args.pack || `data/kosmo-owner-unlock-prompt-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-prompt-pack-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-prompt-pack-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pack = await readJson(packPath);
  const checks = buildChecks(pack);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_prompt_pack_guard_passed'
      : 'owner_unlock_prompt_pack_guard_failed',
    policy: {
      validates_prompt_only: true,
      records_decisions: false,
      mutates_intake_template: false,
      executes_commands: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, packPath)],
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

  console.log('Kosmo owner unlock prompt pack check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(pack) {
  const sourceRootQuestion = (pack.questions || []).find((question) => question.id === 'source_root_choice');
  const reviewBatchQuestion = (pack.questions || []).find((question) => question.id === 'review_batch_scope');
  const answers = sourceRootQuestion?.allowed_answers || [];
  const hardStops = (pack.hard_stops || []).join(' ').toLowerCase();
  const promptText = (pack.prompt_blocks || []).flatMap((block) => block.lines || []).join(' ');
  return [
    check('status_ready', pack.status === 'owner_unlock_prompt_pack_ready', pack.status),
    check('policy_prompt_only', pack.policy?.prompt_only === true, pack.policy?.prompt_only),
    check('policy_no_decision_recording', pack.policy?.records_decisions === false, pack.policy?.records_decisions),
    check('policy_no_intake_mutation', pack.policy?.mutates_intake_template === false, pack.policy?.mutates_intake_template),
    check('policy_no_commands', pack.policy?.executes_commands === false, pack.policy?.executes_commands),
    check('policy_no_private_reads', pack.policy?.reads_private_content === false, pack.policy?.reads_private_content),
    check('policy_no_inventory_now', pack.policy?.runs_private_inventory_now === false, pack.policy?.runs_private_inventory_now),
    check('public_ready_zero', pack.summary?.public_ready_after_pack === 0, pack.summary?.public_ready_after_pack),
    check('two_questions', (pack.questions || []).length === 2, (pack.questions || []).length),
    check('source_root_required', sourceRootQuestion?.required === true, sourceRootQuestion?.required),
    check('review_batch_optional', reviewBatchQuestion?.required === false, reviewBatchQuestion?.required),
    check('three_source_root_choices', answers.length === 3, answers.map((answer) => answer.answer).join(',')),
    check('expected_source_root_choices', ['keep_blocked', 'repair_onedrive_first', 'select_exact_root_1'].every((choice) => answers.some((answer) => answer.answer === choice)), answers.map((answer) => answer.answer).join(',')),
    check('one_unlock_choice', answers.filter((answer) => answer.unlocks_metadata_inventory_after_guards).length === 1, answers.filter((answer) => answer.unlocks_metadata_inventory_after_guards).map((answer) => answer.answer).join(',')),
    check('five_review_batches', (reviewBatchQuestion?.allowed_answers || []).length === 5, (reviewBatchQuestion?.allowed_answers || []).length),
    check('sixteen_review_items', pack.summary?.review_items === 16, pack.summary?.review_items),
    check('prompt_has_safe_default', promptText.includes('source_root_choice=repair_onedrive_first') && promptText.includes('confirmed_exact_root=no'), promptText),
    check('prompt_has_unlock_example_with_yes', promptText.includes('source_root_choice=select_exact_root_1') && promptText.includes('confirmed_exact_root=yes'), promptText),
    check('hard_stops_no_private_work', hardStops.includes('private inventory') && hardStops.includes('ocr') && hardStops.includes('public-ready'), hardStops),
    check('pipeline_requires_recorded_answer', (pack.after_owner_reply_pipeline || []).join(' ').toLowerCase().includes('explicit owner answers'), (pack.after_owner_reply_pipeline || []).join(' '))
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
  lines.push('# Kosmo Owner Unlock Prompt Pack Check');
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
