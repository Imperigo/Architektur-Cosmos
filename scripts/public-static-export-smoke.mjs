#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { publicLeakMatches } from './public-leak-patterns.mjs';
import { publicRouteChecks as routes } from './public-route-manifest.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outRoot = resolve(root, args.out || 'out');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-data/review/public-static-export-smoke.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-data/review/public-static-export-smoke.generated.md');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  if (!existsSync(outRoot)) {
    throw new Error(`Static export not found: ${relative(root, outRoot)}. Run npm run build first.`);
  }

  const checkedRoutes = routes.map(checkRoute);
  const failedChecks = checkedRoutes.flatMap((route) => route.checks.filter((check) => !check.passed));
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-static-export-smoke',
    status: failedChecks.length === 0 ? 'public_static_export_smoke_passed' : 'public_static_export_smoke_failed',
    out_dir: relative(root, outRoot),
    summary: {
      route_count: checkedRoutes.length,
      passed_routes: checkedRoutes.filter((route) => route.status === 'passed').length,
      failed_routes: checkedRoutes.filter((route) => route.status !== 'passed').length,
      check_count: checkedRoutes.reduce((sum, route) => sum + route.checks.length, 0),
      failed_checks: failedChecks.length
    },
    routes: checkedRoutes
  };

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('Public static export smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Routes: ${report.summary.passed_routes}/${report.summary.route_count}`);
  console.log(`Checks: ${report.summary.check_count - report.summary.failed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'public_static_export_smoke_passed') process.exit(1);
}

function checkRoute(route) {
  const filePath = routeFilePath(route.path);
  const exists = existsSync(filePath);
  const body = exists ? readFileSync(filePath, 'utf8') : '';
  const normalized = normalizeHtmlText(body);
  const leakMatches = publicLeakMatches(body);
  const referencedStaticAssets = route.path.endsWith('.txt') || route.path.endsWith('.xml') || route.path.endsWith('.svg')
    ? []
    : staticAssetReferences(body);
  const missingStaticAssets = referencedStaticAssets.filter((assetPath) => !existsSync(resolve(outRoot, assetPath)));
  const minBodyLength = route.minBodyLength ?? 500;
  const checks = [
    check(`${route.path}:file_exists`, exists, `Expected exported file ${relative(root, filePath)} to exist.`),
    check(`${route.path}:min_body_length`, body.length >= minBodyLength, `Expected body length >= ${minBodyLength}, got ${body.length}.`),
    check(`${route.path}:no_private_patterns`, leakMatches.length === 0, `Blocked private/source patterns: ${leakMatches.join(', ') || 'none'}.`)
  ];

  for (const expected of route.includes ?? []) {
    checks.push(check(
      `${route.path}:includes:${expected}`,
      normalized.includes(expected),
      `Expected exported route ${route.path} to include "${expected}".`
    ));
  }

  for (const expected of route.rawIncludes ?? []) {
    checks.push(check(
      `${route.path}:raw_includes:${expected}`,
      body.includes(expected),
      `Expected exported route ${route.path} to include raw text "${expected}".`
    ));
  }

  if (referencedStaticAssets.length > 0) {
    checks.push(check(
      `${route.path}:referenced_static_assets_exist`,
      missingStaticAssets.length === 0,
      `Missing _next/static assets: ${missingStaticAssets.join(', ') || 'none'}.`
    ));
  }

  return {
    path: route.path,
    file: relative(root, filePath),
    status: checks.every((item) => item.passed) ? 'passed' : 'failed',
    body_length: body.length,
    referenced_static_asset_count: referencedStaticAssets.length,
    missing_static_assets: missingStaticAssets,
    checks
  };
}

function routeFilePath(path) {
  if (path === '/') return resolve(outRoot, 'index.html');
  const normalized = path.replace(/^\/+/, '');
  if (/\.[a-z0-9]+$/i.test(normalized)) return resolve(outRoot, normalized);
  return resolve(outRoot, normalized, 'index.html');
}

function check(id, passed, message) {
  return { id, passed: Boolean(passed), message };
}

function normalizeHtmlText(value) {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function staticAssetReferences(html) {
  const matches = new Set();
  const patterns = [
    /(?:href|src)="\/?(_next\/static\/[^"]+)"/g,
    /(?:href|src)=\\?"\/?(_next\/static\/[^"\\]+)\\?"/g
  ];
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(html))) {
      matches.add(decodeAssetPath(match[1].replace(/\\+$/g, '')));
    }
  });
  return [...matches].sort();
}

function decodeAssetPath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function renderMarkdown(report) {
  const lines = [
    '# Public Static Export Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Out dir: \`${report.out_dir}\``,
    '',
    'Checks core public routes from the built static export without starting a server, calling networks, reading private source contents or changing public-ready state.',
    '',
    '## Summary',
    '',
    `- routes: ${report.summary.passed_routes}/${report.summary.route_count} passed`,
    `- checks: ${report.summary.check_count - report.summary.failed_checks}/${report.summary.check_count} passed`,
    '',
    '## Routes',
    '',
    '| Route | Status | File | Static assets |',
    '| --- | --- | --- | --- |'
  ];

  report.routes.forEach((route) => {
    lines.push(`| \`${route.path}\` | \`${route.status}\` | \`${route.file}\` | ${route.referenced_static_asset_count} referenced / ${route.missing_static_assets.length} missing |`);
  });

  const failed = report.routes.flatMap((route) => route.checks.filter((item) => !item.passed));
  if (failed.length > 0) {
    lines.push('', '## Failed Checks', '');
    failed.forEach((item) => lines.push(`- \`${item.id}\`: ${item.message}`));
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
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}
