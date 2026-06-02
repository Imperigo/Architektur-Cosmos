# KosmoOrbit Tagesstatus 2026-06-02

Status: autonomer 3h-Batch fuer Push-Readiness, Launch-Entscheid und
KosmoDesign/Buero-Pilot-Schaerfung. Kein Push, kein Deploy, keine externen
Accounts, keine Kosten.

## Startstand

- Branch: `main`
- Remote: `origin/main`
- Lokaler Stand: deutlich vor `origin/main`; aktuelle Zahl jeweils mit
  `git status --short --branch` oder `npm run kosmo:orbit-push-readiness`
  pruefen.
- Arbeitsbaum zu Batchbeginn: sauber
- Ziel: KosmoOrbit als Hauptsoftware-Zentrale weiter in Richtung
  vorfuehrbares Produktpaket bringen, ohne die Grenzen zu CAD, Runtime,
  Generierung oder Livegang zu verwischen.

## Heute umgesetzt

### Launch Decision Brief

`/orbit` hat einen sichtbaren Launch Decision Brief erhalten.

Zweck:

- technischer Gruenstand wird in eine menschliche Entscheidung uebersetzt;
- lokaler Build, Produktgrenze, Owner-Entscheid und Pilot-Evidenz sind
  getrennt sichtbar;
- Push, Livegang, Public Claims und Pilot-Auswertung bleiben menschliche Gates;
- Empfehlung: erst lokale Demo abnehmen, dann entweder pushen oder
  Buero-Pilot starten.

Wichtige Grenze:

- `push-decision-not-automatic`
- kein Push ohne Owner-Go
- keine unbewiesenen Public Claims
- keine Kosten-/Zeitersparnis ohne Pilotmessung

### KosmoDesign Pilotpfad

`/orbit` hat einen sichtbaren KosmoDesign Pilotpfad erhalten.

Zweck:

- KosmoDesign wird nicht als blinder Generator positioniert;
- der erste sichere Pfad ist ein Review-Pilot vor jeder Generierung;
- Projektkontext, KosmoDesign Review Mode, Rollenrunde und Pilotentscheidung
  sind als Stufen sichtbar;
- Sofort-Demo, Buero-Pilot und KosmoDesign V2 sind als naechste Optionen
  unterscheidbar.

Wichtige Grenze:

- `review-pilot-before-generation`
- keine Design-Generation
- keine Geometrie-Writes
- keine echten Userrechte
- keine Public Claims ohne Evidenz

### Lint-/Qualitaetsbereinigung

Die Atlas-/Orbit-Schicht wurde von den bisherigen Bestandswarnungen befreit.

Zweck:

- TypeScript-Callback-Signaturen benennen ungenutzte Parameter explizit mit
  `_...`;
- ein ungenutzter Asset-Format-Zwischenwert wurde entfernt;
- Lint ist dadurch nicht nur fehlerfrei, sondern auch warnungsfrei;
- die Aenderung ist reine Qualitaetsarbeit ohne neue Runtime-Logik.

### Buero-Pilot Szene

`/orbit` hat eine sichtbare Buero-Pilot Szene erhalten.

Zweck:

- KosmoOrbit wird als lokale Steuerzentrale im Alltag eines kleinen
  Architekturburos erklaert;
- Projektleitung, Entwurf, Chef/Admin und Ausbildung sehen unterschiedliche
  Rollenbeduerfnisse;
- der erste reale Nutzen wird als beobachtbarer Review-Ablauf beschrieben,
  nicht als fertige CAD- oder Plan-Generierung;
- Evidenzfragen halten fest, was vor Zeit-, Kosten- oder Qualitaetsclaims
  gemessen werden muss.

Wichtige Grenze:

- `local-office-pilot-review-only`
- keine Kundendaten hochladen
- keine Cloud
- keine Geometrie- oder Plan-Writes
- keine Design-Generation
- keine echte Auth-Runtime
- keine unbewiesenen Zeit-/Kostenclaims

Nachgezogen:

- `examples/kosmo-orbit/pilot/orbit-office-pilot-scene.demo.json` haelt die
  Szene jetzt als lokalen Demo-Vertrag;
- `/orbit` liest Schritte, Rollen, Safety, Evidenzfragen und Decision-Status
  aus diesem Vertrag;
- `npm run kosmo:orbit-office-pilot-scene` prueft diesen Vertrag mit
  13/13 Checks;
- `npm run kosmo:orbit-route-smoke` prueft den Datenvertrag explizit mit.

### Tool-Orchestrierungsregister

`/orbit` hat ein sichtbares Tool-Orchestrierungsregister erhalten.

Zweck:

- KosmoOrbit wird als Software-Zentrale aller Architektur-Kosmos-Tools
  sichtbar, nicht nur als lose Sammlung einzelner Panels;
- KosmoData, KosmoAsset, KosmoDesign, KosmoPrepare, KosmoDraw, KosmoViz,
  KosmoPublish und KosmoZentrale werden aus `workspace.demo.json` gelesen;
- pro Tool werden Status, Rollen, Gate-Bezug und Handoff-Ziel sichtbar;
- die Grenze zur spaeteren Runtime bleibt klar: Tool-Launch, Modellstart,
  Upload, Kostenjob und Public-Freigabe bleiben gesperrt.

Nachgezogen:

- `app/orbit/OrbitToolRegistry.tsx` liest den lokalen Workspace-Vertrag;
- `npm run kosmo:orbit-tool-registry` prueft das Register mit 13/13 Checks;
- `npm run kosmo:orbit-full-review` enthaelt das Tool-Register als eigenen
  Schritt und steht dadurch bei 25/25;
- `npm run kosmo:orbit-route-smoke` steht nach dem Runtime-Adapter bei
  197/197;
- `npm run kosmo:orbit-static-smoke` steht nach dem Runtime-Adapter bei 70/70.

### Runtime-Adapter-Vertrag

`/orbit` hat einen sichtbaren Runtime-Adapter-Vertrag erhalten.

Zweck:

- KosmoOrbit bekommt eine klare Bruecke zwischen Tool-Orchestrierung und
  spaeterer lokaler KosmoZentrale-Runtime;
- die Adapter-Lanes Health Telemetry, lokales Kosmo-Modell, Tool Launch,
  Job Queue, Audit Log und Publish/External Sync sind als Vertrag sichtbar;
- pro Adapter werden Zukunftsfaehigkeit, heutiger Vertrag, notwendige
  Evidenz, Human Gate und blockierte Side Effects gezeigt;
- Promotion Requirements halten fest, dass Schema, lokale Permissions,
  Audit/Rollback, Privacy/Retention, Cost Gate und manueller Kill Switch
  vor jeder echten Ausfuehrung geklaert sein muessen.

Wichtige Grenze:

- keine Adapter-Ausfuehrung;
- keine Hardwarebefehle;
- keine Modellstarts;
- keine Memory-Writes;
- keine Dateisystem-Scans;
- keine Prozessstarts;
- keine Queue-/Kostenjobs;
- keine User-Writes;
- keine Uploads, externen Accounts oder Public-Publish.

Nachgezogen:

- `examples/kosmo-orbit/runtime/orbit-runtime-adapter.contract.json` haelt
  den lokalen Adapter-Vertrag;
- `app/orbit/OrbitRuntimeAdapterContract.tsx` rendert die Adapter-Lanes;
- `npm run kosmo:orbit-runtime-adapter` prueft den Vertrag mit 16/16 Checks;
- `npm run kosmo:orbit-full-review` enthaelt den Adapter als eigenen Schritt
  und steht dadurch bei 26/26;
- `npm run kosmo:orbit-route-smoke` steht bei 197/197;
- `npm run kosmo:orbit-static-smoke` steht bei 70/70.

### Workstation-Profil-Vertrag

`/orbit` hat einen sichtbaren Workstation-Profil-Vertrag erhalten.

Zweck:

- KosmoOrbit wird konkreter als installierte Hauptsoftware auf jeder
  Arbeitsstation;
- Chef/Admin, IT/KI, Projektleitung, Entwurf, Zeichnung, Praktikum, Lehrling
  und Schnupperstift bekommen eigene spaetere Startoberflaechen;
- pro Profil sind Stationstyp, Startoberflaeche, UI-Tiefe, Fokus, sichtbare
  Module, sichere Aktionen, blockierte Aktionen und Human Gate sichtbar;
- Eskalationsregeln machen klar, wann Lernende, Entwurf, Zeichnung,
  Infrastruktur oder Owner eine menschliche Freigabe brauchen.

Wichtige Grenze:

- keine echte Auth-Runtime;
- keine Accounts;
- keine User-Writes;
- keine Profilpersistenz;
- keine Tool-Launches;
- keine Modellstarts;
- keine Projekt-Writes;
- keine Uploads, externen Accounts, Kostenjobs oder Public-Publish.

Nachgezogen:

- `examples/kosmo-orbit/workstations/orbit-workstation-profile.contract.json`
  haelt den lokalen Workstation-Vertrag;
- `app/orbit/OrbitWorkstationProfileContract.tsx` rendert die
  rollenbasierten Arbeitsplatzprofile;
- `npm run kosmo:orbit-workstation-profile` prueft den Vertrag mit 16/16
  Checks;
- `npm run kosmo:orbit-full-review` enthaelt den Vertrag als eigenen Schritt
  und steht dadurch bei 27/27;
- `npm run kosmo:orbit-route-smoke` steht bei 204/204;
- `npm run kosmo:orbit-static-smoke` steht bei 72/72.

### Local-Identity-Vertrag

`/orbit` hat einen sichtbaren Local-Identity-Vertrag erhalten.

Zweck:

- KosmoOrbit trennt heutige Rollen-Preview von spaeterer lokaler Identitaet;
- Owner, IT/KI, Projektleitung, Design/Zeichnung und Lernprofile sind als
  Profilklassen mit Preview-Scope, Zukunftsscope, Human Gate und Privacy
  Requirement beschrieben;
- Preview-, Decision- und Learning-Sessions haben eigene Grenzen;
- blockierte Identity-Faehigkeiten und Promotion Requirements machen klar,
  was vor echter Auth, Profilpersistenz oder Session-Speicherung entschieden
  werden muss.

Wichtige Grenze:

- keine Logins;
- keine Accounts;
- keine Passwoerter;
- keine Permission-Mutation;
- keine Profilpersistenz;
- keine Session-Cookies;
- keine personenbezogenen Writes;
- kein Hidden Tracking;
- keine Learning Scores;
- keine externen Directory-/Cloud-Identity-Provider;
- keine automatische Freigabe.

Nachgezogen:

- `examples/kosmo-orbit/identity/orbit-local-identity.contract.json` haelt
  den lokalen Identity-Vertrag;
- `app/orbit/OrbitLocalIdentityContract.tsx` rendert Profilklassen,
  Session-Grenzen, blockierte Faehigkeiten und Promotion Requirements;
- `npm run kosmo:orbit-local-identity` prueft den Vertrag mit 16/16 Checks;
- `npm run kosmo:orbit-full-review` enthaelt den Vertrag als eigenen Schritt
  und steht dadurch bei 28/28;
- `npm run kosmo:orbit-route-smoke` steht bei 211/211;
- `npm run kosmo:orbit-static-smoke` steht bei 74/74;
- `npm run kosmo:orbit-demo-audit` steht bei 37/37;
- `npm run kosmo:orbit-responsive-audit` steht bei 29/29.

### Push-Readiness Stabilisierung

Der Push-Readiness-Report wurde stabilisiert.

Zweck:

- keine fluechtigen `ahead_count`-Zahlen mehr im gespeicherten Report;
- keine `latest_commits`-Liste mehr, die nach jedem lokalen Commit sofort
  veraltet;
- stattdessen nur `has_unpushed_commits: true/false`;
- eigene Output-Dateien werden beim Worktree-Clean-Check ignoriert, andere
  Dirty Files bleiben weiterhin Blocker;
- erneutes Generieren erzeugt nur Zeitstempelrauschen, das
  `npm run generated:cleanup` sauber zuruecksetzt.

### Readiness Sweep

Neu gibt es `npm run kosmo:orbit-readiness-sweep`.

Diese Routine laeuft lokal und review-only:

1. `npm run kosmo:orbit-office-pilot-scene`
2. `npm run kosmo:orbit-route-smoke`
3. `npm run kosmo:orbit-static-smoke`
4. `npm run generated:cleanup`
5. `npm run kosmo:orbit-push-readiness`
6. `npm run generated:cleanup`

Zweck: die richtige Reihenfolge fuer lokale Orbit-Readiness automatisieren,
ohne Push, Deploy, Upload, externe Accounts oder Kosten auszuloesen.

### Full Review und IFC-Kontext

`npm run kosmo:orbit-full-review` wurde zuerst auf 24, danach auf 25, 26, 27
und nun auf 28 Schritte erweitert.

Neu enthalten:

- `npm run kosmo:orbit-office-pilot-scene` als eigener Full-Review-Schritt;
- Full Review Summary mit Office-Pilot-Scene-Status, 13/13 Checks, 4 Steps
  und 4 Rollen;
- `npm run kosmo:orbit-tool-registry` als eigener Full-Review-Schritt mit
  13/13 Checks, 8 Tools, 8 Rollen und 7 Gates;
- `npm run kosmo:orbit-runtime-adapter` als eigener Full-Review-Schritt mit
  16/16 Checks, 6 Adapter-Lanes und 6 Promotion Requirements;
- `npm run kosmo:orbit-workstation-profile` als eigener Full-Review-Schritt
  mit 16/16 Checks, 8 Profilen, 3 Lern-/Observer-Profilen und 4
  Eskalationsregeln;
- `npm run kosmo:orbit-local-identity` als eigener Full-Review-Schritt mit
  16/16 Checks, 5 Profilklassen, 3 Session-Grenzen und 12 blockierten
  Identity-Faehigkeiten;
- aktualisierte Design-Kontext-Artefakte fuer das Demo-Projekt mit IFC-Bounds
  und IFC-Rollenhinweisen.

Wichtige Grenze: Die IFC-Erkennung bleibt Kontext- und Bounds-Evidenz. Sie
ist kein BIM-Import, kein editierbares Modell und kein Design-Generation-Go.

## Lokale Nachweise

Heute gruen geprueft:

- `npm run kosmo:orbit-route-smoke` - 211/211 passed
- `npm run kosmo:orbit-static-smoke` - 74/74 passed
- `npm run kosmo:orbit-full-review` - 28/28 passed
- `npm run atlas:static-smoke` - 17/17 passed
- `npm run build` - static export passed
- `npx tsc --noEmit --pretty false --incremental false` - passed
- `npm run lint` - 0 Errors, 0 Warnings
- `npm run brain:doctor` - 17/17 passed
- `npm run kosmo:orbit-office-pilot-scene` - 13/13 passed
- `npm run kosmo:orbit-tool-registry` - 13/13 passed
- `npm run kosmo:orbit-runtime-adapter` - 16/16 passed
- `npm run kosmo:orbit-workstation-profile` - 16/16 passed
- `npm run kosmo:orbit-local-identity` - 16/16 passed
- `npm run kosmo:orbit-demo-audit` - 37/37 passed
- `npm run kosmo:orbit-responsive-audit` - 29/29 passed
- `npm run kosmo:orbit-push-readiness` - 12/12 passed
- `npm run kosmo:orbit-readiness-sweep` - 6/6 passed
- `npm run generated:cleanup` - Zeitstempelrauschen entfernt, semantische
  Report-Diffs behalten
- `git diff --check` - passed

Browser-Smokes:

- `/orbit/#launch-brief` mit Cache/Export: sichtbar, CSS geladen, 0 horizontaler
  Overflow, Owner-/Pilot-Gates sichtbar.
- `/orbit/?v=design-pilot-20260602#design-pilot`: sichtbar, Navigation
  vorhanden, CSS geladen, 0 horizontaler Overflow, Generation bleibt blockiert.
- `/orbit/?v=office-pilot-20260602`: HTTP 200, Office-Pilot-Navigation,
  `#office-pilot`, `local-office-pilot-review-only` und Sicherheitscopy im
  statischen HTML vorhanden.
- `/orbit/#tool-registry`: HTTP 200 im lokalen Static Export, Tool-Registry
  sichtbar, 8 Toolkarten, Safety-Copy sichtbar, keine horizontale
  Ueberbreite bei schmaler Viewport-Pruefung.
- `/orbit/#runtime-adapter`: HTTP 200 im lokalen Static Export,
  Runtime-Adapter sichtbar, 6 Adapter-Cards, Promotion Requirements und
  Safety-Copy sichtbar, keine horizontale Ueberbreite bei schmaler
  Viewport-Pruefung.
- `/orbit/?v=workstation-profile-20260602#workstation-profile`: HTTP 200 im
  lokalen Static Export, Workstation-Profil-Vertrag sichtbar, 8 Profilkarten,
  Safety-Copy und alle Rollen sichtbar, keine horizontale Ueberbreite bei
  schmaler Viewport-Pruefung.
- `/orbit/?v=local-identity-20260602#local-identity`: HTTP 200 im lokalen
  Static Export, Local-Identity-Grenze sichtbar, 8 Karten, Profilklassen und
  Safety-Copy sichtbar, keine horizontale Ueberbreite bei schmaler
  Viewport-Pruefung.

Hinweis: Ein paralleler TypeScript-Lauf waehrend `next build` hatte kurz
fehlende `.next/types` gemeldet. Seriell nach abgeschlossenem Build war
TypeScript gruen. Das ist als Build-Artefakt-Race zu behandeln, nicht als
Codefehler.

## Lokale Commits in diesem Batch

- `055cff5` Add KosmoOrbit launch decision brief
- `14ca4a2` Add KosmoDesign pilot path
- `3d73869` Clear Atlas lint warnings
- `fc0c2ca` Add KosmoOrbit office pilot scene
- `77adb4b` Add KosmoOrbit office pilot scene contract
- `2fae082` Refresh stable KosmoOrbit push readiness
- `944ad27` Stabilize brain doctor static export order
- `00932ae` Add KosmoOrbit tool registry
- `ded70ce` Refresh KosmoOrbit push readiness evidence
- `c32d725` Add KosmoOrbit runtime adapter contract

## Push-/Live-Grenze

Weiterhin nicht gemacht:

- keine Aenderung an `wrangler.jsonc`;
- keine API-Routes;
- keine Server Actions;
- keine Middleware;
- keine D1/R2-Writes;
- keine Uploads;
- keine externen Accounts;
- keine Secrets;
- keine Kosten;
- keine automatische Design- oder Plan-Generierung;
- kein Push ohne explizites Push-/Live-/Deploy-Go.

## Empfehlung naechster Entscheid

1. Interne lokale Demo mit `/orbit` durchgehen:
   Presenter, Demo-Bereitschaft, Live-Gate, Launch Brief, Projektpaket,
   Buero-Pilot Szene, KosmoDesign Handoff, Design-Pilotpfad.
2. Danach bewusst entscheiden:
   - `push/live/deploy`: main pushen und Live-Smoke pruefen;
   - `buero-pilot`: anonymisiertes Projektpaket nehmen und Messkit ausfuellen;
   - `kosmo-design-v2`: Input-Checkliste und Review Mode tiefer ausarbeiten.
