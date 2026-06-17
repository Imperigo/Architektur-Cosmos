#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const inputPaths = (args._.length ? args._ : [
  'examples/kosmo-references/kosmodraw-digitalization-analysis.review-only.fixture.json'
]).map((path) => resolve(process.cwd(), path));

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

const bundleRequiredFields = [
  'project_slug',
  'status',
  'source_kind',
  'rooms',
  'walls',
  'openings',
  'stories',
  'analysis_layers',
  'asset_candidates'
];

const findings = [];

main();

function main() {
  const reports = inputPaths.map(checkAnalysisReport);
  const summary = {
    status: findings.every((finding) => finding.passed) ? 'passed' : 'failed',
    policy: {
      review_only: true,
      writes_public_data_now: false,
      copies_ifc_or_source_paths: false
    },
    reports,
    findings
  };

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== 'passed') process.exit(1);
}

function checkAnalysisReport(path) {
  const report = readJson(path);
  const reportId = relativeDisplayPath(path);
  const missingTopLevel = ['source', 'totals', 'structure', 'quantities'].filter((field) => !(field in report));
  const missingBundleFields = bundleRequiredFields.filter((field) => !(field in report));
  const totals = report.totals ?? {};
  const structure = report.structure ?? {};
  const quantities = report.quantities ?? {};
  const volumes = quantities.volumes_m3 ?? {};
  const hasElementLevelGeometry = ['rooms', 'walls', 'openings', 'stories'].every((field) => Array.isArray(report[field]));

  check(missingTopLevel.length === 0, `${reportId}:top_level_shape`, `Missing top-level fields: ${missingTopLevel.join(', ') || 'none'}.`);
  checkPositiveNumber(totals.n_rooms, `${reportId}:totals.n_rooms`);
  checkPositiveNumber(totals.n_floors, `${reportId}:totals.n_floors`);
  checkPositiveNumber(totals.NGF_m2, `${reportId}:totals.NGF_m2`);
  checkPositiveNumber(totals.GF_m2, `${reportId}:totals.GF_m2`);
  checkPositiveNumber(structure.n_walls, `${reportId}:structure.n_walls`);
  checkNumberAtLeast(structure.n_external, 0, `${reportId}:structure.n_external`);
  checkNumberAtLeast(structure.n_internal, 0, `${reportId}:structure.n_internal`);
  checkPositiveNumber(volumes.total, `${reportId}:quantities.volumes_m3.total`);
  check(!hasPrivateLeak(JSON.stringify(report)), `${reportId}:no_private_patterns`, 'Digitalization analysis fixture must not contain private paths or blocked source strings.');
  check(!containsPublicDisplayAllowedTrue(report), `${reportId}:no_public_display_flag`, 'Digitalization analysis must not set public_display_allowed: true.');

  if (Array.isArray(report.per_floor)) {
    report.per_floor.forEach((floor, index) => {
      checkNumberAtLeast(floor.floor_level, 0, `${reportId}:per_floor[${index}].floor_level`);
      checkPositiveNumber(floor.n_rooms, `${reportId}:per_floor[${index}].n_rooms`);
      checkPositiveNumber(floor.NGF_m2, `${reportId}:per_floor[${index}].NGF_m2`);
    });
  }

  return {
    path: reportId,
    source_label: typeof report.source === 'string' ? report.source : null,
    review_only_intake_allowed: missingTopLevel.length === 0,
    full_kosmo_reference_bundle_ready: hasElementLevelGeometry && missingBundleFields.length === 0,
    missing_fields_for_kosmo_reference_bundle: missingBundleFields,
    element_counts: {
      rooms: count(report.rooms),
      walls: count(report.walls),
      openings: count(report.openings),
      stories: count(report.stories)
    },
    aggregate_counts: {
      rooms: numberOrNull(totals.n_rooms),
      floors: numberOrNull(totals.n_floors),
      walls: numberOrNull(structure.n_walls),
      gross_floor_area_m2: numberOrNull(totals.GF_m2),
      net_floor_area_m2: numberOrNull(totals.NGF_m2),
      volume_total_m3: numberOrNull(volumes.total)
    },
    next_adapter_step: hasElementLevelGeometry
      ? 'Map element arrays into kosmo_reference_bundle with status review_only and public_display_allowed false.'
      : 'Request KosmoDraw element-level arrays for rooms, walls, openings and stories before promotion to kosmo_reference_bundle.'
  };
}

function readJson(path) {
  if (!existsSync(path)) {
    throw new Error(`Input not found: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function checkPositiveNumber(value, id) {
  check(typeof value === 'number' && Number.isFinite(value) && value > 0, id, `${id} must be a positive number.`);
}

function checkNumberAtLeast(value, min, id) {
  check(typeof value === 'number' && Number.isFinite(value) && value >= min, id, `${id} must be a number >= ${min}.`);
}

function check(passed, id, message) {
  findings.push({ id, passed: Boolean(passed), message });
}

function hasPrivateLeak(value) {
  return privateLeakPatterns.some((pattern) => pattern.test(String(value ?? '')));
}

function containsPublicDisplayAllowedTrue(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsPublicDisplayAllowedTrue);
  if (value.public_display_allowed === true) return true;
  return Object.values(value).some(containsPublicDisplayAllowedTrue);
}

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function relativeDisplayPath(path) {
  return path.startsWith(`${process.cwd()}/`) ? path.slice(process.cwd().length + 1) : `external-input:${basename(path)}`;
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (const token of argv) {
    if (token.startsWith('--')) {
      parsed[token.slice(2)] = true;
    } else {
      parsed._.push(token);
    }
  }
  return parsed;
}
