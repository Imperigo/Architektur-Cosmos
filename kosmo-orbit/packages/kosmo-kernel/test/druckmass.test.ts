import { describe, expect, it } from 'vitest';
import { deriveDimensions, dimensionLabel } from '../src/derive/dimensions';
import { planToSvg, A3_QUER } from '../src/derive/plansvg';
import { testhausFensterband, testhausWalmdachGrundriss } from './fixtures';

/**
 * K27 «Druckmass» (v0.9.2, der EINE Golden-Zug — docs/GOLDEN-WECHSEL-092.md):
 * Die automatische Aussenbemassung trägt im Druckweg die Masslinien-
 * Grammatik der Masskette — Hilfslinien (Papier-Luft an der Zeichnung,
 * Papier-Überstand über die Masslinie) und Verdichtung enger Segmente nach
 * EXAKT der Bildschirm-Regel aus E-K27a. Die Ketten-LAGEN bleiben bewusst
 * auf den Welt-Offsets der Ableitung (Begründung im dims-Block von
 * `plansvg.ts`: Werkplan-Annotationszeilen + Bildschirm-Parität).
 */

const DIMS_GRUPPE = /<g stroke="#111" fill="#111">([\s\S]*?)<\/g>/g;

function dimsGruppen(svg: string): string[] {
  return [...svg.matchAll(DIMS_GRUPPE)].map((m) => m[1]!);
}

function svgFuer(fix: { doc: any; storeyId: string }, scale: number): string {
  return planToSvg(fix.doc, fix.storeyId, {
    scale,
    paper: A3_QUER,
    projectName: 'K27-Test',
    planTitle: 'Druckmass',
    date: '23.07.2026',
  });
}

describe('K27 Druckmass — Hilfslinien der Aussenketten', () => {
  it('jede Aussenkette trägt je Messpunkt eine Hilfslinie (2·Ticks+1 Linien), Innenketten keine (Ticks+1)', () => {
    const fix = testhausWalmdachGrundriss();
    const dims = deriveDimensions(fix.doc, fix.storeyId);
    const svg = svgFuer(fix, 100);
    const gruppen = dimsGruppen(svg);
    expect(gruppen).toHaveLength(dims.chains.length);
    dims.chains.forEach((c, i) => {
      const linien = (gruppen[i]!.match(/<line /g) ?? []).length;
      const soll = c.role === 'innen' ? c.ticks.length + 1 : 2 * c.ticks.length + 1;
      expect(linien, `Kette ${i} (${c.axis}/${c.role})`).toBe(soll);
    });
  });

  it('Hilfslinien-Geometrie in Papier-mm: Luft 1 mm an der Basiskante, Überstand 2 mm über die Masslinie', () => {
    const fix = testhausWalmdachGrundriss();
    const dims = deriveDimensions(fix.doc, fix.storeyId);
    const scale = 100;
    const svg = svgFuer(fix, scale);
    const kette = dims.chains.find((c) => c.axis === 'x' && c.role !== 'innen')!;
    const t = kette.ticks[0]!;
    const y1 = -(dims.basis!.y - 1 * scale);
    const y2 = -(kette.offset - 2 * scale);
    expect(svg).toContain(`<line x1="${t}" y1="${y1}" x2="${t}" y2="${y2}"`);
  });
});

describe('K27 Druckmass — Verdichtung enger Segmente (E-K27a-Spiegel)', () => {
  it('Segmente, deren Masszahl nicht zwischen die Ticks passt, werden zum Punktsymbol — exakt nach der Bildschirm-Regel', () => {
    const fix = testhausFensterband();
    const dims = deriveDimensions(fix.doc, fix.storeyId);
    const scale = 50;
    const svg = svgFuer(fix, scale);
    // Erwartung aus der Regel selbst (label.length·0.62·fs > 0.92·Segment):
    let erwartet = 0;
    for (const c of dims.chains) {
      const fs = (c.role === 'innen' ? 2.2 : 2.6) * scale;
      for (let i = 0; i < c.ticks.length - 1; i++) {
        const label = dimensionLabel(c.ticks[i]!, c.ticks[i + 1]!);
        if (label.length * 0.62 * fs > (c.ticks[i + 1]! - c.ticks[i]!) * 0.92) erwartet++;
      }
    }
    expect(erwartet).toBeGreaterThan(0); // das Fixture HAT enge Leibungssegmente
    const kreise = dimsGruppen(svg)
      .map((g) => (g.match(/<circle /g) ?? []).length)
      .reduce((a, b) => a + b, 0);
    expect(kreise).toBe(erwartet);
  });

  it('breite Segmente behalten ihre Masszahl als Text (keine Pauschal-Verdichtung)', () => {
    const fix = testhausWalmdachGrundriss();
    const svg = svgFuer(fix, 100);
    const gruppen = dimsGruppen(svg);
    const texte = gruppen.map((g) => (g.match(/<text /g) ?? []).length).reduce((a, b) => a + b, 0);
    expect(texte).toBeGreaterThan(0);
  });
});
