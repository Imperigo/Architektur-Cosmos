#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { publicLeakMatches } from './public-leak-patterns.mjs';
import { publicRouteChecks } from './public-route-manifest.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outRoot = resolve(root, args.out || 'out');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-data/review/public-entry-detail-dossier-check.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-data/review/public-entry-detail-dossier-check.generated.md');
const allowMissingOut = Boolean(args['allow-missing-out']);
const entries = JSON.parse(readFileSync(resolve(root, 'data/mock-entries.json'), 'utf8'));
const entriesBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
const requiredDossierHrefs = ['#model-analysis', '#media-gallery', '#analysis-layers', '#entry-network', '/references/', '/assets/'];
const requiredDossierClasses = ['ak-site-header', 'entry-dossier-nav', 'entry-archive-status-panel'];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  if (!existsSync(outRoot)) {
    if (!allowMissingOut) {
      throw new Error(`Static export not found: ${relative(root, outRoot)}. Run npm run build first or pass --allow-missing-out.`);
    }

    const skipped = skippedReport();
    await writeReport(skipped);
    printReport(skipped);
    return;
  }

  const routes = publicRouteChecks.filter((route) => /^\/atlas\/[^/]+\/$/.test(route.path));
  const pages = routes.map(checkPage);
  const failures = pages.flatMap((page) => page.failures);
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-entry-detail-dossier-check',
    status: failures.length === 0 ? 'public_entry_detail_dossier_check_passed' : 'public_entry_detail_dossier_check_failed',
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
    required_dossier_hrefs: requiredDossierHrefs,
    required_dossier_classes: requiredDossierClasses,
    pages,
    failures
  };

  await writeReport(report);
  printReport(report);
  if (failures.length > 0) process.exit(1);
}

function checkPage(route) {
  const filePath = routeFilePath(route.path);
  const failures = [];
  const slug = route.path.match(/^\/atlas\/([^/]+)\/$/)?.[1] ?? '';
  const entry = entriesBySlug.get(slug);

  if (!entry) {
    failures.push({
      id: `${route.path}:entry_missing`,
      detail: `Atlas detail route has no matching data/mock-entries.json entry: ${slug}`
    });
    return pageResult(route.path, filePath, slug, null, '', [], failures);
  }

  if (!existsSync(filePath)) {
    failures.push({
      id: `${route.path}:file_missing`,
      detail: `Expected static detail page to exist: ${relative(root, filePath)}`
    });
    return pageResult(route.path, filePath, slug, entry.title, '', [], failures);
  }

  const body = readFileSync(filePath, 'utf8');
  const hrefs = extractAnchorHrefs(body).map(normalizeHref).filter(Boolean);
  const hrefSet = new Set(hrefs);
  const bodyLeakMatches = publicLeakMatches(body);
  const canonical = `https://architekturkosmos.ch${route.path}`;
  const checks = [
    {
      id: 'title',
      passed: body.includes(`<title>${escapeRegExpLiteral(entry.title)} | Architektur Kosmos</title>`) || body.includes(`"${entry.title} | Architektur Kosmos"`),
      detail: `Expected detail page title for ${entry.title}.`
    },
    {
      id: 'canonical',
      passed: body.includes(`href="${canonical}"`),
      detail: `Expected canonical URL ${canonical}.`
    },
    {
      id: 'json_ld',
      passed: body.includes('type="application/ld+json"') && body.includes(`"name":"${jsonEscaped(entry.title)}"`),
      detail: `Expected JSON-LD Place payload for ${entry.title}.`
    },
    {
      id: 'dossier_aria_label',
      passed: body.includes(`aria-label="${entry.title} Dossiernavigation"`),
      detail: `Expected entry-specific dossier navigation aria-label for ${entry.title}.`
    },
    {
      id: 'active_atlas_nav',
      passed: body.includes('aria-current="page"') && body.includes('href="/atlas/"'),
      detail: 'Expected Atlas to remain the active public navigation item.'
    }
  ];

  for (const className of requiredDossierClasses) {
    checks.push({
      id: `class:${className}`,
      passed: body.includes(className),
      detail: `Expected exported detail page to include ${className}.`
    });
  }

  for (const href of requiredDossierHrefs) {
    checks.push({
      id: `href:${href}`,
      passed: hrefSet.has(href),
      detail: `Expected dossier navigation href ${href}.`
    });
  }

  for (const check of checks) {
    if (!check.passed) {
      failures.push({
        id: `${route.path}:${check.id}`,
        detail: check.detail
      });
    }
  }

  if (bodyLeakMatches.length > 0) {
    failures.push({
      id: `${route.path}:private_pattern`,
      detail: `Blocked private/source patterns in exported detail page: ${bodyLeakMatches.join(', ')}`
    });
  }

  return pageResult(route.path, filePath, slug, entry.title, body, hrefs, failures);
}

function pageResult(path, filePath, slug, title, body, hrefs, failures) {
  return {
    path,
    slug,
    title,
    file: relative(root, filePath),
    status: failures.length === 0 ? 'passed' : 'failed',
    body_length: body.length,
    href_count: hrefs.length,
    dossier_href_count: requiredDossierHrefs.filter((href) => hrefs.includes(href)).length,
    failures
  };
}

function skippedReport() {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-entry-detail-dossier-check',
    status: 'public_entry_detail_dossier_check_skipped_missing_out',
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
      checked_pages: 0,
      failed_pages: 0,
      failure_count: 0,
      public_ready_after_check: 0
    },
    required_dossier_hrefs: requiredDossierHrefs,
    required_dossier_classes: requiredDossierClasses,
    pages: [],
    failures: []
  };
}

async function writeReport(report) {
  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await Promise.all([
    writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
    writeFile(outputMdPath, renderMarkdown(report), 'utf8')
  ]);
}

function printReport(report) {
  console.log('Public entry detail dossier check');
  console.log(`Status: ${report.status}`);
  console.log(`Pages: ${report.summary.checked_pages - report.summary.failed_pages}/${report.summary.checked_pages}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function extractAnchorHrefs(html) {
  const hrefs = [];
  const anchorPattern = /<a\b[^>]*\bhref=(["'])(.*?)\1/gi;
  let match;
  while ((match = anchorPattern.exec(String(html))) !== null) {
    hrefs.push(decodeHtmlAttribute(match[2]));
  }
  return hrefs;
}

function normalizeHref(value) {
  const href = String(value || '').trim();
  if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
  if (href.startsWith('#')) return href;
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

function routeFilePath(path) {
  const normalized = String(path || '/').split('?')[0].split('#')[0];
  if (normalized === '/') return resolve(outRoot, 'index.html');
  const relativePath = normalized.replace(/^\/+/, '');
  if (extname(relativePath)) return resolve(outRoot, relativePath);
  return resolve(outRoot, relativePath, 'index.html');
}

function decodeHtmlAttribute(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function jsonEscaped(value) {
  return JSON.stringify(String(value)).slice(1, -1);
}

function escapeRegExpLiteral(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(report) {
  const lines = [
    '# Public Entry Detail Dossier Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Checks exported public atlas detail pages for dossier navigation, public cross-links, canonical metadata, JSON-LD and private/source markers.',
    '',
    '## Summary',
    '',
    `- pages: ${report.summary.checked_pages - report.summary.failed_pages}/${report.summary.checked_pages} passed`,
    `- failures: ${report.summary.failure_count}`,
    `- public-ready after check: ${report.summary.public_ready_after_check}`,
    '',
    '## Pages',
    '',
    '| Route | Status | Dossier hrefs | Body bytes |',
    '| --- | --- | --- | --- |'
  ];

  report.pages.forEach((page) => {
    lines.push(`| \`${page.path}\` | \`${page.status}\` | ${page.dossier_href_count}/${requiredDossierHrefs.length} | ${page.body_length} |`);
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
