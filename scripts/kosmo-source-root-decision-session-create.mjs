#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const briefPath = resolve(root, args.brief || `data/kosmo-source-root-selection-brief-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-decision-session-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const brief = JSON.parse(await readFile(briefPath, 'utf8'));
  const session = {
    schema_version: '0.1',
    created_at: new Date().toISOString(),
    status: 'source_root_decision_session_pending',
    source_refs: [relative(root, briefPath), ...(brief.source_refs || [])],
    policy: {
      auto_inventory: false,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_session: 0,
      selected_root_required_before_inventory: true,
      rule: 'This session records the owner/overseer source-root decision only. It never reads, copies, ingests or approves private source content.'
    },
    allowed_decisions: [
      'keep_blocked',
      'mount_archive_first',
      'repair_onedrive_first',
      'select_existing_root_for_private_diagnostic',
      'select_root_after_mount_check'
    ],
    selected_decision: null,
    selected_root_path: null,
    owner_note: '',
    diagnostic_command_after_recorded_selection: 'npm run kosmo:private-library-diagnostic -- --roots "<selected-root>"',
    selection_options: (brief.selection_options || []).map((option) => ({
      id: option.id,
      path: option.path,
      classification: option.classification,
      score: option.score,
      recommended_action: option.recommended_action,
      safe_default: option.safe_default
    })),
    blocked_until_recorded_selection: brief.blocked_until_selection || [
      'sogn_private_source_inventory',
      'ingenbohl_pdf_private_extraction',
      'source_dependent_asset_authoring',
      'public_ready_promotion_from_private_sources'
    ],
    next_actions: [
      'Owner/Claude/KosmoOverseer sets selected_decision and, if selecting a root, selected_root_path.',
      'Run npm run kosmo:source-root-decision-session-check.',
      'Only after a passing recorded selection may Codex/Claude run the private-library diagnostic against the selected root.',
      'Keep all source-dependent public-ready states at 0 until later provenance and rights reviews pass.'
    ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(session, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(session));

  console.log('Kosmo source-root decision session create');
  console.log(`Status: ${session.status}`);
  console.log(`Options: ${session.selection_options.length}`);
  console.log(`Wrote: ${relative(root, outputJson)}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function renderMarkdown(session) {
  const lines = [];
  lines.push('# Kosmo Source-Root Decision Session');
  lines.push('');
  lines.push(`Created: ${session.created_at}`);
  lines.push(`Status: \`${session.status}\``);
  lines.push('');
  lines.push('## Decision Fields');
  lines.push('');
  lines.push(`- Selected decision: \`${session.selected_decision || 'pending'}\``);
  lines.push(`- Selected root path: ${session.selected_root_path ? `\`${session.selected_root_path}\`` : '`pending`'}`);
  lines.push(`- Public-ready after session: ${session.policy.public_ready_after_session}`);
  lines.push('');
  lines.push('## Allowed Decisions');
  lines.push('');
  session.allowed_decisions.forEach((decision) => lines.push(`- \`${decision}\``));
  lines.push('');
  lines.push('## Selection Options');
  lines.push('');
  lines.push('| Option | Classification | Score | Path | Safe default |');
  lines.push('| --- | --- | ---: | --- | --- |');
  for (const option of session.selection_options) {
    lines.push(`| \`${option.id}\` | ${option.classification} | ${option.score ?? '-'} | ${option.path ? `\`${escapePipe(option.path)}\`` : '-' } | ${option.safe_default} |`);
  }
  lines.push('');
  lines.push('## Blocked Until Recorded Selection');
  lines.push('');
  session.blocked_until_recorded_selection.forEach((item) => lines.push(`- \`${item}\``));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  session.next_actions.forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('This session is metadata-only. It does not authorize private extraction, PDF ingestion, public-ready flags or source-dependent asset promotion.');
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
