import type { ComponentType, ReactNode } from 'react';

/**
 * Publish-Glyphen-Bibliothek (PA4, `docs/V085-SPEZ.md` §3 E6 + §7 C-13) — 12
 * echte SVG-Icons für den kompletten `publish-island-katalog.ts`-Werkzeugsatz
 * (BLATT 3 / DARSTELLUNG 3 / PROJEKT 2 / AUSTAUSCH 4), bisher reine
 * Zwei-Buchstaben-Text-Kürzel (`'BL'`, `'PL'`, …).
 *
 * **Bauvorschrift (BINDEND, identisch zu `design/werkzeug-icons.tsx:1-31` +
 * `design/island/island-glyphen.tsx` — dieselbe 24er-Norm, hier für den
 * Publish-Namensraum fortgeschrieben):**
 * - `viewBox="0 0 24 24"`, `strokeWidth="1.75"`, runde Kappen/Joins.
 * - GENAU EIN Akzentpunkt-Kreis pro Icon (`r="1.13"`, `fill="var(--k-accent)"`,
 *   `stroke="none"`) — einziger Ort mit einer Farbe ausserhalb `currentColor`.
 * - Alles andere ist `currentColor`/`fill="none"` (vom `<svg>`-Wurzelelement
 *   vererbt).
 * - `aria-hidden="true"`, `focusable={false}`, KEIN `<text>`-Kind.
 *
 * Motive fachlich an den Publish-Werkzeugen orientiert: Blatt (Blattstapel),
 * Platzieren (Rahmen mit Zielausschnitt), Auto-Pack (gepackte Flächen), Zoom
 * (Lupe), Massstab (Winkel-Lineal), Plankopf-Presets (Stempel mit Chips),
 * Dossier (Mappe mit Clip), Plankopf (Blatt mit betonter Fusszeile),
 * PDF-Export (Dokument mit Abwärtspfeil), SVG/DXF-Export (Vektorpfad mit
 * Ankerpunkten), Export-Hub (Verteilerknoten), Manuell (Schalter-Pille,
 * dasselbe Rückweg-Motiv wie `design`s `manuell`).
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

/** Blatt anlegen/wechseln — zwei versetzte Blattflächen, Akzent an der oberen Ecke. */
const blatt = glyphe(
  <>
    <rect x="7" y="3" width="13" height="17" rx="1" />
    <rect x="4" y="6" width="13" height="17" rx="1" />
    {akzent(17, 6)}
  </>,
);

/** Ansicht platzieren — Rahmen mit Zielausschnitt + Fluchtlinien, Akzent im Zielpunkt. */
const platzieren = glyphe(
  <>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <rect x="9" y="9" width="7" height="7" rx="1" />
    <path d="M12.5 5 V9 M12.5 16 V19" />
    {akzent(12.5, 12.5)}
  </>,
);

/** Auto-Pack — gepackte Flächen unterschiedlicher Grösse, Akzent am Trennpunkt. */
const autoPack = glyphe(
  <>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M11 3 V13 M11 13 H21 M3 13 H11" />
    {akzent(11, 13)}
  </>,
);

/** Zoom — Lupe mit Plus, Akzent am Griffende. */
const zoom = glyphe(
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.3 15.3 L21 21" />
    <path d="M10.5 7.5 V13.5 M7.5 10.5 H13.5" />
    {akzent(21, 21)}
  </>,
);

/** Massstab — Winkel-Lineal mit Teilstrichen, Akzent am Nullpunkt. */
const massstab = glyphe(
  <>
    <path d="M3 17 L17 3 L21 7 L7 21 Z" />
    <path d="M8.5 15.5 L10 14 M11.5 12.5 L13 11 M14.5 9.5 L16 8" />
    {akzent(3, 17)}
  </>,
);

/** Plankopf-Presets — Stempel mit Fusszeile und Chips, Akzent an der Fusszeile. */
const plankopfPresets = glyphe(
  <>
    <rect x="3" y="4" width="18" height="14" rx="1" />
    <path d="M3 14 H21" />
    <path d="M6 16.5 H9 M11.5 16.5 H14.5 M17 16.5 H19" />
    {akzent(3, 14)}
  </>,
);

/** Dossier — gebundene Mappe mit Clip, Akzent am Clip. */
const dossier = glyphe(
  <>
    <path d="M6 4 H16 V20 H6 Z" />
    <path d="M9 2.4 H13 V6 H9 Z" />
    {akzent(9, 2.4)}
  </>,
);

/** Plankopf — Blatt mit betonter Fusszeile (Titelblock), Akzent an der Fusszeilenkante. */
const plankopf = glyphe(
  <>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M4 15 H20" />
    <path d="M7 18 H17" />
    {akzent(20, 15)}
  </>,
);

/** PDF-Export — Dokument mit Abwärtspfeil, Akzent an der Pfeilspitze. */
const exportPdf = glyphe(
  <>
    <path d="M6 3 H14 L18 7 V21 H6 Z" />
    <path d="M14 3 V7 H18" />
    <path d="M12 11 V17 M9 14 L12 17 L15 14" />
    {akzent(12, 17)}
  </>,
);

/** SVG/DXF-Export — Vektorpfad mit Ankerpunkten, Akzent am mittleren Anker. */
const exportSvgDxf = glyphe(
  <>
    <path d="M3 18 C 7 18 8 6 13 6 S 18 14 21 8" />
    <circle cx="3" cy="18" r="1.6" />
    <circle cx="21" cy="8" r="1.6" />
    {akzent(13, 6)}
  </>,
);

/** Export-Hub — Verteilerknoten mit drei Strahlen, Akzent am Zielpunkt. */
const exportHub = glyphe(
  <>
    <circle cx="12" cy="12" r="2.6" />
    <path d="M12 9.4 V4 M14.6 13.8 L19 17 M9.4 13.8 L5 17 M14.6 10.2 L19 7" />
    {akzent(19, 7)}
  </>,
);

/** Manuell — Schalter-Pille mit Knopf, Akzent als Bedienpunkt (Rückweg, Muster `design`s `manuell`). */
const manuell = glyphe(
  <>
    <rect x="4" y="9" width="16" height="8" rx="4" />
    <circle cx="9" cy="13" r="2.6" />
    {akzent(9, 13)}
  </>,
);

/** Die 12 Publish-Werkzeug-Icons, geschlüsselt nach `publish-island-katalog.ts`s `IslandWerkzeug.id`. */
export const PUBLISH_GLYPHEN: Record<string, ComponentType<GlyphProps>> = {
  blatt,
  platzieren,
  'auto-pack': autoPack,
  zoom,
  massstab,
  'plankopf-presets': plankopfPresets,
  dossier,
  plankopf,
  'export-pdf': exportPdf,
  'export-svg-dxf': exportSvgDxf,
  'export-hub': exportHub,
  manuell,
};
