import { describe, expect, it } from 'vitest';
import { CommandError, History, KosmoDoc, execute, invertPatches, type SettingsPatch } from '../src';

/**
 * v0.8.7 PB1 (`docs/V087-SPEZ.md` E6/D7/C-11/C-12) — `design.oerebAuszugSetzen`:
 * persistiert das Ergebnis der ÖREB-light-Kette (GetEGRID + Extract,
 * reduziert auf die reine Themencode-Betroffenheitsliste) als eigenes
 * Doc-Setting `oerebAuszug`, ein reiner SettingsPatch-Command wie
 * `design.standortAdresseSetzen`/`design.schnittSetzen`/`vis.render` —
 * Undo/Yjs-Sync/`.kosmo`-Export gelten automatisch mit.
 *
 * Muster: `packages/kosmo-kernel/test/standort-setzen.test.ts`.
 */

const THEMEN_BEISPIEL = [
  { code: 'ContaminatedSites', titel: 'Belastete Standorte', betroffen: true },
  { code: 'GroundwaterProtectionZones', titel: 'Grundwasserschutzzonen', betroffen: true },
  { code: 'ForestPerimeters', titel: 'Waldgrenzen', betroffen: false },
];

describe('design.oerebAuszugSetzen — zod-Validierung', () => {
  it('setzt EGRID + Abrufzeitpunkt + Herkunft + Themenliste', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.oerebAuszugSetzen', {
      auszug: {
        egrid: 'CH113928077734',
        abgerufenAm: '2026-07-19T10:00:00.000Z',
        quelle: 'oereb-bund',
        themen: THEMEN_BEISPIEL,
      },
    });
    expect(doc.settings.oerebAuszug).toEqual({
      egrid: 'CH113928077734',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
      quelle: 'oereb-bund',
      themen: THEMEN_BEISPIEL,
    });
  });

  it('lehnt eine andere quelle als «oereb-bund» ab (z.literal)', () => {
    const doc = new KosmoDoc();
    expect(() =>
      execute(doc, 'design.oerebAuszugSetzen', {
        auszug: {
          egrid: 'CH113928077734',
          abgerufenAm: '2026-07-19T10:00:00.000Z',
          quelle: 'anderswoher',
          themen: THEMEN_BEISPIEL,
        },
      }),
    ).toThrow(CommandError);
  });

  it('lehnt eine leere egrid ab', () => {
    const doc = new KosmoDoc();
    expect(() =>
      execute(doc, 'design.oerebAuszugSetzen', {
        auszug: {
          egrid: '',
          abgerufenAm: '2026-07-19T10:00:00.000Z',
          quelle: 'oereb-bund',
          themen: THEMEN_BEISPIEL,
        },
      }),
    ).toThrow(CommandError);
  });

  it('lehnt einen Themen-Eintrag ohne code ab', () => {
    const doc = new KosmoDoc();
    expect(() =>
      execute(doc, 'design.oerebAuszugSetzen', {
        auszug: {
          egrid: 'CH113928077734',
          abgerufenAm: '2026-07-19T10:00:00.000Z',
          quelle: 'oereb-bund',
          themen: [{ code: '', titel: 'Belastete Standorte', betroffen: true }],
        },
      }),
    ).toThrow(CommandError);
  });

  it('akzeptiert eine leere Themenliste (kein Thema geliefert)', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.oerebAuszugSetzen', {
      auszug: { egrid: 'CH113928077734', abgerufenAm: '2026-07-19T10:00:00.000Z', quelle: 'oereb-bund', themen: [] },
    });
    expect(doc.settings.oerebAuszug?.themen).toEqual([]);
  });
});

describe('design.oerebAuszugSetzen — SettingsPatch-Form + summarize', () => {
  it('liefert genau EINE settings-Patch mit before/after auf oerebAuszug', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.oerebAuszug).toBeUndefined();
    const res = execute(doc, 'design.oerebAuszugSetzen', {
      auszug: {
        egrid: 'CH113928077734',
        abgerufenAm: '2026-07-19T10:00:00.000Z',
        quelle: 'oereb-bund',
        themen: THEMEN_BEISPIEL,
      },
    });
    expect(res.patches).toHaveLength(1);
    const [patch] = res.patches as [SettingsPatch];
    expect(patch.settings).toBe(true);
    expect(patch.before).toEqual({ oerebAuszug: null });
    expect(patch.after).toEqual({
      oerebAuszug: {
        egrid: 'CH113928077734',
        abgerufenAm: '2026-07-19T10:00:00.000Z',
        quelle: 'oereb-bund',
        themen: THEMEN_BEISPIEL,
      },
    });
  });

  it('summarize nennt EGRID + Anzahl betroffener Themen (2 von 3)', () => {
    const doc = new KosmoDoc();
    const res = execute(doc, 'design.oerebAuszugSetzen', {
      auszug: {
        egrid: 'CH113928077734',
        abgerufenAm: '2026-07-19T10:00:00.000Z',
        quelle: 'oereb-bund',
        themen: THEMEN_BEISPIEL,
      },
    });
    expect(res.summary).toBe('ÖREB-Auszug CH113928077734 — 2 von 3 Themen betroffen');
  });

  it('summarize beim Entfernen (auszug: null): «ÖREB-Auszug entfernt»', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.oerebAuszugSetzen', {
      auszug: { egrid: 'CH113928077734', abgerufenAm: '2026-07-19T10:00:00.000Z', quelle: 'oereb-bund', themen: THEMEN_BEISPIEL },
    });
    const res = execute(doc, 'design.oerebAuszugSetzen', { auszug: null });
    expect(res.summary).toBe('ÖREB-Auszug entfernt');
  });
});

describe('design.oerebAuszugSetzen — setzen, überschreiben, entfernen, Undo', () => {
  it('ein zweiter Aufruf überschreibt den Auszug vollständig (kein Merge)', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.oerebAuszugSetzen', {
      auszug: { egrid: 'CH113928077734', abgerufenAm: '2026-07-19T10:00:00.000Z', quelle: 'oereb-bund', themen: THEMEN_BEISPIEL },
    });
    execute(doc, 'design.oerebAuszugSetzen', {
      auszug: { egrid: 'CH999888777666', abgerufenAm: '2026-07-19T11:30:00.000Z', quelle: 'oereb-bund', themen: [] },
    });
    expect(doc.settings.oerebAuszug).toEqual({
      egrid: 'CH999888777666',
      abgerufenAm: '2026-07-19T11:30:00.000Z',
      quelle: 'oereb-bund',
      themen: [],
    });
  });

  it('auszug: null entfernt einen gesetzten Auszug', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.oerebAuszugSetzen', {
      auszug: { egrid: 'CH113928077734', abgerufenAm: '2026-07-19T10:00:00.000Z', quelle: 'oereb-bund', themen: THEMEN_BEISPIEL },
    });
    expect(doc.settings.oerebAuszug).not.toBeNull();
    execute(doc, 'design.oerebAuszugSetzen', { auszug: null });
    expect(doc.settings.oerebAuszug).toBeNull();
  });

  it('Undo entfernt den frisch gesetzten Auszug wieder (History)', () => {
    const doc = new KosmoDoc();
    const h = new History();
    const res = execute(doc, 'design.oerebAuszugSetzen', {
      auszug: { egrid: 'CH113928077734', abgerufenAm: '2026-07-19T10:00:00.000Z', quelle: 'oereb-bund', themen: THEMEN_BEISPIEL },
    });
    h.record(res.patches);
    expect(doc.settings.oerebAuszug).not.toBeNull();

    h.undo(doc);
    expect(doc.settings.oerebAuszug).toBeNull();

    h.redo(doc);
    expect(doc.settings.oerebAuszug?.egrid).toBe('CH113928077734');
  });

  it('Undo nach Überschreiben stellt den VORHERIGEN Auszug wieder her (invertPatches)', () => {
    const doc = new KosmoDoc();
    const r1 = execute(doc, 'design.oerebAuszugSetzen', {
      auszug: { egrid: 'CH113928077734', abgerufenAm: '2026-07-19T10:00:00.000Z', quelle: 'oereb-bund', themen: THEMEN_BEISPIEL },
    });
    const r2 = execute(doc, 'design.oerebAuszugSetzen', {
      auszug: { egrid: 'CH999888777666', abgerufenAm: '2026-07-19T11:30:00.000Z', quelle: 'oereb-bund', themen: [] },
    });
    expect(doc.settings.oerebAuszug?.egrid).toBe('CH999888777666');

    doc.apply(invertPatches(r2.patches));
    expect(doc.settings.oerebAuszug).toEqual({
      egrid: 'CH113928077734',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
      quelle: 'oereb-bund',
      themen: THEMEN_BEISPIEL,
    });

    doc.apply(invertPatches(r1.patches));
    expect(doc.settings.oerebAuszug).toBeNull();
  });

  it('Undo-Roundtrip über die entfernenden Auszug: null zurück zum vorherigen Auszug', () => {
    const doc = new KosmoDoc();
    const r1 = execute(doc, 'design.oerebAuszugSetzen', {
      auszug: { egrid: 'CH113928077734', abgerufenAm: '2026-07-19T10:00:00.000Z', quelle: 'oereb-bund', themen: THEMEN_BEISPIEL },
    });
    const r2 = execute(doc, 'design.oerebAuszugSetzen', { auszug: null });
    expect(doc.settings.oerebAuszug).toBeNull();

    doc.apply(invertPatches(r2.patches));
    expect(doc.settings.oerebAuszug).toEqual({
      egrid: 'CH113928077734',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
      quelle: 'oereb-bund',
      themen: THEMEN_BEISPIEL,
    });

    doc.apply(invertPatches(r1.patches));
    expect(doc.settings.oerebAuszug).toBeNull();
  });
});

describe('design.oerebAuszugSetzen — Default-Doc & fromJSON, additiver Block bricht den Altbestand nicht', () => {
  it('Default-Doc hat kein `oerebAuszug` gesetzt', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.oerebAuszug).toBeUndefined();
  });

  it('fromJSON eines Alt-JSON ohne `oerebAuszug`-Schlüssel lädt sauber', () => {
    const alt = new KosmoDoc();
    execute(alt, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const json = alt.toJSON();
    expect('oerebAuszug' in json.settings).toBe(false);

    const geladen = KosmoDoc.fromJSON(json);
    expect(geladen.settings.oerebAuszug).toBeUndefined();
  });

  it('fromJSON eines Doc MIT `oerebAuszug` rundet verlustfrei (Roundtrip über Doc-Serialisierung)', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.oerebAuszugSetzen', {
      auszug: { egrid: 'CH113928077734', abgerufenAm: '2026-07-19T10:00:00.000Z', quelle: 'oereb-bund', themen: THEMEN_BEISPIEL },
    });
    const geladen = KosmoDoc.fromJSON(doc.toJSON());
    expect(geladen.settings.oerebAuszug).toEqual({
      egrid: 'CH113928077734',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
      quelle: 'oereb-bund',
      themen: THEMEN_BEISPIEL,
    });
  });

  it('bleibt neben `standort` (ProjektStandort) UND `standortAdresse` unabhängig — alle drei Felder koexistieren', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.standortSetzen', {
      label: 'Musterstrasse 1',
      lat: 47.17,
      lon: 8.52,
      e: 2681500,
      n: 1224500,
    });
    execute(doc, 'design.standortAdresseSetzen', {
      adresse: 'Musterstrasse 1, 6300 Zug',
      lv95: { e: 2681512, n: 1224508 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
    });
    execute(doc, 'design.oerebAuszugSetzen', {
      auszug: { egrid: 'CH113928077734', abgerufenAm: '2026-07-19T10:05:00.000Z', quelle: 'oereb-bund', themen: THEMEN_BEISPIEL },
    });
    expect(doc.settings.standort?.label).toBe('Musterstrasse 1');
    expect(doc.settings.standortAdresse?.adresse).toBe('Musterstrasse 1, 6300 Zug');
    expect(doc.settings.oerebAuszug?.egrid).toBe('CH113928077734');
  });
});
