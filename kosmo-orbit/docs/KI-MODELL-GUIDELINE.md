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

**Status (v0.8.1 / KI4, `docs/V081-SPEZ.md` §3+§7 Kandidat 1): gebaut.** Die
Rollen→Modell-Karte + Aufgaben-Klassifikation aus diesem Teil C sind jetzt
eine echte, containertestbare Abstraktion in
`packages/kosmo-ai/src/staffelung.ts` — nicht mehr nur Design:

- **`KosmoRolle`** (`staffelung.ts:54`) — `'meister' | 'leiter' | 'zeichner'`,
  wörtlich die drei Stufen dieser Tabelle.
- **`STANDARD_ROLLEN_MODELL_KARTE`** (`staffelung.ts:82-93`) — die
  Vorschlags-Modelle dieser Tabelle (lokal: `qwen3:72b`/`qwen3:30b`/
  `qwen3-coder:30b`) plus die Cloud-Seite (Teil B): Meister UND Leiter auf dem
  Opus-Boden (`CLOUD_MODELL_MIN`, `betrieb.ts:37`), Zeichner auf
  `claude-sonnet-5` — kein erfundener dritter Cloud-Tier, da im Repo keine
  eigene «Fable»-Cloud-Modell-Konstante existiert.
- **`Aufgabenklasse`** (`staffelung.ts:129-146`) — sieben aus dem
  *bestehenden* `kosmo-ai`-Code abgeleitete Klassen (nicht erfunden), je mit
  Fundstelle+Begründung im Code (`staffelung.ts:95-127`):
  `werkzeug-schreibend`/`strategie-urteil` → Meister, `orchestrierung`/
  `chat-standard` → Leiter, `werkzeug-lesend`/`zusammenfassung`/`journal` →
  Zeichner.
- **`waehleModellFuerRolle`/`waehleModellFuerAufgabe`** (`staffelung.ts:204-
  228`) — reine Auswahlfunktionen; Cloud-Meister/-Leiter bleiben über
  `mindestensOpus` (`betrieb.ts:149-152`) mindestens-Opus-gesichert, exakt die
  bestehende Owner-Garantie, hier nur wiederverwendet.
- **Ehrlicher Fallback** (`staffelung.ts:161-169`, `einzelModell`): ist nur
  EIN Modell konfiguriert (der Stand vor KI4), spielen alle drei Rollen
  dieses eine Modell — additiv, kein Bruch der bisherigen Ein-Modell-API.
  **Ein-GPU-Fall** (`lokalEinGpuModell`, `staffelung.ts:178-189`): Leiter und
  Zeichner teilen sich ein Modell, der Meister bleibt eigenständig — wörtlich
  die Ein-GPU-Regel oben.
- **Tests:** `packages/kosmo-ai/test/staffelung.test.ts` (25 Tests) — Mapping,
  Fallback-Ketten, Opus-Garantie, Ein-GPU-Fall, `OllamaConfig`/
  `AnthropicConfig`-Bau.

**Deklarierte HomeStation-Grenze (Owner-Entscheid 6, keine Attrappe):** was
hier NICHT gebaut ist — echte Multi-Modell-Verifikation, also mehrere reale
lokale Modelle GLEICHZEITIG geladen und im tatsächlichen Ollama-Betrieb
gegeneinander gemessen (Speicherbedarf, Ladezeiten, echte Tool-Calling-Güte
je Modellgrösse). Das braucht die RTX-5090-HomeStation und ist nicht
container-baubar — der Container kennt kein Ollama mit mehreren geladenen
Multi-Gigabyte-Modellen. Container-baubar und real gebaut ist die
Auswahl-Abstraktion selbst (welche Rolle bekommt welches Modell/welchen
Provider).

**Offen (spätere App-Anbindung, nicht Teil dieses Pakets):** `KosmoPanel`/
`ChatSession` (App-Schicht, `apps/kosmo-orbit`) wählen weiterhin EIN
Provider+Modell für die ganze Sitzung und rufen `staffelung.ts` noch nicht
auf — die Verdrahtung «welche Aufgabenklasse feuert wann, wann wechselt
`ChatSession` den Provider» ist ein eigenes, späteres Paket.

### C-42 — LoRA-Export-Pipeline geschlossen (`docs/V081-SPEZ.md` §3 Kandidat 7)

**Status: gebaut.** `LearningJournal.toJsonl()` (`memory.ts:116-118`) hatte
bis dahin keinen Abnehmer — das im Kopfkommentar des Journals versprochene
«später der Trainingsdatensatz für die LoRA-Rezepte auf der HomeStation»
(`memory.ts:5-6`) war unbelegt. Der Export-Pfad ist jetzt in
`packages/kosmo-ai/src/lora-training.ts` geschlossen:

- **`baueLoraDatensatzAusJsonl`/`baueLoraDatensatzAusEintraegen`** —
  Validierung/Aufbereitung: jede Journal-Zeile wird geprüft
  (`sentiment`/`context`/`ts` müssen vorhanden und sinnvoll sein); untaugliche
  Einträge werden ehrlich mit Begründung aussortiert (`AussortierterJournal
  Eintrag.grund`), nie stillschweigend verschluckt — eine kaputte einzelne
  JSONL-Zeile wirft den Rest des Exports nicht weg.
- **`LoraTrainer`-Schnittstelle + `FakeLoraTrainer`** — der Fake-Trainer-Stub
  (Muster «Fake-Bridge», analog `_fake_embed`/`MockProvider`): nimmt den
  Datensatz entgegen, «trainiert» deterministisch (reproduzierbarer
  Fingerabdruck über den Inhalt, KEIN echtes Gewicht, keine GPU) und liefert
  einen ehrlichen Bericht (`fake: true`, Anzahl Beispiele/Aussortierte,
  Klartext-Hinweis).
- **`exportiereUndTrainiere`** — der geschlossene Pfad in einem Aufruf: echtes
  `LearningJournal` → `toJsonl()` → Datensatz → Trainer (Default
  `FakeLoraTrainer`, austauschbar).
- **Tests:** `packages/kosmo-ai/test/lora-training.test.ts` (18 Tests) —
  Validierungs-/Aussortier-Fälle, Determinismus des Fake-Berichts, der
  End-zu-End-Pfad über ein echtes `LearningJournal`.

**Entscheidung gegen einen Bridge-Endpunkt (begründet, s. Kopfkommentar
`lora-training.ts`):** `tools/homestation-bridge/kosmo_bridge/main.py` bietet
zwei Muster (Job-Lebenszyklus `POST /jobs` bzw. einen simplen synchronen
Fake-Endpunkt wie `/embed`) — ein `/lora-train`-Endpunkt hätte zum zweiten
Muster gepasst, hätte aber KEINEN Aufrufer gehabt (nichts in `kosmo-ai`/der
App ruft die Bridge für KI-Aufgaben per HTTP auf, Ollama/Anthropic laufen
direkt aus dem Browser). Ein unbenutzter Endpunkt wäre selbst eine Attrappe
gewesen (Owner-Entscheid 6). Die Guideline verlangt für den Stub ausdrücklich
nur «eine reine Funktion ODER Schnittstelle mit Fake-Implementierung» — genau
das liefert `lora-training.ts`, vollständig containertestbar per Vitest, ohne
einen Python-Prozess. Die `LoraTrainer`-Schnittstelle ist so geschnitten, dass
eine spätere echte HomeStation-Anbindung (ggf. über einen dann wirklich
gebrauchten Bridge-Endpunkt) sie ohne Änderung an der Aufbereitung
implementieren kann.

**Deklarierte HomeStation-Grenze:** echtes LoRA-Fine-Tuning (Gewichte
aktualisieren, GPU-Speicherbedarf, Trainingszeit) braucht die
RTX-5090-HomeStation und ist nicht container-baubar. Container-baubar und
real gebaut: Datensatz-Aufbereitung, Validierung, die Trainer-Schnittstelle
und der deterministische Fake-Stub.

Verknüpft mit `docs/AUFTRAG-FABLE-2026-07-06.md`.

## In einem Satz

Fable fürs Urteil, Opus fürs Führen, Sonnet fürs Machen — lokal als
Kosmo-Meister / Kosmo-Leiter / Kosmo-Zeichner. Das richtige Werkzeug für die
Aufgabe spart ~⅔ Kosten bei gleicher Qualität.
