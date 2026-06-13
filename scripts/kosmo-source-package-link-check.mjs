#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultPackage = 'examples/kosmo-references/source-packages/kapelle-sogn-benedetg-public-source-candidate-2026-06-13/source-package.json';

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const packagePath = resolve(rootDir, readArg('--package') ?? defaultPackage);
  const outputDir = resolve(rootDir, readArg('--out') ?? join(dirname(relative(rootDir, packagePath)), 'review'));
  const strict = hasFlag('--strict');
  const manifest = JSON.parse(await readFile(packagePath, 'utf8'));
  const report = await checkLinks(manifest, packagePath);

  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'source-package-link-check.generated.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(join(outputDir, 'source-package-link-check.generated.md'), renderMarkdown(report));

  console.log('KosmoReferences source package link check');
  console.log(`Package: ${relative(rootDir, packagePath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Links: ${report.summary.links}`);
  console.log(`Reachable: ${report.summary.reachable}`);
  console.log(`Warnings: ${report.warnings.length}`);
  console.log(`Wrote: ${relative(rootDir, join(outputDir, 'source-package-link-check.generated.md'))}`);

  if (strict && report.warnings.length > 0) process.exitCode = 1;
}

async function checkLinks(manifest, packagePath) {
  const links = (manifest.sources ?? []).filter((source) => source.file_type === 'web_link' || /^https?:\/\//i.test(source.path ?? ''));
  const checks = [];
  const warnings = [];

  for (const source of links) {
    const check = await probeLink(source);
    checks.push(check);
    if (check.status !== 'reachable') {
      warnings.push(`source ${source.id} returned ${check.status}${check.http_status ? ` (${check.http_status})` : ''}: ${source.path}`);
    }
  }

  return {
    checked_at: new Date().toISOString(),
    package_path: relative(rootDir, packagePath),
    package_id: manifest.package_id ?? null,
    title: manifest.title ?? null,
    status: warnings.length > 0 ? 'passed_with_warnings' : 'passed',
    policy: {
      copied_content: false,
      request_mode: 'HEAD first; fallback to GET with Range bytes=0-0 when HEAD is rejected',
      note: 'This checker records availability metadata only. It does not store page bodies, screenshots, images, plans or PDF text.'
    },
    summary: {
      links: checks.length,
      reachable: checks.filter((check) => check.status === 'reachable').length,
      warnings: warnings.length
    },
    checks,
    warnings
  };
}

async function probeLink(source) {
  const base = {
    id: source.id ?? null,
    title: source.title ?? null,
    url: source.path ?? null,
    source_role: source.source_role ?? null,
    rights_status: source.rights_status ?? null
  };

  if (!source.path || !/^https?:\/\//i.test(source.path)) {
    return { ...base, status: 'not_a_web_link' };
  }

  const head = await request(source.path, 'HEAD');
  if (head.status === 'reachable' || !['http_warning', 'request_failed'].includes(head.status)) {
    return { ...base, ...head, method: 'HEAD' };
  }

  if (head.http_status && ![403, 405, 406, 429, 500, 501, 502, 503].includes(head.http_status)) {
    return { ...base, ...head, method: 'HEAD' };
  }

  const rangedGet = await request(source.path, 'GET', { Range: 'bytes=0-0' });
  return {
    ...base,
    ...rangedGet,
    method: 'GET_RANGE',
    head_status: head.http_status ?? null,
    head_error: head.error ?? null
  };
}

async function request(url, method, headers = {}) {
  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      headers: {
        'User-Agent': 'ArchitectureCosmosSourceLinkCheck/0.1 (metadata-only; no content reuse)',
        ...headers
      },
      signal: AbortSignal.timeout(15000)
    });
    return {
      status: response.ok ? 'reachable' : 'http_warning',
      http_status: response.status,
      final_url: response.url,
      content_type: response.headers.get('content-type'),
      content_length: response.headers.get('content-length')
    };
  } catch (error) {
    return {
      status: 'request_failed',
      error: error?.message ?? String(error)
    };
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoReferences Source Package Link Check');
  lines.push('');
  lines.push(`Generated: ${report.checked_at}`);
  lines.push(`Package: \`${report.package_path}\``);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  lines.push(`- Copied content: ${report.policy.copied_content ? 'yes' : 'no'}`);
  lines.push(`- Request mode: ${report.policy.request_mode}`);
  lines.push(`- Note: ${report.policy.note}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Links: ${report.summary.links}`);
  lines.push(`- Reachable: ${report.summary.reachable}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push('');
  lines.push('## Links');
  lines.push('');
  lines.push('| Source | HTTP | Status | Final URL |');
  lines.push('| --- | ---: | --- | --- |');
  for (const check of report.checks) {
    lines.push(`| ${check.id ?? '-'} | ${check.http_status ?? '-'} | ${check.status} | ${check.final_url ?? check.url ?? '-'} |`);
  }
  lines.push('');
  lines.push('## Warnings');
  lines.push('');
  if (report.warnings.length > 0) report.warnings.forEach((warning) => lines.push(`- ${warning}`));
  else lines.push('- None.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}
