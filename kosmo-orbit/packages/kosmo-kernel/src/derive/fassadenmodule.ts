import type { KosmoDoc } from '../model/doc';
import type { MassBody } from '../model/entities';

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
      if (laenge < b2) continue;
      const rows = Math.max(1, Math.floor(m.height / h2));
      const spalten = Math.floor(laenge / b2);
      const rest = laenge - spalten * b2;
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
