#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const rubricPath = resolve(root, args.rubric || `data/kosmo-training-eval-rubric-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-training-eval-row-template-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-training-eval-row-template-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const rubric = await readJson(rubricPath);
  const report = buildReport(rubric);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo training eval row template');
  console.log(`Status: ${report.status}`);
  console.log(`Templates: ${report.summary.templates}`);
  console.log(`Required fields: ${report.summary.required_fields}`);
  console.log(`Writes eval rows now: ${report.summary.writes_eval_rows_now}`);
  console.log(`Public-ready after template: ${report.summary.public_ready_after_template}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport(rubric) {
  const failures = [];
  if (rubric.status !== 'training_eval_rubric_pack_ready') failures.push(`Rubric not ready: ${rubric.status}`);
  const commonRequiredFields = [
    'eval_id',
    'suite_id',
    'question',
    'allowed_context_refs',
    'expected_answer_shape',
    'scoring_criteria',
    'answer_key_review_state',
    'rights_state',
    'privacy_state',
    'public_ready'
  ];
  const templates = (rubric.suites || []).map((suite) => ({
    suite_id: suite.id,
    status: 'template_only_no_rows',
    required_fields: commonRequiredFields,
    row_stub: {
      eval_id: `<${suite.id}:slug>`,
      suite_id: suite.id,
      question: '<reviewed-public-safe-question-placeholder>',
      allowed_context_refs: [],
      expected_answer_shape: '<short-form|structured-json|comparative-analysis|refusal>',
      scoring_criteria: suite.criteria,
      answer_key_review_state: 'not_written',
      rights_state: 'not_reviewed',
      privacy_state: 'no_private_content_in_template',
      public_ready: false
    },
    forbidden_fields: [
      'raw_private_text',
      'ocr_body',
      'pdf_body',
      'private_image_bytes',
      'worker_output_body'
    ],
    public_ready_after_template: 0
  }));

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'training_eval_row_template_ready'
      : 'training_eval_row_template_needs_review',
    policy: {
      template_only: true,
      writes_eval_rows_now: false,
      writes_training_data_now: false,
      writes_embeddings_now: false,
      runs_fine_tuning_now: false,
      reads_private_content_now: false,
      stores_private_content: false,
      public_ready_after_template: 0
    },
    source_refs: [relative(root, rubricPath)],
    summary: {
      templates: templates.length,
      required_fields: commonRequiredFields.length,
      suites_from_rubric: rubric.summary?.suites ?? null,
      criteria_from_rubric: rubric.summary?.criteria ?? null,
      writes_eval_rows_now: 0,
      writes_training_data_now: 0,
      public_ready_after_template: 0,
      failures: failures.length
    },
    templates,
    next_actions_after_verified_data: [
      'Instantiate rows only from reviewed public-safe summaries or approved private-derived summaries.',
      'Require answer key review before using a row in evals.',
      'Keep public_ready false until rights and privacy review pass.'
    ],
    hard_stops: [
      'Do not place private source text into eval rows.',
      'Do not place OCR/PDF bodies into eval rows.',
      'Do not place local worker output bodies into eval rows.',
      'Do not create embeddings or fine-tunes from templates.',
      'Keep public_ready false.'
    ],
    failures
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Training Eval Row Template');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Templates: ${report.summary.templates}`);
  lines.push(`- Required fields: ${report.summary.required_fields}`);
  lines.push(`- Suites from rubric: ${report.summary.suites_from_rubric}`);
  lines.push(`- Criteria from rubric: ${report.summary.criteria_from_rubric}`);
  lines.push(`- Writes eval rows now: ${report.summary.writes_eval_rows_now}`);
  lines.push(`- Writes training data now: ${report.summary.writes_training_data_now}`);
  lines.push(`- Public-ready after template: ${report.summary.public_ready_after_template}`);
  lines.push('');
  lines.push('## Templates');
  lines.push('');
  report.templates.forEach((template) => {
    lines.push(`- \`${template.suite_id}\`: ${template.required_fields.length} required fields, public-ready ${template.public_ready_after_template}`);
  });
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
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
