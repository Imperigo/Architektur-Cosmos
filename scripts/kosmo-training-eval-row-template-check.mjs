#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const templatePath = resolve(root, args.template || `data/kosmo-training-eval-row-template-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-training-eval-row-template-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-training-eval-row-template-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const template = await readJson(templatePath);
  const checks = buildChecks(template);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'training_eval_row_template_guard_passed'
      : 'training_eval_row_template_guard_failed',
    policy: {
      validates_template_only: true,
      writes_eval_rows_now: false,
      writes_training_data_now: false,
      writes_embeddings_now: false,
      reads_private_content_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, templatePath)],
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

  console.log('Kosmo training eval row template check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(template) {
  const hardStops = (template.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', template.status === 'training_eval_row_template_ready', template.status),
    check('policy_template_only', template.policy?.template_only === true, template.policy?.template_only),
    check('policy_no_eval_rows_now', template.policy?.writes_eval_rows_now === false, template.policy?.writes_eval_rows_now),
    check('policy_no_training_now', template.policy?.writes_training_data_now === false, template.policy?.writes_training_data_now),
    check('policy_no_embeddings_now', template.policy?.writes_embeddings_now === false, template.policy?.writes_embeddings_now),
    check('policy_no_fine_tuning_now', template.policy?.runs_fine_tuning_now === false, template.policy?.runs_fine_tuning_now),
    check('policy_no_private_reads', template.policy?.reads_private_content_now === false, template.policy?.reads_private_content_now),
    check('policy_no_private_storage', template.policy?.stores_private_content === false, template.policy?.stores_private_content),
    check('public_ready_zero', template.summary?.public_ready_after_template === 0, template.summary?.public_ready_after_template),
    check('six_templates', template.summary?.templates === 6, template.summary?.templates),
    check('ten_required_fields', template.summary?.required_fields === 10, template.summary?.required_fields),
    check('rubric_suites_six', template.summary?.suites_from_rubric === 6, template.summary?.suites_from_rubric),
    check('rubric_criteria_twenty_four', template.summary?.criteria_from_rubric === 24, template.summary?.criteria_from_rubric),
    check('all_templates_no_rows', (template.templates || []).every((item) => item.status === 'template_only_no_rows'), (template.templates || []).filter((item) => item.status !== 'template_only_no_rows').map((item) => item.suite_id).join(',')),
    check('all_templates_public_ready_zero', (template.templates || []).every((item) => item.public_ready_after_template === 0), (template.templates || []).filter((item) => item.public_ready_after_template !== 0).map((item) => item.suite_id).join(',')),
    check('all_row_stubs_not_public_ready', (template.templates || []).every((item) => item.row_stub?.public_ready === false), (template.templates || []).filter((item) => item.row_stub?.public_ready !== false).map((item) => item.suite_id).join(',')),
    check('forbidden_fields_present', (template.templates || []).every((item) => (item.forbidden_fields || []).includes('raw_private_text') && (item.forbidden_fields || []).includes('worker_output_body')), 'raw_private_text,worker_output_body'),
    check('hard_stop_no_private_text', hardStops.includes('private source text'), hardStops),
    check('hard_stop_no_ocr_pdf', hardStops.includes('ocr/pdf'), hardStops),
    check('hard_stop_no_worker_body', hardStops.includes('worker output bodies'), hardStops),
    check('hard_stop_no_embedding_finetune', hardStops.includes('embeddings') && hardStops.includes('fine-tunes'), hardStops),
    check('hard_stop_public_ready_false', hardStops.includes('public_ready false'), hardStops)
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
  lines.push('# Kosmo Training Eval Row Template Check');
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
