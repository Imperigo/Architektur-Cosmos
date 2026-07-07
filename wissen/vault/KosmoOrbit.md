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

- **Stand:** V1 fertig (04.07.2026), **V2 läuft** — siehe `kosmo-orbit/ROADMAP.md` (bis Eintrag 148).
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
- **Laptop-Test-Befunde abgearbeitet** ✅ (ROADMAP 138–148,
  `kosmo-orbit/docs/V1-TESTBEFUNDE-LAPTOP.md`): 2D-Plan-Interaktion
  (Anwählen/Verschieben/Doppelklick), Render-Bugs (3D-Wände/Treppe/Wandecke/
  Betontextur), ArchiCAD-Zeichenhilfen (Ortho/Fluchtlinien/Nav-Leiste/
  Shortcuts), KosmoVis-Crash + Publikations-Set, Pop-up-Überlauf, Referenz-3D-
  Import, projektabhängige Berechnungsliste, **Oberflächen-Systematik**
  (drei Familien + Fokus-Konzept + Projekt-Menü), **freies Skizzieren**
  (Batch-Commit, feiner Stift, im 3D), **Cloud-Abo-Login** («Mit Claude
  anmelden», Desktop), **Splat aus Video** (lokal konvertieren/anzeigen +
  ehrlicher Video→Splat-Weg nach Tempo). Alles grün (103 E2E), gepusht.
- **Geparkt für V2-Endprodukt:** Serie E (Erlebnis-/Animationskonzept,
  drei Profile), Serie F (Rollenprofile + neue Abteilungen, Erfahrungsstufen
  simple/ausgewogen/experte), **Serie G (Kosmo als Benutzer-Guide** — führt vom
  Erstkontakt bis zum Experten, `kosmo-orbit/docs/SERIE-G-KOSMO-ALS-BENUTZERGUIDE.md`).
- **Serie I — Cybersecurity / Anti-Copy / Firewall** ✅ **abgeschlossen (07.07.2026,
  ROADMAP 156–164):** Fable-Chefdenker-Bauplan (`docs/SERIE-I-BUILDPLAN.md`) →
  9 Batches, je grün getestet (E2E 111/111) und gepusht. B1 Leak-Gate · B2
  Secret-Scan+CSP+Tauri-Allowlist · B3 Sync-Härtung · B4 Bridge-Bugs · B5
  Anti-Copy-Fingerprint · B6 signierte Lizenz + **Server-Bindung** (der einzige
  wirksame Anti-Copy-Hebel, `@kosmo/lizenz` Ed25519) · B7 Parser-Robustheit ·
  B8 Firewall-Konzept · B9 Sicherheits-Logging + Incident-Playbook. Rein
  defensiv, «so hart wie sinnvoll»; 5 reale Bugs nebenbei gefixt. Ehrliche
  Grenzen dokumentiert (TLS/Firewall = HomeStation, signierte Updates/Backup =
  Owner-Infrastruktur).
- **Noch offen für den Fable-Block:** **Serie H** (Vollständige Benutzersimulation,
  `docs/SERIE-H-VOLLSIMULATION.md`), **Serie J** (Intuitive Bedienung & adaptive
  Oberfläche — Touch/Gesten + Maus im 3D + adaptive Zeichnungsoberfläche,
  `docs/SERIE-J-INTUITIVE-BEDIENUNG.md`), dann die technischen V2-Blöcke.
  Reihung: Fable = Chefdenker/Urteil, Opus = Orchestrierung, Sonnet = Ausführung.

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
