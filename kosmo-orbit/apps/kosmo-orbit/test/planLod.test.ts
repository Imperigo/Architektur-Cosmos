import { describe, expect, it } from 'vitest';
import { planLod } from '../src/modules/design/planLod';

describe('planLod — Grundriss-LOD aus px-pro-Meter', () => {
  it('klassifiziert ohne Vorgeschichte anhand grober Lage (neutral von "mittel" aus)', () => {
    expect(planLod(5)).toBe('fern');
    expect(planLod(30)).toBe('mittel');
    expect(planLod(1000)).toBe('voll');
  });

  it('voll bleibt voll, bis unter die Abstiegsschwelle (40) gezoomt wird', () => {
    expect(planLod(41, 'voll')).toBe('voll');
    expect(planLod(40, 'voll')).toBe('voll');
    expect(planLod(39.9, 'voll')).toBe('mittel');
  });

  it('mittel bleibt mittel, bis unter 18 (fern) oder ab 46 (voll)', () => {
    expect(planLod(18, 'mittel')).toBe('mittel');
    expect(planLod(17.9, 'mittel')).toBe('fern');
    expect(planLod(45.9, 'mittel')).toBe('mittel');
    expect(planLod(46, 'mittel')).toBe('voll');
  });

  it('fern bleibt fern, bis mindestens 22 erreicht ist', () => {
    expect(planLod(21.9, 'fern')).toBe('fern');
    expect(planLod(22, 'fern')).toBe('mittel');
  });

  it('Hysterese: an der alten 40er-Schwelle kein Flackern zwischen voll und mittel', () => {
    // Direkt an 40 pendelnd bleibt "voll" (Einstieg in "mittel" erst < 40 …
    // und Rückkehr zu "voll" erst ab 46, nicht schon wieder bei 40).
    let lod: ReturnType<typeof planLod> = 'voll';
    for (const wert of [40, 39.9, 40, 39.9, 40]) {
      lod = planLod(wert, lod);
    }
    // 39.9 kippt einmal nach "mittel" — und bleibt dort, obwohl 40 danach
    // wiederkehrt (kein Zurückspringen ohne die 46er-Schwelle zu erreichen).
    expect(lod).toBe('mittel');
  });

  it('Hysterese: an der 18er-Schwelle kein Flackern zwischen mittel und fern', () => {
    let lod: ReturnType<typeof planLod> = 'mittel';
    for (const wert of [18, 17.9, 18, 17.9]) {
      lod = planLod(wert, lod);
    }
    expect(lod).toBe('fern');
  });

  it('springt bei einem grossen Zoom-Sprung direkt über mehrere Stufen', () => {
    expect(planLod(5, 'voll')).toBe('fern');
    expect(planLod(1000, 'fern')).toBe('voll');
  });

  it('ist robust gegenüber ungültigen Werten (NaN/negativ) — behandelt sie als 0', () => {
    expect(planLod(Number.NaN)).toBe('fern');
    expect(planLod(-5)).toBe('fern');
  });
});
