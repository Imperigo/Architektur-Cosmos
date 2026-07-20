import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { testhausWalmdachGrundriss } from './fixtures';
import { derivePlan, execute, type Wall } from '../src';
import { A3_QUER, planToSvg } from '../src/derive/plansvg';

/**
 * v0.8.11 P-B3 (`docs/V0811-SPEZ.md` §2 E5, Matrix C-8) — das
 * Schloss-Symbol an gesperrten Elementen ist der EINZIGE Golden-Zug der
 * Version, in der strengsten Form: 0 bewegte Bestands-Goldens, +1 NEUER
 * Golden (`plan-schloss.svg`). Der harte Daten-Guard (`meta.locked`) wird
 * hier doppelt bewiesen: (a) Bestands-Fixtures ohne locked erzeugen keine
 * einzige schloss-Linie, (b) das gesperrte Element erzeugt exakt das
 * 7-Segment-Vorhängeschloss am Anker.
 */

describe('Schloss-Symbol an gesperrten Elementen (v0.8.11 E5, 39. SVG-Golden)', () => {
  it('Daten-Guard: Bestands-Fixture OHNE locked → keine schloss-Klasse im Plan', () => {
    const { doc, storeyId } = testhausWalmdachGrundriss();
    const plan = derivePlan(doc, storeyId);
    expect(plan.lines.some((l) => l.classes.includes('schloss'))).toBe(false);
  });

  it('gesperrte Wand → exakt 7 schloss-Segmente (Körper 4 + Bügel 3) an der Achsen-Mitte, entsperren räumt sie wieder', () => {
    const { doc, storeyId } = testhausWalmdachGrundriss();
    const wand = doc.byKind<Wall>('wall').find((w) => w.storeyId === storeyId)!;
    execute(doc, 'design.sperren', { entityId: wand.id, locked: true });
    const plan = derivePlan(doc, storeyId);
    const schloss = plan.lines.filter((l) => l.classes.includes('schloss'));
    expect(schloss).toHaveLength(7);
    // Anker = Achsen-Mitte + 150/150-Versatz (Körper-Ursprung).
    const mitte = { x: Math.round((wand.a.x + wand.b.x) / 2), y: Math.round((wand.a.y + wand.b.y) / 2) };
    expect(schloss[0]!.a).toEqual({ x: mitte.x + 150, y: mitte.y + 150 });

    execute(doc, 'design.sperren', { entityId: wand.id, locked: false });
    const danach = derivePlan(doc, storeyId);
    expect(danach.lines.some((l) => l.classes.includes('schloss'))).toBe(false);
  });

  it('Golden: Grundriss mit EINER gesperrten Wand ist byte-identisch (plan-schloss.svg)', () => {
    const { doc, storeyId } = testhausWalmdachGrundriss();
    const wand = doc.byKind<Wall>('wall').find((w) => w.storeyId === storeyId)!;
    execute(doc, 'design.sperren', { entityId: wand.id, locked: true });
    const svg = planToSvg(doc, storeyId, {
      scale: 50,
      paper: A3_QUER,
      projectName: 'Golden-Schloss',
      planTitle: 'Grundriss gesperrte Wand',
      date: '20.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/plan-schloss.svg', import.meta.url));
  });
});
