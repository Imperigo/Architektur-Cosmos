#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const requiredTopLevelRouteFiles = [
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const workspace = await mkdtemp(join(tmpdir(), 'public-static-route-inventory-negative-'));
  try {
    const outDir = join(workspace, 'out');
    const entriesPath = join(workspace, 'entries.json');
    await writeFile(entriesPath, '[]\n', 'utf8');
    await writeCleanRouteFiles(outDir);

    const clean = runInventory(workspace, outDir, entriesPath, 'clean');
    if (clean.status !== 0) {
      throw new Error(`Expected clean synthetic export to pass, got ${clean.status}.\n${clean.output}`);
    }

    const blockedArtifactCases = [
      {
        label: 'provenance-generated',
        relativePath: 'kosmo-reference-provenance/provenance-check.generated.json',
        body: JSON.stringify({ status: 'review_only', public_ready: false }, null, 2)
      },
      {
        label: 'admin-html',
        relativePath: 'admin/index.html',
        body: '<!doctype html><html><body>Internal operator panel</body></html>'
      },
      {
        label: 'api-json',
        relativePath: 'api/private-inventory.json',
        body: JSON.stringify({ status: 'blocked_until_owner_unlock' }, null, 2)
      },
      {
        label: 'worker-logs',
        relativePath: 'worker-logs/run.txt',
        body: 'redacted worker log placeholder'
      }
    ];

    for (const testCase of blockedArtifactCases) {
      await writeCleanRouteFiles(outDir);
      await writeFixtureFile(join(outDir, testCase.relativePath), testCase.body);

      const poisoned = runInventory(workspace, outDir, entriesPath, `poisoned-${testCase.label}`);
      if (poisoned.status === 0) {
        throw new Error(`Expected synthetic stray ${testCase.label} artifact to fail the static route inventory check.`);
      }
      const expectedFailureId = `stray-export:${testCase.relativePath}:blocked-artifact`;
      const failureIds = (poisoned.report?.failures ?? []).map((failure) => failure.id);
      if (!failureIds.includes(expectedFailureId)) {
        throw new Error(`Inventory failure did not include the expected stray artifact id ${expectedFailureId}.\n${poisoned.output}\n${JSON.stringify(poisoned.report, null, 2)}`);
      }
      await rm(join(outDir, testCase.relativePath), { force: true });
    }

    console.log(JSON.stringify({
      status: 'passed',
      checked_cases: 1 + blockedArtifactCases.length,
      clean_export_exit: clean.status,
      blocked_artifact_cases: blockedArtifactCases.map((testCase) => testCase.relativePath)
    }, null, 2));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function writeCleanRouteFiles(outDir) {
  for (const relativePath of requiredTopLevelRouteFiles) {
    await writeFixtureFile(join(outDir, relativePath), fixtureBody(relativePath));
  }
}

async function writeFixtureFile(filePath, body) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${body}\n`, 'utf8');
}

function fixtureBody(relativePath) {
  if (relativePath.endsWith('.xml')) return '<urlset><url><loc>https://architekturkosmos.ch/</loc></url></urlset>';
  if (relativePath.endsWith('.svg')) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>';
  if (relativePath.endsWith('.txt')) return 'Architecture Cosmos public route fixture.';
  return '<!doctype html><html><body>Architecture Cosmos public route fixture.</body></html>';
}

function runInventory(workspace, outDir, entriesPath, label) {
  const outputPath = join(workspace, `${label}.json`);
  const markdownPath = join(workspace, `${label}.md`);
  const result = spawnSync('node', [
    'scripts/public-static-route-inventory-check.mjs',
    '--out',
    resolve(outDir),
    '--entries',
    resolve(entriesPath),
    '--output',
    resolve(outputPath),
    '--markdown',
    resolve(markdownPath)
  ], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 5 * 1024 * 1024
  });

  return {
    status: result.status,
    output: `${result.stdout || ''}${result.stderr || ''}`,
    report: readJsonIfExists(outputPath)
  };
}

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf8'));
}
