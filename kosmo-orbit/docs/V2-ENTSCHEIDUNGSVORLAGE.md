# V2-Entscheidungsvorlage — was nach den 3 Wochen zuerst?

> Stand 03.07.2026. V1 ist abgenommen und gemergt; Phase 2 + 3 sind komplett,
> zwei Härtetest-Runden bestanden. Diese Vorlage sammelt ALLE ehrlich offenen
> Fäden — mit Nutzen fürs Büro, Aufwandsschätzung und der Frage, ob die
> HomeStation dafür gebraucht wird. Aufwand in «Blöcken» (ein Block ≈ eine
> meiner Arbeitseinheiten wie bisher; S = 1, M = 2–4, L = 5+).
> Am Ende steht meine Empfehlung — entscheiden tust du.

## A · Entwurfswerkzeug (KosmoDesign/Draw)

| # | Kandidat | Nutzen | Aufwand | HomeStation? |
|---|---|---|---|---|
| A1 | **Mehrfach-Wandknoten** (3+ Wände an einem Punkt sauber verschnitten; heute stumpf) | jeden Tag sichtbar, Plan- und 3D-Qualität | M | nein |
| A2 | **Treppen-Ausbau** (Podest, gewendelt, U-Lauf; heute gerade Läufe) | Wettbewerb braucht selten mehr, Ausführung schon | M–L | nein |
| A3 | **Stützenraster ins Modell** (Grid-Achsen zeichnen, Raster-Assistent → Achsen erzeugen, Fang darauf) | schliesst den Raster-Assistenten an die Zeichnung an | M | nein |
| A4 | **IFC-Import editierbar** (heute Kontext-Layer; Wände/Decken erkennen → Entities) | Bestandsumbauten, fremde Modelle weiterzeichnen | L (Erkennungs-Heuristik) | nein |
| A5 | **Bemassungs-Stile** (innen/aussen-Ketten wählen, Höhenkoten, Stil-Presets) | Werkplan-Reife der Pläne | M | nein |
| A6 | **NPK-nahes Ausmass** (Mengenauszug → Leibungen, Abzugsregeln, Export) | Devis-Anschluss | L | nein |

## B · Kosmo & Lernen

| # | Kandidat | Nutzen | Aufwand | HomeStation? |
|---|---|---|---|---|
| B1 | **RAG-Ausbau** (Wissensbasis-Zitate mit Quellensprung, Dossier+Journal+Wissen in einem Abruf-Index) | Kosmo antwortet belegt statt auswendig | M | Embeddings via Bridge (fake geht) |
| B2 | **LoRA-Zyklus REAL fahren** (erster Trainingslauf mit deinem Journal) | «das System lernt DICH» wird wahr | S hier + Stunden 5090 | **ja** |
| B3 | **Anthropic/LM-Studio-Provider** (Q5-Nachrüstung: Cloud-Modell als Option) | stärkeres Tool-Calling, wenn gewünscht | S | nein (API-Key) |
| B4 | **Kosmo-Aktionsketten** (mehrere Tool-Calls pro Vorschlag als EIN Diff-Paket: «zeichne das Haus») | grössere Sprünge pro Anweisung | M | nein |

## C · Visualisierung & Publish

| # | Kandidat | Nutzen | Aufwand | HomeStation? |
|---|---|---|---|---|
| C1 | **Render-Bildslots im Plakat** (KosmoVis-Ergebnis → Blatt, Bild als Blatt-Bürger) | Plakat wird komplett | M | echte Bilder ja, Slots nein |
| C2 | **Texturen/Materialkarten** (PBR-Maps aus KosmoAsset in den Viewport) | 3D wirkt materiell | M | Maps von der HomeStation |
| C3 | **Echtes Gaussian-Splatting im Viewport** (heute Punktwolke) | Kontext fotoreal | L, GPU-abhängig | teilweise |
| C4 | **Plan-Schraffuren nach SIA-Material** (Poché je Material im Schnitt) | Werkplan-Lesbarkeit | M | nein |

## D · Plattform & Betrieb

| # | Kandidat | Nutzen | Aufwand | HomeStation? |
|---|---|---|---|---|
| D1 | **Desktop-Auto-Update** (Tauri-Updater + signierte Releases) | Installieren einmal, aktuell für immer | M (braucht Signatur-Keys) | nein |
| D2 | **HomeStation-Testlauf-Protokoll** (Drehbuch fahren, Befunde fixen) | macht alles Echte scharf | S–M | **ja — der erste Schritt überhaupt** |
| D3 | **iOS aufs Gerät** (Signierung, TestFlight) | KosmoOrbit nativ auf dem iPad | S hier + dein Apple-Konto | dein Mac |
| D4 | **Sync-Betriebshärte** (Token-Pflicht, Raum-Verwaltung, Offline-Warteschlange) | Bürobetrieb mit 2+ Leuten | M | Server läuft dort |

## E · Die grosse Vision (bewusst später)

| # | Kandidat | Warum später |
|---|---|---|
| E1 | **KosmoAR** (Gesten, Raum-Modellieren) | braucht Gerät + Reifegrad; Vision sagt selbst «später» |
| E2 | **OS-Übernahme** (Kosmo empfängt dich am Morgen, Q31) | V2-Entscheid des Mandats; sicherheitskritisch, eigenes Projekt |
| E3 | **Mehr-Büro-Betrieb** (Mandanten, Rechte) | erst wenn der Ein-Büro-Betrieb gelebt ist |

## Meine Empfehlung (Reihenfolge)

1. **D2 — HomeStation-Testlauf** sobald du zurück bist: Er macht Whisper, Piper,
   echte Renders, OneDrive und B2 gleichzeitig scharf. Alles andere unten kann
   ich vorher bauen.
2. **A1 — Mehrfach-Wandknoten**: der sichtbarste tägliche Qualitätsgewinn im
   Werkzeug, rein container-machbar. Nehme ich als nächsten Bau-Block.
3. **B4 — Kosmo-Aktionsketten**: macht Speak-to-Kosmo wirklich mächtig
   («zeichne ein 8×12-Haus mit Walmdach» = ein gated Paket).
4. **C1 + C4 — Plakat-Bildslots + SIA-Schraffuren**: Publish auf Abgabe-Niveau;
   Bildslots sind vorbereitbar, bevor echte Renders da sind.
5. **B1 — RAG-Ausbau**, danach **B2 — erster LoRA-Lauf** (mit D2 zusammen).

Nicht empfohlen jetzt: A6 (NPK) und C3 (Splatting) — grosser Aufwand, Nutzen
erst nach dem Praxis-Testlauf beurteilbar; E1–E3 bleiben Vision, bis V2-Kern
im Büro gelebt hat.
