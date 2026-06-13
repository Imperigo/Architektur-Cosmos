# KosmoReferences Owner Review Brief

Datum: 2026-06-13
Status: review-only, keine Public-Promotion

## Kurzstand

- Decision-Gruppen: 4
- Decision-Items: 10
- Public-ready jetzt: 0
- Confirm-Commands erst nach Owner Review: 2
- Check-Status: passed, 0 Failures, 0 Warnings

Dieser Brief ist eine Lesefassung des Owner-Review-Packs. Er trifft keine
Freigabeentscheidung und setzt nichts auf `public_ready=true`.

## 1. Villa Savoye Bildkandidaten

Diese drei Dateien sind Kandidaten fuer oeffentliche Anzeige nach Human Review:

1. `public/archive-media/villa-savoye/exterior/savoye-3-exterior-cc0.jpg`
   - Entscheidung: freigeben oder blockiert lassen.
   - Sicherer Default: nur freigeben, wenn Seitenzustand/Quelle nochmals passt.

2. `public/archive-media/villa-savoye/exterior/villa-savoye-loc-exterior.jpg`
   - Entscheidung: freigeben oder blockiert lassen.
   - Sicherer Default: nur freigeben, wenn LOC-/Credit-/Rights-Hinweis akzeptiert ist.

3. `public/archive-media/villa-savoye/interior/villa-savoye-chaise-longue-interior-cc-by-sa-2.jpg`
   - Entscheidung: freigeben oder blockiert lassen.
   - Sicherer Default: nur freigeben, wenn Attribution und ShareAlike-Pflichten akzeptiert sind.

Empfehlung Codex: Noch nicht automatisch freigeben. Erst explizit pro Datei
Owner-Entscheid erfassen.

## 2. Villa Savoye abgeleitete/blockierte Dateien

Diese vier Dateien sollen blockiert bleiben oder eine separate Source-Basis-
Review bekommen:

- `public/archive-media/villa-savoye/exterior/villa-savoye-loc-exterior-crop.jpg`
- `public/archive-media/villa-savoye/plan/villa-savoye-ground-floor-diagram.svg`
- `public/archive-media/villa-savoye/section/villa-savoye-long-section-diagram.svg`
- `public/archive-models/villa-savoye/low.glb`

Empfehlung Codex: Blockiert lassen, bis Derivat-, Plan-, Schnitt- und Modell-
Grundlage separat geprueft ist.

## 3. Modell-Promotion

Zwei Modelle sind technisch bereit fuer Owner Confirmation, aber nicht public-
cleared:

- Villa Savoye: Score 92
- Alterszentrum Kloster Ingenbohl: Score 100

Moegliche Commands nach explizitem Review:

```bash
npm run brain:promote-model -- --entry villa-savoye --confirm-public-model
npm run brain:promote-model -- --entry alterszentrum-kloster-ingenbohl --confirm-public-model
```

Empfehlung Codex: Diese Commands noch nicht ausfuehren. Erst akzeptieren, dass
die Modelle diagrammatische, nicht vermessene Studienobjekte sind.

## 4. Sogn Benedetg Source Gap

Aktueller Status:

- link-only
- keine lokalen Dateien
- grosse private Buch-/ETH-/HSLU-Library nicht sichtbar
- `/mnt/archiv` nicht als eigener Mount sichtbar

Empfehlung Codex: Sogn bleibt link-only, bis der echte private Library-Pfad
gefunden oder gemountet ist. Lokale Studienassets duerfen nur `review-only` und
`private_research` bleiben.

## Owner-Entscheidungsformat

Bitte spaeter pro Item eine der folgenden Haltungen erfassen:

- `approve_public_display_after_review`
- `keep_blocked`
- `open_separate_source_basis_review`
- `needs_more_source_context`

Ohne expliziten Owner-Entscheid bleibt alles blockiert.

