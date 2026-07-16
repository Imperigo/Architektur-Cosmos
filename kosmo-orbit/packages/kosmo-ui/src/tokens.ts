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
  /**
   * v0.8.0B / W1 (Spez §1 B-26) — Flächenstufe Hover, Papier-Äquivalent.
   * Mittelwert zwischen `field` (#f5f3ee) und `line` (#e4e0d6): dunkler als
   * `raised`/`surface` (Hover braucht mehr Gewicht als die Ruhefläche),
   * heller als jede Linie. Kosmos geht bei Hover nach OBEN (heller, siehe
   * `orbit.hover`), Papier zwangsläufig nach UNTEN (dunkler) — `raised` ist
   * bereits reines Weiss, dort gibt es kein „heller" mehr.
   */
  hover: '#ede9e2',
} as const;

/** Semantische Töne — in beiden Themes lesbar (aura.css: paper-Werte, Referenz). */
export const semantic = {
  success: '#4e6d49',
  warning: '#a37b22',
  /**
   * v0.8.1 / P3 (Spez §4.3/C-16) — kanonisiert aus den vormals verstreuten
   * `var(--k-warning-wash, #f6f2e6)`/`var(--k-warning-line, #c9bfa0)`-
   * Fallback-Hexen (`design-panels.css` `.dp-hinweis`, `publish.css`).
   * Spiegelt `--k-warning-wash`/`--k-warning-line`, theme-invariant wie
   * `warning` selbst.
   */
  warningWash: '#f6f2e6',
  warningLine: '#c9bfa0',
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
 * Typo-Leiter nach oben (NEU, v0.8.0B / W1, Spez §1) — spiegelt
 * `--k-t-h3/-h2/-h1/-display/-code/-micro` aus aura.css. Display/H-Ebenen
 * NUR ausserhalb des CAD-Chromes (Onboarding, OrbitStart, Report/Dossier,
 * Leerzustände) — das CAD-Chrome bleibt bei `type` (der kleinen Skala).
 */
export const typeGross = {
  h3: '21px',
  h2: '28px',
  h1: '42px',
  display: '60px',
  code: '13px',
  micro: '11px',
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
  /**
   * NEU (v0.8.0B / W1, Spez §1/§6) — `_ds`-Pflichtstufen additiv zu s1–s7
   * (2px bleibt Repo-Recht, testgesichert). Spiegelt `--k-s8/-s9/-s10`.
   */
  s8: '48px',
  s9: '64px',
  s10: '96px',
} as const;

/** Radien — spiegelt `--k-radius-sm/-md/-lg` aus aura.css. v0.7.3 D7: die
 * runden Werte 8/12/16px waren bis 0.7.2 ein reiner `orbit`-Override —
 * jetzt themenübergreifende Grammatik im `:root`-Block (Papier UND Kosmos).
 * `pill` bleibt als praktischer Zusatzwert (volle Rundung, keine
 * aura-Variable nötig) bestehen. */
export const radius = { sm: '8px', md: '12px', lg: '16px', pill: '999px' } as const;

/**
 * NEU (v0.8.0B / W1, Spez §1 B-27) — spiegelt `--k-radius-hub`
 * (OrbitStart/Orbit-Hub, themen-agnostisch wie die drei Radien oben).
 */
export const radiusHub = '26px';

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
 * Theme weggefallen. Bis v0.8.0B/W1 bekam `orbit` in aura.css keinen eigenen
 * `--k-shadow-*`-Override; W1 (Spez §1 B-24) führt die Schatten-Skala jetzt
 * NUR für Kosmos ein (`shadow.orbit` unten) — Papier bleibt bei `raised`/
 * `overlay`/`paper.*`, ausschliesslich an schwebenden Overlays (Menü, Dialog,
 * Palette) bzw. der einen flachen Blattkontur. */
export const shadow = {
  raised: '0 1px 0 rgba(26, 24, 21, 0.08)',
  overlay: '0 1px 0 rgba(26, 24, 21, 0.12), 0 12px 40px rgba(26, 24, 21, 0.18)',
  paper: {
    raised: '0 1px 0 rgba(26, 24, 21, 0.08)',
    overlay: '0 1px 0 rgba(26, 24, 21, 0.12), 0 12px 40px rgba(26, 24, 21, 0.18)',
  },
  /**
   * NEU (v0.8.0B / W1, Spez §1 B-24) — Schatten-Skala NUR im Kosmos-Theme
   * (spiegelt `--k-shadow-xs/-sm/-md/-lg/-xl` + `--k-inset-top` aus dem
   * `[data-theme='orbit']`-Block). Papier bekommt KEIN Gegenstück — «Papier
   * kennt kein Glas», es bleibt bei `paper.raised`/`paper.overlay` oben.
   */
  orbit: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.30)',
    sm: '0 2px 8px rgba(0, 0, 0, 0.32)',
    md: '0 8px 24px rgba(0, 0, 0, 0.38)',
    lg: '0 18px 48px rgba(0, 0, 0, 0.46)',
    xl: '0 32px 80px rgba(0, 0, 0, 0.55)',
    insetTop: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },
} as const;

/**
 * Orbit-Thema (`[data-theme='orbit']` in aura.css, v0.7.2 §1) — seit v0.7.3
 * D7 die «Kosmos»-Hälfte des Theme-Paars (Tinte entfernt). Hexwerte exakt
 * gespiegelt; der Grossteil ist NICHT vom `token-spiegel.test.ts`-Wächter
 * geprüft (der bleibt grundsätzlich auf paper+:root beschränkt, siehe
 * dort) — hier trotzdem als vollständiger TS-Spiegel für Code, das
 * orbit-Farben ausserhalb von CSS-Variablen braucht. AUSNAHME (v0.8.0B/W1):
 * die neuen `line*`/`hairline`/`hover`-Werte (Alpha-Border-Flip + Flächen-
 * stufe Hover, Spez §1/§6) bekommen gezielte Wächter-Tests, weil W1 sie
 * frisch einführt bzw. ändert — dort ist Drift am wahrscheinlichsten.
 */
export const orbit = {
  field: '#0b0d12',
  surface: '#14171f',
  raised: '#1a1e27',
  ink: '#f4f6fa',
  inkSoft: '#b6bdcb',
  inkFaint: '#6e7686',
  /**
   * v0.8.0B / W1 (Spez §1/§6, Konfliktentscheid «Borders Alpha-Weiss») —
   * Alpha-Border-Flip: `line`/`lineStrong` waren bis 0.7.2 Volltöne
   * (`#222732`/`#2a3140`), jetzt Alpha-Weiss auf drei Stufen inkl. der
   * neuen `lineSubtil`. Einzige Stelle, an der dieses Paket das Repo
   * sticht (Begründung in aura.css beim `[data-theme='orbit']`-Block).
   */
  lineSubtil: 'rgba(255, 255, 255, 0.07)',
  line: 'rgba(255, 255, 255, 0.11)',
  lineStrong: 'rgba(255, 255, 255, 0.18)',
  /** NEU (W1, Spez §1) — Hintergrundraster, nur Backdrop, opacity ≤.5. */
  hairline: 'rgba(120, 140, 190, 0.14)',
  /** NEU (W1, Spez §1 B-26) — Flächenstufe Hover, komplettiert sunken→hover. */
  hover: '#222732',
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
  /** v0.8.1 / P1 (Owner-Entscheid 16.07.2026, `docs/V081-SPEZ.md` §4.1
   * Entscheid 4/C-4) — neunte Rolle, additiv (mirrors `--k-rolle-doc` in
   * `aura.css`): die Doc-Station bekommt eine eigene Rollenfarbe statt
   * weiterhin `moduleHue.draw` mitzubenutzen (`modules/doc/DocWorkspace.tsx`). */
  doc: '#5d7489',
} as const;

/** v0.7.3 D7 (Owner-Entscheid): Tinte (`ink`) entfernt — nur noch das
 * Theme-Paar Papier/Kosmos. Migration bestehender `localStorage`-Werte
 * `ink` → `orbit` lebt in `App.tsx` (VOR dem `useState`, das diesen Typ
 * liest) und im Companion-Thema-Leser (`shell/Companion.tsx`). */
export type ThemeName = 'paper' | 'orbit';
