#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(root, args.project || 'examples/kosmo-projects/kosmo-demo-001');
const outputJsonPath = join(projectRoot, args.output || 'design/blender-context-import.generated.json');
const outputMdPath = join(projectRoot, args.markdown || 'design/blender-context-import.generated.md');
const blenderScriptPath = join(projectRoot, args.script || 'design/blender-context-import.generated.py');
const maxDxfPolylines = Number(args['max-dxf-polylines'] || 4000);

const paths = {
  manifest: join(projectRoot, 'kosmo.project.json'),
  sources: join(projectRoot, 'data/sources.json'),
  contextImport: join(projectRoot, 'design/context-import.generated.json'),
  contextHandoff: join(projectRoot, 'design/context-handoff.generated.json'),
  sourceMapping: join(projectRoot, 'design/context-source-mapping.json'),
  ifcGeometryPreview: join(projectRoot, 'design/ifc-geometry-preview.generated.json'),
  ifcDxfAlignmentPreview: join(projectRoot, 'design/ifc-dxf-alignment-preview.generated.json'),
  ifcLayerPlan: join(projectRoot, 'design/ifc-layer-plan.generated.json'),
  blenderLayerProfile: join(projectRoot, 'design/blender-layer-profile.generated.json')
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const sourceRegistry = existsSync(paths.sources) ? readJson(paths.sources) : null;
  const sourceMapping = existsSync(paths.sourceMapping) ? readJson(paths.sourceMapping) : null;
  const sourcePaths = resolveSourcePaths(sourceRegistry);
  const acceptedLayers = acceptedDxfLayers(sourceMapping);
  const dxf = analyzeDxf(sourcePaths.dxf, acceptedLayers);
  const importPlan = buildImportPlan({ sourceRegistry, sourcePaths, acceptedLayers, dxf });

  await Promise.all([outputJsonPath, outputMdPath, blenderScriptPath].map((path) => mkdir(dirname(path), { recursive: true })));
  await writeFile(outputJsonPath, `${JSON.stringify(stripHeavyForJson(importPlan), null, 2)}\n`, 'utf8');
  await writeFile(outputMdPath, renderMarkdown(importPlan), 'utf8');
  await writeFile(blenderScriptPath, renderBlenderScript(importPlan), 'utf8');
  const registered = await ensurePackageReferences(projectRoot);

  console.log('Kosmo Blender context import generated');
  console.log(`Project: ${importPlan.project_id}`);
  console.log(`Status: ${importPlan.status}`);
  console.log(`Root collection: ${importPlan.blender.root_collection}`);
  console.log(`DXF polylines embedded: ${importPlan.summary.dxf_embedded_polyline_count}`);
  console.log(`IFC bbox count: ${importPlan.summary.ifc_bbox_count}`);
  console.log(`Wrote: ${relative(root, outputMdPath)}`);
  console.log(`Blender script: ${relative(root, blenderScriptPath)}`);
  if (registered.length) console.log(`Registered: ${registered.map((item) => relative(root, item)).join(', ')}`);
}

function buildImportPlan({ sourceRegistry, sourcePaths, acceptedLayers, dxf }) {
  const manifest = existsSync(paths.manifest) ? readJson(paths.manifest) : null;
  const contextImport = existsSync(paths.contextImport) ? readJson(paths.contextImport) : null;
  const contextHandoff = existsSync(paths.contextHandoff) ? readJson(paths.contextHandoff) : null;
  const ifcGeometryPreview = existsSync(paths.ifcGeometryPreview) ? readJson(paths.ifcGeometryPreview) : null;
  const ifcDxfAlignmentPreview = existsSync(paths.ifcDxfAlignmentPreview) ? readJson(paths.ifcDxfAlignmentPreview) : null;
  const ifcLayerPlan = existsSync(paths.ifcLayerPlan) ? readJson(paths.ifcLayerPlan) : null;
  const blenderLayerProfile = existsSync(paths.blenderLayerProfile) ? readJson(paths.blenderLayerProfile) : null;
  const projectId = manifest?.project_id || contextHandoff?.project_id || basename(projectRoot);
  const rootCollection = `KOSMO_CONTEXT_REVIEW_${slugify(projectId).replace(/-/g, '_')}`.toUpperCase();
  const layerCollections = (blenderLayerProfile?.collections || []).map((collection) => ({
    name: collection.name,
    layer_key: collection.layer_key,
    element_count: Array.isArray(collection.element_step_ids) ? collection.element_step_ids.length : 0,
    review_status: collection.review_status || 'generated_needs_human_layer_review'
  }));
  const ifcElements = Array.isArray(ifcLayerPlan?.elements) ? ifcLayerPlan.elements : [];
  const ifcBboxes = ifcElements
    .filter((element) => element.geometry_bbox)
    .map((element) => ({
      step_id: element.step_id,
      name: element.name,
      layer_keys: element.layer_keys || [],
      bounds: element.geometry_bbox
    }));
  const contextObjects = contextObjectPlan({ contextImport, ifcGeometryPreview, ifcDxfAlignmentPreview, dxf, ifcBboxes });
  const contextHandoffReady = isContextHandoffReady(contextHandoff);
  const status = contextHandoffReady && contextObjects.length
    ? 'blender_context_import_ready_for_review'
    : 'blender_context_import_pending_context_handoff';
  const designGenerationAllowed = Boolean(contextHandoff?.summary?.design_generation_allowed);

  return {
    schema_version: '0.1',
    generated_at: new Date().toISOString(),
    generator: 'kosmo-blender-context-import',
    project_id: projectId,
    project_name: manifest?.name || contextHandoff?.project_name || null,
    status,
    rights_status: 'internal_only',
    source_stage: 'phase_0_blender_context_import',
    note: 'Generated Blender review-context script. It creates locked context/reference objects only and does not generate design geometry.',
    source_files: {
      context_import: sourceFileStatus(paths.contextImport),
      context_handoff: sourceFileStatus(paths.contextHandoff),
      source_mapping: sourceFileStatus(paths.sourceMapping),
      ifc_geometry_preview: sourceFileStatus(paths.ifcGeometryPreview),
      ifc_dxf_alignment_preview: sourceFileStatus(paths.ifcDxfAlignmentPreview),
      ifc_layer_plan: sourceFileStatus(paths.ifcLayerPlan),
      blender_layer_profile: sourceFileStatus(paths.blenderLayerProfile),
      dxf: sourceFileStatus(sourcePaths.dxf)
    },
    output_files: {
      markdown: relative(projectRoot, outputMdPath),
      blender_script: relative(projectRoot, blenderScriptPath)
    },
    policy: {
      creates_review_context_only: true,
      objects_are_locked_and_hide_select: true,
      design_generation_allowed: designGenerationAllowed,
      generated_script_does_not_import_ifc_or_dxf_as_editable_bim: true,
      human_approval_required_before_design_generation: true
    },
    summary: {
      context_handoff_ready: contextHandoffReady,
      context_input_count: numberOrDefault(contextHandoff?.summary?.context_input_count, 0),
      blocked_input_count: numberOrDefault(contextHandoff?.summary?.blocked_input_count, 0),
      approved_for_design_generation: Boolean(contextHandoff?.summary?.approved_for_design_generation),
      design_generation_allowed: designGenerationAllowed,
      accepted_dxf_layer_count: acceptedLayers.length,
      dxf_accepted_polyline_count: dxf.accepted_polyline_count,
      dxf_embedded_polyline_count: dxf.polylines.length,
      dxf_embedding_truncated: dxf.accepted_polyline_count > dxf.polylines.length,
      ifc_bbox_count: ifcBboxes.length,
      ifc_layer_collection_count: layerCollections.length,
      blender_object_count: contextObjects.length,
      root_collection: rootCollection,
      recommended_next_step: status === 'blender_context_import_ready_for_review'
        ? 'run_blender_script_for_locked_context_review'
        : 'run_context_handoff_before_blender_context_import'
    },
    blender: {
      root_collection: rootCollection,
      collections: [
        { name: `${rootCollection}_ORIGIN`, role: 'origin_and_project_frames' },
        { name: `${rootCollection}_DXF`, role: 'accepted_dxf_underlay_reference' },
        { name: `${rootCollection}_IFC`, role: 'ifc_bounds_and_bbox_reference' },
        { name: `${rootCollection}_LAYERS`, role: 'layer_review_collections' },
        ...layerCollections
      ],
      script_entrypoint: 'create_kosmo_readonly_context(bpy)'
    },
    context_geometry: {
      origin: originPayload(sourceRegistry),
      project_perimeter: projectPerimeter(contextImport),
      combined_context_bounds: ifcDxfAlignmentPreview?.bounds?.combined || null,
      ifc_global_bounds: ifcGeometryPreview?.global_bounds || null,
      dxf_polylines: dxf.polylines,
      ifc_bboxes: ifcBboxes,
      layer_collections: layerCollections
    },
    context_objects: contextObjects,
    guardrails: [
      'Blender objects created by this script are locked, hide-select and tagged kosmo_review_only.',
      'DXF polylines are reference underlay only and must not become editable design geometry automatically.',
      'IFC boxes are bounding-box review proxies only, not semantic BIM objects.',
      'Layer collections are empty review containers until a human approves import.',
      'No GLB export or design generation is enabled by this script.'
    ],
    next_actions: nextActions({ status, designGenerationAllowed, dxf, ifcBboxes, layerCollections })
  };
}

function contextObjectPlan({ contextImport, ifcGeometryPreview, ifcDxfAlignmentPreview, dxf, ifcBboxes }) {
  const objects = [];
  objects.push({ name: 'KOSMO_CONTEXT_ORIGIN', kind: 'empty_origin_marker', permission: 'context_reference_only' });
  if (projectPerimeter(contextImport)) objects.push({ name: 'KOSMO_PROJECT_PERIMETER', kind: 'wire_rectangle', permission: 'context_reference_only' });
  if (ifcDxfAlignmentPreview?.bounds?.combined) objects.push({ name: 'KOSMO_COMBINED_CONTEXT_BOUNDS', kind: 'wire_rectangle', permission: 'context_reference_only' });
  if (dxf.polylines.length) objects.push({ name: 'KOSMO_DXF_ACCEPTED_CONTEXT', kind: 'curve_polyline_underlay', permission: 'context_reference_only' });
  if (ifcGeometryPreview?.global_bounds) objects.push({ name: 'KOSMO_IFC_GLOBAL_BOUNDS', kind: 'wire_box', permission: 'context_reference_only' });
  if (ifcBboxes.length) objects.push({ name: 'KOSMO_IFC_BBOX_CONTEXT', kind: 'bbox_wire_mesh', permission: 'context_reference_only' });
  return objects;
}

function analyzeDxf(pathname, acceptedLayers) {
  const accepted = new Set(acceptedLayers);
  if (!existsSync(pathname) || !accepted.size) return emptyDxfAnalysis();

  const lines = readFileSync(pathname, 'utf8').split(/\r?\n/);
  const polylines = [];
  let current = null;
  let activePolyline = null;
  let totalPolylineCount = 0;
  let acceptedPolylineCount = 0;

  const flushCurrent = () => {
    if (!current?.type) return;
    if (current.type === 'POLYLINE') {
      activePolyline = { layer: current.layer || '0', points: [] };
      totalPolylineCount += 1;
      return;
    }
    if (current.type === 'VERTEX') {
      if (activePolyline && current.points.length) activePolyline.points.push(...current.points);
      return;
    }
    if (current.type === 'SEQEND') {
      flushActivePolyline();
      return;
    }
    if (current.type === 'LWPOLYLINE') {
      totalPolylineCount += 1;
      pushAcceptedPolyline(current.layer || '0', current.points);
    }
  };

  const flushActivePolyline = () => {
    if (!activePolyline) return;
    pushAcceptedPolyline(activePolyline.layer, activePolyline.points);
    activePolyline = null;
  };

  const pushAcceptedPolyline = (layer, points) => {
    if (!accepted.has(layer) || points.length < 2) return;
    acceptedPolylineCount += 1;
    if (polylines.length >= maxDxfPolylines) return;
    const cleaned = points.filter((point) => point.every(Number.isFinite));
    if (cleaned.length < 2) return;
    polylines.push({ layer, points: cleaned.map((point) => point.map(round)) });
  };

  for (let index = 0; index < lines.length - 1; index += 2) {
    const code = lines[index].trim();
    const value = lines[index + 1].trim();
    if (code === '0') {
      flushCurrent();
      current = { type: value, layer: activePolyline?.layer || null, points: [], pending_x: null };
      continue;
    }
    if (!current) continue;
    if (code === '8') current.layer = value;
    else if (code === '10') current.pending_x = Number(value);
    else if (code === '20' && current.pending_x !== null) {
      current.points.push([current.pending_x, Number(value)]);
      current.pending_x = null;
    }
  }
  flushCurrent();
  flushActivePolyline();

  return {
    accepted_polyline_count: acceptedPolylineCount,
    total_polyline_count: totalPolylineCount,
    polylines
  };
}

function renderMarkdown(plan) {
  const lines = [
    '# Blender Context Import',
    '',
    `Project ID: \`${plan.project_id}\``,
    `Generated: ${plan.generated_at}`,
    `Status: \`${plan.status}\``,
    '',
    'Read-only Blender context import script. It creates locked review objects and no design geometry.',
    '',
    '## Summary',
    '',
    `- root collection: \`${plan.blender.root_collection}\``,
    `- context inputs: ${plan.summary.context_input_count}`,
    `- blocked inputs: ${plan.summary.blocked_input_count}`,
    `- design generation allowed: ${plan.summary.design_generation_allowed ? 'yes' : 'no'}`,
    `- accepted DXF layers: ${plan.summary.accepted_dxf_layer_count}`,
    `- DXF accepted polylines: ${plan.summary.dxf_accepted_polyline_count}`,
    `- DXF embedded polylines: ${plan.summary.dxf_embedded_polyline_count}${plan.summary.dxf_embedding_truncated ? ' (truncated for Blender script)' : ''}`,
    `- IFC bbox proxies: ${plan.summary.ifc_bbox_count}`,
    `- layer collections: ${plan.summary.ifc_layer_collection_count}`,
    `- Blender script: \`${plan.output_files.blender_script}\``,
    '',
    '## Blender Objects',
    '',
    '| Object | Kind | Permission |',
    '| --- | --- | --- |'
  ];
  for (const object of plan.context_objects) {
    lines.push(`| \`${escapePipe(object.name)}\` | ${escapePipe(object.kind)} | ${escapePipe(object.permission)} |`);
  }
  if (!plan.context_objects.length) lines.push('| none | - | - |');

  lines.push('', '## Guardrails', '');
  for (const rule of plan.guardrails) lines.push(`- ${rule}`);
  lines.push('', '## Next Actions', '');
  for (const action of plan.next_actions) lines.push(`- ${action}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderBlenderScript(plan) {
  const payload = JSON.stringify({
    project_id: plan.project_id,
    project_name: plan.project_name,
    root_collection: plan.blender.root_collection,
    design_generation_allowed: plan.summary.design_generation_allowed,
    origin: plan.context_geometry.origin,
    project_perimeter: plan.context_geometry.project_perimeter,
    combined_context_bounds: plan.context_geometry.combined_context_bounds,
    ifc_global_bounds: plan.context_geometry.ifc_global_bounds,
    dxf_polylines: plan.context_geometry.dxf_polylines,
    ifc_bboxes: plan.context_geometry.ifc_bboxes,
    layer_collections: plan.context_geometry.layer_collections
  }, null, 2);

  return `#!/usr/bin/env python3
"""Generated Kosmo Blender read-only context import.

Run inside Blender with:
    blender --python design/blender-context-import.generated.py

The script creates locked review/reference objects only. It does not generate
design geometry, does not import editable BIM, and does not export GLB files.
"""

from __future__ import annotations

import json

KOSMO_CONTEXT_IMPORT = json.loads(r'''${payload}''')


def ensure_collection(bpy, name, parent=None):
    collection = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    container = parent or bpy.context.scene.collection
    if collection.name not in [child.name for child in container.children]:
        try:
            container.children.link(collection)
        except RuntimeError:
            pass
    return collection


def ensure_material(bpy, name, color):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = color
    return material


def replace_object(bpy, name):
    existing = bpy.data.objects.get(name)
    if existing and existing.get("kosmo_generated_by") == "kosmo-blender-context-import":
        bpy.data.objects.remove(existing, do_unlink=True)


def tag_review_object(obj, kind):
    obj["kosmo_generated_by"] = "kosmo-blender-context-import"
    obj["kosmo_project_id"] = KOSMO_CONTEXT_IMPORT["project_id"]
    obj["kosmo_review_only"] = True
    obj["kosmo_context_kind"] = kind
    obj["kosmo_design_generation_allowed"] = bool(KOSMO_CONTEXT_IMPORT.get("design_generation_allowed"))
    obj.hide_select = True
    obj.lock_location = (True, True, True)
    obj.lock_rotation = (True, True, True)
    obj.lock_scale = (True, True, True)
    return obj


def link_object(collection, obj):
    if not any(existing.name == obj.name for existing in collection.objects):
        collection.objects.link(obj)


def make_empty(bpy, collection, name, location=(0, 0, 0), display_size=10):
    replace_object(bpy, name)
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = display_size
    obj.location = location
    link_object(collection, obj)
    return tag_review_object(obj, "origin_marker")


def make_wire_rect(bpy, collection, name, bounds, z=0, material=None):
    if not bounds:
        return None
    replace_object(bpy, name)
    min_x, min_y = bounds["min"][0], bounds["min"][1]
    max_x, max_y = bounds["max"][0], bounds["max"][1]
    vertices = [(min_x, min_y, z), (max_x, min_y, z), (max_x, max_y, z), (min_x, max_y, z)]
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, [(0, 1), (1, 2), (2, 3), (3, 0)], [])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    if material:
        obj.data.materials.append(material)
    link_object(collection, obj)
    obj.display_type = "WIRE"
    return tag_review_object(obj, "wire_rectangle")


def make_bbox_mesh(bpy, collection, name, boxes, material=None):
    boxes = [box for box in boxes or [] if box.get("bounds")]
    if not boxes:
        return None
    replace_object(bpy, name)
    vertices = []
    edges = []
    for box in boxes:
        bounds = box["bounds"]
        min_x, min_y, min_z = bounds["min"]
        max_x, max_y, max_z = bounds["max"]
        start = len(vertices)
        vertices.extend([
            (min_x, min_y, min_z), (max_x, min_y, min_z), (max_x, max_y, min_z), (min_x, max_y, min_z),
            (min_x, min_y, max_z), (max_x, min_y, max_z), (max_x, max_y, max_z), (min_x, max_y, max_z),
        ])
        edges.extend([
            (start + 0, start + 1), (start + 1, start + 2), (start + 2, start + 3), (start + 3, start + 0),
            (start + 4, start + 5), (start + 5, start + 6), (start + 6, start + 7), (start + 7, start + 4),
            (start + 0, start + 4), (start + 1, start + 5), (start + 2, start + 6), (start + 3, start + 7),
        ])
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, edges, [])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    if material:
        obj.data.materials.append(material)
    link_object(collection, obj)
    obj.display_type = "WIRE"
    obj["kosmo_bbox_count"] = len(boxes)
    return tag_review_object(obj, "ifc_bbox_wire_context")


def make_dxf_curve(bpy, collection, name, polylines, material=None):
    if not polylines:
        return None
    replace_object(bpy, name)
    curve = bpy.data.curves.new(f"{name}_CURVE", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = 0.05
    curve.bevel_resolution = 0
    for polyline in polylines:
        points = polyline.get("points") or []
        if len(points) < 2:
            continue
        spline = curve.splines.new("POLY")
        spline.points.add(len(points) - 1)
        for point, co in zip(spline.points, points):
            point.co = (co[0], co[1], 0, 1)
    obj = bpy.data.objects.new(name, curve)
    if material:
        obj.data.materials.append(material)
    link_object(collection, obj)
    obj["kosmo_polyline_count"] = len(polylines)
    return tag_review_object(obj, "dxf_underlay_curve")


def create_kosmo_readonly_context(bpy):
    root = ensure_collection(bpy, KOSMO_CONTEXT_IMPORT["root_collection"])
    origin_col = ensure_collection(bpy, f'{KOSMO_CONTEXT_IMPORT["root_collection"]}_ORIGIN', root)
    dxf_col = ensure_collection(bpy, f'{KOSMO_CONTEXT_IMPORT["root_collection"]}_DXF', root)
    ifc_col = ensure_collection(bpy, f'{KOSMO_CONTEXT_IMPORT["root_collection"]}_IFC', root)
    layers_col = ensure_collection(bpy, f'{KOSMO_CONTEXT_IMPORT["root_collection"]}_LAYERS', root)

    root["kosmo_generated_by"] = "kosmo-blender-context-import"
    root["kosmo_project_id"] = KOSMO_CONTEXT_IMPORT["project_id"]
    root["kosmo_review_only"] = True

    mat_origin = ensure_material(bpy, "KOSMO_CONTEXT_ORIGIN_CYAN", (0.1, 0.85, 1.0, 1.0))
    mat_dxf = ensure_material(bpy, "KOSMO_CONTEXT_DXF_CYAN", (0.0, 0.72, 1.0, 1.0))
    mat_ifc = ensure_material(bpy, "KOSMO_CONTEXT_IFC_MAGENTA", (1.0, 0.26, 0.84, 1.0))
    mat_frame = ensure_material(bpy, "KOSMO_CONTEXT_FRAME_WHITE", (0.86, 0.92, 1.0, 1.0))

    make_empty(bpy, origin_col, "KOSMO_CONTEXT_ORIGIN", (0, 0, 0), 18)
    perimeter = KOSMO_CONTEXT_IMPORT.get("project_perimeter")
    if perimeter:
        make_wire_rect(bpy, origin_col, "KOSMO_PROJECT_PERIMETER", perimeter, 0, mat_origin)
    make_wire_rect(bpy, origin_col, "KOSMO_COMBINED_CONTEXT_BOUNDS", KOSMO_CONTEXT_IMPORT.get("combined_context_bounds"), 0, mat_frame)
    make_dxf_curve(bpy, dxf_col, "KOSMO_DXF_ACCEPTED_CONTEXT", KOSMO_CONTEXT_IMPORT.get("dxf_polylines") or [], mat_dxf)

    global_bounds = KOSMO_CONTEXT_IMPORT.get("ifc_global_bounds")
    if global_bounds:
        make_bbox_mesh(bpy, ifc_col, "KOSMO_IFC_GLOBAL_BOUNDS", [{"bounds": global_bounds}], mat_frame)
    make_bbox_mesh(bpy, ifc_col, "KOSMO_IFC_BBOX_CONTEXT", KOSMO_CONTEXT_IMPORT.get("ifc_bboxes") or [], mat_ifc)

    for layer in KOSMO_CONTEXT_IMPORT.get("layer_collections") or []:
        collection = ensure_collection(bpy, layer["name"], layers_col)
        collection["kosmo_generated_by"] = "kosmo-blender-context-import"
        collection["kosmo_project_id"] = KOSMO_CONTEXT_IMPORT["project_id"]
        collection["kosmo_layer_key"] = layer.get("layer_key", "")
        collection["kosmo_element_count"] = int(layer.get("element_count") or 0)
        collection["kosmo_review_only"] = True

    return {
        "root_collection": root.name,
        "dxf_polylines": len(KOSMO_CONTEXT_IMPORT.get("dxf_polylines") or []),
        "ifc_bboxes": len(KOSMO_CONTEXT_IMPORT.get("ifc_bboxes") or []),
        "layer_collections": len(KOSMO_CONTEXT_IMPORT.get("layer_collections") or []),
    }


if __name__ == "__main__":
    import bpy

    result = create_kosmo_readonly_context(bpy)
    print("Kosmo read-only context created:", result)
`;
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
    outputItem('design/blender-context-import.generated.json', 'other', 'design', 'Kosmo Design', 'json', 'Read-only Blender context import plan.'),
    outputItem('design/blender-context-import.generated.md', 'other', 'design', 'Kosmo Design', 'markdown', 'Human-readable read-only Blender context import plan.'),
    outputItem('design/blender-context-import.generated.py', 'other', 'design', 'Kosmo Design', 'python', 'Generated Blender Python script for locked context review objects.')
  ];
}

function outputItem(path, type, module, exportModule, format, description) {
  return {
    path,
    manifest: { path, type, module, rights_status: 'generated_needs_review', description },
    exportManifest: { path, module: exportModule, format, status: 'generated_needs_review', rights_status: 'generated_needs_review' }
  };
}

function stripHeavyForJson(plan) {
  return {
    ...plan,
    context_geometry: {
      ...plan.context_geometry,
      dxf_polylines: {
        embedded_count: plan.context_geometry.dxf_polylines.length,
        note: 'Full polyline payload is embedded in design/blender-context-import.generated.py.'
      }
    }
  };
}

function resolveSourcePaths(sourceRegistry) {
  const sources = sourceRegistry?.sources || [];
  const byType = (type, fallback) => {
    const source = sources.find((item) => item.type === type && item.path);
    return join(projectRoot, source?.path || fallback);
  };
  return {
    dxf: byType('dxf', 'data/source-files/Plangrundlage.dxf')
  };
}

function acceptedDxfLayers(sourceMapping) {
  const rows = Array.isArray(sourceMapping?.rows) ? sourceMapping.rows : [];
  return [...new Set(rows
    .filter((row) => row.source_kind === 'dxf_layer' && row.decision === 'accepted_as_context' && row.source_name)
    .map((row) => row.source_name))];
}

function originPayload(sourceRegistry) {
  const source = (sourceRegistry?.sources || []).find((item) => item.type === 'origin_metadata' && item.path);
  if (!source) return { shifted_origin: [0, 0, 0], lv95_origin: null, wgs84_origin: null };
  const pathname = join(projectRoot, source.path);
  if (!existsSync(pathname)) return { shifted_origin: [0, 0, 0], lv95_origin: null, wgs84_origin: null };
  const origin = readJson(pathname);
  return {
    shifted_origin: [0, 0, 0],
    lv95_origin: origin.lv95_origin || null,
    wgs84_origin: origin.wgs84_origin || null,
    convention: origin.convention || null
  };
}

function projectPerimeter(contextImport) {
  const perimeter = contextImport?.context?.origin?.perimeter_m;
  if (!Array.isArray(perimeter) || perimeter.length < 2) return null;
  const width = Number(perimeter[0]);
  const depth = Number(perimeter[1]);
  if (!Number.isFinite(width) || !Number.isFinite(depth)) return null;
  return {
    min: [round(-width / 2), round(-depth / 2)],
    max: [round(width / 2), round(depth / 2)]
  };
}

function isContextHandoffReady(handoff) {
  return Boolean(
    handoff
      && ['context_reference_handoff_ready', 'design_seed_handoff_ready'].includes(handoff.status)
      && handoff.summary?.context_input_count > 0
  );
}

function nextActions({ status, designGenerationAllowed, dxf, ifcBboxes, layerCollections }) {
  if (status !== 'blender_context_import_ready_for_review') return ['Run npm run kosmo:context-handoff before generating the Blender context import.'];
  const actions = [
    'Run the generated Blender script to create locked review context objects.',
    'Use the context as visual underlay/reference only.',
    'Keep design generation blocked until context-selection explicitly approves a design seed.'
  ];
  if (dxf.accepted_polyline_count > dxf.polylines.length) actions.push('Increase --max-dxf-polylines if a denser DXF underlay is needed in Blender.');
  if (!ifcBboxes.length) actions.push('Run npm run kosmo:ifc-layer-plan before expecting IFC bbox context in Blender.');
  if (!layerCollections.length) actions.push('Run npm run kosmo:ifc-layer-plan before expecting layer review collections.');
  if (designGenerationAllowed) actions.push('Even with design generation allowed, keep this context import as the non-editable source reference.');
  return actions;
}

function emptyDxfAnalysis() {
  return { total_polyline_count: 0, accepted_polyline_count: 0, polylines: [] };
}

function sourceFileStatus(pathname) {
  return {
    path: relative(projectRoot, pathname),
    name: basename(pathname),
    exists: existsSync(pathname),
    size_bytes: existsSync(pathname) ? statSync(pathname).size : 0
  };
}

function ensureItem(items, pathname, item) {
  if (items.some((existing) => existing?.path === pathname)) return false;
  items.push(item);
  return true;
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'));
}

function numberOrDefault(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'kosmo';
}

function escapePipe(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function round(value) {
  return Math.round(value * 1000) / 1000;
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
