# Data Model

The MVP uses local JSON files. The schema should be treated as the future database contract, but no database or CMS is introduced yet.

The planned production database foundation is documented in
[`docs/database-architecture.md`](./database-architecture.md). The draft
Cloudflare D1 SQL schema lives in
[`schema/architecture-cosmos-d1.sql`](../schema/architecture-cosmos-d1.sql).

## Entry

An entry is the main unit of the atlas. It can represent architecture in a broad sense: built work, plan, theory, text, object, event, infrastructure, landscape, or map.

Required fields:

- `id`: stable machine id.
- `slug`: future route-safe identifier.
- `title`: display title.
- `entry_type`: one of the supported entry types.
- `year_start`: primary year for atlas placement.
- `authors`: people, offices, institutions, or collectives.
- `style_sector`: atlas sector id.
- `themes`: short thematic tags.
- `short_description`: concise explanation for the detail panel.
- `one_sentence`: one-sentence summary for semantic zoom preview cards.
- `full_description`: longer dossier text for close zoom.
- `media`: four MVP media placeholders.
- `source_quality`: current confidence or source type.

Optional fields:

- `year_end`: range end when the entry spans years.
- `city`, `country`: location when meaningful.
- `lecture_cluster`: source or teaching cluster.
- `atlas`: temporary override metadata. Prefer derived layout from year and sector.

## Entry Types

- `building`
- `urban_plan`
- `landscape_project`
- `text`
- `theory`
- `map`
- `infrastructure`
- `object`
- `event`

## Style Sectors

- `classical_architecture`
- `pre_modern_architecture`
- `modern_architecture`
- `postwar_modern_architecture`
- `sustainable_architecture`
- `vernacular_architecture`

Sectors are navigational regions, not final academic truth. They can be refined later, but ids should remain stable once content grows.

## Relations

Relations live separately from entries in `data/relations.json`. They are rendered as an optional SVG overlay and summarized in the selected entry panel.

Future relation shape:

```json
{
  "id": "red-house-to-arts-and-crafts",
  "source_entry_id": "red-house",
  "target_entry_id": "garden-cities-of-tomorrow",
  "relation_type": "context",
  "description": "Shared reformist critique of industrial urban and domestic life."
}
```

Relation types should stay broad at first:

- `influences`
- `responds_to`
- `shares_theme`
- `same_author`
- `same_place`
- `typological_reference`
- `structural_reference`
- `material_reference`
- `source_connection`
- `context`

## Media

Every MVP entry has exactly four media slots:

- `exterior`
- `interior`
- `section`
- `plan`

These are placeholders for now. The four-slot shape is stable so the UI can be built before image rights and sourcing are solved. A fifth 3D model slot is deferred.

In the future database, media metadata moves to `entry_media` and the files
themselves live in Cloudflare R2. Large binaries should never be stored in D1.

## 3D Models

3D models are future R2 assets referenced by D1 metadata. Each mature entry may
eventually have several model layers:

- `full_model`
- `low_poly_model`
- `structure_model`
- `tectonic_model`
- `site_model`
- `mass_model`

The database stores `r2_key`, model type, format, review status, source basis,
generation method, and confidence metadata. The actual `.glb`, `.gltf`, `.usdz`,
textures, and annotation files belong in R2.

## Local Archive Checks

Run the archive validator before adding larger batches of projects:

```bash
npm run archive:validate
```

To create a local D1 import preview:

```bash
npm run archive:export
```

This writes `out/archive-d1-import.sql`, which is generated output and should not
be committed. It translates local entries, relations, media placeholders, tags,
Flower House model metadata, and analysis layers into the planned D1 table shape.

## Data Rule

Do not hand-place the atlas as the default. Position should be derived from `year_start` and `style_sector`. Manual atlas overrides should remain exceptional and removable.

## Layout Rule

Atlas layout is a computed presentation layer. Node spreading, clustering, label positioning, and relation paths are allowed to change without changing entry meaning.
