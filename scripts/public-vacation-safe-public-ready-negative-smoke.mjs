#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tempRoot = resolve(root, args['tmp-dir'] || '.tmp/public-vacation-safe-public-ready-negative-smoke');
const reportRoot = resolve(tempRoot, 'reports');
const keepTemp = Boolean(args['keep-temp']);
const syntheticReportPath = resolve(reportRoot, 'synthetic-public-ready.generated.json');

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
  mkdirSync(reportRoot, { recursive: true });
  writeFileSync(syntheticReportPath, `${JSON.stringify(renderUnsafeReport(), null, 2)}\n`, 'utf8');

  const result = spawnSync(
    process.execPath,
    [
      'scripts/public-vacation-safe-check.mjs',
      '--keep-reports',
      '--report-dir',
      reportRoot,
      '--skip-public-ready-negative-smoke'
    ],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 30 * 1024 * 1024
    }
  );

  if (result.status === 0) {
    throw new Error('Expected public-vacation-safe-check to fail for a synthetic public-ready promotion report.');
  }

  let summary;
  try {
    summary = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Expected JSON output from public-vacation-safe-check. stderr: ${result.stderr || error.message}`);
  }

  const invariant = summary.checks?.find((check) => check.id === 'public_ready_invariant');
  if (!invariant) {
    throw new Error('Expected public_ready_invariant check in public-vacation-safe-check summary.');
  }
  if (invariant.status !== 'failed') {
    throw new Error(`Expected public_ready_invariant to fail, got ${invariant.status}.`);
  }

  const invariantExcerpt = parseJsonExcerpt(invariant.output_excerpt);
  const syntheticSource = relative(root, syntheticReportPath);
  const unsafeSignals = invariantExcerpt?.unsafe_signals || [];
  const observedSyntheticSignal = unsafeSignals.some((signal) => signal.source === syntheticSource);
  if (!observedSyntheticSignal) {
    throw new Error(`Expected invariant failure to include ${syntheticSource}.`);
  }

  const summaryReport = {
    status: 'passed',
    synthetic_only: true,
    reads_private_content: false,
    starts_server: false,
    expected_failed_check: 'public_ready_invariant',
    synthetic_report_path: keepTemp ? syntheticSource : null,
    observed_unsafe_signal_count: invariantExcerpt?.unsafe_signal_count ?? unsafeSignals.length,
    aggregate_status: summary.status
  };

  console.log(JSON.stringify(summaryReport, null, 2));
}

function renderUnsafeReport() {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-vacation-safe-public-ready-negative-smoke',
    status: 'synthetic_unsafe_report',
    public_display_allowed: false,
    public_ready: true,
    summary: {
      public_ready_after_check: 1
    }
  };
}

function parseJsonExcerpt(value) {
  try {
    return JSON.parse(String(value || '{}'));
  } catch {
    return null;
  }
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
