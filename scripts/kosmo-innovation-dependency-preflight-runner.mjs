#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { homedir } from 'node:os';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const planPath = resolve(root, args.plan || `data/kosmo-innovation-dependency-preflight-plan-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-innovation-dependency-preflight-runner-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-innovation-dependency-preflight-runner-${dateStamp}.md`);

const checksByGroup = {
  docling: [
    pythonPipShow('docling'),
    pythonImport('docling', 'import docling; print(getattr(docling, "__version__", "unknown"))')
  ],
  markitdown: [
    pythonPipShow('markitdown'),
    pythonImport('markitdown', 'import markitdown; print(getattr(markitdown, "__name__", "markitdown"))')
  ],
  ifcopenshell: [
    pythonPipShow('ifcopenshell'),
    pythonImport('ifcopenshell', 'import ifcopenshell; print(getattr(ifcopenshell, "__version__", getattr(ifcopenshell, "version", "unknown")))')
  ],
  qwen_embedding_reranker: [
    pythonImport('transformers', 'import transformers; print(transformers.__version__)'),
    modelDir('qwen3-embedding', ['qwen3-embedding', 'qwen-embedding', 'Qwen3-Embedding'])
  ],
  deepseek_ocr: [
    pythonImport('torch_transformers', 'import torch, transformers; print(torch.__version__, transformers.__version__)'),
    modelDir('deepseek-ocr', ['deepseek-ocr', 'DeepSeek-OCR'])
  ],
  topologicpy: [
    pythonPipShow('topologicpy'),
    pythonImport('topologicpy', 'import topologicpy; print(getattr(topologicpy, "__name__", "topologicpy"))')
  ],
  speckle: [
    pythonPipShow('specklepy'),
    nodeProbe('speckle-contract-only', 'console.log("speckle-contract-only")')
  ]
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const failures = [];
  if (plan.status !== 'innovation_dependency_preflight_plan_ready') {
    failures.push(`Plan status is not ready: ${plan.status}`);
  }

  const groups = [];
  for (const group of plan.dependency_groups || []) {
    const checkDefs = checksByGroup[group.id] || [];
    if (checkDefs.length === 0) failures.push(`No whitelisted checks for group ${group.id}`);
    const checks = [];
    for (const check of checkDefs) {
      checks.push(await runCheck(check));
    }
    groups.push({
      id: group.id,
      runtime: group.runtime,
      checks,
      available: checks.length > 0 && checks.every((check) => check.status === 'passed'),
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      public_ready_after_group: 0
    });
  }

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'innovation_dependency_preflight_run_completed' : 'innovation_dependency_preflight_run_needs_review',
    policy: {
      local_availability_check_only: true,
      whitelisted_commands_only: true,
      installs_dependencies_now: false,
      downloads_models_now: false,
      runs_tools_now: false,
      reads_private_content: false,
      writes_public_files: false,
      public_ready_after_run: 0
    },
    source_refs: [relative(root, planPath)],
    summary: {
      dependency_groups: groups.length,
      available_groups: groups.filter((group) => group.available).length,
      unavailable_groups: groups.filter((group) => !group.available).length,
      checks: groups.reduce((sum, group) => sum + group.checks.length, 0),
      passed_checks: groups.reduce((sum, group) => sum + group.checks.filter((check) => check.status === 'passed').length, 0),
      failures: failures.length,
      public_ready_after_run: 0
    },
    groups,
    failures,
    next_actions: [
      'Review unavailable groups before installing anything.',
      'Keep all installs/downloads in a separate explicit owner-approved dependency batch.',
      'After dependencies exist, rerun this availability check and then fixture-only smoke checks.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo innovation dependency preflight runner');
  console.log(`Status: ${report.status}`);
  console.log(`Available groups: ${report.summary.available_groups}/${report.summary.dependency_groups}`);
  console.log(`Passed checks: ${report.summary.passed_checks}/${report.summary.checks}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

async function runCheck(check) {
  if (check.kind === 'model_dir') return checkModelDir(check);
  const result = spawnSync(check.command, check.args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 20_000,
    shell: false
  });
  return {
    id: check.id,
    kind: check.kind,
    command_label: check.command_label,
    status: result.status === 0 ? 'passed' : 'unavailable',
    exit_code: result.status,
    stdout: clip(result.stdout),
    stderr: clip(result.stderr)
  };
}

async function checkModelDir(check) {
  const candidates = modelRootCandidates().flatMap((modelRoot) => check.names.map((name) => join(modelRoot, name)));
  const existing = [];
  for (const candidate of candidates) {
    try {
      await access(candidate, fsConstants.R_OK);
      existing.push(candidate);
    } catch {
      // Missing local model directories are expected in a preflight.
    }
  }
  return {
    id: check.id,
    kind: check.kind,
    command_label: `local model directory lookup: ${check.names.join('|')}`,
    status: existing.length > 0 ? 'passed' : 'unavailable',
    exit_code: existing.length > 0 ? 0 : 1,
    stdout: existing.map((item) => relative(root, item)).join('\n'),
    stderr: existing.length > 0 ? '' : 'No matching local model directory found.'
  };
}

function modelRootCandidates() {
  const values = [
    process.env.KOSMO_MODEL_ROOT,
    '/mnt/data/ArchitekturKosmos/Models',
    '/mnt/data/ArchitekturKosmos/LLM',
    '/mnt/data/Models',
    '/mnt/data/Odysseus/models',
    join(homedir(), '.ollama', 'models')
  ].filter(Boolean);
  return [...new Set(values)];
}

function pythonPipShow(packageName) {
  return {
    id: `pip_show:${packageName}`,
    kind: 'python_package',
    command: 'python',
    args: ['-m', 'pip', 'show', packageName],
    command_label: `python -m pip show ${packageName}`
  };
}

function pythonImport(id, code) {
  return {
    id: `python_import:${id}`,
    kind: 'python_import',
    command: 'python',
    args: ['-c', code],
    command_label: `python -c ${JSON.stringify(code)}`
  };
}

function nodeProbe(id, code) {
  return {
    id: `node_probe:${id}`,
    kind: 'node_probe',
    command: 'node',
    args: ['-e', code],
    command_label: `node -e ${JSON.stringify(code)}`
  };
}

function modelDir(id, names) {
  return { id: `model_dir:${id}`, kind: 'model_dir', names };
}

function clip(value) {
  const text = (value || '').trim();
  if (text.length <= 1200) return text;
  return `${text.slice(0, 1200)}...`;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Innovation Dependency Preflight Runner');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Dependency groups: ${report.summary.dependency_groups}`);
  lines.push(`- Available groups: ${report.summary.available_groups}`);
  lines.push(`- Unavailable groups: ${report.summary.unavailable_groups}`);
  lines.push(`- Passed checks: ${report.summary.passed_checks}/${report.summary.checks}`);
  lines.push(`- Public-ready after run: ${report.summary.public_ready_after_run}`);
  lines.push('');
  lines.push('## Groups');
  lines.push('');
  lines.push('| Group | Available | Passed Checks |');
  lines.push('| --- | --- | ---: |');
  for (const group of report.groups) {
    const passed = group.checks.filter((check) => check.status === 'passed').length;
    lines.push(`| \`${group.id}\` | ${group.available ? 'yes' : 'no'} | ${passed}/${group.checks.length} |`);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((item) => lines.push(`- ${item}`));
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
