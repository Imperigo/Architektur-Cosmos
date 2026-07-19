import type { ComponentType, ReactNode } from 'react';

/**
 * Prepare-Glyphen-Bibliothek (PA4, `docs/V085-SPEZ.md` §3 E6 + §7 C-13) — 9
 * echte SVG-Icons für den kompletten `prepare-island-katalog.ts`-Werkzeugsatz
 * (AUFNAHME 2 / WISSEN 3 / BESTAND 2 / AUSTAUSCH 2), bisher reine
 * Zwei-Buchstaben-Text-Kürzel (`'DA'`, `'OD'`, …).
 *
 * **Bauvorschrift (BINDEND, identisch zu `design/werkzeug-icons.tsx:1-31` +
 * `design/island/island-glyphen.tsx` — dieselbe 24er-Norm, hier für den
 * Prepare-Namensraum fortgeschrieben):**
 * - `viewBox="0 0 24 24"`, `strokeWidth="1.75"`, runde Kappen/Joins.
 * - GENAU EIN Akzentpunkt-Kreis pro Icon (`r="1.13"`, `fill="var(--k-accent)"`,
 *   `stroke="none"`) — einziger Ort mit einer Farbe ausserhalb `currentColor`.
 * - Alles andere ist `currentColor`/`fill="none"` (vom `<svg>`-Wurzelelement
 *   vererbt).
 * - `aria-hidden="true"`, `focusable={false}`, KEIN `<text>`-Kind.
 *
 * Motive fachlich an den Prepare-Werkzeugen orientiert: Dateien (Trichter —
 * Ingest), OneDrive (Wolke), Suche (Lupe), Basis-Import (Bücherreihe),
 * Vektorisieren (Kurve mit Ankerpunkten), Dokumente (gestapelte Blätter),
 * Chunk-Ansicht (Dokument mit markiertem Ausschnitt), Zu KosmoData (Pfeil in
 * einen Datenzylinder), Manuell (Schalter-Pille, dasselbe Rückweg-Motiv wie
 * `design`s `manuell`).
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

/** Dateien — Trichter (Ingest-Sinnbild), Akzent an der Einfüllöffnung. */
const dateien = glyphe(
  <>
    <path d="M4 4 H20 L14 13 V19 L10 21 V13 Z" />
    {akzent(4, 4)}
  </>,
);

/** OneDrive — Wolkenform, Akzent am oberen Wolkenbogen. */
const onedrive = glyphe(
  <>
    <path d="M7 17 C4 17 3 14.4 5.2 13.2 C4.6 9.8 9.4 8.2 11.6 10.6 C13.4 8 18 8.8 18.4 12 C21.2 12.2 21.6 16.6 18.4 17 Z" />
    {akzent(11.6, 10.6)}
  </>,
);

/** Suche — Lupe, Akzent am Griffende. */
const suche = glyphe(
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.3 15.3 L21 21" />
    {akzent(21, 21)}
  </>,
);

/** Basis-Import — Bücherreihe (Bauwissen-Bibliothek), Akzent am ersten Buchrücken. */
const basis = glyphe(
  <>
    <path d="M4 5 V19 H8 V5 Z M9 5 V19 H13 V5 Z M14 6 L18.5 5 L20 18.7 L15.5 19.7 Z" />
    {akzent(4, 5)}
  </>,
);

/** Vektorisieren — Kurve mit zwei Ankerpunkten (Raster→Vektor), Akzent am Kurvenscheitel. */
const vektorisieren = glyphe(
  <>
    <path d="M3 17 C 7 17 9 8 13 8 S 18 15 21 6" />
    <rect x="1.6" y="15.6" width="2.8" height="2.8" rx="0.6" />
    <rect x="19.6" y="4.6" width="2.8" height="2.8" rx="0.6" />
    {akzent(13, 8)}
  </>,
);

/** Dokumente — zwei gestapelte Blätter, Akzent an der oberen Ecke. */
const dokumente = glyphe(
  <>
    <path d="M7 3 H15 L18 6 V21 H7 Z" />
    <path d="M15 3 V6 H18" />
    <path d="M4 7 V21 H14" />
    {akzent(15, 3)}
  </>,
);

/** Chunk-Ansicht — Dokument mit markiertem Textausschnitt, Akzent an der Markierung. */
const chunk = glyphe(
  <>
    <path d="M6 3 H15 L19 7 V21 H6 Z" />
    <path d="M15 3 V7 H19" />
    <rect x="8.5" y="12" width="8" height="4.5" rx="0.6" />
    {akzent(8.5, 12)}
  </>,
);

/** Zu KosmoData — Pfeil in einen Datenzylinder, Akzent am Pfeilstart. */
const zuKosmodata = glyphe(
  <>
    <path d="M5 6 C5 4.3 8.1 3 12 3 S19 4.3 19 6 S15.9 9 12 9 S5 7.7 5 6 Z" />
    <path d="M5 6 V16 C5 17.7 8.1 19 12 19 S19 17.7 19 16 V6" />
    <path d="M1 12 H7 M4.5 9 L7 12 L4.5 15" />
    {akzent(1, 12)}
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

/** Die 9 Prepare-Werkzeug-Icons, geschlüsselt nach `prepare-island-katalog.ts`s `IslandWerkzeug.id`. */
export const PREPARE_GLYPHEN: Record<string, ComponentType<GlyphProps>> = {
  dateien,
  onedrive,
  suche,
  basis,
  vektorisieren,
  dokumente,
  chunk,
  'zu-kosmodata': zuKosmodata,
  manuell,
};
