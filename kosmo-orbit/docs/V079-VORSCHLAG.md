# KosmoOrbit v0.7.9 — Vorschlag & Restpunkte-Sammlung

*Stand 14.07.2026, geschrieben parallel zur laufenden v0.7.8-Umsetzung (Wellen D/1/2
fertig, Welle 3 fast — P6 «Vis-Station im Dock» ist eingecheckt/ROADMAP 358, P7 «Kosmo
ordnet» läuft gerade in einem Nachbar-Stream und ist bewusst NICHT Gegenstand dieses
Dokuments). Dieser Vorschlag ist eine Entscheidungsgrundlage für den Owner/Fable, keine
Zusage — nichts hier ist bereits gebaut, keine der Aufwandsschätzungen ist mehr als eine
grobe Einordnung.*

---

## Woher die Punkte kommen

Diese Liste ist **kein neues Brainstorming**, sondern die wörtliche Auslese der schon
heute im Repo ehrlich als offen benannten Stellen. Drei Quellen:

1. **ROADMAP.md, Einträge 350–358** — jede v0.7.8-Runde endet mit einem «Ehrlich
   offen»/«Restpunkte»-Satz. Die dort genannten Punkte sind unten wörtlich oder nah am
   Wortlaut übernommen, mit Eintragsnummer belegt.
2. **Code-Kommentare der neuen Dock-Schicht** (`apps/kosmo-orbit/src/shell/dock/`,
   `apps/kosmo-orbit/src/state/dock-*.ts`, `apps/kosmo-orbit/src/modules/design/
   ViewportChrome*.tsx`) — dort stehen dieselben Restpunkte oft ausführlicher, inkl. der
   zwei Lösungswege, die der jeweilige Stream selbst schon durchdacht, aber bewusst nicht
   umgesetzt hat (Scope-Grenze des Auftrags).
3. **docs/HOMESTATION-AUFTRAG.md** + **neuigkeiten.ts** (0.7.x-Einträge) — die
   wiederkehrenden «kommt mit angeschlossener Zentrale»-Punkte. Diese werden **nur
   informativ gelistet** (Gruppe D), nicht geplant: sie hängen an Owner-Hardware
   (HomeStation, RTX 5090) und einem echten Anthropic-Schlüssel, nicht an Container-Arbeit.

Kein Punkt hier ist erfunden — jeder trägt einen Beleg (ROADMAP-Nummer und/oder
Dateipfad).

---

## Gruppe A — Dock-Vollendung

Die «Intelligenten Werkzeugtabs» (v0.7.8, Wellen 1–3) haben den grössten
Kollisions-Cluster der App aufgelöst. Was bleibt, ist eine einzige verbliebene
Überlappungs-**Klasse** (nicht mehrere Einzelfälle) plus ein paar kleinere
Interaktions-Lücken.

**A1 · Fixe ViewportChrome-Säulen ins Dock ODER Solver-Ausschlusszonen — die eine
verbliebene Überlappungs-Klasse.** Die Eigenschaften-Spalte und die HUD-Statuskarte
blieben in P5 bewusst fixe Chrome (ihre gemessene Grösse passte zu keinem der vier
Float-Slots). Der Dock-Solver kennt diese Spalte aber nicht als Geschwister-Rect — in der
Split-Ansicht kann darum das `viewportOrientierung`-Float mit ihrer unteren Ecke
überlappen (real gemessen, 1400×900, Split + `kv-oeffnen`: ~130×85px). Derselbe Effekt
taucht in Welle 3/P6 nochmal auf (B-Streifen/Linksspalte gegen dieselbe Säule). Zwei
mögliche Lösungswege stehen bereits im Code notiert: (a) den Solver um phantome/feste
Ausschlussrechtecke erweitern, oder (b) die Säule selbst wie `kennzahlen`/`inspector`
ins Dock migrieren. Aufwand: **M** (Solver-Erweiterung ist der grössere Teil, Migration
der Säule ins Dock wäre die naheliegendere, aber invasivere Variante).
→ *Belege: ROADMAP 357, 358; `apps/kosmo-orbit/src/modules/design/ViewportChrome.tsx:209–227`;
`apps/kosmo-orbit/src/state/dock-stationen.ts:292–315`.*

**A2 · HUDs in der Quad-Ansicht.** Der Solver kennt genau EIN zentrales
Viewport-Rechteck je Station, keine vier Grid-Zellen — die vier Viewport-HUD-Floats sind
darum bewusst nur in 3D-/Split-Ansicht sichtbar, nicht in Quad (dort würden sie über das
ganze 2×2-Feld schweben statt über der Viewport3D-Zelle). Das war ein expliziter
Scope-Schnitt des P5-Auftrags («3D-/Split-Ansicht wie heute»), keine vergessene Lücke —
aber eine echte Funktionslücke für Quad-Nutzer:innen. Ein sauberer Ausbau bräuchte den
Solver um Mehrfach-Zellen-Bewusstsein zu erweitern. Aufwand: **M/L** (grössere
Solver-Änderung als A1, weil Grid-Semantik neu ist, nicht nur ein Ausschlussrechteck).
→ *Beleg: ROADMAP 357; `apps/kosmo-orbit/src/state/dock-stationen.ts:305–315`.*

**A3 · Eingeklappte Tabs als Drag-Handles + Snap-Zonen für schwebende Panels.**
Header-Drag mit Magnet/Snap-zurück existiert (P4) für offene Panel-Köpfe — die
34px-Tabs eingeklappter Panels sind bisher keine Drag-Handles, sie können nur über
Chevron/Klick wieder geöffnet werden, nicht direkt aus dem Tab-Zustand heraus verschoben
oder gedockt werden. Das ist die naheliegende Vervollständigung des «Intelligenten
Werkzeugtabs»-Versprechens. Aufwand: **S/M** (Interaktionslogik existiert am offenen
Panel schon, muss auf den Tab-Zustand übertragen werden).
→ *Beleg: ROADMAP 356 («Ehrlich offen: Tabs sind keine Drag-Handles»).*

**A4 · Vis-B: separate min-Werte gegen Palette-Stauchung.** Im Konzept-B-Streifen
(«Raster-Kachel») staucht sich die Node-Palette bei drei gleichzeitig offenen
Linkspanels sehr eng zusammen — laut Bericht «korrekt aber eng» (share-Semantik des
Solvers arbeitet wie vorgesehen, nur ohne eigenen Mindestwert für diesen Fall). Ein
kleiner, gezielter Fix (eigener `min`-Wert statt anteiligem Slack in diesem Fall).
Aufwand: **S**.
→ *Beleg: ROADMAP 358.*

**A5 · Zwei-Felder-Kompromiss (Plan-Chrome-Band) durch Per-Spalten-Felder im Solver
ablösen.** Seit P4 reserviert DockFlaeche das Kosmo-Symbol-Band rechts über zwei feste
34px-Felder statt einer sauberen Pro-Spalten-Berechnung — im Bericht selbst schon als
Kompromiss benannt, mit Verweis auf eine spätere Ablösung. Aufwand: **S/M**.
→ *Beleg: ROADMAP 356; `apps/kosmo-orbit/src/shell/dock/DockFlaeche.tsx:608`.*

---

## Gruppe B — Härtung/Ehrlichkeit

Diese Punkte fügen keine Funktion hinzu, schliessen aber Lücken zwischen dem, was
getestet ist, und dem, was tatsächlich behauptet wird — im Sinn der Ehrlichkeitsregel
des Repos.

**B1 · Echtes iPad-Touch-Testen.** Touch-Drag/Pointer-Events sind bisher nur synthetisch
in Playwright geprüft (`dispatchEvent`-Pointer, kein echtes Touch-Gerät). Für die
Dock-Interaktion (Splitter, Header-Drag, künftig Tab-Drag aus A3) ist das ein ehrlicher
blinder Fleck, gerade weil Serie J (V2-Auftakt, Punkt 13) echte iPad-Gestensteuerung als
grossen kommenden UX-Block ankündigt. Kein Code-Aufwand im engeren Sinn, sondern ein
Testprotokoll + ein echtes Gerät. Aufwand: **S** (Protokoll/Durchführung), aber
Geräte-/Zeit-abhängig — kein Container-Ersatz möglich.
→ *Beleg: ROADMAP 356 («Touch nur synthetisch (echtes iPad steht aus)»).*

**B2 · Die zwei vorbestehenden Alt-Kollisionen.** Geschossleiste↔EntwurfsDock bei vielen
Geschossen, und Kennzahlen↔Statusleiste-Vorgänger bei vielen Befunden — beide waren
schon VOR der Dock-Umstellung bekannt und wurden in `dock-layout.spec.ts` bewusst
begründet ausgenommen statt stillschweigend mitgeprüft. Sie sind keine Dock-Regression,
aber weiterhin offen. Aufwand: **S/M** je Fall (beide sind Spezialfälle mit vielen
Elementen, nicht die grosse Solver-Frage aus A1).
→ *Beleg: ROADMAP 355.*

**B3 · Bauablauf-artige case-sensitive Spec-Altlasten (einmalig durchkämmen).**
Zweimal ist jetzt dieselbe Fehlerklasse aufgetaucht und gefixt: eine Assertion prüfte
Text case-sensitiv gegen eine bewusste Versal-Regel im Blatt-Rendering
(`versal()`, `packages/kosmo-kernel/src/derive/stilblatt.ts`) — einmal in
`e2e/module.spec.ts` (ROADMAP 344, «SITUATION» vs. «Situation»), einmal in
`e2e/bauablauf.spec.ts` (ROADMAP 356, «Bauablaufplan» vs. was das Blatt seit v0.7.3
tatsächlich versal setzt). Beide waren echte, stillschweigend rot laufende Tests, keine
Flakes. Zwei Funde derselben Klasse sind ein Muster, kein Zufall — ein einmaliges
Durchkämmen der übrigen E2E-Specs auf denselben Fehlertyp (Text-Assertion gegen ein
Blatt-Feld, das `versal()` durchläuft) ist billig und schliesst eine ganze
Fehlerklasse statt nur Einzelfälle. Aufwand: **S** (Grep + gezielte Prüfung, kein
Rewrite).
→ *Belege: ROADMAP 344, 356; `e2e/module.spec.ts:489–496`; `e2e/bauablauf.spec.ts`.*

**B4 · Transienter Preview-Hänger + der try/catch-Verdachtspunkt.** Die 344er-Diagnose
wurde in PD1 korrigiert (kein WebGL-Kontext-Problem) — die verbleibenden 2 von 71
Fails unter 9-Minuten-Dauerlast waren `ERR_HTTP_RESPONSE_CODE_FAILURE`-Preview-Hänger,
isoliert 2/2 grün nachgefahren. Bewusst NICHT behoben wurde ein spekulatives
try/catch um `new THREE.WebGLRenderer` — es gibt keinen beobachteten Wurf, ein
Fangen auf Verdacht wäre Code ohne Beleg. Beides bleibt als **beobachten, nicht
fixen** im Backlog: sollte der Preview-Hänger unter echter Dauerlast (CI, nicht nur
Container) wiederkehren, lohnt ein Retry-Wrapper um den Preview-Server-Start; der
try/catch bleibt nur relevant, falls eine echte GL-lose Umgebung auftaucht. Aufwand:
**S** falls überhaupt nötig — aktuell eher ein Beobachtungspunkt als eine Aufgabe.
→ *Beleg: ROADMAP 352.*

---

## Gruppe C — Kosmo-Ausbau

Kleinere Ausbauten der Dock-/Kosmo-Kopplung, die kein Solver-Redesign brauchen.

**C1 · Hinweis-Chip meldet nur eine ID je Runde.** `DockAutoHinweisChip` zeigt nach
jeder Layout-Aktion einen Chip — das ist bewusst Prototyp-Semantik (eine ID je Runde),
kein Mehrfach-Diff. Bei Aktionen, die mehrere Panels gleichzeitig betreffen (z. B.
Fenster-Resize, der mehrere Panels gleichzeitig einklappt), zeigt der Chip nur die
erste/wichtigste Änderung, nicht alle. Ein Ausbau auf Mehrfachmeldung (Liste statt
Einzel-ID) wäre eine kleine, in sich geschlossene Erweiterung von `eingeklappteDiff()`.
Aufwand: **S**.
→ *Beleg: ROADMAP 357.*

**C2 · `ui.dock`-Command-Erweiterungen.** Mit `dock-befehle.ts` (Welle 3/P7, «Kosmo
ordnet», aktuell in einem Parallel-Stream in Arbeit — hier nur als Ausblick vermerkt,
nicht Teil dieses Vorschlags) entsteht ein `ui.dock*`-Namensraum für Kosmo-Commands.
Sobald P7 abgeschlossen ist, lohnt eine kurze Bestandsaufnahme, welche Dock-Aktionen
(Panel öffnen/schliessen/pinnen, Layout zurücksetzen, A/B-Modus wechseln) noch nicht als
Kosmo-Tool erreichbar sind — das wäre ein natürlicher, kleiner Nachtrag statt eines
neuen Features. Aufwand: **S**, aber erst sinnvoll bewertbar NACH P7-Abschluss.
→ *Kontext: `apps/kosmo-orbit/src/state/dock-befehle.ts` (in Arbeit, nicht Gegenstand
dieses Dokuments).*

**C3 · Governance: Auto-Ablauf-Ereignis für command-Typen.** PD2 hat den Auto-Widerruf
für `vis`-Freigaben sauber gelöst (echter Terminalstatus-Übergang). Für `command`-Typ-
Freigaben gibt es **kein reales Terminal-Ereignis** — darum bewusst der explizite Knopf
«Auftrag beendet» statt eines vorgetäuschten Auto-Pfads. Das bleibt so, **solange kein
echtes Signal existiert**. Sollte ein künftiger Command-Typ (z. B. eine mehrstufige
Kosmo-Aktion mit echtem Abschluss-Event) ein solches Signal einführen, wäre der
Auto-Pfad nachrüstbar — das ist kein heutiger Arbeitsauftrag, sondern ein Vermerk für
den Tag, an dem ein solches Signal entsteht. Aufwand: **entfällt**, solange die
Voraussetzung fehlt — nicht einplanen, nur im Blick behalten.
→ *Beleg: ROADMAP 350.*

**C4 · B-Modus Live-Vorschau im Einstellungs-Wähler.** Der 2-Segment-Wähler
(«Orbit-Zonen (A) · Raster-Kachel (B)», `einstellungen-dock-modus`) schaltet sofort um
und persistiert A/B getrennt — es gibt aber keine Vorschau (Miniatur/Skizze), bevor man
umschaltet; Nutzer:innen sehen den Effekt erst nach dem Klick. Eine kleine
Live-Vorschau (z. B. zwei Schema-Bildchen im Wähler) wäre ein reines
Komfort-/Verständnis-Plus. Aufwand: **S/M** (kleine, in sich geschlossene UI-Ergänzung,
kein Solver-Bezug).
→ *Beleg: ROADMAP 358 (Wähler-Beschreibung, keine Vorschau erwähnt).*

---

## Gruppe D — Ausserhalb Dock (nur informativ, HomeStation-abhängig)

Diese Punkte tauchen wiederkehrend in `neuigkeiten.ts` und
`docs/HOMESTATION-AUFTRAG.md` auf. Sie werden hier **nur gelistet, nicht geplant** —
jeder hängt an Owner-Hardware (die HomeStation, RTX 5090) oder einem echten
Anthropic-Konto/-Schlüssel, nicht an etwas, das im Container gebaut werden kann:

- **Onboarding-Wizard: Hardware-Kopplung + Modell-Download.** Seit 0.7.6 ehrlich benannt:
  «die Hardware-Kopplung und der Modell-Download benennen offen, was erst mit einer
  angeschlossenen Zentrale kommt, statt einen Fortschritt vorzutäuschen»
  (`apps/kosmo-orbit/src/shell/neuigkeiten.ts`, 0.7.6-Eintrag). Bleibt so, bis eine
  HomeStation real angeschlossen wird.
- **HDD-Voll-Index** (KosmoData-Archiv) — Bridge-Endpunkt `/archiv` fehlt noch; heute
  nur ein Client-Manifest. Braucht die HomeStation-Bridge, nicht Container-Arbeit.
- **Verschlüsseltes, versioniertes Büro-Backup** — bewusst ausserhalb des Repo-Scopes
  (Owner-Betriebsinfrastruktur, kein App-Feature).
- **Erster echter Live-Lauf des Dev-Worker-Kreises** — Claude Code an der HomeStation
  claimt/setzt um/committet real; Client-/Bridge-/Vertragsseite ist gebaut und gegen
  `--fake-worker` verifiziert, der reale Lauf selbst steht aus (V2-Auftakt Punkt 3).
- **OAuth-Abo-Härtetest gegen einen echten Anthropic-Schlüssel** und der
  **Tauri-Desktop-Rundgang** — beide seit v0.7.5 als Owner-/OS-gebunden benannt
  (V075-VORSCHLAG.md A7/A8), weiterhin unverändert offen.

Diese Liste dient nur der Vollständigkeit der Restpunkte-Sammlung — keiner dieser
Punkte gehört in eine v0.7.9-Container-Planung.

---

> **OWNER-ENTSCHEID (14.07.2026): «Kern so übernehmen.»** Der unten empfohlene
> Kern (A1 + A3 + B3, B1 als Owner-Aktion mit vorbereitetem Geräte-Drehbuch,
> B2 als Stretch) ist damit der verbindliche v0.7.9-Arbeitsauftrag. Start nach
> dem v0.7.8-Release-Finale; dateidisjunkte Vorarbeit (B3-Scan, B1-Drehbuch)
> läuft bereits parallel.

## Empfohlener Kern (mein Vorschlag — Owner/Fable entscheiden die tatsächliche Priorität)

Wenn ich v0.7.9 aus dieser Liste zusammenstellen müsste, wäre das mein Vorschlag —
**keine Festlegung**, nur eine begründete Auswahl:

1. **A1 (Säulen ins Dock oder Solver-Ausschlusszonen)** — der grösste Hebel, weil es die
   letzte verbliebene Überlappungs-*Klasse* schliesst statt nur einen Einzelfall; taucht
   in zwei aufeinanderfolgenden Berichten (357, 358) auf, ist also kein Rand-Thema mehr.
2. **A3 (Tabs als Drag-Handles + Snap-Zonen)** — vervollständigt das ursprüngliche
   «Intelligente Werkzeugtabs»-Versprechen; kleiner Aufwand, hoher Konsistenz-Gewinn.
3. **B3 (case-sensitive Spec-Altlasten durchkämmen)** — billig, und die zwei bisherigen
   Funde derselben Klasse (344, 356) sprechen dafür, dass noch mehr lauern; verhindert
   künftige falsche Rot-Diagnosen.
4. **B1 (echtes iPad-Touch-Testen)** — schliesst eine Ehrlichkeitslücke gerade jetzt, wo
   Serie J (V2-Auftakt) echte Touch-Gesten zum grossen nächsten UX-Block macht; besser
   vor Serie J verifizieren, was die Dock-Basis auf echtem Touch schon kann/nicht kann.
   **Fable-Anmerkung (14.07.):** B1 ist eine OWNER-AKTION (echtes Gerät nötig) — im
   Container nicht ausführbar. In den v0.7.9-Arbeitskern gehört nur die Vorbereitung
   (Checkliste/Drehbuch fürs Gerät); der Test selbst läuft beim Owner.
5. **B2 (die zwei Alt-Kollisionen)** als Stretch, falls Puffer bleibt — kein neues Muster,
   aber zwei konkrete, seit Längerem bekannte Lücken, die sich mit demselben
   Dock-Kontextwissen aus A1 vermutlich güns­tig miterledigen lassen.

C1/C2/C4 (Chip-Mehrfachmeldung, ui.dock-Erweiterungen, Live-Vorschau) und Gruppe D
würde ich bewusst NICHT in den Kern nehmen: C2 ist erst nach Abschluss des laufenden
P7-Streams sinnvoll bewertbar, C1/C4 sind reine Komfort-Politur ohne strukturellen
Hebel, und Gruppe D ist ohnehin Owner-Hardware-gebunden. C3 (Governance-Auto-Ablauf für
command-Typen) gehört gar nicht in eine Planung, solange die technische Voraussetzung
(ein echtes Terminal-Ereignis) nicht existiert — das wäre sonst genau das
Auf-Verdacht-Bauen, das die Ehrlichkeitsregel ausschliesst.

Die finale Priorisierung und Reihenfolge liegt beim Owner bzw. bei Fable als
Orchestrator — dieses Dokument liefert die belegte Auswahl, keine Entscheidung.

---

## Anhang: B3-Fundliste (Vorarbeits-Scan, 14.07.2026 — Fixes folgen in der v0.7.9-Welle)

Klasse: case-sensitive Assertions gegen `versal()`-gesetzte Blatt-Texte
(`derive/stilblatt.ts:227`, seit v0.7.3 D4/`447e598`) — dieselbe wie die zwei
gefixten Fälle (ROADMAP 344, 356). Fix je 1 Zeile (`.toLowerCase()`-Muster).

| Prio | Fundort | Assertion | Notiz |
|---|---|---|---|
| 1 | `e2e/sim-vollprojekt-phase3.spec.ts:148` | `toContain('Bauablaufplan')` | übersehener Zwilling des 356er-Fixes |
| 2 | `e2e/studienbericht.spec.ts:82-83` | `'Grundlagenstudie'` + `'Teppich'` | zwei Brüche in einer Testfunktion (seit v0.6.2) |
| 3 | `e2e/sim-vollprojekt-phase1.spec.ts:120` | `toContain('Grundlagenstudie')` | Zwilling von 2 |
| 4 | `e2e/baugesuch.spec.ts:92` | `toContainText('Ausnützungsnachweis')` | in ROADMAP 347 dokumentiert, nie gefixt |
| 5 | `e2e/sim-vollprojekt-phase4.spec.ts:120` | wie 4 | bisher nirgends dokumentierter Zwilling |

Fragil (zufällig grün, nur Beobachtung): `maengel.spec.ts:79` + `sim-vollprojekt-phase6.spec.ts:79`
(`'Abnahmeprotokoll'` matcht den nicht-versal'ten Disclaimer, nicht den Titel).
Geprüft & unauffällig: `getByText('Axonometrie')` (case-insensitives Substring-Matching),
Toast-/Chat-Freitexte (laufen nie durch `versal()`).
