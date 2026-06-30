#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { publicLeakMatches } from './public-leak-patterns.mjs';

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
  const leakMatches = publicLeakMatches(html);
  const checks = [
    check('html_exists', 'Static /orbit HTML exists.', existsSync(htmlPath)),
    check('referenced_static_assets_exist', 'Every _next/static asset referenced by /orbit exists in out/.', referencedStaticAssets.length > 0 && missingStaticAssets.length === 0),
    check('renders_kosmo_orbit', 'Export renders KosmoOrbit heading.', html.includes('KosmoOrbit')),
    check('renders_public_context', 'Export renders public development status context.', html.includes('Öffentlicher Entwicklungsstand') && html.includes('Öffentlich einsehbar') && html.includes('Stand 23. Juni 2026')),
    check('renders_current_public_headline', 'Export renders current public Orbit headline.', html.includes('Wo der ArchitekturKosmos bereits arbeitet')),
    check('renders_public_gate_notice', 'Export renders public release and privacy notice.', html.includes('Öffentliche Freigabe') && html.includes('Interne Worker-Protokolle') && html.includes('private Quellen bleiben ausserhalb der Website')),
    check('renders_public_metrics', 'Export renders public metrics.', ['Öffentliche Referenzen', 'Öffentliche Assets', '3D-Vorschauen', 'Unsichere Freigaben'].every((label) => html.includes(label))),
    check('renders_system_areas', 'Export renders public system areas.', ['KosmoReferences', 'KosmoAsset', 'KosmoDraw', 'Kosmo KI'].every((label) => html.includes(label))),
    check('renders_system_area_states', 'Export renders current system area states.', ['In Betrieb', 'In Anbindung', 'Im Aufbau'].every((label) => html.includes(label))),
    check('renders_public_pilot_section', 'Export renders the two public pilot projects section.', html.includes('Zwei Piloten zeigen den Weg vom Bau zum Wissen')),
    check('renders_villa_pilot_link', 'Export renders Villa Savoye pilot link.', html.includes('Villa Savoye') && html.includes('/atlas/villa-savoye/')),
    check('renders_ingenbohl_pilot_link', 'Export renders Ingenbohl pilot link.', html.includes('Alterszentrum Kloster Ingenbohl') && html.includes('/atlas/alterszentrum-kloster-ingenbohl/')),
    check('renders_public_principles', 'Export renders public safety principles.', ['Nachvollziehbare Quellen', 'Menschliche Freigabe', 'Private Daten bleiben lokal'].every((label) => html.includes(label))),
    check('keeps_private_sources_off_site', 'Export states that private local sources are not delivered through the website.', normalizedHtml.includes('Bücher, Scans, Vorlesungen und lokale Zwischenstände werden nicht über die Website ausgeliefert.')),
    check('keeps_public_orbit_static', 'Export keeps Orbit as static public status page.', !html.includes('use server') && !html.includes('next/server') && !html.includes('/api/')),
    check('no_private_leak_patterns', `Export contains no blocked private/source leak patterns: ${leakMatches.join(', ') || 'none'}.`, leakMatches.length === 0),
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
      missing_static_asset_count: missingStaticAssets.length,
      private_leak_pattern_count: leakMatches.length
    },
    static_assets: {
      referenced: referencedStaticAssets,
      missing: missingStaticAssets
    },
    private_leak_patterns: leakMatches,
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
