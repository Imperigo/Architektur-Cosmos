# KI-Modell-Guideline — Modell an die Aufgabe

**Owner-Guideline, 05.07.2026 (Andrin).** Grundlage: Sprach-Memo des Owners
(Instagram-Reel «match the tool to the job»). Diese Datei regelt, **wie wir
Modelle einsetzen** — in diesem Repo/Chat, in KosmoOrbits Claude-Nutzung und in
Kosmos eigenen lokalen LLMs.

## Kernprinzip

Nicht «welches ist das stärkste Modell», sondern **«welches ist das *richtige*
für *diese* Aufgabe»**. Das stärkste Modell ist die richtige Wahl für die
**härtesten ~10–15 %** — nicht für den Rest. Alles andere auf dem Spitzenmodell
laufen zu lassen, ist «Geniuspreise für einen Fotokopierer»: im Memo fielen 4
Tage Spitzenmodell-auf-allem von **2 550 $ auf ~800 $**, als die Arbeit sauber
gestaffelt wurde — bei **gleichem Ergebnis**.

## Die drei Rollen

| Rolle | Claude | Wofür | Anteil |
| --- | --- | --- | --- |
| **Stratege** | **Fable** | Urteil: Positionierung, Architektur-Entscheide, der Bug, den man selbst nicht knackt. Antwort holen → weitergeben. | ~10–15 % |
| **Orchestrator** | **Opus** | Führt die Agenten-Schleife, plant die Ausführung, verteilt, prüft. Braucht **kein** Frontier-Reasoning. | Führung |
| **Ausführer** | **Sonnet** | Baut, editiert, migriert, räumt auf, **inkl. Design** gegen eine bereits geschriebene Spec. | ~85 % |

**Die drei Regeln:**
1. **Sonnet macht die Ausführung — inklusive Design.** Sonnet + Design-Skills =
   identisches Ergebnis wie ein teureres Modell. Teure Modelle malen keine
   schöneren Screens.
2. **Das Spitzenmodell ist nicht der Orchestrator.** Opus orchestriert, Sonnet
   führt aus. Fable im Fahrersitz = riesige Rechnung für Arbeit, die es nicht
   brauchte.
3. **Fable ist Stratege, nicht Arbeiter.** Nur die härtesten 10–15 %: Urteil
   holen, dann von einem anderen Modell ausführen lassen.

**Reihenfolge ist der Hebel:** erst Spec/Plan (Fable/Opus), **dann** Ausführung
(Sonnet). Ohne klare Vorgabe profitiert man doch von einem stärkeren Modell —
also zuerst die Vorgabe schaffen, dann günstig ausführen.

## Ehrliche Einordnung (nicht nachplappern)

Das Memo ist ein Influencer-Clip; ein Detail ist schief: **Cache-Reads sind
nicht teuer, sondern der Sparmechanismus** — wiederholter Kontext wird dadurch
*billiger*. Was wirklich explodiert, ist **viel Kontext × Spitzenpreis × jede
Runde**. Die Lehre (Staffeln + nicht auf dem Spitzenmodell orchestrieren) bleibt
exakt richtig.

---

## Teil A — Claude in diesem Repo / Chat

- **Opus** (dieser Chat) **orchestriert und delegiert.** Reine Ausführung —
  Code schreiben, Tests, Umbauten, Design gegen Spec — geht an **Sonnet-
  Subagenten**. Das Härteste (Architektur, kniffliger Bug) an einen **Fable-
  Subagenten**; dessen Antwort wird dann von Sonnet umgesetzt.
- **Modellwechsel:** Das Modell des Haupt-Chats stellt der Owner (`/model`).
  Die Staffelung läuft über **Delegation** (Subagenten mit `model:`), nicht
  über Umschalten des Chat-Modells.
- Faustregel vor jeder grösseren Aufgabe: *Ist das Urteilsarbeit (Fable),
  Führung (Opus) oder Ausführung (Sonnet)?* — und entsprechend besetzen.

## Teil B — Kosmo nutzt Claude (Cloud)

- Dieselbe Staffelung im Cloud-Modus (`betrieb.ts`). Der **Cloud-Boden bleibt
  Opus 4.8** (Owner-Vorgabe) — das ist die Orchestrator-Stufe.
- **Kosmo wählt die Stufe je Aufgabe automatisch:** Routine-Commands ausführen
  → Sonnet; einen Arbeitsschritt planen/mehrere Commands orchestrieren → Opus;
  echte Entwurfs-/Strategiefrage → Fable. Umsetzung: Rollen→Modell-Abbildung
  im Provider-Aufruf (V2-Build).

## Teil C — Kosmo mit eigenen lokalen LLMs (das lokale «Fable/Opus/Sonnet»)

Kosmo bekommt lokal **dieselbe Drei-Stufen-Staffelung** wie bei Claude, mit
**Kosmo-eigenen Namen, die zur Funktion passen** — vom Owner bestätigt
(05.07.2026). Metapher: das Architekturbüro.

| Kosmo-Stufe | Rolle (= Claude) | Aufgabe | Lokales Modell (Vorschlag, RTX 5090) |
| --- | --- | --- | --- |
| **Kosmo-Meister** | Stratege (Fable) | Härteste 10–15 %: Entwurfsurteil, Architektur, kniffliger Fall. Selten, aber jeden Token wert. | Grösstes verfügbares, z.B. Qwen3-72B / Llama-70B (Q4) |
| **Kosmo-Leiter** | Orchestrator (Opus) | Führt die Command-Schleife, plant, verteilt, prüft. Zuverlässiges Tool-Calling. | Mittel, z.B. Qwen3-30B |
| **Kosmo-Zeichner** | Ausführer (Sonnet) | Der Arbeitspferd: Commands ausführen, editieren, Routine — schnell. | Schlank/schnell, z.B. Qwen3-Coder-30B oder starkes 14B |

- **Funktions-Logik der Namen:** der **Meister** urteilt (wie der
  Chef-/Entwurfsarchitekt), der **Leiter** führt das Projekt (Projektleiter),
  der **Zeichner** setzt um (Bauzeichner). Passt zum Büro und zur Modellrolle.
- **Ein-GPU-Fall:** Wo nur ein Modell in den Speicher passt, dürfen **Leiter
  und Zeichner dasselbe Modell in verschiedenen Rollen** sein; der Meister wird
  bei Bedarf nachgeladen. Ehrlich im UI benennen.
- **Andockung an die Provider-Schicht:** heute wählt `KosmoPanel`/`betrieb.ts`
  *einen* Provider+Modell. V2-Erweiterung: eine **Rollen→Modell-Karte**
  (`meister|leiter|zeichner` → konkretes Ollama-Modell) plus eine
  **Aufgaben-Klassifikation**, die je Command/Anfrage die Stufe zieht — analog
  zur Cloud-Staffelung (Teil B), damit Cloud und Lokal identisch funktionieren.
- **Tool-Calling-Hinweis:** kleine Modelle rufen Commands unzuverlässiger auf.
  Deshalb sitzt die **Orchestrierung (Leiter) nie auf dem kleinsten Modell**;
  der Zeichner braucht mindestens solides Function-Calling.

**Status:** Teil C ist **Design**, noch nicht gebaut. Umsetzung als V2-Build —
nach unserer eigenen Guideline: Fable legt den Plan/Entwurf, Opus orchestriert
die Batches, Sonnet baut. Verknüpft mit `docs/AUFTRAG-FABLE-2026-07-06.md`.

## In einem Satz

Fable fürs Urteil, Opus fürs Führen, Sonnet fürs Machen — lokal als
Kosmo-Meister / Kosmo-Leiter / Kosmo-Zeichner. Das richtige Werkzeug für die
Aufgabe spart ~⅔ Kosten bei gleicher Qualität.
