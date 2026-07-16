# v0.8.1 «Vollausbau» — Spezifikation (verbindlich)

*P0 · Paket W0 des v0.8.1-Wellenplans. Dieses Dokument ist die verbindliche Grundlage für
W1–W10 — jede Zahl, jeder Platz-Entscheid und jede Sanktion hier ist der Massstab, gegen den
W10 (Matrix-Abnahme) am Ende prüft. Änderungen an dieser Spez nach W0 sind Owner-Sache, nicht
Bauagenten-Ermessen (Muster `docs/V080B-DESIGN-SPEZ.md`).*

**Quellen:** der genehmigte Wellenplan (`root-claude-uploads-73575e4c-8c15-5ba3-silly-plum.md`,
Owner-Auftrag 16.07.2026, Wellenplan W0–W10 + 6 Owner-Entscheide) · `docs/V-NAECHSTE-
KANDIDATEN.md` (30 Zeilen A–D, Stand 16.07.2026 nach v0.8.0B) · die Fable-Erkundungs-
Kurzfassung (LLM-Framework-Ist mit 8 Kandidaten, Werkzeugleisten-Verträge inkl.
`toBe(18)`-Analyse, Popup-Anatomie mit Zwei-Stufen-Optionen). Alle Datei:Zeile-Belege in
diesem Dokument sind gegen den Repo-Stand `65553d1` (Branch `claude/kosmo-orbit-v1-build-
pzxkbj`) selbst nachgeprüft, nicht ungeprüft aus der Kurzfassung übernommen — Abweichungen
sind in §7.2 der Kurzfassungs-Gegenprüfung (unten, je Fundstelle) vermerkt.

---

## 0 · Auftrag und Owner-Entscheide

### 0.1 · Auftrag

Owner-Auftrag 16.07.2026: **alle** Punkte aus `docs/V-NAECHSTE-KANDIDATEN.md` (Abschnitte
A–D, 30 Zeilen) plus drei neue Aufträge — lokales LLM-Kosmo-Framework verbessern,
Werkzeuge umordnen, Zwei-Stufen-Popups einführen — auf Nachfrage bestätigt: **auch die
sechs grossen D-Brocken, längere Laufzeit akzeptiert.** Grundlage sind drei Erkundungen
(LLM-Framework-Ist mit 8 Kandidaten; Werkzeugleisten-Verträge inkl. `toBe(18)`-Analyse;
Popup-Anatomie mit Zwei-Stufen-Optionen) plus ein Plan-Agent-Entwurf. Arbeitsmuster wie
v0.8.0/v0.8.0B: Fable orchestriert, Sonnet-Pakete, je Gate («N passed»-Zeilen, svg-qa-
Wächter, testid-Beweise) + sofortiger Push; Parallelität nur dateidisjunkt.

**Scope-Satz (bindend für alle Pakete W1–W10):** Alles aus der Kandidatenliste und den drei
neuen Aufträgen kommt in v0.8.1 — auch die sechs D-Brocken. HomeStation-/Konten-gebundene
Teile werden je Paket als **deklarierte Grenze** ausgewiesen (real gebauter, container-
testbarer Teil + ehrlich benannte Lücke), **niemals als Attrappe** (Owner-Entscheid 6,
§0.2). Ehrlichkeit vor Politur bleibt das Owner-Mandat aus `CLAUDE.md`.

### 0.2 · Owner-Entscheide (16.07.2026, bindend, wörtlich)

1. **GovernanceGate auftauen** — nur className-Ergänzungen, Verhalten byte-gleich, danach
   wieder einfrieren.
2. **BodenDock zurück auf 44/36** (TIER_GROESSE + Reserve-Neurechnung).
3. **48px-Raster bleibt Backdrop** (formell geschlossen).
4. **Doc eigener Hue.**
5. **Splat-Fusion sanktioniert den `toBe(18)`→17-Vertrag** (§7.3/B-118-Riegel gezogen).
6. **Alle sechs D-Brocken in v0.8.1** — je container-baubarer Teil + deklarierte
   HomeStation-/Konten-Grenze, keine Attrappen (Ehrlichkeit vor Politur).

Diese sechs Entscheide sind wortgleich aus dem genehmigten Wellenplan übernommen; sie
binden §1 (Entscheid 5), §4 (Entscheide 1–4) und §7 (Entscheid 6) dieser Spez unmittelbar.

### 0.3 · Verhältnis zu bestehenden Leitdokumenten

- **`docs/V080B-DESIGN-SPEZ.md`** bleibt in Kraft für alles, was diese Spez nicht ändert —
  Token-Architektur, die 12 Gestaltungsgesetze, Komponenten-Zielbild, Motion-System,
  Konfliktentscheide gelten unverändert weiter. v0.8.1 ist kein zweiter Design-Reset,
  sondern gezielter Ausbau (Werkzeug-Umbau, Zwei-Stufen-Popups, LLM-Framework, sechs
  D-Brocken) auf dieser Grundlage.
- **`docs/KI-MODELL-GUIDELINE.md`** bleibt die Owner-Guideline für Modellgebrauch; §3
  dieser Spez baut Teil C dieser Guideline («Design, noch nicht gebaut») teilweise ein
  (KI4-Paket).
- **`packages/kosmo-kernel/src/derive/stilblatt.ts`** und die 33 Goldens bleiben
  unangetastet **ausser** dem in §5 deklarierten Sammelwechsel 081 (D1/D4 +
  planToSvg-Vollplankopf) — der einzige geplante Golden-Churn dieser Version.

---

## 1 · Werkzeug-Umbau (bindend)

*Quelle: Erkundung 2 «Werkzeugleisten» (`apps/kosmo-orbit/src/modules/design/
DesignWorkspace.tsx`, `EntwurfsDock.tsx`, `NavLeiste.tsx`), selbst nachverifiziert gegen
Repo-Stand `65553d1`.*

### 1.1 · Neuer Platz für Skizze (bindend: Variante von K2)

**Ausgangslage (verifiziert):** Das Zeichen-Werkzeug **Skizze** (`tool-skizze`, Kürzel `F`,
`kurztasten.ts:63` `{ taste: 'f', werkzeug: 'skizze', beschrieb: 'Freihand-Skizze' }`,
Icon+Textlabel «✎ Skizze») sitzt heute in der Zeichenzeile `leiste-gruppe-zeichnen`
zusammen mit Auswahl/Wand/Volumen/Zone/Dach/Treppe/Stütze/Schnitt/Mesh
(`DesignWorkspace.tsx` ~Z. 2003). `EntwurfsDock.tsx` trägt bereits einen Eintrag mit dem
**gleichen Wortstamm**: `{ modus: 'skizzieren', testid: 'entwurf-skizzieren', titel:
'Skizzieren — Kosmo schlägt 3 Annäherungen vor', station: 'sketch' }` (`EntwurfsDock.tsx:87–
91`) — das ist aber ein **Stations-Modus-Wechsel** (öffnet die Sketch-3D-Station), keine
Zeichen-Werkzeug-Aktion. Die beiden «Skizze»-Konzepte sind funktional verschieden, teilen
sich aber den Begriff — genau das Kollisionsrisiko, das eine blosse 1:1-Verschmelzung von
`tool-skizze` in die `EINTRAEGE`-Liste (`EntwurfsDock.tsx:80–91`) hervorrufen würde
(zwei «Skizzieren»-Knöpfe mit unterschiedlicher Wirkung im selben Drei-Knopf-Cluster).

**Fixierter Platz:** `EntwurfsDock.tsx` trägt real **zwei** Reihen (Owner-Kommentar «A7»,
Z. 74ff.): oben die drei Modus-Knöpfe (Sprechen/Skizzieren/CAD, `EINTRAEGE`), darunter —
getrennt durch einen Trenner — vier kleine Stations-Icons (Draw/Vis/Publish/Prepare).
`tool-skizze` zieht in die **untere Reihe** dieses selben Rails (`entwurf-dock` /
`.orbit065-dock`, `shell/orbit-065.css:613–627`, links vertikal zentriert, `left:12px,
top:50%`) — physisch der «Zwilling»-Ort aus der Erkundung, aber als eigener Knopf in der
Stations-Icon-Reihe, NICHT als weiterer Eintrag im `EINTRAEGE`-Array. Das erhält die
testid `tool-skizze` unverändert, vermeidet die Doppel-«Skizzieren»-Verwechslung und
nutzt den bereits bestehenden Trenner als visuelle Konzept-Grenze (Werkzeug ↔ Stations-
Wechsel). Kürzel `F` bleibt aktiv, unabhängig vom neuen Ort.

### 1.2 · Neuer Platz für Schnitt (bindend: K4, gegen K1/K2 abgewogen)

**Abwägung:**
- *K1 (eigene KToolGruppe in der Kontextzeile)* — sauber, aber ein drittes Werkzeug-Cluster
  nur für ein Element widerspricht Gesetz 2 («eine Hauptthese pro View»,
  `V080B-DESIGN-SPEZ.md` §2.2) minimal stärker als nötig.
- *K2 (EntwurfsDock-Rail, wie Skizze)* — verworfen: Schnitt hat **kein** Pendant in
  `EINTRAEGE` («Schnitt ohne Pendant», Erkundung bestätigt — es gibt keinen
  «entwurf-schnitt»-Stationsmodus) und Schnitt ist kein Entwurfs-Einstiegsmodus, sondern
  eine Ansichtsableitung aus bestehender Geometrie. Eine erzwungene Paarung mit Skizze im
  selben Rail wäre eine künstliche Verwandtschaft ohne reale Bedeutung.
- *K4 (ansicht-nahe Gruppe)* — **gewählt**: Schnitt erzeugt eine **Ansicht** (Schnittebene
  + davon abgeleitete Darstellung), fachlich näher an Ansichts-/Navigations-Funktionen als
  an den Bauteil-Werkzeugen (Wand/Volumen/Zone/Dach/Treppe/Stütze), die reale Gebäude-
  elemente anlegen. `ZEICHEN_WERKZEUG_IDS` (`state/oberflaeche-adaption.ts:160–168`,
  verifiziert) enthält `schnitt` bereits neben den reinen Bauteil-IDs — dieser Vertrag
  bleibt unverändert (Schnitt ist weiterhin ein «Zeichenwerkzeug» im State-Sinn), nur die
  **Chrome-Position** ändert sich.

**Fixierter Platz:** neue, eigene, einknöpfige Kontextzeilen-Gruppe `leiste-gruppe-ansicht`
(analog `leiste-gruppe-export`/`leiste-gruppe-ebenen`), platziert in der Kontextzeile
unmittelbar links von `leiste-gruppe-export` — sichtbar getrennt von der Zeichenzeile,
Icon+Textlabel-Vertrag bleibt («Schnitt», wie heute, `oberflaeche-minimal.spec.ts`-taugend).
Kein Pan/Orbit/Zoom/Fit-Vermischung: `NavLeiste.tsx` bleibt strikt Navigations-only
(Vertrag, s. §1.4) — Schnitt zieht dort **nicht** ein.

### 1.3 · Splat-Fusion (bindend, sanktioniert `toBe(18)`→17)

**Ausgangslage (verifiziert):** heute zwei getrennte Überlauf-Einträge in
`UEBERLAUFFAEHIGE_WERKZEUGE` (`DesignWorkspace.tsx:1726–1745`, real gezählt): `import-splat`
(«Splat laden», `klickImportSplat`, `DesignWorkspace.tsx:1537–1558` — öffnet einen
Datei-Dialog `.splat`/`.ply`, parst die Cloud, setzt sie in den Viewport **und** öffnet das
SplatPanel automatisch, `DesignWorkspace.tsx:1550`) und `splat-werkzeug` («Splat-Werkzeug»,
`klickSplatWerkzeug` → `setSplatPanelOffen`-Toggle, testid `splat-werkzeug-toggle`,
`DesignWorkspace.tsx:2273`). `oberflaeche-minimal.spec.ts:132` `expect(eintraege.length)
.toBe(18)` zählt exakt diese Überlaufliste (export-Gruppe 8 + ebenen-Gruppe 9 +
fähigkeiten-Gruppe 1 = 18) — verifiziert exakt.

**Fusionierter Fluss (bindend, ersetzt beide Einträge durch einen `splat-werkzeug`-Eintrag,
neue Kurzlabel «Splat»):**

```
Klick auf «Splat»
  → gibt es bereits eine geladene Splat-Cloud in diesem Projekt (Splat-Runtime-Store
    kennt eine Cloud)?
      JA  → setSplatPanelOffen(!splatPanelOffen)  (bisheriges Toggle-Verhalten,
            unverändert aus splat-werkzeug-toggle übernommen)
      NEIN → klickImportSplat()  (bisheriger Datei-Dialog .splat/.ply, unverändert
             aus import-splat übernommen; nach erfolgreichem Parse öffnet sich das
             Panel automatisch wie heute, DesignWorkspace.tsx:1550)
```

Ein Klick, zwei Zustände, kein neuer State — die Fallunterscheidung ist reine Chrome-Logik
(`cloud vorhanden?`) auf bestehenden Stores. `import-splat`/`splat-werkzeug-toggle` als
**separate testids entfallen** — das ist die einzige geplante testid-Streichung dieser
Version und wird durch Owner-Entscheid 5 exklusiv gedeckt (§8, Sanktion 1). Der neue
Fusions-Eintrag erhält die testid `splat-werkzeug` (bereits als interne Bezeichnung
etabliert, s. Z. 2265 `klickSplatWerkzeug`).

**`UEBERLAUFFAEHIGE_WERKZEUGE` nach der Fusion:** export-Gruppe schrumpft von 8 auf 7
(`pdf, svg, dxf, ifc, import-ifc, import-dxf, splat` statt der bisherigen acht Einträge
inkl. `import-splat` + `splat-werkzeug`) → Gesamtzahl **7 + 9 + 1 = 17**.
`oberflaeche-minimal.spec.ts:132` wird von `toBe(18)` auf `toBe(17)` angepasst — das ist der
sanktionierte Vertragsbruch (§8, Sanktion 1).

### 1.4 · Pan/Orbit-NavLeiste: Umzug nach links unten, klein

**Ausgangslage (verifiziert):** `NavLeiste.tsx` ist die gemeinsame Komponente für `nav-3d`
(`Viewport3D.tsx:2261–2269`, Orbit ⟳/Pan ✋/Zoom 🔍/Fit ⌂) und `nav-2d` (`PlanView.tsx:
1604ff.`, Werkzeug ◇/Pan/Zoom/Fit). Heutige Position exakt `right: 88, bottom: 50`
(`NavLeiste.tsx:34,37`), Knöpfe bereits 28×28px Kreise (`NavLeiste.tsx:66–71`, Kreis-
Grammatik `k-werkzeug-kreis`). Die rechte Position wurde in v0.6.5 bewusst von links nach
rechts verlegt, um eine Stapelung mit Geschossleiste/EntwurfsDock (beide links) zu
vermeiden (`NavLeiste.tsx:24–29`).

**Kollisionsprüfung für die Rückverlegung nach links (verifiziert):**
- `dw-statusleiste` (`design.css:405–421`) belegt bereits `left:12, bottom:12, right:88`,
  30px hoch, **fast über die gesamte Breite** — eine simple Rückverlegung auf
  `left:88`-Symmetrie würde direkt in diese Leiste hineinlaufen.
- `EntwurfsDock`/`.orbit065-dock` (`shell/orbit-065.css:613–618`) sitzt links, aber
  **vertikal zentriert** (`top:50%, transform:translateY(-50%)`) — **keine** Kollision mit
  einer bodennahen Position.
- Das fixe Kosmo-Symbol sitzt weiterhin rechts (`right:22/bottom:22`, 54px) — durch den
  Umzug nach links entfällt die bisherige Existenzberechtigung für `NavLeiste`s
  `right:88`-Abstand vollständig, ohne dass die Kosmo-Symbol-Klärung selbst berührt wird.

**Fixierte Zielposition (bindend):** `left: 12, bottom: 50` — spiegelbildlich zur
bisherigen `right:88/bottom:50`-Logik, aber am linken Rand exakt auf die
`dw-statusleiste`s linke Kante (`left:12`) ausgerichtet und mit demselben 8px-Abstand über
deren Oberkante (`12+30=42` → `50-42=8px` Luft, identisch zur bisherigen Abstands-Norm).
Grösse bleibt 28×28px (bereits «klein» im v0.8.0B-Kreis-Vertrag, Werkzeug-Icon-Familie
1.75px-Stroke). `v3d-render-ecke` (`Viewport3D.tsx:2270ff.`, bisher `right:88/bottom:92`
über der NavLeiste) bleibt an seinem Platz stehen — es teilte sich die Spalte nur aus
Stapel-Vermeidung mit der NavLeiste, braucht aber keinen eigenen Nachbarn mehr, da die
Kosmo-Symbol-Klärung unverändert gilt. Der zugehörige Kopfkommentar wird redaktionell
nachgezogen (kein funktionaler Effekt).

**Primäre Bedienung bleibt Space/Mitteltaste** (bestehende Kürzel, unverändert):
Space-Halten (`PlanView.tsx:624,737`), Mitteltaste/Rechtsklick/Alt — die NavLeiste ist und
bleibt sekundäre/entdeckbare Bedienung, kein neues Kürzel wird eingeführt. `Kurzbefehle.tsx`
listet weiterhin `KURZTASTEN` + den manuellen Space-Eintrag unverändert.

### 1.5 · Mitzuziehende Dateien (vollständige Liste, Sanktion 2–4 in §8)

`ToolId`-Typ (`ui-zustand.ts:44`, `TOOL_IDS` — Reihenfolge/Werte unverändert, nur
Konsumenten-Chrome verschiebt sich) · `kurztasten.ts` (S/F-Bindungen unverändert, Z. 62–63,
DOM-Binding `DesignWorkspace.tsx:691–712`, Esc→Auswahl, `istEingabefeld`-Guard bleibt) ·
`ZEICHEN_WERKZEUG_IDS` (`state/oberflaeche-adaption.ts:160–168`, enthält `schnitt`, NICHT
`skizze` — bleibt so, nur Chrome-Ort ändert sich) · `arbeitsmodi-kern.ts` `ZEICHEN_WERKZEUGE`
(Z. 113, enthält `schnitt`) + `SICHTBARKEIT` (Z. 236–255, skizzieren-Modus: `panels
drawOffen`; modellieren: `splatPanelOffen` — nach der Splat-Fusion bleibt der Store-Schlüssel
`splatPanelOffen` identisch, nur der auslösende Klick fusioniert) · `kosmo-ui-werkzeuge.ts`
`TOOL_LABEL` (Z. 92) + `PANEL_LABEL` (Z. 70) · `dock-stationen.ts` `splatPanel`-Eintrag
(Z. 140) · `DesignWorkspace.tsx` selbst (`UEBERLAUFFAEHIGE_WERKZEUGE`, Kontextzeilen-Gruppen,
`leiste-gruppe-ansicht` neu) · `EntwurfsDock.tsx` (untere Icon-Reihe + `tool-skizze`) ·
`NavLeiste.tsx` (Positions-Konstanten) · rund 12 E2E-Specs mit Skizze/Schnitt/Splat/Pan-
Fundstellen: `sketch-3d-a4.spec.ts:49,113`, `eingabe-3d.spec.ts:115`, `sim-vollhaus.
spec.ts:167`, `module.spec.ts:2073`, `entwurfs-icons.spec.ts:52,79,80`, `starter-guide-
sketch3d.spec.ts:42`, `schnitt-command.spec.ts:68,84`, `galerie-vision.mjs:93`,
`schnitt-fluegelsymbolik.spec.ts:55,60`, `sim-efh.spec.ts:281`, `splat.spec.ts:53,93`,
`dock-layout.spec.ts:247`, `rundgang-pdf-078.spec.ts:80,93`, `unternehmerplan.spec.ts:17,91`,
`sim-submission.spec.ts:165`, `kurztasten-pan.spec.ts:136,188` (+ Space-Pan 99–104, Cursor
224–246), `oberflaeche-minimal.spec.ts:132` (der `toBe(17)`-Fix selbst).

---

## 2 · Zwei-Stufen-Popups (bindend)

*Quelle: Erkundung 3 «Popup-/Panel-Anatomie», selbst nachverifiziert (`DOCK_KONSTANTEN.
COLLH: 34` exakt `dock-kern.ts:139`; `targ()`-Formel exakt `dock-kern.ts:272`
`Math.max(x.min, Math.min(x.groesse, avail * 0.66))`; `HINWEIS_DAUER_MS = 2900` exakt
`DockFlaeche.tsx:153`).*

### 2.1 · Architektur (bindend: Kombination A+C aus der Erkundung)

**A — Solver-Grössenstufe (dokumentiert-additive `dock-kern`-Erweiterung, Alt-Default):**
`PanelDef` bekommt ein neues **optionales** Feld `groesseKompakt?: { w: number; h: number }`
neben dem bestehenden `min`/`groesse`. Ist es gesetzt, kann der Solver ein Panel in einer
dritten Grössenstufe («kompakt») anzeigen, zusätzlich zu offen/eingeklappt (34px-Tab,
`COLLH`). **Alt-Default:** fehlt `groesseKompakt`, verhält sich das Panel exakt wie heute
(nur offen/eingeklappt) — kein bestehendes Panel ändert sein Verhalten, bis es explizit auf
Zwei-Stufen migriert wird (§2.4). `solve()`/`waterfill()`/`placeFloats()`/`separate()`
bleiben unverändert (Vertrag §7.3 `V080B-DESIGN-SPEZ.md`); die neue Stufe ist ein
zusätzlicher Eintrag in derselben Höhenbudget-Rechnung, kein neuer Algorithmus.

**Viertelflächen-Ziel-Formel (bindend):** `groesseKompakt.h ≈ 0.25 × feld.h` (bzw. `.w` für
Spaltenbreite bei rechten/linken Panels), **begrenzt** durch das bestehende `min`/`groesse`-
Paar desselben Panels (die Formel darf nie kleiner als `min` oder grösser als `groesse`
zielen — dieselbe Klammer-Logik wie `targ()` heute für die 66%-Einklapp-Stufe,
`dock-kern.ts:272`, hier auf 25% statt 66% übertragen). `feld.w×feld.h` ist das gemessene
Solver-Feld (`opts.feld`, realer Leisten-Messwert, kein Mockup-Mass — Konfliktentscheid
`V080B-DESIGN-SPEZ.md` §6 «Prototyp-Bühne … nicht bindend» gilt sinngemäss weiter).

**C — `KPanelZweiStufen` (neue kosmo-ui-Komponente):** Kopf (immer sichtbar, Titel + Kern-
kennzahl, s. §2.2) + **KTabs-Durchklick-Menü** (nutzt die bestehende, bisher in Panels
ungenutzte `KTabs`-Komponente, `kosmo-ui/src/tabs.tsx`) + Körper (Inhalt der jeweils
gewählten Stufe/Tab). Ersetzt die beiden bisherigen Halbmuster: KennzahlenPanel
(Kopf-immer + faltbarer Körper, `kp-kopf-knopf`) und DrawPanel (KButton-Tabs, `draw-tab-*`)
— beide migrieren auf `KPanelZweiStufen` (§2.4) statt eigener Ad-hoc-Logik.

### 2.2 · «Wichtigste Infos» je Panel-Typ (bindend, Kopfzeile-Rezept)

Kopfzeile = **Titel (Mono 12px/600/.14em/uppercase, wie DockPanel-Kopf,
`V080B-DESIGN-SPEZ.md` §4) + genau eine Kernkennzahl** — nie mehr, analog Gesetz 2 («eine
Hauptthese pro View»). Kernkennzahl je Panel-Typ (Beispiele, vollständige Liste in der
Migrationsreihenfolge §2.4):

- **KennzahlenPanel:** Kopf trägt bereits die wichtigste Kennzahl (Struktur bleibt, wird nur
  auf `KPanelZweiStufen`-Rezept gehoben).
- **DrawPanel:** Kopf zeigt den Namen des aktiv gewählten Tabs (z. B. «Annäherung 2 von 3»).
- **Inspector:** Kopf zeigt Elementtyp + Kurzbezeichnung (z. B. «WAND · W-014»).
- **Splat-Panel (fusioniert, §1.3):** Kopf zeigt Punktzahl der geladenen Cloud oder
  «Keine Cloud geladen».
- **Mängel/Submission/Bauablauf/Berechnungsliste (die vier tabellenartigen Panels):** Kopf
  zeigt die Zeilenzahl («N Einträge») als Kernkennzahl.

Grundsatz: **die Kopfzeile ist nie leer und nie eine reine Wiederholung des Panel-Titels**
— fehlt eine sinnvolle Kernkennzahl (z. B. reine Einstellungs-Panels), bleibt die Kopfzeile
Titel-only, das Panel migriert dann NICHT auf `KPanelZweiStufen`, sondern bleibt beim
Alt-Default (§2.1) — Zwei-Stufen ist kein Zwang für jedes Panel, s. Migrationsreihenfolge.

### 2.3 · Nie-Scroll-Gebot (bindend, panelweise entschieden)

**Konstruktionsprinzip:** Inhalt passt in die Kompakt- ODER die Offen-Stufe, **oder** er
wandert ins KTabs-Durchklick-Menü als eigener Tab — niemals `overflow:auto` auf
`.k-dock-panel-inhalt`/`dp-dialog--scroll` innerhalb eines migrierten Panels. Heute
scrollt app-weit `.k-dock-panel-inhalt` (`dock-flaeche.css:236`) und `dp-dialog--scroll`
bei 8 der 13 Werkzeugpanels (Mängel/Splat/Unternehmerplan-Bericht/SubmissionsCheck/Kv/
Varianten/Berechnungsliste/Bauablauf, verifiziert in der Erkundung). Je migriertem Panel
legt die Matrix (§9) fest, **wie** der Inhalt ohne Scroll passt:

- **Tabellenartige Panels** (Mängel/SubmissionsCheck/Kv/Berechnungsliste/Bauablauf):
  Zeilen werden in Tab-Seiten paginiert (KTabs = Seiten-Umschalter, nicht nur Themen) ODER
  auf eine feste, spaltenreduzierte Kompakt-Ansicht (Top-N + «alle anzeigen»-Tab) gebracht.
- **Bericht-artige Panels** (Unternehmerplan-Bericht, Varianten): Abschnitte werden zu
  KTabs-Reitern (ein Abschnitt = ein Tab), Körper zeigt immer nur einen Abschnitt.
- **Fixed/Anker-Panels** (ModulEditor `--fixed`, Unternehmerplan-Diff `--anker`): bleiben
  vorerst beim Alt-Default (§2.1) — ihr Layout ist bereits ohne Scroll konstruiert
  (T4b-Vertrag), Migration ist optional, kein Muss-Punkt.

### 2.4 · Migrationsreihenfolge (bindend, Pilot zuerst)

1. **P5a** — `dock-kern`-Erweiterung additiv (`groesseKompakt`, Viertelflächen-Formel),
   eigene Neutralitätstests (bestehende Panels ohne `groesseKompakt` byte-gleiches
   Verhalten bewiesen), eigener Push vor jeder Komponentenarbeit.
2. **P5b** — `KPanelZweiStufen` bauen + **Pilot** auf genau zwei Panels: **KennzahlenPanel**
   (hat mit `kp-kopf-knopf` bereits das Kopf-immer-Halbmuster, geringstes Risiko) und
   **DrawPanel** (hat mit den KButton-Tabs bereits das Tab-Halbmuster — beide Halbmuster
   werden hier durch das echte `KPanelZweiStufen`+`KTabs`-Duo ersetzt, kein drittes Muster
   entsteht).
3. **P5c** — systematischer Rollout auf die verbleibenden 11 Werkzeugpanels **gemäss der
   panelweisen Nie-Scroll-Entscheidung aus §2.3/§9**; Abbau von `dp-dialog--scroll` +
   `overflow:auto` in jedem migrierten Panel; die vier Verträge (`dock-layout.spec`,
   `popup-layout.test.tsx`/T4b, `popup-kollision.spec`, `inspector-layout.spec`/H-43) werden
   **additiv erweitert** (neue Assertions für die Kompakt-Stufe), nicht ersetzt — bestehende
   Assertions bleiben grün.

---

## 3 · LLM-Framework — KI1–KI4

*Quelle: Erkundung 1 «LLM-Framework» (`ChatProvider`/`provider.ts:52`, `ChatSession`/
`chat.ts:36–235`, `knowledge.ts`/`quellen.ts`). Korrektur zur Kurzfassung: `knowledge.ts`
und `quellen.ts` liegen real unter `apps/kosmo-orbit/src/modules/prepare/knowledge.ts`
(429 Z.) bzw. `apps/kosmo-orbit/src/state/quellen.ts` (169 Z.) — **nicht** in
`packages/kosmo-ai` (dort liegen Provider/ChatSession/Personas/Memory, 2015 Z. in 11
Dateien, wie in der Kurzfassung beschrieben). Beide Fundorte sind selbst verifiziert:
`importiereBasis` (`knowledge.ts:296–349`) ruft nachweislich **kein** `embedTexts` auf
(nur `fetch` → IndexedDB-`put`, reiner BM25-Pfad danach); `kwScore` in `quellen.ts:48–64`
ist reine Termfrequenz, nutzt **nicht** `bm25Scores` (`knowledge.ts:361`).*

Die 8 Kandidaten der Erkundung werden auf vier Pakete verteilt (Owner-Vorgabe: KI1=2+3,
KI2=4+5+8, KI3=6, KI4=1+7):

| Paket | Kandidaten | Welle | Abnahmekriterium | HomeStation-Grenze |
|---|---|---|---|---|
| **KI1** | (2) Basis-Embeddings, (3) `quellen_suchen`/`sucheQuellen` auf BM25/Hybrid | W1 | `importiereBasis` vektorisiert die grossen Korpora über die Fake-Bridge (`POST /embed`, deterministisches 64-dim-Hashing, `main.py:913–925`) beim Import; `sucheQuellen` (`quellen.ts`) nutzt `bm25Scores` (`knowledge.ts:361`) statt `kwScore` für den Wissens-Zweig, kombiniert mit Cosine wenn Vektoren vorhanden; Fallback ohne Bridge bleibt reiner BM25-Pfad (unverändert lauffähig); voll containertestbar mit `--fake-worker` | keine — läuft komplett gegen die Fake-Bridge |
| **KI2** | (4) Systemprompt-Bauer mit Token-Budget, (5) reicherer Modellkontext, (8) Anthropic Prompt-Caching + thinking | W2 | Systemprompt-Zusammensetzung (Persona + `journal.toPromptBlock` + Dossier + Rolle) läuft über eine Budget-Selektion statt String-Konkat (`chat.ts`); `modell_lesen`/`tools.ts:122` cappt heute 40 Wände hart — Budget-Selektion ersetzt den harten Cap durch eine token-bewusste Auswahl; Anthropic-Provider (`anthropic.ts`) nutzt Prompt-Caching-Header + `thinking`-Parameter wo das Modell es unterstützt | Cloud-Kosten/Limits bleiben Owner-Sache, keine neue HomeStation-Abhängigkeit |
| **KI3** | (6) Stream-Timeout/Retry | W3 | alle Provider-Streams (`provider.ts`) bekommen einen konfigurierbaren Timeout + begrenzten Retry bei Verbindungsabbruch (heute nur `signal`, kein Auto-Retry, Fehlerbehandlung bleibt ehrlich+deutsch); Ollama/Anthropic/LM-Studio/Mock/Scripted alle abgedeckt | keine |
| **KI4** | (1) Rollen→Modell-Staffelung, (7) LoRA-Export-Pipeline schliessen | W4 | Meister/Leiter/Zeichner (`KI-MODELL-GUIDELINE.md` Teil C) real in `betrieb.ts:155–184` — heute wählt die Funktion EIN Modell, Cloud fix mindestens Opus; die Staffelung wird als testbare Abstraktion gebaut (welche Rolle bekommt welches Modell/welchen Provider), **Multi-Modell-Verifikation selbst (mehrere echte Modelle parallel gegenprüfen) ist deklarierte HomeStation-Grenze** — container-baubar ist die Rollen-Logik + Provider-Auswahl, nicht der Beweis mit echten grossen lokalen Modellen; `journal.toJsonl()` (`memory.ts:116`) bekommt einen echten Konsumenten (Fake-Trainer-Stub) statt ohne Abnehmer zu bleiben | Multi-Modell-Verifikation = HomeStation |

---

## 4 · Owner-Entscheide-Runde + Technik-Härtung + UI-Restrunden (W1/W2)

### 4.1 · P1 Owner-Entscheide-Runde (W1)

- **Entscheid 1 (GovernanceGate-Optik):** `GovernanceGate.tsx` bleibt strukturell
  eingefroren; die Owner-Freigabe erlaubt **ausschliesslich className-Ergänzungen**
  (KApprovalCard-Optik-Klassensatz aus `V080B-DESIGN-SPEZ.md` B-46/B-99 endlich
  angewendet). Nach Anwendung wird die Datei **wieder eingefroren** (Owner-Formel:
  «auftauen, anwenden, einfrieren» — kein Dauerzugriff).
- **Entscheid 2 (BodenDock 44/36 + Reserve-Neurechnung):** `TIER_GROESSE`
  (`state/orbit-rang.ts:189`, heute `{ innen: 64, mitte: 54, aussen: 46 }`) wird auf
  `{ innen: 44, mitte: 36, aussen: 36 }` zurückgestellt (Blaupause 44/36px, zwei Stufen
  statt drei — «aussen» fällt auf denselben 36px-Wert wie «mitte», da die Blaupause nur
  zwei Grössen kennt: Top-Tool 44px, übrige 36px). `BODEN_DOCK_RESERVE_PX`
  (`BodenDock.tsx:181`, dokumentierte Formel `96 (bottom) + TIER_GROESSE.innen +
  20 (padding 2×10)`) wird **neu gerechnet**: `96 + 44 + 20 = 160` (statt bisher
  `96 + 64 + 20 = 180`). Jede Konsumentenstelle des Werts (u. a. `modules/publish/
  PublishWorkspace.tsx`) zieht automatisch mit, da sie die Konstante importiert statt den
  Wert zu duplizieren.
- **Entscheid 3 (48px-Raster):** formell geschlossen — bleibt ausschliesslich als
  Dock-Bühnen-Backdrop erlaubt (Hairline-Raster, opacity ≤.5, nie unter Text,
  `V080B-DESIGN-SPEZ.md` §1 Verworfen-Absatz). Kein Bauauftrag ausserhalb dieser
  Ausnahme.
- **Entscheid 4 (Doc eigener Hue):** die Doc-Station (heute Bestands-Hue `draw`,
  `V-NAECHSTE-KANDIDATEN.md` A) bekommt eine eigene Rollenfarbe im `--k-rolle-*`-Schema
  (neue Rolle `doc`, analog den bestehenden acht Rollen manuell/pn/pna/agent/memory/
  generator/ak/office je mit `-fill`/`-line`-Paar, `V080B-DESIGN-SPEZ.md` §1).

### 4.2 · P2 Technik-Härtung (W1, parallel zu P1/KI1, dateidisjunkt)

- **row-Splitter-Last-Flake:** Panel öffnet mit 573px, Content-Re-Solve settelt ~500ms
  später auf 272px; landet der Re-Solve nach der Test-Messung, platzt die Assertion.
  Fix: ein Produkt-Event (z. B. `dock:resolved`), auf das der Test deterministisch wartet,
  statt eines `stabileBox`-Zeitfensters.
- **kurztasten-pan Fling/Momentum-Flake:** SwiftShader-Timing-bedingt, HEAD-bewiesen
  (reproduzierbar). Fix: Momentum-Berechnung von Wandzeit statt Frame-Zeit entkoppeln
  oder Test auf denselben Produkt-Event umstellen wie der Splitter-Fix.
- **kosmodata-wissen.spec:77 Fixture-Skip:** Import-Fixture auflösen statt weiter zu
  überspringen.

### 4.3 · P3 UI-Restrunden (W2, parallel zu KI2, dateidisjunkt)

- **OnboardingWizard-Vollumbau** (54 Rest-Inline-Styles) + **StarterGuide-Rest** (10) auf
  die v0.8.0B-Grammatik (Klassen statt Inline, Hooks/testids/aria byte-genau).
- **Warning-Wash-Tokens kanonisieren:** `--k-warning-wash`/`-line`-Fallback-Hexwerte aus
  `aura.css` in echte Tokens gehoben (kein Fallback-Hex mehr im Code verstreut).
- **Bauteil-/Materialkatalog-Views** (in Asset eingebettet, Herkunft `data`) auf
  KKeyValue/KCard-Grammatik (`V080B-DESIGN-SPEZ.md` B-41/B-126).
- **Wissen-Tab-Zeilenknöpfe** (ghost/neutral-Dämpfung): **kein Bauauftrag in W2** —
  Vorbedingung («sobald eine Sammel-Aktion eingeführt wird») ist noch nicht erfüllt;
  bleibt als offener Punkt in der Matrix (§9), heute akzeptabel (bestätigter P8-Befund).
- **BodenDock-Reserve für restliche Stationen:** Verifikation je Station, dass
  `BODEN_DOCK_RESERVE_PX` (neu 160, §4.1) korrekt angewendet wird — Publish ist bereits
  gelöst, die W8c-A-Stationen (visuell neu seit v0.8.0B) werden hier nachgeprüft/
  nachgezogen.

---

## 5 · Golden-Sammelwechsel 081 (W5, allein)

**Inhalt (in EINEM Ritual):** D1 (Strich-Matrix-Nachschärfung, Stift×Grau×Linientyp) + D4
(Zwei-Stimmen-mm-Skala-Nachschärfung) **plus** `planToSvg`-Vollplankopf im Design-Einzel-
export (Owner-Entscheid 4 der v0.8.0, bisher unerledigt liegen geblasen — Geometrie-Shift
in bis zu 15 der 33 Goldens erwartet). Beide Nachschärfungen zusammen in einem
Sammelwechsel statt zwei getrennten Golden-Churns — vermeidet doppelte Geometrie-
Verschiebung derselben Dateien in zwei Wellen.

**Ritual (Muster `GOLDEN-CHURN`, wie in v0.8.0/v0.8.0B):**
1. `GOLDEN-WECHSEL-081.md` anlegen: Erwartungsliste **VOR** Regeneration — je betroffenem
   Golden-SVG die erwartete Änderung (welche Linien/Stifte/Bemassung sich wie verschieben)
   dokumentieren.
2. Regeneration, `svg-qa` laufen lassen.
3. Fable-Diff-Review gegen die Erwartungsliste — jede Abweichung von der Vorab-Erwartung
   ist ein Stopp-Signal, kein automatisches Akzeptieren.
4. Referenz für das Rückverfolgen: `447e598`/v0.8.0 (letzter bekannter Golden-Stand vor
   dieser Version).

**Kontingent-Schätzung:** 15 von 33 Goldens potenziell betroffen (D1/D4-Nachschärfung +
Plankopf-Geometrie); die übrigen 18 bleiben byte-identisch. Dies ist der **einzige**
Golden-Churn dieser Version — W1–W4, W6–W10 halten alle 33 Goldens byte-identisch
(Owner-Entscheid-Muster von v0.8.0B §0.2 Punkt 5, hier bewusst gebrochen nur in W5).

---

## 6 · Publish/Export + Erlebnis-Reste (W6)

### 6.1 · P7 Publish/Export-Runde

- **Preset-Wähler + Erststart-Trigger** für die publish-Station (Registry/Presets
  existieren seit ROADMAP 380, nur UI-Wähler/Trigger fehlten — jetzt nachgezogen).
- **Büro-Logo SVG/JPG:** heute ehrliche PNG-Ablehnung (verifiziertes Ist-Verhalten bleibt
  für PNG); JPG kommt als zweites reales Rasterformat neben SVG dazu.
- **Einzelblatt-PDF mit Plancode-Namen** (Bündel-PDF bleibt wie heute ohne Plancode-Namen
  im Dateinamen — nur der Einzelblatt-Export bekommt den Plancode).
- **AF-Stempel-Präzisierung** («2-mm-äquivalent» vs. proportional 6%): **fixierter
  Default:** proportionale Skalierung (6% der Blattbreite, mit dokumentierter
  Mindestgrösse für Lesbarkeit auf A4), owner-rückholbar. Begründung: ein starres
  «2mm-äquivalent» skaliert bei grossen Formaten (A0) optisch zu klein, eine reine
  Prozent-Skalierung ohne Mindestmass wird auf A4 zu klein — die kombinierte Regel
  (Prozent + Mindestmass) deckt beide Fälle ehrlich ab, ohne einen der beiden Layout-
  Wege stillschweigend zu bevorzugen.

### 6.2 · P8 Erlebnis-Reste (Owner-Entscheid 6 aus v0.8.0B, jetzt gebaut)

- **Schwarm-Orbs max. 3** (parallele Kosmo-Orbs, Klick = Fokus).
- **Schliessen-Choreografie mit Plopp** (Fenster→Orb-Übergang, Ton optional).
- **Viz gespeicherte Ansichten + Review-Pins** (ISO/NORD/DETAIL-Slots, Autosave-Badge,
  Kommentar-Pins auf dem Viewport).
- **GPU-Telemetrie:** container-baubarer Teil = die UI-Anzeigefläche + der Datenweg von
  einer echten Metrik-Quelle; **echte GPU-Auslastungswerte selbst sind eine ehrliche
  HomeStation-Grenze** (im Container gibt es keine echte GPU-Telemetrie — die UI zeigt
  im Container-Kontext einen klar beschrifteten «nicht verfügbar»-Zustand statt einer
  erfundenen Zahl, Owner-Entscheid 6: keine Attrappen).
- **0.7.5-Welle-2:** Vis-Onboarding-Stepper, Report-Dossier/Print, Datenstationen-
  Vollbild — alle drei container-baubar (reine UI-/Datenlogik-Erweiterung bestehender
  Stationen, keine HomeStation-Abhängigkeit).

---

## 7 · Die sechs D-Brocken (W7–W9, je container-baubarer Teil, deklarierte Grenze,
keine Attrappen)

### (a) `.kxp`-Paket + Trust-Layer (W7, P11)

Container-baubar: Dateiformat `.kxp` (Struktur, Export/Import als reines Dateiformat-
Handling), Viewer-Screen (zeigt ein geladenes `.kxp`-Paket an), Freigabe-Workflow-**Gerüst**
(UI-Zustände, Übergänge, ohne echten Mehrbenutzer-Server). **Deklarierte Grenze:**
echte Konten/Identitäten und eine echte Mehrbenutzer-Freigabe (wer darf was mit wem teilen)
sind Konten-/HomeStation-Sache — das Gerüst zeigt den Ablauf ehrlich mit Platzhalter-
Rollen, ohne eine echte Multi-User-Infrastruktur vorzutäuschen.

### (b) Auto-Pack-Layout-Editor (W7, P12)

«Intelligentes Planlayout» auf den bestehenden `blattlayout.ts`/`blattfuellung.ts`-
Grundlagen (A0–A4-Formate bereits definiert, `blattlayout.ts:66–70`). Vollständig
container-baubar — reiner Layout-Algorithmus + Editor-UI, keine externe Abhängigkeit.

### (c) 0.7.2-Reste / 0.7.5-Welle-2 (W6, s. §6.2 — hier nur Querverweis, kein Doppeleintrag)

### (d) Rolle/Leporello (W8, P13) — Längen-Default

**Ausgangslage (verifiziert):** `blattlayout.ts:15,61` trägt bereits den Kommentar
«Die Rolle 1600×594mm ist VERTAGT» als bewusst freigehaltenen Platzhalter — der Wert
1600×594 ist also kein externer DIN-Fund, sondern der **eigene, im Repo bereits
angelegte** Erwartungswert. **Fixierter Default (bindend, owner-rückholbar):**
Rollenbreite **594mm** (identisch mit der A1-Breite, `blattlayout.ts:67` — gängiges
Plotter-Rollenmass, reiht sich in die bestehende A-Serien-Logik ein statt ein neues
Breitenmass einzuführen) × Rollenlänge **1600mm** als Standard-Zuschnitt (owner-
rückholbar, wie im Repo-Kommentar bereits vorgesehen). Die Leporello-Faltung
(Zickzack) baut auf der bestehenden DIN-824-Faltmarken-Logik auf (`blattlayout.ts:131–
149`, heute für A-Formate implementiert), proportional auf die Rollenlänge erweitert
— kein zweiter Faltalgorithmus.

### (e) 27-Formate-Export-Hub + KosmoPackage-Screen (W8, P14) — ehrliche Hub-Gestalt

**Reale Formate heute (verifiziert per Grep der Export-Wege):** PDF (`export-pdf`,
`exportPlanPdf`/`export-plan.ts`), SVG (`export-svg`), DXF (`export-dxf`), IFC
(`export-ifc`, Import+Export), Splat (`.splat`-Export, `SplatPanel.tsx:63–71`, plus
Video→Splat-Import-Pipeline, `video-splat.ts` — kein eigenes Exportformat, sondern ein
Import-Pfad). Zusammen mit dem neuen Logo-JPG (§6.1) sind das **6 reale Formate**, nicht
27. **Fixierte Hub-Gestalt (bindend):** der Export-Hub zeigt **ausschliesslich diese
sechs realen Formate**, gruppiert nach Artefakt-Typ (Plan-Export: PDF/SVG/DXF ·
Modell-Export: IFC · Punktwolken-Export: Splat · Logo-Export: SVG/JPG) — **keine**
27-Format-Kachel-Wand. Diese Korrektur der Kandidatenliste («27-Formate») ist bewusst:
ein Hub mit 21 Formaten ohne realen Exportweg dahinter wäre eine Attrappe (Owner-
Entscheid 6). KosmoPackage-Screen bündelt diese sechs Formate + `.kxp` (a) in einer
Übersicht — vollständig container-baubar.

### (f) Orbit-Hub-Vollausbau + Mobile Companion + Nutzungszeit-Panel (W9, P15)

Container-baubarer Teil: responsives Layout des Orbit-Hub-Vollausbaus (Owner-Entscheid-
Nachzug zu `V080B-DESIGN-SPEZ.md` B-86), Mobile-Companion-Kartenlayout (responsiv,
im Container per Viewport-Simulation testbar) und Nutzungszeit-Panel mit **echten**
Nutzungsdaten aus `kosmo.adaption.v1` (bestehender lokaler Telemetrie-Store, keine
Attrappen-Zahlen). **Deklarierte Grenze:** ein echtes physisches Mobilgerät-Testfeld
(reales Touch-Verhalten auf echter Hardware, analog dem offenen iPad-Touch-Drehbuch,
§9 C-11) bleibt Owner-Aktion ausserhalb des Containers — die Companion-Oberfläche selbst
ist voll gebaut und mit simulierten Viewports getestet.

---

## 8 · Sanktionsliste (abschliessend)

Alles, was hier NICHT steht, bleibt **byte-gleich** — testids, aria-labels, Spec-Texte,
Golden-SVGs (ausser §5), `dock-kern`-Solver-Verhalten (nur additiv erweitert, nie
verändert). Diese Liste ist die einzige Owner-sanktionierte Ausnahme-Menge:

1. **`toBe(18)` → `toBe(17)`** (`e2e/oberflaeche-minimal.spec.ts:132`) — sanktioniert durch
   Owner-Entscheid 5, ausgelöst durch die Splat-Fusion (§1.3). Nachzüge in Doku-Dateien,
   die den Wert 18 nennen: `docs/V070-KONZEPT.md:146`, `docs/V071-KONZEPT.md:144`,
   `docs/SIM-BEFUNDE.md:930`, `docs/V080B-DESIGN-SPEZ.md:372,699,775` — alle auf 17
   nachziehen bzw. mit Versionshinweis («seit v0.8.1: 17») versehen.
2. **NavLeiste-Umzug** (`NavLeiste.tsx:34,37`: `right:88,bottom:50` → `left:12,bottom:50`,
   §1.4) — Positions-Konstanten, keine testid-/aria-Änderung.
3. **Skizze/Schnitt-Chrome-Umzug** (§1.1/§1.2/§1.5) — `EntwurfsDock.tsx` (neue untere
   Rail-Zeile für `tool-skizze`), `DesignWorkspace.tsx` (neue Gruppe
   `leiste-gruppe-ansicht` für Schnitt, `UEBERLAUFFAEHIGE_WERKZEUGE`-Fusion §1.3) —
   testids `tool-skizze`/`tool-schnitt` bleiben wörtlich, nur ihr DOM-Elternkontext
   ändert sich; `import-splat`/`splat-werkzeug-toggle` entfallen zugunsten von
   `splat-werkzeug` (einzige testid-Streichung, gedeckt durch Sanktion 1).
4. **`BODEN_DOCK_RESERVE_PX`-Neurechnung** (`BodenDock.tsx:181`: 180 → 160, §4.1) +
   `TIER_GROESSE` (`orbit-rang.ts:189`: `{64,54,46}` → `{44,36,36}`, §4.1) — jede
   Konsumentenstelle (`PublishWorkspace.tsx` u. a., §4.3) zieht automatisch mit.
5. **Zwei-Stufen-Vertrags-Erweiterungen** (additiv, §2.4 P5c): `dock-layout.spec`,
   `popup-layout.test.tsx`/T4b, `popup-kollision.spec`, `inspector-layout.spec`/H-43 —
   neue Assertions für die Kompakt-Stufe/KTabs-Durchklick, bestehende Assertions bleiben
   unverändert grün. `PanelDef` bekommt das neue optionale Feld `groesseKompakt` (§2.1) —
   additiv, kein bestehendes Feld ändert Typ oder Bedeutung.

**Alles andere** — insbesondere `state/dock-kern.ts`s Solver-Kern
(`solve()/waterfill()/placeFloats()/separate()`), `state/ui-befehle.ts`,
`shell/GovernanceGate.tsx` (ausser Entscheid 1, nur className), `derive/stilblatt.ts`,
die 33 Goldens ausser dem W5-Sammelwechsel, alle 953+ bestehenden testids/111+ aria-labels
— bleibt byte-gleich.

---

## 9 · Vollständigkeits-Matrix (Abnahme-Grundlage W10)

Jede Zeile aus `docs/V-NAECHSTE-KANDIDATEN.md` (A–D, 30 Zeilen), jeder der drei neuen
Owner-Aufträge und jede Erkundungs-Zusage ist unten einzeln erfasst, mit Ziel-Welle/-Paket
und Abnahmekriterium. Marker **VERTAGT**/**GRENZE** nur, wo HomeStation/Konten/reale
Hardware zwingend fehlen — alles andere bekommt einen Bauauftrag.

### 9.1 · Die 6 Owner-Entscheide (16.07.2026)

- [ ] **C-1** GovernanceGate auftauen (nur className, danach wieder einfrieren) → **W1/P1**
  · Abnahme: Diff zeigt ausschliesslich `className`-Änderungen an `GovernanceGate.tsx`,
  keine Struktur-/Prop-/Logikänderung; Datei nach Anwendung erneut als eingefroren markiert.
- [ ] **C-2** BodenDock 44/36 + Reserve-Neurechnung → **W1/P1** · Abnahme:
  `TIER_GROESSE={innen:44,mitte:36,aussen:36}`, `BODEN_DOCK_RESERVE_PX=160`, alle
  Konsumentenstellen (Publish + W8c-A-Stationen) visuell verifiziert kollisionsfrei.
- [ ] **C-3** 48px-Raster bleibt Backdrop (formell geschlossen) → **kein Bauauftrag**,
  Referenz-Bestätigung **W1**.
- [ ] **C-4** Doc eigener Hue → **W1/P1** · Abnahme: neue Rolle `doc` mit `-fill`/`-line`-
  Paar in `aura.css`, `token-spiegel.test.ts` grün, Doc-Station visuell abgesetzt von
  `draw`.
- [ ] **C-5** Splat-Fusion sanktioniert `toBe(18)`→17 → **W3/P4** · Abnahme: §1.3/§8
  Sanktion 1 vollständig umgesetzt, `oberflaeche-minimal.spec.ts` grün mit `toBe(17)`.
- [ ] **C-6** Alle sechs D-Brocken in v0.8.1, container-baubarer Teil + Grenze → **W7–W9**
  · Abnahme: §7 (a)–(f) je mit gebautem Teil UND explizit benannter Grenze im UI (kein
  stiller Fake-Zustand).

### 9.2 · Kandidatenliste A — Owner-Entscheide nötig

- [ ] **C-7** GovernanceGate-Optik → identisch mit C-1 (Quellenverweis 393/W7 der
  v0.8.0B-Liste) → **W1/P1**.
- [ ] **C-8** BodenDock-Kreisgrössen (B-65) → identisch mit C-2 → **W1/P1**.
- [ ] **C-9** 48px-Layout-Raster als generelles Raster → identisch mit C-3 →
  **kein Bauauftrag**, formell geschlossen.
- [ ] **C-10** Doc-Stations-Hue → identisch mit C-4 → **W1/P1**.
- [ ] **C-11** iPad-Touch-Drehbuch (`docs/IPAD-TOUCH-DREHBUCH.md`) → **GRENZE**: braucht
  eine Owner-Aktion am echten Gerät (reales Touch-Verhalten ist nicht containertestbar);
  kein Paket in W1–W10 adressiert dies aktiv — bleibt als offener Punkt bestehen, analog
  zur Mobile-Companion-Grenze in §7(f).

### 9.3 · Kandidatenliste B — UI-Restrunden

- [ ] **C-12** OnboardingWizard-Vollumbau (54) + StarterGuide-Rest (10) → **W2/P3** ·
  Abnahme: 0 Rest-Inline-Styles in beiden Dateien, Hooks/testids/aria byte-genau.
- [ ] **C-13** Publish-Preset-Wähler + Erststart-Trigger → **W6/P7** · Abnahme: Wähler
  zeigt alle registrierten Presets, Erststart-Trigger löst beim ersten Besuch der
  Publish-Station aus.
- [ ] **C-14** BodenDock-Reserve für restliche Stationen → **W2/P3** (Teil von §4.3) ·
  Abnahme: jede Station mit Boden-Dock-Überlappungsrisiko verifiziert.
- [ ] **C-15** Wissen-Tab-Zeilenknöpfe ghost/neutral → **kein Bauauftrag** (Vorbedingung
  «Sammel-Aktion» fehlt weiterhin) → bleibt offener Punkt.
- [ ] **C-16** Warning-Wash-Tokens kanonisieren → **W2/P3** · Abnahme: kein Fallback-Hex
  mehr in `aura.css`-Konsumenten, echte `--k-warning-wash/-line`-Tokens.
- [ ] **C-17** Bauteil-/Materialkatalog-Views auf KKeyValue/KCard → **W2/P3** · Abnahme:
  Views nutzen die Komponenten, keine Label/Wert-Inline-Muster mehr.

### 9.4 · Kandidatenliste C — Technik/Tests

- [ ] **C-18** row-Splitter-Last-Flake → **W1/P2** · Abnahme: Test wartet auf
  Produkt-Event, 0 Flakes über N Wiederholungen.
- [ ] **C-19** kurztasten-pan Fling/Momentum-Flake → **W1/P2** · Abnahme: SwiftShader-
  Timing-Robustheit nachgewiesen (N Wiederholungen grün).
- [ ] **C-20** kosmodata-wissen.spec:77 Fixture-Skip → **W1/P2** · Abnahme: Test läuft
  ungeskippt und grün.
- [ ] **C-21** B-135 Linien-Skala → **kein Bauauftrag**, formell geschlossen (nur bei
  echtem Konsumenten wieder öffnen).

### 9.5 · Kandidatenliste D — sechs D-Brocken + Rest

- [ ] **C-22** D1/D4-Plangrafik-Nachschärfungen → **W5/P6** · Abnahme: §5-Ritual
  vollständig durchlaufen, Erwartungsliste vs. Diff deckungsgleich.
- [ ] **C-23** planToSvg-Vollplankopf → **W5/P6** (im selben Ritual wie C-22) · Abnahme:
  Design-Einzelexport zeigt den Vollplankopf, Owner-Entscheid 4 der v0.8.0 erfüllt.
- [ ] **C-24** Büro-Logo SVG/JPG → **W6/P7** · Abnahme: JPG-Export funktioniert, PNG
  bleibt ehrlich abgelehnt.
- [ ] **C-25** Einzelblatt-PDF mit Plancode-Namen → **W6/P7** · Abnahme: Einzelblatt-
  Dateiname enthält den Plancode, Bündel-PDF unverändert.
- [ ] **C-26** Auto-Pack-Layout-Editor → **W7/P12** · Abnahme: Editor packt Blätter
  automatisch nach der bestehenden `blattlayout.ts`/`blattfuellung.ts`-Logik.
- [ ] **C-27** Rolle 1600×594 / Leporello-Faltung → **W8/P13** · Abnahme: §7(d)-Default
  gebaut, DIN-824-Faltlogik proportional erweitert, additive Goldens grün.
- [ ] **C-28** 27-Formate-Export-Hub → **W8/P14** · Abnahme: §7(e)-korrigierte
  Sechs-Format-Hub-Gestalt gebaut, keine Format-Attrappen.
- [ ] **C-29** .kxp-Hyper-Modell/Viewer + Trust-Layer → **W7/P11** · Abnahme: §7(a),
  Dateiformat + Viewer + Workflow-Gerüst gebaut, Konten-Grenze im UI benannt.
- [ ] **C-30** KosmoPackage-Screen → **W8/P14** · Abnahme: Screen bündelt alle 6 realen
  Formate + `.kxp`.
- [ ] **C-31** AF-Stempel-Spez-Präzisierung → **W6/P7** · Abnahme: §6.1-Default
  (Prozent+Mindestmass) implementiert und dokumentiert.
- [ ] **C-32** 0.7.2-Reste (Schwarm-Orbs/Schliessen-Choreografie/Viz-Viewport,
  GPU-Telemetrie **GRENZE**) → **W6/P8** · Abnahme: §6.2, GPU-Anzeige ehrlich
  «nicht verfügbar» im Container statt erfundener Werte.
- [ ] **C-33** 0.7.5-Welle-2 (Onboarding-Stepper/Report-Dossier/Datenstationen-Vollbild)
  → **W6/P8** · Abnahme: §6.2, alle drei container-baubar ohne Grenze.
- [ ] **C-34** Orbit-Hub-Vollausbau · Mobile Companion **(GRENZE: reale Geräte)** ·
  Nutzungszeit-Panel (echte Daten aus `kosmo.adaption.v1`) → **W9/P15** · Abnahme:
  §7(f), responsives Layout + echte Nutzungsdaten, Geräte-Grenze im UI benannt.

### 9.6 · 8 LLM-Kandidaten (KI1–KI4)

- [ ] **C-35** (KI1.1) Basis-Embeddings für `importiereBasis` → **W1** · Abnahme:
  `importiereBasis` ruft `embedTexts` auf, Vektoren landen in IndexedDB, Fake-Bridge
  deckt den Pfad end-to-end.
- [ ] **C-36** (KI1.2) `sucheQuellen`/`quellen.ts` auf BM25/Hybrid → **W1** · Abnahme:
  `kwScore` im Wissens-Zweig durch `bm25Scores`+Cosine-Hybrid ersetzt.
- [ ] **C-37** (KI2.1) Systemprompt-Bauer mit Token-Budget → **W2** · Abnahme: kein
  reiner String-Konkat mehr, Budget-Selektion nachweisbar (Journal/Dossier werden bei
  Bedarf gekürzt, nicht hart abgeschnitten).
- [ ] **C-38** (KI2.2) reicherer Modellkontext (`modell_lesen`-Cap → Budget-Selektion) →
  **W2** · Abnahme: der harte 40-Wände-Cap (`tools.ts:122`) wird durch eine
  budgetbewusste Auswahl ersetzt.
- [ ] **C-39** (KI2.3) Anthropic Prompt-Caching + thinking → **W2** · Abnahme:
  `anthropic.ts` setzt Cache-Control-Header, `thinking`-Parameter nutzbar wo unterstützt.
- [ ] **C-40** (KI3) Stream-Timeout/Retry → **W3** · Abnahme: alle Provider-Streams mit
  Timeout+Retry, Fehlerpfad bleibt ehrlich+deutsch.
- [ ] **C-41** (KI4.1) Rollen→Modell-Staffelung (Meister/Leiter/Zeichner) → **W4** ·
  Abnahme: `betrieb.ts` wählt je Rolle testbar ein Modell/Provider; **Multi-Modell-
  Verifikation mit echten grossen Modellen = GRENZE (HomeStation)**.
- [ ] **C-42** (KI4.2) LoRA-Export-Pipeline schliessen → **W4** · Abnahme:
  `journal.toJsonl()` (`memory.ts:116`) hat einen echten Konsumenten (Fake-Trainer-Stub),
  containertestbar.

### 9.7 · Werkzeug-Umbau (W3, P4)

- [ ] **C-43** Skizze-Platz (EntwurfsDock-Rail, untere Zeile) → **W3/P4** · Abnahme: §1.1
  umgesetzt, `tool-skizze` unverändert, kein Doppel-«Skizzieren» im selben Cluster.
- [ ] **C-44** Schnitt-Platz (`leiste-gruppe-ansicht`) → **W3/P4** · Abnahme: §1.2
  umgesetzt, `tool-schnitt` unverändert, eigene Kontextzeilen-Gruppe sichtbar getrennt.
- [ ] **C-45** Splat-Fusion (ein Werkzeug, Laden+Panel-Toggle) → **W3/P4** · Abnahme:
  §1.3 umgesetzt, `import-splat`/`splat-werkzeug-toggle` entfallen, `splat-werkzeug`
  deckt beide Flüsse ab.
- [ ] **C-46** NavLeiste-Umzug links unten, klein, primär Space/Mitteltaste → **W3/P4** ·
  Abnahme: §1.4 Position `left:12,bottom:50`, keine Kollision mit `dw-statusleiste`/
  EntwurfsDock, Kurzbefehle.tsx unverändert korrekt.
- [ ] **C-47** Mitgezogene Dateien (ToolId/kurztasten/ZEICHEN_WERKZEUG_IDS/arbeitsmodi-
  kern/kosmo-ui-werkzeuge/dock-stationen + ~15 E2E-Specs, §1.5) → **W3/P4** · Abnahme:
  vollständige Liste aus §1.5 grün, keine vergessene Fundstelle (testid-Mengen-Beweis
  per `git diff`).

### 9.8 · Zwei-Stufen-Popups (W4)

- [ ] **C-48** `dock-kern`-Erweiterung additiv (`groesseKompakt`, Viertelflächen-Formel)
  → **W4/P5a** · Abnahme: Neutralitätstests beweisen byte-gleiches Verhalten ohne das
  neue Feld; eigener Push vor Komponentenarbeit.
- [ ] **C-49** `KPanelZweiStufen` + Pilot (Kennzahlen/Draw) → **W4/P5b** · Abnahme: beide
  Pilot-Panels nutzen die neue Komponente, alte Halbmuster (`kp-kopf-knopf`,
  `draw-tab-*`) sind ersetzt, nicht verdoppelt.
- [ ] **C-50** Systematischer Rollout auf die verbleibenden 11 Werkzeugpanels →
  **W4/P5c** · Abnahme: je Panel die in §2.3/§9.9 (falls dort ergänzt) festgelegte
  Nie-Scroll-Lösung nachgewiesen, `dp-dialog--scroll`/`overflow:auto` abgebaut.
- [ ] **C-51** Vertragserweiterungen (dock-layout/popup-layout/popup-kollision/
  inspector-layout) → **W4/P5c** · Abnahme: additive neue Assertions grün, bestehende
  unverändert grün.
- [ ] **C-52** «Wichtigste Infos»-Kopfzeilen-Rezept je Panel-Typ → **W4/P5b+c** ·
  Abnahme: jedes migrierte Panel zeigt Titel+genau-eine-Kernkennzahl im Kopf (§2.2).

### 9.9 · Abschluss

- [ ] **C-53** W10 Matrix-Abnahme (adversarial gegen diese Matrix) → Muss-Fixes →
  Release v0.8.1 (P16/P17) → **W10** · Abnahme: jede Zeile C-1…C-52 mit Beleg
  abgehakt oder als VERTAGT/GRENZE ehrlich re-bestätigt; release-gate Exit 0;
  Rundgang-PDF; SendUserFile.

---

*Ende der Spezifikation. Diese Datei wird NICHT während der Umsetzung (W1–W10) verändert —
findet ein Paket einen Widerspruch zu dieser Spez, ist das ein Fall für ein kurzes
Owner-Review, kein stiller Re-Interpretationsspielraum im Code.*
