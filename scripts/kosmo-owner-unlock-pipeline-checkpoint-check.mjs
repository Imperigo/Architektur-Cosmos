#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const checkpointPath = resolve(root, args.checkpoint || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-pipeline-checkpoint-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-pipeline-checkpoint-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const checkpoint = await readJson(checkpointPath);
  const checks = buildChecks(checkpoint);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_pipeline_checkpoint_guard_passed'
      : 'owner_unlock_pipeline_checkpoint_guard_failed',
    policy: {
      validates_checkpoint_only: true,
      records_decisions: false,
      writes_intake_file_now: false,
      mutates_session_files_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, checkpointPath)],
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

  console.log('Kosmo owner unlock pipeline checkpoint check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(checkpoint) {
  const hardStops = (checkpoint.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', checkpoint.status === 'owner_unlock_pipeline_checkpoint_ready', checkpoint.status),
    check('policy_checkpoint_only', checkpoint.policy?.checkpoint_only === true, checkpoint.policy?.checkpoint_only),
    check('policy_no_decisions', checkpoint.policy?.records_decisions === false, checkpoint.policy?.records_decisions),
    check('policy_no_intake_write', checkpoint.policy?.writes_intake_file_now === false, checkpoint.policy?.writes_intake_file_now),
    check('policy_no_session_mutation', checkpoint.policy?.mutates_session_files_now === false, checkpoint.policy?.mutates_session_files_now),
    check('policy_no_commands_now', checkpoint.policy?.executes_commands_now === false, checkpoint.policy?.executes_commands_now),
    check('policy_no_private_reads', checkpoint.policy?.reads_private_content_now === false, checkpoint.policy?.reads_private_content_now),
    check('policy_no_inventory_now', checkpoint.policy?.runs_private_inventory_now === false, checkpoint.policy?.runs_private_inventory_now),
    check('public_ready_zero', checkpoint.summary?.public_ready_after_checkpoint === 0, checkpoint.summary?.public_ready_after_checkpoint),
    check('nine_components', checkpoint.summary?.components === 9, checkpoint.summary?.components),
    check('all_components_ready', checkpoint.summary?.components_ready === checkpoint.summary?.components, `${checkpoint.summary?.components_ready}/${checkpoint.summary?.components}`),
    check('guard_checks_90', checkpoint.summary?.guard_checks === 90, checkpoint.summary?.guard_checks),
    check('guard_checks_all_passed', checkpoint.summary?.guard_checks_passed === checkpoint.summary?.guard_checks, `${checkpoint.summary?.guard_checks_passed}/${checkpoint.summary?.guard_checks}`),
    check('latest_handoffs_include_183_or_newer', checkpoint.summary?.latest_handoff_max >= 183, checkpoint.summary?.latest_handoff_max),
    check('owner_reply_pending', checkpoint.summary?.owner_reply_state === 'pending', checkpoint.summary?.owner_reply_state),
    check('source_root_blocked', String(checkpoint.summary?.source_root_state || '').includes('blocked'), checkpoint.summary?.source_root_state),
    check('component_public_ready_zero', (checkpoint.components || []).every((component) => component.public_ready_after_component === 0), (checkpoint.components || []).filter((component) => component.public_ready_after_component !== 0).map((component) => component.id).join(',')),
    check('hard_stop_no_approval', hardStops.includes('owner approval'), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('private content'), hardStops),
    check('hard_stop_no_inventory', hardStops.includes('private inventory'), hardStops),
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

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Pipeline Checkpoint Check');
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
