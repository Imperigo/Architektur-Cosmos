# KosmoOrbit Role UI Variants

Generated: 2026-06-01T07:00:29.316Z
Status: `role_ui_variants_ready`
Project: `Kosmo Demo 001`

Review-only role matrix. This does not create users, write auth data, open Blender or generate geometry.

## Summary

- variants: 8
- design-capable roles: 4
- generation-capable roles: 0
- admin variants: 2
- learning variants: 3
- explained variants: 8

## Variants

| Role | UI mode | Focus | Purpose | Primary | Design review | Public approve | Learning |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chef / Owner Admin | `full_admin` | `office_control` | Steuert Buero, Rollen, Freigaben, Public-Gates und kritische Risiken. | Open Review Mode | yes | yes | no |
| IT / KI Spezialist | `full_admin` | `infrastructure_control` | Prueft lokale KI, Hardware, Smokes, Build-Zustand und technische Betriebsrisiken. | View Summary Only | no | no | no |
| Projektleiter Architekt | `project_control` | `project_decision` | Fuehrt das Projekt durch Review, offene Fragen, Entscheidungen und Abgabe-Risiken. | Open Project Review | yes | no | no |
| Entwurfsarchitekt | `creative_pro` | `design_context` | Arbeitet mit Kontext, Modellprofil, Referenzen und Entwurfsabsichten. | Open Design Context | yes | no | no |
| Zeichner EFZ | `production_pro` | `production_quality` | Prueft technische Modellqualitaet, Layer, Massstab, Export- und Planlogik. | View Summary Only | no | no | no |
| Praktikant | `guided` | `guided_assist` | Unterstuetzt sicher mit gefuehrten Aufgaben, ohne kritische Entscheide ausloesen zu koennen. | Open Guided Review | yes | no | yes |
| Lehrling | `learning` | `learning` | Lernt Projektlogik, Rollen, Begriffe und Review-Gates anhand echter Bueroablaeufe. | View Summary Only | no | no | yes |
| Schnupperstift | `observer` | `observer` | Sieht eine sichere Demo des Systems, ohne Zugriff auf echte Projektsteuerung. | View Summary Only | no | no | yes |

## Chef / Owner Admin

- focus: `office_control`
- detail level: `full`
- purpose: Steuert Buero, Rollen, Freigaben, Public-Gates und kritische Risiken.
- interface depth: Vollstaendige Steuerzentrale mit allen Warnungen, Gates und technischen Details.
- decision scope: Darf lokale und oeffentliche Freigaben sehen und entscheiden, startet aber keine Generation ohne geschlossene Review-Gates.
- safe next step: Projektstatus pruefen und entscheiden, welche Blocker zuerst menschlich geklaert werden.
- primary action: Open Review Mode
- primary enabled: yes
- generation enabled: no
- visible sections: `status_header`, `role_gate`, `blockers`, `allowed_actions`, `model_profile`, `context_inputs`, `guardrails`, `next_actions`, `admin_gates`, `publish_risk`

Warnings:
- Design generation stays disabled until context and human-review gates are approved.

## IT / KI Spezialist

- focus: `infrastructure_control`
- detail level: `full`
- purpose: Prueft lokale KI, Hardware, Smokes, Build-Zustand und technische Betriebsrisiken.
- interface depth: Technische Diagnoseoberflaeche mit Runtime-, Smoke- und Sicherheitszustand.
- decision scope: Darf Systemzustand pruefen und Reparaturpfade vorbereiten, aber keine Architekturfreigabe ersetzen.
- safe next step: Smokes und lokale Runtime pruefen, bevor ein Tool fuer Menschen freigegeben wird.
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
- purpose: Fuehrt das Projekt durch Review, offene Fragen, Entscheidungen und Abgabe-Risiken.
- interface depth: Entscheidungsoberflaeche mit Projektstatus, Blockern, naechsten Schritten und Human Review.
- decision scope: Darf lokale Review-Entscheide vorbereiten, aber keine oeffentliche Publikation freigeben.
- safe next step: Blocker priorisieren und KosmoDesign nur im Review Mode oeffnen.
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
- purpose: Arbeitet mit Kontext, Modellprofil, Referenzen und Entwurfsabsichten.
- interface depth: Kreative Review-Oberflaeche mit Kontextinputs, Modellprofil und Design-Handoff.
- decision scope: Darf Design-Kontext pruefen, aber keine automatische Design-Generierung starten.
- safe next step: KosmoDesign Review Mode oeffnen und blockierte Kontextinputs beurteilen.
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
- purpose: Prueft technische Modellqualitaet, Layer, Massstab, Export- und Planlogik.
- interface depth: Technische Oberflaeche mit Modellprofil, Guardrails und Qualitaetsstatus.
- decision scope: Darf Qualitaetsmaengel sichtbar machen, aber keine Entwurfs- oder Public-Gates freigeben.
- safe next step: Modellqualitaet und Draw/Viz-Handoffs pruefen, bevor Exporte vorbereitet werden.
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
- purpose: Unterstuetzt sicher mit gefuehrten Aufgaben, ohne kritische Entscheide ausloesen zu koennen.
- interface depth: Gefuehrte Assistenzoberflaeche mit klaren erlaubten Aktionen und Erklaerungen.
- decision scope: Darf verstehen, sortieren und vorbereiten, aber keine Freigaben oder Generierung ausloesen.
- safe next step: Gefuehrte Review-Aufgabe oeffnen und eine sichere Beobachtung dokumentieren.
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
- purpose: Lernt Projektlogik, Rollen, Begriffe und Review-Gates anhand echter Bueroablaeufe.
- interface depth: Lernoberflaeche mit vereinfachter Sprache, Beispielen und blockierten Risikoaktionen.
- decision scope: Darf erklaerte Schritte nachvollziehen, aber keine Projektentscheidung schreiben.
- safe next step: Lernansicht oeffnen und den Unterschied zwischen Review und Generation verstehen.
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
- purpose: Sieht eine sichere Demo des Systems, ohne Zugriff auf echte Projektsteuerung.
- interface depth: Observer-Oberflaeche mit Demo-Status, einfachen Erklaerungen und read-only Verhalten.
- decision scope: Darf nur ansehen, nicht entscheiden, schreiben, generieren oder publizieren.
- safe next step: Demo ansehen und verstehen, warum kritische Aktionen blockiert bleiben.
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
