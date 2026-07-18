# Kandidatenliste für den nächsten Plan (Stand 17.07.2026, nach Release v0.8.1)

> Owner-Auftrag 16.07.: «nimm zu nächstem plan auf liste» — alle ehrlich offenen
> Punkte aus v0.8.0/v0.8.0B/v0.8.1 an EINEM Ort, als Auswahlgrundlage für die
> nächste Versionsplanung. Quellenangabe je Zeile; nichts hier ist begonnen,
> nichts ist versprochen — es ist der ehrliche Vorrat.
>
> **Bereinigung 17.07.2026 (v0.8.2/P4, `docs/V082-SPEZ.md` §6.4):** v0.8.1
> (ROADMAP 394–416) hat praktisch die gesamte v0.8.0B-Restliste abgearbeitet —
> alle vier Owner-Entscheid-Punkte (GovernanceGate/B-65/48px/Doc-Hue, ROADMAP
> 398), alle drei UI-Restrunden-Punkte (ROADMAP 400/408/415), drei der vier
> Technik-Flakes (ROADMAP 399/401), und alle sechs D-Brocken (ROADMAP
> 407/408/410/411/412/413/414). Erledigte Zeilen sind unten durchgestrichen
> mit ROADMAP-Beleg stehen gelassen (Nachvollziehbarkeit); die frühere
> AF-Stempel-Zeile ist ganz entfernt (formell geschlossen, eigener Absatz am
> Ende). Zwei während v0.8.1 selbst neu gefundene, vom Prüfagenten ausdrücklich
> als Kandidat notierte Punkte wurden ergänzt (Sektion C). Verbleibende Punkte
> wurden einzeln gegen ROADMAP 394–416 geprüft und — soweit noch offen —
> unverändert übernommen.

## A · Owner-Entscheide nötig (blockieren jeweils ihren Punkt)

- [x] ~~**GovernanceGate-Optik:** Datei ist eingefroren und trägt keine
  Klassen-Anker — Neubau der Optik braucht die Owner-Freigabe zur Auftauung
  (nur className-Ergänzungen, Verhalten bleibt).~~ *(393 / W7)* — **erledigt:**
  aufgetaut und wieder eingefroren, ausschliesslich style→className-Tausch auf
  den bereitliegenden `.k-approval*`-Satz, testid-/aria-Mengen byte-identisch
  *(v0.8.1/P1, ROADMAP 398)*.
- [x] ~~**BodenDock-Kreisgrössen (B-65):** Blaupause 44/36px vs. heutige
  64/54/46px — Rückholung ist eigener state/-Entscheid + Neurechnung des
  getesteten `BODEN_DOCK_RESERVE_PX`-Vertrags.~~ *(385/393)* — **erledigt:**
  `TIER_GROESSE {44,36,36}` gebaut, `BODEN_DOCK_RESERVE_PX` 180→160 mit
  hergeleiteter Formel *(v0.8.1/P1, ROADMAP 398)*.
- [x] ~~**48px-Layout-Raster** als allgemeines Gestaltungsraster (heute nur
  als Dock-Backdrop erlaubt).~~ *(Spez §9.17)* — **erledigt (formell
  geschlossen ohne Generalisierung):** Owner-Entscheid, kein
  verbraucherloser Token-Ausbau *(v0.8.1/P1, ROADMAP 398)*.
- [x] ~~**Doc-Stations-Hue:** trägt Bestands-Hue `draw` — eigene Farbe wäre
  Owner-Frage.~~ *(391)* — **erledigt:** 9. Rolle `--k-rolle-doc` eingeführt,
  DocWorkspace umgestellt *(v0.8.1/P1, ROADMAP 398)*.
- [ ] **iPad-Touch-Drehbuch** (`docs/IPAD-TOUCH-DREHBUCH.md`) — Owner-Aktion am
  echten Gerät, seit v0.7.9 offen. *(367/381/393)* — weiterhin offen, v0.8.1
  hat die simulierte Mobile-Companion-Seite gebaut, aber echte Geräte-Kopplung
  bleibt ausdrücklich Owner-Aktion *(ROADMAP 414, „companion-geraete-grenze")*.

- [ ] **Rollen-Staffelung App-Anbindung (C-41 der v0.8.1):** `staffelung.ts` ist
  gebaut und getestet, hat aber 0 App-Aufrufer — ChatSession/KosmoPanel wählen
  weiter EIN Modell pro Sitzung. Verdrahtung «Provider-Wechsel je
  Aufgabenklasse» + Kuratier-Flow → `exportiereUndTrainiere` als eigenes Paket
  (UX-Entscheid nötig). *(v0.8.1/P16, ROADMAP 415)* — **Status: in Arbeit
  v0.8.2** (`docs/V082-SPEZ.md` §6.7/P6, Owner-Entscheid 3: Staffelung
  automatisch + sichtbares Rollen-Badge; W2, nach P3-Merge).
- [ ] **dock-interaktion «Tab (c)»-Volllast-Flake:** 1× im 27-min-Batch
  gerissen, 4× isoliert grün — Kandidat für dieselbe Härtungsklasse wie der
  (inzwischen gefixte) row-Splitter. *(v0.8.1/P16, ROADMAP 415/416 —
  ausdrücklich als weiterhin ehrlich offen in die nächste Version übergeben)*

## B · UI-Restrunden (klarer Scope, kein Entscheid nötig)

- [x] ~~**OnboardingWizard-Vollumbau** (54 Rest-Inline-Styles) +
  **StarterGuide-Rest** (10) auf die neue Grammatik.~~ *(389/393)* —
  **erledigt:** OnboardingWizard 54→2, StarterGuide 10→1 Inline-Styles
  *(v0.8.1/P3, ROADMAP 400)*.
- [x] ~~**Publish-Preset-Wähler + Erststart-Trigger** für die publish-Station
  (Registry/Presets existieren seit 380, nur UI-Wähler/Trigger fehlen).~~
  *(381)* — **erledigt:** KToolGruppe «Oberfläche» (Fokus/Arbeiten/Prüfen) +
  Erststart-Trigger gebaut *(v0.8.1/P7, ROADMAP 408)*.
- [x] ~~**BodenDock-Reserve für die restlichen Stationen** prüfen/anwenden
  (`BODEN_DOCK_RESERVE_PX` liegt bereit; Publish ist gelöst, W8c-A-Stationen
  visuell neu — Reserve-Abdeckung je Station verifizieren).~~ *(380/381)* —
  **erledigt:** drei echte Kollisionen gefunden (daten/wissen/pipeline) und
  behoben, permanenter Vertrag `boden-dock-reserve-c14.spec`
  *(v0.8.1/P16, ROADMAP 415)*.
- [ ] **Wissen-Tab-Zeilenknöpfe** auf ghost/neutral dämpfen, sobald eine
  Sammel-Aktion eingeführt wird (P8-Abnahme: heute akzeptabel). *(390)* —
  weiterhin offen, in v0.8.1 nicht angefasst (keine Sammel-Aktion eingeführt).
- [x] ~~**Warning-Wash-Tokens kanonisieren** (`--k-warning-wash/-line`-
  Fallback-Hexe in aura.css heben).~~ *(392)* — **erledigt:** echte Tokens in
  `aura.css`, gespiegelt in `tokens.ts`, im token-spiegel-Test bewacht
  *(v0.8.1/P3, ROADMAP 400)*.
- [x] ~~**Bauteil-/Materialkatalog-Views** (in Asset eingebettet, Herkunft
  data): auf KKeyValue/KCard-Grammatik, wenn data-Folgerunde ansteht.~~
  *(391)* — **erledigt:** Bauteilkatalog + beide Material-Detail-Panels auf
  `KKeyValue` *(v0.8.1/P3, ROADMAP 400)*.

## C · Technik / Tests

- [x] ~~**row-Splitter-Last-Flake** (dock-interaktion): Diagnose liegt vor —
  Panel öffnet 573px, Content-Re-Solve settelt ~500ms später auf 272px; landet
  der Re-Solve nach der Messung, platzt die Assertion. Fix-Kandidat: Re-Solve
  deterministisch abwarten (Produkt-Event statt stabileBox-Fenster).~~
  *(390/393)* — **erledigt:** `data-solve-generation` + MutationObserver-Warten
  statt stabileBox-Fenster, 3× hintereinander grün *(v0.8.1/P2, ROADMAP 399)*.
- [x] ~~**kurztasten-pan «Fling/Momentum»-Flake** (SwiftShader-Timing,
  HEAD-bewiesen).~~ *(390)* — **erledigt:** `flingTracker(fensterMs?)`
  parametrisiert + Test-Hook, 3× grün *(v0.8.1/P4, ROADMAP 401)*.
- [x] ~~**kosmodata-wissen.spec:77** Fixture-Skip auflösen
  (Import-Fixture).~~ *(388)* — **erledigt:** kein fehlendes Fixture, der Test
  racete gegen den asynchronen Manifest-Fetch; `waitForResponse` ergänzt, 3×
  grün, 0 skipped *(v0.8.1/P2, ROADMAP 399)*.
- [ ] **B-135 Linien-Skala:** formell geschlossen OHNE Bauauftrag — nur wieder
  öffnen, wenn ein echter Konsument entsteht. *(393)* — unverändert, in
  v0.8.1 nicht wieder aufgegriffen.
- [ ] **dock-tour «7 Schritte»-Flake** (NEU, erstmals in v0.8.1 gefunden):
  fällt identisch auf sauberem HEAD, Worktree-bewiesen vorbestehend — vom
  Prüfagenten selbst als «neuer Kandidaten-Punkt» notiert.
  *(v0.8.1/P1, ROADMAP 398)*
- [x] ~~**Statusleisten-2-Zeilen-Wrap × NavLeiste** (NEU, erstmals in v0.8.1
  gefunden): bei 1400×900 mit vollem Chip-Satz kann die zweizeilig
  umbrechende Statusleiste die NavLeiste geometrisch überlappen
  (`pointer-events:none`, kein Klick-Blocker, aber optisch unsauber) — vom
  Prüfagenten selbst als «Kandidat für die Restrundenliste» notiert.
  *(v0.8.1/P4, ROADMAP 401)*~~ — **erledigt:** `.dw-statusleiste` steht auf
  `flex-wrap: nowrap` (`design.css:405-435`, vorher `wrap`) — die Leiste
  wächst nie mehr auf eine zweite Zeile, unabhängig von der Chip-Zahl, bleibt
  strukturell auf `min-height:30px` und damit ausserhalb der `NavLeiste`-Zone
  (`bottom:50`). Mengen-Beweis: `e2e/statusleiste-nav-overlap.spec.ts`
  misst `getBoundingClientRect().height` der Statusleiste ≤ 40px (gegen den
  unveränderten Ist-Stand schlägt genau diese Assertion mit 55.9px fehl —
  live gegengeprüft) *(v0.8.3/P5, s. Bauagenten-Bericht — ROADMAP-Eintrag
  folgt im Release-Commit)*.
- [x] ~~**kosmo-ui-bruecke (d) × nav-pan-Überdeckung** (NEU, erstmals im
  v0.8.2/P3-Gate reproduziert): im `3D | Plan`-Split
  (`dw-viewport-flex--getrennt`) fängt der schwebende `nav-pan`-HUD-Knopf
  Klicks auf den `modus-chip` ab («subtree intercepts pointer events»,
  90s-Timeout in Test d) — 2× unabhängig reproduziert (P3-Agent isoliert +
  Fable-Gate gegen frisches Bundle :5183), Ursache ausserhalb jedes
  v0.8.2-Dateikreises (Viewport-HUD-Float × Statuszeile; anders als die
  Wrap-Zeile darüber ein ECHTER Klick-Blocker). Ausdrücklich NICHT C-28
  (das ist der «Tab (c)»-Flake in dock-interaktion, von P7a gehärtet).
  *(v0.8.2/P3-Gate, ROADMAP 424)*~~ — **erledigt (Doppelfix, §8 E8 der
  `V083-SPEZ.md`):** zusätzlich zu `nowrap` bekommt `.dw-modus-chip-wrap`
  ein explizites `z-index: 6` (`design.css:438-451`) — über `NavLeiste`s
  `zIndex:5` (`NavLeiste.tsx:48`, bereits vorhanden), Rangfolge 6>5 statt
  zufälliger DOM-Reihenfolge. Live gegen den unveränderten Ist-Stand
  reproduziert (wörtlich: `<button … data-testid="nav-pan" …> from <div
  class="dw-viewport-flex dw-viewport-flex--getrennt">…</div> subtree
  intercepts pointer events`, 90s-Timeout in Test (d)) — mit dem Fix
  `kosmo-ui-bruecke.spec.ts` 3× hintereinander 4/4 grün auf Port 5176, dazu
  der neue `elementFromPoint`-Regressionstest
  `e2e/statusleiste-nav-overlap.spec.ts` (reproduziert denselben
  eingefrorenen Split-Zustand wie Test (d), schlägt auf dem alten CSS-Stand
  nachweislich fehl, ist mit dem Fix grün) *(v0.8.3/P5, s. Bauagenten-Bericht
  — ROADMAP-Eintrag folgt im Release-Commit)*.

## D · Grosse vertagte Features (je eigener Plan-Kandidat)

**Alle sechs D-Brocken der v0.8.1-Spez sind geliefert — dieser Abschnitt ist
aktuell leer** (nächste grosse vertagte Features müssten neu entstehen, keine
Reste aus v0.8.0/v0.8.0B/v0.8.1 offen):

- [x] ~~**D1/D4-Plangrafik-Nachschärfungen** aus dem 0.7.3-Paket — braucht
  deklarierten Golden-Sammelwechsel («GOLDEN-CHURN: MITTEL»).~~ *(Owner-
  Entscheid 5 der v0.8.0B)* — **erledigt:** Recherche ergab, D1/D4 waren
  bereits in v0.7.3/v0.7.4 geschlossen; die echte Rest-Lücke (Doppel-
  Handschrift `planToSvg`) wurde im selben Zug behoben *(v0.8.1/P6,
  ROADMAP 407)*.
- [x] ~~**planToSvg-Vollplankopf** im Design-Einzelexport (Owner-Entscheid 4
  der v0.8.0, Geometrie-Shift in 15 Goldens).~~ *(381)* — **erledigt:** Golden-
  Sammelwechsel 081, `planToSvg` rendert jetzt denselben kanonischen
  180×55mm-Plankopf wie `sheetToSvg` *(v0.8.1/P6, ROADMAP 407)*.
- [x] ~~**Büro-Logo SVG/JPG** (heute ehrliche PNG-Ablehnung).~~ *(381)* —
  **erledigt:** Guard akzeptiert SVG/JPG, lehnt PNG ab *(v0.8.1/P7,
  ROADMAP 408)*.
- [x] ~~**Einzelblatt-PDF mit Plancode-Namen** (Bündel-PDF bleibt ohne).~~
  *(378)* — **erledigt:** `exportSheetPdf()` über den geteilten Render-Kern
  *(v0.8.1/P7, ROADMAP 408)*.
- [x] ~~**Auto-Pack-Layout-Editor** («Intelligentes Planlayout»).~~ *(381)* —
  **erledigt:** `AutoPackPanel.tsx`, additive `BlattPackOptions`
  *(v0.8.1/P12, ROADMAP 410)*.
- [x] ~~**27-Formate-Export-Hub** (nur mit realen Formaten hinterlegt).~~
  *(381)* — **erledigt (Owner-korrigierte Gestalt):** KosmoPackage als 14.
  Station, sechs reale Formate + `.kxp`, bewusst KEINE 27-Format-Kachel-Wand
  *(v0.8.1/P14, ROADMAP 412)*.
- [x] ~~**.kxp-Hyper-Modell/Viewer + Trust-Layer-Freigabe-Workflow**
  (HomeStation/Konten-gebunden).~~ *(381)* — **erledigt (Konten-/Signatur-
  Grenze im UI ehrlich benannt):** `.kxp`-Dateiformat + KosmoTrust-Viewer +
  Freigabe-Zustandsmaschine *(v0.8.1/P11, ROADMAP 411)*.
- [x] ~~**KosmoPackage-Screen**.~~ *(381)* — **erledigt:** 14. Station, bündelt
  alle sechs realen Formate + `.kxp` *(v0.8.1/P14, ROADMAP 412)*.
- [x] ~~**Rolle 1600×594 / Leporello-Faltung** (Prototyp-Frage Länge
  offen).~~ *(381)* — **erledigt:** `ROLLE_LAENGE_STANDARD_MM=1600` als
  benannte Konstante, `leporelloFaltung()` additiv *(v0.8.1/P13, ROADMAP
  413)*.
- [x] ~~**0.7.2-Reste** (Owner-Entscheid 6 der v0.8.0B): Schwarm-Orbs
  (max. 3), Schliessen-Choreografie (Fenster→Orb mit Plopp),
  Viz-Viewport-Vollausbau (gespeicherte Ansichten, Review-Pins, echte
  GPU-Telemetrie — HomeStation).~~ *(382)* — **erledigt (GPU-Telemetrie mit
  deklarierter HomeStation-Grenze):** alle drei Teile gebaut; GPU-Prozentzahl
  im Container ehrlich «nicht verfügbar» statt erfunden *(v0.8.1/P8,
  ROADMAP 409)*.
- [x] ~~**0.7.5-Welle-2-Soll-Bilder** (Fable-Entscheid W0): Vis-Onboarding-
  Stepper, Report-Dossier/Print, Datenstationen-Vollbild.~~ *(382, §9.17)* —
  **erledigt:** alle drei container-baubaren Teile gebaut *(v0.8.1/P8,
  ROADMAP 409)*.
- [x] ~~**Orbit-Hub-Vollausbau · Mobile Companion · Nutzungszeit-Panel**.~~
  *(Spez §9.17)* — **erledigt:** 14/14 Stationen erreichbar, responsive
  Companion-Klassen, ehrliches Nutzungszeit-Panel (Dauern nicht gemessen, im
  UI benannt) *(v0.8.1/P15, ROADMAP 414)*.

## AF-Stempel — entfernt (formell geschlossen, kein offener Punkt mehr)

Die frühere Zeile **«AF-Stempel-Präzisierung (C-31 der v0.8.1)»** (Sektion A)
sowie ihr Duplikat **«AF-Stempel-Spez-Präzisierung (‹2-mm-äquivalent› vs.
proportional 6%)»** (Sektion D, Belege 379/381) sind **ersatzlos entfernt**,
nicht nur gestrichen: `docs/V082-SPEZ.md` §7 (Owner-Entscheid 4) hat den
Konflikt aufgelöst — das bisherige **Ist-Verhalten wird formell zum Soll**
(`STEMPEL_BREITE_VERHAELTNIS=0.48`, `STEMPEL_SEITENVERHAELTNIS=0.24`, die 6 %
sind die Rahmen-Strichstärke relativ zur Stempelhöhe, nicht 6 % der
Blattbreite). **Kein Golden-Wechsel** — `plankopf-framework.svg` bleibt
byte-gleich, weil sich rechnerisch nichts ändert. Damit ist C-31 (offen seit
`docs/V081-SPEZ.md` §9.5, dort als VERTAGT markiert, Zeilen 655–660) **formell
geschlossen** und braucht keinen weiteren Kandidatenlisten-Eintrag mehr.
*(Beleg: `docs/V082-SPEZ.md` §7, ROADMAP 417; Historie: ROADMAP 379/381/408,
`docs/V081-SPEZ.md:657–660`.)*
