/**
 * KosmoOrbit Aura — Design-Tokens.
 *
 * Spiegel von aura.css — Änderungen IMMER zuerst dort. `aura.css` ist die
 * einzige Wahrheit (UI-KONZEPT-065 §2); dieses Modul liest ihre Werte NICHT
 * zur Laufzeit (kein CSS-Parser im Bundle), sondern hält sie als TS-Literale
 * nach — `packages/kosmo-ui/test/token-spiegel.test.ts` parst aura.css und
 * bricht mit einer sprechenden Meldung, sobald hier und dort etwas
 * auseinanderläuft. Wer eine Farbe/einen Radius/eine Skala ändert: zuerst
 * aura.css anfassen, dann hier den exakt gleichen Wert eintragen.
 *
 * Gestaltungshaltung (Owner-Mandat Q17–Q20): elegant, schlicht, für Architekten.
 * v0.7.3 D7 (Owner-Entscheid, Gestaltungs-Spez): Theme-PAAR Papier (hell) und
 * Kosmos/`orbit` (dunkel) — Tinte (`ink`) wurde ENTFERNT (Migration
 * `ink→orbit` in `App.tsx`, VOR dem `useState`). Standard-Akzent ist die
 * Teal-Familie (Papier `#3e96a2`, Kosmos `#57b6c2`) — wählbare Zweit-Akzente
 * (Kupfer, Signal, Blau, Grün) leben als `data-akzent`-Blöcke in aura.css.
 * Sekundär trägt jedes Modul einen eigenen, zurückhaltenden Farbton, der nur
 * in Zeichen, Badges und aktiven Zuständen erscheint — nie flächig.
 */

/** Kupfer/Terracotta — entspricht `[data-akzent='kupfer']` in aura.css. */
export const accent = {
  copper: '#C25E3A',
  copperDeep: '#A84B2B',
  copperBright: '#D9743F',
  copperWash: '#C25E3A22',
} as const;

/** Papier-Thema (`:root, [data-theme='paper']` in aura.css) — Hexwerte exakt gespiegelt. */
export const paper = {
  field: '#f5f3ee',
  surface: '#fbfaf6',
  raised: '#ffffff',
  ink: '#1a1815',
  inkSoft: '#5c574d',
  inkFaint: '#8f897b',
  line: '#e4e0d6',
  lineStrong: '#c9c4b6',
  /** Standard-Akzent (kein `data-akzent` gesetzt) — Teal dunkel, v0.7.3 D7. */
  accent: '#3e96a2',
  accentInk: '#06141a',
} as const;

/** Semantische Töne — in beiden Themes lesbar (aura.css: paper-Werte, Referenz). */
export const semantic = {
  success: '#4e6d49',
  warning: '#a37b22',
  danger: '#a33d31',
  info: '#46617a',
} as const;

/**
 * Modul-Farbtöne — dezente Identität pro Werkzeug (nur Zeichen/Badges/Aktiv-Ring).
 * Deckt sich mit den `--k-mod-*`-Variablen in aura.css, plus Module, die
 * (noch) keine eigene aura-Variable haben (train/doc/sketch/speak/asset/dev)
 * — dort gilt dieser TS-Wert als Erstdefinition.
 */
export const moduleHue = {
  orbit: '#8f897b', // die Zentrale bleibt neutral
  design: '#c25e3a', // Entwerfen trägt die Markenfarbe
  draw: '#4e4a42', // Graphit — die Zeichnung
  data: '#46617a', // tiefes Blau — das Wissen
  vis: '#c79a3d', // Bernstein — das Licht
  publish: '#6f8b6a', // Salbei — das fertige Blatt
  prepare: '#7d5e78', // Pflaume — die Grundlagen
  kosmo: '#b06a8c', // Kosmo selbst: warmes Karmin-Rosé, die Stimme im Raum
  train: '#8c6d3f', // Ocker — das Lernen, Schicht um Schicht
  doc: '#5d7489', // Schiefer — Diagnose und Berichte
  sketch: '#96604a', // Sienna — der Stift auf Papier
  speak: '#4f7a7a', // Petrol — die Stimme im Raum
  asset: '#7a6a55', // Nussbaum — die Bibliothek der Dinge
  dev: '#5e6b52', // Tannengrün — die Werkstatt an der Software
} as const;

export type ModuleId = keyof typeof moduleHue;

export const typography = {
  /** UI-Schrift: präzise Grotesk über Systemstapel; Zahlen tabellarisch. */
  ui: "'Inter', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  /** Mass- und Wertangaben: Mono für Planlesbarkeit. */
  mono: "'IBM Plex Mono', ui-monospace, 'SF Mono', SFMono-Regular, Menlo, monospace",
  /**
   * Alte, feinere Anzeige-Skala (Legacy — vor der `type`-Skala unten
   * entstanden). Bleibt bestehen, damit keine bestehende Export-Form bricht;
   * neuer Code verwendet die `type`-Skala (spiegelt `--k-t-*`).
   */
  scale: {
    xs: '11px',
    sm: '12.5px',
    md: '14px',
    lg: '16px',
    xl: '20px',
    display: '28px',
  },
} as const;

/**
 * Typo-Skala (NEU, W0) — spiegelt `--k-t-xs/-sm/-md/-lg/-plakat` aus
 * aura.css. Portlabels/Fussnoten/Chips (xs) bis Plakat-Versalien (plakat).
 */
export const type = {
  xs: '10.5px',
  sm: '12px',
  md: '13.5px',
  lg: '16px',
  plakat: '20px',
} as const;

/**
 * Spacing-Skala (NEU, W0) — spiegelt `--k-s1`…`--k-s7` aus aura.css. Gilt für
 * ALLE gaps/paddings; rohe px-Literale sind ab jetzt ein Review-Befund.
 */
export const scale = {
  s1: '2px',
  s2: '4px',
  s3: '8px',
  s4: '12px',
  s5: '16px',
  s6: '24px',
  s7: '32px',
} as const;

/** Radien — spiegelt `--k-radius-sm/-md/-lg` aus aura.css. v0.7.3 D7: die
 * runden Werte 8/12/16px waren bis 0.7.2 ein reiner `orbit`-Override —
 * jetzt themenübergreifende Grammatik im `:root`-Block (Papier UND Kosmos).
 * `pill` bleibt als praktischer Zusatzwert (volle Rundung, keine
 * aura-Variable nötig) bestehen. */
export const radius = { sm: '8px', md: '12px', lg: '16px', pill: '999px' } as const;

export const motion = {
  /** Zurückhaltend-präzise (Owner Q20): kurz, physikalisch sauber, nie verspielt. */
  fast: '120ms cubic-bezier(0.3, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.3, 0, 0.2, 1)',
  settle: '320ms cubic-bezier(0.22, 0.9, 0.28, 1)',
  /**
   * NEU (v0.6.6 MOTION-KONZEPT-066 §2) — spiegelt `--k-feder`/-fallback/
   * `--k-druck-dauer`/-skala aus `aura.css` (dort die einzige Wahrheit,
   * `token-spiegel.test.ts` bricht bei Abweichung). Fünf Dauern bleiben die
   * Obergrenze im Konzept — eine sechste ändert das Konzept, nicht den
   * Einzelfall.
   */
  feder: '260ms linear(0, 0.32 12%, 0.72 28%, 0.95 46%, 1.02 64%, 1 82%, 1)',
  federFallback: '260ms cubic-bezier(0.3, 1.25, 0.4, 1)',
  druckDauer: '80ms',
  druckSkala: '0.97',
} as const;

/** Schatten — `raised`/`overlay` (Legacy-Form, unverändert exportiert) zeigen
 * die Papier-Werte, `paper` (NEU) dieselben nochmal benannt. v0.7.3 D7: der
 * `ink`-Zweig (dunklerer Schatten fürs entfernte Tinte-Thema) ist mit dem
 * Theme weggefallen — `orbit` bekommt in aura.css weiterhin KEINEN eigenen
 * `--k-shadow-*`-Override (unverändert seit 0.7.2), darum bleibt hier auch
 * kein `shadow.orbit`-Zweig nötig. Der einzig erlaubte Schatten in der
 * Oberfläche bleibt `overlay`, ausschliesslich an schwebenden Overlays
 * (Menü, Dialog, Palette). */
export const shadow = {
  raised: '0 1px 0 rgba(26, 24, 21, 0.08)',
  overlay: '0 1px 0 rgba(26, 24, 21, 0.12), 0 12px 40px rgba(26, 24, 21, 0.18)',
  paper: {
    raised: '0 1px 0 rgba(26, 24, 21, 0.08)',
    overlay: '0 1px 0 rgba(26, 24, 21, 0.12), 0 12px 40px rgba(26, 24, 21, 0.18)',
  },
} as const;

/**
 * Orbit-Thema (`[data-theme='orbit']` in aura.css, v0.7.2 §1) — seit v0.7.3
 * D7 die «Kosmos»-Hälfte des Theme-Paars (Tinte entfernt). Hexwerte exakt
 * gespiegelt; NICHT vom `token-spiegel.test.ts`-Wächter geprüft (der bleibt
 * auf paper+:root beschränkt, siehe dort), hier trotzdem als vollständiger
 * TS-Spiegel für Code, das orbit-Farben ausserhalb von CSS-Variablen
 * braucht.
 */
export const orbit = {
  field: '#0b0d12',
  surface: '#14171f',
  raised: '#1a1e27',
  ink: '#f4f6fa',
  inkSoft: '#b6bdcb',
  inkFaint: '#6e7686',
  line: '#222732',
  lineStrong: '#2a3140',
  accent: '#57b6c2',
  accentHover: '#6cc4cf',
  accentInk: '#06141a',
} as const;

/** Signal — die themeninvariante Markenfarbe (spiegelt `--k-signal*`). */
export const signal = {
  signal: '#57b6c2',
  hell: '#eaf6f8',
  tinte: '#06141a',
} as const;

/** Rollenfarben (spiegelt das themeninvariante `--k-rolle-*` im `:root`-Block,
 * Spec §1/§3) — WER handelt. Das sind die Kosmos-/`orbit`-Originalwerte
 * (Spec D7: «Rollenfarben Original»); Papier überschreibt sie in aura.css
 * eine Stufe dunkler (`[data-theme='paper']`, unter dem `:root`-Block) —
 * dieser TS-Spiegel bleibt bewusst bei den ungedimmten Originalwerten, wie
 * `orbit` oben auch keinen eigenen TS-Zweig für Radien/Fonts bekommt. */
export const rolle = {
  manuell: '#74c2a0',
  pn: '#6f9bcf',
  pna: '#c082b4',
  agent: '#cbb06a',
  memory: '#cf9466',
  generator: '#cd7670',
  ak: '#b08a6e',
  office: '#8a7b5a',
} as const;

/** v0.7.3 D7 (Owner-Entscheid): Tinte (`ink`) entfernt — nur noch das
 * Theme-Paar Papier/Kosmos. Migration bestehender `localStorage`-Werte
 * `ink` → `orbit` lebt in `App.tsx` (VOR dem `useState`, das diesen Typ
 * liest) und im Companion-Thema-Leser (`shell/Companion.tsx`). */
export type ThemeName = 'paper' | 'orbit';
