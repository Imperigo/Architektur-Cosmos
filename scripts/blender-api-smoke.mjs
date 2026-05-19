#!/usr/bin/env node

import { lookup } from 'node:dns/promises';

const apiBase = stripTrailingSlash(process.env.COSMOS_API_BASE ?? readArg('--api-base') ?? 'https://architekturkosmos.ch');
const assetBase = stripTrailingSlash(process.env.COSMOS_ASSET_BASE ?? readArg('--asset-base') ?? 'https://assets.architekturkosmos.ch');
const strictAssets = hasFlag('--strict-assets');

const failures = [];
const warnings = [];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  console.log('Architecture Cosmos Blender API smoke test');
  console.log(`API base: ${apiBase}`);
  console.log(`Asset base: ${assetBase}`);

  const entries = await fetchJson('/api/entries.json');
  if (!Array.isArray(entries)) {
    failures.push('/api/entries.json did not return an array');
  } else {
    console.log(`Entries: ${entries.length}`);
    if (entries.length < 1) failures.push('/api/entries.json returned no entries');
  }

  const chSearch = await fetchJson('/api/search?country=CH&limit=3');
  checkSearchResponse('/api/search?country=CH&limit=3', chSearch);
  if (chSearch?.results?.length) {
    console.log(`CH sample: ${chSearch.results.map((entry) => entry.id).join(', ')}`);
  }

  const modelSearch = await fetchJson('/api/search?has_3d_model=true&limit=5');
  checkSearchResponse('/api/search?has_3d_model=true&limit=5', modelSearch);
  if (modelSearch?.results?.length) {
    console.log(`3D sample: ${modelSearch.results.map((entry) => entry.id).join(', ')}`);
  }

  const taxonomies = await fetchJson('/api/taxonomies.json');
  if (!taxonomies || !Array.isArray(taxonomies.materials) || !Array.isArray(taxonomies.programs)) {
    failures.push('/api/taxonomies.json is missing materials/programs arrays');
  } else {
    console.log(`Taxonomies: ${Object.keys(taxonomies).length} groups`);
  }

  await checkCors('/api/search?country=CH&limit=1');
  await checkAssetDomain();

  if (warnings.length) {
    console.log('\nWarnings:');
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (failures.length) {
    console.error('\nSmoke test failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log('\nSmoke test passed.');
}

async function fetchJson(pathname) {
  const response = await fetch(`${apiBase}${pathname}`, {
    headers: { Origin: 'http://localhost:3000' }
  });

  if (!response.ok) {
    failures.push(`${pathname} returned ${response.status}`);
    return null;
  }

  const cors = response.headers.get('access-control-allow-origin');
  if (cors !== '*') {
    failures.push(`${pathname} missing CORS wildcard header`);
  }

  return response.json();
}

function checkSearchResponse(label, body) {
  if (!body || typeof body.count !== 'number' || !Array.isArray(body.results)) {
    failures.push(`${label} did not return { count, results }`);
  }
}

async function checkCors(pathname) {
  const response = await fetch(`${apiBase}${pathname}`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET'
    }
  });

  if (response.status !== 204) {
    failures.push(`OPTIONS ${pathname} returned ${response.status}`);
  }
  if (response.headers.get('access-control-allow-origin') !== '*') {
    failures.push(`OPTIONS ${pathname} missing CORS wildcard header`);
  }
}

async function checkAssetDomain() {
  const hostname = new URL(assetBase).hostname;

  try {
    const result = await lookup(hostname);
    console.log(`Asset DNS: ${hostname} -> ${result.address}`);
  } catch {
    const message = `Asset domain is not resolving yet: ${hostname}`;
    if (strictAssets) failures.push(message);
    else warnings.push(message);
    return;
  }

  try {
    const response = await fetch(assetBase, { method: 'HEAD' });
    console.log(`Asset HEAD status: ${response.status}`);
  } catch {
    warnings.push(`Asset domain resolves, but HEAD check failed: ${assetBase}`);
  }
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
