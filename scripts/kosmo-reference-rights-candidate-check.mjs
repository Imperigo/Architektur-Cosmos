#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const candidatePath = resolve(root, args.candidates || 'examples/kosmo-references/provenance/villa-savoye-file-rights-candidates-2026-06-13.json');
const outputDir = resolve(root, args.out || dirname(candidatePath));

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const candidates = JSON.parse(await readFile(candidatePath, 'utf8'));
  const inventoryPath = resolve(root, candidates.source_inventory_ref || '');
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
  const report = checkCandidates(candidates, inventory);

  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'rights-candidate-check.generated.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(resolve(outputDir, 'rights-candidate-check.generated.md'), renderMarkdown(report));

  console.log('KosmoReferences rights candidate check');
  console.log(`Candidates: ${relative(root, candidatePath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Files: ${report.summary.files}`);
  console.log(`Exact matches: ${report.summary.exact_remote_matches}`);
  console.log(`Public-ready: ${report.summary.public_ready_files}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, resolve(outputDir, 'rights-candidate-check.generated.md'))}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function checkCandidates(candidates, inventory) {
  const failures = [];
  const warnings = [];

  if (candidates.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${candidates.schema_version}`);
  if (candidates.policy?.public_ready === true) failures.push('candidate manifest policy must not be public_ready=true');
  if (candidates.policy?.human_review_required !== true) failures.push('candidate manifest must require human review');
  if (!Array.isArray(candidates.files)) failures.push('candidate files must be an array');
  if (!Array.isArray(inventory.files)) failures.push('inventory files must be an array');

  const inventoryById = new Map((inventory.files ?? []).map((file) => [file.id, file]));
  const candidateById = new Map();
  const rows = [];

  for (const file of candidates.files ?? []) {
    if (!file.file_id) failures.push('candidate file_id is required');
    if (candidateById.has(file.file_id)) failures.push(`duplicate candidate file_id: ${file.file_id}`);
    candidateById.set(file.file_id, file);

    const inventoryFile = inventoryById.get(file.file_id);
    if (!inventoryFile) failures.push(`candidate references unknown inventory file: ${file.file_id}`);

    if (file.public_ready === true) failures.push(`candidate ${file.file_id} must not be public_ready`);
    if (!file.promotion_blocker) failures.push(`candidate ${file.file_id} needs promotion_blocker`);
    if (inventoryFile) {
      if (file.local_path !== inventoryFile.path) failures.push(`candidate ${file.file_id} local_path mismatch`);
      if (file.local_sha256 !== inventoryFile.sha256) failures.push(`candidate ${file.file_id} local_sha256 mismatch`);
      if (file.local_bytes !== inventoryFile.bytes) failures.push(`candidate ${file.file_id} local_bytes mismatch`);
    }

    if (file.source_status === 'exact_remote_match') {
      for (const field of ['source_page_url', 'remote_file_url', 'remote_sha256', 'remote_bytes', 'creator', 'source_license', 'license_url']) {
        if (!file[field]) failures.push(`exact remote match ${file.file_id} missing ${field}`);
      }
      if (file.remote_sha256 !== file.local_sha256) failures.push(`exact remote match ${file.file_id} remote_sha256 != local_sha256`);
      if (file.remote_bytes !== file.local_bytes) failures.push(`exact remote match ${file.file_id} remote_bytes != local_bytes`);
    }

    if (file.source_status?.startsWith('no_file_level_source') && file.source_page_url) {
      warnings.push(`candidate ${file.file_id} has no_file_level_source status but includes source_page_url`);
    }

    rows.push({
      file_id: file.file_id || null,
      source_status: file.source_status || 'unknown',
      recommended_rights_status: file.recommended_rights_status || 'unknown',
      public_ready: Boolean(file.public_ready),
      has_source_page: Boolean(file.source_page_url),
      exact_hash_match: file.source_status === 'exact_remote_match' && file.remote_sha256 === file.local_sha256 && file.remote_bytes === file.local_bytes
    });
  }

  for (const inventoryFile of inventory.files ?? []) {
    if (!candidateById.has(inventoryFile.id)) failures.push(`inventory file missing candidate row: ${inventoryFile.id}`);
  }

  const status = failures.length > 0 ? 'failed' : warnings.length > 0 ? 'passed_with_warnings' : 'passed';
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    candidate_path: relative(root, candidatePath),
    inventory_path: relative(root, resolve(root, candidates.source_inventory_ref || '')),
    entry_id: candidates.entry_id || null,
    status,
    summary: {
      files: rows.length,
      inventory_files: inventory.files?.length ?? 0,
      exact_remote_matches: rows.filter((row) => row.source_status === 'exact_remote_match').length,
      derived_or_unmatched_files: rows.filter((row) => row.source_status !== 'exact_remote_match').length,
      public_ready_files: rows.filter((row) => row.public_ready).length,
      failures: failures.length,
      warnings: warnings.length,
      source_status: countBy(rows.map((row) => row.source_status)),
      recommended_rights_status: countBy(rows.map((row) => row.recommended_rights_status))
    },
    files: rows,
    failures,
    warnings,
    next_actions: [
      'Human-review exact remote matches before changing any public flag.',
      'Resolve derivative/source-basis blockers for crop, SVG and GLB files.',
      'Regenerate this check after every rights-candidate edit.'
    ]
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoReferences Rights Candidate Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Candidates: \`${report.candidate_path}\``);
  lines.push(`Inventory: \`${report.inventory_path}\``);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Files: ${report.summary.files}`);
  lines.push(`- Inventory files: ${report.summary.inventory_files}`);
  lines.push(`- Exact remote matches: ${report.summary.exact_remote_matches}`);
  lines.push(`- Derived/unmatched files: ${report.summary.derived_or_unmatched_files}`);
  lines.push(`- Public-ready files: ${report.summary.public_ready_files}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push('');
  lines.push('## Files');
  lines.push('');
  lines.push('| File | Source status | Rights candidate | Public | Exact hash |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const file of report.files) {
    lines.push(`| ${file.file_id || '-'} | ${file.source_status} | ${file.recommended_rights_status} | ${file.public_ready ? 'yes' : 'no'} | ${file.exact_hash_match ? 'yes' : 'no'} |`);
  }
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  lines.push('## Warnings');
  lines.push('');
  if (report.warnings.length > 0) report.warnings.forEach((warning) => lines.push(`- ${warning}`));
  else lines.push('- None.');
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    const key = value || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
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
