# Morgenplan 2026-05-24: KosmoData Pipeline statt manuelle Einträge

## Ausgangspunkt

Der Stand vom Abend ist lokal gespeichert. Die neue KosmoData-Enrichment-Pipeline
existiert und wurde mit `crystal-palace` erfolgreich getestet:

```bash
npm run kosmodata:enrich -- --entry crystal-palace
npm run kosmodata:promote -- --entry crystal-palace --confirm
```

Wichtig: Die Pipeline schreibt erst nach Review und `--confirm` in
`data/mock-entries.json`. Sie lädt nichts hoch, schreibt nicht nach D1/R2 und
publisht nicht automatisch.

## Ziel für morgen

Die Pipeline soll weniger manuelle Seed-Arbeit brauchen. Nächster Schritt ist,
dass Research-Agenten aus Quellenpaketen automatisch
`data/kosmodata-enrichment-seeds.json`-Kandidaten vorbereiten. Die ownerseitige
Review prüft dann nur noch Review-Pack und Promotion.

## Block 1: Seed Generator aus Research Packs

- Neues Tool entwerfen:

```bash
npm run kosmodata:seed-from-research -- --entry red-house
```

- Input:
  - bestehender Eintrag aus `data/mock-entries.json`;
  - Research-Agent-Outputs aus `out/database-research/...`;
  - optional manuelle Quellenliste.

- Output:
  - `out/kosmodata-enrichment/{slug}/seed-candidate.json`;
  - `out/kosmodata-enrichment/{slug}/seed-candidate.md`;
  - kein automatisches Schreiben in `data/kosmodata-enrichment-seeds.json`.

- Pflichtfelder im Seed:
  - source_candidates;
  - architecture_text mit 9 Fragenkapiteln;
  - media slots;
  - geo/materials/program/context;
  - database_tags;
  - model_assets;
  - analysis_layers;
  - rights summary.

## Block 2: Crystal-Palace-Pipeline als Standard prüfen

- Prüfen, ob `crystal-palace` nach Promotion weiterhin alle Gates besteht:

```bash
npm run archive:validate
npm run database:profile-audit
npm run database:hero-images:audit
npm run database:planet-thumbnails:audit
npm run lint
npx tsc --noEmit
npm run security:check
npm run i18n:check
```

- Wenn lokal möglich: `npm run build`.
- Bekannter lokaler Blocker bleibt das macOS/Next-SWC-Code-Signature-Problem.

## Block 3: Nächsten Eintrag über Pipeline, nicht manuell

Nächster Kandidat aus dem Audit:

1. `red-house`
2. `cite-industrielle`
3. `fagus-factory`
4. `bauhaus-dessau`

Morgen nicht direkt JSON schreiben. Stattdessen:

```bash
npm run kosmodata:seed-from-research -- --entry red-house
npm run kosmodata:enrich -- --entry red-house
```

Erst wenn Review-Pack gut ist:

```bash
npm run kosmodata:promote -- --entry red-house --confirm
```

## Block 4: Brain-Integration

- `data/brain-tools.json` erweitern um:
  - `kosmodata_seed_from_research`;
  - Review-Output-Pfade;
  - Approval-Gate.

- `brain:review` soll künftig melden:
  - welche Einträge keine Profile haben;
  - welche Einträge einen Seed-Kandidaten brauchen;
  - welche Seed-Kandidaten bereit für `kosmodata:enrich` sind;
  - welche Review-Packs bereit für Promotion sind.

## Block 5: Website-Dev-UI vorbereiten

Noch keine echte Schreibfunktion im Browser. Aber UI-Konzept vorbereiten:

- Dev-Knopf in KosmoData:
  - “Seed vorbereiten”;
  - “Review-Pack anzeigen”;
  - “Promotion-Befehl kopieren”.

- Klare Kennzeichnung:
  - lokal;
  - review-only;
  - keine Cloud-Writes;
  - keine Veröffentlichung ohne Bestätigung.

## Block 6: Qualitätsstandard bewahren

Jeder automatisch vorbereitete Eintrag muss die neue Textstruktur erfüllen:

- These;
- Netzwerk und DNA;
- Topos;
- Typos;
- Tektonik;
- Raumlogik;
- Konflikt und Kritik;
- KosmoData-Layer und 3D-Potenzial;
- Entwurfsintelligenz.

Keine Wikipedia-Prosa. Keine ungesicherten Behauptungen. Keine öffentlichen
geschützten Medien. Öffentliche Bilder nur mit klarer Lizenz, Quelle und Credit.

## Morgen-Navigation

Wenn wir weitermachen, zuerst diesen Satz verwenden:

> Wir fahren mit `docs/tomorrow-next-steps-2026-05-24.md` fort und bauen den
> Seed Generator aus Research Packs.
