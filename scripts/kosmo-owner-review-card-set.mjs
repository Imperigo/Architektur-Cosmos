#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const ownerBriefPath = resolve(root, args.ownerBrief || `data/kosmo-owner-next-review-brief-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-review-card-set-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-review-card-set-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const ownerBrief = JSON.parse(await readFile(ownerBriefPath, 'utf8'));
  const cards = (ownerBrief.review_cards || []).map((card) => ({
    order: card.order,
    batch_id: card.batch_id,
    label: card.label,
    owner_question: card.recommended_owner_question,
    items: card.open_items,
    safe_default: card.safe_default,
    public_ready_after_card: 0,
    options: buildOptions(card),
    recommended_stance: card.recommended_stance || [],
    command_hint_after_decision: card.command_hint_after_decision
  }));

  const set = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: cards.length > 0 ? 'owner_review_card_set_ready' : 'owner_review_card_set_empty',
    policy: {
      records_decisions: false,
      public_ready_after_set: 0,
      public_writes_allowed: false,
      note: 'This set prepares owner review cards only. It does not record decisions, approve public display or promote assets.'
    },
    source_refs: [relative(root, ownerBriefPath)],
    summary: {
      cards: cards.length,
      open_items: cards.reduce((sum, card) => sum + card.items, 0),
      public_ready_after_set: 0,
      first_card: cards[0]?.batch_id || null
    },
    cards,
    next_actions: [
      'Present one card at a time.',
      'If owner is unavailable, keep every card at safe default.',
      'After reference decisions, run npm run kosmo:owner-decision-session-check.',
      'After asset decisions, run npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json.',
      'After any decision edit, rerun sweep, router and night-loop checkpoint.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(set, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(set));

  console.log('Kosmo owner review card set');
  console.log(`Status: ${set.status}`);
  console.log(`Cards: ${set.summary.cards}`);
  console.log(`Open items: ${set.summary.open_items}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildOptions(card) {
  if (card.batch_id.includes('villa-savoye-image')) {
    return ['keep_all_blocked', 'open_one_source_credit_review', 'needs_more_context'];
  }
  if (card.batch_id.includes('kosmoasset')) {
    return ['keep_needs_review', 'assign_named_human_review', 'block_public'];
  }
  return ['use_safe_default', 'open_separate_review', 'needs_more_context'];
}

function renderMarkdown(set) {
  const lines = [];
  lines.push('# Kosmo Owner Review Card Set');
  lines.push('');
  lines.push(`Generated: ${set.generated_at}`);
  lines.push(`Status: \`${set.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Cards: ${set.summary.cards}`);
  lines.push(`- Open items: ${set.summary.open_items}`);
  lines.push(`- First card: \`${set.summary.first_card || 'none'}\``);
  lines.push(`- Public-ready after set: ${set.summary.public_ready_after_set}`);
  lines.push('');
  lines.push('## Cards');
  for (const card of set.cards) {
    lines.push('');
    lines.push(`### ${card.order}. ${card.label}`);
    lines.push('');
    lines.push(`Question: ${card.owner_question}`);
    lines.push('');
    lines.push(`- Batch: \`${card.batch_id}\``);
    lines.push(`- Items: ${card.items}`);
    lines.push(`- Safe default: \`${card.safe_default}\``);
    lines.push(`- Public-ready after card: ${card.public_ready_after_card}`);
    lines.push(`- Options: ${card.options.map((option) => `\`${option}\``).join(', ')}`);
    lines.push(`- Command after decision: \`${card.command_hint_after_decision}\``);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  set.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  return `${lines.join('\n')}`;
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
