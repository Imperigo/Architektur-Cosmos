#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const workspace = await mkdtemp(join(tmpdir(), 'public-app-route-source-policy-'));
  try {
    const appDir = join(workspace, 'app');
    const manifestPath = join(workspace, 'public-route-manifest.synthetic.mjs');
    const entriesPath = join(workspace, 'entries.json');
    await writeCleanFixture(appDir, manifestPath, entriesPath);

    const clean = runCheck(appDir, manifestPath, entriesPath);
    if (clean.status !== 0) {
      throw new Error(`Expected clean synthetic app routes to pass, got ${clean.status}.\n${clean.output}`);
    }

    const cases = [
      {
        file: 'private/source-root/page.tsx',
        expected: [
          'source-route:/private/source-root/:blocked-surface',
          'source-route:/private/source-root/:private-pattern',
          'source-route:/private/source-root/:manifest-missing'
        ]
      },
      {
        file: 'owner-inbox/page.tsx',
        expected: [
          'source-route:/owner-inbox/:blocked-surface',
          'source-route:/owner-inbox/:manifest-missing'
        ]
      },
      {
        file: 'preview-missing/page.tsx',
        expected: ['source-route:/preview-missing/:manifest-missing']
      },
      {
        file: 'atlas/[secret]/page.tsx',
        expected: ['source-route:/atlas/[secret]/:unsupported-dynamic']
      }
    ];

    const observed = [];
    for (const testCase of cases) {
      await writeFixtureFile(join(appDir, testCase.file), 'export default function Page() { return null; }');
      const poisoned = runCheck(appDir, manifestPath, entriesPath);
      if (poisoned.status === 0) {
        throw new Error(`Expected synthetic source route ${testCase.file} to fail.`);
      }
      const failedIds = new Set((poisoned.report?.failures ?? []).map((failure) => failure.id));
      const missing = testCase.expected.filter((id) => !failedIds.has(id));
      if (missing.length > 0) {
        throw new Error(`Negative source-route smoke missed expected failures: ${missing.join(', ')}.\n${poisoned.output}`);
      }
      observed.push(...testCase.expected);
      await rm(join(appDir, testCase.file), { force: true });
    }

    console.log(JSON.stringify({
      status: 'passed',
      synthetic_only: true,
      reads_private_content: false,
      starts_server: false,
      checked_cases: cases.length + 1,
      expected_failed_checks: [...new Set(observed)].sort()
    }, null, 2));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function writeCleanFixture(appDir, manifestPath, entriesPath) {
  await Promise.all([
    writeFixtureFile(join(appDir, 'page.tsx'), 'export default function Page() { return null; }'),
    writeFixtureFile(join(appDir, 'assets/page.tsx'), 'export default function Page() { return null; }'),
    writeFixtureFile(join(appDir, 'atlas/[slug]/page.tsx'), 'export function generateStaticParams() { return [{ slug: "villa-savoye" }]; } export default function Page() { return null; }'),
    writeFixtureFile(join(appDir, 'robots.ts'), 'export default function robots() { return {}; }'),
    writeFixtureFile(join(appDir, 'sitemap.ts'), 'export default function sitemap() { return []; }'),
    writeFixtureFile(join(appDir, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    writeFixtureFile(entriesPath, `${JSON.stringify([{ slug: 'villa-savoye' }], null, 2)}\n`),
    writeFixtureFile(manifestPath, renderManifest())
  ]);
}

async function writeFixtureFile(filePath, body) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${body}\n`, 'utf8');
}

function runCheck(appDir, manifestPath, entriesPath) {
  const result = spawnSync(process.execPath, [
    'scripts/public-app-route-source-policy-check.mjs',
    '--app-dir',
    resolve(appDir),
    '--manifest',
    resolve(manifestPath),
    '--entries',
    resolve(entriesPath)
  ], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  return {
    status: result.status,
    output: `${result.stdout || ''}${result.stderr || ''}`,
    report: parseJson(result.stdout)
  };
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function renderManifest() {
  return [
    'export const publicRouteChecks = [',
    "  { path: '/', includes: ['Architecture Cosmos'] },",
    "  { path: '/assets/', includes: ['KosmoAsset'] },",
    "  { path: '/atlas/villa-savoye/', includes: ['Villa Savoye'] },",
    "  { path: '/robots.txt', rawIncludes: ['User-Agent: *'] },",
    "  { path: '/sitemap.xml', rawIncludes: ['<urlset'] },",
    "  { path: '/icon.svg', rawIncludes: ['<svg'] }",
    '];',
    'export const publicRoutes = publicRouteChecks.map((route) => route.path);',
    ''
  ].join('\n');
}
