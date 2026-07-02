import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, KButton, Measure, moduleHue } from '@kosmo/ui';
import { formatLength, type Assembly, type Pt, type SectionSpec, type Storey } from '@kosmo/kernel';
import { bootstrapProject, useProject } from '../../state/project-store';
import { Viewport3D, type ViewportHandlers } from './Viewport3D';
import { PlanView } from './PlanView';
import { KennzahlenPanel } from './KennzahlenPanel';
import { SectionView } from './SectionView';
import { exportIfcFile, exportPlanPdf, exportPlanSvg } from './export-plan';

/**
 * KosmoDesign — Arbeitsfläche. V1-Start: 3D-Viewport mit Wand-/Volumen-
 * Werkzeugen (Klick-Klick mit Gummiband, Snap aufs Raster), Geschossleiste,
 * Undo/Redo. Splitscreen mit 2D-Plänen folgt in M2.
 */

type ToolId = 'auswahl' | 'wand' | 'volumen' | 'zone' | 'dach' | 'schnitt' | 'skizze';

const SNAP = 250; // mm Rasterfang — später einstellbar/magnetisch

function snap(p: Pt): Pt {
  return { x: Math.round(p.x / SNAP) * SNAP, y: Math.round(p.y / SNAP) * SNAP };
}

export function DesignWorkspace() {
  const revision = useProject((s) => s.revision);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const runCommand = useProject((s) => s.runCommand);
  const undo = useProject((s) => s.undo);
  const redo = useProject((s) => s.redo);
  const setActiveStorey = useProject((s) => s.setActiveStorey);

  const [tool, setTool] = useState<ToolId>('wand');
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'split' | 'quad'>('split');
  const [sectionSpec, setSectionSpec] = useState<SectionSpec | null>(null);
  const [assemblyId, setAssemblyId] = useState<string | null>(null);
  const [points, setPoints] = useState<Pt[]>([]);
  const [cursor, setCursor] = useState<Pt | null>(null);

  useEffect(() => {
    bootstrapProject();
  }, []);

  const doc = useProject.getState().doc;
  const storeys = useMemo(() => doc.storeysOrdered(), [doc, revision]);
  const assemblies = useMemo(
    () => doc.byKind<Assembly>('assembly').filter((a) => a.target === 'wall'),
    [doc, revision],
  );
  const effectiveAssembly = assemblyId ?? assemblies[0]?.id ?? null;

  // Auto-Ansicht von Süden: Linie unter dem Modell, Blick nach Norden
  const elevationSpec = useMemo<SectionSpec | null>(() => {
    const walls = doc.byKind('wall');
    const masses = doc.byKind('mass');
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const eat = (q: Pt) => {
      minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
      minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
    };
    for (const w of walls) { if (w.kind === 'wall') { eat(w.a); eat(w.b); } }
    for (const m of masses) { if (m.kind === 'mass') for (const q of m.outline) eat(q); }
    if (minX === Infinity) return null;
    return {
      a: { x: minX - 1000, y: minY - 1000 },
      b: { x: maxX + 1000, y: minY - 1000 },
      depth: maxY - minY + 3000,
      lookLeft: true,
    };
  }, [doc, revision]);

  const handlersRef = useRef<ViewportHandlers>({});
  handlersRef.current = {
    sketchMode: tool === 'skizze',
    onSketchAccept: (segments) => {
      if (!activeStoreyId || !effectiveAssembly) return;
      for (const seg of segments) {
        try {
          runCommand('design.wandZeichnen', {
            storeyId: activeStoreyId,
            a: seg.a,
            b: seg.b,
            assemblyId: effectiveAssembly,
          });
        } catch {
          // degenerierte Segmente (Länge 0 nach Snap) still überspringen
        }
      }
    },
    previewLine:
      points.length > 0 && cursor
        ? tool === 'volumen' || tool === 'zone' || tool === 'dach'
          ? [...points, cursor, points[0]!]
          : [...points, cursor]
        : null,
    onGroundMove: (e) => setCursor(snap(e.p)),
    onEscape: () => setPoints([]),
    onGroundClick: (e) => {
      if (!activeStoreyId) return;
      const p = snap(e.p);
      if (tool === 'wand') {
        if (points.length === 0) {
          setPoints([p]);
        } else {
          const a = points[points.length - 1]!;
          if (a.x !== p.x || a.y !== p.y) {
            if (effectiveAssembly) {
              runCommand('design.wandZeichnen', {
                storeyId: activeStoreyId,
                a,
                b: p,
                assemblyId: effectiveAssembly,
              });
            }
            // Kettenzeichnen: Endpunkt wird neuer Anfang; Shift beendet
            setPoints(e.shiftKey ? [] : [p]);
          }
        }
      } else if (tool === 'schnitt') {
        if (points.length === 0) {
          setPoints([p]);
        } else {
          setSectionSpec({ a: points[0]!, b: p, depth: 30000, lookLeft: true });
          setPoints([]);
          setViewMode('quad');
        }
      } else if (tool === 'volumen' || tool === 'zone' || tool === 'dach') {
        if (points.length >= 3 && Math.hypot(p.x - points[0]!.x, p.y - points[0]!.y) < SNAP) {
          if (tool === 'dach') {
            try {
              runCommand('design.dachErstellen', {
                storeyId: activeStoreyId,
                outline: points,
                pitch: 35,
                overhang: 500,
              });
            } catch (err) {
              alert(err instanceof Error ? err.message : String(err));
            }
          } else if (tool === 'volumen') {
            runCommand('design.volumenErstellen', {
              storeyId: activeStoreyId,
              outline: points,
              height: 9000,
            });
          } else {
            const n = useProject.getState().doc.byKind('zone').length + 1;
            runCommand('design.zoneErstellen', {
              storeyId: activeStoreyId,
              outline: points,
              name: `Raum ${n}`,
              sia: 'HNF',
            });
          }
          setPoints([]);
        } else {
          setPoints([...points, p]);
        }
      }
    },
  };

  useEffect(() => {
    setPoints([]);
  }, [tool, activeStoreyId]);

  const journal = useProject((s) => s.journal);
  const lastEntry = journal[journal.length - 1];

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Werkzeugleiste */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderBottom: '1px solid var(--k-line)',
          background: 'var(--k-surface)',
          zIndex: 2,
        }}
      >
        <Badge hue={moduleHue.design}>KosmoDesign</Badge>
        <span style={{ width: 8 }} />
        {(
          [
            ['auswahl', 'Auswahl'],
            ['wand', 'Wand'],
            ['volumen', 'Volumen'],
            ['zone', 'Zone'],
            ['dach', 'Dach'],
            ['schnitt', 'Schnitt'],
            ['skizze', '✎ Skizze'],
          ] as const
        ).map(([id, label]) => (
          <KButton
            key={id}
            size="sm"
            tone={tool === id ? 'accent' : 'quiet'}
            onClick={() => setTool(id)}
            data-testid={`tool-${id}`}
          >
            {label}
          </KButton>
        ))}
        <span style={{ width: 12 }} />
        {tool === 'wand' && assemblies.length > 0 && (
          <select
            value={effectiveAssembly ?? ''}
            onChange={(e) => setAssemblyId(e.target.value)}
            style={{
              background: 'var(--k-raised)',
              border: '1px solid var(--k-line-strong)',
              borderRadius: 'var(--k-radius-sm)',
              padding: '4px 8px',
              fontSize: 12.5,
            }}
          >
            {assemblies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        <div style={{ flex: 1 }} />
        {(
          [
            ['3d', '3D'],
            ['split', '3D | Plan'],
            ['quad', '4er'],
            ['2d', 'Grundriss'],
          ] as const
        ).map(([id, label]) => (
          <KButton
            key={id}
            size="sm"
            tone={viewMode === id ? 'accent' : 'ghost'}
            onClick={() => setViewMode(id)}
            data-testid={`view-${id}`}
          >
            {label}
          </KButton>
        ))}
        <span style={{ width: 12 }} />
        <KButton size="sm" tone="ghost" onClick={() => void exportPlanPdf()} data-testid="export-pdf">
          PDF
        </KButton>
        <KButton size="sm" tone="ghost" onClick={exportPlanSvg}>
          SVG
        </KButton>
        <KButton size="sm" tone="ghost" onClick={exportIfcFile} data-testid="export-ifc">
          IFC
        </KButton>
        <span style={{ width: 12 }} />
        <KButton size="sm" tone="ghost" onClick={undo} data-testid="undo">
          ↩ Rückgängig
        </KButton>
        <KButton size="sm" tone="ghost" onClick={redo}>
          ↪ Wiederholen
        </KButton>
      </div>

      {/* Ansichten: synchron auf demselben Modell + denselben Werkzeugen */}
      <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
        {viewMode === 'quad' ? (
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 1,
              background: 'var(--k-line)',
            }}
          >
            <div style={{ position: 'relative', background: 'var(--k-field)' }}>
              <Viewport3D handlers={handlersRef} />
            </div>
            <div style={{ position: 'relative' }}>
              <PlanView handlers={handlersRef} />
            </div>
            <div style={{ position: 'relative' }}>
              <SectionView spec={sectionSpec} title="Schnitt" />
            </div>
            <div style={{ position: 'relative' }}>
              <SectionView spec={elevationSpec} title="Ansicht Süd" />
            </div>
          </div>
        ) : (
          <>
            {viewMode !== '2d' && (
              <div style={{ position: 'relative', flex: 1 }}>
                <Viewport3D handlers={handlersRef} />
              </div>
            )}
            {viewMode !== '3d' && (
              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  borderLeft: viewMode === 'split' ? '1px solid var(--k-line)' : 'none',
                }}
              >
                <PlanView handlers={handlersRef} />
              </div>
            )}
          </>
        )}

        <KennzahlenPanel />

        {/* Geschossleiste */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: 4,
            background: 'var(--k-surface)',
            border: '1px solid var(--k-line)',
            borderRadius: 'var(--k-radius-md)',
            padding: 6,
            boxShadow: 'var(--k-shadow-raised)',
          }}
        >
          {storeys.map((s: Storey) => (
            <KButton
              key={s.id}
              size="sm"
              tone={s.id === activeStoreyId ? 'accent' : 'ghost'}
              onClick={() => setActiveStorey(s.id)}
              data-testid={`storey-${s.name}`}
            >
              {s.name}
            </KButton>
          ))}
        </div>

        {/* Statuszeile */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            right: 12,
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            pointerEvents: 'none',
            fontSize: 12.5,
            color: 'var(--k-ink-soft)',
          }}
        >
          {cursor && (
            <Measure style={{ background: 'var(--k-surface)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--k-line)' }}>
              {formatLength(cursor.x)} / {formatLength(cursor.y)}
            </Measure>
          )}
          {points.length > 0 && cursor && tool === 'wand' && (
            <Measure style={{ background: 'var(--k-accent-wash)', padding: '3px 8px', borderRadius: 6 }}>
              L = {formatLength(Math.round(Math.hypot(cursor.x - points[points.length - 1]!.x, cursor.y - points[points.length - 1]!.y)))}
            </Measure>
          )}
          {lastEntry && (
            <span
              style={{
                background: 'var(--k-surface)',
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid var(--k-line)',
              }}
              data-testid="last-action"
            >
              {lastEntry.summary}
            </span>
          )}
          <span style={{ flex: 1 }} />
          <span style={{ background: 'var(--k-surface)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--k-line)' }}>
            {tool === 'wand'
              ? 'Klick: Punkte setzen · Shift-Klick: Kette beenden · Esc: abbrechen'
              : tool === 'skizze'
                ? 'Freihand zeichnen — Striche werden zu Wänden'
                : tool === 'schnitt'
                ? 'Klick: Anfang und Ende der Schnittlinie'
                : tool === 'volumen'
                ? 'Klick: Eckpunkte · Klick auf Start: schliessen'
                : 'Klick: auswählen'}
          </span>
        </div>
      </div>
    </div>
  );
}
