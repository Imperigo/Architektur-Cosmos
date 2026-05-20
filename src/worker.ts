import entriesData from '../data/mock-entries.json';
import relationsData from '../data/relations.json';
import rulesData from '../data/brain-rules.json';
import type { Entry, EntryRelation } from '../lib/types';

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
const relations = relationsData as EntryRelation[];
const brainRules = rulesData as BrainRules;

type BrainRules = {
  default_mode?: string;
  autonomy?: {
    posture?: string;
    must_ask_before?: string[];
  };
  entry_quality_targets?: {
    minimum_sources?: number;
    required_analysis_layers?: string[];
    required_model_parts?: string[];
  };
  priority_weights?: {
    missing_sources?: number;
    rights_blocked?: number;
    missing_model?: number;
    missing_analysis?: number;
    missing_relations?: number;
    pilot_entry?: number;
  };
  private_or_blocked_rights?: string[];
};

type BrainTask = {
  id: string;
  scope: 'system' | 'entry';
  kind: string;
  entry_id: string | null;
  entry_slug?: string;
  entry_title: string;
  title: string;
  body: string;
  priority: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  approval_required: boolean;
};

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

    if (url.pathname === '/api/brain/status') {
      return json(buildBrainStatus(), 200, 'public, max-age=300, s-maxage=300');
    }

    if (url.pathname === '/api/brain/latest-report') {
      return json(buildBrainReport(), 200, 'public, max-age=300, s-maxage=300');
    }

    if (url.pathname === '/api/brain/activation') {
      return json(buildBrainActivation(), 200, 'public, max-age=300, s-maxage=300');
    }

    if (url.pathname === '/api/brain/tasks') {
      const limit = clamp(numberParam(url.searchParams, 'limit') ?? 20, 1, 100);
      const tasks = filterBrainTasks(buildBrainTasks(), url.searchParams);
      return json({ count: tasks.length, results: tasks.slice(0, limit) }, 200, 'public, max-age=300, s-maxage=300');
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

function buildBrainStatus() {
  const summary = buildBrainSummary();
  const tasks = buildBrainTasks();

  return {
    status: 'ready',
    mode: brainRules.default_mode ?? 'autonomous_review',
    posture: brainRules.autonomy?.posture ?? 'active_self_healing_with_owner_approval',
    generated_at: new Date().toISOString(),
    source: 'static_worker_snapshot',
    writes_database: false,
    publishes: false,
    approval_required_before_execution: true,
    summary,
    coverage: buildBrainCoverage(summary),
    open_tasks: tasks.length,
    highest_priority_task: tasks[0] ?? null,
    endpoints: ['/api/brain/status', '/api/brain/latest-report', '/api/brain/activation', '/api/brain/tasks'],
    next_steps: [
      'Keep Cloud Brain read-only until D1 state and approval gates are reviewed.',
      'Create a dedicated architecture-cosmos-brain D1 database only after approval.',
      'Use Obsidian as a private review surface, not public asset storage.'
    ]
  };
}

function buildBrainActivation() {
  return {
    current_phase: 'phase_1_read_only_active',
    official_status: 'active_read_only',
    owner_approval_required: true,
    writes_database: false,
    publishes: false,
    sends_email: false,
    uploads_assets: false,
    phases: [
      {
        id: 'phase_1_read_only_active',
        label: 'Read-only Brain active',
        status: 'active',
        description: 'Brain API, status panel, reports, tasks and local exports are active. No cloud writes.'
      },
      {
        id: 'phase_2_d1_state',
        label: 'D1 Brain state',
        status: 'planned',
        description: 'Dedicated D1 database stores runs, tasks, reports and approvals after owner approval.'
      },
      {
        id: 'phase_3_scheduled_reports',
        label: 'Scheduled reports',
        status: 'planned',
        description: 'Cloudflare Cron produces scheduled Brain reports after D1 state is reviewed.'
      },
      {
        id: 'phase_4_owner_approvals',
        label: 'Owner approvals',
        status: 'planned',
        description: 'Signed approval or dashboard flow before any execution, email, upload, commit or publish.'
      },
      {
        id: 'phase_5_controlled_execution',
        label: 'Controlled execution',
        status: 'locked',
        description: 'Future PR-based execution only after security review and explicit owner approval.'
      }
    ],
    guardrails: [
      'No automatic commits, pushes or publishes.',
      'No production D1 writes without approval.',
      'No R2 uploads or private asset publication.',
      'No email sends until signed approval flow exists.',
      'Obsidian remains a private review surface.'
    ],
    next_recommended_action: 'Run npm run brain:d1-plan, then create architecture-cosmos-brain D1 only after owner approval.'
  };
}

function buildBrainReport() {
  const summary = buildBrainSummary();
  const tasks = buildBrainTasks();

  return {
    title: 'Architecture Cosmos Cloud Brain Report',
    generated_at: new Date().toISOString(),
    status: 'read_only_snapshot',
    writes_database: false,
    publishes: false,
    approval_required: true,
    summary,
    coverage: buildBrainCoverage(summary),
    watchlists: {
      missing_sources: entries.filter((entry) => sourceCountFor(entry) < minimumSourceTarget()).map(toBrainWatchItem).slice(0, 20),
      missing_models: entries.filter((entry) => !entryHas3dModel(entry)).map(toBrainWatchItem).slice(0, 20),
      missing_analysis: entries.filter((entry) => !entryHasAnalysis(entry)).map(toBrainWatchItem).slice(0, 20),
      public_candidates: entries
        .filter((entry) => entry.database_profile && sourceCountFor(entry) >= minimumSourceTarget() && !entryHasBlockedRights(entry))
        .map(toBrainWatchItem)
        .slice(0, 20)
    },
    top_tasks: tasks.slice(0, 10),
    obsidian: {
      role: 'private_knowledge_and_review_surface',
      suggested_vault_sections: ['00 Inbox', '01 Projects', '02 Sources', '03 Research Packs', '04 Brain Reports', '05 Decisions', '06 Taxonomies', '07 Blender + 3D']
    }
  };
}

function buildBrainSummary() {
  const brokenRelations = relations.filter((relation) => !entryById(relation.source_entry_id) || !entryById(relation.target_entry_id));
  const databaseProfiles = entries.filter((entry) => entry.database_profile).length;
  const modelReadyOrPlanned = entries.filter(entryHas3dModel).length;
  const analysisReadyOrPlanned = entries.filter(entryHasAnalysis).length;
  const sourceCandidateEntries = entries.filter((entry) => sourceCountFor(entry) > 0).length;
  const rightsBlocked = entries.filter(entryHasBlockedRights).length;

  return {
    entries: entries.length,
    relations: relations.length,
    broken_relations: brokenRelations.length,
    database_profiles: databaseProfiles,
    model_ready_or_planned: modelReadyOrPlanned,
    analysis_ready_or_planned: analysisReadyOrPlanned,
    source_candidate_entries: sourceCandidateEntries,
    rights_blocked: rightsBlocked
  };
}

function buildBrainCoverage(summary: ReturnType<typeof buildBrainSummary>) {
  return {
    database_profile_percent: percent(summary.database_profiles, summary.entries),
    model_percent: percent(summary.model_ready_or_planned, summary.entries),
    analysis_percent: percent(summary.analysis_ready_or_planned, summary.entries),
    source_candidate_percent: percent(summary.source_candidate_entries, summary.entries)
  };
}

function buildBrainTasks(): BrainTask[] {
  const tasks: BrainTask[] = [];
  const relationCounts = countRelations();
  const brokenRelations = relations.filter((relation) => !entryById(relation.source_entry_id) || !entryById(relation.target_entry_id));

  if (brokenRelations.length > 0) {
    tasks.push({
      id: 'system-broken-relations',
      scope: 'system',
      kind: 'integrity',
      entry_id: null,
      entry_title: 'Archive graph',
      title: 'Fix broken relations',
      body: `${brokenRelations.length} relation(s) point to missing entries.`,
      priority: 100,
      risk_level: 'high',
      approval_required: true
    });
  }

  const entriesWithoutProfile = entries.length - entries.filter((entry) => entry.database_profile).length;
  if (entriesWithoutProfile > entries.length * 0.5) {
    tasks.push({
      id: 'system-profile-coverage',
      scope: 'system',
      kind: 'database',
      entry_id: null,
      entry_title: 'Database coverage',
      title: 'Increase database profile coverage',
      body: `${entriesWithoutProfile} entries do not yet have database_profile metadata.`,
      priority: 52,
      risk_level: 'medium',
      approval_required: true
    });
  }

  for (const entry of entries) {
    const sourceCount = sourceCountFor(entry);
    const relationCount = relationCounts.get(entry.id) ?? 0;
    const pilotBoost = entry.database_profile ? priority('pilot_entry', 12) : 0;

    if (sourceCount < minimumSourceTarget()) {
      tasks.push(brainTask(entry, 'research', `Add source trail for ${entry.title}`, `Only ${sourceCount} source(s) attached. Target is ${minimumSourceTarget()}.`, priority('missing_sources', 22) + pilotBoost, 'medium'));
    }

    if (entryHasBlockedRights(entry)) {
      tasks.push(brainTask(entry, 'rights', `Rights review for ${entry.title}`, 'Entry contains private, blocked or unclear media/model rights. Keep assets link-only until cleared.', priority('rights_blocked', 18) + pilotBoost, 'high'));
    }

    if (!entryHas3dModel(entry)) {
      tasks.push(brainTask(entry, 'model', `Plan 3D layers for ${entry.title}`, 'No model_3d or model_assets found. Prepare full, structure and site layers.', priority('missing_model', 16) + pilotBoost, 'medium'));
    } else {
      const missingParts = requiredModelParts().filter((part) => !(entry.model_3d?.parts ?? []).some((modelPart) => modelPart.type === part));
      if (missingParts.length > 0) {
        tasks.push(brainTask(entry, 'model', `Complete Blender layer plan for ${entry.title}`, `Missing model parts: ${missingParts.join(', ')}.`, priority('missing_model', 16) - 4 + pilotBoost, 'medium'));
      }
    }

    if (!entryHasAnalysis(entry)) {
      tasks.push(brainTask(entry, 'analysis', `Add analysis layers for ${entry.title}`, 'No structure/material/tectonic analysis layers attached.', priority('missing_analysis', 14) + pilotBoost, 'medium'));
    } else {
      const analysisTypes = new Set<string>((entry.analysis_layers ?? []).map((layer) => layer.analysis_type));
      const missingAnalysis = requiredAnalysisLayers().filter((type) => !analysisTypes.has(type));
      if (missingAnalysis.length > 0) {
        tasks.push(brainTask(entry, 'analysis', `Complete analysis filters for ${entry.title}`, `Missing analysis layers: ${missingAnalysis.join(', ')}.`, priority('missing_analysis', 14) - 4 + pilotBoost, 'medium'));
      }
    }

    if (relationCount < 2) {
      tasks.push(brainTask(entry, 'relations', `Strengthen relation network for ${entry.title}`, `Only ${relationCount} relation(s). Add typological, material or source relations.`, priority('missing_relations', 10) + pilotBoost, 'low'));
    }
  }

  return tasks.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));
}

function filterBrainTasks(tasks: BrainTask[], params: URLSearchParams): BrainTask[] {
  const kinds = listParam(params, 'kind').map(normalize);
  const scopes = listParam(params, 'scope').map(normalize);
  const riskLevels = listParam(params, 'risk_level').map(normalize);
  const entryId = normalize(params.get('entry_id') ?? undefined);

  return tasks.filter((task) => {
    if (kinds.length && !kinds.includes(normalize(task.kind))) return false;
    if (scopes.length && !scopes.includes(normalize(task.scope))) return false;
    if (riskLevels.length && !riskLevels.includes(normalize(task.risk_level))) return false;
    if (entryId && normalize(task.entry_id ?? undefined) !== entryId) return false;
    return true;
  });
}

function brainTask(entry: Entry, kind: string, title: string, body: string, priorityValue: number, riskLevel: BrainTask['risk_level']): BrainTask {
  return {
    id: `${kind}-${entry.id}`,
    scope: 'entry',
    kind,
    entry_id: entry.id,
    entry_slug: entry.slug,
    entry_title: entry.title,
    title,
    body,
    priority: priorityValue,
    risk_level: riskLevel,
    approval_required: true
  };
}

function entryById(id: string): Entry | undefined {
  return entries.find((entry) => entry.id === id);
}

function countRelations(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const relation of relations) {
    counts.set(relation.source_entry_id, (counts.get(relation.source_entry_id) ?? 0) + 1);
    counts.set(relation.target_entry_id, (counts.get(relation.target_entry_id) ?? 0) + 1);
  }
  return counts;
}

function toBrainWatchItem(entry: Entry) {
  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    year_start: entry.year_start,
    entry_type: entry.entry_type
  };
}

function entryHasAnalysis(entry: Entry): boolean {
  return Boolean(entry.analysis_layers?.length || entry.analysis_observations?.length);
}

function entryHasBlockedRights(entry: Entry): boolean {
  const blocked = brainRules.private_or_blocked_rights ?? ['unknown', 'needs_permission', 'private_research', 'personal_only', 'all_rights_reserved'];
  const rightsValues = [
    ...(entry.media ?? []).map((media) => media.license),
    entry.model_3d?.license,
    ...(entry.model_3d?.parts ?? []).map((part) => part.license),
    ...(entry.asset_candidates ?? []).map((asset) => asset.rights_status),
    ...(entry.source_candidates ?? []).map((source) => source.rights_status)
  ];
  const rightsList: string[] = [];
  for (const value of rightsValues) {
    if (isDefinedString(value)) rightsList.push(value);
  }
  return rightsList.some((rights) => blocked.includes(rights));
}

function sourceCountFor(entry: Entry): number {
  return [
    entry.source_url,
    ...(entry.source_documents ?? []),
    ...(entry.source_candidates ?? []),
    ...(entry.source_assets ?? [])
  ].filter(Boolean).length;
}

function minimumSourceTarget(): number {
  return brainRules.entry_quality_targets?.minimum_sources ?? 3;
}

function requiredAnalysisLayers(): string[] {
  return brainRules.entry_quality_targets?.required_analysis_layers ?? ['structure', 'material_system', 'tectonics'];
}

function requiredModelParts(): string[] {
  return brainRules.entry_quality_targets?.required_model_parts ?? ['full', 'structure', 'site'];
}

function priority(key: keyof NonNullable<BrainRules['priority_weights']>, fallback: number): number {
  return brainRules.priority_weights?.[key] ?? fallback;
}

function percent(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
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

function isDefinedString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
