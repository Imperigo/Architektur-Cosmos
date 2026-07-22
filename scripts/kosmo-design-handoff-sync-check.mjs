#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = args.date || new Date().toISOString().slice(0, 10);
const reportPath = resolve(root, args.report || `data/kosmo-design-handoff-sync-${dateStamp}.json`);
const markdownPath = resolve(root, args.markdownReport || `docs/codex/kosmo-design-handoff-sync-${dateStamp}.md`);
const outputJson = resolve(root, args.out || `data/kosmo-design-handoff-sync-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-design-handoff-sync-check-${dateStamp}.md`);

const forbiddenOutputPatterns = [
  { id: 'absolute_workspace_path', pattern: /\/mnt\/data/i },
  { id: 'private_working_alias', pattern: /_pilot/i },
  { id: 'sync_provider_alias', pattern: /OneDrive/i },
  { id: 'raw_submission_name', pattern: /TKB_Wettbewerbsabgabe/i },
  { id: 'document_extension_literal', pattern: /\.pdf\b/i },
  { id: 'extraction_marker_literal', pattern: /\bOCR\b/i },
  { id: 'public_display_true_literal', pattern: /public_display_allowed"\s*:\s*true/i },
  { id: 'public_ready_nonzero_literal', pattern: /public_ready_after_sync"\s*:\s*(?!0\b)\d+/i }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reportText = await readFile(reportPath, 'utf8');
  const markdownText = await readFile(markdownPath, 'utf8');
  const report = JSON.parse(reportText);
  const checks = buildChecks(report, `${reportText}\n${markdownText}`);
  const failures = checks.filter((checkItem) => checkItem.status === 'failed');
  const checkReport = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'kosmo_design_handoff_sync_guard_passed'
      : 'kosmo_design_handoff_sync_guard_failed',
    policy: {
      validates_sync_only: true,
      reads_private_content_now: false,
      copies_private_paths: false,
      edits_sibling_lane_code: false,
      runs_private_inventory_now: false,
      writes_public_files_now: false,
      public_ready_after_check: 0
    },
    source_refs: [relative(root, reportPath), relative(root, markdownPath)],
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failures: failures.length,
      public_ready_after_check: 0
    },
    checks
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(checkReport, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(checkReport));

  console.log('Kosmo design handoff sync check');
  console.log(`Status: ${checkReport.status}`);
  console.log(`Checks: ${checkReport.summary.passed}/${checkReport.summary.checks}`);
  console.log(`Failures: ${checkReport.summary.failures}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function buildChecks(report, combinedOutput) {
  const hardStops = (report.hard_stops || []).join(' ').toLowerCase();
  const sourceLabels = (report.source_refs || []).map((source) => source.source_label || '').join(' ');
  return [
    check('status_review_only_ready', report.status === 'kosmo_design_handoff_sync_review_only_ready', report.status),
    check('mode_review_only', report.mode === 'review_only', report.mode),
    check('top_level_public_display_false', report.public_display_allowed === false, report.public_display_allowed),
    check('policy_no_private_path_copy', report.policy?.copies_private_paths === false, report.policy?.copies_private_paths),
    check('policy_no_document_body_copy', report.policy?.copies_document_bodies === false, report.policy?.copies_document_bodies),
    check('policy_no_sibling_lane_edits', report.policy?.edits_sibling_lane_code === false, report.policy?.edits_sibling_lane_code),
    check('policy_no_public_writes', report.policy?.writes_public_files_now === false, report.policy?.writes_public_files_now),
    check('policy_no_owner_decisions', report.policy?.records_owner_decisions === false, report.policy?.records_owner_decisions),
    check('policy_no_private_inventory', report.policy?.runs_private_inventory_now === false, report.policy?.runs_private_inventory_now),
    check('policy_no_local_worker_execution', report.policy?.executes_local_workers_now === false, report.policy?.executes_local_workers_now),
    check('public_ready_zero', report.summary?.public_ready_after_sync === 0, report.summary?.public_ready_after_sync),
    check('signals_present', (report.signals || []).length >= 8, (report.signals || []).length),
    check('signals_review_only', (report.signals || []).every((signal) => signal.review_only === true), 'all signals review_only'),
    check('signals_public_display_false', (report.signals || []).every((signal) => signal.public_display_allowed === false), 'all signals public_display_allowed=false'),
    check('source_refs_are_labels_only', !/[\\/]/.test(sourceLabels), sourceLabels),
    check('hard_stop_no_owner_approval', hardStops.includes('owner approval'), hardStops),
    check('hard_stop_no_private_paths', hardStops.includes('private source paths'), hardStops),
    check('hard_stop_no_private_inventory', hardStops.includes('private inventory'), hardStops),
    check('hard_stop_no_public_ready', hardStops.includes('public-ready'), hardStops),
    ...forbiddenOutputPatterns.map((entry) => check(`forbidden_output:${entry.id}`, !entry.pattern.test(combinedOutput), entry.id))
  ];
}

function check(id, condition, evidence) {
  return {
    id,
    status: condition ? 'passed' : 'failed',
    evidence
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Design Handoff Sync Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Checks: ${report.summary.passed}/${report.summary.checks}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  report.checks.forEach((checkItem) => {
    lines.push(`- ${checkItem.status}: \`${checkItem.id}\` - ${String(checkItem.evidence ?? '-')}`);
  });
  lines.push('');
  return lines.join('\n');
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
