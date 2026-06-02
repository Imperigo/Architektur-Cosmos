#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const htmlPath = resolve(root, args.html || 'out/atlas/index.html');
const outputJsonPath = resolve(root, args.output || 'examples/kosmo-data/review/atlas-static-export-smoke.generated.json');
const outputMdPath = resolve(root, args.markdown || 'examples/kosmo-data/review/atlas-static-export-smoke.generated.md');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(htmlPath)) {
    throw new Error(`KosmoData static export not found: ${htmlPath}. Run npm run build:fresh first.`);
  }

  const html = readFileSync(htmlPath, 'utf8');
  const report = buildReport(html);

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true })
  ]);
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoData atlas static export smoke');
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);

  if (report.status !== 'atlas_static_export_smoke_passed') process.exit(1);
}

function buildReport(html) {
  const referencedStaticAssets = staticAssetReferences(html);
  const missingStaticAssets = referencedStaticAssets.filter((assetPath) => !existsSync(resolve(root, 'out', assetPath)));
  const checks = [
    check('html_exists', 'Static /atlas HTML exists.', existsSync(htmlPath)),
    check('referenced_static_assets_exist', 'Every _next/static asset referenced by /atlas exists in out/.', referencedStaticAssets.length > 0 && missingStaticAssets.length === 0),
    check('renders_architektur_kosmos_intro', 'Export renders the intro title.', html.includes('Architektur') && html.includes('Kosmos')),
    check('renders_kosmodata_module', 'Export includes the KosmoData module handoff.', html.includes('KosmoData')),
    check('renders_database_copy', 'Export includes database panel copy.', html.includes('Datenbank') || html.includes('Archive')),
    check('renders_relation_copy', 'Export includes relation/network copy.', html.includes('Relation') || html.includes('Netzwerk')),
    check('renders_known_entry_villa_savoye', 'Export includes Villa Savoye data.', html.includes('Villa Savoye')),
    check('renders_known_entry_hagia_sophia', 'Export includes Hagia Sophia data.', html.includes('Hagia Sophia')),
    check('renders_known_entry_mfo_park', 'Export includes MFO Park data.', html.includes('MFO Park')),
    check('exports_entry_detail_routes', 'Export includes static detail route HTML files.', existsSync(resolve(root, 'out/atlas/gobekli-tepe/index.html')) && existsSync(resolve(root, 'out/atlas/mfo-park/index.html'))),
    check('renders_image_media_slots', 'Export includes media/image vocabulary.', html.includes('Bild') || html.includes('Media')),
    check('renders_model_vocabulary', 'Export includes 3D/model vocabulary.', html.includes('3D') || html.includes('Modell')),
    check('keeps_public_safe_boundary', 'Export keeps public/private boundary copy.', html.includes('public-safe') || html.includes('keine automatische Veröffentlichung') || html.includes('gesperrt')),
    check('keeps_static_frontend_boundary', 'Export does not include server runtime markers.', !html.includes('use server') && !html.includes('next/server')),
    check('has_serialized_entry_payload', 'Export includes serialized entry data for hydration.', html.includes('entry_type') && html.includes('style_sector') && html.includes('relations')),
    check('has_german_metadata', 'Export has German document language.', html.includes('<html lang="de"')),
    check('has_icon_links', 'Export includes icon links.', html.includes('href="/icon.svg"'))
  ];
  const failed = checks.filter((item) => item.status !== 'passed');

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'atlas-static-export-smoke',
    status: failed.length ? 'atlas_static_export_smoke_blocked' : 'atlas_static_export_smoke_passed',
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
      ? failed.map((item) => `Fix failed atlas static export smoke check: ${item.id}`)
      : [
          'Use this smoke after build:fresh before publishing KosmoData changes.',
          'Pair with atlas:interaction-guard for click, filter and dossier contracts.'
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
    '# KosmoData Atlas Static Export Smoke',
    '',
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `HTML: \`${report.html_file}\``,
    '',
    'Checks the built static export for the KosmoData `/atlas` shell, serialized entry payload and referenced CSS/JS assets. It does not start a server, call networks, write cloud data or open local tools.',
    '',
    '## Summary',
    '',
    `- checks: ${report.summary.passed_checks}/${report.summary.check_count} passed`,
    `- referenced static assets: ${report.summary.referenced_static_asset_count}`,
    `- missing static assets: ${report.summary.missing_static_asset_count}`,
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
