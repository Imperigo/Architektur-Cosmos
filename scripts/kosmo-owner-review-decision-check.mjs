#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const packPath = resolve(root, args.pack || 'examples/kosmo-references/provenance/owner-review-decision-pack-2026-06-13.json');
const outputDir = resolve(root, args.out || dirname(packPath));
const requiredGroups = new Set([
  'villa-savoye-public-image-candidates',
  'villa-savoye-blocked-derived-files',
  'model-promotion-owner-confirmation',
  'sogn-benedetg-source-gap'
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pack = JSON.parse(await readFile(packPath, 'utf8'));
  const report = await checkPack(pack);

  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'owner-review-decision-check.generated.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(resolve(outputDir, 'owner-review-decision-check.generated.md'), renderMarkdown(report));

  console.log('KosmoReferences owner review decision check');
  console.log(`Pack: ${relative(root, packPath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Decision groups: ${report.summary.decision_groups}`);
  console.log(`Decision items: ${report.summary.decision_items}`);
  console.log(`Public-ready now: ${report.summary.public_ready_now}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, resolve(outputDir, 'owner-review-decision-check.generated.md'))}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

async function checkPack(pack) {
  const failures = [];
  const warnings = [];
  const rows = [];

  if (pack.schema_version !== '0.1') failures.push(`Unsupported schema_version: ${pack.schema_version}`);
  if (pack.status !== 'owner_review_pending') failures.push('pack status must be owner_review_pending');
  if (pack.policy?.auto_promote !== false) failures.push('policy.auto_promote must be false');
  if (pack.policy?.public_ready_after_pack !== 0) failures.push('policy.public_ready_after_pack must be 0');
  if (!Array.isArray(pack.decision_groups)) failures.push('decision_groups must be an array');

  const groups = new Map();
  for (const group of pack.decision_groups ?? []) {
    if (!group.id) failures.push('decision group id is required');
    if (group.id && groups.has(group.id)) failures.push(`duplicate decision group: ${group.id}`);
    if (group.id) groups.set(group.id, group);
    if (!group.title) warnings.push(`decision group ${group.id || '<missing>'} has no title`);
    if (!group.current_status) warnings.push(`decision group ${group.id || '<missing>'} has no current_status`);
    for (const ref of group.evidence_refs ?? []) {
      const exists = await fileExists(resolve(root, ref));
      if (!exists) failures.push(`evidence ref missing for ${group.id}: ${ref}`);
    }
    rows.push(...rowsForGroup(group, failures, warnings));
  }

  for (const required of requiredGroups) {
    if (!groups.has(required)) failures.push(`missing required decision group: ${required}`);
  }

  const publicReadyNow = rows.filter((row) => row.public_ready_now).length;
  if (publicReadyNow > 0) failures.push(`pack contains ${publicReadyNow} public_ready_now=true items`);

  const confirmCommands = rows.filter((row) => row.confirm_command_after_review).length;
  const status = failures.length > 0 ? 'failed' : warnings.length > 0 ? 'passed_with_warnings' : 'passed';

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    pack_path: relative(root, packPath),
    status,
    policy: {
      auto_promote_allowed: false,
      public_ready_after_pack_required: 0,
      confirm_commands_allowed_only_after_owner_review: true
    },
    summary: {
      decision_groups: pack.decision_groups?.length ?? 0,
      decision_items: rows.length,
      public_ready_now: publicReadyNow,
      confirm_commands_after_review: confirmCommands,
      failures: failures.length,
      warnings: warnings.length,
      groups: countBy(rows.map((row) => row.group_id))
    },
    decisions: rows,
    failures,
    warnings,
    next_actions: [
      'Owner reviews each prepared decision item explicitly.',
      'Keep public_ready=false until the owner decision is recorded and a separate promotion command or manifest change is made.',
      'Re-run this check after every owner decision pack edit.'
    ]
  };
}

function rowsForGroup(group, failures, warnings) {
  const items = Array.isArray(group.items) ? group.items : group.items ? [group.items] : [];
  if (!items.length && group.decision_needed) {
    return [{
      group_id: group.id,
      item_id: group.id,
      decision_needed: group.decision_needed,
      current_status: group.current_status || null,
      public_ready_now: false,
      confirm_command_after_review: null
    }];
  }

  if (!items.length) warnings.push(`decision group ${group.id || '<missing>'} has no items`);

  return items.map((item, index) => {
    if (typeof item === 'string') {
      return {
        group_id: group.id,
        item_id: item,
        decision_needed: group.decision_needed || 'keep_blocked_or_review',
        current_status: group.current_status || null,
        public_ready_now: false,
        confirm_command_after_review: null
      };
    }

    const itemId = item.file_id || item.entry_id || `${group.id || 'group'}-${index + 1}`;
    if (item.public_ready_now === true) failures.push(`decision item ${itemId} must not be public_ready_now=true`);
    if (!item.decision_needed && !group.decision_needed && !item.confirm_command_after_review) {
      warnings.push(`decision item ${itemId} has no decision_needed`);
    }
    if (item.confirm_command_after_review && group.id !== 'model-promotion-owner-confirmation') {
      failures.push(`decision item ${itemId} has confirm command outside model-promotion-owner-confirmation`);
    }

    return {
      group_id: group.id,
      item_id: itemId,
      decision_needed: item.decision_needed || group.decision_needed || 'owner_review_required',
      current_status: item.dry_run_status || group.current_status || null,
      public_ready_now: Boolean(item.public_ready_now),
      confirm_command_after_review: item.confirm_command_after_review || null
    };
  });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# KosmoReferences Owner Review Decision Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Pack: \`${report.pack_path}\``);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Decision groups: ${report.summary.decision_groups}`);
  lines.push(`- Decision items: ${report.summary.decision_items}`);
  lines.push(`- Public-ready now: ${report.summary.public_ready_now}`);
  lines.push(`- Confirm commands after review: ${report.summary.confirm_commands_after_review}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push('');
  lines.push('## Decisions');
  lines.push('');
  lines.push('| Group | Item | Decision | Current | Public-ready now |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const decision of report.decisions) {
    lines.push(`| ${decision.group_id || '-'} | ${decision.item_id || '-'} | ${decision.decision_needed || '-'} | ${decision.current_status || '-'} | ${decision.public_ready_now ? 'yes' : 'no'} |`);
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

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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
