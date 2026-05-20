#!/usr/bin/env node

import { spawn } from 'node:child_process';

const port = 8787;
const baseUrl = `http://localhost:${port}`;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const worker = spawn('npx', ['wrangler', 'dev', '--local', '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Wrangler dev did not become ready in time.')), 30000);
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes(`Ready on ${baseUrl}`)) {
        clearTimeout(timeout);
        resolve();
      }
    };

    worker.stdout.on('data', onData);
    worker.stderr.on('data', onData);
    worker.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Wrangler dev exited early with code ${code}.\n${output}`));
      }
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
