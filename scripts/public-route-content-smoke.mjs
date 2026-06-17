#!/usr/bin/env node

const args = parseArgs(process.argv.slice(2));
const baseUrl = String(args['base-url'] || 'http://127.0.0.1:3000').replace(/\/$/, '');

const routes = [
  {
    path: '/',
    includes: ['Architektur Kosmos']
  },
  {
    path: '/references/',
    includes: [
      'KosmoReferences',
      'KosmoDraw Intake',
      'Digitalization Preflight',
      'Villa Savoye',
      'Alterszentrum Kloster Ingenbohl'
    ]
  },
  {
    path: '/assets/',
    includes: [
      'KosmoAsset',
      'KosmoDraw Asset Intake',
      'Digitalization Asset Preflight',
      'Villa Savoye'
    ]
  },
  {
    path: '/atlas/villa-savoye/',
    includes: ['Villa Savoye']
  },
  {
    path: '/atlas/alterszentrum-kloster-ingenbohl/',
    includes: ['Alterszentrum Kloster Ingenbohl']
  },
  {
    path: '/sitemap.xml',
    rawIncludes: ['<urlset']
  }
];

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

main();

async function main() {
  const checkedRoutes = [];

  for (const route of routes) {
    const url = `${baseUrl}${route.path}`;
    const response = await fetch(url);
    const body = await response.text();
    const normalized = normalizeHtmlText(body);
    const blockedMatches = blockedPatterns
      .filter((pattern) => pattern.test(body))
      .map((pattern) => pattern.toString());

    check(response.ok, `${route.path}:status`, `Expected HTTP 2xx for ${route.path}, got ${response.status}.`);
    for (const expected of route.includes ?? []) {
      check(
        normalized.includes(expected),
        `${route.path}:includes:${expected}`,
        `Expected rendered route ${route.path} to include "${expected}".`
      );
    }
    for (const expected of route.rawIncludes ?? []) {
      check(
        body.includes(expected),
        `${route.path}:raw-includes:${expected}`,
        `Expected raw route ${route.path} to include "${expected}".`
      );
    }
    check(blockedMatches.length === 0, `${route.path}:no_private_patterns`, `Blocked private/source patterns: ${blockedMatches.join(', ') || 'none'}.`);

    checkedRoutes.push({
      path: route.path,
      status: response.status,
      expected_text_count: (route.includes ?? []).length + (route.rawIncludes ?? []).length,
      blocked_pattern_count: blockedMatches.length
    });
  }

  const summary = {
    status: findings.every((finding) => finding.passed) ? 'passed' : 'failed',
    base_url: baseUrl,
    checkedRoutes,
    findings
  };

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== 'passed') process.exit(1);
}

function normalizeHtmlText(value) {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
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
