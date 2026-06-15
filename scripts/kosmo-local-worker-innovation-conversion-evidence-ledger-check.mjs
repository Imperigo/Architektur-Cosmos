#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const ledgerPath = resolve(root, args.ledger || `data/kosmo-local-worker-innovation-conversion-evidence-ledger-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-conversion-evidence-ledger-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-conversion-evidence-ledger-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  const checks = buildChecks(ledger);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_conversion_evidence_ledger_guard_passed'
      : 'local_worker_innovation_conversion_evidence_ledger_guard_failed',
    policy: {
      validates_ledger_only: true,
      executes_conversions_now: false,
      reads_private_content_now: false,
      writes_repo_derivatives_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, ledgerPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      ledger_status: ledger.status,
      mode: ledger.summary?.mode || null,
      ledger_entries: ledger.summary?.ledger_entries ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation conversion evidence ledger check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Mode: ${report.summary.mode}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(ledger) {
  const hardStops = (ledger.hard_stops || []).join(' ').toLowerCase();
  const entryIds = new Set((ledger.ledger_entries || []).map((entry) => entry.id));
  const sourceRefs = (ledger.source_refs || []).join(' ');
  return [
    check('status_ready', ledger.status === 'local_worker_innovation_conversion_evidence_ledger_ready', ledger.status),
    check('mode_guarded', ['waiting_for_conversion_evidence', 'ledger_ready_waiting_for_separate_apply'].includes(ledger.summary?.mode), ledger.summary?.mode),
    check('policy_ledger_only', ledger.policy?.ledger_only === true, ledger.policy?.ledger_only),
    check('policy_metadata_only', ledger.policy?.metadata_only === true, ledger.policy?.metadata_only),
    check('policy_no_apply_now', ledger.policy?.applies_conversion_now === false, ledger.policy?.applies_conversion_now),
    check('policy_no_conversion_now', ledger.policy?.executes_conversions_now === false, ledger.policy?.executes_conversions_now),
    check('policy_no_private_reads', ledger.policy?.reads_private_sources_now === false, ledger.policy?.reads_private_sources_now),
    check('policy_no_worker_execution', ledger.policy?.executes_local_workers_now === false, ledger.policy?.executes_local_workers_now),
    check('policy_no_model_start', ledger.policy?.starts_models_now === false, ledger.policy?.starts_models_now),
    check('policy_no_body_copy', ledger.policy?.copies_worker_output_body_now === false && ledger.policy?.copies_worker_recommendation_text_now === false, JSON.stringify(ledger.policy)),
    check('policy_no_repo_derivatives', ledger.policy?.writes_repo_derivatives_now === false, ledger.policy?.writes_repo_derivatives_now),
    check('policy_no_training', ledger.policy?.promotes_training_rows_now === false, ledger.policy?.promotes_training_rows_now),
    check('public_ready_zero', ledger.policy?.public_ready_after_ledger === 0 && ledger.summary?.public_ready_after_ledger === 0, ledger.summary?.public_ready_after_ledger),
    check('ledger_entries_count', ledger.summary?.ledger_entries >= 7 && (ledger.ledger_entries || []).length === ledger.summary?.ledger_entries, ledger.summary?.ledger_entries),
    check('has_validator_entry', entryIds.has('output_validator_status_recorded'), [...entryIds].join(',')),
    check('has_intake_entry', entryIds.has('post_output_intake_review_guard_recorded'), [...entryIds].join(',')),
    check('has_decision_card_entry', entryIds.has('human_overseer_decision_card_guard_recorded'), [...entryIds].join(',')),
    check('has_preview_entry', entryIds.has('conversion_plan_preview_guard_recorded'), [...entryIds].join(',')),
    check('has_apply_guard_entry', entryIds.has('conversion_apply_guard_recorded'), [...entryIds].join(',')),
    check('has_no_apply_entry', entryIds.has('no_apply_allowed_now'), [...entryIds].join(',')),
    check('entry_metadata_only', (ledger.ledger_entries || []).every((entry) => entry.metadata_only === true), 'all entries metadata-only'),
    check('entry_no_body_copy', (ledger.ledger_entries || []).every((entry) => entry.copied_worker_body_now === false && entry.copied_worker_recommendation_text_now === false), 'no entry body copy'),
    check('apply_not_allowed', ledger.summary?.apply_allowed_after_ledger === false, ledger.summary?.apply_allowed_after_ledger),
    check('conversions_zero', ledger.summary?.conversions_executed_now === 0, ledger.summary?.conversions_executed_now),
    check('repo_outputs_zero', ledger.summary?.repo_outputs_written_now === 0, ledger.summary?.repo_outputs_written_now),
    check('training_zero', ledger.summary?.training_rows_promoted_now === 0, ledger.summary?.training_rows_promoted_now),
    check('body_copy_zero', ledger.summary?.worker_output_bodies_copied_now === 0 && ledger.summary?.worker_recommendation_text_copied_now === 0, JSON.stringify(ledger.summary)),
    check('source_refs_include_apply_guard', sourceRefs.includes('conversion-apply-guard') && sourceRefs.includes('conversion-plan-preview'), sourceRefs),
    check('source_refs_include_review_chain', sourceRefs.includes('post-output-intake-review') && sourceRefs.includes('human-overseer-review-decision-card'), sourceRefs),
    check('hard_stop_no_conversion', hardStops.includes('never executes conversions'), hardStops),
    check('hard_stop_no_repo_derivatives', hardStops.includes('never writes repo derivatives'), hardStops),
    check('hard_stop_no_body_copy', hardStops.includes('never copies worker output bodies'), hardStops),
    check('hard_stop_no_training_public', hardStops.includes('training rows') && hardStops.includes('public-ready'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops)
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
  lines.push('# Kosmo Local Worker Innovation Conversion Evidence Ledger Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Ledger status: ${report.summary.ledger_status}`);
  lines.push(`- Mode: ${report.summary.mode}`);
  lines.push(`- Ledger entries: ${report.summary.ledger_entries}`);
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
    if (index + 1 < argv.length && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
