import { useEffect, useRef, useState } from 'react';
import './island.css';

/**
 * Stationen-Orb (PD2, `docs/ISLAND-UI-SPEZ.md` §1-Tabelle) — 38×38px-Kreis
 * neben der Ansichts-Info, Popover mit Direktzugang zu den fünf Stationen
 * KosmoDesign/KosmoData/KosmoVis/KosmoPrepare/KosmoPublish, je mit
 * 7px-Rollenpunkt (Farben 1:1 aus dem Prototyp, §1). Navigation, **keine
 * Island** (kein Werkzeug) — Auto-Schliessen 700ms wie `AnsichtsInfo`.
 *
 * **Repo-Bezug (§1 «PD2»):** ein konsolidiertes Hover-Popover mit allen 5
 * Stationen existiert heute nicht — die nächsten Verwandten sind
 * `EntwurfsDock.tsx:131-140` (vier einzelne Sprung-Knöpfe ohne gemeinsames
 * Popover) und die App-Home-Modulliste (`App.tsx`, `sortierteModule`/
 * `oeffneModul`). Dieser Orb ist additiv NEU (§8 Frage 10 bleibt offen: ob
 * die bestehenden `dock-*`-Sprünge entfallen oder parallel bestehen bleiben
 * — PD2 entscheidet das NICHT, `EntwurfsDock` bleibt unverändert gerendert).
 *
 * Navigation läuft über denselben Weg, den `EntwurfsDock.tsx`s
 * `dock-vis`/`dock-publish`/`dock-prepare`-Knöpfe schon nutzen
 * (`onStationOeffnen`, App.tsx `oeffneModul`) — additiv erweitert um `data`
 * (Direktzugang zu KosmoData) und `design` (bleibt in der Design-Station,
 * schliesst nur das Popover).
 */

export type StationenOrbId = 'design' | 'data' | 'vis' | 'prepare' | 'publish';

const AUTO_SCHLIESSEN_MS = 700;

/** Deutsche Anzeigenamen — 1:1 aus `App.tsx`s `modules`-Liste (`KosmoDesign` etc.). */
const STATION_LABEL: Readonly<Record<StationenOrbId, string>> = {
  design: 'KosmoDesign',
  data: 'KosmoData',
  vis: 'KosmoVis',
  prepare: 'KosmoPrepare',
  publish: 'KosmoPublish',
};

/** Rollenpunkt-Farben 1:1 aus dem Prototyp (§1, wörtlich übernommene Hex-Werte). */
const STATION_FARBE: Readonly<Record<StationenOrbId, string>> = {
  design: '#74C2A0',
  data: '#B08A6E',
  vis: '#CD7670',
  prepare: '#CF9466',
  publish: '#6F9BCF',
};

/** Reihenfolge exakt wie §1: «KosmoDesign/KosmoData/KosmoVis/KosmoPrepare/KosmoPublish». */
const STATION_REIHENFOLGE: readonly StationenOrbId[] = ['design', 'data', 'vis', 'prepare', 'publish'];

export interface StationenOrbProps {
  onStationOeffnen: (station: StationenOrbId) => void;
}

export function StationenOrb({ onStationOeffnen }: StationenOrbProps) {
  const [offen, setOffen] = useState(false);
  const schliessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (schliessTimer.current) clearTimeout(schliessTimer.current);
    },
    [],
  );

  function raeumeTimer(): void {
    if (schliessTimer.current) {
      clearTimeout(schliessTimer.current);
      schliessTimer.current = null;
    }
  }

  function aufEnter(): void {
    raeumeTimer();
    setOffen(true);
  }

  function aufLeave(): void {
    raeumeTimer();
    schliessTimer.current = setTimeout(() => setOffen(false), AUTO_SCHLIESSEN_MS);
  }

  return (
    <div
      className="isl-buehnenkopf isl-buehnenkopf-stationen-orb"
      data-testid="stationen-orb-root"
      onMouseEnter={aufEnter}
      onMouseLeave={aufLeave}
    >
      <button
        type="button"
        className="isl-stationen-orb-pill"
        data-testid="stationen-orb-pill"
        aria-label="Stationen öffnen"
        aria-expanded={offen}
        // Bewusst NUR öffnen (kein Toggle) — s. identischer Kommentar in
        // AnsichtsInfo.tsx: ein Klick folgt physisch immer auf einen Hover,
        // der bereits öffnet; ein Toggle würde das Popover sofort wieder
        // schliessen.
        onClick={() => setOffen(true)}
      >
        AK
      </button>
      {offen ? (
        <div className="isl-buehnenkopf-popover" data-testid="stationen-orb-popover">
          {STATION_REIHENFOLGE.map((id) => (
            <button
              key={id}
              type="button"
              className="isl-stationen-orb-eintrag"
              data-testid={`stationen-orb-eintrag-${id}`}
              onClick={() => {
                setOffen(false);
                onStationOeffnen(id);
              }}
            >
              <span
                className="isl-rollenpunkt"
                aria-hidden="true"
                style={{ background: STATION_FARBE[id] }}
              />
              {STATION_LABEL[id]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
