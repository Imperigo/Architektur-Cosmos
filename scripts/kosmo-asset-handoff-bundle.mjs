#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const exchangePath = resolve(libraryRoot, args.exchange || 'review/asset-exchange-profile.generated.json');
const outputJsonPath = resolve(libraryRoot, args.output || 'review/asset-handoff-bundle.generated.json');
const outputMdPath = resolve(libraryRoot, args.markdown || 'review/asset-handoff-bundle.generated.md');
const blenderPath = resolve(libraryRoot, args.blender || 'review/asset-blender-handoff.generated.py');
const archicadCsvPath = resolve(libraryRoot, args.archicad || 'review/asset-archicad-schedule.generated.csv');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);
  if (!existsSync(exchangePath)) throw new Error(`Exchange profile not found: ${exchangePath}`);

  const library = readJson(libraryPath);
  const exchange = readJson(exchangePath);
  const bundle = buildBundle({ library, exchange });

  await Promise.all([outputJsonPath, outputMdPath, blenderPath, archicadCsvPath].map((pathname) => mkdir(dirname(pathname), { recursive: true })));
  await writeFile(outputJsonPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(bundle), 'utf8');
  await writeFile(blenderPath, renderBlenderPython(bundle), 'utf8');
  await writeFile(archicadCsvPath, renderArchicadCsv(bundle), 'utf8');

  console.log('KosmoAsset handoff bundle generated');
  console.log(`Library: ${relative(root, libraryPath)}`);
  console.log(`Assets: ${bundle.summary.asset_count}`);
  console.log(`Blender rows: ${bundle.summary.blender_row_count}`);
  console.log(`ArchiCAD rows: ${bundle.summary.archicad_row_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
}

function buildBundle({ library, exchange }) {
  const assets = Array.isArray(exchange.assets) ? exchange.assets : [];
  const handoffAssets = assets.map((asset) => ({
    id: asset.id,
    title: asset.title,
    category: asset.category,
    human_review_status: asset.human_review_status,
    public_gate: asset.public_gate,
    blender: asset.blender ? blenderRow(asset) : null,
    archicad: asset.archicad ? archicadRow(asset) : null,
    web: asset.web || null,
    review_note: asset.review_note
  }));

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-handoff-bundle',
    library_id: library.library_id || exchange.library_id || null,
    status: 'local_review_handoff_bundle',
    policy: {
      review_only: true,
      blender_script_writes_scene_by_default: false,
      archicad_csv_is_reference_schedule: true,
      no_uploads: true,
      no_public_downloads: true
    },
    outputs: {
      blender_python: relative(root, blenderPath),
      archicad_schedule_csv: relative(root, archicadCsvPath),
      markdown: relative(root, outputMdPath),
      json: relative(root, outputJsonPath)
    },
    summary: {
      asset_count: handoffAssets.length,
      blender_row_count: handoffAssets.filter((asset) => asset.blender).length,
      archicad_row_count: handoffAssets.filter((asset) => asset.archicad).length,
      blocked_public_count: handoffAssets.filter((asset) => asset.public_gate === 'blocked').length,
      open_review_count: handoffAssets.filter((asset) => asset.human_review_status === 'open').length
    },
    assets: handoffAssets,
    next_actions: [
      'Open the generated Blender Python file and keep ALLOW_SCENE_WRITE = False until a manual smoke test is approved.',
      'Use the ArchiCAD CSV as a naming/reference schedule only; no BIM object is generated in V1.',
      'Close human review before importing assets into production files.',
      'Keep public gates blocked until rights and review are explicit.'
    ]
  };
}

function blenderRow(asset) {
  return {
    collection_name: asset.blender.collection_name,
    import_mode: asset.blender.import_mode,
    material_name: asset.blender.material_name || null,
    object_prefix: asset.blender.object_prefix || null,
    source_file: asset.blender.source_file || null,
    layer_names: asset.blender.layer_names || [],
    approved_for_import: Boolean(asset.blender.approved_for_import)
  };
}

function archicadRow(asset) {
  return {
    exchange_mode: asset.archicad.exchange_mode,
    archicad_layer: asset.archicad.archicad_layer || null,
    archicad_surface: asset.archicad.archicad_surface || null,
    source_file: asset.archicad.source_file || null,
    approved_for_exchange: Boolean(asset.archicad.approved_for_exchange)
  };
}

function renderMarkdown(bundle) {
  const lines = [
    '# KosmoAsset Handoff Bundle',
    '',
    `Library: \`${bundle.library_id}\``,
    `Generated: ${bundle.generated_at}`,
    `Status: \`${bundle.status}\``,
    '',
    'Review-only. The generated Blender script is non-mutating by default and the ArchiCAD CSV is a reference schedule.',
    '',
    '## Outputs',
    '',
    `- Blender Python: \`${bundle.outputs.blender_python}\``,
    `- ArchiCAD CSV: \`${bundle.outputs.archicad_schedule_csv}\``,
    `- JSON: \`${bundle.outputs.json}\``,
    '',
    '## Summary',
    '',
    `- assets: ${bundle.summary.asset_count}`,
    `- Blender rows: ${bundle.summary.blender_row_count}`,
    `- ArchiCAD rows: ${bundle.summary.archicad_row_count}`,
    `- public gates blocked: ${bundle.summary.blocked_public_count}`,
    `- open reviews: ${bundle.summary.open_review_count}`,
    '',
    '## Handoff Rows',
    '',
    '| Asset | Blender collection | ArchiCAD layer/surface | Review |',
    '| --- | --- | --- | --- |'
  ];

  for (const asset of bundle.assets) {
    const blender = asset.blender?.collection_name || '-';
    const archicad = asset.archicad?.archicad_layer || asset.archicad?.archicad_surface || '-';
    lines.push(`| ${escapePipe(asset.title)} | \`${escapePipe(blender)}\` | \`${escapePipe(archicad)}\` | ${escapePipe(asset.human_review_status)} |`);
  }

  lines.push('', '## Next Actions', '');
  bundle.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

function renderBlenderPython(bundle) {
  const rows = bundle.assets.filter((asset) => asset.blender);
  return `# Generated by Architecture Cosmos / KosmoAsset
# Review-only Blender handoff. It does not modify the scene unless ALLOW_SCENE_WRITE is set to True.

ALLOW_SCENE_WRITE = False

ASSETS = ${JSON.stringify(rows.map((asset) => ({
    id: asset.id,
    title: asset.title,
    collection_name: asset.blender.collection_name,
    import_mode: asset.blender.import_mode,
    material_name: asset.blender.material_name,
    source_file: asset.blender.source_file,
    layer_names: asset.blender.layer_names,
    approved_for_import: asset.blender.approved_for_import
  })), null, 2)}


def run():
    print("KosmoAsset Blender handoff")
    for asset in ASSETS:
        print(f"- {asset['title']}: {asset['import_mode']} -> {asset['collection_name']}")
        if not asset.get("approved_for_import"):
            print("  review gate: not approved for production import")
    if not ALLOW_SCENE_WRITE:
        print("Review-only mode. Set ALLOW_SCENE_WRITE = True only inside an approved smoke-test file.")
        return
    import bpy
    for asset in ASSETS:
        collection = bpy.data.collections.get(asset["collection_name"]) or bpy.data.collections.new(asset["collection_name"])
        if collection.name not in [child.name for child in bpy.context.scene.collection.children]:
            try:
                bpy.context.scene.collection.children.link(collection)
            except TypeError:
                pass
        if asset.get("material_name") and not bpy.data.materials.get(asset["material_name"]):
            bpy.data.materials.new(asset["material_name"])


if __name__ == "__main__":
    run()
`;
}

function renderArchicadCsv(bundle) {
  const header = ['asset_id', 'title', 'exchange_mode', 'archicad_layer', 'archicad_surface', 'source_file', 'approved_for_exchange', 'review_status'];
  const rows = bundle.assets
    .filter((asset) => asset.archicad)
    .map((asset) => [
      asset.id,
      asset.title,
      asset.archicad.exchange_mode,
      asset.archicad.archicad_layer || '',
      asset.archicad.archicad_surface || '',
      asset.archicad.source_file || '',
      String(asset.archicad.approved_for_exchange),
      asset.human_review_status
    ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
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

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
