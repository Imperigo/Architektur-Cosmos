import { describe, expect, it } from 'vitest';
import { chunkText } from '../src/modules/prepare/knowledge';

describe('KosmoPrepare Chunking', () => {
  it('teilt an Absatzgrenzen um die Zielgrösse', () => {
    const absatz = 'Ein Satz über Schweizer Hochbau, Normen und Flächen. '.repeat(8).trim();
    const text = Array.from({ length: 6 }, () => absatz).join('\n\n');
    const chunks = chunkText(text, 1200);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1200 * 1.6);
    // nichts geht verloren (Whitespace-normalisiert)
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toContain('Schweizer Hochbau');
  });

  it('teilt überlange Einzelabsätze hart, aber an Wortgrenzen', () => {
    const lang = 'wort '.repeat(800).trim();
    const chunks = chunkText(lang, 1000);
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) expect(c.endsWith('wor')).toBe(false);
  });

  it('leerer Text ergibt keine Chunks', () => {
    expect(chunkText('   \n\n  ')).toEqual([]);
  });
});
