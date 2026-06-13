#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const model = readArg('--model') ?? 'kosmo-qwen3-coder:30b-a3b-q4km';
const endpoint = readArg('--endpoint') ?? 'http://127.0.0.1:11434/api/generate';
const outputPath = resolve(root, readArg('--out') ?? 'data/kosmo-local-worker-ollama-smoke-2026-06-13.json');
const markdownPath = outputPath.replace(/\.json$/, '.md');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const prompt = [
    'Return one concise German sentence for a private review-only ArchitectureKosmos local worker smoke check.',
    'Must mention review-only and no public promotion.'
  ].join(' ');
  const started = Date.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0.1, num_predict: 80 },
      prompt
    })
  });
  const durationMs = Date.now() - started;
  const body = await response.json().catch(() => null);
  const text = String(body?.response ?? '').trim();
  const checks = {
    http_ok: response.ok,
    model_returned: body?.model === model,
    response_non_empty: text.length > 0,
    mentions_review_only: /review-only/i.test(text),
    mentions_no_public_promotion: /public|öffentlich|promotion/i.test(text)
  };
  const passed = Object.values(checks).every(Boolean);
  const report = {
    schema_version: '0.1',
    checked_at: new Date().toISOString(),
    status: passed ? 'passed' : 'failed',
    endpoint,
    model,
    duration_ms: durationMs,
    checks,
    response_length: text.length,
    response_preview: text.slice(0, 240),
    policy: {
      private_content_sent: false,
      public_promotion: false,
      note: 'Smoke prompt contains no private source content. Use Ollama HTTP API for worker automation instead of TTY CLI output.'
    }
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, renderMarkdown(report));

  console.log('Kosmo local worker Ollama smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Model: ${model}`);
  console.log(`Duration: ${durationMs}ms`);
  console.log(`Wrote: ${relative(root, outputPath)}`);

  if (!passed) process.exitCode = 1;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Local Worker Ollama Smoke');
  lines.push('');
  lines.push(`Checked: ${report.checked_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push(`Model: \`${report.model}\``);
  lines.push(`Endpoint: \`${report.endpoint}\``);
  lines.push(`Duration: ${report.duration_ms}ms`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  for (const [key, value] of Object.entries(report.checks)) {
    lines.push(`- ${key}: ${value ? 'passed' : 'failed'}`);
  }
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  lines.push('- No private source content was sent.');
  lines.push('- No public promotion was performed.');
  lines.push('- Use the Ollama HTTP API for local worker automation; avoid raw TTY CLI output for stored packets.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

