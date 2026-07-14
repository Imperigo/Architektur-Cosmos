import { useEffect, useMemo, useRef, useState } from 'react';
import {
  polygonArea,
  segmentVariantenMatrix,
  sollMix,
  typFarbe,
  variantenSuche,
  type GeschnitteneWohnung,
  type SegmentierEingabe,
  type SegmentVariante,
  type VariantenGewichte,
  type Zone,
} from '@kosmo/kernel';
import { Badge, Hairline, KButton, KIcon, KInput, Measure, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

/**
 * Varianten-Panel (v0.7.0 E5-i/iii, Stream 5A) — Echtzeit-UI über
 * `derive/variantensuche.ts` (Stream 4A, API-Vertrag im Modulkopf dort
 * VERBINDLICH): vier Gewichte-Slider + Seed, «Start» zieht den seeded
 * Anytime-Generator in `requestIdleCallback`-Zeitscheiben, Top-8 nach Score
 * als Karten (Mini-Skizze + Teilscores), darunter die verallgemeinerte
 * Kennzahl-Matrix (`derive/variantenmatrix.ts` `segmentVariantenMatrix`,
 * E5-iii). «Übernehmen» läuft über den BESTEHENDEN `design.wohnungenSegmentieren`
 * -Command (additiv um `vorberechneteWohnungen` erweitert) — ein Undo-Schritt,
 * kein Sonderpfad am Doc vorbei.
 *
 * **Laufzeit ≠ Modell** (CLAUDE.md, Muster `modules/vis/vis-runtime.ts`):
 * Zähler/Top-8/laufender Generator leben NUR in Komponenten-State
 * (`useState`/`useRef`) dieses Panels — nichts davon geht durch Undo/Yjs/
 * `.kosmo`. Erst ein Klick auf «Übernehmen» schreibt (über den Command) ins
 * Doc. Ein eigener globaler Store wäre hier Overhead ohne Nutzen: die
 * Laufzeit-Daten hat ausschliesslich dieses Panel nötig, nichts sonst liest
 * sie — anders als `vis-runtime.ts`, dessen Node-Läufe mehrere Viewport-
 * Komponenten gleichzeitig lesen.
 */

const GEWICHT_KEYS = ['programmErfuellung', 'kompaktheit', 'mixTreue', 'flaechenNutzung'] as const;
type GewichtKey = (typeof GEWICHT_KEYS)[number];
const GEWICHT_LABEL: Record<GewichtKey, string> = {
  programmErfuellung: 'Programmerfüllung',
  kompaktheit: 'Kompaktheit',
  mixTreue: 'Mix-Treue',
  flaechenNutzung: 'Flächennutzung',
};
const GEWICHTE_DEFAULT: VariantenGewichte = {
  programmErfuellung: 1,
  kompaktheit: 1,
  mixTreue: 1,
  flaechenNutzung: 1,
};

const ZUEGE_JE_ZEITSCHEIBE = 15; // ~10-20 .next() je Scheibe (Auftrag Stream 5A)
const TOP_N = 8;

const ZUG_LABEL: Record<SegmentVariante['zug'], string> = {
  start: 'Start (Greedy-DP)',
  zielgroesseJittern: 'Zielgrösse gejittert',
  mixPermutation: 'Mix-Reihenfolge permutiert',
  typTausch: 'Typ getauscht',
  mergeResplit: 'Verschmolzen + neu geschnitten',
  stagnation: 'Stagnation',
};

interface IdleFensterAusschnitt {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
}

/** requestIdleCallback-Zeitscheibe, `setTimeout(0)`-Fallback wenn die Laufzeit
 *  (ältere WebViews, Playwright-Browser ohne Idle-API) `requestIdleCallback`
 *  nicht kennt — beide geben denselben Handle-Typ (number) zurück. */
function planeZeitscheibe(fn: () => void): number {
  const w = window as unknown as IdleFensterAusschnitt;
  if (typeof w.requestIdleCallback === 'function') {
    return w.requestIdleCallback(fn);
  }
  return window.setTimeout(fn, 0);
}

function abbrechenZeitscheibe(handle: number): void {
  const w = window as unknown as IdleFensterAusschnitt;
  if (typeof w.cancelIdleCallback === 'function') {
    w.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
}

interface Kontext {
  storeyId: string;
  eingabe: SegmentierEingabe;
}

/** Footprint (grösste Nicht-Korridor-Zone) + Korridor-Zone + Soll-Mix des
 *  aktiven Geschosses zusammensuchen — dieselbe Herleitung wie
 *  `design.wohnungenSegmentieren` (design.ts), hier read-only fürs Panel. */
function baueKontext(doc: ReturnType<typeof useProject.getState>['doc'], storeyId: string | null): Kontext | null {
  if (!storeyId) return null;
  const zonen = doc.byKind<Zone>('zone').filter((z) => z.storeyId === storeyId);
  const korridor = zonen.find((z) => z.raumTyp === 'korridor');
  if (!korridor) return null;
  const rest = zonen.filter((z) => z.id !== korridor.id);
  const footprint = [...rest].sort((a, b) => Math.abs(polygonArea(b.outline)) - Math.abs(polygonArea(a.outline)))[0];
  if (!footprint) return null;
  const mix = sollMix(doc);
  if (mix.length === 0) return null;
  return { storeyId, eingabe: { footprint: footprint.outline, korridor: korridor.outline, mix } };
}

/** Einfache Rechteck-Skizze aus den Wohnungs-Bboxen (kein Wiederverwendbares
 *  im Segmentierer/PlanView gefunden — BerechnungslistePanel zeigt die
 *  Ergebnisse nur als Zahlenliste, keine Geometrie-Vorschau). */
function WohnungsSkizze({ wohnungen }: { wohnungen: GeschnitteneWohnung[] }) {
  if (wohnungen.length === 0) {
    return <div style={{ fontSize: 10.5, color: 'var(--k-ink-faint)' }}>(keine Wohnungen — Stagnation)</div>;
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of wohnungen) {
    for (const p of w.outline) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }
  const W = maxX - minX;
  const H = maxY - minY;
  if (!(W > 0) || !(H > 0)) return null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 64, background: 'var(--k-sunken)' }} preserveAspectRatio="xMidYMid meet">
      {wohnungen.map((w, i) => {
        let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
        for (const p of w.outline) {
          bx0 = Math.min(bx0, p.x);
          bx1 = Math.max(bx1, p.x);
          by0 = Math.min(by0, p.y);
          by1 = Math.max(by1, p.y);
        }
        // Y gespiegelt: Plan-Y wächst nach «oben», SVG-Y nach unten —
        // svgY = maxY - planY (liegt für planY ∈ [minY,maxY] exakt in [0,H]).
        return (
          <rect
            key={i}
            x={bx0 - minX}
            y={maxY - by1}
            width={bx1 - bx0}
            height={by1 - by0}
            fill={w.typ ? `${typFarbe(w.typ)}55` : 'var(--k-danger-weich, #c0392b33)'}
            stroke={w.typ ? typFarbe(w.typ) : 'var(--k-danger)'}
            strokeWidth={Math.max(W, H) / 250}
          />
        );
      })}
    </svg>
  );
}

/** Parallel-Axis-Matrix (verallgemeinerte `variantenmatrix.ts`, E5-iii) —
 *  gleiche Zeichen-Logik wie `VariantenMatrixSvg` in DesignWorkspace.tsx
 *  (Volumenstudien), hier auf die fünf Segment-Varianten-Spalten (Score +
 *  vier Teilscores, alle bereits [0,1]) angewendet. */
function SegmentMatrixSvg({ top }: { top: SegmentVariante[] }) {
  const [aktiv, setAktiv] = useState<number | null>(null);
  const matrix = useMemo(() => segmentVariantenMatrix(top), [top]);
  if (matrix.zeilen.length < 2) return null;
  const W = 280;
  const H = 130;
  const RAND = 14;
  const n = matrix.achsen.length;
  const x = (i: number) => RAND + (i * (W - 2 * RAND)) / (n - 1);
  const y = (i: number, wert: number | null): number | null => {
    if (wert === null) return null;
    const { min, max } = matrix.bereiche[i]!;
    let t = (wert - min) / (max - min);
    if (matrix.achsen[i]!.kleinerBesser) t = 1 - t;
    return H - RAND - t * (H - 2 * RAND);
  };
  return (
    <div data-testid="varianten-panel-matrix" style={{ display: 'grid', gap: 2 }}>
      <div style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>
        Kennzahl-Matrix Top-{matrix.zeilen.length} (oben = besser)
        {aktiv !== null ? ` — ${matrix.zeilen[aktiv]?.name}` : ''}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 14}`} style={{ width: '100%' }}>
        {matrix.achsen.map((a, i) => (
          <g key={a.key}>
            <line x1={x(i)} y1={RAND} x2={x(i)} y2={H - RAND} stroke="var(--k-line-strong)" strokeWidth={1} pointerEvents="none" />
            <text x={x(i)} y={H + 8} textAnchor="middle" fontSize={7} fill="var(--k-ink-faint)">
              {a.label}
            </text>
          </g>
        ))}
        {matrix.zeilen.map((z, zi) => {
          const punkte = z.werte
            .map((w, i) => ({ x: x(i), y: y(i, w) }))
            .filter((p): p is { x: number; y: number } => p.y !== null);
          return (
            <polyline
              key={z.id}
              data-testid="varianten-panel-matrix-linie"
              points={punkte.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={aktiv === zi ? 'var(--k-accent)' : 'var(--k-ink-soft)'}
              strokeWidth={aktiv === zi ? 2.4 : 1.3}
              opacity={aktiv !== null && aktiv !== zi ? 0.35 : 0.9}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setAktiv(zi)}
              onMouseLeave={() => setAktiv(null)}
            />
          );
        })}
      </svg>
    </div>
  );
}

export function VariantenPanel({ onClose }: { onClose: () => void }) {
  const runCommand = useProject((s) => s.runCommand);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const revision = useProject((s) => s.revision);

  const [gewichte, setGewichte] = useState<VariantenGewichte>(GEWICHTE_DEFAULT);
  const [seed, setSeed] = useState(1);
  const [laeuft, setLaeuft] = useState(false);
  const [anzahl, setAnzahl] = useState(0);
  const [top, setTop] = useState<SegmentVariante[]>([]);
  const [hinweis, setHinweis] = useState<string | null>(null);

  const generatorRef = useRef<Generator<SegmentVariante, unknown, unknown> | null>(null);
  const laufendRef = useRef(false);
  const zaehlerRef = useRef(0);
  const topRef = useRef<SegmentVariante[]>([]);
  const handleRef = useRef<number | null>(null);
  const kontextRef = useRef<Kontext | null>(null);

  const kontext = useMemo(
    () => baueKontext(useProject.getState().doc, activeStoreyId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, activeStoreyId],
  );

  const zeitscheibe = useRef<() => void>(() => {});
  zeitscheibe.current = () => {
    const gen = generatorRef.current;
    if (!gen || !laufendRef.current) return;
    const batch: SegmentVariante[] = [];
    for (let i = 0; i < ZUEGE_JE_ZEITSCHEIBE; i++) {
      const { value, done } = gen.next();
      if (done) {
        laufendRef.current = false;
        break;
      }
      batch.push(value);
    }
    zaehlerRef.current += batch.length;
    if (batch.length > 0) {
      topRef.current = [...topRef.current, ...batch].sort((a, b) => b.score - a.score).slice(0, TOP_N);
    }
    setAnzahl(zaehlerRef.current);
    setTop(topRef.current);
    if (laufendRef.current) {
      handleRef.current = planeZeitscheibe(() => zeitscheibe.current());
    } else {
      setLaeuft(false);
    }
  };

  // Beim Schliessen/Unmount: laufende Zeitscheiben sauber stoppen — sonst
  // rechnet der Generator im Hintergrund weiter, obwohl niemand mehr zusieht.
  useEffect(
    () => () => {
      laufendRef.current = false;
      if (handleRef.current !== null) abbrechenZeitscheibe(handleRef.current);
      if (generatorRef.current) {
        try {
          generatorRef.current.return(undefined);
        } catch {
          /* Generator bereits erschöpft/geschlossen — ignorieren. */
        }
      }
    },
    [],
  );

  const start = () => {
    setHinweis(null);
    if (!kontext) {
      setHinweis('Footprint- und Korridor-Zone (Raumtyp «korridor») zeichnen sowie ein Raumprogramm erfassen — daraus baut die Suche ihren Soll-Mix.');
      return;
    }
    kontextRef.current = kontext;
    const gen = variantenSuche(kontext.eingabe, gewichte, seed);
    generatorRef.current = gen as unknown as Generator<SegmentVariante, unknown, unknown>;
    zaehlerRef.current = 0;
    topRef.current = [];
    setAnzahl(0);
    setTop([]);
    laufendRef.current = true;
    setLaeuft(true);
    handleRef.current = planeZeitscheibe(() => zeitscheibe.current());
  };

  const stopp = () => {
    laufendRef.current = false;
    setLaeuft(false);
    if (handleRef.current !== null) {
      abbrechenZeitscheibe(handleRef.current);
      handleRef.current = null;
    }
    if (generatorRef.current) {
      try {
        generatorRef.current.return(undefined);
      } catch {
        /* bereits geschlossen */
      }
    }
  };

  const uebernehmen = (variante: SegmentVariante) => {
    const k = kontextRef.current ?? kontext;
    if (!k) {
      meldeFehler('Kein Geschoss-Kontext (Footprint/Korridor) mehr vorhanden.');
      return;
    }
    try {
      runCommand('design.wohnungenSegmentieren', {
        storeyId: k.storeyId,
        vorberechneteWohnungen: variante.wohnungen,
      });
      melde(`Variante übernommen (Score ${(variante.score * 100).toFixed(0)} %) — 1 Undo-Schritt.`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  };

  return (
    <div
      data-testid="varianten-panel"
      className="k-dialog"
      style={{
        zIndex: 20,
        overflowY: 'auto',
        background: 'var(--k-raised)',
        border: '1px solid var(--k-technik)',
        boxShadow: 'var(--k-shadow-overlay)',
        padding: 'var(--k-s4)',
        display: 'grid',
        gap: 'var(--k-s4)',
        fontSize: 'var(--k-t-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}>
        <Badge hue={moduleHue.design}>Varianten (Anytime-Suche)</Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          <KIcon name="schliessen" size={14} />
        </KButton>
      </div>
      <Hairline />

      {!kontext && (
        <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
          Footprint- und Korridor-Zone (Raumtyp «korridor») zeichnen sowie ein Raumprogramm erfassen — daraus baut die Suche ihren Soll-Mix.
        </div>
      )}

      <div style={{ display: 'grid', gap: 6 }}>
        {GEWICHT_KEYS.map((k) => (
          <label key={k} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 132, color: 'var(--k-ink-soft)', fontSize: 11.5 }}>{GEWICHT_LABEL[k]}</span>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={gewichte[k]}
              disabled={laeuft}
              data-testid={`varianten-panel-gewicht-${k}`}
              onChange={(e) => setGewichte((g) => ({ ...g, [k]: Number(e.target.value) }))}
              style={{ flex: 1 }}
            />
            <Measure>×{gewichte[k].toFixed(1)}</Measure>
          </label>
        ))}
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 132, color: 'var(--k-ink-soft)', fontSize: 11.5 }}>Seed</span>
          <KInput
            size="sm"
            mono
            type="number"
            data-testid="varianten-panel-seed"
            value={seed}
            disabled={laeuft}
            onChange={(e) => setSeed(Math.trunc(Number(e.target.value)) || 0)}
            style={{ width: 90 }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!laeuft ? (
          <KButton size="sm" tone="accent" data-testid="varianten-panel-start" onClick={start} disabled={!kontext}>
            Start
          </KButton>
        ) : (
          <KButton size="sm" tone="quiet" data-testid="varianten-panel-stopp" onClick={stopp}>
            Stopp
          </KButton>
        )}
        <span data-testid="varianten-panel-zaehler" style={{ color: 'var(--k-ink-soft)', fontSize: 11.5 }}>
          {anzahl} Varianten geprüft
        </span>
      </div>
      {hinweis && <div style={{ fontSize: 11.5, color: 'var(--k-danger)' }}>{hinweis}</div>}

      {top.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600 }}>Top-{top.length} nach Score</div>
          {top.map((v, i) => (
            <div
              key={i}
              data-testid={`varianten-panel-karte-${i}`}
              className="k-karte"
              style={{ display: 'grid', gap: 4, padding: 8 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5 }}>
                  #{i + 1} · {ZUG_LABEL[v.zug]}
                </span>
                <span data-testid={`varianten-panel-score-${i}`}>
                  <Measure>{(v.score * 100).toFixed(0)} %</Measure>
                </span>
              </div>
              <WohnungsSkizze wohnungen={v.wohnungen} />
              <div style={{ fontSize: 10, color: 'var(--k-ink-faint)' }}>
                Programm {(v.teilScores.programmErfuellung * 100).toFixed(0)}% · Kompaktheit{' '}
                {(v.teilScores.kompaktheit * 100).toFixed(0)}% · Mix {(v.teilScores.mixTreue * 100).toFixed(0)}% ·
                Fläche {(v.teilScores.flaechenNutzung * 100).toFixed(0)}%
              </div>
              <div>
                <KButton
                  size="sm"
                  tone="quiet"
                  data-testid={`varianten-panel-uebernehmen-${i}`}
                  onClick={() => uebernehmen(v)}
                >
                  Übernehmen
                </KButton>
              </div>
            </div>
          ))}
          <SegmentMatrixSvg top={top} />
        </div>
      )}
      <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>
        Deterministischer Ruin-&amp;-Recreate-Hill-Climber (derive/variantensuche.ts) — kein Cloud-Optimierer, kein
        Worker. Übernahme ist ein Undo-Schritt.
      </span>
    </div>
  );
}
