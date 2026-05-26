# KosmoAsset Library

Stand: 2026-05-25

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

Der Generator schreibt:

```text
examples/kosmo-assets/kosmo-asset-demo/assets/dxf/axis-marker-svg-001.dxf
examples/kosmo-assets/kosmo-asset-demo/review/asset-dxf-generation.generated.json
examples/kosmo-assets/kosmo-asset-demo/review/asset-dxf-generation.generated.md
```

Auch dieses DXF ist ein lokales Review-Asset. Es prueft Layernamen, Scale und
CAD-Austausch, ohne daraus einen oeffentlichen Download zu machen.

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
