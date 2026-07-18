import { useEffect, useRef, useState } from 'react';
import type { Sheet } from '@kosmo/kernel';
import { BlattCanvas } from '../BlattCanvas';
import { usePublishRuntime } from '../publish-runtime';
import './publish-island.css';

/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3, C-19/D10) — Blatt-Zoom für den
 * Publish-Island-Modus, Muster `NodeCanvas.tsx:520-576` (`{cx,cy,scale}`,
 * `zoomUm`/`zoomFit`, Wheel-Handler mit Klemme) — hier `{scale, tx, ty}`
 * statt `{cx,cy,scale}`, weil die Blattfläche (`BlattCanvas`) ein
 * HTML/CSS-Prozent-Koordinatensystem ist (Overlays in `%` von `paper.width/
 * height`, `plankopf-overlay.ts`), kein SVG-`viewBox` — ein CSS-`transform:
 * translate(...) scale(...)` auf dem GANZEN `BlattCanvas`-Wrapper skaliert
 * seine Kind-Elemente (inkl. der Prozent-Overlays) proportional mit, ohne
 * dass eine einzige Prozent-Rechnung in `BlattCanvas.tsx` angefasst werden
 * muss — die Massstab-Semantik der platzierten Ansichten
 * (`publish.ansichtPlatzieren`s `scale`-Feld) bleibt darum unberührt (Auftrag
 * Punkt 2: «NICHT anfassen»), das ist ein reiner VIEWPORT-Zoom.
 *
 * Fernauslöser: `publish-runtime.ts`s `canvasBefehl`/`sendeCanvasBefehl` —
 * DARSTELLUNG-Insel («Zoom», `inhalte/darstellung.tsx`) sendet
 * `zoom-in`/`zoom-out`/`zoom-fit`, die eigentliche Rechnung bleibt HIER
 * (braucht keine gemessene Canvas-Grösse wie NodeCanvas — Papier-Format ist
 * bereits bekannt, «Fit» ist darum schlicht der Identitäts-Zustand).
 */

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;

function klemme(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

interface BlattView {
  scale: number;
  tx: number;
  ty: number;
}

const FIT_VIEW: BlattView = { scale: 1, tx: 0, ty: 0 };

export interface BlattZoomBuehneProps {
  sheet: Sheet;
  paper: { width: number; height: number };
  svgMarkup: string;
}

export function BlattZoomBuehne({ sheet, paper, svgMarkup }: BlattZoomBuehneProps) {
  const [view, setView] = useState<BlattView>(FIT_VIEW);
  const [selectedBild, setSelectedBild] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [textDrag, setTextDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [bildDrag, setBildDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const selectedPlacement = usePublishRuntime((s) => s.selectedPlacementId);
  const setSelectedPlacement = usePublishRuntime((s) => s.setSelectedPlacementId);
  const canvasBefehl = usePublishRuntime((s) => s.canvasBefehl);
  const buehneRef = useRef<HTMLDivElement>(null);
  const panning = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  // Wheel-Zoom (Muster NodeCanvas.tsx:534-544) — `{ passive: false }` +
  // manueller Listener statt `onWheel`-Prop, aus demselben Grund wie dort:
  // React würde den Handler sonst passiv binden, `preventDefault()` griffe
  // nicht, die Seite würde beim Zoomen mitscrollen.
  useEffect(() => {
    const el = buehneRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0012);
      setView((v) => ({ ...v, scale: klemme(v.scale * factor, ZOOM_MIN, ZOOM_MAX) }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Fernauslöser aus der DARSTELLUNG-Insel (Muster NodeCanvas.tsx:704-737).
  useEffect(() => {
    if (!canvasBefehl) return;
    switch (canvasBefehl.typ) {
      case 'zoom-in':
        setView((v) => ({ ...v, scale: klemme(v.scale * 1.25, ZOOM_MIN, ZOOM_MAX) }));
        return;
      case 'zoom-out':
        setView((v) => ({ ...v, scale: klemme(v.scale / 1.25, ZOOM_MIN, ZOOM_MAX) }));
        return;
      case 'zoom-fit':
        setView(FIT_VIEW);
        return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasBefehl]);

  // Aktives Blatt gewechselt (BLATT-Insel) — Sicht zurücksetzen, wie
  // NodeCanvas.tsx den Mount-Auto-Fit je `graphId` fährt (Zeile 578-586).
  useEffect(() => {
    setView(FIT_VIEW);
  }, [sheet.id]);

  return (
    <div
      ref={buehneRef}
      className="pubisl-buehne"
      data-testid="publish-island-buehne"
      onPointerDown={(e) => {
        if (e.target !== buehneRef.current) return;
        panning.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!panning.current) return;
        const dx = e.clientX - panning.current.x;
        const dy = e.clientY - panning.current.y;
        setView((v) => ({ ...v, tx: panning.current!.tx + dx, ty: panning.current!.ty + dy }));
      }}
      onPointerUp={() => {
        panning.current = null;
      }}
    >
      <div
        className="pubisl-transform"
        data-testid="publish-island-transform"
        data-scale={view.scale.toFixed(4)}
        style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})` }}
      >
        <BlattCanvas
          sheet={sheet}
          paper={paper}
          svgMarkup={svgMarkup}
          selectedPlacement={selectedPlacement}
          setSelectedPlacement={setSelectedPlacement}
          selectedBild={selectedBild}
          setSelectedBild={setSelectedBild}
          drag={drag}
          setDrag={setDrag}
          textDrag={textDrag}
          setTextDrag={setTextDrag}
          bildDrag={bildDrag}
          setBildDrag={setBildDrag}
          zonenVorschau={false}
          aussenbemassungVorschau={false}
          plankopfAktiv={false}
          onPlankopfKlick={() => {}}
          style={{ width: 'min(70vw, 900px)', aspectRatio: `${paper.width} / ${paper.height}` }}
        />
      </div>
    </div>
  );
}
