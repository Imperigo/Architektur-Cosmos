# Kosmo Innovation Smoke

Generated: 2026-06-14T07:35:46.491Z
Status: `innovation_smoke_passed_review_only`

## Summary

- Checks: 5
- Passed: 3
- Skipped: 2
- Failures: 0
- Public-ready after smoke: 0
- Fixture root: `examples/kosmo-innovation-smoke-2026-06-14`

## Checks

| Lane | Status | Evidence |
| --- | --- | --- |
| `markitdown_prepare_m2` | passed | Converted synthetic fixture to examples/kosmo-innovation-smoke-2026-06-14/markitdown-output.md. |
| `local_ocr_scanned_sources` | skipped_missing_tool | tesseract CLI is not installed. |
| `qwen_embedding_rag` | passed | Wrote public-safe embedding contract examples/kosmo-innovation-smoke-2026-06-14/embedding-contract.generated.json. |
| `ifcopenshell_geometry_lane` | skipped_missing_python_module | ifcopenshell is not importable in the current Python environment. |
| `paper2poster_publish_lane` | passed | Wrote public-safe layout contract examples/kosmo-innovation-smoke-2026-06-14/publish-layout-contract.generated.json. |

## Next Actions

- Install missing tools only in isolated environments when owner confirms the lane.
- Keep private source OCR, conversion and embeddings blocked until source-root gates pass.
- Use the generated layout and embedding contracts as the next implementation targets for KosmoPrepare/KosmoPublish.
