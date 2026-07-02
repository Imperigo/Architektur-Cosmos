import { useEffect, useMemo, useRef, useState } from 'react';
import { derivePlan, regionToPath, type Pt } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import type { ViewportHandlers } from './Viewport3D';

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

  const plan = useMemo(
    () => (activeStoreyId ? derivePlan(doc, activeStoreyId) : null),
    [doc, activeStoreyId, revision],
  );

  const toWorld = (clientX: number, clientY: number): Pt => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = clientX - rect.left - rect.width / 2;
    const py = clientY - rect.top - rect.height / 2;
    return {
      x: Math.round(view.cx + px / view.scale),
      y: Math.round(view.cy - py / view.scale),
    };
  };

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
          if (e.button === 1 || e.button === 2 || e.altKey) {
            panning.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
            (e.target as Element).setPointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          if (panning.current) {
            const dx = (e.clientX - panning.current.x) / view.scale;
            const dy = (e.clientY - panning.current.y) / view.scale;
            setView((v) => ({ ...v, cx: panning.current!.cx - dx, cy: panning.current!.cy + dy }));
          } else {
            const p = toWorld(e.clientX, e.clientY);
            setCursor(p);
            handlers.current?.onGroundMove?.({ p, shiftKey: e.shiftKey });
          }
        }}
        onPointerUp={(e) => {
          if (panning.current) {
            panning.current = null;
            return;
          }
          if (e.button !== 0) return;
          const p = toWorld(e.clientX, e.clientY);
          handlers.current?.onGroundClick?.({ p, shiftKey: e.shiftKey });
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
