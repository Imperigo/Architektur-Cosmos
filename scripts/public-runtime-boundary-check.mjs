#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const scanRoot = resolve(root, args['scan-root'] || '.');
const outputJson = resolve(root, args.output || 'examples/kosmo-data/review/public-runtime-boundary-check.generated.json');
const outputMd = resolve(root, args.markdown || 'examples/kosmo-data/review/public-runtime-boundary-check.generated.md');

const publicSourceRootNames = ['app', 'components', 'lib'];
const sourceRoots = publicSourceRootNames.map((sourceRoot) => resolve(scanRoot, sourceRoot));
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'out']);

const bannedSourcePatterns = [
  {
    id: 'server_action_directive',
    pattern: /^\s*['"]use server['"];?/m,
    reason: 'Server Actions require a request runtime and break the static export contract.'
  },
  {
    id: 'next_server_import',
    pattern: /\bfrom\s+['"]next\/server['"]|\bimport\s*\(\s*['"]next\/server['"]\s*\)/,
    reason: 'next/server belongs to runtime route handling, not the static frontend.'
  },
  {
    id: 'server_redirect',
    pattern: /\b(?:redirect|permanentRedirect)\s*\(/,
    reason: 'Server redirects are not safe in static-exported page modules.'
  },
  {
    id: 'request_context_api',
    pattern: /\b(?:cookies|headers|draftMode)\s*\(/,
    reason: 'Request-context APIs require a live Next server runtime.'
  },
  {
    id: 'runtime_revalidation',
    pattern: /\b(?:revalidatePath|revalidateTag|unstable_noStore)\s*\(/,
    reason: 'Runtime cache mutation is outside the static export boundary.'
  },
  {
    id: 'no_store_fetch',
    pattern: /\bcache\s*:\s*['"]no-store['"]/,
    reason: 'no-store fetches imply request-time data fetching.'
  },
  {
    id: 'next_revalidate_export',
    pattern: /\bexport\s+const\s+revalidate\s*=/,
    reason: 'ISR revalidation has no useful effect in a pure static export.'
  },
  {
    id: 'dynamic_runtime_export',
    pattern: /\bexport\s+const\s+dynamic\s*=\s*['"`](?!force-static\b)[^'"`]+['"`]/,
    reason: 'Only force-static is allowed for public pages in this export mode.'
  },
  {
    id: 'explicit_next_runtime',
    pattern: /\bexport\s+const\s+runtime\s*=\s*['"`](?:edge|nodejs)['"`]/,
    reason: 'Public route modules should not request an edge or Node runtime.'
  }
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const files = sourceRoots.flatMap((sourceRoot) => listFiles(resolve(root, sourceRoot)));
  const sourceFiles = files.filter((file) => sourceExtensions.has(extname(file)));
  const findings = [
    ...checkForbiddenRouteFiles(files),
    ...sourceFiles.flatMap(checkSourceFile),
    ...checkNextConfig()
  ];

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-runtime-boundary-check',
    status: findings.length === 0
      ? 'public_runtime_boundary_check_passed'
      : 'public_runtime_boundary_check_failed',
    policy: {
      static_export_only: true,
      reads_private_content: false,
      writes_public_ready: false,
      starts_server: false
    },
    summary: {
      scanned_files: sourceFiles.length,
      checked_roots: sourceRoots.map((sourceRoot) => displayScanPath(sourceRoot)),
      failed_findings: findings.length,
      public_ready_after_check: 0
    },
    findings
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMd, renderMarkdown(report), 'utf8');

  console.log('Public runtime boundary check');
  console.log(`Status: ${report.status}`);
  console.log(`Scanned files: ${report.summary.scanned_files}`);
  console.log(`Findings: ${report.summary.failed_findings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (findings.length > 0) process.exitCode = 1;
}

function listFiles(path) {
  if (!existsSync(path)) return [];
  const stats = statSync(path);
  if (stats.isFile()) return [path];
  if (!stats.isDirectory()) return [];

  const name = path.split('/').at(-1);
  if (ignoredDirectories.has(name)) return [];

  return readdirSync(path)
    .sort()
    .flatMap((child) => listFiles(join(path, child)));
}

function checkForbiddenRouteFiles(files) {
  const scannedFiles = [
    ...files.map(displayScanPath),
    ...['middleware.js', 'middleware.jsx', 'middleware.mjs', 'middleware.ts', 'middleware.tsx']
      .filter((file) => existsSync(resolve(scanRoot, file)))
  ];

  return scannedFiles
    .filter((file) => {
      const normalized = file.replace(/\\/g, '/');
      return /^app\/api\//.test(normalized)
        || /^app\/.*\/route\.(?:js|jsx|mjs|ts|tsx)$/.test(normalized)
        || /^middleware\.(?:js|jsx|mjs|ts|tsx)$/.test(normalized);
    })
    .map((file) => ({
      id: 'forbidden_route_runtime_file',
      file,
      line: 1,
      reason: 'Next route handlers, app/api and middleware need a runtime that is outside the static frontend boundary.'
    }));
}

function checkSourceFile(file) {
  const source = readFileSync(file, 'utf8');
  const relativeFile = displayScanPath(file);
  return bannedSourcePatterns.flatMap((banned) => {
    const match = banned.pattern.exec(source);
    if (!match) return [];
    return [{
      id: banned.id,
      file: relativeFile,
      line: lineNumberAt(source, match.index),
      reason: banned.reason,
      evidence: match[0]
    }];
  });
}

function checkNextConfig() {
  const configPath = resolve(scanRoot, 'next.config.js');
  if (!existsSync(configPath)) {
    return [{
      id: 'next_config_missing',
      file: 'next.config.js',
      line: 1,
      reason: 'Static export depends on next.config.js being present.'
    }];
  }

  const source = readFileSync(configPath, 'utf8');
  const checks = [
    {
      id: 'next_output_export',
      passed: /\boutput\s*:\s*['"]export['"]/.test(source),
      reason: "next.config.js must keep output: 'export'."
    },
    {
      id: 'next_images_unoptimized',
      passed: /\bimages\s*:\s*\{[\s\S]*?\bunoptimized\s*:\s*true[\s\S]*?\}/.test(source),
      reason: 'Next image optimization is unavailable in the static export.'
    },
    {
      id: 'next_trailing_slash',
      passed: /\btrailingSlash\s*:\s*true/.test(source),
      reason: 'Trailing slashes keep exported route paths aligned with Cloudflare static assets.'
    }
  ];

  return checks
    .filter((check) => !check.passed)
    .map((check) => ({
      id: check.id,
      file: 'next.config.js',
      line: 1,
      reason: check.reason
    }));
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

function displayScanPath(file) {
  return relative(scanRoot, file).replace(/\\/g, '/');
}

function renderMarkdown(report) {
  const lines = [
    '# Public Runtime Boundary Check',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Checks the public source boundary for static-export breakers without starting a server, reading private source contents, or changing public-ready state.',
    '',
    '## Summary',
    '',
    `- scanned files: ${report.summary.scanned_files}`,
    `- findings: ${report.summary.failed_findings}`,
    `- public-ready after check: ${report.summary.public_ready_after_check}`,
    '',
    '## Findings',
    ''
  ];

  if (report.findings.length === 0) {
    lines.push('- none');
  } else {
    report.findings.forEach((finding) => {
      lines.push(`- ${finding.file}:${finding.line} \`${finding.id}\` - ${finding.reason}`);
    });
  }

  lines.push('');
  return lines.join('\n');
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
