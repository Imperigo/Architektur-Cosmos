import type { KosmoDoc } from '../model/doc';
import type { MassBody } from '../model/entities';
import type { Pt } from '../model/units';

/**
 * Fassaden-Modul-Studien (V2-V7): Vorfabrikations-Denke früh — ein
 * Modulraster (b × h) wird über jede Fassadenkante der Volumenkörper
 * gelegt. Eckenregel: Module beginnen an der Ecke, der Rest sammelt
 * sich am Kantenende und wird EHRLICH als Passstück ausgewiesen
 * (Vorfabrikation lebt von der Wiederholung, stirbt am Verschweigen).
 */

export interface FassadenZeile {
  koerper: string;
  massId: string;
  /** Zugewiesenes Modul dieser Kante (sonst freie Masse). */
  modul: string | null;
  kante: number;
  laenge: number; // mm
  spalten: number;
  zeilen: number;
  module: number;
  /** Passstück-Breite am Kantenende (mm); 0 = geht auf. */
  rest: number;
}

export interface ModulStudie {
  zeilen: FassadenZeile[];
  totalModule: number;
  totalPassstuecke: number;
  /** Wiederholungsgrad: Standardmodule / (Standard + Passstücke). */
  wiederholung: number;
}

export function fassadenModule(doc: KosmoDoc, storeyId: string, modB: number, modH: number): ModulStudie {
  const zeilen: FassadenZeile[] = [];
  let nr = 0;
  for (const m of doc.byKind<MassBody>('mass')) {
    if (m.storeyId !== storeyId) continue;
    nr++;
    const name = m.program ? `Körper ${nr} (${m.program})` : `Körper ${nr}`;
    for (let i = 0; i < m.outline.length; i++) {
      const a = m.outline[i]!;
      const b = m.outline[(i + 1) % m.outline.length]!;
      const laenge = Math.round(Math.hypot(b.x - a.x, b.y - a.y));
      // Zugewiesenes Modul übersteuert die freien Masse dieser Kante
      const zuweisung = m.module?.find((z) => z.kante === i + 1);
      const gezeichnet = zuweisung
        ? doc.settings.fassadenModule.find((fm) => fm.name === zuweisung.modul)
        : undefined;
      const b2 = gezeichnet?.breite ?? modB;
      const h2 = gezeichnet?.hoehe ?? modH;
      const rows = Math.floor(m.height / h2);
      const spalten = Math.floor(laenge / b2);
      const rest = laenge - spalten * b2; // kurze Kante: 0 Module, alles Passstück
      zeilen.push({
        koerper: name,
        massId: m.id,
        modul: gezeichnet?.name ?? null,
        kante: i + 1,
        laenge,
        spalten,
        zeilen: rows,
        module: spalten * rows,
        rest: rest >= 50 ? rest : 0,
      });
    }
  }
  const totalModule = zeilen.reduce((s, z) => s + z.module, 0);
  const totalPassstuecke = zeilen.reduce((s, z) => s + (z.rest > 0 ? z.zeilen : 0), 0);
  return {
    zeilen,
    totalModule,
    totalPassstuecke,
    wiederholung: totalModule + totalPassstuecke > 0 ? totalModule / (totalModule + totalPassstuecke) : 1,
  };
}

/** Fassadenseite (Süd/Nord/West/Ost) — Nord bleibt +y, siehe `derive/standort.ts`. */
export type Fassadenrichtung = 'sued' | 'nord' | 'west' | 'ost';

export interface Bbox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Achstoleranz für die Kanten-/Bbox-Klassierung (mm) — dieselbe Grössenordnung wie
 * `AXIS_TOL` in `derive/dimensions.ts`, das exakt dieselbe Konvention (horizontale
 * Kante nahe der Süd-/Westkante der Bbox) für die Aussenketten benutzt. */
const RICHTUNG_TOL = 300;

export function boundingBox(punkte: readonly Pt[]): Bbox | null {
  if (punkte.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of punkte) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Fassadenseite einer Kante (Volumenkörper-Umriss ODER echte Wandachse) relativ
 * zur Bounding Box ihres Umrisses: horizontale Kante nahe der kleinsten y-Kante
 * → Süd, nahe der grössten → Nord; vertikale Kante nahe der kleinsten x-Kante
 * → West, nahe der grössten → Ost (Nord = +y, dieselbe Konvention wie die
 * Aussenketten-Zuordnung in `derive/dimensions.ts`). Schräge oder innenliegende
 * Kanten bleiben unklassifiziert (null) — keine neue Richtungslogik erfunden,
 * nur dieselbe Bbox-Konvention wiederverwendet.
 */
export function kantenRichtung(a: Pt, b: Pt, bbox: Bbox): Fassadenrichtung | null {
  const horizontal = Math.abs(a.y - b.y) <= RICHTUNG_TOL;
  const vertical = Math.abs(a.x - b.x) <= RICHTUNG_TOL;
  if (horizontal) {
    if (Math.min(a.y, b.y) <= bbox.minY + RICHTUNG_TOL) return 'sued';
    if (Math.max(a.y, b.y) >= bbox.maxY - RICHTUNG_TOL) return 'nord';
  }
  if (vertical) {
    if (Math.min(a.x, b.x) <= bbox.minX + RICHTUNG_TOL) return 'west';
    if (Math.max(a.x, b.x) >= bbox.maxX - RICHTUNG_TOL) return 'ost';
  }
  return null;
}

/**
 * Fassadenseite → zugewiesenes Modul, gesammelt über ALLE Volumenkörper eines
 * Geschosses: verbindet `design.fassadenModulZuweisen` (Kante am MassBody) mit
 * der Wandrichtung, damit `design.fensterAusModulen` je Aussenwand das zur
 * Fassadenseite passende Modul stanzen kann statt pauschal das erste.
 */
export function richtungsModule(doc: KosmoDoc, storeyId: string): Map<Fassadenrichtung, string> {
  const map = new Map<Fassadenrichtung, string>();
  for (const m of doc.byKind<MassBody>('mass')) {
    if (m.storeyId !== storeyId || !m.module || m.module.length === 0) continue;
    const bbox = boundingBox(m.outline);
    if (!bbox) continue;
    for (let i = 0; i < m.outline.length; i++) {
      const zuweisung = m.module.find((z) => z.kante === i + 1);
      if (!zuweisung) continue;
      const richtung = kantenRichtung(m.outline[i]!, m.outline[(i + 1) % m.outline.length]!, bbox);
      if (richtung) map.set(richtung, zuweisung.modul);
    }
  }
  return map;
}

/** Elementliste als CSV (Semikolon, CH-tauglich für Excel). */
export function moduleAlsCsv(studie: ModulStudie, modB: number, modH: number): string {
  const kopf = 'Koerper;Kante;Kantenlaenge m;Spalten;Zeilen;Standardmodule;Passstueck-Breite m';
  const zeilen = studie.zeilen.map(
    (z) =>
      `${z.koerper};${z.kante};${(z.laenge / 1000).toFixed(2)};${z.spalten};${z.zeilen};${z.module};${z.rest > 0 ? (z.rest / 1000).toFixed(2) : ''}`,
  );
  const fuss = `Total;;;;;${studie.totalModule};${studie.totalPassstuecke} Stk`;
  return [`Modul ${(modB / 1000).toFixed(2)} x ${(modH / 1000).toFixed(2)} m`, kopf, ...zeilen, fuss].join('\n');
}
