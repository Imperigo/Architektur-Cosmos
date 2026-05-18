-- Architecture Cosmos D1 schema draft
-- Target: Cloudflare D1 / SQLite dialect.
-- This file is not applied automatically. It is the planned migration contract.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'building',
    'urban_plan',
    'landscape_project',
    'text',
    'theory',
    'map',
    'infrastructure',
    'object',
    'event'
  )),
  year_start INTEGER NOT NULL,
  year_end INTEGER,
  authors_json TEXT NOT NULL DEFAULT '[]',
  city TEXT,
  country TEXT,
  latitude REAL,
  longitude REAL,
  style_sector TEXT NOT NULL CHECK (style_sector IN (
    'classical_architecture',
    'pre_modern_architecture',
    'modern_architecture',
    'postwar_modern_architecture',
    'sustainable_architecture',
    'vernacular_architecture'
  )),
  short_description TEXT NOT NULL DEFAULT '',
  one_sentence TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  source_quality TEXT NOT NULL DEFAULT 'unknown',
  lecture_cluster_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published', 'needs_sources')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entries_year_start ON entries (year_start);
CREATE INDEX IF NOT EXISTS idx_entries_type ON entries (entry_type);
CREATE INDEX IF NOT EXISTS idx_entries_style_sector ON entries (style_sector);
CREATE INDEX IF NOT EXISTS idx_entries_location ON entries (country, city);

CREATE TABLE IF NOT EXISTS entry_sources (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'lecture_pdf',
    'book',
    'article',
    'website',
    'archive',
    'image_source',
    'model_source',
    'dataset',
    'other'
  )),
  title TEXT NOT NULL,
  author TEXT,
  url TEXT,
  document_name TEXT,
  page_reference TEXT,
  reliability_level TEXT NOT NULL DEFAULT 'unverified' CHECK (reliability_level IN (
    'unverified',
    'lecture_reference',
    'secondary_source',
    'primary_source',
    'verified'
  )),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entry_sources_entry ON entry_sources (entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_sources_type ON entry_sources (source_type);

CREATE TABLE IF NOT EXISTS entry_media (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES entry_sources(id) ON DELETE SET NULL,
  media_type TEXT NOT NULL CHECK (media_type IN (
    'exterior',
    'interior',
    'section',
    'plan',
    'diagram',
    'map',
    'archive_photo',
    'source_scan',
    'detail',
    'material_sample'
  )),
  title TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  r2_key TEXT,
  external_url TEXT,
  credit TEXT,
  copyright_status TEXT NOT NULL DEFAULT 'unknown' CHECK (copyright_status IN (
    'unknown',
    'needs_permission',
    'licensed',
    'public_domain',
    'own_work',
    'placeholder'
  )),
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entry_media_entry ON entry_media (entry_id, media_type, sort_order);
CREATE INDEX IF NOT EXISTS idx_entry_media_r2_key ON entry_media (r2_key);

CREATE TABLE IF NOT EXISTS entry_models (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES entry_sources(id) ON DELETE SET NULL,
  model_type TEXT NOT NULL CHECK (model_type IN (
    'full_model',
    'low_poly_model',
    'structure_model',
    'tectonic_model',
    'site_model',
    'mass_model'
  )),
  title TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('glb', 'gltf', 'usdz', 'obj', 'fbx', 'json')),
  lod_level TEXT NOT NULL DEFAULT 'medium' CHECK (lod_level IN ('preview', 'low', 'medium', 'high', 'source')),
  source_basis TEXT NOT NULL DEFAULT '',
  generation_method TEXT NOT NULL DEFAULT 'unknown' CHECK (generation_method IN (
    'unknown',
    'manual',
    'ai_assisted',
    'procedural',
    'photogrammetry',
    'survey_derived',
    'source_reconstruction'
  )),
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN (
    'draft',
    'reviewed',
    'verified',
    'needs_source'
  )),
  confidence_score REAL CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  file_size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entry_models_entry ON entry_models (entry_id, model_type);
CREATE INDEX IF NOT EXISTS idx_entry_models_r2_key ON entry_models (r2_key);

CREATE TABLE IF NOT EXISTS entry_analysis (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN (
    'structure',
    'tectonics',
    'spatial_order',
    'material_system',
    'circulation',
    'typology',
    'urban_context',
    'landscape_system',
    'filter_classification',
    'source_reconstruction'
  )),
  summary TEXT NOT NULL DEFAULT '',
  data_json TEXT,
  r2_key TEXT,
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN (
    'draft',
    'reviewed',
    'verified',
    'needs_source'
  )),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entry_analysis_entry ON entry_analysis (entry_id, analysis_type);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  tag_group TEXT NOT NULL CHECK (tag_group IN (
    'style',
    'typology',
    'theme',
    'course',
    'source',
    'structure',
    'material',
    'period',
    'region',
    'analysis'
  )),
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(label, tag_group)
);

CREATE INDEX IF NOT EXISTS idx_tags_group ON tags (tag_group);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  confidence_score REAL CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  source_id TEXT REFERENCES entry_sources(id) ON DELETE SET NULL,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags (tag_id);

CREATE TABLE IF NOT EXISTS entry_relations (
  id TEXT PRIMARY KEY,
  source_entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  target_entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'influences',
    'responds_to',
    'same_author',
    'same_place',
    'shares_theme',
    'typological_reference',
    'structural_reference',
    'material_reference',
    'source_connection',
    'context'
  )),
  strength REAL NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  description TEXT NOT NULL DEFAULT '',
  source_id TEXT REFERENCES entry_sources(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (source_entry_id <> target_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_relations_source ON entry_relations (source_entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_relations_target ON entry_relations (target_entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_relations_type ON entry_relations (relation_type);

CREATE TABLE IF NOT EXISTS asset_manifests (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  manifest_type TEXT NOT NULL CHECK (manifest_type IN (
    'media_set',
    'model_set',
    'deep_zoom_tiles',
    'source_package',
    'analysis_package'
  )),
  r2_prefix TEXT NOT NULL,
  manifest_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asset_manifests_entry ON asset_manifests (entry_id, manifest_type);

CREATE TABLE IF NOT EXISTS source_candidates (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'lecture_pdf',
    'book',
    'article',
    'website',
    'archive',
    'image_source',
    'model_source',
    'dataset',
    'other'
  )),
  title TEXT NOT NULL,
  url TEXT,
  local_path TEXT,
  reliability_level TEXT NOT NULL DEFAULT 'unverified' CHECK (reliability_level IN (
    'unverified',
    'lecture_reference',
    'secondary_source',
    'primary_source',
    'verified'
  )),
  rights_status TEXT NOT NULL DEFAULT 'unknown' CHECK (rights_status IN (
    'unknown',
    'needs_permission',
    'licensed',
    'public_domain',
    'own_work'
  )),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_source_candidates_entry ON source_candidates (entry_id, source_type);

CREATE TABLE IF NOT EXISTS asset_candidates (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'image',
    'drawing',
    'plan',
    'section',
    'pdf',
    'model',
    'analysis',
    'other'
  )),
  title TEXT NOT NULL,
  local_path TEXT,
  planned_r2_key TEXT,
  rights_status TEXT NOT NULL DEFAULT 'unknown' CHECK (rights_status IN (
    'unknown',
    'needs_permission',
    'licensed',
    'public_domain',
    'own_work'
  )),
  public_display_allowed INTEGER NOT NULL DEFAULT 0 CHECK (public_display_allowed IN (0, 1)),
  file_size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asset_candidates_entry ON asset_candidates (entry_id, kind);

CREATE TABLE IF NOT EXISTS model_packages (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
  package_type TEXT NOT NULL CHECK (package_type IN (
    'reference_model',
    'analysis_model',
    'blender_package',
    'archicad_package'
  )),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned',
    'manual_ready',
    'generated_draft',
    'reviewed'
  )),
  planned_paths_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_model_packages_entry ON model_packages (entry_id, package_type);

CREATE TABLE IF NOT EXISTS analysis_observations (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  label TEXT NOT NULL,
  confidence_score REAL CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
    'manual',
    'ai_assisted',
    'source_inferred',
    'model_analysis'
  )),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_observations_entry ON analysis_observations (entry_id, analysis_type);

CREATE TABLE IF NOT EXISTS ingestion_status (
  entry_id TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'not_started' CHECK (stage IN (
    'not_started',
    'captured',
    'needs_review',
    'ready_for_wormhole',
    'published'
  )),
  source_status TEXT NOT NULL DEFAULT 'none' CHECK (source_status IN (
    'none',
    'candidate',
    'attached',
    'reviewed'
  )),
  asset_status TEXT NOT NULL DEFAULT 'none' CHECK (asset_status IN (
    'none',
    'candidate',
    'rights_blocked',
    'ready'
  )),
  model_status TEXT NOT NULL DEFAULT 'none' CHECK (model_status IN (
    'none',
    'planned',
    'manual_ready',
    'generated_draft',
    'reviewed'
  )),
  local_storage_bytes INTEGER,
  local_storage_limit_bytes INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
