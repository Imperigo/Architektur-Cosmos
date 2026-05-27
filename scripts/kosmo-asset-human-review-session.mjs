#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-human-review-session.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-human-review-session.generated.md');
const commandReviewer = String(args.reviewer || args['reviewed-by'] || '').trim();

const publicSafeRights = new Set(['licensed', 'public_domain', 'own_work']);
const reviewedStatuses = new Set(['reviewed', 'verified']);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);

  const library = readJson(libraryPath);
  const reviewPack = readOptionalJson(resolve(libraryRoot, 'review/asset-review-pack.generated.json'));
  const exportPlan = readOptionalJson(resolve(libraryRoot, 'review/asset-export-plan.generated.json'));
  const exchangeProfile = readOptionalJson(resolve(libraryRoot, 'review/asset-exchange-profile.generated.json'));
  const handoffBundle = readOptionalJson(resolve(libraryRoot, 'review/asset-handoff-bundle.generated.json'));
  const handoffSmoke = readOptionalJson(resolve(libraryRoot, 'review/asset-handoff-smoke.generated.json'));
  const session = buildSession({ library, reviewPack, exportPlan, exchangeProfile, handoffBundle, handoffSmoke });

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(session), 'utf8');

  console.log('KosmoAsset human review session');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Status: ${session.status}`);
  console.log(`Open items: ${session.summary.open_item_count}`);
  console.log(`Smoke passed: ${session.summary.handoff_smoke_passed ? 'yes' : 'no'}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function buildSession({ library, reviewPack, exportPlan, exchangeProfile, handoffBundle, handoffSmoke }) {
  const assets = Array.isArray(library.assets) ? library.assets : [];
  const reviewRows = new Map((reviewPack?.assets || []).map((asset) => [asset.id, asset]));
  const exportRows = new Map((exportPlan?.assets || []).map((asset) => [asset.id, asset]));
  const exchangeRows = new Map((exchangeProfile?.assets || []).map((asset) => [asset.id, asset]));
  const handoffRows = new Map((handoffBundle?.assets || []).map((asset) => [asset.id, asset]));
  const rows = assets.map((asset) => sessionAssetRow({
    asset,
    review: reviewRows.get(asset.id),
    exportPlan: exportRows.get(asset.id),
    exchange: exchangeRows.get(asset.id),
    handoff: handoffRows.get(asset.id),
    handoffSmoke
  }));
  const openRows = rows.filter((asset) => asset.human_review_status === 'open');
  const blockedRows = rows.filter((asset) => asset.blockers.length > 0);
  const smokePassed = handoffSmoke?.summary?.failure_count === 0;

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-human-review-session',
    library_path: relative(root, libraryPath),
    library_id: library.library_id || null,
    status: blockedRows.length
      ? 'asset_human_review_session_blocked'
      : openRows.length
        ? 'asset_human_review_session_open'
        : 'asset_human_review_session_complete',
    rights_scope: library.rights_scope || 'unknown',
    policy: {
      no_uploads: true,
      no_public_downloads: true,
      no_d1_writes: true,
      no_r2_writes: true,
      session_does_not_approve_assets: true,
      session_does_not_mutate_library: true,
      approve_local_requires_explicit_human_command: true,
      certificate_status_is_not_certified: true
    },
    summary: {
      asset_count: rows.length,
      open_item_count: openRows.length,
      blocked_item_count: blockedRows.length,
      local_ready_count: rows.filter((asset) => asset.local_ready).length,
      public_ready_count: rows.filter((asset) => asset.public_ready).length,
      handoff_smoke_passed: smokePassed,
      generated_profile_count: rows.reduce((sum, asset) => sum + asset.generated_profile_count, 0),
      recommended_next_step: openRows.length
        ? 'complete_asset_human_review_session_before_approval_commands'
        : 'archive_session_as_local_review_evidence'
    },
    source_reports: {
      review_pack: fileStatus(resolve(libraryRoot, 'review/asset-review-pack.generated.json')),
      export_plan: fileStatus(resolve(libraryRoot, 'review/asset-export-plan.generated.json')),
      exchange_profile: fileStatus(resolve(libraryRoot, 'review/asset-exchange-profile.generated.json')),
      handoff_bundle: fileStatus(resolve(libraryRoot, 'review/asset-handoff-bundle.generated.json')),
      handoff_smoke: fileStatus(resolve(libraryRoot, 'review/asset-handoff-smoke.generated.json'))
    },
    decision_taxonomy: decisionTaxonomy(),
    certificate_seed: {
      status: 'not_certified',
      note: 'This session is evidence for later Architecture Kosmos quality certification, but it does not certify the asset yet.',
      required_before_certificate: [
        'named human reviewer',
        'asset and route decision',
        'rights-source confirmation',
        'local file inspection',
        'handoff smoke check',
        'public gate decision'
      ]
    },
    assets: rows,
    next_actions: nextActions({ openRows, blockedRows, smokePassed })
  };
}

function sessionAssetRow({ asset, review, exportPlan, exchange, handoff, handoffSmoke }) {
  const routes = availableRoutes({ asset, exportPlan, exchange, handoff });
  const primaryRoute = routes[0] || 'all';
  const humanReviewStatus = review?.human_review_status || (reviewedStatuses.has(asset.review_status) ? 'closed' : 'open');
  const publicReady = Boolean(review?.public_ready);
  const localReady = Boolean(review?.local_ready);
  const smokePassed = handoffSmoke?.summary?.failure_count === 0;
  const generatedProfileCount = Array.isArray(review?.generated_profiles)
    ? review.generated_profiles.length
    : generatedAssetProfiles(asset).length;
  const blockers = [
    ...(!localReady ? ['local_files_or_library_check_missing'] : []),
    ...(!routes.length ? ['no_review_route_available'] : []),
    ...(!smokePassed ? ['handoff_smoke_not_passed'] : [])
  ];
  const humanChecklist = [
    humanCheck('source_basis_read', 'Source basis was read and is plausible for local review.'),
    humanCheck('rights_risk_checked', 'Rights status and public gate were checked by a human.'),
    humanCheck('local_file_opened', 'At least one local file/profile was opened or inspected.'),
    humanCheck('scale_origin_layer_checked', 'Scale, origin, naming and layer/surface mapping were checked.'),
    humanCheck('ai_slop_risk_checked', 'Reviewer checked whether the asset is generic, coherent and not low-quality AI output.'),
    humanCheck('route_decision_ready', `Reviewer can choose a route decision for ${primaryRoute}.`)
  ];

  return {
    id: asset.id,
    title: asset.title,
    asset_type: asset.asset_type,
    category: asset.category,
    rights_status: asset.rights_status,
    review_status: asset.review_status,
    human_review_status: humanReviewStatus,
    public_use_allowed: Boolean(asset.public_use_allowed),
    public_ready: publicReady,
    local_ready: localReady,
    public_gate: handoff?.public_gate || exchange?.public_gate || 'blocked',
    suggested_decision: review?.suggested_decision || suggestedDecision({ asset, publicReady }),
    review_priority: reviewPriority({ asset, localReady, publicReady, humanReviewStatus }),
    routes,
    primary_route: primaryRoute,
    generated_profile_count: generatedProfileCount,
    machine_evidence: {
      review_pack_status: review ? 'available' : 'missing',
      export_route_summary: routeSummary(exportPlan?.routes || []),
      blender_profile: Boolean(exchange?.blender || handoff?.blender),
      archicad_profile: Boolean(exchange?.archicad || handoff?.archicad),
      web_profile: Boolean(exchange?.web || handoff?.web),
      handoff_smoke_status: handoffSmoke?.status || 'missing',
      handoff_smoke_passed: smokePassed
    },
    human_session: {
      reviewer: null,
      reviewed_at: null,
      proposed_state: humanReviewStatus === 'open' ? 'needs_more_evidence' : 'approved',
      proposed_decision: humanReviewStatus === 'open' ? 'needs-review' : 'no_action',
      final_decision_recorded: false,
      notes: '',
      checklist: humanChecklist
    },
    decision_options: decisionOptions({ asset, primaryRoute, publicReady }),
    commands: decisionCommands({ asset, primaryRoute }),
    blockers
  };
}

function availableRoutes({ asset, exportPlan, exchange, handoff }) {
  const routes = new Set();
  if (handoff?.blender || exchange?.blender) routes.add('blender');
  if (handoff?.archicad || exchange?.archicad) routes.add('archicad');
  if (exchange?.web || asset.export_targets?.includes('web')) routes.add('web');
  for (const route of exportPlan?.routes || []) {
    if (route.status !== 'blocked') routes.add(route.target);
  }
  for (const target of asset.export_targets || []) routes.add(target);
  for (const format of asset.formats || []) routes.add(format.format);
  return [...routes].filter((route) => route !== 'layout' && route !== 'cad').slice(0, 5);
}

function decisionOptions({ asset, primaryRoute, publicReady }) {
  return [
    {
      decision: 'needs-review',
      state: 'needs_more_evidence',
      when: 'default while the human checklist is still open',
      effect: 'records a local note only; no approval and no public use'
    },
    {
      decision: 'approve-local',
      state: 'approved',
      when: `only after a human reviewer inspected ${asset.title} for route ${primaryRoute}`,
      effect: 'records local route evidence; still no public gate and no upload'
    },
    {
      decision: 'block-public',
      state: 'blocked',
      when: publicReady ? 'if public release should remain blocked despite local readiness' : 'default for generated or unclear rights',
      effect: 'keeps web/download/R2 gates closed'
    },
    {
      decision: 'reject',
      state: 'rejected',
      when: 'if quality, rights, source basis or export mapping are not acceptable',
      effect: 'keeps the asset out of exchange workflows'
    }
  ];
}

function decisionTaxonomy() {
  return [
    {
      state: 'approved',
      command_decision: 'approve-local',
      label: 'Local human approval recorded',
      meaning: 'A named human reviewer accepted this asset/route for local sandbox evidence only.',
      guard: 'Public gate stays blocked and a local review certificate is still required before sandbox-ready status.'
    },
    {
      state: 'needs_more_evidence',
      command_decision: 'needs-review',
      label: 'Needs more evidence',
      meaning: 'The asset remains in human review because source, rights, file, scale, layer or quality checks are not complete.',
      guard: 'No sandbox, public gate or publication can be inferred from this note.'
    },
    {
      state: 'blocked',
      command_decision: 'block-public',
      label: 'Public use blocked',
      meaning: 'The reviewer explicitly keeps web/download/R2 release closed.',
      guard: 'Local metadata may remain visible for review; public use needs a separate rights and owner review.'
    },
    {
      state: 'rejected',
      command_decision: 'reject',
      label: 'Rejected for exchange use',
      meaning: 'The asset/route is not acceptable for exchange workflows.',
      guard: 'Keep it out of Blender, ArchiCAD and public promotion paths until a new review replaces this decision.'
    }
  ];
}

function decisionCommands({ asset, primaryRoute }) {
  const library = relative(root, libraryPath);
  const reviewer = commandReviewer || 'REPLACE_WITH_REVIEWER_NAME';
  const reviewerFlag = ` --reviewer ${shellQuote(reviewer)}`;
  return {
    record_needs_review: `npm run kosmo:asset-review-decision -- --library ${library} --asset ${asset.id} --route ${primaryRoute} --decision needs-review`,
    record_local_approval: `npm run kosmo:asset-review-decision -- --library ${library} --asset ${asset.id} --route ${primaryRoute} --decision approve-local --confirm-human-review${reviewerFlag}`,
    keep_public_blocked: `npm run kosmo:asset-review-decision -- --library ${library} --asset ${asset.id} --route ${primaryRoute} --decision block-public`
  };
}

function suggestedDecision({ asset, publicReady }) {
  if (publicReady) return 'eligible_for_public_release_review';
  if (reviewedStatuses.has(asset.review_status)) return 'keep_reviewed_local_only';
  if (!publicSafeRights.has(asset.rights_status)) return 'complete_human_review_before_promotion';
  return 'needs_human_review_before_local_approval';
}

function reviewPriority({ asset, localReady, publicReady, humanReviewStatus }) {
  if (humanReviewStatus !== 'open') return 'closed';
  if (!localReady) return 'blocked';
  if (asset.rights_status === 'generated_needs_review') return 'high';
  if (!publicReady && asset.public_use_allowed === false) return 'normal';
  return 'normal';
}

function humanCheck(id, label) {
  return {
    id,
    label,
    status: 'pending_human_review'
  };
}

function generatedAssetProfiles(asset) {
  return [asset.generated_asset_profile, ...(Array.isArray(asset.generated_asset_profiles) ? asset.generated_asset_profiles : [])]
    .filter(Boolean)
    .filter((profile, index, rows) => rows.findIndex((candidate) => (
      candidate.generator === profile.generator && candidate.status === profile.status
    )) === index);
}

function routeSummary(routes) {
  if (!Array.isArray(routes) || !routes.length) return [];
  return routes.map((route) => ({
    target: route.target,
    status: route.status,
    blockers: Array.isArray(route.blockers) ? route.blockers : []
  }));
}

function nextActions({ openRows, blockedRows, smokePassed }) {
  const actions = [];
  if (!smokePassed) actions.push('Run kosmo:asset-handoff-smoke before local route approval.');
  if (blockedRows.length) actions.push('Resolve blocked session rows before any approve-local command.');
  if (openRows.length) {
    actions.push('Open local asset files/profiles and complete the human checklist for every open row.');
    actions.push('Record only explicit human decisions with kosmo:asset-review-decision.');
  }
  actions.push('Keep public downloads, R2 uploads and D1 writes disabled.');
  if (!openRows.length && !blockedRows.length) actions.push('Archive this session as local review evidence.');
  return actions;
}

function renderMarkdown(session) {
  const lines = [
    '# KosmoAsset Human Review Session',
    '',
    `Library: \`${session.library_id}\``,
    `Generated: ${session.generated_at}`,
    `Status: \`${session.status}\``,
    '',
    'Editable local human-review session. This file does not approve assets, does not certify quality, does not upload, publish, write D1/R2 or open public gates.',
    '',
    '## Summary',
    '',
    `- assets: ${session.summary.asset_count}`,
    `- open items: ${session.summary.open_item_count}`,
    `- blocked items: ${session.summary.blocked_item_count}`,
    `- local ready: ${session.summary.local_ready_count}`,
    `- public ready: ${session.summary.public_ready_count}`,
    `- handoff smoke passed: ${session.summary.handoff_smoke_passed ? 'yes' : 'no'}`,
    `- generated profiles: ${session.summary.generated_profile_count}`,
    `- recommended next step: \`${session.summary.recommended_next_step}\``,
    '',
    '## Certificate Seed',
    '',
    `- status: \`${session.certificate_seed.status}\``,
    `- note: ${session.certificate_seed.note}`,
    '',
    '## Decision States',
    '',
    '| State | Command | Meaning | Guard |',
    '| --- | --- | --- | --- |'
  ];

  for (const item of session.decision_taxonomy) {
    lines.push(`| ${escapePipe(item.state)} | \`${item.command_decision}\` | ${escapePipe(item.meaning)} | ${escapePipe(item.guard)} |`);
  }

  lines.push(
    '',
    '## Review Rows',
    '',
    '| Asset | Priority | Human Review | Route | Rights | Suggested Decision | Blockers |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  );

  for (const asset of session.assets) {
    lines.push(`| ${escapePipe(asset.title)} | ${asset.review_priority} | ${asset.human_review_status} | ${asset.primary_route} | ${escapePipe(asset.rights_status)} | ${escapePipe(asset.suggested_decision)} | ${escapePipe(asset.blockers.join(', ') || '-')} |`);
  }

  for (const asset of session.assets) {
    lines.push('', `## ${asset.title}`, '');
    lines.push(`- asset id: \`${asset.id}\``);
    lines.push(`- primary route: \`${asset.primary_route}\``);
    lines.push(`- local ready: ${asset.local_ready ? 'yes' : 'no'}`);
    lines.push(`- public gate: \`${asset.public_gate}\``);
    lines.push(`- handoff smoke: \`${asset.machine_evidence.handoff_smoke_status}\``);
    lines.push('', 'Human checklist:');
    for (const item of asset.human_session.checklist) lines.push(`- [ ] ${item.label}`);
    lines.push('', 'Decision commands:');
    Object.entries(asset.commands).forEach(([key, value]) => lines.push(`- ${key}: \`${value}\``));
  }

  lines.push('', '## Next Actions', '');
  session.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

function fileStatus(pathname) {
  return {
    path: relative(root, pathname),
    exists: existsSync(pathname)
  };
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function readOptionalJson(pathname) {
  if (!existsSync(pathname)) return null;
  return readJson(pathname);
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function shellQuote(value) {
  return `"${String(value).replace(/(["\\$`])/g, '\\$1')}"`;
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
