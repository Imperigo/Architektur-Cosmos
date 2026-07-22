#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { publicLeakMatches } from './public-leak-patterns.mjs';
import { publicRouteChecks } from './public-route-manifest.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outRoot = resolve(root, args.out || 'out');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-data/review/public-static-header-check.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-data/review/public-static-header-check.generated.md');

const requiredNav = [
  { href: '/', label: 'Start' },
  { href: '/references/', label: 'Referenzen' },
  { href: '/assets/', label: 'Assets' },
  { href: '/atlas/', label: 'Atlas' },
  { href: '/orbit/', label: 'Status' }
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  if (!existsSync(outRoot)) {
    throw new Error(`Static export not found: ${relative(root, outRoot)}. Run npm run build first.`);
  }

  const pages = publicRouteChecks.filter((route) => isHtmlRoute(route.path)).map(checkPage);
  const failures = pages.flatMap((page) => page.failures);
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-static-header-check',
    status: failures.length === 0 ? 'public_static_header_check_passed' : 'public_static_header_check_failed',
    policy: {
      source_free: true,
      reads_private_content: false,
      writes_public_ready: false,
      starts_server: false,
      scans_static_export_only: true
    },
    inputs: {
      out_dir: relative(root, outRoot)
    },
    summary: {
      checked_pages: pages.length,
      failed_pages: pages.filter((page) => page.status !== 'passed').length,
      failure_count: failures.length,
      public_ready_after_check: 0
    },
    required_navigation: requiredNav,
    pages,
    failures
  };

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('Public static header check');
  console.log(`Status: ${report.status}`);
  console.log(`Pages: ${pages.filter((page) => page.status === 'passed').length}/${pages.length}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (failures.length > 0) process.exit(1);
}

function checkPage(route) {
  const filePath = routeFilePath(route.path);
  const failures = [];

  if (!existsSync(filePath)) {
    failures.push({
      id: `${route.path}:file_missing`,
      detail: `Expected static route file to exist: ${relative(root, filePath)}`
    });
    return pageResult(route.path, filePath, [], [], failures);
  }

  const body = readFileSync(filePath, 'utf8');
  const anchors = extractAnchors(body);
  const hrefs = new Set(anchors.map((anchor) => normalizeHref(anchor.href)).filter(Boolean));
  const labels = new Set(anchors.map((anchor) => normalizeText(anchor.text)).filter(Boolean));
  const activeHrefs = anchors
    .filter((anchor) => anchor.attributes['aria-current'] === 'page')
    .map((anchor) => normalizeHref(anchor.href))
    .filter(Boolean);
  const expectedActiveHref = expectedActiveNavHref(route.path);
  const leakMatches = publicLeakMatches(body);

  if (!body.includes('ak-site-header')) {
    failures.push({
      id: `${route.path}:header_class_missing`,
      detail: `Expected exported page ${route.path} to include the shared public header class.`
    });
  }

  if (!body.includes('Architekturkosmos')) {
    failures.push({
      id: `${route.path}:wordmark_missing`,
      detail: `Expected exported page ${route.path} to include the Architekturkosmos wordmark.`
    });
  }

  if (!body.includes('aria-label="Hauptnavigation"')) {
    failures.push({
      id: `${route.path}:desktop_nav_label_missing`,
      detail: `Expected exported page ${route.path} to include the desktop main navigation label.`
    });
  }

  if (!body.includes('aria-label="Mobile Hauptnavigation"')) {
    failures.push({
      id: `${route.path}:mobile_nav_label_missing`,
      detail: `Expected exported page ${route.path} to include the mobile main navigation label.`
    });
  }

  for (const item of requiredNav) {
    if (!hrefs.has(item.href)) {
      failures.push({
        id: `${route.path}:core_href_missing:${item.href}`,
        detail: `Expected exported page ${route.path} to include core navigation href ${item.href}.`
      });
    }

    if (!labels.has(item.label)) {
      failures.push({
        id: `${route.path}:nav_label_missing:${item.label}`,
        detail: `Expected exported page ${route.path} to include navigation label ${item.label}.`
      });
    }
  }

  if (!activeHrefs.includes(expectedActiveHref)) {
    failures.push({
      id: `${route.path}:active_href_mismatch`,
      detail: `Expected aria-current page link ${expectedActiveHref}, found ${activeHrefs.join(', ') || 'none'}.`
    });
  }

  if (leakMatches.length > 0) {
    failures.push({
      id: `${route.path}:private_pattern`,
      detail: `Blocked private/source patterns in exported header page surface: ${leakMatches.join(', ')}`
    });
  }

  return pageResult(route.path, filePath, anchors, activeHrefs, failures);
}

function pageResult(path, filePath, anchors, activeHrefs, failures) {
  return {
    path,
    file: relative(root, filePath),
    status: failures.length === 0 ? 'passed' : 'failed',
    anchor_count: anchors.length,
    active_hrefs: activeHrefs,
    failures
  };
}

function expectedActiveNavHref(path) {
  if (path === '/') return '/';
  if (path.startsWith('/assets/')) return '/assets/';
  if (path.startsWith('/atlas/')) return '/atlas/';
  if (path.startsWith('/orbit/')) return '/orbit/';
  return '/references/';
}

function extractAnchors(html) {
  const anchors = [];
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(String(html))) !== null) {
    const attributes = parseAttributes(match[1]);
    anchors.push({
      href: attributes.href || '',
      attributes,
      text: stripTags(match[2])
    });
  }
  return anchors;
}

function parseAttributes(source) {
  const attributes = {};
  const pattern = /\s*([a-zA-Z:-]+)=(["'])(.*?)\2/g;
  let match;
  while ((match = pattern.exec(String(source))) !== null) {
    attributes[match[1]] = decodeHtmlAttribute(match[3]).trim();
  }
  return attributes;
}

function normalizeHref(value) {
  const href = decodeHtmlAttribute(value || '').trim();
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
  try {
    const parsed = new URL(href);
    if (!['https://architekturkosmos.ch', 'https://www.architekturkosmos.ch'].includes(parsed.origin)) return null;
    return normalizePath(`${parsed.pathname}${parsed.search}${parsed.hash}`);
  } catch {
    return normalizePath(href);
  }
}

function normalizePath(value) {
  const path = String(value || '').split('?')[0].split('#')[0] || '/';
  if (!path.startsWith('/')) return null;
  if (path === '/') return '/';
  if (extname(path)) return path;
  return path.endsWith('/') ? path : `${path}/`;
}

function normalizeText(value) {
  return decodeHtmlAttribute(value || '').replace(/\s+/g, ' ').trim();
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ');
}

function decodeHtmlAttribute(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function routeFilePath(path) {
  const normalized = String(path || '/').split('?')[0].split('#')[0];
  if (normalized === '/') return resolve(outRoot, 'index.html');
  const relativePath = normalized.replace(/^\/+/, '');
  if (extname(relativePath)) return resolve(outRoot, relativePath);
  return resolve(outRoot, relativePath, 'index.html');
}

function isHtmlRoute(path) {
  return !/\.(svg|txt|xml)$/i.test(path);
}

function renderMarkdown(report) {
  const lines = [
    '# Public Static Header Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Checks exported public HTML pages for the shared public header, core navigation links, active route state and private/source markers.',
    '',
    '## Summary',
    '',
    `- pages: ${report.summary.checked_pages - report.summary.failed_pages}/${report.summary.checked_pages} passed`,
    `- failures: ${report.summary.failure_count}`,
    `- public-ready after check: ${report.summary.public_ready_after_check}`,
    '',
    '## Pages',
    '',
    '| Route | Status | Active hrefs | Anchors |',
    '| --- | --- | --- | --- |'
  ];

  report.pages.forEach((page) => {
    lines.push(`| \`${page.path}\` | \`${page.status}\` | ${page.active_hrefs.map((href) => `\`${href}\``).join(', ') || '-'} | ${page.anchor_count} |`);
  });

  if (report.failures.length > 0) {
    lines.push('', '## Failures', '');
    report.failures.forEach((failure) => {
      lines.push(`- \`${failure.id}\`: ${failure.detail}`);
    });
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
