# KosmoOrbit Autonomer 5h-Plan 2026-06-01

Status: Arbeitsplan fuer den vollautomatischen KosmoOrbit-Block.

## Ziel

KosmoOrbit soll heute fuer eine reale Buero-Demo klarer werden: Ein Architekt
ohne Informatik-Kontext soll `/orbit` oeffnen koennen und in wenigen Minuten
verstehen, was die Hauptsoftware-Zentrale macht, warum Rollen verschieden
aussehen, warum KosmoDesign noch im Review Mode bleibt und welche sichere
naechste Aktion ansteht.

## Priorisierung

### P1: Vorfuehrbarkeit

- `/orbit` so ordnen, dass die Demo ruhig fuehrt: Projektstatus, Tagesansicht,
  gefuehrter Review-Pfad, Rollenumschaltung, Tool-/Gate-Details.
- Einen kurzen Demo-Skript-/Presenter-Block ergaenzen, der den Ablauf in
  3 Minuten erklaerbar macht.
- Keine Marketingseite bauen; die erste Ansicht bleibt das echte Tool.

### P2: Kleine Viewports und Lesbarkeit

- Karten, Buttons und lange Statusbegriffe so setzen, dass sie auf kleinen
  Breiten nicht brechen oder Inhalte ueberlagern.
- Fachtext verdichten, wo es der Demo hilft.
- Keine neuen grossen visuellen Effekte oder Layout-Experimente.

### P3: Review- und Smoke-Abdeckung

- Route-Smoke erweitert pruefen lassen, dass neue Demo- und Presenter-Elemente
  sichtbar bleiben.
- Orbit Full Review weiterhin gruen halten.
- Build/TypeScript/Lint nicht verschlechtern.

### P4: Produktdoku

- Tagesstatus, Roadmap und Produktvision mit den tatsaechlich gebauten
  Schritten synchron halten.
- Klar schreiben: KosmoOrbit ist Hauptsoftware-Zentrale, nicht Website und
  nicht CAD.

### P5: Lokales Speichern

- Sinnvolle lokale Commits bilden.
- Kein Push/Deploy ohne explizites Push-, Live- oder Deploy-Go.
- Keine API-Routes, keine Server Actions, kein `wrangler.jsonc`, keine
  externen Accounts, Uploads, Secrets oder Kosten.

## Empfohlene Reihenfolge

1. Presenter-/Demo-Skript fuer `/orbit`.
2. Layoutreihenfolge und mobile Lesbarkeit nachziehen.
3. Smoke-Check aktualisieren.
4. Doku aktualisieren.
5. Full Review, TypeScript, Lint, Build, UI-Audit.
6. Lokaler Commit.

## Erfolgskriterien

- `/orbit` bleibt statisch exportierbar.
- Ein Nicht-Informatiker kann die Demo in drei ruhigen Schritten verfolgen.
- Rollen, Tagesansicht und Review-Pfad bleiben sichtbar und smoke-geprueft.
- Alle lokalen Qualitaetschecks laufen gruen oder nur mit bekannten
  Bestandswarnings.
- Arbeit ist lokal gespeichert, aber nicht gepusht.
