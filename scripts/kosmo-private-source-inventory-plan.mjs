#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const decisionCheckPath = resolve(root, args.decisionCheck || `data/kosmo-source-root-decision-session-check-${dateStamp}.json`);
const pilotMatrixPath = resolve(root, args.pilotMatrix || `data/kosmoreferences-pilot-evidence-matrix-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-private-source-inventory-plan-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-private-source-inventory-plan-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const decisionCheck = await readOptionalJson(decisionCheckPath);
  const pilotMatrix = await readOptionalJson(pilotMatrixPath);
  const diagnosticAllowed = decisionCheck?.summary?.private_diagnostic_allowed === true;
  const selectedRootPath = decisionCheck?.summary?.selected_root_path || null;
  const plan = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: diagnosticAllowed ? 'private_metadata_inventory_plan_ready' : 'private_metadata_inventory_blocked',
    policy: {
      review_only: true,
      reads_private_content: false,
      copies_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_plan: 0,
      note: 'This plan prepares the private metadata inventory sequence. It does not inspect private source contents.'
    },
    source_refs: [
      relative(root, decisionCheckPath),
      relative(root, pilotMatrixPath)
    ],
    summary: {
      source_root_decision_status: decisionCheck?.status || null,
      selected_root_path: selectedRootPath,
      selected_root_exists: decisionCheck?.summary?.selected_root_exists ?? false,
      private_diagnostic_allowed: diagnosticAllowed,
      pilot_count: pilotMatrix?.summary?.pilots ?? 3,
      pilot_gap_count: pilotMatrix?.summary?.total_gap_count ?? 12,
      public_ready_after_plan: 0
    },
    inventory_scope: [
      {
        pilot_id: 'villa-savoye',
        title: 'Villa Savoye',
        first_pass: 'metadata_only_media_plan_model_provenance',
        source_need: 'file-level provenance and build-log evidence for existing media, diagrams and low.glb',
        allowed_now: diagnosticAllowed,
        public_ready_after_inventory: false
      },
      {
        pilot_id: 'kapelle-sogn-benedetg',
        title: 'Kapelle Sogn Benedetg',
        first_pass: 'metadata_only_private_library_source_discovery',
        source_need: 'private book/ETH/HSLU references for timber structure, drawings, materials and model basis',
        allowed_now: diagnosticAllowed,
        public_ready_after_inventory: false
      },
      {
        pilot_id: 'alterszentrum-kloster-ingenbohl',
        title: 'Alterszentrum Kloster Ingenbohl',
        first_pass: 'metadata_only_pdf_and_structure_source_discovery',
        source_need: 'private/link-only study-commission PDF decision, structure/material evidence and model basis',
        allowed_now: diagnosticAllowed,
        public_ready_after_inventory: false
      }
    ],
    output_contract: {
      private_root: '/mnt/data/ArchitekturKosmos/KosmoZentrale/sources/private-inventory',
      public_repo_outputs_allowed: [
        'metadata counts',
        'file path fingerprints',
        'rights status placeholders',
        'gap summaries written in own words'
      ],
      public_repo_outputs_forbidden: [
        'book scans',
        'PDF full text',
        'protected plans or screenshots',
        'private images',
        'long quotations',
        'public-ready promotion flags'
      ]
    },
    next_actions: diagnosticAllowed
      ? [
          `Run npm run kosmo:private-library-diagnostic -- --roots "${selectedRootPath}"`,
          'Create a private metadata-only inventory folder under KosmoZentrale.',
          'Inventory pilots first, not the whole library.',
          'Return only counts, paths, fingerprints and own-written gap summaries to Git.'
        ]
      : [
          'Keep private inventory blocked.',
          'Record a source-root decision session and rerun npm run kosmo:source-root-decision-session-check.',
          'Only continue when private_diagnostic_allowed=true.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(plan));

  console.log('Kosmo private source inventory plan');
  console.log(`Status: ${plan.status}`);
  console.log(`Private diagnostic allowed: ${diagnosticAllowed}`);
  console.log(`Public-ready after plan: ${plan.summary.public_ready_after_plan}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(plan) {
  const lines = [];
  lines.push('# Kosmo Private Source Inventory Plan');
  lines.push('');
  lines.push(`Generated: ${plan.generated_at}`);
  lines.push(`Status: \`${plan.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Source-root decision status: ${plan.summary.source_root_decision_status}`);
  lines.push(`- Selected root path: ${plan.summary.selected_root_path ? `\`${plan.summary.selected_root_path}\`` : 'pending'}`);
  lines.push(`- Selected root exists: ${plan.summary.selected_root_exists ? 'yes' : 'no'}`);
  lines.push(`- Private diagnostic allowed: ${plan.summary.private_diagnostic_allowed ? 'yes' : 'no'}`);
  lines.push(`- Pilot count: ${plan.summary.pilot_count}`);
  lines.push(`- Pilot gaps: ${plan.summary.pilot_gap_count}`);
  lines.push(`- Public-ready after plan: ${plan.summary.public_ready_after_plan}`);
  lines.push('');
  lines.push('## Inventory Scope');
  lines.push('');
  lines.push('| Pilot | First pass | Allowed now | Source need |');
  lines.push('| --- | --- | --- | --- |');
  for (const item of plan.inventory_scope) {
    lines.push(`| ${item.title} | \`${item.first_pass}\` | ${item.allowed_now ? 'yes' : 'no'} | ${escapePipe(item.source_need)} |`);
  }
  lines.push('');
  lines.push('## Output Contract');
  lines.push('');
  lines.push(`Private root: \`${plan.output_contract.private_root}\``);
  lines.push('');
  lines.push('Allowed in Git/public repo:');
  plan.output_contract.public_repo_outputs_allowed.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('Forbidden in Git/public repo:');
  plan.output_contract.public_repo_outputs_forbidden.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  plan.next_actions.forEach((action) => lines.push(`- ${action}`));
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
