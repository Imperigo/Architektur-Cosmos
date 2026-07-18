import { useEffect, useRef, useState } from 'react';
import type { ViewMode } from '../../../state/ui-zustand';
import './island.css';

/**
 * Ansichts-Info (PD2, `docs/ISLAND-UI-SPEZ.md` §1-Tabelle) — Mono-Label
 * («GRUNDRISS»-Muster) + Popover mit Ansichts-Chips (bestehende `ViewMode`-
 * Werte). Nur im Island-Modus gerendert (`App.tsx`, `bodenDockAusgeblendet`).
 *
 * **PB3 (`docs/V084-SPEZ.md` §8 C-24, Owner wörtlich «Geschosseinstellung
 * raus aus der Tab-Leiste, als kleine vertikale Pille unter dem KosmoOrbit-
 * Logo»): der Geschoss-Teil ist HERAUSGELÖST in eine eigene Komponente
 * `GeschossPille.tsx` — diese Datei behält NUR noch Ansicht/Modus (das
 * Label zeigt seither ausschliesslich `ANSICHT_LABEL[viewMode]`, ohne den
 * früheren «· GESCHOSS»-Suffix). Die `storeys`/`activeStoreyId`/
 * `setActiveStorey`-Props sind ersatzlos entfallen (lebten davor NUR für den
 * jetzt ausgelagerten Geschoss-Chip-Block); die `ansichts-info-geschoss-*`-
 * testids WANDERN unverändert mit nach `GeschossPille.tsx` (Vertrags-
 * Kontinuität — dieselbe Chip-Logik, neuer Wohnort, s. dortiger
 * Kopfkommentar).
 *
 * **Repo-Bezug (§1 «PD2»):** entspricht heute den `view-*`-Knöpfen
 * (`DesignWorkspace.tsx:2130-2159`, `viewMode` aus `ui-zustand.ts:46-49`) —
 * dieselben State-Werte, ein neuer, zusätzlicher Bedienweg (additiv, keine
 * Umbenennung der bestehenden `view-*`-testids).
 *
 * **Nur vier reale Ansichten** (`3d`/`split`/`quad`/`2d`, `ViewMode` in
 * `ui-zustand.ts`): das Gestaltungskonzept nennt fünf Chips («3D · Grundriss
 * · Schnitt · Ansicht · 4er»), aber «Schnitt» ist ein eigenständiges
 * ZEICHNEN-Werkzeug (`ToolId 'schnitt'`), keine `ViewMode`-Ausprägung — §8
 * trifft dazu keine Vorentscheidung; diese Komponente verdrahtet bewusst nur
 * echte, bestehende `ViewMode`-Werte (Sanktion: keine erfundenen Zustände).
 *
 * Auto-Schliessen 700ms nach Pointer-Verlassen (§1, `Component.setInfo`-
 * Analogon) — dasselbe Timer-Muster wie `IslandShell`s 900ms-Rückklapp,
 * andere Konstante.
 */

const AUTO_SCHLIESSEN_MS = 700;

const ANSICHT_LABEL: Readonly<Record<ViewMode, string>> = {
  '3d': '3D',
  split: '3D · PLAN',
  quad: '4ER',
  '2d': 'GRUNDRISS',
};

/** Reihenfolge exakt wie die bestehenden `view-*`-Knöpfe (`DesignWorkspace.tsx:2135-2141`). */
const ANSICHT_REIHENFOLGE: readonly ViewMode[] = ['3d', 'split', 'quad', '2d'];

export interface AnsichtsInfoProps {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
}

export function AnsichtsInfo({ viewMode, setViewMode }: AnsichtsInfoProps) {
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

  const label = ANSICHT_LABEL[viewMode];

  return (
    <div
      className="isl-buehnenkopf isl-buehnenkopf-ansichts-info"
      data-testid="ansichts-info-root"
      onMouseEnter={aufEnter}
      onMouseLeave={aufLeave}
    >
      <button
        type="button"
        className="isl-ansichts-info-label"
        data-testid="ansichts-info-label"
        aria-label="Ansicht wählen"
        aria-expanded={offen}
        // Bewusst NUR öffnen (kein Toggle, §1: «Klick/Hover öffnet…») — ein
        // Klick wird physisch IMMER von einem Hover eingeleitet (die Maus muss
        // über den Knopf, um ihn zu treffen), der bereits `onMouseEnter`
        // (Zeile oben) auslöst. Ein togglender Klick würde das gerade per
        // Hover geöffnete Popover sofort wieder schliessen — kein Bug im
        // Test, sondern einer, den ein Playwright-`.click()` (Maus bewegt
        // sich zuerst dorthin) UND ein echter Mausklick gleichermassen
        // ausgelöst hätten. Schliessen bleibt allein Sache des 700ms-Auto-
        // Schliessens nach Verlassen.
        onClick={() => setOffen(true)}
      >
        {label}
      </button>
      {offen ? (
        <div className="isl-buehnenkopf-popover" data-testid="ansichts-info-popover">
          <div className="isl-leiste-kopf">Ansicht</div>
          <div className="isl-buehnenkopf-chips">
            {ANSICHT_REIHENFOLGE.map((v) => (
              <button
                key={v}
                type="button"
                className="isl-buehnenkopf-chip"
                data-testid={`ansichts-info-ansicht-${v}`}
                aria-pressed={viewMode === v}
                onClick={() => setViewMode(v)}
              >
                {ANSICHT_LABEL[v]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
