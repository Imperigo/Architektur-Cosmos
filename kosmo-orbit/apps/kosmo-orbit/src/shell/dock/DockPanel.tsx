import type { ReactNode } from 'react';
import { KIcon } from '@kosmo/ui';
import { DOCK_KONSTANTEN, type DockRect, type PanelDef } from '../../state/dock-kern';
import type { DockStation } from '../../state/dock-stationen';
import { useDockZustand } from '../../state/dock-zustand';

/**
 * DockPanel (v0.7.8 Welle 1 / Paket P3 — «Intelligente Werkzeugtabs»,
 * Herzstück) — der Chrome-Rahmen EINES angedockten Panels: absolut
 * positionierter Container (Rechteck aus `dock-kern.ts`s `solve()`,
 * `.28s`-Reflow-Übergang aus `dock-flaeche.css`), ein schmaler Mono-Kopf
 * (Titel/Rollenpunkt/Einklappen/Anheften/Schliessen) und ein intern
 * scrollender Inhaltsbereich für die unverändert migrierten Panel-Inhalte.
 *
 * Doppel-Chrome ist HIER bewusst in Kauf genommen (Auftrag, Abschnitt 2):
 * fast jedes migrierte Panel trägt selbst schon eine Badge-/Schliessen-Zeile,
 * deren `aria-label="Schliessen"` bestehende Specs direkt anklicken
 * (`'[data-testid="raster-panel"] [aria-label="Schliessen"]'` u.ä.) — die
 * darf NICHT verschwinden. Dieser Kopf hier ist additiv, kein Ersatz.
 */

export interface DockPanelProps {
  station: DockStation;
  def: PanelDef;
  rect: DockRect;
  /** Persistierte «Anheften»-Fahne (dock-zustand.ts, PanelOverride.angeheftet). */
  angeheftet: boolean;
  /** Fehlt bei datengetriebenen Panels ohne eigenes Auf/Zu-Flag
   *  (`unternehmerplan` — Sichtbarkeit = Datenvorhandensein, s.
   *  `dock-stationen.ts` Kopfkommentar). Ohne Callback bleibt der
   *  Schliessen-Knopf im Dock-Kopf weg, auch wenn `def.schliessbar` true ist —
   *  das Panel lässt sich trotzdem einklappen (Chevron) oder anheften. */
  onSchliessen?: () => void;
  children: ReactNode;
}

const ROLLEN_LABEL: Record<PanelDef['rolle'], string> = {
  manuell: 'Manuell',
  pn: 'Planer-Assistent',
  pna: 'Planer-Assistent (autonom)',
  agent: 'Agent',
  memory: 'Gedächtnis',
  generator: 'Generator',
  ak: 'Aussenkontakt',
  system: 'Büro',
};

export function DockPanel({ station, def, rect, angeheftet, onSchliessen, children }: DockPanelProps) {
  const panelOverrideSetzen = useDockZustand((s) => s.panelOverrideSetzen);

  const einklappenUmschalten = () => panelOverrideSetzen(station, def.id, { eingeklappt: !rect.eingeklappt });
  const anheftenUmschalten = () => panelOverrideSetzen(station, def.id, { angeheftet: !angeheftet });

  const style = {
    left: rect.x,
    top: rect.y,
    width: rect.w,
    height: rect.h,
    zIndex: rect.schwebend ? 30 : 14,
  };

  if (rect.eingeklappt) {
    return (
      <div className="k-dock-panel" style={style} data-testid={`dock-panel-${def.id}`}>
        <button
          type="button"
          className="k-dock-panel-tab"
          data-testid={`dock-panel-${def.id}-tab`}
          title={`${def.titel} — wieder öffnen`}
          aria-label={`${def.titel} — wieder öffnen`}
          onClick={einklappenUmschalten}
        >
          <span
            className="k-dock-panel-rollenpunkt"
            aria-hidden
            style={{ background: `var(--k-rolle-${def.rolle})` }}
          />
          <span className="k-dock-panel-titel">{def.titel}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="k-dock-panel" style={style} data-testid={`dock-panel-${def.id}`}>
      <div className="k-dock-panel-kopf">
        <span
          className="k-dock-panel-rollenpunkt"
          aria-hidden
          title={ROLLEN_LABEL[def.rolle]}
          style={{ background: `var(--k-rolle-${def.rolle})` }}
        />
        <span className="k-dock-panel-titel" title={def.titel}>
          {def.titel}
        </span>
        <button
          type="button"
          className="k-dock-panel-knopf"
          data-testid={`dock-panel-${def.id}-pin`}
          data-aktiv={angeheftet}
          title={angeheftet ? 'Anheften aufheben — Grösse wieder frei' : 'Anheften — Grösse vor automatischem Einklappen schützen'}
          aria-label={angeheftet ? 'Anheften aufheben' : 'Anheften'}
          aria-pressed={angeheftet}
          onClick={anheftenUmschalten}
        >
          <KIcon name="schloss" size={14} />
        </button>
        <button
          type="button"
          className="k-dock-panel-knopf k-dock-panel-chevron"
          data-testid={`dock-panel-${def.id}-einklappen`}
          title="Einklappen"
          aria-label="Einklappen"
          onClick={einklappenUmschalten}
        >
          <KIcon name="pfeil-unten" size={14} />
        </button>
        {def.schliessbar && onSchliessen && (
          <button
            type="button"
            className="k-dock-panel-knopf"
            data-testid={`dock-panel-${def.id}-schliessen`}
            title="Schliessen"
            aria-label="Schliessen"
            onClick={onSchliessen}
          >
            <KIcon name="schliessen" size={14} />
          </button>
        )}
      </div>
      <div className="k-dock-panel-inhalt">{children}</div>
    </div>
  );
}

/** Re-Export für Aufrufer, die nur die Konstante brauchen (Tab-Höhe u.ä.),
 *  ohne `dock-kern.ts` selbst zu importieren — vermeidet einen zweiten
 *  Import-Pfad für dieselbe Zahl in `DockFlaeche.tsx`. */
export const DOCK_TAB_HOEHE = DOCK_KONSTANTEN.COLLH;
