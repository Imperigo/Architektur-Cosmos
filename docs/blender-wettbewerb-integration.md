# Blender-Wettbewerbsvorbereitung — Integration mit Cosmos

**Status**: Briefing für Codex / Integration-Spec.  
**Context**: Andrin baut ein Blender-Add-on `Wettbewerbsvorbereitung` (separates Repo, in OneDrive unter `11 AI Workflow/Wettbewerbsvorbereitung Addon/`), das Architektur-Wettbewerbe von Atelierblaupause-Paket bis Dossier automatisiert. Cosmos soll als Referenzbibliothek dienen — Blender konsumiert Cosmos-Daten read-only.

Bestehende Cosmos-Architektur passt zu 80% bereits. Dieses Dokument klärt die **API-Touchpoints** und etwaige Schema-Lücken, die für die Blender-Integration relevant sind.

## Was Blender braucht

### 1. Read-only API auf der Cosmos-Domain
- `GET /api/entries.json` — Vollständiger Entry-Export (Cache 1h, CORS für lokale Dev-Origin)
- `GET /api/taxonomies.json` — Aktuelle Taxonomy-Listen
- `GET /api/search?...` — Server-side Filter
  - `country=CH`, `canton=ZG`, `program=school`, `topography=hilltop`
  - `materials=natural_stone,timber` (any-match)
  - `materials_all=...` (all-match)
  - `themes=...`, `style_sector=...`, `entry_type=...`
  - `geo_near=47.18,8.59&radius_km=50`
  - `year_min=...&year_max=...`
  - `has_3d_model=true`
  - `limit=N`
  - Antwort: `{count, results: Entry[]}`

Implementation: separater CF Worker am Pattern `/api/*` (siehe `docs/database-architecture.md` für D1-Anbindung) oder Static Snapshot wenn D1 noch nicht produktiv ist.

### 2. R2-Assets über stabile URLs
- Pattern bestätigen: `https://assets.architekturkosmos.ch/models/{entry_id}/full.glb`
- Pro Modell auch Sub-Modelle wenn vorhanden:
  - `structure.glb`, `facade.glb`, `interior.glb`, `site.glb`
  - `materials/{material_tag}.glb` (z.B. `materials/natural_stone.glb`)
- Bilder: `images/{entry_id}/{hero|gallery_N|plans/X|details/X}.webp` mit Responsive-Varianten `@1200`, `@600`

Blender lädt diese on demand wenn der User eine Referenz importieren will. Keine Pre-Downloads.

### 3. Schema-Felder die für Blender-Filter wichtig sind

Aus `lib/types.ts` ist schon viel da. Was Blender braucht (prüfen ob vorhanden, sonst ergänzen):

- `geo: { lat, lon, canton, region, precision }` — für CH-Standort-Filter und geo_near
- `materials.primary: string[]` mit Taxonomy (Naturstein, Beton, Holz…) — für Material-Match
- `materials.stone_type?` mit Taxonomy (Tuff, Molasse, Gneis, Kalanca-Gneis…) — Steinsorten-Match
- `program.type` mit Taxonomy (school, housing_multi_family, museum…) — Programm-Match
- `context.topography` (steep_slope, hilltop, lakeside…) — Topo-Match
- `context.setting` (urban_dense, village_center, rural_dispersed…) — Setting-Match
- `context.heritage_context: string[]` (isos_listed, bln_inventory…) — Heritage-Filter
- `model_3d.glb_url` + `parts` — 3D-Verfügbarkeit
- `vibes: string[]` — Soft-Match-Tags für semantische Ähnlichkeit

Vollständige Taxonomie-Vorschläge: siehe `Wettbewerbsvorbereitung Addon/03_Doku/cosmos_codex_briefing.md` im OneDrive (Andrin).

### 4. Reference-Suggester (KI-Feature)

Späterer Blender-Knoten "Reference Suggester" wird:
1. Vom aktuellen Wettbewerb sammeln: Material aus Orthofoto-Analyse, Topo aus Terrain-Mesh, Programm aus parsed Pflichtenheft, Inventare aus Standortanalyse
2. Multi-Signal-Score über alle relevanten Cosmos-Entries
3. Top-N Vorschläge mit transparenter Score-Aufschlüsselung

**Cosmos-seitig nötig**: das `/api/search` muss gut filtern können (siehe oben). Optional später: ein `/api/recommend` Endpoint der einen "Wettbewerbs-Kontext"-Body annimmt und gerankte Vorschläge liefert (komplexer, kann später kommen).

### 5. Year-Match für Gaussian Splats

Cosmos plant Splats als "reality layer" (`docs/3d-analysis-automation-pipeline.md`). Wenn ein Entry sowohl einen analytischen `model_3d.glb` ALS auch einen Gaussian Splat hat, sollte das Schema enthalten:
- `model_3d.splat_url` — `.ply` oder `.splat`
- `model_3d.splat_capture_year` — Aufnahmejahr (für Konsistenz-Check)
- `model_3d.analytical_dataset_year` — Stand der analytischen Geometrie

Beim Blender-Import: Sanity-Check ob die Jahre konsistent sind, sonst Warning ins Wettbewerbs-Dossier.

### 6. Lizenz-Felder respektieren

Blender soll **nie** Inhalte importieren ohne `license` zu kennen:
- `model_3d.license` und `images[].license`
- Mögliche Werte: `personal_only`, `cc_by`, `cc_by_sa`, `all_rights_reserved`
- Bei `all_rights_reserved`: Blender zeigt Warnung "Diese Referenz darf nur intern verwendet werden, nicht im Wettbewerbs-Dossier"

## Was Blender NICHT von Cosmos braucht

- Schreibender Zugriff (Cosmos bleibt read-only für das Add-on)
- User-Auth (Add-on läuft lokal auf Andrins Maschine)
- Realtime-Updates (1h Cache ist OK)
- Datenmodell-Migration (Add-on adaptiert sich an `lib/types.ts`)

## API-Contract — Versionierung

Wenn Schema-Breaking-Changes nötig werden:
- Cosmos-API mit `/api/v1/...` und `/api/v2/...` parallel anbieten
- Add-on bittet pro Request explizit um Version
- Migration kommunizieren über `GET /api/version` (returns latest)

## Implementations-Reihenfolge für Codex

Wenn das Cosmos-Repo bereit ist, die Blender-Integration zu supporten:

1. ✅ `lib/types.ts` Schema prüfen, ggf. ergänzen um Felder aus Section 3
2. ✅ Mock-Entries (oder D1-Seed-Data) mit den neuen Feldern anreichern
3. ⏳ CF Worker mit `/api/entries.json`, `/api/taxonomies.json`, `/api/search` (siehe Beispiel-TypeScript in `Wettbewerbsvorbereitung Addon/03_Doku/cosmos_codex_briefing.md`)
4. ⏳ R2 Custom-Domain `assets.architekturkosmos.ch` einrichten
5. ⏳ Smoke-Test: `curl https://architekturkosmos.ch/api/search?country=CH&materials=natural_stone`
6. ⏳ Async: Splat-Support im Schema (`model_3d.splat_url` etc.)

Blender-Add-on hat seine Seite vorbereitet — siehe gespeicherte Specs in OneDrive. Sobald `/api/entries.json` live ist, baut Andrin den `Cosmos Reference Library`-Knoten.

## Querverweise

- `docs/database-architecture.md` — D1 + R2 Stack
- `docs/3d-analysis-automation-pipeline.md` — Gaussian Splat Pipeline (passt zu Blender-Splat-Importer)
- `docs/media-and-model-policy.md` — Lizenzkonventionen
- `docs/database-research-agents.md` — Codex-Workflow für DB-Pflege
- `Wettbewerbsvorbereitung Addon/03_Doku/cosmos_integration_spec.md` (OneDrive) — vollständige Vision
- `Wettbewerbsvorbereitung Addon/03_Doku/cosmos_codex_briefing.md` (OneDrive) — TypeScript-Code-Beispiele für Worker
