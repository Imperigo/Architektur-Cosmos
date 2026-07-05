#!/usr/bin/env node
/**
 * KosmoData-Seed-Builder (Batch 1, Codex-Übernahme).
 *
 * Liest die 112 realen Referenz-Einträge aus `data/mock-entries.json`
 * (Website-Repo-Root) und schreibt einen REICHEN Seed nach
 * `apps/kosmo-orbit/public/kosmodata-seed.json` — passend zum kanonischen
 * Vertrag `schema/kosmo-reference.schema.json`.
 *
 * Der Seed wird im App-Build gebündelt und öffentlich ausgeliefert. Deshalb
 * wird hier dieselbe Redaktion angewendet, die die Website in
 * `lib/public-kosmo.ts` (`publicAtlasEntries`, `publicSafeText`,
 * `isPublicDisplayMedia`) für ihre eigene öffentliche Ansicht fährt:
 *
 * - `media[]`: nur Einträge mit unbedenklicher Lizenz behalten die URL;
 *   gesperrte Lizenzen (all_rights_reserved / needs_permission /
 *   private_research / personal_only / unbekannt) verlieren url/credit/
 *   source_url und bleiben reine Platzhalter (type/label/placeholder).
 * - `source_candidates[]`: url und local_path werden entfernt (nur Titel,
 *   Zuverlässigkeit, Rechtestatus, Notizen bleiben — als Text redigiert).
 * - `asset_candidates[]`: local_path entfernt; planned_r2_key nur, wenn
 *   `public_display_allowed` true ist.
 * - `model_packages[].planned_paths`, `architecture_text.source_basis`,
 *   `model_3d.source_basis`: entfernt (interne Pfade/Herkunftsnotizen).
 * - `analysis_layers[]`: auf {analysis_type, summary, review_status}
 *   reduziert (kein r2_key/data).
 * - `ingestion_status`: auf öffentliche Felder reduziert (keine
 *   Speicher-Byte-Zähler).
 * - Freitextfelder (Beschreibungen, Notizen, source_basis-Texte,
 *   rights_summary) laufen durch `publicSafeText`, das bekannte private
 *   Pfadmuster ersetzt.
 *
 * Als Sicherheitsnetz läuft am Ende zusätzlich ein rekursiver Scan über das
 * GESAMTE gebaute Objekt: jeder verbleibende String, der `/mnt/`, `/home/`,
 * `source-root`/`source root` oder `onedrive` enthält, wird ersetzt — auch
 * in Feldern, die oben nicht einzeln behandelt wurden.
 *
 * Alle 112 Einträge bleiben im Seed (kuratierter öffentlicher Satz); nur
 * private Pfade/Medien werden geschwärzt, nichts wird gelöscht.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const kosmoOrbitRoot = path.resolve(here, '..');
const repoRoot = path.resolve(kosmoOrbitRoot, '..');
const sourcePath = path.join(repoRoot, 'data', 'mock-entries.json');
const outPath = path.join(kosmoOrbitRoot, 'apps', 'kosmo-orbit', 'public', 'kosmodata-seed.json');

const SEED_SCHEMA = 'kosmodata-seed/v2';
const SEED_SOURCE = 'architekturkosmos.ch';

// Dieselben Muster wie lib/public-kosmo.ts#publicSafeText (Website).
const PRIVATE_TEXT_PATTERNS = [
  [/archive-intake\/[^\s,;)]*/gi, 'interner Prüfpfad'],
  [/\/mnt\/[^\s,;)]*/gi, 'private storage path'],
  [/\/home\/[^\s,;)]*/gi, 'private home path'],
  [/source-root/gi, 'private source gate'],
  [/source root/gi, 'private source gate'],
  [/onedrive/gi, 'cloud sync'],
  [/private-library/gi, 'private library'],
];

function publicSafeText(value) {
  if (typeof value !== 'string' || value.length === 0) return value;
  let out = value;
  for (const [pattern, replacement] of PRIVATE_TEXT_PATTERNS) out = out.replace(pattern, replacement);
  return out;
}

/** Sicherheitsnetz: rekursiver Scrub über jeden verbliebenen String im Baum. */
function scrubDeep(value) {
  if (typeof value === 'string') return publicSafeText(value);
  if (Array.isArray(value)) return value.map(scrubDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, inner] of Object.entries(value)) out[key] = scrubDeep(inner);
    return out;
  }
  return value;
}

// Mirror von lib/media.ts: Blocklist statt Allowlist, weil die realen
// Lizenzwerte (cc_by, cc_by_sa, cc0, public_domain, own_work) breiter sind
// als eine enge "public_domain/licensed/own_work"-Allowlist es zuliesse.
const BLOCKED_PUBLIC_MEDIA_LICENSES = new Set([
  'all_rights_reserved',
  'needs_permission',
  'private_research',
  'personal_only',
  'unknown',
]);

function isPublicDisplayMedia(media) {
  return Boolean(media?.url) && !BLOCKED_PUBLIC_MEDIA_LICENSES.has(String(media?.license ?? ''));
}

function redactMedia(entry) {
  return (entry.media ?? []).map((media) => {
    const showUrl = isPublicDisplayMedia(media);
    return {
      type: media.type,
      label: media.label,
      placeholder: publicSafeText(media.placeholder),
      ...(showUrl ? { url: media.url } : {}),
      ...(showUrl && media.credit ? { credit: publicSafeText(media.credit) } : {}),
      ...(showUrl && media.source_url ? { source_url: media.source_url } : {}),
      ...(media.license !== undefined ? { license: media.license } : {}),
    };
  });
}

function redactSourceCandidates(entry) {
  if (!entry.source_candidates) return undefined;
  return entry.source_candidates.map((candidate) => {
    const { url: _url, local_path: _localPath, ...rest } = candidate;
    return {
      ...rest,
      title: publicSafeText(rest.title),
      ...(rest.notes !== undefined ? { notes: publicSafeText(rest.notes) } : {}),
    };
  });
}

function redactAssetCandidates(entry) {
  if (!entry.asset_candidates) return undefined;
  return entry.asset_candidates.map((candidate) => {
    const { local_path: _localPath, ...rest } = candidate;
    return {
      ...rest,
      title: publicSafeText(rest.title),
      planned_r2_key: rest.public_display_allowed ? rest.planned_r2_key : undefined,
    };
  });
}

function redactModelAssets(entry) {
  if (!entry.model_assets) return undefined;
  return entry.model_assets.map((asset) => ({
    ...asset,
    source_basis: publicSafeText(asset.source_basis),
  }));
}

function redactModelPackages(entry) {
  if (!entry.model_packages) return undefined;
  return entry.model_packages.map((pkg) => ({
    ...pkg,
    planned_paths: [],
    ...(pkg.notes !== undefined ? { notes: publicSafeText(pkg.notes) } : {}),
  }));
}

function redactSplatAssets(entry) {
  if (!entry.splat_assets) return undefined;
  return entry.splat_assets.map((asset) => ({
    ...asset,
    source_basis: publicSafeText(asset.source_basis),
  }));
}

function redactAnalysisLayers(entry) {
  if (!entry.analysis_layers) return undefined;
  return entry.analysis_layers.map((layer) => ({
    analysis_type: layer.analysis_type,
    summary: publicSafeText(layer.summary),
    review_status: layer.review_status,
  }));
}

function redactArchitectureText(entry) {
  if (!entry.architecture_text) return undefined;
  const at = entry.architecture_text;
  return {
    ...at,
    source_basis: undefined,
    overview: publicSafeText(at.overview),
    chapters: (at.chapters ?? []).map((chapter) => ({
      ...chapter,
      text: publicSafeText(chapter.text),
      source_basis: undefined,
    })),
  };
}

function redactModel3D(entry) {
  if (!entry.model_3d) return undefined;
  return {
    ...entry.model_3d,
    source_basis: undefined,
  };
}

function redactIngestionStatus(entry) {
  if (!entry.ingestion_status) return undefined;
  const ist = entry.ingestion_status;
  return {
    stage: ist.stage,
    source_status: ist.source_status,
    asset_status: ist.asset_status,
    model_status: ist.model_status,
    ...(ist.updated_at !== undefined ? { updated_at: ist.updated_at } : {}),
  };
}

function redactDatabaseProfile(entry) {
  if (!entry.database_profile) return undefined;
  return {
    ...entry.database_profile,
    ...(entry.database_profile.rights_summary !== undefined
      ? { rights_summary: publicSafeText(entry.database_profile.rights_summary) }
      : {}),
  };
}

/** Erstes öffentlich anzeigbares Bild — bevorzugt 'exterior' (mirror von primaryPublicProjectMediaUrl). */
function primaryHero(media) {
  const exterior = media.find((m) => m.type === 'exterior' && m.url);
  if (exterior) return exterior.url;
  const any = media.find((m) => m.url);
  return any ? any.url : null;
}

function buildSeedEntry(entry) {
  const media = redactMedia(entry);

  const richEntry = {
    // --- heutige (schlanke) Felder — Rückwärtskompatibilität mit dem
    // bisherigen RefEintrag/RefEntry aus live.ts / DataWorkspace.tsx ---
    id: entry.id,
    title: entry.title,
    year_start: entry.year_start,
    year_end: entry.year_end ?? null,
    authors: entry.authors ?? [],
    city: entry.city ?? null,
    country: entry.country ?? null,
    style_sector: entry.style_sector ?? null,
    themes: entry.themes ?? [],
    materials: entry.materials?.primary ?? [],
    program: entry.program?.type ?? null,
    one_sentence: publicSafeText(entry.one_sentence) ?? null,
    short_description: publicSafeText(entry.short_description) ?? null,
    hero: primaryHero(media),
    has_3d: Boolean(entry.model_3d),

    // --- reiche Ergänzung (Master-Datenmodell) ---
    slug: entry.slug,
    entry_type: entry.entry_type,
    full_description: publicSafeText(entry.full_description),
    visibility: 'public',
    source_quality: publicSafeText(entry.source_quality),
    lecture_cluster: entry.lecture_cluster,
    vibes: entry.vibes,
    database_tags: entry.database_tags,
    media,
    geo: entry.geo,
    materials_detail: entry.materials,
    program_detail: entry.program,
    context: entry.context,
    model_assets: redactModelAssets(entry),
    analysis_layers: redactAnalysisLayers(entry),
    analysis_observations: entry.analysis_observations,
    database_profile: redactDatabaseProfile(entry),
    architecture_text: redactArchitectureText(entry),
    model_3d: redactModel3D(entry),
    ingestion_status: redactIngestionStatus(entry),
    source_candidates: redactSourceCandidates(entry),
    asset_candidates: redactAssetCandidates(entry),
    model_packages: redactModelPackages(entry),
    splat_assets: redactSplatAssets(entry),

    // top-level source_documents/source_url bleiben bewusst weg (mirror
    // publicAtlasEntries): potenziell copyright-/rechtebelastete
    // Primärquellenverweise (Vorlesungs-PDFs etc.), keine Pfad-Leaks.
    source_documents: [],
    source_url: undefined,
  };

  return scrubDeep(richEntry);
}

async function main() {
  const raw = await readFile(sourcePath, 'utf8');
  const entries = JSON.parse(raw);
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`Keine Einträge in ${sourcePath} gefunden.`);
  }

  const seedEntries = entries.map(buildSeedEntry);
  const seed = {
    schema: SEED_SCHEMA,
    source: SEED_SOURCE,
    count: seedEntries.length,
    entries: seedEntries,
  };

  await writeFile(outPath, `${JSON.stringify(seed, null, 0)}\n`, 'utf8');
  console.log(`KosmoData-Seed geschrieben: ${outPath}`);
  console.log(`  Einträge: ${seedEntries.length}`);
  console.log(`  Schema: ${SEED_SCHEMA}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
