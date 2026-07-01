#!/usr/bin/env node

import { publicLeakMatches } from './public-leak-patterns.mjs';
import { publicRouteChecks } from './public-route-manifest.mjs';

const failures = [];
const warnings = [];
const seen = new Set();
const requiredRoutes = new Set([
  '/',
  '/atlas/',
  '/references/',
  '/assets/',
  '/orbit/',
  '/robots.txt',
  '/sitemap.xml'
]);
const allowedStaticExtensions = new Set(['.svg', '.txt', '.xml']);
const blockedRoutePatterns = [
  /(^|\/)admin(\/|$)/i,
  /(^|\/)private(\/|$)/i,
  /(^|\/)source-root(\/|$)/i,
  /(^|\/)archive-intake(\/|$)/i,
  /(^|\/)_overseer(\/|$)/i,
  /(^|\/)worker[-_]?logs?(\/|$)/i,
  /(^|\/)\.codex(\/|$)/i,
  /(^|\/)\.claude(\/|$)/i
];

for (const route of publicRouteChecks) {
  checkRoute(route);
}

for (const requiredRoute of requiredRoutes) {
  if (!seen.has(requiredRoute)) {
    failures.push({
      id: `required:${requiredRoute}`,
      detail: `Required public route is missing from manifest: ${requiredRoute}`
    });
  }
}

const summary = {
  status: failures.length === 0 ? 'passed' : 'failed',
  checked_route_count: publicRouteChecks.length,
  required_route_count: requiredRoutes.size,
  failures,
  warnings
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length > 0) process.exit(1);

function checkRoute(route) {
  if (!route || typeof route !== 'object') {
    failures.push({ id: 'route:shape', detail: 'Manifest entry must be an object.' });
    return;
  }

  const path = route.path;
  if (typeof path !== 'string' || path.trim().length === 0) {
    failures.push({ id: 'route:path', detail: 'Manifest entry is missing a non-empty string path.' });
    return;
  }

  if (seen.has(path)) {
    failures.push({ id: `route:${path}:duplicate`, detail: `Duplicate public route path: ${path}` });
  }
  seen.add(path);

  if (!path.startsWith('/')) {
    failures.push({ id: `route:${path}:absolute`, detail: `Public route path must start with /: ${path}` });
  }

  if (path.includes('//')) {
    failures.push({ id: `route:${path}:double-slash`, detail: `Public route path must not contain //: ${path}` });
  }

  if (path !== '/' && !hasKnownStaticExtension(path) && !path.endsWith('/')) {
    failures.push({
      id: `route:${path}:trailing-slash`,
      detail: `HTML public route path must use a trailing slash: ${path}`
    });
  }

  const blockedPattern = blockedRoutePatterns.find((pattern) => pattern.test(path));
  if (blockedPattern) {
    failures.push({
      id: `route:${path}:blocked-surface`,
      detail: `Public route manifest must not expose private/admin/source surfaces: ${blockedPattern}`
    });
  }

  const routeLeakMatches = publicLeakMatches(path);
  if (routeLeakMatches.length > 0) {
    failures.push({
      id: `route:${path}:private-pattern`,
      detail: `Public route path matches private/source leak patterns: ${routeLeakMatches.join(', ')}`
    });
  }

  const includes = route.includes ?? [];
  const rawIncludes = route.rawIncludes ?? [];
  if (!Array.isArray(includes) || !Array.isArray(rawIncludes)) {
    failures.push({
      id: `route:${path}:sentinel-array`,
      detail: `Route sentinels must be arrays for ${path}.`
    });
    return;
  }

  if (includes.length + rawIncludes.length === 0) {
    failures.push({
      id: `route:${path}:sentinel-missing`,
      detail: `Route ${path} must declare at least one content sentinel.`
    });
  }

  for (const [kind, values] of [['includes', includes], ['rawIncludes', rawIncludes]]) {
    for (const value of values) {
      checkSentinel(path, kind, value);
    }
  }

  if (route.minBodyLength !== undefined && (!Number.isInteger(route.minBodyLength) || route.minBodyLength < 1)) {
    failures.push({
      id: `route:${path}:min-body-length`,
      detail: `minBodyLength must be a positive integer for ${path}.`
    });
  }
}

function checkSentinel(path, kind, value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    failures.push({
      id: `route:${path}:${kind}:empty`,
      detail: `Route ${path} has an empty ${kind} sentinel.`
    });
    return;
  }

  const leakMatches = publicLeakMatches(value);
  if (leakMatches.length > 0) {
    failures.push({
      id: `route:${path}:${kind}:private-pattern`,
      detail: `Route ${path} sentinel matches private/source leak patterns: ${leakMatches.join(', ')}`
    });
  }
}

function hasKnownStaticExtension(path) {
  const match = path.match(/\.[a-z0-9]+$/i);
  if (!match) return false;
  if (allowedStaticExtensions.has(match[0].toLowerCase())) return true;
  warnings.push({
    id: `route:${path}:static-extension`,
    detail: `Route uses an unrecognized static extension: ${path}`
  });
  return true;
}
