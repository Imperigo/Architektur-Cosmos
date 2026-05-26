#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const assetId = String(args.asset || '').trim();
const route = String(args.route || 'all').trim();
const decision = String(args.decision || 'needs-review').trim();
const reviewer = String(args.reviewer || 'owner').trim();
const outputBase = [assetId || 'asset', route || 'all'].join('-');
const outputJsonPath = resolve(libraryRoot, args.output || `review/asset-review-decision-${outputBase}.generated.json`);
const outputMdPath = resolve(libraryRoot, args.markdown || `review/asset-review-decision-${outputBase}.generated.md`);

const allowedRoutes = new Set(['all', 'blender', 'archicad', 'web', 'svg', 'dxf', 'glb', 'material']);
const allowedDecisions = new Set(['approve-local', 'needs-review', 'reject', 'block-public']);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);
  if (!assetId) throw new Error('Missing --asset <asset_id>');
  if (!allowedRoutes.has(route)) throw new Error(`Unsupported --route ${route}. Allowed: ${[...allowedRoutes].join(', ')}`);
  if (!allowedDecisions.has(decision)) throw new Error(`Unsupported --decision ${decision}. Allowed: ${[...allowedDecisions].join(', ')}`);

  const library = readJson(libraryPath);
  const asset = (library.assets || []).find((candidate) => candidate.id === assetId);
  if (!asset) throw new Error(`Asset not found in library: ${assetId}`);

  const reviewPack = readOptionalJson(resolve(libraryRoot, 'review/asset-review-pack.generated.json'));
  const handoffBundle = readOptionalJson(resolve(libraryRoot, 'review/asset-handoff-bundle.generated.json'));
  const handoffSmoke = readOptionalJson(resolve(libraryRoot, 'review/asset-handoff-smoke.generated.json'));
  const report = buildDecision({ library, asset, reviewPack, handoffBundle, handoffSmoke });

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoAsset review decision');
  console.log(`Asset: ${asset.title}`);
  console.log(`Decision: ${report.decision}`);
  console.log(`Route: ${report.route}`);
  console.log(`Status: ${report.status}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status === 'decision_blocked') process.exit(1);
}

function buildDecision({ library, asset, reviewPack, handoffBundle, handoffSmoke }) {
  const reviewAsset = (reviewPack?.assets || []).find((candidate) => candidate.id === asset.id);
  const handoffAsset = (handoffBundle?.assets || []).find((candidate) => candidate.id === asset.id);
  const smokePassed = handoffSmoke?.summary?.failure_count === 0;
  const routeAvailable = route === 'all' || Boolean(
    handoffAsset?.[route]
    || asset.export_targets?.includes(route)
    || asset.formats?.some((format) => format.format === route)
  );
  const humanConfirmed = args['confirm-human-review'] === true;
  const canApproveLocal = decision !== 'approve-local' || (
    humanConfirmed
    && routeAvailable
    && smokePassed
    && handoffAsset?.public_gate === 'blocked'
  );
  const blockers = [
    ...(!routeAvailable ? [`Route '${route}' is not available for this asset.`] : []),
    ...(decision === 'approve-local' && !humanConfirmed ? ['--confirm-human-review is required for approve-local.'] : []),
    ...(decision === 'approve-local' && !smokePassed ? ['Handoff smoke must pass before local approval.'] : []),
    ...(decision === 'approve-local' && handoffAsset?.public_gate !== 'blocked' ? ['Public gate must remain blocked during local approval.'] : [])
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-review-decision',
    library_path: relative(root, libraryPath),
    library_id: library.library_id || null,
    asset_id: asset.id,
    asset_title: asset.title,
    route,
    decision,
    reviewer,
    status: blockers.length ? 'decision_blocked' : canApproveLocal ? 'local_review_decision_recorded' : 'local_review_note_recorded',
    policy: {
      no_uploads: true,
      no_public_downloads: true,
      no_library_mutation: true,
      no_scene_write: true,
      public_gate_remains_blocked: handoffAsset?.public_gate === 'blocked'
    },
    evidence: {
      rights_status: asset.rights_status,
      review_status: asset.review_status,
      human_review_status: reviewAsset?.human_review_status || 'unknown',
      suggested_decision: reviewAsset?.suggested_decision || null,
      smoke_status: handoffSmoke?.status || 'missing',
      smoke_passed: smokePassed,
      route_available: routeAvailable,
      handoff_bundle_status: handoffBundle?.status || 'missing'
    },
    outputs: {
      decision_json: relative(root, outputJsonPath),
      decision_markdown: relative(root, outputMdPath),
      blender_python: handoffBundle?.outputs?.blender_python || null,
      archicad_schedule_csv: handoffBundle?.outputs?.archicad_schedule_csv || null
    },
    blockers,
    next_actions: blockers.length
      ? ['Resolve blockers, rerun the Handoff Smoke, then record the decision again.']
      : nextActions({ decision, route })
  };
}

function nextActions({ decision, route }) {
  if (decision === 'approve-local') {
    return [
      `Local ${route} review has been recorded. Keep generated files local and review-only.`,
      'Only run Blender scene-write tests in a copied sandbox file with explicit owner approval.',
      'Do not enable public downloads or R2 upload from this decision.'
    ];
  }
  if (decision === 'reject') return ['Keep the asset out of exchange workflows and document why it was rejected.'];
  if (decision === 'block-public') return ['Keep public web/download gates blocked; local metadata can remain visible for review.'];
  return ['Continue manual review. Open local source/export files and rerun smoke after changes.'];
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoAsset Review Decision',
    '',
    `Asset: ${report.asset_title} (\`${report.asset_id}\`)`,
    `Generated: ${report.generated_at}`,
    `Decision: \`${report.decision}\``,
    `Route: \`${report.route}\``,
    `Status: \`${report.status}\``,
    '',
    'This decision is local review evidence only. It does not mutate the library, import into Blender, write ArchiCAD files, upload assets or publish downloads.',
    '',
    '## Evidence',
    '',
    `- rights: \`${report.evidence.rights_status}\``,
    `- review: \`${report.evidence.review_status}\``,
    `- human review: \`${report.evidence.human_review_status}\``,
    `- smoke: \`${report.evidence.smoke_status}\``,
    `- route available: ${report.evidence.route_available}`,
    `- public gate remains blocked: ${report.policy.public_gate_remains_blocked}`,
    '',
    '## Blockers',
    ''
  ];
  if (report.blockers.length) report.blockers.forEach((blocker) => lines.push(`- ${blocker}`));
  else lines.push('- none');
  lines.push('', '## Outputs', '');
  Object.entries(report.outputs).forEach(([key, value]) => lines.push(`- ${key}: ${value ? `\`${value}\`` : '-'}`));
  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function readOptionalJson(pathname) {
  if (!existsSync(pathname)) return null;
  return readJson(pathname);
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
