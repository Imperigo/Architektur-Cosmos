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
