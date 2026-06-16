#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const auditPath = resolve(root, args.audit || `data/kosmo-cross-worker-delta-audit-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-cross-worker-delta-audit-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-cross-worker-delta-audit-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const audit = JSON.parse(await readFile(auditPath, 'utf8'));
  const checks = buildChecks(audit);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'cross_worker_delta_audit_guard_passed'
      : 'cross_worker_delta_audit_guard_failed',
    policy: {
      validates_audit_only: true,
      reads_private_content: false,
      reads_file_contents: false,
      writes_repo_code: false,
      stages_files: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, auditPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo cross-worker delta audit check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(audit) {
  const actions = (audit.next_actions || []).join(' ').toLowerCase();
  const repoIds = (audit.repos || []).map((repo) => repo.id);
  return [
    check('status_ready', audit.status === 'cross_worker_delta_audit_ready', audit.status),
    check('audit_only', audit.policy?.audit_only === true, audit.policy?.audit_only),
    check('no_private_reads', audit.policy?.reads_private_content === false, audit.policy?.reads_private_content),
    check('review_note_reads_only', audit.policy?.reads_file_contents === 'review_notes_only' && audit.policy?.reads_review_notes_only === true, `${audit.policy?.reads_file_contents}/${audit.policy?.reads_review_notes_only}`),
    check('handoff_headings_only', audit.policy?.reads_handoff_headings_only === true, audit.policy?.reads_handoff_headings_only),
    check('no_repo_writes', audit.policy?.writes_repo_code === false, audit.policy?.writes_repo_code),
    check('no_staging', audit.policy?.stages_files === false, audit.policy?.stages_files),
    check('public_ready_zero', audit.policy?.public_ready_after_audit === 0 && audit.summary?.public_ready_after_audit === 0, `${audit.policy?.public_ready_after_audit}/${audit.summary?.public_ready_after_audit}`),
    check('expected_repos_visible', repoIds.includes('architecture-cosmos') && repoIds.includes('kosmo-orbit') && audit.summary?.visible_repos === 2, `${repoIds.join(',')}/${audit.summary?.visible_repos}`),
    check('latest_handoff_present', Number(audit.summary?.latest_handoff_number) >= 300, audit.summary?.latest_handoff_number),
    check('handoffs_mirrored', audit.summary?.latest_unmirrored_handoffs === 0, audit.summary?.latest_unmirrored_handoffs),
    check('foreign_commit_review_count_present', Number.isInteger(audit.summary?.foreign_commits_needing_review), audit.summary?.foreign_commits_needing_review),
    check('review_ledger_present', audit.review_ledger?.exists === true && Number(audit.review_ledger?.files) >= 1, `${audit.review_ledger?.exists}/${audit.review_ledger?.files}`),
    check('reviewed_foreign_count_present', Number.isInteger(audit.summary?.reviewed_foreign_commits), audit.summary?.reviewed_foreign_commits),
    check('ignored_handoff_count_present', Number.isInteger(audit.summary?.foreign_handoff_commits_ignored), audit.summary?.foreign_handoff_commits_ignored),
    check('next_actions_preserve_gates', actions.includes('source-root') && actions.includes('runtime gates'), actions),
    check('next_actions_exact_staging', actions.includes('exact staging'), actions),
    check('no_failures_listed', (audit.failures || []).length === 0, (audit.failures || []).join('; '))
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
  lines.push('# Kosmo Cross-Worker Delta Audit Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((checkItem) => {
    const evidence = String(checkItem.evidence ?? '').trim() || '-';
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${evidence}`);
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
