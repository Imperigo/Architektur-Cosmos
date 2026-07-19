import { describe, expect, it } from 'vitest';
import { KosmoDoc, invertPatches } from '../src/model/doc';
import { execute } from '../src/commands/core';
import { CommandError } from '../src/commands/core';
import '../src/commands/design';
import type { Stair } from '../src/model/entities';

/**
 * `design.treppeGeometrieSetzen` (E1, `docs/V087-SPEZ.md` §3) —
 * In-place-Endpunkt-/Eckpunkt-Setter für eine bestehende Treppe, Muster
 * `design.wandGeometrieSetzen` (E1, V086-SPEZ, siehe
 * `wand-geometrie-setzen.test.ts`). Deckt alle vier Formen
 * (gerade/podest/u/l), jede der fünf Wurf-Regeln (mit «Treppe unverändert
 * nach Wurf»-Beweis) sowie den Undo-Vertrag ab.
 */

function grundgeruest(height = 3000): { doc: KosmoDoc; storeyId: string } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height });
  const storeyId = (eg.patches[0] as { id: string }).id;
  return { doc, storeyId };
}

describe('design.treppeGeometrieSetzen — Happy Path je Form (E1, V087-SPEZ)', () => {
  it('form «gerade»: a-Drag verschiebt NUR a, Identität/width/form/storeyId/b bleiben, EIN Patch', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.treppeErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 0, y: 4000 },
      width: 1200,
    });
    const stairId = (r0.patches[0] as { id: string }).id;
    const vorher = doc.get<Stair>(stairId)!;

    const r = execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId, a: { x: 1000, y: 0 } });

    const nachher = doc.get<Stair>(stairId)!;
    expect(nachher.id).toBe(vorher.id);
    expect(nachher.a).toEqual({ x: 1000, y: 0 });
    expect(nachher.b).toEqual({ x: 0, y: 4000 }); // unverändert
    expect(nachher.width).toBe(1200);
    expect(nachher.form).toBe(vorher.form); // 'gerade' → kein form-Feld
    expect(nachher.storeyId).toBe(storeyId);
    expect(r.patches).toHaveLength(1);
    expect(r.summary).toBe('Treppen-Geometrie 4.123 m');
  });

  it('form «gerade»: b-Drag verschiebt NUR b', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.treppeErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 0, y: 4000 },
      width: 1200,
    });
    const stairId = (r0.patches[0] as { id: string }).id;

    const r = execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId, b: { x: 2000, y: 4000 } });

    const nachher = doc.get<Stair>(stairId)!;
    expect(nachher.a).toEqual({ x: 0, y: 0 }); // unverändert
    expect(nachher.b).toEqual({ x: 2000, y: 4000 });
    expect(nachher.width).toBe(1200);
    expect(r.patches).toHaveLength(1);
    expect(r.summary).toBe('Treppen-Geometrie 4.472 m');
  });

  it('form «podest»: b-Drag lässt form/width/a unangetastet', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.treppeErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 0, y: 5000 },
      width: 1200,
      form: 'podest',
    });
    const stairId = (r0.patches[0] as { id: string }).id;

    const r = execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId, b: { x: 0, y: 6000 } });

    const nachher = doc.get<Stair>(stairId)!;
    expect(nachher.form).toBe('podest');
    expect(nachher.a).toEqual({ x: 0, y: 0 });
    expect(nachher.b).toEqual({ x: 0, y: 6000 });
    expect(nachher.width).toBe(1200);
    expect(r.patches).toHaveLength(1);
    expect(r.summary).toBe('Treppen-Geometrie 6.0 m');
  });

  it('form «u»: a-Drag lässt form/width/b unangetastet', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.treppeErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 0, y: 4000 },
      width: 1200,
      form: 'u',
    });
    const stairId = (r0.patches[0] as { id: string }).id;

    const r = execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId, a: { x: 500, y: 0 } });

    const nachher = doc.get<Stair>(stairId)!;
    expect(nachher.form).toBe('u');
    expect(nachher.a).toEqual({ x: 500, y: 0 });
    expect(nachher.b).toEqual({ x: 0, y: 4000 });
    expect(nachher.width).toBe(1200);
    expect(r.patches).toHaveLength(1);
    expect(r.summary).toBe('Treppen-Geometrie 4.031 m');
  });

  it('form «l»: ecke-Drag ändert NUR ecke, a/b/width/form bleiben', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.treppeErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 3000 },
      ecke: { x: 0, y: 3000 },
      width: 1200,
      form: 'l',
    });
    const stairId = (r0.patches[0] as { id: string }).id;

    const r = execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId, ecke: { x: 200, y: 3100 } });

    const nachher = doc.get<Stair>(stairId)!;
    expect(nachher.form).toBe('l');
    expect(nachher.a).toEqual({ x: 0, y: 0 });
    expect(nachher.b).toEqual({ x: 4000, y: 3000 });
    expect(nachher.ecke).toEqual({ x: 200, y: 3100 });
    expect(nachher.width).toBe(1200);
    expect(r.patches).toHaveLength(1);
    expect(r.summary).toBe('Treppen-Geometrie 5.0 m'); // a/b unverändert → gleiche Länge wie beim Erstellen
  });

  it('form «l»: a-Drag UND anschliessend b-Drag, ecke bleibt jeweils erhalten', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.treppeErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 3000 },
      ecke: { x: 0, y: 3000 },
      width: 1200,
      form: 'l',
    });
    const stairId = (r0.patches[0] as { id: string }).id;

    const rA = execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId, a: { x: 200, y: 0 } });
    let nachher = doc.get<Stair>(stairId)!;
    expect(nachher.a).toEqual({ x: 200, y: 0 });
    expect(nachher.b).toEqual({ x: 4000, y: 3000 });
    expect(nachher.ecke).toEqual({ x: 0, y: 3000 }); // unverändert
    expect(rA.summary).toBe('Treppen-Geometrie 4.841 m');

    const rB = execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId, b: { x: 4200, y: 3200 } });
    nachher = doc.get<Stair>(stairId)!;
    expect(nachher.a).toEqual({ x: 200, y: 0 }); // aus dem vorigen Schritt
    expect(nachher.b).toEqual({ x: 4200, y: 3200 });
    expect(nachher.ecke).toEqual({ x: 0, y: 3000 }); // weiterhin unverändert
    expect(rB.summary).toBe('Treppen-Geometrie 5.122 m'); // Länge aus dem NEUEN a (200,0) → neuem b
  });
});

describe('design.treppeGeometrieSetzen — Wurf-Regeln (VOR jedem Patch, Treppe bleibt unangetastet)', () => {
  it('mindestens einer der Punkte a/b/ecke ist Pflicht', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.treppeErstellen', { storeyId, a: { x: 0, y: 0 }, b: { x: 0, y: 4000 } });
    const stairId = (r0.patches[0] as { id: string }).id;
    expect(() => execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId })).toThrow(CommandError);
  });

  it('unbekannte oder Nicht-Treppe entityId wird ehrlich abgewiesen', () => {
    const { doc } = grundgeruest();
    expect(() =>
      execute(doc, 'design.treppeGeometrieSetzen', { entityId: 'treppe-existiert-nicht', b: { x: 1000, y: 0 } }),
    ).toThrow(/existiert nicht/);
  });

  it('(1) Gesamtlauf < 1 m wirft VOR jedem Patch — Treppe unverändert', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.treppeErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 0, y: 4000 },
      width: 1200,
    });
    const stairId = (r0.patches[0] as { id: string }).id;
    const vorSnapshot = JSON.stringify(doc.toJSON());

    expect(() =>
      execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId, b: { x: 0, y: 500 } }),
    ).toThrow('Treppenlauf zu kurz (< 1 m)');

    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot); // Treppe unangetastet, kein Patch angewendet
  });

  it('(2) «ecke» bei form ≠ «l» wirft VOR jedem Patch — Treppe unverändert', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.treppeErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 0, y: 4000 },
      width: 1200,
      // form default 'gerade'
    });
    const stairId = (r0.patches[0] as { id: string }).id;
    const vorSnapshot = JSON.stringify(doc.toJSON());

    expect(() =>
      execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId, ecke: { x: 500, y: 500 } }),
    ).toThrow('«ecke» ist nur bei form «l» zulässig');

    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('(3) form «l» ohne (weder bestehende noch neue) ecke wirft VOR jedem Patch — Treppe unverändert', () => {
    // L-Form ohne ecke ist über design.treppeErstellen nicht konstruierbar
    // (wirft dort bereits) — Fixture direkt am Doc gebaut, wie
    // wand-geometrie-setzen.test.ts (typeId-Direktpatch) es für einen
    // sonst unerreichbaren Zustand vormacht.
    const { doc, storeyId } = grundgeruest();
    const stair: Stair = {
      id: 'treppe-fixture-ohne-ecke',
      kind: 'stair',
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 0, y: 4000 },
      width: 1200,
      form: 'l',
    };
    doc.apply([{ id: stair.id, before: null, after: stair }]);
    const vorSnapshot = JSON.stringify(doc.toJSON());

    expect(() =>
      execute(doc, 'design.treppeGeometrieSetzen', { entityId: stair.id, a: { x: 100, y: 0 } }),
    ).toThrow('L-Lauf braucht den Eckpunkt «ecke»');

    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('(4a) degeneriert: neue a ≈ ecke (< 1 mm) wirft VOR jedem Patch — Treppe unverändert', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.treppeErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 3000 },
      ecke: { x: 0, y: 3000 },
      width: 1200,
      form: 'l',
    });
    const stairId = (r0.patches[0] as { id: string }).id;
    const vorSnapshot = JSON.stringify(doc.toJSON());

    // neue a fällt exakt auf die bestehende ecke (0,3000) — Distanz 0 < 1mm.
    // Gesamtlauf a→b bleibt lang genug (hypot(4000,0)=4000), Regel (1) greift
    // nicht zuerst.
    expect(() =>
      execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId, a: { x: 0, y: 3000 } }),
    ).toThrow('Treppe degeneriert (a und ecke liegen praktisch übereinander)');

    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('(4b) degeneriert: neue ecke ≈ b (< 1 mm) wirft VOR jedem Patch — Treppe unverändert', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.treppeErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 3000 },
      ecke: { x: 0, y: 3000 },
      width: 1200,
      form: 'l',
    });
    const stairId = (r0.patches[0] as { id: string }).id;
    const vorSnapshot = JSON.stringify(doc.toJSON());

    // neue ecke fällt exakt auf b (4000,3000) — Distanz 0 < 1mm.
    expect(() =>
      execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId, ecke: { x: 4000, y: 3000 } }),
    ).toThrow('Treppe degeneriert (ecke und b liegen praktisch übereinander)');

    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });

  it('(5) Steigungs-Gate (riser > 200) wirft mit derselben minRun-Meldung wie treppeErstellen — Treppe unverändert', () => {
    // Bei Erstellung war die Geschosshöhe 3000mm (riser ≈176mm, gültig).
    // Die Geschosshöhe wird DANACH unabhängig auf 610mm geändert (n auf das
    // Minimum 3 geklemmt → riser = 610/3 ≈ 203mm > 200) — das Steigungs-Gate
    // greift live beim NÄCHSTEN Geometrie-Setzen, exakt wie treppeErstellen
    // es bei einer Neu-Erstellung auf einem 610mm-Geschoss täte.
    const { doc, storeyId } = grundgeruest(3000);
    const r0 = execute(doc, 'design.treppeErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 0, y: 4000 },
      width: 1200,
    });
    const stairId = (r0.patches[0] as { id: string }).id;
    execute(doc, 'design.eigenschaftSetzen', { entityId: storeyId, feld: 'height', wert: 610 });
    const vorSnapshot = JSON.stringify(doc.toJSON());

    expect(() =>
      execute(doc, 'design.treppeGeometrieSetzen', { entityId: stairId, b: { x: 0, y: 5000 } }),
    ).toThrow(
      'Lauf zu kurz für 0.61 m Geschosshöhe: Steigung wäre 203 mm (max. 200). Mindestens 0.69 m Gesamtlauf nötig.',
    );

    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot);
  });
});

describe('design.treppeGeometrieSetzen — Undo (E1, V087-SPEZ)', () => {
  it('EIN Undo (invertPatches) stellt die alte Treppen-Geometrie vollständig wieder her', () => {
    const { doc, storeyId } = grundgeruest();
    const r0 = execute(doc, 'design.treppeErstellen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 3000 },
      ecke: { x: 0, y: 3000 },
      width: 1200,
      form: 'l',
    });
    const stairId = (r0.patches[0] as { id: string }).id;
    const vorSnapshot = JSON.stringify(doc.toJSON());

    const r = execute(doc, 'design.treppeGeometrieSetzen', {
      entityId: stairId,
      a: { x: 200, y: 0 },
      b: { x: 4200, y: 3200 },
      ecke: { x: 100, y: 3100 },
    });
    expect(r.patches).toHaveLength(1); // EIN Patch = EIN Undo-Schritt

    const nach = doc.get<Stair>(stairId)!;
    expect(nach.a).toEqual({ x: 200, y: 0 });
    expect(nach.b).toEqual({ x: 4200, y: 3200 });
    expect(nach.ecke).toEqual({ x: 100, y: 3100 });

    doc.apply(invertPatches(r.patches));

    const zurueck = doc.get<Stair>(stairId)!;
    expect(zurueck.a).toEqual({ x: 0, y: 0 });
    expect(zurueck.b).toEqual({ x: 4000, y: 3000 });
    expect(zurueck.ecke).toEqual({ x: 0, y: 3000 });
    expect(zurueck.width).toBe(1200);
    expect(zurueck.form).toBe('l');
    expect(JSON.stringify(doc.toJSON())).toBe(vorSnapshot); // vollständige Wiederherstellung
  });
});
