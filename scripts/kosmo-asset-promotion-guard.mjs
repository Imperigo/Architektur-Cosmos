#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const reviewRoot = resolve(libraryRoot, 'review');
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-promotion-guard.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-promotion-guard.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);

  const library = readJson(libraryPath);
  const reviewPack = readOptionalJson(resolve(reviewRoot, 'asset-review-pack.generated.json'));
  const fullReview = readOptionalJson(resolve(reviewRoot, 'asset-full-review.generated.json'));
  const decisionLedger = readOptionalJson(resolve(reviewRoot, 'asset-decision-ledger.generated.json'));
  const handoffBundle = readOptionalJson(resolve(reviewRoot, 'asset-handoff-bundle.generated.json'));
  const promotionGuard = buildGuard({ library, reviewPack, fullReview, decisionLedger, handoffBundle });

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(promotionGuard, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(promotionGuard), 'utf8');

  console.log('KosmoAsset promotion guard');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Status: ${promotionGuard.status}`);
  console.log(`Promotion allowed: ${promotionGuard.summary.promotion_allowed ? 'yes' : 'no'}`);
  console.log(`Blockers: ${promotionGuard.summary.blocker_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (promotionGuard.status === 'asset_promotion_guard_failed') process.exit(1);
}

function buildGuard({ library, reviewPack, fullReview, decisionLedger, handoffBundle }) {
  const assets = Array.isArray(library.assets) ? library.assets : [];
  const ledgerRows = new Map((decisionLedger?.rows || []).map((row) => [row.asset_id, row]));
  const reviewRows = new Map((reviewPack?.assets || []).map((row) => [row.id, row]));
  const handoffRows = new Map((handoffBundle?.assets || []).map((row) => [row.id, row]));
  const rows = assets.map((asset) => guardRow({
    asset,
    review: reviewRows.get(asset.id),
    ledger: ledgerRows.get(asset.id),
    handoff: handoffRows.get(asset.id)
  }));
  const blockers = [
    ...(!reviewPack ? ['review_pack_missing'] : []),
    ...(!decisionLedger ? ['decision_ledger_missing'] : []),
    ...(library.storage_policy?.uploads_allowed ? ['library_uploads_allowed'] : []),
    ...(library.storage_policy?.public_assets_allowed ? ['library_public_assets_allowed'] : []),
    ...rows.flatMap((row) => row.promotion_blockers.map((blocker) => `${row.asset_id}:${blocker}`))
  ];
  const unsafeFindings = blockers.filter((blocker) => (
    blocker.includes('public_gate_ready_without_certificate')
    || blocker.includes('public_use_allowed_without_public_review')
    || blocker.includes('library_uploads_allowed')
    || blocker.includes('library_public_assets_allowed')
  ));
  const promotionAllowed = blockers.length === 0
    && rows.length > 0
    && rows.every((row) => row.local_certificate_ready && row.public_gate === 'blocked');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-promotion-guard',
    library_path: relative(root, libraryPath),
    library_id: library.library_id || null,
    status: unsafeFindings.length
      ? 'asset_promotion_guard_failed'
      : promotionAllowed
        ? 'asset_promotion_guard_ready_for_owner_review'
        : 'asset_promotion_guard_blocked',
    policy: {
      no_uploads: true,
      no_public_downloads: true,
      no_d1_writes: true,
      no_r2_writes: true,
      promotion_guard_does_not_promote_assets: true,
      public_promotion_requires_separate_owner_review: true,
      public_promotion_requires_public_rights_review: true
    },
    summary: {
      asset_count: rows.length,
      promotion_allowed: promotionAllowed,
      blocker_count: blockers.length,
      unsafe_finding_count: unsafeFindings.length,
      missing_decision_count: decisionLedger?.summary?.missing_decision_count ?? rows.length,
      certificate_ready_count: decisionLedger?.summary?.certificate_ready_count || 0,
      sandbox_ready_count: decisionLedger?.summary?.sandbox_ready_count || 0,
      named_reviewer_count: decisionLedger?.summary?.named_reviewer_count || 0,
      reviewer_blocker_count: decisionLedger?.summary?.reviewer_blocker_count || 0,
      ledger_promotion_blocker_count: decisionLedger?.summary?.promotion_blocker_count ?? null,
      public_ready_count: reviewPack?.summary?.public_ready_count || 0,
      full_review_status: fullReview?.status || null,
      decision_ledger_status: decisionLedger?.status || null,
      recommended_next_step: promotionAllowed
        ? 'owner_review_before_any_public_release'
        : 'keep_assets_local_review_only'
    },
    blockers,
    unsafe_findings: unsafeFindings,
    rows,
    source_reports: {
      review_pack: fileStatus(resolve(reviewRoot, 'asset-review-pack.generated.json')),
      full_review: fileStatus(resolve(reviewRoot, 'asset-full-review.generated.json')),
      decision_ledger: fileStatus(resolve(reviewRoot, 'asset-decision-ledger.generated.json')),
      handoff_bundle: fileStatus(resolve(reviewRoot, 'asset-handoff-bundle.generated.json'))
    },
    next_actions: nextActions({ blockers, promotionAllowed, unsafeFindings })
  };
}

function guardRow({ asset, review, ledger, handoff }) {
  const publicGate = handoff?.public_gate || ledger?.public_gate || 'blocked';
  const publicUseAllowed = asset.public_use_allowed === true;
  const localCertificateReady = ledger?.certificate_ready === true;
  const sandboxReady = ledger?.sandbox_ready === true;
  const fallbackBlockers = [
    ...(!review?.local_ready ? ['local_review_not_ready'] : []),
    ...(!ledger ? ['decision_ledger_row_missing'] : []),
    ...(ledger?.ledger_status === 'missing_decision' ? ['decision_missing'] : []),
    ...(!localCertificateReady ? ['local_certificate_missing'] : []),
    ...(publicUseAllowed ? ['public_use_allowed_without_public_review'] : []),
    ...(publicGate !== 'blocked' && !localCertificateReady ? ['public_gate_ready_without_certificate'] : []),
    ...(sandboxReady && !localCertificateReady ? ['sandbox_ready_without_certificate'] : [])
  ];
  const ledgerBlockers = Array.isArray(ledger?.promotion_blockers) ? ledger.promotion_blockers : [];
  const blockers = unique([
    ...fallbackBlockers,
    ...ledgerBlockers,
    ...(publicUseAllowed ? ['public_use_allowed_without_public_review'] : []),
    ...(publicGate !== 'blocked' && !localCertificateReady ? ['public_gate_ready_without_certificate'] : [])
  ]);

  return {
    asset_id: asset.id,
    asset_title: asset.title,
    asset_type: asset.asset_type,
    rights_status: asset.rights_status,
    review_status: asset.review_status,
    public_use_allowed: publicUseAllowed,
    public_gate: publicGate,
    local_ready: review?.local_ready === true,
    public_ready: review?.public_ready === true,
    decision_status: ledger?.ledger_status || 'missing_ledger',
    human_decision_state: ledger?.human_decision_state || 'needs_more_evidence',
    human_decision_label: ledger?.human_decision_label || 'needs more human evidence',
    reviewer_status: ledger?.reviewer_status || 'missing_ledger',
    reviewer: ledger?.reviewer || null,
    certificate_status: ledger?.certificate_status || (localCertificateReady ? 'asset_local_review_certified' : 'missing_certificate'),
    local_certificate_ready: localCertificateReady,
    sandbox_ready: sandboxReady,
    next_human_action: ledger?.next_human_action || 'run_decision_ledger',
    promotion_status: blockers.length ? 'blocked' : 'ready_for_owner_review',
    promotion_blockers: blockers,
    blockers
  };
}

function nextActions({ blockers, promotionAllowed, unsafeFindings }) {
  if (unsafeFindings.length) {
    return [
      'Fix unsafe public/upload gate findings before running any asset release workflow.',
      'Keep the library local-only and rerun the promotion guard.'
    ];
  }
  if (promotionAllowed) {
    return [
      'Prepare a separate owner-reviewed public rights packet before any public release.',
      'Do not upload to R2 or write D1 until public rights review exists.'
    ];
  }
  return [
    'Keep KosmoAsset in local review-only mode.',
    'Complete human review decisions, local certificates and ledger checks before any sandbox or public promotion.',
    `Current blocker count: ${blockers.length}.`
  ];
}

function renderMarkdown(guard) {
  const lines = [
    '# KosmoAsset Promotion Guard',
    '',
    `Library: \`${guard.library_id}\``,
    `Generated: ${guard.generated_at}`,
    `Status: \`${guard.status}\``,
    '',
    'Promotion guard. This report does not promote assets, upload files, write D1/R2, open public downloads or mutate the library.',
    '',
    '## Summary',
    '',
    `- assets: ${guard.summary.asset_count}`,
    `- promotion allowed: ${guard.summary.promotion_allowed ? 'yes' : 'no'}`,
    `- blockers: ${guard.summary.blocker_count}`,
    `- unsafe findings: ${guard.summary.unsafe_finding_count}`,
    `- missing decisions: ${guard.summary.missing_decision_count}`,
    `- local certificates ready: ${guard.summary.certificate_ready_count}`,
    `- sandbox ready: ${guard.summary.sandbox_ready_count}`,
    `- named reviewers: ${guard.summary.named_reviewer_count}`,
    `- reviewer blockers: ${guard.summary.reviewer_blocker_count}`,
    `- ledger promotion blockers: ${guard.summary.ledger_promotion_blocker_count ?? '-'}`,
    `- public ready: ${guard.summary.public_ready_count}`,
    `- full review: \`${guard.summary.full_review_status || 'missing'}\``,
    `- decision ledger: \`${guard.summary.decision_ledger_status || 'missing'}\``,
    `- recommended next step: \`${guard.summary.recommended_next_step}\``,
    '',
    '## Assets',
    '',
    '| Asset | Decision State | Decision | Reviewer Gate | Certificate | Sandbox | Public Gate | Promotion | Blockers |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'
  ];

  for (const row of guard.rows) {
    lines.push(`| ${escapePipe(row.asset_title)} | ${escapePipe(row.human_decision_state)} | ${escapePipe(row.decision_status)} | ${escapePipe(row.reviewer_status)} | ${escapePipe(row.certificate_status)} | ${row.sandbox_ready ? 'yes' : 'no'} | ${escapePipe(row.public_gate)} | ${escapePipe(row.promotion_status)} | ${escapePipe(row.promotion_blockers.join(', ') || '-')} |`);
  }

  lines.push('', '## Human Gate Detail', '');
  for (const row of guard.rows) {
    lines.push(`### ${row.asset_title}`, '');
    lines.push(`- asset id: \`${row.asset_id}\``);
    lines.push(`- decision state: \`${row.human_decision_state}\` (${row.human_decision_label})`);
    lines.push(`- reviewer: ${row.reviewer ? `\`${row.reviewer}\`` : '-'}`);
    lines.push(`- reviewer gate: \`${row.reviewer_status}\``);
    lines.push(`- certificate: \`${row.certificate_status}\``);
    lines.push(`- next human action: \`${row.next_human_action}\``);
    lines.push(`- promotion blockers: ${row.promotion_blockers.length ? row.promotion_blockers.map((blocker) => `\`${blocker}\``).join(', ') : '-'}`);
    lines.push('');
  }

  lines.push('', '## Blockers', '');
  if (guard.blockers.length) guard.blockers.forEach((blocker) => lines.push(`- ${blocker}`));
  else lines.push('- none');

  lines.push('', '## Next Actions', '');
  guard.next_actions.forEach((action) => lines.push(`- ${action}`));
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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
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
