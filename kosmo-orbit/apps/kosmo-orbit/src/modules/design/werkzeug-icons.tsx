/**
 * Serie K A5 (K15, Owner «Oberfläche minimal»): Inline-SVG-Icons für die vier
 * meistgenutzten Zeichenwerkzeuge der KosmoDesign-Werkzeugleiste — bewusst
 * KEINE Fremd-Icon-Library (Owner-Auflage), reine handgezeichnete Linien im
 * Gestaltungskonzept-Ton (`docs/GESTALTUNGSKONZEPT.md`: Tusche auf Papier,
 * 1px/1.4px-Linien, kaum Rundung). Jedes Icon ist rein dekorativ
 * (`aria-hidden`) — der zugängliche Name sitzt am Button (`title`+`aria-label`
 * in `DesignWorkspace.tsx`), nicht am Icon selbst.
 *
 * Auswahl der vier Icon-Kandidaten (Bauauftrag 1, dokumentiert auch im
 * ROADMAP-Eintrag): ohne echte Nutzungstelemetrie (frisches Projekt, leerer
 * `kosmo.adaption.v1`-Speicher) ist "häufigste Nutzung" eine Architektur-
 * Annahme, keine Messung — Auswahl (Dauerwerkzeug, ArchiCAD-Grundzustand),
 * Wand (meistgezeichnetes Bauteil), Zone (Raumprogramm/SIA-Flächen) und
 * Volumen (Massenstudien) sind die vier, die in praktisch jeder Sitzung
 * vorkommen. Dach/Treppe/Stütze/Schnitt/Skizze/Mesh bleiben bewusst Text —
 * seltener, spezialisierter, teils (Treppe) ohnehin durch einen bestehenden
 * Text-Selektor vertraglich gebunden (`e2e/module.spec.ts`
 * `button:text-is("Treppe")`).
 */

const basis = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  'aria-hidden': true,
  focusable: false,
} as const;

/** Auswahl — Zeigepfeil (Cursor), gefüllt wie ein Werkplan-Pfeil. */
export function IconAuswahl() {
  return (
    <svg {...basis}>
      <path
        d="M3 2.2 L3 12.6 L5.7 10.1 L7.5 13.9 L9.2 13.1 L7.4 9.3 L10.6 9 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Wand — Poché-Balken (Wandschnitt in Draufsicht), wie im Grundriss. */
export function IconWand() {
  return (
    <svg {...basis}>
      <rect x="2" y="6.3" width="12" height="3.4" fill="currentColor" />
    </svg>
  );
}

/** Volumen — Drahtgitter-Würfel (isometrisch), Massenkörper-Symbol. */
export function IconVolumen() {
  return (
    <svg {...basis}>
      <path
        d="M8 1.6 L14 5 L14 11 L8 14.4 L2 11 L2 5 Z M2 5 L8 8.4 L14 5 M8 8.4 L8 14.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Zone — dünn umrissenes Raumfeld (SIA-Fläche), bewusst nur Kontur. */
export function IconZone() {
  return (
    <svg {...basis}>
      <rect
        x="2.4"
        y="2.4"
        width="11.2"
        height="11.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

/**
 * K16 A6 (Entwurfs-Einstieg, linke Kante): drei weitere Icons für den
 * Entwurfs-Dock — Sprechen/Schreiben, Skizzieren, manuelles CAD. Gleicher
 * aura-Stil wie oben (nur Linien, `currentColor`, `aria-hidden`).
 */

/** Sprechen/Schreiben — Sprechblase mit Punkten (Text/Dialog, kein Mikrofon-Klischee). */
export function IconEntwurfSprechen() {
  return (
    <svg {...basis}>
      <path
        d="M2.2 3.4 H13.8 V9.8 H6.6 L3.6 12.6 V9.8 H2.2 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="5.6" cy="6.6" r="0.7" fill="currentColor" />
      <circle cx="8" cy="6.6" r="0.7" fill="currentColor" />
      <circle cx="10.4" cy="6.6" r="0.7" fill="currentColor" />
    </svg>
  );
}

/** Skizzieren — Stift über einer angedeuteten Freihandlinie (dieselbe Geste wie das ✎-Werkzeug). */
export function IconEntwurfSkizzieren() {
  return (
    <svg {...basis}>
      <path
        d="M2.4 12.4 C5 11.4 6.5 9.4 8.6 8.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M8.2 8.9 L11.6 5.5 A1.2 1.2 0 0 1 13.3 7.2 L9.9 10.6 L7.6 11.2 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Manuelles CAD — T-Winkel/Lineal (klassisches Zeichenwerkzeug, ArchiCAD-Anmutung). */
export function IconEntwurfCad() {
  return (
    <svg {...basis}>
      <path
        d="M2.2 2.2 H13.8 V4.6 H4.6 V13.8 H2.2 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M6.8 4.6 V7.4 M9.4 4.6 V7.4 M12 4.6 V7.4" stroke="currentColor" strokeWidth="0.9" />
      <path d="M2.2 8.8 H4.6 M2.2 11.2 H4.6" stroke="currentColor" strokeWidth="0.9" />
    </svg>
  );
}
