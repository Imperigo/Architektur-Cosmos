import { readFileSync, writeFileSync } from 'node:fs';
import { expect } from 'vitest';

/**
 * Golden-Byte-Vergleich mit dokumentiertem Regenerationsweg (v0.7.3 D1,
 * `docs/GOLDEN-WECHSEL-D1.md` §3): ohne Umgebungsvariable der harte
 * Byte-Vergleich wie bisher; `GOLDEN_UPDATE=1 npx vitest run` schreibt die
 * Goldens neu — NUR für bewusste, dokumentierte Sammelwechsel (Golden-Regime,
 * Grundsatz 4 der Gestaltungs-Spez): Erwartungsliste VOR der Regeneration,
 * danach `git diff` Zeile für Zeile reviewen, svg-qa, volle Suite.
 */
export function pruefeGolden(erzeugt: string, goldenUrl: URL): void {
  if (process.env['GOLDEN_UPDATE'] === '1') {
    writeFileSync(goldenUrl, erzeugt);
    return;
  }
  expect(erzeugt).toBe(readFileSync(goldenUrl, 'utf8'));
}
