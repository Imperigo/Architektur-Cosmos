# V1 Laptop-Test — Owner-Befunde & Fix-Plan (05.07.2026)

Andrins erste Anpassungen aus dem Laptop-Test von V1. Abgearbeitet in
verifizierten Batches (Muster wie Serie D: Sonnet baut → Opus prüft Gate +
volle E2E, Goldens byte-stabil → grüner Commit + Push). Reihenfolge nach
Vertrauens-/Nutzenwirkung: erst die «du hast gesagt es sei nachgebaut, ist aber
nicht da»-Kern-Interaktion, dann Render-Bugs, dann Features, dann die grosse
Oberflächen-Systematik.

## Batch T1 — 2D-Plan-Interaktion (ArchiCAD-Kern) ✅ (ROADMAP 138)
- [x] **Elemente anwählen** — Default-Werkzeug jetzt `auswahl`, Klick wählt,
      Auswahl-Highlight im 2D sichtbar, Inspector reagiert.
- [x] **Im Grundriss verschieben** — Klick-und-Ziehen = EIN `design.verschieben`
      (Undo-fähig); Command um Stütze/Treppe/Dach erweitert.
- [x] **Doppelklick zum Absetzen** — `onDoubleClick` (2D) + `onGroundDoubleClick`
      (3D) ergänzt.

## Batch T2 — Render-Bugs 3D & 2D ✅ (ROADMAP 141)
- [x] **3D-Wände** — invertierte Dreieckswindung (FrontSide-Culling cullte die
      Aussenfläche) korrigiert.
- [x] **Treppe** — gleicher Windungsfehler + Podest-Outline CCW korrigiert.
- [x] **Grundriss-Wandecke** — Poché-Flächenschwelle korrigiert (Putz wird an
      der Ecke sauber von der Dämmung beschnitten). Golden neu erzeugt.
      *(Rest-Grenze: echte 2D-Eck-Miter bleibt separater Auftrag.)*
- [x] **Betontextur** — SIA-Betontönung statt Papierfarbe, feineres Raster.

## Batch T3 — ArchiCAD-Zeichenhilfen & Navigation ✅ (ROADMAP 143)
- [x] **Hilfslinien + Shift=Ortho** (0/45/90°) + Fluchtlinien an bestehenden Punkten.
- [x] **Pan/Orbit + Nav-Leiste mit Hover-Tooltips** (Orbit/Pan/Zoom/Einpassen), 2D & 3D.
- [x] **Konstruktionsachse ausblendbar** (Stützenraster-Achse, Umschalter, Default aus).
      *(Einzige Achse im Code; falls andere gemeint — gegenprüfen.)*
- [x] **Zeichen-Shortcuts** W/Z/V/D/T/C/S/F/Esc im `?`-Overlay.

## Batch T4 — Konkrete Feature-Bugs ✅
- [x] **KosmoVis** läuft auf einen Fehler (Crash) — Ursache gefunden + gefixt
      (T4a, ROADMAP 140): `evaluiereGraph()` griff unbedingt auf `n.params[...]`
      zu; ein `VisNode` ohne `params` (fremder `.kosmo`-Import) liess die Station
      abstürzen. Jetzt defensiver Zugriff.
- [x] **Publikations-Set „speichern"** (T4a, ROADMAP 140): persistiert jetzt +
      Erfolgsmeldung statt stiller No-Op.
- [x] **Pop-up-Boxen** (T4b, ROADMAP 142): zentrale `.k-dialog`-Regeln (Textumbruch + Höhen-Deckel),
      Werkzeug-Setup/Stützenraster als Mehrspalten-Grid — kein Überlauf, keine Scrollbar mehr.
- [x] **KosmoReference** (T4c, ROADMAP 144): «Projekt mit 3D-Skizze lässt sich
      nicht ins Environment ziehen — Fehlermeldung» behoben. Ursache war eine
      hartcodierte, nie existierende Remote-URL; jetzt bevorzugt eine per
      KosmoAsset verknüpfte lokale GLB (offline, ohne CORS), mit Ladezustand
      + Erfolgsmeldung. Ohne lokale Quelle verspricht der Knopf kein Laden
      mehr, sondern zeigt eine ehrliche Meldung statt eines Fehler-Toasts.

## Batch T5 — Freies Skizzieren ✅ (ROADMAP 147)
- [x] **Frei zeichnen** statt Auto-Korrektur je Strich: beliebig viele Striche
      bleiben als Roh-Skizze liegen, erst «Übergeben» fittet alle gemeinsam
      (`fitStrokes()`), «Übernehmen» committet sie als EINE Undo-Gruppe.
- [x] Stift **dünner** — `getStroke`-Grösse 7→2.5, wirkt wie ein Fineliner.
- [x] **Im 3D skizzieren** ermöglicht — Freihand-Overlay im Viewport3D, projiziert
      auf die Bodenebene der aktiven Geschossebene (reine Geometrie in
      `sketch-3d.ts`), derselbe Batch-Fluss + derselbe `onSketchAccept`-Weg wie
      im 2D. *(Rest-Grenze: nur die horizontale Bodenebene, keine schrägen
      Flächen/Wände — separater, grösserer Auftrag.)*

## Batch T6 — Berechnungsliste: projektabhängige Kennzahlen ✅ (ROADMAP 139)
- [x] Default hat **keine** wettbewerbsspezifischen Zeilen mehr (leerer Zustand
      + Hinweis); «marktgerecht/preisgünstig …» erscheinen nur, wenn ein Projekt
      ein Raumprogramm setzt (TKB-Demo, `design.raumprogrammSetzen`).

## Batch T7 — Oberflächen-Systematik (gross) ✅ (ROADMAP 145)
- [x] **Hauptmenü gruppiert** statt flach: Stationen in drei Familien —
      **KosmoDesign** (Design/Draw/Sketch/Vis/Publish/Asset), **KosmoData**
      (Data/Prepare/Train), **KosmoBüro** (Dev/Doc); Kosmo/Speak eigenständig
      davor; vier **V2-Platzhalter** (ausgegraut). `state/stationen.ts`.
- [~] **Werkzeugleisten** — erste Ausbaustufe: dezente Sektions-Labels
      («Ansicht»/«Export»/«Ebenen») gruppieren die Werkzeuge lesbar. Ein voll
      andockbares Multi-Panel-System (Blender-Niveau) bleibt V2-Notiz.
- [x] **Projekt-Lebenszyklus**: SIA-Phase + Bemassungsstil aus der Werkzeugzeile
      ins **Projekt-Menü** (`projekt-menu-toggle`, Fokus-Stufe «selten»)
      umgehängt — nicht mehr dauernd oben, gleiche Commands/`data-testid`s.
- [x] **Hierarchie-/Fokus-Konzept**: drei Stufen primär/sekundär/selten
      (`state/fokus.ts`, `.k-primaer`/`.k-sekundaer`/`.k-selten`,
      `docs/OBERFLAECHE-FOKUS-SYSTEMATIK.md`), angewandt auf Kopfleiste +
      Zentrale. Weitere Verfeinerung läuft mit Serie E/F weiter.

## Sonderpunkte (eigene Abklärung/Batch) ⏳
- [x] **Cloud-Anmeldung mit Abo** (ROADMAP 146): «Mit Claude anmelden» (OAuth) in
      den Desktop-Editionen — `Authorization: Bearer` + `anthropic-beta:
      oauth-2025-04-20` statt `x-api-key`, Token über die lokale `ant`-CLI. Im
      Web/PWA ehrlicher Hinweis (Desktop nötig), API-Schlüssel-Weg bleibt. Voll
      grün (101 E2E). Rest zuhause: `ant`-CLI + echtes Abo am Owner-Konto.
- [x] **Splat aus Video** (Owner-Korrektur 05.07., ROADMAP 148): NICHT
      HomeStation-exklusiv. Zwei Stufen sauber getrennt gebaut:
      1. **Konvertieren/aufbereiten/anzeigen** — `writeSplatFile`/`cropSplat`/
         `decimateSplat` in `splat-import.ts` + neues `SplatPanel.tsx` laufen
         **komplett lokal im Browser** (kein GPU-Training): Import → Zuschneiden
         → Ausdünnen → «Als .splat exportieren». Voll lokal, wie versprochen.
      2. **Video → Splat erzeugen** — `video-splat.ts`: lokale Frame-Extraktion
         (`<video>`+`<canvas>`, echt) + ehrliche Übergabe an einen neuen Bridge-
         Endpoint `POST /jobs/video-splat`. Beschriftet ausdrücklich als
         Tempo-Frage («lokal (langsam) · HomeStation-5090 (schnell) ·
         Web-Konverter»), NICHT als Ortssperre. Die reale SfM-Optimierung
         selbst ist noch nirgends implementiert (weder lokal noch Bridge) —
         der Fake-Worker meldet das ehrlich als `"kein-sfm-worker"` statt ein
         Splat-Ergebnis vorzutäuschen. Rest-Grenze bleibt: echter SfM-Worker
         (COLMAP/nerfstudio o.ä.) an Laptop/5090/Web-Konverter anschliessen —
         eine Tempo-Entscheidung für einen künftigen Batch.

## Prinzip
Ehrlichkeit vor Politur: Was echte GPU/HomeStation/ein Konto braucht (Splat aus
Video, evtl. Abo-OAuth), wird offen benannt statt vorgetäuscht. Jeder Batch:
grün getestet, Goldens byte-stabil, eigener Push.
