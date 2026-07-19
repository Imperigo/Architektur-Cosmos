# V089-SPEZ — v0.8.9 «Geordnet» (eingefroren 19.07.2026)

> Drei Tagespläne EINER Version: A «Kern & Ordnung» / B «Blattwerk &
> Nachzüge» / C «Konsolidierung & Release (verschlankt)». **Owner-Rahmen
> (bindend, fortgeltend aus 0.8.8):** bis v0.9.0 KEIN Rundgang-PDF und
> KEINE Installer-Zustellung (Build-Request läuft für die Website-Kette
> weiter); E2E-Gates voll. **Owner-Entscheide (AskUserQuestion 19.07.):**
> CAD-Ebenen = **DXF-Interop + Sperren** (kein Sichtbarkeits-Panel, die
> RE-ARCHICAD-Linie «Sichtbarkeit folgt der Semantik» bleibt) ·
> Port-Theme-Paletten **JA, Owner wählt aus 2–3 gerechneten
> WCAG-Kandidaten** · Name **«Geordnet»**. Arbeitsmodell: Fable =
> Spez/Urteil/Gates/Commits/Nachzüge; Sonnet-Pakete in disjunkten
> Dateikreisen, maximal parallel; **Worktree fällt sofort nach dem Gate**
> (Lehre v0.8.8 §3). Format-Vorbild `V088-SPEZ.md`; Faktenbasis: zwei
> Explore-Agenten + adversarialer Plan-Agent (19.07.).

## 1 · Auftrag

Ordnung und Vervollständigung statt Umbau: die letzte benannte
Schnitt-Verschneidungslücke schliessen (Wand↔Wand-Eckfälle), die toten
`meta.layer`/`locked`-Felder als DXF-Interop + Sperrschutz verdrahten,
dem Blattwerk ein Verzeichnis und eine Sammellegende geben, Treppen ihre
3D-Griffe. **Zentraler Planbefund (adversarial bestätigt):** 0.8.9 ist
KEIN Golden-Sammelwechsel — die Prognose lautet 0 bewegte
Bestands-Goldens + N additive Neuzugänge (PB3). `GOLDEN-WECHSEL-089.md`
wird darum vom Wechsel-Tagewerk zum **Konsolidierungs- und
Stillstandsnachweis** umgewidmet (E5).

## 2 · Verifizierte Diagnosen (D1–D9, je mit Fundstelle)

- **D1** A1-Rest = **Wand↔Wand-Eckfälle im Schnitt**: `derive/
  section.ts:564-611` (`wandDeckeVerschneiden`) gruppiert wall/slab/roof
  — Wand-gegen-Wand fehlt; ROADMAP 316 (Eintrag 150) benennt die Lücke
  wörtlich als offen. Grundriss löst dasselbe geometrisch
  (`detectEndMiters`, ROADMAP 149/315, >2-Wand-Knoten dort bewusst
  ausgeklammert). `RE-ARCHICAD.md:82/206` ist stale (nennt Wand↔Decke
  noch als «nächsten Schritt») — Pflicht-Nachzug.
- **D2** Golden-Referenzbasis: **37 Dateien** unter test/golden/ (36 SVG
  + 1 IFC; der Plan-Agent korrigierte die Explorer-Zählung — Zahlen
  IMMER gegenzählen). Ritual-Muster aus GOLDEN-WECHSEL-080/081/083:
  Erwartungsliste VOR Regeneration, `GOLDEN_UPDATE=1`, vierstufige
  Verifikation (status/diff-stat/sha256/Diff-Verify-Skript), svg-qa.
  083-Muster für additive Goldens: Guard hält Bestand byte-still.
- **D3** `EntityMeta.layer?/locked?` (entities.ts:10-16) sind **toter
  Code** (0 Leser/Setzer). Vorbild-Verdrahtung: `meta.renovation`
  (design.renovationSetzen :1352, Inspector.tsx:350/353). DXF-Layer
  kommen rein aus Semantik (`dxf/export.ts:39-83` `layerFuer(classes)`,
  feste LAYER_REGELN); DXF hat KEIN Golden (nur String-Assertions).
  `RE-ARCHICAD.md:89`: Ebenen «bewusst nie» — die Owner-Rahmung
  (DXF-Interop + Sperren) widerspricht dem NICHT und wird dort
  nachgeführt.
- **D4** Blattverzeichnis/Sammellegende: kein Beleg ausser Nennung —
  unschärfster Kandidat, **Fable-Subspez vor Paketstart ist Pflicht**.
  Anschluss: `derive/sheet.ts:315-347` (bestehende PRO-BLATT-Legenden:
  Themenplan-Farbkästchen + Keynotes → Sammellegende = Verallgemeinerung
  über das Publikations-Set), `derive/publikation.ts` (Verzeichnis),
  `derive/blattlayout.ts` (Geometrie).
- **D5** Treppen-3D: Kernel fertig und aufrufer-agnostisch
  (`design.treppeGeometrieSetzen`, ROADMAP 499); 2D-Griffe komplett
  (PlanView:656-670, DesignWorkspace:1192-1213/1311-1325). Viewport3D
  hat als EINZIGE Handle-Infrastruktur das FreeMesh-`meshHandleGroup`-
  Muster (:1042-1091, meshHandleTrefferAt :1087-1092) — für Stair fehlt
  Handle-Gruppe/Raycast/Drag komplett (V087-SPEZ §8 Nicht-Ziel, jetzt
  fällig).
- **D6** Masskette-Griff-Einzelpunkt läuft noch über Löschen+Neusetzen
  (DesignWorkspace:1253-1259, benannter C-3-Aufschub 0.8.8); Vorlagen
  `setWallGeometry` :202-243 / `setStairGeometry` :1438-1508; griffKey
  = Punktindex (number). `e2e/griffe.spec.ts:405-432` testet die
  ID-Stabilität bisher NICHT.
- **D7** **Echter Produkt-Bug** NodeCanvas: transparente Drag-Rect
  (:1343, NODE_W×KOPF_H, fill="transparent" = hit-testbar) über dem
  ganzen Node-Kopf; `node-kollaps` (:1352-1372) liegt darin OHNE eigene
  Hit-Fläche (nur dünnes Chevron) — Klicks neben dem Glyph starten einen
  Node-Drag statt des Kollaps (Ursache der zwei undokumentierten
  force:true in vis-editor.spec:294/300). Der dritte Audit-Fund
  (island-inhalte-zeichnen-ansicht:145) ist dagegen dokumentierter
  Reflow-Fall, kein Bug.
- **D8** Port-Kontrast GEMESSEN (WCAG gegen `--k-field`):
  `--k-port-szene` #2455a4 = **2.69:1 im Orbit** (unter 3:1),
  `--k-port-prompt` 3.01:1 knapp; paper 3.8–6.5 ok. `--k-stimmung-*`
  ohne Hintergrund-Bezug (Gradient-Vorschau). Tokens liegen im ersten
  `:root/[data-theme='paper']`-Block ohne orbit-Override
  (aura.css:337-368).
- **D9** VERSCHIEBBAR-Erweiterung (C-1-Zusatzbefund 0.8.8) ist
  **grösser als der Wortlaut**: furniture/beam/boundary/etikett sind im
  2D-Plan nicht einmal klickbar (`pickEntityAt` :187-225 kennt sie
  nicht; PlanView-Möbel ohne Pointer-Handler) — M-Aufwand quer durch
  Cluster B. **Entscheid: RAUS aus 0.8.9** (kein thematischer Bezug,
  Datei-Grabbing) → 0.8.10-Kandidat.

## 3 · Entscheide (E1–E8, bindend)

- **E1 Wand↔Wand-Schnittverschneidung** (PA1): neue Funktion
  `wandWandVerschneiden` ADDITIV neben `wandDeckeVerschneiden` in
  section.ts — Zwei-Wand-Eckfall im Schnittband, Prioritätsregel über
  bestehendes `materialPrioritaet`, Clip über `geometry/clip.ts`.
  **>2 Wände am selben Knoten werden kontrolliert ausgelassen**
  (Parität zum Grundriss, ROADMAP 315) — nie still falsch verschnitten.
  Kernel-Test-only; `GOLDEN_UPDATE=1`-Probelauf FRÜH am eigenen Gate
  (nicht erst Tag C) — die drei Schnitt-Goldens müssen sha256-identisch
  bleiben; ein Diff = Sofort-Stopp + Fable-Klassifikation.
  RE-ARCHICAD-Zeile nachziehen.
- **E2 CAD = DXF-Interop + Sperren** (PA2, Owner-Entscheid): zwei neue
  additive Commands nach dem renovationSetzen-Muster —
  `design.ebeneSetzen` ({entityId, layer: string|null}) und
  `design.sperren` ({entityId, locked: boolean}); `layerFuer()` liest
  `meta.layer` als Override VOR den classes-Regeln (nur DXF-Export);
  `locked` verhindert Verschieben/Griff-Drag/Löschen am
  Interaktions-Pfad — das Element bleibt über `pickEntityAt` FINDBAR
  (Inspector muss anzeigen und entsperren können); Inspector bekommt
  Sperr-Toggle + Ebenen-Feld. **KEIN Schloss-Symbol im derive-SVG-Pfad**
  (Editor-Chrome erlaubt, Plan-SVG tabu — Sanktion 2). KEIN
  Sichtbarkeits-Panel (Sanktion 4). RE-ARCHICAD-Ebenen-Zeile
  nachführen (Interop-Rahmung dokumentieren).
- **E3 Blattverzeichnis + Sammellegende** (PB3, Tag B): baut NACH der
  Fable-Subspez von Tag A (Format wie eine 083-Subspez: Dateikreis +
  Funktionssignaturen + Golden-Namen eingefroren, kein Sonnet-Ermessen
  über Scope). Verzeichnis = pure Funktion in derive/publikation.ts
  über die Blätter eines Publikations-Sets; Sammellegende =
  Generalisierung der Pro-Blatt-Legende aus sheet.ts. **Additiv nach
  083-Muster**: +N neue Goldens mit Guard, 0 Bestandsänderung; kein
  Umbau von sheetToSvg-Bestandspfaden.
- **E4 Treppen-3D-Griffe** (PA5): `stairHandleGroup` nach dem
  meshHandleGroup-Muster — Marker an a/b (+ecke bei form 'l'), NUR bei
  Einzelauswahl sichtbar, `userData.stairHandle {entityId, key}`,
  Raycast-Treffer analog meshHandleTrefferAt, Drag committet über den
  BESTEHENDEN `design.treppeGeometrieSetzen` (kein neuer
  Kernel-Command). **x/y-only wie 2D** — kein z-Griff (dokumentiertes
  Nicht-Ziel). Neue `e2e/griffe-treppe-3d.spec.ts` nach dem Muster von
  griffe-treppe.spec.ts + viewport3d-Kamera-Helfern.
- **E5 GOLDEN-WECHSEL-089.md = Konsolidierungs-/Stillstandsnachweis**
  (Fable): Teil 1 (Tag A, VOR den Landungen): Erwartungsliste als
  Prognose je Paket — PA1: 0, PA2: 0 (unter Sanktion 2), PB3: +N mit
  Namen. Teil 2 (Tag C, alle Pakete im Baum): EIN gemeinsamer
  `GOLDEN_UPDATE=1`-Lauf, vierstufige Verifikation, Ist == Prognose;
  **Prognose-Bruch = Hard-Stop**, Fable klassifiziert den Diff vor
  jeder Freigabe. Referenzbasis 37 Dateien / svg-qa 36.
- **E6 Port-Theme-Paletten** (Fable, Owner-Wahl): 2–3 rechnerisch
  WCAG-konforme Kandidaten-Paletten (alle 6 Ports ≥3:1 gegen
  `--k-field` in BEIDEN Themes; die Blau-Entkopplung von
  `--k-graph`/`--k-accent` bleibt); Owner wählt am Screenshot-Vergleich;
  danach `[data-theme='orbit']`-Overrides (paper behält die
  Bestandswerte, sofern der Owner-Kandidat nichts anderes sagt) +
  Kommentar-Nachzug in aura.css:337-346 und NodeCanvas.tsx:96-98.
  `--k-stimmung-*` bleiben invariant (kein Kontrast-Fall, D8).
- **E7 NodeCanvas-Kollaps-Fix** (PB6a): eigene transparente Hit-Rect
  (~24×20) im `node-kollaps`-g vor dem Icon (stopPropagation existiert);
  danach `force:true` an vis-editor.spec:294/300 ENTFERNEN — der Lauf
  ohne force ist der Regressionsbeweis. ROADMAP-516-Vermerk zu
  island-inhalte-zeichnen-ansicht:145 korrigieren (ist dokumentiert).
- **E8 Nachzüge nach Kapazität** (kein Kernversprechen):
  `design.massKetteGeometrieSetzen` ({entityId, punktIndex, punkt},
  Range-Wurf; Fable-solo, Cluster B; DesignWorkspace:1253-1259 wird
  EIN Aufruf; ID-Stabilitäts-Assertion in griffe.spec.ts ergänzen) ·
  Eval-Fokus-Ausbau (NUR prompts.json/eval-ergebnis.json:
  design.verschieben + wandGeometrieSetzen + treppeGeometrieSetzen
  (+massKette… sobald existiert) + vis.nodeKollabieren/trennen/
  nodeLoeschen/graphLoeschen + 1–2 Baukonstruktions-Vertreter).

## 4 · Betrieb (bindend)

- **Cluster A** Viewport3D.tsx: PA5 ist das EINZIGE Paket. **Cluster B**
  DesignWorkspace.tsx + PlanView.tsx: NUR Fable (E8-Nachzug).
  **plan-hit-test.ts: exklusiv PA2** (nur der locked-Zweig — die
  VERSCHIEBBAR-Erweiterung ist NICHT Teil dieser Version, D9).
  Inspector.tsx gehört PA2 (kein anderes Paket fasst ihn an).
  NodeCanvas.tsx gehört PB6a (Tag B). section.ts exklusiv PA1.
- Worktrees + npm install; Agenten-Ports 5174–5177, Fable 5183; Preview
  IMMER aus apps/kosmo-orbit/; Foreground-Dispatch, Copy-back per cp,
  absolutes cd, pkill-Bracket solo; Build/Start/Prüfung NIE verkettet;
  **Worktree entfernen sofort nach bestandenem Gate** (Lehre v0.8.8).
- Tagesschnitt: **Tag A** PA1 ‖ PA2 ‖ PA5 parallel + Fable
  (Blattverzeichnis-Subspez, GOLDEN-WECHSEL-089 Teil 1,
  Paletten-Kandidaten rechnen). **Tag B** PB3 (nach Subspez) ‖ PB6a ‖
  optional PB6b-Eval + Fable (Owner-Paletten-Wahl einholen + Overrides,
  E8-Nachzüge nach Kapazität). **Tag C** Fable: gemeinsamer
  Golden-Lauf (E5 Teil 2), Matrix, verschlanktes Release.

## 5 · Golden-Politik

Referenz **37 Dateien (36 SVG + 1 IFC)**, svg-qa deckt 36. Bestand
byte-still (Sanktion 1); einzige erlaubte Veränderung: **additive**
PB3-Goldens (+N, mit Guard nach 083-Muster). Prognose gesamt: 0
bewegt / +N neu — der Tag-C-Lauf beweist es (E5).

## 6 · Sanktionen

1. Bewegter Bestands-Golden ohne Fable-klassifizierten Hard-Stop =
   Paket ungültig.
2. `locked`-Visualisierung im derive-SVG-Pfad (Schloss-Symbol im
   Plan-SVG) = ungültig — Editor-Chrome ja, Plan nein.
3. `locked`-Element aus `pickEntityAt` entfernt (nicht mehr
   inspizier-/entsperrbar) = ungültig; die Sperre greift am
   Interaktions-Pfad (Drag/Griff/Löschen), nicht an der Findbarkeit.
4. Ebenen-Sichtbarkeits-Panel oder Sichtbarkeits-Logik an `meta.layer`
   = Scope-Bruch (Owner-Rahmung: reines DXF-Interop-Feld).
5. >2-Wand-Knoten im Schnitt still verschnitten statt kontrolliert
   ausgelassen = ungültig.
6. Fremde Hotspot-Dateien angefasst = ungültig; je Cluster EIN Paket;
   DesignWorkspace/PlanView nur Fable.
7. PB3 ändert sheetToSvg-Bestandspfade statt additiv zu bauen =
   ungültig (ausser die Erwartungsliste deklariert es VORAB und Fable
   hat freigegeben).
8. Port-Paletten-Override eingebaut OHNE dokumentierte Owner-Wahl =
   ungültig (E6 ist zweistufig).
9. Eval-Paket fasst pruefe-eval.mts an oder verlässt den @ref-Weg =
   ungültig.
10. Rundgang-PDF erzeugt oder Installer zugestellt = Ritualverstoss;
    Build-Request NICHT angestossen = C-12 rot.
11. Hintergrund-Warten = Weckruf + Protokollvermerk.

## 7 · Vollständigkeits-Matrix (Abnahme Tag C)

- [ ] **C-1** Wand↔Wand-Schnitt: Zwei-Wand-T-Stoss/Eck im Schnittband nach Priorität verschnitten; ungleiche assemblyId/Prioritäten getestet; >2-Knoten kontrolliert ausgelassen (kein stilles Falschbild) → PA1
- [ ] **C-2** Die 3 Schnitt-Goldens sha256-identisch + früher GOLDEN_UPDATE-Probelauf belegt; RE-ARCHICAD-Schnitt-Zeile nachgezogen → PA1
- [ ] **C-3** ebeneSetzen/sperren: DXF-Layer-Override wirkt (String-Assertion), locked blockiert Verschieben/Griff/Löschen, Element bleibt findbar + entsperrbar (Unit + E2E) → PA2
- [ ] **C-4** Kein Schloss im Plan-SVG, svg-qa 36/0, Bestands-Goldens still; RE-ARCHICAD-Ebenen-Zeile nachgezogen → PA2
- [ ] **C-5** Blattverzeichnis: listet die Blätter des Publikations-Sets korrekt und aktualisiert bei Blatt-Änderung (Unit + E2E) → PB3
- [ ] **C-6** Sammellegende: aggregiert die Pro-Blatt-Legenden des Sets ohne Duplikate; Subspez-Signaturen eingehalten → PB3
- [ ] **C-7** Additive Goldens: +N exakt wie Erwartungsliste, Guard beweist Bestand still (git status Trefferzahl == N) → PB3
- [ ] **C-8** Treppen-3D: a/b(/ecke) in 3D ziehbar, Commit über treppeGeometrieSetzen, ID/Form/Breite stabil, Griffe nur bei Einzelauswahl, e2e-Spec grün → PA5
- [ ] **C-9** GOLDEN-WECHSEL-089.md: Erwartungsliste VOR den Landungen, Tag-C-Lauf Ist==Prognose (0 bewegt / +N), vierstufige Verifikation dokumentiert → Fable
- [ ] **C-10** Port-Paletten: Kandidaten rechnerisch ≥3:1 in beiden Themes, Owner-Wahl dokumentiert, Overrides + Kommentar-Nachzug, vis-token-Spec erweitert → Fable
- [ ] **C-11** Kollaps-Fix: Klick im Kopf-Bereich neben dem Glyph toggelt Kollaps (kein Drag-Start), force:true an beiden Stellen entfernt, Spec grün ohne force → PB6a
- [ ] **C-12** Verschlanktes Ritual komplett: Matrix, lehren/v0.8.9.md, Sechs-Träger-Bump, Neuigkeiten (ehrliche Grenzen), §0-Delta, Notiz (Owner-Testpause + Smoke-Puffer-Zeile), release-gate 0, Build-Request-Push — NACHWEISLICH kein PDF/keine Zustellung → Fable

## 8 · Ehrliche Nicht-Ziele

VERSCHIEBBAR-Erweiterung furniture/beam/boundary/etikett (D9 →
0.8.10-Kandidat) · Ebenen-Sichtbarkeits-Panel/Kombinationen ·
Schloss-Symbol im Plan-SVG (wäre eigener additiver Golden-Zug) ·
Treppen-z-Griff (Geschosshöhen-Editing) · >2-Wand-Knoten im Schnitt
(Parität Grundriss) · Inspector-Vollausbau der neuen editableFields
(bleibt selektiver Nachzug-Pool) · breiter Eval-Ausbau (~85 offene
Commands — nur der E8-Fokus) · Coverage-Report-Werkzeug für die Eval ·
Stimmungs-Token-Paletten (kein Kontrast-Fall) · ÖREB-Live/swisstopo-mcp
(0.9.x, D9-Befund 0.8.8 gilt) · Rundgang-PDF + Installer-Zustellung
(bis 0.9.0) · HomeStation-/Owner-Konto-Posten.

## 9 · Nachtrag «Blender-Werkbank» (eingefroren 19.07.2026, Owner-Auftrag)

> Owner wörtlich: «baue blender tools nach deinen empfehlungen alles ein
> was du für gut findest. packe es noch in diese version hinein.»
> Shortlist (Fable, freigegeben): Cycles-Anbindung, Sonnenstunden,
> Line-Art, glTF-Härtung, Bake-Rückweg. **Owner-Entscheid per Rückfrage:
> die bpy-Regel (ROADMAP 179, «kein Blender-Python-Skript im Repo»)
> BLEIBT in 0.8.9 — Drehbuch-only; der testbare
> Python-Worker-Runner-Mittelweg (lora_empfaenger-Vorbild) ist festes
> 0.8.10-Paket.** Lizenz: OWNER-MANDAT «kein GPL-Link» — nur
> Prozessgrenze (Worker) und Apache-2.0-Teile; die glTF-Härtung ist
> reiner Eigenbau (keine Attribution nötig, ehrlich benannt).
> Ehrlichkeitsregel (vier Fundstellen, bindend): **Bilder dürfen
> markierte Fakes sein, Physik-Zahlen nie**; Bake/Decimate =
> Geometrie-Klasse mit Optimierungs-Behauptung → endet im Container
> IMMER `kein-blender-worker`, nie Pass-Through.

### Entscheide E9–E13 (bindend)

- **E9 Bridge/Verträge** (PBL1): `render-scene.ts` `style.mode` additiv
  um `'lineart'`; `render-result.ts` `RenderJob.requested_style?`
  (main.py spiegelt aus scene.style.mode, analog requested_engine);
  NEU `bake-job.ts` (kosmo.bake-job/v1: BakeJobScene mit
  geometry/params{textureSize?,unwrap:'smart-uv',decimateRatio?}/out,
  Präfix `bake-` mit eigener Regex, Status wortgleich zu
  BlenderSimJobStatus inkl. `kein-blender-worker`, approval_token
  CONFIRMED_BAKE_, BakeResult{baked_glb,method,triangles_before?/after?});
  `blender-sim.ts` additiv um `SonnenstundenResult`
  (kosmo.sonnenstunden-result/v1: stunden/kriteriumErfuellt/methode)
  als `BlenderSimJob.result?` + params-Schlüssel-Kommentar
  (lat/lon/datum ISO, optional kriteriumStunden); bridgeRoutes.jobsBake;
  main.py: POST /jobs/bake nach create_blender_sim_job-Muster
  (_read_capped, out serverseitig erzwungen), Fake-Worker-Zweig
  `kind:'bake'` VOR dem generischen queued-Zweig → SOFORT
  kein-blender-worker (nie running/done); get_job liest
  bake-result.json; README «Worker andocken» + Drehbücher für
  Bake (Smart-UV vor Bake), Line-Art (Freestyle/Grease-Pencil-Line-Art
  headless), Sonnenstunden (Sampling-Konvention).
- **E10 Line-Art** (PBL2): KEIN neuer Job-Typ — reitet auf der
  vis--Render-Kette; Trigger AUSSCHLIESSLICH in der AUSTAUSCH-Insel
  (NodeCanvas ist PB6a-exklusiv, Sanktion 13); `mode:'lineart'`
  erzwingt client-seitig `vis.skip:true` (eine Strichzeichnung wartet
  nie auf einen KI-Schritt).
- **E11 Sonnenstunden-Client** (PBL2): eigene Insel
  `island/inhalte/sonne.tsx` mit eigenem Datum-State (KEIN Doc-Feld,
  Laufzeit ≠ Modell); params={lat,lon,datum} aus `doc.settings.standort`
  NUR GELESEN (design.ts ist PA2-exklusiv, Sanktion 14); client-seitige
  Zod-Validierung des params-Shapes VOR dem Senden; Container zeigt den
  `kein-blender-worker`-Status mit Bridge-message WORTGLEICH — keine
  erfundene Zahl, keine «ungefähr»-Formulierung; echte Zahlen NUR aus
  `result` eines done-Jobs (echter Worker am Gerät).
- **E12 glTF-Härtung** (PBL3): `extras{entityId,kind,geschoss}` je Node,
  Geschoss-Hierarchie (ein Node je Storey mit children statt flacher
  Liste), `doubleSided:true` an den Materialien, totes
  KIND_LABEL-Mapping (furniture/zone — von deriveAll nie geliefert)
  ENTFERNEN; EIGENE test/gltf.test.ts (JSON-Chunk rückparsen);
  KEINE UVs/Texturen/Tangenten/Kameras (Unwrap = Worker-Aufgabe;
  MeshData-Erweiterung würde scene.ts berühren = PA1-Nachbarschaft).
  Bestands-Inline-Tests in kernel.test.ts bleiben als Regression.
- **E13 Label-/Herkunftskette** (PBL2): `BILD_LABEL_FAKE_RENDER` wird
  Funktion `bildLabel({worker?,requestedStyle?})` — worker fehlt oder
  'fake-worker' → «Vorschau (Fake-Render)»; requestedStyle 'lineart' →
  «Strichzeichnung (Line-Art)»; sonst «Render (Cycles)»; der
  Aufnahme-Pfad bekommt das eigene, ehrliche Label «Aufnahme (Viewport)»
  (ein Screenshot war nie ein Fake-Render). Der Echt-Zweig ist im
  Container NIE erreichbar (Fake-Bridge liefert immer worker
  'fake-worker') — er wird per Unit-Test mit künstlichem JobRecord
  bewiesen und GENAU SO als unbewiesener Live-Pfad dokumentiert.

### Betrieb Tag B' (bindend)

Welle 1 parallel: **PBL1** (contracts/* + main.py + test_bridge_haerte
+ README) ‖ **PBL3** (derive/gltf.ts + test/gltf.test.ts). Welle 2
NACH PBL1-Gate parallel: **PBL2** (vis-jobs.ts, NEU
blender-jobs-runtime.ts, island: katalog+index+sonne.tsx+austausch.tsx,
NEUE e2e/blender-bridge.spec.ts) ‖ **PBL4** (AssetWorkspace.tsx
«Ins Modell laden» via bestehendem setGlbContext — KEIN Viewport3D-Edit;
asset-bibliothek.ts nur falls Titel-Konvention; Insel-Trigger).
Kein Blender-Paket berührt NodeCanvas/design.ts/DesignWorkspace/
PlanView/Viewport3D/sheet/publikation/blattlayout. EEVEE (A2) fällt —
die praktisch-gratis-Prüfung war negativ (eigenes Engine-Feld + zweite
Label-Kette ohne Shortlist-Mandat).

### Sanktionen 12–15

12. Ein Bake-/Decimate-Ergebnis, das im Fake-/Container-Betrieb ein
    unverändertes oder erfundenes GLB als «gebackt» ausliefert, statt
    kein-blender-worker zu melden = ungültig.
13. NodeCanvas.tsx von einem Blender-Paket angefasst = ungültig
    (PB6a bleibt exklusiv; Line-Art-Node-UI ist 0.8.10-Kandidat).
14. design.ts angefasst oder neues Doc-Feld für Sonnen-Params =
    ungültig (PA2 bleibt exklusiv; Job-Params statt Doc-Feld).
15. bpy-Skript im Repo = ROADMAP-179-Bruch (der Runner-Mittelweg ist
    per Owner-Entscheid 0.8.10, nicht 0.8.9).

### Matrix-Erweiterung (Abnahme Tag C, zusätzlich zu C-1…C-12)

- [ ] **C-13** Bake-Job: bake--Contract Fünfschritt komplett, Fake-Zweig meldet kein-blender-worker SOFORT (nie running/done im Container), Härtetest-Block grün (Präfix-Regex, out-Injektion, 400, 413, Freigabe-Symmetrie) → PBL1
- [ ] **C-14** Line-Art: mode 'lineart' erzwingt vis.skip:true (Netzwerk-Mock beweist das gesendete JSON), AUSTAUSCH-Insel-Checkbox löst aus, NodeCanvas.tsx unberührt (git diff beweist es) → PBL2
- [ ] **C-15** Sonnenstunden: eigene Insel mit Datum-Input, params aus doc.settings.standort nur gelesen, design.ts unberührt, kein-blender-worker-Anzeige wortgleich ehrlich → PBL2
- [ ] **C-16** glTF: extras/Hierarchie/doubleSided vorhanden, gltf.test.ts grün, kein UV-/Texturexport, KIND_LABEL bereinigt, Bestands-Inline-Tests grün → PBL3
- [ ] **C-17** Label-Kette: Fake bleibt «Vorschau (Fake-Render)», Aufnahme «Aufnahme (Viewport)», Echt-Zweig per Unit-Test mit künstlichem JobRecord erreicht und als Container-unerreichbar dokumentiert; Bake-Trigger schreibt NICHTS in den Asset-Vault ohne done → PBL2/PBL4

### Nicht-Ziele des Nachtrags

Wind-/Energie-UI (Contract-Arten existieren, kein Client) · EEVEE ·
Line-Art als Node-UI (0.8.10 nach PB6a) · echte bpy-Worker/
HomeStation-Abnahme (Geräte-Termin; Drehbuch-only per Owner-Entscheid) ·
Worker-Runner-Mittelweg (festes 0.8.10-Paket) · UV-/Textur-Export aus
gltf.ts · Bake-Ergebnis als editierbares Mesh (nur setGlbContext-
Referenz-Weg; glb-zu-mesh verlöre die AO-Textur).
