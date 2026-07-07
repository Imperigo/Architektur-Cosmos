# SIM-BEFUNDE — Befund-Journal der Serie H (angelegt 07.07.2026)

## Zweck

Dieses Journal begleitet die Serie-H-Vollsimulation
(`docs/SERIE-H-VOLLSIMULATION.md`, Buildplan `docs/SERIE-H-BUILDPLAN.md`
Abschnitt 5) und ist der direkte Nachfolger von `docs/V1-TESTLAUF-BEFUNDE.md`.
Jeder Fund einer Sim-Journey — echter Bug, zu strikte Test-Assertion,
bekannte V2-Lücke oder geprüfter Nicht-Bug — bekommt hier genau einen Eintrag.

## Append-only-Regel

Dieses Journal ist **append-only**: bestehende Einträge werden nie
umgeschrieben oder gelöscht. Ändert sich der Stand eines Befunds (z. B. Fix
gelandet, Spec korrigiert), wird **nur das `Status`-Feld** des betreffenden
Eintrags nachgeführt; neue Erkenntnisse bekommen einen neuen Eintrag mit
fortlaufender Nummer `H-<lfd>`. Das hält das Journal merge-konfliktarm über
parallele Serie-H-Batches hinweg.

## Eintrags-Schema (wörtlich aus Buildplan Abschnitt 5)

```
### H-<lfd> — <Titel> (<Datum>, Journey <key>, Schritt <n>)
Beobachtung: <was die Journey sah — Text/Zahl/Screenshotpfad in e2e-results/>
Triage:      echter-bug | zu-strikte-assertion | v2-lücke | kein-bug
Beleg:       <Spec-Zeile, Doc-Zustand, Command-Kette zum Reproduzieren>
Entscheid:   <Opus-Triage; bei mehrdeutig/hart: Fable-Urteil, so markiert>
Status:      offen | fix-batch H-Fix-<n> (ROADMAP <m>) | doku (V2) | spec-korrigiert
```

## Triage-Ablauf (wörtlich aus Buildplan Abschnitt 5, Muster = die vier gefixten V1-Befunde / ROADMAP 151–154)

1. **Journey schlägt fehl oder zeigt Seltsames** → Opus triagiert sofort
   gegen den Code (nicht raten): reproduziert er es über `__kosmo.run`
   minimal, ist es ein Produktbefund; liegt es an der Assertion (fixe
   Pfadzahl, Timing), wird die **Spec korrigiert und die Lektion in 1.4
   ergänzt**, mit SIM-BEFUNDE-Eintrag `spec-korrigiert`.
2. **Echter Bug** → eigener **H-Fix-Batch** (eigener Commit, eigene Tests,
   eigener ROADMAP-Eintrag, ggf. Kernel-Test — H-Fix-Batches DÜRFEN
   Produktcode anfassen, Serie-H-Batches nicht). Danach bekommt die Journey
   einen **Regressions-Anker** auf den Fix (wie die drei Hochhaus-Anker).
   `derive/`-nahe Fixes: Golden-Risiko explizit im Batch benennen; Goldens
   nur mit Fable-Freigabe ändern.
3. **V2-Lücke / Design-Frage** → `doku (V2)`-Eintrag mit ehrlicher
   Beschreibung (Muster: Site-Zonentyp, Dach-2D-Symbol); grössere Fragen an
   den Owner. **Fable beurteilt** alle als `mehrdeutig` markierten Fälle und
   jeden H-Fix, der Kernel-Geometrie oder Checks-Semantik ändert.
4. Bereits bekannte offene Punkte werden beim Anlegen der Datei aus
   `V1-TESTLAUF-BEFUNDE.md` als Startbestand übernommen (V2-Lücken +
   Coverage-Lücken), damit es EIN lebendes Journal gibt.

---

## Startbestand (übernommen aus `docs/V1-TESTLAUF-BEFUNDE.md`, Stand 06.07.2026)

Die folgenden sieben Einträge sind die beim Anlegen dieses Journals (Buildplan
Abschnitt 5, Punkt 4) übernommenen, bereits bekannten offenen Punkte —
1:1 aus `V1-TESTLAUF-BEFUNDE.md` in das Eintrags-Schema übertragen, ohne
neue Tatsachen. Sie sind noch keiner konkreten Serie-H-Journey-Ausführung
(Schritt-Nummer in einer laufenden `sim-<typ>.spec.ts`) zugeordnet, da die
betroffenen Journeys (EFH, Hochhaus, Blockrand, MFH) zum Zeitpunkt der
Übernahme teils noch entworfen, teils noch nicht gehärtet sind — `Schritt`
ist deshalb ehrlich mit `n/a` markiert, bis die jeweilige H2-Journey den
Punkt konkret berührt.

### H-1 — Kein eigener Site-/Parzellen-Zonentyp (07.07.2026, Journey efh, Schritt n/a)
Beobachtung: Parzellen werden in Ermangelung eines eigenen Zonentyps als
`sia:'KF'`-Zonen behelfsmässig modelliert und verunreinigen dadurch die
SIA-416-NGF und Δ Max mit ihrer Fläche.
Triage:      v2-lücke
Beleg:       `docs/V1-TESTLAUF-BEFUNDE.md` Abschnitt „Modellierungs-/Feature-
Lücken → V2" — „Kein eigener Parzellen-/Site-Zonentyp (EFH)"; Buildplan
Abschnitt 1.2 zieht daraus bereits die Konsequenz für Serie H: die Parzelle
wird in `szenarien.ts` NIE als `sia:'KF'`-Zone geführt, sondern immer über
`design.baugrenzeSetzen` (Boundary) — die EFH-Journey (H2a) umgeht den Fehlgriff
damit aktiv, statt ihn zu wiederholen, und assertet ihn sogar als Regel
(SIA-416-NGF enthält KEINE Parzellenfläche).
Entscheid:   Braucht einen eigenen Site/Boundary-Zonentyp ohne SIA-416-
Klassierung im Kernel → V2-Feature, kein H-Fix-Batch (kein akuter Bug, die
Journeys modellieren bereits korrekt via Boundary).
Status:      doku (V2)

### H-2 — Kein 2D-Plansymbol fürs Dach (07.07.2026, Journey efh, Schritt n/a)
Beobachtung: `derive/plan.ts` kennt keinen `roof`-Fall; das Dach ist nur in
der 3D-Szene und im Schnitt sichtbar, im 2D-Grundriss fehlt jedes Plansymbol.
Triage:      v2-lücke
Beleg:       `docs/V1-TESTLAUF-BEFUNDE.md` Abschnitt „Modellierungs-/Feature-
Lücken → V2" — „Kein 2D-Plansymbol fürs Dach (EFH)"; Buildplan Baustein 5
(`dachSetzen`, Abschnitt 1.3) hält fest, dass die Journey **bewusst KEINE**
2D-Plansymbol-Assertion fährt (Dach-Mesh in der 3D-Szene via
`__kosmoViewport.renderOnce()` genügt) — nicht „rot getestet", sondern
dokumentiert offen gelassen.
Entscheid:   Produkt-Feature (neuer `roof`-Fall in `derive/plan.ts`) → V2,
kein H-Fix-Batch ohne Owner-Priorisierung.
Status:      doku (V2)

### H-3 — Wohnungs-Typologie grob, keine Zimmer-Granularität (07.07.2026, Journey mfh, Schritt n/a)
Beobachtung: Die Wohnungstypologie kennt nur grobe Kategorien
(marktgerecht/preisgünstig/alterswohnen/…), keine 2.5-/3.5-/4.5-Zimmer-
Granularität.
Triage:      v2-lücke
Beleg:       `docs/V1-TESTLAUF-BEFUNDE.md` Abschnitt „Modellierungs-/Feature-
Lücken → V2" — „Wohnungs-Typologie grob (MFH/EFH)".
Entscheid:   Produkt-Feature, explizit mit Serie F verzahnt (Raumprogramm/
Wohnungstypologie) → V2, kein H-Fix-Batch.
Status:      doku (V2)

### H-4 — `grenzabstandGross` ungeprüft, Kanten-Klassierung fehlt (07.07.2026, Journey blockrand, Schritt n/a)
Beobachtung: `pruefeGrundriss()` prüft seit ROADMAP 153 ersatzweise
`grenzabstandKlein` der aktiven Zonenregel, wenn eine `Boundary` keinen
eigenen `grenzabstand` trägt. Der seitenabhängige `grenzabstandGross` (für
die „grosse" Fassadenseite) wird dagegen **nicht** geprüft, weil das
`Boundary`-Entity keine Kanten-Klassierung „klein"/„gross" kennt; fehlt jede
`Boundary`-Geometrie auf dem Geschoss, bleibt auch der Zonenregel-
Grenzabstand komplett ungeprüft (keine Parzellenlinie zum Messen).
Triage:      v2-lücke
Beleg:       `docs/V1-TESTLAUF-BEFUNDE.md` Abschnitt „Grenzabstand —
teilerledigt (ROADMAP 153)"; Buildplan Abschnitt 1.2 (Szenario-Schema)
führt `zonenRegel.grenzabstandGross` bereits als Feld; Buildplan Abschnitt 2
(Journey Blockrand) verankert nur den `grenzabstandKlein`-Pfad als
Regressions-Anker (ROADMAP 153), `grenzabstandGross` bleibt bewusst
aussen vor.
Entscheid:   Braucht eine Kanten-Klassierung im `Boundary`-Entity (welche
Kante „klein"/welche „gross" ist), bevor `grenzabstandGross` geprüft werden
kann → V2-Feature, kein H-Fix-Batch ohne diese Vorarbeit.
Status:      doku (V2)

### H-5 — RasterPanel: Querachsen-Feld ohne Testid (07.07.2026, Journey hochhaus, Schritt n/a)
Beobachtung: Das `RasterPanel` trägt nur für die Hauptachsen ein
`data-testid`; das Querachsen-Feld ist über keinen `data-testid` adressierbar.
Triage:      v2-lücke
Beleg:       `docs/V1-TESTLAUF-BEFUNDE.md` Abschnitt „Coverage-Lücken
(Testids)" — „RasterPanel: Querachsen-Feld ohne `data-testid` (nur
Hauptachsen)"; Buildplan Baustein 7 (`tragwerkAusRaster`, Abschnitt 1.3)
hält fest, dass der Schritt deshalb **Command-getrieben** bleibt
(`design.rasterSetzen`/`design.stuetzenAusRaster`) statt über UI-Eingabe.
Entscheid:   Reines Testid-Coverage-Thema, kein Produktbefund. Ein reines
Attribut-`data-testid` wäre nach Buildplan-Regel 1.4.2 die kleinste erlaubte
Produkt-Berührung innerhalb eines Serie-H-Batches — noch nicht entschieden,
ob das in H2b (Hochhaus-Journey) mitgenommen wird oder offen bleibt, bis der
Command-Weg an seine Grenzen stösst.
Status:      offen

### H-6 — Checks nur Freitext, kein `regel`/`schwere`-Attribut (07.07.2026, Journey mfh, Schritt n/a)
Beobachtung: Das Checks-Panel liefert Fluchtweg-/Zonenregel-Befunde nur als
Freitext; es gibt kein strukturiertes `regel`- oder `schwere`-Attribut je
Eintrag.
Triage:      v2-lücke
Beleg:       `docs/V1-TESTLAUF-BEFUNDE.md` Abschnitt „Coverage-Lücken
(Testids)" — „Checks-Panel: Fluchtweg-/Zonenregel-Befunde nur als Freitext,
kein strukturiertes `regel`/`schwere`-Attribut je Eintrag"; Buildplan
Baustein 11 (`checksLesen`, Abschnitt 1.3) parst deshalb Freitext per Regex
(`/Fluchtweg[^\n]*?([\d]+[.,]\d)\s*m/g`) statt strukturierte Felder zu lesen;
Buildplan Abschnitt 9 („Ehrliche Restgrenzen") nennt das explizit als
„V2-Kandidat, in SIM-BEFUNDE geführt".
Entscheid:   Strukturierte Checks-Attribute wären ein eigener Produkt-Batch
(Checks-Semantik-Änderung) — nicht innerhalb eines Serie-H-Batches lösbar,
da Serie H keinen Produktcode anfasst; ein H-Fix-Batch dafür bräuchte wegen
Checks-Semantik-Änderung ausdrücklich Fables Urteil (Buildplan Abschnitt 5,
Punkt 3).
Status:      offen

### H-7 — Kein UI-Knopf für `design.deckeZeichnen` (07.07.2026, Journey mfh, Schritt n/a)
Beobachtung: `design.deckeZeichnen` ist nur programmatisch (über
`__kosmo.run`/Command) auslösbar, es gibt keinen UI-Knopf dafür.
Triage:      v2-lücke
Beleg:       `docs/V1-TESTLAUF-BEFUNDE.md` Abschnitt „Coverage-Lücken
(Testids)" — „Kein UI-Knopf für `design.deckeZeichnen` (nur programmatisch)".
Entscheid:   Bedien-/UI-Lücke, kein Rechen- oder Modellfehler; Priorisierung
gegen andere UI-Ergänzungen liegt beim Owner.
Status:      offen

---

## Weitere Einträge

Weitere Befunde werden ab hier von den H2-/H3-Batches angehängt — je einer
pro Fund, nummeriert fortlaufend ab `H-8`, im Schema oben.

### H-8 — Kernel kennt nur Walmdach, kein eigenes Satteldach-Command (07.07.2026, Journey efh, Schritt 10)
Beobachtung: Die EFH-Leitidee (`SZENARIEN.efh.gestaltung.leitidee`) spricht
von einem Baukörper mit «Sichtbeton-Sockel im Hang, verputzte Holzelement-
Obergeschosse»; Buildplan Abschnitt 2 (Zeile EFH) nennt das Dach im Kern-
Toolkette-Text «Satteldach». `design.dachErstellen`
(`packages/kosmo-kernel/src/commands/design.ts` Z.365-393) modelliert aber
ausschliesslich ein **Walmdach** (Titel «Walmdach erstellen», konvexer
Grundriss, `pitch`/`overhang`) — ein Gerbergiebel/Satteldach-Command
existiert nicht.
Triage:      kein-bug
Beleg:       `design.dachErstellen`, Titel/Description Z.366-369; Baustein 5
(`dachSetzen`, Abschnitt 1.3) heisst im Buildplan-Text selbst nur
«Dach»/`design.dachErstellen`, nicht «Satteldach» — der Vokabel-Unterschied
steht nur in der Kern-Toolkette-Spalte der Journey-Tabelle (Abschnitt 2).
`sim-efh.spec.ts` (Schritt 10) modelliert darum bewusst mit der tatsächlich
existierenden Walmdach-Form und referenziert diesen Befund im Spec-
Kommentar, statt den Buildplan-Wortlaut stillschweigend als «Satteldach»
zu behaupten.
Entscheid:   Reine Wortlaut-Divergenz zwischen Buildplan-Prosa und
tatsächlicher Command-Palette, kein Produktfehler und keine falsche
Assertion in der Journey (die Journey behauptet nirgends «Satteldach»,
nur «Dach»). Ein echtes Satteldach-Command wäre ein eigenständiges V2-
Feature (analog zu H-2, Dach-2D-Symbol) — kein H-Fix-Batch ohne
Owner-Priorisierung.
Status:      doku (V2)

### H-9 — Manuelles «Schnitt»-Werkzeug ist reiner UI-State ohne Command-Rückbindung (07.07.2026, Journey efh, Schritt 12)
Beobachtung: Der Schnittlinien-Zug (`tool === 'schnitt'`,
`DesignWorkspace.tsx` Z.487-491, `setSectionSpec(...)`) lebt ausschliesslich
in lokalem React-State der Design-Station — es gibt keinen `design.*`-
Command, der `sectionSpec` setzt, und keinen bestehenden e2e-Beleg (kein
Treffer für `tool-schnitt`/`sectionSpec` in irgendeinem `e2e/*.spec.ts` vor
diesem Batch). Ein Playwright-Klick müsste zwei Bildschirmkoordinaten auf
dem SVG treffen und würde vom aktuellen Zoom/Pan der PlanView abhängen —
ohne bestehenden Helfer dafür wäre das ein neu erfundener, ungeprüfter
Interaktionspfad (Regel 1.4.2 verbietet das). «Ansicht Süd»
(`elevationSpec`, DesignWorkspace.tsx Z.290-308) rechnet dagegen automatisch
aus der Wand-/Volumen-Bounding-Box, ganz ohne manuellen Schritt, und trägt
in der Quad-Ansicht dieselben Terrain-/Cut-Kanäle (`derive/section.ts`
`deriveSection`).
Triage:      v2-lücke
Beleg:       `apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx`
Z.166 (`sectionSpec` State), Z.487-491 (`tool === 'schnitt'` setzt ihn nur
über zwei Canvas-Klicks); `sim-efh.spec.ts` Schritt 12 fährt darum
ausschliesslich `section-Ansicht Süd` (automatisch) und lässt den manuellen
«Schnitt»-Linienzug unangetastet — ehrlich als Coverage-Lücke dokumentiert
statt stillschweigend übersprungen.
Entscheid:   Ein Command-Weg für den Schnittlinien-Zug (z. B.
`design.schnittSetzen`) wäre ein kleines, aber echtes Produkt-Feature
(reine UI-Bequemlichkeit + Testbarkeit) — kein H-Fix-Batch ohne
Owner-Priorisierung, da keine falsche Berechnung vorliegt, nur ein fehlender
programmatischer Zugriff.
Status:      doku (V2)

### H-10 — RasterPanel-Querachsen-Lücke (H-5) bestätigt in der Hochhaus-Journey (07.07.2026, Journey hochhaus, Schritt 2)
Beobachtung: `e2e/sim/bausteine.ts` Baustein 7 (`tragwerkAusRaster`, H2b)
setzt das 5×28-Achsenraster ausschliesslich über `__kosmo.run('design.rasterSetzen', …)`
und `__kosmo.run('design.stuetzenAusRaster', …)`; ein UI-Weg über das
RasterPanel für die Querachsenzahl (28, bewusst > 26 für den
Basis-26-Regressionstest) existiert weiterhin nicht — bestätigt H-5.
Triage:      kein-bug
Beleg:       `apps/kosmo-orbit/src/modules/design/RasterPanel.tsx` (kein
`data-testid` auf dem Querachsen-Feld, nur auf den Hauptachsen); Baustein 7
in `e2e/sim/bausteine.ts` (Kommentar «RasterPanel-Querachsen haben kein
eigenes Testid im UI»); die Achslabel-Bijektivität wird stattdessen über die
gerenderten `grid-achse`-Texte im Plan verifiziert (`achsen-toggle`-Knopf,
`PlanView.tsx` Z.180-192/526-559) — der Rechenweg ist damit voll geprüft,
nur der Dateneingabepfad im RasterPanel bleibt UI-seitig ungetestet.
Entscheid:   H2b entscheidet sich für den reinen Command-Weg (keine
Attribut-Testid-Ergänzung im RasterPanel) — die Journey braucht keinen
UI-Eingabepfad, um den Kernel-Algorithmus (Basis-26-Achslabels,
Kreuzungs-Stützen) scharf zu testen. Bleibt offen als Coverage-Lücke für
einen künftigen UI-Härtungs-Batch (kein Owner-Auftrag in Serie H).
Status:      offen

### H-11 — Grosse Skelett-Wiederholung beim Stapeln: Laufzeitrisiko unklar (07.07.2026, Journey hochhaus, Schritt 6)
Beobachtung: `design.geschossKopieren` (Kernel) kopiert bei jedem Aufruf ALLE
Stützen/Unterzüge/Zonen/Treppe des Quellgeschosses vollständig auf das neue
Geschoss. Bei `SZENARIEN.hochhaus` (140 Stützen + 5 Unterzüge je Geschoss)
plus 12 direkten `design.geschossKopieren`-Aufrufen in EINER
`__kosmo.run`-Schleife und einem 13. Stapel-Klick über die UI wächst das Doc
auf rund 1'960 Stützen + 70 Unterzüge über 15 Geschosse. Ob das den
`test.setTimeout(180_000)`-Rahmen der Journey sprengt (insbesondere beim
IFC/PDF-Export, der potenziell alle Geschosse serialisiert), wurde in H2b
NICHT empirisch geprüft — Playwright wird laut Auftrag erst nach dem Merge
vom Opus-Orchestrator gefahren.
Triage:      zu-strikte-assertion (Verdacht, unbestätigt — kein Befund, nur
ein Laufzeitrisiko für die Erstausführung)
Beleg:       `packages/kosmo-kernel/src/commands/design.ts`
'design.geschossKopieren' Z.1055-1107 (kopiert `column`/`beam` je Aufruf
vollständig); `e2e/sim-hochhaus.spec.ts` Abschnitt 6 (12er-Schleife + 1
UI-Klick); `packages/kosmo-kernel/test/kernel.test.ts` „Budget (R2): 500
Wände > deriveAll…" (1196 ms) zeigt, dass grosse Modelle im Kernel selbst
günstig bleiben — ungeprüft bleibt nur der End-to-End-Pfad (Plan-Rendering
pro Geschoss, PDF-Export über den ganzen Plansatz).
Entscheid:   Kein Fix-Batch ohne empirischen Befund. Der Opus-Orchestrator
sollte beim ersten seriellen Lauf explizit auf die Laufzeit dieser Journey
achten; überschreitet sie das Timeout, ist die erste Triage-Frage, ob
`test.setTimeout` erhöht oder die Geschossanzahl/Stützendichte in
`SZENARIEN.hochhaus.geometrie` reduziert werden muss (Fable-Entscheid, da
`szenarien.ts` nicht mehr angefasst werden darf ohne Koordination).
Status:      spec-korrigiert — beim ersten seriellen Merge-Lauf (Opus)
gemessen: die Hochhaus-Journey läuft in **8.2 s** (weit unter dem
180-s-Timeout), inkl. 12+1 Stapeln, Plan-Rendering und Publikations-Set-
Export. Das Laufzeitrisiko hat sich NICHT materialisiert; keine Reduktion
von `SZENARIEN.hochhaus.geometrie` nötig. Beleg: E2E-Lauf 07.07.2026.

### H-12 — Baustein 18 `terrainSetzen`: `toBeVisible` scheitert an degeneriertem Terrain-Profil (07.07.2026, Journey efh, Schritt 5)
Beobachtung: Die EFH-Journey setzte das gewachsene Hang-Terrain
(`SZENARIEN.efh.geometrie.terrain.gewachsen`, 15 % Süd — variiert NUR entlang
der Tiefe/y-Achse). In der «Ansicht Süd» projiziert dieses Profil auf eine
deckungsgleiche, **0 px breite** Polylinie (`points="-4000,-1500 -4000,1500"`).
Baustein 18 prüfte `await expect(gewachsen).toBeVisible()` — Playwright meldet
ein Element mit Bounding-Breite 0 als «hidden», der Test schlug fehl.
Triage:      zu-strikte-assertion (Baustein verletzt die eigene Regel R4)
Beleg:       `e2e/sim/bausteine.ts` Baustein 18 (`terrainSetzen`), Zeile mit
`toBeVisible()` auf `[data-testid="terrain-gewachsen"]`; das Terrain IST korrekt
gerendert (Polylinie vorhanden, `stroke-dasharray="200 120"` korrekt) — nur der
Sichtbarkeits-Check ist für ein achsen-degeneriertes Profil falsch (Regel R4:
«Unsichtbar ≠ falsch» — Attribute prüfen, nicht `toBeVisible`).
Entscheid:   Opus (serieller Orchestrator, kein Parallel-Batch in Flug) korrigiert
Baustein 18: `toBeVisible()` → `toBeAttached()`; die eigentliche Aussage bleibt
die Dash-Signatur (`stroke-dasharray '200 120'`) + `points`-Attribut. Für
nicht-degenerierte Profile (Umbau) bleibt das Element ohnehin attached & visible —
keine Abschwächung der Umbau-Journey. Kein Produktfehler (das Terrain rendert
korrekt); reine Test-Robustheit.
Status:      spec-korrigiert

### H-13 — Fluchtweg-Egress: verschachtelte Zone hat keinen Raumgraph-Portal zum Kern (07.07.2026, Journey hochhaus, Schritt 5/7)
Beobachtung: Die Hochhaus-Journey modellierte zunächst die Regelgeschoss-Zone
über den GANZEN Fussabdruck, mit dem zentralen Treppenhaus-Kern DARIN
verschachtelt (überlappend). Der Raumgraph (`derive/raumgraph.ts`) bildet
Fluchtweg-Portale aber nur aus (a) Tür-Öffnungen in einer Wand zwischen zwei
Zonen oder (b) einer **gemeinsamen, kollinearen Umriss-Kante** ohne Wand
(`offeneKante`). Eine verschachtelte Zone TEILT keine Kante mit dem Kern →
kein Portal → `distanz = Infinity` → der Egress-Check meldete «keine Verbindung
zum Treppenhaus» statt einer Länge. Zusätzlich zeigte sich: ein kompakter,
konformer Punkt-Turm (kurzer Weg zum zentralen Kern, ≤ 0.8×35 m) meldet
BEWUSST GAR KEINE Fluchtweg-Länge (`checks.ts` Z.213 gibt erst über dem
Richtwert-Anteil eine Meldung aus) — die ursprüngliche Assertion «≥ 1 lesbare
Länge» war darum doppelt zu strikt.
Triage:      zu-strikte-assertion / Modell-Topologie-Fehler in der Journey
(kein Produktfehler — der Egress-Check verhält sich korrekt)
Beleg:       `packages/kosmo-kernel/src/derive/raumgraph.ts` `raumGraph`
(Tür-Kanten aus `openingsOf`, offene Übergänge aus `offeneKante` Z.60-77) und
`fluchtwege` (Dijkstra, `distanz=Infinity` ohne Portal); `checks.ts` Z.189-222
(Meldung erst > 0.8×MAX_FLUCHT). `e2e/sim-hochhaus.spec.ts` Schritt 5/7.
Entscheid:   Opus korrigiert die Journey (serielle Integration): (1) das
Regelgeschoss wird ins NORDBAND gelegt, das die Nordkante des Kerns TEILT
(adjazent, nicht überlappend) → automatischer «offener» Übergang = Egress-
Portal; (2) die Assertion prüft jetzt (a) der Egress ist verdrahtet (keine
«keine Verbindung»-Warnung) und (b) jede GEMELDETE Länge ist in Metern lesbar
(>0) — statt fix «≥1 Länge» zu fordern. Numerische Egress-Längen beweist die
MFH-Journey (dort liegen die Wohnungen weit genug vom Kern). Lehre für 1.4:
Egress-Journeys müssen Zonen ADJAZENT (kantenteilend) zum Treppenhaus
modellieren, nicht verschachtelt; ein konformer kompakter Grundriss meldet
keine Fluchtweg-Länge — das ist korrektes, nicht fehlendes Verhalten.
Status:      spec-korrigiert
