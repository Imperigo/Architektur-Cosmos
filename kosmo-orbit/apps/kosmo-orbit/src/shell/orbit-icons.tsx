/**
 * Serie K / F3 — Hauptwerkzeug-Icons für das neue Orbit-Startmenü
 * (`OrbitStart.tsx`). Owner-Auftrag wörtlich: «die haupticons sollen
 * schöner, grösser, detaillierter und animiert sein.» Vier neue Inline-SVGs
 * (64×64, KEINE Fremd-Icon-Library — Owner-Auflage, siehe
 * `modules/design/werkzeug-icons.tsx`), im selben Tusche-auf-Papier-Stil
 * (`docs/GESTALTUNGSKONZEPT.md`: dünne technische Linien, kaum Rundung,
 * `currentColor` + ein Akzentpunkt in der Modul-Farbe).
 *
 * Tiefe entsteht durch zwei/drei gestaffelte Layer (Rahmen → Konstruktion →
 * Akzent), Animation durch einen einzelnen, sehr ruhigen Akzent-Puls
 * (`k-orbit-icon-puls`, Opacity, ≥ 3 s) — die globale
 * `prefers-reduced-motion`-Regel in `aura.css` schaltet ihn (wie jede andere
 * Animation der App) ab.
 */

const basis = {
  width: 64,
  height: 64,
  viewBox: '0 0 64 64',
  fill: 'none',
  'aria-hidden': true,
  focusable: false,
} as const;

/** KosmoDesign — Zirkel über Werkplan-Blatt: Konstruktion + Entwurf in einem Zeichen. */
export function IconHauptDesign({ akzent }: { akzent: string }) {
  return (
    <svg {...basis}>
      <rect x="10" y="8" width="38" height="48" stroke="currentColor" strokeWidth="1.3" opacity="0.55" />
      <path d="M16 20h26M16 28h26M16 36h18" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
      <path
        d="M32 14 L50 50 M32 14 L14 50 M20 42 H44"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="14" r="2.6" fill={akzent} />
      <circle className="k-orbit-icon-puls" cx="32" cy="14" r="5" stroke={akzent} strokeWidth="0.9" opacity="0.5" />
    </svg>
  );
}

/** KosmoData — gestapelte Archiv-/Katalogschichten mit Wissens-Knoten. */
export function IconHauptData({ akzent }: { akzent: string }) {
  return (
    <svg {...basis}>
      <path d="M14 22 L32 14 L50 22 L32 30 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M14 32 L32 40 L50 32" stroke="currentColor" strokeWidth="1.2" opacity="0.55" strokeLinejoin="round" />
      <path d="M14 42 L32 50 L50 42" stroke="currentColor" strokeWidth="1.2" opacity="0.4" strokeLinejoin="round" />
      <circle cx="32" cy="22" r="2.4" fill={akzent} />
      <circle className="k-orbit-icon-puls" cx="32" cy="22" r="4.6" stroke={akzent} strokeWidth="0.9" opacity="0.5" />
    </svg>
  );
}

/** Kosmo — der pulsierende Kern (wie `OrbitMark` module="kosmo"), grösser
 *  und mit zusätzlichem Konstruktions-Ring/Achskreuz für mehr Tiefe. */
export function IconHauptKosmo({ akzent }: { akzent: string }) {
  return (
    <svg {...basis}>
      <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
      <path d="M32 4v9M32 51v9M4 32h9M51 32h9" stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
      <circle cx="32" cy="32" r="15.5" stroke={akzent} strokeWidth="1" opacity="0.55" />
      <circle cx="32" cy="32" r="9" fill={akzent} opacity="0.9" />
      <circle className="k-orbit-icon-puls" cx="32" cy="32" r="13.5" stroke={akzent} strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

/** KosmoOffice — Büro-Silhouette in gestrichelten «kommend»-Linien (bewusst
 *  unvollständig gezeichnet — noch im Bau, nicht Teil der aktiven Zentrale). */
export function IconHauptOffice({ akzent }: { akzent: string }) {
  return (
    <svg {...basis}>
      <path
        d="M12 50 V22 L32 10 L52 22 V50"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeDasharray="3.2 3.6"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path d="M20 50 V32 H30 V50 M36 32 H44 V40 H36 Z" stroke="currentColor" strokeWidth="1" strokeDasharray="2.4 3" opacity="0.4" />
      <circle cx="32" cy="10" r="2.2" fill={akzent} opacity="0.85" />
      <circle className="k-orbit-icon-puls" cx="32" cy="10" r="4.2" stroke={akzent} strokeWidth="0.9" opacity="0.45" />
    </svg>
  );
}
