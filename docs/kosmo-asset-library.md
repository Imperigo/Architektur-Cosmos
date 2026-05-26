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
Handoff-Bundle und Handoff-Smoke. Der Bericht ist ein lokaler Tagesabschluss:
keine Uploads, keine D1-/R2-Writes, keine Public-Gates und keine automatische
Freigabe.

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

## Lokale Review-Entscheidung

Nach Review-Pack, Handoff-Bundle und bestandenem Smoke kann eine menschliche
lokale Freigabe als Evidenz notiert werden:

```bash
npm run kosmo:asset-review-decision -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset warm-concrete-material-001 \
  --route blender \
  --decision approve-local \
  --confirm-human-review
```

Der Befehl schreibt nur lokale Review-Dateien:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-review-decision-warm-concrete-material-001-blender.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-review-decision-warm-concrete-material-001-blender.generated.md
```

Er veraendert die Bibliothek nicht, importiert nichts in Blender, schreibt keine
Projektdateien, laedt nichts hoch und oeffnet keine Public-Gates. Fuer echte
Blender-/ArchiCAD-Tests bleibt danach weiterhin eine kopierte Sandbox-Datei
noetig.

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
