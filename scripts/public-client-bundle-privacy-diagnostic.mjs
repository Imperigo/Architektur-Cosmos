#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { publicLeakMatches, publicLeakVariants } from './public-leak-patterns.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outRoot = resolve(root, args.out || 'out');
const bundleRoot = resolve(outRoot, '_next/static');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-data/review/public-client-bundle-privacy-diagnostic.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-data/review/public-client-bundle-privacy-diagnostic.generated.md');
const maxScanBytes = 5 * 1024 * 1024;

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const report = existsSync(bundleRoot)
    ? await buildDiagnosticReport()
    : skippedMissingBundleReport();

  await writeReport(report);

  console.log('Public client bundle privacy diagnostic');
  console.log(`Status: ${report.status}`);
  console.log(`Bundles: ${report.summary.clean_bundles}/${report.summary.checked_bundles} clean`);
  console.log(`Findings: ${report.summary.finding_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

async function buildDiagnosticReport() {
  const bundlePaths = (await collectFiles(bundleRoot))
    .filter((path) => /\.(js|mjs)$/i.test(path))
    .sort();
  const bundles = bundlePaths.map(checkBundle);
  const findings = bundles.flatMap((bundle) => bundle.findings);
  const patternCounts = countBy(findings.map((finding) => finding.pattern));

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-client-bundle-privacy-diagnostic',
    status: findings.length === 0
      ? 'public_client_bundle_privacy_diagnostic_clean'
      : 'public_client_bundle_privacy_diagnostic_needs_review',
    policy: {
      source_free: true,
      reads_private_content: false,
      writes_public_ready: false,
      starts_server: false,
      scans_static_export_only: true,
      report_only: true,
      hard_gate: false,
      includes_bundle_excerpt: false,
      filters_bare_public_home_routes: true,
      scan_max_bytes: maxScanBytes
    },
    inputs: {
      out_dir: relative(root, outRoot),
      bundle_dir: relative(root, bundleRoot)
    },
    summary: {
      checked_bundles: bundles.length,
      clean_bundles: bundles.filter((bundle) => bundle.status === 'clean').length,
      bundles_needing_review: bundles.filter((bundle) => bundle.status !== 'clean').length,
      finding_count: findings.length,
      pattern_count: Object.keys(patternCounts).length,
      truncated_bundles: bundles.filter((bundle) => bundle.truncated).length,
      public_ready_after_check: 0
    },
    pattern_counts: patternCounts,
    bundles,
    findings,
    follow_up: [
      'Use this report as a review-only pointer for client-bundle cleanup.',
      'Do not promote this diagnostic to a hard public gate until known public false positives are classified.',
      'Prefer moving review-only constants out of client components or replacing them with explicit public-safe summaries.'
    ]
  };
}

function skippedMissingBundleReport() {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'public-client-bundle-privacy-diagnostic',
    status: 'public_client_bundle_privacy_diagnostic_skipped_missing_static_export',
    policy: {
      source_free: true,
      reads_private_content: false,
      writes_public_ready: false,
      starts_server: false,
      scans_static_export_only: true,
      report_only: true,
      hard_gate: false,
      includes_bundle_excerpt: false,
      filters_bare_public_home_routes: true,
      scan_max_bytes: maxScanBytes
    },
    inputs: {
      out_dir: relative(root, outRoot),
      bundle_dir: relative(root, bundleRoot)
    },
    summary: {
      checked_bundles: 0,
      clean_bundles: 0,
      bundles_needing_review: 0,
      finding_count: 0,
      pattern_count: 0,
      truncated_bundles: 0,
      public_ready_after_check: 0
    },
    pattern_counts: {},
    bundles: [],
    findings: [],
    follow_up: [
      'Run npm run build before this diagnostic when a fresh static export is required.'
    ]
  };
}

function checkBundle(filePath) {
  const stats = statSync(filePath);
  const relativePath = relative(root, filePath);
  const exportedPath = `/${relative(outRoot, filePath).replace(/\\/g, '/')}`;
  const body = readFileSync(filePath, 'utf8').slice(0, maxScanBytes);
  const contentMatches = reportableLeakMatches(body);
  const pathMatches = reportableLeakMatches(exportedPath);
  const findings = [
    ...pathMatches.map((pattern) => finding('path_pattern', exportedPath, relativePath, pattern)),
    ...contentMatches.map((pattern) => finding('content_pattern', exportedPath, relativePath, pattern))
  ];

  return {
    path: exportedPath,
    file: relativePath,
    extension: extname(filePath).toLowerCase(),
    bytes: stats.size,
    scanned_bytes: Math.min(stats.size, maxScanBytes),
    truncated: stats.size > maxScanBytes,
    status: findings.length === 0 ? 'clean' : 'needs_review',
    finding_count: findings.length,
    matched_patterns: [...new Set(findings.map((item) => item.pattern))].sort(),
    findings
  };
}

function reportableLeakMatches(value) {
  return publicLeakMatches(value).filter((match) => match !== '/\\/home\\//i' || hasLocalHomePath(value));
}

function hasLocalHomePath(value) {
  return publicLeakVariants(value).some((variant) => /(?:^|["'(\s=:])\/home\/[^/\s"'<>]+(?:\/|$)/i.test(variant));
}

function finding(kind, exportedPath, file, pattern) {
  return {
    id: `${exportedPath}:${kind}:${pattern}`,
    kind,
    path: exportedPath,
    file,
    pattern,
    severity: 'review',
    public_display_allowed: false
  };
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(path);
    if (entry.isFile()) return [path];
    return [];
  }));
  return files.flat();
}

async function writeReport(report) {
  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');
}

function renderMarkdown(report) {
  const lines = [
    '# Public Client Bundle Privacy Diagnostic',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'Report-only scan of exported Next client JavaScript bundles for existing public leak patterns. Findings are pointers only: no bundle excerpts are written, no server is started and public-ready remains 0.',
    '',
    '## Summary',
    '',
    `- bundles: ${report.summary.clean_bundles}/${report.summary.checked_bundles} clean`,
    `- bundles needing review: ${report.summary.bundles_needing_review}`,
    `- findings: ${report.summary.finding_count}`,
    `- matched patterns: ${report.summary.pattern_count}`,
    `- truncated bundles: ${report.summary.truncated_bundles}`,
    `- public-ready after check: ${report.summary.public_ready_after_check}`,
    '',
    '## Pattern Counts',
    ''
  ];

  const patternEntries = Object.entries(report.pattern_counts || {});
  if (patternEntries.length === 0) {
    lines.push('- none');
  } else {
    patternEntries
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([pattern, count]) => lines.push(`- \`${pattern}\`: ${count}`));
  }

  lines.push('', '## Bundles', '');
  lines.push('| Path | Status | Findings | Bytes |');
  lines.push('| --- | --- | ---: | ---: |');
  report.bundles.forEach((bundle) => {
    lines.push(`| \`${bundle.path}\` | \`${bundle.status}\` | ${bundle.finding_count} | ${bundle.bytes} |`);
  });

  if (report.findings.length > 0) {
    lines.push('', '## Findings', '');
    report.findings.forEach((item) => {
      lines.push(`- \`${item.path}\` ${item.kind}: \`${item.pattern}\``);
    });
  }

  lines.push('', '## Follow Up', '');
  report.follow_up.forEach((item) => lines.push(`- ${item}`));

  return `${lines.join('\n')}\n`;
}

function countBy(values) {
  return values.reduce((accumulator, value) => {
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});
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
