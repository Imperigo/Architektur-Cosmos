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

- **Stand:** V1 fertig (04.07.2026), **V2 läuft** — siehe `kosmo-orbit/ROADMAP.md` (bis Eintrag 136).
- **Handbuch:** `kosmo-orbit/abgabe/HANDBUCH-KOSMOORBIT-V1.pdf` (28 Seiten, echte Screenshots).
- **Installation:** `kosmo-orbit/docs/INSTALL.md` (Linux/macOS/Windows/iPad).
- **⬇ Windows herunterladen (Cloud-Edition, Claude/Opus 4.8):**
  <https://github.com/Imperigo/Architektur-Cosmos/releases/download/desktop-latest/KosmoOrbit-cloud-windows-setup.exe>
  (Release `desktop-latest`, unsigniert → SmartScreen einmal «Trotzdem ausführen»).
- **Weiterentwicklung V2:** `kosmo-orbit/docs/V2-AUFTAKT.md` (Erst-Prompt für den neuen Worker).
- **⚑ Modell-Guideline (verbindlich):** `kosmo-orbit/docs/KI-MODELL-GUIDELINE.md` — Fable = Urteil, Opus = Orchestrierung, Sonnet = Ausführung; lokal als Kosmo-Meister / Kosmo-Leiter / Kosmo-Zeichner.

## V2-Fortschritt (Stand 05.07.2026)

- **Serie B — Betriebsarten** ✅ (ROADMAP 125–126): Standard (HomePC) · Remote
  (VPN) · Cloud (Claude, min. Opus 4.8), Cloud-Fallback bei HomeStation-Ausfall,
  Setup-Assistent «Werkzeuge», drei Installer-Editionen.
- **Serie C — Codex-Übernahme** ✅ (ROADMAP 127–132): KosmoReference + KosmoAsset
  als volle Stationen, **ein System**, KosmoOrbit = Master, Website = veröffentlichte
  Teilmenge (public/privat), Ref↔Asset-Verknüpfung.
- **Serie D — KosmoData wird das Wissens-/Gedächtnis-/Trainings-Dach:**
  D1 Fundament (fünf Sammlungen unter ein Dach + `visibility`) ✅ ·
  D2 **Wissen**-Tab ✅ · D3 **Training** in zwei Achsen (Architektur +
  Software-Selbstwissen, LoRA-JSONL-Export) ✅ · D4 **Gedächtnis** als
  Memory-Timeline ✅ · D5 **HomePC-HDD-Archiv** (sechste Sammlung) — läuft.
  → Jede Sammlung hat jetzt einen eigenen KosmoData-Tab.
- **Geparkt für V2-Endprodukt:** Serie E (Erlebnis-/Animationskonzept,
  drei Profile), Serie F (Rollenprofile + neue Abteilungen, Erfahrungsstufen
  simple/ausgewogen/experte), **Serie G (Kosmo als Benutzer-Guide** — führt vom
  Erstkontakt bis zum Experten, `kosmo-orbit/docs/SERIE-G-KOSMO-ALS-BENUTZERGUIDE.md`).

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
