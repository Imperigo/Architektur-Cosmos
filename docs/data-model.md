# Data Model

The MVP uses local JSON files. The schema should be treated as the future database contract, but no database or CMS is introduced yet.

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
- `material_reference`
- `context`

## Data Rule

Do not hand-place the atlas as the default. Position should be derived from `year_start` and `style_sector`. Manual atlas overrides should remain exceptional and removable.

## Layout Rule

Atlas layout is a computed presentation layer. Node spreading, clustering, label positioning, and relation paths are allowed to change without changing entry meaning.
