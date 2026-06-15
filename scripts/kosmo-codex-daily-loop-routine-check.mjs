#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const routinePath = resolve(root, args.routine || `data/kosmo-codex-daily-loop-routine-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-codex-daily-loop-routine-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-codex-daily-loop-routine-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const routine = JSON.parse(await readFile(routinePath, 'utf8'));
  const findings = checkRoutine(routine);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'codex_daily_loop_routine_guard_passed' : 'codex_daily_loop_routine_guard_failed',
    policy: {
      validates_autonomous_loop_contract: true,
      installs_downloads_require_explicit_batch: true,
      reads_private_content: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, routinePath)],
    summary: {
      routine_status: routine.status,
      morning_steps: routine.morning_routine?.length ?? null,
      today_priorities: routine.today_loop_priorities?.length ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo Codex daily loop routine check');
  console.log(`Status: ${report.status}`);
  console.log(`Morning steps: ${report.summary.morning_steps}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkRoutine(routine) {
  const findings = [];
  const morningIds = new Set((routine.morning_routine || []).map((item) => item.id));
  const todayIds = new Set((routine.today_loop_priorities || []).map((item) => item.id));
  expect(routine.schema_version === '0.1', findings, 'schema_version', 'Routine schema_version must be 0.1.');
  expect(routine.status === 'codex_daily_loop_routine_ready', findings, 'routine_ready', 'Routine must be ready.');
  expect(routine.policy?.max_tick_minutes <= 2, findings, 'tick_limit', 'Routine must keep tick interval at or below two minutes.');
  expect(routine.policy?.avoids_idle_wait === true, findings, 'no_idle_wait', 'Routine must avoid idle wait.');
  expect(routine.policy?.no_unrelated_reverts === true, findings, 'no_unrelated_reverts', 'Routine must protect unrelated dirty work.');
  expect(routine.policy?.no_private_processing_without_source_root_unlock === true, findings, 'source_root_gate', 'Routine must gate private processing on Source Root unlock.');
  expect(routine.policy?.installs_downloads_require_explicit_batch === true, findings, 'install_batch_gate', 'Routine must require explicit install/download batch.');
  expect(routine.policy?.public_ready_after_routine === 0, findings, 'public_ready_zero', 'Routine must keep public-ready at 0.');
  ['repo_state_scan', 'handoff_intake', 'source_root_gate', 'orbit_health', 'innovation_watch', 'priority_pick', 'commit_push'].forEach((id) => {
    expect(morningIds.has(id), findings, `morning_step:${id}`, `Morning routine must include ${id}.`);
  });
  ['finish_dependency_lane', 'source_independent_progress', 'cleanup_and_guarding'].forEach((id) => {
    expect(todayIds.has(id), findings, `today_priority:${id}`, `Today loop priorities must include ${id}.`);
  });
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Codex Daily Loop Routine Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Routine status: ${report.summary.routine_status}`);
  lines.push(`- Morning steps: ${report.summary.morning_steps}`);
  lines.push(`- Today priorities: ${report.summary.today_priorities}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`));
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
