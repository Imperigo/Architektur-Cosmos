# KosmoAsset Library

Stand: 2026-05-26

## Ziel

`KosmoAsset` ist die eigene Orbit-Station fuer wiederverwendbare 2D-/3D-,
Textur-, Material- und Bauteilressourcen. Sie ist nicht die historische
Referenzbibliothek und nutzt deshalb nicht automatisch das Wurmloch.

KosmoData beantwortet: *Welche Projekte, Quellen, Texte und Relationen gibt es?*

KosmoAsset beantwortet: *Welche geprueften Ressourcen kann ich in Entwurf,
Blender, ArchiCAD, Planwerk oder Visualisierung wiederverwenden?*

## V1-Prinzip

Die erste Version bleibt lokal und review-only:

- keine R2-Uploads;
- keine D1-Writes;
- keine oeffentlichen Downloads;
- keine automatisch public-safe Assets;
- jedes Asset braucht Rechte-, Quellen-, Review- und Exportmetadaten.

## KosmoData/KosmoAsset-Bruecke

KosmoData und KosmoAsset bleiben absichtlich getrennte, aber verbundene
Schichten:

- KosmoData ist Projektwissen: Referenzen, Quellen, Texte, Relationen,
  Buerogedaechtnis und Kontext fuer Entwurfsentscheidungen.
- KosmoAsset ist Materialwissen: wiederverwendbare 2D-/3D-Dateien,
  Materialprofile, Texturen, Layernamen und Software-Handoffs.
- Ein Asset darf auf KosmoData-Projekte oder Quellen verweisen, aber seine
  Freigabe bleibt asset-spezifisch. Ein gutes Projekt macht ein daraus
  abgeleitetes Asset nicht automatisch public-safe.
- Umgekehrt darf ein lokal geprueftes Asset in KosmoData sichtbar sein, ohne
  dadurch ein oeffentlicher Download, R2-Upload oder D1-Write zu werden.

## Human-Gate-Ampel

Die V1-Oberflaeche und die Reports lesen denselben Gate-Zustand:

- Gruen: technische Checks oder lokale menschliche Evidenz sind vorhanden.
- Gelb: menschliche Review oder zusaetzliche Evidenz fehlt.
- Rot: Route, Qualitaet, Rechte oder Decision sind blockiert/abgelehnt.
- Blau: bewusst local-review-only; Public-Gate bleibt geschlossen.

Die menschlichen Entscheid-Zustaende werden auf vier Begriffe reduziert:

| Zustand | CLI-Decision | Bedeutung |
| --- | --- | --- |
| `approved` | `approve-local` | benannte menschliche lokale Freigabe, weiter ohne Public-Gate |
| `needs_more_evidence` | `needs-review` | Quellen, Rechte, Datei, Scale, Layer oder Qualitaet noch offen |
| `blocked` | `block-public` | Public-/Download-/R2-Gate bleibt bewusst zu |
| `rejected` | `reject` | Asset-Route nicht fuer Exchange-Workflows verwenden |

## Manifest

Das zentrale Format ist:

```text
examples/kosmo-assets/{library_slug}/library.json
```

Schema:

```text
schema/kosmo-asset-library.schema.json
```

Demo:

```text
examples/kosmo-assets/kosmo-asset-demo/library.json
```

## Check

```bash
npm run kosmo:asset-library-check -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

Der Check schreibt:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-library-check.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-library-check.generated.md
```

Er prueft:

- Pflichtfelder;
- doppelte Asset-IDs;
- Rechte-Status und `public_use_allowed`;
- lokale Dateipfade;
- geplante R2-Keys;
- Exportziele fuer Blender, ArchiCAD, Web, SVG, DXF und GLB;
- ob geplante Assets noch echte Dateien brauchen.

## Full Review

Der Abendbatch fuehrt die lokale KosmoAsset-Kette in der richtigen Reihenfolge
aus:

```bash
npm run kosmo:asset-full-review -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

Der Full Review schreibt:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-full-review.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-full-review.generated.md
```

Er startet Library Check, Exportplan, Review-Pack, Exchange-Profil,
Handoff-Bundle, Handoff-Smoke, Human-Review-Session, Decision-Ledger,
Zertifikat-Smoke und Promotion-Guard. Der Bericht ist ein lokaler
Tagesabschluss: keine Uploads, keine D1-/R2-Writes, keine Public-Gates und
keine automatische Freigabe.

## Review-Pack

Nach Check und Exportplan kann ein kompaktes menschliches Asset-Review-Pack
erzeugt werden:

```bash
npm run kosmo:asset-review-pack -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

Der Review-Pack schreibt:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-review-pack.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-review-pack.generated.md
```

Er fasst lokale Dateien, Export-Routen, Rechte, Review-Status,
Generated-Profile und offene menschliche Checks zusammen. Er promoted kein
Asset, oeffnet keine Public-Gates und laedt nichts hoch.

## Exchange-Profil

Aus Library, Review-Pack und Exportplan wird ein lokales Uebergabeprofil fuer
Blender, ArchiCAD und Web erzeugt:

```bash
npm run kosmo:asset-exchange-profile -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

Das Exchange-Profil schreibt:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-exchange-profile.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-exchange-profile.generated.md
```

Es enthaelt Blender-Collectionnamen, ArchiCAD-Layer/Oberflaechen,
Source-Dateien, Public-Gates und Review-Notizen. V1 importiert nichts
automatisch und schreibt keine ArchiCAD-/Blender-Dateien.

## Handoff-Bundle

Aus dem Exchange-Profil kann ein lokales Uebergabepaket erzeugt werden:

```bash
npm run kosmo:asset-handoff-bundle -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

Das Bundle schreibt:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-bundle.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-bundle.generated.md
examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-handoff.generated.py
examples/kosmo-assets/kosmo-asset-demo/review/asset-archicad-schedule.generated.csv
```

Die Blender-Datei ist standardmaessig nicht mutierend (`ALLOW_SCENE_WRITE =
False`). Die ArchiCAD-Datei ist nur ein Layer-/Surface-Schedule fuer manuelle
Review und spaetere Exchange-Tests.

## Handoff-Smoke

Das Handoff-Bundle kann lokal geprueft werden, bevor jemand die Dateien in
Blender oder ArchiCAD anschaut:

```bash
npm run kosmo:asset-handoff-smoke -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

Der Smoke schreibt:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-smoke.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-handoff-smoke.generated.md
```

Er fuehrt die Blender-Python-Datei im Review-only-Modus aus, prueft
`ALLOW_SCENE_WRITE = False`, CSV-Zeilen, lokale Source-Dateien und blockierte
Public-Gates. Er importiert keine Assets und schreibt keine Projektdateien.

## Human-Review-Session

Wenn der Abendbatch technisch durchlaeuft, aber menschliche Entscheidungen
offen bleiben, erzeugt die Review-Session eine editierbare lokale Checkliste:

```bash
npm run kosmo:asset-human-review-session -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

Der Befehl schreibt:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-human-review-session.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-human-review-session.generated.md
```

Die Session sammelt pro Asset offene Review-Punkte, Haupt-Route,
Rechte-/Source-Gate, lokale Datei-/Profil-Evidenz, Smoke-Status und sichere
Entscheidbefehle. Sie ist bewusst noch kein Zertifikat: Der `certificate_seed`
ist nur eine Vorstufe fuer spaetere menschliche Qualitaetsbestaetigung.

## Decision-Ledger

Das Decision-Ledger liest vorhandene Review-Decision-Dateien, erzeugt aber
selbst keine Entscheidung:

```bash
npm run kosmo:asset-decision-ledger -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

Der Output zeigt, welche erwarteten Asset-/Routen-Entscheidungen fehlen, welche
lokal freigegeben, blockiert, abgelehnt oder noch `needs-review` sind. Wenn
lokale Review-Zertifikate existieren, werden sie ebenfalls in diese Buchhaltung
eingelesen:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-decision-ledger.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-decision-ledger.generated.md
```

Das Ledger ist die Buchhaltung zwischen Human-Review-Session, Review-Entscheid,
Zertifikat und Sandbox. Es oeffnet keine Public-Gates und verhindert, dass eine
Sandbox aus impliziter oder versehentlicher Freigabe abgeleitet wird.
Der Markdown-Bericht zeigt pro Asset zusaetzlich Reviewer-Gate,
Zertifikat-Status, Sandbox-Status, Promotion-Blocker und die naechste
menschliche Aktion.

## Lokale Review-Entscheidung

Nach Review-Pack, Handoff-Bundle und bestandenem Smoke kann eine menschliche
lokale Freigabe als Evidenz notiert werden:

```bash
npm run kosmo:asset-review-decision -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset warm-concrete-material-001 \
  --route blender \
  --decision approve-local \
  --confirm-human-review \
  --reviewer "REPLACE_WITH_REVIEWER_NAME"
```

Der Befehl schreibt nur lokale Review-Dateien:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-review-decision-warm-concrete-material-001-blender.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-review-decision-warm-concrete-material-001-blender.generated.md
```

Er verlangt fuer `approve-local` und `reject` einen benannten menschlichen
Reviewer. Platzhalter wie `REPLACE_WITH_REVIEWER_NAME` oder `owner` werden
nicht als echte Freigabe akzeptiert. Der Befehl veraendert die Bibliothek nicht,
importiert nichts in Blender, schreibt keine Projektdateien, laedt nichts hoch
und oeffnet keine Public-Gates. Fuer echte Blender-/ArchiCAD-Tests bleibt danach
weiterhin eine kopierte Sandbox-Datei noetig.

## Lokales Review-Zertifikat

Nach einer expliziten lokalen Review-Entscheidung kann ein Zertifikat erzeugt
werden, das Human-Review-Session, Entscheidung, Handoff-Smoke, lokale Dateien
und das weiterhin blockierte Public-Gate zusammen prueft:

```bash
npm run kosmo:asset-review-certificate -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset warm-concrete-material-001 \
  --route blender
```

Der Befehl schreibt:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-review-certificate-warm-concrete-material-001-blender.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-review-certificate-warm-concrete-material-001-blender.generated.md
```

Das Zertifikat ist ein **Architecture Kosmos Local Quality Certificate V1**.
Es bestaetigt nur lokale Review-Evidenz fuer Sandbox-Tests: benannter
menschlicher Architektur-Review, Quellen-/Rechte-Check, AI-Slop-Qualitaetsgate,
Handoff-Smoke und weiterhin blockiertes Public-Gate. Es ist keine offizielle
externe Zertifizierung, keine Rechtsmeinung, keine Public-Freigabe, kein
Upload, kein D1-/R2-Write, keine Library-Mutation und keine
ArchiCAD-/Blender-Projektdatei-Aenderung.

## Zertifikat-Smoke

Der Zertifikat-Gate kann getestet werden, ohne bleibende Entscheid- oder
Zertifikatsdateien zu hinterlassen:

```bash
npm run kosmo:asset-certificate-smoke -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset warm-concrete-material-001 \
  --route blender
```

Der Smoke erzeugt kurz eine lokale Freigabe, erzeugt daraus ein Zertifikat,
laesst das Decision-Ledger diese Zertifizierung sehen und entfernt danach die
temporaeren Decision-/Certificate-Artefakte wieder. Uebrig bleibt nur:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-certificate-smoke.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-certificate-smoke.generated.md
```

Damit kann das Brain den Gate regelmaessig pruefen, ohne den Review-Ordner mit
Pseudo-Freigaben zu verschmutzen.

## Promotion-Guard

Bevor aus lokalen Assets irgendwann ein oeffentliches Paket entstehen duerfte,
blockiert der Promotion-Guard alle unsicheren Zustaende:

```bash
npm run kosmo:asset-promotion-guard -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

Der Guard prueft Full-Review, Review-Pack, Decision-Ledger, Public-Gates,
Zertifikate, Sandbox-Status und Upload-Policies. Wenn Reviews, Decisions oder
Zertifikate fehlen, ist das ein erwarteter Blocker und keine Fehlfreigabe. Ein
Fehler entsteht erst, wenn ein Public-/Upload-Gate unsicher offen waere. Er
uebernimmt die gleichen Promotion-Blocker-Begriffe wie das Decision-Ledger,
damit Reviewer-Gate, Zertifikat, Sandbox und naechste menschliche Aktion in
beiden Reports gleich lesbar sind. Er promoted nichts und schreibt nur:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-promotion-guard.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-promotion-guard.generated.md
```

V1 erwartet in der Demo bewusst `asset_promotion_guard_blocked`, weil noch keine
echten menschlichen Review-Entscheide und lokalen Zertifikate existieren. Das
ist korrekt: KosmoAsset bleibt local-review-only.

## Blender-Sandbox

Nach einer lokalen Review-Entscheidung und bestandenem Handoff-Smoke kann eine
Blender-Sandbox-Datei vorbereitet werden:

```bash
npm run kosmo:asset-blender-sandbox -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset warm-concrete-material-001 \
  --route blender
```

Der Output bleibt lokal:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-sandbox-warm-concrete-material-001.generated.py
examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-sandbox-warm-concrete-material-001.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-blender-sandbox-warm-concrete-material-001.generated.md
```

Die Python-Datei ist fuer eine kopierte `.blend`-Sandbox gedacht. Sie erstellt
nur `KOSMO_SANDBOX`-Collections, Material-/Layer-Platzhalter und speichert oder
oeffnet keine Projektdateien. Aus normalem System-Python heraus beendet sie sich
ohne Aenderungen.

## ArchiCAD-Sandbox

Der gleiche lokale Review-Gate existiert fuer ArchiCAD als CSV-Schedule:

```bash
npm run kosmo:asset-review-decision -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset warm-concrete-material-001 \
  --route archicad \
  --decision approve-local \
  --confirm-human-review \
  --reviewer "REPLACE_WITH_REVIEWER_NAME"

npm run kosmo:asset-archicad-sandbox -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset warm-concrete-material-001 \
  --route archicad
```

Der Output bleibt ein manueller Sandbox-Schedule:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-archicad-sandbox-warm-concrete-material-001.generated.csv
examples/kosmo-assets/kosmo-asset-demo/review/asset-archicad-sandbox-warm-concrete-material-001.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-archicad-sandbox-warm-concrete-material-001.generated.md
```

Er schreibt keine `.pln`-Datei und erzeugt keine echten ArchiCAD-Attribute. Die
CSV dient als kontrollierte Layer-/Surface-Vorlage fuer eine kopierte
ArchiCAD-Sandbox.

## Demo-GLB

Das erste lokale 3D-Testasset wird bewusst klein und analytisch erzeugt:

```bash
npm run kosmo:asset-generate-demo-glb -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset generic-column-glb-001
```

Der Generator schreibt:

```text
examples/kosmo-assets/kosmo-asset-demo/assets/models/generic-column-glb-001.glb
examples/kosmo-assets/kosmo-asset-demo/review/asset-glb-generation.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-glb-generation.generated.md
```

Dieses GLB ist ein lokales Review-Bauteil, keine vermessene BIM-Komponente und
kein oeffentlicher Download. Es dient dazu, Scale, Origin, Layernamen und den
Blender/Web/ArchiCAD-Austausch frueh zu pruefen.

## Demo-DXF

Das erste lokale 2D-/CAD-Testasset erzeugt das Achsensymbol als DXF:

```bash
npm run kosmo:asset-generate-demo-dxf -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset axis-marker-svg-001
```

Der gleiche Generator kann auch fuer das GLB-Stuetzenasset einen
diagrammatischen CAD-Footprint erzeugen:

```bash
npm run kosmo:asset-generate-demo-dxf -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset generic-column-glb-001
```

Der Generator schreibt:

```text
examples/kosmo-assets/kosmo-asset-demo/assets/dxf/axis-marker-svg-001.dxf
examples/kosmo-assets/kosmo-asset-demo/assets/dxf/generic-column-glb-001.dxf
examples/kosmo-assets/kosmo-asset-demo/review/asset-dxf-generation.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-dxf-generation.generated.md
```

Auch diese DXFs sind lokale Review-Assets. Sie pruefen Layernamen, Scale,
Origin und CAD-Austausch, ohne daraus oeffentliche Downloads zu machen.

## Demo-Materialprofil

Das erste lokale Material-Testasset erzeugt kein Bild und keine Textur, sondern
ein Review-Profil fuer prozedurale Materialparameter:

```bash
npm run kosmo:asset-generate-demo-material-profile -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset warm-concrete-material-001
```

Der Generator schreibt:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-material-profile.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-material-profile.generated.md
```

Das Profil prueft Base Color, Roughness, Metallic, Specular sowie Blender- und
ArchiCAD-Mappingnamen. Es bleibt review-only, nutzt keine gesampelte Textur und
oeffnet keine Public-Gates.

## Asset-Typen

V1 unterstuetzt die wichtigsten spaeteren Bibliotheksgruppen:

- `2d_symbol`
- `vector_plan_component`
- `texture`
- `material`
- `glb_model`
- `blender_collection`
- `archicad_layer`
- `detail`
- `component`
- `landscape`
- `lighting`
- `render_preset`

## Rechte-Regel

Nur diese Rechte duerfen langfristig public-ready werden:

- `own_work`
- `public_domain`
- `licensed`

Alles andere bleibt lokal, privat oder review-only:

- `unknown`
- `needs_permission`
- `private_research`
- `generated_needs_review`

Generated Assets sind nicht automatisch public-safe. Auch eigene generierte
2D-/3D-/Material-Assets brauchen Review, weil sie aus geschuetzten Quellen,
Projektbildern oder Buchscans abgeleitet sein koennten.

## Naechster Schritt

Nach dem Check folgt ein KosmoAsset-UI-Prototyp:

1. lokale Asset-Library laden;
2. Assets nach Typ, Material, Exportziel und Rechte-Status filtern;
3. Vorschau fuer SVG/Material/GLB anzeigen;
4. Exportpakete fuer Blender/ArchiCAD vorbereiten;
5. keine Veroeffentlichung ohne Rights Gate.
