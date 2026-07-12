# KosmoOrbit v0.7.5 — Vorschlag & Design-Ausblick

*Stand nach dem v0.7.4-Release «Einlösen & Feinschliff» (12.07.2026). Dieser Vorschlag ist meine
Empfehlung für die nächste Runde — Teil A sind die offenen Funktionspunkte (priorisiert), Teil B
ein Design-Ausblick für eine neue ClaudeDesign-/Kosmodesign-Runde. Alle Punkte sind gegen die
ehrliche Vertagungsliste (neuigkeiten.ts, ROADMAP 330/331, SIM-BEFUNDE, die Gestaltungs-Spez)
belegt — kein Wunschdenken.*

---

## Ausgangslage

v0.7.4 hat **genau die in 0.7.3 namentlich vertagten Punkte eingelöst**: SIA-Hochzahl im PDF,
D1-Dash-Kadenz + Projektions-Ton, Boden-Dock-Orb, D3-Live-Plan-Nachbarn, Companion-Auffindbarkeit,
Pan-Grenze, Takeover-Trigger, Beschlag-Katalog S1. Diese sind **nicht mehr offen**. Was bleibt, ist
unten sortiert nach Hebel und Aufwand.

---

## Teil A — Funktionspunkte für 0.7.5 (priorisiert)

### Empfohlener Kern (das würde ich bauen)

**A1 · Beschlag-Katalog Stufe 2** — der grösste funktionale Brocken.
0.7.4 lieferte nur die *Datengrundlage* (`derive/beschlag.ts`: 12 Typen, Plan-Symbol, IFC-Mapping).
S2 macht daraus ein echtes Feature: eine **Beschlag-Entity**, ein **Command** (`design.beschlagSetzen`
ausbauen: Typ am Bauteil setzen), **Inspector-UI** zum Zuweisen, und das **Export-Wiring**
(IFC-`IFCDISCRETEACCESSORY` + DXF-Layer). Baut direkt auf S1 auf, klar abgegrenzt, golden-diszipliniert.
→ *Belege: neuigkeiten.ts (0.7.4-Eintrag), ROADMAP 331 «W3 · P10».*

**A2 · Projekt-/Auftrags-Stammdatenmodell + Persistenz-Vereinheitlichung** — der strukturell
wichtigste Punkt. Heute gibt es **kein echtes Projekt-/Auftraggeber-Modell** (`auftragsbuch.ts` ist
nur das Dev-Workorder-Buch; ein Signal-Stub existiert), und die Persistenz ist gemischt (localStorage
neben Yjs; einzelne Panels führen ihren Zustand lokal statt über den zentralen UI-Store — der
«H-43»-Cluster in SIM-BEFUNDE). Ein sauberes Stammdatenmodell (Projekt, Bauherr, Adresse, Phasen,
Fristen) entblockt den Plankopf, die Companion-Karten und den Sync.
→ *Belege: BEWEGUNGSKONZEPT-066 (Auftragsmodell-Lücke), SIM-BEFUNDE (H-43).*

### Kleine Print-Fixes (billig, ehrlich versprochen)

**A3 · Lato 400 im PDF-Export einbetten.** Heute nur Lato 900 im PDF-Pfad; die Plankopf-Regular-
Nebenzeile fällt auf einen Sans-Ersatz zurück. Fix: `lato-400-latin-pdf.ttf` subsetten (~26 KB) und
in `export-plan.ts`/`export-sheets.ts` registrieren. Ein halber Tag, schliesst die letzte 0.7.4-Lücke.
→ *Beleg: public/fonts/pdf/README.md, ROADMAP 331 «Ehrlich offen».*

**A4 · DXF-Typografie.** Der DXF-Export trägt weiterhin die CAD-Standardschrift (keine Web-Fonts) —
die «Zwei-Stimmen»-Typografie erreicht den DXF-Weg nicht. Optional; ehrlich benannt seit 0.7.3.
→ *Beleg: neuigkeiten.ts (0.7.3), docs/INTEROP.md.*

### Stretch (wenn Puffer bleibt)

**A5 · Arbeitsmodi hub-weit ausrollen.** Der adaptive Modus-Kern (`arbeitsmodi-kern.ts`) ist
vorbereitet, aber bisher nur auf der Design-Station scharf. Ausrollen auf die übrigen Stationen
(andere haben zu wenige rang-fähige Plätze — das braucht Design, s. Teil B).

**A6 · Vis-Kür-Reste.** Node-Palette mit Kategorien, Minimap, Kanten-Routing — als «Stufe 2» seit
0.6.x dokumentiert, nie voll abgearbeitet.
→ *Beleg: UI-KONZEPT-065 §6.*

### Owner-/OS-gebunden (ehrlich: nicht im Container erledigbar)

**A7 · OAuth-Abo-Härtetest** gegen einen echten Anthropic-Schlüssel (bisher nur gegen Fake bewiesen;
das Abnahme-Drehbuch existiert). **A8 · Tauri-Desktop-Rundgang** (Zusammenspiel Haupt-/Charakter-
Fenster, Schliess-Choreografie) — braucht ein echtes OS, nicht den Container. Beides bleibt
Owner-Abnahme.

---

## Teil B — Design-Ausblick «Kosmodesign 0.7.5»

Was, wenn die nächste Runde wieder eine ClaudeDesign-Handoff-Serie mit neuen Soll-Bildern wäre?
Das etablierte Fundament steht und gilt weiter: **80·15·5** (Ruhe/Linie/Signal), **«Papier ist
Papier»** (Plangrafik theme-invariant), **«Zwei Stimmen»** (Titel Lato, Messbares IBM Plex Mono),
**KIcon 1.75px**, **Rollenfarben**, **Kosmo-Orb-Zustände**. Diese Prinzipien sind *gesetzt*, aber für
mehrere Bereiche gibt es **noch keine eigene Soll-Bild-Serie** — genau dort lohnt die nächste Runde:

**D-Serie 0.7.5 (empfohlene erste Welle — grösster sichtbarer Hebel):**

- **3D-Viewport-Chrome.** Der 3D-Raum «erbt heute nur die Stimmung» (Papier-Himmel, Linienkanten),
  hat aber keine ausformulierte Chrome-Sprache. Zu gestalten: Achsenkreuz, Kamera-HUD, Phasen-/
  Modus-Badge — konsequent in 80·15·5, damit der Viewport zur restlichen Oberfläche gehört.
- **Vis-Kuratierfläche.** Funktional gebaut, aber ohne eigene Gestaltung: Kartenraster,
  Vergleichsmodus, Leerzustände, Node-Palette mit Kategorien-Ikonografie.

**Zweite Welle (danach):**

- **Companion (Zweitgerät).** Bisher nur «minimal» spezifiziert (Phasen-Ring, Job-/Freigabe-Karten,
  4er-Dock). Verdient eine eigene, ruhige visuelle Sprache fürs Tablet/Handy neben dem Hauptgerät.
- **Datenstationen** (KosmoData / Referenz-Dossier / Wissen). Facetten, Dossier-Gruppierung und die
  Tusche-Piktogramme sind pragmatisch, nicht durchkomponiert — eine eigene Runde wie seinerzeit für
  Plan/Shell.
- **Onboarding / Erststart.** Der «Kosmo als Bauzeichnung im Messrahmen»-Auftritt ist als Prinzip da,
  aber nicht auf den Erststart angewandt — hier entsteht der erste Eindruck.
- **Report-Druck-Layouts.** Die fünf Report-Blätter (Bauablauf, Abnahmeprotokoll, Ausnützungsnachweis,
  Studienbericht, KV) haben nur Notlösungen erfahren (inkl. einer bekannten Text-Overlap-Warnung in
  `abnahmeprotokoll.svg`). Eine eigene Blatt-Typo-/Layout-Guideline würde sie auf das Niveau der
  Plan/Schnitt-Blätter heben.

---

## Meine Empfehlung in einem Satz

**0.7.5 = A1 (Beschlag S2) + A2 (Stammdatenmodell) als Kern, A3 (Lato-400) als billiger Abschluss der
0.7.4-Lücke — und parallel eine kleine ClaudeDesign-Runde D für Viewport-Chrome + Vis-Kuratierfläche.**
Das ist ein runder «Substanz + Sichtbarkeit»-Mix: ein echtes Feature, ein struktureller Unterbau, ein
ehrlich versprochener Fix, plus zwei Design-Bereiche mit dem grössten sichtbaren Hebel.
