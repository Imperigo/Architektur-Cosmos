#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const packPath = resolve(root, args.pack || `data/kosmo-post-source-root-metadata-readiness-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-post-source-root-metadata-readiness-pack-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-post-source-root-metadata-readiness-pack-check-${dateStamp}.md`);

const expectedCommandIds = [
  'record_owner_source_root_choice',
  'source_root_decision_session_check',
  'source_root_blocker_refresh',
  'source_root_activation_preflight',
  'post_owner_activation_queue',
  'post_owner_activation_queue_check',
  'private_metadata_inventory',
  'private_metadata_inventory_check',
  'day_batch_loop'
];

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
      ? 'post_source_root_metadata_readiness_pack_guard_passed'
      : 'post_source_root_metadata_readiness_pack_guard_failed',
    policy: {
      validates_readiness_pack_only: true,
      records_decisions: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      executes_commands_now: false,
      writes_public_files: false,
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
    checks,
    next_actions: failures.length === 0
      ? [
          'Use this pack as readiness evidence only.',
          'Keep private metadata inventory blocked until explicit owner source-root selection and activation guards pass.',
          'Rerun this guard after changing readiness policy, hard stops or command order.'
        ]
      : [
          'Fix readiness pack policy, source state or command ordering before using it as Owner-Unlock evidence.',
          'Rerun npm run kosmo:post-source-root-metadata-readiness-pack and this guard.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo post-source-root metadata readiness pack check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(pack) {
  const commands = pack.command_sequence || [];
  const commandIds = commands.map((command) => command.id);
  const hardStops = (pack.hard_stops || []).join(' ').toLowerCase();
  const sourceRefs = pack.source_refs || [];
  const contract = pack.expected_private_inventory_output_contract || {};

  return [
    check('status_ready', pack.status === 'post_source_root_metadata_readiness_pack_ready', pack.status),
    check('policy_readiness_only', pack.policy?.readiness_only === true, pack.policy?.readiness_only),
    check('policy_no_decisions', pack.policy?.records_decisions === false, pack.policy?.records_decisions),
    check('policy_no_private_reads', pack.policy?.reads_private_content === false, pack.policy?.reads_private_content),
    check('policy_no_inventory_now', pack.policy?.runs_private_inventory_now === false, pack.policy?.runs_private_inventory_now),
    check('policy_no_public_writes', pack.policy?.writes_public_files === false, pack.policy?.writes_public_files),
    check('policy_public_ready_zero', pack.policy?.public_ready_after_pack === 0, pack.policy?.public_ready_after_pack),
    check('summary_public_ready_zero', pack.summary?.public_ready_after_pack === 0, pack.summary?.public_ready_after_pack),
    check('summary_failures_zero', pack.summary?.failures === 0, pack.summary?.failures),
    check('blocked_now_positive', Number(pack.summary?.blocked_now || 0) > 0, pack.summary?.blocked_now),
    check('owner_actions_positive', Number(pack.summary?.owner_actions_required || 0) > 0, pack.summary?.owner_actions_required),
    check('inventory_runner_blocked', pack.summary?.inventory_runner_status === 'private_metadata_inventory_blocked_until_activation', pack.summary?.inventory_runner_status),
    check('inventory_guard_safe_state', [
      'private_metadata_inventory_guard_passed',
      'private_metadata_inventory_guard_failed'
    ].includes(pack.summary?.inventory_guard_status), pack.summary?.inventory_guard_status),
    check('private_inventory_command_count_two', pack.summary?.private_inventory_commands_after_owner === 2, pack.summary?.private_inventory_commands_after_owner),
    check('source_refs_present', sourceRefs.length >= 4, sourceRefs.join(',')),
    check('source_refs_no_private_paths', sourceRefs.every((ref) => isPublicSafeRef(ref)), sourceRefs.join(',')),
    check('expected_command_count', commands.length === expectedCommandIds.length, commands.length),
    ...expectedCommandIds.map((id, index) => check(`command_order:${id}`, commandIds[index] === id, commandIds.join(','))),
    check('all_commands_not_executable_now', commands.every((command) => command.executable_now === false), commands.filter((command) => command.executable_now).map((command) => command.id).join(',')),
    check('all_commands_require_owner_answer', commands.every((command) => command.requires_owner_source_root_answer === true), commands.filter((command) => command.requires_owner_source_root_answer !== true).map((command) => command.id).join(',')),
    check('all_commands_public_ready_zero', commands.every((command) => command.public_ready_after_command === 0), commands.filter((command) => command.public_ready_after_command !== 0).map((command) => command.id).join(',')),
    check('private_inventory_steps_marked', commands.filter((command) => command.private_inventory_related === true).map((command) => command.id).join(',') === 'private_metadata_inventory,private_metadata_inventory_check', commands.filter((command) => command.private_inventory_related === true).map((command) => command.id).join(',')),
    check('contract_no_git_writes', contract.writes_to_git === false, contract.writes_to_git),
    check('contract_no_raw_paths', contract.contains_raw_paths === false, contract.contains_raw_paths),
    check('contract_no_file_contents', contract.contains_file_contents === false, contract.contains_file_contents),
    check('contract_no_ocr_text', contract.contains_ocr_text === false, contract.contains_ocr_text),
    check('contract_no_public_ready_true', contract.contains_public_ready_true === false, contract.contains_public_ready_true),
    check('contract_requires_inventory_guard', contract.required_guard === 'npm run kosmo:private-metadata-inventory-check', contract.required_guard),
    check('contract_output_root_not_absolute', contract.output_root === null || contract.output_root === 'private_inventory_output_root_withheld', contract.output_root),
    check('hard_stop_no_inventory_before_activation', hardStops.includes('before source-root activation preflight'), hardStops),
    check('hard_stop_no_auto_owner_decisions', hardStops.includes('owner decisions automatically'), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('private file contents') && hardStops.includes('ocr'), hardStops),
    check('hard_stop_no_private_git_copy', hardStops.includes('private inventory outputs into git'), hardStops),
    check('hard_stop_no_public_ready', hardStops.includes('public-ready'), hardStops)
  ];
}

function isPublicSafeRef(ref) {
  const value = String(ref || '');
  if (!value) return false;
  if (value.startsWith('/') || value.includes('..')) return false;
  return !/(onedrive|private[_-]?archive|workerlogs|ocr|pdf[-_ ]?text|raw[-_ ]?content)/i.test(value);
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
  lines.push('# Kosmo Post-Source-Root Metadata Readiness Pack Check');
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
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${formatEvidence(checkItem.evidence)}`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return lines.join('\n');
}

function formatEvidence(value) {
  const formatted = String(value ?? '').trim();
  return formatted.length ? formatted : '-';
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
