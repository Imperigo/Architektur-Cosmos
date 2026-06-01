# KosmoOrbit MVP Roadmap

Stand: 2026-06-01
Status: erster konkreter Bauplan fuer die Hauptsoftware.

## 1. Ziel des MVP

KosmoOrbit MVP 0.1 soll beweisen, dass Architektur Kosmos als lokale
Hauptsoftware funktioniert: KosmoOrbit zeigt Projekte, Rollen, Tools,
Review-Gates und lokale Handoffs an einem Ort und fuehrt Menschen kontrolliert
durch die wichtigsten Schritte.

Der MVP ist noch keine fertige Buero-Appliance und kein vollstaendiges CAD. Er
ist der erste sichtbare Kern der Steuerzentrale.

## 2. Produktkern

KosmoOrbit MVP 0.1 muss vier Dinge sauber zeigen:

1. **Tool-Zentrale**  
   KosmoOrbit kennt die Untertools KosmoData, KosmoAsset, KosmoDesign,
   KosmoPrepare, KosmoDraw, KosmoViz, KosmoPublish und KosmoZentrale.

2. **Projektpaket-Zentrale**  
   KosmoOrbit liest ein lokales `kosmo.project.json` und zeigt, welche
   Bereiche vorhanden, reviewpflichtig, blockiert oder bereit sind.

3. **Rollen-Zentrale**  
   KosmoOrbit kann mindestens zwischen Admin, Projektleitung, Entwurf,
   Zeichnung und Ausbildung unterscheiden und daraus Rechte sowie
   Oberflaechentiefe ableiten.

4. **Review-Zentrale**  
   KosmoOrbit zeigt, was Kosmo automatisch pruefen darf und wo menschliche
   Freigabe noetig bleibt: Quellen, Rechte, Modellqualitaet, Public-Gates,
   Export und Publish.

## 3. MVP-Ansichten

### Start / Orbit Home

Zweck: schnelle Orientierung fuer das Buero.

Inhalte:

- aktives Projekt
- angemeldete Rolle
- Status der Untertools
- offene Freigaben
- letzte Kosmo-Diagnose
- naechster sinnvoller Schritt

### Tool Hub

Zweck: alle Untertools sichtbar und rollenbasiert oeffnen.

V1-Tools:

- KosmoData: Referenzen, Quellen, Projektwissen
- KosmoAsset: Assets, Materialien, Rechte, lokale Review-Evidenz
- KosmoDesign: architektonische Hauptwerkbank
- KosmoPrepare: Briefing, Standort, Programm, Constraints
- KosmoDraw: Plan, Schnitt, Ansicht, Vektor-Export
- KosmoViz: Kamera, Licht, Material, Rendering
- KosmoPublish: Review-Pack, Abgabe, Bericht, Export
- KosmoZentrale: Jobs, Memory, Approvals, lokale KI und Hardware

### Project Package Inspector

Zweck: das lokale Projektpaket fuer Menschen lesbar machen.

Zeigt:

- `brief/`: Projektbrief, Constraints, offene Fragen
- `data/`: Quellen, Referenzen, Rechte, Assets
- `design/`: Modellstatus, Kontext, Varianten, IFC/DXF-Gates
- `draw/`: Plaene, Schnitte, Exporte
- `viz/`: Kameras, Render-Presets, Previews
- `publish/`: Review-Pack, Exportmanifest, Change Log
- `memory/`: Entscheidungen, Jobs, Unsicherheiten

### Role Preview

Zweck: frueh beweisen, dass die gleiche Software je nach Person anders wirkt.

MVP-Rollen:

- Admin: sieht alle Tools, Diagnosen, Rechte, Kosten, Public-Gates
- Projektleitung: sieht Projektstatus, Freigaben, offene Fragen, Abgabe
- Entwurf: sieht KosmoDesign, Varianten, Referenzen, Modell/Viz
- Zeichnung: sieht Draw, Layer, Detailstatus, Export-Handoffs
- Ausbildung: sieht Lernmodus, Erklaerungen, sichere Uebungen

## 4. Erste Rechte- und Gate-Logik

KosmoOrbit muss V1 nicht als echtes Auth-System bauen, aber das Datenmodell
muss die spaetere Auth-Logik vorbereiten.

Empfohlene Statusbegriffe:

- `ready`: technisch bereit
- `needs_review`: menschliche Pruefung noetig
- `blocked`: darf nicht weiterverwendet oder publiziert werden
- `local_only`: lokal erlaubt, nicht public-safe
- `approved_local`: fuer lokale Arbeit freigegeben
- `approved_public`: public-safe freigegeben
- `unknown`: Status fehlt

Empfohlene Gate-Typen:

- `source_gate`: Quellen und Herkunft
- `rights_gate`: Rechte, Lizenz, Public-Safe
- `human_review_gate`: architektonische menschliche Pruefung
- `model_quality_gate`: Geometrie, Layer, Massstab, Semantik
- `publish_gate`: externe Publikation, Upload, Website, Shop
- `cost_gate`: bezahlte Dienste, Cloud-Kosten, GPU-Jobs
- `security_gate`: Secrets, private Daten, externe Accounts

## 5. Datenmodell V1

KosmoOrbit braucht spaeter eigene lokale Daten. Fuer den ersten MVP reicht ein
kleiner lesbarer Vertrag:

```json
{
  "orbit_version": "0.1",
  "workspace": {
    "name": "Demo Buero",
    "mode": "local_dev"
  },
  "current_user": {
    "name": "Kosmo Owner",
    "role": "admin"
  },
  "tools": [
    {
      "id": "kosmo-design",
      "name": "KosmoDesign",
      "status": "planned",
      "primary_roles": ["admin", "project_lead", "design_architect"]
    }
  ],
  "projects": [
    {
      "id": "kosmo-demo-001",
      "package_path": "examples/kosmo-projects/kosmo-demo-001/kosmo.project.json",
      "status": "needs_review"
    }
  ],
  "gates": [
    {
      "id": "demo-human-review",
      "type": "human_review_gate",
      "status": "needs_review"
    }
  ]
}
```

Das ist noch kein Backend. Es ist ein lokaler, statischer Entwicklungsanker,
der spaeter in KosmoZentrale oder eine lokale Orbit-Datenbank wachsen kann.

## 6. Umsetzung in diesem Repo

Dieses Repo ist public/deployment-nah und bleibt static export. Deshalb:

- keine API-Routes
- keine Server Actions
- keine Middleware
- keine Live-D1-/R2-Schreibpfade
- keine externen Accounts oder Kosten
- keine Aenderungen an `wrangler.jsonc`

Sichere erste Umsetzung:

1. `schema/kosmo-orbit-workspace.schema.json` (**initial umgesetzt**)
2. `examples/kosmo-orbit/workspace.demo.json` (**initial umgesetzt**)
3. lokaler Check `npm run kosmo:orbit-check` (**initial umgesetzt**)
4. `examples/kosmo-orbit/role-state.demo.json` als lokaler UI-State-Vertrag
   fuer rollenbasierte Shells (**initial umgesetzt**)
5. lokaler Check `npm run kosmo:orbit-role-state-check`
   (**initial umgesetzt**)
6. lokaler Handoff `npm run kosmo:orbit-role-state-handoff`
   (**initial umgesetzt**)
7. lokaler App-Route-Vertrag `npm run kosmo:orbit-app-route-spec`
   (**initial umgesetzt**)
8. kleine statische Orbit-Ansicht oder Report, der Rollen, Tools und Gates zeigt
   (**initial umgesetzt unter `/orbit`**)
9. spaeter Handoff an KosmoZentrale fuer echte lokale Runtime

## 7. Zusammenarbeit mit anderen Workern

KosmoOrbit ist Produktmitte, aber nicht alleiniger Facharbeiter.

- KosmoWebsite baut public UI, Atlas, Marketing-/Demo-Oberflaechen.
- KosmoZentrale baut lokale Jobs, Approvals, Hardware, Agent Router und Memory.
- KosmoDesign/KosmoDraw bauen die Blender-native Entwurfs- und Planwerkbank.
- KosmoPrepare baut Phase-0-Briefing, Standort, Wettbewerb und Kontext.
- KosmoViz baut Render, Kamera, Material und Bildvarianten.
- KosmoPublish baut Abgabe, Layout, PDF, Bericht und Export.
- KosmoData/KosmoAsset bauen Wissens- und Asset-Schichten.

KosmoOrbit definiert die gemeinsame Shell, Rollenlogik, Paketvertraege,
Gate-Sprache und Handoffs zwischen diesen Bereichen.

## 8. Naechster kleiner Entwicklungsschritt

Der naechste konkrete Schritt nach dem Workspace-Vertrag ist ein lesbarer
KosmoOrbit-Statusreport (**initial umgesetzt mit `npm run kosmo:orbit-status`**):

- Markdown- und JSON-Report aus `workspace.demo.json`.
- Ampeluebersicht fuer Tools, Rollen und Gates.
- klare Anzeige, dass Publish, Kosten und Security in der Demo blockiert oder
  reviewpflichtig bleiben.

Damit beginnt KosmoOrbit als echte Hauptsoftware zu werden, ohne sofort eine
grosse lokale Runtime oder eine riskante Cloud-Integration zu bauen.

## 9. Project Package Inspector

KosmoOrbit muss als Hauptsoftware echte Projektpakete lesen koennen. Initial
umgesetzt:

- `npm run kosmo:orbit-project-inspector`
- liest `examples/kosmo-projects/kosmo-demo-001/kosmo.project.json`
- schreibt `orbit/project-inspector.generated.json`
- schreibt `orbit/project-inspector.generated.md`

Der Inspector zeigt:

- Modulstatus fuer Prepare, Data, Orbit, Design, Draw, Viz, Publish und
  Zentrale;
- vorhandene und fehlende Paketordner;
- Inputs und Outputs mit Rechte-/Reviewstatus;
- Review-Gates fuer Public Release, External Upload, Client Delivery und
  Paid Cloud Job;
- konkrete Next Actions fuer KosmoOrbit, bevor ein KosmoDesign-Handoff oder
  eine Publish-/Cloud-Aktion erlaubt waere.

Diese Stufe ist weiterhin review-only und startet keine Tools.

## 10. KosmoDesign Handoff Preview

KosmoOrbit muss vor dem Oeffnen von KosmoDesign entscheiden, ob ein Projekt nur
als Kontext/Review geoeffnet werden darf oder ob Design-Generierung erlaubt
ist. Initial umgesetzt:

- `npm run kosmo:orbit-design-handoff`
- liest den Orbit-Workspace-Statusreport;
- liest den Project Package Inspector;
- liest `design/context-handoff.generated.json`;
- liest `design/model-profile.json`;
- schreibt `orbit/design-handoff-preview.generated.json`;
- schreibt `orbit/design-handoff-preview.generated.md`.

Die aktuelle Demo fuehrt bewusst zu `context_review_only`: Owner als Owner
Admin darf KosmoDesign grundsaetzlich nutzen, aber Design-Generierung bleibt
blockiert, weil Kontextinputs noch blockiert/undecided sind und viele
generierte Design-Artefakte menschliche Review benoetigen.

Das ist die richtige Orbit-Logik: KosmoOrbit oeffnet nicht blind ein
Design-Werkzeug, sondern zeigt zuerst Rolle, Open Mode, Blocker, Modellprofil,
Guardrails und erlaubte Aktionen.

## 11. KosmoDesign UI Panel Spec

KosmoOrbit braucht aus dem Handoff eine konkrete Panel-Spezifikation fuer die
spaetere Hauptsoftware-Oberflaeche. Initial umgesetzt:

- `npm run kosmo:orbit-design-ui-panel`
- liest `orbit/design-handoff-preview.generated.json`
- schreibt `orbit/design-handoff-ui-panel.generated.json`
- schreibt `orbit/design-handoff-ui-panel.generated.md`

Die Spezifikation definiert:

- Panel-State, Tone und Badges;
- Primary Action (`Open Review Mode` in der Demo);
- Secondary Actions fuer Project Inspector, Context Selection und Guardrails;
- deaktivierte Design-Generation mit sichtbarem Grund;
- Sections fuer Rolle, Blocker, Allowed Actions, Modellprofil, Context Inputs,
  Guardrails und Next Actions.

Damit ist der erste KosmoOrbit-UI-Baustein produktlogisch beschrieben, ohne
schon eine Frontend-Implementierung zu starten.

## 12. KosmoOrbit Full Review

Die ersten Orbit-Bausteine koennen als eine zusammenhaengende Review-Kette
laufen. Initial umgesetzt:

- `npm run kosmo:orbit-full-review`
- fuehrt Workspace Check aus;
- prueft den lokalen Role-State-Vertrag;
- erzeugt Workspace Status;
- erzeugt Project Package Inspector;
- erzeugt KosmoDesign Handoff Preview;
- erzeugt KosmoDesign UI Panel Spec;
- erzeugt den statischen KosmoDesign UI Prototype;
- prueft den statischen UI-Prototyp mit einem Smoke-Check;
- erzeugt Rollenvarianten fuer die KosmoDesign-Oberflaeche;
- prueft die Rollenvarianten mit einem Role-UI-Smoke;
- erzeugt einen statischen Role-Shell-Prototyp fuer die erste
  rollenbasierte KosmoOrbit-Oberflaeche;
- prueft den Role-Shell-Prototyp mit einem Role-Shell-Smoke;
- erzeugt einen Role-State-Handoff fuer die spaetere statische Orbit-App-Route;
- erzeugt eine App-Route-Spezifikation fuer die spaetere `/orbit`-Route;
- prueft die statische `/orbit`-Route mit einem Route-Smoke;
- schreibt `examples/kosmo-orbit/review/orbit-full-review.generated.json`;
- schreibt `examples/kosmo-orbit/review/orbit-full-review.generated.md`.

Der Full Review ist der erste echte KosmoOrbit-Steuerzentralen-Durchlauf:
Workspace -> Role-State-Check -> Status -> Projektpaket -> Design-Handoff ->
UI-Panel-Spec -> statischer UI-Prototyp -> UI-Smoke -> Rollenvarianten ->
Role-UI-Smoke -> Role-Shell-Prototyp -> Role-Shell-Smoke ->
Role-State-Handoff -> App-Route-Spec -> Route-Smoke.

Auch dieser Durchlauf bleibt strikt review-only: kein Blender-Start, keine
Geometrie-Generierung, keine Uploads, keine externen Accounts, keine Kosten und
keine Publikation.

## 13. Statische `/orbit` Preview

Die erste sichtbare KosmoOrbit-Hauptsoftware-Preview ist initial umgesetzt:

- Route: `/orbit`
- Render-Modus: `force-static`
- Datenmodus: lokale JSON-Artefakte aus dem Orbit-Review- und Demo-Projekt
- Sicherheitsmodus: review-only, keine API, keine Auth-Runtime, keine Uploads,
  keine externen Netzwerke, keine Generierung

Die Preview ist fachlich auf einen kurzen menschlichen Demo-Pfad getrimmt:

1. Projektpaket pruefen.
2. KosmoDesign Review Mode oeffnen.
3. Blocker menschlich entscheiden.

Sie zeigt die Tool-Zentrale, die aktive Rolle, Safety Policy, sichtbare
Module, blockierte Aktionen und eine rollenprofilierte Shell. Die Rollen sind
nicht nur technisch unterscheidbar, sondern erklaeren Zweck,
Oberflaechentiefe, Entscheidungsradius und naechsten sicheren Schritt.

Damit kann ein Architekt ohne Informatik-Kontext verstehen, warum KosmoOrbit
fuer Chef/Admin, Projektleitung, Entwurf, Zeichnung und Ausbildung anders
aussehen muss. Gleichzeitig bleibt die produktkritische Linie sauber:
KosmoDesign ist im MVP nur Review Mode; Entwurfs- oder Geometrie-Generierung
bleibt blockiert, bis Kontext- und Human-Review-Gates geschlossen sind.

### Rollenumschaltung Preview

Die `/orbit` Preview zeigt nun auch eine lokale Rollenumschaltung:

- Auswahl zwischen acht Buero-Rollen;
- pro Rolle sichtbarer Zweck, Oberflaechentiefe, Entscheidungsradius und
  naechster sicherer Schritt;
- Rechte-Preview fuer KosmoDesign Review, lokale Freigabe, Public Gate,
  Design-Generation und Read-only;
- sichtbare und versteckte UI-Bereiche pro Rolle;
- klare Aussage, dass diese Umschaltung keine Userdaten schreibt, keine
  Accounts erstellt und keine echten Berechtigungen freischaltet.

Damit wird der zentrale Produktgedanke greifbarer: KosmoOrbit ist dieselbe
Hauptsoftware, aber nicht dieselbe Oberflaeche fuer Chef, Projektleitung,
Entwurf, Zeichnung, Praktikum, Lehre und Demo-Nutzer.

### Gefuehrter Demo-Review-Pfad

Die `/orbit` Preview hat nun eine zweite interaktive Spur fuer den
3-Minuten-Demo-Pfad:

1. Projektleitung klaert Blocker.
2. Entwurf prueft Kontext im KosmoDesign Review Mode.
3. Admin haelt Freigabe- und Public-Gates geschlossen.

Diese Spur zeigt pro Schritt die passende Rolle, den Zweck, den naechsten
sicheren Schritt und den aktuell sichtbaren Sicherheitsanker. Sie ist bewusst
keine Simulation echter Rechteverwaltung. Der Pfad demonstriert nur die
Produktlogik: KosmoOrbit fuehrt durch Review, bevor KosmoDesign generieren,
publizieren oder externe Aktionen ausloesen duerfte.

### Projektpaket Tagesansicht

Die `/orbit` Preview zeigt nun eine kompakte Tagesansicht fuer das aktive
Projektpaket:

- Artefaktzahl und Reviewlast;
- Gate-Uebersicht fuer Public Release, External Upload, Client Delivery und
  Paid Cloud Job;
- Modellprofil mit Raeumen, Geschossen und Quellvertrauen;
- Module mit Reviewbedarf;
- naechste reviewpflichtige Artefakte;
- naechste sichere Aktion aus Design-Handoff und Project Inspector.

Diese Ansicht ist die erste Bruecke zwischen Projektpaket und Buero-Alltag:
Ein Projektleiter sieht auf einen Blick, warum ein Paket noch lokal bleibt,
welche Module zuerst geprueft werden und warum KosmoDesign weiter im Review
Mode bleiben muss.

### Presenter-Modus

Die `/orbit` Preview enthaelt nun eine kurze Presenter-Spur fuer Gespraeche
mit Architekten:

- Minute 0: KosmoOrbit als installierte Hauptsoftware-Zentrale erklaeren.
- Minute 1: Nutzen zeigen: Projektstatus, Reviewlast und Blocker an einem Ort.
- Minute 2: Sicherheitslogik zeigen: KosmoDesign bleibt im Review Mode, bis
  Kontext, Quellen und Gates sauber geprueft sind.

Der Block macht die Vision ohne Informatik-Sprache vorfuehrbar und verbindet
die Produktargumente:

- besser: rollen- und verantwortungsgerechte Oberflaechen;
- schneller: Projektblocker und naechste Aktion liegen an einem Ort;
- guenstiger: lokale Pruefung und Vorbereitung vor teuren Fehlern, Cloudjobs
  oder Abgaben.

## 14. Static KosmoDesign UI Prototype

Aus der Panel-Spezifikation kann KosmoOrbit einen ersten lokalen HTML-Prototyp
erzeugen. Initial umgesetzt:

- `npm run kosmo:orbit-design-ui-prototype`
- liest `orbit/design-handoff-ui-panel.generated.json`
- schreibt `orbit/design-handoff-ui-prototype.generated.html`
- schreibt `orbit/design-handoff-ui-prototype.generated.json`

Der Prototyp ist kein Public-Website-Feature und keine Next-Route. Er ist ein
lokales Artefakt im Projektpaket und zeigt:

- linken Orbit-Rail mit Projekt, Status, Badges, Aktionen und Rolle;
- rechtes Detailpanel mit Blockern, erlaubten Aktionen, Modellprofil,
  Context Inputs, Guardrails und Next Actions;
- `Open Review Mode` als erlaubte Primaeraktion;
- `Generate Design` sichtbar deaktiviert.

Damit wird die Hauptsoftware-Logik erstmals als konkrete Oberflaeche sichtbar,
ohne die statische Cloudflare-Website, Backend-Grenzen oder Runtime-Regeln zu
beruehren.

## 14. KosmoDesign UI Smoke

Der statische Prototyp wird automatisch auf sicherheitsrelevante UI-Zustaende
geprueft. Initial umgesetzt:

- `npm run kosmo:orbit-design-ui-smoke`
- liest `orbit/design-handoff-ui-prototype.generated.html`;
- liest `orbit/design-handoff-ui-prototype.generated.json`;
- schreibt `orbit/design-handoff-ui-smoke.generated.json`;
- schreibt `orbit/design-handoff-ui-smoke.generated.md`.

Der Smoke prueft u.a.:

- KosmoDesign-Titel sichtbar;
- `context_review_only` sichtbar;
- `Open Review Mode` sichtbar;
- `Generate Design` sichtbar, aber disabled;
- Blockiergrund sichtbar;
- kritischer Guardrail sichtbar;
- keine Script-Tags;
- keine externen Netzwerk-URLs.

Damit kann KosmoOrbit spaeter verhindern, dass eine UI-Aenderung versehentlich
die Sicherheitslogik aus der Oberflaeche entfernt.

## 15. Role UI Variants

KosmoOrbit muss dieselbe Hauptsoftware je nach Rolle unterschiedlich zeigen.
Initial umgesetzt:

- `npm run kosmo:orbit-role-variants`
- liest `examples/kosmo-orbit/workspace.demo.json`;
- liest `orbit/design-handoff-ui-panel.generated.json`;
- schreibt `orbit/role-ui-variants.generated.json`;
- schreibt `orbit/role-ui-variants.generated.md`.

Die Varianten unterscheiden u.a.:

- Chef / Owner Admin: Buero- und Gate-Kontrolle;
- IT-/KI-Spezialist: Infrastruktur, Runtime, Smoke Checks;
- Projektleiter Architekt: Entscheidungen, Review und Abgabe;
- Entwurfsarchitekt: Design-Kontext, Modell und Varianten;
- Zeichner EFZ: Modellqualitaet, Layer und technische Pruefung;
- Praktikant: gefuehrte Assistenz;
- Lehrling: Lernmodus;
- Schnupperstift: Demo-/Observer-Modus.

Design-Generierung bleibt in allen Rollen deaktiviert, bis Kontext- und
Human-Review-Gates freigegeben sind.

## 16. Role UI Smoke

Die Rollenvarianten werden automatisch gegen die wichtigsten Orbit-Regeln
geprueft. Initial umgesetzt:

- `npm run kosmo:orbit-role-smoke`
- liest `orbit/role-ui-variants.generated.json`;
- schreibt `orbit/role-ui-smoke.generated.json`;
- schreibt `orbit/role-ui-smoke.generated.md`.

Der Smoke prueft u.a.:

- alle acht Buero-Rollen sind vorhanden;
- keine Rolle darf Design-Generierung anfordern;
- Owner Admin darf Public-Gates freigeben;
- Entwurfsarchitekt darf Design Review oeffnen;
- Zeichner EFZ bleibt vom Design-Review-Oeffnen getrennt;
- Schnupperstift bleibt read-only;
- Praktikant, Lehrling und Schnupperstift behalten Lern-/Guidance-Support;
- jede Rollenoberflaeche zeigt sichtbare Sections und Warnungen.

Damit hat KosmoOrbit eine erste automatische Absicherung dafuer, dass
Rollenlogik, Lernmodus und Review-only-Grenzen nicht versehentlich aus der
Hauptsoftware-Shell verschwinden.

## 17. Role Shell Prototype

Aus den geprueften Rollenvarianten kann KosmoOrbit eine erste sichtbare
Hauptsoftware-Shell erzeugen. Initial umgesetzt:

- `npm run kosmo:orbit-role-shell-prototype`
- liest `orbit/role-ui-variants.generated.json`;
- liest `orbit/role-ui-smoke.generated.json`;
- liest `examples/kosmo-orbit/role-state.demo.json`;
- schreibt `orbit/role-shell-prototype.generated.html`;
- schreibt `orbit/role-shell-prototype.generated.json`.

Der Prototyp zeigt:

- eine linke Rollenleiste fuer alle acht Buero-Rollen;
- den geprueften Role State mit aktivem Projekt, aktiver Rolle und Preview-Rolle;
- sichtbare Module und blockierte Aktionen aus dem Role-State-Vertrag;
- pro Rolle Detailkarten mit Fokus, UI-Modus, Review-Rechten und Lernmodus;
- `Generate Design` sichtbar blockiert;
- Public-Gate-Rechte nur bei Owner Admin;
- Lern-/Observer-Zustaende fuer Praktikant, Lehrling und Schnupperstift;
- sichtbare Warnungen und Sections als Grundlage fuer die spaetere App.

Auch dieser Prototyp bleibt ein lokales statisches Artefakt im Projektpaket:
keine Next-Route, keine Auth-Runtime, keine User-Daten, keine externen
Netzwerkaufrufe, kein Blender-Start und keine Geometrie-Generierung.

## 18. Role Shell Smoke

Der rollenbasierte Shell-Prototyp wird automatisch geprueft, bevor er als
visuelle Vorlage fuer eine echte KosmoOrbit-App-Route dienen darf. Initial
umgesetzt:

- `npm run kosmo:orbit-role-shell-smoke`
- liest `orbit/role-shell-prototype.generated.html`;
- liest `orbit/role-shell-prototype.generated.json`;
- schreibt `orbit/role-shell-smoke.generated.json`;
- schreibt `orbit/role-shell-smoke.generated.md`.

Der Smoke prueft u.a.:

- alle acht Rollenlabels sind sichtbar;
- acht Rollenkarten und acht Rollenbuttons sind vorhanden;
- der Role State ist sichtbar;
- sichtbare Module und blockierte Aktionen sind sichtbar;
- `Generate Design` ist in allen Rollenkarten blockiert;
- statische Sicherheitskopie ist sichtbar;
- keine Script-Tags;
- keine externen Netzwerk-URLs;
- das Manifest bleibt generation-safe.

Damit ist auch der erste sichtbare rollenbasierte KosmoOrbit-Shell-Prototyp
automatisch gegen die wichtigsten Sicherheits- und Rollenregeln abgesichert.

## 19. Role State Contract

Bevor die statische Role Shell zu einer echten App-Route oder interaktiven
Oberflaeche wird, braucht KosmoOrbit einen klaren lokalen UI-State-Vertrag.
Initial umgesetzt:

- `schema/kosmo-orbit-role-state.schema.json`
- `examples/kosmo-orbit/role-state.demo.json`
- `npm run kosmo:orbit-role-state-check`
- schreibt `examples/kosmo-orbit/review/orbit-role-state-check.generated.json`;
- schreibt `examples/kosmo-orbit/review/orbit-role-state-check.generated.md`.

Der Vertrag beschreibt:

- aktive Person und aktive Rolle;
- ausgewaehlte Preview-Rolle fuer die Role Shell;
- aktives Projektpaket;
- sichtbare Module und warum sie sichtbar sind;
- blockierte Aktionen mit Gate-Bezug;
- lokale Review-only-Interaktionsregeln.

Wichtig: Der Role State ist noch kein Auth-System. Er schreibt keine Userdaten,
erlaubt keine externen Netzwerke, keine Design-Generierung und keine
Publikation. Er ist ein lokaler Datenvertrag, damit spaetere UI-Interaktion
kontrolliert und pruefbar bleibt.

Der Role-State-Check vergleicht den State mit dem Workspace und prueft zugleich,
ob Schema, Pflichtfelder, Safety-Policy, Rollenliste, sichtbare Module und
blockierte Aktionen als statischer Vertrag vollstaendig vorhanden sind.

## 20. Role State Handoff

Der Role-State-Handoff verbindet den geprueften Role State mit dem statischen
Role-Shell-Prototyp. Initial umgesetzt:

- `npm run kosmo:orbit-role-state-handoff`
- liest `examples/kosmo-orbit/role-state.demo.json`;
- liest Role-State-Check und Role-State-Smoke;
- liest `orbit/role-shell-prototype.generated.json`;
- liest `orbit/role-shell-smoke.generated.json`;
- schreibt `examples/kosmo-orbit/review/orbit-role-state-handoff.generated.json`;
- schreibt `examples/kosmo-orbit/review/orbit-role-state-handoff.generated.md`.

Der Handoff zeigt, welche Teile spaeter in eine lokale statische App-Route
uebergehen duerfen: aktive Rolle, Preview-Rolle, aktives Projektpaket,
sichtbare Module, blockierte Aktionen mit Gate-Gruenden, Role-Shell als
visuelle Referenz und Smoke-Gates als Pflicht vor echter Interaktion.

Auch dieser Handoff bleibt review-only: keine Auth-Runtime, keine User-Writes,
keine Netzwerke, keine Uploads, keine Publikation und keine Design-Generierung.

## 21. Orbit App Route Spec und `/orbit` Preview

Bevor KosmoOrbit als echte statische App-Route in diesem Next-Projekt sichtbar
wird, braucht die Route einen klaren Vertrag. Initial umgesetzt:

- `npm run kosmo:orbit-app-route-spec`
- `npm run kosmo:orbit-route-smoke`
- `app/orbit/page.tsx`
- liest `examples/kosmo-orbit/review/orbit-role-state-handoff.generated.json`;
- liest `examples/kosmo-orbit/role-state.demo.json`;
- liest `orbit/role-shell-prototype.generated.json`;
- schreibt `examples/kosmo-orbit/review/orbit-app-route-spec.generated.json`;
- schreibt `examples/kosmo-orbit/review/orbit-app-route-spec.generated.md`.

Die Spezifikation definiert:

- vorgeschlagene Route `/orbit`;
- spaetere Implementierungsdatei `app/orbit/page.tsx`;
- Static-Export-Modus ohne API, Server Actions, Middleware oder Backend;
- lokale statische Imports als einzige Datenquelle;
- keine Writes, Uploads, Public-Publish-Aktionen, Netzwerkaufrufe oder
  Design-Generierung;
- erlaubte Review-only-Interaktionen fuer Rollenwechsel, Modulwechsel,
  Detailansicht und Safe-Mode-Anzeige;
- deaktivierte Aktionen mit sichtbarem Grund.

Die erste `/orbit`-Preview setzt diesen Vertrag als statische Cockpit-Seite um:
aktive Rolle, Projektstatus, Safety Policy, sichtbare Module, blockierte
Aktionen und rollenbasierte Oberflaechenvarianten sind direkt sichtbar. Der
Route-Smoke prueft, dass keine Server-only-Muster, Netzwerkaufrufe, Cookies,
Headers oder Redirects in die Route gelangen.

Wichtig: Diese Route ist noch keine echte lokale Kosmo-Runtime und keine
Produktivnavigation. Sie ist der erste sichtbare Orbit-Cockpit-Prototyp im
statischen Repo, damit KosmoOrbit als Hauptsoftware-Shell geprueft werden kann,
ohne die Deployment-Grenzen des statischen Cloudflare-Exports zu verletzen.
