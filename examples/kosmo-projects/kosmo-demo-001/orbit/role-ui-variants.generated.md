# KosmoOrbit Role UI Variants

Generated: 2026-05-31T13:50:09.864Z
Status: `role_ui_variants_ready`
Project: `Kosmo Demo 001`

Review-only role matrix. This does not create users, write auth data, open Blender or generate geometry.

## Summary

- variants: 8
- design-capable roles: 4
- generation-capable roles: 0
- admin variants: 2
- learning variants: 3

## Variants

| Role | UI mode | Focus | Primary | Design review | Public approve | Learning |
| --- | --- | --- | --- | --- | --- | --- |
| Chef / Owner Admin | `full_admin` | `office_control` | Open Review Mode | yes | yes | no |
| IT / KI Spezialist | `full_admin` | `infrastructure_control` | View Summary Only | no | no | no |
| Projektleiter Architekt | `project_control` | `project_decision` | Open Project Review | yes | no | no |
| Entwurfsarchitekt | `creative_pro` | `design_context` | Open Design Context | yes | no | no |
| Zeichner EFZ | `production_pro` | `production_quality` | View Summary Only | no | no | no |
| Praktikant | `guided` | `guided_assist` | Open Guided Review | yes | no | yes |
| Lehrling | `learning` | `learning` | View Summary Only | no | no | yes |
| Schnupperstift | `observer` | `observer` | View Summary Only | no | no | yes |

## Chef / Owner Admin

- focus: `office_control`
- detail level: `full`
- primary action: Open Review Mode
- primary enabled: yes
- generation enabled: no
- visible sections: `status_header`, `role_gate`, `blockers`, `allowed_actions`, `model_profile`, `context_inputs`, `guardrails`, `next_actions`, `admin_gates`, `publish_risk`

Warnings:
- Design generation stays disabled until context and human-review gates are approved.

## IT / KI Spezialist

- focus: `infrastructure_control`
- detail level: `full`
- primary action: View Summary Only
- primary enabled: no
- generation enabled: no
- visible sections: `status_header`, `role_gate`, `blockers`, `model_profile`, `context_inputs`, `guardrails`, `next_actions`, `runtime_safety`, `smoke_checks`
- hidden sections: `allowed_actions`

Warnings:
- This role cannot open KosmoDesign review mode.
- This role cannot clear public release or publish gates.
- Design generation stays disabled until context and human-review gates are approved.

## Projektleiter Architekt

- focus: `project_decision`
- detail level: `decision`
- primary action: Open Project Review
- primary enabled: yes
- generation enabled: no
- visible sections: `status_header`, `role_gate`, `blockers`, `allowed_actions`, `model_profile`, `context_inputs`, `guardrails`, `next_actions`, `human_review`

Warnings:
- This role cannot clear public release or publish gates.
- Design generation stays disabled until context and human-review gates are approved.

## Entwurfsarchitekt

- focus: `design_context`
- detail level: `creative`
- primary action: Open Design Context
- primary enabled: yes
- generation enabled: no
- visible sections: `status_header`, `role_gate`, `blockers`, `allowed_actions`, `model_profile`, `context_inputs`, `guardrails`, `next_actions`

Warnings:
- This role cannot clear public release or publish gates.
- Design generation stays disabled until context and human-review gates are approved.

## Zeichner EFZ

- focus: `production_quality`
- detail level: `technical`
- primary action: View Summary Only
- primary enabled: no
- generation enabled: no
- visible sections: `status_header`, `role_gate`, `blockers`, `model_profile`, `context_inputs`, `guardrails`, `next_actions`
- hidden sections: `allowed_actions`

Warnings:
- This role cannot open KosmoDesign review mode.
- This role cannot clear public release or publish gates.
- Design generation stays disabled until context and human-review gates are approved.

## Praktikant

- focus: `guided_assist`
- detail level: `guided`
- primary action: Open Guided Review
- primary enabled: yes
- generation enabled: no
- visible sections: `status_header`, `role_gate`, `blockers`, `allowed_actions`, `model_profile`, `context_inputs`, `guardrails`, `next_actions`

Warnings:
- This role cannot clear public release or publish gates.
- Design generation stays disabled until context and human-review gates are approved.

## Lehrling

- focus: `learning`
- detail level: `learning`
- primary action: View Summary Only
- primary enabled: no
- generation enabled: no
- visible sections: `status_header`, `role_gate`, `blockers`, `model_profile`, `context_inputs`, `guardrails`, `next_actions`, `explanations`
- hidden sections: `allowed_actions`, `admin_gates`, `publish_risk`

Warnings:
- This role cannot open KosmoDesign review mode.
- This role cannot clear public release or publish gates.
- Keep this role in learning/read-only mode.
- Design generation stays disabled until context and human-review gates are approved.

## Schnupperstift

- focus: `observer`
- detail level: `observer`
- primary action: View Summary Only
- primary enabled: no
- generation enabled: no
- visible sections: `status_header`, `role_gate`, `blockers`, `model_profile`, `guardrails`, `next_actions`, `explanations`
- hidden sections: `allowed_actions`, `admin_gates`, `publish_risk`, `context_inputs`

Warnings:
- This role cannot open KosmoDesign review mode.
- This role cannot clear public release or publish gates.
- Keep this role in learning/read-only mode.
- Design generation stays disabled until context and human-review gates are approved.

## Next Actions

- Use these variants as the role matrix for the first KosmoOrbit app screen.
- Keep design generation disabled for every role until context and human-review gates are approved.
- Turn learning variants into simplified UI copy before apprentices or trial users see the tool.
