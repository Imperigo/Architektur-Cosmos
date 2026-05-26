#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const assetId = String(args.asset || 'warm-concrete-material-001').trim();
const route = String(args.route || 'blender').trim();
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-certificate-smoke.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-certificate-smoke.generated.md');
const decisionPath = resolve(libraryRoot, `review/asset-review-decision-${assetId}-${route}.generated.json`);
const decisionMdPath = resolve(libraryRoot, `review/asset-review-decision-${assetId}-${route}.generated.md`);
const certificatePath = resolve(libraryRoot, `review/asset-review-certificate-${assetId}-${route}.generated.json`);
const certificateMdPath = resolve(libraryRoot, `review/asset-review-certificate-${assetId}-${route}.generated.md`);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);

  removeTempArtifacts();
  const steps = [
    runStep('review_decision', ['run', 'kosmo:asset-review-decision', '--', '--library', relative(root, libraryPath), '--asset', assetId, '--route', route, '--decision', 'approve-local', '--confirm-human-review']),
    runStep('review_certificate', ['run', 'kosmo:asset-review-certificate', '--', '--library', relative(root, libraryPath), '--asset', assetId, '--route', route]),
    runStep('decision_ledger_with_certificate', ['run', 'kosmo:asset-decision-ledger', '--', '--library', relative(root, libraryPath)])
  ];

  const decision = readOptionalJson(decisionPath);
  const certificate = readOptionalJson(certificatePath);
  const ledgerWithCertificate = readOptionalJson(resolve(libraryRoot, 'review/asset-decision-ledger.generated.json'));
  removeTempArtifacts();
  const cleanupLedgerStep = runStep('decision_ledger_after_cleanup', ['run', 'kosmo:asset-decision-ledger', '--', '--library', relative(root, libraryPath)]);
  steps.push(cleanupLedgerStep);

  const report = buildSmokeReport({ steps, decision, certificate, ledgerWithCertificate });

  await Promise.all([mkdir(dirname(outputJsonPath), { recursive: true }), mkdir(dirname(outputMdPath), { recursive: true })]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoAsset certificate smoke');
  console.log(`Asset: ${assetId}`);
  console.log(`Route: ${route}`);
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'asset_certificate_smoke_passed') process.exit(1);
}

function buildSmokeReport({ steps, decision, certificate, ledgerWithCertificate }) {
  const ledgerRow = (ledgerWithCertificate?.rows || []).find((row) => row.asset_id === assetId && routeMatches(row.route, route));
  const checks = [
    check('decision_step_passed', stepPassed(steps, 'review_decision'), 'Temporary local review decision command passed.'),
    check('certificate_step_passed', stepPassed(steps, 'review_certificate'), 'Temporary review certificate command passed.'),
    check('ledger_step_passed', stepPassed(steps, 'decision_ledger_with_certificate'), 'Decision ledger reads temporary certificate.'),
    check('cleanup_ledger_step_passed', stepPassed(steps, 'decision_ledger_after_cleanup'), 'Decision ledger reruns after cleanup.'),
    check('decision_recorded', decision?.status === 'local_review_decision_recorded', `Decision status was ${decision?.status || 'missing'}.`),
    check('certificate_certified', certificate?.status === 'asset_local_review_certified', `Certificate status was ${certificate?.status || 'missing'}.`),
    check('certificate_checks_passed', certificate?.summary?.failed_checks === 0, `Certificate failed checks: ${certificate?.summary?.failed_checks ?? 'missing'}.`),
    check('ledger_saw_certificate', ledgerRow?.latest_certificate?.status === 'asset_local_review_certified', 'Ledger saw certified local review row before cleanup.'),
    check('temp_decision_cleaned', !existsSync(decisionPath) && !existsSync(decisionMdPath), 'Temporary decision files were removed.'),
    check('temp_certificate_cleaned', !existsSync(certificatePath) && !existsSync(certificateMdPath), 'Temporary certificate files were removed.'),
    check('public_gate_blocked', certificate?.summary?.public_gate === 'blocked', 'Public gate remained blocked during certificate smoke.'),
    check('no_uploads', certificate?.policy?.no_uploads === true && certificate?.policy?.no_r2_writes === true, 'Certificate policy disallows uploads and R2 writes.')
  ];
  const failedChecks = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-certificate-smoke',
    library_path: relative(root, libraryPath),
    asset_id: assetId,
    route,
    status: failedChecks.length ? 'asset_certificate_smoke_failed' : 'asset_certificate_smoke_passed',
    policy: {
      smoke_creates_only_temporary_local_review_files: true,
      cleanup_removes_decision_and_certificate_artifacts: true,
      no_uploads: true,
      no_public_downloads: true,
      no_d1_writes: true,
      no_r2_writes: true,
      no_library_mutation: true
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failedChecks.length
    },
    steps,
    evidence_snapshot: {
      decision_status: decision?.status || null,
      certificate_status: certificate?.status || null,
      certificate_id: certificate?.certificate_id || null,
      ledger_status_with_certificate: ledgerWithCertificate?.status || null,
      ledger_certificate_status: ledgerRow?.latest_certificate?.status || null
    },
    checks,
    outputs: {
      smoke_json: relative(root, outputJsonPath),
      smoke_markdown: relative(root, outputMdPath),
      cleaned_decision: relative(root, decisionPath),
      cleaned_certificate: relative(root, certificatePath)
    },
    next_actions: failedChecks.length
      ? ['Fix failed certificate smoke checks before using review certificates as sandbox gates.']
      : ['Certificate gate is smoke-tested; keep generated approvals explicit and local-only.']
  };
}

function runStep(id, argsList) {
  const result = spawnSync('npm', argsList, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return {
    id,
    command: ['npm', ...argsList].join(' '),
    status: result.status === 0 ? 'passed' : 'failed',
    exit_code: result.status,
    stdout_tail: tail(result.stdout),
    stderr_tail: tail(result.stderr)
  };
}

function stepPassed(steps, id) {
  return steps.find((step) => step.id === id)?.status === 'passed';
}

function removeTempArtifacts() {
  [decisionPath, decisionMdPath, certificatePath, certificateMdPath].forEach((pathname) => {
    if (existsSync(pathname)) rmSync(pathname, { force: true });
  });
}

function check(id, passed, label) {
  return {
    id,
    status: passed ? 'passed' : 'failed',
    label
  };
}

function routeMatches(candidate, expected) {
  return candidate === expected || candidate === 'all' || expected === 'all';
}

function readOptionalJson(pathname) {
  if (!existsSync(pathname)) return null;
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function tail(output) {
  return String(output || '')
    .trim()
    .split('\n')
    .slice(-8)
    .join('\n');
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoAsset Certificate Smoke',
    '',
    `Asset: \`${report.asset_id}\``,
    `Route: \`${report.route}\``,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'This smoke test creates temporary local review evidence, verifies the certificate gate, then removes the temporary decision and certificate files. It does not upload, publish, write D1/R2 or mutate the asset library.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count}`,
    `- failed checks: ${report.summary.failed_checks}`,
    `- certificate status: \`${report.evidence_snapshot.certificate_status || '-'}\``,
    `- ledger certificate status: \`${report.evidence_snapshot.ledger_certificate_status || '-'}\``,
    '',
    '## Steps',
    '',
    '| Step | Status |',
    '| --- | --- |'
  ];
  report.steps.forEach((step) => lines.push(`| ${step.id} | ${step.status} |`));
  lines.push('', '## Checks', '');
  report.checks.forEach((item) => lines.push(`- ${item.status}: ${item.label}`));
  lines.push('', '## Outputs', '');
  Object.entries(report.outputs).forEach(([key, value]) => lines.push(`- ${key}: \`${value}\``));
  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
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
