# V087-SPEZ — v0.8.7 «Verortet» (eingefroren 19.07.2026)

> Drei Owner-bestätigte Tagespläne EINER Version: A «Kern & Feinschliff» /
> B «Verorten & Aufziehen» / C «Abnahme & Release» — EIN Release am Tag C.
> Owner-Entscheide (19.07., AskUserQuestion): **ÖREB light JA inkl.
> CSP-Freigabe `api.geo.admin.ch`** · **3D-Marquee JA, ohne Occlusion** ·
> Name **«Verortet»**. Arbeitsmodell: Fable = Spez/Urteil/Gates/Commits/
> Nachzüge; Sonnet-Pakete in disjunkten Dateikreisen, maximal parallel.
> Format-Vorbild: `V086-SPEZ.md`; Lehren-Grundlage:
> `wissen/training/claude/lehren/v0.8.5.md` + `v0.8.6.md`.

## 1 · Auftrag

Die offenen Punkte aus 0.8.5/0.8.6 schliessen (Owner: «nimm deine offenen
punkte noch rein») und die Standort-Kette um den ÖREB-Betroffenheits-Blick
verlängern. Kein Punkt ohne Fundstellen-Beleg; alles adversarial
gegengeprüft (2 Explore- + 1 Plan-Agent, 19.07.).

## 2 · Verifizierte Diagnosen (D1–D8, je mit Fundstelle)

- **D1** 3D-Auswahl-Highlight «Kupfer-Glut» emissiv 0.35 ist fürs Auge
  schwach (`Viewport3D.tsx:1992-2001`; ROADMAP 493 «Kandidat für eine
  Sichtbarkeits-Politur»). Je Entity-Mesh existiert bereits ein
  begleitendes `THREE.LineSegments`-Kantenobjekt (`:1482-1492`) —
  Outline per Material-Swap ist OHNE neue Lib möglich.
- **D2** KAMERA-HUD pollt fix alle 400 ms (`Viewport3D.tsx:500-524`,
  `setInterval`) → Anzeige hinkt Kamerabewegungen bis 400 ms nach.
  camera-controls (^3.1.2) emittiert `control`/`update`/`rest`-Events.
- **D3** `onMarqueeAuswahl` ist seit v0.8.5 deklariert
  (`Viewport3D.tsx:188`) und app-seitig verdrahtet
  (`DesignWorkspace.tsx:1089`), wird 3D-seitig aber NIE gefeuert. Kein
  three-mesh-bvh im Bundle → Frustum gegen Boundingboxen. Gesten-Gefahr:
  camera-controls-Capture (`:1848`).
- **D4** `projiziereOeffnungCenter` lebt byte-identisch doppelt
  (`PlanView.tsx:59-68` / `DesignWorkspace.tsx:243-252`; ROADMAP 491
  «bewusst dupliziert … Kandidat»); die Umkehrung `wandAchsenPunkt`
  (`PlanView.tsx:74-78`) teilt die Formel mit `oeffnungWeltpos` in
  `plan-hit-test.ts`.
- **D5** `RAUMGRAPH_FARBE = '#2455a4'` (`PlanView.tsx:189-191`) wartet
  laut W5-Bericht 0.8.5 auf ein **theme-invariantes** aura-Token; der
  Kommentar verbietet `var(--k-accent)` ausdrücklich. D4+D5 liegen in
  DERSELBEN Datei → ein Paket (Gegenprüfungs-Fund).
- **D6** Stair-Entity ist komplett (`entities.ts:293`: a/b/width/
  form gerade|podest|u|l/ecke), `derive/treppe.ts` liefert
  `treppenTeile` inkl. Steigungs-Spec; es gibt NUR
  `design.treppeErstellen` (`design.ts:1259`; wirft: Lauf <1 m,
  L ohne ecke, riser >200 mm) — kein In-Place-Setter, keine Griffe.
  grep `registerCommand` 19.07.: `treppeGeometrieSetzen` ist FREI.
- **D7** Standort-Kette Stand 0.8.6: `StandortSuche`
  (`DesignWorkspace.tsx:4772+`, api3.geo.admin.ch SearchServer/Identify),
  persistente Settings `standort` + `standortAdresse` (beide Commands in
  EINER history-Gruppe), CSP `tauri.conf.json:39` kennt NUR
  `api3.geo.admin.ch`. ÖREB braucht `api.geo.admin.ch` (neue Domain,
  Owner-Freigabe liegt seit 19.07. vor). grep: `oereb` kommt im Code
  nirgends vor — Setting-Name frei.
- **D8** Eval-Prüfer `pruefe-eval.mts` (wissen/training/eval/…) spielt
  laufplan-Erwartungen über den Mehrfach-Command-Proposal-Weg ab und
  prüft das `lauf_planen`-Tool-Format NICHT (Kopfkommentar + ROADMAP 487
  ehrliche Grenze). `ScriptedProvider` reicht beliebige Tool-Namen durch
  (`scripted.ts:182-188`), `onLaufVorschlag` ist exportiert — der Weg
  existiert, ist nur nicht verdrahtet.

## 3 · Entscheide (E1–E7, bindend)

- **E1 `design.treppeGeometrieSetzen`** (Kernel, in-place): params
  `{entityId, a?, b?, ecke?}` — patcht NUR die übergebenen Punkte,
  Identität/width/form/storeyId bleiben (Objekt-Spread, Muster
  `wandGeometrieSetzen`; Stair hostet nichts → kein Öffnungs-Sonderfall).
  Wurf-Regeln VOR jedem Patch, auf der NEUEN Geometrie identisch zu
  `treppeErstellen`: Gesamtlauf <1 m wirft; form 'l' ohne (bestehende
  oder neue) ecke wirft; Steigungs-Gate via `treppenTeile` (riser >200
  wirft mit minRun-Meldung); zusätzlich degeneriert (a≈b, a≈ecke, ecke≈b
  unter 1 mm) wirft. `ecke` ist nur bei form 'l' zulässig (sonst wirft).
  EIN Patch-Bündel = EIN Undo.
- **E2 Projektions-Util in den Kernel:** `projiziereOeffnungCenter` +
  `wandAchsenPunkt` ziehen als pure, exportierte, unit-getestete
  Funktionen nach `packages/kosmo-kernel` (Ablage neben
  `plan-hit-test.ts`; Präzedenz `loeseLaufPlanRefs`). **Byte-genau**
  inkl. `Math.round`-Positionen; Unit-Tests mit Ist-Werten der heutigen
  App-Kopie. App-Duplikate fallen in PA4 (Fable).
- **E3 3D-Highlight:** Auswahl schaltet das per-Entity-Kantenobjekt auf
  einen kräftigen Akzent (Material-Swap Farbe+Opacity+ggf. linewidth-
  Ersatz über Depth-Test), Emissiv darf bleiben/steigen; KEINE neue Lib,
  kein Postprocessing. `prefers-reduced-motion` respektieren, falls
  Puls. Beweis: Pixel-Readback gewählt ≫ heutige +22 R; ungewählte
  Entities rendern byte-gleich.
- **E4 KAMERA-HUD ereignisbasiert:** Subscribe auf
  `control`/`update`/`rest` mit rAF-Throttle schreibt den
  chromeSnapshot; der 400-ms-Poll bleibt als Fallback für
  nicht-event-getriebene Werte (Canvas-Rect, Kontext-Zähler). Cleanup
  meldet alle Listener ab.
- **E5 3D-Marquee (ohne Occlusion):** **Shift-Drag** auf dem Canvas =
  Marquee (Modifier-Bindung; ohne Shift bleibt camera-controls
  unangetastet — kein Modus-Toggle, kein Capture-Krieg). Overlay-Rechteck
  in Screen-Space; Auswahlmenge = Entities, deren Boundingbox das aus dem
  Rechteck gebaute `THREE.Frustum` schneidet; feuert
  `onMarqueeAuswahl(ids, {additiv: true})` (additive Semantik wie 2D).
  Esc bricht die laufende Geste ab. Occlusion ist ehrliches Nicht-Ziel
  (Frustum sieht durch Wände — steht wörtlich in den Neuigkeiten).
- **E6 ÖREB light:** Kette LV95 (aus `settings.standortAdresse`) →
  GetEGRID (`api.geo.admin.ch/rest/services/ech/SearchServer` bzw.
  Identify-Weg) → ÖREB-Extract → **Themen-Betroffenheitsliste**
  (Thema betroffen ja/nein) als Anzeige im Standort-Panel + Zeile/Karte
  in KosmoData. Neues Setting `oerebAuszug` (SettingsPatch-Muster
  `standortAdresse`: `before` explizit `?? null`, additiv, fromJSON-
  Roundtrip), Abruf schreibt es per neuem Command
  `design.oerebAuszugSetzen` (grep-belegt frei); Undo entfernt es.
  **Pflicht-Hinweis** im UI: «Auszug light — kein rechtsgültiger
  ÖREB-Auszug.» Fehler/Offline = ehrliche Fehlerzone, kein stiller
  Leerlauf. **Fixture-first:** die page.route-Fixture
  (nachbarn-import.spec:36-81-Muster) definiert den Vertrag, Live-Abruf
  folgt. Reissleine Mittag Tag B: Extract-Parsing frisst → Reduktion auf
  reine Themencode-Liste. CSP: GENAU `https://api.geo.admin.ch`
  zusätzlich, als eigener atomarer Fable-Commit mit Owner-Freigabe-Beleg.
- **E7 Eval `lauf_planen`-Format:** neues `erwartung.typ:
  'lauf-vorschlag'` in `pruefe-eval.mts`: SkriptZug mit EINEM
  `lauf_planen`-toolCall; Prüfer registriert `onLaufVorschlag`, prüft
  `LaufVorschlag.plan` (Titel + Schrittfolge commandId+Kernparameter)
  UND dass KEIN `onProposal` feuert (Vorschlag ≠ Ausführung) UND dass
  ein Negativ-Prompt mit erfundener commandId als Tool-Fehler abgewiesen
  wird (keine Karte). Nur wissen/training/eval/** wird berührt.

## 4 · Betrieb (bindend)

- **Konfliktcluster A** `Viewport3D.tsx`: PA2 (Tag A) und PB2 (Tag B) —
  nie gleichzeitig. **Cluster B** `PlanView.tsx`+`DesignWorkspace.tsx`:
  PA4 (Fable) → PA5 (seriell danach, Tag A Nachmittag) → PB1 (Tag B).
  App.tsx/ui-zustand: nur Fable. Sanktion 5 gilt.
- Worktrees `/home/user/worktrees/<pkg>` + npm install; Agenten-Ports
  5174–5177, Fable 5183; Preview IMMER aus `apps/kosmo-orbit/`;
  Foreground-Dispatch mit nummeriertem Abschluss-Block; Copy-back per cp,
  NIE committen; absolutes cd je Bash; pkill-Bracket als eigener Aufruf.
- Reissleinen: PA5 L-Form (17:00 → a/b-Griffe, ecke benannter Aufschub) ·
  PB1 Mittag (Themencode-Liste) · PB2 16:00 (Marquee fällt auf 0.8.8,
  Owner wird am Abend informiert). Smoke-Funde schlagen Marquee.

## 5 · Golden-Politik

Komplett byte-still: kein Paket berührt `derive/`; svg-qa 36/0 und
sha256 HEAD↔Arbeitsbaum sind Gate JEDES Pakets.

## 6 · Sanktionen

1. Golden-Diff ≠ leer = Paket ungültig.
2. Treppen-Drag erzeugt neue Identität oder verliert ein Stair-Feld =
   ungültig (In-place-Gebot, Lehre v0.8.6 §2).
3. Projektions-Util-Umzug ändert Rundung/Clamp auch nur um 1 mm =
   ungültig (byte-genau oder gar nicht).
4. Eval-Zug, der `onProposal` auslöst oder Commands ausführt = ungültig
   (E4-Vertrag v0.8.6 gilt fort).
5. Fremde Hotspot-Dateien angefasst = ungültig; Nachzüge macht Fable
   atomar; je Cluster EIN Paket gleichzeitig.
6. Neue Hex-Farben statt Token = ungültig; Diagnosefarbe an `--k-accent`
   hängen = ungültig (PlanView:185-190 ist Vertrag).
7. CSP-Erweiterung ohne Owner-Freigabe-Beleg oder breiter als
   `https://api.geo.admin.ch` = ungültig; ÖREB-Anzeige ohne
   Rechtsgültigkeits-Hinweis = ungültig.
8. Marquee, der die Kamera-Geste ohne Shift kapert = ungültig.
9. Hintergrund-Warten = Weckruf + Protokollvermerk.

## 7 · Vollständigkeits-Matrix (Abnahme Tag C)

- [x] **C-1** Treppen-Endpunkt-Drag: EIN `treppeGeometrieSetzen`, ID/form/width/ecke bleiben, EIN Undo → PA1/PA5
- [x] **C-2** Degenerierte Treppe (Null-Länge, a≈ecke, ecke≈b, riser>200, ecke ohne form l) wirft VOR jedem Patch, Treppe unverändert → PA1
- [x] **C-3** Treppen-Griffe sichtbar NUR bei Einzel-Auswahl, Hit-Vorrang nach C-17-Muster (v0.8.5), andere Griffe unverändert → PA5
- [x] **C-4** Projektions-Util: EINE Wahrheit im Kernel, byte-gleiche Rundung (griffe.spec unverändert grün), grep findet kein Duplikat mehr → PA1/PA4
- [x] **C-5** Goldens byte-still + svg-qa 36/0 (sha256-Beweis) → alle
- [x] **C-6** 3D-Highlight: gewähltes Element deutlich hervorgehoben (Pixel-Readback ≫ +22 R), ungewählte byte-gleich, keine neue Lib → PA2
- [x] **C-7** KAMERA-HUD folgt der Bewegung ereignisbasiert (kein 400-ms-Nachhinken), Fallback-Poll nachweisbar, Listener-Cleanup → PA2
- [x] **C-8** Akzentwechsel ändert die Raumgraph-Diagnosefarbe NICHT (Computed-Style-Beweis); kein neuer Hex ausserhalb aura.css → PA4
- [x] **C-9** Eval: lauf-vorschlag-Erwartung prüft onLaufVorschlag-Plan, KEIN onProposal, erfundene commandId abgewiesen, Gesamtquote grün → PA3
- [ ] **C-10** Jeder Owner-Smoke-Fund 0.8.4–0.8.6: Fix ODER benannter Aufschub in der Release-Notiz — der Puffer verfällt nicht → PB3
- [x] **C-11** Standortsuche → ÖREB-Betroffenheitsliste (Fixture) + sichtbarer Hinweis «kein rechtsgültiger Auszug» → PB1
- [x] **C-12** `oerebAuszug` überlebt Reload/`.kosmo`, Undo entfernt ihn; Fehler/Offline → ehrliche Fehlerzone → PB1
- [x] **C-13** CSP: genau `https://api.geo.admin.ch` neu, kein Wildcard, Owner-Freigabe im Commit belegt → Fable
- [x] **C-14** Shift-Drag wählt Frustum-Schnitt via onMarqueeAuswahl (additiv wie 2D), Orbit ohne Shift ungestört, Esc bricht ab → PB2
- [x] **C-15** Release-Ritual komplett: Fan-out-Matrix, lehren/v0.8.7.md, Sechs-Träger-Bump, Neuigkeiten (ehrliche Grenzen benannt), §0-Delta (Rückwärts-Wächter verlangt 0.8.7), Release-Notiz, Rundgang-PDF gesichtet, release-gate 0, Installer+sha256+Zustellung, Owner-Smoke-Punkt → PC


### Ergebnis der Matrix-Abnahme (19.07.2026, ROADMAP 505)

13 unabhängige adversariale Prüfer (Workflow-Fan-out, je Zelle einer,
StructuredOutput; C-10 = Fable-Puffer-Nachweis, C-15 = Release-Ritual)
gegen den Live-Build auf :5183: **11/13 sofort bestanden, 2 echte Funde
— beide vor dem Release gefixt und regressionsgetestet:**

- **C-14 (Fund, ernst):** Marquee-Loslassen über der HUD-Karte
  (Dock-Float ausserhalb des Mounts) liess die Geste hängen — der
  nächste normale Klick feuerte eine Phantom-Auswahl mit alten
  Koordinaten. Fix: `setPointerCapture` im Marquee-Start (meshDrag-
  Muster) + pointerId-Stale-Guard; Regressionstest C-14f.
- **C-8 (Fund, klein):** der Graph-Toggle-Button färbte sich über
  literales `#2455a4` → konsumiert jetzt `var(--k-graph)`. Zwei
  verbleibende Alt-Hexes sind semantisch legitim und dokumentiert
  (Akzent-Palette definiert sich selbst; 2D-Canvas löst keine
  CSS-Variablen auf — Kandidat Canvas-Token-Brücke).

C-10: der Owner-Smoke-Puffer stand bereit, es traf keine Rückmeldung
ein — Leerstand benannt in Release-Notiz + ROADMAP 506 (kein
verschwiegener Aufschub). Zellen-Verdicts mit Beweisen im
Workflow-Journal; Details ROADMAP 505, Commit `163e41e`.

## 8 · Ehrliche Nicht-Ziele

swisstopo-mcp (Lizenz widersprüchlich ⚠ + MCP-Spec erst 28.07. — vor
jedem Einbau selbst verifizieren; 0.8.8+-Kandidat) · Autopilot-Auto-Start
(E4-Sanktion bleibt) · **Marquee-Occlusion** (Frustum sieht durch Wände)
· rechtsgültiger ÖREB-Auszug/PDF (nur Betroffenheitsliste) ·
zonenArt-Raumtyp-Erweiterung (Bedarf ungeklärt) · Treppen-Griffe im 3D ·
Golden-Sammelwechsel · HomeStation-Posten (VectorGym/HiVG/Render-Kette)
· kein Gizmo-Framework · keine Kernel-Mengen-Commands.
