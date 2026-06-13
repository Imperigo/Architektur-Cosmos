#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const ownerBriefPath = resolve(root, args.ownerBrief || `data/kosmo-owner-next-review-brief-${dateStamp}.json`);
const checkpointPath = resolve(root, args.checkpoint || `data/kosmo-night-loop-checkpoint-${dateStamp}.json`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const ownerBrief = JSON.parse(await readFile(ownerBriefPath, 'utf8'));
  const checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8'));
  const requestedBatch = args.batch || checkpoint.next_loop?.owner_card_to_present_first || ownerBrief.recommended_order?.[0];
  const reviewCard = (ownerBrief.review_cards || []).find((card) => card.batch_id === requestedBatch);
  if (!reviewCard) throw new Error(`Owner review card not found: ${requestedBatch}`);

  const safeName = requestedBatch.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const outputJson = resolve(root, args.out || `data/kosmo-owner-review-card-${safeName}-${dateStamp}.json`);
  const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-review-card-${safeName}-${dateStamp}.md`);
  const card = buildCard({ reviewCard, ownerBrief, checkpoint });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(card, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(card));

  console.log('Kosmo owner review card');
  console.log(`Status: ${card.status}`);
  console.log(`Batch: ${card.batch_id}`);
  console.log(`Items: ${card.summary.items}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildCard({ reviewCard, ownerBrief, checkpoint }) {
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'owner_review_card_ready',
    batch_id: reviewCard.batch_id,
    label: reviewCard.label,
    policy: {
      records_decisions: false,
      public_ready_after_card: 0,
      public_writes_allowed: false,
      decision_required_from_owner: true,
      note: 'This card prepares a single owner discussion. It does not record decisions or approve public display.'
    },
    source_refs: [
      relative(root, ownerBriefPath),
      relative(root, checkpointPath)
    ],
    summary: {
      order: reviewCard.order,
      items: reviewCard.open_items,
      safe_default: reviewCard.safe_default,
      decision_effect: reviewCard.decision_effect,
      router_status: ownerBrief.summary?.router_status || null,
      night_loop_status: checkpoint.status,
      public_ready_after_card: 0
    },
    owner_question: reviewCard.recommended_owner_question,
    recommended_stance: reviewCard.recommended_stance,
    options: buildOptions(reviewCard),
    items: reviewCard.items,
    after_decision: [
      reviewCard.command_hint_after_decision,
      'npm run kosmo:data-lane-sweep',
      'npm run kosmo:data-lane-command-router',
      'npm run kosmo:night-loop-checkpoint'
    ]
  };
}

function buildOptions(reviewCard) {
  if (reviewCard.batch_id.includes('villa-savoye-image')) {
    return [
      {
        id: 'keep_all_blocked',
        label: 'Keep all blocked',
        safe: true,
        effect: 'All three image candidates remain review-only; no public display is prepared.'
      },
      {
        id: 'open_one_source_credit_review',
        label: 'Open one source/credit review',
        safe: true,
        effect: 'Owner names exactly one image candidate for a separate provenance, license and credit review. No public-ready flag changes.'
      },
      {
        id: 'needs_more_context',
        label: 'Needs more context',
        safe: true,
        effect: 'Codex/Claude prepare a stronger source comparison before asking again.'
      }
    ];
  }
  return [
    {
      id: 'use_safe_default',
      label: 'Use safe default',
      safe: true,
      effect: `Keep batch at ${reviewCard.safe_default}.`
    },
    {
      id: 'open_separate_review',
      label: 'Open separate review',
      safe: true,
      effect: 'Prepare a separate source/provenance/reviewer task. No public-ready flag changes.'
    },
    {
      id: 'needs_more_context',
      label: 'Needs more context',
      safe: true,
      effect: 'Collect more metadata-only context before asking again.'
    }
  ];
}

function renderMarkdown(card) {
  const lines = [];
  lines.push(`# Kosmo Owner Review Card: ${card.label}`);
  lines.push('');
  lines.push(`Generated: ${card.generated_at}`);
  lines.push(`Status: \`${card.status}\``);
  lines.push('');
  lines.push('## Owner Question');
  lines.push('');
  lines.push(card.owner_question);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Batch: \`${card.batch_id}\``);
  lines.push(`- Items: ${card.summary.items}`);
  lines.push(`- Safe default: \`${card.summary.safe_default}\``);
  lines.push(`- Public-ready after card: ${card.summary.public_ready_after_card}`);
  lines.push(`- Decision effect: ${card.summary.decision_effect}`);
  lines.push('');
  lines.push('## Options');
  lines.push('');
  lines.push('| Option | Safe | Effect |');
  lines.push('| --- | --- | --- |');
  card.options.forEach((option) => {
    lines.push(`| \`${option.id}\` ${option.label} | ${option.safe ? 'yes' : 'no'} | ${option.effect} |`);
  });
  lines.push('');
  lines.push('## Items');
  lines.push('');
  lines.push('| Item | Path | Safe default | Public-ready after decision |');
  lines.push('| --- | --- | --- | --- |');
  card.items.forEach((item) => {
    lines.push(`| ${escapePipe(item.title)} | ${item.source_path ? `\`${escapePipe(item.source_path)}\`` : 'none'} | \`${item.safe_default}\` | ${item.public_ready_after_decision ? 'yes' : 'no'} |`);
  });
  lines.push('');
  lines.push('## Recommended Stance');
  lines.push('');
  card.recommended_stance.forEach((stance) => lines.push(`- ${stance}`));
  lines.push('');
  lines.push('## After Decision');
  lines.push('');
  card.after_decision.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  return `${lines.join('\n')}`;
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
