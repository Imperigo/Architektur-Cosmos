#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const briefPath = resolve(root, args.brief || `data/kosmo-owner-remaining-decision-brief-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-remaining-decision-brief-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-remaining-decision-brief-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const brief = await readJson(briefPath);
  const checks = buildChecks(brief);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_remaining_decision_brief_guard_passed'
      : 'owner_remaining_decision_brief_guard_failed',
    policy: {
      review_only: true,
      records_owner_decisions: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, briefPath)],
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

  console.log('Kosmo owner remaining decision brief check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(brief) {
  const decisions = brief.decisions || [];
  return [
    check('status_ready', brief.status === 'owner_remaining_decision_brief_ready', brief.status),
    check('policy_review_only', brief.policy?.review_only === true, brief.policy?.review_only),
    check('policy_no_auto_recording', brief.policy?.records_owner_decisions === false, brief.policy?.records_owner_decisions),
    check('policy_no_private_reads', brief.policy?.reads_private_content === false, brief.policy?.reads_private_content),
    check('policy_no_private_inventory', brief.policy?.runs_private_inventory_now === false, brief.policy?.runs_private_inventory_now),
    check('public_ready_zero', brief.summary?.public_ready_after_brief === 0, brief.summary?.public_ready_after_brief),
    check('decision_groups_match', decisions.length === brief.summary?.decision_groups, `${decisions.length}/${brief.summary?.decision_groups}`),
    check('open_owner_actions_bounded', Number.isInteger(brief.summary?.open_owner_actions) && brief.summary.open_owner_actions >= 1 && brief.summary.open_owner_actions <= 2, brief.summary?.open_owner_actions),
    check('source_root_choice_present', decisions.some((decision) => decision.id === 'source_root_choice'), decisions.map((decision) => decision.id).join(',')),
    check('open_review_batches_present', decisions.some((decision) => decision.id === 'open_review_batches'), decisions.map((decision) => decision.id).join(',')),
    check('hard_stops_present', (brief.hard_stops || []).length >= 5, (brief.hard_stops || []).length)
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
  lines.push('# Kosmo Owner Remaining Decision Brief Check');
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
