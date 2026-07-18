---
name: orchestrierung
description: Wie ein Paket in KosmoOrbit besetzt wird — Fable (Urteil) / Opus (Führung) / Sonnet (Ausführung), nie das Spitzenmodell im Fahrersitz. Nutzen, bevor ein Bauagent oder Subagent für ein neues Paket eingesetzt wird.
---

*Adaptiert aus `shanraisshan/claude-code-best-practice` (MIT) — Kernidee dort:
Command → Agent → Skill, drei getrennte Rollen statt eines Modells, das alles
selbst tippt. Details/Attribution: `.claude/skills/QUELLEN.md`.*

## Kernregel (KosmoOrbit-Fassung)

Nicht «welches Modell ist am stärksten», sondern **«welche Rolle braucht diese
Aufgabe»** (`docs/KI-MODELL-GUIDELINE.md`, Owner-Guideline 05.07.2026):

| Rolle | Claude-Seite | Kosmo-Seite (lokal) | Aufgabe |
| --- | --- | --- | --- |
| Stratege | **Fable** | Kosmo-Meister | Urteil: Architektur-Entscheide, der Bug, den man selbst nicht knackt. Nur ~10–15 %. |
| Orchestrator | **Opus** | Kosmo-Leiter | Führt die Paket-Schleife, plant, verteilt, prüft. Kein Frontier-Reasoning nötig. |
| Ausführer | **Sonnet** | Kosmo-Zeichner | Baut, editiert, migriert — **inkl. Design gegen eine bereits geschriebene Spec.** ~85 %. |

**Die eine Regel, die zählt:** das Spitzenmodell orchestriert nie sich selbst.
Fable liefert ein Urteil und gibt es weiter; Opus verteilt Pakete an
Sonnet-Bauagenten (dieses Repo nennt sie «Bauagent P1», «Bauagent P2», …,
genau der Command→Agent-Schritt aus der Quelle); die eigentliche
Datei-Arbeit — inklusive Tests und E2E — läuft auf Sonnet.

## Anwendung in diesem Repo

1. **Vor jedem neuen Paket** (Wxx/Pxx-Nummer) fragen: Ist das Urteilsarbeit
   (Fable), Führung (Opus) oder Ausführung (Sonnet)? Reine Umsetzung gegen eine
   fertige `docs/V0xx-SPEZ.md` ist fast immer Sonnet-Fall.
2. **Ein Bauagent-Auftrag ist die Skill-Ebene der Quelle** — Fable/Opus
   formuliert den Auftrag mit exaktem Dateikreis (s. Skill `parallel-pakete`)
   und eingefrorener Signatur (Muster: `docs/V083-SPEZ.md` §5.4, die
   `skillBlock()`-Signatur wurde in P0 eingefroren, damit P1 sie nur noch
   ausführt, nicht neu verhandelt).
3. **Reihenfolge ist der Hebel:** erst Spec (Fable/Opus), dann Ausführung
   (Sonnet) — nie umgekehrt. Ein Bauagent, der ohne verbindliche Spez anfängt,
   verhandelt Architektur nebenbei mit — das ist der teure Fehler, den die
   Staffelung vermeiden soll.
4. **Kosmo selbst spiegelt dieselbe Staffelung** (`packages/kosmo-ai/src/staffelung.ts`):
   Routine-Commands → Kosmo-Zeichner, ein Arbeitsschritt planen → Kosmo-Leiter,
   eine echte Entwurfsfrage → Kosmo-Meister. Wer an der App-Seite der
   Rollen-Zuordnung baut, orientiert sich an genau dieser Tabelle.
