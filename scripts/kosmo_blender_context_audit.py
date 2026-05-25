#!/usr/bin/env python3
"""
Blender-side audit for a saved Kosmo read-only context blend file.

Run through npm:
    npm run kosmo:blender-context-audit -- --project <project_path>

This script is executed inside Blender with `--background --python`.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    try:
        marker = sys.argv.index("--")
        raw = sys.argv[marker + 1 :]
    except ValueError:
        raw = []

    parser = argparse.ArgumentParser()
    parser.add_argument("--blend", required=True)
    parser.add_argument("--plan", required=True)
    parser.add_argument("--summary-json", required=True)
    return parser.parse_args(raw)


def main() -> None:
    args = parse_args()

    import bpy  # type: ignore

    blend_path = Path(args.blend).expanduser().resolve()
    plan_path = Path(args.plan).expanduser().resolve()
    summary_path = Path(args.summary_json).expanduser().resolve()

    if not blend_path.exists():
        raise FileNotFoundError(f"Blend file not found: {blend_path}")
    if not plan_path.exists():
        raise FileNotFoundError(f"Context import plan not found: {plan_path}")

    with plan_path.open("r", encoding="utf-8") as handle:
        plan = json.load(handle)

    bpy.ops.wm.open_mainfile(filepath=blend_path.as_posix())
    result = audit_blend(bpy, plan, blend_path, plan_path)

    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("KOSMO_BLENDER_CONTEXT_AUDIT", json.dumps(result, sort_keys=True))

    if result["status"] != "passed":
        raise AssertionError(f"Kosmo Blender context audit failed: {result['failures']}")


def audit_blend(bpy: Any, plan: dict[str, Any], blend_path: Path, plan_path: Path) -> dict[str, Any]:
    failures: list[str] = []
    warnings: list[str] = []

    project_id = str(plan.get("project_id") or "")
    root_name = str((plan.get("blender") or {}).get("root_collection") or "")
    expected_summary = plan.get("summary") or {}
    expected_objects = plan.get("context_objects") or []
    expected_object_names = [str(item.get("name")) for item in expected_objects if item.get("name")]
    expected_collections = plan.get("blender", {}).get("collections") or []
    expected_collection_names = [str(item.get("name")) for item in expected_collections if item.get("name")]
    expected_layer_collections = [
        item for item in expected_collections if item.get("layer_key") and item.get("name")
    ]

    root = bpy.data.collections.get(root_name)
    if root is None:
        failures.append(f"Missing root collection: {root_name}")
        root_objects = []
    else:
        root_objects = objects_in_collection_tree(root)

    generated_objects = [
        obj
        for obj in root_objects
        if obj.get("kosmo_generated_by") == "kosmo-blender-context-import"
        and str(obj.get("kosmo_project_id") or "") == project_id
    ]
    generated_names = sorted(obj.name for obj in generated_objects)
    generated_by_name = {obj.name: obj for obj in generated_objects}

    missing_objects = [name for name in expected_object_names if name not in generated_by_name]
    if missing_objects:
        failures.append(f"Missing expected context objects: {', '.join(missing_objects)}")

    unexpected_objects = [
        name for name in generated_names if expected_object_names and name not in expected_object_names
    ]
    if unexpected_objects:
        warnings.append(f"Unexpected generated context objects: {', '.join(unexpected_objects)}")

    expected_object_count = int(expected_summary.get("blender_object_count") or len(expected_object_names))
    if expected_object_count and len(generated_objects) != expected_object_count:
        failures.append(f"Expected {expected_object_count} generated objects, found {len(generated_objects)}")

    unlocked = [obj.name for obj in generated_objects if not is_locked(obj)]
    if unlocked:
        failures.append(f"Generated objects are not fully locked: {', '.join(unlocked)}")

    selectable = [obj.name for obj in generated_objects if not bool(obj.hide_select)]
    if selectable:
        failures.append(f"Generated objects are still selectable: {', '.join(selectable)}")

    not_review_only = [obj.name for obj in generated_objects if not bool(obj.get("kosmo_review_only"))]
    if not_review_only:
        failures.append(f"Generated objects are not tagged review-only: {', '.join(not_review_only)}")

    design_allowed = [
        obj.name for obj in generated_objects if bool(obj.get("kosmo_design_generation_allowed"))
    ]
    if design_allowed or bool(expected_summary.get("design_generation_allowed")):
        failures.append("Design generation is enabled in a context-only Blender import.")

    source_room_objects = [obj.name for obj in generated_objects if obj.get("kosmo_source_room_id")]
    if source_room_objects:
        failures.append(f"Context import produced source-room objects: {', '.join(source_room_objects)}")

    missing_collections = [
        name for name in expected_collection_names if bpy.data.collections.get(name) is None
    ]
    if missing_collections:
        failures.append(f"Missing expected collections: {', '.join(missing_collections)}")

    layer_collection_mismatches = []
    for expected in expected_layer_collections:
        collection = bpy.data.collections.get(str(expected.get("name")))
        if collection is None:
            continue
        expected_count = int(expected.get("element_count") or 0)
        actual_count = int(collection.get("kosmo_element_count") or 0)
        if actual_count != expected_count:
            layer_collection_mismatches.append(
                f"{collection.name}: expected {expected_count}, found {actual_count}"
            )
        if not bool(collection.get("kosmo_review_only")):
            layer_collection_mismatches.append(f"{collection.name}: not tagged review-only")
    if layer_collection_mismatches:
        failures.append(f"Layer collection mismatch: {'; '.join(layer_collection_mismatches)}")

    dxf_obj = generated_by_name.get("KOSMO_DXF_ACCEPTED_CONTEXT")
    expected_dxf = int(expected_summary.get("dxf_embedded_polyline_count") or 0)
    actual_dxf = int(dxf_obj.get("kosmo_polyline_count") or 0) if dxf_obj else 0
    if expected_dxf and actual_dxf != expected_dxf:
        failures.append(f"Expected {expected_dxf} DXF polylines, found {actual_dxf}")
    if dxf_obj and dxf_obj.type != "CURVE":
        failures.append(f"KOSMO_DXF_ACCEPTED_CONTEXT should be CURVE, found {dxf_obj.type}")

    ifc_obj = generated_by_name.get("KOSMO_IFC_BBOX_CONTEXT")
    expected_ifc = int(expected_summary.get("ifc_bbox_count") or 0)
    actual_ifc = int(ifc_obj.get("kosmo_bbox_count") or 0) if ifc_obj else 0
    if expected_ifc and actual_ifc != expected_ifc:
        failures.append(f"Expected {expected_ifc} IFC bbox proxies, found {actual_ifc}")

    mesh_polygon_count = sum(len(obj.data.polygons) for obj in generated_objects if obj.type == "MESH")
    if mesh_polygon_count:
        failures.append(f"Context import contains mesh faces: {mesh_polygon_count}")

    object_type_counts: dict[str, int] = {}
    for obj in generated_objects:
        object_type_counts[obj.type] = object_type_counts.get(obj.type, 0) + 1

    result = {
        "schema_version": "0.1",
        "generator": "kosmo-blender-context-audit",
        "status": "passed" if not failures else "failed",
        "project_id": project_id,
        "blend_path": blend_path.as_posix(),
        "plan_path": plan_path.as_posix(),
        "root_collection": root_name,
        "summary": {
            "object_count": len(generated_objects),
            "expected_object_count": expected_object_count,
            "locked_object_count": sum(1 for obj in generated_objects if is_locked(obj)),
            "review_only_object_count": sum(1 for obj in generated_objects if bool(obj.get("kosmo_review_only"))),
            "selectable_object_count": sum(1 for obj in generated_objects if not bool(obj.hide_select)),
            "mesh_polygon_count": mesh_polygon_count,
            "dxf_polyline_count": actual_dxf,
            "expected_dxf_polyline_count": expected_dxf,
            "ifc_bbox_count": actual_ifc,
            "expected_ifc_bbox_count": expected_ifc,
            "layer_collection_count": len(expected_layer_collections),
            "object_type_counts": object_type_counts,
            "design_generation_allowed": bool(expected_summary.get("design_generation_allowed")),
        },
        "objects": generated_names,
        "failures": failures,
        "warnings": warnings,
    }
    return result


def collection_tree(collection: Any) -> list[Any]:
    result = [collection]
    for child in collection.children:
        result.extend(collection_tree(child))
    return result


def objects_in_collection_tree(collection: Any) -> list[Any]:
    objects = []
    seen = set()
    for item in collection_tree(collection):
        for obj in item.objects:
            if obj.name in seen:
                continue
            seen.add(obj.name)
            objects.append(obj)
    return objects


def is_locked(obj: Any) -> bool:
    return (
        bool(obj.hide_select)
        and all(bool(value) for value in obj.lock_location)
        and all(bool(value) for value in obj.lock_rotation)
        and all(bool(value) for value in obj.lock_scale)
    )


if __name__ == "__main__":
    main()
