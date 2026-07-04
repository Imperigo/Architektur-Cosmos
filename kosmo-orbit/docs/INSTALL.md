# KosmoOrbit V1 — Installation auf allen Geräten

Die Installer entstehen in der CI (GitHub Actions) — Binärdateien liegen nie im Git.
Artefakte: GitHub → Actions → Workflow **«KosmoOrbit Desktop-Builds»** (neuester grüner
Lauf) → Abschnitt *Artifacts*. Für iPad zusätzlich **«KosmoOrbit iOS-Experiment»**.

## Linux (Ubuntu — der Entwicklungsrechner)

Artefakt `kosmoorbit-linux` herunterladen und entpacken. Drei Wege, einer reicht:

| Format | Installation |
| --- | --- |
| `.AppImage` | `chmod +x KosmoOrbit_*.AppImage && ./KosmoOrbit_*.AppImage` — läuft ohne Installation |
| `.deb` | `sudo apt install ./KosmoOrbit_*.deb` |
| `.rpm` | für Fedora/openSUSE: `sudo rpm -i KosmoOrbit_*.rpm` |

Erststart: KosmoOrbit öffnet die Zentrale. Helferdienste (Bridge :8600, Sync :8700)
startest du nach `docs/HOMESTATION-AUFTRAG.md`; ohne sie läuft alles ausser
Render-Jobs und Live-Sync — ehrliche Badges zeigen den Zustand.

## macOS (MacBook)

Artefakt `kosmoorbit-macos` → `KosmoOrbit_*.dmg` öffnen, App in *Programme* ziehen.

**Unsigniert** (Apple-Konto ist ein Erster-Abend-Punkt): beim ersten Öffnen
Rechtsklick → *Öffnen* → *Öffnen* bestätigen. Ab macOS 15: *Systemeinstellungen →
Datenschutz & Sicherheit → «Dennoch öffnen»*.

## Windows

Artefakt `kosmoorbit-windows` → `KosmoOrbit_*_x64-setup.exe` (NSIS) oder `.msi`
ausführen. SmartScreen: *Weitere Informationen → Trotzdem ausführen* (unsigniert,
siehe oben).

## iPad — zwei Wege

1. **PWA (der heutige Weg, komplett funktionsfähig):** Safari →
   `http://<rechner>:5183` (Dev) bzw. die gehostete URL → Teilen →
   **«Zum Home-Bildschirm»**. Läuft offline (Service Worker), Pencil zeichnet
   mit 240 Hz, Projekte liegen im Geräte-Tresor (IndexedDB).
2. **Native App (Xcode-Artefakt):** `kosmoorbit-ios-projekt` aus dem
   iOS-Workflow laden, auf dem Mac in Xcode öffnen, mit dem eigenen
   Apple-Konto signieren → aufs iPad oder in TestFlight. Braucht das
   Apple-Developer-Konto (Erster-Abend-Punkt).

### iPad mit dem Büro koppeln (nahtlos)

Auf dem Desktop: Kopfleiste → **Sync** → **«iPad koppeln»**. Den QR-Code mit der
iPad-**Kamera** scannen (kein In-App-Scanner nötig) — KosmoOrbit öffnet sich und
verbindet automatisch mit dem richtigen Raum. Die Verbindung steckt im
URL-Fragment und landet nie in Server-Logs. Voraussetzung: beide Geräte
erreichen den Sync-Server (gleiches WLAN oder VPN).

## Updates — ehrlich

Ohne Signatur-Schlüssel gibt es kein Auto-Update: **Update = neuen Installer aus
der CI laden und drüberinstallieren** (Projekte bleiben — sie liegen im
Geräte-Tresor, nicht in der App). Der Tauri-Updater mit eigenem Schlüsselpaar
ist als Erster-Abend-Punkt in `docs/HOMESTATION-AUFTRAG.md` notiert.

## Versionen

Die laufende Version steht in der Zentrale unten links und in
`apps/kosmo-orbit/src-tauri/tauri.conf.json` (`version`).
