#!/usr/bin/env python3
"""Generated Kosmo Blender read-only context import.

Run inside Blender with:
    blender --python design/blender-context-import.generated.py

The script creates locked review/reference objects only. It does not generate
design geometry, does not import editable BIM, and does not export GLB files.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

KOSMO_CONTEXT_IMPORT = json.loads(r'''{
  "project_id": "kosmo-demo-001",
  "project_name": "Kosmo Demo 001",
  "root_collection": "KOSMO_CONTEXT_REVIEW_KOSMO_DEMO_001",
  "design_generation_allowed": false,
  "origin": {
    "shifted_origin": [
      0,
      0,
      0
    ],
    "lv95_origin": null,
    "wgs84_origin": null
  },
  "project_perimeter": {
    "min": [
      -10,
      -10
    ],
    "max": [
      10,
      10
    ]
  },
  "combined_context_bounds": null,
  "ifc_global_bounds": {
    "min": [
      0,
      0,
      0
    ],
    "max": [
      10,
      8,
      3.35
    ]
  },
  "dxf_polylines": [],
  "ifc_bboxes": [
    {
      "step_id": 130,
      "name": "Demo Wall",
      "layer_keys": [
        "structure",
        "facade",
        "tectonic",
        "material:concrete"
      ],
      "bounds": {
        "min": [
          0,
          0,
          0
        ],
        "max": [
          10,
          0.4,
          3
        ]
      }
    },
    {
      "step_id": 230,
      "name": "Demo Slab",
      "layer_keys": [
        "structure",
        "mass",
        "material:concrete"
      ],
      "bounds": {
        "min": [
          0,
          0,
          3
        ],
        "max": [
          10,
          8,
          3.35
        ]
      }
    }
  ],
  "layer_collections": [
    {
      "name": "KOSMO_KOSMO_DEMO_001_MASS",
      "layer_key": "mass",
      "element_count": 1,
      "review_status": "generated_needs_human_layer_review"
    },
    {
      "name": "KOSMO_KOSMO_DEMO_001_STRUCTURE",
      "layer_key": "structure",
      "element_count": 2,
      "review_status": "generated_needs_human_layer_review"
    },
    {
      "name": "KOSMO_KOSMO_DEMO_001_FACADE",
      "layer_key": "facade",
      "element_count": 1,
      "review_status": "generated_needs_human_layer_review"
    },
    {
      "name": "KOSMO_KOSMO_DEMO_001_TECTONIC",
      "layer_key": "tectonic",
      "element_count": 1,
      "review_status": "generated_needs_human_layer_review"
    },
    {
      "name": "KOSMO_KOSMO_DEMO_001_MATERIAL_CONCRETE",
      "layer_key": "material:concrete",
      "element_count": 2,
      "review_status": "generated_needs_human_layer_review"
    }
  ]
}''')


def parse_blender_args():
    try:
        marker = sys.argv.index("--")
        raw = sys.argv[marker + 1 :]
    except ValueError:
        raw = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-blend", default="")
    parser.add_argument("--summary-json", default="")
    return parser.parse_args(raw)


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

    generated_objects = [
        obj
        for obj in bpy.data.objects
        if obj.get("kosmo_generated_by") == "kosmo-blender-context-import"
        and obj.get("kosmo_project_id") == KOSMO_CONTEXT_IMPORT["project_id"]
    ]
    generated_collections = [
        collection
        for collection in bpy.data.collections
        if collection.get("kosmo_generated_by") == "kosmo-blender-context-import"
        and collection.get("kosmo_project_id") == KOSMO_CONTEXT_IMPORT["project_id"]
    ]

    return {
        "root_collection": root.name,
        "object_count": len(generated_objects),
        "review_only_object_count": sum(1 for obj in generated_objects if obj.get("kosmo_review_only")),
        "locked_object_count": sum(
            1
            for obj in generated_objects
            if obj.hide_select and all(obj.lock_location) and all(obj.lock_rotation) and all(obj.lock_scale)
        ),
        "collection_count": len(generated_collections),
        "dxf_polylines": len(KOSMO_CONTEXT_IMPORT.get("dxf_polylines") or []),
        "ifc_bboxes": len(KOSMO_CONTEXT_IMPORT.get("ifc_bboxes") or []),
        "layer_collections": len(KOSMO_CONTEXT_IMPORT.get("layer_collections") or []),
    }


if __name__ == "__main__":
    import bpy

    args = parse_blender_args()
    result = create_kosmo_readonly_context(bpy)
    if args.output_blend:
        output_blend = Path(args.output_blend).expanduser().resolve()
        output_blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=output_blend.as_posix())
        result["output_blend"] = output_blend.as_posix()
    if args.summary_json:
        summary_json = Path(args.summary_json).expanduser().resolve()
        summary_json.parent.mkdir(parents=True, exist_ok=True)
        summary_json.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        result["summary_json"] = summary_json.as_posix()
    print("KOSMO_BLENDER_CONTEXT_IMPORT", json.dumps(result, sort_keys=True))
