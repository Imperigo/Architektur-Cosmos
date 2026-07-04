import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
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

describe('Varianten-Archiv (Vision A5)', () => {
  it('archiviert den Stand mit Kennzahlen + Thumb und listet neuste zuerst', async () => {
    const { loadTkbDemo } = await import('../src/state/demo-tkb');
    const { archiviereVariante, listeVarianten, loescheVariante } = await import('../src/state/variant-archive');
    loadTkbDemo();
    const v1 = await archiviereVariante('Stand A');
    expect(v1.kennzahlen.find((k) => k.label === 'NGF')?.wert).toMatch(/m²/);
    expect(v1.thumbSvg).toContain('<svg');
    const v2 = await archiviereVariante('Stand B');
    const liste = await listeVarianten();
    expect(liste.length).toBeGreaterThanOrEqual(2);
    expect(liste.findIndex((v) => v.id === v2.id)).toBeLessThan(liste.findIndex((v) => v.id === v1.id));
    await loescheVariante(v1.id);
    await loescheVariante(v2.id);
  });

  it('öffnet eine Variante als NEUES Projekt — Original bleibt eingefroren', async () => {
    const { loadTkbDemo } = await import('../src/state/demo-tkb');
    const { useProject } = await import('../src/state/project-store');
    const { aktivesProjektId } = await import('../src/state/project-vault');
    const { archiviereVariante, oeffneVariante, listeVarianten, loescheVariante } = await import('../src/state/variant-archive');
    loadTkbDemo();
    const vorherElemente = useProject.getState().doc.entities.size;
    const v = await archiviereVariante('Einfrieren');
    const vorherId = aktivesProjektId();
    await oeffneVariante(v.id);
    expect(aktivesProjektId()).not.toBe(vorherId); // frische Projekt-ID
    expect(useProject.getState().doc.entities.size).toBe(vorherElemente); // Inhalt identisch geladen
    for (const rest of await listeVarianten()) await loescheVariante(rest.id);
  });
});

describe('BM25-Relevanz (Vision E3)', () => {
  it('IDF drückt Allerweltswörter, Phrase gewinnt, Länge normalisiert', async () => {
    const { bm25Scores } = await import('../src/modules/prepare/knowledge');
    const texte = [
      'Beton Beton Beton Beton Beton Beton und nochmals Beton überall im Rohbau.',
      'Beton mit Trittschalldämmung unter dem Unterlagsboden nach SIA 251.',
      'Holzbau mit Brettsperrholz, ganz ohne das graue Material.',
      'Beton und Trittschalldämmung: die Trittschalldämmung liegt auf der Rohdecke.',
    ];
    const scores = bm25Scores(texte, 'Beton Trittschalldämmung');
    // Der seltene Term (Trittschalldämmung, idf hoch) schlägt das Beton-Spam-Chunk
    expect(scores[3]).toBeGreaterThan(scores[0]!);
    expect(scores[1]).toBeGreaterThan(scores[0]!);
    expect(scores[2]).toBe(0); // kein Query-Term ≥ 3 Zeichen enthalten
    // Sättigung: 7× «Beton» bringt nicht 7× den Score eines 1×-Chunks
    const nurBeton = bm25Scores(texte, 'Beton');
    expect(nurBeton[0]!).toBeLessThan(nurBeton[1]! * 3);
    // Exakte Phrase gewinnt gegen verstreute Terme
    const phrase = bm25Scores(
      ['die Dämmung liegt wo anders, Rohdecke gibt es', 'die Trittschalldämmung liegt auf der Rohdecke'],
      'Trittschalldämmung liegt auf der Rohdecke',
    );
    expect(phrase[1]!).toBeGreaterThan(phrase[0]!);
  });
});

describe('KosmoData Live-Sync (Vision E2)', () => {
  it('Live füllt den Cache; fällt das Netz, kommt der letzte gute Stand', async () => {
    const { ladeReferenzenLive } = await import('@kosmo/data');
    const daten = [{ id: 'x', title: 'Testhaus' }];
    const okFetch = (async () => ({ ok: true, json: async () => daten })) as unknown as typeof fetch;
    const failFetch = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const live = await ladeReferenzenLive(okFetch);
    expect(live?.quelle).toBe('live');
    expect(live?.eintraege[0]?.title).toBe('Testhaus');
    const cache = await ladeReferenzenLive(failFetch);
    expect(cache?.quelle).toBe('cache');
    expect(cache?.eintraege).toHaveLength(1);
    expect(cache?.stand).toBe(live?.stand);
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
