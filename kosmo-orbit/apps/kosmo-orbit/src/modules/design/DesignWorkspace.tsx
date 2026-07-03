import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, KButton, Measure, moduleHue } from '@kosmo/ui';
import {
  areaReport,
  fangKandidaten,
  formatLength,
  generiereVolumenstudien,
  magnetFang,
  type Assembly,
  type FangKandidaten,
  type Pt,
  type SectionSpec,
  type Storey,
  type Zone,
} from '@kosmo/kernel';
import { bootstrapProject, useProject } from '../../state/project-store';
import { Viewport3D, type ViewportHandlers } from './Viewport3D';
import { PlanView } from './PlanView';
import { KennzahlenPanel } from './KennzahlenPanel';
import { DrawPanel } from './DrawPanel';
import { BerechnungslistePanel } from './BerechnungslistePanel';
import { RasterPanel } from './RasterPanel';
import { Inspector } from './Inspector';
import { SectionView } from './SectionView';
import { exportIfcFile, exportPlanPdf, exportPlanSvg } from './export-plan';
import { importIfc } from './ifc-import';
import { setContextMeshes, setSplatCloud, setSunDate } from './Viewport3D';
import { registerActions } from '../../shell/palette';

/**
 * KosmoDesign — Arbeitsfläche. V1-Start: 3D-Viewport mit Wand-/Volumen-
 * Werkzeugen (Klick-Klick mit Gummiband, Snap aufs Raster), Geschossleiste,
 * Undo/Redo. Splitscreen mit 2D-Plänen folgt in M2.
 */

type ToolId = 'auswahl' | 'wand' | 'volumen' | 'zone' | 'dach' | 'treppe' | 'schnitt' | 'skizze';

const SNAP = 250; // mm Rasterfang, wenn keine Achse in Reichweite

/** Magnet aufs Stützenraster (Kreuzung > Achslinie), sonst 250er-Raster. */
function snap(p: Pt, magnet?: FangKandidaten): Pt {
  if (magnet) {
    const treffer = magnetFang(p, magnet);
    if (treffer) return treffer;
  }
  return { x: Math.round(p.x / SNAP) * SNAP, y: Math.round(p.y / SNAP) * SNAP };
}

export function DesignWorkspace() {
  const revision = useProject((s) => s.revision);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const runCommand = useProject((s) => s.runCommand);
  const undo = useProject((s) => s.undo);
  const redo = useProject((s) => s.redo);
  const setActiveStorey = useProject((s) => s.setActiveStorey);

  // Achsen-Magnet: Kandidaten des aktiven Geschosses, revision-abhängig
  const magnet = useMemo(
    () => (activeStoreyId ? fangKandidaten(useProject.getState().doc, activeStoreyId) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, activeStoreyId],
  );

  const [tool, setTool] = useState<ToolId>('wand');
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'split' | 'quad'>('split');
  const [sectionSpec, setSectionSpec] = useState<SectionSpec | null>(null);
  const [assemblyId, setAssemblyId] = useState<string | null>(null);
  const [points, setPoints] = useState<Pt[]>([]);
  const [cursor, setCursor] = useState<Pt | null>(null);
  // Volumenstudien (Q12): letzte Zone = Parzelle, Varianten als Gruppe übernehmen
  const [studieOffen, setStudieOffen] = useState(false);
  const [drawOffen, setDrawOffen] = useState(false);
  const [listeOffen, setListeOffen] = useState(false);
  const [rasterOffen, setRasterOffen] = useState(false);
  const [wohnungstyp, setWohnungstyp] = useState<string | null>(null);
  const [zielGf, setZielGf] = useState<number | null>(null);
  const [maxHoeheM, setMaxHoeheM] = useState(25);

  // Schattenstudie (Q12): Datum + Stunde (Viertelstunden), aus = Studio-Sonne
  const [sonneOffen, setSonneOffen] = useState(false);
  const [sonnenDatum, setSonnenDatum] = useState('2026-06-21');
  const [sonnenStunde, setSonnenStunde] = useState(14);

  useEffect(() => {
    if (!sonneOffen) {
      setSunDate(null);
      return;
    }
    const d = new Date(`${sonnenDatum}T00:00:00`);
    d.setMinutes(Math.round(sonnenStunde * 60));
    setSunDate(d);
  }, [sonneOffen, sonnenDatum, sonnenStunde]);

  useEffect(() => {
    bootstrapProject();
  }, []);

  // Palette-Aktionen (⌘K), nur solange KosmoDesign offen ist
  useEffect(() => {
    return registerActions('design', [
      { id: 'view-3d', titel: '3D', gruppe: 'Ansicht', run: () => setViewMode('3d') },
      { id: 'view-split', titel: '3D | Plan', gruppe: 'Ansicht', run: () => setViewMode('split') },
      { id: 'view-quad', titel: '4er-Splitscreen', gruppe: 'Ansicht', run: () => setViewMode('quad') },
      { id: 'view-2d', titel: 'Grundriss', gruppe: 'Ansicht', run: () => setViewMode('2d') },
      { id: 'export-pdf', titel: 'Grundriss als PDF', gruppe: 'Export', run: () => void exportPlanPdf() },
      { id: 'export-svg', titel: 'Grundriss als SVG', gruppe: 'Export', run: exportPlanSvg },
      { id: 'export-ifc', titel: 'Modell als IFC', gruppe: 'Export', run: exportIfcFile },
      { id: 'undo', titel: 'Rückgängig', gruppe: 'Bearbeiten', run: undo },
      { id: 'redo', titel: 'Wiederholen', gruppe: 'Bearbeiten', run: redo },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    for (const sl of doc.byKind('slab')) { if (sl.kind === 'slab') for (const q of sl.outline) eat(q); }
    if (minX === Infinity) return null;
    return {
      a: { x: minX - 1000, y: minY - 1000 },
      b: { x: maxX + 1000, y: minY - 1000 },
      depth: maxY - minY + 3000,
      lookLeft: true,
    };
  }, [doc, revision]);

  const handlersRef = useRef<ViewportHandlers>({});
  const select = useProject((s) => s.select);
  handlersRef.current = {
    sketchMode: tool === 'skizze',
    pickMode: tool === 'auswahl',
    onPick: (id) => select(id ? [id] : []),
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
    onGroundMove: (e) => setCursor(snap(e.p, magnet)),
    onEscape: () => setPoints([]),
    onGroundClick: (e) => {
      if (!activeStoreyId) return;
      const p = snap(e.p, magnet);
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
      } else if (tool === 'treppe') {
        if (points.length === 0) {
          setPoints([p]);
        } else {
          try {
            runCommand('design.treppeErstellen', {
              storeyId: activeStoreyId,
              a: points[0]!,
              b: p,
              width: 1200,
            });
          } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
          }
          setPoints([]);
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
              ...(wohnungstyp ? { program: wohnungstyp } : {}),
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
          flexWrap: 'wrap',
          gap: 8,
          rowGap: 4,
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
            ['treppe', 'Treppe'],
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
        <KButton
          size="sm"
          tone="ghost"
          data-testid="import-ifc"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.ifc';
            input.onchange = async () => {
              const f = input.files?.[0];
              if (!f) return;
              try {
                const result = await importIfc(new Uint8Array(await f.arrayBuffer()));
                setContextMeshes(result.meshes);
                console.info(`IFC-Kontext: ${result.elementCount} Elemente (${result.schema})`);
              } catch (err) {
                alert(`IFC-Import fehlgeschlagen: ${err instanceof Error ? err.message : err}`);
              }
            };
            input.click();
          }}
        >
          IFC laden
        </KButton>
        <KButton
          size="sm"
          tone="ghost"
          data-testid="import-splat"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.splat,.ply';
            input.onchange = async () => {
              const f = input.files?.[0];
              if (!f) return;
              try {
                const { parseSplatCloud } = await import('./splat-import');
                setSplatCloud(parseSplatCloud(f.name, await f.arrayBuffer()));
              } catch (err) {
                alert(`Splat-Import fehlgeschlagen: ${err instanceof Error ? err.message : err}`);
              }
            };
            input.click();
          }}
        >
          Splat laden
        </KButton>
        <KButton
          size="sm"
          tone={sonneOffen ? 'accent' : 'ghost'}
          data-testid="sonne-toggle"
          onClick={() => setSonneOffen(!sonneOffen)}
        >
          ☀ Sonne
        </KButton>
        <KButton
          size="sm"
          tone={studieOffen ? 'accent' : 'ghost'}
          data-testid="studie-toggle"
          onClick={() => setStudieOffen(!studieOffen)}
        >
          Varianten
        </KButton>
        <KButton
          size="sm"
          tone={drawOffen ? 'accent' : 'ghost'}
          data-testid="draw-toggle"
          onClick={() => setDrawOffen(!drawOffen)}
        >
          Draw
        </KButton>
        <KButton
          size="sm"
          tone={listeOffen ? 'accent' : 'ghost'}
          data-testid="liste-toggle"
          onClick={() => setListeOffen(!listeOffen)}
        >
          Liste
        </KButton>
        <KButton
          size="sm"
          tone={rasterOffen ? 'accent' : 'ghost'}
          data-testid="raster-toggle"
          onClick={() => { setRasterOffen(!rasterOffen); if (!rasterOffen) setListeOffen(false); }}
        >
          Raster
        </KButton>
        <span style={{ width: 12 }} />
        <KButton size="sm" tone="ghost" onClick={undo} data-testid="undo">
          ↩ Rückgängig
        </KButton>
        <KButton size="sm" tone="ghost" onClick={redo}>
          ↪ Wiederholen
        </KButton>
      </div>

      {sonneOffen && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            padding: '6px 12px',
            borderBottom: '1px solid var(--k-line)',
            background: 'var(--k-surface)',
            fontSize: 12.5,
          }}
        >
          <span style={{ color: 'var(--k-ink-faint)' }}>Schattenstudie · Innerschweiz</span>
          <input
            type="date"
            value={sonnenDatum}
            data-testid="sonne-datum"
            onChange={(e) => setSonnenDatum(e.target.value)}
            style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)' }}
          />
          <input
            type="range"
            min={5}
            max={22}
            step={0.25}
            value={sonnenStunde}
            data-testid="sonne-stunde"
            onChange={(e) => setSonnenStunde(Number(e.target.value))}
            style={{ width: 260 }}
          />
          <span style={{ fontFamily: 'var(--k-mono, monospace)', minWidth: 48 }}>
            {String(Math.floor(sonnenStunde)).padStart(2, '0')}:{String(Math.round((sonnenStunde % 1) * 60)).padStart(2, '0')}
          </span>
          <span style={{ color: 'var(--k-ink-faint)' }}>
            21.&nbsp;März/Sept. für den 2h-Nachweis, 21.&nbsp;Juni/Dez. für die Extreme.
          </span>
        </div>
      )}

      {/* Ansichten: synchron auf demselben Modell + denselben Werkzeugen */}
      <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
        {drawOffen && <DrawPanel />}
        {rasterOffen && <RasterPanel onClose={() => setRasterOffen(false)} />}
        {listeOffen && (
          <BerechnungslistePanel
            wohnungstyp={wohnungstyp}
            setWohnungstyp={setWohnungstyp}
            onClose={() => setListeOffen(false)}
          />
        )}
        {studieOffen && (
          <StudienPanel
            zielGf={zielGf}
            setZielGf={setZielGf}
            maxHoeheM={maxHoeheM}
            setMaxHoeheM={setMaxHoeheM}
            onClose={() => setStudieOffen(false)}
          />
        )}
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
        <Inspector />

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
                : tool === 'treppe'
                ? 'Klick: Antritt, dann Austritt (Steigung wird berechnet)'
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

/** Q12 Volumenstudien: letzte Zone = Parzelle → Extremvarianten, Übernahme als eine Undo-Gruppe. */
function StudienPanel({
  zielGf,
  setZielGf,
  maxHoeheM,
  setMaxHoeheM,
  onClose,
}: {
  zielGf: number | null;
  setZielGf: (v: number) => void;
  maxHoeheM: number;
  setMaxHoeheM: (v: number) => void;
  onClose: () => void;
}) {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const { doc, history } = useProject.getState();
  const [nutzung, setNutzung] = useState<'wohnen' | 'gemischt'>('wohnen');

  const parzelle = useMemo(() => {
    const zonen = doc.byKind<Zone>('zone').filter((z) => z.storeyId === activeStoreyId);
    return zonen[zonen.length - 1] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, activeStoreyId]);

  const zielEffektiv = zielGf ?? Math.max(Math.round(areaReport(doc).agfZiel) || 0, 500);

  const varianten = useMemo(
    () =>
      parzelle
        ? generiereVolumenstudien(parzelle.outline, { zielGf: zielEffektiv, maxHoehe: maxHoeheM * 1000, nutzung })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parzelle, zielEffektiv, maxHoeheM, nutzung, revision],
  );

  const uebernehmen = (id: string) => {
    const v = varianten.find((x) => x.id === id);
    if (!v || !activeStoreyId) return;
    history.beginGroup();
    try {
      for (const k of v.koerper) {
        runCommand('design.volumenErstellen', {
          storeyId: activeStoreyId,
          outline: k.outline,
          height: k.height,
          program: k.program,
        });
      }
    } finally {
      history.endGroup();
    }
  };

  const inputStyle: React.CSSProperties = {
    width: 70,
    padding: '3px 6px',
    borderRadius: 6,
    border: '1px solid var(--k-line-strong)',
    background: 'var(--k-raised)',
    fontSize: 12,
  };

  return (
    <div
      data-testid="studien-panel"
      style={{
        position: 'absolute',
        left: 12,
        top: 52,
        width: 268,
        zIndex: 4,
        background: 'var(--k-surface)',
        border: '1px solid var(--k-line)',
        borderRadius: 'var(--k-radius-md)',
        boxShadow: 'var(--k-shadow-raised)',
        fontSize: 12.5,
        padding: 12,
        display: 'grid',
        gap: 9,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge hue={moduleHue.design}>Volumenstudien</Badge>
        <span style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={onClose}>×</KButton>
      </div>
      {!parzelle ? (
        <div style={{ color: 'var(--k-ink-faint)', lineHeight: 1.5 }}>
          Zeichne zuerst die <b>Parzelle als Zone</b> (Werkzeug «Zone») — die zuletzt
          gezeichnete Zone des Geschosses gilt als Baufeld.
        </div>
      ) : (
        <>
          <div style={{ color: 'var(--k-ink-faint)' }}>
            Parzelle: «{parzelle.name}» · Grenzabstand 4 m
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center', color: 'var(--k-ink-soft)' }}>
              GF-Ziel
              <input
                type="number"
                value={zielEffektiv}
                data-testid="studie-gf"
                onChange={(e) => setZielGf(Number(e.target.value))}
                style={inputStyle}
              />
              m²
            </label>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center', color: 'var(--k-ink-soft)' }}>
              max.
              <input
                type="number"
                value={maxHoeheM}
                onChange={(e) => setMaxHoeheM(Number(e.target.value))}
                style={{ ...inputStyle, width: 44 }}
              />
              m
            </label>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <KButton
              size="sm"
              tone="quiet"
              data-testid="als-baugrenze"
              onClick={() => {
                if (!parzelle || !activeStoreyId) return;
                runCommand('design.baugrenzeSetzen', {
                  storeyId: activeStoreyId,
                  outline: parzelle.outline,
                  maxHoehe: maxHoeheM * 1000,
                  name: parzelle.name,
                });
              }}
            >
              Als Baugrenze (max. {maxHoeheM} m)
            </KButton>
            <KButton size="sm" tone={nutzung === 'wohnen' ? 'accent' : 'ghost'} onClick={() => setNutzung('wohnen')}>
              Wohnen 2.80
            </KButton>
            <KButton
              size="sm"
              tone={nutzung === 'gemischt' ? 'accent' : 'ghost'}
              onClick={() => setNutzung('gemischt')}
              data-testid="studie-gemischt"
            >
              Gewerbe-EG 4.00
            </KButton>
          </div>
          {varianten.map((v) => (
            <div
              key={v.id}
              data-testid={`variante-${v.id}`}
              style={{
                border: '1px solid var(--k-line)',
                borderRadius: 8,
                padding: '8px 10px',
                display: 'grid',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                <b>{v.name}</b>
                <span style={{ color: 'var(--k-ink-faint)' }}>
                  {v.geschosse} Gesch. · {(v.hoehe / 1000).toFixed(0)} m · GF {v.gf.toLocaleString('de-CH')} m²
                </span>
                {!v.passt && <Badge hue="var(--k-warning)">sprengt Höhe</Badge>}
                {v.tiefeOk === false && <Badge hue="var(--k-warning)">Tiefe</Badge>}
                {v.besonnung && (
                  <Badge hue={v.besonnung.ok ? 'var(--k-success)' : 'var(--k-danger)'}>
                    3h {v.besonnung.ok ? 'ok' : 'verfehlt'}
                  </Badge>
                )}
              </div>
              <div style={{ color: 'var(--k-ink-soft)', lineHeight: 1.4 }}>{v.beschrieb}</div>
              {v.hinweise.length > 0 && (
                <div style={{ color: 'var(--k-ink-faint)', fontSize: 11, lineHeight: 1.4 }}>
                  {v.hinweise.join(' · ')}
                </div>
              )}
              <div>
                <KButton size="sm" tone="quiet" data-testid={`uebernehmen-${v.id}`} onClick={() => uebernehmen(v.id)}>
                  Übernehmen
                </KButton>
              </div>
            </div>
          ))}
          <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>
            Anstoss, kein Entwurf — Übernahme ist ein Undo-Schritt.
          </span>
        </>
      )}
    </div>
  );
}
