import type { KosmoDoc } from '../model/doc';
import type { Assembly, Wall } from '../model/entities';

/**
 * Render-Prompt-Bausteine (V2-V8): Das Modell spricht mit — die äussersten
 * Wandschichten und das Dach werden zu Prompt-Phrasen, damit KosmoVis
 * rendert, was gebaut ist. Transparenz statt Blackbox: der finale Prompt
 * wird angezeigt und ist überschreibbar.
 */

const PHRASEN: [RegExp, string][] = [
  [/sichtbeton|beton/, 'Sichtbeton-Fassade'],
  [/putz/, 'mineralisch verputzte Fassade'],
  [/holz|laerche|fichte/, 'Holzfassade (vertikale Lattung)'],
  [/klinker|backstein|ziegel(?!dach)/, 'Klinker-Mauerwerk'],
  [/kalksandstein/, 'Kalksandstein-Mauerwerk sichtbar'],
  [/metall|blech|alu/, 'Metallfassade'],
];

export function renderPromptBausteine(doc: KosmoDoc): string[] {
  const bausteine: string[] = [];
  const gesehen = new Set<string>();
  for (const w of doc.byKind<Wall>('wall')) {
    const asm = doc.get<Assembly>(w.assemblyId);
    if (asm?.kind !== 'assembly' || asm.layers.length === 0) continue;
    // äusserste Schicht = erste (Konvention: aussen → innen)
    const mat = asm.layers[0]!.material.toLowerCase();
    for (const [re, phrase] of PHRASEN) {
      if (re.test(mat) && !gesehen.has(phrase)) {
        gesehen.add(phrase);
        bausteine.push(phrase);
      }
    }
  }
  return bausteine;
}

/** Finaler Prompt: Stimmung + Nutzertext + Material-Bausteine, ohne Leeres. */
export function finalerRenderPrompt(stil: string, nutzer: string, bausteine: string[]): string {
  return [stil, nutzer, ...bausteine].filter((t) => t.trim().length > 0).join(', ');
}
