import { useEffect, useMemo, useRef, useState } from 'react';
import {
  evaluiereGraph,
  VIS_NODE_KATALOG,
  VIS_STIMMUNGEN,
  type VisGraph,
  type VisNode,
  type VisPortTyp,
} from '@kosmo/kernel';
import { KButton, melde, meldeFehler } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import { bildAufsBlatt, bildUrl, holeJob, postRenderJob } from './vis-jobs';
import { memoKey, useVisRuntime } from './vis-runtime';

/**
 * NodeCanvas (V1-Finish P2) — der Blender-artige Node-Editor von KosmoVis.
 * Eigenbau-SVG statt react-flow: jede Änderung läuft als vis.*-Command
 * (Undo, Yjs, Kosmo spricht Graphen). Drag lebt im lokalen State und wird
 * bei pointerup als EIN vis.nodeSchieben committet; Parameter committen
 * bei blur. Render nur auf «Ausführen» — nie automatisch.
 */

const NODE_W = 200;
const PORT_ABSTAND = 20;
const KOPF_H = 26;

const PORT_FARBE: Record<VisPortTyp, string> = {
  szene: '#2455a4',
  bild: '#a84b2b',
  prompt: '#1e6b47',
  zahl: '#7a5c9e',
  material: '#8a6d3b',
};

/** Höhe des Inhaltsbereichs je Node-Typ (Canvas-Einheiten). */
const KOERPER_H: Record<string, number> = {
  modell: 22,
  material: 40,
  prompt: 56,
  stimmung: 34,
  kombinierer: 64,
  zahl: 38,
  render: 168,
  vergleich: 132,
  blatt: 38,
  referenz: 92,
};

function nodeHoehe(n: VisNode): number {
  const kat = VIS_NODE_KATALOG[n.typ];
  const ports = Math.max(kat?.inputs.length ?? 0, kat?.outputs.length ?? 0);
  return KOPF_H + 8 + ports * PORT_ABSTAND + (KOERPER_H[n.typ] ?? 30) + 10;
}

function portPos(n: VisNode, port: string, richtung: 'in' | 'out'): { x: number; y: number } {
  const kat = VIS_NODE_KATALOG[n.typ];
  const liste = richtung === 'in' ? (kat?.inputs ?? []) : (kat?.outputs ?? []);
  const i = Math.max(0, liste.findIndex((p) => p.name === port));
  return { x: n.x + (richtung === 'in' ? 0 : NODE_W), y: n.y + KOPF_H + 14 + i * PORT_ABSTAND };
}

/** Kubische Bézier mit horizontalen Tangenten — kein Routing, ruhige Kurven. */
function edgePfad(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

export function NodeCanvas({ graphId }: { graphId: string }) {
  const revision = useProject((s) => s.revision);
  void revision;
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  const graph = doc.get<VisGraph>(graphId);

  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ cx: 560, cy: 300, scale: 1 });
  const panning = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  // Node-Drag: lokal bewegen, EIN Command bei pointerup
  const [drag, setDrag] = useState<{ nodeId: string; dx: number; dy: number; x: number; y: number } | null>(null);
  const [pending, setPending] = useState<{ from: string; fromPort: string; typ: VisPortTyp; x: number; y: number } | null>(null);
  const [auswahlEdge, setAuswahlEdge] = useState<string | null>(null);

  const laeufe = useVisRuntime((s) => s.laeufe);
  const setzeLauf = useVisRuntime((s) => s.setzeLauf);
  const patchLauf = useVisRuntime((s) => s.patchLauf);

  const auswertung = useMemo(
    () => (graph ? evaluiereGraph(doc, graph) : null),
    [doc, graph, revision],
  );

  // Ein Poll für alle offenen Render-Jobs (2.5 s — wie die Einfach-Ansicht)
  useEffect(() => {
    const t = setInterval(() => {
      const offen = Object.entries(useVisRuntime.getState().laeufe).filter(
        ([, l]) => l.jobId && (l.status === 'gesendet' || l.status === 'rendert'),
      );
      for (const [nodeId, lauf] of offen) {
        void holeJob(lauf.jobId!)
          .then((j) => {
            if (j.result) {
              patchLauf(nodeId, { status: 'fertig', bild: j.result.images[0] ?? '', qa: j.result.qa });
            } else if (j.status === 'error') {
              patchLauf(nodeId, { status: 'fehler', fehler: 'Render fehlgeschlagen' });
            } else {
              patchLauf(nodeId, { status: 'rendert' });
            }
          })
          .catch(() => undefined);
      }
    }, 2500);
    return () => clearInterval(t);
  }, [patchLauf]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0012);
      setView((v) => ({ ...v, scale: Math.min(2.5, Math.max(0.25, v.scale * factor)) }));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  if (!graph) return null;

  const toCanvas = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: view.cx + (clientX - rect.left - rect.width / 2) / view.scale,
      y: view.cy + (clientY - rect.top - rect.height / 2) / view.scale,
    };
  };

  const nodePos = (n: VisNode) =>
    drag && drag.nodeId === n.id ? { ...n, x: drag.x, y: drag.y } : n;

  const sicher = (fn: () => void) => {
    try {
      fn();
    } catch (err) {
      meldeFehler(err);
    }
  };

  const ausfuehren = (nodeId: string) => {
    const auftrag = auswertung?.renderAuftraege.get(nodeId);
    if (!auftrag) return;
    if (!auftrag.hatSzene) {
      melde('Der Render-Node braucht eine Szene — verbinde den Modell-Node.', { ton: 'fehler' });
      return;
    }
    const key = memoKey(auftrag);
    setzeLauf(nodeId, { status: 'gesendet', memoKey: key });
    void postRenderJob(auftrag)
      .then((j) => patchLauf(nodeId, { jobId: j.job_id }))
      .catch((err) => {
        patchLauf(nodeId, { status: 'fehler', fehler: err instanceof Error ? err.message : String(err) });
        meldeFehler(err);
      });
  };

  /** Bild-Quelle eines Eingangs-Ports: der Lauf des verbundenen Render-Nodes. */
  const bildQuelle = (nodeId: string, port: string) => {
    const e = graph.edges.find((e) => e.to === nodeId && e.toPort === port);
    if (!e) return null;
    const lauf = laeufe[e.from];
    return lauf && lauf.status === 'fertig' && lauf.jobId && lauf.bild
      ? { jobId: lauf.jobId, bild: lauf.bild, qa: lauf.qa }
      : null;
  };

  const rect = { w: 100 / view.scale, h: 100 / view.scale };
  void rect;

  return (
    <svg
      ref={svgRef}
      data-testid="node-canvas"
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', background: 'var(--k-plan-paper)' }}
      viewBox={(() => {
        const r = svgRef.current?.getBoundingClientRect();
        const w = (r?.width ?? 1200) / view.scale;
        const h = (r?.height ?? 700) / view.scale;
        return `${view.cx - w / 2} ${view.cy - h / 2} ${w} ${h}`;
      })()}
      onPointerDown={(e) => {
        if (e.target === svgRef.current) {
          panning.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
          (e.target as Element).setPointerCapture(e.pointerId);
          setAuswahlEdge(null);
        }
      }}
      onPointerMove={(e) => {
        if (panning.current) {
          setView((v) => ({
            ...v,
            cx: panning.current!.cx - (e.clientX - panning.current!.x) / view.scale,
            cy: panning.current!.cy - (e.clientY - panning.current!.y) / view.scale,
          }));
          return;
        }
        if (drag) {
          const p = toCanvas(e.clientX, e.clientY);
          setDrag({ ...drag, x: p.x - drag.dx, y: p.y - drag.dy });
        }
        if (pending) {
          const p = toCanvas(e.clientX, e.clientY);
          setPending({ ...pending, x: p.x, y: p.y });
        }
      }}
      onPointerUp={() => {
        panning.current = null;
        if (drag) {
          sicher(() => runCommand('vis.nodeSchieben', { graphId, nodeId: drag.nodeId, x: Math.round(drag.x), y: Math.round(drag.y) }));
          setDrag(null);
        }
        if (pending) setPending(null);
      }}
    >
      {/* Punktraster — leise Orientierung */}
      <defs>
        <pattern id="vis-raster" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--k-line)" />
        </pattern>
      </defs>
      <rect x={view.cx - 4000} y={view.cy - 4000} width={8000} height={8000} fill="url(#vis-raster)" pointerEvents="none" />

      {/* Kanten */}
      {graph.edges.map((e) => {
        const von = graph.nodes.find((n) => n.id === e.from);
        const zu = graph.nodes.find((n) => n.id === e.to);
        if (!von || !zu) return null;
        const a = portPos(nodePos(von), e.fromPort, 'out');
        const b = portPos(nodePos(zu), e.toPort, 'in');
        const typ = VIS_NODE_KATALOG[von.typ]?.outputs.find((p) => p.name === e.fromPort)?.typ ?? 'prompt';
        const gewaehlt = auswahlEdge === e.id;
        return (
          <g key={e.id} data-testid="vis-edge">
            <path
              d={edgePfad(a, b)}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              style={{ cursor: 'pointer' }}
              onPointerDown={(ev) => {
                ev.stopPropagation();
                setAuswahlEdge(e.id);
              }}
            />
            <path
              d={edgePfad(a, b)}
              fill="none"
              stroke={gewaehlt ? 'var(--k-accent)' : PORT_FARBE[typ]}
              strokeWidth={gewaehlt ? 2.5 : 1.5}
              opacity={0.85}
              pointerEvents="none"
            />
            {gewaehlt && (
              <g
                transform={`translate(${(a.x + b.x) / 2}, ${(a.y + b.y) / 2})`}
                style={{ cursor: 'pointer' }}
                data-testid="edge-trennen"
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  sicher(() => runCommand('vis.trennen', { graphId, edgeId: e.id }));
                  setAuswahlEdge(null);
                }}
              >
                <circle r={9} fill="var(--k-raised)" stroke="var(--k-danger)" />
                <text textAnchor="middle" dominantBaseline="central" fontSize={10} fill="var(--k-danger)">✕</text>
              </g>
            )}
          </g>
        );
      })}

      {/* Pending-Kante folgt dem Zeiger */}
      {pending && (() => {
        const von = graph.nodes.find((n) => n.id === pending.from);
        if (!von) return null;
        const a = portPos(nodePos(von), pending.fromPort, 'out');
        return (
          <path
            d={edgePfad(a, { x: pending.x, y: pending.y })}
            fill="none"
            stroke={PORT_FARBE[pending.typ]}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            pointerEvents="none"
          />
        );
      })()}

      {/* Nodes */}
      {graph.nodes.map((n0) => {
        const n = nodePos(n0);
        const kat = VIS_NODE_KATALOG[n.typ];
        if (!kat) return null;
        const h = nodeHoehe(n0);
        const lauf = laeufe[n.id];
        const auftrag = auswertung?.renderAuftraege.get(n.id);
        const veraltet = lauf && auftrag && lauf.memoKey !== memoKey(auftrag);
        const koerperY = KOPF_H + 8 + Math.max(kat.inputs.length, kat.outputs.length) * PORT_ABSTAND;
        return (
          <g key={n.id} transform={`translate(${n.x}, ${n.y})`} data-testid={`vis-node-${n.typ}`}>
            {/* Karte mit geschnittener Ecke (Karteikarten-Verwandter) */}
            <path
              d={`M 0 0 H ${NODE_W - 12} L ${NODE_W} 12 V ${h} H 0 Z`}
              fill="var(--k-raised)"
              stroke="var(--k-mod-vis, var(--k-line-strong))"
              strokeWidth={1}
            />
            {/* Kopf = Drag-Griff */}
            <g
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                const p = toCanvas(e.clientX, e.clientY);
                setDrag({ nodeId: n.id, dx: p.x - n.x, dy: p.y - n.y, x: n.x, y: n.y });
                (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture?.(e.pointerId);
              }}
            >
              <rect width={NODE_W} height={KOPF_H} fill="transparent" />
              <text x={10} y={17} fontSize={11.5} fontWeight={650} fill="var(--k-ink)" style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {kat.label}
              </text>
              <text
                x={NODE_W - 10}
                y={17}
                fontSize={11}
                textAnchor="end"
                fill="var(--k-ink-faint)"
                style={{ cursor: 'pointer' }}
                data-testid="node-loeschen"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  sicher(() => runCommand('vis.nodeLoeschen', { graphId, nodeId: n.id }));
                }}
              >
                ✕
              </text>
            </g>
            <line x1={0} y1={KOPF_H} x2={NODE_W} y2={KOPF_H} stroke="var(--k-line)" />

            {/* Eingänge links */}
            {kat.inputs.map((p, i) => {
              const y = KOPF_H + 14 + i * PORT_ABSTAND;
              return (
                <g key={p.name}>
                  <circle
                    cx={0}
                    cy={y}
                    r={5}
                    fill={graph.edges.some((e) => e.to === n.id && e.toPort === p.name) ? PORT_FARBE[p.typ] : 'var(--k-raised)'}
                    stroke={PORT_FARBE[p.typ]}
                    strokeWidth={1.5}
                    data-testid={`port-in-${p.name}`}
                  />
                  {/* 16-px-Hitkreis */}
                  <circle
                    cx={0}
                    cy={y}
                    r={11}
                    fill="transparent"
                    style={{ cursor: 'crosshair' }}
                    onPointerUp={(e) => {
                      if (!pending) return;
                      e.stopPropagation();
                      sicher(() =>
                        runCommand('vis.verbinden', {
                          graphId,
                          from: pending.from,
                          fromPort: pending.fromPort,
                          to: n.id,
                          toPort: p.name,
                        }),
                      );
                      setPending(null);
                    }}
                  />
                  <text x={10} y={y + 3.5} fontSize={10} fill="var(--k-ink-soft)">{p.label}</text>
                </g>
              );
            })}

            {/* Ausgänge rechts */}
            {kat.outputs.map((p, i) => {
              const y = KOPF_H + 14 + i * PORT_ABSTAND;
              return (
                <g key={p.name}>
                  <circle cx={NODE_W} cy={y} r={5} fill={PORT_FARBE[p.typ]} stroke={PORT_FARBE[p.typ]} data-testid={`port-out-${p.name}`} />
                  <circle
                    cx={NODE_W}
                    cy={y}
                    r={11}
                    fill="transparent"
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={(e) => {
                      // KEIN Pointer-Capture: das pointerup muss den Ziel-Port treffen
                      e.stopPropagation();
                      const pos = toCanvas(e.clientX, e.clientY);
                      setPending({ from: n.id, fromPort: p.name, typ: p.typ, x: pos.x, y: pos.y });
                    }}
                  />
                  <text x={NODE_W - 10} y={y + 3.5} fontSize={10} textAnchor="end" fill="var(--k-ink-soft)">{p.label}</text>
                </g>
              );
            })}

            {/* Körper je Typ */}
            <foreignObject x={8} y={koerperY} width={NODE_W - 16} height={h - koerperY - 8}>
              <NodeKoerper
                graphId={graphId}
                node={n0}
                prompt={auswertung?.werte.get(n.id)?.['prompt'] as string | undefined}
                material={auswertung?.werte.get(n.id)?.['material'] as string | undefined}
                lauf={lauf}
                veraltet={!!veraltet}
                onAusfuehren={() => ausfuehren(n.id)}
                bildQuelle={bildQuelle}
              />
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}

/** HTML-Inhalt eines Nodes — Parameter committen bei blur (nie pro Tastendruck). */
function NodeKoerper({
  graphId,
  node,
  prompt,
  material,
  lauf,
  veraltet,
  onAusfuehren,
  bildQuelle,
}: {
  graphId: string;
  node: VisNode;
  prompt: string | undefined;
  material: string | undefined;
  lauf: { status: string; jobId?: string; bild?: string; qa?: { verdict: { passed: boolean } } | undefined; fehler?: string } | undefined;
  veraltet: boolean;
  onAusfuehren: () => void;
  bildQuelle: (nodeId: string, port: string) => { jobId: string; bild: string; qa?: { verdict: { passed: boolean } } | undefined } | null;
}) {
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  const param = (feld: string, wert: string | number | boolean) => {
    try {
      runCommand('vis.nodeParametrieren', { graphId, nodeId: node.id, params: { [feld]: wert } });
    } catch (err) {
      meldeFehler(err);
    }
  };
  const feld: React.CSSProperties = {
    width: '100%',
    padding: '3px 6px',
    border: '1px solid var(--k-line-strong)',
    borderRadius: 4,
    background: 'var(--k-surface)',
    fontSize: 11,
    fontFamily: 'inherit',
  };

  switch (node.typ) {
    case 'modell': {
      const teile = doc.byKind('wall').length + doc.byKind('slab').length + doc.byKind('roof').length;
      return <div style={{ fontSize: 10.5, color: 'var(--k-ink-faint)', fontFamily: 'var(--k-font-mono)' }}>Szene: {teile} Bauteile (GLB)</div>;
    }
    case 'material':
      return (
        <div style={{ fontSize: 10.5, color: 'var(--k-ink-soft)', lineHeight: 1.35, overflow: 'hidden' }}>
          {material || 'keine Material-Phrasen — Wandaufbauten sprechen mit'}
        </div>
      );
    case 'prompt':
      return (
        <textarea
          defaultValue={String(node.params['text'] ?? '')}
          key={String(node.params['text'] ?? '')}
          placeholder="Stil-Text …"
          rows={3}
          data-testid="prompt-text"
          onBlur={(e) => e.target.value !== node.params['text'] && param('text', e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ ...feld, resize: 'none' }}
        />
      );
    case 'stimmung':
      return (
        <select
          value={String(node.params['preset'] ?? 'morgen')}
          data-testid="stimmung-preset"
          onChange={(e) => param('preset', e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          style={feld}
        >
          {Object.entries(VIS_STIMMUNGEN).map(([key, s]) => (
            <option key={key} value={key}>{s.label}</option>
          ))}
        </select>
      );
    case 'zahl': {
      const min = Number(node.params['min'] ?? 0);
      const max = Number(node.params['max'] ?? 1);
      const schritt = Number(node.params['schritt'] ?? 0.05);
      return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onPointerDown={(e) => e.stopPropagation()}>
          <input
            type="range"
            min={min}
            max={max}
            step={schritt}
            defaultValue={Number(node.params['wert'] ?? 0)}
            data-testid="zahl-regler"
            onPointerUp={(e) => param('wert', Number((e.target as HTMLInputElement).value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10.5 }}>{Number(node.params['wert'] ?? 0)}</span>
        </div>
      );
    }
    case 'kombinierer':
      return (
        <div
          data-testid="kombinierer-prompt"
          style={{ fontSize: 10.5, color: 'var(--k-ink-soft)', lineHeight: 1.35, overflow: 'hidden', fontStyle: prompt ? 'normal' : 'italic' }}
        >
          {prompt || 'verbinde Stimmung / Stil / Material — der finale Prompt erscheint live'}
        </div>
      );
    case 'render': {
      const status = veraltet && lauf?.status === 'fertig' ? 'veraltet' : (lauf?.status ?? 'bereit');
      const statusFarbe =
        status === 'fertig' ? 'var(--k-success)' : status === 'fehler' ? 'var(--k-danger)' : status === 'bereit' ? 'var(--k-ink-faint)' : 'var(--k-warning)';
      return (
        <div style={{ display: 'grid', gap: 5 }} onPointerDown={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <KButton size="sm" tone="accent" data-testid="render-ausfuehren" onClick={onAusfuehren} disabled={lauf?.status === 'gesendet' || lauf?.status === 'rendert'}>
              Ausführen
            </KButton>
            <span data-testid="render-status" style={{ fontSize: 10, fontFamily: 'var(--k-font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: statusFarbe }}>
              {status}
            </span>
          </div>
          {lauf?.status === 'fertig' && lauf.jobId && lauf.bild ? (
            <img src={bildUrl(lauf.jobId, lauf.bild)} alt="Render" data-testid="render-bild" style={{ width: '100%', border: '1px solid var(--k-line)' }} />
          ) : (
            <div style={{ height: 110, border: '1px dashed var(--k-line-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--k-ink-faint)' }}>
              {lauf?.status === 'fehler' ? lauf.fehler : lauf ? 'rendert im GPU-Leerlauf …' : 'Bild erscheint hier'}
            </div>
          )}
        </div>
      );
    }
    case 'vergleich': {
      const bilder = ['bild1', 'bild2', 'bild3']
        .map((p) => bildQuelle(node.id, p))
        .filter((b): b is NonNullable<typeof b> => b !== null);
      return (
        <div style={{ display: 'flex', gap: 4 }} data-testid="vergleich-bilder">
          {bilder.length === 0 && (
            <div style={{ height: 110, flex: 1, border: '1px dashed var(--k-line-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--k-ink-faint)' }}>
              verbinde Render-Bilder
            </div>
          )}
          {bilder.map((b, i) => (
            <div key={i} style={{ flex: 1, display: 'grid', gap: 2 }}>
              <img src={bildUrl(b.jobId, b.bild)} alt={`Bild ${i + 1}`} style={{ width: '100%', border: '1px solid var(--k-line)' }} />
              {b.qa && (
                <span style={{ fontSize: 9, fontFamily: 'var(--k-font-mono)', color: b.qa.verdict.passed ? 'var(--k-success)' : 'var(--k-danger)' }}>
                  QA {b.qa.verdict.passed ? 'ok' : '✗'}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }
    case 'blatt': {
      const quelle = bildQuelle(node.id, 'bild');
      return (
        <div onPointerDown={(e) => e.stopPropagation()}>
          <KButton
            size="sm"
            tone="quiet"
            data-testid="blatt-ablegen"
            disabled={!quelle}
            onClick={() => {
              if (!quelle) return;
              void bildAufsBlatt(quelle.jobId, quelle.bild, String(node.params['titel'] ?? 'Visualisierung'))
                .then((name) => melde(`Render liegt auf «${name}» — im KosmoPublish weiterschieben`, { ton: 'erfolg' }))
                .catch((err) => meldeFehler(err));
            }}
          >
            Aufs Blatt
          </KButton>
        </div>
      );
    }
    case 'referenz': {
      const url = String(node.params['url'] ?? '');
      return (
        <div style={{ display: 'grid', gap: 4 }} onPointerDown={(e) => e.stopPropagation()}>
          <input
            defaultValue={url}
            key={url}
            placeholder="Bild-URL / data:-URL"
            onBlur={(e) => e.target.value !== url && param('url', e.target.value)}
            style={feld}
          />
          {url ? (
            <img src={url} alt="Referenz" style={{ width: '100%', border: '1px solid var(--k-line)' }} />
          ) : (
            <div style={{ height: 46, border: '1px dashed var(--k-line-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--k-ink-faint)' }}>
              Referenz / Splat-Ansicht
            </div>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
