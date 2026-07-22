import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import {
  KosmoDoc,
  execute,
  invertPatches,
  parseKosmoSafe,
  CommandError,
  type MassKette,
} from '../src';
import { derivePlan } from '../src/derive/plan';
import { planToSvg, A3_QUER } from '../src/derive/plansvg';
import { testhausMasskette, testhausWalmdachGrundriss } from './fixtures';

/**
 * MassKette-Entität (v0.8.3 E2, `docs/V083-SPEZ.md` §2, Island-§8-Freigabe
 * §8-7) — echtes, benutzergesetztes Punkt-zu-Punkt-Mess-Ergebnis. Tests nach
 * demselben Muster wie `test/mangel.test.ts`/`test/fenster.test.ts`:
 * Roundtrip/Parse-Guard, Command + Undo, der Plan-Derive-Guard (§0.5/§2.3 —
 * KEINE Linie ohne MassKette-Entität) und der EINE neue Golden.
 */

function ketteSetzen(doc: KosmoDoc, storeyId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return execute(doc, 'design.massKetteSetzen', {
    storeyId,
    punkte: [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 3000, y: 4000 },
    ],
    ...overrides,
  });
}

describe('MassKette-Entity — Roundtrip/Parse-Guard', () => {
  it('design.massKetteSetzen legt eine MassKette-Entity mit den übergebenen Punkten an', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const res = ketteSetzen(doc, storeyId);
    const id = (res.patches[0] as { id: string }).id;
    const kette = doc.get<MassKette>(id)!;
    expect(kette.kind).toBe('masskette');
    expect(kette.storeyId).toBe(storeyId);
    expect(kette.punkte).toEqual([
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 3000, y: 4000 },
    ]);
  });

  it('lehnt weniger als zwei Punkte ab (zod .min(2))', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    expect(() => ketteSetzen(doc, storeyId, { punkte: [{ x: 0, y: 0 }] })).toThrow();
  });

  it('lehnt eine unbekannte storeyId ab', () => {
    const doc = new KosmoDoc();
    expect(() => ketteSetzen(doc, 'geschoss_unbekannt')).toThrow(CommandError);
  });

  it('summarize zeigt die Gesamtlänge der Kette (Summe der Segmentlängen)', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    // 0,0 -> 3000,0 (3.0 m) -> 3000,4000 (4.0 m) = 7.0 m
    const res = ketteSetzen(doc, storeyId);
    expect(res.summary).toBe('Masskette 7.0 m');
  });

  it('Roundtrip toJSON → JSON.stringify/parse → fromJSON erhält die MassKette-Entity vollständig', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    ketteSetzen(doc, storeyId);

    const json = JSON.parse(JSON.stringify(doc.toJSON()));
    const wieder = KosmoDoc.fromJSON(json);
    const kette = wieder.byKind<MassKette>('masskette')[0]!;
    expect(kette.punkte).toHaveLength(3);
    expect(kette.storeyId).toBe(storeyId);
  });

  it('parse-guard: parseKosmoSafe akzeptiert ein Doc mit MassKette-Entities', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    ketteSetzen(doc, storeyId);
    const roh = JSON.stringify(doc.toJSON());
    const r = parseKosmoSafe(roh);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc.byKind<MassKette>('masskette').length).toBe(1);
  });
});

describe('design.massKetteLoeschen — Commands + Undo', () => {
  it('löscht die Entity, Undo stellt sie wieder her', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const res = ketteSetzen(doc, storeyId);
    const id = (res.patches[0] as { id: string }).id;
    const vorher = doc.get<MassKette>(id)!;

    const delRes = execute(doc, 'design.massKetteLoeschen', { massKetteId: id });
    expect(doc.get<MassKette>(id)).toBeUndefined();

    doc.apply(invertPatches(delRes.patches));
    expect(doc.get<MassKette>(id)).toEqual(vorher);

    doc.apply(invertPatches(res.patches));
    expect(doc.byKind<MassKette>('masskette')).toHaveLength(0);
  });

  it('lehnt eine unbekannte massKetteId ab', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'design.massKetteLoeschen', { massKetteId: 'masskette_unbekannt' })).toThrow(
      CommandError,
    );
  });
});

describe('design.massKetteGeometrieSetzen — Punkt-Zug in place (v0.8.9 E8)', () => {
  function ketteMitId(doc: KosmoDoc): string {
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const res = ketteSetzen(doc, storeyId);
    return (res.patches[0] as { id: string }).id;
  }

  it('setzt genau den einen Punkt neu — Identität, storeyId und übrige Punkte bleiben', () => {
    const doc = new KosmoDoc();
    const id = ketteMitId(doc);
    const vorher = doc.get<MassKette>(id)!;
    execute(doc, 'design.massKetteGeometrieSetzen', {
      entityId: id,
      punktIndex: 1,
      punkt: { x: 5000, y: 1000 },
    });
    const nachher = doc.get<MassKette>(id)!;
    expect(nachher.id).toBe(id);
    expect(nachher.storeyId).toBe(vorher.storeyId);
    expect(nachher.punkte).toEqual([vorher.punkte[0], { x: 5000, y: 1000 }, vorher.punkte[2]]);
  });

  it('EIN Undo-Schritt stellt den alten Punkt wieder her (in-place-Patch, kein Löschen+Neusetzen)', () => {
    const doc = new KosmoDoc();
    const id = ketteMitId(doc);
    const vorher = doc.get<MassKette>(id)!;
    const res = execute(doc, 'design.massKetteGeometrieSetzen', {
      entityId: id,
      punktIndex: 0,
      punkt: { x: -777, y: 42 },
    });
    expect(res.patches).toHaveLength(1);
    doc.apply(invertPatches(res.patches));
    expect(doc.get<MassKette>(id)).toEqual(vorher);
  });

  it('Range-Wurf: punktIndex ausserhalb der Kette wirft, die Kette bleibt unangetastet', () => {
    const doc = new KosmoDoc();
    const id = ketteMitId(doc);
    const vorher = doc.get<MassKette>(id)!;
    expect(() =>
      execute(doc, 'design.massKetteGeometrieSetzen', { entityId: id, punktIndex: 3, punkt: { x: 0, y: 0 } }),
    ).toThrow(CommandError);
    expect(doc.get<MassKette>(id)).toEqual(vorher);
  });

  it('lehnt negative/nicht-ganzzahlige Indizes (zod) und unbekannte entityId (CommandError) ab', () => {
    const doc = new KosmoDoc();
    const id = ketteMitId(doc);
    expect(() =>
      execute(doc, 'design.massKetteGeometrieSetzen', { entityId: id, punktIndex: -1, punkt: { x: 0, y: 0 } }),
    ).toThrow();
    expect(() =>
      execute(doc, 'design.massKetteGeometrieSetzen', { entityId: id, punktIndex: 0.5, punkt: { x: 0, y: 0 } }),
    ).toThrow();
    expect(() =>
      execute(doc, 'design.massKetteGeometrieSetzen', {
        entityId: 'masskette_unbekannt',
        punktIndex: 0,
        punkt: { x: 0, y: 0 },
      }),
    ).toThrow(CommandError);
  });

  it('summarize zeigt die NEUE Gesamtlänge (läuft nach doc.apply, Command-Vertrag)', () => {
    const doc = new KosmoDoc();
    const id = ketteMitId(doc);
    // 0,0 -> 3000,0 -> 3000,4000 (7.0 m); Punkt 2 auf 3000,1000 → 3.0+1.0 = 4.0 m
    const res = execute(doc, 'design.massKetteGeometrieSetzen', {
      entityId: id,
      punktIndex: 2,
      punkt: { x: 3000, y: 1000 },
    });
    expect(res.summary).toBe('Masskette 4.0 m');
  });
});

describe('derivePlan — Masskette-Guard (§0.5/§2.3, Golden-Politik)', () => {
  it('OHNE MassKette-Entität bleibt derivePlan exakt wie zuvor (kein masskette-Element)', () => {
    const { doc, storeyId } = testhausWalmdachGrundriss();
    const plan = derivePlan(doc, storeyId);
    expect(plan.lines.filter((l) => l.classes.includes('masskette'))).toHaveLength(0);
    expect(plan.texte.filter((t) => t.classes.includes('masskette-label'))).toHaveLength(0);
  });

  it('MIT MassKette-Entität erscheinen genau (Punkte-1) strukturierte Segmente mit Mass', () => {
    // K18 (v0.9.0): derivePlan liefert die MassKette nicht mehr als rohe
    // `lines`/`texte`, sondern strukturiert (`plan.massketten`) — die
    // Zeichen-Geometrie (Masslinie mit Papier-Abstand, Verlängerungslinien)
    // entsteht massstabsbewusst erst in `plansvg.ts`.
    const { doc, storeyId } = testhausMasskette();
    const plan = derivePlan(doc, storeyId);
    // Fixture: 3 Punkte -> 2 Segmente
    expect(plan.massketten).toHaveLength(2);
    for (const seg of plan.massketten) expect(seg.label.length).toBeGreaterThan(0);
    // Die rohen lines/texte tragen KEINE masskette-Einträge mehr:
    expect(plan.lines.filter((l) => l.classes.includes('masskette'))).toHaveLength(0);
    expect(plan.texte.filter((t) => t.classes.includes('masskette-label'))).toHaveLength(0);
  });

  it('eine MassKette in einem ANDEREN Geschoss bleibt für dieses Geschoss unsichtbar (storeyId-Filter)', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
    const storeyIdEg = (eg.patches[0] as { id: string }).id;
    const og = execute(doc, 'design.geschossErstellen', { name: '1.OG', index: 1, elevation: 3000 });
    const storeyIdOg = (og.patches[0] as { id: string }).id;
    ketteSetzen(doc, storeyIdOg);
    const planEg = derivePlan(doc, storeyIdEg);
    expect(planEg.massketten).toHaveLength(0);
  });

  it('design.bemassungSetzen bleibt vom MassKette-Pfad unberührt (eigenständiger, additiver Command)', () => {
    const { doc, storeyId } = testhausMasskette();
    const vorher = { ...doc.settings.bemassung };
    execute(doc, 'design.massKetteLoeschen', {
      massKetteId: doc.byKind<MassKette>('masskette').find((m) => m.storeyId === storeyId)!.id,
    });
    expect(doc.settings.bemassung).toEqual(vorher);
  });
});

describe('Golden: Grundriss mit gesetzter Masskette (v0.8.3 E2, 36. Golden)', () => {
  it('35 Bestands-Fixtures OHNE MassKette bleiben strukturell unberührt (kein masskette-Guard-Treffer irgendwo)', () => {
    // Stichprobe über mehrere unabhängige Bestands-Fixtures — keines trägt
    // je eine MassKette-Entität, der Guard bleibt überall inaktiv.
    const fixtures = [testhausWalmdachGrundriss()];
    for (const { doc, storeyId } of fixtures) {
      const plan = derivePlan(doc, storeyId);
      expect(plan.massketten).toHaveLength(0);
      expect(plan.lines.some((l) => l.classes.includes('masskette'))).toBe(false);
    }
  });

  it('Golden: Grundriss mit gesetzter Masskette (drei Punkte, zwei Segmente) ist byte-identisch', () => {
    const { doc, storeyId } = testhausMasskette();
    const svg = planToSvg(doc, storeyId, {
      scale: 50,
      paper: A3_QUER,
      projectName: 'Golden-Masskette',
      planTitle: 'Grundriss Masskette',
      date: '18.07.2026',
    });
    pruefeGolden(svg, new URL('./golden/masskette-plan.svg', import.meta.url));
  });
});
