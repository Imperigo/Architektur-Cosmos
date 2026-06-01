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
  const checks = [
    check('html_exists', 'Static /orbit HTML exists.', existsSync(htmlPath)),
    check('renders_kosmo_orbit', 'Export renders KosmoOrbit heading.', html.includes('KosmoOrbit')),
    check('renders_demo_navigation', 'Export renders compact demo navigation.', html.includes('Demo-Navigation')),
    check('renders_autonomy_status', 'Export renders autonomy status.', html.includes('Autonomie-Status')),
    check('renders_presenter_mode', 'Export renders presenter mode.', html.includes('Presenter-Modus')),
    check('renders_progress_map', 'Export renders progress map.', html.includes('Projektfortschritt')),
    check('renders_vision_bridge', 'Export renders vision bridge.', html.includes('Vision Bridge') && html.includes('Orchestrierung vor Generierung')),
    check('renders_demo_readiness', 'Export renders demo readiness.', html.includes('Demo-Bereitschaft') && html.includes('Static Export')),
    check('renders_project_dashboard', 'Export renders project package dashboard.', html.includes('Projektpaket Tagesansicht')),
    check('renders_review_decision', 'Export renders review decision draft.', html.includes('Review Decision Draft')),
    check('renders_runtime_boundary', 'Export renders MVP/runtime boundary.', html.includes('MVP-Grenze')),
    check('renders_runtime_contract', 'Export renders local runtime contract.', html.includes('Runtime-Vertrag') && html.includes('no-process-launch')),
    check('renders_installation_topology', 'Export renders local office installation topology.', html.includes('Buero-Installation') && html.includes('local-appliance-map')),
    check('renders_health_readiness', 'Export renders local health readiness contract.', html.includes('Health Readiness') && html.includes('read-only-telemetry-contract')),
    check('renders_quality_evidence', 'Export renders quality evidence.', html.includes('Pruefevidenz')),
    check('renders_workstation_priorities', 'Export renders workstation priorities.', html.includes('Arbeitsstationen')),
    check('renders_permission_matrix', 'Export renders permission matrix.', html.includes('Rechte-Matrix') && html.includes('generation bleibt gesperrt')),
    check('renders_role_switcher', 'Export renders role switcher.', html.includes('Rollenumschaltung Preview')),
    check('renders_guided_review_path', 'Export renders guided review path.', html.includes('Gefuehrter Demo-Review-Pfad')),
    check('anchors_core_sections', 'Export contains section anchors.', ['autonomie', 'fortschritt', 'vision', 'demo-ready', 'projektpaket', 'entscheidung', 'runtime', 'runtime-contract', 'installation', 'health', 'evidenz', 'rechte', 'rollen', 'guardrails'].every((id) => html.includes(`id="${id}"`))),
    check('keeps_no_runtime_side_effects', 'Export states that runtime side effects are off.', html.includes('no-runtime-side-effects')),
    check('keeps_runtime_contract_safe', 'Export keeps runtime process/model/queue actions gated.', html.includes('kein Modellstart') && html.includes('keine Prozessstarts') && html.includes('keine Queue') && html.includes('kein Memory-Write')),
    check('keeps_installation_topology_safe', 'Export keeps installation topology non-operational.', html.includes('keine Hardware-Steuerung') && html.includes('keine echte Auth-Runtime') && html.includes('keine Netzwerksteuerung')),
    check('keeps_health_readiness_safe', 'Export keeps health readiness non-operational.', html.includes('keine Hardwarebefehle') && html.includes('keine Dateisystem-Scans') && html.includes('keine Queue-Aktionen')),
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
      failed_checks: failed.length
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
