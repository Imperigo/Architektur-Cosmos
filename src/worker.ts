import entriesData from '../data/mock-entries.json';
import type { Entry } from '../lib/types';

type AssetsBinding = {
  fetch(request: Request): Promise<Response>;
};

type Env = {
  ASSETS: AssetsBinding;
};

type SearchResponse = {
  count: number;
  results: Entry[];
};

const entries = entriesData as Entry[];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json; charset=utf-8'
};

const countryAliases: Record<string, string[]> = {
  ch: ['ch', 'switzerland', 'schweiz', 'suisse', 'svizzera'],
  fr: ['fr', 'france', 'frankreich'],
  it: ['it', 'italy', 'italien', 'italia'],
  de: ['de', 'germany', 'deutschland'],
  us: ['us', 'usa', 'unitedstates', 'unitedstatesofamerica', 'vereinigtestaaten'],
  uk: ['uk', 'gb', 'greatbritain', 'unitedkingdom']
};

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed' }, 405, 'no-store');
    }

    if (url.pathname === '/api/entries.json') {
      return json(entries, 200, 'public, max-age=3600, s-maxage=3600');
    }

    if (url.pathname === '/api/taxonomies.json') {
      return json(buildTaxonomies(entries), 200, 'public, max-age=3600, s-maxage=3600');
    }

    if (url.pathname === '/api/search') {
      return json(searchEntries(entries, url.searchParams), 200, 'public, max-age=300, s-maxage=3600');
    }

    return json({ error: 'Unknown API route' }, 404, 'no-store');
  }
};

export default worker;

function json(body: unknown, status = 200, cacheControl = 'no-store'): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders,
      'Cache-Control': cacheControl
    }
  });
}

function searchEntries(sourceEntries: Entry[], params: URLSearchParams): SearchResponse {
  const countries = listParam(params, 'country').map(normalizeCountryFilter).filter(Boolean);
  const cantons = listParam(params, 'canton').map(normalize);
  const materialsAny = listParam(params, 'materials').map(normalize);
  const materialsAll = listParam(params, 'materials_all').map(normalize);
  const programs = listParam(params, 'program').map(normalize);
  const topographies = listParam(params, 'topography').map(normalize);
  const settings = listParam(params, 'setting').map(normalize);
  const themes = listParam(params, 'themes').map(normalize);
  const styleSectors = listParam(params, 'style_sector').map(normalize);
  const entryTypes = listParam(params, 'entry_type').map(normalize);
  const yearMin = numberParam(params, 'year_min');
  const yearMax = numberParam(params, 'year_max');
  const has3dModel = booleanParam(params, 'has_3d_model');
  const geoNear = geoNearParam(params);
  const limit = clamp(numberParam(params, 'limit') ?? 50, 1, 200);

  const results = sourceEntries.filter((entry) => {
    if (countries.length && !countries.includes(normalizeCountryFilter(entry.country))) return false;
    if (cantons.length && !cantons.includes(normalize(entry.geo?.canton))) return false;
    if (programs.length && !programs.some((program) => entryProgramTags(entry).includes(program))) return false;
    if (topographies.length && !topographies.includes(normalize(entry.context?.topography))) return false;
    if (settings.length && !settings.includes(normalize(entry.context?.setting))) return false;
    if (themes.length && !themes.some((theme) => entry.themes.map(normalize).includes(theme))) return false;
    if (styleSectors.length && !styleSectors.includes(normalize(entry.style_sector))) return false;
    if (entryTypes.length && !entryTypes.includes(normalize(entry.entry_type))) return false;
    if (yearMin !== undefined && entry.year_start < yearMin) return false;
    if (yearMax !== undefined && entry.year_start > yearMax) return false;
    if (has3dModel !== undefined && entryHas3dModel(entry) !== has3dModel) return false;
    if (materialsAny.length && !materialsAny.some((material) => entryMaterialTags(entry).includes(material))) return false;
    if (materialsAll.length && !materialsAll.every((material) => entryMaterialTags(entry).includes(material))) return false;
    if (geoNear && !entryWithinRadius(entry, geoNear.lat, geoNear.lon, geoNear.radiusKm)) return false;
    return true;
  });

  return {
    count: results.length,
    results: results.slice(0, limit)
  };
}

function buildTaxonomies(sourceEntries: Entry[]) {
  return {
    countries: unique(sourceEntries.map((entry) => normalizeCountryFilter(entry.country)).filter(Boolean)),
    cantons: unique(sourceEntries.map((entry) => entry.geo?.canton).filter(isString)),
    materials: unique(sourceEntries.flatMap((entry) => entry.materials?.primary ?? [])),
    stone_types: unique(sourceEntries.flatMap((entry) => entry.materials?.stone_type ?? [])),
    secondary_materials: unique(sourceEntries.flatMap((entry) => entry.materials?.secondary ?? [])),
    programs: unique(sourceEntries.flatMap(entryProgramLabels)),
    topographies: unique(sourceEntries.map((entry) => entry.context?.topography).filter(isString)),
    settings: unique(sourceEntries.map((entry) => entry.context?.setting).filter(isString)),
    heritage_contexts: unique(sourceEntries.flatMap((entry) => entry.context?.heritage_context ?? [])),
    themes: unique(sourceEntries.flatMap((entry) => entry.themes)),
    style_sectors: unique(sourceEntries.map((entry) => entry.style_sector)),
    entry_types: unique(sourceEntries.map((entry) => entry.entry_type)),
    model_parts: unique(sourceEntries.flatMap((entry) => entry.model_3d?.parts?.map((part) => part.type) ?? [])),
    vibes: unique(sourceEntries.flatMap((entry) => entry.vibes ?? []))
  };
}

function listParam(params: URLSearchParams, key: string): string[] {
  return params
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function numberParam(params: URLSearchParams, key: string): number | undefined {
  const value = params.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function booleanParam(params: URLSearchParams, key: string): boolean | undefined {
  const value = params.get(key);
  if (!value) return undefined;
  const normalized = normalize(value);
  if (['1', 'true', 'yes'].includes(normalized)) return true;
  if (['0', 'false', 'no'].includes(normalized)) return false;
  return undefined;
}

function geoNearParam(params: URLSearchParams): { lat: number; lon: number; radiusKm: number } | undefined {
  const raw = params.get('geo_near');
  const radiusKm = numberParam(params, 'radius_km') ?? 50;
  if (!raw) return undefined;
  const [latRaw, lonRaw] = raw.split(',').map((value) => Number(value.trim()));
  if (!Number.isFinite(latRaw) || !Number.isFinite(lonRaw) || radiusKm <= 0) return undefined;
  return { lat: latRaw, lon: lonRaw, radiusKm };
}

function normalize(value: string | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeCountryFilter(value: string | undefined): string {
  const normalized = normalize(value);
  const match = Object.entries(countryAliases).find(([, aliases]) => aliases.includes(normalized));
  return match?.[0] ?? normalized;
}

function entryMaterialTags(entry: Entry): string[] {
  return [
    ...(entry.materials?.primary ?? []),
    ...(entry.materials?.stone_type ?? []),
    ...(entry.materials?.secondary ?? [])
  ].map(normalize);
}

function entryProgramTags(entry: Entry): string[] {
  return entryProgramLabels(entry).map(normalize);
}

function entryProgramLabels(entry: Entry): string[] {
  return [entry.program?.type, entry.program?.subtype, entry.entry_type].filter((value): value is string => Boolean(value));
}

function entryHas3dModel(entry: Entry): boolean {
  return Boolean(entry.model_3d?.glb_url || entry.model_3d?.parts?.length || entry.model_assets?.length);
}

function entryWithinRadius(entry: Entry, lat: number, lon: number, radiusKm: number): boolean {
  if (typeof entry.geo?.lat !== 'number' || typeof entry.geo.lon !== 'number') return false;
  return distanceKm(lat, lon, entry.geo.lat, entry.geo.lon) <= radiusKm;
}

function distanceKm(latA: number, lonA: number, latB: number, lonB: number): number {
  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(latB - latA);
  const dLon = degreesToRadians(lonB - lonA);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(latA)) *
      Math.cos(degreesToRadians(latB)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function isString(value: string | undefined): value is string {
  return Boolean(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
