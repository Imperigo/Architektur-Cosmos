#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const reportRoot = resolve(root, args['report-dir'] || '.tmp/public-vacation-safe-check');
const keepReports = Boolean(args['keep-reports']);
const requireStaticExport = Boolean(args['require-static-export']);
const publicStaticExportSmokeJson = resolve(reportRoot, 'public-static-export-smoke.generated.json');
const publicStaticExportSmokeMarkdown = resolve(reportRoot, 'public-static-export-smoke.generated.md');

const checks = [
  {
    id: 'public_demo_gate',
    command: [
      'node',
      'scripts/public-demo-gate-check.mjs',
      ...(requireStaticExport ? ['--require-static-export'] : [])
    ],
    purpose: 'Checks public data surfaces, pilot media/model rights gates and optional route leak scanning.'
  },
  {
    id: 'public_demo_gate_require_static_export_negative_smoke',
    command: ['node', 'scripts/public-demo-gate-require-static-export-negative-smoke.mjs'],
    purpose: 'Verifies the public demo gate rejects a missing static export when --require-static-export is passed.'
  },
  {
    id: 'public_route_gate_alignment',
    command: ['node', 'scripts/public-route-gate-alignment-check.mjs'],
    purpose: 'Keeps public gate routes aligned with route-content smoke coverage.'
  },
  {
    id: 'public_route_manifest',
    command: ['node', 'scripts/public-route-manifest-check.mjs'],
    purpose: 'Rejects private/admin/source-style public route manifest entries and verifies each route has a matching app/public source before live or static route checks run.'
  },
  {
    id: 'public_route_manifest_negative_smoke',
    command: ['node', 'scripts/public-route-manifest-negative-smoke.mjs'],
    purpose: 'Verifies the public route manifest guard rejects synthetic duplicate, private/source, missing-source and malformed route entries.'
  },
  {
    id: 'public_static_export_smoke',
    command: [
      'node',
      'scripts/public-static-export-smoke.mjs',
      '--output',
      publicStaticExportSmokeJson,
      '--markdown',
      publicStaticExportSmokeMarkdown
    ],
    requiresOut: true,
    purpose: 'Checks existing exported public routes for content sentinels, private/source markers and missing _next/static assets.'
  },
  {
    id: 'public_static_sitemap_check',
    command: [
      'node',
      'scripts/public-static-sitemap-check.mjs',
      '--output',
      resolve(reportRoot, 'public-static-sitemap-check.generated.json'),
      '--markdown',
      resolve(reportRoot, 'public-static-sitemap-check.generated.md')
    ],
    requiresOut: true,
    purpose: 'Checks exported robots.txt and sitemap.xml against the public route allowlist and Atlas entry slugs.'
  },
  {
    id: 'public_static_sitemap_negative_smoke',
    command: ['node', 'scripts/public-static-sitemap-negative-smoke.mjs'],
    purpose: 'Verifies the static sitemap guard rejects synthetic private/source paths and robots leaks.'
  },
  {
    id: 'public_copy_canon',
    command: ['node', 'scripts/public-copy-canon-check.mjs'],
    purpose: 'Rejects public UI copy that exposes internal workflow or implementation language.'
  },
  {
    id: 'public_navigation_canon',
    command: ['node', 'scripts/public-navigation-canon-check.mjs'],
    purpose: 'Keeps the shared public header navigation aligned with the route manifest and private/source leak rules.'
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
    id: 'public_worker_boundary',
    command: [
      'node',
      'scripts/public-worker-boundary-check.mjs',
      '--output',
      resolve(reportRoot, 'public-worker-boundary-check.generated.json'),
      '--markdown',
      resolve(reportRoot, 'public-worker-boundary-check.generated.md')
    ],
    purpose: 'Keeps the Cloudflare Worker in Static Assets mode with read-only public API routes and no live D1/R2/upload bindings.'
  },
  {
    id: 'public_static_route_inventory',
    command: [
      'node',
      'scripts/public-static-route-inventory-check.mjs',
      '--output',
      resolve(reportRoot, 'public-static-route-inventory.generated.json'),
      '--markdown',
      resolve(reportRoot, 'public-static-route-inventory.generated.md')
    ],
    requiresOut: true,
    purpose: 'Checks an existing static export for missing or stale Atlas detail routes and private/source markers.'
  },
  {
    id: 'public_static_route_inventory_negative_smoke',
    command: ['node', 'scripts/public-static-route-inventory-negative-smoke.mjs'],
    purpose: 'Verifies the static route inventory guard rejects synthetic stray generated review/provenance artifacts outside the public route allowlist.'
  },
  {
    id: 'public_static_link_check',
    command: [
      'node',
      'scripts/public-static-link-check.mjs',
      '--output',
      resolve(reportRoot, 'public-static-link-check.generated.json'),
      '--markdown',
      resolve(reportRoot, 'public-static-link-check.generated.md')
    ],
    requiresOut: true,
    purpose: 'Checks exported public HTML pages for core navigation links, missing internal targets and missing referenced static assets without starting a server.'
  },
  {
    id: 'public_static_link_negative_smoke',
    command: ['node', 'scripts/public-static-link-negative-smoke.mjs'],
    purpose: 'Verifies the static link guard rejects synthetic private/source hrefs and missing internal route targets.'
  },
  {
    id: 'public_static_metadata_check',
    command: [
      'node',
      'scripts/public-static-metadata-check.mjs',
      '--output',
      resolve(reportRoot, 'public-static-metadata-check.generated.json'),
      '--markdown',
      resolve(reportRoot, 'public-static-metadata-check.generated.md')
    ],
    requiresOut: true,
    purpose: 'Checks exported public HTML pages for title, description, canonical metadata and private/source markers.'
  },
  {
    id: 'review_only_publication_fence',
    command: [
      'node',
      'scripts/kosmo-review-only-publication-fence.mjs',
      '--out',
      resolve(reportRoot, 'kosmo-review-only-publication-fence.generated.json'),
      '--markdown',
      resolve(reportRoot, 'kosmo-review-only-publication-fence.generated.md'),
      '--publicStaticSmoke',
      publicStaticExportSmokeJson
    ],
    requiresOut: true,
    purpose: 'Verifies owner-pending and review-only reports cannot promote public-ready state.'
  },
  {
    id: 'public_leak_pattern_negative_smoke',
    command: ['node', 'scripts/public-leak-pattern-negative-smoke.mjs'],
    purpose: 'Verifies public leak detector catches private path/source marker examples.'
  },
  {
    id: 'public_ready_invariant_negative_smoke',
    command: ['node', 'scripts/public-vacation-safe-public-ready-negative-smoke.mjs'],
    purpose: 'Verifies the vacation-safe aggregate rejects synthetic generated reports that promote public-ready state.'
  }
].filter((check) => !(args['skip-public-ready-negative-smoke'] && check.id === 'public_ready_invariant_negative_smoke'));

main();

function main() {
  if (!keepReports) rmSync(reportRoot, { recursive: true, force: true });
  mkdirSync(reportRoot, { recursive: true });

  const startedAt = new Date().toISOString();
  const executedResults = checks.map(runCheck);
  const publicReadyInvariant = runPublicReadyInvariantCheck(reportRoot);
  const results = [...executedResults, publicReadyInvariant];
  const passed = results.filter((result) => result.status === 'passed');
  const failed = results.filter((result) => result.status === 'failed');
  const skipped = results.filter((result) => result.status === 'skipped');
  const summary = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-vacation-safe-check',
    status: failed.length === 0 ? 'public_vacation_safe_check_passed' : 'public_vacation_safe_check_failed',
    policy: {
      source_free: true,
      reads_private_content: false,
      writes_public_ready: false,
      public_ready_invariant_enforced: true,
      starts_server: false,
      require_static_export: requireStaticExport,
      report_dir: relative(root, reportRoot)
    },
    started_at: startedAt,
    summary: {
      check_count: results.length,
      command_check_count: checks.length,
      internal_check_count: results.length - checks.length,
      passed_checks: passed.length,
      failed_checks: failed.length,
      skipped_checks: skipped.length
    },
    checks: results
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failed.length > 0) process.exit(1);
}

function runCheck(check) {
  const startedAt = new Date().toISOString();
  if (check.requiresOut && !existsSync(resolve(root, 'out'))) {
    const endedAt = new Date().toISOString();
    const status = requireStaticExport ? 'failed' : 'skipped';
    return {
      id: check.id,
      purpose: check.purpose,
      command: check.command.map(String),
      status,
      exit_code: null,
      signal: null,
      started_at: startedAt,
      ended_at: endedAt,
      output_excerpt: requireStaticExport
        ? 'Failed because out/ is absent and --require-static-export was passed. Run npm run build before this aggregate check.'
        : 'Skipped because out/ is absent. Run npm run build before this aggregate check to include static export route inventory coverage.'
    };
  }

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

function runPublicReadyInvariantCheck(directory) {
  const startedAt = new Date().toISOString();
  const { files, signals, parseFailures } = collectPublicReadySignals(directory);
  const unsafeSignals = signals.filter((signal) => !signal.safe);
  const failures = [
    ...parseFailures.map((failure) => ({
      source: failure.source,
      path: '$',
      value: failure.error,
      reason: 'invalid_json_report'
    })),
    ...unsafeSignals.map((signal) => ({
      source: signal.source,
      path: signal.path,
      value: signal.value,
      reason: 'public_ready_value_not_zero_or_false'
    }))
  ];
  const endedAt = new Date().toISOString();

  return {
    id: 'public_ready_invariant',
    purpose: 'Fails the aggregate gate if any generated JSON report promotes public-ready state above 0/false.',
    command: ['internal', 'scan-generated-json-public-ready-fields'],
    status: failures.length === 0 ? 'passed' : 'failed',
    exit_code: failures.length === 0 ? 0 : 1,
    signal: null,
    started_at: startedAt,
    ended_at: endedAt,
    output_excerpt: JSON.stringify({
      scanned_json_reports: files.length,
      public_ready_signal_count: signals.length,
      unsafe_signal_count: failures.length,
      unsafe_signals: failures.slice(0, 20)
    }, null, 2)
  };
}

function collectPublicReadySignals(directory) {
  const files = listJsonFiles(directory);
  const signals = [];
  const parseFailures = [];

  for (const filePath of files) {
    let value;
    try {
      value = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (error) {
      parseFailures.push({
        source: relative(root, filePath),
        error: error instanceof Error ? error.message : String(error)
      });
      continue;
    }

    collectSignalsFromValue(value, '$', relative(root, filePath), signals);
  }

  return { files, signals, parseFailures };
}

function collectSignalsFromValue(value, path, source, signals) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectSignalsFromValue(item, `${path}[${index}]`, source, signals));
    return;
  }

  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (/public[-_]?ready/i.test(key)) {
      signals.push({
        source,
        path: childPath,
        value: child,
        safe: isSafePublicReadyValue(child)
      });
    }
    collectSignalsFromValue(child, childPath, source, signals);
  }
}

function isSafePublicReadyValue(value) {
  if (value === 0 || value === false || value === null) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === ''
      || normalized === '0'
      || normalized === 'false'
      || normalized === 'no'
      || normalized === 'none'
      || normalized === 'null'
      || normalized.includes('blocked')
      || normalized.includes('not_allowed')
      || normalized.includes('not allowed')
      || normalized.includes('not_public')
      || normalized.includes('review_only')
      || normalized.includes('owner_required')
      || normalized.includes('owner action required')
      || normalized.includes('zero');
  }
  return false;
}

function listJsonFiles(directory) {
  if (!existsSync(directory)) return [];

  const found = [];
  for (const item of readdirSync(directory)) {
    const filePath = resolve(directory, item);
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      found.push(...listJsonFiles(filePath));
    } else if (stats.isFile() && filePath.endsWith('.json')) {
      found.push(filePath);
    }
  }
  return found.sort();
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
