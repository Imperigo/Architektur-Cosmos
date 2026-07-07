# V1.6-Auftrag — Plan (Fable-Chefdenker, 08.07.2026)

> Owner-Auftrag vom 07.07. abends: sechs neue Punkte nach dem grossen
> V2-Technik-Auftrag (Blöcke 1–3, v1.5 gebaut). Dazu die noch offenen
> Prioritäten 5–7 aus `V2-AUFTAKT.md`. Ehrlichkeit vor Politur — jeder
> Punkt trägt seine echten Grenzen im Plan, nicht erst im Nachhinein.

## 0. Antwort auf die Installationsmenü-Frage (P1, Ist-Stand)

**«Ist das Auswahlmenü drin?» — JA, seit V2-B1/B2:** Es gibt drei
Betriebsarten (`standard` = Full-HomePC · `remote` = HomePC-Client übers
Netz · `cloud` = Claude), als **drei separate Installer-Editionen** gebaut
(die Edition backt nur die Erststart-Betriebsart ein — umstellbar ist sie
jederzeit in den Einstellungen), plus den **Setup-Assistenten «Werkzeuge»**:
er kennt das komplette Werkzeug-Manifest je Betriebsart, erkennt live, was
erreichbar ist (Ollama, Bridge, Sync, Konto), und zeigt für alles Fehlende
den exakten, copy-fertigen Hol-Befehl.

**«Wird alles automatisch heruntergeladen?» — NEIN, bewusst noch nicht:**
Die schweren Brocken (LLM ~20 GB, Blender, ComfyUI/PyTorch, Whisper) sind
nicht in der .exe und werden aktuell NICHT vom Assistenten selbst geladen —
er zeigt den Befehl, der Nutzer führt ihn aus. **«Sind alle Versionen
funktionsfähig?»** Standard/Remote/Cloud starten und laufen; Cloud ist ohne
Zusatz-Downloads voll funktionsfähig (Claude-Konto genügt), Standard/Remote
brauchen die extern installierten Dienste. Das «alles automatisch»-Ziel ist
**Block A** dieses Plans.

---

## Block A — Auto-Setup: Ein-Klick-Installation der Werkzeuge (aus P1)

**Ziel:** Der Setup-Assistent führt fehlende Werkzeuge nicht nur vor, sondern
holt sie auf Knopfdruck — soweit ehrlich möglich.

**Architektur-Entscheide:**
- **A1 — Nur die Desktop-Edition kann installieren** (`istTauriDesktop()`):
  Ein Browser/PWA darf keine Prozesse starten. Der «Automatisch holen»-Knopf
  erscheint NUR im Tauri-Build; in der PWA bleibt der copy-fertige Befehl.
- **A2 — Tauri-Shell-Command mit Allowlist**, kein beliebiges `exec`. Je
  Werkzeug ein fest hinterlegtes Kommando (`winget install Ollama.Ollama`,
  `ollama pull …`, `pip install …`), plattformabhängig; der Nutzer bestätigt
  je Schritt (kein stiller Systemeingriff). Serie-I-konform: nichts ausserhalb
  der Allowlist, kein aus der App zusammengebauter Shell-String.
- **A3 — Fortschritt + Verifikation**: nach dem Lauf prüft der Assistent
  dieselbe Live-Erkennung wie heute (Ollama-Ping, Bridge-Health) und schaltet
  das Werkzeug auf «erreichbar». Scheitert der Download, ehrliche Meldung +
  der manuelle Befehl bleibt.
- **A4 — Ehrliche Grenze im UI**: die 20-GB-Modellgewichte kommen von Ollama/
  Huggingface, nicht von uns — Dauer/Grösse werden VOR dem Klick angezeigt.
  Kein Werkzeug wird ohne Nutzer-OK gezogen.

**Batches:** A-1 Werkzeug-Manifest um `installBefehl` je Plattform + Allowlist
erweitern (rein, testbar) → A-2 Tauri-Command-Runner + Capability (Desktop) →
A-3 Assistent-UI «Holen»-Knopf + Fortschritt + Re-Check → A-4 E2E (PWA zeigt
Befehl, Desktop-Pfad gemockt) + Doku INSTALL.md.
**Grenze:** Auto-Download NUR Desktop; Modellgewichte bleiben Nutzer-bestätigt.

---

## Block B — Immersive dynamische Oberfläche aufs ganze System (aus P2)

**Ziel:** Die adaptive Oberfläche (Serie J / J3, heute Werkzeugleiste +
Fokus-Profil) wird zum systemweiten, immersiven Erlebnis.

**Zuerst Fable-Konzept + Recherche (B-0):** Referenzen immersiver/adaptiver
Interfaces sichten (Blender-Workspaces & Kontext-Pies, ArchiCAD-Tab-Kontext,
Rhino/Grasshopper, «Zen/Focus»-Modi, räumliche UI aus visionOS/Figma-Canvas,
Motion-Design-Prinzipien) und daraus ein KosmoOrbit-eigenes Konzept ableiten
(`docs/SERIE-J2-IMMERSIVE-OBERFLAECHE.md`) — was übernehmen, was bewusst nicht
(Ehrlichkeit: keine Gimmicks, alles zurücksetzbar, Owner-Mandat Ästhetik).

**Bau-Richtung (nach Konzept):** stationsweite Tätigkeits-Adaption (nicht nur
KosmoDesign), ruhige Übergänge/Motion je Kontext, «Vertiefen»-Modus (Panels
treten zurück, das Werk in den Vordergrund), Layout lernt je Nutzer/Tätigkeit
— alles auf dem bestehenden `state/fokus.ts`/`state/stationen.ts`/
`oberflaeche-adaption`-Fundament, opt-out + Reset bleiben.
**Grenze:** Konzept vor Bau; jeder Adaptions-Schritt sichtbar + reversibel.

---

## Block C — Submissionsphase-Simulation + Unternehmer-Plan-Übernahme (aus P3)

Der grösste und wertvollste Block. Zwei Teile.

**C-0 — Recherche + Konzept (Fable):** `docs/SIM-SUBMISSION-KONZEPT.md`.
Was gehört in Schweizer Architektenpläne der **Ausschreibungs-/Submissions-
phase** (SIA-Phase 41 Ausschreibung, eBKP-Elementkostengliederung), damit ein
Unternehmer sauber offerieren kann: Detaillierungsgrad Werkplan-Niveau,
Ausschreibungspläne, **Baubeschrieb/Devis**, Mengen/Ausmasse (NPK-Positionen),
Materialisierung/Bauteilaufbauten eindeutig, Anschlüsse/Details, Toleranzen.
Kernsatz des Owners als Leitprinzip: **jedes undefinierte Element = spätere
Nachtragskosten** → der Architekt gibt maximal genau vor. Dazu: was
**Fachplaner/Unternehmer liefern** (HLKS-, Elektro-, Statik-Planer; die
werkstattnahen 2D-Werkpläne der Unternehmer-Planungsabteilungen).

**C-1 — Simulation «Projektstand überarbeiten für Submission»:** ein
E2E/Sim-Szenario (Serie-H-Harness) nimmt ein bestehendes Projekt und bringt es
auf Submissionsreife — Kosmo schlägt minuziös vor, was pro Bauteil definiert
sein MUSS, listet Lücken («undefinierte Elemente») als Kostenrisiko, erzeugt
den Ausschreibungs-Plansatz + Ausmass-Grundlage.

**C-2 — Unternehmer-Plan-Übernahme (das Herzstück, «vollautomatisch von
Kosmo»):** Der Architekt zieht den Plansatz des Unternehmers (2D, meist PDF/
DWG/DXF) in KosmoOrbit; Kosmo **analysiert, versteht was geändert/ergänzt
wurde, und übernimmt es in die Architektenpläne** (ersetzt den alten Stand).
- Ehrliche Architektur-Realität: DXF-Import besteht (`derive/dxf.ts`),
  PDF/DWG-Verständnis ist ein KI-/Vision-Problem. **Stufenplan:** (a) DXF/DWG-
  Geometrie-Diff → Vorschläge als Diff-Karten (durch den bestehenden
  runCommand-Weg, Undo-fähig); (b) PDF/Bild → Kosmo-Vision (Cloud-Opus oder
  HomeStation-Modell) liest Änderungen und schlägt Commands vor; (c) der
  Architekt bestätigt je Diff (nie stилле Ersetzung — Bau-Verantwortung).
- **Grenze offen benannt:** die vollautomatische, fehlerfreie Übernahme
  beliebiger Unternehmer-PDFs ist KI-Reife-abhängig; v1.6 liefert den
  verlässlichen DXF/DWG-Diff-Weg scharf + den Vision-Weg als ehrlich
  markierten Vorschlags-Assistenten (Mensch bestätigt).

---

## Block D — Wettbewerbsphase-Simulation + automatisierte Grundlagenstudie (aus P4)

**D-0 — Recherche + Konzept (Fable):** `docs/SIM-WETTBEWERB-KONZEPT.md`.
Was ein Architekt am Anfang eines Wettbewerbs (Beispiel: Wettbewerb Zug)
aufnimmt: Programm/Raumprogramm, Standort/Parzelle, **Zonenordnung/BZO/
Baugesetzgebung** (Ausnützung, Höhen, Grenzabstände — vieles davon kennt der
Zonenregel-Katalog schon), Klima/Sonne, Kontext/Städtebau, Referenzen.

**D-1 — Automatisierte Extremvarianten-Grundlagenstudie:** Kosmo baut
vollautomatisch die **erste Grundlagenstudie** und legt sie dem Architekten
als Übersicht vor: Extremvolumen (max. Ausnützung vs. min. Fussabdruck etc. —
baut auf `derive/volumenstudie.ts`/Varianten-Matrix), Raumprogramm-Varianten
(Segmentierer), Klimastudien (Sonne/Schatten existiert), mögliche Baustile
(Render-Stimmungen), mögliche Tragwerke (Raster/Stützen/Spannweiten-Heuristik).
Ziel: **möglichst viel aufnehmen, vorbereiten, darstellen** — eine
Wettbewerbs-Grundlagen-Übersicht als ein Klick.
**Grenze:** Kosmo bereitet auf und stellt dar — die Entwurfsentscheidung
bleibt beim Architekten (kein «Kosmo entwirft den Wettbewerb»).

---

## Block E — Interaktiver Kosmo-Starter-Guide beim Erststart (aus P5)

**Ziel:** Beim ersten Start erklärt Kosmo das Programm interaktiv, intuitiv,
dynamisch (nicht ein statisches Tutorial-PDF).

**Bau:** Ein geführter Onboarding-Flow (baut auf dem `kosmo.onboarded`-Flag +
dem Kosmo-Panel), bei dem Kosmo den Nutzer durch die Stationen führt, echte
Mini-Aufgaben stellen lässt («zeichne eine Wand» → live gezeigt), Werkzeuge
im Kontext erklärt, überspringbar/wiederholbar. Nutzt Serie G (Kosmo als
Benutzer-Guide, geparkt) als Konzeptbasis. Ehrlich: dynamisch = Kosmo reagiert
auf das, was der Nutzer tut, kein festes Skript.
**Grenze:** überspringbar, jederzeit erneut aufrufbar, keine Zwangsführung.

---

## Block F — Anti-KI-Kopie / Anti-Reverse-Engineering (aus P6, ehrlich)

**Ziel des Owners:** Schutz gegen KI-Kopien, Bildschirmaufnahme, Screenshots,
fremde KI die die App reverse-engineeren will; «komplett anti-kopierbar».

**Fable-Ehrlichkeitsurteil vorweg (die harte Wahrheit, gehört in den Plan):**
Ein lokal laufendes Programm ist **physikalisch nicht 100 % kopiergeschützt** —
wer die Binärdatei hat, kann sie analysieren; wer den Bildschirm sieht, kann
abfilmen (zur Not mit einer Kamera). «Komplett anti-kopierbar» ist technisch
unerreichbar; wer das verspricht, lügt. **Was WIRKLICH geht** (und Serie I
teils schon hat) baut die Hürde hoch, statt Unmögliches vorzutäuschen:
- **F1 — Server-Bindung als der wirksame Hebel** (existiert, Serie I/B6):
  Ohne gültige signierte Lizenz + erreichbare Bridge/Konto laufen die
  wertvollen Funktionen nicht — eine reine Kopie der .exe ist wertlos. Das
  ist der einzige echte Anti-Copy-Schutz und wird geschärft/scharfgeschaltet.
- **F2 — Anti-Fingerprint in Exporten** (existiert, Serie I/B5): erweitern.
- **F3 — Aufnahme-/Screenshot-Erkennung** (best effort, ehrlich): auf
  Desktop lässt sich «Bildschirm wird aufgenommen» teils erkennen (OS-APIs)
  und die App kann sensible Inhalte dimmen/wasserzeichnen — aber NICHT
  verhindern (Kamera schlägt jede Software). Wird als abschreckende Schicht
  gebaut, ehrlich als «erschwert, nicht unmöglich» benannt.
- **F4 — Härtung gegen statische Analyse**: Minification/Obfuscation der
  Renderer-Bundles, keine Sourcemaps im Release, Tauri-Binär statt offenem
  Electron-asar — erhöht den Reverse-Engineering-Aufwand.
- **F5 — Recherche + Konzept (Fable):** `docs/SERIE-I2-ANTIKOPIE.md` —
  Bedrohungsmodell «KI liest/kopiert die App», realistische Gegenmassnahmen,
  klare Trennung wirksam / abschreckend / unmöglich.
**Grenze (im Produkt sichtbar):** Wir versprechen NICHT das Unmögliche; der
Schutz ist «hohe Hürde + wertlose Kopie ohne Server-Bindung», nicht
«unkopierbar». Rein defensiv.

---

## Offene Prioritäten aus V2-AUFTAKT (mit aufgenommen)

- **P5-alt — Signierte Builds + Auto-Update:** blockiert auf Owner-Material
  (Apple-Entwicklerkonto + Tauri-Updater-Schlüssel). Ohne das bleibt «Update
  = neuer Installer» (heute schon Ein-Klick-Release). Sobald die Schlüssel da
  sind: Signatur + Updater in die CI. **Braucht Owner-Input.**
- **P6-alt — LoRA-Training aus dem Lernjournal:** JSONL-Export existiert; das
  Training selbst ist HomeStation-Arbeit (5090). KosmoTrain-Anbindung +
  Übergabeprotokoll bauen; der Trainingslauf bleibt ehrlich HomeStation.
- **P7-alt — Journal in SQLite:** klein (S). Auf Tauri-Desktop nativ SQLite
  statt localStorage+IndexedDB-Spiegel (`state/journal-store.ts`-Kommentar).

## Ehrlich offene Live-Läufe (nicht v1.6-Code, HomeStation)

- Echter GPU-Render-Worker («Kette scharf», Drehbuch in ABNAHME-DREHBUCH.md).
- Erster echter Dev-Worker-Lauf («Kreis schliessen»).
- Blender-Worker + Video→Splat-Worker (Physik/Splats nie gefakt).

## Vorgeschlagene Bau-Reihenfolge (Nutzen × Aufwand)

1. **Block A (Auto-Setup)** — direkter Nutzen für v1.5-Tester, mittel.
2. **Block C (Submission + Unternehmer-Übernahme)** — höchster Fachnutzen,
   gross; C-0-Recherche zuerst.
3. **Block D (Wettbewerb-Grundlagenstudie)** — gross, baut auf viel
   Bestehendem (Volumenstudie/Varianten/Klima/Segmentierer).
4. **Block E (Starter-Guide)** — mittel, hebt die Erstnutzung.
5. **Block B (immersive Oberfläche)** — Konzept zuerst, dann Bau.
6. **Block F (Anti-Kopie)** — Konzept + wirksame Hebel schärfen, ehrlich.
7. **P5/P6/P7-alt** dazwischen wo sie passen (P7 klein & jederzeit; P5 wartet
   auf Owner-Schlüssel; P6 nach Block D/HomeStation).

Jeder Block: Fable-Konzept wo nötig → Batches (Gate + volle E2E je Batch) →
ROADMAP-Eintrag → deutscher Commit → Push. Ehrlichkeit vor Politur bleibt das
Gesetz: jede Grenze steht im UI, nicht nur im Code.
