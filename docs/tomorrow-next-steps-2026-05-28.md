# Morgenplan 2026-05-28: KosmoAsset vom Review-Gate zum ersten echten Asset-Test

## Ausgangspunkt

Stand nach Abendbatch 2026-05-27:

```text
010c41f Clarify KosmoAsset review gates
```

`main` ist lokal sauber, mit `origin/main` synchron und auf
`architekturkosmos.ch` angekommen. Der Live-Smoke hat bestaetigt, dass der
ausgelieferte Atlas-Bundle die neue `Asset-Ampel` enthaelt.

Letzte lokale Gates:

- `npm run kosmo:asset-full-review -- --library examples/kosmo-assets/kosmo-asset-demo/library.json`: 10/10 passed;
- `npm run lint`: passed;
- `npx tsc --noEmit`: passed;
- `npm run brain:doctor`: 8/8 passed;
- `npm run ui:audit`: 25/25 checks, 6 bekannte Warnings;
- `npm run build:fresh`: passed;
- `git diff --check`: passed.

KosmoAsset ist jetzt besser lesbar:

- UI zeigt Technik, Mensch, Public und Zertifikat als Ampel;
- Human-Review-Session erklaert `approved`, `needs_more_evidence`, `blocked`
  und `rejected`;
- Decision-Ledger und Promotion-Guard zeigen denselben Decision-State;
- Zertifikat ist als Architecture Kosmos Local Quality Certificate V1
  formuliert, aber klar nur als lokale Review-Evidenz;
- KosmoData/KosmoAsset-Grenze ist dokumentiert.

## Tagesziel

Aus der stabilen Gate-Logik soll ein erster echter lokaler Asset-Test werden.
Nicht mehr nur Reports lesen, sondern ein Demo-Asset einmal kontrolliert durch
die lokale Review-Kette fuehren:

1. lokales Asset oeffnen/pruefen;
2. menschliche Entscheidung bewusst setzen;
3. lokales Zertifikat erzeugen;
4. Ledger und Promotion Guard lesen;
5. Public Gate bleibt trotzdem geschlossen;
6. temporaere Testartefakte wieder aufraeumen oder bewusst als Demo-Evidenz
   markieren.

Empfohlener Kandidat: `warm-concrete-material-001` ueber Route `blender`, weil
das Materialprofil den spaeteren Architekturbuero-Workflow gut zeigt, ohne
echte fremde Texturen oder CAD-Dateien zu riskieren.

## Start-Check

Direkt beim Einstieg:

```bash
git status --short --branch --ahead-behind
git log --oneline -5
npm run kosmo:asset-full-review -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

Dann lesen:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-human-review-session.generated.md
examples/kosmo-assets/kosmo-asset-demo/review/asset-decision-ledger.generated.md
examples/kosmo-assets/kosmo-asset-demo/review/asset-promotion-guard.generated.md
docs/kosmo-asset-library.md
```

## Erster Arbeitsschritt

Warm Concrete als lokalen Review-Fall vorbereiten:

```bash
npm run kosmo:asset-review-decision -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset warm-concrete-material-001 \
  --route blender \
  --decision needs-review
```

Danach pruefen, ob Ledger und Promotion Guard die Entscheidung sauber als
`needs_more_evidence` lesen und weiterhin keine Sandbox-/Public-Freigabe
ableiten.

## Danach

Wenn der Needs-Review-Pfad sauber ist:

- einen expliziten lokalen Approval-Test mit benanntem Reviewer nur als
  kontrollierte Demo-Evidenz durchspielen;
- dazu ein lokales Review-Zertifikat erzeugen;
- Promotion Guard muss weiterhin public-blocked bleiben;
- entscheiden, ob die Demo-Decision-Dateien als Beispiel im Repo bleiben oder
  wieder geloescht werden.

## Nicht tun

- keine R2-Uploads;
- keine D1-Writes;
- keine Public Downloads;
- keine echten Blender-Scene-Writes;
- keine ArchiCAD-Projektdateien schreiben;
- keine fremden Texturen, CAD-Dateien oder Produktassets ohne klare Rechte
  einfuehren.
