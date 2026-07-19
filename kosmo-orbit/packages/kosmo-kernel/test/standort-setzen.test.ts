import { describe, expect, it } from 'vitest';
import { CommandError, History, KosmoDoc, execute, invertPatches, type SettingsPatch } from '../src';

/**
 * v0.8.6 PC1 (`docs/V086-SPEZ.md` E6/D7/C-17) — `design.standortAdresseSetzen`:
 * persistiert den StandortSuche-Treffer (Adresse + LV95 + Herkunft geo.admin
 * + Abrufzeitpunkt) als eigenes Doc-Setting `standortAdresse`, ein reiner
 * SettingsPatch-Command wie `design.schnittSetzen`/`vis.render` — Undo/
 * Yjs-Sync/`.kosmo`-Export gelten automatisch mit.
 *
 * BEWUSST ein eigener Name, kein `design.standortSetzen`: dieser Command
 * existiert bereits (WGS84 lat/lon + LV95 + optional hoeheM auf
 * `DocSettings.standort`/`ProjektStandort`, seit V2-V4, gespeist von
 * Viewport3D/Sonnenstudie/Schwarzplan) — `registerCommand` wirft bei
 * doppelter Kennung (`commands/core.ts`). S. Kommentar bei `StandortAdresse`,
 * `model/doc.ts`.
 */

describe('design.standortAdresseSetzen — zod-Validierung', () => {
  it('setzt Adresse + LV95 + Herkunft + Abrufzeitpunkt', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.standortAdresseSetzen', {
      adresse: 'Musterstrasse 1, 6300 Zug',
      lv95: { e: 2681512, n: 1224508 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
    });
    expect(doc.settings.standortAdresse).toEqual({
      adresse: 'Musterstrasse 1, 6300 Zug',
      lv95: { e: 2681512, n: 1224508 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
    });
  });

  it('lehnt eine andere quelle als «geoadmin» ab (z.literal)', () => {
    const doc = new KosmoDoc();
    expect(() =>
      execute(doc, 'design.standortAdresseSetzen', {
        adresse: 'Musterstrasse 1',
        lv95: { e: 2681512, n: 1224508 },
        quelle: 'anderswoher',
        abgerufenAm: '2026-07-19T10:00:00.000Z',
      }),
    ).toThrow(CommandError);
  });

  it('lehnt eine leere adresse ab', () => {
    const doc = new KosmoDoc();
    expect(() =>
      execute(doc, 'design.standortAdresseSetzen', {
        adresse: '',
        lv95: { e: 2681512, n: 1224508 },
        quelle: 'geoadmin',
        abgerufenAm: '2026-07-19T10:00:00.000Z',
      }),
    ).toThrow(CommandError);
  });

  it('lehnt fehlende lv95-Felder ab', () => {
    const doc = new KosmoDoc();
    expect(() =>
      execute(doc, 'design.standortAdresseSetzen', {
        adresse: 'Musterstrasse 1',
        lv95: { e: 2681512 },
        quelle: 'geoadmin',
        abgerufenAm: '2026-07-19T10:00:00.000Z',
      }),
    ).toThrow(CommandError);
  });
});

describe('design.standortAdresseSetzen — SettingsPatch-Form + summarize', () => {
  it('liefert genau EINE settings-Patch mit before/after auf standortAdresse', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.standortAdresse).toBeUndefined();
    const res = execute(doc, 'design.standortAdresseSetzen', {
      adresse: 'Musterstrasse 1, 6300 Zug',
      lv95: { e: 2681512, n: 1224508 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
    });
    expect(res.patches).toHaveLength(1);
    const [patch] = res.patches as [SettingsPatch];
    expect(patch.settings).toBe(true);
    expect(patch.before).toEqual({ standortAdresse: null });
    expect(patch.after).toEqual({
      standortAdresse: {
        adresse: 'Musterstrasse 1, 6300 Zug',
        lv95: { e: 2681512, n: 1224508 },
        quelle: 'geoadmin',
        abgerufenAm: '2026-07-19T10:00:00.000Z',
      },
    });
  });

  it('summarize auf Deutsch: «Standort «<adresse>»»', () => {
    const doc = new KosmoDoc();
    const res = execute(doc, 'design.standortAdresseSetzen', {
      adresse: 'Ahornweg 12, 6000 Luzern',
      lv95: { e: 2665000, n: 1211000 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
    });
    expect(res.summary).toBe('Standort «Ahornweg 12, 6000 Luzern»');
  });
});

describe('design.standortAdresseSetzen — setzen, überschreiben, Undo', () => {
  it('ein zweiter Aufruf überschreibt den Standort vollständig (kein Merge)', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.standortAdresseSetzen', {
      adresse: 'Musterstrasse 1, 6300 Zug',
      lv95: { e: 2681512, n: 1224508 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
    });
    execute(doc, 'design.standortAdresseSetzen', {
      adresse: 'Ahornweg 12, 6000 Luzern',
      lv95: { e: 2665000, n: 1211000 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T11:30:00.000Z',
    });
    expect(doc.settings.standortAdresse).toEqual({
      adresse: 'Ahornweg 12, 6000 Luzern',
      lv95: { e: 2665000, n: 1211000 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T11:30:00.000Z',
    });
  });

  it('Undo entfernt den frisch gesetzten Standort wieder (History)', () => {
    const doc = new KosmoDoc();
    const h = new History();
    const res = execute(doc, 'design.standortAdresseSetzen', {
      adresse: 'Musterstrasse 1, 6300 Zug',
      lv95: { e: 2681512, n: 1224508 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
    });
    h.record(res.patches);
    expect(doc.settings.standortAdresse).not.toBeNull();

    h.undo(doc);
    expect(doc.settings.standortAdresse).toBeNull();

    h.redo(doc);
    expect(doc.settings.standortAdresse?.adresse).toBe('Musterstrasse 1, 6300 Zug');
  });

  it('Undo nach Überschreiben stellt den VORHERIGEN Standort wieder her (invertPatches)', () => {
    const doc = new KosmoDoc();
    const r1 = execute(doc, 'design.standortAdresseSetzen', {
      adresse: 'Musterstrasse 1, 6300 Zug',
      lv95: { e: 2681512, n: 1224508 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
    });
    const r2 = execute(doc, 'design.standortAdresseSetzen', {
      adresse: 'Ahornweg 12, 6000 Luzern',
      lv95: { e: 2665000, n: 1211000 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T11:30:00.000Z',
    });
    expect(doc.settings.standortAdresse?.adresse).toBe('Ahornweg 12, 6000 Luzern');

    // Ersten Undo-Schritt (den zweiten Aufruf) rückgängig machen — der
    // ERSTE Standort muss wieder da sein, nicht «kein Standort».
    doc.apply(invertPatches(r2.patches));
    expect(doc.settings.standortAdresse).toEqual({
      adresse: 'Musterstrasse 1, 6300 Zug',
      lv95: { e: 2681512, n: 1224508 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
    });

    // Zweiten Undo-Schritt (den ersten Aufruf) rückgängig machen — zurück zu
    // «kein Standort».
    doc.apply(invertPatches(r1.patches));
    expect(doc.settings.standortAdresse).toBeNull();
  });
});

describe('design.standortAdresseSetzen — Default-Doc & fromJSON, additiver Block bricht den Altbestand nicht', () => {
  it('Default-Doc hat kein `standortAdresse` gesetzt', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.standortAdresse).toBeUndefined();
  });

  it('fromJSON eines Alt-JSON ohne `standortAdresse`-Schlüssel lädt sauber', () => {
    const alt = new KosmoDoc();
    execute(alt, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const json = alt.toJSON();
    expect('standortAdresse' in json.settings).toBe(false);

    const geladen = KosmoDoc.fromJSON(json);
    expect(geladen.settings.standortAdresse).toBeUndefined();
  });

  it('fromJSON eines Doc MIT `standortAdresse` rundet verlustfrei (Roundtrip über Doc-Serialisierung)', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.standortAdresseSetzen', {
      adresse: 'Musterstrasse 1, 6300 Zug',
      lv95: { e: 2681512, n: 1224508 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
    });
    const geladen = KosmoDoc.fromJSON(doc.toJSON());
    expect(geladen.settings.standortAdresse).toEqual({
      adresse: 'Musterstrasse 1, 6300 Zug',
      lv95: { e: 2681512, n: 1224508 },
      quelle: 'geoadmin',
      abgerufenAm: '2026-07-19T10:00:00.000Z',
    });
  });

  it('bleibt neben dem bestehenden `standort` (ProjektStandort, design.standortSetzen) unabhängig — beide Felder koexistieren', () => {
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
    expect(doc.settings.standort?.label).toBe('Musterstrasse 1');
    expect(doc.settings.standortAdresse?.adresse).toBe('Musterstrasse 1, 6300 Zug');
  });
});
