#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const htmlPath = resolve(root, args.html || 'out/orbit/index.html');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-orbit/review/orbit-static-export-smoke.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-orbit/review/orbit-static-export-smoke.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(htmlPath)) {
    throw new Error(`KosmoOrbit static export not found: ${htmlPath}. Run npm run build:fresh first.`);
  }

  const html = readFileSync(htmlPath, 'utf8');
  const report = buildReport(html);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoOrbit static export smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'orbit_static_export_smoke_passed') process.exit(1);
}

function buildReport(html) {
  const normalizedHtml = html.replace(/<!--\s*-->/g, '').replace(/\s+/g, ' ');
  const referencedStaticAssets = staticAssetReferences(html);
  const missingStaticAssets = referencedStaticAssets.filter((assetPath) => !existsSync(resolve(root, 'out', assetPath)));
  const checks = [
    check('html_exists', 'Static /orbit HTML exists.', existsSync(htmlPath)),
    check('referenced_static_assets_exist', 'Every _next/static asset referenced by /orbit exists in out/.', referencedStaticAssets.length > 0 && missingStaticAssets.length === 0),
    check('renders_kosmo_orbit', 'Export renders KosmoOrbit heading.', html.includes('KosmoOrbit')),
    check('renders_hub_return', 'Export renders safe return link to the Kosmo Hub.', html.includes('Zurueck zum Kosmo-Hub')),
    check('renders_demo_navigation', 'Export renders compact demo navigation.', html.includes('Demo-Navigation')),
    check('renders_grouped_demo_navigation', 'Export renders grouped demo navigation lanes.', ['Schnellpfad', 'Pilot', 'System', 'Review', 'Betrieb', 'Rollen'].every((label) => html.includes(label))),
    check('renders_autonomy_status', 'Export renders autonomy status.', html.includes('Autonomie-Status')),
    check('renders_office_routine', 'Export renders office routine contract.', html.includes('Buero-Routine') && html.includes('Morgenstart der KosmoZentrale')),
    check('renders_tool_registry', 'Export renders KosmoOrbit tool registry.', html.includes('Tool-Orchestrierung') && html.includes('Software-Zentrale') && html.includes('Workspace Contract')),
    check('renders_presenter_mode', 'Export renders presenter mode.', html.includes('Presenter-Modus')),
    check('renders_workflow_delta', 'Export renders workflow delta.', html.includes('Workflow-Delta') && html.includes('heutigen Bueroablauf')),
    check('renders_pilot_measurement', 'Export renders pilot measurement.', html.includes('Pilotmessung') && html.includes('evidence-before-claim')),
    check('renders_pilot_measurement_kit', 'Export renders pilot measurement kit.', html.includes('Pilot-Messkit') && html.includes('Buerotest messen')),
    check('renders_pilot_facilitator_checklist', 'Export renders pilot facilitator checklist.', html.includes('Facilitator Checkliste') && html.includes('Bueropilot fuehren')),
    check('renders_pilot_result_draft', 'Export renders pilot result draft.', html.includes('Pilot Result Draft') && html.includes('Ergebnisstruktur bereit')),
    check('renders_pilot_runbook', 'Export renders pilot runbook.', html.includes('Pilot-Runbook') && html.includes('45-60 Minuten')),
    check('renders_pilot_session_template', 'Export renders pilot session template.', html.includes('Pilot-Session Template') && html.includes('Messstruktur bereit')),
    check('renders_progress_map', 'Export renders progress map.', html.includes('Projektfortschritt')),
    check('renders_vision_bridge', 'Export renders vision bridge.', html.includes('Vision Bridge') && html.includes('Orchestrierung vor Generierung')),
    check('renders_demo_readiness', 'Export renders demo readiness.', html.includes('Demo-Bereitschaft') && html.includes('Static Export')),
    check('renders_static_asset_readiness', 'Export renders static CSS/JS asset readiness.', html.includes('CSS/JS-Assets') && html.includes('fehlend')),
    check('renders_publish_readiness', 'Export renders publish readiness live gate.', html.includes('Live-Gate') && html.includes('no-push-without-owner-go')),
    check('renders_launch_decision_brief', 'Export renders launch decision brief.', html.includes('Launch Decision Brief') && html.includes('push-decision-not-automatic')),
    check('renders_push_readiness_report', 'Export renders push readiness report summary.', html.includes('Push Readiness Report') && html.includes('Checks gruen')),
    check('renders_push_command_evidence', 'Export renders push readiness command evidence.', html.includes('Command Evidence') && html.includes('git diff --check') && html.includes('node_modules/.bin/tsc --noEmit')),
    check('renders_office_pilot_scene', 'Export renders office pilot scene.', html.includes('Buero-Pilot Szene') && html.includes('local-office-pilot-review-only')),
    check('renders_project_dashboard', 'Export renders project package dashboard.', html.includes('Projektpaket Tagesansicht')),
    check('renders_design_handoff_panel', 'Export renders KosmoDesign handoff review console.', html.includes('KosmoDesign Handoff') && html.includes('Review Console')),
    check('renders_design_pilot_path', 'Export renders KosmoDesign pilot path.', html.includes('KosmoDesign Pilotpfad') && html.includes('review-pilot-before-generation')),
    check('renders_review_decision', 'Export renders review decision draft.', html.includes('Review Decision Draft')),
    check('renders_runtime_boundary', 'Export renders MVP/runtime boundary.', html.includes('MVP-Grenze')),
    check('renders_runtime_contract', 'Export renders local runtime contract.', html.includes('Runtime-Vertrag') && html.includes('no-process-launch')),
    check('renders_runtime_adapter', 'Export renders runtime adapter contract.', html.includes('Runtime Adapter') && html.includes('Bruecke von KosmoOrbit zur lokalen KosmoZentrale') && html.includes('Promotion Requirements')),
    check('renders_installation_topology', 'Export renders local office installation topology.', html.includes('Buero-Installation') && html.includes('local-appliance-map')),
    check('renders_health_readiness', 'Export renders local health readiness contract.', html.includes('Health Readiness') && html.includes('read-only-telemetry-contract')),
    check('renders_risk_register', 'Export renders human approval risk register.', html.includes('Risiko-Register') && html.includes('human-approval-risk-register')),
    check('renders_command_contract', 'Export renders static command contract.', html.includes('Command-Vertrag') && html.includes('static-command-contract')),
    check('renders_audit_trail', 'Export renders static audit trail contract.', html.includes('Audit-Trail-Vertrag') && html.includes('static-audit-trail-contract')),
    check('renders_quality_evidence', 'Export renders quality evidence.', html.includes('Pruefevidenz')),
    check('renders_workstation_priorities', 'Export renders workstation priorities.', html.includes('Arbeitsstationen')),
    check('renders_workstation_profile_contract', 'Export renders workstation profile contract.', html.includes('Workstation Profile Contract') && html.includes('Wie KosmoOrbit je Arbeitsplatz startet')),
    check('renders_local_identity_contract', 'Export renders local identity contract.', html.includes('Local Identity Boundary') && html.includes('Was spaeter Profil, Auth und Session wird')),
    check('renders_data_governance_contract', 'Export renders data governance contract.', html.includes('Data Governance Boundary') && html.includes('Welche lokalen Daten KosmoOrbit spaeter speichern darf')),
    check('renders_office_memory_readiness', 'Export renders office memory readiness.', html.includes('Office Memory Readiness') && html.includes('Was spaeter lokales Buero-Gedaechtnis werden darf')),
    check('renders_local_storage_decision', 'Export renders local storage decision draft.', html.includes('Local Storage Decision Draft') && html.includes('Welche Speicherentscheidung vor echtem Memory noetig ist')),
    check('renders_learning_mode', 'Export renders education mode.', html.includes('Ausbildungsmodus') && html.includes('Kosmo als sicherer Lernbegleiter')),
    check('renders_permission_matrix', 'Export renders permission matrix.', html.includes('Rechte-Matrix') && html.includes('generation bleibt gesperrt')),
    check('renders_role_switcher', 'Export renders role switcher.', html.includes('Rollenumschaltung Preview')),
    check('renders_guided_review_path', 'Export renders guided review path.', html.includes('Gefuehrter Demo-Review-Pfad')),
    check('anchors_core_sections', 'Export contains section anchors.', ['autonomie', 'routine', 'tool-registry', 'workflow-delta', 'pilotmessung', 'pilot-kit', 'pilot-checklist', 'pilot-result', 'pilotplan', 'pilot-session', 'fortschritt', 'vision', 'demo-ready', 'live-gate', 'launch-brief', 'office-pilot', 'projektpaket', 'design-handoff', 'design-pilot', 'entscheidung', 'runtime', 'runtime-contract', 'runtime-adapter', 'installation', 'health', 'risiken', 'commands', 'audit', 'evidenz', 'workstation-profile', 'local-identity', 'data-governance', 'office-memory', 'local-storage-decision', 'ausbildung', 'rechte', 'rollen', 'guardrails'].every((id) => html.includes(`id="${id}"`))),
    check('keeps_no_runtime_side_effects', 'Export states that runtime side effects are off.', html.includes('no-runtime-side-effects')),
    check('keeps_runtime_contract_safe', 'Export keeps runtime process/model/queue actions gated.', html.includes('kein Modellstart') && html.includes('keine Prozessstarts') && html.includes('keine Queue') && html.includes('kein Memory-Write')),
    check('keeps_runtime_adapter_safe', 'Export keeps runtime adapters non-operational.', html.includes('keine Adapter werden') && html.includes('kein Prozess') && html.includes('keine Daten') && html.includes('keine externen')),
    check('keeps_workflow_delta_honest', 'Export keeps workflow delta honest about savings.', html.includes('no-roi-claim') && html.includes('Keine Garantie auf konkrete Prozentersparnis')),
    check('keeps_workstation_profile_review_only', 'Export keeps workstation profiles non-operational.', html.includes('keine Accounts') && html.includes('keine User-Writes') && html.includes('keine Persistenz') && html.includes('keine echte Auth-Runtime')),
    check('keeps_local_identity_review_only', 'Export keeps local identity non-operational.', html.includes('keine Logins') && html.includes('keine Passwoerter') && html.includes('keine Profilpersistenz') && html.includes('keine Session-Cookies') && html.includes('keine personenbezogenen Writes') && html.includes('kein externer Identity Provider')),
    check('keeps_data_governance_review_only', 'Export keeps data governance storage, backup and sync actions blocked.', html.includes('keine D1-Writes') && html.includes('keine R2-Uploads') && html.includes('keine Kundendaten-Writes') && html.includes('kein Backup-Job') && html.includes('kein externer Sync')),
    check('keeps_office_memory_review_only', 'Export keeps office memory writes, scans, embeddings, backup status, external sync and cloud vector stores blocked.', html.includes('kein Memory-Write') && html.includes('kein Kundendatei-Scan') && html.includes('kein Embedding-Job') && html.includes('kein Backup-Status-Write') && html.includes('kein externer Memory-Sync') && html.includes('kein Cloud Vector Store')),
    check('keeps_local_storage_decision_review_only', 'Export keeps storage writes, memory writes, indexing, embeddings, backup, restore and external sync blocked.', html.includes('kein local storage write') && html.includes('kein Memory-Write') && html.includes('kein Kundendaten-Index') && html.includes('kein Embedding-Job') && html.includes('kein Backup-Job') && html.includes('kein Restore-Job') && html.includes('kein externer Sync')),
    check('keeps_pilot_measurement_safe', 'Export keeps pilot measurement safe and local.', html.includes('keine Kundendaten') && html.includes('keine Uploads') && html.includes('keine Kostenjobs')),
    check('keeps_pilot_measurement_kit_empty', 'Export keeps pilot measurement kit empty before real pilot.', html.includes('before null') && html.includes('after null') && html.includes('human note null') && html.includes('not scored')),
    check('keeps_pilot_facilitator_safe', 'Export keeps pilot facilitator checklist safe and local.', html.includes('keine Kundendaten speichern') && html.includes('keine Kostenjobs') && html.includes('kein Push oder Deploy ohne Owner-Go')),
    check('keeps_pilot_result_draft_empty', 'Export keeps pilot result draft empty before real pilot.', html.includes('value null') && html.includes('note null') && html.includes('evidence null') && normalizedHtml.includes('Publication: blocked')),
    check('keeps_pilot_runbook_safe', 'Export keeps pilot runbook safe and local.', html.includes('keine Kundendaten') && html.includes('keine Design-Generation') && html.includes('kein Push ohne Owner-Go')),
    check('keeps_pilot_session_template_empty', 'Export keeps pilot session measurements empty.', html.includes('before null') && html.includes('after null') && html.includes('Keine Pilotwerte sind behauptet')),
    check('keeps_publish_readiness_safe', 'Export keeps publish readiness blocked without owner go.', html.includes('Owner-Go') && html.includes('Security Review') && html.includes('Live-Smoke')),
    check('keeps_launch_decision_human_gated', 'Export keeps launch decision human-gated.', html.includes('Owner-Entscheid') && html.includes('Pilot-Evidenz') && html.includes('keine unbewiesenen Public Claims')),
    check('keeps_push_readiness_owner_gated', 'Export keeps push readiness owner-gated.', html.includes('Push-ready nur falls Owner-Go') && html.includes('Ohne Owner-Go blockiert')),
    check('keeps_office_pilot_review_only', 'Export keeps office pilot scene review-only and claim-safe.', html.includes('keine Kundendaten hochladen') && html.includes('keine Geometrie- oder Plan-Writes') && html.includes('keine Design-Generation') && html.includes('keine unbewiesenen Zeit-/Kostenclaims')),
    check('keeps_design_pilot_before_generation', 'Export keeps KosmoDesign pilot review before generation.', html.includes('keine Design-Generation') && html.includes('keine Geometrie-Writes') && html.includes('keine Kosten-/Zeitersparnis behaupten')),
    check('keeps_installation_topology_safe', 'Export keeps installation topology non-operational.', html.includes('keine Hardware-Steuerung') && html.includes('keine echte Auth-Runtime') && html.includes('keine Netzwerksteuerung')),
    check('keeps_office_routine_safe', 'Export keeps office routine non-operational.', html.includes('Keine versteckte Vollautomation') && html.includes('launch blender') && html.includes('spend money')),
    check('keeps_tool_registry_safe', 'Export keeps tool registry non-operational.', html.includes('Keine Tool-Launches') && html.includes('keine Modellstarts') && html.includes('keine Uploads') && html.includes('keine Kostenjobs') && html.includes('keine Public-Freigabe')),
    check('keeps_health_readiness_safe', 'Export keeps health readiness non-operational.', html.includes('keine Hardwarebefehle') && html.includes('keine Dateisystem-Scans') && html.includes('keine Queue-Aktionen')),
    check('keeps_risk_register_human_gated', 'Export keeps risk register human-gated.', html.includes('menschliche Freigaben') && html.includes('Naechstes Gate')),
    check('keeps_command_contract_static', 'Export keeps command contract non-operational.', html.includes('keine Prozessstarts') && html.includes('keine Geometrie-Generierung') && html.includes('keine User-Writes')),
    check('keeps_audit_trail_static', 'Export keeps audit trail non-writing.', normalizedHtml.includes('keine Userdaten') && normalizedHtml.includes('Writes: nein')),
    check('keeps_design_handoff_generation_blocked', 'Export keeps KosmoDesign generation blocked.', html.includes('Generate Design') && html.includes('Design generation is blocked')),
    check('keeps_learning_mode_safe', 'Export keeps learning mode read-safe.', html.includes('ohne Accounts') && html.includes('Projekt-Writes') && html.includes('Public-Publish')),
    check('no_server_runtime_markers', 'Export does not include server runtime markers.', !html.includes('use server') && !html.includes('next/server'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-orbit-static-export-smoke',
    status: failed.length ? 'orbit_static_export_smoke_blocked' : 'orbit_static_export_smoke_passed',
    html_file: relative(root, htmlPath),
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failed_checks: failed.length,
      referenced_static_asset_count: referencedStaticAssets.length,
      missing_static_asset_count: missingStaticAssets.length
    },
    static_assets: {
      referenced: referencedStaticAssets,
      missing: missingStaticAssets
    },
    checks,
    next_actions: failed.length
      ? failed.map((item) => `Fix failed static export smoke check: ${item.id}`)
      : [
          'Use this smoke after build:fresh before publishing /orbit changes.',
          'Add visual browser smoke only after the static export contract stays green.'
        ]
  };
}

function check(id, label, passed) {
  return {
    id,
    label,
    status: passed ? 'passed' : 'failed'
  };
}

function staticAssetReferences(html) {
  const matches = new Set();
  const patterns = [
    /(?:href|src)="\/?(_next\/static\/[^"]+)"/g,
    /(?:href|src)=\\?"\/?(_next\/static\/[^"\\]+)\\?"/g
  ];
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(html))) {
      matches.add(match[1].replace(/\\+$/g, ''));
    }
  });
  return [...matches].sort();
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoOrbit Static Export Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `HTML: \`${report.html_file}\``,
    '',
    'Checks the built static export for the visible KosmoOrbit demo panels. It does not start a server, call networks, write cloud data or open local tools.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    '',
    '## Checks',
    '',
    '| Check | Status | Meaning |',
    '| --- | --- | --- |'
  ];

  report.checks.forEach((item) => {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${escapePipe(item.label)} |`);
  });

  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));

  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}
