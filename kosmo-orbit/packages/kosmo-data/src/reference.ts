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

/* ------------------------------------------------------------------ */
/* v0.8.3/P9 (docs/V083-SPEZ.md §6.5/E6e) — Validierung eigener Import- */
/* Referenzen gegen den RefEntry-Vertrag                               */
/* ------------------------------------------------------------------ */

/**
 * EIN Fehlschlag beim Import — 1-basiert («Zeile 3» trifft den dritten
 * Array-Eintrag der Import-Datei, unabhängig von JSON-Formatierung), plus
 * eine ehrliche, feldgenaue Begründung. Nach dem Muster von
 * `CsvImportErgebnis.uebersprungen` (`packages/kosmo-kernel/src/derive/
 * berechnungsliste.ts`) — dort die rohe Zeile, hier zusätzlich der Grund,
 * weil ein JSON-Objekt (anders als eine CSV-Zeile) nicht auf einen Blick
 * lesbar ist.
 */
export interface RefImportFehler {
  zeile: number;
  grund: string;
}

export interface RefImportErgebnis {
  eintraege: RefEntry[];
  fehler: RefImportFehler[];
}

const REF_STRING_ARRAY_FELDER = ['authors', 'themes', 'materials', 'lecture_cluster', 'vibes', 'database_tags'] as const;
const REF_OPTIONALER_STRING_FELDER = [
  'slug',
  'full_description',
  'one_sentence',
  'short_description',
  'hero',
  'source_quality',
] as const;
const REF_ENTRY_TYPES: readonly RefEntryType[] = [
  'building',
  'urban_plan',
  'landscape_project',
  'text',
  'theory',
  'map',
  'infrastructure',
  'object',
  'event',
];
const REF_STYLE_SECTORS: readonly RefStyleSectorId[] = [
  'classical_architecture',
  'pre_modern_architecture',
  'modern_architecture',
  'postwar_modern_architecture',
  'sustainable_architecture',
  'vernacular_architecture',
];

function istNichtLeererString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function istStringOderNull(v: unknown): boolean {
  return v === null || typeof v === 'string';
}

/**
 * Validiert EIN rohes JSON-Objekt gegen den `RefEntry`-Vertrag — bewusst
 * schlank: die einzigen wirklich nicht-optionalen Felder der Schnittstelle
 * oben sind `id`/`title` (eine eigene, schlanke Notiz-Referenz muss nicht das
 * volle Master-Modell abbilden wie `schema/kosmo-reference.schema.json` es
 * für den kuratierten Seed verlangt). Jedes ANDERE Feld wird, wenn im
 * Objekt vorhanden, gegen seinen erwarteten Typ geprüft — fehlt es, ist das
 * kein Fehler. Nie eine geflickte/erratene Referenz bei einem Fehlschlag:
 * entweder die volle, unverändert übernommene Referenz oder ein Fehler.
 */
export function validiereRefEntry(roh: unknown): { ok: true; entry: RefEntry } | { ok: false; grund: string } {
  if (typeof roh !== 'object' || roh === null || Array.isArray(roh)) {
    return { ok: false, grund: 'kein JSON-Objekt' };
  }
  const r = roh as Record<string, unknown>;

  if (!istNichtLeererString(r.id)) return { ok: false, grund: 'Feld "id" fehlt oder ist kein nicht-leerer Text' };
  if (!istNichtLeererString(r.title)) return { ok: false, grund: 'Feld "title" fehlt oder ist kein nicht-leerer Text' };

  for (const feld of REF_STRING_ARRAY_FELDER) {
    const wert = r[feld];
    if (wert !== undefined && (!Array.isArray(wert) || !wert.every((x) => typeof x === 'string'))) {
      return { ok: false, grund: `Feld "${feld}" muss ein Array von Texten sein` };
    }
  }
  for (const feld of REF_OPTIONALER_STRING_FELDER) {
    const wert = r[feld];
    if (wert !== undefined && typeof wert !== 'string') {
      return { ok: false, grund: `Feld "${feld}" muss ein Text sein` };
    }
  }
  if (r.year_start !== undefined && r.year_start !== null && typeof r.year_start !== 'number') {
    return { ok: false, grund: 'Feld "year_start" muss eine Zahl oder null sein' };
  }
  if (r.year_end !== undefined && r.year_end !== null && typeof r.year_end !== 'number') {
    return { ok: false, grund: 'Feld "year_end" muss eine Zahl oder null sein' };
  }
  if (r.has_3d !== undefined && typeof r.has_3d !== 'boolean') {
    return { ok: false, grund: 'Feld "has_3d" muss ein Wahrheitswert sein' };
  }
  if (!istStringOderNull(r.city ?? null)) return { ok: false, grund: 'Feld "city" muss Text oder null sein' };
  if (!istStringOderNull(r.country ?? null)) return { ok: false, grund: 'Feld "country" muss Text oder null sein' };
  if (!istStringOderNull(r.program ?? null)) return { ok: false, grund: 'Feld "program" muss Text oder null sein' };
  if (r.entry_type !== undefined && !REF_ENTRY_TYPES.includes(r.entry_type as RefEntryType)) {
    return { ok: false, grund: `Feld "entry_type" ist kein bekannter Typ (${REF_ENTRY_TYPES.join(', ')})` };
  }
  if (r.style_sector !== undefined && r.style_sector !== null && !REF_STYLE_SECTORS.includes(r.style_sector as RefStyleSectorId)) {
    return { ok: false, grund: `Feld "style_sector" ist keine bekannte Stilepoche (${REF_STYLE_SECTORS.join(', ')})` };
  }
  if (r.visibility !== undefined && r.visibility !== 'public' && r.visibility !== 'private') {
    return { ok: false, grund: 'Feld "visibility" muss "public" oder "private" sein' };
  }

  return { ok: true, entry: roh as RefEntry };
}

/**
 * Validiert einen ganzen Import-Batch (das Ergebnis von `JSON.parse` einer
 * hochgeladenen Datei) — akzeptiert sowohl ein bares Array als auch die
 * Seed-Hülle `{ "entries": [...] }` (dieselbe Form wie `kosmodata-seed.json`,
 * damit ein Export/Re-Import-Zyklus ohne Umformatierung funktioniert).
 *
 * `vorhandeneIds` verhindert Kollisionen mit dem 112er-Seed ODER bereits
 * importierten eigenen Referenzen — ein kollidierender Eintrag wird NICHT
 * still überschrieben, sondern als eigene Fehlerzeile ausgewiesen. Innerhalb
 * desselben Batches gilt dieselbe Regel (keine zwei Zeilen mit derselben id).
 */
export function validiereRefImportBatch(daten: unknown, vorhandeneIds: ReadonlySet<string> = new Set()): RefImportErgebnis {
  const liste = Array.isArray(daten)
    ? daten
    : typeof daten === 'object' && daten !== null && Array.isArray((daten as { entries?: unknown }).entries)
      ? (daten as { entries: unknown[] }).entries
      : null;

  if (liste === null) {
    return {
      eintraege: [],
      fehler: [{ zeile: 1, grund: 'Erwartet ein JSON-Array von Referenzen oder { "entries": [...] }' }],
    };
  }

  const eintraege: RefEntry[] = [];
  const fehler: RefImportFehler[] = [];
  const gesehen = new Set(vorhandeneIds);

  liste.forEach((roh, i) => {
    const zeile = i + 1;
    const ergebnis = validiereRefEntry(roh);
    if (!ergebnis.ok) {
      fehler.push({ zeile, grund: ergebnis.grund });
      return;
    }
    if (gesehen.has(ergebnis.entry.id)) {
      fehler.push({ zeile, grund: `id "${ergebnis.entry.id}" existiert bereits (Seed oder vorheriger Import)` });
      return;
    }
    gesehen.add(ergebnis.entry.id);
    eintraege.push(ergebnis.entry);
  });

  return { eintraege, fehler };
}
