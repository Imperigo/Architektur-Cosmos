export type Entry = {
  id: string;
  slug: string;
  title: string;
  entry_type: string;
  year_start: number;
  year_end?: number;
  authors: string[];
  city?: string;
  country?: string;
  style_sector: string;
  lecture_cluster?: string[];
  themes: string[];
  short_description: string;
  source_quality: string;
  atlas: {
    year: number;
    ring: string;
    angle: number;
    radius: number;
    cluster: string;
  };
};
