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
  | 'material_reference'
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
  kind: 'image' | 'drawing' | 'plan' | 'section';
  label: string;
  url: string;
  credit?: string;
  source_url?: string;
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
