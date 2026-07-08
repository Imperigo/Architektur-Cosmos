# V0.6.3-Vollprojekt-Konzept — ein Testprojekt vom Wettbewerb bis zur Gebäudeabnahme

> Owner-Auftrag K22 (`docs/OWNER-BEFUNDE-0.6.2.md`, PDF S. 6, wörtlich): «Ich
> möchte einen vollständigen Testlauf machen für ein spezifisches Projekt und
> jede Phase durchgehen und mit dir einen vollständigen Entwurf machen vom
> Wettbewerb bis zur Gebäudeabnahme nach Bauende. Lege dazu erstmals einen
> Plan aus — Hauptaufgabe für v0.6.3, entwickle dafür schonmal ein Konzept.»
> Dieses Dokument ist das Konzept; **der Testlauf selbst ist v0.6.3**, nicht
> Teil dieser Datei. Reine Doku, kein Produktivcode. Quellen: `CLAUDE.md`,
> `docs/OWNER-BEFUNDE-0.6.2.md`, `docs/WETTBEWERB-KONZEPT.md`,
> `docs/SUBMISSION-KONZEPT.md`, `docs/PLAN-DETAILLIERUNG.md`, `ROADMAP.md`
> (Einträge 200–226), `e2e/sim/szenarien.ts`, `e2e/sim/bausteine.ts`,
> Kernel-Code mit Pfad+Zeile, wo zitiert.

---

## 1. Projektwahl

**Empfehlung: das bestehende MFH-Szenario „Ersatzneubau Zürich-Altstetten“**
aus `e2e/sim/szenarien.ts` (Schlüssel `mfh`, Zeilen 103–147) als das eine
Testprojekt für den gesamten K22-Durchlauf.

- **Parzelle**: Rechteck 40 × 24 m (Outline `{-5000,-5000}…{35000,19000}` mm),
  960 m² — real gerechnet in ROADMAP 219 («960 m² aus dem 40×24-Umriss»).
  Standort Zürich-Altstetten, LV95 e=2'678'000/n=1'249'000, WGS84
  lat 47.3866/lon 8.4728, hoeheM 400 (Fixture, kein GIS-Import — Serie-H-Regel).
- **Zonenregel**: „W4 (Zürich-Altstetten)“ — az 1.4, maxHöhe 16 m,
  maxVollgeschosse 4, Grenzabstand klein/gross 4/6 m. Strukturell dieselbe
  Schemaform wie die echte Zürcher BZO (`wissen/vault/normen/
  700.100Bau-undZonenordnungV2.md`), aber als Fixture ausgewiesen — Serie H
  markiert das selbst ehrlich als Richtwert, kein Gemeinde-Reglement-Zitat.
- **Raumprogramm**: preisguenstig 300 m² HNF-Soll + marktgerecht 190 m² —
  490 m² HNF-Soll total, zwei Wohnungstypen (Berechnungsliste kennt beide
  Programm-Keys, `derive/berechnungsliste.ts`).
- **Gestaltung/Dossier**: Regelgeschoss 30×14 m zweibündig mit Mittelkorridor,
  mineralisch verputzte Lochfassade auf Betonskelett, Do-Eintrag „Wohnungen
  tageslichtorientiert um den Mittelkorridor“ — bereits als `DossierEintrag`
  vorhanden (Phase-0-Format, `model/doc.ts` Z. 13–17).
- **Budgetrahmen (neue Annahme für v0.6.3, nicht im Szenario enthalten)**:
  Baukostenindex Zürich, ca. CHF 4'800.–/m² NGF Baukostenklasse mittel
  (eBKP-Kategorie C+D+E+G als Owner-Annahme, kein Norm-Zitat) → bei geschätzt
  ~620 m² NGF (490 m² HNF-Soll × 1.28 `agfFactor`) grob **CHF 3.0 Mio.** als
  Kostenvoranschlag-Zielgrösse für die Bauprojekt-Phase. Diese Zahl ist eine
  Arbeitsannahme des Konzepts, kein Kernel-Wert — Devisierung selbst ist eine
  der grossen Lücken (Abschnitt 2, Phase 33).

**Warum dieses Projekt statt EFH/Stadthaus:** Das MFH-Szenario ist die
**einzige** Vorlage im Bestand, die bereits durch **zwei komplette
Phasen-Simulationen** gelaufen ist — `sim-wettbewerb.spec.ts` (ROADMAP 219,
Block D) nutzt exakt diese Zonenregel/Parzelle für die Grundlagenstudie, und
das MFH ist zugleich Referenzform für `stuetzenraster.ts`/`design.rasterSetzen`
(Tragwerk) und für die Segmentierer-Typen. Ein EFH (`efh`-Szenario, Hanglage
Emmental) ist geometrisch interessanter (Split-Level, Hangterrain), aber
kleiner im Programm — für den **vollen** SIA-Zyklus inkl. Submission/Tragwerk/
Devis ist ein Geschosswohnungsbau die realistischere Übung, weil es mehr
Gewerke, mehr Wohnungstypen und einen echten Kostenrahmen erzwingt. Ein
Stadthaus-Szenario existiert im Datensatz nicht (nur `umbau`, `mfh`, `efh`,
`stadthaus`-Schlüssel ist zwar im Typ deklariert aber in der Datei-Auflistung
nicht unter den befüllten vier — sollte es de facto fehlen, wäre das ein
eigener kleiner Fund, kein Blocker: das MFH-Szenario deckt den Ownerwunsch
bereits vollständig ab).

---

## 2. Phasenplan nach SIA 102/112

SIA 102:2020 nummeriert die Teilphasen **31 Vorprojekt, 32 Bauprojekt, 33
Bewilligungsverfahren, 41 Ausschreibung, 51 Ausführungsprojekt, 52
Ausführung** (`docs/PLAN-DETAILLIERUNG.md` Z. 26–28); die Wettbewerbs-/
Studienphase liegt normativ **davor**, als Teilphase 4.22
„Auswahlverfahren“ (`docs/WETTBEWERB-KONZEPT.md` Abschnitt 1.1). Der
K22-Auftrag verlangt zusätzlich eine Abschlussphase „Gebäudeabnahme nach
Bauende“ — SIA 102 kennt dafür keine eigene Teilphase-Nummer im OCR-Korpus
(nächstliegend: Ende der Teilphase 52 „Ausführung“ plus Garantie-/
Mängelbehebung, in der Praxis oft als „53“ gehandhabt, im Korpus nicht
belegt) — dieses Konzept führt sie ehrlich als **eigene, unbelegte
Arbeitsphase** statt eine SIA-Nummer zu erfinden.

Für jede Phase: (a) was der Architekt real tut, (b) was KosmoOrbit **heute**
abdeckt (Beleg: Command/Baustein/ROADMAP-Nr.), (c) was fehlt → v0.6.3-Batch,
(d) das Phasen-Artefakt, (e) 🔒-Punkte.

### Phase 31/4.22 — Wettbewerb/Studie

| # | Inhalt |
|---|---|
| (a) | Programm lesen, Parzelle/Zone/Klima erfassen, 3–6 Extremvarianten prüfen, Typologie-Richtung wählen |
| (b) HEUTE | **Fast vollständig gebaut** — Block D komplett (D1–D6, ROADMAP 213/214/215/216/218/219): `studienOptionenAusRegel` (Zonenregel→Studienoptionen), `generiereVolumenstudien` (6 Typologien), `besonnungsvergleich.ts` (SunCalc-Näherung), `programmerfuellung.ts` (GF-Soll/Ist), Kosmo-Tool `grundlagen.volumenstudie` (`commands/grundlagen.ts`), Bericht `studienBerichtSvg` (`derive/studienbericht.ts`), E2E `sim-wettbewerb.spec.ts` (Baustein 20 `grundlagenStudieAusfuehren`) |
| (c) FEHLT | Baustil-/Tragwerks-**Einordnung** als LLM-Antwort mit Quellen-Chip (D-E6/D-E7, im Konzept entschieden, in Block D nicht als eigener Batch gebaut — im MFH-Testlauf erstmals fällig); Ortsanalyse/Kontext-Text bleibt Architektenhandwerk (Wissenslücke, Abschnitt 1.4 Wettbewerb-Konzept) |
| (d) Artefakt | `grundlagenstudie.svg` (Matrix + 6 Grundrisse + Kennzahlen + „Anstoss, kein Entwurf“) |
| (e) 🔒 | Reale Zuger/Zürcher BZO-PDF-Einlesung, echte Ortsbegehung, SIA 142/143-Verfahrensregeln (Fristen/Anonymität) — im Korpus nicht OCR-erschlossen, im Bericht offen benannt |

### Phase 32 — Vorprojekt

| # | Inhalt |
|---|---|
| (a) | Gewählte Variante vertiefen: Grundrisse fixieren, Konstruktion/Tragwerk grob, Vorprojekt-Pläne 1:200, erste Kostenschätzung |
| (b) HEUTE | Übernahme-Mechanismus (`history.beginGroup`/`design.volumenErstellen`, Konzept-Abschnitt 2.7) holt die gewählte Studienvariante als MassBody ins Doc; `BauPhase.vorprojekt` existiert im Modell (`model/doc.ts` Z. 30, Plankopf „Vorprojekt (SIA 31)“ — **Namenskonflikt**, s.u.); `pruefeGrundriss` (Grenzabstand/Höhe) läuft automatisch; Stützenraster-Assistent (`design.rasterSetzen`/`stuetzenAusRaster`, ROADMAP 73/112) für die grobe Tragstruktur |
| (c) FEHLT | **Der Phase-Label-Bug**: `phaseLabel()` beschriftet `'vorprojekt'` als „Vorprojekt (SIA 31)“ — SIA 31 ist korrekt Vorprojekt, aber Wettbewerb/Studie (4.22) hat im Modell **gar keinen eigenen `BauPhase`-Wert** — die Studie läuft komplett ausserhalb von `doc.settings.phase`. Für den Vollprojekt-Testlauf harmlos (Block D schreibt nichts in `phase`), aber für einen sauberen Phasenplan fehlt eine Kosmo-sichtbare Markierung „aktuell in Wettbewerb/Studie“ vs. „aktuell in Vorprojekt“ jenseits des Blatt-Titels; Kostenschätzung (grobe m²-/m³-Preis-Kennzahl) existiert nicht als eigener Kernel-Wert — nur die Budget-Annahme aus Abschnitt 1 |
| (d) Artefakt | Vorprojektpläne 1:200 (Grundriss/Schnitt/Ansicht via KosmoPublish, bestehende Blatt-Infrastruktur), Kennzahlen-Panel (HNF/NGF/aGF-Ziel) |
| (e) 🔒 | Echte Bauherrenpräsentation/Feedback-Runde ist Owner-Rolle, nicht simulierbar |

### Phase 33 — Bauprojekt/Bewilligungsverfahren

| # | Inhalt |
|---|---|
| (a) | Bauprojekt 1:100 detaillieren (Konstruktion/Material/Aufbauten), Baugesuch mit vollständigem Plansatz bei der Behörde einreichen, Kostenvoranschlag |
| (b) HEUTE | `BauPhase.bauprojekt` (1:100, `phaseLabel` „Bauprojekt (SIA 32/33)“ — bewusst zusammengefasst, `docs/PLAN-DETAILLIERUNG.md` Z. 60); Wandaufbauten (`design.aufbauErstellen`, Design-Command Z. 72), Öffnungen/Aussparungen (`design.oeffnungSetzen`/`design.aussparungSetzen`), Grundriss-Checks inkl. Mehrhöhenzuschlag; `submissionsreife.ts`-Kriterientabelle (Material/Aufbau/Schicht) ist als Vorstufe direkt anwendbar, obwohl sie für Phase 41 gebaut wurde (`derive/submissionsreife.ts`, ROADMAP 207) |
| (c) FEHLT | Ein **Baugesuch-Blattsatz** als eigenes Artefakt (Situationsplan + Grundrisse/Schnitte/Ansichten 1:100 + Baubeschrieb in EINEM benannten Set) existiert nicht — KosmoPublish kennt Einzelblätter, aber keinen kuratierten „Baugesuch“-Bausatz; kein Kernel-Devis/Kostenvoranschlag-Entity (nur `derive/mengen.ts`/`derive/ausmass.ts`, NPK-nah, keine eBKP-Kostenzuordnung je Bauteil); keine Einreichungs-Simulation |
| (d) Artefakt | Baugesuch-Set (Pläne + Beschrieb + Berechnungsliste als Nachweis der Ausnützung) |
| (e) 🔒 | **Die eigentliche Behörden-Einreichung ist der grösste 🔒-Punkt der ganzen Kette** — kein Kosmo-Pfad ersetzt das Bauamt, die Bewilligung selbst, Einsprachefristen, Nachbarrecht. Das Konzept simuliert nur das **Zusammenstellen** des Sets, nie die Bewilligung; das muss im Testlauf-Bericht unübersehbar stehen |

### Phase 41 — Ausschreibung/Submission

| # | Inhalt |
|---|---|
| (a) | Ausschreibungspläne/Devis erstellen, Angebote einholen, Unternehmerplan-Rücklauf prüfen und einpflegen, Vergabeantrag |
| (b) HEUTE | **Block C vollständig** (C1–C6, ROADMAP 206–212, 220): `derive/submissionsreife.ts` (Lückenliste „undefiniert = Nachtragsrisiko“, SIA 118 Art. 86–89), DXF-Export/Import-Roundtrip (`dxf/export.ts`/`dxf/import.ts`), Diff-Engine `derive/planabgleich.ts`, Unternehmerplan-Laufzeitschicht + Referenz-Overlay + Stufe-1/Stufe-2-Diff-Karten über `runCommand`, PDF-Assistenz-Ehrlichkeitspfad (`unternehmerplan-pdf.ts`, C5) — komplett in `e2e/sim-submission.spec.ts` (Baustein 19 `submissionsreifePruefen`) bewiesen |
| (c) FEHLT | **Devisierung selbst** (eBKP-Gliederung/NPK-Positionstexte/Leistungsverzeichnis) ist NICHT gebaut und laut `SUBMISSION-KONZEPT.md` §5.1 bewusst offen — NPK/ONLV sind CRB-lizenzpflichtig, ein echtes Devis-Modul ist Owner-Entscheid, kein Batch; für den Testlauf bedeutet das: der Kostenvoranschlag bleibt eine externe Owner-Annahme (Abschnitt 1), keine Kosmo-Ableitung |
| (d) Artefakt | DXF-Ausschreibungsplansatz + Submissionsreife-Bericht (Lückenliste-leer-Beweis) + Import-Bericht nach Unternehmerrücklauf |
| (e) 🔒 | Reale Unternehmer-Offerten, echte Devis-Preise, echter Vergabeentscheid — alles simuliert über die deterministische DXF-Mutations-Fixture (`+50 mm`-Muster aus C6), nie echte Fremdfirmen |

### Phase 51–52 — Ausführungsprojekt/Werkplanung/Ausführung

| # | Inhalt |
|---|---|
| (a) | Werkpläne 1:50 + Details 1:20…1:5, Bauleitung vor Ort, Rapportwesen, Terminplan, Bauablauf, Regie-/Nachtragsverfolgung |
| (b) HEUTE | `BauPhase.werkplan` (1:50, Rohmass/Fertigmass-Trennung, Material-Sinnbilder — `docs/PLAN-DETAILLIERUNG.md` Z. 60ff.); der Übernahme-/Diff-Karten-Mechanismus aus Block C funktioniert unverändert auf Werkplan-Niveau; Stützenraster/Column/Beam-Bauteile real im Modell (ROADMAP 112) |
| (c) FEHLT | **Vollständig neues Terrain**: kein Terminplan/Bauablaufplan-Derive, kein Rapport-/Tagesbericht-Entity, keine Nachtrags-/Regie-Verfolgung über die reine Submissionsreife-Lückenliste hinaus, kein Baustellen-Foto-/Zustandsdokumentations-Pfad. Grösster inhaltlicher Neubau-Bedarf der ganzen Kette |
| (d) Artefakt | Werkplansatz 1:50 + Detailpläne + (neu, falls gebaut) ein einfacher Bauablaufplan als Balkendiagramm aus Gewerke-/Mengenreihenfolge |
| (e) 🔒 | **Bauleitung vor Ort ist zu 100 % 🔒** — Baufortschritt, Qualität am Bau, Handwerker-Koordination sind physische Realität, kein Software-Ersatz; KosmoOrbit kann höchstens die **Dokumentation** (Pläne, Soll/Ist-Abgleich per Unternehmerplan-Diff) unterstützen, nie die Bauleitung selbst simulieren — das muss im Bericht als härteste Grenze stehen |

### Abschluss — Gebäudeabnahme

| # | Inhalt |
|---|---|
| (a) | Schlussbegehung, Mängelliste, Abnahmeprotokoll, Garantiefristen, Schlussabrechnung, Übergabe an Bauherrschaft |
| (b) HEUTE | **Nichts** — kein Entity/Command im Kernel für Mängel, Abnahmeprotokoll oder Garantiefristen (Grep über `packages/kosmo-kernel/src` auf „Mangel/Mängel/Abnahmeprotokoll/Bauleitung“: 0 Treffer) |
| (c) FEHLT | Alles: `Mangel`-Entity (Ort/Beschrieb/Frist/Status), `design.mangelErfassen`/`mangelBehoben`, ein Abnahmeprotokoll-Bericht (analog `studienBerichtSvg`/Submissionsreife-Bericht: Kopf, Mängelliste, Termine, Unterschriftenfeld) |
| (d) Artefakt | Abnahmeprotokoll (SVG/PDF, neues Artefakt — kein bestehendes Muster zum 1:1-Kopieren, aber dieselbe Machart wie D5/C1) |
| (e) 🔒 | Die Abnahme selbst (Bauherr + Architekt + Unternehmer vor Ort) ist ein Realakt — Kosmo kann das Protokoll **vorbereiten und führen**, nie **abnehmen** |

---

## 3. Gemeinsamer Ablauf (Owner + Kosmo)

Je Phase **eine Sitzung**, nicht ein Marathon — das deckt sich mit dem
Owner-Muster aus dem Wettbewerbs-/Submissions-Konzept („Kosmo bereitet vor
und stellt dar, die Entscheidung bleibt beim Architekten“). Ablauf je
Sitzung:

1. **Owner öffnet/entscheidet**: Projekt laden (Vault-Eintrag oder aktives
   Projekt), Phase ansehen, gegebenenfalls Parameter anpassen (Budgetannahme,
   Wohnungstyp-Mix, Materialentscheid).
2. **Kosmo automatisiert**: die in Abschnitt 2(b) gelistete Kette läuft über
   Kosmo-Tools bzw. Commands — Diff-Karten für alles, was das Modell
   verändert, atomare Undo-Gruppen (bestehender `runCommand`-Weg).
3. **Owner bestätigt/verwirft** die Diff-Karten (Stufe 1) bzw. entscheidet an
   den Markierungs-Karten (Stufe 2) — nie stilles Einpflegen (Konzept-Regel
   aus `SUBMISSION-KONZEPT.md` §5.3, gilt für alle Phasen gleichermassen).
4. **Ergebnis wandert ins Archiv**: der bestehende **Varianten-Archiv**-
   Mechanismus (`apps/kosmo-orbit/src/state/variant-archive.ts`, ROADMAP 72 —
   Snapshot + Kennzahlen + Plan-Thumbnail, unveränderlich) friert den
   Phasenstand ein, BEVOR die nächste Phase weiterbaut — das macht den
   Testlauf rückverfolgbar (Wettbewerbs-Stand ≠ Vorprojekt-Stand ≠ …), ohne
   ein neues Speichermodell zu erfinden.
5. **Phasen-Artefakte** (Berichte/Blattsätze/Exporte) gehen in die
   **Publikations-Sets** von KosmoPublish (bestehende Sheet-Entity,
   `model/entities.ts` Z. 356) bzw. als eigenständige Exportdateien wie
   `grundlagenstudie.svg`/DXF-Plansatz — je nachdem, ob ein natives Blatt
   sinnvoll ist oder ein additives Export-Artefakt reicht (Konzept-Muster aus
   D-E8).
6. **Wissenskorpus-Bezug**: was Kosmo an LLM-Interpretation liefert (Baustil,
   Tragwerks-Einordnung, Ortsanalyse), landet mit Quellen-Chip aus
   `wissen/vault/…` — nie als Zahl in einer Ableitung.

**Was der Owner vorbereiten muss:**
- Die Budget-/Kostenannahme aus Abschnitt 1 gegenlesen und ggf. korrigieren
  (das ist eine reine Owner-Setzung, keine Norm-Ableitung).
- Vor Phase 33 entscheiden, ob ein reales Baugesuch-Layout (Gemeinde
  Zürich-Altstetten, Formularvorgaben) als Vorlage dienen soll, oder ob das
  Set generisch bleibt.
- Vor Phase 51–52 entscheiden, wie tief der Bauablaufplan gehen soll (grobe
  Gewerke-Reihenfolge reicht für den Testlauf; ein echtes Terminplan-Tool ist
  ein eigenes, grösseres Vorhaben, kein Wochenend-Batch).
- Für die Abnahme: mindestens 3–5 plausible Mängel-Fixtures (Ort, Schwere,
  Gewerk) vorgeben, damit das Abnahmeprotokoll-Artefakt etwas zu zeigen hat.

---

## 4. Technisches Rückgrat — Serie-H-Sim-Infrastruktur als Unterbau

Der Testlauf muss **reproduzierbar** sein, nicht nur einmalig vorgeführt.
Dafür trägt exakt die Infrastruktur, die Block D/C schon benutzt:
`e2e/sim/szenarien.ts` (das `mfh`-Szenario, Abschnitt 1) + `e2e/sim/
bausteine.ts` — append-only seit H2 eingefroren (Kommentar Z. 15–17: „ab H2
nur noch append-only — neue Bausteine werden nur ANGEHÄNGT, bestehende nie
geändert“), aktuell 20 nummerierte Bausteine (`projektStarten` … `Baustein 20
grundlagenStudieAusfuehren`).

**Je Phase ein eigener `sim-vollprojekt-phaseN.spec.ts`**, der die
bestehenden Bausteine 1–20 wiederverwendet und nur die fehlenden Schritte neu
anhängt (Baustein 21+, append-only):

| Phase | Spec | Wiederverwendet | Neu (append-only) |
|---|---|---|---|
| 31 | `sim-vollprojekt-phase1.spec.ts` | 1–4, 20 (`sim-wettbewerb`-Muster 1:1) | keine — Block D deckt das bereits ab |
| 32 | `sim-vollprojekt-phase2.spec.ts` | 1–4, 7 (`tragwerkAusRaster`), 11/12 (Checks/Berechnungsliste) | `vorprojektUebernehmen` (Studienvariante → Doc, bereits Mechanismus 2.7 im Wettbewerbs-Konzept — nur als Baustein benannt) |
| 33 | `sim-vollprojekt-phase3.spec.ts` | 3 (`phaseSchalten('bauprojekt')`), 19 (`submissionsreifePruefen` als Vorstufen-Check) | `baugesuchSetErzeugen` (kuratiertes Blatt-Bündel), `kostenschaetzungLesen` (liest die Owner-Budgetannahme, keine Ableitung) |
| 41 | `sim-vollprojekt-phase4.spec.ts` | 19, `unternehmerplanImportieren`/`diffKartenPruefen`/`diffKarteAnwenden` (aus C6, bereits vorhanden, nicht in `bausteine.ts` selbst nummeriert — liegt in `e2e/unternehmerplan.spec.ts`-Helfern) | — falls die C6-Helfer noch nicht in `bausteine.ts` zentral liegen: **Nachtrag, sie append-only zu spiegeln** (Baustein 21/22) |
| 51–52 | `sim-vollprojekt-phase5.spec.ts` | 3 (`phaseSchalten('werkplan')`), 8 (`fassade`), 16/17 (Blatt/Export) | `bauablaufPlanen` (neue Ableitung + Baustein), `rapportErfassen` (falls Rapport-Entity gebaut wird) |
| Abnahme | `sim-vollprojekt-phase6.spec.ts` | 16/17 | `mangelErfassen`, `abnahmeprotokollPruefen` |

**Lücken-Batches priorisiert (v0.6.3), mit Aufwand S/M/L:**

1. **[S] Phasen-Modell schärfen**: `BauPhase` um die reale Lücke aus 2(b)
   klären — entweder ein zusätzliches, rein UI-seitiges „aktuelle
   SIA-Teilphase“-Flag (Wettbewerb/Vorprojekt/Bauprojekt/Bewilligung/
   Ausschreibung/Ausführung/Abnahme), getrennt vom bestehenden
   `phase: BauPhase` (das weiterhin nur den **Plan-Detaillierungsgrad**
   steuert) — kein Kernel-Bruch, additive Erweiterung von `DocSettings`.
2. **[M] Baugesuch-Blattsatz** (Phase 33): ein kuratiertes Set aus
   bestehenden Blatt-Typen (`plan`/`section`/`storey`, KosmoPublish) +
   Berechnungsliste als Ausnützungsnachweis, mit einem neuen
   „Baugesuch“-Knopf, der die passenden Blätter automatisch zusammenstellt
   (Muster: D5s SVG-Bericht-Ansatz, aber auf bestehende Sheet-Entities
   gemappt statt ein neues Artefakt).
3. **[M] Kostenvoranschlag-Grobschätzung**: EIN neuer, ehrlich als
   „Richtwert, kein Devis“ markierter Kernel-Wert (CHF/m² NGF ×
   `agfFactor`-Ergebnis, konfigurierbar wie `agfFactor` selbst) — bewusst
   NICHT das CRB-lizenzpflichtige NPK/Devis-Modul, das laut
   `SUBMISSION-KONZEPT.md` §5.1 Owner-Entscheid bleibt.
4. **[L] Bauablaufplan/Terminplan-Grundgerüst** (Phase 51–52): neue reine
   Ableitung, die aus Gewerke-Reihenfolge (Rohbau→Ausbau→Fassade, aus
   vorhandenen Bauteil-Kategorien ableitbar) und grober Mengen-Basis
   (`derive/mengen.ts`) einen einfachen Balken-Terminplan erzeugt — **kein**
   Ersatz für echte Bauleitungssoftware, ausdrücklich Richtwert.
5. **[M] Mängel-/Abnahme-Entity + Abnahmeprotokoll-Bericht**: `Mangel`-Entity
   (Ort als Bauteil-Referenz, Beschrieb, Gewerk, Frist, Status offen/behoben),
   zwei Commands (`design.mangelErfassen`/`design.mangelBehoben`, automatisch
   Kosmo-Tools), ein Bericht analog `studienBerichtSvg`/Submissionsreife
   (Kopf, Mängelliste nach Gewerk, Unterschriftenfeld, „Anstoss zur
   Schlussbegehung, kein rechtsgültiges Protokoll“ als Ehrlichkeitszeile).
6. **[S] `sim-vollprojekt-phaseN.spec.ts`-Serie**: sechs neue Specs auf dem
   eingefrorenen Baustein-Harness, jede baut auf der vorigen Phase auf (echte
   Kette, kein isolierter Einzeltest) — versiegelt den ganzen Testlauf als
   wiederholbaren Beweis, analog zu `sim-wettbewerb`/`sim-submission`.
7. **[S] C6-Helfer in `bausteine.ts` spiegeln**: `unternehmerplanImportieren`/
   `diffKartenPruefen`/`diffKarteAnwenden` leben heute direkt in
   `e2e/unternehmerplan.spec.ts` bzw. `sim-submission.spec.ts` — für Phase 4
   der Vollprojekt-Kette lohnt sich ein append-only-Spiegel in `bausteine.ts`
   selbst, damit `sim-vollprojekt-phase4` sie importieren kann, ohne
   Spec-zu-Spec-Kopplung.

Reihenfolge: 1 zuerst (Fundament für alle Sitzungen), 2/3 parallelisierbar
(Sonnet-Worktrees), 4/5 nacheinander (5 baut auf dem Mängel-Vokabular aus 4
für „Nachtrag wegen Ausführungsmangel“ nicht zwingend, aber sinnvoll näher
dran), 6/7 am Schluss (versiegeln, was 1–5 gebaut haben). Modellgebrauch nach
`docs/KI-MODELL-GUIDELINE.md`: Batch 1 und jede Architektur-Erweiterung
zentral (Opus), 2–5 als abgegrenzte Sonnet-Worktrees gegen eine
Fable/Opus-Spec, 6/7 Sonnet + Opus-Gate (volle Suiten, wie bei jedem Batch in
Block C/D).

---

## 5. Erfolgskriterien

Der Vollentwurf «steht», wenn:

1. **Vollständige Blattsätze je Phase** existieren und sich öffnen lassen:
   Grundlagenstudie-Bericht (31), Vorprojektpläne 1:200 (32), Baugesuch-Set
   1:100 (33), Ausschreibungs-DXF + Submissionsreife-Bericht (41),
   Werkplansatz 1:50 + Bauablaufplan (51–52), Abnahmeprotokoll (Abschluss) —
   sechs benannte, downloadbare Artefakte am selben Testprojekt.
2. **Kennzahlen-Konsistenz über die Phasen**: HNF/NGF/aGF-Ziel und die
   Programm-Erfüllung bleiben nachvollziehbar von der Extremvariante bis zum
   Werkplan (keine stillen Sprünge — jede Änderung über eine bestätigte
   Diff-Karte, jederzeit im Varianten-Archiv rückverfolgbar).
3. **Undo-Sauberkeit**: jede Phasenübernahme (Studie→Vorprojekt,
   Vorprojekt→Bauprojekt, Unternehmerplan-Karten, Mängel-Erfassung) bleibt
   eine atomare, vollständig invertierbare Undo-Gruppe — Golden-Tests und
   bestehende Suiten (Kernel/App/E2E) bleiben grün und byte-identisch, wo
   keine neuen Daten aktiv sind.
4. **Ehrliche 🔒-Bilanz**: der Abschlussbericht des Testlaufs zählt explizit,
   wie viele Phasen-Schritte vollautomatisch/mit Bestätigung/gar nicht
   abgedeckt sind (analog zur „n von m Abweichungen“-Quote aus
   Submissions-/Wettbewerbs-Konzept) — mit besonderem Gewicht auf den drei
   härtesten 🔒-Punkten: Behörden-Einreichung (33), Bauleitung vor Ort
   (51–52), reale Abnahme (Abschluss). Kein Punkt wird als „✅ erledigt“
   geführt, der in Wirklichkeit ein Realakt ausserhalb der Software bleibt.
5. **Reproduzierbarkeit**: die sechs `sim-vollprojekt-phaseN.spec.ts`-Läufe
   sind im Container ohne Bridge grün, laufen auf demselben MFH-Fixture wie
   dieses Konzept es festlegt, und lassen sich beliebig wiederholen — der
   Owner kann den Testlauf jederzeit neu ansehen, ohne dass Kosmo etwas
   „nachträglich schöner macht“.
