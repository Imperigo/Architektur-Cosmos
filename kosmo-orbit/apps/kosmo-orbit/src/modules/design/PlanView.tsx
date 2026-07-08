import { useEffect, useMemo, useRef, useState } from 'react';
import { derivePlan, deriveDimensions, dimensionLabel, moebelGeometrie, pruefeGrundriss, raumGraph, regionToPath, type Furniture, type Pt, type Zone } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import { useUnternehmerplan } from './unternehmerplan';
import type { ViewportHandlers } from './Viewport3D';
import { SketchOverlay } from './SketchOverlay';
import { outlineOf, pickEntityAt } from './plan-hit-test';
import { NavLeiste } from './NavLeiste';

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
  // Raumgraph-Overlay (Finch-Clip): Knoten auf Raumzentren, Kanten an Übergängen
  const [graphAn, setGraphAn] = useState(false);
  // Trace (RE-ARCHICAD A8): anderes Geschoss blass unterlegen — reine
  // Arbeitshilfe am Bildschirm, nie Planinhalt
  const [traceId, setTraceId] = useState<string>('');
  // T3: Stützenraster-Achsen (Konstruktionslinien des Tragrasters) standard-
  // mässig aus — nur das Bauteil, nicht die Zeichen-Achse. Über den Umschalter
  // wieder einblendbar (Druck/Export bleibt unverändert, siehe derive/plan.ts).
  const [achsenAn, setAchsenAn] = useState(false);
  // T3: Navigations-Modus fürs linke Mausdrücken (Trackpad-Komfort) — Rad,
  // Mitteltaste, Rechtsklick/Alt-Klick bleiben unverändert Pan/Zoom.
  const [navModus2d, setNavModus2d] = useState<'werkzeug' | 'pan' | 'zoom'>('werkzeug');
  const zoomDrag = useRef<{ y: number; scale: number } | null>(null);
  const graph = useMemo(() => {
    if (!graphAn || !activeStoreyId) return null;
    const g = raumGraph(doc, activeStoreyId);
    const zentrum = (z: Zone) => {
      let x = 0, y = 0;
      for (const p of z.outline) { x += p.x; y += p.y; }
      return { x: x / z.outline.length, y: y / z.outline.length };
    };
    // Nur echte Räume (mit Raumtyp) — Container wie Geschoss/Wohnungs-Umriss
    // haben keinen und würden den Graph zum Spinnennetz machen
    const raeume = g.zonen.filter((z) => z.raumTyp);
    const zentren = new Map(raeume.map((z) => [z.id, zentrum(z)]));
    return { zentren, kanten: g.kanten.filter((k) => zentren.has(k.a) && zentren.has(k.b)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphAn, doc, activeStoreyId, revision]);

  // F3: Zonen mit Check-Befunden (Regeln/Fluchtweg) im Plan tönen
  const verletzteZonen = useMemo(() => {
    if (!activeStoreyId) return [];
    const befunde = pruefeGrundriss(doc, activeStoreyId);
    const proZone = new Map<string, 'fehler' | 'warnung'>();
    for (const b of befunde) {
      if (!b.entityId || b.schwere === 'hinweis') continue;
      const e = doc.get(b.entityId);
      if (!e || e.kind !== 'zone') continue;
      if (b.schwere === 'fehler' || !proZone.has(b.entityId)) {
        proZone.set(b.entityId, b.schwere);
      }
    }
    return [...proZone.entries()].map(([id, schwere]) => ({
      zone: doc.get(id) as Zone,
      schwere,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, activeStoreyId, revision]);
  // C4b (C-E5, docs/SUBMISSION-KONZEPT.md): Unternehmerplan-Referenz-Overlay —
  // reine Laufzeitschicht (`modules/design/unternehmerplan.ts`), nie im Doc.
  const unternehmerDxf = useUnternehmerplan((s) => s.dxf);
  const overlaySichtbar = useUnternehmerplan((s) => s.overlaySichtbar);
  const overlayUmschalten = useUnternehmerplan((s) => s.overlayUmschalten);

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
  const tracePlan = useMemo(
    () => (traceId && traceId !== activeStoreyId && doc.get(traceId) ? derivePlan(doc, traceId) : null),
    [doc, traceId, activeStoreyId, revision],
  );
  const dims = useMemo(
    () => (activeStoreyId ? deriveDimensions(doc, activeStoreyId) : null),
    [doc, activeStoreyId, revision],
  );

  // Trefferzone + Umriss leben in plan-hit-test.ts (eigener Unit-Test, unabhängig
  // von derivePlan/den Poché-Regionen — die Goldens bleiben unberührt).
  const pickAt = (p: Pt): string | null => (activeStoreyId ? pickEntityAt(doc, activeStoreyId, p) : null);
  // Ziehen im Plan: EIN design.verschieben bei pointerup, kein Patch pro Move
  const moveActive = useRef(false);
  const selection = useProject((s) => s.selection);

  const toWorld = (clientX: number, clientY: number): Pt => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = clientX - rect.left - rect.width / 2;
    const py = clientY - rect.top - rect.height / 2;
    return {
      x: Math.round(view.cx + px / view.scale),
      y: Math.round(view.cy - py / view.scale),
    };
  };

  // T3: «Einpassen» — auf den Modellinhalt zoomen (Home/Fit-Knopf UND einmalig
  // beim Einhängen, z.B. geladenes Projekt). Ohne Inhalt: neutraler Startwert,
  // kein Sprung ins Leere.
  const einpassen = () => {
    const b = plan?.bounds;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    if (!b) {
      setView({ cx: 5000, cy: 3000, scale: 0.05 });
      return;
    }
    const w = Math.max(b.maxX - b.minX, 2000);
    const h = Math.max(b.maxY - b.minY, 2000);
    const scale = Math.min(1, Math.max(0.005, Math.min(rect.width / (w * 1.25), rect.height / (h * 1.25))));
    setView({ cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, scale });
  };

  // Bewusst NUR beim Mount: während des Zeichnens darf die Ansicht nie springen.
  useEffect(() => {
    einpassen();
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
      <select
        data-testid="trace-select"
        value={traceId}
        onChange={(e) => setTraceId(e.target.value)}
        title="Trace: anderes Geschoss blass unterlegen (nur Bildschirm)"
        style={{
          position: 'absolute', top: 8, right: 70, zIndex: 5, padding: '3px 6px',
          borderRadius: 6, border: '1px solid var(--k-line-strong)', cursor: 'pointer',
          background: traceId ? '#7a5c9e' : 'var(--k-raised)', color: traceId ? 'white' : 'inherit',
          font: 'inherit', fontSize: 11.5,
        }}
      >
        <option value="">Trace</option>
        {doc.storeysOrdered().filter((s) => s.id !== activeStoreyId).map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      {unternehmerDxf && (
        <button
          data-testid="unternehmerplan-toggle"
          onClick={() => overlayUmschalten()}
          title="Unternehmerplan-Referenz ein-/ausblenden (Durchpaus-Layer, nur Bildschirm, C4b)"
          style={{
            position: 'absolute', top: 8, right: 215, zIndex: 5, padding: '3px 10px',
            borderRadius: 6, border: '1px solid var(--k-line-strong)', cursor: 'pointer',
            background: overlaySichtbar ? '#2455a4' : 'var(--k-raised)', color: overlaySichtbar ? 'white' : 'inherit',
            font: 'inherit', fontSize: 11.5,
          }}
        >
          U-Plan
        </button>
      )}
      <button
        data-testid="graph-toggle"
        onClick={() => setGraphAn(!graphAn)}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 5, padding: '3px 10px',
          borderRadius: 6, border: '1px solid var(--k-line-strong)', cursor: 'pointer',
          background: graphAn ? '#2455a4' : 'var(--k-raised)', color: graphAn ? 'white' : 'inherit',
          font: 'inherit', fontSize: 11.5,
        }}
      >
        Graph
      </button>
      <button
        data-testid="achsen-toggle"
        onClick={() => setAchsenAn(!achsenAn)}
        title="Stützenraster-Achsen (Konstruktionslinien) ein-/ausblenden — nur Bildschirm, Druck/Export unverändert"
        style={{
          position: 'absolute', top: 8, right: 140, zIndex: 5, padding: '3px 10px',
          borderRadius: 6, border: '1px solid var(--k-line-strong)', cursor: 'pointer',
          background: achsenAn ? '#2455a4' : 'var(--k-raised)', color: achsenAn ? 'white' : 'inherit',
          font: 'inherit', fontSize: 11.5,
        }}
      >
        Achsen
      </button>
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
          // T3: Pan-/Zoom-Modus (Nav-Leiste) gibt dem linken Klick zusätzlich
          // die Bedeutung des gewählten Knopfs — Mitteltaste/Rechtsklick/Alt
          // bleiben unabhängig davon IMMER Pan (kein Funktionsverlust).
          if (e.button === 1 || e.button === 2 || e.altKey || (e.button === 0 && navModus2d === 'pan')) {
            panning.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
            (e.target as Element).setPointerCapture(e.pointerId);
          } else if (e.button === 0 && navModus2d === 'zoom') {
            zoomDrag.current = { y: e.clientY, scale: view.scale };
            (e.target as Element).setPointerCapture(e.pointerId);
          } else if (e.button === 0 && handlers.current?.pickMode && activeStoreyId) {
            // Auswahl-Werkzeug: Treffer auf einem Bauteil startet gleich die
            // Zieh-Geste (Klick ohne Bewegung = reine Auswahl, dx/dy bleiben 0).
            const p = toWorld(e.clientX, e.clientY);
            const hit = pickEntityAt(doc, activeStoreyId, p);
            if (hit && handlers.current.onMoveStart?.(hit, p)) {
              moveActive.current = true;
              (e.target as Element).setPointerCapture(e.pointerId);
            }
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
          if (zoomDrag.current) {
            // Nach oben ziehen = näher ran (ArchiCAD-Zoom-Werkzeug), Distanz→Faktor
            // wie beim Mausrad-Handler oben, nur pixelbasiert statt deltaY-basiert.
            const dy = e.clientY - zoomDrag.current.y;
            const factor = Math.exp(-dy * 0.004);
            setView((v) => ({ ...v, scale: Math.min(1, Math.max(0.005, zoomDrag.current!.scale * factor)) }));
            return;
          }
          if (panning.current) {
            const dx = (e.clientX - panning.current.x) / view.scale;
            const dy = (e.clientY - panning.current.y) / view.scale;
            setView((v) => ({ ...v, cx: panning.current!.cx - dx, cy: panning.current!.cy + dy }));
          } else if (moveActive.current) {
            handlers.current?.onMoveDrag?.(toWorld(e.clientX, e.clientY));
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
          if (zoomDrag.current) {
            zoomDrag.current = null;
            return;
          }
          if (panning.current) {
            panning.current = null;
            return;
          }
          if (moveActive.current) {
            moveActive.current = false;
            handlers.current?.onMoveEnd?.(toWorld(e.clientX, e.clientY));
            return;
          }
          if (e.button !== 0) return;
          const p = toWorld(e.clientX, e.clientY);
          if (handlers.current?.pickMode) {
            handlers.current.onPick?.(pickAt(p));
            return;
          }
          handlers.current?.onGroundClick?.({ p, shiftKey: e.shiftKey });
        }}
        onDoubleClick={(e) => {
          // ArchiCAD-Geste: Doppelklick schliesst/setzt die laufende Platzierung ab
          if (moveActive.current || handlers.current?.pickMode) return;
          const p = toWorld(e.clientX, e.clientY);
          handlers.current?.onGroundDoubleClick?.({ p, shiftKey: e.shiftKey });
        }}
        onPointerCancel={(e) => {
          if (e.pointerType === 'touch') {
            touches.current.delete(e.pointerId);
            if (touches.current.size < 2) pinch.current = null;
            if (touches.current.size === 0) gestureAktiv.current = false;
          }
          moveActive.current = false;
          zoomDrag.current = null;
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          {/* SIA-Schraffuren — Beton: Tönung + Diagonale wie im Schnitt
              (derive/schraffur.ts KATALOG.beton: abstand 1.8 Papier-mm,
              tint #dad7d1). Die alte 140-mm-Kachel mit reinem Papierhintergrund
              zeigte je nach Wanddicke fast keine Linie und keine Tönung —
              «Beton» war optisch kaum von leerer Fläche zu unterscheiden.
              Jetzt: feste Betontönung (Print-Konvention, nicht Theme-abhängig,
              wie schon die Schnitt-Schraffur) + engere 40-mm-Kachel, damit auch
              dünne Wände mehrere Linien zeigen. */}
          <pattern id="hatch-beton" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(45)">
            <rect width="40" height="40" fill="#dad7d1" />
            <line x1="0" y1="0" x2="0" y2="40" stroke="#333" strokeWidth="5" />
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

          {/* Trace (A8): anderes Geschoss blass darunter — einfarbig, gedämpft */}
          {tracePlan && (
            <g data-testid="trace-layer" opacity={0.25} pointerEvents="none">
              {tracePlan.regions.map((r, i) => (
                <path
                  key={`t${i}`}
                  d={regionToPath(r)}
                  fillRule="evenodd"
                  fill={r.classes.includes('projection') ? 'none' : 'var(--k-ink-faint)'}
                  stroke="var(--k-ink-soft)"
                  strokeWidth={10}
                />
              ))}
              {tracePlan.lines.map((l, i) => (
                <line key={`tl${i}`} x1={l.a.x} y1={-l.a.y} x2={l.b.x} y2={-l.b.y} stroke="var(--k-ink-soft)" strokeWidth={8} />
              ))}
            </g>
          )}

          {/* Unternehmerplan-Referenz-Overlay (C4b, C-E5): reiner Durchpaus-
              Layer in einer Akzentfarbe, nie wählbar (pointerEvents="none"),
              nur wenn ein DXF geladen UND sichtbar geschaltet ist — ohne
              Unternehmerplan bleibt das SVG byte-identisch (Golden-Guard). */}
          {unternehmerDxf && overlaySichtbar && (
            <g data-testid="unternehmerplan-overlay" opacity={0.45} pointerEvents="none">
              {unternehmerDxf.lines.map((l, i) => (
                <line key={`ul${i}`} x1={l.a.x} y1={-l.a.y} x2={l.b.x} y2={-l.b.y} stroke="#1a6fb5" strokeWidth={14} />
              ))}
              {unternehmerDxf.regions.map((r, i) => (
                <polygon
                  key={`ur${i}`}
                  points={r.ring.map((p) => `${p.x},${-p.y}`).join(' ')}
                  fill="none"
                  stroke="#1a6fb5"
                  strokeWidth={14}
                />
              ))}
              {unternehmerDxf.texte.map((t, i) => (
                <text
                  key={`ut${i}`}
                  x={t.at.x}
                  y={-t.at.y}
                  textAnchor="middle"
                  fontSize={220}
                  fontFamily="ui-monospace, monospace"
                  fill="#1a6fb5"
                >
                  {t.text}
                </text>
              ))}
            </g>
          )}

          {plan &&
            plan.regions.map((r, i) => {
              const cls = r.classes.join(' ');
              // A3: Stützen sind immer geschnitten → Poché wie tragend
              const isCore = r.classes.includes('tragend') || r.classes.includes('stuetze');
              const isDaemmung = r.classes.includes('daemmung');
              const isProjection = r.classes.includes('projection');
              // Umbau-Farbcode (SIA 400): Neubau rot, Abbruch gelb, Bestand einheitlich grau
              const neu = r.classes.includes('renovation-neu');
              const abbruch = r.classes.includes('renovation-abbruch');
              // K2 (Owner-Rundgang 0.6.2, S. 18): explizit markierter Bestand
              // bekommt EINE einheitliche graue Fläche über alle Schichten —
              // sonst tönte nur die tragende Schicht (hatch-beton), die
              // Dämmung/Bekleidung blieb weiss ("hälftig grau").
              const bestand = r.classes.includes('renovation-bestand');
              return (
                <path
                  key={i}
                  d={regionToPath(r)}
                  fillRule="evenodd"
                  className={cls}
                  fill={
                    neu
                      ? 'rgba(179, 38, 30, 0.22)'
                      : abbruch
                        ? 'rgba(214, 178, 20, 0.35)'
                        : bestand
                          ? '#c9c9c9'
                          : isCore
                            ? 'url(#hatch-beton)'
                            : isDaemmung
                              ? 'url(#hatch-daemmung)'
                              : isProjection
                                ? 'none'
                                : 'var(--k-surface)'
                  }
                  stroke={neu ? '#b3261e' : abbruch ? '#8a7500' : 'var(--k-ink)'}
                  strokeWidth={isProjection ? 8 : isCore ? 24 : 12}
                  strokeDasharray={
                    r.classes.includes('volumen')
                      ? '120 60'
                      : abbruch
                        ? '150 80'
                        : r.classes.includes('ueber-schnitt')
                          ? '150 60 30 60'
                          : undefined
                  }
                  opacity={r.classes.includes('decke') ? 0.5 : 1}
                />
              );
            })}

          {/* F8: Möbel — Korpus fein, Bewegungsfläche gestrichelt (Bildschirm) */}
          {doc
            .byKind<Furniture>('furniture')
            .filter((f) => f.storeyId === activeStoreyId)
            .map((f) => {
              const g = moebelGeometrie(f);
              if (!g) return null;
              const d = (poly: Pt[]) => `M ${poly.map((p) => `${p.x} ${-p.y}`).join(' L ')} Z`;
              return (
                <g key={f.id} data-testid="moebel">
                  <path d={d(g.korpus)} fill="none" stroke="var(--k-ink-soft)" strokeWidth={10} />
                  <path d={d(g.bewegung)} fill="none" stroke="var(--k-ink-faint)" strokeWidth={6} strokeDasharray="60 40" />
                </g>
              );
            })}
          {/* Zonentüren kommen seit A4 als Linien-Klassen aus derivePlan
              (zonentuer-luecke/-fluegel) — der Druck erbt dasselbe Symbol. */}
          {plan &&
            /* F3: verletzte Zonen live tönen (nur Bildschirm, nicht Druck) */
            verletzteZonen.map((v) => (
              <path
                key={`verletzt-${v.zone.id}`}
                data-testid="zone-verletzt"
                d={`M ${v.zone.outline.map((p) => `${p.x} ${-p.y}`).join(' L ')} Z`}
                fill={v.schwere === 'fehler' ? 'rgba(179, 70, 46, 0.28)' : 'rgba(198, 134, 34, 0.22)'}
                stroke={v.schwere === 'fehler' ? 'var(--k-danger)' : '#c68622'}
                strokeWidth={16}
              />
            ))}
          {graph && (
            <g data-testid="raumgraph-overlay">
              {graph.kanten.map((k, i) => {
                const a = graph.zentren.get(k.a);
                const b = graph.zentren.get(k.b);
                if (!a || !b) return null;
                return (
                  <g key={i}>
                    <path
                      d={`M ${a.x} ${-a.y} L ${k.punkt.x} ${-k.punkt.y} L ${b.x} ${-b.y}`}
                      fill="none" stroke="#2455a4" strokeWidth={30} opacity={0.55}
                    />
                    <circle cx={k.punkt.x} cy={-k.punkt.y} r={90} fill="#2455a4" opacity={0.8} />
                  </g>
                );
              })}
              {[...graph.zentren.values()].map((z, i) => (
                <circle key={`n${i}`} cx={z.x} cy={-z.y} r={200} fill="#2455a4" opacity={0.9} />
              ))}
            </g>
          )}
          {plan &&
            plan.lines.map((l, i) => {
              const luecke = l.classes.includes('zonentuer-luecke');
              const fluegel = l.classes.includes('zonentuer-fluegel');
              return (
                <line
                  key={`l${i}`}
                  className={l.classes.join(' ')}
                  data-testid={fluegel ? 'zonentuer' : undefined}
                  x1={l.a.x}
                  y1={-l.a.y}
                  x2={l.b.x}
                  y2={-l.b.y}
                  stroke={
                    luecke
                      ? 'var(--k-surface)'
                      : l.classes.includes('baugrenze')
                        ? 'var(--k-danger)'
                        : l.classes.includes('renovation-neu')
                          ? '#b3261e'
                          : l.classes.includes('renovation-abbruch')
                            ? '#8a7500'
                            : 'var(--k-ink)'
                  }
                  strokeWidth={luecke ? 120 : fluegel ? 12 : l.classes.includes('fenster') || l.classes.includes('unterzug') ? 10 : l.classes.includes('baugrenze') ? 12 : 14}
                  strokeDasharray={
                    l.classes.includes('baugrenze')
                      ? '300 90 60 90'
                      : l.classes.includes('ueber-schnitt')
                        ? '150 60 30 60'
                        : l.classes.includes('unterzug')
                          ? '120 70'
                          : undefined
                  }
                />
              );
            })}

          {/* Plan-Beschriftungen (A3: Aussparungs-Koten, A6: Etiketten) */}
          {plan &&
            plan.texte.map((t, i) => (
              <text
                key={`t${i}`}
                className={t.classes.join(' ')}
                x={t.at.x}
                y={-t.at.y + (t.zeile ?? 0) * 300}
                textAnchor="middle"
                fontSize={220}
                fontFamily="ui-monospace, monospace"
                fill="var(--k-ink)"
              >
                {t.text}
              </text>
            ))}

          {/* Stützenraster: Achsen strichpunktiert + Achskopf an beiden Enden.
              T3: standardmässig aus (nur das Bauteil, nicht die Konstruktions-
              achse) — per «Achsen»-Knopf wieder einblendbar. Reine App-Schicht
              (PlanView), derive/plan.ts und der Druck-Pfad (plansvg.ts) bleiben
              unverändert — Goldens sind davon nicht betroffen. */}
          {achsenAn && plan &&
            plan.axes.map((ax, i) => {
              const haupt = ax.typ === 'haupt';
              return (
                <g key={`gx${i}`} data-testid="grid-achse">
                  <line
                    x1={ax.a.x}
                    y1={-ax.a.y}
                    x2={ax.b.x}
                    y2={-ax.b.y}
                    stroke="var(--k-ink-faint)"
                    strokeWidth={haupt ? 9 : 5}
                    strokeDasharray={haupt ? '300 90 60 90' : '120 90'}
                  />
                  {haupt &&
                    ax.label &&
                    [ax.a, ax.b].map((p, k) => (
                      <g key={k}>
                        <circle cx={p.x} cy={-p.y} r={280} fill="var(--k-surface)" stroke="var(--k-ink-soft)" strokeWidth={9} />
                        <text
                          x={p.x}
                          y={-p.y + 100}
                          textAnchor="middle"
                          fontSize={300}
                          fill="var(--k-ink-soft)"
                          fontFamily="var(--k-font-mono)"
                        >
                          {ax.label}
                        </text>
                      </g>
                    ))}
                </g>
              );
            })}

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

          {/* Assoziative Bemassung — Aussen- und Innenketten je nach Stil */}
          {dims &&
            dims.chains.map((c, ci) => {
              const innen = c.role === 'innen';
              const t0 = c.ticks[0]!;
              const t1 = c.ticks[c.ticks.length - 1]!;
              const line =
                c.axis === 'x'
                  ? { x1: t0, y1: -c.offset, x2: t1, y2: -c.offset }
                  : { x1: c.offset, y1: -t0, x2: c.offset, y2: -t1 };
              return (
                <g
                  key={`dim${ci}`}
                  data-testid={`dim-kette-${c.role}`}
                  stroke="var(--k-ink-soft)"
                  fill="var(--k-ink-soft)"
                >
                  <line {...line} strokeWidth={innen ? 6 : 8} />
                  {c.ticks.map((t, i) => (
                    <g key={i}>
                      {c.axis === 'x' ? (
                        <line x1={t - 60} y1={-c.offset + 60} x2={t + 60} y2={-c.offset - 60} strokeWidth={innen ? 9 : 12} />
                      ) : (
                        <line x1={c.offset - 60} y1={-t - 60} x2={c.offset + 60} y2={-t + 60} strokeWidth={innen ? 9 : 12} />
                      )}
                    </g>
                  ))}
                  {c.ticks.slice(0, -1).map((t, i) => {
                    const next = c.ticks[i + 1]!;
                    const mid = (t + next) / 2;
                    const fs = innen ? 240 : 280;
                    return c.axis === 'x' ? (
                      <text key={`t${i}`} x={mid} y={-c.offset - 120} textAnchor="middle" fontSize={fs} stroke="none" fontFamily="var(--k-font-mono)">
                        {dimensionLabel(t, next)}
                      </text>
                    ) : (
                      <text key={`t${i}`} x={c.offset - 120} y={-mid} textAnchor="middle" fontSize={fs} stroke="none" fontFamily="var(--k-font-mono)" transform={`rotate(-90 ${c.offset - 120} ${-mid})`}>
                        {dimensionLabel(t, next)}
                      </text>
                    );
                  })}
                </g>
              );
            })}

          {/* Auswahl-Highlight (Anwählen) + Zieh-Vorschau (Verschieben) — reine
              Bildschirmdarstellung aus der Entity-Geometrie, unabhängig von
              derivePlan/den Poché-Regionen. */}
          {selection.map((id) => {
            const outline = outlineOf(doc, id);
            if (!outline || outline.length < 2) return null;
            const off = handlers.current?.moveOffset;
            const ziehend = off && off.id === id;
            const pts = ziehend ? outline.map((q) => ({ x: q.x + off.dx, y: q.y + off.dy })) : outline;
            return (
              <path
                key={`sel-${id}`}
                data-testid="auswahl-highlight"
                d={`M ${pts.map((q) => `${q.x} ${-q.y}`).join(' L ')} Z`}
                fill="none"
                stroke="var(--k-accent)"
                strokeWidth={ziehend ? 30 : 22}
                strokeDasharray={ziehend ? '90 50' : undefined}
                opacity={ziehend ? 0.85 : 1}
                pointerEvents="none"
              />
            );
          })}

          {/* T3-Zeichenhilfen: Fluchtlinien an bestehenden Punkten — durchlaufend
              über den ganzen sichtbaren Plan, damit die Ausrichtung sofort
              erkennbar ist (reine Bildschirm-Hilfe, kein Planinhalt). */}
          {handlers.current?.fluchtlinien?.map((f, i) =>
            f.achse === 'x' ? (
              <line
                key={`fx${i}`}
                data-testid="fluchtlinie"
                x1={f.wert}
                y1={-2_000_000}
                x2={f.wert}
                y2={2_000_000}
                stroke="var(--k-accent)"
                strokeWidth={4}
                strokeDasharray="6 14"
                opacity={0.55}
                pointerEvents="none"
              />
            ) : (
              <line
                key={`fy${i}`}
                data-testid="fluchtlinie"
                x1={-2_000_000}
                y1={-f.wert}
                x2={2_000_000}
                y2={-f.wert}
                stroke="var(--k-accent)"
                strokeWidth={4}
                strokeDasharray="6 14"
                opacity={0.55}
                pointerEvents="none"
              />
            ),
          )}

          {/* Werkzeug-Vorschau */}
          {handlers.current?.previewLine && handlers.current.previewLine.length >= 2 && (
            <polyline
              points={handlers.current.previewLine.map((p) => `${p.x},${-p.y}`).join(' ')}
              fill="none"
              stroke={handlers.current.orthoAktiv ? 'var(--k-success, #2e7d32)' : 'var(--k-accent)'}
              strokeWidth={20}
              strokeDasharray="80 50"
            />
          )}
          {cursor && (
            <g>
              <line
                x1={cursor.x - 300}
                y1={-cursor.y}
                x2={cursor.x + 300}
                y2={-cursor.y}
                stroke={handlers.current?.orthoAktiv ? 'var(--k-success, #2e7d32)' : 'var(--k-accent)'}
                strokeWidth={8}
              />
              <line
                x1={cursor.x}
                y1={-cursor.y - 300}
                x2={cursor.x}
                y2={-cursor.y + 300}
                stroke={handlers.current?.orthoAktiv ? 'var(--k-success, #2e7d32)' : 'var(--k-accent)'}
                strokeWidth={8}
              />
              {handlers.current?.orthoAktiv && (
                <text
                  data-testid="ortho-hinweis"
                  x={cursor.x + 340}
                  y={-cursor.y - 340}
                  fontSize={200}
                  fill="var(--k-success, #2e7d32)"
                  fontFamily="var(--k-font-mono)"
                >
                  ⊥ 45°
                </text>
              )}
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
      <NavLeiste
        testid="nav-2d"
        aktionen={[
          { id: 'werkzeug', icon: '◇', titel: 'Werkzeug — linke Maustaste zeichnet/wählt (Standard)', aktiv: navModus2d === 'werkzeug', onClick: () => setNavModus2d('werkzeug') },
          { id: 'pan', icon: '✋', titel: 'Pan — linke Maustaste verschiebt die Ansicht (sonst: Mitteltaste/Rechtsklick/Alt-Klick)', aktiv: navModus2d === 'pan', onClick: () => setNavModus2d('pan') },
          { id: 'zoom', icon: '🔍', titel: 'Zoom — linke Maustaste ziehen zoomt (sonst: Mausrad/Pinch)', aktiv: navModus2d === 'zoom', onClick: () => setNavModus2d('zoom') },
          { id: 'fit', icon: '⌂', titel: 'Einpassen — Grundriss ins Bild holen', onClick: einpassen },
        ]}
      />
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
