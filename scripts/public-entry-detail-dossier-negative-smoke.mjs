#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const routes = [
  { path: '/atlas/villa-savoye/', slug: 'villa-savoye', title: 'Villa Savoye' },
  { path: '/atlas/alterszentrum-kloster-ingenbohl/', slug: 'alterszentrum-kloster-ingenbohl', title: 'Alterszentrum Kloster Ingenbohl' }
];

const cases = [
  {
    id: 'missing_dossier_link',
    mutate: (html) => html.replace('<a href="#entry-network">Netzwerk</a>', ''),
    expectedFailures: ['/atlas/villa-savoye/:href:#entry-network']
  },
  {
    id: 'private_marker',
    mutate: (html) => html.replace('</main>', '<p>/mnt/private/source-root.pdf</p></main>'),
    expectedFailures: ['/atlas/villa-savoye/:private_pattern']
  },
  {
    id: 'missing_json_ld',
    mutate: (html) => html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, ''),
    expectedFailures: ['/atlas/villa-savoye/:json_ld']
  },
  {
    id: 'wrong_canonical_origin',
    mutate: (html) => html.replace('https://architekturkosmos.ch/atlas/villa-savoye/', 'https://example.invalid/atlas/villa-savoye/'),
    expectedFailures: ['/atlas/villa-savoye/:canonical']
  },
  {
    id: 'missing_active_atlas_nav',
    mutate: (html) => html.replace(' aria-current="page"', ''),
    expectedFailures: ['/atlas/villa-savoye/:active_atlas_nav']
  }
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const workspace = await mkdtemp(join(tmpdir(), 'public-entry-detail-dossier-negative-'));
  try {
    const results = [];
    for (const testCase of cases) {
      results.push(await runCase(workspace, testCase));
    }

    console.log(JSON.stringify({
      status: 'passed',
      synthetic_only: true,
      reads_private_content: false,
      starts_server: false,
      checked_cases: results.length,
      cases: results
    }, null, 2));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function runCase(workspace, testCase) {
  const outRoot = join(workspace, testCase.id, 'out');
  for (const route of routes) {
    const filePath = join(outRoot, route.path.replace(/^\/+/, ''), 'index.html');
    await mkdir(dirname(filePath), { recursive: true });
    const html = route.slug === 'villa-savoye' ? testCase.mutate(pageHtml(route)) : pageHtml(route);
    await writeFile(filePath, html, 'utf8');
  }

  const outputPath = join(workspace, testCase.id, 'report.json');
  const markdownPath = join(workspace, testCase.id, 'report.md');
  const result = spawnSync(process.execPath, [
    'scripts/public-entry-detail-dossier-check.mjs',
    '--out',
    resolve(outRoot),
    '--output',
    resolve(outputPath),
    '--markdown',
    resolve(markdownPath)
  ], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.status === 0) {
    throw new Error(`Expected public-entry-detail-dossier-check to fail for synthetic case ${testCase.id}.`);
  }

  const report = JSON.parse(readFileSync(outputPath, 'utf8'));

  const failedIds = new Set((report.failures || []).map((failure) => failure.id));
  const missed = testCase.expectedFailures.filter((id) => !failedIds.has(id));
  if (missed.length > 0) {
    throw new Error(`Entry detail dossier negative smoke ${testCase.id} missed failures: ${missed.join(', ')}`);
  }

  return {
    id: testCase.id,
    expected_failed_checks: testCase.expectedFailures,
    observed_failed_checks: [...failedIds].sort()
  };
}

function pageHtml(route) {
  const canonical = `https://architekturkosmos.ch${route.path}`;
  return [
    '<!DOCTYPE html><html lang="de"><head>',
    `<title>${route.title} | Architektur Kosmos</title>`,
    `<link rel="canonical" href="${canonical}">`,
    '</head><body>',
    `<main class="ak-site-header entry-dossier-nav entry-archive-status-panel">`,
    `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Place","name":"${route.title}"}</script>`,
    `<nav aria-label="${route.title} Dossiernavigation">`,
    '<a aria-current="page" href="/atlas/">Atlas</a>',
    '<a href="#model-analysis">3D / Layer</a>',
    '<a href="#media-gallery">Medien</a>',
    '<a href="#analysis-layers">Analyse</a>',
    '<a href="#entry-network">Netzwerk</a>',
    '<a href="/references/">Referenzen</a>',
    '<a href="/assets/">Assets</a>',
    '</nav>',
    '</main></body></html>'
  ].join('');
}
