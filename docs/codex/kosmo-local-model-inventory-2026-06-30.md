# Kosmo Local Model Inventory

Generated: 2026-06-30T06:42:01.091Z
Status: `local_model_inventory_ready_review_only`

## Summary

- Ollama available: yes
- Ollama models: 9
- Ready roles: 4/4
- GGUF files: 1
- Runtime files: 15
- Visible Ollama size: 75.1 GB
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
| `MichelRosselli/apertus:8b-instruct-2509-q4_k_m` | 5.1 GB | 12 days ago |
| `qwen3-vl:32b` | 20 GB | 2 weeks ago |
| `glm-ocr:latest` | 2.2 GB | 2 weeks ago |
| `qwen3-vl:8b` | 6.1 GB | 2 weeks ago |
| `qwen2.5vl:7b` | 6.0 GB | 2 weeks ago |
| `qwen2.5:7b` | 4.7 GB | 2 weeks ago |
| `all-minilm:l6-v2` | 45 MB | 2 weeks ago |
| `kosmo-qwen3-coder:30b-a3b-q4km` | 18 GB | 2 weeks ago |
| `gpt-oss:20b` | 13 GB | 3 weeks ago |

## Next Actions

- Use this inventory as the local-model readiness gate before launching local worker tasks.
- Keep all local model work behind worker-boundary and source-root guards.
- Run kosmo:local-worker-ollama-smoke separately only when a real inference smoke is needed.

## Safety

This inventory does not start models, send prompts, read private content or permit public promotion.
