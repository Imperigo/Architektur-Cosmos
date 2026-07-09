import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  deriveAutoKameras,
  evaluiereGraph,
  RENDER_PRESETS,
  VIS_NODE_KATALOG,
  VIS_STIMMUNGEN,
  type VisGraph,
  type VisNode,
  type VisPortTyp,
} from '@kosmo/kernel';
import { KButton, melde, meldeFehler } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import {
  abbrechenJob,
  bildAufsBlatt,
  bridgeBase,
  bridgeVermutlichCspGeblockt,
  freigebenJob,
  holeJob,
  istAuthFehler,
  mappeJobStatus,
  postRenderJob,
} from './vis-jobs';
import {
  istZeitUeberschritten,
  memoKey,
  type NodeLauf,
  OFFENE_LAUF_STATUS,
  RENDER_TIMEOUT_MS_DEFAULT,
  useVisRuntime,
} from './vis-runtime';
import { BridgeBild } from './BridgeBild';

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
  kameras: '#2b8a7a',
};

/** Höhe des Inhaltsbereichs je Node-Typ (Canvas-Einheiten). */
const KOERPER_H: Record<string, number> = {
  modell: 22,
  material: 40,
  prompt: 56,
  stimmung: 34,
  kombinierer: 64,
  zahl: 38,
  render: 192,
  vergleich: 132,
  blatt: 38,
  referenz: 92,
  kamera: 54,
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
  // P6-Review #6: Containergrösse als State (ResizeObserver) — die viewBox
  // aus getBoundingClientRect wäre beim Mount und nach Resize stale
  const [flaeche, setFlaeche] = useState({ w: 1200, h: 700 });
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

  // Ein Poll für alle offenen Render-Jobs (2.5 s — wie die Einfach-Ansicht).
  // HS3: die Wartezustände (Freigabe/GPU-Leerlauf) zählen als offen; ein
  // lokaler Wächter schlägt bei Zeitüberschreitung ehrlich an, statt ewig
  // «rendert» zu zeigen.
  useEffect(() => {
    const t = setInterval(() => {
      const jetzt = Date.now();
      const limitMs =
        Number(localStorage.getItem('kosmo.render.timeoutMs')) || RENDER_TIMEOUT_MS_DEFAULT;
      const offen = Object.entries(useVisRuntime.getState().laeufe).filter(
        ([, l]) => (OFFENE_LAUF_STATUS as readonly string[]).includes(l.status),
      );
      for (const [nodeId, lauf] of offen) {
        // Timeout-Wächter ZUERST — unabhängig von einer jobId (HS3-Auflage 2):
        // ein hängender POST bleibt sonst ewig «gesendet» ohne jobId und würde
        // nie ablaufen.
        if (istZeitUeberschritten(lauf, jetzt, limitMs)) {
          patchLauf(nodeId, {
            status: 'zeitueberschreitung',
            fehler: 'Zeitüberschreitung — Bridge/GPU meldet sich nicht.',
          });
          continue;
        }
        // Ohne jobId (POST noch nicht bestätigt) gibt es nichts abzufragen.
        if (!lauf.jobId) continue;
        const jobId = lauf.jobId;
        void holeJob(jobId)
          .then((j) => {
            // P6-Review #7: eine verspätete Antwort darf einen NEUEN Lauf
            // (anderer/kein jobId) nie als «fertig» markieren
            if (useVisRuntime.getState().laeufe[nodeId]?.jobId !== jobId) return;
            // Fortschritt/Worker mitführen (HS3-Auflage 5) — der Node zeigt sie.
            const marker: Partial<NodeLauf> = {
              ...(j.worker !== undefined ? { worker: j.worker } : {}),
              ...(j.progress !== undefined ? { progress: j.progress } : {}),
            };
            if (j.result) {
              patchLauf(nodeId, { ...marker, status: 'fertig', bild: j.result.images[0] ?? '', qa: j.result.qa });
            } else if (j.status === 'error') {
              patchLauf(nodeId, { ...marker, status: 'fehler', fehler: 'Render fehlgeschlagen' });
            } else {
              patchLauf(nodeId, { ...marker, status: mappeJobStatus(j) });
            }
          })
          .catch((err) => {
            // KLEIN 8: Ein Auth-Fehler (401/403) heisst falscher/fehlender
            // Token — der wurde früher still verschluckt und tauchte erst nach
            // 10 min als Zeitüberschreitung auf. Jetzt sofort ehrlich am Node.
            // (Wieder gegen den aktuellen jobId prüfen — kein Fremd-Lauf.)
            if (useVisRuntime.getState().laeufe[nodeId]?.jobId !== jobId) return;
            if (istAuthFehler(err)) {
              patchLauf(nodeId, {
                status: 'fehler',
                fehler: 'Bridge lehnt ab — Token fehlt oder ist falsch (KosmoVis-Einstellungen).',
              });
            }
            // Transiente Netzfehler NICHT hochziehen: der nächste Poll fasst
            // nach — ein einmaliger Aussetzer soll den Lauf nicht töten.
          });
      }
    }, 2500);
    return () => clearInterval(t);
  }, [patchLauf]);

  // Batch 6: useLayoutEffect statt useEffect — die Erstmessung muss VOR dem
  // ersten Browser-Paint sitzen. ResizeObserver feuert seinen ersten Callback
  // erst einen Tick später; bis dahin stand die viewBox auf dem 1200×700-
  // Platzhalter. Ein Klick/Drag, der in genau diesem Fenster startet (z.B.
  // E2E-Port-Drag), traf noch die Platzhalter-Koordinaten — der folgende
  // Resize-Snap auf die echte Grösse verschob Ports unter dem Zeiger weg,
  // der Down landete dadurch auf dem leeren Canvas statt auf dem Port und
  // startete Pan statt Pending-Edge (die eigentliche Ursache der Flakiness).
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    if (r.width > 0) setFlaeche({ w: r.width, h: r.height });
    const ro = new ResizeObserver((eintraege) => {
      const rect = eintraege[0]?.contentRect;
      if (rect && rect.width > 0) setFlaeche({ w: rect.width, h: rect.height });
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

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
    setzeLauf(nodeId, { status: 'gesendet', memoKey: key, gestartetUm: Date.now() });
    void postRenderJob(auftrag)
      .then((j) =>
        patchLauf(nodeId, {
          jobId: j.job_id,
          status: mappeJobStatus(j),
          ...(j.approval_token !== undefined ? { approvalToken: j.approval_token } : {}),
        }),
      )
      .catch((err) => {
        // TypeError = fetch-Netzfehler → ehrliche Offline-Meldung (§2.1.5),
        // nicht der kryptische «Failed to fetch»-Rohtext. KLEIN 9: Ist die
        // Bridge-URL eine LAN-IP, ist der «Netzfehler» in Wahrheit oft die CSP
        // — das wird benannt, damit niemand vergeblich die Firewall sucht.
        const offline = err instanceof TypeError;
        const cspGeblockt = offline && bridgeVermutlichCspGeblockt();
        patchLauf(nodeId, {
          status: 'fehler',
          fehler: cspGeblockt
            ? 'Bridge-Adresse ist eine LAN-IP, die die CSP nicht erlaubt (nur localhost/127.0.0.1) — am selben Gerät über localhost ansprechen. (Offline)'
            : offline
              ? 'Bridge nicht erreichbar — läuft die HomeStation-Bridge? (Offline)'
              : err instanceof Error
                ? err.message
                : String(err),
        });
        meldeFehler(err);
      });
  };

  /** Wartenden Job freigeben (nur bei aktiver Freigabe-Pflicht). */
  const freigeben = (nodeId: string) => {
    const lauf = useVisRuntime.getState().laeufe[nodeId];
    if (!lauf?.jobId || !lauf.approvalToken) return;
    void freigebenJob(lauf.jobId, lauf.approvalToken)
      .then((j) => patchLauf(nodeId, { status: mappeJobStatus(j) }))
      .catch(meldeFehler);
  };

  /** Kooperativer Abbruch eines wartenden/laufenden Jobs. */
  const abbrechen = (nodeId: string) => {
    const lauf = useVisRuntime.getState().laeufe[nodeId];
    if (!lauf?.jobId) return;
    void abbrechenJob(lauf.jobId)
      .then((j) => patchLauf(nodeId, { status: mappeJobStatus(j) }))
      .catch(meldeFehler);
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
        const w = flaeche.w / view.scale;
        const h = flaeche.h / view.scale;
        return `${view.cx - w / 2} ${view.cy - h / 2} ${w} ${h}`;
      })()}
      onPointerDown={(e) => {
        if (e.target === svgRef.current) {
          panning.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
          // Wie beim Node-Kopf-Griff (unten) mit `?.` statt blankem Aufruf:
          // ein zwischenzeitlich schon abgelaufener/losgelassener Pointer
          // (schnelle Klickfolge, manche Browser/Webviews) darf das Pannen
          // selbst nicht zum Fehler machen — die Position tracken wir ohnehin
          // per pointermove auf dem svg, Capture ist nur die Komfort-Zugabe.
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setAuswahlEdge(null);
        }
      }}
      onPointerMove={(e) => {
        // F6 (v0.6.4): NICHT panning.current im setView-Updater lesen — die
        // Updater-Funktion läuft erst, wenn React den Zustand tatsächlich
        // verarbeitet, was NACH diesem Event liegen kann. Feuert dazwischen
        // ein pointerup (setzt panning.current = null, z.B. bei einem
        // schnellen Los-/Klick-Ende), lesen ältere, noch nicht geflushte
        // pointermove-Updater den Ref dann als null — «Cannot read properties
        // of null (reading 'cx')», von der KFehlerzone gefangen (Owner-Befund
        // F6: Absturz beim Pannen des Node-Trees). Fix: den Anfangszustand
        // JETZT in eine lokale Konstante schnappen — die bleibt stabil, ganz
        // gleich, was mit dem Ref danach passiert.
        const anfang = panning.current;
        if (anfang) {
          const { clientX, clientY } = e;
          setView((v) => ({
            ...v,
            cx: anfang.cx - (clientX - anfang.x) / view.scale,
            cy: anfang.cy - (clientY - anfang.y) / view.scale,
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
                onFreigeben={() => freigeben(n.id)}
                onAbbrechen={() => abbrechen(n.id)}
                cloudLeer={bridgeBase() === ''}
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
  onFreigeben,
  onAbbrechen,
  cloudLeer,
  bildQuelle,
}: {
  graphId: string;
  node: VisNode;
  prompt: string | undefined;
  material: string | undefined;
  lauf: { status: string; jobId?: string; bild?: string; qa?: { verdict: { passed: boolean } } | undefined; fehler?: string; worker?: string; progress?: { phase: string; pct: number } } | undefined;
  veraltet: boolean;
  onAusfuehren: () => void;
  onFreigeben: () => void;
  onAbbrechen: () => void;
  cloudLeer: boolean;
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
  // Bug T4a: ein Node OHNE `params` (Hand-Edit/Fremd-Import/Yjs-Merge von
  // einem anderen Stand) darf die Station nie abstürzen lassen — fehlende
  // Parameter zählen wie leere/Default-Werte (Wurzel-Fix in derive/visgraph.ts
  // spiegelt sich hier, weil der Node-Körper dieselben Felder direkt liest).
  const params = node.params ?? {};

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
          defaultValue={String(params['text'] ?? '')}
          key={String(params['text'] ?? '')}
          placeholder="Stil-Text …"
          rows={3}
          data-testid="prompt-text"
          onBlur={(e) => e.target.value !== params['text'] && param('text', e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ ...feld, resize: 'none' }}
        />
      );
    case 'stimmung':
      return (
        <select
          value={String(params['preset'] ?? 'morgen')}
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
      const min = Number(params['min'] ?? 0);
      const max = Number(params['max'] ?? 1);
      const schritt = Number(params['schritt'] ?? 0.05);
      return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onPointerDown={(e) => e.stopPropagation()}>
          <input
            type="range"
            key={String(params['wert'] ?? 0)}
            min={min}
            max={max}
            step={schritt}
            defaultValue={Number(params['wert'] ?? 0)}
            data-testid="zahl-regler"
            onPointerUp={(e) => param('wert', Number((e.target as HTMLInputElement).value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10.5 }}>{Number(params['wert'] ?? 0)}</span>
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
      const roh = lauf?.status ?? 'bereit';
      const status = veraltet && roh === 'fertig' ? 'veraltet' : roh;
      // Menschliche Beschriftung — der Poll/Status-Enum bleibt intern, hier
      // steht, was der Architekt lesen soll (E2E prüft genau diese Texte).
      const STATUS_LABEL: Record<string, string> = {
        bereit: 'bereit',
        gesendet: 'gesendet',
        wartetFreigabe: 'wartet auf Freigabe',
        wartetGpu: 'wartet auf GPU-Leerlauf',
        rendert: 'rendert',
        fertig: 'fertig',
        fehler: 'fehler',
        abgebrochen: 'abgebrochen',
        zeitueberschreitung: 'Zeitüberschreitung',
        veraltet: 'veraltet',
      };
      const gruen = status === 'fertig';
      const rot = status === 'fehler' || status === 'zeitueberschreitung';
      const grau = status === 'bereit' || status === 'abgebrochen';
      const statusFarbe = gruen
        ? 'var(--k-success)'
        : rot
          ? 'var(--k-danger)'
          : grau
            ? 'var(--k-ink-faint)'
            : 'var(--k-warning)';
      const laeuftNoch = ['gesendet', 'wartetFreigabe', 'wartetGpu', 'rendert'].includes(status);
      return (
        <div style={{ display: 'grid', gap: 5 }} onPointerDown={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <KButton
              size="sm"
              tone="accent"
              data-testid="render-ausfuehren"
              onClick={onAusfuehren}
              disabled={laeuftNoch || cloudLeer}
              title={cloudLeer ? 'Kein HomeStation-Server verbunden — im Cloud-Betrieb rendert die Kette nicht lokal.' : undefined}
            >
              Ausführen
            </KButton>
            {status === 'wartetFreigabe' && (
              <KButton size="sm" tone="quiet" data-testid="render-freigeben" onClick={onFreigeben}>
                Freigeben
              </KButton>
            )}
            {laeuftNoch && (
              <KButton size="sm" tone="ghost" data-testid="render-abbrechen" onClick={onAbbrechen}>
                Abbrechen
              </KButton>
            )}
            <span data-testid="render-status" style={{ fontSize: 10, fontFamily: 'var(--k-font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: statusFarbe }}>
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
          {/* HS5: «Nur Cycles» bestellt reines Cycles statt KI-Veredelung. */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--k-ink-soft)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              data-testid="render-nur-cycles"
              checked={params['nurCycles'] === true}
              onChange={(e) => param('nurCycles', e.target.checked)}
            />
            nur Cycles (keine KI-Veredelung)
          </label>
          {/* K20/A10: Cycles-Preset (Samples/Auflösung/Sonne/Komposition) — regelbasierte
              Datentabelle, kein KI-Vorschlag. Leer = bisheriger Default (128 Samples). */}
          <select
            value={String(params['preset'] ?? '')}
            data-testid="vis-preset-select"
            onChange={(e) => param('preset', e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            style={feld}
          >
            <option value="">kein Preset (Default 128 Samples)</option>
            {RENDER_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {/* Worker + Fortschritt, sobald der Worker den Job hält (HS3-Auflage 5). */}
          {(lauf?.worker || lauf?.progress) && (status === 'rendert' || status === 'wartetGpu') && (
            <div data-testid="render-fortschritt" style={{ fontSize: 9.5, fontFamily: 'var(--k-font-mono)', color: 'var(--k-ink-soft)' }}>
              {lauf.worker ?? 'worker'}
              {lauf.progress ? ` · ${lauf.progress.phase} ${Math.round(lauf.progress.pct * 100)}%` : ''}
            </div>
          )}
          {status === 'fertig' && lauf?.jobId && lauf.bild ? (
            <BridgeBild jobId={lauf.jobId} imageName={lauf.bild} alt="Render" testid="render-bild" style={{ width: '100%', border: '1px solid var(--k-line)' }} />
          ) : (
            <div style={{ height: 110, border: '1px dashed var(--k-line-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 6, fontSize: 10, color: rot ? 'var(--k-danger)' : 'var(--k-ink-faint)' }}>
              {rot
                ? (lauf?.fehler ?? 'Render fehlgeschlagen')
                : status === 'fertig'
                  ? 'fertig — aber kein Bild geliefert'
                  : status === 'wartetFreigabe'
                    ? 'wartet auf Freigabe — «Freigeben» startet den Render'
                    : status === 'wartetGpu'
                      ? 'wartet auf GPU-Leerlauf …'
                      : status === 'abgebrochen'
                        ? 'abgebrochen'
                        : lauf
                          ? 'rendert im GPU-Leerlauf …'
                          : cloudLeer
                            ? 'Cloud-Betrieb: kein lokaler Render'
                            : 'Bild erscheint hier'}
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
              <BridgeBild jobId={b.jobId} imageName={b.bild} alt={`Bild ${i + 1}`} style={{ width: '100%', border: '1px solid var(--k-line)' }} />
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
              void bildAufsBlatt(quelle.jobId, quelle.bild, String(params['titel'] ?? 'Visualisierung'))
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
      const url = String(params['url'] ?? '');
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
    case 'kamera': {
      // Reine Anzeige — live aus den aktuellen Modell-Bounds abgeleitet,
      // nie gespeichert (wie der Material-Node). Ehrlich: «Vorschlag aus dem
      // Modell», keine KI-Wahl.
      const kameras = deriveAutoKameras(doc);
      return (
        <div style={{ display: 'grid', gap: 3, fontSize: 10, color: 'var(--k-ink-soft)' }} data-testid="vis-auto-kamera-liste">
          {kameras.length === 0 ? (
            <span style={{ fontStyle: 'italic', color: 'var(--k-ink-faint)' }}>
              Keine Geometrie im Modell — nichts abzuleiten.
            </span>
          ) : (
            kameras.map((k) => (
              <div key={k.name} title={k.begruendung}>
                <b>{k.name}</b> — Vorschlag aus dem Modell
              </div>
            ))
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
