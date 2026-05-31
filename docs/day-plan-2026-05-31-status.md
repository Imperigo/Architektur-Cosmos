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

## Heute weiter

Prioritaet fuer die naechsten Bloecke:

1. KosmoData visuell pruefen: Projektklicks, optische Lupe, Dossier, Stilfarben.
2. KosmoAsset-Inspector weiter als lokale Review-Evidenz formulieren.
3. Mobile/Responsive nur dort anfassen, wo Bedienbarkeit sichtbar bricht.
4. Keine R2-Uploads, keine D1-Writes, keine echten Uploads/Auth-Schritte.
5. Bei gutem Stand logisch committen; Publish nur, wenn der sichtbare Stand
   wirklich stabiler ist.
