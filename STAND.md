# AKTUELLER STAND — immer zuerst lesen

**Aktuelle Version: v0.9.0 «Heimkraft»** (Stand 22.07.2026, ROADMAP 613).
**Alle Versionen davor (≤ v0.8.12) sind ARCHIV.** Nie mehr darauf aufbauen.

> **Betriebs-Novum seit 0.8.12:** der Owner-Home-PC (andrins-workstation,
> Tailnet `100.88.48.73`) ist der KosmoOrbit-Server (Bridge/Sync/App/Ollama,
> `docs/VPN-HOMEPC-ANLEITUNG.md` + `docs/HOMEPC-WORKER-PROMPT.md`); die App
> verbindet sich per Ein-Klick-HomeServer (Einstellungen). Release-Zustellung
> ist IMMER das Paar Mac-DMG + iPad-Serverstand (`RELEASE-ABLAUF.md` §7).

> **Kurswechsel Release-Takt (Owner-Kompass 20.07., F8):** v0.8.11 war der
> **letzte Kleintakt** — ab jetzt grössere Versionssprünge Richtung 0.9.0
> (vier F9-Stränge) und 1.0 (= Demobeweis, `docs/OWNER-KOMPASS-2026-07-20.md`).

> **Versions-Hinweis:** Der Bump hat FÜNF Träger — `package.json` (Root + App),
> `Cargo.toml`, `tauri.conf.json` und das `APP_VERSION`-Literal in
> `apps/kosmo-orbit/vite.config.ts` (speist den App-Kopf; beim v0.8.2-Bump
> vergessen, P10-Fund ROADMAP 447) — alle deckungsgleich **0.8.12**, dazu der
> `kosmo-orbit`-Eintrag in `Cargo.lock`. Der `__APP_VERSION__`-Entkopplungs-
> Mechanismus bleibt für künftige Teil-Release-Buchstaben-Ausnahmen bestehen.

- **Entwicklungs-Branch:** `claude/kosmo-orbit-v1-build-pzxkbj`
- **Wahrheit ist `origin/<branch>`, nicht der lokale Container.**

## Warum diese Datei existiert

Der Web-Container wird gelegentlich auf einen **älteren Commit zurückgerollt**
(Snapshot-Restore). Passiert das unbemerkt, fängt eine neue Sitzung auf
veralteter Historie an (z.B. v0.6.6) und baut längst releaste Stände nach —
ein teurer, verwirrender Fehler.

## Regel (verbindlich, jede Sitzung)

**Bevor du irgendetwas anfasst: vom echten Remote-Kopf ausgehen.**

```bash
git fetch origin claude/kosmo-orbit-v1-build-pzxkbj
git reset --hard origin/claude/kosmo-orbit-v1-build-pzxkbj   # nur wenn lokal HINTER origin
```

Das erledigt der **SessionStart-Hook** (`.claude/hooks/session-start.sh`)
automatisch: er holt origin, prüft, ob der lokale HEAD ein Vorfahre von origin
ist (= Rollback), und setzt in diesem Fall hart auf den Remote-Kopf zurück.
Bei echten, noch nicht gepushten lokalen Commits (voraus/divergiert) wird
NICHT zurückgesetzt, sondern nur gewarnt — dann selbst prüfen.

**Kontrolle von Hand:** stimmt `git rev-parse HEAD` mit
`git rev-parse origin/claude/kosmo-orbit-v1-build-pzxkbj` überein? Wenn nein und
lokal ist Vorfahre → zurücksetzen. Nie eine ältere Version «weiterbauen».

## Pflege

Jedes Release-Finale aktualisiert die **erste Zeile** dieser Datei auf die neue
Version (die alte wandert damit ins Archiv). Der Hook echot die ersten Zeilen
beim Sitzungsstart, damit der aktuelle Stand sofort im Kontext sichtbar ist.
