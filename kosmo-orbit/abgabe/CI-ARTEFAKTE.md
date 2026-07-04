# CI-Artefakte — die Installer

Binärdateien liegen nie im Git. Die Installer entstehen in GitHub Actions und
werden als Workflow-Artefakte angeboten (14 Tage Aufbewahrung).

## Fundort

GitHub → **Actions** → gewünschter Workflow → neuester grüner Lauf →
Abschnitt **Artifacts**.

Der Desktop-Workflow baut jede Plattform in **drei Editionen** (Standard/Remote/
Cloud) — Artefaktname `kosmo-orbit-<edition>-<plattform>`. Die Edition setzt nur
die Erststart-Betriebsart; im Programm ist sie umstellbar (siehe
`../docs/BETRIEBSARTEN.md`). Wer nur einen Installer will, nimmt **standard**.

| Workflow | Artefakt | Enthält |
| --- | --- | --- |
| **KosmoOrbit Desktop-Builds** | `kosmo-orbit-<edition>-ubuntu-22.04` | AppImage · deb · rpm |
| | `kosmo-orbit-<edition>-macos-latest` | dmg (unsigniert) |
| | `kosmo-orbit-<edition>-windows-latest` | exe (NSIS) · msi |
| **KosmoOrbit iOS-Experiment** | `kosmoorbit-ios-projekt` | Xcode-Projekt (auf dem Mac signieren → iPad/TestFlight) |
| **KosmoOrbit CI** | `kosmo-orbit-web` | PWA-Build (für iPad «Zum Home-Bildschirm» / Selbst-Hosting) |

`<edition>` = `standard` · `remote` · `cloud`.

## Stand 04.07.2026 (finaler V1-Build)

Desktop-Builds und iOS-Experiment sind **grün** gebaut (Lauf 16:04, alle drei
Desktop-Plattformen + Xcode-Artefakt). Sie tragen den vollständigen V1-Stand
inklusive Node-Editor, Pairing, KosmoAsset/KosmoDev und dem Meldungs-System.

Installation je Plattform: siehe `INSTALL.md`.
