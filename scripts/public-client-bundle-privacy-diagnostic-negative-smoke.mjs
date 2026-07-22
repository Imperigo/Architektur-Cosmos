#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-client-bundle-privacy-diagnostic-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);
const bundlePath = '/_next/static/chunks/public-client-bundle-privacy-diagnostic-negative-smoke.js';

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
  const outRoot = resolve(tempRoot, 'out');
  writeFile(outRoot, bundlePath, [
    'self.__next_f = self.__next_f || [];',
    'self.__next_f.push(["synthetic source-root marker"]);',
    'self.__next_f.push(["synthetic /home/kosmo-user/.codex/state.json marker"]);',
    ''
  ].join('\n'));

  const outputPath = resolve(tempRoot, 'report.json');
  const markdownPath = resolve(tempRoot, 'report.md');
  const result = spawnSync(
    process.execPath,
    [
      'scripts/public-client-bundle-privacy-diagnostic.mjs',
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

  if (result.status !== 0) {
    throw new Error(`Expected diagnostic to stay report-only and exit 0. stderr: ${result.stderr}`);
  }
  if (!existsSync(outputPath)) {
    throw new Error(`Expected JSON report to be written at ${relative(root, outputPath)}.`);
  }

  const report = JSON.parse(readFileSync(outputPath, 'utf8'));
  const requiredPatterns = new Set(['/source[-_\\s]?root/i', '/\\/home\\//i']);
  const findings = report.findings || [];
  const matchedRequiredPatterns = findings.filter((finding) => {
    return finding.path === bundlePath
      && finding.kind === 'content_pattern'
      && requiredPatterns.has(finding.pattern)
      && finding.public_display_allowed === false;
  }).map((finding) => finding.pattern);

  if (report.status !== 'public_client_bundle_privacy_diagnostic_needs_review') {
    throw new Error(`Expected needs_review status, got ${report.status}.`);
  }
  const missingPatterns = [...requiredPatterns].filter((pattern) => !matchedRequiredPatterns.includes(pattern));
  if (missingPatterns.length > 0) {
    throw new Error(`Expected diagnostic findings for ${missingPatterns.join(', ')} in ${bundlePath}.`);
  }
  if (report.summary?.public_ready_after_check !== 0) {
    throw new Error('Expected public_ready_after_check to stay 0.');
  }

  console.log(JSON.stringify({
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    expected_bundle_path: bundlePath,
    expected_patterns: [...requiredPatterns].sort(),
    observed_findings: findings.length,
    report_path: keepTemp ? relative(root, outputPath) : null
  }, null, 2));
}

function writeFile(outRoot, routePath, body) {
  const filePath = resolve(outRoot, routePath.replace(/^\/+/, ''));
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, body, 'utf8');
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
