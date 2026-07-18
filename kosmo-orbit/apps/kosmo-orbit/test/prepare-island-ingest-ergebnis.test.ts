import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { indexedDB } from 'fake-indexeddb';
import { ingestDateienMitErgebnis } from '../src/modules/prepare/ingest-ergebnis';
import { listDocs } from '../src/modules/prepare/knowledge';

/**
 * PC4-Ausbau (`docs/V084-SPEZ.md` §5 W3, C-20, Owner-Auftrag Punkt 2) —
 * `ingestDateienMitErgebnis()` sammelt EIN Ergebnis je Datei (echte
 * Abschnittszahl bei Erfolg, echter Fehlertext bei Misserfolg) statt eines
 * einzigen, pro Fehlschlag überschriebenen Felds (Bestandsverhalten vor
 * PC4, `PrepareWorkspace.tsx`s `addFiles`, dort UNVERÄNDERT belassen).
 * Muster `knowledge-basis-embed.test.ts`: `fake-indexeddb/auto` +
 * `localStorage`-Stub, damit `embedTexts` im Node-Testlauf nicht mit einem
 * `ReferenceError` abbricht (kein echter Bridge-Aufruf nötig — Erfolg/
 * Fehler hängen NICHT vom Embedding ab).
 */

async function frischeDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('kosmo-wissen');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

const origFetch = globalThis.fetch;

beforeEach(async () => {
  const g = globalThis as Record<string, unknown>;
  g['localStorage'] ??= { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
  // Kein echter Bridge-Aufruf im Unit-Test — `embedTexts` fängt den
  // Netzwerkfehler ab und liefert `null` (dokumentiertes Verhalten,
  // `knowledge.ts`), `ingestFile` bleibt trotzdem erfolgreich (BM25-Pfad).
  globalThis.fetch = (async () => {
    throw new Error('kein Netz im Unit-Test');
  }) as typeof fetch;
  await frischeDb();
});

afterEach(() => {
  globalThis.fetch = origFetch;
});

function datei(name: string, text: string): File {
  return new File([text], name, { type: 'text/plain' });
}

describe('ingestDateienMitErgebnis — Ergebnis JE Datei (Ausbau)', () => {
  it('Erfolg trägt die echte Abschnittszahl aus KnowledgeDoc.chunkCount', async () => {
    const ergebnisse = await ingestDateienMitErgebnis([datei('gut.txt', 'Ein Absatz mit genug Text für einen echten Abschnitt.')]);
    expect(ergebnisse).toHaveLength(1);
    expect(ergebnisse[0]).toMatchObject({ name: 'gut.txt', status: 'ok' });
    expect(ergebnisse[0]!.chunkCount).toBeGreaterThan(0);
    expect(ergebnisse[0]!.fehler).toBeUndefined();

    const docs = await listDocs();
    expect(docs.some((d) => d.name === 'gut.txt')).toBe(true);
  });

  it('Fehlschlag EINER Datei trägt den echten Fehlertext, verschluckt ihn nicht (anders als das Bestands-addFiles-Feld)', async () => {
    const ergebnisse = await ingestDateienMitErgebnis([datei('leer.txt', '   ')]);
    expect(ergebnisse).toHaveLength(1);
    expect(ergebnisse[0]!.status).toBe('fehler');
    expect(ergebnisse[0]!.fehler).toContain('enthält keinen lesbaren Text');
    expect(ergebnisse[0]!.chunkCount).toBeUndefined();
  });

  it('mehrere Dateien: JEDE bekommt ihr EIGENES Ergebnis — ein Fehlschlag überschreibt keinen Erfolg', async () => {
    const ergebnisse = await ingestDateienMitErgebnis([
      datei('erste.txt', 'Erster echter Text-Abschnitt mit genug Inhalt.'),
      datei('leer.txt', ''),
      datei('dritte.txt', 'Dritter echter Text-Abschnitt mit genug Inhalt.'),
    ]);
    expect(ergebnisse.map((e) => e.status)).toEqual(['ok', 'fehler', 'ok']);
    expect(ergebnisse[0]!.name).toBe('erste.txt');
    expect(ergebnisse[2]!.name).toBe('dritte.txt');

    const docs = await listDocs();
    expect(docs.some((d) => d.name === 'erste.txt')).toBe(true);
    expect(docs.some((d) => d.name === 'dritte.txt')).toBe(true);
    expect(docs.some((d) => d.name === 'leer.txt')).toBe(false);
  });

  it('onDatei-Callback feuert nach JEDER abgeschlossenen Datei, mit fortlaufendem Index (Fortschritts-Beweis)', async () => {
    const gesehen: { index: number; gesamt: number; status: string }[] = [];
    await ingestDateienMitErgebnis(
      [datei('a.txt', 'Text A mit genug Inhalt für einen Abschnitt.'), datei('b.txt', 'Text B mit genug Inhalt für einen Abschnitt.')],
      { onDatei: (eintrag, index, gesamt) => gesehen.push({ index, gesamt, status: eintrag.status }) },
    );
    expect(gesehen).toEqual([
      { index: 0, gesamt: 2, status: 'ok' },
      { index: 1, gesamt: 2, status: 'ok' },
    ]);
  });

  it('source wird an ingestFile durchgereicht (Default "lokal", überschreibbar für z.B. "onedrive")', async () => {
    await ingestDateienMitErgebnis([datei('drive.txt', 'Ein OneDrive-Dokument mit genug Text.')], { source: 'onedrive' });
    const docs = await listDocs();
    const doc = docs.find((d) => d.name === 'drive.txt');
    expect(doc?.source).toBe('onedrive');
  });
});
