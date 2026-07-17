# AKTUELLER STAND — immer zuerst lesen

**Aktuelle Version: v0.8.2 «Selbstverbesserung»** (Stand 17.07.2026, ROADMAP 434).
**Alle Versionen davor (≤ v0.8.1) sind ARCHIV.** Nie mehr darauf aufbauen.

> **Versions-Hinweis:** die v0.8.0B-Sonderregelung (Owner-Anzeigeversion mit
> Buchstaben-Suffix entkoppelt von einem strikten SemVer in `package.json`)
> ist mit diesem Release nicht mehr nötig — «0.8.1» ist selbst gültiges
> SemVer. Owner-Anzeigeversion und `package.json`/`Cargo.toml`/
> `tauri.conf.json`/`package-lock.json` führen wieder **deckungsgleich
> 0.8.1**. Der `__APP_VERSION__`-Entkopplungs-Mechanismus (`vite.config.ts`)
> bleibt trotzdem bestehen — er trägt bei Bedarf die nächste Teil-Release-
> Buchstaben-Ausnahme, ohne neu gebaut werden zu müssen.

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
