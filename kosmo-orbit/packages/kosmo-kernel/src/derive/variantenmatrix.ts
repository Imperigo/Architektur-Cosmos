import type { StudienVariante } from './volumenstudie';

/**
 * Varianten-Matrix (V2-V3/F4, Finch «Compare») — Volumenstudien-Varianten
 * als Parallel-Axis-Datensatz: je Variante eine Linie über normierte Achsen.
 * Reine Ableitung; das SVG zeichnet die App.
 */

export interface MatrixAchse {
  key: string;
  label: string;
  /** true: kleiner ist besser (Achse wird fürs Zeichnen invertiert). */
  kleinerBesser?: boolean;
}

export interface MatrixZeile {
  id: string;
  name: string;
  /** Rohwerte in Achsen-Reihenfolge; null = nicht anwendbar. */
  werte: (number | null)[];
  passt: boolean;
}

export interface VariantenMatrix {
  achsen: MatrixAchse[];
  zeilen: MatrixZeile[];
  /** Min/Max je Achse über alle Zeilen (fürs Normieren; null-Werte ignoriert). */
  bereiche: { min: number; max: number }[];
}

export function variantenMatrix(
  varianten: StudienVariante[],
  zielGf?: number | null,
): VariantenMatrix {
  const achsen: MatrixAchse[] = [
    { key: 'gf', label: 'GF m²' },
    ...(zielGf ? [{ key: 'delta', label: 'Δ Ziel m²', kleinerBesser: true }] : []),
    { key: 'geschosse', label: 'Geschosse' },
    { key: 'hoehe', label: 'Höhe m', kleinerBesser: true },
    { key: 'fussabdruck', label: 'Fussabdruck m²', kleinerBesser: true },
    { key: 'besonnung', label: 'Besonnungsreserve m' },
  ];
  const zeilen: MatrixZeile[] = varianten.map((v) => ({
    id: v.id,
    name: v.name,
    passt: v.passt,
    werte: [
      v.gf,
      ...(zielGf ? [Math.abs(v.gf - zielGf)] : []),
      v.geschosse,
      v.hoehe / 1000,
      v.geschosse > 0 ? Math.round(v.gf / v.geschosse) : null,
      v.besonnung ? (v.besonnung.ist - v.besonnung.noetig) / 1000 : null,
    ],
  }));
  const bereiche = achsen.map((_, i) => {
    const werte = zeilen.map((z) => z.werte[i]).filter((w): w is number => w !== null);
    if (werte.length === 0) return { min: 0, max: 1 };
    const min = Math.min(...werte);
    const max = Math.max(...werte);
    return { min, max: max === min ? min + 1 : max };
  });
  return { achsen, zeilen, bereiche };
}
