#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-demo-gate-require-static-export-negative-smoke');
const keepTemp = Boolean(args['keep-temp']);

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
  mkdirSync(tempRoot, { recursive: true });
  const missingOut = resolve(tempRoot, 'missing-out');

  const result = spawnSync(
    process.execPath,
    [
      'scripts/public-demo-gate-check.mjs',
      '--static-out',
      missingOut,
      '--require-static-export'
    ],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (result.status === 0) {
    throw new Error('Expected public-demo-gate-check to fail when --require-static-export points at a missing out directory.');
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Expected JSON output from public-demo-gate-check. stderr: ${result.stderr || error.message}`);
  }

  const failureIds = new Set((report.failures || []).map((failure) => failure.id));
  if (!failureIds.has('static-export:out:missing')) {
    throw new Error('Negative public demo gate smoke missed static-export:out:missing.');
  }

  if (existsSync(missingOut)) {
    throw new Error(`Synthetic missing out directory should not be created: ${relative(root, missingOut)}`);
  }

  const summary = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    expected_failed_check: 'static-export:out:missing',
    static_export_status: report.static_export?.status ?? null,
    missing_out: keepTemp ? relative(root, missingOut) : null,
    observed_failure_count: report.failures?.length ?? 0
  };

  console.log(JSON.stringify(summary, null, 2));
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
