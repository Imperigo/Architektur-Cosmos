#!/usr/bin/env node

const args = parseArgs(process.argv.slice(2));
const baseUrl = String(args['base-url'] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const siteUrl = String(args['site-url'] || 'https://architekturkosmos.ch').replace(/\/$/, '');
const verbose = Boolean(args.verbose);

const blockedPatterns = [
  /\/mnt\//i,
  /\/home\//i,
  /source-root/i,
  /private-library/i,
  /onedrive/i,
  /archiv\/architekturkosmos\/assets/i,
  /\.pdf($|\?)/i,
  /archive-intake/i,
  /\bocr\b/i
];

const findings = [];

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const sitemapResponse = await fetch(sitemapUrl);
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
    const response = await fetch(url);
    const body = await response.text();
    const blockedMatches = blockedPatterns
      .filter((pattern) => pattern.test(body))
      .map((pattern) => pattern.toString());

    check(response.ok, `${path}:status`, `Expected HTTP 2xx for ${path}, got ${response.status}.`);
    check(blockedMatches.length === 0, `${path}:no_private_patterns`, `Blocked private/source patterns: ${blockedMatches.join(', ') || 'none'}.`);

    checkedRoutes.push({
      path,
      status: response.status,
      blocked_pattern_count: blockedMatches.length
    });
  }

  const summary = {
    status: findings.every((finding) => finding.passed) ? 'passed' : 'failed',
    base_url: baseUrl,
    site_url: siteUrl,
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
