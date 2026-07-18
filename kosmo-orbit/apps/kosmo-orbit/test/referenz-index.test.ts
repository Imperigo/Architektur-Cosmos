import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  sucheReferenzen,
  referenzIndexBauZaehlerFuerTests,
  resetReferenzIndexFuerTests,
} from '../src/state/referenz-index';
import { sucheQuellen } from '../src/state/quellen';

/**
 * v0.8.3/P2 (`docs/V083-SPEZ.md` §6.1/E6a) — der geteilte BM25-Referenz-
 * Index. Drei Beweise:
 *
 *  1. BM25 statt naivem `.includes()` (Rangfolge: seltener Fachbegriff
 *     schlägt Allerweltswort-Spam — dieselbe Umkehr wie
 *     `quellen-bm25.test.ts` für Journal/Dossier/Assets).
 *  2. Caching: der Heuhaufen wird EINMAL pro `loadReferences()`-Ergebnis
 *     gebaut, nicht bei jeder Suche neu (`referenzIndexBauZaehlerFuerTests`).
 *  3. BM25-Paritätstest (Gate, §12.1 C-1): `sucheQuellen()`s Referenz-Zweig
 *     nutzt DENSELBEN Index — für dieselbe Anfrage liefert es exakt dieselbe
 *     Rangfolge (Reihenfolge der `docId`s) wie ein direkter
 *     `sucheReferenzen()`-Aufruf.
 */

const spamText = 'Beton Beton Beton Beton Beton Beton und nochmals Beton überall im Rohbau.';
const seltenerBegriff = 'Beton mit Trittschalldämmung unter dem Unterlagsboden nach SIA 251.';
const unrelated = 'Holzbau mit Brettsperrholz, ganz ohne das graue Material.';
const QUERY = 'Beton Trittschalldämmung';

function mockeSeedFetch(): () => void {
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => {
    if (String(url).includes('kosmodata-seed.json')) {
      return {
        ok: true,
        json: async () => ({
          entries: [
            { id: 'ref-spam', title: 'Spam-Referenz', one_sentence: spamText },
            { id: 'ref-selten', title: 'Seltener-Begriff-Referenz', one_sentence: seltenerBegriff },
            { id: 'ref-unrelated', title: 'Unrelated', one_sentence: unrelated },
          ],
        }),
      };
    }
    throw new Error(`unerwarteter Fetch im Test: ${String(url)}`);
  }) as unknown as typeof fetch;
  return () => {
    globalThis.fetch = origFetch;
  };
}

describe('sucheReferenzen — geteilter BM25-Index (v0.8.3/P2, §6.1/E6a)', () => {
  beforeEach(() => {
    resetReferenzIndexFuerTests();
  });

  it('BM25-Rangfolge: der seltene Fachbegriff schlägt das Allerweltswort-Spam', async () => {
    const restore = mockeSeedFetch();
    try {
      const treffer = await sucheReferenzen(QUERY);
      expect(treffer).toHaveLength(2); // unrelated bleibt bei score 0 draussen
      expect(treffer[0]!.entry.id).toBe('ref-selten');
      expect(treffer[1]!.entry.id).toBe('ref-spam');
      for (const t of treffer) expect(t.score).toBeGreaterThan(0);
    } finally {
      restore();
    }
  });

  it('limit kappt die Trefferliste, ohne die Rangfolge zu ändern', async () => {
    const restore = mockeSeedFetch();
    try {
      const alle = await sucheReferenzen(QUERY);
      const gekappt = await sucheReferenzen(QUERY, 1);
      expect(gekappt).toHaveLength(1);
      expect(gekappt[0]!.entry.id).toBe(alle[0]!.entry.id);
    } finally {
      restore();
    }
  });

  it('ohne Treffer (score 0 überall) liefert eine leere Liste', async () => {
    const restore = mockeSeedFetch();
    try {
      const treffer = await sucheReferenzen('Quibbelwurst Flimflatschen Zonk');
      expect(treffer).toEqual([]);
    } finally {
      restore();
    }
  });

  it('Caching: der Heuhaufen wird EINMAL pro loadReferences()-Ergebnis gebaut, nicht bei jeder Suche neu', async () => {
    const restore = mockeSeedFetch();
    try {
      expect(referenzIndexBauZaehlerFuerTests()).toBe(0);
      await sucheReferenzen('Beton');
      expect(referenzIndexBauZaehlerFuerTests()).toBe(1);
      await sucheReferenzen('Holz');
      await sucheReferenzen(QUERY, 5);
      // Drei Suchen, aber der Index (Heuhaufen-Aufbau) lief nur EINMAL.
      expect(referenzIndexBauZaehlerFuerTests()).toBe(1);
    } finally {
      restore();
    }
  });

  it('BM25-Paritätstest (Gate §12.1 C-1): sucheQuellen()s Referenz-Zweig liefert dieselbe Rangfolge wie ein direkter sucheReferenzen()-Aufruf', async () => {
    const restore = mockeSeedFetch();
    try {
      const direkt = await sucheReferenzen(QUERY);
      const ueberQuellen = await sucheQuellen(QUERY, { journal: [], dossier: [] }, 10);
      const refTreffer = ueberQuellen.filter((t) => t.typ === 'referenz');
      expect(refTreffer.map((t) => t.docId)).toEqual(direkt.map((t) => t.entry.id));
    } finally {
      restore();
    }
  });
});
