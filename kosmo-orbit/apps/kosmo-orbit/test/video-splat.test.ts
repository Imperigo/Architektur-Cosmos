import { describe, expect, it } from 'vitest';
import { frameTimestamps } from '../src/modules/design/video-splat';

/**
 * Video → Splat, Stufe 2 (ehrlich nach Tempo, nicht nach Ort) — nur die
 * reine Zeitstempel-Berechnung ist ohne <video>/<canvas> testbar; die
 * eigentliche Browser-Extraktion (extractFramesFromVideo) und die Bridge-
 * Übergabe (postVideoSplatJob) brauchen echtes DOM/Netz und werden über die
 * begleitende E2E-Spec geprüft (nicht in diesem Batch ausgeführt).
 */

describe('frameTimestamps — gleichmässiges Sampling über die Videolänge', () => {
  it('verteilt n Zeitpunkte gleichmässig über die Dauer (Intervall-Mitten)', () => {
    expect(frameTimestamps(10, 5)).toEqual([1, 3, 5, 7, 9]);
  });

  it('ein einzelner Frame liegt in der Mitte des Videos', () => {
    expect(frameTimestamps(10, 1)).toEqual([5]);
  });

  it('rundet eine gebrochene Frame-Zahl ab', () => {
    expect(frameTimestamps(10, 4.9)).toHaveLength(4);
  });

  it('Dauer 0 oder negativ ergibt keine Zeitpunkte', () => {
    expect(frameTimestamps(0, 10)).toEqual([]);
    expect(frameTimestamps(-5, 10)).toEqual([]);
  });

  it('0 oder negative Frame-Anzahl ergibt keine Zeitpunkte', () => {
    expect(frameTimestamps(10, 0)).toEqual([]);
    expect(frameTimestamps(10, -3)).toEqual([]);
  });

  it('alle Zeitpunkte liegen innerhalb der Videodauer', () => {
    const ts = frameTimestamps(7.5, 6);
    for (const t of ts) {
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThan(7.5);
    }
  });
});
