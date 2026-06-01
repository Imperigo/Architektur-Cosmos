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
    { id: 'presenter', label: '3-Minuten-Erklaerung' },
    { id: 'fortschritt', label: 'Projektfortschritt' },
    { id: 'vision', label: 'Vision Bridge' },
    { id: 'demo-ready', label: 'Demo-Bereitschaft' },
    { id: 'projektpaket', label: 'Projektpaket Tagesansicht' },
    { id: 'entscheidung', label: 'Review Decision Draft' },
    { id: 'runtime-contract', label: 'Runtime-Vertrag' },
    { id: 'installation', label: 'Buero-Installation' },
    { id: 'evidenz', label: 'Pruefevidenz' },
    { id: 'rechte', label: 'Rechte-Matrix' },
    { id: 'rollen', label: 'Rollenumschaltung Preview' }
  ];
  const demoOrderPositions = demoOrder.map((section) => ({
    id: section.id,
    label: section.label,
    index: normalized.indexOf(`id="${section.id}"`)
  }));
  const navLabels = ['Autonomie', '3-Minuten', 'Fortschritt', 'Vision', 'Demo', 'Projektpaket', 'Decision', 'Runtime', 'Installation', 'Evidenz', 'Rechte', 'Rollen', 'Guardrails'];
  const forbiddenArtifacts = ['[object Object]', 'NaN%', 'null null'];
  const checks = [
    check('html_exists', 'Built /orbit HTML exists.', existsSync(htmlPath)),
    check('demo_order_complete', 'Core demo section anchors are all present.', demoOrderPositions.every((item) => item.index >= 0)),
    check('demo_order_logical', 'Core demo sections appear in the intended presentation order.', isStrictlyIncreasing(demoOrderPositions.map((item) => item.index))),
    check('navigation_complete', 'Demo navigation exposes all core stops.', navLabels.every((label) => normalized.includes(label))),
    check('approval_boundary_visible', 'Approval boundary is visible in the export.', normalized.includes('kein Push ohne Freigabe') && normalized.includes('keine Cloud-Kosten')),
    check('review_only_visible', 'Review-only mode is visible in the export.', normalized.includes('review-only') || normalized.includes('Review Mode')),
    check('vision_bridge_visible', 'Vision bridge is visible in the export.', normalized.includes('Vision Bridge') && normalized.includes('Orchestrierung vor Generierung')),
    check('runtime_contract_visible', 'Runtime contract is visible and non-operational.', normalized.includes('Runtime-Vertrag') && normalized.includes('no-process-launch')),
    check('installation_topology_visible', 'Office installation topology is visible in the export.', normalized.includes('Buero-Installation') && normalized.includes('local-appliance-map')),
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
