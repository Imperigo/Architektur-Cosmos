# V091-SPEZ «Trittsicher» — Geländer + Rampe als echte Werkzeuge

> Owner-Entscheide 22.07.2026 (AskUserQuestion): Hauptstrang **Geländer +
> Rampe** · Golden-Zug **Geländer im Plan (+1 neuer Golden)** · KosmoTrain
> **bedingter Posten**. Quelle der Lücken: IDC-Nachbau-Analyse (ROADMAP 611,
> `wissen/training/idc-academy/`): Geländer ist heute nur ein 2D-Beschlag-
> Symbol an Öffnungen (`Opening.absturzsicherung`, entities.ts:234), Rampe
> fehlt komplett. Bedient Owner-Register K24. Genehmigter Plan:
> Plan-Datei «silly-plum» (22.07.).

## Bau-Schablone (belegt, Faktencheck 22.07.)

Treppen-Muster = Vorlage: Entity `Stair` (entities.ts:292-305) + Command
`design.treppeErstellen` (commands/design.ts:1393-1433, Steigungs-Gate via
`treppenTeile()`) + geteilte Zerlegung `derive/treppe.ts` (EINE Wahrheit für
Plan/3D/Checks) + Plan (derive/plan.ts:613-658) + 3D (derive/scene.ts:42).
Outline-Vorbild: `columnOutline()` (entities.ts:92-96).

## Posten

### P-A1 «Geländer-Kern» (Sonnet, Worktree — Kernel)
Entity `Gelaender` (kind 'gelaender'): `storeyId`, `punkte: Pt[]` (Polylinie,
Muster MassKette), `hoehe` (Default 1000, geklemmt 700–1500), `art:
'staketen'|'handlauf'|'voll'`. Command `design.gelaenderZeichnen` (zod, min 2
Punkte) + `eigenschaftSetzen`-Felder (hoehe/art) + Undo. `derive/gelaender.ts`:
Polylinie → Pfosten-Positionen (~1200mm Teilung) + Handlauf-Segmente — EINE
Funktion für 3D und (später P-B3) Plan. 3D: Pfosten als dünne Extrusionen +
Handlauf-Band in derive/scene.ts. Unit-Tests (Zerlegung/Command/Undo).
**Goldens 0. TABU: derive/plan.ts, plansvg.ts, PlanView, DesignWorkspace,
plan-hit-test.**

### P-A2 «Rampen-Kern» (Sonnet, Worktree — Kernel, disjunkt zu A1)
Entity `Rampe` (kind 'ramp'): `a`, `b`, `width`, `hoehenDelta` (mm), optional
`podestLaenge`. Steigung = hoehenDelta/Länge (abgeleitet, nie gespeichert).
Command `design.rampeZeichnen` mit EHRLICHEM Steigungs-Gate: >6 % Hinweis
«nicht hindernisfrei (SIA 500)» (Command läuft durch), >15 % harte Ablehnung
mit Grund (Tiefgaragen-Grenze) — keine stillen Klemmungen. `derive/rampe.ts`:
geneigte Platte (3D) + Plan-Bausteine (Kontur, Lauflinie, Steigungspfeil mit
%-Text) als DATEN — noch NICHT in plan.ts eingehängt (das ist P-B3). 3D:
geneigte Extrusion. Unit-Tests inkl. Gate-Grenzen (5.9/6.1/14.9/15.1 %).
**Goldens 0. TABU wie P-A1.**

### P-T «betriebKonfig als eine Quelle» (Sonnet — App)
Matrix-C-3-Nebenbefund 0.9.0: ~14 Literal-Fallbacks (`'http://localhost:11434'`
u. ä.) in KosmoPanel.tsx:389, WerkzeugSetup.tsx:62-74, Diagnose.tsx,
StartSequenz.tsx, onboarding-pairing.ts, OnboardingWizard.tsx, vis-jobs.ts:61,
GpuStatus.tsx, VisWorkspace.tsx, bake-auftrag.ts, knowledge.ts → auf
`betriebKonfig()`/eine gemeinsame Default-Konstante ziehen (TLS-Edge-Fall
https/wss). Standardfall-Verhalten byte-gleich, bestehende Tests grün,
Abschluss-grep beweist: keine Literal-Duplikate mehr ausser der EINEN Quelle.

### P-B1 «Zeichnen + Griffe» (FABLE — Cluster B, exklusiv)
PlanView/DesignWorkspace/plan-hit-test: Klickketten-Modus «Geländer» (Muster
Masskette), Zwei-Punkt-Modus «Rampe» (Muster Wand), Vorschau, Griffe
(Punkt-Griffe Geländer, a/b-Griffe Rampe). E2E: zeichnen → Doc-Beweis → Undo;
Griff-Drag.

### P-B2 «Insel + Inspector» (Sonnet — UI)
ZEICHNEN-Insel: Werkzeuge `island-werkzeug-gelaender`/`-rampe` + Mini-Popups
(Höhe/Art bzw. Breite/Höhendelta), Katalog + registry nach Insel-Muster;
Inspector-Felder beider Entities. **TABU: Cluster-B-Dateien.**

### P-B3 «Der Golden-Zug» (FABLE, solo)
derive/plan.ts + plansvg.ts: Geländer (Linie mit Pfosten-Ticks, Klasse
`gelaender`) + Rampe (Kontur, Steigungspfeil, %-Text) hinter Daten-Guards.
NEUES Fixture + Golden `gelaender-rampe-plan.svg` (EIN kombiniertes Fixture =
ein Zug, eine Datei). Ist==Prognose, PNG-Sichtung, svg-qa 40/0.

### P-C «KosmoTrain-Ingest» (Sonnet — BEDINGT)
NUR wenn der Home-PC-Worker-Bericht (HOMEPC-KOSMOTRAIN-PROMPT) eingetroffen
ist: gegenprüfen, IDC-Tiefe + ETH-Analysen einordnen, Nachbau-Liste fürs
0.9.2-Papier. Fehlt der Bericht bei Tag C: entfällt ersatzlos (deklariert).

### Fortlaufend (owner-gebunden, kein Release-Blocker)
E-V-Reste 0.9.0 (4 Hardware-Beweise + OLLAMA_ORIGINS + sync-Unit tsx→node +
Fehlermeldeweg-Env/Deploy-Key — Worker-Punkte 23.07.) → Nachtrag in
HOMESERVER-STATUS; §0b-Fehlerbericht-Sichtung ist ab jetzt Release-Pflicht.

## Sanktionen
1. Bewegter Bestands-Golden irgendwo = Paket ungültig (P-B3 fügt NUR +1 neu).
2. P-A1/P-A2 fassen plan.ts/plansvg/PlanView an = Scope-Bruch.
3. P-B2 fasst Cluster-B-Dateien an = Mandats-Bruch (Cluster B = Fable).
4. Steigungs-Gate stillschweigend klemmen statt ehrlich melden = ungültig.
5. P-C ohne eingetroffenen Worker-Bericht «vorbauen» = ungültig.
6. Release ohne §0b-Fehlerbericht-Sichtung = Ritualverstoss.

## Vollständigkeits-Matrix
C-1 Geländer Entity+Command+3D mit Tests → P-A1 · C-2 Rampe inkl. ehrlichem
Steigungs-Gate (6/15 %) → P-A2 · C-3 Zeichnen+Griffe E2E → P-B1 · C-4
Insel/Inspector island-only bedienbar → P-B2 · C-5 Golden +1 neu / 40
Bestands byte-still / svg-qa 40/0 / Ist==Prognose → P-B3 · C-6 betriebKonfig-
Vereinheitlichung, Literal-grep leer → P-T · C-7 KosmoTrain-Ingest ODER
deklarierter Entfall → P-C · C-8 Ritual komplett inkl. §0b → Fable.

## Nicht-Ziele (mit Begründung)
**K27-Druckmass** = fest der EINE Golden-Zug von **0.9.2** (Owner-Wahl 22.07.:
0.9.1-Zug gehört dem Geländer) · Profil-Manager (K30) + Detail-Werkzeug =
nächste IDC-Nachbau-Welle · Sonnenstudien-Tool (K34/K37) = KosmoSpez-/R5-
gebunden (Fundament existiert: suncalc in besonnungsvergleich.ts/Viewport3D/
SONNE-Insel) · HDD-Voll-Index · Gaussian Splatting · Serie H/I/J.


## Ergebnisblock (Release-Gate, 23.07.2026)

**Alle Posten gelandet:** P-A2 Rampen-Kern (615) · P-A1 Geländer-Kern (619) ·
P-T betriebKonfig (620) · P-B2 Insel+Inspector (621) · P-B1 Zeichnen+Griffe
(622, Fable/Cluster B) · P-B3 Golden-Zug (623, Ist==Prognose 0 bewegt/+1 neu,
GW-091 Teil 2) · **P-C: deklarierter Entfall** (kein Home-PC-Worker-Bericht
eingetroffen — §P-C-Klausel, ehrlich im Neuigkeiten-Block benannt).

**Matrix C-1…C-8:** C-1…C-5 durch unabhängige adversariale Prüfer ERFÜLLT
(Datei:Zeile-Belege + echte Testläufe, Workflow wf_85902fc4); C-6/C-7 nach
einem HEAD-Pin-Prozessfehler (Prüfer auf 2be2641 gepinnt, Vorbereitungs-
Commit 1ccbfcd kam dazwischen — die Prüfer brachen KORREKT ab) vom Fable auf
dem aktuellen Stand nachgeprüft und ERFÜLLT: Literal-grep ausserhalb
betrieb.ts nur 3 Doku-Kommentare, TLS-Zweig intakt; kein Worker-Bericht →
Entfall deklariert. C-8 = dieses Ritual selbst (Träger-Bumps, lehren VOR dem
🚀-Commit committet [1ccbfcd], §0b-Sichtung: KEINE eingegangenen
Fehlerberichte — Übertragungsweg wartet auf Owner-Env+Deploy-Key).

**Zahlen:** Kernel 1221 · App 1780 · KI 330 · Contracts 54 · Data 44 ·
Lizenz 8 · UI 111 = 3548 · Goldens 41 Dateien (40 SVG + 1 IFC), svg-qa 40/0 ·
Sanktionen 1–6: keine verletzt. Voll-E2E-Ergebnis und release-gate-Exit
stehen im 🚀-Commit-Text (ROADMAP 624).

**Owner-Zusatzpunkte in dieser Version (ausserhalb der Spez, 22.07.):**
Claude-Abo-Login-Fix (echte claude-CLI statt Phantom-`ant`, 616) ·
Cursor Windows-Schräge 22.25° + minimale Klick-Reaktion + Effizienz
(616/617) · UI-Beschnitt-Audit mit neuer Sonde, 49-px-Panel-Fix (618).
