import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getCommand } from '@kosmo/kernel';
import { pruefeLaufPlan } from '@kosmo/ai';

/**
 * v0.8.5 PB2 «Autopilot-Drehbücher + Eval» (`docs/V085-SPEZ.md` §3 E4,
 * C-11/C-12) — leichter, IN-Workspace-Unit-Test (Vorbild `lauf-runner.test.ts`
 * in `@kosmo/ai`): parst die drei Kosmo-Läufe unter
 * `wissen/training/eval/kosmo-laufplaene/` mit `pruefeLaufPlan` (@kosmo/ai)
 * UND prüft, dass jede verwendete `commandId` ein reales, aktuelles Kernel-
 * Command ist (`getCommand()`, @kosmo/kernel — keine erfundene Id, Sanktion 3
 * der PB2-Auftragsliste). Der schwerere Beweis (Ausführung gegen einen
 * frischen KosmoDoc, Ergebnis-Kennzahlen) lebt im eigenständigen Prüfer
 * `wissen/training/eval/kosmo-laufplaene/pruefe-laufplaene.mts` (ausserhalb
 * des npm-Workspace, s. dortiger Kopfkommentar) — dieser Test hier deckt nur
 * den schnellen, workspace-internen Teil ab (`npm test -w @kosmo/orbit-app`).
 */

const HIER = dirname(fileURLToPath(import.meta.url));
const LAUFPLAENE_DIR = resolve(HIER, '../../../../wissen/training/eval/kosmo-laufplaene');

const DREHBUECHER = ['grundriss-rohbau.json', 'vis-demolauf.json', 'publish-blatt.json'];

function ladeRoh(datei: string): unknown {
  return JSON.parse(readFileSync(resolve(LAUFPLAENE_DIR, datei), 'utf8'));
}

describe('PB2-Drehbücher — pruefeLaufPlan (@kosmo/ai)', () => {
  it.each(DREHBUECHER)('%s ist ein strukturell valider LaufPlan', (datei) => {
    const ergebnis = pruefeLaufPlan(ladeRoh(datei));
    expect(ergebnis.ok, ergebnis.ok ? '' : (ergebnis as { error: string }).error).toBe(true);
  });

  it('jedes Drehbuch hat mindestens einen Schritt und einen nicht-leeren Titel', () => {
    for (const datei of DREHBUECHER) {
      const ergebnis = pruefeLaufPlan(ladeRoh(datei));
      if (!ergebnis.ok) throw new Error(`${datei}: ${ergebnis.error}`);
      expect(ergebnis.plan.titel.length).toBeGreaterThan(0);
      expect(ergebnis.plan.schritte.length).toBeGreaterThan(0);
    }
  });
});

describe('PB2-Drehbücher — commandId existiert real im Kernel (Sanktion 3: keine erfundene Id)', () => {
  it.each(DREHBUECHER)('%s verwendet ausschliesslich reale Kernel-Commands', (datei) => {
    const ergebnis = pruefeLaufPlan(ladeRoh(datei));
    if (!ergebnis.ok) throw new Error(`${datei}: ${ergebnis.error}`);
    for (const schritt of ergebnis.plan.schritte) {
      const cmd = getCommand(schritt.commandId);
      expect(cmd, `commandId «${schritt.commandId}» aus ${datei} ist kein reales Kernel-Command`).toBeDefined();
    }
  });

  it('grundriss-rohbau verwendet ausschliesslich design.*-Commands', () => {
    const ergebnis = pruefeLaufPlan(ladeRoh('grundriss-rohbau.json'));
    if (!ergebnis.ok) throw new Error(ergebnis.error);
    for (const s of ergebnis.plan.schritte) expect(s.commandId.startsWith('design.')).toBe(true);
  });

  it('vis-demolauf verwendet ausschliesslich vis.*-Commands', () => {
    const ergebnis = pruefeLaufPlan(ladeRoh('vis-demolauf.json'));
    if (!ergebnis.ok) throw new Error(ergebnis.error);
    for (const s of ergebnis.plan.schritte) expect(s.commandId.startsWith('vis.')).toBe(true);
  });

  it('publish-blatt verwendet ausschliesslich publish.*-Commands', () => {
    const ergebnis = pruefeLaufPlan(ladeRoh('publish-blatt.json'));
    if (!ergebnis.ok) throw new Error(ergebnis.error);
    for (const s of ergebnis.plan.schritte) expect(s.commandId.startsWith('publish.')).toBe(true);
  });

  it('jeder Schritt trägt eine nicht-leere Begründung (Nachvollziehbarkeit, E4)', () => {
    for (const datei of DREHBUECHER) {
      const ergebnis = pruefeLaufPlan(ladeRoh(datei));
      if (!ergebnis.ok) throw new Error(`${datei}: ${ergebnis.error}`);
      for (const s of ergebnis.plan.schritte) expect(s.begruendung.length).toBeGreaterThan(0);
    }
  });
});
