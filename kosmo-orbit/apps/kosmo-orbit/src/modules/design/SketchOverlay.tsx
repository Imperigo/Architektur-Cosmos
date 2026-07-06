import { useRef, useState } from 'react';
import { getStroke } from 'perfect-freehand';
import { Badge, KButton, moduleHue } from '@kosmo/ui';
import type { Pt } from '@kosmo/kernel';
import { fitStrokes, type FittedSegment, type Stroke } from './sketch';

/**
 * KosmoSketch-Overlay — liegt über dem Plan: Freihand zeichnen (Apple Pencil:
 * Druckstufen via PointerEvents). T5 (Owner-Laptoptest): mehrere Striche
 * hintereinander frei zeichnen, OHNE dass jeder einzelne sofort «korrigiert»
 * wird — erst «Übergeben» fittet ALLE gesammelten Striche gemeinsam zu einem
 * Vorschlag, «Übernehmen» committet sie als EINEN Aufruf (eine Undo-Gruppe).
 */

export interface SketchOverlayProps {
  /** Pixel ↔ Welt-mm Umrechnung der darunterliegenden Planansicht. */
  toWorld: (clientX: number, clientY: number) => Pt;
  toScreen: (p: Pt) => { x: number; y: number };
  onAccept: (segments: FittedSegment[]) => void;
}

type LivePt = { x: number; y: number; pressure: number };

// T5: dünner Stift — fein wie ein Fineliner statt ein dicker Marker.
const STIFT_ROH = { size: 2.5, thinning: 0.5, smoothing: 0.6, streamline: 0.4, simulatePressure: false };

function strichPfad(pts: LivePt[], toScreen: (p: Pt) => { x: number; y: number }): string {
  const outline = getStroke(
    pts.map((p) => {
      const s = toScreen({ x: p.x, y: p.y });
      return [s.x, s.y, p.pressure];
    }),
    STIFT_ROH,
  );
  return outline.length > 1
    ? `M ${outline.map(([x, y]) => `${x!.toFixed(1)} ${y!.toFixed(1)}`).join(' L ')} Z`
    : '';
}

export function SketchOverlay({ toWorld, toScreen, onAccept }: SketchOverlayProps) {
  const [live, setLive] = useState<LivePt[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [pending, setPending] = useState<FittedSegment[] | null>(null);
  const drawing = useRef(false);

  const finish = () => {
    drawing.current = false;
    setLive((l) => {
      if (l.length >= 4) setStrokes((s) => [...s, { points: l }]);
      return [];
    });
  };

  const uebergeben = () => {
    const segments = fitStrokes(strokes);
    if (segments.length > 0) setPending(segments);
  };

  const uebernehmen = () => {
    if (!pending) return;
    onAccept(pending);
    setPending(null);
    setStrokes([]);
  };

  const allesVerwerfen = () => {
    setStrokes([]);
    setPending(null);
  };

  const livePfad = strichPfad(live, toScreen);

  return (
    <div
      data-testid="sketch-overlay"
      style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor: 'crosshair' }}
      onPointerDown={(e) => {
        if (pending) return;
        drawing.current = true;
        (e.target as Element).setPointerCapture(e.pointerId);
        const w = toWorld(e.clientX, e.clientY);
        setLive([{ ...w, pressure: e.pressure || 0.5 }]);
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        // Pencil: 240Hz-Zwischenpunkte mitnehmen
        const events =
          'getCoalescedEvents' in e.nativeEvent
            ? (e.nativeEvent as PointerEvent).getCoalescedEvents()
            : [e.nativeEvent as PointerEvent];
        setLive((l) => [
          ...l,
          ...events.map((ev) => ({
            ...toWorld(ev.clientX, ev.clientY),
            pressure: ev.pressure || 0.5,
          })),
        ]);
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* Roh-Skizze: fertige, noch nicht gefittete Striche — dezent, grau */}
        {!pending &&
          strokes.map((s, i) => {
            const d = strichPfad(s.points, toScreen);
            return d ? <path key={i} d={d} fill="var(--k-ink-faint)" opacity={0.55} /> : null;
          })}
        {!pending && livePfad && <path d={livePfad} fill="var(--k-accent)" opacity={0.85} />}
        {pending &&
          pending.map((s, i) => {
            const a = toScreen(s.a);
            const b = toScreen(s.b);
            return (
              <g key={i}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--k-accent)" strokeWidth={5} strokeLinecap="round" />
                <circle cx={a.x} cy={a.y} r={4} fill="var(--k-accent)" />
                <circle cx={b.x} cy={b.y} r={4} fill="var(--k-accent)" />
              </g>
            );
          })}
      </svg>

      {!pending && strokes.length > 0 && (
        <div
          data-testid="sketch-batch"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 18,
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'var(--k-surface)',
            border: '1px solid var(--k-line)',
            borderRadius: 'var(--k-radius-md)',
            padding: '8px 12px',
            boxShadow: 'var(--k-shadow-overlay)',
          }}
        >
          <Badge hue={moduleHue.design}>Frei skizziert</Badge>
          <span style={{ fontSize: 13 }}>{strokes.length} Strich{strokes.length === 1 ? '' : 'e'}</span>
          <KButton size="sm" tone="accent" data-testid="sketch-uebergeben" onClick={uebergeben}>
            Übergeben
          </KButton>
          <KButton size="sm" tone="ghost" data-testid="sketch-verwerfen-alle" onClick={allesVerwerfen}>
            Alles verwerfen
          </KButton>
        </div>
      )}

      {pending && (
        <div
          data-testid="sketch-proposal"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 18,
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'var(--k-surface)',
            border: '1px solid var(--k-accent)',
            borderRadius: 'var(--k-radius-md)',
            padding: '8px 12px',
            boxShadow: 'var(--k-shadow-overlay)',
          }}
        >
          <Badge hue={moduleHue.design}>Skizze erkannt</Badge>
          <span style={{ fontSize: 13 }}>{pending.length} Wände</span>
          <KButton size="sm" tone="accent" data-testid="sketch-accept" onClick={uebernehmen}>
            Übernehmen
          </KButton>
          <KButton size="sm" tone="ghost" onClick={() => setPending(null)}>
            Verwerfen
          </KButton>
        </div>
      )}
    </div>
  );
}
