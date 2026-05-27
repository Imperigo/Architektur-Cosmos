# Pausen-Handoff 2026-05-27: KosmoAsset nach Warm-Concrete-Blender-Test

## Aktueller Stand

Stand beim Pausenabschluss:

```text
main / origin/main: wird nach diesem Handoff gepusht
Warm Concrete: lokal freigegeben, lokal zertifiziert, Blender-Background-Test bestanden
Public/R2/D1: weiterhin gesperrt
```

Wichtigste erledigte Schritte:

- `warm-concrete-material-001` wurde von Andrin Baumann menschlich geprüft.
- Die Route `blender` wurde mit `approve-local` verbucht.
- Das lokale KosmoAsset-Zertifikat ist grün: `asset_local_review_certified`, 15/15 Checks.
- Der Decision-Ledger liest Warm Concrete als `local_approval_recorded`.
- Warm Concrete ist `sandbox_ready: true`.
- Der Promotion Guard bleibt insgesamt blockiert: keine öffentliche Freigabe, keine R2/D1-Aktion.
- Der echte Blender-Background-Lauf mit Blender 5.1.2 hat bestanden.
- Erzeugte Blender-Sandbox-Evidenz:
  - `examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-sandbox-warm-concrete-material-001.generated.py`
  - `examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-sandbox-warm-concrete-material-001.blender-run.generated.json`
  - `examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-sandbox-warm-concrete-material-001.blender-run.generated.md`

## Letzte wichtige Checks

Zuletzt erfolgreich:

```bash
npm run kosmo:asset-review-decision -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset warm-concrete-material-001 --route blender --decision approve-local --confirm-human-review --reviewer "Andrin Baumann"
npm run kosmo:asset-review-certificate -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset warm-concrete-material-001 --route blender
npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmo-asset-demo/library.json
npm run kosmo:asset-blender-sandbox -- --library examples/kosmo-assets/kosmo-asset-demo/library.json --asset warm-concrete-material-001 --route blender
npm run i18n:check
npm run ui:audit
git diff --check
```

Der Blender-Background-Test wurde ueber die Steam-Blender-App ausgefuehrt:

```text
/Users/andrinbaumann/Library/Application Support/Steam/steamapps/common/Blender/Blender.app/Contents/MacOS/Blender
```

Ergebnis:

- Blender-Version: `5.1.2`
- Status: `blender_background_sandbox_passed`
- Collection `KOSMO_SANDBOX/warm-concrete-material-001`: vorhanden
- Material `KOSMO_MAT_warm-concrete-material-001`: vorhanden
- Review-Anker: 6/6
- Keine `.blend`-Datei wurde gespeichert.

## Nächster sinnvoller Einstieg

Wenn wir in ein paar Tagen weitermachen:

1. Repo-Stand prüfen:

```bash
git status --short --branch
git log --oneline -8
```

2. KosmoAsset-Gesamtzustand prüfen:

```bash
npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

3. Entscheiden, welcher Pfad als Nächstes kommt:

- **Option A:** Warm Concrete UI/Orbit so anzeigen, dass `sandbox_ready` und Zertifikat sichtbar werden.
- **Option B:** Nächstes Asset prüfen: `generic-column-glb-001` über Blender.
- **Option C:** ArchiCAD/Schedule-Pfad als lokalen Review-Test vorbereiten.

Empfehlung: Option A zuerst, weil der geprüfte Erfolg dann im Interface sichtbar wird und KosmoAsset als Workflow verständlicher wird.

## Nicht tun

- Keine R2-Uploads.
- Keine D1-Writes.
- Keine Public Downloads.
- Keine produktiven Blender-Dateien überschreiben.
- Keine fremden Texturen, CAD-Dateien oder Produktassets ohne klare Rechte einführen.
- Keine öffentliche Zertifizierung behaupten: Das Zertifikat bleibt ein lokaler Architecture-Kosmos-Qualitätsnachweis.
