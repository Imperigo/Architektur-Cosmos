# Kosmo Local Worker Ollama Smoke

Checked: 2026-06-13T18:06:09.836Z
Status: `passed`
Model: `kosmo-qwen3-coder:30b-a3b-q4km`
Endpoint: `http://127.0.0.1:11434/api/generate`
Duration: 2753ms

## Checks

- http_ok: passed
- model_returned: passed
- response_non_empty: passed

## Advisory Checks

- mentions_review_only: needs_review
- mentions_no_public_promotion: passed

## Policy

- No private source content was sent.
- No public promotion was performed.
- Use the Ollama HTTP API for local worker automation; avoid raw TTY CLI output for stored packets.

