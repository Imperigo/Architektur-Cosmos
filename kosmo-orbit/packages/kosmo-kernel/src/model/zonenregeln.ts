import type { ZonenRegel } from './doc';

/**
 * Zonenregel-Katalog CH (V2-Vorform V1) — Richtwerte typischer Wohnzonen
 * ZG/LU als Startpunkt. BEWUSST Richtwerte: die verbindlichen Werte stehen
 * im kommunalen Baureglement; jede Regel ist per Command überschreibbar.
 */
export const ZONENREGEL_KATALOG: ZonenRegel[] = [
  { name: 'W2 (Richtwert ZG)', az: 0.4, maxHoehe: 8500, maxVollgeschosse: 2, grenzabstandKlein: 4000, grenzabstandGross: 8000 },
  { name: 'W2b (Richtwert ZG)', az: 0.5, maxHoehe: 10000, maxVollgeschosse: 2, grenzabstandKlein: 4000, grenzabstandGross: 8000 },
  { name: 'W3 (Richtwert LU)', az: 0.6, maxHoehe: 11500, maxVollgeschosse: 3, grenzabstandKlein: 4000, grenzabstandGross: 10000 },
  { name: 'W4 (Richtwert LU)', az: 0.8, maxHoehe: 14500, maxVollgeschosse: 4, grenzabstandKlein: 5000, grenzabstandGross: 12000 },
  { name: 'WA3 Wohn/Arbeit (Richtwert)', az: 0.9, maxHoehe: 12500, maxVollgeschosse: 3, grenzabstandKlein: 4000, grenzabstandGross: 10000 },
  { name: 'Kernzone (Richtwert)', az: null, maxHoehe: 13000, maxVollgeschosse: 4, grenzabstandKlein: 3000, grenzabstandGross: 6000 },
];
