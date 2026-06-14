#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const matrixPath = resolve(root, args.matrix || `data/kosmo-post-unlock-pilot-execution-matrix-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-post-unlock-pilot-execution-matrix-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-post-unlock-pilot-execution-matrix-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const matrix = await readJson(matrixPath);
  const checks = buildChecks(matrix);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'post_unlock_pilot_execution_matrix_guard_passed'
      : 'post_unlock_pilot_execution_matrix_guard_failed',
    policy: {
      validates_matrix_only: true,
      executes_commands_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, matrixPath)],
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

  console.log('Kosmo post-unlock pilot execution matrix check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(matrix) {
  const hardStops = (matrix.hard_stops || []).join(' ').toLowerCase();
  const commandIds = (matrix.command_sequence || []).map((command) => command.id);
  return [
    check('status_ready', matrix.status === 'post_unlock_pilot_execution_matrix_ready', matrix.status),
    check('policy_matrix_only', matrix.policy?.matrix_only === true, matrix.policy?.matrix_only),
    check('policy_no_commands_now', matrix.policy?.executes_commands_now === false, matrix.policy?.executes_commands_now),
    check('policy_no_private_reads', matrix.policy?.reads_private_content_now === false, matrix.policy?.reads_private_content_now),
    check('policy_no_inventory_now', matrix.policy?.runs_private_inventory_now === false, matrix.policy?.runs_private_inventory_now),
    check('policy_no_mutation_now', matrix.policy?.mutates_pilot_packages_now === false, matrix.policy?.mutates_pilot_packages_now),
    check('public_ready_zero', matrix.summary?.public_ready_after_matrix === 0, matrix.summary?.public_ready_after_matrix),
    check('three_pilots', matrix.summary?.pilots === 3, matrix.summary?.pilots),
    check('twenty_four_reference_stages', matrix.summary?.reference_stages === 24, matrix.summary?.reference_stages),
    check('twenty_four_reference_stages_blocked', matrix.summary?.reference_blocked_now === 24, matrix.summary?.reference_blocked_now),
    check('eighteen_asset_stages', matrix.summary?.asset_stages === 18, matrix.summary?.asset_stages),
    check('six_assets', matrix.summary?.asset_count === 6, matrix.summary?.asset_count),
    check('ten_command_steps', matrix.summary?.command_sequence_steps === 10, matrix.summary?.command_sequence_steps),
    check('starts_with_dry_run', commandIds[0] === 'owner_answer_dry_run', commandIds.join(',')),
    check('includes_private_metadata_inventory', commandIds.includes('private_metadata_inventory'), commandIds.join(',')),
    check('all_commands_not_executable_now', (matrix.command_sequence || []).every((command) => command.executable_now === false), (matrix.command_sequence || []).filter((command) => command.executable_now).map((command) => command.id).join(',')),
    check('owner_unlock_checkpoint_ready', matrix.summary?.owner_unlock_components_ready === 11 && matrix.summary?.owner_unlock_guard_checks_passed === 113, `${matrix.summary?.owner_unlock_components_ready}/${matrix.summary?.owner_unlock_guard_checks_passed}`),
    check('all_pilots_public_ready_zero', (matrix.pilots || []).every((pilot) => pilot.public_ready_after_pilot === 0), (matrix.pilots || []).filter((pilot) => pilot.public_ready_after_pilot !== 0).map((pilot) => pilot.id).join(',')),
    check('hard_stop_no_inventory', hardStops.includes('private inventory'), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('private content'), hardStops),
    check('hard_stop_no_asset_generation', hardStops.includes('generate assets'), hardStops),
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
  lines.push('# Kosmo Post-Unlock Pilot Execution Matrix Check');
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
