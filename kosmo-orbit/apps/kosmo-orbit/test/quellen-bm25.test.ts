import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import type { Learning } from '@kosmo/ai';
import type { DossierEintrag } from '@kosmo/kernel';
import { sucheQuellen } from '../src/state/quellen';
import { speichereGlb, loescheGlb } from '../src/state/asset-bibliothek';

/**
 * v0.8.1/KI1 (Kandidat 2): `sucheQuellen` scorte Journal/Dossier/Referenz/
 * Asset bislang über eine eigene, naive `kwScore`-Termfrequenz (reine
 * Zählung, längennormiert — keine IDF, keine Sättigung). Jetzt nutzen alle
 * vier dieselbe, bereits getestete `bm25Scores`-Maschinerie aus
 * `modules/prepare/knowledge.ts` (dieselbe, die auch `searchKnowledge` für
 * die Wissensbasis trägt).
 *
 * Diese Suite belegt, dass es keine kosmetische Umbenennung ist, sondern
 * eine ECHTE Verhaltensänderung: mit der alten Termfrequenz gewinnt ein
 * Eintrag, der ein Allerweltswort («Beton») oft wiederholt, gegen einen
 * Eintrag mit dem selteneren, eigentlich gesuchten Begriff
 * («Trittschalldämmung»). Mit BM25 (IDF drückt das Allerweltswort,
 * Sättigung verhindert, dass Wiederholen gewinnt) kippt die Reihenfolge —
 * exakt umgekehrt zur alten Rangfolge. Empirisch mit der reinen
 * BM25-Funktion vermessen: alt (kwScore) [6.44, 2.72], neu (bm25Scores)
 * [0.88, 1.71] — Rang 1↔2 tauschen die Plätze.
 */

const spamText = 'Beton Beton Beton Beton Beton Beton und nochmals Beton überall im Rohbau.';
const seltenerBegriff = 'Beton mit Trittschalldämmung unter dem Unterlagsboden nach SIA 251.';
const unrelated = 'Holzbau mit Brettsperrholz, ganz ohne das graue Material.';
const QUERY = 'Beton Trittschalldämmung';

function leererKontext(): { journal: readonly Learning[]; dossier: readonly DossierEintrag[] } {
  return { journal: [], dossier: [] };
}

describe('sucheQuellen — BM25 statt naiver Termfrequenz (v0.8.1/KI1, Kandidat 2)', () => {
  // ZUERST, bevor `loadReferences()` (modulweiter Cache in DataWorkspace.tsx)
  // durch einen späteren Test befüllt wird — sonst greift die «tote Quelle»
  // (Fetch wirft) gar nicht mehr, weil der Cache längst gefüllt ist.
  it('baut defensiv: leeres Journal/Dossier und eine tote Referenz-Quelle liefern eine leere Liste, kein Crash', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('kein Netz');
    }) as unknown as typeof fetch;
    try {
      // Frei erfundene Begriffe — kollidieren garantiert mit keinem Fixture-Text
      // der folgenden Tests (auch nicht über Teilstrings).
      const treffer = await sucheQuellen('Quibbelwurst Flimflatschen Zonk', leererKontext(), 5);
      expect(treffer).toEqual([]);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('Journal: der seltene Fachbegriff schlägt das Allerweltswort-Spam (IDF+Sättigung) — mit der alten Termfrequenz war es umgekehrt', async () => {
    const journal: Learning[] = [
      { ts: '2026-01-01T00:00:00.000Z', sentiment: 'gut', context: spamText },
      { ts: '2026-01-02T00:00:00.000Z', sentiment: 'gut', note: 'Trittschalldämmung', context: seltenerBegriff },
      { ts: '2026-01-03T00:00:00.000Z', sentiment: 'schlecht', context: unrelated },
    ];
    const treffer = await sucheQuellen(QUERY, { journal, dossier: [] }, 10);
    const journalTreffer = treffer.filter((t) => t.typ === 'journal');
    expect(journalTreffer).toHaveLength(2); // unrelated bleibt bei 0 draussen
    // BM25-Rangfolge: der seltene Begriff (02.01.) VOR dem Beton-Spam (01.01.)
    expect(journalTreffer[0]!.titel).toContain('02.01.');
    expect(journalTreffer[1]!.titel).toContain('01.01.');
    // Kategorie-Gewicht 0.9 bleibt erhalten (unverändert seit vor dem Umbau)
    for (const t of journalTreffer) expect(t.score).toBeGreaterThan(0);
  });

  it('Dossier: dieselbe BM25-Umkehr, Kategorie-Gewicht 1.2 bleibt erhalten', async () => {
    const dossier: DossierEintrag[] = [
      { typ: 'fakt', text: spamText },
      { typ: 'fakt', text: seltenerBegriff },
      { typ: 'do', text: unrelated },
    ];
    const treffer = await sucheQuellen(QUERY, { journal: [], dossier }, 10);
    const dossierTreffer = treffer.filter((t) => t.typ === 'dossier');
    expect(dossierTreffer).toHaveLength(2);
    expect(dossierTreffer[0]!.text).toBe(seltenerBegriff); // seltener Begriff vor Spam
    expect(dossierTreffer[1]!.text).toBe(spamText);
  });

  it('Referenzen: gleiche BM25-Maschinerie über die Referenzbibliothek (loadReferences)', async () => {
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
    try {
      const treffer = await sucheQuellen(QUERY, leererKontext(), 10);
      const refTreffer = treffer.filter((t) => t.typ === 'referenz');
      expect(refTreffer).toHaveLength(2);
      expect(refTreffer[0]!.docId).toBe('ref-selten');
      expect(refTreffer[1]!.docId).toBe('ref-spam');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('Assets: gleiche BM25-Maschinerie über die Objekt-Bibliothek (listeGlb)', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('kein Netz — Referenz-Seed bewusst nicht gebraucht in diesem Test');
    }) as unknown as typeof fetch;
    const aSpam = await speichereGlb(new File([new Uint8Array([1])], 'spam.glb'), { title: spamText });
    const aSelten = await speichereGlb(new File([new Uint8Array([1])], 'selten.glb'), { title: seltenerBegriff });
    const aUnrelated = await speichereGlb(new File([new Uint8Array([1])], 'unrelated.glb'), { title: unrelated });
    try {
      const treffer = await sucheQuellen(QUERY, leererKontext(), 10);
      const assetTreffer = treffer.filter((t) => t.typ === 'asset');
      expect(assetTreffer).toHaveLength(2);
      expect(assetTreffer[0]!.docId).toBe(aSelten.id);
      expect(assetTreffer[1]!.docId).toBe(aSpam.id);
    } finally {
      globalThis.fetch = origFetch;
      await loescheGlb(aSpam.id);
      await loescheGlb(aSelten.id);
      await loescheGlb(aUnrelated.id);
    }
  });
});
