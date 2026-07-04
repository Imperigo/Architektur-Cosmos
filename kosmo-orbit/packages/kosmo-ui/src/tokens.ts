/**
 * KosmoOrbit Aura — Design-Tokens.
 *
 * Gestaltungshaltung (Owner-Mandat Q17–Q20): elegant, schlicht, für Architekten.
 * Papier-Hell als Primärmodus, Tinte-Dunkel als Zweitmodus (abgeleitet aus dem
 * bestehenden ArchitekturKosmos-Design #050505/#f7f7f4). EIN präziser Akzent:
 * Kupfer/Terracotta — gebrannter Ton und Kupferblech, die Farben des Bauens.
 * Sekundär trägt jedes Modul einen eigenen, zurückhaltenden Farbton, der nur in
 * Zeichen, Badges und aktiven Zuständen erscheint — nie flächig.
 */

export const accent = {
  /** Kupfer/Terracotta — die Stimme der Marke. */
  copper: '#C25E3A',
  copperDeep: '#A84B2B',
  copperBright: '#D9743F',
  copperWash: '#C25E3A22',
} as const;

export const paper = {
  field: '#F5F3EE',
  surface: '#FBFAF6',
  raised: '#FFFFFF',
  ink: '#191713',
  inkSoft: '#5C574D',
  inkFaint: '#8F897B',
  line: '#E4E0D6',
  lineStrong: '#C9C4B6',
  accent: accent.copperDeep,
  accentInk: '#FFFFFF',
} as const;

export const ink = {
  field: '#0A0A08',
  surface: '#131210',
  raised: '#1B1A16',
  ink: '#F7F6F1',
  inkSoft: '#A7A296',
  inkFaint: '#6E6A5F',
  line: '#28261F',
  lineStrong: '#3B382F',
  accent: accent.copperBright,
  accentInk: '#14100C',
} as const;

/** Semantische Töne — in beiden Themes lesbar. */
export const semantic = {
  success: '#6F8B6A', // Salbei
  warning: '#C79A3D', // Ocker
  danger: '#B5483C', // gebrannter Ziegel
  info: '#5D7489', // Schiefer
} as const;

/**
 * Modul-Farbtöne — dezente Identität pro Werkzeug (nur Zeichen/Badges/Aktiv-Ring).
 */
export const moduleHue = {
  orbit: '#8F897B', // die Zentrale bleibt neutral
  design: accent.copper, // Entwerfen trägt die Markenfarbe
  draw: '#4E4A42', // Graphit — die Zeichnung
  data: '#46617A', // tiefes Blau — das Wissen
  vis: '#C79A3D', // Bernstein — das Licht
  publish: '#6F8B6A', // Salbei — das fertige Blatt
  prepare: '#7D5E78', // Pflaume — die Grundlagen
  kosmo: '#B06A8C', // Kosmo selbst: warmes Karmin-Rosé, die Stimme im Raum
  train: '#8C6D3F', // Ocker — das Lernen, Schicht um Schicht
  doc: '#5D7489', // Schiefer — Diagnose und Berichte
  sketch: '#96604A', // Sienna — der Stift auf Papier
  speak: '#4F7A7A', // Petrol — die Stimme im Raum
} as const;

export type ModuleId = keyof typeof moduleHue;

export const typography = {
  /** UI-Schrift: präzise Grotesk über Systemstapel; Zahlen tabellarisch. */
  ui: "'Inter', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  /** Mass- und Wertangaben: Mono für Planlesbarkeit. */
  mono: "'IBM Plex Mono', ui-monospace, 'SF Mono', SFMono-Regular, Menlo, monospace",
  scale: {
    xs: '11px',
    sm: '12.5px',
    md: '14px',
    lg: '16px',
    xl: '20px',
    display: '28px',
  },
} as const;

export const radius = { sm: '6px', md: '10px', lg: '14px', pill: '999px' } as const;

export const motion = {
  /** Zurückhaltend-präzise (Owner Q20): kurz, physikalisch sauber, nie verspielt. */
  fast: '120ms cubic-bezier(0.3, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.3, 0, 0.2, 1)',
  settle: '320ms cubic-bezier(0.22, 0.9, 0.28, 1)',
} as const;

export const shadow = {
  raised: '0 1px 2px rgba(20, 16, 12, 0.06), 0 4px 16px rgba(20, 16, 12, 0.07)',
  overlay: '0 2px 6px rgba(20, 16, 12, 0.10), 0 16px 48px rgba(20, 16, 12, 0.18)',
} as const;

export type ThemeName = 'paper' | 'ink';
