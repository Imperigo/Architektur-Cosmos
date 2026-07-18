import type { ComponentType, ReactNode } from 'react';

/**
 * Island-Glyphen-Bibliothek (v0.8.4 W1, `docs/V084-SPEZ.md` §3 E8 + §7
 * Sanktion 3) — 20 neue SVG-Icons für alle Katalog-Werkzeuge
 * (`island-katalog.ts`), die bisher nur die Text-Platzhalter-`glyphe`
 * (zweistelliges Mono-Kürzel) tragen, plus 4 Pill-Icons für die vier
 * Island-Bühnen selbst (Zeichnen/Ansicht/Projekt/Austausch-Pille,
 * `IslandShell.tsx:415-420`).
 *
 * **UNVERDRAHTET (bewusst):** diese Datei importiert NICHTS aus
 * `island-katalog.ts`/`IslandShell.tsx` und wird von KEINEM der beiden
 * eingebunden — die Verdrahtung (welches Werkzeug welches Icon zeigt)
 * gehört PB2 (design) bzw. den PC-Paketen je Station (Hotspot-Matrix
 * `V084-SPEZ.md` §5). `island-katalog.ts`s `glyphe`-Feld ist bereits
 * `string | ComponentType<{ size?: number }>` (E8) — genau der Typ, den die
 * beiden Records unten liefern; das Verkabeln selbst bleibt bewusst
 * jemand anderem überlassen.
 *
 * **Bauvorschrift (BINDEND, `werkzeug-icons.tsx:1-31` + `shell/werkzeug-
 * glyphen.tsx` — dieselbe 24er-Norm, hier 1:1 fortgeschrieben):**
 * - `viewBox="0 0 24 24"`, `strokeWidth="1.75"`, runde Kappen/Joins
 *   (`strokeLinecap`/`strokeLinejoin="round"`).
 * - GENAU EIN Akzentpunkt-Kreis pro Icon (`r="1.13"`,
 *   `fill="var(--k-accent)"`, `stroke="none"`) — der einzige Ort, an dem
 *   eine Farbe ausserhalb von `currentColor` auftaucht (Sanktion 3: "keine
 *   hartkodierte Farbe ausser dem Akzent-Token").
 * - Alles andere (`stroke`) ist `currentColor`, `fill="none"` (vererbt vom
 *   `<svg>`-Wurzelelement, nicht je Pfad wiederholt).
 * - `aria-hidden="true"`, `focusable={false}` — rein dekorativ, der
 *   zugängliche Name sitzt am Button (Muster `werkzeug-icons.tsx:6-8`).
 * - KEIN `<text>`-Kind — leerer `textContent`, unabhängig vom Icon-Inhalt.
 *
 * 20 Werkzeug-Icons (Katalog-Ids aus `island-katalog.ts`, die drei
 * ZEICHNEN-Lücken + alle 6 ANSICHT + alle 6 PROJEKT + alle 6 AUSTAUSCH,
 * §3-Aufzählung aus dem Bauauftrag): `oeffnung`, `messen`, `kommentare`,
 * `darstellung`, `sonne`, `ebenen`, `achsen`, `trace`, `graph`,
 * `kennzahlen`, `checks`, `varianten`, `phase`, `liste`, `export`,
 * `import`, `rendern`, `blaetter`, `sync`, `manuell`. (`skizze` bleibt
 * aussen vor — nicht Teil der 20-Icon-Aufzählung im Bauauftrag; die
 * bestehenden 9 `werkzeug-icons.tsx`-Icons decken `auswahl`/`wand`/
 * `volumen`/`zone`/`dach`/`treppe`/`stuetze`/`mesh` bereits ab, macht
 * 8 der 11 ZEICHNEN-Werkzeuge — `skizze` bleibt vorerst Text, wie `D12`
 * es mit "~20 fehlen" beziffert.)
 *
 * 4 Pill-Icons (`ISLAND_PILL_GLYPHEN`, Katalog-`IslandId`s als Strings,
 * ebenfalls ohne Typ-Import): `zeichnen`, `ansicht`, `projekt`,
 * `austausch`.
 */

const WURZEL_ATTRIBUTE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

interface GlyphProps {
  size?: number;
}

/** Baut aus dem reinen Pfad-/Kreis-Inhalt (OHNE `<svg>`-Hülle) eine fertige
 *  Icon-Komponente — die Hülle selbst trägt die ganze Bauvorschrift, jedes
 *  Icon liefert nur seine individuelle Zeichnung + genau einen Akzentpunkt. */
function glyphe(inhalt: ReactNode): ComponentType<GlyphProps> {
  function Glyphe({ size = 18 }: GlyphProps) {
    return (
      <svg {...WURZEL_ATTRIBUTE} width={size} height={size}>
        {inhalt}
      </svg>
    );
  }
  return Glyphe;
}

/** Der eine erlaubte Akzentpunkt (r=1.13, `var(--k-accent)`, kein Stroke). */
function akzent(cx: number, cy: number) {
  return <circle cx={cx} cy={cy} r={1.13} fill="var(--k-accent)" stroke="none" />;
}

// ── 20 Werkzeug-Icons ──────────────────────────────────────────────────

/** Öffnung — Türblatt-Anschlag mit Schwenkbogen (Grundriss-Norm), Akzent am Anschlag/Scharnier. */
const oeffnung = glyphe(
  <>
    <path d="M4 20 H20 M6 20 V6" />
    <path d="M6 6 A14 14 0 0 1 20 20" />
    {akzent(6, 20)}
  </>,
);

/** Messen — Mass-Linie mit Begrenzungs-Ticks an beiden Enden, Akzent am Messwert-Punkt (Mitte). */
const messen = glyphe(
  <>
    <path d="M4 13 V21 M20 13 V21 M4 17 H20" />
    <path d="M3 15 L5 19 M19 15 L21 19" />
    {akzent(12, 17)}
  </>,
);

/** Kommentare — Sprechblase mit Schwanz, Akzent als Benachrichtigungs-Punkt oben rechts. */
const kommentare = glyphe(
  <>
    <path d="M4 5 H20 V15 H10 L6 19 V15 H4 Z" />
    {akzent(18, 7)}
  </>,
);

/** Darstellung — Bildschirm mit Horizont-Trenner (Ansichts-Umschaltung), Akzent oben links. */
const darstellung = glyphe(
  <>
    <rect x="3" y="4.5" width="18" height="14" rx="1.5" />
    <path d="M3 11.5 H21" />
    {akzent(7, 8)}
  </>,
);

/** Sonne — Scheibe mit acht Strahlen, Akzent als Kern-Punkt im Zentrum. */
const sonne = glyphe(
  <>
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 3 V5.5 M12 18.5 V21 M3 12 H5.5 M18.5 12 H21 M5.6 5.6 L7.4 7.4 M16.6 16.6 L18.4 18.4 M18.4 5.6 L16.6 7.4 M7.4 16.6 L5.6 18.4" />
    {akzent(12, 12)}
  </>,
);

/** Ebenen — drei gestapelte Rauten (Layer-Stapel), Akzent an der obersten Spitze. */
const ebenen = glyphe(
  <>
    <path d="M12 4 L21 9 L12 14 L3 9 Z" />
    <path d="M3 12.5 L12 17.5 L21 12.5" />
    <path d="M3 16 L12 21 L21 16" />
    {akzent(12, 4)}
  </>,
);

/** Achsen — X/Y-Achsenkreuz mit Pfeilspitzen, Akzent im Ursprung. */
const achsen = glyphe(
  <>
    <path d="M5 19 V3 M5 3 L3 6.5 M5 3 L7 6.5" />
    <path d="M5 19 H21 M21 19 L17.5 17 M21 19 L17.5 21" />
    {akzent(5, 19)}
  </>,
);

/** Trace — gebrochener Strahlweg (Pfad-Verfolgung), Akzent an der Lichtquelle. */
const trace = glyphe(
  <>
    <path d="M3 5 L10 12 L7 19 L16 14 L21 6" />
    {akzent(3, 5)}
  </>,
);

/** Graph — zwei umrandete Knoten, verbunden zu einem dritten Akzent-Knoten. */
const graph = glyphe(
  <>
    <circle cx="6" cy="7" r="2.4" />
    <circle cx="18" cy="7" r="2.4" />
    <path d="M8.2 8.4 L15.8 8.4 M7.2 9.1 L11 17 M16.8 9.1 L13 17" />
    {akzent(12, 18)}
  </>,
);

/** Kennzahlen — Balkendiagramm mit Grundlinie, Akzent über dem höchsten Balken. */
const kennzahlen = glyphe(
  <>
    <path d="M3 20 H21 M5 20 V13 M11 20 V8 M17 20 V16" />
    {akzent(11, 8)}
  </>,
);

/** Checks — zwei Listenzeilen (offen/erledigt), Akzent als Fortschritts-Punkt. */
const checks = glyphe(
  <>
    <rect x="4" y="5" width="3.4" height="3.4" rx="0.8" />
    <path d="M10 6.7 H20" />
    <rect x="4" y="15" width="3.4" height="3.4" rx="0.8" />
    <path d="M4.8 16.7 L5.6 17.6 L7.4 15.4 M10 16.7 H20" />
    {akzent(20, 16)}
  </>,
);

/** Varianten — Gabelung mit zwei Ästen, Akzent markiert den gewählten Ast. */
const varianten = glyphe(
  <>
    <path d="M12 20 V13 M12 13 L6 6 M12 13 L18 6" />
    <circle cx="6" cy="6" r="1.8" />
    {akzent(18, 6)}
  </>,
);

/** Phase — Fahnenmast mit Wimpel, Akzent an der Mastspitze (Meilenstein). */
const phase = glyphe(
  <>
    <path d="M6 20 V4 M6 4 L17 7 L6 10" />
    {akzent(6, 4)}
  </>,
);

/** Liste — drei Zeilen mit Aufzählungspunkten, Akzent als dritter (aktueller) Punkt. */
const liste = glyphe(
  <>
    <path d="M9 6 H20 M9 12 H20 M9 18 H20" />
    <circle cx="5" cy="6" r="1.3" />
    <circle cx="5" cy="12" r="1.3" />
    {akzent(5, 18)}
  </>,
);

/** Export — Ablage-Wanne mit Pfeil nach oben heraus, Akzent an der Pfeilspitze. */
const exportGlyphe = glyphe(
  <>
    <path d="M4 15 V19 H20 V15" />
    <path d="M12 16 V4 M8 8 L12 4 L16 8" />
    {akzent(12, 4)}
  </>,
);

/** Import — Ablage-Wanne mit Pfeil nach unten hinein, Akzent an der Pfeilspitze. */
const importGlyphe = glyphe(
  <>
    <path d="M4 15 V19 H20 V15" />
    <path d="M12 4 V16 M8 12 L12 16 L16 12" />
    {akzent(12, 16)}
  </>,
);

/** Rendern — Kamerakörper mit Objektiv, Akzent als Linsen-Reflex. */
const rendern = glyphe(
  <>
    <path d="M4 8 H8 L10 6 H14 L16 8 H20 V18 H4 Z" />
    <circle cx="12" cy="13" r="3.4" />
    {akzent(10.6, 11.6)}
  </>,
);

/** Blätter — zwei versetzt gestapelte Blattflächen, Akzent an der oberen Ecke. */
const blaetter = glyphe(
  <>
    <rect x="7" y="4" width="13" height="16" rx="1" />
    <rect x="4" y="7" width="13" height="16" rx="1" />
    {akzent(15, 9)}
  </>,
);

/** Sync — zwei gegenläufige Kreisbögen mit Pfeilspitzen, Akzent am Startpunkt. */
const sync = glyphe(
  <>
    <path d="M17 6 A8 8 0 1 0 19.5 12.5" />
    <path d="M19.5 12.5 L21 9.5 M19.5 12.5 L16.5 11.5" />
    <path d="M7 18 A8 8 0 0 0 5 11" />
    {akzent(17, 6)}
  </>,
);

/** Manuell — Schalter-Pille mit Knopf, Akzent als Bedienpunkt (Handsteuerung statt Automatik). */
const manuell = glyphe(
  <>
    <rect x="4" y="9" width="16" height="8" rx="4" />
    <circle cx="9" cy="13" r="2.6" />
    {akzent(9, 13)}
  </>,
);

/** Die 20 Werkzeug-Icons, geschlüsselt nach `island-katalog.ts`s `IslandWerkzeug.id`. */
export const ISLAND_GLYPHEN: Record<string, ComponentType<GlyphProps>> = {
  oeffnung,
  messen,
  kommentare,
  darstellung,
  sonne,
  ebenen,
  achsen,
  trace,
  graph,
  kennzahlen,
  checks,
  varianten,
  phase,
  liste,
  export: exportGlyphe,
  import: importGlyphe,
  rendern,
  blaetter,
  sync,
  manuell,
};

// ── 4 Island-Pill-Icons ────────────────────────────────────────────────

/** Zeichnen-Pille — Stift zieht eine geschwungene Linie, Akzent an der Stiftspitze. */
const zeichnenPille = glyphe(
  <>
    <path d="M4 19 C 8 19, 8 13, 12 13 S 16 7, 20 7" />
    {akzent(20, 7)}
  </>,
);

/** Ansicht-Pille — Auge (Iris + Pupille), Akzent als Pupille. */
const ansichtPille = glyphe(
  <>
    <path d="M3 12 C 6 6, 18 6, 21 12 C 18 18, 6 18, 3 12 Z" />
    <circle cx="12" cy="12" r="2.6" />
    {akzent(12, 12)}
  </>,
);

/** Projekt-Pille — Ordner mit Lasche, Akzent an der Laschen-Ecke. */
const projektPille = glyphe(
  <>
    <path d="M3 7 H9 L11 9 H21 V18 H3 Z" />
    {akzent(9, 7)}
  </>,
);

/** Austausch-Pille — zwei gegenläufige Pfeile, Akzent an der oberen Pfeilspitze. */
const austauschPille = glyphe(
  <>
    <path d="M5 8 H18 M18 8 L14.5 4.5 M18 8 L14.5 11.5" />
    <path d="M19 16 H6 M6 16 L9.5 12.5 M6 16 L9.5 19.5" />
    {akzent(18, 8)}
  </>,
);

/** Die 4 Pill-Icons, geschlüsselt nach `island-katalog.ts`s `IslandId`. */
export const ISLAND_PILL_GLYPHEN: Record<string, ComponentType<GlyphProps>> = {
  zeichnen: zeichnenPille,
  ansicht: ansichtPille,
  projekt: projektPille,
  austausch: austauschPille,
};
