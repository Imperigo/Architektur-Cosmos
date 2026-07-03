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

25. **Berechnungsliste Volumenstudien** (Owner-Excel 1:1 als lebende Ableitung): Raumprogramm HNF-Soll je Wohnungstyp → aGF-Ziel ×1.22, «ausgezogen» aus gezeichneten Zonen/Volumen, Differenz +/−, GF-Block je Geschoss, Δ Max, Tie-out-Kontrolle, Farbcodierung (marktgerecht rot · preisgünstig blau · alterswohnen violett · vertical-cluster hellgrün · quartierebene dunkelgrün) — Kern ✅ · Panel ✅ («Liste» im Design-Modul: Raumprogramm-Erfassung, lebende Tabelle mit Typ-Farben, Δ Max, Tie-out-Warnung, «Zeichnen als»-Typwahl fürs Zonen-Werkzeug, A4-quer-PDF) · offen: Varianten-Archiv (heute: Projekt-Tresor je Variante)
26. ~~**Stützenraster-Assistent** (VSS 40 291)~~ ✅ («Raster» im Design-Modul: Owner-Herleitung als Rechenwerk — Achsmass = Felder × Breite + 0.50 m, Wohnraster-Bewertung zu-eng/knapp/ausgewogen/grosszügig, Holzbau-Warnung >12 m, Parameter einstellbar; Owner-Excel-Zahlen als Kernel-Tests)
27. ~~**Geschosshöhen-/Typologie-Regeln in den Volumenstudien**~~ ✅ (Nutzungs-Wahl Wohnen 2.80 / Gemischt mit EG 4.00 + Turm-OG 3.50; Spänner-Tiefen 14–18 m mit ehrlichen Flags; neue Blockrand-Variante mit Hof ≥ 13 m; 3h-Sonnen-Kriterium als dokumentierte Näherung Schatten ≤ 1.43×h — Badges + Hinweise auf jeder Varianten-Karte)
28. ~~**Axonometrie** als vierter Plantyp~~ ✅ (Toolkit 4 komplett: Militärperspektive — Grundriss unverzerrt gedreht, Höhen senkrecht, Hidden-Line über den gemeinsamen Kern derive/hiddenline.ts; «Axo»-Knopf in KosmoPublish, Würfel-Test 12→9 Kanten) — dabei ehrlicher Bugfund: Store-Revision konnte nach Projektwechsel kollidieren (UI blieb stehen) → jetzt strikt monoton
29. ~~**Toolkit 5 — Wettbewerbs-Plakat-Designer**~~ ✅ (A0-hoch-Plakat auf einen Klick, Layouts Klassisch/Spalte: Titel + Untertitel + Konzepttext als editierbare Blatt-Texte (publish.textSetzen, undo-fähig, im PDF), vorplatzierte Slots Axo 1:400 + Grundriss/Ansicht Süd/Schnitt 1:200 — EIN Undo-Schritt) — offen (HomeStation): Render-Bilder als Plakat-Slots
30. ~~**Baugesetz-Boundaries (Phase 0)**~~ ✅ (Boundary-Entity + design.baugrenzeSetzen — eine Grenze je Geschoss, Ersetzen statt Stapeln; strichpunktiert im Grundriss; Grundriss-Checks melden Lage- und Höhenverstösse als Fehler; «Als Baugrenze»-Knopf im Varianten-Panel übernimmt die Parzelle mit max. Höhe) · ~~Dossier-Erfassungsmaske~~ ✅ (Phase-0-Sektion in KosmoPrepare: Gefordert/No-go/Fakt via design.dossierSetzen, undo-fähig — **fliesst bindend in Kosmos Systemprompt**)
31. ~~Härtetest-Runde 1~~ ✅ (10 Kernel-Foltertests: leere/degenerierte Modelle, 2°-Gehrung, km-Wände, Serialisierung aller neuen Bürger, alte .kosmo-Stände; 2 App-Funde gefixt: kaputte .kosmo meldete sich nicht, NaN-Max-aGF scheiterte still; 3 neue E2E: 600 Wände bedienbar, kaputte Datei → Meldung + UI lebt) — laufend weiter
32. **Gestaltungskonzept «Werkplan»** — Rollout Runde 1 ✅ (Karteikarten für Bauteilkatalog + Diagnose, Messrahmen-Leerzustände in Schnitt/Ansicht/Publish/Prepare/Vis, Auto-Ansicht aus Decken); Rest siehe unten — (Owner-Referenzbilder 02.07., `docs/GESTALTUNGSKONZEPT.md`): Fundament ✅ — Skizzenpapier + Korn, Tusche-Standard (Schwarz/Weiss), wählbare Akzente (tusche/kupfer/signal/blau/gruen, Header-Punkte + Palette, persistiert), Radien 2/4/6, Plakat-Titel-Utility, Karteikarten-Utility. Offen: Rollout in alle Module (Panel-Köpfe mono+versal, Karteikarten mit Schnittecke für Kataloge/Checks, Passermarken/Massketten-Zierde, Leerzustände als Bauzeichnung im Messrahmen, Modul-Farbtöne auf Tusche ziehen)
33. **Alle Werkzeuge vollständig** (Owner 02.07., «alles fertig bauen gemäss Vision»): ~~KosmoDraw sichtbar~~ ✅ (Panel im Design-Modul: Modellbaum mit IFC-Identität + Klick-Auswahl, Mengenauszug je Aufbau/Klasse — deriveMengen im Kern, 36 Kernel-Tests, E2E 7/7), ~~KosmoVis komplett~~ ✅ (Varianten-Serie «3 Stimmungen» auf einen Klick, QA-Verdikt-Karteikarten mit Scores, Serien überleben Neustart, Historie; end-to-end gegen die Fake-Bridge verifiziert), KosmoTrain-Oberfläche (Journal-Kuration, Lernstand, Trainings-Rezepte), ~~KosmoDoc als eigenes Modul~~ ✅ (Zentrale-Kachel: Diagnose als Karteikarten-Befunde, Hilfe = Werkzeug-Wissen der App in 5 Karten, Berichte = echtes Lernjournal mit 👍/👎-Statistik; Hilfe-CHAT läuft über das Kosmo-Panel), ~~KosmoReference-Sammlung~~ ✅ (Stern auf jeder Referenzkarte, «★ Sammlung»-Filter, persistiert) — eigene Assets folgen mit der HomeStation (Texturen/GLB-Uploads)

**HomeStation-gebunden bleibt nur:** echte Renders (5090/ComfyUI), Whisper-/Piper-Qualität, OneDrive-Tenant-Login, LoRA-Zyklus, KosmoAR (Gerät), OS-Übernahme (V2, Q31).

34a. **Härtetest-Runde 2** ✅ (03.07.): Tool-Call-Fuzzing (Markdown-Zäune werden jetzt geschält — der häufigste lokale-LLM-Fehler; jsonrepair, präzise zod-Meldungen, __proto__-sicher — 5 neue KI-Tests) · Sync-Konflikttest mit zwei echten Clients gegen den Hocuspocus-Server (Verschieben-gegen-Löschen konvergiert; Suite überspringt sich ehrlich ohne Server)
34. **Publish-Vertiefung** ✅ (03.07.): Auswahl-Werkzeuge auf dem Blatt — Massstab wechseln + Titel umbenennen (publish.ansichtAnpassen), Blatt löschen (publish.blattEntfernen, undo-fähig), Texte direkt auf dem Blatt verschieben (Drag-Overlays → publish.textSetzen)

35. **V2-A1 Mehrfach-Wandknoten** ✅ (03.07.): 3+ Wandenden an einem Punkt — CCW-Sortierung, Fugenecken als Linienschnitte je Nachbarpaar (gegenläufig kolineare Fugen: Ecke auf dem Fusspunkt → durchlaufende Wand bleibt bündig), Wände ziehen sich affin auf ihre Eckpaare zurück (Scherung verallgemeinert auf t = A + B·o, alte Pfade bit-identisch — Golden-Ansicht unverändert), Knotenstück füllt das Eckenpolygon als eigener Körper (Plan/Schnitt/Axo erben es); 3 neue Kernel-Tests (Plus-Knoten ±180 exakt, T aus Endpunkten flush + Rücksprung, Fünf-Stern) — 57 Kernel-Tests grün

36. **V2-B4 Kosmo-Aktionsketten** ✅ (03.07.): mehrere Tool-Calls einer Kosmo-Antwort werden EIN gated Diff-Paket («Aktionskette — N Schritte», nummerierte Liste, «Alle N anwenden»/«Ablehnen»); Platzhalter `"$neu:N"` verweisen auf Ergebnisse früherer Schritte (Fenster in die eben gezeichnete Wand); Anwenden läuft als eine Undo-Gruppe — scheitert ein Schritt, rollt EIN undo() die Teilkette atomar zurück und alle Schritte gelten als abgelehnt; ein ↩ macht die ganze Kette rückgängig. Mock-Beleg: «Bau mir ein kleines Haus» → 6er-Kette (4 Wände, Fenster via $neu:0, Walmdach). 20/20 E2E grün.

37. **V2-C1+C4 Publish auf Abgabe-Niveau** ✅ (03.07.): **C4** — Schnitte tragen Material-Poché nach SIA-Lesart: der Kern verkettet die Cut-Segmente jedes Bauteils zu geschlossenen Flächen (`SectionGraphic.faces`), Wände werden exakt in ihre Schichtbänder zerlegt (Schichtgrenzen = senkrechte s-Linien im Schnittbild), `derive/schraffur.ts` liefert Katalog (beton Diagonale+Grau, Mauerwerk weite Diagonale, Holz Kreuz, Dämmung Wellen, Funktion als Rückfall) und Schraffur-GEOMETRIE (rotierte Scanlines — kein SVG-Pattern, svg2pdf-fest); App-Schnitt + Blatt-SVG + PDF zeigen dasselbe Poché. **C1** — Renders sind Blatt-Bürger: `ImageAsset`-Entity (Base64 im Modell → Undo/Yjs/.kosmo gratis, PNG-Masse aus dem IHDR), `Sheet.bilder` mit leeren Slots («Render folgt — HomeStation»), Commands bildPlatzieren/Füllen/Verschieben/Anpassen/Entfernen (verwaiste Assets werden mitgeräumt), Plakat-Designer platziert einen Render-Slot, Blatteditor mit Bild-Drag + Datei-Picker, PDF bettet Bilder mm-genau via jsPDF.addImage (svg2pdf-Raster bewusst umgangen), KosmoVis-Karten mit **«Aufs Blatt»** (füllt den ersten leeren Slot; Cache-Vergiftungs-Bug der no-cors-`<img>` gefunden → fetch no-store). Suiten: 65 Kernel + 8 KI + 5 Contracts + 3 App + **22 E2E** (neu: Bild-Slots + Vis→Blatt gegen die Fake-Bridge).

38. **V2-B1 RAG-Ausbau — Kosmo antwortet belegt** ✅ (03.07.): EIN Abruf-Index über alles Bürowissen (`state/quellen.ts`): Wissensbasis (semantisch via Bridge-Embeddings + Stichwort), Wettbewerbsdossier (leicht bevorzugt — bindende Regeln) und Lernjournal. Das Tool `quellen_suchen` (ersetzt grundlagen_suchen) liefert nummerierte Belege `[Qn]`; die Persona-Regel «Belegen statt behaupten» lässt Kosmo die Marken im Antworttext zitieren. Unter jeder Antwort erscheinen **Zitat-Chips mit Quellensprung**: Wissen → KosmoPrepare zeigt den zitierten Abschnitt hervorgehoben, Dossier → markierte Karteikarte, Journal → markierter Eintrag in der KosmoTrain-Kuration. Mock-Provider beherrscht den Fluss (Wissensfrage → quellen_suchen → zitierte Antwort). Suiten: 65 Kernel + **9 KI** + 5 Contracts + 3 App + **24 E2E** (neu: Wissens- und Dossier-Zitat mit Sprung).

**Phase 3 abgeschlossen (03.07.2026):** Punkte 25–33 alle ✅ (einzige HomeStation-Reste ehrlich markiert: Render-Slots im Plakat, eigene Asset-Uploads, LoRA-Training selbst). Es folgt die grosse Härtetest-Runde übers Gesamtsystem.
