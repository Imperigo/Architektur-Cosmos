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

describe('TKB-Demo v2 (Abendbatch C1)', () => {
  it('lädt Bibliothek + Wohnhof-Kette: Wände, Fenster, Treppenhaus, keine Fluchtweg-Fehler', async () => {
    const { loadTkbDemo } = await import('../src/state/demo-tkb');
    const { useProject } = await import('../src/state/project-store');
    const { pruefeGrundriss } = await import('@kosmo/kernel');
    loadTkbDemo();
    const { doc, activeStoreyId } = useProject.getState();
    expect(doc.settings.projectName).toContain('TKB');
    expect(doc.byKind('wall').length).toBeGreaterThan(10);
    const fenster = doc.byKind('opening').filter((o) => (o as { openingType: string }).openingType === 'fenster');
    expect(fenster.length).toBeGreaterThanOrEqual(8);
    expect(doc.byKind('zone').filter((z) => (z as { raumTyp?: string }).raumTyp === 'treppenhaus')).toHaveLength(1);
    expect(doc.byKind('stair')).toHaveLength(1);
    // Fluchtweg: kein Fehler-Befund auf dem EG
    const befunde = pruefeGrundriss(doc, activeStoreyId!);
    expect(befunde.filter((b) => b.regel === 'Fluchtweg' && b.schwere === 'fehler')).toHaveLength(0);
  });
});
