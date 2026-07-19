import { describe, expect, it } from 'vitest';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import '../src/commands/publish';
import { planInnerSvg } from '../src/derive/plansvg';
import { sheetToSvg } from '../src/derive/sheet';
import { testhausMitKontext } from './fixtures';

/**
 * v0.8.6 §3 E3 / D3 — Raumtyp-Sichtbarkeit als Opt-in: `planInnerSvg`s
 * `opts.datenAttribute` (Default AUS) trägt `data-raumtyp="<typ>"` auf jede
 * Region mit einer `raumtyp-<typ>`-Klasse (`derive/plan.ts:744`, Zonen mit
 * `Zone.raumTyp`); Flächen ohne Raumtyp bleiben ohne Attribut. `derive/
 * sheet.ts`s `sheetToSvg`-Option `datenAttribute` reicht das Flag NUR an
 * `grundriss`-Platzierungen weiter. Sanktion 1 (V086-SPEZ §6): der Default-
 * Pfad (kein `opts`/`opts.datenAttribute` fehlt oder `false`) bleibt
 * BYTE-IDENTISCH — bewiesen unten direkt UND über den leeren Golden-Diff
 * (`git status --short packages/kosmo-kernel/test/golden`, Gate im
 * Abschlussbericht).
 */

function testhausMitRaumtyp(): { doc: ReturnType<typeof testhausMitKontext>['doc']; storeyId: string } {
  const { doc, storeyId } = testhausMitKontext();
  execute(doc, 'design.zoneErstellen', {
    storeyId,
    name: 'Wohnen',
    sia: 'HNF',
    raumTyp: 'wohnen',
    outline: [
      { x: 1000, y: 1000 },
      { x: 4000, y: 1000 },
      { x: 4000, y: 4000 },
      { x: 1000, y: 4000 },
    ],
  });
  // Zweite Zone OHNE raumTyp — Daten-Guard-Gegenprobe (kein erfundenes
  // Attribut auf einer Fläche ohne Raumtyp-Information).
  execute(doc, 'design.zoneErstellen', {
    storeyId,
    name: 'Ohne Raumtyp',
    sia: 'HNF',
    outline: [
      { x: 5000, y: 1000 },
      { x: 7000, y: 1000 },
      { x: 7000, y: 3000 },
      { x: 5000, y: 3000 },
    ],
  });
  return { doc, storeyId };
}

describe('planInnerSvg — opts.datenAttribute (E3-Opt-in, Default AUS)', () => {
  it('ohne opts: kein data-raumtyp im SVG (Bestandsverhalten)', () => {
    const { doc, storeyId } = testhausMitRaumtyp();
    const { inner } = planInnerSvg(doc, storeyId, 100);
    expect(inner).not.toContain('data-raumtyp');
  });

  it('opts.datenAttribute: false explizit → weiterhin kein data-raumtyp', () => {
    const { doc, storeyId } = testhausMitRaumtyp();
    const { inner } = planInnerSvg(doc, storeyId, 100, { datenAttribute: false });
    expect(inner).not.toContain('data-raumtyp');
  });

  it('opts.datenAttribute:false und weggelassenes opts sind byte-identisch (Default-Pfad unangetastet)', () => {
    const { doc, storeyId } = testhausMitRaumtyp();
    const ohneOpts = planInnerSvg(doc, storeyId, 100).inner;
    const mitFalse = planInnerSvg(doc, storeyId, 100, { datenAttribute: false }).inner;
    expect(mitFalse).toBe(ohneOpts);
  });

  it('opts.datenAttribute:true trägt data-raumtyp="wohnen" auf der Raumtyp-Fläche', () => {
    const { doc, storeyId } = testhausMitRaumtyp();
    const { inner } = planInnerSvg(doc, storeyId, 100, { datenAttribute: true });
    expect(inner).toContain('data-raumtyp="wohnen"');
  });

  it('opts.datenAttribute:true lässt Flächen OHNE Raumtyp ohne Attribut (kein erfundener Wert)', () => {
    const { doc, storeyId } = testhausMitRaumtyp();
    const { inner } = planInnerSvg(doc, storeyId, 100, { datenAttribute: true });
    // Genau EIN data-raumtyp-Vorkommen — die zweite Zone (ohne raumTyp) und
    // alle übrigen Regionen (Wände, Parzelle, Nachbarn) tragen keines.
    const treffer = inner.match(/data-raumtyp="/g) ?? [];
    expect(treffer).toHaveLength(1);
  });

  it('opts.datenAttribute:true UND opts.thema (A5) koexistieren — Themenplan-Regel bestimmt weiter die Füllfarbe', () => {
    const { doc, storeyId } = testhausMitRaumtyp();
    const thema = {
      name: 'Nutzung',
      regeln: [{ kriterium: 'raumTyp' as const, wert: 'wohnen', farbe: '#f0a0a0' }],
    };
    const { inner } = planInnerSvg(doc, storeyId, 100, { thema, datenAttribute: true });
    expect(inner).toContain('data-raumtyp="wohnen"');
    expect(inner).toContain('#f0a0a0');
  });
});

describe('sheetToSvg — opts.datenAttribute reicht NUR an grundriss-Platzierungen durch', () => {
  function blattMitGrundriss(storeyId: string, doc: ReturnType<typeof testhausMitRaumtyp>['doc']): string {
    const sheet = execute(doc, 'publish.blattErstellen', { name: 'Test', format: 'A1', orientation: 'quer' });
    const sheetId = (sheet.patches[0] as { id: string }).id;
    execute(doc, 'publish.ansichtPlatzieren', {
      sheetId,
      view: 'grundriss',
      storeyId,
      scale: 100,
      x: 400,
      y: 250,
    });
    return sheetId;
  }

  it('ohne opts.datenAttribute (Bestandsaufrufer wie export-sheets.ts/kxp-io.ts): kein data-raumtyp', () => {
    const { doc, storeyId } = testhausMitRaumtyp();
    const sheetId = blattMitGrundriss(storeyId, doc);
    const svg = sheetToSvg(doc, sheetId, { projectName: 'Test' });
    expect(svg).not.toContain('data-raumtyp');
  });

  it('opts.datenAttribute:true (Publish-Blatt-Renderpfad): data-raumtyp erscheint im Blatt-SVG', () => {
    const { doc, storeyId } = testhausMitRaumtyp();
    const sheetId = blattMitGrundriss(storeyId, doc);
    const svg = sheetToSvg(doc, sheetId, { projectName: 'Test', datenAttribute: true });
    expect(svg).toContain('data-raumtyp="wohnen"');
  });

  it('opts.datenAttribute:true, aber KEIN Grundriss platziert (nur Axo) → keine Wirkung, kein Fehler', () => {
    const { doc } = testhausMitRaumtyp();
    const sheet = execute(doc, 'publish.blattErstellen', { name: 'Axo', format: 'A1', orientation: 'quer' });
    const sheetId = (sheet.patches[0] as { id: string }).id;
    execute(doc, 'publish.ansichtPlatzieren', { sheetId, view: 'axo', scale: 100, x: 400, y: 250 });
    const svg = sheetToSvg(doc, sheetId, { projectName: 'Axo', datenAttribute: true });
    expect(svg).not.toContain('data-raumtyp');
  });
});
