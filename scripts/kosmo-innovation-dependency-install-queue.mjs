#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const runnerPath = resolve(root, args.runner || `data/kosmo-innovation-dependency-preflight-runner-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-dependency-install-queue-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-dependency-install-queue-${dateStamp}.md`);

const installProfiles = {
  markitdown: profile(1, 'KosmoPrepare document conversion', 'python_package', ['markitdown'], 'low', 'small', 'fixture-only document conversion tests'),
  docling: profile(2, 'KosmoPrepare richer PDF/document parsing', 'python_package', ['docling'], 'medium', 'medium', 'fixture-only PDF/document parsing tests'),
  ifcopenshell: profile(3, 'IFC and geometry extraction baseline', 'python_package', ['ifcopenshell'], 'medium', 'medium', 'fixture-only IFC entity smoke'),
  topologicpy: profile(4, 'Spatial/topological graph experiments', 'python_package', ['topologicpy'], 'medium', 'medium', 'fixture-only graph shape tests'),
  speckle: profile(5, 'Speckle connector research boundary', 'python_package', ['specklepy'], 'low', 'small', 'connector contract smoke only'),
  qwen_embedding_reranker: profile(6, 'KosmoReferences retrieval and reranking', 'model_download', ['Qwen embedding/reranker model files'], 'high', 'large', 'fixture-only embedding smoke; no private embeddings'),
  deepseek_ocr: profile(7, 'Local OCR experiments for scanned architecture sources', 'model_download', ['DeepSeek-OCR model files'], 'high', 'large', 'fixture-only OCR smoke; private OCR blocked until Source Root unlock')
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const runner = JSON.parse(await readFile(runnerPath, 'utf8'));
  const groups = runner.groups || [];
  const queue = groups
    .filter((group) => !group.available)
    .map((group) => buildQueueItem(group, installProfiles[group.id]))
    .sort((a, b) => a.priority - b.priority);

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'innovation_dependency_install_queue_ready',
    policy: {
      queue_only: true,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      public_ready_after_queue: 0,
      requires_explicit_owner_install_batch: true
    },
    source_refs: [relative(root, runnerPath)],
    summary: {
      unavailable_groups: queue.length,
      python_package_items: queue.filter((item) => item.install_type === 'python_package').length,
      model_download_items: queue.filter((item) => item.install_type === 'model_download').length,
      blocked_until_source_root_unlock: queue.filter((item) => item.blocked_until_source_root_unlock).length,
      executable_now: 0,
      public_ready_after_queue: 0
    },
    recommended_order: queue,
    install_batch_rules: [
      'Run installs/downloads only in a separate explicit dependency batch.',
      'Install packages in an isolated environment and record versions immediately after install.',
      'Keep model downloads under a declared model root on the 4TB SSD.',
      'Do not run OCR, embeddings or training on private sources before Source Root unlock.',
      'After every install/download, rerun dependency preflight runner and guard.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation dependency install queue');
  console.log(`Status: ${report.status}`);
  console.log(`Queue items: ${report.summary.unavailable_groups}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildQueueItem(group, profileData) {
  const data = profileData || profile(99, group.id, 'unknown', [], 'unknown', 'unknown', 'manual review');
  const isOcr = group.id === 'deepseek_ocr';
  const isModel = data.install_type === 'model_download';
  return {
    id: group.id,
    priority: data.priority,
    purpose: data.purpose,
    install_type: data.install_type,
    targets: data.targets,
    risk: data.risk,
    expected_size: data.expected_size,
    validation_after_install: data.validation_after_install,
    current_status: group.available ? 'available' : 'unavailable',
    blocked_until_source_root_unlock: isOcr,
    requires_model_root_decision: isModel,
    requires_explicit_owner_install_batch: true,
    executable_now: false,
    public_ready_after_item: 0
  };
}

function profile(priority, purpose, installType, targets, risk, expectedSize, validationAfterInstall) {
  return {
    priority,
    purpose,
    install_type: installType,
    targets,
    risk,
    expected_size: expectedSize,
    validation_after_install: validationAfterInstall
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Dependency Install Queue');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Queue items: ${report.summary.unavailable_groups}`);
  lines.push(`- Python package items: ${report.summary.python_package_items}`);
  lines.push(`- Model download items: ${report.summary.model_download_items}`);
  lines.push(`- Blocked until Source Root unlock: ${report.summary.blocked_until_source_root_unlock}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Public-ready after queue: ${report.summary.public_ready_after_queue}`);
  lines.push('');
  lines.push('## Recommended Order');
  lines.push('');
  lines.push('| Priority | Item | Type | Risk | Gate |');
  lines.push('| ---: | --- | --- | --- | --- |');
  for (const item of report.recommended_order) {
    const gate = item.blocked_until_source_root_unlock ? 'source-root unlock' : 'explicit install batch';
    lines.push(`| ${item.priority} | \`${item.id}\` | ${item.install_type} | ${item.risk} | ${gate} |`);
  }
  lines.push('');
  lines.push('## Install Batch Rules');
  lines.push('');
  report.install_batch_rules.forEach((item) => lines.push(`- ${item}`));
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
