#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { publicLeakMatches } from './public-leak-patterns.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outRoot = resolve(root, args.out || 'out');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-data/review/public-static-route-inventory.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-data/review/public-static-route-inventory.generated.md');
const entriesPath = resolve(root, 'data/mock-entries.json');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const entries = JSON.parse(readFileSync(entriesPath, 'utf8'));
  const entrySlugs = entries.map((entry) => entry.slug).sort();
  const duplicateSlugs = findDuplicates(entrySlugs);
  const expectedSlugSet = new Set(entrySlugs);
  const atlasSlugs = await exportedAtlasSlugs();
  const exportedSlugSet = new Set(atlasSlugs);
  const routeFiles = routeFilesForInventory(atlasSlugs);
  const routeFileChecks = routeFiles.map(checkRouteFile);

  const failures = [
    ...duplicateSlugs.map((slug) => ({
      id: `data:${slug}:duplicate-slug`,
      detail: `Duplicate data/mock-entries.json slug: ${slug}`
    })),
    ...entrySlugs
      .filter((slug) => !exportedSlugSet.has(slug))
      .map((slug) => ({
        id: `atlas:${slug}:missing-export`,
        detail: `Expected static export route /atlas/${slug}/ with index.html and index.txt.`
      })),
    ...atlasSlugs
      .filter((slug) => !expectedSlugSet.has(slug))
      .map((slug) => ({
        id: `atlas:${slug}:stale-export`,
        detail: `Exported /atlas/${slug}/ is not present in data/mock-entries.json.`
      })),
    ...routeFileChecks.flatMap((file) => file.failures)
  ];

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-static-route-inventory-check',
    status: failures.length === 0 ? 'public_static_route_inventory_passed' : 'public_static_route_inventory_failed',
    policy: {
      source_free: true,
      reads_private_content: false,
      writes_public_ready: false,
      starts_server: false,
      scans_static_export_only: true
    },
    inputs: {
      out_dir: relative(root, outRoot),
      entries: relative(root, entriesPath)
    },
    summary: {
      data_entry_count: entrySlugs.length,
      exported_atlas_entry_count: atlasSlugs.length,
      scanned_route_file_count: routeFileChecks.length,
      missing_atlas_routes: entrySlugs.filter((slug) => !exportedSlugSet.has(slug)).length,
      stale_atlas_routes: atlasSlugs.filter((slug) => !expectedSlugSet.has(slug)).length,
      duplicate_data_slugs: duplicateSlugs.length,
      failed_route_file_checks: routeFileChecks.filter((file) => file.status !== 'passed').length,
      failure_count: failures.length
    },
    atlas_routes: atlasSlugs.map((slug) => `/atlas/${slug}/`),
    route_files: routeFileChecks,
    failures
  };

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('Public static route inventory check');
  console.log(`Status: ${report.status}`);
  console.log(`Atlas entries: ${report.summary.exported_atlas_entry_count}/${report.summary.data_entry_count}`);
  console.log(`Route files: ${routeFileChecks.filter((file) => file.status === 'passed').length}/${routeFileChecks.length}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (failures.length > 0) process.exit(1);
}

async function exportedAtlasSlugs() {
  const atlasRoot = resolve(outRoot, 'atlas');
  if (!existsSync(outRoot)) {
    throw new Error(`Static export not found: ${relative(root, outRoot)}. Run npm run build first.`);
  }
  if (!existsSync(atlasRoot)) {
    return [];
  }

  const items = await readdir(atlasRoot, { withFileTypes: true });
  return items
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .filter((slug) => {
      return existsSync(resolve(atlasRoot, slug, 'index.html')) && existsSync(resolve(atlasRoot, slug, 'index.txt'));
    })
    .sort();
}

function routeFilesForInventory(atlasSlugs) {
  const topLevelRoutes = [
    'index.html',
    'index.txt',
    'archive/index.html',
    'archive/index.txt',
    'assets/index.html',
    'assets/index.txt',
    'atlas/index.html',
    'atlas/index.txt',
    'orbit/index.html',
    'orbit/index.txt',
    'references/index.html',
    'references/index.txt',
    'robots.txt',
    'sitemap.xml',
    'icon.svg',
    '.well-known/security.txt'
  ];
  const atlasRoutes = atlasSlugs.flatMap((slug) => [
    `atlas/${slug}/index.html`,
    `atlas/${slug}/index.txt`
  ]);
  return [...topLevelRoutes, ...atlasRoutes].sort();
}

function checkRouteFile(relativeFilePath) {
  const absolutePath = resolve(outRoot, relativeFilePath);
  const failures = [];
  const pathLeakMatches = publicLeakMatches(relativeFilePath);

  if (!existsSync(absolutePath)) {
    failures.push({
      id: `route-file:${relativeFilePath}:missing`,
      detail: `Expected static export route file to exist: ${relativeFilePath}`
    });
    return {
      file: relative(root, absolutePath),
      status: 'failed',
      bytes: 0,
      leak_matches: [],
      failures
    };
  }

  const body = readFileSync(absolutePath, 'utf8');
  const bodyLeakMatches = publicLeakMatches(body);
  if (pathLeakMatches.length > 0) {
    failures.push({
      id: `route-file:${relativeFilePath}:path-leak`,
      detail: `Route file path has blocked private/source marker(s): ${pathLeakMatches.join(', ')}`
    });
  }
  if (bodyLeakMatches.length > 0) {
    failures.push({
      id: `route-file:${relativeFilePath}:content-leak`,
      detail: `Route file content has blocked private/source marker(s): ${bodyLeakMatches.join(', ')}`
    });
  }

  return {
    file: relative(root, absolutePath),
    status: failures.length === 0 ? 'passed' : 'failed',
    bytes: body.length,
    leak_matches: [...new Set([...pathLeakMatches, ...bodyLeakMatches])],
    failures
  };
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function renderMarkdown(report) {
  const lines = [
    '# Public Static Route Inventory Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Checks the built static export against public mock-entry slugs. This catches missing Atlas detail pages, stale exported Atlas routes and private/source markers in route files without starting a server or promoting public-ready state.',
    '',
    '## Summary',
    '',
    `- data entries: ${report.summary.data_entry_count}`,
    `- exported Atlas entry routes: ${report.summary.exported_atlas_entry_count}`,
    `- scanned route files: ${report.summary.scanned_route_file_count}`,
    `- missing Atlas routes: ${report.summary.missing_atlas_routes}`,
    `- stale Atlas routes: ${report.summary.stale_atlas_routes}`,
    `- duplicate data slugs: ${report.summary.duplicate_data_slugs}`,
    `- route file failures: ${report.summary.failed_route_file_checks}`,
    '',
    '## Policy',
    '',
    `- source_free: ${report.policy.source_free}`,
    `- reads_private_content: ${report.policy.reads_private_content}`,
    `- writes_public_ready: ${report.policy.writes_public_ready}`,
    `- starts_server: ${report.policy.starts_server}`,
    '',
    '## Route Files',
    '',
    '| File | Status | Bytes |',
    '| --- | --- | --- |'
  ];

  report.route_files.forEach((file) => {
    lines.push(`| \`${file.file}\` | \`${file.status}\` | ${file.bytes} |`);
  });

  if (report.failures.length > 0) {
    lines.push('', '## Failures', '');
    report.failures.forEach((failure) => lines.push(`- \`${failure.id}\`: ${failure.detail}`));
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
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
