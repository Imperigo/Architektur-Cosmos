#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-worker-boundary-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);

const expectedFailures = [
  'wrangler_forbidden_d1_databases',
  'wrangler_forbidden_r2_buckets',
  'wrangler_forbidden_vars',
  'worker_forbidden_method_post',
  'worker_blocked_route_api-admin-upload',
  'worker_unknown_route_api-admin-upload',
  'worker_unknown_route_api-unknown',
  'd1_prepare_or_exec',
  'r2_or_kv_write',
  'secret_access',
  'external_fetch',
  'worker_env_extra_bindings'
];

try {
  runSmoke();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  if (!keepTemp) rmSync(tempRoot, { recursive: true, force: true });
}

function runSmoke() {
  rmSync(tempRoot, { recursive: true, force: true });
  mkdirSync(tempRoot, { recursive: true });

  const wranglerPath = resolve(tempRoot, 'wrangler.synthetic.jsonc');
  const workerPath = resolve(tempRoot, 'worker.synthetic.ts');
  const outputPath = resolve(tempRoot, 'report.json');
  const markdownPath = resolve(tempRoot, 'report.md');

  writeFileSync(wranglerPath, renderSyntheticWrangler(), 'utf8');
  writeFileSync(workerPath, renderSyntheticWorker(), 'utf8');

  const result = spawnSync(
    process.execPath,
    [
      'scripts/public-worker-boundary-check.mjs',
      '--wrangler',
      wranglerPath,
      '--worker',
      workerPath,
      '--output',
      outputPath,
      '--markdown',
      markdownPath
    ],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (result.status === 0) {
    throw new Error('Expected public-worker-boundary-check to fail for synthetic unsafe Worker fixtures.');
  }

  const report = JSON.parse(readFileSync(outputPath, 'utf8'));
  const failedIds = new Set((report.findings || []).map((finding) => finding.id));
  const missingFailures = expectedFailures.filter((id) => !failedIds.has(id));

  if (missingFailures.length > 0) {
    throw new Error(`Worker boundary negative smoke missed failures: ${missingFailures.join(', ')}`);
  }

  const summary = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    expected_failed_checks: expectedFailures,
    observed_failed_checks: [...failedIds].sort(),
    report_path: keepTemp ? relative(root, outputPath) : null
  };

  console.log(JSON.stringify(summary, null, 2));
}

function renderSyntheticWrangler() {
  return [
    '{',
    '  "name": "architekturkosmos",',
    '  "compatibility_date": "2026-05-18",',
    '  "main": "./src/worker.ts",',
    '  "assets": {',
    '    "binding": "ASSETS",',
    '    "directory": "./out"',
    '  },',
    '  "d1_databases": [{ "binding": "DB", "database_name": "private" }],',
    '  "r2_buckets": [{ "binding": "ARCHIVE_BUCKET", "bucket_name": "private" }],',
    '  "vars": { "API_KEY": "synthetic" }',
    '}',
    ''
  ].join('\n');
}

function renderSyntheticWorker() {
  return [
    'type AssetsBinding = {',
    '  fetch(_request: Request): Promise<Response>;',
    '};',
    '',
    'type D1Database = {',
    '  prepare(query: string): { run(): Promise<unknown> };',
    '};',
    '',
    'type R2Bucket = {',
    '  put(key: string, body: string): Promise<unknown>;',
    '};',
    '',
    'type Env = {',
    '  ASSETS: AssetsBinding;',
    '  DB: D1Database;',
    '  BUCKET: R2Bucket;',
    '};',
    '',
    "const TOKEN = 'synthetic-secret';",
    "const forbiddenMethod = { method: 'POST' };",
    '',
    'const worker = {',
    '  async fetch(request: Request, env: Env): Promise<Response> {',
    "    if (request.method === 'OPTIONS') {",
    '      return new Response(null, { status: 204 });',
    '    }',
    '',
    '    const url = new URL(request.url);',
    "    if (!url.pathname.startsWith('/api/')) {",
    '      return env.ASSETS.fetch(request);',
    '    }',
    '',
    "    if (request.method !== 'GET') {",
    "      return new Response('Method not allowed', {",
    '        status: 405,',
    "        headers: { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }",
    '      });',
    '    }',
    '',
    "    if (url.pathname === '/api/admin/upload') {",
    "      await env.DB.prepare('insert into uploads values (?)').run();",
    "      await env.BUCKET.put('private-source.json', TOKEN);",
    "      return new Response(TOKEN);",
    '    }',
    '',
    "    if (url.pathname === '/api/unknown') {",
    "      return fetch('https://example.com/private-source.json');",
    '    }',
    '',
    "    return new Response('ok');",
    '  }',
    '};',
    '',
    'export default worker;',
    ''
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (index + 1 < argv.length && next && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
