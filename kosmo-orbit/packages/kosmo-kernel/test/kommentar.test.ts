import { describe, expect, it } from 'vitest';
import {
  KosmoDoc,
  execute,
  invertPatches,
  parseKosmoSafe,
  CommandError,
  type Kommentar,
} from '../src';

/**
 * Kommentar-Entität (v0.8.3 E1, `docs/V083-SPEZ.md` §1, Island-§8-Freigabe
 * §8-6) — freie Projekt-Notizen, kein Bauteil-Host. Tests nach demselben
 * Muster wie `test/mangel.test.ts`: Roundtrip/Parse-Guard, Commands
 * (`design.kommentarSetzen`/`-StatusSetzen`/`-Loeschen`, inkl. Undo) und die
 * `design.eigenschaftSetzen`-Registry-Zeile.
 */

function kommentarSetzen(doc: KosmoDoc, overrides: Partial<Record<string, unknown>> = {}) {
  return execute(doc, 'design.kommentarSetzen', {
    text: 'Fassade Nord nochmals prüfen',
    autor: 'Andrin',
    at: { x: 1000, y: 2000 },
    erstelltAm: '17.07.2026',
    ...overrides,
  });
}

describe('Kommentar-Entity — Roundtrip/Parse-Guard', () => {
  it('design.kommentarSetzen legt eine Kommentar-Entity mit status «offen» an', () => {
    const doc = new KosmoDoc();
    const res = kommentarSetzen(doc);
    const id = (res.patches[0] as { id: string }).id;
    const kommentar = doc.get<Kommentar>(id)!;
    expect(kommentar.kind).toBe('kommentar');
    expect(kommentar.text).toBe('Fassade Nord nochmals prüfen');
    expect(kommentar.autor).toBe('Andrin');
    expect(kommentar.at).toEqual({ x: 1000, y: 2000 });
    expect(kommentar.status).toBe('offen');
    expect(kommentar.erstelltAm).toBe('17.07.2026');
    expect(kommentar.erledigtAm).toBeUndefined();
  });

  it('optionale storeyId ist gesetzt, wenn übergeben, sonst ganz weg (exactOptionalPropertyTypes)', () => {
    const doc = new KosmoDoc();
    const geschoss = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
    const storeyId = (geschoss.patches[0] as { id: string }).id;

    const mit = kommentarSetzen(doc, { storeyId });
    const idMit = (mit.patches[0] as { id: string }).id;
    expect(doc.get<Kommentar>(idMit)!.storeyId).toBe(storeyId);

    const ohne = kommentarSetzen(doc);
    const idOhne = (ohne.patches[0] as { id: string }).id;
    expect('storeyId' in doc.get<Kommentar>(idOhne)!).toBe(false);
  });

  it('lehnt eine unbekannte storeyId ab', () => {
    const doc = new KosmoDoc();
    expect(() => kommentarSetzen(doc, { storeyId: 'geschoss_unbekannt' })).toThrow(CommandError);
  });

  it('lehnt leeren Text ab (zod min(1))', () => {
    const doc = new KosmoDoc();
    expect(() => kommentarSetzen(doc, { text: '' })).toThrow();
  });

  it('Roundtrip toJSON → JSON.stringify/parse → fromJSON erhält die Kommentar-Entity vollständig', () => {
    const doc = new KosmoDoc();
    const geschoss = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
    const storeyId = (geschoss.patches[0] as { id: string }).id;
    kommentarSetzen(doc, { storeyId });

    const json = JSON.parse(JSON.stringify(doc.toJSON()));
    const wieder = KosmoDoc.fromJSON(json);
    const kommentar = wieder.byKind<Kommentar>('kommentar')[0]!;
    expect(kommentar.text).toBe('Fassade Nord nochmals prüfen');
    expect(kommentar.storeyId).toBe(storeyId);
  });

  it('parse-guard: parseKosmoSafe akzeptiert ein Doc mit Kommentar-Entities', () => {
    const doc = new KosmoDoc();
    kommentarSetzen(doc);
    const roh = JSON.stringify(doc.toJSON());
    const r = parseKosmoSafe(roh);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc.byKind<Kommentar>('kommentar').length).toBe(1);
  });
});

describe('design.kommentarStatusSetzen — Commands + Undo', () => {
  it('setzt status «erledigt» inkl. erledigtAm', () => {
    const doc = new KosmoDoc();
    const res = kommentarSetzen(doc);
    const id = (res.patches[0] as { id: string }).id;
    execute(doc, 'design.kommentarStatusSetzen', { kommentarId: id, status: 'erledigt', erledigtAm: '18.07.2026' });
    const kommentar = doc.get<Kommentar>(id)!;
    expect(kommentar.status).toBe('erledigt');
    expect(kommentar.erledigtAm).toBe('18.07.2026');
  });

  it('lehnt «erledigt» ohne erledigtAm ab', () => {
    const doc = new KosmoDoc();
    const res = kommentarSetzen(doc);
    const id = (res.patches[0] as { id: string }).id;
    expect(() => execute(doc, 'design.kommentarStatusSetzen', { kommentarId: id, status: 'erledigt' })).toThrow(
      CommandError,
    );
  });

  it('Rückstufung auf «offen» löscht erledigtAm wieder vollständig (kein undefined-Rest)', () => {
    const doc = new KosmoDoc();
    const res = kommentarSetzen(doc);
    const id = (res.patches[0] as { id: string }).id;
    execute(doc, 'design.kommentarStatusSetzen', { kommentarId: id, status: 'erledigt', erledigtAm: '18.07.2026' });
    execute(doc, 'design.kommentarStatusSetzen', { kommentarId: id, status: 'offen' });
    const kommentar = doc.get<Kommentar>(id)!;
    expect(kommentar.status).toBe('offen');
    expect('erledigtAm' in kommentar).toBe(false);
  });

  it('ist über invertPatches vollständig rückgängig zu machen (atomare Undo-Gruppe)', () => {
    const doc = new KosmoDoc();
    const res = kommentarSetzen(doc);
    const id = (res.patches[0] as { id: string }).id;
    const vorher = doc.get<Kommentar>(id)!;
    const statusRes = execute(doc, 'design.kommentarStatusSetzen', {
      kommentarId: id,
      status: 'erledigt',
      erledigtAm: '18.07.2026',
    });
    doc.apply(invertPatches(statusRes.patches));
    expect(doc.get<Kommentar>(id)).toEqual(vorher);
  });

  it('lehnt eine unbekannte kommentarId ab', () => {
    const doc = new KosmoDoc();
    expect(() =>
      execute(doc, 'design.kommentarStatusSetzen', { kommentarId: 'kommentar_unbekannt', status: 'offen' }),
    ).toThrow(CommandError);
  });
});

describe('design.kommentarLoeschen — Commands + Undo', () => {
  it('löscht die Entity, Undo stellt sie wieder her (voller Roundtrip: setzen → löschen → undo)', () => {
    const doc = new KosmoDoc();
    const res = kommentarSetzen(doc);
    const id = (res.patches[0] as { id: string }).id;
    const vorher = doc.get<Kommentar>(id)!;

    const delRes = execute(doc, 'design.kommentarLoeschen', { kommentarId: id });
    expect(doc.get<Kommentar>(id)).toBeUndefined();

    doc.apply(invertPatches(delRes.patches));
    expect(doc.get<Kommentar>(id)).toEqual(vorher);

    // Und der komplette Kreis rückwärts: das Setzen selbst ist ebenfalls
    // ein vollständiger Undo-Schritt (invertPatches der Erst-Erfassung).
    doc.apply(invertPatches(res.patches));
    expect(doc.get<Kommentar>(id)).toBeUndefined();
    expect(doc.byKind<Kommentar>('kommentar')).toHaveLength(0);
  });

  it('lehnt eine unbekannte kommentarId ab', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'design.kommentarLoeschen', { kommentarId: 'kommentar_unbekannt' })).toThrow(
      CommandError,
    );
  });
});

describe('design.eigenschaftSetzen — kommentar-Registry-Zeile', () => {
  it('erlaubt text/status/erledigtAm, lehnt alles andere ab', () => {
    const doc = new KosmoDoc();
    const res = kommentarSetzen(doc);
    const id = (res.patches[0] as { id: string }).id;

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'text', wert: 'Geändert' });
    expect(doc.get<Kommentar>(id)!.text).toBe('Geändert');

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'status', wert: 'erledigt' });
    expect(doc.get<Kommentar>(id)!.status).toBe('erledigt');

    execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'erledigtAm', wert: '18.07.2026' });
    expect(doc.get<Kommentar>(id)!.erledigtAm).toBe('18.07.2026');

    expect(() =>
      execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'pitch', wert: 12 }),
    ).toThrow(CommandError);
  });

  it('lehnt einen ungültigen status-Wert ab', () => {
    const doc = new KosmoDoc();
    const res = kommentarSetzen(doc);
    const id = (res.patches[0] as { id: string }).id;
    expect(() =>
      execute(doc, 'design.eigenschaftSetzen', { entityId: id, feld: 'status', wert: 'ungueltig' }),
    ).toThrow(CommandError);
  });

  it('bestehende Einträge (z.B. opening/zone) bleiben unverändert erreichbar', () => {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    const zone = execute(doc, 'design.zoneErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 4000 },
        { x: 0, y: 4000 },
      ],
      name: 'Zimmer',
      sia: 'HNF',
    });
    const zoneId = (zone.patches[0] as { id: string }).id;
    execute(doc, 'design.eigenschaftSetzen', { entityId: zoneId, feld: 'name', wert: 'Wohnen' });
    expect(doc.get<import('../src').Zone>(zoneId)!.name).toBe('Wohnen');
  });
});
