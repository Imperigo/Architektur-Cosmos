import type { RaumRegel } from './doc';

/** Regel-Presets (V2-F3) — Richtwerte CH-Wohnbau; Wettbewerb prüft lockerer. */
export const REGEL_PRESETS: Record<'ch-wohnbau' | 'wettbewerb', RaumRegel[]> = {
  'ch-wohnbau': [
    { raumTyp: 'zimmer', minFlaeche: 10, minBreite: 2400, tageslicht: true },
    { raumTyp: 'wohnen', minFlaeche: 18, minBreite: 3000, tageslicht: true },
    { raumTyp: 'kueche', minFlaeche: 6, minBreite: 1800, tageslicht: false },
    { raumTyp: 'bad', minFlaeche: 3.5, minBreite: 1650, tageslicht: false },
    { raumTyp: 'korridor', minFlaeche: null, minBreite: 1200, tageslicht: false },
    { raumTyp: 'treppenhaus', minFlaeche: null, minBreite: 1200, tageslicht: false },
  ],
  wettbewerb: [
    { raumTyp: 'zimmer', minFlaeche: 10, minBreite: 2400, tageslicht: true },
    { raumTyp: 'wohnen', minFlaeche: 16, minBreite: 2800, tageslicht: true },
    { raumTyp: 'korridor', minFlaeche: null, minBreite: 1200, tageslicht: false },
  ],
};
