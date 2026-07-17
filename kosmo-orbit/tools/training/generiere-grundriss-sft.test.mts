#!/usr/bin/env -S npx tsx
/**
 * Selbständige Prüfung für `tools/training/generiere-grundriss-sft.mts`
 * (v0.8.2/P2) — kein Test-Framework nötig, gleiches Muster wie
 * `tools/secret-scan.test.mjs`: reines Node/tsx, Exit-Code 0 = alle
 * Prüfungen grün, sonst != 0 mit Liste der Fehlschläge.
 *
 * Deckt die P2-Gate-Beweise ab (V082-SPEZ.md §6.2):
 *  - Doppellauf erzeugt eine byte-identische Datei (deterministischer Seed).
 *  - jede Zeile ist valides JSON im kosmo-sft/v1-Schema (V082-SPEZ.md §3.1).
 *  - `meta.id` ist eindeutig innerhalb der Datei.
 *  - alle vier Aufgaben-/Pool-Kategorien sind vertreten (Rechteck, L-Form,
 *    Ablehn-/Diagnose, Segmentierung).
 *
 * Aufruf: npx tsx tools/training/generiere-grundriss-sft.test.mts
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SKRIPT = join(HIER, 'generiere-grundriss-sft.mts');

const failures: string[] = [];
function check(label: string, condition: boolean): void {
  if (!condition) failures.push(label);
}

function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

const tmp = mkdtempSync(join(tmpdir(), 'grundriss-sft-test-'));
try {
  const out1 = join(tmp, 'lauf1.jsonl');
  const out2 = join(tmp, 'lauf2.jsonl');

  execFileSync('npx', ['tsx', SKRIPT, `--out=${out1}`], { stdio: 'pipe' });
  execFileSync('npx', ['tsx', SKRIPT, `--out=${out2}`], { stdio: 'pipe' });

  const buf1 = readFileSync(out1);
  const buf2 = readFileSync(out2);
  check('Doppellauf ist byte-identisch (Buffer.equals)', buf1.equals(buf2));
  check('Doppellauf-Hashes stimmen überein (sha256)', sha256(buf1) === sha256(buf2));

  const zeilen = buf1
    .toString('utf8')
    .split('\n')
    .filter((l) => l.length > 0);
  check('mindestens 300 Zeilen (Spec: hunderte bis tausende)', zeilen.length >= 300);

  const ids = new Set<string>();
  let nRect = 0;
  let nL = 0;
  let nAblehn = 0;
  let nSegment = 0;
  let allesValide = true;

  for (const zeile of zeilen) {
    try {
      const obj = JSON.parse(zeile) as {
        messages: { role: string; content: string }[];
        meta: {
          id: string;
          adapter: string;
          quelle: string;
          visibility: string;
          qualitaet: { checksBestanden: boolean; hinweise: string[] };
        };
      };
      const rollen = obj.messages.map((m) => m.role).join(',');
      if (rollen !== 'system,user,assistant') allesValide = false;
      // user/assistant content muss selbst valides JSON sein (JSON-in-JSON-in-JSONL)
      JSON.parse(obj.messages[1]!.content);
      JSON.parse(obj.messages[2]!.content);
      if (obj.meta.adapter !== 'kosmo-zeichner-grundriss') allesValide = false;
      if (obj.meta.visibility !== 'public') allesValide = false;
      if (typeof obj.meta.qualitaet.checksBestanden !== 'boolean') allesValide = false;
      if (!Array.isArray(obj.meta.qualitaet.hinweise)) allesValide = false;
      if (ids.has(obj.meta.id)) allesValide = false;
      ids.add(obj.meta.id);
      if (obj.meta.id.startsWith('grundriss-v1-rect-')) nRect++;
      else if (obj.meta.id.startsWith('grundriss-v1-l-')) nL++;
      else if (obj.meta.id.startsWith('grundriss-v1-ablehn-')) nAblehn++;
      else if (obj.meta.id.startsWith('grundriss-v1-segment-')) nSegment++;
    } catch {
      allesValide = false;
    }
  }

  check('jede Zeile ist valides JSON im kosmo-sft/v1-Schema', allesValide);
  check('meta.id ist eindeutig innerhalb der Datei', ids.size === zeilen.length);
  check('Rechteck-Grundrisse vertreten', nRect > 0);
  check('L-Form-Grundrisse vertreten', nL > 0);
  check('Ablehn-/Diagnose-Fälle vertreten', nAblehn > 0);
  check('Wohnungs-Segmentierung vertreten', nSegment > 0);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`FEHLGESCHLAGEN (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
} else {
  console.log('Alle Prüfungen grün: generiere-grundriss-sft.mts');
  process.exit(0);
}
