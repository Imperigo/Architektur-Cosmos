#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const packPath = resolve(root, args.pack || `data/kosmo-training-memory-readiness-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-training-memory-readiness-pack-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-training-memory-readiness-pack-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pack = await readJson(packPath);
  const checks = buildChecks(pack);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'kosmo_training_memory_readiness_pack_guard_passed'
      : 'kosmo_training_memory_readiness_pack_guard_failed',
    policy: {
      validates_pack_only: true,
      writes_training_data_now: false,
      writes_embeddings_now: false,
      runs_fine_tuning_now: false,
      reads_private_content: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, packPath)],
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

  console.log('Kosmo training memory readiness pack check');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(pack) {
  const lanes = pack.lanes || [];
  const candidateSources = pack.candidate_sources || [];
  const hardStops = (pack.hard_stops || []).join(' ').toLowerCase();
  return [
    check('status_ready', pack.status === 'kosmo_training_memory_readiness_pack_ready', pack.status),
    check('policy_readiness_only', pack.policy?.readiness_only === true, pack.policy?.readiness_only),
    check('policy_no_training_now', pack.policy?.writes_training_data_now === false, pack.policy?.writes_training_data_now),
    check('policy_no_embeddings_now', pack.policy?.writes_embeddings_now === false, pack.policy?.writes_embeddings_now),
    check('policy_no_fine_tuning_now', pack.policy?.runs_fine_tuning_now === false, pack.policy?.runs_fine_tuning_now),
    check('policy_no_private_reads', pack.policy?.reads_private_content === false, pack.policy?.reads_private_content),
    check('policy_no_private_copy', pack.policy?.copies_private_content === false, pack.policy?.copies_private_content),
    check('policy_no_raw_private_text', pack.policy?.includes_raw_private_text === false, pack.policy?.includes_raw_private_text),
    check('policy_no_worker_bodies', pack.policy?.includes_worker_output_bodies === false, pack.policy?.includes_worker_output_bodies),
    check('public_ready_zero', pack.summary?.public_ready_after_pack === 0, pack.summary?.public_ready_after_pack),
    check('four_training_lanes', lanes.length === 4, lanes.map((lane) => lane.id).join(',')),
    check('expected_lanes_present', ['rag_corpus', 'eval_set', 'fine_tune_candidates', 'embedding_manifest'].every((id) => lanes.some((lane) => lane.id === id)), lanes.map((lane) => lane.id).join(',')),
    check('lanes_not_executable_now', lanes.every((lane) => lane.executable_now === false), lanes.filter((lane) => lane.executable_now).map((lane) => lane.id).join(',')),
    check('lanes_write_nothing_now', lanes.every((lane) => lane.writes_training_data_now === false && lane.writes_embeddings_now === false), lanes.length),
    check('lane_public_ready_zero', lanes.every((lane) => lane.public_ready_after_lane === 0), lanes.filter((lane) => lane.public_ready_after_lane !== 0).map((lane) => lane.id).join(',')),
    check('candidate_sources_present', candidateSources.length >= 18, candidateSources.length),
    check('candidate_sources_public_false', candidateSources.every((source) => source.public_ready === false), candidateSources.filter((source) => source.public_ready !== false).map((source) => source.id).join(',')),
    check('output_contract_no_git_now', pack.output_contract?.git_allowed_now === false, pack.output_contract?.git_allowed_now),
    check('hard_stops_training_private_content', hardStops.includes('unverified private content') && hardStops.includes('embeddings') && hardStops.includes('worker output bodies'), hardStops),
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
  lines.push('# Kosmo Training Memory Readiness Pack Check');
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
