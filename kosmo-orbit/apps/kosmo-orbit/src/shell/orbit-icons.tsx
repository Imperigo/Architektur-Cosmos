/**
 * Serie K / F3 — Hauptwerkzeug-Icons für das neue Orbit-Startmenü
 * (`OrbitStart.tsx`). Owner-Auftrag wörtlich: «die haupticons sollen
 * schöner, grösser, detaillierter und animiert sein.» Vier Inline-SVGs
 * (KEINE Fremd-Icon-Library — Owner-Auflage, siehe
 * `modules/design/werkzeug-icons.tsx`), im selben Tusche-auf-Papier-Stil
 * (`docs/GESTALTUNGSKONZEPT.md`: dünne technische Linien, kaum Rundung,
 * `currentColor` + ein Akzentpunkt in der Modul-Farbe).
 *
 * Aufgabe 8 (0.6.6-Restliste): auf die 1.5px-Tusche-Norm der KIcon-Registry
 * (`packages/kosmo-ui/src/icons.tsx`) gebracht — 16×16-Raster, EINE
 * konsistente Strichstärke (1.5, am `<svg>`-Wurzelelement, wie `KIcon`;
 * vorher wechselten die Pfade zwischen 0.7/0.9/1/1.2/1.3/1.6), Tiefe kommt
 * jetzt ausschliesslich aus `opacity`-Stufen, nicht mehr aus variabler
 * Strichdicke. Das gerenderte Mass bleibt 64×64 (`width`/`height`
 * unverändert) — nur das interne Koordinatensystem (`viewBox`) wechselt von
 * 64 auf 16 Einheiten, der Browser skaliert Pfade UND Strichstärke
 * gemeinsam hoch (dieselbe optische Strich-zu-Icon-Relation wie ein
 * 16px-KIcon bei `size=16`). Keine Emoji, additiv zu sichtbarem Text (der
 * Stationsname steht als eigener, sichtbarer Text unter jedem Knopf,
 * `OrbitStart.tsx`) — aria-hidden bleibt, testids/aria-labels leben am
 * umschliessenden `<button>` und sind unverändert.
 *
 * Tiefe entsteht durch gestaffelte Layer (Rahmen → Konstruktion → Akzent),
 * Animation durch einen einzelnen, sehr ruhigen Akzent-Puls
 * (`k-orbit-icon-puls`, Opacity, ≥ 3 s) — die globale
 * `prefers-reduced-motion`-Regel in `aura.css` schaltet ihn (wie jede andere
 * Animation der App) ab.
 */

const basis = {
  width: 64,
  height: 64,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

/** KosmoDesign — Zirkel über Werkplan-Blatt: Konstruktion + Entwurf in einem Zeichen. */
export function IconHauptDesign({ akzent }: { akzent: string }) {
  return (
    <svg {...basis}>
      <rect x="2.5" y="2" width="9.5" height="12" opacity="0.55" />
      <path d="M4 5h6.5M4 7h6.5M4 9h4.5" opacity="0.4" />
      <path d="M8 3.5 12.5 12.5M8 3.5 3.5 12.5M5 10.5h6" />
      <circle cx="8" cy="3.5" r="0.65" fill={akzent} stroke="none" />
      <circle className="k-orbit-icon-puls" cx="8" cy="3.5" r="1.25" stroke={akzent} opacity="0.5" />
    </svg>
  );
}

/** KosmoData — gestapelte Archiv-/Katalogschichten mit Wissens-Knoten. */
export function IconHauptData({ akzent }: { akzent: string }) {
  return (
    <svg {...basis}>
      <path d="M3.5 5.5 8 3.5 12.5 5.5 8 7.5Z" />
      <path d="M3.5 8 8 10 12.5 8" opacity="0.55" />
      <path d="M3.5 10.5 8 12.5 12.5 10.5" opacity="0.4" />
      <circle cx="8" cy="5.5" r="0.6" fill={akzent} stroke="none" />
      <circle className="k-orbit-icon-puls" cx="8" cy="5.5" r="1.15" stroke={akzent} opacity="0.5" />
    </svg>
  );
}

/** Kosmo — der pulsierende Kern (wie `OrbitMark` module="kosmo"), grösser
 *  und mit zusätzlichem Konstruktions-Ring/Achskreuz für mehr Tiefe. */
export function IconHauptKosmo({ akzent }: { akzent: string }) {
  return (
    <svg {...basis}>
      <circle cx="8" cy="8" r="6" opacity="0.5" />
      <path d="M8 1v2.25M8 12.75V15M1 8h2.25M12.75 8H15" opacity="0.4" />
      <circle cx="8" cy="8" r="3.875" stroke={akzent} opacity="0.55" />
      <circle cx="8" cy="8" r="2.25" fill={akzent} stroke="none" opacity="0.9" />
      <circle className="k-orbit-icon-puls" cx="8" cy="8" r="3.375" stroke={akzent} opacity="0.6" />
    </svg>
  );
}

/** KosmoOffice — Büro-Silhouette in gestrichelten «kommend»-Linien (bewusst
 *  unvollständig gezeichnet — noch im Bau, nicht Teil der aktiven Zentrale). */
export function IconHauptOffice({ akzent }: { akzent: string }) {
  return (
    <svg {...basis}>
      <path d="M3 12.5V5.5L8 2.5 13 5.5V12.5" strokeDasharray="0.8 0.9" opacity="0.55" />
      <path d="M5 12.5V8H7.5V12.5M9 8H11V10H9Z" strokeDasharray="0.6 0.75" opacity="0.4" />
      <circle cx="8" cy="2.5" r="0.55" fill={akzent} stroke="none" opacity="0.85" />
      <circle className="k-orbit-icon-puls" cx="8" cy="2.5" r="1.05" stroke={akzent} opacity="0.45" />
    </svg>
  );
}
