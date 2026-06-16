#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  orbitBridge: resolve(root, args.orbitBridge || `data/kosmo-orbit-status-bridge-${dateStamp}.json`),
  operationalStartCard: resolve(root, args.operationalStartCard || `data/kosmo-owner-unlock-operational-start-card-${dateStamp}.json`),
  operationalStartCardCheck: resolve(root, args.operationalStartCardCheck || `data/kosmo-owner-unlock-operational-start-card-check-${dateStamp}.json`),
  sourceRootDecisionSessionCheck: resolve(root, args.sourceRootDecisionSessionCheck || `data/kosmo-source-root-decision-session-check-${dateStamp}.json`),
  runtimeApplyGuard: resolve(root, args.runtimeApplyGuard || `data/kosmo-innovation-github-worker-runtime-apply-guard-${dateStamp}.json`),
  runtimeApplyGuardCheck: resolve(root, args.runtimeApplyGuardCheck || `data/kosmo-innovation-github-worker-runtime-apply-guard-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-terminal-gate-audit-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-terminal-gate-audit-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const reports = {};
  for (const [key, path] of Object.entries(refs)) reports[key] = await readJson(path);
  const audit = buildAudit(reports);

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(audit, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(audit));

  console.log('Kosmo terminal gate audit');
  console.log(`Status: ${audit.status}`);
  console.log(`Terminal blockers: ${audit.summary.terminal_blockers}`);
  console.log(`Actions executable now: ${audit.summary.actions_executable_now}`);
  console.log(`Public-ready after audit: ${audit.summary.public_ready_after_audit}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);
}

function buildAudit({ orbitBridge, operationalStartCard, operationalStartCardCheck, sourceRootDecisionSessionCheck, runtimeApplyGuard, runtimeApplyGuardCheck }) {
  const blockingCards = (orbitBridge.orbit_cards || []).filter((card) => String(card.status || '').includes('block'));
  const ownerActionCards = (orbitBridge.orbit_cards || []).filter((card) => card.owner_action_required === true);
  const terminalBlockerIds = [
    'source-root',
    'source-root-owner-action',
    'source-root-activation',
    'private-metadata-inventory',
    'github-worker-runtime-apply-guard'
  ];
  const presentTerminalIds = blockingCards.map((card) => card.id);
  const missingTerminalIds = terminalBlockerIds.filter((id) => !presentTerminalIds.includes(id));
  const unexpectedExecutable = [
    sourceRootDecisionSessionCheck.summary?.recorded_selection === true,
    operationalStartCard.summary?.writes_now === true,
    operationalStartCard.policy?.executes_commands_now === true,
    runtimeApplyGuard.summary?.execute_allowed_now > 0,
    runtimeApplyGuard.summary?.runtime_execution_allowed_now === true
  ].some(Boolean);

  const failures = [];
  if (orbitBridge.status !== 'orbit_bridge_ready_with_blockers') failures.push(`Orbit bridge status is ${orbitBridge.status}`);
  if (orbitBridge.summary?.blocking_cards !== terminalBlockerIds.length) failures.push(`Expected ${terminalBlockerIds.length} blockers, found ${orbitBridge.summary?.blocking_cards}`);
  if (missingTerminalIds.length > 0) failures.push(`Missing terminal blocker ids: ${missingTerminalIds.join(', ')}`);
  if (orbitBridge.summary?.public_ready_after_bridge !== 0) failures.push('Orbit bridge public-ready is not zero.');
  if (operationalStartCard.status !== 'owner_unlock_operational_start_card_ready') failures.push(`Operational start card is ${operationalStartCard.status}`);
  if (operationalStartCardCheck.status !== 'owner_unlock_operational_start_card_guard_passed') failures.push(`Operational start card check is ${operationalStartCardCheck.status}`);
  if (!['source_root_decision_session_blocked', 'passed_pending_owner_input'].includes(sourceRootDecisionSessionCheck.status)) {
    failures.push(`Source-root decision session check is ${sourceRootDecisionSessionCheck.status}`);
  }
  if (!['github_worker_runtime_apply_guard_blocked_owner_action_required', 'innovation_github_worker_runtime_apply_guard_waiting_for_exact_reply'].includes(runtimeApplyGuard.status)) {
    failures.push(`Runtime apply guard is ${runtimeApplyGuard.status}`);
  }
  if (!['github_worker_runtime_apply_guard_guard_passed', 'innovation_github_worker_runtime_apply_guard_guard_passed'].includes(runtimeApplyGuardCheck.status)) {
    failures.push(`Runtime apply guard check is ${runtimeApplyGuardCheck.status}`);
  }
  if (unexpectedExecutable) failures.push('At least one guarded action appears executable.');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'terminal_gate_audit_guarded_blocked'
      : 'terminal_gate_audit_needs_review',
    policy: {
      audit_only: true,
      records_decisions: false,
      writes_session_files: false,
      reads_private_content: false,
      runs_private_inventory: false,
      runs_runtime_batches: false,
      changes_public_ready: false,
      public_ready_after_audit: 0
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      orbit_status: orbitBridge.status,
      orbit_cards: orbitBridge.summary?.cards ?? null,
      terminal_blockers: blockingCards.length,
      owner_action_cards: ownerActionCards.length,
      source_root_session_status: sourceRootDecisionSessionCheck.status,
      operational_start_status: operationalStartCard.status,
      operational_start_check_status: operationalStartCardCheck.status,
      runtime_apply_guard_status: runtimeApplyGuard.status,
      runtime_apply_guard_check_status: runtimeApplyGuardCheck.status,
      source_root_recorded_selection: sourceRootDecisionSessionCheck.summary?.recorded_selection === true,
      runtime_execute_allowed_now: runtimeApplyGuard.summary?.execute_allowed_now ?? null,
      actions_executable_now: unexpectedExecutable ? 1 : 0,
      failures: failures.length,
      public_ready_after_audit: 0
    },
    terminal_blockers: blockingCards.map((card) => ({
      id: card.id,
      title: card.title,
      status: card.status,
      signal: card.signal,
      owner_action_required: card.owner_action_required === true,
      source_ref: card.source_ref
    })),
    owner_unlock_sequence_after_explicit_reply: operationalStartCard.next_commands_after_exact_reply || [],
    hard_stops: [
      'Do not infer source-root selection from broad owner intent.',
      'Do not run private inventory, OCR, embeddings or local LLM private tasks while this audit is terminal-blocked.',
      'Do not run the GitHub worker runtime batch while exact runtime approval is missing.',
      'Do not promote any reference or asset to public-ready from this audit.',
      'If a worker changes related files, create a handoff before the next loop.'
    ],
    failures
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(audit) {
  const lines = [];
  lines.push('# Kosmo Terminal Gate Audit');
  lines.push('');
  lines.push(`Generated: ${audit.generated_at}`);
  lines.push(`Status: \`${audit.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Orbit status: ${audit.summary.orbit_status}`);
  lines.push(`- Orbit cards: ${audit.summary.orbit_cards}`);
  lines.push(`- Terminal blockers: ${audit.summary.terminal_blockers}`);
  lines.push(`- Owner action cards: ${audit.summary.owner_action_cards}`);
  lines.push(`- Source-root session: ${audit.summary.source_root_session_status}`);
  lines.push(`- Operational start card: ${audit.summary.operational_start_status}`);
  lines.push(`- Runtime apply guard: ${audit.summary.runtime_apply_guard_status}`);
  lines.push(`- Actions executable now: ${audit.summary.actions_executable_now}`);
  lines.push(`- Public-ready after audit: ${audit.summary.public_ready_after_audit}`);
  lines.push('');
  lines.push('## Terminal Blockers');
  lines.push('');
  audit.terminal_blockers.forEach((card) => {
    lines.push(`- \`${card.id}\`: ${card.status} - ${card.signal}`);
  });
  lines.push('');
  lines.push('## Owner Unlock Sequence After Explicit Reply');
  lines.push('');
  audit.owner_unlock_sequence_after_explicit_reply.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  audit.hard_stops.forEach((stop) => lines.push(`- ${stop}`));
  lines.push('');
  if (audit.failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    audit.failures.forEach((failure) => lines.push(`- ${failure}`));
    lines.push('');
  }
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
