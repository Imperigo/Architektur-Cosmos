#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const runnerPath = resolve(root, args.runner || `data/kosmo-private-metadata-inventory-runner-${dateStamp}.json`);
const fixturePath = resolve(root, args.fixture || `data/kosmo-private-metadata-inventory-fixture-smoke-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-private-metadata-inventory-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-private-metadata-inventory-check-${dateStamp}.md`);

const expectedPilots = new Set([
  'villa-savoye',
  'kapelle-sogn-benedetg',
  'alterszentrum-kloster-ingenbohl'
]);

const forbiddenFields = new Set([
  'path',
  'raw_path',
  'absolute_path',
  'full_text',
  'ocr_text',
  'pdf_text',
  'book_excerpt',
  'page_scan',
  'image_base64',
  'copied_plan',
  'private_image',
  'scan_base64',
  'document_body',
  'page_text',
  'content',
  'excerpt',
  'text'
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const runner = await readOptionalJson(runnerPath);
  const fixture = await readOptionalJson(fixturePath);
  const report = buildReport({ runner, fixture });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo private metadata inventory check');
  console.log(`Status: ${report.status}`);
  console.log(`Runner: ${report.summary.runner_status || 'missing'}`);
  console.log(`Fixture: ${report.summary.fixture_status || 'missing'}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Public-ready hits: ${report.summary.public_ready_hits}`);
  console.log(`Forbidden field hits: ${report.summary.forbidden_field_hits}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.summary.failures > 0) process.exitCode = 1;
}

function buildReport({ runner, fixture }) {
  const findings = [];
  const runnerScan = scanValue(runner);
  const fixtureScan = scanValue(fixture);

  expect(Boolean(runner), findings, 'runner_report_present', 'Runner report must exist.');
  expect(Boolean(fixture), findings, 'fixture_report_present', 'Fixture smoke report must exist.');

  if (runner) {
    checkReportShape(runner, findings, 'runner');
    expect(
      [
        'private_metadata_inventory_blocked_until_activation',
        'private_metadata_inventory_ready_private_output_written'
      ].includes(runner.status),
      findings,
      'runner_status_guarded',
      'Runner status must be blocked or private-output-written.'
    );
    if (runner.status === 'private_metadata_inventory_blocked_until_activation') {
      expect(runner.summary?.root_scanned === false, findings, 'runner_blocked_no_scan', 'Blocked runner must not scan a root.');
      expect(runner.summary?.files_scanned === 0, findings, 'runner_blocked_zero_files', 'Blocked runner must scan zero files.');
      expect(runner.summary?.private_inventory_written === false, findings, 'runner_blocked_no_private_write', 'Blocked runner must not write private inventory.');
      expect(Boolean(runner.blocked_reason), findings, 'runner_blocked_reason_present', 'Blocked runner must include blocked_reason.');
    }
  }

  if (fixture) {
    checkReportShape(fixture, findings, 'fixture');
    expect(fixture.status === 'private_metadata_inventory_fixture_passed', findings, 'fixture_status_passed', 'Fixture smoke must pass.');
    expect(fixture.summary?.mode === 'fixture_public_safe', findings, 'fixture_public_safe_mode', 'Fixture smoke must be public-safe mode.');
    expect(fixture.summary?.root_scanned === true, findings, 'fixture_root_scanned', 'Fixture smoke must exercise scan path.');
    expect((fixture.summary?.files_scanned ?? 0) >= 6, findings, 'fixture_files_scanned', 'Fixture smoke must scan at least six files.');
    expect((fixture.summary?.total_candidate_matches ?? 0) >= 6, findings, 'fixture_candidate_matches', 'Fixture smoke must produce at least six candidate matches.');
    expect(fixture.summary?.private_inventory_written === false, findings, 'fixture_no_private_write', 'Fixture smoke must not write private inventory output.');
    for (const pilot of fixture.pilots || []) {
      expect((pilot.candidate_files ?? 0) >= 2, findings, `fixture_pilot_candidates:${pilot.pilot_id}`, `Fixture pilot ${pilot.pilot_id} must have at least two candidates.`);
    }
  }

  for (const hit of [...runnerScan.forbiddenFieldHits.map((hit) => ({ ...hit, report: 'runner' })), ...fixtureScan.forbiddenFieldHits.map((hit) => ({ ...hit, report: 'fixture' }))]) {
    findings.push(finding('failure', `forbidden_field:${hit.report}:${hit.path}`, `Forbidden field present: ${hit.path}`));
  }
  for (const hit of [...runnerScan.publicReadyHits.map((hit) => ({ ...hit, report: 'runner' })), ...fixtureScan.publicReadyHits.map((hit) => ({ ...hit, report: 'fixture' }))]) {
    findings.push(finding('failure', `public_ready_truthy:${hit.report}:${hit.path}`, `Public-ready truthy value present: ${hit.path}`));
  }

  const failures = findings.filter((item) => item.severity === 'failure');
  const warnings = findings.filter((item) => item.severity === 'warning');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'private_metadata_inventory_guard_passed' : 'private_metadata_inventory_guard_failed',
    policy: {
      metadata_only: true,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_check: 0,
      note: 'This guard validates runner and fixture reports only. It does not scan private roots or inspect source file contents.'
    },
    source_refs: [relative(root, runnerPath), relative(root, fixturePath)],
    summary: {
      runner_status: runner?.status || null,
      fixture_status: fixture?.status || null,
      runner_files_scanned: runner?.summary?.files_scanned ?? null,
      fixture_files_scanned: fixture?.summary?.files_scanned ?? null,
      fixture_candidate_matches: fixture?.summary?.total_candidate_matches ?? null,
      pilots: fixture?.pilots?.length ?? runner?.pilots?.length ?? 0,
      failures: failures.length,
      warnings: warnings.length,
      forbidden_field_hits: runnerScan.forbiddenFieldHits.length + fixtureScan.forbiddenFieldHits.length,
      public_ready_hits: runnerScan.publicReadyHits.length + fixtureScan.publicReadyHits.length,
      public_ready_after_check: 0
    },
    findings,
    failures,
    warnings,
    next_actions: failures.length === 0
      ? [
          'Keep private metadata inventory blocked until source-root activation passes.',
          'Use fixture smoke as the public-safe regression test for scan-path changes.',
          'After a real private metadata run, verify the private output with kosmo:private-inventory-output-check before handoff.'
        ]
      : [
          'Fix forbidden fields, public-ready flags or missing fixture coverage before assigning local worker inventory tasks.',
          'Rerun private metadata inventory, fixture smoke and this guard.'
        ]
  };
}

function checkReportShape(report, findings, prefix) {
  expect(report.schema_version === '0.1', findings, `${prefix}_schema_version`, `${prefix} schema_version must be 0.1.`);
  expect(report.policy?.metadata_only === true, findings, `${prefix}_metadata_only`, `${prefix} must be metadata-only.`);
  expect(report.policy?.reads_file_contents === false, findings, `${prefix}_no_content_reads`, `${prefix} must declare no file-content reads.`);
  expect(report.policy?.copies_private_content === false, findings, `${prefix}_no_private_copy`, `${prefix} must not copy private content.`);
  expect(report.policy?.writes_public_files === false, findings, `${prefix}_no_public_writes`, `${prefix} must not write public files.`);
  expect(report.policy?.public_ready_after_run === 0, findings, `${prefix}_public_ready_zero`, `${prefix} public-ready after run must be 0.`);
  expect(Array.isArray(report.pilots), findings, `${prefix}_pilots_array`, `${prefix} pilots must be an array.`);
  expect(report.pilots?.length === expectedPilots.size, findings, `${prefix}_pilot_count`, `${prefix} must contain all expected pilots.`);
  for (const pilot of report.pilots || []) {
    expect(expectedPilots.has(pilot.pilot_id), findings, `${prefix}_pilot_expected:${pilot.pilot_id}`, `${prefix} pilot must be expected: ${pilot.pilot_id}.`);
    expect(pilot.rights_status === 'review_only', findings, `${prefix}_pilot_rights:${pilot.pilot_id}`, `${prefix} pilot ${pilot.pilot_id} must stay review_only.`);
    expect(pilot.public_ready === false, findings, `${prefix}_pilot_public_ready:${pilot.pilot_id}`, `${prefix} pilot ${pilot.pilot_id} must keep public_ready=false.`);
    expect(Array.isArray(pilot.match_fingerprints), findings, `${prefix}_fingerprints_array:${pilot.pilot_id}`, `${prefix} pilot ${pilot.pilot_id} fingerprints must be an array.`);
    for (const fingerprint of pilot.match_fingerprints || []) {
      expect(Boolean(fingerprint.path_hash), findings, `${prefix}_fingerprint_hash:${pilot.pilot_id}`, `${prefix} fingerprint must include path_hash.`);
      expect(!('path' in fingerprint), findings, `${prefix}_fingerprint_no_path:${pilot.pilot_id}`, `${prefix} fingerprint must not include raw path.`);
      expect(!('content' in fingerprint), findings, `${prefix}_fingerprint_no_content:${pilot.pilot_id}`, `${prefix} fingerprint must not include content.`);
    }
  }
}

function scanValue(value, path = []) {
  const result = {
    forbiddenFieldHits: [],
    publicReadyHits: []
  };
  walk(value, path, result);
  return result;
}

function walk(value, path, result) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, [...path, String(index)], result));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      const childPath = [...path, key];
      if (forbiddenFields.has(lowerKey)) result.forbiddenFieldHits.push({ path: childPath.join('.') });
      if ((lowerKey === 'public_ready' || lowerKey === 'publicready') && child === true) {
        result.publicReadyHits.push({ path: childPath.join('.') });
      }
      walk(child, childPath, result);
    }
  }
}

function expect(condition, findings, id, message) {
  findings.push(finding(condition ? 'passed' : 'failure', id, message));
}

function finding(severity, id, message) {
  return { severity, id, message };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Private Metadata Inventory Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Runner: ${report.summary.runner_status}`);
  lines.push(`- Fixture: ${report.summary.fixture_status}`);
  lines.push(`- Runner files scanned: ${report.summary.runner_files_scanned}`);
  lines.push(`- Fixture files scanned: ${report.summary.fixture_files_scanned}`);
  lines.push(`- Fixture candidate matches: ${report.summary.fixture_candidate_matches}`);
  lines.push(`- Pilots: ${report.summary.pilots}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Forbidden field hits: ${report.summary.forbidden_field_hits}`);
  lines.push(`- Public-ready hits: ${report.summary.public_ready_hits}`);
  lines.push(`- Public-ready after check: ${report.summary.public_ready_after_check}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((item) => lines.push(`- ${item.severity}: \`${item.id}\` - ${item.message}`));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
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
