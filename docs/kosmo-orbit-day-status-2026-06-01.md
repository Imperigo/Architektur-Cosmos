# KosmoOrbit Tagesstatus 2026-06-01

Status: Arbeitstag fuer die erste nutzbare KosmoOrbit-Steuerzentrale.

## Aktueller Stand am Start

- Branch: `main`
- Remote-Stand: `main` war am Start mit `origin/main` synchron.
- Arbeitsbaum: sauber vor dem KosmoOrbit-Batch.
- Letzte gesicherte Basis: Goldstandard-Live-Smoke dokumentiert; lokaler
  Node-22-Buildpfad fuer KosmoOrbit war stabilisiert.
- `/orbit` existiert als statische review-only Preview.
- Orbit Full Review war vor diesem Batch gruen.
- TypeScript und Lint waren kontrollierbar; Lint-Warnings bleiben bekannte
  Bestandswarnungen, keine Errors.

## Tagesziel

KosmoOrbit soll heute nicht breiter, sondern klarer werden: als installierte
Hauptsoftware-Zentrale, die Projektpakete, Rollen, Tools, Review-Gates und den
sicheren KosmoDesign-Handoff sichtbar macht.

Wichtig fuer die Kommunikation:

- KosmoOrbit ist nicht KosmoWebsite.
- KosmoOrbit ist noch kein CAD.
- KosmoOrbit ist die Software-Zentrale, ueber die Kosmo spaeter lokale Tools,
  Menschen, Rechte, Jobs, Handoffs, Updates und Review-Gates steuert.

## Umgesetzter Produktschritt

- Rollenvarianten erhalten jetzt je Rolle eine Produkt-Erklaerung:
  Zweck, Oberflaechentiefe, Entscheidungsradius und naechster sicherer Schritt.
- `/orbit` zeigt einen 3-Minuten-Demo-Pfad:
  Projektpaket pruefen, KosmoDesign Review Mode oeffnen, Blocker menschlich
  entscheiden.
- Sichtbare Module sind fachlich erklaert, nicht nur als technische IDs.
- KosmoDesign bleibt sichtbar als Hauptpfad, aber nur im Review Mode.
- Design-Generation, Public-Publish, externe Netzwerke, Uploads und echte
  User-Schreibaktionen bleiben gesperrt.
- Smoke-Checks pruefen neu, dass Rollen-Erklaerungen, Demo-Pfad und
  KosmoDesign Review Mode sichtbar bleiben.

## Morgen-Fortsetzung

- `/orbit` hat jetzt eine lokale Rollenumschaltung als echte Browser-Preview.
- Die Umschaltung zeigt je Rolle Zweck, Oberflaechentiefe,
  Entscheidungsradius, naechsten sicheren Schritt, Rechte-Preview und
  sichtbare UI-Bereiche.
- Die Preview bleibt bewusst harmlos: keine Userdaten, keine Accounts, keine
  echte Rechteverwaltung und keine Design-Generierung.
- Der Route-Smoke prueft neu auch die Rollenumschaltung und ihren lokalen
  Sicherheitscharakter.
- Zusaetzlich gibt es jetzt einen gefuehrten Demo-Review-Pfad:
  Projektleitung klaert Blocker, Entwurf prueft KosmoDesign im Review Mode,
  Admin haelt Freigabe- und Public-Gates geschlossen.
- Eine Projektpaket-Tagesansicht fasst Artefakte, Reviewlast, Gates,
  Modellprofil, Module mit Reviewbedarf und die naechste sichere Aktion
  zusammen.
- Der autonome 5h-Block hat einen Presenter-Modus ergaenzt: eine
  3-Minuten-Erklaerung fuer Architekten mit den Argumenten besser, schneller
  und guenstiger.
- Die neuen Panels wurden fuer kleine Viewports robuster gemacht:
  stabilere Chips, bessere Umbrueche und weniger Risiko fuer ueberlaufende
  Gate-/Rollenbegriffe.
- Ein Demo-Fragen-Block beantwortet die wichtigsten Chef-/Buero-Fragen direkt
  in `/orbit` und verweist jede Antwort auf sichtbare Panels.
- `docs/kosmo-orbit-demo-briefing-2026-06-01.md` haelt die 3-Minuten-Demo,
  Kernsaetze und bewusste Nicht-Behauptungen fest.
- Ein Review Decision Draft zeigt eine lokale `needs_more_evidence`-Empfehlung
  mit Evidenz-Refs und Write Guard, ohne Decision Record zu schreiben.
- Eine MVP-Grenze unterscheidet sichtbar zwischen heute gebauter Preview,
  MVP-Vertrag und spaeterer KosmoZentrale-Runtime.
- Ein Pruefevidenz-Panel zeigt Full Review, Route-Smoke, Reviewlast und Open
  Mode direkt in `/orbit`, damit die Demo ihre lokale Qualitaet belegen kann.
- Eine Arbeitsstations-Prioritaet zeigt, welche Panels Chef/Admin,
  Projektleitung, Entwurf, Zeichnung und Ausbildung zuerst sehen sollten.
- Eine Fortschrittskarte erklaert die Vision-zu-MVP-Spuren: sichtbare
  Preview, Rollen/Arbeitsstationen, KosmoDesign-Handoff, spaetere
  KosmoZentrale-Runtime und gesperrte CAD-/Plan-Generation.
- Der Autonomie-Status spricht nun korrekt von KosmoOrbit statt KosmoWebsite.
- Ein neuer Static-Export-Smoke prueft nach `build:fresh`, ob die gebaute
  `/orbit` HTML-Datei die wichtigsten Demo-Panels und Anker enthaelt.
- Ein Demo-Bereitschafts-Panel verbindet Full Review, Route-Smoke und
  Static-Smoke und formuliert die Grenze: menschlich vorfuehrbar, aber kein
  Push, kein Livegang, keine Generierung und keine Writes ohne Freigabe.
- Ein neuer `kosmo:orbit-demo-audit` prueft den gebauten `/orbit`-Export auf
  Vorfuehrreihenfolge, Navigation, sichtbare Freigabelinie und offensichtliche
  Render-Artefakte.
- Ein lokaler Browser-Smoke bestaetigt, dass der statische `/orbit`-Export
  im In-App-Browser laedt und Rollenumschaltung plus Demo-Schritt klickbar
  sind.
- Eine Rechte-Matrix zeigt je Rolle Design-Review, Design-Generation,
  lokale Freigabe, Public Gate und Read-only-Status.
- Ein Responsive-Audit prueft `/orbit` auf Source-Level gegen typische
  mobile Layout-Risiken.
- Ein 390px-Mobile-Smoke bestaetigt: kein horizontaler Overflow, keine zu
  kleinen sichtbaren Buttons/Links und klickbare Demo-Interaktionen.
- Ein lesender Notion-Vision-Check bestaetigt KosmoZentrale, KosmoDesign,
  Prepare/Draw/Viz/Publish, Blender/AR/Render/Plan/Layout und KosmoData als
  grosse Pipeline und ordnet KosmoOrbit als Steuerzentrale ein.
- Eine sichtbare Vision Bridge auf `/orbit` uebersetzt diese Pipeline in
  KosmoZentrale, Prepare, Design, Draw/Viz/Publish und Data/Asset, ohne die
  gesperrten Runtime-/Write-/Generatorgrenzen aufzuweichen.
- Ein Runtime-Vertrag auf `/orbit` formuliert die spaetere lokale
  Steuerungsschicht fuer Health, lokale KI, Tool Launch, Jobs und Reparatur,
  bleibt aber heute strikt no-process-launch/no-memory-write.
- Ein Installationsbild auf `/orbit` zeigt Architektur Kosmos als lokales
  Buero-System: KosmoZentrale, Arbeitsstationen, lokales Wissen,
  Architektur-Tools, menschliche Freigabe und spaetere externe Zusammenarbeit.
  Heute bleibt es eine statische Landkarte ohne Hardware-, Auth-, Prozess-,
  Upload- oder Netzwerksteuerung.
- Eine Health-Readiness-Schicht auf `/orbit` beschreibt die spaeteren
  Read-only-Signale fuer Hardware/GPU, lokale Modelle, Speicher/Backup,
  Tool-Connectoren, Job Queue und Logs/Reparatur. Heute startet sie keine
  Modelle, scannt kein Dateisystem und fuehrt keine Hardware- oder Queue-
  Aktionen aus. Die Quelle ist jetzt ein lokaler JSON-Vertrag mit eigenem
  Smoke-Check.
- Ein Risiko-Register auf `/orbit` zeigt die wichtigsten menschlichen
  Freigabegates: lokale Runtime, Design-Generation, Quellen/Rechte,
  Rollen/Profile, Buero-Daten und externe Zusammenarbeit.
- Ein Command-Vertrag trennt sichere Review-Kommandos wie Projektpaket,
  KosmoDesign Review Mode und lokale QA von blockierten Runtime-Kommandos wie
  Blender-Start, Design-Generation, Decision Record, Publishing, Reparatur und
  externem Sync.
- Ein Audit-Trail-Vertrag macht sichtbar, wie spaetere Kommandos mit Rolle,
  Intent, Evidenz, Gate, Outcome und Schreibverhalten protokolliert werden
  sollen. Heute bleibt das statisch und nicht-schreibend.
- Eine KosmoDesign Handoff Console zeigt den Uebergang von KosmoOrbit zu
  KosmoDesign konkreter: Open Mode, Rolle, Modellprofil, Blocker, erlaubte
  Review-Aktionen, Kontextinputs, Guardrails und naechste Schritte. `Generate
  Design` bleibt sichtbar blockiert.
- Ein Buero-Routine-Vertrag zeigt den spaeteren lokalen Tagesrhythmus:
  Morgenstart, Projektfokus, KosmoDesign Review Session, Lernmodus,
  Abendabschluss und Not-Stopp. Heute bleibt das ein statischer Vertrag ohne
  Modellstart, Tool-Launch, Userdaten-Writes, Uploads, externen Sync, Push
  oder Kosten.
- Ein Ausbildungsmodus macht Praktikant, Lehrling und Schnupperstift als
  sichere Lernprofile sichtbar: Schulstoff/Buero-Standards, gefuehrte
  Projektbeobachtung und Review statt Aktion, ohne Accounts, Noten,
  Schulplattformen, Projekt-Writes, Design-Generation oder Public-Publish.
- Ein Workflow-Delta vergleicht heutigen verstreuten Bueroablauf mit der
  KosmoOrbit-Zielarbeitsweise: weniger Suchzeit, fruehere Fehlerbremse,
  weniger Ueberforderung und mehr Wiederholbarkeit, ohne unbewiesene ROI-
  oder Prozentersparnis zu behaupten.
- Das Demo-Briefing ist auf den neuen Stand gebracht und fuehrt jetzt durch
  Workflow-Delta, Buero-Routine, KosmoDesign Handoff Console,
  Ausbildungsmodus, Runtime-/Command-/Audit-/Risiko-Vertraege und
  Demo-Bereitschaft.
- Eine Pilotmessung zeigt, wie ein Architekturburo den Nutzen real pruefen
  kann: Suchzeit, Blocker-Frueherkennung, Rollenpassung und Wiederholbarkeit,
  ohne Kundendaten, Uploads, Kostenjobs oder automatische Plan-/Design-
  Generierung.
- Ein Pilot-Runbook ist jetzt direkt in `/orbit` sichtbar: 45-60 Minuten
  Ausgangslage messen, Zentrale lesen, Projektpaket pruefen, Rollenrunde
  testen und Pilotentscheidung treffen, weiterhin ohne Live-Risiko.
- Ein Office Pilot Plan dokumentiert den naechsten 45- bis 60-Minuten-Test:
  kleines reales oder anonymisiertes Projektpaket, Rollen, Ablauf,
  Messpunkte, Chef-Fragen, Sicherheitslinie und Erfolgskriterium.
- Die MVP-Roadmap ist mit dem aktuellen `/orbit`-Preview-Stand synchronisiert:
  sichtbare Panels, Produktlinie, lokale Nachweise und naechster Buero-Pilot.
- Ein Push Package dokumentiert lokale Commits, Inhalt, Nachweise,
  Security-Blocker, Sicherheitsgrenzen und Push-Optionen. Es wurde kein Push
  und kein Deploy ausgefuehrt.
- Ein sichtbares Live-Gate auf `/orbit` trennt interne Demo-Bereitschaft von
  oeffentlichem Publish: Owner-Go, Security Review und Live-Smoke bleiben
  Pflicht vor Push/Deploy.
- Der fruehere Publish-Blocker wurde neu geprueft: `security:check` passed,
  `npm audit --omit=dev` meldet 0 Vulnerabilities und
  `brain:doctor-fast` ist 12/12 gruen.
- Der In-App-Browser-Smoke wurde nach Pilot-Runbook und Live-Gate erneuert:
  Desktop 1440 x 900 und Mobile 390 x 844 ohne horizontalen Overflow, beide
  neuen Panels sichtbar, keine Klickziele unter 32 px.
- Ein Pilot-Session-Vertrag ist angelegt: Schema, lokales Demo-Template,
  Checkskript und Report. Alle Messwerte bleiben `null`, bis ein echter
  menschlicher Buero-Pilot durchgefuehrt wird.
- Das Pilot-Session-Template ist direkt in `/orbit` sichtbar: Session-Status,
  Sicherheitsflags, Messpunkte und leere before/after-Werte sind lesbar.
- Ein Chef-Demo-Skript fasst die nicht-technische 5-Minuten-Erklaerung
  zusammen und ist im Office Pilot Plan als Arbeitsartefakt verlinkt.
- System-Knowledge und Source-of-Truth sind nachgezogen, damit KosmoOrbit in
  der Gesamtlandkarte als Hauptsoftware/Steuerzentrale und nicht als
  Website-Feature gelesen wird.
- Ein neuer KosmoData-HUD-Guard schuetzt die wiederkehrenden Website-Bedienpunkte:
  Database oben links, Suche/Dev rechts, Filterzugang rechts unten, HTML-
  Database-Overlay, globales Fadenkreuz in Start/Hauptmenue/Popups und
  Mobile-Datenbankzugang.
- Der KosmoData Pilot-Quality-Audit prueft die ersten Datenbankpiloten nun
  schaerfer auf Text-Review-Pack, Quellen, Modell-/Layer-Vertrag,
  2D-Planpipeline, Viewer-Faehigkeit und Netzwerkrelationen.

## Qualitaetsgrenzen

- Keine Aenderung an `wrangler.jsonc`.
- Keine API-Routes, Server Actions oder Middleware.
- Keine Cloud-Ressourcen, Uploads, Secrets oder Kosten.
- Kein Push ohne explizites Push-/Live-/Deploy-Go.

## Aktuelle Verifikation

- `npm run kosmo:orbit-audit-trail` — 11/11 passed.
- `npm run kosmo:orbit-office-routine` — 10/10 passed.
- `npm run kosmo:orbit-route-smoke` — 149/149 passed.
- `npm run kosmo:orbit-full-review` — 21/21 passed.
- `npm run kosmo:orbit-pilot-session` — 17/17 passed.
- `npm run kosmo:orbit-demo-audit` — 33/33 passed.
- `npm run kosmo:orbit-responsive-audit` — 27/27 passed.
- `npm run kosmo:orbit-static-smoke` — 47/47 passed.
- `npx tsc --noEmit --pretty false --incremental false` — passed.
- `npm run lint` — passed mit bekannten Bestandswarnungen, keine Errors.
- `npm run build` mit Node 22 — passed.
- In-App-Browser-Smoke Desktop/Mobile — passed.
- `npm run security:check` — passed.
- `npm run brain:doctor-fast` — 12/12 passed.

## Naechster sinnvoller Schritt

Nach den lokalen Checks ist der naechste Produktschritt entweder ein expliziter
Push/Live-Go mit anschliessendem Live-Smoke oder ein weiterer lokaler
UI-Polish-Batch.
