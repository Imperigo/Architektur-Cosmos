#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const packPath = resolve(root, args.pack || `data/kosmoreferences-pilot-intake-readiness-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmoreferences-pilot-intake-readiness-pack-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmoreferences-pilot-intake-readiness-pack-check-${dateStamp}.md`);

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
      ? 'kosmoreferences_pilot_intake_readiness_pack_guard_passed'
      : 'kosmoreferences_pilot_intake_readiness_pack_guard_failed',
    policy: {
      validates_pack_only: true,
      reads_private_content: false,
      executes_local_workers: false,
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

  console.log('KosmoReferences pilot intake readiness pack check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(pack) {
  const pilots = pack.pilots || [];
  const stages = pilots.flatMap((pilot) => pilot.intake_stages || []);
  const expectedStageCount = pilots.length * 8;
  const commandText = [...(pack.command_order_after_source_root_unlock || []), ...stages.map((stage) => stage.guard)].join(' ');

  return [
    check('status_ready', pack.status === 'kosmoreferences_pilot_intake_readiness_pack_ready', pack.status),
    check('policy_readiness_only', pack.policy?.readiness_only === true, pack.policy?.readiness_only),
    check('policy_no_private_reads', pack.policy?.reads_private_content === false, pack.policy?.reads_private_content),
    check('policy_no_private_copy', pack.policy?.copies_private_content === false, pack.policy?.copies_private_content),
    check('policy_no_inventory_now', pack.policy?.runs_private_inventory_now === false, pack.policy?.runs_private_inventory_now),
    check('policy_no_local_workers_now', pack.policy?.executes_local_workers === false, pack.policy?.executes_local_workers),
    check('public_ready_zero', pack.summary?.public_ready_after_pack === 0, pack.summary?.public_ready_after_pack),
    check('three_pilots', pilots.length === 3, pilots.length),
    check('expected_stage_count', stages.length === expectedStageCount && stages.length === 24, stages.length),
    check('all_stages_blocked_now', stages.every((stage) => stage.executable_now === false), stages.filter((stage) => stage.executable_now).length),
    check('all_stages_no_private_read_now', stages.every((stage) => stage.reads_private_content_now === false), stages.filter((stage) => stage.reads_private_content_now).length),
    check('stage_public_ready_zero', stages.every((stage) => stage.public_ready_after_stage === 0), stages.filter((stage) => stage.public_ready_after_stage !== 0).length),
    check('command_order_has_private_inventory_check', (pack.command_order_after_source_root_unlock || []).includes('npm run kosmo:private-metadata-inventory-check'), commandText),
    check('command_order_has_nightly_gate', (pack.command_order_after_source_root_unlock || []).includes('npm run kosmo:references-nightly-gate'), commandText),
    check('no_forbidden_extraction_commands', !/ocr|pdf-text|extract|upload|publish|public-ready|rsync|scp|ssh/i.test(commandText), commandText),
    check('hard_stops_present', (pack.hard_stops || []).length >= 5, (pack.hard_stops || []).length)
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
  lines.push('# KosmoReferences Pilot Intake Readiness Pack Check');
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
