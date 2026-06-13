#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const sessionPath = resolve(root, args.session || 'examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json');
const outputPath = resolve(root, args.out || 'docs/codex/kosmoreferences-owner-decision-worksheet-2026-06-13.md');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const session = JSON.parse(await readFile(sessionPath, 'utf8'));
  const worksheet = buildWorksheet(session);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, worksheet);

  console.log('KosmoReferences owner decision worksheet');
  console.log(`Session: ${relative(root, sessionPath)}`);
  console.log(`Decisions: ${session.decisions?.length ?? 0}`);
  console.log(`Allowed decisions: ${(session.allowed_decisions ?? []).length}`);
  console.log(`Wrote: ${relative(root, outputPath)}`);
}

function buildWorksheet(session) {
  const decisions = Array.isArray(session.decisions) ? session.decisions : [];
  const allowed = Array.isArray(session.allowed_decisions) ? session.allowed_decisions : [];
  const groups = groupBy(decisions, (item) => item.group_id || 'unknown');
  const lines = [];

  lines.push('# KosmoReferences Owner Decision Worksheet');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Session: \`${relative(root, sessionPath)}\``);
  lines.push(`Status: \`${session.status || 'unknown'}\``);
  lines.push('');
  lines.push('## Safety Rules');
  lines.push('');
  lines.push('- This worksheet records owner decisions only.');
  lines.push('- It does not promote media, copy source content, or write public-ready manifests.');
  lines.push('- Any approved item still needs a separate reviewed promotion or manifest change.');
  lines.push('- Safe default when unsure: keep blocked or request more source context.');
  lines.push('');
  lines.push('## Allowed Decision Values');
  lines.push('');
  for (const value of allowed) lines.push(`- \`${value}\``);
  lines.push('');
  lines.push('## Open Decisions');

  let index = 1;
  for (const [groupId, items] of Object.entries(groups)) {
    lines.push('');
    lines.push(`### ${groupTitle(groupId)}`);
    lines.push('');
    for (const item of items) {
      lines.push(`#### ${index}. \`${item.item_id || 'unknown'}\``);
      lines.push('');
      lines.push(`- Group: \`${item.group_id || 'unknown'}\``);
      lines.push(`- Source path: ${item.source_path ? `\`${item.source_path}\`` : 'none'}`);
      lines.push(`- Prompt: ${item.decision_prompt || 'No prompt recorded.'}`);
      lines.push(`- Recommended safe default: \`${item.recommended_safe_default || 'needs_more_source_context'}\``);
      if (item.confirm_command_after_separate_review) {
        lines.push(`- Separate review command after owner confirmation: \`${item.confirm_command_after_separate_review}\``);
      }
      lines.push('- Select one:');
      for (const value of allowed) {
        const marker = value === item.recommended_safe_default ? 'recommended' : 'option';
        lines.push(`  - [ ] \`${value}\` (${marker})`);
      }
      lines.push('- Owner note:');
      lines.push('');
      lines.push('  ```text');
      lines.push('');
      lines.push('  ```');
      lines.push('');
      index += 1;
    }
  }

  lines.push('## After Filling');
  lines.push('');
  lines.push('1. Transfer selected decisions into the session JSON.');
  lines.push('2. Run `npm run kosmo:owner-decision-session-check`.');
  lines.push('3. Only if the session passes, prepare a separate promotion review.');
  lines.push('');
  return `${lines.join('\n')}`;
}

function groupTitle(groupId) {
  const labels = {
    'villa-savoye-public-image-candidates': 'Villa Savoye Public Image Candidates',
    'villa-savoye-blocked-derived-files': 'Villa Savoye Blocked Derived Files',
    'model-promotion-owner-confirmation': 'Model Promotion Owner Confirmation',
    'sogn-benedetg-source-gap': 'Sogn Benedetg Source Gap'
  };
  return labels[groupId] || groupId;
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
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
