# Kosmo Architecture Ontology Seed

Generated: 2026-07-22T06:38:58.803Z
Status: `architecture_ontology_seed_ready`

## Summary

- Entity types: 8
- Relation types: 10
- Facet groups: 6
- Pilots supported: 3
- Pilot matrix status: post_unlock_pilot_execution_matrix_needs_review
- Pilot matrix guarded review-only: yes
- Asset lanes supported: 3
- Review lanes supported: 5
- Public-ready after seed: 0

## Entity Types

- `reference_project`: project_id, title, status, rights_state, public_ready
- `source_record`: source_id, source_type, provenance_state, privacy_state, public_ready
- `building_element`: element_id, category, system_role, source_basis, public_ready
- `material_system`: material_id, material_family, surface_state, texture_state, rights_state
- `space_pattern`: space_id, typology, circulation_role, section_role, source_basis
- `structure_system`: structure_id, load_path, span_logic, junction_logic, source_basis
- `asset_record`: asset_id, asset_lane, export_target, review_state, public_ready
- `eval_review_item`: eval_id, suite_id, queue_state, review_lane, public_ready

## Relation Types

- `project_has_source`: reference_project -> source_record
- `source_supports_element`: source_record -> building_element
- `element_uses_material`: building_element -> material_system
- `element_defines_space`: building_element -> space_pattern
- `structure_orders_space`: structure_system -> space_pattern
- `asset_derived_from_element`: asset_record -> building_element
- `asset_uses_material`: asset_record -> material_system
- `eval_item_tests_project`: eval_review_item -> reference_project
- `eval_item_tests_asset`: eval_review_item -> asset_record
- `source_blocks_public_release`: source_record -> asset_record

## Facet Groups

- `typology`: housing, sacral, education, office, cultural, infrastructure
- `material`: concrete, timber, masonry, steel, glass, earth_or_stone
- `structure`: wall_bearing, frame, shell, hybrid, suspended, massive
- `space`: served_servant, enfilade, free_plan, split_level, courtyard, processional
- `construction`: prefabricated, cast_in_place, layered_assembly, joinery, monolithic, adaptive_reuse
- `rights_privacy`: private, review_only, public_candidate, public_ready_false, owner_gate_required, rights_unknown

## Hard Stops

- Do not instantiate private project facts from this ontology seed.
- Do not create assets, eval rows, embeddings or training data from this seed.
- Do not mark ontology-derived records public_ready true.
- Keep source provenance and rights/privacy facets mandatory.
