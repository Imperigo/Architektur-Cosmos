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
| M2 2D-Pläne + Splitscreen | 🟡 60% | Grundriss live (SIA-Schraffuren, Symbole); offen: Schnitt/Ansicht, Bemassung, Dach, Treppe, Zonen |
| M3 Kosmo-KI | 🟢 85% | Gated Loop + Personas + Begrüssung + Ollama/Mock; offen: Memory/RAG, Journal-Feedback-UI |
| M4 KosmoData | ⚪ offen | |
| M5 Vis/Publish/IFC + Bridge | ⚪ offen | Contracts fertig (@kosmo/contracts) |
| M6 Sketch + Sprache + Prepare/OneDrive | ⚪ offen | |
| M7 Sync + TKB-Demo + Packaging | ⚪ offen | |

## Nächste Schritte (Reihenfolge = Hebel)

1. **[in Arbeit]** CI-Workflow (Lint/Typecheck/Tests/Playwright) + PWA-Manifest + Tauri-2-Scaffold + Desktop-Build-Workflow
2. Zonen-Werkzeug + SIA-416-Flächenmathematik (`sia416.ts`) + Live-Kennzahlen-Panel (GF/aGF/HNF, Faktoren aus Doc-Settings — Owner: aGF=1.28×HNF bzw. 1.22, Fassade +10%)
3. Schnitt/Ansicht-Ableitung (Mesh-Slice + Kanten-Projektion, three-edge-projection) + 4er-Splitscreen komplett
4. Assoziative Bemassungsketten (Grundriss)
5. Walmdach (eigener Straight Skeleton — ⚠ KEIN npm straight-skeleton v2/v3: CGAL-GPL-Falle!) + Treppe basic
6. Kosmo-Memory (Journal→RAG, SQLite) + Feedback-Daumen im Panel
7. IFC-Export (eigener SPF-Writer, Subset) + Import (web-ifc) — Validierung via Bridge
8. KosmoVis-Client (JobComposer → render-scene/v1) + `tools/homestation-bridge` (FastAPI, --fake-worker) + `/stt` (faster-whisper + jayr23/whisper-large-v3-turbo-swiss-german-ct2) + `/tts` (Chatterbox)
9. KosmoData: SQLite (D1-Port) + Sync architekturkosmos.ch/api + Reference-Browser + CH-Bauteilkatalog
10. KosmoSketch (perfect-freehand → Wand-Achsen, gated) + KosmoSpeak (Push-to-Talk)
11. KosmoPublish (Blatt-Editor, PDF via jsPDF+svg2pdf, DXF via @tarikjabiri/dxf)
12. Yjs-Sync (Hocuspocus+SQLite auf HomeStation) + .kosmo-Zip (fflate) + OneDrive (Graph, PWA: MSAL; Desktop: PKCE+Loopback)
13. TKB-Hönggerberg-Demoprojekt (7 Geschosse, Σ2814 m²) + Onboarding + Politur-/Visualtest-Runde

## Arbeitsregeln (Owner-Direktiven)

- **Alles sofort committen + pushen** auf `claude/kosmo-orbit-v1-build-pzxkbj` (git = einziger Speicher). Ein PR erst am V1-Ende. `main` NIE anfassen (deployt live auf architekturkosmos.ch).
- Grösster Hebel zuerst; visuell testen (Playwright + SwiftShader: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, Chromium unter /opt/pw-browsers/chromium), Screenshots an Owner.
- Design: Aura (Papier/Tinte, Kupfer-Akzent), Deutsch (CH), zurückhaltend-präzise Animationen.
- Lizenz-Politik: MIT/Apache/BSD/ISC/MPL/BSL bündelbar; GPL/AGPL nur als separater HomeStation-Prozess.
- Kosmo-Vorschläge immer gated (Diff-Karten) — Review-Gate-Kultur des Owners.

## Architektur-Kompass

Workspace `kosmo-orbit/` (eigenständig, Root-Website unberührt): `packages/kosmo-{ui,contracts,kernel,ai}` + `apps/kosmo-orbit` (+ geplant: `kosmo-data`, `kosmo-sync`, `tools/homestation-bridge`, `tools/sync-server`).
Kern-Prinzipien: int-mm-Koordinaten · Commands = einzige Schreiber (zod-Schema = LLM-Tool) · Patches invertierbar (Undo/Yjs/Journal) · Grundriss symbolisch aus Parametrik, Stile aus CSS-Stiftsätzen · Kern ohne DOM/three-Import (Worker-fähig, transferable Arrays).
