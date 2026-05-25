# Context Source Mapping

Project ID: `kosmo-demo-001`
Generated: 2026-05-25T19:39:52.372Z
Status: `source_mapping_review_required`

Human source mapping gate. It does not update `context-selection.json` automatically.

## Summary

- rows: 1
- pending review: 1
- accepted as context: 0
- accepted as design seed: 0
- needs more source review: 0
- rejected: 0
- design seed possible after review: 1

## Mapping Rows

| Mapping | Source | Proposed role | Decision | Suggested | Linked candidate |
| --- | --- | --- | --- | --- | --- |
| ifc-type-ifcbuildingelementproxy | IFCBUILDINGELEMENTPROXY | semantic_building_element | pending_review | needs_more_source_review | ifc-role-3-semantic_building_elements |

## Review Commands

### ifc-type-ifcbuildingelementproxy

Suggested: `needs_more_source_review`

```bash
npm run kosmo:context-source-mapping -- --project "examples/kosmo-projects/kosmo-demo-001" --decision ifc-type-ifcbuildingelementproxy=needs_more_source_review --reviewed-by "Local Reviewer"
```

Warnings:
- Potential design/context seed only after semantic IFC import and human review.
- Semantic IFC candidate: requires Bonsai/IfcOpenShell-style import and human review before design-seed use.

Facts:
```json
{
  "entity_count": 2,
  "source_review_facts": null
}
```

