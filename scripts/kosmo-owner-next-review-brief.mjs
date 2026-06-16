#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const batchesPath = resolve(root, args.batches || `data/kosmo-human-decision-owner-batches-${dateStamp}.json`);
const routerPath = resolve(root, args.router || `data/kosmo-data-lane-command-router-${dateStamp}.json`);
const resolutionLedgerPath = resolve(root, args.resolutionLedger || `data/kosmo-owner-review-batch-resolution-ledger-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-owner-next-review-brief-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-next-review-brief-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const batches = JSON.parse(await readFile(batchesPath, 'utf8'));
  const router = JSON.parse(await readFile(routerPath, 'utf8'));
  const resolutionLedger = await readOptionalJson(resolutionLedgerPath);
  const resolvedBatchIds = new Set((resolutionLedger?.resolutions || [])
    .filter((resolution) => resolution.resolution_status === 'triaged_review_only')
    .map((resolution) => resolution.batch_id));
  const openBatches = (batches.batches || []).filter((batch) => batch.open_items > 0 && !resolvedBatchIds.has(batch.id));
  const resolvedBatches = (batches.batches || []).filter((batch) => resolvedBatchIds.has(batch.id));
  const reviewCards = [
    ...openBatches.map((batch, index) => buildReviewCard(batch, index + 1)),
    ...resolvedBatches.map((batch, index) => buildReviewCard(batch, openBatches.length + index + 1, true))
  ];
  const resolvedItems = (resolutionLedger?.resolutions || [])
    .filter((resolution) => resolution.resolution_status === 'triaged_review_only')
    .reduce((sum, resolution) => sum + (resolution.resolved_item_count || 0), 0);
  const brief = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: openBatches.length > 0 ? 'owner_next_review_brief_open' : 'owner_next_review_brief_clear',
    policy: {
      records_decisions: false,
      public_writes_allowed: false,
      public_ready_after_brief: 0,
      note: 'This brief prepares owner questions only. It does not record decisions, approve public display, promote assets or modify manifests.'
    },
    source_refs: [
      relative(root, batchesPath),
      relative(root, routerPath),
      relative(root, resolutionLedgerPath)
    ],
    summary: {
      open_batches: openBatches.length,
      open_items: Math.max(0, (batches.summary?.open_items ?? reviewCards.reduce((sum, card) => sum + card.open_items, 0)) - resolvedItems),
      resolved_batches_review_only: resolvedBatchIds.size,
      resolved_items_review_only: resolvedItems,
      resolution_ledger_status: resolutionLedger?.status || null,
      router_status: router.status,
      private_diagnostic_allowed: router.summary?.private_diagnostic_allowed === true,
      private_inventory_allowed: router.summary?.private_inventory_allowed === true,
      public_ready_after_brief: 0
    },
    recommended_order: reviewCards.map((card) => card.batch_id),
    review_cards: reviewCards,
    safe_default_if_owner_unavailable: 'keep_all_open_items_blocked_or_needs_review',
    next_actions: [
      'Present one review card at a time to the owner.',
      'If owner is unavailable, keep safe defaults and do not apply decisions.',
      'After owner records reference choices, run npm run kosmo:owner-decision-session-check.',
      'After asset reviewer choices, rerun npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json.',
      'Always rerun npm run kosmo:data-lane-sweep and npm run kosmo:data-lane-command-router after decision edits.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(brief, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(brief));

  console.log('Kosmo owner next review brief');
  console.log(`Status: ${brief.status}`);
  console.log(`Open batches: ${brief.summary.open_batches}`);
  console.log(`Open items: ${brief.summary.open_items}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReviewCard(batch, order, resolvedReviewOnly = false) {
  const safeDefault = dominantSafeDefault(batch.safe_defaults || {});
  return {
    order,
    batch_id: batch.id,
    label: batch.label,
    intent: batch.intent,
    open_items: resolvedReviewOnly ? 0 : batch.open_items,
    resolved_review_only: resolvedReviewOnly,
    safe_default: safeDefault,
    recommended_owner_question: ownerQuestion(batch, safeDefault),
    recommended_stance: batch.recommended_stance || [],
    decision_effect: resolvedReviewOnly
      ? 'This card has already been triaged review-only; no public-ready changes are allowed.'
      : 'No public-ready changes are allowed from this card; any positive direction opens or confirms a separate reviewed step.',
    command_hint_after_decision: commandHint(batch),
    items: (batch.items || []).map((item) => ({
      id: item.id,
      lane: item.lane,
      title: item.title,
      safe_default: item.safe_default,
      source_path: item.source_path,
      public_ready_after_decision: Boolean(item.public_ready_after_decision)
    }))
  };
}

function ownerQuestion(batch, safeDefault) {
  if (batch.id.includes('villa-savoye-image')) {
    return 'Soll Villa Savoye Bildmaterial nur blockiert bleiben, oder soll genau ein Bild in eine separate Quellen-/Credit-Pruefung?';
  }
  if (batch.id.includes('villa-savoye-derived')) {
    return 'Sollen alle abgeleiteten Villa-Dateien blockiert bleiben, bis Plan-/Modell-Herkunft sauber belegt ist?';
  }
  if (batch.id.includes('model-promotion')) {
    return 'Sollen die vorhandenen Modelle weiterhin als diagrammatische Studien blockiert bleiben, bis Modellqualitaet und Quellenbasis geprueft sind?';
  }
  if (batch.id.includes('sogn')) {
    return 'Soll Sogn Benedetg link-only bleiben, bis der echte private Bibliotheks-Root sichtbar ist?';
  }
  if (batch.id.includes('kosmoasset')) {
    return 'Welche lokalen Study-Assets sollen ein Human Review bekommen, ohne Public-Promotion zu erlauben?';
  }
  return `Soll dieser Batch mit Safe Default ${safeDefault} offen/blockiert bleiben oder in eine separate Review-Schiene?`;
}

function commandHint(batch) {
  if ((batch.items || []).some((item) => item.lane === 'KosmoAsset')) {
    return 'npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/library.json';
  }
  return 'npm run kosmo:owner-decision-session-check';
}

function dominantSafeDefault(counts) {
  const entries = Object.entries(counts);
  if (entries.length === 0) return 'needs_review';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(brief) {
  const lines = [];
  lines.push('# Kosmo Owner Next Review Brief');
  lines.push('');
  lines.push(`Generated: ${brief.generated_at}`);
  lines.push(`Status: \`${brief.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Open batches: ${brief.summary.open_batches}`);
  lines.push(`- Open items: ${brief.summary.open_items}`);
  lines.push(`- Resolved review-only batches: ${brief.summary.resolved_batches_review_only}`);
  lines.push(`- Resolved review-only items: ${brief.summary.resolved_items_review_only}`);
  lines.push(`- Resolution ledger: ${brief.summary.resolution_ledger_status || 'none'}`);
  lines.push(`- Router: ${brief.summary.router_status}`);
  lines.push(`- Private diagnostic allowed: ${brief.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Private inventory allowed: ${brief.summary.private_inventory_allowed ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after brief: ${brief.summary.public_ready_after_brief}`);
  lines.push('');
  lines.push('## Review Cards');
  for (const card of brief.review_cards) {
    lines.push('');
    lines.push(`### ${card.order}. ${card.label}`);
    lines.push('');
    lines.push(`Intent: ${card.intent}`);
    lines.push('');
    lines.push(`Owner question: ${card.recommended_owner_question}`);
    lines.push('');
    lines.push(`Open items: ${card.open_items}`);
    lines.push(`Safe default: \`${card.safe_default}\``);
    lines.push(`Decision effect: ${card.decision_effect}`);
    lines.push(`Command after decision: \`${card.command_hint_after_decision}\``);
    lines.push('');
    lines.push('Recommended stance:');
    card.recommended_stance.forEach((stance) => lines.push(`- ${stance}`));
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  brief.next_actions.forEach((action) => lines.push(`- ${action}`));
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
