#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const queuePath = resolve(root, args.queue || `data/kosmo-innovation-github-review-queue-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-github-review-queue-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-github-review-queue-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const queue = JSON.parse(await readFile(queuePath, 'utf8'));
  const findings = checkQueue(queue);
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_github_review_queue_guard_passed' : 'innovation_github_review_queue_guard_failed',
    policy: {
      validates_review_only_queue: true,
      reads_private_content: false,
      installs_or_downloads: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, queuePath)],
    summary: {
      queue_status: queue.status,
      review_items: queue.summary?.review_items ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation GitHub review queue check');
  console.log(`Status: ${report.status}`);
  console.log(`Review items: ${report.summary.review_items}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkQueue(queue) {
  const findings = [];
  const lanes = new Set((queue.review_items || []).map((item) => item.lane));
  const hardStops = (queue.hard_stops || []).join(' ').toLowerCase();
  expect(queue.schema_version === '0.1', findings, 'schema_version', 'Queue schema_version must be 0.1.');
  expect(queue.status === 'innovation_github_review_queue_ready', findings, 'queue_ready', 'Queue must be ready.');
  expect(queue.policy?.review_queue_only === true, findings, 'review_queue_only', 'Queue must be review-only.');
  expect(queue.policy?.clones_repositories_now === false, findings, 'no_clone', 'Queue must not clone repositories.');
  expect(queue.policy?.installs_dependencies_now === false, findings, 'no_installs', 'Queue must not install dependencies.');
  expect(queue.policy?.downloads_models_now === false, findings, 'no_downloads', 'Queue must not download models.');
  expect(queue.policy?.runs_discovered_code_now === false, findings, 'no_run_code', 'Queue must not run discovered code.');
  expect(queue.policy?.reads_private_content === false, findings, 'no_private_reads', 'Queue must not read private content.');
  expect(queue.policy?.public_ready_after_queue === 0, findings, 'public_ready_zero', 'Queue must keep public-ready at 0.');
  expect((queue.review_items || []).length >= 5, findings, 'review_item_count', 'Queue must include at least five review items.');
  ['kosmo_prepare', 'kosmo_asset', 'ifc_reasoning', 'bim_rag_workers'].forEach((lane) => {
    expect(lanes.has(lane), findings, `lane_present:${lane}`, `Queue must include ${lane}.`);
  });
  expect(hardStops.includes('do not clone'), findings, 'hard_stop_no_clone', 'Hard stops must forbid cloning.');
  expect(hardStops.includes('do not install'), findings, 'hard_stop_no_install', 'Hard stops must forbid installs.');
  expect(hardStops.includes('do not run'), findings, 'hard_stop_no_run', 'Hard stops must forbid running discovered code.');
  for (const item of queue.review_items || []) {
    expect(item.review_mode === 'public_metadata_and_readme_only', findings, `review_mode:${item.id}`, `${item.id} must be public metadata/readme only.`);
    expect(item.allowed_now?.clone_repository === false, findings, `no_clone:${item.id}`, `${item.id} must forbid clone.`);
    expect(item.allowed_now?.install_dependencies === false, findings, `no_install:${item.id}`, `${item.id} must forbid install.`);
    expect(item.allowed_now?.download_models === false, findings, `no_download:${item.id}`, `${item.id} must forbid downloads.`);
    expect(item.allowed_now?.run_code === false, findings, `no_run:${item.id}`, `${item.id} must forbid running code.`);
    expect(item.allowed_now?.read_private_content === false, findings, `no_private:${item.id}`, `${item.id} must forbid private reads.`);
    expect(item.allowed_now?.promote_to_public === false, findings, `no_public:${item.id}`, `${item.id} must forbid public promotion.`);
    expect(item.public_ready_after_item === 0, findings, `public_ready_zero:${item.id}`, `${item.id} must keep public-ready at 0.`);
  }
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation GitHub Review Queue Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Queue status: ${report.summary.queue_status}`);
  lines.push(`- Review items: ${report.summary.review_items}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`));
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
