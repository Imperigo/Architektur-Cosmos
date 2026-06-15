#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const checkpointPath = resolve(root, args.checkpoint || `data/kosmo-codex-loop-checkpoint-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-codex-loop-checkpoint-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-codex-loop-checkpoint-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8'));
  const findings = checkCheckpoint(checkpoint);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'codex_loop_checkpoint_guard_passed' : 'codex_loop_checkpoint_guard_failed',
    policy: {
      validates_checkpoint_only: true,
      installs_dependencies_now: false,
      downloads_models_now: false,
      reads_private_content: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, checkpointPath)],
    summary: {
      checkpoint_status: checkpoint.status,
      artifacts_found: checkpoint.summary?.artifacts_found ?? null,
      artifacts_expected: checkpoint.summary?.artifacts_expected ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo Codex loop checkpoint check');
  console.log(`Status: ${report.status}`);
  console.log(`Artifacts found: ${report.summary.artifacts_found}/${report.summary.artifacts_expected}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkCheckpoint(checkpoint) {
  const findings = [];
  expect(checkpoint.schema_version === '0.1', findings, 'schema_version', 'Checkpoint schema_version must be 0.1.');
  expect(checkpoint.status === 'codex_loop_checkpoint_ready', findings, 'checkpoint_ready', 'Checkpoint must be ready.');
  expect(checkpoint.policy?.checkpoint_only === true, findings, 'checkpoint_only', 'Checkpoint must be checkpoint-only.');
  expect(checkpoint.policy?.runs_checks_now === false, findings, 'no_check_runs', 'Checkpoint must not rerun checks.');
  expect(checkpoint.policy?.installs_dependencies_now === false, findings, 'no_installs', 'Checkpoint must not install dependencies.');
  expect(checkpoint.policy?.downloads_models_now === false, findings, 'no_downloads', 'Checkpoint must not download models.');
  expect(checkpoint.policy?.reads_private_content === false, findings, 'no_private_reads', 'Checkpoint must not read private content.');
  expect(checkpoint.policy?.public_ready_after_checkpoint === 0, findings, 'public_ready_zero', 'Checkpoint must keep public-ready at 0.');
  expect(checkpoint.summary?.artifacts_found === checkpoint.summary?.artifacts_expected, findings, 'all_artifacts_found', 'Checkpoint must find all expected artifacts.');
  expect(checkpoint.summary?.failed_guards === 0, findings, 'failed_guards_zero', 'Checkpoint failed guards must be 0.');
  expect((checkpoint.next_safe_blocks || []).length >= 3, findings, 'next_blocks_present', 'Checkpoint must include next safe blocks.');
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Codex Loop Checkpoint Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checkpoint status: ${report.summary.checkpoint_status}`);
  lines.push(`- Artifacts found: ${report.summary.artifacts_found}/${report.summary.artifacts_expected}`);
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
