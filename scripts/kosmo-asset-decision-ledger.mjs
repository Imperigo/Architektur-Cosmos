#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const reviewRoot = resolve(libraryRoot, 'review');
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-decision-ledger.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-decision-ledger.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);

  const library = readJson(libraryPath);
  const humanReviewSession = readOptionalJson(resolve(reviewRoot, 'asset-human-review-session.generated.json'));
  const handoffSmoke = readOptionalJson(resolve(reviewRoot, 'asset-handoff-smoke.generated.json'));
  const decisions = readDecisionFiles();
  const certificates = readCertificateFiles();
  const ledger = buildLedger({ library, humanReviewSession, handoffSmoke, decisions, certificates });

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(ledger), 'utf8');

  console.log('KosmoAsset decision ledger');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Status: ${ledger.status}`);
  console.log(`Recorded decisions: ${ledger.summary.recorded_decision_count}`);
  console.log(`Missing decisions: ${ledger.summary.missing_decision_count}`);
  console.log(`Local approvals: ${ledger.summary.local_approval_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function buildLedger({ library, humanReviewSession, handoffSmoke, decisions, certificates }) {
  const assetById = new Map((library.assets || []).map((asset) => [asset.id, asset]));
  const sessionRows = Array.isArray(humanReviewSession?.assets) ? humanReviewSession.assets : [];
  const expectedRows = sessionRows.length
    ? sessionRows.map((row) => expectedDecisionRow({ row, asset: assetById.get(row.id) }))
    : (library.assets || []).map((asset) => expectedDecisionRow({ row: null, asset }));
  const decisionRows = decisions.map((decision) => decisionRow({ decision, assetById, expectedRows }));
  const certificateRows = certificates.map((certificate) => certificateRow({ certificate, assetById, expectedRows }));
  const rows = expectedRows.map((expected) => {
    const matches = decisionRows
      .filter((decision) => decision.asset_id === expected.asset_id && routeMatches(decision.route, expected.route))
      .sort((a, b) => String(b.generated_at).localeCompare(String(a.generated_at)));
    const certificateMatches = certificateRows
      .filter((certificate) => certificate.asset_id === expected.asset_id && routeMatches(certificate.route, expected.route))
      .sort((a, b) => String(b.generated_at).localeCompare(String(a.generated_at)));
    const latest = matches[0] || null;
    const latestCertificate = certificateMatches[0] || null;
    const currentLedgerStatus = latest ? ledgerStatus(latest) : 'missing_decision';
    const currentReviewerStatus = reviewerStatus(latest);
    const certificateReady = latestCertificate?.status === 'asset_local_review_certified';
    const sandboxReady = Boolean(
      latest?.status === 'local_review_decision_recorded'
      && latest?.decision === 'approve-local'
      && currentReviewerStatus === 'named_human_reviewer_recorded'
      && expected.handoff_smoke_passed
      && certificateReady
    );
    const blockers = promotionBlockers({
      expected,
      latest,
      latestCertificate,
      ledgerStatus: currentLedgerStatus,
      reviewerStatus: currentReviewerStatus,
      certificateReady
    });
    const currentHumanDecisionState = humanDecisionState({ latest, ledgerStatus: currentLedgerStatus });
    return {
      ...expected,
      ledger_status: currentLedgerStatus,
      human_decision_state: currentHumanDecisionState,
      human_decision_label: humanDecisionStateLabel(currentHumanDecisionState),
      latest_decision: latest,
      latest_certificate: latestCertificate,
      decision_count: matches.length,
      certificate_count: certificateMatches.length,
      reviewer_status: currentReviewerStatus,
      reviewer: latest?.reviewer || null,
      certificate_status: latestCertificate?.status || 'missing_certificate',
      certificate_ready: certificateReady,
      sandbox_ready: sandboxReady,
      promotion_blockers: blockers,
      next_human_action: nextHumanAction({
        ledgerStatus: currentLedgerStatus,
        reviewerStatus: currentReviewerStatus,
        certificateReady,
        sandboxReady
      })
    };
  });
  const unmatchedDecisions = decisionRows.filter((decision) => !rows.some((row) => (
    row.asset_id === decision.asset_id && routeMatches(decision.route, row.route)
  )));
  const localApprovals = decisionRows.filter((decision) => decision.status === 'local_review_decision_recorded' && decision.decision === 'approve-local');
  const blockedDecisions = decisionRows.filter((decision) => decision.status === 'decision_blocked' || decision.decision === 'reject');
  const missingRows = rows.filter((row) => row.ledger_status === 'missing_decision');
  const certificateReadyRows = rows.filter((row) => row.certificate_ready);
  const decisionStateCounts = countDecisionStates(rows);
  const status = blockedDecisions.length
    ? 'asset_decision_ledger_blocked'
    : missingRows.length
      ? 'asset_decision_ledger_open'
      : 'asset_decision_ledger_complete';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-decision-ledger',
    library_path: relative(root, libraryPath),
    library_id: library.library_id || null,
    status,
    policy: {
      ledger_does_not_create_decisions: true,
      ledger_does_not_approve_assets: true,
      no_uploads: true,
      no_public_downloads: true,
      no_d1_writes: true,
      no_r2_writes: true,
      public_gate_remains_blocked: true
    },
    summary: {
      expected_decision_count: rows.length,
      recorded_decision_count: decisionRows.length,
      missing_decision_count: missingRows.length,
      local_approval_count: localApprovals.length,
      needs_review_count: decisionRows.filter((decision) => decision.decision === 'needs-review').length,
      block_public_count: decisionRows.filter((decision) => decision.decision === 'block-public').length,
      rejected_count: decisionRows.filter((decision) => decision.decision === 'reject').length,
      blocked_decision_count: blockedDecisions.length,
      sandbox_ready_count: rows.filter((row) => row.sandbox_ready).length,
      certificate_count: certificateRows.length,
      certificate_ready_count: certificateReadyRows.length,
      approved_state_count: decisionStateCounts.approved || 0,
      blocked_state_count: decisionStateCounts.blocked || 0,
      rejected_state_count: decisionStateCounts.rejected || 0,
      needs_more_evidence_state_count: decisionStateCounts.needs_more_evidence || 0,
      named_reviewer_count: rows.filter((row) => row.reviewer_status === 'named_human_reviewer_recorded').length,
      reviewer_blocker_count: rows.filter((row) => row.reviewer_status === 'missing_named_human_reviewer').length,
      promotion_blocker_count: rows.reduce((sum, row) => sum + row.promotion_blockers.length, 0),
      handoff_smoke_passed: handoffSmoke?.summary?.failure_count === 0,
      certificate_ready: rows.length > 0 && certificateReadyRows.length === rows.length,
      recommended_next_step: missingRows.length
        ? 'record_or_defer_explicit_human_decisions'
        : certificateReadyRows.length
          ? 'use_certified_assets_only_in_local_sandbox'
          : 'create_local_review_certificates_before_any_sandbox_generation'
    },
    source_reports: {
      human_review_session: fileStatus(resolve(reviewRoot, 'asset-human-review-session.generated.json')),
      handoff_smoke: fileStatus(resolve(reviewRoot, 'asset-handoff-smoke.generated.json'))
    },
    rows,
    unmatched_decisions: unmatchedDecisions,
    next_actions: nextActions({ missingRows, localApprovals, blockedDecisions, certificateReadyRows })
  };
}

function expectedDecisionRow({ row, asset }) {
  const route = row?.primary_route || primaryRouteForAsset(asset) || 'all';
  return {
    asset_id: row?.id || asset?.id || 'unknown',
    asset_title: row?.title || asset?.title || 'Unknown asset',
    asset_type: row?.asset_type || asset?.asset_type || 'unknown',
    route,
    review_priority: row?.review_priority || 'unknown',
    human_review_status: row?.human_review_status || 'open',
    suggested_decision: row?.suggested_decision || 'needs-review',
    public_gate: row?.public_gate || 'blocked',
    handoff_smoke_passed: row?.machine_evidence?.handoff_smoke_passed === true,
    public_use_allowed: Boolean(row?.public_use_allowed || asset?.public_use_allowed),
    expected_command: `npm run kosmo:asset-review-decision -- --library ${relative(root, libraryPath)} --asset ${row?.id || asset?.id || 'unknown'} --route ${route} --decision needs-review`
  };
}

function decisionRow({ decision, assetById, expectedRows }) {
  const asset = assetById.get(decision.asset_id);
  const expected = expectedRows.find((row) => row.asset_id === decision.asset_id && routeMatches(decision.route, row.route));
  return {
    asset_id: decision.asset_id,
    asset_title: decision.asset_title || asset?.title || decision.asset_id,
    route: decision.route || 'all',
    decision: decision.decision || 'unknown',
    reviewer: decision.reviewer || null,
    status: decision.status || 'unknown',
    generated_at: decision.generated_at || null,
    public_gate_remains_blocked: decision.policy?.public_gate_remains_blocked === true,
    smoke_passed: decision.evidence?.smoke_passed === true,
    route_available: decision.evidence?.route_available === true,
    blocker_count: Array.isArray(decision.blockers) ? decision.blockers.length : 0,
    file: decision.__file,
    markdown: decision.__markdown,
    expected_route: expected?.route || null,
    ledger_note: decisionLedgerNote(decision)
  };
}

function certificateRow({ certificate, assetById, expectedRows }) {
  const asset = assetById.get(certificate.asset_id);
  const expected = expectedRows.find((row) => row.asset_id === certificate.asset_id && routeMatches(certificate.route, row.route));
  return {
    asset_id: certificate.asset_id,
    asset_title: certificate.asset_title || asset?.title || certificate.asset_id,
    route: certificate.route || 'all',
    status: certificate.status || 'unknown',
    generated_at: certificate.generated_at || null,
    certificate_id: certificate.certificate_id || null,
    failed_checks: certificate.summary?.failed_checks ?? null,
    public_gate: certificate.summary?.public_gate || null,
    file: certificate.__file,
    markdown: certificate.__markdown,
    expected_route: expected?.route || null
  };
}

function ledgerStatus(decision) {
  if (decision.status === 'decision_blocked') return 'blocked_decision';
  if (decision.decision === 'approve-local' && decision.status === 'local_review_decision_recorded') return 'local_approval_recorded';
  if (decision.decision === 'needs-review') return 'needs_review_recorded';
  if (decision.decision === 'block-public') return 'public_block_recorded';
  if (decision.decision === 'reject') return 'rejected';
  return 'decision_recorded';
}

function humanDecisionState({ latest, ledgerStatus }) {
  if (!latest || ledgerStatus === 'missing_decision') return 'needs_more_evidence';
  if (ledgerStatus === 'local_approval_recorded') return 'approved';
  if (ledgerStatus === 'public_block_recorded' || ledgerStatus === 'blocked_decision') return 'blocked';
  if (ledgerStatus === 'rejected') return 'rejected';
  return 'needs_more_evidence';
}

function humanDecisionStateLabel(state) {
  const labels = {
    approved: 'local human approval recorded',
    blocked: 'public or route gate blocked',
    rejected: 'rejected for exchange use',
    needs_more_evidence: 'needs more human evidence'
  };
  return labels[state] || state;
}

function countDecisionStates(rows) {
  return rows.reduce((counts, row) => {
    counts[row.human_decision_state] = (counts[row.human_decision_state] || 0) + 1;
    return counts;
  }, {});
}

function reviewerStatus(decision) {
  if (!decision) return 'missing_decision';
  if (decision.decision !== 'approve-local' && decision.decision !== 'reject') return 'not_required_for_note';
  return hasNamedHumanReviewer(decision.reviewer)
    ? 'named_human_reviewer_recorded'
    : 'missing_named_human_reviewer';
}

function promotionBlockers({ expected, latest, latestCertificate, ledgerStatus, reviewerStatus, certificateReady }) {
  const blockers = [];
  if (!latest) blockers.push('decision_missing');
  else if (ledgerStatus === 'blocked_decision') blockers.push('decision_blocked');
  else if (ledgerStatus === 'rejected') blockers.push('asset_route_rejected');
  else if (latest.decision !== 'approve-local') blockers.push('local_approval_missing');
  if (reviewerStatus === 'missing_named_human_reviewer') blockers.push('named_reviewer_missing');
  if (!certificateReady) blockers.push('local_certificate_missing');
  if (latest && latest.public_gate_remains_blocked !== true) blockers.push('public_gate_not_confirmed_blocked');
  if (!expected.handoff_smoke_passed) blockers.push('handoff_smoke_not_passed');
  if (latestCertificate && latestCertificate.failed_checks !== 0) blockers.push('certificate_failed_checks');
  return blockers;
}

function nextHumanAction({ ledgerStatus, reviewerStatus, certificateReady, sandboxReady }) {
  if (ledgerStatus === 'missing_decision') return 'record_or_defer_human_decision';
  if (ledgerStatus === 'blocked_decision') return 'resolve_blocked_decision_file';
  if (ledgerStatus === 'needs_review_recorded') return 'continue_manual_review';
  if (ledgerStatus === 'public_block_recorded') return 'keep_public_gate_blocked';
  if (reviewerStatus === 'missing_named_human_reviewer') return 'record_named_human_reviewer';
  if (!certificateReady) return 'create_local_review_certificate';
  if (!sandboxReady) return 'keep_review_only_until_sandbox_gate_is_ready';
  return 'certified_local_sandbox_candidate';
}

function decisionLedgerNote(decision) {
  if (decision.status === 'decision_blocked') return 'Decision file exists but is blocked; do not use it for sandbox generation.';
  if (decision.decision === 'approve-local') return 'Local-only approval evidence; public gate must remain blocked.';
  if (decision.decision === 'block-public') return 'Public use remains blocked for this route.';
  if (decision.decision === 'reject') return 'Asset route is rejected for exchange use.';
  return 'Manual review remains open or deferred.';
}

function hasNamedHumanReviewer(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.length < 3) return false;
  if (normalized.includes('replace_with')) return false;
  return !new Set(['owner', 'reviewer', 'reviewer name', 'unknown', 'tbd', 'n/a', 'na']).has(normalized);
}

function primaryRouteForAsset(asset) {
  if (!asset) return 'all';
  if (asset.export_targets?.includes('blender')) return 'blender';
  if (asset.export_targets?.includes('archicad')) return 'archicad';
  if (asset.export_targets?.includes('web')) return 'web';
  if (asset.formats?.some((format) => format.format === 'dxf')) return 'dxf';
  if (asset.formats?.some((format) => format.format === 'glb')) return 'glb';
  if (asset.formats?.some((format) => format.format === 'svg')) return 'svg';
  return 'all';
}

function routeMatches(decisionRoute, expectedRoute) {
  return decisionRoute === expectedRoute || decisionRoute === 'all' || expectedRoute === 'all';
}

function readDecisionFiles() {
  if (!existsSync(reviewRoot)) return [];
  return readdirSync(reviewRoot)
    .filter((filename) => filename.startsWith('asset-review-decision-') && filename.endsWith('.generated.json'))
    .map((filename) => {
      const pathname = resolve(reviewRoot, filename);
      const decision = readJson(pathname);
      return {
        ...decision,
        __file: relative(root, pathname),
        __markdown: relative(root, pathname.replace(/\.json$/, '.md'))
      };
    });
}

function readCertificateFiles() {
  if (!existsSync(reviewRoot)) return [];
  return readdirSync(reviewRoot)
    .filter((filename) => filename.startsWith('asset-review-certificate-') && filename.endsWith('.generated.json'))
    .map((filename) => {
      const pathname = resolve(reviewRoot, filename);
      const certificate = readJson(pathname);
      return {
        ...certificate,
        __file: relative(root, pathname),
        __markdown: relative(root, pathname.replace(/\.json$/, '.md'))
      };
    });
}

function nextActions({ missingRows, localApprovals, blockedDecisions, certificateReadyRows }) {
  const actions = [];
  if (missingRows.length) actions.push('Finish or explicitly defer the open human review rows before creating Blender/ArchiCAD sandbox outputs.');
  if (localApprovals.length) actions.push('Sandbox generation is only allowed for local approvals with passed smoke and blocked public gates.');
  if (localApprovals.length && !certificateReadyRows.length) actions.push('Create local review certificates before treating approvals as sandbox-ready.');
  if (certificateReadyRows.length) actions.push('Use certified assets only in copied local sandbox files; keep public gates blocked.');
  if (blockedDecisions.length) actions.push('Resolve blocked/rejected decision files before using this asset library for exchange workflows.');
  actions.push('Keep public downloads, R2 uploads and D1 writes disabled.');
  if (!missingRows.length && !blockedDecisions.length) actions.push('Archive this ledger as local decision evidence.');
  return actions;
}

function renderMarkdown(ledger) {
  const lines = [
    '# KosmoAsset Decision Ledger',
    '',
    `Library: \`${ledger.library_id}\``,
    `Generated: ${ledger.generated_at}`,
    `Status: \`${ledger.status}\``,
    '',
    'Local audit ledger. This file reads decision evidence only; it does not create approvals, mutate assets, upload, publish, write D1/R2 or open public gates.',
    '',
    '## Summary',
    '',
    `- expected decisions: ${ledger.summary.expected_decision_count}`,
    `- recorded decisions: ${ledger.summary.recorded_decision_count}`,
    `- missing decisions: ${ledger.summary.missing_decision_count}`,
    `- local approvals: ${ledger.summary.local_approval_count}`,
    `- needs-review notes: ${ledger.summary.needs_review_count}`,
    `- public blocks: ${ledger.summary.block_public_count}`,
    `- rejected: ${ledger.summary.rejected_count}`,
    `- blocked decision files: ${ledger.summary.blocked_decision_count}`,
    `- state approved: ${ledger.summary.approved_state_count}`,
    `- state blocked: ${ledger.summary.blocked_state_count}`,
    `- state rejected: ${ledger.summary.rejected_state_count}`,
    `- state needs more evidence: ${ledger.summary.needs_more_evidence_state_count}`,
    `- sandbox ready: ${ledger.summary.sandbox_ready_count}`,
    `- certificates: ${ledger.summary.certificate_ready_count}/${ledger.summary.certificate_count}`,
    `- named reviewers: ${ledger.summary.named_reviewer_count}`,
    `- reviewer blockers: ${ledger.summary.reviewer_blocker_count}`,
    `- promotion blockers: ${ledger.summary.promotion_blocker_count}`,
    `- all certificates ready: ${ledger.summary.certificate_ready ? 'yes' : 'no'}`,
    `- recommended next step: \`${ledger.summary.recommended_next_step}\``,
    '',
    '## Expected Rows',
    '',
    '| Asset | Route | Decision State | Ledger Status | Decision | Reviewer Gate | Certificate | Sandbox | Blockers |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'
  ];

  for (const row of ledger.rows) {
    const latest = row.latest_decision ? `${row.latest_decision.decision}/${row.latest_decision.status}` : '-';
    const reviewer = row.reviewer ? `${row.reviewer} (${row.reviewer_status})` : row.reviewer_status;
    const blockers = row.promotion_blockers.length ? row.promotion_blockers.join(', ') : '-';
    lines.push(`| ${escapePipe(row.asset_title)} | ${escapePipe(row.route)} | ${escapePipe(row.human_decision_state)} | ${escapePipe(row.ledger_status)} | ${escapePipe(latest)} | ${escapePipe(reviewer)} | ${escapePipe(row.certificate_status)} | ${row.sandbox_ready ? 'yes' : 'no'} | ${escapePipe(blockers)} |`);
  }

  lines.push('', '## Human Gate Detail', '');
  for (const row of ledger.rows) {
    lines.push(`### ${row.asset_title}`, '');
    lines.push(`- asset id: \`${row.asset_id}\``);
    lines.push(`- route: \`${row.route}\``);
    lines.push(`- decision state: \`${row.human_decision_state}\` (${row.human_decision_label})`);
    lines.push(`- reviewer: ${row.reviewer ? `\`${row.reviewer}\`` : '-'}`);
    lines.push(`- reviewer gate: \`${row.reviewer_status}\``);
    lines.push(`- certificate: \`${row.certificate_status}\``);
    lines.push(`- sandbox ready: ${row.sandbox_ready ? 'yes' : 'no'}`);
    lines.push(`- promotion blockers: ${row.promotion_blockers.length ? row.promotion_blockers.map((blocker) => `\`${blocker}\``).join(', ') : '-'}`);
    lines.push(`- next human action: \`${row.next_human_action}\``);
    if (row.latest_decision?.ledger_note) lines.push(`- ledger note: ${row.latest_decision.ledger_note}`);
    lines.push('');
  }

  if (ledger.unmatched_decisions.length) {
    lines.push('', '## Unmatched Decisions', '');
    for (const decision of ledger.unmatched_decisions) {
      lines.push(`- ${decision.asset_id}/${decision.route}: \`${decision.decision}\` from \`${decision.file}\``);
    }
  }

  lines.push('', '## Missing Decision Commands', '');
  const missing = ledger.rows.filter((row) => row.ledger_status === 'missing_decision');
  if (missing.length) {
    for (const row of missing) lines.push(`- ${row.asset_title}: \`${row.expected_command}\``);
  } else {
    lines.push('- none');
  }

  lines.push('', '## Next Actions', '');
  ledger.next_actions.forEach((action) => lines.push(`- ${action}`));
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
