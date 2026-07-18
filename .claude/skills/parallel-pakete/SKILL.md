---
name: parallel-pakete
description: Mehrere Bauagenten gleichzeitig, ohne dass sie sich gegenseitig zerstören — exakter Dateikreis je Paket, eigener KOSMO_E2E_PORT je Isolations-Worktree, Staging nur exakter Pfade, Foreground-Pflicht. Nutzen, sobald zwei oder mehr Pakete parallel laufen sollen.
---

*Adaptiert aus `shanraisshan/claude-code-best-practice` (MIT) — Kernidee dort:
Agent Teams über tmux + git worktrees, jede Session vollständig isoliert
(eigener Kontext, eigene Skills), Koordination über eine gemeinsame
Aufgabenliste statt Bash-Zuruf. Details/Attribution: `.claude/skills/QUELLEN.md`.*

## KosmoOrbit-Fassung — vier Disziplinen statt einer Umgebungsvariable

Das Quell-Repo aktiviert Parallelität über eine Experimental-Flag
(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) und verlässt sich auf
Verzeichnis-Trennung (`.claude/commands|agents|skills`). KosmoOrbit braucht
für parallele Bauagenten-Pakete vier konkretere, hier bereits erprobte
Disziplinen (Belege: `wissen/training/claude/lehren/v0.8.2.md`):

1. **Exakter Dateikreis je Paket** — jeder Bauagenten-Auftrag nennt genau die
   Dateien/Verzeichnisse, die er anfassen darf (Muster: dieser Auftrag selbst,
   «DATEIKREIS: `.claude/skills/**`, …»). Kollisionsfreiheit ist eine
   Vorbedingung, kein nachträglicher Merge-Kampf.
2. **Isolations-Worktree-Beweis** — läuft ein Paket parallel zu sichtbarem
   WIP eines Nachbarpakets, baut es einen eigenen `HEAD+Pxx`-Worktree und
   fährt die E2E-Suite dort isoliert (P6-Beleg: eigener Worktree, **3 passed**
   auf einem eigenen Port, während PD2 gleichzeitig am Island-Umbau
   arbeitete).
3. **`KOSMO_E2E_PORT` statt `PW_BASE_URL`** — `playwright.config.ts` steuert
   den E2E-Port über `KOSMO_E2E_PORT`; wer nur `PW_BASE_URL` setzt, testet
   gegen den falschen Port, sobald zwei Suiten gleichzeitig laufen. Jeder
   Isolations-Lauf bekommt einen eigenen Port.
4. **Staging nur exakter Dateipfade** — im geteilten Worktree niemals
   `git add -A`/`.`; jeder Commit staged genau die Pfade seines Dateikreises,
   damit kein Beifang aus einem parallel laufenden Paket hineinrutscht (die
   P7a-Lehre — ausser bei einer bewusst dokumentierten Ausnahme, nie per
   Automatismus).

## Foreground-Pflicht (harte Regel)

**Nie auf Hintergrund-Monitore oder lange `sleep`-Ketten warten.** Drei
Foreground-Agenten hingen sich in v0.8.2 an genau dieser Stelle auf — die
Arbeit lag fertig auf der Platte, aber niemand fuhr die Schlussverifikation.
Ein Bauagent bleibt foreground bis zum eigenen Bericht; Warten gehört in einen
Poll-Loop mit Abbruchbedingung, nie in eine blosse Sleep-Kette.

## Anwendung

Vor dem Start paralleler Pakete: Dateikreise gegeneinander prüfen
(Overlap = Blocker, nicht Owner-Frage), bei echtem Parallel-Risiko einen
Isolations-Worktree mit eigenem `KOSMO_E2E_PORT` bauen, beim Commit nur die
eigenen Pfade stagen, und die ganze Sitzung über foreground bleiben.
