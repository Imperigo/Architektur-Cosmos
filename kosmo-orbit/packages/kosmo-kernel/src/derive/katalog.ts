import type { DocSettings, KosmoDoc } from '../model/doc';
import type { Assembly, AssemblyLayer } from '../model/entities';

/**
 * Katalog-Transfer (RE-ARCHICAD A8, Attribute-Manager-Ersatz): Aufbauten,
 * Zonen-Vorlagen, Fassadenmodule, Kennzahl-Formeln und Prioritäts-Overrides
 * als eine .json ins nächste Projekt mitnehmen — Projekt 2 startet mit dem
 * Wissen von Projekt 1. Import läuft über `design.katalogImportieren`
 * (Namens-Dedup, nichts wird überschrieben).
 */

export interface KosmoKatalog {
  schema: 'kosmo.katalog/v1';
  aufbauten: { name: string; target: Assembly['target']; layers: AssemblyLayer[] }[];
  vorlagen: DocSettings['vorlagen'];
  fassadenModule: DocSettings['fassadenModule'];
  kennzahlFormeln: DocSettings['kennzahlFormeln'];
  materialPrioritaeten?: Record<string, number>;
}

/** Katalog des Projekts (ohne Entity-IDs — der Import vergibt frische). */
export function katalogExport(doc: KosmoDoc): KosmoKatalog {
  const prios = doc.settings.materialPrioritaeten;
  return {
    schema: 'kosmo.katalog/v1',
    aufbauten: doc
      .byKind<Assembly>('assembly')
      .map((a) => ({ name: a.name, target: a.target, layers: a.layers.map((l) => ({ ...l })) })),
    vorlagen: doc.settings.vorlagen,
    fassadenModule: doc.settings.fassadenModule,
    kennzahlFormeln: doc.settings.kennzahlFormeln,
    ...(prios && Object.keys(prios).length > 0 ? { materialPrioritaeten: prios } : {}),
  };
}
