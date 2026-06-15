#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const cardPath = resolve(root, args.card || `data/kosmo-owner-unlock-fast-reply-card-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-fast-reply-card-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-fast-reply-card-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const card = JSON.parse(await readFile(cardPath, 'utf8'));
  const checks = buildChecks(card);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_fast_reply_card_guard_passed'
      : 'owner_unlock_fast_reply_card_guard_failed',
    policy: {
      review_only: true,
      records_owner_decision: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, cardPath)],
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

  console.log('Kosmo owner unlock fast reply card check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(card) {
  const recommended = card.recommended_reply_if_exact_root_is_true || [];
  const safeDefault = card.safe_default_reply || [];
  const hardStops = (card.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', card.status === 'owner_unlock_fast_reply_card_ready', card.status),
    check('policy_review_only', card.policy?.review_only === true, card.policy?.review_only),
    check('policy_no_decision_recording', card.policy?.records_owner_decision === false, card.policy?.records_owner_decision),
    check('policy_no_intake_mutation', card.policy?.mutates_intake_files === false, card.policy?.mutates_intake_files),
    check('policy_no_private_reads', card.policy?.reads_private_content === false, card.policy?.reads_private_content),
    check('policy_no_private_inventory', card.policy?.runs_private_inventory_now === false, card.policy?.runs_private_inventory_now),
    check('public_ready_zero', card.summary?.public_ready_after_card === 0, card.summary?.public_ready_after_card),
    check('does_not_apply_decision', card.summary?.applies_decision_now === false, card.summary?.applies_decision_now),
    check('suggests_exact_unlock_reply', recommended.includes('source_root_choice=select_exact_root_1') && recommended.includes('confirmed_exact_root=yes'), recommended.join(';')),
    check('suggests_safe_default_reply', safeDefault.includes('source_root_choice=repair_onedrive_first') && safeDefault.includes('confirmed_exact_root=no'), safeDefault.join(';')),
    check('hard_stop_no_approval', hardStops.includes('do not treat this card as owner approval'), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('do not read private content'), hardStops)
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
  lines.push('# Kosmo Owner Unlock Fast Reply Card Check');
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
