#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const taskId = args.task || 'kosmo-asset-source-candidate-triage';
const taskPackPath = resolve(root, args.taskPack || `data/kosmo-local-worker-task-pack-${dateStamp}.json`);
const endpoint = args.endpoint || 'http://127.0.0.1:11434/api/generate';
const model = args.model || 'kosmo-qwen3-coder:30b-a3b-q4km';
const execute = args.execute === true;
const force = args.force === true;
const maxInputBytes = Number(args.maxInputBytes || 40000);
const outputJson = resolve(root, args.out || `data/kosmo-local-worker-http-runner-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-local-worker-http-runner-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const taskPack = JSON.parse(await readFile(taskPackPath, 'utf8'));
  const task = (taskPack.tasks || []).find((item) => item.task_id === taskId);
  if (!task) throw new Error(`Task not found in task pack: ${taskId}`);

  const guard = await buildGuard(task);
  const canExecute = guard.failures.length === 0 && execute;
  const outputAlreadyExists = existsSync(task.output_path);
  let modelResult = null;

  if (canExecute && outputAlreadyExists && !force) {
    guard.failures.push({
      id: 'output_exists_without_force',
      message: 'Output already exists. Pass --force only after overseer review.'
    });
  }

  if (guard.failures.length === 0 && execute) {
    modelResult = await runModel(task, guard.safe_inputs);
    await mkdir(dirname(task.output_path), { recursive: true });
    await writeFile(task.output_path, `${JSON.stringify(modelResult.parsed, null, 2)}\n`);
  }

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: statusFor({ guard, execute, modelResult }),
    policy: {
      review_only: true,
      default_dry_run: true,
      starts_model: execute && guard.failures.length === 0,
      reads_private_context_paths: false,
      reads_private_source_paths: false,
      writes_git: false,
      writes_cloud: false,
      public_ready_after_runner: 0,
      note: 'This runner only permits task-pack inputs that are existing relative repo report paths under data/, docs/ or examples/. It refuses private_context_paths and absolute input refs.'
    },
    task_pack: relative(root, taskPackPath),
    task: {
      task_id: task.task_id,
      lane: task.lane,
      output_path: task.output_path,
      output_filename: basename(task.output_path || ''),
      output_already_exists: outputAlreadyExists,
      execute_requested: execute,
      force_requested: force
    },
    model: {
      endpoint,
      name: model,
      used: Boolean(modelResult)
    },
    guard: {
      passed: guard.failures.length === 0,
      failures: guard.failures,
      safe_inputs: guard.safe_inputs.map((input) => ({
        ref: input.ref,
        bytes: input.bytes,
        truncated: input.truncated
      }))
    },
    model_result: modelResult
      ? {
          response_ms: modelResult.response_ms,
          json_valid: true,
          output_written: task.output_path,
          public_ready_after_model: modelResult.parsed?.policy?.public_ready_after_triage ?? modelResult.parsed?.public_ready_after_smoke ?? 0
        }
      : null,
    next_actions: nextActions({ guard, execute, modelResult, outputAlreadyExists })
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo local worker HTTP runner');
  console.log(`Status: ${report.status}`);
  console.log(`Task: ${task.task_id}`);
  console.log(`Guard failures: ${guard.failures.length}`);
  console.log(`Execute: ${execute ? 'yes' : 'no'}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (guard.failures.length > 0) process.exitCode = 1;
}

async function buildGuard(task) {
  const failures = [];
  const inputRefs = task.input_refs || [];
  const safeInputs = [];

  if (!String(task.output_path || '').includes('/KosmoZentrale/worker_packets/')) {
    failures.push({ id: 'output_not_worker_packet', message: 'Task output_path must target KosmoZentrale worker_packets.' });
  }
  if (!basename(task.output_path || '').includes('.private.')) {
    failures.push({ id: 'output_not_private', message: 'Task output filename must include .private.' });
  }
  if (!inputRefs.length) {
    failures.push({ id: 'missing_input_refs', message: 'Task must define input_refs.' });
  }

  for (const ref of inputRefs) {
    if (ref === 'private_context_paths') {
      failures.push({ id: 'private_context_paths_blocked', message: 'Runner refuses private_context_paths input refs.' });
      continue;
    }
    if (typeof ref !== 'string' || ref.startsWith('/')) {
      failures.push({ id: 'absolute_or_invalid_input_ref', message: `Runner refuses non-relative input ref: ${String(ref)}` });
      continue;
    }
    if (!/^(data|docs|examples)\//.test(ref)) {
      failures.push({ id: 'input_ref_outside_allowed_roots', message: `Input ref is outside data/, docs/ or examples/: ${ref}` });
      continue;
    }
    const path = resolve(root, ref);
    if (!existsSync(path)) {
      failures.push({ id: 'input_ref_missing', message: `Input ref does not exist: ${ref}` });
      continue;
    }
    const text = await readFile(path, 'utf8');
    safeInputs.push({
      ref,
      bytes: Buffer.byteLength(text),
      truncated: Buffer.byteLength(text) > maxInputBytes,
      text: text.slice(0, maxInputBytes)
    });
  }

  return { failures, safe_inputs: safeInputs };
}

async function runModel(task, safeInputs) {
  const started = Date.now();
  const prompt = [
    'You are a guarded ArchitectureKosmos local worker.',
    'Return only one valid JSON object. No markdown.',
    `Task id: ${task.task_id}`,
    `Objective: ${task.objective || 'Review-only task.'}`,
    `Acceptance: ${JSON.stringify(task.acceptance || [])}`,
    'Rules: do not claim public-ready, do not claim rights-cleared, do not request private paths, do not run Git or cloud writes.',
    'Set status to "local_worker_task_review_only".',
    'Set policy.public_ready_after_triage to 0.',
    `Inputs: ${JSON.stringify(safeInputs.map((input) => ({ ref: input.ref, text: input.text })))}`
  ].join('\n');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      options: { temperature: 0, num_predict: 1400 },
      prompt
    })
  });
  const body = await response.json().catch(() => null);
  const text = String(body?.response || '').trim();
  if (!response.ok) throw new Error(`Ollama HTTP failed: ${response.status}`);
  if (body?.model !== model) throw new Error(`Unexpected model returned: ${body?.model || 'missing'}`);
  const parsed = JSON.parse(text);
  const serialized = JSON.stringify(parsed);
  if (/public[_-]ready"\s*:\s*true/i.test(serialized)) throw new Error('Model output tried to set public-ready true.');
  if (/rights[_-]cleared"\s*:\s*true/i.test(serialized)) throw new Error('Model output tried to set rights-cleared true.');
  return {
    response_ms: Date.now() - started,
    parsed
  };
}

function statusFor({ guard, execute, modelResult }) {
  if (guard.failures.length > 0) return 'local_worker_http_runner_guard_failed';
  if (modelResult) return 'local_worker_http_runner_executed_review_only';
  if (execute) return 'local_worker_http_runner_execute_not_completed';
  return 'local_worker_http_runner_dry_run_ready';
}

function nextActions({ guard, execute, modelResult, outputAlreadyExists }) {
  if (guard.failures.length > 0) return [
    'Fix guard failures before running this task through a local model.',
    'Never pass private_context_paths to this HTTP runner.'
  ];
  if (!execute) return [
    outputAlreadyExists
      ? 'Output already exists; review it before considering --force.'
      : 'Use --execute only when an overseer wants the local model to write this private output.',
    'Keep this runner out of public promotion and Git/cloud writes.'
  ];
  if (modelResult) return [
    'Review the private worker output before converting anything into repo artifacts.',
    'Run local-worker-output-review, data-lane-sweep and worker-boundary-pack-check.'
  ];
  return ['Review runner state before retrying.'];
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker HTTP Runner');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Task');
  lines.push('');
  lines.push(`- Task: \`${report.task.task_id}\``);
  lines.push(`- Lane: ${report.task.lane}`);
  lines.push(`- Output exists: ${report.task.output_already_exists ? 'yes' : 'no'}`);
  lines.push(`- Execute requested: ${report.task.execute_requested ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Guard');
  lines.push('');
  lines.push(`- Passed: ${report.guard.passed ? 'yes' : 'no'}`);
  lines.push(`- Failures: ${report.guard.failures.length}`);
  lines.push(`- Safe inputs: ${report.guard.safe_inputs.length}`);
  report.guard.failures.forEach((failure) => lines.push(`- failure: \`${failure.id}\` - ${failure.message}`));
  lines.push('');
  lines.push('## Model');
  lines.push('');
  lines.push(`- Model: \`${report.model.name}\``);
  lines.push(`- Used: ${report.model.used ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
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
