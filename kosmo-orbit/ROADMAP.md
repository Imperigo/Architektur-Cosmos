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
17. Politur: ~~Befehlspalette (⌘K, eigene)~~ ✅ · ~~KosmoDoc-Diagnose~~ ✅ · ~~CH-Bauteilkatalog~~ ✅ · ~~E2E-Suite committet (6 Tests, CI-Job)~~ ✅ · ~~TTS «Vorlesen» (Bridge /tts: Piper/Chatterbox, Q7)~~ ✅ · ~~Embedding-RAG (Bridge /embed: bge-m3; Cosine+Stichwort-Mischung)~~ ✅ · ~~Onboarding + Tagesgruss~~ ✅ · ~~Web-Worker-Ableitung (>300 Elemente)~~ ✅ — offen: Hidden-Line (V2-Kür)
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
21. ~~Ansichten aller vier Richtungen in KosmoPublish (N/O/S/W, Ansichts-Stift 0.35)~~ ✅ — offen (V2): Hidden-Line, 3D-T-Stösse, Dach-Gratkanten in der Ansicht
22. ~~KosmoTrain (Q8): docs/KOSMOTRAIN.md (Unsloth-Rezept, GGUF→Ollama) + Journal-Export-Knopf (JSONL)~~ ✅ · ~~Tauri-iOS-CI-Experiment (Workflow, Xcode-Projekt als Artefakt)~~ ✅ (Signierung bleibt beim Owner)
23. ~~Projektverwaltung + Autosave (IndexedDB-Tresor, Wiederherstellung, Wechsel)~~ ✅ · ~~Golden-SVG-Test~~ ✅ · ~~Dach-Gratkanten~~ ✅ — offen: iPad-/Touch-Feinschliff
