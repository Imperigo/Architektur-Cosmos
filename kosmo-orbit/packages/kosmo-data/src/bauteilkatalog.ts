import type { AssemblyLayer } from '@kosmo/kernel';

/**
 * CH-Bauteilkatalog (Owner-Q14) — kuratierte Standardaufbauten des Schweizer
 * Hochbaus, von aussen/oben nach innen/unten. «Übernehmen» legt sie als
 * Aufbau ins Projekt (design.aufbauErstellen) — ab dann sind sie im
 * Wand-/Decken-Werkzeug und für Kosmo verfügbar.
 *
 * U-Wert: vereinfacht nach SIA 180 (Rsi 0.13, Rse 0.04 — Wand aussen);
 * Lambda-Richtwerte, kein Nachweis-Ersatz.
 */

export interface KatalogEintrag {
  id: string;
  name: string;
  target: 'wall' | 'slab' | 'roof';
  kategorie: 'Aussenwand' | 'Innenwand' | 'Decke' | 'Dach';
  layers: AssemblyLayer[];
  beschrieb: string;
}

/** Lambda-Richtwerte W/(m·K) je Materialschlüssel. */
const LAMBDA: Record<string, number> = {
  beton: 2.3,
  'beton-rc': 2.3,
  backstein: 0.44,
  kalksandstein: 1.0,
  holz: 0.13,
  'holz-bsp': 0.13,
  putz: 0.87,
  'putz-innen': 0.7,
  'daemmung-mw': 0.036,
  'daemmung-eps': 0.031,
  'daemmung-pur': 0.025,
  'daemmung-hf': 0.04,
  gips: 0.25,
  zementestrich: 1.4,
  trittschall: 0.033,
  abdichtung: 0.23,
  kies: 0.7,
  ziegel: 0.7,
  lattung: 0.13,
};

/** U-Wert W/(m²·K) — Rsi+Rse 0.17 (Wand); Hohlräume zählen 0.18 W/mK ersatzweise. */
export function uWert(layers: AssemblyLayer[]): number {
  let r = 0.17;
  for (const l of layers) {
    const lambda = LAMBDA[l.material] ?? (l.function === 'hohlraum' ? 0.18 : 0.5);
    r += l.thickness / 1000 / lambda;
  }
  return 1 / r;
}

export function gesamtdicke(layers: AssemblyLayer[]): number {
  return layers.reduce((s, l) => s + l.thickness, 0);
}

const L = (material: string, thickness: number, fn: AssemblyLayer['function']): AssemblyLayer => ({
  material,
  thickness,
  function: fn,
});

export const bauteilkatalog: KatalogEintrag[] = [
  {
    id: 'aw-beton-kompakt-36',
    name: 'AW Beton Kompaktfassade 36',
    target: 'wall',
    kategorie: 'Aussenwand',
    beschrieb: 'Verputzte Aussenwärmedämmung auf Stahlbeton — der Mehrfamilienhaus-Standard.',
    layers: [L('putz', 15, 'bekleidung'), L('daemmung-eps', 160, 'daemmung'), L('beton', 180, 'tragend'), L('putz-innen', 10, 'bekleidung')],
  },
  {
    id: 'aw-beton-hinterlueftet-42',
    name: 'AW Beton hinterlüftet 42',
    target: 'wall',
    kategorie: 'Aussenwand',
    beschrieb: 'Hinterlüftete Bekleidung (Faserzement/Holz) auf MW-Dämmung, Beton tragend.',
    layers: [L('holz', 22, 'bekleidung'), L('lattung', 30, 'hohlraum'), L('daemmung-mw', 180, 'daemmung'), L('beton', 180, 'tragend'), L('putz-innen', 10, 'bekleidung')],
  },
  {
    id: 'aw-zweischalen-backstein-44',
    name: 'AW Zweischalenmauerwerk 44',
    target: 'wall',
    kategorie: 'Aussenwand',
    beschrieb: 'Sichtbacksteinschale, Kerndämmung, tragender Backstein — die klassische CH-Zweischale.',
    layers: [L('backstein', 125, 'bekleidung'), L('daemmung-mw', 140, 'daemmung'), L('backstein', 150, 'tragend'), L('putz-innen', 15, 'bekleidung')],
  },
  {
    id: 'aw-holzrahmen-36',
    name: 'AW Holzrahmenbau 36',
    target: 'wall',
    kategorie: 'Aussenwand',
    beschrieb: 'Holzrahmen ausgedämmt, hinterlüftete Schalung — leicht und schnell.',
    layers: [L('holz', 24, 'bekleidung'), L('lattung', 30, 'hohlraum'), L('daemmung-hf', 60, 'daemmung'), L('daemmung-mw', 220, 'tragend'), L('gips', 15, 'bekleidung')],
  },
  {
    id: 'aw-holzmassiv-bsp-38',
    name: 'AW Brettsperrholz 38',
    target: 'wall',
    kategorie: 'Aussenwand',
    beschrieb: 'BSP tragend mit Aussendämmung und Putz — massiver Holzbau.',
    layers: [L('putz', 15, 'bekleidung'), L('daemmung-mw', 240, 'daemmung'), L('holz-bsp', 120, 'tragend')],
  },
  {
    id: 'iw-beton-18',
    name: 'IW Beton 18 (tragend)',
    target: 'wall',
    kategorie: 'Innenwand',
    beschrieb: 'Tragende Innenwand Stahlbeton, beidseitig gespachtelt.',
    layers: [L('beton', 180, 'tragend')],
  },
  {
    id: 'iw-kalksandstein-15',
    name: 'IW Kalksandstein 15',
    target: 'wall',
    kategorie: 'Innenwand',
    beschrieb: 'Wohnungstrennend/tragend, guter Schallschutz durch Masse.',
    layers: [L('kalksandstein', 150, 'tragend')],
  },
  {
    id: 'iw-staenderwand-125',
    name: 'IW Ständerwand 12.5',
    target: 'wall',
    kategorie: 'Innenwand',
    beschrieb: 'Leichte Trennwand: GK beplankt, ausgedämmt — nicht tragend.',
    layers: [L('gips', 25, 'bekleidung'), L('daemmung-mw', 75, 'hohlraum'), L('gips', 25, 'bekleidung')],
  },
  {
    id: 'decke-beton-28-schwimmend',
    name: 'Geschossdecke Beton 28 + Bodenaufbau',
    target: 'slab',
    kategorie: 'Decke',
    beschrieb: 'Stahlbetondecke mit schwimmendem Zementestrich auf Trittschalldämmung.',
    layers: [L('zementestrich', 80, 'bekleidung'), L('trittschall', 40, 'daemmung'), L('beton', 280, 'tragend')],
  },
  {
    id: 'bodenplatte-gedaemmt',
    name: 'Bodenplatte gedämmt 25',
    target: 'slab',
    kategorie: 'Decke',
    beschrieb: 'Bodenplatte auf PUR-Dämmung, unbeheizt gegen Erdreich.',
    layers: [L('zementestrich', 80, 'bekleidung'), L('daemmung-pur', 120, 'daemmung'), L('abdichtung', 5, 'dichtung'), L('beton', 250, 'tragend')],
  },
  {
    id: 'flachdach-warm-massiv',
    name: 'Flachdach warm (Massiv)',
    target: 'roof',
    kategorie: 'Dach',
    beschrieb: 'Warmdach: Kies, Abdichtung, Gefälledämmung auf Betondecke — PV-tauglich.',
    layers: [L('kies', 50, 'bekleidung'), L('abdichtung', 10, 'dichtung'), L('daemmung-pur', 200, 'daemmung'), L('beton', 250, 'tragend')],
  },
  {
    id: 'steildach-ziegel-holz',
    name: 'Steildach Ziegel (Holz)',
    target: 'roof',
    kategorie: 'Dach',
    beschrieb: 'Ziegel auf Lattung, Aufsparrendämmung, sichtbare Sparrenlage.',
    layers: [L('ziegel', 40, 'bekleidung'), L('lattung', 80, 'hohlraum'), L('daemmung-hf', 100, 'daemmung'), L('daemmung-mw', 180, 'tragend'), L('holz', 27, 'bekleidung')],
  },
];
