# Kosmo Innovation Tool Dry Smoke

Generated: 2026-06-15T12:41:28.211Z
Status: `innovation_tool_dry_smoke_passed`

## Summary

- Tool lanes: 8/8
- Payloads read: 18
- Executable now: 0
- Failures: 0
- Public-ready after smoke: 0

## Tool Lanes

| Lane | Status | Payloads |
| --- | --- | ---: |
| `docling_markitdown_document_shape` | passed | 4 |
| `qwen_retrieval_shape` | passed | 2 |
| `ifcopenshell_entity_shape` | passed | 2 |
| `deepseek_ocr_shape` | passed | 2 |
| `qwen_vl_visual_shape` | passed | 2 |
| `topologicpy_graph_shape` | passed | 2 |
| `paper2poster_layout_shape` | passed | 2 |
| `speckle_connector_boundary_shape` | passed | 2 |

## Next Actions

- Create isolated dependency preflight scripts for Docling, MarkItDown, Qwen and IfcOpenShell.
- Keep those preflights install-free until dependency policy is explicitly accepted.
- After dependency preflight, add optional local-only smoke commands that consume generated fixtures only.
