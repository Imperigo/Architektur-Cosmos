#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outputJson = resolve(root, args.output || 'examples/kosmo-data/review/public-worker-boundary-check.generated.json');
const outputMd = resolve(root, args.markdown || 'examples/kosmo-data/review/public-worker-boundary-check.generated.md');
const wranglerPath = resolve(root, 'wrangler.jsonc');
const workerPath = resolve(root, 'src/worker.ts');

const allowedApiRoutes = new Set([
  '/api/entries.json',
  '/api/taxonomies.json',
  '/api/search',
  '/api/brain/status',
  '/api/brain/latest-report',
  '/api/brain/activation',
  '/api/brain/tasks'
]);

const blockedWranglerKeys = [
  'd1_databases',
  'r2_buckets',
  'kv_namespaces',
  'queues',
  'durable_objects',
  'vectorize',
  'hyperdrive',
  'services',
  'vars'
];

const blockedRouteFragments = [
  '/api/admin',
  '/api/private',
  '/api/upload',
  '/api/uploads',
  '/api/source',
  '/api/source-root',
  '/api/worker-log',
  '/api/worker-logs'
];

const blockedWorkerPatterns = [
  {
    id: 'd1_prepare_or_exec',
    pattern: /\b(?:prepare|batch|exec)\s*\(/,
    reason: 'The public Worker must not execute database operations.'
  },
  {
    id: 'r2_or_kv_write',
    pattern: /\b(?:put|delete)\s*\(/,
    reason: 'The public Worker must not write KV/R2-style storage.'
  },
  {
    id: 'secret_access',
    pattern: /\b(?:SECRET|TOKEN|PASSWORD|API_KEY)\b/,
    reason: 'The public Worker should not depend on runtime secrets.'
  }
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const findings = [
    ...checkWrangler(),
    ...checkWorker()
  ];

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-worker-boundary-check',
    status: findings.length === 0 ? 'public_worker_boundary_check_passed' : 'public_worker_boundary_check_failed',
    policy: {
      source_free: true,
      reads_private_content: false,
      writes_public_ready: false,
      starts_server: false,
      static_assets_worker: true,
      api_read_only: true
    },
    summary: {
      allowed_api_routes: allowedApiRoutes.size,
      failed_findings: findings.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMd, renderMarkdown(report), 'utf8');

  console.log('Public Worker boundary check');
  console.log(`Status: ${report.status}`);
  console.log(`Findings: ${report.summary.failed_findings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (findings.length > 0) process.exit(1);
}

function checkWrangler() {
  const findings = [];
  if (!existsSync(wranglerPath)) {
    return [finding('wrangler_missing', 'wrangler.jsonc', 1, 'wrangler.jsonc is required for the Cloudflare Static Assets deploy.')];
  }

  const source = readFileSync(wranglerPath, 'utf8');
  const withoutComments = stripJsonComments(source);

  requirePattern(findings, source, /"main"\s*:\s*"\.\/src\/worker\.ts"/, 'wrangler_main_worker', 'wrangler.jsonc must keep main pointed at ./src/worker.ts.');
  requirePattern(findings, source, /"assets"\s*:\s*\{[\s\S]*?"binding"\s*:\s*"ASSETS"[\s\S]*?\}/, 'wrangler_assets_binding', 'wrangler.jsonc must keep the ASSETS binding.');
  requirePattern(findings, source, /"assets"\s*:\s*\{[\s\S]*?"directory"\s*:\s*"\.\/out"[\s\S]*?\}/, 'wrangler_assets_directory', 'wrangler.jsonc must keep assets.directory as ./out.');

  for (const key of blockedWranglerKeys) {
    const pattern = new RegExp(`"${escapeRegExp(key)}"\\s*:`);
    if (pattern.test(withoutComments)) {
      findings.push(finding(`wrangler_forbidden_${key}`, 'wrangler.jsonc', lineNumberAt(source, source.indexOf(key)), `Forbidden live binding/config key for static public Worker: ${key}.`));
    }
  }

  const mainMatch = source.match(/^\s*"main"\s*:\s*"([^"]+)"/m);
  if (mainMatch && mainMatch[1] !== './src/worker.ts') {
    findings.push(finding('wrangler_unexpected_main', 'wrangler.jsonc', lineNumberAt(source, source.search(/^\s*"main"/m)), 'Unexpected Worker main entry. Keep the lightweight src/worker.ts shell.'));
  }

  return findings;
}

function checkWorker() {
  const findings = [];
  if (!existsSync(workerPath)) {
    return [finding('worker_missing', 'src/worker.ts', 1, 'src/worker.ts is required for the read-only API shell.')];
  }

  const source = readFileSync(workerPath, 'utf8');
  requirePattern(findings, source, /ASSETS\s*:\s*AssetsBinding/, 'worker_assets_binding_type', 'Worker Env must only require the ASSETS binding.');
  requirePattern(findings, source, /env\.ASSETS\.fetch\s*\(\s*request\s*\)/, 'worker_assets_passthrough', 'Worker must pass non-API requests through to Static Assets.');
  requirePattern(findings, source, /request\.method\s*!==\s*['"]GET['"]/, 'worker_get_only_guard', 'Worker must reject non-GET API requests after OPTIONS.');
  requirePattern(findings, source, /request\.method\s*===\s*['"]OPTIONS['"]/, 'worker_options_guard', 'Worker must keep explicit OPTIONS handling for CORS preflight.');

  const methodLiterals = stringLiteralsMatching(source, /\b(?:method|Access-Control-Allow-Methods)\b[\s\S]{0,80}(['"`])([A-Z]+)\1/g);
  for (const method of methodLiterals.filter((method) => !['GET', 'OPTIONS'].includes(method))) {
    findings.push(finding(`worker_forbidden_method_${method.toLowerCase()}`, 'src/worker.ts', lineNumberAt(source, source.indexOf(method)), `Forbidden public Worker method: ${method}.`));
  }

  const apiRoutes = stringLiteralsMatching(source, /(['"`])(\/api\/[^'"`]+)\1/g);
  for (const route of apiRoutes) {
    if (blockedRouteFragments.some((fragment) => route.startsWith(fragment))) {
      findings.push(finding(`worker_blocked_route_${slugify(route)}`, 'src/worker.ts', lineNumberAt(source, source.indexOf(route)), `Forbidden private/admin/upload Worker route: ${route}.`));
    }
    if (!allowedApiRoutes.has(route)) {
      findings.push(finding(`worker_unknown_route_${slugify(route)}`, 'src/worker.ts', lineNumberAt(source, source.indexOf(route)), `Unexpected public Worker API route. Add an explicit review before exposing: ${route}.`));
    }
  }

  for (const blocked of blockedWorkerPatterns) {
    const match = blocked.pattern.exec(source);
    if (match) {
      findings.push(finding(blocked.id, 'src/worker.ts', lineNumberAt(source, match.index), blocked.reason));
    }
  }

  findings.push(...checkExternalFetchCalls(source));

  if (/\btype\s+Env\s*=\s*\{[\s\S]*?\}/.test(source)) {
    const envBlock = source.match(/\btype\s+Env\s*=\s*\{[\s\S]*?\}/)?.[0] || '';
    if (!/ASSETS\s*:\s*AssetsBinding/.test(envBlock) || envBlock.split('\n').filter((line) => /^[\sA-Z0-9_]+:/.test(line)).length > 1) {
      findings.push(finding('worker_env_extra_bindings', 'src/worker.ts', lineNumberAt(source, source.indexOf('type Env')), 'Worker Env must not add live D1/R2/KV/service bindings without an owner architecture decision.'));
    }
  }

  return findings;
}

function checkExternalFetchCalls(source) {
  return source
    .split('\n')
    .flatMap((line, index) => {
      const isGlobalFetchCall = /(^|[^\w.])fetch\s*\(/.test(line);
      if (!isGlobalFetchCall) return [];
      if (/fetch\s*\(\s*_?request\s*[:),]/.test(line)) return [];
      return [finding('external_fetch', 'src/worker.ts', index + 1, 'The public Worker should serve bundled static data and ASSETS only.')];
    });
}

function requirePattern(findings, source, pattern, id, reason) {
  if (!pattern.test(source)) {
    findings.push(finding(id, pattern === source ? 'unknown' : inferFileForId(id), 1, reason));
  }
}

function inferFileForId(id) {
  return id.startsWith('wrangler') ? 'wrangler.jsonc' : 'src/worker.ts';
}

function finding(id, file, line, reason) {
  return { id, file, line, reason };
}

function stripJsonComments(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function stringLiteralsMatching(source, pattern) {
  const values = [];
  for (const match of source.matchAll(pattern)) {
    values.push(match[2]);
  }
  return [...new Set(values)].sort();
}

function lineNumberAt(source, index) {
  if (index < 0) return 1;
  return source.slice(0, index).split('\n').length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugify(value) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'route';
}

function renderMarkdown(report) {
  const lines = [
    '# Public Worker Boundary Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Checks the Cloudflare Worker deploy boundary for static-assets mode, read-only API routes and forbidden live bindings without starting a server or reading private content.',
    '',
    '## Policy',
    '',
    `- source_free: ${report.policy.source_free}`,
    `- reads_private_content: ${report.policy.reads_private_content}`,
    `- writes_public_ready: ${report.policy.writes_public_ready}`,
    `- starts_server: ${report.policy.starts_server}`,
    `- static_assets_worker: ${report.policy.static_assets_worker}`,
    `- api_read_only: ${report.policy.api_read_only}`,
    '',
    '## Summary',
    '',
    `- allowed API routes: ${report.summary.allowed_api_routes}`,
    `- findings: ${report.summary.failed_findings}`,
    `- public-ready after check: ${report.summary.public_ready_after_check}`
  ];

  if (report.findings.length > 0) {
    lines.push('', '## Findings', '');
    for (const item of report.findings) {
      lines.push(`- \`${item.id}\` (${item.file}:${item.line}): ${item.reason}`);
    }
  }

  return `${lines.join('\n')}\n`;
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
