#!/usr/bin/env node

import { spawn } from 'node:child_process';

const port = 8787;
const baseUrl = `http://localhost:${port}`;
const readyTimeoutMs = Number.parseInt(process.env.BRAIN_API_SMOKE_TIMEOUT_MS ?? '180000', 10);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const worker = spawn('npx', ['--yes', 'wrangler', 'dev', '--local', '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  const ready = new Promise((resolve, reject) => {
    let readySettled = false;
    const timeout = setTimeout(() => reject(new Error(`Wrangler dev did not become ready in time.\n${output}`)), readyTimeoutMs);
    const settleReady = () => {
      if (readySettled) return;
      readySettled = true;
      clearTimeout(timeout);
      resolve();
    };
    const readyPatterns = [
      `Ready on ${baseUrl}`,
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
      'Ready on'
    ];
    const onData = (chunk) => {
      output += chunk.toString();
      if (readyPatterns.some((pattern) => output.includes(pattern))) {
        settleReady();
      }
    };

    worker.stdout.on('data', onData);
    worker.stderr.on('data', onData);
    worker.on('exit', (code) => {
      if (code !== null && code !== 0) {
        readySettled = true;
        clearTimeout(timeout);
        reject(new Error(`Wrangler dev exited early with code ${code}.\n${output}`));
      }
    });

    waitForHttpReady('/api/brain/status', readyTimeoutMs, () => readySettled).then(() => {
      settleReady();
    }).catch(() => {
      // The timeout above reports the captured Wrangler output.
    });
  });

  try {
    await ready;
    const status = await getJson('/api/brain/status');
    assert(status.status === 'ready', 'Brain status should be ready');
    assert(status.writes_database === false, 'Brain status must not write database');
    assert(status.publishes === false, 'Brain status must not publish');

    const activation = await getJson('/api/brain/activation');
    assert(activation.official_status === 'active_read_only', 'Activation should be read-only active');
    assert(activation.owner_approval_required === true, 'Activation must require owner approval');
    assert(activation.writes_database === false, 'Activation must not write database');

    const tasks = await getJson('/api/brain/tasks?limit=3&kind=model');
    assert(typeof tasks.count === 'number', 'Tasks response needs count');
    assert(Array.isArray(tasks.results), 'Tasks response needs results');
    assert(tasks.results.length <= 3, 'Tasks limit should be respected');
    assert(tasks.results.every((task) => task.kind === 'model'), 'Task kind filter should be respected');

    const highRiskTasks = await getJson('/api/brain/tasks?limit=5&risk_level=high');
    assert(highRiskTasks.results.every((task) => task.risk_level === 'high'), 'Risk filter should be respected');

    const report = await getJson('/api/brain/latest-report');
    assert(report.status === 'read_only_snapshot', 'Latest report should be a read-only snapshot');
    assert(Array.isArray(report.top_tasks), 'Latest report needs top_tasks');

    console.log('Architecture Cosmos Brain API smoke test passed.');
    console.log(`Status entries: ${status.summary.entries}`);
    console.log(`Activation: ${activation.official_status}`);
    console.log(`Model tasks: ${tasks.count}`);
    console.log(`High-risk tasks: ${highRiskTasks.count}`);
  } finally {
    worker.kill('SIGTERM');
    setTimeout(() => worker.kill('SIGKILL'), 1000).unref();
  }
}

async function waitForHttpReady(path, timeoutMs, isCancelled = () => false) {
  const startedAt = Date.now();
  while (!isCancelled() && Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}${path}`);
      if (response.ok) return;
    } catch {
      // Wrangler is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error('HTTP readiness probe timed out.');
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
