import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { schaetzeTokens } from '@kosmo/ai';
import type { DossierEintrag } from '@kosmo/kernel';
import { baueDatenKontextBlock, resetDatenKontextCacheFuerTests } from '../src/state/quellen';
import { resetReferenzIndexFuerTests } from '../src/state/referenz-index';

/**
 * v0.8.3/P2 (`docs/V083-SPEZ.md` §6.4/E6d) — `baueDatenKontextBlock`, der
 * App-seitige Konsument der additiven `extraBloecke?`-Schnittstelle in
 * `chat.ts`: ein ≤300-Token-Block aus KosmoData (Referenzindex +
 * Wissensbasis), gespeist über Projektname/Dossier, gecacht je Doc-Stand.
 * Die Verdrahtung an eine echte `ChatSession` bleibt P7/W2 (§12.1 C-4) —
 * diese Suite prüft NUR die reine Block-Bau-Funktion.
 */

function mockeSeedFetch(entries: Array<Record<string, unknown>>): () => void {
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => {
    if (String(url).includes('kosmodata-seed.json')) {
      return { ok: true, json: async () => ({ entries }) };
    }
    throw new Error(`unerwarteter Fetch im Test: ${String(url)}`);
  }) as unknown as typeof fetch;
  return () => {
    globalThis.fetch = origFetch;
  };
}

const leeresDossier: readonly DossierEintrag[] = [];

describe('baueDatenKontextBlock — App-seitiger Daten-Kontext-Block (§6.4/E6d)', () => {
  beforeEach(() => {
    resetDatenKontextCacheFuerTests();
    resetReferenzIndexFuerTests();
  });

  it('leeres Projekt (kein Name, kein Dossier) → leerer Block, kein Deko-Text ohne Substanz', async () => {
    const block = await baueDatenKontextBlock('', leeresDossier);
    expect(block.label).toBe('datenKontext');
    expect(block.text).toBe('');
  });

  it('mit Projektname + passender Referenz: der Block nennt die Referenz und bleibt ≤300 Token', async () => {
    const restore = mockeSeedFetch([
      { id: 'ref-1', title: 'Beispielbau Beton', one_sentence: 'Ein Sichtbetonbau mit Rasterfassade.' },
      { id: 'ref-2', title: 'Unrelated', one_sentence: 'Holzbau ohne Bezug.' },
    ]);
    try {
      const block = await baueDatenKontextBlock('Beispielbau Beton Projekt', leeresDossier);
      expect(block.text).toContain('Beispielbau Beton');
      expect(schaetzeTokens(block.text)).toBeLessThanOrEqual(300);
    } finally {
      restore();
    }
  });

  it('Budget-Beweis: auch mit vielen/grossen Treffern bleibt der Block ≤300 Token (ersatzloses Abschneiden statt Sprengen)', async () => {
    const langerSatz = 'Ausführlicher Beschreibungstext '.repeat(40); // deutlich > 300 Token allein
    const restore = mockeSeedFetch(
      Array.from({ length: 8 }, (_, i) => ({
        id: `ref-${i}`,
        title: `Grossprojekt Sichtbeton ${i}`,
        one_sentence: langerSatz,
      })),
    );
    try {
      const block = await baueDatenKontextBlock('Grossprojekt Sichtbeton', leeresDossier);
      expect(schaetzeTokens(block.text)).toBeLessThanOrEqual(300);
    } finally {
      restore();
    }
  });

  it('gecacht je Doc-Stand: zweiter Aufruf mit identischem Projektname/Dossier liefert denselben Block ohne erneuten Referenz-Durchlauf', async () => {
    const restore = mockeSeedFetch([{ id: 'ref-1', title: 'Beispielbau', one_sentence: 'Ein Beispiel.' }]);
    try {
      const erster = await baueDatenKontextBlock('Beispielbau Projekt', leeresDossier);
      const zweiter = await baueDatenKontextBlock('Beispielbau Projekt', leeresDossier);
      expect(zweiter).toBe(erster); // dieselbe Objekt-Referenz — Cache-Treffer, kein Neubau
    } finally {
      restore();
    }
  });

  it('ändert sich das Dossier, baut der Block sich neu (anderer Schlüssel, kein veralteter Cache-Treffer)', async () => {
    const restore = mockeSeedFetch([{ id: 'ref-1', title: 'Betonbau', one_sentence: 'Ein Betonbau.' }]);
    try {
      const erster = await baueDatenKontextBlock('Projekt X', leeresDossier);
      const zweiter = await baueDatenKontextBlock('Projekt X', [{ typ: 'fakt', text: 'Betonbau gefordert' }]);
      expect(zweiter).not.toBe(erster);
    } finally {
      restore();
    }
  });

  it('KosmoData nicht erreichbar (toter Fetch) → leerer Block statt Absturz', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('kein Netz');
    }) as unknown as typeof fetch;
    try {
      const block = await baueDatenKontextBlock('Projekt ohne Netz', leeresDossier);
      expect(block.label).toBe('datenKontext');
      expect(typeof block.text).toBe('string');
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
