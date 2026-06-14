#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const certificatePath = resolve(root, args.certificate || `data/kosmo-evening-batch-acceptance-certificate-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-evening-batch-acceptance-certificate-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-evening-batch-acceptance-certificate-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const certificate = await readJson(certificatePath);
  const checks = buildChecks(certificate);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'evening_batch_acceptance_certificate_guard_passed'
      : 'evening_batch_acceptance_certificate_guard_failed',
    policy: {
      validates_certificate_only: true,
      reads_private_content_now: false,
      records_owner_decisions: false,
      runs_private_inventory_now: false,
      executes_local_workers_now: false,
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

  console.log('Kosmo evening batch acceptance certificate check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(certificate) {
  const hardStops = (certificate.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', certificate.status === 'evening_batch_acceptance_certificate_ready', certificate.status),
    check('policy_certificate_only', certificate.policy?.certificate_only === true, certificate.policy?.certificate_only),
    check('policy_no_private_reads', certificate.policy?.reads_private_content_now === false, certificate.policy?.reads_private_content_now),
    check('policy_no_decisions', certificate.policy?.records_owner_decisions === false, certificate.policy?.records_owner_decisions),
    check('policy_no_inventory', certificate.policy?.runs_private_inventory_now === false, certificate.policy?.runs_private_inventory_now),
    check('policy_no_workers', certificate.policy?.executes_local_workers_now === false, certificate.policy?.executes_local_workers_now),
    check('policy_no_eval_rows', certificate.policy?.creates_eval_rows_now === false, certificate.policy?.creates_eval_rows_now),
    check('policy_no_training', certificate.policy?.writes_training_data_now === false, certificate.policy?.writes_training_data_now),
    check('public_ready_zero', certificate.summary?.public_ready_after_certificate === 0, certificate.summary?.public_ready_after_certificate),
    check('five_guard_families', certificate.summary?.guard_families === 5, certificate.summary?.guard_families),
    check('all_known_guards_passed', certificate.summary?.known_guard_checks_passed === certificate.summary?.known_guard_checks_total, `${certificate.summary?.known_guard_checks_passed}/${certificate.summary?.known_guard_checks_total}`),
    check('latest_handoff_current', certificate.summary?.latest_handoff_max >= 207, certificate.summary?.latest_handoff_max),
    check('owner_reply_pending', certificate.summary?.owner_reply_status === 'pending', certificate.summary?.owner_reply_status),
    check('guard_families_no_failures', (certificate.guard_families || []).every((item) => item.failures === 0), (certificate.guard_families || []).filter((item) => item.failures !== 0).map((item) => item.id).join(',')),
    check('acceptance_mentions_source_free', String(certificate.acceptance_statement || '').includes('source-free'), certificate.acceptance_statement),
    check('hard_stop_not_owner_approval', hardStops.includes('owner approval'), hardStops),
    check('hard_stop_blocks_private_and_training', hardStops.includes('private inventory') && hardStops.includes('embeddings') && hardStops.includes('fine-tuning'), hardStops),
    check('hard_stop_blocks_eval_queue', hardStops.includes('eval rows') && hardStops.includes('queue items'), hardStops),
    check('hard_stop_public_ready_zero', hardStops.includes('public-ready'), hardStops)
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
  lines.push('# Kosmo Evening Batch Acceptance Certificate Check');
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
