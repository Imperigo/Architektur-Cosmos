#!/usr/bin/env node

import { publicRouteChecks, publicRoutes } from './public-route-manifest.mjs';

const gateRoutes = publicRoutes;
const smokeRoutes = publicRouteChecks.map((route) => route.path);

const gateSet = new Set(gateRoutes);
const smokeSet = new Set(smokeRoutes);
const failures = [];

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
