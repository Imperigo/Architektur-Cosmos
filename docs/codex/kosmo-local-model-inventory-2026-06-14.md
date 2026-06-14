# Kosmo Local Model Inventory

Generated: 2026-06-14T08:27:42.148Z
Status: `local_model_inventory_ready_review_only`

## Summary

- Ollama available: yes
- Ollama models: 8
- Ready roles: 4/4
- GGUF files: 1
- Runtime files: 15
- Visible Ollama size: 70 GB
- Public-ready after inventory: 0

## Role Contracts

| Role | Required model | Model | Preset | Ready |
| --- | --- | --- | --- | --- |
| `coding_worker` | `kosmo-qwen3-coder:30b-a3b-q4km` | yes | yes | yes |
| `vision_reference_worker` | `qwen3-vl:32b` | yes | yes | yes |
| `ocr_worker` | `glm-ocr:latest` | yes | yes | yes |
| `embedding_worker` | `all-minilm:l6-v2` | yes | yes | yes |

## Ollama Models

| Model | Size | Modified |
| --- | ---: | --- |
| `qwen3-vl:32b` | 20 GB | 20 hours ago |
| `glm-ocr:latest` | 2.2 GB | 40 hours ago |
| `qwen3-vl:8b` | 6.1 GB | 3 days ago |
| `qwen2.5vl:7b` | 6.0 GB | 3 days ago |
| `qwen2.5:7b` | 4.7 GB | 3 days ago |
| `all-minilm:l6-v2` | 45 MB | 4 days ago |
| `kosmo-qwen3-coder:30b-a3b-q4km` | 18 GB | 4 days ago |
| `gpt-oss:20b` | 13 GB | 5 days ago |

## Next Actions

- Use this inventory as the local-model readiness gate before launching local worker tasks.
- Keep all local model work behind worker-boundary and source-root guards.
- Run kosmo:local-worker-ollama-smoke separately only when a real inference smoke is needed.

## Safety

This inventory does not start models, send prompts, read private content or permit public promotion.
