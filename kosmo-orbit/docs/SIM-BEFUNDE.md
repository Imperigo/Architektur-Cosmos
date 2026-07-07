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
