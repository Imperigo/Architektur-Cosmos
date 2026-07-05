/**
 * Reiches Referenz-Datenmodell (Batch 1 der Codex-Übernahme) — Superset des
 * bisherigen schlanken `RefEintrag` (live.ts) / lokalen `RefEntry`
 * (DataWorkspace.tsx). KosmoOrbit wird der Master/volle Bestand für
 * Architektur-Referenzen; die Website bleibt die veröffentlichte Teilmenge.
 *
 * Kanonischer Vertrag: `/schema/kosmo-reference.schema.json` (Repo-Root).
 * Dieses File ist die TS-Seite desselben Vertrags — treu aus `lib/types.ts`
 * (Entry) und dem realen Inhalt von `data/mock-entries.json` abgeleitet,
 * plus dem neuen `visibility`-Feld.
 *
 * Rückwärtskompatibilität: die bisherigen schlanken Felder (id, title,
 * year_start, year_end, authors, city, country, style_sector, themes,
 * materials: string[], program: string | null, one_sentence,
 * short_description, hero, has_3d) bleiben unter denselben Namen und Formen
 * erhalten — `RefEntry` fügt nur zusätzliche optionale Felder an. Reine
 * UI-Arbeit (DataWorkspace.tsx) folgt in Batch 2; hier wird nur das
 * Datenmodell bereitgestellt.
 *
 * exactOptionalPropertyTypes ist AN: optionale Felder werden beim Bauen von
 * Objekten mit konditionalen Spreads gesetzt, nie mit `x: undefined`.
 */

export type RefVisibility = 'public' | 'private';

export type RefEntryType =
  | 'building'
  | 'urban_plan'
  | 'landscape_project'
  | 'text'
  | 'theory'
  | 'map'
  | 'infrastructure'
  | 'object'
  | 'event';

export type RefStyleSectorId =
  | 'classical_architecture'
  | 'pre_modern_architecture'
  | 'modern_architecture'
  | 'postwar_modern_architecture'
  | 'sustainable_architecture'
  | 'vernacular_architecture';

export type RefEntryMediaType = 'exterior' | 'interior' | 'section' | 'plan';

export type RefMediaLicense =
  | 'personal_only'
  | 'cc_by'
  | 'cc_by_sa'
  | 'all_rights_reserved'
  | 'public_domain'
  | 'own_work'
  | 'cc0';

export interface RefEntryMedia {
  type: RefEntryMediaType;
  label: string;
  placeholder: string;
  url?: string;
  credit?: string;
  source_url?: string;
  license?: RefMediaLicense;
}

export interface RefEntryGeo {
  lat?: number;
  lon?: number;
  canton?: string;
  region?: string;
  /** Real in mock-entries.json oft ein Freitext (nicht nur die 6 Werte aus lib/types.ts). */
  precision?: string;
}

/** Strukturiertes Materialprofil (Master-Feld) — die schlanke `materials: string[]` bleibt daneben bestehen. */
export interface RefEntryMaterials {
  primary?: string[];
  stone_type?: string[];
  secondary?: string[];
  notes?: string;
}

/** Strukturiertes Programmprofil (Master-Feld) — die schlanke `program: string | null` bleibt daneben bestehen. */
export interface RefEntryProgram {
  type?: string;
  subtype?: string;
  /** Real in mock-entries.json oft ein Freitext. */
  public_access?: string;
}

export interface RefEntryContext {
  topography?: string;
  setting?: string;
  heritage_context?: string[];
  climate?: string;
  landscape_relation?: string[];
}

export type RefReviewStatus = 'draft' | 'reviewed' | 'verified' | 'needs_source';

export interface RefEntryModelAsset {
  model_type: 'full_model' | 'low_poly_model' | 'structure_model' | 'tectonic_model' | 'site_model' | 'mass_model';
  title: string;
  r2_key: string;
  format: 'glb' | 'gltf' | 'usdz' | 'obj' | 'fbx' | 'json';
  /** Real in mock-entries.json kommt zusätzlich 'study' vor. */
  lod_level: string;
  source_basis: string;
  /** Real in mock-entries.json kommt zusätzlich 'diagrammatic_reconstruction' vor. */
  generation_method: string;
  review_status: RefReviewStatus;
  confidence_score?: number;
}

export interface RefEntryAnalysisLayer {
  analysis_type:
    | 'structure'
    | 'tectonics'
    | 'spatial_order'
    | 'material_system'
    | 'circulation'
    | 'typology'
    | 'urban_context'
    | 'landscape_system'
    | 'filter_classification'
    | 'source_reconstruction';
  summary: string;
  review_status: RefReviewStatus;
  data?: Record<string, unknown>;
  r2_key?: string;
}

export interface RefEntryDatabaseProfile {
  status: 'draft' | 'reviewed' | 'published' | 'needs_sources';
  r2_prefix: string;
  source_count: number;
  media_count: number;
  model_count: number;
  analysis_count: number;
  tag_count: number;
}

/**
 * Reiches Referenz-Datenmodell — Superset von `RefEintrag` (live.ts) und dem
 * lokalen `RefEntry` in DataWorkspace.tsx. Beide Alt-Typen sind strukturell
 * mit diesem hier kompatibel (gleiche Feldnamen/-formen), sodass bisheriger
 * Code unverändert weiterläuft.
 */
export interface RefEntry {
  // --- heutige Felder (unverändert übernommen) ---
  id: string;
  title: string;
  year_start?: number | null;
  year_end?: number | null;
  authors?: string[];
  city?: string | null;
  country?: string | null;
  style_sector?: string | null;
  themes?: string[];
  /** Schlanke Tag-Liste (bisheriges Feld). Das strukturierte Profil steht in `materials_detail`. */
  materials?: string[];
  /** Schlanker Programmtext (bisheriges Feld). Das strukturierte Profil steht in `program_detail`. */
  program?: string | null;
  one_sentence?: string | null;
  short_description?: string | null;
  hero?: string | null;
  has_3d?: boolean;

  // --- reiche Ergänzung (Master-Datenmodell, Batch 1) ---
  slug?: string;
  entry_type?: RefEntryType;
  full_description?: string;
  /** Sichtbarkeits-Konzept: 'public' darf in Website/App-Seeds, 'private' bleibt im Master. Default 'public'. */
  visibility?: RefVisibility;
  source_quality?: string;
  lecture_cluster?: string[];
  vibes?: string[];
  database_tags?: string[];
  media?: RefEntryMedia[];
  geo?: RefEntryGeo;
  materials_detail?: RefEntryMaterials;
  program_detail?: RefEntryProgram;
  context?: RefEntryContext;
  model_assets?: RefEntryModelAsset[];
  analysis_layers?: RefEntryAnalysisLayer[];
  database_profile?: RefEntryDatabaseProfile;
}
