# Naechster Einstieg: KosmoAsset, KosmoData und Website-Polish

## Ausgangspunkt

Stand nach Spaetbatch 2026-05-27:

```text
5566d20 Record Warm Concrete Blender run
7d8e2a0 Polish KosmoAsset exchange labels
```

`main` war vor dem letzten Sicherungspush sauber bis auf den lokalen
KosmoAsset-Label-Commit `7d8e2a0`. Beim naechsten Einstieg zuerst pruefen, ob
dieser Commit auf `origin/main` angekommen ist.

Letzte gesicherte Richtung:

- KosmoAsset-Orbit ist live-ready und sichtbar im Hub.
- Warm Concrete hat eine lokale Blender-Sandbox-Evidenz.
- KosmoAsset-Reviewwerte werden im Frontend deutlich deutscher formatiert:
  `Entscheid fehlt`, `KosmoData-Bruecke dokumentiert`, `Massstab, Ursprung und
  Layer geprueft`, `DXF-Unterlage / Symbol`, `Material aus Parametern`,
  `GLB als Collection verlinken`.
- Frischer Live-Smoke mit Cache-Buster zeigte keine alten Rohwerte wie
  `MISSING DECISION`, `7 ENTITIES` oder `Scale, Origin`.
- `git diff --check` war sauber.
- `npm run lint` und `npm run security:check` hingen lokal beim letzten Lauf
  wieder mit 0% CPU; das wurde als lokales Tooling-Problem notiert, nicht als
  Produktcode-Fehler.

KosmoAsset ist jetzt besser lesbar:

- UI zeigt Technik, Mensch, Public und Zertifikat als Ampel;
- Human-Review-Session erklaert `approved`, `needs_more_evidence`, `blocked`
  und `rejected`;
- Decision-Ledger und Promotion-Guard zeigen denselben Decision-State;
- Zertifikat ist als Architecture Kosmos Local Quality Certificate V1
  formuliert, aber klar nur als lokale Review-Evidenz;
- KosmoData/KosmoAsset-Grenze ist dokumentiert;
- Export-/Exchange-Routen wirken im UI weniger wie rohe Tool-Ausgaben.

## Tagesziel

Die naechste Arbeitsphase soll den stabilen KosmoAsset-Stand nutzen und danach
wieder zur sichtbaren Website-Qualitaet wechseln. Empfohlene Reihenfolge:

1. Synchronitaet pruefen: `git status`, `git log`, Live-Cache-Buster.
2. KosmoAsset schnell visuell testen: Hub -> KosmoAsset, Inspector,
   Reviewkarten, Exchange-Labels.
3. Danach einen kleinen Website-Polishblock waehlen:
   - KosmoData-Projektklicks und Wurmloch-Flackern;
   - KosmoAsset-Workspace weiter visuell ausbauen;
   - Mobile/Touch-HUD nochmals ruhiger machen.
4. Erst danach den naechsten Brain-/Pipeline-Block starten.

Empfohlener technischer Kandidat bleibt `warm-concrete-material-001` ueber
Route `blender`, weil dieses Demo-Material den spaeteren Architekturbuero- und
Blender/ArchiCAD-Workflow gut zeigt, ohne echte fremde Texturen oder CAD-Dateien
zu riskieren.

## Start-Check

Direkt beim Einstieg:

```bash
git status --short --branch --ahead-behind
git log --oneline -5
git diff --check
```

Dann optional, wenn die lokale Toolchain nicht haengt:

```bash
npm run kosmo:asset-full-review -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
npm run lint
npm run security:check
```

Wichtige Dateien:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-human-review-session.generated.md
examples/kosmo-assets/kosmo-asset-demo/review/asset-decision-ledger.generated.md
examples/kosmo-assets/kosmo-asset-demo/review/asset-promotion-guard.generated.md
examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-sandbox-warm-concrete-material-001.blender-run.generated.md
docs/kosmo-asset-library.md
```

## Erster Arbeitsschritt

Kleiner, sicherer Start: Live-Website mit Cache-Buster oeffnen und in
KosmoAsset pruefen, ob die Review-/Exchange-Begriffe weiterhin deutsch bleiben.
Wenn ja, weiter mit einem sichtbaren Website-Bugblock; wenn nein, zuerst
Bundle/Deploy/Cache pruefen.

## Danach

Wenn KosmoAsset visuell stabil ist:

- KosmoData-Projektklicks und Detail-Dossier nochmals testen;
- Wurmloch-Objektflackern und Sektorfarbzuordnung weiter haerten;
- KosmoAsset als eigene Asset-Bibliothek visuell ausbauen;
- Brain-/Pipeline-Schritte erst wieder anfassen, wenn die sichtbare Website
  ruhig und klicksicher bleibt.

## Nicht tun

- keine R2-Uploads;
- keine D1-Writes;
- keine Public Downloads;
- keine echten Blender-Scene-Writes;
- keine ArchiCAD-Projektdateien schreiben;
- keine fremden Texturen, CAD-Dateien oder Produktassets ohne klare Rechte
  einfuehren.
