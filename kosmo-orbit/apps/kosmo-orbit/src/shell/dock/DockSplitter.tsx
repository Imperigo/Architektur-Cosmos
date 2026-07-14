import { useRef, useState } from 'react';
import { DOCK_KONSTANTEN, type DockRect, type DockSplitterZone } from '../../state/dock-kern';
import type { DockStation } from '../../state/dock-stationen';
import { useDockZustand } from '../../state/dock-zustand';

/**
 * DockSplitter (v0.7.8 Welle 1 / Paket P3 — Herzstück) — die 14px-Griffzonen
 * aus `dock-kern.ts`s `solve().splitters`. Zwei Sorten:
 *  - `col-left`/`col-right`: verschieben die persistierte Spaltenbreite
 *    (`leftWSetzen`/`rightWSetzen`, `dock-zustand.ts` klemmt selbst auf
 *    MIN/MAX — hier keine doppelte Klemmung nötig).
 *  - `row`: verschiebt die Höhen zweier benachbarter Panels EINER Spalte
 *    atomar (`panelOverridesSetzen`, ein Schreibvorgang statt zwei), min
 *    90px je Nachbar (Auftrag, keine Kopplung an `PanelDef.min` — bewusst
 *    ein fester Bodenwert für die Ziehgeste selbst).
 *
 * PointerEvents + `setPointerCapture` decken Maus UND Touch identisch ab;
 * `touch-action:none` sitzt NUR auf dem Griff selbst (`dock-flaeche.css`,
 * `.k-dock-splitter`), nicht auf der ganzen Fläche.
 */

export interface DockSplitterProps {
  station: DockStation;
  splitter: DockSplitterZone;
  leftW: number;
  rightW: number;
  /** Nur für `art:'row'` gebraucht — die beiden Nachbar-Rechtecke, wie
   *  `solve()` sie gerade berechnet hat (liefert die Start-Höhen der
   *  Ziehgeste). */
  rectA?: DockRect;
  rectB?: DockRect;
}

const ROW_MIN = 90;

export function DockSplitter({ station, splitter, leftW, rightW, rectA, rectB }: DockSplitterProps) {
  const leftWSetzen = useDockZustand((s) => s.leftWSetzen);
  const rightWSetzen = useDockZustand((s) => s.rightWSetzen);
  const panelOverridesSetzen = useDockZustand((s) => s.panelOverridesSetzen);
  const [aktiv, setAktiv] = useState(false);
  const start = useRef<{ x: number; y: number; leftW: number; rightW: number; hA: number; hB: number } | null>(null);

  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetische PointerEvents (z.B. Playwright-Touch-Simulation über
      // `dispatchEvent`) tragen mitunter eine `pointerId`, die der Browser
      // nicht als "aktiven" Zeiger kennt — `setPointerCapture` wirft dann,
      // obwohl der Rest der Ziehgeste (die eigentliche Logik unten) davon
      // unberührt funktioniert. Ohne Capture verliert man nur den Vorteil,
      // dass `pointermove` auch ausserhalb des Griffs ankommt.
    }
    start.current = {
      x: e.clientX,
      y: e.clientY,
      leftW,
      rightW,
      hA: rectA?.h ?? ROW_MIN,
      hB: rectB?.h ?? ROW_MIN,
    };
    setAktiv(true);
  };

  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    if (splitter.art === 'col-left') {
      leftWSetzen(station, s.leftW + (e.clientX - s.x));
    } else if (splitter.art === 'col-right') {
      rightWSetzen(station, s.rightW - (e.clientX - s.x));
    } else if (splitter.art === 'row' && splitter.a && splitter.b) {
      const dy = e.clientY - s.y;
      const gesamt = s.hA + s.hB;
      const neuA = Math.min(gesamt - ROW_MIN, Math.max(ROW_MIN, s.hA + dy));
      const neuB = gesamt - neuA;
      panelOverridesSetzen(station, {
        [splitter.a]: { groesse: Math.round(neuA) },
        [splitter.b]: { groesse: Math.round(neuB) },
      });
    }
  };

  const pointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    start.current = null;
    setAktiv(false);
  };

  return (
    <div
      className="k-dock-splitter"
      data-testid={`dock-splitter-${splitter.id}`}
      data-art={splitter.art}
      data-aktiv={aktiv}
      style={{ left: splitter.x, top: splitter.y, width: splitter.w, height: splitter.h }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    />
  );
}

/** Re-Export, damit `DockFlaeche.tsx` die GAP-Konstante nicht zusätzlich aus
 *  `dock-kern.ts` importieren muss, wenn sie nur den Splitter-Abstand braucht. */
export const DOCK_SPLITTER_GAP = DOCK_KONSTANTEN.GAP;
