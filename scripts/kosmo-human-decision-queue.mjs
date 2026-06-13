#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const referencesSessionPath = resolve(root, args.referencesSession || 'examples/kosmo-references/provenance/owner-review-decision-session-2026-06-13.json');
const assetSessionPath = resolve(root, args.assetSession || 'examples/kosmo-assets/kosmoreferences-pilot-seed-library-2026-06-13/review/asset-human-review-session.generated.json');
const outputJson = resolve(root, args.out || `data/kosmo-human-decision-queue-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-human-decision-queue-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const referencesSession = JSON.parse(await readFile(referencesSessionPath, 'utf8'));
  const assetSession = JSON.parse(await readFile(assetSessionPath, 'utf8'));
  const referenceItems = referenceQueueItems(referencesSession);
  const assetItems = assetQueueItems(assetSession);
  const items = [...referenceItems, ...assetItems];
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: items.some((item) => item.status === 'open')
      ? 'human_decision_queue_open'
      : 'human_decision_queue_clear',
    policy: {
      records_decisions: false,
      public_writes_allowed: false,
      public_ready_after_queue: 0,
      note: 'This queue consolidates pending human decisions only. It does not apply decisions, approve assets, promote media, upload files or write public manifests.'
    },
    source_paths: {
      references_session: relative(root, referencesSessionPath),
      asset_session: relative(root, assetSessionPath)
    },
    summary: {
      total_items: items.length,
      open_items: items.filter((item) => item.status === 'open').length,
      reference_items: referenceItems.length,
      asset_items: assetItems.length,
      public_ready_after_queue: 0,
      groups: countBy(items.map((item) => item.group)),
      safe_defaults: countBy(items.map((item) => item.safe_default))
    },
    items,
    next_actions: [
      'Owner resolves reference decisions in the owner decision worksheet/session.',
      'Human reviewer resolves asset reviews in asset-human-review-session.generated.md or records explicit local decisions.',
      'Re-run the relevant session checks after any human decision edit.',
      'Keep public-ready assets at 0 until separate promotion reviews pass.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo human decision queue');
  console.log(`Status: ${report.status}`);
  console.log(`Items: ${report.summary.open_items}/${report.summary.total_items} open`);
  console.log(`References: ${report.summary.reference_items}`);
  console.log(`Assets: ${report.summary.asset_items}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function referenceQueueItems(session) {
  return (session.decisions || []).map((item, index) => {
    const selected = item.selected_decision || null;
    return {
      id: `reference:${item.group_id || 'unknown'}:${item.item_id || index + 1}`,
      lane: 'KosmoReferences',
      group: item.group_id || 'unknown',
      title: item.item_id || `Reference decision ${index + 1}`,
      status: selected ? 'recorded' : 'open',
      prompt: item.decision_prompt || 'Owner decision required.',
      source_path: item.source_path || null,
      safe_default: item.recommended_safe_default || 'needs_more_source_context',
      selected_decision: selected,
      allowed_decisions: session.allowed_decisions || [],
      public_ready_after_decision: Boolean(item.public_ready_after_decision),
      command_hint: 'Edit owner-review-decision-session-2026-06-13.json, then run npm run kosmo:owner-decision-session-check.'
    };
  });
}

function assetQueueItems(session) {
  return (session.assets || []).map((asset) => {
    const human = asset.human_session || {};
    const selected = human.final_decision_recorded ? human.proposed_decision || 'recorded' : null;
    return {
      id: `asset:${asset.id}:${asset.primary_route || 'route'}`,
      lane: 'KosmoAsset',
      group: asset.category || asset.asset_type || 'asset',
      title: asset.title || asset.id,
      status: selected ? 'recorded' : 'open',
      prompt: `Complete human review for ${asset.title || asset.id} on route ${asset.primary_route || 'unknown'}.`,
      source_path: asset.id || null,
      safe_default: human.proposed_decision || 'needs-review',
      selected_decision: selected,
      allowed_decisions: (asset.decision_options || []).map((option) => option.decision),
      public_ready_after_decision: false,
      blockers: asset.blockers || [],
      checklist_open: (human.checklist || []).filter((check) => check.status !== 'passed').length,
      command_hint: asset.commands?.record_needs_review || 'Record only explicit human decisions with kosmo:asset-review-decision.'
    };
  });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Human Decision Queue');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Open items: ${report.summary.open_items}/${report.summary.total_items}`);
  lines.push(`- Reference items: ${report.summary.reference_items}`);
  lines.push(`- Asset items: ${report.summary.asset_items}`);
  lines.push(`- Public-ready after queue: ${report.summary.public_ready_after_queue}`);
  lines.push('');
  lines.push('## Queue');
  lines.push('');
  lines.push('| Lane | Group | Item | Safe default | Status |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const item of report.items) {
    lines.push(`| ${escapePipe(item.lane)} | ${escapePipe(item.group)} | ${escapePipe(item.title)} | ${escapePipe(item.safe_default)} | ${item.status} |`);
  }
  lines.push('');
  lines.push('## Details');
  for (const item of report.items) {
    lines.push('');
    lines.push(`### ${item.lane}: ${item.title}`);
    lines.push('');
    lines.push(`- Queue id: \`${item.id}\``);
    lines.push(`- Group: \`${item.group}\``);
    lines.push(`- Status: \`${item.status}\``);
    lines.push(`- Prompt: ${item.prompt}`);
    lines.push(`- Source/path: ${item.source_path ? `\`${item.source_path}\`` : 'none'}`);
    lines.push(`- Safe default: \`${item.safe_default}\``);
    lines.push(`- Allowed decisions: ${item.allowed_decisions.map((decision) => `\`${decision}\``).join(', ') || '-'}`);
    if (item.checklist_open !== undefined) lines.push(`- Open checklist items: ${item.checklist_open}`);
    if (item.blockers?.length) lines.push(`- Blockers: ${item.blockers.map((blocker) => `\`${blocker}\``).join(', ')}`);
    lines.push(`- Public-ready after decision: ${item.public_ready_after_decision ? 'yes' : 'no'}`);
    lines.push(`- Command hint: \`${item.command_hint}\``);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    const key = value || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
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
