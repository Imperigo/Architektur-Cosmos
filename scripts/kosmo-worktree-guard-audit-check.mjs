#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const auditPath = resolve(root, args.audit || `data/kosmo-worktree-guard-audit-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-worktree-guard-audit-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-worktree-guard-audit-check-${dateStamp}.md`);

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
      ? 'worktree_guard_audit_guard_passed'
      : 'worktree_guard_audit_guard_failed',
    policy: {
      validates_audit_only: true,
      reads_file_contents: false,
      stages_files: false,
      reverts_files: false,
      broad_stage_allowed: false,
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

  console.log('Kosmo worktree guard audit check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(audit) {
  const rules = (audit.worker_rules || []).join(' ').toLowerCase();
  const topLevelBuckets = audit.buckets?.by_top_level || [];
  return [
    check('known_status', ['worktree_guard_audit_dirty_review_required', 'worktree_guard_audit_clean'].includes(audit.status), audit.status),
    check('audit_only', audit.policy?.audit_only === true, audit.policy?.audit_only),
    check('no_file_content_reads', audit.policy?.reads_file_contents === false, audit.policy?.reads_file_contents),
    check('no_staging', audit.policy?.stages_files === false, audit.policy?.stages_files),
    check('no_reverts', audit.policy?.reverts_files === false, audit.policy?.reverts_files),
    check('broad_stage_blocked', audit.policy?.broad_stage_allowed === false && audit.summary?.broad_stage_allowed === false, `${audit.policy?.broad_stage_allowed}/${audit.summary?.broad_stage_allowed}`),
    check('public_ready_zero', audit.policy?.public_ready_after_audit === 0 && audit.summary?.public_ready_after_audit === 0, `${audit.policy?.public_ready_after_audit}/${audit.summary?.public_ready_after_audit}`),
    check('entry_counts_present', Number.isInteger(audit.summary?.entries) && Number.isInteger(audit.summary?.untracked), JSON.stringify(audit.summary || {})),
    check('top_level_buckets_present', topLevelBuckets.length === audit.summary?.top_level_buckets, `${topLevelBuckets.length}/${audit.summary?.top_level_buckets}`),
    check('rule_blocks_git_add_dot', rules.includes('git add .'), rules),
    check('rule_exact_files', rules.includes('stage exact files'), rules),
    check('rule_no_unrelated_reverts', rules.includes('do not revert unrelated'), rules)
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
  lines.push('# Kosmo Worktree Guard Audit Check');
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
