/**
 * Materialkatalog (Q14) — EIN Materialschlüssel, drei Gesichter:
 * PBR fürs 3D (Viewport/GLB), SIA-Schraffur für den Plan, Lambda für den
 * U-Wert. Aufbauten (bauteilkatalog) referenzieren dieselben Schlüssel.
 */

export interface MaterialEintrag {
  key: string;
  name: string;
  pbr: { color: number; roughness: number; metalness?: number };
  /** Schraffur-/Poché-Klasse im Grundriss (SIA-Stiftsatz). */
  sia: 'beton' | 'mauerwerk' | 'holz' | 'daemmung' | 'putz' | 'sonstig';
  /** W/(m·K), wo sinnvoll. */
  lambda?: number;
  beschrieb: string;
}

export const materialkatalog: MaterialEintrag[] = [
  { key: 'beton', name: 'Stahlbeton', pbr: { color: 0xc9c5bc, roughness: 0.9 }, sia: 'beton', lambda: 2.3, beschrieb: 'Sichtbeton/Konstruktionsbeton — das Schweizer Rückgrat.' },
  { key: 'beton-rc', name: 'Recyclingbeton', pbr: { color: 0xc2bdb2, roughness: 0.92 }, sia: 'beton', lambda: 2.3, beschrieb: 'RC-Beton mit Mischgranulat — Standard für Kerne.' },
  { key: 'backstein', name: 'Backstein', pbr: { color: 0xb0705a, roughness: 0.85 }, sia: 'mauerwerk', lambda: 0.44, beschrieb: 'Sichtbar oder verputzt — die klassische Zweischale.' },
  { key: 'kalksandstein', name: 'Kalksandstein', pbr: { color: 0xd8d2c6, roughness: 0.88 }, sia: 'mauerwerk', lambda: 1.0, beschrieb: 'Masse für den Schallschutz, wohnungstrennend.' },
  { key: 'holz', name: 'Holz (Fichte/Tanne)', pbr: { color: 0xb08d5e, roughness: 0.8 }, sia: 'holz', lambda: 0.13, beschrieb: 'Schalung, Balken, Tafeln.' },
  { key: 'holz-bsp', name: 'Brettsperrholz', pbr: { color: 0xc19a68, roughness: 0.78 }, sia: 'holz', lambda: 0.13, beschrieb: 'Massive Holztafeln, tragend und sichtbar.' },
  { key: 'lattung', name: 'Lattung/Hinterlüftung', pbr: { color: 0xa98a5f, roughness: 0.85 }, sia: 'holz', lambda: 0.13, beschrieb: 'Konterlattung, Luftschicht.' },
  { key: 'putz', name: 'Aussenputz', pbr: { color: 0xe4ded2, roughness: 0.95 }, sia: 'putz', lambda: 0.87, beschrieb: 'Mineralischer Deckputz.' },
  { key: 'putz-innen', name: 'Innenputz', pbr: { color: 0xefeae0, roughness: 0.95 }, sia: 'putz', lambda: 0.7, beschrieb: 'Gips-/Kalkputz innen.' },
  { key: 'gips', name: 'Gipsplatte', pbr: { color: 0xf0ece4, roughness: 0.93 }, sia: 'putz', lambda: 0.25, beschrieb: 'Beplankung im Trockenbau.' },
  { key: 'daemmung-mw', name: 'Mineralwolle', pbr: { color: 0xdcd6a8, roughness: 1.0 }, sia: 'daemmung', lambda: 0.036, beschrieb: 'Nicht brennbar — Standard hinterlüftet.' },
  { key: 'daemmung-eps', name: 'EPS', pbr: { color: 0xe8e8e2, roughness: 1.0 }, sia: 'daemmung', lambda: 0.031, beschrieb: 'Kompaktfassade.' },
  { key: 'daemmung-pur', name: 'PUR/PIR', pbr: { color: 0xe0d5b0, roughness: 1.0 }, sia: 'daemmung', lambda: 0.025, beschrieb: 'Schlank, wo Höhe fehlt (Flachdach/Boden).' },
  { key: 'daemmung-hf', name: 'Holzfaser', pbr: { color: 0xcbb287, roughness: 1.0 }, sia: 'daemmung', lambda: 0.04, beschrieb: 'Diffusionsoffen, sommerlicher Wärmeschutz.' },
  { key: 'zementestrich', name: 'Zementestrich', pbr: { color: 0xb5b2aa, roughness: 0.85 }, sia: 'sonstig', lambda: 1.4, beschrieb: 'Schwimmend auf Trittschall.' },
  { key: 'trittschall', name: 'Trittschalldämmung', pbr: { color: 0xd6d2c2, roughness: 1.0 }, sia: 'daemmung', lambda: 0.033, beschrieb: 'Unter dem Estrich.' },
  { key: 'abdichtung', name: 'Abdichtung', pbr: { color: 0x3a3835, roughness: 0.6 }, sia: 'sonstig', lambda: 0.23, beschrieb: 'Bitumen-/Kunststoffbahn.' },
  { key: 'kies', name: 'Kies', pbr: { color: 0xb9b4a8, roughness: 1.0 }, sia: 'sonstig', lambda: 0.7, beschrieb: 'Auflast und Schutz auf dem Warmdach.' },
  { key: 'ziegel', name: 'Dachziegel', pbr: { color: 0x9a5b45, roughness: 0.8 }, sia: 'sonstig', lambda: 0.7, beschrieb: 'Ton, auf Lattung.' },
  { key: 'glas', name: 'Glas', pbr: { color: 0xaec6c9, roughness: 0.1, metalness: 0.2 }, sia: 'sonstig', beschrieb: '3-fach-IV im Standard.' },
  { key: 'stahl', name: 'Stahl', pbr: { color: 0x8a8d90, roughness: 0.45, metalness: 0.8 }, sia: 'sonstig', beschrieb: 'Stützen, Unterzüge, Beschläge.' },
];

/** PBR-Nachschlag fürs 3D (Viewport/GLB) — Schlüssel → Parameter. */
export const pbrPalette: Record<string, { color: number; roughness: number; metalness?: number }> =
  Object.fromEntries(materialkatalog.map((m) => [m.key, m.pbr]));
