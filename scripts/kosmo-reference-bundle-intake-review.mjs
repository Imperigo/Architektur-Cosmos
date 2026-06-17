#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const bundlePaths = (args._.length ? args._ : [
  'examples/kosmo-references/kosmodraw-reference-bundle.review-only.fixture.json',
  'examples/kosmo-references/kosmodraw-villa-savoye-sketch-to-3d.review-only.fixture.json'
]).map((path) => resolve(root, path));
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-references/review/kosmodraw-bundle-intake-review.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-references/review/kosmodraw-bundle-intake-review.generated.md');

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

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const bundles = bundlePaths.map((path) => readBundle(path));
  const review = buildReview(bundles);

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(review), 'utf8');

  console.log('Kosmo reference bundle intake review generated');
  console.log(`Status: ${review.status}`);
  console.log(`Bundles: ${review.summary.bundle_count}`);
  console.log(`Openings: ${review.summary.opening_count}`);
  console.log(`Asset candidates: ${review.summary.asset_candidate_count}`);
  console.log(`Public-ready after intake: ${review.summary.public_ready_after_intake}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (review.summary.failure_count > 0) {
    process.exit(1);
  }
}

function readBundle(path) {
  if (!existsSync(path)) throw new Error(`Bundle not found: ${path}`);
  const bundle = JSON.parse(readFileSync(path, 'utf8'));
  return { path, bundle };
}

function buildReview(items) {
  const rows = items.map(({ path, bundle }) => bundleRow({ path, bundle }));
  const failures = rows.flatMap((row) => row.failures);
  const openingCount = rows.reduce((sum, row) => sum + row.geometry.openings.total, 0);
  const assetCandidateCount = rows.reduce((sum, row) => sum + row.assets.total, 0);
  const unsafePublicFlags = rows.reduce((sum, row) => sum + row.gates.unsafe_public_flag_count, 0);
  const leakCount = rows.reduce((sum, row) => sum + row.gates.private_leak_count, 0);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-reference-bundle-intake-review',
    status: failures.length === 0 ? 'kosmodraw_bundle_intake_review_ready' : 'kosmodraw_bundle_intake_review_blocked',
    policy: {
      review_only: true,
      metadata_only: true,
      copies_ifc_paths_to_report: false,
      copies_private_paths_to_report: false,
      writes_public_data_now: false,
      writes_mock_entries_now: false,
      public_ready_after_intake: 0,
      owner_review_required_before_public_display: true
    },
    source_refs: items.map(({ path }) => relative(root, path)),
    summary: {
      bundle_count: rows.length,
      project_count: new Set(rows.map((row) => row.project_slug)).size,
      room_count: rows.reduce((sum, row) => sum + row.geometry.rooms, 0),
      wall_count: rows.reduce((sum, row) => sum + row.geometry.walls, 0),
      opening_count: openingCount,
      story_count: rows.reduce((sum, row) => sum + row.geometry.stories, 0),
      asset_candidate_count: assetCandidateCount,
      unsafe_public_flag_count: unsafePublicFlags,
      private_leak_count: leakCount,
      failure_count: failures.length,
      public_ready_after_intake: 0,
      recommended_next_step: failures.length
        ? 'fix_bundle_contract_failures_before_intake'
        : 'wait_for_real_kosmodraw_bundle_or_create_human_review_decision'
    },
    bundles: rows,
    next_actions: nextActions({ failures, openingCount, assetCandidateCount }),
    hard_stops: [
      'Do not copy IFC/local paths into public data.',
      'Do not write data/mock-entries.json from this intake review.',
      'Do not mark any asset public_display_allowed from this intake review.',
      'Do not upload generated drawings or models to R2 from this intake review.',
      'Require human/owner review before any public route displays new bundle outputs.'
    ],
    failures
  };
}

function bundleRow({ path, bundle }) {
  const failures = [];
  const publicFlags = countPublicFlags(bundle);
  const privateLeaks = scanPublicStrings(bundle);
  const openings = Array.isArray(bundle.openings) ? bundle.openings : [];
  const assetCandidates = Array.isArray(bundle.asset_candidates) ? bundle.asset_candidates : [];

  if (bundle.status !== 'review_only') failures.push(`Bundle ${relative(root, path)} status is not review_only.`);
  if (publicFlags.length > 0) failures.push(`Bundle ${relative(root, path)} has ${publicFlags.length} unsafe public_display_allowed=true flags.`);
  if (privateLeaks.length > 0) failures.push(`Bundle ${relative(root, path)} has ${privateLeaks.length} private/source leak candidates in report-facing fields.`);

  return {
    source_file: relative(root, path),
    project_slug: bundle.project_slug || null,
    status: bundle.status || null,
    source_kind: bundle.source_kind || null,
    gates: {
      intake_allowed: failures.length === 0,
      review_only: bundle.status === 'review_only',
      public_ready_after_intake: 0,
      unsafe_public_flag_count: publicFlags.length,
      private_leak_count: privateLeaks.length,
      ifc_path_present: Boolean(bundle.ifc_path),
      ifc_path_copied_to_report: false
    },
    geometry: {
      rooms: Array.isArray(bundle.rooms) ? bundle.rooms.length : 0,
      walls: Array.isArray(bundle.walls) ? bundle.walls.length : 0,
      stories: Array.isArray(bundle.stories) ? bundle.stories.length : 0,
      openings: openingSummary(openings)
    },
    review_artifacts: {
      model_preview: reviewArtifactStatus(bundle.model_preview),
      drawings: Array.isArray(bundle.drawings) ? bundle.drawings.map(reviewArtifactStatus) : []
    },
    assets: {
      total: assetCandidates.length,
      by_kind: countBy(assetCandidates.map((asset) => asset.kind || 'unknown')),
      public_display_allowed_count: assetCandidates.filter((asset) => asset.public_display_allowed === true).length,
      rights: countBy(assetCandidates.map((asset) => asset.rights_status || 'unknown'))
    },
    analysis_layers: Array.isArray(bundle.analysis_layers)
      ? bundle.analysis_layers.map((layer) => ({
        analysis_type: layer.analysis_type || null,
        review_status: layer.review_status || null
      }))
      : [],
    failures
  };
}

function openingSummary(openings) {
  return {
    total: openings.length,
    by_kind: countBy(openings.map((opening) => opening.kind || opening.type || 'unknown')),
    at_xy_count: openings.filter((opening) => isPoint(opening.at_xy)).length,
    host_wall_position_count: openings.filter((opening) => opening.host_wall_id && typeof opening.position_m === 'number').length,
    windows_with_sill_count: openings.filter((opening) => (opening.kind || opening.type) === 'window' && typeof opening.sill_m === 'number').length
  };
}

function reviewArtifactStatus(artifact) {
  if (!artifact) {
    return {
      present: false,
      review_status: null,
      public_display_allowed: false
    };
  }

  return {
    present: true,
    review_status: artifact.review_status || null,
    public_display_allowed: artifact.public_display_allowed === true,
    url_present: Boolean(artifact.url || artifact.glb_url),
    caveat_present: Boolean(artifact.caveat)
  };
}

function countPublicFlags(value, path = '$') {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => countPublicFlags(item, `${path}[${index}]`));
  return Object.entries(value).flatMap(([key, child]) => (
    key === 'public_display_allowed' && child === true
      ? [`${path}.${key}`]
      : countPublicFlags(child, `${path}.${key}`)
  ));
}

function scanPublicStrings(value, path = '$') {
  if (typeof value === 'string') {
    if (['ifc_path', 'local_path', 'source_path', 'tmp_path'].some((key) => path.endsWith(`.${key}`))) return [];
    return hasPrivateLeak(value) ? [path] : [];
  }

  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => scanPublicStrings(item, `${path}[${index}]`));
  return Object.entries(value).flatMap(([key, child]) => scanPublicStrings(child, `${path}.${key}`));
}

function hasPrivateLeak(value) {
  return privateLeakPatterns.some((pattern) => pattern.test(String(value ?? '')));
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function isPoint(value) {
  return Array.isArray(value) && value.length >= 2 && value.slice(0, 2).every((item) => typeof item === 'number');
}

function nextActions({ failures, openingCount, assetCandidateCount }) {
  if (failures.length > 0) {
    return [
      'Fix blocked bundle contract fields.',
      'Rerun npm run public:bundle-check and npm run public:bundle-intake-review.',
      'Keep public-ready at 0 until the intake review passes.'
    ];
  }

  return [
    openingCount > 0
      ? 'Ask KosmoDraw for a real reviewed opening bundle from sketch_to_3d/export_ifc, then rerun this intake review.'
      : 'Ask KosmoDraw to include opening semantics before model/plan derivation.',
    assetCandidateCount > 0
      ? 'Map asset candidates into KosmoAsset review rows only after human/owner review.'
      : 'Keep waiting for model/drawing/material asset candidates.',
    'If review is accepted later, create a separate public promotion decision; this intake does not promote.'
  ];
}

function renderMarkdown(review) {
  const lines = [
    '# KosmoDraw Bundle Intake Review',
    '',
    `Generated: ${review.generated_at}`,
    `Status: \`${review.status}\``,
    '',
    '## Policy',
    '',
    '- Review-only intake.',
    '- No public data is written.',
    '- IFC/local paths are not copied into this report.',
    '- Public-ready after intake remains `0`.',
    '',
    '## Summary',
    '',
    `- Bundles: ${review.summary.bundle_count}`,
    `- Projects: ${review.summary.project_count}`,
    `- Rooms: ${review.summary.room_count}`,
    `- Walls: ${review.summary.wall_count}`,
    `- Openings: ${review.summary.opening_count}`,
    `- Stories: ${review.summary.story_count}`,
    `- Asset candidates: ${review.summary.asset_candidate_count}`,
    `- Unsafe public flags: ${review.summary.unsafe_public_flag_count}`,
    `- Private leak candidates: ${review.summary.private_leak_count}`,
    `- Public-ready after intake: ${review.summary.public_ready_after_intake}`,
    '',
    '## Bundles',
    '',
    '| Project | Source kind | Rooms | Walls | Openings | Assets | Intake |',
    '| --- | --- | ---: | ---: | ---: | ---: | --- |'
  ];

  review.bundles.forEach((bundle) => {
    lines.push(`| \`${bundle.project_slug}\` | ${bundle.source_kind} | ${bundle.geometry.rooms} | ${bundle.geometry.walls} | ${bundle.geometry.openings.total} | ${bundle.assets.total} | ${bundle.gates.intake_allowed ? 'ready' : 'blocked'} |`);
  });

  lines.push('', '## Next Actions', '');
  review.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('', '## Hard Stops', '');
  review.hard_stops.forEach((stop) => lines.push(`- ${stop}`));

  if (review.failures.length > 0) {
    lines.push('', '## Failures', '');
    review.failures.forEach((failure) => lines.push(`- ${failure}`));
  }

  return `${lines.join('\n')}\n`;
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
