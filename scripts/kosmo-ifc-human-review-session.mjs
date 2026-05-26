#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const outputJsonPath = join(projectRoot, args.output || 'design/ifc-human-review-session.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/ifc-human-review-session.md');

const checkStatuses = new Set(['pending', 'confirmed', 'failed', 'not_applicable']);
const decisions = new Set(['undecided', 'keep_needs_more_source_review', 'accepted_as_context', 'accepted_as_design_seed', 'rejected']);
const checkUpdates = parseKeyValueArgs(asArray(args.check), '--check');
const noteUpdates = parseKeyValueArgs(asArray(args.note), '--note');

const paths = {
  manifest: join(projectRoot, 'kosmo.project.json'),
  guide: join(projectRoot, 'design/ifc-human-review-guide.generated.json'),
  pack: join(projectRoot, 'design/ifc-human-review-pack.generated.json'),
  viewer: join(projectRoot, 'design/ifc-human-review-viewer.generated.json'),
  decision: join(projectRoot, 'design/ifc-human-review-decision.json'),
  sync: join(projectRoot, 'design/ifc-human-review-sync.generated.json'),
  existingSession: outputJsonPath
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const session = buildSession();
  validateSession(session);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(session), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo IFC human review session written');
  console.log(`Project: ${session.project_id}`);
  console.log(`Status: ${session.status}`);
  console.log(`Confirmed: ${session.summary.confirmed_check_count}/${session.summary.check_count}`);
  console.log(`Proposed decision: ${session.proposed_decision}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildSession() {
  const manifest = readOptionalJson(paths.manifest);
  const guide = readOptionalJson(paths.guide);
  const pack = readOptionalJson(paths.pack);
  const viewer = readOptionalJson(paths.viewer);
  const decision = readOptionalJson(paths.decision);
  const sync = readOptionalJson(paths.sync);
  const existing = readOptionalJson(paths.existingSession);
  const projectId = manifest?.project_id || guide?.project_id || pack?.project_id || basename(projectRoot);
  const reviewer = args['reviewed-by'] || existing?.reviewer || null;
  const proposedDecision = normalizeDecision(args.decision || existing?.proposed_decision || 'undecided');
  const sourceChecks = Array.isArray(pack?.human_checklist) ? pack.human_checklist : [];
  const existingById = new Map((existing?.checks || []).map((check) => [check.id, check]));
  const updatedAt = new Date().toISOString();
  const checks = sourceChecks.map((check) => {
    const previous = existingById.get(check.id) || {};
    const status = normalizeCheckStatus(checkUpdates.get(check.id) || previous.status || 'pending');
    const notes = Array.isArray(previous.notes) ? [...previous.notes] : [];
    const addedNote = noteUpdates.get(check.id);
    if (addedNote && !notes.includes(addedNote)) notes.push(addedNote);
    return {
      id: check.id,
      status,
      question: check.question,
      evidence_hint: check.evidence_hint || '',
      notes,
      reviewed_by: status !== 'pending' ? reviewer || previous.reviewed_by || null : previous.reviewed_by || null,
      reviewed_at: status !== 'pending' && (checkUpdates.has(check.id) || noteUpdates.has(check.id)) ? updatedAt : previous.reviewed_at || null
    };
  });
  validateUpdateTargets(new Set(checks.map((check) => check.id)));
  const summary = summarizeChecks(checks);
  const status = sessionStatus({ summary, proposedDecision, decision });

  return {
    schema_version: '0.1',
    generated_at: updatedAt,
    updated_at: updatedAt,
    generator: 'kosmo-ifc-human-review-session',
    project_id: projectId,
    project_name: manifest?.name || guide?.project_name || pack?.project_name || null,
    status,
    rights_status: 'internal_only',
    reviewer,
    proposed_decision: proposedDecision,
    policy: {
      session_is_human_work_log: true,
      session_does_not_modify_context_selection: true,
      session_does_not_record_final_decision: true,
      final_decision_requires_kosmo_ifc_human_review_decision: true
    },
    source_files: sourceFiles(),
    current_state: {
      guide_status: guide?.status || null,
      viewer_status: viewer?.status || null,
      decision_status: decision?.status || null,
      final_decision_recorded: Boolean(decision?.summary?.final_decision_recorded),
      sync_status: sync?.status || null,
      evidence_ready: Boolean(pack?.summary?.evidence_ready),
      design_generation_allowed: Boolean(guide?.summary?.design_generation_allowed)
    },
    review_inputs: guide?.review_inputs || {},
    machine_snapshot: guide?.summary || {},
    summary,
    checks,
    decision_readiness: decisionReadiness({ summary, proposedDecision }),
    next_commands: buildNextCommands({ proposedDecision, reviewer, projectRoot, summary }),
    next_actions: buildNextActions({ summary, proposedDecision })
  };
}

function sessionStatus({ summary, proposedDecision, decision }) {
  if (decision?.summary?.final_decision_recorded) return 'ifc_human_review_session_final_decision_recorded';
  if (summary.failed_check_count > 0) return 'ifc_human_review_session_failed_checks';
  if (proposedDecision === 'undecided') return 'ifc_human_review_session_open';
  if (summary.pending_check_count > 0 && ['accepted_as_context', 'accepted_as_design_seed'].includes(proposedDecision)) {
    return 'ifc_human_review_session_positive_decision_blocked';
  }
  if (summary.pending_check_count > 0) return 'ifc_human_review_session_open';
  return 'ifc_human_review_session_ready_for_decision';
}

function decisionReadiness({ summary, proposedDecision }) {
  const blockers = [];
  if (proposedDecision === 'undecided') blockers.push('No proposed decision selected.');
  if (summary.failed_check_count > 0 && proposedDecision !== 'rejected') blockers.push('Failed checks require rejection or more source review.');
  if (['accepted_as_context', 'accepted_as_design_seed'].includes(proposedDecision) && summary.pending_check_count > 0) {
    blockers.push('Positive decisions require all checklist rows to be confirmed or not applicable.');
  }
  if (proposedDecision === 'accepted_as_design_seed' && summary.not_applicable_check_count > 0) {
    blockers.push('Design-seed approval should not skip checklist rows.');
  }
  return {
    ready: blockers.length === 0,
    blockers
  };
}

function buildNextCommands({ proposedDecision, reviewer, projectRoot, summary }) {
  const project = shellQuote(relative(root, projectRoot));
  const reviewedBy = shellQuote(reviewer || 'Reviewer');
  const commands = [
    {
      id: 'refresh_session',
      command: `npm run kosmo:ifc-human-review-session -- --project ${project}`
    }
  ];
  if (summary.pending_check_count > 0) {
    commands.push({
      id: 'mark_check_example',
      command: `npm run kosmo:ifc-human-review-session -- --project ${project} --reviewed-by ${reviewedBy} --check semantic_viewer_import=confirmed --note semantic_viewer_import="IFC tree opened and matched review guide"`
    });
  }
  if (proposedDecision !== 'undecided') {
    const positive = ['accepted_as_context', 'accepted_as_design_seed'].includes(proposedDecision);
    const seed = proposedDecision === 'accepted_as_design_seed';
    const flags = [
      `--record-final`,
      `--decision ${proposedDecision}`,
      `--reviewed-by ${reviewedBy}`
    ];
    if (positive) flags.push('--confirm-checklist', '--i-confirm-human-ifc-review');
    if (seed) flags.push('--approve-design-generation');
    commands.push({
      id: 'record_final_decision',
      command: `npm run kosmo:ifc-human-review-decision -- --project ${project} ${flags.join(' ')}`
    });
    commands.push({
      id: 'sync_after_final_decision',
      command: `npm run kosmo:ifc-human-review-sync -- --project ${project}`
    });
  }
  return commands;
}

function buildNextActions({ summary, proposedDecision }) {
  if (summary.pending_check_count > 0) return ['Complete pending review checks in the session log.'];
  if (summary.failed_check_count > 0) return ['Resolve failed checks, keep source review open or reject the IFC candidate.'];
  if (proposedDecision === 'undecided') return ['Choose a proposed decision for the IFC candidate.'];
  return ['Record the final IFC human review decision, then run the sync dry-run.'];
}

function summarizeChecks(checks) {
  const count = (status) => checks.filter((check) => check.status === status).length;
  return {
    check_count: checks.length,
    pending_check_count: count('pending'),
    confirmed_check_count: count('confirmed'),
    failed_check_count: count('failed'),
    not_applicable_check_count: count('not_applicable')
  };
}

function validateSession(session) {
  if (!existsSync(paths.pack)) throw new Error(`Missing IFC human review pack: ${relative(root, paths.pack)}`);
  if (!decisions.has(session.proposed_decision)) {
    throw new Error(`Invalid proposed decision: ${session.proposed_decision}`);
  }
  for (const check of session.checks) {
    if (!checkStatuses.has(check.status)) throw new Error(`Invalid status for ${check.id}: ${check.status}`);
  }
}

function validateUpdateTargets(checkIds) {
  for (const id of [...checkUpdates.keys(), ...noteUpdates.keys()]) {
    if (!checkIds.has(id)) throw new Error(`Unknown review check: ${id}`);
  }
}

function renderMarkdown(session) {
  const lines = [
    '# IFC Human Review Session',
    '',
    `Project ID: \`${session.project_id}\``,
    `Updated: ${session.updated_at}`,
    `Status: \`${session.status}\``,
    `Reviewer: ${session.reviewer || '-'}`,
    `Proposed decision: \`${session.proposed_decision}\``,
    '',
    'Dieses Protokoll ist das ausfuellbare Arbeitsblatt fuer den menschlichen IFC-Review. Es notiert noch keinen finalen Entscheid.',
    '',
    '## Summary',
    '',
    `- evidence ready: ${session.current_state.evidence_ready ? 'yes' : 'no'}`,
    `- final decision recorded: ${session.current_state.final_decision_recorded ? 'yes' : 'no'}`,
    `- checks confirmed: ${session.summary.confirmed_check_count}/${session.summary.check_count}`,
    `- checks pending: ${session.summary.pending_check_count}`,
    `- checks failed: ${session.summary.failed_check_count}`,
    `- checks n/a: ${session.summary.not_applicable_check_count}`,
    `- decision ready: ${session.decision_readiness.ready ? 'yes' : 'no'}`
  ];

  if (session.decision_readiness.blockers.length) {
    lines.push('', '## Decision Blockers', '');
    for (const blocker of session.decision_readiness.blockers) lines.push(`- ${blocker}`);
  }

  lines.push('', '## Review Inputs', '');
  lines.push(`- IFC file: \`${session.review_inputs.ifc_file || '-'}\``);
  lines.push(`- Static viewer: \`${session.review_inputs.static_viewer_html || '-'}\``);
  lines.push(`- Review guide: \`design/ifc-human-review-guide.generated.md\``);
  lines.push(`- Review pack: \`${session.review_inputs.human_review_pack || '-'}\``);
  lines.push(`- Decision record: \`${session.review_inputs.decision_record || '-'}\``);

  lines.push('', '## Checks', '');
  lines.push('| Check | Status | Question | Notes |');
  lines.push('| --- | --- | --- | --- |');
  for (const check of session.checks) {
    lines.push(`| ${escapePipe(check.id)} | ${escapePipe(check.status)} | ${escapePipe(check.question)} | ${escapePipe(check.notes.join('; ') || '-')} |`);
  }

  lines.push('', '## Commands', '');
  for (const command of session.next_commands) {
    lines.push(`### ${command.id}`, '');
    lines.push('```bash');
    lines.push(command.command);
    lines.push('```', '');
  }

  lines.push('## Next Actions', '');
  for (const action of session.next_actions) lines.push(`- ${action}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function ensurePackageReferences(projectRoot) {
  const changed = [];
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest.outputs)) manifest.outputs = [];
    let didChange = false;
    for (const item of packageOutputItems()) {
      didChange = ensureItem(manifest.outputs, item.path, item.manifest) || didChange;
    }
    if (didChange) {
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      changed.push(manifestPath);
    }
  }

  const exportManifestPath = join(projectRoot, 'publish/export-manifest.json');
  if (existsSync(exportManifestPath)) {
    const exportManifest = readJson(exportManifestPath);
    if (!Array.isArray(exportManifest.exports)) exportManifest.exports = [];
    let didChange = false;
    for (const item of packageOutputItems()) {
      didChange = ensureItem(exportManifest.exports, item.path, item.exportManifest) || didChange;
    }
    if (didChange) {
      await writeFile(exportManifestPath, `${JSON.stringify(exportManifest, null, 2)}\n`, 'utf8');
      changed.push(exportManifestPath);
    }
  }
  return changed;
}

function packageOutputItems() {
  return [
    outputItem('design/ifc-human-review-session.json', 'other', 'design', 'Kosmo Design', 'json', 'Editable human IFC review session log.'),
    outputItem('design/ifc-human-review-session.md', 'other', 'design', 'Kosmo Design', 'markdown', 'Human-readable IFC review session worksheet.')
  ];
}

function outputItem(path, type, module, exportModule, format, description) {
  return {
    path,
    manifest: { path, type, module, rights_status: 'internal_only', description },
    exportManifest: { path, module: exportModule, format, status: 'draft_needs_human_review', rights_status: 'internal_only' }
  };
}

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
}

function sourceFiles() {
  return Object.fromEntries(Object.entries(paths).map(([key, pathname]) => [key, sourceFileStatus(pathname)]));
}

function sourceFileStatus(pathname) {
  return {
    path: relative(projectRoot, pathname),
    name: basename(pathname),
    exists: existsSync(pathname),
    size_bytes: existsSync(pathname) ? statSync(pathname).size : 0
  };
}

function parseKeyValueArgs(items, flag) {
  const updates = new Map();
  for (const item of items) {
    const [key, value] = splitKeyValue(item, flag);
    updates.set(key, value);
  }
  return updates;
}

function splitKeyValue(value, flag) {
  if (typeof value !== 'string' || !value.includes('=')) throw new Error(`${flag} expects check_id=value`);
  const [key, ...rest] = value.split('=');
  const joined = rest.join('=').trim();
  if (!key.trim() || !joined) throw new Error(`${flag} expects check_id=value`);
  return [key.trim(), joined];
}

function normalizeCheckStatus(value) {
  if (!checkStatuses.has(value)) throw new Error(`Invalid check status: ${value}. Allowed: ${[...checkStatuses].join(', ')}`);
  return value;
}

function normalizeDecision(value) {
  if (!decisions.has(value)) throw new Error(`Invalid proposed decision: ${value}. Allowed: ${[...decisions].join(', ')}`);
  return value;
}

function asArray(value) {
  if (value === undefined || value === null || value === false) return [];
  return Array.isArray(value) ? value : [value];
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function readOptionalJson(pathname) {
  if (!existsSync(pathname)) return null;
  return readJson(pathname);
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function shellQuote(value) {
  const string = String(value || '.');
  if (/^[A-Za-z0-9_./:-]+$/.test(string)) return string;
  return `"${string.replace(/(["\\$`])/g, '\\$1')}"`;
}

function parseArgs(argv) {
  const parsed = {};
  const repeatable = new Set(['check', 'note']);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    const value = next && !next.startsWith('--') ? next : true;
    if (repeatable.has(key)) {
      if (!Array.isArray(parsed[key])) parsed[key] = [];
      parsed[key].push(value);
    } else {
      parsed[key] = value;
    }
    if (value !== true) index += 1;
  }
  return parsed;
}
