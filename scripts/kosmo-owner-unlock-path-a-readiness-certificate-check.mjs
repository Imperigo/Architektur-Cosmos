#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const certificatePath = resolve(root, args.certificate || `data/kosmo-owner-unlock-path-a-readiness-certificate-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-path-a-readiness-certificate-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-path-a-readiness-certificate-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const certificate = JSON.parse(await readFile(certificatePath, 'utf8'));
  const checks = buildChecks(certificate);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'owner_unlock_path_a_readiness_certificate_guard_passed'
      : 'owner_unlock_path_a_readiness_certificate_guard_failed',
    policy: {
      review_only: true,
      validates_certificate_only: true,
      records_owner_decision: false,
      reads_private_content: false,
      runs_private_inventory_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, certificatePath)],
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

  console.log('Kosmo owner unlock Path A readiness certificate check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(certificate) {
  const hardStops = (certificate.hard_stops || []).join(' ').toLowerCase();
  const commands = (certificate.path_a_next_commands_after_owner_exact_reply || []).join(' ');
  return [
    check('status_ready', certificate.status === 'owner_unlock_path_a_readiness_certificate_ready', certificate.status),
    check('policy_review_only', certificate.policy?.review_only === true, certificate.policy?.review_only),
    check('policy_certificate_only', certificate.policy?.certificate_only === true, certificate.policy?.certificate_only),
    check('policy_no_decision_recording', certificate.policy?.records_owner_decision === false, certificate.policy?.records_owner_decision),
    check('policy_no_intake_write', certificate.policy?.writes_intake_file === false, certificate.policy?.writes_intake_file),
    check('policy_no_session_mutation', certificate.policy?.mutates_session_files === false, certificate.policy?.mutates_session_files),
    check('policy_no_source_root_guards_now', certificate.policy?.runs_source_root_guards === false, certificate.policy?.runs_source_root_guards),
    check('policy_no_private_reads', certificate.policy?.reads_private_content === false, certificate.policy?.reads_private_content),
    check('policy_no_private_inventory', certificate.policy?.runs_private_inventory_now === false, certificate.policy?.runs_private_inventory_now),
    check('public_ready_zero', certificate.summary?.public_ready_after_certificate === 0, certificate.summary?.public_ready_after_certificate),
    check('fast_reply_ready', certificate.summary?.fast_reply_ready === true, certificate.summary?.fast_reply_ready),
    check('exact_preview_ready', certificate.summary?.exact_reply_preview_ready === true, certificate.summary?.exact_reply_preview_ready),
    check('validator_valid', certificate.summary?.validator_status === 'owner_unlock_reply_valid', certificate.summary?.validator_status),
    check('intake_map_ready', certificate.summary?.intake_map_status === 'owner_unlock_reply_intake_map_ready_for_review', certificate.summary?.intake_map_status),
    check('patch_operations_present', (certificate.summary?.patch_operations ?? 0) > 0, certificate.summary?.patch_operations),
    check('does_not_apply_decision', certificate.summary?.applies_decision_now === false, certificate.summary?.applies_decision_now),
    check('commands_keep_validator_first', commands.includes('owner-unlock-reply-validator') && commands.indexOf('owner-unlock-reply-validator') < commands.indexOf('source-root-decision-session-check'), commands),
    check('hard_stop_no_approval', hardStops.includes('do not treat this certificate as owner approval'), hardStops),
    check('hard_stop_no_auto_patch', hardStops.includes('do not apply the preview patch operations automatically'), hardStops),
    check('hard_stop_no_private_content', hardStops.includes('do not read private content'), hardStops),
    check('hard_stop_public_ready_zero', hardStops.includes('public-ready') && hardStops.includes('0'), hardStops)
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
  lines.push('# Kosmo Owner Unlock Path A Readiness Certificate Check');
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
