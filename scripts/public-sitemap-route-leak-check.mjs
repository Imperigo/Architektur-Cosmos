#!/usr/bin/env node

import { publicLeakMatches } from './public-leak-patterns.mjs';

const args = parseArgs(process.argv.slice(2));
const baseUrl = String(args['base-url'] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const siteUrl = String(args['site-url'] || 'https://architekturkosmos.ch').replace(/\/$/, '');
const verbose = Boolean(args.verbose);
const minBodyLength = Number(args['min-body-length'] || 500);
const timeoutMs = Number(args['timeout-ms'] || 5000);

const findings = [];

main().catch((error) => {
  console.log(JSON.stringify({
    status: 'failed',
    base_url: baseUrl,
    site_url: siteUrl,
    checked_route_count: 0,
    findings: [
      {
        id: 'runtime:fetch_failed',
        passed: false,
        message: error instanceof Error ? error.message : String(error)
      }
    ],
    error: serializeError(error)
  }, null, 2));
  process.exit(1);
});

async function main() {
  const robotsUrl = `${baseUrl}/robots.txt`;
  const robotsResponse = await fetchWithTimeout(robotsUrl);
  const robotsBody = await robotsResponse.text();
  const robotsLeakMatches = publicLeakMatches(robotsBody);

  check(robotsResponse.ok, 'robots:status', `Expected HTTP 2xx for ${robotsUrl}, got ${robotsResponse.status}.`);
  check(
    robotsLeakMatches.length === 0,
    'robots:no_private_patterns',
    `Blocked private/source patterns: ${robotsLeakMatches.join(', ') || 'none'}.`
  );
  check(
    robotsBody.includes(`Sitemap: ${siteUrl}/sitemap.xml`),
    'robots:sitemap_reference',
    `Expected robots.txt to reference ${siteUrl}/sitemap.xml.`
  );

  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const sitemapResponse = await fetchWithTimeout(sitemapUrl);
  const sitemapBody = await sitemapResponse.text();

  check(sitemapResponse.ok, 'sitemap:status', `Expected HTTP 2xx for ${sitemapUrl}, got ${sitemapResponse.status}.`);

  const paths = [...sitemapBody.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => match[1])
    .filter((url) => url.startsWith(siteUrl))
    .map((url) => new URL(url).pathname);

  check(paths.length > 0, 'sitemap:routes_present', 'Expected at least one same-site route in sitemap.xml.');

  const checkedRoutes = [];

  for (const path of paths) {
    const url = `${baseUrl}${path}`;
    const response = await fetchWithTimeout(url);
    const body = await response.text();
    const blockedMatches = publicLeakMatches(body);

    check(response.ok, `${path}:status`, `Expected HTTP 2xx for ${path}, got ${response.status}.`);
    check(
      body.length >= minBodyLength,
      `${path}:min_body_length`,
      `Expected ${path} body length >= ${minBodyLength}, got ${body.length}.`
    );
    check(blockedMatches.length === 0, `${path}:no_private_patterns`, `Blocked private/source patterns: ${blockedMatches.join(', ') || 'none'}.`);

    checkedRoutes.push({
      path,
      status: response.status,
      body_length: body.length,
      min_body_length: minBodyLength,
      blocked_pattern_count: blockedMatches.length
    });
  }

  const summary = {
    status: findings.every((finding) => finding.passed) ? 'passed' : 'failed',
    base_url: baseUrl,
    site_url: siteUrl,
    checked_robots: {
      status: robotsResponse.status,
      body_length: robotsBody.length,
      blocked_pattern_count: robotsLeakMatches.length,
      sitemap_reference_present: robotsBody.includes(`Sitemap: ${siteUrl}/sitemap.xml`)
    },
    checked_route_count: checkedRoutes.length,
    checkedRoutes: verbose || checkedRoutes.some((route) => route.blocked_pattern_count > 0)
      ? checkedRoutes
      : undefined,
    findings: findings.filter((finding) => !finding.passed)
  };

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== 'passed') process.exit(1);
}

function check(passed, id, message) {
  findings.push({ id, passed: Boolean(passed), message });
}

async function fetchWithTimeout(url) {
  try {
    return await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    const detail = serializeError(error);
    const suffix = detail.cause_code ? ` (${detail.cause_code})` : '';
    throw new Error(`Unable to fetch ${url} within ${timeoutMs}ms${suffix}. Start the public demo server or pass --base-url to a reachable instance.`, {
      cause: error
    });
  }
}

function serializeError(error) {
  if (!(error instanceof Error)) return { message: String(error) };
  return {
    name: error.name,
    message: error.message,
    cause_code: error.cause && typeof error.cause === 'object' && 'code' in error.cause ? String(error.cause.code) : undefined,
    cause_message: error.cause instanceof Error ? error.cause.message : undefined
  };
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
