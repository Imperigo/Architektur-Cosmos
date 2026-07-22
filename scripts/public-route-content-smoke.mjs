#!/usr/bin/env node

import { publicLeakMatches } from './public-leak-patterns.mjs';
import { publicRouteChecks as routes } from './public-route-manifest.mjs';

const args = parseArgs(process.argv.slice(2));
const baseUrl = String(args['base-url'] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const timeoutMs = Number(args['timeout-ms'] || 5000);

const findings = [];

main().catch((error) => {
  console.log(JSON.stringify({
    status: 'failed',
    base_url: baseUrl,
    checkedRoutes: [],
    failed_findings: [
      {
        id: 'runtime:unexpected_error',
        passed: false,
        message: error instanceof Error ? error.message : String(error)
      }
    ],
    error: serializeError(error)
  }, null, 2));
  process.exit(1);
});

async function main() {
  const checkedRoutes = [];

  for (const route of routes) {
    const url = `${baseUrl}${route.path}`;
    let response;
    try {
      response = await fetchWithTimeout(url);
    } catch (error) {
      const detail = serializeError(error);
      check(false, `${route.path}:fetch`, detail.message);
      checkedRoutes.push({
        path: route.path,
        status: null,
        body_length: 0,
        min_body_length: route.minBodyLength ?? ((route.rawIncludes ?? []).length > 0 ? 20 : 500),
        expected_text_count: (route.includes ?? []).length + (route.rawIncludes ?? []).length,
        blocked_pattern_count: 0,
        fetch_error: detail
      });
      continue;
    }
    const body = await response.text();
    const normalized = normalizeHtmlText(body);
    const blockedMatches = publicLeakMatches(body);
    const minBodyLength = route.minBodyLength ?? ((route.rawIncludes ?? []).length > 0 ? 20 : 500);

    check(response.ok, `${route.path}:status`, `Expected HTTP 2xx for ${route.path}, got ${response.status}.`);
    check(
      body.length >= minBodyLength,
      `${route.path}:min_body_length`,
      `Expected ${route.path} body length >= ${minBodyLength}, got ${body.length}.`
    );
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
      body_length: body.length,
      min_body_length: minBodyLength,
      expected_text_count: (route.includes ?? []).length + (route.rawIncludes ?? []).length,
      blocked_pattern_count: blockedMatches.length
    });
  }

  const summary = {
    status: findings.every((finding) => finding.passed) ? 'passed' : 'failed',
    base_url: baseUrl,
    timeout_ms: timeoutMs,
    checkedRoutes,
    failed_findings: findings.filter((finding) => !finding.passed)
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
