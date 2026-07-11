import { GLYPHEN_PUNKT, STATION_GLYPHE, WerkzeugGlyphe, type WerkzeugGlyphenArt } from './werkzeug-glyphen';

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
 * **Kritik-1-Auflage 1 (Fable-Verdikt):** Punkt + Puls-Ring tragen die
 * Spec-§3-ROLLENFARBE (Quelle: `STATION_GLYPHE` — keine Zweitquelle;
 * design→--k-rolle-manuell, data→--k-rolle-pn, kosmo→speak→--k-signal;
 * einzig «Hauptwerkzeug office» steht ausserhalb der Stations-Tabelle und
 * trägt per Spec-§3-Zeile `--k-rolle-office`). Das Modul-Orange auf dem
 * Design-Punkt kollidierte mit dem Rollen-Vokabular (las sich als
 * Generator-Familie). `akzent` bleibt in der Export-Signatur und dient als
 * FALLBACK, wenn keine Rolle gesetzt ist (einfarbig-fähig, via
 * `color:akzent` → `currentColor`). Der Puls-Ring ist ein zweiter, absolut
 * deckungsgleicher Overlay-SVG-Layer auf demselben Punkt-Zentrum
 * (`GLYPHEN_PUNKT`, dieselbe Quelle wie die Glyphe selbst — keine zweite,
 * potenziell abweichende Koordinate).
 */

const GROESSE = 64;

function HauptGlyphe({
  art,
  akzent,
  rolle,
}: {
  art: Exclude<WerkzeugGlyphenArt, 'orbit'>;
  akzent: string;
  rolle?: string;
}) {
  const punkt = GLYPHEN_PUNKT[art];
  const ringFarbe = rolle ? `var(${rolle})` : akzent;
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
      <WerkzeugGlyphe art={art} size={GROESSE} {...(rolle ? { rolle } : {})} />
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
          stroke={ringFarbe}
          strokeWidth={1}
          opacity={0.5}
        />
      </svg>
    </span>
  );
}

/** KosmoDesign — Glyphe `draw` (Zirkel-Zug über dem Werkplan-Blatt), Spec-§3
 *  Station «design», Rolle «Manuell» (Mint). */
export function IconHauptDesign({ akzent }: { akzent: string }) {
  return <HauptGlyphe art="draw" akzent={akzent} rolle={STATION_GLYPHE.design.rolle} />;
}

/** KosmoData — Glyphe `data` (Archiv-/Katalog-Zylinder), Spec-§3 Station
 *  «data», Rolle «PN» (Blau). */
export function IconHauptData({ akzent }: { akzent: string }) {
  return <HauptGlyphe art="data" akzent={akzent} rolle={STATION_GLYPHE.data.rolle} />;
}

/** Kosmo — Glyphe `chat` (Spec-§3 Zeile «speak/kosmo» → Signal-Teal), der
 *  pulsierende Kern der Zentrale. */
export function IconHauptKosmo({ akzent }: { akzent: string }) {
  return <HauptGlyphe art="chat" akzent={akzent} rolle={STATION_GLYPHE.speak.rolle} />;
}

/** KosmoOffice — Glyphe `office`, «kommend». Spec-§3-Zeile «Hauptwerkzeug
 *  office» → `--k-rolle-office` (steht bewusst AUSSERHALB der
 *  Stations-Tabelle: Station «asset» trägt dieselbe Glyphe mit
 *  `--k-rolle-ak`). */
export function IconHauptOffice({ akzent }: { akzent: string }) {
  return <HauptGlyphe art="office" akzent={akzent} rolle="--k-rolle-office" />;
}
