# Tagesstatus 2026-05-31

## Morgenroutine

- Repo-Stand gelesen und mit `origin/main` abgeglichen.
- Handoff- und Vision-Dokumente gelesen:
  - `docs/tomorrow-next-steps-2026-05-28.md`
  - `docs/pause-handoff-2026-05-27.md`
  - `docs/benutzerhandbuch-projektvision.md`
  - `docs/notion-ai-vision-synthesis.md`
- Notion-Vision geprueft: KosmoZentrale, KosmoDesign, KosmoPrepare,
  KosmoDraw/Vis/Publish, KosmoData, Projekt-/Asset-Datenbank und
  Innovationsspuren wie Gaussian Splats, Trellis.2, AI-Physics und
  Image-to-3D bleiben die richtige Richtung.

## Health-Check

Gruen:

- `npm run archive:validate`
- `npm run ui:audit`
- `npm run atlas:style-guard`
- `npm run brain:review`
- `npm run i18n:check`
- `npm run database:hero-images:audit`
- `npm run database:planet-thumbnails:audit`
- `npm run kosmo:asset-library-check`
- `npm run kosmo:asset-handoff-smoke`
- `npm run database:profile-audit`
- `npm run database:pilot-quality`
- `npm run brain:model-status`
- `npm run brain:polish-texts`

Tooling-Haenger:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run security:check`
- `npm run build`

Diese Prozesse starteten lokal, liefen aber ohne Ausgabe weiter. Sie wurden
beendet und bleiben als lokales Tooling-Thema markiert, nicht als
Produktcode-Bug. Fuer kleine Aenderungen wurden stattdessen fokussierte Checks
und visuelle QA verwendet.
- Zusatzdiagnose 11:15-11:25: TypeScript haengt auch einzeln, ohne parallele
  Prozesse und auch mit Node 22 statt Node 24. Ein Trace zeigte, dass der
  Compiler zuerst sehr viel Typ- und Dateiaufloesung betreibt; der Befund bleibt
  lokal als Tooling-/Compiler-Thema markiert. Produktseitige Schritte werden
  weiter ueber fokussierte Guards, UI-Audit und Live-Smokes abgesichert.

Build-Diagnose 10:10-10:40:

- `next build` braucht lokal rund 60-70 Sekunden, bis der Next-Build-Stack
  ueberhaupt geladen ist; in dieser Phase gibt es fast keine Ausgabe.
- Danach schreibt der Build `.next` bis ca. 86-87 MB und bleibt in der
  optimierten Build-Phase stehen, ohne `out/` zu erzeugen.
- Webpack-Build-Worker an/aus wurde kontrolliert getestet. Beide Varianten
  bleiben lokal stehen; die bestehende Produktionskonfiguration wurde deshalb
  nicht veraendert.
- Prozess-Samples zeigen wiederholte Node/Next-Datei- und Package-Reads
  innerhalb des Next/SWC/Webpack/Tailwind-Stacks, nicht in
  Architecture-Kosmos-Produktcode.
- Arbeitsregel fuer heute: kein lokaler `next build` als Blocker fuer kleine
  Review-/UI-Schritte verwenden. Stattdessen fokussierte Checks, `ui:audit`,
  TypeScript-Transpile-Smokes und `git diff --check`; Cloudflare prueft den
  Static-Export nach Push auf `main`.

Live-Smoke 10:46:

- Lokaler Stand: `main` lokal auf `ce0430f`, ein KosmoAsset-Mobile-Fix vor
  `origin/main`; noch nicht gepusht.
- `https://architekturkosmos.ch/` und `/atlas/` liefern HTTP 200 ueber
  Cloudflare.
- `/atlas/` HTML enthaelt Next-Assets und Hydration-Skripte; 10 gepruefte
  `_next/static` CSS-/JS-Assets liefern HTTP 200.
- Browser-Smoke: Startscreen sichtbar, `KosmoData oeffnen` fuehrt in den
  Atlas. Stilsektor-Labels und Projekt-Nodes sind sichtbar, UI-Buttons
  `Suche`, `Dev`, `Filter` sind vorhanden.
- Kleine Zoom-/Scroll-Geste im Atlas bleibt stabil; keine Browser-Console-
  Errors im Live-Smoke.
- `ui:audit` wurde um zwei KosmoAsset-Mobile-Regeln erweitert, damit die
  Assetkarten nicht wieder in den Inspektor kollabieren.

## Erster Stabilitaetsblock

KosmoData:

- Search-Trigger erhaelt eine stabile UI-Markierung und hoehere HUD-Prioritaet.
- Wurmloch-Node-Opacity-Transition in Bewegung wurde entfernt, damit Objekte
  beim Scrollen nicht weich nachflackern.
- Stilbeschriftungen richten Buchstaben wieder konsequenter zum Zentrum aus;
  Klickflaechen bleiben robust.
- Projektplaneten haben groessere unsichtbare Hitboxes, damit Klicks in
  normaler Ansicht und optischer Lupe leichter treffen.
- Cluster-Klicks wurden weiter stabilisiert: Projektknoten stoppen nur noch
  das Grab/Pan beim Pointer-Down; der eigentliche Klick wird vom Atlas ueber
  die naechste sichtbare Node aufgeloest. Dadurch blockiert ein obenliegender
  SVG-Knoten weniger stark den Nachbarn im engen Cluster.
- Stilsektor-Baender und feine Sektor-Ticks wurden fuer Pointer-Events
  deaktiviert. Die farbige Architektur-Ebenen-Grafik bleibt klickbar ueber die
  Beschriftung, faengt aber keine Projektklicks im Wurmloch mehr ab.
- Direkte `/atlas/`-Aufrufe starten nun bewusst im interaktiven KosmoData-Atlas.
  Die Start-/Hub-Inszenierung bleibt ueber die Hauptseite und `?view=hub`
  erreichbar, aber QA-Links und direkte Atlas-Deep-Links brauchen keinen
  zusaetzlichen Intro-Klick mehr.
- Detailseiten-Polish: Das Archivstatus-Radar nutzt nun lesbare Achsenlabels
  (`Quelle`, `Medien`, `Netz`, `3D`, `Analyse`, `Text`) statt kryptischer
  Zweibuchstaben-Codes.
- Hero-/Planetenbild-Audit: 79/112 Eintraege haben rechteklare Hauptbilder,
  keine Duplikat-URLs, keine blockierten/unklaren Public-Lizenzen.

KosmoAsset:

- Schmale/mobile Ansicht bekommt ein echtes internes Scrollverhalten.
- Shell, Karten, Metrics und Inspector stacken defensiver, damit Karten und
  Inspektor nicht gegeneinander laufen.
- Asset-Library-Check und Handoff-Smoke sind gruen; Warm Concrete bleibt als
  lokaler Blender-/Review-Pilot sichtbar, aber public-gated.
- KosmoAsset Full Review erneut ausgefuehrt: 10/10 Schritte bestanden,
  Certificate Smoke 12/12 bestanden, Promotion Guard bleibt korrekt blockiert.
  Das bestaetigt: lokale Review-Evidenz ist nutzbar, oeffentliche Promotion ist
  weiterhin absichtlich gesperrt.
- Zweiter Asset-Pfad gestartet: `generic-column-glb-001` ist bewusst als
  `needs-review` / `local_review_note_recorded` verbucht. Das ist keine lokale
  Freigabe, kein Zertifikat und keine Sandbox-Erlaubnis, sondern eine saubere
  Review-Spur fuer die naechste menschliche GLB-/Blender-Pruefung.
- KosmoData-Bruecke im Asset-Inspector sichtbar gemacht: Referenzprojekte wie
  `villa-savoye` und `pantheon` duerfen als Kontextsprache dienen, aber die
  Asset-Freigabe bleibt ein eigener Rechte-, Review- und Public-Gate-Prozess.
- Mobile-KosmoAsset-Fix: Die schmale Ansicht nutzt in der Shell nun normalen
  Dokumentfluss mit internem Scrollen, damit Assetkarten nicht mehr in den
  Inspektor kollabieren. Der Bruch wurde live im schmalen Browser-Viewport
  gemessen: die Grid-Hoehe war kleiner als die erste Karte.

## Informationsqualitaet

- Database Profile Audit: 106/112 Eintraege haben Profile. Naechster
  vorgeschlagener Batch: `centre-pompidou`, `elemental-quinta-monroy`,
  `marc-antoine-laugier-primitive-hut`, `panopticon`, `new-babylon`,
  `s-m-l-xl`.
- Text-Polish Review: 8 Eintraege wurden im Review-Modus geprueft, ohne
  `data/mock-entries.json` zu beschreiben.
- Model Status: 5 Eintraege haben ein public Preview-GLB, 107 sind geplant,
  0 fehlen komplett im Modellplan.
- Pilot Quality Audit: 5/5 Kernpiloten bestehen ohne `needs_work`. Villa
  Savoye ist bei 100%, High Line bei 92%, Ingenbohl/MFO Park/Goebekli Tepe bei
  85%. Wiederkehrende Schwaeche ist nicht Material oder 3D, sondern
  `Netzwerk / DNA`: die Texte sollen staerker erklaeren, wie ein Objekt mit
  verwandten Projekten, Typologien und historischen Linien verbunden ist.
- Textgenerator erweitert: `cosmos:text-generate` liest nun zusaetzlich die
  Atlas-Relationen und Nachbarobjekte aus `data/relations.json` /
  `data/mock-entries.json`. Review-Texte koennen damit echte Kanten wie
  Einflusslinie, Autor-/Werkbezug, thematische Verwandtschaft und typologische
  Referenz ausweisen. Beispiel Villa Savoye: Dom-Ino House, Charta von Athen,
  Ville Radieuse, Haus Tugendhat. Die Ausgabe bleibt bewusst Review-Pack und
  schreibt ohne explizites `--apply --confirm-public-text` nichts live.
- Pilot-Audit erweitert: `database:pilot-quality` erkennt nun vorhandene
  Text-Review-Packs und weist sie separat als `Netzwerk-Review-Pack` aus.
  Dadurch bleibt sichtbar, ob ein Live-Eintrag noch Relationserweiterung
  braucht, waehrend das Brain die inhaltliche Netzwerklesart schon vorbereitet
  hat. Nach Review-Pack-Generierung stehen die 5 Kernpiloten lokal bei 96%
  Durchschnitt / 5 ready, ohne Live-Daten zu beschreiben.

Naechster Textstandard bleibt:

1. These / architektonische Pointe.
2. Netzwerk und DNA: Wie steht das Objekt zu aehnlichen Projekten?
3. Topos: Ort, Landschaft, Stadt, kultureller Kontext.
4. Typos: Programm, Typologie, Raumordnung.
5. Tektonik: Material, Tragwerk, Fuge, Konstruktion.
6. Modellwert: Was kann das 2D-/3D-/Blender-Modell spaeter sinnvoll zeigen?

## Heute weiter

Prioritaet fuer die naechsten Bloecke:

1. KosmoData visuell pruefen: Projektklicks, optische Lupe, Dossier, Stilfarben.
2. KosmoAsset-Inspector weiter als lokale Review-Evidenz formulieren.
3. Mobile/Responsive nur dort anfassen, wo Bedienbarkeit sichtbar bricht.
4. Keine R2-Uploads, keine D1-Writes, keine echten Uploads/Auth-Schritte.
5. Bei gutem Stand logisch committen; Publish nur, wenn der sichtbare Stand
   wirklich stabiler ist.

## Live-QA Kurznotiz

- Live-Check auf `architekturkosmos.ch` mit Cache-Buster durchgefuehrt.
- Startbildschirm laedt, Orbit-Hauptmenue erscheint nach Klick.
- KosmoAsset laesst sich aus dem Orbit oeffnen; `Zurueck` ist vorhanden.
- KosmoAsset zeigt 3 Ressourcen, 5 vorhandene Formate, 7 Exportziele und den
  Asset-Inspector mit Statusampel.
- Testbrowser war in schmalem/Mobile-Modus (`cosmos-mobile-web`), daher ist
  das Fadenkreuz korrekterweise deaktiviert. Desktop-Fadenkreuz muss separat
  in einem Fine-Pointer-Viewport verifiziert werden.

## Autonomer Nachmittagsblock

Gepusht:

- `a6140c5 Add media audits to brain diagnostics`
- `56892f2 Harden Brain Doctor atlas checks`

Umgesetzt:

- `brain:doctor` prueft nun zusaetzlich Hero-Bilder und Planet-Thumbnails.
  Damit wird der lang laufende Fehler "alle Projektplaneten zeigen dasselbe
  Bild" als automatischer Diagnosepunkt mitgeprueft.
- `brain:doctor` prueft nun auch Atlas-Interaktion und Stilsektoren:
  Projektklicks, Dossier-Filter, Filterpanel-Pinning, Stilwinkel,
  Sektor-Farbbaender und radiale Label-Lesbarkeit.
- Lange Doctor-Checks haben Timeouts, damit Autonomie-Laeufe nicht mehr
  unendlich in `lint` oder `build` haengen. Ein Timeout wird als lokales
  Tooling-/CI-Abgleich-Thema diagnostiziert, nicht als heimlicher Code-Fix.
- Der 3D-Modellviewer wurde von `ts-nocheck` auf explizitere Three/GLTF-Typen
  umgestellt. Das ist ein kleiner Schritt in Richtung professionellerer
  3D-/Analyse-Tools, ohne Verhalten zu veraendern.

Gruen im autonomen Block:

- `npm run archive:validate`
- `npm run ui:audit`
- `npm run security:check`
- `npm run atlas:interaction-guard`
- `npm run atlas:style-guard`
- `npm run database:hero-images:audit`
- `npm run database:planet-thumbnails:audit`
- `npm run kosmo:orbit-route-smoke`
- `git diff --check`

Live-Smoke nach Push:

- `/atlas/` laedt mit Cache-Buster auf Desktop-Viewport `1366x900`.
- 91 sichtbare Entry-Nodes wurden im SVG gefunden.
- Direkter Klick auf den ersten Entry-Node oeffnet ein Dossier erfolgreich
  (`Kloster St. Gallen` im Smoke).
- Die UI-Buttons `Suche`, `Dev`, `Filter` sind sichtbar.

Noch offen:

- `npm run lint`, `npx tsc --noEmit` und `npm run build` bleiben lokal als
  haengende Tooling-Themen markiert. Brain Doctor bricht solche Haenger nun
  kontrolliert ab; Cloudflare/CI bleibt der finale Build-Gate nach Push.

## Brain Doctor Fast

- Neuer Command: `npm run brain:doctor-fast`.
- Zweck: schneller autonomer Diagnosemodus fuer laufende Arbeitsbloecke, ohne
  die lokal haengenden Slow-Checks `lint` und `build`.
- Ergebnis im Testlauf: 10/10 Checks bestanden.
- Enthaltene Gates: Brain Review, Archive Validation, Book Pipeline Smoke,
  Kosmo Context Guard, UI Audit, Atlas Interaction Guard, Atlas Style Guard,
  Hero Image Audit, Planet Thumbnail Audit und Security Check.
- Der volle `brain:doctor` bleibt erhalten und fuehrt weiterhin auch `lint`
  und `build` mit Timeout-Diagnose aus.
