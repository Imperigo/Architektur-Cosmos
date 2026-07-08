---
titel: "Release-Ablauf"
tags: [release, prozess, uebersicht]
status: "aktiv"
erstellt: "2026-07-08"
verwandt: ["[[Release-0.6.1-2026-07-08]]"]
---

# Release-Ablauf

Obsidian-Einstieg zum Release-Prozess des ArchitekturKosmos (Owner-Auftrag
v0.6.2: «bei jedem Update pushe alles auf git, obsidian und die neuste
Installer-Version zum Herunterladen auf der Website»). Volles Konzept mit
allen Details: `kosmo-orbit/docs/RELEASE-ABLAUF.md`. Diese Notiz ist nur der
kurze Vault-Einstieg, mit Verweis und Status.

## Die Kette in Kürze

1. Version bumpen (`package.json` + `tauri.conf.json` + `Cargo.toml`)
2. Volle Suite (`npm run typecheck && npm test && npm run build`)
3. `kosmo-orbit/.desktop-build-request` anfassen + pushen → CI baut die
   Installer für alle drei Editionen × drei Plattformen
4. GitHub-Release-Tag `desktop-latest` aktualisiert sich automatisch —
   dieselben Dateinamen, dieselbe URL, immer der neuste Build. Die
   Download-Seite `architekturkosmos.ch/orbit` muss darum **nie** von Hand
   nachgeführt werden.
5. `node kosmo-orbit/tools/release-notiz.mjs --von <ROADMAP-Nummer>` erzeugt/
   aktualisiert die Release-Notiz im Vault (`wissen/vault/Releases/`)
6. Normaler Commit + Push auf den Entwicklungsbranch (bestehender
   Arbeitsfluss, siehe `kosmo-orbit/CLAUDE.md` „Arbeitsmuster")

## Ehrliche Grenze

Die Website-Panels (`app/orbit/OrbitDownload.tsx`,
`app/orbit/OrbitDeinstallation.tsx`) werden erst live, sobald sie per
Pull-Request auf `main` gemerged sind — `DEPLOYMENT.md` an der Repo-Wurzel:
Cloudflare deployt automatisch nur von `main`, nicht vom Entwicklungsbranch.
Das Mergen ist ein bewusster Owner-Schritt.

## Bisherige Releases

- [[Release-0.6.1-2026-07-08]] — erste automatisch erzeugte Notiz
  (ROADMAP-Einträge 213–226), Beispiel-Lauf dieses Automaten.
