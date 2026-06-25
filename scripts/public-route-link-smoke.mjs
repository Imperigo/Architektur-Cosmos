#!/usr/bin/env node

import { publicLeakMatches } from './public-leak-patterns.mjs';

const args = parseArgs(process.argv.slice(2));
const baseUrl = String(args['base-url'] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const siteOrigin = new URL(baseUrl).origin;
const publicOrigin = 'https://architekturkosmos.ch';

const seedRoutes = [
  '/',
  '/references/',
  '/assets/',
  '/orbit/',
  '/atlas/villa-savoye/',
  '/atlas/alterszentrum-kloster-ingenbohl/'
];

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

  const summary = {
    status: findings.every((finding) => finding.passed) ? 'passed' : 'failed',
    base_url: baseUrl,
    seed_route_count: seedRoutes.length,
    checked_target_count: checkedTargets.length,
    checkedPages,
    failed_targets: checkedTargets.filter((target) => target.status < 200 || target.status >= 300),
    skipped_external_links: skippedExternal,
    failed_findings: findings.filter((finding) => !finding.passed)
  };

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== 'passed') process.exit(1);
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

function check(passed, id, message) {
  findings.push({ id, passed: Boolean(passed), message });
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
