# Quellen — `.claude/skills/`

**Quelle:** [`shanraisshan/claude-code-best-practice`](https://github.com/shanraisshan/claude-code-best-practice)
— **Lizenz: MIT** (Copyright Shayan Rais, 2025–2026), ~63k★, per Web
identifiziert (Owner-Auftrag 18.07.2026 Punkt 2).

**Quellstand, gegen den kuratiert wurde:** Commit `eab161c` (voll:
`eab161ca5284aa0c88aa44ec4f371e73a356acef`), Branch `main`, Stand
17.07.2026 — geholt per `WebFetch` gegen `raw.githubusercontent.com`
(README, `best-practice/claude-skills.md`,
`implementation/claude-agent-teams-implementation.md`, `LICENSE`).

**Auftrag (Owner, wörtlich, `docs/V083-SPEZ.md` §0.3):** *Skills aus dem
markierten Git `shanraisshan/claude-code-best-practice` (MIT-Lizenz) als
Grundlage in KosmoOrbit ablegen — für den Claude-Code-Betrieb UND für Kosmo
selbst, selbständig kuratiert (nicht 1:1 kopiert).*

Alle sechs `SKILL.md`-Dateien unten sind **deutsch adaptierte, kuratierte**
Fassungen — keine Übersetzung/Kopie der Quelldateien. Jede trägt zusätzlich
im eigenen Kopf die Attributionszeile «Adaptiert aus
`shanraisshan/claude-code-best-practice` (MIT)».

## Übernommene Kernideen, je Skill

| Skill | Kernidee aus der Quelle | KosmoOrbit-Adaption |
| --- | --- | --- |
| `orchestrierung/` | Command → Agent → Skill, drei getrennte Rollen statt eines Modells, das alles selbst tippt. | Fable (Urteil) / Opus (Führung) / Sonnet (Ausführung) — `docs/KI-MODELL-GUIDELINE.md`, gespiegelt in Kosmo-Meister/-Leiter/-Zeichner. |
| `tiefplanung/` | Immer mit Plan-Modus beginnen, PRDs in vertikale Schnitte statt horizontale Phasen zerlegen, ein zweites Modell gegenlesen lassen. | `docs/V0xx-SPEZ.md`-Muster: geprüfte `Datei:Zeile`-Belege, Sanktionsliste, Vollständigkeits-Matrix mit messbarer Abnahme je Zeile. |
| `gegenpruefung/` | Cross-Model-Review, Challenge-Prompts («prove to me this works»), Produkt-Verifikations-Skills statt reiner Grün-Meldung. | Byte-Diff bei Goldens, Live-DOM-Nachmessung statt Screenshot-Beweis, volle Spec-Familie statt nur der zwei nächstliegenden Specs, Matrix-Abnahme W3/P10. |
| `parallel-pakete/` | Agent Teams über tmux + git worktrees, isolierte Sessions, gemeinsame Aufgabenliste. | Exakter Dateikreis je Paket, Isolations-Worktree-Beweis, `KOSMO_E2E_PORT` je Isolationslauf, Staging nur exakter Dateipfade, Foreground-Pflicht. |
| `lehren-gedaechtnis/` | Projekt-Gedächtnis in versionierten Dateien statt im Modellkontext; Handoff-Notizen vor Kontext-Reset schreiben. | `wissen/training/claude/lehren/vX.md` (Gate/Konvention/Fehler/Owner-Entscheid mit Beleg), Lade-Ritual + Rückschreib-Pflicht vor dem Release-Commit (`docs/CLAUDE-LERNSCHLEIFE.md`). |
| `claude-md-disziplin/` | `CLAUDE.md` schlank halten (~200 Zeilen), Domänenregeln auslagern statt die Hauptdatei wachsen zu lassen. | Additive Sanktionsliste für `CLAUDE.md`-Änderungen, additive Leseliste (nie streichen/umschreiben), Versions-Banner + Rollback-Riegel-Hook als Einheit. |

## Hinweis

Diese Kuration ist P1 des v0.8.3-Wellenplans (`docs/V083-SPEZ.md` §5/E5,
C-6/C-7/C-8 der Vollständigkeits-Matrix, §12.2). Die Verdrahtung der
Kosmo-seitigen `skillBlock()`-Funktion (`packages/kosmo-ai/src/skills.ts`,
Signatur eingefroren in P0) in `chat.ts` folgt erst in P7 (W2) — dieses
Verzeichnis liefert ausschliesslich die Skills und ihre Attribution.
