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

## Erster Stabilitaetsblock

KosmoData:

- Search-Trigger erhaelt eine stabile UI-Markierung und hoehere HUD-Prioritaet.
- Wurmloch-Node-Opacity-Transition in Bewegung wurde entfernt, damit Objekte
  beim Scrollen nicht weich nachflackern.
- Stilbeschriftungen richten Buchstaben wieder konsequenter zum Zentrum aus;
  Klickflaechen bleiben robust.
- Projektplaneten haben groessere unsichtbare Hitboxes, damit Klicks in
  normaler Ansicht und optischer Lupe leichter treffen.
- Hero-/Planetenbild-Audit: 79/112 Eintraege haben rechteklare Hauptbilder,
  keine Duplikat-URLs, keine blockierten/unklaren Public-Lizenzen.

KosmoAsset:

- Schmale/mobile Ansicht bekommt ein echtes internes Scrollverhalten.
- Shell, Karten, Metrics und Inspector stacken defensiver, damit Karten und
  Inspektor nicht gegeneinander laufen.
- Asset-Library-Check und Handoff-Smoke sind gruen; Warm Concrete bleibt als
  lokaler Blender-/Review-Pilot sichtbar, aber public-gated.
- Zweiter Asset-Pfad gestartet: `generic-column-glb-001` ist bewusst als
  `needs-review` / `local_review_note_recorded` verbucht. Das ist keine lokale
  Freigabe, kein Zertifikat und keine Sandbox-Erlaubnis, sondern eine saubere
  Review-Spur fuer die naechste menschliche GLB-/Blender-Pruefung.
- KosmoData-Bruecke im Asset-Inspector sichtbar gemacht: Referenzprojekte wie
  `villa-savoye` und `pantheon` duerfen als Kontextsprache dienen, aber die
  Asset-Freigabe bleibt ein eigener Rechte-, Review- und Public-Gate-Prozess.

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
