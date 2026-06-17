#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const reportPath = resolve(root, args.report || 'examples/kosmo-references/review/kosmodraw-bundle-intake-review.generated.json');
const bundlePaths = (args._.length ? args._ : [
  'examples/kosmo-references/kosmodraw-reference-bundle.review-only.fixture.json',
  'examples/kosmo-references/kosmodraw-villa-savoye-sketch-to-3d.review-only.fixture.json'
]).map((path) => resolve(root, path));

const privateLeakPatterns = [
  /\/mnt\//i,
  /\/home\//i,
  /source-root/i,
  /private-library/i,
  /onedrive/i,
  /archiv\/architekturkosmos\/assets/i,
  /\.pdf($|\?)/i,
  /archive-intake/i,
  /\bocr\b/i
];

const findings = [];

main();

function main() {
  const report = readJson(reportPath, 'report');
  const bundles = bundlePaths.map((path) => readJson(path, 'bundle'));
  const expected = expectedSummary(bundles);

  check(report.status === 'kosmodraw_bundle_intake_review_ready', 'status_ready', `Report status was ${report.status}.`);
  check(report.policy?.review_only === true, 'policy_review_only', 'Report must be review-only.');
  check(report.policy?.writes_public_data_now === false, 'policy_no_public_write', 'Report must not write public data.');
  check(report.policy?.copies_ifc_paths_to_report === false, 'policy_no_ifc_path_copy', 'Report must not copy IFC paths.');
  check(report.summary?.public_ready_after_intake === 0, 'summary_public_ready_zero', 'Public-ready after intake must be 0.');
  check(report.summary?.unsafe_public_flag_count === 0, 'summary_no_public_flags', 'Unsafe public flag count must be 0.');
  check(report.summary?.private_leak_count === 0, 'summary_no_private_leaks', 'Private leak count must be 0.');
  check(!hasPrivateLeak(JSON.stringify(report)), 'report_no_private_patterns', 'Report JSON must not contain blocked private/source patterns.');

  for (const [key, value] of Object.entries(expected)) {
    check(report.summary?.[key] === value, `summary_${key}`, `Expected ${key}=${value}, got ${report.summary?.[key]}.`);
  }

  const reportBundles = Array.isArray(report.bundles) ? report.bundles : [];
  check(reportBundles.length === bundles.length, 'bundle_row_count', `Expected ${bundles.length} bundle rows, got ${reportBundles.length}.`);
  reportBundles.forEach((row, index) => {
    const bundle = bundles[index];
    check(row.project_slug === bundle.project_slug, `bundle_${index}_project_slug`, `Bundle row ${index} project slug mismatch.`);
    check(row.gates?.intake_allowed === true, `bundle_${index}_intake_allowed`, `Bundle row ${index} must be intake-ready.`);
    check(row.gates?.public_ready_after_intake === 0, `bundle_${index}_public_ready_zero`, `Bundle row ${index} public-ready after intake must be 0.`);
    check(row.gates?.ifc_path_copied_to_report === false, `bundle_${index}_ifc_path_not_copied`, `Bundle row ${index} must not copy IFC path.`);
  });

  const summary = {
    status: findings.every((finding) => finding.passed) ? 'passed' : 'failed',
    report: args.report || 'examples/kosmo-references/review/kosmodraw-bundle-intake-review.generated.json',
    findings
  };

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== 'passed') process.exit(1);
}

function expectedSummary(bundles) {
  return {
    bundle_count: bundles.length,
    project_count: new Set(bundles.map((bundle) => bundle.project_slug)).size,
    room_count: bundles.reduce((sum, bundle) => sum + count(bundle.rooms), 0),
    wall_count: bundles.reduce((sum, bundle) => sum + count(bundle.walls), 0),
    opening_count: bundles.reduce((sum, bundle) => sum + count(bundle.openings), 0),
    story_count: bundles.reduce((sum, bundle) => sum + count(bundle.stories), 0),
    asset_candidate_count: bundles.reduce((sum, bundle) => sum + count(bundle.asset_candidates), 0),
    unsafe_public_flag_count: 0,
    private_leak_count: 0,
    failure_count: 0
  };
}

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

function check(passed, id, message) {
  findings.push({ id, passed: Boolean(passed), message });
}

function readJson(path, label) {
  if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function hasPrivateLeak(value) {
  return privateLeakPatterns.some((pattern) => pattern.test(String(value ?? '')));
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      parsed._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (index + 1 < argv.length && !String(next).startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
