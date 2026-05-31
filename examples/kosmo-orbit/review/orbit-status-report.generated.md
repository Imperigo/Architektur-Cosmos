# KosmoOrbit Status Report

Workspace: `Architecture Kosmos Demo Office`
Generated: 2026-05-31T13:46:12.315Z
Status: `orbit_blocked_gates_present`
Mode: `local_dev`
Hardware: `developer_laptop`

Review-only. This report does not start tools, upload files, publish data, spend money or access external accounts.

## Current User

- name: Andrin Baumann
- role: Chef / Owner Admin (`owner_admin`)
- UI mode: `full_admin`
- permissions: `admin_all`, `approve_public`, `approve_local`, `manage_projects`, `review_gates`

## Summary

- roles: 8
- tools: 8
- projects: 1
- gates: 7
- blocked gates: 2
- review/unknown gates: 4

## Tool Hub

| Tool | Status | Readiness | Roles | Gates |
| --- | --- | --- | --- | --- |
| KosmoData | `active` | `blocked_by_gate` | Chef / Owner Admin, Projektleiter Architekt, Entwurfsarchitekt, Praktikant, Lehrling | rights-gate:blocked, source-gate:needs_review |
| KosmoAsset | `prototype` | `blocked_by_gate` | Chef / Owner Admin, IT / KI Spezialist, Entwurfsarchitekt, Zeichner EFZ | rights-gate:blocked, publish-gate:blocked, human-review-gate:needs_review |
| KosmoDesign | `planned` | `review_required` | Chef / Owner Admin, Projektleiter Architekt, Entwurfsarchitekt, Praktikant | human-review-gate:needs_review, model-quality-gate:unknown |
| KosmoPrepare | `planned` | `review_required` | Projektleiter Architekt, Entwurfsarchitekt, Praktikant | source-gate:needs_review, human-review-gate:needs_review |
| KosmoDraw | `prototype` | `review_required` | Projektleiter Architekt, Entwurfsarchitekt, Zeichner EFZ | human-review-gate:needs_review, model-quality-gate:unknown |
| KosmoViz | `planned` | `blocked_by_gate` | Entwurfsarchitekt, Projektleiter Architekt | rights-gate:blocked, human-review-gate:needs_review, cost-gate:local_only |
| KosmoPublish | `planned` | `blocked_by_gate` | Chef / Owner Admin, Projektleiter Architekt, Zeichner EFZ | publish-gate:blocked, rights-gate:blocked, security-gate:needs_review |
| KosmoZentrale | `external` | `review_required` | Chef / Owner Admin, IT / KI Spezialist | security-gate:needs_review, cost-gate:local_only |

## Projects

| Project | Status | Package | Roles | Gates |
| --- | --- | --- | --- | --- |
| Kosmo Demo 001 | `needs_review` | exists | Chef / Owner Admin, Projektleiter Architekt, Entwurfsarchitekt, Zeichner EFZ | source-gate:needs_review, rights-gate:blocked, human-review-gate:needs_review, model-quality-gate:unknown, publish-gate:blocked |

## Gates

| Gate | Type | Status | Owner | Tool | Project | Meaning |
| --- | --- | --- | --- | --- | --- | --- |
| source-gate | `source_gate` | `needs_review` | Projektleiter Architekt | KosmoData | Kosmo Demo 001 | Sources and origin must be clear before downstream design or public use. |
| rights-gate | `rights_gate` | `blocked` | Chef / Owner Admin | KosmoAsset | Kosmo Demo 001 | Unknown or private rights remain blocked for public use. |
| human-review-gate | `human_review_gate` | `needs_review` | Projektleiter Architekt | KosmoDesign | Kosmo Demo 001 | Architectural decisions need human review before local approval. |
| model-quality-gate | `model_quality_gate` | `unknown` | Zeichner EFZ | KosmoDraw | Kosmo Demo 001 | Geometry, layers, scale and semantic model quality are not proven yet. |
| publish-gate | `publish_gate` | `blocked` | Chef / Owner Admin | KosmoPublish | Kosmo Demo 001 | No public promotion, upload or shop release without explicit owner approval. |
| cost-gate | `cost_gate` | `local_only` | IT / KI Spezialist | KosmoZentrale | - | No paid cloud or GPU job may start from this demo workspace. |
| security-gate | `security_gate` | `needs_review` | IT / KI Spezialist | KosmoZentrale | - | Secrets, external accounts and private office data stay out of the public repo. |

## Role Modes

| Role | Level | UI mode | Permissions |
| --- | --- | --- | --- |
| Chef / Owner Admin | `admin` | `full_admin` | 5 |
| IT / KI Spezialist | `admin` | `full_admin` | 5 |
| Projektleiter Architekt | `lead` | `project_control` | 6 |
| Entwurfsarchitekt | `professional` | `creative_pro` | 4 |
| Zeichner EFZ | `professional` | `production_pro` | 3 |
| Praktikant | `guided` | `guided` | 3 |
| Lehrling | `learning` | `learning` | 3 |
| Schnupperstift | `observer` | `observer` | 2 |

## Next Actions

- Keep public promotion, uploads and unsafe routes blocked until owner/admin review clears the relevant gates.
- Resolve source, human-review, model-quality and security gates before using the project as a real production example.
- Define the first KosmoDesign handoff screen: what Orbit opens, what Blender/KosmoDraw receives, and which role may trigger it.
- Use the existing demo project package as the first Orbit Project Package Inspector input.
