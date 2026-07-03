import { describe, expect, it } from 'vitest';
import '../src/index';
import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
import { segmentiere } from '../src/derive/segmentierer';
import { generiereGrundriss } from '../src/derive/grundrissgenerator';
import { zonenZuWaenden } from '../src/derive/zonenwaende';
import { raumGraph } from '../src/derive/raumgraph';
import type { Storey, Zone } from '../src/model/entities';

function baseDoc() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 2800 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  return { doc, storeyId };
}

describe('V1: segmentierer off-by-one am Bandende', () => {
  it('band 9000, zwei 4500er Wohnungen sollten exakt passen', () => {
    const footprint = [{ x: 0, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 10000 }, { x: 0, y: 10000 }];
    const korridor = [{ x: 0, y: 0 }, { x: 9000, y: 0 }, { x: 9000, y: 2000 }, { x: 0, y: 2000 }];
    // tiefe = 8000 -> breite je Wohnung = 36 m2 * 1e6 / 8000 = 4500 mm
    const erg = segmentiere(footprint, korridor, [{ typ: 'markt', groesse: 36, anzahl: 2 }], { minBreite: 4500 });
    console.log('mix:', erg.mix, 'wohnungen:', erg.wohnungen.map((w) => [w.typ, w.flaeche]));
    expect(erg.mix[0]!.ist).toBe(2);
  });
});

describe('V2: geschossKopieren Elevation bei nicht-oberstem Quellgeschoss', () => {
  it('EG kopieren bei bestehendem 1.OG kollidiert nicht', () => {
    const { doc, storeyId } = baseDoc();
    execute(doc, 'design.geschossErstellen', { name: '1.OG', index: 1, elevation: 2800, height: 2800 });
    execute(doc, 'design.geschossKopieren', { storeyId, anzahl: 1 });
    const storeys = doc.storeysOrdered() as Storey[];
    console.log(storeys.map((s) => [s.name, s.index, s.elevation]));
    const elevations = storeys.map((s) => s.elevation);
    expect(new Set(elevations).size).toBe(elevations.length);
  });
});

describe('V3: raumgraph Zonentuer-Block ohne Raum-Vorrang', () => {
  it('Wohnungstuer verbindet Diele und Korridor, nicht den Container', () => {
    const { doc, storeyId } = baseDoc();
    // Wohnungs-Container (program, ohne raumTyp) zuerst
    const cont = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Wohnung A', sia: 'HNF', program: 'marktgerecht',
      outline: [{ x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 8000 }, { x: 0, y: 8000 }],
    });
    const contId = (cont.patches[0] as { id: string }).id;
    const kor = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Korridor', sia: 'VF', raumTyp: 'korridor',
      outline: [{ x: 0, y: -2000 }, { x: 8000, y: -2000 }, { x: 8000, y: 0 }, { x: 0, y: 0 }],
    });
    const korId = (kor.patches[0] as { id: string }).id;
    const diele = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'Diele', sia: 'VF', raumTyp: 'korridor',
      outline: [{ x: 0, y: 0 }, { x: 1600, y: 0 }, { x: 1600, y: 2400 }, { x: 0, y: 2400 }],
    });
    const dieleId = (diele.patches[0] as { id: string }).id;
    execute(doc, 'design.tuerSetzen', { storeyId, at: { x: 800, y: 0 }, breite: 900 });
    const g = raumGraph(doc, storeyId);
    const namen = new Map(g.zonen.map((z) => [z.id, z.name]));
    const tuerKanten = g.kanten.filter((k) => k.art === 'tuer');
    console.log('tuer-kanten:', tuerKanten.map((k) => [namen.get(k.a), namen.get(k.b)]));
    // Erwartet: genau Diele <-> Korridor
    expect(tuerKanten.some((k) =>
      (k.a === dieleId && k.b === korId) || (k.a === korId && k.b === dieleId),
    )).toBe(true);
    expect(tuerKanten.some((k) => k.a === contId || k.b === contId)).toBe(false);
  });
});

describe('V4: generator v1 (ohne Flur) — Kueche/Zimmer ohne Tuer', () => {
  it('6x6-Wohnung: Kueche hat eine Tuer', () => {
    const g = generiereGrundriss(
      [{ x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 6000 }, { x: 0, y: 6000 }], 'unten');
    console.log('raeume:', g.raeume.map((r) => r.name), 'tueren:', g.tueren, 'diagnose:', g.diagnose);
    // Kueche liegt bei x in [4000..6000], y in [0..2400]; irgendeine Tuer an ihrem Rand?
    const anKueche = g.tueren.some((t) =>
      (t.at.x === 4000 && t.at.y > 0 && t.at.y < 2400) || // linke Kante
      (t.at.y === 2400 && t.at.x > 4000 && t.at.x < 6000)); // obere Kante
    expect(anKueche).toBe(true);
  });
  it('7.5x6-Wohnung mit 1 Zimmer: Zimmer hat eine Tuer', () => {
    const g = generiereGrundriss(
      [{ x: 0, y: 0 }, { x: 7500, y: 0 }, { x: 7500, y: 6000 }, { x: 0, y: 6000 }], 'unten');
    const zimmer = g.raeume.filter((r) => r.raumTyp === 'zimmer');
    console.log('zimmer:', zimmer.length, 'tueren:', g.tueren.length, 'diagnose:', g.diagnose);
    expect(zimmer.length).toBe(1);
    // Zimmer-Zone: x 3600..7500? wohnenB = max(3600, 3000) = 3600, zimmerZone 3900, zimmerZahl 1
    // keine Flur -> Tuer am Zimmer?
    const z = zimmer[0]!;
    const xs = z.outline.map((p) => p.x); const ys = z.outline.map((p) => p.y);
    const inRand = (t: { at: { x: number; y: number } }) =>
      (Math.min(...xs) <= t.at.x && t.at.x <= Math.max(...xs) && (t.at.y === Math.min(...ys) || t.at.y === Math.max(...ys))) ||
      (Math.min(...ys) <= t.at.y && t.at.y <= Math.max(...ys) && (t.at.x === Math.min(...xs) || t.at.x === Math.max(...xs)));
    expect(g.tueren.some(inRand)).toBe(true);
  });
});

describe('V5: FP-Drift der Zimmerkanten -> zonenwaende Klassifikation', () => {
  it('brute force: (a+i*b)+b === a+(i+1)*b fuer Rezept-Werte?', () => {
    let mismatches = 0;
    const beispiele: number[] = [];
    for (let zone = 6000; zone <= 20000; zone += 1) {
      const zahl = Math.floor(zone / 3000);
      if (zahl < 2) continue;
      const b = zone / zahl;
      for (let i = 0; i < zahl - 1; i++) {
        const rechts = (3600 + i * b) + b;
        const links = 3600 + (i + 1) * b;
        if (rechts !== links) { mismatches++; if (beispiele.length < 5) beispiele.push(zone); }
      }
    }
    console.log('FP-mismatches:', mismatches, 'beispiele zimmerZone:', beispiele);
    expect(mismatches).toBe(0); // wenn das failt, ist der Verdacht bestaetigt
  });
  it('konkret: generierter Grundriss -> zonenwaende ohne doppelte Aussenwaende innen', () => {
    const { doc, storeyId } = baseDoc();
    // Wohnung mit zimmerZone, die nicht glatt teilt: breite 14000 -> wohnenB 5600, zone 8400, zahl 2, b 4200 (ganz)
    // nimm 13999? PtSchema will ints. breite 13000: wohnenB 5200, zone 7800, zahl 2, b 3900. glatt.
    // breite 12500: wohnenB 5000, zone 7500, zahl 2, b 3750 glatt. Drift kommt nur bei krummen b.
    const w = execute(doc, 'design.zoneErstellen', {
      storeyId, name: 'W', sia: 'HNF', program: 'markt',
      outline: [{ x: 0, y: 0 }, { x: 12800, y: 0 }, { x: 12800, y: 11000 }, { x: 0, y: 11000 }],
    });
    execute(doc, 'design.grundrissGenerieren', { zoneId: (w.patches[0] as { id: string }).id, korridorSeite: 'unten' });
    const zw = zonenZuWaenden(doc, storeyId);
    const zonen = doc.byKind<Zone>('zone').filter((z) => z.raumTyp);
    console.log('zonen-koordinaten ganzzahlig?', zonen.every((z) => z.outline.every((p) => Number.isInteger(p.x) && Number.isInteger(p.y))));
    console.log(zw.diagnose);
  });
});
