#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { publicRouteChecks } from './public-route-manifest.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-static-header-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);

const cases = [
  {
    id: 'missing_header',
    routePath: '/',
    mutate: (html) => html.replace('ak-site-header', 'synthetic-missing-header'),
    expectedFailures: ['/:header_class_missing']
  },
  {
    id: 'wrong_active_href',
    routePath: '/references/',
    mutate: (html) => html
      .replaceAll('href="/references/" aria-current="page"', 'href="/references/"')
      .replaceAll('href="/assets/"', 'href="/assets/" aria-current="page"'),
    expectedFailures: ['/references/:active_href_mismatch']
  },
  {
    id: 'missing_core_link',
    routePath: '/assets/',
    mutate: (html) => html.replace(/<a href="\/orbit\/">Status<\/a>\n/g, ''),
    expectedFailures: ['/assets/:core_href_missing:/orbit/', '/assets/:nav_label_missing:Status']
  },
  {
    id: 'private_pattern',
    routePath: '/atlas/',
    mutate: (html) => html.replace('</nav>', '<a href="/_overseer/private-source.pdf">Private source</a></nav>'),
    expectedFailures: ['/atlas/:private_pattern']
  }
];

try {
  runSmoke();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  if (!keepTemp) rmSync(tempRoot, { recursive: true, force: true });
}

function runSmoke() {
  rmSync(tempRoot, { recursive: true, force: true });
  const results = cases.map(runCase);
  const summary = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    checked_cases: results.length,
    cases: results
  };

  console.log(JSON.stringify(summary, null, 2));
}

function runCase(testCase) {
  const outRoot = resolve(tempRoot, testCase.id, 'out');
  const htmlRoutes = publicRouteChecks.filter((route) => isHtmlRoute(route.path));
  htmlRoutes.forEach((route) => {
    const base = renderRouteHtml(route.path);
    writeRoute(outRoot, route.path, route.path === testCase.routePath ? testCase.mutate(base) : base);
  });

  const outputPath = resolve(tempRoot, testCase.id, 'report.json');
  const markdownPath = resolve(tempRoot, testCase.id, 'report.md');
  const result = spawnSync(
    process.execPath,
    [
      'scripts/public-static-header-check.mjs',
      '--out',
      outRoot,
      '--output',
      outputPath,
      '--markdown',
      markdownPath
    ],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (result.status === 0) {
    throw new Error(`Expected public-static-header-check to fail for synthetic case ${testCase.id}.`);
  }

  if (!existsSync(outputPath)) {
    throw new Error(`Expected JSON report for ${testCase.id} at ${relative(root, outputPath)}.`);
  }

  const report = JSON.parse(readFileSync(outputPath, 'utf8'));
  const failedIds = new Set((report.failures || []).map((failure) => failure.id));
  const missingFailures = testCase.expectedFailures.filter((id) => !failedIds.has(id));
  if (missingFailures.length > 0) {
    throw new Error(`Static header negative smoke ${testCase.id} missed failures: ${missingFailures.join(', ')}`);
  }

  return {
    id: testCase.id,
    synthetic_out_dir: keepTemp ? relative(root, outRoot) : null,
    expected_failed_checks: testCase.expectedFailures,
    observed_failed_checks: [...failedIds].sort()
  };
}

function renderRouteHtml(routePath) {
  const activeHref = expectedActiveNavHref(routePath);
  const navLinks = [
    ['/', 'Start'],
    ['/references/', 'Referenzen'],
    ['/assets/', 'Assets'],
    ['/atlas/', 'Atlas'],
    ['/orbit/', 'Status']
  ].map(([href, label]) => {
    const active = href === activeHref ? ' aria-current="page"' : '';
    return `<a href="${href}"${active}>${label}</a>`;
  });

  return [
    '<!doctype html>',
    '<html lang="de">',
    '<head>',
    '  <meta charset="utf-8">',
    `  <title>Architecture Cosmos synthetic route ${routePath}</title>`,
    '</head>',
    '<body>',
    '  <header class="ak-site-header">',
    '    <a href="/" aria-label="Architekturkosmos Startseite"><span>Architekturkosmos</span></a>',
    '    <nav aria-label="Hauptnavigation">',
    ...navLinks.map((link) => `      ${link}`),
    '    </nav>',
    '    <nav aria-label="Mobile Hauptnavigation">',
    ...navLinks.map((link) => `      ${link}`),
    '    </nav>',
    '  </header>',
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

function expectedActiveNavHref(path) {
  if (path === '/') return '/';
  if (path.startsWith('/assets/')) return '/assets/';
  if (path.startsWith('/atlas/')) return '/atlas/';
  if (path.startsWith('/orbit/')) return '/orbit/';
  return '/references/';
}

function writeRoute(outRoot, routePath, body) {
  const filePath = routeFilePath(outRoot, routePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, body, 'utf8');
}

function routeFilePath(outRoot, routePath) {
  const normalized = String(routePath || '/').replace(/^\/+/, '');
  if (!normalized) return resolve(outRoot, 'index.html');
  if (/\.[a-z0-9]+$/i.test(normalized)) return resolve(outRoot, normalized);
  return resolve(outRoot, normalized, 'index.html');
}

function isHtmlRoute(routePath) {
  return !/\.(svg|txt|xml)$/i.test(routePath);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (index + 1 < argv.length && next && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
