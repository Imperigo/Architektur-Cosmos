#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const dateStamp = new Date().toISOString().slice(0, 10);

const refs = {
  packet: resolve(root, args.packet || `data/kosmo-source-root-owner-decision-packet-${dateStamp}.json`),
  packetCheck: resolve(root, args.packetCheck || `data/kosmo-source-root-owner-decision-packet-check-${dateStamp}.json`),
  activationPreflight: resolve(root, args.activationPreflight || `data/kosmo-source-root-activation-preflight-${dateStamp}.json`),
  privateMetadataCheck: resolve(root, args.privateMetadataCheck || `data/kosmo-private-metadata-inventory-check-${dateStamp}.json`)
};

const outputJson = resolve(root, args.out || `data/kosmo-source-root-decision-dry-run-${dateStamp}.json`);
const outputMd = resolve(root, args.markdown || `docs/codex/kosmo-source-root-decision-dry-run-${dateStamp}.md`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const packet = await readJson(refs.packet);
  const packetCheck = await readJson(refs.packetCheck);
  const activationPreflight = await readJson(refs.activationPreflight);
  const privateMetadataCheck = await readJson(refs.privateMetadataCheck);
  const report = buildReport({ packet, packetCheck, activationPreflight, privateMetadataCheck });

  await mkdir(dirname(outputJson), { recursive: true });
  await mkdir(dirname(outputMd), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outputMd, renderMarkdown(report));

  console.log('Kosmo source-root decision dry run');
  console.log(`Status: ${report.status}`);
  console.log(`Scenarios: ${report.summary.scenarios}`);
  console.log(`Metadata-diagnostic scenarios: ${report.summary.metadata_diagnostic_scenarios}`);
  console.log(`Failures: ${report.summary.failures}`);
  console.log(`Public-ready after dry run: ${report.summary.public_ready_after_dry_run}`);
  console.log(`Wrote: ${relative(root, outputMd)}`);

  if (report.failures.length > 0) process.exitCode = 1;
}

function buildReport({ packet, packetCheck, activationPreflight, privateMetadataCheck }) {
  const failures = [];
  if (packet.status !== 'source_root_owner_decision_packet_ready') failures.push(`Packet not ready: ${packet.status}`);
  if (packetCheck.status !== 'source_root_owner_decision_packet_guard_passed') failures.push(`Packet guard not passed: ${packetCheck.status}`);
  if (activationPreflight?.summary?.activation_ready === true) failures.push('Activation is already ready; dry-run should be replaced by real post-decision checks.');
  if (privateMetadataCheck.status !== 'private_metadata_inventory_guard_passed') failures.push(`Private metadata guard not passed: ${privateMetadataCheck.status}`);

  const scenarios = (packet.decision_templates || []).map((template) => scenarioFor(template));
  const metadataScenarios = scenarios.filter((scenario) => scenario.metadata_diagnostic_would_be_allowed_after_recorded_decision);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    status: failures.length === 0
      ? 'source_root_decision_dry_run_ready'
      : 'source_root_decision_dry_run_needs_review',
    policy: {
      dry_run_only: true,
      records_decisions: false,
      mutates_decision_session: false,
      reads_private_content: false,
      copies_private_content: false,
      runs_private_inventory: false,
      writes_public_files: false,
      writes_public_manifest: false,
      public_ready_after_dry_run: 0,
      note: 'This report previews outcomes for owner decision templates. It does not record decisions or run private diagnostics.'
    },
    source_refs: Object.values(refs).map((path) => relative(root, path)),
    summary: {
      packet_status: packet.status,
      packet_guard_status: packetCheck.status,
      activation_status: activationPreflight.status || null,
      private_metadata_guard_status: privateMetadataCheck.status || null,
      scenarios: scenarios.length,
      metadata_diagnostic_scenarios: metadataScenarios.length,
      blocked_scenarios: scenarios.filter((scenario) => scenario.private_work_remains_blocked).length,
      failures: failures.length,
      public_ready_after_dry_run: 0
    },
    scenarios,
    still_forbidden_in_all_scenarios: [
      'private OCR or PDF/book text extraction',
      'copying private scans, plans, images or lecture material into Git',
      'public-ready promotion for source-dependent references or assets',
      'local LLM tasks that read private file contents before activation and output guards'
    ],
    exact_commands_after_owner_records_decision: [
      'npm run kosmo:source-root-decision-session-check',
      'npm run kosmo:source-root-blocker-refresh',
      'npm run kosmo:source-root-activation-preflight',
      'npm run kosmo:private-metadata-inventory',
      'npm run kosmo:private-metadata-inventory-check',
      'npm run kosmo:day-batch-loop'
    ],
    failures
  };
}

function scenarioFor(template) {
  const fields = template.session_fields || {};
  const metadataAllowed = template.unlocks_private_metadata_diagnostic === true &&
    fields.selected_decision === 'select_existing_root_for_private_diagnostic' &&
    typeof fields.selected_root_path === 'string' &&
    fields.selected_root_path.startsWith('/');
  return {
    id: template.id,
    label: template.label,
    selected_decision: fields.selected_decision || null,
    selected_root_path: fields.selected_root_path || null,
    metadata_diagnostic_would_be_allowed_after_recorded_decision: metadataAllowed,
    private_work_remains_blocked: !metadataAllowed,
    next_status_if_recorded: metadataAllowed
      ? 'source_root_activation_preflight_required'
      : 'source_root_remains_blocked',
    first_allowed_command_after_recording: metadataAllowed
      ? 'npm run kosmo:source-root-decision-session-check'
      : 'npm run kosmo:source-root-decision-session-check',
    later_allowed_only_if_guards_pass: metadataAllowed
      ? [
          'npm run kosmo:source-root-activation-preflight',
          'npm run kosmo:private-metadata-inventory',
          'npm run kosmo:private-metadata-inventory-check'
        ]
      : [],
    caution: template.caution || template.when_to_use
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Kosmo Source-Root Decision Dry Run');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Packet status: ${report.summary.packet_status}`);
  lines.push(`- Packet guard: ${report.summary.packet_guard_status}`);
  lines.push(`- Activation status: ${report.summary.activation_status}`);
  lines.push(`- Private metadata guard: ${report.summary.private_metadata_guard_status}`);
  lines.push(`- Scenarios: ${report.summary.scenarios}`);
  lines.push(`- Metadata-diagnostic scenarios: ${report.summary.metadata_diagnostic_scenarios}`);
  lines.push(`- Blocked scenarios: ${report.summary.blocked_scenarios}`);
  lines.push(`- Failures: ${report.summary.failures}`);
  lines.push(`- Public-ready after dry run: ${report.summary.public_ready_after_dry_run}`);
  lines.push('');
  lines.push('## Scenarios');
  lines.push('');
  lines.push('| Scenario | Decision | Root | Metadata diagnostic after recording | Next status | Caution |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  report.scenarios.forEach((scenario) => {
    lines.push(`| \`${scenario.id}\` | \`${scenario.selected_decision}\` | ${scenario.selected_root_path ? `\`${escapePipe(scenario.selected_root_path)}\`` : '`null`'} | ${scenario.metadata_diagnostic_would_be_allowed_after_recorded_decision ? 'yes' : 'no'} | ${scenario.next_status_if_recorded} | ${escapePipe(scenario.caution)} |`);
  });
  lines.push('');
  lines.push('## Still Forbidden In All Scenarios');
  lines.push('');
  report.still_forbidden_in_all_scenarios.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Exact Commands After Owner Records Decision');
  lines.push('');
  report.exact_commands_after_owner_records_decision.forEach((command) => lines.push(`- \`${command}\``));
  lines.push('');
  lines.push('## Failures');
  lines.push('');
  if (report.failures.length > 0) report.failures.forEach((failure) => lines.push(`- ${failure}`));
  else lines.push('- None.');
  lines.push('');
  return lines.join('\n');
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
