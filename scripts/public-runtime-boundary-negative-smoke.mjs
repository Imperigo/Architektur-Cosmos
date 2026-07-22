#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-runtime-boundary-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);

const expectedFailures = [
  'forbidden_route_runtime_file',
  'server_action_directive',
  'next_server_import',
  'server_redirect',
  'request_context_api',
  'runtime_revalidation',
  'no_store_fetch',
  'next_revalidate_export',
  'dynamic_runtime_export',
  'explicit_next_runtime',
  'next_output_export',
  'next_images_unoptimized',
  'next_trailing_slash'
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
  writeFixture('next.config.js', renderUnsafeNextConfig());
  writeFixture('middleware.ts', renderUnsafeMiddleware());
  writeFixture('app/api/private/route.ts', renderUnsafeApiRoute());
  writeFixture('app/unsafe/page.tsx', renderUnsafePage());
  writeFixture('components/UnsafeRuntimeWidget.tsx', renderUnsafeComponent());
  writeFixture('lib/unsafe-runtime.ts', renderUnsafeLibrary());

  const outputPath = resolve(tempRoot, 'report.json');
  const markdownPath = resolve(tempRoot, 'report.md');
  const result = spawnSync(
    process.execPath,
    [
      'scripts/public-runtime-boundary-check.mjs',
      '--scan-root',
      tempRoot,
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
    throw new Error('Expected public-runtime-boundary-check to fail for synthetic static-export breakers.');
  }

  const report = JSON.parse(readFileSync(outputPath, 'utf8'));
  const failedIds = new Set((report.findings || []).map((finding) => finding.id));
  const missingFailures = expectedFailures.filter((id) => !failedIds.has(id));

  if (missingFailures.length > 0) {
    throw new Error(`Runtime boundary negative smoke missed failures: ${missingFailures.join(', ')}\n${result.stdout || ''}${result.stderr || ''}`);
  }

  console.log(JSON.stringify({
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    expected_failed_checks: expectedFailures,
    observed_failed_checks: [...failedIds].sort(),
    report_path: keepTemp ? relative(root, outputPath) : null
  }, null, 2));
}

function writeFixture(relativePath, body) {
  const filePath = resolve(tempRoot, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${body}\n`, 'utf8');
}

function renderUnsafeNextConfig() {
  return [
    'const nextConfig = {',
    "  output: 'standalone',",
    '  trailingSlash: false,',
    '  images: { unoptimized: false }',
    '};',
    '',
    'export default nextConfig;'
  ].join('\n');
}

function renderUnsafeMiddleware() {
  return [
    "import { NextResponse } from 'next/server';",
    '',
    'export function middleware() {',
    '  return NextResponse.next();',
    '}'
  ].join('\n');
}

function renderUnsafeApiRoute() {
  return [
    "import { NextResponse } from 'next/server';",
    '',
    'export async function GET() {',
    "  return NextResponse.json({ status: 'private-runtime' });",
    '}'
  ].join('\n');
}

function renderUnsafePage() {
  return [
    "'use server';",
    '',
    "import { cookies, headers } from 'next/headers';",
    "import { redirect } from 'next/navigation';",
    "import { revalidatePath, unstable_noStore } from 'next/cache';",
    '',
    'export const revalidate = 60;',
    "export const dynamic = 'force-dynamic';",
    "export const runtime = 'edge';",
    '',
    'export default async function UnsafePage() {',
    '  unstable_noStore();',
    "  revalidatePath('/private');",
    '  cookies();',
    '  headers();',
    "  redirect('/private');",
    "  await fetch('https://example.com/private.json', { cache: 'no-store' });",
    '  return null;',
    '}'
  ].join('\n');
}

function renderUnsafeComponent() {
  return [
    "import { NextRequest } from 'next/server';",
    '',
    'export function UnsafeRuntimeWidget(_request: NextRequest) {',
    '  return null;',
    '}'
  ].join('\n');
}

function renderUnsafeLibrary() {
  return [
    'export async function loadRuntimeOnlyData() {',
    "  return fetch('https://example.com/runtime.json', { cache: 'no-store' });",
    '}'
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
