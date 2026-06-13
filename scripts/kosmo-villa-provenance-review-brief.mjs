#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const packPath = resolve(root, args.pack || 'examples/kosmo-references/provenance/villa-savoye-public-promotion-review-pack-2026-06-13.json');
const outputJson = resolve(root, args.out || `data/villa-savoye-provenance-review-brief-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/villa-savoye-provenance-review-brief-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pack = JSON.parse(await readFile(packPath, 'utf8'));
  const candidates = pack.review_items.filter((item) => item.review_recommendation === 'candidate_for_public_display_after_human_review');
  const blocked = pack.review_items.filter((item) => item.review_recommendation !== 'candidate_for_public_display_after_human_review');
  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'villa_provenance_review_brief_ready',
    policy: {
      review_only: true,
      public_ready_changes_allowed: false,
      public_ready_after_brief: 0,
      note: 'This brief summarizes an existing review pack. It does not approve public display, mutate manifests, upload assets or copy source bodies.'
    },
    source_pack: relative(root, packPath),
    summary: {
      review_items: pack.summary?.review_items ?? pack.review_items.length,
      candidate_promotions: candidates.length,
      must_remain_blocked: blocked.length,
      public_ready_after_pack: pack.summary?.public_ready_after_pack ?? 0,
      attribution_required_candidates: candidates.filter((item) => item.attribution_required).length
    },
    candidate_items: candidates.map((item) => ({
      file_id: item.file_id,
      recommendation: item.review_recommendation,
      rights_basis: item.rights_basis,
      attribution_required: Boolean(item.attribution_required),
      conditions_to_confirm: item.conditions_to_confirm,
      public_ready: Boolean(item.public_ready)
    })),
    blocked_items: blocked.map((item) => ({
      file_id: item.file_id,
      recommendation: item.review_recommendation,
      rights_basis: item.rights_basis,
      conditions_to_confirm: item.conditions_to_confirm,
      public_ready: Boolean(item.public_ready)
    })),
    next_actions: [
      'Use this brief for a later owner/source-rights review conversation, not as approval.',
      'Keep all four derived or unmatched Villa files blocked until source-basis/build-log review exists.',
      'If any candidate is accepted later, create a separate manifest change and rerun file provenance, rights candidate and data-lane sweep checks.',
      'Keep public_ready_after_brief at 0.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Villa Savoye provenance review brief');
  console.log(`Status: ${report.status}`);
  console.log(`Candidates: ${report.summary.candidate_promotions}`);
  console.log(`Blocked: ${report.summary.must_remain_blocked}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Villa Savoye Provenance Review Brief');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Review items: ${report.summary.review_items}`);
  lines.push(`- Candidate promotions for later human review: ${report.summary.candidate_promotions}`);
  lines.push(`- Must remain blocked: ${report.summary.must_remain_blocked}`);
  lines.push(`- Attribution-required candidates: ${report.summary.attribution_required_candidates}`);
  lines.push(`- Public-ready after brief: ${report.summary.public_ready_after_pack}`);
  lines.push('');
  lines.push('## Candidate Items');
  lines.push('');
  lines.push('| File | Rights basis | Attribution | Public-ready now |');
  lines.push('| --- | --- | --- | --- |');
  for (const item of report.candidate_items) {
    lines.push(`| \`${item.file_id}\` | ${escapePipe(item.rights_basis)} | ${item.attribution_required ? 'required' : 'not required'} | ${item.public_ready ? 'yes' : 'no'} |`);
  }
  lines.push('');
  lines.push('## Blocked Items');
  lines.push('');
  lines.push('| File | Reason | Public-ready now |');
  lines.push('| --- | --- | --- |');
  for (const item of report.blocked_items) {
    lines.push(`| \`${item.file_id}\` | ${escapePipe(item.rights_basis)} | ${item.public_ready ? 'yes' : 'no'} |`);
  }
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('No public flags are changed by this brief. A later acceptance still needs a separate manifest change plus file provenance, rights candidate and data-lane sweep checks.');
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
