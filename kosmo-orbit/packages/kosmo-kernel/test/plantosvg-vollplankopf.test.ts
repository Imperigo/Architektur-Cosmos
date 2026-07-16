import { describe, expect, it } from 'vitest';
import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import { A3_QUER, A4_QUER, planToSvg } from '../src/derive/plansvg';

/**
 * `planToSvg` — Vollplankopf im Design-Einzelexport (v0.8.1/P6,
 * `docs/GOLDEN-WECHSEL-081.md`, Owner-Entscheid 4 der v0.8.0,
 * `docs/V080-PLANKOPF-SPEZ.md` §5.3): additiver Nachweis über die 15
 * betroffenen Golden-Dateien hinaus — reine Vertrags-Assertions (kein
 * Golden), die den Kern des Sammelwechsels explizit belegen, statt ihn nur
 * implizit über Golden-Byte-Vergleiche zu beweisen.
 */

function planMitEinerWand(): { doc: KosmoDoc; storeyId: string } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  return { doc, storeyId: (eg.patches[0] as { id: string }).id };
}

describe('planToSvg — Vollplankopf-Framework statt Fussstreifen (v0.8.1/P6)', () => {
  it('rendert die 180×55-mm-Plankopf-Gruppe (`data-teil="plankopf"`) und den kanonischen Nordpfeil', () => {
    const { doc, storeyId } = planMitEinerWand();
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: 'Test',
      planTitle: 'Grundriss EG',
      date: '16.07.2026',
    });
    expect(svg).toContain('data-teil="plankopf"');
    expect(svg).toContain('width="180" height="55"');
    expect(svg).toContain('data-teil="nordpfeil"');
  });

  it('zeigt die Phase als Matrix-Stufe (`siaZuMatrixStufe`), nicht mehr `phaseLabel(settings.phase)`', () => {
    const { doc, storeyId } = planMitEinerWand();
    execute(doc, 'design.siaPhaseSetzen', { siaPhase: 'bauprojekt' });
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: 'Test',
      planTitle: 'Grundriss EG',
      date: '16.07.2026',
    });
    expect(svg).toContain('BP · SIA 32');
    expect(svg).not.toContain('Bauprojekt (SIA');
    // Owner-Entscheid 1 (v0.8.0): design.phaseSetzen (Plan-Detaillierung)
    // koppelt NICHT automatisch an die Plankopf-Matrix-Stufe.
    execute(doc, 'design.phaseSetzen', { phase: 'werkplan' });
    const svg2 = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: 'Test',
      planTitle: 'Grundriss EG',
      date: '16.07.2026',
    });
    expect(svg2).toContain('BP · SIA 32');
  });

  it('leitet das Format-Feld aus dem Papierformat ab (A3/A4 quer)', () => {
    const { doc, storeyId } = planMitEinerWand();
    const svgA3 = planToSvg(doc, storeyId, { scale: 100, paper: A3_QUER, projectName: 'Test', planTitle: 'G', date: '16.07.2026' });
    expect(svgA3).toContain('>A3</text>');
    const svgA4 = planToSvg(doc, storeyId, { scale: 100, paper: A4_QUER, projectName: 'Test', planTitle: 'G', date: '16.07.2026' });
    expect(svgA4).toContain('>A4</text>');
  });

  it('zeigt den Massstab (`opts.scale`) im Massstab-Feld', () => {
    const { doc, storeyId } = planMitEinerWand();
    const svg = planToSvg(doc, storeyId, { scale: 50, paper: A3_QUER, projectName: 'Test', planTitle: 'G', date: '16.07.2026' });
    expect(svg).toContain('>1:50<');
  });

  it('ohne `opts.date` bleibt das Datumsfeld leer (Guard-Prinzip, kein erfundenes "heute" mehr)', () => {
    const { doc, storeyId } = planMitEinerWand();
    const svg = planToSvg(doc, storeyId, { scale: 100, paper: A3_QUER, projectName: 'Test', planTitle: 'G' });
    // Kein Datum irgendeiner Form (weder ein übergebenes noch ein automatisch
    // eingesetztes "heute") — die DATUM-Feldlabel-Zeile bleibt, der Wert leer.
    expect(svg).toContain('>DATUM</text>');
    expect(svg).not.toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it('ohne Büro-/Projektdaten bleibt der Logo-Platzhalter ehrlich (gestrichelte Box, kein erfundener Name)', () => {
    const { doc, storeyId } = planMitEinerWand();
    const svg = planToSvg(doc, storeyId, { scale: 100, paper: A3_QUER, projectName: 'Test', planTitle: 'G', date: '16.07.2026' });
    expect(svg).toContain('stroke-dasharray="1.5 1"');
    expect(svg).toContain('BÜRO-LOGO');
  });
});
