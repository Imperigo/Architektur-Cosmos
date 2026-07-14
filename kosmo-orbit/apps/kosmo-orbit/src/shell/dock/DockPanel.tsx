import type { ReactNode } from 'react';
import { KIcon } from '@kosmo/ui';
import { DOCK_KONSTANTEN, type DockModus, type DockRect, type PanelDef } from '../../state/dock-kern';
import type { DockStation } from '../../state/dock-stationen';
import { useDockZustand } from '../../state/dock-zustand';
import { useDockOrbRuntime } from '../../state/dock-orb-runtime';

/**
 * DockPanel (v0.7.8 Welle 1 / Paket P3 — «Intelligente Werkzeugtabs»,
 * Herzstück; erweitert Welle 2 / Paket P4 — Header-Drag & Pop-out) — der
 * Chrome-Rahmen EINES angedockten (oder schwebenden) Panels: absolut
 * positionierter Container (Rechteck aus `dock-kern.ts`s `solve()`,
 * `.28s`-Reflow-Übergang aus `dock-flaeche.css`), ein schmaler Mono-Kopf
 * (Titel/Rollenpunkt/Einklappen/Anheften/Pop-out/Re-Dock/Schliessen) und ein
 * intern scrollender Inhaltsbereich für die unverändert migrierten
 * Panel-Inhalte.
 *
 * Doppel-Chrome ist HIER bewusst in Kauf genommen (Auftrag, Abschnitt 2):
 * fast jedes migrierte Panel trägt selbst schon eine Badge-/Schliessen-Zeile,
 * deren `aria-label="Schliessen"` bestehende Specs direkt anklicken
 * (`'[data-testid="raster-panel"] [aria-label="Schliessen"]'` u.ä.) — die
 * darf NICHT verschwinden. Dieser Kopf hier ist additiv, kein Ersatz.
 *
 * **Header-Drag (P4)**: der Kopf (`.k-dock-panel-kopf`, `data-drag`) ist ein
 * Ziehgriff — Pointerdown darauf startet (falls `def.bewegbar`, Ziel kein
 * `<button>`) je nach aktuellem Zustand `onRedockDragStart` (angedockt →
 * Redock-Drag mit Snap-Zonen, `DockFlaeche.tsx`) oder `onFloatDragStart`
 * (schon schwebend → freies Verschieben). Der Kopf selbst trägt NUR den
 * `pointerdown`; `pointermove`/`pointerup` laufen komplett in `DockFlaeche.tsx`
 * über `window`-Listener (nicht hier — beim Redock-Drag verschwindet DIESES
 * Panel während der Ziehgeste aus `ergebnis.rects` (`gedraggtId`), ein
 * `pointermove`-Handler auf einem Element, das gerade unmountet, wäre
 * unzuverlässig).
 */

export interface DockPanelProps {
  station: DockStation;
  def: PanelDef;
  rect: DockRect;
  modus: DockModus;
  /** Persistierte «Anheften»-Fahne (dock-zustand.ts, PanelOverride.angeheftet). */
  angeheftet: boolean;
  /** Startet einen Redock-Drag (angedocktes Panel → Snap-Zonen). */
  onRedockDragStart: (id: string, rect: DockRect, clientX: number, clientY: number) => void;
  /** Startet ein freies Verschieben (schon schwebendes Panel). */
  onFloatDragStart: (id: string, rect: DockRect, clientX: number, clientY: number, anker: PanelDef['anker']) => void;
  /** Pop-out-Knopf (nur Konzept A, nur angedockt): sofortiges Umschalten auf schwebend. */
  onPopOut: (id: string, rect: DockRect) => void;
  /** Re-Dock-Knopf (nur schwebend): löscht ALLE Float-Overrides, zurück in die Ursprungsspalte. */
  onRedock: (id: string) => void;
  /** Fehlt bei datengetriebenen Panels ohne eigenes Auf/Zu-Flag
   *  (`unternehmerplan`/`kennzahlen`/`inspector` — Sichtbarkeit =
   *  Datenvorhandensein, s. `dock-stationen.ts` Kopfkommentar). Ohne
   *  Callback bleibt der Schliessen-Knopf im Dock-Kopf weg, auch wenn
   *  `def.schliessbar` true ist — das Panel lässt sich trotzdem einklappen
   *  (Chevron) oder anheften. */
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

export function DockPanel({
  station,
  def,
  rect,
  modus,
  angeheftet,
  onRedockDragStart,
  onFloatDragStart,
  onPopOut,
  onRedock,
  onSchliessen,
  children,
}: DockPanelProps) {
  const panelOverrideSetzen = useDockZustand((s) => s.panelOverrideSetzen);

  // v0.7.8 Welle 3 (P7, «Kosmo ordnet») — die «KOSMO»-Kopf-Badge: sichtbar
  // NUR solange `useDockOrbRuntime`s Steuerungs-Anzeige läuft UND genau
  // DIESES Panel das zuletzt von Kosmo bediente ist (`badgePanelId`,
  // `dock-befehle.ts`s `meldeAktion()`). Additive Test-ID, kein Ersatz für
  // den goldenen Orb (`KosmoOrdnetOrb.tsx`) — Orb UND Badge zusammen zeigen,
  // WOHIN Kosmo gerade greift.
  const kosmoBadgeSichtbar = useDockOrbRuntime((s) => s.laeuft && s.badgePanelId === def.id);

  const einklappenUmschalten = () => panelOverrideSetzen(station, def.id, { eingeklappt: !rect.eingeklappt });
  const anheftenUmschalten = () => panelOverrideSetzen(station, def.id, { angeheftet: !angeheftet });

  const kopfPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!def.bewegbar) return;
    // WICHTIG: `instanceof HTMLElement` wäre hier ein Bug — die Kopf-Knöpfe
    // rendern `KIcon`s `<svg>`/`<path>` (SVGElement, KEIN HTMLElement-
    // Subtyp trotz gemeinsamer `Element`-Basis). Klickt man (wie Playwright
    // per Bounding-Box-Mitte) genau aufs Icon-Glyph statt den umgebenden
    // `<button>`-Rand, wäre `e.target instanceof HTMLElement` false und
    // dieser Guard würde NIE greifen — ein Knopfklick löste dann fälschlich
    // einen Drag aus (reproduzierbar: Chevron/Pin/Tab-Tests scheiterten
    // genau daran). `.closest()` existiert auf `Element` selbst, HTML- wie
    // SVG-Knoten gleichermassen.
    if (e.target instanceof Element && e.target.closest('button')) return;
    // Nur der Primärzeiger/-finger startet einen Drag (kein Rechtsklick).
    if (e.button !== 0) return;
    e.preventDefault();
    if (rect.schwebend) {
      onFloatDragStart(def.id, rect, e.clientX, e.clientY, def.anker);
    } else {
      onRedockDragStart(def.id, rect, e.clientX, e.clientY);
    }
  };

  const style = {
    left: rect.x,
    top: rect.y,
    width: rect.w,
    height: rect.h,
    zIndex: rect.schwebend ? 30 : 14,
  };

  // v0.7.8 Welle 2 / Paket P5 («HUDs als echte Dock-Floats»): eine schlanke
  // Chrome-Variante für Panels, die als kompakte Glass-Karte OHNE Dock-Kopf
  // wirken sollen (Viewport-Modus-Leiste/-Karte/-Werkzeug-Rail/
  // -Orientierungskreuz, s. `dock-stationen.ts` `floatChrome:'schlank'`) —
  // KEIN Titel/Pin/Chevron/Re-Dock/Schliessen, nur ein dünner Griffstreifen
  // oben zum Ziehen (derselbe `onFloatDragStart`/`onRedockDragStart`-
  // Umschalter wie beim vollen Kopf, s. `kopfPointerDown` oben — floatende
  // HUDs nehmen dabei IMMER den Float-Zweig, da `def.dock==='float'` schon
  // in der Registry steht, nie erst durch einen Redock-Drag entsteht). Der
  // Inhalt selbst bringt bereits sein eigenes `.k-glass`-Aussehen mit (aus
  // `ViewportChromeHuds.tsx`) — der äussere Rahmen bleibt darum bewusst
  // unsichtbar (kein zweites, doppeltes Glass), s. `.k-dock-panel--schlank`
  // in `dock-flaeche.css`. Ein eingeklapptes `schlank`-Panel gibt es nicht
  // (`placeFloats()` in `dock-kern.ts` setzt `eingeklappt` für Floats immer
  // fix auf `false` — der Solver kennt für Floats gar kein Einklappen), der
  // `rect.eingeklappt`-Zweig unten wird für sie darum nie erreicht.
  if (def.floatChrome === 'schlank') {
    return (
      <div className="k-dock-panel k-dock-panel--schlank" style={style} data-testid={`dock-panel-${def.id}`} data-schwebend={!!rect.schwebend}>
        <div
          className="k-dock-panel-griff"
          data-drag
          title={def.titel}
          aria-hidden="true"
          onPointerDown={kopfPointerDown}
        />
        <div className="k-dock-panel-inhalt-schlank">{children}</div>
      </div>
    );
  }

  // v0.7.8 Abnahme-Fix (D3, Matrix-Muss) — der goldene Ring gilt für BEIDE
  // Zustände (voller Kopf UND eingeklappter Tab), dasselbe Gate wie das
  // KOSMO-Badge (`kosmoBadgeSichtbar`, s.o.).
  const panelKlasse = `k-dock-panel${kosmoBadgeSichtbar ? ' k-dock-panel--kosmo-ring' : ''}`;

  if (rect.eingeklappt) {
    return (
      <div className={panelKlasse} style={style} data-testid={`dock-panel-${def.id}`} data-schwebend={!!rect.schwebend}>
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
          {angeheftet && (
            <span className="k-dock-panel-pin-badge" data-testid={`dock-panel-${def.id}-pin-badge`} aria-hidden="true">
              •
            </span>
          )}
          {kosmoBadgeSichtbar && (
            <span className="k-dock-kosmo-badge" data-testid={`dock-panel-${def.id}-kosmo-badge`} aria-hidden="true">
              KOSMO
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={panelKlasse} style={style} data-testid={`dock-panel-${def.id}`} data-schwebend={!!rect.schwebend}>
      <div className="k-dock-panel-kopf" data-drag onPointerDown={kopfPointerDown}>
        <span
          className="k-dock-panel-rollenpunkt"
          aria-hidden
          title={ROLLEN_LABEL[def.rolle]}
          style={{ background: `var(--k-rolle-${def.rolle})` }}
        />
        <span className="k-dock-panel-titel" title={def.titel}>
          {def.titel}
        </span>
        {angeheftet && (
          <span className="k-dock-panel-pin-badge" data-testid={`dock-panel-${def.id}-pin-badge`} aria-hidden="true">
            •
          </span>
        )}
        {kosmoBadgeSichtbar && (
          <span className="k-dock-kosmo-badge" data-testid={`dock-panel-${def.id}-kosmo-badge`} aria-hidden="true">
            KOSMO
          </span>
        )}
        {modus === 'A' && def.bewegbar && !rect.schwebend && (
          <button
            type="button"
            className="k-dock-panel-knopf"
            data-testid={`dock-panel-${def.id}-popout`}
            title="Aus dem Dock heben — schwebt frei"
            aria-label="Aus dem Dock heben"
            onClick={() => onPopOut(def.id, rect)}
          >
            <KIcon name="schweben" size={14} />
          </button>
        )}
        {rect.schwebend && (
          <button
            type="button"
            className="k-dock-panel-knopf"
            data-testid={`dock-panel-${def.id}-redock`}
            title="Zurück andocken"
            aria-label="Zurück andocken"
            onClick={() => onRedock(def.id)}
          >
            <KIcon name="andocken" size={14} />
          </button>
        )}
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
