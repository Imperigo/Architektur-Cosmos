import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import '../src/commands/publish';
import { derivePlan, nachbarKontextStufe } from '../src/derive/plan';
import { planToSvg, A3_QUER } from '../src/derive/plansvg';
import { testhausMitKontext } from './fixtures';

/**
 * D3 — Kontext-LOD-Treppe (v0.7.3 §D3, docs/V073-GESTALTUNG-SPEZ.md, Soll
 * 4b): Nachbar-Kontext im GRUNDRISS folgt `doc.settings.phase` (BauPhase) —
 * gefüllt (Wettbewerb/Vorprojekt) → nur Umriss (Bauprojekt/Baueingabe) →
 * ganz weg (Werkplan). Die Parzelle bleibt in JEDER Stufe strichpunktiert
 * sichtbar. Das Schwarzplan-Modul (`derive/schwarzplan.ts`) ist ein
 * eigenständiger, unveränderter Weg — hier geht es NUR um den
 * derivePlan/planToSvg-Weg (`plan.ts`/`plansvg.ts`).
 */

describe('nachbarKontextStufe (reine Stufenfunktion)', () => {
  it('wettbewerb/vorprojekt → fill, bauprojekt/baueingabe → umriss, werkplan → aus', () => {
    expect(nachbarKontextStufe('wettbewerb')).toBe('fill');
    expect(nachbarKontextStufe('vorprojekt')).toBe('fill');
    expect(nachbarKontextStufe('bauprojekt')).toBe('umriss');
    expect(nachbarKontextStufe('baueingabe')).toBe('umriss');
    expect(nachbarKontextStufe('werkplan')).toBe('aus');
  });
});

describe('derivePlan — Kontext-Klassen (Daten-Guard)', () => {
  it('Zonen ohne zonenArt bleiben ohne zone-nachbar/zone-parzelle-Klasse', () => {
    const { doc, storeyId } = testhausMitKontext();
    // Alle Zonen dieser Fixture TRAGEN zonenArt — negativer Beweis über eine
    // frische, kontextfreie Fixture:
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      name: 'Zimmer',
      sia: 'HNF',
      raumTyp: 'zimmer',
      outline: [{ x: 1000, y: 1000 }, { x: 3000, y: 1000 }, { x: 3000, y: 3000 }, { x: 1000, y: 3000 }],
    });
    const plan = derivePlan(doc, storeyId);
    const zimmer = plan.regions.find((r) => r.classes.includes('raumtyp-zimmer'));
    expect(zimmer).toBeDefined();
    expect(zimmer!.classes.some((c) => c.startsWith('zone-'))).toBe(false);
  });

  it('zonenArt "nachbar"/"parzelle" tragen die passende zone-<art>-Klasse', () => {
    const { doc, storeyId } = testhausMitKontext();
    const plan = derivePlan(doc, storeyId);
    const nachbarn = plan.regions.filter((r) => r.classes.includes('zone-nachbar'));
    const parzelle = plan.regions.filter((r) => r.classes.includes('zone-parzelle'));
    expect(nachbarn).toHaveLength(2);
    expect(parzelle).toHaveLength(1);
  });
});

describe('Neue Goldens (v0.7.3 §D3 Kontext-LOD-Treppe)', () => {
  it('Golden: Grundriss-Kontext Wettbewerb (Nachbarn gefüllt #C9C9C9, Parzelle strichpunktiert)', () => {
    const { doc, storeyId } = testhausMitKontext();
    execute(doc, 'design.phaseSetzen', { phase: 'wettbewerb' });
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: 'Golden-Kontext',
      planTitle: 'Grundriss Kontext Wettbewerb',
      date: '12.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/grundriss-kontext-wettbewerb.svg', import.meta.url));
  });

  it('Golden: Grundriss-Kontext Baueingabe (Nachbarn nur Umriss 0.18 #8A8A8A, keine Füllung)', () => {
    const { doc, storeyId } = testhausMitKontext();
    execute(doc, 'design.phaseSetzen', { phase: 'baueingabe' });
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: 'Golden-Kontext',
      planTitle: 'Grundriss Kontext Baueingabe',
      date: '12.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/grundriss-kontext-baueingabe.svg', import.meta.url));
  });

  it('Golden: Grundriss-Kontext Werkplan (Nachbarn AUS, nur Parzelle)', () => {
    const { doc, storeyId } = testhausMitKontext();
    // Default-Phase ist bereits 'werkplan' (model/doc.ts defaultSettings) —
    // execute() trotzdem explizit, damit die Absicht im Test lesbar bleibt.
    execute(doc, 'design.phaseSetzen', { phase: 'werkplan' });
    const svg = planToSvg(doc, storeyId, {
      scale: 100,
      paper: A3_QUER,
      projectName: 'Golden-Kontext',
      planTitle: 'Grundriss Kontext Werkplan',
      date: '12.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/grundriss-kontext-werkplan.svg', import.meta.url));
    const plan = derivePlan(doc, storeyId);
    // Nachbarn erscheinen im Werkplan NICHT als eigene SVG-Fläche, aber
    // `derivePlan` liefert weiterhin die rohe Klasse (Aufrufer-Entscheidung,
    // nicht Geometrie-Entscheidung) — plansvg.ts filtert sie beim Rendern.
    expect(plan.regions.filter((r) => r.classes.includes('zone-parzelle'))).toHaveLength(1);
  });
});
