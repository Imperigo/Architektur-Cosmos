# KosmoOrbit V1 — Lebende Roadmap

> **Fortsetzungsanker.** Jede Session (Mensch oder KI) liest diese Datei und macht beim
> obersten offenen Punkt weiter. Stand wird nach jedem Arbeitsblock aktualisiert.
> Owner-Auftrag + 32 Entscheide: siehe `docs/OWNER-MANDAT.md`. Tech-Entscheide: `docs/TECH-RADAR.md`.

**Abnahme-Kriterium V1 (Owner Q26):** Projekt öffnen → modellieren (Maus + Skizze + Sprache + Chat)
→ SIA-Pläne live im Splitscreen → Flächenreport → IFC-Export → Render-Job an HomeStation →
QA-Verdikt zurück → iPad synchron.

## Stand (2026-07-02, Session 1)

| Meilenstein | Status | Notizen |
|---|---|---|
| M0 Gerüst (Workspace, Aura, Shell) | 🟢 90% | CI/Tauri/PWA in Arbeit (dieser Block) |
| M1 BIM-Kern + Viewport + Werkzeuge | 🟢 done (v1-Kern) | 11 Tests grün; Junction-Politur später |
| M2 2D-Pläne + Splitscreen | 🟢 95% | + Bemassung ✅, Walmdach ✅ (eigener Skeleton), Auswahl+Inspector ✅, Treppe ✅ |
| M3 Kosmo-KI | 🟢 85% | Gated Loop + Personas + Begrüssung + Ollama/Mock; offen: Memory/RAG, Journal-Feedback-UI |
| M4 KosmoData | 🟡 60% | Offline-Seed + Browser + Kosmo-Tool ✅; offen: CH-Bauteilkatalog, Referenz-3D |
| M5 Vis/Publish/IFC + Bridge | 🟢 90% | Render-Loop ✅, IFC-Roundtrip ✅ (Export ifcopenshell-verifiziert, Import als Kontext-Layer), KosmoPublish-Blatteditor ✅ (Plansatz-PDF A0–A4, DXF ezdxf-verifiziert) |
| M6 Sketch + Sprache + Prepare/OneDrive | 🟡 50% | KosmoSketch ✅ (Freihand→Wände, gated), KosmoSpeak ✅ (Push-to-Talk→Bridge-STT); offen: Prepare, OneDrive |
| M7 Sync + TKB-Demo + Packaging | 🟢 75% | .kosmo ✅, TKB-Demo ✅, Yjs-Live-Sync ✅ (2-Client-Test bestanden); offen: Installer-Politur, Onboarding |

## Nächste Schritte (Reihenfolge = Hebel)

1. ~~CI + PWA + Tauri~~ ✅
2. ~~Zonen + SIA-416 + Kennzahlen-Panel~~ ✅
3. ~~Schnitt/Ansicht + 4er-Splitscreen~~ ✅ (Politur: echte Hidden-Line via three-edge-projection später)
4. ~~Assoziative Bemassungsketten~~ ✅
5. ~~Walmdach (eigener Skeleton)~~ ✅ — ~~Treppe~~ ✅
6. ~~Kosmo-Memory + Feedback-Daumen~~ ✅ (RAG-Ausbau später)
7. IFC: ~~Export (ifcopenshell-verifiziert)~~ ✅ — ~~Import als Kontext-Layer (web-ifc)~~ ✅
8. ~~KosmoVis-Client + Bridge (--fake-worker) + GLB-Export~~ ✅ — offen: /tts (Chatterbox-Dienst), STT-UI in der App
9. KosmoData: ~~Offline-Seed + Browser + Kosmo-Tool~~ ✅ — offen: SQLite-Ausbau, CH-Bauteilkatalog, Referenz-3D
10. ~~KosmoSketch + KosmoSpeak~~ ✅
11. KosmoPublish: ~~PDF/SVG-Einzelplan~~ ✅ — ~~Blatt-Editor + Plansatz-PDF + DXF~~ ✅ (Sheet = Kernel-Entity; ezdxf 0 Fehler)
12. ~~Yjs-Sync + .kosmo-Zip~~ ✅ — offen: OneDrive (Graph)
13. ~~TKB-Demoprojekt~~ ✅ — offen: Onboarding + Politur-/Visualtest-Runde
14. ~~Splat-Kontext-Layer (.splat/.ply, eigener Punkt-Renderer)~~ ✅ (echtes Gaussian-Splatting bleibt HomeStation-Rendersache)
15. ~~3D-Wandknoten (Gehrung auf Winkelhalbierende)~~ ✅ (Mehrfachknoten/T-Stösse V2)
16. ~~KosmoPrepare: Ingestion (PDF/TXT/MD→Wissensbasis) + grundlagen_suchen + OneDrive/Graph (MSAL/PKCE)~~ ✅ — offen: Embedding-RAG (bge-m3 via Bridge), KosmoDoc-Diagnosepanel
17. Politur: ~~Befehlspalette (⌘K, eigene)~~ ✅ · ~~KosmoDoc-Diagnose~~ ✅ · ~~CH-Bauteilkatalog~~ ✅ · ~~E2E-Suite committet (6 Tests, CI-Job)~~ ✅ · ~~TTS «Vorlesen» (Bridge /tts: Piper/Chatterbox, Q7)~~ ✅ · ~~Embedding-RAG (Bridge /embed: bge-m3; Cosine+Stichwort-Mischung)~~ ✅ · ~~Onboarding + Tagesgruss~~ ✅ · ~~Web-Worker-Ableitung (>300 Elemente)~~ ✅ · ~~Hidden-Line im Schnitt/Ansicht (eigene Verdeckungsrechnung: Kanten-Intervalle gegen davorliegende Dreiecke; Fallback ab 40 Mio Paaren)~~ ✅
18. ~~Desktop-Builds via CI~~ ✅ — **alle drei Plattformen bauen** (Lauf #4, 7da4329): macOS universal (.dmg), Linux (AppImage/deb/rpm), Windows (MSI/EXE) als Artefakte. Auslösen: `kosmo-orbit/.desktop-build-request` ändern+pushen. PR #2 (auto-erstellt beim ersten Push) bleibt offen = der eine V1-PR; Titel/Body am Ende aktualisieren.
    (Hinweis: Website-CI `ci.yml`/security:check ist auch auf main rot — vorbestehend, Website-Lane, hier nicht angefasst)

## Arbeitsregeln (Owner-Direktiven)

- **Alles sofort committen + pushen** auf `claude/kosmo-orbit-v1-build-pzxkbj` (git = einziger Speicher). Ein PR erst am V1-Ende. `main` NIE anfassen (deployt live auf architekturkosmos.ch).
- Grösster Hebel zuerst; visuell testen (Playwright + SwiftShader: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, Chromium unter /opt/pw-browsers/chromium), Screenshots an Owner.
- Design: Aura (Papier/Tinte, Kupfer-Akzent), Deutsch (CH), zurückhaltend-präzise Animationen.
- Lizenz-Politik: MIT/Apache/BSD/ISC/MPL/BSL bündelbar; GPL/AGPL nur als separater HomeStation-Prozess.
- Kosmo-Vorschläge immer gated (Diff-Karten) — Review-Gate-Kultur des Owners.

## Architektur-Kompass

Workspace `kosmo-orbit/` (eigenständig, Root-Website unberührt): `packages/kosmo-{ui,contracts,kernel,ai}` + `apps/kosmo-orbit` (+ geplant: `kosmo-data`, `kosmo-sync`, `tools/homestation-bridge`, `tools/sync-server`).
Kern-Prinzipien: int-mm-Koordinaten · Commands = einzige Schreiber (zod-Schema = LLM-Tool) · Patches invertierbar (Undo/Yjs/Journal) · Grundriss symbolisch aus Parametrik, Stile aus CSS-Stiftsätzen · Kern ohne DOM/three-Import (Worker-fähig, transferable Arrays).

## Phase 2 (3 Wochen ohne HomeStation, Owner 02.07. abends)

19. Q12 komplett: ~~Schattenstudie (suncalc, Datum/Uhrzeit, Innerschweiz)~~ ✅ komplett ✅: ~~Schattenstudie~~ · ~~Grundriss-Checks~~ · ~~Volumenstudien-Generator (Teppich/Riegel/Turm/Zeilen/Winkel, Gruppen-Undo)~~ — Q12 «ALLE vier» erfüllt
20. ~~KosmoAsset-Rest (Q14): Materialkatalog (PBR+SIA+Lambda aus einer Quelle) + Referenz-3D aus KosmoData als GLB-Kontext~~ ✅ (Texturen-Maps folgen mit der HomeStation)
21. ~~Ansichten aller vier Richtungen in KosmoPublish (N/O/S/W, Ansichts-Stift 0.35)~~ ✅ · ~~3D-T-Stösse (bündig an die nahe Fläche)~~ ✅ · ~~Dach-Gratkanten~~ ✅ · ~~Hidden-Line~~ ✅ (Beleg: `e2e/tools/hiddenline-beleg.mts`)
22. ~~KosmoTrain (Q8): docs/KOSMOTRAIN.md (Unsloth-Rezept, GGUF→Ollama) + Journal-Export-Knopf (JSONL)~~ ✅ · ~~Tauri-iOS-CI-Experiment~~ ✅ — **Befund: init + Simulator-Build laufen durch** (3 min, Xcode-Projekt als Artefakt); fürs Gerät fehlt nur die Owner-Signierung
23. ~~Projektverwaltung + Autosave (IndexedDB-Tresor, Wiederherstellung, Wechsel)~~ ✅ · ~~Golden-SVG-Test~~ ✅ · ~~Dach-Gratkanten~~ ✅ · ~~iPad-Touch: Pinch-Zoom + Zwei-Finger-Pan im Grundriss (ein Finger zeichnet, Gesten klicken nie)~~ ✅
24. ~~Visuelle Gesamtrunde (Galerie an Owner; Nits gefixt: Grundriss-Einpassen beim Öffnen, Kupfer-Slider)~~ ✅ · ~~Hidden-Line im Schnitt (letzter Kür-Punkt)~~ ✅ — **damit ist die gesamte V1+Phase-2-Roadmap abgearbeitet.** V1 vom Owner abgenommen, PR #2 gemergt (02.07. abends, `c62a875`).

## Phase 3 (Vision-Backlog aus Fable-Auftrag + Visions-Paper, Owner 02.07.: «ultra viel vor der HomeStation»)

Container-machbar, Reihenfolge = Hebel für den Wettbewerbs-Alltag:

25. **Berechnungsliste Volumenstudien** (Owner-Excel 1:1 als lebende Ableitung): Raumprogramm HNF-Soll je Wohnungstyp → aGF-Ziel ×1.22, «ausgezogen» aus gezeichneten Zonen/Volumen, Differenz +/−, GF-Block je Geschoss, Δ Max, Tie-out-Kontrolle, Farbcodierung (marktgerecht rot · preisgünstig blau · alterswohnen violett · vertical-cluster hellgrün · quartierebene dunkelgrün) — Kern ✅ (deriveBerechnungsliste + design.raumprogrammSetzen, 34 Tests) · offen: Panel im Design-Modul, Varianten-Archiv, A4-quer-PDF-Export
26. **Stützenraster-Assistent** (VSS 40 291): 90°-Parkierung (Parkfeld 2.50–2.80 m ↔ Fahrgasse 6.50–6.25 m) gegen OG-Wohnraster prüfen; Vorschläge + Konfliktanzeige
27. **Geschosshöhen-/Typologie-Regeln in den Volumenstudien**: Wohnen 2.80 ok-ok, Gewerbe EG 4.00 / OG 3.50, Vertical-Cluster kompakt in Türmen; Spänner-Logik (Tiefe 14–18 m, Innenhof ≥13 m); 3h-Sonnen-Kriterium als Check (Nordwohnungen-No-go)
28. **Axonometrie** als vierter Plantyp (Toolkit 4 komplett; Hidden-Line wiederverwenden) in Design + Publish
29. **Toolkit 5 — Wettbewerbs-Plakat-Designer** in KosmoPublish: A0-Plakatlayouts, Text-Slots (Kosmo-Vorschläge, Demo-Modus), Plan-/Render-Platzhalter
30. **KosmoPrepare Phase 0**: Wettbewerbsdossier strukturiert erfassen (Boundaries, Do's/Don'ts) + Baugesetz-Boundaries als unsichtbare 3D-Grenzen im Design-Modul mit Verletzungswarnung
31. Laufend: Härtetest-Runden (Extremgeometrien, kaputte Importe), E2E-Ausbau (Sketch, .kosmo-Roundtrip, Tresor)
32. **Gestaltungskonzept «Werkplan»** — Rollout Runde 1 ✅ (Karteikarten für Bauteilkatalog + Diagnose, Messrahmen-Leerzustände in Schnitt/Ansicht/Publish/Prepare/Vis, Auto-Ansicht aus Decken); Rest siehe unten — (Owner-Referenzbilder 02.07., `docs/GESTALTUNGSKONZEPT.md`): Fundament ✅ — Skizzenpapier + Korn, Tusche-Standard (Schwarz/Weiss), wählbare Akzente (tusche/kupfer/signal/blau/gruen, Header-Punkte + Palette, persistiert), Radien 2/4/6, Plakat-Titel-Utility, Karteikarten-Utility. Offen: Rollout in alle Module (Panel-Köpfe mono+versal, Karteikarten mit Schnittecke für Kataloge/Checks, Passermarken/Massketten-Zierde, Leerzustände als Bauzeichnung im Messrahmen, Modul-Farbtöne auf Tusche ziehen)
33. **Alle Werkzeuge vollständig** (Owner 02.07., «alles fertig bauen gemäss Vision»): ~~KosmoDraw sichtbar~~ ✅ (Panel im Design-Modul: Modellbaum mit IFC-Identität + Klick-Auswahl, Mengenauszug je Aufbau/Klasse — deriveMengen im Kern, 36 Kernel-Tests, E2E 7/7), KosmoVis komplett (Varianten-Grid, QA-Verdikt-Karten, Job-Historie), KosmoTrain-Oberfläche (Journal-Kuration, Lernstand, Trainings-Rezepte), KosmoDoc als eigenes Modul (Selbstdiagnose + Hilfe-Chat + Visualtest-Berichte), KosmoReference/KosmoAsset-Vertiefung (Sammlungen, eigene Assets)

**HomeStation-gebunden bleibt nur:** echte Renders (5090/ComfyUI), Whisper-/Piper-Qualität, OneDrive-Tenant-Login, LoRA-Zyklus, KosmoAR (Gerät), OS-Übernahme (V2, Q31).
