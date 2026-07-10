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

### H-20 — `/stt`: faster-whisper ist im H3a-Build-Sandbox importierbar, `_stt_available()` weicht vom Buildplan-Normalfall ab (07.07.2026, Journey ki-imaging, Schritt 2)
Beobachtung: Der Buildplan (Abschnitt 3) geht davon aus, dass im Container
`faster-whisper` fehlt und `/stt` darum immer ehrlich mit 501 antwortet. Im
Build-Sandbox dieses H3a-Batches ist `faster-whisper==1.2.1` jedoch
pip-installiert und importierbar (`python3 -c "import faster_whisper"` →
Exit 0; `GET /health` gegen die laufende `--fake`-Bridge → `services.stt:
true`). Ein `POST /stt` mit einem 64-Byte-Zufalls-„Audio" traf darum NICHT
den 501-Pfad, sondern den echten Whisper-Zweig und endete in einem
unbehandelten **500 Internal Server Error** (main.py Z.381-396 lädt/
transkribiert echt, kein try/except um `WhisperModel(...)`/`transcribe(...)`).
Triage:      kein-bug (Umgebungsabweichung, kein Kosmo-Bridge-Defekt — der
Code verhält sich exakt wie geschrieben: 501 NUR wenn `_stt_available()`
False ist; dass dieser Build-Container `faster-whisper` installiert hat, ist
keine main.py-Verantwortung). Kleine Coverage-Lücke bleibt: ein echter
Whisper-Aufruf mit Garbage-Bytes crasht ungefangen (500 statt einer sauberen
4xx-Meldung) — kandidiert als V2-Härtungspunkt, kein Blocker.
Beleg:       `python3 -c "import faster_whisper"` (Exit 0) im H3a-Sandbox;
`curl -F audio=@mini.wav http://127.0.0.1:8600/stt` → `500 Internal Server
Error` gegen die laufende `--fake`-Bridge (Prozess `python3 tools/
homestation-bridge/kosmo_bridge/main.py --fake --port 8600`); main.py
Z.360-396 `_stt_available()`/`stt()`.
Entscheid:   `e2e/sim-ki-imaging.spec.ts` fragt vor der 501-Assertion selbst
`GET /health` ab und überspringt die STT-Assertion ehrlich (mit Begründung im
Skip-Text, kein stiller Pass), wenn `services.stt === true` — robust gegen
beide Umgebungen, ohne den Buildplan-Normalfall (fehlendes faster-whisper)
als Annahme aus dem Test zu streichen. Kein H-Fix nötig; die optionale
V2-Härtung (try/except um den Whisper-Aufruf, sauberer 4xx-Ersatz statt 500)
geht an den Owner, nicht Teil dieses Serie-H-Batches (kein Produktcode hier).
Status:      doku (V2)

### H-21 — Command-Coverage-Liste (Fable-Schlussreview, Buildplan Abschnitt 9)
Beobachtung: Von den 72 Command-IDs fahren die sechs Sim-Journeys (direkt via
`__kosmo.run` oder über verifizierte UI-Pfade wie `inspector-renovation`,
`add-sheet`, `place-plan`, `pubset-speichern`, `drei-stimmungen`,
`grundrisse-fuellen`, `blatt-ablegen`) die grosse Fläche ab. **NICHT in
Sim-Journeys** (teils anderweitig in `e2e/*.spec.ts` gedeckt):
`design.aufbauErstellen`, `deckeZeichnen` (=H-7, kein UI-Knopf),
`eigenschaftSetzen`, `katalogImportieren`, `kennzahlFormelnSetzen`,
`prioritaetSetzen`, `rasterEntfernen`, `raumTypSetzen`, `rolleSetzen`,
`stuetzeSetzen` (nur `stuetzenAusRaster` gefahren), `themenPlanEntfernen`,
`tuerSetzen` (Türen nur via Generator), `verschieben`, `vorlageSetzen`,
`vorlageSpeichern`; `publish.ansichtAnpassen/-Entfernen/-Verschieben`,
`bildAnpassen/-Entfernen/-Fuellen/-Verschieben`, `blattEntfernen`,
`revisionErfassen`, `setEntfernen`, `textSetzen`, `wolkeSetzen/-Entfernen`;
`vis.graphLoeschen`, `nodeLoeschen`, `nodeParametrieren`, `trennen`.
Triage:      kein-bug (Coverage-Buchführung, ehrlich statt behauptet)
Beleg:       `packages/kosmo-kernel/src/commands/` (72 Command-IDs);
`git diff bd3f3c1..HEAD` berührt keine `packages/`.
Entscheid:   «Alle Tools» ist ein wachsendes Ziel (Buildplan Abschnitt 9):
die grosse Fläche ist gedeckt, die obigen Commands docken als weitere
Bausteine/Journeys an, wenn ein Haustyp sie braucht. Kein H-Fix.
Zusatz-Fussnote: **Umbau/MFH fahren keinen `phaseSchalten`-Phasengang** —
das Abschnitt-2-Intro verlangt ihn «je Journey», die Tabellenzeilen sagen aber
«bleibt, Assertions unverändert»; der Vorrang des leeren H1a-Assertions-Diffs
war die bewusste Ausnahme (die vier neuen Journeys fahren den Phasengang).
Status:      doku (V2)

### H-22 — Varianten-Station im Hochhaus nicht in der Journey gefahren (Fable-Schlussreview, Journey hochhaus)
Beobachtung: Buildplan Abschnitt 2 (Zeile Hochhaus) nennt «Varianten
(`studie-toggle`/`varianten-matrix` falls Testid-gestützt, sonst Command)».
Beide Testids EXISTIEREN (`DesignWorkspace.tsx` Z.1040 / Z.1816, in
`module.spec.ts` UI-gedeckt) — die «falls Testid-gestützt»-Bedingung war also
erfüllt, `sim-hochhaus.spec.ts` fährt das Varianten-Segment aber nicht.
Triage:      v2-lücke / Coverage-Lücke (bewusst dokumentiert, nicht still)
Beleg:       `apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx`
Z.1040/1816 (`studie-toggle`/`varianten-matrix`); `e2e/module.spec.ts`
(Varianten-Matrix bereits e2e-gedeckt).
Entscheid:   Die Varianten-Matrix ist über `module.spec.ts` bereits
E2E-gedeckt; ein zusätzliches Segment in der Hochhaus-Journey (nach Schritt 8)
ist optional und kein Gate. Als bewusste Journey-Lücke geführt.
Status:      offen

### H-23 — Raumgraph kennt kein Containment-Portal (aus H-13 herausgelöst, v2-lücke)
Beobachtung: Der Raumgraph (`derive/raumgraph.ts`) bildet Fluchtweg-Portale
nur aus Tür-Öffnungen oder kollinear GETEILTEN Umriss-Kanten (`offeneKante`).
Eine überlappend VERSCHACHTELTE Zone (z. B. eine Voll-Geschosszone mit dem
Treppenhaus-Kern DARIN) teilt keine Kante → `distanz=Infinity` → «keine
Verbindung zum Treppenhaus (Tür fehlt?)». Das ist eine reale Nutzer-
Modellierweise; die Warnung ist ehrlich, aber ein Containment-Portal (Zone
enthält eine Ziel-Zone) oder eine explizite «Zonen überlappen»-Warnung wäre
nutzerfreundlicher.
Triage:      v2-lücke (Kernel-Feature; die Journey umgeht es korrekt via
adjazenter Nordband-Zone, H-13)
Beleg:       `packages/kosmo-kernel/src/derive/raumgraph.ts` Z.60-77
(`offeneKante`) + Z.118-126 (offene Übergänge nur bei geteilter Kante);
`checks.ts` Z.199-205 («keine Verbindung»-Text).
Entscheid:   Containment-Portal / Überlappungs-Warnung ist ein V2-Kandidat →
kein H-Fix ohne Owner-Priorisierung. Die Hochhaus-Journey modelliert bewusst
adjazent (kantenteilend), sodass der Egress korrekt verdrahtet ist.
Status:      doku (V2)

### H-24 — `baugesuch.spec.ts`: Schnittlinien-Vorbedingung scheitert an degenerierter Bounding-Box (08.07.2026, Journey vollprojekt-phase4, Schritt 3)
Beobachtung: `e2e/baugesuch.spec.ts` (VP2) trägt selbst den Hinweis «NICHT im
Worktree ausgeführt (Owner-Auftrag) — der Koordinator fährt ihn nach dem
Einpflegen» — beim ersten echten Lauf in diesem Batch (VP6 Phase 4 baut
denselben Ablauf: Rechteck zeichnen → Schnitt platzieren → Assertion auf
`[data-testid="sheet-canvas"] line"` `toBeVisible()`) schlug GENAU diese
Zeile fehl: `Received: hidden`, obwohl das Element resolved wurde
(`<line x1="…" x2="…" stroke="#444" …>` mit `x1 === x2`). Die abgeleitete
Schnittlinie ist bei achsenparalleler Schnittebene ein SVG-`line` mit
Bounding-Breite 0 — exakt dieselbe Klasse Problem, die Baustein 18
`terrainSetzen` (`e2e/sim/bausteine.ts`, Regel R4) für degeneriertes
Terrain schon dokumentiert: Playwright meldet ein Element mit
Bounding-Höhe/Breite 0 nie als «visible».
Triage:      zu-strikte-assertion (Regel R4 — kein Produktfehler, die Linie
existiert und ist korrekt gezeichnet)
Beleg:       `e2e/baugesuch.spec.ts` Z.66-69 (Reproduktion: `npx playwright
test e2e/baugesuch.spec.ts` schlägt am ersten der zwei Tests fehl, vor dem
H-24-Fix); `e2e/sim/bausteine.ts` Baustein 18 Regel R4 (identisches Muster).
Entscheid:   Trivialer, regressionsfreier Fix direkt im bestehenden VP2-Test
(nicht nur in der neuen VP6-Kette umgangen): `.toBeVisible()` →
`.toBeAttached()` für diese eine Zeilen-Assertion, mit Verweis auf Regel R4
im Kommentar. `e2e/sim-vollprojekt-phase4.spec.ts` (VP6) übernimmt denselben
Fix von Anfang an. Beide Specs 2× grün nach dem Fix.
Status:      fix-batch VP6+VP7 (dieser Batch, kein neuer ROADMAP-Eintrag
nötig — Ein-Zeilen-Testfix, kein Produktcode berührt)

### H-25 — Baustein 12 `berechnungslistePruefen` setzt ein bereits offenes Liste-Panel voraus (08.07.2026, Journey vollprojekt-phase2, Schritt 5)
Beobachtung: `berechnungslistePruefen` (Baustein 12, `e2e/sim/bausteine.ts`
Z.811-823) assertet direkt `[data-testid="liste-tabelle"]` `toBeVisible()`,
ohne das Panel selbst zu öffnen. In JEDEM bisherigen Aufrufer (`sim-mfh.spec.ts`)
war das Panel bereits offen, weil `segmentieren` (Baustein 9) vorher
`[data-testid="liste-toggle"]` klickt. `sim-vollprojekt-phase2.spec.ts` baut
das Erdgeschoss ohne den Segmentierer (nur Wände/Decke/Zone per Command) und
ruft `berechnungslistePruefen` direkt auf — das Panel war zu, die Tabelle
nie im DOM, Timeout.
Triage:      v2-lücke / Coverage-Lücke (kein Bug — der Baustein tut exakt,
was sein Name sagt: er PRÜFT die Liste, öffnet sie nicht; die stillschweigende
Abhängigkeit von Baustein 9 war bisher nie dokumentiert, weil nie getrennt
aufgerufen)
Beleg:       `e2e/sim/bausteine.ts` Z.657-696 (`segmentieren`, klickt
`liste-toggle` Z.662) vs. Z.811-823 (`berechnungslistePruefen`, kein eigener
Toggle-Klick); `e2e/sim-vollprojekt-phase2.spec.ts` (neuer, direkter Aufrufer
ohne Segmentierer).
Entscheid:   Kein Baustein-Fix (API-Freeze, Baustein 12 bleibt unverändert —
ein zusätzlicher impliziter Toggle-Klick in einer bestehenden, eingefrorenen
Funktion wäre eine stille Verhaltensänderung). Der Aufrufer trägt die
Verantwortung: `sim-vollprojekt-phase2.spec.ts` klickt `liste-toggle` selbst,
mit Kommentar-Verweis auf diesen Befund. Für einen künftigen Baustein-23+
könnte das Panel-Öffnen ergänzt werden (kein Blocker, keine v0.6.3-Pflicht).
Status:      offen (Doku-Befund, Spec-seitig umgangen)

### H-26 — Baustein 3 `phaseSchalten` verlangt bereits gezeichnete Geometrie (08.07.2026, Journey vollprojekt-phase2/3/4, Schritt 1)
Beobachtung: `phaseSchalten` (Baustein 3) endet mit `stabilePfadzahl()`, die
`[data-testid="planview"] path"` auf `count() > 0` UND zwei stabile Messungen
in Folge pollt (Regel R1: nie eine fixe Pfadzahl). Ruft man `phaseSchalten`
auf einem NOCH LEEREN Geschoss (keine Wände/Decken/Zonen — z. B. direkt nach
`phaseWechseln`, vor jeder Geometrie), pollt die Funktion bis zum Timeout,
weil die Pfadzahl nie über 0 steigt. In allen bisherigen Journeys (`sim-efh`,
`sim-hochhaus`, `sim-submission`) stand beim `phaseSchalten`-Aufruf bereits
Geometrie im Plan — die Vorbedingung «nicht-leerer Plan» war nie explizit
benannt, weil nie verletzt.
Triage:      kein-bug (Baustein tut exakt, was er soll — die Vorbedingung war
nur nicht dokumentiert, weil in Serie H nie verletzt)
Beleg:       `e2e/sim/bausteine.ts` Z.226-268 (`stabilePfadzahl`/
`phaseSchalten`); erster Fehlversuch von `sim-vollprojekt-phase2.spec.ts`
(Baustein-21-Aufruf unmittelbar gefolgt von Baustein-3-Aufruf auf leerem
Geschoss, `Plan-SVG-Pfadzahl stabilisiert sich nicht`-Timeout).
Entscheid:   Kein Baustein-Fix. Alle sechs VP6-Phasen-Specs rufen
`phaseSchalten` jetzt bewusst NACH der Wände/Decken/Zonen-Konstruktion auf
(dokumentiert im jeweiligen Spec-Kommentar) — dieselbe Reihenfolge, die die
bestehenden Journeys immer schon (implizit) eingehalten haben. Ein Kandidat
für eine spätere Baustein-3-Doku-Ergänzung («Vorbedingung: Geschoss trägt
bereits Geometrie»), kein Produktcode-Fix.
Status:      doku

### H-27 — applyDefaults stopfte Kontext-assemblyId in OPTIONALE Felder (10.07.2026, Journey kosmo-efh, Zug 3)
- **Beobachtung:** «Jetzt die Decke übers Erdgeschoss» → Diff-Karte erschien, das Anwenden scheiterte mit «Aufbau ‹AW Sichtbeton 39› ist kein Decken-Aufbau (target slab)» — der ChatSession-Default-Merge hatte die WAND-Aufbau-Id des App-Kontexts in das optionale `assemblyId` von `design.deckeZeichnen` gestopft. Für den Nutzer: Kosmo scheitert grundlos an einem simplen Wunsch.
- **Triage:** echter-bug (B).
- **Beleg:** e2e/kosmo-journey-efh.spec.ts Lauf 2 (slabs=0 bei 6/6 «fehlerfreien» Zügen); Wurzel chat.ts applyDefaults (blinder Merge).
- **Entscheid (Fable):** Sofort behoben — Kontext-Defaults füllen nur noch PFLICHT-Felder des Ziel-Commands (chat.ts + Unit-Test chat-defaults.test.ts: Wand bekommt storeyId/assemblyId, Decke nur storeyId).
- **Status:** behoben (0.6.7 Sim-Runde 1).

### H-28 — Fehlgeschlagenes Anwenden hinterlässt keine bleibende Spur im Chat (10.07.2026, Journey kosmo-efh, Zug 3)
- **Beobachtung:** Als das Decken-Anwenden scheiterte (H-27), zeigte der Chatverlauf danach WEDER die Karte NOCH einen Fehlerhinweis — nur Kosmos Ankündigungstext. Ein Nutzer, der den Toast verpasst, hält den Schritt für erledigt; ein Modell ohne Retry lässt ihn stumm fallen.
- **Triage:** echter-bug (B).
- **Beleg:** error-context Lauf 2 (Decke-Zug ohne Karte/Fehlerzeile im Verlauf).
- **Entscheid (Fable):** an Welle D2 (Chat-/Proposal-Erlebnis): fehlgeschlagene Anwendungen als bleibende, ehrliche Fehlerzeile im Verlauf («Schritt konnte nicht angewendet werden: …»).
- **Status:** offen → D2.

### H-29 — Kosmo-Panel: Schliessen ohne testid, offenes Panel verdeckt die Stations-Navigation (10.07.2026, Journey kosmo-efh, Akt 2)
- **Beobachtung:** Das Panel lässt sich nur über einen aria-label-Knopf schliessen (kein testid); bei offenem Panel ist das KosmoSymbol unmounted und die Navigation verdeckt — Baustein 23 musste auf `[aria-label="Schliessen"]` ausweichen.
- **Triage:** v2-lücke (C).
- **Beleg:** App.tsx `{!kosmoOpen && <KosmoSymbol/>}`; KosmoPanel Kopf-KButton ohne testid.
- **Entscheid (Fable):** an Welle D2 (testid `kosmo-panel-schliessen`, additiv).
- **Status:** offen → D2.

### H-30 — render-formular-szene: Options-Values sind Prompt-Langtexte statt stabiler Schlüssel (10.07.2026, Journey kosmo-efh, Akt 2)
- **Beobachtung:** `selectOption('Aussenansicht vom Hof')` — die Values des Szene-Selects sind die deutschen Prompt-Fragmente selbst. Für Automatisierung, spätere Übersetzung und Prompt-Umbauten fragil (Value-Änderung = stiller Vertragsbruch).
- **Triage:** v2-lücke (C).
- **Beleg:** NodeCanvas.tsx Z.1608-1612.
- **Entscheid (Fable):** an Welle V1/V2 nur falls billig (stabile Keys + Anzeige-Map, Prompt-Bau übersetzt) — sonst 0.6.8.
- **Status:** offen.

### H-31 — Geteilter Fake-Worker-Job-Store verzögert parallele Render-Läufe (10.07.2026, Journey kosmo-efh, Akt 2)
- **Beobachtung:** 52 Jobs paralleler Läufe in /tmp/kosmo-jobs — der Render der Journey blieb >25 s ohne Bild (Warteschlangen-Stau), obwohl die Bridge gesund war.
- **Triage:** kein-bug (Test-Infrastruktur; der echte Betrieb hat einen Nutzer je HomeStation).
- **Beleg:** health ok, 52 Einträge im Store, render-status «bereit» der Nachbar-Nodes.
- **Entscheid (Fable):** dokumentierte Betriebsregel bleibt (Store-Reset zwischen isolierten Läufen); keine Produktänderung.
- **Status:** dokumentiert.

### H-32 — Render-Node mit Formularfeldern bleibt für immer «veraltet», Bild nie sichtbar (10.07.2026, Journeys kosmo-efh + kosmo-mfh)
- **Beobachtung:** Sobald ein V-H4-Formularfeld (Fassade/Szene/Jahreszeit/Personen/Freitext) gesetzt ist, gilt der Render nach dem Ausführen sofort und dauerhaft als «veraltet»: der beim Absenden gespeicherte memoKey rechnet formularZusatz() MIT ein (ausfuehren, NodeCanvas ~Z.474-488), der Veraltet-Vergleich (~Z.776) nutzt den ROHEN Auftrag OHNE Zusatz — und render-bild rendert nur bei status «fertig». Das fertige Bridge-Bild bleibt unsichtbar; auch Journey A hing genau hier (der H-31-Job-Stau war NICHT die Wurzel — Korrektur unten).
- **Triage:** echter-bug (A — entwertet das ganze Formular-Feature in Kombination mit Ausführung).
- **Beleg:** Journey B Befund 8 (Fallback: Formular vor dem Ausführen geleert); Journey A Lauf 6 (Bild-Timeout trotz gesunder Bridge).
- **Entscheid (Fable):** Auflage an Welle V1 (NodeCanvas-Besitzer): der Veraltet-Vergleich nutzt denselben KOMBINIERTEN Prompt wie das Absenden; Regressionstest im neuen vis-editor.spec.
- **Status:** offen → V1 (Auflage 0).

**Korrektur zu H-31:** Der Job-Store-Stau war Begleiterscheinung, nicht Ursache des Journey-A-Bildausfalls — die Wurzel ist H-32. Betriebsregel (Store-Reset zwischen isolierten Läufen) bleibt sinnvoll.

### H-33 — Kein Kommando wechselt das aktive Geschoss: Chat-Dach landet nach dem Stapeln auf dem EG (10.07.2026, Journey kosmo-mfh, Zug 8)
- **Beobachtung:** applyDefaults füllt storeyId immer mit dem AKTIVEN Geschoss — das seit Projektstart unverändert das EG ist, weil weder ein design.*- noch ein ui.*-Kommando das aktive Geschoss wechselt. design.dachErstellen setzt das Walmdach darum kommentarlos aufs unterste Geschoss.
- **Triage:** echter-bug (A — geometrisch falsches Ergebnis ohne Fehlermeldung).
- **Beleg:** Journey B Befund 6 (Fallback: Dach gelöscht + direkt aufs oberste Geschoss).
- **Entscheid (Fable):** Auflage an Welle V2: additiver ui.*-Befehl `ui.geschossSetzen` (App-Zustand!) in ui-befehle.ts + als Kosmo-Werkzeug via kosmo-ui-werkzeuge — Kosmo kann dann ehrlich «ins Dachgeschoss wechseln» bevor es baut.
- **Status:** offen → V2.

### H-34 — Wohnungs-Segmentierer ist kein Command, für Kosmo unerreichbar (10.07.2026, Journey kosmo-mfh, Zug 4)
- **Beobachtung:** segmentierer-lauf/-uebernehmen existieren nur als UI-Knöpfe der Berechnungsliste — kein design.*-Command, also kein Kosmo-Tool.
- **Triage:** v2-lücke (B).
- **Entscheid (Fable):** 0.6.8-Kandidat (Command-Extraktion aus der UI-Logik ist kein Nacht-Nebenjob); im Skript ehrlich über zoneErstellen umfahren.
- **Status:** offen → 0.6.8.

### H-35 — fassadenModulZuweisen setzt Volumenkörper voraus, wand-basierter Baupfad geht leer aus (10.07.2026, Journey kosmo-mfh, Zug 5)
- **Triage:** v2-lücke (C). **Entscheid:** 0.6.8-Kandidat (Kante-zu-Modul auch auf Wandzügen); fensterAusModulen bleibt der gangbare Chat-Weg. **Status:** offen.

### H-36 — Kuratier-Fläche zeigt nur render-Nodes, Viewport-Aufnahmen fehlen (10.07.2026, Journey kosmo-mfh, Vis)
- **Triage:** v2-lücke (C). **Entscheid:** Auflage an Welle V1: kuratierKarten nimmt auch aufnahme-Nodes mit Bild auf (gleiches Karten-Muster). **Status:** offen → V1.

### H-37 — SzenarioSkripte sind statisch: kein Rückkanal von Tool-Ergebnissen in spätere Züge (10.07.2026, Journey kosmo-mfh)
- **Triage:** kein-bug (bewusste Datenform; $neu:N deckt Paket-intern, contextDefaults den Rest). Dokumentiert als Grenze im scripted.ts-Kopf nachziehen (V2 nebenbei). **Status:** dokumentiert.

### H-38 — design.geschossErstellen erlaubt stillschweigend doppelten Namen + Index (10.07.2026, Kritik-Runde 1, Satteldach-Mini-Projekt)
- **Beobachtung:** Im frischen Projekt (das bereits EG/1.OG trägt) legt `design.geschossErstellen {name:'EG', index:0}` kommentarlos ein ZWEITES «EG» mit Index 0 an — die Geschoss-Pillen zeigen «1.OG / EG / EG», nichts warnt vor der Kollision (Kritik-Bild paper-6/ink-6).
- **Triage:** v2-lücke (C — kein Datenverlust, aber verwirrend; index-basierte Logik wie ui.geschossSetzen {index} trifft dann das erste Fundstück).
- **Entscheid (Fable):** 0.6.8-Kandidat: Kommando warnt/verweigert bei Namens- ODER Index-Kollision (CommandError mit ehrlicher Meldung), bestehende Docs mit Duplikaten bleiben lesbar.
- **Status:** offen → 0.6.8.
