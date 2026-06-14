#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const runId = args.runId || dateStamp;

const answer = String(args.answer || '').trim();
const dryRunDir = resolve(root, args.dir || `data/owner-unlock-dry-runs/${runId}`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-answer-dry-run-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-answer-dry-run-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await mkdir(dryRunDir, { recursive: true });
  const validatorJson = resolve(dryRunDir, 'validator.json');
  const validatorMd = resolve(dryRunDir, 'validator.md');
  const validatorCheckJson = resolve(dryRunDir, 'validator-check.json');
  const validatorCheckMd = resolve(dryRunDir, 'validator-check.md');
  const intakeMapJson = resolve(dryRunDir, 'intake-map.json');
  const intakeMapMd = resolve(dryRunDir, 'intake-map.md');
  const intakeMapCheckJson = resolve(dryRunDir, 'intake-map-check.json');
  const intakeMapCheckMd = resolve(dryRunDir, 'intake-map-check.md');

  const steps = [];
  const validatorArgs = [
    'scripts/kosmo-owner-unlock-reply-validator.mjs',
    '--out',
    validatorJson,
    '--markdown',
    validatorMd
  ];
  if (answer.length > 0) validatorArgs.push('--answer', answer);
  steps.push(runStep('validator', validatorArgs));
  steps.push(runStep('validator-check', [
    'scripts/kosmo-owner-unlock-reply-validator-check.mjs',
    '--validator',
    validatorJson,
    '--out',
    validatorCheckJson,
    '--markdown',
    validatorCheckMd
  ]));
  steps.push(runStep('intake-map', [
    'scripts/kosmo-owner-unlock-reply-intake-map.mjs',
    '--validator',
    validatorJson,
    '--out',
    intakeMapJson,
    '--markdown',
    intakeMapMd
  ]));
  steps.push(runStep('intake-map-check', [
    'scripts/kosmo-owner-unlock-reply-intake-map-check.mjs',
    '--map',
    intakeMapJson,
    '--out',
    intakeMapCheckJson,
    '--markdown',
    intakeMapCheckMd
  ]));

  const validator = await readOptionalJson(validatorJson);
  const validatorCheck = await readOptionalJson(validatorCheckJson);
  const intakeMap = await readOptionalJson(intakeMapJson);
  const intakeMapCheck = await readOptionalJson(intakeMapCheckJson);
  const failures = [
    ...steps.filter((step) => step.exit_code !== 0).map((step) => `${step.id} exited ${step.exit_code}`),
    ...(validator?.failures || []),
    ...((validatorCheck?.summary?.failures || 0) > 0 ? ['validator-check reported failures'] : []),
    ...((intakeMapCheck?.summary?.failures || 0) > 0 ? ['intake-map-check reported failures'] : [])
  ];

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 && validator?.status === 'owner_unlock_reply_valid' && intakeMap?.status === 'owner_unlock_reply_intake_map_ready_for_review'
      ? 'owner_unlock_answer_dry_run_ready_for_review'
      : answer.length === 0
        ? 'owner_unlock_answer_dry_run_pending_answer'
        : 'owner_unlock_answer_dry_run_attention_required',
    policy: {
      dry_run_only: true,
      writes_isolated_reports_only: true,
      records_decisions: false,
      writes_intake_file: false,
      mutates_session_files: false,
      runs_source_root_guards: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_dry_run: 0
    },
    source_refs: [
      relative(root, validatorJson),
      relative(root, validatorCheckJson),
      relative(root, intakeMapJson),
      relative(root, intakeMapCheckJson)
    ],
    summary: {
      answer_present: answer.length > 0,
      validator_status: validator?.status || 'missing',
      validator_guard_status: validatorCheck?.status || 'missing',
      intake_map_status: intakeMap?.status || 'missing',
      intake_map_guard_status: intakeMapCheck?.status || 'missing',
      patch_operations: intakeMap?.summary?.patch_operations ?? 0,
      owner_card_patches: intakeMap?.summary?.owner_card_patches ?? 0,
      failures: failures.length,
      public_ready_after_dry_run: 0
    },
    dry_run_outputs: {
      directory: relative(root, dryRunDir),
      validator: relative(root, validatorJson),
      validator_check: relative(root, validatorCheckJson),
      intake_map: relative(root, intakeMapJson),
      intake_map_check: relative(root, intakeMapCheckJson)
    },
    steps,
    proposed_next_actions: failures.length === 0 && validator?.status === 'owner_unlock_reply_valid'
      ? [
          'Review the generated intake map before editing any intake template.',
          'If the map is accepted, apply only reviewed fields to the owner answer intake template.',
          'After the intake edit, run owner-answer-intake-check before any session plan.'
        ]
      : [
          'Do not edit intake or session files.',
          'Correct the owner reply format or wait for a valid explicit answer.'
        ],
    hard_stops: [
      'Do not treat this dry-run as applied owner approval.',
      'Do not run source-root guards from this dry-run.',
      'Do not write the intake template from this dry-run.',
      'Do not read private content.',
      'Keep public-ready at 0.'
    ],
    failures
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner unlock answer dry run');
  console.log(`Status: ${report.status}`);
  console.log(`Validator: ${report.summary.validator_status}`);
  console.log(`Intake map: ${report.summary.intake_map_status}`);
  console.log(`Patch operations: ${report.summary.patch_operations}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after dry-run: ${report.summary.public_ready_after_dry_run}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0 && answer.length > 0) process.exitCode = 1;
}

function runStep(id, commandArgs) {
  const run = spawnSync(process.execPath, commandArgs, {
    cwd: root,
    encoding: 'utf8'
  });
  return {
    id,
    exit_code: run.status ?? 1,
    command: [process.execPath, ...commandArgs].join(' '),
    stdout_tail: tail(run.stdout),
    stderr_tail: tail(run.stderr)
  };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function tail(value) {
  return String(value || '').trim().split('\n').slice(-4).join('\n');
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Answer Dry Run');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Answer present: ${report.summary.answer_present ? 'yes' : 'no'}`);
  lines.push(`- Validator: ${report.summary.validator_status}`);
  lines.push(`- Validator guard: ${report.summary.validator_guard_status}`);
  lines.push(`- Intake map: ${report.summary.intake_map_status}`);
  lines.push(`- Intake map guard: ${report.summary.intake_map_guard_status}`);
  lines.push(`- Patch operations: ${report.summary.patch_operations}`);
  lines.push(`- Owner card patches: ${report.summary.owner_card_patches}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after dry-run: ${report.summary.public_ready_after_dry_run}`);
  lines.push('');
  lines.push('## Outputs');
  lines.push('');
  Object.entries(report.dry_run_outputs).forEach(([key, value]) => lines.push(`- ${key}: \`${value}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.proposed_next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  if (report.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    report.failures.forEach((failure) => lines.push(`- ${failure}`));
    lines.push('');
  }
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
