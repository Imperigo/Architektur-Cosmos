# Kosmo Local Worker Ollama Smoke

Checked: 2026-07-02T06:19:37.582Z
Status: `skipped_unavailable`
Model: `kosmo-qwen3-coder:30b-a3b-q4km`
Endpoint: `http://127.0.0.1:11434/api/generate`
Duration: 33ms

## Checks

- endpoint_reachable: failed
- model_returned: failed
- response_non_empty: failed
- json_response_valid: failed

## Advisory Checks

- local_worker_available: needs_review

## Policy

- No private source content was sent.
- No public promotion was performed.
- Use the Ollama HTTP API with `format=json` for structured local worker automation; avoid raw TTY CLI output for stored packets.

## JSON Capture

- JSON valid: failed
- JSON status review-only: failed
- JSON public-ready zero: failed
- JSON private content false: failed

