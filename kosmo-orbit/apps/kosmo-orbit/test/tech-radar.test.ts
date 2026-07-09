import { describe, expect, it } from 'vitest';
import { entscheidFarbe, RADAR_BEREICHE, TECH_RADAR } from '../src/modules/doc/tech-radar';

/**
 * Tech-Radar-Kuration (v0.6.4, Notion-Rest): der KosmoDoc-Tab zeigt eine
 * Hand-Kuration von docs/TECH-RADAR.md. Die Tests sichern die Datenhygiene —
 * vollständige Felder, ehrliche ⚠-Markierung der Scan-Posten, stabile
 * Bereichs-Reihenfolge — nicht das Rendering.
 */

describe('Tech-Radar-Kuration (KosmoDoc)', () => {
  it('trägt eine substanzielle, vollständig ausgefüllte Postenliste', () => {
    expect(TECH_RADAR.length).toBeGreaterThanOrEqual(20);
    for (const p of TECH_RADAR) {
      expect(p.baustein.length).toBeGreaterThan(2);
      expect(p.kommentar.length).toBeGreaterThan(10);
      expect(p.bereich.length).toBeGreaterThan(2);
      // Jeder Entscheid hat eine definierte Farbe (switch ist erschöpfend)
      expect(entscheidFarbe(p.entscheid)).toMatch(/^var\(--k-/);
    }
  });

  it('keine doppelten Bausteine, Bereiche decken die Liste ab', () => {
    const namen = TECH_RADAR.map((p) => p.baustein);
    expect(new Set(namen).size).toBe(namen.length);
    for (const p of TECH_RADAR) expect(RADAR_BEREICHE).toContain(p.bereich);
  });

  it('Ehrlichkeit: ALLE Posten aus dem Notion-Scan-Nachtrag tragen die ⚠-Markierung', () => {
    const scanPosten = TECH_RADAR.filter((p) => p.bereich.includes('Scan'));
    expect(scanPosten.length).toBeGreaterThanOrEqual(4); // Gemini Omni, Open-Design, PosterGen, Arbor
    for (const p of scanPosten) expect(p.unverifiziert).toBe(true);
    // … und der Rest ist verifizierter Radar-Bestand ohne Markierung
    for (const p of TECH_RADAR.filter((p) => !p.bereich.includes('Scan'))) {
      expect(p.unverifiziert).toBeUndefined();
    }
  });

  it('der Cloud-Render-Kandidat (Gemini Omni Flash) ist als TEST mit Owner-Entscheid vorgemerkt', () => {
    const gemini = TECH_RADAR.find((p) => p.baustein.includes('Gemini Omni'));
    expect(gemini?.entscheid).toBe('TEST');
    expect(gemini?.kommentar).toContain('Owner-Entscheid');
  });
});
