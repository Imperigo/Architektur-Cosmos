#!/usr/bin/env python3
"""Generated Kosmo Blender collection handoff.

Review-only by default. Run inside Blender and call:
    create_kosmo_review_collections(bpy, allow_unapproved_review_shell=True)
to create empty review collections. GLB export remains blocked unless the
source handoff says approved_for_import=true.
"""

from __future__ import annotations

import json

KOSMO_LAYER_HANDOFF = json.loads(r'''{
  "project_id": "kosmo-demo-001",
  "approved_for_import": false,
  "collections": [
    {
      "name": "KOSMO_KOSMO_DEMO_001_MASS",
      "layer_key": "mass",
      "element_step_ids": [
        230
      ],
      "planned_glb_path": "models/kosmo-demo-001/mass.glb",
      "permission": "review_shell_only"
    },
    {
      "name": "KOSMO_KOSMO_DEMO_001_STRUCTURE",
      "layer_key": "structure",
      "element_step_ids": [
        130,
        230
      ],
      "planned_glb_path": "models/kosmo-demo-001/structure.glb",
      "permission": "review_shell_only"
    },
    {
      "name": "KOSMO_KOSMO_DEMO_001_FACADE",
      "layer_key": "facade",
      "element_step_ids": [
        130
      ],
      "planned_glb_path": "models/kosmo-demo-001/facade.glb",
      "permission": "review_shell_only"
    },
    {
      "name": "KOSMO_KOSMO_DEMO_001_TECTONIC",
      "layer_key": "tectonic",
      "element_step_ids": [
        130
      ],
      "planned_glb_path": "models/kosmo-demo-001/tectonic.glb",
      "permission": "review_shell_only"
    },
    {
      "name": "KOSMO_KOSMO_DEMO_001_MATERIAL_CONCRETE",
      "layer_key": "material:concrete",
      "element_step_ids": [
        130,
        230
      ],
      "planned_glb_path": "models/kosmo-demo-001/materials/concrete.glb",
      "permission": "review_shell_only"
    }
  ]
}''')


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
