# Kandidatenliste für den nächsten Plan (Stand 16.07.2026, nach Release v0.8.0B)

> Owner-Auftrag 16.07.: «nimm zu nächstem plan auf liste» — alle ehrlich offenen
> Punkte aus v0.8.0 (ROADMAP 381) und v0.8.0B (ROADMAP 382–393) an EINEM Ort,
> als Auswahlgrundlage für die nächste Versionsplanung. Quellenangabe je Zeile;
> nichts hier ist begonnen, nichts ist versprochen — es ist der ehrliche Vorrat.

## A · Owner-Entscheide nötig (blockieren jeweils ihren Punkt)

- [ ] **GovernanceGate-Optik:** Datei ist eingefroren und trägt keine Klassen-Anker —
  Neubau der Optik braucht die Owner-Freigabe zur Auftauung (nur className-Ergänzungen,
  Verhalten bleibt). *(393 / W7)*
- [ ] **BodenDock-Kreisgrössen (B-65):** Blaupause 44/36px vs. heutige 64/54/46px —
  Rückholung ist eigener state/-Entscheid + Neurechnung des getesteten
  `BODEN_DOCK_RESERVE_PX`-Vertrags. *(385/393)*
- [ ] **48px-Layout-Raster** als allgemeines Gestaltungsraster (heute nur als
  Dock-Backdrop erlaubt). *(Spez §9.17)*
- [ ] **Doc-Stations-Hue:** trägt Bestands-Hue `draw` — eigene Farbe wäre Owner-Frage. *(391)*
- [ ] **iPad-Touch-Drehbuch** (`docs/IPAD-TOUCH-DREHBUCH.md`) — Owner-Aktion am
  echten Gerät, seit v0.7.9 offen. *(367/381/393)*

- [ ] **AF-Stempel-Präzisierung (C-31 der v0.8.1):** Spez-Formel (6% Blattbreite +
  Mindestmass) bricht zwingend das eingefrorene `plankopf-framework.svg` —
  braucht einen eigenen deklarierten Golden-Nachtrag ODER Owner-Rückholung des
  Ist-Verhaltens (6% Stempelhöhe). *(v0.8.1/P7, ROADMAP 408)*

- [ ] **Rollen-Staffelung App-Anbindung (C-41 der v0.8.1):** `staffelung.ts` ist gebaut
  und getestet, hat aber 0 App-Aufrufer — ChatSession/KosmoPanel wählen weiter EIN
  Modell pro Sitzung. Verdrahtung «Provider-Wechsel je Aufgabenklasse» + Kuratier-Flow
  → `exportiereUndTrainiere` als eigenes Paket (UX-Entscheid nötig). *(v0.8.1/P16)*
- [ ] **dock-interaktion «Tab (c)»-Volllast-Flake:** 1× im 27-min-Batch gerissen,
  4× isoliert grün — Kandidat für dieselbe Härtungsklasse wie row-Splitter. *(v0.8.1/P16)*

## B · UI-Restrunden (klarer Scope, kein Entscheid nötig)

- [ ] **OnboardingWizard-Vollumbau** (54 Rest-Inline-Styles) + **StarterGuide-Rest** (10)
  auf die neue Grammatik. *(389/393)*
- [ ] **Publish-Preset-Wähler + Erststart-Trigger** für die publish-Station
  (Registry/Presets existieren seit 380, nur UI-Wähler/Trigger fehlen). *(381)*
- [ ] **BodenDock-Reserve für die restlichen Stationen** prüfen/anwenden
  (`BODEN_DOCK_RESERVE_PX` liegt bereit; Publish ist gelöst, W8c-A-Stationen
  visuell neu — Reserve-Abdeckung je Station verifizieren). *(380/381)*
- [ ] **Wissen-Tab-Zeilenknöpfe** auf ghost/neutral dämpfen, sobald eine
  Sammel-Aktion eingeführt wird (P8-Abnahme: heute akzeptabel). *(390)*
- [ ] **Warning-Wash-Tokens kanonisieren** (`--k-warning-wash/-line`-Fallback-Hexe
  in aura.css heben). *(392)*
- [ ] **Bauteil-/Materialkatalog-Views** (in Asset eingebettet, Herkunft data):
  auf KKeyValue/KCard-Grammatik, wenn data-Folgerunde ansteht. *(391)*

## C · Technik / Tests

- [ ] **row-Splitter-Last-Flake** (dock-interaktion): Diagnose liegt vor — Panel
  öffnet 573px, Content-Re-Solve settelt ~500ms später auf 272px; landet der
  Re-Solve nach der Messung, platzt die Assertion. Fix-Kandidat: Re-Solve
  deterministisch abwarten (Produkt-Event statt stabileBox-Fenster). *(390/393)*
- [ ] **kurztasten-pan «Fling/Momentum»-Flake** (SwiftShader-Timing, HEAD-bewiesen). *(390)*
- [ ] **kosmodata-wissen.spec:77** Fixture-Skip auflösen (Import-Fixture). *(388)*
- [ ] **B-135 Linien-Skala:** formell geschlossen OHNE Bauauftrag — nur wieder
  öffnen, wenn ein echter Konsument entsteht. *(393)*

## D · Grosse vertagte Features (je eigener Plan-Kandidat)

- [ ] **D1/D4-Plangrafik-Nachschärfungen** aus dem 0.7.3-Paket — braucht deklarierten
  Golden-Sammelwechsel («GOLDEN-CHURN: MITTEL»). *(Owner-Entscheid 5 der v0.8.0B)*
- [ ] **planToSvg-Vollplankopf** im Design-Einzelexport (Owner-Entscheid 4 der v0.8.0,
  Geometrie-Shift in 15 Goldens). *(381)*
- [ ] **Büro-Logo SVG/JPG** (heute ehrliche PNG-Ablehnung). *(381)*
- [ ] **Einzelblatt-PDF mit Plancode-Namen** (Bündel-PDF bleibt ohne). *(378)*
- [ ] **Auto-Pack-Layout-Editor** («Intelligentes Planlayout»). *(381)*
- [ ] **Rolle 1600×594 / Leporello-Faltung** (Prototyp-Frage Länge offen). *(381)*
- [ ] **27-Formate-Export-Hub** (nur mit realen Formaten hinterlegt). *(381)*
- [ ] **.kxp-Hyper-Modell/Viewer + Trust-Layer-Freigabe-Workflow**
  (HomeStation/Konten-gebunden). *(381)*
- [ ] **KosmoPackage-Screen**. *(381)*
- [ ] **AF-Stempel-Spez-Präzisierung** («2-mm-äquivalent» vs. proportional 6%). *(379/381)*
- [ ] **0.7.2-Reste** (Owner-Entscheid 6 der v0.8.0B): Schwarm-Orbs (max. 3),
  Schliessen-Choreografie (Fenster→Orb mit Plopp), Viz-Viewport-Vollausbau
  (gespeicherte Ansichten, Review-Pins, echte GPU-Telemetrie — HomeStation). *(382)*
- [ ] **0.7.5-Welle-2-Soll-Bilder** (Fable-Entscheid W0): Vis-Onboarding-Stepper,
  Report-Dossier/Print, Datenstationen-Vollbild. *(382, §9.17)*
- [ ] **Orbit-Hub-Vollausbau · Mobile Companion · Nutzungszeit-Panel**. *(Spez §9.17)*
