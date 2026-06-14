# Kosmo Local Worker Ollama Smoke

Checked: 2026-06-14T13:53:58.534Z
Status: `passed`
Model: `kosmo-qwen3-coder:30b-a3b-q4km`
Endpoint: `http://127.0.0.1:11434/api/generate`
Duration: 475ms

## Checks

- http_ok: passed
- model_returned: passed
- response_non_empty: passed
- json_response_non_empty: passed
- json_response_valid: passed
- json_status_review_only: passed
- json_public_ready_zero: passed
- json_private_content_false: passed

## Advisory Checks

- mentions_review_only: passed
- mentions_no_public_promotion: passed

## Policy

- No private source content was sent.
- No public promotion was performed.
- Use the Ollama HTTP API with `format=json` for structured local worker automation; avoid raw TTY CLI output for stored packets.

## JSON Capture

- JSON valid: passed
- JSON status review-only: passed
- JSON public-ready zero: passed
- JSON private content false: passed

