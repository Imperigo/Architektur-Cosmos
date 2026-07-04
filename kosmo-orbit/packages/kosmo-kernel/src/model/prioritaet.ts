import type { KosmoDoc } from './doc';

/**
 * Verschneidungsprioritäten (RE-ARCHICAD A1) — ArchiCADs 0–999-Modell auf
 * unsere Schichtbänder übertragen: Beim Poché-Join schneidet das Material
 * mit der HÖHEREN Priorität das niedrigere (Beton stösst durch, Dämmung
 * weicht). Projektweite Overrides via design.prioritaetSetzen →
 * settings.materialPrioritaeten.
 */
export const MATERIAL_PRIORITAET: Record<string, number> = {
  stahl: 920,
  beton: 900,
  kalksandstein: 820,
  ks: 820,
  backstein: 800,
  mauerwerk: 780,
  'holz-bsh': 700,
  holz: 680,
  leichtbau: 400,
  gips: 380,
  daemmung: 300,
  'daemmung-mw': 300,
  'daemmung-eps': 300,
  'daemmung-holzfaser': 300,
  dichtung: 200,
  abdichtung: 200,
  hohlraum: 150,
  putz: 100,
};

/** Unbekannte Materialien liegen in der Mitte — sie schneiden Dämmung/Putz,
 * weichen aber Beton/Mauerwerk. */
export const PRIORITAET_DEFAULT = 500;

export function materialPrioritaet(doc: KosmoDoc, material: string): number {
  return (
    doc.settings.materialPrioritaeten?.[material] ??
    MATERIAL_PRIORITAET[material] ??
    PRIORITAET_DEFAULT
  );
}
