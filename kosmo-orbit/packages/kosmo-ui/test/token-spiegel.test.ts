import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { motion, orbit, paper, radius, radiusHub, scale, semantic, shadow, type, typeGross } from '../src/tokens';

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

// Die Theme-relevanten Blöcke — needle enthält die abschliessende Klammer,
// damit z.B. "[data-theme='paper'] .k-select { ... }" NICHT trifft.
// v0.7.3 D7 (Owner-Entscheid): Tinte (`ink`) wurde entfernt — der frühere
// `inkBlock`/`ink`-Vergleich ist mit dem Theme weggefallen, NUR noch Papier
// (+ der theme-unabhängige `:root`-Block) werden hier bewacht. `orbit` bleibt
// bewusst unbewacht (siehe `tokens.ts`-Kommentar bei `export const orbit`).
const paperBlock = block(auraCss, "[data-theme='paper']");
const rootBlock = block(auraCss, ':root {'); // der spätere, theme-unabhängige :root-Block (Radien/Fonts/Motion)
// v0.8.0B / W1 (Spez §1/§6): AUSNAHME von der bisherigen "orbit bleibt
// unbewacht"-Regel — die frisch eingeführten/geänderten orbit-Tokens dieses
// Pakets (Alpha-Border-Flip, Schatten-Skala, Hover) bekommen gezielte
// Wächter-Tests, weil hier die Drift-Gefahr am grössten ist. Der Rest von
// `orbit` (Grundfarben etc.) bleibt wie zuvor unbewacht.
// needle enthält die abschliessende Klammer (wie `rootBlock` oben) — reine
// Kommentar-Erwähnungen von `[data-theme='orbit']` (ohne unmittelbar
// folgende `{`) im Datei-Kopf dürfen NICHT den falschen Block treffen.
const orbitBlock = block(auraCss, "[data-theme='orbit'] {");

describe('token-spiegel (W0): aura.css ist die Wahrheit, tokens.ts folgt exakt', () => {
  it('Radien (--k-radius-sm/-md/-lg) stimmen mit tokens.radius überein', () => {
    expect(radius.sm, 'radius.sm vs. --k-radius-sm').toBe(lies(rootBlock, '--k-radius-sm', ':root'));
    expect(radius.md, 'radius.md vs. --k-radius-md').toBe(lies(rootBlock, '--k-radius-md', ':root'));
    expect(radius.lg, 'radius.lg vs. --k-radius-lg').toBe(lies(rootBlock, '--k-radius-lg', ':root'));
  });

  it('die drei Papier-Grundtöne (field/surface/raised) stimmen mit tokens.paper überein', () => {
    expect(paper.field, 'paper.field vs. --k-field (paper)').toBe(lies(paperBlock, '--k-field', "paper"));
    expect(paper.surface, 'paper.surface vs. --k-surface (paper)').toBe(lies(paperBlock, '--k-surface', "paper"));
    expect(paper.raised, 'paper.raised vs. --k-raised (paper)').toBe(lies(paperBlock, '--k-raised', "paper"));
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

  /**
   * v0.8.0B / W1 (Spez §1/§6) — additive Wächter-Erweiterung. Alle sechs
   * Punkte unten sind NEU in dieser Welle; die Tests oben (Basis W0) bleiben
   * unverändert.
   */
  it('NEU (W1) Spacing --k-s8/-s9/-s10 stimmt mit tokens.scale überein', () => {
    const paare: Array<[keyof typeof scale, string]> = [
      ['s8', '--k-s8'],
      ['s9', '--k-s9'],
      ['s10', '--k-s10'],
    ];
    for (const [key, cssVar] of paare) {
      expect(scale[key], `scale.${key} vs. ${cssVar}`).toBe(lies(paperBlock, cssVar, 'paper'));
    }
  });

  it('NEU (W1) Typo-Leiter --k-t-h3/-h2/-h1/-display/-code/-micro stimmt mit tokens.typeGross überein', () => {
    const paare: Array<[keyof typeof typeGross, string]> = [
      ['h3', '--k-t-h3'],
      ['h2', '--k-t-h2'],
      ['h1', '--k-t-h1'],
      ['display', '--k-t-display'],
      ['code', '--k-t-code'],
      ['micro', '--k-t-micro'],
    ];
    for (const [key, cssVar] of paare) {
      expect(typeGross[key], `typeGross.${key} vs. ${cssVar}`).toBe(lies(paperBlock, cssVar, 'paper'));
    }
  });

  it('NEU (W1) --k-radius-hub stimmt mit tokens.radiusHub überein', () => {
    expect(radiusHub, 'radiusHub vs. --k-radius-hub').toBe(lies(rootBlock, '--k-radius-hub', ':root'));
  });

  it('NEU (W1) Flächenstufe Hover (--k-hover) stimmt beidseitig überein (paper + orbit)', () => {
    expect(paper.hover, 'paper.hover vs. --k-hover (paper)').toBe(lies(paperBlock, '--k-hover', 'paper'));
    expect(orbit.hover, 'orbit.hover vs. --k-hover (orbit)').toBe(lies(orbitBlock, '--k-hover', 'orbit'));
  });

  it('NEU (W1) Alpha-Border-Flip (--k-line-subtil/-line/-line-strong, orbit-only) stimmt mit tokens.orbit überein', () => {
    expect(orbit.lineSubtil, 'orbit.lineSubtil vs. --k-line-subtil').toBe(
      lies(orbitBlock, '--k-line-subtil', 'orbit'),
    );
    expect(orbit.line, 'orbit.line vs. --k-line (orbit)').toBe(lies(orbitBlock, '--k-line', 'orbit'));
    expect(orbit.lineStrong, 'orbit.lineStrong vs. --k-line-strong (orbit)').toBe(
      lies(orbitBlock, '--k-line-strong', 'orbit'),
    );
    expect(orbit.hairline, 'orbit.hairline vs. --k-hairline').toBe(lies(orbitBlock, '--k-hairline', 'orbit'));
  });

  it('NEU (W1) Schatten-Skala (--k-shadow-xs/-sm/-md/-lg/-xl + --k-inset-top, orbit-only) stimmt mit tokens.shadow.orbit überein', () => {
    const paare: Array<[keyof typeof shadow.orbit, string]> = [
      ['xs', '--k-shadow-xs'],
      ['sm', '--k-shadow-sm'],
      ['md', '--k-shadow-md'],
      ['lg', '--k-shadow-lg'],
      ['xl', '--k-shadow-xl'],
      ['insetTop', '--k-inset-top'],
    ];
    for (const [key, cssVar] of paare) {
      expect(shadow.orbit[key], `shadow.orbit.${key} vs. ${cssVar}`).toBe(lies(orbitBlock, cssVar, 'orbit'));
    }
  });

  /**
   * NEU (v0.8.1 / P3, Spez §4.3/C-16) — Warning-Wash-Kanonisierung: die
   * vormals nur als Fallback-Hex in Konsumenten verstreuten Werte sind jetzt
   * echte, theme-invariante Tokens (kein `orbit`-Gegenstück, wie `warning`
   * selbst) — hier erstmals gegen `tokens.semantic` bewacht.
   */
  it('NEU (P3) Warning-Wash-Tokens (--k-warning-wash/-line) stimmen mit tokens.semantic überein', () => {
    expect(semantic.warningWash, 'semantic.warningWash vs. --k-warning-wash').toBe(
      lies(paperBlock, '--k-warning-wash', 'paper'),
    );
    expect(semantic.warningLine, 'semantic.warningLine vs. --k-warning-line').toBe(
      lies(paperBlock, '--k-warning-line', 'paper'),
    );
  });
});
