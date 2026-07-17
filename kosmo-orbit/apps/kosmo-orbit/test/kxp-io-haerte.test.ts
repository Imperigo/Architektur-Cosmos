import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { KosmoDoc, execute } from '@kosmo/kernel';
import { parseKxpPaket, packKxp, kxpExportVorschau } from '../src/state/kxp-io';
import { useProject } from '../src/state/project-store';

/**
 * `.kxp`-Härtungs-Korpus (Muster `project-io-haerte.test.ts`, Serie I / B7):
 * kaputte/bösartige Pakete dürfen weder crashen noch Zustand verseuchen —
 * `parseKxpPaket` muss für jeden Fall `{ok:false, fehler}` liefern statt zu
 * werfen. Zusätzlich (anders als `.kosmo`): das Manifest läuft ECHT durch
 * zod (`KxpManifestSchema.safeParse`), nicht nur durch den Struktur-Guard.
 */

function baueGueltigesManifest(plaene: string[] = []): Record<string, unknown> {
  return {
    schema: 'kosmo.kxp/v1',
    id: 'p1',
    name: 'Testprojekt',
    quelle_projekt: { id: 'p1', name: 'Testprojekt' },
    exportiert_um: '2026-07-16T00:00:00.000Z',
    contents: { model: 'model/model.json', journal: 'memory/journal.jsonl', plaene },
    trust: { status: 'entwurf', verlauf: [], signatur: { signiert: false, hinweis: 'unsigniert — Trust-Layer braucht Konten/HomeStation' } },
  };
}

function baueGueltigesPaket(): Uint8Array {
  const doc = new KosmoDoc();
  execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  return zipSync({
    'kxp.manifest.json': strToU8(JSON.stringify(baueGueltigesManifest())),
    'model/model.json': strToU8(JSON.stringify(doc.toJSON())),
    'memory/journal.jsonl': strToU8(''),
  });
}

describe('parseKxpPaket — Korpus kaputter/bösartiger .kxp-Dateien', () => {
  it('leere Datei → {ok:false}, kein Throw', () => {
    expect(() => parseKxpPaket(new Uint8Array(0))).not.toThrow();
    expect(parseKxpPaket(new Uint8Array(0)).ok).toBe(false);
  });

  it('kein Zip (blanker Byte-Müll) → {ok:false}, kein Throw', () => {
    const muell = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 255, 254, 253]);
    expect(() => parseKxpPaket(muell)).not.toThrow();
    expect(parseKxpPaket(muell).ok).toBe(false);
  });

  it('abgeschnittenes Zip (gültiges Paket, hart am Ende gekappt) → {ok:false}', () => {
    const voll = baueGueltigesPaket();
    const gekappt = voll.slice(0, Math.floor(voll.length / 2));
    expect(() => parseKxpPaket(gekappt)).not.toThrow();
    expect(parseKxpPaket(gekappt).ok).toBe(false);
  });

  it('Zip ohne kxp.manifest.json → {ok:false} mit sprechendem Fehler', () => {
    const paket = zipSync({ 'model/model.json': strToU8('{}') });
    const r = parseKxpPaket(paket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/kxp\.manifest\.json/);
  });

  it('Manifest ist kaputtes JSON → {ok:false}', () => {
    const paket = zipSync({ 'kxp.manifest.json': strToU8('{ kaputt [[[') });
    const r = parseKxpPaket(paket);
    expect(r.ok).toBe(false);
  });

  it('Manifest passt strukturell nicht zum .kxp-Format (kein KxpManifest) → {ok:false}, ECHTE zod-Ablehnung', () => {
    const paket = zipSync({ 'kxp.manifest.json': strToU8(JSON.stringify({ irgendwas: true })) });
    const r = parseKxpPaket(paket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/passt nicht zum \.kxp-Format/);
  });

  it('Manifest trägt eine __proto__-Injektion → {ok:false}, keine Pollution', () => {
    const paket = zipSync({
      'kxp.manifest.json': strToU8('{"__proto__":{"polluted":true},"id":"x","name":"x"}'),
    });
    const r = parseKxpPaket(paket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/gesperrter Schlüssel/);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('gültiges Manifest, aber model/model.json fehlt → {ok:false}', () => {
    const paket = zipSync({ 'kxp.manifest.json': strToU8(JSON.stringify(baueGueltigesManifest())) });
    const r = parseKxpPaket(paket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/model\/model\.json/);
  });

  it('Manifest kündigt einen Plan an, der nicht im Paket liegt → {ok:false}, kein stilles Weglassen', () => {
    const doc = new KosmoDoc();
    const paket = zipSync({
      'kxp.manifest.json': strToU8(JSON.stringify(baueGueltigesManifest(['fehlt.svg']))),
      'model/model.json': strToU8(JSON.stringify(doc.toJSON())),
    });
    const r = parseKxpPaket(paket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/fehlt\.svg/);
  });

  it('journal.jsonl mit kaputter Zeile → {ok:false}, Modell bleibt unangetastet', () => {
    const doc = new KosmoDoc();
    const paket = zipSync({
      'kxp.manifest.json': strToU8(JSON.stringify(baueGueltigesManifest())),
      'model/model.json': strToU8(JSON.stringify(doc.toJSON())),
      'memory/journal.jsonl': strToU8('{"ts":"x"}\n{ das ist kaputt [['),
    });
    const r = parseKxpPaket(paket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/journal\.jsonl/);
  });

  it('übergrosses model.json (über dem Rohtext-Deckel) → {ok:false} statt Hänger', () => {
    const riesigesModel = JSON.stringify({ entities: [], settings: {}, fuellstoff: 'x'.repeat(33 * 1024 * 1024) });
    const paket = zipSync({
      'kxp.manifest.json': strToU8(JSON.stringify(baueGueltigesManifest())),
      'model/model.json': strToU8(riesigesModel),
    });
    const r = parseKxpPaket(paket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/zu gross/);
  });

  it('gültiges Paket lädt weiterhin normal (Positivfall)', () => {
    const paket = baueGueltigesPaket();
    const r = parseKxpPaket(paket);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.doc.byKind('storey')).toHaveLength(1);
      expect(r.journal).toEqual([]);
      expect(r.manifest.trust.status).toBe('entwurf');
      expect(r.manifest.trust.signatur.signiert).toBe(false);
    }
  });
});

describe('packKxp / kxpExportVorschau — Export aus dem laufenden Projekt (Integrationstest über useProject)', () => {
  it('bündelt Modell + Blätter (Pläne) des laufenden Projekts, roundtrip via parseKxpPaket', () => {
    useProject.getState().runCommand('design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    useProject.getState().runCommand('publish.blattErstellen', { name: 'Grundrisse', format: 'A1', orientation: 'quer' });

    const vorschau = kxpExportVorschau();
    expect(vorschau.blaetterAnzahl).toBeGreaterThanOrEqual(1);

    const bytes = packKxp({ exportedAt: '2026-07-16T12:00:00.000Z' });
    const r = parseKxpPaket(bytes);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.manifest.exportiert_um).toBe('2026-07-16T12:00:00.000Z');
    expect(r.manifest.contents.plaene.length).toBeGreaterThanOrEqual(1);
    expect(r.plaene.length).toBe(r.manifest.contents.plaene.length);
    expect(r.plaene[0]?.svg).toMatch(/<svg/);
    // Trust startet ehrlich bei «entwurf», ohne Verlauf, unsigniert.
    expect(r.manifest.trust.status).toBe('entwurf');
    expect(r.manifest.trust.verlauf).toEqual([]);
    expect(r.manifest.trust.signatur.signiert).toBe(false);
  });
});
