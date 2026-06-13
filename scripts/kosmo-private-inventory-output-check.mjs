#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const inventoryPath = resolve(root, args.inventory || `examples/kosmo-references/private-inventory/private-inventory-output-template-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-private-inventory-output-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-private-inventory-output-check-${dateStamp}.md`);
const maxSummaryChars = Number(args.maxSummaryChars || 1200);
const maxStringChars = Number(args.maxStringChars || 1800);
const forbiddenFields = new Set([
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
  'page_text'
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
  const report = checkInventory(inventory);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo private inventory output check');
  console.log(`Inventory: ${relative(root, inventoryPath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Pilots: ${report.summary.pilots}`);
  console.log(`Public-ready hits: ${report.summary.public_ready_hits}`);
  console.log(`Forbidden field hits: ${report.summary.forbidden_field_hits}`);
  console.log(`Long string hits: ${report.summary.long_string_hits}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function checkInventory(inventory) {
  const failures = [];
  const warnings = [];
  const fieldHits = [];
  const longStringHits = [];
  const publicReadyHits = [];
  const rows = [];

  if (inventory.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${inventory.schema_version}`);
  if (inventory.policy?.private_content_included !== false) failures.push('policy.private_content_included must be false');
  if (inventory.policy?.copied_private_files !== false) failures.push('policy.copied_private_files must be false');
  if (inventory.policy?.public_ready_after_inventory !== 0) failures.push('policy.public_ready_after_inventory must be 0');
  if (inventory.policy?.public_writes_allowed !== false) failures.push('policy.public_writes_allowed must be false');
  if (inventory.policy?.long_quotes_allowed !== false) failures.push('policy.long_quotes_allowed must be false');
  if (!Array.isArray(inventory.pilots)) failures.push('pilots must be an array');
  if (!inventory.inventory_root || !String(inventory.inventory_root).includes('KosmoZentrale')) {
    warnings.push('inventory_root should point to a KosmoZentrale private path');
  }

  scanValue(inventory, [], { fieldHits, longStringHits, publicReadyHits });

  for (const pilot of inventory.pilots || []) {
    const pilotId = pilot.pilot_id || '<missing>';
    if (!pilot.pilot_id) failures.push('pilot row missing pilot_id');
    if (pilot.public_ready !== false) failures.push(`pilot ${pilotId} must keep public_ready=false`);
    if (!['review_only', 'private_research', 'needs_review'].includes(pilot.rights_status)) {
      failures.push(`pilot ${pilotId} rights_status must be review_only, private_research or needs_review`);
    }
    if (typeof pilot.gap_summary === 'string' && pilot.gap_summary.length > maxSummaryChars) {
      failures.push(`pilot ${pilotId} gap_summary exceeds ${maxSummaryChars} chars`);
    }
    if (!Array.isArray(pilot.path_fingerprints)) failures.push(`pilot ${pilotId} path_fingerprints must be an array`);
    for (const fingerprint of pilot.path_fingerprints || []) {
      if (typeof fingerprint !== 'object' || Array.isArray(fingerprint)) {
        failures.push(`pilot ${pilotId} path_fingerprints entries must be objects`);
        continue;
      }
      if ('path' in fingerprint && !String(fingerprint.path).startsWith('/mnt/data/')) {
        warnings.push(`pilot ${pilotId} fingerprint path is outside /mnt/data`);
      }
      if ('excerpt' in fingerprint || 'text' in fingerprint || 'content' in fingerprint) {
        failures.push(`pilot ${pilotId} path fingerprint contains content-like field`);
      }
    }
    rows.push({
      pilot_id: pilotId,
      inventory_status: pilot.inventory_status || null,
      candidate_files: pilot.metadata_counts?.candidate_files ?? null,
      source_records: pilot.metadata_counts?.source_records ?? null,
      rights_records: pilot.metadata_counts?.rights_records ?? null,
      path_fingerprints: pilot.path_fingerprints?.length ?? null,
      rights_status: pilot.rights_status || null,
      public_ready: pilot.public_ready === true
    });
  }

  for (const hit of fieldHits) failures.push(`forbidden field: ${hit.path}`);
  for (const hit of longStringHits) failures.push(`long string over ${maxStringChars} chars: ${hit.path}`);
  for (const hit of publicReadyHits) failures.push(`public-ready truthy value: ${hit.path}`);

  const status = failures.length > 0
    ? 'failed'
    : warnings.length > 0
      ? 'private_inventory_output_contract_passed_with_warnings'
      : 'private_inventory_output_contract_passed';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    inventory_path: relative(root, inventoryPath),
    status,
    policy: {
      review_only: true,
      private_content_read: false,
      copied_private_content_allowed: false,
      public_ready_allowed: false,
      public_writes_allowed: false
    },
    summary: {
      pilots: rows.length,
      public_ready_hits: publicReadyHits.length,
      forbidden_field_hits: fieldHits.length,
      long_string_hits: longStringHits.length,
      failures: failures.length,
      warnings: warnings.length
    },
    pilots: rows,
    failures,
    warnings,
    next_actions: failures.length > 0
      ? ['Remove private content, forbidden fields and public-ready values before handing output to Codex/Claude.']
      : ['Inventory output contract is safe for metadata-only handoff; provenance and rights review still required before any public promotion.']
  };
}

function scanValue(value, path, hits) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanValue(item, [...path, String(index)], hits));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      const childPath = [...path, key];
      if (forbiddenFields.has(lowerKey)) hits.fieldHits.push({ path: childPath.join('.') });
      if ((lowerKey === 'public_ready' || lowerKey === 'publicready') && child === true) {
        hits.publicReadyHits.push({ path: childPath.join('.') });
      }
      scanValue(child, childPath, hits);
    }
    return;
  }
  if (typeof value === 'string' && value.length > maxStringChars) {
    hits.longStringHits.push({ path: path.join('.') || '<root>', length: value.length });
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Private Inventory Output Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Inventory: \`${report.inventory_path}\``);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pilots: ${report.summary.pilots}`);
  lines.push(`- Public-ready hits: ${report.summary.public_ready_hits}`);
  lines.push(`- Forbidden field hits: ${report.summary.forbidden_field_hits}`);
  lines.push(`- Long string hits: ${report.summary.long_string_hits}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push('');
  lines.push('## Pilots');
  lines.push('');
  lines.push('| Pilot | Status | Candidates | Sources | Rights | Fingerprints | Public-ready |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- |');
  for (const pilot of report.pilots) {
    lines.push(`| ${pilot.pilot_id} | ${pilot.inventory_status || '-'} | ${pilot.candidate_files ?? '-'} | ${pilot.source_records ?? '-'} | ${pilot.rights_records ?? '-'} | ${pilot.path_fingerprints ?? '-'} | ${pilot.public_ready ? 'yes' : 'no'} |`);
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
