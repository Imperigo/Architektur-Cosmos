#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const previewPath = resolve(root, args.preview || `data/kosmo-owner-unlock-session-edit-preview-${dateStamp}.json`);
const sessionPath = resolve(root, args.session || `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`);
const tempRoot = resolve(root, args.tempRoot || `.tmp/kosmo-owner-unlock-session-apply-guard-smoke-${dateStamp}`);
const fixtureSessionPath = resolve(tempRoot, `source-root-decision-session-${dateStamp}.json`);
const fixtureGuardJson = resolve(tempRoot, 'guard.json');
const fixtureGuardMd = resolve(tempRoot, 'guard.md');
const fixtureGuardCheckJson = resolve(tempRoot, 'guard-check.json');
const fixtureGuardCheckMd = resolve(tempRoot, 'guard-check.md');
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-session-apply-guard-smoke-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-session-apply-guard-smoke-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const preview = JSON.parse(await readFile(previewPath, 'utf8'));
  const session = JSON.parse(await readFile(sessionPath, 'utf8'));
  const sourceEdit = (preview.preview_edits || []).find((edit) => edit.id === 'source-root-session-record-preview');
  const proposed = sourceEdit?.proposed || {};
  const fixtureSession = {
    ...session,
    status: 'source_root_decision_session_recorded',
    selected_decision: proposed.selected_decision,
    selected_root_path: proposed.selected_root_path,
    owner_note: proposed.owner_note || ''
  };

  await mkdir(tempRoot, { recursive: true });
  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(fixtureSessionPath, `${JSON.stringify(fixtureSession, null, 2)}\n`);

  const guardRun = await runNode('scripts/kosmo-owner-unlock-session-apply-guard.mjs', [
    '--preview', previewPath,
    '--session', fixtureSessionPath,
    '--allowFixtureSession', 'true',
    '--out', fixtureGuardJson,
    '--markdown', fixtureGuardMd
  ]);
  const checkRun = await runNode('scripts/kosmo-owner-unlock-session-apply-guard-check.mjs', [
    '--guard', fixtureGuardJson,
    '--out', fixtureGuardCheckJson,
    '--markdown', fixtureGuardCheckMd
  ]);

  const guard = JSON.parse(await readFile(fixtureGuardJson, 'utf8'));
  const guardCheck = JSON.parse(await readFile(fixtureGuardCheckJson, 'utf8'));
  const failures = [];
  if (guard.status !== 'owner_unlock_session_apply_guard_passed_after_manual_apply') failures.push(`Fixture guard did not pass after manual apply: ${guard.status}`);
  if (guard.summary?.mode !== 'applied_matches_preview') failures.push(`Fixture guard mode mismatch: ${guard.summary?.mode}`);
  if (guard.summary?.matches_preview !== true) failures.push('Fixture guard does not match preview.');
  if (guard.summary?.private_diagnostic_allowed_after_apply !== true) failures.push('Fixture guard did not allow private diagnostic after apply.');
  if (guard.summary?.fixture_session !== true) failures.push('Fixture guard did not mark fixture_session=true.');
  if (guardCheck.status !== 'owner_unlock_session_apply_guard_check_passed') failures.push(`Fixture guard check failed: ${guardCheck.status}`);
  if (guardCheck.summary?.failures !== 0) failures.push(`Fixture guard check failures: ${guardCheck.summary?.failures}`);

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_session_apply_guard_smoke_passed'
      : 'owner_unlock_session_apply_guard_smoke_failed',
    policy: {
      fixture_only: true,
      writes_real_session: false,
      records_decisions_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      public_ready_after_smoke: 0
    },
    source_refs: [
      relative(root, previewPath),
      relative(root, sessionPath)
    ],
    temp_refs: [
      relative(root, fixtureSessionPath),
      relative(root, fixtureGuardJson),
      relative(root, fixtureGuardCheckJson)
    ],
    summary: {
      fixture_guard_status: guard.status,
      fixture_guard_check_status: guardCheck.status,
      fixture_mode: guard.summary?.mode || null,
      fixture_matches_preview: guard.summary?.matches_preview === true,
      fixture_private_diagnostic_allowed_after_apply: guard.summary?.private_diagnostic_allowed_after_apply === true,
      guard_checks: guardCheck.summary?.checks ?? null,
      guard_checks_passed: guardCheck.summary?.passed ?? null,
      failures: failures.length,
      public_ready_after_smoke: 0
    },
    command_runs: [
      sanitizeRun(guardRun),
      sanitizeRun(checkRun)
    ],
    failures
  };

  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner unlock session apply guard smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Fixture guard: ${report.summary.fixture_guard_status}`);
  console.log(`Fixture mode: ${report.summary.fixture_mode}`);
  console.log(`Private diagnostic after fixture apply: ${report.summary.fixture_private_diagnostic_allowed_after_apply ? 'yes' : 'no'}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

async function runNode(script, scriptArgs) {
  const run = await execFileAsync(process.execPath, [script, ...scriptArgs], {
    cwd: root,
    maxBuffer: 1024 * 1024 * 8
  });
  return {
    command: [process.execPath, script, ...scriptArgs].join(' '),
    stdout: run.stdout,
    stderr: run.stderr
  };
}

function sanitizeRun(run) {
  return {
    command: run.command,
    stdout_tail: run.stdout.trim().split('\n').slice(-8).join('\n'),
    stderr_tail: run.stderr.trim().split('\n').slice(-8).join('\n')
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Session Apply Guard Smoke');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Fixture guard: ${report.summary.fixture_guard_status}`);
  lines.push(`- Fixture guard check: ${report.summary.fixture_guard_check_status}`);
  lines.push(`- Fixture mode: ${report.summary.fixture_mode}`);
  lines.push(`- Fixture matches preview: ${report.summary.fixture_matches_preview ? 'yes' : 'no'}`);
  lines.push(`- Private diagnostic allowed after fixture apply: ${report.summary.fixture_private_diagnostic_allowed_after_apply ? 'yes' : 'no'}`);
  lines.push(`- Guard checks: ${report.summary.guard_checks_passed}/${report.summary.guard_checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after smoke: ${report.summary.public_ready_after_smoke}`);
  lines.push('');
  lines.push('## Temp Refs');
  lines.push('');
  report.temp_refs.forEach((ref) => lines.push(`- \`${ref}\``));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
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
