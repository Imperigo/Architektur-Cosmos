#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const reportRoot = resolve(root, args['report-dir'] || '.tmp/public-vacation-safe-check');
const keepReports = Boolean(args['keep-reports']);

const checks = [
  {
    id: 'public_demo_gate',
    command: ['node', 'scripts/public-demo-gate-check.mjs'],
    purpose: 'Checks public data surfaces, pilot media/model rights gates and optional route leak scanning.'
  },
  {
    id: 'public_route_gate_alignment',
    command: ['node', 'scripts/public-route-gate-alignment-check.mjs'],
    purpose: 'Keeps public gate routes aligned with route-content smoke coverage.'
  },
  {
    id: 'public_runtime_boundary',
    command: [
      'node',
      'scripts/public-runtime-boundary-check.mjs',
      '--output',
      resolve(reportRoot, 'public-runtime-boundary-check.generated.json'),
      '--markdown',
      resolve(reportRoot, 'public-runtime-boundary-check.generated.md')
    ],
    purpose: 'Rejects Next runtime features that would break the static export contract.'
  },
  {
    id: 'public_leak_pattern_negative_smoke',
    command: ['node', 'scripts/public-leak-pattern-negative-smoke.mjs'],
    purpose: 'Verifies public leak detector catches private path/source marker examples.'
  }
];

main();

function main() {
  if (!keepReports) rmSync(reportRoot, { recursive: true, force: true });
  mkdirSync(reportRoot, { recursive: true });

  const startedAt = new Date().toISOString();
  const results = checks.map(runCheck);
  const failed = results.filter((result) => result.status !== 'passed');
  const summary = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-vacation-safe-check',
    status: failed.length === 0 ? 'public_vacation_safe_check_passed' : 'public_vacation_safe_check_failed',
    policy: {
      source_free: true,
      reads_private_content: false,
      writes_public_ready: false,
      starts_server: false,
      report_dir: relative(root, reportRoot)
    },
    started_at: startedAt,
    summary: {
      check_count: checks.length,
      passed_checks: results.length - failed.length,
      failed_checks: failed.length
    },
    checks: results
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failed.length > 0) process.exit(1);
}

function runCheck(check) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(check.command[0], check.command.slice(1), {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
  const endedAt = new Date().toISOString();
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();

  return {
    id: check.id,
    purpose: check.purpose,
    command: check.command.map(String),
    status: result.status === 0 ? 'passed' : 'failed',
    exit_code: result.status,
    signal: result.signal || null,
    started_at: startedAt,
    ended_at: endedAt,
    output_excerpt: tail(output, 4000)
  };
}

function tail(value, maxLength) {
  const text = String(value || '');
  if (text.length <= maxLength) return text;
  return text.slice(text.length - maxLength);
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
