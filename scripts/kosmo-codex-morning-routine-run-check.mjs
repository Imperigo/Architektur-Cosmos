#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const runPath = resolve(root, args.run || `data/kosmo-codex-morning-routine-run-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-codex-morning-routine-run-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-codex-morning-routine-run-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const run = JSON.parse(await readFile(runPath, 'utf8'));
  const checks = buildChecks(run);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'codex_morning_routine_run_guard_passed'
      : 'codex_morning_routine_run_guard_failed',
    policy: {
      validates_morning_execution_evidence: true,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      installs_or_downloads_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, runPath)],
    summary: {
      run_status: run.status,
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      next_batch_mode: run.summary?.next_batch_mode || null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo Codex morning routine run check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Next batch: ${report.summary.next_batch_mode}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(run) {
  const hardStops = (run.hard_stops || []).join(' ').toLowerCase();
  return [
    check('run_ready', run.status === 'codex_morning_routine_run_ready', run.status),
    check('policy_execution_evidence', run.policy?.morning_execution_evidence === true, run.policy?.morning_execution_evidence),
    check('policy_fetch_only', run.policy?.fetches_git_remotes === true && run.policy?.pulls_or_merges_now === false, `${run.policy?.fetches_git_remotes}/${run.policy?.pulls_or_merges_now}`),
    check('policy_no_resets', run.policy?.resets_now === false, run.policy?.resets_now),
    check('policy_no_private_reads', run.policy?.reads_private_content_now === false, run.policy?.reads_private_content_now),
    check('policy_no_private_inventory', run.policy?.runs_private_inventory_now === false, run.policy?.runs_private_inventory_now),
    check('policy_no_ocr', run.policy?.runs_ocr_now === false, run.policy?.runs_ocr_now),
    check('policy_no_embeddings', run.policy?.creates_embeddings_now === false, run.policy?.creates_embeddings_now),
    check('policy_no_installs', run.policy?.installs_or_downloads_now === false, run.policy?.installs_or_downloads_now),
    check('public_ready_zero', run.summary?.public_ready_after_run === 0, run.summary?.public_ready_after_run),
    check('two_repos_checked', run.summary?.repos_checked === 2, run.summary?.repos_checked),
    check('all_fetches_succeeded', run.summary?.fetch_succeeded === run.summary?.repos_checked, `${run.summary?.fetch_succeeded}/${run.summary?.repos_checked}`),
    check('repo_no_pull_or_merge', (run.repos || []).every((repo) => repo.pulls_or_merges_now === false), (run.repos || []).map((repo) => `${repo.id}:${repo.pulls_or_merges_now}`).join(',')),
    check('repo_no_resets', (run.repos || []).every((repo) => repo.resets_now === false), (run.repos || []).map((repo) => `${repo.id}:${repo.resets_now}`).join(',')),
    check('latest_handoff_283_or_newer', run.summary?.latest_handoff >= 283, run.summary?.latest_handoff),
    check('latest_handoff_mirrored_283_or_newer', run.summary?.latest_mirrored_handoff >= 283, run.summary?.latest_mirrored_handoff),
    check('source_root_blocked_blocks_private', run.summary?.source_root_blocked !== true || run.summary?.private_processing_allowed === false, run.summary?.private_processing_allowed),
    check('innovation_signal_known', Number(run.summary?.innovation_candidates || 0) > 0, run.summary?.innovation_candidates),
    check('next_batch_known', Boolean(run.summary?.next_batch_mode), run.summary?.next_batch_mode),
    check('next_batch_has_commands', Number(run.summary?.next_batch_commands || 0) > 0, run.summary?.next_batch_commands),
    check('hard_stop_no_dirty_pull', hardStops.includes('dirty worktrees'), hardStops),
    check('hard_stop_no_broad_unlock', hardStops.includes('broad owner intent'), hardStops),
    check('hard_stop_no_private_source', hardStops.includes('private architecture source'), hardStops),
    check('hard_stop_no_install', hardStops.includes('install'), hardStops)
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Codex Morning Routine Run Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Run status: ${report.summary.run_status}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Next batch: ${report.summary.next_batch_mode}`);
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
