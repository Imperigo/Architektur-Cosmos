#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const htmlPath = resolve(root, args.html || 'out/orbit/index.html');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-demo-audit.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-demo-audit.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(htmlPath)) {
    throw new Error(`KosmoOrbit demo audit needs built HTML: ${htmlPath}. Run npm run build first.`);
  }

  const html = readFileSync(htmlPath, 'utf8');
  const report = buildReport(html);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit demo audit');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_demo_audit_passed') process.exit(1);
}

function buildReport(html) {
  const normalized = html.replace(/\s+/g, ' ');
  const visibleHtml = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/\s+/g, ' ');
  const demoOrder = [
    { id: 'autonomie', label: 'Autonomie-Status' },
    { id: 'routine', label: 'Buero-Routine' },
    { id: 'presenter', label: '3-Minuten-Erklaerung' },
    { id: 'workflow-delta', label: 'Workflow-Delta' },
    { id: 'pilotmessung', label: 'Pilotmessung' },
    { id: 'pilotplan', label: 'Pilot-Runbook' },
    { id: 'pilot-session', label: 'Pilot-Session Template' },
    { id: 'fortschritt', label: 'Projektfortschritt' },
    { id: 'vision', label: 'Vision Bridge' },
    { id: 'demo-ready', label: 'Demo-Bereitschaft' },
    { id: 'live-gate', label: 'Live-Gate' },
    { id: 'projektpaket', label: 'Projektpaket Tagesansicht' },
    { id: 'design-handoff', label: 'KosmoDesign Handoff' },
    { id: 'entscheidung', label: 'Review Decision Draft' },
    { id: 'runtime-contract', label: 'Runtime-Vertrag' },
    { id: 'kosmosketch-adapter', label: 'KosmoSketch ToolAdapter' },
    { id: 'installation', label: 'Buero-Installation' },
    { id: 'health', label: 'Health Readiness' },
    { id: 'risiken', label: 'Risiko-Register' },
    { id: 'commands', label: 'Command-Vertrag' },
    { id: 'audit', label: 'Audit-Trail-Vertrag' },
    { id: 'evidenz', label: 'Pruefevidenz' },
    { id: 'workstation-profile', label: 'Workstation Profile Contract' },
    { id: 'local-identity', label: 'Local Identity Boundary' },
    { id: 'data-governance', label: 'Data Governance Boundary' },
    { id: 'office-memory', label: 'Office Memory Readiness' },
    { id: 'local-storage-decision', label: 'Local Storage Decision Draft' },
    { id: 'delete-export-restore', label: 'Delete / Export / Restore Drill' },
    { id: 'ausbildung', label: 'Ausbildungsmodus' },
    { id: 'rechte', label: 'Rechte-Matrix' },
    { id: 'rollen', label: 'Rollenumschaltung Preview' }
  ];
  const demoOrderPositions = demoOrder.map((section) => ({
    id: section.id,
    label: section.label,
    index: normalized.indexOf(`id="${section.id}"`)
  }));
  const navLabels = ['Autonomie', 'Routine', '3-Minuten', 'Workflow', 'Pilot', 'Pilotplan', 'Session', 'Fortschritt', 'Vision', 'Demo', 'Live-Gate', 'Projektpaket', 'Handoff', 'Decision', 'Runtime', 'Sketch', 'Installation', 'Health', 'Risiken', 'Commands', 'Audit', 'Evidenz', 'Profile', 'Identity', 'Daten', 'Memory', 'Storage', 'Restore', 'Ausbildung', 'Rechte', 'Rollen', 'Guardrails'];
  const forbiddenArtifacts = ['[object Object]', 'NaN%', 'null null'];
  const checks = [
    check('html_exists', 'Built /orbit HTML exists.', existsSync(htmlPath)),
    check('demo_order_complete', 'Core demo section anchors are all present.', demoOrderPositions.every((item) => item.index >= 0)),
    check('demo_order_logical', 'Core demo sections appear in the intended presentation order.', isStrictlyIncreasing(demoOrderPositions.map((item) => item.index))),
    check('navigation_complete', 'Demo navigation exposes all core stops.', navLabels.every((label) => normalized.includes(label))),
    check('approval_boundary_visible', 'Approval boundary is visible in the export.', normalized.includes('kein Push ohne Freigabe') && normalized.includes('keine Cloud-Kosten')),
    check('review_only_visible', 'Review-only mode is visible in the export.', normalized.includes('review-only') || normalized.includes('Review Mode')),
    check('office_routine_visible', 'Office routine is visible in the export.', normalized.includes('Buero-Routine') && normalized.includes('Morgenstart der KosmoZentrale')),
    check('office_routine_safety_visible', 'Office routine safety line is visible in the export.', normalized.includes('Keine versteckte Vollautomation') && normalized.includes('spend money')),
    check('workflow_delta_visible', 'Workflow delta is visible in the export.', normalized.includes('Workflow-Delta') && normalized.includes('heutigen Bueroablauf')),
    check('workflow_delta_honest', 'Workflow delta avoids unsupported savings claims.', normalized.includes('no-roi-claim') && normalized.includes('Keine Garantie auf konkrete Prozentersparnis')),
    check('pilot_measurement_visible', 'Pilot measurement is visible in the export.', normalized.includes('Pilotmessung') && normalized.includes('evidence-before-claim')),
    check('pilot_measurement_safe', 'Pilot measurement keeps live actions blocked.', normalized.includes('keine Kundendaten') && normalized.includes('keine Kostenjobs')),
    check('pilot_runbook_visible', 'Pilot runbook is visible in the export.', normalized.includes('Pilot-Runbook') && normalized.includes('45-60 Minuten')),
    check('pilot_runbook_safe', 'Pilot runbook keeps live actions blocked.', normalized.includes('keine Kundendaten') && normalized.includes('keine Design-Generation') && normalized.includes('kein Push ohne Owner-Go')),
    check('pilot_session_template_visible', 'Pilot session template is visible in the export.', normalized.includes('Pilot-Session Template') && normalized.includes('Messstruktur bereit')),
    check('pilot_session_template_empty', 'Pilot session template keeps demo measurements empty.', normalized.includes('before null') && normalized.includes('after null') && normalized.includes('Keine Pilotwerte sind behauptet')),
    check('publish_readiness_visible', 'Publish readiness live gate is visible in the export.', normalized.includes('Live-Gate') && normalized.includes('no-push-without-owner-go')),
    check('publish_readiness_safe', 'Publish readiness keeps public push blocked until owner and security review.', normalized.includes('Owner-Go') && normalized.includes('Security Review') && normalized.includes('Live-Smoke')),
    check('vision_bridge_visible', 'Vision bridge is visible in the export.', normalized.includes('Vision Bridge') && normalized.includes('Orchestrierung vor Generierung')),
    check('design_handoff_visible', 'KosmoDesign handoff console is visible in the export.', normalized.includes('KosmoDesign Handoff') && normalized.includes('Review Console')),
    check('design_handoff_blocks_generation', 'KosmoDesign handoff keeps generation visibly blocked.', normalized.includes('Generate Design') && normalized.includes('Design generation is blocked')),
    check('runtime_contract_visible', 'Runtime contract is visible and non-operational.', normalized.includes('Runtime-Vertrag') && normalized.includes('no-process-launch')),
    check('kosmosketch_adapter_visible', 'KosmoSketch adapter contract is visible in the export.', normalized.includes('KosmoSketch ToolAdapter') && normalized.includes('Target-Tool Vertrag fuer Skizze zu BIM') && normalized.includes('kosmo-draw.kosmosketch')),
    check('kosmosketch_adapter_safe', 'KosmoSketch adapter keeps backend calls, approvals, artifacts, Blender, BIM, IFC and 2D actions blocked.', normalized.includes('kein POST /jobs') && normalized.includes('kein /router/plan') && normalized.includes('keine Approval-Mutation') && normalized.includes('kein Artifact-Upload') && normalized.includes('kein Blender-Start') && normalized.includes('kein BIM-Commit') && normalized.includes('kein IFC-Export') && normalized.includes('keine 2D-Regeneration')),
    check('installation_topology_visible', 'Office installation topology is visible in the export.', normalized.includes('Buero-Installation') && normalized.includes('local-appliance-map')),
    check('health_readiness_visible', 'Health readiness contract is visible in the export.', normalized.includes('Health Readiness') && normalized.includes('read-only-telemetry-contract')),
    check('risk_register_visible', 'Risk register is visible in the export.', normalized.includes('Risiko-Register') && normalized.includes('human-approval-risk-register')),
    check('command_contract_visible', 'Command contract is visible in the export.', normalized.includes('Command-Vertrag') && normalized.includes('static-command-contract')),
    check('audit_trail_visible', 'Audit trail is visible in the export.', normalized.includes('Audit-Trail-Vertrag') && normalized.includes('static-audit-trail-contract')),
    check('workstation_profile_visible', 'Workstation profile contract is visible in the export.', normalized.includes('Workstation Profile Contract') && normalized.includes('Wie KosmoOrbit je Arbeitsplatz startet')),
    check('workstation_profile_safe', 'Workstation profile keeps accounts, user writes, persistence and auth runtime blocked.', normalized.includes('keine Accounts') && normalized.includes('keine User-Writes') && normalized.includes('keine Persistenz') && normalized.includes('keine echte Auth-Runtime')),
    check('local_identity_visible', 'Local identity boundary is visible in the export.', normalized.includes('Local Identity Boundary') && normalized.includes('Was spaeter Profil, Auth und Session wird')),
    check('local_identity_safe', 'Local identity blocks logins, profile persistence, session cookies and external identity providers.', normalized.includes('keine Logins') && normalized.includes('keine Profilpersistenz') && normalized.includes('keine Session-Cookies') && normalized.includes('kein externer Identity Provider')),
    check('data_governance_visible', 'Data governance boundary is visible in the export.', normalized.includes('Data Governance Boundary') && normalized.includes('Welche lokalen Daten KosmoOrbit spaeter speichern darf')),
    check('data_governance_safe', 'Data governance blocks database writes, uploads, customer data writes and external sync.', normalized.includes('keine D1-Writes') && normalized.includes('keine R2-Uploads') && normalized.includes('keine Kundendaten-Writes') && normalized.includes('kein externer Sync')),
    check('office_memory_visible', 'Office memory readiness is visible in the export.', normalized.includes('Office Memory Readiness') && normalized.includes('Was spaeter lokales Buero-Gedaechtnis werden darf')),
    check('office_memory_safe', 'Office memory keeps writes, scans, embeddings, backup status and external sync blocked.', normalized.includes('kein Memory-Write') && normalized.includes('kein Kundendatei-Scan') && normalized.includes('kein Embedding-Job') && normalized.includes('kein Backup-Status-Write') && normalized.includes('kein externer Memory-Sync')),
    check('local_storage_decision_visible', 'Local storage decision draft is visible in the export.', normalized.includes('Local Storage Decision Draft') && normalized.includes('Welche Speicherentscheidung vor echtem Memory noetig ist')),
    check('local_storage_decision_safe', 'Local storage decision keeps writes, indexing, embeddings, backup, restore and sync blocked.', normalized.includes('kein local storage write') && normalized.includes('kein Kundendaten-Index') && normalized.includes('kein Backup-Job') && normalized.includes('kein Restore-Job') && normalized.includes('kein externer Sync')),
    check('delete_export_restore_visible', 'Delete/export/restore drill is visible in the export.', normalized.includes('Delete / Export / Restore Drill') && normalized.includes('Wie KosmoOrbit lokale Daten reversibel und pruefbar halten muss')),
    check('delete_export_restore_safe', 'Delete/export/restore drill keeps real jobs, customer data actions, backup restore and external archive sync blocked.', normalized.includes('kein real delete job') && normalized.includes('kein real export job') && normalized.includes('kein real restore job') && normalized.includes('kein Kundendaten-Export') && normalized.includes('kein Kundendaten-Delete') && normalized.includes('kein Backup-Restore') && normalized.includes('kein externer Archiv-Sync')),
    check('learning_mode_visible', 'Education mode is visible in the export.', normalized.includes('Ausbildungsmodus') && normalized.includes('Kosmo als sicherer Lernbegleiter')),
    check('learning_mode_safety_visible', 'Education mode safety line is visible in the export.', normalized.includes('ohne Accounts') && normalized.includes('Projekt-Writes') && normalized.includes('Public-Publish')),
    check('permission_boundary_visible', 'Role permission boundary is visible in the export.', normalized.includes('Rechte-Matrix') && normalized.includes('generation bleibt gesperrt')),
    check('no_runtime_promise', 'Export does not claim live runtime execution.', !normalized.includes('automatisch live schreibt') && !normalized.includes('Cloud Writes aktiv')),
    check('no_render_artifacts', 'Visible export HTML has no obvious unresolved render artifacts.', forbiddenArtifacts.every((artifact) => !visibleHtml.includes(artifact))),
    check('no_server_runtime_markers', 'Export has no server-runtime markers.', !normalized.includes('use server') && !normalized.includes('next/server'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-demo-audit',
    status: failed.length ? 'orbit_demo_audit_blocked' : 'orbit_demo_audit_passed',
    html_file: relative(root, htmlPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length
    },
    demo_order: demoOrderPositions,
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed KosmoOrbit demo audit check: ${item.id}`)
      : [
          'Use this after build when /orbit changes affect the human presentation flow.',
          'Keep browser visual QA separate; this audit only verifies static demo structure.'
        ]
  };
}

function isStrictlyIncreasing(values) {
  return values.every((value, index) => value >= 0 && (index === 0 || value > values[index - 1]));
}

function check(id, label, passed) {
  return {
    id,
    label,
    status: passed ? 'passed' : 'failed'
  };
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Demo Audit',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `HTML: \`${report.html_file}\``,
    '',
    'Static audit for the human presentation flow of `/orbit`. It checks section order, visible approval boundaries and obvious render artifacts without starting a browser or touching cloud resources.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    '',
    '## Demo Order',
    '',
    '| Anchor | Section | Position |',
    '| --- | --- | ---: |'
  ];

  report.demo_order.forEach((item) => {
    lines.push(`| \`${item.id}\` | ${escapePipe(item.label)} | ${item.index} |`);
  });

  lines.push('', '## Checks', '', '| Check | Status | Meaning |', '| --- | --- | --- |');
  report.checks.forEach((item) => {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`);
  });

  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
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
