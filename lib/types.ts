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
  | 'vernacular_architecture'
  | 'urban_landscape';

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
  source_quality: string;
  atlas?: {
    year: number;
    ring: string;
    angle: number;
    radius: number;
    cluster: string;
  };
};
