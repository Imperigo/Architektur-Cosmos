import { describe, expect, it } from 'vitest';
import { pruefeGlbHeader, GLB_MAX_BYTES } from '../src/state/glb-guard';

/**
 * Fuzz-Korpus (Serie I / Batch B7 — Parser-Robustheit): abgeschnittene/
 * gefälschte/übergrosse GLB-Dateien dürfen den Tresor nie erreichen. Jeder
 * Fall liefert `{ok:false, fehler}` statt zu werfen. Der Positivfall (ein
 * plausibler GLB-Header) muss weiter akzeptiert werden.
 */

function baueGlbHeader(
  totalLength: number,
  magic = 0x46546c67,
  version = 2,
  echteBufferGroesse = Math.max(12, totalLength),
): ArrayBuffer {
  const buffer = new ArrayBuffer(Math.max(12, echteBufferGroesse));
  const dv = new DataView(buffer);
  dv.setUint32(0, magic, true);
  dv.setUint32(4, version, true);
  dv.setUint32(8, totalLength, true);
  return buffer;
}

describe('pruefeGlbHeader — GLB-Import-Schranke', () => {
  it('leere Datei → {ok:false}, kein Throw', () => {
    expect(() => pruefeGlbHeader(new ArrayBuffer(0))).not.toThrow();
    expect(pruefeGlbHeader(new ArrayBuffer(0)).ok).toBe(false);
  });

  it('abgeschnitten: weniger als 12 Bytes (kein voller Header) → {ok:false}', () => {
    const r = pruefeGlbHeader(new ArrayBuffer(8));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/abgeschnitten/);
  });

  it('kein GLB (falsche Magic-Bytes, z.B. ein PNG) → {ok:false}', () => {
    const buffer = baueGlbHeader(20, 0x474e5089); // PNG-Signatur statt 'glTF'
    const r = pruefeGlbHeader(buffer);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/kein GLB/);
  });

  it('nicht unterstützte GLB-Version → {ok:false}', () => {
    const buffer = baueGlbHeader(20, undefined, 1);
    const r = pruefeGlbHeader(buffer);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/Version/);
  });

  it('abgeschnitten: deklarierte Gesamtlänge grösser als die Datei → {ok:false}', () => {
    // Header verspricht 999'999 Bytes, die echte Datei hat nur 40 — genau das
    // Muster einer abgeschnittenen Übertragung.
    const buffer = baueGlbHeader(999_999, undefined, undefined, 40);
    const r = pruefeGlbHeader(buffer);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/abgeschnitten/);
  });

  it('übergrosse Datei → {ok:false} statt Hänger', () => {
    const riesig = new ArrayBuffer(GLB_MAX_BYTES + 64);
    const dv = new DataView(riesig);
    dv.setUint32(0, 0x46546c67, true);
    dv.setUint32(4, 2, true);
    dv.setUint32(8, riesig.byteLength, true);
    const r = pruefeGlbHeader(riesig);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toMatch(/zu gross/);
  });

  it('plausibler GLB-Header (Positivfall) wird akzeptiert', () => {
    const buffer = baueGlbHeader(24);
    expect(pruefeGlbHeader(buffer)).toEqual({ ok: true });
  });

  it('funktioniert gleich für Uint8Array wie für ArrayBuffer', () => {
    const buffer = baueGlbHeader(24);
    expect(pruefeGlbHeader(new Uint8Array(buffer))).toEqual({ ok: true });
  });
});
