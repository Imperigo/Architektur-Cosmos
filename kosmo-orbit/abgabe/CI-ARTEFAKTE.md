# CI-Artefakte — die Installer

Binärdateien liegen nie im Git. Die Installer entstehen in GitHub Actions und
werden als Workflow-Artefakte angeboten (14 Tage Aufbewahrung).

## Fundort

GitHub → **Actions** → gewünschter Workflow → neuester grüner Lauf →
Abschnitt **Artifacts**.

| Workflow | Artefakt | Enthält |
| --- | --- | --- |
| **KosmoOrbit Desktop-Builds** | `kosmoorbit-linux` | AppImage · deb · rpm |
| | `kosmoorbit-macos` | dmg (unsigniert) |
| | `kosmoorbit-windows` | exe (NSIS) · msi |
| **KosmoOrbit iOS-Experiment** | `kosmoorbit-ios-projekt` | Xcode-Projekt (auf dem Mac signieren → iPad/TestFlight) |
| **KosmoOrbit CI** | `kosmo-orbit-web` | PWA-Build (für iPad «Zum Home-Bildschirm» / Selbst-Hosting) |

## Stand 04.07.2026 (finaler V1-Build)

Desktop-Builds und iOS-Experiment sind **grün** gebaut (Lauf 16:04, alle drei
Desktop-Plattformen + Xcode-Artefakt). Sie tragen den vollständigen V1-Stand
inklusive Node-Editor, Pairing, KosmoAsset/KosmoDev und dem Meldungs-System.

Installation je Plattform: siehe `INSTALL.md`.
