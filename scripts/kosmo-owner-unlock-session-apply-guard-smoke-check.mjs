#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const smokePath = resolve(root, args.smoke || `data/kosmo-owner-unlock-session-apply-guard-smoke-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-session-apply-guard-smoke-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-session-apply-guard-smoke-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const smoke = JSON.parse(await readFile(smokePath, 'utf8'));
  const checks = buildChecks(smoke);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_session_apply_guard_smoke_check_passed'
      : 'owner_unlock_session_apply_guard_smoke_check_failed',
    policy: {
      validates_smoke_only: true,
      writes_real_session: false,
      records_decisions_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, smokePath)],
    summary: {
      smoke_status: smoke.status,
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

  console.log('Kosmo owner unlock session apply guard smoke check');
  console.log(`Status: ${report.status}`);
  console.log(`Smoke: ${report.summary.smoke_status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(smoke) {
  return [
    check('status_passed', smoke.status === 'owner_unlock_session_apply_guard_smoke_passed', smoke.status),
    check('policy_fixture_only', smoke.policy?.fixture_only === true, smoke.policy?.fixture_only),
    check('policy_no_real_session_write', smoke.policy?.writes_real_session === false, smoke.policy?.writes_real_session),
    check('policy_no_decisions_now', smoke.policy?.records_decisions_now === false, smoke.policy?.records_decisions_now),
    check('policy_no_private_reads', smoke.policy?.reads_private_content_now === false, smoke.policy?.reads_private_content_now),
    check('policy_no_private_inventory', smoke.policy?.runs_private_inventory_now === false, smoke.policy?.runs_private_inventory_now),
    check('public_ready_zero', smoke.summary?.public_ready_after_smoke === 0, smoke.summary?.public_ready_after_smoke),
    check('fixture_guard_passed_after_apply', smoke.summary?.fixture_guard_status === 'owner_unlock_session_apply_guard_passed_after_manual_apply', smoke.summary?.fixture_guard_status),
    check('fixture_guard_check_passed', smoke.summary?.fixture_guard_check_status === 'owner_unlock_session_apply_guard_check_passed', smoke.summary?.fixture_guard_check_status),
    check('fixture_mode_applied', smoke.summary?.fixture_mode === 'applied_matches_preview', smoke.summary?.fixture_mode),
    check('fixture_matches_preview', smoke.summary?.fixture_matches_preview === true, smoke.summary?.fixture_matches_preview),
    check('fixture_allows_private_diagnostic', smoke.summary?.fixture_private_diagnostic_allowed_after_apply === true, smoke.summary?.fixture_private_diagnostic_allowed_after_apply),
    check('guard_checks_all_passed', smoke.summary?.guard_checks === smoke.summary?.guard_checks_passed && smoke.summary?.guard_checks >= 18, `${smoke.summary?.guard_checks_passed}/${smoke.summary?.guard_checks}`),
    check('temp_refs_are_tmp', (smoke.temp_refs || []).every((ref) => ref.startsWith('.tmp/')), (smoke.temp_refs || []).join(',')),
    check('no_failures', smoke.summary?.failures === 0 && (smoke.failures || []).length === 0, smoke.summary?.failures)
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
  lines.push('# Kosmo Owner Unlock Session Apply Guard Smoke Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Smoke status: ${report.summary.smoke_status}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
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
