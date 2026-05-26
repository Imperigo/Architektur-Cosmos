#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const assetId = String(args.asset || '').trim();
const requestedRoute = String(args.route || '').trim();

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);
  if (!assetId) throw new Error('Missing --asset <asset_id>');

  const library = readJson(libraryPath);
  const asset = (library.assets || []).find((candidate) => candidate.id === assetId);
  if (!asset) throw new Error(`Asset not found in library: ${assetId}`);

  const humanSession = readOptionalJson(resolve(libraryRoot, 'review/asset-human-review-session.generated.json'));
  const humanSessionAsset = (humanSession?.assets || []).find((candidate) => candidate.id === assetId);
  const route = requestedRoute || humanSessionAsset?.primary_route || 'all';
  const decisionPath = resolve(libraryRoot, args.decision || `review/asset-review-decision-${assetId}-${route}.generated.json`);
  const outputJsonPath = resolve(libraryRoot, args.output || `review/asset-review-certificate-${assetId}-${route}.generated.json`);
  const outputMdPath = resolve(libraryRoot, args.markdown || `review/asset-review-certificate-${assetId}-${route}.generated.md`);
  const report = buildCertificate({
    library,
    asset,
    route,
    decisionPath,
    humanSession,
    humanSessionAsset,
    reviewPack: readOptionalJson(resolve(libraryRoot, 'review/asset-review-pack.generated.json')),
    handoffBundle: readOptionalJson(resolve(libraryRoot, 'review/asset-handoff-bundle.generated.json')),
    handoffSmoke: readOptionalJson(resolve(libraryRoot, 'review/asset-handoff-smoke.generated.json'))
  });

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoAsset review certificate');
  console.log(`Asset: ${asset.title}`);
  console.log(`Route: ${route}`);
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'asset_local_review_certified') process.exit(1);
}

function buildCertificate({ library, asset, route, decisionPath, humanSession, humanSessionAsset, reviewPack, handoffBundle, handoffSmoke }) {
  const decision = readOptionalJson(decisionPath);
  const reviewAsset = (reviewPack?.assets || []).find((candidate) => candidate.id === asset.id);
  const handoffAsset = (handoffBundle?.assets || []).find((candidate) => candidate.id === asset.id);
  const routeProfile = route === 'all' ? handoffAsset : handoffAsset?.[route];
  const sourceFile = routeProfile?.source_file || null;
  const checks = [
    check('human_session_available', Boolean(humanSession), 'Human-review session exists.'),
    check('human_session_asset_row', Boolean(humanSessionAsset), 'Human-review session contains this asset.'),
    check('decision_exists', Boolean(decision), 'Explicit local review decision exists.'),
    check('decision_status_recorded', decision?.status === 'local_review_decision_recorded', `Decision status is ${decision?.status || 'missing'}.`),
    check('decision_is_local_approval', decision?.decision === 'approve-local', `Decision is ${decision?.decision || 'missing'}.`),
    check('decision_route_matches', decision?.route === route, `Decision route is ${decision?.route || 'missing'}, expected ${route}.`),
    check('review_pack_local_ready', reviewAsset?.local_ready === true, 'Review-pack marks the asset as local-ready.'),
    check('handoff_smoke_passed', handoffSmoke?.summary?.failure_count === 0, `Handoff smoke status is ${handoffSmoke?.status || 'missing'}.`),
    check('handoff_route_profile', Boolean(routeProfile), `Handoff bundle contains a ${route} profile.`),
    check('source_file_exists', Boolean(sourceFile && existsSync(resolve(root, sourceFile))), 'Route source file exists locally.'),
    check('public_gate_blocked', handoffAsset?.public_gate === 'blocked' && decision?.policy?.public_gate_remains_blocked === true, 'Public gate remains blocked.'),
    check('no_uploads', decision?.policy?.no_uploads === true, 'Decision records no uploads.'),
    check('no_public_downloads', decision?.policy?.no_public_downloads === true, 'Decision records no public downloads.'),
    check('no_library_mutation', decision?.policy?.no_library_mutation === true, 'Decision records no library mutation.')
  ];
  const failedChecks = checks.filter((item) => item.status !== 'passed');
  const certificateId = [
    library.library_id || 'kosmo-asset-library',
    asset.id,
    route,
    decision?.generated_at || 'no-decision'
  ].join(':');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-review-certificate',
    library_path: relative(root, libraryPath),
    library_id: library.library_id || null,
    asset_id: asset.id,
    asset_title: asset.title,
    route,
    status: failedChecks.length ? 'asset_local_review_certificate_blocked' : 'asset_local_review_certified',
    certificate_id: certificateId,
    certificate_scope: 'local_review_only',
    policy: {
      local_review_evidence_only: true,
      no_public_use_approval: true,
      no_uploads: true,
      no_public_downloads: true,
      no_d1_writes: true,
      no_r2_writes: true,
      no_library_mutation: true,
      no_blender_scene_write: true,
      no_archicad_project_write: true
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failedChecks.length,
      public_gate: handoffAsset?.public_gate || 'unknown',
      rights_status: asset.rights_status,
      local_ready: reviewAsset?.local_ready === true,
      human_review_session_status: humanSession?.status || null
    },
    evidence: {
      decision: decision
        ? {
            path: relative(root, decisionPath),
            status: decision.status,
            decision: decision.decision,
            route: decision.route,
            reviewer: decision.reviewer,
            generated_at: decision.generated_at
          }
        : null,
      human_session: humanSessionAsset
        ? {
            path: relative(root, resolve(libraryRoot, 'review/asset-human-review-session.generated.json')),
            review_priority: humanSessionAsset.review_priority,
            primary_route: humanSessionAsset.primary_route,
            human_review_status: humanSessionAsset.human_review_status
          }
        : null,
      handoff_smoke: {
        path: relative(root, resolve(libraryRoot, 'review/asset-handoff-smoke.generated.json')),
        status: handoffSmoke?.status || 'missing',
        failure_count: handoffSmoke?.summary?.failure_count ?? null
      },
      route_profile: routeProfile
        ? {
            source_file: sourceFile,
            approved_for_exchange: Boolean(routeProfile.approved_for_exchange),
            exchange_mode: routeProfile.exchange_mode || routeProfile.import_mode || null,
            layer: routeProfile.blender_collection || routeProfile.archicad_layer || null,
            surface: routeProfile.archicad_surface || null
          }
        : null
    },
    checks,
    outputs: {
      certificate_json: relative(root, resolve(libraryRoot, args.output || `review/asset-review-certificate-${asset.id}-${route}.generated.json`)),
      certificate_markdown: relative(root, resolve(libraryRoot, args.markdown || `review/asset-review-certificate-${asset.id}-${route}.generated.md`)),
      source_file: sourceFile,
      decision: relative(root, decisionPath)
    },
    next_actions: failedChecks.length
      ? ['Resolve failed checks before treating this asset/route as locally certified.']
      : [
          'Use this certificate only as local review evidence.',
          'Proceed to Blender or ArchiCAD sandbox tests only in copied project files.',
          'Keep public downloads, D1/R2 writes and R2 uploads disabled until a separate public-rights review exists.'
        ]
  };
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoAsset Review Certificate',
    '',
    `Asset: ${report.asset_title} (\`${report.asset_id}\`)`,
    `Route: \`${report.route}\``,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Certificate ID: \`${report.certificate_id}\``,
    '',
    'This is local review evidence only. It does not approve public use, upload assets, write D1/R2, mutate the library, write Blender scenes or write ArchiCAD project files.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count}`,
    `- failed checks: ${report.summary.failed_checks}`,
    `- public gate: \`${report.summary.public_gate}\``,
    `- rights: \`${report.summary.rights_status}\``,
    `- local ready: ${report.summary.local_ready ? 'yes' : 'no'}`,
    '',
    '## Evidence',
    '',
    `- decision: ${report.evidence.decision ? `\`${report.evidence.decision.path}\`` : '-'}`,
    `- human session: ${report.evidence.human_session ? `\`${report.evidence.human_session.path}\`` : '-'}`,
    `- handoff smoke: \`${report.evidence.handoff_smoke.status}\``,
    `- source file: ${report.evidence.route_profile?.source_file ? `\`${report.evidence.route_profile.source_file}\`` : '-'}`,
    '',
    '## Checks',
    ''
  ];
  report.checks.forEach((item) => lines.push(`- ${item.status}: ${item.label}`));
  lines.push('', '## Outputs', '');
  Object.entries(report.outputs).forEach(([key, value]) => lines.push(`- ${key}: ${value ? `\`${value}\`` : '-'}`));
  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

function check(id, passed, label) {
  return {
    id,
    status: passed ? 'passed' : 'failed',
    label
  };
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
