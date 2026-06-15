#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const queuePath = resolve(root, args.queue || `data/kosmo-innovation-dependency-install-queue-${dateStamp}.json`);
const watchlistPath = resolve(root, args.watchlist || `data/kosmo-innovation-github-watchlist-${dateStamp}.json`);
const runnerPath = resolve(root, args.runner || `data/kosmo-innovation-dependency-preflight-runner-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-dependency-install-batch-brief-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-dependency-install-batch-brief-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const queue = JSON.parse(await readFile(queuePath, 'utf8'));
  const watchlist = JSON.parse(await readFile(watchlistPath, 'utf8'));
  const runner = JSON.parse(await readFile(runnerPath, 'utf8'));

  const packageItems = queue.recommended_order
    .filter((item) => item.install_type === 'python_package')
    .map((item) => enrich(item, watchlist));
  const modelItems = queue.recommended_order
    .filter((item) => item.install_type === 'model_download')
    .map((item) => enrich(item, watchlist));

  const brief = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'dependency_install_batch_brief_ready',
    policy: {
      decision_brief_only: true,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      source_root_required_for_private_processing: true,
      secrets_required: false,
      public_ready_after_brief: 0
    },
    source_refs: [relative(root, queuePath), relative(root, watchlistPath), relative(root, runnerPath)],
    current_availability: {
      dependency_groups: runner.summary?.dependency_groups ?? null,
      available_groups: runner.summary?.available_groups ?? null,
      passed_checks: runner.summary?.passed_checks ?? null,
      checks: runner.summary?.checks ?? null
    },
    phases: [
      {
        id: 'phase_1_python_package_env',
        status: 'ready_for_separate_execution',
        purpose: 'Enable fixture-only KosmoPrepare and geometry smoke tests.',
        environment_root: '/mnt/data/ArchitekturKosmos/tools/kosmo-python-tools',
        packages: packageItems,
        executes_now: false,
        reads_private_content: false,
        validation_after_phase: [
          'npm run kosmo:innovation-dependency-preflight-runner',
          'npm run kosmo:innovation-dependency-preflight-runner-check',
          'fixture-only MarkItDown/Docling document smoke',
          'fixture-only IfcOpenShell entity smoke'
        ]
      },
      {
        id: 'phase_2_embedding_model_root',
        status: 'blocked_until_model_root_decision',
        purpose: 'Prepare retrieval/RAG foundation for KosmoReferences.',
        model_root: '/mnt/data/ArchitekturKosmos/Models',
        packages: modelItems.filter((item) => item.id === 'qwen_embedding_reranker'),
        executes_now: false,
        reads_private_content: false,
        validation_after_phase: ['fixture-only embedding smoke; no private embeddings']
      },
      {
        id: 'phase_3_ocr_model_root',
        status: 'blocked_until_source_root_and_ocr_gate',
        purpose: 'Prepare local OCR experiments for scanned architecture sources.',
        model_root: '/mnt/data/ArchitekturKosmos/Models',
        packages: modelItems.filter((item) => item.id === 'deepseek_ocr'),
        executes_now: false,
        reads_private_content: false,
        validation_after_phase: ['fixture-only OCR smoke; private OCR remains blocked']
      }
    ],
    recommended_next_command_batch: [
      'Create isolated Python environment under /mnt/data/ArchitekturKosmos/tools/kosmo-python-tools.',
      'Install phase_1 Python packages there only.',
      'Record exact versions and rerun dependency preflight runner.',
      'Do not download models in the Python package phase.',
      'Do not process private content in any install validation.'
    ],
    summary: {
      phase_1_package_count: packageItems.length,
      phase_2_model_count: modelItems.filter((item) => item.id === 'qwen_embedding_reranker').length,
      phase_3_model_count: modelItems.filter((item) => item.id === 'deepseek_ocr').length,
      executable_now: 0,
      public_ready_after_brief: 0
    }
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(brief, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(brief));

  console.log('Kosmo dependency install batch brief');
  console.log(`Status: ${brief.status}`);
  console.log(`Phase 1 packages: ${brief.summary.phase_1_package_count}`);
  console.log(`Executable now: ${brief.summary.executable_now}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function enrich(item, watchlist) {
  const candidate = (watchlist.candidates || []).find((entry) => candidateMatches(item, entry));
  return {
    id: item.id,
    priority: item.priority,
    install_type: item.install_type,
    targets: item.targets,
    risk: item.risk,
    expected_size: item.expected_size,
    purpose: item.purpose,
    validation_after_install: item.validation_after_install,
    repo: candidate?.repo || null,
    url: candidate?.url || null,
    kosmo_fit: candidate?.kosmo_fit || null,
    blocked_until_source_root_unlock: item.blocked_until_source_root_unlock,
    requires_model_root_decision: item.requires_model_root_decision,
    executes_now: false,
    public_ready_after_item: 0
  };
}

function candidateMatches(item, entry) {
  if (item.id === 'markitdown') return entry.repo === 'microsoft/markitdown';
  if (item.id === 'docling') return entry.repo === 'docling-project/docling';
  if (item.id === 'ifcopenshell') return entry.repo === 'IfcOpenShell/IfcOpenShell';
  if (item.id === 'topologicpy') return entry.repo === 'wassimj/topologicpy';
  if (item.id === 'speckle') return entry.repo === 'specklesystems/specklepy';
  if (item.id === 'qwen_embedding_reranker') return entry.repo === 'QwenLM/Qwen3-Embedding';
  if (item.id === 'deepseek_ocr') return entry.repo === 'deepseek-ai/DeepSeek-OCR';
  return false;
}

function renderMarkdown(brief) {
  const lines = [];
  lines.push('# Kosmo Dependency Install Batch Brief');
  lines.push('');
  lines.push(`Generated: ${brief.generated_at}`);
  lines.push(`Status: \`${brief.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Phase 1 package count: ${brief.summary.phase_1_package_count}`);
  lines.push(`- Phase 2 model count: ${brief.summary.phase_2_model_count}`);
  lines.push(`- Phase 3 model count: ${brief.summary.phase_3_model_count}`);
  lines.push(`- Executable now: ${brief.summary.executable_now}`);
  lines.push(`- Public-ready after brief: ${brief.summary.public_ready_after_brief}`);
  lines.push('');
  lines.push('## Phases');
  lines.push('');
  for (const phase of brief.phases) {
    lines.push(`### ${phase.id}`);
    lines.push('');
    lines.push(`- Status: \`${phase.status}\``);
    lines.push(`- Purpose: ${phase.purpose}`);
    lines.push(`- Executes now: ${phase.executes_now}`);
    if (phase.environment_root) lines.push(`- Environment root: \`${phase.environment_root}\``);
    if (phase.model_root) lines.push(`- Model root: \`${phase.model_root}\``);
    lines.push('');
    lines.push('| Item | Type | Risk | Source |');
    lines.push('| --- | --- | --- | --- |');
    for (const item of phase.packages) {
      lines.push(`| \`${item.id}\` | ${item.install_type} | ${item.risk} | ${item.url ? `[${item.repo}](${item.url})` : '-'} |`);
    }
    lines.push('');
  }
  lines.push('## Recommended Next Command Batch');
  lines.push('');
  brief.recommended_next_command_batch.forEach((item) => lines.push(`- ${item}`));
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
