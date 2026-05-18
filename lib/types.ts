export type EntryType =
  | 'building'
  | 'urban_plan'
  | 'landscape_project'
  | 'text'
  | 'theory'
  | 'map'
  | 'infrastructure'
  | 'object'
  | 'event';

export type StyleSectorId =
  | 'classical_architecture'
  | 'pre_modern_architecture'
  | 'modern_architecture'
  | 'postwar_modern_architecture'
  | 'sustainable_architecture'
  | 'vernacular_architecture';

export type RelationType =
  | 'influences'
  | 'responds_to'
  | 'shares_theme'
  | 'same_author'
  | 'same_place'
  | 'typological_reference'
  | 'structural_reference'
  | 'material_reference'
  | 'source_connection'
  | 'context';

export type EntryMediaType = 'exterior' | 'interior' | 'section' | 'plan';

export type EntryMedia = {
  type: EntryMediaType;
  label: string;
  placeholder: string;
  url?: string;
  credit?: string;
  source_url?: string;
};

export type EntrySourceAsset = {
  kind: 'image' | 'drawing' | 'plan' | 'section' | 'model' | 'analysis';
  label: string;
  url: string;
  credit?: string;
  source_url?: string;
};

export type EntryModelAsset = {
  model_type: 'full_model' | 'low_poly_model' | 'structure_model' | 'tectonic_model' | 'site_model' | 'mass_model';
  title: string;
  r2_key: string;
  format: 'glb' | 'gltf' | 'usdz' | 'obj' | 'fbx' | 'json';
  lod_level: 'preview' | 'low' | 'medium' | 'high' | 'source';
  source_basis: string;
  generation_method: 'unknown' | 'manual' | 'ai_assisted' | 'procedural' | 'photogrammetry' | 'survey_derived' | 'source_reconstruction';
  review_status: 'draft' | 'reviewed' | 'verified' | 'needs_source';
  confidence_score?: number;
};

export type EntryAnalysisLayer = {
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
  data?: Record<string, unknown>;
  r2_key?: string;
  review_status: 'draft' | 'reviewed' | 'verified' | 'needs_source';
};

export type IngestionStatus = {
  stage: 'not_started' | 'captured' | 'needs_review' | 'ready_for_wormhole' | 'published';
  source_status: 'none' | 'candidate' | 'attached' | 'reviewed';
  asset_status: 'none' | 'candidate' | 'rights_blocked' | 'ready';
  model_status: 'none' | 'planned' | 'manual_ready' | 'generated_draft' | 'reviewed';
  local_storage_bytes?: number;
  local_storage_limit_bytes?: number;
  updated_at?: string;
};

export type SourceCandidate = {
  source_type: 'lecture_pdf' | 'book' | 'article' | 'website' | 'archive' | 'image_source' | 'model_source' | 'dataset' | 'other';
  title: string;
  url?: string;
  local_path?: string;
  reliability_level: 'unverified' | 'lecture_reference' | 'secondary_source' | 'primary_source' | 'verified';
  rights_status: 'unknown' | 'needs_permission' | 'licensed' | 'public_domain' | 'own_work';
  notes?: string;
};

export type AssetCandidate = {
  kind: 'image' | 'drawing' | 'plan' | 'section' | 'pdf' | 'model' | 'analysis' | 'other';
  media_slot?: EntryMediaType;
  title: string;
  local_path?: string;
  planned_r2_key?: string;
  rights_status: 'unknown' | 'needs_permission' | 'licensed' | 'public_domain' | 'own_work';
  public_display_allowed: boolean;
  bytes?: number;
};

export type ModelPackage = {
  package_type: 'reference_model' | 'analysis_model' | 'blender_package' | 'archicad_package';
  status: 'planned' | 'manual_ready' | 'generated_draft' | 'reviewed';
  planned_paths: string[];
  notes?: string;
};

export type AnalysisObservation = {
  analysis_type: EntryAnalysisLayer['analysis_type'] | 'roof_form' | 'material_tag' | 'blender_query';
  label: string;
  confidence_score?: number;
  source: 'manual' | 'ai_assisted' | 'source_inferred' | 'model_analysis';
};

export type EntryDatabaseProfile = {
  status: 'draft' | 'reviewed' | 'published' | 'needs_sources';
  r2_prefix: string;
  source_count: number;
  media_count: number;
  model_count: number;
  analysis_count: number;
  tag_count: number;
};

export type Entry = {
  id: string;
  slug: string;
  title: string;
  entry_type: EntryType;
  year_start: number;
  year_end?: number;
  authors: string[];
  city?: string;
  country?: string;
  style_sector: StyleSectorId;
  lecture_cluster?: string[];
  themes: string[];
  short_description: string;
  one_sentence: string;
  full_description: string;
  media: EntryMedia[];
  source_quality: string;
  source_documents?: string[];
  source_url?: string;
  source_assets?: EntrySourceAsset[];
  source_candidates?: SourceCandidate[];
  asset_candidates?: AssetCandidate[];
  model_assets?: EntryModelAsset[];
  model_packages?: ModelPackage[];
  analysis_layers?: EntryAnalysisLayer[];
  analysis_observations?: AnalysisObservation[];
  ingestion_status?: IngestionStatus;
  database_tags?: string[];
  database_profile?: EntryDatabaseProfile;
  atlas?: {
    year: number;
    ring: string;
    angle: number;
    radius: number;
    cluster: string;
  };
};

export type EntryRelation = {
  id: string;
  source_entry_id: string;
  target_entry_id: string;
  relation_type: RelationType;
  description: string;
};
