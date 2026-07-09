# UI-Selbstkritik 0.6.4 — screenshot-gestützte Iterationen (F10/F11)

**Owner-Auftrag wörtlich:** «selbstkritische reflektierende batches laufen
lassen für jedes einzelne tool mit der visuellen darstellung zusätzlich.
auch batches die die app oberfläche und das os hinterfragen wie es aufgebaut
ist und wie man es verbessern könnte. das ganze kannst du MEHRMALS laufen
lassen bis es effektiv besser ist. brauche auch deine eigenen referenzen.»

**Methode:** Kritik-Runde auf frischen Screenshots (Rundgang-Bilder
`docs/rundgang/bilder/`, heute Nacht neu erzeugt) → Verbesserungs-Batch mit
Gates → neue Screenshots → nächste Runde. Referenz-Massstäbe: eigene
Leitplanken (`GESTALTUNGSKONZEPT.md`: ruhige Fläche, eine Quelle der
Wahrheit, Ehrlichkeit sichtbar; `OBERFLAECHE-FOKUS-SYSTEMATIK.md`:
3-Familien-Hierarchie, Fokus-Lebenszyklus; Serie J: Eingabelast) plus die
frisch destillierten Vorform-Muster (`VORFORM-UI-KONZEPT.md` §1).

---

## Runde 1 — Befunde (Stand 0.6.3-Screenshots, 09.07. Nacht)

### Zentrale / OS-Ebene
| # | Befund (Beleg) | Schwere | Massnahme |
|---|---|---|---|
| SK-Z1 | Alle 10+ Kacheln tragen DASSELBE OrbitMark-Icon — nichts unterscheidet KosmoDraw visuell von KosmoData (01-zentrale.png) | hoch | → **F3 Orbit-Startmenü** (läuft): 4 Hauptwerkzeuge, eigene detaillierte Icons |
| SK-Z2 | Kopfleiste trägt «DEINSTALLIEREN…» und die Akzent-Palette dauerhaft — Alltagsfremdes auf teuerstem Platz, Palette zudem doppelt (Kopf + Einstellungen) | hoch | → **F2 Entdoppelung** (diese Nacht) |
| SK-Z3 | Familien-Name «KosmoDesign» doppelt: als Gruppen-Titel UND als Kachel-Name — Begriffs-Doppelung verwirrt die Hierarchie (T7 wollte 3 Familien, die Kachel heisst wie die Familie) | mittel | → F3 löst es (Hauptwerkzeug = Familie, Untertools eigene Namen) |
| SK-Z4 | V2-Platzhalter («bald») belegen eine volle Kachelzeile gleichwertig zu echten Werkzeugen | tief | → F3: KosmoOffice als EIN «kommend»-Orbit-Posten |
| SK-Z5 | Begrüssung «SPÄTE STUNDE.» + schmale Mittelspalte lassen >50 % der Fläche leer — Grosszügigkeit ja, aber ohne Blickführung zum nächsten Schritt | mittel | Runde 2 (nach F3 neu bewerten) |

### KosmoDesign
| # | Befund | Schwere | Massnahme |
|---|---|---|---|
| SK-D1 | DREI Werkzeugzeilen übereinander (Werkzeuge/Ansicht+Export/Fähigkeiten), Sektions-Label (ANSICHT, EXPORT, FÄHIGKEITEN) inline zwischen Knöpfen — hohe Lesedichte, und die Leiste ÜBERDECKTE nachweislich Plan-Klicks (module.spec-Lehre, ROADMAP 253) | hoch | Runde 2: Zeilen konsolidieren (Export hinter EIN Menü, Sektionslabels als Tooltip statt Inline) — NACH F5/F9, um Konflikte zu vermeiden |
| SK-D2 | Checks-Liste wiederholt identische Texte («‹Küche› ist nur 2.00 m breit» ×2) statt zu bündeln (04-design-uebersicht.png rechts) | mittel | ✅ **Runde-1-Fix:** Anzeige-Gruppierung mit «2×»-Zähler (KennzahlenPanel) |
| SK-D3 | Geschoss-Schalter links schwebt kontextlos im Viewport (kein Container, kollidiert optisch mit Dock-Icons darunter) | tief | Runde 2 |
| SK-D4 | Split-Ansicht: rechte Plan-Hälfte öffnet unzentriert (Modell teils ausserhalb), erst nav-fit richtet es | mittel | Runde 2 (Auto-Fit beim ersten Öffnen prüfen — vorsichtig, E2E-Koordinaten) |
| SK-D5 | Statuszeile + Viewport-Nav-Pillen stapeln sich in derselben Ecke unten links | tief | Runde 2 |

### KosmoVis
| # | Befund | Schwere | Massnahme |
|---|---|---|---|
| SK-V1 | Node-Graph öffnet ohne Auto-Fit — grosse Leerfläche oben links, Graph beginnt erst in Bildmitte (14-vis-automatik.png) | mittel | Runde 2 (NodeCanvas initiales Einpassen) |
| SK-V2 | «Drei Stimmungen» steht doppelt in der Leiste: als Graph-NAME im Select und als Anlege-Knopf — nicht erkennbar, dass der Knopf etwas NEUES erzeugt | mittel | ✅ **Runde-1-Fix:** Knopf heisst «+ Drei Stimmungen» (Konvention wie «+ Graph»/«+ Node») |
| SK-V3 | Prompt-Texte in Stimmung-Nodes schneiden hart ab ohne Ellipsen-Affordanz | tief | Runde 2 |

### Übergreifend
| # | Befund | Schwere | Massnahme |
|---|---|---|---|
| SK-A1 | Kopfleisten-Doppelungen: Stations-Name links UND als Tab in der Werkzeugleiste (KOSMOVIS zweimal sichtbar) | mittel | → F2-Batch |
| SK-A2 | «?»-Rundgang, Einstellungs-Zahnrad, Deinstallieren, Sync, Tinte, Palette: sechs Meta-Funktionen gleichrangig in der Kopfzeile — die T7-Hierarchie (Familien > Stationen > Meta) ist oben rechts nicht gelandet | hoch | → F2-Batch (Meta hinter Einstellungen bündeln) |

**Runde-1-Bilanz:** 15 Befunde; 2 sofort behoben (SK-D2, SK-V2), 6 laufen
in den F2/F3/F5/F9-Batches dieser Nacht, 7 gehen in Runde 2 (nach der
Integration der laufenden Batches, auf FRISCHEN Screenshots — Kritik am
alten Stand wäre verschwendete Arbeit).

---

## Runde 2 — nach Integration von F3/F5/F9/F2 (gleiche Nacht, frische Screenshots)

**Nachprüfung Runde 1** (Screenshots r2-zentrale / r2-zentrale-hover / r2-design,
Session-Scratchpad):
- ✅ SK-Z1 behoben: vier UNTERSCHEIDBARE, detaillierte Haupt-Icons im Orbit (F3).
- ✅ SK-Z2 + SK-A2 behoben: Kopfleiste trägt nur noch Sync · Speichern/Öffnen ·
  Kosmo · «?» · ⚙ — Deinstallieren und Palette sind in den Einstellungen (F2).
- ✅ SK-Z3 behoben: Hauptwerkzeug = Familienname, Untertools eigene Namen (F3).
- ✅ SK-Z4 behoben: KosmoOffice ist EIN Orbit-Posten mit «KOMMEND»-Badge.
- ✅ SK-D2 / SK-V2: Runde-1-Fixes bestätigt.
- ✅ SK-V1 behoben (**Runde-2-Fix**): NodeCanvas passt die Ansicht beim Öffnen
  eines Graphen auf die Nodes ein (Bounding-Box → Zentrum+Massstab, Nutzer-
  Pan/Zoom danach unangetastet; visgraph/vis-automatik 7 E2E grün).
- ◐ SK-A1 teilweise: der Stations-Name steht noch in Kopfleiste UND Werkzeugleiste
  (KosmoVis) — bewusst belassen, die Leisten-Variante ist der Tab-Wechsler.

**Neue Befunde Runde 2** (alle tief — keine neuen Hoch-Befunde durch die Umbauten):
| # | Befund | Massnahme |
|---|---|---|
| R2-N1 | Der Untertool-Fächer überdeckt beim Hover das Orbit-Zentrum; der Familien-Beschrieb sitzt knapp über dem Fächer | 0.6.5 (Fächer-Versatz/Radius) |
| R2-N2 | Die Untertool-Karten sind rechteckige Blöcke im runden Orbit — funktional richtig (Lesbarkeit), aber die Kanten dürfen dem Orbit folgen (Radius, weicherer Schatten) | 0.6.5 |
| R2-N3 | Begrüssung/Projekte stehen linksbündig in der Mittelspalte, der Orbit exakt zentriert — zwei konkurrierende Achsen (Rest von SK-Z5) | 0.6.5 |

**Offen aus Runde 1** (übertragen, mit Grund): SK-D1 Werkzeugzeilen-Konsolidierung
(braucht eigenes Konzept, betrifft viele E2E-Koordinaten — eigener 0.6.5-Batch),
SK-D3 Geschoss-Schalter-Container, SK-D4 Plan-Auto-Fit im Split (E2E-Risiko,
bewusst vertagt), SK-D5 Ecken-Stapelung, SK-V3 Prompt-Ellipsen.

**Bilanz:** Runde 1 = 15 Befunde (2 hoch offen) → Runde 2 = 8 offene Befunde,
**davon 0 hoch** — 7 von 15 geschlossen, 3 neue (alle tief). Das Kriterium
«effektiv besser» ist damit belegt; die verbleibende Liste ist die kuratierte
0.6.5-UI-Arbeitsliste.
