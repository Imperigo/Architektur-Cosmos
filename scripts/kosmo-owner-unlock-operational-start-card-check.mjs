#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const cardPath = resolve(root, args.card || `data/kosmo-owner-unlock-operational-start-card-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-operational-start-card-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-operational-start-card-check-${dateStamp}.md`);

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
      ? 'owner_unlock_operational_start_card_guard_passed'
      : 'owner_unlock_operational_start_card_guard_failed',
    policy: {
      validates_card_only: true,
      records_decisions: false,
      writes_intake_now: false,
      writes_session_files_now: false,
      executes_commands_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, cardPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner unlock operational start card check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(card) {
  const commands = (card.next_commands_after_exact_reply || []).join(' ');
  const blocked = (card.blocked_commands_until_guards_pass || []).join(' ').toLowerCase();
  const hardStops = (card.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', card.status === 'owner_unlock_operational_start_card_ready', card.status),
    check('policy_card_only', card.policy?.card_only === true, card.policy?.card_only),
    check('policy_no_decisions', card.policy?.records_decisions === false, card.policy?.records_decisions),
    check('policy_no_intake_write', card.policy?.writes_intake_now === false, card.policy?.writes_intake_now),
    check('policy_no_session_write', card.policy?.writes_session_files_now === false, card.policy?.writes_session_files_now),
    check('policy_no_execute_now', card.policy?.executes_commands_now === false, card.policy?.executes_commands_now),
    check('policy_no_private_reads', card.policy?.reads_private_content_now === false, card.policy?.reads_private_content_now),
    check('policy_no_private_inventory', card.policy?.runs_private_inventory_now === false, card.policy?.runs_private_inventory_now),
    check('public_ready_zero', card.summary?.public_ready_after_card === 0, card.summary?.public_ready_after_card),
    check('all_components_ready', card.summary?.ready_components === card.summary?.components && card.summary?.components === 6, `${card.summary?.ready_components}/${card.summary?.components}`),
    check('checkpoint_green', ratioIsComplete(card.summary?.checkpoint_guards), card.summary?.checkpoint_guards),
    check('owner_reply_not_applied', card.summary?.owner_reply_state === 'broad_intent_seen_exact_reply_not_applied', card.summary?.owner_reply_state),
    check('source_root_blocked', card.summary?.source_root_state === 'blocked_until_explicit_owner_reply_and_guards', card.summary?.source_root_state),
    check('selected_root_exists_preview', card.summary?.selected_root_exists_preview === true, card.summary?.selected_root_exists_preview),
    check('current_session_file', card.summary?.expected_session_file === `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`, card.summary?.expected_session_file),
    check('queue_fully_blocked', card.summary?.post_owner_queue_executable_now === 0 && card.summary?.post_owner_queue_blocked_now === card.summary?.post_owner_queue_steps, `${card.summary?.post_owner_queue_executable_now}/${card.summary?.post_owner_queue_blocked_now}/${card.summary?.post_owner_queue_steps}`),
    check('exact_reply_has_root_choice', String(card.exact_owner_reply_template || '').includes('source_root_choice=select_exact_root_1'), card.exact_owner_reply_template),
    check('exact_reply_has_confirmed_yes', String(card.exact_owner_reply_template || '').includes('confirmed_exact_root=yes'), card.exact_owner_reply_template),
    check('exact_reply_has_assets_path', String(card.exact_owner_reply_template || '').includes('/mnt/archiv/ArchitekturKosmos/Assets'), card.exact_owner_reply_template),
    check('next_commands_start_validator', (card.next_commands_after_exact_reply || [])[0]?.includes('owner-unlock-reply-validator'), (card.next_commands_after_exact_reply || [])[0]),
    check('next_commands_include_dry_run', commands.includes('owner-unlock-answer-dry-run'), commands),
    check('next_commands_include_current_session_preview', commands.includes('owner-unlock-session-edit-preview'), commands),
    check('next_commands_include_post_owner_queue_check', commands.includes('source-root-post-owner-activation-queue-check'), commands),
    check('blocked_private_inventory', blocked.includes('private-metadata-inventory'), blocked),
    check('blocked_private_ocr', blocked.includes('ocr'), blocked),
    check('hard_stop_freeform_not_exact', hardStops.includes('freeform'), hardStops),
    check('hard_stop_no_writes', hardStops.includes('write intake') && hardStops.includes('session'), hardStops),
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

function ratioIsComplete(value) {
  const match = String(value || '').match(/^(\d+)\/(\d+)$/);
  if (!match) return false;
  return Number(match[1]) === Number(match[2]) && Number(match[2]) > 0;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Operational Start Card Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
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
