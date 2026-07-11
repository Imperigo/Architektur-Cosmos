import { describe, expect, it } from 'vitest';
import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import { derivePlan } from '../src/derive/plan';
import { deriveDimensions } from '../src/derive/dimensions';
import { planGraphicToDxf, planToDxf } from '../src/dxf/export';
import { parseDxf } from '../src/dxf/import';
import { testhausFensterZweifluegel, testhausFensterband } from './fixtures';

/**
 * V1.6 Block G — DXF-Grundriss-Export (Interop AutoCAD/Rhino/Vectorworks).
 * Geprüft wird die DXF-Struktur (Sektionen, Layer-Tabelle, Entities), die
 * y-Spiegelung (Norden oben wie am Schirm) und der ehrliche Daten-Guard
 * (leerer Plan → gültiges, aber leeres DXF).
 */

function testhaus(): { doc: KosmoDoc; storeyId: string } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
  wand({ x: 0, y: 0 }, { x: 6000, y: 0 });
  wand({ x: 6000, y: 0 }, { x: 6000, y: 4000 });
  wand({ x: 6000, y: 4000 }, { x: 0, y: 4000 });
  wand({ x: 0, y: 4000 }, { x: 0, y: 0 });
  return { doc, storeyId };
}

/** Gruppencode-Paare aus DXF-Text extrahieren (Code, Wert)-Liste. */
function paare(dxf: string): [number, string][] {
  const zeilen = dxf.split('\n');
  const out: [number, string][] = [];
  for (let i = 0; i + 1 < zeilen.length; i += 2) {
    out.push([Number(zeilen[i]!.trim()), zeilen[i + 1]!]);
  }
  return out;
}

describe('planToDxf — Struktur', () => {
  const { doc, storeyId } = testhaus();
  const dxf = planToDxf(doc, storeyId);

  it('ist ein wohlgeformtes R12-DXF (Sektionen + EOF)', () => {
    expect(dxf).toContain('0\nSECTION\n2\nHEADER\n');
    expect(dxf).toContain('9\n$ACADVER\n1\nAC1009\n');
    expect(dxf).toContain('9\n$INSUNITS\n70\n4\n'); // mm
    expect(dxf).toContain('0\nSECTION\n2\nTABLES\n');
    expect(dxf).toContain('0\nSECTION\n2\nENTITIES\n');
    expect(dxf.trimEnd().endsWith('0\nEOF')).toBe(true);
    // Gerade Anzahl Zeilen (jedes Paar = 2 Zeilen).
    expect(dxf.trimEnd().split('\n').length % 2).toBe(0);
  });

  it('deklariert die Layer, die die Entities benutzen (kein undeklarierter Layer)', () => {
    const p = paare(dxf);
    const deklariert = new Set(
      p.filter(([c], i) => c === 2 && p[i - 1]?.[1] === 'LAYER').map(([, v]) => v),
    );
    // Wände sind tragend → Layer TRAGEND muss deklariert sein.
    expect(deklariert.has('TRAGEND')).toBe(true);
    expect(deklariert.has('0')).toBe(true);
    // Jeder in einer Entity (Code 8) benutzte Layer ist deklariert.
    const benutzt = new Set(
      p.filter(([c], i) => c === 8 && ['LINE', 'POLYLINE', 'VERTEX', 'SEQEND', 'ARC', 'TEXT'].includes(p[i - 1]?.[1] ?? '')).map(([, v]) => v),
    );
    for (const l of benutzt) expect(deklariert.has(l)).toBe(true);
  });

  it('schreibt die Wand-Poché als geschlossene POLYLINE (66/70) mit VERTEX + SEQEND', () => {
    expect(dxf).toContain('0\nPOLYLINE\n');
    expect(dxf).toContain('0\nVERTEX\n');
    expect(dxf).toContain('0\nSEQEND\n');
    const p = paare(dxf);
    const idx = p.map(([, v], i) => (v === 'POLYLINE' ? i : -1)).filter((i) => i >= 0);
    expect(idx.length).toBeGreaterThan(0);
    for (const i of idx) {
      const kopf = p.slice(i, i + 8);
      expect(kopf.some(([c, v]) => c === 66 && v === '1')).toBe(true); // Vertices folgen
      expect(kopf.some(([c, v]) => c === 70 && v === '1')).toBe(true); // geschlossen
    }
  });
});

describe('planGraphicToDxf — y-Spiegelung (Norden oben)', () => {
  it('spiegelt Welt-y auf DXF-y (dxfY = -weltY)', () => {
    const plan = {
      storeyId: 's',
      regions: [],
      lines: [{ a: { x: 100, y: 200 }, b: { x: 300, y: 400 }, classes: ['symbol'] }],
      arcs: [],
      axes: [],
      texte: [],
      bounds: null,
    };
    const dxf = planGraphicToDxf(plan);
    const p = paare(dxf);
    const li = p.findIndex(([, v]) => v === 'LINE');
    const seg = Object.fromEntries(p.slice(li, li + 8).map(([c, v]) => [c, v]));
    expect(seg[10]).toBe('100'); // x unverändert
    expect(seg[20]).toBe('-200'); // y gespiegelt
    expect(seg[11]).toBe('300');
    expect(seg[21]).toBe('-400');
  });
});

describe('planToDxf — ehrliche Grenzen', () => {
  it('leeres Geschoss → gültiges, aber entity-freies DXF (kein Absturz)', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const dxf = planToDxf(doc, storeyId);
    expect(dxf).toContain('0\nSECTION\n2\nENTITIES\n');
    expect(dxf.trimEnd().endsWith('0\nEOF')).toBe(true);
    expect(dxf).not.toContain('0\nLINE\n');
    expect(dxf).not.toContain('0\nPOLYLINE\n');
  });

  it('DXF-Text ist reines ASCII (Umlaute umgeschrieben, keine Steuerzeichen)', () => {
    const { doc, storeyId } = testhaus();
    // eslint-disable-next-line no-control-regex
    expect(/[^\x09\x0A\x20-\x7E]/.test(planToDxf(doc, storeyId))).toBe(false);
  });

  it('derivePlan liefert dieselbe Geometrie-Basis wie der SVG-Plan (eine Quelle)', () => {
    const { doc, storeyId } = testhaus();
    const plan = derivePlan(doc, storeyId);
    const dims = deriveDimensions(doc, storeyId);
    expect(plan.regions.length).toBeGreaterThan(0);
    // planToDxf und planGraphicToDxf(derivePlan(...), deriveDimensions(...)) sind identisch.
    expect(planToDxf(doc, storeyId)).toBe(planGraphicToDxf(plan, dims));
  });
});

// v0.7.1 Stream 3A — DXF-Konsolidierung: die Bemassungs-Emission ist aus der
// ehemaligen zweiten DXF-Ableitung (`derive/dxf.ts`, `exportDxf`,
// `@tarikjabiri/dxf`) hierher portiert — DIESER Exporter ist jetzt der
// einzige. Anders als der Vorgänger schreibt er MIT y-Spiegelung (wie jedes
// andere Element hier) und ist roundtrip-fähig: `dxf/import.ts` liest den
// Rest des Plans zurück, ignoriert den Bemassungs-Layer aber bewusst
// (separater Test in dxf-import.test.ts).
describe('planToDxf — Bemassungsketten (v0.7.1 3A, portiert aus derive/dxf.ts)', () => {
  function testhausMitBemassung(): { doc: KosmoDoc; storeyId: string } {
    // Default-Bemassungsstil des Docs ist bereits `aussenKetten: 'beide'`
    // (model/doc.ts) — ein einfaches Rechteck reicht, um eine x- und eine
    // y-Kette zu erzeugen.
    return testhaus();
  }

  it('erzeugt eine Bemassungskette auf LAYER_BEMASSUNG, MIT y-Spiegelung (dxfY = -weltY)', () => {
    const { doc, storeyId } = testhausMitBemassung();
    const dxf = planToDxf(doc, storeyId);
    expect(dxf).toContain('2\nBEMASSUNG\n');
    const p = paare(dxf);
    // Die Masslinie der x-Kette: Welt-Offset minY-1200 = -1200 (kein
    // Stützenraster/Rohkette in der Fixture, also nur die 'oeffnung'-Kette),
    // gespiegelt dxfY = -(-1200) = 1200.
    const bemassungsLinien: [number, string][][] = [];
    for (let i = 0; i < p.length; i++) {
      if (p[i]![0] === 0 && p[i]![1] === 'LINE' && p[i + 1]?.[0] === 8 && p[i + 1]?.[1] === 'BEMASSUNG') {
        bemassungsLinien.push(p.slice(i, i + 8));
      }
    }
    expect(bemassungsLinien.length).toBeGreaterThan(0);
    // Mindestens eine Masslinie liegt bei gespiegeltem y=1200 (x-Kette,
    // Basislinie ohne Tick-Versatz: Code 20/21 exakt 1200).
    const hatGespiegelteMasslinie = bemassungsLinien.some((linie) => {
      const y1 = linie.find(([c]) => c === 20)?.[1];
      const y2 = linie.find(([c]) => c === 21)?.[1];
      return y1 === '1200' && y2 === '1200';
    });
    expect(hatGespiegelteMasslinie).toBe(true);
  });

  it('Bemassungs-Label ist ASCII-rein (dxfText-Vertrag) und trägt keinen SIA-Hochziffer-Datenverlust', () => {
    // Wandlänge 6015 statt 6000 mm — dimensionLabel() würde SIA-typisch
    // «601⁵» liefern (Hochziffer '⁵' ist NICHT-ASCII); der DXF-Pfad
    // schreibt stattdessen einen Dezimalpunkt («601.5»), damit dxfText()
    // beim ASCII-Purge nicht den mm-Rest verliert.
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'AW', target: 'wall', layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    const assemblyId = (aufbau.patches[0] as { id: string }).id;
    const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
    wand({ x: 0, y: 0 }, { x: 6015, y: 0 });
    wand({ x: 6015, y: 0 }, { x: 6015, y: 4000 });
    wand({ x: 6015, y: 4000 }, { x: 0, y: 4000 });
    wand({ x: 0, y: 4000 }, { x: 0, y: 0 });

    const dxf = planToDxf(doc, storeyId);
    // eslint-disable-next-line no-control-regex
    expect(/[^\x09\x0A\x20-\x7E]/.test(dxf)).toBe(false);
    expect(dxf).toContain('601.5'); // Dezimalpunkt-Notation statt Hochziffer-Verlust
  });

  it('Determinismus bleibt: zwei Exporte desselben Docs sind byte-identisch', () => {
    const { doc, storeyId } = testhausMitBemassung();
    const einmal = planToDxf(doc, storeyId);
    const zweimal = planToDxf(doc, storeyId);
    expect(zweimal).toBe(einmal);
  });

  it('Roundtrip: dxf/import.ts liest den Rest des Exports weiter fehlerfrei, auch mit Bemassung im Dokument', () => {
    const { doc, storeyId } = testhausMitBemassung();
    const dxf = planToDxf(doc, storeyId);
    expect(() => parseDxf(dxf)).not.toThrow();
    const zurueck = parseDxf(dxf);
    expect(zurueck.bericht.unbekannteEntities).toEqual({});
    // Der Bemassungs-Layer wird gesehen (Bericht), aber klassiert — keine
    // «unklassiert»-Meldung nur wegen der neuen Bemassung.
    expect(zurueck.bericht.layerBenutzt).toContain('BEMASSUNG');
    expect(zurueck.bericht.layerUnklassiert).toEqual([]);
  });
});

// v0.6.9 Stream F, ADDITIV — docs/FENSTER-KONZEPT.md §5: die neuen
// Plan-Symbole für parametrische Fenster (Sprossen/Öffnungsbogen) und
// Fensterband (Pfostentakt) kommen generisch aus `plan.lines`/`plan.arcs`
// (derive/plan.ts) — `dxf/export.ts` selbst braucht dafür KEINEN neuen Code
// (docs-Behauptung). Diese Tests belegen genau das: kein Absturz, die neuen
// Symbole erscheinen automatisch als LINE/ARC-Entities, «eine Quelle»
// (planToDxf === planGraphicToDxf(derivePlan(...), deriveDimensions(...)))
// bleibt auch hier gültig (v0.7.1 3A: `dims` jetzt explizit mitgegeben, seit
// `planToDxf` auch die Bemassung aus derselben Ableitung zeichnet).
describe('planToDxf — parametrisches Fenster + Fensterband (additiv)', () => {
  it('parametrisches Zweiflügel-Fenster: kein Absturz, der Öffnungsbogen (fenster-bogen) fliesst automatisch als ARC-Entity ein', () => {
    const { doc, storeyId } = testhausFensterZweifluegel();
    const plan = derivePlan(doc, storeyId);
    const dims = deriveDimensions(doc, storeyId);
    const bogenArcs = plan.arcs.filter((a) => a.classes.includes('fenster-bogen'));
    expect(bogenArcs.length).toBeGreaterThan(0);

    expect(() => planToDxf(doc, storeyId)).not.toThrow();
    const dxf = planToDxf(doc, storeyId);
    expect(dxf).toContain('0\nARC\n');
    // Eine Quelle bleibt auch mit Fenster-Symbolik gültig — kein eigener
    // DXF-Codepfad für Fenster nötig (docs/FENSTER-KONZEPT.md §5).
    expect(dxf).toBe(planGraphicToDxf(plan, dims));
    // eslint-disable-next-line no-control-regex
    expect(/[^\x09\x0A\x20-\x7E]/.test(dxf)).toBe(false);
  });

  it('Fensterband (design.curtainWallSetzen): kein Absturz, der Pfostentakt fliesst automatisch als zusätzliche LINE-Entities ein', () => {
    const { doc, storeyId } = testhausFensterband();
    const plan = derivePlan(doc, storeyId);
    const dims = deriveDimensions(doc, storeyId);
    // Pfostentakt-Linien tragen dieselbe Klasse wie die übrigen
    // Fenstersymbol-Linien (derive/plan.ts: `classes: ['symbol', 'fenster', …]`) —
    // ehrlich per Klassenzahl belegt statt nur "irgendeine Linie existiert".
    const fensterLinien = plan.lines.filter((l) => l.classes.includes('fenster'));
    expect(fensterLinien.length).toBeGreaterThan(0);

    expect(() => planToDxf(doc, storeyId)).not.toThrow();
    const dxf = planToDxf(doc, storeyId);
    expect(dxf).toContain('0\nLINE\n');
    expect(dxf).toBe(planGraphicToDxf(plan, dims));
    // eslint-disable-next-line no-control-regex
    expect(/[^\x09\x0A\x20-\x7E]/.test(dxf)).toBe(false);
  });
});
