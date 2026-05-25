#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const layerPlanPath = join(projectRoot, args.layerPlan || args['layer-plan'] || 'design/ifc-layer-plan.generated.json');
const blenderProfilePath = join(projectRoot, args.blender || 'design/blender-layer-profile.generated.json');
const archicadProfilePath = join(projectRoot, args.archicad || 'design/archicad-layer-profile.generated.json');
const contextHandoffPath = join(projectRoot, args.handoff || 'design/context-handoff.generated.json');
const outputJsonPath = join(projectRoot, args.output || 'design/model-layer-handoff.generated.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/model-layer-handoff.generated.md');
const blenderScriptPath = join(projectRoot, args.script || 'design/blender-collection-handoff.generated.py');
const archicadSchedulePath = join(projectRoot, args.csv || 'design/archicad-layer-schedule.generated.csv');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const layerPlan = existsSync(layerPlanPath) ? readJson(layerPlanPath) : null;
  const blenderProfile = existsSync(blenderProfilePath) ? readJson(blenderProfilePath) : null;
  const archicadProfile = existsSync(archicadProfilePath) ? readJson(archicadProfilePath) : null;
  const contextHandoff = existsSync(contextHandoffPath) ? readJson(contextHandoffPath) : null;
  const handoff = buildHandoff({ layerPlan, blenderProfile, archicadProfile, contextHandoff });

  await Promise.all([outputJsonPath, outputMdPath, blenderScriptPath, archicadSchedulePath].map((path) => mkdir(dirname(path), { recursive: true })));
  await writeFile(outputJsonPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(handoff), 'utf8');
  await writeFile(blenderScriptPath, renderBlenderScript(handoff), 'utf8');
  await writeFile(archicadSchedulePath, renderArchicadCsv(handoff), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo model layer handoff generated');
  console.log(`Project: ${handoff.project_id}`);
  console.log(`Status: ${handoff.status}`);
  console.log(`Layer exports: ${handoff.summary.layer_export_count}`);
  console.log(`GLB exports allowed: ${handoff.summary.glb_export_allowed ? 'yes' : 'no'}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  console.log(`Blender script: ${relative(root, blenderScriptPath)}`);
  console.log(`ArchiCAD schedule: ${relative(root, archicadSchedulePath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildHandoff({ layerPlan, blenderProfile, archicadProfile, contextHandoff }) {
  const layerGroups = Array.isArray(layerPlan?.layer_groups) ? layerPlan.layer_groups : [];
  const blenderCollections = new Map((blenderProfile?.collections || []).map((collection) => [collection.layer_key, collection]));
  const archicadLayers = new Map((archicadProfile?.layers || []).map((layer) => [layer.layer_key, layer]));
  const contextAllowsDesign = Boolean(contextHandoff?.summary?.design_generation_allowed);
  const approvedForImport = Boolean(blenderProfile?.approved_for_import && archicadProfile?.approved_for_import);
  const glbExportAllowed = Boolean(contextAllowsDesign && approvedForImport);
  const layerExports = layerGroups.map((group) => layerExport(group, {
    blenderCollection: blenderCollections.get(group.layer_key),
    archicadLayer: archicadLayers.get(group.layer_key),
    glbExportAllowed
  }));

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-model-layer-handoff',
    project_id: layerPlan?.project_id || blenderProfile?.project_id || archicadProfile?.project_id || readProjectId(),
    status: layerExports.length ? 'model_layer_handoff_ready_for_human_review' : 'model_layer_handoff_pending_layer_plan',
    rights_status: 'internal_only',
    source_files: {
      ifc_layer_plan: sourceFileStatus(layerPlanPath),
      blender_layer_profile: sourceFileStatus(blenderProfilePath),
      archicad_layer_profile: sourceFileStatus(archicadProfilePath),
      context_handoff: sourceFileStatus(contextHandoffPath)
    },
    output_files: {
      markdown: relative(projectRoot, outputMdPath),
      blender_collection_script: relative(projectRoot, blenderScriptPath),
      archicad_layer_schedule: relative(projectRoot, archicadSchedulePath)
    },
    policy: {
      handoff_does_not_generate_glb: true,
      handoff_does_not_create_blender_collections_by_default: true,
      blender_script_is_dry_run_until_human_review: true,
      archicad_schedule_is_reference_only: true,
      human_approval_required_before_export: true
    },
    summary: {
      layer_plan_ready: isLayerPlanReady(layerPlan),
      context_design_generation_allowed: contextAllowsDesign,
      blender_profile_approved_for_import: Boolean(blenderProfile?.approved_for_import),
      archicad_profile_approved_for_import: Boolean(archicadProfile?.approved_for_import),
      layer_export_count: layerExports.length,
      planned_glb_count: layerExports.filter((item) => item.planned_glb_path).length,
      blender_collection_count: layerExports.filter((item) => item.blender_collection).length,
      archicad_layer_count: layerExports.filter((item) => item.archicad_layer).length,
      material_layer_count: layerExports.filter((item) => item.layer_key.startsWith('material:')).length,
      glb_export_allowed: glbExportAllowed,
      recommended_next_step: glbExportAllowed
        ? 'run_reviewed_glb_layer_export'
        : 'review_layer_mapping_before_any_glb_or_blender_collection_creation'
    },
    layer_exports: layerExports,
    next_actions: nextActions({ layerExports, contextAllowsDesign, approvedForImport })
  };
}

function layerExport(group, { blenderCollection, archicadLayer, glbExportAllowed }) {
  const permission = glbExportAllowed ? 'ready_for_reviewed_export' : 'review_shell_only';
  return {
    layer_key: group.layer_key,
    layer_type: group.layer_type,
    title: group.title,
    element_count: group.element_count,
    step_ids: group.step_ids || [],
    global_ids: group.global_ids || [],
    blender_collection: blenderCollection?.name || group.blender_collection || null,
    archicad_layer: archicadLayer?.name || group.archicad_layer || null,
    planned_glb_path: group.planned_glb_path || null,
    permission,
    dry_run_blender_action: blenderCollection?.name ? 'can_create_empty_review_collection_with_explicit_flag' : 'missing_collection_name',
    archicad_action: archicadLayer?.name ? 'schedule_layer_for_manual_exchange_setup' : 'missing_archicad_layer_name',
    review_status: group.review_status || 'generated_needs_human_layer_review',
    export_blockers: permission === 'review_shell_only'
      ? ['human_layer_review_required', 'context_or_import_approval_missing']
      : []
  };
}

function renderMarkdown(handoff) {
  const lines = [
    '# Model Layer Handoff',
    '',
    `Project ID: \`${handoff.project_id}\``,
    `Generated: ${handoff.generated_at}`,
    `Status: \`${handoff.status}\``,
    '',
    'Review-only handoff for Blender collections, ArchiCAD layers and future GLB layer exports.',
    '',
    '## Summary',
    '',
    `- layer plan ready: ${handoff.summary.layer_plan_ready ? 'yes' : 'no'}`,
    `- context design generation allowed: ${handoff.summary.context_design_generation_allowed ? 'yes' : 'no'}`,
    `- Blender profile approved for import: ${handoff.summary.blender_profile_approved_for_import ? 'yes' : 'no'}`,
    `- ArchiCAD profile approved for import: ${handoff.summary.archicad_profile_approved_for_import ? 'yes' : 'no'}`,
    `- layer exports: ${handoff.summary.layer_export_count}`,
    `- planned GLBs: ${handoff.summary.planned_glb_count}`,
    `- material layers: ${handoff.summary.material_layer_count}`,
    `- GLB export allowed: ${handoff.summary.glb_export_allowed ? 'yes' : 'no'}`,
    '',
    '## Layer Exports',
    '',
    '| Layer | Elements | Blender collection | ArchiCAD layer | Planned GLB | Permission |',
    '| --- | ---: | --- | --- | --- | --- |'
  ];

  for (const layer of handoff.layer_exports) {
    lines.push(`| ${escapePipe(layer.title)} | ${layer.element_count} | \`${escapePipe(layer.blender_collection || '-')}\` | \`${escapePipe(layer.archicad_layer || '-')}\` | \`${escapePipe(layer.planned_glb_path || '-')}\` | ${escapePipe(layer.permission)} |`);
  }
  if (!handoff.layer_exports.length) lines.push('| none | 0 | - | - | - | - |');

  lines.push('', '## Next Actions', '');
  for (const action of handoff.next_actions) lines.push(`- ${action}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderBlenderScript(handoff) {
  const payload = JSON.stringify({
    project_id: handoff.project_id,
    approved_for_import: handoff.summary.glb_export_allowed,
    collections: handoff.layer_exports.map((layer) => ({
      name: layer.blender_collection,
      layer_key: layer.layer_key,
      element_step_ids: layer.step_ids,
      planned_glb_path: layer.planned_glb_path,
      permission: layer.permission
    }))
  }, null, 2);

  return `#!/usr/bin/env python3
"""Generated Kosmo Blender collection handoff.

Review-only by default. Run inside Blender and call:
    create_kosmo_review_collections(bpy, allow_unapproved_review_shell=True)
to create empty review collections. GLB export remains blocked unless the
source handoff says approved_for_import=true.
"""

from __future__ import annotations

import json

KOSMO_LAYER_HANDOFF = json.loads(r'''${payload}''')


def create_kosmo_review_collections(bpy, allow_unapproved_review_shell=False):
    if not KOSMO_LAYER_HANDOFF.get("approved_for_import") and not allow_unapproved_review_shell:
        raise RuntimeError("Kosmo layer handoff is not approved. Pass allow_unapproved_review_shell=True for empty review collections only.")

    project_id = KOSMO_LAYER_HANDOFF["project_id"]
    root_name = f"KOSMO_LAYER_REVIEW_{project_id}"
    root_collection = bpy.data.collections.get(root_name) or bpy.data.collections.new(root_name)
    if not any(child.name == root_collection.name for child in bpy.context.scene.collection.children):
        try:
            bpy.context.scene.collection.children.link(root_collection)
        except RuntimeError:
            pass

    created = []
    for layer in KOSMO_LAYER_HANDOFF.get("collections", []):
        name = layer.get("name")
        if not name:
            continue
        collection = bpy.data.collections.get(name) or bpy.data.collections.new(name)
        if not any(child.name == collection.name for child in root_collection.children):
            try:
                root_collection.children.link(collection)
            except RuntimeError:
                pass
        collection["kosmo_project_id"] = project_id
        collection["kosmo_layer_key"] = layer.get("layer_key", "")
        collection["kosmo_permission"] = layer.get("permission", "")
        collection["kosmo_planned_glb_path"] = layer.get("planned_glb_path", "")
        collection["kosmo_review_only"] = not KOSMO_LAYER_HANDOFF.get("approved_for_import")
        created.append(collection.name)
    return created
`;
}

function renderArchicadCsv(handoff) {
  const rows = [
    ['layer_key', 'archicad_layer', 'element_count', 'planned_glb_path', 'permission', 'review_status']
  ];
  for (const layer of handoff.layer_exports) {
    rows.push([
      layer.layer_key,
      layer.archicad_layer || '',
      String(layer.element_count),
      layer.planned_glb_path || '',
      layer.permission,
      layer.review_status
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
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
    outputItem('design/model-layer-handoff.generated.json', 'other', 'design', 'Kosmo Design', 'json', 'Review-only model layer handoff for future GLB, Blender and ArchiCAD export.'),
    outputItem('design/model-layer-handoff.generated.md', 'other', 'design', 'Kosmo Design', 'markdown', 'Human-readable model layer handoff.'),
    outputItem('design/blender-collection-handoff.generated.py', 'other', 'design', 'Kosmo Design', 'python', 'Dry-run Blender collection handoff script.'),
    outputItem('design/archicad-layer-schedule.generated.csv', 'other', 'design', 'Kosmo Design', 'csv', 'ArchiCAD layer schedule for manual exchange setup.')
  ];
}

function outputItem(path, type, module, exportModule, format, description) {
  return {
    path,
    manifest: {
      path,
      type,
      module,
      rights_status: 'generated_needs_review',
      description
    },
    exportManifest: {
      path,
      module: exportModule,
      format,
      status: 'generated_needs_review',
      rights_status: 'generated_needs_review'
    }
  };
}

function isLayerPlanReady(plan) {
  return Boolean(
    plan
      && plan.status === 'ifc_layer_plan_ready_for_human_review'
      && plan.summary?.ifc_element_count > 0
      && plan.summary?.layer_group_count > 0
  );
}

function nextActions({ layerExports, contextAllowsDesign, approvedForImport }) {
  if (!layerExports.length) return ['Run npm run kosmo:ifc-layer-plan before model layer handoff.'];
  if (!contextAllowsDesign) {
    return [
      'Use the Blender script only for empty review collections, not model generation.',
      'Resolve context-selection and context-handoff gates before model export.',
      'Keep GLB generation blocked until design generation is explicitly allowed.'
    ];
  }
  if (!approvedForImport) {
    return [
      'Human-review the Blender and ArchiCAD layer profiles.',
      'Set profile approval only after layer names, materials and element assignments are checked.'
    ];
  }
  return ['Run the reviewed GLB layer export job and attach outputs to the planned GLB paths.'];
}

function sourceFileStatus(pathname) {
  return {
    path: relative(projectRoot, pathname),
    exists: existsSync(pathname),
    name: basename(pathname),
    size_bytes: existsSync(pathname) ? readFileSync(pathname).length : 0
  };
}

function readProjectId() {
  const manifestPath = join(projectRoot, 'kosmo.project.json');
  if (!existsSync(manifestPath)) return basename(projectRoot);
  return readJson(manifestPath).project_id || basename(projectRoot);
}

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapePipe(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
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
