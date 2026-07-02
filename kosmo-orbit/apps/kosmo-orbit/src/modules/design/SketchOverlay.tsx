import { useRef, useState } from 'react';
import { getStroke } from 'perfect-freehand';
import { Badge, KButton, moduleHue } from '@kosmo/ui';
import type { Pt } from '@kosmo/kernel';
import { fitStroke, type FittedSegment, type Stroke } from './sketch';

/**
 * KosmoSketch-Overlay — liegt über dem Plan: Freihand zeichnen (Apple Pencil:
 * Druckstufen via PointerEvents), beim Absetzen werden Wandachsen erkannt und
 * als Vorschlag gezeigt. Übernehmen = normale Commands (Undo inklusive).
 */

export interface SketchOverlayProps {
  /** Pixel ↔ Welt-mm Umrechnung der darunterliegenden Planansicht. */
  toWorld: (clientX: number, clientY: number) => Pt;
  toScreen: (p: Pt) => { x: number; y: number };
  onAccept: (segments: FittedSegment[]) => void;
}

export function SketchOverlay({ toWorld, toScreen, onAccept }: SketchOverlayProps) {
  const [live, setLive] = useState<{ x: number; y: number; pressure: number }[]>([]);
  const [pending, setPending] = useState<{ stroke: Stroke; segments: FittedSegment[] } | null>(
    null,
  );
  const drawing = useRef(false);

  const finish = () => {
    drawing.current = false;
    if (live.length < 4) {
      setLive([]);
      return;
    }
    const stroke: Stroke = { points: live };
    const segments = fitStroke(stroke);
    setLive([]);
    if (segments.length > 0) setPending({ stroke, segments });
  };

  // Bildschirm-Pfad des lebenden Strichs (perfect-freehand: Druck → Breite)
  const outline = getStroke(
    live.map((p) => {
      const s = toScreen({ x: p.x, y: p.y });
      return [s.x, s.y, p.pressure];
    }),
    { size: 7, thinning: 0.6, smoothing: 0.6, streamline: 0.4, simulatePressure: false },
  );
  const pathData =
    outline.length > 1
      ? `M ${outline.map(([x, y]) => `${x!.toFixed(1)} ${y!.toFixed(1)}`).join(' L ')} Z`
      : '';

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
        {pathData && <path d={pathData} fill="var(--k-accent)" opacity={0.85} />}
        {pending &&
          pending.segments.map((s, i) => {
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
          <span style={{ fontSize: 13 }}>{pending.segments.length} Wände</span>
          <KButton
            size="sm"
            tone="accent"
            data-testid="sketch-accept"
            onClick={() => {
              onAccept(pending.segments);
              setPending(null);
            }}
          >
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
