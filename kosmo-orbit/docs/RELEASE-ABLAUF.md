# Release-Ablauf — Git, Installer, Website, Obsidian

Owner-Auftrag (v0.6.2): «bei jedem Update pushe alles auf git, obsidian und
die neuste Installer-Version zum Herunterladen auf der Website». Dieser Text
dokumentiert den bestehenden Arbeitsfluss als EINE Kette — nichts davon ist
neu erfunden, ausser dem Obsidian-Schritt (5) und der Doku selbst.

## Die Kette in einem Bild

```
Version bumpen → volle Suite → .desktop-build-request anfassen + pushen
   → CI baut die Installer → GitHub-Release-Tag «desktop-latest» aktualisiert sich
   → node tools/release-notiz.mjs → Website zeigt automatisch den neusten Installer
```

## 1. Version bumpen

Drei Stellen, immer zusammen:

- `kosmo-orbit/package.json` (`version`)
- `kosmo-orbit/apps/kosmo-orbit/src-tauri/tauri.conf.json` (`version`)
- `kosmo-orbit/apps/kosmo-orbit/src-tauri/Cargo.toml` (`[package] version`)

## 2. Volle Suite (Owner-Arbeitsmuster, `CLAUDE.md`)

```bash
npm run typecheck
npm test               # Kernel + KI + Contracts + App
npm run build           # alle Pakete + die App
```

Jeder Block bekommt ausserdem einen **ROADMAP-Eintrag** (vor dem
Phase-3-Marker) und einen deutschen Commit mit Trailern — das ist der
bestehende git-Teil des Owner-Auftrags («bei jedem Update alles auf git») und
läuft bereits so, batch für batch, auf dem Entwicklungsbranch.

## 3. Installer anstossen

Kein Signing-Schlüssel → kein klassisches CI/CD-Release-Gate, sondern ein
bewusster, manueller Auslöser (`CLAUDE.md` „Eigenheiten"):

```bash
# Datei anfassen (neuer Zeitstempel reicht) und pushen:
date -u +%Y-%m-%dT%H:%M:%SZ > kosmo-orbit/.desktop-build-request
git add kosmo-orbit/.desktop-build-request
git commit -m "Build-Trigger: Desktop-Installer"
git push
```

`.github/workflows/kosmo-orbit-desktop.yml` reagiert auf Pushes, die diese
Datei auf dem Entwicklungsbranch (`claude/kosmo-orbit-v1-build-pzxkbj`)
ändern, und baut alle drei Editionen (`standard`/`remote`/`cloud`) für alle
drei Plattformen (Windows/macOS/Linux).

## 4. Warum die Website nie „nachgeführt" werden muss

Der letzte Schritt des Workflows (`softprops/action-gh-release`) veröffentlicht
die Installer immer unter **demselben** Tag `desktop-latest`, mit **denselben**
Dateinamen (`KosmoOrbit-<edition>-<plattform>…`) — jeder neue Lauf ersetzt die
alten Assets unter identischer URL. Die Website
(`app/orbit/OrbitDownload.tsx`) verlinkt genau diese URLs fest — „neuste
Installer-Version zum Herunterladen auf der Website" ist damit **strukturell**
erfüllt, ohne dass nach einem Build je eine Datei kopiert oder ein Link
angepasst werden muss.

**Ehrliche Einschränkung**: das gilt nur, sobald die Website-Änderung selbst
auf `main` liegt (siehe Abschnitt 6) — der Download-Link-Text ändert sich
nicht mehr, aber die Seite `app/orbit/OrbitDownload.tsx` muss einmal
deploy't sein, damit sie überhaupt online steht.

## 5. Obsidian — die Release-Notiz

Neu (dieser Auftrag): `kosmo-orbit/tools/release-notiz.mjs` liest die Version
aus `kosmo-orbit/package.json` und die neusten `ROADMAP.md`-Einträge ab einer
Startnummer, und legt/aktualisiert eine Notiz im Vault an:

```bash
node kosmo-orbit/tools/release-notiz.mjs --von <ROADMAP-Nummer>
# → wissen/vault/Releases/Release-<version>-<datum>.md
```

`<ROADMAP-Nummer>` ist die erste Eintragsnummer, die in diesen Release
gehört (z. B. `--von 213` für den 0.6.1-Nachtbatch, ROADMAP-Einträge
213–221). Die Notiz folgt dem Frontmatter-/Wikilink-Stil von
`wissen/vault/LoRA/LoRA-Uebersicht.md` (Frontmatter + `[[Wikilinks]]`).

Tests: `node kosmo-orbit/tools/release-notiz.test.mjs` (Muster wie
`tools/secret-scan.test.mjs` — reines Node, kein Test-Framework).

## 6. Die Website selbst — NICHT automatisch

**Wichtig, ehrlich benannt** (`DEPLOYMENT.md` an der Repo-Wurzel): Cloudflare
deployt automatisch nur bei einem Push auf **`main`**. Der
Entwicklungsbranch dieses Auftrags (`claude/kosmo-orbit-v1-build-pzxkbj`)
löst **keinen** automatischen Deploy aus. Die Website-Änderungen in diesem
Batch (`app/orbit/OrbitDownload.tsx`, `app/orbit/OrbitDeinstallation.tsx`,
`app/orbit/page.tsx`) werden erst live, sobald sie per PR/Merge auf `main`
landen — das ist ein bewusster Owner-Schritt, kein Automatismus dieses
Branches. Bis dahin sind sie im Arbeitsbaum vorhanden und lokal grün gebaut
(`npm run build` an der Repo-Wurzel), aber nicht auf
`architekturkosmos.ch` sichtbar.

## Checkliste (kurz)

- [ ] Version an den drei Stellen gebumpt
- [ ] `npm run typecheck && npm test && npm run build` grün (kosmo-orbit)
- [ ] `.desktop-build-request` angefasst + gepusht → CI-Lauf grün
- [ ] `node tools/release-notiz.mjs --von <N>` ausgeführt → Vault-Notiz liegt
      unter `wissen/vault/Releases/`
- [ ] ROADMAP-Eintrag + Commit + Push (bestehender Arbeitsfluss)
- [ ] Falls Website-Dateien geändert wurden: PR auf `main` gestellt/gemerged
      (Owner-Schritt, siehe Abschnitt 6) — erst danach ist die Seite live
