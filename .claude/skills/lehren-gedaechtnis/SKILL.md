---
name: lehren-gedaechtnis
description: Vor einem neuen Paket die letzten 2–3 Versionsdateien unter wissen/training/claude/lehren/ lesen; vor dem letzten Release-Commit einer Version die eigene vX.md zurückschreiben. Nutzen zu Beginn und am Ende jeder grösseren Arbeitssitzung.
---

*Adaptiert aus `shanraisshan/claude-code-best-practice` (MIT) — Kernidee dort:
Projekt-Gedächtnis lebt in versionierten, git-erfassten Dateien statt im
Modellkontext; Handoff-Notizen VOR einem `/compact`/`/clear` schreiben statt
sich auf implizites Erinnern zu verlassen. Details/Attribution:
`.claude/skills/QUELLEN.md`.*

## KosmoOrbit-Fassung — die Lehren-Schleife (`docs/CLAUDE-LERNSCHLEIFE.md`)

**Ehrlichkeits-Kern:** Claude ist nicht LoRA-trainierbar (Cloud-API, keine
eigenen Gewichte). Die Lehren-Schleife ist **kein Fine-Tuning**, sondern ein
git-erfasster, wachsender, redaktionell gepflegter Gedächtnis-Anker —
niemand lernt hier automatisch dazu, es wird diszipliniert nachgeführt.

**Format** (`wissen/training/claude/lehren/vX.md`, eine Datei je Version):

```markdown
---
version: 0.8.X
datum: TT.MM.JJJJ
---

## Gate
- <Lehre über ein Test-/Build-/svg-qa-Gate> (Beleg: Datei:Zeile oder ROADMAP-Nr.)

## Konvention
- <Lehre über eine Code-/Doku-Konvention> (Beleg: …)

## Fehler
- <ein tatsächlich gemachter und korrigierter Fehler> (Beleg: …)

## Owner-Entscheid
- <ein bindender Owner-Entscheid dieser Version> (Beleg: …)
```

**Belegdisziplin (bindend):** jede Zeile trägt einen Beleg (`Datei:Zeile` oder
eine `ROADMAP.md`-Eintragsnummer). Eine Zeile ohne Beleg ist eine Behauptung,
keine Lehre, und gehört nicht in die Datei. Eine leere Kategorie wird
weggelassen, nie mit einer erfundenen Lehre aufgefüllt.

## Zwei Pflichten, ein Prinzip

1. **Lade-Ritual (Sitzungsbeginn):** die 2–3 jüngsten `vX.md`-Dateien unter
   `wissen/training/claude/lehren/` lesen, bevor ein neues Paket beginnt
   (Dateinamen sind SemVer-sortierbar). Kein technischer Zwang, kein Hook,
   kein Prompt-Inject — die Pflicht ist redaktionell, weil Claude Code
   `CLAUDE.md` ohnehin liest und der Verweis von dort aus auffindbar ist.
2. **Rückschreib-Pflicht (Sitzungsende/Release):** vor dem letzten
   Release-Commit einer Version schreibt der ausführende Agent die eigene
   `lehren/vX.md` — Gates/Konventionen/Fehler/Owner-Entscheide dieser Version,
   je mit Beleg. Das ist Selbstanwendung: die Lernschleife wendet ihre eigene
   Regel zuerst auf sich selbst an.

## Unterschied zu Kosmos eigenem Journal

Kosmos Lernjournal (`packages/kosmo-ai/src/memory.ts`, `toPromptBlock()`) wird
**technisch** in jeden Systemprompt eingebaut, weil Kosmos LLM-Kontext pro Zug
neu zusammengesetzt wird. Die Claude-Lehren-Schleife braucht diesen
Auto-Inject nicht — sie ist eine Datei, die gelesen wird, kein Laufzeit-Block.
Beide Mechanismen bleiben bewusst getrennt (`docs/CLAUDE-LERNSCHLEIFE.md` §2).

## Anwendung

Sitzungsbeginn: `ls wissen/training/claude/lehren/`, die letzten 2–3 Dateien
lesen. Sitzungsende einer Version: eigene `vX.md` schreiben, VOR dem
Release-Commit, mit Beleg je Zeile.
