#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = args.date || new Date().toISOString().slice(0, 10);

const handoffPath = args.handoff && resolve(root, args.handoff);
const memoryPath = args.memory && resolve(root, args.memory);
const outputJson = resolve(root, args.out || `data/kosmo-codex-closeout-hygiene-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-codex-closeout-hygiene-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const docs = await readDocs();
  const checks = buildChecks(docs);
  const failures = checks.filter((check) => check.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'codex_closeout_hygiene_check_passed'
      : 'codex_closeout_hygiene_check_failed',
    policy: {
      validates_closeout_notes_only: true,
      reads_private_content_now: false,
      reads_worker_output_bodies_now: false,
      writes_public_files_now: false,
      stages_files_now: false,
      broad_stage_allowed: false,
      public_ready_after_check: 0
    },
    source_refs: docs.map((doc) => relative(root, doc.path)),
    summary: {
      documents_checked: docs.length,
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

  console.log('Kosmo Codex closeout hygiene check');
  console.log(`Status: ${report.status}`);
  console.log(`Documents: ${report.summary.documents_checked}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

async function readDocs() {
  if (!handoffPath || !memoryPath) {
    throw new Error('Usage: node scripts/kosmo-codex-closeout-hygiene-check.mjs --handoff <path> --memory <path>');
  }

  return Promise.all([
    readDoc('handoff', handoffPath),
    readDoc('memory', memoryPath)
  ]);
}

async function readDoc(kind, path) {
  const fileStat = await stat(path);
  const text = await readFile(path, 'utf8');
  return {
    kind,
    path,
    size_bytes: fileStat.size,
    text,
    normalized: normalize(text)
  };
}

function buildChecks(docs) {
  const byKind = new Map(docs.map((doc) => [doc.kind, doc]));
  const handoff = byKind.get('handoff');
  const memory = byKind.get('memory');
  return [
    ...docs.flatMap(documentChecks),
    ...handoffChecks(handoff),
    ...memoryChecks(memory),
    ...crossDocumentChecks(handoff, memory)
  ];
}

function documentChecks(doc) {
  return [
    check(`${doc.kind}:non_empty`, doc.size_bytes > 300, `${doc.size_bytes} bytes`),
    check(`${doc.kind}:has_status`, /\bstatus\b/i.test(doc.text), snippet(doc.text, 'Status')),
    check(`${doc.kind}:mentions_source_free_queue`, doc.normalized.includes('source-free queue') || doc.normalized.includes('source_independent_work_queue'), 'source-free queue/source_independent_work_queue'),
    check(`${doc.kind}:mentions_owner_or_source_root_block`, /owner|source[-_ ]root/i.test(doc.text), snippet(doc.text, 'owner')),
    check(`${doc.kind}:public_ready_zero`, hasPublicReadyZero(doc.text), snippet(doc.text, 'public-ready')),
    check(`${doc.kind}:privacy_hard_stops`, hasPrivacyHardStops(doc.text), snippet(doc.text, 'private')),
    check(`${doc.kind}:no_public_promotion`, !hasForbiddenPromotion(doc.text), forbiddenEvidence(doc.text, forbiddenPromotionPatterns())),
    check(`${doc.kind}:no_private_inventory_execution`, !hasForbiddenPrivateExecution(doc.text), forbiddenEvidence(doc.text, forbiddenPrivateExecutionPatterns())),
    check(`${doc.kind}:no_training_activation`, !hasForbiddenTrainingActivation(doc.text), forbiddenEvidence(doc.text, forbiddenTrainingPatterns())),
    check(`${doc.kind}:no_worker_launch_claim`, !hasForbiddenWorkerLaunch(doc.text), forbiddenEvidence(doc.text, forbiddenWorkerPatterns()))
  ];
}

function handoffChecks(handoff) {
  return [
    check('handoff:has_checks_section', /(^|\n)## Checks\b/i.test(handoff.text), snippet(handoff.text, '## Checks')),
    check('handoff:has_exact_staging_section', /(^|\n)## Exact Staging\b/i.test(handoff.text), snippet(handoff.text, '## Exact Staging')),
    check('handoff:blocks_broad_stage', /do not stage unrelated|no `?git add \.`?|do not run git add \./i.test(handoff.text), snippet(handoff.text, 'Do not stage')),
    check('handoff:mentions_no_push_when_divergent_or_dirty', /push should wait|no (?:commit or )?push|not push|kein push|nicht push/i.test(handoff.text), snippet(handoff.text, 'push'))
  ];
}

function memoryChecks(memory) {
  return [
    check('memory:has_completed_or_status_section', /(^|\n)## (Status|Completed|Ergebnis|Summary)\b/i.test(memory.text), snippet(memory.text, '##')),
    check('memory:records_checks', /\bchecks?\b|npm run|node --check/i.test(memory.text), snippet(memory.text, 'Checks')),
    check('memory:records_next_state', /next|owner|blocked|queue|handoff/i.test(memory.text), snippet(memory.text, 'Next'))
  ];
}

function crossDocumentChecks(handoff, memory) {
  return [
    check('cross:distinct_files', handoff.path !== memory.path, `${relative(root, handoff.path)} / ${relative(root, memory.path)}`),
    check('cross:handoff_and_memory_public_ready_zero', hasPublicReadyZero(handoff.text) && hasPublicReadyZero(memory.text), 'public-ready zero in both'),
    check('cross:handoff_and_memory_privacy_notes', hasPrivacyHardStops(handoff.text) && hasPrivacyHardStops(memory.text), 'privacy notes in both')
  ];
}

function hasPublicReadyZero(text) {
  return /public[-_ ]ready(?:\s+\w+){0,5}\s*(?:after|remains|bleibt|:|=)?\s*(?:`?0`?|zero|null)/i.test(text)
    || /public_ready_after_[a-z_]+\s*:\s*0/i.test(text);
}

function hasPrivacyHardStops(text) {
  const normalized = normalize(text);
  const privateMaterial = ['private pdf', 'ocr', 'scan', 'onedrive', 'worker output', 'workerlogs', 'private inventory'];
  const guardWords = ['no ', 'none', 'blocked', 'keine', 'nicht', 'without owner', 'owner'];
  return privateMaterial.some((term) => normalized.includes(term))
    && guardWords.some((word) => normalized.includes(word));
}

function hasForbiddenPromotion(text) {
  return forbiddenPromotionPatterns().some((pattern) => pattern.test(text));
}

function hasForbiddenPrivateExecution(text) {
  return forbiddenPrivateExecutionPatterns().some((pattern) => pattern.test(text));
}

function hasForbiddenTrainingActivation(text) {
  return forbiddenTrainingPatterns().some((pattern) => pattern.test(text));
}

function hasForbiddenWorkerLaunch(text) {
  return forbiddenWorkerPatterns().some((pattern) => pattern.test(text));
}

function forbiddenPromotionPatterns() {
  return [
    /public[-_ ]ready(?:\s+\w+){0,4}\s*[:=]\s*(?:1|true|yes)\b/i,
    /public[-_ ]ready(?:\s+\w+){0,4}\s+(?:set to|now|after check|after queue)\s+(?:1|true|yes)\b/i,
    /public_display_allowed\s*[:=]\s*true\b/i,
    /public display allowed\s*[:=]\s*yes\b/i,
    /public_use_allowed\s*[:=]\s*true\b/i,
    /promotion_allowed\s*[:=]\s*true\b/i,
    /automatic_public_release_allowed\s*[:=]\s*true\b/i
  ];
}

function forbiddenPrivateExecutionPatterns() {
  return [
    /private inventory\s+(?:ran|executed|completed|started|launched)\b/i,
    /private metadata inventory\s+(?:ran|executed|completed|started|launched)\b/i,
    /source[-_ ]root\s+(?:activated|unlocked|selected)\b/i,
    /private pdfs?\s+(?:copied|published|exported)\b/i,
    /ocr texts?\s+(?:copied|published|exported)\b/i,
    /onedrive\s+(?:raw|archive).*(?:copied|published|exported)\b/i
  ];
}

function forbiddenTrainingPatterns() {
  return [
    /embeddings?\s+(?:created|generated|written|started)\b/i,
    /fine[- ]?tunes?\s+(?:created|generated|started|ran|launched)\b/i,
    /eval rows?\s+(?:created|generated|written)\b/i,
    /training data\s+(?:created|generated|written|exported)\b/i
  ];
}

function forbiddenWorkerPatterns() {
  return [
    /local workers?\s+(?:executed|launched|started|ran)\b/i,
    /worker outputs?\s+(?:copied|published|exported)\b/i,
    /workerlogs?\s+(?:copied|published|exported)\b/i
  ];
}

function forbiddenEvidence(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return 'none';
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence: String(evidence ?? '').slice(0, 240)
  };
}

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function snippet(text, needle) {
  const index = text.toLowerCase().indexOf(String(needle).toLowerCase());
  if (index === -1) return '-';
  return text.slice(Math.max(0, index - 60), index + 160).replace(/\s+/g, ' ').trim();
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Codex Closeout Hygiene Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Documents checked: ${report.summary.documents_checked}`);
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Sources');
  lines.push('');
  report.source_refs.forEach((sourceRef) => lines.push(`- \`${sourceRef}\``));
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((checkItem) => {
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${checkItem.evidence || '-'}`);
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
