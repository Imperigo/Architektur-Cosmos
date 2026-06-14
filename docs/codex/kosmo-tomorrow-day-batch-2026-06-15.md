# Kosmo Tagesauftrag 2026-06-15

Status: vorbereitet.

Dieser Tagesauftrag ist der Startpunkt fuer den naechsten grossen Batch. Er bleibt source-free, bis der Owner den Source Root explizit bestaetigt. Keine private Inventory, keine OCR, keine Embeddings, kein Fine-Tuning, keine Local-Worker-Execution und keine Public-Freigabe ohne Gates.

## Hauptziel

ArchitekturKosmos von der heutigen sicheren Readiness-Lage in den ersten echten produktiven Datenlauf fuehren, sobald der Owner die Source-Root-Entscheidung explizit gibt. Falls diese Entscheidung noch fehlt, wird der Tag genutzt, um KosmoReferences, KosmoAsset, Training/Eval, Ontologie und Orbit weiter source-frei, review-only und handoff-synchron vorzubereiten.

## Ausgangslage

- Source Root: pending owner.
- Owner Reply: pending.
- Owner Unlock Pipeline: 11/11 Komponenten, 113/113 Guards.
- Acceptance Certificate: 5 Guard Families, 136/136 bekannte Checks, Certificate Guard 19/19.
- Latest handoff vor Tagesauftrag: 210.
- Orbit DataPanel zeigt Training Template, Review Queue, Ontology Seed, Evening Rollup und Acceptance Cert.
- `public-ready`: 0.

## Morgenstart

1. Pull/Status in `ArchitectureCosmos` und `KosmoOrbit` pruefen.
2. Letzte Handoffs 203-210 lesen.
3. Diesen Tagesauftrag als aktive Arbeitsgrundlage verwenden.
4. Owner nach Source-Root-Antwort fragen, falls noch nicht vorhanden.
5. Keine privaten Inhalte lesen, solange die Owner-Antwort nicht validiert und die Source-Root-Guards nicht bestanden sind.

## Pfad A: Owner Gibt Source-Root-Antwort

Nur ausfuehren, wenn die Antwort explizit vorliegt.

```bash
npm run kosmo:owner-unlock-prompt-pack-check
npm run kosmo:owner-unlock-reply-validator -- --answer "<owner_reply>"
npm run kosmo:owner-unlock-answer-dry-run -- --answer "<owner_reply>"
npm run kosmo:source-root-decision-session-check
npm run kosmo:source-root-blocker-refresh
npm run kosmo:source-root-activation-preflight
npm run kosmo:source-root-post-owner-activation-queue
npm run kosmo:source-root-post-owner-activation-queue-check
```

Wenn und nur wenn diese Kette sauber ist:

```bash
npm run kosmo:private-metadata-inventory
npm run kosmo:private-metadata-inventory-check
```

Danach nur pilot-scoped weiter:

- Villa Savoye
- Kapelle Sogn Benedetg
- Alterszentrum/Kloster Ingenbohl

Keine OCR, keine Volltext-Extraktion, keine Trainingsdaten und keine Public-Freigabe in diesem Schritt.

## Pfad B: Owner-Antwort Fehlt Weiterhin

Wenn Source Root noch blockiert ist, wird nur source-frei gearbeitet:

1. KosmoReferences Pilot-Paket-Schemas haerten.
2. KosmoAsset Kandidaten-Schema und Rights/Review-Felder schaerfen.
3. Architecture Ontology Seed auf konkrete, aber nicht private Feldvertraege erweitern.
4. Eval Row Template und Review Queue um Beispiel-Placeholder ohne Inhalte ergaenzen.
5. Orbit DataPanel weiter als Kontrollcockpit aktualisieren.
6. Claude/KosmoOverseer Handoff schreiben.
7. Acceptance Certificate nach jedem groesseren Block aktualisieren.

## Arbeitsbloecke

### Block 1: Boot und Synchronisation

- Git Status beider Repos pruefen.
- Handoffs 203-210 lesen.
- `npm run kosmo:overseer-sync-board`
- `npm run kosmo:overseer-sync-board-check`
- `npm run kosmo:owner-unlock-pipeline-checkpoint`
- `npm run kosmo:owner-unlock-pipeline-checkpoint-check`

### Block 2: Owner Unlock oder Source-Free Fallback

- Wenn Owner-Antwort vorhanden: Pfad A.
- Wenn nicht: Pfad B.
- Ergebnis immer als Handoff dokumentieren.

### Block 3: KosmoReferences

Ziel: Drei Pilotprojekte aus dem Blocker-Zustand in konkrete, aber weiterhin review-only Arbeitsoberflaechen bringen.

- Villa Savoye: Provenance und vorhandene Public-/Review-Felder schaerfen.
- Sogn Benedetg: Source-Gap und Holzbau-Analyse-Felder vorbereiten.
- Ingenbohl: PDF-/Plan-Slot-Vertrag und Boltshauser-spezifische Analyse-Felder vorbereiten.
- Keine privaten Inhalte oder OCR ohne Freigabe.

### Block 4: KosmoAsset

Ziel: Assets aus Referenzen und Libraries als review-only Kandidaten modellieren.

- Material/Textur-Kandidaten.
- 2D/3D Asset-Slots.
- Bauteil-, Material-, Tragstruktur- und Exportprofil-Felder.
- Rights/Privacy/Public-Ready Gates hart halten.

### Block 5: Kosmo Training/Eval

Ziel: Kosmo KI spaeter sauber trainierbar machen, ohne jetzt Trainingsdaten zu erzeugen.

- Eval Template: keine echten Rows.
- Review Queue: keine Queue Items.
- Ontology: keine privaten Fakten.
- RAG/Eval/Fine-Tune bleibt blockiert bis verified data + owner training gate.

### Block 6: Orbit und Handoff

- DataPanel nur mit Statuszahlen, keine privaten Inhalte.
- Handoff fuer Claude/KosmoOverseer nach jedem grossen Block.
- Acceptance Certificate am Tagesende.

## Tages-Akzeptanzkriterien

- Source Root ist entweder explizit validiert oder weiterhin sauber blockiert.
- Keine privaten Inhalte in Git.
- Keine OCR, Embeddings, Fine-Tunes oder Local Worker Execution ohne Gate.
- KosmoReferences/KosmoAsset/Training/Ontology sind im Orbit sichtbar oder als Handoff dokumentiert.
- Claude/KosmoOverseer wissen, was Codex gemacht hat.
- ArchitectureCosmos und KosmoOrbit sind gepusht.
- Tagesende hat Acceptance Certificate und Next Shift Brief.

## Prioritaeten

1. Owner Source-Root-Antwort validieren.
2. Falls validiert: metadata-only Pilot-Inventory.
3. Falls nicht validiert: source-free Schemas, Ontologie, Review-Queue, Orbit.
4. Handoffs und Acceptance Certificate.

## Startsatz Morgen

> Weiter mit `docs/codex/kosmo-tomorrow-day-batch-2026-06-15.md`. Zuerst Source-Root-Antwort pruefen, sonst source-free Fallback ausfuehren.
