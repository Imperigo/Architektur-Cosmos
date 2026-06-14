#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const briefPath = resolve(root, args.brief || `data/kosmo-overseer-next-shift-brief-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-overseer-next-shift-brief-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-overseer-next-shift-brief-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const brief = await readJson(briefPath);
  const checks = buildChecks(brief);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'overseer_next_shift_brief_guard_passed'
      : 'overseer_next_shift_brief_guard_failed',
    policy: {
      validates_brief_only: true,
      reads_private_content: false,
      records_owner_decisions: false,
      executes_commands: false,
      runs_private_inventory_now: false,
      executes_local_workers_now: false,
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

  console.log('Kosmo overseer next shift brief check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(brief) {
  const allActions = [...(brief.claude_actions || []), ...(brief.codex_actions || [])];
  const hardStops = (brief.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', brief.status === 'overseer_next_shift_brief_ready', brief.status),
    check('policy_brief_only', brief.policy?.brief_only === true, brief.policy?.brief_only),
    check('policy_no_private_reads', brief.policy?.reads_private_content === false, brief.policy?.reads_private_content),
    check('policy_no_decisions', brief.policy?.records_owner_decisions === false, brief.policy?.records_owner_decisions),
    check('policy_no_session_mutation', brief.policy?.mutates_session_files === false, brief.policy?.mutates_session_files),
    check('policy_no_commands', brief.policy?.executes_commands === false, brief.policy?.executes_commands),
    check('policy_no_inventory_now', brief.policy?.runs_private_inventory_now === false, brief.policy?.runs_private_inventory_now),
    check('policy_no_workers_now', brief.policy?.executes_local_workers_now === false, brief.policy?.executes_local_workers_now),
    check('public_ready_zero', brief.summary?.public_ready_after_brief === 0, brief.summary?.public_ready_after_brief),
    check('five_completed_packs', (brief.completed_packs || []).length === 5, (brief.completed_packs || []).length),
    check('four_claude_actions', (brief.claude_actions || []).length === 4, (brief.claude_actions || []).length),
    check('three_codex_actions', (brief.codex_actions || []).length === 3, (brief.codex_actions || []).length),
    check('actions_not_executable', allActions.every((action) => action.executable_now === false), allActions.filter((action) => action.executable_now).map((action) => action.id).join(',')),
    check('action_public_ready_zero', allActions.every((action) => action.public_ready_after_action === 0), allActions.filter((action) => action.public_ready_after_action !== 0).map((action) => action.id).join(',')),
    check('owner_prompt_format_present', (brief.owner_prompt?.required_owner_reply_format || []).length >= 4, (brief.owner_prompt?.required_owner_reply_format || []).join(',')),
    check('tomorrow_sequence_guarded', (brief.tomorrow_first_sequence_after_owner_answer || []).includes('npm run kosmo:source-root-activation-preflight'), (brief.tomorrow_first_sequence_after_owner_answer || []).join(',')),
    check('hard_stops_no_private_work', hardStops.includes('do not infer') && hardStops.includes('private inventory') && hardStops.includes('local workers'), hardStops),
    check('hard_stops_public_ready', hardStops.includes('public-ready'), hardStops)
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
  lines.push('# Kosmo Overseer Next Shift Brief Check');
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
