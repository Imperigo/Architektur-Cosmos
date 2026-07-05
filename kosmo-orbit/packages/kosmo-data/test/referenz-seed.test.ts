import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Referenz-Seed-Vertrag (Batch 1, Codex-Übernahme).
 *
 * Prüft den generierten Master-Seed (apps/kosmo-orbit/public/kosmodata-seed.json,
 * gebaut von tools/build-kosmodata-seed.mjs aus data/mock-entries.json) gegen
 * den kanonischen Vertrag schema/kosmo-reference.schema.json:
 *
 * 1. Jeder Eintrag trägt alle Pflichtfelder des Schemas, im richtigen
 *    Grundtyp (string/array/integer).
 * 2. Kein Feld im gesamten Seed enthält ein privates Pfadmuster
 *    (/mnt/, /home/, source-root, onedrive) — der Seed wird im App-Build
 *    gebündelt und öffentlich ausgeliefert.
 * 3. Medien mit gesperrter Lizenz (all_rights_reserved / needs_permission /
 *    private_research / personal_only / unbekannt) tragen keine URL.
 *
 * Bewusst ein manueller struktureller Check statt eines ajv-basierten
 * Vollvalidators: ajv ist im Workspace nur eine tiefe transitive Abhängigkeit
 * (vite-plugin-pwa → workbox-build), keine deklarierte Dependency irgendeines
 * Packages — siehe Aufgabenstellung Batch 1, Punkt 4.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..', '..');
const schemaPath = path.join(repoRoot, 'schema', 'kosmo-reference.schema.json');
const seedPath = path.join(repoRoot, 'kosmo-orbit', 'apps', 'kosmo-orbit', 'public', 'kosmodata-seed.json');

interface JsonSchemaLike {
  required: string[];
  properties: Record<string, { type?: string | string[]; $ref?: string }>;
  $defs: Record<string, { type?: string | string[] }>;
}

const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as JsonSchemaLike;
const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as {
  schema: string;
  source: string;
  count: number;
  entries: Array<Record<string, unknown>>;
};

const PRIVATE_PATH_PATTERNS: RegExp[] = [/\/mnt\//i, /\/home\//i, /source-root/i, /source root/i, /onedrive/i];

/** Grundtyp einer Schema-Property auflösen (folgt einem $ref-Sprung in $defs). */
function resolveBasicType(propName: string): string | string[] | undefined {
  const prop = schema.properties[propName];
  if (!prop) return undefined;
  if (prop.type) return prop.type;
  if (prop.$ref) {
    const defName = prop.$ref.replace('#/$defs/', '');
    return schema.$defs[defName]?.type;
  }
  return undefined;
}

function matchesBasicType(value: unknown, basicType: string | string[] | undefined): boolean {
  const types = Array.isArray(basicType) ? basicType : basicType ? [basicType] : [];
  if (types.length === 0) return value !== undefined;
  return types.some((type) => {
    if (type === 'string') return typeof value === 'string';
    if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
    if (type === 'number') return typeof value === 'number';
    if (type === 'array') return Array.isArray(value);
    if (type === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value);
    if (type === 'boolean') return typeof value === 'boolean';
    if (type === 'null') return value === null;
    return true;
  });
}

/** Rekursiver Scan: sammelt jeden String-Wert, der ein privates Pfadmuster enthält. */
function findPrivatePathHits(value: unknown, at = '$'): Array<{ at: string; sample: string }> {
  const hits: Array<{ at: string; sample: string }> = [];
  if (typeof value === 'string') {
    for (const pattern of PRIVATE_PATH_PATTERNS) {
      if (pattern.test(value)) {
        hits.push({ at, sample: value.slice(0, 160) });
        break;
      }
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => hits.push(...findPrivatePathHits(item, `${at}[${index}]`)));
  } else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) hits.push(...findPrivatePathHits(inner, `${at}.${key}`));
  }
  return hits;
}

const BLOCKED_PUBLIC_MEDIA_LICENSES = new Set([
  'all_rights_reserved',
  'needs_permission',
  'private_research',
  'personal_only',
  'unknown',
]);

describe('kosmodata-seed.json — Vertrag mit schema/kosmo-reference.schema.json', () => {
  it('lädt Schema und Seed', () => {
    expect(schema.required.length).toBeGreaterThan(0);
    expect(seed.entries.length).toBe(112);
    expect(seed.count).toBe(seed.entries.length);
    expect(seed.schema).toBe('kosmodata-seed/v2');
  });

  it('jeder Eintrag trägt alle Pflichtfelder des Schemas im richtigen Grundtyp', () => {
    const missing: string[] = [];
    for (const entry of seed.entries) {
      const id = String(entry.id ?? entry.slug ?? '?');
      for (const field of schema.required) {
        const value = entry[field];
        if (value === undefined || value === null) {
          missing.push(`${id}: fehlt "${field}"`);
          continue;
        }
        const basicType = resolveBasicType(field);
        if (!matchesBasicType(value, basicType)) {
          missing.push(`${id}: "${field}" hat falschen Typ (erwartet ${JSON.stringify(basicType)}, bekam ${typeof value})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('jeder Eintrag trägt visibility (Default "public")', () => {
    for (const entry of seed.entries) {
      expect(['public', 'private']).toContain(entry.visibility);
    }
  });

  it('kein Feld im gesamten Seed enthält ein privates Pfadmuster (/mnt/, /home/, source-root, onedrive)', () => {
    const hits = findPrivatePathHits(seed);
    expect(hits).toEqual([]);
  });

  it('Medien mit gesperrter Lizenz tragen keine URL (nur öffentlich anzeigbare Medien sind verlinkt)', () => {
    const leaks: string[] = [];
    for (const entry of seed.entries) {
      const media = Array.isArray(entry.media) ? (entry.media as Array<Record<string, unknown>>) : [];
      for (const item of media) {
        const license = String(item.license ?? '');
        if (item.url && BLOCKED_PUBLIC_MEDIA_LICENSES.has(license)) {
          leaks.push(`${entry.id}: media(${item.type}) hat url trotz Lizenz "${license}"`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it('source_candidates tragen weder url noch local_path (Website-Redaktion gespiegelt)', () => {
    const leaks: string[] = [];
    for (const entry of seed.entries) {
      const candidates = Array.isArray(entry.source_candidates) ? (entry.source_candidates as Array<Record<string, unknown>>) : [];
      for (const candidate of candidates) {
        if ('url' in candidate || 'local_path' in candidate) {
          leaks.push(`${entry.id}: source_candidate "${candidate.title}" trägt noch url/local_path`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });
});
