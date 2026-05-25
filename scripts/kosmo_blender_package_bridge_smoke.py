#!/usr/bin/env python3
"""
Blender-side smoke test for the Kosmo Design package bridge.

Run through npm:
    npm run kosmo:blender-package-smoke

This script is executed inside Blender with `--background --python`.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    try:
        marker = sys.argv.index("--")
        raw = sys.argv[marker + 1 :]
    except ValueError:
        raw = []

    parser = argparse.ArgumentParser()
    parser.add_argument("--addon-code", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--expected-rooms", type=int, default=3)
    parser.add_argument("--expect-context", action="store_true")
    parser.add_argument("--output-blend", default="")
    return parser.parse_args(raw)


def main() -> None:
    args = parse_args()

    import bpy  # type: ignore

    addon_code = Path(args.addon_code).expanduser().resolve()
    project_manifest = Path(args.project).expanduser().resolve()
    if addon_code.as_posix() not in sys.path:
        sys.path.insert(0, addon_code.as_posix())

    with project_manifest.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    project_id = manifest["project_id"]

    clear_scene(bpy)

    import kosmo_design  # type: ignore

    try:
        kosmo_design.unregister()
    except Exception:
        pass
    kosmo_design.register()

    result = bpy.ops.kosmo_design.load_project_package(filepath=project_manifest.as_posix())
    if "FINISHED" not in result:
        raise RuntimeError(f"load_project_package returned {result}")

    objects = [
        obj
        for obj in bpy.data.objects
        if obj.get("kosmo_project_id") == project_id
    ]
    source_room_ids = sorted(
        {
            str(obj.get("kosmo_source_room_id"))
            for obj in objects
            if obj.get("kosmo_source_room_id")
        }
    )
    project_collection_name = f"Kosmo_Project_{project_id}"
    project_collection = bpy.data.collections.get(project_collection_name)
    if project_collection is None:
        raise AssertionError(f"Missing project collection: {project_collection_name}")

    expected_rooms = int(args.expected_rooms)
    if len(source_room_ids) != expected_rooms:
        raise AssertionError(
            f"Expected {expected_rooms} room ids, got {len(source_room_ids)}: {source_room_ids}"
        )

    role_counts: dict[str, int] = {}
    for obj in objects:
        role = str(obj.get("kosmo_role") or "unknown")
        role_counts[role] = role_counts.get(role, 0) + 1

    if expected_rooms > 0:
        required_roles = ["walls", "floor", "ceiling", "label"]
        missing_roles = [role for role in required_roles if role_counts.get(role, 0) < expected_rooms]
        if missing_roles:
            raise AssertionError(f"Missing expected object roles: {missing_roles}; counts={role_counts}")

    if str(bpy.context.scene.get("kosmo_project_id") or "") != project_id:
        raise AssertionError("Scene kosmo_project_id was not set")

    context_objects = [
        obj
        for obj in bpy.data.objects
        if obj.get("kosmo_project_id") == project_id
        and obj.get("kosmo_context_origin") == "kosmo_prepare_source"
    ]
    context_role_counts: dict[str, int] = {}
    for obj in context_objects:
        role = str(obj.get("kosmo_role") or "unknown")
        context_role_counts[role] = context_role_counts.get(role, 0) + 1

    if args.expect_context and not context_objects:
        raise AssertionError(f"Expected Kosmo Prepare context objects for {project_id}")

    context_imported = read_scene_json(bpy.context.scene.get("kosmo_context_imported"))
    context_report_path = project_manifest.parent / "design" / "context-import.generated.json"
    context_report = {}
    if context_report_path.exists():
        with context_report_path.open("r", encoding="utf-8") as handle:
            parsed_report = json.load(handle)
        if isinstance(parsed_report, dict):
            context_report = parsed_report
    if args.expect_context and not context_report_path.exists():
        raise AssertionError(f"Missing context import report: {context_report_path}")
    if args.expect_context:
        context_payload = context_report.get("context") if isinstance(context_report, dict) else {}
        if not isinstance(context_payload, dict) or not context_payload.get("classification"):
            raise AssertionError("Context report is missing heuristic classification")
        for source_name in ["dxf", "ifc"]:
            source_payload = context_payload.get(source_name) or {}
            if source_payload.get("available") and not source_payload.get("classification"):
                raise AssertionError(f"Context report is missing {source_name.upper()} classification")

    if expected_rooms == 0:
        if args.output_blend:
            output_blend = Path(args.output_blend).expanduser().resolve()
            output_blend.parent.mkdir(parents=True, exist_ok=True)
            bpy.ops.wm.save_as_mainfile(filepath=output_blend.as_posix())

        report = {
            "status": "passed",
            "project_id": project_id,
            "project_collection": project_collection_name,
            "rooms": source_room_ids,
            "context_object_count": len(context_objects),
            "context_role_counts": context_role_counts,
            "context_imported": context_imported,
            "context_report": context_report,
            "context_report_path": context_report_path.as_posix() if context_report_path.exists() else None,
            "scene_context_collection": str(bpy.context.scene.get("kosmo_context_collection") or ""),
            "output_blend": args.output_blend or None,
        }
        print("KOSMO_BLENDER_PACKAGE_BRIDGE_SMOKE " + json.dumps(report, sort_keys=True))
        return

    export_result = bpy.ops.kosmo_design.export_project_package_profile(
        filepath=project_manifest.as_posix()
    )
    if "FINISHED" not in export_result:
        raise RuntimeError(f"export_project_package_profile returned {export_result}")

    exported_path = project_manifest.parent / "design" / "model-profile.exported.json"
    if not exported_path.exists():
        raise AssertionError(f"Missing exported model profile: {exported_path}")
    with exported_path.open("r", encoding="utf-8") as handle:
        exported_profile = json.load(handle)
    sanitize_exported_profile(exported_profile, project_manifest.parent)
    exported_path.write_text(json.dumps(exported_profile, indent=2) + "\n", encoding="utf-8")
    exported_rooms = exported_profile.get("rooms") or []
    if len(exported_rooms) != expected_rooms:
        raise AssertionError(
            f"Expected {expected_rooms} exported rooms, got {len(exported_rooms)}"
        )
    exported_room_ids = sorted(str(room.get("id")) for room in exported_rooms)
    if exported_room_ids != source_room_ids:
        raise AssertionError(
            f"Exported room ids differ: imported={source_room_ids}, exported={exported_room_ids}"
        )

    drawing_result = bpy.ops.kosmo_design.export_project_package_drawings(
        filepath=project_manifest.as_posix()
    )
    if "FINISHED" not in drawing_result:
        raise RuntimeError(f"export_project_package_drawings returned {drawing_result}")

    plan_path = project_manifest.parent / "draw" / "exports" / "ground-floor-plan.svg"
    section_path = project_manifest.parent / "draw" / "exports" / "section-a.svg"
    for svg_path, marker in [
        (plan_path, 'data-kosmo-export="draw-plan"'),
        (section_path, 'data-kosmo-export="draw-section"'),
    ]:
        if not svg_path.exists():
            raise AssertionError(f"Missing drawing export: {svg_path}")
        content = svg_path.read_text(encoding="utf-8")
        if "<svg" not in content or marker not in content:
            raise AssertionError(f"Drawing export did not contain expected marker: {svg_path}")

    viz_result = bpy.ops.kosmo_design.export_project_package_viz_preview(
        filepath=project_manifest.as_posix()
    )
    if "FINISHED" not in viz_result:
        raise RuntimeError(f"export_project_package_viz_preview returned {viz_result}")

    preview_path = project_manifest.parent / "viz" / "previews" / "kosmo-preview-axon.png"
    preview_manifest_path = project_manifest.parent / "viz" / "previews" / "preview-manifest.json"
    cameras_generated_path = project_manifest.parent / "viz" / "cameras.generated.json"
    if not preview_path.exists():
        raise AssertionError(f"Missing Viz preview export: {preview_path}")
    preview_bytes = preview_path.read_bytes()
    if len(preview_bytes) < 1000 or not preview_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        raise AssertionError(f"Viz preview is not a valid PNG preview: {preview_path}")
    for json_path in [preview_manifest_path, cameras_generated_path]:
        if not json_path.exists():
            raise AssertionError(f"Missing Viz JSON export: {json_path}")
        with json_path.open("r", encoding="utf-8") as handle:
            json.load(handle)

    if args.output_blend:
        output_blend = Path(args.output_blend).expanduser().resolve()
        output_blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=output_blend.as_posix())

    report = {
        "status": "passed",
        "project_id": project_id,
        "project_collection": project_collection_name,
        "rooms": source_room_ids,
        "exported_profile": exported_path.as_posix(),
        "exported_rooms": exported_room_ids,
        "plan_export": plan_path.as_posix(),
        "section_export": section_path.as_posix(),
        "viz_preview": preview_path.as_posix(),
        "viz_preview_bytes": len(preview_bytes),
        "viz_preview_manifest": preview_manifest_path.as_posix(),
        "viz_cameras": cameras_generated_path.as_posix(),
        "object_count": len(objects),
        "role_counts": role_counts,
        "context_object_count": len(context_objects),
        "context_role_counts": context_role_counts,
        "context_imported": context_imported,
        "context_report": context_report,
        "context_report_path": context_report_path.as_posix() if context_report_path.exists() else None,
        "output_blend": args.output_blend or None,
    }
    print("KOSMO_BLENDER_PACKAGE_BRIDGE_SMOKE " + json.dumps(report, sort_keys=True))


def clear_scene(bpy) -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for collection in list(bpy.data.collections):
        if not collection.users:
            bpy.data.collections.remove(collection)


def read_scene_json(value) -> dict:
    if not isinstance(value, str) or not value.strip():
        return {}
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def sanitize_exported_profile(profile: dict, project_root: Path) -> None:
    source = profile.get("source")
    if not isinstance(source, dict):
        return

    try:
        source["project_root"] = project_root.resolve().relative_to(Path.cwd()).as_posix()
    except ValueError:
        source["project_root"] = project_root.name


if __name__ == "__main__":
    main()
