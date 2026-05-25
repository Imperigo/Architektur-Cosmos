#!/usr/bin/env python3
"""IfcOpenShell semantic review for Kosmo project IFC context files."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

import ifcopenshell
import ifcopenshell.util.element as ifc_element
import ifcopenshell.util.unit as ifc_unit


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ifc", required=True)
    parser.add_argument("--project-id", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--display-ifc-path", default="")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ifc_path = Path(args.ifc).expanduser().resolve()
    output_path = Path(args.output_json).expanduser().resolve()
    if not ifc_path.exists():
        raise FileNotFoundError(f"IFC file not found: {ifc_path}")

    model = ifcopenshell.open(ifc_path.as_posix())
    report = build_report(model, ifc_path, args.project_id, args.display_ifc_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("KOSMO_IFCOPENSHELL_SEMANTIC_REVIEW", json.dumps({
        "status": report["status"],
        "project_id": report["project_id"],
        "schema": report["ifc_schema"],
        "proxy_count": report["summary"]["ifcbuildingelementproxy_count"],
        "unit_scale": report["summary"]["unit_scale"],
        "storey_count": report["summary"]["storey_count"],
    }, sort_keys=True))


def build_report(model: Any, ifc_path: Path, project_id: str, display_ifc_path: str = "") -> dict[str, Any]:
    proxies = model.by_type("IfcBuildingElementProxy")
    elements = model.by_type("IfcElement")
    storeys = model.by_type("IfcBuildingStorey")
    units = unit_summary(model)
    proxy_rows = [proxy_row(proxy) for proxy in proxies]
    semantic_class_counts = Counter(row["kosmo_object_type"] or "unclassified" for row in proxy_rows)
    storey_counts = Counter(row["container_label"] or "uncontained" for row in proxy_rows)
    representation_counts = Counter(row["representation_signature"] or "none" for row in proxy_rows)
    pset_counts = Counter(pset for row in proxy_rows for pset in row["property_set_names"])

    checks = [
        check("ifc_file_opened", True, "IfcOpenShell opened the IFC file."),
        check("schema_ifc4", model.schema.upper().startswith("IFC4"), f"Schema is {model.schema}."),
        check("meter_unit_scale", units["unit_scale"] == 1, f"Unit scale is {units['unit_scale']}."),
        check("single_project", len(model.by_type("IfcProject")) == 1, f"Projects: {len(model.by_type('IfcProject'))}."),
        check("single_site", len(model.by_type("IfcSite")) == 1, f"Sites: {len(model.by_type('IfcSite'))}."),
        check("single_building", len(model.by_type("IfcBuilding")) == 1, f"Buildings: {len(model.by_type('IfcBuilding'))}."),
        check("storey_present", len(storeys) > 0, f"Storeys: {len(storeys)}."),
        check("proxy_elements_present", len(proxies) > 0, f"IfcBuildingElementProxy: {len(proxies)}."),
        check("all_proxies_have_global_id", all(row["global_id"] for row in proxy_rows), "All proxy elements have GlobalId."),
        check("all_proxies_have_placement", all(row["has_object_placement"] for row in proxy_rows), "All proxy elements have ObjectPlacement."),
        check("all_proxies_have_body_brep", all(row["representation_signature"] == "Body/Brep" for row in proxy_rows), "All proxy elements use Body/Brep representation."),
        check("all_proxies_contained", all(row["container_label"] for row in proxy_rows), "All proxy elements are contained in a spatial structure."),
        check("all_proxies_have_psets", all(row["property_set_count"] > 0 for row in proxy_rows), "All proxy elements have property sets."),
    ]

    return {
        "schema_version": "0.1",
        "generator": "kosmo-ifcopenshell-semantic-review",
        "status": "ifcopenshell_semantic_review_ready",
        "project_id": project_id,
        "rights_status": "internal_only",
        "ifc_schema": model.schema,
        "source_file": {
            "path": display_ifc_path or ifc_path.as_posix(),
            "name": ifc_path.name,
            "size_bytes": ifc_path.stat().st_size,
        },
        "policy": {
            "review_does_not_approve_design_generation": True,
            "review_does_not_create_or_modify_geometry": True,
            "human_decision_required_before_design_seed": True,
        },
        "summary": {
            "ifcopenshell_available": True,
            "ifcopenshell_version": getattr(ifcopenshell, "__version__", "unknown"),
            "unit_scale": units["unit_scale"],
            "project_count": len(model.by_type("IfcProject")),
            "site_count": len(model.by_type("IfcSite")),
            "building_count": len(model.by_type("IfcBuilding")),
            "storey_count": len(storeys),
            "ifcelement_count": len(elements),
            "ifcbuildingelementproxy_count": len(proxies),
            "proxies_with_global_id": sum(1 for row in proxy_rows if row["global_id"]),
            "proxies_with_object_placement": sum(1 for row in proxy_rows if row["has_object_placement"]),
            "proxies_with_body_brep": sum(1 for row in proxy_rows if row["representation_signature"] == "Body/Brep"),
            "proxies_contained_in_spatial_structure": sum(1 for row in proxy_rows if row["container_label"]),
            "proxies_with_property_sets": sum(1 for row in proxy_rows if row["property_set_count"] > 0),
            "map_conversion_count": len(model.by_type("IfcMapConversion")),
            "projected_crs_count": len(model.by_type("IfcProjectedCRS")),
            "machine_checks_passed": sum(1 for item in checks if item["status"] == "passed"),
            "machine_check_count": len(checks),
            "design_seed_approved": False,
            "recommended_decision": "keep_needs_more_source_review",
        },
        "units": units,
        "spatial_structure": spatial_structure(model),
        "distributions": {
            "kosmo_object_type": top_counts(semantic_class_counts, 20),
            "storey_container": top_counts(storey_counts, 12),
            "representation": top_counts(representation_counts, 12),
            "property_sets": top_counts(pset_counts, 20),
        },
        "machine_checks": checks,
        "element_sample": proxy_rows[:24],
        "next_actions": [
            "Open the same IFC visually in Bonsai/IfcOpenShell UI and compare semantic tree with this report.",
            "Decide whether IfcBuildingElementProxy plus OBJEKTART is sufficient as context semantics or requires reclassification.",
            "Keep context-selection approved_for_design_generation=false until a human reviewer approves a design seed.",
        ],
    }


def unit_summary(model: Any) -> dict[str, Any]:
    units = []
    for assignment in model.by_type("IfcUnitAssignment"):
        for unit in assignment.Units:
            units.append({
                "type": unit.is_a(),
                "unit_type": getattr(unit, "UnitType", None),
                "name": getattr(unit, "Name", None),
                "prefix": getattr(unit, "Prefix", None),
            })
    return {"unit_scale": ifc_unit.calculate_unit_scale(model), "units": units}


def spatial_structure(model: Any) -> list[dict[str, Any]]:
    rows = []
    for type_name in ["IfcProject", "IfcSite", "IfcBuilding", "IfcBuildingStorey"]:
        for entity in model.by_type(type_name):
            rows.append({
                "step_id": entity.id(),
                "type": entity.is_a(),
                "global_id": getattr(entity, "GlobalId", None),
                "name": getattr(entity, "Name", None),
            })
    return rows


def proxy_row(proxy: Any) -> dict[str, Any]:
    psets = ifc_element.get_psets(proxy)
    property_set_names = sorted(psets.keys())
    object_type = None
    for pset in psets.values():
        if isinstance(pset, dict) and pset.get("OBJEKTART"):
            object_type = str(pset.get("OBJEKTART"))
            break
    container = None
    contained = getattr(proxy, "ContainedInStructure", None) or []
    if contained:
        structure = contained[0].RelatingStructure
        container = f"{structure.is_a()} #{structure.id()} {getattr(structure, 'Name', '') or ''}".strip()
    representations = []
    if proxy.Representation:
        for rep in proxy.Representation.Representations:
            representations.append({
                "identifier": rep.RepresentationIdentifier,
                "type": rep.RepresentationType,
                "item_count": len(rep.Items),
            })
    signature = "/".join([
        representations[0]["identifier"],
        representations[0]["type"],
    ]) if representations else None

    return {
        "step_id": proxy.id(),
        "global_id": proxy.GlobalId,
        "name": proxy.Name,
        "class": proxy.is_a(),
        "predefined_type": getattr(proxy, "PredefinedType", None),
        "kosmo_object_type": object_type,
        "has_object_placement": proxy.ObjectPlacement is not None,
        "object_placement_class": proxy.ObjectPlacement.is_a() if proxy.ObjectPlacement else None,
        "has_representation": proxy.Representation is not None,
        "representation_signature": signature,
        "representations": representations,
        "container_label": container,
        "property_set_count": len(property_set_names),
        "property_set_names": property_set_names,
        "properties_sample": property_sample(psets),
    }


def property_sample(psets: dict[str, Any]) -> dict[str, Any]:
    result = {}
    for name, values in psets.items():
        if not isinstance(values, dict):
            continue
        result[name] = {key: value for key, value in values.items() if key != "id"}
    return result


def check(id_: str, passed: bool, detail: str) -> dict[str, str]:
    return {"id": id_, "status": "passed" if passed else "failed", "detail": detail}


def top_counts(counter: Counter[str], limit: int) -> list[dict[str, Any]]:
    return [{"value": key, "count": count} for key, count in counter.most_common(limit)]


if __name__ == "__main__":
    main()
