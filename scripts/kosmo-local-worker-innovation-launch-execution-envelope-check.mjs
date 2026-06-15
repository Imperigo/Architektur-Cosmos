#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const envelopePath = resolve(root, args.envelope || `data/kosmo-local-worker-innovation-launch-execution-envelope-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-innovation-launch-execution-envelope-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-innovation-launch-execution-envelope-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const envelope = JSON.parse(await readFile(envelopePath, 'utf8'));
  const checks = buildChecks(envelope);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'local_worker_innovation_launch_execution_envelope_guard_passed'
      : 'local_worker_innovation_launch_execution_envelope_guard_failed',
    policy: {
      validates_envelope_only: true,
      executes_local_workers_now: false,
      starts_models_now: false,
      reads_private_content_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, envelopePath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      envelope_status: envelope.status,
      mode: envelope.summary?.mode || null,
      output_slots: envelope.summary?.output_slots ?? null,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker innovation launch execution envelope check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Mode: ${report.summary.mode}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(envelope) {
  const slots = envelope.slots || [];
  const hardStops = (envelope.hard_stops || []).join(' ').toLowerCase();
  const requiredFields = envelope.slot_contract?.required_fields_after_future_write || [];
  const forbiddenFields = envelope.slot_contract?.forbidden_fields_after_future_write || [];
  return [
    check('status_prepared', envelope.status === 'local_worker_innovation_launch_execution_envelope_prepared', envelope.status),
    check('policy_envelope_only', envelope.policy?.envelope_only === true, envelope.policy?.envelope_only),
    check('policy_slots_only', envelope.policy?.creates_output_slots_only === true, envelope.policy?.creates_output_slots_only),
    check('policy_no_execution', envelope.policy?.executes_local_workers_now === false, envelope.policy?.executes_local_workers_now),
    check('policy_no_model_start', envelope.policy?.starts_models_now === false, envelope.policy?.starts_models_now),
    check('policy_no_private_reads', envelope.policy?.reads_private_content_now === false, envelope.policy?.reads_private_content_now),
    check('policy_no_worker_outputs', envelope.policy?.writes_worker_outputs_now === false, envelope.policy?.writes_worker_outputs_now),
    check('policy_no_repo_outputs', envelope.policy?.writes_repo_outputs_now === false, envelope.policy?.writes_repo_outputs_now),
    check('policy_no_training_promotion', envelope.policy?.promotes_training_rows_now === false, envelope.policy?.promotes_training_rows_now),
    check('public_ready_zero', envelope.policy?.public_ready_after_envelope === 0 && envelope.summary?.public_ready_after_envelope === 0, envelope.summary?.public_ready_after_envelope),
    check('five_empty_slots', envelope.summary?.output_slots === 5 && envelope.summary?.empty_slots === 5 && slots.length === 5, `${slots.length}/${envelope.summary?.output_slots}`),
    check('slots_empty_held', slots.every((slot) => slot.status === 'empty_held'), slots.map((slot) => slot.status).join(', ')),
    check('slots_write_false', slots.every((slot) => slot.writes_now === false && slot.execute_now === false), slots.length),
    check('slots_public_ready_zero', slots.every((slot) => slot.public_ready_after_slot === 0), slots.length),
    check('slot_paths_are_templates', slots.every((slot) => String(slot.output_path_template || '').includes('data/local-worker-innovation-outputs/') && String(slot.markdown_path_template || '').includes('docs/codex/local-worker-innovation-outputs/')), slots.length),
    check('required_fields_include_validator', requiredFields.includes('validation_status') && requiredFields.includes('public_ready_after_validation'), requiredFields.join(', ')),
    check('forbidden_private_fields', forbiddenFields.includes('private_pdf_text') && forbiddenFields.includes('onedrive_file_content'), forbiddenFields.join(', ')),
    check('validator_after_write_required', envelope.slot_contract?.required_validator_after_future_write === 'npm run kosmo:local-worker-innovation-output-validator', envelope.slot_contract?.required_validator_after_future_write),
    check('summary_no_execution', envelope.summary?.executable_now === false && envelope.summary?.worker_outputs_written_now === 0 && envelope.summary?.repo_outputs_written_now === 0, JSON.stringify(envelope.summary)),
    check('summary_no_model_or_private', envelope.summary?.starts_models_now === false && envelope.summary?.reads_private_content_now === false, JSON.stringify(envelope.summary)),
    check('hard_stop_no_execution', hardStops.includes('never executes') && hardStops.includes('never starts'), hardStops),
    check('hard_stop_no_output_files', hardStops.includes('never creates worker output files'), hardStops),
    check('hard_stop_no_private', hardStops.includes('private source root') && hardStops.includes('onedrive'), hardStops),
    check('hard_stop_no_public_training', hardStops.includes('public-ready') && hardStops.includes('training rows'), hardStops)
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
  lines.push('# Kosmo Local Worker Innovation Launch Execution Envelope Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Envelope status: ${report.summary.envelope_status}`);
  lines.push(`- Mode: ${report.summary.mode}`);
  lines.push(`- Output slots: ${report.summary.output_slots}`);
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
