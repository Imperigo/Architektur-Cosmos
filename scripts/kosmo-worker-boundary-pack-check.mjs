#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);
const packPath = resolve(root, args.pack || `data/kosmo-worker-boundary-pack-${dateStamp}.json`);
const outputJson = resolve(root, args.out || `data/kosmo-worker-boundary-pack-check-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-worker-boundary-pack-check-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pack = JSON.parse(await readFile(packPath, 'utf8'));
  const findings = [
    ...checkPolicy(pack),
    ...checkHardState(pack),
    ...checkWorkerBoundaries(pack),
    ...checkCommands(pack),
    ...checkEscalation(pack)
  ];
  const failures = findings.filter((finding) => finding.severity === 'failure');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  const report = {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0 ? 'worker_boundary_pack_guard_passed' : 'worker_boundary_pack_guard_failed',
    policy: {
      records_decisions: false,
      applies_decisions: false,
      reads_private_content: false,
      writes_public_files: false,
      writes_public_manifest: false,
      local_worker_git_allowed: false,
      public_ready_after_guard: 0,
      note: 'This guard validates the worker boundary pack. It does not unlock private diagnostics, record decisions or run worker tasks.'
    },
    source_refs: [relative(root, packPath)],
    summary: {
      pack_status: pack.status,
      worker_count: pack.worker_boundaries?.length ?? 0,
      allowed_commands: pack.allowed_commands_now?.length ?? 0,
      blocked_commands: pack.blocked_commands_now?.length ?? 0,
      failures: failures.length,
      warnings: warnings.length,
      public_ready_after_guard: 0
    },
    findings,
    next_actions: failures.length === 0
      ? [
          'Use the worker boundary pack as first instruction context for local LLM and overseer handoffs.',
          'Keep private reads, Git/cloud actions and public-ready flags blocked while the pack is review-only locked.',
          'Rerun this guard after router, source-root or worker role changes.'
        ]
      : [
          'Fix worker boundary pack guard failures before handing tasks to local LLMs.',
          'Rerun npm run kosmo:worker-boundary-pack and npm run kosmo:worker-boundary-pack-check.'
        ]
  };

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo worker boundary pack check');
  console.log(`Status: ${report.status}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (failures.length > 0) process.exitCode = 1;
}

function checkPolicy(pack) {
  const findings = [];
  expect(pack.status === 'worker_boundary_pack_review_only_locked', findings, 'pack_review_only_locked', 'Pack must remain review-only locked.');
  expect(pack.policy?.metadata_only === true, findings, 'metadata_only_true', 'Pack must be metadata-only.');
  expect(pack.policy?.reads_private_content === false, findings, 'reads_private_content_false', 'Pack must not read private content.');
  expect(pack.policy?.copies_private_content === false, findings, 'copies_private_content_false', 'Pack must not copy private content.');
  expect(pack.policy?.public_writes_allowed === false, findings, 'public_writes_false', 'Pack must block public writes.');
  expect(pack.policy?.public_ready_allowed === false, findings, 'public_ready_false', 'Pack must block public-ready flags.');
  expect(pack.policy?.local_worker_git_allowed === false, findings, 'local_worker_git_false', 'Pack must block local-worker Git.');
  return findings;
}

function checkHardState(pack) {
  const state = pack.hard_state || {};
  const findings = [];
  expect(isCompleteStepRatio(state.data_lane), findings, 'data_lane_complete', 'Data lane must have all configured steps passed.');
  expect(state.data_lane_status === 'kosmodata_lane_sweep_review_only_passed', findings, 'data_lane_review_only_passed', 'Data lane must be review-only passed.');
  expect(state.source_root_blocker_status === 'source_root_blocker_still_active', findings, 'source_root_blocker_active', 'Source-root blocker must remain active.');
  expect(state.source_root_probable_libraries === 0, findings, 'probable_libraries_zero', 'Probable private libraries must remain 0 until real source root is visible.');
  expect(state.selected_root_exists === false, findings, 'selected_root_absent', 'Selected root must remain absent.');
  expect(state.private_diagnostic_allowed === false, findings, 'private_diagnostic_false', 'Private diagnostic must remain blocked.');
  expect(state.private_inventory_allowed === false, findings, 'private_inventory_false', 'Private inventory must remain blocked.');
  expect(state.public_ready_total === 0, findings, 'public_ready_total_zero', 'Public-ready total must remain 0.');
  return findings;
}

function isCompleteStepRatio(value) {
  const match = String(value || '').match(/^(\d+)\/(\d+)$/);
  if (!match) return false;
  return Number(match[1]) === Number(match[2]) && Number(match[2]) > 0;
}

function checkWorkerBoundaries(pack) {
  const workers = pack.worker_boundaries || [];
  const byId = new Map(workers.map((worker) => [worker.worker_id, worker]));
  const findings = [];
  expect(workers.length === 3, findings, 'three_workers', 'Pack must define three worker boundaries.');
  for (const id of ['kosmo-local-llm', 'codex-central-overseer', 'claude-code-kosmooverseer']) {
    expect(byId.has(id), findings, `worker_present:${id}`, `Worker boundary must exist: ${id}.`);
  }
  const local = byId.get('kosmo-local-llm');
  if (local) {
    const blocked = local.blocked_tasks || [];
    expect(local.command_scope === 'metadata_review_only', findings, 'local_scope_metadata_only', 'Local LLM scope must be metadata_review_only.');
    expect(includesAny(blocked, ['read or OCR private']), findings, 'local_blocks_private_reads', 'Local LLM must block private reads/OCR.');
    expect(includesAny(blocked, ['copy private excerpts']), findings, 'local_blocks_private_copy', 'Local LLM must block private excerpts in Git.');
    expect(includesAny(blocked, ['write public-ready']), findings, 'local_blocks_public_ready', 'Local LLM must block public-ready writes.');
    expect(includesAny(blocked, ['run Git']), findings, 'local_blocks_git_cloud', 'Local LLM must block Git/cloud/upload commands.');
  }
  return findings;
}

function checkCommands(pack) {
  const allowed = pack.allowed_commands_now || [];
  const blocked = pack.blocked_commands_now || [];
  const blockedText = blocked.map((item) => `${item.command} ${item.reason}`).join(' ');
  const findings = [];
  expect(allowed.includes('npm run kosmo:worker-boundary-pack'), findings, 'pack_command_allowed', 'Worker boundary pack command must be allowed.');
  expect(blocked.some((item) => item.command.includes('private-library-diagnostic')), findings, 'private_library_diagnostic_blocked', 'Private-library diagnostic must be blocked without source-root approval.');
  expect(blockedText.includes('private inventory extraction'), findings, 'private_inventory_extraction_blocked', 'Private inventory extraction must be blocked.');
  expect(blockedText.includes('public promotion'), findings, 'public_promotion_blocked', 'Public promotion must be blocked.');
  expect(!allowed.some((command) => command.includes('public_ready=true')), findings, 'no_public_ready_command_allowed', 'No allowed command may set public_ready=true.');
  return findings;
}

function checkEscalation(pack) {
  const triggers = pack.escalation_triggers || [];
  const findings = [];
  expect(triggers.some((trigger) => trigger.includes('real private library root')), findings, 'trigger_real_root', 'Escalation triggers must include real private library root.');
  expect(triggers.some((trigger) => trigger.includes('OneDrive sync')), findings, 'trigger_onedrive_sync', 'Escalation triggers must include OneDrive sync repair.');
  expect(triggers.some((trigger) => trigger.includes('private_diagnostic_allowed=true')), findings, 'trigger_private_diagnostic_allowed', 'Escalation triggers must include private_diagnostic_allowed=true.');
  expect(triggers.some((trigger) => trigger.includes('explicit current answers')), findings, 'trigger_owner_answers', 'Escalation triggers must include explicit current owner answers.');
  return findings;
}

function includesAny(items = [], needles = []) {
  const text = items.join(' ').toLowerCase();
  return needles.some((needle) => text.includes(needle.toLowerCase()));
}

function expect(condition, findings, id, message) {
  findings.push({
    id,
    severity: condition ? 'passed' : 'failure',
    message
  });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Worker Boundary Pack Check');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pack status: ${report.summary.pack_status}`);
  lines.push(`- Workers: ${report.summary.worker_count}`);
  lines.push(`- Allowed commands: ${report.summary.allowed_commands}`);
  lines.push(`- Blocked commands: ${report.summary.blocked_commands}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Public-ready after guard: ${report.summary.public_ready_after_guard}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  report.findings.forEach((finding) => {
    lines.push(`- ${finding.severity}: \`${finding.id}\` - ${finding.message}`);
  });
  lines.push('');
  lines.push('## Next Actions');
  lines.push('');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
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
