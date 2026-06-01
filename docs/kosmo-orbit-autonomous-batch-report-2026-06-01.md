# KosmoOrbit Autonomer Batchreport 2026-06-01

Status: lokaler Zwischenbericht nach dem ersten autonomen KosmoOrbit-Batch.

## Ziel des Batches

`/orbit` sollte von einer technischen Preview zu einer vorfuehrbaren
KosmoOrbit-Steuerzentrale wachsen: Architekt:innen sollen ohne KI- oder
Informatik-Vorwissen verstehen, welche Rolle KosmoOrbit spielt, warum
KosmoDesign noch gesperrt bleibt, welche Evidenz vorliegt und welche
Arbeitsstation zuerst welches Panel braucht.

## Gebaute KosmoOrbit-Schritte

1. **Rollenumschaltung Preview**
   - acht Buero-Rollen direkt in `/orbit`;
   - je Rolle Zweck, Oberflaechentiefe, Entscheidungsradius, naechster sicherer
     Schritt, Rechte-Preview und sichtbare Bereiche;
   - keine echten Userdaten, Accounts oder Berechtigungen.

2. **Gefuehrter Demo-Review-Pfad**
   - Projektleitung klaert Blocker;
   - Entwurf prueft KosmoDesign im Review Mode;
   - Admin haelt Freigabe- und Public-Gates geschlossen.

3. **Projektpaket Tagesansicht**
   - Status, Risiko, Artefakte, Review-Artefakte und Design-Handoff werden als
     zusammenhaengende Tagesansicht lesbar.

4. **Presenter-Modus und Demo-Fragen**
   - 3-Minuten-Erklaerung fuer Architekturbueros;
   - Fragen/Antworten zu Nutzen, Grenzen und naechstem Schritt.

5. **Review Decision Draft**
   - lokaler `needs_more_evidence`-Entscheid;
   - Evidenz-Refs und Write Guard sichtbar;
   - kein Decision Record, keine Speicherung, keine Freigabe.

6. **MVP-/Runtime-Grenze**
   - heute sichtbare Preview;
   - MVP-Vertrag;
   - spaetere KosmoZentrale-Runtime.

7. **Pruefevidenz**
   - Full Review, Route-Smoke, Reviewlast und Open Mode direkt sichtbar.

8. **Arbeitsstations-Prioritaeten**
   - Chef/Admin, Projektleitung, Entwurf, Zeichnung und Ausbildung bekommen
     jeweils eine sinnvolle erste Panel-Prioritaet.

9. **Vision-zu-MVP-Fortschrittskarte**
   - zeigt bewusst keine absolute Gesamtprojekt-Prozentzahl;
   - trennt sichtbare Preview, Rollenlogik, KosmoDesign-Handoff, spaetere
     KosmoZentrale-Runtime und gesperrte CAD-/Plan-Generation;
   - macht fuer Architekt:innen klar, was heute vorfuehrbar ist und was noch
     menschliche, technische oder rechtliche Freigabe braucht.

10. **Autonomie-Status als KosmoOrbit**
    - korrigiert die Worker-Sprache weg von KosmoWebsite;
    - zeigt, dass dieser Worker lokal planen, pruefen und dokumentieren darf,
      aber keine Cloud-Kosten, Writes oder externen Aktionen ausloest.

11. **Demo-Bereitschaft**
    - verbindet Full Review, Route-Smoke und Static-Smoke;
    - markiert `/orbit` als menschlich vorfuehrbar;
    - haelt Push, Livegang, Generierung und Writes ohne Freigabe weiter
      blockiert.

12. **Statischer Demo-Audit**
    - prueft die gebaute `/orbit`-HTML auf Vorfuehrreihenfolge,
      vollstaendige Demo-Navigation, sichtbare Freigabelinie und offensichtliche
      Render-Artefakte;
    - bleibt bewusst browserlos und cloudfrei, damit der Autonomieblock nicht
      von externer UI-Automation abhaengt;
    - schreibt nur Review-Artefakte unter `examples/kosmo-orbit/review/`.

13. **Rechte-Matrix**
    - zeigt je Rolle Design Review, Design-Generation, lokale Freigabe,
      Public Gate und Read-only-Status;
    - macht die unterschiedliche UI-/Rechte-Tiefe direkt fuer
      Chef/Admin, Projektleitung, Entwurf, Zeichnung und Ausbildung lesbar;
    - haelt Design-Generation sichtbar blockiert.

14. **Browser-Smoke**
    - oeffnet den statischen Export unter `http://127.0.0.1:3001/orbit/`;
    - bestaetigt sichtbaren Haupttitel, Demo-Bereitschaft, Rechte-Matrix und
      Rollenumschaltung;
    - klickt `Entwurfsarchitekt` und den Demo-Schritt
      `02 Entwurf prueft Kontext`;
    - haelt das Ergebnis in `docs/kosmo-orbit-browser-smoke-2026-06-01.md`
      fest.

15. **Responsive-Audit**
    - prueft `/orbit`-Quellen auf min-width-Guards, flex-wrap,
      breakpoint-grids, stabile Progress-Bars und fehlende viewport-Fonttricks;
    - bleibt ein Source-Level-Guard und ersetzt keinen visuellen Browser-Smoke.

16. **Mobile-Smoke**
    - prueft `/orbit` im Viewport `390 x 844`;
    - bestaetigt: kein horizontaler Overflow, keine sichtbaren Buttons/Links
      unter 32 px, Kernpanels sichtbar;
    - klickt Rollenumschaltung und Demo-Schritt auch in schmaler Breite;
    - haelt das Ergebnis in `docs/kosmo-orbit-mobile-smoke-2026-06-01.md`
      fest.

17. **Notion-Vision-Check**
    - liest die Notion-Seiten `AI (2)` und `Architektur Workflow-Pipeline`;
    - bestaetigt KosmoZentrale, KosmoDesign, Prepare/Draw/Viz/Publish,
      Blender/AR/Render/Plan/Layout und KosmoData als grosse Vision;
    - ordnet KosmoOrbit sauber als Steuerzentrale statt Generator ein.

18. **Vision Bridge Auf `/orbit`**
    - macht die Notion-/Projektvision als sichtbares Panel in der Demo
      lesbar;
    - trennt KosmoZentrale, KosmoPrepare, KosmoDesign, KosmoDraw/Viz/Publish
      und KosmoData/KosmoAsset;
    - haelt Runtime, D1/R2-/Upload-Writes und Generatoraktionen weiter
      sichtbar gesperrt.

19. **KosmoData-HUD-Guard**
    - prueft Database, Suche, Dev, Filterzugang, mobile Datenbank und globale
      Fadenkreuz-Maus als eigene Regressionsschicht;
    - stellt sicher, dass Brain/Lenses nicht wieder als prominente KosmoData-
      HUD-Buttons auftauchen;
    - ist in `brain:doctor` eingebunden und bleibt rein diagnostisch.

20. **Runtime-Vertrag**
    - zeigt auf `/orbit`, welche spaetere lokale Steuerung KosmoOrbit einmal
      uebernehmen soll: Health, lokale KI, Tool Launch, Job Orchestration und
      Repair/Update;
    - markiert den heutigen Zustand weiterhin als nur lesend und blockierend;
    - haelt Prozessstarts, Modellstarts, Memory-Writes und Systemaenderungen
      bis zu einer echten Runtime-Freigabe gesperrt.

21. **Buero-Installation**
    - zeigt Architektur Kosmos als lokales Buero-System mit KosmoZentrale,
      KosmoOrbit-Arbeitsstationen, lokalem Wissen, Architektur-Tools,
      menschlicher Freigabe und spaeterer externer Zusammenarbeit;
    - macht die Produktform "lokale Appliance plus installierte Software"
      in `/orbit` greifbar;
    - haelt Hardware-Steuerung, Auth-Runtime, Upload-Writes, Prozessstarts
      und Netzwerksteuerung weiterhin gesperrt.

22. **Health Readiness**
    - beschreibt die spaeteren lokalen Read-only-Signale fuer Hardware/GPU,
      lokale Modelle, Speicher/Backup, Tool-Connectoren, Job Queue und
      Logs/Reparatur;
    - ist jetzt als lokaler JSON-Vertrag unter
      `examples/kosmo-orbit/health/health-readiness.contract.json` abgelegt;
    - hat mit `npm run kosmo:orbit-health-readiness` einen eigenen
      Contract-Smoke;
    - macht KosmoOrbit als Diagnose-Schicht der KosmoZentrale konkreter;
    - haelt Hardwarebefehle, Modellstarts, Dateisystem-Scans, Prozessstarts,
      Queue-Aktionen und Systemaenderungen weiter gesperrt.

23. **KosmoData Pilot-Quality-Audit**
    - prueft die ersten Datenbankpiloten schaerfer auf Text-Review-Pack,
      Quellen, Modell-/Layer-Vertrag, 2D-Planpipeline, Viewer-Faehigkeit und
      Netzwerkrelationen;
    - unterscheidet `ready`, `review` und `needs_work` zusaetzlich ueber
      kritische Review-Gates;
    - ist in `brain:doctor` eingebunden und bleibt rein diagnostisch.

24. **Risiko-Register**
    - macht lokale Runtime, Design-Generation, Quellen/Rechte,
      Rollen/Profile, Buero-Daten und externe Zusammenarbeit als menschliche
      Freigabegates sichtbar;
    - benennt je Risiko Schutzmassnahme, verantwortliche Rolle und naechstes
      Gate;
    - verhindert, dass die Demo wie eine bereits freigegebene Vollautomation
      wirkt.

25. **Command-Vertrag**
    - legt unter `examples/kosmo-orbit/commands/orbit-command.contract.json`
      fest, welche KosmoOrbit-Kommandos heute review-faehig, lokal pruefend
      oder blockiert sind;
    - trennt Projektpaket, KosmoDesign Review Mode und lokale QA von
      Blender-Start, Design-Generation, Writes, Publishing, Reparatur und
      externem Sync;
    - hat mit `npm run kosmo:orbit-command-contract` einen eigenen lokalen
      Smoke-Check.

26. **Audit-Trail-Vertrag**
    - legt unter `examples/kosmo-orbit/audit/orbit-audit-trail.contract.json`
      fest, wie spaetere KosmoOrbit-Kommandos als Intent, Rolle, Evidenz,
      Gate, Outcome und Schreibverhalten nachvollziehbar werden;
    - zeigt im `/orbit`-Panel representative review-enabled, local-check und
      blocked Events;
    - bleibt statisch, nicht-schreibend und ohne Persistenz, bis Datenschutz-,
      Retention- und Runtime-Regeln freigegeben sind.

27. **KosmoDesign Handoff Console**
    - macht den vorhandenen Design-Handoff-Spec als sichtbares `/orbit`-Panel
      lesbar;
    - zeigt Open Mode, Rolle, Modellprofil, Blocker, erlaubte Review-Aktionen,
      Kontextinputs, Guardrails und naechste Schritte;
    - haelt `Generate Design` sichtbar blockiert und bleibt ohne Blender-Start,
      Geometrie-Generierung, Upload oder Public-Publish.

28. **Buero-Routine-Vertrag**
    - legt als statischen Vertrag fest, wie KosmoOrbit spaeter Morgenstart,
      Projektfokus, KosmoDesign Review Session, Lernmodus, Abendabschluss und
      Not-Stopp fuehren soll;
    - zeigt auf `/orbit`, welche Signale pro Tagesphase gelesen werden duerfen
      und welche Outputs nur als Entwurf entstehen;
    - blockiert Modellstart, Blender-Launch, Geometrie, Userdaten-Writes,
      Uploads, externen Sync, Public-Publish, Push ohne Go und Kosten.

29. **Ausbildungsmodus**
    - macht Praktikant, Lehrling und Schnupperstift als eigene Lernprofile
      sichtbar;
    - zeigt Schulstoff/Buero-Standards, gefuehrte Projektbeobachtung und
      Review statt Aktion als sichere Lernspuren;
    - bleibt ohne Accounts, Noten, externe Schulplattformen, Projekt-Writes,
      Design-Generation oder Public-Publish.

30. **Workflow-Delta**
    - vergleicht heutigen verstreuten Bueroablauf mit der KosmoOrbit-
      Zielarbeitsweise;
    - formuliert Nutzen als weniger Suchzeit, fruehere Fehlerbremse, weniger
      Ueberforderung und mehr Wiederholbarkeit;
    - bleibt ehrlich: keine konkrete Prozentersparnis oder ROI-Behauptung ohne
      echte Buero-Pilotmessung.

31. **Demo-Briefing aktualisiert**
    - bringt `docs/kosmo-orbit-demo-briefing-2026-06-01.md` auf den neuen
      Stand der `/orbit`-Preview;
    - fuegt Workflow-Delta, Pilotmessung, Buero-Routine,
      KosmoDesign Handoff Console,
      Ausbildungsmodus, Runtime-/Command-/Audit-/Risiko-Vertraege und
      Demo-Bereitschaft in die Vorfuehrreihenfolge ein;
    - formuliert die naechste Produktfrage als echte Pilotmessung statt als
      weitere Vision.

32. **Pilotmessung**
    - zeigt, wie ein Architekturburo den Nutzen real pruefen kann:
      Suchzeit, Blocker-Frueherkennung, Rollenpassung und Wiederholbarkeit;
    - verknuepft jede Messfrage mit sichtbarer `/orbit`-Evidenz;
    - bleibt ohne Kundendaten, externe Accounts, Uploads, Kostenjobs und
      automatische Plan-/Design-Generierung.

33. **Office Pilot Plan**
    - legt unter `docs/kosmo-orbit-office-pilot-plan-2026-06-01.md` einen
      45- bis 60-Minuten-Pilot fuer ein kleines reales oder anonymisiertes
      Projektpaket fest;
    - beschreibt Rollen, Ablauf, Messpunkte, Chef-Fragen, Sicherheitslinie und
      Erfolgskriterium;
    - macht aus der Demo einen naechsten pruefbaren Produktschritt.

34. **MVP-Roadmap synchronisiert**
    - ergaenzt `docs/kosmo-orbit-mvp-roadmap.md` mit dem aktuellen
      `/orbit`-Preview-Stand vom 2026-06-01;
    - listet die sichtbaren Panels, die wichtigste Produktlinie und lokale
      Nachweise;
    - markiert den kleinen Buero-Pilot als naechsten echten Produktschritt.

35. **Push Package**
    - legt unter `docs/kosmo-orbit-push-package-2026-06-01.md` ein lokales
      Review-/Push-Paket an;
    - fasst Inhalt, Nachweise, Security-Blocker, Sicherheitsgrenzen und
      Push-Entscheidungen zusammen;
    - dokumentiert explizit, dass kein Push/Deploy ausgefuehrt wurde.

36. **System-Knowledge und Source-of-Truth nachgezogen**
    - aktualisiert `docs/kosmo-system-knowledge-map.md` mit dem aktuellen
      `/orbit`-Preview-Stand;
    - aktualisiert `docs/kosmo-source-of-truth-map.md` mit Push-Paket,
      Office-Pilot und den aktuellen Orbit-Nachweisen;
    - verhindert, dass KosmoOrbit in der Gesamtlandkarte wieder als
      Website-Feature statt als Hauptsoftware gelesen wird.

37. **Pilot-Runbook in `/orbit`**
    - fuegt ein sichtbares 45-60-Minuten-Runbook fuer den ersten Buero-Test
      hinzu;
    - strukturiert Ausgangslage, Zentrale, Projektpaket, Rollenrunde und
      Pilotentscheidung;
    - haelt Kundendaten, Uploads, Kosten, Design-Generation und Push ohne
      Owner-Go weiterhin blockiert.

38. **Live-Gate sichtbar gemacht**
    - fuegt ein Publish-Readiness-Panel in `/orbit` hinzu;
    - trennt lokale Demo-Bereitschaft von oeffentlichem Livegang;
    - macht Owner-Go, Security Review und Live-Smoke als Pflicht vor
      Push/Deploy sichtbar.

39. **Browser-Smoke erneuert**
    - prueft den gebauten `/orbit`-Export ueber lokalen Testserver;
    - Desktop 1440 x 900 und Mobile 390 x 844 ohne horizontalen Overflow;
    - bestaetigt Pilot-Runbook, Live-Gate und keine Klickziele unter 32 px.

40. **Pilot-Session-Vertrag**
    - legt `schema/kosmo-orbit-pilot-session.schema.json` an;
    - legt ein lokales Template fuer eine spaetere Buero-Pilotmessung an;
    - prueft mit `npm run kosmo:orbit-pilot-session`, dass keine echten
      Messwerte, Kundendaten, Uploads, Kosten oder Design-Generation behauptet
      werden.

41. **Pilot-Session-Template sichtbar**
    - integriert das Pilot-Session-Template als eigenes `/orbit`-Panel;
    - zeigt Sicherheitsflags, Messpunkte und leere before/after-Werte;
    - macht sichtbar, dass keine Pilotresultate behauptet werden.

42. **Security-/Doctor-Blocker geloest**
    - ersetzt einen persoenlichen Namen im Live-Gate durch rollenbasierte
      Owner-Sprache;
    - `npm audit --omit=dev`, `npm run security:check` und
      `npm run brain:doctor-fast` laufen danach gruen;
    - Push bleibt trotzdem ohne explizites Owner-Go und Live-Smoke blockiert.

43. **Chef-Demo-Skript**
    - legt ein 5-Minuten-Erklaerskript fuer eine nicht-technische
      Architekturburo-Demo an;
    - verlinkt das Skript im Office Pilot Plan;
    - grenzt klar ab: kein fertiges CAD, keine automatische Generation, keine
      garantierten Zeit-/Kostenwerte.

## Lokale Commits seit `origin/main`

- `6ad9372` Add KosmoOrbit role switcher preview
- `35b4399` Add KosmoOrbit guided review demo
- `48ebc32` Add KosmoOrbit project package dashboard
- `905d240` Add KosmoOrbit presenter mode
- `5f2e1f7` Add KosmoOrbit demo briefing questions
- `24508ff` Add KosmoOrbit review decision draft
- `6a35e2c` Clarify KosmoOrbit runtime boundary
- `5ddaa71` Show KosmoOrbit quality evidence
- `0d7f2a5` Add KosmoOrbit workstation priorities
- `3aa4269` Document KosmoOrbit workstation priorities

## Verifikation

Zuletzt gruene lokale Checks:

- `npm run kosmo:orbit-route-smoke` — 149/149 passed
- `npm run kosmo:orbit-full-review` — 21/21 passed
- `npm run kosmo:orbit-pilot-session` — 17/17 passed
- `npm run kosmo:orbit-demo-audit` — 33/33 passed
- `npm run kosmo:orbit-responsive-audit` — 27/27 passed
- `npm run kosmo:orbit-health-readiness` — 14/14 passed
- `npm run kosmo:orbit-command-contract` — 14/14 passed
- `npm run kosmo:orbit-audit-trail` — 11/11 passed
- `npm run kosmo:orbit-office-routine` — 10/10 passed
- `npm run kosmodata:hud-guard` — 13/13 passed
- `npm run database:pilot-quality` — passed, 5 Piloten, 97% Durchschnitt
- Browser-Smoke fuer `/orbit/` — passed
- 390px-Mobile-Smoke fuer `/orbit/` — passed
- `npm run ui:audit` — 72/72 passed, 0 Warnings
- `npm run archive:validate` — passed
- `npm run security:check` — passed
- `npm run brain:doctor-fast` — 12/12 passed
- `npx tsc --noEmit` — passed
- `npm run build` — static export passed
- `npm run build` + `npm run kosmo:orbit-static-smoke` — 47/47 static
  `/orbit` HTML enthaelt die wichtigsten Demo-Panels und Anker

## Sicherheitsgrenzen

In diesem Batch wurde nicht gemacht:

- keine API-Routes;
- keine Server Actions;
- keine Middleware;
- keine Aenderung an `wrangler.jsonc`;
- keine D1/R2-Writes;
- keine Uploads;
- keine Auth;
- keine externen Accounts;
- keine Secrets;
- keine Kosten.

## Aktueller Zustand

- Branch: `main`
- Lokaler Stand: mehrere Commits vor `origin/main`
- Live-Publish: noch nicht automatisch ausgefuehrt, ausser ein spaeterer
  expliziter Push/Publish-Befehl folgt.

## Naechste sichere Prioritaet

Vor einem grossen Publish sollte als naechstes nur noch entschieden werden, ob
die lokalen Commits bewusst auf `main` gepusht werden sollen:

1. Bei Push-Freigabe: `git push origin main`.
2. Danach Live-Smoke mit Cache-Buster.
3. Ohne Push-Freigabe: naechster lokaler UI-Polish-Batch.
