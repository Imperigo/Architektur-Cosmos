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

## Stabile Download-Links (Website)

Neben den 14-Tage-Workflow-Artefakten oben veröffentlicht derselbe Workflow
die Installer zusätzlich als **dauerhafte** Release-Assets unter dem
GitHub-Release-Tag `desktop-latest` (stabile Dateinamen
`KosmoOrbit-<edition>-<plattform>…`, wird bei jedem Lauf ersetzt statt
versioniert). Genau diese Links zeigt `architekturkosmos.ch/orbit` an — der
volle Ablauf inkl. Versions-Bump, Build-Trigger und Obsidian-Release-Notiz
steht in `../docs/RELEASE-ABLAUF.md`.

## Stand 11.07.2026 (gebündelter Release v0.7.1 + v0.7.2)

Build-Requests (Desktop + Pages + iOS) auf `c9aa547` angestossen. **Pages ist
verifiziert:** der Workflow hat um 23:34 UTC nach `gh-pages` deployt, und
`https://imperigo.github.io/Architektur-Cosmos/` liefert den Bundle mit
`version:"v0.7.2"` im Wordmark (direkt im ausgelieferten JS geprüft).
**Desktop-/iOS-Asset-Zählung (18 Assets unter `desktop-latest`) steht noch
aus:** diese Session hatte keinen GitHub-API-Zugriff (Connector nicht
autorisiert) — Verifikation wird mit dem 0.7.3-Finale oder per Owner-Blick
auf die Actions-Seite nachgereicht.

## Stand 12.07.2026 (Release v0.7.3 «Kosmodesign»)

Build-Requests (Desktop + Pages + iOS) auf **`8a13d89`** (Branch
`claude/kosmo-orbit-v1-build-pzxkbj`) mit frischem Zeitstempel `2026-07-12T05:18:38Z`
angestossen. Diese Session **hatte** GitHub-Zugriff (MCP-Tools) — der 0.7.2-Nachtrag
ist damit eingelöst:

- **Desktop-`desktop-latest`-Asset-Zählung nachgereicht:** die stabile
  Release-Marke `desktop-latest` trägt aktuell **genau 18 Assets** — 3 Editionen
  (standard/remote/cloud) × 6 Dateien je Edition (Linux `AppImage`+`deb`+`rpm`,
  macOS `dmg`, Windows `setup.exe`+`msi`). **Soll 18 = Ist 18 ✓.** Stand der
  hochgeladenen Assets: 0.7.2-Build (11.07. 23:43–23:45 UTC); der 0.7.3-Desktop-Lauf
  ersetzt sie beim Grün-Werden (stabile Dateinamen, nicht versioniert).
- **CI-Läufe auf `8a13d89` angestossen und laufen** (Stand ~05:19 UTC, alle 4
  frisch getriggert durch den Build-Request-Push):
  - KosmoOrbit Desktop-Builds — `in_progress` (Run 29180988347)
  - KosmoOrbit Web (GitHub Pages) — `in_progress` (Run 29180988379)
  - KosmoOrbit iOS-Experiment — `in_progress` (Run 29180988355)
  - KosmoOrbit CI — `pending` (Run 29180988351)
- **Pages-Verifikation — GRÜN & LIVE bestätigt:** der Pages-Lauf 29180988379
  (`8a13d89`) ist **`completed / success`** nach `gh-pages` deployt. Die Live-Seite
  `https://imperigo.github.io/Architektur-Cosmos/` liefert jetzt das **0.7.3**-Bundle:
  das ausgelieferte `assets/index-*.js` referenziert `derive.worker-B_rmxV6-.js` —
  **byte-identisch zum Hash des lokalen 0.7.3-Builds** (der `derive.worker` trägt
  `v0.7.3`), und `v0.7.3` erscheint im ausgelieferten JS. Damit ist der 0.7.2-Fall
  «Pages verifiziert, Asset-Zählung offen» für 0.7.3 vollständig geschlossen.
- **Desktop-/iOS-Läufe:** zum Redaktionsschluss noch `in_progress` (Runs
  29180988347 / 29180988355). Sie produzieren die neuen `desktop-latest`-Assets
  (erneut 18) bzw. das iOS-Xcode-Projekt; das Grün-Werden ist **angestossen, läuft**
  — Owner-Blick auf die Actions-Seite oder Folge-Poll für die finale Bestätigung.
  Der `KosmoOrbit CI`-Lauf auf `8a13d89` wurde durch den nachfolgenden Doku-Push
  `93f9fb1` regulär superseded (concurrency-cancel); die Deterministik-Gates sind
  lokal vollständig grün (s. u.).

Hinweis zu vorherigen roten CI-Läufen am 12.07. (`d160283`, `dda67e3`): das waren
Zwischenstände einzelner Bau-Wellen; die letzten regulären CI-Läufe vor dem Finale
(`97c755b`, `d9aef4f`) waren grün, und die Finale-Gates sind lokal vollständig grün
nachgefahren (Kernel 752 · App 847 · svg-qa 28/0 · secret-scan · ai-scan-delta).
