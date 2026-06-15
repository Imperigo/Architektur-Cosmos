#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const drySmokePath = resolve(root, args.drySmoke || `data/kosmo-innovation-tool-dry-smoke-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-dependency-preflight-plan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-dependency-preflight-plan-${dateStamp}.md`);

const dependencyGroups = [
  group('docling', 'python', ['docling'], ['python -m pip show docling', 'python -c "import docling; print(docling.__version__)"'], ['docling_markitdown_document_shape']),
  group('markitdown', 'python', ['markitdown'], ['python -m pip show markitdown', 'python -c "import markitdown; print(markitdown.__name__)"'], ['docling_markitdown_document_shape']),
  group('ifcopenshell', 'python', ['ifcopenshell'], ['python -m pip show ifcopenshell', 'python -c "import ifcopenshell; print(ifcopenshell.version)"'], ['ifcopenshell_entity_shape']),
  group('qwen_embedding_reranker', 'model_or_python', ['sentence-transformers_or_transformers', 'Qwen3-Embedding model files'], ['python -c "import transformers; print(transformers.__version__)"', 'test -d "$KOSMO_MODEL_ROOT/qwen3-embedding"'], ['qwen_retrieval_shape']),
  group('deepseek_ocr', 'model_or_python', ['torch', 'transformers', 'DeepSeek-OCR model files'], ['python -c "import torch, transformers; print(torch.__version__, transformers.__version__)"', 'test -d "$KOSMO_MODEL_ROOT/deepseek-ocr"'], ['deepseek_ocr_shape']),
  group('topologicpy', 'python', ['topologicpy'], ['python -m pip show topologicpy', 'python -c "import topologicpy; print(topologicpy.__name__)"'], ['topologicpy_graph_shape']),
  group('speckle', 'python_or_node', ['specklepy_or_speckle_connector_contracts'], ['python -m pip show specklepy', `node -e "console.log('speckle-contract-only')"`], ['speckle_connector_boundary_shape'])
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const drySmoke = JSON.parse(await readFile(drySmokePath, 'utf8'));
  const laneIds = new Set((drySmoke.tool_lanes || []).map((lane) => lane.id));
  const failures = [];
  if (drySmoke.status !== 'innovation_tool_dry_smoke_passed') failures.push(`Tool dry smoke not passed: ${drySmoke.status}`);
  for (const item of dependencyGroups) {
    for (const laneId of item.requires_passed_lanes) {
      if (!laneIds.has(laneId)) failures.push(`Dependency group ${item.id} references missing lane ${laneId}`);
    }
  }

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_dependency_preflight_plan_ready' : 'innovation_dependency_preflight_plan_needs_review',
    policy: {
      plan_only: true,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_plan: 0,
      note: 'This plan defines future dependency preflight checks only. It does not install packages, download models or execute tools.'
    },
    source_refs: [relative(root, drySmokePath)],
    summary: {
      dependency_groups: dependencyGroups.length,
      command_templates: dependencyGroups.reduce((sum, item) => sum + item.preflight_commands.length, 0),
      executable_now: 0,
      failures: failures.length,
      public_ready_after_plan: 0
    },
    dependency_groups: dependencyGroups.map((item) => ({
      ...item,
      allowed_now: false,
      requires_manual_dependency_gate: true,
      private_content_allowed_after_preflight: false,
      public_ready_after_group: 0
    })),
    execution_sequence_after_gate: [
      'Run preflight commands in an isolated local environment.',
      'Record versions and availability only; do not process private source files.',
      'Run fixture-only smoke scripts after dependencies are present.',
      'Escalate before any model download, private OCR, private embedding or training run.'
    ],
    failures
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation dependency preflight plan');
  console.log(`Status: ${report.status}`);
  console.log(`Dependency groups: ${report.summary.dependency_groups}`);
  console.log(`Executable now: ${report.summary.executable_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function group(id, runtime, packages, preflightCommands, requiresPassedLanes) {
  return {
    id,
    runtime,
    packages,
    preflight_commands: preflightCommands,
    requires_passed_lanes: requiresPassedLanes
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Dependency Preflight Plan');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Dependency groups: ${report.summary.dependency_groups}`);
  lines.push(`- Command templates: ${report.summary.command_templates}`);
  lines.push(`- Executable now: ${report.summary.executable_now}`);
  lines.push(`- Public-ready after plan: ${report.summary.public_ready_after_plan}`);
  lines.push('');
  lines.push('## Dependency Groups');
  lines.push('');
  lines.push('| Group | Runtime | Commands | Allowed Now |');
  lines.push('| --- | --- | ---: | --- |');
  for (const item of report.dependency_groups) {
    lines.push(`| \`${item.id}\` | ${item.runtime} | ${item.preflight_commands.length} | ${item.allowed_now ? 'yes' : 'no'} |`);
  }
  lines.push('');
  lines.push('## Execution Sequence After Gate');
  lines.push('');
  report.execution_sequence_after_gate.forEach((item) => lines.push(`- ${item}`));
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
