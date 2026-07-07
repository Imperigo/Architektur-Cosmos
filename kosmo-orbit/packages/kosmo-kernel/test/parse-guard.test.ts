import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute, parseKosmoSafe, parseDocJson, safeJsonParse, type GuardLimits } from '../src';

/**
 * Fuzz-Korpus (Serie I / Batch B7 — Parser-Robustheit): kaputte/bösartige
 * `.kosmo`-Rohtexte dürfen weder crashen noch den Prototyp verseuchen. Jeder
 * Fall liefert `{ok:false, fehler}` — nie ein Throw, nie einen State-Effekt.
 * Der Positivfall (gültiges Modell) muss weiter laden.
 */

function gueltigesModell(): string {
  const doc = new KosmoDoc();
  execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  return JSON.stringify(doc.toJSON());
}

describe('safeJsonParse — Rohtext-Schranke', () => {
  it('leerer String → definierter Fehler', () => {
    const r = safeJsonParse('');
    expect(r.ok).toBe(false);
  });

  it('abgeschnittenes JSON → definierter Fehler, kein Throw', () => {
    const kaputt = gueltigesModell().slice(0, 40); // mitten im Objekt abgeschnitten
    expect(() => safeJsonParse(kaputt)).not.toThrow();
    const r = safeJsonParse(kaputt);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/ungültiges JSON/);
  });

  it('kaputtes/nicht-JSON Geschwafel → definierter Fehler', () => {
    const r = safeJsonParse('{ das ist kein json ][[');
    expect(r.ok).toBe(false);
  });

  it('übergrosser Rohtext → definierter Fehler statt Hänger', () => {
    const limits: GuardLimits = { maxTextLength: 100, maxDepth: 64, maxNodes: 1000 };
    const riesig = JSON.stringify({ entities: [], settings: {}, fuellstoff: 'x'.repeat(1000) });
    const r = safeJsonParse(riesig, limits);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/Rohtext zu gross/);
  });

  it('zu tief verschachtelte Struktur → definierter Fehler statt Hänger', () => {
    const limits: GuardLimits = { maxTextLength: 10_000_000, maxDepth: 20, maxNodes: 1_000_000 };
    let tief: unknown = { boden: true };
    for (let i = 0; i < 500; i++) tief = { kind: tief };
    const r = safeJsonParse(JSON.stringify(tief), limits);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/tief verschachtelt/);
  });

  it('übergrosse Knotenzahl (breite Struktur) → definierter Fehler', () => {
    const limits: GuardLimits = { maxTextLength: 10_000_000, maxDepth: 1000, maxNodes: 500 };
    const breit = { entities: Array.from({ length: 5000 }, (_, i) => ({ id: `e${i}`, kind: 'wall' })) };
    const r = safeJsonParse(JSON.stringify(breit), limits);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/zu viele Knoten/);
  });

  it('__proto__-Injektion wird als gesperrter Schlüssel abgelehnt', () => {
    const r = safeJsonParse('{"__proto__":{"polluted":true}}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/gesperrter Schlüssel/);
  });

  it('constructor/prototype-Injektion wird ebenfalls abgelehnt', () => {
    const r1 = safeJsonParse('{"a":{"constructor":{"x":1}}}');
    const r2 = safeJsonParse('{"a":{"prototype":{"x":1}}}');
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
  });

  it('echte Pollution-Regression: nach dem Guard bleibt Object.prototype sauber', () => {
    // Das ist der eigentliche Beweis — nicht nur „Fehler kam zurück", sondern
    // die Injektion hat NIRGENDS wirklich gewirkt: ein frisches Objekt bleibt
    // ohne die injizierte Eigenschaft.
    const boesartig = '{"__proto__":{"polluted":true},"settings":{},"entities":[]}';
    const r = safeJsonParse(boesartig);
    expect(r.ok).toBe(false);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
  });

  it('gültiges, harmloses JSON lädt weiterhin ohne Fehler', () => {
    const r = safeJsonParse(gueltigesModell());
    expect(r.ok).toBe(true);
  });
});

describe('parseDocJson — Struktur-Guard (auch für Vault-Records ohne JSON.parse)', () => {
  it('entities fehlt → definierter Fehler', () => {
    const r = parseDocJson({ schema: 'kosmo.model/v1', settings: {} });
    expect(r.ok).toBe(false);
  });

  it('entities ist kein Array → definierter Fehler', () => {
    const r = parseDocJson({ entities: 'nicht-array' });
    expect(r.ok).toBe(false);
  });

  it('Entity ohne id/kind → definierter Fehler', () => {
    const r = parseDocJson({ entities: [{ foo: 'bar' }] });
    expect(r.ok).toBe(false);
  });

  it('settings ist kein Objekt → definierter Fehler', () => {
    const r = parseDocJson({ entities: [], settings: 'nope' });
    expect(r.ok).toBe(false);
  });

  it('__proto__ tief in einer Entity wird erkannt', () => {
    // Über JSON.parse gebaut (nicht als Objekt-Literal!) — nur so entsteht
    // eine ECHTE eigene Eigenschaft namens "__proto__" statt einer
    // Prototyp-Zuweisung durch die Literal-Syntax selbst.
    const wert = JSON.parse('{"entities":[{"id":"w1","kind":"wall","meta":{"__proto__":{"polluted":true}}}]}');
    const r = parseDocJson(wert);
    expect(r.ok).toBe(false);
  });

  it('minimale gültige Struktur besteht', () => {
    const r = parseDocJson({ entities: [{ id: 'w1', kind: 'wall' }], settings: { projectName: 'X' } });
    expect(r.ok).toBe(true);
  });
});

describe('parseKosmoSafe — der eine Einstieg fürs .kosmo-Laden', () => {
  it('leerer String → {ok:false}, kein Throw', () => {
    expect(() => parseKosmoSafe('')).not.toThrow();
    expect(parseKosmoSafe('').ok).toBe(false);
  });

  it('abgeschnittenes JSON → {ok:false}, kein Throw', () => {
    const kaputt = gueltigesModell().slice(0, 30);
    expect(() => parseKosmoSafe(kaputt)).not.toThrow();
    expect(parseKosmoSafe(kaputt).ok).toBe(false);
  });

  it('__proto__-Injektion → {ok:false}, keine Pollution, kein State (kein doc geliefert)', () => {
    const boesartig = '{"__proto__":{"polluted":true},"entities":[],"settings":{}}';
    const r = parseKosmoSafe(boesartig);
    expect(r.ok).toBe(false);
    expect('doc' in r).toBe(false);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('entities ist ein Objekt statt Array (Strukturbruch) → {ok:false}', () => {
    const r = parseKosmoSafe('{"entities":{"boese":true},"settings":{}}');
    expect(r.ok).toBe(false);
  });

  it('übergrosse/tiefe Struktur → {ok:false} statt Hänger', () => {
    let tief: unknown = { x: 1 };
    for (let i = 0; i < 200; i++) tief = { kind: tief };
    const r = parseKosmoSafe(JSON.stringify({ entities: [], settings: {}, tief }), {
      maxTextLength: 10_000_000,
      maxDepth: 32,
      maxNodes: 1_000_000,
    });
    expect(r.ok).toBe(false);
  });

  it('gültiges .kosmo-Modell lädt weiterhin normal (Positivfall)', () => {
    const text = gueltigesModell();
    const r = parseKosmoSafe(text);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.doc.byKind('storey')).toHaveLength(1);
      expect(r.doc.storeysOrdered()[0]!.name).toBe('EG');
    }
  });
});
