#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import entries from '../data/mock-entries.json' with { type: 'json' };
import { publicLeakMatches } from './public-leak-patterns.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outRoot = resolve(root, args.out || 'out');
const siteUrl = String(args['site-url'] || 'https://architekturkosmos.ch').replace(/\/$/, '');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-data/review/public-static-sitemap-check.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-data/review/public-static-sitemap-check.generated.md');

const requiredTopLevelPaths = ['/', '/atlas/', '/references/', '/assets/', '/orbit/', '/archive/'];
const expectedSitemapPaths = [
  ...requiredTopLevelPaths,
  ...entries.map((entry) => `/atlas/${entry.slug}/`)
].sort();

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  if (!existsSync(outRoot)) {
    throw new Error(`Static export not found: ${relative(root, outRoot)}. Run npm run build first.`);
  }

  const robotsPath = resolve(outRoot, 'robots.txt');
  const sitemapPath = resolve(outRoot, 'sitemap.xml');
  const robotsBody = existsSync(robotsPath) ? readFileSync(robotsPath, 'utf8') : '';
  const sitemapBody = existsSync(sitemapPath) ? readFileSync(sitemapPath, 'utf8') : '';
  const sitemapUrls = extractLocs(sitemapBody);
  const sitemapPaths = sitemapUrls.map(urlToPublicPath).filter(Boolean).sort();
  const duplicatePaths = findDuplicates(sitemapPaths);
  const sitemapPathSet = new Set(sitemapPaths);
  const expectedPathSet = new Set(expectedSitemapPaths);

  const checks = [
    check('robots:file_exists', existsSync(robotsPath), 'Expected out/robots.txt to exist.'),
    check('robots:no_private_patterns', publicLeakMatches(robotsBody).length === 0, leakMessage(robotsBody)),
    check('robots:allows_root', /(^|\n)Allow:\s*\/\s*(\n|$)/i.test(robotsBody), 'Expected robots.txt to allow /.'),
    check('robots:sitemap_reference', robotsBody.includes(`Sitemap: ${siteUrl}/sitemap.xml`), `Expected robots.txt to reference ${siteUrl}/sitemap.xml.`),
    check('sitemap:file_exists', existsSync(sitemapPath), 'Expected out/sitemap.xml to exist.'),
    check('sitemap:no_private_patterns', publicLeakMatches(sitemapBody).length === 0, leakMessage(sitemapBody)),
    check('sitemap:urlset_present', sitemapBody.includes('<urlset'), 'Expected sitemap.xml to include <urlset.'),
    check('sitemap:urls_present', sitemapUrls.length > 0, 'Expected sitemap.xml to contain at least one <loc>.'),
    check('sitemap:all_urls_on_site', sitemapUrls.every((url) => url.startsWith(`${siteUrl}/`)), `Expected every sitemap URL to start with ${siteUrl}/.`),
    check('sitemap:no_duplicate_paths', duplicatePaths.length === 0, `Duplicate sitemap paths: ${duplicatePaths.join(', ') || 'none'}.`)
  ];

  for (const expectedPath of expectedSitemapPaths) {
    checks.push(check(
      `sitemap:expected:${expectedPath}`,
      sitemapPathSet.has(expectedPath),
      `Expected sitemap.xml to include ${siteUrl}${expectedPath}.`
    ));
  }

  for (const actualPath of sitemapPaths) {
    const leakMatches = publicLeakMatches(actualPath);
    checks.push(check(
      `sitemap:path:${actualPath}:public_allowlist`,
      expectedPathSet.has(actualPath),
      `Unexpected sitemap path: ${actualPath}.`
    ));
    checks.push(check(
      `sitemap:path:${actualPath}:no_private_patterns`,
      leakMatches.length === 0,
      `Blocked private/source patterns: ${leakMatches.join(', ') || 'none'}.`
    ));
  }

  const failedChecks = checks.filter((item) => !item.passed);
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-static-sitemap-check',
    status: failedChecks.length === 0 ? 'public_static_sitemap_check_passed' : 'public_static_sitemap_check_failed',
    policy: {
      source_free: true,
      reads_private_content: false,
      writes_public_ready: false,
      starts_server: false,
      scans_static_export_only: true
    },
    inputs: {
      out_dir: relative(root, outRoot),
      site_url: siteUrl,
      public_entry_count: entries.length
    },
    summary: {
      expected_sitemap_paths: expectedSitemapPaths.length,
      actual_sitemap_paths: sitemapPaths.length,
      duplicate_sitemap_paths: duplicatePaths.length,
      failed_checks: failedChecks.length
    },
    expected_sitemap_paths: expectedSitemapPaths,
    actual_sitemap_paths: sitemapPaths,
    checks
  };

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('Public static sitemap check');
  console.log(`Status: ${report.status}`);
  console.log(`Sitemap paths: ${report.summary.actual_sitemap_paths}/${report.summary.expected_sitemap_paths}`);
  console.log(`Checks: ${checks.length - failedChecks.length}/${checks.length}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (failedChecks.length > 0) process.exit(1);
}

function extractLocs(value) {
  return [...String(value).matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].trim());
}

function urlToPublicPath(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return null;
  }
}

function check(id, passed, message) {
  return { id, passed: Boolean(passed), message };
}

function leakMessage(value) {
  const matches = publicLeakMatches(value);
  return `Blocked private/source patterns: ${matches.join(', ') || 'none'}.`;
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function renderMarkdown(report) {
  const lines = [
    '# Public Static Sitemap Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Checks the exported robots.txt and sitemap.xml against the public route allowlist and mock-entry Atlas slugs without starting a server, reading private source contents or changing public-ready state.',
    '',
    '## Summary',
    '',
    `- expected sitemap paths: ${report.summary.expected_sitemap_paths}`,
    `- actual sitemap paths: ${report.summary.actual_sitemap_paths}`,
    `- duplicate sitemap paths: ${report.summary.duplicate_sitemap_paths}`,
    `- failed checks: ${report.summary.failed_checks}`,
    '',
    '## Policy',
    '',
    `- source_free: ${report.policy.source_free}`,
    `- reads_private_content: ${report.policy.reads_private_content}`,
    `- writes_public_ready: ${report.policy.writes_public_ready}`,
    `- starts_server: ${report.policy.starts_server}`
  ];

  const failed = report.checks.filter((item) => !item.passed);
  if (failed.length > 0) {
    lines.push('', '## Failed Checks', '');
    failed.forEach((item) => lines.push(`- \`${item.id}\`: ${item.message}`));
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
