# Villa Savoye File-Level Provenance Inventory

Datum: 2026-06-13

Codex hat die lokalen Villa-Savoye-Medien und das lokale Modell file-level
inventarisiert.

## Dateien

- `examples/kosmo-references/provenance/villa-savoye-file-level-provenance-2026-06-13.json`
- `examples/kosmo-references/provenance/villa-savoye-file-level-review/file-provenance-check.generated.json`
- `examples/kosmo-references/provenance/villa-savoye-file-level-review/file-provenance-check.generated.md`

## Ergebnis

- Dateien: 7
- Medien: 6
- Modell: 1
- Public-ready: 0
- Blockiert: 7
- Checker: `passed`, 0 Failures, 0 Warnings

Slots:

- Exterior: 3
- Interior: 1
- Plan: 1
- Section: 1
- Model: 1

## Wichtig

Dateinamen wie `cc0`, `cc-by-sa` oder `loc` sind nur Hinweise, keine
Rechtefreigabe. Public-Promotion braucht file-level:

- Originalquelle/URL;
- Creator/Autor;
- Lizenz oder Rights Advisory;
- Attributionstext;
- Entscheidung, ob eine Ableitung oder Bearbeitung vorliegt;
- menschliches Review.

## Naechste Schritte

1. Quellen-/Attributionsfelder fuer jedes Bild ergaenzen.
2. Entscheiden, ob Plan/Schnitt eigene analytische Diagramme oder abgeleitete
   Reproduktionen sind.
3. Build-Log/Source-Basis fuer `low.glb` erfassen.
4. Bis dahin alle sieben Dateien im Public-Gate blockiert lassen.

## Check

```bash
npm run kosmo:reference-file-provenance-check -- \
  --inventory examples/kosmo-references/provenance/villa-savoye-file-level-provenance-2026-06-13.json \
  --out examples/kosmo-references/provenance/villa-savoye-file-level-review
```
