#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const taskPackPath = resolve(root, args.taskPack || `data/kosmo-local-worker-task-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-output-review-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-output-review-${dateStamp}.md`);

const highRiskPatterns = [
  { id: 'public_ready_true', pattern: /public[_-]ready\s*[:=]\s*(true|yes|ja)/i },
  { id: 'public_approval_granted', pattern: /(public approval granted|approved for public|publish approved|oeffentlich freigegeben|öffentlich freigegeben)/i },
  { id: 'promotion_allowed', pattern: /(promotion allowed|promotion freigegeben|public promotion approved)/i },
  { id: 'cloud_write', pattern: /(upload to r2|write d1|push to git|commit to git|cloud write)/i },
  { id: 'rights_claim_final', pattern: /(rights cleared|license cleared|rechte geklaert|rechte geklärt)/i }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const taskPack = JSON.parse(await readFile(taskPackPath, 'utf8'));
  const requiredFiles = taskPack.handoff_back_to_overseers?.required_files ?? [];
  const outputRoot = taskPack.output_root;
  if (!outputRoot) throw new Error('Task pack is missing output_root.');

  const files = [];
  for (const filename of requiredFiles) {
    files.push(await inspectWorkerOutput(outputRoot, filename));
  }

  const missing = files.filter((file) => file.status === 'missing');
  const invalidJson = files.filter((file) => file.json_status === 'invalid');
  const highRisk = files.flatMap((file) => file.high_risk_terms.map((term) => ({ file: file.filename, term })));

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: statusFor({ missing, invalidJson, highRisk }),
    policy: {
      private_outputs_not_copied: true,
      metadata_only: true,
      note: 'This review records existence, file sizes, JSON validity and high-risk term ids only. It does not copy private local worker output contents into the repository.'
    },
    task_pack: relative(root, taskPackPath),
    output_root: outputRoot,
    summary: {
      required_outputs: requiredFiles.length,
      present_outputs: files.filter((file) => file.status === 'present').length,
      missing_outputs: missing.length,
      invalid_json_outputs: invalidJson.length,
      high_risk_hits: highRisk.length,
      review_required: missing.length > 0 || invalidJson.length > 0 || highRisk.length > 0,
      public_ready_allowed: false
    },
    files,
    next_actions: nextActions({ missing, invalidJson, highRisk })
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker output review');
  console.log(`Status: ${report.status}`);
  console.log(`Required: ${report.summary.required_outputs}`);
  console.log(`Present: ${report.summary.present_outputs}`);
  console.log(`Missing: ${report.summary.missing_outputs}`);
  console.log(`High-risk hits: ${report.summary.high_risk_hits}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function inspectWorkerOutput(outputRoot, filename) {
  const path = `${outputRoot}/${filename}`;
  let info;
  try {
    info = await stat(path);
  } catch {
    return {
      filename,
      status: 'missing',
      bytes: 0,
      json_status: filename.endsWith('.json') ? 'missing' : 'not_json',
      high_risk_terms: []
    };
  }

  const text = await readFile(path, 'utf8');
  return {
    filename,
    status: 'present',
    bytes: info.size,
    json_status: filename.endsWith('.json') ? jsonStatus(text) : 'not_json',
    high_risk_terms: highRiskTerms(text)
  };
}

function highRiskTerms(text) {
  const lines = text.split(/\r?\n/);
  const found = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    const context = [
      lines[index - 2] || '',
      lines[index - 1] || '',
      lines[index] || ''
    ].join(' ');
    for (const { id, pattern } of highRiskPatterns) {
      if (pattern.test(lines[index]) && !isNegatedSafetyContext(context)) found.add(id);
    }
  }
  return [...found].sort();
}

function isNegatedSafetyContext(value) {
  const lower = value.toLowerCase();
  return [
    'do not',
    'don’t',
    'never',
    'not ',
    'nicht',
    'kein',
    'keine',
    'darfst nicht',
    'darf nicht',
    'without',
    'blocked',
    'blockiert'
  ].some((token) => lower.includes(token));
}

function jsonStatus(text) {
  try {
    JSON.parse(text);
    return 'valid';
  } catch {
    return 'invalid';
  }
}

function statusFor({ missing, invalidJson, highRisk }) {
  if (missing.length > 0) return 'local_worker_outputs_incomplete';
  if (invalidJson.length > 0) return 'local_worker_outputs_invalid_json';
  if (highRisk.length > 0) return 'local_worker_outputs_need_overseer_review';
  return 'local_worker_outputs_present_review_only';
}

function nextActions({ missing, invalidJson, highRisk }) {
  const actions = [];
  if (missing.length > 0) actions.push('Regenerate or manually create missing private worker outputs under the configured KosmoZentrale worker packet path.');
  if (invalidJson.length > 0) actions.push('Repair invalid JSON worker outputs before using them for repo artifacts.');
  if (highRisk.length > 0) actions.push('Review high-risk local worker outputs with Codex/Claude before any owner-facing or repo conversion.');
  if (actions.length === 0) actions.push('Codex/Claude may review private outputs and convert only checked, metadata-safe summaries into repo artifacts.');
  actions.push('Keep public_ready_allowed=false until owner decisions, file-level provenance and rights review pass.');
  return actions;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Output Review');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Required outputs: ${report.summary.required_outputs}`);
  lines.push(`- Present outputs: ${report.summary.present_outputs}`);
  lines.push(`- Missing outputs: ${report.summary.missing_outputs}`);
  lines.push(`- Invalid JSON outputs: ${report.summary.invalid_json_outputs}`);
  lines.push(`- High-risk hits: ${report.summary.high_risk_hits}`);
  lines.push(`- Public-ready allowed: ${report.summary.public_ready_allowed ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Files');
  lines.push('');
  lines.push('| File | Status | Bytes | JSON | High-risk terms |');
  lines.push('| --- | --- | ---: | --- | --- |');
  for (const file of report.files) {
    lines.push(`| \`${file.filename}\` | ${file.status} | ${file.bytes} | ${file.json_status} | ${file.high_risk_terms.length ? file.high_risk_terms.join(', ') : '-'} |`);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Privacy Note');
  lines.push('');
  lines.push('This report does not copy private worker output content into Git. It records metadata and review flags only.');
  lines.push('');
  return `${lines.join('\n')}`;
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
