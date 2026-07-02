#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const dateStamp = new Date().toISOString().slice(0, 10);
const model = readArg('--model') ?? 'kosmo-qwen3-coder:30b-a3b-q4km';
const endpoint = readArg('--endpoint') ?? 'http://127.0.0.1:11434/api/generate';
const outputPath = resolve(root, readArg('--out') ?? `data/kosmo-local-worker-ollama-smoke-${dateStamp}.json`);
const markdownPath = outputPath.replace(/\.json$/, '.md');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const textPrompt = [
    'Return exactly one line for an ArchitectureKosmos local worker smoke check.',
    'The line must include the exact tokens REVIEW_ONLY and NO_PUBLIC_PROMOTION.',
    'No explanation, no translation, no markdown.'
  ].join(' ');
  const started = Date.now();
  let textResult;
  let jsonResult;
  try {
    textResult = await generate({
      prompt: textPrompt,
      options: { temperature: 0.1, num_predict: 80 }
    });
    jsonResult = await generate({
      prompt: [
        'Return a single valid JSON object for an ArchitectureKosmos local worker JSON capture smoke.',
        'Use this exact shape:',
        '{"status":"review_only","public_ready_after_smoke":0,"private_content_sent":false,"notes":["NO_PUBLIC_PROMOTION"]}',
        'Do not include markdown.'
      ].join(' '),
      format: 'json',
      options: { temperature: 0, num_predict: 160 }
    });
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      await writeUnavailableReport({ error, started });
      return;
    }
    throw error;
  }
  const durationMs = Date.now() - started;
  const text = textResult.text;
  const parsedJson = parseJsonObject(jsonResult.text);
  const checks = {
    http_ok: textResult.response_ok && jsonResult.response_ok,
    model_returned: textResult.model_returned && jsonResult.model_returned,
    response_non_empty: text.length > 0,
    json_response_non_empty: jsonResult.text.length > 0,
    json_response_valid: parsedJson.valid,
    json_status_review_only: parsedJson.value?.status === 'review_only',
    json_public_ready_zero: parsedJson.value?.public_ready_after_smoke === 0,
    json_private_content_false: parsedJson.value?.private_content_sent === false
  };
  const advisory_checks = {
    mentions_review_only: /\bREVIEW_ONLY\b/i.test(text),
    mentions_no_public_promotion: /\bNO_PUBLIC_PROMOTION\b/i.test(text) || /\bNO_PUBLIC_PROMOTION\b/i.test(jsonResult.text)
  };
  const passed = Object.values(checks).every(Boolean);
  const report = {
    schema_version: '0.2',
    checked_at: new Date().toISOString(),
    status: passed ? 'passed' : 'failed',
    endpoint,
    model,
    duration_ms: durationMs,
    checks,
    advisory_checks,
    response_length: text.length,
    response_preview: text.slice(0, 240),
    json_capture: {
      response_length: jsonResult.text.length,
      response_preview: jsonResult.text.slice(0, 240),
      parse_error: parsedJson.error,
      parsed: parsedJson.valid
        ? {
            status: parsedJson.value.status,
            public_ready_after_smoke: parsedJson.value.public_ready_after_smoke,
            private_content_sent: parsedJson.value.private_content_sent,
            notes_count: Array.isArray(parsedJson.value.notes) ? parsedJson.value.notes.length : 0
          }
        : null
    },
    policy: {
      private_content_sent: false,
      public_promotion: false,
      starts_model: true,
      stores_full_response: false,
      note: 'Smoke prompt contains no private source content. Use Ollama HTTP API with format=json for structured worker automation instead of TTY CLI output.'
    }
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, renderMarkdown(report));

  console.log('Kosmo local worker Ollama smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Model: ${model}`);
  console.log(`Duration: ${durationMs}ms`);
  console.log(`JSON valid: ${report.checks.json_response_valid}`);
  console.log(`Wrote: ${relative(root, outputPath)}`);

  if (!passed) process.exitCode = 1;
}

async function writeUnavailableReport({ error, started }) {
  const durationMs = Date.now() - started;
  const report = {
    schema_version: '0.2',
    checked_at: new Date().toISOString(),
    status: 'skipped_unavailable',
    endpoint,
    model,
    duration_ms: durationMs,
    checks: {
      endpoint_reachable: false,
      model_returned: false,
      response_non_empty: false,
      json_response_valid: false
    },
    advisory_checks: {
      local_worker_available: false
    },
    skip_reason: {
      code: error?.cause?.code ?? error?.code ?? 'fetch_failed',
      message: error?.message ?? 'Local Ollama endpoint unavailable'
    },
    response_length: 0,
    response_preview: '',
    json_capture: {
      response_length: 0,
      response_preview: '',
      parse_error: null,
      parsed: null
    },
    policy: {
      private_content_sent: false,
      public_promotion: false,
      starts_model: false,
      stores_full_response: false,
      note: 'Local Ollama endpoint was unavailable, so no model prompt was sent. This skip keeps review-only data gates from failing on local service availability.'
    }
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, renderMarkdown(report));

  console.log('Kosmo local worker Ollama smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Model: ${model}`);
  console.log(`Duration: ${durationMs}ms`);
  console.log(`Endpoint reachable: false`);
  console.log(`Wrote: ${relative(root, outputPath)}`);
}

function isEndpointUnavailable(error) {
  const code = error?.cause?.code ?? error?.code;
  return error?.message === 'fetch failed' &&
    ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EHOSTUNREACH', 'ETIMEDOUT'].includes(code);
}

async function generate({ prompt, format, options }) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      ...(format ? { format } : {}),
      options,
      prompt
    })
  });
  const body = await response.json().catch(() => null);
  return {
    response_ok: response.ok,
    model_returned: body?.model === model,
    text: String(body?.response ?? '').trim()
  };
}

function parseJsonObject(text) {
  try {
    return { valid: true, value: JSON.parse(text), error: null };
  } catch (error) {
    return { valid: false, value: null, error: error.message };
  }
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
  lines.push('## Advisory Checks');
  lines.push('');
  for (const [key, value] of Object.entries(report.advisory_checks)) {
    lines.push(`- ${key}: ${value ? 'passed' : 'needs_review'}`);
  }
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  lines.push('- No private source content was sent.');
  lines.push('- No public promotion was performed.');
  lines.push('- Use the Ollama HTTP API with `format=json` for structured local worker automation; avoid raw TTY CLI output for stored packets.');
  lines.push('');
  lines.push('## JSON Capture');
  lines.push('');
  lines.push(`- JSON valid: ${report.checks.json_response_valid ? 'passed' : 'failed'}`);
  lines.push(`- JSON status review-only: ${report.checks.json_status_review_only ? 'passed' : 'failed'}`);
  lines.push(`- JSON public-ready zero: ${report.checks.json_public_ready_zero ? 'passed' : 'failed'}`);
  lines.push(`- JSON private content false: ${report.checks.json_private_content_false ? 'passed' : 'failed'}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
