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

<!-- H-16 (spec-korrigiert): Baustein 2 (parzelleSetzen) — die ROADMAP-153-
Probe berechnete für achsen-schiefe Parzellen-Zentroide (L-förmiger Blockrand)
gebrochene Probekörper-Koordinaten; `design.wandZeichnen` verlangt aber
ganzzahlige mm (zod .int()) → «Invalid input». Die rechteckigen Parzellen
(EFH) trafen zufällig auf ganzzahlige Werte und liefen durch. Opus (serielle
Integration) rundet p1/p2 mit Math.round — kein Produktfehler, das Command
weist Nicht-Ganzzahlen korrekt ab. Voller Schema-Eintrag unten (H-16). -->

### H-16 — Baustein 2 ROADMAP-153-Probe: nicht-ganzzahlige Probekörper-Koordinaten (07.07.2026, Journey blockrand, Schritt 2)
Beobachtung: Die Verstoss-Probe in Baustein 2 (`parzelleSetzen`) berechnet
einen Probekörper aus Kantenmitte + Richtung Zentroid. Für die L-förmige
Blockrand-Parzelle liegt der Zentroid achsen-schief → p1/p2 werden gebrochen
(z. B. x=9925.2) → `design.wandZeichnen` (zod `.int()`) meldet «Ungültige
Parameter … a.x — Invalid input». Die rechteckigen Parzellen (EFH) ergaben
zufällig ganzzahlige Koordinaten und liefen durch — der Bug lag latent, bis
die erste nicht-achsenparallele Parzelle (Blockrand) ihn auslöste.
Triage:      zu-strikte-assertion (Harness-Bug im Baustein, kein Produktfehler)
Beleg:       `e2e/sim/bausteine.ts` Baustein 2, p1/p2-Berechnung;
`design.wandZeichnen`-Schema verlangt `z.number().int()` für a/b —
Nicht-Ganzzahlen korrekt abgewiesen.
Entscheid:   Opus (serielle Integration, kein Parallel-Batch in Flug) rundet
p1/p2 mit `Math.round`. Kein Produktfehler; das Command verhält sich korrekt.
Lehre: Probekörper-/Fixture-Koordinaten immer runden, bevor sie an
int-validierte Commands gehen.
Status:      spec-korrigiert

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

### H-14 — `zone-verletzt` und Baugrenzen-/Grenzabstands-Befunde sind zwei getrennte, nicht austauschbare Mechanismen (07.07.2026, Journey blockrand, Schritt 7/10)
Beobachtung: Buildplan Abschnitt 2 (Zeile Blockrand, «Schärfste Assertions»)
verlangt für die Verstoss-Probe («eine Wand über die Baugrenze zeichnen»)
in einem Satz sowohl «die Checks melden `zone-verletzt` bzw. den
Grenzabstands-Befund» als auch separat «`zone-verletzt`-Markierung
erscheint und verschwindet nach Korrektur». Im Code sind das aber zwei
disjunkte Pfade: `derive/checks.ts` vergibt bei Baugrenzen-/Grenzabstands-
Verstössen die `entityId` ausschliesslich an Wand/Volumen/Dach (Zeilen
353-379, `grenzVerletzt`/`verletzt`), NIE an eine Zone. `PlanView.tsx`
(Zeile 50-67, `verletzteZonen`) baut den `zone-verletzt`-Marker dagegen
ausschliesslich aus Befunden, deren `entityId` auf eine Entität mit
`kind==='zone'` zeigt (aus `design.regelnSetzen`/Raumtyp-Richtwerten,
V2-F3). Eine Wand, die über die Baugrenze hinausragt, kann darum den
`zone-verletzt`-Marker grundsätzlich NIE auslösen — nur den
Checks-Freitext (Baustein 11 `checksLesen`).
Triage:      kein-bug
Beleg:       `packages/kosmo-kernel/src/derive/checks.ts` Z.342-394
(Baugrenze/Grenzabstand vergibt `entityId` nur an `Wall`/`MassBody`/`Roof`);
`apps/kosmo-orbit/src/modules/design/PlanView.tsx` Z.50-67 (`e.kind !==
'zone'` verwirft alle anderen Kinds); `e2e/module.spec.ts` Z.813-829
(`zone-verletzt` wird ausschliesslich über `design.regelnSetzen` +
Raumtyp-Mindestfläche gezeigt, nie über eine Baugrenze). `sim-blockrand.spec.ts`
deckt darum BEIDE im Buildplan genannten Signale mit ihrem jeweils
tatsächlich zuständigen Mechanismus ab: Schritt 7 (Wand ausserhalb der
L-Baugrenze) prüft den Checks-Freitext auf «ragt über die Baugrenze …
hinaus» (erscheint, verschwindet nach `design.loeschen`); Schritt 10
(separate, bewusst zu kleine Zimmer-Zone + `design.regelnSetzen`
preset «ch-wohnbau») prüft den `zone-verletzt`-Marker (erscheint,
verschwindet nach `design.loeschen`).
Entscheid:   Kein Produktfehler — die Trennung ist korrekt und beabsichtigt
(Raumtyp-Regeln sind zonen-bezogen, Baugrenzen-/Grenzabstandsregeln sind
bauteil-bezogen und kennen noch keine Zonen-Zuordnung, vgl. H-4). Der
Buildplan-Wortlaut suggeriert lediglich fälschlich eine gemeinsame
Signalquelle; die Journey dokumentiert die Trennung, statt sie stillschweigend
glattzubügeln. Kein H-Fix-Batch nötig.
Status:      doku (V2)

### H-15 — Checks-Panel zeigt nur die ersten 6 Befunde (`befunde.slice(0, 6)`), ohne Hinweis auf weitere (07.07.2026, Journey blockrand, Schritt 7)
Beobachtung: `KennzahlenPanel.tsx` rendert `befunde.slice(0, 6)` ins
`[data-testid="checks"]`-Panel — bei mehr als 6 gleichzeitigen
Grundriss-Befunden bleiben weitere (potenziell schwerwiegendere, z. B. eine
neue Baugrenzen-Verletzung) unsichtbar, ohne «+N weitere»-Hinweis. Für die
Blockrand-Journey wurde das umgangen, indem das reale Fassaden-Volumen
(Schritt 5) bewusst Grenzabstands-konform gehalten wird (Marge ≥
Zonenregel-Grenzabstand auf allen Seiten), sodass die Verstoss-Probe
(Schritt 7) der EINZIGE Befund im Panel bleibt und sicher innerhalb der
ersten 6 Zeilen erscheint — eine Journey mit vielen gleichzeitigen
Regelverstössen könnte das Verstecken tatsächlich beobachten.
Triage:      v2-lücke
Beleg:       `apps/kosmo-orbit/src/modules/design/KennzahlenPanel.tsx`
Z.124 (`befunde.slice(0, 6).map(...)`), keine Anzeige der Gesamtzahl bzw.
eines Overflow-Hinweises. Verwandt mit H-6 (Checks bleiben Freitext), aber
eine eigene, engere Beobachtung (Truncation, nicht fehlende Struktur).
Entscheid:   UI-Politur (Overflow-Hinweis «+N weitere» oder Scroll statt
harter Deckel bei 6) — kein akuter Bug, kein H-Fix-Batch ohne
Owner-Priorisierung; für Serie-H-Journeys mit vielen Befunden gilt als
Lehre: das Modell so aufbauen, dass der zu prüfende Befund isoliert bleibt
(kompensiert in `sim-blockrand.spec.ts`, s. o.), statt sich auf die
Sichtbarkeit von Befund Nr. 7+ zu verlassen.
Status:      offen

### H-17 — Verstoss-Probe vom Panel-`slice(0,6)` verdrängt (07.07.2026, Journey blockrand, Schritt 7→2b)
Beobachtung: Die Baugrenzen-Verstoss-Probe stand ursprünglich als Schritt 7,
NACH Fassade/Volumen/Treppe. Zu diesem Zeitpunkt trägt das Modell bereits
mehrere andere Befunde (u. a. der Grenzabstand-Fallback der Zonenregel greift
je bauteil-nahem Element); der neue «ragt über die Baugrenze»-Befund landete
jenseits der ersten sechs und war im Panel (`befunde.slice(0,6)`, H-15) nicht
sichtbar → `checksLesen()` sah ihn nicht, die Assertion schlug fehl (obwohl der
Befund korrekt berechnet wurde).
Triage:      zu-strikte-assertion / Reihenfolge-Artefakt (kein Produktfehler —
der Egress-/Baugrenzen-Check verhält sich korrekt; nur das Panel kappt bei 6).
Beleg:       `apps/kosmo-orbit/src/modules/design/KennzahlenPanel.tsx` Z.124
(`befunde.slice(0, 6)`); `derive/checks.ts` Z.363-372 (Baugrenze-Befund wird
korrekt gepusht). Verifiziert: (10000,10000)/(13000,10000) liegen per
Ray-Cast klar ausserhalb der L-Kontur.
Entscheid:   Opus (serielle Integration) verschiebt die Verstoss-Probe an den
LEEREN Modellstand direkt nach `parzelleSetzen` (neuer Schritt 2b) — dort ist
der Baugrenzen-Verstoss der einzige Befund und damit garantiert in den ersten
sechs. Die Anbindung an den Regel-Kern (153-Anker via Baustein 2, Grenzabstand
aus der Zonenregel) bleibt unverändert. Lehre für 1.4: Regel-/Verstoss-Proben,
die auf das Checks-Panel schauen, am möglichst leeren Modellstand fahren
(Panel zeigt nur die ersten 6 Befunde), oder die Zahl der Fremdbefunde
bewusst klein halten.
Status:      spec-korrigiert

### H-18 — Dach fehlt nicht nur im 2D-Plan, sondern auch im Schnitt (07.07.2026, Journey efh, Schritt 10)
Beobachtung: H-2 hielt fest, dass `derive/plan.ts` kein 2D-Plansymbol fürs Dach
kennt, notierte aber «im Schnitt sichtbar». Die Code-Gegenprobe (Fable-Review 2)
zeigt: `derive/section.ts` kennt ebenfalls KEINEN `roof`-Fall — das Dach lebt
nur in `derive/scene.ts` (3D). Der Buildplan-Tabellen-Anker (Zeile EFH) «Dach
in 3D-Szene UND Schnitt vorhanden» ist damit nicht erfüllbar; die EFH-Journey
hat den Schnitt-Teil still fallen gelassen. Zusätzlich: die «Dach in 3D
sichtbar»-Assertion in Baustein 5 (`dachSetzen`, `bausteine.ts`) prüft nur, dass
der `viewport3d`-Canvas sichtbar ist — das ist mit und ohne Dach grün; echt
getestet ist allein das Doc-Delta `byKind('roof')+1`.
Triage:      v2-lücke (Produkt-Feature fehlt) + Coverage-Grenze (kein schärferer
Hook für «Dach im Bild»)
Beleg:       `packages/kosmo-kernel/src/derive/section.ts` (kein roof-Fall,
grep 0 Treffer); `derive/plan.ts` (kein roof-Fall, H-2); `e2e/sim/bausteine.ts`
Baustein 5 (nur Canvas-Sichtbarkeit).
Entscheid:   Ein `roof`-Fall in `derive/plan.ts` UND `derive/section.ts` ist ein
V2-Produkt-Feature (2D-/Schnitt-Projektion des Dachs) → kein H-Fix-Batch ohne
Owner-Priorisierung. Die EFH-Journey assertet bewusst nur das Doc-Delta + die
3D-Canvas-Sichtbarkeit und dokumentiert die Grenze hier (statt einen nicht
existierenden Schnitt-Anker vorzutäuschen). Korrigiert die frühere
H-2-Formulierung «im Schnitt sichtbar».
Status:      doku (V2)

### H-19 — Kosmo-Quellensprung verlässt die Plan-Ansicht (07.07.2026, Journey blockrand, Schritt 6→8)
Beobachtung: Der Kosmo-Quellensprung (`quelle-sprung-dossier`, Baustein 13
Modus «quelle») führt die Ansicht zur Dossier-Quelle. Blockrand ist die einzige
Journey, die den Sprung VOR dem Phasengang fährt; danach fand der plan-lesende
Baustein 3 (`phaseSchalten`) das `planview` nicht mehr (nicht gemountet), die
stabilisierte Pfadzahl blieb bei 0.
Triage:      spec-korrigiert (kein Produktfehler — der Sprung IST das Feature;
korrekte App-Struktur)
Beleg:       `e2e/sim-blockrand.spec.ts` Schritt 8 (Phasengang); der Sprung
wechselt bewusst die Ansicht (Nutzerverhalten).
Entscheid:   Opus (serielle Integration) setzt vor dem Phasengang die Ansicht
explizit auf KosmoDesign-2D zurück (`__kosmo.open('design')` + `view-2d` +
`planview`-Sichtbarkeits-Assert), analog zu echtem Nutzerverhalten. Kein
H-Fix; Journal-Vollständigkeit (Abschnitt 5, Punkt 1) — der Fix stand vorher
nur in ROADMAP-174-Prosa.
Status:      spec-korrigiert
