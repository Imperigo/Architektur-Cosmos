#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-execution-runbook-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-execution-runbook-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const report = buildReport();

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo owner unlock execution runbook');
  console.log(`Status: ${report.status}`);
  console.log(`Phases: ${report.summary.phases}`);
  console.log(`Commands: ${report.summary.commands}`);
  console.log(`Manual gates: ${report.summary.manual_gates}`);
  console.log(`Public-ready after runbook: ${report.summary.public_ready_after_runbook}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildReport() {
  const phases = [
    {
      id: 'phase-1-validate-owner-reply',
      title: 'Validate explicit owner reply',
      type: 'command',
      commands: [
        'npm run kosmo:owner-unlock-reply-validator -- --answer "<owner_reply>"',
        'npm run kosmo:owner-unlock-reply-validator-check'
      ],
      stop_if: [
        'Validator status is not owner_unlock_reply_valid.',
        'Validator guard has any failure.'
      ],
      mutates_project_files: false
    },
    {
      id: 'phase-2-map-to-intake-patch',
      title: 'Map validated reply to reviewable intake patch',
      type: 'command',
      commands: [
        'npm run kosmo:owner-unlock-reply-intake-map',
        'npm run kosmo:owner-unlock-reply-intake-map-check'
      ],
      stop_if: [
        'Map status is not owner_unlock_reply_intake_map_ready_for_review.',
        'Map guard has any failure.',
        'Any proposed owner-card patch is not allowed by the template.'
      ],
      mutates_project_files: false
    },
    {
      id: 'phase-3-human-review-intake-patch',
      title: 'Review proposed intake patch before editing template',
      type: 'manual_gate',
      commands: [],
      stop_if: [
        'Claude/Codex/KosmoOverseer have not reviewed the map.',
        'Owner intent is ambiguous.',
        'The selected source-root path is not explicitly confirmed.'
      ],
      mutates_project_files: false
    },
    {
      id: 'phase-4-apply-intake-only-after-review',
      title: 'Apply reviewed fields to owner answer intake template',
      type: 'manual_or_reviewed_edit',
      commands: [
        'npm run kosmo:owner-answer-intake-check'
      ],
      stop_if: [
        'Intake guard has any failure.',
        'Filled answers do not match the reviewed map.'
      ],
      mutates_project_files: true,
      allowed_target_files: [
        'examples/kosmo-references/provenance/owner-answer-intake-template-2026-06-14.json'
      ]
    },
    {
      id: 'phase-5-plan-session-edits',
      title: 'Generate session edit plan only after intake guard passes',
      type: 'command',
      commands: [
        'npm run kosmo:owner-answer-session-edit-plan'
      ],
      stop_if: [
        'Session edit plan is blocked by intake guard.',
        'Planned edits include unexpected target files.'
      ],
      mutates_project_files: false
    },
    {
      id: 'phase-6-source-root-guards',
      title: 'Run source-root guards before private metadata diagnostics',
      type: 'conditional_command',
      condition: 'Only if reviewed intake/session plan selects source-root diagnostic.',
      commands: [
        'npm run kosmo:source-root-decision-session-check',
        'npm run kosmo:source-root-blocker-refresh',
        'npm run kosmo:source-root-activation-preflight'
      ],
      stop_if: [
        'Any source-root guard fails.',
        'Root path is missing, incomplete, or not owner-confirmed.'
      ],
      mutates_project_files: false
    },
    {
      id: 'phase-7-post-source-readiness',
      title: 'Prepare post-source metadata queue, still no public promotion',
      type: 'conditional_command',
      condition: 'Only after phase 6 passes.',
      commands: [
        'npm run kosmo:source-root-post-owner-activation-queue',
        'npm run kosmo:source-root-post-owner-activation-queue-check',
        'npm run kosmo:post-source-root-metadata-readiness-pack'
      ],
      stop_if: [
        'Any queue or readiness guard fails.',
        'Any artifact tries to mark private-derived material public-ready.'
      ],
      mutates_project_files: false
    }
  ];

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: 'owner_unlock_execution_runbook_ready',
    policy: {
      runbook_only: true,
      executes_commands_now: false,
      records_decisions: false,
      writes_intake_file_now: false,
      mutates_session_files_now: false,
      reads_private_content_now: false,
      runs_private_inventory_now: false,
      public_ready_after_runbook: 0
    },
    summary: {
      phases: phases.length,
      commands: phases.reduce((sum, phase) => sum + phase.commands.length, 0),
      manual_gates: phases.filter((phase) => phase.type.includes('manual')).length,
      phases_that_may_mutate_after_review: phases.filter((phase) => phase.mutates_project_files).length,
      public_ready_after_runbook: 0
    },
    phases,
    hard_stops: [
      'Do not run source-root private diagnostics from a merely valid reply.',
      'Do not edit intake before reviewing the intake map.',
      'Do not edit session files before the intake guard passes.',
      'Do not read private content in this runbook step.',
      'Do not mark any private-derived material public-ready.'
    ]
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Owner Unlock Execution Runbook');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Phases: ${report.summary.phases}`);
  lines.push(`- Commands: ${report.summary.commands}`);
  lines.push(`- Manual gates: ${report.summary.manual_gates}`);
  lines.push(`- Mutating phases after review: ${report.summary.phases_that_may_mutate_after_review}`);
  lines.push(`- Public-ready after runbook: ${report.summary.public_ready_after_runbook}`);
  lines.push('');
  lines.push('## Phases');
  lines.push('');
  report.phases.forEach((phase) => {
    lines.push(`### ${phase.id}`);
    lines.push('');
    lines.push(`- ${phase.title}`);
    if (phase.condition) lines.push(`- Condition: ${phase.condition}`);
    lines.push(`- Mutates project files: ${phase.mutates_project_files ? 'yes' : 'no'}`);
    if (phase.commands.length > 0) {
      lines.push('- Commands:');
      phase.commands.forEach((command) => lines.push(`  - \`${command}\``));
    }
    lines.push('- Stop if:');
    phase.stop_if.forEach((stop) => lines.push(`  - ${stop}`));
    lines.push('');
  });
  lines.push('## Hard Stops');
  lines.push('');
  report.hard_stops.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  return lines.join('\n');
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
