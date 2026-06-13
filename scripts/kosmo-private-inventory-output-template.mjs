#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const outputJson = resolve(root, args.out || `examples/kosmo-references/private-inventory/private-inventory-output-template-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-private-inventory-output-template-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const template = {
    schema_version: '0.1',
    created_at: new Date().toISOString(),
    status: 'private_inventory_template_only',
    policy: {
      private_content_included: false,
      copied_private_files: false,
      public_ready_after_inventory: 0,
      public_writes_allowed: false,
      long_quotes_allowed: false,
      rule: 'A private inventory output may contain metadata, fingerprints and own-written summaries only. It must not contain book/PDF text, scans, screenshots, plans, private images or public-ready approvals.'
    },
    inventory_root: '/mnt/data/ArchitekturKosmos/KosmoZentrale/sources/private-inventory',
    source_root: null,
    run_id: null,
    pilots: [
      {
        pilot_id: 'villa-savoye',
        inventory_status: 'not_started',
        metadata_counts: {
          candidate_files: 0,
          source_records: 0,
          rights_records: 0
        },
        path_fingerprints: [],
        gap_summary: '',
        rights_status: 'review_only',
        public_ready: false,
        open_questions: []
      },
      {
        pilot_id: 'kapelle-sogn-benedetg',
        inventory_status: 'not_started',
        metadata_counts: {
          candidate_files: 0,
          source_records: 0,
          rights_records: 0
        },
        path_fingerprints: [],
        gap_summary: '',
        rights_status: 'review_only',
        public_ready: false,
        open_questions: []
      },
      {
        pilot_id: 'alterszentrum-kloster-ingenbohl',
        inventory_status: 'not_started',
        metadata_counts: {
          candidate_files: 0,
          source_records: 0,
          rights_records: 0
        },
        path_fingerprints: [],
        gap_summary: '',
        rights_status: 'review_only',
        public_ready: false,
        open_questions: []
      }
    ],
    forbidden_content_guard: {
      max_summary_chars: 1200,
      max_open_question_chars: 300,
      forbidden_fields: [
        'full_text',
        'ocr_text',
        'pdf_text',
        'book_excerpt',
        'page_scan',
        'image_base64',
        'copied_plan',
        'private_image'
      ]
    },
    next_actions: [
      'Use this template only after source-root decision and private-library diagnostic pass.',
      'Write real inventory outputs under KosmoZentrale private paths.',
      'Run npm run kosmo:private-inventory-output-check -- --inventory "<private-inventory-json>" before handing results to Codex/Claude.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(template, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(template));

  console.log('Kosmo private inventory output template');
  console.log(`Status: ${template.status}`);
  console.log(`Pilots: ${template.pilots.length}`);
  console.log(`Wrote: ${relative(root, outputJson)}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function renderMarkdown(template) {
  const lines = [];
  lines.push('# Kosmo Private Inventory Output Template');
  lines.push('');
  lines.push(`Created: ${template.created_at}`);
  lines.push(`Status: \`${template.status}\``);
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  lines.push(`- Private content included: ${template.policy.private_content_included ? 'yes' : 'no'}`);
  lines.push(`- Copied private files: ${template.policy.copied_private_files ? 'yes' : 'no'}`);
  lines.push(`- Public-ready after inventory: ${template.policy.public_ready_after_inventory}`);
  lines.push(`- Long quotes allowed: ${template.policy.long_quotes_allowed ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Pilots');
  lines.push('');
  lines.push('| Pilot | Status | Rights | Public-ready |');
  lines.push('| --- | --- | --- | --- |');
  for (const pilot of template.pilots) {
    lines.push(`| ${pilot.pilot_id} | ${pilot.inventory_status} | ${pilot.rights_status} | ${pilot.public_ready ? 'yes' : 'no'} |`);
  }
  lines.push('');
  lines.push('## Forbidden Fields');
  lines.push('');
  template.forbidden_content_guard.forbidden_fields.forEach((field) => lines.push(`- \`${field}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  template.next_actions.forEach((action) => lines.push(`- ${action}`));
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
