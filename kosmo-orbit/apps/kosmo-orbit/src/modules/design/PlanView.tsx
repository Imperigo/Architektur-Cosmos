import { useEffect, useMemo, useRef, useState } from 'react';
import { derivePlan, deriveDimensions, dimensionLabel, regionToPath, assemblyThickness, type Assembly, type Pt, type Wall } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import type { ViewportHandlers } from './Viewport3D';
import { SketchOverlay } from './SketchOverlay';

/**
 * PlanView — der lebende Grundriss als semantisches SVG.
 * Stifte/Schraffuren kommen aus CSS-Klassen (SIA-Konvention), nie aus der
 * Geometrie: Umstiften ohne Neuableitung. Zeichnen funktioniert hier mit
 * denselben Werkzeug-Handlers wie im 3D — 2D und 3D sind gleichberechtigt.
 */

export function PlanView({ handlers }: { handlers: React.RefObject<ViewportHandlers> }) {
  const revision = useProject((s) => s.revision);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const doc = useProject.getState().doc;
  const svgRef = useRef<SVGSVGElement>(null);

  // Ansicht: Zentrum (mm) + Massstab (px pro mm)
  const [view, setView] = useState({ cx: 5000, cy: 3000, scale: 0.05 });
  const [cursor, setCursor] = useState<Pt | null>(null);
  const panning = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  // Touch (iPad): zwei Finger = Pinch-Zoom + Pan; ein Finger zeichnet wie die Maus
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d0: number; mid0: { x: number; y: number }; v0: { cx: number; cy: number; scale: number } } | null>(null);
  const gestureAktiv = useRef(false);

  const plan = useMemo(
    () => (activeStoreyId ? derivePlan(doc, activeStoreyId) : null),
    [doc, activeStoreyId, revision],
  );
  const dims = useMemo(
    () => (activeStoreyId ? deriveDimensions(doc, activeStoreyId) : null),
    [doc, activeStoreyId, revision],
  );

  const pickEntityAt = (p: Pt): string | null => {
    if (!activeStoreyId) return null;
    // Wände zuerst (Abstand zur Achse ≤ halbe Dicke + Toleranz)
    for (const w of doc.byKind<Wall>('wall')) {
      if (w.storeyId !== activeStoreyId) continue;
      const asm = doc.get<Assembly>(w.assemblyId);
      const half = asm && asm.kind === 'assembly' ? assemblyThickness(asm) / 2 : 150;
      const dx = w.b.x - w.a.x;
      const dy = w.b.y - w.a.y;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - w.a.x) * dx + (p.y - w.a.y) * dy) / len2));
      const qx = w.a.x + t * dx;
      const qy = w.a.y + t * dy;
      if (Math.hypot(p.x - qx, p.y - qy) <= half + 120) return w.id;
    }
    // Dann flächige Elemente (Punkt-in-Polygon)
    const inPoly = (poly: readonly Pt[]) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i]!;
        const b = poly[j]!;
        if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
          inside = !inside;
        }
      }
      return inside;
    };
    for (const e of doc.inStorey(activeStoreyId)) {
      if ((e.kind === 'zone' || e.kind === 'mass' || e.kind === 'roof' || e.kind === 'slab') && inPoly(e.outline)) {
        return e.id;
      }
    }
    return null;
  };

  const toWorld = (clientX: number, clientY: number): Pt => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = clientX - rect.left - rect.width / 2;
    const py = clientY - rect.top - rect.height / 2;
    return {
      x: Math.round(view.cx + px / view.scale),
      y: Math.round(view.cy - py / view.scale),
    };
  };

  // Beim Einhängen einmal auf den Modellinhalt einpassen (z.B. geladenes Projekt).
  // Bewusst NUR beim Mount: während des Zeichnens darf die Ansicht nie springen.
  useEffect(() => {
    const b = plan?.bounds;
    const svg = svgRef.current;
    if (!b || !svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    const w = Math.max(b.maxX - b.minX, 2000);
    const h = Math.max(b.maxY - b.minY, 2000);
    const scale = Math.min(1, Math.max(0.005, Math.min(rect.width / (w * 1.25), rect.height / (h * 1.25))));
    setView({ cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, scale });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0012);
      setView((v) => ({ ...v, scale: Math.min(1, Math.max(0.005, v.scale * factor)) }));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const w = 100 / view.scale; // halbe Breite in mm — via viewBox gelöst
  void w;

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--k-plan-paper)' }}>
      <svg
        ref={svgRef}
        data-testid="planview"
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch') {
            touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            try {
              (e.target as Element).setPointerCapture(e.pointerId);
            } catch {
              /* synthetische Events (Tests) haben keinen aktiven Pointer */
            }
            if (touches.current.size === 2) {
              const [a, b] = [...touches.current.values()];
              pinch.current = {
                d0: Math.hypot(b!.x - a!.x, b!.y - a!.y) || 1,
                mid0: { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 },
                v0: { ...view },
              };
              gestureAktiv.current = true;
              panning.current = null;
            }
            return;
          }
          if (e.button === 1 || e.button === 2 || e.altKey) {
            panning.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
            (e.target as Element).setPointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'touch' && touches.current.has(e.pointerId)) {
            touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pinch.current && touches.current.size >= 2) {
              const [a, b] = [...touches.current.values()];
              const d = Math.hypot(b!.x - a!.x, b!.y - a!.y) || 1;
              const mid = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
              const { d0, mid0, v0 } = pinch.current;
              const scale = Math.min(1, Math.max(0.005, v0.scale * (d / d0)));
              setView({
                scale,
                cx: v0.cx - (mid.x - mid0.x) / scale,
                cy: v0.cy + (mid.y - mid0.y) / scale,
              });
              return;
            }
          }
          if (panning.current) {
            const dx = (e.clientX - panning.current.x) / view.scale;
            const dy = (e.clientY - panning.current.y) / view.scale;
            setView((v) => ({ ...v, cx: panning.current!.cx - dx, cy: panning.current!.cy + dy }));
          } else if (!gestureAktiv.current) {
            const p = toWorld(e.clientX, e.clientY);
            setCursor(p);
            handlers.current?.onGroundMove?.({ p, shiftKey: e.shiftKey });
          }
        }}
        onPointerUp={(e) => {
          if (e.pointerType === 'touch') {
            touches.current.delete(e.pointerId);
            if (touches.current.size < 2) pinch.current = null;
            if (touches.current.size === 0) {
              // Zwei-Finger-Geste beendet? Dann diesen Lift nicht als Klick werten.
              if (gestureAktiv.current) {
                gestureAktiv.current = false;
                return;
              }
            } else {
              return;
            }
          }
          if (panning.current) {
            panning.current = null;
            return;
          }
          if (e.button !== 0) return;
          const p = toWorld(e.clientX, e.clientY);
          if (handlers.current?.pickMode) {
            handlers.current.onPick?.(pickEntityAt(p));
            return;
          }
          handlers.current?.onGroundClick?.({ p, shiftKey: e.shiftKey });
        }}
        onPointerCancel={(e) => {
          if (e.pointerType === 'touch') {
            touches.current.delete(e.pointerId);
            if (touches.current.size < 2) pinch.current = null;
            if (touches.current.size === 0) gestureAktiv.current = false;
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          {/* SIA-Schraffuren */}
          <pattern id="hatch-beton" patternUnits="userSpaceOnUse" width="140" height="140" patternTransform="rotate(45)">
            <rect width="140" height="140" fill="var(--k-plan-paper)" />
            <line x1="0" y1="0" x2="0" y2="140" stroke="var(--k-ink)" strokeWidth="18" />
          </pattern>
          <pattern id="hatch-daemmung" patternUnits="userSpaceOnUse" width="220" height="220" patternTransform="rotate(-45)">
            <rect width="220" height="220" fill="var(--k-plan-paper)" />
            <line x1="0" y1="55" x2="220" y2="55" stroke="var(--k-ink-faint)" strokeWidth="14" />
            <line x1="0" y1="165" x2="220" y2="165" stroke="var(--k-ink-faint)" strokeWidth="14" />
          </pattern>
        </defs>

        <g
          transform={`translate(${(svgRef.current?.clientWidth ?? 800) / 2}, ${(svgRef.current?.clientHeight ?? 600) / 2}) scale(${view.scale}) translate(${-view.cx}, ${view.cy})`}
        >
          {/* Raster: 1m-Punkte */}
          <PlanGrid cx={view.cx} cy={view.cy} scale={view.scale} />

          {plan &&
            plan.regions.map((r, i) => {
              const cls = r.classes.join(' ');
              const isCore = r.classes.includes('tragend');
              const isDaemmung = r.classes.includes('daemmung');
              const isProjection = r.classes.includes('projection');
              return (
                <path
                  key={i}
                  d={regionToPath(r)}
                  fillRule="evenodd"
                  className={cls}
                  fill={
                    isCore
                      ? 'url(#hatch-beton)'
                      : isDaemmung
                        ? 'url(#hatch-daemmung)'
                        : isProjection
                          ? 'none'
                          : 'var(--k-surface)'
                  }
                  stroke="var(--k-ink)"
                  strokeWidth={isProjection ? 8 : isCore ? 24 : 12}
                  strokeDasharray={r.classes.includes('volumen') ? '120 60' : undefined}
                  opacity={r.classes.includes('decke') ? 0.5 : 1}
                />
              );
            })}

          {plan &&
            plan.lines.map((l, i) => (
              <line
                key={`l${i}`}
                className={l.classes.join(' ')}
                x1={l.a.x}
                y1={-l.a.y}
                x2={l.b.x}
                y2={-l.b.y}
                stroke="var(--k-ink)"
                strokeWidth={l.classes.includes('fenster') ? 10 : 14}
              />
            ))}

          {plan &&
            plan.arcs.map((a, i) => {
              const sx = a.center.x + a.radius * Math.cos(a.startAngle);
              const sy = a.center.y + a.radius * Math.sin(a.startAngle);
              const ex = a.center.x + a.radius * Math.cos(a.endAngle);
              const ey = a.center.y + a.radius * Math.sin(a.endAngle);
              const large = Math.abs(a.endAngle - a.startAngle) > Math.PI ? 1 : 0;
              return (
                <path
                  key={`a${i}`}
                  d={`M ${sx} ${-sy} A ${a.radius} ${a.radius} 0 ${large} 0 ${ex} ${-ey}`}
                  fill="none"
                  stroke="var(--k-ink-soft)"
                  strokeWidth={8}
                  strokeDasharray="60 40"
                />
              );
            })}

          {/* Assoziative Aussenbemassung */}
          {dims &&
            dims.chains.map((c, ci) => {
              const t0 = c.ticks[0]!;
              const t1 = c.ticks[c.ticks.length - 1]!;
              const line =
                c.axis === 'x'
                  ? { x1: t0, y1: -c.offset, x2: t1, y2: -c.offset }
                  : { x1: c.offset, y1: -t0, x2: c.offset, y2: -t1 };
              return (
                <g key={`dim${ci}`} stroke="var(--k-ink-soft)" fill="var(--k-ink-soft)">
                  <line {...line} strokeWidth={8} />
                  {c.ticks.map((t, i) => (
                    <g key={i}>
                      {c.axis === 'x' ? (
                        <line x1={t - 60} y1={-c.offset + 60} x2={t + 60} y2={-c.offset - 60} strokeWidth={12} />
                      ) : (
                        <line x1={c.offset - 60} y1={-t - 60} x2={c.offset + 60} y2={-t + 60} strokeWidth={12} />
                      )}
                    </g>
                  ))}
                  {c.ticks.slice(0, -1).map((t, i) => {
                    const next = c.ticks[i + 1]!;
                    const mid = (t + next) / 2;
                    return c.axis === 'x' ? (
                      <text key={`t${i}`} x={mid} y={-c.offset - 120} textAnchor="middle" fontSize={280} stroke="none" fontFamily="var(--k-font-mono)">
                        {dimensionLabel(t, next)}
                      </text>
                    ) : (
                      <text key={`t${i}`} x={c.offset - 120} y={-mid} textAnchor="middle" fontSize={280} stroke="none" fontFamily="var(--k-font-mono)" transform={`rotate(-90 ${c.offset - 120} ${-mid})`}>
                        {dimensionLabel(t, next)}
                      </text>
                    );
                  })}
                </g>
              );
            })}

          {/* Werkzeug-Vorschau */}
          {handlers.current?.previewLine && handlers.current.previewLine.length >= 2 && (
            <polyline
              points={handlers.current.previewLine.map((p) => `${p.x},${-p.y}`).join(' ')}
              fill="none"
              stroke="var(--k-accent)"
              strokeWidth={20}
              strokeDasharray="80 50"
            />
          )}
          {cursor && (
            <g>
              <line x1={cursor.x - 300} y1={-cursor.y} x2={cursor.x + 300} y2={-cursor.y} stroke="var(--k-accent)" strokeWidth={8} />
              <line x1={cursor.x} y1={-cursor.y - 300} x2={cursor.x} y2={-cursor.y + 300} stroke="var(--k-accent)" strokeWidth={8} />
            </g>
          )}
        </g>
      </svg>
      {handlers.current?.sketchMode && handlers.current.onSketchAccept && (
        <SketchOverlay
          toWorld={(cx, cy) => toWorld(cx, cy)}
          toScreen={(p) => {
            const rect = svgRef.current?.getBoundingClientRect();
            const w = rect?.width ?? 800;
            const h = rect?.height ?? 600;
            return {
              x: (p.x - view.cx) * view.scale + w / 2,
              y: (view.cy - p.y) * view.scale + h / 2,
            };
          }}
          onAccept={handlers.current.onSketchAccept}
        />
      )}
    </div>
  );
}

function PlanGrid({ cx, cy, scale }: { cx: number; cy: number; scale: number }) {
  // 1m-Punktraster im sichtbaren Bereich
  const halfW = ((typeof window !== 'undefined' ? window.innerWidth : 1200) / 2) / scale;
  const halfH = ((typeof window !== 'undefined' ? window.innerHeight : 800) / 2) / scale;
  const step = scale < 0.02 ? 5000 : 1000;
  const x0 = Math.floor((cx - halfW) / step) * step;
  const x1 = Math.ceil((cx + halfW) / step) * step;
  const y0 = Math.floor((cy - halfH) / step) * step;
  const y1 = Math.ceil((cy + halfH) / step) * step;
  const dots: React.ReactElement[] = [];
  if ((x1 - x0) / step < 120 && (y1 - y0) / step < 120) {
    for (let x = x0; x <= x1; x += step) {
      for (let y = y0; y <= y1; y += step) {
        dots.push(<circle key={`${x}:${y}`} cx={x} cy={-y} r={12} fill="var(--k-line-strong)" />);
      }
    }
  }
  return <g>{dots}</g>;
}
