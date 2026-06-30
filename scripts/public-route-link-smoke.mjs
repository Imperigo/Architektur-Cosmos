#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { publicLeakMatches } from './public-leak-patterns.mjs';
import { publicRouteChecks } from './public-route-manifest.mjs';

const args = parseArgs(process.argv.slice(2));
const root = process.cwd();
const baseUrl = String(args['base-url'] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const siteOrigin = new URL(baseUrl).origin;
const publicOrigin = 'https://architekturkosmos.ch';
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-data/review/public-route-link-smoke.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-data/review/public-route-link-smoke.generated.md');

const seedRoutes = publicRouteChecks
  .filter((route) => isHtmlRoute(route.path))
  .map((route) => route.path);

const requiredCoreLinks = ['/', '/references/', '/assets/', '/atlas/', '/orbit/'];

const findings = [];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const checkedPages = [];
  const checkedTargets = [];
  const targetPaths = new Set();
  let skippedExternal = 0;

  for (const path of seedRoutes) {
    const response = await fetch(`${baseUrl}${path}`);
    const body = await response.text();
    const links = extractAnchorHrefs(body);
    const normalizedLinks = new Set(links.map((href) => normalizeInternalHref(href)).filter(Boolean));
    const pageLeakMatches = publicLeakMatches(body);

    check(response.ok, `${path}:status`, `Expected HTTP 2xx for ${path}, got ${response.status}.`);
    check(pageLeakMatches.length === 0, `${path}:page_no_private_patterns`, `Blocked private/source patterns: ${pageLeakMatches.join(', ') || 'none'}.`);
    for (const requiredPath of requiredCoreLinks) {
      check(
        normalizedLinks.has(requiredPath),
        `${path}:core_link:${requiredPath}`,
        `Expected ${path} to include core navigation link ${requiredPath}.`
      );
    }

    for (const href of links) {
      const linkLeakMatches = publicLeakMatches(href);
      check(linkLeakMatches.length === 0, `${path}:href_no_private_patterns:${href}`, `Blocked private/source href patterns: ${linkLeakMatches.join(', ') || 'none'}.`);

      const normalized = normalizeInternalHref(href);
      if (!normalized) {
        skippedExternal += 1;
        continue;
      }
      targetPaths.add(normalized);
    }

    checkedPages.push({
      path,
      status: response.status,
      anchor_count: links.length,
      core_link_count: requiredCoreLinks.filter((requiredPath) => normalizedLinks.has(requiredPath)).length,
      private_pattern_count: pageLeakMatches.length
    });
  }

  for (const targetPath of [...targetPaths].sort()) {
    const response = await fetch(`${baseUrl}${targetPath}`);
    checkedTargets.push({
      path: targetPath,
      status: response.status
    });
    check(response.ok, `${targetPath}:target_status`, `Expected linked internal target ${targetPath} to return HTTP 2xx, got ${response.status}.`);
  }

  const failedFindings = findings.filter((finding) => !finding.passed);
  const summary = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-route-link-smoke',
    status: failedFindings.length === 0 ? 'public_route_link_smoke_passed' : 'public_route_link_smoke_failed',
    base_url: baseUrl,
    public_display_allowed: false,
    seed_route_count: seedRoutes.length,
    checked_target_count: checkedTargets.length,
    checkedPages,
    failed_targets: checkedTargets.filter((target) => target.status < 200 || target.status >= 300),
    skipped_external_links: skippedExternal,
    failed_findings: failedFindings
  };

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(summary), 'utf8');

  console.log('Public route link smoke');
  console.log(`Status: ${summary.status}`);
  console.log(`Seed routes: ${summary.seed_route_count}`);
  console.log(`Targets: ${summary.checked_target_count}`);
  console.log(`Findings: ${findings.length - failedFindings.length}/${findings.length}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (summary.status !== 'public_route_link_smoke_passed') process.exit(1);
}

function extractAnchorHrefs(html) {
  const hrefs = [];
  const anchorPattern = /<a\b[^>]*\bhref=(["'])(.*?)\1/gi;
  let match;
  while ((match = anchorPattern.exec(String(html))) !== null) {
    hrefs.push(match[2]);
  }
  return hrefs;
}

function normalizeInternalHref(href) {
  const value = String(href).trim();
  if (!value || value.startsWith('#')) return null;
  if (/^(mailto|tel|javascript|data|blob):/i.test(value)) return null;

  const parsed = new URL(value, baseUrl);
  if (parsed.origin !== siteOrigin && parsed.origin !== publicOrigin) return null;

  const path = `${parsed.pathname}${parsed.search}` || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function isHtmlRoute(path) {
  return !/\.(svg|txt|xml)$/i.test(path);
}

function check(passed, id, message) {
  findings.push({ id, passed: Boolean(passed), message });
}

function renderMarkdown(summary) {
  const lines = [
    '# Public Route Link Smoke',
    '',
    `Generated: ${summary.generated_at}`,
    `Status: \`${summary.status}\``,
    `Base URL: \`${summary.base_url}\``,
    `Public display allowed: \`${summary.public_display_allowed}\``,
    '',
    'Checks the manifest-derived public HTML routes for core navigation links, private/source leak patterns in rendered pages and hrefs, and HTTP 2xx responses for discovered internal targets.',
    '',
    '## Summary',
    '',
    `- seed routes: ${summary.seed_route_count}`,
    `- checked internal targets: ${summary.checked_target_count}`,
    `- skipped external links: ${summary.skipped_external_links}`,
    `- failed findings: ${summary.failed_findings.length}`,
    '',
    '## Seed Routes',
    '',
    '| Route | Status | Anchors | Core links | Private patterns |',
    '| --- | --- | ---: | ---: | ---: |'
  ];

  summary.checkedPages.forEach((page) => {
    lines.push(`| \`${page.path}\` | ${page.status} | ${page.anchor_count} | ${page.core_link_count}/${requiredCoreLinks.length} | ${page.private_pattern_count} |`);
  });

  if (summary.failed_targets.length > 0) {
    lines.push('', '## Failed Targets', '');
    summary.failed_targets.forEach((target) => lines.push(`- \`${target.path}\`: HTTP ${target.status}`));
  }

  if (summary.failed_findings.length > 0) {
    lines.push('', '## Failed Findings', '');
    summary.failed_findings.forEach((finding) => lines.push(`- \`${finding.id}\`: ${finding.message}`));
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
    if (index + 1 < argv.length && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
