import { GLYPHEN_PUNKT, WerkzeugGlyphe, type WerkzeugGlyphenArt } from './werkzeug-glyphen';

/**
 * Serie K / F3 — Hauptwerkzeug-Icons für das neue Orbit-Startmenü
 * (`OrbitStart.tsx`). Owner-Auftrag wörtlich: «die haupticons sollen
 * schöner, grösser, detaillierter und animiert sein.»
 *
 * V0.7.2 W1-B (Paket 02): das SVG-Innere der vier Icons kommt jetzt aus der
 * neuen Glyphen-Bibliothek (`werkzeug-glyphen.tsx`, Spec-§3) — design→draw,
 * data→data, kosmo→chat, office→office (Spec-§3 «Station→Glyphe→Rolle»:
 * `speak/kosmo` → chat, `Hauptwerkzeug office` → office). Export-Signaturen
 * (`(p: { akzent: string }) => ReactElement`) und der ruhige Akzent-Puls
 * (`k-orbit-icon-puls`, Opacity+Scale, ≥ 3 s, abgeschaltet durch die globale
 * `prefers-reduced-motion`-Regel in `aura.css`) bleiben unverändert — nur die
 * gezeichnete Form wechselt.
 *
 * `akzent` bleibt ein aufgelöster Farbwert (`moduleHue[...]`, siehe
 * `OrbitStart.tsx`), keine CSS-Variable: die Glyphe selbst bekommt daher
 * KEINE `rolle` (ihr Akzent-Punkt fiele sonst auf `var(--k-rolle-*)` zurück,
 * eine andere Zuordnung als die Modulfarbe hier) — stattdessen setzt ein
 * umschliessendes `color:akzent` `currentColor`, das der Glyphen-Punkt ohne
 * `rolle` ohnehin erbt (Spec-§3: «einfarbig-fähig»). Der Puls-Ring ist ein
 * zweiter, absolut deckungsgleicher Overlay-SVG-Layer auf demselben
 * Punkt-Zentrum (`GLYPHEN_PUNKT`, dieselbe Quelle wie die Glyphe selbst —
 * keine zweite, potenziell abweichende Koordinate).
 */

const GROESSE = 64;

function HauptGlyphe({ art, akzent }: { art: Exclude<WerkzeugGlyphenArt, 'orbit'>; akzent: string }) {
  const punkt = GLYPHEN_PUNKT[art];
  return (
    <span
      style={{
        display: 'inline-flex',
        position: 'relative',
        width: GROESSE,
        height: GROESSE,
        color: akzent,
      }}
    >
      <WerkzeugGlyphe art={art} size={GROESSE} />
      <svg
        width={GROESSE}
        height={GROESSE}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <circle
          className="k-orbit-icon-puls"
          cx={punkt.cx}
          cy={punkt.cy}
          r={3.2}
          fill="none"
          stroke={akzent}
          strokeWidth={1}
          opacity={0.5}
        />
      </svg>
    </span>
  );
}

/** KosmoDesign — Glyphe `draw` (Zirkel-Zug über dem Werkplan-Blatt), Spec-§3
 *  Station «design». */
export function IconHauptDesign({ akzent }: { akzent: string }) {
  return <HauptGlyphe art="draw" akzent={akzent} />;
}

/** KosmoData — Glyphe `data` (Archiv-/Katalog-Zylinder), Spec-§3 Station
 *  «data». */
export function IconHauptData({ akzent }: { akzent: string }) {
  return <HauptGlyphe art="data" akzent={akzent} />;
}

/** Kosmo — Glyphe `chat` (Spec-§3 Zeile «speak/kosmo»), der pulsierende Kern
 *  der Zentrale. */
export function IconHauptKosmo({ akzent }: { akzent: string }) {
  return <HauptGlyphe art="chat" akzent={akzent} />;
}

/** KosmoOffice — Glyphe `office` (Spec-§3 Zeile «Hauptwerkzeug office»),
 *  «kommend» — bewusst dieselbe Glyphe wie Station «asset», hier mit der
 *  Modulfarbe statt einer Rollenfarbe. */
export function IconHauptOffice({ akzent }: { akzent: string }) {
  return <HauptGlyphe art="office" akzent={akzent} />;
}
