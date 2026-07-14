import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DOCK_KONSTANTEN, solve, type PanelOverride } from '../../state/dock-kern';
import { stationsPanels, type DockStation } from '../../state/dock-stationen';
import { useDockZustand } from '../../state/dock-zustand';
import { DockPanel } from './DockPanel';
import { DockSplitter } from './DockSplitter';
import './dock-flaeche.css';

/**
 * DockFlaeche (v0.7.8 Welle 1 / Paket P3 — «Intelligente Werkzeugtabs»,
 * Herzstück) — die Wurzel des neuen Dock-Rendering: misst das verfügbare
 * Feld (ResizeObserver, rAF-debounced), merged persistierte Overrides
 * (`dock-zustand.ts`) mit der Sichtbarkeits-Map der aufrufenden Station,
 * ruft den reinen Solver (`dock-kern.ts`, `solve()`) memoisiert auf und
 * rendert `DockPanel`/`DockSplitter` für jedes Ergebnis-Rechteck.
 *
 * **Sichtbarkeit bleibt bei `ui-zustand.ts`** (ENTSCHEIDE 1 des Auftrags):
 * diese Komponente bekommt sie fertig aufbereitet als `panels`-Prop (eine
 * `sichtbar`-Flag je Panel-ID) — sie liest NIE selbst `useUiZustand`. Für
 * `unternehmerplan` (kein `…Offen`-Flag, Sichtbarkeit = Datenvorhandensein)
 * gilt exakt dieselbe Prop-Form, nur dass die aufrufende Station den Wert
 * aus einem Daten-Guard statt einem Boolean-Store ableitet.
 *
 * **Feld-Messung** (ENTSCHEIDE 3): `DockFlaeche` wird als Kind IN dem
 * `position:'relative'`-Container gerendert, der auch Geschossleiste/
 * EntwurfsDock/Statusleiste/KennzahlenPanel enthält (Vorbedingung, damit
 * `wurzelRef.current.parentElement` derselbe Container ist). Sie fragt genau
 * diese vier Geschwister per `data-testid` ab (bleiben selbst unangetastet,
 * s. Auftrag) und leitet daraus das Feld ab:
 *   - x-Start: rechts der linken Fix-Spalte (max. rechte Kante von
 *     Geschossleiste/EntwurfsDock) + GAP.
 *   - y-Start: oben im Container (die Werkzeugleisten liegen als Flex-
 *     Geschwister VOR diesem Container — dessen Top-Kante liegt bereits
 *     darunter, keine zweite Messung nötig) + GAP.
 *   - x-Ende: linke Kante von KennzahlenPanel (immer gemountet in der
 *     Design-Station) − GAP — die «einfachste ehrliche Lösung» aus dem
 *     Auftrag (Inspector bleibt Welle 2, wird hier bewusst NICHT reserviert).
 *   - y-Ende: obere Kante der Statusleiste.
 */

export interface DockPanelEintrag {
  /** PanelId aus `ui-zustand.ts` (Ausnahme `'unternehmerplan'`, s. `dock-stationen.ts`). */
  id: string;
  sichtbar: boolean;
  /** Fehlt bei datengetriebenen Panels ohne eigenes Boolean (`unternehmerplan`). */
  schliessen?: () => void;
  inhalt: ReactNode;
}

export interface DockFlaecheProps {
  station: DockStation;
  panels: readonly DockPanelEintrag[];
}

interface FeldRechteck {
  x: number;
  y: number;
  w: number;
  h: number;
}

const LEER_FELD: FeldRechteck = { x: 0, y: 0, w: 0, h: 0 };
const LEERE_OVERRIDES: Record<string, PanelOverride> = {};

export function DockFlaeche({ station, panels }: DockFlaecheProps) {
  const defs = useMemo(() => stationsPanels(station), [station]);

  const wurzelRef = useRef<HTMLDivElement>(null);
  const [feld, setFeld] = useState<FeldRechteck>(LEER_FELD);

  // ---------------------------------------------------------------------
  // Feld-Messung — ResizeObserver auf Container + den vier festen
  // Geschwistern, rAF-debounced (ein ausstehender Messlauf je Frame reicht,
  // mehrere ResizeObserver-Callbacks im selben Frame kollabieren zu einem).
  // ---------------------------------------------------------------------
  useLayoutEffect(() => {
    const wurzel = wurzelRef.current;
    const container = wurzel?.parentElement;
    if (!container) return;

    const geschossleiste = container.querySelector('[data-testid="geschossleiste"]');
    const entwurfsDock = container.querySelector('[data-testid="entwurf-dock"]');
    const kennzahlen = container.querySelector('[data-testid="kennzahlen"]');
    const statusleiste = container.querySelector('[data-testid="statusleiste"]');
    const linksElemente = [geschossleiste, entwurfsDock].filter((el): el is Element => el !== null);

    let rafHandle = 0;
    const jetztMessen = () => {
      rafHandle = 0;
      const c = container.getBoundingClientRect();
      if (c.width === 0 || c.height === 0) return;

      let xStart = 0;
      for (const el of linksElemente) {
        xStart = Math.max(xStart, el.getBoundingClientRect().right - c.left);
      }
      xStart += DOCK_KONSTANTEN.GAP;

      let xEnde = c.width;
      if (kennzahlen) xEnde = Math.min(xEnde, kennzahlen.getBoundingClientRect().left - c.left);
      xEnde -= DOCK_KONSTANTEN.GAP;

      let yEnde = c.height;
      if (statusleiste) yEnde = Math.min(yEnde, statusleiste.getBoundingClientRect().top - c.top);

      const naechstes: FeldRechteck = {
        x: xStart,
        y: DOCK_KONSTANTEN.GAP,
        w: Math.max(0, xEnde - xStart),
        h: Math.max(0, yEnde - DOCK_KONSTANTEN.GAP * 2),
      };
      setFeld((vorher) =>
        vorher.x === naechstes.x && vorher.y === naechstes.y && vorher.w === naechstes.w && vorher.h === naechstes.h
          ? vorher
          : naechstes,
      );
    };
    const messenDebounced = () => {
      if (rafHandle) return;
      rafHandle = requestAnimationFrame(jetztMessen);
    };

    const ro = new ResizeObserver(messenDebounced);
    ro.observe(container);
    for (const el of linksElemente) ro.observe(el);
    if (kennzahlen) ro.observe(kennzahlen);
    if (statusleiste) ro.observe(statusleiste);
    window.addEventListener('resize', messenDebounced);
    jetztMessen();

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', messenDebounced);
      if (rafHandle) cancelAnimationFrame(rafHandle);
    };
  }, []);

  // ---------------------------------------------------------------------
  // Persistiertes Layout (dock-zustand.ts) — primitive/stabile Referenzen
  // als Solver-Eingabe, damit Tippen in einem Panel-Input (ändert NUR
  // lokalen React-State der Station, nie den Dock-Store) kein `solve()`
  // auslöst.
  // ---------------------------------------------------------------------
  const dockModus = useDockZustand((s) => s.modus);
  const dockLayouts = useDockZustand((s) => s.layouts);
  const layoutKey = `${dockModus}:${station}`;
  const gespeichertesLayout = dockLayouts[layoutKey];
  const leftW = gespeichertesLayout?.leftW ?? DOCK_KONSTANTEN.DEF_LEFT;
  const rightW = gespeichertesLayout?.rightW ?? DOCK_KONSTANTEN.DEF_RIGHT;
  const gespeichertePanels = gespeichertesLayout?.panels ?? LEERE_OVERRIDES;

  // Sichtbarkeits-Schlüssel als PRIMITIVER String (nicht die `panels`-Array-
  // Referenz, die bei jedem Render neu entsteht) — genau der Vergleichswert,
  // den `useMemo` unten braucht, um bei reinem Re-Render (z.B. Tastatur-
  // Eingabe in einem Panel) NICHT neu zu lösen.
  const sichtKey = panels.map((p) => `${p.id}:${p.sichtbar ? '1' : '0'}`).join(',');

  // HINWEIS (bewusst KEIN `opts.zuletztGeoeffnet`-Tracking): der Solver
  // kennt einen `schutz`-Parameter, der EIN Panel vor automatischem
  // Einklappen bewahrt. Naheliegend wäre, ihn an "zuletzt vom Menschen
  // geöffnet" zu binden — das widerspricht aber genau dem im Auftrag
  // geforderten (und in `dock-interaktion.spec.ts` geprüften) Verhalten:
  // «Pin schützt Grösse, wenn ein zweites Panel aufgeht (das ANDERE klappt
  // ein)» — das "andere" ist dort GENAU das gerade neu geöffnete, nicht
  // gepinnte Panel; ein Auto-Schutz für "zuletzt geöffnet" würde das
  // verhindern. Schutz läuft in Welle 1 daher ausschliesslich über
  // `angeheftet` (Pin, `PanelOverride.angeheftet` — bereits Teil jedes
  // Panels über `fx = exp.filter(x=>!x.angeheftet)` in `dock-kern.ts`s
  // `stack()`). Die «zuletzt geöffnet»-Auto-Reaktion bleibt, wie
  // `dock-zustand.ts`s Kopfkommentar zu `eingeklappteDiff()` selbst sagt,
  // Grundlage eines SPÄTEREN Auto-Reaktions-Chips — nicht dieses Pakets.
  const overrides = useMemo(() => {
    const sichtbarById = new Map(panels.map((p) => [p.id, p.sichtbar]));
    const ergebnis: Record<string, PanelOverride> = {};
    for (const def of defs) {
      const gespeichert = gespeichertePanels[def.id] ?? {};
      const sichtbar = sichtbarById.get(def.id) ?? false;
      ergebnis[def.id] = { ...gespeichert, geschlossen: !sichtbar };
    }
    return ergebnis;
    // `sichtKey` steht bewusst statt `panels` in den Deps (s. Kommentar oben).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defs, gespeichertePanels, sichtKey]);

  const ergebnis = useMemo(
    () => solve(defs, { feld, modus: dockModus, leftW, rightW, overrides }),
    [defs, feld, dockModus, leftW, rightW, overrides],
  );

  if (feld.w <= 0 || feld.h <= 0) {
    // Erster Messlauf noch nicht gelaufen (Layout-Effekt läuft nach dem
    // ersten Paint) — nichts rendern statt kollabierter Rechtecke zu zeigen.
    return <div ref={wurzelRef} className="k-dock-flaeche" data-testid="dock-flaeche" />;
  }

  return (
    <div ref={wurzelRef} className="k-dock-flaeche" data-testid="dock-flaeche">
      {panels.map((p) => {
        const rect = ergebnis.rects[p.id];
        if (!rect) return null; // geschlossen — kein Platz im Feld reserviert
        const def = defs.find((d) => d.id === p.id);
        if (!def) return null;
        return (
          <DockPanel
            key={p.id}
            station={station}
            def={def}
            rect={rect}
            angeheftet={!!gespeichertePanels[p.id]?.angeheftet}
            {...(p.schliessen ? { onSchliessen: p.schliessen } : {})}
          >
            {p.inhalt}
          </DockPanel>
        );
      })}
      {ergebnis.splitters.map((s) => (
        <DockSplitter
          key={s.id}
          station={station}
          splitter={s}
          leftW={leftW}
          rightW={rightW}
          {...(s.a && ergebnis.rects[s.a] ? { rectA: ergebnis.rects[s.a] } : {})}
          {...(s.b && ergebnis.rects[s.b] ? { rectB: ergebnis.rects[s.b] } : {})}
        />
      ))}
    </div>
  );
}
