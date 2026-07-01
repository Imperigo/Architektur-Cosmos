#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import entries from '../data/mock-entries.json' with { type: 'json' };

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-static-sitemap-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);
const siteUrl = 'https://architekturkosmos.ch';
const blockedPath = '/_overseer/private-source.pdf';

const expectedPaths = [
  '/',
  '/archive/',
  '/assets/',
  '/atlas/',
  '/orbit/',
  '/references/',
  ...entries.map((entry) => `/atlas/${entry.slug}/`)
].sort();

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
  mkdirSync(resolve(tempRoot, 'out'), { recursive: true });

  writeFileSync(
    resolve(tempRoot, 'out/robots.txt'),
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /_overseer/private-source.pdf',
      `Sitemap: ${siteUrl}/sitemap.xml`,
      ''
    ].join('\n')
  );

  writeFileSync(
    resolve(tempRoot, 'out/sitemap.xml'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...[...expectedPaths, blockedPath].map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`),
      '</urlset>',
      ''
    ].join('\n')
  );

  const outputPath = resolve(tempRoot, 'report.json');
  const markdownPath = resolve(tempRoot, 'report.md');
  const result = spawnSync(
    process.execPath,
    [
      'scripts/public-static-sitemap-check.mjs',
      '--out',
      resolve(tempRoot, 'out'),
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
    throw new Error(`Expected public-static-sitemap-check to fail for blocked synthetic path ${blockedPath}.`);
  }

  if (!existsSync(outputPath)) {
    throw new Error(`Expected JSON report to be written at ${relative(root, outputPath)}.`);
  }

  const report = JSON.parse(readFileSync(outputPath, 'utf8'));
  const failedIds = new Set((report.checks || []).filter((check) => !check.passed).map((check) => check.id));
  const requiredFailures = [
    'robots:no_private_patterns',
    `sitemap:path:${blockedPath}:public_allowlist`,
    `sitemap:path:${blockedPath}:no_private_patterns`
  ];
  const missingFailures = requiredFailures.filter((id) => !failedIds.has(id));

  if (missingFailures.length > 0) {
    throw new Error(`Negative sitemap smoke missed expected failures: ${missingFailures.join(', ')}`);
  }

  const summary = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    blocked_path: blockedPath,
    expected_failed_checks: requiredFailures,
    observed_failed_checks: [...failedIds].sort(),
    report_path: keepTemp ? relative(root, outputPath) : null
  };

  console.log(JSON.stringify(summary, null, 2));
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
