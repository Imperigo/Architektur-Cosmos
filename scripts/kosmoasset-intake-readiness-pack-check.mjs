#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const packPath = resolve(root, args.pack || `data/kosmoasset-intake-readiness-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmoasset-intake-readiness-pack-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmoasset-intake-readiness-pack-check-${dateStamp}.md`);

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
      ? 'kosmoasset_intake_readiness_pack_guard_passed'
      : 'kosmoasset_intake_readiness_pack_guard_failed',
    policy: {
      validates_pack_only: true,
      reads_private_content: false,
      generates_assets_now: false,
      executes_local_workers_now: false,
      uploads_allowed: false,
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

  console.log('KosmoAsset intake readiness pack check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(pack) {
  const pilotGroups = pack.pilot_asset_groups || [];
  const libraryGroups = pack.library_candidate_groups || [];
  const stages = [
    ...pilotGroups.flatMap((group) => group.stages || []),
    ...libraryGroups.flatMap((group) => group.stages || [])
  ];
  const commandText = [...(pack.command_order_after_owner_and_source_guards || []), ...stages.map((stage) => stage.guard)].join(' ');

  return [
    check('status_ready', pack.status === 'kosmoasset_intake_readiness_pack_ready', pack.status),
    check('policy_readiness_only', pack.policy?.readiness_only === true, pack.policy?.readiness_only),
    check('policy_no_private_reads', pack.policy?.reads_private_content === false, pack.policy?.reads_private_content),
    check('policy_no_private_copy', pack.policy?.copies_private_content === false, pack.policy?.copies_private_content),
    check('policy_no_private_inventory_now', pack.policy?.runs_private_inventory_now === false, pack.policy?.runs_private_inventory_now),
    check('policy_no_generation_now', pack.policy?.generates_assets_now === false, pack.policy?.generates_assets_now),
    check('policy_no_local_workers_now', pack.policy?.executes_local_workers_now === false, pack.policy?.executes_local_workers_now),
    check('policy_no_uploads', pack.policy?.uploads_allowed === false, pack.policy?.uploads_allowed),
    check('public_ready_zero', pack.summary?.public_ready_after_pack === 0, pack.summary?.public_ready_after_pack),
    check('three_pilot_asset_groups', pilotGroups.length === 3, pilotGroups.length),
    check('six_pilot_assets', pack.summary?.pilot_assets === 6, pack.summary?.pilot_assets),
    check('three_library_candidates', libraryGroups.length === 3, libraryGroups.length),
    check('nothing_executable_now', pack.summary?.executable_now === 0 && stages.every((stage) => stage.executable_now === false), pack.summary?.executable_now),
    check('no_private_read_now', stages.every((stage) => stage.reads_private_content_now === false), stages.filter((stage) => stage.reads_private_content_now).length),
    check('no_generation_now', stages.every((stage) => stage.generates_assets_now === false), stages.filter((stage) => stage.generates_assets_now).length),
    check('stage_public_ready_zero', stages.every((stage) => stage.public_ready_after_stage === 0), stages.filter((stage) => stage.public_ready_after_stage !== 0).length),
    check('command_order_has_bridge_check', (pack.command_order_after_owner_and_source_guards || []).includes('npm run kosmo:asset-reference-bridge-check'), commandText),
    check('command_order_has_taxonomy_guard', (pack.command_order_after_owner_and_source_guards || []).includes('npm run kosmo:asset-candidate-taxonomy-review-check'), commandText),
    check('no_forbidden_execution_commands', !/ocr|pdf-text|extract|upload|publish|public-ready|rsync|scp|ssh/i.test(commandText), commandText),
    check('hard_stops_present', (pack.hard_stops || []).length >= 6, (pack.hard_stops || []).length)
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
  lines.push('# KosmoAsset Intake Readiness Pack Check');
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
