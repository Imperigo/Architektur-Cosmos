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
| M2 2D-Pläne + Splitscreen | 🟢 80% | Grundriss+Schnitt+Ansicht live, 4er-View, Zonen+SIA-416-Kennzahlen; offen: Bemassung, Dach, Treppe |
| M3 Kosmo-KI | 🟢 85% | Gated Loop + Personas + Begrüssung + Ollama/Mock; offen: Memory/RAG, Journal-Feedback-UI |
| M4 KosmoData | ⚪ offen | |
| M5 Vis/Publish/IFC + Bridge | 🟡 70% | Render-Loop end-to-end ✅, PDF/SVG-Plansatz-Export ✅; offen: IFC-Roundtrip, Blatt-Editor, DXF |
| M6 Sketch + Sprache + Prepare/OneDrive | 🟡 50% | KosmoSketch ✅ (Freihand→Wände, gated), KosmoSpeak ✅ (Push-to-Talk→Bridge-STT); offen: Prepare, OneDrive |
| M7 Sync + TKB-Demo + Packaging | 🟡 35% | .kosmo-Speichern/Öffnen ✅, TKB-Demo ✅ (NGF 2814 m² exakt); offen: Yjs-Live-Sync, Installer-Politur |

## Nächste Schritte (Reihenfolge = Hebel)

1. ~~CI + PWA + Tauri~~ ✅
2. ~~Zonen + SIA-416 + Kennzahlen-Panel~~ ✅
3. ~~Schnitt/Ansicht + 4er-Splitscreen~~ ✅ (Politur: echte Hidden-Line via three-edge-projection später)
4. Assoziative Bemassungsketten (Grundriss)
5. Walmdach (eigener Straight Skeleton — ⚠ KEIN npm straight-skeleton v2/v3: CGAL-GPL-Falle!) + Treppe basic
6. Kosmo-Memory (Journal→RAG, SQLite) + Feedback-Daumen im Panel
7. IFC-Export (eigener SPF-Writer, Subset) + Import (web-ifc) — Validierung via Bridge
8. ~~KosmoVis-Client + Bridge (--fake-worker) + GLB-Export~~ ✅ — offen: /tts (Chatterbox-Dienst), STT-UI in der App
9. KosmoData: SQLite (D1-Port) + Sync architekturkosmos.ch/api + Reference-Browser + CH-Bauteilkatalog
10. ~~KosmoSketch + KosmoSpeak~~ ✅
11. KosmoPublish: ~~PDF/SVG-Einzelplan~~ ✅ — offen: Blatt-Editor, Plansätze, DXF; PDF-Schraffur-Pattern fixen
12. Yjs-Sync (Hocuspocus+SQLite auf HomeStation) + .kosmo-Zip (fflate) + OneDrive (Graph, PWA: MSAL; Desktop: PKCE+Loopback)
13. ~~TKB-Demoprojekt~~ ✅ — offen: Onboarding + Politur-/Visualtest-Runde
14. Splat-Kontext-Layer: Gaussian-Splats (.ply/.splat aus LingBot-Map/gsplat-Kette der HomeStation) als Bestand-Layer im KosmoDesign-Viewport laden (Owner-Hinweis 02.07., Tech-Radar-Nachtrag)

## Arbeitsregeln (Owner-Direktiven)

- **Alles sofort committen + pushen** auf `claude/kosmo-orbit-v1-build-pzxkbj` (git = einziger Speicher). Ein PR erst am V1-Ende. `main` NIE anfassen (deployt live auf architekturkosmos.ch).
- Grösster Hebel zuerst; visuell testen (Playwright + SwiftShader: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, Chromium unter /opt/pw-browsers/chromium), Screenshots an Owner.
- Design: Aura (Papier/Tinte, Kupfer-Akzent), Deutsch (CH), zurückhaltend-präzise Animationen.
- Lizenz-Politik: MIT/Apache/BSD/ISC/MPL/BSL bündelbar; GPL/AGPL nur als separater HomeStation-Prozess.
- Kosmo-Vorschläge immer gated (Diff-Karten) — Review-Gate-Kultur des Owners.

## Architektur-Kompass

Workspace `kosmo-orbit/` (eigenständig, Root-Website unberührt): `packages/kosmo-{ui,contracts,kernel,ai}` + `apps/kosmo-orbit` (+ geplant: `kosmo-data`, `kosmo-sync`, `tools/homestation-bridge`, `tools/sync-server`).
Kern-Prinzipien: int-mm-Koordinaten · Commands = einzige Schreiber (zod-Schema = LLM-Tool) · Patches invertierbar (Undo/Yjs/Journal) · Grundriss symbolisch aus Parametrik, Stile aus CSS-Stiftsätzen · Kern ohne DOM/three-Import (Worker-fähig, transferable Arrays).
