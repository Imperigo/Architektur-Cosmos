# Kosmo Innovation Dependency Install Queue

Generated: 2026-06-15T13:20:51.388Z
Status: `innovation_dependency_install_queue_ready`

## Summary

- Queue items: 2
- Python package items: 0
- Model download items: 2
- Blocked until Source Root unlock: 1
- Executable now: 0
- Public-ready after queue: 0

## Recommended Order

| Priority | Item | Type | Risk | Gate |
| ---: | --- | --- | --- | --- |
| 6 | `qwen_embedding_reranker` | model_download | high | explicit install batch |
| 7 | `deepseek_ocr` | model_download | high | source-root unlock |

## Install Batch Rules

- Run installs/downloads only in a separate explicit dependency batch.
- Install packages in an isolated environment and record versions immediately after install.
- Keep model downloads under a declared model root on the 4TB SSD.
- Do not run OCR, embeddings or training on private sources before Source Root unlock.
- After every install/download, rerun dependency preflight runner and guard.
