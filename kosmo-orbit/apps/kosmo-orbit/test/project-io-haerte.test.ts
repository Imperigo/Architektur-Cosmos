import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { strToU8, zipSync } from 'fflate';
import { KosmoDoc, execute } from '@kosmo/kernel';
import { parseKosmoPaket } from '../src/state/project-io';

/**
 * Fuzz-Korpus fürs `.kosmo`-Laden (Serie I / Batch B7 — Parser-Robustheit):
 * kaputte/bösartige Pakete dürfen weder crashen noch Zustand verseuchen —
 * `parseKosmoPaket` (die reine Funktion hinter `openProjectFile`) muss für
 * jeden Fall `{ok:false, fehler}` liefern statt zu werfen. Der Positivfall
 * (gültiges Paket) muss weiter laden.
 */

function baueGueltigesPaket(): Uint8Array {
  const doc = new KosmoDoc();
  execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  return zipSync({
    'kosmo.project.json': strToU8(JSON.stringify({ schema: 'kosmo.project/v1' })),
    'model/model.json': strToU8(JSON.stringify(doc.toJSON())),
    'memory/journal.jsonl': strToU8(''),
  });
}

describe('parseKosmoPaket — Korpus kaputter/bösartiger .kosmo-Dateien', () => {
  it('leere Datei → {ok:false}, kein Throw', () => {
    expect(() => parseKosmoPaket(new Uint8Array(0))).not.toThrow();
    expect(parseKosmoPaket(new Uint8Array(0)).ok).toBe(false);
  });

  it('kein Zip (blanker Byte-Müll) → {ok:false}, kein Throw', () => {
    const muell = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 255, 254, 253]);
    expect(() => parseKosmoPaket(muell)).not.toThrow();
    expect(parseKosmoPaket(muell).ok).toBe(false);
  });

  it('abgeschnittenes Zip (gültiges Paket, hart am Ende gekappt) → {ok:false}', () => {
    const voll = baueGueltigesPaket();
    const gekappt = voll.slice(0, Math.floor(voll.length / 2));
    expect(() => parseKosmoPaket(gekappt)).not.toThrow();
    expect(parseKosmoPaket(gekappt).ok).toBe(false);
  });

  it('Zip ohne model/model.json → {ok:false} mit sprechendem Fehler', () => {
    const paket = zipSync({ 'kosmo.project.json': strToU8('{}') });
    const r = parseKosmoPaket(paket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/model\/model\.json/);
  });

  it('model.json ist kaputtes JSON → {ok:false}', () => {
    const paket = zipSync({ 'model/model.json': strToU8('{ kaputt [[[') });
    const r = parseKosmoPaket(paket);
    expect(r.ok).toBe(false);
  });

  it('model.json trägt eine __proto__-Injektion → {ok:false}, keine Pollution', () => {
    const paket = zipSync({
      'model/model.json': strToU8('{"__proto__":{"polluted":true},"entities":[],"settings":{}}'),
    });
    const r = parseKosmoPaket(paket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/gesperrter Schlüssel/);
    // Die eigentliche Regression: kein Objekt im Prozess trägt danach die
    // injizierte Eigenschaft.
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
  });

  it('entities ist kein Array (Strukturbruch in model.json) → {ok:false}', () => {
    const paket = zipSync({
      'model/model.json': strToU8('{"entities":"nicht-array","settings":{}}'),
    });
    const r = parseKosmoPaket(paket);
    expect(r.ok).toBe(false);
  });

  it('journal.jsonl mit kaputter Zeile → {ok:false}, model bleibt unangetastet', () => {
    const doc = new KosmoDoc();
    const paket = zipSync({
      'model/model.json': strToU8(JSON.stringify(doc.toJSON())),
      'memory/journal.jsonl': strToU8('{"ts":"x"}\n{ das ist kaputt [['),
    });
    const r = parseKosmoPaket(paket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/journal\.jsonl/);
  });

  it('journal.jsonl mit __proto__-Injektion in einer Zeile → {ok:false}', () => {
    const doc = new KosmoDoc();
    const paket = zipSync({
      'model/model.json': strToU8(JSON.stringify(doc.toJSON())),
      'memory/journal.jsonl': strToU8('{"__proto__":{"polluted":true}}'),
    });
    const r = parseKosmoPaket(paket);
    expect(r.ok).toBe(false);
  });

  it('übergrosses model.json (über dem Rohtext-Deckel) → {ok:false} statt Hänger', () => {
    // Hochkomprimierbarer Füllstoff — winzig gezippt, aber > 32 MB entpackt,
    // damit der Text-Deckel in parseKosmoSafe NACH dem Entpacken greift.
    const riesigesModel = JSON.stringify({
      entities: [],
      settings: {},
      fuellstoff: 'x'.repeat(33 * 1024 * 1024),
    });
    const paket = zipSync({ 'model/model.json': strToU8(riesigesModel) });
    const r = parseKosmoPaket(paket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/zu gross/);
  });

  it('gültiges Paket lädt weiterhin normal (Positivfall)', () => {
    const paket = baueGueltigesPaket();
    const r = parseKosmoPaket(paket);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.doc.byKind('storey')).toHaveLength(1);
      expect(r.journal).toEqual([]);
    }
  });
});
