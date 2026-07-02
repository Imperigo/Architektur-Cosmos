# Kosmo-Tagesbericht 2026-07-02 — Fable-Session 1 (KosmoOrbit V1)

> Erster Bautag des V1-Snapshots. Auftrag + 32 Owner-Entscheide erfasst, 10 Research-Agenten
> (Tech-Radar adversarial verifiziert), dann Kernbau. Alles gepusht auf
> `claude/kosmo-orbit-v1-build-pzxkbj`. Website/main unberührt.

## Bilanz

- **12 Commits**, jeder Stand visuell getestet (Playwright/SwiftShader) + Screenshots an Owner.
- **18 Tests grün** (14 Kernel + 3 KI + Contracts), Typecheck strict über alle Pakete.
- 6 Pakete + App + Bridge + CI aus dem Nichts: `kosmo-ui`, `kosmo-contracts`, `kosmo-kernel`,
  `kosmo-ai`, App-Shell, `homestation-bridge`.

## Was heute entstand (Owner-Sicht)

1. **Aura-Design** — Papier/Tinte-Themes, Kupfer-Akzent, Orbital-Logo-System, Modul-Farbtöne.
2. **BIM-Kern** — Geschosse, Wände mit Schichtaufbauten, Decken, Fenster/Türen mit Leibungen,
   Zonen, Volumenkörper; Command-System mit Undo/Journal (jeder Command = Kosmo-Werkzeug).
3. **Lebende Pläne** — Grundriss (SIA-Schraffuren, Fenstersymbole, Türschwenks, Poché-Verschmelzung),
   Schnitt (Mesh-Slice), Ansicht Süd (auto) — **4er-Splitscreen synchron** (die Vision-Ansicht).
4. **Kosmo lebt** — Chat mit gatetem Tool-Calling (Vorschlagskarten → Anwenden/Ablehnen → Undo),
   Personas (@kosmodoc …), Begrüssung, Ollama-Anschluss (URL/Modell einstellbar) + Demo-Modus.
5. **Kennzahlen live** — deine Methodik: HNF/NNF/VF/FF/KF → NGF → aGF-Ziel (×1.28) →
   GF-Schätzung (×1.10) + GF aus Volumenstudien nach Nutzung.
6. **Render-Loop geschlossen** — GLB-Export → Kosmo-Bridge (FastAPI; schreibt exakt dein
   Job-Store-Format mit approval_token + idle_window_only) → Ergebnis mit Doppel-QA-Verdikt
   in der App. `--fake-worker` für Tests; auf der HomeStation übernimmt dein Scheduler.
7. **KosmoSketch** — Freihand (Pencil-Druckstufen, 240 Hz) → Wände erkannt → gated übernommen.
8. **KosmoSpeak** — Push-to-Talk an Bridge-Whisper (CH-Modell `jayr23/...swiss-german-ct2` konfiguriert).
9. **Projekte** — Speichern/Öffnen als `.kosmo`-Paket (Zip mit Manifest/Modell/Journal);
   **TKB Hönggerberg** als Beispielprojekt (7 Geschosse, NGF exakt 2814 m² — dein Wettbewerbsprogramm).
10. **Plansatz-Export** — Grundriss als Vektor-PDF (A3, 1:100, Plankopf) + SVG.
11. **Auslieferung** — PWA (iPad-installierbar, Icons, Offline-SW), Tauri-2-Scaffold +
    CI-Workflows (Tests bei jedem Push; Desktop-Matrix mac/win/linux manuell/Tag).

## Ehrlichkeiten / Offen

- Wand-Junctions im 3D-Mesh noch ungefügt (im Plan via Union bereits sauber); Schraffur-Pattern
  fehlen im PDF-Export (svg2pdf-Pattern-Support prüfen).
- Schnitt/Ansicht ohne echte Verdeckung (three-edge-projection als Politur geplant).
- Bemassung, Walmdach (eigener Skeleton!), Treppe, Kosmo-Memory/RAG, IFC-Roundtrip,
  KosmoData-Browser, Yjs-Live-Sync, OneDrive: siehe ROADMAP-Reihenfolge.
- Ollama/Whisper/echtes Rendern konnten hier nicht gegen die HomeStation getestet werden —
  erster gemeinsamer Testlauf mit dem Owner nötig (Bridge-README liegt bei).

## Nächster Block

Bemassungsketten → Kosmo-Memory + Feedback-Daumen → IFC-Export → KosmoData-Sync →
Yjs-Sync → Politur-/Visualtestrunde. Reihenfolge in ROADMAP.md, dynamisch.

---

## Nachtrag Nachmittag (gleiche Session, langer Block)

Alles Obige aus «Offen» ist inzwischen weitgehend abgearbeitet. Neu heute Nachmittag:

1. **IFC-Roundtrip geschlossen** — Import via web-ifc als grauer Kontext-Layer
   (Bestand = Referenz, nicht editierbar). Dabei ernsten Bug gefunden und behoben:
   web-ifc tesselliert bereits in Meter/y-oben — die mm-Annahme liess den Bestand
   auf 9 mm kollabieren.
2. **KosmoPublish fertig (Q30)** — Blatteditor: Sheet als Kernel-Entity (Undo/Sync/.kosmo
   inklusive), Grundriss + Schnitt platzieren/ziehen, Plansatz-PDF mehrseitig im echten
   Blattformat (A0–A4), Blatt-SVG, **DXF-Export** (ezdxf-Orakel: 0 Fehler, semantische Layer).
3. **KosmoPrepare lebt (Q28)** — Grundlagen-Ingestion (PDF/Text/MD → Wissensbasis in
   IndexedDB, alles lokal), Suche mit Quellenangabe, Kosmo-Tool «grundlagen_suchen»,
   **OneDrive/Graph-Login** (MSAL/PKCE; Owner trägt nur die Azure-Client-ID ein —
   gegen echten Tenant hier nicht testbar, Fehlerpfade geprüft). Alle 5 Module aktiv.
4. **3D-Wandknoten** — Ecken auf Gehrung (Winkelhalbierende, exakt); Tests decken
   L-Ecke und freies Ende.
5. **Splat-Kontext-Layer** — .splat/.ply (LingBot-Map/gsplat-Kette) als Punktwolke im
   Viewport; eigener leichter Renderer (iPad-tauglich), echtes Gaussian-Splatting bleibt
   auf der 5090. Fertige Bibliothek evaluiert und verworfen (Renderer-Kollision, GPL-frei).
6. **Treppe** (gerade Lauftreppe, Schrittmassregel, Grundriss-Symbol mit Lauflinie) —
   bereits am Mittag committet.
7. **CI** — KosmoOrbit-CI grün (Typecheck + 33 Tests + Build). Ehrlichkeit: der
   Website-CI (`ci.yml`, security:check) ist **auch auf main rot** (vorbestehend,
   docs/codex-Altlasten) — Website-Lane, von mir bewusst nicht angefasst; main wurde
   in den Branch gemergt, kosmo-orbit/ blieb unberührt.

**Stand:** 20 Commits, 33 Tests grün, alle fünf Module bedienbar. Offen laut ROADMAP:
Embedding-RAG, KosmoDoc-Diagnosepanel, CH-Bauteilkatalog, Onboarding/cmdk-Politur,
Desktop-Build-Verifikation via tauri-action.


## Nachtrag Abend

- **Desktop-Builds komplett:** macOS universal (.dmg), Linux (AppImage/deb/rpm),
  Windows (MSI/EXE) bauen aus der CI — drei Fixes (Icon-Pfad, PostCSS-Isolation,
  Icon-Satz). Auslösen: `kosmo-orbit/.desktop-build-request` ändern+pushen.
- **Kosmo spricht (Q7):** Bridge `/tts` (Piper/Chatterbox) + «Antworten vorlesen»-
  Schalter; End-to-End mit Fake-Stimme verifiziert. Bridge-Bug behoben
  (FAKE_WORKER wurde nie gesetzt) und React-Batching-Falle beim Vorlesetext.
- **Embedding-RAG (Q8):** Bridge `/embed` (bge-m3); Wissensbasis-Chunks werden
  beim Aufnehmen eingebettet, Suche mischt Cosine + Stichworte, fällt ohne
  Bridge sauber zurück.
- **Onboarding (Q31):** zeitabhängiger Tagesgruss + Erste-Schritte-Karte.
- **Web-Worker:** Ableitung grosser Modelle (>300 Elemente) off-thread,
  404-Wände-Test bestanden; kleine Modelle bleiben synchron-deterministisch.
- E2E-Suite (6 Tests) committet und in der CI; einziger offener ROADMAP-Punkt:
  echte Hidden-Line im Schnitt (V2-Kür).

## Nachtrag Spätabend — Roadmap fertig

- **Visuelle Gesamtrunde:** 10 frische Screenshots aller fünf Module + Zentrale
  (Papier und Tinte) als Galerie an den Owner. Zwei Nits daraus sofort gefixt:
  der Grundriss passt sich beim Öffnen jetzt einmal auf den Modellinhalt ein
  (geladene Projekte wirkten vorher «leer»), und native Slider/Checkboxen laufen
  im Kupfer-Akzent statt Browser-Blau. Reproduzierbar: `e2e/tools/galerie.mjs`.
- **Hidden-Line im Schnitt (letzter Kür-Punkt):** eigene Verdeckungsrechnung im
  Kern — jede Projektionskante wird als Intervall parametrisiert und die von
  davorliegenden Dreiecken abgedeckten Teilintervalle werden abgezogen (alle
  Bedingungen linear in u: drei Kantenseiten, Sichthalbraum, Tiefenvergleich
  mit 5-mm-Epsilon gegen die eigene Fläche). Bounding-Box-Frühverwerfung;
  ehrlicher Fallback auf ungerechnete Kanten ab 40 Mio Kanten×Dreiecks-Paaren.
  Zwei Kernel-Tests + Vorher/Nachher-Beleg (`e2e/tools/hiddenline-beleg.mts`):
  der Quertrakt hinterm Walmdach-Haus verschwindet korrekt, doppelte
  Wand-Rückkanten sind weg. KosmoPublish-Ansichten profitieren automatisch.
- Suiten: 30 Kernel + 3 KI + 5 Contracts + 3 App + 6 E2E grün; Typecheck sauber.
- **Damit ist die gesamte V1+Phase-2-Roadmap abgearbeitet.** Offen ist nur noch
  HomeStation-Gebundenes (echte Renders, Whisper, Piper-Stimme, OneDrive-Tenant,
  LoRA-Zyklus) — wartet auf den Owner.

## Nachtrag Nacht — Absicherung und Abnahme-Vorbereitung

- CI grün auf dem Roadmap-Endstand (Unit + Golden + E2E).
- **Golden-Ansicht:** die Hidden-Line-Ansicht des Testhauses ist jetzt als
  byte-identische Golden-Datei im Kernel-Test verankert; Fixture und Generator
  (`e2e/tools/golden-ansicht.mts`) teilen denselben Code.
- **Budget-Test (Risiko R2):** 500 Wände mit echten Ecken/T-Stössen —
  deriveAll lokal ~100 ms (Budget 2 s), Hidden-Line-Ansicht ~660 ms bei
  24 Mio Kanten×Dreiecks-Paaren (Budget 5 s). 32 Kernel-Tests grün.
- **In-App-Verifikation:** Publish-Blatt mit Ansicht Süd gegen den frischen
  Build — die Verdeckungsrechnung wirkt auch im Blatteditor (Quertrakt
  verschwindet hinterm Haus, Deckenstapel zeigen nur Vorderkanten).
- **docs/ABNAHME-DREHBUCH.md:** der Q26-Loop Schritt für Schritt mit ehrlicher
  Stand-Spalte — die Anleitung für den Abnahme-Tag.
- Installer-Neubau angestossen (Desktop alle drei Plattformen + iOS-Simulator)
  auf dem Endstand.
