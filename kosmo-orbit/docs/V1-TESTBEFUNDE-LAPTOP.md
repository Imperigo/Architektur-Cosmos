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

## Batch T2 — Render-Bugs 3D & 2D ⏳
- [ ] **3D-Wände verbuggt**: nur innenliegende Textur sichtbar, Rest transparent
      (Material einseitig / Backface / Normalen).
- [ ] **Treppe** ebenfalls: Textur transparent/verbuggt in 3D.
- [ ] **Grundriss: Wände verbinden sich nicht sauber** — komische Ecke
      (Poché-Join/Verschneidung an der Kante).
- [ ] **Betontextur im Grundriss falsch** (Schraffur/Material stimmt nicht).

## Batch T3 — ArchiCAD-Zeichenhilfen & Navigation ⏳
- [ ] Zeichnungs-**Hilfslinien** + **Shift = Achse fixieren** (ortho/winkel).
- [ ] **Pan/Orbit** wie ArchiCAD/Blender, mit **Hover-Symbolen** (drüberfahren
      zeigt, was es tut).
- [ ] **Achslinie der Wand unsichtbar** machen (2D & 3D — nur Bauteil, nicht die
      Konstruktionsachse zeigen).
- [ ] ArchiCAD-**Tastenkürzel** fürs Zeichnen nachbauen.

## Batch T4 — Konkrete Feature-Bugs ⏳
- [ ] **KosmoVis** läuft auf einen Fehler (Crash) — Ursache finden + fixen.
- [ ] **Publikations-Set „speichern" passiert nichts** — Persistenz/Feedback.
- [ ] **KosmoReference**: Projekt mit 3D-Skizze lässt sich **nicht ins
      Environment ziehen** — Fehlermeldung.
- [ ] **Pop-up-Boxen**: Text läuft über; Pop-ups sollen **nicht scrollbar** sein
      → Layout reorganisieren, dass es aufgeht.

## Batch T5 — Freies Skizzieren ⏳
- [ ] **Frei zeichnen** statt Auto-Korrektur je Strich: alles zusammen zeichnen,
      dann gemeinsam übergeben (Batch-Commit).
- [ ] Stift wirkt **zu dick** → dünner/feiner.
- [ ] **Im 3D skizzieren** geht nicht → ermöglichen.

## Batch T6 — Berechnungsliste: projektabhängige Kennzahlen ✅ (ROADMAP 139)
- [x] Default hat **keine** wettbewerbsspezifischen Zeilen mehr (leerer Zustand
      + Hinweis); «marktgerecht/preisgünstig …» erscheinen nur, wenn ein Projekt
      ein Raumprogramm setzt (TKB-Demo, `design.raumprogrammSetzen`).

## Batch T7 — Oberflächen-Systematik (gross) ⏳
- [ ] **Hauptmenü gruppieren** statt flach: KosmoDraw/Sketch/Vis gehören unter
      **KosmoDesign**; ebenso **KosmoData**-Gruppe; **Platzhalter** für die neuen
      V2-Abteilungen.
- [ ] **Werkzeugleisten** wie **Blender & ArchiCAD** einrichten
      (kontextbezogen, andockbar).
- [ ] **Projekt-Lebenszyklus**: eine Projektdatei lebt Jahre — Tabs wie „Phase"
      und „Wettbewerb" müssen **nicht dauernd oben** präsent sein.
- [ ] **Hierarchie-/Wichtigkeits-/Fokus-Konzept** für die GESAMTE Oberfläche:
      je Tool/Taste/Dropdown entscheiden, wie wichtig & wie oft gebraucht →
      danach die Oberfläche systematisch gestalten. (Kombiniert mit Serie E/F.)

## Sonderpunkte (eigene Abklärung/Batch) ⏳
- [ ] **Cloud-Anmeldung mit Abo** statt nur API-Key: Kosmo-Cloud soll auch mit
      einem **Claude-Abo** (Pro/Max, OAuth) nutzbar sein, nicht nur mit
      API-Schlüssel. → Technische Abklärung (OAuth-Anmeldeweg) + ehrliche
      Umsetzung.
- [ ] **Splat aus Video** (Owner-Korrektur 05.07.): NICHT HomeStation-exklusiv.
      Zwei Stufen sauber trennen:
      1. **Konvertieren/aufbereiten/anzeigen** (`.ply` ↔ `.splat`/`.ksplat`,
         komprimieren, zuschneiden) — läuft **komplett lokal im Browser** (wie
         PlayCanvas SuperSplat, kein GPU-Training). → voll lokal bauen.
      2. **Video → Splat erzeugen** (SfM + Splat-Optimierung) — rechenintensiv,
         aber machbar: lokal (Laptop langsam, 5090 schnell) und/oder Anbindung
         an einen Web-Konverter. Unterschied ist **Tempo**, nicht «geht nur
         zuhause» — also echten In-App-Weg bauen, ehrlich nach Geschwindigkeit
         beschriftet, NICHT auf die HomeStation gaten.

## Prinzip
Ehrlichkeit vor Politur: Was echte GPU/HomeStation/ein Konto braucht (Splat aus
Video, evtl. Abo-OAuth), wird offen benannt statt vorgetäuscht. Jeder Batch:
grün getestet, Goldens byte-stabil, eigener Push.
