#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const libraryPath = resolve(root, args.library || 'examples/kosmo-assets/kosmo-asset-demo/library.json');
const libraryRoot = dirname(libraryPath);
const assetId = String(args.asset || '').trim();
const route = String(args.route || 'blender').trim();
const decisionPath = resolve(libraryRoot, args.decision || `review/asset-review-decision-${assetId}-${route}.generated.json`);
const outputJsonPath = resolve(libraryRoot, args.output || `review/asset-blender-sandbox-${assetId}.generated.json`);
const outputMdPath = resolve(libraryRoot, args.markdown || `review/asset-blender-sandbox-${assetId}.generated.md`);
const outputPythonPath = resolve(libraryRoot, args.python || `review/asset-blender-sandbox-${assetId}.generated.py`);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  if (!existsSync(libraryPath)) throw new Error(`KosmoAsset library not found: ${libraryPath}`);
  if (!assetId) throw new Error('Missing --asset <asset_id>');
  if (route !== 'blender') throw new Error('Blender sandbox currently requires --route blender.');

  const library = readJson(libraryPath);
  const asset = (library.assets || []).find((candidate) => candidate.id === assetId);
  if (!asset) throw new Error(`Asset not found in library: ${assetId}`);

  const handoffBundle = readRequiredJson(resolve(libraryRoot, 'review/asset-handoff-bundle.generated.json'), 'handoff bundle');
  const handoffSmoke = readRequiredJson(resolve(libraryRoot, 'review/asset-handoff-smoke.generated.json'), 'handoff smoke');
  const decision = readRequiredJson(decisionPath, 'local review decision');
  const handoffAsset = (handoffBundle.assets || []).find((candidate) => candidate.id === assetId);
  const report = buildSandboxReport({ library, asset, handoffAsset, handoffBundle, handoffSmoke, decision });

  await Promise.all([
    mkdir(dirname(outputJsonPath), { recursive: true }),
    mkdir(dirname(outputMdPath), { recursive: true }),
    mkdir(dirname(outputPythonPath), { recursive: true })
  ]);
  await writeFile(outputPythonPath, renderBlenderSandboxPython(report), 'utf8');
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(report), 'utf8');

  console.log('KosmoAsset Blender sandbox');
  console.log(`Asset: ${asset.title}`);
  console.log(`Status: ${report.status}`);
  console.log(`Checks: ${report.summary.passed_checks}/${report.summary.check_count}`);
  console.log(`Wrote: ${relative(root, outputPythonPath)}`);

  if (report.summary.failure_count > 0) process.exit(1);
}

function buildSandboxReport({ library, asset, handoffAsset, handoffBundle, handoffSmoke, decision }) {
  const checks = [
    check('decision_recorded', decision.status === 'local_review_decision_recorded', `Decision status is ${decision.status || 'missing'}.`),
    check('decision_route', decision.route === 'blender', `Decision route is ${decision.route || 'missing'}.`),
    check('smoke_passed', handoffSmoke.summary?.failure_count === 0, `Handoff smoke status is ${handoffSmoke.status || 'missing'}.`),
    check('handoff_blender_profile', Boolean(handoffAsset?.blender), 'Handoff bundle has a Blender profile for this asset.'),
    check('public_gate_blocked', handoffAsset?.public_gate === 'blocked', 'Public gate remains blocked.'),
    check('source_file_exists', Boolean(handoffAsset?.blender?.source_file && existsSync(resolve(root, handoffAsset.blender.source_file))), 'Referenced local source file exists.'),
    check('no_project_file_writes', true, 'Generated sandbox script does not save or open Blender project files.'),
    check('no_uploads', true, 'Generated sandbox script does not upload or publish assets.')
  ];
  const failureCount = checks.filter((item) => item.status !== 'passed').length;
  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-asset-blender-sandbox',
    library_path: relative(root, libraryPath),
    library_id: library.library_id || null,
    asset_id: asset.id,
    asset_title: asset.title,
    status: failureCount ? 'blender_sandbox_blocked' : 'blender_sandbox_script_ready',
    policy: {
      sandbox_only: true,
      no_blend_save: true,
      no_mainfile_open: true,
      no_asset_upload: true,
      no_public_download: true,
      no_library_mutation: true,
      requires_copied_blender_file: true
    },
    summary: {
      check_count: checks.length,
      passed_checks: checks.filter((item) => item.status === 'passed').length,
      failure_count: failureCount
    },
    blender: {
      collection_name: `KOSMO_SANDBOX/${asset.id}`,
      import_mode: handoffAsset?.blender?.import_mode || 'metadata_placeholder',
      material_name: handoffAsset?.blender?.material_name || null,
      source_file: handoffAsset?.blender?.source_file || null,
      layer_names: handoffAsset?.blender?.layer_names || []
    },
    outputs: {
      sandbox_json: relative(root, outputJsonPath),
      sandbox_markdown: relative(root, outputMdPath),
      sandbox_python: relative(root, outputPythonPath),
      decision: relative(root, decisionPath),
      handoff_bundle: handoffBundle.outputs?.markdown || null,
      handoff_smoke: handoffSmoke.outputs?.smoke_markdown || null
    },
    checks,
    next_actions: failureCount
      ? ['Resolve failed sandbox gates before opening the generated script in Blender.']
      : [
          'Open a copied Blender sandbox file, not a production project.',
          'Run the generated Python script from Blender Text Editor or console.',
          'Inspect created KOSMO_SANDBOX collections/materials, then discard or save the copied sandbox manually.'
        ]
  };
}

function renderBlenderSandboxPython(report) {
  return `# Generated by Architecture Cosmos / KosmoAsset
# Blender sandbox script. Use only in a copied .blend sandbox file.
# It creates review collections/material placeholders and never saves or opens project files.

KOSMO_SANDBOX_ONLY = True
ALLOW_SCENE_WRITE = True

SANDBOX_ASSET = ${pythonLiteral(report.blender)}


def _collection(name, parent=None):
    collection = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if parent:
        if collection.name not in [child.name for child in parent.children]:
            parent.children.link(collection)
    elif collection.name not in [child.name for child in bpy.context.scene.collection.children]:
        bpy.context.scene.collection.children.link(collection)
    return collection


def _empty(name, collection):
    obj = bpy.data.objects.get(name) or bpy.data.objects.new(name, None)
    if obj.name not in collection.objects:
        try:
            collection.objects.link(obj)
        except RuntimeError:
            pass
    return obj


def run():
    print("KosmoAsset Blender sandbox")
    print(f"- asset: {SANDBOX_ASSET['collection_name']}")
    if not KOSMO_SANDBOX_ONLY or not ALLOW_SCENE_WRITE:
        print("Sandbox disabled. No scene objects created.")
        return
    try:
        global bpy
        import bpy
    except ModuleNotFoundError:
        print("Run this script inside Blender Python. No changes made in system Python.")
        return

    root = _collection("KOSMO_SANDBOX")
    asset_collection = _collection(SANDBOX_ASSET["collection_name"], root)
    for layer_name in SANDBOX_ASSET.get("layer_names", []):
        layer_collection = _collection(layer_name, asset_collection)
        _empty(f"{layer_name}/review_anchor", layer_collection)

    material_name = SANDBOX_ASSET.get("material_name")
    if material_name and not bpy.data.materials.get(material_name):
        material = bpy.data.materials.new(material_name)
        material.diffuse_color = (0.72, 0.62, 0.48, 1.0)

    print("Created review-only sandbox collections/material placeholders.")
    print("No file was opened, saved, uploaded or published.")


if __name__ == "__main__":
    run()
`;
}

function renderMarkdown(report) {
  const lines = [
    '# KosmoAsset Blender Sandbox',
    '',
    `Asset: ${report.asset_title} (\`${report.asset_id}\`)`,
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    '',
    'This is a local sandbox bridge for Blender. It is not a production import, does not save `.blend` files and does not publish assets.',
    '',
    '## Checks',
    ''
  ];
  report.checks.forEach((item) => lines.push(`- ${item.status}: ${item.label}`));
  lines.push('', '## Outputs', '');
  Object.entries(report.outputs).forEach(([key, value]) => lines.push(`- ${key}: ${value ? `\`${value}\`` : '-'}`));
  lines.push('', '## Blender Layers', '');
  report.blender.layer_names.forEach((layer) => lines.push(`- ${layer}`));
  lines.push('', '## Next Actions', '');
  report.next_actions.forEach((action) => lines.push(`- ${action}`));
  return `${lines.join('\n')}\n`;
}

function check(id, passed, label) {
  return {
    id,
    status: passed ? 'passed' : 'failed',
    label
  };
}

function pythonLiteral(value, depth = 0) {
  const indent = '  '.repeat(depth);
  const nextIndent = '  '.repeat(depth + 1);
  if (value === null) return 'None';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'None';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return `[\n${value.map((item) => `${nextIndent}${pythonLiteral(item, depth + 1)}`).join(',\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return '{}';
    return `{\n${entries.map(([key, item]) => `${nextIndent}${pythonLiteral(key)}: ${pythonLiteral(item, depth + 1)}`).join(',\n')}\n${indent}}`;
  }
  return 'None';
}

function readRequiredJson(pathname, label) {
  if (!existsSync(pathname)) throw new Error(`Missing ${label}: ${pathname}`);
  return readJson(pathname);
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
