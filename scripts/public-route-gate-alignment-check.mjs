#!/usr/bin/env node

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const manifestPath = resolve(root, args.manifest || 'scripts/public-route-manifest.mjs');
const manifest = await import(pathToFileURL(manifestPath).href);
const publicRouteChecks = manifest.publicRouteChecks;
const publicRoutes = manifest.publicRoutes;
const failures = [];

if (!Array.isArray(publicRoutes)) {
  failures.push({ id: 'gate:export:publicRoutes', detail: 'publicRoutes must be exported as an array.' });
}

if (!Array.isArray(publicRouteChecks)) {
  failures.push({ id: 'smoke:export:publicRouteChecks', detail: 'publicRouteChecks must be exported as an array.' });
}

const gateRoutes = Array.isArray(publicRoutes) ? publicRoutes : [];
const smokeRoutes = Array.isArray(publicRouteChecks) ? publicRouteChecks.map((route) => route?.path) : [];
const gateSet = new Set(gateRoutes);
const smokeSet = new Set(smokeRoutes);

for (const duplicate of findDuplicates(gateRoutes)) {
  failures.push({ id: `gate:duplicate:${duplicate}`, detail: `Duplicate public gate route: ${duplicate}` });
}

for (const duplicate of findDuplicates(smokeRoutes)) {
  failures.push({ id: `smoke:duplicate:${duplicate}`, detail: `Duplicate route smoke route: ${duplicate}` });
}

for (const route of gateRoutes) {
  if (!smokeSet.has(route)) {
    failures.push({ id: `missing-smoke:${route}`, detail: `Public gate route is missing from route-content smoke: ${route}` });
  }
}

for (const route of smokeRoutes) {
  if (!gateSet.has(route)) {
    failures.push({ id: `missing-gate:${route}`, detail: `Route-content smoke route is missing from public gate: ${route}` });
  }
}

const summary = {
  status: failures.length === 0 ? 'passed' : 'failed',
  gate_route_count: gateRoutes.length,
  smoke_route_count: smokeRoutes.length,
  aligned_routes: gateRoutes.filter((route) => smokeSet.has(route)),
  failures
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length > 0) process.exit(1);

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
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
