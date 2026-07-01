#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { publicLeakMatches } from './public-leak-patterns.mjs';
import { publicRouteChecks } from './public-route-manifest.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outRoot = resolve(root, args.out || 'out');
const siteUrl = String(args['site-url'] || 'https://architekturkosmos.ch').replace(/\/$/, '');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-data/review/public-static-metadata-check.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-data/review/public-static-metadata-check.generated.md');

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
    generator: 'public-static-metadata-check',
    status: failures.length === 0 ? 'public_static_metadata_check_passed' : 'public_static_metadata_check_failed',
    policy: {
      source_free: true,
      reads_private_content: false,
      writes_public_ready: false,
      starts_server: false,
      scans_static_export_only: true
    },
    inputs: {
      out_dir: relative(root, outRoot),
      site_url: siteUrl
    },
    summary: {
      checked_pages: pages.length,
      failed_pages: pages.filter((page) => page.status !== 'passed').length,
      failure_count: failures.length,
      public_ready_after_check: 0
    },
    pages,
    failures
  };

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('Public static metadata check');
  console.log(`Status: ${report.status}`);
  console.log(`Pages: ${pages.length - report.summary.failed_pages}/${pages.length}`);
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
    return pageResult(route.path, filePath, null, failures);
  }

  const body = readFileSync(filePath, 'utf8');
  const title = extractTitle(body);
  const description = extractMetaContent(body, 'name', 'description');
  const canonical = extractLinkHref(body, 'canonical');
  const openGraphTitle = extractMetaContent(body, 'property', 'og:title');
  const openGraphDescription = extractMetaContent(body, 'property', 'og:description');

  requireText(`${route.path}:title`, title, 8, 120, failures);
  requireText(`${route.path}:description`, description, 40, 220, failures);

  if (canonical) {
    checkCanonical(route.path, canonical, failures);
  }

  [
    ['title', title],
    ['description', description],
    ['canonical', canonical],
    ['og:title', openGraphTitle],
    ['og:description', openGraphDescription]
  ].forEach(([field, value]) => {
    const matches = publicLeakMatches(value || '');
    if (matches.length > 0) {
      failures.push({
        id: `${route.path}:${field}:private_pattern`,
        detail: `Blocked private/source patterns in ${field}: ${matches.join(', ')}`
      });
    }
  });

  return pageResult(route.path, filePath, {
    title,
    description,
    canonical,
    open_graph_title: openGraphTitle,
    open_graph_description: openGraphDescription
  }, failures);
}

function pageResult(path, filePath, metadata, failures) {
  return {
    path,
    file: relative(root, filePath),
    status: failures.length === 0 ? 'passed' : 'failed',
    metadata,
    failures
  };
}

function requireText(id, value, minLength, maxLength, failures) {
  const text = String(value || '').trim();
  if (!text) {
    failures.push({ id: `${id}:missing`, detail: `Expected ${id} to be present.` });
    return;
  }
  if (text.length < minLength) {
    failures.push({ id: `${id}:too_short`, detail: `Expected ${id} to be at least ${minLength} characters.` });
  }
  if (text.length > maxLength) {
    failures.push({ id: `${id}:too_long`, detail: `Expected ${id} to be at most ${maxLength} characters.` });
  }
}

function checkCanonical(path, canonical, failures) {
  let parsed;
  try {
    parsed = new URL(canonical);
  } catch {
    failures.push({
      id: `${path}:canonical:invalid_url`,
      detail: `Canonical URL is invalid: ${canonical}`
    });
    return;
  }

  const expectedUrl = `${siteUrl}${path}`;
  if (parsed.href !== expectedUrl) {
    failures.push({
      id: `${path}:canonical:mismatch`,
      detail: `Expected canonical ${expectedUrl}, found ${parsed.href}.`
    });
  }
}

function extractTitle(html) {
  const match = String(html).match(/<title>(.*?)<\/title>/is);
  return match ? decodeHtmlAttribute(match[1]).trim() : null;
}

function extractMetaContent(html, key, value) {
  const tags = [...String(html).matchAll(/<meta\b[^>]*>/gis)].map((match) => parseAttributes(match[0]));
  const tag = tags.find((attributes) => attributes[key] === value);
  return tag?.content ? decodeHtmlAttribute(tag.content).trim() : null;
}

function extractLinkHref(html, rel) {
  const tags = [...String(html).matchAll(/<link\b[^>]*>/gis)].map((match) => parseAttributes(match[0]));
  const tag = tags.find((attributes) => attributes.rel === rel);
  return tag?.href ? decodeHtmlAttribute(tag.href).trim() : null;
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

function parseAttributes(tag) {
  const attributes = {};
  const pattern = /\s([a-zA-Z:-]+)=(["'])(.*?)\2/g;
  let match;
  while ((match = pattern.exec(String(tag))) !== null) {
    attributes[match[1]] = decodeHtmlAttribute(match[3]).trim();
  }
  return attributes;
}

function decodeHtmlAttribute(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function renderMarkdown(report) {
  const lines = [
    '# Public Static Metadata Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Checks exported public HTML pages for basic SEO metadata and private/source markers without starting a server, reading private source contents or changing public-ready state.',
    '',
    '## Summary',
    '',
    `- pages: ${report.summary.checked_pages - report.summary.failed_pages}/${report.summary.checked_pages} passed`,
    `- failures: ${report.summary.failure_count}`,
    `- public-ready after check: ${report.summary.public_ready_after_check}`,
    '',
    '## Pages',
    '',
    '| Route | Status | Title | Description | Canonical |',
    '| --- | --- | --- | --- | --- |'
  ];

  report.pages.forEach((page) => {
    lines.push(`| \`${page.path}\` | \`${page.status}\` | ${page.metadata?.title ? 'yes' : 'no'} | ${page.metadata?.description ? 'yes' : 'no'} | ${page.metadata?.canonical ? 'yes' : 'no'} |`);
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
