#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const aiModelsRoot = resolve(args.aiModelsRoot || '/mnt/data/ai-models');
const modelRuntimeRoot = resolve(args.modelRuntimeRoot || '/mnt/data/ArchitekturKosmos/KosmoZentrale/model_runtime');
const outputJson = resolve(root, args.out || `data/kosmo-local-model-inventory-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-model-inventory-${dateStamp}.md`);

const roleContracts = [
  {
    id: 'coding_worker',
    required_model: 'kosmo-qwen3-coder:30b-a3b-q4km',
    purpose: 'local coding and repetitive implementation work under Codex/Claude review',
    required_preset: 'kosmocode-preset.json'
  },
  {
    id: 'vision_reference_worker',
    required_model: 'qwen3-vl:32b',
    purpose: 'public-safe visual/reference classification and multimodal review drafts',
    required_preset: 'kosmovisionary-preset.json'
  },
  {
    id: 'ocr_worker',
    required_model: 'glm-ocr:latest',
    purpose: 'future OCR support after source-root and private-output gates',
    required_preset: null
  },
  {
    id: 'embedding_worker',
    required_model: 'all-minilm:l6-v2',
    purpose: 'small local embedding/RAG smoke and routing baseline',
    required_preset: null
  }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const ollama = readOllamaList();
  const runtimeFiles = await readRuntimeFiles();
  const ggufFiles = await readGgufFiles();
  const roleRows = roleContracts.map((role) => {
    const model = ollama.models.find((item) => item.name === role.required_model);
    const presetExists = role.required_preset ? runtimeFiles.some((file) => file.name === role.required_preset) : true;
    return {
      ...role,
      model_present: Boolean(model),
      model_size: model?.size || null,
      model_modified: model?.modified || null,
      preset_present: presetExists,
      ready_for_guarded_use: Boolean(model) && presetExists,
      allowed_now: [
        'metadata-only routing',
        'synthetic/public-safe smoke prompts',
        'review-only local worker task drafts'
      ],
      blocked_now: [
        'private source OCR/extraction while source-root blocker is active',
        'public promotion',
        'unreviewed Git/cloud/deploy actions by local model'
      ]
    };
  });
  const missingRoles = roleRows.filter((row) => !row.ready_for_guarded_use);
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: missingRoles.length === 0 ? 'local_model_inventory_ready_review_only' : 'local_model_inventory_needs_review',
    policy: {
      metadata_only: true,
      starts_models: false,
      sends_prompts: false,
      reads_private_content: false,
      copies_private_content: false,
      public_ready_after_inventory: 0,
      note: 'This inventory reads local model metadata and runtime preset filenames only. It does not start inference, scan private libraries or approve autonomous model actions.'
    },
    paths: {
      ai_models_root: aiModelsRoot,
      model_runtime_root: modelRuntimeRoot
    },
    summary: {
      ollama_available: ollama.status === 'available',
      ollama_model_count: ollama.models.length,
      required_roles: roleRows.length,
      ready_roles: roleRows.filter((row) => row.ready_for_guarded_use).length,
      missing_roles: missingRoles.length,
      gguf_files: ggufFiles.length,
      runtime_files: runtimeFiles.length,
      total_visible_ollama_size_gb: sumOllamaSizeGb(ollama.models),
      public_ready_after_inventory: 0
    },
    ollama,
    role_contracts: roleRows,
    gguf_files: ggufFiles,
    runtime_files: runtimeFiles,
    next_actions: missingRoles.length === 0
      ? [
          'Use this inventory as the local-model readiness gate before launching local worker tasks.',
          'Keep all local model work behind worker-boundary and source-root guards.',
          'Run kosmo:local-worker-ollama-smoke separately only when a real inference smoke is needed.'
        ]
      : [
          'Install or register missing local models/presets before assigning that role.',
          'Rerun npm run kosmo:local-model-inventory after model changes.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local model inventory');
  console.log(`Status: ${report.status}`);
  console.log(`Ollama models: ${report.summary.ollama_model_count}`);
  console.log(`Ready roles: ${report.summary.ready_roles}/${report.summary.required_roles}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (missingRoles.length > 0) process.exitCode = 1;
}

function readOllamaList() {
  let result = spawnSync('ollama', ['list'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (result.status === 0 && String(result.stdout || '').trim() === '') {
    result = spawnSync('script', ['-q', '-c', 'ollama list', '/dev/null'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }
  if (result.status !== 0) {
    return {
      status: result.error?.code === 'ENOENT' ? 'missing' : 'not_ready',
      exit_code: result.status ?? null,
      stderr: String(result.stderr || '').slice(0, 500),
      models: []
    };
  }
  return {
    status: 'available',
    exit_code: 0,
    models: parseOllamaModels(result.stdout || '')
  };
}

function parseOllamaModels(text) {
  return text.split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      if (parts.length < 5) return { name: line, id: null, size: null, modified: null };
      return {
        name: parts[0],
        id: parts[1],
        size: `${parts[2]} ${parts[3]}`,
        modified: parts.slice(4).join(' ')
      };
    });
}

async function readRuntimeFiles() {
  try {
    const entries = await readdir(modelRuntimeRoot);
    return entries.sort((a, b) => a.localeCompare(b)).map((name) => ({
      name,
      path: relative(root, resolve(modelRuntimeRoot, name))
    }));
  } catch {
    return [];
  }
}

async function readGgufFiles() {
  const candidates = [
    resolve(aiModelsRoot, 'huggingface/Qwen3-Coder-30B-A3B-Instruct-GGUF/Qwen3-Coder-30B-A3B-Instruct-Q4_K_M.gguf')
  ];
  return candidates.filter((path) => existsSync(path)).map((path) => {
    const info = statSync(path);
    return {
      path,
      size_gb: Math.round((info.size / 1024 / 1024 / 1024) * 10) / 10
    };
  });
}

function sumOllamaSizeGb(models) {
  return Math.round(models.reduce((sum, model) => sum + sizeToGb(model.size), 0) * 10) / 10;
}

function sizeToGb(value) {
  const match = String(value || '').match(/([\d.]+)\s*(GB|MB|KB)/i);
  if (!match) return 0;
  const number = Number(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'GB') return number;
  if (unit === 'MB') return number / 1024;
  if (unit === 'KB') return number / 1024 / 1024;
  return 0;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Model Inventory');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Ollama available: ${report.summary.ollama_available ? 'yes' : 'no'}`);
  lines.push(`- Ollama models: ${report.summary.ollama_model_count}`);
  lines.push(`- Ready roles: ${report.summary.ready_roles}/${report.summary.required_roles}`);
  lines.push(`- GGUF files: ${report.summary.gguf_files}`);
  lines.push(`- Runtime files: ${report.summary.runtime_files}`);
  lines.push(`- Visible Ollama size: ${report.summary.total_visible_ollama_size_gb} GB`);
  lines.push(`- Public-ready after inventory: ${report.summary.public_ready_after_inventory}`);
  lines.push('');
  lines.push('## Role Contracts');
  lines.push('');
  lines.push('| Role | Required model | Model | Preset | Ready |');
  lines.push('| --- | --- | --- | --- | --- |');
  report.role_contracts.forEach((role) => {
    lines.push(`| \`${role.id}\` | \`${role.required_model}\` | ${role.model_present ? 'yes' : 'no'} | ${role.preset_present ? 'yes' : 'n/a'} | ${role.ready_for_guarded_use ? 'yes' : 'no'} |`);
  });
  lines.push('');
  lines.push('## Ollama Models');
  lines.push('');
  lines.push('| Model | Size | Modified |');
  lines.push('| --- | ---: | --- |');
  report.ollama.models.forEach((model) => {
    lines.push(`| \`${model.name}\` | ${model.size || '-'} | ${model.modified || '-'} |`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('This inventory does not start models, send prompts, read private content or permit public promotion.');
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
