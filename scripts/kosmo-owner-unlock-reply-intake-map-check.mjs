#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const mapPath = resolve(root, args.map || `data/kosmo-owner-unlock-reply-intake-map-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-reply-intake-map-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-reply-intake-map-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const map = await readJson(mapPath);
  const checks = buildChecks(map);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_reply_intake_map_guard_passed'
      : 'owner_unlock_reply_intake_map_guard_failed',
    policy: {
      validates_map_only: true,
      writes_intake_file: false,
      records_decisions: false,
      mutates_session_files: false,
      executes_commands: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, mapPath)],
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

  console.log('Kosmo owner unlock reply intake map check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(map) {
  const hardStops = (map.hard_stops || []).join(' ').toLowerCase();
  const validStatuses = [
    'owner_unlock_reply_intake_map_ready_for_review',
    'owner_unlock_reply_intake_map_blocked_by_invalid_reply',
    'owner_unlock_reply_intake_map_pending_owner_reply'
  ];
  return [
    check('status_known', validStatuses.includes(map.status), map.status),
    check('policy_map_only', map.policy?.map_only === true, map.policy?.map_only),
    check('policy_no_intake_write', map.policy?.writes_intake_file === false, map.policy?.writes_intake_file),
    check('policy_no_decision_recording', map.policy?.records_decisions === false, map.policy?.records_decisions),
    check('policy_no_session_mutation', map.policy?.mutates_session_files === false, map.policy?.mutates_session_files),
    check('policy_no_commands', map.policy?.executes_commands === false, map.policy?.executes_commands),
    check('policy_no_private_reads', map.policy?.reads_private_content === false, map.policy?.reads_private_content),
    check('policy_no_inventory_now', map.policy?.runs_private_inventory_now === false, map.policy?.runs_private_inventory_now),
    check('public_ready_zero', map.summary?.public_ready_after_map === 0, map.summary?.public_ready_after_map),
    check('pending_has_no_patch', map.status !== 'owner_unlock_reply_intake_map_pending_owner_reply' || map.summary?.patch_operations === 0, map.summary?.patch_operations),
    check('invalid_has_no_patch', map.status !== 'owner_unlock_reply_intake_map_blocked_by_invalid_reply' || map.summary?.patch_operations === 0, map.summary?.patch_operations),
    check('ready_has_source_root_patch', map.status !== 'owner_unlock_reply_intake_map_ready_for_review' || Boolean(map.proposed_intake_patch?.source_root_answer?.selected_decision), map.proposed_intake_patch?.source_root_answer?.selected_decision),
    check('owner_card_patches_template_allowed', (map.proposed_intake_patch?.owner_card_answers || []).every((patch) => patch.allowed_by_template === true), (map.proposed_intake_patch?.owner_card_answers || []).filter((patch) => patch.allowed_by_template !== true).map((patch) => patch.batch_id).join(',')),
    check('reference_decisions_empty', (map.proposed_intake_patch?.reference_decision_answers || []).length === 0, (map.proposed_intake_patch?.reference_decision_answers || []).length),
    check('hard_stop_no_auto_apply', hardStops.includes('do not apply'), hardStops),
    check('hard_stop_no_intake_write', hardStops.includes('intake file'), hardStops),
    check('hard_stop_no_session_mutation', hardStops.includes('session files'), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('private content'), hardStops),
    check('hard_stop_no_inventory', hardStops.includes('private inventory'), hardStops),
    check('hard_stop_public_ready_zero', hardStops.includes('public-ready') && hardStops.includes('0'), hardStops)
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
  lines.push('# Kosmo Owner Unlock Reply Intake Map Check');
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
