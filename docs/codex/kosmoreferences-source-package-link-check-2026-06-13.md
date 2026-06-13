# KosmoReferences Source-Package Link Check

Datum: 2026-06-13

Codex hat einen separaten Availability-Checker fuer Link-only Source-Packages
angelegt:

```bash
npm run kosmo:source-package-link-check -- \
  --package examples/kosmo-references/source-packages/kapelle-sogn-benedetg-public-source-candidate-2026-06-13/source-package.json
```

## Zweck

Der bestehende `kosmo-source-package-check.mjs` prueft URL-Fingerprints und
lokale Datei-Integritaet, ohne Weblinks zu fetch-en. Der neue
`kosmo-source-package-link-check.mjs` prueft zusaetzlich, ob diese Weblinks
aktuell erreichbar sind.

## Policy

- keine Seiteninhalte speichern;
- keine Screenshots;
- keine Bilder, Plaene oder PDF-Texte kopieren;
- `HEAD` zuerst;
- Fallback nur als `GET` mit `Range: bytes=0-0`, falls `HEAD` blockiert wird;
- Output nur HTTP-Status, finale URL, Content-Type und Content-Length.

## Pilot-Ergebnis

- Villa Savoye Source-Package: 5/5 Links erreichbar, 0 Warnungen.
- Sogn Benedetg Source-Package: 4/4 Links erreichbar, 0 Warnungen.
- Ingenbohl Source-Package: 5/5 Links erreichbar, 0 Warnungen.
- Gesamt: 14/14 Links erreichbar, 0 Warnungen.

## Neue Reports

- `examples/kosmo-references/source-packages/villa-savoye-public-source-candidate-2026-06-13/review/source-package-link-check.generated.json`
- `examples/kosmo-references/source-packages/villa-savoye-public-source-candidate-2026-06-13/review/source-package-link-check.generated.md`
- `examples/kosmo-references/source-packages/kapelle-sogn-benedetg-public-source-candidate-2026-06-13/review/source-package-link-check.generated.json`
- `examples/kosmo-references/source-packages/kapelle-sogn-benedetg-public-source-candidate-2026-06-13/review/source-package-link-check.generated.md`
- `examples/kosmo-references/source-packages/alterszentrum-kloster-ingenbohl-public-source-candidate-2026-06-13/review/source-package-link-check.generated.json`
- `examples/kosmo-references/source-packages/alterszentrum-kloster-ingenbohl-public-source-candidate-2026-06-13/review/source-package-link-check.generated.md`
