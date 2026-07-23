import { useRef, useState } from 'react';
import { useOverlaySchliessen } from '@kosmo/ui';
import type { Storey } from '@kosmo/kernel';
import './island.css';

/**
 * Geschoss-Pille (PB3, `docs/V084-SPEZ.md` §8 C-24, Owner wörtlich
 * «Geschosseinstellung raus aus der Tab-Leiste, als kleine vertikale Pille
 * unter dem KosmoOrbit-Logo, gleiche Radien, gleiches Grau») — herausgelöst
 * aus `AnsichtsInfo.tsx`, die bis PB3 Ansicht UND Geschoss in einem
 * gemeinsamen Popover zeigte (`docs/ISLAND-UI-SPEZ.md` §1). Die
 * Chip-Logik/das Popover-Markup sind WÖRTLICH dieselben wie zuvor in
 * `AnsichtsInfo.tsx` — nur der Anker ist jetzt diese eigene, fix
 * positionierte Bühnenkopf-Pille statt eines zweiten Abschnitts im
 * Ansichts-Popover.
 *
 * **Position (`island.css`):** direkt unter dem Stations-Logo-Kreis
 * (`App.tsx` `.isl-kopf-logo-design`, `left:14/top:14` — P-F2 v0.9.2: war
 * bis dahin `.isl-kopf-logo-orbit`, das mit diesem Paket ersatzlos entfiel;
 * dieselbe Koordinate, kein Wechsel nötig) — `left:14px`, `top:66px`
 * (= 14 + 38px sichtbarer Kreis + 14px Lücke, dasselbe 52px-Raster wie die
 * horizontale Kopf-Reihe, nur senkrecht fortgesetzt).
 * Teilt sich die `--f-pill`-Token-Familie mit den übrigen Insel-Pillen
 * (gleiches Grau) und `--k-radius-pill` (gleiche Radien) — «vertikale
 * Pille»: schmal (38px, deckungsgleich mit dem Kreis darüber), aber höher
 * als breit (Hochformat), im Gegensatz zur horizontalen Ansichts-Info-Pille
 * daneben.
 *
 * **Vertrags-Wanderung:** die `ansichts-info-geschoss-*`-testids ziehen
 * unverändert HIERHER um (waren zuvor Teil von `ansichts-info-popover`) —
 * betroffene Specs sind einzeln in PB3s Bericht begründet.
 *
 * Auto-Schliessen 700ms nach Pointer-Verlassen.
 *
 * **PB4 (`docs/V084-SPEZ.md` §3 E3 «Popup-Gesetz», Pflicht-Konsument):** der
 * bisherige lokale `schliessTimer`/`AUTO_SCHLIESSEN_MS`-Handbau ist ERSETZT
 * durch `useOverlaySchliessen(wurzelRef, …, { hoverRueckklappMs:
 * AUTO_SCHLIESSEN_MS })` — verhaltensgleich (dieselben 700ms nach
 * Pointer-Verlassen, Wiedereintritt storniert unverändert), zusätzlich
 * ADDITIV Esc/Aussenklick (bisher fehlte beides hier).
 */

const AUTO_SCHLIESSEN_MS = 700;

export interface GeschossPilleProps {
  storeys: readonly Storey[];
  activeStoreyId: string | null | undefined;
  setActiveStorey: (id: string) => void;
}

export function GeschossPille({ storeys, activeStoreyId, setActiveStorey }: GeschossPilleProps) {
  const [offen, setOffen] = useState(false);
  const wurzelRef = useRef<HTMLDivElement | null>(null);

  useOverlaySchliessen(wurzelRef, () => setOffen(false), {
    esc: true,
    aussenklick: true,
    hoverRueckklappMs: AUTO_SCHLIESSEN_MS,
  });

  // Kein Geschoss (Bootstrap-Lücke) — die Pille rendert lieber gar nicht,
  // statt einen leeren/erfundenen Zustand vorzutäuschen (dasselbe
  // Ehrlichkeits-Muster, das `AnsichtsInfo.tsx` vor PB3 für ihren
  // Geschoss-Block nutzte: `storeys.length > 0`-Klammer).
  if (storeys.length === 0) return null;

  const aktiveStorey = storeys.find((s) => s.id === activeStoreyId) ?? storeys[0]!;

  return (
    <div
      ref={wurzelRef}
      className="isl-buehnenkopf isl-geschoss-pille"
      data-testid="geschoss-pille-root"
      onMouseEnter={() => setOffen(true)}
    >
      <button
        type="button"
        className="isl-geschoss-pille-label"
        data-testid="geschoss-pille-label"
        aria-label="Geschoss wählen"
        aria-expanded={offen}
        // Bewusst NUR öffnen (kein Toggle) — s. identischer Kommentar in
        // AnsichtsInfo.tsx/StationenOrb.tsx.
        onClick={() => setOffen(true)}
      >
        {aktiveStorey.name.toUpperCase()}
      </button>
      {offen ? (
        <div className="isl-buehnenkopf-popover isl-geschoss-pille-popover" data-testid="geschoss-pille-popover">
          <div className="isl-leiste-kopf">Geschoss</div>
          <div className="isl-buehnenkopf-chips">
            {storeys.map((s) => (
              <button
                key={s.id}
                type="button"
                className="isl-buehnenkopf-chip"
                data-testid={`ansichts-info-geschoss-${s.name}`}
                aria-pressed={s.id === activeStoreyId}
                onClick={() => setActiveStorey(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
