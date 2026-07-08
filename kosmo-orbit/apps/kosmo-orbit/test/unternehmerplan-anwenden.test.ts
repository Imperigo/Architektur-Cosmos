import { beforeEach, describe, expect, it } from 'vitest';
import {
  KosmoDoc,
  derivePlan,
  execute,
  invertPatches,
  parseDxf,
  planGraphicToDxf,
  type AbgleichBefund,
  type AnyPatch,
  type PlanGraphic,
  type Wall,
} from '@kosmo/kernel';
import { vergleichePlaene } from '@kosmo/kernel';
import {
  baueKarten,
  commandFuerKarte,
  findeWandFuerBefund,
  useUnternehmerplan,
} from '../src/modules/design/unternehmerplan';

/**
 * V1.6 Block C / C4b — Stufe-1-Karten anwenden (Entscheid C-E4,
 * `docs/SUBMISSION-KONZEPT.md`). Rein, kein DOM: `findeWandFuerBefund` und
 * `commandFuerKarte` sind pure Funktionen; der eigentliche `runCommand`-Weg
 * (mit Undo-Gruppe/Sync/Journal) ist E2E-Sache
 * (`e2e/unternehmerplan.spec.ts`). Hier wird stattdessen `execute` +
 * `invertPatches` direkt genutzt — derselbe Mechanismus, den `History.undo`
 * im Kern verwendet (`commands/core.ts`) — um zu beweisen, dass Anwenden UND
 * Undo exakt sind.
 *
 * Test-Doc wie in `unternehmerplan.test.ts` (execute + design.*, vier Wände
 * + ein Fenster): die vier Wände unionieren zu EINER TRAGEND-Poché-Region;
 * die «linke Aussenkante» (Ring-Indizes 9/10, ermittelt am selben Testdoc
 * wie im Nachbartest) ist die Aussenkante der zuletzt gezeichneten
 * (vierten) Wand — a:(0,4000)→b:(0,0). Sie um 50 mm in x zu verschieben
 * ergibt einen 'verschoben'-Befund mit Segment x≈-50 und delta (50,0); die
 * Architekten-Rekonstruktion (segment − delta) liegt bei x=-100, 100 mm
 * (= halbe Wanddicke 200 mm) neben der Wandachse x=0 — innerhalb der
 * Toleranz Wanddicke+5mm, aber ausserhalb jeder anderen Wandachse.
 */

function baueTestpaar(): { doc: KosmoDoc; plan: PlanGraphic; dxfString: string; waende: Wall[] } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const sid = (eg.patches[0] as { id: string }).id;
  const auf = execute(doc, 'design.aufbauErstellen', {
    name: 'AW',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
  });
  const aid = (auf.patches[0] as { id: string }).id;
  const w = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    execute(doc, 'design.wandZeichnen', { storeyId: sid, a, b, assemblyId: aid });
  w({ x: 0, y: 0 }, { x: 6000, y: 0 });
  w({ x: 6000, y: 0 }, { x: 6000, y: 4000 });
  w({ x: 6000, y: 4000 }, { x: 0, y: 4000 });
  w({ x: 0, y: 4000 }, { x: 0, y: 0 });
  const waende = doc.byKind<Wall>('wall');
  execute(doc, 'design.oeffnungSetzen', {
    wallId: waende[0]!.id,
    openingType: 'fenster',
    center: 3000,
    width: 1600,
    height: 1400,
    sill: 900,
  });

  const plan = derivePlan(doc, sid);
  const dxfString = planGraphicToDxf(plan);
  return { doc, plan, dxfString, waende };
}

/** Baut den 'verschoben'-Befund der linken Wand (50 mm in x) — identische
 * Ring-Mutation wie im Nachbartest `unternehmerplan.test.ts` (c). */
function verschobenerBefund(plan: PlanGraphic, dxfString: string): AbgleichBefund {
  const dxf = parseDxf(dxfString);
  const region = dxf.regions.find((r) => r.layer === 'TRAGEND')!;
  const linkeAussenkante = new Set([9, 10]);
  region.ring = region.ring.map((p, i) => (linkeAussenkante.has(i) ? { x: p.x + 50, y: p.y } : p));

  const abgleich = vergleichePlaene(plan, dxf);
  const karten = baueKarten(abgleich, dxf.bericht);
  const verschoben = karten.filter((k) => k.befund.art === 'verschoben' && k.befund.klasse === 'tragend');
  expect(verschoben.length).toBe(1);
  return verschoben[0]!.befund;
}

beforeEach(() => {
  useUnternehmerplan.getState().verwerfen();
});

describe('findeWandFuerBefund', () => {
  it('findet die richtige Wand bei 50-mm-Verschiebung', () => {
    const { doc, plan, dxfString, waende } = baueTestpaar();
    const befund = verschobenerBefund(plan, dxfString);
    expect(befund.delta).toEqual({ x: 50, y: 0 });

    const linkeWand = waende[3]!; // a:(0,4000)→b:(0,0), zuletzt gezeichnet
    expect(linkeWand.a).toEqual({ x: 0, y: 4000 });
    expect(linkeWand.b).toEqual({ x: 0, y: 0 });

    const gefundeneId = findeWandFuerBefund(doc, befund);
    expect(gefundeneId).toBe(linkeWand.id);
  });

  it('liefert null bei zwei parallelen nahen Wänden (mehrdeutig)', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const sid = (eg.patches[0] as { id: string }).id;
    const auf = execute(doc, 'design.aufbauErstellen', {
      name: 'AW',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    const aid = (auf.patches[0] as { id: string }).id;
    // Zwei parallele Wände 100 mm auseinander — beide innerhalb Wanddicke(200)+5mm
    // einer dazwischenliegenden Rekonstruktion.
    execute(doc, 'design.wandZeichnen', { storeyId: sid, a: { x: 0, y: 0 }, b: { x: 0, y: 1000 }, assemblyId: aid });
    execute(doc, 'design.wandZeichnen', { storeyId: sid, a: { x: 100, y: 0 }, b: { x: 100, y: 1000 }, assemblyId: aid });

    const befund: AbgleichBefund = {
      art: 'verschoben',
      klasse: 'tragend',
      segment: { a: { x: 60, y: 0 }, b: { x: 60, y: 1000 } },
      delta: { x: 10, y: 0 },
      konfidenz: 0.9,
    };
    expect(findeWandFuerBefund(doc, befund)).toBeNull();
  });

  it('liefert null bei einem \'neu\'-Befund', () => {
    const doc = new KosmoDoc();
    const befund: AbgleichBefund = {
      art: 'neu',
      klasse: 'tragend',
      segment: { a: { x: 0, y: 0 }, b: { x: 0, y: 1000 } },
      konfidenz: 0.9,
    };
    expect(findeWandFuerBefund(doc, befund)).toBeNull();
  });

  it('liefert null ohne Wände im Doc (0 Kandidaten)', () => {
    const doc = new KosmoDoc();
    const befund: AbgleichBefund = {
      art: 'verschoben',
      klasse: 'tragend',
      segment: { a: { x: 0, y: 0 }, b: { x: 0, y: 1000 } },
      delta: { x: 10, y: 0 },
      konfidenz: 0.9,
    };
    expect(findeWandFuerBefund(doc, befund)).toBeNull();
  });
});

describe('commandFuerKarte', () => {
  it('liefert design.verschieben mit korrektem delta für die eindeutige Stufe-1-Karte', () => {
    const { doc, plan, dxfString, waende } = baueTestpaar();
    const dxf = parseDxf(dxfString);
    const region = dxf.regions.find((r) => r.layer === 'TRAGEND')!;
    const linkeAussenkante = new Set([9, 10]);
    region.ring = region.ring.map((p, i) => (linkeAussenkante.has(i) ? { x: p.x + 50, y: p.y } : p));
    const abgleich = vergleichePlaene(plan, dxf);
    const karten = baueKarten(abgleich, dxf.bericht);
    const karte = karten.find((k) => k.befund.art === 'verschoben' && k.befund.klasse === 'tragend')!;
    expect(karte.stufe).toBe(1);

    const command = commandFuerKarte(doc, karte);
    expect(command).toEqual({
      id: 'design.verschieben',
      params: { entityId: waende[3]!.id, dx: 50, dy: 0 },
    });
  });

  it('liefert null für eine Stufe-2-Karte (kein Anwenden ohne eindeutige Wand)', () => {
    const { plan, dxfString, doc } = baueTestpaar();
    const dxf = parseDxf(dxfString);
    dxf.lines.push({ a: { x: 50000, y: 50000 }, b: { x: 50400, y: 50000 }, layer: 'DURCHBRUCH' });
    const abgleich = vergleichePlaene(plan, dxf);
    const karten = baueKarten(abgleich, dxf.bericht);
    const karte = karten.find((k) => k.befund.art === 'neu' && k.befund.klasse === 'aussparung')!;
    expect(karte.stufe).toBe(2);
    expect(commandFuerKarte(doc, karte)).toBeNull();
  });
});

describe('Karte anwenden + Undo (execute/invertPatches)', () => {
  it('nach execute(design.verschieben) ist die Wand verschoben, Undo stellt exakt zurück', () => {
    const { doc, plan, dxfString, waende } = baueTestpaar();
    const befund = verschobenerBefund(plan, dxfString);
    const karte = { id: 'up-1', stufe: 1 as const, titel: '', detail: '', befund };
    const command = commandFuerKarte(doc, karte)!;
    expect(command).not.toBeNull();

    const linkeWand = waende[3]!;
    const vorher = { a: { ...linkeWand.a }, b: { ...linkeWand.b } };

    const result = execute(doc, command.id, command.params);
    const nachher = doc.get<Wall>(linkeWand.id)!;
    expect(nachher.a).toEqual({ x: vorher.a.x + 50, y: vorher.a.y });
    expect(nachher.b).toEqual({ x: vorher.b.x + 50, y: vorher.b.y });

    // Undo — derselbe Mechanismus wie `History.undo` (commands/core.ts):
    // Patches invertieren, auf den Doc anwenden.
    const inverted: AnyPatch[] = invertPatches(result.patches);
    doc.apply(inverted);
    const zurueckgesetzt = doc.get<Wall>(linkeWand.id)!;
    expect(zurueckgesetzt.a).toEqual(vorher.a);
    expect(zurueckgesetzt.b).toEqual(vorher.b);
  });
});
