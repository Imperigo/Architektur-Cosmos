import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import { loeseLaufPlanRefs, type LaufPlan } from '../src';

/**
 * v0.8.6/PB1 (E4, `docs/V086-SPEZ.md` §3) — Unit-Tests für die @ref-
 * Platzhalter-Auflösung, hochgezogen aus `wissen/training/eval/
 * kosmo-laufplaene/pruefe-laufplaene.mts` (vormals lokale
 * `loeseWertAuf`/`findeEindeutig`-Kopie). Semantik/Fehlermeldungen sind
 * EXAKT dieselben wie im Prüfcode — dieselben Fixtures beweisen es hier
 * isoliert, ohne den ganzen Prüfcode mitzuziehen.
 */

function einSchrittPlan(commandId: string, params: unknown): LaufPlan {
  return { titel: 'Test', schritte: [{ commandId, params, begruendung: 'b' }] };
}

describe('loeseLaufPlanRefs', () => {
  it('lässt Werte ohne @ref-Präfix unverändert (Zahlen, Objekte, Arrays, Strings)', () => {
    const doc = new KosmoDoc();
    const plan = einSchrittPlan('design.wandZeichnen', {
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
      liste: [1, 2, 3],
      text: 'kein Ref',
    });
    const aufgeloest = loeseLaufPlanRefs(plan, doc);
    expect(aufgeloest.schritte[0]!.params).toEqual(plan.schritte[0]!.params);
    // Neue Objektidentität (kein Alias auf die Eingabe) — die Eingabe bleibt unangetastet.
    expect(aufgeloest).not.toBe(plan);
  });

  it('löst @ref:storey:<name> gegen ein im Doc vorhandenes Geschoss auf', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', {
      name: 'Rohbau EG',
      index: 0,
      elevation: 0,
      height: 3000,
    });
    const storeyId = (eg.patches[0] as { id: string }).id;

    const plan = einSchrittPlan('design.zoneErstellen', {
      storeyId: '@ref:storey:Rohbau EG',
      outline: [{ x: 0, y: 0 }],
      name: 'Zone',
    });
    const aufgeloest = loeseLaufPlanRefs(plan, doc);
    expect((aufgeloest.schritte[0]!.params as { storeyId: string }).storeyId).toBe(storeyId);
  });

  it('löst @ref:aufbau:<name>, @ref:sheet:<name>, @ref:graph:<name> auf', () => {
    const doc = new KosmoDoc();
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'AW Test',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    const aufbauId = (aufbau.patches[0] as { id: string }).id;
    const blatt = execute(doc, 'publish.blattErstellen', { name: 'Blatt A', format: 'A3', orientation: 'quer' });
    const sheetId = (blatt.patches[0] as { id: string }).id;
    const graph = execute(doc, 'vis.graphErstellen', { name: 'Graph A' });
    const graphId = (graph.patches[0] as { id: string }).id;

    const aufgeloest = loeseLaufPlanRefs(
      einSchrittPlan('irgendein.command', {
        aufbauId: '@ref:aufbau:AW Test',
        sheetId: '@ref:sheet:Blatt A',
        graphId: '@ref:graph:Graph A',
      }),
      doc,
    );
    const params = aufgeloest.schritte[0]!.params as { aufbauId: string; sheetId: string; graphId: string };
    expect(params.aufbauId).toBe(aufbauId);
    expect(params.sheetId).toBe(sheetId);
    expect(params.graphId).toBe(graphId);
  });

  it('löst @ref:node:<graphName>:<typ> auf', () => {
    const doc = new KosmoDoc();
    const graph = execute(doc, 'vis.graphErstellen', { name: 'Graph A' });
    const graphId = (graph.patches[0] as { id: string }).id;
    execute(doc, 'vis.nodeSetzen', { graphId, typ: 'modell', x: 0, y: 0 });
    const nodeId = (doc.byKind('visgraph')[0] as unknown as { nodes: { id: string; typ: string }[] }).nodes.find(
      (n) => n.typ === 'modell',
    )!.id;

    const aufgeloest = loeseLaufPlanRefs(
      einSchrittPlan('vis.verbinden', { from: '@ref:node:Graph A:modell' }),
      doc,
    );
    expect((aufgeloest.schritte[0]!.params as { from: string }).from).toBe(nodeId);
  });

  it('löst verschachtelte @refs in Arrays/Objekten rekursiv auf', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;

    const aufgeloest = loeseLaufPlanRefs(
      einSchrittPlan('x', { verschachtelt: { liste: ['@ref:storey:EG', 'text'] } }),
      doc,
    );
    expect((aufgeloest.schritte[0]!.params as { verschachtelt: { liste: string[] } }).verschachtelt.liste).toEqual([
      storeyId,
      'text',
    ]);
  });

  it('mehrere Schritte werden alle aufgelöst — Ergebnis ist ein NEUER Plan (kein Mutieren der Eingabe)', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const plan: LaufPlan = {
      titel: 'Mehrschrittig',
      schritte: [
        { commandId: 'a', params: { storeyId: '@ref:storey:EG' }, begruendung: 'b1' },
        { commandId: 'b', params: { storeyId: '@ref:storey:EG' }, begruendung: 'b2' },
      ],
    };
    const aufgeloest = loeseLaufPlanRefs(plan, doc);
    expect((aufgeloest.schritte[0]!.params as { storeyId: string }).storeyId).toBe(storeyId);
    expect((aufgeloest.schritte[1]!.params as { storeyId: string }).storeyId).toBe(storeyId);
    // Eingabe unangetastet — die rohen @ref-Strings bleiben in `plan` stehen.
    expect((plan.schritte[0]!.params as { storeyId: string }).storeyId).toBe('@ref:storey:EG');
  });

  it('wirft einen verständlichen Fehler bei unbekannter Referenz (kein stilles undefined)', () => {
    const doc = new KosmoDoc();
    expect(() => loeseLaufPlanRefs(einSchrittPlan('x', { storeyId: '@ref:storey:Nicht Vorhanden' }), doc)).toThrow(
      /@ref:storey:Nicht Vorhanden.*keine Entity dieses Namens/,
    );
  });

  it('wirft bei mehrdeutiger Referenz (zwei Entities mit demselben Namen)', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.geschossErstellen', { name: 'Doppelt', index: 0, elevation: 0, height: 3000 });
    execute(doc, 'design.geschossErstellen', { name: 'Doppelt', index: 1, elevation: 3000, height: 3000 });
    expect(() => loeseLaufPlanRefs(einSchrittPlan('x', { storeyId: '@ref:storey:Doppelt' }), doc)).toThrow(
      /NICHT eindeutig/,
    );
  });

  it('wirft bei unbekanntem Referenz-Typ und bei ungültigem @ref:node ohne Typ', () => {
    const doc = new KosmoDoc();
    expect(() => loeseLaufPlanRefs(einSchrittPlan('x', { v: '@ref:unbekannterTyp:name' }), doc)).toThrow(
      /Unbekannter\/unvollständiger Platzhalter/,
    );
    expect(() => loeseLaufPlanRefs(einSchrittPlan('x', { v: '@ref:node:nurGraph' }), doc)).toThrow(
      /Ungültiger @ref:node-Platzhalter/,
    );
  });

  it('wirft bei @ref:node auf einen Graphen, der den referenzierten Node-Typ nicht enthält', () => {
    const doc = new KosmoDoc();
    execute(doc, 'vis.graphErstellen', { name: 'Graph A' });
    expect(() => loeseLaufPlanRefs(einSchrittPlan('x', { v: '@ref:node:Graph A:kamera' }), doc)).toThrow(
      /kein Node dieses Typs im Graphen/,
    );
  });
});
