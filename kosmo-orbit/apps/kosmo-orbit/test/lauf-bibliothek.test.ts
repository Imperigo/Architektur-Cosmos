import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pruefeLaufPlan } from '@kosmo/ai';
import { LAUF_BIBLIOTHEK } from '../src/shell/KosmoPanel';

/**
 * v0.8.6/PB1 (E4, `docs/V086-SPEZ.md` §3, C-13) — die Lauf-Bibliothek im
 * `KosmoPanel` liest die drei kuratierten Drehbücher DIREKT aus
 * `wissen/training/eval/kosmo-laufplaene/*.json` (`resolveJsonModule`,
 * EINE Wahrheit statt einer gespiegelten TS-Konstante). Dieser Test ist der
 * geforderte Gegen-Beweis: er liest dieselben JSON-Dateien UNABHÄNGIG
 * (`node:fs`, kein Modul-Cache-Teilen mit dem `import`-Weg in KosmoPanel.tsx)
 * und vergleicht Titel + Schritt-Anzahl/-Inhalt — eine Drift zwischen
 * Bibliothek und Quelldatei würde hier auffliegen, exakt wie es ein
 * Byte-Vergleich bei einer gespiegelten TS-Konstante täte.
 */

const JSON_DIR = resolve(__dirname, '../../../../wissen/training/eval/kosmo-laufplaene');

function leseRoh(datei: string): { titel: string; schritte: unknown[] } {
  return JSON.parse(readFileSync(resolve(JSON_DIR, datei), 'utf8'));
}

describe('LAUF_BIBLIOTHEK — genau die 3 kuratierten Drehbücher, unverändert gegenüber der Quelle', () => {
  it('enthält genau 3 Einträge mit den erwarteten Namen', () => {
    expect(LAUF_BIBLIOTHEK).toHaveLength(3);
    expect(LAUF_BIBLIOTHEK.map((e) => e.name).sort()).toEqual(
      ['grundriss-rohbau', 'publish-blatt', 'vis-demolauf'].sort(),
    );
  });

  it.each([
    ['grundriss-rohbau', 'grundriss-rohbau.json'],
    ['vis-demolauf', 'vis-demolauf.json'],
    ['publish-blatt', 'publish-blatt.json'],
  ])('%s: Titel und Schritt-Folge decken sich mit der Quelldatei %s', (name, datei) => {
    const eintrag = LAUF_BIBLIOTHEK.find((e) => e.name === name);
    expect(eintrag).toBeDefined();
    const roh = leseRoh(datei);
    expect(eintrag!.label).toBe(roh.titel);
    expect(eintrag!.plan.titel).toBe(roh.titel);
    expect(eintrag!.plan.schritte).toEqual(roh.schritte);
  });

  it('jeder Eintrag ist selbst ein gültiger LaufPlan (pruefeLaufPlan)', () => {
    for (const eintrag of LAUF_BIBLIOTHEK) {
      const ergebnis = pruefeLaufPlan(eintrag.plan);
      expect(ergebnis.ok).toBe(true);
    }
  });

  it('jeder Schritt trägt eine nicht-leere Begründung (Sinn eines nachvollziehbaren Laufs)', () => {
    for (const eintrag of LAUF_BIBLIOTHEK) {
      for (const schritt of eintrag.plan.schritte) {
        expect(schritt.begruendung.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
