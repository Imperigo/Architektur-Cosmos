#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  operationalStartCard: resolve(root, args.operationalStartCard || `data/kosmo-owner-unlock-operational-start-card-${dateStamp}.json`),
  pipelineCheckpoint: resolve(root, args.pipelineCheckpoint || `data/kosmo-owner-unlock-pipeline-checkpoint-${dateStamp}.json`),
  sessionEditPreview: resolve(root, args.sessionEditPreview || `data/kosmo-owner-unlock-session-edit-preview-${dateStamp}.json`),
  postOwnerQueue: resolve(root, args.postOwnerQueue || `data/kosmo-source-root-post-owner-activation-queue-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-owner-unlock-execution-runbook-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-owner-unlock-execution-runbook-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readOptionalJson(path);
  const report = buildReport(reports);

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

function buildReport(reports) {
  const exactOwnerReply = reports.operationalStartCard?.exact_owner_reply_template || '<owner_reply>';
  const expectedSessionFile = reports.operationalStartCard?.summary?.expected_session_file ||
    `examples/kosmo-references/provenance/source-root-decision-session-${dateStamp}.json`;
  const selectedRoot = reports.operationalStartCard?.summary?.selected_root_path_preview ||
    reports.sessionEditPreview?.summary?.selected_root_path ||
    null;
  const phases = [
    {
      id: 'phase-1-start-card-and-checkpoint',
      title: 'Open the current operational start card and checkpoint',
      type: 'command',
      commands: [
        'npm run kosmo:owner-unlock-operational-start-card',
        'npm run kosmo:owner-unlock-operational-start-card-check',
        'npm run kosmo:owner-unlock-pipeline-checkpoint',
        'npm run kosmo:owner-unlock-pipeline-checkpoint-check'
      ],
      stop_if: [
        'Operational start card guard has any failure.',
        'Pipeline checkpoint is not owner_unlock_pipeline_checkpoint_ready.',
        'The start card does not point to the current source-root session file.'
      ],
      mutates_project_files: false
    },
    {
      id: 'phase-2-validate-exact-owner-reply',
      title: 'Validate explicit owner reply',
      type: 'command',
      commands: [
        `npm run kosmo:owner-unlock-reply-validator -- --answer "${exactOwnerReply}"`,
        'npm run kosmo:owner-unlock-reply-validator-check'
      ],
      stop_if: [
        'Validator status is not owner_unlock_reply_valid.',
        'Validator guard has any failure.',
        'The owner reply is broad/freeform rather than exact key-value text.'
      ],
      mutates_project_files: false
    },
    {
      id: 'phase-3-dry-run-and-patch-preview',
      title: 'Dry-run the exact reply and preview patch effects',
      type: 'command',
      commands: [
        `npm run kosmo:owner-unlock-answer-dry-run -- --answer "${exactOwnerReply}"`,
        'npm run kosmo:owner-unlock-exact-reply-preview-check',
        'npm run kosmo:owner-unlock-patch-review-bundle',
        'npm run kosmo:owner-unlock-patch-review-bundle-check'
      ],
      stop_if: [
        'Answer dry-run is not ready for review.',
        'Patch review bundle has any failure.',
        'Any patch writes intake/session files now.'
      ],
      mutates_project_files: false
    },
    {
      id: 'phase-4-review-session-edit-preview',
      title: 'Review current session edit preview before any session edit',
      type: 'manual_gate',
      commands: [
        'npm run kosmo:owner-unlock-session-edit-preview',
        'npm run kosmo:owner-unlock-session-edit-preview-check'
      ],
      stop_if: [
        'Session edit preview guard has any failure.',
        'Preview target is not the current source-root decision session file.',
        'Preview would write now or change public-ready.'
      ],
      mutates_project_files: false,
      expected_target_file: expectedSessionFile
    },
    {
      id: 'phase-5-apply-reviewed-source-root-session-only',
      title: 'Apply exactly the reviewed source-root session fields',
      type: 'manual_or_reviewed_edit',
      commands: [],
      stop_if: [
        'Exact owner reply is not present in normal chat.',
        'Claude/Codex/KosmoOverseer have not reviewed the session preview.',
        'Target file is not the current source-root decision session.',
        'Proposed root path is not the selected root preview.'
      ],
      mutates_project_files: true,
      allowed_target_files: [
        expectedSessionFile
      ],
      expected_selected_root_path: selectedRoot,
      public_ready_after_edit: 0
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
        'Root path is missing, incomplete, or not owner-confirmed.',
        'Activation preflight is interpreted as public promotion.'
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
        'npm run kosmo:source-root-post-owner-activation-queue-check'
      ],
      stop_if: [
        'Any queue or readiness guard fails.',
        'Queue still shows executable_now=0 after the reviewed session edit should have been applied.',
        'Any artifact tries to mark private-derived material public-ready.'
      ],
      mutates_project_files: false
    },
    {
      id: 'phase-8-private-metadata-only-if-queue-unblocks',
      title: 'Run private metadata only if the guarded queue makes it executable',
      type: 'conditional_command',
      condition: 'Only after phase 7 reports activation_ready=true and private_metadata_inventory executable_now=true.',
      commands: [
        'npm run kosmo:private-metadata-inventory',
        'npm run kosmo:private-metadata-inventory-check',
        'npm run kosmo:data-lane-sweep',
        'npm run kosmo:references-nightly-gate'
      ],
      stop_if: [
        'Post-owner queue keeps private metadata blocked.',
        'Any private metadata check fails.',
        'Any output contains private full text, scans, screenshots or public-ready promotion.'
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
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      phases: phases.length,
      commands: phases.reduce((sum, phase) => sum + phase.commands.length, 0),
      manual_gates: phases.filter((phase) => phase.type.includes('manual')).length,
      phases_that_may_mutate_after_review: phases.filter((phase) => phase.mutates_project_files).length,
      expected_session_file: expectedSessionFile,
      expected_selected_root_path: selectedRoot,
      operational_start_card_status: reports.operationalStartCard?.status || null,
      pipeline_checkpoint_status: reports.pipelineCheckpoint?.status || null,
      session_edit_preview_status: reports.sessionEditPreview?.status || null,
      post_owner_queue_status: reports.postOwnerQueue?.status || null,
      post_owner_queue_executable_now: reports.postOwnerQueue?.summary?.executable_now ?? null,
      public_ready_after_runbook: 0
    },
    phases,
    hard_stops: [
      'Do not run source-root private diagnostics from a merely valid reply or broad freeform approval.',
      'Do not edit intake files from this runbook.',
      'Do not edit session files before the exact reply, start card, checkpoint and session preview guards pass.',
      `Do not edit any source-root session except ${expectedSessionFile}.`,
      'Do not read private content in this runbook step.',
      'Do not run private metadata inventory unless the post-owner queue explicitly unblocks it.',
      'Do not mark any private-derived material public-ready.'
    ]
  };
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
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
  lines.push(`- Expected session file: \`${report.summary.expected_session_file}\``);
  lines.push(`- Expected selected root path: ${report.summary.expected_selected_root_path || '-'}`);
  lines.push(`- Operational start card: ${report.summary.operational_start_card_status || 'missing'}`);
  lines.push(`- Pipeline checkpoint: ${report.summary.pipeline_checkpoint_status || 'missing'}`);
  lines.push(`- Session edit preview: ${report.summary.session_edit_preview_status || 'missing'}`);
  lines.push(`- Post-owner queue: ${report.summary.post_owner_queue_status || 'missing'}; executable now ${report.summary.post_owner_queue_executable_now ?? '-'}`);
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
