# Schema-Erweiterung für Wettbewerbs-Reference-Library

**Status**: Codex-Briefing nach Konzept-Session 2026-05-19.
**Hintergrund**: Ergänzt `docs/blender-wettbewerb-integration.md` und `docs/ai-reference-archive-vision.md`. Definiert konkret welche Schema-Felder die Wettbewerbs-Reference-Library-Funktion braucht.

## Konzept-Entscheidungen aus der Session

- **Skalierung**: 50-100 sehr tiefe Einträge (kein Auto-Massen-Import). Flower-House-Standard für alle.
- **Vier gleichberechtigte Match-Signale**: Programm-Typ, Material+Tektonik, Topografie+Ortsbild, Architekt-Lineage
- **3D-Modell-Strategie**: spezielle Kombination je Eintrag (Open-Source / eigene Modellierung / Splat). Methode pro Eintrag in `model_3d.notes` dokumentiert
- **Workflow-Trigger**: Validation/Reflexion **während** Volumenstudien — Reference-Library ist immer aktiv im Tree
- **Match-Erklärung**: pro Top-Match generiert das Add-on (clientseitig via Claude API) eine 2-Satz-Begründung
- **Lizenz**: Dossier-PDF nutzt nur `cc-by` / `cc-by-sa` Bilder. `all_rights_reserved` nur im internen Add-on-Workflow

## Schema-Erweiterungen — komplette Implementation auf einmal

Der Maintainer hat sich für **alle Felder aus dem ursprünglichen Briefing in einem Durchgang** entschieden. Bitte folgende optionale Felder zu `lib/types.ts` (Type `Entry`) hinzufügen:

### `geo`

```typescript
geo?: {
  lat: number;             // WGS84
  lon: number;
  elevation_m?: number;
  precision: "exact" | "address" | "city" | "region";
  canton?: string;         // CH: "ZH" | "ZG" | "TI" | ...
  region?: string;         // freie Region: "Engadin", "Tessin", "Mittelland"
};
```

### `materials`

Quelle für das Material+Tektonik-Match-Signal.

```typescript
materials?: {
  primary: MaterialTag[];           // Hauptmaterialien (1-3)
  facade?: MaterialTag[];
  structure?: MaterialTag[];
  stone_type?: StoneType;           // falls Naturstein primary
  timber_type?: TimberType;         // falls Holz primary
  notes?: string;                   // Freitext-Material-Beschreibung
};
```

### `structure`

Trägt zum Material+Tektonik-Signal bei (Tragwerks-System).

```typescript
structure?: {
  system: StructureSystem;
  primary_material: MaterialTag;
  notable?: string[];               // "weitspannend", "auskragend", "hybrid"
};
```

### `program`

Quelle für das Programm-Match-Signal.

```typescript
program?: {
  type: ProgramType;
  floor_area_m2?: number;
  storeys_above?: number;
  storeys_below?: number;
  capacity?: number;
};
```

### `context`

Quelle für das Topografie+Ortsbild-Match-Signal.

```typescript
context?: {
  setting: SettingType;
  topography: TopographyType;
  heritage_context?: HeritageContext[];
};
```

### `model_3d` (für 3D-Hotload in Blender)

```typescript
model_3d?: {
  glb_url: string;                  // R2-URL, https://assets.architekturkosmos.ch/models/{entry_id}/full.glb
  parts?: {                         // Sub-Modelle aus dem Pilot-Standard
    mass?: string;                  // simplified Massenmodell
    low?: string;                   // low-poly
    full?: string;                  // detailed
    site?: string;                  // mit Umgebung
    structure?: string;             // nur Tragwerk
    tectonic?: string;              // Tektonik-Layer
  };
  scale_marker?: number;            // Referenz-Höhe in Metern (Massstabs-Check)
  license: ModelLicense;
  notes?: string;                   // Provenance: "Eigene Modellierung", "swissBUILDINGS3D Auszug", "Wikipedia 3D-Asset", "Gaussian Splat aus 50 historischen Fotos"
};
```

### `lineage` (für Architekt-Lineage-Signal)

Über `authors` hinaus für bewusste Stilrichtungs-Pflege.

```typescript
lineage?: string[];  // ["zumthor_school", "engadin_modernism", "pavillon_architecture", "zuericher_schule"]
```

### `vibes` (Soft-Tags für semantische Ähnlichkeit)

```typescript
vibes?: string[];  // ["monolithic", "warm", "transparent", "rooted", "ephemeral"]
```

### `images.license` + `model_3d.license`

Strict Lizenz-Filter im Dossier-Export ist Add-on-seitig vorgesehen. Bitte `license` Feld pflichtbewusst setzen.

```typescript
type ModelLicense = "cc_by" | "cc_by_sa" | "cc0" | "personal_only" | "all_rights_reserved";
type ImageRef = {
  url: string;
  alt: string;
  credit?: string;
  license: ModelLicense;
};
```

## Taxonomy-Erweiterungen für `data/taxonomies.json`

Neue Top-Level-Keys ergänzen (existierende `entry_types` und `style_sectors` behalten):

```json
{
  "materials": ["natural_stone", "concrete", "exposed_concrete", "timber", "cross_laminated_timber", "brick", "fired_clay", "steel", "glass", "earth_rammed", "lime_render", "metal_sheet", "fiber_cement", "polycarbonate"],
  "stone_types": ["tuff", "molasse_sandstone", "alpine_limestone", "gneiss", "granite", "serpentinite", "marble", "calanca_gneiss", "vals_quartzit"],
  "timber_types": ["spruce", "fir", "larch", "oak", "chestnut", "regional_softwood"],
  "structure_systems": ["load_bearing_walls", "skeleton_frame", "post_and_beam", "mass_timber", "shell", "vault", "truss", "hybrid"],
  "program_types": ["housing_single_family", "housing_multi_family", "housing_collective", "school", "kindergarten", "university", "museum", "library", "office", "industrial", "retail", "hospitality", "sacred", "memorial", "infrastructure", "agricultural", "sports", "cultural", "civic", "mixed_use"],
  "settings": ["urban_dense", "urban_block_perimeter", "suburban", "village_center", "rural_dispersed", "isolated", "landscape", "industrial_site"],
  "topographies": ["flat", "gentle_slope", "steep_slope", "hilltop", "ridge", "valley_floor", "lakeside", "riverside", "alpine"],
  "heritage_contexts": ["isos_listed", "isos_adjacent", "bln_inventory", "ivs_route", "unesco", "cantonal_inventory", "ortsbild_protected"],
  "lineages": ["zumthor_school", "olgiati_school", "caminada_school", "gigon_guyer_school", "herzog_demeuron_school", "engadin_modernism", "tessiner_schule", "zuericher_schule", "pavillon_architecture", "swiss_minimalism"],
  "model_licenses": ["cc_by", "cc_by_sa", "cc0", "personal_only", "all_rights_reserved"]
}
```

## API-Filter-Erweiterungen für `/api/search`

Mit dem erweiterten Schema sollten folgende Query-Parameter im Worker ergänzt werden (siehe `src/worker.ts`):

- `materials=natural_stone,timber` (any-match auf `materials.primary`)
- `materials_all=natural_stone,concrete` (all-match)
- `stone_type=gneiss`
- `program=school`
- `structure=skeleton_frame`
- `setting=village_center`
- `topography=steep_slope`
- `heritage_context=isos_listed`
- `lineage=zumthor_school` (any-match)
- `vibes=monolithic,warm` (any-match)
- `has_3d_model=true` (filtert auf `model_3d.glb_url` vorhanden)
- `canton=ZG`
- `geo_near=47.18,8.59&radius_km=50` (haversine-Distanz)

Antwort-Format bleibt `{count, results: Entry[]}`.

## Erste 10 Pilot-Einträge (für Curation-Roadmap)

Schweizer Klassiker als Anker — decken die vier Match-Signale exemplarisch ab:

1. **Therme Vals** (Zumthor, 1996) — natural_stone/vals_quartzit · hospitality · steep_slope · zumthor_school
2. **Schulhaus Paspels** (Caminada, 1998) — concrete + timber · school · village_center · caminada_school
3. **Stiftsbibliothek St. Gallen** (1758) — load_bearing_walls · library · urban_dense · classical_architecture
4. **Kirchner Museum Davos** (Gigon Guyer, 1992) — concrete + glass · museum · alpine · gigon_guyer_school
5. **Bruder-Klaus-Kapelle Mechernich** (Zumthor, 2007) — rammed earth + concrete · sacred · rural_dispersed · zumthor_school
6. **Kapelle Sogn Benedetg** (Zumthor, 1988) — timber shingles · sacred · alpine · zumthor_school
7. **Wohnhaus Schönenwerd** (Olgiati, 1998) — exposed_concrete · housing_single_family · village_center · olgiati_school
8. **Käserei Andeer** (Caminada, 2004) — natural_stone · industrial/agricultural · alpine · caminada_school
9. **Atelier Bardill** (Olgiati, 2007) — exposed_concrete (red) · cultural · village_center · olgiati_school
10. **Kloster Disentis** (rebuilt 1696+) — natural_stone + load_bearing_walls · sacred · alpine · classical_architecture

## Implementations-Reihenfolge

1. **Schema in `lib/types.ts`** erweitern (alle Felder als optional)
2. **Taxonomy-Listen in `data/taxonomies.json`** ergänzen
3. **Pilot-Eintrag Flower House** mit neuen Feldern anreichern (Vorbild für alle anderen)
4. **Erste 10 Pilot-Einträge oben** anlegen oder existierende anreichern (Maintainer macht das manuell)
5. **CF Worker** mit den neuen Query-Params (Schritt-für-Schritt-Erweiterung von `/api/search`)
6. **R2-Bucket** für 3D-Modelle (sofern noch nicht aktiv): `models/{entry_id}/full.glb`, `mass.glb`, `structure.glb`
7. **Smoke-Tests**:
   ```
   curl "https://architekturkosmos.ch/api/search?country=CH&materials=natural_stone&topography=alpine"
   curl "https://architekturkosmos.ch/api/search?lineage=zumthor_school"
   curl "https://architekturkosmos.ch/api/search?program=school&has_3d_model=true"
   ```

## Add-on-seitige Vorbereitung (rein zur Info — Maintainer macht das)

Der Maintainer baut den `Cosmos Reference Library`-Knoten so, dass er folgenden Workflow erlaubt:

- 4 Slider für Match-Signal-Gewichtungen (default 25/25/25/25%)
- Auto-Filter Country=Switzerland
- Multi-Signal-Score mit transparenter Aufschlüsselung
- Pro Top-Match: 2-Satz-LLM-Begründung via Claude
- Pro Top-Match: "In Szene laden"-Button → glb-Download → `AB_Referenzen/{entry_id}/` Collection
- Strict-Lizenz-Filter beim Dossier-Export

Sobald Schema + API erweitert sind, schaltet sich der Add-on-Knoten automatisch auf die neuen Felder um (graceful degradation falls Felder fehlen).

## Querverweise

- `docs/ai-reference-archive-vision.md` — übergreifende Vision (passt zum hier definierten Use-Case)
- `docs/pilot-entry-standard.md` — Flower-House-Standard, Vorbild für alle Einträge
- `docs/blender-wettbewerb-integration.md` — API-Touchpoints (initial gepushed)
- `docs/database-architecture.md` — D1 + R2 Stack
- `docs/3d-analysis-automation-pipeline.md` — Gaussian Splat Pipeline (passt zu `model_3d.notes`-Provenance)
