import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { indexedDB } from 'fake-indexeddb';

/**
 * v0.8.1/KI1 (Basis-Embeddings + Hybrid-Suche): `importiereBasis` bettet
 * die mitgelieferten Basis-Korpora jetzt genau wie `ingestFile` ein
 * (Bridge `/embed`), statt sie nur BM25-durchsuchbar abzulegen. Diese Suite
 * deckt Batch-Grösse, Fehlertoleranz (Bridge weg → Import läuft trotzdem
 * fertig) und die nachträgliche Vektorisierung ab — plus (letzter Block)
 * einen Beweis gegen die ECHTE Fake-Bridge (:8600, kein Mock), dass die
 * Vektorsuche einen Treffer findet, den BM25 allein nicht liefert.
 */

async function frischeDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('kosmo-wissen');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  // `embedTexts` liest `localStorage` (Bridge-URL-Override) — im Node-Testlauf
  // gibt es kein globales localStorage, anders als im Browser. Ohne diesen
  // Stub würde jeder embedTexts-Aufruf mit ReferenceError abbrechen, bevor
  // die IndexedDB-Transaktion sauber geschlossen wird — das lässt spätere
  // deleteDatabase()-Aufrufe hängen (offene Connection, kein blocked-Event).
  const g = globalThis as Record<string, unknown>;
  g['localStorage'] ??= { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
  await frischeDb();
});

describe('importiereBasis — Batching + Fehlertoleranz (v0.8.1/KI1)', () => {
  it('embedded in batchSize-Häppchen: je Quelle so viele /embed-Aufrufe wie ceil(chunks/batchSize)', async () => {
    const origFetch = globalThis.fetch;
    let embedCalls = 0;
    const embedCallSizes: number[] = [];
    globalThis.fetch = (async (url: unknown, init?: { body?: string }) => {
      const u = String(url);
      if (u.includes('/embed')) {
        embedCalls++;
        const texts = (JSON.parse(init?.body ?? '{}').texts as string[]) ?? [];
        embedCallSizes.push(texts.length);
        return { ok: true, json: async () => ({ vectors: texts.map(() => [1, 0]) }) };
      }
      if (u.includes('testsammlung.json')) {
        return {
          ok: true,
          json: async () => ({
            quellen: [
              {
                name: 'Quelle mit 10 Abschnitten',
                // 10 Chunks bei batchSize 4 -> 3 Batches (4+4+2)
                chunks: Array.from({ length: 10 }, (_, i) => ({ text: `Abschnitt ${i}` })),
              },
            ],
          }),
        };
      }
      throw new Error(`unerwarteter Fetch im Test: ${u}`);
    }) as unknown as typeof fetch;

    try {
      const { importiereBasis } = await import('../src/modules/prepare/knowledge');
      const res = await importiereBasis('testsammlung', { batchSize: 4 });
      expect(res).toEqual({ quellen: 1, chunks: 10, vektorisiert: 10 });
      expect(embedCalls).toBe(3);
      expect(embedCallSizes).toEqual([4, 4, 2]);

      const { searchKnowledge } = await import('../src/modules/prepare/knowledge');
      // Alle 10 Chunks tragen jetzt einen Vektor — die Semantik-Suche greift.
      const hits = await searchKnowledge('irgendwas', 20);
      expect(hits.length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('Bridge fällt mitten im Import weg: Import bricht NICHT ab, Rest-Chunks bleiben ohne Vektor (BM25-Fallback)', async () => {
    const origFetch = globalThis.fetch;
    let embedCalls = 0;
    globalThis.fetch = (async (url: unknown, init?: { body?: string }) => {
      const u = String(url);
      if (u.includes('/embed')) {
        embedCalls++;
        // Erster Batch klappt, danach ist die Bridge weg.
        if (embedCalls === 1) {
          const texts = (JSON.parse(init?.body ?? '{}').texts as string[]) ?? [];
          return { ok: true, json: async () => ({ vectors: texts.map(() => [1, 0]) }) };
        }
        return { ok: false, status: 503, json: async () => ({}) };
      }
      if (u.includes('bridgeweg.json')) {
        return {
          ok: true,
          json: async () => ({
            quellen: [
              { name: 'Quelle A', chunks: Array.from({ length: 3 }, (_, i) => ({ text: `A-${i}` })) },
              { name: 'Quelle B', chunks: Array.from({ length: 3 }, (_, i) => ({ text: `B-${i}` })) },
            ],
          }),
        };
      }
      throw new Error(`unerwarteter Fetch im Test: ${u}`);
    }) as unknown as typeof fetch;

    try {
      const { importiereBasis, listDocs, getChunk } = await import('../src/modules/prepare/knowledge');
      // Quelle A bekommt bei batchSize 2 zwei Embed-Aufrufe: der erste klappt (2 Vektoren),
      // der zweite (1 Chunk) scheitert -> Rest von A UND ganz B bleiben vektorlos.
      const res = await importiereBasis('bridgeweg', { batchSize: 2 });
      expect(res.quellen).toBe(2); // BEIDE Quellen vollständig gespeichert — kein Abbruch
      expect(res.chunks).toBe(6);
      expect(res.vektorisiert).toBe(2); // nur der erste erfolgreiche Batch

      const docs = await listDocs();
      expect(docs.map((d) => d.name).sort()).toEqual(['Quelle A', 'Quelle B']);
      const docA = docs.find((d) => d.name === 'Quelle A')!;
      const docB = docs.find((d) => d.name === 'Quelle B')!;
      expect((await getChunk(docA.id, 0))?.vector).toBeDefined();
      expect((await getChunk(docA.id, 1))?.vector).toBeDefined();
      expect((await getChunk(docA.id, 2))?.vector).toBeUndefined(); // gescheiterter Batch
      expect((await getChunk(docB.id, 0))?.vector).toBeUndefined(); // Bridge inzwischen "tot"
      // Trotzdem lesbar: die Chunks selbst sind da, nur ohne Vektor.
      expect((await getChunk(docB.id, 0))?.text).toBe('B-0');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('meldet Fortschritt je abgeschlossener Quelle über onProgress', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (url: unknown, init?: { body?: string }) => {
      const u = String(url);
      if (u.includes('/embed')) {
        const texts = (JSON.parse(init?.body ?? '{}').texts as string[]) ?? [];
        return { ok: true, json: async () => ({ vectors: texts.map(() => [1, 0]) }) };
      }
      if (u.includes('progress.json')) {
        return {
          ok: true,
          json: async () => ({
            quellen: [
              { name: 'Q1', chunks: [{ text: 'x' }] },
              { name: 'Q2', chunks: [{ text: 'y' }] },
            ],
          }),
        };
      }
      throw new Error(`unerwarteter Fetch im Test: ${u}`);
    }) as unknown as typeof fetch;

    try {
      const { importiereBasis } = await import('../src/modules/prepare/knowledge');
      const fortschritte: { quelle: number; quellenGesamt: number }[] = [];
      await importiereBasis('progress', { onProgress: (f) => fortschritte.push({ quelle: f.quelle, quellenGesamt: f.quellenGesamt }) });
      expect(fortschritte).toEqual([
        { quelle: 1, quellenGesamt: 2 },
        { quelle: 2, quellenGesamt: 2 },
      ]);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe('embedTexts — konfigurierbares Timeout (v0.8.1/KI1)', () => {
  it('ein kurzes Timeout bricht einen langsamen Bridge-Aufruf ab (null statt Hänger)', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = ((_url: unknown, init?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      })) as unknown as typeof fetch;
    try {
      const { embedTexts } = await import('../src/modules/prepare/knowledge');
      const result = await embedTexts(['irgendwas'], 20); // 20ms statt Default 6000ms
      expect(result).toBeNull();
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe('vektorisiereFehlende — nachträgliche Vektorisierung (v0.8.1/KI1)', () => {
  async function seedeVektorlosenChunk(docId: string, seq: number, text: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('kosmo-wissen', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'id' }).createIndex('docId', 'docId');
        }
      };
      req.onsuccess = () => {
        const tx = req.result.transaction(['docs', 'chunks'], 'readwrite');
        tx.objectStore('docs').put({ id: docId, name: docId, source: 'basis', addedAt: new Date().toISOString(), chunkCount: 1 });
        tx.objectStore('chunks').put({ id: `${docId}-${seq}`, docId, docName: docId, seq, text });
        tx.oncomplete = () => {
          req.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }

  it('vektorisiert nachträglich Chunks, die ohne Bridge aufgenommen wurden', async () => {
    await seedeVektorlosenChunk('doc-alt-1', 0, 'Ein alt aufgenommener Abschnitt ohne Vektor.');
    await seedeVektorlosenChunk('doc-alt-2', 0, 'Noch ein Abschnitt, ebenfalls ohne Vektor.');

    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
      const texts = (JSON.parse(init?.body ?? '{}').texts as string[]) ?? [];
      return { ok: true, json: async () => ({ vectors: texts.map(() => [1, 0]) }) };
    }) as unknown as typeof fetch;

    try {
      const { vektorisiereFehlende, getChunk } = await import('../src/modules/prepare/knowledge');
      const res = await vektorisiereFehlende({ batchSize: 1 });
      expect(res).toEqual({ gesamt: 2, vektorisiert: 2 });
      expect((await getChunk('doc-alt-1', 0))?.vector).toEqual([1, 0]);
      expect((await getChunk('doc-alt-2', 0))?.vector).toEqual([1, 0]);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('bricht sauber ab, wenn die Bridge (wieder) weg ist — kein Teilzustand geht verloren', async () => {
    await seedeVektorlosenChunk('doc-alt-3', 0, 'Dieser Abschnitt bleibt ohne Vektor.');
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    try {
      const { vektorisiereFehlende, getChunk } = await import('../src/modules/prepare/knowledge');
      const res = await vektorisiereFehlende();
      expect(res).toEqual({ gesamt: 1, vektorisiert: 0 });
      expect((await getChunk('doc-alt-3', 0))?.vector).toBeUndefined();
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

// ── Integrationsbeweis gegen die ECHTE Fake-Bridge (:8600, kein Mock) ──
// Voraussetzung: `python3 tools/homestation-bridge/kosmo_bridge/main.py --fake --port 8600`
// läuft (geteilte Ressource, s. CLAUDE.md). Läuft sie nicht, wird der Test
// übersprungen, statt das Gate rot zu färben.

async function bridgeErreichbar(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:8600/health');
    return res.ok;
  } catch {
    return false;
  }
}

describe('Integrationsbeweis: echte Fake-Bridge — Semantik findet, was BM25 komplett verfehlt', () => {
  it('Vektor-Pfad (reale /embed-Antworten) holt den passenden Chunk; BM25 liefert für dieselbe Query 0/0', async () => {
    if (!(await bridgeErreichbar())) {
      // eslint-disable-next-line no-console
      console.warn('Fake-Bridge (:8600) nicht erreichbar — Integrationstest übersprungen.');
      return;
    }
    const g = globalThis as Record<string, unknown>;
    g['localStorage'] ??= { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };

    const korrekt = 'Der Baukörper vermittelt zwischen den Massstäben der Nachbarbebauung.';
    const decoy = 'Die Fassade zeigt Sichtbeton und Holzlisenen als Materialkonzept.';
    // Genitiv/Plural-Formen derselben Begriffe — kein einziges Wort steht
    // wörtlich (als Teilstring) im Ziel-Chunk, trifft ihn aber über die
    // trigrammbasierten Fake-Vektoren (ähnliche Zeichenfolgen liegen nahe
    // beieinander — s. main.py `_fake_embed`-Doku). Empirisch mit dem
    // laufenden `--fake`-Server vermessen: cos(Ziel)=0.432, cos(Decoy)=-0.022.
    const query = 'Baukörpers Nachbarbebauungen';

    const { bm25Scores } = await import('../src/modules/prepare/knowledge');
    const bm25 = bm25Scores([korrekt, decoy], query);
    expect(bm25).toEqual([0, 0]); // BM25 findet hier wörtlich GAR NICHTS

    const { importiereBasis, searchKnowledge } = await import('../src/modules/prepare/knowledge');
    const origFetch = globalThis.fetch;
    // NUR die Basis-JSON-Datei wird gestubbt (es gibt keinen echten Datei-Server
    // im Test) — der `/embed`-Aufruf geht unverändert an die ECHTE Bridge.
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('semantikbeweis.json')) {
        return {
          ok: true,
          json: async () => ({
            quellen: [
              { name: 'Ziel', chunks: [{ text: korrekt }] },
              { name: 'Decoy', chunks: [{ text: decoy }] },
            ],
          }),
        } as Response;
      }
      return origFetch(url as string, init);
    }) as unknown as typeof fetch;

    try {
      // Realer Import: `importiereBasis` ruft `embedTexts` -> echte Bridge (localhost:8600).
      const res = await importiereBasis('semantikbeweis');
      expect(res).toEqual({ quellen: 2, chunks: 2, vektorisiert: 2 });

      // Echte Suche über echte Vektoren: findet den Ziel-Chunk trotz BM25=0/0.
      const hits = await searchKnowledge(query, 5);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0]!.text).toBe(korrekt);
      expect(hits.some((h) => h.text === decoy)).toBe(false);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

afterEach(async () => {
  await frischeDb();
});
