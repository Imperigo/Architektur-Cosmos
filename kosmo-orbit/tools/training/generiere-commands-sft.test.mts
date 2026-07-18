#!/usr/bin/env -S npx tsx
/**
 * Selbständige Prüfung für `tools/training/generiere-commands-sft.mts`
 * (v0.8.3/P4) — kein Test-Framework nötig, gleiches Muster wie
 * `tools/training/generiere-grundriss-sft.test.mts`/`tools/secret-scan.test.mjs`:
 * reines Node/tsx, Exit-Code 0 = alle Prüfungen grün, sonst != 0 mit Liste
 * der Fehlschläge.
 *
 * Deckt die P4-Gate-Beweise ab (`docs/V083-SPEZ.md` §7/§12 C-15/C-16):
 *  - Doppellauf erzeugt eine byte-identische Datei (deterministischer Seed).
 *  - jede Zeile ist valides JSON im kosmo-sft/v1-Schema.
 *  - meta.id ist eindeutig innerhalb der Datei.
 *  - jede VALIDE Zeile (Assistant-Content beginnt mit `{`) ist ein Tool-Call,
 *    dessen `parameters` GEGEN DAS ECHTE zod-Schema des referenzierten
 *    Commands validiert (`cmd.params.parse(...)`, das "z.parse-Beweis"-Gate)
 *    UND dessen `tool`-Name über `toolNameFor()`/`commandTools()` real
 *    existiert.
 *  - jede ABLEHN-Zeile (Assistant-Content KEIN Tool-Call-JSON) trägt
 *    mindestens einen `qualitaet.hinweise`-Eintrag (ehrliche Begründung).
 *  - die Ablehn-Quote liegt zwischen 10% und 15% (Vorgabe V083-SPEZ §7).
 *  - jeder registrierte Command (`allCommands()`) kommt mindestens einmal
 *    als `meta.quelle` vor (Vollständigkeit über die ganze Registry).
 *
 * Aufruf: npx tsx tools/training/generiere-commands-sft.test.mts
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allCommands } from '@kosmo/kernel';
import { commandTools, toolNameFor } from '@kosmo/ai';

const HIER = dirname(fileURLToPath(import.meta.url));
const SKRIPT = join(HIER, 'generiere-commands-sft.mts');

const failures: string[] = [];
function check(label: string, condition: boolean): void {
  if (!condition) failures.push(label);
}

function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

const tmp = mkdtempSync(join(tmpdir(), 'commands-sft-test-'));
try {
  const out1 = join(tmp, 'lauf1.jsonl');
  const out2 = join(tmp, 'lauf2.jsonl');

  execFileSync('npx', ['tsx', SKRIPT, `--out=${out1}`], { stdio: 'pipe' });
  execFileSync('npx', ['tsx', SKRIPT, `--out=${out2}`], { stdio: 'pipe' });

  const buf1 = readFileSync(out1);
  const buf2 = readFileSync(out2);
  check('Doppellauf ist byte-identisch (Buffer.equals)', buf1.equals(buf2));
  check('Doppellauf-Hashes stimmen überein (sha256)', sha256(buf1) === sha256(buf2));
  console.log(`  sha256 Lauf 1: ${sha256(buf1)}`);
  console.log(`  sha256 Lauf 2: ${sha256(buf2)}`);

  const zeilen = buf1
    .toString('utf8')
    .split('\n')
    .filter((l) => l.length > 0);
  check('mindestens 200 Zeilen (108 Commands × 3 valide + Ablehn-Quote)', zeilen.length >= 200);

  const cmdsById = new Map(allCommands().map((c) => [c.id, c]));
  const toolNamesReal = new Set(commandTools().map((t) => t.name));

  const ids = new Set<string>();
  const kommandoGetroffen = new Set<string>();
  let nValide = 0;
  let nAblehn = 0;
  let allesValide = true;
  let alleToolCallsSchemaValide = true;
  let alleAblehnBegruendet = true;
  let alleQuelleAufgeloest = true;

  for (const zeile of zeilen) {
    let obj: any;
    try {
      obj = JSON.parse(zeile);
    } catch {
      allesValide = false;
      continue;
    }
    const rollen = obj.messages?.map((m: any) => m.role).join(',');
    if (rollen !== 'system,user,assistant') allesValide = false;
    if (obj.meta?.adapter !== 'kosmo-zeichner-commands') allesValide = false;
    if (obj.meta?.visibility !== 'public') allesValide = false;
    if (typeof obj.meta?.qualitaet?.checksBestanden !== 'boolean') allesValide = false;
    if (!Array.isArray(obj.meta?.qualitaet?.hinweise)) allesValide = false;
    if (typeof obj.messages?.[1]?.content !== 'string' || obj.messages[1].content.length === 0) allesValide = false;

    if (ids.has(obj.meta?.id)) allesValide = false;
    ids.add(obj.meta?.id);

    const quelle: string = obj.meta?.quelle ?? '';
    const m = /^command:(.+)$/.exec(quelle);
    if (!m) {
      alleQuelleAufgeloest = false;
    } else {
      const cmdId = m[1]!;
      const cmd = cmdsById.get(cmdId);
      if (!cmd) {
        alleQuelleAufgeloest = false;
      } else {
        kommandoGetroffen.add(cmdId);
        const assistantContent: string = obj.messages[2]?.content ?? '';
        if (assistantContent.trim().startsWith('{')) {
          nValide++;
          try {
            const call = JSON.parse(assistantContent);
            if (typeof call.tool !== 'string' || !toolNamesReal.has(call.tool)) alleToolCallsSchemaValide = false;
            if (toolNameFor(cmdId) !== call.tool) alleToolCallsSchemaValide = false;
            // DAS Kernkriterium (Playbook §Qualitätskriterien): der Tool-Call
            // MUSS real gegen das echte zod-Schema des Commands validieren.
            (cmd.params as any).parse(call.parameters);
          } catch {
            alleToolCallsSchemaValide = false;
          }
        } else {
          nAblehn++;
          if (!Array.isArray(obj.meta?.qualitaet?.hinweise) || obj.meta.qualitaet.hinweise.length === 0) {
            alleAblehnBegruendet = false;
          }
        }
      }
    }
  }

  check('jede Zeile ist valides JSON im kosmo-sft/v1-Schema', allesValide);
  check('meta.id ist eindeutig innerhalb der Datei', ids.size === zeilen.length);
  check('meta.quelle löst bei jeder Zeile auf ein echtes Command auf', alleQuelleAufgeloest);
  check('valide Tool-Call-Zeilen vorhanden', nValide > 0);
  check('Ablehn-/Diagnose-Zeilen vorhanden', nAblehn > 0);
  check(
    '100% zod-valide: jeder Tool-Call besteht cmd.params.parse() + realer Tool-Name (toolNameFor/commandTools)',
    alleToolCallsSchemaValide,
  );
  check('jede Ablehn-Zeile trägt eine Begründung in meta.qualitaet.hinweise', alleAblehnBegruendet);

  const ablehnQuote = nAblehn / (nValide + nAblehn);
  check(`Ablehn-Quote liegt zwischen 10% und 15% (Ist: ${(ablehnQuote * 100).toFixed(1)}%)`, ablehnQuote >= 0.1 && ablehnQuote <= 0.15);

  const alleCommandIds = new Set(allCommands().map((c) => c.id));
  const fehlend = [...alleCommandIds].filter((id) => !kommandoGetroffen.has(id));
  check(
    `jeder registrierte Command kommt mindestens einmal als meta.quelle vor (${kommandoGetroffen.size}/${alleCommandIds.size}${fehlend.length > 0 ? `, fehlend: ${fehlend.slice(0, 5).join(', ')}` : ''})`,
    fehlend.length === 0,
  );

  console.log(`  ${zeilen.length} Zeilen (${nValide} valide, ${nAblehn} Ablehn/Diagnose, Quote ${(ablehnQuote * 100).toFixed(1)}%)`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`FEHLGESCHLAGEN (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
} else {
  console.log('Alle Prüfungen grün: generiere-commands-sft.mts');
  process.exit(0);
}
