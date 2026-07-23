import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { derivePlan } from '../src/derive/plan';
import { planToSvg, A3_QUER } from '../src/derive/plansvg';
import { testhausGelaenderRampe, testhausMasskette, testhausWalmdachGrundriss } from './fixtures';

/**
 * v0.9.1 P-B3 (`docs/V091-SPEZ.md` §P-B3, GOLDEN-WECHSEL-091) — der EINE
 * deklarierte Golden-Zug der Version: Geländer (Polylinie + Pfosten-Ticks)
 * und Rampe (Kontur + Lauflinie + Steigungspfeil + %-Text) im Druckweg,
 * beide hinter Daten-Guards. Muster wörtlich `test/masskette.test.ts`
 * («Golden: Grundriss mit gesetzter Masskette»): erst der Guard-Beweis über
 * Bestands-Fixtures OHNE die neuen Entitäten, dann der EINE neue Golden.
 */

describe('Golden-Zug v0.9.1: Geländer + Rampe im Plan (P-B3, 40. Golden)', () => {
  it('Bestands-Fixtures OHNE Geländer/Rampe bleiben strukturell unberührt (kein Guard-Treffer)', () => {
    // Stichprobe über unabhängige Bestands-Fixtures — keines trägt eine
    // gelaender-/ramp-Entität, beide Guards bleiben überall inaktiv.
    for (const { doc, storeyId } of [testhausWalmdachGrundriss(), testhausMasskette()]) {
      const plan = derivePlan(doc, storeyId);
      expect(plan.lines.some((l) => l.classes.includes('gelaender'))).toBe(false);
      expect(plan.lines.some((l) => l.classes.includes('rampe'))).toBe(false);
      expect(plan.texte.some((t) => t.classes.includes('rampe-steigung'))).toBe(false);
    }
  });

  it('Geländer liefert Polylinie + Pfosten-Ticks, Rampe Kontur/Lauflinie/Pfeil/%-Text — aus den geteilten Zerlegungen', () => {
    const { doc, storeyId } = testhausGelaenderRampe();
    const plan = derivePlan(doc, storeyId);

    // Geländer: 2 Polylinien-Segmente; Pfosten (gelaenderTeile-Regel, s.
    // derive/gelaender.ts): 3000er Segment n=3 → k=0..3 = 4 Pfosten, 2500er
    // Segment n=3 → k=1..3 = 3 Pfosten (der Knick zählt nur einmal) = 7
    // Pfosten = 7 Ticks.
    const kettenLinien = plan.lines.filter((l) => l.classes.includes('gelaender') && !l.classes.includes('gelaender-pfosten'));
    const ticks = plan.lines.filter((l) => l.classes.includes('gelaender-pfosten'));
    expect(kettenLinien).toHaveLength(2);
    expect(ticks).toHaveLength(7);

    // Rampe: 4 Kontur-Kanten + Lauflinie + 2 Pfeilschenkel; %-Text = 10.0 %
    const rampenKontur = plan.lines.filter((l) => l.classes.includes('rampe') && !l.classes.includes('lauflinie'));
    const rampenLauf = plan.lines.filter((l) => l.classes.includes('rampe') && l.classes.includes('lauflinie'));
    expect(rampenKontur).toHaveLength(4);
    expect(rampenLauf).toHaveLength(3);
    const steigung = plan.texte.find((t) => t.classes.includes('rampe-steigung'));
    expect(steigung?.text).toBe('10.0 %');
  });

  it('Golden: Grundriss mit Geländer (L-Zug) und Rampe (10 %) ist byte-identisch', () => {
    const { doc, storeyId } = testhausGelaenderRampe();
    const svg = planToSvg(doc, storeyId, {
      scale: 50,
      paper: A3_QUER,
      projectName: 'Golden-Gelaender-Rampe',
      planTitle: 'Grundriss Geländer + Rampe',
      date: '23.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/gelaender-rampe-plan.svg', import.meta.url));
  });
});
