#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const inventoryPath = resolve(root, args.inventory || 'examples/kosmo-references/provenance/villa-savoye-file-level-provenance-2026-06-13.json');
const outputDir = resolve(root, args.out || dirname(inventoryPath));
const publicSafeRights = new Set(['own_work', 'licensed', 'public_domain']);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
  const report = await checkInventory(inventory);

  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'file-provenance-check.generated.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(resolve(outputDir, 'file-provenance-check.generated.md'), renderMarkdown(report));

  console.log('KosmoReferences file provenance check');
  console.log(`Inventory: ${relative(root, inventoryPath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Files: ${report.summary.files}`);
  console.log(`Public ready: ${report.summary.public_ready_files}`);
  console.log(`Blocked: ${report.summary.blocked_files}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, resolve(outputDir, 'file-provenance-check.generated.md'))}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

async function checkInventory(inventory) {
  const failures = [];
  const warnings = [];
  const rows = [];

  if (inventory.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${inventory.schema_version}`);
  if (!inventory.entry_id) failures.push('entry_id is required');
  if (!Array.isArray(inventory.files)) failures.push('files must be an array');
  if (inventory.policy?.public_ready === true) failures.push('inventory policy must not be public_ready=true without separate promotion review');

  const seenIds = new Set();
  for (const file of inventory.files ?? []) {
    const row = await checkFile(file, failures, warnings, seenIds);
    rows.push(row);
  }

  const publicReady = rows.filter((row) => row.public_ready).length;
  const blocked = rows.filter((row) => !row.public_ready).length;
  const status = failures.length > 0 ? 'failed' : warnings.length > 0 ? 'passed_with_warnings' : 'passed';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    inventory_path: relative(root, inventoryPath),
    entry_id: inventory.entry_id || null,
    status,
    policy: {
      public_safe_rights: [...publicSafeRights],
      rule: 'Public-ready requires public-safe rights plus file-level source/creator/license review.'
    },
    summary: {
      files: rows.length,
      existing_files: rows.filter((row) => row.exists).length,
      public_ready_files: publicReady,
      blocked_files: blocked,
      failures: failures.length,
      warnings: warnings.length,
      rights_status: countBy(rows.map((row) => row.rights_status)),
      slots: countBy(rows.map((row) => row.slot))
    },
    files: rows,
    failures,
    warnings,
    next_actions: [
      'Fill source URL, creator/license evidence and attribution decisions for candidate public images.',
      'Keep derived diagrams and models blocked until their source basis and generation/build logs are reviewed.',
      'Regenerate this check after every file-level provenance update.'
    ]
  };
}

async function checkFile(file, failures, warnings, seenIds) {
  const id = file.id || '<missing>';
  if (!file.id) failures.push('file id is required');
  if (file.id && seenIds.has(file.id)) failures.push(`duplicate file id: ${file.id}`);
  if (file.id) seenIds.add(file.id);
  if (!file.path) failures.push(`file ${id} path is required`);
  if (!file.sha256 || !/^[a-f0-9]{64}$/.test(file.sha256)) failures.push(`file ${id} sha256 must be a SHA-256 hex digest`);
  if (!Number.isInteger(file.bytes) || file.bytes < 0) failures.push(`file ${id} bytes must be a non-negative integer`);

  const filePath = file.path ? resolve(root, file.path) : null;
  let exists = false;
  let actualBytes = null;
  let actualSha256 = null;
  let integrity = 'not_checked';

  if (filePath) {
    try {
      const info = await stat(filePath);
      exists = info.isFile();
      if (exists) {
        const buffer = await readFile(filePath);
        actualBytes = info.size;
        actualSha256 = createHash('sha256').update(buffer).digest('hex');
        if (actualBytes !== file.bytes) {
          integrity = 'size_mismatch';
          failures.push(`file ${id} size mismatch`);
        } else if (actualSha256 !== file.sha256) {
          integrity = 'hash_mismatch';
          failures.push(`file ${id} hash mismatch`);
        } else {
          integrity = 'pass';
        }
      }
    } catch {
      failures.push(`file ${id} missing: ${file.path}`);
    }
  }

  const rightsStatus = file.rights_status || 'unknown';
  const publicReady = Boolean(file.public_ready);
  if (publicReady && !publicSafeRights.has(rightsStatus)) {
    failures.push(`file ${id} is public_ready with non-public-safe rights_status=${rightsStatus}`);
  }
  if (!Array.isArray(file.review_requirements) || file.review_requirements.length === 0) {
    warnings.push(`file ${id} has no review_requirements`);
  }

  return {
    id: file.id || null,
    slot: file.slot || null,
    path: file.path || null,
    mime_type: file.mime_type || null,
    bytes: file.bytes ?? null,
    actual_bytes: actualBytes,
    sha256: file.sha256 || null,
    actual_sha256: actualSha256,
    exists,
    integrity,
    filename_rights_hint: file.filename_rights_hint || null,
    rights_status: rightsStatus,
    public_ready: publicReady,
    review_requirement_count: Array.isArray(file.review_requirements) ? file.review_requirements.length : 0
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoReferences File Provenance Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Inventory: \`${report.inventory_path}\``);
  lines.push(`Entry: \`${report.entry_id}\``);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Files: ${report.summary.files}`);
  lines.push(`- Existing files: ${report.summary.existing_files}`);
  lines.push(`- Public-ready files: ${report.summary.public_ready_files}`);
  lines.push(`- Blocked files: ${report.summary.blocked_files}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push('');
  lines.push('## Files');
  lines.push('');
  lines.push('| File | Slot | Integrity | Rights | Public |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const file of report.files) {
    lines.push(`| ${file.id || '-'} | ${file.slot || '-'} | ${file.integrity} | ${file.rights_status} | ${file.public_ready ? 'yes' : 'no'} |`);
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
