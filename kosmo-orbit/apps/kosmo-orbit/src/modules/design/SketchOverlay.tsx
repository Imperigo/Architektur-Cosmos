import { useRef, useState } from 'react';
import { getStroke } from 'perfect-freehand';
import { Badge, KButton, moduleHue } from '@kosmo/ui';
import type { Pt } from '@kosmo/kernel';
import { fitStrokes, type FittedSegment, type Stroke } from './sketch';
import { skizzeAnnaeherungen, skizzeMiniPfad, type SkizzeVarianteId } from './skizze-annaeherungen';

/**
 * KosmoSketch-Overlay — liegt über dem Plan: Freihand zeichnen (Apple Pencil:
 * Druckstufen via PointerEvents). T5 (Owner-Laptoptest): mehrere Striche
 * hintereinander frei zeichnen, OHNE dass jeder einzelne sofort «korrigiert»
 * wird — erst «Übergeben» fittet ALLE gesammelten Striche gemeinsam zu einem
 * Vorschlag.
 *
 * K16 A6 (Modus 2, «Skizzieren mit 3 Annäherungen»): genau an diesem
 * Batch-Commit-Moment (bisher EIN «Übernehmen») erscheinen jetzt DREI
 * deterministische Annäherungs-Karten (exakt/orthogonalisiert/begradigt+
 * gerastert, `skizze-annaeherungen.ts`) — die Wahl committet über denselben
 * `onAccept`-Weg wie bisher (EIN Aufruf, EINE Undo-Gruppe). Karte 1 (exakt)
 * behält bewusst den alten Testid `sketch-accept` — sie IST das bisherige
 * Verhalten, nur jetzt eine von drei Optionen statt die einzige.
 *
 * v0.6.6 / Welle 2 Stream C (MOTION-KONZEPT-066 §5, Task 5): `pointerType`
 * kommt hier NIE eigens abgefangen/verändert an — jedes `onPointerDown`/
 * `-Move`-Event reicht sein natives `pointerType` unangetastet weiter nach
 * oben durch (keine `stopPropagation()`, wie schon vorher). Das genügt als
 * «sauber durchreichen»: die eigentliche «iPad-Skizzieren»-Erkennung für die
 * Arbeitsmodi-Automatik sitzt in `DesignWorkspace.tsx`s Capture-Phase-Handler
 * (Stream B/W1b, `onWorkspacePointerDownCapture`), der ausdrücklich AUCH bei
 * `stopPropagation()` in einem Kind mitliest — dieses Bauteil braucht dafür
 * keinen eigenen Verdrahtungsweg. Palm-Rejection-Basis: kommt WÄHREND ein
 * Stift (`pointerType==='pen'`) zeichnet ein zweiter Pointer dazu
 * (typischerweise die aufliegende Handfläche), wird der begonnene Strich
 * verworfen (er ist ohnehin vom Aufsetzen der Hand verwackelt) und der
 * zweite Pointer treibt stattdessen `onPanDelta` — NUR in genau diesem Fall,
 * das normale Ein-Pointer-Zeichnen (Maus/Touch/Pen allein) ist unverändert.
 */

export interface SketchOverlayProps {
  /** Pixel ↔ Welt-mm Umrechnung der darunterliegenden Planansicht. */
  toWorld: (clientX: number, clientY: number) => Pt;
  toScreen: (p: Pt) => { x: number; y: number };
  /** `meta` fehlt nur, wenn ein Aufrufer (z.B. der 3D-Sketch-Weg) keine Varianten anbietet. */
  onAccept: (segments: FittedSegment[], meta?: { variante: SkizzeVarianteId; anzahl: number }) => void;
  /** Palm-Rejection-Basis (Task 5): Bildschirm-px-Delta, wenn ein zweiter
   *  Pointer während eines aktiven Stift-Strichs pannen soll, statt zu
   *  zeichnen. Optional — ohne diesen Callback bleibt das Verhalten wie
   *  zuvor (jeder Pointer zeichnet mit, keine Sonderrolle für einen zweiten). */
  onPanDelta?: (dx: number, dy: number) => void;
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

export function SketchOverlay({ toWorld, toScreen, onAccept, onPanDelta }: SketchOverlayProps) {
  const [live, setLive] = useState<LivePt[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [pending, setPending] = useState<FittedSegment[] | null>(null);
  const drawing = useRef(false);
  // v0.6.6 / Welle 2 Stream C (Task 5): pointerType des zeichnenden Pointers
  // + Palm-Rejection-Zustand (zweiter Pointer während Stift → Pan statt Zeichnen).
  const drawingPointerType = useRef<string | null>(null);
  const panPointerId = useRef<number | null>(null);
  const panLetzte = useRef<{ x: number; y: number } | null>(null);

  const finish = () => {
    drawing.current = false;
    drawingPointerType.current = null;
    setLive((l) => {
      if (l.length >= 4) setStrokes((s) => [...s, { points: l }]);
      return [];
    });
  };

  const uebergeben = () => {
    const segments = fitStrokes(strokes);
    if (segments.length > 0) setPending(segments);
  };

  const waehleVariante = (id: SkizzeVarianteId, segmente: FittedSegment[]) => {
    onAccept(segmente, { variante: id, anzahl: segmente.length });
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
        // v0.6.6 / Welle 2 Stream C (Task 5): Palm-Rejection-Basis — ein
        // zweiter Pointer während ein Stift zeichnet ist typischerweise die
        // aufliegende Handfläche, nicht eine zweite Absicht. Der begonnene
        // (ohnehin vom Aufsetzen verwackelte) Strich wird verworfen, der
        // zweite Pointer treibt stattdessen `onPanDelta` — NUR wenn ein
        // Aufrufer das anbietet (PlanView) UND wirklich ein Stift zeichnet.
        if (drawing.current && drawingPointerType.current === 'pen' && onPanDelta) {
          drawing.current = false;
          drawingPointerType.current = null;
          setLive([]);
          panPointerId.current = e.pointerId;
          panLetzte.current = { x: e.clientX, y: e.clientY };
          try {
            (e.target as Element).setPointerCapture(e.pointerId);
          } catch {
            /* synthetische Events (Tests) haben keinen aktiven Pointer */
          }
          return;
        }
        drawing.current = true;
        drawingPointerType.current = e.pointerType;
        (e.target as Element).setPointerCapture(e.pointerId);
        const w = toWorld(e.clientX, e.clientY);
        setLive([{ ...w, pressure: e.pressure || 0.5 }]);
      }}
      onPointerMove={(e) => {
        if (panPointerId.current !== null && e.pointerId === panPointerId.current) {
          const letzte = panLetzte.current;
          if (letzte) onPanDelta?.(e.clientX - letzte.x, e.clientY - letzte.y);
          panLetzte.current = { x: e.clientX, y: e.clientY };
          return;
        }
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
      onPointerUp={(e) => {
        if (panPointerId.current !== null && e.pointerId === panPointerId.current) {
          panPointerId.current = null;
          panLetzte.current = null;
          return;
        }
        finish();
      }}
      onPointerCancel={(e) => {
        if (panPointerId.current !== null && e.pointerId === panPointerId.current) {
          panPointerId.current = null;
          panLetzte.current = null;
          return;
        }
        finish();
      }}
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
            gap: 'var(--k-s3)',
            alignItems: 'center',
            background: 'var(--k-surface)',
            border: '1px solid var(--k-line)',
            borderRadius: 'var(--k-radius-md)',
            padding: 'var(--k-s3) var(--k-s4)',
            boxShadow: 'var(--k-shadow-overlay)',
          }}
        >
          <Badge hue={moduleHue.design}>Frei skizziert</Badge>
          <span style={{ fontSize: 'var(--k-t-md)' }}>{strokes.length} Strich{strokes.length === 1 ? '' : 'e'}</span>
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
            flexDirection: 'column',
            gap: 'var(--k-s3)',
            alignItems: 'center',
            background: 'var(--k-surface)',
            border: '1px solid var(--k-accent)',
            borderRadius: 'var(--k-radius-md)',
            padding: 'var(--k-s3) var(--k-s4)',
            boxShadow: 'var(--k-shadow-overlay)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--k-s2)', alignItems: 'center' }}>
            <Badge hue={moduleHue.design}>Skizze erkannt</Badge>
            <span style={{ fontSize: 'var(--k-t-md)' }}>{pending.length} Wände — eine Annäherung wählen</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--k-s3)' }}>
            {skizzeAnnaeherungen(pending).map((v, i) => (
              <div
                key={v.id}
                data-testid={`skizze-vorschlag-${i + 1}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--k-s2)',
                  alignItems: 'center',
                  width: 108,
                  border: '1px solid var(--k-line)',
                  borderRadius: 'var(--k-radius-sm)',
                  padding: 'var(--k-s2)',
                }}
              >
                <div style={{ fontSize: 'var(--k-t-sm)', fontWeight: 600 }}>{v.titel}</div>
                <svg width={56} height={56} viewBox="0 0 56 56" style={{ background: 'var(--k-raised)', borderRadius: 4 }}>
                  <path d={skizzeMiniPfad(v.segments)} fill="none" stroke="var(--k-accent)" strokeWidth={2} strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)', textAlign: 'center', lineHeight: 1.3 }}>
                  {v.beschreibung}
                </span>
                <KButton
                  size="sm"
                  tone="accent"
                  // Karte 1 (exakt) = das bisherige Verhalten — behält den alten Testid.
                  data-testid={i === 0 ? 'sketch-accept' : `skizze-vorschlag-${i + 1}-waehlen`}
                  onClick={() => waehleVariante(v.id, v.segments)}
                >
                  Übernehmen
                </KButton>
              </div>
            ))}
          </div>
          <KButton size="sm" tone="ghost" onClick={() => setPending(null)}>
            Verwerfen
          </KButton>
        </div>
      )}
    </div>
  );
}
