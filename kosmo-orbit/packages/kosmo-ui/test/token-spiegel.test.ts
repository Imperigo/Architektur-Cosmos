import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ink, motion, paper, radius, scale, type } from '../src/tokens';

/**
 * Token-Spiegel-Wächter (W0, UI-KONZEPT-065 §2): `aura.css` ist die einzige
 * Wahrheit, `tokens.ts` ihr TS-Spiegel. Dieser Test parst aura.css mit
 * Regex und vergleicht die Werte gegen die tokens.ts-Exporte — jede
 * Abweichung ist ein Testfehler mit einer Meldung, die sagt, WELCHER Wert
 * WO auseinandergelaufen ist (statt eines nackten "expected/received").
 */

const auraPath = path.resolve(__dirname, '../src/aura.css');
const auraCss = readFileSync(auraPath, 'utf8');

/** Extrahiert den `{ ... }`-Block, dessen öffnende Klammer als erste nach
 * `selectorNeedle` folgt (Klammer-Tiefe wird gezählt, falls je verschachtelt
 * würde — aktuell nicht der Fall, aber robust gegen künftige CSS-Funktionen). */
function block(css: string, selectorNeedle: string): string {
  const start = css.indexOf(selectorNeedle);
  if (start === -1) {
    throw new Error(`token-spiegel: Selektor "${selectorNeedle}" nicht in aura.css gefunden — Datei umbenannt/verschoben?`);
  }
  const open = css.indexOf('{', start);
  let depth = 0;
  let i = open;
  for (; i < css.length; i++) {
    const zeichen = css.charAt(i);
    if (zeichen === '{') depth++;
    else if (zeichen === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return css.slice(open, i + 1);
}

/** Liest `--k-name: WERT;` aus einem Block-Ausschnitt. */
function lies(blockCss: string, varName: string, blockLabel: string): string {
  const m = blockCss.match(new RegExp(`${varName}:\\s*([^;]+);`));
  const wert = m?.[1];
  if (wert === undefined) {
    throw new Error(`token-spiegel: "${varName}" nicht im Block "${blockLabel}" von aura.css gefunden.`);
  }
  return wert.trim();
}

// Die drei Theme-relevanten Blöcke — needle enthält die abschliessende
// Klammer, damit z.B. "[data-theme='ink'] .k-select { ... }" NICHT trifft.
const paperBlock = block(auraCss, "[data-theme='paper']");
const inkBlock = block(auraCss, "[data-theme='ink'] {");
const rootBlock = block(auraCss, ':root {'); // der spätere, theme-unabhängige :root-Block (Radien/Motion)

describe('token-spiegel (W0): aura.css ist die Wahrheit, tokens.ts folgt exakt', () => {
  it('Radien (--k-radius-sm/-md/-lg) stimmen mit tokens.radius überein', () => {
    expect(radius.sm, 'radius.sm vs. --k-radius-sm').toBe(lies(rootBlock, '--k-radius-sm', ':root'));
    expect(radius.md, 'radius.md vs. --k-radius-md').toBe(lies(rootBlock, '--k-radius-md', ':root'));
    expect(radius.lg, 'radius.lg vs. --k-radius-lg').toBe(lies(rootBlock, '--k-radius-lg', ':root'));
  });

  it('die drei Papier-Grundtöne (field/surface/raised) stimmen für BEIDE Themes', () => {
    expect(paper.field, 'paper.field vs. --k-field (paper)').toBe(lies(paperBlock, '--k-field', "paper"));
    expect(paper.surface, 'paper.surface vs. --k-surface (paper)').toBe(lies(paperBlock, '--k-surface', "paper"));
    expect(paper.raised, 'paper.raised vs. --k-raised (paper)').toBe(lies(paperBlock, '--k-raised', "paper"));
    expect(ink.field, 'ink.field vs. --k-field (ink)').toBe(lies(inkBlock, '--k-field', 'ink'));
    expect(ink.surface, 'ink.surface vs. --k-surface (ink)').toBe(lies(inkBlock, '--k-surface', 'ink'));
    expect(ink.raised, 'ink.raised vs. --k-raised (ink)').toBe(lies(inkBlock, '--k-raised', 'ink'));
  });

  it('Spacing-Skala (--k-s1…--k-s7) stimmt mit tokens.scale überein', () => {
    const paare: Array<[keyof typeof scale, string]> = [
      ['s1', '--k-s1'],
      ['s2', '--k-s2'],
      ['s3', '--k-s3'],
      ['s4', '--k-s4'],
      ['s5', '--k-s5'],
      ['s6', '--k-s6'],
      ['s7', '--k-s7'],
    ];
    for (const [key, cssVar] of paare) {
      expect(scale[key], `scale.${key} vs. ${cssVar}`).toBe(lies(paperBlock, cssVar, 'paper'));
    }
  });

  it('Typo-Skala (--k-t-xs/-sm/-md/-lg/-plakat) stimmt mit tokens.type überein', () => {
    const paare: Array<[keyof typeof type, string]> = [
      ['xs', '--k-t-xs'],
      ['sm', '--k-t-sm'],
      ['md', '--k-t-md'],
      ['lg', '--k-t-lg'],
      ['plakat', '--k-t-plakat'],
    ];
    for (const [key, cssVar] of paare) {
      expect(type[key], `type.${key} vs. ${cssVar}`).toBe(lies(paperBlock, cssVar, 'paper'));
    }
  });

  /**
   * v0.6.6 MOTION-KONZEPT-066 §2: bislang war `tokens.motion` NICHT gegen
   * aura.css verdrahtet (der Wächter prüfte nur Radien/Farben/Skalen) — hier
   * wird die Lücke geschlossen UND die vier neuen Federkurve-/Druck-Tokens
   * geprüft, byte-gleich, wie im Briefing gefordert.
   */
  it('Motion-Tokens (--k-motion-fast/-base/-settle + NEU --k-feder/-fallback/--k-druck-dauer/-skala) stimmen mit tokens.motion überein', () => {
    const paare: Array<[keyof typeof motion, string]> = [
      ['fast', '--k-motion-fast'],
      ['base', '--k-motion-base'],
      ['settle', '--k-motion-settle'],
      ['feder', '--k-feder'],
      ['federFallback', '--k-feder-fallback'],
      ['druckDauer', '--k-druck-dauer'],
      ['druckSkala', '--k-druck-skala'],
    ];
    for (const [key, cssVar] of paare) {
      expect(motion[key], `motion.${key} vs. ${cssVar}`).toBe(lies(rootBlock, cssVar, ':root'));
    }
  });
});
