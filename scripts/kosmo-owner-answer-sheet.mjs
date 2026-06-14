#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const sourceRootSessionPath = resolve(
  root,
  args.sourceRootSession || `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`
);
const ownerCardSetPath = resolve(root, args.ownerCardSet || `data/kosmo-owner-review-card-set-${dateStamp}.json`);
const ownerDecisionSessionPath = resolve(
  root,
  args.ownerDecisionSession || 'examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json'
);
const sourceRootSelectionBriefPath = resolve(
  root,
  args.sourceRootSelectionBrief || `data/kosmo-source-root-selection-brief-${dateStamp}.json`
);
const outputJson = resolve(root, args.out || `data/kosmo-owner-answer-sheet-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-answer-sheet-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sourceRootSession = JSON.parse(await readFile(sourceRootSessionPath, 'utf8'));
  const ownerCardSet = JSON.parse(await readFile(ownerCardSetPath, 'utf8'));
  const ownerDecisionSession = JSON.parse(await readFile(ownerDecisionSessionPath, 'utf8'));
  const sourceRootSelectionBrief = await readOptionalJson(sourceRootSelectionBriefPath);
  const sourceRootOptions = sourceRootSelectionBrief?.selection_options || sourceRootSession.selection_options;

  const sheet = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'owner_answer_sheet_ready',
    policy: {
      records_decisions: false,
      writes_session_files: false,
      public_ready_after_sheet: 0,
      safe_default_when_unanswered: 'keep existing null decisions and review-only blockers',
      note: 'This sheet is a question and answer capture aid only. It does not modify decision sessions.'
    },
    source_refs: [
      relative(root, sourceRootSessionPath),
      relative(root, ownerCardSetPath),
      relative(root, ownerDecisionSessionPath),
      relative(root, sourceRootSelectionBriefPath)
    ],
    summary: {
      source_root_decision_status: sourceRootSession.status,
      source_root_allowed_decisions: sourceRootSession.allowed_decisions.length,
      source_root_options: sourceRootOptions.length,
      source_root_options_source: sourceRootSelectionBrief ? 'source_root_selection_brief' : 'source_root_decision_session',
      owner_cards: ownerCardSet.summary.cards,
      owner_card_items: ownerCardSet.summary.open_items,
      owner_reference_decisions: ownerDecisionSession.decisions.length,
      public_ready_after_sheet: 0
    },
    sections: [
      buildSourceRootSection(sourceRootSession, sourceRootOptions),
      buildOwnerCardsSection(ownerCardSet),
      buildReferenceDecisionSection(ownerDecisionSession)
    ],
    next_actions_after_owner_answers: [
      `Record source-root answers in examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json only after owner confirmation.`,
      'Run npm run kosmo:source-root-decision-session-check after source-root answers are recorded.',
      'Record reference owner answers in examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json only after owner confirmation.',
      'Run npm run kosmo:owner-decision-session-check after reference answers are recorded.',
      'Keep KosmoAsset human reviews separate from reference owner decisions.',
      'Rerun npm run kosmo:data-lane-sweep and npm run kosmo:data-lane-command-router after any recorded decision.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(sheet, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(sheet));

  console.log('Kosmo owner answer sheet');
  console.log(`Status: ${sheet.status}`);
  console.log(`Owner cards: ${sheet.summary.owner_cards}/${sheet.summary.owner_card_items}`);
  console.log(`Source-root options: ${sheet.summary.source_root_options}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildSourceRootSection(session, sourceRootOptions) {
  return {
    id: 'source-root-decision',
    title: 'Source-Root Decision',
    purpose: 'Select or keep blocked the true private book/ETH/HSLU source root before any private inventory.',
    allowed_decisions: session.allowed_decisions,
    current_selected_decision: session.selected_decision,
    current_selected_root_path: session.selected_root_path,
    safe_default: 'keep_blocked',
    blocked_until_recorded_selection: session.blocked_until_recorded_selection,
    answer_fields: [
      { field: 'selected_decision', allowed_values: session.allowed_decisions },
      { field: 'selected_root_path', allowed_values: ['absolute local path or null'] },
      { field: 'owner_note', allowed_values: ['short free text'] }
    ],
    top_options: sourceRootOptions.map((option) => ({
      id: option.id,
      path: option.path,
      classification: option.classification,
      role_guess: option.role_guess || null,
      recommended_action: option.recommended_action,
      safe_default: option.safe_default
    }))
  };
}

function buildOwnerCardsSection(cardSet) {
  return {
    id: 'owner-review-cards',
    title: 'Owner Review Cards',
    purpose: 'Review one card at a time; unanswered cards stay at safe default.',
    public_ready_after_section: 0,
    cards: cardSet.cards.map((card) => ({
      batch_id: card.batch_id,
      label: card.label,
      question: card.owner_question,
      items: card.items,
      safe_default: card.safe_default,
      options: card.options,
      public_ready_after_card: card.public_ready_after_card
    }))
  };
}

function buildReferenceDecisionSection(session) {
  return {
    id: 'reference-owner-decisions',
    title: 'Reference Owner Decisions',
    purpose: 'Map later owner answers to existing decision-session items without applying them here.',
    allowed_decisions: session.allowed_decisions,
    public_ready_after_section: 0,
    decisions: session.decisions.map((decision) => ({
      group_id: decision.group_id,
      item_id: decision.item_id,
      prompt: decision.decision_prompt,
      safe_default: decision.recommended_safe_default,
      current_selected_decision: decision.selected_decision,
      public_ready_after_decision: decision.public_ready_after_decision
    }))
  };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(sheet) {
  const sourceRoot = sheet.sections.find((section) => section.id === 'source-root-decision');
  const cards = sheet.sections.find((section) => section.id === 'owner-review-cards');
  const decisions = sheet.sections.find((section) => section.id === 'reference-owner-decisions');
  const lines = [];

  lines.push('# Kosmo Owner Answer Sheet');
  lines.push('');
  lines.push(`Generated: ${sheet.generated_at}`);
  lines.push(`Status: \`${sheet.status}\``);
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  lines.push('- This sheet records no decisions.');
  lines.push('- It does not edit source-root or owner-review session files.');
  lines.push('- Public-ready after sheet: 0.');
  lines.push('- Unanswered items stay blocked/review-only.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Source-root options: ${sheet.summary.source_root_options}`);
  lines.push(`- Source-root options source: ${sheet.summary.source_root_options_source}`);
  lines.push(`- Owner cards: ${sheet.summary.owner_cards}`);
  lines.push(`- Owner card items: ${sheet.summary.owner_card_items}`);
  lines.push(`- Reference decision items: ${sheet.summary.owner_reference_decisions}`);
  lines.push('');
  lines.push('## 1. Source-Root Answer');
  lines.push('');
  lines.push(`Safe default: \`${sourceRoot.safe_default}\``);
  lines.push('');
  lines.push('Allowed decisions:');
  sourceRoot.allowed_decisions.forEach((decision) => lines.push(`- \`${decision}\``));
  lines.push('');
  lines.push('Answer fields:');
  lines.push('');
  lines.push('```text');
  lines.push('selected_decision:');
  lines.push('selected_root_path:');
  lines.push('owner_note:');
  lines.push('```');
  lines.push('');
  lines.push('Top options:');
  for (const option of sourceRoot.top_options) {
    lines.push(`- \`${option.id}\` - ${option.path || 'no path'} - ${option.classification}${option.role_guess ? `/${option.role_guess}` : ''} - ${option.safe_default}`);
  }
  lines.push('');
  lines.push('Blocked until recorded selection:');
  sourceRoot.blocked_until_recorded_selection.forEach((item) => lines.push(`- \`${item}\``));
  lines.push('');
  lines.push('## 2. Owner Review Cards');
  for (const card of cards.cards) {
    lines.push('');
    lines.push(`### ${card.label}`);
    lines.push('');
    lines.push(card.question);
    lines.push('');
    lines.push(`- Batch: \`${card.batch_id}\``);
    lines.push(`- Items: ${card.items}`);
    lines.push(`- Safe default: \`${card.safe_default}\``);
    lines.push(`- Public-ready after card: ${card.public_ready_after_card}`);
    lines.push(`- Options: ${card.options.map((option) => `\`${option}\``).join(', ')}`);
    lines.push('');
    lines.push('```text');
    lines.push('owner_choice:');
    lines.push('owner_note:');
    lines.push('```');
  }
  lines.push('');
  lines.push('## 3. Existing Reference Decision Items');
  lines.push('');
  lines.push('These are the session items that can later receive owner decisions.');
  lines.push('');
  for (const decision of decisions.decisions) {
    lines.push(`- \`${decision.item_id}\` (${decision.group_id}) - safe default \`${decision.safe_default}\` - selected: ${decision.current_selected_decision || 'null'}`);
  }
  lines.push('');
  lines.push('## Next Actions After Owner Answers');
  lines.push('');
  sheet.next_actions_after_owner_answers.forEach((action) => lines.push(`- ${action}`));
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
