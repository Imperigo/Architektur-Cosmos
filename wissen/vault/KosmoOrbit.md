---
tags: [kosmoorbit, software, uebergabe]
erstellt: 2026-07-04
---

# KosmoOrbit — die Architektur-Designzentrale

Diese Notiz verbindet das Bau- und Entwurfswissen dieses Vaults mit der
Software, die daraus lernt. Der Vault ist zweierlei zugleich: Nachschlagewerk
für den Menschen **und** Trainingskorpus für Kosmo (die Büro-LLM).

## Was ist KosmoOrbit

Ein lokal-first Büro-Betriebssystem für Architektur (Monorepo `kosmo-orbit/`):
zehn Stationen (Design, Vis, Data, Asset, Dev, Publish, Prepare, Doc, Train,
plus Draw/Sketch/Speak als Deep-Links), ein BIM-Kern mit Command-Pattern, und
Kosmo — eine KI, die jedes Command als Werkzeug hat und nie ungefragt schreibt.

- **Stand:** V1 fertig (04.07.2026). Siehe `kosmo-orbit/ROADMAP.md` (123 Einträge).
- **Handbuch:** `kosmo-orbit/abgabe/HANDBUCH-KOSMOORBIT-V1.pdf` (28 Seiten, echte Screenshots).
- **Installation:** `kosmo-orbit/docs/INSTALL.md` (Linux/macOS/Windows/iPad).
- **Weiterentwicklung V2:** `kosmo-orbit/docs/V2-AUFTAKT.md` (Erst-Prompt für den neuen Worker).
- **⚑ Nächster Auftrag (ab 06.07.2026, Fable 5):** `kosmo-orbit/docs/AUFTRAG-FABLE-2026-07-06.md` — Übernahme der Codex-Aufgabe: KosmoReference + KosmoAsset fertig bauen (wie KosmoData) plus Website www.architekturkosmos.ch, in zwei Tagen.
- **⚑ Modell-Guideline (verbindlich):** `kosmo-orbit/docs/KI-MODELL-GUIDELINE.md` — Fable = Urteil, Opus = Orchestrierung, Sonnet = Ausführung; lokal als Kosmo-Meister / Kosmo-Leiter / Kosmo-Zeichner.

## Wie der Vault mit der Software spricht

- **KosmoPrepare** nimmt Grundlagen (Normen-Auszüge, Programme, Baubeschriebe)
  auf und macht sie für Kosmo belegbar durchsuchbar (BM25 + Embeddings).
- **KosmoData** hält die 112 Referenzbauten; **KosmoTrain** kuratiert das
  Lernjournal — den JSONL-Datensatz für die Büro-LoRA an der HomeStation.
- Die Lehrhefte hier (Baugrund, Bausysteme, Deckenkonstruktionen, …) sind der
  Bau-Fachkorpus, aus dem Kosmo Fachwissen zieht.

## Verwandte Notizen

- [[Deckenkonstruktionen]] · [[Bausysteme]] · [[Baugrund-und-Baugrube]]
- Persona-Korpus «Golden Rules Andrin» → prägt Kosmos Ton und Do's/Don'ts.

> Alles Weitere lebt im Repo. Dieser Vault ist die Wissensseite; das Repo ist
> die Software-Seite — beide gehören zusammen an die HomeStation.
