/**
 * Cycles-Presets (Owner-Befund K20/A10) — benannte, regelbasierte Render-Presets
 * als reine Datentabelle. Kein «KI wählt» — ein Klick auf einen Namen setzt
 * exakt diese Werte (Samples, Auflösung, Licht-Setup) und die zugehörigen
 * Bildkompositions-Metadaten (Seitenverhältnis, Brennweiten-Äquivalent,
 * Horizontlinie), die unverändert in den render-scene/v1-Job einfliessen.
 * Angewandt wird ein Preset über den bestehenden `vis.nodeParametrieren`-Weg
 * (Render-Node-Param `preset`) — kein neuer Command nötig.
 */

export const VIS_PRESET_IDS = ['entwurf-schnell', 'praesentation', 'nacht'] as const;

export type VisPresetId = (typeof VIS_PRESET_IDS)[number];

export function isVisPresetId(v: unknown): v is VisPresetId {
  return typeof v === 'string' && (VIS_PRESET_IDS as readonly string[]).includes(v);
}

export interface VisPreset {
  readonly id: VisPresetId;
  /** Deutscher Anzeigename fürs UI. */
  readonly name: string;
  readonly render: {
    readonly samples: number;
    readonly resolution: readonly [number, number];
    /** Sonnenstand (Azimut/Elevation, Grad) — Elevation < 0 = Sonne unter dem Horizont (Nacht). */
    readonly sun: { readonly azimuth: number; readonly elevation: number };
  };
  readonly komposition: {
    /** Breite/Höhe, z.B. 1.6 = 16:10. */
    readonly seitenverhaeltnis: number;
    /** Brennweiten-Äquivalent (Kleinbild, 36 mm Sensorbreite) in mm. */
    readonly brennweiteMm: number;
    /** Horizontlinie als Anteil der Bildhöhe von oben (0 = oberer Rand, 1 = unterer Rand). */
    readonly horizontlinie: number;
  };
  /** Ehrliche Kurzbeschreibung des Licht-Setups fürs UI und den Render-Prompt. */
  readonly licht: string;
}

export const RENDER_PRESETS: readonly VisPreset[] = [
  {
    id: 'entwurf-schnell',
    name: 'Entwurf schnell',
    render: {
      samples: 32,
      resolution: [960, 600],
      sun: { azimuth: 180, elevation: 45 },
    },
    komposition: { seitenverhaeltnis: 1.6, brennweiteMm: 35, horizontlinie: 0.5 },
    licht: 'Flaches Mittagslicht — schnelle Vorschau, keine Stimmung.',
  },
  {
    id: 'praesentation',
    name: 'Präsentation',
    render: {
      samples: 256,
      resolution: [1920, 1200],
      sun: { azimuth: 200, elevation: 32 },
    },
    komposition: { seitenverhaeltnis: 1.6, brennweiteMm: 50, horizontlinie: 0.42 },
    licht: 'Warmes Nachmittagslicht mit Schlagschatten — für Präsentationsbilder.',
  },
  {
    id: 'nacht',
    name: 'Nacht',
    render: {
      samples: 192,
      resolution: [1920, 1200],
      sun: { azimuth: 0, elevation: -8 },
    },
    komposition: { seitenverhaeltnis: 1.6, brennweiteMm: 40, horizontlinie: 0.55 },
    licht: 'Nachtszene — Sonne unter dem Horizont, Fenster-/Kunstlicht dominiert.',
  },
];

export function visPresetById(id: VisPresetId): VisPreset {
  const hit = RENDER_PRESETS.find((p) => p.id === id);
  if (!hit) throw new Error(`Unbekanntes Vis-Preset «${id}»`);
  return hit;
}

/**
 * Horizontales Blickfeld (Grad) aus dem Brennweiten-Äquivalent, Kleinbild-Sensor
 * (36 mm Breite) — Standardformel FOV = 2·atan(Sensorbreite / (2·Brennweite)).
 * Rein rechnerisch, keine Schätzung.
 */
export function fovFromBrennweite(brennweiteMm: number, sensorbreiteMm = 36): number {
  const rad = 2 * Math.atan(sensorbreiteMm / (2 * brennweiteMm));
  return Math.round((rad * 180) / Math.PI);
}
