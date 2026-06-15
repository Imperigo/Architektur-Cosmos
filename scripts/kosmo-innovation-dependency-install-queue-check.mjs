#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const queuePath = resolve(root, args.queue || `data/kosmo-innovation-dependency-install-queue-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-dependency-install-queue-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-dependency-install-queue-check-${dateStamp}.md`);

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
    status: failures.length === 0 ? 'innovation_dependency_install_queue_guard_passed' : 'innovation_dependency_install_queue_guard_failed',
    policy: {
      validates_queue_only: true,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, queuePath)],
    summary: {
      queue_status: queue.status,
      queue_items: queue.recommended_order?.length ?? null,
      failures: failures.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation dependency install queue check');
  console.log(`Status: ${report.status}`);
  console.log(`Queue items: ${report.summary.queue_items}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkQueue(queue) {
  const findings = [];
  expect(queue.schema_version === '0.1', findings, 'schema_version', 'Queue schema_version must be 0.1.');
  expect(queue.status === 'innovation_dependency_install_queue_ready', findings, 'queue_ready', 'Install queue must be ready.');
  expect(queue.policy?.queue_only === true, findings, 'queue_only', 'Queue must be queue-only.');
  expect(queue.policy?.installs_dependencies_now === false, findings, 'no_installs', 'Queue must not install dependencies.');
  expect(queue.policy?.downloads_models_now === false, findings, 'no_downloads', 'Queue must not download models.');
  expect(queue.policy?.runs_tools_now === false, findings, 'no_tool_runs', 'Queue must not run tools.');
  expect(queue.policy?.reads_private_content === false, findings, 'no_private_reads', 'Queue must not read private content.');
  expect(queue.policy?.public_ready_after_queue === 0, findings, 'public_ready_zero', 'Queue must keep public-ready at 0.');
  expect(queue.policy?.requires_explicit_owner_install_batch === true, findings, 'owner_batch_required', 'Queue must require an explicit owner install batch.');
  expect(queue.summary?.executable_now === 0, findings, 'executable_zero', 'Queue executable_now must be 0.');
  expect((queue.recommended_order || []).length > 0, findings, 'queue_items_present', 'Queue must include install items.');
  for (const item of queue.recommended_order || []) {
    expect(item.requires_explicit_owner_install_batch === true, findings, `item_owner_batch:${item.id}`, `${item.id} must require explicit install batch.`);
    expect(item.executable_now === false, findings, `item_not_executable:${item.id}`, `${item.id} must not be executable now.`);
    expect(item.public_ready_after_item === 0, findings, `item_public_ready_zero:${item.id}`, `${item.id} must keep public-ready at 0.`);
    if (item.id === 'deepseek_ocr') {
      expect(item.blocked_until_source_root_unlock === true, findings, 'ocr_source_root_gate', 'DeepSeek OCR must remain blocked until Source Root unlock.');
    }
    if (item.install_type === 'model_download') {
      expect(item.requires_model_root_decision === true, findings, `model_root_gate:${item.id}`, `${item.id} must require a model root decision.`);
    }
  }
  return findings;
}

function expect(condition, findings, id, message) {
  findings.push({ id, severity: condition ? 'passed' : 'failure', message });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Dependency Install Queue Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Queue status: ${report.summary.queue_status}`);
  lines.push(`- Queue items: ${report.summary.queue_items}`);
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
