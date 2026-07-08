import type { Pt } from '@kosmo/kernel';
import type { FittedSegment } from './sketch';

/**
 * K16 A6 (Modus 2, «Skizzieren mit 3 Annäherungen»): drei deterministische
 * Annäherungs-Varianten, rein aus dem BESTEHENDEN Segmentierer-Ergebnis
 * (`fitStrokes`, `sketch.ts`) abgeleitet — kleine pure Funktionen, kein
 * Kernel-Bruch, kein zweiter Fit-Algorithmus. Variante (a) ist exakt das
 * heutige Verhalten (unverändert), (b)/(c) sind zusätzliche, rein
 * geometrische Nachbearbeitungen desselben Ergebnisses.
 */

export type SkizzeVarianteId = 'exakt' | 'orthogonal' | 'raster';

export interface SkizzeVariante {
  id: SkizzeVarianteId;
  titel: string;
  beschreibung: string;
  segments: FittedSegment[];
}

/** Gleiches Zeichenraster wie der 250er-Stützenraster-Fang in DesignWorkspace (`SNAP`). */
export const ANNAEHERUNG_RASTER_MM = 250;

function gleicherPunkt(a: Pt, b: Pt): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Orthogonalisiert eine Segmentkette: jede Richtung wird auf die nähere
 * Achse (0°/90°) gerundet, die Länge bleibt je Segment erhalten. Segmente,
 * deren Startpunkt exakt am Endpunkt des Vorgängers hängt (zusammenhängender
 * Zug — z.B. ein im Freihand gezeichnetes Rechteck), bleiben verbunden: der
 * korrigierte Endpunkt des Vorgängers wird zum Startpunkt des nächsten
 * Segments, statt unabhängig vom Original-Startpunkt aus zu rechnen (sonst
 * rissen orthogonalisierte Ecken auseinander). Ein neuer, nicht verbundener
 * Strich (z.B. der zweite von zwei unabhängig gezeichneten Strichen im
 * Batch) startet unverändert an seinem eigenen Startpunkt.
 */
export function orthogonalisiere(segments: FittedSegment[]): FittedSegment[] {
  const out: FittedSegment[] = [];
  // Kontinuität wird am ROHEN (unkorrigierten) Segmentierer-Ergebnis geprüft
  // (teilt Segment i+1 seinen Startpunkt exakt mit dem Endpunkt von Segment
  // i?) — der KORRIGIERTE Cursor wird dann als neuer Startpunkt übernommen,
  // statt gegen den bereits veränderten Cursor zu vergleichen (der nie mehr
  // exakt auf den rohen Folge-Startpunkt träfe).
  let vorherigeRohB: Pt | null = null;
  let cursor: Pt | null = null;
  for (const seg of segments) {
    const verbunden: boolean = vorherigeRohB !== null && cursor !== null && gleicherPunkt(vorherigeRohB, seg.a);
    const start: Pt = verbunden && cursor !== null ? cursor : seg.a;
    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const laenge = Math.hypot(dx, dy);
    if (laenge < 1e-6) {
      out.push({ a: start, b: start });
      vorherigeRohB = seg.b;
      cursor = start;
      continue;
    }
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const ende: Pt = horizontal
      ? { x: Math.round(start.x + Math.sign(dx || 1) * laenge), y: start.y }
      : { x: start.x, y: Math.round(start.y + Math.sign(dy || 1) * laenge) };
    out.push({ a: start, b: ende });
    vorherigeRohB = seg.b;
    cursor = ende;
  }
  return out;
}

function aufRaster(p: Pt, raster: number): Pt {
  return { x: Math.round(p.x / raster) * raster, y: Math.round(p.y / raster) * raster };
}

/**
 * Begradigt (orthogonalisiert) UND rastert zusätzlich beide Endpunkte jedes
 * Segments aufs Zeichenraster. Da verbundene Segmente nach `orthogonalisiere`
 * exakt denselben Eckpunkt teilen und `aufRaster` eine reine, deterministische
 * Funktion desselben Werts ist, bleibt die Kette auch nach dem Rastern
 * verbunden (kein zweiter, abweichender Rundungsweg).
 */
export function begradigeUndRaster(segments: FittedSegment[], raster: number = ANNAEHERUNG_RASTER_MM): FittedSegment[] {
  return orthogonalisiere(segments).map((seg) => ({ a: aufRaster(seg.a, raster), b: aufRaster(seg.b, raster) }));
}

/** Die drei Annäherungen (a) exakt, (b) orthogonalisiert, (c) begradigt+gerastert. */
export function skizzeAnnaeherungen(segments: FittedSegment[]): SkizzeVariante[] {
  return [
    { id: 'exakt', titel: 'Exakt', beschreibung: 'Wie gezeichnet — keine Korrektur.', segments },
    {
      id: 'orthogonal',
      titel: 'Orthogonalisiert',
      beschreibung: 'Winkel auf 0°/90° gerundet, Länge bleibt.',
      segments: orthogonalisiere(segments),
    },
    {
      id: 'raster',
      titel: 'Begradigt + gerastert',
      beschreibung: `Zusätzlich Endpunkte aufs ${ANNAEHERUNG_RASTER_MM}-mm-Zeichenraster.`,
      segments: begradigeUndRaster(segments),
    },
  ];
}

/**
 * Mini-Vorschau-Pfad (SVG `d`-Attribut): normalisiert die Segmente in eine
 * `box`×`box`-Fläche (Kern-mm → lokale Pixel), Plan-Y (Norden=oben) wird auf
 * SVG-Y (unten wächst) gespiegelt. Reine Funktion, kein DOM-Zugriff — leer
 * bei leerer Segmentliste (keine Skizze, kein Absturz).
 */
export function skizzeMiniPfad(segments: FittedSegment[], box = 56, padding = 6): string {
  if (segments.length === 0) return '';
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const seg of segments) {
    for (const p of [seg.a, seg.b]) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }
  const breite = Math.max(1, maxX - minX);
  const hoehe = Math.max(1, maxY - minY);
  const verfuegbar = box - 2 * padding;
  const skala = Math.min(verfuegbar / breite, verfuegbar / hoehe);
  const mitteX = (minX + maxX) / 2;
  const mitteY = (minY + maxY) / 2;
  const tx = (x: number) => (box / 2 + (x - mitteX) * skala).toFixed(1);
  const ty = (y: number) => (box / 2 - (y - mitteY) * skala).toFixed(1);
  return segments.map((seg) => `M ${tx(seg.a.x)} ${ty(seg.a.y)} L ${tx(seg.b.x)} ${ty(seg.b.y)}`).join(' ');
}
